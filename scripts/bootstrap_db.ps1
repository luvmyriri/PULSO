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

& $Python $helper bootstrap
if ($LASTEXITCODE -ne 0) { throw "Schema bootstrap failed." }

Push-Location $backend
try {
    & $Python -m alembic -c alembic.ini stamp c455ca49f6d5
    if ($LASTEXITCODE -ne 0) { throw "Alembic stamp failed." }
    & $Python -m alembic -c alembic.ini upgrade head
    if ($LASTEXITCODE -ne 0) { throw "Alembic upgrade failed." }
    & $Python $helper assert-revision a9c6e4b2d1f0
    if ($LASTEXITCODE -ne 0) { throw "Unexpected Alembic revision." }
    & $Python -m alembic -c alembic.ini current
    if ($LASTEXITCODE -ne 0) { throw "Could not read Alembic current." }
}
finally {
    Pop-Location
}
