# Frozen-checkpoint outcome cohort

Status: local backend/data implementation, November 7, 2026. Technical owner: PULSO engineering; independent episode/outcome adjudicators and model-release owners remain to be named. This follows [prospective checkpoints](concern-prediction-checkpoints-2026-11-07.md). It is an operational data audit, not an approved UX, trained LightGBM model, ETA promise or production release.

## Implemented scope

`GET /api/gov/report-learning/checkpoint-dataset?max_checkpoints=1000` exports `pulso-checkpoint-outcome-audit-v1`. Each row follows the exact frozen report/observation population of an immutable checkpoint. It uses the checkpoint's declared internal clock, `server_capture_before_command_commit`; it does not substitute report receipt time or claim the record was already publicly retrievable before its command committed.

The target is **all frozen member reports reaching sourced verified resolution after that checkpoint, without subsequent membership change**. Later report/observation counts, categories, routing corrections and final case size do not become prediction-time features. Changing the original intake record after capture cannot rewrite these predictors or the frozen first-receipt time.

Resolution-source checks were shared with the existing learning service: current successful status, latest verified event, valid work-order inspection or reviewed project source, and no superseding unowned lifecycle transition. Labels are assessed against one current read snapshot. This is not a historical as-of replay of source documents or permissions.

The source evidence currently verifies a **report**, not an independently tracked resolution event for each observation. A multi-observation report's closure therefore cannot by itself certify that every separate physical sub-issue was repaired. Observation-level evidence coverage and independent outcome adjudication remain necessary before interpreting these labels as physical maintenance outcomes.

## Two duration clocks

| Field | Meaning |
|---|---|
| `elapsed_days` | From checkpoint to verified completion; for a right-censored case, observed follow-up from checkpoint to export cutoff. |
| `total_since_first_received_days` | From the frozen earliest member receipt to that same endpoint. |
| `features.elapsed_before_checkpoint_days` | Service age already known at the checkpoint, before future outcome time. |

A **SAMPLE** checkpoint captured three days after first receipt and completed one day later has one day of checkpoint-relative outcome time and four days of total service time. An open case observed for two days is not a prediction of two-day completion. An excluded/competing outcome has null duration labels, never a manufactured zero.

## Outcome states and exclusions

| State | Handling |
|---|---|
| `verified_resolution` | Every frozen member has a valid source after the checkpoint; the latest member verification is the target time. |
| `right_censored` | The complete frozen population has not yet reached verified completion at the read cutoff. Partial verified members remain sourced; no final completion time is invented. |
| `membership_changed` | Concern version or exact membership differs from the checkpoint, including subsequent regrouping/separation. It is not silently relabeled against the new population. |
| `non_resolution_terminal` | A frozen member is cancelled/rejected/duplicate/spam, even if other members remain open. It is not ordinary right censoring or a repair. |
| `unverified_terminal` | A terminal alias such as completed/closed lacks the required verified outcome semantics. |
| `resolution_invalidated` | An invalidation after the checkpoint makes the original episode's resolution history unstable. Later re-verification does not silently restore this cohort label; review/new context is required. |
| `invalid_resolution_evidence` | Successful status or recorded verification no longer has valid current provenance. |
| `already_terminal_at_checkpoint`, `checkpoint_state_unknown`, `data_quality_error` | Already-terminal populations, missing source-state flags, unsupported current status or inconsistent clocks are excluded from duration/censoring labels. |

The open-state audit allow-list follows observed intake/approval/dispatch/work statuses. Unsupported values become a data-quality exclusion rather than being guessed open. These audit states do not redefine report lifecycle or permissions.

`duration_label_eligible` and `censoring_record_eligible` are descriptive audit flags requiring valid frozen features and the corresponding qualified outcome. They do not approve model fitting or establish independently attested physical episode identity.

## Frozen features and grouping

The predictor allow-list contains concern categories, current-at-capture report/observation and association-state counts, pre-checkpoint service age, frozen original barangay IDs, original location/photo source counts, and count/maximum of originally recorded issue-accuracy estimates. Accuracy estimates are not proof of the photographed object's position. No raw coordinates, photo URLs/bytes, contacts, descriptions, reviewer narratives or final report counts escape into predictors.

Whole-dataset evaluation groups preserve all checkpoints of a concern and transitive shared frozen/trigger reports. Where existing maintenance/scope permissions allow it, independently reviewed first-party survey asset references add conservative grouping keys; recorded areas add a further grouping option. Current reviewed references are **grouping-only**, not backdated predictors. If maintenance access is absent, these references are omitted explicitly.

