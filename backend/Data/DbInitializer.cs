using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
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

            // Attempt to seed from catalog_seed.json if present
            var itemsList = new List<CatalogItem>();
            string seedPath = "catalog_seed.json";
            if (!File.Exists(seedPath))
            {
                seedPath = Path.Combine("backend", "catalog_seed.json");
            }

            if (File.Exists(seedPath))
            {
                try
                {
                    string json = File.ReadAllText(seedPath);
                    var rawItems = JsonSerializer.Deserialize<List<SeedCatalogItemDto>>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (rawItems != null && rawItems.Any())
                    {
                        foreach (var r in rawItems)
                        {
                            itemsList.Add(new CatalogItem(
                                r.Store ?? "Coles",
                                r.Name ?? "",
                                r.Category ?? "Groceries",
                                r.ShelfPrice,
                                r.NormalPrice,
                                r.IsSpecial,
                                r.SpecialDetails ?? "",
                                r.PackageSize ?? "",
                                r.UnitType ?? "g",
                                r.UnitQuantity > 0 ? r.UnitQuantity : 1.0,
                                r.OutOfStockProbability
                            ));
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error reading catalog_seed.json: {ex.Message}. Falling back to default seeding.");
                }
            }

            // Fallback to hardcoded seeding if no file found or parsed
            if (!itemsList.Any())
            {
                var fallbackItems = new[]
                {
                    // Pasta Category (store, name, category, shelfPrice, normalPrice, isSpecial, specialDetails, packageSize, unitType, unitQuantity, outOfStockProbability)
                    new CatalogItem("Coles", "Coles Penne Pasta 500g", "Pasta", 1.30M, 1.30M, false, "", "500g", "g", 500, 0.05),
                    new CatalogItem("Woolworths", "Woolworths Penne Pasta 500g", "Pasta", 1.30M, 1.30M, false, "", "500g", "g", 500, 0.02),
                    
                    new CatalogItem("Coles", "De Cecco Spaghetti 500g", "Pasta", 4.50M, 4.50M, false, "", "500g", "g", 500, 0.01),
                    new CatalogItem("Woolworths", "De Cecco Spaghetti 500g", "Pasta", 4.80M, 4.80M, false, "", "500g", "g", 500, 0.01),
                    
                    // Milk Category
                    new CatalogItem("Coles", "Coles Fresh Full Cream Milk 2L", "Milk", 3.10M, 3.10M, false, "", "2L", "ml", 2000, 0.04),
                    new CatalogItem("Woolworths", "Woolworths Full Cream Milk 2L", "Milk", 3.10M, 3.10M, false, "", "2L", "ml", 2000, 0.03),

                    new CatalogItem("Coles", "Devondale UHT Full Cream Milk 1L", "Milk", 2.00M, 2.40M, true, "Save $0.40", "1L", "ml", 1000, 0.02),
                    new CatalogItem("Woolworths", "Devondale UHT Full Cream Milk 1L", "Milk", 2.40M, 2.40M, false, "", "1L", "ml", 1000, 0.05),

                    // Chocolate
                    new CatalogItem("Coles", "Cadbury Dairy Milk Chocolate Block 180g", "Chocolate", 6.00M, 6.00M, false, "", "180g", "g", 180, 0.01),
                    new CatalogItem("Woolworths", "Cadbury Dairy Milk Chocolate Block 180g", "Chocolate", 3.00M, 6.00M, true, "1/2 Price Special", "180g", "g", 180, 0.15),

                    // Beans
                    new CatalogItem("Coles", "Heinz Baked Beans 220g", "Beans", 2.50M, 2.50M, false, "3 for $7.50", "220g", "g", 220, 0.03),
                    new CatalogItem("Woolworths", "Heinz Baked Beans 220g", "Beans", 2.20M, 2.20M, false, "", "220g", "g", 220, 0.02),

                    // Dishwasher liquid
                    new CatalogItem("Coles", "Morning Fresh Dishwashing Liquid 900ml", "Dishwashing", 5.50M, 9.50M, true, "Save $4.00", "900ml", "ml", 900, 0.06),
                    new CatalogItem("Woolworths", "Morning Fresh Dishwashing Liquid 900ml", "Dishwashing", 9.50M, 9.50M, false, "", "900ml", "ml", 900, 0.02),

                    // Ice Cream
                    new CatalogItem("Coles", "Bulla Cream Classic Vanilla Ice Cream 2L", "Ice Cream", 9.00M, 9.00M, false, "", "2L", "ml", 2000, 0.02),
                    new CatalogItem("Woolworths", "Bulla Cream Classic Vanilla Ice Cream 2L", "Ice Cream", 8.50M, 9.00M, true, "Save $0.50", "2L", "ml", 2000, 0.04),

                    // Bread
                    new CatalogItem("Coles", "Coles White Toast Bread 650g", "Bread", 2.70M, 2.70M, false, "", "650g", "g", 650, 0.03),
                    new CatalogItem("Woolworths", "Woolworths White Toast Bread 650g", "Bread", 2.70M, 2.70M, false, "", "650g", "g", 650, 0.04),

                    new CatalogItem("Coles", "Helga's Traditional Wholemeal Bread 750g", "Bread", 4.90M, 4.90M, false, "", "750g", "g", 750, 0.02),
                    new CatalogItem("Woolworths", "Helga's Traditional Wholemeal Bread 750g", "Bread", 3.50M, 4.90M, true, "Save $1.40", "750g", "g", 750, 0.08),

                    // Butter
                    new CatalogItem("Coles", "Western Star Butter Block Salted 250g", "Butter", 4.50M, 5.20M, true, "Save $0.70", "250g", "g", 250, 0.03),
                    new CatalogItem("Woolworths", "Western Star Butter Block Salted 250g", "Butter", 5.20M, 5.20M, false, "", "250g", "g", 250, 0.01),

                    // Cheese
                    new CatalogItem("Coles", "Bega Tasty Cheese Block 500g", "Cheese", 8.50M, 9.50M, true, "Save $1.00", "500g", "g", 500, 0.04),
                    new CatalogItem("Woolworths", "Bega Tasty Cheese Block 500g", "Cheese", 9.50M, 9.50M, false, "", "500g", "g", 500, 0.02),

                    // Fresh Produce
                    new CatalogItem("Coles", "Australian Red Gala Apples 1kg", "Produce", 4.50M, 4.50M, false, "", "1kg", "g", 1000, 0.02),
                    new CatalogItem("Woolworths", "Australian Red Gala Apples 1kg", "Produce", 4.20M, 4.20M, false, "", "1kg", "g", 1000, 0.03),

                    new CatalogItem("Coles", "Cavendish Bananas 1kg", "Produce", 3.90M, 3.90M, false, "", "1kg", "g", 1000, 0.01),
                    new CatalogItem("Woolworths", "Cavendish Bananas 1kg", "Produce", 3.90M, 3.90M, false, "", "1kg", "g", 1000, 0.02),

                    // ── Aldi Catalog ────────────────────────────────────────────────────────
                    new CatalogItem("Aldi", "Farmdale Full Cream Milk 2L", "Milk", 2.49M, 2.49M, false, "", "2L", "ml", 2000, 0.03),
                    new CatalogItem("Aldi", "Aldi White Bread 650g", "Bread", 1.99M, 1.99M, false, "", "650g", "g", 650, 0.03),
                    new CatalogItem("Aldi", "Burwood Park Cheese Block 500g", "Cheese", 5.99M, 5.99M, false, "", "500g", "g", 500, 0.02),
                    new CatalogItem("Aldi", "Aldi Penne Pasta 500g", "Pasta", 0.99M, 0.99M, false, "", "500g", "g", 500, 0.02),
                    new CatalogItem("Aldi", "Choceur Milk Chocolate 200g", "Chocolate", 1.79M, 1.79M, false, "", "200g", "g", 200, 0.02),
                    new CatalogItem("Aldi", "Farmdale Butter Block Salted 250g", "Butter", 3.49M, 3.49M, false, "", "250g", "g", 250, 0.02),
                    new CatalogItem("Aldi", "Mitsol Dishwashing Liquid 750ml", "Dishwashing", 1.99M, 1.99M, false, "", "750ml", "ml", 750, 0.03),
                    new CatalogItem("Aldi", "Diplomat Gala Apples 1kg", "Produce", 3.49M, 3.49M, false, "", "1kg", "g", 1000, 0.03),
                    new CatalogItem("Aldi", "Cavendish Bananas 1kg", "Produce", 3.49M, 3.49M, false, "", "1kg", "g", 1000, 0.02),
                    new CatalogItem("Aldi", "Baked Beans 220g", "Beans", 1.29M, 1.29M, false, "", "220g", "g", 220, 0.02),

                    // ── IGA Catalog ─────────────────────────────────────────────────────────
                    new CatalogItem("IGA", "IGA Fresh Full Cream Milk 2L", "Milk", 3.40M, 3.40M, false, "", "2L", "ml", 2000, 0.05),
                    new CatalogItem("IGA", "IGA White Bread 650g", "Bread", 2.90M, 3.50M, true, "Save $0.60", "650g", "g", 650, 0.04),
                    new CatalogItem("IGA", "IGA Tasty Cheese Block 500g", "Cheese", 8.99M, 8.99M, false, "", "500g", "g", 500, 0.04),
                    new CatalogItem("IGA", "IGA Penne Pasta 500g", "Pasta", 1.60M, 1.60M, false, "", "500g", "g", 500, 0.03),
                    new CatalogItem("IGA", "Cadbury Dairy Milk Chocolate Block 180g", "Chocolate", 5.50M, 6.00M, true, "Save $0.50", "180g", "g", 180, 0.04),
                    new CatalogItem("IGA", "IGA Butter Block Salted 250g", "Butter", 5.50M, 5.50M, false, "", "250g", "g", 250, 0.03),
                    new CatalogItem("IGA", "Morning Fresh Dishwashing Liquid 900ml", "Dishwashing", 8.50M, 9.50M, true, "Save $1.00", "900ml", "ml", 900, 0.03),
                    new CatalogItem("IGA", "Red Gala Apples 1kg", "Produce", 4.80M, 4.80M, false, "", "1kg", "g", 1000, 0.04),
                    new CatalogItem("IGA", "Cavendish Bananas 1kg", "Produce", 4.00M, 4.00M, false, "", "1kg", "g", 1000, 0.03),
                    new CatalogItem("IGA", "Heinz Baked Beans 220g", "Beans", 2.70M, 2.70M, false, "", "220g", "g", 220, 0.03),

                    // ── Costco Catalog ──────────────────────────────────────────────────────
                    new CatalogItem("Costco", "Kirkland Full Cream Milk 3L", "Milk", 4.99M, 4.99M, false, "", "3L", "ml", 3000, 0.02),
                    new CatalogItem("Costco", "Costco White Bread 2-pack 650g", "Bread", 4.49M, 4.49M, false, "", "1300g", "g", 1300, 0.02),
                    new CatalogItem("Costco", "Kirkland Tasty Cheese Block 1kg", "Cheese", 12.99M, 12.99M, false, "", "1kg", "g", 1000, 0.01),
                    new CatalogItem("Costco", "Costco Penne Pasta 5kg", "Pasta", 7.99M, 7.99M, false, "", "5kg", "g", 5000, 0.01),
                    new CatalogItem("Costco", "Kirkland Milk Chocolate 1kg", "Chocolate", 12.99M, 12.99M, false, "", "1kg", "g", 1000, 0.02),
                    new CatalogItem("Costco", "Kirkland Butter Block Salted 1kg", "Butter", 15.99M, 15.99M, false, "", "1kg", "g", 1000, 0.01),
                    new CatalogItem("Costco", "Morning Fresh Dishwashing Liquid 4-pack 900ml", "Dishwashing", 28.99M, 28.99M, false, "", "3600ml", "ml", 3600, 0.01),
                    new CatalogItem("Costco", "Kirkland Organic Apples 3kg", "Produce", 10.99M, 10.99M, false, "", "3kg", "g", 3000, 0.02),
                    new CatalogItem("Costco", "Kirkland Baked Beans 12-pack", "Beans", 18.99M, 18.99M, false, "", "2640g", "g", 2640, 0.01),
                };
                itemsList.AddRange(fallbackItems);
            }

            context.CatalogItems.AddRange(itemsList);
            SeedUsersAndLogs(context);
        }

        private static void SeedUsersAndLogs(DocketDbContext context)
        {
            // Seed default User preferences and saving log for a demo user
            var demoUser = new User("demo", "demo@docket.com", "password");
            context.Users.Add(demoUser);
            context.SaveChanges(); // Save to generate demoUser.Id

            var demoPrefs = new UserPreferences(demoUser.Id);
            demoPrefs.UpdatePreferences(3.5, 2.0, 0.18M, true, true, 3.00M);
            context.UserPreferences.Add(demoPrefs);

            var logs = new[]
            {
                new SavingLog(demoUser.Id, "Woolworths", 12.40M, 85.20M, DateTime.UtcNow.AddDays(-28)),
                new SavingLog(demoUser.Id, "Coles", 8.50M, 74.10M, DateTime.UtcNow.AddDays(-21)),
                new SavingLog(demoUser.Id, "Coles", 21.60M, 112.30M, DateTime.UtcNow.AddDays(-14)),
                new SavingLog(demoUser.Id, "Woolworths", 14.80M, 92.50M, DateTime.UtcNow.AddDays(-7)),
                new SavingLog(demoUser.Id, "Woolworths", 18.20M, 88.40M, DateTime.UtcNow.AddDays(-1))
            };
            context.SavingLogs.AddRange(logs);

            // Do not seed active list items - list must start completely empty
            context.SaveChanges();
        }

        private class SeedCatalogItemDto
        {
            public string Store { get; set; } = "";
            public string Name { get; set; } = "";
            public string Category { get; set; } = "";
            public decimal ShelfPrice { get; set; }
            public decimal NormalPrice { get; set; }
            public bool IsSpecial { get; set; }
            public string SpecialDetails { get; set; } = "";
            public string PackageSize { get; set; } = "";
            public string UnitType { get; set; } = "";
            public double UnitQuantity { get; set; }
            public double OutOfStockProbability { get; set; }
        }
    }
}
