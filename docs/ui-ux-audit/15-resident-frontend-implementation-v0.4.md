# Resident frontend implementation v0.4

**Status:** Implemented in the repository; Figma synchronization pending  
**Portal:** Public and authenticated resident web  
**Owner:** PULSO product and City Engineering decision owners  
**Implementation validated:** 2026-08-30  
**Approved direction:** Civic Aperture v0.2

## Outcome

The resident web now treats one field observation as the beginning of a traceable civic record. The implementation replaces the prior flat dashboard with a responsive public entry, resident authentication and registration, a persistent resident workspace, reload-safe reporting, report tracking, city updates, and account preferences.

This implementation does not change backend lifecycle or authorization rules. Server responses remain authoritative for identity, jurisdiction, ticket creation, classification, assignment, activity, and resolution.

## User and job

Primary user: a North Caloocan resident, including people using a narrow phone, an intermittent connection, denied camera/location permission, or Filipino language settings.

Primary jobs:

- understand what PULSO does and find the next action in the first public viewport;
- create and verify a resident account;
- capture evidence without a false verification claim;
- provide device coordinates or a manual address and landmark;
- preserve and resume a report draft across routes and reloads;
- submit once, receive a server-confirmed ticket, and follow public milestones;
- distinguish account notifications from city-published advisories; and
- maintain profile, language, theme, and session settings.

## Implemented information architecture

Public routes:

- `/` — public resident home
- `/login` — resident sign-in, account verification, and recovery
- `/register` — residency verification, OCR review, account creation, email verification
- `/reset-password` — redirects to the recovery state in `/login`
- `/gov` — separate, quiet staff entry

Authenticated resident routes:

- `/dashboard` — resident home and active report object
- `/dashboard/reports` — searchable and filterable resident records
- `/dashboard/reports/:reportId` — evidence, location alternative, status, and public activity
- `/dashboard/report/new/evidence`
- `/dashboard/report/new/location`
- `/dashboard/report/new/details`
- `/dashboard/report/new/review`
- `/dashboard/report/new/receipt`
- `/dashboard/updates` — account notifications and city advisories
- `/dashboard/account` — profile, preferences, and security

The five mobile destinations are stable: Home, My reports, Report, Updates, and Account. Larger layouts use a compact masthead with the same destinations and one primary reporting action.

## Core process contracts

### Registration

1. The resident uploads the front and back of an ID.
2. `/api/verify-residency` performs OCR and authoritative service-area validation.
3. Extracted name, address, and barangay are presented for resident review and correction.
4. `/api/auth/register` creates the unverified resident account.
5. `/api/auth/verify-registration` verifies the emailed code.

The interface does not describe an account or identity as verified before the server confirms it. Assisted registration is named as the recovery path when image capture is unavailable.

### Sign-in and recovery

- `/api/auth/login` remains the credential and role authority.
- Resident reCAPTCHA is rendered only when `VITE_RECAPTCHA_SITE_KEY` is configured; sign-in is disabled with a recoverable configuration message otherwise.
- Government accounts are directed to the staff entry.
- Unverified residents are moved into the verification-code state.
- Recovery uses `/api/auth/forgot-password`, `/api/auth/verify-reset-code`, and `/api/auth/reset-password`.

### Reporting

The implemented route sequence is evidence → location → details → review → receipt.

- Evidence is recommended, not fabricated and not required when capture fails.
- Optional `/api/reports/analyze` output is explicitly a suggestion. It never gates manual classification or represents city verification.
- Location starts unknown. The initial map is explicitly service-area context and is not presented as the resident’s location.
- Device location, authenticated geocoder search, manual map nudging, and address/landmark entry are available; denied or unavailable permission keeps the manual recovery path intact.
- Exact spot/directions are preserved in the submitted description because the current backend does not have a separate exact-location field.
- Draft metadata is stored under `pulso_resident_report_draft_v2`; the selected evidence Blob is stored separately in IndexedDB and restored after reload without placing image bytes in localStorage.
- The URL records the current step and the draft survives reload.
- Residents can exit without losing the draft or explicitly discard it through a consequence-aware confirmation.
- Review exposes Edit actions for every section plus explicit contact/privacy choices. The current API has no per-report delivery-channel field, so that choice is not falsely submitted as authoritative report data.
- `/api/reports` creates the record. A ticket and success receipt appear only after a successful server response.
- A definite failed submission leaves the resident on review with a recoverable error and intact draft. A connection-ambiguous attempt disables blind repeat submission and checks `/api/reports/user/:userId` before enabling a retry.
- The receipt exposes copy and text-download actions, server time, received state, location, and a clearly device-local update preference.

### Tracking and updates

