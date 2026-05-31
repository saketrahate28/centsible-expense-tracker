using System;
using System.Collections.Generic;

namespace Centsible.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? AvatarUrl { get; set; }
    public string Provider { get; set; } = "Email";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int MaxStreakDays { get; set; } = 0;
    public bool IsPremium { get; set; } = false;

    // Onboarding fields
    public bool IsOnboarded { get; set; } = false;
    public int? Age { get; set; }
    public int ExpectedBankAccountsCount { get; set; } = 1;
    public string? City { get; set; } // Last known city for transaction tagging

    // Nav properties — full relationship tree
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<Budget> Budgets { get; set; } = new List<Budget>();
    public ICollection<GroupMember> GroupMemberships { get; set; } = new List<GroupMember>();
    public ICollection<UserBadge> UserBadges { get; set; } = new List<UserBadge>();
}
