# Production RELogic and Android test release — 12 November 2026

Status: deployed and verified by HTTPS requests and desktop/mobile browser checks. This is a public Android **test build**, not a claim of completed physical-device acceptance or full RELogic implementation.

## Release and source

- Public site: https://srv1857115.hstgr.cloud
- Release directory/current symlink: `/opt/pulso/releases/20261112-d620bff956-relogic-android-v1`.
- Previous release: `/opt/pulso/releases/20261029-e789baca-report-decisions-v1`.
- Source: the current integration working tree, including local backend work and RELogic 0A. Git HEAD alone does not represent this deployment. No development database, uploaded resident files, runtime counters, local environment files, credentials, training history or signing key was included in the source archive or Docker contexts.
- The initial source archive contains 959 allowlisted files. Its SHA-256 is `1cfd37814bb883bdc44c5e35182b607f2762ff76adb4ed3fb54eb0031fff203f`; its file-manifest SHA-256 is `d620bff956638d1210349e34f071fcd69c14b1cdfa9527b9634de5d7eec1c1b2`. The server retains `workspace-manifest.json`.
- Build-generated native assets and `version.properties` advance to build 22. The local version properties were synchronized to that version after publication so the next local build advances beyond it.
- Deployment configuration overlay: `deploy/production/compose.yml`, SHA-256 `8bd61e1929ac4254e0168938be7d047a000c97996b1555c34af74e0087f47b03`. The release retains `deployment-overlay.json`. This makes the predictive artifact configurable and empty by default instead of unconditionally pointing at an absent model. The repository contains the same Compose change. Other subsequent local edits are documentation and test coverage.

## Installed Android package

- Application ID: `ph.gov.caloocan.pulso`.
- Version: **2.4.21**, version code **22**.
- Size: **51,019,388 bytes** (approximately 48.7 MiB).
- APK SHA-256: `3f665afc32d5957013b3341a7b600b5dced140fc46e35e4cfcf68d77ea0c08d2`.
- Persistent RSA 3072 signing certificate SHA-256: `4f18947582ad1246813567b152d1cd5a2d0591db5c63c5deee45a9c6e665986a`.
- Minimum Android API 26; compile/target API 36, consistent with the installed Capacitor 8.6 runtime. Java 21 and the official Android command-line tools build the package in an isolated container. Android Studio is not required to download or install it.
- Release signing and the APK v2 signature were verified using `apksigner`. The compiled manifest has cleartext traffic disabled and no debuggable flag. Bundled Capacitor configuration disables mixed content and WebView debugging, keeps bundled assets, and points the update plugin at the public HTTPS origin. Native API requests use that same public HTTPS origin.
- Only intentionally public Maps/reCAPTCHA/OAuth browser configuration enters the frontend build. Production CAPTCHA verification remains enabled; no mobile bypass token was introduced.
- Signing files remain in root-only `/opt/pulso/shared/android-signing`; preserve the key for compatible future updates. A protected archive was added to the release backup. Never publish it with the APK. An older local debug APK may have a different signing identity; do not automatically uninstall it or discard unsent drafts.

## QR and download behavior

The production landing page validates `/api/mobile/app-updates/latest` before offering an APK. Both the landing QR and larger dialog QR decode to:

`https://srv1857115.hstgr.cloud/api/mobile/app-updates/download`

The stable endpoint serves the completed signed APK as an Android package attachment with `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. The existing versioned update endpoint remains available. Shared files are read-only to the API, and publication writes the APK before atomically replacing `latest.json`. Missing or malformed package metadata shows website fallback and retry rather than claiming installation is ready.

Residents scan the QR, download the APK, open the downloaded file, and approve Android's installation prompt. No connection to this PC or its Wi-Fi is needed. APK installation is Android-only; the mobile website remains available to iPhone users.

## Data and configuration preservation

- Backup before migration: `/opt/pulso/backups/20261112T123922Z`, containing `database.dump`, `files.tgz`, previous release environment and protected Android signing archive.
- Production PostgreSQL migrated transactionally from `23a7b8c9d0e1` through migrations 24–31 to `31c5d6e7f8a9`. Strict schema inventory checks passed before and after.
- Existing report, resident, official and work-order identities were compared before/after activation and all were preserved. No local/demo records or model artifacts were imported. The existing migrations preserve legacy report identity while creating per-report unreviewed concern membership; they do not fabricate reviewed duplicates or training outcomes.
- Existing backend/provider credentials and persistent volumes were retained. The production `ALLOWED_ORIGINS` now explicitly includes bundled native origin `https://localhost`.
- No approved predictive artifact is currently installed and the licensed hazard feed is disabled. Scoring now records an informational `unavailable` result instead of raising a missing-file exception. No trained-model predictions or real-time hazard coverage are claimed. Configure an approved artifact explicitly before enabling those results.
- JVD services remained running. The existing shared edge configuration was preserved and its preflight check passed.

## Verification

- Public site, health, announcements, public heatmap and APK endpoints responded successfully.
- The APK was downloaded from the public HTTPS endpoint and its entire byte length and SHA-256 matched the published manifest; its signature was independently verified on the build server.
- Browser screenshots of the actual landing page were inspected at desktop and phone dimensions. Both rendered QR codes were independently decoded with a QR reader and matched the APK endpoint. No browser runtime errors or horizontal overflow were observed in those checks.
- Public-mode install UI coverage passed for English/light, Filipino/dark, 320 px, unavailable metadata and retry. Seven build/update/API-origin unit tests and four backend update-distribution tests passed. The preceding RELogic implementation verification is recorded in `pulso-relogic-screening-foundation-2026-11-12.md`.
- Anonymous government requests returned 401. The native HTTPS origin passed the CORS preflight. A synthetic invalid raster was rejected with 422 before provider analysis; no report was created for this check.
- Web/API/database containers are healthy; the worker logs disabled hazard ingestion and unavailable predictive scoring without an exception after the configuration correction.
- The web proxy was reloaded after the API-only configuration recreation to refresh Docker's upstream address. Future API recreation must similarly refresh the web proxy before checking public endpoints.

Physical Android installation, device camera/GPS accuracy, native CAPTCHA/Google authentication, and real report submission were **not** exercised on a phone. No physical-device or field-accuracy claim follows from the build/browser checks. RELogic 0A remains advisory screening and staff-review support, not verified infrastructure ownership or foolproof screen-photo detection.

## Rollback and follow-up operations

The prior web/API images are retained as `pulso-web:rollback-relogic` and `pulso-api:rollback-relogic`. The rollback worker uses the prior API image (`pulso-api:rollback-relogic-worker`); the old running worker's image ID had already been pruned and could not be tagged directly. The migrated database is retained during application rollback. Do not restore the database dump automatically or discard records created after deployment.

Owner-only activation helpers and prior environment copies remain under `/opt/pulso/shared`, including `activate-relogic-release.sh`, `relogic-rollback.yml`, `build-before-relogic.env` and `backend-before-relogic.env`. Use the previous release's Compose file together with the rollback override and preserved environment, then check health and reload the web proxy. Restore the previous shared edge only if it was independently changed; this deployment did not replace it. Preserve the Android signing identity and any existing versioned APKs when rolling forward.
