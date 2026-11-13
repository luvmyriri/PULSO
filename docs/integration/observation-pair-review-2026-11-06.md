# First-party object/problem pair reviews and matching audit

**Status:** observed backend/API and Python implementation in the local worktree; not deployed. **Version:** 1. **Owner:** PULSO development. **Last validated:** 6 November 2026. The proposed wider lifecycle, matching thresholds, operational authority and model-release policy still need their named owners. No new frontend controls or Figma artifacts are claimed for this increment.

## What changed

PULSO can now retain structured first-party judgments about two report observations, including the critical distinction between **the same physical asset** and **the same problem episode**. The labels are `same_problem`, `same_asset_different_problem`, `different_asset` and `uncertain`. They are operational reviewer judgments with evidence basis, reason, actor, time and frozen evidence context; they are not independently attested ground truth or AI predictions.

Each correction appends a new canonical-pair revision rather than replacing the old label. Comparing A/B and B/A reads the same history. A `same_problem` label does **not** group reports: the existing separately authorized association command performs membership changes. A negative label for observations already grouped together is refused until their membership is explicitly reviewed and separated. Individual tickets, categories and statuses remain intact. The distinction supports future positive, difficult negative and abstention examples without treating every nearby pole or every defect on one pole as the same case.

The snapshot retains source/target report and concern versions, observation IDs/categories, a digest of observation text/categories, report status, recorded photo-reference presence, location sources, issue-position accuracy estimates and separation distance. The digest detects an observation edit even if its parent report version was unchanged. Photos are not analyzed by this increment, and a recorded reference does not prove that a file is readable or depicts the same object. `field_visit` is a reviewer assertion, not an independently verified survey attachment. These limitations remain training blockers.

## Private API contract

`GET /api/report-intelligence/reports/{report_id}/observations/{observation_id}/pairs/{target_id}` returns a repeatable-read evidence context, the current pair revision, source/target observation IDs and the latest 20 immutable reviews. Both reports must be accessible to an active staff reviewer. This bounded view is not the entire history when a pair has more than 20 revisions; the complete authorized export retains all records within its explicit bound.

`POST` to the same path takes `Idempotency-Key` and:

```json
{
  "expected_version": 2,
  "expected_target_version": 2,
  "expected_concern_version": 1,
  "expected_target_concern_version": 1,
  "expected_pair_revision": 0,
  "relation": "same_asset_different_problem",
  "evidence_basis": ["photos", "report_details"],
  "reason": "SAMPLE payload only. Replace with the actual reviewed evidence."
}
```

The version numbers above are **sample syntax**, not reusable city-record values. Read the actual context first. `expected_version` refers to the path's source report; `expected_target_version` refers to the target report, even though the evidence snapshot is stored in canonical observation-ID order. `evidence_basis` accepts `photos`, `field_visit`, `location`, `report_details` without repeats. A decisive relation requires photos or a field visit; location/description alone can only support `uncertain`. Photo-based review requires references on both reports. The trimmed reason must contain 20–2000 characters.

The server requires review capability, jurisdiction access and decision ownership of both reports, unless the reviewer has assignment authority. Ordered report/concern locks serialize pair reviews with association/reassignment. Both report/concern versions and the pair revision must match. Stale state returns 409, invalid evidence basis returns 422, and unauthorized scope/capability returns 403. Invited-but-not-active staff cannot use the pair-review commands. A repeated key on the same command returns the original review without another row; changed input under that key is rejected. Replay recalculates whether the frozen evidence is still current. Audit history and the command receipt commit with the review.

Review history stays available after evidence changes. `current_evidence=false` exposes that a prior judgment used a different report/concern/observation context; it does not silently rewrite or delete that judgment. A completed source concern cannot be linked into a new open episode through the association command, matching the existing protection for a completed destination.

## Candidate retrieval

The existing automatic candidate list now uses `uncertainty_spatial_category_candidates_v2`. Recognized report category overlap and the spatial bound are applied before retrieval limits. Candidates are ordered by distance and stable report ID, so many newer records no longer hide an older close report. Recorded uncertainty from **both** issue positions can expand the retrieval radius. All current closed-status aliases are excluded. Role/self-work restrictions are applied before the bounded nearest-record scan as well as the final authorization check.

The default 100 m retrieval radius can expand using twice the sum of recorded source/target issue accuracy estimates, capped at 500 m. These are developer retrieval heuristics, **not approved identity thresholds**, error guarantees or exact-location certification. Unknown accuracy stays null; a corrected/manual pin does not inherit device precision. The search is explicitly non-exhaustive: at most 201 spatial/category candidates are scanned and 50 returned. It still returns `review_required`, never a match probability or automatic grouping. A changed photo angle cannot yet be identified reliably by this spatial/category method.

