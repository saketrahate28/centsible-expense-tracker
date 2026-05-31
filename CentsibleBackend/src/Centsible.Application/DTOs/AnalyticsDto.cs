using System.Collections.Generic;

namespace Centsible.Application.DTOs;

public class CategorySpendingDto
{
    public string CategoryName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}

public class SpendingTrendDto
{
    public string Label { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class AnalyticsDto
{
    public decimal TotalSpend { get; set; }
    public string SpendTrendPercentage { get; set; } = string.Empty;
    public List<CategorySpendingDto> Categories { get; set; } = new();
    public List<SpendingTrendDto> Trends { get; set; } = new();
    public string AiInsight { get; set; } = string.Empty;
}
