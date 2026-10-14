# PULSO public and resident runtime audit

| Field | Value |
|---|---|
| Validation date | 29 August 2026 |
| Artifact status | **Observed current behavior**; redesign recommendations are **proposed** |
| Runtime | Local unreleased web client on `127.0.0.1:5173`, local API on port `8000` |
| Roles exercised | Public visitor and a seeded verified-resident test account |
| Viewports | Desktop, 390 px mobile, and 320 px reflow |
| Release posture | **Blocked** by critical task, truth, localization, recovery, and responsive failures |

## Scope and evidence boundary

This audit records what the running public and resident website actually did. It does not promote current behavior to approved product truth. `PRODUCT.md` and the approved Civic Aperture direction remain authoritative; the resident experience, user stories, lifecycle, routes, and API documents remain proposed until their named owners approve them.

To exercise authenticated behavior, the existing `backend/create_test_accounts.py` fixture was run and a synthetic resident was created in the local database. The frontend and API were started with Google's documented test reCAPTCHA pair because the checked-in local runtime values did not form a working test pair. No real resident identity document was uploaded. No civic report was submitted, no existing report was retracted, and no profile, password, notification, privacy, or permission state was changed. Report-detail and resolution-confirmation behavior could therefore be inspected in source but not validated end to end against a resident-owned record.

Screenshots in this folder are evidence from this run, not implementation-ready handoff. Superseded captures `04-registration-language-toggle.png` and `07-report-form.png` are retained but are not used as primary evidence.

## Executive understanding

The resident side currently combines five products inside one experience:

1. a promotional public site;
2. identity/residency verification and account creation;
3. a signed-in reporting and tracking portal;
4. a public-safe nearby-hazard and city-update surface; and
5. profile, security, notification, privacy, help, and emergency utilities.

The intended civic loop is visible: a resident proves eligibility, signs in, captures evidence and location, receives AI assistance, submits a report, follows its status, receives updates, and confirms the outcome. The runtime does not yet preserve that loop truthfully or reliably. The most serious failures are a Filipino/Tagalog reporting crash, false GPS verification using default coordinates, an AI path that accepts unrelated imagery as infrastructure evidence, nonfunctional password recovery, and unusable public/resident layouts at mobile widths.

## Observed process walkthrough

