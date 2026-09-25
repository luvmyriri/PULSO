# Frontend rework implementation, quality, and rollout plan

| Field | Value |
|---|---|
| Status | Planning framework; no implementation authorized or performed |
| Version | 0.2 |
| Last validated | 23 August 2026 |
| Delivery model | Shared core + resident and government vertical streams |

## 1. Delivery objective

Deliver a trustworthy, accessible, responsive PULSO experience without a big-bang rewrite, route breakage, authorization regression, or resident/government branch divergence.

The program uses:

- one governed design and frontend foundation;
- two audience-specific implementation streams;
- vertical slices that carry one task through UI, state, API, permission, analytics, test, and rollout;
- progressive release behind flags with a rehearsed rollback.

This document describes future implementation. The current audit changed documentation and design artifacts only.

## 2. Branch framework

Created local branches:

```text
main @ 7d748637
├─ codex/ui-reworks
├─ codex/ui-reworks-government
└─ codex/ui-reworks-residents
```

### Ownership

| Branch | Owns | Must not independently fork |
|---|---|---|
| `codex/ui-reworks` | semantic tokens, primitives, shared feedback/state patterns, common shells/contracts, canonical lifecycle/status vocabulary, accessibility utilities, test harness, Storybook/docs | resident/gov-specific page composition |
| `codex/ui-reworks-residents` | public/resident routes, onboarding, reporting, tracking, updates, account, mobile composition | copies of shared primitives/tokens/status logic |
| `codex/ui-reworks-government` | role-aware staff shell, My Work, queues, detail, work orders, projects, records, analytics, admin | copies of shared primitives/tokens/RBAC vocabulary |

### Integration policy

1. Shared component/token changes are reviewed and merged in `codex/ui-reworks` first.
2. Portal branches consume the same approved shared-core version at each milestone.
3. Each portal PR records the shared-core commit/version it expects.
4. Cross-portal component changes include an impact note and visual/accessibility regression evidence for both portals.
5. Portal-specific composition remains in its stream; do not add condition-heavy resident/government branches inside every primitive.
6. Resolve integration drift weekly, not at the end of the project.
7. Preserve existing public route paths and API payloads during the first visual slice unless a separately approved migration requires change.

## 3. Dependencies and critical path

```text
Functional truth + integrated environment
             │
             ├─ canonical lifecycle/status model
             ├─ canonical role/capability matrix
             ├─ top-task research + content vocabulary
             └─ baseline a11y/performance/analytics
                          │
                    PULSO Core
             tokens + primitives + states + shells
                    /                     \
          Resident critical path     Government critical path
                    \                     /
              integrated validation + pilot
                          │
                 progressive rollout
```

No high-fidelity page is implementation-ready if lifecycle, permissions, state behavior, or API fixtures remain ambiguous.

## 4. Phased plan

Planning ranges assume a staffed design/product/frontend/QA team and parallel portal work after PULSO Core. They are not delivery commitments.

| Phase | Planning range | Work | Exit gate |
|---|---:|---|---|
| 0. Functional truth and baseline | 1–2 weeks | live/dead control register, routes, roles, statuses, API/state map, integrated environment, screenshots, a11y/performance/lint/test baseline | Product, engineering, security, and operations sign the inventory |
| 1. Research and service blueprint | 2 weeks, overlaps 0 | resident/staff cohorts, top tasks, current/future journeys, terminology, recovery paths | Top tasks, canonical lifecycle, and success measures approved |
| 2. PULSO Core | 2–3 weeks | Figma variables/components, semantic tokens, primitives, feedback/state patterns, responsive shells, Storybook/test harness | Design-system review and WCAG design audit pass |
| 3A. Resident critical path | 4–6 weeks | public entry, auth/recovery, verification, report flow, receipt/tracking, EN/FIL, mobile shell | Formative usability and acceptance targets pass |
| 3B. Government critical path | 4–6 weeks in parallel | staff shell, My Work, citizen queue/detail, triage, assignment/work order, RBAC | Role matrix tests and staff task targets pass |
| 4. Delivery enablement | 2 weeks, overlaps 3 | analytics schema, performance budget, fixtures, visual regression, migration/flag plan, runbooks | Complete handoff packet for pilot routes |
| 5. Integrated validation/pilot | 2–3 weeks | cross-browser/device/a11y/security/E2E, field pilot, operations support | No blocking defects; rollback rehearsed |
| 6. Progressive rollout | 2+ weeks | resident cohort and staff-role canaries, monitoring, feedback, expansion | Guardrails stable before each expansion |
| 7. Remaining modules | iterative | projects, procurement, records, analytics, admin, secondary resident surfaces | Same slice gates applied route by route |

