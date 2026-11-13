# Concern learning dataset audit — 4 November 2026

**Status:** Private backend export and offline verification implemented locally. No deployment, model fit, training approval, or new estimate. Builds on the [resolution learning history](report-resolution-learning-2026-11-03.md) and [field-survey workspace](field-survey-workspace-2026-11-04.md).

## What the export establishes

`GET /api/gov/report-learning/dataset?max_cases=1000` downloads `pulso-concern-learning-audit-v1`, a JSON document with one manifest and one row per current accessible concern. A concern with five linked tickets contributes one case and five distinct report IDs. A ticket with several observations can appear in several concern rows; those rows belong to the same report component. The target is elapsed days from earliest report receipt to the latest sourced verification of **all** linked reports. It measures observed service history; the exact physical repair time is unknown.

- **Outcomes:** Verified completions keep their sourced event lineage. Open cases keep their waiting time and `right_censored` state. Unverified or non-resolution terminal cases remain visible without a completed duration. Rows with missing, unsupported, late or invalid feature records do not count as eligible duration/censoring audit rows.
- **Features:** A fixed allow-list includes frozen submitted/concern categories, reported barangay, location source, issue uncertainty, photo source and the initial number of observation items on the first report. Arbitrary categories, item keys, descriptions, contact details, coordinates, evidence links, final report counts and later decisions are excluded from predictors. Final counts and resolution sources appear only in their separate lineage/outcome sections.
- **Availability:** The export records the earliest report snapshot's stored availability time and the maximum across its members when all snapshots exist. These are database provenance times. `concern_membership_available_at` remains null because the export does not replay what an estimator could know at intake. An original snapshot is never manufactured for a legacy record.
- **Evaluation groups:** Connected components group any concerns sharing a report, including transitive overlaps. A more conservative component adds accepted, evidence-backed, independently reviewed visible survey references to an accessible asset. Another adds the frozen barangays of all member reports. Field references are current grouping evidence; they do not establish the identity of each individual defect or that the reference was known at intake. No geometry or proximity matching is used. Group IDs describe this export's membership and can change in a later export. No evaluation split is selected automatically.

Field observations can help prevent the same known site from leaking between evaluation sets. Their observed-change intervals remain a separate target in the existing field history API. An absence of a visible defect does not establish official resolution, a negative label for an unvisited site, or an exact repair time.

## Access, consistency and integrity

The endpoint uses the existing active staff insights and reports authorization and checks access to **every** linked report. It omits an entire mixed-access concern without exposing its membership or counts. Asset references also need maintenance view access and asset scope. No new role grant or resident route is introduced.

The export reads one PostgreSQL read-only, repeatable-read snapshot and uses one as-of time. It either returns the complete authorized set or fails without a partial response. `max_cases` accepts 1–5,000, defaults to 1,000, and returns 413 when the complete accessible set exceeds the bound. A separate 10,000-candidate scan bound protects reads when many candidates cannot be exported. Rows are deterministically ordered within the snapshot. Responses are downloads with `Cache-Control: no-store`.

The manifest has a SHA-256 of canonical rows and a SHA-256 binding the manifest and rows, excluding the latter checksum field itself. Canonical JSON uses sorted keys, compact separators, UTF-8, and rejects nonfinite numbers. These checks detect accidental changes or truncation; they do not sign or attest to the source. Report/asset IDs, rare category combinations, area and timing still make the export private operational data. Store it in a restricted staff directory and follow the applicable retention rules. Keep exports out of source control and web roots.

## Python commands

With the API running and a valid authorized staff token supplied through `PULSO_LEARNING_TOKEN`, fetch into a new file in a private directory. Use the actual local port or an HTTPS origin for a remote API. The client rejects redirects, checks the response before saving, and never overwrites an existing file.

```powershell
& backend/.venv/Scripts/python.exe backend/scripts/export_report_learning.py fetch `
  --base-url http://127.0.0.1:8000 `
  --output "$env:LOCALAPPDATA\PULSO\learning-audit-01.json"
```

Create the restricted output directory first. To check the file without accessing the API or database:

```powershell
& backend/.venv/Scripts/python.exe backend/scripts/export_report_learning.py verify `
  --input "$env:LOCALAPPDATA\PULSO\learning-audit-01.json"
```

## Release gate

All v1 manifests have `training_release_eligible: false` and `data_origin: unattested`. A successful checksum or a count of eligible audit labels does not establish a real training cohort. Synthetic verification data does not qualify. No model fits or forecasts are produced by either command. The source has no reviewed replay of case membership and asset identity at a chosen prediction time, and the pilot has not supplied attested outcome history and prospective evaluation.

The next data step is to collect and adjudicate a bounded real pilot, then define the prediction clock and build the dataset that was actually knowable at that clock. Evaluate a descriptive baseline on later cases and keep connected report/asset groups together; check cross-area overlap and when outcomes became available. Compare models only after measuring label coverage, censoring, error and uncertainty. The separate device-location pilot and field recurrence target still need physical reference checks and reviewed repeat observations.

Subsequent implementation: [Prospective concern prediction checkpoints](concern-prediction-checkpoints-2026-11-07.md) now records actual server-known context at new intake and association commands. This does not backfill historical knowledge or promote this v1 current-membership export into a training cohort. Checkpoint-based outcome materialization and prospective evaluation remain separate next steps.

## Local verification

- **66 regression checks passed** across report learning, concern intelligence, field inventory and the new export API. The tests include a concurrent lifecycle update during export, complete concern scope, shared report/asset grouping, a bounded export failure, and retained censoring.
- **16 final focused checks passed** after adding the category allow-list. They cover the export API and Python CLI, including checksum verification, transitive grouping, rejection of unexpected category text, token-safe error handling and no overwrite of a local export. These runs overlap.
- Python compilation and Git whitespace checks passed. Tests used synthetic records in the guarded disposable PostGIS database. No migration, new package, live provider call, frontend change or production export was required.
