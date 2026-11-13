# Offline LightGBM completion-time experiment

Status: implemented local research workflow, November 7, 2026. Technical owner: PULSO engineering. Physical-episode adjudicators, data stewards and model-release owners remain outstanding. This follows the [two-snapshot reference](checkpoint-temporal-baseline-2026-11-07.md). The candidate fits an actual installed LightGBM model in memory and compares it with that reference. It does not approve a city service estimate or establish predictive-maintenance accuracy.

## Target and training clock

The target remains **all frozen member reports reaching sourced verified resolution after the checkpoint without subsequent membership change**. This is an operational completion target. It does not establish independent repair evidence for every physical observation, structural deterioration, infrastructure failure risk or asset remaining life.

`backend/scripts/experiment_checkpoint_lightgbm.py` consumes the same two verified, saved private cohort exports as the reference. Earlier labels alone enter training. Eligible later checkpoints must occur after the training cutoff and survive the joint concern/report/optional reviewed-asset/area purge. Later references are grouping-only. Later invalidation or completion of an old checkpoint is counted diagnostically and cannot rewrite its earlier fitting data, encoder or support decision.

Eligible checkpoint units remain dependent within groups. Repeated checkpoints are retained; no independent-sample confidence intervals are claimed. Excluded membership changes, competing terminals and invalidated evidence remain excluded. Export-time eligibility conditions this target population; it is not the unconditional probability that every future city report will be completed.

## Partial follow-up and the candidate loss

The experimental formulation uses a piecewise-constant completion hazard. Each positive interval exposure contributes its exact observed time `e` and an event indicator `d`. A completed event exactly on an interval end belongs to that interval. An event beyond the final grid contributes unresolved exposure only up to that administrative cap. Open cases contribute partial observed exposure, never an invented completion or a full negative interval after their follow-up ends.

Piecewise-exponential survival likelihoods can be expressed through a Poisson likelihood using events and exposure. This is a statistical modeling assumption, not evidence that PULSO's process satisfies it. [Primary methodological paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC3288408/)

PULSO fits `LGBMRegressor(objective='poisson')` with **target `d/e` and sample weight `e`**. The parameter-dependent loss is:

```text
e * (lambda - (d/e) * log(lambda)) = e*lambda - d*log(lambda)
completion_probability(h) = 1 - exp(-sum(interval_rate * interval_width))
```

