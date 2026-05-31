using Centsible.Application.Interfaces;
using Centsible.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Centsible.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IAppDbContext _context;

    public UserController(IAppDbContext context)
    {
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (claim != null && Guid.TryParse(claim, out var userId))
            return userId;
        throw new UnauthorizedAccessException("Invalid token.");
    }

    /// <summary>
    /// Complete the onboarding flow for a newly registered user.
    /// Saves their age, phone number, bank accounts count, and city.
    /// </summary>
    [HttpPost("onboard")]
    public async Task<IActionResult> CompleteOnboarding([FromBody] OnboardingRequest request, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null) return NotFound(new { message = "User not found." });

        // Update profile with onboarding data
        if (!string.IsNullOrWhiteSpace(request.FullName))
            user.FullName = request.FullName.Trim();

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            user.PhoneNumber = request.PhoneNumber.Trim();

        if (request.Age is > 0 and <= 120)
            user.Age = request.Age;

        if (request.ExpectedBankAccountsCount is > 0 and <= 20)
            user.ExpectedBankAccountsCount = request.ExpectedBankAccountsCount;

        if (!string.IsNullOrWhiteSpace(request.City))
            user.City = request.City.Trim();

        user.IsOnboarded = true;

        await _context.SaveChangesAsync(ct);

        return Ok(new
        {
            message = "Onboarding complete!",
            user = new
            {
                id = user.Id,
                fullName = user.FullName,
                email = user.Email,
                phone = user.PhoneNumber,
                age = user.Age,
                city = user.City,
                expectedBankAccountsCount = user.ExpectedBankAccountsCount,
                isPremium = user.IsPremium,
                isOnboarded = user.IsOnboarded,
                avatarUrl = user.AvatarUrl
            }
        });
    }

    /// <summary>
    /// Update the user's city (called after location permission is granted).
    /// </summary>
    [HttpPatch("city")]
    public async Task<IActionResult> UpdateCity([FromBody] UpdateCityRequest request, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null) return NotFound();

        user.City = request.City?.Trim();
        await _context.SaveChangesAsync(ct);

        return Ok(new { message = "City updated.", city = user.City });
    }
}

// --- Request DTOs ---
public class OnboardingRequest
{
    public string? FullName { get; set; }
    public string? PhoneNumber { get; set; }
    public int? Age { get; set; }
    public int ExpectedBankAccountsCount { get; set; } = 1;
    public string? City { get; set; }
}

public class UpdateCityRequest
{
    public string? City { get; set; }
}
