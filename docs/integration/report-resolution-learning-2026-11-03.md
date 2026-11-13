# Concern resolution learning history — 3 November 2026

**Status:** Backend collection/read APIs implemented locally; not deployed. No ETA model, model benchmark or new government/resident screen is claimed. This follows the [report-intelligence foundation](report-intelligence-foundation-2026-11-01.md), [validation assignment](automatic-report-assignment-2026-11-03.md) and [first-party field inventory](first-party-field-inventory-2026-11-03.md) increments.

## Clocks and the implemented target

The new operational data target is `all_linked_reports_verified_resolution`: earliest receipt of evidence in the current concern membership to the latest authoritative resolution verification among its distinct linked reports. Multiple reports of one concern contribute **one case row**, with report count retained separately. This does not establish a city service promise or change the approved report lifecycle. It is a conservative collection target pending any more detailed partial-concern policy.

The timestamp is when the existing authorized staff workflow verifies report resolution. It is not a claim about when physical repair actually ended, active crew effort, cost, or citizen confirmation. Existing work-order/project controls and separation of duties remain authoritative. Their underlying evidence quality still needs audit before model training; a recorded staff verification is not an independent field accuracy benchmark.

Cases with any still-active member remain `right_censored`; elapsed days means observed waiting age, not a completed duration or a zero-day outcome. Cases closed without adequate sourced verification remain `unverified_terminal`. Cancelled/rejected/duplicate/spam terminal outcomes remain `non_resolution_terminal`. Bad chronology is `data_quality_error`. These are learning-record states, not new resident lifecycle statuses.

## Frozen intake features

Current web intake atomically saves one `ReportLearningSnapshot` with the original received time, submitted categories, item/category mapping, reported barangay, location source/uncertainty, photo source and initial observation count. It omits resident identity/contact data, raw descriptions/photos, exact coordinates, final report count, later priority, approvals and completion evidence. Subsequent changes do not rewrite the snapshot.

Case features come from the earliest linked report's frozen snapshot, restricted to its relevant observation items. The frozen received time takes precedence over a subsequently edited report date. Final linked-report counts and verification sources are outcome/context fields, not intake predictors. Historical/direct legacy records without a snapshot return `not_recorded_at_intake`, with null features; no retrospective feature snapshot is manufactured.

Multiple concerns from one multi-item report can share a report ID. Any later dataset split must group that connected set together, as well as controlling physical asset/area overlap. These APIs do not perform a historical replay of concern associations or establish that current membership was known at the earliest submission. A future submission-time estimator must explicitly govern that linkage/availability distinction.

## Sourced events and invalidation

New authoritative resolution transitions append `ReportResolutionEvent` in the same transaction as the report/timeline change, with a unique timeline reference and a foreign key to the independent work-order inspection or reviewed project. A bare `resolved` string, a checkbox outside that workflow, or a later `updated_at` value does not generate a completion event. Existing resolved statuses are not backfilled.

Work-order and project report-resolution commands supply their actual verification reference. Failed inspections and rolled-back commands do not create verified labels. Repeating an unchanged report status does not create another resolution event. Recorded rework/status regression invalidates a prior verification. A later authoritative verification supplies the new timestamp while retaining the original event history and single current concern row.

Reads also verify current source validity and check intervening **report** status transitions, including legacy timeline transitions that did not write a learning event. Work-order/project activity entries are excluded from that report-transition check. Citizen confirmation of an already resolved report preserves the staff verification timestamp. No command here automatically closes reports, changes assignments, dispatches work or rewrites concern completion state.

## Private read APIs

| Route | Result |
|---|---|
| `GET /api/gov/report-learning/cases?after_id=0&limit=50` | Cursor page of current concern membership, frozen intake features, sourced outcome/censoring and descriptive page summary. Maximum page size 100. |
| `GET /api/gov/report-learning/cases/{concern_public_id}` | One complete accessible concern record. |
| `GET /api/gov/report-learning/observed-repair-intervals?asset_id=...` | Separate, reviewed first-party field observation intervals. |

