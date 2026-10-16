@echo off
title PULSO Shutdown
cls
echo ============================================================
echo               PULSO - STOPPING ALL SERVICES
echo ============================================================
echo.

echo Stopping processes on port 33159 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":33159 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo Killed Backend process PID: %%a
)

echo Stopping processes on port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo Killed Frontend process PID: %%a
)

echo.
echo All PULSO services stopped.
timeout /t 2 /nobreak >nul