| # | Process and result | Health | Primary evidence |
|---:|---|---|---|
| 1 | **Discover PULSO.** The desktop public home establishes a city-engineering identity and a strong visual focal region. The first viewport offers `Register Now` and `View Portal Guide`, but it does not clearly expose `Report an issue`, `Track a report`, resident sign-in, and a separate quiet staff sign-in as the four service-entry choices. | Partial | [01-public-home.png](./01-public-home.png) |
| 2 | **Open the portal guide.** `View Portal Guide` moved the page only about 216 px, opened no guide, added no route/hash, and left a large blank region. | Broken | [02-public-portal-guide.png](./02-public-portal-guide.png) |
| 3 | **Register.** Step 1 requires front and back ID imagery and agreement to terms before the interface explains accepted documents, field-level purpose, retention, verification states, a manual-review path, or assisted service. The copy describes document OCR as a “biometric ID scan.” | High risk | [03-resident-registration.png](./03-resident-registration.png) |
| 4 | **Choose Filipino/Tagalog.** Selecting Tagalog persisted into the authenticated portal, but the registration screen remained in English. The dashboard then rendered a mixture of translated and untranslated content. | Broken parity | [04-registration-tagalog.png](./04-registration-tagalog.png), [06-resident-dashboard.png](./06-resident-dashboard.png) |
| 5 | **Sign in.** The resident login separated residents from government users and exposed CAPTCHA and recovery controls. Local sign-in initially failed because the frontend and backend CAPTCHA configuration did not match; a test-only runtime override was required. | Partial; local setup mismatch | [05-resident-login.png](./05-resident-login.png) |
| 6 | **Recover access.** Repeated activation of `Forgot Password?` left the login form in place and exposed no recovery step or route, despite recovery UI branches in source. A resident without their password has no functioning web recovery path. Browser autofill contaminated the visual capture, so this result is retained as an inspected DOM observation rather than shareable screenshot evidence. | **Critical** | Runtime DOM observation; source branch in `frontend/src/pages/Login.jsx` |
| 7 | **Orient on the dashboard.** The portal exposes quick report, report history, map, services, knowledge, profile, settings, advisories, nearby hazards, emergency contacts, and a Trust Score. It uses both top navigation and a shortcut rail, producing competing models. English remains in core content after Tagalog selection. | Partial | [06-resident-dashboard.png](./06-resident-dashboard.png) |
| 8 | **Start a report in Tagalog.** Opening Quick Report after Tagalog selection crashed the entire resident application with `TypeError: Cannot read properties of undefined (reading 'color')`; recovery was limited to restarting the session. Source confirms that translated category labels are used as keys into English-only metadata. | **Critical** | [07-report-form-system-fault.png](./07-report-form-system-fault.png) |
| 9 | **Start a report in English.** The form immediately labels an incident location “Verified” while it is still resolving and shows the default Caloocan center coordinates `14.7566, 121.0450`. It requires a photo before category selection and keeps the exact-location description separate from the submitted payload. | **Critical truth failure** | [08-report-form-english.png](./08-report-form-english.png) |
| 10 | **Upload and analyze evidence.** An unrelated PULSO illustration was accepted, permanently watermarked `PULSO GPS VERIFIED` with the unconfirmed default coordinates and timestamp, classified as `General Infrastructure`, and allowed the final submit control to become active. The report was not submitted. | **Critical evidence failure** | [09-report-ai-analysis.png](./09-report-ai-analysis.png) |
| 11 | **Find owned reports.** The seeded resident correctly saw an empty collection and a submit action. The horizontal desktop status rail clipped labels and the empty state did not distinguish first use, filtered empty, failed fetch, or stale/offline data. | Partial | [10-my-reports-empty.png](./10-my-reports-empty.png) |
| 12 | **Understand nearby hazards.** The map and list alternative are useful paired views. Cards expose category, status, distance, and barangay. The surface calls itself “Live” without visible freshness/provenance, exposes internal-style status vocabulary, and clips a category filter. | Strongest current pattern, still partial | [11-nearby-hazard-map.png](./11-nearby-hazard-map.png), [12-nearby-hazards-list.png](./12-nearby-hazards-list.png) |
| 13 | **Read notifications.** Empty notification surfaces still expose `Mark all as read`; the header bell has no accessible name in the DOM. There was no resident-owned event with which to validate a deep link, read state, dismissal, or failure recovery. | Partial | [13-notifications-empty.png](./13-notifications-empty.png), [14-notification-history-empty.png](./14-notification-history-empty.png) |
| 14 | **Manage account and security.** Profile exposes verified identity and inline email/mobile updates with no visible re-verification or consequence messaging. Settings contains password change and sign-out only; language, notification, accessibility, session, privacy, and help preferences are absent. | High risk | [15-resident-profile.png](./15-resident-profile.png), [16-resident-settings.png](./16-resident-settings.png) |
| 15 | **Understand privacy.** The modal discloses precise GPS, imagery, personal identifiers, and Gemini use, but it lacks purpose/retention/visibility by field, resident rights and contacts, provider-transfer limits, and a manual alternative. “Government-grade servers” is an unsupported assurance. | Incomplete | [17-resident-privacy.png](./17-resident-privacy.png) |
| 16 | **Use dark mode.** Content and actions remain broadly available, but the visual result is near-black and card-heavy rather than the approved deep-survey-blue Night Inspection direction. Contrast and forced-colors behavior were not fully measured. | Partial | [18-resident-dark-mode.png](./18-resident-dark-mode.png) |
| 17 | **Use a phone or zoomed/narrow layout.** At 390 px the signed-in portal scales/clips a desktop composition into an unreadable viewport with competing navigation. At 320 px essential content remains clipped. The public home at 390 px hides the headline and primary actions and renders half the first viewport black. | **Critical** | [19-resident-mobile-dashboard-390.png](./19-resident-mobile-dashboard-390.png), [20-resident-reflow-320.png](./20-resident-reflow-320.png), [21-public-home-mobile-390.png](./21-public-home-mobile-390.png) |

## Actual runtime process model

```text
Public home
  -> register
     -> ID front/back capture
     -> OCR/eligibility result
     -> identity and contact details
     -> account/OTP completion
  -> resident sign-in + CAPTCHA
     -> /dashboard (all resident destinations are in-memory tabs or modals)
        -> Quick Report
           -> automatic device-location request or default city center
           -> photo/camera
           -> immediate GPS watermark
           -> automatic AI analysis
           -> category + exact-location description + notes
           -> confirmation -> POST /api/reports
        -> My Reports -> status filter -> report card/detail modal
        -> Nearby Hazards -> map or list
        -> Notifications/advisories
        -> Profile / Settings / Privacy
```

