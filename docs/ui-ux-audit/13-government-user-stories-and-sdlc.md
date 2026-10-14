# Government-side user stories, QA contract, and SDLC

| Field | Value |
|---|---|
| Document type | Government product requirements + QA acceptance + delivery lifecycle |
| Status | Baseline verified; target contract proposed for LGU approval |
| Version | 1.0 |
| Last validated | 23 August 2026 |
| Product scope | Government web portal, command center, field operations, projects, procurement, OBO, records, analytics, predictive maintenance, people/RBAC, and shared API |
| Target stream | `codex/ui-reworks-government`, consuming approved contracts from `codex/ui-reworks` |
| Implementation | Not started; this document changes no application code |

## 1. Executive QA assessment

The government side is a multi-role civic operations platform rather than one dashboard. It already models report triage, work orders, field execution, a thirteen-stage project process, procurement and BoQ, OBO inspection, documents, advisories, analytics, predictive maintenance, users/roles, and public/internal timelines.

Its primary QA risk is not visual polish; it is competing sources of operational truth. Static role arrays, dynamic capabilities, frontend guards, backend role groups, status strings, duplicate endpoints, and direct mutations disagree. Several apparently available actions are deterministically broken. Some protected data and mutations are under-authorized, while legitimate staff can be blocked by role-name drift.

The government rework must therefore begin with five approved contracts:

1. one backend-authoritative capability and jurisdiction model;
2. one state machine per entity, with actor and evidence gates;
3. one API/version/error/pagination/idempotency contract;
4. append-only audit and retention behavior;
5. resource-level authorization for identity, evidence, documents, exports, locations, and field work.

No government design should show an action as available until the backend authorization and transition contract can support it.

## 2. Evidence and authority

| Label | Meaning |
|---|---|
| **Implemented** | Current route exists; not a quality endorsement. |
| **Derived view** | Endpoint projects existing records into a departmental queue; it is not a separate source entity. |
| **Broken** | Current route/action has deterministic wiring, schema, or model mismatch. |
| **Observed risk** | Reachable behavior violates stated authorization, lifecycle, audit, privacy, or integrity expectations. |
| **UI-contract gap** | Frontend requests an endpoint/method/payload absent from the backend. |
| **Proposed** | Target acceptance contract requiring approval and later implementation. |
| **Decision required** | LGU operations, records, finance, security, legal, or product ownership is needed. |

