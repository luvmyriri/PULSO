# PULSO end-to-end system lifecycle and API contract

| Field | Value |
|---|---|
| Document type | Cross-system service blueprint + current endpoint inventory + target contract |
| Status | Current implementation inventoried; target contract proposed for approval |
| Version | 1.0 |
| Last validated | 23 August 2026 |
| Scope | Resident web/mobile, government web/field operations, backend, database, evidence, identity, notifications, analytics, records, and external providers |
| Implementation | Not started; this document changes no application code |

## 1. Purpose and quality position

This document connects the separate [resident user stories and SDLC](./12-resident-user-stories-and-sdlc.md) and [government user stories and SDLC](./13-government-user-stories-and-sdlc.md) into one auditable service cycle.

It deliberately separates:

- **observed implementation** — routes and behavior present in the repository today;
- **current defects/gaps** — behavior that is broken, under-authorized, inconsistent, or unsafe;
- **target contract** — the approved future behavior that design, frontend, backend, mobile, QA, data, security, records, and operations must implement together.

Static inspection found **155 decorated operations / 154 unique method-path pairs** across the six backend route modules. One government project-mapping operation is registered twice. Route presence is not proof of runtime correctness; several present endpoints are deterministically broken by schema/model mismatches. The integrated authenticated flows were not fully executed because the checked-in backend environment is not runnable on this workstation, as recorded in the dossier [README](./README.md#audit-method-and-limitations).

## 2. Source of truth and status legend

### Source hierarchy

1. Backend decorators, authorization dependencies, schemas, models, persistence, and migrations.
2. Frontend/mobile route declarations and actual HTTP calls.
3. Approved target contracts in this dossier.
4. Older walkthroughs and API catalogs as historical material only.

### Labels

| Label | Meaning |
|---|---|
| **Live route** | Decorated method/path exists; may still contain defects. |
| **Public** | No authentication dependency in the current implementation. |
| **Bearer** | Any JWT-resolved resident or official unless an additional check is stated. |
| **Resident/owner** | Current code checks resident role and/or numeric ownership. |
| **Government role** | Current static role group or expanded legacy role dependency. |
| **Dynamic capability** | `roles_service` module/action check. |
| **Broken** | Deterministic decorator, schema, field, or response mismatch. |
| **Observed risk** | Reachable but fails a target security, lifecycle, audit, privacy, or integrity requirement. |
| **UI-contract gap** | A client calls an endpoint/method/payload not present in current routes. |
| **Proposed** | Future contract only. |

### Route-source map

| Prefix/domain | Authority |
|---|---|
| Root, auth, users, reports, KYC, maps, advisories, notifications, legacy WOs | [backend/main.py](../../backend/main.py#L49) |
| Government operations | [backend/gov_router.py](../../backend/gov_router.py#L37) |
| Government analytics | [backend/analytics_router.py](../../backend/analytics_router.py#L37) |
| Predictive maintenance | [backend/predictive_router.py](../../backend/predictive_router.py#L14) |
| Document management | [backend/document_router.py](../../backend/document_router.py#L15), mounted at [main.py](../../backend/main.py#L237) |
| PhilSys | [backend/philsys_router.py](../../backend/philsys_router.py#L25) |

## 3. Whole-system service cycle

```text
Resident discovers PULSO and jurisdiction
→ identity/residency check and informed consent
→ registration creates an unverified resident
→ OTP verification activates the account
→ sign-in establishes a current active subject/session
→ resident captures evidence, exact location, and description
→ optional AI/geocode suggestions are reviewed by the resident
→ jurisdiction and duplicate checks run
→ idempotent submission creates ticket + first public event
→ scoped government triage verifies/rejects/refers/requests information
→ authorized approval selects WO, OBO, or Project/Procurement branch
→ eligible staff execute work and attach governed evidence
→ completion/FQA/inspection validates proof exactly once
→ report becomes resident-visible resolved and notification is delivered
→ resident confirms/rates or opens a governed follow-up
→ case, evidence, audit, retention, asset history, and analytics persist
```

### Stage-by-stage contract

| Stage | Primary actor | Current endpoint(s) | Atomic system result required | Failure/recovery contract |
|---|---|---|---|---|
| 1. Discover | Visitor | `GET /`, `/api/health`, `/api/geo/caloocan-border`, downloads | Truthful scope and available channel | Web remains complete if APK/boundary/provider fails |
| 2. Eligibility | Prospective resident | `POST /api/verify-residency`; optional PhilSys family | Minimal verified eligibility evidence with policy metadata | Distinct mismatch/outside/uncertain/provider failure; manual review |
| 3. Register | Prospective resident | `POST /api/auth/register` | One unverified globally unique subject | Idempotent retry; mail failure resumes verification, not registration |
| 4. Verify | Unverified resident | `POST /verify-registration`, `/resend-code` | OTP consumed; account activated; audit/outbox | Expiry/attempt/cooldown and accessible resend/support |
| 5. Authenticate | Resident or official | `POST /api/auth/login`, `GET /api/me` | Active current subject, capability/jurisdiction, bounded session | Revoked/inactive/suspended rejected on every request |
| 6. Prepare report | Resident | `/reports/analyze`, geocode/search/reverse | Preserved draft with editable suggestions | AI/GPS/geocode/upload failure keeps manual path and draft |
| 7. Submit | Resident | `POST /api/reports` | Report, attachment reference, ticket, first timeline, outbox in one operation | Operation ID reconciles timeout/replay; duplicate returns canonical ticket |
| 8. Triage | Dispatcher | report list/detail/status/reject routes | Valid decision, next owner, timeline, audit, notification | Version conflict returns latest record; no partial side effects |
| 9. Approve/branch | Approver/dispatcher | budget approval, create WO/OBO/project | One authorized fulfillment branch with evidence/cost/assignee | Missing gate is structured; no alternate bypass |
| 10A. Simple work | Field team | gov WO and agent routes | Assigned→in progress→proof-complete | Offline operation queue/version reconciliation |
| 10B. Project | Project/design/finance | project, procurement, document routes | Sequential deliverables, approvals, funds, NTP, FQA | No state skip; evidence and financial transaction rollback/recovery |
| 10C. OBO | Inspectors/approvers | OBO routes | Inspection/review/payment/notice/permit record | Failed review/appeal/reinspection follows approved branch |
| 11. Resolve | Authorized completion actor | report resolve or canonical linked completion service | Valid proof, one resolved transition/event/outbox | Idempotent; no proofless WO/OBO/project shortcut |
| 12. Notify/track | System/resident | timeline, notifications, advisories | Public-safe update and durable deep link | Retry/outbox; read/hidden remain consistent |
| 13. Resident closeout | Resident owner | `POST /reports/{id}/confirm` | One bounded rating/response and terminal state/follow-up | Only resolved; replay safe; low rating visible to owner |
| 14. Retain/learn | Records/auditor/planner | DMS, records, audit, analytics, predictive | Classified immutable record, retention/legal hold, privacy-scoped insight | No hard purge of audit; model/export provenance and access log |

## 4. Entity, ownership, and data lineage

```text
District
└─ Barangay
   ├─ Resident subject
   │  ├─ Verification / KYC evidence
   │  ├─ Report
   │  │  ├─ Evidence attachment(s)
   │  │  ├─ Notification(s)
   │  │  ├─ Public/internal ProcessTimeline events
   │  │  ├─ immutable AuditLog events
   │  │  ├─ WorkOrder(s)
   │  │  │  ├─ updates / approvals / evidence
   │  │  │  ├─ ProcurementRequest ─ BoQItem(s)
   │  │  │  └─ InfrastructureAsset ─ MaintenanceHistory
   │  │  ├─ ProjectRequest
   │  │  │  ├─ ProcurementRequest ─ BoQItem(s)
   │  │  │  ├─ WorkOrder(s)
   │  │  │  ├─ SystemDocument(s)
   │  │  │  └─ InfrastructureAsset
   │  │  └─ OBOInspection
   │  └─ PasswordResetToken (currently email-linked)
   └─ Official subject
      ├─ SystemRole + capabilities + jurisdiction
      ├─ assignment / approval / delegation
      ├─ AgentLocation
      ├─ Notification(s)
      ├─ AuditLog / ProcessTimeline actor
      └─ SystemDocument uploader/access event
```

Model evidence: residents/officials [models.py](../../backend/models.py#L59), reports/notifications [models.py](../../backend/models.py#L198), work/audit/timeline [gov_models.py](../../backend/gov_models.py#L46), procurement/projects/OBO [gov_models.py](../../backend/gov_models.py#L227), and assets/documents [gov_models.py](../../backend/gov_models.py#L485).

### Target identity rule

Current `Resident.id` and `Official.id` are independent integer namespaces, while authorization and several foreign keys treat them as one namespace. The target must use one immutable global subject identifier, or every reference must include both `subject_type` and `subject_id`. Numeric equality alone must never establish ownership, assignment, actor, uploader, or notification recipient.

### Target transaction boundaries

| Operation | Must commit together |
|---|---|
| Register | subject + verification challenge + delivery outbox |
| Submit report | report + attachment metadata + first timeline + audit where policy requires + delivery outbox |
| Change status | entity version/status + accurate timeline + audit + notification/outbox + linked entity sync |
| Create/assign WO | WO + assignment + source report transition + timeline/audit/outbox |
| Financial gate | PR/project flag/state + approving authority + source document + audit/outbox |
| Resolve | completion evidence + WO/project/OBO state + report state + asset/maintenance effect + timeline/audit/outbox |
| Resident confirm | terminal/follow-up state + one feedback record + one bounded trust effect + timeline/audit |
| Account suspension/role | account/role/capability + session revocation + audit + admin notification |
| Legal hold/disposition | record state + actor/reason/authority + immutable retention event |

### External dependencies and degraded modes

| Dependency | Current use | Target failure ownership |
|---|---|---|
| PostgreSQL / SQLAlchemy | All durable identities, cases, work, records, and audit | Readiness fails closed; transactions roll back; backup/restore and migration SLO owned by platform/data |
| Google Vertex/Gemini | Report analysis, assistance, advisories, narratives, maintenance plans | Core manual workflows remain available; quota/timeout/malformed output is explicit; no fabricated result |
| Google Maps services | Reverse/forward geocode and directions | Preserve entered location; offer manual address/pin/text; record provider/freshness |
| Google reCAPTCHA | Resident sign-in risk control | Production fails according to approved risk policy; no client literal bypass |
| Google Cloud Vision / OCR.space | Identity OCR fallback chain | Preserve evidence securely and route uncertainty/outage to governed manual review |
| PSA PhilSys Check / QR verification | National-ID verification | Authenticated, rate-limited, audited, minimized; provider result never becomes an unreviewable dead end |
| Gmail SMTP / Semaphore SMS | OTP, recovery, and operational messaging | Transactional outbox, retry/deduplication, delivery status, alternate/assisted channel |
| Evidence/document storage | Current local filesystem and public static mount | Private durable storage, scan/quarantine, signed access, retention/legal hold, orphan cleanup |
| DBSCAN/haversine clustering | Duplicate/analytics grouping | Versioned parameters, deterministic fixtures, reviewable canonical match, no silent merge |
| Client connectivity/device services | Camera, GPS, resident and field sync | Draft/operation queue, version reconciliation, no false success or duplicate side effect |

## 5. Canonical target state contracts

These tables are proposed for approval. Current APIs do not enforce all adjacency, evidence, actor, and idempotency rules.

### Report

| Source | Allowed target | Authorized actor | Required data/gates | Required effects |
|---|---|---|---|---|
| — | `received` | Resident submission service | valid subject, jurisdiction, evidence policy, operation ID | ticket, first public event, receipt |
| `received` | `under_review` | Triage capability | record version and scope | public/internal event, next owner |
| `under_review` | `needs_information` | Triage capability | structured request/reason/deadline policy | resident action + notification |
| `needs_information` | `under_review` | Resident/support + triage service | requested data, ownership | versioned evidence event |
| `under_review` | `duplicate` | Triage capability | canonical ticket/reason | evidence link, resident notification |
| `under_review` | `outside_scope` | Triage capability | referral owner/reason | referral event and resident guidance |
| `under_review` | `rejected` | Triage capability | reason/evidence | audit and resident explanation |
| `under_review` | `approved_for_action` | Approval capability | technical/budget gate as applicable | next branch/owner |
| `approved_for_action` | `assigned` | Dispatch capability | eligible assignee and WO/OBO/project | assignment and notification |
| `assigned` | `in_progress` | Assigned field/project actor | work start evidence/version | linked state/event |
| `in_progress` | `resolved` | Completion capability | canonical validated completion proof | proof, audit, public event/outbox |
| `resolved` | `closed_by_resident` | Resident owner | rating 1–5 or explicit accept; idempotency | terminal feedback/event |
| `resolved` | `follow_up_required` | Resident owner/authorized reviewer | structured unresolved reason | owned follow-up, no invisible reopen |
| Pre-lock states | `retracted` | Resident owner/authorized official | reason and latest version | audit/public event; no deletion |

Target public labels can map these canonical names to approved resident copy. A migration map must preserve legacy values such as `pending`, `pending_approval`, `approved_internal`, `dispatched`, `resolved`, `closed_by_citizen`, `unverified`, `validated`, and `cancelled`.

### Work order

| Source | Allowed target | Gate |
|---|---|---|
| — | `open` | valid source/scope/creator |
| `open` | `assigned` | eligible active assignee/team and jurisdiction |
| `assigned` | `in_progress` | assigned actor accepts/starts work |
| `assigned` or `in_progress` | `blocked` | reason, dependency, owner, follow-up date |
| `blocked` | `in_progress` | blocker resolution evidence |
| `in_progress` | `completed_pending_review` | validated completion evidence and cost |
| `completed_pending_review` | `completed` | independent approval where required |
| `completed_pending_review` | `changes_requested` | structured reason |
| approved preterminal states | `cancelled` | authorized reason and source-report consequence |
| `open`/approved preterminal | `promoted_to_project` | project ID and handoff; do not ambiguously reuse `cancelled` |

### Infrastructure project

The current thirteen states may be retained internally if operations approves them. Each step must have exact previous state, role/capability, required artifacts, financial gate, resident visibility, and rollback/correction policy:

```text
request_received → survey_in_progress → survey_complete → design_in_progress
→ boq_submitted → pending_budget_check → budget_confirmed
→ approved_by_city_engineer → dispatched → in_progress
→ milestone_inspections → resolved → closed_completion_certified
```

Direct metadata update must not accept `status` or `current_phase`. One transition service and one FQA/certificate completion service must own state changes.

### Procurement

| Source | Target | Minimum gate |
|---|---|---|
| — | `draft` | authorized request owner and source project/WO |
| `draft` | `submitted` | valid positive BoQ and purpose |
| `submitted` | `validated` | authorized validation and completeness |
| `validated` | `funding_certified` | budget authority + unique ObR + source document |
| `funding_certified` | `cash_released` | finance authority and reconciliation |
| `cash_released` | `bac_scheduled` | BAC authority and valid future schedule |
| `bac_scheduled` | `sent_to_procurement` | approved BAC prerequisites |
| `sent_to_procurement` | `ntp_issued` | contract/procurement completion and executive authority |
| `ntp_issued` | `procured` | receipt/award/mobilization evidence |
| Approved review states | `rejected` | reason and appeal/correction policy |

If flags remain parallel to the simpler existing status enum, the API must still enforce their prerequisite graph and expose one computed canonical stage.

### OBO

```text
application_received → inspection_scheduled → inspection_complete
→ technical_review_complete → payment_confirmed
→ permit_issued OR notice_issued → re_inspection_scheduled → cleared
```

Clearance requires the approved review set, payment, assigned inspection evidence, and executive rule. Appeals form an explicit versioned branch; they do not overwrite the original finding.

## 6. Current endpoint inventory

This inventory records route existence and current access intent, not release approval. “GET and POST” means both method/path pairs exist. Full request/response field definitions remain in the linked Pydantic schemas.

### 6.1 Platform, authentication, identity, and shared users

| Method | Path | Current access | Purpose / current note |
|---|---|---|---|
| GET | `/` | Public | API status |
| GET | `/api/health` | Public | Core health only; no dependency readiness detail |
| GET | `/api/download/agent-app` | Public | Agent APK or 404 |
| GET | `/api/download/resident-app` | Public | Resident APK or 404 |
| GET | `/api/geo/caloocan-border` | Public | Optional sector-filtered GeoJSON |
| GET | `/api/system/ip` | Public | Server LAN IP; production exposure decision |
| GET | `/api/ai/rate-limits` | Manager-expanded | AI usage status |
| POST | `/api/ai/assistant` | Bearer | AI help; injects current name/role into context |
| POST | `/api/verify-residency` | Public | ID OCR/residency; sensitive/costly and unthrottled |
| POST | `/api/auth/register` | Public | Create unverified resident |
| POST | `/api/auth/login` | Public | OAuth form, optional CAPTCHA token |
| POST | `/api/auth/verify-registration` | Public | Verify resident OTP |
| POST | `/api/auth/resend-code` | Public | Replace/resend OTP |
| POST | `/api/auth/forgot-password` | Public | Create/send reset code |
| POST | `/api/auth/verify-reset-code` | Public | Validate reset code |
| POST | `/api/auth/reset-password` | Public | Consume code/change password |
| PATCH | `/api/auth/change-password` | Bearer | Current-password change |
| GET | `/api/me` | Bearer | Current resident/official profile |
| GET | `/api/users` | Manager-expanded | Resident list despite shared schema |
| GET | `/api/users/{user_id}` | Bearer with current numeric checks | Shared profile; identity namespace risk |
| PATCH | `/api/users/{user_id}` | Bearer/self numeric ID | Shared profile mutation; **P0 official-first IDOR risk** |

Current source: [main.py identity routes](../../backend/main.py#L286), [auth.py](../../backend/auth.py#L12), and [schemas.py](../../backend/schemas.py#L14).

### 6.2 Reports, maps, resident closeout, advisories, and notifications

| Method | Path | Current access | Purpose / current note |
|---|---|---|---|
| GET | `/api/reports/stats` | Dispatcher/manager-expanded | Status counts; sparse response risk |
| GET | `/api/reports` | Dispatcher/manager-expanded | All reports with optional status filter |
| GET | `/api/reports/user/{user_id}` | Bearer owner or dispatcher/manager | Resident report list |
| GET | `/api/reports/public` | Bearer | Selected public statuses; resident names anonymized |
| GET | `/api/reports/{report_id}` | Bearer; resident owner | Report detail |
| GET | `/api/reports/{report_id}/timeline` | Bearer; owner public-only | Report timeline |
| POST | `/api/reports/analyze` | Bearer | Multipart AI preflight |
| POST | `/api/reports` | Bearer, not resident-only | Multipart create; jurisdiction/moderation/duplicate checks |
| POST | `/api/reports/{report_id}/confirm` | Resident owner | Close/rate; missing state/range/idempotency checks |
| GET | `/api/residents/kyc-status` | Resident | KYC/trust status |
| POST | `/api/residents/upgrade-kyc` | Resident | KYC OCR upgrade; audit commit defect |
| GET | `/api/geocode/reverse` | Bearer | Reverse geocode |
| GET | `/api/geocode/search` | Bearer | Forward geocode/place search |
| GET | `/api/maps/directions` | Bearer | Directions proxy |
| PATCH | `/api/reports/{report_id}/status` | Dispatcher/manager-expanded | Arbitrary status/budget/date mutation |
| PATCH | `/api/reports/{report_id}/reject` | Dispatcher/manager-expanded | Reject report |
| PATCH | `/api/reports/{report_id}/dispatch` | Dispatcher/manager-expanded | Requires `approved_internal` |
| POST | `/api/reports/{report_id}/cancel` | Owner or dispatcher/manager | Cancel alias |
| PATCH | `/api/reports/{report_id}/cancel` | Owner or dispatcher/manager | Cancel alias |
| PATCH | `/api/reports/{report_id}/resolve` | Dispatcher/manager-expanded | Requires dispatched + proof image |
| DELETE | `/api/reports/{report_id}` | Dispatcher/manager-expanded | Hard-purges related work/audit/timeline |
| GET | `/api/advisories` | Bearer | Resident/shared advisory list |
| POST | `/api/advisories` | Dispatcher/manager-expanded | Create advisory |
| DELETE | `/api/advisories/{advisory_id}` | Manager-expanded | Delete advisory |
| POST | `/api/advisories/generate/{report_id}` | Dispatcher/manager-expanded | AI advisory draft |
| GET | `/api/notifications/user/{user_id}` | Bearer/self | Notification list; hidden records not filtered |
| PATCH | `/api/notifications/user/{user_id}/read` | Bearer/self | Mark all read |
| PATCH | `/api/notifications/{notification_id}/read` | Bearer/owned recipient | Mark one read |
| DELETE | `/api/notifications/{notification_id}` | Bearer/owned recipient | Sets hidden flag; route wording says delete |
| GET | `/api/work-orders` | Legacy government roles | Legacy WO list |
| POST | `/api/work-orders` | Dispatcher/manager-expanded | Legacy WO create; auto-dispatches linked report |

Current source: [main.py reports](../../backend/main.py#L837), [main.py mutations](../../backend/main.py#L1230), [main.py updates](../../backend/main.py#L1362), and [crud.py](../../backend/crud.py#L285).

### 6.3 Government dashboard, work orders, timelines, and legacy document list

| Method | Path | Current access | Purpose / current note |
|---|---|---|---|
| GET | `/api/gov/dashboard/stats` | **Public** | Government KPIs; missing auth dependency |
| POST | `/api/gov/work-orders` | Field roles | Create WO |
| GET | `/api/gov/dispatch/suggest-agent/{report_id}` | Bearer | Rank agents; missing government role/resource scope |
| GET | `/api/gov/work-orders` | Gov roles | List/filter WOs |
| GET | `/api/gov/work-orders/{wo_id}` | Gov roles | WO detail |
| PATCH | `/api/gov/work-orders/{wo_id}` | Field roles | General update; arbitrary status risk |
| POST | `/api/gov/work-orders/{wo_id}/updates` | Field roles | **Broken `user_id`/`official_id` fields** |
| PATCH | `/api/gov/work-orders/{wo_id}/status` | Field roles | Status update; general adjacency absent |
| POST | `/api/gov/work-orders/{wo_id}/approval` | Approval role list | Approve/reject; previous-state logging defect |
| GET | `/api/gov/work-orders/{wo_id}/approvals` | Bearer | Approval list; under-authorized |
| GET | `/api/gov/timeline` | Gov roles | Global timeline |
| GET | `/api/gov/timeline/report/{report_id}` | Bearer with resident handling | Report timeline |
| GET | `/api/gov/timeline/work-order/{wo_id}` | Gov roles | WO timeline |
| GET | `/api/gov/timeline/project/{project_id}` | Gov roles | Project timeline |
| GET | `/api/gov/documents` | Senior roles | Legacy document rows, separate from DMS |
| POST | `/api/gov/work-orders/{wo_id}/promote` | Senior operations | Promote WO to project |

Current source: [gov_router.py work orders](../../backend/gov_router.py#L104) and [gov_crud.py](../../backend/gov_crud.py#L303).

### 6.4 Procurement and BoQ

| Method | Path | Current access | Purpose / current note |
|---|---|---|---|
| POST | `/api/gov/procurement` | Procurement roles | Create draft PR and items |
| GET | `/api/gov/procurement` | Gov roles | List/filter PRs |
| GET | `/api/gov/procurement/{pr_id}` | Gov roles | PR detail/BoQ |
| PATCH | `/api/gov/procurement/{pr_id}/status` | Varies by target | Target label/role checked; adjacency not checked |
| PATCH | `/api/gov/procurement/{pr_id}/funding-certification` | Admin/manager/budget roles | Funding/ObR; linked project advance may fail |
| PATCH | `/api/gov/procurement/{pr_id}/cash-release` | Admin/manager/finance roles | Cash flag; no funding prerequisite |
| PATCH | `/api/gov/procurement/{pr_id}/bac-schedule` | Admin/manager/BAC roles | BAC date; prerequisites incomplete |
| PATCH | `/api/gov/procurement/{pr_id}/ntp-issuance` | Executive roles | NTP flag; false body can still advance project |
| POST | `/api/gov/procurement/{pr_id}/items` | Procurement roles | Add BoQ item; positive validators absent |
| DELETE | `/api/gov/procurement/{pr_id}/items/{item_id}` | Procurement roles | Delete item; parent-child path ownership not checked |

Current source: [gov_router.py procurement](../../backend/gov_router.py#L390), contracts [gov_schemas.py](../../backend/gov_schemas.py#L195), and persistence [gov_crud.py](../../backend/gov_crud.py#L938).

### 6.5 Projects, project/report mapping, and OBO

| Method | Path | Current access | Purpose / current note |
|---|---|---|---|
| POST | `/api/gov/projects` | City engineer/admin clerk/manager/admin | Create project |
| GET | `/api/gov/projects` | Gov roles | List/filter projects |
| GET | `/api/gov/projects/{proj_id}` | Gov roles | Project detail |
| PATCH | `/api/gov/projects/{proj_id}` | Senior roles | Metadata plus status/phase bypass |
| PATCH | `/api/gov/projects/{proj_id}/advance` | Gov roles + internal gates | Advance phase; response/enricher mismatch |
| POST | `/api/gov/projects/{proj_id}/certificate` | Executive roles | Certificate; commits before FQA and has model defect |
| GET | `/api/gov/reports/{report_id}/project-mapping` | Gov roles | First registered mapping implementation |
| GET | `/api/gov/reports/{report_id}/project-mapping` | Bearer | Duplicate later registration; broken attributes/unreachable |
| POST | `/api/gov/projects/{project_id}/issue-certificate` | Dispatcher/manager/admin | Competing FQA completion route |
| POST | `/api/gov/reports/{report_id}/approve-with-budget` | Dispatcher/manager/admin | **Broken report relationship** |
| POST | `/api/gov/obo` | Clerk/inspector roles | Create OBO inspection |
| GET | `/api/gov/obo` | Gov roles | List/filter OBO |
| GET | `/api/gov/obo/{obo_id}` | Gov roles | OBO detail |
| PATCH | `/api/gov/obo/{obo_id}` | Inspectors/executive by target | General update; adjacency absent |
| PATCH | `/api/gov/obo/{obo_id}/technical-review` | Inspector roles | Review result; raw strings |
| PATCH | `/api/gov/obo/{obo_id}/appeal` | Inspector roles | Appeal evidence URL |
| PATCH | `/api/gov/obo/{obo_id}/order-of-payment` | Executive/clerk | Set fee/payment document data |

Current source: [gov_router.py projects](../../backend/gov_router.py#L613), [gov_router.py OBO](../../backend/gov_router.py#L779), and [gov_crud.py project transitions](../../backend/gov_crud.py#L1246).

### 6.6 Users, roles, departmental projections, agents, and government advisories

| Method | Path | Current access | Purpose / current note |
|---|---|---|---|
| GET | `/api/gov/users/stats` | System admin | Account counts |
| GET | `/api/gov/users` | Admin/city engineer/asst | Filtered user envelope; default officials only |
| PATCH | `/api/gov/users/{user_id}/status` | Decorated as system-admin role update | **Broken: status handler unreachable** |
| PATCH | `/api/gov/users/{user_id}/role` | System admin | Change official role; target role validation absent |
| GET | `/api/gov/design-requests` | Gov roles | Project design projection |
| GET | `/api/gov/analysis` | Gov roles | Structural-analysis projection |
| GET | `/api/gov/surveys` | Gov roles | WO/project survey projection |
| GET | `/api/gov/boq` | Gov roles | BoQ projection |
| GET | `/api/gov/estimation` | Gov roles | Estimate projection |
| GET | `/api/gov/reports` | Gov roles | Active report projection |
| GET | `/api/gov/reports-archive` | Senior roles | Resolved/rejected/legacy `closed` projection |
| GET | `/api/gov/records` | Gov roles | Finalized records projection |
| GET | `/api/gov/document-registry` | Gov roles | **Broken model-field projection** |
| GET | `/api/gov/agents/locations` | Dispatch/senior/supervisor | All tracked agent locations |
| GET | `/api/gov/agents/{agent_id}/location` | Dispatch/senior | Single location |
| POST | `/api/gov/agents/location` | Bearer in practice | Self GPS/status; role check falls through |
| GET | `/api/gov/agents/work-orders` | Dispatch/senior | Agent workload projection |
| GET | `/api/gov/agents/my-work-orders` | Bearer numeric ID | Assigned WOs; resident/official collision risk |
| POST | `/api/gov/agents/field-report` | Bearer | **Broken Report field and filename safety** |
| PATCH | `/api/gov/agents/work-orders/{wo_id}/status` | Assigned bearer numeric ID | Enforces limited open/assigned→in-progress→completed |
| GET | `/api/gov/roles` | Dynamic `admin:roles` | Role catalog |
| GET | `/api/gov/roles/templates` | Dynamic `admin:roles` | Role templates |
| POST | `/api/gov/roles` | Dynamic `admin:roles` | Create role |
| PUT | `/api/gov/roles/{role_id}` | Dynamic `admin:roles` | Replace/update role |
| POST | `/api/gov/advisories` | Senior roles | Create advisory |
| GET | `/api/gov/advisories` | Gov roles | Government advisory list |
| DELETE | `/api/gov/advisories/{advisory_id}` | Senior roles | Delete advisory |

Current source: [gov_router.py users](../../backend/gov_router.py#L916), [projections](../../backend/gov_router.py#L1109), [agents](../../backend/gov_router.py#L1514), and [roles/advisories](../../backend/gov_router.py#L1901).

### 6.7 Analytics

All paths use prefix `/api/gov/analytics`. Current access is a static analytics allowlist rather than the requested module/action; some permission exceptions can be converted to `500`, and procurement conversion does not separately require procurement authority.

| Method | Suffix | Purpose |
|---|---|---|
| GET | `/summary` | KPI summary |
| GET | `/clusters` | Spatial clusters with time/category inputs |
| GET | `/clusters/{cluster_id}` | Cluster detail |
| GET | `/heatmap` | Heatmap points |
| GET | `/forecast` | Issue forecast |
| GET | `/recurrence` | Recurring patterns |
| GET | `/reports` | Analytics report projection with PII/exact coordinates |
| POST | `/narrative` | AI cluster narrative and BoQ draft |
| POST | `/estimate` | Cluster estimate/BoQ |
| POST | `/create-procurement` | Convert analytics result to draft PR |
| GET | `/export/clusters` | Clusters CSV |
| GET | `/export/forecast` | Forecast CSV |
| GET | `/export/recurrence` | Recurrence CSV |
| GET | `/export/full-report` | Full report CSV |

Current source: [analytics_router.py](../../backend/analytics_router.py#L83).

### 6.8 Predictive maintenance

All paths use prefix `/api/gov/predictive` and a narrow static senior allowlist. Some current health, probability, date, schedule, and cost outputs use random/mock values.

| Method | Suffix | Purpose / current note |
|---|---|---|
| GET | `/summary` | Asset-health summary |
| GET | `/health` | Per-asset health data |
| GET | `/schedule` | Generated 90-day schedule |
| GET | `/risk-map` | Barangay asset risk |
| POST | `/ai-plan` | AI maintenance plan |
| POST | `/convert-to-work-order` | Direct preemptive WO insert; bypasses canonical side effects |
| GET | `/export` | Predictive CSV |

Current source: [predictive_router.py](../../backend/predictive_router.py#L35).

### 6.9 Document management

All paths use prefix `/api/gov/documents`. Extension/MIME allowlists and a 50 MB post-read limit exist, but authorization and physical-storage controls are incomplete.

| Method | Suffix | Current access | Purpose / current note |
|---|---|---|---|
| POST | `/upload` | Bearer | Upload/hash/register; resident and arbitrary target allowed |
| GET | `/get/{document_id}` | Bearer + confidentiality checks | Protected file response |
| GET | `/target/{model}/{target_id}` | Bearer | Raw target metadata; no resource/confidentiality filter |
| GET | `/registry` | Bearer; capability for officials | Filtered registry; resident public metadata |
| GET | `/registry/counts` | Bearer | Global counts without confidentiality filter |
| PATCH | `/{document_id}/legal-hold` | Intended admin/chief | Role-case mismatch blocks actual slugs |
| DELETE | `/{document_id}` | Bearer | Any bearer can delete a non-held document |

All `uploads/` are also mounted publicly at `/api/uploads`, which can bypass protected DMS/report retrieval. Current source: [document_router.py](../../backend/document_router.py#L90) and [main.py](../../backend/main.py#L55).

### 6.10 PhilSys

All current PhilSys routes are **Public**; the router imports auth but does not apply it.

| Method | Path | Purpose / current note |
|---|---|---|
| GET | `/api/philsys/status` | Provider mode, credential presence, endpoint |
| POST | `/api/philsys/verify` | PhilID images and manual OCR overrides |
| POST | `/api/philsys/verify-manual` | PSN/name/DOB/sex verification |
| POST | `/api/philsys/verify-qr` | Raw QR verification |
| POST | `/api/philsys/scan-qr-image` | Placeholder result; scanning not implemented |

These sensitive/costly routes lack authentication, rate limiting, durable access audit, and upload hardening. Current source: [philsys_router.py](../../backend/philsys_router.py#L33).

## 7. Current UI/API contract-gap register

| Gap ID | Severity | Current mismatch or defect | Lifecycle consequence | Required target decision/test |
|---|---:|---|---|---|
| API-GAP-001 | P0 | Shared numeric resident/official IDs with opposite lookup orders | Cross-account read/write/actor ambiguity | Global subject migration + BOLA suite |
| API-GAP-002 | P0 | Inactive/suspended state not checked on token resolution | Revoked staff/resident continues access | Per-request active/revocation tests |
| API-GAP-003 | P0 | Generic report/WO/project/OBO mutations accept arbitrary status/phase | Illegal skips and false civic truth | Central state services/adjacency suite |
| API-GAP-004 | P0 | Resident confirm accepts any report state/rating and can repeat reward | Pending case can close; trust inflation | Resolved-only, 1–5, idempotency tests |
| API-GAP-005 | P0 | WO/OBO linked completion can resolve report without direct proof requirement | Proof gate bypass | One canonical completion transaction |
| API-GAP-006 | P0 | Public upload mount plus weak file checks | Restricted evidence/document exposure | Private storage/signed access/adversarial uploads |
| API-GAP-007 | P0 | Any bearer can delete any non-held DMS document | Records loss | Target RBAC/retention/tombstone suite |
| API-GAP-008 | P0 | Report hard delete removes audit/timeline | “Immutable” history erased | Append-only/tombstone/retention contract |
| API-GAP-009 | P0 | Government user-status decorator targets role handler | Suspension/deactivation UI cannot work | Separate schemas/routes + revocation E2E |
| API-GAP-010 | P1 | Web reset screen calls `GET /auth/verify-token/{token}` and wrong reset payload | Link recovery fails | One code/link strategy and consumer contracts |
| API-GAP-011 | P1 | Web mark-all calls `POST .../read-all`; server exposes `PATCH .../read` | Optimistic UI lies/fails | Versioned notification contract |
| API-GAP-012 | P1 | Hidden notifications are not filtered | Dismissed update returns | List/read/hide contract tests |
| API-GAP-013 | P1 | Registration textual barangay/role absent from schema | Normalized jurisdiction lost | Shared registration schema/persistence test |
| API-GAP-014 | P1 | First report timeline and KYC audit appended after commit without final commit | Missing audit/process event | Atomic transaction test |
| API-GAP-015 | P1 | Initial evidence saved before AI moderation and lacks hardening | Orphan/unsafe file | Staged scan then atomic finalize |
| API-GAP-016 | P1 | Audit UIs call `/api/gov/audit` and `/audit-logs`; no route | Auditors see failure/false empty | One paginated audit API |
| API-GAP-017 | P1 | FQA UI omits `/api/gov`; server call uses wrong parameter; duplicate certificate routes | Completion action fails/competes | One canonical FQA endpoint |
| API-GAP-018 | P1 | WO update and agent field report use nonexistent model fields | Field workflow returns 500 | Schema/model contract tests |
| API-GAP-019 | P1 | Budget approval uses nonexistent report relationship | Project/budget promotion fails | Relationship contract/integration test |
| API-GAP-020 | P1 | Dashboard stats and all PhilSys endpoints lack expected auth | Data/identity service exposed | Authentication/capability/rate tests |
| API-GAP-021 | P1 | Document legal-hold checks title-case roles | Authorized hold cannot execute | Capability-based hold contract |
| API-GAP-022 | P1 | Agent location and self-WO routes accept broad bearers/numeric IDs | Resident/spoof/other-agent access risk | Assignment/subject/resource authorization |
| API-GAP-023 | P1 | Analytics permission helper ignores requested module/action for conversion | Analytics viewer may create procurement | Separate capabilities and negative tests |
| API-GAP-024 | P1 | Predictive data contains random/mock values and conversion bypasses WO service | Prototype result becomes operational truth | Deterministic model + canonical command |
| API-GAP-025 | P1 | CORS wildcard+credentials, hardcoded JWT fallback, 7-day no-revocation bearer, `mobile_bypass` | Production session perimeter unsafe | Deployment security baseline |
| API-GAP-026 | P1 | No idempotency/version/outbox/offline sync protocol | Duplicate reports and repeated side effects | Operation ID + version conflict + outbox |
| API-GAP-027 | P1 | Runtime `create_all` models conflict with Alembic legacy users schema | Environment cannot reproduce data model | Clean migration/upgrade/rollback test |
| API-GAP-028 | P2 | Users UI sends `offset`; API accepts `skip` | Repeated first page | One pagination envelope |
| API-GAP-029 | P2 | Status/filter vocabularies omit or invent entity states | Records disappear/wrong counts/actions | Canonical enums and migration mapping |
| API-GAP-030 | P2 | Mobile calls multiple wrong/missing APIs and displays mock data as fallback | Resident parity and truth fail | Shared contract fixtures; no false mock production data |
| API-GAP-031 | P1 | Current tests are mostly live scripts/stale payloads; no CI, authorization matrix, contract snapshot, concurrency, upload-security, migration-from-zero, or coverage gate was found | Defects can recur without detection | Reproducible automated test pyramid and protected CI release gates |

## 8. Target API framework

### Versioning and naming

- Introduce an approved version prefix such as `/api/v1`; keep legacy routes behind measured compatibility adapters only during migration.
- Use one resource name and one command style. Avoid parallel legacy/current work-order and advisory APIs.
- Prefer nouns for resources and explicit commands only when a domain action is not a simple resource state update.
- Generate frontend/mobile clients or validate them against the same OpenAPI snapshot in CI.

### Authentication and authorization

- One global immutable `sub`; short-lived access token, refresh rotation, `jti`, issuer/audience, revocation/session records, key rotation.
- Account active/suspended/deactivated and current capability version checked on every protected request.
- Backend policy evaluates subject, module/action, jurisdiction, assignment, field classification, state, amount, and delegation.
- Default deny; no static frontend role array can grant security access.
- Rate limit by subject/device/IP/risk as appropriate; never accept a literal CAPTCHA bypass in production.

### Request integrity, idempotency, and concurrency

Every mutation needs:

- client operation ID / `Idempotency-Key` with subject and request-hash binding;
- entity version through `If-Match`, explicit `version`, or equivalent optimistic lock;
- transaction boundary covering entity and database side effects;
- transactional outbox for mail/SMS/push/provider work;
- safe replay response returning the original result;
- `409` with current version/state for conflict;
- no file finalized until validation and database transaction are ready.

### Target response conventions

| Concern | Target convention |
|---|---|
| Create | `201 Created` with resource ID/location and operation ID |
| Read | `200` with typed resource/envelope and version |
| Accepted async | `202` with job/status endpoint |
| Empty delete/tombstone command | `204` only when no response body is needed |
| Validation | `422` with stable field codes |
| Authentication | `401` without account enumeration |
| Authorization | `403` with safe capability/scope reason code |
| Missing | `404` without leaking inaccessible object existence |
| State/version/idempotency conflict | `409` with safe current state/version and recovery action |
| Rate limit | `429` with retry metadata |
| Provider unavailable | `503` with degraded/retry contract and correlation ID |

Suggested error fields: `code`, `message`, `field_errors`, `correlation_id`, `retryable`, `retry_after`, `current_version`, and `next_action`. Human copy may be localized client-side from stable codes; the backend message must remain safe and useful.

### Pagination, filters, and exports

- Choose cursor pagination for volatile operational queues or one consistent offset/limit contract for stable lists.
- Response includes items, count when affordable, next cursor/page, applied sort/filter, freshness, and scope.
- Filter before pagination in the database; never paginate then filter in application memory.
- Stable enum/date/jurisdiction semantics across list, count, dashboard, export, and UI URL.
- Large exports are asynchronous, authorization is rechecked at generation/download, CSV injection is neutralized, file expires, and access is audited.

### Files and documents

- Private object storage or non-public filesystem; authorized signed/streamed downloads only.
- Stream size enforcement, extension + MIME + magic-byte + decoding validation, malware/archive scanning, safe generated filename, metadata policy, checksum.
- Target existence and resource permission before upload; quarantine until scan completes.
- Classification, retention, expiry, legal hold, version, uploader global subject, access events, disposition/tombstone.
- Report evidence, resolution proof, identity images, and official records use distinct policies.

## 9. Security, privacy, records, and model gates

### Mandatory security/privacy gates

- Threat model covers identity/OCR/PhilSys, BOLA/IDOR, uploads, storage bypass, JWT/session, CORS/CSRF/XSS, exports, GPS, AI prompt/data leakage, and admin privilege escalation.
- No production fallback secrets/test CAPTCHA, wildcard credentialed CORS, sensitive request/response logging, or plain HTTP mobile default.
- Encryption in transit and at rest, secrets management, least privilege, dependency locking/scanning, backups, restore rehearsal, and incident notification rules.
- Data protection assessment identifies purpose, legal basis/authority, minimization, retention, processors, data-subject correction/appeal, and breach handling.

### Records/audit gates

- Audit append-only store with actor global subject, source, correlation, before/after or event payload, timestamp, and integrity control.
- Public timeline is a deliberate projection; internal notes never leak through public flags or exports.
- Business deletion is archive/tombstone/disposition; audit is never cascaded away.
- Legal hold overrides automated retention and is immediately auditable.

### AI/analytics/predictive gates

- Human remains accountable for identity exception, civic priority, rejection, budget, procurement, assignment, permit, and completion.
- Model/provider/version, input window, confidence, limitations, source records, override reason, and degraded state are visible where decisions depend on output.
- Deterministic tests, drift/equity/error monitoring, fallback, kill switch, and rollback.
- Demo/random/mock results cannot be mixed with operational records.

## 10. Cross-system QA and traceability framework

### Required test matrix

```text
story and acceptance criterion
× actor/capability/jurisdiction/assignment
× identity/session state
× entity source/target state and version
× happy/alternate/error/retry/replay/concurrency
× database/audit/timeline/outbox/storage/provider effects
× web/mobile/field client
× 320 px/desktop/zoom/keyboard/screen reader
× light/dark/system and English/Filipino
× privacy/retention/export classification
```

### End-to-end golden scenarios

| Scenario | Required assertions |
|---|---|
| Resident simple repair | One subject/account/ticket; triage→WO→proof→resolved→one feedback; all events reconcile |
| Duplicate incident | Second operation links to canonical ticket without exposing reporter or duplicating work |
| Information needed | Resident receives structured request, submits correction, and case returns to review with history |
| Project/procurement | Report/project/BoQ/funds/BAC/NTP/work/FQA/asset/closeout all meet sequential gates |
| OBO complaint | Inspection/reviews/payment/notice or permit/appeal/reinspection/clearance synchronize safely |
| Offline field/resident replay | Same operation IDs yield one ticket/transition/evidence set after reconnect |
| Authorization | Resident and every wrong role/jurisdiction/assignment fail at UI and API without object leakage |
| Suspension/role change | Existing session loses access immediately; audit records before/after and actor |
| Legal hold/disposition | Held file cannot delete; approved disposition tombstones without erasing audit |
| Provider/model outage | Core manual workflow remains truthful; no false success, mock data, or orphan side effect |

### Traceability record

```text
Story/acceptance ID:
Business process and owner:
Actor/capability/jurisdiction/assignment:
Entity and source→target state/version:
Endpoint/OpenAPI operation ID:
Request/response/error/idempotency contract:
Data classification/retention/legal hold:
Audit/timeline/outbox/provider effects:
Figma frame/component/version and content locale:
Automated tests and manual evidence:
SLO/telemetry/alert:
Feature flag/cohort/migration/rollback:
Decision/ADR and signatories:
```

## 11. Integrated SDLC gates

The role-specific SDLCs govern their streams. These cross-system gates prevent one side from shipping against a contradictory contract.

| Gate | Required approval/evidence | Blocks |
|---|---|---|
| G0 — Product/process baseline | Signed service blueprint, owners, outcome/guardrail metrics | design freeze |
| G1 — Identity/security/privacy | Global subject, session/RBAC, data inventory, threat/DPIA, retention | API/data implementation |
| G2 — Lifecycle | Report/WO/project/procurement/OBO adjacency, evidence, actor, exception map | workflow design and backend mutation |
| G3 — API/data | Versioned OpenAPI, errors, pagination, idempotency/version/outbox, ERD/migrations | frontend/mobile integration |
| G4 — Design | Figma flows for happy/alternate/failure/denied/offline/light/dark/locale/accessibility | UI implementation acceptance |
| G5 — Test readiness | RTM, fixtures, role/state matrix, provider stubs, environments | release candidate |
| G6 — System/security QA | Contract/integration/E2E/concurrency/upload/PII/a11y/performance passes | UAT |
| G7 — Operational UAT | Resident and every staff role scenario, SOP/runbook/training | production go/no-go |
| G8 — Release/rollback | Clean migration/backup/restore/rollback/flags/monitoring/on-call | production deployment |
| G9 — Observation | SLOs, guardrails, reconciliation, incidents stable for approved window | broad rollout |

## 12. Definition of system release readiness

PULSO is ready for a frontend implementation release only when:

- resident and government stories agree on one report lifecycle and public/internal vocabulary;
- every current endpoint in scope is retained, versioned/migrated, or explicitly retired with consumer evidence;
- no known P0/P1 contract gap remains open;
- backend authorization and resource/field scope pass the full role matrix;
- identity/session, state/version, idempotency/outbox, audit/retention, and secure-file contracts are executable;
- web, mobile, field, backend, database, provider, and record side effects reconcile in golden scenarios;
- critical tasks pass accessibility, responsive, light/dark, English/Filipino, low-network, and provider-outage testing;
- a clean database can be migrated reproducibly and a supported prior version can upgrade/rollback safely;
- telemetry, SLOs, alerts, support/SOP, incident response, feature flags, cohort rollout, and rollback are owned;
- product/service, resident operations, government operations, QA, frontend/mobile, backend/data, security/privacy, records/legal, accessibility/localization, finance/procurement where applicable, and on-call owners sign the go/no-go record.

## 13. Decisions required before design or implementation freeze

1. Global identity/actor namespace and migration strategy.
2. Canonical report lifecycle, resident labels, exceptional states, and archive/stat mapping.
3. Canonical WO, project/FQA, procurement, and OBO transition services and proof rules.
4. Backend-authoritative capabilities, jurisdiction, assignment, PII/field/export scopes, delegation, and emergency access.
5. API v1 naming/version, response/error/pagination, idempotency/version conflict, and outbox conventions.
6. Secure evidence/identity/document storage, retention, legal hold, access audit, and disposition.
7. Resident manual-review/appeal, KYC/trust policy, and assisted-service owner.
8. Finance/ObR/BAC/NTP/segregation rules and approval thresholds.
9. Analytics PII/export policy and predictive/AI model governance.
10. Offline resident/field sync and replay/reconciliation protocol.
11. Migration baseline, test environments/data, production topology, dependency lock, CI gates, backup/restore/rollback.
12. Named owners and approval dates for every decision above.
