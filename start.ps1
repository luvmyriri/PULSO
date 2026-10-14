# PULSO PowerShell Native Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "              PULSO - CITY ENGINEERING SYSTEM" -ForegroundColor White
Write-Host "       Local Government Operations & Citizen Portal" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $rootDir) { $rootDir = Get-Location }

# Check Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command py -ErrorAction SilentlyContinue
}
if (-not $pythonCmd) {
    Write-Host "[ERROR] Python was not found in PATH!" -ForegroundColor Red
    return
}

# Check NPM
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "[ERROR] Node.js / npm was not found in PATH!" -ForegroundColor Red
    return
}

Write-Host "[1/3] Launching FastAPI Backend on http://localhost:33159..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$rootDir\backend`" && title PULSO Backend [Port 33159] && $($pythonCmd.Name) main.py"

Write-Host "[2/3] Launching Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$rootDir\frontend`" && title PULSO Frontend [Port 5173] && npm run dev"

Write-Host "[3/3] Waiting for servers to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 3

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
