using System;
using System.Linq;
using backend.Models;

namespace backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(DocketDbContext context)
        {
            context.Database.EnsureCreated();

            if (context.CatalogItems.Any())
            {
                return; // DB already seeded
            }

            var items = new[]
            {
                // Pasta Category
                new CatalogItem { Store = "Coles", Name = "Coles Penne Pasta 500g", Category = "Pasta", ShelfPrice = 1.30M, NormalPrice = 1.30M, IsSpecial = false, SpecialDetails = "", PackageSize = "500g", UnitType = "g", UnitQuantity = 500, PricePer100Unit = 0.26M, OutOfStockProbability = 0.05 },
                new CatalogItem { Store = "Woolworths", Name = "Woolworths Penne Pasta 500g", Category = "Pasta", ShelfPrice = 1.30M, NormalPrice = 1.30M, IsSpecial = false, SpecialDetails = "", PackageSize = "500g", UnitType = "g", UnitQuantity = 500, PricePer100Unit = 0.26M, OutOfStockProbability = 0.02 },
                
                new CatalogItem { Store = "Coles", Name = "De Cecco Spaghetti 500g", Category = "Pasta", ShelfPrice = 4.50M, NormalPrice = 4.50M, IsSpecial = false, SpecialDetails = "", PackageSize = "500g", UnitType = "g", UnitQuantity = 500, PricePer100Unit = 0.90M, OutOfStockProbability = 0.01 },
                new CatalogItem { Store = "Woolworths", Name = "De Cecco Spaghetti 500g", Category = "Pasta", ShelfPrice = 4.80M, NormalPrice = 4.80M, IsSpecial = false, SpecialDetails = "", PackageSize = "500g", UnitType = "g", UnitQuantity = 500, PricePer100Unit = 0.96M, OutOfStockProbability = 0.01 },
                
                // Milk Category
                new CatalogItem { Store = "Coles", Name = "Coles Fresh Full Cream Milk 2L", Category = "Milk", ShelfPrice = 3.10M, NormalPrice = 3.10M, IsSpecial = false, SpecialDetails = "", PackageSize = "2L", UnitType = "ml", UnitQuantity = 2000, PricePer100Unit = 0.155M, OutOfStockProbability = 0.04 },
                new CatalogItem { Store = "Woolworths", Name = "Woolworths Full Cream Milk 2L", Category = "Milk", ShelfPrice = 3.10M, NormalPrice = 3.10M, IsSpecial = false, SpecialDetails = "", PackageSize = "2L", UnitType = "ml", UnitQuantity = 2000, PricePer100Unit = 0.155M, OutOfStockProbability = 0.03 },

                new CatalogItem { Store = "Coles", Name = "Devondale UHT Full Cream Milk 1L", Category = "Milk", ShelfPrice = 2.00M, NormalPrice = 2.40M, IsSpecial = true, SpecialDetails = "Save $0.40", PackageSize = "1L", UnitType = "ml", UnitQuantity = 1000, PricePer100Unit = 0.20M, OutOfStockProbability = 0.02 },
                new CatalogItem { Store = "Woolworths", Name = "Devondale UHT Full Cream Milk 1L", Category = "Milk", ShelfPrice = 2.40M, NormalPrice = 2.40M, IsSpecial = false, SpecialDetails = "", PackageSize = "1L", UnitType = "ml", UnitQuantity = 1000, PricePer100Unit = 0.24M, OutOfStockProbability = 0.05 },

                // Chocolate
                new CatalogItem { Store = "Coles", Name = "Cadbury Dairy Milk Chocolate Block 180g", Category = "Chocolate", ShelfPrice = 6.00M, NormalPrice = 6.00M, IsSpecial = false, SpecialDetails = "", PackageSize = "180g", UnitType = "g", UnitQuantity = 180, PricePer100Unit = 3.33M, OutOfStockProbability = 0.01 },
                new CatalogItem { Store = "Woolworths", Name = "Cadbury Dairy Milk Chocolate Block 180g", Category = "Chocolate", ShelfPrice = 3.00M, NormalPrice = 6.00M, IsSpecial = true, SpecialDetails = "1/2 Price Special", PackageSize = "180g", UnitType = "g", UnitQuantity = 180, PricePer100Unit = 1.67M, OutOfStockProbability = 0.15 },

                // Beans
                new CatalogItem { Store = "Coles", Name = "Heinz Baked Beans 220g", Category = "Beans", ShelfPrice = 2.50M, NormalPrice = 2.50M, IsSpecial = false, SpecialDetails = "3 for $7.50", PackageSize = "220g", UnitType = "g", UnitQuantity = 220, PricePer100Unit = 1.14M, OutOfStockProbability = 0.03 },
                new CatalogItem { Store = "Woolworths", Name = "Heinz Baked Beans 220g", Category = "Beans", ShelfPrice = 2.20M, NormalPrice = 2.20M, IsSpecial = false, SpecialDetails = "", PackageSize = "220g", UnitType = "g", UnitQuantity = 220, PricePer100Unit = 1.00M, OutOfStockProbability = 0.02 },

                // Dishwasher liquid
                new CatalogItem { Store = "Coles", Name = "Morning Fresh Dishwashing Liquid 900ml", Category = "Dishwashing", ShelfPrice = 5.50M, NormalPrice = 9.50M, IsSpecial = true, SpecialDetails = "Save $4.00", PackageSize = "900ml", UnitType = "ml", UnitQuantity = 900, PricePer100Unit = 0.61M, OutOfStockProbability = 0.06 },
                new CatalogItem { Store = "Woolworths", Name = "Morning Fresh Dishwashing Liquid 900ml", Category = "Dishwashing", ShelfPrice = 9.50M, NormalPrice = 9.50M, IsSpecial = false, SpecialDetails = "", PackageSize = "900ml", UnitType = "ml", UnitQuantity = 900, PricePer100Unit = 1.06M, OutOfStockProbability = 0.02 },

                // Ice Cream
                new CatalogItem { Store = "Coles", Name = "Bulla Cream Classic Vanilla Ice Cream 2L", Category = "Ice Cream", ShelfPrice = 9.00M, NormalPrice = 9.00M, IsSpecial = false, SpecialDetails = "", PackageSize = "2L", UnitType = "ml", UnitQuantity = 2000, PricePer100Unit = 0.45M, OutOfStockProbability = 0.02 },
                new CatalogItem { Store = "Woolworths", Name = "Bulla Cream Classic Vanilla Ice Cream 2L", Category = "Ice Cream", ShelfPrice = 8.50M, NormalPrice = 9.00M, IsSpecial = true, SpecialDetails = "Save $0.50", PackageSize = "2L", UnitType = "ml", UnitQuantity = 2000, PricePer100Unit = 0.425M, OutOfStockProbability = 0.04 },

                // Bread
                new CatalogItem { Store = "Coles", Name = "Coles White Toast Bread 650g", Category = "Bread", ShelfPrice = 2.70M, NormalPrice = 2.70M, IsSpecial = false, SpecialDetails = "", PackageSize = "650g", UnitType = "g", UnitQuantity = 650, PricePer100Unit = 0.415M, OutOfStockProbability = 0.03 },
                new CatalogItem { Store = "Woolworths", Name = "Woolworths White Toast Bread 650g", Category = "Bread", ShelfPrice = 2.70M, NormalPrice = 2.70M, IsSpecial = false, SpecialDetails = "", PackageSize = "650g", UnitType = "g", UnitQuantity = 650, PricePer100Unit = 0.415M, OutOfStockProbability = 0.04 },

                new CatalogItem { Store = "Coles", Name = "Helga's Traditional Wholemeal Bread 750g", Category = "Bread", ShelfPrice = 4.90M, NormalPrice = 4.90M, IsSpecial = false, SpecialDetails = "", PackageSize = "750g", UnitType = "g", UnitQuantity = 750, PricePer100Unit = 0.65M, OutOfStockProbability = 0.02 },
                new CatalogItem { Store = "Woolworths", Name = "Helga's Traditional Wholemeal Bread 750g", Category = "Bread", ShelfPrice = 3.50M, NormalPrice = 4.90M, IsSpecial = true, SpecialDetails = "Save $1.40", PackageSize = "750g", UnitType = "g", UnitQuantity = 750, PricePer100Unit = 0.467M, OutOfStockProbability = 0.08 },

                // Butter
                new CatalogItem { Store = "Coles", Name = "Western Star Butter Block Salted 250g", Category = "Butter", ShelfPrice = 4.50M, NormalPrice = 5.20M, IsSpecial = true, SpecialDetails = "Save $0.70", PackageSize = "250g", UnitType = "g", UnitQuantity = 250, PricePer100Unit = 1.80M, OutOfStockProbability = 0.03 },
                new CatalogItem { Store = "Woolworths", Name = "Western Star Butter Block Salted 250g", Category = "Butter", ShelfPrice = 5.20M, NormalPrice = 5.20M, IsSpecial = false, SpecialDetails = "", PackageSize = "250g", UnitType = "g", UnitQuantity = 250, PricePer100Unit = 2.08M, OutOfStockProbability = 0.01 },

                // Cheese
                new CatalogItem { Store = "Coles", Name = "Bega Tasty Cheese Block 500g", Category = "Cheese", ShelfPrice = 8.50M, NormalPrice = 9.50M, IsSpecial = true, SpecialDetails = "Save $1.00", PackageSize = "500g", UnitType = "g", UnitQuantity = 500, PricePer100Unit = 1.70M, OutOfStockProbability = 0.04 },
                new CatalogItem { Store = "Woolworths", Name = "Bega Tasty Cheese Block 500g", Category = "Cheese", ShelfPrice = 9.50M, NormalPrice = 9.50M, IsSpecial = false, SpecialDetails = "", PackageSize = "500g", UnitType = "g", UnitQuantity = 500, PricePer100Unit = 1.90M, OutOfStockProbability = 0.02 },

                // Fresh Produce
                new CatalogItem { Store = "Coles", Name = "Australian Red Gala Apples 1kg", Category = "Produce", ShelfPrice = 4.50M, NormalPrice = 4.50M, IsSpecial = false, SpecialDetails = "", PackageSize = "1kg", UnitType = "g", UnitQuantity = 1000, PricePer100Unit = 0.45M, OutOfStockProbability = 0.02 },
                new CatalogItem { Store = "Woolworths", Name = "Australian Red Gala Apples 1kg", Category = "Produce", ShelfPrice = 4.20M, NormalPrice = 4.20M, IsSpecial = false, SpecialDetails = "", PackageSize = "1kg", UnitType = "g", UnitQuantity = 1000, PricePer100Unit = 0.42M, OutOfStockProbability = 0.03 },

                new CatalogItem { Store = "Coles", Name = "Cavendish Bananas 1kg", Category = "Produce", ShelfPrice = 3.90M, NormalPrice = 3.90M, IsSpecial = false, SpecialDetails = "", PackageSize = "1kg", UnitType = "g", UnitQuantity = 1000, PricePer100Unit = 0.39M, OutOfStockProbability = 0.01 },
                new CatalogItem { Store = "Woolworths", Name = "Cavendish Bananas 1kg", Category = "Produce", ShelfPrice = 3.90M, NormalPrice = 3.90M, IsSpecial = false, SpecialDetails = "", PackageSize = "1kg", UnitType = "g", UnitQuantity = 1000, PricePer100Unit = 0.39M, OutOfStockProbability = 0.02 },
            };

            context.CatalogItems.AddRange(items);

            // Seed default User preferences and saving log for a demo user
            var demoUser = new User { Username = "demo", Email = "demo@docket.com", PasswordHash = "password" };
            context.Users.Add(demoUser);
            context.SaveChanges(); // Save to generate demoUser.Id

            var demoPrefs = new UserPreferences
            {
                UserId = demoUser.Id,
                DistanceToColesKm = 3.5,
                DistanceToWoolworthsKm = 2.0,
                FuelCostPerKm = 0.18M,
                HasFlybuys = true,
                HasEverydayRewards = true,
                MinSplitSavingThreshold = 3.00M
            };
            context.UserPreferences.Add(demoPrefs);

            var logs = new[]
            {
                new SavingLog { UserId = demoUser.Id, Date = DateTime.UtcNow.AddDays(-28), StorePicked = "Woolworths", AmountSaved = 12.40M, TotalSpent = 85.20M },
                new SavingLog { UserId = demoUser.Id, Date = DateTime.UtcNow.AddDays(-21), StorePicked = "Coles", AmountSaved = 8.50M, TotalSpent = 74.10M },
                new SavingLog { UserId = demoUser.Id, Date = DateTime.UtcNow.AddDays(-14), StorePicked = "Split Shop", AmountSaved = 21.60M, TotalSpent = 112.30M },
                new SavingLog { UserId = demoUser.Id, Date = DateTime.UtcNow.AddDays(-7), StorePicked = "Woolworths", AmountSaved = 14.80M, TotalSpent = 92.50M },
                new SavingLog { UserId = demoUser.Id, Date = DateTime.UtcNow.AddDays(-1), StorePicked = "Split Shop", AmountSaved = 18.20M, TotalSpent = 88.40M }
            };
            context.SavingLogs.AddRange(logs);

            // Seed usual default shopping list
            var usualList = new[]
            {
                new ShoppingListItem { UserId = demoUser.Id, ItemName = "Pasta", Quantity = 1, IsCompleted = false, PackageSize = "500g" },
                new ShoppingListItem { UserId = demoUser.Id, ItemName = "Milk", Quantity = 2, IsCompleted = false, PackageSize = "2L" },
                new ShoppingListItem { UserId = demoUser.Id, ItemName = "Chocolate", Quantity = 1, IsCompleted = false, PackageSize = "180g" },
                new ShoppingListItem { UserId = demoUser.Id, ItemName = "Beans", Quantity = 3, IsCompleted = false, PackageSize = "220g" }
            };
            context.ShoppingListItems.AddRange(usualList);

            context.SaveChanges();
        }
    }
}
