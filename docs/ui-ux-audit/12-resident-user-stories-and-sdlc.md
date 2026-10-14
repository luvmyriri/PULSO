# Resident-side user stories, QA contract, and SDLC

| Field | Value |
|---|---|
| Document type | Product requirements + QA acceptance + delivery lifecycle |
| Status | Baseline verified; target contract proposed for approval |
| Version | 1.0 |
| Last validated | 23 August 2026 |
| Product scope | Resident web portal, resident mobile surfaces, shared API, identity, reporting, tracking, notifications, and closeout |
| Target stream | `codex/ui-reworks-residents`, consuming approved contracts from `codex/ui-reworks` |
| Implementation | Not started; this document changes no application code |

## 1. Executive QA assessment

PULSO already contains the main resident service loop: identity verification, registration, email verification, sign-in, report submission, jurisdiction and duplicate checks, government processing, status notifications, proof of resolution, and resident feedback. It is not yet safe to describe that loop as release-ready.

The most serious current risks are:

- a resident can update an official account when their independent numeric IDs collide;
- inactive resident accounts and previously issued tokens are not reliably blocked;
- report status and resident confirmation can bypass the intended lifecycle;
- uploaded evidence is publicly addressable and is not validated strongly enough server-side;
- registration, reset-password, notification, mobile, and profile clients disagree with the backend contract;
- automated identity and AI decisions lack complete accessible recovery routes;
- offline replay and double submission have no idempotency contract;
- English/Filipino, keyboard, screen-reader, light/dark, and low-connectivity parity are incomplete.

No visual implementation should be accepted until the P0 identity, authorization, state-machine, evidence, and endpoint-contract gates in this document pass.

## 2. How to read this document

### Evidence classification

| Label | Meaning |
|---|---|
| **Implemented** | A current backend route exists and at least one current resident client consumes it. This does not imply that it is defect-free. |
| **Backend-only** | A current route exists, but no active resident UI was confirmed. |
| **UI-contract gap** | A current client calls a path, method, or payload the backend does not provide. |
| **Observed risk** | The route is reachable but violates a security, data-integrity, lifecycle, privacy, accessibility, or recovery expectation. |
| **Proposed** | Target behavior for approval; it must not be represented as implemented. |
| **Decision required** | Product, operations, privacy, security, or legal ownership is needed before design freeze. |

### Source authority

When sources conflict, use this order:

1. current backend route decorators, schemas, models, and authorization dependencies;
2. current frontend/mobile calls and route declarations;
3. this target acceptance contract and the approved UI/UX dossier;
4. older catalogs and walkthroughs as historical context only.

