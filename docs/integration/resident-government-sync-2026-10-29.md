# Resident deployment branch integration — 29 October 2026

Status: observed local implementation and verification. This is not a VPS release or a production-readiness certification.

## Source and preservation

- Integrated `origin/FinalIntegratedMarcPulso-deployment` at `ca3a25e5` into local `FinalIntegratedPulso` with merge commit `b63fbee2`.
- Restored the existing government operations and predictive maintenance changes after the merge. Retained the resident dashboard's working XLSX exports while resolving its two conflicts.
- Recovery stash `b29aac5421c3bbc92530dc9bb45fe9eece85c3fd` is retained. It has already been reapplied; do not apply it again automatically.
- Integration fixes and previously existing government work remain in the working tree. Nothing was pushed or deployed in this operation.

## Integration changes

1. Persist guest contact name and resident-selected urgency from the updated reporting wizard. Registered reporter names continue to come from the authenticated resident account. Resident-selected urgency remains separate from AI urgency and staff priority grades.
2. Add migration `23a7b8c9d0e1` after `22f6a7b8c9d0`, plus the corresponding schema inventory and bootstrap/test revision updates.
3. Return the retained submission context in authorized government report responses and the shared report docket API.
4. Fetch all report-table and report-map pages using the server's creation-time cutoff, deterministic ordering, total count, duplicate-ID detection, and explicit incomplete-response errors. The list API retains its existing array response contract and per-request page limit. The map endpoint adds `next_skip`; the shared government API loader follows those pages before presenting the complete map. A creation-time cutoff prevents newly arriving reports from shifting subsequent pages; it is not an immutable database snapshot of later edits or deletions.
5. Preserve production spatial duplicate protection and fail-closed behavior for invalid AI settings. Missing draft evidence can no longer become a sample pothole photo in a submitted civic record.
6. Move the new Gmail notification call out of the intake response path, bound its SMTP timeout, and configure tracking links through `PULSO_PUBLIC_BASE_URL`. The ignored local environment uses `http://127.0.0.1:5173`.

Main implementation files: `backend/main.py`, `models.py`, `schemas.py`, `gov_router.py`, `report_receipts.py`, `system_settings.py`; `frontend/src/pages/GovReportsDashboard.jsx`, `ReportWizardPage.jsx`, `frontend/src/utils/governmentApi.js`, and `frontend/src/utils/reportPages.js`.

## Local migration and services

A PostgreSQL custom-format backup was saved before the additive migration at:

`C:/Users/Val/AppData/Local/Temp/PULSO-before-resident-integration-20261029-052943.dump`

Local database `pulso_db` advanced from `22f6a7b8c9d0` to `23a7b8c9d0e1`; all 13 existing report rows were preserved. No synthetic reports were added to this database. Frontend Vite runs on port 5173 and proxies API/uploads to the backend on port 33159. Both services were restarted after the interrupted session.

## Verification

- 23 backend integration/predictive tests passed on a newly created disposable PostGIS database. These cover actual guest and authenticated intake, retained names/urgency/evidence, government list/docket/map/overview reads, assignment into the correct clerk's My Work, private tracking, duplicate rejection, jurisdiction restrictions, invalid input, and loading 1,001 records in both table and map APIs without first-page truncation. External AI and email delivery are stubbed.
- 120 government workspace and access-guard regression tests passed on that disposable database.
- 18 frontend tests passed, including pagination, resident validation, location privacy, address formatting, and resident detail rendering.
- Production frontend build passed. Targeted ESLint and `git diff --check` passed.
- Live read-only checks through `http://127.0.0.1:5173` returned HTTP 200 for backend health, government report list, overview, My Work, report map, navigation, reference geometry, and all 13 report dockets. The table and map IDs matched the local database exactly. Predictive health, production status, testing progress, and hazard catalog endpoints also returned HTTP 200; these response checks do not certify an available validated model or upstream hazard-provider availability.

## Known limitations

- Two pre-existing attachment references point to missing bytes: `report_10_e5420f31.jpg` and `report_14_dba62f9d.jpg`. Their local URLs and corresponding deployed-site URLs return 404. Two other local report attachments return 200. Retain the missing-file state until the original files can be recovered; do not replace evidence with sample images.
- The configured local database has older drift from its checked-in schema inventory: generated geography column definitions, chat ownership constraints/index, and work-order priority/system-document target constraints differ. The strict inventory check still reports the drift; its guard was not weakened. The new migration only adds its two columns and check constraint. Fresh disposable databases migrate cleanly and match the new inventory. Reconcile existing drift separately before treating this local database as a deployment baseline.
- Actual SMTP/SMS delivery, external AI provider behavior, live map/hazard availability, and production database deployment were not validated by these tests. Existing build chunk-size and Python dependency/deprecation warnings remain.
