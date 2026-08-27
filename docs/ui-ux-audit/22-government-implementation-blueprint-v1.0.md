# PULSO government website implementation blueprint v1.0

| Field | Value |
|---|---|
| Status | Proposed implementation blueprint; stakeholder-endorsed design direction, pending operational and technical approvals named below |
| Version | 1.0 |
| Last validated | 25 August 2026 |
| Audience | Product, City Engineering process owners, design, frontend, backend, data, security, records, procurement/finance, QA, accessibility, platform, release, support, and future delivery partners |
| Scope | Government website from secure entry through operations, planning, compliance, records, insights, communications, administration, and emergency access |
| Portability | Framework-, repository-, deployment-, and device-adapter independent |
| Visual contract | Civic Aperture and the robust-minimal government design in [21-government-website-complete-design-v1.0.md](./21-government-website-complete-design-v1.0.md) |
| Implementation | Not started by this artifact; no product code or Figma object is changed |

## 1. Purpose

This document is the durable starting blueprint for implementing the PULSO government website regardless of where the work is written: the current React frontend, a future web framework, a monorepo, separate services, server-rendered pages, a field client, or another approved platform.

It prevents a new team from having to rediscover the product by separating two layers:

1. **Invariant contracts** — user jobs, lifecycle, capability, evidence, records, interaction, accessibility, audit, recovery, and design meaning that every implementation must preserve.
2. **Replaceable adapters** — router, framework, state library, component syntax, API client, map provider, chart library, storage mechanism, test runner, and deployment platform.

The implementation may change technology. It must not silently change civic meaning.

The operating design law is:

> Minimalism removes friction, not information.

The government portal succeeds when every authorized employee can see the work they may perform, understand why it needs attention, complete a valid action without losing context, and leave a traceable persisted outcome with a clear next owner.

## 2. How to use this blueprint

Every team starting government-side work must:

1. read the source-of-truth order below;
2. select one vertical slice rather than one visual layer;
3. complete the slice brief using the template in section 12;
4. resolve its blocking decisions before implementation;
5. link the approved Figma frame and component versions when the live design is available;
6. implement through the portable architecture boundaries in section 8;
7. verify the complete quality matrix, not only the happy path;
8. release behind an owned feature flag with observable guardrails and a rehearsed rollback; and
9. update traceability, decisions, contracts, tests, and documentation in the same change.

Do not treat this document as permission to implement unresolved policy. A route or screen may be visually complete while its lifecycle, capability, retention, financial, or security contract remains proposed.

## 3. Source of truth and conflict rules

| Priority | Source | Authority |
|---:|---|---|
| 1 | [PRODUCT.md](../../PRODUCT.md) | Approved product purpose, commitments, constraints, principles, audiences, and accessibility position |
| 2 | [09-visual-art-direction-v2.md](./09-visual-art-direction-v2.md) | Approved Civic Aperture art direction and light/dark doctrine |
| 3 | [21-government-website-complete-design-v1.0.md](./21-government-website-complete-design-v1.0.md) | Stakeholder-endorsed proposed government page, interaction, state, responsive, and process design |
| 4 | [14-end-to-end-system-lifecycle-and-api-contract.md](./14-end-to-end-system-lifecycle-and-api-contract.md) | Proposed canonical lifecycle, system boundary, API, transaction, degraded-mode, and integration contract |
| 5 | [13-government-user-stories-and-sdlc.md](./13-government-user-stories-and-sdlc.md) | Government actor, story, QA, SDLC, release-blocker, and accountability contract |
| 6 | [03-figma-design-system-spec.md](./03-figma-design-system-spec.md), [10-figma-production-handoff.md](./10-figma-production-handoff.md), and [11-figma-component-inventory.md](./11-figma-component-inventory.md) | Figma working structure, tokens, components, templates, and known limitations |
| 7 | [06-implementation-plan.md](./06-implementation-plan.md) | Cross-portal branch, shared-core, rollout, performance, and program framework |
| 8 | Current source, runtime, screenshots, schemas, and endpoints | Observed implementation evidence, including defects and legacy behavior |

When sources conflict:

- approved product truth wins over proposals and observed defects;
- the backend wins for current authorization and persisted state, but a current unsafe backend behavior is a defect—not target truth;
- the named process owner decides operational lifecycle and evidence gates;
- security, privacy, records, finance, or legal owners decide rules in their authority;
- a decision record captures the conflict, options, owner, resolution, date, affected artifacts, and migration consequence; and
- no team silently selects a lifecycle, permission, token alias, endpoint, navigation default, or production claim.

### Status legend

Use these labels in tickets, frames, contracts, decisions, fixtures, and release packets:

| Label | Meaning |
|---|---|
| `APPROVED` | Authorized product or policy commitment |
| `PROPOSED` | Designed or specified but awaiting named approval |
| `OBSERVED` | Current source/runtime behavior; may be correct, incomplete, or defective |
| `SAMPLE` | Non-production people, records, evidence, maps, metrics, costs, or outcomes |
| `DEPRECATED` | Retained only for migration or traceability |
| `BLOCKED` | Cannot safely enter implementation because a required authority or contract is unresolved |

## 4. Non-negotiable product invariants

Every implementation must preserve the following regardless of framework.

### 4.1 One civic record

- Report, work order, project, procurement, inspection, evidence, document, advisory, notification, and audit relations remain traceable.
- Resident-safe status and internal operational status derive from authoritative lifecycle state; they do not drift independently.
- Durable IDs, source relation, actor, time, state/version, and correlation ID remain available where the task requires them.

### 4.2 Backend-authoritative access

