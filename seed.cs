using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Centsible.Infrastructure.Data;
using Centsible.Domain.Entities;
using Centsible.Domain.Enums;

var services = new ServiceCollection();
services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql("Host=localhost;Database=CentsibleDB;Username=postgres;Password=password"));

var serviceProvider = services.BuildServiceProvider();
using var scope = serviceProvider.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

db.Database.EnsureCreated();

var userId = Guid.Parse("00000000-0000-0000-0000-000000000001");
var user = db.Users.FirstOrDefault(u => u.Id == userId);
if (user == null)
{
    user = new User 
    { 
        Id = userId, 
        FullName = "Test User", 
        Email = "test@example.com", 
        Provider = "Google",
        CreatedAt = DateTime.UtcNow 
    };
    db.Users.Add(user);
    db.SaveChanges();
    Console.WriteLine("User created.");
}

var accountId = Guid.Parse("00000000-0000-0000-0000-000000000002");
var account = db.Accounts.FirstOrDefault(a => a.Id == accountId);
if (account == null)
{
    account = new Account
    {
        Id = accountId,
        UserId = userId,
        Name = "Primary Account",
        Type = AccountType.Savings,
        CurrentBalance = 50000
    };
    db.Accounts.Add(account);
    db.SaveChanges();
    Console.WriteLine("Account created.");
}

if (!db.Transactions.Any(t => t.UserId == userId))
{
    db.Transactions.Add(new Transaction
    {
        UserId = userId,
        AccountId = accountId,
        Amount = 1200,
        MerchantName = "Grocery at Star Bazar",
        TransactionDate = DateTime.UtcNow,
        PaymentMethod = PaymentMethodType.GPay,
        CategoryId = 1 // Food & Drinks
    });
    db.SaveChanges();
    Console.WriteLine("Transaction created.");
}

Console.WriteLine("Seeding complete.");
