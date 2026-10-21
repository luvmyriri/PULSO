# Forwarding wrapper so .\setup-docker-dev.ps1 works even when called from inside backend\
$rootScript = Join-Path (Split-Path -Parent $PSScriptRoot) "setup-docker-dev.ps1"
& $rootScript @args