- Route, navigation, page, field, data/query scope, export, and action must agree.
- The backend evaluates subject, capability, jurisdiction, assignment, entity state, field classification, threshold, evidence gate, delegation, and emergency scope.
- Frontend hiding is usability, never security.
- Denied government deep links stay in the government identity and provide a safe, specific recovery path.

### 4.3 Governed lifecycle

- The client never exposes a generic arbitrary status selector.
- The server supplies current state/version, valid next transitions, eligibility, prerequisites, consequences, and next-owner rules.
- Consequential mutations capture reason, source and target state, expected version, evidence/approval requirements, notification effect, and persisted event.
- Completion, resolution, approval, NTP, clearance, archive, permission, retention, monetary, and emergency actions fail closed when prerequisites are missing.

### 4.4 Evidence and records integrity

- Evidence remains true-color and carries source, capture/upload state, time, location when available, review state, and modification policy.
- Maps always have an address/list/jurisdiction alternative.
- Official documents use classification, version, owner, linked record, access, retention, disposition, legal hold, and immutable event rules.
- Routine business deletion is archive, tombstone, or approved disposition—not loss of audit history.

### 4.5 Truthful system state

- Fetch failure never renders as a legitimate empty state.
- Stale, partial, offline, permission-limited, transition-ineligible, conflict, provider failure, system failure, and success are distinct.
- The interface never invents live status, eligibility, identity, verification, location, classification, assignment, resolution, compliance, predictions, coordinates, or metrics.
- AI and predictive outputs show source, model/provider/version, data window, confidence or limits, freshness, and accountable human review.

### 4.6 Accessible parity

- Target WCAG 2.2 AA in light and dark.
- Keyboard, screen reader, visible 3px focus, non-color meaning, reduced motion, forced colors, 200% zoom, 320px reflow, and narrow field use are release requirements.
- Evidence has text alternatives; maps have list/address alternatives; charts have summaries and data-table access.
- Light and dark preserve identical meaning, capability, hierarchy, target geometry, privacy, and recovery.

### 4.7 PULSO identity

- Government action uses Field Blue; semantic status colors keep their meanings.
- Civic Aperture appears through evidence, location, lifecycle, and accountability—not decoration.
- Morning Field Sheet and Night Inspection remain restrained, legible working environments.
- No glass, neon, gradient spectacle, decorative 3D, theatrical command center, floating-card field, or ornamental animation.

## 5. Experience architecture

The target experience remains an **Operate** workspace.

```text
Government access
    ↓
Capability-aware shell
    ↓
My Work / scoped saved view
    ↓
Queue or domain list
    ↓
Engineering docket / authoritative record
    ↓
Eligible governed decision
    ↓
Persisted event + related record + notification/outbox
    ↓
Next owner / updated queue / immutable activity
```

The visual focal point is earned by one decision-relevant region: evidence, location, lifecycle, engineering document, cost table, or approval. Routine data remains quiet and compact.

### 5.1 Target information architecture

```text
Access
├─ Government landing
├─ Sign in, MFA, and recovery
└─ Denied, suspended, or ended session

My work
├─ Needs attention
├─ Assigned to me
├─ Waiting for my review
└─ Recently completed

Operations
├─ Citizen reports
├─ Dispatch and assignment
├─ Work orders
├─ Projects
└─ Advisories

Planning and delivery
├─ Design requests
├─ Structural analysis
├─ Field surveys
├─ OBO inspections
├─ Procurement
├─ Bill of Quantities
└─ Estimation

Records
├─ Documents and registry
├─ Reports archive
├─ Process timeline
└─ Audit trail

Insights
├─ Operational overview
├─ Analytics
└─ Predictive maintenance

Administration
├─ Notifications
├─ People and roles
├─ Resident accounts
├─ System settings
├─ Agent access
└─ Emergency access
```

Navigation renders only permitted destinations. Jurisdiction, department/team, time, status, and saved view are scope—not duplicate primary navigation.

### 5.2 Context-preservation contract

Where safe, preserve through route changes, detail opening, mutation, refresh, back, and deep link:

- current route and capability context;
- jurisdiction/team/date/status scope;
- filters, sort, saved view, result count, and freshness;
- selected record and return destination;
- record lifecycle, version, and related-object chain;
- safe draft input and upload progress; and
- eligible next actions from the latest authoritative response.

After a mutation, keep the selected record if it remains in the current view. If it moves, explain the new state/view and offer a direct destination.

## 6. Portable contract model

Implementation technology plugs into six contracts. A team may replace an adapter only if these contracts still pass.

| Contract | Owns | Must not own |
|---|---|---|
| Domain contract | entities, durable IDs, lifecycle, relations, evidence gates, next owner, audit/outbox effects | component state or transport-library details |
| Capability contract | routes, fields, query scope, commands, eligibility, delegation, emergency scope | visual hiding as authorization |
| API contract | schema, version, filters, pagination, errors, idempotency, concurrency, uploads, async jobs | presentation copy or arbitrary client-only status |
| Experience contract | user job, hierarchy, context, copy intent, responsive composition, feedback, recovery | server authority or database transaction rules |
| Design-system contract | semantic tokens, component anatomy, variants, behavior, accessibility, light/dark parity | page-specific business decisions |
| Platform adapter | router, framework, cache, persistence, map/chart/provider, analytics SDK, test and build tooling | changing invariant meaning for convenience |

### Portability rule

If the team moves from one technology to another, it rewrites only the platform adapter and rendering composition. Contract identifiers, state vocabulary, capability decisions, API operation IDs, audit effects, acceptance criteria, and traceability remain stable or migrate through an approved decision.

## 7. Blueprint identifiers and traceability

Use durable identifiers so documentation, design, API, tests, telemetry, and implementations can reference the same concept without depending on filenames.