A realistic first-pilot planning window is roughly 10–14 weeks if resident and government streams run in parallel after an approved shared foundation.

## 5. Phase 0: functional truth and baseline

### Deliverables

- route inventory with audience, guard, layout, API dependencies, owner, and live status;
- visible-control register: functional / intentionally unavailable / remove;
- canonical role/action/data-scope matrix;
- canonical report/project status mapping;
- API contract/fixture catalog for top journeys;
- state inventory: loading, empty, permission, offline, stale, partial, error, success;
- live integrated environment with representative accounts;
- responsive screenshots at 320, 390, 768, 1024, 1280, 1440;
- keyboard/screen-reader/contrast/zoom baseline;
- production-like performance and bundle baseline;
- dependency/lint/test debt register;
- documentation discrepancy log.

### Immediate P0 correctness backlog

1. Resident report detail/deep link wiring.
2. Persist exact location description.
3. Truthful jurisdiction states and default-coordinate prevention.
4. Manual review when AI/OCR is inconclusive.
5. Notification dismissal session bug.
6. Canonical role/capability enforcement across route, nav, page, and action.
7. Server-provided eligible assignees; remove hard-coded IDs.
8. Govern archive/retention; remove routine permanent deletion.
9. Government responsive shell.
10. Form/dialog/focus and accessible-name fundamentals.

Correctness fixes may be delivered before the visual system, but they should still follow the approved state/content contracts.

## 6. Phase 2: PULSO Core work packages

### Core-01 Foundations

- semantic color/typography/spacing/radius/elevation/motion/layout tokens;
- light/dark equivalence;
- resident/government action aliases;
- breakpoint/density policy;
- intended fonts loaded with resilient fallbacks.

### Core-02 Interactive primitives

- button/icon button/link;
- field wrapper and native-first controls;
- accessible select/combobox/date/OTP only where required;
- checkbox/radio/segmented control;
- upload/dropzone/capture review.

### Core-03 Navigation and overlays

- page header, breadcrumb, tabs, pagination;
- responsive resident and government shells;
- dialog, confirmation, drawer, popover, tooltip;
- skip link, focus management, route announcements.

### Core-04 Data and feedback

- status/priority badges;
- Signal Cut lifecycle and approval chain;
- record table/card and filters/saved views;
- loading skeleton, first/filtered empty, denied, offline, stale, error, success;
- inline alert, banner, toast;
- chart frame and map/list contract.

### Core-05 Tooling and documentation

- Storybook or equivalent component catalog;
- component interaction, accessibility, and visual-regression tests;
- design-token source and platform mappings;
- Figma component/version traceability;
- content/localization test fixtures;
- contribution, deprecation, and release process.

## 7. Resident implementation order

1. Resident shell + URL-addressable navigation.
2. Sign in, recovery, and session preservation.
3. Verification explainer and consent.
4. Identity capture/review/manual-review path.
5. Report evidence → location → details → review.
6. Durable receipt and report detail/Signal Cut lifecycle.
7. Notifications/advisories deep links.
8. Profile, language, security, privacy.
9. Secondary services/nearby content.

Each slice includes English/Filipino copy before merge. Do not postpone localization to a final sweep.

## 8. Government implementation order

1. Canonical session/RBAC policy and responsive staff shell.
2. My Work with scoped direct links.
3. Citizen report queue + filters + case detail.
4. Verify/request-info/duplicate/outside-scope decisions.
5. Eligible assignment + work-order creation.
6. Work-order execution/proof/review/closure.
7. Project lifecycle and approvals.
8. Records/documents/audit.
9. Procurement and OBO patterns.
10. Analytics/predictive drill-through.
11. People/roles/settings/emergency access.

