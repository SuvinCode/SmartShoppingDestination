using System;
using System.Collections.Generic;
using System.Linq;
using backend.Data;
using backend.Models;

namespace backend.Services
{
    /// <summary>
    /// Six-phase personalized store recommendation engine.
    ///
    /// Phase 1 — Receipt Product Ranking
    ///   Counts how often each product appears in this user's shopping history.
    ///   Products are ranked descending by frequency; equal frequency → same rank.
    ///   Rank weight = 1.0 / rank, so Rank-1 items count for far more than Rank-8.
    ///
    /// Phase 2 — Cheapest Store Per Product
    ///   For every ranked product, scans all catalog entries across Coles, Woolworths,
    ///   Aldi, IGA, and Costco to find the cheapest current ShelfPrice.
    ///
    /// Phase 3 — Weighted Store Scoring
    ///   Each store accumulates the rank weights of the products it wins.
    ///   Winning your Rank-1 product scores far more than winning a Rank-8 product.
    ///
    /// Phase 4 — Top 5 by Weighted Savings
    ///   Converts weighted scores to estimated dollar savings and returns the top 5.
    ///
    /// Phase 5 — Distance Layer
    ///   Uses UserPreferences for Coles and Woolworths; simulates distances for Aldi,
    ///   IGA, and Costco. Returns top 5 stores sorted by proximity.
    ///
    /// Phase 6 — Combined Recommendation
    ///   Reconciles both lists into a trade-off narrative and optional split-shop
    ///   suggestion if the top-2 stores are within 5 km of each other.
    /// </summary>
    public class StoreRecommendationEngine : IStoreRecommendationEngine
    {
        private readonly DocketDbContext _context;

        // Average estimated dollar saving per rank-weight unit — tunable constant
        private const decimal SavingPerWeightUnit = 8.0M;

        // Simulated distances for stores that don't appear in UserPreferences (km)
        // These represent realistic "slightly further" suburban store distances
        private static readonly Dictionary<string, double> DefaultDistances = new()
        {
            ["Aldi"] = 4.6,
            ["IGA"] = 2.1,
            ["Costco"] = 18.0
        };

        public StoreRecommendationEngine(DocketDbContext context)
        {
            _context = context;
        }

        public StoreRecommendationResult GetTopStores(int userId, UserPreferences prefs)
        {
            // ── Phase 1: Receipt Product Ranking ─────────────────────────────────────
            var rankedProducts = BuildProductRankings(userId);

            // ── Phase 2: Cheapest Store Per Product ──────────────────────────────────
            var catalog = _context.CatalogItems.ToList();
            // storeName → [product name, weight, isSpecial, specialSavings, specialBonusWeight]
            var storeWins = new Dictionary<string, List<(string productName, double rankWeight, bool isSpecial, decimal specialSavings, double specialBonusWeight)>>();

            foreach (var product in rankedProducts)
            {
                var bestMatch = FindCheapestAcrossAllStores(product.ProductName, catalog);
                if (bestMatch == null) continue;

                if (!storeWins.ContainsKey(bestMatch.Store))
                    storeWins[bestMatch.Store] = new();

                var specialType = ClassifySpecial(bestMatch);
                decimal specialSavings = 0M;
                double specialBonusWeight = 0.0;

                if (specialType == SpecialPriceType.HolidaySpecial)
                {
                    specialBonusWeight = 0.45;
                    specialSavings = Math.Max(0, bestMatch.NormalPrice - bestMatch.ShelfPrice) * 1.2M; // Holiday specials have extra volume savings factor
                }
                else if (specialType == SpecialPriceType.Discount)
                {
                    specialBonusWeight = 0.35;
                    specialSavings = Math.Max(0, bestMatch.NormalPrice - bestMatch.ShelfPrice);
                }
                else if (specialType == SpecialPriceType.Promotion)
                {
                    specialBonusWeight = 0.30;
                    specialSavings = Math.Max(0, bestMatch.NormalPrice - bestMatch.ShelfPrice);
                }
                else if (specialType == SpecialPriceType.GeneralSpecial)
                {
                    specialBonusWeight = 0.25;
                    specialSavings = Math.Max(0, bestMatch.NormalPrice - bestMatch.ShelfPrice);
                }

                storeWins[bestMatch.Store].Add((product.ProductName, product.RankWeight, bestMatch.IsSpecial, specialSavings, specialBonusWeight));
            }

            // ── Phase 3: Weighted Store Scoring ──────────────────────────────────────
            var storeScores = storeWins
                .Select(kv => new
                {
                    StoreName = kv.Key,
                    // If the item has a classified special, we add its customized bonus weight to reward active promotions
                    WeightedScore = kv.Value.Sum(w => w.rankWeight + w.specialBonusWeight),
                    SpecialSavingsTotal = kv.Value.Sum(w => w.specialSavings),
                    WinningProducts = kv.Value.Select(w => w.productName).ToList(),
                    SpecialDiscounts = kv.Value.Where(w => w.isSpecial).Select(w => w.productName).ToList()
                })
                .OrderByDescending(s => s.WeightedScore)
                .ToList();

            // ── Phase 4: Top 5 by Weighted Savings ───────────────────────────────────
            var topBySavings = storeScores
                .Select(s => new StoreSavingsResult(
                    s.StoreName,
                    s.WeightedScore,
                    Math.Round((decimal)s.WeightedScore * SavingPerWeightUnit + s.SpecialSavingsTotal, 2),
                    s.WinningProducts,
                    s.SpecialDiscounts))
                .OrderByDescending(s => s.WeightedScore)
                .Take(5)
                .ToList();

            // Pad with zero-score stores if fewer than 5 have wins
            var allKnownStores = new[] { "Coles", "Woolworths", "Aldi", "IGA", "Costco" };
            foreach (var store in allKnownStores)
            {
                if (topBySavings.Count >= 5) break;
                if (!topBySavings.Any(s => s.StoreName == store))
                    topBySavings.Add(new StoreSavingsResult(store, 0, 0, new(), new()));
            }

            // ── Phase 5: Proximity Layer ─────────────────────────────────────────────
            var storeDistances = BuildDistanceMap(prefs);
            var topByProximity = storeDistances
                .OrderBy(kv => kv.Value)
                .Take(5)
                .Select(kv => new ProximityResult(kv.Key, kv.Value))
                .ToList();

            // ── Phase 6: Combined Trade-Off Narrative ────────────────────────────────
            var tradeOff = BuildTradeOffNarrative(topBySavings, topByProximity);
            var splitSuggestion = BuildSplitShopSuggestion(topBySavings, topByProximity, storeDistances);

            return new StoreRecommendationResult(
                rankedProducts,
                topBySavings,
                topByProximity,
                tradeOff,
                splitSuggestion);
        }

