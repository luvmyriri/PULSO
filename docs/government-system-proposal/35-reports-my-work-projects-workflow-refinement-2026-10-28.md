# Reports, My Work, and Projects: workflow refinement

**Status:** implemented changes and observed contracts, with proposed policy decisions called out below.  
**Validated:** 2026-10-28, local repository and disposable PostGIS database.  
**Owner for unresolved policy:** PULSO product owner and City Engineering Department operations lead.

## Operational ownership

| Module | Record it owns | Current responsibility |
| --- | --- | --- |
| Reports | Citizen report and intake review ownership | Validation, triage, priority, routing, report status, and the civic history. A report is not a project. |
| My Work | Personal projection of assignments and authorized review decisions | Shows recorded work-order, report-review, project, referral, and publication responsibilities for the signed-in official. It does not create a second copy of those records. |
| Projects | Engineering coordination record | Holds scope, engineering owner, external dependencies, documents, independent completion review, a primary source report, and additional related-report links. Completing a project does not resolve its reports. |

The existing shared `ReportDocket` renders report details from both Reports and My Work. My Work now opens the full docket with a return URL that retains its queue, search, and selected item. Project related-report links also open that docket and return to the selected project.

## Implemented in this refinement

- Related reports are separate rows with foreign keys to the original report and project. A project can link several related reports. Linking does not change report status, assignment, evidence, or resident record. The primary `source_report_id` remains intact for existing resolution logic.
- The project record now presents its linked work orders as the coordinated task list, with each task opening the existing work-order record. The API filters the list through work-order view permission; task ownership and verification remain in Work Orders and My Work.
- An authorized project dispatcher can open an unassigned work order from the project record with a title, scope, priority, and reason. Project version checks prevent a repeated submission from creating a second task. A new task inherits project geography; any report linked to that task must already belong to the project. The existing Work Orders queue handles assignment and execution.
- Only an official with project management and report access can link or unlink. The server checks project and report versions, scope, matching district, open project state, duplicate links, and whether the report is already in another open project. A required reason is stored with actor and time in project and report audit history.
- Project owner reassignment now rejects a duplicate assignment and records the previous and new owner, actor, reason, review date, and time. The older metadata update path also records owner changes and requires a future review date.
- Authorized dispatchers can transfer an assigned, active, blocked, or returned field work order. The server locks the row, checks the assignment version and new employee's eligibility and jurisdiction, requires a reason, and records both owners in private audit and timeline entries. Existing progress, evidence, work status, and linked report remain on the same record; completed submissions cannot be transferred. New owners receive a notification, and the personal queue reflects the transfer. General work-order edits cannot bypass the governed assignment routes.
- Manual field-assignment choices show active work-order counts and are ordered by current load. This is a decision aid for authorized dispatchers, not an automatic dispatch policy. Work-order creation now records the actual initial status in its timeline and the initial assignee in audit history.
- My Work has a **Review overdue** view based only on recorded report review targets or project next-review dates. Work-order scheduled dates are not treated as deadlines.
- Each Operations overview KPI and chart now has its own CSV export. The summary export uses one measure per row instead of mixing unlike records into sparse columns. Exports include authorized scope, Manila as-of time, stable headings, numeric counts, and the chart's selected period; incomplete source data disables export.
- Existing routes, navigation, review assignment, work-order actions, documents, external referrals, project stages, and visual system remain in use.

## Existing state mapping and policy decisions

Current report, work-order, and project states are separate persisted contracts. In particular, report review ownership is distinct from field work-order ownership. Work orders carry `assigned`, `in_progress`, `completed_pending_review`, `rework_required`, and verification states. Projects currently carry `intake`, `assessment`, `planning`, `ready_for_work`, `in_progress`, `awaiting_verification`, `completed`, and `cancelled`, with historical project stages retained.

The requested names **Submitted → Under Review → Validated → Assigned → In Progress → Pending Verification → Resolved → Closed**, personal **Acknowledged / Approved / Returned**, and project **Draft / Approved / Active / On Hold / Archived** are a proposed target vocabulary, not aliases that can safely be written into every current record. Product and LGU owners need to decide the transition and permission matrix, acknowledgement duty, pause/cancellation authority, archive/retention rule, and whether linked reports may belong to more than one active project. Until then, the existing governed transitions remain authoritative in code; no synthetic stage or approval is displayed.

Automatic report-review routing already selects an eligible active reviewer by jurisdiction and least open intake load. Work-order dispatch and project owner selection use their own role and scope rules. A cross-module specialization, availability, and workload policy is not yet defined in the account data model, so this refinement does not claim one.

## Deployment and validation

Apply Alembic revision `19f0b2c3d4e5` before serving the updated backend or frontend; both now read `project_report_links`. Run the guarded government integration suite against a disposable PostGIS database at that revision. The migration only adds a link table and its indexes; it does not rewrite existing reports or projects.

Local validation: 126 government integration tests passed against the guarded disposable PostGIS database; four CSV structure and escaping tests passed; the Vite production build and targeted ESLint passed; the migration downgrade/upgrade round trip and schema inventory check passed. The frontend detector returned no findings for the changed pages. Production deployment and live role acceptance have not been performed.
