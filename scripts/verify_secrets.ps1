$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$python = Join-Path $root 'backend/.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    throw 'Create backend/.venv first.'
}
& $python (Join-Path $PSScriptRoot 'verify_secrets.py')
exit $LASTEXITCODE
