using Centsible.Application.Interfaces;
using Centsible.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Centsible.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _env;

    // Rate limiting: max OTP requests per identifier per window
    private const int MaxOtpRequestsPerHour = 5;
    private const int OtpExpiryMinutes = 5;

    public AuthController(IAppDbContext context, IConfiguration configuration, IWebHostEnvironment env)
    {
        _context = context;
        _configuration = configuration;
        _env = env;
    }

    /// <summary>
    /// Request an OTP for phone or email login.
    /// Rate limited to 5 requests per identifier per hour.
    /// In production, triggers an SMS/email via your SMS provider.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Value))
            return BadRequest(new { message = "Phone number or email is required." });

        var identifier = request.Value.ToLower().Trim();
        var now = DateTime.UtcNow;
        var windowStart = now.AddHours(-1);

        // Rate limiting: count recent OTP requests for this identifier
        var recentCount = await _context.OtpRequests
            .CountAsync(o => o.Identifier == identifier && o.CreatedAt >= windowStart, cancellationToken);

        if (recentCount >= MaxOtpRequestsPerHour)
            return StatusCode(429, new { message = "Too many OTP requests. Please wait before requesting again." });

        // Generate a secure 6-digit OTP
        var otp = GenerateSecureOtp();

        // Hash OTP before storing — never store plain-text OTPs
        var otpHash = HashOtp(otp);

        // Invalidate any existing unused OTPs for this identifier
        var existingOtps = await _context.OtpRequests
            .Where(o => o.Identifier == identifier && !o.IsUsed && o.ExpiresAt > now)
            .ToListAsync(cancellationToken);
        foreach (var old in existingOtps)
            old.IsUsed = true;

        // Store new OTP record
        _context.OtpRequests.Add(new OtpRequest
        {
            Identifier = identifier,
            OtpHash = otpHash,
            ExpiresAt = now.AddMinutes(OtpExpiryMinutes),
            CreatedAt = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        // TODO: In production, send OTP via SMS provider (Twilio, AWS SNS, MSG91, etc.)
        // await _smsService.SendOtp(identifier, otp);

        // Dev mode ONLY — expose OTP in response for testing.
        // This block must NOT be reached in Production.
        if (_env.IsDevelopment())
        {
            Console.WriteLine($"🔐 [DEV] OTP for {identifier}: {otp}");
            return Ok(new
            {
                message = "OTP sent successfully.",
                expiresInSeconds = OtpExpiryMinutes * 60,
                devOtp = otp  // Stripped in Production (IsDevelopment guard above)
            });
        }

        return Ok(new
        {
            message = "OTP sent successfully.",
            expiresInSeconds = OtpExpiryMinutes * 60
        });
    }

    /// <summary>
    /// Verify OTP and return a JWT token. Creates the user if they don't exist yet.
    /// </summary>
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyRequest request, CancellationToken cancellationToken)
    {
        var identifier = request.Value.ToLower().Trim();
        var now = DateTime.UtcNow;

        // Find the most recent valid, unused OTP for this identifier
        var otpRecord = await _context.OtpRequests
            .Where(o => o.Identifier == identifier && !o.IsUsed && o.ExpiresAt > now)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (otpRecord == null)
            return Unauthorized(new { message = "No valid OTP found. Please request a new one." });

        // Verify the submitted OTP against the stored hash
        var submittedHash = HashOtp(request.Otp);
        if (!CryptographicEquals(submittedHash, otpRecord.OtpHash))
            return Unauthorized(new { message = "Invalid OTP." });

        // Mark OTP as consumed (single-use enforcement)
        otpRecord.IsUsed = true;
        await _context.SaveChangesAsync(cancellationToken);

        // Find or create user
        User? user;
        if (request.Method == "phone")
        {
            user = await _context.Users.FirstOrDefaultAsync(u => u.PhoneNumber == identifier, cancellationToken);
            if (user == null)
            {
                user = new User
                {
                    FullName = "Centsible User",
                    PhoneNumber = identifier,
                    Email = $"{identifier.Replace("+", "")}@phone.centsible.app",
                    Provider = "Phone"
                };
                _context.Users.Add(user);

                _context.Accounts.Add(new Account
                {
                    UserId = user.Id,
                    Name = "Primary Account",
                    Type = Domain.Enums.AccountType.Bank,
                    CurrentBalance = 0
                });

                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        else
        {
            user = await _context.Users.FirstOrDefaultAsync(u => u.Email == identifier, cancellationToken);
            if (user == null)
            {
                user = new User
                {
                    FullName = "Centsible User",
                    Email = identifier,
                    Provider = "Email"
                };
                _context.Users.Add(user);

                _context.Accounts.Add(new Account
                {
                    UserId = user.Id,
                    Name = "Primary Account",
                    Type = Domain.Enums.AccountType.Bank,
                    CurrentBalance = 0
                });

                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        var token = GenerateJwtToken(user);

        return Ok(new
        {
            token,
            user = new
            {
                id = user.Id,
                fullName = user.FullName,
                email = user.Email,
                phone = user.PhoneNumber,
                isPremium = user.IsPremium,
                isOnboarded = user.IsOnboarded,
                avatarUrl = user.AvatarUrl
            }
        });
    }

    /// <summary>
    /// Returns the current user's profile from the JWT token.
    /// </summary>
    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _context.Users.FindAsync([userId], cancellationToken);
        if (user == null) return NotFound();

        return Ok(new
        {
            id = user.Id,
            fullName = user.FullName,
            email = user.Email,
            phone = user.PhoneNumber,
            isPremium = user.IsPremium,
            isOnboarded = user.IsOnboarded,
            avatarUrl = user.AvatarUrl
        });
    }

    /// <summary>
    /// Synchronize a Supabase session with the local Centsible database.
    /// Validates the Supabase JWT signature using the Supabase JWT Secret.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncSupabase([FromBody] SupabaseSyncRequest request, CancellationToken cancellationToken)
    {
        // Validate Supabase JWT signature using the configured Supabase JWT Secret
        var supabaseJwtSecret = _configuration["Supabase:JwtSecret"];
        if (string.IsNullOrWhiteSpace(supabaseJwtSecret))
            return StatusCode(501, new { message = "Supabase sync is not configured on this server." });

        var handler = new JwtSecurityTokenHandler();
        JwtSecurityToken? jsonToken;

        try
        {
            var validationParams = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(supabaseJwtSecret)),
                ValidateIssuer = false,  // Supabase issuer varies by project
                ValidateAudience = false, // Supabase audience is "authenticated"
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2)
            };

            handler.ValidateToken(request.SupabaseToken, validationParams, out var validatedToken);
            jsonToken = validatedToken as JwtSecurityToken;
        }
        catch (SecurityTokenException ex)
        {
            return Unauthorized(new { message = "Invalid or expired Supabase token.", detail = ex.Message });
        }

        if (jsonToken == null)
            return BadRequest(new { message = "Malformed Supabase token." });

        var email = jsonToken.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
        var phone = jsonToken.Claims.FirstOrDefault(c => c.Type == "phone")?.Value;

        if (string.IsNullOrEmpty(email) && string.IsNullOrEmpty(phone))
            return BadRequest(new { message = "Token does not contain user identifier." });

        var user = await _context.Users.FirstOrDefaultAsync(
            u => (email != null && u.Email == email) || (phone != null && u.PhoneNumber == phone),
            cancellationToken);

        if (user == null)
        {
            user = new User
            {
                FullName = email?.Split('@')[0] ?? "Centsible User",
                Email = email ?? $"{phone!.Replace("+", "")}@phone.centsible.app",
                PhoneNumber = phone,
                Provider = request.Provider ?? "Supabase",
                IsOnboarded = false
            };

            _context.Users.Add(user);
            _context.Accounts.Add(new Account
            {
                UserId = user.Id,
                Name = "Primary Account",
                Type = Domain.Enums.AccountType.Bank,
                CurrentBalance = 0
            });

            await _context.SaveChangesAsync(cancellationToken);
        }

        var token = GenerateJwtToken(user);

        return Ok(new
        {
            token,
            user = new
            {
                id = user.Id,
                fullName = user.FullName,
                email = user.Email,
                phone = user.PhoneNumber,
                isPremium = user.IsPremium,
                isOnboarded = user.IsOnboarded,
                avatarUrl = user.AvatarUrl
            }
        });
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var secretKey = jwtSettings["Key"];

        // Throw hard in production if JWT key is not configured
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            if (!_env.IsDevelopment())
                throw new InvalidOperationException(
                    "JWT key is not configured. Set the Jwt__Key environment variable before deploying.");

            // Dev-only fallback — clearly labeled, never reaches prod
            secretKey = "CentsibleDevFallbackKey2026!DO_NOT_USE_IN_PROD!";
            Console.WriteLine("⚠️  [DEV] Using fallback JWT key. Set Jwt__Key in appsettings.Development.json!");
        }

        var issuer = jwtSettings["Issuer"] ?? "CentsibleApi";
        var audience = jwtSettings["Audience"] ?? "CentsibleApp";
        var expiryHours = int.TryParse(jwtSettings["ExpiryHours"], out var h) ? h : 72;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim("isPremium", user.IsPremium.ToString().ToLower())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Generate a cryptographically secure 6-digit OTP.</summary>
    private static string GenerateSecureOtp()
    {
        // Use RandomNumberGenerator for crypto-safe randomness (not System.Random)
        var randomBytes = new byte[4];
        RandomNumberGenerator.Fill(randomBytes);
        var randomInt = Math.Abs(BitConverter.ToInt32(randomBytes, 0));
        return (100000 + (randomInt % 900000)).ToString();
    }

    /// <summary>SHA-256 hash of OTP for safe storage.</summary>
    private static string HashOtp(string otp)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(otp));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    /// <summary>Constant-time comparison to prevent timing attacks.</summary>
    private static bool CryptographicEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var result = 0;
        for (var i = 0; i < a.Length; i++)
            result |= a[i] ^ b[i];
        return result == 0;
    }
}

// --- Request DTOs ---

public class LoginRequest
{
    public string Method { get; set; } = "phone"; // "phone" or "email"
    public string Value { get; set; } = string.Empty;
}

public class VerifyRequest
{
    public string Method { get; set; } = "phone";
    public string Value { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}

public class GoogleLoginRequest
{
    public string IdToken { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Name { get; set; }
    public string? PhotoUrl { get; set; }
}

public class SupabaseSyncRequest
{
    public string SupabaseToken { get; set; } = string.Empty;
    public string? Provider { get; set; }
}
