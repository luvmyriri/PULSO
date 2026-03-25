@echo off
setlocal
set "ROOT_DIR=%~dp0"

echo [1/3] Setting up Backend...
cd "%ROOT_DIR%backend"
if not exist ".venv" (
    python -m venv .venv
)
call .venv\Scripts\activate
echo Installing Backend Requirements...
pip install -r requirements.txt
echo Backend Setup Complete!
echo.

echo [2/3] Setting up Frontend...
cd "%ROOT_DIR%frontend"
echo Installing Frontend Dependencies...
call npm install
echo Frontend Setup Complete!
echo.

echo [3/3] Setting up Mobile App...
cd "%ROOT_DIR%mobile_app"
echo Installing Flutter Dependencies...
call flutter pub get
echo Mobile App Setup Complete!
echo.

echo All Basic Dependencies Installed!
echo.
echo NEXT STEPS:
echo 1. Create a PostgreSQL database named 'pulso_db'.
echo 2. Update 'backend/.env' with your API keys.
echo 3. Run 'alembic upgrade head' in the backend directory.
echo 4. Start your servers!

pause
