using System;

namespace backend.Models
{
    public class SavingLog
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string StorePicked { get; set; } = ""; // "Coles", "Woolworths", or "Split Shop"
        public decimal AmountSaved { get; set; }
        public decimal TotalSpent { get; set; }
    }
}
