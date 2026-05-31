using Centsible.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Centsible.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<Account> Accounts { get; }
    DbSet<Transaction> Transactions { get; }
    DbSet<Category> Categories { get; }
    DbSet<Budget> Budgets { get; }
    DbSet<Group> Groups { get; }
    DbSet<GroupMember> GroupMembers { get; }
    DbSet<Split> Splits { get; }
    DbSet<SplitDetail> SplitDetails { get; }
    DbSet<Badge> Badges { get; }
    DbSet<UserBadge> UserBadges { get; }
    DbSet<OtpRequest> OtpRequests { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
