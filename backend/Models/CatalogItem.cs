using System;

namespace backend.Models
{
    public class CatalogItem
    {
        public int Id { get; private set; }
        public string Store { get; private set; } = ""; // "Coles", "Woolworths", "Aldi", "IGA", or "Costco"
        public string Name { get; private set; } = ""; // e.g. "Coles Penne Pasta 500g"
        public string Category { get; private set; } = ""; // e.g. "Pasta", "Milk", "Chocolate"
        public decimal ShelfPrice { get; private set; } // Current price (incorporates special if active)
        public decimal NormalPrice { get; private set; } // Non-special price
        public bool IsSpecial { get; private set; }
        public string SpecialDetails { get; private set; } = ""; // e.g. "1/2 Price", "2 for $5"
        public string PackageSize { get; private set; } = ""; // e.g. "500g", "2L"
        public string UnitType { get; private set; } = ""; // "g", "ml", "count"
        public double UnitQuantity { get; private set; } // e.g. 500, 2000, 1
        public decimal PricePer100Unit { get; private set; } // Normalized price (e.g. price per 100g)
        public double OutOfStockProbability { get; private set; } // e.g. 0.05 (5% chance of out-of-stock)

        private CatalogItem() { } // For EF Core

        public CatalogItem(string store, string name, string category, decimal shelfPrice, decimal normalPrice, bool isSpecial, string specialDetails, string packageSize, string unitType, double unitQuantity, double outOfStockProbability)
        {
            var validStores = new[] { "Coles", "Woolworths", "Aldi", "IGA", "Costco" };
            if (string.IsNullOrWhiteSpace(store) || !Array.Exists(validStores, s => s == store))
                throw new ArgumentException("Store must be one of: Coles, Woolworths, Aldi, IGA, Costco", nameof(store));
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Item name cannot be empty", nameof(name));
            if (shelfPrice < 0 || normalPrice < 0)
                throw new ArgumentException("Price cannot be negative");
            if (outOfStockProbability < 0 || outOfStockProbability > 1.0)
                throw new ArgumentException("Out-of-stock probability must be between 0 and 1");

            Store = store;
            Name = name;
            Category = category;
            ShelfPrice = shelfPrice;
            NormalPrice = normalPrice;
            IsSpecial = isSpecial;
            SpecialDetails = specialDetails;
            PackageSize = packageSize;
            UnitType = unitType;
            UnitQuantity = unitQuantity > 0 ? unitQuantity : 1.0;
            OutOfStockProbability = outOfStockProbability;
            PricePer100Unit = CalculatePricePer100();
        }

        public void UpdatePrice(decimal shelfPrice, decimal normalPrice)
        {
            if (shelfPrice < 0 || normalPrice < 0)
                throw new ArgumentException("Price cannot be negative");

            ShelfPrice = shelfPrice;
            NormalPrice = normalPrice;
            PricePer100Unit = CalculatePricePer100();
        }

        public void SetSpecial(bool isSpecial, string details)
        {
            IsSpecial = isSpecial;
            SpecialDetails = details ?? "";
        }

        private decimal CalculatePricePer100()
        {
            if (UnitQuantity <= 0) return ShelfPrice;
            return (ShelfPrice / (decimal)UnitQuantity) * 100M;
        }
    }
}
