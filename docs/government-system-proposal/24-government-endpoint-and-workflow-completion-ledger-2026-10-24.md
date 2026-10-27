# Government endpoint and workflow completion ledger

Status: observed development implementation and outstanding work, 24 October 2026. The full government-side objective remains active. This ledger continues document 16 and the user's implementation instructions; it is not a claim that every endpoint or workflow is finished, LGU-approved, or ready for production.

26 October follow-up: [26 — Settings and live UI](26-operational-settings-and-live-ui-verification-2026-10-26.md) and [27 — Resident administration](27-resident-administration-and-confirmation-2026-10-26.md) supersede the corresponding open items below. The current inventory contains 218 selected-family routes with no duplicate registrations. Project coordination, provider delivery, remaining legacy access review and all-route acceptance remain open.

Later 26 October follow-up: [28 — Project coordination](28-project-coordination-evidence-and-report-closure-2026-10-26.md) implements the project/work/evidence handoffs and explicit report closure described there. Its current inventory has 224 selected-family routes. Remaining planning interfaces, direct report-to-project creation, provider delivery, data recovery and final all-route acceptance are still open.

27 October follow-up: [29 — Report referral and notification delivery](29-report-project-referral-and-notification-delivery-2026-10-27.md) implements direct referral and consent-aware in-app/opt-in email delivery. The selected inventory has 227 routes. Phone push, actual provider acceptance, live checks, planning interfaces, data recovery and remaining retained-endpoint/access work are still open.

Later 27 October follow-up: [30 — Retained engineering workflows and access](30-retained-engineering-workflows-and-access-2026-10-27.md) supersedes the identified planning/survey, historical financial-read and staff-location gaps where tested. It adds project assessment/planning queues and a read-only historical reference view. The selected inventory has 228 routes and the final guarded suite passes 231 checks. Specialist planning tools, remaining API/privacy review, records lifecycle, provider/phone work, data recovery and final live acceptance remain open.

Follow-up: [25 — Staff administration and account lifecycle](25-staff-administration-and-account-lifecycle-2026-10-24.md) supersedes the staff-account gaps below where implemented. The linked inventory is regenerated and now contains 215 selected-family routes; the 209-route figures below describe this earlier pass.

## Scope and authority

Reports remains the implementation reference for the government workspace. The user's P0 monitoring through P5 immediate-response order remains in effect. PULSO records sourced budget disclosures in public updates and links to official bidding information; it does not process budgets or procurement. Existing historical financial records must remain accessible under their access and retention rules.

The current code provides development behavior. Staff delegation, official signing authority, response commitments, project stages and OBO responsibilities remain policy dependencies until the responsible LGU owners confirm them. In particular, recording an externally issued permit decision does not establish that the City Engineering Department can issue that permit through PULSO.

## Endpoint coverage

The reproducible [inventory script](../../scripts/inventory_government_endpoints.py) imports registered FastAPI routes without invoking startup or calling endpoints. Its [JSON output](government-endpoint-inventory-2026-10-24.json) lists **209 routes** in the selected government, administration, report, analytics, publication and notification families. There are **no duplicate method/path registrations** in that inventory.

The inventory is an inspection aid, not an authorization certification. A dependency name, route count or successful GET is not evidence that every mutation, failure path and role combination works. Routes outside the selected families require separate coverage; the full application has more routes than this inventory.

| Source | Registered routes | Current evidence |
|---|---:|---|
| `gov_router.py` | 101 | Core work, infrastructure, inspections and selected legacy scope paths exercised; remaining legacy/project routes need review |
| `admin_router.py` | 14 | Audit status corrected; staff and settings workflows still incomplete |
| `announcements_router.py` | 18 | Governed drafting, association review, release, correction, withdrawal and documents exercised in integration checks |
| `report_review_router.py` | 4 | Review ownership, routing and severity paths exercised |
| `document_router.py` | 7 | Scoped metadata, registry/counts, private retrieval and legal-hold access exercised |
| `predictive_router.py` | 11 | Evidence-backed maintenance planning paths exercised; not all model/endpoint behavior certified |
| `analytics_router.py` | 15 | Relational service-analysis paths implemented; full legacy endpoint review pending |
| `spatial_router.py` | 4 | Spatial context exists; complete access/privacy review pending |
| Selected routes in `main.py` | 35 | Legacy publication bypasses removed; other route families need separate review |

