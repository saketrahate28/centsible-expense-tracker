using Centsible.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Razorpay.Api;
using System.Security.Claims;
using System.Text;

namespace Centsible.Api.Controllers;

// ── Billing plans (amounts in paise: 9900 = RS.99) ----------------------------
file static class Plans
{
    public record Plan(string Id, string Name, int AmountPaise, string Currency, int Days, string Interval, string Highlight);

    public static readonly Dictionary<string, Plan> All = new()
    {
        ["monthly"] = new("monthly", "Centsible Pro Monthly", 9900,  "INR", 30,  "month", "Cancel anytime"),
        ["yearly"]  = new("yearly",  "Centsible Pro Yearly",  89900, "INR", 365, "year",  "Save 24% - 2 months free"),
    };
}

[ApiController]
[Route("api/[controller]")]
public class BillingController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<BillingController> _logger;

    public BillingController(IAppDbContext context, IConfiguration config, IWebHostEnvironment env, ILogger<BillingController> logger)
    {
        _context = context;
        _config  = config;
        _env     = env;
        _logger  = logger;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (claim != null && Guid.TryParse(claim, out var id)) return id;
        if (_env.IsDevelopment()) return Guid.Parse("00000000-0000-0000-0000-000000000001");
        throw new UnauthorizedAccessException("Authentication required.");
    }

    private RazorpayClient? GetClient()
    {
        var keyId = _config["Razorpay:KeyId"];
        var keySecret = _config["Razorpay:KeySecret"];
        if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret)) return null;
        return new RazorpayClient(keyId, keySecret);
    }

    // GET /api/Billing/plans
    [HttpGet("plans")]
    [AllowAnonymous]
    public IActionResult GetPlans()
    {
        var client = GetClient();
        return Ok(new
        {
            razorpayEnabled = client != null,
            keyId = client != null ? _config["Razorpay:KeyId"] : null,
            plans = Plans.All.Values.Select(p => new
            {
                p.Id, p.Name,
                amount = p.AmountPaise / 100,
                p.Currency, p.Interval, p.Highlight,
            })
        });
    }

    // POST /api/Billing/order  -- creates a Razorpay order
    [HttpPost("order")]
    [Authorize]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest body, CancellationToken ct)
    {
        if (!Plans.All.TryGetValue(body.Plan, out var plan))
            return BadRequest(new { message = "Invalid plan. Use 'monthly' or 'yearly'." });

        var client = GetClient();
        if (client == null)
            return StatusCode(503, new { message = "Razorpay not configured. Add Razorpay:KeyId + Razorpay:KeySecret to appsettings." });

        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(new object[] { userId }, ct);
        if (user == null) return NotFound(new { message = "User not found." });

        var receiptRaw = $"cent_{userId.ToString()[..8]}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
        var receipt = receiptRaw.Length > 40 ? receiptRaw[..40] : receiptRaw;

        try
        {
            var orderAttrs = new Dictionary<string, object>
            {
                ["amount"]          = plan.AmountPaise,
                ["currency"]        = plan.Currency,
                ["receipt"]         = receipt,
                ["payment_capture"] = 1,
            };

            var order = client.Order.Create(orderAttrs);
            string orderId = (string)(order["id"] ?? "");
            Console.WriteLine($"[Billing] Order created: {orderId} user={userId} plan={plan.Id}");

            return Ok(new
            {
                orderId   = orderId,
                amount    = plan.AmountPaise,
                currency  = plan.Currency,
                keyId     = _config["Razorpay:KeyId"],
                planName  = plan.Name,
                userName  = user.FullName,
                userEmail = user.Email,
                userPhone = user.PhoneNumber,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Razorpay order creation failed user={UserId}", userId);
            return StatusCode(500, new { message = $"Could not create order: {ex.Message}" });
        }
    }

    // POST /api/Billing/verify  -- verifies HMAC signature and activates Pro
    [HttpPost("verify")]
    [Authorize]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest body, CancellationToken ct)
    {
        var client = GetClient();
        if (client == null)
            return StatusCode(503, new { message = "Razorpay not configured." });

        if (!Plans.All.TryGetValue(body.Plan, out var plan))
            return BadRequest(new { message = "Invalid plan." });

        // HMAC-SHA256 signature verification
        var keySecret = _config["Razorpay:KeySecret"]!;
        var payload   = $"{body.RazorpayOrderId}|{body.RazorpayPaymentId}";
        using var hmac = new System.Security.Cryptography.HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
        var hash       = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var computed   = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();

        if (!string.Equals(computed, body.RazorpaySignature, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Razorpay signature mismatch for order {OrderId}", body.RazorpayOrderId);
            return BadRequest(new { message = "Payment signature verification failed." });
        }

        var userId = GetCurrentUserId();
        var user   = await _context.Users.FindAsync(new object[] { userId }, ct);
        if (user == null) return NotFound();

        user.IsPremium         = true;
        user.ProPlan           = plan.Id;
        user.ProExpiresAt      = DateTime.UtcNow.AddDays(plan.Days);
        user.RazorpayPaymentId = body.RazorpayPaymentId;
        user.UpdatedAt         = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Pro activated user={UserId} plan={Plan} expires={Expires}", userId, plan.Id, user.ProExpiresAt);

        return Ok(new
        {
            paid      = true,
            plan      = plan.Id,
            expiresAt = user.ProExpiresAt,
            user = new { user.FullName, user.Email, user.IsPremium, user.ProPlan, user.ProExpiresAt },
        });
    }

    // POST /api/Billing/mock-activate  -- test mode only, no real payment
    [HttpPost("mock-activate")]
    [Authorize]
    public async Task<IActionResult> MockActivate([FromBody] MockActivateRequest body, CancellationToken ct)
    {
        var keyId = _config["Razorpay:KeyId"] ?? "";
        if (keyId.StartsWith("rzp_live_", StringComparison.OrdinalIgnoreCase))
            return StatusCode(403, new { message = "Mock activate is only allowed with test keys (rzp_test_...)." });

        var planKey = body.Plan ?? "monthly";
        if (!Plans.All.TryGetValue(planKey, out var plan))
            return BadRequest(new { message = "Invalid plan." });

        var userId = GetCurrentUserId();
        var user   = await _context.Users.FindAsync(new object[] { userId }, ct);
        if (user == null) return NotFound();

        user.IsPremium    = true;
        user.ProPlan      = plan.Id;
        user.ProExpiresAt = DateTime.UtcNow.AddDays(plan.Days);
        user.UpdatedAt    = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("[MOCK] Pro activated user={UserId} plan={Plan}", userId, plan.Id);
        return Ok(new { ok = true, plan = plan.Id, expiresAt = user.ProExpiresAt,
            user = new { user.FullName, user.IsPremium, user.ProPlan, user.ProExpiresAt } });
    }

    // POST /api/Billing/cancel
    [HttpPost("cancel")]
    [Authorize]
    public async Task<IActionResult> CancelPro(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var user   = await _context.Users.FindAsync(new object[] { userId }, ct);
        if (user == null) return NotFound();

        user.IsPremium    = false;
        user.ProPlan      = null;
        user.ProExpiresAt = null;
        user.UpdatedAt    = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return Ok(new { cancelled = true });
    }
}

public record CreateOrderRequest(string Plan);
public record VerifyPaymentRequest(string RazorpayOrderId, string RazorpayPaymentId, string RazorpaySignature, string Plan);
public record MockActivateRequest(string? Plan);