        // ─── Phase 1 helper ─────────────────────────────────────────────────────────
        private List<RankedProduct> BuildProductRankings(int userId)
        {
            // Group shopping list items by normalized name, count occurrences
            var history = _context.ShoppingListItems
                .Where(i => i.UserId == userId && i.IsCompleted)
                .ToList();

            if (!history.Any())
            {
                // Fallback: use a generic list if no history exists
                return new List<RankedProduct>
                {
                    new("Full Cream Milk 2L", 12, 1),
                    new("White Bread 650g", 11, 2),
                    new("Chicken Breast 500g", 3, 3),
                    new("Cheese Block 500g", 3, 3),
                    new("Eggs 12pk", 2, 5)
                };
            }

            var grouped = history
                .GroupBy(i => NormalizeName(i.ItemName))
                .Select(g => new { Name = g.Key, Count = g.Count() })
                .OrderByDescending(g => g.Count)
                .ToList();

            // Assign ranks — equal counts share the same rank
            var ranked = new List<RankedProduct>();
            int currentRank = 1;
            for (int i = 0; i < grouped.Count; i++)
            {
                if (i > 0 && grouped[i].Count < grouped[i - 1].Count)
                    currentRank = i + 1;
                ranked.Add(new RankedProduct(grouped[i].Name, grouped[i].Count, currentRank));
            }
            return ranked;
        }

        private CatalogItem? FindCheapestAcrossAllStores(string productName, List<CatalogItem> catalog)
        {
            var query = productName.ToLower();
            var candidates = new List<CatalogItem>();

            // Collect best match per store
            var stores = new[] { "Coles", "Woolworths", "Aldi", "IGA", "Costco" };
            foreach (var store in stores)
            {
                var storeCatalog = catalog.Where(c => c.Store == store).ToList();
                var match = FindBestMatch(query, storeCatalog);
                if (match != null) candidates.Add(match);
            }

            // Return the cheapest across all stores
            return candidates.OrderBy(c => c.ShelfPrice).FirstOrDefault();
        }

        private CatalogItem? FindBestMatch(string query, List<CatalogItem> items)
        {
            var exact = items.FirstOrDefault(i => i.Name.ToLower() == query);
            if (exact != null) return exact;

            var substring = items.FirstOrDefault(i => i.Name.ToLower().Contains(query));
            if (substring != null) return substring;

            var category = items.FirstOrDefault(i =>
                i.Category.ToLower() == query || query.Contains(i.Category.ToLower()));
            if (category != null) return category;

            var queryWords = query.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (queryWords.Length > 0)
            {
                var match = items
                    .Select(i => new
                    {
                        Item = i,
                        MatchCount = queryWords.Count(w => i.Name.ToLower().Contains(w))
                    })
                    .Where(x => x.MatchCount > 0)
                    .OrderByDescending(x => x.MatchCount)
                    .ThenBy(x => x.Item.ShelfPrice)
                    .FirstOrDefault();
                if (match != null) return match.Item;
            }
            return null;
        }

