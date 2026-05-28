using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using backend.Data;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CatalogController : ControllerBase
    {
        private readonly DocketDbContext _context;

        public CatalogController(DocketDbContext context)
        {
            _context = context;
        }

        [HttpGet("search")]
        [OutputCache(PolicyName = "CatalogSearchPolicy")]
        public IActionResult Search([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return Ok(new List<object>());
            }

            var term = q.ToLower();
            
            // Get catalog items matching search term
            var items = _context.CatalogItems
                .Where(i => i.Name.ToLower().Contains(term) || i.Category.ToLower().Contains(term))
                .Select(i => new { i.Name, i.Category, i.PackageSize })
                .ToList();

            // Group to create clean, store-agnostic autocomplete suggestions
            var suggestions = items
                .Select(i => {
                    string genericName = i.Name;
                    if (genericName.StartsWith("Coles ", StringComparison.OrdinalIgnoreCase))
                        genericName = genericName.Substring(6);
                    else if (genericName.StartsWith("Woolworths ", StringComparison.OrdinalIgnoreCase))
                        genericName = genericName.Substring(11);
                    else if (genericName.StartsWith("WW ", StringComparison.OrdinalIgnoreCase))
                        genericName = genericName.Substring(3);

                    return new { Name = genericName, i.Category, i.PackageSize };
                })
                .GroupBy(x => x.Name.ToLower())
                .Select(g => g.First())
                .Take(8)
                .ToList();

            return Ok(suggestions);
        }
    }
}
