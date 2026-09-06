# Observed government portal process audit — 28 August 2026

| Field | Value |
|---|---|
| Artifact status | **Observed runtime evidence**; not an approved target design |
| Runtime | Local unreleased build at `127.0.0.1:5173` with the local API |
| Roles exercised | City Engineer; System Administrator |
| Primary viewport | Approximately 1294 × 912 px |
| Evidence | 24 browser captures in this directory plus selective source inspection |
| Mutation boundary | No business records, roles, approvals, documents, or settings were changed |
| Last validated | 28 August 2026 |

## 1. Executive understanding

PULSO currently behaves as a multi-role municipal operations suite rather than a single dashboard. The government side connects seven operational domains:

1. staff authentication and role routing;
2. citizen-report intake, AI-assisted triage, approval, dispatch, and resolution;
3. infrastructure project preparation and delivery;
4. procurement and finance gates;
5. OBO inspection and technical review;
6. records, documents, timelines, analytics, and audit; and
7. identity, role, resident-account, and system administration.

The most important redesign constraint is that the current interface exposes several competing versions of operational truth. Navigation, frontend route guards, lifecycle labels, timelines, audit logs, role controls, and domain dashboards do not consistently agree. The redesign should therefore begin with the authorization, lifecycle, decision, and audit contracts—not by restyling the existing dashboards.

## 2. Authority and evidence boundaries

- `PRODUCT.md` and the approved Civic Aperture direction remain product truth.
- The detailed government IA, capability model, lifecycle, routes, and workflow specifications are **proposed** until the named LGU and product owners approve them.
- This document records what was **observed** in the local runtime and what was corroborated in source. It does not promote current behavior into target UX.
- Seed data, generated scores, system-health claims, and sample records were treated as demonstration content unless an authoritative source was visible.
- The browser scan did not validate mobile layouts, 320 px reflow, 200% zoom, keyboard-only use, screen-reader output, reduced motion, forced colors, API authorization under adversarial access, or database durability.

## 3. Runtime walkthrough

| # | Step | Health | Observed result | Evidence |
|---:|---|---|---|---|
| 1 | Government sign-in | **Partial** | Role sign-in works after supplying a supported reCAPTCHA key and the correct local API URL. The default local setup points at a different API port, and the configured CAPTCHA key rejected localhost. | [01](./01-government-login.png), [02](./02-government-login-security-puzzle.png) |
| 2 | City Engineer landing | **Partial** | A useful role-specific dashboard exposes KPIs, pending actions, quick actions, a five-step workflow, and an approval chain. Some visible destinations are not actually authorized. | [03](./03-city-engineer-dashboard.png) |
| 3 | Process trace | **Strong but inconsistent** | The timeline presents 15 chronological events across report and project states, giving a good model for lifecycle traceability. That history is not reconciled with the empty Audit Logs view. | [04](./04-process-timeline.png), [20](./20-audit-logs-empty.png) |
| 4 | Predictive maintenance | **Partial** | Overview, asset scores, failure probabilities, recurrence, maintenance dates, and a risk table are visible. The schedule has no work, the “Risk Map” is tabular, and the budget/urgency outputs do not explain provenance. | [05](./05-predictive-maintenance-overview.png), [06](./06-predictive-asset-health.png), [07](./07-predictive-schedule-empty.png), [08](./08-predictive-risk-map.png) |
| 5 | City Engineer navigation | **Broken** | The sidebar labels the user “City Engineer / BO” and exposes OBO and Analytics, but route guards deny both destinations. | [09](./09-obo-access-restricted.png) |
| 6 | Project queue | **Partial** | A project can be found and opened, but Survey, Design, Structure Analysis, and related departmental screens largely repeat the same generic queue instead of representing distinct jobs and gates. | [10](./10-projects-queue.png) |
| 7 | System Administrator landing | **Partial** | The administrator dashboard provides broad module access and operational counts, but mixes operational work, governance, and system administration in one navigation model. | [11](./11-system-admin-dashboard.png) |
| 8 | Report triage and dispatch | **Partial / high risk** | Incoming reports, filters, map context, AI confidence, lifecycle stages, logistics, reject, verify, and audit actions are present. The selected report contains no resident evidence, has 60% AI confidence, and displays compressed stage labels. Permanent deletion is exposed per row. | [12](./12-command-center-triage.png), [13](./13-command-center-selected-report.png) |
| 9 | Approval and fleet modes | **Broken continuity** | Switching to an empty approval queue or fleet view retains the previously selected incident popup on the map. “Five active teams” are visually indistinguishable grey cards while the dispatch queue is empty. | [14](./14-command-center-approval-queue-empty.png), [15](./15-command-center-fleet-manager.png) |
| 10 | Analytics and executive performance | **Broken / partial** | Changing analytics to six months crashes the whole routed experience because Google Maps removed the Heatmap Layer in API v3.65. The executive page loads, but key visualizations are blank while claiming real-time intelligence. | [16](./16-analytics-heatmap-system-fault.png), [17](./17-executive-performance.png) |
| 11 | Records and documents | **Mixed** | The finalized-record modal is too thin to function as a complete engineering docket. The Document Registry is the strongest governed surface: it exposes classification, SHA-256, restriction, retention, legal hold, and document actions. | [18](./18-records-registry-detail.png), [19](./19-document-registry.png) |
| 12 | Procurement | **Promising but incomplete** | The Budget Handshake exposes Validation → ObR Posting → Cash Availability → BAC Scheduled → NTP Issued. Detail shows disabled statutory gates, but not the prerequisite, owner, evidence, or reason needed to advance them. | [21](./21-procurement-pipeline.png), [22](./22-procurement-detail-gates.png) |
| 13 | People and roles | **High risk** | Government accounts expose inline role selectors and Suspend controls. The interface does not explain impact, session revocation, approval, reason, or audit consequences. Several seeded positions and assigned roles appear semantically inconsistent. | [23](./23-government-account-management.png) |
| 14 | OBO five-point review | **High risk** | An application opens five discipline approvals—Architectural, Civil/Structural, Electrical, Sanitary/Plumbing, and Mechanical. Each presents an immediate Approve button without visible findings, attachments, reviewer identity, prerequisites, reason, consequence, or confirmation. | [24](./24-obo-five-point-review.png) |

