namespace Centsible.Application.DTOs;

public class SmsTransactionDto
{
    public string SenderName { get; set; } = string.Empty;
    public string RawMessage { get; set; } = string.Empty;
    public string ExtractedAmount { get; set; } = string.Empty;
    public string? MerchantName { get; set; }
    public string? CategoryName { get; set; }
    public string Type { get; set; } = "Debit";
    public DateTime ReceivedAt { get; set; }
    public string? ClientDedupKey { get; set; }

    /// <summary>
    /// Last 4 digits of the account/card number parsed from the SMS body.
    /// Used by the backend to resolve which Account row this transaction belongs to.
    /// Example: "1234" from "Your HDFC a/c XX1234 is debited"
    /// </summary>
    public string? AccountReference { get; set; }
}
