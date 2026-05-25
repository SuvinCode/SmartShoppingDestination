namespace backend.Models
{
    public class UserPreferences
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public double DistanceToColesKm { get; set; } = 5.0;
        public double DistanceToWoolworthsKm { get; set; } = 4.0;
        public decimal FuelCostPerKm { get; set; } = 0.15M; // $ per km
        public bool HasFlybuys { get; set; } = false;
        public bool HasEverydayRewards { get; set; } = false;
        public decimal MinSplitSavingThreshold { get; set; } = 5.00M; // only suggest split shop if it saves > $5
    }
}
