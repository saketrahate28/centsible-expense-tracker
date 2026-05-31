using Centsible.Application.Interfaces;
using Centsible.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Centsible.Infrastructure.Data;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<Split> Splits => Set<Split>();
    public DbSet<SplitDetail> SplitDetails => Set<SplitDetail>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();
    public DbSet<OtpRequest> OtpRequests => Set<OtpRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Composite Keys ───────────────────────────────────────────────────
        modelBuilder.Entity<GroupMember>()
            .HasKey(gm => new { gm.GroupId, gm.UserId });

        modelBuilder.Entity<SplitDetail>()
            .HasKey(sd => new { sd.SplitId, sd.OwedByUserId });

        modelBuilder.Entity<UserBadge>()
            .HasKey(ub => new { ub.UserId, ub.BadgeId });

        // ── Enum → String conversions (PostgreSQL compatibility) ─────────────
        modelBuilder.Entity<Transaction>()
            .Property(t => t.PaymentMethod)
            .HasConversion<string>();

        modelBuilder.Entity<Account>()
            .Property(a => a.Type)
            .HasConversion<string>();

        modelBuilder.Entity<GroupMember>()
            .Property(gm => gm.Role)
            .HasConversion<string>();

        // ── Column name mapping (backward compat) ───────────────────────────
        modelBuilder.Entity<Transaction>()
            .Property(t => t.MerchantName)
            .HasColumnName("Note");

        // ── Unique Indexes ────────────────────────────────────────────────────
        // Prevents duplicate SMS imports per user
        modelBuilder.Entity<Transaction>()
            .HasIndex(t => new { t.UserId, t.SmsDedupKey })
            .IsUnique()
            .HasFilter("\"SmsDedupKey\" IS NOT NULL");

        // OTP lookup by identifier (for rate limiting queries)
        modelBuilder.Entity<OtpRequest>()
            .HasIndex(o => o.Identifier);

        // ── Performance Indexes ───────────────────────────────────────────────
        // Dashboard & Analytics: every query filters by UserId + TransactionDate
        modelBuilder.Entity<Transaction>()
            .HasIndex(t => new { t.UserId, t.TransactionDate })
            .HasDatabaseName("IX_Transactions_UserId_TransactionDate");

        // ResolveAccountIdAsync: filters by UserId + IsActive
        modelBuilder.Entity<Account>()
            .HasIndex(a => new { a.UserId, a.IsActive })
            .HasDatabaseName("IX_Accounts_UserId_IsActive");

        // SMS account resolution: lookup by last 4 digits of account number
        modelBuilder.Entity<Account>()
            .HasIndex(a => new { a.UserId, a.MaskedAccountNumber })
            .HasDatabaseName("IX_Accounts_UserId_MaskedAccountNumber");

        // ── Explicit Relationship Configurations ──────────────────────────────

        // User → Accounts (cascade delete: remove accounts when user is deleted)
        modelBuilder.Entity<Account>()
            .HasOne(a => a.User)
            .WithMany(u => u.Accounts)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // User → Transactions (cascade delete)
        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.User)
            .WithMany(u => u.Transactions)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Account → Transactions (restrict: don't delete transactions when account deleted)
        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Account)
            .WithMany(a => a.Transactions)
            .HasForeignKey(t => t.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        // Category → Transactions (set null: keep transaction if category removed)
        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Category)
            .WithMany(c => c.Transactions)
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // User → Budgets
        modelBuilder.Entity<Budget>()
            .HasOne(b => b.User)
            .WithMany(u => u.Budgets)
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Category → Budgets (set null if category deleted)
        modelBuilder.Entity<Budget>()
            .HasOne(b => b.Category)
            .WithMany(c => c.Budgets)
            .HasForeignKey(b => b.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // Transaction → Split (Set null if split record removed)
        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Split)
            .WithMany()
            .HasForeignKey(t => t.SplitId)
            .OnDelete(DeleteBehavior.SetNull);

        // Split → Transaction (the root expense transaction that was split)
        modelBuilder.Entity<Split>()
            .HasOne(s => s.Transaction)
            .WithMany()
            .HasForeignKey(s => s.TransactionId)
            .OnDelete(DeleteBehavior.Restrict);

        // User → GroupMemberships (via GroupMember.User nav property)
        modelBuilder.Entity<GroupMember>()
            .HasOne(gm => gm.User)
            .WithMany(u => u.GroupMemberships)
            .HasForeignKey(gm => gm.UserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        // User → UserBadges (via UserBadge.User nav property)
        modelBuilder.Entity<UserBadge>()
            .HasOne(ub => ub.User)
            .WithMany(u => u.UserBadges)
            .HasForeignKey(ub => ub.UserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);
    }
}
