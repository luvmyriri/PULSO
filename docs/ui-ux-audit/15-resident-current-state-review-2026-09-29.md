# Resident web current-state review — 29 September 2026

**Status:** observed audit and proposed delivery plan. This document does not approve the detailed resident lifecycle, KYC policy, routes, or service targets.  
**Scope:** branch `Finals-refractor-92526`, commit `a69c8271`, after a clean fast-forward pull. Public landing, registration, open reporting, tracking, receipt, resident dashboard, selected backend contracts, and integrations.  
**Visual authority for this review:** the current repository and running local web UI. The project Figma file was not used to decide readiness because the user identified it as outdated; the connector exposed only `00 Overview & Foundations`, while the repository handoff describes three pages.  
**Limits:** no authenticated resident account or production API/data was supplied. The browser review covered public desktop views; mobile widths, assistive technology, and both themes were not exhaustively tested. No product code was changed.

## Verdict

The resident UI is visually more coherent in the registration and six-step report surfaces, and the new dashboard has separate mobile and desktop navigation. It is **not ready to call complete or release-ready**. The main gaps are civic-data truth, public privacy, frontend/backend contract alignment, verification authority, recovery, and the absence of an enforceable quality gate. These outrank further visual polish.

## Confirmed progress

- The current frontend builds successfully. Registration now has an ID selection stage, camera/upload UI, and an explicit manual-review option for some secondary IDs (`frontend/src/pages/Register.jsx`).
- The report wizard saves a text draft and exposes a recovery choice (`frontend/src/pages/ReportWizardPage.jsx`). Its submit request now includes `location_string`, closing the specific omission described in the older resident dossier.
- Public tracking on the backend uses a separate redacted `ReportTrackResponse`, a secret token, and public timeline filtering (`backend/main.py`, `backend/schemas.py`). The dashboard's mark-all notification call now uses the backend's `PATCH /api/notifications/user/{user_id}/read` path, closing another older dossier mismatch.
- The actual-backend security suite passed 33 of 34 tests. This is useful coverage for uploads, boundary checks, duplicates, and tracking, but its remaining failure and missing end-to-end web contract checks prevent a readiness claim.

## Release blockers, ordered by impact

