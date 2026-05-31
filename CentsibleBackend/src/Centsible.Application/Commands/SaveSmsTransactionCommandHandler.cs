using Centsible.Application.Interfaces;
using Centsible.Domain.Entities;
using Centsible.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Centsible.Application.Commands;

public class SaveSmsTransactionCommandHandler : IRequestHandler<SaveSmsTransactionCommand, Guid>
{
    private readonly IAppDbContext _context;

    public SaveSmsTransactionCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(SaveSmsTransactionCommand request, CancellationToken cancellationToken)
    {
        // ── Deduplication: skip if we've already stored this SMS ──────────────
        if (!string.IsNullOrWhiteSpace(request.SmsData.ClientDedupKey))
        {
            var existing = await _context.Transactions
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    t => t.UserId == request.UserId && t.SmsDedupKey == request.SmsData.ClientDedupKey,
                    cancellationToken);
            if (existing != null)
                return existing.Id;
        }

        var paymentMethod = DeterminePaymentMethod(request.SmsData.RawMessage, request.SmsData.SenderName);

        if (!decimal.TryParse(request.SmsData.ExtractedAmount, out var amount))
            throw new ArgumentException("Invalid amount format in SMS payload.");

        amount = Math.Abs(amount);

        var merchant = !string.IsNullOrWhiteSpace(request.SmsData.MerchantName)
            ? request.SmsData.MerchantName.Trim()
            : $"Auto-imported: {request.SmsData.SenderName}";

        // ── Resolve Account: match by AccountReference (last 4 digits) ────────
        // Falls back to the first active account if no match found.
        var resolvedAccountId = await ResolveAccountIdAsync(
            request.UserId,
            request.SmsData.AccountReference,
            request.AccountId,
            cancellationToken);

        // ── Resolve Category ───────────────────────────────────────────────────
        var categoryId = await ResolveCategoryIdAsync(request.SmsData.CategoryName, cancellationToken);

        var transaction = new Transaction
        {
            UserId = request.UserId,
            AccountId = resolvedAccountId,
            CategoryId = categoryId,
            PaymentMethod = paymentMethod,
            Amount = amount,
            MerchantName = merchant,
            SmsDedupKey = request.SmsData.ClientDedupKey,
            AccountReference = request.SmsData.AccountReference,
            TransactionDate = DateTime.SpecifyKind(request.SmsData.ReceivedAt, DateTimeKind.Utc),
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync(cancellationToken);

        return transaction.Id;
    }

    /// <summary>
    /// Match the SMS account reference (last 4 digits) against Account.MaskedAccountNumber.
    /// Falls back to the pre-resolved accountId if no match found.
    /// </summary>
    private async Task<Guid> ResolveAccountIdAsync(
        Guid userId,
        string? accountReference,
        Guid fallbackAccountId,
        CancellationToken cancellationToken)
    {
        // If no account reference in the SMS, use the caller's resolved account
        if (string.IsNullOrWhiteSpace(accountReference))
            return fallbackAccountId;

        // Normalize: strip any non-digit characters, take last 4
        var digits = new string(accountReference.Where(char.IsDigit).ToArray());
        var last4 = digits.Length >= 4 ? digits[^4..] : digits;

        if (string.IsNullOrEmpty(last4))
            return fallbackAccountId;

        // Try to match against an active account with a matching masked number
        var matchedAccount = await _context.Accounts
            .Where(a => a.UserId == userId && a.IsActive && a.MaskedAccountNumber == last4)
            .FirstOrDefaultAsync(cancellationToken);

        if (matchedAccount != null)
        {
            // Update UpdatedAt to reflect recent activity on this account
            matchedAccount.UpdatedAt = DateTime.UtcNow;
            return matchedAccount.Id;
        }

        // No match — use fallback (first active account)
        return fallbackAccountId;
    }

    /// <summary>
    /// Find a Category by name. Returns null (Uncategorized) if not found.
    /// </summary>
    private async Task<int?> ResolveCategoryIdAsync(string? categoryName, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(categoryName))
            return null; // Uncategorized

        var cat = await _context.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Name == categoryName, cancellationToken);

        return cat?.Id; // null = Uncategorized, no FK violation since CategoryId is nullable
    }

    private static PaymentMethodType DeterminePaymentMethod(string message, string sender)
    {
        var text = (message + " " + sender).ToLowerInvariant();
        if (text.Contains("phonepe")) return PaymentMethodType.PhonePe;
        if (text.Contains("paytm")) return PaymentMethodType.Paytm;
        if (text.Contains("gpay") || text.Contains("google pay")) return PaymentMethodType.GPay;
        if (text.Contains("upi")) return PaymentMethodType.BhimUpi;
        if (text.Contains("credit card") || text.Contains("credit a/c")) return PaymentMethodType.CreditCard;
        if (text.Contains("debit card") || text.Contains("atm") || text.Contains("debit a/c")) return PaymentMethodType.DebitCard;
        if (text.Contains("neft") || text.Contains("rtgs") || text.Contains("imps")) return PaymentMethodType.BankTransfer;

        return PaymentMethodType.Other;
    }
}