Current authorities are [App.jsx](../../frontend/src/App.jsx#L56), [ProtectedRoute.jsx](../../frontend/src/components/ProtectedRoute.jsx#L27), [rbac_utils.js](../../frontend/src/utils/rbac_utils.js#L8), [gov_router.py](../../backend/gov_router.py#L37), [gov_crud.py](../../backend/gov_crud.py#L303), [gov_models.py](../../backend/gov_models.py#L46), and the domain routers linked in the endpoint section.

## 3. Government actors and capability classes

Role labels alone are not a safe authorization model. Stories and tests use capability classes, then bind approved job titles to them.

| Capability class | Representative current roles | Typical action scope |
|---|---|---|
| Executive approval | City Engineer, Assistant City Engineer, authorized manager | cross-division review, approval, certificate, escalation, audit |
| Command operations | Dispatcher, authorized operations manager/clerk | triage, verify/reject, assignment, incident coordination |
| Project/design | Division Chief, Design Engineer, CAD Operator, Project Engineer | survey, design, phase deliverables, technical review |
| Field execution | Project Engineer, Foreman, Field Worker, Inspector | assigned work, GPS/status, evidence, completion |
| Estimation/procurement | Estimator, Admin/Finance/BAC-authorized staff | BoQ, budget, funding, BAC, cash, NTP |
| OBO/inspection | Building, Electrical, Mechanical Inspector, authorized executive | inspection, technical review, notice/permit/clearance |
| Records/administration | Records Officer, Admin Officer/Clerk | registry, classification, retention, legal hold, archive |
| Analytics/planning | Approved analysts and executives | privacy-scoped analytics, models, exports, conversion drafts |
| Identity administration | System Administrator and delegated account admins | users, roles, capabilities, suspension, session revocation |
| Auditor | Independently authorized reviewer | immutable audit/timeline read/export; no business mutation |

### Capability dimensions

Every authorization decision must include:

- module and action;
- record ownership/assignment;
- department and jurisdiction;
- field-level/PII visibility;
- source and target state;
- monetary and emergency threshold;
- required evidence/approvals;
- bulk/export permission;
- temporary delegation or emergency override;
- audit reason and expiry where applicable.

The current system has three inconsistent authorities: frontend static groups, frontend capability JSON, and backend static/dynamic checks. The backend must become the sole security authority; frontend guards remain usability controls only.

## 4. Current government route map

| Frontend route | Intended job | Current contract state |
|---|---|---|
| `/gov` | Staff sign-in | Implemented |
| `/gov/my-dashboard` | Role-specific tasks and counts | Implemented; some KPI field drift |
| `/dispatcher` | Report queue, map, triage, dispatch, resolution | Implemented with broken FQA action |
| `/management` | KPI, archive, documents, timeline, users, advisories | Partial; audit and user-status actions broken |
| `/gov/work-orders` | Work-order list/detail/create/approval | Implemented with update defect |
| `/gov/projects` | Project list/detail/advance/documents | Partial/broken advance/certificate paths |
| `/gov/timeline` | Process events | Implemented |
| `/gov/audit-logs` | Audit review | **UI-contract gap: no backend route** |
| `/gov/obo` | Inspection/permitting queue | Implemented; sequence not enforced |
| `/gov/procurement` | PR, BoQ, funding/BAC/NTP | Implemented; adjacency/prerequisite gaps |
| `/gov/records` | Administrative record projection | Derived view |
| `/gov/document-registry` | Document registry and controls | Partial; route-level/backend capability mismatch |
| `/gov/reports` | Incoming report view | Implemented read view |
| `/gov/reports-archive` | Closed/rejected records | Partial; terminal-state vocabulary drift |
| `/gov/design-requests` | Design-phase project projection | Derived view |
| `/gov/analysis` | Analysis projection | Derived view |
| `/gov/surveys` | Work/project survey projection | Derived view |
| `/gov/boq` | BoQ projection | Derived view |
| `/gov/estimation` | Cost projection | Derived view |
| `/gov/users` | Government accounts and roles | Partial; status endpoint broken |
| `/gov/residents` | Resident account administration | Partial; status endpoint broken |
| `/gov/settings` | System settings | Static placeholder |
| `/gov/analytics` | Clusters, forecast, recurrence, AI, exports | Implemented with authorization/PII concerns |
| `/gov/predictive` | Asset health and planned maintenance | Partial; frontend/backend roles disagree and outputs include mock/random data |
| `/gov/agent-app` | Field-agent app distribution | Partial artifact/link experience |
| `/gov/advisories` | Government advisory operations | Implemented |

## 5. Whole government operations cycle

```text
Resident report enters scoped queue
→ dispatcher reviews evidence, jurisdiction, related incidents, and AI suggestion
→ verify / reject / request information / link duplicate / refer outside scope
→ technical and budget approval when required
→ choose simple work order, OBO inspection, or infrastructure project branch
→ assign eligible active staff/team
→ field/design/procurement work with evidence and approvals
→ proof/FQA/inspection validates completion
→ report becomes resident-visible resolved
→ resident confirms or requests governed follow-up
→ records, audit, retention, analytics, and asset history persist
```

### Current entity state models

#### Reports

```text
pending → pending_approval → approved_internal → dispatched → resolved → closed_by_citizen
        ↘ rejected                         ↘ cancelled before operational lock
```

Only dispatch and direct proof-based resolve have meaningful precondition checks. The generic route permits arbitrary strings.

#### Work orders

```text
open → assigned → in_progress → completed
  ↘ cancelled
  ↘ promoted to ProjectRequest (current code cancels original WO)
```

The assigned-agent endpoint enforces a subset of adjacency; generic work-order update/status routes do not.

#### Infrastructure projects

```text
request_received
→ survey_in_progress
→ survey_complete
→ design_in_progress
→ boq_submitted
→ pending_budget_check
→ budget_confirmed
→ approved_by_city_engineer
→ dispatched
→ in_progress
→ milestone_inspections
→ resolved
→ closed_completion_certified
```

Smart document, sign-off, NTP, and FQA gates exist in one advance path, but direct project patch and competing certificate routes can bypass or break the contract.

#### Procurement

```text
draft → submitted → validated → sent_to_procurement → procured
                                  ↘ rejected

Parallel gates: funding certification/ObR → cash release → BAC schedule → NTP
```

Target labels and some roles are checked; current-to-target adjacency and several prerequisites are not consistently enforced.

#### OBO

```text
application_received
→ inspection_scheduled
→ inspection_complete
→ permit_issued or notice_issued
→ re_inspection_scheduled
→ cleared
```

Five technical reviews, payment, appeal, and executive clearance are modeled, but the general update path can skip the declared order.

## 6. Government user-story catalog

Acceptance criteria are addressed by story plus their displayed order: for example, the first criterion under `GOV-US-004` is `GOV-US-004-AC01`. Preserve these identifiers when criteria move into tickets or test management.

| ID | Epic | Outcome | Priority | Current state |
|---|---|---|---:|---|
| GOV-US-001 | Access | Active staff receive current capability/jurisdiction only | P0 | Fragmented/risky |
| GOV-US-002 | My Work | Each role sees actionable owned/review queues | P1 | Partial |
| GOV-US-003 | Triage | Verify, reject, duplicate, refer, or request information with evidence | P0 | Partial |
| GOV-US-004 | Approval/dispatch | Budget, approve, and assign through valid gates | P0 | Partial/broken |
| GOV-US-005 | Work orders | Execute one controlled assignment lifecycle | P0 | Partial/risky |
| GOV-US-006 | Field operations | Update only assigned work with location/evidence controls | P0 | Partial/broken |
| GOV-US-007 | Projects | Advance one sequential evidence-gated lifecycle | P0 | Partial/broken |
| GOV-US-008 | Procurement | Complete BoQ-to-NTP financial handshake | P0 | Partial/risky |
| GOV-US-009 | OBO | Complete inspection/review/payment/appeal safely | P0 | Partial/risky |
| GOV-US-010 | Documents | Protect records, retention, legal hold, and physical files | P0 | Critical risk |
| GOV-US-011 | Audit | Preserve immutable attributable process truth | P0 | Gap/contradiction |
| GOV-US-012 | Advisories | Draft, approve, publish, update, and retire public guidance | P1 | Partial |
| GOV-US-013 | Analytics | Explore privacy-scoped, traceable operational evidence | P1 | Partial/risky |
| GOV-US-014 | Predictive | Turn deterministic asset evidence into human-approved work | P1 | Prototype/partial |
| GOV-US-015 | People/RBAC | Govern accounts, roles, sessions, and delegations safely | P0 | Partial/broken |
| GOV-US-016 | Records/exports | Find and export governed source records without false empty states | P1 | Partial |
| GOV-US-017 | Inclusive operations | Complete critical staff tasks responsively and accessibly | P0 | Partial |

### GOV-US-001 — Secure active government access

**As an** authorized official, **I want** access derived from current account, capability, jurisdiction, and assignment **so that** stale or edited client state cannot expose government data.

Acceptance criteria:

- Missing, malformed, expired, revoked, inactive, or suspended credentials fail every protected route.
- The client refreshes identity/capabilities from `/api/me`; local-storage edits cannot grant access.
- Route, navigation, page action, field visibility, API, and query scope agree for every role/capability.
- Temporary delegation and emergency override have explicit scope, reason, expiry, banner, audit, and review.
- Resident tokens are negative-tested against every government endpoint.

### GOV-US-002 — Work from an actionable role queue

**As a** staff member, **I want** a prioritized list of work I own or must review **so that** I act without navigating the organization chart.

Acceptance criteria:

- Each item states object ID, task, reason in queue, priority, owner, scope, freshness, state, and permitted action.
- Counts reconcile with the same filtered source records; field-name or pagination drift cannot show false zeroes.
- Deep link, refresh, back, and role change preserve or safely reset scope/filter/selection.
- Loading, filtered empty, true empty, stale, partial, denied, and failed states are distinct.
- No quick action is shown unless the API confirms current permission and transition eligibility.

### GOV-US-003 — Triage a resident report

**As a** dispatcher, **I want** to inspect and classify a report with accountable decisions **so that** the correct branch receives valid work.

Acceptance criteria:

- Queue/detail show resident-safe identity, evidence, text location, map alternative, jurisdiction, related incidents, and labeled AI suggestion.
- Only approved source→target transitions are accepted; reject/outside-scope/duplicate/request-info require structured reasons.
- Duplicate links preserve resident evidence and canonical ticket; no report is silently erased.
- Accepted mutation atomically creates accurate timeline, immutable audit, notification/outbox, and next owner.
- Two staff racing receive one accepted decision and one `409` with latest version.

### GOV-US-004 — Approve budget and dispatch eligible work

**As an** authorized approver or dispatcher, **I want** to review cost, schedule, evidence, and assignee eligibility **so that** work starts with accountable clearance.

Acceptance criteria:

- Budget is positive, within role threshold, currency-safe, and tied to a source estimate/version.
- Deployment date uses an approved timezone/business rule and cannot be invalid or silently changed.
- Eligible assignees are active officials with required capability, jurisdiction, workload, and availability.
- Confirmation names report, work branch, assignee/team, priority, schedule, resident notification, and next owner.
- Failure preserves selection and explains whether any side effect committed.

### GOV-US-005 — Control the work-order lifecycle

**As a** dispatcher and field team, **I want** one work-order record from creation through approved completion **so that** assignments, proof, and costs stay synchronized.

Acceptance criteria:

- Server enforces `open → assigned → in_progress → completed/cancelled` and explicitly approved reassign/block branches.
- Only authorized dispatchers create/assign; only assigned/delegated field staff update execution; approvers cannot approve their own restricted action where segregation is required.
- Completion requires validated proof and cannot resolve a linked resident report through an alternate proofless path.
- Update, approval, timeline, audit, notification, asset history, and report synchronization are transactional/idempotent.
- `previous_status`, actor, actor type, timestamp, reason, evidence, and version are accurate.

### GOV-US-006 — Perform assigned field work safely

**As an** assigned field worker, **I want** my route, work details, status, blocker, and evidence controls on a field device **so that** operations receive reliable updates.

Acceptance criteria:

- Only an assigned active official can see/update the work item; numeric ID collision cannot grant a resident access.
- Location capture is opt-in for an approved duty window, rate-limited, accuracy-labeled, retained by policy, and never writable by a non-field role.
- Offline updates use client operation IDs, queue visibly, reconcile versions, and do not duplicate transitions/evidence.
- Field report uses valid model fields, safe filenames, upload checks, and links to the correct work/report/project.
- Emergency/safety blocker has an escalation path without falsely marking progress.

### GOV-US-007 — Advance a governed infrastructure project

**As a** project team, **I want** a sequential, role-signed project lifecycle **so that** no statutory, technical, budget, NTP, or FQA gate is bypassed.

Acceptance criteria:

- Target state must be the exact allowed next state, with approved exception policy.
- Required documents and sign-offs are checked before mutation and returned as structured missing prerequisites.
- Direct metadata update cannot set status/current phase outside the transition service.
- One canonical FQA/certificate route is idempotent and performs validation before committing status/certificate/asset.
- Project, source report, work orders, procurement, documents, timeline, audit, notifications, and new asset reconcile in one governed transaction/outbox flow.

### GOV-US-008 — Complete procurement and BoQ compliance

**As an** estimator, finance officer, BAC staff member, and approving executive, **I want** a controlled draft-to-NTP handshake **so that** funds and mobilization cannot be skipped or misattributed.

Acceptance criteria:

- Only adjacent states are allowed; skips, regressions, repeats, and invalid labels return structured conflict.
- BoQ items require positive quantity/cost, approved units/precision, server total, and parent ownership; deletion verifies the item belongs to the path PR.
- Funding requires authorized certification and valid unique ObR; cash release requires funding; BAC requires validated prerequisites; NTP requires all approved gates.
- `ntp_issued=false` cannot advance a project.
- Monetary actions capture before/after, actor, authority threshold, source document, timestamp, and immutable audit.

### GOV-US-009 — Complete OBO inspection and permitting

**As an** inspector or authorized OBO approver, **I want** inspections, technical reviews, payment, notice, appeal, and clearance in order **so that** permits are defensible.

Acceptance criteria:

- Inspection type, department, review result, payment state, appeal state, and lifecycle status use approved enums.
- Only assigned/authorized inspectors submit their review; five required technical reviews and payment are validated before permit/clearance.
- Failed review routes to notice/reinspection; it cannot jump to clearance.
- Appeal evidence is restricted, append-only, versioned, and decided by a different authorized actor where policy requires.
- Complaint-driven report resolution requires the same proof/public-closeout contract as other branches.

### GOV-US-010 — Govern documents and legal hold

**As a** records officer, **I want** every document protected by classification, retention, target authorization, and legal hold **so that** working files and official records remain trustworthy.

Acceptance criteria:

- Upload, target list, counts, metadata, download, legal hold, and delete enforce module plus target-level access.
- Physical files are outside public static paths and are delivered through authorized, logged access.
- Validation includes magic bytes, allowlist, size before full buffering, malware/archive safety, filename normalization, and duplicate hash policy.
- Legal hold uses real role/capability slugs, is audited, and immediately blocks retention/destruction actions.
- Deletion is retention-aware tombstoning/approved disposition; it cannot erase audit history or be performed by any bearer.

### GOV-US-011 — Preserve immutable audit and public/internal timelines

**As an** auditor or case owner, **I want** an accurate event ledger **so that** every decision and handoff can be reconstructed.

Acceptance criteria:

- A versioned audit endpoint exists with pagination and entity, actor, action, date, jurisdiction, and correlation filters.
- Business operations cannot update/delete audit rows; retention and legal hold follow signed policy.
- Timeline `previous_status` is captured before mutation and public visibility is explicit.
- Hard deletion never removes the evidence needed to explain a decision; tombstones preserve referential history.
- Export counts, source records, timeline, and audit reconcile under concurrent activity.

### GOV-US-012 — Publish governed advisories

**As an** authorized communications/operations official, **I want** to draft, review, publish, update, and retire advisories **so that** residents receive accurate actionable guidance.

Acceptance criteria:

- AI generates a labeled draft only; a named authorized human approves publication.
- Advisory contains severity, area, effective/expiry times, issuing office, source incident, action, and update history.
- Create/update/delete/archive roles are explicit and all changes audited.
- Expired/retracted advice is not presented as current; corrections preserve prior versions.
- Resident English/Filipino content and accessibility are reviewed before publish when required.

### GOV-US-013 — Use traceable, privacy-scoped analytics

**As an** authorized planner, **I want** clusters, recurrence, forecasts, and source drill-through **so that** I can prioritize without unnecessary resident exposure.

Acceptance criteria:

- Capability and jurisdiction—not a broad hard-coded whitelist—govern view, PII, export, and conversion.
- Reporter identity and exact coordinates are masked unless a separately logged permission is necessary.
- Every metric states definition, period, scope, freshness, exclusions, model/data version, and accessible source table.
- AI narrative/BoQ remains a draft; conversion checks procurement permission separately.
- CSV protects against formula injection and follows PII/export policy.

### GOV-US-014 — Plan deterministic predictive maintenance

**As an** authorized engineer, **I want** reproducible asset-health evidence and human-approved plans **so that** prototype/random output never drives civic work.

Acceptance criteria:

- Identical approved data/model versions produce identical results; demo/random fields are excluded from production or visibly labeled.
- Asset, maintenance, environment, algorithm version, assumptions, confidence, and freshness are inspectable.
- AI failure yields a degraded evidence view, never fabricated completion.
- Work-order conversion invokes the canonical creation service and produces audit/timeline/outbox side effects.
- Model monitoring covers drift, false positives/negatives, override reasons, equity, and rollback.

### GOV-US-015 — Govern users, roles, and sessions

**As a** system administrator, **I want** distinct account-status and role workflows **so that** access changes are safe, attributable, and immediate.

Acceptance criteria:

- Status and role endpoints have separate handlers/schemas and executable contracts.
- Unknown roles, privilege escalation, self-suspension, and last-admin removal are blocked.
- Normalized role ID, denormalized label, capability JSON, jurisdiction, and active session authorization remain consistent.
- Suspension/deactivation revokes current sessions and prevents all protected access.
- Changes show before/after, reason, effective time, actor, impacted access, confirmation, and immutable audit.

### GOV-US-016 — Find and export governed records

**As a** records/operations user, **I want** departmental queues and archives tied to canonical records **so that** a failed fetch never appears as “no records.”

Acceptance criteria:

- Derived design/survey/BoQ/estimate/records/archive views declare their source entities and filters.
- Pagination, search, filters, status vocabulary, counts, and URLs share one contract.
- Closed resident-confirmed cases remain discoverable under the canonical terminal state.
- API error, permission-limited data, partial data, true empty, filtered empty, and stale cache are distinct.
- Export is permissioned, asynchronous when large, checks injection/privacy, and logs purpose/actor/scope.

### GOV-US-017 — Operate accessibly and responsively

**As a** staff member on any supported workstation or field device, **I want** a clear role-aware workspace **so that** density, theme, device, or assistive technology does not cause operational mistakes.

Acceptance criteria:

- Critical triage, assignment, field update, approval, records, and administration tasks pass WCAG 2.2 AA and keyboard/screen-reader testing.
- Queue/detail preserves scope and selection across 1280×720, 200% zoom, and narrow field layouts.
- Tables, charts, and maps provide semantic table/list summaries and non-color status meaning.
- Light/dark themes preserve evidence, boundaries, alerts, focus, and chart/map equivalence.
- Destructive/monetary/permission decisions have explicit confirmation, consequence, reason, and focus-safe recovery.

## 7. Government endpoint contract

All paths below are observed current routes unless labeled gap/broken. Common bearer failure is `401`; authorization is usually `403`; validation is usually `422`; missing records are usually `404`. Current creates return `200`, not `201`, and deletes do not consistently use `204`.

### Command center, work orders, and timelines

| Method/path | Current access | Purpose | QA classification |
|---|---|---|---|
| `GET /api/gov/dashboard/stats` | **Public** | Government KPI summary | **P0/P1 exposure: missing auth** |
| `GET /api/reports/stats` | Dispatcher/manager-expanded | Report counts | Risk: sparse response may fail required schema |
| `GET /api/reports` | Dispatcher/manager-expanded | All report queue | Implemented |
| `PATCH /api/reports/{id}/status` | Dispatcher/manager-expanded | Generic status/budget/date | Risk: arbitrary transition/string |
| `PATCH /api/reports/{id}/reject` | Dispatcher/manager-expanded | Reject report | Implemented; reason contract absent |
| `PATCH /api/reports/{id}/dispatch` | Dispatcher/manager-expanded | Approved→dispatched | Implemented precondition |
| `PATCH /api/reports/{id}/resolve` | Dispatcher/manager-expanded | Required proof→resolved | Implemented; upload hardening absent |
| `DELETE /api/reports/{id}` | Dispatcher/manager-expanded | Hard purge report graph | **P0 audit/retention contradiction** |
| `GET /api/gov/reports` | Gov static roles | Active report projection | Implemented |
| `GET /api/gov/reports-archive` | Senior roles | Terminal report projection | Status vocabulary drift |
| `POST /api/gov/reports/{id}/approve-with-budget` | Dispatcher/manager/admin | Create/approve project budget | **Broken model relationship** |
| `GET /api/gov/reports/{id}/project-mapping` | Gov roles | Resolve report→WO/project | Duplicate route registration; one implementation broken |
| `POST /api/gov/work-orders` | Field roles | Create canonical gov WO | Implemented/risky auto-dispatch |
| `GET /api/gov/work-orders` | Gov roles | Filter/list WOs | Implemented |
| `GET /api/gov/work-orders/{wo_id}` | Gov roles | WO detail | Implemented |
| `PATCH /api/gov/work-orders/{wo_id}` | Field roles | General update | Risk: arbitrary status |
| `POST /api/gov/work-orders/{wo_id}/updates` | Field roles | Append field update | **Broken ORM/schema fields** |
| `PATCH /api/gov/work-orders/{wo_id}/status` | Field roles | Status update | Risk: no general adjacency |
| `POST /api/gov/work-orders/{wo_id}/approval` | Approval role set | Approve/reject WO | Partial; previous-state defect |
| `GET /api/gov/work-orders/{wo_id}/approvals` | Any bearer | List approvals | Under-authorized |
| `POST /api/gov/work-orders/{wo_id}/promote` | Senior operations | Convert WO→project | Implemented; cancellation semantics decision |
| `GET /api/gov/dispatch/suggest-agent/{report_id}` | Any bearer | Rank available agents | Under-authorized |
| `GET /api/gov/timeline` | Gov roles | Global process timeline | Implemented |
| `GET /api/gov/timeline/report/{id}` | Bearer/owner handling | Report timeline | Implemented |
| `GET /api/gov/timeline/work-order/{id}` | Gov roles | WO timeline | Implemented |
| `GET /api/gov/timeline/project/{id}` | Gov roles | Project timeline | Implemented |
| `GET /api/gov/audit-logs` | — | Frontend audit list | **UI-contract gap** |
| `GET /api/gov/audit` | — | Management audit list | **UI-contract gap** |
| `GET` and `POST /api/work-orders` | Legacy role groups | Legacy WO list/create used by dispatcher | Duplicate legacy surface; consolidation required |

### Projects, procurement, and OBO

| Domain | Current endpoints | Contract assessment |
|---|---|---|
| Projects | `POST` and `GET /api/gov/projects`; `GET` and `PATCH /api/gov/projects/{id}`; `PATCH /advance`; `POST /certificate`; `POST /projects/{id}/issue-certificate` | Multiple mutation/completion paths; direct patch bypass and advance/certificate defects |
| Procurement | `POST` and `GET /api/gov/procurement`; `GET /{id}`; PATCH `status`, `funding-certification`, `cash-release`, `bac-schedule`, `ntp-issuance`; POST/DELETE `items` | Implemented but adjacency, financial prerequisite, child ownership, and false-NTP advancement gaps |
| OBO | `POST` and `GET /api/gov/obo`; `GET` and `PATCH /{id}`; PATCH `technical-review`, `appeal`, `order-of-payment` | Implemented but sequence, enums, resource access, and required review/payment gates incomplete |
| Project certificate UI | `POST /api/projects/{id}/issue-certificate` | **UI-contract gap: missing `/api/gov` prefix** |

### Departmental projections, field agents, people, and advisories

| Domain | Current endpoints | Contract assessment |
|---|---|---|
| Derived queues | GET `/api/gov/design-requests`, `/analysis`, `/surveys`, `/boq`, `/estimation`, `/records`, `/reports`, `/reports-archive`, `/document-registry` | Read projections; document-registry projection uses nonexistent fields |
| Agent location/work | GET `/agents/locations`, `/agents/{id}/location`, `/agents/work-orders`, `/agents/my-work-orders`; POST `/agents/location`, `/agents/field-report`; PATCH `/agents/work-orders/{id}/status` | Location and self-work routes are under-authorized; field report broken; numeric-ID collision risk |
| Users | GET `/api/gov/users/stats`, `/api/gov/users`; PATCH `/users/{id}/status`, `/role` | Status path is decorated onto role handler; pagination/client drift; role target validation absent |
| Roles | GET `/api/gov/roles`, `/roles/templates`; POST `/roles`; PUT `/roles/{id}` | Dynamic `admin:roles`; must become canonical authority |
| Advisories | POST/GET `/api/gov/advisories`; DELETE `/api/gov/advisories/{id}`; legacy advisory create/read/delete/generate routes | Two surfaces; version/publish workflow required |

### Documents, analytics, predictive, and PhilSys

| Domain | Current endpoints | Contract assessment |
|---|---|---|
| Documents | POST `/api/gov/documents/upload`; GET `/get/{id}`, `/target/{model}/{id}`, `/registry`, `/registry/counts`; PATCH `/{id}/legal-hold`; DELETE `/{id}` | Any bearer can upload/delete in important paths; target metadata/count leakage; public static bypass; role-case bug |
| Analytics | GET `summary`, `clusters`, `clusters/{id}`, `heatmap`, `forecast`, `recurrence`, `reports`; POST `narrative`, `estimate`, `create-procurement`; GET four CSV exports under `/api/gov/analytics` | Static allowlist, PII/export concerns; requested permission argument ignored for procurement conversion |
| Predictive | GET `summary`, `health`, `schedule`, `risk-map`, `export`; POST `ai-plan`, `convert-to-work-order` under `/api/gov/predictive` | Narrow static role list; random/mock values; conversion bypasses canonical WO side effects |
| PhilSys | GET `/api/philsys/status`; POST `/verify`, `/verify-manual`, `/verify-qr`, `/scan-qr-image` | **All public**; sensitive/costly verification lacks auth, rate limit, upload controls, and durable access audit |

The [integrated lifecycle/API contract](./14-end-to-end-system-lifecycle-and-api-contract.md) contains the unique whole-system inventory and cross-domain lineage.

## 8. Government QA strategy

### Authorization test matrix

For every endpoint and UI action, execute:

```text
role/capability
× active/suspended/revoked session
× department/jurisdiction
× own/assigned/other record
× source state/target state
× monetary/emergency threshold
× PII/document classification
× read/create/update/approve/export/delete
```

The expected server outcome must be asserted independently of whether the frontend hides the action.

### Test layers

| Layer | Government focus | Evidence |
|---|---|---|
| State/unit | enums, adjacency, evidence gates, monetary rules, actor separation | transition-table suite |
| API contract | every method/path/schema/error/pagination/version; consumer parity | OpenAPI snapshot + contract suite |
| Data/transaction | timeline/audit/outbox, linked entity sync, locks/version conflicts | isolated DB concurrency tests |
| Security | role/resource/field scope, PII, exports, documents, uploads, token revocation | authorization matrix + threat tests |
| Frontend | queue/detail/action states, role navigation, focus, responsive density | component and accessibility fixtures |
| E2E | incident→triage→WO/project/OBO→proof→resident closeout | browser/field-device + API/DB assertions |
| Provider/model | Maps, AI, storage, mail/SMS, analytics/predictive degraded mode | deterministic stubs/sandboxes |
| Records/compliance | classification, retention, legal hold, tombstone, audit export | records-owner acceptance |
| Performance/resilience | queue/map scale, concurrent dispatch, export volume, offline field sync | load/soak/failover evidence |
| UAT | representative role and segregation-of-duty scenarios | signed operational scenarios |

### Mandatory failure and adversarial suite

- Every endpoint with no token, invalid/expired/revoked token, suspended/inactive user, resident token, and every government role.
- Cross-jurisdiction report, another agent’s work, restricted/confidential document, other user’s notification, and unauthorized exact location/PII.
- State skips, regressions, replay, duplicate approvals, stale versions, and two approvers/dispatchers racing.
- Missing/deleted report, project, WO, PR, BoQ item, agent, asset, document, and broken relationship behavior.
- Negative/zero/overflow/precision monetary fields; invalid dates/timezones; invalid coordinates and pagination.
- Empty, oversized, MIME-spoofed, polyglot, malware, traversal, symlink, and archive-bomb uploads.
- Audit/outbox/timeline failure after mutation; verify complete rollback or reliable recovery.
- CSV formula injection, overbroad exports, reporter PII, exact-coordinate leakage, and count side channels.
- AI/provider timeout/quota/malformed output; deterministic analytics/predictive replay; demo data labeling.
- 1280×720, 200% zoom, narrow field device, keyboard, screen reader, light/dark, loading, empty, partial, stale, denied, and offline states.

## 9. Government SDLC

| Phase | Required activities | Controlled outputs | Exit gate |
|---|---|---|---|
| 0. Governance | Name process owners per report/WO/project/procurement/OBO/records/RBAC/model; approve segregation and data classes | RACI, policy register, threat model, decision log | Every P0 decision has accountable LGU owner/date |
| 1. Operational discovery | Observe each role, handoff, artifact, exception, queue, support/incident history | service blueprints, job maps, baseline cycle measures | Actual operating process validated by role representatives |
| 2. Requirements | Approve stories, lifecycle/adjacency, capabilities, jurisdiction, evidence, monetary/records/model NFRs | baselined backlog, RTM, role/action/data matrix | Product, operations, records, finance, security agree |
| 3. Experience/design | Prototype My Work, queue/detail, decisions, field/offline, responsive/light/dark/error/denied states | Figma specs, content/state matrices, usability report | Critical scenarios pass role usability/accessibility review |
| 4. Architecture/API/data | Global subject, API v1, errors, pagination, idempotency/versioning, state services, outbox, storage, migration | OpenAPI, ERD, ADRs, migration/rollback, model cards | Backend/security/data/consumer approval |
| 5. Test design | Build transition, RBAC, data, adversarial, performance, accessibility and UAT suites | test plan, fixtures, environment and traceability matrix | Every P0/P1 acceptance has executable/manual evidence plan |
| 6. Implementation | Future vertical slices behind flags; shared core first; no parallel lifecycle mutations | reviewed changes, tests, telemetry | Changed-scope gates pass and contract drift is approved |
| 7. Integration/system QA | Exercise all branches, side effects, providers, concurrency, security and migration | release candidate, defect/evidence pack | Zero P0/P1; approved P2 dispositions |
| 8. UAT/readiness | Role-based UAT, field simulation, finance/records review, runbooks/training, rollback rehearsal | signed UAT, SOPs, support/on-call materials | Named service owners sign go/no-go |
| 9. Release | Staged capability/department cohorts, flags, backups, smoke and monitoring | deployment/audit record | SLO/guardrails stable during observation |
| 10. Operate | Queue/state dwell, unauthorized attempts, audit gaps, model drift, incidents, retrospectives | service review and prioritized improvement backlog | Periodic governance review |
| 11. Retirement | Records disposition, export, legal hold, user/session/key cleanup, notice | retirement and evidence plan | Records/security/legal approval |

### Government delivery accountability

| Owner | Accountable for |
|---|---|
| Government product/service owner | cross-division outcomes, backlog, lifecycle decisions, go/no-go |
| Process owners | report, WO, project, procurement, OBO, advisory, identity, and model operating truth |
| Finance/procurement/BAC | monetary thresholds, ObR, cash, BAC, NTP, segregation, financial UAT |
| Records/legal/privacy/security | classification, access, retention, legal hold, audit, privacy, threat decisions |
| Design/content/research | role workflows, Figma states, terminology, usability evidence |
| Frontend/mobile | role-aware, contract-compliant, accessible and resilient clients |
| Backend/data/model/platform | authorization, state services, transactions, APIs, migrations, model provenance |
| QA lead | RTM, independent risk/evidence, defect disposition, release recommendation |
| Accessibility/localization | staff accessibility and any approved government language scope |
| Operations/on-call | environments, deployment, monitoring, rollback, incidents and service reviews |

## 10. Environments, data, and observability

### Environment requirements

- Disposable local/component fixtures with deterministic clocks and model/provider stubs.
- Isolated API integration database, storage, and migration-from-zero plus rollback testing.
- QA with synthetic officials/residents across every capability, jurisdiction, status, and evidence gate.
- Staging/UAT with release-like RBAC, provider sandboxes, field devices, representative data volume, and no uncontrolled production PII.
- Production staged by capability/department, not merely by UI route.

### Minimum observability contract

Every mutation must emit a correlation ID and structured event containing safe subject type, actor, capability decision, entity/version, source/target state, result, duration, and outbox status. Never log passwords, tokens, OTPs, raw IDs, unrestricted narratives, full coordinates, or document contents.

Dashboards/alerts must cover:

- auth/authorization denial and suspicious access;
- queue and lifecycle dwell by priority/jurisdiction;
- illegal/conflicting transition attempts;
- audit/timeline/outbox reconciliation;
- document/PII/export access and deletion/legal-hold attempts;
- provider/model error, latency, quota, drift, and fallback;
- field sync conflicts and duplicate operation IDs;
- resident notification delay and closeout disagreement.

## 11. Definition of Ready

A government implementation item is ready only when it has:

- story, actor/capability, jurisdiction, source entity/version/state, and outcome;
- approved transition, evidence, approval/segregation, notification, audit, retention, and failure behavior;
- backend-authoritative allow/deny matrix and PII/field/export scope;
- endpoint/schema/error/idempotency/concurrency/pagination contract;
- queue/detail/loading/empty/partial/stale/denied/offline/responsive/accessibility/theme states;
- linked Figma component/version, automated/manual tests, telemetry, flag, migration, and rollback;
- no unresolved P0 policy, architecture, records, finance, or security dependency.

## 12. Definition of Done and release gates

- Every acceptance criterion has traceable passing evidence.
- All role/resource/state/field combinations fail closed on the backend.
- Mutations and linked side effects are atomic, idempotent, version-safe, and auditable.
- Audit/timeline/records cannot be erased through normal business deletion.
- Evidence/documents/PII/location/exports follow target-level authorization and retention.
- Critical workflows pass representative role UAT, segregation-of-duty review, accessibility, light/dark, responsive, low-network, and recovery tests.
- Migration from a clean database and prior supported version succeeds; rollback is rehearsed.
- Product/operations, QA, backend, frontend/mobile, security/privacy, records/legal, finance where relevant, accessibility, and on-call owners sign off.

### Automatic no-go conditions

- Any resident or unauthorized staff access to government data/action.
- Suspended/revoked session remains usable.
- Any arbitrary/skipped lifecycle, proofless completion, incorrect monetary/NTP action, or duplicate approval side effect.
- Any unaudited destructive/permission/financial action or deletion of immutable history.
- Public/bypass access to restricted identity, evidence, documents, exact locations, or exports.
- Broken status, assignment, field update, project/FQA, procurement, OBO, user-status, or audit endpoint used by the release.
- Random/mock prediction represented as operational truth.
- Critical workflow inaccessible or unusable at required staff/field viewport.

## 13. Current release-blocking defect register

| ID | Severity | Defect | Required proof of closure |
|---|---:|---|---|
| GOV-BLK-001 | P0 | `/users/{id}/status` is wired to role update; status handler unreachable | Separate contract tests and session revocation E2E |
| GOV-BLK-002 | P0 | Hard report deletion removes audit/timeline despite append-only claim | Retention/tombstone design and immutable ledger test |
| GOV-BLK-003 | P0 | Any bearer can delete any non-held document | Full target-level RBAC matrix and negative tests |
| GOV-BLK-004 | P0 | Public `/api/uploads` bypasses protected document/evidence download | Direct URL denial and signed/authorized retrieval test |
| GOV-BLK-005 | P0 | Status mutation paths accept illegal strings/transitions | Central enum/adjacency tests across every entity |
| GOV-BLK-006 | P0 | WO/OBO completion can resolve resident report without canonical proof gate | Cross-branch completion contract test |
| GOV-BLK-007 | P1 | Audit UIs call two nonexistent backend paths | Versioned audit route and queue/error E2E |
| GOV-BLK-008 | P1 | FQA UI prefix and backend parameter mismatch; competing completion paths | One canonical FQA route and idempotent transaction test |
| GOV-BLK-009 | P1 | Work-order update and agent field-report model fields are invalid | API/schema/persistence tests |
| GOV-BLK-010 | P1 | Existing suspended official tokens remain usable | Revocation/active check tests on all protected routes |
| GOV-BLK-011 | P1 | Dashboard stats and all PhilSys routes lack required auth | Anonymous/resident/role negative suite |
| GOV-BLK-012 | P1 | Legal-hold role strings never match actual role slugs | Capability-based legal-hold E2E |
| GOV-BLK-013 | P1 | Analytics exposes broader PII/action scope than frontend implies | Field/export authorization and masking tests |
| GOV-BLK-014 | P1 | Predictive outputs include random/mock operational values | Determinism/model-version and demo-label evidence |
| GOV-BLK-015 | P1 | Alembic baseline does not reproduce runtime resident/official schema | Clean migration, upgrade, data validation, rollback evidence |

## 14. Defect severity and operating targets

| Severity | Government impact | Example | Release rule |
|---|---|---|---|
| P0 | Security/privacy breach, financial/records corruption, unsafe or unauthorized civic action | BOLA, proofless close, skipped NTP, erased audit | Stop release/operation path |
| P1 | Critical role task blocked or materially wrong without safe workaround | broken assignment/FQA/status/audit | Must fix before release |
| P2 | Significant degradation with governed workaround | filter/pagination/KPI mismatch | Owner/date and operational workaround required |
| P3 | Minor copy/visual defect without task/compliance impact | isolated alignment | May defer through triage |

Initial target measures for owner approval:

- 100% critical dispatch and access-control UAT success;
- at least 90% routine staff task completion in moderated tests;
- zero unowned P0/P1 queues or illegal transition acceptance;
- one immutable event/outbox set per accepted mutation;
- queue/API/map/export performance budgets by representative data volume;
- audit-to-source and export-to-source reconciliation of 100% for sampled release scenarios.

## 15. Traceability template

```text
Story / acceptance ID:
Role, capability, jurisdiction, assignment:
Entity, version, source state → target state:
Evidence, approvals and segregation:
Current route/source evidence:
Target Figma frame/component/version:
API schema/error/idempotency/concurrency contract:
PII/document/export/retention classification:
Audit/timeline/outbox/notification effects:
Automated and manual test evidence:
Accessibility/responsive/light-dark behavior:
SLO/telemetry/alert:
Feature flag, migration and rollback:
Owners/reviewers/decision record:
```

## 16. Required decisions before government implementation

1. Approve one capability/jurisdiction/field-visibility matrix and remove static-list drift.
2. Approve canonical report, WO, project, procurement, and OBO state machines and exception owners.
3. Choose one work-order surface, one project advance service, one FQA/certificate endpoint, and one advisory API.
4. Approve global identity/actor IDs and migrations for resident/official references.
5. Approve records classifications, retention, legal hold, disposition/tombstone, physical storage, and download controls.
6. Approve finance/BAC/ObR/NTP validation and segregation-of-duty rules.
7. Approve analytics PII/export scopes and predictive model governance/determinism policy.
8. Approve field location/offline sync, assignment, device, and evidence policy.
9. Approve API v1, structured errors, pagination, idempotency/version conflicts, and transactional outbox.
10. Name operational UAT and production owners for every capability class.

Related documents: [government experience specification](./05-government-experience-spec.md), [implementation plan](./06-implementation-plan.md), [traceability matrix](./08-traceability-matrix.md), and [integrated lifecycle/API contract](./14-end-to-end-system-lifecycle-and-api-contract.md).
