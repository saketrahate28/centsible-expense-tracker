using System;
using Centsible.Domain.Enums;

namespace Centsible.Domain.Entities;

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid AccountId { get; set; }

    /// <summary>Nullable — 0/null means Uncategorized. Matches Category.Id (int).</summary>
    public int? CategoryId { get; set; }

    public PaymentMethodType PaymentMethod { get; set; }
    public decimal Amount { get; set; }

    /// <summary>Merchant or note text (persisted in DB column "Note" for backward compatibility).</summary>
    public string? MerchantName { get; set; }

    /// <summary>Client-generated idempotency key from parsed SMS to prevent duplicates.</summary>
    public string? SmsDedupKey { get; set; }

    /// <summary>Last 4 digits of account/card from SMS (e.g. "1234") used to resolve AccountId.</summary>
    public string? AccountReference { get; set; }

    public DateTime TransactionDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public bool IsSplit { get; set; } = false;

    /// <summary>FK to Split — set when IsSplit=true to link this transaction to its group split record.</summary>
    public Guid? SplitId { get; set; }

    // Nav properties
    public User? User { get; set; }
    public Account? Account { get; set; }
    public Category? Category { get; set; }
    public Split? Split { get; set; }
}
