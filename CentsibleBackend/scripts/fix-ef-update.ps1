# Fixes "relation Badges already exists" then applies pending EF migrations.
# Use this INSTEAD of raw "dotnet ef database update" when the DB already has tables.
$ErrorActionPreference = "Stop"

$apiDir = Join-Path $PSScriptRoot "..\src\Centsible.Api"
Push-Location $apiDir

Write-Host "Step 1: Baseline + migrate via API (safe for existing databases)..." -ForegroundColor Cyan
dotnet run -- --migrate-only
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Step 2: Verify EF sees no pending migrations..." -ForegroundColor Cyan
dotnet ef migrations list --project ..\Centsible.Infrastructure
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    exit $LASTEXITCODE
}

Pop-Location
Write-Host ""
Write-Host "Done. Database is ready. Start the API with: dotnet run" -ForegroundColor Green
