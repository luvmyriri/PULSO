# PULSO PowerShell Native Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "              PULSO - CITY ENGINEERING SYSTEM" -ForegroundColor White
Write-Host "       Local Government Operations & Citizen Portal" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $rootDir) { $rootDir = (Get-Location).Path }

Write-Host "[1/3] Launching FastAPI Backend on http://localhost:33159..." -ForegroundColor Green
$backendBat = Join-Path $rootDir "backend\run_backend.bat"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$backendBat`"" -WorkingDirectory (Join-Path $rootDir "backend")

Write-Host "[2/3] Launching Vite Frontend on http://localhost:5173..." -ForegroundColor Green
$frontendBat = Join-Path $rootDir "frontend\run_frontend.bat"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$frontendBat`"" -WorkingDirectory (Join-Path $rootDir "frontend")

Write-Host "[3/3] Waiting for servers to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host "Launching default web browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PULSO SYSTEM IS RUNNING!" -ForegroundColor Green
Write-Host ""
Write-Host "  * Citizen & Public Portal : http://localhost:5173" -ForegroundColor White
Write-Host "  * Issue Reporting (Guest)  : http://localhost:5173/report" -ForegroundColor White
Write-Host "  * Report Tracking          : http://localhost:5173/track" -ForegroundColor White
Write-Host "  * Government Operations    : http://localhost:5173/gov" -ForegroundColor White
Write-Host "  * Dispatcher GIS Console   : http://localhost:5173/gov/dispatcher" -ForegroundColor White
Write-Host "  * FastAPI Swagger Docs     : http://localhost:33159/docs" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop servers, run: .\stop.bat" -ForegroundColor Yellow