| Prefix | Artifact | Example |
|---|---|---|
| `GOV-PAGE` | Page or major view | `GOV-PAGE-009 Report docket` |
| `GOV-FLOW` | End-to-end process | `GOV-FLOW-002 Triage and assignment` |
| `GOV-CMP` | Shared or domain component | `GOV-CMP-QUEUE-ROW` |
| `GOV-STATE` | Complete UI/system state | `GOV-STATE-CONFLICT` |
| `GOV-CAP` | Capability decision | `GOV-CAP-REPORT-ASSIGN` |
| `GOV-API` | Canonical API operation | `GOV-API-WO-CREATE` |
| `GOV-EVENT` | Audit/timeline/outbox event | `GOV-EVENT-WO-ASSIGNED` |
| `GOV-TEST` | Acceptance or regression scenario | `GOV-TEST-ASSIGN-NO-ELIGIBLE-TEAM` |
| `GOV-ADR` | Architecture/product decision | `GOV-ADR-004 Pagination model` |

One traceability row must connect:

```text
job/story → page/flow → capability → lifecycle transition
→ API operation → persisted event/outbox effect
→ Figma frame/component version → automated/manual tests
→ telemetry/alert → feature flag/migration/rollback → owner/decision
```

## 8. Portable implementation architecture

This is a responsibility map, not a mandatory folder tree.

```text
Application composition
├─ routing and route guards
├─ providers/session/theme/locale
├─ global error and recovery boundaries
└─ feature flags and release context

PULSO Core
├─ semantic tokens and platform mappings
├─ accessible primitives
├─ navigation and overlay primitives
├─ data display, feedback, and state patterns
└─ testable Civic Aperture signatures

Government shell
├─ capability-aware navigation
├─ current scope, breadcrumbs, and route title
├─ global/scoped search and command access
├─ notifications and account/delegation context
└─ freshness, sync, banners, and responsive topology

Domain modules
├─ access and identity
├─ reports and dispatch
├─ work orders and field updates
├─ projects and technical planning
├─ OBO, procurement, BoQ, and estimation
├─ records, documents, timeline, and audit
├─ insights, analytics, and predictive review
├─ advisories and notifications
└─ people, resident administration, settings, agents, emergency access

Shared services
├─ typed API/contract adapter
├─ session and capability policy client
├─ lifecycle and status projection
├─ server-state cache and invalidation
├─ URL/saved-view serialization
├─ upload/offline/idempotency manager
├─ content and localization
├─ analytics and safe observability
└─ test fixtures and contract verification
```

### 8.1 Dependency direction

- Pages compose shell and domain modules.
- Domain modules consume PULSO Core and shared services.
- PULSO Core does not import a government domain.
- Platform adapters implement stable interfaces; domain behavior does not reach directly into a router, storage SDK, map SDK, or analytics vendor.
- The lifecycle projection consumes canonical contracts; pages do not maintain their own status dictionaries.
- Capability decisions are centralized and server-informed; components do not duplicate role arrays.
- Shared primitives do not contain `resident versus government` condition forests. Portal composition supplies semantic aliases and content.

### 8.2 State ownership

| State | Canonical owner | Client responsibility |
|---|---|---|
| Identity/session/capability version | Authentication and authorization services | refresh safely, fail closed, clear inaccessible cached data |
| Entity state/version/eligible transitions | Domain API | render, submit expected version, reconcile conflict |
| Queue data/freshness/scope | Domain API plus server-state cache | serialize filters, cancel stale requests, show partial/stale truthfully |
| Route/filter/sort/selection | URL or route state where safe | preserve deep links, back, refresh, and shareable scoped views |
| Form/draft input | Form state plus approved draft persistence | validate, preserve safe input, disclose what is saved |
| Upload/offline operations | Operation queue with idempotency keys | show local/pending/synced/conflict state; prevent duplicate effects |
| Overlay visibility/focus return | Local interaction state | use accessible dialog/popover/drawer semantics |
| Theme/density/accessibility preference | Approved preference store | preserve parity and system fallback |

### 8.3 API adapter responsibilities

Every approved client technology must provide one consistent layer for:

- authentication expiry, refresh, revocation, and safe redirect;
- request cancellation and stale-response suppression;
- structured error parsing and correlation IDs;
- idempotency keys and safe replay for mutations;
- optimistic concurrency using entity version/ETag or approved equivalent;
- pagination/filter/sort serialization;
- cache invalidation and related-record reconciliation;
- upload validation, progress, cancellation, retry, quarantine/scan state;
- asynchronous job status and authorized download;
- offline detection and approved queued-operation recovery; and
- observability without PII, evidence, credentials, narratives, or exact coordinates.

Do not let each page invent its own fetch, retry, error, role, or status behavior.

## 9. Design-system build order

Build the system before duplicating routes.

### Layer 1 — Foundations

- semantic colors and portal action aliases;
- typography, spacing, radius, border, elevation, opacity, z-index, motion, density, and layout tokens;
- Morning Field Sheet and Night Inspection mappings;
- focus, forced-colors, reduced-motion, and evidence-preservation rules;
- breakpoints/topology rules as platform mappings, not design truth.

### Layer 2 — Accessible primitives

- button, link, icon button, field, label/help/error, native select, combobox, checkbox, radio, switch, segmented control;
- text area, date/time, search, upload/capture review;
- dialog, drawer, popover, tooltip, menu, tabs, disclosure, pagination;
- skip link, route announcement, focus trap/return, live region.

Each interactive primitive includes default, hover, focus, pressed, selected, disabled, loading, validation/error, and forced-colors behavior where applicable.

### Layer 3 — Shared patterns

