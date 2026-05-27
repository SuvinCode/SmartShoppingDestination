using backend.Models;

namespace backend.Services
{
    /// <summary>
    /// Defines the 6-phase store recommendation algorithm contract.
    /// </summary>
    public interface IStoreRecommendationEngine
    {
        /// <summary>
        /// Runs all 6 phases for the given user and returns the personalised top-5 store list.
        /// </summary>
        StoreRecommendationResult? GetTopStores(int userId, UserPreferences prefs);
    }
}