        // ─── Phase 5 helper ─────────────────────────────────────────────────────────
        private Dictionary<string, double> BuildDistanceMap(UserPreferences prefs)
        {
            var distances = new Dictionary<string, double>
            {
                ["Coles"] = prefs.DistanceToColesKm,
                ["Woolworths"] = prefs.DistanceToWoolworthsKm,
                ["Aldi"] = DefaultDistances.ContainsKey("Aldi") ? DefaultDistances["Aldi"] : 4.6,
                ["IGA"] = DefaultDistances.ContainsKey("IGA") ? DefaultDistances["IGA"] : 2.1,
                ["Costco"] = DefaultDistances.ContainsKey("Costco") ? DefaultDistances["Costco"] : 18.0
            };

            return distances;
        }

        // ─── Phase 6 helpers ─────────────────────────────────────────────────────────
        private string BuildTradeOffNarrative(
            List<StoreSavingsResult> topSavings,
            List<ProximityResult> topProximity)
        {
            if (!topSavings.Any() || !topProximity.Any()) return "";

            var bestSaving = topSavings.First();
            var closest = topProximity.First();

            if (bestSaving.StoreName == closest.StoreName)
                return $"{bestSaving.StoreName} is both the cheapest and closest option — easy choice this week!";

            var closestSaving = topSavings.FirstOrDefault(s => s.StoreName == closest.StoreName);
            decimal savingDiff = bestSaving.EstimatedWeeklySaving - (closestSaving?.EstimatedWeeklySaving ?? 0);

            var bestProximity = topProximity.FirstOrDefault(p => p.StoreName == bestSaving.StoreName);
            string distanceInfo = bestProximity != null
                ? $"{bestProximity.DistanceKm:F1} km away"
                : "further away";

            return $"{bestSaving.StoreName} saves you the most (${bestSaving.EstimatedWeeklySaving:F2}) but is {distanceInfo}. " +
                   $"{closest.StoreName} saves ${savingDiff:F2} less but is only {closest.DistanceKm:F1} km from you.";
        }

        private SplitShopSuggestion? BuildSplitShopSuggestion(
            List<StoreSavingsResult> topSavings,
            List<ProximityResult> topProximity,
            Dictionary<string, double> storeDistances)
        {
            if (topSavings.Count < 2) return null;

            var first = topSavings[0];
            var second = topSavings[1];

            // Suggest split only if both stores are within 5 km of each other
            bool firstHasDistance = storeDistances.TryGetValue(first.StoreName, out double d1);
            bool secondHasDistance = storeDistances.TryGetValue(second.StoreName, out double d2);
            if (!firstHasDistance || !secondHasDistance) return null;

            double distanceBetween = Math.Abs(d1 - d2);
            if (distanceBetween > 5.0) return null;

            // Primary items = winning products from first store (top 3)
            var primaryItems = first.WinningProducts.Take(3).ToList();
            decimal extraSaving = Math.Max(0, first.EstimatedWeeklySaving + second.EstimatedWeeklySaving
                                             - Math.Max(first.EstimatedWeeklySaving, second.EstimatedWeeklySaving));
            if (extraSaving < 3.0M) return null; // not worth a split trip for less than $3

            return new SplitShopSuggestion(first.StoreName, second.StoreName, primaryItems, extraSaving);
        }

        private enum SpecialPriceType
        {
            None,
            Discount,          // e.g. "Save $1.00", "15% off"
            HolidaySpecial,    // e.g. "Christmas Special", "Easter Sale", "Holiday Season Promotion"
            Promotion,         // e.g. "2 for $5", "Value Pack Promo"
            GeneralSpecial     // fallback for other special types
        }

        private SpecialPriceType ClassifySpecial(CatalogItem item)
        {
            if (!item.IsSpecial) return SpecialPriceType.None;

            string details = (item.SpecialDetails ?? "").ToLower();
            if (details.Contains("holiday") || details.Contains("christmas") || details.Contains("easter") || details.Contains("seasonal") || details.Contains("festive"))
            {
                return SpecialPriceType.HolidaySpecial;
            }
            if (details.Contains("for $") || details.Contains("buy") || details.Contains("promo") || details.Contains("pack") || details.Contains("bundle"))
            {
                return SpecialPriceType.Promotion;
            }
            if (details.Contains("save") || details.Contains("off") || details.Contains("discount") || details.Contains("price drop"))
            {
                return SpecialPriceType.Discount;
            }
            return SpecialPriceType.GeneralSpecial;
        }

        // ─── Utility ─────────────────────────────────────────────────────────────────
        private static string NormalizeName(string raw)
        {
            // Strip common store brand prefixes for grouping
            var prefixes = new[] { "Coles ", "Woolworths ", "Aldi ", "IGA " };
            string name = raw?.Trim() ?? "";
            foreach (var prefix in prefixes)
            {
                if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    name = name.Substring(prefix.Length).Trim();
                    break;
                }
            }
            return name;
        }
    }
}
