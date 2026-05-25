using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using backend.Data;
using backend.Models;
using backend.Services;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ListsController : ControllerBase
    {
        private readonly DocketDbContext _context;
        private readonly ComparisonEngine _comparisonEngine;
        private readonly PythonAIServiceClient _aiClient;

        public ListsController(DocketDbContext context, ComparisonEngine comparisonEngine, PythonAIServiceClient aiClient)
        {
            _context = context;
            _comparisonEngine = comparisonEngine;
            _aiClient = aiClient;
        }

        [HttpGet]
        public IActionResult GetList([FromQuery] int userId)
        {
            var list = _context.ShoppingListItems.Where(i => i.UserId == userId).ToList();
            return Ok(list);
        }

        [HttpPost]
        public IActionResult AddItem([FromBody] ShoppingListItem item)
        {
            // Clean name from store branding
            string genericName = item.ItemName;
            if (genericName.StartsWith("Coles ", StringComparison.OrdinalIgnoreCase))
                genericName = genericName.Substring(6);
            else if (genericName.StartsWith("Woolworths ", StringComparison.OrdinalIgnoreCase))
                genericName = genericName.Substring(11);
            else if (genericName.StartsWith("WW ", StringComparison.OrdinalIgnoreCase))
                genericName = genericName.Substring(3);
                
            item.ItemName = genericName;
            
            // Try to auto-resolve packagesize
            var match = _context.CatalogItems.FirstOrDefault(c => c.Name.ToLower().Contains(item.ItemName.ToLower()));
            if (match != null)
            {
                item.PackageSize = match.PackageSize;
            }

            _context.ShoppingListItems.Add(item);
            _context.SaveChanges();
            return Ok(item);
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteItem(int id)
        {
            var item = _context.ShoppingListItems.Find(id);
            if (item == null) return NotFound();

            _context.ShoppingListItems.Remove(item);
            _context.SaveChanges();
            return Ok(new { message = "Item deleted" });
        }

        [HttpPost("clear")]
        public IActionResult ClearList([FromQuery] int userId)
        {
            var items = _context.ShoppingListItems.Where(i => i.UserId == userId).ToList();
            _context.ShoppingListItems.RemoveRange(items);
            _context.SaveChanges();
            return Ok(new { message = "List cleared" });
        }

        [HttpPost("sync-loyalty")]
        public IActionResult SyncLoyalty([FromQuery] int userId)
        {
            // Clear current list and pre-populate with Flybuys/Everyday Rewards history
            var currentItems = _context.ShoppingListItems.Where(i => i.UserId == userId).ToList();
            _context.ShoppingListItems.RemoveRange(currentItems);

            var usualItems = new[]
            {
                new ShoppingListItem { UserId = userId, ItemName = "White Toast Bread", Quantity = 1, PackageSize = "650g" },
                new ShoppingListItem { UserId = userId, ItemName = "Full Cream Milk", Quantity = 2, PackageSize = "2L" },
                new ShoppingListItem { UserId = userId, ItemName = "Bega Tasty Cheese Block", Quantity = 1, PackageSize = "500g" },
                new ShoppingListItem { UserId = userId, ItemName = "Cavendish Bananas", Quantity = 1, PackageSize = "1kg" }
            };

            _context.ShoppingListItems.AddRange(usualItems);
            _context.SaveChanges();

            return Ok(usualItems);
        }

        [HttpPost("upload-receipt")]
        public async Task<IActionResult> UploadReceipt([FromForm] IFormFile file, [FromQuery] int userId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            using var stream = file.OpenReadStream();
            
            // 1. Call Python AI OCR service
            var ocrResult = await _aiClient.ExtractReceiptItemsAsync(stream, file.FileName);
            
            // 2. Map OCR raw item names to database catalog items using python fuzzy matcher
            var matchedItems = new List<ShoppingListItem>();
            
            // Get all generic candidates from DB to send for fuzzy matching
            var dbCandidates = _context.CatalogItems
                .Select(i => new { i.Id, i.Name })
                .ToList()
                .Select(i => {
                    // strip brand
                    string name = i.Name
                        .Replace("Coles ", "", StringComparison.OrdinalIgnoreCase)
                        .Replace("Woolworths ", "", StringComparison.OrdinalIgnoreCase)
                        .Replace("WW ", "", StringComparison.OrdinalIgnoreCase);
                    return new CatalogItemCandidate { Id = i.Id, Name = name };
                })
                .GroupBy(c => c.Name.ToLower())
                .Select(g => g.First())
                .ToList();

            foreach (var ocrItem in ocrResult.Items)
            {
                // Call python matcher
                var matchResult = await _aiClient.MatchCatalogItemAsync(ocrItem.RawName, dbCandidates);
                string genericName = ocrItem.RawName;
                
                if (matchResult.Matches != null && matchResult.Matches.Any())
                {
                    // Use the top matched catalog candidate name
                    genericName = matchResult.Matches.First().Candidate.Name;
                }

                var newItem = new ShoppingListItem
                {
                    UserId = userId,
                    ItemName = genericName,
                    Quantity = ocrItem.Quantity,
                    PackageSize = "" 
                };
                
                // Fetch package size from db if available
                var dbMatch = _context.CatalogItems.FirstOrDefault(c => c.Name.ToLower().Contains(genericName.ToLower()));
                if (dbMatch != null)
                {
                    newItem.PackageSize = dbMatch.PackageSize;
                }
                
                matchedItems.Add(newItem);
            }

            if (matchedItems.Any())
            {
                // Clear active list first (replacing with imported list)
                var activeList = _context.ShoppingListItems.Where(i => i.UserId == userId).ToList();
                _context.ShoppingListItems.RemoveRange(activeList);
                
                _context.ShoppingListItems.AddRange(matchedItems);
                _context.SaveChanges();
            }

            return Ok(new { store = ocrResult.StoreDetected, rawText = ocrResult.RawText, items = matchedItems });
        }

        [HttpPost("compare")]
        public IActionResult Compare([FromQuery] int userId)
        {
            var listItems = _context.ShoppingListItems.Where(i => i.UserId == userId).ToList();
            var prefs = _context.UserPreferences.FirstOrDefault(p => p.UserId == userId);
            
            if (prefs == null)
            {
                prefs = new UserPreferences { UserId = userId };
                _context.UserPreferences.Add(prefs);
                _context.SaveChanges();
            }

            if (!listItems.Any())
            {
                return BadRequest("Shopping list is empty.");
            }

            var comparison = _comparisonEngine.CompareList(listItems, prefs);
            return Ok(comparison);
        }

        [HttpPost("checkout")]
        public IActionResult Checkout([FromQuery] int userId, [FromBody] CheckoutRequest request)
        {
            // Log saving in database
            var log = new SavingLog
            {
                UserId = userId,
                StorePicked = request.StorePicked,
                AmountSaved = request.AmountSaved,
                TotalSpent = request.TotalSpent,
                Date = DateTime.UtcNow
            };

            _context.SavingLogs.Add(log);
            
            // Clear shopping list after checkout
            var listItems = _context.ShoppingListItems.Where(i => i.UserId == userId).ToList();
            _context.ShoppingListItems.RemoveRange(listItems);
            
            _context.SaveChanges();
            return Ok(new { message = "Checkout logged, list cleared", log });
        }
    }

    public class CheckoutRequest
    {
        public string StorePicked { get; set; } = "";
        public decimal AmountSaved { get; set; }
        public decimal TotalSpent { get; set; }
    }
}