## 4. Observed process model

### 4.1 Authentication and role entry

```text
Government sign-in
→ CAPTCHA/client validation
→ API authentication
→ role-derived dashboard
→ route guard + sidebar decide visible work
```

Observed break: sidebar role families and route-guard role arrays are separate authorities. A user can be shown a destination that the router rejects.

### 4.2 Citizen incident operations

```text
Incoming resident report
→ AI category/confidence suggestion
→ human triage
→ reject as spam OR verify to manager
→ approval queue
→ fleet/team dispatch
→ field resolution
→ process timeline / archived record
```

The runtime timeline contained the legacy chain `pending → pending approval → approved internal → dispatched → resolved`. The proposed specifications use a more explicit canonical chain and should remain proposed until approved. The UI must not mix the two without a migration mapping.

### 4.3 Project delivery

```text
Project request
→ survey
→ design
→ structural/technical analysis
→ BoQ and estimate
→ budget/procurement gates
→ approval and dispatch
→ construction / milestones
→ resolution and completion certification
```

The current runtime exposes many of these departments as routes, but most are projections of the same project queue. That means the navigation describes an organization chart more clearly than it describes the current worker's next task.

### 4.4 Procurement

```text
Draft request
→ validation
→ ObR / funding certification
→ cash availability
→ BAC scheduling
→ NTP issuance
→ procurement / mobilization
```

The visual pipeline is understandable. The operational contract is incomplete in the interface: disabled gates need a named owner, missing prerequisite, required document, permitted actor, and recovery path.

### 4.5 OBO

```text
Application received
→ inspection scheduling and evidence
→ five-discipline technical review
→ payment / executive clearance
→ permit OR notice
→ reinspection where required
→ cleared
```

The runtime jumps directly from application detail to five one-click approvals. The inspection, evidence, payment, appeal, notice, and clearance chain is not visible in that decision surface.

### 4.6 Records, audit, and learning

```text
Operational event
→ process timeline
→ immutable audit event
→ finalized record / document classification
→ retention and legal-hold policy
→ privacy-scoped analytics and asset history
```

Document Registry demonstrates much of the intended governance model. Audit Logs showing zero entries while Process Timeline shows 15 events is a release-blocking contradiction, especially while permanent deletion controls remain visible.

