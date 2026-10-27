# FinalIntegratedPulso integration

Status: implemented locally, validated 27 October 2026. This is a web resident/government integration, not a production deployment or a native-mobile release.

## Provenance and preservation

- Destination: `FinalIntegratedPulso`, created from this government workspace on `ValFinalization` at `2c823d063bc7343e30b05349635be4cbf67c4f7c`.
- Latest fetched resident source: `origin/Finals-refractor-92526` at `db6c880c` (full hash in the adjacent source manifest). Resident-only content was selectively imported; the entire source branch was not merged.
- The previously uncommitted government implementation is included in this integration. Government dashboards, permissions, scoped report review/assignment, work orders, independent completion verification, resident administration, reviewed publications, private report routing, and their migrations were retained.
- A recoverable tracked binary patch, untracked-file archive, original branch/head metadata, and merge previews were saved before implementation in `C:/Users/Val/Desktop/PULSO-integration-checkpoints/20261027-202626`. Ignored credentials, uploads, database volumes, dependencies, and runtime state were not copied or committed.

## Connected flows

| Resident task | Shared authoritative record / government action |
|---|---|
| Registration, ID capture/review UI, contact availability and confirmation | Resident row with normalized contact fields; confirmed sign-in remains separate from staff identity review and account access. The registration barangay label resolves through the existing area catalog. |
| Submit a report through the wizard or quick report | Existing `/api/reports` intake, durable ticket/tracking credentials, boundary/upload checks, real AI analysis with manual-review fallback, and the same government intake queue and reviewer assignment. |
| My reports / report detail | Owner-scoped reports; stored coordinates, evidence and status; `/api/reports/{id}/timeline` public-only activity. Missing data never substitutes a stock photo, invented place or fixed event date. |
| Resident account restrictions | Existing government resident administration revokes sessions and prevents restricted accounts from using authenticated functions. |
| City news, advisories and announcements | Government draft/review/approval/publication produces immutable public snapshots through `/api/announcements`. Resident home and dashboard consume those snapshots, not hard-coded municipal notices. Drafts, staff notes and private associations remain private. |
| Notification settings / deep links | Existing versioned resident notification-preferences endpoint and report/publication links are retained alongside the latest resident UI. |

Registration confirmation retains HMAC-stored, ten-minute, attempt-limited codes. Confirmation and password recovery stay on the email channel; the source branch’s identical OTP-to-phone fallback was not adopted because resident profile phone numbers have no independent verification state. Report-notification SMS remains a separate existing capability. The source `/api/auth/verify-code` alias works with the same authoritative confirmation implementation. Pending registration retries preserve the account row, governed restrictions and staff administration metadata. Contact uniqueness is checked at registration, confirmation, profile phone updates and unconfirmed-account recovery. Partial unique indexes protect confirmed normalized contacts. Rate-limit account identifiers are supplied only after authentication; arbitrary bearer-token payloads cannot select a fresh quota.

The resident source contained public-map changes exposing unreviewed reports and exact coordinates, simulated evidence classification, sample advisories blended into the live feed, fixed timeline dates and stock evidence fallbacks. Those were reconciled with the existing privacy and state-truth contracts. Original uploaded evidence pixels are retained; location/time metadata is displayed outside the image. Report duplicates use the backend's authoritative conflict response; the UI does not claim evidence was linked by an unsupported action.

Resident draft restoration preserves existing fields while clearing transient files and fresh consent. A saved/default map center does not confirm a report location. Legacy drafts require explicit location confirmation before submission. Narrow resident navigation keeps its menu reachable.

## Schema and existing data

The single integrated Alembic head is `18efa117cb09`, following government head `17def006ba98`. It carries the resident normalized-contact columns and indexes after the government migration chain. Bootstrap assertions, schema inventory and the guarded test runner agree on this head. The local application database was upgraded without deleting or merging account rows.

Existing confirmed resident IDs 15 and 17 share a phone identity. Their original contact values and account ownership were preserved. Ambiguous normalized values remain null for manual reconciliation; availability checks also examine original contact values so new registrations cannot claim them. This is an existing-data issue requiring an authorized account review, not an automatic account merge.

## Verification

- Full guarded disposable-PostGIS run: **261 passed** across government workflows/access guards, command reliability, staff and resident administration, settings, projects, notifications, retained operations, private report routing, Records access, and new resident/government integration checks.
- New integration tests cover registration → HMAC confirmation → staff account restriction, legacy/canonical contact conflicts, resident intake → staff assignment → owner visibility, all three reviewed publication formats, and rate-limit identity spoofing.
- A final ten-test integration run additionally covers authentication secrets staying off unverified phone channels.
- Production frontend build passed. Imported/integrated JavaScript was linted with zero errors; existing upstream unused-variable/dependency/refresh warnings remain. Large production bundles remain a known performance limitation.
- Live checks: preserved signed-in government overview; resident public home, registration and report wizard at desktop and 320 CSS px; light/dark home; no page horizontal overflow; saved-location confirmation blocks Continue until explicitly confirmed. Preview captures are under `output/final-integration/`.
- Test records and provider mocks were confined to the named disposable database. No real report was submitted, publication issued, account restricted, or email/SMS dispatched during acceptance testing.

Live resident sign-in CAPTCHA, real ID/OCR/liveness, camera/geolocation permissions, and provider delivery were not exercised with real personal data. Passing local checks is not a claim of production identity verification or guaranteed message delivery. An authenticated resident browser review remains a follow-up using a human-completed CAPTCHA; backend owner/access flows are covered by the automated checks.

## Design reconciliation and remaining boundaries

The requested authority is the latest resident branch UI together with the existing government work. The shared Figma file was inspected in its existing browser tab; it still requires sign-in to edit/inspect and no Figma write tool is available. No Figma mutation is claimed. The next Figma action is to reconcile the paired resident templates, shared theme controls, server-backed publication cards and true report-detail states in the existing Core Library without replacing the government workspace.

Native `mobile_app/` changes, source deployment scripts, embedded database credentials, runtime logs and source government redesigns were excluded. External referral email remains governed by the existing configuration and approval rules; this integration does not enable new external sending. The new branch is local until explicitly pushed.

## Public header account context correction

The public header previously displayed any locally stored account, including the City Engineer session, as an active account badge. It now displays that badge only for `role=resident`; staff sessions leave resident Sign In/Create Account controls visible across desktop, mobile and the navigation menu. Resident account links consistently lead to `/dashboard`. This presentation change does not log out staff, modify credentials or change backend authorization. A successful resident login still replaces the shared active session. Targeted lint returned zero errors with two existing unused-code warnings; the production build passed. Live browser verification was unavailable because local browser use is disabled in Work settings.
