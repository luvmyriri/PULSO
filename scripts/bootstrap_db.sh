#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL explicitly before running bootstrap_db.sh}"
export PYTHONDONTWRITEBYTECODE=1
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python_bin="${PYTHON:-python3}"

"$python_bin" "$repo_root/scripts/db_schema.py" bootstrap
(
  cd "$repo_root/backend"
  "$python_bin" -m alembic -c alembic.ini stamp c455ca49f6d5
  "$python_bin" -m alembic -c alembic.ini upgrade head
  "$python_bin" "$repo_root/scripts/db_schema.py" assert-revision f3a6d8c1b250
  "$python_bin" -m alembic -c alembic.ini current
)
