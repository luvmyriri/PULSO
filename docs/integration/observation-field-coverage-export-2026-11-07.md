# Observation/category condition-coverage export

Status: implemented local backend and offline audit tooling, November 7, 2026. Technical owner: PULSO engineering. Independent episode/condition adjudicators, data stewards and model-release owners remain outstanding. This follows the [per-category field assessments](observation-field-assessments-2026-11-07.md). Staff UI remains pending its UX/Figma review. This work does not approve condition data as a maintenance-model training dataset.

## Coverage and two separate targets

`GET /api/gov/report-learning/observation-field-dataset?max_observations=1000` produces `pulso-observation-field-coverage-audit-v1`.

Each row represents one current reported item, its current categories and its complete accessible assessment history. **Unassessed categories stay in the export.** This makes missing evidence visible instead of reporting coverage only among reviewed successes. Current authorized legacy reports with no structured observations appear in a separate ID list, without invented backfill.

| Category coverage state | Meaning |
| --- | --- |
| `not_recorded` | No category assessment has been recorded for the item. Finding is null. |
| `historical_or_changed_context` | A recorded assessment exists, but its latest context is no longer current under the evidence checks. Finding is null in the coverage projection; original history is retained. |
| `not_assessed` | The latest relevant reviewer judgment explicitly leaves this category uncertain. |
| `reviewed_condition` | The latest relevant reviewer judgment records `defect_observed` or `no_defect_observed` at the survey time. |

The latest assessment must cover every category exactly once. Older corrections are preserved with supersession flags; they are not presented as additional current findings. A later accepted field revisit, changed report/membership/source, or unavailable/corrupted private bytes makes an affected assessment historical. Absence of a new survey is not proof that an old condition is still physically current. Recorded observation, review, assessment and export clocks remain explicit.

Each row also includes a separate **report-level completion source**. A sourced verified report-resolution event carries its event ID, verification clock and inspection/project reference; otherwise the state is `no_current_sourced_report_resolution`, with null source fields. The latter is not a physical negative finding. Sibling items share the same report-level source, while their category findings remain independent.

For example, a sourced resolved report can still have unassessed categories, historical context or a reviewed visible defect at an earlier survey time. The exporter does not turn those combinations into complete repair coverage, reconcile away contradictions, infer causation or calculate exact repair duration. Category and report counts describe this exported observation population, not distinct physical assets repaired or a city-wide completion rate.

## Provenance and checks

The export includes immutable assessment revisions, strict recorded source snapshots/checksums, category findings, original/current report/concern references, private asset/field/photo references, and current-context reasons. It checks complete revision chains, consistent sibling completion, category completeness, source clocks, independent actors, explicit identity review, matching recorded area and private evidence consistency.

Private photo bytes are checked on the server and never included. The checker reads each selected photo once, up to its recorded size plus one byte to detect an oversized file. The extra byte is charged to the scan budget. A corrupted large file with a false tiny size therefore cannot force an unbounded read. Changed/missing bytes retain the recorded judgment as historical; they do not silently remove the row or become a successful negative finding.

Raw coordinates, device metadata, photo URLs/bytes/paths, report text, contact details and reviewer reasons are omitted. Hashes preserve context consistency without copying those values. Actor/reference IDs and clocks remain private operational data, not anonymized records. Source identity and physical authenticity remain unattested; checksums do not independently establish either.

The manifest always retains `training_release_eligible: false` and `model_status: not_a_prediction`. Condition absence does not establish repair or asset remaining life. Current report/membership/source information is an export-time audit, not prediction-time features or historical as-of replay. Existing LightGBM completion experiments and maintenance labels are not changed automatically.

## Authority, whole records and bounds

Active staff insights, reports and maintenance-view access are required. Current report access, every historical assessment/source report and asset, and original recorded barangay scopes are rechecked. An inaccessible history omits the whole observation without exposing its hidden history/counts. The coverage denominator is **exported full-lineage observations**, not an assertion of complete city coverage. Legacy report IDs are individually report-authorized.

The database read uses one repeatable-read read-only snapshot. File consistency checks occur during that bounded read; this is not a transactional filesystem snapshot or a physical freshness guarantee. All responses are private downloads with `no-store`, `nosniff`, content checksum and exclusive collector output.

Resource limits are 10,000 reports/observations/assessments/resolution events per scan, 1,000 assessment revisions per item, up to 5,000 exported items, 32 MiB serialized output, and 64 MiB private evidence scan including overflow-detection bytes. Bounds fail the whole request with no partial export. They are resource limits, not approved data-quality or service thresholds.

An explicit `report_id` filter selects a complete single-report slice for manageable pilot collection. Its ID is recorded in the manifest and verified by the collector. The filter does not bypass historical scope or truncate an oversized history. Unspecified selection means the current authorized scope. Collection across slices needs a declared sampling plan; selecting only successful reviewed reports would bias the data.

Two within-export grouping strategies are supplied: shared report/current-or-historical concern, and an extended graph that also groups shared recorded asset, field or exact photo hash. These are conservative evaluation-leakage keys. They do not merge reports or certify physical identity. Group IDs depend on the current exported graph; combine source keys and recompute groups across slices or snapshots before future evaluation instead of assuming different IDs prove independence.

## Collection and offline verification

Use an existing staff-controlled directory. The staff bearer token is read from `PULSO_LEARNING_TOKEN`, never placed in an output file or command argument. Replace the illustrative report ID and file names with the actual collection plan:

```powershell
backend/.venv/Scripts/python.exe backend/scripts/export_report_learning.py fetch `
  --dataset observation-fields --report-id 42 --max-cases 1000 `
  --base-url http://127.0.0.1:8000 `
  --output C:/PrivatePulso/observation-fields-01.json

backend/.venv/Scripts/python.exe backend/scripts/export_report_learning.py verify `
  --input C:/PrivatePulso/observation-fields-01.json
```

`--max-cases` maps to `max_observations` for this dataset. Omit `--report-id` to request the full bounded authorized scope. Other dataset types reject this filter. The collector recognizes the four supported audit schemas, rejects a valid schema or report selection different from the request, refuses redirects/unsafe origins/output overwrite, and verifies the full contract before saving. Offline verification needs no database, provider or network. Deeply malformed input produces a generic private error rather than an output.

## Verification and remaining work

**133 distinct checks passed** across the new audit, existing assessments/collector, checkpoint cohorts and actual LightGBM candidate: a 131-check regression run followed by a 35-check focused collector/offline run that added two malformed-input cases. This includes **34 new audit checks** (23 offline and 11 real API/PostGIS checks). Tests use constructed fixtures and actual product routes on disposable PostGIS. They check unassessed denominators, complete corrections, source/coverage tampering, category-condition consistency, separate report verification, historical authorization, missing/corrupted bytes, bounded scans, photo-check caching, legacy gaps, single-report selection and collector safety. A standalone subprocess verifies with database, provider and network access blocked. Missing metadata and deeply nested JSON fail without echoing private content. Python compilation and changed-file whitespace checks also passed.

[SAMPLE contract export](evidence/observation-field-coverage-SAMPLE-2026-11-07.json) contains invented references, hashes and times for unassessed, reviewed and historical categories. It is explicitly synthetic and does not demonstrate city condition, repair history or model accuracy. No new dependency, migration, frontend/Figma change or production rollout is part of this increment. Schema stays `31c5d6e7f8a9`.

Next: reconcile the staff assessment interface with the approved UX/Figma contract, collect authentic prospective evidence with an independent adjudication plan, and define category/physical-episode sampling and learning targets. This audit supports that review; it does not itself supply approved training labels, calibrated ETA or validated predictive maintenance.
