# Forwarding wrapper so .\start.ps1 works even when called from inside backend\
$rootScript = Join-Path (Split-Path -Parent $PSScriptRoot) "start.ps1"
& $rootScript @args
