# Report intelligence: local real HTTP verification

Status: observed local implementation and synthetic verification, November 6, 2026. This is not a release, a phone accuracy result, or an approved automated matching threshold. Technical implementation is local; product/LGU decision owners and pilot participants remain to be named.

## What changed

Added a guarded browser-review backend and a Vite-only harness that renders the existing resident wizard, receipt and staff concern/comparison components against actual loopback HTTP endpoints and disposable PostGIS. Normal report transactions, JWT permission checks, availability routing, pair review, concern association, idempotency receipts, image preparation and worker leases run through product code. No report or image-job response bodies are mocked.

The only lost-response injection consumes a successful real POST response and throws before the component receives it. Both intake and image jobs recover their original operation key and authoritative receipt.

Corrected the category notice in both resident reporting flows: selected categories belong to one report and ticket, using the same evidence and issue location. Both components now share the English/Filipino localization key `reportWizard.step1Category.singleTicketNote`. Existing visual primitives, theme and control geometry are retained. No Figma mutation or new visual approval is claimed.

An initial comparison-helper wiring error used `latitude`/`longitude` instead of the intake contract's `lat`/`lng`. The helper was corrected. It also exposed a product validation gap: intake accepted confirmed-pin metadata without a point. Intake now rejects that contradiction with HTTP 422 before uploading evidence or writing records. Unknown, unconfirmed locations remain representable with null coordinates and accuracy. This guard does not establish physical accuracy or upgrade existing records.

## Isolation and reproduction

Run from the repository root using the existing backend virtual environment:

```powershell
backend/.venv/Scripts/python.exe scripts/review_report_intelligence.py
```

In a separate PowerShell terminal:

```powershell
Set-Location frontend
$env:VITE_API_BASE_URL = 'http://127.0.0.1:33161'
npm run dev -- --host 127.0.0.1 --port 5182 --strictPort
```

Open `http://127.0.0.1:5182/tests/intelligence-live-review.html`.

The launcher only uses the exact local target `pulso_test_intelligence_browser_20261106`, refuses the configured application database and a busy review port, holds advisory lock 86173336, bootstraps/upgrades/checks the schema, and resets the named SAMPLE dataset on each launch. The fixture independently requires the exact loopback database, an explicit test flag and a separate per-run signing key. A second running launcher was refused without resetting its data.

Media and the generated artificial image are confined to ignored `backend/.pytest_cache/intelligence-browser/`; both upload mounts point there. The fixture replaces the application's worker lifespan, email receipt sender and reverse geocoder. Gemini's SDK client is unavailable in this process. Image jobs run only when the reviewer explicitly invokes the fixture's injected SAMPLE provider adapter. No real provider call or external notification was performed.

Fixture-only session issuance selects four SAMPLE actors. This bypass exists only in the guarded test module. It is not mounted by the production application. Login, passwords, CAPTCHA, verification and account recovery are outside this test; subsequent product requests use normal server JWT authorization. The diagnostic snapshot is chief-only. Switching actors in this harness is a test operation, not a production account-switch UX.

## Observed browser sequence

1. Restored an uploaded artificial image and a two-category account-scoped draft from actual IndexedDB. The wizard required fresh issue-pin confirmation, contact permission and final submission confirmation. Manual pin precision and capture time remained unknown.
2. Explicitly set the SAMPLE validator available through the actual availability API and normal authenticated heartbeat. Intake automatically assigned the records to official 2 with assignment mode `automatic`.
3. Submitted the real wizard, dropped its successful acknowledgement, and recovered ticket `PUL-2026-7733`. One report retained both `Roads & Bridges` and `Drainage & Flooding`.
4. Submitted independent comparison evidence using the intake helper. The initial helper mistake produced ticket 2 without coordinates; this remains separate in the captured run. After correction, ticket 3 (`PUL-2026-2084`) became an accessible nearby candidate for ticket 1, at the identical selected SAMPLE point. Zero measured separation is not an identity or accuracy result.
5. Requested image assistance with explicit disclosure and confirmation, dropped the real acknowledgement, and recovered the same queued job. Ran one real worker claim using the injected SAMPLE provider. The completed result explicitly stated that no real visual identification occurred; the manual judgment remained empty and concern membership was unchanged.
6. Recorded one separate, explicitly SAMPLE human workflow judgment, then separately confirmed a membership link. Tickets 1 and 3 became two contributing reports for one concern; ticket IDs and pending statuses remained individual.
7. Switched to the SAMPLE clerk: pair-review actions were absent and the actual pair endpoint returned HTTP 403 (`Active staff report review access is required`). General report context remained readable under existing clerk permissions.
8. Confirmed the corrected single-ticket notice in English and Filipino in the real wizard. Full pre-existing localization is not claimed. Set the SAMPLE validator offline and saved the final chief snapshot.

The captured run has **3 reports, 3 observations, 2 occupied concerns, 1 human pair review, 1 membership decision and 1 completed image job with 1 dispatch attempt**. The extra location-unknown ticket arose during harness wiring; it is retained in the evidence rather than removed to improve counts. A fresh run of the corrected helper does not reproduce that wiring error.

Evidence: [final SAMPLE browser capture](evidence/intelligence-live-http-synthetic-2026-11-06.jpg), [actual diagnostic postconditions](evidence/intelligence-live-http-state-2026-11-06.json). The diagnostic JSON is a point-in-time snapshot, not a live feed. These contain artificial data and omit login tokens/contact details. The screenshot is verification evidence, not a visual handoff.

## Regression verification

`scripts/verify_report_intelligence.py` uses a different guarded local database, `pulso_test_intelligence_regression_20261106`, and advisory lock 86173337. It bootstraps/upgrades/checks schema head `29a3b4c5d6e7` and runs the intake, observation-pair, queued-job, availability and fixture-startup checks. It does not reset the browser-review dataset or application database.

```powershell
backend/.venv/Scripts/python.exe scripts/verify_report_intelligence.py
```

Validation: 66 regression checks passed in the initial five-file run. Its two new missing-point tests initially failed because the test helper serialized `None` as empty multipart fields; they were corrected to omit the coordinate fields, then both passed in the focused rerun (2/2). No product relaxation was needed. The startup probes use a fake database module and refuse missing flags, application/remote targets and missing test-only signing keys before loading the application.

The four focused Node client suites passed 23 checks for report intake, original-photo drafts, pair commands and image-assistance recovery. Targeted ESLint completed with zero errors (existing component warnings and the Vite-only fixture's Fast Refresh warning remain). The production build passed with the existing large-bundle warning. Python compilation and targeted whitespace checks passed. The browser review server and Vite process opened for this run were stopped; disposable data and ignored SAMPLE media were retained.

## Remaining work

Regular Android/iPhone location trials with independent reference points, real multi-angle object/problem annotations, provider disclosure and external Google trials, empirical matching evaluation, authentic completion histories, ETA model evaluation, mobile parity and release verification remain open. No LightGBM model, guaranteed exact geolocation, automatic identity merge, numerical completion estimate or production deployment is claimed.

The next development dependency is a bounded pilot intake and evaluation workflow for authentic measurements and independently reviewed outcomes. Existing ordinary-phone pilot and dataset tooling should supply those inputs before model release decisions.
