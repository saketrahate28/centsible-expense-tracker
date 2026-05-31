using System;

namespace Centsible.Domain.Entities;

public class SplitDetail
{
    public Guid SplitId { get; set; }
    public Guid OwedByUserId { get; set; }
    public decimal AmountOwed { get; set; }
    public bool IsSettled { get; set; } = false;
    public DateTime? SettledAt { get; set; }

    // Nav properties
    public Split? Split { get; set; }
    public User? OwedBy { get; set; }
}