| Priority | Observed evidence | Resident impact | Required closure proof |
|---|---|---|---|
| P0 | `GET /api/reports/public` is unauthenticated and declares `ReportResponse`, which includes contact email/phone, resident IDs, exact coordinates, AI metadata/reasoning, and other internal fields. Only `reporter_name` is changed to `Anonymous Resident` (`backend/main.py:1383`, `backend/schemas.py:170`, `backend/schemas.py:208`). | A public nearby-report request can expose restricted report data. | Dedicated allowlist public DTO; privacy-safe location/evidence policy; test that forbidden keys never appear for guests or other residents. |
| P0 | OCR attempts write raw ID text, parsed identity data, and AI output to local JSON; one scan file is tracked in Git (`backend/ocr_service.py:1075`, `logs/ocr_scans/`). Uploaded report files are publicly mounted (`backend/main.py:68`). | Identity and evidence retention/exposure are not controlled enough for public release. | Stop raw PII logging, assess and remediate committed history under an incident process, restrict file access by purpose/role, set retention and deletion rules, and test direct URL denial. |
| P0 | `POST /api/auth/register` assigns Silver/Gold KYC from client-supplied `id_tier`, `id_type`, and `verification_mode` without a server-linked proof of the earlier OCR result (`backend/main.py:429`, `backend/schemas.py:10`). | An API caller can claim a verified tier without completing authoritative identity review. | Server-owned verification case/state and bounded, single-use registration proof; negative tests for forged client fields and provider failure. |
| P1 | Public tracking sends `report_id`, while the backend requires `ticket_id` (`frontend/src/pages/PublicTrackPage.jsx:42`, `backend/schemas.py:256`). A network error can instead produce a fabricated `under_review` ticket for `RPT-`/`PULSO-` IDs (`PublicTrackPage.jsx:60`). | Valid lookup fails validation; outages can look like real progress. | Shared request schema/contract test; remove mock fallback; test valid, invalid, offline, and expired-token states. |
| P1 | The landing map uses five hardcoded tickets and calls itself a verified live feed (`frontend/src/components/landing/MapPreviewSection.jsx:155`, `:375`). News starts with hardcoded emergency articles and relative timestamps, and retains them on API failure (`CityNewsWidget.jsx:23`, `:135`, `:176`). The “How it works” section states unvalidated 60-second/2-hour/service outcomes (`HowItWorksSection.jsx:13`). | Residents may act on fictional emergencies, repair progress, service times, or official claims. | Remove or visibly label study content; source public updates from governed API with source/time/freshness; use honest error/empty states; LGU owner validates any service promise and hotline. |
| P1 | Report location starts at a City Hall coordinate, with `isInCaloocan: true`; the location step says “Verified within Caloocan City” and Continue only checks the coordinate boundary (`frontend/src/pages/ReportWizardPage.jsx:47`, `Step2LocationMap.jsx:59`, `:333`, `:378`). Search maps arbitrary text to fixed coordinates (`Step2LocationMap.jsx:151`). | A resident can submit an unrelated default or simulated location as if confirmed. | Start with unknown location; require explicit pin/address confirmation; use real geocoding or manual address; distinguish approximate/selected/authoritatively checked jurisdiction. |
| P1 | A direct visit or reload of `/report/success` displays a sample ticket, token, timestamp, and success claim (`frontend/src/pages/ReportSuccessPage.jsx:17`). Submission has no operation ID/idempotency or uncertain-outcome reconciliation (`ReportWizardPage.jsx:179`). Duplicate warning offers an “Evidence linked” alert without an API write (`ReportWizardPage.jsx:372`). | False receipt, duplicate tickets after retry, and false evidence attachment. | Receipt only from committed server record; persistent safe receipt lookup; idempotency key and retry reconciliation; real attach workflow or remove the control. |
| P1 | Registration OTP is stored as a plain `verification_code` and checked without expiry, attempt cap, or resend throttle (`backend/models.py:78`, `backend/main.py:429`, `:595`). The dashboard's 2FA UI accepts `123456` and locally generated codes after failed requests (`frontend/src/pages/ResidentDashboard.jsx:2714`). | Verification and security settings can make false security claims. | Server-owned OTP lifecycle and effective 2FA enforcement on sensitive operations; remove client bypasses; abuse and expiry tests. |
| P1 | Registration, map, news, and parts of the dashboard contain English-only copy. Registration has no language switch; `index.html` stays `lang="en"` (`frontend/src/pages/Register.jsx`, `frontend/src/i18n.js`, `frontend/index.html:2`). The custom date picker has a 38 px trigger and a clickable nested `<span>` for Clear (`frontend/src/components/CustomDatePicker.jsx:170`). | English/Filipino parity and keyboard/touch access are incomplete. | Critical-flow bilingual content inventory and tests; update document language; keyboard and screen-reader pass; 44 px public targets and proper button semantics. |
| P1 | The frontend build passes, but repository lint fails with 231 errors/37 warnings; selected resident files account for 92 errors/5 warnings. The main JS bundle is about 4.8 MB minified and the main CSS about 572 kB. `ResidentDashboard.jsx` exceeds Babel's 500 kB deoptimization threshold. | Quality regressions are easy to merge; slower startup on weak phones/networks. | Make lint a blocking CI gate; split resident dashboard by route and lazy-load heavy map/3D features; measure mobile performance on a target device/network. |

## UX and integration work after the blockers

