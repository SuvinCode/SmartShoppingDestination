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
                prefs = new UserPreferences { UserId = userId };
                _context.UserPreferences.Add(prefs);
                _context.SaveChanges();
            }

            return Ok(prefs);
        }

        [HttpPut]
        public IActionResult UpdatePreferences([FromQuery] int userId, [FromBody] UserPreferences model)
        {
            var prefs = _context.UserPreferences.FirstOrDefault(p => p.UserId == userId);
            if (prefs == null)
            {
                model.UserId = userId;
                _context.UserPreferences.Add(model);
                prefs = model;
            }
            else
            {
                prefs.DistanceToColesKm = model.DistanceToColesKm;
                prefs.DistanceToWoolworthsKm = model.DistanceToWoolworthsKm;
                prefs.FuelCostPerKm = model.FuelCostPerKm;
                prefs.HasFlybuys = model.HasFlybuys;
                prefs.HasEverydayRewards = model.HasEverydayRewards;
                prefs.MinSplitSavingThreshold = model.MinSplitSavingThreshold;
            }

            _context.SaveChanges();
            return Ok(prefs);
        }
    }
}
