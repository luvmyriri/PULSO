# PULSO system process and backend scan

| Field | Value |
|---|---|
| Document type | Static repository scan, system understanding, and backend onboarding reference |
| Status | Current implementation observed; risks identified; future decisions proposed |
| Version | 1.0 |
| Last reviewed | 24 August 2026 |
| Scope | Resident/open services, government operations, API surface, domain processes, persistence, permissions, side effects, integrations, and operational risks |
| Validation level | Static source inspection only; no integrated database-backed workflow was executed in this pass |
| Implementation impact | Documentation only; no frontend, backend, database, mobile, or Figma implementation changed |

## 1. Purpose

This document records our current technical understanding of PULSO as a **City Engineering Department Management System** and an **open resident service**. Its focus is the operating process behind the interfaces: which backend modules participate, which records are created, who may act, how a case changes state, what secondary effects occur, and where the present implementation does not yet provide one authoritative contract.

This is the readable backend companion to the exhaustive [end-to-end lifecycle and API contract](./ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md). That contract contains the complete route inventory and target release framework. This scan concentrates on the mental model a backend, frontend, mobile, QA, product, security, or operations team needs before changing the system.

### Status language used here

| Label | Meaning |
|---|---|
| **Observed** | Present in checked-in routes, functions, models, or configuration. |
| **Inferred** | Likely business purpose derived from several implementation signals; requires owner confirmation. |
| **Risk** | Current behavior can produce security, privacy, lifecycle, integrity, audit, or support problems. |
| **Proposed** | A recommended future rule or source-of-truth decision; not implemented. |

Route presence is not proof of runtime correctness. The earlier static inventory found **155 decorated operations and 154 unique method-path pairs** across the six route modules, including one duplicated project-mapping route. Several routes have deterministic schema/model or authorization defects. The checked-in backend environment was not used for a full authenticated end-to-end run, so this document must not be treated as runtime certification.

## 2. Executive understanding

PULSO is currently a **FastAPI and SQLAlchemy monolith** serving two connected experiences:

1. Residents discover the service, establish an account, submit location-and-evidence-based engineering concerns, follow progress, receive advisories, and confirm whether a resolution is acceptable.
2. Government personnel triage concerns, approve or reject them, dispatch simple work, escalate complex work into projects and procurement, conduct OBO inspections, manage field activity and records, and consume analytics or predictive recommendations.

The intended unifying object is a civic case: a resident report should remain traceable through every government action and back to a resident-visible outcome. The implementation already contains many parts of that lifecycle—reports, work orders, projects, procurement, inspections, timelines, audit logs, notifications, documents, assets, and maintenance history—but their authority is fragmented.

The most important architectural finding is therefore not a missing module. It is **overlapping authority**:

- legacy route handlers and newer domain routers coexist;
- `crud.py` and `gov_crud.py` can both mutate related operational records;
- static role lists and dynamic capability checks coexist;
- generic status patches coexist with guarded domain commands;
- runtime table creation, Alembic, SQL migrations, and one-off repair scripts coexist;
- public static uploads coexist with a protected document-management model;
- timeline, audit, notification, asset, and trust-score effects are triggered from several functions with different transaction boundaries.

Until those authorities are consolidated, a UI can appear coherent while the backend permits contradictory states or bypasses the process shown to users.

## 3. Current backend architecture

```text
Resident web / resident mobile / government web / field client
                              │
                              ▼
                    FastAPI application
                     backend/main.py
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
  legacy root routes    government routers   shared/provider services
  auth, users, reports  operations, analytics AI, maps, OCR, PhilSys,
  maps, notices, WOs    predictive, documents mail/SMS, deduplication
          │                   │                    │
          └──────────────┬────┴────────────────────┘
                         ▼
             SQLAlchemy synchronous ORM
                   PostgreSQL database
                         │
               local upload filesystem
```

### 3.1 Module responsibilities

