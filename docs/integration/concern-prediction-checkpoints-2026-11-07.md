# Prospective concern prediction checkpoints

Status: locally implemented backend/data behavior, validated November 7, 2026. Technical owner: PULSO engineering; pilot adjudicators, model acceptance policy and release owners remain to be named. This is observed implementation, not an approved target UX, fitted ETA model or production deployment.

## Why this precedes ETA training

The existing [concern learning export](concern-learning-dataset-2026-11-04.md) describes current membership. If later grouping decisions or final report counts were treated as intake-time inputs, an ETA experiment could use information unavailable when the prediction should have been made. Existing exports remain blocked for training release; their history is not rewritten or silently promoted.

New `concern_learning_checkpoints` freeze the context actually known by the server while handling intake and concern-association commands. A report's first independent concern records one contributing report; a later explicit link records the destination's now-known combined membership/count. A later separation creates new snapshots while preserving both earlier contexts. A concern emptied by a move gets no fabricated prediction population.

## Captured record

`concern-prediction-checkpoint-v1` contains:

- concern reference and version, triggering report/decision, database capture time and SHA-256 of the canonical payload;
- exact observation/report membership when fully recorded;
- per-report version, frozen intake snapshot schema/receipt/availability times and allow-listed original intake features;
- terminal/successful-status flags observed at capture, retained as provenance for future exclusion of already-terminal cases;
- current report/observation counts, recognized concern categories, reviewed/unreviewed association counts and earliest available member receipt time;
- explicit feature completeness/blockers, lineage completeness and `training_release_eligible: false`.

Descriptions, contact details, photo bytes/URLs, raw coordinates, reviewer reasons and arbitrary category text are excluded. Unsupported categories, missing/late intake snapshots and unsupported association states produce incomplete records rather than invented model features. This does not block otherwise valid report intake.

The prediction clock is explicitly **`server_capture_before_command_commit`**. The server has read these values under the intake or ordered concern transaction; capture is not proof that a client could already fetch the uncommitted record at that timestamp. A later cohort must use this stated internal prediction clock or collect a separate clock appropriate to another prediction job. Capture does not substitute report receipt time or infer an earlier membership history.

Original source features are copied into the checkpoint; later changes to source records cannot rewrite its payload. Checkpoints do not contain future completion labels or final case counts. A complete feature record does not certify physical object/episode identity, feature authenticity or permission to train.

## Transactions, immutability and bounds

Intake captures after storing the original intake snapshot and observation memberships, before automatic routing. All rows commit with the original report transaction, so an original-operation replay does not create another checkpoint.

Association captures after the ordered report/concern changes and new reviewer decision have been flushed. A nonempty source concern and the destination get new version-bound checkpoints. A checkpoint failure rolls back the association, decision and history together. There is one checkpoint per concern/version, with restrictive source foreign keys and a source-kind constraint.

The database rejects row `UPDATE` and `DELETE` through an immutability trigger. This protects normal application/SQL row mutation, not a database owner's administrative DDL/TRUNCATE privileges. SHA-256 detects changed content; it does not sign or attest to data origin.

The journal materializes at most 1,000 observations per checkpoint. Above that resource bound, the reporting/link command still succeeds and records only internally available counts plus an explicit incomplete-lineage blocker. It does not store a truncated roster or make it training eligible. Such records cannot pass a historical scope check and are omitted from the private history response. This is a resource limit, not an accuracy or model-acceptance threshold.

## Authorized history API

Observed local API:

```text
GET /api/gov/report-learning/cases/{concern_public_id}/prediction-checkpoints?limit=20
```

It requires the existing active staff insights and reports capabilities. It does not grant a role or expose a resident/public route. Reads use one read-only repeatable-read snapshot and require access to every current concern report. Each historical record additionally requires access to all frozen reports and its trigger report, including a trigger that has since moved out of that concern.

Records are returned whole, newest concern version first, with a bound of 1–100 results (default 20). Inaccessible/incomplete-lineage records are omitted without exposing their roster or skipped counts. `coverage` declares bounded, whole authorized checkpoints and explicitly does not promise exhaustive history. An oversized current scope returns 409 rather than a truncated successful record. Missing accessible history returns 404; integrity/lineage failures return 409. Responses use `Cache-Control: no-store` and `Pragma: no-cache`.

Each item has the payload, its checksum and `membership_current`, compared with the concern version in that same repeatable-read snapshot. It is not a real-time subscription. Older payloads remain frozen even when this comparison becomes false. The response retains `model_status: not_a_prediction` and `training_release_eligible: false`.

## Migration and compatibility

Alembic `30b4c5d6e7f8` follows `29a3b4c5d6e7`, adding the table, constraints/index and immutability function/trigger. There is **no historical backfill**. Bootstrap helpers, CI head/inventory references and disposable-test guards now point to this head; previous revision inventories remain available for schema comparison.

Only named disposable local databases were upgraded. The configured application/production database was not migrated. The accepting schema must be installed before using this application code. A downgrade removes checkpoint data and its trigger/function; it is not a data-preserving operational rollback. Normalized inventories cover tables/columns/constraints/indexes, so dedicated SQL mutation tests verify trigger behavior separately.

## Verification

- The initial intake/learning/checkpoint run passed 42 checks. A broader run passed **63 integration checks** across checkpoints, learning exports, pair commands, availability routing, image jobs and matching evaluation exports.
- The final focused checkpoint/learning run passed **30 checks**, and the added concurrent-association snapshot check passed **1/1**. These runs overlap. They cover stable original-operation replay, link/split history, one-ticket multi-observation context, SQL update/delete rejection, atomic rollback, unsupported-feature suppression, frozen/current/trigger scope and bounded incomplete lineage.
- A fresh dedicated PostGIS database was bootstrapped, upgraded through 29 to 30, downgraded to 29 and re-upgraded to 30. Catalogs matched the stored previous/head inventories. The two SQL immutability tests passed after re-upgrade.
- Python compilation and targeted whitespace checks passed. Synthetic records only; no real provider, phone measurement, frontend/Figma change, learned ETA or deployment was exercised.

## Next development

Build a private checkpoint cohort/export that follows frozen member reports forward from the declared clock, preserves open cases as right-censored, and explicitly excludes/reviews intervening membership corrections, invalidated resolution evidence and already-terminal populations. Keep all related checkpoints/reports/assets together in temporal evaluation groups. Distinguish remaining time from checkpoint from total service duration since first receipt.

Only after authentic outcome collection and independent identity/outcome adjudication should a descriptive baseline and LightGBM candidate be compared prospectively under an approved release policy. These checkpoints supply prospective context; they do not remove those requirements or promise repair dates.

Subsequent implementation: [Frozen-checkpoint outcome cohort](checkpoint-outcome-cohort-2026-11-07.md) now materializes the authorized current outcome audit against these frozen populations, with separate censoring/competing/membership-change states and strict Python verification. It does not backfill historical checkpoints or authorize training release.
