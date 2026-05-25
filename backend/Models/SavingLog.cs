using System;

namespace backend.Models
{
    public class SavingLog
    {
        public int Id { get; private set; }
        public int UserId { get; private set; }
        public DateTime Date { get; private set; } = DateTime.UtcNow;
        public string StorePicked { get; private set; } = ""; // "Coles", "Woolworths", or "Split Shop"
        public decimal AmountSaved { get; private set; }
        public decimal TotalSpent { get; private set; }

        private SavingLog() { } // For EF Core

        public SavingLog(int userId, string storePicked, decimal amountSaved, decimal totalSpent, DateTime? date = null)
        {
            if (userId <= 0)
                throw new ArgumentException("UserId must be positive", nameof(userId));
            if (string.IsNullOrWhiteSpace(storePicked))
                throw new ArgumentException("Store picked cannot be empty", nameof(storePicked));
            if (amountSaved < 0)
                throw new ArgumentException("Amount saved cannot be negative", nameof(amountSaved));
            if (totalSpent < 0)
                throw new ArgumentException("Total spent cannot be negative", nameof(totalSpent));

            UserId = userId;
            StorePicked = storePicked;
            AmountSaved = amountSaved;
            TotalSpent = totalSpent;
            Date = date ?? DateTime.UtcNow;
        }
    }
}
