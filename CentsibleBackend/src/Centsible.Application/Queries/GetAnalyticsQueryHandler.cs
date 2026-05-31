using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Centsible.Application.DTOs;
using Centsible.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Centsible.Application.Queries;

public class GetAnalyticsQueryHandler : IRequestHandler<GetAnalyticsQuery, AnalyticsDto>
{
    private readonly IAppDbContext _context;

    public GetAnalyticsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<AnalyticsDto> Handle(GetAnalyticsQuery request, CancellationToken cancellationToken)
    {
        var startDate = GetStartDate(request.Timeframe);
        var previousStartDate = GetPreviousStartDate(request.Timeframe, startDate);

        var transactions = await _context.Transactions
            .Include(t => t.Category)
            .Where(t => t.UserId == request.UserId && t.TransactionDate >= startDate)
            .ToListAsync(cancellationToken);

        // Fetch previous period for trend comparison
        var previousTransactions = await _context.Transactions
            .Where(t => t.UserId == request.UserId
                     && t.TransactionDate >= previousStartDate
                     && t.TransactionDate < startDate)
            .ToListAsync(cancellationToken);

        var totalSpend = transactions.Sum(t => Math.Abs(t.Amount));
        var previousSpend = previousTransactions.Sum(t => Math.Abs(t.Amount));

        var spendTrend = previousSpend > 0
            ? ((totalSpend - previousSpend) / previousSpend) * 100
            : (totalSpend > 0 ? 100m : 0m);
        var trendSign = spendTrend >= 0 ? "+" : "";
        var trendText = $"{trendSign}{spendTrend:F0}% vs last {request.Timeframe.ToLower()}";

        var categoryBreakdown = transactions
            .GroupBy(t => t.Category?.Name ?? "Uncategorized")
            .Select(g => new CategorySpendingDto
            {
                CategoryName = g.Key,
                Amount = g.Sum(t => Math.Abs(t.Amount)),
                Icon = GetCategoryIcon(g.Key),
                Color = GetCategoryColor(g.Key)
            })
            .OrderByDescending(c => c.Amount)
            .ToList();

        // Calculate trends based on timeframe
        var trends = GetTrends(transactions, request.Timeframe);

        // Dynamic AI insight based on actual top category
        var topCategory = categoryBreakdown.FirstOrDefault();
        var aiInsight = GenerateInsight(topCategory?.CategoryName, spendTrend, totalSpend);

        return new AnalyticsDto
        {
            TotalSpend = totalSpend,
            SpendTrendPercentage = trendText,
            Categories = categoryBreakdown,
            Trends = trends,
            AiInsight = aiInsight
        };
    }

    private DateTime GetStartDate(string timeframe)
    {
        return timeframe switch
        {
            "Week" => DateTime.UtcNow.AddDays(-7),
            "Year" => DateTime.SpecifyKind(new DateTime(DateTime.UtcNow.Year, 1, 1), DateTimeKind.Utc),
            _ => DateTime.SpecifyKind(new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1), DateTimeKind.Utc),
        };
    }

    private DateTime GetPreviousStartDate(string timeframe, DateTime currentStart)
    {
        return timeframe switch
        {
            "Week" => currentStart.AddDays(-7),
            "Year" => currentStart.AddYears(-1),
            _ => currentStart.AddMonths(-1),
        };
    }

    private static string GenerateInsight(string? topCategory, decimal trendPct, decimal totalSpend)
    {
        if (totalSpend == 0)
            return "No transactions yet. Start syncing your bank SMS to see spending insights! 🚀";

        var categoryPart = topCategory switch
        {
            "Food & Drinks" => "Food & drinks are your top spend. Try cooking at home a few times this week 🍳",
            "Transport" => "Transport is eating your budget. Consider carpooling or public transit 🚌",
            "Shopping" => "Shopping is your biggest category. Check if any purchases can wait till a sale 🛍️",
            "Entertainment" => "Entertainment is your top spend. A great sign you're enjoying life — just keep it balanced 🎬",
            "Groceries" => "Groceries are your top spend. Meal planning can cut this by up to 20% 🥦",
            "Bills & Utilities" => "Bills are your largest expense. Review subscriptions you might not be using 📋",
            "Health" => "You're investing in your health — great priority! 💪",
            "Education" => "Learning is your top investment. That's money well spent! 📚",
            "Investment & Finance" => "You're actively investing — excellent financial habit! 📈",
            _ => $"Your top category is {topCategory}. Keep an eye on it this week 👀"
        };

        if (trendPct > 20)
            return $"⚠️ Spending up {trendPct:F0}% vs last period. {categoryPart}";
        if (trendPct < -10)
            return $"🎉 Great job! Spending down {Math.Abs(trendPct):F0}% vs last period. {categoryPart}";
        return categoryPart;
    }

    private List<SpendingTrendDto> GetTrends(List<Domain.Entities.Transaction> transactions, string timeframe)
    {
        if (timeframe == "Week")
        {
            return transactions
                .GroupBy(t => t.TransactionDate.DayOfWeek)
                .OrderBy(g => g.Key)
                .Select(g => new SpendingTrendDto { Label = g.Key.ToString().Substring(0, 3), Amount = g.Sum(t => t.Amount) })
                .ToList();
        }
        
        if (timeframe == "Year")
        {
            return transactions
                .GroupBy(t => t.TransactionDate.Month)
                .OrderBy(g => g.Key)
                .Select(g => new SpendingTrendDto { Label = new DateTime(2000, g.Key, 1).ToString("MMM"), Amount = g.Sum(t => t.Amount) })
                .ToList();
        }

        // Monthly default: Group by week of month
        return transactions
            .GroupBy(t => (t.TransactionDate.Day - 1) / 7 + 1)
            .OrderBy(g => g.Key)
            .Select(g => new SpendingTrendDto { Label = "W" + g.Key, Amount = g.Sum(t => t.Amount) })
            .ToList();
    }

    private string GetCategoryIcon(string name)
    {
        return name switch
        {
            "Food & Drinks" => "fast-food",
            "Transport" => "car",
            "Shopping" => "cart",
            "Entertainment" => "game-controller",
            _ => "cash"
        };
    }

    private string GetCategoryColor(string name)
    {
        return name switch
        {
            "Food & Drinks" => "#FF7676",
            "Transport" => "#66D4CF",
            "Shopping" => "#FFB86C",
            "Entertainment" => "#A066F5",
            _ => "#A0A0A0"
        };
    }
}
