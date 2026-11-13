# Per-category observation field assessments

Status: implemented local backend pilot APIs, November 7, 2026. Technical owner: PULSO engineering. Operational adjudication, privacy/data stewardship and model-release owners remain outstanding. Staff UI and any new operational policy are proposed pending their design/authority review. This extends the [first-party inventory](first-party-field-inventory-2026-11-03.md) and [completion-time experiment](checkpoint-lightgbm-experiment-2026-11-07.md); it does not change the approved report lifecycle.

## Data gap addressed

One ticket can contain several reported items, and one item can contain several categories. A report-level verified resolution is not independent evidence that every category of every physical item was assessed. The new record links **one reported observation** to **one independently reviewed first-party survey observation and its private photo**, with a finding for every category of that reported observation.

For a constructed SAMPLE road/drainage observation, a reviewer can record `Roads & Bridges: no_defect_observed` and `Water & Drainage: defect_observed`. Both findings stay on the original ticket. A sibling item receives no finding from that assessment. A wholly uncertain category remains `not_assessed`; omission is not an accepted negative.

These are explicit human condition judgments at a recorded survey time. They do not establish exact repair time, repair causation, official ownership, location accuracy, independent physical authenticity or government completion. No report status, concern membership, inventory approval, model label, prediction checkpoint or live ETA changes automatically.

## Private API contract

All paths start with `/api/report-intelligence/reports/{report_id}/observations/{observation_id}`:

| Method/path | Behavior |
| --- | --- |
| `GET /field-assessments/evidence/{field_observation_id}` | Returns the scoped reported item, selected field evidence context, private photo link, report/concern versions, field checksum, assessment revision and current recording blockers. |
| `GET /field-assessments` | Returns the latest 20 immutable assessments, current relevance checks and explicit non-exhaustive history flag. Does not create missing history. |
| `POST /field-assessments` | Appends one assessment after authority, concurrency, identity, category and source checks; requires `Idempotency-Key`. |

Responses use `pulso-observation-field-assessment-v1`, `Cache-Control: no-store` and `Pragma: no-cache`. Reads use a read-only repeatable-read database snapshot and include the check time. Stored private photo paths and raw field coordinates are not returned in these records; the existing authorized photo route serves bytes. References, actor IDs, reasons, timing and context fingerprints remain private operational data, not anonymized information.

The command contains:

```json
{
  "field_observation_id": "<actual field UUID>",
  "expected_report_version": 1,
  "expected_concern_version": 1,
  "expected_revision": 0,
  "expected_field_sha256": "<actual checksum from evidence context>",
  "identity_confirmed": true,
  "category_findings": [
    {"category": "Roads & Bridges", "finding": "no_defect_observed"},
    {"category": "Water & Drainage", "finding": "defect_observed"}
  ],
  "reason": "SAMPLE only: describe the actual object/problem comparison and category findings."
}
```

This is illustrative syntax, not a submit-ready record or evidence of actual city conditions. Versions, checksum, categories and identifiers must come from the current scoped evidence context. Every current category of the selected item must appear exactly once. For known findings, any `defect_observed` requires a reviewed defect source; known findings consisting solely of absence require a reviewed no-defect source. An all-`not_assessed` judgment preserves uncertainty.

## Evidence and authority

The source can be a PULSO-created candidate asset from original field collection; no government asset register or document import is required. It must have:

- accepted independent field review, a named reviewer distinct from its recorder, and explicit identity/location review;
- visible field evidence with a private photo belonging to the same asset;
- the same recorded barangay as the report, with the selected field source either unbound to a report or bound to this report;
- a claimed observation clock after report receipt, not in the future, with consistent observation/review times; and
- available photo bytes whose size/hash match the stored evidence record, within the existing 5 MiB bound.

File checks establish consistency with stored bytes, not physical authenticity or proof of when a photo was taken. Survey location/accuracy remains recorded evidence. Matching area, distance or coordinates alone never confirms object/problem identity. The new command requires an explicit same-object/problem human comparison; no proximity or AI inference fills that decision.

