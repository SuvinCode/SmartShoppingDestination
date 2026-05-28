using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using backend.Data;
using backend.Models;
using backend.Services;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationsController : ControllerBase
    {
        private readonly DocketDbContext _context;
        private readonly IStoreRecommendationEngine _engine;

        public RecommendationsController(DocketDbContext context, IStoreRecommendationEngine engine)
        {
            _context = context;
            _engine = engine;
        }

        /// <summary>
        /// GET /api/recommendations?userId={id}
        /// Runs the 6-phase recommendation algorithm and returns top-5 stores
        /// ranked by weighted savings and by proximity, plus a combined trade-off narrative.
        /// </summary>
        [HttpGet]
        public IActionResult GetRecommendations([FromQuery] int userId)
        {
            if (userId <= 0)
                return BadRequest("userId must be a positive integer.");

            var prefs = _context.UserPreferences.FirstOrDefault(p => p.UserId == userId);
            if (prefs == null)
                prefs = new UserPreferences(userId); // use defaults if not configured

            var result = _engine.GetTopStores(userId, prefs);
            return Ok(result);
        }
    }
}
