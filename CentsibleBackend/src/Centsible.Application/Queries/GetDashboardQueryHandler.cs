using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Centsible.Application.DTOs;
using Centsible.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Centsible.Application.Queries;

public class GetDashboardQueryHandler : IRequestHandler<GetDashboardQuery, DashboardDto>
{
    private readonly IAppDbContext _context;

    public GetDashboardQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardDto> Handle(GetDashboardQuery request, CancellationToken cancellationToken)
    {
        var recentTransactions = await _context.Transactions
            .Where(t => t.UserId == request.UserId)
            .OrderByDescending(t => t.TransactionDate)
            .Take(10)
            .Select(t => new TransactionDto
            {
                Id = t.Id,
                Amount = t.Amount,
                TransactionDate = t.TransactionDate,
                MerchantName = t.MerchantName ?? "Unknown",
                CategoryName = t.Category != null ? t.Category.Name : "Uncategorized",
                PaymentMethod = t.PaymentMethod.ToString()
            })
            .ToListAsync(cancellationToken);

        var firstDayOfMonth = DateTime.SpecifyKind(new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1), DateTimeKind.Utc);
        var monthlySpending = await _context.Transactions
            .Where(t => t.UserId == request.UserId && t.TransactionDate >= firstDayOfMonth)
            .SumAsync(t => Math.Abs(t.Amount), cancellationToken);

        // Aggregate real balance across all active accounts
        var totalBalance = await _context.Accounts
            .Where(a => a.UserId == request.UserId && a.IsActive)
            .SumAsync(a => a.CurrentBalance, cancellationToken);

        // Use budget limit if set, otherwise fall back to ₹25,000
        var activeBudget = await _context.Budgets
            .Where(b => b.UserId == request.UserId && b.CategoryId == null)
            .OrderByDescending(b => b.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var monthlyLimit = activeBudget?.AmountLimit ?? 25000m;

        return new DashboardDto
        {
            TotalBalance = totalBalance,
            MonthlySpending = monthlySpending,
            MonthlyLimit = monthlyLimit,
            RecentTransactions = recentTransactions
        };
    }
}
