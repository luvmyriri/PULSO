# Hostinger VPS deployment — 28 October 2026

Status: HTTPS site and API live; initial account and Google hostname setup pending.

- Public URL: https://srv1857115.hstgr.cloud
- VPS: 187.77.136.42, Ubuntu 24.04, 2 CPU / 8 GB RAM.
- Integrated application source: `FinalIntegratedPulso`, revision `dfd970b8f7d0`.
- Release: `/opt/pulso/releases/20261028-dfd970b8f7d0`, current symlink `/opt/pulso/current`.
- Containers: `pulso-web-1`, `pulso-api-1`, `pulso-db-1`, all healthy.
- Database migration: `18efa117cb09`. Application database role is separate from its administrator.
- Clean database confirmed: zero staff, residents, reports, work orders and infrastructure assets.
  Reference-only data: three legislative districts, 188 versioned reference barangays and two service boundaries.
- Existing JVD application remains HTTP 200 at http://187.77.136.42; its containers were not restarted.
- Production frontend uses same-origin API/uploads routes; no local CAPTCHA bypass or PhilSys sandbox.
- Runtime secrets live outside source/image layers under `/opt/pulso/shared` with restrictive ownership/modes.
- The only PULSO host-published diagnostic port is 127.0.0.1:18080. PostgreSQL and the API are not published.

The existing JVD Nginx proxy includes `/var/www/html/docker/pulso-edge/*.conf`.
Its original configuration is backed up at `/opt/pulso/shared/jvd-nginx.before-pulso.conf`.
The edge container is connected to the dedicated `pulso_edge` network. If recreating
that container during a JVD deployment, reconnect it with
`docker network connect pulso_edge jvd_nginx` before testing/reloading Nginx.
PULSO's API/database never join JVD's application network. The proxy resolves the
web container through Docker DNS, avoiding stale addresses on PULSO releases.

Let's Encrypt issued the hostname certificate. A daily systemd renewal check is
active (`pulso-cert-renew.timer`); its helper is `/opt/pulso/bin/renew-certificate.sh`.
The backup helper `/opt/pulso/bin/backup.sh` creates root-only database and file
backups; an initial backup exists at `/opt/pulso/backups/20261027T165651Z`.
These backups are on the VPS, not an off-site backup service.

## Remaining user-dependent setup

1. The user must provide the first administrator's display name and email. Create
   its one-use activation link using the existing staff invitation implementation;
   the user sets their own password. No default password or fictional account exists.
2. Add `srv1857115.hstgr.cloud` to the existing PULSO reCAPTCHA key's allowed domains
   in Google's console. The current service account's reCAPTCHA management request
   returned 403; no provider permission or CAPTCHA protection was bypassed.
3. If using Google sign-in, register `https://srv1857115.hstgr.cloud` as an authorized
   JavaScript origin for the existing OAuth client. Confirm Maps browser-key hostname
   restrictions as well. These console settings were not verified through browser use.

## Verification

- Public HTTPS root: 200 with valid certificate.
- Public `/api/health`: healthy.
- All PULSO container health checks: healthy.
- Gemini completed a synthetic connection test from the running VPS container without creating civic records.
- Existing JVD root: 200 before and after proxy changes.
- Local frontend build/lint and 11 routing/render/API-origin checks passed.
- Two disposable-PostGIS clean-install/bootstrap checks passed.
- No local business data, developer seed history, pending emails or resident uploads were migrated.
- Live visual and interactive sign-in testing remain unverified while local browser control is disabled
  and provider hostname/account setup is pending.

See `deploy/production/README.md` for architecture, reference-data provenance,
credential handling, invitation and rollback details. Do not run `docker compose down -v`.
