using Centsible.Application.Commands;
using Centsible.Application.DTOs;
using Centsible.Application.Interfaces;
using Centsible.Application.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading;

namespace Centsible.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICategoryPredictionService _predictionService;
    private readonly IAppDbContext _context;
    private readonly IWebHostEnvironment _env;

    public TransactionsController(
        IMediator mediator,
        ICategoryPredictionService predictionService,
        IAppDbContext context,
        IWebHostEnvironment env)
    {
        _mediator = mediator;
        _predictionService = predictionService;
        _context = context;
        _env = env;
    }

    [HttpPost("predict-category")]
    [AllowAnonymous]
    public IActionResult PredictCategory([FromBody] PredictCategoryRequest request)
    {
        var categoryId = _predictionService.PredictCategoryId(request.Merchant, request.Note);
        return Ok(new { CategoryId = categoryId });
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

    private async Task<Guid> ResolveAccountIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        var account = await _context.Accounts
            .Where(a => a.UserId == userId && a.IsActive)
            .OrderBy(a => a.Name)
            .FirstOrDefaultAsync(cancellationToken);

        if (account == null)
            throw new InvalidOperationException($"No active account for user {userId}.");

        return account.Id;
    }

    [HttpGet("dashboard")]
    [Authorize]
    public async Task<ActionResult<DashboardDto>> GetDashboard(CancellationToken cancellationToken)
    {
        var query = new GetDashboardQuery { UserId = GetCurrentUserId() };
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("analytics")]
    [Authorize]
    public async Task<ActionResult<AnalyticsDto>> GetAnalytics([FromQuery] string timeframe = "Month", CancellationToken cancellationToken = default)
    {
        var query = new GetAnalyticsQuery { UserId = GetCurrentUserId(), Timeframe = timeframe };
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpPost("sms")]
    public async Task<IActionResult> ParseSmsTransaction([FromBody] SmsTransactionDto smsData, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var accountId = await ResolveAccountIdAsync(userId, cancellationToken);

        var command = new SaveSmsTransactionCommand
        {
            UserId = userId,
            AccountId = accountId,
            SmsData = smsData
        };

        var transactionId = await _mediator.Send(command, cancellationToken);

        return Accepted(new { transactionId, TransactionId = transactionId, Status = "Saved" });
    }

    // PATCH endpoint to update transaction category
    [HttpPatch("{id}/category")]
    [Authorize]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateCategoryDto dto, CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (transaction == null)
            return NotFound();

        transaction.CategoryId = dto.CategoryId;
        await _context.SaveChangesAsync(cancellationToken);

        var result = new TransactionDto
        {
            Id = transaction.Id,
            Amount = transaction.Amount,
            TransactionDate = transaction.TransactionDate,
            MerchantName = transaction.MerchantName ?? "Unknown",
            CategoryName = transaction.Category != null ? transaction.Category.Name : "Uncategorized",
            PaymentMethod = transaction.PaymentMethod.ToString()
        };
        return Ok(result);
    }
}

public class PredictCategoryRequest
{
    public string? Merchant { get; set; }
    public string? Note { get; set; }
}
