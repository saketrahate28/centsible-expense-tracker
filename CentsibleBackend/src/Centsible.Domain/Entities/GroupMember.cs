using Centsible.Domain.Enums;

namespace Centsible.Domain.Entities;

public class GroupMember
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public GroupRole Role { get; set; } = GroupRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;


    // Nav properties
    public Group? Group { get; set; }
    public User? User { get; set; }
}