- staff shell, side navigation, page header, breadcrumb, scope bar, command search;
- table/list/card responsive transformation;
- filters, saved views, result count, freshness, pagination;
- status, severity, priority, Signal Cut lifecycle, Coordinate Rail;
- Field Aperture evidence, map/list alternative, chart/table alternative;
- skeleton, first-use empty, filtered empty, partial, stale, offline, permission, conflict, provider error, system error, success;
- toast, page banner, inline feedback, notification item/center;
- governed decision region and confirmation sheet.

### Layer 4 — Domain composites

- My Work task row;
- report queue row and engineering docket;
- dispatch team/eligibility view;
- work-order summary, field update, proof/review;
- project stage/artifact/decision region;
- OBO review gates;
- procurement/BoQ/estimate document tables;
- record metadata/version/retention/legal-hold region;
- audit event and related chain;
- analytics metric frame with definition/freshness/table;
- people/capability comparison and emergency-access summary.

### Layer 5 — Page compositions

Pages use linked components and thin orchestration. A page may arrange a job-specific hierarchy, but it may not fork token values, status meaning, capability logic, feedback behavior, or accessibility primitives.

## 10. Complete page-to-delivery map

The page numbers match the complete design specification.

| Wave | Pages | Outcome | Entry gate |
|---|---|---|---|
| G0 — Truth and contracts | All | Resolve identities, capabilities, lifecycles, evidence, records, API and process ownership | Named owners and decision log active |
| G1 — Core and access | 1–5 | Secure government-only entry, sign-in, MFA/recovery, denied/session behavior | Identity/session/capability API approved |
| G2 — Shell and personal work | 6–7, 32 | Capability shell, My Work, management overview, notifications | Scope, task aggregation, deep-link, notification rules approved |
| G3 — Intake and dispatch | 8–11 | Report queue, engineering docket, triage, assignment, archive | Canonical report transitions, privacy and eligible-team API approved |
| G4 — Work delivery | 12–14 | Work-order list/docket, field update, completion proof/review | Canonical WO lifecycle, evidence, offline/idempotency and closure gates approved |
| G5 — Projects | 15–17 | Portfolio, project docket, governed advancement | One canonical project lifecycle and artifact gates approved |
| G6 — Technical planning | 18–20 | Design requests, structural analysis, field surveys | Discipline ownership, version/review, safety and result-document rules approved |
| G7 — Compliance and cost | 21–24 | OBO, procurement, BoQ, estimation | OBO stages, finance/BAC/ObR/NTP, segregation and monetary rules approved |
| G8 — Records | 25–27 | Documents/registry, process timeline, immutable audit | Classification, secure storage, retention, legal hold, disposition and audit APIs approved |
| G9 — Insights | 28–30 | Operational overview, analytics, predictive review | Metric definitions, data lineage, masking/export, model governance approved |
| G10 — Communications | 31–32 | Advisory draft/review/publish and actionable notifications | Audience, review/publish, delivery/outbox and inaccessible-source rules approved |
| G11 — Administration | 33–37 | People/roles, resident accounts, settings, agent access, emergency access | Target-role validation, session revocation, PII purpose, config versioning and emergency policy approved |
| G12 — Integrated pilot | All pilot scope | Reconciled golden journey, operations UAT, staged release and rollback | Zero open P0/P1; release packet signed |

### Pilot slice

The first meaningful pilot is not a dashboard-only release. It should carry one real report through:

```text
secure access
→ My Work / report queue
→ report docket and evidence/location review
→ verify or request information
→ eligible team assignment
→ work-order creation
→ field update and completion proof
→ review/close decision
→ resident-safe projection and notification
→ immutable event reconciliation
```

Projects, procurement, OBO, records, analytics, and administration may follow only after the common access, lifecycle, evidence, decision, feedback, and audit patterns prove stable.

## 11. Delivery phases and exit gates

Planning is gate-based. Teams may parallelize independent work, but they may not bypass dependencies.

### Phase 0 — Governance and functional truth

Deliver:

- named product/service and process owners;
- signed observed-route and visible-control inventory;
- canonical entity/state/transition proposals with conflicts visible;
- capability × jurisdiction × assignment × field × action matrix;
- data classification, PII, evidence, records, retention, financial, and model policy register;
- integrated environment and deterministic representative accounts/data;
- current correctness, accessibility, responsive, security, performance, and test baseline;
- decision and defect registers.

Exit when every P0 decision has an owner and date, and no current behavior is mistaken for target truth.

### Phase 1 — Contract baseline

Deliver:

- versioned API/OpenAPI contract or equivalent executable schema;
- global subject/session/capability contract;
- canonical lifecycle adjacency and resident-safe projections;
- structured error, pagination, filtering, idempotency, concurrency, outbox, upload, export, and async-job conventions;
- contract fixtures for happy, alternate, denied, stale, conflict, provider, and failure states;
- traceability IDs and acceptance criteria.

Exit when frontend, backend, QA, security, data, and process owners agree on executable contracts.

### Phase 2 — PULSO Core and Figma reconciliation

Deliver:

- reconciled semantic variables and light/dark mappings;
- accessible primitives and complete variants;
- shell, queue/detail, evidence, lifecycle, feedback, overlay, notification, table/card, map/list, and chart/table patterns;
- component catalog with behavior, accessibility, content, data, state, theme, and responsive examples;
- visual regression references and component tests;
- Figma component/version traceability.

Exit when shared components pass design, accessibility, responsive, theme, and failure-state review.

### Phase 3 — Government pilot vertical slice

Deliver the pilot journey from access through report triage, assignment, work order, proof, review, resident projection, notification, and audit.

Exit when the complete golden scenario passes role/capability, API, database, storage, outbox, timeline, accessibility, responsive, low-network, recovery, and UAT evidence.

### Phase 4 — Domain expansion

Deliver waves G5 through G11 one slice at a time. Reuse the proven shell and patterns. Do not independently recreate state machines, authorization, overlays, tables, evidence, timelines, notifications, or feedback.

