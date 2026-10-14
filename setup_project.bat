@echo off
setlocal
set "ROOT_DIR=%~dp0"
set "PYTHON_EXE=%ROOT_DIR%backend\.venv\Scripts\python.exe"

if not exist "%ROOT_DIR%.env" (
    echo [ERROR] Missing root .env. Copy .env.example and configure it.
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

if not exist "%PYTHON_EXE%" (
    where py >nul 2>&1
    if not errorlevel 1 (
        py -3.12 -m venv "%ROOT_DIR%backend\.venv" >nul 2>&1
    )
    if not exist "%PYTHON_EXE%" (
        where python >nul 2>&1
        if not errorlevel 1 (
            python -c "import sys; sys.exit(0 if sys.version_info[:2] == (3, 12) else 1)" >nul 2>&1
            if not errorlevel 1 python -m venv "%ROOT_DIR%backend\.venv"
        )
    )
)
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Python 3.12 was not found. Install it and rerun setup_project.bat.
    exit /b 1
)
"%PYTHON_EXE%" -c "import sys; sys.exit(0 if sys.version_info[:2] == (3, 12) else 1)" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] backend\.venv is not Python 3.12. Recreate this local venv, then retry.
    exit /b 1
)

echo Installing backend requirements...
"%PYTHON_EXE%" -m pip install -r "%ROOT_DIR%backend\requirements.txt"
if errorlevel 1 exit /b 1
echo Installing frontend dependencies from lockfile...
pushd "%ROOT_DIR%frontend"
call npm ci
set "NPM_RESULT=%ERRORLEVEL%"
popd
if not "%NPM_RESULT%"=="0" exit /b %NPM_RESULT%
echo Dependencies are ready. Start the database and run scripts\bootstrap_db.ps1 for a blank database.
