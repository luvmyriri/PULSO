#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/set_secret.sh KEY_NAME" >&2
  exit 2
fi
key="$1"
case "$key" in
  POSTGRES_PASSWORD) target=".env" ;;
  VITE_GOOGLE_MAPS_API_KEY|VITE_RECAPTCHA_SITE_KEY) target="frontend/.env" ;;
  JWT_SECRET_KEY|DATABASE_URL|GOOGLE_MAPS_API_KEY|GOOGLE_VISION_API_KEY|GOOGLE_GEMINI_API_KEY|OCR_API_KEY|SMTP_PASS|RECAPTCHA_SECRET_KEY|PHILSYS_API_ID|PHILSYS_API_SECRET|PHILSYS_QR_COOKIE|PHILSYS_PUBLIC_KEY) target="backend/.env" ;;
  *) echo "Unsupported key name" >&2; exit 2 ;;
esac
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="$root/$target"
if [[ ! -f "$target" ]]; then
  echo "Missing local environment file for $key. Copy the matching .env.example first." >&2
  exit 1
fi
IFS= read -r -s -p "New value for $key: " value
printf '\n'
if [[ -z "$value" || "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
  echo "The value must be nonempty and one line." >&2
  exit 1
fi
export PULSO_SECRET_TARGET="$target" PULSO_SECRET_KEY="$key"
printf '%s' "$value" | python3 -c '
import os, pathlib, sys
p = pathlib.Path(os.environ["PULSO_SECRET_TARGET"])
k = os.environ["PULSO_SECRET_KEY"]
v = sys.stdin.read()
lines = p.read_text(encoding="utf-8").splitlines()
out = []
found = False
for line in lines:
    if line.startswith(k + "="):
        if not found:
            out.append(k + "=" + v)
            found = True
    else:
        out.append(line)
if not found:
    out.append(k + "=" + v)
p.write_text("\n".join(out) + "\n", encoding="utf-8")
'
unset value PULSO_SECRET_TARGET PULSO_SECRET_KEY
echo "$key updated in its ignored local environment file."
