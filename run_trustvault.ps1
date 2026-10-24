# TrustVault PowerShell Launcher
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       TrustVault - Secure Document Platform" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

# 1. Start Backend in new window
Write-Host "[1/2] Starting Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root`" && .venv\Scripts\python.exe run_backend.py"

Start-Sleep -Seconds 3

# 2. Start Frontend in new window
Write-Host "[2/2] Starting Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root\frontend`" && npm run dev"

Start-Sleep -Seconds 3

# 3. Open browser
Write-Host "Opening http://localhost:5173/login in browser..." -ForegroundColor Green
Start-Process "http://localhost:5173/login"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "TrustVault is running! Keep server windows open." -ForegroundColor Green
Write-Host "Demo Logins:" -ForegroundColor White
Write-Host "  Admin:  admin@trustvault.com / AdminPass123!" -ForegroundColor Magenta
Write-Host "  Owner:  alice.owner@trustvault.com / AlicePass123!" -ForegroundColor Blue
Write-Host "  Viewer: bob.viewer@trustvault.com / BobPass123!" -ForegroundColor DarkCyan
Write-Host "====================================================" -ForegroundColor Green