Active, accepted staff accounts need both existing insights and reports access. Explicit module denials and district/self-work restrictions still apply. Every report in a concern must be accessible; mixed-access membership is omitted wholly from a page rather than exposing hidden report IDs or counts. A direct inaccessible concern request is denied. Field intervals additionally require maintenance view access and asset scope.

These are private operational records, not an anonymized public dataset: report IDs, area IDs and rare category combinations can still identify incidents.

Each request uses a separate PostgreSQL **read-only, repeatable-read** transaction after authentication. Reads do not seed data, synchronize states or backfill features. Each row carries an as-of timestamp and a fingerprint covering membership/report versions, events and currently valid event sources. Pagination is not a single transaction across requests; a future export must retain page as-of times/fingerprints and audit membership changes.

The page summary's completed-duration median describes completed records on **that page only**. It explicitly retains open cases elsewhere in the same dataset and must not be presented as a forecast, citywide average, survival estimate or barangay service guarantee. Empty/no-completion history returns a null median. The existing report-intelligence estimate still returns no numerical prediction until an evaluated model is released.

## Independent observed change intervals

For an asset, the interval API uses accepted, independently reviewed, visible first-party observations with confirmed identity, reviewed location and attached private evidence belonging to that asset. Pending/rejected, unsafe/unobserved, identity-uncertain, evidence-missing and future observations do not establish a repair interval.

The latest `defect_observed` finding followed by the first `no_defect_observed` finding for the reviewed site yields `(last_defect_time, first_no_defect_time]`. A later defect finding updates the lower bound. This generic condition rubric does not establish the identity of an individual defect across time. Unknown visits do not become negative labels. Conflicting positive/negative findings at the same timestamp break the chain and are counted as ambiguous. An unmatched last defect remains explicitly open.

The result records interval width and source observation IDs. `exact_repair_time` and `predicted_days` remain null. The change might reflect repair or another cause; responsible agency, method and exact completion are unknown. These intervals never enter official service-duration history. At most the latest 1,000 eligible observations are inspected; truncation is explicit and the boundary timestamp group is omitted to avoid using a cut-off contradictory group.

## Schema, rollout and verification

Migration `27e1f2a3b4c5` follows `26d0e1f2a3b4`. It adds only the intake snapshot and sourced resolution-event tables; it does not infer historical dates or manufacture cases. Bootstrap scripts, CI checks, schema inventory and the guarded disposable-test runner reference head 27. The configured application/production databases were not migrated.

Use the existing reviewed migration workflow before deploying this code. The new history references retain report/timeline/verification lineage. A downgrade removes the new history tables and therefore requires retaining their data when planning an operational rollback.

Verification covers single-case counting across multiple reports, frozen features, open/censored and non-resolution records, missing legacy provenance, atomic rollback, work-order/project sources, rework and later verification, resident confirmation, source revocation, complete scope enforcement, multi-item shared-report grouping, read-only snapshots, and separate observed-change intervals. Test records, boundaries, dates and photographs are explicitly synthetic; they are not real completion history or model evidence.

- **Final regression: 171 passed** across report learning, project coordination, government workspace, resident/government integration and field inventory. This includes correcting a regression where work-order timeline entries were initially mistaken for report regressions.
- The earlier **60-pass** run also exercised report intelligence. These runs overlap and are not additive coverage counts.
- Python compilation and Git whitespace checks passed. Tests exercised real FastAPI endpoints and the guarded disposable PostGIS database. No live deployment, frontend/browser/Figma change, physical-phone test, external provider call or model training was performed in this increment.

## Next dependencies

Follow-up: the [concern learning dataset audit](concern-learning-dataset-2026-11-04.md) adds a private versioned export for current membership and audit purposes. The point-in-time training dataset and evaluated estimator remain future work.

Collect authentic completion and repeat-survey records in a bounded pilot; audit evidence and corrections; define outcome/identity adjudication and governance; then export versioned datasets with connected report/asset groups and true availability times. Compare descriptive baselines with an appropriate quantile/survival/interval method using later-period holdouts. Release no ETA or maintenance prediction until its target-specific performance, interval coverage, uncertainty and abstention rules have been measured and accepted. Survey UI, image embeddings/object identification, independent phone-location trials and live design handoff remain separate work.
