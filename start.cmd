@echo off
title PULSO Launcher
cls
color 0B

echo ============================================================
echo               PULSO - CITY ENGINEERING SYSTEM
echo        Local Government Operations & Citizen Portal
echo ============================================================
echo.

:: Detect Python
set PYTHON_BIN=python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    where py >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set PYTHON_BIN=py
    ) else (
        echo [ERROR] Python was not found in PATH!
        echo Please install Python 3.10+ or add it to PATH.
        pause
        exit /b 1
    )
)

:: Detect Node / npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js / npm was not found in PATH!
    echo Please install Node.js (v18+) to run the frontend.
    pause
    exit /b 1
)

echo [1/3] Launching FastAPI Backend on http://localhost:33159...
start "PULSO Backend [Port 33159]" cmd /k "cd /d "%~dp0backend" && title PULSO Backend [Port 33159] && %PYTHON_BIN% main.py"

echo [2/3] Launching Vite Frontend on http://localhost:5173...
start "PULSO Frontend [Port 5173]" cmd /k "cd /d "%~dp0frontend" && title PULSO Frontend [Port 5173] && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Launching default web browser...
start http://localhost:5173

echo.
echo ============================================================
echo   PULSO SYSTEM IS RUNNING!
echo.
echo   * Citizen & Public Portal : http://localhost:5173
echo   * Issue Reporting (Guest)  : http://localhost:5173/report
echo   * Report Tracking          : http://localhost:5173/track
echo   * Government Operations    : http://localhost:5173/gov
echo   * Dispatcher GIS Console   : http://localhost:5173/gov/dispatcher
echo   * FastAPI Swagger Docs     : http://localhost:33159/docs
echo ============================================================
echo.
echo Keep the backend and frontend terminal windows open.
echo To shut down all services, run stop.bat or close the windows.
echo.
pause
