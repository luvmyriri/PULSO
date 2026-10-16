param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
        'JWT_SECRET_KEY', 'DATABASE_URL', 'POSTGRES_PASSWORD',
        'GOOGLE_MAPS_API_KEY', 'VITE_GOOGLE_MAPS_API_KEY',
        'GOOGLE_VISION_API_KEY', 'GOOGLE_GEMINI_API_KEY',
        'OCR_API_KEY', 'SMTP_PASS', 'RECAPTCHA_SECRET_KEY',
        'VITE_RECAPTCHA_SITE_KEY', 'PHILSYS_API_ID',
        'PHILSYS_API_SECRET', 'PHILSYS_QR_COOKIE', 'PHILSYS_PUBLIC_KEY'
    )]
    [string]$Key
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ($Key -eq 'POSTGRES_PASSWORD') {
    $path = Join-Path $root '.env'
} elseif ($Key.StartsWith('VITE_')) {
    $path = Join-Path $root 'frontend/.env'
} else {
    $path = Join-Path $root 'backend/.env'
}
if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing local environment file for $Key. Copy the matching .env.example first."
}

$secure = Read-Host "New value for $Key" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ([string]::IsNullOrWhiteSpace($value) -or $value.Contains([char]10) -or $value.Contains([char]13)) {
        throw 'The value must be nonempty and one line.'
    }
    $lines = [System.Collections.Generic.List[string]]::new()
    $found = $false
    foreach ($line in [System.IO.File]::ReadAllLines($path)) {
        if ($line -match ('^' + [regex]::Escape($Key) + '=')) {
            if (-not $found) { $lines.Add("$Key=$value"); $found = $true }
        } else {
            $lines.Add($line)
        }
    }
    if (-not $found) { $lines.Add("$Key=$value") }
    [System.IO.File]::WriteAllLines($path, $lines, [System.Text.UTF8Encoding]::new($false))
    Write-Host "$Key updated in its ignored local environment file."
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    $value = $null
}