### 4.7 Administration

```text
Official or resident account
→ role/capability and scope
→ activation/suspension
→ session revocation
→ immutable reasoned audit event
```

The runtime currently makes high-consequence role and status controls look like ordinary table edits. Roles & Permissions does not provide a readable capability matrix, scope, or policy preview.

## 5. What is already working well

1. **Role-specific dashboard intent.** City Engineer landing content is task-oriented and more useful than a generic analytics home.
2. **Lifecycle visibility.** The Process Timeline offers a strong foundation for Signal Cut and accountable civic work.
3. **Procurement gate framing.** The Budget Handshake makes a complex statutory sequence scannable.
4. **Document governance.** Classification, hash, restriction, retention, and legal-hold concepts are visible together.
5. **AI as a suggestion.** The triage detail exposes confidence and calls for human categorization at 60%, which is directionally correct.
6. **Maps have some list/table counterparts.** The incident queue and predictive risk table can support a proper non-map alternative.

## 6. Priority findings

### P0 — correct operational truth before visual redesign

1. **Analytics route can crash the entire application.** Replace the removed Heatmap Layer, isolate provider failures with route/section error boundaries, and retain the last usable non-map view with Retry.
2. **Navigation and authorization disagree.** Derive navigation, routes, fields, and actions from one backend-authoritative capability response. Do not maintain separate role families in the sidebar and router.
3. **Audit integrity is not credible.** Reconcile Process Timeline and Audit Logs around one append-only event model. Replace hard deletion with governed retraction, archive, disposition, or tombstone behavior.
4. **Lifecycle mutation paths need one authority.** Report, work order, project, procurement, and OBO transitions require adjacency, actor, evidence, version, idempotency, and immutable effects.

### P1 — make decisions safe and domain-specific

1. **Consequence-aware decisions are missing.** OBO approval, report rejection/verification/deletion, role changes, suspension, document deletion, and financial gates need a shared decision contract: object, current state, target state, evidence, reason, consequence, notification, confirmation, result, and audit ID.
2. **Selected-state leakage creates false context.** Queue, selection, filter, map, and detail must be a coherent URL/state model; empty queues must not retain another mode's selected incident.
3. **Department screens are generic projections.** Survey, design, analysis, estimation, and BoQ need role-specific task reasons, prerequisites, artifacts, ownership, and decisions—not duplicated project lists.
4. **System claims are inconsistent.** Runtime surfaces present different application versions and production/stable/real-time labels. Every environment, freshness, health, and model claim needs an authoritative source and timestamp.
5. **Sensitive account views lack purpose and traceability.** Resident PII/trust and staff-role access need field-level authorization, controlled reveal, purpose, access logging, and safe export rules.

### P2 — accessibility and visual-system debt

1. Report rows contain nested actions, including permanent deletion, inside a row-level interactive target. Use accessible table semantics and separate links/buttons.
2. Several status and team states rely heavily on color, low contrast, or empty grey cards. Add text, icon/shape, freshness, owner, and next action.
3. Workflow labels compress and overlap in triage detail. Signal Cut must preserve readable labels, time, and non-color state at narrow widths and zoom.
4. Empty states often become large blank surfaces. Distinguish first-use empty, filtered empty, unavailable, permission-limited, loading, stale, and system error.
5. The visual language is currently generic card-heavy SaaS UI with gradients and many competing colored KPI blocks. It does not yet express the approved Civic Aperture system: Field Aperture, Signal Cut, Coordinate Rail, local cartography, Morning Field Sheet, and Night Inspection.
6. Keyboard traversal, focus return, 3 px focus treatment, announcements, forced colors, 320 px reflow, and 200% zoom remain unverified.

## 7. Refactor seams to establish before route redesign

