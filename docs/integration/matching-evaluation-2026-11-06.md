# Offline matching evaluation

Status: locally implemented diagnostic tooling and synthetic verification, November 6, 2026. Owner: PULSO engineering; independently adjudicated pilot references and release decision owners remain outstanding. This extends the [observation-pair audit](observation-pair-review-2026-11-06.md). It does not train a model, call Gemini, merge reports or approve an automatic-matching threshold.

## Implemented scope

`backend/scripts/evaluate_matching.py` prepares blank scoring work files and evaluates complete supplied decision runs against an authorized private matching export. It consumes `pulso-observation-matching-audit-v1`, verifies its checksums, and emits `pulso-matching-evaluation-v1`. Input files are bounded at 64 MiB; exported history and prediction lists are bounded at 5,000 entries.

Preparation copies canonical observation-pair IDs and the source snapshot checksum. It does **not** copy reference answers into scoring entries, infer model decisions, select partitions or fabricate a scoring timestamp. Every new decision, retrieval result, partition and `generated_at` starts null. A complete scoring adapter/run must supply these before auditing.

This is evaluation infrastructure for future LightGBM/other matching pipelines. It is not an implemented recognition model. Gemini's `possibly_same`/`visually_consistent` hints do not establish the same incident episode and must not be automatically converted into `same_problem` decisions. A scorer's `artifact_key` is a supplied identifier, not verification of an installed/frozen model artifact.

## Reference history and scoring contract

One result is required for every unique latest observation pair in the source export, including pairs not retrieved. Missing/duplicate/unknown/reversed pairs, boolean IDs, incomplete entries, incompatible retrieval/decision combinations, another source checksum and scoring timestamps outside the export-to-evaluation interval are rejected. Unrequested scores, confidence values and free-text fields are not accepted.

The evaluator independently chooses the highest revision per pair and rejects duplicate revisions, conflicting observation/report lineage, contradictory latest-review flags, review times after the source snapshot, and decisive references without photo/field evidence. Photo-based references must have photos on both sides. It keeps superseded history in the source counts and uses only the latest judgment for each pair.

Prediction runs use `pulso-matching-predictions-v1`:

| Field | Contract |
|---|---|
| `source_export_sha256` | Exact verified source snapshot digest. |
| `run_id`, `artifact_key` | Bounded pseudonymous identifiers; no paths, contacts or model execution. |
| `generated_at` | Actual supplied run generation time, with timezone; update after producing the scoring results. |
| `data_origin` | Supplied `synthetic`, `field_collected` or `unattested` claim. Self-attestation cannot enable release. |
| `predictions[].left_observation_id`, `right_observation_id` | Canonical distinct pair, exactly as prepared. |
| `partition` | `train`, `validation` or `test`, explicitly supplied. All transitive shared-report evaluation-group members stay in one partition. |
| `retrieved` | Explicit boolean from the scoring/retrieval run. |
| `decision` | For a retrieved pair: `same_problem`, `same_asset_different_problem`, `different_asset` or `uncertain`. Otherwise exactly `not_evaluated`. |

Uncertain judgments are not negative examples. Latest judgments with changed frozen report/concern evidence are excluded from decisive-reference metrics; this does not declare the historical reviewer wrong. Links proposed without a current decisive reference are counted separately. No reference values, timestamps or provenance are silently repaired.

## Reading the results

All metrics describe agreement with **provided operational reviewer judgments**. These judgments have not been independently attested as physical-object/episode truth. Reviewed candidate pairs are a selected sample, often chosen from the system's existing retrieval list. They cannot establish population recall or general matching accuracy.

| Diagnostic | Interpretation |
|---|---|
| `provided_positive_retrieval_fraction` | Retrieved current `same_problem` references divided by provided current positive references; not an independently sampled recall benchmark. |
| `direct_link_precision_against_operational_references` | Proposed direct same-problem links agreeing with current decisive references divided by all such proposed links with current decisive references. |
| `provided_positive_direct_link_fraction` | Provided current positive references directly proposed for linking, divided by provided current positives. Abstention/not-retrieved results remain in this denominator. |
| `decisive_prediction_coverage`, `selective_relation_agreement` | Coverage and exact three-relation agreement among decisive retrieved predictions. Read together; abstention must not inflate an apparent accuracy claim. |
| `false_episode_link_same_asset_count` | Direct same-problem links contradicting a same-asset/different-problem judgment. Recognizing a pole is insufficient to merge separate incidents. |
| `false_link_different_asset_count` | Direct same-problem links contradicting a different-asset judgment. |
| `transitive_contradiction_count` | Current negative references placed in one component by all supplied same-problem edges, including edges with uncertain/stale references. |

