# Docket — Core Features & Software Architecture

This document outlines the core functional features of the **Docket** grocery optimization platform and the technical architecture supporting it.

---

## 1. Core Application Features

### 1. Receipt Upload & Independent Data Extraction
*   **OCR Integration**: When a user uploads a receipt photo, the system runs it through a pytesseract-backed OCR pipeline (with image preprocessing: grayscale conversion, auto-contrast, sharpening, and upscaling) to extract item names, quantities, and prices from the actual receipt image.
*   **Store & Location Detection**: The OCR engine detects both the store chain (Coles, Woolworths, Aldi, IGA, Costco) and the specific branch location (e.g., "Woolworths South Yarra", "Coles Collingwood") from the receipt header text using regex-based parsing.
*   **Per-Receipt Independence**: Each receipt is treated as an independent data entry with its own total. Scanning 5 receipts produces 5 separate records — items are never merged across receipts, preventing inflated totals. Receipt totals are preserved as scanned (e.g., $18.10, $11.20, $16.40) rather than summed.
*   **History-Only Ingestion**: Scanned receipt items are saved to purchase history only (for the recommendation engine's product rankings). They are not automatically added to the active shopping list, keeping the user's basket clean and under their control.
*   **Messy Data Normalization**: Messy receipt text (e.g., `"WW CHKN BRST 500G"`) is normalized into clean canonical names (e.g., `"Chicken Breast 500g"`) via RapidFuzz fuzzy string matching against the product catalog.
*   **Behavioral Profile Engine**: By analyzing historical receipts, Docket builds a personalized shopping profile of what you buy, brand preferences, price thresholds, and purchase frequency.
*   **Graceful Fallback**: If pytesseract or the tesseract binary is unavailable, the OCR engine falls back to filename-based store detection with varied mock receipt data that simulates independent receipt scanning.

### 2. Price Intelligence Layer
*   **Personalized Basket Ingestion**: Ingests catalog data from Coles, Woolworths, Aldi, IGA, and Costco and compares them against your specific profile, calculating the real cost of your actual basket.
*   **Coles vs Woolworths Comparison Engine**: The comparison engine uses a 4-tier matching strategy (exact name → substring → category → word-overlap scoring) to find the best catalog match for each shopping list item at both stores, then computes adjusted totals including shelf price, travel/fuel costs, loyalty rewards, and out-of-stock risk.
*   **Itemized Comparison Tables**: Every comparison includes a detailed per-item breakdown showing prices at each store, with the cheapest price highlighted and active specials tagged.
*   **Predictive Specials**: Forecasts when regularly purchased products are likely to be discounted, prompting smart stock-up actions.
*   **Price Sensitivity Weighting**: Identifies which items are highly brand-loyal versus price-sensitive, weighting comparison options accordingly.

### 3. Google Maps Integration
*   **Region-Aware Store Locating**: Shows store outlets relevant to the user's configured city/region. A user in Brisbane only sees Brisbane stores; a user in Melbourne sees Melbourne stores.
*   **Travel Cost Factoring**: Adds transit overhead calculations into the comparison engine (e.g., *"Woolworths saves $12 but is 8km further away. Coles costs $6 more but is 2 minutes away"*).
*   **View Route in Google Maps**: Instantly generates Google Maps direction links mapping from the user's customized home address to the exact matched store location with full address.

### 4. The Data Flywheel
*   **Compounding Accuracy**: Every uploaded receipt feeds the personalization profile, improving product rankings and recommendation accuracy over time.
*   **Anonymized Aggregation**: Aggregated data maps regional pricing patterns, store-specific inventory shortages, and catalog match rates to improve predictions for all users.
*   **Retention Loop**: High-accuracy personalization drives long-term customer utility and engagement.

### 5. Technical Stack
*   **OCR**: pytesseract (Tesseract OCR) with PIL image preprocessing for receipt text extraction. Falls back to intelligent filename-based detection when unavailable.
*   **ML Matching**: Lightweight normalizers and RapidFuzz fuzzy string matching combined with SQLite queries for catalog resolution.
*   **Backend**: C# .NET 8 Web API with Entity Framework Core (SQLite) for business logic and persistence.
*   **Frontend**: React 19 + Vite SPA with zero-dependency SVG charting and Lucide icons.
*   **AI Microservice**: Python FastAPI service handling OCR extraction and fuzzy catalog matching.
*   **Maps API**: Google Maps Platform for geolocating, distance calculations, and routing.

### 6. Location-Aware Store Recommendation Engine (8-Phase Algorithm)

The most powerful feature of Docket is the personalized, location-aware multi-store recommendation engine:

**Phase 0 — Region Store Filter**  
Uses the user's configured city/region (e.g., Melbourne, Brisbane, Sydney, Perth, Adelaide, Gold Coast, Hobart, Darwin, Canberra) to determine which store chains operate locally. A static region-to-stores mapping ensures that only stores with branches in the user's region are considered in all subsequent phases. For example, Brisbane users will see Coles, Woolworths, Aldi, and IGA — but not Costco (which has no Brisbane branch). Hobart users will only see Coles, Woolworths, and IGA.

**Phase 1 — Receipt Product Ranking**  
Reads all uploaded receipts (completed `ShoppingListItem` records) and counts how frequently each product appears. Products that appear most often receive the lowest rank number (Rank 1 = most purchased). Equal frequency shares the same rank. Rank weight = `1.0 / rank`.

**Phase 2 — Cheapest Store Per Product (Region-Filtered)**  
For each ranked product, searches the catalog entries only across region-available stores and finds which one has the lowest current ShelfPrice (accounting for active specials). The catalog is pre-filtered by Phase 0 so stores outside the user's region are never considered.

**Phase 3 — Weighted Store Scoring**  
Stores accumulate the rank weights of every product they win cheapest. Winning Rank 1 (your most-bought item) contributes far more to the score than winning Rank 8. Additionally, a customized bonus weight is added to the score depending on the specific type of special price detected:
*   **Holiday Season Specials** (e.g., Christmas, Easter, seasonal specials): `+0.45` bonus weight.
*   **Direct Discounts** (e.g., "Save $X", "% Off"): `+0.35` bonus weight.
*   **Promotions** (e.g., "2 for $5", multibuy, value pack deals): `+0.30` bonus weight.
*   **General Specials**: `+0.25` bonus weight.
This rewards stores running active discount campaigns for items you buy frequently.

**Phase 4 — Weighted Savings Calculation**  
Converts weighted scores to estimated base weekly savings and adds the actual calculated discount amount (`NormalPrice - ShelfPrice`) for active store specials (with a `1.2x` volume adjustment factor applied to Holiday Specials), making the savings estimate dynamic and accurate. Returns the stores sorted descending. Pads with zero-score stores from the user's region if fewer than 5 have wins.

**Phase 5 — Distance Layer (Region-Aware)**  
Uses `UserPreferences` for Coles and Woolworths distances. For other stores, uses region-specific default distances (e.g., Aldi is 4.6 km in Melbourne but 4.8 km in Brisbane). Only stores available in the user's region appear. Returns stores sorted ascending by proximity.

**Phase 6 — Combined Trade-Off Recommendation**  
Reconciles the ranked lists into a single narrative: *"Aldi saves you the most ($20.00) but is 4.6 km away. Woolworths saves $5.00 less but is only 0.8 km from you."*

**Phase 7 — Itemized Price Comparison**  
Builds a cross-store price comparison table for the user's top 10 ranked products. For each product, finds the price at each of the recommended stores and identifies the cheapest. This powers the "Itemized Comparison — Recommended Shops" table in the frontend, showing package sizes, specials, and the cheapest store per item.

**Phase 8 — Three-Category Target Recommendations**  
Restricts store selection dynamically to Coles and Woolworths and segments recommendations into three target categories:
*   **Cheapest Shop (Recurring)**: The store that saves the most money on the user's high-frequency items (using the personalized ranking weight score).
*   **Cheapest Overall (Average)**: The store with the lowest total shelf price across all historical products in the user's profile, ignoring the rank weightings.
*   **Nearest Shop**: The store closest to the user's address/location, using personalized score ranking as a secondary tie-breaker.


### 7. Multi-Document Batch Upload & Scan Queue
*   **Sequential Scan Processing**: Users can upload multiple receipt files simultaneously. The frontend maintains a scan queue allowing users to preview, add, or remove queued files before execution.
*   **Independent Receipt Processing**: Each receipt is processed independently through the OCR → fuzzy matching pipeline. Each receipt retains its own store name, branch location, item list, and receipt total.
*   **Scanned Receipts Display**: After scanning, each receipt is displayed as a separate card showing the store display name (e.g., "Woolworths South Yarra"), the itemized list with individual prices, and the receipt total.
*   **Offline Simulation Fallback**: If the backend is offline, the client falls back to varied mock receipt data (matching the actual receipt images) to simulate independent scanning.

### 8. Dedicated Demo Access & Clean Login State
*   **Demo Account**: A pre-seeded demo account (`username: demo`) allows instant testing of the application's matching algorithms.
*   **Login Clean State**: Upon a successful login, the application automatically clears all uncompleted items from the active shopping list, giving the user a fresh, clean slate while preserving their historical completed receipt items for recommendation ranking.

### 9. User Settings & Personalization
*   **City/Region Selector**: Dropdown to choose from Melbourne, Sydney, Brisbane, Perth, Adelaide, Gold Coast, Canberra, Hobart, and Darwin. Controls which stores appear in recommendations and uses region-specific store addresses.
*   **Home Address**: Text input for the user's suburb or address, used for Google Maps direction links.
*   **Distance Sliders**: Per-store distance configuration (0.1–15 km) for Coles and Woolworths.
*   **Fuel/Transit Cost**: Configurable cost per kilometre ($0.05–$0.50/km) for travel overhead calculation.
*   **Loyalty Memberships**: Toggles for Coles Flybuys and Woolworths Everyday Rewards cards, which factor points rebates and bonus points into comparison totals.

---

## 2. Software Architecture: OOP & Encapsulation Rationale

To support these advanced intelligence layers, the C# backend uses a robust, domain-driven Object-Oriented design:

### 1. Guarding Business Invariants (State Validation)
Docket wraps all properties in `private set` accessors and handles state changes strictly through parameterized constructors and domain methods:
- `CatalogItem` validates store sources (Coles, Woolworths, Aldi, IGA, Costco) and positive pricing.
- `ShoppingListItem` enforces strict quantity increments and state transitions.
- `UserPreferences` guarantees travel parameters are realistic and validates the region string.
- `StoreRecommendationResult`, `StoreSavingsResult`, `ProximityResult`, `ItemPriceComparison`, and `ItemPriceDetail` enforce non-negative scores, distances, and prices.

### 2. Encapsulation of State Transitions
- **History Tracking**: `ShoppingListItem.ToggleCompletion()` cleanly transitions items from the active shopping list into completed purchase history, feeding `BuildProductRankings` without exposing the internal flag.
- **Quantity Merging**: Quantity modifications use `item.UpdateQuantity(...)` instead of arbitrary database updates, ensuring the domain constraint that quantity must remain positive.
- **Region-Aware Preferences**: `UserPreferences.UpdatePreferences(...)` accepts a `region` parameter alongside distances and loyalty flags, encapsulating all preference mutations through a single validated entry point.

### 3. Decoupling and Interface Segregation
Decoupling the controllers from concrete service implementations through interfaces like `IComparisonEngine`, `IStoreRecommendationEngine`, and `IPythonAIServiceClient` allows for easy testing, mocking, and updating of modules without breaking API contracts.

### 4. Three-Tier Architecture
- **AI Microservice** (Python/FastAPI): Handles OCR image processing and fuzzy string matching. Communicates via HTTP REST.
- **Backend API** (C#/.NET 8): Business logic, comparison engine, recommendation engine, and SQLite persistence. Exposes REST endpoints for the frontend.
- **Frontend SPA** (React/Vite): Rich interactive UI with offline fallback capabilities, including a full JavaScript reimplementation of the comparison engine for zero-downtime operation.

---

## 3. File Structure

```
SmartShoppingDestination/
├── ai-service/                          # Python FastAPI microservice (OCR + Fuzzy Matching)
│   ├── requirements.txt                 # fastapi, uvicorn, rapidfuzz, pillow, pytesseract
│   ├── run.sh
│   └── app/
│       ├── main.py                      # FastAPI: /api/ocr & /api/match endpoints
│       ├── ocr_engine.py                # pytesseract OCR, store+location detection, receipt parsing
│       └── matcher.py                   # RapidFuzz fuzzy catalog matching
│
├── backend/                             # C# .NET 8 Web API
│   ├── Program.cs                       # Entry point, DI, CORS, DB init
│   ├── Data/
│   │   ├── DocketDbContext.cs           # EF Core DbContext (5 DbSets)
│   │   └── DbInitializer.cs            # Seeds catalog (5 retailers), demo user, saving logs
│   ├── Models/
│   │   ├── CatalogItem.cs              # Product catalog entry
│   │   ├── ShoppingListItem.cs         # User shopping list / purchase history
│   │   ├── UserPreferences.cs          # Distance, fuel, loyalty, region
│   │   ├── User.cs                     # User account
│   │   ├── SavingLog.cs                # Checkout savings record
│   │   └── StoreRecommendation.cs      # DTOs: RankedProduct, StoreSavingsResult, ProximityResult,
│   │                                   #   ItemPriceComparison, ItemPriceDetail, StoreRecommendationResult
│   ├── Controllers/
│   │   ├── AuthController.cs           # Register / Login
│   │   ├── ListsController.cs          # Shopping list CRUD, receipt upload (history-only), compare, checkout
│   │   ├── CatalogController.cs        # Autocomplete search
│   │   ├── DashboardController.cs      # Savings stats, notifications
│   │   ├── PreferencesController.cs    # GET/PUT preferences (including region)
│   │   └── RecommendationsController.cs # GET 8-phase recommendation engine
│   └── Services/
│       ├── ComparisonEngine.cs         # Coles vs Woolworths basket comparison
│       ├── StoreRecommendationEngine.cs # 8-phase location-aware store ranking
│       └── PythonAIServiceClient.cs    # HTTP client to Python AI service
│
└── frontend/                            # React + Vite SPA
    └── src/
        ├── App.jsx                     # Router: landing / login / signup / dashboard
        ├── components/Logo.jsx         # SVG receipt logo
        └── pages/
            ├── LandingPage.jsx         # Marketing page + interactive demo widget
            ├── AuthPage.jsx            # Login / Register + demo quick-login
            └── DashboardPage.jsx       # Main app: list builder, comparison, recommendations,
                                        #   analytics, settings (with city/region selector)
```