Read access requires active staff maintenance access plus access to the report, selected asset and any source report. Recording additionally requires the existing independent engineering field-review capability and report-review authority/ownership. The field recorder cannot adjudicate their own evidence. Explicit role capability restrictions continue to override defaults. No new role delegation or UI-only permission is introduced.

All historical assessment references must also remain accessible, including original frozen report/asset barangays and current source context. The workflow refuses a whole history if any required scope is inaccessible. It does not return partial assessments or hidden-scope totals.

## Corrections, staleness and failure states

`observation_field_assessments` is append-only: per-item revisions, source/item snapshots, reason, actor and server recording time. PostgreSQL triggers reject row updates/deletes, and restrictive foreign keys preserve references. Corrections require the latest assessment revision and append a new row. Report and concern versions do not increment merely because a field assessment was recorded.

| State/condition | Result |
| --- | --- |
| No assessment | Revision zero and an empty list; no inferred condition. |
| Missing category, duplicate category, unsupported category, missing explicit identity or conflicting known condition | Validation failure; no assessment or receipt created. |
| Unreviewed, self-reviewed, unobserved, missing-photo, other-report, inconsistent-clock or area-mismatched source | Recording blocked; no manufactured negative finding. |
| Another report/concern/field/assessment change after evidence selection | Conflict requiring refresh. |
| Same command retried | Original assessment identity/revision returned, with current context checks; no duplicate row. |
| Corrected assessment | Earlier findings retained, marked superseded; latest correction does not rewrite them. |
| Changed source/report/membership, inaccessible/corrupted bytes or later/same-time accepted survey | Historical finding retained; `current_context` becomes false with reasons. |
| Authority or historical scope lost | Access denied for the whole response. |
| Audit/transaction failure before commit | Assessment, command receipt and audit roll back together. |
| Commit acknowledgment lost | Original idempotent command can recover the committed assessment. |

`current_context` means the stored context remains relevant under these checks. It is not a guarantee of current physical condition or a freshness/service SLA. Always interpret the original `observed_at`, review and record clocks. A later pending survey does not invent findings or supersede an accepted review; a later accepted survey requires a new category assessment. Existing model workflows receive no automatic new label.

Writes serialize on the report, concern, selected asset and field source. Source hashes and optimistic revisions detect stale decisions. A maximum 1,000 assessments per item bounds the review workflow; once reached, new writes refuse growth while existing reads/replays remain usable. Only 20 history entries are returned, with the bounded-history status explicit.

## Schema and verification

Migration **`31c5d6e7f8a9`**, following `30b4c5d6e7f8`, adds only the immutable assessment table/trigger. It has no historical backfill or automatic resolution/model promotion. Bootstrap scripts, CI schema comparison, schema inventory and disposable-test guards now target the new head. Earlier schema inventories are retained for drift checks.

The named disposable schema database passed baseline upgrade, previous/head inventory comparison and downgrade/re-upgrade. The configured application database was not migrated. Product use of these endpoints requires the normal reviewed schema rollout; no deployment was performed.

**121 regression checks passed**, including **35 new assessment checks**, on disposable PostGIS and offline synthetic fixtures. They exercise actual intake, private photo capture, independent review, multi-category assessment, sibling-item isolation, corrections, stale context, byte corruption, scoped history, row immutability, concurrent retries/revisions, transaction rollback, bounded history and lost-acknowledgment recovery. Existing intake, field collection, checkpoint export and actual LightGBM candidate checks also passed. Python compilation and changed-file whitespace checks passed. All cases are synthetic. No real field truth, live ETA accuracy or production readiness is claimed.

Next: reconcile a staff assessment workflow with the approved UX contract and shared Figma source before frontend implementation. For learning, add a separately reviewed per-observation evidence-coverage export/adjudication policy; then collect authentic prospective follow-up. These findings must not silently replace the existing report-resolution target or certify complete repair coverage.

Subsequent backend implementation: [Observation/category condition-coverage export](observation-field-coverage-export-2026-11-07.md) now retains unassessed categories, complete immutable history, current-context checks and a separate report-completion source in a bounded private audit. Independent adjudication, staff UI and any model-release dataset remain pending.
