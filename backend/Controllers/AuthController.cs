using System;
using Microsoft.AspNetCore.Mvc;
using backend.Data;
using backend.Models;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly DocketDbContext _context;

        public AuthController(DocketDbContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserDto model)
        {
            if (string.IsNullOrWhiteSpace(model.Username) || string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest(new { message = "Username and password are required" });
            }

            if (_context.Users.Any(u => u.Username.ToLower() == model.Username.ToLower()))
            {
                return BadRequest(new { message = "Username already exists" });
            }

            var user = new User(
                model.Username,
                model.Email ?? $"{model.Username}@docket.com",
                model.Password // plaintext for demo simplicity
            );

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Seed default preferences for the new user using domain rules
            var prefs = new UserPreferences(user.Id);
            prefs.UpdatePreferences(5.0, 4.0, 0.15M, false, false, 3.00M);
            _context.UserPreferences.Add(prefs);
            await _context.SaveChangesAsync();

            return Ok(new { userId = user.Id, username = user.Username });
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] UserDto model)
        {
            var user = _context.Users.FirstOrDefault(u => u.Username.ToLower() == model.Username.ToLower());
                
            if (user == null || !user.VerifyPassword(model.Password))
            {
                return Unauthorized(new { message = "Invalid username or password" });
            }

            // Clear shopping list items upon login to ensure it starts fresh:
            // For the 'demo' user, clear all list items, reset preferences to demo defaults, and restore default logs.
            // For registered users, only clear active/uncompleted list items, preserving history.
            if (user.Username.ToLower() == "demo")
            {
                var listItems = _context.ShoppingListItems.Where(i => i.UserId == user.Id).ToList();
                if (listItems.Any())
                {
                    _context.ShoppingListItems.RemoveRange(listItems);
                }

                var prefs = _context.UserPreferences.FirstOrDefault(p => p.UserId == user.Id);
                if (prefs != null)
                {
                    prefs.UpdatePreferences(
                        distanceColes: 3.5,
                        distanceWoolies: 2.0,
                        fuelCost: 0.18M,
                        hasFlybuys: false,
                        hasRewards: false,
                        minSplitSaving: 3.00M,
                        region: "Melbourne"
                    );
                }

                var logs = _context.SavingLogs.Where(l => l.UserId == user.Id).ToList();
                if (logs.Any())
                {
                    _context.SavingLogs.RemoveRange(logs);
                }
                var defaultLogs = new[]
                {
                    new SavingLog(user.Id, "Woolworths", 12.40M, 85.20M, DateTime.UtcNow.AddDays(-28)),
                    new SavingLog(user.Id, "Coles", 8.50M, 74.10M, DateTime.UtcNow.AddDays(-21)),
                    new SavingLog(user.Id, "Coles", 21.60M, 112.30M, DateTime.UtcNow.AddDays(-14)),
                    new SavingLog(user.Id, "Woolworths", 14.80M, 92.50M, DateTime.UtcNow.AddDays(-7)),
                    new SavingLog(user.Id, "Woolworths", 18.20M, 88.40M, DateTime.UtcNow.AddDays(-1))
                };
                _context.SavingLogs.AddRange(defaultLogs);

                _context.SaveChanges();
            }
            else
            {
                var activeItems = _context.ShoppingListItems.Where(i => i.UserId == user.Id && !i.IsCompleted).ToList();
                if (activeItems.Any())
                {
                    _context.ShoppingListItems.RemoveRange(activeItems);
                    _context.SaveChanges();
                }
            }

            return Ok(new { userId = user.Id, username = user.Username });
        }
    }

    public class UserDto
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string? Email { get; set; }
    }
}
