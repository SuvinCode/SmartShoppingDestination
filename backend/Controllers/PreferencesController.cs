using System.Linq;
using Microsoft.AspNetCore.Mvc;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PreferencesController : ControllerBase
    {
        private readonly DocketDbContext _context;

        public PreferencesController(DocketDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetPreferences([FromQuery] int userId)
        {
            var prefs = _context.UserPreferences.FirstOrDefault(p => p.UserId == userId);
            if (prefs == null)
            {
                prefs = new UserPreferences(userId);
                _context.UserPreferences.Add(prefs);
                _context.SaveChanges();
            }

            return Ok(prefs);
        }

        [HttpPut]
        public IActionResult UpdatePreferences([FromQuery] int userId, [FromBody] UpdatePreferencesDto dto)
        {
            if (dto == null) return BadRequest("Invalid payload.");

            var prefs = _context.UserPreferences.FirstOrDefault(p => p.UserId == userId);
            if (prefs == null)
            {
                prefs = new UserPreferences(userId);
                prefs.UpdatePreferences(
                    dto.DistanceToColesKm,
                    dto.DistanceToWoolworthsKm,
                    dto.FuelCostPerKm,
                    dto.HasFlybuys,
                    dto.HasEverydayRewards,
                    dto.MinSplitSavingThreshold
                );
                _context.UserPreferences.Add(prefs);
            }
            else
            {
                prefs.UpdatePreferences(
                    dto.DistanceToColesKm,
                    dto.DistanceToWoolworthsKm,
                    dto.FuelCostPerKm,
                    dto.HasFlybuys,
                    dto.HasEverydayRewards,
                    dto.MinSplitSavingThreshold
                );
            }

            _context.SaveChanges();
            return Ok(prefs);
        }
    }

    public class UpdatePreferencesDto
    {
        public double DistanceToColesKm { get; set; }
        public double DistanceToWoolworthsKm { get; set; }
        public decimal FuelCostPerKm { get; set; }
        public bool HasFlybuys { get; set; }
        public bool HasEverydayRewards { get; set; }
        public decimal MinSplitSavingThreshold { get; set; }
    }
}
