using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly DocketDbContext _context;

        public DashboardController(DocketDbContext context)
        {
            _context = context;
        }

        [HttpGet("savings")]
        [OutputCache(PolicyName = "SavingsStatsPolicy")]
        public IActionResult GetSavingsStats([FromQuery] int userId)
        {
            var logs = _context.SavingLogs
                .Where(l => l.UserId == userId)
                .OrderBy(l => l.Date)
                .ToList();

            decimal cumulativeSavings = logs.Sum(l => l.AmountSaved);
            decimal totalSpent = logs.Sum(l => l.TotalSpent);
            int totalShops = logs.Count;
            decimal averageSavings = totalShops > 0 ? cumulativeSavings / totalShops : 0;

            // Generate chronological list with cumulative totals for charting
            decimal runningTotal = 0;
            var chartData = logs.Select(l => {
                runningTotal += l.AmountSaved;
                return new {
                    Date = l.Date.ToString("yyyy-MM-dd"),
                    AmountSaved = l.AmountSaved,
                    TotalSpent = l.TotalSpent,
                    Store = l.StorePicked,
                    CumulativeSavings = runningTotal
                };
            }).ToList();

            return Ok(new {
                cumulativeSavings,
                totalSpent,
                totalShops,
                averageSavings,
                history = chartData
            });
        }

        [HttpGet("notifications")]
        [OutputCache(Duration = 300)] // 5 minutes — notifications are simulated and rarely change
        public IActionResult GetNotifications([FromQuery] int userId)
        {
            var prefs = _context.UserPreferences.FirstOrDefault(p => p.UserId == userId);
            
            // Generate simulated notifications
            var notifications = new List<object>
            {
                new {
                    Id = 1,
                    Title = "Weekly Catalogue Winner 🏆",
                    Message = "Woolworths is this week's price winner! Shopping there will save you an average of $18.40 on your usual list.",
                    Timestamp = DateTime.UtcNow.AddHours(-4).ToString("g"),
                    Read = false,
                    Type = "catalog_update"
                },
                new {
                    Id = 2,
                    Title = "Cadbury Special Alert 🍫",
                    Message = "Cadbury Dairy Milk 180g is currently 1/2 Price ($3.00) at Woolworths! Normal price is $6.00.",
                    Timestamp = DateTime.UtcNow.AddDays(-2).ToString("g"),
                    Read = true,
                    Type = "special_alert"
                },
                new {
                    Id = 3,
                    Title = "Coles Special Alert 🧀",
                    Message = "Bega Tasty Cheese Block 500g is currently on special for $8.50 at Coles! Normal price is $9.50.",
                    Timestamp = DateTime.UtcNow.AddDays(-3).ToString("g"),
                    Read = true,
                    Type = "special_alert"
                }
            };

            return Ok(notifications);
        }

        [HttpPost("reset-account")]
        public IActionResult ResetAccount([FromQuery] int userId)
        {
            var logs = _context.SavingLogs.Where(l => l.UserId == userId).ToList();
            if (logs.Any())
            {
                _context.SavingLogs.RemoveRange(logs);
            }

            var listItems = _context.ShoppingListItems.Where(i => i.UserId == userId).ToList();
            if (listItems.Any())
            {
                _context.ShoppingListItems.RemoveRange(listItems);
            }

            var prefs = _context.UserPreferences.FirstOrDefault(p => p.UserId == userId);
            if (prefs != null)
            {
                prefs.UpdatePreferences(
                    distanceColes: 5.0,
                    distanceWoolies: 4.0,
                    fuelCost: 0.15M,
                    hasFlybuys: false,
                    hasRewards: false,
                    minSplitSaving: 5.00M,
                    region: "Melbourne"
                );
            }

            _context.SaveChanges();
            return Ok(new { message = "Account reset successfully." });
        }
    }
}
