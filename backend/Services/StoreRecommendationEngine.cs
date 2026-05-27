using System;
using System.Collections.Generic;
using System.Linq;
using backend.Data;
using backend.Models;

namespace backend.Services
{
    /// <summary>
    /// Location-aware, multi-phase personalized store recommendation engine.
    ///
    /// Phase 0 — Region Store Filter
    ///   Uses the user's configured region/city to determine which store chains
    ///   operate locally. Only stores with branches in the user's region are
    ///   considered. A Brisbane user will never see Melbourne-only stores.
    ///
    /// Phase 1 — Receipt Product Ranking
    ///   Counts how often each product appears in this user's shopping history.
    ///   Products are ranked descending by frequency; equal frequency → same rank.
    ///   Rank weight = 1.0 / rank, so Rank-1 items count for far more than Rank-8.
    ///
    /// Phase 2 — Cheapest Store Per Product
    ///   For every ranked product, scans catalog entries across only the
    ///   region-filtered stores to find the cheapest current ShelfPrice.
    ///
    /// Phase 3 — Weighted Store Scoring
    ///   Each store accumulates the rank weights of the products it wins.
    ///   Winning your Rank-1 product scores far more than winning a Rank-8 product.
    ///
    /// Phase 4 — Top 5 by Weighted Savings
    ///   Converts weighted scores to estimated dollar savings and returns the top 5.
    ///
    /// Phase 5 — Distance Layer
    ///   Uses UserPreferences and region-specific default distances. Returns top 5
    ///   stores sorted by proximity within the user's region.
    ///
    /// Phase 6 — Combined Trade-Off Recommendation
    ///   Reconciles the ranked lists into a single narrative.
    ///
    /// Phase 7 — Itemized Price Comparison
    ///   Builds a cross-store price table for the user's top products.
    /// </summary>
    public class StoreRecommendationEngine : IStoreRecommendationEngine
    {
        private readonly DocketDbContext _context;

        private const decimal SavingPerWeightUnit = 8.0M;

        // Which store chains operate in each Australian city/region
        private static readonly Dictionary<string, string[]> RegionStores = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Melbourne"] = new[] { "Coles", "Woolworths", "Aldi", "IGA", "Costco" },
            ["Sydney"]    = new[] { "Coles", "Woolworths", "Aldi", "IGA", "Costco" },
            ["Brisbane"]  = new[] { "Coles", "Woolworths", "Aldi", "IGA" },
            ["Perth"]     = new[] { "Coles", "Woolworths", "Aldi", "IGA" },
            ["Adelaide"]  = new[] { "Coles", "Woolworths", "Aldi", "IGA", "Costco" },
            ["Hobart"]    = new[] { "Coles", "Woolworths", "IGA" },
            ["Darwin"]    = new[] { "Coles", "Woolworths", "IGA" },
            ["Canberra"]  = new[] { "Coles", "Woolworths", "Aldi", "IGA", "Costco" },
            ["Gold Coast"] = new[] { "Coles", "Woolworths", "Aldi", "IGA" },
        };

