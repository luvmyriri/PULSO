#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../frontend"
exec node scripts/android-dev.mjs "$@"