## 9. Recommended frontend target architecture

This is a direction for later technical design, not an instruction to refactor everything at once.

```text
app/
  routing, providers, error boundaries, feature flags
design-system/
  tokens, primitives, composites, patterns
shared/
  session, api client, permissions, lifecycle, analytics, localization
features/
  auth/
  verification/
  resident-reports/
  notifications/
  gov-intake/
  work-orders/
  projects/
  records/
  analytics/
layouts/
  ResidentShell
  GovernmentShell
pages/
  thin route composition only
```

Technical principles:

- router-level layouts with nested routes and outlets;
- route-level lazy loading, especially Maps, Spline/Three, analytics, and admin;
- one session provider and one API client with standardized auth expiry, cancellation, error parsing, retry policy, and correlation IDs;
- one server-state cache/invalidation strategy rather than independent polling in every page;
- one lifecycle/status module and one capability policy;
- action-level checks in addition to route visibility;
- page components compose features; they do not own entire product domains;
- characterize existing behavior before extraction.

## 10. Definition of Ready

An implementation ticket is ready only when it has:

- approved Figma frame and component versions;
- user/job statement and measurable outcome;
- route and responsive behavior;
- light/dark and English/Filipino behavior;
- role/capability/data-scope rule;
- loading, empty, denied, offline, stale, validation, error, and success states;
- API fixture/contract and canonical status mapping;
- accessibility annotations and keyboard/focus behavior;
- analytics event definitions and privacy classification;
- acceptance criteria, dependencies, owner;
- feature-flag, rollout, and rollback instructions.

## 11. Definition of Done

### Product/functional

- approved job completes end to end;
- no visible dead/deceptive controls;
- backend state and UI status agree;
- retries do not duplicate destructive/create actions;
- URL/back/reload preserve valid context;
- permissions pass role/action/data-scope tests.

### Accessibility

- WCAG 2.2 AA automated and manual target;
- keyboard-only and focus-order pass;
- NVDA/Chrome and VoiceOver/Safari pass for critical journeys;
- no keyboard trap, invisible focus, or unnamed action;
- 320 px reflow and 200% zoom pass;
- reduced motion and dark-mode information equivalence pass;
- EN/FIL content and accessible-label parity pass.

### Quality

- component tests, API contract tests, E2E top journey, and visual regression pass;
- no new lint errors; ratcheted legacy-lint budget met;
- supported browsers/devices pass;
- monitoring/events verified without sensitive payloads;
- documentation, changelog, and design traceability updated;
- release and rollback exercised in a production-like environment.

## 12. Test strategy

### Test pyramid

| Layer | Coverage |
|---|---|
| Static | ESLint, type strategy if adopted, dependency and token checks, localization completeness |
| Component | behavior, keyboard, accessible name/state, variants, error/empty/loading, visual snapshots |
| Integration | session/API/error mapping, canonical statuses, permissions, draft persistence, retries |
| Contract | frontend fixture against backend schema/status/action capability |
| E2E | resident report/track; staff triage/assign/close; key recovery paths |
| Manual | screen reader, zoom/reflow, reduced motion, forced colors, maps/charts, field devices |
| Pilot | realistic resident/staff task performance and operational observation |

### Browser/device matrix

- current Chrome, Edge, Firefox, Safari;
- representative Android Chrome and iOS Safari;
- 320/390 px phones, tablet, 1280×720 staff laptop, 1440+ desktop;
- slow/unstable network, offline transition;
- camera/location allowed, denied, unavailable;
- expired authentication and API partial failure.

### Lint/test debt strategy

The baseline has 170 lint problems and no frontend tests. Avoid a single unrelated cleanup PR that blocks product work. Instead:

1. freeze the baseline report;
2. prohibit new violations in changed files;
3. fix violations in each migrated vertical slice;
4. add characterization tests before extraction;
5. ratchet the allowed count downward each milestone;
6. reach a zero-error gate before general availability.

## 13. Performance budget

Field targets at the 75th percentile, segmented mobile/desktop:

- LCP ≤2.5 s;
- INP ≤200 ms;
- CLS ≤0.1.

