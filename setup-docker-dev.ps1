# ============================================================================
# PULSO — One-Command Docker PostGIS + LightGBM + Full-Stack Developer Setup
# Branch: ValFinalization
# ============================================================================
param(
    [int]$PostgresPort = 5433,
    [string]$PostgresDb = "pulso_db",
    [string]$PostgresUser = "postgres",
    [string]$PostgresPassword = "pulso_local_dev"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RootDir) { $RootDir = (Get-Location).Path }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   PULSO — DOCKER POSTGIS + LIGHTGBM + DEV ENVIRONMENT SETUP" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Root .env for Docker Compose
$RootEnv = Join-Path $RootDir ".env"
if (-not (Test-Path $RootEnv)) {
    @"
POSTGRES_DB=$PostgresDb
POSTGRES_USER=$PostgresUser
POSTGRES_PASSWORD=$PostgresPassword
POSTGRES_PORT=$PostgresPort
"@ | Set-Content -Path $RootEnv -Encoding UTF8
    Write-Host "[1/6] Created root .env for Docker Compose (Port $PostgresPort)" -ForegroundColor Green
} else {
    Write-Host "[1/6] Root .env already exists" -ForegroundColor Gray
}

# 2. Backend .env.local for FastAPI + Alembic + SMS
$BackendDir = Join-Path $RootDir "backend"
$BackendEnvLocal = Join-Path $BackendDir ".env.local"
$DbUrl = "postgresql+psycopg2://${PostgresUser}:${PostgresPassword}@127.0.0.1:${PostgresPort}/${PostgresDb}"

if (-not (Test-Path $BackendEnvLocal)) {
    $JwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
    @"
DATABASE_URL=$DbUrl
JWT_SECRET_KEY=$JwtSecret
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SMS_PROVIDER=textbee
TEXTBEE_ENABLE_OUTBOUND=false
TEXTBEE_API_KEY=
TEXTBEE_DEVICE_ID=
"@ | Set-Content -Path $BackendEnvLocal -Encoding UTF8
    Write-Host "[2/6] Created backend/.env.local with local PostGIS DATABASE_URL" -ForegroundColor Green
} else {
    Write-Host "[2/6] backend/.env.local already exists" -ForegroundColor Gray
}

# 3. Start Docker PostGIS container (if Docker is running)
$DockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($DockerCmd) {
    Write-Host "[3/6] Starting PostGIS 18-3.6 container via Docker Compose..." -ForegroundColor Cyan
    Push-Location $RootDir
    try {
        docker compose up -d db
        Write-Host "      Waiting for PostGIS container to become healthy..." -ForegroundColor Gray
        for ($i = 0; $i -lt 20; $i++) {
            $status = docker inspect --format="{{.State.Health.Status}}" pulso-postgis-db 2>$null
            if ($status -eq "healthy") { break }
            Start-Sleep -Seconds 2
        }
        Write-Host "      PostGIS container is ready on 127.0.0.1:$PostgresPort" -ForegroundColor Green
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[3/6] Docker CLI not found; assuming local PostGIS is running on 127.0.0.1:$PostgresPort" -ForegroundColor Yellow
}

# 4. Python Virtual Environment & Dependencies
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$VenvHealthy = $false
if (Test-Path $VenvPython) {
    try {
        & $VenvPython -c "import sys" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $VenvHealthy = $true }
    } catch {
        $VenvHealthy = $false
    }
}
if (-not $VenvHealthy) {
    Write-Host "[4/6] Creating/repairing Python virtual environment in backend/.venv..." -ForegroundColor Cyan
    Push-Location $BackendDir
    try {
        python -m venv --clear .venv
    } finally {
        Pop-Location
    }
}
Write-Host "[4/6] Installing backend requirements (FastAPI, PostGIS/GeoAlchemy2, LightGBM, Vertex GenAI)..." -ForegroundColor Cyan
& $VenvPython -m pip install --upgrade pip --quiet
& $VenvPython -m pip install -r (Join-Path $BackendDir "requirements.txt") --quiet
$SysPython = Get-Command python -ErrorAction SilentlyContinue
if ($SysPython) {
    try {
        & $SysPython.Source -m pip install -r (Join-Path $BackendDir "requirements.txt") --quiet 2>$null
    } catch {}
}

# 5. Bootstrap PostGIS Schema, Run Alembic Migrations & Seed Empirical Assets
Write-Host "[5/6] Bootstrapping PostGIS schema, running Alembic migrations, and seeding LightGBM data..." -ForegroundColor Cyan
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = $DbUrl
}
Push-Location $BackendDir
try {
    & $VenvPython -m alembic upgrade head 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      Running PostGIS schema bootstrap / reconciliation..." -ForegroundColor Yellow
        try {
            & (Join-Path $RootDir "scripts\bootstrap_db.ps1") -Python $VenvPython 2>$null
        } catch {
            Write-Host "      Existing non-empty database detected; reconciling missing tables & columns via seed script..." -ForegroundColor Yellow
        }
    }
} finally {
    Pop-Location
}

& $VenvPython (Join-Path $RootDir "scripts\seed_dev_postgis_and_lightgbm.py")

# 6. Frontend Dependencies
$FrontendDir = Join-Path $RootDir "frontend"
Write-Host "[6/6] Installing frontend npm dependencies..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    npm install
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE! Start the system anytime with: .\start.ps1" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