Exit each wave through the same Definition of Ready and Done; secondary modules do not receive a lighter quality standard.

### Phase 5 — Integrated validation and staged release

Deliver:

- full contract/integration/E2E/adversarial suite;
- representative role UAT and field simulation;
- accessibility and browser/device evidence;
- migration-from-zero, supported upgrade, backup/restore, rollback and reconciliation evidence;
- SOPs, training, support, incident, monitoring, and on-call materials;
- signed go/no-go packet.

Exit only when no automatic no-go condition remains.

### Phase 6 — Operate and improve

Review queue dwell, failed/conflicting transitions, unauthorized attempts, audit/outbox reconciliation, provider/model degradation, accessibility regressions, support load, performance, and staff task outcomes. Feed evidence into prioritized, traceable slices rather than ad hoc redesign.

## 12. Mandatory vertical-slice contract

No government page should enter implementation from a screenshot or route name alone. Copy this template into every epic or implementation packet.

```text
Slice ID and version:
Artifact status: APPROVED / PROPOSED / OBSERVED / BLOCKED
User/job and intended outcome:
Process owner and delivery owner:

Pages/routes and safe deep links:
Figma frames/components/versions:
Responsive topology and density:
Light/dark and forced-colors behavior:

Source entity, durable ID, version and current state:
Related records and source lineage:
Authoritative data fields, freshness and provenance:
PII/evidence/document/retention classification:

Actor, capability, jurisdiction, assignment and delegation:
Visible fields and query/export scope:
Eligible commands and source → target transitions:
Prerequisites, evidence, threshold, segregation and next owner:

API operation IDs, schemas and fixtures:
Structured errors, pagination/filter/sort:
Idempotency, concurrency and retry:
Database, audit, timeline, outbox, storage and provider effects:

Loading/background refresh:
First-use and filtered empty:
Partial/stale/offline:
Permission/transition denied:
Validation/provider/system error:
Conflict/version changed:
Unsaved/upload/pending/replay recovery:
Success, durable event and next step:

Keyboard, focus, accessible names and announcements:
Map/chart/evidence alternatives:
320px, 200% zoom, narrow field and reduced motion:

Telemetry, safe event fields, SLO and alerts:
Automated tests, manual tests and UAT:
Feature flag/cohort:
Migration, compatibility and rollback:
Open decisions, risks and signatories:
```

### Slice sizing rule

A slice is the smallest releaseable unit that produces a persisted civic outcome. It is not:

- “build the table” without its data, states, access, and deep link;
- “make all buttons” without a real task;
- “connect the API” without UI recovery and accessibility;
- “finish the page” without valid mutations and side effects; or
- “redesign the dashboard” without an operational decision.

## 13. Interaction and feedback implementation contract

### 13.1 Toasts

Toasts acknowledge transient outcomes; the record, queue, and immutable activity prove persistence.

- Success: persisted event exists; offer View/Open only when helpful.
- Information: neutral update such as draft saved or refresh completed.
- Warning: attention required, but work remains recoverable.
- Recoverable error: explain what failed, what remains saved, whether anything committed, and Retry.
- Blocking error: keep persistent feedback on the affected page or overlay; a toast alone is insufficient.
- Progress: use only when a real asynchronous operation exposes state.
- Undo: only when the inverse action is real, safe, authorized, time-bound, and auditable.

Do not show success before the authoritative mutation and required transaction/outbox event are accepted.

### 13.2 Banners

Use persistent page/shell banners for offline, stale, partial, maintenance, permission change, delegation, emergency access, and service/provider degradation. State affected scope, freshness, saved/committed status, allowed work, and recovery.

### 13.3 Notifications

Notifications are task routing, not a social feed. Every item includes source object/ID, plain event, reason it matters, time, scope, read state, and an authorized deep link. If the source is no longer accessible, the service removes sensitive detail and provides a safe state.

### 13.4 Overlays

Prefer inline or full-page decisions when context is substantial. Use:

- popover/menu for short reversible choices;
- drawer for supplementary inspection without losing queue context;
- dialog for a bounded action needing immediate resolution;
- governed sheet or full-page review for destructive, lifecycle, permission, emergency, financial, retention, legal-hold, or multi-artifact decisions.

Every overlay defines initial focus, tab/escape behavior, accessible name/description, validation, async state, close rules, unsaved recovery, and focus return. Overlays render outside clipping containers through the platform’s approved portal/top-layer mechanism.

## 14. Lifecycle and mutation contract

Every mutation request and response must support the following meaning, regardless of transport syntax:

| Concern | Required contract |
|---|---|
| Actor | immutable authenticated subject plus current capability/delegation context |
| Target | entity type, durable ID, current version and source state |
| Command | explicit domain action, not arbitrary status text |
| Eligibility | backend decision with safe reason/prerequisite codes |
| Intent | reason/comment and approved structured fields |
| Integrity | idempotency key plus expected version/optimistic lock |
| Evidence | required artifact IDs and review state, never UI-only presence |
| Transaction | entity and database side effects commit atomically |
| Async effects | transactional outbox/job with visible delivery state |
| Result | new state/version, durable operation/event IDs, next owner/actions |
| Failure | stable code, correlation ID, retryability, current version/state, safe next action |

Required response families remain: success/create, accepted asynchronous work, validation, unauthenticated, unauthorized, not found without existence leakage, conflict, rate limit, and provider unavailable.

## 15. Authorization implementation matrix

For every route and command, test the Cartesian risk set—not only role labels:

```text
identity/session state
× capability and capability version
× jurisdiction/team
× assignment/ownership
× entity type/state/version
× field/document classification
× amount/threshold and segregation
× delegation/emergency scope and expiry
× query/export scope
```