1. **One reporting journey:** reconcile `/report` with the separate dashboard quick-report modal. Share category, location, evidence, review, consent, duplicate, and receipt behavior. Keep wizard steps in URL/history; save only policy-approved draft data, and explain that evidence files must be reattached after reload.
2. **One resident record vocabulary:** map backend statuses to approved resident words only after the product/LGU owner approves the lifecycle. Give every report a stable detail URL and deep-link notifications. Preserve task context through login, refresh, and back navigation.
3. **Reusable controls:** define shared resident button, field, alert, dialog, and status patterns with semantic tokens, minimum target size, 3 px focus, disabled/loading/error behavior, light/dark parity, and long Filipino strings. Replace screen-local orange values and gradients in bounded passes.
4. **Provider boundaries:** wrap maps/geocoding, OCR/AI, email/SMS, and notifications with explicit timeouts, retries, freshness, and human alternatives. Provider failure must never convert to “verified,” “sent,” “resolved,” or a fabricated result. Review what identity images/text leave the system and disclose that truth before upload.
5. **Resident operations:** create a public-update publishing workflow with owner, source, publication/withdrawal time, district, and correction history. Validate emergency numbers and service expectations with the LGU before publication.

## Fastest defensible delivery sequence

The time boxes below are **planning estimates for a small team**, not approved dates or service commitments. Work can overlap only where the same API contract is already agreed.

| Time box | Slice | Exit gate |
|---|---|---|
| Days 1–2 | Freeze false public claims and mock success paths; triage public PII, OCR logs, and file exposure; assign incident/data owners. | No sample/live confusion or unauthenticated sensitive field in a public response. |
| Days 2–4 | Publish one web/backend/mobile contract for identity, reports, tracking, status, errors, and public projections. Fix tracking field mismatch and server-owned verification. | Contract tests against the actual FastAPI app; authorization and forged-field negatives pass. |
| Days 4–7 | Complete one vertical report slice: location confirmation → evidence/provider failure → submit once → durable receipt → track → notification deep link. | End-to-end browser + API test passes on refresh, back, offline retry, duplicate retry, and denied permissions. |
| Days 7–10 | Normalize resident controls, localize all critical states, keyboard/screen-reader/320 px/200% zoom review, then split heavy bundles. | Both themes and EN/FIL critical flows pass; lint/build/contract checks block merges; measured mobile budget is met. |
| Release gate | Moderated resident and LGU review with realistic but clearly marked test data; security, privacy, records, and assisted-service sign-off. | No P0/P1 open in the agreed resident release scope; rollback and monitoring owners named. |

**Team practice:** keep one vertical slice in progress per user job; put the API schema and acceptance examples in the same change as frontend/backend implementation; review daily against a single blocker list; protect the main branch with build, lint, actual-app API contract, authorization, and critical browser-flow checks. Avoid adding further visual features until the first report-to-track slice meets its gate.

## Verification performed

- `git pull --ff-only`: updated from `ec6feefb` to `a69c8271`; branch remained clean before tests.
- Local browser: public landing, `/register`, `/report`, and `/track` inspected at desktop size in dark mode. No authenticated or production transaction was performed.
- `npm run build`: passed, with large-chunk warnings.
- `npm run lint`: failed, 231 errors and 37 warnings repository-wide. Targeted resident lint: 92 errors and 5 warnings in the eight checked files.
- `python -m pytest tests/test_e2e_open_reporting.py -q`: 64 passed, but this suite constructs a standalone FastAPI app and therefore does not prove the current backend contract.
- `python -m pytest tests/test_challenger_m2_2_security_edge.py -q`: 33 passed, 1 failed. The failure occurs before its tracking assertion because live AI moderation rejects the test's own “testing” report description. This makes that test nondeterministic and does not invalidate the other 33 checks.

## Decisions needed from owners

- LGU/product: approved service area, emergency contacts, public update governance, resident status vocabulary, service promises, and assisted-service route.
- Privacy/security: what evidence and precise locations can be public; ID/OCR provider access, retention, historical-log remediation, and manual review/appeal.
- Engineering/product: global actor identity, server-owned KYC levels, idempotent report semantics, offline draft policy, notification channels, and web/mobile contract version.
