using System;

namespace Centsible.Domain.Entities;

/// <summary>
/// Tracks OTP requests for phone/email authentication.
/// Replaces the in-memory static dictionary — persists across restarts and scales horizontally.
/// </summary>
public class OtpRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Phone number or email address (lowercased, trimmed).</summary>
    public string Identifier { get; set; } = string.Empty;

    /// <summary>Hashed OTP code (SHA-256) — never stored plain-text.</summary>
    public string OtpHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>True once the OTP has been verified and consumed.</summary>
    public bool IsUsed { get; set; } = false;
}