The implementation uses LightGBM's objective and sample-weight support; it does not send outcome duration as a predictor. The Poisson objective's nonnegative rate is integrated into a monotone completion curve. [Official regressor API](https://lightgbm.readthedocs.io/en/stable/pythonapi/lightgbm.LGBMRegressor.html), [official Poisson objective implementation](https://github.com/lightgbm-org/LightGBM/blob/main/src/objective/regression_objective.hpp)

Zero-follow-up censored rows add no exposure. A zero-time completion causes explicit abstention for clock/model review; no epsilon duration is added. No observed in-grid event, insufficient exposed training groups, fewer than two exposed periods or insufficient working support also abstains. Numerical/runtime failures produce a generic private error without saving a partial result.

## Frozen features and abstention

Predictors are the cohort's frozen counts, category multi-hot indicators, pre-checkpoint service age, original area count/set, original location/photo source counts, and original issue-accuracy summary. Unknown accuracy remains a missing value, never zero. Interval index/start/end are prespecified predictors. Report IDs, future durations, exposure weights, verification dates, asset-review references and narratives are not predictors.

The area vocabulary comes only from positive-exposure earlier training checkpoints. Area-set and interval codes are native categorical features. Category order is a static product vocabulary, not learned from holdout frequencies. The output records feature names, vocabulary size/hash and model-text hash; it emits no reusable native model or executable artifact.

Unseen exact category/area combinations abstain. A horizon beyond that combination's maximum observed earlier follow-up abstains. This is a conservative experimental policy, **not a validated domain-support detector**: numeric covariate shift, sparse context support, process changes and within-context population differences remain unresolved. Every curve uses the same frozen checkpoint features over elapsed time; no future update is assumed.

The median field is the first supported grid bracket crossing 50%. Its endpoints describe grid resolution, not an uncertainty interval or a promised completion date. No crossing returns null. Days are elapsed 24-hour days, not work schedules.

## Comparison and privacy

Each horizon reports candidate coverage over the full eligible independent holdout. Candidate/reference errors use the **identical mutually covered checkpoint subset**, with that subset's size and fraction explicit. Earlier censoring leaves binary horizon truth unknown. Casewise algebraic squared-error bounds retain those unknowns; they are not IPCW, population calibration or statistical confidence bounds. No automatic winner, deployment threshold or promotional accuracy score is emitted.

Working interval boundaries, grouping, support counts, tree count and seed must be supplied explicitly. The fixed small-tree recipe uses one CPU thread and no holdout-based early stopping, weighting balance, hyperparameter search or calibration. Users must not tune these choices against a final evaluation snapshot and call it independent validation. An additional calibration/selection stage and untouched prospective evaluation remain necessary.

The existing LightGBM dependency was used, with its runtime version recorded; no dependency was installed. Each file is bounded at 64 MiB, each snapshot at 5,000 checkpoints, the grid at 20 distinct endpoints up to 3,650 days, the expansion at 100,000 periods and fitting at 200 trees. These constrain resources, not service policy. Private outputs contain checkpoint references and probabilities and are not anonymized.

The command has no database, network or Gemini access, never loads an executable model, refuses output overwrite and emits no reusable model. `training_release_eligible`, `live_inference_allowed` and `reusable_model_emitted` are always false, including for a successful experimental fit. Source identity is still an operator claim. An offline research fit does not promote an unattested cohort into an approved training or release dataset.

## SAMPLE use and evidence

From the repository root, the following uses clearly labeled constructed fixtures. Its intervals and settings demonstrate software behavior only:

```powershell
backend/.venv/Scripts/python.exe backend/scripts/experiment_checkpoint_lightgbm.py `
  --training docs/integration/evidence/checkpoint-baseline-SAMPLE-training-2026-11-07.json `
  --evaluation docs/integration/evidence/checkpoint-baseline-SAMPLE-later-2026-11-07.json `
  --source-key SAMPLE-contract-fixture --grouping shared_report `
  --interval-end-days 2 --interval-end-days 4 --interval-end-days 10 `
  --min-train-groups 1 --min-train-events 1 --trees 10 --seed 17 `
  --output C:/PrivatePulso/new-SAMPLE-experiment.json
```

Use an existing private output directory. Real authorized exports require an explicitly reviewed collection/analysis policy; the example is not a release threshold. The [saved SAMPLE result](evidence/checkpoint-lightgbm-SAMPLE-2026-11-07.json) uses invented contract references and hand-assigned times, not actual city outcomes. Its predictions and errors are not accuracy evidence.

**75 checks passed** across the candidate, temporal reference, cohort contract and real export paths, including **23 new candidate checks** (22 offline and one API/PostGIS integration). Verification covers partial exposure, exact-boundary events, administrative caps, zero-time abstention, actual weighted-Poisson arithmetic, actual category-sensitive boosted fitting, monotone curves, context/tail abstention, frozen-feature isolation, temporal purge, later-label isolation, missing-status bounds, exclusive output and private failures. A subprocess fits with networking/database/provider access blocked. The disposable PostGIS integration test follows real intake, verified work evidence, successive authorized exports, actual LightGBM fitting and later grouping purge of an open case. Completed episodes retain their existing recurrence/reopening guard. All cases are synthetic; no production cohort was fitted. Schema stays `30b4c5d6e7f8`; no migration or UI/Figma change is required.

Next: independently adjudicated physical-episode/observation evidence coverage, representative prospective collection, reviewed support/censoring/competing-outcome policy, selection/calibration snapshots and an untouched evaluation are required before a live ETA release. This completion model does not substitute for the separate condition-history data needed by predictive maintenance.