        // Default distances per region for stores without explicit user distances
        private static readonly Dictionary<string, Dictionary<string, double>> RegionDefaultDistances = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Melbourne"] = new() { ["Aldi"] = 4.6, ["IGA"] = 2.1, ["Costco"] = 18.0 },
            ["Sydney"]    = new() { ["Aldi"] = 5.2, ["IGA"] = 3.0, ["Costco"] = 15.0 },
            ["Brisbane"]  = new() { ["Aldi"] = 4.8, ["IGA"] = 2.5 },
            ["Perth"]     = new() { ["Aldi"] = 5.5, ["IGA"] = 2.8 },
            ["Adelaide"]  = new() { ["Aldi"] = 4.0, ["IGA"] = 2.0, ["Costco"] = 12.0 },
            ["Hobart"]    = new() { ["IGA"] = 2.0 },
            ["Darwin"]    = new() { ["IGA"] = 3.0 },
            ["Canberra"]  = new() { ["Aldi"] = 4.0, ["IGA"] = 2.5, ["Costco"] = 10.0 },
            ["Gold Coast"] = new() { ["Aldi"] = 5.0, ["IGA"] = 2.5 },
        };

        public StoreRecommendationEngine(DocketDbContext context)
        {
            _context = context;
        }

        public StoreRecommendationResult? GetTopStores(int userId, UserPreferences prefs)
        {
            var history = _context.ShoppingListItems
                .Where(i => i.UserId == userId && i.IsCompleted)
                .ToList();

            if (!history.Any())
            {
                return null;
            }

            // ── Phase 0: Region Store Filter (Limited to Coles and Woolworths as requested) ──
            string region = prefs.Region ?? "Melbourne";
            var availableStores = GetStoresForRegion(region);

            // ── Phase 1: Receipt Product Ranking ─────────────────────────────────────
            var rankedProducts = BuildProductRankings(userId);

            // ── Phase 2: Cheapest Store Per Product (region-filtered) ─────────────────
            var catalog = _context.CatalogItems
                .ToList()
                .Where(c => availableStores.Contains(c.Store))
                .ToList();

            var storeWins = new Dictionary<string, List<(string productName, double rankWeight, bool isSpecial, decimal specialSavings, double specialBonusWeight)>>();

            foreach (var product in rankedProducts)
            {
                var bestMatch = FindCheapestAcrossAllStores(product.ProductName, catalog, availableStores);
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
                .ToList();

            // Pad with zero-score stores from this region if fewer than available
            foreach (var store in availableStores)
            {
                if (!topBySavings.Any(s => s.StoreName == store))
                    topBySavings.Add(new StoreSavingsResult(store, 0, 0, new(), new()));
            }

            // ── Phase 5: Proximity Layer (region-aware) ──────────────────────────────
            var storeDistances = BuildDistanceMap(prefs, region, availableStores);
            var topByProximity = storeDistances
                .OrderBy(kv => kv.Value)
                .Select(kv => new ProximityResult(kv.Key, kv.Value))
                .ToList();

            // ── Phase 6: Combined Trade-Off Narrative ────────────────────────────────
            var tradeOff = BuildTradeOffNarrative(topBySavings, topByProximity);

            // ── Phase 7: Itemized Price Comparison ────────────────────────────────────
            var topStoreNames = topBySavings.Select(s => s.StoreName).ToList();
            var itemComparisons = BuildItemPriceComparisons(rankedProducts, catalog, topStoreNames);

            // ── Phase 8: Three-Category Target Recommendations ─────────────────────────
            // 1. Cheapest Shop (Weighted/Ranked)
            var weightedWinner = topBySavings.FirstOrDefault() ?? new StoreSavingsResult("Coles", 0, 0, new());
            double weightedWinnerDist = storeDistances.TryGetValue(weightedWinner.StoreName, out double wd) ? wd : 5.0;
            var cheapestWeighted = new CategoryRecommendation(
                weightedWinner.StoreName,
                "Cheapest Personalized",
                "Est. Weekly Savings",
                weightedWinner.EstimatedWeeklySaving > 0 ? $"${weightedWinner.EstimatedWeeklySaving:F2} saved" : "$0.00 saved",
                $"Cheapest for your recurring items, saving you ${weightedWinner.EstimatedWeeklySaving:F2}.",
                weightedWinnerDist,
                weightedWinner.WinningProducts,
                weightedWinner.SpecialDiscounts
            );

            // 2. Cheapest Shop Overall (Unweighted)
            var storeUnweightedCosts = new Dictionary<string, decimal>();
            foreach (var store in availableStores)
            {
                storeUnweightedCosts[store] = 0M;
            }

            var productPricesByStore = new Dictionary<string, Dictionary<string, decimal>>();
            foreach (var product in rankedProducts)
            {
                var storePrices = new Dictionary<string, decimal>();
                var pricesList = new List<decimal>();
                foreach (var store in availableStores)
                {
                    var storeCatalog = catalog.Where(c => c.Store == store).ToList();
                    var match = FindBestMatch(product.ProductName.ToLower(), storeCatalog);
                    if (match != null)
                    {
                        storePrices[store] = match.ShelfPrice;
                        pricesList.Add(match.ShelfPrice);
                    }
                }

                if (pricesList.Any())
                {
                    decimal avgPrice = pricesList.Average();
                    var storePriceMap = new Dictionary<string, decimal>();
                    foreach (var store in availableStores)
                    {
                        if (storePrices.TryGetValue(store, out decimal price))
                        {
                            storePriceMap[store] = price;
                        }
                        else
                        {
                            storePriceMap[store] = avgPrice;
                        }
                    }
                    productPricesByStore[product.ProductName] = storePriceMap;
                }
            }

            foreach (var store in availableStores)
            {
                decimal totalCost = 0M;
                foreach (var product in rankedProducts)
                {
                    if (productPricesByStore.TryGetValue(product.ProductName, out var storePrices) &&
                        storePrices.TryGetValue(store, out decimal price))
                    {
                        totalCost += price;
                    }
                }
                storeUnweightedCosts[store] = totalCost;
            }

            var unweightedWinnerName = storeUnweightedCosts.OrderBy(kv => kv.Value).Select(kv => kv.Key).FirstOrDefault() ?? "Coles";
            var unweightedWinnerCost = storeUnweightedCosts.TryGetValue(unweightedWinnerName, out decimal uwCost) ? uwCost : 0M;
            var unweightedWinnerSavings = topBySavings.FirstOrDefault(s => s.StoreName == unweightedWinnerName) ?? new StoreSavingsResult(unweightedWinnerName, 0, 0, new());
            double unweightedWinnerDist = storeDistances.TryGetValue(unweightedWinnerName, out double uwd) ? uwd : 5.0;

            var cheapestUnweighted = new CategoryRecommendation(
                unweightedWinnerName,
                "Cheapest Overall",
                "Average Basket Cost",
                $"${unweightedWinnerCost:F2} total",
                $"Cheapest overall on average from the items, totaling ${unweightedWinnerCost:F2}.",
                unweightedWinnerDist,
                unweightedWinnerSavings.WinningProducts,
                unweightedWinnerSavings.SpecialDiscounts
            );

            // 3. Nearest Shop (Proximity Priority)
            var nearestStoreName = availableStores
                .Select(store => {
                    double dist = storeDistances.TryGetValue(store, out double d) ? d : 5.0;
                    var savings = topBySavings.FirstOrDefault(s => s.StoreName == store);
                    double score = savings != null ? (double)savings.WeightedScore : 0.0;
                    return new { Store = store, Distance = dist, Score = score };
                })
                .OrderBy(x => x.Distance)
                .ThenByDescending(x => x.Score)
                .Select(x => x.Store)
                .FirstOrDefault() ?? "Coles";

            double nearestWinnerDist = storeDistances.TryGetValue(nearestStoreName, out double nwd) ? nwd : 5.0;
            var nearestWinnerSavings = topBySavings.FirstOrDefault(s => s.StoreName == nearestStoreName) ?? new StoreSavingsResult(nearestStoreName, 0, 0, new());

            var nearestStoreRec = new CategoryRecommendation(
                nearestStoreName,
                "Nearest Shop",
                "Distance",
                $"{nearestWinnerDist:F1} km away",
                $"Closest store to your location at {nearestWinnerDist:F1} km away.",
                nearestWinnerDist,
                nearestWinnerSavings.WinningProducts,
                nearestWinnerSavings.SpecialDiscounts
            );

            return new StoreRecommendationResult(
                rankedProducts,
                topBySavings,
                topByProximity,
                tradeOff,
                itemComparisons,
                cheapestWeighted,
                cheapestUnweighted,
                nearestStoreRec);
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
                return new List<RankedProduct>();
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

        private static string[] GetStoresForRegion(string region)
        {
            // Limit to Coles and Woolworths for now as requested
            return new[] { "Coles", "Woolworths" };
        }

        private CatalogItem? FindCheapestAcrossAllStores(string productName, List<CatalogItem> catalog, string[] availableStores)
        {
            var query = productName.ToLower();
            var candidates = new List<CatalogItem>();

            foreach (var store in availableStores)
            {
                var storeCatalog = catalog.Where(c => c.Store == store).ToList();
                var match = FindBestMatch(query, storeCatalog);
                if (match != null) candidates.Add(match);
            }

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
        private Dictionary<string, double> BuildDistanceMap(UserPreferences prefs, string region, string[] availableStores)
        {
            var regionDefaults = RegionDefaultDistances.ContainsKey(region)
                ? RegionDefaultDistances[region]
                : new Dictionary<string, double>();

            var distances = new Dictionary<string, double>();

            foreach (var store in availableStores)
            {
                if (store == "Coles")
                    distances[store] = prefs.DistanceToColesKm;
                else if (store == "Woolworths")
                    distances[store] = prefs.DistanceToWoolworthsKm;
                else if (regionDefaults.TryGetValue(store, out double dist))
                    distances[store] = dist;
                else
                    distances[store] = 5.0;
            }

            return distances;
        }

        // ─── Phase 7 helper: Itemized cross-store price comparison ────────────────────
        private List<ItemPriceComparison> BuildItemPriceComparisons(
            List<RankedProduct> rankedProducts,
            List<CatalogItem> catalog,
            List<string> topStoreNames)
        {
            var comparisons = new List<ItemPriceComparison>();

            foreach (var product in rankedProducts.Take(10))
            {
                var storePrices = new Dictionary<string, ItemPriceDetail>();

                foreach (var storeName in topStoreNames)
                {
                    var storeCatalog = catalog.Where(c => c.Store == storeName).ToList();
                    var match = FindBestMatch(product.ProductName.ToLower(), storeCatalog);
                    if (match != null)
                    {
                        storePrices[storeName] = new ItemPriceDetail(
                            match.ShelfPrice,
                            match.IsSpecial,
                            match.SpecialDetails,
                            match.PackageSize);
                    }
                }

                if (storePrices.Any())
                {
                    comparisons.Add(new ItemPriceComparison(product.ProductName, storePrices));
                }
            }

            return comparisons;
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