These match the current [Core Web Vitals guidance](https://web.dev/articles/vitals). Establish route bundle and image/3D/map budgets after Phase 0 measurement rather than inventing numbers without a production build.

Implementation requirements:

- lazy-load route/domain code;
- do not load hidden light and dark Spline scenes together;
- static/SVG civic-map treatment is the auth default;
- map/3D/analytics load only when the job needs them;
- self-host/optimize essential brand assets where appropriate;
- reserve space for media/maps to avoid layout shift;
- measure in the field, not only Lighthouse lab runs.

## 14. Analytics and observability contract

Event envelope:

```text
event_name
surface
flow
step
role_class
locale
device_class
result
error_code
duration_ms
design_version
experiment_id
```

Never log names, ID numbers/images, narrative, exact address/GPS, email, mobile, authentication data, or evidence. Use stable privacy-safe categories and server correlation IDs.

Operational observability also covers:

- API error/latency by route;
- stale-data age;
- failed/retried idempotent actions;
- permission denial;
- duplicate creation prevention;
- frontend error boundary/correlation;
- Core Web Vitals by route/device;
- design/component version.

## 15. Rollout

### Feature-flag dimensions

- route/surface;
- resident cohort;
- staff role/capability class;
- jurisdiction/team;
- design version.

### Suggested order

1. internal design/QA accounts;
2. staff pilot team with old UI available;
3. small resident test cohort;
4. one end-to-end operational slice;
5. expand resident percentage and staff roles independently;
6. retire old route only after metrics/support/rollback window passes.

### Rollback

- retain old UI and route/payload compatibility during canary;
- avoid destructive data migration in the first visual rollout;
- document flag owner and one-step disable path;
- rehearse rollback before pilot;
- reconcile records created in either UI;
- preserve audit events and user drafts.

## 16. Risk register

| Risk | Evidence | Mitigation | Owner |
|---|---|---|---|
| Branch divergence | portals share themes, auth, status, maps, feedback | one PULSO Core, pinned versions, weekly integration review | Frontend lead |
| RBAC regression | definitions repeated across route/nav/utils/pages | executable canonical matrix and E2E per role/action | Security + backend + frontend |
| Monolith regression | 2.5k–4k-line pages | characterization tests; vertical extraction behind flags | Frontend lead |
| Performance regression | eager routes + Maps/Spline/Three/Motion | baseline, lazy loading, route budgets, field CWV | Performance owner |
| Accessibility debt | weak semantics/focus/motion | blocking WCAG design/test gates | Accessibility/QA |
| Localization drift | partial i18n, hidden staff switcher | parity matrix, pseudolocalization, locale fixtures | Content/localization |
| Web/mobile token drift | separate theme definitions | semantic source + platform mappings | Design-system owner |
| Functional ambiguity | dead/prototype controls | signed functional-truth register | Product owner |
| Documentation drift | existing report contradicts newer export code | owner/status/version/last-validated metadata | Tech writer/product |
| External service failure | Maps, Spline, AI/OCR, QR/download | timeout/fallback/manual path; essential task not blocked | Feature owner |
| Big-bang rollout | both audiences depend on shared lifecycle | role/cohort canary, flags, old UI rollback | Release owner |
| Sensitive analytics | reports contain ID/location/evidence | privacy-minimized taxonomy and review | Privacy/security |

## 17. Team and ceremonies

Minimum roles:

- product/experience owner;
- LGU operations owner;
- resident-services owner;
- design-system/design lead;
- frontend leads for shared, resident, and government streams;
- backend/security/RBAC owner;
- accessibility/QA lead;
- content/localization owner;
- analytics/observability owner;
- release/support owner.

Cadence:

- weekly design-system council;
- twice-weekly resident/government dependency sync during implementation;
- weekly risk/decision-log review;
- per-slice accessibility/content review before development complete;
- pilot operations stand-up and post-pilot review.

## 18. Milestone approval packet

Each milestone includes:

- approved designs and component versions;
- changed routes/roles/statuses/API contracts;
- automated/manual test evidence;
- EN/FIL review;
- performance comparison;
- analytics verification;
- known issues and risk acceptance;
- deployment/flag plan;
- rollback rehearsal result;
- support/operations briefing;
- owner sign-off.
