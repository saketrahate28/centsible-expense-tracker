using System;

namespace Centsible.Domain.Entities;

public class UserBadge
{
    public Guid UserId { get; set; }
    public int BadgeId { get; set; }
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    // Nav properties
    public User? User { get; set; }
    public Badge? Badge { get; set; }
}