## Dataset and Python workflow

`GET /api/gov/report-learning/matching-dataset?max_reviews=1000` exports one private, read-only repeatable-read snapshot. It requires insights/report access plus review capability. Both sides of every exported pair must be accessible; mixed-scope pairs are omitted entirely. The export is complete within its bound: exceeding `max_reviews` (1–5000) or the 10,000-record scan fails instead of silently truncating. Responses use `Cache-Control: no-store`.

The versioned `pulso-observation-matching-audit-v1` document includes every recorded correction, relation/evidence basis, recorded time, current-evidence/latest-review flags and allow-listed spatial/category/reference-presence features. It omits raw photos, URLs, coordinates, contact data, actor IDs and free-text reasons. References and times remain private incident data, not anonymous data. Unrecognized category text cannot escape through predictor fields.

All revisions and transitive shared-report observations receive the same evaluation group. This prevents a corrected/reversed pair or different observations from one report entering different evaluation partitions. It does **not** prove that different reports show different physical assets: a later physical-asset/episode leakage audit remains required. Uncertain or superseded labels remain explicit, not manufactured negative examples. `training_release_eligible` is false for the document and every row. Reviewer independence, representative adjacent-lookalike/angle trials, provenance attestation and prospective evaluation are still required.

The existing standard-library Python collector supports the new audit:

```powershell
# Set PULSO_LEARNING_TOKEN privately to an authorized staff bearer token first.
backend/.venv/Scripts/python.exe backend/scripts/export_report_learning.py fetch --dataset matching --base-url http://127.0.0.1:8000 --max-cases 1000 --output C:/PrivatePulso/matching-audit.json
backend/.venv/Scripts/python.exe backend/scripts/export_report_learning.py verify --input C:/PrivatePulso/matching-audit.json
```

The parent output directory must already exist and be staff-controlled. `--max-cases` is the shared collector flag; for matching it bounds review records. Existing concern exports remain the default. The collector verifies schema/checksums, rejects remote HTTP/credential-bearing origins, refuses redirects and existing-output overwrite, keeps bearer tokens out of printed output, and supports offline verification. Checksums detect changed bytes, not authentic source data or fitness to train. This is not a fitted LightGBM/Gemini model or a release gate bypass.

## Migration and verification

Migration `28f2a3b4c5d6` follows `27e1f2a3b4c5`, adding `observation_pair_reviews` with canonical-order, relation, positive-revision and unique pair/revision constraints plus restrictive provenance foreign keys. There is no inferred legacy-label backfill. Bootstrap guards, CI revision/inventory references and disposable-test head checks follow the new head. The configured application/production database was not migrated. Downgrade drops the new review data; operational rollback requires a retained backup/review, not an automatic downgrade.

**107 checks passed** across observation matching, the offline matching contract, report intake/intelligence, concern learning/history/export, the Python collector, resident/government integration and first-party field inventory. Existing deprecation/legacy warnings remain (383 warnings in this selected run). Synthetic disposable-PostGIS tests exercise permission/scope/ownership, invited-staff rejection, idempotent replay, cross-direction writer serialization, frozen evidence and observation-text changes, contradictory grouped labels, completed episodes, nearest/secondary-category retrieval, two-sided uncertainty, private exports and consistent snapshots. Offline checks exercise grouped revisions, malformed contracts, checksum changes and safe Python transport. Python compilation and scoped whitespace checks passed.

Migration downgrade to `27e1f2a3b4c5` and re-upgrade to `28f2a3b4c5d6` were exercised only on the named disposable local database; each normalized catalog matched its checked-in inventory. The application database was unchanged. These checks establish local software behavior, not real-world matching/GPS accuracy, calibrated confidence or model performance. No new frontend/browser test or deployment is claimed for this backend increment.

## Next development

Subsequent implementation: [Staff observation comparison controls](observation-comparison-ui-2026-11-06.md) now connects the review form, evidence/history and original-command recovery to this API. The following model/data requirements remain outstanding.

The follow-up UI implementation still needs its official Figma artifact handoff. Add image-assisted candidate comparisons behind explicit provider/failure/provenance limits, collect genuine same-object/different-angle and adjacent-lookalike examples, and evaluate candidate recall and grouping errors before automatic association. Real phone trials, first-party asset identity corrections, authentic completed outcomes, LightGBM ETA/maintenance evaluation, mobile-client parity and deployment remain part of the active PULSO objective.

Subsequent data tooling: [Offline matching evaluation](matching-evaluation-2026-11-06.md) measures descriptive operational-reference agreement and hypothetical transitive grouping contradictions from complete supplied decision runs. It does not establish population retrieval recall, attested physical identity or permission to automatically associate reports.
