using Centsible.Application;
using Centsible.Infrastructure;
using Centsible.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Linq;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddHealthChecks();

// ── CORS ────────────────────────────────────────────────────────────────────
// SECURITY: Never use wildcard (*) CORS in production for a financial API.
var allowedOriginsRaw = builder.Configuration["AllowedOrigins"];
var allowedOrigins = allowedOriginsRaw?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            if (allowedOrigins.Length == 0)
                throw new InvalidOperationException(
                    "AllowedOrigins must be configured in production. " +
                    "Set the AllowedOrigins environment variable (comma-separated list of origins).");

            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSection = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSection["Key"];

// Hard fail in production if JWT key is not configured
if (string.IsNullOrWhiteSpace(secretKey))
{
    if (builder.Environment.IsProduction())
        throw new InvalidOperationException(
            "Jwt__Key is not configured. " +
            "Generate a strong key with: openssl rand -base64 64 " +
            "and set it as the Jwt__Key environment variable.");

    // Dev-only fallback
    secretKey = "CentsibleDevFallbackKey2026!DO_NOT_USE_IN_PROD!";
    Console.WriteLine("⚠️  [DEV] Using fallback JWT key. Set Jwt__Key in appsettings.Development.json!");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSection["Issuer"] ?? "CentsibleApi",
        ValidAudience = jwtSection["Audience"] ?? "CentsibleApp",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

builder.Services.AddAuthorization();

// Clean Architecture layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// CLI: dotnet run -- --migrate-only
if (args.Contains("--migrate-only", StringComparer.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    context.ApplyMigrationsSafe();
    Console.WriteLine("Migration complete. Exiting.");
    return;
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Enforce HTTPS in production
    app.UseHttpsRedirection();
    app.UseHsts();
}

app.UseCors();

// Authentication must come before Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ── Database Seed on Startup ─────────────────────────────────────────────────
try
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    context.ApplyMigrationsSafe();

    // Seed dev user (only in Development)
    if (app.Environment.IsDevelopment())
    {
        var userId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        if (!context.Users.Any(u => u.Id == userId))
        {
            context.Users.Add(new Centsible.Domain.Entities.User
            {
                Id = userId,
                FullName = "Aryan Sharma",
                Email = "aryan@centsible.app",
                Provider = "Google",
                IsOnboarded = true,
                CreatedAt = DateTime.UtcNow
            });
            context.SaveChanges();
        }

        var accountId = Guid.Parse("00000000-0000-0000-0000-000000000002");
        if (!context.Accounts.Any(a => a.Id == accountId))
        {
            context.Accounts.Add(new Centsible.Domain.Entities.Account
            {
                Id = accountId,
                UserId = userId,
                Name = "HDFC Savings",
                BankName = "HDFC Bank",
                MaskedAccountNumber = "1234",
                Type = Centsible.Domain.Enums.AccountType.Bank,
                CurrentBalance = 45000
            });
            context.SaveChanges();
        }
    }

    // ── Seed 9 Categories (global) ──────────────────────────────────────────
    // All 9 must match what the SMS parser and mobile app use.
    var categories = new List<Centsible.Domain.Entities.Category>
    {
        new() { Id = 1,  Name = "Transport",            Icon = "car",              ColorHex = "#60a5fa" },
        new() { Id = 2,  Name = "Food & Drinks",        Icon = "food",             ColorHex = "#f87171" },
        new() { Id = 3,  Name = "Shopping",             Icon = "shopping",         ColorHex = "#a78bfa" },
        new() { Id = 4,  Name = "Groceries",            Icon = "cart",             ColorHex = "#34d399" },
        new() { Id = 5,  Name = "Entertainment",        Icon = "movie",            ColorHex = "#fbbf24" },
        new() { Id = 6,  Name = "Bills & Utilities",    Icon = "receipt",          ColorHex = "#94a3b8" },
        new() { Id = 7,  Name = "Health",               Icon = "heart-pulse",      ColorHex = "#f43f5e" },
        new() { Id = 8,  Name = "Education",            Icon = "school",           ColorHex = "#22d3ee" },
        new() { Id = 9,  Name = "Investment & Finance", Icon = "trending-up",      ColorHex = "#a3e635" },
    };

    foreach (var cat in categories)
    {
        if (!context.Categories.Any(c => c.Id == cat.Id))
        {
            context.Categories.Add(cat);
        }
        else
        {
            // Update name/icon/color in case they changed
            var existing = context.Categories.Find(cat.Id);
            if (existing != null)
            {
                existing.Name = cat.Name;
                existing.Icon = cat.Icon;
                existing.ColorHex = cat.ColorHex;
            }
        }
    }
    context.SaveChanges();

    // Seed sample transaction (dev only)
    if (app.Environment.IsDevelopment())
    {
        var userId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var accountId = Guid.Parse("00000000-0000-0000-0000-000000000002");

        if (!context.Transactions.Any(t => t.UserId == userId))
        {
            context.Transactions.AddRange(new[]
            {
                new Centsible.Domain.Entities.Transaction
                {
                    UserId = userId, AccountId = accountId,
                    Amount = 1450, MerchantName = "Uber to Airport",
                    TransactionDate = DateTime.UtcNow.AddDays(-1),
                    PaymentMethod = Centsible.Domain.Enums.PaymentMethodType.GPay, CategoryId = 1
                },
                new Centsible.Domain.Entities.Transaction
                {
                    UserId = userId, AccountId = accountId,
                    Amount = 320, MerchantName = "Swiggy",
                    TransactionDate = DateTime.UtcNow.AddDays(-2),
                    PaymentMethod = Centsible.Domain.Enums.PaymentMethodType.PhonePe, CategoryId = 2
                },
                new Centsible.Domain.Entities.Transaction
                {
                    UserId = userId, AccountId = accountId,
                    Amount = 5000, MerchantName = "Amazon",
                    TransactionDate = DateTime.UtcNow.AddDays(-3),
                    PaymentMethod = Centsible.Domain.Enums.PaymentMethodType.CreditCard, CategoryId = 3
                }
            });
            context.SaveChanges();
        }
    }

    Console.WriteLine("✅ Database seeded successfully.");
}
catch (Exception ex)
{
    Console.WriteLine($"⚠️  Database seeding skipped: {ex.Message}");
}

app.MapHealthChecks("/health");

app.Run();