| Layer | Current authority | Responsibility observed |
|---|---|---|
| Application bootstrap | [backend/main.py](../backend/main.py#L46) | Creates the FastAPI app, configures middleware, mounts public uploads, includes domain routers, and retains many legacy endpoints. |
| Database session | [backend/database.py](../backend/database.py#L10) | PostgreSQL engine, pooled synchronous connections, 30-second statement timeout, `SessionLocal`, declarative base, and request-scoped session dependency. |
| Shared identity/domain models | [backend/models.py](../backend/models.py#L59) | Residents, officials, roles, reports, notifications, advisories, and password-reset records. |
| Government models | [backend/gov_models.py](../backend/gov_models.py#L46) | Work orders, approvals, updates, timelines, audits, procurement, projects, OBO, field locations, assets, maintenance, environmental context, and documents. |
| Shared/legacy commands | [backend/crud.py](../backend/crud.py#L191) | Account lookup, report creation and mutation, closeout, KYC, notifications, advisories, and a legacy work-order layer. |
| Government commands | [backend/gov_crud.py](../backend/gov_crud.py#L303) | Operational work orders, dispatch, projects, procurement, OBO, timeline/audit, field operations, promotion, records, and dashboard aggregation. |
| Authentication | [backend/auth.py](../backend/auth.py#L12) | Password hashing, JWT issue/parse, and current-user resolution across resident and official tables. |
| Dynamic authorization | [backend/roles_service.py](../backend/roles_service.py#L26) | Module/action capability resolution with manager/system-administrator bypass. |
| Government API | [backend/gov_router.py](../backend/gov_router.py#L104) | Operational HTTP layer for government users. |
| Analytics API/service | [backend/analytics_router.py](../backend/analytics_router.py#L83), [analytics_service.py](../backend/analytics_service.py) | Summary, clusters, heatmaps, forecast, recurrence, narrative, estimation, procurement conversion, and exports. |
| Predictive API/service | [backend/predictive_router.py](../backend/predictive_router.py#L45), [predictive_engine.py](../backend/predictive_engine.py) | Asset risk, schedules, maps, AI plans, work-order conversion, and exports. |
| Document API | [backend/document_router.py](../backend/document_router.py#L90) | Upload, retrieve, target lookup, registry, legal hold, and deletion. |
| Residency/identity providers | [backend/philsys_router.py](../backend/philsys_router.py#L33), [philsys_service.py](../backend/philsys_service.py), [ocr_service.py](../backend/ocr_service.py) | PhilSys status, API/manual/QR verification, and OCR fallback. |
| AI and location providers | [backend/gemini_service.py](../backend/gemini_service.py), [maps_service.py](../backend/maps_service.py) | Report assistance, operational narratives/plans, geocoding, reverse geocoding, and directions. |
| Messaging | [backend/notification_service.py](../backend/notification_service.py), [sms_utils.py](../backend/sms_utils.py) | Email and SMS delivery helpers. |
| Quality/closure logic | [backend/fqa_engine.py](../backend/fqa_engine.py#L8) | Field-quality assessment and linked completion effects. |
| Duplicate detection | [backend/deduplication_service.py](../backend/deduplication_service.py) | Geographic similarity and DBSCAN/haversine grouping. |

### 3.2 Bootstrap and deployment behavior

**Observed:** application import calls `metadata.create_all()` twice in [main.py](../backend/main.py#L46), although `models.py` and `gov_models.py` use the same shared SQLAlchemy metadata. The repository also contains Alembic configuration, SQL migrations, Python migration scripts, schema repair scripts, seed scripts, and database inspection utilities.

**Risk:** there is no single evident schema authority. An environment can start with tables created from current ORM metadata while missing transformations, constraints, backfills, or historical assumptions captured only in a migration script. Reproducibility, rollback, and clean-environment verification are therefore uncertain.

**Proposed:** use one ordered migration history as the only production schema mutation authority. Application startup should check migration readiness, not create or repair schema. Seed and diagnostic commands should be explicit, idempotent, environment-safe tools.

### 3.3 File serving

**Observed:** [main.py](../backend/main.py#L61) mounts the local `uploads` directory at `/api/uploads` as static content. A separate `SystemDocument` model and document router attempt to provide registry, legal-hold, and deletion behavior.

**Risk:** direct static URLs bypass document authorization, access logging, classification, retention rules, legal hold, malware quarantine, and expiring access. Report evidence, identity images, and government documents have different privacy needs but currently share weak storage assumptions.

## 4. System boundaries and API domains

The exhaustive method/path list is maintained in [section 6 of the lifecycle and API contract](./ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md#6-current-endpoint-inventory). The following is the operational map teams should use to understand ownership.

| Domain | Representative current endpoints | Main source | Process owner implied |
|---|---|---|---|
| Platform/discovery | `GET /`, `/api/health`, `/api/system/ip`, boundary and app-download routes | `main.py` | Platform/public service |
| Registration/session/recovery | `/api/auth/register`, `/login`, `/verify-registration`, `/resend-code`, `/forgot-password`, `/reset-password`, `/api/me` | `main.py`, `auth.py`, `crud.py` | Identity/account operations |
| Residency/KYC/PhilSys | `/api/verify-residency`, `/api/residents/kyc-status`, `/upgrade-kyc`, `/api/philsys/*` | `main.py`, `philsys_router.py` | Resident verification/manual review |
| Resident reports | `/api/reports`, `/public`, `/{id}`, `/analyze`, `/timeline`, `/confirm`, `/cancel` | `main.py`, `crud.py` | Resident service and triage |
| Location | `/api/geocode/reverse`, `/search`, `/api/maps/directions` | `main.py`, `maps_service.py` | Shared location support |
| Government work | `/api/gov/work-orders*`, `/dispatch/suggest-agent/*`, `/agents/*` | `gov_router.py`, `gov_crud.py` | Dispatch and field operations |
| Projects and procurement | `/api/gov/projects*`, `/procurement*`, BoQ item routes, project mapping, promotion | `gov_router.py`, `gov_crud.py` | Engineering, finance, BAC/procurement |
| OBO | `/api/gov/obo*`, technical review, appeal, order of payment | `gov_router.py`, `gov_crud.py` | Building official/inspection process |
| Timeline/audit/records | `/api/gov/timeline*`, records/document views, document registry | `gov_router.py`, `document_router.py`, CRUD helpers | Records and accountability |
| Notifications/advisories | resident notification routes; public and government advisory routes | `main.py`, `gov_router.py`, notification helpers | Resident communications |
| Analytics | `/api/gov/analytics/*` | `analytics_router.py`, `analytics_service.py` | Planning/operations intelligence |
| Predictive maintenance | `/api/gov/predictive/*` | `predictive_router.py`, predictive services | Asset maintenance planning |
| Government administration | `/api/gov/users*`, `/roles*`, templates and departmental projections | `gov_router.py`, `roles_service.py` | System administration |
| Document management | `/api/gov/documents/*` | `document_router.py` | Records/DMS administration |

Two duplicate or competing surfaces deserve special attention:

- legacy `/api/work-orders` handlers remain in `main.py` while the richer `/api/gov/work-orders` domain exists;
- advisories exist under both `/api/advisories` and `/api/gov/advisories`, backed by different CRUD paths and authorization assumptions;
- project/report mapping is registered twice in `gov_router.py`.

The route named `/api/reports/public` currently still requires a bearer token. Names and comments must therefore not be read as access-control proof.

The future API should name one authoritative command/query surface per domain, version it, and measure all remaining consumers before retiring compatibility adapters.

## 5. Identity, authentication, and authorization

### 5.1 Current subject model

PULSO stores residents and officials in separate tables with separate integer primary-key sequences:

- [Resident](../backend/models.py#L59): contact/address, barangay/district, trust score, verification code/state, KYC level, and active flag.
- [Official](../backend/models.py#L127): account type, legacy role string, optional `SystemRole`, capabilities, jurisdiction, suspension details, and active flag.

Notifications explicitly distinguish `resident_id` from `official_id`, but other actor, owner, assignee, uploader, and route checks frequently use a bare integer.

**P0 risk:** the two numeric namespaces can collide. Login lookup is resident-first, bearer-token resolution is official-first, and different shared CRUD helpers use different orders. Email uniqueness is enforced only within each table. A duplicate cross-table email can authenticate one account and later resolve as the other, while numeric equality can identify the wrong owner or assignee. A global immutable subject ID—or an explicit `(subject_type, subject_id)` pair everywhere—is required.

### 5.2 Registration and verification process

```text
registration request
→ resident row created as unverified
→ verification code generated
→ database commit
→ verification email attempted
→ code submission marks account verified
→ login becomes available
```

**Observed behavior:** registration commits the resident before email delivery. If SMTP fails, the request can return an error even though the account already exists. The verification code uses a general pseudo-random generator. No complete expiry, attempt-limit, cooldown, and abuse-control contract was evident across the verification handlers.

**Required process decision:** registration must be replay-safe. Subject creation, verification challenge, and a durable delivery request should commit together; delivery may then retry without recreating the subject.

### 5.3 Login and session process

**Observed:** JWTs use HS256, carry email as `sub`, and default to a seven-day lifetime in [auth.py](../backend/auth.py#L14). A development signing secret is used if the environment variable is absent. Login adds resident reCAPTCHA handling, including the literal `mobile_bypass`; it checks official suspension at login and resident verification. Token resolution does not consistently enforce active/suspended state on every request. Debug login logging includes credential-processing detail.

**Risk:** suspension, deactivation, role changes, and capability changes do not reliably invalidate an already issued bearer token. Email is mutable and is not a suitable permanent global subject. A leaked long-lived token has no clear session revocation path.

**Proposed session contract:** immutable global `sub`; short-lived access token; rotated refresh session; `jti`, issuer, audience, key rotation, and revocation; active/suspended state and capability version checked on every protected request; safe rate limits and security logging.

### 5.4 Current authorization layers

There are at least three authorization languages:

1. static role lists and `require_role(...)` dependencies in route modules;
2. expanded legacy role aliases in `main.py`;
3. database-backed module/action capability checks in `roles_service.py`, with manager/system-administrator bypass.

Role seeds and migrations also use different module/action vocabularies. The frontend may hide actions by cached role/capability data, but backend policy must remain authoritative.

**Observed defect:** `roles_service` checks a nonexistent `role_details` attribute before resolving the denormalized legacy role slug, while the ORM relationship and login response use `role_ref`. A user can therefore display one capability set while a backend permission helper evaluates another. Role updates also change the denormalized role string without reliably synchronizing `role_id`.

**Proposed evaluation tuple:**

```text
subject + active session + capability + jurisdiction
+ assignment/delegation + resource classification
+ entity state/version + financial threshold
```

Every protected query and command should default deny and evaluate the relevant tuple. UI visibility is convenience, not security.

## 6. Core data model and lineage

```text
District ─ Barangay
              │
              ├─ Resident ─ Report ─ evidence/location/AI attributes
              │                ├─ Notification
              │                ├─ ProcessTimeline
              │                ├─ AuditLog
              │                ├─ WorkOrder ─ updates/approvals
              │                │       ├─ ProcurementRequest ─ BoQItem
              │                │       └─ InfrastructureAsset ─ MaintenanceHistory
              │                ├─ ProjectRequest ─ procurement/documents/work/assets
              │                └─ OBOInspection
              │
              └─ Official ─ SystemRole/capabilities/jurisdiction
                              ├─ assignments and approvals
                              ├─ AgentLocation
                              ├─ timeline/audit authorship
                              └─ document upload/access
```

### Entity responsibilities

| Entity | Business meaning | Important relationships/effects |
|---|---|---|
| `Resident` | Resident account and eligibility state | Owns reports; receives notifications; accumulates trust/KYC state. |
| `Official` | Government actor | Role/capability/jurisdiction, assignment, approval, audit/timeline authorship. |
| `SystemRole` | Database-backed permission bundle | JSON capabilities, access level, and template flag; coexists with legacy role string. |
| `Report` | Resident-originating civic case | Ticket, category, narrative, exact location, evidence, AI fields, severity, clustering, budget/deployment, status, and closeout feedback. |
| `WorkOrder` | Bounded execution job | May link report, project, or asset; has assigner/assignee, field status, cost, location, and AI plan. |
| `WorkOrderApproval` | Explicit approval/rejection evidence | Decision actor, role, notes, and timestamp. |
| `WorkOrderUpdate` | Field or operational progress update | Intended to record progress/evidence; current schema/model actor-field mismatch is a known defect. |
| `ProjectRequest` | Multi-stage capital/engineering workflow | May originate from report or promoted work order; tracks phase, funding, delivery, FQA, and certificate data. |
| `ProcurementRequest` | Purchase/funding process | May link work order/project; owns BoQ items and finance/BAC/NTP flags. |
| `OBOInspection` | Building inspection/permit/notice process | Inspection schedule/results, technical reviews, payment, appeal, and clearance. |
| `ProcessTimeline` | User-facing or operational event history | Can contain public/internal events linked to report, work order, or project. |
| `AuditLog` | Accountability history | Declared append-only, but current hard-delete behavior can remove related history. |
| `Notification` | In-app message | Separate resident/official recipient fields; read/hidden/priority metadata. |
| `SystemDocument` | Governed document metadata | Classification, retention, checksum, legal hold, uploader, and target relationship. |
| `InfrastructureAsset` | Maintained physical asset | Created/updated from completed work; connects predictive maintenance and history. |
| `MaintenanceHistory` | Asset intervention record | Should preserve the long-term consequence of a completed report/work order/project. |

The database does not currently enforce one fulfillment branch. A report can independently link to multiple work orders, multiple projects, and multiple OBO inspections because the source foreign keys are nullable and non-unique. A work order can also reference a report, project, and asset simultaneously, while procurement can reference both a work order and project. If operations intends a single primary branch, it must be represented and constrained explicitly rather than inferred from whichever child record a query finds first.

Audit and history coverage is also uneven: `AuditLog` cannot directly identify an OBO case or document, `ProcessTimeline` cannot directly identify procurement/OBO/documents, and neither enforces exactly one target. `SystemDocument` uses a polymorphic `target_model` plus `target_id` without database referential integrity. Notifications have no target entity/deep link, delivery state, operation ID, or outbox relationship.

The older [database ERD](./database_erd.md) is useful as a conceptual artifact but is **not authoritative for the current ORM schema**: it shows a unified `USER` model while the implementation currently separates residents and officials.

## 7. Whole-system operating cycle

```text
Discover service and jurisdiction
→ establish identity/residency and consent
→ register, verify, and authenticate
→ capture description, location, and evidence
→ review optional AI/geocode assistance
→ validate jurisdiction and possible duplicate
→ create report, ticket, and first timeline event
→ government triage and decision
→ select Work Order, Project/Procurement, or OBO branch
→ execute work, reviews, inspections, and evidence collection
→ validate completion/FQA
→ synchronize linked report and asset history
→ notify resident and expose public-safe timeline
→ resident confirms, rates, or requests governed follow-up
→ retain record, audit, evidence, and analytics lineage
```

This cycle is the intended product spine. The implementation performs many of these steps, but not all steps are atomic, state-guarded, idempotent, or consistently authorized.

## 8. Detailed process understanding

### 8.1 Resident eligibility, registration, and recovery

| Step | Current entry point | Main functions/services | Current durable effect | Important gap |
|---|---|---|---|---|
| Verify location/residency | `POST /api/verify-residency` | citizen/PhilSys/OCR provider helpers | Provider-derived result; KYC may be upgraded separately | Sensitive verification surface and manual-review policy need explicit auth, minimization, and audit rules. |
| Register | `POST /api/auth/register` | resident create + notification service | Unverified resident and verification code | Commit occurs before delivery; retry can conflict with existing account. |
| Activate | `POST /api/auth/verify-registration` | lookup/update resident | `is_verified` becomes true | Expiry, attempts, cooldown, and challenge lifecycle are incomplete. |
| Resend | `POST /api/auth/resend-code` | code update + mail | New challenge/delivery attempt | Abuse controls and replay semantics need one contract. |
| Sign in | `POST /api/auth/login` | password verify, reCAPTCHA, JWT issue | Stateless bearer returned | Production fallback secret, literal bypass, long lifetime, and no revocation. |
| Recover | forgot/verify/reset endpoints | password-reset records + mail | Recovery token/code then new password | One code-vs-link strategy and consumer contract must be selected. |

### 8.2 Report preparation and submission

Resident report intake combines:

- authenticated resident identity;
- category and description;
- latitude/longitude and textual location;
- uploaded image/evidence;
- optional AI classification, severity, moderation, and summary;
- possible duplicate/cluster result;
- ticket creation and first process event.

The central create function is [crud.create_report](../backend/crud.py#L191), with `_append_timeline` at [crud.py](../backend/crud.py#L13). AI, geocoding, moderation, duplicate detection, and file persistence also participate from the route layer.

**Observed risk:** initial evidence can be saved before all checks finish. Timeline/audit work is not always committed in the same transaction as the report. There is no consistent idempotency key or request hash, so timeout/retry can create duplicates or uncertain success.

The pre-submit duplicate check currently compares active reports in the same category at an approximately 15-metre coordinate threshold and returns a generic conflict; it does not return a canonical ticket or provide a “contribute evidence to this existing case” path. Post-submit DBSCAN clustering assigns transient coordinate-based labels rather than persisting a canonical report relationship. A provider failure falls back to text keyword review, which does not actually safety-check the uploaded image.

**Required atomic result:**

```text
report + attachment metadata + ticket + first timeline
+ required audit event + notification outbox
```

Provider failure must preserve the resident's draft and manual path. AI output is suggestion metadata; it must not silently replace the resident's statement or make the final civic decision.

### 8.3 Triage and branch selection

Government triage reviews the report, jurisdiction, evidence, severity, duplication, and required response. Current handlers can approve, reject, dispatch, cancel, resolve, or generically patch status.

The implementation currently suggests a report progression such as:

```text
pending → pending_approval → approved_internal → dispatched
→ resolved → closed_by_citizen

alternate outcomes: rejected / cancelled
```

**Risk:** generic status mutations accept values outside a single adjacency table. Different routes can arrive at the same status without the same evidence, actor, timeline, audit, notification, or linked-record effects.

**Proposed decision:** create one report transition service. It should validate exact source state, target state, capability, jurisdiction, current record version, required evidence/reason, and branch ownership, then commit all effects together.

The target branch choices are:

- **Work order:** localized, bounded execution by a field team.
- **Project/procurement:** multi-stage work requiring survey/design/BoQ/funding/approval/delivery/FQA.
- **OBO:** inspection and regulatory pathway with technical review, payment, notice/permit, appeal, and reinspection.
- **Information/referral/rejection/duplicate:** non-execution outcomes with clear resident explanation and next action.

### 8.4 Work-order lifecycle

The richer government workflow is implemented in [gov_crud.py](../backend/gov_crud.py#L303) and exposed under `/api/gov/work-orders`. It can create, assign, update, approve/reject, record field updates, and synchronize a linked report.

Current state vocabulary:

```text
open → assigned → in_progress → completed
                       └──────→ cancelled
open/approved preterminal → promoted (currently represented ambiguously by cancellation)
```

Key functions:

- smart dispatch suggestions: [find_smart_dispatch_suggestions](../backend/gov_crud.py#L176);
- linked report synchronization: [_sync_report_status](../backend/gov_crud.py#L215);
- work-order create: [create_work_order](../backend/gov_crud.py#L303);
- status update: [update_work_order_status](../backend/gov_crud.py#L434);
- approval/rejection: [approve_work_order](../backend/gov_crud.py#L604) and [reject_work_order](../backend/gov_crud.py#L640);
- work-order-to-project promotion: [promote_work_order_to_project](../backend/gov_crud.py#L2077).

**Known defect:** work-order update schemas refer to `user_id` while the ORM uses `official_id`; current field update paths can fail.

Additional observed drift:

- creation can mark the resident report `dispatched` even when the work order remains unassigned and `open`;
- the initial timeline can record `open` even when the persisted work order is already `assigned`;
- territorial lookup expects a barangay identifier while creation can pass the report's textual barangay;
- approval/rejection can run without a single current-state adjacency rule and can record the wrong previous state;
- field location update deliberately falls through for any authenticated subject, while “my work orders” and self-update checks rely on bare numeric IDs;
- the agent field-report route constructs a nonexistent `Report.user_id` and is nonfunctional as written.

**Process requirement:** completion must require governed evidence and, where policy requires, independent review. Promotion should produce an explicit `promoted_to_project` handoff with a project ID; it should not look identical to cancellation.

### 8.5 Project and procurement lifecycle

Current project phase sequence:

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

`advance_project_phase` in [gov_crud.py](../backend/gov_crud.py#L1263) contains a smart-gate path, but generic project updates and competing certificate routes can bypass or conflict with it. Direct metadata update should not be allowed to change phase.

The current advance function checks selected documents, roles, NTP, FQA, and legal-hold effects, but it does not consistently verify exact current→target adjacency. Unknown status strings can be written while `current_phase` remains stale. Its service return shape also differs from what the route treats as a project response, so a mutation may commit and then return an HTTP error. One certificate route closes first and runs FQA afterward; the alternate gated route currently passes a mismatched parameter.

Procurement has a simpler status and several parallel financial flags:

```text
draft → submitted → validated → sent_to_procurement → procured
                    └──────────────────────────────→ rejected

parallel prerequisites:
funding certification / ObR
→ cash release
→ BAC schedule
→ notice to proceed
```

**Observed risk:** prerequisite order and actor authority are not centralized. One route intended to approve with budget relies on a missing relationship. Different fields can imply contradictory procurement stages.

In addition, issuing `ntp_issued=false` can still advance a linked project because the synchronization path does not check the boolean value. Finance actors permitted to certify funding can fail the linked project transition because the project gate expects a different role set. Procurement changes write audits but no `ProcessTimeline`, and BoQ numeric inputs are not yet bounded by a strong financial schema.

**Proposed canonical process:** compute one procurement stage from an enforced prerequisite graph, while preserving the underlying finance documents and decisions. Every amount-changing or financial transition must record authority, source document, version, before/after, and audit event.

### 8.6 OBO inspection lifecycle

Current intended progression is:

```text
application_received
→ inspection_scheduled
→ inspection_complete
→ permit_issued

or

inspection_complete
→ notice_issued
→ re_inspection_scheduled
→ cleared
```

The model also includes technical review, order/payment, and appeal concepts. Routes expose generic update plus dedicated technical-review, appeal, and order-of-payment commands.

**Risk:** generic update can skip the sequence or issue a terminal result without every required technical/payment/inspection gate.

OBO currently writes no dedicated process timeline, and its audit events cannot reference an `obo_id`. Technical-review department/status fields are unconstrained strings, while an appeal overwrites a single status/URL rather than adding a versioned decision record. `permit_issued` or `cleared` can immediately resolve a linked resident report without the canonical completion-proof transaction.

**Proposed authoritative sequence:** application → scheduled inspection → inspection evidence → required technical reviews → payment confirmation → permit or notice → appeal/reinspection branch → clearance. Original findings should remain immutable when an appeal creates a new decision version.

### 8.7 Completion, FQA, and resident closeout

Completion can currently be initiated from report routes, linked work-order synchronization, project certificate/FQA paths, or OBO changes. [fqa_engine.execute_fqa](../backend/fqa_engine.py#L8) performs quality assessment and commits internally.

**Risk:** multiple completion authorities can resolve a resident report with different proof requirements and transaction behavior. Internal commits make it harder for the calling domain command to roll back as one unit. Competing project certificate routes and parameter mismatches further weaken the guarantee.

Resident closeout uses `POST /api/reports/{id}/confirm` and [confirm_report_resolution](../backend/crud.py#L427). The current implementation can accept insufficient state/rating constraints or repeated trust effects.

**Required canonical closure transaction:**

```text
validated completion evidence
+ final WO/project/OBO transition
+ linked report transition
+ asset/maintenance effect where applicable
+ public timeline + immutable audit
+ resident notification outbox
```

Resident confirmation must be owner-only, resolved-only, rating-bounded, and idempotent. “Still unresolved” should open an owned follow-up rather than silently overwrite history.

**Observed reporting side effect:** resident confirmation changes `resolved` to `closed_by_citizen`, but several archive, dashboard-completion, and recurrence queries only count `resolved`. A successfully closed case can therefore disappear from default completed-work views and long-term maintenance analysis. Terminal-state semantics must be normalized across records, metrics, analytics, and public tracking.

### 8.8 Timelines, audit, notifications, and advisories

PULSO distinguishes four communication/history concerns:

- `ProcessTimeline`: resident-visible or internal process events;
- `AuditLog`: accountability record of who changed what;
- `Notification`: recipient-specific in-app update;
- `Advisory`: broadcast/public operational communication.

The intent is strong, but helper functions in both CRUD modules can commit at different moments. Some state changes append history after an earlier commit; notification delivery is not based on a durable transactional outbox; hard report deletion can remove timeline/audit records; hidden notification filtering and client method conventions are inconsistent.

**Proposed rule:** a domain command writes entity state, timeline, audit, and outbox in one database transaction. Delivery workers process the outbox with retry and deduplication. A public timeline is a deliberate privacy-safe projection, not a direct dump of internal notes or audit payloads.

### 8.9 Documents, records, retention, and legal hold

`SystemDocument` models classification, retention, expiration, checksum, uploader, target entity, and legal hold. The document router exposes upload, retrieval, target lookup, registry/counts, legal hold, and deletion.

Current gaps include field/response mismatches in registry paths, title-case role checks for legal hold, broad bearer deletion of non-held documents, and the public static upload bypass.

The current upload path reads the entire file before applying its maximum-size rule, trusts extension and declared MIME without magic-byte/decoder/malware validation, and does not first authorize the target resource. Registry counts and target metadata are more broadly visible than document classification permits. Physical deletion occurs without a disposition/audit record and checks legal hold but not the full retention policy.

**Proposed records contract:** private durable object storage; streamed or signed authorized access; MIME/magic-byte/decoder and malware validation; quarantine; checksum; classification; version; global uploader subject; access audit; retention/disposition; and legal hold that always overrides deletion. Business deletion should tombstone or archive; it must never cascade away accountability history.

### 8.10 Analytics and predictive maintenance

Analytics derive summaries, clusters, heatmaps, recurrence, forecasts, narratives, estimates, and exports from operational data. Predictive routes derive asset health, maintenance schedules, risk maps, and AI plans and can convert a recommendation into a work order.

**Observed risks:**

- some authorization helpers do not honor the requested module/action precisely;
- exports and analytics can expose location or resident-linked data beyond operational need;
- predictive outputs include random/mock behavior;
- predictive conversion can bypass the canonical work-order command and its normal side effects;
- model/provider/version, data window, confidence, and override provenance are not consistently recorded.

The analytics live report feed can include resident name, description, exact coordinates, location, and image URL for a broad static allowlist. The analytics permission helper ignores its requested module/action, so the same allowlist can reach an analytics-to-procurement command. CSV exports lack a distinct export purpose/capability and formula neutralization. The mounted predictive router uses `predictive_engine` while a separate `predictive_service.py` implements another, apparently unmounted, interpretation of the same domain.

**Required rule:** analytics are read projections with field-level privacy policy. Any operational conversion calls the same guarded domain command used by a human workflow. Mock/random data must never mix with production truth. AI recommends; an accountable authorized official decides.

## 9. State authority summary

| Aggregate | Current authority problem | Required future owner |
|---|---|---|
| Account/session | Login checks and per-request token checks disagree | Identity/session service |
| Role/capability | Static roles, aliases, DB capabilities, and client caches disagree | Backend policy service |
| Report | Generic status patch and special commands coexist | Report transition service |
| Work order | Legacy and government CRUD surfaces coexist | Work-order command service |
| Project | Generic update, advance, and certificate commands can compete | Project transition/FQA service |
| Procurement | Simple status and parallel finance flags can contradict | Procurement transition service |
| OBO | Generic update can bypass dedicated gates | OBO transition service |
| Completion | Report, WO, project, OBO, and FQA paths can resolve independently | Canonical closure orchestration |
| Files/records | Public mount and DMS policy conflict | Records/storage service |
| Schema | Runtime `create_all`, migrations, SQL, and repairs coexist | Ordered migration history |

## 10. Function and side-effect map

| Command or service | Primary write | Secondary effects observed/intended | Transaction concern |
|---|---|---|---|
| Resident registration | `Resident` | verification challenge, email | Account commits before delivery; no outbox. |
| `create_report` | `Report` | ticket, timeline, AI/cluster fields, evidence reference | File/provider/timeline work is not one replay-safe unit. |
| `update_report_status` | report status | timeline, audit, trust, notifications, asset/maintenance effects | Accepts broad status input; helper commits differ. |
| `confirm_report_resolution` | report closeout | rating, feedback, trust, timeline/audit | Needs resolved-only and idempotency guard. |
| `upgrade_resident_kyc` | resident KYC | verification metadata/audit | Provider evidence and policy lifecycle require consolidation. |
| government `create_work_order` | `WorkOrder` | report sync, assignment, timeline, audit, notification | Must become the sole WO creation path. |
| `update_work_order_status` | WO status | report sync, timeline, audit, notification, assets | Completion proof and exact adjacency need central validation. |
| work-order approval/rejection | approval + WO | status, notes, timeline, notification | Actor/role thresholds should be capability policy. |
| `advance_project_phase` | project phase | audit/timeline/notifications and smart gates | Other routes can bypass it. |
| procurement finance commands | procurement fields/status | audit/timeline/notifications | Prerequisite graph and financial authority are incomplete. |
| OBO updates | OBO inspection | report/process effects | Generic and dedicated commands compete. |
| `execute_fqa` | quality/completion fields | project/report/asset/history | Internal commit obstructs outer atomic transaction. |
| document upload/delete/hold | document metadata/file | checksum, registry, retention/audit | Static file bypass and authorization defects. |
| AI/geocode/OCR/PhilSys | provider result | classifications, address, verification, plans | Inline failure/retry, provenance, privacy, and timeout semantics vary. |
| notification helpers | notification/delivery | email/SMS/in-app | No durable outbox/idempotent delivery ledger. |

## 11. Transaction, concurrency, and failure model

### Current understanding

- Database sessions are synchronous and request-scoped, but commits occur inside numerous CRUD/service helpers.
- External providers are generally called inline with the request.
- Local files can be written before the final database outcome.
- There is no consistent transactional outbox, idempotency-key ledger, optimistic entity version, or offline replay protocol.
- State synchronization between report, work order, project/OBO, assets, timelines, audits, and notifications is procedural rather than enforced by one aggregate command.

### Resulting failure classes

| Failure | Possible current result |
|---|---|
| Client retries after timeout | Duplicate report, work order, notification, or trust effect. |
| Provider/mail/SMS fails after DB commit | API error despite durable change; user retries into conflict or duplicate. |
| File write succeeds then DB fails | Orphan or publicly reachable evidence. |
| State update commits before timeline/audit | Civic status without matching accountability history. |
| Two officials act concurrently | Last write wins; invalid transition or stale approval. |
| Linked completion partly fails | WO/project says complete while report or asset history disagrees. |
| Role/suspension changes | Existing bearer can continue with stale authority. |

### Proposed command envelope

Every mutation should carry:

- authenticated immutable subject and policy context;
- stable operation/idempotency ID bound to subject and request hash;
- expected entity version;
- typed command rather than arbitrary status string;
- structured reason/evidence and target relationship;
- correlation ID propagated to audit, timeline, provider, and delivery work.

The database transaction should commit the domain result plus timeline/audit/outbox. External work should be retried from durable jobs. Conflicts should return the latest safe state and recovery action instead of silently overwriting it.

## 12. External dependencies and degraded behavior

| Dependency | Current purpose | Minimum degraded-mode behavior |
|---|---|---|
| PostgreSQL/SQLAlchemy | All durable system data | Readiness fails closed; transaction rolls back; migration and restore ownership are explicit. |
| Vertex/Gemini | Report analysis, assistant, advisories, narratives, plans | Manual workflow remains available; quota/timeout/malformed output is explicit; no fabricated result. |
| Google Maps | Search, reverse geocode, directions | Preserve manual address/pin/text and resident draft. |
| reCAPTCHA | Resident login risk control | Approved production risk policy; no client-provided literal bypass. |
| Vision/OCR.space | Identity-document OCR fallback | Securely preserve minimum evidence; uncertainty/outage goes to manual review. |
| PSA PhilSys/QR | National identity/residency verification | Authenticated, minimized, rate-limited, audited, cryptographically verified, and appealable/manual fallback. Current routes are public, sandbox defaults can report `verified: true`, and QR v1/v3 parsing can return verified without validating a signature. |
| Gmail SMTP/Semaphore | Verification, recovery, operational messages | Outbox, retry/deduplication, delivery status, and alternate channel. |
| Local evidence storage | Images and documents | Replace with private governed storage; no false success before validation/finalization. |
| DBSCAN/haversine | Duplicate/cluster analysis | Version parameters; deterministic fixtures; reviewable canonical match; no silent merge. |
| GPS/camera/connectivity | Resident and field evidence | Draft/operation queue with replay reconciliation and no duplicate effects. |

## 13. Prioritized backend findings

### P0 — must be resolved before trusting production process integrity

1. Separate resident/official numeric IDs are treated as a shared identity namespace.
2. Generic status mutation permits illegal lifecycle skips.
3. Completion can be reached through competing routes with inconsistent proof requirements.
4. Public static uploads bypass protected evidence/records rules.
5. Broad document deletion and report hard deletion can destroy governed records or audit history.
6. Account deactivation/suspension is not consistently enforced for existing tokens.
7. There is no single atomic, idempotent command for report submission or linked completion.

### P1 — blocks reliable integration or controlled operations

1. Work-order update schema/model mismatch (`user_id` versus `official_id`).
2. Project certificate/FQA and project-mapping route duplication/competition.
3. Budget approval path references a missing report relationship.
4. Government user-status route is wired ambiguously with the role handler.
5. Dashboard/PhilSys and several resource routes have insufficient authorization scope.
6. Static and dynamic RBAC vocabularies disagree.
7. CORS/session defaults, fallback secret, login logging, and CAPTCHA bypass are not production-safe.
8. Schema creation/migration/repair authority is fragmented.
9. Analytics/export privacy and capability boundaries are incomplete.
10. Public PhilSys routes accept sensitive identity material without authentication/rate policy, and current sandbox/QR logic can report unproven verification.
11. Predictive mock/random values and direct conversion can enter operational flow.
12. Field routes do not consistently prove official subject, assignment, or jurisdiction.
13. Notification, provider, and file side effects lack durable retry/idempotency.
14. Current tests do not establish a reproducible contract, authorization, migration, concurrency, upload-security, or end-to-end release gate.

The complete cross-client defect register is in [the API contract gap register](./ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md#7-current-uiapi-contract-gap-register).

## 14. Backend source-of-truth framework

Before implementation begins, approve these artifacts in order:

1. **Global identity and session ADR** — subject model, account states, token/session/revocation, recovery, and audit.
2. **Authorization policy matrix** — capability, jurisdiction, assignment/delegation, resource classification, entity state, and financial thresholds.
3. **Canonical lifecycle specification** — allowed source→target transitions, actor, evidence, reason, version, and side effects for report, WO, project, procurement, and OBO.
4. **Data model and migration authority** — current physical ERD generated from ORM/database, constraints, retention classifications, and ordered migrations from zero and supported prior versions.
5. **Versioned OpenAPI contract** — one route per command/query, typed errors, pagination, idempotency, version conflicts, and compatibility/retirement plan.
6. **Event and transaction catalog** — transaction boundary, timeline event, audit event, notification/outbox event, provider job, and compensation/reconciliation rule for every command.
7. **Storage and records policy** — evidence classes, scanning, access, checksum/version, retention, legal hold, and disposition.
8. **Provider and model registry** — provider/model/version, data sent, purpose, timeout/retry, fallback, confidence/provenance, and accountable human decision.
9. **Observability/SLO runbook** — correlation IDs, structured safe logs, queue/provider health, reconciliation metrics, alerts, backup/restore, incident, and rollback.
10. **Executable traceability matrix** — story/process → command/endpoint → policy → state transition → persistence/events → frontend/mobile flow → automated tests.

### Recommended implementation boundaries

This does not require immediate microservices. A well-structured monolith can support the system if it has explicit boundaries:

```text
API adapters
  → application commands/queries
    → domain policy and state machines
      → repositories/unit of work
        → database + outbox
          → provider/storage/delivery workers
```

Route functions should translate HTTP to typed commands and responses. Domain services should own lifecycle rules. Repositories should not decide business state. External providers should not commit domain records. One unit of work should control each mutation.

## 15. Decisions required from product and government operations

The code cannot safely answer these policy questions by itself:

1. What is the official resident-visible report vocabulary, and which internal states map to each public label?
2. Which report outcomes require triage, engineering approval, budget approval, or independent completion review?
3. When is a localized concern a work order versus a project or OBO case?
4. Which project phases and procurement prerequisites are legally/operationally mandatory, and who owns each decision?
5. Which OBO technical reviews, payments, appeals, and reinspection steps are required for each case type?
6. What completion evidence is mandatory by category, cost, risk, and branch?
7. How long may a resident dispute a resolution, and does that reopen the case or create a linked follow-up?
8. Which timeline events are public, resident-only, assigned-team-only, management-only, or audit-only?
9. What data may analytics, exports, AI, OCR, PhilSys, and predictive providers process, and for how long?
10. What are the retention, legal-hold, correction, appeal, and approved-disposition rules for each record class?
11. Which government capability/jurisdiction/amount combinations can approve, dispatch, spend, issue, suspend, export, hold, or delete?
12. Which channels and manual fallbacks must remain available during provider, network, or device failure?

## 16. Definition of backend/process readiness for frontend implementation

Frontend implementation should begin against a frozen process/API slice only when:

- one authoritative lifecycle and public/internal vocabulary is approved for that slice;
- every visible action maps to one typed backend command with an exact permission and source state;
- success, validation, denial, conflict, provider failure, retry, and no-access responses are defined;
- report and government records share a traceable global subject and resource ownership model;
- entity, timeline, audit, outbox, file, and linked-record effects have one transaction/recovery contract;
- the OpenAPI operation, schema, enum, error, pagination, idempotency, and version behavior are executable;
- fixtures cover every role/jurisdiction/state and the frontend does not need invented mock truth;
- design and content distinguish public timeline, internal operations, confidential records, and AI suggestions;
- automated contract, authorization, state-machine, migration, concurrency, upload, and golden end-to-end tests pass.

## 17. Reference index

### Product and process references

- [Product definition and principles](../PRODUCT.md)
- [Resident user stories and SDLC](./ui-ux-audit/12-resident-user-stories-and-sdlc.md)
- [Government user stories and SDLC](./ui-ux-audit/13-government-user-stories-and-sdlc.md)
- [End-to-end lifecycle, full endpoint inventory, target API contract, and QA framework](./ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md)
- [Current audit method and runtime limitations](./ui-ux-audit/README.md#audit-method-and-limitations)

### Primary backend sources

- [Application and legacy routes](../backend/main.py)
- [Authentication](../backend/auth.py)
- [Database configuration](../backend/database.py)
- [Shared models](../backend/models.py) and [schemas](../backend/schemas.py)
- [Government models](../backend/gov_models.py) and [schemas](../backend/gov_schemas.py)
- [Shared/legacy CRUD](../backend/crud.py)
- [Government CRUD](../backend/gov_crud.py)
- [Government router](../backend/gov_router.py)
- [Analytics router](../backend/analytics_router.py)
- [Predictive router](../backend/predictive_router.py)
- [Document router](../backend/document_router.py)
- [PhilSys router](../backend/philsys_router.py)
- [Dynamic capability service](../backend/roles_service.py)

## 18. Review note

This artifact is a static understanding of the checked-in system, not an implementation promise or production readiness assessment. Any behavior marked **Proposed** requires product, government operations, backend/data, security/privacy, records/legal, QA, and relevant finance/procurement approval before it becomes authoritative. When implementation begins, update this document from the approved ADRs, generated OpenAPI, migration history, and executable tests rather than from UI assumptions.