- `/api/reports/user/:userId` populates resident-owned records.
- `/api/reports/:reportId` and `/api/reports/:reportId/timeline` populate the engineering record and public activity.
- `PATCH /api/reports/:reportId/cancel` is exposed only in the server-permitted pre-work states and retains the audit record.
- `POST /api/reports/:reportId/confirm` records the resident’s resolution confirmation, rating, and optional feedback when the report is resolved.
- `/api/reports/public` populates privacy-safe nearby verified work; these rows do not deep-link to another resident’s private record.
- `/api/notifications/user/:userId`, the mark-all endpoint, and per-notification read/delete endpoints drive account updates. A notification links to an owned report only when its ticket can be matched to loaded resident records.
- `/api/advisories` drives city-published advisories.
- `PATCH /api/auth/change-password` supports an authenticated current/new/confirmation password flow in Account security.

## Component and visual inventory

Implemented reusable patterns:

- Civic Aperture light/dark semantic token layer
- public and portal mastheads
- resident mobile bottom navigation
- primary, secondary, quiet, danger, and icon buttons
- field, select, textarea, password, checkbox, and upload controls
- inline success, warning, and error feedback
- evidence aperture and coordinate rail
- status badge with text, color, and shape
- Signal Cut lifecycle progress
- persistent active-report object
- open ruled report/advisory lists
- loading skeleton, first-use empty, filtered empty, partial failure, and retry states
- report list, record detail, evidence pair, and public timeline
- route-aware reporting stepper, review definition list, and server-confirmed receipt
- account tabs and preference rows

The resident implementation is scoped under `.resident-app`, so the government workspace retains its existing visual behavior.

## State, failure, and provenance matrix

| Surface | Loading | Empty | Partial/error | Authoritative state |
| --- | --- | --- | --- | --- |
| Home active report | skeleton | first-use task | retry alert | latest resident report response |
| Recent reports | skeleton | explicit no-match copy | report-specific error | resident report endpoint |
| Nearby issues | skeleton | explicit no-match copy | separate partial error | public report endpoint |
| City updates | skeleton | no published updates | separate partial error | advisory endpoint |
| Report detail | loading rows | no evidence/no public timeline | retry or access error | report and timeline endpoints |
| Evidence | local preview | no image allowed | invalid type/size and analysis failure | resident-selected file; AI is suggestion only |
| Location | request message | unknown until entered | denied/unavailable/reverse lookup failure | device coordinates plus resident confirmation, or resident-entered text |
| Submission | disabled/loading action | not applicable | draft-preserving error | report-create response |
| Receipt | only after confirmed response | missing receipt recovery | My reports fallback | server ticket response |
| Notifications | loading rows | no notifications | separate partial error | notification endpoint |

## Accessibility and responsive acceptance

Implemented and runtime-validated:

- semantic landmarks, heading order, labels, buttons, links, tabs, lists, terms, and definitions;
- skip links for public, auth, registration, and portal surfaces;
- 3 px visible focus treatment and visible focused controls in dark mode;
- generally 44 px or larger resident targets;
- text and non-color status cues;
- true evidence alternatives and a text/link alternative for the map;
- `prefers-reduced-motion` and forced-color handling;
- identical content meaning and control boundaries in light and dark themes;
- mobile re-composition rather than a shrunken desktop shell;
- 320 px and 390 px reflow with no horizontal overflow;
- five and only five resident mobile destinations; and
- English/Filipino navigation, authentication and recovery, registration, reporting guidance and recovery states, category choices, statuses, public content, updates, and account/security controls without the prior translated-category lookup crash.

Resident-owned interface copy now has functional English/Filipino parity. Server-provided validation messages, report descriptions, notification bodies, advisory content, official names, addresses, and record data render from their authoritative source and may remain in their authored language. Editorial/LGU review is still required before the Filipino copy can be labeled approved public-service language.

## Validation evidence

Executed 2026-08-30:

- `npm run build` — passed
- focused ESLint for `src/resident/ResidentExperience.jsx` and `src/App.jsx` — passed
- public first viewport — verified at 1280×720 and 390×844
- authenticated home — verified at desktop and mobile widths with live resident session/data
- report flow — verified from evidence through review without submitting a record
- draft reload — verified on `/dashboard/report/new/review`
- language switch — verified English → Filipino → English
- dark theme — verified and restored to light
- 320 px reflow — verified no horizontal overflow on public and portal routes
- current redesign console errors — none observed

Repository-wide ESLint still reports legacy errors in unrelated government, 3D, component, and deprecated resident files. These pre-existing errors are not introduced by the redesign and were not expanded into this implementation scope.

## Figma synchronization status

Live Figma inspection confirmed the three working pages, separate light/dark token collections, scale variables, typography styles, resident navigation, status, field, progress, alert, and evidence-record components. The Figma Starter MCP limit was reached before implementation artifacts could be written and validated.

No Figma mutation is claimed. Next Figma action: update the resident reviewer templates and Core Library patterns from this implemented contract, then verify component bindings, variants, light/dark parity, and responsive annotations in the shared file.

## Decision dependencies

The following remain proposed until product and LGU owners approve them:

- final resident route vocabulary;
- resident-facing lifecycle labels and mappings;
- identity verification policy and assisted-service operating procedure;
- which nearby issue fields are public;
- retention and deletion behavior for report drafts and evidence;
- final bilingual editorial copy; and
- final typography and Figma variable rebinding.
