# Hostinger VPS deployment — 28 October 2026

Status: HTTPS site and API live; first administrator activated. Browser Maps
hostname, replacement reCAPTCHA v2 site, and replacement Google OAuth client
configured. Google Auth Platform is External / In production; branding
verification is pending site ownership proof.

- Public URL: https://srv1857115.hstgr.cloud
- VPS: 187.77.136.42, Ubuntu 24.04, 2 CPU / 8 GB RAM.
- Integrated application source: `FinalIntegratedPulso`, revision `dfd970b8f7d0`,
  plus the installed-PWA entry fix, public privacy page, and Google auth safety
  changes described below.
- Release: `/opt/pulso/releases/20261028-dfd970b8f7d0-pwa-home1-oauth1-searchverify1`, current symlink `/opt/pulso/current`.
- Containers: `pulso-web-1`, `pulso-api-1`, `pulso-db-1`, all healthy.
- Database migration: `18efa117cb09`. Application database role is separate from its administrator.
- Clean database confirmed at bootstrap: zero staff, residents, reports, work orders and infrastructure assets.
  One active first-administrator account now exists; no resident or civic records were added.
  Reference-only data: three legislative districts, 188 versioned reference barangays and two service boundaries.
- Existing JVD application remains HTTP 200 at http://187.77.136.42; its containers were not restarted.
- Production frontend uses same-origin API/uploads routes; no local CAPTCHA bypass or PhilSys sandbox.
- Runtime secrets live outside source/image layers under `/opt/pulso/shared` with restrictive ownership/modes.
- The only PULSO host-published diagnostic port is 127.0.0.1:18080. PostgreSQL and the API are not published.
- The first system administrator invitation was issued and accepted on
  28 October 2026. The account is active with `invitation_pending=false`.
  The used one-use link was held in a root-only file at
  `/opt/pulso/shared/first-admin-invite.json`, never in repository history.
- Google Cloud project `pulso-509010` now allows
  `https://srv1857115.hstgr.cloud/*` on the existing PULSO browser Maps key.
  The saved website restriction was reopened and verified in the console;
  the public community map rendered in a live browser afterward.
- A replacement `PULSO VPS production` reCAPTCHA Challenge v2 tickbox site
  allows `srv1857115.hstgr.cloud` in project `pulso-509010`. Its public site
  key is configured for the frontend build and its secret is in the backend
  runtime environment. The production challenge was not completed in a device
  browser, so end-to-end CAPTCHA validation remains unverified.
- The installed PWA now shows the public landing page to signed-out users after
  splash/tutorial. That entry exposes Report an issue, Track a report, Sign In,
  and Create Account. Signed-in users still enter their dashboard. Tutorial
  Skip returns guests to the landing page; Start a report opens the guest
  report flow.
- A public bilingual privacy page is available at `/privacy.html`, linked from
  the landing footer and privacy modal. It uses the existing PULSO project
  support email and does not repeat unverified encryption or biometric claims.
  Its formal operator and retention schedule still require owner review.
- Web OAuth client `PULSO VPS production web` was created in Google Cloud
  project `pulso-509010`, with JavaScript origin
  `https://srv1857115.hstgr.cloud`. Its public client ID is deployed in the
  web build and backend environment. The Google Auth Platform app is External
  / In production. Google reports a 100-user cap while branding remains
  unverified; Data access says no sensitive or restricted scopes require
  verification. End-to-end public sign-in has not been tested.
- Production Google auth now rejects synthetic test credentials and the legacy
  email-only verification-completion endpoint returns HTTP 410. Google sign-in
  is limited to existing verified resident accounts; new residents use the
  regular registration and verification flow.
- Google Search Console's URL-prefix HTML verification file
  `google024c770258ccbdeb.html` is included in the web release and available
  from the site root. Search Console showed "Ownership verified" via the HTML
  file in Gene's account on 28 October 2026.

The existing JVD Nginx proxy includes `/var/www/html/docker/pulso-edge/*.conf`.
Its original configuration is backed up at `/opt/pulso/shared/jvd-nginx.before-pulso.conf`.
The edge container is connected to the dedicated `pulso_edge` network. JVD's
production Compose file declares that external network for `jvd_nginx`, so a
Compose recreation reconnects it automatically. A second internal network,
`agorsync_edge`, now connects only the shared proxy; AGORsync's future web
container can join it without joining PULSO's edge network.
PULSO's API/database never join JVD's application network. The proxy resolves the
web container through Docker DNS, avoiding stale addresses on PULSO releases.

## Shared-VPS hostname boundary

AGORsync is planned on this VPS but has no separate domain yet. Keep
`srv1857115.hstgr.cloud` assigned to PULSO. At the time of inspection, Docker's
`jvd_nginx` owned host ports 80 and 443 and the host `nginx` service was inactive;
the live PULSO `server_name` in `pulso-edge/site.conf` proxies to `pulso-web`.
AGORsync should use a distinct hostname and a separate virtual host in the
existing edge proxy. Do not install or start a second host Nginx on those ports,
or reuse PULSO's `server_name` for AGORsync. Root-only snapshots of the active
proxy files are in `/opt/pulso/shared/jvd-nginx.before-multisite.conf` and
`/opt/pulso/shared/pulso-edge.before-multisite.conf`.

