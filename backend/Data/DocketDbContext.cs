using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class DocketDbContext : DbContext
    {
        public DocketDbContext(DbContextOptions<DocketDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<CatalogItem> CatalogItems => Set<CatalogItem>();
        public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();
        public DbSet<ShoppingListItem> ShoppingListItems => Set<ShoppingListItem>();
        public DbSet<SavingLog> SavingLogs => Set<SavingLog>();
    }
}
