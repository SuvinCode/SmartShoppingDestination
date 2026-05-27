using System;
using System.Collections.Generic;

namespace backend.Models
{
    /// <summary>
    /// Represents a ranked product derived from receipt purchase history.
    /// Rank 1 = most frequently purchased; equal frequency shares the same rank.
    /// </summary>
    public class RankedProduct
    {
        public string ProductName { get; private set; } = "";
        public int Occurrences { get; private set; }   // how many times seen across receipts
        public int Rank { get; private set; }          // 1 = most frequent
        public double RankWeight { get; private set; } // 1.0 / Rank

        private RankedProduct() { }

        public RankedProduct(string productName, int occurrences, int rank)
        {
            if (string.IsNullOrWhiteSpace(productName))
                throw new ArgumentException("Product name cannot be empty.", nameof(productName));
            if (occurrences < 1)
                throw new ArgumentException("Occurrences must be at least 1.", nameof(occurrences));
            if (rank < 1)
                throw new ArgumentException("Rank must be at least 1.", nameof(rank));

            ProductName = productName;
            Occurrences = occurrences;
            Rank = rank;
            RankWeight = 1.0 / rank;
        }
    }

    /// <summary>
    /// Holds the weighted savings score for one store after the Phase-3 algorithm runs.
    /// </summary>
    public class StoreSavingsResult
    {
        public string StoreName { get; private set; } = "";
        public double WeightedScore { get; private set; }
        public decimal EstimatedWeeklySaving { get; private set; }
        public List<string> WinningProducts { get; private set; } = new();
        public List<string> SpecialDiscounts { get; private set; } = new();
        public string SavingsSummary => $"Covers your top items cheapest, estimated saving ${EstimatedWeeklySaving:F2} this week";

        private StoreSavingsResult() { }

        public StoreSavingsResult(string storeName, double weightedScore, decimal estimatedWeeklySaving, List<string> winningProducts, List<string>? specialDiscounts = null)
        {
            if (string.IsNullOrWhiteSpace(storeName))
                throw new ArgumentException("Store name cannot be empty.", nameof(storeName));
            if (weightedScore < 0)
                throw new ArgumentException("Weighted score cannot be negative.", nameof(weightedScore));
            if (estimatedWeeklySaving < 0)
                throw new ArgumentException("Estimated saving cannot be negative.", nameof(estimatedWeeklySaving));

            StoreName = storeName;
            WeightedScore = weightedScore;
            EstimatedWeeklySaving = estimatedWeeklySaving;
            WinningProducts = winningProducts ?? new();
            SpecialDiscounts = specialDiscounts ?? new();
        }
    }

    /// <summary>
    /// Proximity data for one store — distance and estimated drive time.
    /// </summary>
    public class ProximityResult
    {
        public string StoreName { get; private set; } = "";
        public double DistanceKm { get; private set; }
        public int DriveMinutes { get; private set; }   // city average 30 km/h
        public string ProximitySummary => $"{DistanceKm:F1} km, ~{DriveMinutes} min drive";

        private ProximityResult() { }

        public ProximityResult(string storeName, double distanceKm)
        {
            if (string.IsNullOrWhiteSpace(storeName))
                throw new ArgumentException("Store name cannot be empty.", nameof(storeName));
            if (distanceKm < 0)
                throw new ArgumentException("Distance cannot be negative.", nameof(distanceKm));

            StoreName = storeName;
            DistanceKm = distanceKm;
            // City average 30 km/h → minutes = (km / 30) * 60, minimum 1 minute
            DriveMinutes = Math.Max(1, (int)Math.Round(distanceKm / 30.0 * 60.0));
        }
    }


    /// <summary>
    /// Per-item price detail at a specific store.
    /// </summary>
    public class ItemPriceDetail
    {
        public decimal Price { get; set; }
        public bool IsSpecial { get; set; }
        public string SpecialDetails { get; set; } = "";
        public string PackageSize { get; set; } = "";

