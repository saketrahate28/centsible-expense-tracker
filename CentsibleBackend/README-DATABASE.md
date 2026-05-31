# Database setup (PostgreSQL)

## "Badges already exists" / `dotnet ef database update` fails

Your database has tables but **no EF migration history** (common after `EnsureCreated()`).

**Do not use** `dotnet ef database update` alone. Use one of these:

### Option A — Recommended (no psql needed)

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\Expense Tracker\CentsibleBackend\src\Centsible.Api"
dotnet run -- --migrate-only
```

Or run the script:

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\Expense Tracker\CentsibleBackend\scripts"
.\fix-ef-update.ps1
```

### Option B — Manual SQL + EF

```powershell
psql -U postgres -d CentsibleDB -f "C:\Users\ASUS\OneDrive\Desktop\Expense Tracker\CentsibleBackend\scripts\baseline-migrations.sql"
cd "C:\Users\ASUS\OneDrive\Desktop\Expense Tracker\CentsibleBackend\src\Centsible.Api"
dotnet ef database update --project ..\Centsible.Infrastructure
```

After Option B, `dotnet ef database update` will only apply new migrations (`SyncSmsMerchantAndDedup`, `AddSmsDedupKeyColumn`).

### Normal daily use

```powershell
cd CentsibleBackend\src\Centsible.Api
dotnet run
```

Startup runs migrations automatically via `ApplyMigrationsSafe()`.

## Connection string

Edit `appsettings.json` → `ConnectionStrings:DefaultConnection` if your Postgres password differs from `password`.
