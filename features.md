# Docket - Core Features & Software Architecture

This document outlines the core functional features of the **Docket** grocery optimization platform and the technical architecture supporting it.

---

## 1. Core Application Features

### 1. Receipt Upload & Data Extraction
*   **OCR Integration**: When a user uploads a receipt photo, a high-accuracy Optical Character Recognition (OCR) model processes the image to extract item names, quantities, and prices.
*   **Messy Data Normalization**: Messy receipt text (e.g., `"WW CHKN BRST 500G"`) is normalized into clean canonical names (e.g., `"Chicken Breast 500g"`) to enable cross-store comparison.
*   **Behavioral Profile Engine**: By analyzing historical receipts, Docket builds a personalized shopping profile of what you buy, brand preferences (e.g., Mainland cheese over home-brand), price thresholds, and purchase frequency.

### 2. Price Intelligence Layer
*   **Personalized Basket Ingestion**: Ingests weekly catalog data from Coles and Woolworths and compares them against your specific profile, calculating the real cost of your actual basket.
*   **Predictive Specials**: Forecasts when regularly purchased products are likely to be discounted, prompting smart stock-up actions.
*   **Substitutes Recommendation**: Suggests equivalent, cheaper brands or packages when standard items are out of stock or overpriced.
*   **Price Sensitivity Weighting**: Identifies which items are highly brand-loyal versus price-sensitive, weighting comparison options accordingly.
*   **Store Patterns Identification**: Spots historical trends (e.g., Woolworths offering superior meat specials mid-month) to inform future shopping schedules.

### 3. Google Maps Integration
*   **Store Locating & Distance**: Shows the closest store outlets (Coles, Woolworths, Aldi, IGA, Costco) relative to the user's home address or current coordinates.
*   **Travel Cost Factoring**: Adds transit overhead calculations into the comparison engine (e.g., *"Woolworths saves $12 but is 8km further away. Coles costs $6 more but is 2 minutes away"*).
*   **Split-Shop Trip Optimizer**: Coordinates a multi-stop route if split-shopping (buying some items at Coles and others at Woolworths) saves more than the threshold and the outlets are close to each other.
*   **View Route in Google Maps**: Instantly generates Google Maps direction links mapping from the user's customized home address to the exact matched store location.

### 4. The Data Flywheel
*   **Compounding Accuracy**: Every uploaded receipt feeds the personalization profile.
*   **Anonymized Aggregation**:Aggregated data maps regional pricing patterns, store-specific inventory shortages, and catalog match rates to improve predictions for all users.
*   **Retention Loop**: High-accuracy personalization drives long-term customer utility and engagement.

### 5. Technical Stack to Make This Work
*   **OCR**: Google Vision API or AWS Textract for rapid raw text detection.
*   **ML Matching**: Lightweight normalizers and fuzzy string matching (e.g., RapidFuzz) combined with SQLite queries.
*   **Pricing Data Ingestion**: Weekly ingestion scripts for Coles and Woolworths catalogues.
*   **Maps API**: Google Maps Platform for geolocating, distance calculations, and routing.

### 6. Five-Retailer Store Ranking Engine (6-Phase Algorithm)

The most powerful feature of Docket is the personalized multi-store recommendation engine:

**Phase 1 — Receipt Product Ranking**  
Reads all uploaded receipts and counts how frequently each product appears. Products that appear most often receive the lowest rank number (Rank 1 = most purchased). Equal frequency shares the same rank. Rank weight = `1.0 / rank`.

**Phase 2 — Cheapest Store Per Product**  
For each ranked product, searches across all available stores (Coles, Woolworths, Aldi, IGA, and Costco) and finds which one has the lowest current ShelfPrice (accounting for active specials).

