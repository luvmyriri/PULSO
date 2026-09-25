# Resident and public web playbook

## Status

The Civic Aperture visual direction and resident product constraints are approved. The target resident routes, detailed workflows, lifecycle vocabulary, verification/manual-review policy, and API contracts are **proposed pending resident and product validation**.

Primary sources:

- [`04-resident-experience-spec.md`](../../../../docs/ui-ux-audit/04-resident-experience-spec.md)
- [`12-resident-user-stories-and-sdlc.md`](../../../../docs/ui-ux-audit/12-resident-user-stories-and-sdlc.md)
- [`14-end-to-end-system-lifecycle-and-api-contract.md`](../../../../docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md)
- [`10-figma-production-handoff.md`](../../../../docs/ui-ux-audit/10-figma-production-handoff.md)

## Experience goal

A resident should understand PULSO, establish an account when needed, report an infrastructure issue, receive a durable ticket, and understand what the city is doing without hidden requirements or internal-government language.

Prioritize the public website first. Marketing serves the civic job, not the reverse.

## Inspiration translation

Use Netflix only as a principle reference for immediate visual orientation and “continue where I left off”:

- one evidence-led Field Aperture;
- one obvious active-report continuation;
- grouped, scannable sections such as Active report, City updates, Nearby issues, and Services.

Use Facebook only as a principle reference for familiar persistent navigation, an obvious creation action, chronological/deep-linked updates, notifications, and clear identity/account context.

Do not copy either product’s trade dress. Prohibit autoplay heroes, entertainment darkness, endless horizontal rails, infinite feeds, engagement ranking, likes, shares, follower counts, public resident profiles, vanity metrics, recommendation opacity, and engagement bait.

Civic Aperture remains the visual identity. Cinematic impact comes from truthful evidence, controlled framing, light, scale, pacing, and visible progress.

## Public website priority

The first viewport must answer:

1. What does PULSO do?
2. Who is it for?
3. What can I do now?

Expose these actions clearly:

- `Report an issue`
- `Track a report`
- `Resident sign in`

Keep `Staff sign in` separate and visually quiet. Do not let city directories, slogans, or promotional content outrank the reporting task.

Recommended public structure, pending approval:

```text
Home
├─ Report an issue
├─ Track a report
├─ City updates
├─ Services and emergency contacts
├─ How PULSO works
├─ Accessibility, language, and privacy
├─ Resident sign in / register
└─ Staff sign in
```

Use one real civic image or map aperture, a direct thesis, a concise process explanation, and visible trust/privacy/recovery information. Do not use stock resident portraits, giant logos, glass, 3D, or generic civic statistics without verified data.

## Portal information architecture

Proposed destinations:

```text
Home
├─ Latest report and status
├─ Report an issue
├─ City updates
├─ Nearby privacy-safe issues
└─ Services and contacts
My reports
├─ Active
├─ Needs information
├─ Resolved
└─ Report detail
Report
├─ Evidence
├─ Location
├─ Details
├─ Review
└─ Receipt
Updates
├─ Advisories
└─ Notifications
Account
├─ Profile and verification
├─ Language and accessibility
├─ Privacy and security
└─ Help
```

Every major destination and report detail needs a real URL. Tabs may style navigation but must not replace browser history.

## Navigation and layout

### Mobile

- compact masthead with identity, language, account, and urgent advisory only when real;
- latest active report and lifecycle first;
- one prominent thumb-visible report action;
- then city updates, privacy-safe nearby issues, and services/emergency contacts;
- five stable destinations: Home, My reports, Report, Updates, Account;
- exactly one navigation model per breakpoint.

### Larger screens

- persistent masthead;
- max-width layout with primary task/status and contextual update/service columns;
- no duplicated top and bottom navigation;
- open lists and rules for updates rather than repeated feature cards.

Use a 40–44 px brand lockup. Public controls are generally at least 44×44 px.

## Home and tracking

Home prioritizes the current civic task:

1. current context and any urgent real advisory;
2. active report with ticket, status, last update, next event, and action;
3. report action;
4. city updates and notifications;
5. privacy-safe nearby issues;
6. services and emergency contacts.

Give panel containment to persistent objects such as the active report. Use open, ruled lists for updates and nearby issues so the page does not become a grid of identical rounded cards.

Report detail should contain:

