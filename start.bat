@echo off
setlocal
set "ROOT_DIR=%~dp0"
set "PYTHON_EXE=%ROOT_DIR%backend\.venv\Scripts\python.exe"

if not exist "%ROOT_DIR%.env" (
    echo [ERROR] Missing root .env for Docker Compose. Copy .env.example and configure it.
    exit /b 1
)
if not exist "%ROOT_DIR%backend\.env" (
    echo [ERROR] Missing backend\.env. Copy backend\.env.example and configure it.
    exit /b 1
)
if not exist "%ROOT_DIR%frontend\.env" (
    echo [ERROR] Missing frontend\.env. Copy frontend\.env.example and configure it.
    exit /b 1
)
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Missing backend\.venv. Run setup_project.bat first.
    exit /b 1
)
"%PYTHON_EXE%" -c "import sys; sys.exit(0 if sys.version_info[:2] == (3, 12) else 1)" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] backend\.venv must use Python 3.12. Recreate it with setup_project.bat.
    exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is missing. Install Node 20.19+ or 22.12+.
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is missing. Install Node 20.19+ or 22.12+.
    exit /b 1
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit((major===20&&minor>=19)||(major===22&&minor>=12)||major>22?0:1)"
if errorlevel 1 (
    echo [ERROR] Node 20.19+ or 22.12+ is required.
    exit /b 1
)

echo Starting PULSO backend on http://127.0.0.1:33159
start "PULSO Backend" /D "%ROOT_DIR%backend" "%PYTHON_EXE%" -m uvicorn main:app --reload --host 127.0.0.1 --port 33159
echo Starting PULSO frontend on http://127.0.0.1:5173
start "PULSO Frontend" /D "%ROOT_DIR%frontend" cmd /k "npm run dev -- --host 127.0.0.1"
echo Both servers have been launched in separate windows.