Minimum negative cases:

- no, invalid, expired, revoked, suspended, resident, or wrong-audience token;
- wrong role/capability, jurisdiction, team, assignment, threshold, evidence gate, or entity state;
- restricted document, another official’s notification, masked PII, exact location, or overbroad export;
- stale capability/session after role change or deactivation;
- deep link to moved/deleted/inaccessible record without object-existence leakage; and
- emergency or delegated access outside reason, scope, or time window.

## 16. Complete state and recovery matrix

Every page/pattern marks applicable states and records the answer to five questions: What happened? What remains saved? What is stale? What may the employee do now? Did anything commit?

| State family | Required behavior |
|---|---|
| Loading | skeleton matches final geometry; controls do not imply available data |
| Background refresh | old data remains labeled with freshness; selection and safe input persist |
| First-use empty | explain the view and valid next action without fabricated records |
| Filtered empty | retain filters, show result scope, clear/change filters |
| Partial | identify missing region/source and whether decisions remain permitted |
| Stale | show last successful freshness and refresh/recovery; restrict risky decisions if policy requires |
| Offline | distinguish cached read from queued write; never imply server commit |
| Permission-limited | show safe available content/action and access recovery where appropriate |
| Transition-ineligible | explain authoritative prerequisite/current state and refresh path |
| Validation | associate field errors, preserve input, focus/announce summary and first error |
| Provider failure | preserve core manual/governed path; label affected capability |
| System failure | reference correlation ID, preserve safe context, offer retry/support |
| Conflict | show current server state/version and review/reapply path; never overwrite silently |
| No eligible assignee | preserve work and provide governed escalation |
| Unsaved/upload failure | preserve allowed draft/local artifacts and clearly label unsynced state |
| Success | durable ID/event, committed state, next owner/step, updated queue/activity |

## 17. Accessibility and responsive implementation gate

### Accessibility

- Use native semantics before custom widgets.
- Establish landmarks, skip link, logical headings, route announcements, table headers, row/action tab stops, form/error association, and accessible status names.
- Use a visible 3px focus treatment that is not clipped or obscured.
- Do not encode state, severity, selection, or completion through color or motion alone.
- Announce mutation results once at the correct urgency; do not duplicate toast and page announcements.
- Define dialog/drawer/popover/combobox keyboard behavior and focus return.
- Provide text alternatives for evidence, address/list alternatives for maps, and summaries/tables for charts.
- Validate forced colors, reduced motion, screen readers, keyboard-only, 200% zoom, and 320 CSS px reflow.

### Responsive topology

- Desktop may use queue/detail when task continuity benefits.
- Tablet may use a narrower queue and detail drawer/full page.
- Narrow/field layouts use one navigation model, record cards or deliberate table regions, full-page detail, bottom-safe actions, and explicit offline/upload state.
- Do not shrink the desktop canvas, hide critical actions in overflow, or require essential horizontal scrolling.
- At 1280×720 and 200% zoom, primary task, scope, freshness, evidence/location alternative, decision, and recovery remain reachable.

## 18. Test blueprint

### 18.1 Test layers

| Layer | Required coverage |
|---|---|
| Static | lint/type/schema/token/localization/dependency/secret rules for changed scope |
| Design-system | component anatomy, states, keyboard, accessible name, theme, forced colors, visual regression |
| Domain unit | lifecycle projection, capability interpretation, formatters, safe error/copy mapping |
| Contract | client and service against the same schema, enums, errors, eligibility and fixtures |
| Integration | session, cache/invalidation, URL state, upload, idempotency, conflict, outbox/job reconciliation |
| E2E | role-based golden journeys and recovery paths across UI and backend side effects |
| Adversarial | BOLA/IDOR, state skip/replay/race, upload abuse, export leakage, session/role change, provider failure |
| Manual | staff usability, keyboard, screen reader, zoom/reflow, field connectivity, maps/charts, light/dark |
| UAT/pilot | real process representatives using realistic volume, handoffs, exceptions and SOPs |

### 18.2 Required golden scenarios

1. Report triage → eligible assignment → work order → proof → review → resident projection.
2. Information requested → resident correction → renewed review without lost history.
3. Duplicate incident linked without exposing reporter or creating duplicate work.
4. Project → design/survey → BoQ/estimate → procurement/finance/BAC/NTP → work → inspection/turnover.
5. OBO application → discipline review → payment/inspection → appeal/reinspection → clearance.
6. Legal hold prevents disposition; approved later disposition tombstones without erasing audit.
7. Permission/role change invalidates current session/cached access and records the before/after event.
8. Offline field operation replays once through the same idempotency key and reconciles evidence.
9. Provider/model outage preserves truthful manual work and never substitutes sample operational data.
10. Concurrent reviewers receive a conflict and cannot create duplicate or overwritten decisions.

### 18.3 Automatic no-go conditions

- Any resident or unauthorized staff access to government data or action.
- Suspended, revoked, expired, or out-of-scope access remains usable.
- Arbitrary/skipped lifecycle, proofless completion, invalid financial/NTP action, or duplicate side effect.
- Destructive, permission, monetary, emergency, retention, or legal-hold action without authoritative confirmation and audit.
- Public/bypass access to restricted identity, evidence, documents, exact location, or export.
- Fetch/provider failure represented as empty, success, verification, compliance, or operational truth.
- Random/sample prediction represented as real.
- A critical workflow unusable at required viewport, zoom, keyboard, or screen-reader conditions.
- An open P0/P1 defect in the released path.

## 19. Observability and service health

Use a privacy-safe event envelope:

```text
event_name, surface, flow, step, role_class, capability_result,
entity_type, safe_state_from, safe_state_to, result, error_code,
duration_ms, correlation_id, design_version, release_cohort
```

