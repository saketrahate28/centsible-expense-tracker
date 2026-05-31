using System;
using System.Collections.Generic;
using Centsible.Domain.Enums;

namespace Centsible.Domain.Entities;

public class Account
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the bank (e.g., "HDFC Bank", "SBI").
    /// Used to match SMS sender IDs to accounts.
    /// </summary>
    public string? BankName { get; set; }

    /// <summary>
    /// Last 4 digits of the account/card number from SMS (e.g., "1234").
    /// Used to route SMS transactions to the correct account.
    /// </summary>
    public string? MaskedAccountNumber { get; set; }

    public AccountType Type { get; set; }
    public decimal CurrentBalance { get; set; }
    public string Currency { get; set; } = "INR";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Nav properties
    public User? User { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