The shared proxy now includes an empty `backend/docker/edge-sites/*.conf`
directory for future exact-name sites. No AGORsync route is active. Its two
HTTP/HTTPS templates and README are in that directory. The read-only
`/opt/pulso/bin/edge-preflight.sh` checks Nginx syntax, the existing sites,
and PULSO hostname collisions; it passed after the include was added. The
pre-change Nginx file is backed up at
`/opt/pulso/shared/jvd-nginx.before-edge-sites.conf`. See
[shared VPS site foundation](shared-vps-multisite-foundation.md) before adding a
domain or restarting the shared proxy. Recovery copies of the new Nginx file
and the template directory are in `/opt/pulso/shared/jvd-nginx.with-edge-sites.conf`
and `/opt/pulso/shared/edge-sites-foundation.tgz`.
JVD's pre-change Compose file is backed up at
`/opt/pulso/shared/jvd-compose.before-edge-network.yml`. Recreating only
`jvd_nginx` from the updated production Compose file passed the edge preflight.
The Compose file before adding `agorsync_edge` is backed up at
`/opt/pulso/shared/jvd-compose.before-agorsync-edge.yml`. A second proxy
recreation connected `jvd_nginx` to both edge networks; PULSO's web container
remained only on `pulso_edge`. PULSO, its API, and JVD returned HTTP 200 afterward.
A temporary web probe on `agorsync_edge` was reachable from `jvd_nginx` and not
from `pulso-web-1`; the probe was removed after the isolation check.

Let's Encrypt issued the hostname certificate. A daily systemd renewal check is
active (`pulso-cert-renew.timer`); its helper is `/opt/pulso/bin/renew-certificate.sh`.
The backup helper `/opt/pulso/bin/backup.sh` creates root-only database and file
backups; an initial backup exists at `/opt/pulso/backups/20261027T165651Z`.
Another backup was taken immediately before the first-administrator invitation
at `/opt/pulso/backups/20261027T171558Z`.
An additional backup was taken before the proposed reCAPTCHA credential change
at `/opt/pulso/backups/20261027T173502Z`.
Another backup was taken immediately before the PWA entry fix at
`/opt/pulso/backups/20261027T181204Z`.
An additional backup was taken before the OAuth release at
`/opt/pulso/backups/20261027T182810Z`. Root-only pre-activation copies of
`build.env` and `backend.env` are in `/opt/pulso/shared` with the suffix
`before-oauth1-20261027T185531Z`.
These backups are on the VPS, not an off-site backup service.

## Remaining user-dependent setup

1. Test staff sign-in with the administrator's chosen password. No default
   password exists.
2. Relaunch the installed Android PWA while online and confirm that a signed-out
   session reaches the landing page, including Sign In and Create Account.
3. Google Branding verification previously flagged the homepage URL as not
   registered to the project owner. Gene's Search Console account (also an
   owner of `pulso-509010`) now shows ownership verified for the URL-prefix
   property `https://srv1857115.hstgr.cloud/`. Keep the HTML file in future
   releases. Google says to wait up to 24 hours for systems to update before
   requesting branding reverification. Owner should review the published
   privacy copy, especially the responsible operator, support address, and
   retention practices.

## Verification

- Public HTTPS root: 200 with valid certificate.
- Public `/api/health`: healthy.
- All PULSO container health checks: healthy.
- Gemini completed a synthetic connection test from the running VPS container without creating civic records.
- Existing JVD root: 200 before and after proxy changes.
- Local frontend build/lint and 11 routing/render/API-origin checks passed.
- Two disposable-PostGIS clean-install/bootstrap checks passed.
- No local business data, developer seed history, pending emails or resident uploads were migrated.
- Live public homepage, community map, resident sign-in page and staff activation
  route were inspected in Chrome. The staff account was subsequently confirmed
  active in production. Full sign-in remains unverified; no test civic records
  were created.
- For the PWA entry fix, the local frontend build succeeded, targeted ESLint had
  no errors, and the design detector reported no findings. The new web image
  passed health checks; `/`, `/login`, `/register`, `/report`, and `/api/health`
  returned HTTP 200 after activation. All PULSO containers were healthy and JVD
  still returned HTTP 200. Installed Android relaunch has not been observed.
- For the OAuth release, local production-gate tests passed (6), frontend build
  passed, and API/web images built on the VPS. After activation, `/privacy.html`,
  `/login`, `/api/health`, and the existing JVD root returned HTTP 200; both
  PULSO containers were healthy. A synthetic Google token returned HTTP 401 and
  the legacy verification-completion endpoint returned HTTP 410. Google Auth
  was subsequently published to production, but live Google sign-in has not
  been completed with a verified resident account.
- The Search Console verification web image built successfully. Initial
  activation exposed a file-permission 403 and rolled back; the file was made
  readable by Nginx and the retry succeeded. An independent public request
  returned HTTP 200 with the exact 53-byte verification response. Public root,
  API health, and existing JVD root remained HTTP 200.
