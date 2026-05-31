using System;
using System.Collections.Generic;

namespace Centsible.Domain.Entities;

public class Group
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? CoverImage { get; set; }
    public decimal MonthlyLimit { get; set; }
    public bool IsLocked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();

    public ICollection<Split> Splits { get; set; } = new List<Split>();
}
