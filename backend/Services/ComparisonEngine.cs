using System;
using System.Collections.Generic;
using System.Linq;
using backend.Data;
using backend.Models;

namespace backend.Services
{
    public class ComparisonEngine
    {
        private readonly DocketDbContext _context;

        public ComparisonEngine(DocketDbContext context)
        {
            _context = context;
        }

        public ComparisonResult CompareList(List<ShoppingListItem> listItems, UserPreferences prefs)
        {
            var result = new ComparisonResult();
            
            // Get all catalog items to search
            var catalog = _context.CatalogItems.ToList();
            var colesCatalog = catalog.Where(i => i.Store == "Coles").ToList();
            var woolworthsCatalog = catalog.Where(i => i.Store == "Woolworths").ToList();

            var colesMatched = new List<MatchedBasketItem>();
            var woolworthsMatched = new List<MatchedBasketItem>();
            
            foreach (var listItem in listItems)
            {
                // Match items by name / category (case insensitive)
                var query = listItem.ItemName.ToLower();
                
                // Find best Coles match
                var colesMatch = FindBestMatch(query, colesCatalog);
                // Find best Woolworths match
                var woolworthsMatch = FindBestMatch(query, woolworthsCatalog);

                if (colesMatch != null)
                {
                    colesMatched.Add(new MatchedBasketItem
                    {
                        ListItemId = listItem.Id,
                        SearchQuery = listItem.ItemName,
                        MatchedItem = colesMatch,
                        Quantity = listItem.Quantity,
                        TotalPrice = colesMatch.ShelfPrice * listItem.Quantity,
                        NormalPrice = colesMatch.NormalPrice * listItem.Quantity,
                        IsSpecial = colesMatch.IsSpecial,
                        SpecialDetails = colesMatch.SpecialDetails
                    });
                }
                
                if (woolworthsMatch != null)
                {
                    woolworthsMatched.Add(new MatchedBasketItem
                    {
                        ListItemId = listItem.Id,
                        SearchQuery = listItem.ItemName,
                        MatchedItem = woolworthsMatch,
                        Quantity = listItem.Quantity,
                        TotalPrice = woolworthsMatch.ShelfPrice * listItem.Quantity,
                        NormalPrice = woolworthsMatch.NormalPrice * listItem.Quantity,
                        IsSpecial = woolworthsMatch.IsSpecial,
                        SpecialDetails = woolworthsMatch.SpecialDetails
                    });
                }
            }

            // Calculate Coles single store costs
            decimal colesShelfTotal = colesMatched.Sum(i => i.TotalPrice);
            decimal colesNormalTotal = colesMatched.Sum(i => i.NormalPrice);
            decimal colesFuelCost = (decimal)(prefs.DistanceToColesKm * 2) * prefs.FuelCostPerKm;
            decimal colesRewardsValue = prefs.HasFlybuys ? colesShelfTotal * 0.005M : 0; // 0.5% back
            // Add bonus points for specials (simulate 50 points per special = $0.25)
            if (prefs.HasFlybuys)
            {
                int specialCount = colesMatched.Count(i => i.IsSpecial);
                colesRewardsValue += specialCount * 0.25M;
            }
            decimal colesAdjustedTotal = colesShelfTotal + colesFuelCost - colesRewardsValue;
            double colesStockRisk = 100.0 * (1.0 - colesMatched.Select(i => 1.0 - i.MatchedItem.OutOfStockProbability).Aggregate(1.0, (acc, p) => acc * p));

            // Calculate Woolworths single store costs
            decimal woolworthsShelfTotal = woolworthsMatched.Sum(i => i.TotalPrice);
            decimal woolworthsNormalTotal = woolworthsMatched.Sum(i => i.NormalPrice);
            decimal woolworthsFuelCost = (decimal)(prefs.DistanceToWoolworthsKm * 2) * prefs.FuelCostPerKm;
            decimal woolworthsRewardsValue = prefs.HasEverydayRewards ? woolworthsShelfTotal * 0.005M : 0; // 0.5% back
            if (prefs.HasEverydayRewards)
            {
                int specialCount = woolworthsMatched.Count(i => i.IsSpecial);
                woolworthsRewardsValue += specialCount * 0.25M;
            }
            decimal woolworthsAdjustedTotal = woolworthsShelfTotal + woolworthsFuelCost - woolworthsRewardsValue;
            double woolworthsStockRisk = 100.0 * (1.0 - woolworthsMatched.Select(i => 1.0 - i.MatchedItem.OutOfStockProbability).Aggregate(1.0, (acc, p) => acc * p));

            // Calculate Split Shop option
            var splitColesBasket = new List<MatchedBasketItem>();
            var splitWoolworthsBasket = new List<MatchedBasketItem>();

            foreach (var listItem in listItems)
            {
                var colesItem = colesMatched.FirstOrDefault(i => i.ListItemId == listItem.Id);
                var woolworthsItem = woolworthsMatched.FirstOrDefault(i => i.ListItemId == listItem.Id);

                if (colesItem != null && woolworthsItem != null)
                {
                    // Compare unit prices if packaging differs, otherwise shelf prices
                    decimal colesUnitCost = colesItem.MatchedItem.ShelfPrice / (decimal)colesItem.MatchedItem.UnitQuantity;
                    decimal woolworthsUnitCost = woolworthsItem.MatchedItem.ShelfPrice / (decimal)woolworthsItem.MatchedItem.UnitQuantity;

                    // If unit quantities are different (e.g. 500g vs 1kg), normalize
                    if (colesItem.MatchedItem.PackageSize != woolworthsItem.MatchedItem.PackageSize)
                    {
                        // We compare by normalized unit price
                        if (colesUnitCost <= woolworthsUnitCost)
                        {
                            splitColesBasket.Add(colesItem);
                        }
                        else
                        {
                            splitWoolworthsBasket.Add(woolworthsItem);
                        }
                    }
                    else
                    {
                        // Same size, compare direct price
                        if (colesItem.TotalPrice <= woolworthsItem.TotalPrice)
                        {
                            splitColesBasket.Add(colesItem);
                        }
                        else
                        {
                            splitWoolworthsBasket.Add(woolworthsItem);
                        }
                    }
                }
                else if (colesItem != null)
                {
                    splitColesBasket.Add(colesItem);
                }
                else if (woolworthsItem != null)
                {
                    splitWoolworthsBasket.Add(woolworthsItem);
                }
            }

            decimal splitShelfTotal = splitColesBasket.Sum(i => i.TotalPrice) + splitWoolworthsBasket.Sum(i => i.TotalPrice);
            decimal splitNormalTotal = splitColesBasket.Sum(i => i.NormalPrice) + splitWoolworthsBasket.Sum(i => i.NormalPrice);
            decimal splitFuelCost = (decimal)(prefs.DistanceToColesKm * 2 + prefs.DistanceToWoolworthsKm * 2) * prefs.FuelCostPerKm;
            
            decimal splitColesRewards = prefs.HasFlybuys ? splitColesBasket.Sum(i => i.TotalPrice) * 0.005M + splitColesBasket.Count(i => i.IsSpecial) * 0.25M : 0M;
            decimal splitWoolworthsRewards = prefs.HasEverydayRewards ? splitWoolworthsBasket.Sum(i => i.TotalPrice) * 0.005M + splitWoolworthsBasket.Count(i => i.IsSpecial) * 0.25M : 0M;
            decimal splitRewardsValue = splitColesRewards + splitWoolworthsRewards;

            decimal splitAdjustedTotal = splitShelfTotal + splitFuelCost - splitRewardsValue;
            
            var allSplitItems = splitColesBasket.Concat(splitWoolworthsBasket).ToList();
            double splitStockRisk = 100.0 * (1.0 - allSplitItems.Select(i => 1.0 - i.MatchedItem.OutOfStockProbability).Aggregate(1.0, (acc, p) => acc * p));

            // Populate single store details
            result.Coles = new StoreOptionResult
            {
                StoreName = "Coles",
                BasketItems = colesMatched,
                ShelfTotal = colesShelfTotal,
                NormalTotal = colesNormalTotal,
                FuelAdjustment = colesFuelCost,
                RewardsValue = colesRewardsValue,
                AdjustedTotal = colesAdjustedTotal,
                StockRiskPercentage = Math.Round(colesStockRisk, 1),
                SpecialsCount = colesMatched.Count(i => i.IsSpecial)
            };

            result.Woolworths = new StoreOptionResult
            {
                StoreName = "Woolworths",
                BasketItems = woolworthsMatched,
                ShelfTotal = woolworthsShelfTotal,
                NormalTotal = woolworthsNormalTotal,
                FuelAdjustment = woolworthsFuelCost,
                RewardsValue = woolworthsRewardsValue,
                AdjustedTotal = woolworthsAdjustedTotal,
                StockRiskPercentage = Math.Round(woolworthsStockRisk, 1),
                SpecialsCount = woolworthsMatched.Count(i => i.IsSpecial)
            };

            result.Split = new StoreOptionResult
            {
                StoreName = "Split Shop",
                BasketItems = allSplitItems, // all items combined
                ShelfTotal = splitShelfTotal,
                NormalTotal = splitNormalTotal,
                FuelAdjustment = splitFuelCost,
                RewardsValue = splitRewardsValue,
                AdjustedTotal = splitAdjustedTotal,
                StockRiskPercentage = Math.Round(splitStockRisk, 1),
                SpecialsCount = allSplitItems.Count(i => i.IsSpecial)
            };

            result.SplitColesBasket = splitColesBasket;
            result.SplitWoolworthsBasket = splitWoolworthsBasket;

            // Determine the single store winner (based on AdjustedTotal)
            string bestSingleStore = colesAdjustedTotal <= woolworthsAdjustedTotal ? "Coles" : "Woolworths";
            decimal bestSingleTotal = colesAdjustedTotal <= woolworthsAdjustedTotal ? colesAdjustedTotal : woolworthsAdjustedTotal;
            decimal worstSingleTotal = colesAdjustedTotal > woolworthsAdjustedTotal ? colesAdjustedTotal : woolworthsAdjustedTotal;

            result.SingleStoreWinner = bestSingleStore;
            result.SingleStoreSavings = Math.Max(0, worstSingleTotal - bestSingleTotal);

            // Determine if Split Shop is viable (does it save more than the best single store?)
            decimal splitSavingVsBestSingle = bestSingleTotal - splitAdjustedTotal;

            if (splitSavingVsBestSingle > prefs.MinSplitSavingThreshold && splitColesBasket.Count > 0 && splitWoolworthsBasket.Count > 0)
            {
                result.WinnerStore = "Split Shop";
                result.TotalSavings = worstSingleTotal - splitAdjustedTotal;
                result.SplitExtraSavings = splitSavingVsBestSingle;
                result.IsSplitRecommended = true;
            }
            else
            {
                result.WinnerStore = bestSingleStore;
                result.TotalSavings = result.SingleStoreSavings;
                result.SplitExtraSavings = Math.Max(0, splitSavingVsBestSingle);
                result.IsSplitRecommended = false;
            }

            return result;
        }