- ticket and plain issue title;
- public status and Signal Cut;
- latest update and responsible unit when allowed;
- required resident action;
- evidence and location summary;
- chronological public-safe history;
- notification preferences/help;
- state-permitted retraction;
- approved resolution proof and resident response.

Nearby issues are privacy-safe civic context, not social content.

## Registration and verification

Proposed sequence:

1. Explain purpose, accepted IDs, use/retention, privacy, and alternatives.
2. Capture or upload ID with quality help and fallback.
3. Let the resident review and correct extracted data.
4. Explain face/liveness before requesting camera; provide manual review.
5. Collect contact and security preferences.
6. Verify the channel with bounded OTP behavior.
7. Confirm verification level or pending manual review.

Never imply identity or eligibility is verified before authoritative confirmation. AI/OCR uncertainty must lead to correction, human review, or assisted service—not silent rejection.

## Report-an-issue flow

Use one decision per step and preserve the draft across reload, sign-in, timeout, and recoverable failure.

### 1. Evidence

- safety guidance before capture;
- camera permission explanation and upload/take-later fallback;
- true-color preview, remove/replace, progress, cancel, retry, and source state;
- no requirement to approach a hazard for a better image.

### 2. Location

- explain why location is requested;
- distinguish unknown, checking, inside jurisdiction, outside jurisdiction, denied, and provider error;
- offer address search, manual pin, landmark/exact-location text, and list alternative;
- never present a default map center as confirmed location.

### 3. Issue details

- plain category and description;
- advisory classification may suggest but remains editable;
- provider/AI failure still permits staff review.

### 4. Review

- show evidence, exact location, issue, contact/privacy choice, and duplicate candidate;
- provide an explicit `Edit` path for every section;
- name the submission outcome and what becomes public or staff-visible.

### 5. Receipt

- durable ticket ID;
- authoritative `Received` state and server time;
- next-step expectation and notification behavior;
- reconcile uncertain network outcomes before inviting another submission.

Every wizard step should be URL/history-aware and return the resident to the intended task after authentication.

## Required states and recovery

Design at least:

- loading, first-use empty, filtered empty, and success;
- offline, timeout, failed upload, unsynced draft, and stale/cached data;
- camera/location denied and provider failure;
- AI/OCR inconclusive and manual review;
- session expired without draft loss;
- jurisdiction outside scope and referral;
- possible duplicate with support-evidence path;
- information needed, blocked/delayed, resolved, follow-up, and governed retraction;
- uncertain submission with idempotent reconciliation.

Every state explains what happened, what remains saved, what the resident can do next, and whether information is stale. Do not claim “real time” unless the system proves it.

## Content, language, privacy, and resilience

- Use plain, calm public-service language and name outcomes: `Submit report`, `Save draft`, `Send information`.
- English and Filipino have full functional parity across visible copy, errors, dates, statuses, accessible names, announcements, help, and long-string expansion.
- Language selection updates document language and persists through logout/recovery.
- Explain collection, use, retention, visibility, and alternatives before requesting identity, camera, location, or contact data.
- Preserve drafts locally only where policy allows; communicate storage and sync clearly.
- Do not assume continuous connectivity, precise GPS, permission access, high-end hardware, or reliable AI/provider service.
- Manual entry, upload, retry, assisted service, and human review are first-class paths.

## Accessibility and responsive acceptance

- WCAG 2.2 AA in light and dark.
- Keyboard-complete critical paths, visible 3 px focus, programmatic labels/errors, correct dialog focus, and route/state announcements.
- Status never relies on color alone.
- Evidence has text alternatives; maps have address/list alternatives.
- Support forced colors/high contrast and reduced motion.
- Reflow at 320 CSS px and work at 200% zoom without essential horizontal scrolling.
- Keep evidence, ticket, status, next action, and recovery visible and nonoverlapping.
- Validate with outdoor mobile conditions, screen readers, Filipino expansion, slow/offline networks, denied permissions, and manual-review cases.

## Guard against observed defects

Treat these as current risks, not completed fixes:

- competing top and bottom navigation and fixed minimum widths;
- route-inaccessible report detail and unreliable notification deep links;
- falsely verified jurisdiction and default-map confirmation;
- exact-location text omitted from submission;
- incomplete localization and dark-map parity;
- static Figma imports mistaken for proven responsive components.