| Seam | Responsibility | First proof |
|---|---|---|
| Capability and scope service | Backend-owned route, field, action, record, PII, jurisdiction, and delegation permissions | Same response drives sidebar, route guard, data fetch, and action rendering; negative API tests pass |
| Canonical lifecycle services | One transition command per entity with adjacency, actor, evidence, version, idempotency, and effects | Illegal skips fail; success produces one state change, timeline event, audit event, and notification/outbox |
| Unified route manifest | Route metadata, capability, label, navigation group, deep-link schema, and owning domain | City Engineer never sees an inaccessible OBO/Analytics affordance |
| Decision contract | Shared confirmation/result pattern for high-consequence actions | OBO approval and account suspension capture reason, consequence, actor, and immutable audit ID |
| Append-only civic event ledger | Process, audit, retention, notification, and public-safe projections | Timeline and Audit Logs reconcile by entity/event ID |
| Records disposition service | Archive, retraction, legal hold, retention, and controlled deletion | No operational UI can erase the only timeline/audit evidence |
| Workspace state model | Scope, saved view, filters, selection, freshness, queue, detail, and map/list parity | Mode changes cannot leak a stale selected case; back/refresh restore context |
| Domain workspaces | Report docket, project docket, procurement dossier, OBO application, document record | Each surface explains why the item is here, required artifacts, owner, gate, next action, and history |
| Provider adapters and error isolation | Maps, AI, geocoding, analytics, and model provenance | Provider failure keeps manual workflow and non-map/list alternative usable |
| Truth and freshness adapter | Environment, version, data timestamp, health source, model source, sample-data marking | No unsupported “real-time,” “production,” or freshness claim renders |
| Civic Aperture primitives | Tokens, shell, queue row, docket detail, Field Aperture, Signal Cut, Coordinate Rail, decision panels | Light/dark and responsive components pass WCAG 2.2 AA acceptance tests before route composition |

## 8. Recommended redesign starting point

Start with one end-to-end **Operate** slice: Citizen reports from scoped queue to reasoned assignment. It exercises the shell, role capability, queue/detail continuity, evidence, location, AI limits, Signal Cut, decision confirmation, audit, notification, map/list parity, loading/error/stale states, and responsive behavior.

The target desktop composition should be:

```text
Persistent permitted navigation
→ current jurisdiction/scope + search + freshness
→ saved queue/filter set
→ selected engineering docket
   → true-color resident evidence and metadata
   → address/map plus text alternative
   → authoritative status and Signal Cut
   → AI suggestion with source/confidence/limits
   → immutable activity
   → sticky, role-authorized, consequence-aware actions
```

After that slice is approved and executable, reuse its contracts for Project, Procurement, OBO, Records, and Administration rather than designing each route as an isolated dashboard.

## 9. State and acceptance matrix for the first slice

| Area | Required states |
|---|---|
| Queue | loading, loaded, first-use empty, filtered empty, stale, partial, offline, recoverable error, system error |
| Selection | none, selected, deep-linked, removed from current filter, changed by another user, permission lost |
| Evidence | available, missing, still processing, unsafe/quarantined, unsupported, controlled reveal, text alternative |
| Map/location | exact authorized, privacy-reduced, provider unavailable, permission denied, textual address/list alternative |
| AI suggestion | available, low confidence, unavailable, timed out, malformed, superseded by human decision |
| Decision | permitted, disabled with reason, confirmation, submitting, conflict, partial failure prevented, success with event ID |
| Lifecycle | authoritative current state, pending server confirmation, version conflict, immutable history, migrated legacy state |
| Accessibility | keyboard order, focus destination/return, accessible names, announcement, non-color status, 3 px focus, 200% zoom, 320 px reflow, forced colors |

## 10. Evidence limitations and next design action

The scan used two seeded staff roles and the data available in one local environment. It did not prove what every role, jurisdiction, permission scope, data volume, or degraded backend state experiences. Several controls were deliberately not activated because they would mutate records or permissions.

No Figma or product code was changed in this documentation phase. The next visual action is to inspect the live PULSO Figma file, reconcile its current components and bindings, then place these observed flows and screenshots beside proposed **My Work**, **Citizen Reports**, **Projects**, **Procurement**, **OBO**, and **Records** artifacts. Approval status and unresolved lifecycle/capability decisions must stay visible in that file.

## 11. Screenshot index

All captures are local runtime evidence, not production proof:

- `01–04`: authentication, City Engineer dashboard, and timeline
- `05–08`: predictive overview, asset detail, schedule, and risk table
- `09–10`: authorization mismatch and project queue
- `11–17`: administrator dashboard, command center, fleet, analytics failure, and executive view
- `18–20`: records, document governance, and empty audit log
- `21–24`: procurement, accounts, and OBO review

