using System;

namespace backend.Models
{
    public class UserPreferences
    {
        public int Id { get; private set; }
        public int UserId { get; private set; }
        public double DistanceToColesKm { get; private set; } = 5.0;
        public double DistanceToWoolworthsKm { get; private set; } = 4.0;
        public decimal FuelCostPerKm { get; private set; } = 0.15M; // $ per km
        public bool HasFlybuys { get; private set; } = false;
        public bool HasEverydayRewards { get; private set; } = false;
        public decimal MinSplitSavingThreshold { get; private set; } = 5.00M; // only suggest split shop if it saves > $5

        private UserPreferences() { } // For EF Core

        public UserPreferences(int userId)
        {
            if (userId <= 0)
                throw new ArgumentException("UserId must be positive", nameof(userId));
            UserId = userId;
        }

        public void UpdatePreferences(double distanceColes, double distanceWoolies, decimal fuelCost, bool hasFlybuys, bool hasRewards, decimal minSplitSaving)
        {
            if (distanceColes < 0 || distanceWoolies < 0)
                throw new ArgumentException("Distance cannot be negative");
            if (fuelCost < 0)
                throw new ArgumentException("Fuel cost cannot be negative");
            if (minSplitSaving < 0)
                throw new ArgumentException("Saving threshold cannot be negative");

            DistanceToColesKm = distanceColes;
            DistanceToWoolworthsKm = distanceWoolies;
            FuelCostPerKm = fuelCost;
            HasFlybuys = hasFlybuys;
            HasEverydayRewards = hasRewards;
            MinSplitSavingThreshold = minSplitSaving;
        }

        public decimal CalculateColesTravelCost()
        {
            return (decimal)(DistanceToColesKm * 2.0) * FuelCostPerKm;
        }

        public decimal CalculateWoolworthsTravelCost()
        {
            return (decimal)(DistanceToWoolworthsKm * 2.0) * FuelCostPerKm;
        }

        public decimal CalculateSplitTravelCost()
        {
            return (decimal)((DistanceToColesKm * 2.0) + (DistanceToWoolworthsKm * 2.0)) * FuelCostPerKm;
        }

        public decimal CalculateColesRewards(decimal shelfTotal, int specialCount)
        {
            if (!HasFlybuys) return 0M;
            decimal baseRewards = shelfTotal * 0.005M;
            decimal specialBonus = specialCount * 0.25M;
            return baseRewards + specialBonus;
        }

        public decimal CalculateWoolworthsRewards(decimal shelfTotal, int specialCount)
        {
            if (!HasEverydayRewards) return 0M;
            decimal baseRewards = shelfTotal * 0.005M;
            decimal specialBonus = specialCount * 0.25M;
            return baseRewards + specialBonus;
        }
    }
}
