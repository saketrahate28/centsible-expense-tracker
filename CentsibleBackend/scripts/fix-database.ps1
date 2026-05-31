# Fixes "relation already exists" + applies pending migrations
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path $root "src\Centsible.Api"

Write-Host "Building API..."
dotnet build (Join-Path $api "Centsible.Api.csproj") -v q

Write-Host "Starting API briefly to run ApplyMigrationsSafe (auto-baseline)..."
Push-Location $api
$job = Start-Job { param($p) Set-Location $p; dotnet run --no-build 2>&1 } -ArgumentList $api
Start-Sleep -Seconds 12
Stop-Job $job -ErrorAction SilentlyContinue
Receive-Job $job | Select-Object -Last 25
Remove-Job $job -Force -ErrorAction SilentlyContinue
Pop-Location

Write-Host "Done. You can now run: dotnet run (from Centsible.Api)"
