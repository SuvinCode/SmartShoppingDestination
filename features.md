# Docket — Core Features, Data Policies & Software Architecture

This document outlines the core functional features of the **Docket** grocery optimization platform, its data policies, terms of use, tech stack, and software architecture.

---

## 1. Core Application Features

### 1. Receipt Upload & Independent Data Extraction
*   **OCR Integration**: When a user uploads a receipt photo, the system runs it through a pytesseract-backed OCR pipeline (with image preprocessing: grayscale conversion, auto-contrast, sharpening, and upscaling) to extract item names, quantities, and prices from the actual receipt image.
*   **Store & Location Detection**: The OCR engine detects both the store chain (Coles, Woolworths) and the specific branch location (e.g., "Woolworths South Yarra", "Coles Collingwood") from the receipt header text using regex-based parsing.
*   **Per-Receipt Independence**: Each receipt is treated as an independent data entry with its own total. Scanning multiple receipts produces separate records — items are never merged across receipts, preventing inflated totals. Receipt totals are preserved as scanned rather than summed.
*   **History-Only Ingestion**: Scanned receipt items are saved to purchase history only (for the recommendation engine's product rankings). They are not automatically added to the active shopping list, keeping the user's basket clean and under their control.
*   **Messy Data Normalization**: Messy receipt text (e.g., `"WW CHKN BRST 500G"`) is normalized into clean canonical names (e.g., `"Chicken Breast 500g"`) via RapidFuzz fuzzy string matching against the product catalog.
*   **Behavioral Profile Engine**: By analyzing historical receipts, Docket builds a personalized shopping profile of what you buy, brand preferences, price thresholds, and purchase frequency.
*   **Graceful Fallback**: If pytesseract or the tesseract binary is unavailable, the OCR engine falls back to filename-based store detection with simulated independent receipt scanning.

### 2. Price Intelligence Layer
*   **Personalized Basket Ingestion**: Ingests catalog data from Coles and Woolworths and compares them against your specific profile, calculating the real cost of your actual basket.
*   **Supermarket Comparison Engine**: The comparison engine uses a 4-tier matching strategy (exact name → substring → category → word-overlap scoring) to find the best catalog match for each shopping list item at both stores, then computes adjusted totals including shelf price, travel/fuel costs, loyalty rewards, and out-of-stock risk.
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

### 5. Location-Aware Store Recommendation Engine (8-Phase Algorithm)
The engine analyzes user habits and geographical coordinates through eight distinct phases:
*   **Phase 0 — Region Store Filter**: Uses the user's configured city/region (e.g., Melbourne, Brisbane, Sydney, Perth, Adelaide, Gold Coast, Hobart, Darwin, Canberra) to determine which store chains operate locally. Only stores within the user's region are considered in recommendations.
*   **Phase 1 — Receipt Product Ranking**: Group historical shopping list items by normalized name and count occurrences to find frequency. Rank products by frequency descending. Equal frequencies share a rank. Rank weight = `1.0 / rank`.
*   **Phase 2 — Cheapest Store Per Product (Region-Filtered)**: For each ranked product, finds the cheapest matches across the region's stores using exact, substring, category, and keyword overlap matching.
*   **Phase 3 — Weighted Store Scoring**: Stores accumulate the rank weights of products they win cheapest. Special promotion types (holiday, discount, promotions) add customized bonus weights (`+0.25` to `+0.45`).
*   **Phase 4 — Weighted Savings Calculation**: Converts weighted scores to estimated base weekly savings and adds the actual calculated discount amount for active store specials.
*   **Phase 5 — Distance Layer (Region-Aware)**: Uses `UserPreferences` distances or region-specific defaults. Returns stores sorted ascending by proximity.
*   **Phase 6 — Combined Trade-Off Recommendation**: Reconciles lists into a single narrative: *"Coles saves you the most ($12.50) but is 5.2 km away. Woolworths saves $4.00 less but is only 1.2 km from you."*
*   **Phase 7 — Itemized Price Comparison**: Builds a cross-store price comparison table for the user's top 10 products, showing package sizes, specials, and prices.
*   **Phase 8 — Three-Category Target Recommendations**: Restricts store selection dynamically to Coles and Woolworths and segments recommendations into:
    *   *Cheapest Shop (Recurring)*: The store that saves the most money on high-frequency items.
    *   *Cheapest Overall (Average)*: The store with the lowest total shelf price across all historical products.
    *   *Nearest Shop*: The store closest to the user's address.

### 6. Multi-Document Batch Upload & Scan Queue
*   **Sequential Scan Processing**: Users can upload multiple receipt files simultaneously. The frontend maintains a scan queue allowing users to preview, add, or remove queued files before execution.
*   **Independent Receipt Processing**: Each receipt is processed independently through the OCR → fuzzy matching pipeline, retaining its own store name, branch location, item list, and total.
*   **Scanned Receipts Display**: Displays scanned cards showing the store name, itemized list, and receipt total.

### 7. Dedicated Demo Access & Clean Login State
*   **Demo Account**: A pre-seeded demo account (`username: demo`) allows instant testing of the application's matching algorithms.
*   **Login Clean State**: Upon a successful login, the application automatically clears all uncompleted items from the active shopping list, giving the user a fresh, clean slate while preserving historical completed items for recommendation ranking.

### 8. User Settings & Personalization
*   **City/Region Selector**: Dropdown to choose from Melbourne, Sydney, Brisbane, Perth, Adelaide, Gold Coast, Canberra, Hobart, and Darwin. Controls which stores appear.
*   **Home Address**: Used for Google Maps direction links.
*   **Distance Sliders**: Per-store distance configuration (0.1–15 km) for Coles and Woolworths.
*   **Fuel/Transit Cost**: Configurable cost per kilometre ($0.05–$0.50/km) for travel overhead.
*   **Loyalty Memberships**: Toggles for Coles Flybuys and Woolworths Everyday Rewards cards, which factor points rebates and bonus points into comparison totals.

---

## 2. Technical Stack Used

Docket is built on a modern, distributed full-stack architecture:

*   **React Frontend (SPA)**: React 19 + Vite development server, using standard modern layout structures, custom glassmorphic styling via vanilla CSS, and Lucide icons.
*   **ASP.NET Core Backend (Web API)**: C# .NET 8.0 REST API managing business logic, comparison engines, and DB routing.
*   **Database (Persistence)**: SQLite database accessed via Entity Framework Core (EF Core) utilizing seed initializers for retail catalog files.
*   **Python AI Microservice**: FastAPI server handling receipt text processing via pytesseract OCR and fuzzy product catalog mapping via RapidFuzz.
*   **Maps API**: Google Maps Platform for geocoding, proximity, and directions routing.

---

## 3. Data Collection & Dataset Policies

*   **Historical Catalog Data**: Docket does not execute live web-scraping to compile store prices. Instead, it utilizes static historical price catalog databases seeded from a public dataset.
*   **Dataset Reference**: The catalog pricing dataset is sourced from the open-source [aus_grocery_price_database](https://github.com/ivan-lim/aus_grocery_price_database) repository, which archives catalog entries and price changes for major Australian retailers.
*   **Ingestion Pipeline**: During database initialization, the backend processes `catalog_seed.json` derived from this dataset, populating the local SQLite catalog for Coles and Woolworths with actual historical pricing, discounts, and item sizes.

---

## 4. Terms & Conditions & Disclaimers

By using the Docket platform, you acknowledge and agree to the following terms:

*   **MVP Demonstration Only**: Docket is a Minimum Viable Product (MVP) prototype designed strictly to showcase features, UI/UX, and recommendation logic.
*   **No Live Data Disclaimer**: Pricing, availability, and catalogs are **not live** and do not reflect real-time prices at Coles, Woolworths, or any other store. Savings calculations are simulations only and should not be used as official grocery shopping guides.
*   **Limitation of Liability**: The authors and developers of Docket are not responsible for any differences in cost, travel expenses, or store actions occurring in physical supermarket branches.
*   **Intellectual Property**: Supermarket names (including Coles and Woolworths), branding, logos, and product titles remain the sole intellectual property of their respective trademark owners.

---

## 5. Software Architecture: OOP & Encapsulation Rationale

To support these advanced intelligence layers, the C# backend uses a robust, domain-driven Object-Oriented design:

### 1. Guarding Business Invariants (State Validation)
Docket wraps all properties in `private set` accessors and handles state changes strictly through parameterized constructors and domain methods:
- `CatalogItem` validates store sources and positive pricing.
- `ShoppingListItem` enforces strict quantity increments and state transitions.
- `UserPreferences` guarantees travel parameters are realistic and validates the region string.
- `StoreRecommendationResult`, `StoreSavingsResult`, `ProximityResult`, `ItemPriceComparison`, and `ItemPriceDetail` enforce non-negative scores, distances, and prices.

### 2. Encapsulation of State Transitions
- **History Tracking**: `ShoppingListItem.ToggleCompletion()` cleanly transitions items from the active shopping list into completed purchase history, feeding product rankings without exposing the internal flag.
- **Quantity Merging**: Quantity modifications use `item.UpdateQuantity(...)` instead of arbitrary database updates, ensuring the domain constraint that quantity must remain positive.
- **Region-Aware Preferences**: `UserPreferences.UpdatePreferences(...)` accepts a `region` parameter alongside distances and loyalty flags, encapsulating all preference mutations through a single validated entry point.

### 3. Decoupling and Interface Segregation
Decoupling the controllers from concrete service implementations through interfaces like `IComparisonEngine`, `IStoreRecommendationEngine`, and `IPythonAIServiceClient` allows for easy testing, mocking, and updating of modules without breaking API contracts.

### 4. Three-Tier Architecture
- **AI Microservice** (Python/FastAPI): Handles OCR image processing and fuzzy string matching. Communicates via HTTP REST.
- **Backend API** (C#/.NET 8): Business logic, comparison engine, recommendation engine, and SQLite persistence. Exposes REST endpoints for the frontend.
- **Frontend SPA** (React/Vite): Rich interactive UI with offline fallback capabilities.

---

## 6. File Structure

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
│   │   └── DbInitializer.cs            # Seeds catalog, demo user, saving logs
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
        ├── components/
        │   ├── Logo.jsx                # SVG receipt logo
        │   └── Footer.jsx              # Bottom brand info, tech stack, disclaimers
        └── pages/
            ├── LandingPage.jsx         # Marketing page + interactive demo widget
            ├── AuthPage.jsx            # Login / Register + demo quick-login
            └── DashboardPage.jsx       # Main app: list builder, tabs, footer integration
```