## Changes in this pass

**Publication security.** Legacy news/advisory create, edit and delete commands could bypass the reviewed Updates workflow. They now require authentication and the relevant capability, then return a 410 directing the caller to the existing governed publication workspace. Historical public reads remain available. AI advisory generation is a scoped draft operation: it returns a review-required draft, does not publish it, and reports provider failure rather than claiming success.

**Documents and historical record access.** Legacy document aliases, registry counts, report archives and process timelines now use the same district-scope checks as the current workspace. Document metadata is projected from an explicit field list; filesystem paths and internal storage metadata are not returned. Legal-hold mutations check the target document's scope before saving. Project/report mapping now has one registered handler, recognizes a direct source report as well as work-order relationships, and checks access to both records.

**Alternative mutation paths.** Existing work-order edit/status/approval/promotion paths now check the target assignment/scope before mutation. Project and OBO read/write routes check the actual target record's district. New operational records reconcile canonical barangay/district identifiers before their scope check, rejecting contradictory lookups.

**Building inspections.** Replaced the sample-backed legacy page with the existing shared government primitives: search, status queues, server pagination, record panel, Details/Activity sections and centered native confirmation dialogs. No new visual system was introduced. The page no longer supplies sample applicants after a failed request, invents application IDs, substitutes default fees, marks receipts paid in local state, or shows a saved outcome after a rejected request. Forms retain input and surface the server error.

The inspection API supplies eligible active, unsuspended staff and canonical area options. Assignment validates the inspector against the record's district. Scheduling requires both an inspector and a date. Compliance is an explicit choice; findings and observed concerns are required when applicable. Technical reviews validate the discipline/outcome and preserve the review notes in audit history. Closed records reject later technical reviews. Basic transition guards reject unsupported stage jumps, and updates lock the inspection row while saving.

Inspection decisions now record an official reference and reason. A permit/clearance record requires recorded compliant findings. Such a decision no longer automatically resolves a linked resident report. PULSO's ordinary report/work verification path remains responsible for that outcome. Unsupported evidence URL fields were removed from these forms rather than displaying an upload that the server does not save.

The Activity section reads saved audit entries. Historical OBO entries lack a dedicated OBO foreign key, so this endpoint matches the complete generated OBO reference; it does not manufacture events from timestamps. Dedicated typed event linkage and full concurrent-edit protection remain follow-up work.

**Audit truthfulness.** The old administrative audit check counted rows sorted by ID and reported “100% intact” and cryptographic protection. That does not detect edited or deleted historical content. The API and UI now distinguish available event history from unconfigured historical integrity verification. They return no invented integrity score or verification timestamp. No cryptographic verifier was added or claimed in this pass.

## Completion matrix

