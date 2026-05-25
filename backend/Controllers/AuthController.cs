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

            var user = new User
            {
                Username = model.Username,
                Email = model.Email ?? $"{model.Username}@docket.com",
                PasswordHash = model.Password // plaintext for demo simplicity
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Seed default preferences for the new user
            var prefs = new UserPreferences
            {
                UserId = user.Id,
                DistanceToColesKm = 5.0,
                DistanceToWoolworthsKm = 4.0,
                FuelCostPerKm = 0.15M,
                HasFlybuys = false,
                HasEverydayRewards = false,
                MinSplitSavingThreshold = 3.00M
            };
            _context.UserPreferences.Add(prefs);
            await _context.SaveChangesAsync();

            return Ok(new { userId = user.Id, username = user.Username });
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] UserDto model)
        {
            var user = _context.Users.FirstOrDefault(u => 
                u.Username.ToLower() == model.Username.ToLower() && 
                u.PasswordHash == model.Password);
                
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid username or password" });
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
