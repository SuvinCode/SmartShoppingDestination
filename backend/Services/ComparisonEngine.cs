using System;
using System.Collections.Generic;
using System.Linq;
using backend.Data;
using backend.Models;

namespace backend.Services
{
    public class ComparisonEngine : IComparisonEngine
    {
        private readonly DocketDbContext _context;

        public ComparisonEngine(DocketDbContext context)
        {
            _context = context;
        }

        public ComparisonResult CompareList(List<ShoppingListItem> listItems, UserPreferences prefs)
        {
            // Get all catalog items to search
            var catalog = _context.CatalogItems.ToList();
            var colesCatalog = catalog.Where(i => i.Store == "Coles").ToList();
            var woolworthsCatalog = catalog.Where(i => i.Store == "Woolworths").ToList();

            var colesMatched = new List<MatchedBasketItem>();
            var woolworthsMatched = new List<MatchedBasketItem>();
            
            foreach (var listItem in listItems)
            {
                var query = listItem.ItemName.ToLower();
                
                var colesMatch = FindBestMatch(query, colesCatalog);
                var woolworthsMatch = FindBestMatch(query, woolworthsCatalog);

                if (colesMatch != null)
                {
                    colesMatched.Add(new MatchedBasketItem(listItem.Id, listItem.ItemName, colesMatch, listItem.Quantity));
                }
                
                if (woolworthsMatch != null)
                {
                    woolworthsMatched.Add(new MatchedBasketItem(listItem.Id, listItem.ItemName, woolworthsMatch, listItem.Quantity));
                }
            }

            // Encapsulate Coles and Woolworths option totals
            var colesResult = new StoreOptionResult("Coles", colesMatched, prefs);
            var woolworthsResult = new StoreOptionResult("Woolworths", woolworthsMatched, prefs);

            // Calculate Split Shop option
            var splitColesBasket = new List<MatchedBasketItem>();
            var splitWoolworthsBasket = new List<MatchedBasketItem>();

            foreach (var listItem in listItems)
            {
                var colesItem = colesMatched.FirstOrDefault(i => i.ListItemId == listItem.Id);
                var woolworthsItem = woolworthsMatched.FirstOrDefault(i => i.ListItemId == listItem.Id);

                if (colesItem != null && woolworthsItem != null)
                {
                    decimal colesUnitCost = colesItem.MatchedItem.ShelfPrice / (decimal)colesItem.MatchedItem.UnitQuantity;
                    decimal woolworthsUnitCost = woolworthsItem.MatchedItem.ShelfPrice / (decimal)woolworthsItem.MatchedItem.UnitQuantity;

                    if (colesItem.MatchedItem.PackageSize != woolworthsItem.MatchedItem.PackageSize)
                    {
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

            var allSplitItems = splitColesBasket.Concat(splitWoolworthsBasket).ToList();
            var splitResult = new StoreOptionResult("Split Shop", allSplitItems, prefs);

            // Return consolidated comparison result (which encapsulates the winning store selection)
            return new ComparisonResult(colesResult, woolworthsResult, splitResult, splitColesBasket, splitWoolworthsBasket, prefs);
        }

        private CatalogItem? FindBestMatch(string query, List<CatalogItem> items)
        {
            var exact = items.FirstOrDefault(i => i.Name.ToLower() == query);
            if (exact != null) return exact;

            var substring = items.FirstOrDefault(i => i.Name.ToLower().Contains(query));
            if (substring != null) return substring;

            var category = items.FirstOrDefault(i => i.Category.ToLower() == query || query.Contains(i.Category.ToLower()));
            if (category != null) return category;

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
        public string WinnerStore { get; private set; } = ""; // "Coles", "Woolworths", or "Split Shop"
        public string SingleStoreWinner { get; private set; } = ""; // "Coles" or "Woolworths"
        public decimal TotalSavings { get; private set; }
        public decimal SingleStoreSavings { get; private set; }
        public decimal SplitExtraSavings { get; private set; }
        public bool IsSplitRecommended { get; private set; }
        
        public StoreOptionResult Coles { get; private set; } = null!;
        public StoreOptionResult Woolworths { get; private set; } = null!;
        public StoreOptionResult Split { get; private set; } = null!;

        public List<MatchedBasketItem> SplitColesBasket { get; private set; } = new();
        public List<MatchedBasketItem> SplitWoolworthsBasket { get; private set; } = new();

        private ComparisonResult() { }

        public ComparisonResult(StoreOptionResult coles, StoreOptionResult woolies, StoreOptionResult split, List<MatchedBasketItem> splitColes, List<MatchedBasketItem> splitWoolies, UserPreferences prefs)
        {
            Coles = coles ?? throw new ArgumentNullException(nameof(coles));
            Woolworths = woolies ?? throw new ArgumentNullException(nameof(woolies));
            Split = split ?? throw new ArgumentNullException(nameof(split));
            SplitColesBasket = splitColes ?? new();
            SplitWoolworthsBasket = splitWoolies ?? new();

            SingleStoreWinner = Coles.AdjustedTotal <= Woolworths.AdjustedTotal ? "Coles" : "Woolworths";
            decimal bestSingleTotal = Coles.AdjustedTotal <= Woolworths.AdjustedTotal ? Coles.AdjustedTotal : Woolworths.AdjustedTotal;
            decimal worstSingleTotal = Coles.AdjustedTotal > Woolworths.AdjustedTotal ? Coles.AdjustedTotal : Woolworths.AdjustedTotal;

            SingleStoreSavings = Math.Max(0, worstSingleTotal - bestSingleTotal);

            decimal splitSavingVsBestSingle = bestSingleTotal - Split.AdjustedTotal;

            if (splitSavingVsBestSingle > prefs.MinSplitSavingThreshold && SplitColesBasket.Count > 0 && SplitWoolworthsBasket.Count > 0)
            {
                WinnerStore = "Split Shop";
                TotalSavings = worstSingleTotal - Split.AdjustedTotal;
                SplitExtraSavings = splitSavingVsBestSingle;
                IsSplitRecommended = true;
            }
            else
            {
                WinnerStore = SingleStoreWinner;
                TotalSavings = SingleStoreSavings;
                SplitExtraSavings = Math.Max(0, splitSavingVsBestSingle);
                IsSplitRecommended = false;
            }
        }
    }

    public class StoreOptionResult
    {
        public string StoreName { get; private set; } = "";
        public List<MatchedBasketItem> BasketItems { get; private set; } = new();
        public decimal ShelfTotal { get; private set; }
        public decimal NormalTotal { get; private set; }
        public decimal FuelAdjustment { get; private set; }
        public decimal RewardsValue { get; private set; }
        public decimal AdjustedTotal { get; private set; }
        public double StockRiskPercentage { get; private set; }
        public int SpecialsCount { get; private set; }

        private StoreOptionResult() { }

        public StoreOptionResult(string storeName, List<MatchedBasketItem> basketItems, UserPreferences prefs)
        {
            StoreName = storeName;
            BasketItems = basketItems ?? new();
            
            ShelfTotal = BasketItems.Sum(i => i.TotalPrice);
            NormalTotal = BasketItems.Sum(i => i.NormalPrice);
            SpecialsCount = BasketItems.Count(i => i.IsSpecial);

            if (storeName == "Coles")
            {
                FuelAdjustment = prefs.CalculateColesTravelCost();
                RewardsValue = prefs.CalculateColesRewards(ShelfTotal, SpecialsCount);
            }
            else if (storeName == "Woolworths")
            {
                FuelAdjustment = prefs.CalculateWoolworthsTravelCost();
                RewardsValue = prefs.CalculateWoolworthsRewards(ShelfTotal, SpecialsCount);
            }
            else if (storeName == "Split Shop")
            {
                FuelAdjustment = prefs.CalculateSplitTravelCost();
                
                var colesItems = BasketItems.Where(i => i.MatchedItem.Store == "Coles").ToList();
                var wooliesItems = BasketItems.Where(i => i.MatchedItem.Store == "Woolworths").ToList();
                
                decimal colesRewards = prefs.CalculateColesRewards(colesItems.Sum(i => i.TotalPrice), colesItems.Count(i => i.IsSpecial));
                decimal wooliesRewards = prefs.CalculateWoolworthsRewards(wooliesItems.Sum(i => i.TotalPrice), wooliesItems.Count(i => i.IsSpecial));
                
                RewardsValue = colesRewards + wooliesRewards;
            }

            AdjustedTotal = ShelfTotal + FuelAdjustment - RewardsValue;
            
            double nonOosProbability = BasketItems.Select(i => 1.0 - i.MatchedItem.OutOfStockProbability).Aggregate(1.0, (acc, p) => acc * p);
            StockRiskPercentage = Math.Round(100.0 * (1.0 - nonOosProbability), 1);
        }
    }

    public class MatchedBasketItem
    {
        public int ListItemId { get; private set; }
        public string SearchQuery { get; private set; } = "";
        public CatalogItem MatchedItem { get; private set; } = null!;
        public int Quantity { get; private set; }
        public decimal TotalPrice { get; private set; }
        public decimal NormalPrice { get; private set; }
        public bool IsSpecial { get; private set; }
        public string SpecialDetails { get; private set; } = "";

        private MatchedBasketItem() { }

        public MatchedBasketItem(int listItemId, string searchQuery, CatalogItem matchedItem, int quantity)
        {
            if (matchedItem == null) throw new ArgumentNullException(nameof(matchedItem));
            if (quantity <= 0) throw new ArgumentException("Quantity must be positive", nameof(quantity));

            ListItemId = listItemId;
            SearchQuery = searchQuery ?? "";
            MatchedItem = matchedItem;
            Quantity = quantity;
            TotalPrice = matchedItem.ShelfPrice * quantity;
            NormalPrice = matchedItem.NormalPrice * quantity;
            IsSpecial = matchedItem.IsSpecial;
            SpecialDetails = matchedItem.SpecialDetails;
        }
    }
}