| Work area | Implemented evidence | Work still required before calling the area complete |
|---|---|---|
| Report intake, ownership and severity | Automatic eligible review routing, manual ownership, P0–P5 assessment, shared map/table docket and scoped actions | Final role/scope matrix across alternate report APIs; final live keyboard/theme/zoom review; LGU delegation and response policy |
| Map investigation | PostGIS reference boundaries, orange selection/hover, report pins/groups, density view, linked/nearby investigation and list alternatives | Final geometry-owner acceptance and interaction review across themes/breakpoints; reference geometry is not certified survey data |
| Work orders | Paginated queue, eligible assignment, start/block/unblock, evidence submission and independent verification | Full review of alternate legacy commands and notification recipients; project handoff completion |
| Infrastructure | Paginated register, condition assessment with stale-score conflict, history and location investigation | Complete alternate asset/maintenance endpoint review; operational validation of stored records |
| Predictive maintenance | Condition/report/history evidence, minimum-history interval suggestion, human-created work | Model evaluation, data quality validation and engineering acceptance; no validated failure-date prediction is claimed |
| Updates and resident participation | Reviewed release, inline documents, reviewed report links, corrections/withdrawal and durable private in-app notices | Configure and exercise email/phone delivery, preferences, retries and deep links on supported devices; confirm publishing authority |
| Records | Scoped registry, document retrieval, metadata and legal-hold checks | Complete retention/hold lifecycle and legacy alias review; confirm records ownership and schedules |
| Inspections/OBO | Real queue, actual staff/area choices, saved findings/reviews, referenced decisions and saved activity | Confirm inter-office responsibility; typed event linkage, complete concurrency safeguards, evidence-document linkage, appeal and receipt/fee workflow review |
| Projects | Scoped records and selected access paths | Reconcile legacy project stages with the disclosure-only boundary; implement legitimate evidence/inspection/certificate and external-dependency handoffs. A blocking response is not a finished project workflow |
| Administration/staff | Existing administration endpoints; audit-status claims corrected | Redeemable expiring invitations/reset tokens and real delivery status; canonical jurisdiction editing; role/role-ID synchronization; per-action permission checks; atomic mutation/audit transactions; last-administrator concurrency protection |
| Settings | Existing saved setting/history structures; misleading explanatory copy reduced in earlier pass | Remove GET-time seeding of unsupported policy defaults; validate values and expected versions; save history/audit atomically; connect supported settings to real behavior and show unsupported integrations as unconfigured |
| Remaining legacy interfaces/APIs | Inventory exposes the retained surface | Review staff location privacy, design/survey/analysis aliases, historical financial reads and other uncovered routes. Preserve useful functions and access-controlled history; do not declare completion by disabling legitimate work |
| Shared accessibility and reliability | Native dialogs, labeled fields, real failure states and responsive shared primitives | Final live visual, keyboard/focus, 200% zoom, 320 px, forced-colors and light/dark acceptance checks on all retained screens; bundle size remains a performance follow-up |

## Validation and runtime

- Guarded disposable PostGIS run: **113 passed**, covering `test_government_workspace.py`, `test_government_access_guards.py` and `test_extended_command_reliability.py`. This is the tested subset, not 209-endpoint completion. The configured application database was not reset or seeded by these checks.
- The first full run found two tests that expected a project-stage response without creating a target project. The new target-record scope guard correctly returned 404. The fixtures now create an existing project before checking that budget commands return 409; the subsequent full run passed.
- Targeted frontend lint: **0 errors**. Administration retains 10 existing unused-variable/hook warnings. The production build passes with the existing large-bundle warning.
- The local API was restarted on `127.0.0.1:33159`. Authenticated read-only runtime checks returned 200 for the inspection queue/options, work-order queue, infrastructure register, audit-status endpoint and legacy document registry. The configured development database returned one inspection, 34 work orders, 34 assets and 27 available canonical area options. These are development records, not verified City data.
- No applicant, permit decision, report severity, staff account, published update or external notification was created in the configured application database for this verification. Persisted mutation checks used the disposable database.
- Current browser access is disabled in Work settings. The newly composed inspection screen and audit-copy changes therefore have build/lint/API evidence but no new live visual or accessibility sign-off. Prior browser evidence is described in document 23. No new Figma inspection or mutation is claimed; current Reports components remain the implementation reference following the user's steering.

## Next implementation sequence

1. Complete administration account lifecycle and canonical staff scope; remove false invite/reset and MFA outcomes.
2. Make settings/history/audit transactional and truthful about configured versus operational features.
3. Finish project evidence, inspection, external-dependency and certificate handoffs without reintroducing budgeting/procurement processing.
4. Cover the remaining retained endpoint families and notification delivery behavior with role/scope, failure and concurrency checks.
5. Complete the final live government/resident continuity and accessibility review when browser access is available, then obtain the remaining operational decisions from the named LGU owners.

Implementation owner: current repository work. Operational approvers: LGU product, engineering, communications, records, GIS and privacy owners, still to be named. Version: 1. Last validated: 24 October 2026. Changes are in the shared working tree; no deployment or commit is claimed.
