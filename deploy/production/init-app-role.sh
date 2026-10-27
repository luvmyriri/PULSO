#!/usr/bin/env bash
set -euo pipefail
: "${PULSO_APP_PASSWORD:?Set the application database password}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=app_password="$PULSO_APP_PASSWORD" <<'SQL'
CREATE ROLE pulso_app LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE pulso TO pulso_app;
GRANT USAGE, CREATE ON SCHEMA public TO pulso_app;
SQL
