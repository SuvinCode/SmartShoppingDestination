using System;

namespace backend.Models
{
    public class ShoppingListItem
    {
        public int Id { get; private set; }
        public int UserId { get; private set; }
        public string ItemName { get; private set; } = "";
        public int Quantity { get; private set; } = 1;
        public bool IsCompleted { get; private set; } = false;
        public string PackageSize { get; private set; } = ""; // e.g. "500g"

        private ShoppingListItem() { } // For EF Core

        public ShoppingListItem(int userId, string itemName, int quantity, string packageSize)
        {
            if (userId <= 0)
                throw new ArgumentException("UserId must be positive", nameof(userId));
            if (string.IsNullOrWhiteSpace(itemName))
                throw new ArgumentException("Item name cannot be empty", nameof(itemName));
            if (quantity <= 0)
                throw new ArgumentException("Quantity must be positive", nameof(quantity));

            UserId = userId;
            ItemName = itemName;
            Quantity = quantity;
            PackageSize = packageSize ?? "";
        }

        public void UpdateQuantity(int newQuantity)
        {
            if (newQuantity <= 0)
                throw new ArgumentException("Quantity must be positive", nameof(newQuantity));
            Quantity = newQuantity;
        }

        public void ToggleCompletion()
        {
            IsCompleted = !IsCompleted;
        }

        public void SetPackageSize(string size)
        {
            PackageSize = size ?? "";
        }

        public void CleanBranding(string genericName)
        {
            if (string.IsNullOrWhiteSpace(genericName))
                throw new ArgumentException("Generic name cannot be empty", nameof(genericName));
            ItemName = genericName;
        }
    }
}
