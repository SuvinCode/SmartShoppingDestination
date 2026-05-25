using System.Collections.Generic;
using backend.Models;

namespace backend.Services
{
    public interface IComparisonEngine
    {
        ComparisonResult CompareList(List<ShoppingListItem> listItems, UserPreferences prefs);
    }
}