        public ItemPriceDetail() { }

        public ItemPriceDetail(decimal price, bool isSpecial, string specialDetails, string packageSize)
        {
            Price = price;
            IsSpecial = isSpecial;
            SpecialDetails = specialDetails ?? "";
            PackageSize = packageSize ?? "";
        }
    }

    /// <summary>
    /// Cross-store price comparison for a single product.
    /// </summary>
    public class ItemPriceComparison
    {
        public string ProductName { get; set; } = "";
        public Dictionary<string, ItemPriceDetail> StorePrices { get; set; } = new();
        public string CheapestStore { get; set; } = "";

        public ItemPriceComparison() { }

        public ItemPriceComparison(string productName, Dictionary<string, ItemPriceDetail> storePrices)
        {
            ProductName = productName ?? "";
            StorePrices = storePrices ?? new();
            if (StorePrices.Any())
            {
                CheapestStore = StorePrices.OrderBy(kv => kv.Value.Price).First().Key;
            }
        }
    }

    /// <summary>
    /// Represents one of the 3 targeted recommendation categories.
    /// </summary>
    public class CategoryRecommendation
    {
        public string StoreName { get; set; } = "";
        public string CategoryName { get; set; } = "";
        public string MetricLabel { get; set; } = "";
        public string MetricValue { get; set; } = "";
        public string Explanation { get; set; } = "";
        public double DistanceKm { get; set; }
        public List<string> WinningProducts { get; set; } = new();
        public List<string> SpecialDiscounts { get; set; } = new();

        public CategoryRecommendation() { }

        public CategoryRecommendation(
            string storeName, 
            string categoryName, 
            string metricLabel, 
            string metricValue, 
            string explanation, 
            double distanceKm, 
            List<string> winningProducts, 
            List<string> specialDiscounts)
        {
            StoreName = storeName ?? "";
            CategoryName = categoryName ?? "";
            MetricLabel = metricLabel ?? "";
            MetricValue = metricValue ?? "";
            Explanation = explanation ?? "";
            DistanceKm = distanceKm;
            WinningProducts = winningProducts ?? new();
            SpecialDiscounts = specialDiscounts ?? new();
        }
    }

    /// <summary>
    /// Top-level output of the 6-phase recommendation engine returned by the API.
    /// </summary>
    public class StoreRecommendationResult
    {
        public List<RankedProduct> ProductRankings { get; private set; } = new();
        public List<StoreSavingsResult> TopByWeightedSavings { get; private set; } = new();
        public List<ProximityResult> TopByProximity { get; private set; } = new();
        public string TradeOffNarrative { get; private set; } = "";
        public List<ItemPriceComparison> ItemComparisons { get; private set; } = new();
        public CategoryRecommendation CheapestWeighted { get; private set; } = new();
        public CategoryRecommendation CheapestUnweighted { get; private set; } = new();
        public CategoryRecommendation NearestStore { get; private set; } = new();

        private StoreRecommendationResult() { }

        public StoreRecommendationResult(
            List<RankedProduct> productRankings,
            List<StoreSavingsResult> topByWeightedSavings,
            List<ProximityResult> topByProximity,
            string tradeOffNarrative,
            List<ItemPriceComparison>? itemComparisons = null,
            CategoryRecommendation? cheapestWeighted = null,
            CategoryRecommendation? cheapestUnweighted = null,
            CategoryRecommendation? nearestStore = null)
        {
            ProductRankings = productRankings ?? new();
            TopByWeightedSavings = topByWeightedSavings ?? new();
            TopByProximity = topByProximity ?? new();
            TradeOffNarrative = tradeOffNarrative ?? "";
            ItemComparisons = itemComparisons ?? new();
            CheapestWeighted = cheapestWeighted ?? new CategoryRecommendation();
            CheapestUnweighted = cheapestUnweighted ?? new CategoryRecommendation();
            NearestStore = nearestStore ?? new CategoryRecommendation();
        }
    }
}