Connected-component diagnostics inspect the consequences of proposed edges. If A–B and B–C are linked, A and C share a component even if their direct prediction abstained or was not retrieved. These are hypothetical diagnostics; nothing is written to PULSO. Unprovided graph edges and existing production clusters are outside this evaluation.

Reports include aggregate diagnostics and explicit per-partition diagnostics. **Aggregate results include training entries** and must not be described as held-out performance. Shared-report grouping prevents known report leakage; physical-asset/episode independence across disconnected groups still needs a separate audit. Zero denominators produce null metrics, including an empty dataset or a run that proposes no direct links.

Output origin remains `unattested` unless the prediction run is explicitly synthetic. Both origin claims are preserved separately. Checksums detect changed bytes, not authentic provenance. `training_release_eligible` and `automatic_matching_release_allowed` are always false, with fixed independent-reference, sampling, leakage and prospective-evaluation blockers. Removing blockers from an input manifest cannot remove these local gates.

## Private offline workflow

First export an authorized matching dataset using the existing collector. Retain it in a staff-controlled folder outside source control and web roots. Then, from the repository root:

```powershell
backend/.venv/Scripts/python.exe backend/scripts/evaluate_matching.py prepare `
  --input C:/PrivatePulso/matching-audit.json `
  --output C:/PrivatePulso/scoring-work.json `
  --run-id pilot-run-01 --artifact-key candidate-model-v1
```

Have the actual scoring pipeline populate every entry and its real generation time against the identified evidence snapshot. Explicitly preserve non-retrieved pairs and grouped partitions; do not fill missing results with reference labels. Then run:

```powershell
backend/.venv/Scripts/python.exe backend/scripts/evaluate_matching.py audit `
  --input C:/PrivatePulso/matching-audit.json `
  --predictions C:/PrivatePulso/scoring-run.json `
  --output C:/PrivatePulso/evaluation-01.json
```

The parent directory must exist. Existing outputs are never overwritten; malformed input saves no output. CLI errors do not echo input values, local paths, coordinates or free-text validation details. Output contains private observation/review/group references and diagnostics, without images, raw coordinates, contacts, reference narratives or distance features. It is not anonymized. The commands do not contact APIs, databases or providers and do not deserialize executable model artifacts.

## Verification and sample artifacts

The initial disposable-PostGIS run passed **62 checks** across the evaluator, actual export integration, matching contract, pair commands and collector. After extending blank-timestamp and offline-isolation checks, **34 focused offline checks** passed and the changed API-export integration passed **1/1** on the separate regression database. These reruns overlap the initial run. Coverage includes corrections, stale/uncertain references, complete pair denominators, wrong-episode versus wrong-asset links, transitive bridges, grouped partitions, zero denominators, malformed/resealed inputs, output exclusivity and private-error handling.

The standalone CLI also ran successfully with socket creation, DNS/connection helpers, database imports and provider imports blocked. Actual export tests created only synthetic reports/reviews in the guarded regression database and confirmed that evaluation wrote no concern association. A new label correction rejected the old source scoring file.

Reproducible **SAMPLE logic demonstration only**:

- [Synthetic reference export](evidence/matching-evaluation-SAMPLE-source-2026-11-06.json)
- [Manually constructed synthetic decisions](evidence/matching-evaluation-SAMPLE-run-2026-11-06.json)
- [Synthetic diagnostic result](evidence/matching-evaluation-SAMPLE-result-2026-11-06.json)

These six invented pairs include a direct wrong-asset link, an abstained same-asset/different-problem pair bridged transitively, an unreviewed link, a correct negative and a non-retrieved positive. No model produced these demonstration decisions; no real performance result is claimed. The result shows two contradicted component memberships. Real photos, phones, provider output, independent adjudication and production deployment were not exercised. This backend/data increment makes no frontend or Figma change.

Next: collect independently selected same-object/multi-angle and adjacent-lookalike/episode pairs, including misses outside the existing candidate list; establish physical-asset/episode groups and independently reviewed reference decisions; run a fixed scoring pipeline and prospective evaluation. The current diagnostic cannot substitute for that benchmark or release approval.
