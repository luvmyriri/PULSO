#!/usr/bin/env bash
set -euo pipefail
umask 077
release=$(readlink -f /opt/pulso/current)
case "$release" in /opt/pulso/releases/*) ;; *) printf 'Invalid current release\n' >&2; exit 1;; esac
target=/opt/pulso/backups/$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$target"
docker compose --env-file /opt/pulso/shared/build.env -f "$release/deploy/production/compose.yml" exec -T db pg_dump -U pulso_admin -Fc --no-owner --no-acl pulso > "$target/database.dump"
tar -czf "$target/files.tgz" -C /opt/pulso/shared uploads private_publications
cp /opt/pulso/shared/build.env "$target/release.env"
printf 'Backup saved: %s\n' "$target"
