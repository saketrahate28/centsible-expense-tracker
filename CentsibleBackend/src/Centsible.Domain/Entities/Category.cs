using System;
using System.Collections.Generic;

namespace Centsible.Domain.Entities;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string ColorHex { get; set; } = string.Empty;

    // Nullable UserId -> Global category if null
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    // Nav
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<Budget> Budgets { get; set; } = new List<Budget>();
}
