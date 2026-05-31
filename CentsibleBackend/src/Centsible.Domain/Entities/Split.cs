using System;
using System.Collections.Generic;

namespace Centsible.Domain.Entities;

public class Split
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GroupId { get; set; }
    public Guid PayerUserId { get; set; }
    public Guid TransactionId { get; set; }
    public decimal TotalAmount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    // Nav properties
    public Group? Group { get; set; }
    public User? Payer { get; set; }
    public Transaction? Transaction { get; set; }
    public ICollection<SplitDetail> SplitDetails { get; set; } = new List<SplitDetail>();
}
