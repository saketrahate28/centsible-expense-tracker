using System;
using Centsible.Domain.Enums;

namespace Centsible.Domain.Entities;

public class Budget
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public int? CategoryId { get; set; }
    public decimal AmountLimit { get; set; }
    public PeriodType Period { get; set; } = PeriodType.Monthly;

    /// <summary>Start of the budget period. Null = ongoing rolling budget.</summary>
    public DateTime? StartDate { get; set; }

    /// <summary>End of the budget period. Null = ongoing rolling budget.</summary>
    public DateTime? EndDate { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Nav properties
    public User? User { get; set; }
    public Category? Category { get; set; }
}