        private CatalogItem? FindBestMatch(string query, List<CatalogItem> items)
        {
            // Simple exact/substring matching:
            // 1. Check for exact name match
            var exact = items.FirstOrDefault(i => i.Name.ToLower() == query);
            if (exact != null) return exact;

            // 2. Check if query is contained in item name
            var substring = items.FirstOrDefault(i => i.Name.ToLower().Contains(query));
            if (substring != null) return substring;

            // 3. Match by category (if category name is inside query or query matches category)
            var category = items.FirstOrDefault(i => i.Category.ToLower() == query || query.Contains(i.Category.ToLower()));
            if (category != null) return category;

            // 4. Try split words matching
            var queryWords = query.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (queryWords.Length > 0)
            {
                var match = items
                    .Select(i => new { Item = i, MatchesCount = queryWords.Count(w => i.Name.ToLower().Contains(w)) })
                    .Where(x => x.MatchesCount > 0)
                    .OrderByDescending(x => x.MatchesCount)
                    .ThenBy(x => x.Item.ShelfPrice)
                    .FirstOrDefault();

                if (match != null) return match.Item;
            }

            return null;
        }
    }

    public class ComparisonResult
    {
        public string WinnerStore { get; set; } = ""; // "Coles", "Woolworths", or "Split Shop"
        public string SingleStoreWinner { get; set; } = ""; // "Coles" or "Woolworths"
        public decimal TotalSavings { get; set; }
        public decimal SingleStoreSavings { get; set; }
        public decimal SplitExtraSavings { get; set; }
        public bool IsSplitRecommended { get; set; }
        
        public StoreOptionResult Coles { get; set; } = new();
        public StoreOptionResult Woolworths { get; set; } = new();
        public StoreOptionResult Split { get; set; } = new();

        public List<MatchedBasketItem> SplitColesBasket { get; set; } = new();
        public List<MatchedBasketItem> SplitWoolworthsBasket { get; set; } = new();
    }

    public class StoreOptionResult
    {
        public string StoreName { get; set; } = "";
        public List<MatchedBasketItem> BasketItems { get; set; } = new();
        public decimal ShelfTotal { get; set; }
        public decimal NormalTotal { get; set; }
        public decimal FuelAdjustment { get; set; }
        public decimal RewardsValue { get; set; }
        public decimal AdjustedTotal { get; set; }
        public double StockRiskPercentage { get; set; }
        public int SpecialsCount { get; set; }
    }

    public class MatchedBasketItem
    {
        public int ListItemId { get; set; }
        public string SearchQuery { get; set; } = "";
        public CatalogItem MatchedItem { get; set; } = new();
        public int Quantity { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal NormalPrice { get; set; }
        public bool IsSpecial { get; set; }
        public string SpecialDetails { get; set; } = "";
    }
}
