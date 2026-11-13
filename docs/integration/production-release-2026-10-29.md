# Integrated production release — 29 October 2026

Status: deployed and verified. This records application deployment, not certification of a trained predictive model.

## Release identity

- Site: https://srv1857115.hstgr.cloud
- Source branch: `FinalIntegratedPulso`
- Integrated implementation commit: `77618c57`
- Deployed source commit: `21479fa97d4c` (includes the field-style whitespace cleanup)
- Release directory: `/opt/pulso/releases/20261029-21479fa97d4c-integrated`
- `/opt/pulso/current` resolves to that directory.
- API/web images: `pulso-api:20261029-21479fa97d4c-integrated` and `pulso-web:20261029-21479fa97d4c-integrated`.

The release includes the merged resident deployment branch, governed government workflows/roles, field workspace, predictive infrastructure/hazard integration, complete report-table/map pagination, and the subsequent resident Home/Back/branding/PWA QR corrections.

## Data, configuration and migration

- Production PostgreSQL advanced from `19f0b2c3d4e5` to `23a7b8c9d0e1`. Strict schema inventory checks passed before and after migration.
- All existing IDs in reports, residents and officials were preserved: three reports, three resident accounts and one staff account at the pre-deployment checkpoint.
- Backups: `/opt/pulso/backups/20261029T023451Z/database.dump` and `files.tgz`. The dump is approximately 336 KB; the uploads/private-publications archive is approximately 4.4 MB.
- Development databases, local uploads, Python caches, runtime AI counters and development secrets were excluded from the transferred source package. No local/demo records, training outcomes or model artifacts were copied into production.
- Existing production credentials and provider settings were retained. `PULSO_PUBLIC_BASE_URL` is explicitly `https://srv1857115.hstgr.cloud` for receipt tracking links.
- Shared predictive artifacts mount read-only at `/app/backend/predictive_artifact`; the scheduled worker is running. There is currently no approved `current/manifest.json` artifact, so production scoring remains unavailable and the worker logs that missing-artifact condition. No probability or trained-model readiness is asserted by this release.
- The local database's pre-existing inventory drift remains a local issue; it was not copied to the production database.

## Validation

- 143 backend tests passed in an isolated disposable PostGIS database: 23 integration/predictive checks plus 120 government workspace/access-guard checks.
- 18 frontend tests passed. The latest production frontend build and targeted lint passed.
- Both production API and web containers are healthy. The predictive worker is running with the readiness limitation above.
- Live HTTPS checks passed for health, reference geometry, landing, sign-in, registration, reporting, tracking, government entry, field entry, manifest and service worker.
- Read-only authenticated checks passed for government navigation and My Work, and for all three verified, active resident portfolios. Tokens used the accounts' current access versions and were not printed or saved.
- All three production reports serialize under the updated resident/government contract; both existing referenced report-image files load successfully. Anonymous access to government reports remains denied.
- A browser click on the production registration logo opened `/resident-home`; the hero seal loaded and the PWA QR card appeared. No resident submission, registration, CAPTCHA solution, email, SMS or permission change was performed for the live checks.
- Existing JVD HTTP service and AGORsync/JVD container uptimes were preserved. Their services were not recreated.

## Recovery

The preceding source release remains `/opt/pulso/releases/20261028-admin-navigation-v1`. The actual preceding API/web image IDs were retained as `pulso-api:rollback-21479fa97d4c` and `pulso-web:rollback-21479fa97d4c`. Prior runtime configuration is retained in owner-only `build.env.before-21479fa97d4c`, `backend.env.before-21479fa97d4c`, and `build.env.rollback-21479fa97d4c` under `/opt/pulso/shared`.

The activation procedure has an application rollback path that retains the database and its newer compatible columns. Do not restore the database backup automatically: doing so could discard legitimate records created after the backup. No rollback was required.

Actual SMTP/SMS delivery, provider login/CAPTCHA completion, validated predictive scoring, and every upstream hazard feed were outside these read-only deployment checks.

## Report handling and access release

Release `20261029-e789baca-report-decisions-v1` was deployed to the same VPS on 29 October after the user authorized System Admin technical report decisions. Its source is local commit `e789baca` plus the 41-file report handling and role-access overlay; the overlay SHA-256 is `9c3f9c13a7d2525caa520739bc75dba1d6acb401f1f3ff9d3b25caf75f153ded`. No database migration or civic-record import was needed. The production backup is `/opt/pulso/backups/20261029T071957Z`.

The isolated PostGIS regression run passed 151 tests. API and web images built and became healthy. Public root, API health and the government route returned HTTP 200; anonymous government navigation returned HTTP 401. A read-only production check found an active System Admin and a pending report whose docket now offers verify, reject, request information and take. The prior release source and images remain available for rollback. No live report decision was submitted during deployment verification.
