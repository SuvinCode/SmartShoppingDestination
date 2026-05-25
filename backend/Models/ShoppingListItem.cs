namespace backend.Models
{
    public class ShoppingListItem
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string ItemName { get; set; } = "";
        public int Quantity { get; set; } = 1;
        public bool IsCompleted { get; set; } = false;
        
        // Context properties
        public string PackageSize { get; set; } = ""; // e.g. "500g"
    }
}