Keep grouping assignments from the full exported cohort when later excluding unsuitable rows. Recomputing groups after dropping changed/ineligible records could remove a bridge between related samples. Physical-asset and episode independence still require a separate leakage audit.

## Access, consistency and bounds

The endpoint requires existing active staff insights/report access. Every current concern report, frozen member and trigger report must be accessible. A mixed-scope checkpoint is omitted as a whole without its counts; a fully authorized historical checkpoint of an emptied former concern can remain exportable. Unrecorded/incomplete rosters cannot support a historical scope check and are not exported.

Reads use one read-only repeatable-read snapshot. The endpoint returns the complete authorized, full-lineage cohort within `max_checkpoints` (1–5,000), or fails without a partial dataset. A 10,000-checkpoint scan, 10,000-report lineage scan, 1,000-observation per-concern check, 10,000 reviewed-reference bound and 32 MiB output limit constrain work. The export does not silently truncate to improve metrics or conceal missing pairs/cases. Staff must increase an allowed bound or narrow authorized scope when necessary.

Downloads have `Cache-Control: no-store`, `Pragma: no-cache`, a digest-bearing filename and `X-Content-Type-Options: nosniff`. Private incident/asset/area references and timestamps remain identifying operational data; the export is not anonymized.

## Python workflow

Use a pre-existing staff-controlled directory outside source control/web roots. Set `PULSO_LEARNING_TOKEN` privately to the authorized token, then use the actual local API origin or remote HTTPS origin:

```powershell
backend/.venv/Scripts/python.exe backend/scripts/export_report_learning.py fetch `
  --dataset checkpoints --base-url http://127.0.0.1:33159 `
  --max-cases 1000 --output C:/PrivatePulso/checkpoint-cohort-01.json

backend/.venv/Scripts/python.exe backend/scripts/export_report_learning.py verify `
  --input C:/PrivatePulso/checkpoint-cohort-01.json
```

`--max-cases` is the collector's shared flag; here it maps to `max_checkpoints`. The collector recognizes all three existing/new contracts, verifies schema/checksums/label semantics before saving, and rejects a response schema different from the requested dataset. Redirect refusal, token-safe errors, bounded download and exclusive output creation remain in place. Offline verification needs no database/provider call.

The strict verifier checks frozen lineage/counts, feature allow-lists, clock arithmetic, source coverage/timestamps, null labels for excluded outcomes, censoring, audit flags, evaluation groups and manifest counts. Checksums detect altered bytes, not authentic source data. API exports remain `data_origin: unattested`; synthetic fixtures can declare `synthetic`. Self-declared field collection cannot promote this contract to a training release. `training_release_eligible` remains false with fixed independent-adjudication, clock, censoring, grouping, prospective-evaluation and release-policy blockers.

## Verification and limits

- **36 integration checks passed** across the new cohort and retained learning/export behavior on the separate disposable PostGIS database. A further **3 focused checks passed** for reviewed-asset grouping/permission removal, bounded incomplete rosters, and invalidation followed by re-verification; runs overlap.
- **30 offline/collector checks passed**, including resealed invalid labels/features, wrong clocks, missing completion provenance, zero-duration/censoring misuse, shared report/asset groups, wrong-dataset responses and explicit synthetic origin.
- The API tests exercise real intake, link, inspection verification, reopening, permission scope and concurrent completion. They confirm frozen features survive later source changes and that exports do not mix snapshot states. An initial fixture-import setup error and a historical-scope test expectation were corrected; no authorization relaxation was made.
- Schema remains `30b4c5d6e7f8`; no migration, real provider/phone trial, frontend/Figma change, fitted model or production export/deployment was required for this increment.

[Constructed SAMPLE contract example](evidence/checkpoint-cohort-SAMPLE-2026-11-07.json) includes completion, right censoring, changed membership and a competing terminal outcome. Its checkpoint references/hashes are illustrative unit-fixture values, not identities of real database records. No actual repair duration or model performance is claimed.

Next: add a grouped temporal baseline/evaluation workflow that treats censoring and competing/excluded outcomes explicitly, then compare a separately controlled LightGBM candidate only with authentic, independently reviewed outcomes and an approved release policy. These rows make the prediction clock and target inspectable; they do not by themselves validate a forecast.

Subsequent implementation: [Checkpoint temporal baseline diagnostics](checkpoint-temporal-baseline-2026-11-07.md) now consumes two saved snapshots without retroactively rewriting training labels, purges jointly related future checkpoints, and reports descriptive censoring/unknown-status diagnostics. It does not approve personalized/live ETA or learned-model training release.