- The registration email-only correction is live as release
  `20261028-dfd970b8f7d0-pwa-home1-oauth1-searchverify1-emailotp1`. The
  registration verification screen and resend confirmation now identify email
  as the sole code destination, and the unused SMS WebOTP listener was removed.
  SMTP debug output was disabled, and transport logs no longer print code or
  recipient values. Two targeted backend log tests passed; the frontend built,
  and targeted lint reported no errors. A root-only backup was taken at
  `/opt/pulso/backups/20261027T201459Z` before activation. Both new containers
  passed health checks; public root, `/register`, `/api/health`, the Search
  Console verification file, and the existing JVD root returned HTTP 200.
  At the time of this email-only release, TextBee was configured in the
  ignored local `backend/.env.local` but not in the VPS environment, and
  registration did not call the adapter. SMTP acceptance
  confirms handoff to the mail server, not arrival in a resident's inbox; a
  live mailbox delivery test was not performed. Older container logs may still
  contain messages emitted before this fix and were not modified.
- The owner's later instruction superseded the email-only registration policy:
  one stored, expiring account code is now requested through both email and
  TextBee SMS. Either received copy can confirm the resident account; this
  does **not** independently prove ownership of both contacts. The API tells
  the PWA which providers accepted the request, so it does not claim a text was
  sent when TextBee rejects it. Resend and administrator-initiated confirmation
  use the same channel policy. Password recovery remains email-only. The new
  sign-in recovery view calls the working confirmation endpoint.
- Release `20261028-dfd970b8f7d0-pwa-home1-oauth1-searchverify1-emailotp1-dualotp1`
  is live. `REGISTRATION_SMS_PROVIDER=textbee`, TextBee outbound, API key and
  device ID are present in the root-only VPS backend environment. General
  `SMS_PROVIDER=none` remains, so this does not enable report or alert SMS.
  A root-only pre-activation backup is at
  `/opt/pulso/backups/20261027T203341Z`; previous build and backend
  environments are preserved with `.before-dualotp1` suffixes. Fifteen focused
  backend tests, eleven production-gate/logging tests, the frontend build, and
  targeted lint passed. The two candidate images built and activated; all
  PULSO containers are healthy. Public root, `/register`, `/login`, API health,
  the Search Console verification file, and the JVD root returned HTTP 200.
  No live registration or handset receipt test was performed, and provider
  acceptance is not a delivery receipt.
- A read-only TextBee device query from the running VPS API container returned
  HTTP 200: device enabled, heartbeat age 0 minutes, and SIM service state
  `IN_SERVICE`. This confirms the gateway was online at check time; a
  resident handset delivery test remains outstanding.

- Report creation receipts are live in API release
  `20261028-dfd970b8f7d0-pwa-home1-oauth1-searchverify1-emailotp1-dualotp1-receipts2`.
  Signed-in resident submissions atomically queue one email and one TextBee SMS
  intent with the saved report. The recipient is the resident account contact,
  never a report form override. Both messages include the ticket, category and
  received-for-review state; email also includes the Philippine submission time
  and a sign-in link. Description, precise location, evidence and tracking token
  stay in the authenticated app. Guest reports are not sent to unverified form
  contacts. Delivery failures do not undo a saved report. The transport tracks
  SMTP or TextBee acceptance, retries only known pre-send email failures, and
  holds uncertain outcomes for review to avoid duplicate messages. The separate
  `REPORT_RECEIPT_SMS_PROVIDER=textbee` switch leaves general `SMS_PROVIDER=none`.
  A pre-activation database and file backup is at
  `/opt/pulso/backups/20261027T205451Z`. Sixteen focused local tests passed;
  one disposable-PostGIS integration test was not run locally. The candidate
  image configuration smoke passed. The initial `receipts1` image was replaced
  by `receipts2` after final review found a detached report-object risk; the
  corrected runtime summary was verified. At final read-only check there were
  zero report receipt outbox events. API, web and DB containers were healthy;
  public API health, report route and JVD root returned HTTP 200. No live
  resident report or external inbox/handset delivery test was performed.

On 2026-10-28, the government workflow API release
`20261028-gov-workflow-refinement-v1` was live with Alembic revision
`19f0b2c3d4e5`. The subsequent web release
`20261028-gov-kpi-csv-xlsx-v1` restored separate CSV downloads alongside the
existing styled Excel workbooks for each Operations overview KPI and chart.
The web release was copied from the then-current
`20261028-styled-xlsx-export-v1` source and overlaid only with the export
changes. A database and file backup is at
`/opt/pulso/backups/20261028T130659Z`; the previous web image and release
remain available for rollback. Five focused CSV tests, targeted ESLint, the
Vite production build and the UI detector passed. The live web, API and DB
containers were healthy; API health and the government page returned HTTP
200, anonymous Projects and My Work APIs returned HTTP 401, and the existing
JVD root returned HTTP 200. The running API passed a synthetic Gemini live
probe. Authenticated staff role acceptance was not performed.

See `deploy/production/README.md` for architecture, reference-data provenance,
credential handling, invitation and rollback details. Do not run `docker compose down -v`.