The current web route authority is [App.jsx](../../frontend/src/App.jsx#L51). The resident API authority is [main.py](../../backend/main.py#L247), with identity behavior in [auth.py](../../backend/auth.py#L12), schemas in [schemas.py](../../backend/schemas.py#L14), and persistence behavior in [crud.py](../../backend/crud.py#L191).

## 3. Scope, actors, and data sensitivity

### Resident actors

| Actor | Need | Current authority |
|---|---|---|
| Visitor | Understand PULSO, eligibility, privacy, and the correct portal | Public routes only |
| Prospective resident | Prove residency and create an account | Public OCR, registration, and OTP routes |
| Unverified resident | Complete email verification or recover delivery | Cannot use protected APIs |
| Verified resident | Submit and track reports, receive updates, manage profile | JWT with role `resident` |
| KYC-upgraded resident | View or improve identity tier | Backend-only Bronze/Silver/Gold flow |
| Returning tracker | Quickly understand the latest case state and required action | `/dashboard` in-memory views |
| Assisted-service resident | Complete a task when camera, OCR, literacy, disability, or connectivity prevents self-service | **Proposed; operating owner required** |
| Privacy/support reviewer | Resolve identity, duplicate, eligibility, or account disputes | **Proposed; not a resident-facing role** |

### Sensitive data handled

| Data | Minimum classification | Required control |
|---|---|---|
| Government ID and PhilSys data | Highly restricted identity data | purpose notice, minimization, encryption, access audit, retention rule, no public URL |
| Name, email, phone, home address | Personal information | authenticated owner access, verified changes, cross-namespace object authorization |
| GPS, exact location, photos | Sensitive evidence/location | purpose-limited access, metadata policy, secure download, retention rule |
| Report narrative and feedback | Case record | ownership, public-safe projection, moderation with appeal/recovery |
| Trust/KYC score | Decision-affecting profile data | transparent policy, correction/appeal, no unexplained punishment |
| AI prompts/results | Derived/potentially sensitive data | disclosed processor use, minimized context, provenance and human review |

## 4. Current and target route model

### Current web routes

| Route | Current behavior | Contract state |
|---|---|---|
| `/` | Public landing and resident app download | Implemented |
| `/login` | Sign-in, registration OTP continuation, and modal recovery | Implemented |
| `/register` | ID scan, details, credentials, OTP, success | Implemented with contract defects |
| `/reset-password` | Token-link reset screen | **UI-contract gap** |
| `/dashboard` | Overview, reports, profile, settings as local tabs/modals | Implemented |
| `*` | Redirects to `/` | Implemented |

The URL-addressable report, update, account, and wizard routes in the [resident experience specification](./04-resident-experience-spec.md#4-route-model) are **proposed**, not current routes.

### Target route outcomes

- Reload, back, forward, share, and session recovery must retain the resident’s location in the flow.
- A report detail must have a stable URL and restore list filters/scroll position.
- Each report step must preserve an encrypted local draft and expose a safe exit.
- Deep links must redirect to sign-in and return to the intended resident record after authentication.
- Government routes must never be rendered from resident local-storage role edits.

## 5. Whole resident service cycle

```text
Discover service and scope
→ understand privacy and eligibility
→ verify residency / choose assisted review
→ create unverified account
→ verify email OTP
→ sign in and establish active session
→ view dashboard/advisories
→ capture evidence and confirm location
→ receive editable AI suggestion
→ review duplicate/jurisdiction result
→ submit exactly once and receive ticket
→ government review and assignment
→ resident receives public-safe updates
→ government supplies resolution proof
→ resident confirms/rates or raises a follow-up
→ case enters governed retention and analytics
```

### Intended report lifecycle

```text
pending
  → pending_approval
  → approved_internal
  → dispatched
  → resolved
  → closed_by_citizen

Branches before operational lock:
pending / unverified → rejected
pending / pending_approval / rejected → cancelled
```

This is an inferred intended path, not an enforced current state machine. The generic status route assigns any string ([main.py](../../backend/main.py#L1230)); resident confirmation has no `resolved` precondition ([crud.py](../../backend/crud.py#L427)); and public/archive/stat views omit or rename some terminal states.

### Target resident-facing vocabulary

| Internal state | Resident label | Resident meaning | Primary next action |
|---|---|---|---|
| `pending` | Received | PULSO has the report and ticket | View details |
| `pending_approval` | Under review | City staff verified the report and are planning action | Wait / respond if asked |
| `approved_internal` | Approved for action | The issue is approved for assignment | View update |
| `dispatched` | Team assigned | Work has been assigned or dispatched | Track progress |
| `in_progress` | Work in progress | A team is actively handling the issue | Track progress |
| `resolved` | Resolution ready for review | The city recorded completion evidence | Review resolution |
| `closed_by_citizen` | Closed | The resident confirmed the outcome | View record |
| `rejected` | Could not verify | Staff could not validate the report | Review reason / resubmit |
| `cancelled` | Retracted | The resident or authorized staff withdrew it before work lock | View record |
| `needs_information` | Information needed | Staff need a specific correction or detail | Provide information |
| `duplicate` | Linked to another report | Evidence contributes to a canonical ticket | Track canonical ticket |
| `outside_scope` | Referred elsewhere | Another service or jurisdiction owns the issue | Open referral |

The last three states are **proposed** and need endpoint/data-model approval.

## 6. Resident user-story catalog

### Summary and traceability

Acceptance criteria are addressed by story plus their displayed order: for example, the first criterion under `RES-US-003` is `RES-US-003-AC01`. Preserve these identifiers when criteria move into tickets or test management.

| ID | Epic | Story outcome | Priority | Current state | Primary API |
|---|---|---|---:|---|---|
| RES-US-001 | Discovery | Choose the correct service with scope, language, and privacy clarity | P1 | Partial | Public platform routes |
| RES-US-002 | Identity | Verify residency without an inaccessible automation dead end | P0 | Partial/risky | `POST /api/verify-residency` |
| RES-US-003 | Account | Register once with normalized, durable identity data | P0 | Partial/risky | `POST /api/auth/register` |
| RES-US-004 | Verification | Complete expiring, bounded email OTP verification | P0 | Partial/risky | Verify/resend routes |
| RES-US-005 | Authentication | Sign in only as an active verified resident | P0 | Partial/risky | Login and `/api/me` |
| RES-US-006 | Recovery | Recover access through one consistent code contract | P0 | UI drift | Forgot/verify/reset routes |
| RES-US-007 | Profile | View and change only the resident’s own profile/security | P0 | Critical risk | User and password routes |
| RES-US-008 | KYC | Understand and optionally upgrade verification | P1 | Backend-only | Resident KYC routes |
| RES-US-009 | Draft/evidence | Capture safe evidence and recover from interruption | P0 | Partial | Analyze/report multipart routes |
| RES-US-010 | Location | Confirm an accurate in-jurisdiction location without GPS dependency | P0 | Partial | Geocode/report routes |
| RES-US-011 | AI/duplicate | Treat AI and duplicate detection as reviewable assistance | P0 | Partial | Analyze/report routes |
| RES-US-012 | Submission | Receive one durable ticket and first event exactly once | P0 | Partial | `POST /api/reports` |
| RES-US-013 | Tracking | View owned reports and public-safe timeline truth | P0 | Partial | Report read/timeline routes |
| RES-US-014 | Retraction | Retract only permitted pre-work reports with clear consequences | P1 | Implemented/risky | Report cancel route |
| RES-US-015 | Closeout | Review proof, rate once, and request follow-up | P0 | Backend-only/risky | Report confirm route |
| RES-US-016 | Updates | Read, mark, and dismiss durable notifications/advisories | P1 | UI drift | Notification/advisory routes |
| RES-US-017 | Assistance | Get privacy-safe contextual help with deterministic fallback | P1 | Partial | AI assistant |
| RES-US-018 | Inclusive use | Complete all critical tasks across locale, theme, AT, and poor networks | P0 | Partial | Cross-cutting |

### RES-US-001 — Discover the correct resident service

**As a** visitor, **I want** to understand what PULSO handles and whether I am eligible **so that** I choose the correct action without exposing identity data unnecessarily.

Acceptance criteria:

- **Given** a first visit, **when** the page loads, **then** reporting, tracking, service area, emergency limitations, privacy summary, language, and staff sign-in separation are visible before marketing content.
- **Given** Filipino is selected, **when** the visitor navigates to registration or sign-in, **then** the selection persists and the document language changes.
- **Given** the visitor needs an emergency response, **when** they read reporting guidance, **then** the interface distinguishes PULSO from emergency channels and names the correct contact action.
- **Given** app download is unavailable, **then** the web journey remains complete and the download action reports a truthful error.

### RES-US-002 — Verify residency with recovery

**As a** prospective resident, **I want** to prove service eligibility safely **so that** I can register without being stranded by OCR, camera, or disability barriers.

Acceptance criteria:

- **Given** valid front/back images for the supported jurisdiction, **when** verification succeeds, **then** extracted fields, uncertainty, data use, and the next step are shown before registration.
- **Given** mismatch, outside jurisdiction, unreadable evidence, unsupported file, provider timeout, or low confidence, **then** each outcome has distinct plain-language instructions and preserves the usable draft.
- **Given** camera permission is denied or unavailable, **then** file upload and assisted/manual review remain available.
- **Given** repeated or abusive calls, **then** authenticated/rate-limited controls protect the identity processor without exposing whether a person exists.
- **Given** verification is abandoned, **then** temporary identity images follow an approved deletion schedule.

### RES-US-003 — Create one complete resident account

**As a** verified applicant, **I want** my reviewed details saved consistently **so that** my account and jurisdiction are correct on every device.

Acceptance criteria:

- Required fields and rules are identical in web, mobile, API schema, and persistence, including normalized barangay, age/DOB policy, phone, email, and password.
- **Given** duplicate email across any identity store, **then** registration fails safely without creating a second account.
- **Given** SMTP fails after account creation, **then** retry/resend resumes the same account; it does not ask the resident to register again.
- **Given** the same operation is retried, **then** an idempotency key returns the original result rather than creating another account.
- The response excludes secrets, raw OTP, identity image paths, and internal scoring metadata.

### RES-US-004 — Verify email with a bounded OTP

**As an** unverified resident, **I want** a reliable, expiring code flow **so that** I can activate my account securely.

Acceptance criteria:

- OTP is hashed at rest, single-use, expires at the displayed time, has bounded attempts, and has a server-enforced resend cooldown.
- Paste and one-time-code autofill work; errors preserve the email and entered context.
- A new OTP invalidates older codes and resend never reveals whether another account exists.
- Successful verification is idempotent and immediately permits sign-in.
- Delivery failure offers retry and assisted support without duplicating the resident.

### RES-US-005 — Establish an active resident session

**As a** verified resident, **I want** secure sign-in and session restoration **so that** only my active account reaches my data.

Acceptance criteria:

- Valid, verified, active residents receive a bounded session and land on the intended resident route.
- Invalid credentials return one non-enumerating message; unverified users receive a verification recovery action.
- Inactive, suspended, expired, revoked, or malformed sessions fail both at login and on every protected request.
- Production CAPTCHA cannot be bypassed by a client-provided literal.
- The client derives current role/capabilities from `/api/me`, not editable local-storage identity alone.
- Logout/recovery/security change invalidates the appropriate server sessions while preserving theme and language preferences.

### RES-US-006 — Recover a forgotten password

**As a** resident who lost access, **I want** one consistent recovery flow **so that** I can regain access without broken links or account disclosure.

Acceptance criteria:

- The supported flow is identifier → recovery code → code verification → new password → sign-in confirmation.
- `/login`, `/reset-password`, web, and mobile use the same versioned payload; no client calls a nonexistent token-verification route.
- Codes are single-use, rate-limited, and expire; success revokes prior sessions.
- New password policy is server-enforced and reuse rules are explained.
- Provider failure, expired code, wrong code, and lost email access each have a documented next action.

### RES-US-007 — Protect profile and security changes

**As a** resident, **I want** to see and edit only my profile **so that** another account can never be exposed or changed through an ID collision.

Acceptance criteria:

- Identity uses a globally unique subject or `(account_type, id)` pair on every authorization and foreign key.
- Owner checks cannot resolve an official record when a resident ID is numerically equal.
- Email changes require uniqueness and re-verification; security-sensitive changes require recent authentication.
- Current-password change rejects incorrect, reused, weak, or breached values according to policy.
- Every profile mutation has before/after audit metadata without storing secrets.

### RES-US-008 — Understand and upgrade KYC

**As a** resident, **I want** to understand optional verification levels **so that** I can make an informed choice and correct errors.

Acceptance criteria:

- The UI explains benefits, data use, retention, limitations, and whether the tier affects report handling.
- Declining optional KYC does not remove the basic reporting path unless a signed policy explicitly requires it.
- OCR/PhilSys results require identity match, confidence handling, correction, and manual-review routes.
- The upgrade, audit event, and resident-visible state commit atomically.
- Trust changes are explainable, bounded, appealable, and never silently penalize accessibility or low connectivity.

### RES-US-009 — Capture and retain safe evidence

**As a** resident at an issue location, **I want** to capture or upload evidence safely **so that** interruption or validation failure does not erase my work.

Acceptance criteria:

- Safety guidance precedes camera use; camera denial offers file selection and later attachment.
- Client and server validate allowlisted type, actual file signature, size, dimensions, decoding, malicious content, metadata, and filename.
- Rejected evidence is not left in public or orphan storage.
- Upload progress, cancellation, retry, and background interruption preserve the draft.
- Evidence is served through authorized/signed access, never a guessable public static path.

### RES-US-010 — Confirm location and jurisdiction

**As a** resident, **I want** to confirm where the issue is **so that** the correct city team receives a usable location.

Acceptance criteria:

- GPS is requested only after purpose explanation; search, manual pin, landmark, and textual description are equivalent alternatives.
- A default map center is never treated as resident confirmation.
- Inside, outside, unknown, checking, and provider-error states are distinct and accessible.
- Exact-location description is included in review, payload, persistence, government detail, and resident detail.
- Boundary version and address provenance are recorded; a provider outage can route to staff review.

### RES-US-011 — Review AI and duplicate assistance

**As a** resident, **I want** suggestions and related reports explained **so that** automation helps without making an unappealable civic decision.

Acceptance criteria:

- AI category/urgency is labeled as a suggestion and remains editable.
- Low confidence, quota, malformed output, or provider outage allows **Submit for staff review**.
- A duplicate response includes the canonical ticket, distance/reason, privacy-safe status, and option to contribute evidence or request review.
- Duplicate checking is transactional and returns the existing canonical identifier.
- AI moderation rejection gives a safe reason and review path; it never exposes model internals or discriminatory scoring.

### RES-US-012 — Submit exactly once and receive a durable ticket

**As a** resident, **I want** proof that the city received my report **so that** I do not resubmit after a timeout.

Acceptance criteria:

- The final review contains evidence, category, description, exact location, contact preference, privacy notice, and explicit **Submit report** action.
- A client operation ID/idempotency key binds the report and attachments; replay returns the original ticket.
- Report, first public timeline event, and transactional notification/outbox commit as one operation.
- Success returns stable ticket, status, server timestamp, and next-step policy.
- Unknown network outcome triggers reconciliation before a new submission is offered.

### RES-US-013 — Track owned and nearby reports truthfully

**As a** resident, **I want** a clear latest state and public-safe history **so that** I know what happened and whether I must act.

Acceptance criteria:

- Owned report list/detail and timeline reject cross-user access regardless of numeric ID collision.
- Every backend state maps to one approved resident label, explanation, and next action.
- Public reports remove reporter identity and sensitive evidence/location according to policy.
- Public timeline excludes internal notes and identifies freshness, actor unit where allowed, and source status.
- Loading, empty, filtered empty, stale, offline, 403, 404, and error are visually and semantically distinct.

### RES-US-014 — Retract an eligible report

**As a** resident, **I want** to retract a report before work is committed **so that** I can correct a mistake without disrupting active work.

Acceptance criteria:

- The server owns the cancellable-state list; the UI shows retraction only when permitted.
- Confirmation names the ticket, consequence, any trust policy, and **Keep report** safe action.
- Concurrent government assignment wins safely and returns a conflict with the latest state.
- Retraction is idempotent, audited with the correct resident actor type, and does not erase history.

### RES-US-015 — Review and confirm resolution once

**As a** reporting resident, **I want** to inspect completion evidence and respond **so that** closure reflects the real outcome.

Acceptance criteria:

- Confirmation is accepted only for an owned report currently in `resolved`.
- Rating is an integer from 1–5; note length/content and sensitive-data handling are defined.
- A repeated request returns the original result and cannot repeat a trust reward.
- Low rating or **Issue remains** creates a visible governed follow-up path; it does not silently close or reopen.
- Completion evidence is authorized, safe, timestamped, and linked to the responsible work item.

### RES-US-016 — Manage notifications and advisories

**As a** resident, **I want** reliable updates with meaningful destinations **so that** I can act without polling confusion.

Acceptance criteria:

- List, mark-one, mark-all, dismiss, and optional undo use the same paths/methods on web and mobile.
- Dismissed records are excluded from normal retrieval; read and hidden are separate durable states.
- Optimistic changes roll back on error and never hide an authentication or permission failure.
- Notifications carry structured report/advisory identifiers and public-safe lock-screen copy.
- Until push exists, copy states the actual polling/freshness behavior rather than “real time.”

### RES-US-017 — Receive privacy-safe assistance

**As a** resident, **I want** contextual help **so that** I can complete unfamiliar tasks without disclosing unnecessary personal data.

Acceptance criteria:

- The assistant names its limits and does not claim to decide eligibility, priority, approval, or emergency response.
- Context sent to external AI is minimized and disclosed; resident name is not injected unless necessary and consented.
- Timeout, quota, moderation, and malformed response have deterministic local help content.
- AI output cannot mutate reports, accounts, or government work without explicit review and authorized endpoints.

### RES-US-018 — Complete critical tasks inclusively

**As a** resident using any supported language, theme, device, input, or network condition, **I want** functional parity **so that** presentation does not determine access.

Acceptance criteria:

- Registration, verification, sign-in, recovery, reporting, tracking, and closeout pass WCAG 2.2 AA and manual keyboard/screen-reader testing.
- English and Filipino provide complete behavior/copy parity and correct document language.
- Light/dark/system themes preserve contrast, boundaries, map meaning, status meaning, and reduced-motion preference.
- Critical tasks reflow at 320 CSS px and 200% zoom without essential horizontal scrolling.
- Offline/background interruption preserves drafts and never represents mock data as live civic truth.

## 7. Resident endpoint contract

Common current outcomes: malformed body/query is normally `422`; invalid bearer is `401`; role/ownership denial is `403`; absent object is `404`. Target APIs should use one structured error envelope and explicit `409` for state or concurrency conflict.

### Platform, identity, and account

| Method and path | Access | Current purpose | Contract state |
|---|---|---|---|
| `GET /` | Public | API status | Implemented |
| `GET /api/health` | Public | Service health | Implemented; needs dependency/readiness split |
| `GET /api/download/resident-app` | Public | Resident APK | Implemented if artifact exists |
| `GET /api/geo/caloocan-border` | Public | Map boundary GeoJSON | Implemented |
| `GET /api/system/ip` | Public | Local network IP for download links | Implemented; production exposure decision required |
| `POST /api/verify-residency` | Public | ID OCR and jurisdiction gate | Observed risk: sensitive/costly unauthenticated upload |
| `POST /api/auth/register` | Public | Create unverified resident | Partial; account commits before mail success |
| `POST /api/auth/verify-registration` | Public | Verify email OTP | Partial; no expiry/attempt controls |
| `POST /api/auth/resend-code` | Public | Replace/send OTP | Partial; no backend cooldown |
| `POST /api/auth/login` | Public | OAuth form sign-in | Observed risk: `mobile_bypass` and stale account state |
| `POST /api/auth/forgot-password` | Public | Create/send reset code | Implemented with enumeration nuance |
| `POST /api/auth/verify-reset-code` | Public | Validate reset code | Implemented |
| `POST /api/auth/reset-password` | Public | Consume code and update password | Implemented; session revocation absent |
| `GET /api/auth/verify-token/{token}` | — | Called by `/reset-password` | **UI-contract gap: route does not exist** |
| `GET /api/me` | Bearer | Resolve current identity | Implemented; must enforce active state |
| `GET /api/users/{user_id}` | Bearer/self or official | Fetch profile | Observed cross-namespace ambiguity |
| `PATCH /api/users/{user_id}` | Bearer/self | Update profile | **P0 cross-namespace mutation risk** |
| `PATCH /api/auth/change-password` | Bearer | Change current password | Implemented; password/session policy incomplete |

### Reports, location, and closeout

| Method and path | Access | Current purpose | Contract state |
|---|---|---|---|
| `POST /api/reports/analyze` | Bearer | AI preflight over description/evidence | Implemented; no file hardening/manual fallback contract |
| `POST /api/reports` | Bearer, not resident-only | Submit multipart report | Implemented/risky; official IDs can enter `resident_id` |
| `GET /api/reports/user/{user_id}` | Owner or official role | List resident reports | Implemented; owner namespace risk |
| `GET /api/reports/public` | Bearer | Public-safe nearby reports | Implemented; status/public-location policy incomplete |
| `GET /api/reports/{report_id}` | Bearer; resident owner | Read report | Implemented |
| `GET /api/reports/{report_id}/timeline` | Bearer; resident owner gets public entries | Read lifecycle | Implemented; first entry may not commit |
| `POST` and `PATCH /api/reports/{report_id}/cancel` | Owner or authorized official | Retract eligible report | Implemented/risky actor namespace |
| `POST /api/reports/{report_id}/confirm` | Resident owner | Rate and close | Backend-only; missing state/rating/idempotency guards |
| `GET /api/geocode/reverse` | Bearer | Coordinates to address | Implemented |
| `GET /api/geocode/search` | Bearer | Address/place search | Backend-only for current resident web |
| `GET /api/maps/directions` | Bearer | Route lookup | Shared/primarily operations |

### Verification, updates, and assistance

| Method and path | Access | Current purpose | Contract state |
|---|---|---|---|
| `GET /api/residents/kyc-status` | Resident | View tier/trust | Backend-only |
| `POST /api/residents/upgrade-kyc` | Resident | OCR-based KYC upgrade | Backend-only; audit commit defect |
| `GET /api/advisories` | Bearer | Read city advisories | Implemented |
| `GET /api/notifications/user/{user_id}` | Self | List notifications | Implemented; hidden filter defect |
| `PATCH /api/notifications/user/{user_id}/read` | Self | Mark all read | Implemented backend |
| `POST /api/notifications/user/{user_id}/read-all` | — | Current web mark-all call | **UI-contract gap: wrong method and path** |
| `PATCH /api/notifications/{notification_id}/read` | Owner | Mark one read | Implemented |
| `DELETE /api/notifications/{notification_id}` | Owner | Dismiss notification | Implemented as soft hide; retrieval ignores hide |
| `POST /api/ai/assistant` | Bearer | Contextual AI help | Implemented; privacy/degraded-mode decision required |

### Resident mobile drift that contract tests must close

Current mobile code advertises or calls nonexistent/wrong contracts for token refresh, PCN verification, notifications, profile update, password method, report list authentication, and map data. It also falls back to mock civic records and stores/logs sensitive session data. Mobile is not considered parity-complete until it passes the same endpoint fixtures and lifecycle tests as web.

## 8. Resident QA strategy

### Test layers

| Layer | Required coverage | Exit evidence |
|---|---|---|
| Schema/unit | field rules, enum/state adjacency, rating bounds, ownership subject, trust calculations | deterministic unit suite with boundary partitions |
| API contract | method/path/body/response/error/pagination/idempotency for web and mobile | OpenAPI snapshot + generated/manual consumer contract suite |
| Data integration | transactions, FKs, unique identity, outbox, retention, audit/timeline side effects | isolated database tests with rollback and concurrency |
| Service integration | SMTP, OCR, PhilSys, Maps, AI, storage | stubs plus provider sandbox; timeout/quota/malformed cases |
| Frontend component | loading/empty/error/offline, validation, focus, theme, locale | component fixtures and accessibility assertions |
| End-to-end | register, verify, recover, submit, track, retract, resolve feedback | browser/device matrix with API and DB assertions |
| Security/privacy | BOLA/IDOR, token revocation, upload abuse, XSS, PII logs/exports | threat-model cases and approved evidence report |
| Accessibility | keyboard, screen reader, zoom/reflow, contrast, errors, motion | automated scan plus manual assistive-technology record |
| Performance/resilience | low-end device, slow network, retry/replay, provider outage | agreed budgets and recovery measurements |
| UAT | real resident cohorts and assisted-service staff | signed scenario outcomes and accepted residual risk |

### Mandatory negative and boundary suite

- Missing, malformed, expired, revoked, inactive, unverified, and wrong-role sessions.
- Resident A attempting Resident B and Official B profile/report/notification/document IDs.
- Minimum/maximum/invalid field lengths, Unicode Filipino names, duplicate email, and normalized barangay variants.
- OTP expiry, replay, resend flood, attempt exhaustion, mail outage, and two-device race.
- GPS denied, inaccurate coordinates, boundary edge, geocoder outage, and manual location.
- Empty, oversized, MIME-spoofed, polyglot, corrupted, malicious, metadata-heavy, and duplicate files.
- AI timeout, quota, unsafe false positive, low confidence, malformed output, and manual-review continuation.
- Concurrent duplicate submissions, lost response, replay, cancellation-versus-dispatch race, and repeat confirmation.
- Notification optimistic update failure, hidden record refresh, polling staleness, and deep-link ownership.
- 320 px/200% zoom, keyboard-only, screen reader, reduced motion, high contrast, light/dark, English/Filipino.

## 9. Resident SDLC

The SDLC governs future implementation; it does not authorize code changes now.

| Phase | Required activities | Controlled outputs | Exit gate |
|---|---|---|---|
| 0. Governance and safety | Name product, resident service, security, privacy, accessibility, localization, backend, QA, and operations owners; classify data; decide manual-review/appeal | RACI, data inventory, threat model, decision log | P0 owners and decision dates assigned |
| 1. Discovery | Observe resident/support journeys; validate cohorts, constraints, current metrics, support logs, provider failure | research findings, journey/service blueprint, baseline measures | Problems and outcomes signed by product/operations |
| 2. Requirements | Approve stories, lifecycle enum/adjacency, actor permissions, NFRs, analytics/privacy | baselined backlog, acceptance matrix, RTM | Every P0 story has measurable acceptance and owner |
| 3. Experience/design | Prototype light/dark, EN/FIL, responsive, offline/error/manual-review states; conduct usability/accessibility review | Figma flows, content matrix, component/state specs | Critical-task prototype success and accessibility review pass |
| 4. API/data design | Version endpoints; unique subject model; idempotency; errors; outbox; retention; secure storage; migrations | OpenAPI contract, ERD, state diagrams, ADRs, migration/rollback plan | Consumer/provider contract approved; privacy/security sign-off |
| 5. Test design | Create traceability, fixtures, role/ownership matrix, boundary/security/accessibility suites | test plan, data factory, mocks, environment matrix | No P0 acceptance criterion lacks a test |
| 6. Implementation | Future vertical slices behind flags; characterize current behavior before replacement | reviewed changes, unit/contract tests, observability | Changed-scope tests pass; no unreviewed contract drift |
| 7. Integration and system QA | Run full API/data/provider/browser/mobile/resilience/security suites | defect reports, evidence pack, release candidate | Zero open P0/P1; agreed P2 disposition |
| 8. UAT and operational readiness | Resident cohort UAT; support runbooks; content/legal review; migration rehearsal | signed UAT, training, runbooks, go/no-go record | Service owner, QA, security/privacy, accessibility approve |
| 9. Release | Staged cohort, feature flags, backups, dashboards, rollback rehearsal | deployment record, smoke evidence, change notice | SLOs and guardrails stable through observation window |
| 10. Operate and improve | Monitor funnels/errors/dwell/duplicates/complaints; incident response; retrospectives | service review, incident RCA, prioritized improvements | Monthly/quarterly governance decision |
| 11. Retirement | Export/retention/legal review, resident notice, token/key and storage cleanup | retirement plan and deletion evidence | Records/privacy owners approve closure |

### Resident delivery accountability

| Owner | Accountable for |
|---|---|
| Resident product/service owner | outcomes, backlog, policy decisions, go/no-go |
| Resident operations/support | actual service process, assisted review, resident communications, UAT |
| Design/content/research | validated flows, Figma states, English/Filipino content, usability evidence |
| Frontend/mobile | contract-compliant, accessible, resilient client behavior |
| Backend/data/platform | identity, authorization, API/state/transaction/storage/migration truth |
| QA lead | traceability, independent evidence, defect decision, release recommendation |
| Security/privacy/records | threat/privacy review, access, retention, audit, incident requirements |
| Accessibility/localization | WCAG and language-parity acceptance |
| Operations/on-call | environments, deployment, observability, rollback, incident response |

## 10. Environments and test data

| Environment | Purpose | Data rule |
|---|---|---|
| Local/component | Fast deterministic UI/unit work | synthetic only; providers stubbed |
| API integration | Transactions, migrations, authorization, files | isolated disposable DB and storage |
| QA | Full web/mobile/provider scenarios | synthetic identities; sandbox providers; no production ID images |
| Staging/UAT | Release-like validation and staff/resident UAT | controlled consented test cohort or synthetic records |
| Production | Staged release and monitoring | least privilege; no test accounts with broad access unless governed |

Required data dimensions include each lifecycle state, each identity/KYC state, every ownership boundary, boundary/near-boundary locations, Filipino/Unicode/long text, supported/hostile files, duplicate/concurrent cases, and both themes/locales.

## 11. Definition of Ready

A resident implementation item is ready only when it has:

- linked story ID, user job, route/screen, owner, priority, and measurable outcome;
- current behavior and target behavior explicitly separated;
- approved endpoint/schema/error/state/permission contract;
- all loading, empty, partial, offline, denied, expired, validation, success, and recovery states;
- light/dark, responsive, English/Filipino, accessibility, privacy, analytics, and retention notes;
- test data, automated/manual acceptance, rollout flag, telemetry, and rollback;
- no unresolved P0 dependency or policy question.

## 12. Definition of Done and release gates

A resident story is done only when:

- every acceptance criterion is traceable to passing test evidence;
- backend authorization rejects all cross-subject and wrong-role cases;
- state transition and all side effects are atomic, ordered, idempotent, and observable;
- no sensitive file or data is publicly addressable or unnecessarily logged;
- web and supported mobile clients pass the same contract fixtures;
- critical tasks pass accessibility, EN/FIL, light/dark, reflow, low-network, and recovery tests;
- metrics, alerts, support content, runbooks, migration, rollback, and residual-risk approval exist;
- QA, product/service owner, backend, frontend/mobile, security/privacy, accessibility, and operations sign off.

### Automatic no-go conditions

- Any cross-user/cross-account access or modification.
- Any inactive/revoked session accessing protected data.
- Any illegal lifecycle jump or closure without required evidence.
- Report/account/evidence loss, duplicate ticket from replay, or false “success.”
- Public access to restricted identity, location, evidence, or documents.
- Broken registration, verification, recovery, submission, tracking, or closeout route.
- Critical task blocked for keyboard/screen-reader users or missing English/Filipino functional parity.
- Mobile/mock data presented as current city truth.

## 13. Current resident release-blocking defect register

| ID | Severity | Current defect | Required proof of closure |
|---|---:|---|---|
| RES-BLK-001 | P0 | A resident and official can share a numeric ID; profile PATCH resolves the official first | Global-subject migration plus cross-account read/write suite |
| RES-BLK-002 | P0 | Inactive residents and previously issued sessions are not rejected consistently | Login and every protected-route revocation tests |
| RES-BLK-003 | P0 | Generic report status and resident confirmation bypass lifecycle/rating/idempotency | Central transition tests and repeat-confirm concurrency test |
| RES-BLK-004 | P0 | Identity/report/resolution files lack complete server validation and uploads are publicly mounted | Adversarial upload suite and direct-URL denial |
| RES-BLK-005 | P1 | `/reset-password` calls a nonexistent token route and sends the wrong reset payload | Shared web/mobile recovery contract E2E |
| RES-BLK-006 | P1 | Mark-all uses the wrong method/path; dismiss retrieval ignores `is_hidden`; one notification delete path uses an undefined token | Notification contract/component/refresh/session tests |
| RES-BLK-007 | P1 | Registration sends textual barangay/role fields absent from `ResidentCreate`; normalized barangay is lost | Web/mobile/schema/persistence fixture |
| RES-BLK-008 | P1 | Exact location description is shown in the form but omitted from report submission | Field→review→request→DB→government/resident detail test |
| RES-BLK-009 | P1 | Initial report timeline and KYC audit are appended after commit without a final commit | Atomic transaction and rollback/retry tests |
| RES-BLK-010 | P1 | AI analysis failure blocks resident submission rather than degrading to human review | Provider-outage E2E with preserved draft |
| RES-BLK-011 | P1 | Current report-detail handler is not connected from the report list and detail lacks a stable route | Card/notification/deep-link/reload/back E2E |
| RES-BLK-012 | P1 | Mobile calls wrong/missing endpoints, accepts CAPTCHA bypass, and can show mock civic data as real | Shared API fixtures and production no-mock assertion |
| RES-BLK-013 | P1 | Registration OTP lacks expiry, hashing, attempt limit, and server resend throttle | OTP security/boundary/race tests |
| RES-BLK-014 | P1 | `POST /api/reports` accepts any bearer and can write an official ID into `resident_id` | Resident-only authorization and foreign-key tests |

## 14. Defect severity and service targets

| Severity | Resident impact | Example | Release rule |
|---|---|---|---|
| P0 | Security/privacy breach, data corruption/loss, total critical-path failure, unsafe civic outcome | IDOR, public ID image, duplicate/false ticket, illegal closure | Immediate stop; no release |
| P1 | Major task blocked or misleading with no reasonable workaround | recovery mismatch, inaccessible submit, wrong status | Must fix before release |
| P2 | Material degradation with a safe workaround | pagination/filter defect, delayed noncritical update | Explicit owner/date required |
| P3 | Minor copy/visual issue without task or compliance impact | isolated alignment/copy polish | May defer with triage |

Initial targets for approval:

- 100% success in moderated critical safety/auth/ownership scenarios;
- at least 85% unassisted resident completion for registration, report, and tracking studies;
- zero unrecovered critical accessibility errors;
- p95 API and upload targets measured separately by network class;
- one ticket per idempotent submission operation;
- one timeline, audit, and notification side-effect set per accepted transition.

## 15. Traceability template

```text
Story / acceptance ID:
Resident cohort and job:
Current route and source evidence:
Target Figma frame/component/version:
API method/path/schema/error version:
Identity/ownership and data classification:
Source state → target state:
Transaction, idempotency and concurrency rule:
Web/mobile/light/dark/EN/FIL behavior:
Accessibility and resilience checks:
Automated tests and manual evidence:
Telemetry/SLO/alert:
Rollout flag and rollback:
Owner, reviewers, decision record:
```

## 16. Required decisions before resident implementation

1. Approve one global identity/actor model and migration away from colliding resident/official IDs.
2. Approve the canonical report state machine, exceptional states, and resident vocabulary.
3. Approve identity/evidence retention, secure storage, PhilSys/OCR access, and manual-review/appeal policy.
4. Decide the resident Trust/KYC policy, explanation, correction, appeal, and whether it affects service priority.
5. Approve idempotency/offline draft and reconciliation behavior for web and mobile.
6. Approve one versioned endpoint contract and parity plan for web/mobile.
7. Confirm resident English/Filipino parity, assisted-service owner, and accessibility acceptance team.
8. Decide notification delivery channels and describe polling honestly until push infrastructure exists.

Related documents: [resident experience specification](./04-resident-experience-spec.md), [experience framework](./02-experience-framework.md), [implementation plan](./06-implementation-plan.md), and [integrated lifecycle/API contract](./14-end-to-end-system-lifecycle-and-api-contract.md).