The current web router exposes only `/dashboard` for the authenticated resident experience. Report creation, report detail, notifications, profile, and settings have no stable URLs. Reload, Back, Forward, sharing, deep-linking, session recovery, and draft recovery therefore cannot preserve the resident's place in the service flow. This conflicts with the proposed route and draft contract in `04-resident-experience-spec.md` and `12-resident-user-stories-and-sdlc.md`.

## Release-blocking findings

### P0 — fix before visual expansion

1. **Translated labels are treated as data identifiers.** `REPORT_CATEGORIES(t)` returns Filipino labels, but `ReportCategoryRadio` indexes `CATEGORY_META[opt]`, whose keys are English. The missing metadata causes the observed crash. Categories need stable IDs, with translation only at presentation boundaries.
2. **Location truth is fabricated.** Report state initializes to a city-center coordinate, the UI labels the location verified before success, and uploaded files receive a `GPS VERIFIED` watermark regardless of permission/result/provenance. A default center must remain an explicitly unconfirmed map viewport, never evidence metadata.
3. **AI is acting as a submission gate and evidence validator.** Unrelated imagery passed analysis and activated submission. AI output must be advisory, editable, confidence/provenance-labelled, and unable to manufacture verification. Manual category selection and recovery must remain available.
4. **Public and resident mobile task entry is unusable.** The first public viewport hides the service proposition and actions; the authenticated portal clips a desktop layout at 390/320 px. The resident product is field-first and cannot ship without phone-width reporting and tracking.
5. **Password recovery is nonfunctional.** The visible recovery control does not transition away from login in the audited runtime.
6. **The report flow has no durable URL/history/draft.** One modal inside one route cannot meet reload-safe, back/forward-aware, interruption-recoverable reporting requirements.

### P1 — major trust, accessibility, and contract gaps

- Registration collects sensitive ID imagery before explaining the full data contract, accepted evidence, uncertainty outcomes, retention, and assisted/manual review.
- English/Filipino functional parity is incomplete across registration, dashboard, report content, notices, statuses, and errors.
- The exact-location description is collected in UI state but is not appended to the report payload shown in the submit function.
- Public claims such as real-time processing, 24/7 availability, response targets, adoption/outcome metrics, and production-version language have no approved evidence in `PRODUCT.md`.
- Trust Score rewards and penalties gamify access to civic service without an approved policy, explanation, appeal, or assurance that service priority is unaffected.
- Notification mark-all calls `POST .../read-all`, while the current API contract documents `PATCH .../read`; optimistic UI can diverge from the server. Hidden notifications are also documented as returning from the list endpoint.
- Icon-only notification/profile controls lack consistently exposed accessible names. Modal focus entry/return, announcements, and full keyboard behavior were not demonstrated.
- First-use empty, filtered empty, loading, stale, offline, partial, permission-limited, recoverable error, and system error are not reliably distinguished.
- Inline email/mobile updates lack visible re-verification and session/security consequences.
- The privacy surface uses broad assurances rather than a complete, verifiable resident data contract.

### P2 — visual and interaction debt

- The resident files participate in a repository-wide set of **82** automated style-detector findings, including gray text on colored surfaces, violet/orange gradients, hard-coded semantic colors, and a bouncing animation.
- The public experience relies on decorative technical grids and a 3D brain/city illustration rather than evidence-led Civic Aperture framing.
- The dashboard is card-heavy and visually competitive; routine information should become quieter ruled lists while the active report, evidence, and location carry emphasis.
- Dark mode is functional in concept but drifts from Night Inspection and needs measured contrast, reduced-motion, forced-colors, and 200% zoom validation.

## What is already worth preserving

- Public and government experiences are clearly separated at authentication.
- Evidence capture offers both camera and file-upload paths.
- The report UI makes category, location, and resident notes visible rather than hiding them behind automation.
- Nearby hazards provide a real list alternative to the map.
- Emergency contacts are placed in the signed-in resident context.
- Light, system, and dark theme controls preserve broadly equivalent content.
- My Reports already anticipates multiple lifecycle states and a report-detail/timeline concept, even though the route and canonical lifecycle are not yet governed.

## Proposed redesign and refactor seams

These are design/architecture seams, not authorization to edit product code:

1. **Resident service shell:** real route/history model, five stable mobile destinations (Home, My reports, Report, Updates, Account), one larger-screen navigation model, preserved selected record/filter/freshness.
2. **Draft/report state machine:** evidence, location, details, review, receipt; encrypted durable draft; safe exit; session-expiry return; idempotent final submission and durable ticket.
3. **Location/provenance service:** separate map center, device reading, resident-confirmed location, geocoded address, jurisdiction result, accuracy, time, and provider. Only the confirmed state may enter evidence or payload metadata.
4. **Evidence pipeline:** original evidence, derivative preview, metadata/provenance, upload progress/retry, safe text alternative, retention, and authoritative verification kept distinct.
5. **AI advisory adapter:** stable category IDs, suggestion/confidence/reason/provenance, resident override, provider failure, inappropriate-content review, and human/manual fallback.
6. **Localization contract:** stable IDs beneath copy; complete English/Filipino resources; `<html lang>` updates; translated validation, errors, status explanations, privacy, and recovery.
7. **Identity and account orchestration:** explain-before-collect verification, minimal evidence, pending/manual-review states, re-verification for contact changes, session management, appeal and assisted-service routes.
8. **Canonical civic record projection:** one governed lifecycle mapped to resident labels, latest event, required action, evidence/location summary, freshness, ownership, privacy-safe public projection, and immutable history.
9. **Notification contract:** durable deep links, one API vocabulary, read/hidden synchronization, delivery/failure state, privacy-safe lock-screen copy, and honest polling/freshness language.
10. **Public claims registry:** every performance, availability, adoption, verification, production, and security statement linked to an owner and evidence—or removed.
11. **Responsive/accessibility primitives:** 44 px public targets, visible 3 px focus, labelled icon buttons, semantic dialogs/tables, focus return, announcements, evidence text alternatives, map list parity, 320 px reflow, 200% zoom, reduced motion, and forced colors.
12. **Civic Aperture composition:** replace decorative 3D/technical effects with one true-color evidence or local-map focal region, real Coordinate Rail data, restrained Signal Cut lifecycle cues, quiet open lists, and explicit sample-data labelling.

## Recommended first redesign slice

Start with the full **public entry -> guided report -> durable receipt -> report detail** slice, designed mobile-first and then expanded to larger screens. It resolves the largest resident risk while establishing shared primitives for tracking, notifications, account recovery, and government handoff.

The first public viewport must answer what PULSO does, who it serves, and what the resident should do next. Expose `Report an issue`, `Track a report`, and resident sign-in clearly; keep staff sign-in separate and quiet. The report slice must include permission denial, offline/draft, upload failure, AI/provider failure, uncertain location, outside jurisdiction, duplicate suggestion, session expiry, submission timeout/idempotency, and successful receipt states in English and Filipino.

## Acceptance gates for that slice

- No default map center, translated label, AI output, client role, or optimistic mutation can masquerade as authoritative state.
- The draft survives reload, Back/Forward, session renewal, intermittent connectivity, and a failed provider without duplicate submission.
- Camera and location denial have complete manual alternatives.
- The receipt includes a durable ticket, submitted time, accepted evidence/location summary, next step, expected notification behavior, and a route to the report record.
- Every viewport reflows at 320 px and 200% zoom without clipping essential content or exposing two navigation models.
- Keyboard and screen-reader users can complete the same reporting and tracking tasks with visible focus, managed dialog focus, announcements, and non-color status cues.
- English and Filipino provide functional—not merely partial copy—parity.
- All public claims, privacy language, lifecycle labels, permissions, and service expectations have named decision owners.

## Evidence limitations and next Figma action

This was a runtime and source-informed audit, not a full WCAG conformance test, penetration test, performance profile, production-data review, or resident usability study. Browser accessibility snapshots exposed missing names and structure, but contrast ratios, assistive-technology behavior, forced colors, reduced motion, and network/provider degradation still require dedicated validation. The seeded resident had no owned reports, so report detail, timeline, retraction, duplicate linking, request-for-information, resolution proof, feedback, and notification deep links remain unvalidated at runtime.

No Figma mutation was made in this documentation phase. When the design phase begins, first inspect the live shared file and reconcile its current components/variables. Then place these observed screenshots and notes beside the appropriate reviewer-final public/resident template, map the mobile-first golden slice and its failure states, and promote only approved repeated patterns into the Core Library.
