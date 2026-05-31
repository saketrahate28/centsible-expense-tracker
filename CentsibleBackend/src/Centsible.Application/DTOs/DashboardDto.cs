using System;
using System.Collections.Generic;

namespace Centsible.Application.DTOs;

public class TransactionDto
{
    public Guid Id { get; set; }
    public string? MerchantName { get; set; }
    public string? CategoryName { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? PaymentMethod { get; set; }
}

public class DashboardDto
{
    public decimal TotalBalance { get; set; }
    public decimal MonthlySpending { get; set; }
    public decimal MonthlyLimit { get; set; }
    public List<TransactionDto> RecentTransactions { get; set; } = new();
}