**Phase 3 — Weighted Store Scoring**  
Stores accumulate the rank weights of every product they win cheapest. Winning Rank 1 (your most-bought item) contributes far more to the score than winning Rank 8. Additionally, a customized bonus weight is added to the score depending on the specific type of special price detected:
*   **Holiday Season Specials** (e.g. Christmas, Easter, seasonal specials): `+0.45` bonus weight.
*   **Direct Discounts** (e.g. "Save $X", "% Off"): `+0.35` bonus weight.
*   **Promotions** (e.g. "2 for $5", multibuy, value pack deals): `+0.30` bonus weight.
*   **General Specials**: `+0.25` bonus weight.
This rewards stores running active discount campaigns for items you buy frequently, making recommendations extremely responsive to promotions.

**Phase 4 — Weighted Savings Calculation**  
Converts weighted scores to estimated base weekly savings and adds the actual calculated discount amount (`NormalPrice - ShelfPrice`) for active store specials (with a `1.2x` volume adjustment factor applied to Holiday Specials), making the savings estimate dynamic and accurate. Returns the stores sorted descending.

**Phase 5 — Distance Layer**  
Uses `UserPreferences` and fallback distances for Coles, Woolworths, Aldi, IGA, and Costco. Returns stores sorted ascending by proximity.

**Phase 6 — Combined Trade-Off Recommendation**  
Reconciles the ranked lists into a single narrative: *"Aldi saves you the most ($20.00) but is 4.6 km away. Woolworths saves $5.00 less but is only 0.8 km from you."* Also surfaces an optional split-shop suggestion if the stores are within 5 km of each other and the extra saving exceeds $3.

### 7. Multi-Document Batch Upload & Scan Queue
*   **Sequential Scan Processing**: Users can upload multiple receipt files simultaneously. The frontend maintains an encapsulated scan queue allowing users to preview, add, or remove queued files before execution.
*   **Pipeline Execution**: Clicking `Scan Documents` triggers a series of API requests that run the fuzzy string matching matching algorithm. Scanned items are appended to the active shopping list and saved as completed items in the database history to continuously refine the recommendation engine's product rankings.
*   **Offline Simulation Fallback**: If the backend is offline, the client falls back to simulating receipt scanning and adds items through the backend APIs to ensure persistence.

### 8. Dedicated Demo Access & Clean Login State
*   **Demo Account**: A pre-seeded demo account (`username: demo`) allows instant testing of the application's matching algorithms.
*   **Login Clean State**: Upon a successful login, the application automatically clears all uncompleted items from the active shopping list, giving the user a fresh, clean slate while preserving their historical completed receipt items for recommendation ranking.

---

## 2. Software Architecture: OOP & Encapsulation Rationale

To support these advanced intelligence layers, the C# backend uses a robust, domain-driven Object-Oriented design:

### 1. Guarding Business Invariants (State Validation)
In the previous anemic model, properties could be mutated to invalid states (e.g., negative prices, empty names, or negative shopping quantities). 
Docket wraps all properties in `private set` accessors and handles state changes strictly through parameterized constructors and domain methods:
- `CatalogItem` validates store sources ("Coles" or "Woolworths") and positive pricing.
- `ShoppingListItem` enforces strict quantity increments and state transitions.
- `UserPreferences` guarantees travel parameters are realistic.

### 2. Encapsulation of State Transitions
- **History Tracking**: The C# domain model `ShoppingListItem` exposes the `ToggleCompletion` method to cleanly transition items from the active shopping list into completed purchase history. By calling this on receipt imports, the backend encapsulates the logic that feeds items into `BuildProductRankings` without exposing the internal flag for arbitrary external modification.
- **Quantity Merging**: When batch-importing receipt items, the controller updates quantities using `item.UpdateQuantity(...)` instead of writing custom database modification queries, ensuring all quantity modifications respect the domain constraint that quantity must remain positive.

### 3. Decoupling and Interface Segregation
Decoupling the controllers from concrete service implementations through interfaces like `IComparisonEngine` and `IPythonAIServiceClient` allows for easy testing, mocking, and updating of modules without breaking API contracts.
