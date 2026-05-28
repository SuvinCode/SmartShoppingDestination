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
        private readonly IComparisonEngine _comparisonEngine;
        private readonly IPythonAIServiceClient _aiClient;

        public ListsController(DocketDbContext context, IComparisonEngine comparisonEngine, IPythonAIServiceClient aiClient)
        {
            _context = context;
            _comparisonEngine = comparisonEngine;
            _aiClient = aiClient;
        }

        [HttpGet]
        public IActionResult GetList([FromQuery] int userId)
        {
            var list = _context.ShoppingListItems.Where(i => i.UserId == userId && !i.IsCompleted).ToList();
            return Ok(list);
        }

        [HttpPost]
        public IActionResult AddItem([FromBody] AddItemDto dto)
        {
            if (dto == null) return BadRequest("Invalid payload.");

            // Clean name from store branding
            string genericName = dto.ItemName;
            if (genericName.StartsWith("Coles ", StringComparison.OrdinalIgnoreCase))
                genericName = genericName.Substring(6);
            else if (genericName.StartsWith("Woolworths ", StringComparison.OrdinalIgnoreCase))
                genericName = genericName.Substring(11);
            else if (genericName.StartsWith("WW ", StringComparison.OrdinalIgnoreCase))
                genericName = genericName.Substring(3);

            string packageSize = dto.PackageSize;
            // Try to auto-resolve packagesize
            var match = _context.CatalogItems.FirstOrDefault(c => c.Name.ToLower().Contains(genericName.ToLower()));
            if (match != null && string.IsNullOrEmpty(packageSize))
            {
                packageSize = match.PackageSize;
            }

            var item = new ShoppingListItem(dto.UserId, genericName, dto.Quantity, packageSize);
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
            var items = _context.ShoppingListItems.Where(i => i.UserId == userId && !i.IsCompleted).ToList();
            _context.ShoppingListItems.RemoveRange(items);
            _context.SaveChanges();
            return Ok(new { message = "List cleared" });
        }

        [HttpPost("clear-history")]
        public IActionResult ClearHistory([FromQuery] int userId)
        {
            var items = _context.ShoppingListItems.Where(i => i.UserId == userId).ToList();
            if (items.Any())
            {
                _context.ShoppingListItems.RemoveRange(items);
                _context.SaveChanges();
            }
            return Ok(new { message = "All list and receipt history cleared" });
        }

        [HttpPost("sync-loyalty")]
        public IActionResult SyncLoyalty([FromQuery] int userId)
        {
            // Clear current active list and pre-populate with Flybuys/Everyday Rewards history
            var currentItems = _context.ShoppingListItems.Where(i => i.UserId == userId && !i.IsCompleted).ToList();
            _context.ShoppingListItems.RemoveRange(currentItems);

            var usualItems = new[]
            {
                new ShoppingListItem(userId, "White Toast Bread", 1, "650g"),
                new ShoppingListItem(userId, "Full Cream Milk", 2, "2L"),
                new ShoppingListItem(userId, "Bega Tasty Cheese Block", 1, "500g"),
                new ShoppingListItem(userId, "Cavendish Bananas", 1, "1kg")
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

            // 2. Build catalog candidates once (shared across all item matches)
            var dbCandidates = _context.CatalogItems
                .Select(i => new { i.Id, i.Name })
                .ToList()
                .Select(i =>
                {
                    string name = i.Name
                        .Replace("Coles ", "", StringComparison.OrdinalIgnoreCase)
                        .Replace("Woolworths ", "", StringComparison.OrdinalIgnoreCase)
                        .Replace("WW ", "", StringComparison.OrdinalIgnoreCase);
                    return new CatalogItemCandidate { Id = i.Id, Name = name };
                })
                .GroupBy(c => c.Name.ToLower())
                .Select(g => g.First())
                .ToList();

            // 3. Batch-match all OCR item names in a single HTTP call instead of N serial calls.
            //    This is the key fix: previously we awaited one /api/match request per item
            //    inside a foreach loop, which caused the OCR scanning slowness on production.
            var ocrItemNames = ocrResult.Items.Select(i => i.RawName).ToList();
            var batchMatches = await _aiClient.BatchMatchCatalogItemsAsync(ocrItemNames, dbCandidates);

            // 4. Build a lookup by query name so we can pair each OCR item with its best match
            var matchLookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var batchResult in batchMatches)
            {
                if (batchResult.Matches != null && batchResult.Matches.Count > 0)
                    matchLookup[batchResult.Query] = batchResult.Matches[0].Candidate.Name;
            }

            // 5. Map matched names to catalog items and save purchase history
            var matchedItems = new List<object>();

            foreach (var ocrItem in ocrResult.Items)
            {
                string genericName = matchLookup.TryGetValue(ocrItem.RawName, out var matched)
                    ? matched
                    : ocrItem.RawName;

                string packageSize = "";
                var dbMatch = _context.CatalogItems.FirstOrDefault(c => c.Name.ToLower().Contains(genericName.ToLower()));
                if (dbMatch != null)
                {
                    packageSize = dbMatch.PackageSize;
                }

                // Save to purchase history only (for recommendation engine rankings)
                var histItem = new ShoppingListItem(userId, genericName, ocrItem.Quantity, packageSize);
                histItem.ToggleCompletion();
                _context.ShoppingListItems.Add(histItem);

                matchedItems.Add(new {
                    itemName = genericName,
                    quantity = ocrItem.Quantity,
                    unitPrice = ocrItem.UnitPrice,
                    totalPrice = ocrItem.TotalPrice,
                    packageSize
                });
            }

            _context.SaveChanges();

            string storeName = ocrResult.StoreDetected ?? "Unknown";
            string storeLocation = ocrResult.StoreLocation ?? "";
            string displayName = string.IsNullOrEmpty(storeLocation)
                ? storeName
                : $"{storeName} {storeLocation}";

            return Ok(new {
                store = storeName,
                storeLocation,
                storeDisplayName = displayName,
                receiptTotal = ocrResult.ReceiptTotal,
                items = matchedItems,
                rawText = ocrResult.RawText
            });
        }


        [HttpPost("compare")]
        public IActionResult Compare([FromQuery] int userId)
        {
            var listItems = _context.ShoppingListItems.Where(i => i.UserId == userId).ToList();
            var prefs = _context.UserPreferences.FirstOrDefault(p => p.UserId == userId);
            
            if (prefs == null)
            {
                prefs = new UserPreferences(userId);
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
            var log = new SavingLog(userId, request.StorePicked, request.AmountSaved, request.TotalSpent);

            _context.SavingLogs.Add(log);
            
            var activeItems = _context.ShoppingListItems.Where(i => i.UserId == userId && !i.IsCompleted).ToList();
            foreach (var item in activeItems)
            {
                item.ToggleCompletion();
            }
            
            _context.SaveChanges();
            return Ok(new { message = "Checkout logged, list cleared", log });
        }
    }

    public class AddItemDto
    {
        public int UserId { get; set; }
        public string ItemName { get; set; } = "";
        public int Quantity { get; set; } = 1;
        public string PackageSize { get; set; } = "";
    }

    public class CheckoutRequest
    {
        public string StorePicked { get; set; } = "";
        public decimal AmountSaved { get; set; }
        public decimal TotalSpent { get; set; }
    }
}
