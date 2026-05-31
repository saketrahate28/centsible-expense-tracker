using Centsible.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Centsible.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly IWebHostEnvironment _env;

    public UsersController(IAppDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (claim != null && Guid.TryParse(claim, out var userId))
            return userId;
        if (_env.IsDevelopment())
            return Guid.Parse("00000000-0000-0000-0000-000000000001");
        throw new UnauthorizedAccessException("Authentication required.");
    }

    /// <summary>PATCH /api/Users/me/name — update the current user's display name.</summary>
    [HttpPatch("me/name")]
    public async Task<IActionResult> UpdateName([FromBody] UpdateNameRequest request, CancellationToken cancellationToken)
    {
        var name = request.FullName?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
            return BadRequest(new { message = "Name must be at least 2 characters." });

        if (name.Length > 100)
            return BadRequest(new { message = "Name must be 100 characters or fewer." });

        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync([userId], cancellationToken);
        if (user == null) return NotFound();

        user.FullName = name;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { fullName = user.FullName });
    }

    /// <summary>GET /api/Users/me/accounts — list all active accounts for the Account Switcher.</summary>
    [HttpGet("me/accounts")]
    public async Task<IActionResult> GetMyAccounts(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        var accounts = await _context.Accounts
            .Where(a => a.UserId == userId && a.IsActive)
            .OrderBy(a => a.Name)
            .Select(a => new
            {
                id = a.Id,
                name = a.Name,
                bankName = a.BankName,
                maskedNumber = a.MaskedAccountNumber,
                type = a.Type.ToString(),
                balance = a.CurrentBalance,
                isActive = a.IsActive,
            })
            .ToListAsync(cancellationToken);

        return Ok(accounts);
    }

    /// <summary>PATCH /api/Users/me/onboarding — mark the user as onboarded.</summary>
    [HttpPatch("me/onboarding")]
    public async Task<IActionResult> CompleteOnboarding([FromBody] UsersOnboardingRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync([userId], cancellationToken);
        if (user == null) return NotFound();

        user.IsOnboarded = true;
        user.UpdatedAt = DateTime.UtcNow;

        if (request.Age.HasValue) user.Age = request.Age.Value;
        if (!string.IsNullOrWhiteSpace(request.City)) user.City = request.City.Trim();
        if (request.ExpectedBankAccountsCount.HasValue)
            user.ExpectedBankAccountsCount = request.ExpectedBankAccountsCount.Value;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { isOnboarded = true });
    }

    /// <summary>POST /api/Users/me/accounts — add a new bank account for the Account Switcher.</summary>
    [HttpPost("me/accounts")]
    public async Task<IActionResult> AddAccount([FromBody] AddAccountRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Account name is required." });

        var account = new Centsible.Domain.Entities.Account
        {
            UserId = userId,
            Name = request.Name.Trim(),
            BankName = request.BankName?.Trim(),
            MaskedAccountNumber = request.Last4Digits?.Trim(),
            Type = request.Type ?? Centsible.Domain.Enums.AccountType.Bank,
            CurrentBalance = request.InitialBalance ?? 0,
            IsActive = true,
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync(cancellationToken);

        return Created($"/api/Users/me/accounts/{account.Id}", new
        {
            id = account.Id,
            name = account.Name,
            bankName = account.BankName,
            maskedNumber = account.MaskedAccountNumber,
            type = account.Type.ToString(),
            balance = account.CurrentBalance,
        });
    }

    /// <summary>POST /api/Users/me/budget — set/update the current user's monthly budget limit.</summary>
    [HttpPost("me/budget")]
    public async Task<IActionResult> SetBudgetLimit([FromBody] SetBudgetLimitRequest request, CancellationToken cancellationToken)
    {
        if (request.Limit <= 0)
            return BadRequest(new { message = "Limit must be a positive number." });

        var userId = GetCurrentUserId();

        var budget = await _context.Budgets
            .Where(b => b.UserId == userId && b.CategoryId == null)
            .OrderByDescending(b => b.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (budget == null)
        {
            budget = new Centsible.Domain.Entities.Budget
            {
                UserId = userId,
                CategoryId = null,
                AmountLimit = request.Limit,
                Period = Centsible.Domain.Enums.PeriodType.Monthly
            };
            _context.Budgets.Add(budget);
        }
        else
        {
            budget.AmountLimit = request.Limit;
            budget.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { limit = budget.AmountLimit });
    }
}

public class SetBudgetLimitRequest
{
    public decimal Limit { get; set; }
}

public class UpdateNameRequest
{
    public string? FullName { get; set; }
}

public class UsersOnboardingRequest
{
    public int? Age { get; set; }
    public string? City { get; set; }
    public int? ExpectedBankAccountsCount { get; set; }
}

public class AddAccountRequest
{
    public string Name { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public string? Last4Digits { get; set; }
    public Centsible.Domain.Enums.AccountType? Type { get; set; }
    public decimal? InitialBalance { get; set; }
}