Never log names, credentials, OTPs, raw IDs, contact information, unrestricted narratives, full coordinates, evidence, document contents, or sensitive query results.

Monitor:

- sign-in/session/authorization denial and suspicious access;
- queue/API latency, freshness, error, cancellation, and result-volume health;
- lifecycle dwell, illegal/conflicting transitions, idempotent replays, and duplicate prevention;
- audit/timeline/outbox/storage reconciliation;
- document/PII/export/legal-hold access and denial;
- provider/model latency, quota, failure, drift, fallback, and kill-switch use;
- field sync, upload, evidence scan, conflict, and unsynced age;
- advisory/notification delivery and inaccessible-source handling;
- accessibility regression and browser/client errors; and
- Core Web Vitals by route/device when web delivery is used.

Performance targets for the web implementation remain LCP ≤2.5s, INP ≤200ms, and CLS ≤0.1 at the 75th percentile, segmented by device class. Route and data-volume budgets must be measured from the integrated baseline rather than invented.

## 20. Migration, flags, release, and rollback

### Compatibility strategy

- Preserve existing route and payload compatibility through a measured adapter when required.
- Maintain one mapping registry from legacy route/endpoint/status/role/ID to canonical contract.
- Record consumer, usage, replacement, migration, owner, observation window, and retirement evidence.
- Do not support two independent mutation paths that can diverge lifecycle or audit.
- Reconcile records created through old and new clients during canary.

### Feature flags

Flags may scope by:

- surface/route;
- capability or department;
- jurisdiction/team;
- named internal or pilot cohort;
- design/contract version; and
- provider/model feature.

Every flag has an owner, default, expiry/retirement date, telemetry, dependency, one-step disable path, data consequence, and rollback instruction.

### Release sequence

1. component and contract environment;
2. internal design/QA/security accounts;
3. representative process-owner UAT;
4. one staff pilot team and one reconciled vertical slice;
5. expand by capability/department and jurisdiction;
6. enable secondary domains after their owners sign the gate;
7. retire legacy surfaces only after observation and rollback windows pass.

### Rollback

Rollback must preserve records, drafts where allowed, evidence, audit, outbox reconciliation, and resident projection. Rehearse:

- flag disable;
- frontend version rollback;
- API compatibility fallback;
- migration rollback or forward-fix strategy;
- queued/offline operation reconciliation;
- record reconciliation across old/new UI; and
- staff communication and support escalation.

## 21. Team operating model

| Role | Accountability |
|---|---|
| Government product/service owner | outcome, priority, cross-process agreement, go/no-go |
| Domain process owners | report, work order, project, OBO, procurement, advisory, records, identity/model operating truth |
| Design-system/design lead | Civic Aperture, component contract, Figma traceability, responsive/theme coherence |
| Frontend lead | portable client architecture, slice integration, accessibility and performance |
| Backend/data/platform lead | authorization, lifecycle services, transactions, API/data/migration/provider reliability |
| Security/privacy owner | capability policy, threat model, PII/evidence/export/session controls |
| Records/legal owner | classification, retention, legal hold, audit, disposition and access policy |
| Finance/procurement/BAC owner | thresholds, segregation, ObR/cash/BAC/NTP and monetary UAT |
| QA/accessibility lead | risk model, RTM, independent evidence, defect/release recommendation |
| Analytics/model owner | definitions, lineage, masking, deterministic model governance and monitoring |
| Release/support/on-call | environments, flags, deploy, rollback, incident, SOP and service review |

### Working cadence

- decision and blocker review before slice planning;
- design/API/test contract review before Ready;
- shared-core review for any reusable pattern change;
- accessibility and content review before development-complete status;
- process-owner demonstration against real workflow before UAT sign-off;
- release/rollback rehearsal before pilot;
- post-release service review based on evidence, not aesthetic preference.

## 22. Definition of Ready

A government slice is Ready only when:

- user/job, outcome, process owner and boundaries are named;
- artifact status and unresolved decisions are explicit;
- canonical source entity, state/version, relations and lifecycle transitions are approved for scope;
- capability, jurisdiction, assignment, field/query/export, delegation and emergency rules are executable;
- API operation/schema/error/pagination/idempotency/concurrency/outbox contracts and fixtures exist;
- Figma frame/component versions and responsive/light/dark behavior are linked, or the item is explicitly blocked on Figma;
- loading, empty, partial, stale, offline, denied, conflict, provider, error, unsaved and success behavior is specified;
- accessibility and keyboard/focus/announcement requirements are testable;
- privacy, evidence, document, retention, financial and model classifications are resolved;
- automated/manual/UAT tests, telemetry, flag, migration and rollback are defined; and
- no unresolved P0 policy, security, records, finance, lifecycle, architecture or data dependency remains.

## 23. Definition of Done

A government slice is Done only when:

- the intended job completes end to end with a durable, authoritative outcome;
- route, navigation, page, fields, data, query, export and commands agree with backend authorization;
- state transitions and linked database/audit/timeline/outbox/storage/provider effects are atomic, idempotent, version-safe and reconciled;
- failures state whether anything committed and preserve safe context/input;
- no dead control, invented status, fabricated metric, sample operational result, or misleading “real time” claim exists;
- critical states, themes, responsive topologies, keyboard, screen reader, zoom/reflow, reduced motion and forced colors pass;
- component, contract, integration, E2E, adversarial and manual evidence passes for changed risk;
- performance and privacy-safe observability meet approved budgets;
- migration, feature flag, compatibility, support and rollback are exercised;
- Figma/design, API/schema, traceability, decision, test, release and operational documentation are current; and
- required product, process, engineering, QA, security/privacy, records/legal, accessibility, finance/model and on-call owners sign the release packet.

