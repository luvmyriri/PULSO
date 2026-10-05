# Government implementation checkpoint

**Status:** observed implementation on `codex/government-finalization`; not a production approval. The user approved the documented government proposals as product direction on 2026-10-06.
**Updated:** 2026-10-06.
**Base:** `Latest-pulso-resident` at `4141c289`.

## Working paths

- Active government accounts are required for staff APIs; suspended accounts are denied.
- Report verification, reasoned field-work approval, and assignment to an eligible active official are separate server decisions. Rejection requires a reason and does not penalize the resident's trust score.
- Work orders move through assignment, in-progress work, private completion proof, and independent inspection before report resolution. Field workers can read and act on their own assignments.
- Government report queues no longer substitute sample incidents, evidence, coordinates, timestamps, activity, or successful outcomes for missing server data. Failed refreshes remain visible as failures; cached queue data is marked stale.
- The document registry requires government records permission, an existing linked record, safe filenames, private storage, and authenticated file delivery. Public static uploads reject government document paths.
- Legacy report dispatch, hard deletion, direct resolution, old work-order creation, budget approval, and project certificate shortcuts cannot skip the governed workflow.
- Existing SMS provider changes from the original checkout are preserved in this branch.
- Full report queues, archives, engineering dockets, information requests, project mapping, and operations triage are limited to dispatch roles. Repeated information requests cannot produce duplicate notifications while the ticket awaits a resident response.
- Report-driven work orders require an approved report and reject a second non-cancelled work order. Consequential report and work-order decisions lock their database rows during the state check.
- General work-order edits cannot alter cost, completion, feedback, or lifecycle state; active orders cannot be reassigned by a general edit. Approved metadata changes append an audit event. Approval, rejection, field updates, and blocker changes lock the work-order row before their state checks.
- The reporter can now answer a staff information request with an owned resident account or the secret tracking token. The response is kept on the internal timeline and audit record, a public-safe transition returns the ticket to triage, and the requesting official receives an in-app notification. The public tracking page exposes this recovery path in English and Filipino and no longer fabricates a report when the registry is offline.
- Public tracking returns a district code only when the report links to a registered barangay and its district; coordinates alone no longer produce a guessed district.
- Report intake uses an indexed 15-metre PostGIS lookup after migration; the pre-migration PostgreSQL and SQLite paths retain a bounded great-circle fallback. Field-agent suggestions use only active eligible officials with locations updated in the last 15 minutes, with PostGIS nearest-distance lookup after migration.
- The mounted predictive view now uses backend records rather than a fixed 2026 example. AI maintenance drafts require a registered asset, fail visibly when the provider is unavailable, and enter the canonical audited work-order command only after a human reason. The resulting order is **open for review**, not dispatched. Geographic/category similarity no longer counts unrelated resident reports against an asset.
- Predictive scores and illustrative costs are labeled as unvalidated heuristic inspection prompts. Analytics report detail and exports have distinct server checks; CSV cells that could become spreadsheet formulas are neutralized.
- The mounted delivery route now opens the server-backed project registry instead of a screen that substituted sample projects on fetch failure. The registry preserves last loaded records as visibly stale on refresh errors, distinguishes errors from empty results, maps its display groups from the recorded 13-state workflow, and reads district labels from registered district IDs instead of guessing from barangay names.

## Deliberate blocks and decisions still needed

- **Project lifecycle:** the current database code stores 13 phases; the design material also carries a 10-phase proposal. The six UI workflow groups are now labeled as an overview, not as a statutory lifecycle. An explicit choice between the conflicting 10- and 13-stage sources is pending before migrating persisted projects. Project resolution and certificates remain blocked pending their evidence and review implementation.
- **Money and emergency:** budget approval and emergency assignment still need concrete thresholds, sign-off, scope, evidence, and audit data contracts. A critical work priority does not activate emergency access or alerts.
- **Data scope:** the final jurisdiction and capability matrix is unapproved. Dispatch/report access is narrowed by active official role; assignment scoping is enforced for field work orders. Broader field-level and jurisdiction-level access remains a release gate.
- **Evidence and records:** report-image classification, legacy public image exposure, retention, legal hold, and disposition policy need owner approval and further implementation. Work-order proof and new government documents use private delivery.
- **Reliability:** record version checks, idempotent consequential commands, transactional notification delivery, and an end-to-end deployment exercise remain to be implemented.
- **PostGIS deployment:** migration `b72d4e_postgis_report_locations` creates the extension and indexed generated geography points for reports and field agents. The reachable local `pulso_db` is at revision `da48716fc54d`, but its PostgreSQL installation does not provide the PostGIS extension. The migration has **not** been applied or verified against PostGIS; install the extension on the target PostgreSQL instance and run/verify the migration before claiming indexed spatial operation.
- **Predictive model:** heuristic formulas are deterministic but have not been calibrated or validated against historical failures. They must not be interpreted as probabilities, confirmed schedules, or approved costs. The retired fixed insights page is no longer routed, but other government routes and exports still need a full fake-data and provenance audit.

## Verification

- Government, SMS, and spatial duplicate checks: **66 passed**.
- Focused report, government access, and resident clarification checks: **55 passed** after the work-order edit guard.
- Frontend production build passed after predictive and project route changes.
- Full backend suite: **321 passed, five older resident tests failed** for ticket prefix, tracking-token validator, token hash salt, exact anti-enumeration text, and a missing legacy `ProcessTimeline` model. These are the same five categories seen at the prior checkpoint; no new full-suite failures appeared.

Do not present this branch as a completed government release until the blocked decisions and release gates above are resolved and verified.
