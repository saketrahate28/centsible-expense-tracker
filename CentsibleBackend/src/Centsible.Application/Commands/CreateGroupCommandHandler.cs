using Centsible.Application.Interfaces;
using Centsible.Domain.Entities;
using Centsible.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Centsible.Application.Commands;

public class CreateGroupCommandHandler : IRequestHandler<CreateGroupCommand, Guid>
{
    private readonly IAppDbContext _context;

    public CreateGroupCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateGroupCommand request, CancellationToken cancellationToken)
    {
        // Simple Subscription Gating Check (Mock for now)
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            
        if (user == null) throw new Exception("User not found");

        // Logic: Basic users can only have 1 group, Premium users unlimited
        var existingGroupsCount = await _context.GroupMembers
            .CountAsync(gm => gm.UserId == request.UserId && gm.Role == GroupRole.Admin, cancellationToken);

        if (!user.IsPremium && existingGroupsCount >= 1)
        {
            throw new Exception("FREE_LIMIT_REACHED: Upgrade to Premium to create more shared groups.");
        }


        var group = new Group
        {
            Name = request.Name,
            CoverImage = request.CoverImage,
            CreatedAt = DateTime.UtcNow
        };

        var member = new GroupMember
        {
            GroupId = group.Id,
            UserId = request.UserId,
            Role = GroupRole.Admin,
            JoinedAt = DateTime.UtcNow
        };

        _context.Groups.Add(group);
        _context.GroupMembers.Add(member);

        await _context.SaveChangesAsync(cancellationToken);

        return group.Id;
    }
}
