#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL explicitly before running check_existing_db.sh}"
export PYTHONDONTWRITEBYTECODE=1
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python_bin="${PYTHON:-python3}"
state="$("$python_bin" "$repo_root/scripts/db_schema.py" check-existing)"
read -r schema_state needs_stamp < <("$python_bin" -c 'import json,sys; value=json.loads(sys.stdin.read()); print(value["state"], str(value["needs_stamp"]).lower())' <<< "$state")
(
  cd "$repo_root/backend"
  if [[ "$schema_state" == "baseline" ]]; then
    if [[ "$needs_stamp" == "true" ]]; then
      "$python_bin" -m alembic -c alembic.ini stamp c455ca49f6d5
    fi
    "$python_bin" -m alembic -c alembic.ini upgrade head
  fi
  "$python_bin" "$repo_root/scripts/db_schema.py" assert-revision a9c6e4b2d1f0
  "$python_bin" -m alembic -c alembic.ini current
)