## 24. Pull-request or change-review checklist

Regardless of source-control platform, every implementation change answers:

1. Which slice, page, flow, capability, API operation and decision IDs does this change implement?
2. What user outcome becomes possible, and what is explicitly out of scope?
3. Which approved/proposed/observed behavior changed?
4. Does it introduce or fork a token, primitive, status, role list, endpoint, error mapper, overlay, notification, or state pattern?
5. How are unauthorized, stale, conflict, partial, offline, provider and system failures handled?
6. What persists atomically, what emits to audit/timeline/outbox, and what is the next owner?
7. What PII, evidence, document, location, financial, retention or model risk is present?
8. What accessibility, responsive, theme and keyboard evidence is attached?
9. Which contract, integration, E2E, adversarial and manual tests pass?
10. What telemetry, flag, migration, compatibility and rollback are included?
11. Were Figma/component versions and documentation updated?
12. Who approved operational meaning and release risk?

## 25. Decision-record template

```text
Decision ID/title:
Status and date:
Owner and required approvers:
Problem/conflict and affected records/routes:
Approved product constraints:
Observed current behavior:
Options and consequences:
Decision and rationale:
Lifecycle/capability/data/API/design/test impact:
Migration/compatibility/rollback:
Affected documents/Figma/components/contracts:
Validation date and review trigger:
```

Architecture or library preference alone does not override product contracts. Record framework, router, state/cache, styling, component-catalog, map/chart, test, build, monitoring, and deployment selections through ADRs when they materially affect portability or risk.

## 26. First-start checklist

When a team begins from this blueprint, do these in order:

1. Assign the government product owner and process owners.
2. Open the decision register and import the unresolved decisions from sections 28 and the complete design specification.
3. Verify an integrated environment with representative roles, jurisdictions, states and sample data.
4. Freeze the observed route/control/API/defect baseline.
5. Approve the global identity/session/capability contract.
6. Approve report and work-order transitions for the pilot.
7. Approve evidence, resident projection, notification, audit and retention effects.
8. Establish the executable API schema and fixtures.
9. Reconcile Figma variables/components, then build the pilot frames from linked components.
10. Implement PULSO Core and the access/shell foundation.
11. Deliver the pilot vertical slice behind an owned flag.
12. Run integrated QA, role UAT, accessibility review and rollback rehearsal.
13. Observe the pilot before expanding by domain.

## 27. Required implementation packet

Every milestone hands the next team one self-contained packet:

- scope and outcome;
- approved/proposed/observed decision register;
- page/flow map and Figma versions;
- component/token dependencies;
- capability and field/query/export matrix;
- lifecycle and event/outbox contract;
- API schema, examples and fixtures;
- state/recovery matrix;
- content and terminology contract;
- accessibility and responsive acceptance;
- data/privacy/evidence/records/model classification;
- test evidence and defect disposition;
- telemetry/SLO/alerts;
- feature flag, migration, compatibility and rollback;
- operations SOP/training/support notes; and
- owners, signatories, version and validation date.

This packet is the handoff boundary. Knowledge retained only in chat, a developer’s head, a screenshot, or an unlinked ticket is not complete.

## 28. Decisions required before implementation freeze

1. Approve target government IA and legacy route/redirect strategy.
2. Approve the 72px rail versus compact labeled sidebar default through staff testing.
3. Approve one global subject/session/revocation/capability-version model.
4. Approve capability, jurisdiction, assignment, field, query, export, delegation and emergency matrices.
5. Approve canonical report, work-order, project, procurement and OBO lifecycles, evidence gates and exception owners.
6. Choose one work-order API, one project-advance service, one FQA/certificate path, one advisory service and one audit API.
7. Approve API versioning, structured errors, pagination/filter/sort, idempotency, concurrency and transactional outbox conventions.
8. Approve secure evidence/document storage, classification, access, retention, legal hold, disposition and audit integrity.
9. Approve finance/ObR/cash/BAC/NTP/segregation/threshold rules.
10. Approve resident-safe projections, notification triggers, information-request and closeout behavior.
11. Approve analytics definitions, source lineage, freshness, PII/exact-location/export rules.
12. Approve predictive and AI model/provider/version, determinism, limitation, human-review, monitoring and kill-switch policy.
13. Approve field/offline operation, location, evidence, device, replay and reconciliation policy.
14. Approve government language scope, typography licenses/fallbacks, accessibility ownership and test matrix.
15. Name UAT, production, support, incident, data-reconciliation and periodic service-review owners for every capability class.

## 29. Next Figma action

This phase is documentation-only, so the live file is intentionally unchanged. When Figma work resumes:

1. inspect the current shared file and reconcile v0.2 variable/component limitations;
2. establish semantic light/dark mappings and shared component behavior first;
3. build Core Library states for shell, queue/detail, evidence, lifecycle, overlays, notifications and system feedback;
4. instantiate the reviewer-final government template rather than detaching it;
5. compose the G1–G4 pilot frames with semantic names, Auto Layout, intentional Fill/Hug and linked instances;
6. annotate jobs, status, data authority, capability, lifecycle, privacy, responsive, accessibility, test and decision dependencies; and
7. validate structure and screenshots before calling any frame implementation-ready.

## 30. Blueprint acceptance

This blueprint is ready to start discovery, governance, architecture, design-system preparation, contract work, estimation, staffing, and backlog shaping.

It does **not** authorize production implementation until the relevant slice satisfies Definition of Ready. The complete government visual direction remains endorsed for planning; detailed IA, lifecycle, capabilities, policy, and API behavior remain proposed until their named owners approve them.

If a future implementation cannot trace itself back to this blueprint, it is not yet a PULSO government implementation—only an isolated interface.
