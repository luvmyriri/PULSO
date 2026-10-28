param(
    [string]$Python = "python"
)

$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) {
    throw "Set DATABASE_URL explicitly before running bootstrap_db.ps1."
}
$env:PYTHONDONTWRITEBYTECODE = "1"
$repoRoot = Split-Path -Parent $PSScriptRoot
$helper = Join-Path $PSScriptRoot "db_schema.py"
$backend = Join-Path $repoRoot "backend"
$pythonExe = (Get-Command $Python -ErrorAction Stop).Source

& $pythonExe $helper bootstrap
if ($LASTEXITCODE -ne 0) { throw "Schema bootstrap failed." }

Push-Location $backend
try {
    & $pythonExe -m alembic -c alembic.ini stamp c455ca49f6d5
    if ($LASTEXITCODE -ne 0) { throw "Alembic stamp failed." }
    & $pythonExe -m alembic -c alembic.ini upgrade head
    if ($LASTEXITCODE -ne 0) { throw "Alembic upgrade failed." }
    & $pythonExe $helper assert-revision 19f0b2c3d4e5
    if ($LASTEXITCODE -ne 0) { throw "Unexpected Alembic revision." }
    & $pythonExe -m alembic -c alembic.ini current
    if ($LASTEXITCODE -ne 0) { throw "Could not read Alembic current." }
}
finally {
    Pop-Location
}
