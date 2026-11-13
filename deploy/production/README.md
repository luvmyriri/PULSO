# PULSO VPS deployment

Prepared for the integrated branch on Ubuntu 24.04 / Docker. The VPS at
`187.77.136.42` already runs JVD. Its existing web proxy must remain online.
PULSO uses `/opt/pulso`, a separate database/volumes/network, and the initial
hostname `srv1857115.hstgr.cloud` (public DNS resolves to the VPS).

The initial deployment used a **clean database**. Routine updates must preserve
the existing production database and files, take a backup, and migrate the schema.
Do not repeat the initial bootstrap or import local records. Do not restore the local database, demo
accounts, fake reports, work orders, assets, model-training seed history, uploads
or pending outbound messages. Bootstrap the schema with `scripts/bootstrap_db.sh`
before starting the API; then explicitly run `initialize_production.py references`.
Its reference-only catalog uses the repository's versioned map data and the
[RA 11545 district mapping](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/93190).
This corrects misleading North/South legislative-district labels in old developer
comments. Sector and legislative district are separate fields. The shipped
188-barangay reference dataset is not certification of a current PSGC/survey catalog.

Runtime secrets belong under `/opt/pulso/shared`, outside release folders, with
owner-only environment files. Never copy development `.env` files wholesale or
include service-account credentials in Docker build context. Use a new JWT secret,
separate database administrator/application credentials, production mode,
`PULSO_RECAPTCHA_LOCAL_TEST=false`, and `PHILSYS_SANDBOX=false`. External referral
and optional update-email delivery stay disabled until separately configured.
Keep the Google/SMTP credentials server-only. Maps and reCAPTCHA site keys and
Google OAuth client ID are intentionally public browser configuration.

Only the PULSO web container has a loopback diagnostic port (`127.0.0.1:18080`).
The database and API publish no host ports. A dedicated `pulso_edge` bridge joins
the existing edge proxy to PULSO web without joining the API/database to JVD's
application network. Reconnect the edge proxy to this network after recreating it.
Container logs rotate. Persistent files and database volumes survive releases.

Serve the hostname through the existing Nginx proxy with a validated TLS
certificate; do not replace its default JVD server. Back up the proxy config before
adding a PULSO include, run `nginx -t`, and reload gracefully. Keep an undo copy.
Check both JVD and PULSO after every edge change. Do not disable the firewall or
expose PostgreSQL to make deployment easier.

The production frontend uses same-origin API/uploads routes. Build arguments
contain public keys only. Before resident authentication testing, register the
new hostname with the relevant Google reCAPTCHA, OAuth and Maps restrictions.
Do not enable development CAPTCHA test keys on the VPS.

Create the first administrator only after the user supplies their email/name.
`initialize_production.py first-admin` reads those from environment, refuses when
staff already exist, creates a 48-hour single-use invitation, and outputs its URL.
Capture that output into a root-only file and provide the link privately to the
user; the user chooses the password in the activation form. No default staff
password, fake person or unsolicited email is created.

Back up PostgreSQL with `pg_dump` and private/public file volumes before updates.
Retain the prior image/release and edge configuration for rollback. Never run
`docker compose down -v` against the deployment.

The Android public test build uses `frontend/scripts/android.mjs apk-public` and
the isolated Java 21 / SDK 36 builder in `android-builder.Dockerfile`. Supply only
public browser configuration and a persistent private signing key to that builder;
never mount backend credentials into it. Add the bundled `https://localhost` origin
to the production backend's `ALLOWED_ORIGINS` without enabling development CAPTCHA.
The signed APK is served from the read-only shared `android_updates` folder.
Publish the complete APK first and `latest.json` last; the landing QR uses
`/api/mobile/app-updates/download`. Preserve the signing key and its protected backup
for future compatible updates. Physical-device acceptance remains a separate check.

Predictive scoring defaults to unavailable. Set `PULSO_PREDICTIVE_ARTIFACT` in the
Compose build environment only after an approved artifact is installed at the
mounted container path, for example `/app/backend/predictive_artifact/current`.
An absent model or licensed hazard feed must not become fabricated predictions.

After recreating only the API, refresh the web proxy's cached Docker upstream:
check API health, run `docker exec pulso-web-1 nginx -t`, then
`docker exec pulso-web-1 nginx -s reload`, and verify the public HTTPS API again.
