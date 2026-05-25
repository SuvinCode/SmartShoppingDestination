namespace backend.Models
{
    public class CatalogItem
    {
        public int Id { get; set; }
        public string Store { get; set; } = ""; // "Coles" or "Woolworths"
        public string Name { get; set; } = ""; // e.g. "Coles Penne Pasta 500g"
        public string Category { get; set; } = ""; // e.g. "Pasta", "Milk", "Chocolate"
        public decimal ShelfPrice { get; set; } // Current price (incorporates special if active)
        public decimal NormalPrice { get; set; } // Non-special price
        public bool IsSpecial { get; set; }
        public string SpecialDetails { get; set; } = ""; // e.g. "1/2 Price", "2 for $5"
        public string PackageSize { get; set; } = ""; // e.g. "500g", "2L"
        public string UnitType { get; set; } = ""; // "g", "ml", "count"
        public double UnitQuantity { get; set; } // e.g. 500, 2000, 1
        public decimal PricePer100Unit { get; set; } // Normalized price (e.g. price per 100g)
        public double OutOfStockProbability { get; set; } // e.g. 0.05 (5% chance of out-of-stock)
    }
}
