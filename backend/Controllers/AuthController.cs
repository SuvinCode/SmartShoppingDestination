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

            // Clear shopping list items upon login to ensure it starts fresh
            var listItems = _context.ShoppingListItems.Where(i => i.UserId == user.Id && !i.IsCompleted).ToList();
            if (listItems.Any())
            {
                _context.ShoppingListItems.RemoveRange(listItems);
                _context.SaveChanges();
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
