#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python="$root/backend/.venv/bin/python"
if [[ ! -x "$python" ]]; then
  echo "Create backend/.venv first." >&2
  exit 1
fi
exec "$python" "$root/scripts/verify_secrets.py"
