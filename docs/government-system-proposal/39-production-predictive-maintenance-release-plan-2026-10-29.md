# PULSO production predictive maintenance: delivery and release plan

**Status:** Proposed production delivery contract, pending named LGU operational and data-owner approval. **Version:** 1.0. **Prepared:** 29 October 2026. **Planning owner:** PULSO engineering. **Release authority:** City Engineer and designated LGU service, GIS/data, privacy/records, security, and operations owners. Documentation only; no product code, model artifact, Figma, or VPS deployment is changed by this plan.

**Outcome:** Deploy a maintained, evidence-based system that recommends inspections and preventive work for assets PULSO can identify and the responsible office can act on. Staff can see the reason, confidence/limits, source time, owner and next step; record field outcomes; and override a recommendation. An authorized person issues work and verifies completion. The model is an operational component with measured performance and a rollback path, not an experimental score embedded in a dashboard.

This plan supersedes the exploratory release sequence in [38 — Infrastructure intelligence and predictive maintenance](38-infrastructure-intelligence-and-predictive-maintenance-plan-2026-10-29.md). That document remains the source for the broader registry, provider ladder, and dashboard inspiration. [PRODUCT.md](../../PRODUCT.md) and the approved [Civic Aperture direction](../ui-ux-audit/09-visual-art-direction-v2.md) govern product truth and appearance. The detailed model target, thresholds, permissions and workflows below are **proposed** until the named owners approve them.

## 1. What exists, and what must change for production

| Current repository observation | Production disposition |
|---|---|
| `backend/services/lightgbm_service.py` fits a real LightGBM classifier and quantile regressors, with PostGIS-derived features and feature contributions. | Retain the useful feature and inference work; build a reproducible **offline** training/evaluation pipeline and load an approved immutable artifact for inference. |
| Training always adds a generated 160-row reference matrix. Database rows are labeled from condition score/report count, and duration labels are estimated; a `>=30`-asset count can label the model `lightgbm_empirical_calibrated`. | Remove generated and proxy outcomes from production training. The existing training-mode name is not proof of probability calibration. Use verified dated defects and measured repair durations with separate calibration and holdout data. |
| The model can refit inside an API request when asset/work-order/report **counts** change. Edits that preserve counts need not invalidate the cache. | Never train in request-serving code. Publish a versioned artifact after approval; trigger scoring from an explicit data/model version and refresh schedule. |
| A learned 30-day output is blended with a heuristic; 60/90-day values are formula extensions; P50/P90 durations also use generated/estimated labels. | Train and validate each displayed horizon and duration target against its own real outcome, or suppress that output. No fitted model, arithmetic extension, or monotonicity rule alone establishes calibration. |
| `condition_score` defaults to 100, `design_life` defaults to 20, and the summary is capped at 200 assets; the API names some values `failure_probability`. | Audit stored data and clients. Make unknowns explicit, define a real denominator and paginated/aggregate queries, and migrate misleading labels through a versioned contract. Preserve legacy functions for controlled compatibility, with visible experimental status; do not expose them as certified production risk. |
| The [28 October VPS record](../integration/hostinger-vps-deployment-2026-10-28.md) documents a 2-vCPU/8-GB Docker deployment and an initially empty production asset register. | Recheck the live state before work. Size batch scoring, worker memory, artifact loading and backups against actual VPS headroom. A dated bootstrap observation does not establish today's asset count. |

The Gemini `/api/gov/predictive/ai-plan` path is a separate **drafting** assistant; it does not train or validate the failure model. Keep its human-review boundary and source restrictions in the [AI integrity ledger](34-government-ai-integrity-finalization-2026-10-28.md).

## 2. Production scope and measurable prediction

**First production cohort (proposed):** one asset class maintained by City Engineering, selected after inventory audit for adequate verified history. Drainage assets are the working candidate; do not lock this in before the City Engineer confirms ownership, asset units and inspection practice. Publish the class, districts, asset inclusion/exclusion rules, observation window, and coverage denominator. Other categories appear in the registry and rules-based workflow, but must not inherit a drainage model.

**Primary model target:** for an active, verified, in-scope asset at an `as_of` timestamp, estimate the chance of a **new, independently verified actionable defect requiring maintenance within the next 90 days**. Document what qualifies as actionable, the defect onset/verification timestamp, and how planned intervention, retirement, inaccessible assets, and incomplete follow-up are handled. Train on inspected *no-defect* outcomes as well as defects; uninspected assets are not negatives. Keep citizen report volume as contextual evidence, never as an outcome label by itself.

**Separate outputs:** (a) current hazard exposure from time-stamped source layers; (b) recorded asset condition; (c) 90-day defect likelihood only for validated cohort/model versions; (d) human-approved operational priority; (e) repair-duration estimates only after measured start/end records support an independently validated model. The 30/60/90-day and P50/P90 fields now in the code cannot be relabeled as production predictions without their own target definitions and evaluations. Emergency response and statutory service clocks bypass model ranking.

**Operational unit:** an asset recommendation proposes a named inspection or preventive-work review, not an automatically issued work order. Reports stay resident-issue records; My Work carries assigned inspection/work tasks; Work Orders authorize physical work; Projects coordinate larger programs. Link them by IDs and history without changing their distinct permissions or lifecycles.

## 3. Required production data contract

| Data product | Required fields and control | Release evidence |
|---|---|---|
| Verified asset register | Stable ID, asset class/unit, versioned geometry, jurisdiction, owner, operator, maintenance authority, lifecycle, source/license, source and verification dates. Unknown condition/design life are nullable. | Signed coverage and reconciliation report against source inventories; duplicates, retired assets and uncertain locations reviewed. |
| Inspection and outcome ledger | Task, asset, inspector, date, rubric/version, defect type/severity, no-defect result, evidence reference, independent review, corrected/superseded version. | Sample of both positive and negative labels adjudicated by engineers; label agreement and missingness recorded. |
| Work and maintenance ledger | Linked order, intervention, start/completion/verification dates, actual duration, costs only when recorded, resulting condition, rework. | Traceable links and no future-known data in historical feature rows. |
| External exposure snapshots | Provider, dataset/version, license, published/valid/ingested times, resolution, geometry, quality and staleness. | Access rights confirmed; geographic fit tested. Rainfall/hazard exposure is not asserted to prove asset failure. |
| Feature/label snapshot | `(asset_id, as_of)`, class, source and transformation versions, cutoff, feature missingness, outcome window and censoring state. | Reproducible immutable dataset with hash, query version, lineage and leakage audit. |
| Model/recommendation record | Artifact ID/hash, class, horizon, training data version, evaluation report, generated/expiry time, output, reason factors, uncertainty/abstention, disposition actor/reason. | One-click trace from displayed recommendation to source facts and approved model card. |

**Import discipline:** stage → validate schema/CRS/ranges/duplicates/license → compare against official source and field sample → steward approval → versioned promotion. OSM/Overpass can generate candidates, never confirmed city ownership. Utility assets require owner/authority agreement and may be referral-only. Do not infer a report-to-asset link solely from proximity. Each source has distinct observation, publication, ingestion and expiry times. [PAGASA's documented forecast API](https://tenday.pagasa.dost.gov.ph/static/media/api-doc.c9cf6abbaa781437ed96.pdf), [GeoRiskPH account terms](https://georisk.gov.ph/request-for-account/requirements), and [NASA IMERG's latency](https://gpm.nasa.gov/data/imerg) must be checked against the actual licensed integration before enabling a live layer. No provider is a substitute for a city-maintained register.

## 4. Model build and approval pipeline

1. **Freeze definitions.** City Engineer and data steward approve the cohort, defect label, 90-day horizon, intervention/censoring policy, and inspection capacity `K` (the number of assets staff can inspect per cycle). Record a baseline decision rule and the maximum acceptable missed high-consequence cases. These choices are versioned policy, not hidden model constants.
2. **Build historical as-of rows.** Use only facts available at each cutoff. Group duplicate reports and related assets; remove future repairs, later inspections and post-cutoff hazard observations. Audit whether some areas or classes were inspected more often; report coverage and outcome ascertainment by district.
3. **Train offline.** Reuse the LightGBM implementation where sound, but train from real verified outcomes, separately by asset class when the data support it. Compare with a simple transparent baseline and existing operating practice. Pin dependencies and feature schema. Save a signed/hash-checked artifact and model card; inference code cannot silently refit.
4. **Validate on later periods.** Reserve the newest period as an untouched holdout and use earlier forward splits for selection. Evaluate top-`K` precision and defect yield, recall of high-consequence outcomes, lead time, false alarms per staff capacity, subgroup performance, and missing-data/abstention behavior. Use a separate later period to calibrate any displayed probability, with reliability plot and Brier score; a model's `predict_proba` is not automatically a trustworthy percentage. [scikit-learn time-aware splitting](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html) and [probability calibration](https://scikit-learn.org/stable/modules/calibration.html) document the relevant methods.
5. **Approve or abstain.** The City Engineer and model/data owner pre-register numerical release thresholds **after measuring cohort prevalence and inspection capacity, before inspecting the final holdout**. Required direction: improvement over baseline at usable `K`, acceptable critical misses, calibrated likelihood if percentages are shown, and no unsupported district/class slice. If sample size or event count is inadequate, do not deploy the probability model for that class; the production rules/inspection workflow remains available. The old `30 empirical assets` threshold is not an adequacy test.
6. **Publish a release artifact.** Record code revision, data snapshot hash, feature schema, label definition, hyperparameters, calibration object, metrics/confidence intervals, known limits, approvals, artifact digest and rollback version. Never promote a model solely because it trains successfully or produces plausible scores.

This follows the [NIST AI RMF](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) expectations for demonstrated validity, documented limits, post-deployment monitoring, override, incident response and recovery.

## 5. Production service and deployment topology

```text
Approved source / field inspection
  → staged import + immutable source snapshot
  → PostgreSQL/PostGIS canonical asset and outcome ledgers
  → scheduled feature snapshot + scoring job
  → approved immutable model artifact, loaded for inference only
  → versioned recommendation table/API
  → government map + queue + asset docket
  → authorized inspection/referral/work decision
  → verified outcome back into the ledger
```

- **Existing stack:** FastAPI/Python, PostgreSQL/PostGIS, Docker and the current government React experience. Add a durable scheduled worker appropriate to the VPS; do not rely on web requests or process memory for training, imports, or large scoring batches. Train outside the serving API and benchmark a separate build environment if the 2-vCPU VPS cannot accommodate it. Pin the artifact/dependencies and check memory, CPU and inference latency on production-like load.
- **Batch and online paths:** produce an as-of scoring snapshot on a defined schedule and on material asset/outcome changes; deduplicate by `(asset, model version, feature snapshot)`. The UI reads persisted recommendations quickly. A single-asset refresh may be requested by an authorized role, with bounded computation and a durable job result. Model loading must not trigger training.
- **Failure behavior:** stale feed, missing geometry, missing inspection, unknown ownership, unsupported class, schema mismatch or model load failure yields a named `insufficient_data`, `stale_source`, `out_of_scope` or `model_unavailable` state. Keep recorded asset history and rule-based inspection duties available; never turn a failed fetch into “zero risk” or an empty queue. Log and alert; do not auto-issue work.
- **Security and privacy:** server-side capability/jurisdiction checks for row, map, recommendation, export and action; purpose-limited evidence; protected model artifacts; audit of view, override, assignment and work-order draft decisions. Exports use the same scope/field rules as the API. Third-party ingestion uses least-privilege credentials and approved licenses.
- **Compatibility:** keep existing predictive routes and functions while consumers migrate. Add a versioned production assessment contract with `assessment_type`, `target`, `horizon_days`, `model_version`, `as_of`, `data_coverage`, `source_freshness`, `limitations`, `reasons`, and `recommended_action`. Legacy heuristic/model-named fields remain explicitly experimental and cannot drive production priority; deprecation/removal requires a separate consumer inventory and release decision.
- **Migration and recovery:** additive Alembic migrations, rehearsal on a restored production-like database, pre-release backup, tested restore, prior model artifact retained, feature flag for new scoring/display, and one-step rollback to the last approved model or rules-only queue. No destructive migration is bundled with model activation.

## 6. Staff experience and operational decision path

Retain the established PULSO shell and government navigation. The supplied image contributes a **real map → ranked maintenance queue → selected engineering docket** composition, with the current PULSO design system and truthful local cartography. This is a proposed UX contract, not a claim that Figma has been updated.

1. **Scope:** the staff member chooses authorized district, class and queue. Counts state the verified denominator, missing-data count and as-of time. Map overlays show source, valid time, resolution and staleness. A text/table equivalent presents the same assets.
2. **Review:** the docket shows asset owner/maintainer, inspection and maintenance history, linked reports, hazard exposure, reason factors, model version and limits. Percentages appear only for the approved cohort/horizon and calibrated model; otherwise show `Inspection suggested` or `Insufficient verified history`. Do not show a “healthy” badge for uninspected assets.
3. **Decide:** an authorized reviewer can request inspection, defer with review date/reason, refer to the actual maintainer, or draft a work order. A staff member can disagree with the recommendation and record why. The server determines eligible actions. Consequential decisions show scope and confirmation; no model score changes report priority or issues a work order automatically.
4. **Execute and verify:** the assigned task appears in My Work, with field evidence and no-defect/defect result. A separate qualified reviewer verifies the result. The asset and recommendation timelines update, while any related resident report keeps its own status.
5. **Accessible states:** loading, first-use/filtered empty, partial, stale, offline, permission-limited, conflict, error and success; keyboard operation, non-color risk cues, 3 px focus, true-color evidence, list/CSV alternatives, both themes, 320 px reflow and 200% zoom. On narrow screens, open full-page detail rather than squeezing three columns.

**Next visual action:** inspect the current Figma government file, reconcile the reusable templates/components with this contract, then produce paired light/dark frames and annotated states before implementation. This planning request does not authorize Figma mutation or frontend/backend edits.

## 7. Production work packages and go/no-go gates

| Package, in dependency order | Concrete deliverable | Blocking acceptance |
|---|---|---|
| P0 — Authority and live-state audit | Named owners, signed cohort/target/threshold policy, current VPS/schema/asset count, endpoint consumer inventory, data-sharing register and inspection capacity. | No invented inventory coverage or unapproved utility/hazard feed. Emergency/referral boundaries agreed. |
| P1 — Canonical data and inspection workflow | Reconciled register, source versions, asset ownership, inspection/no-defect ledger, linked work outcomes, additive migrations, staff QA/export. | Representative official/field sample reconciles; unknowns remain unknown; role and privacy tests, concurrency/idempotency, backup/restore pass. |
| P2 — Feature and model release system | Offline as-of dataset, reproducible training, real labels, benchmark, calibration where justified, artifact registry and signed model card. | Forward holdout meets the pre-registered operational thresholds; synthetic/proxy labels absent from production target; class and district limitations enforced. |
| P3 — Production inference and UI | Scheduled scoring, persisted versioned assessments, explainable map/queue/docket, authorized handoff, source health, observability, CSV. | End-to-end roles, accessibility, stale/offline, no-data, work-order boundary, load and security checks pass against production-like data. |
| P4 — Deployment and service acceptance | Backup, migration, artifact and application release, smoke checks, staged activation for authorized staff, incident and rollback rehearsal, support training. | City Engineer, GIS/data, privacy/records, security, QA/accessibility and release owner sign a dated go/no-go record. No open P0/P1; prior model/rules-only fallback works. |
| P5 — Operate and expand | Daily ingestion/job health, weekly inspection outcome review, monthly drift/calibration and override review, retraining only through P2/P4 gates; class-by-class expansion. | Alert owner and response window assigned; every new class/district has its own coverage and validation record. |

These are **production acceptance stages**, not a toy pilot. A restricted initial cohort is necessary because the current live inventory and verified outcome volume are not established. The government system can be production deployed with an asset register and rules-based inspection queue while the model gate is still closed; it must not call that release “validated predictive maintenance.” The fully deployable predictive release is achieved only when P0–P4 pass for the named cohort. Citywide coverage is a separate, evidenced expansion decision.

## 8. Monitoring, incident response and rollback

| Signal | Proposed response |
|---|---|
| Source freshness, import failures, schema/CRS errors, missing owner/geometry, coverage changes | Alert GIS/data owner; quarantine source, show stale/unknown state, keep last approved snapshot with timestamp. |
| Scoring job failure, artifact/schema mismatch, inference latency/CPU/memory pressure | Alert engineering/on-call; freeze new model recommendations and switch to approved rules-only queue without losing current work. |
| Outcome drift, calibration decay, falling top-`K` inspection yield, district/class disparity, high-consequence miss | Suspend probability display or affected cohort, review incidents with City Engineer, investigate label and data changes, retrain only through approval gates. |
| Staff override, false alarm, missed defect, utility ownership correction | Capture structured reason, inspect at weekly review, preserve auditable correction and notify affected work owner. |
| Privacy or authorization incident | Disable affected feature/export, preserve audit evidence, follow the LGU incident and records process; do not hide the event as a model error. |

The release runbook must name on-call owners, dashboards/alerts, escalation time, backup and restore procedure, feature-flag rollback, the last approved artifact, incident communications, and how already-issued inspection/work items continue when scoring is disabled. Monitoring does not itself authorize automatic retraining or silent replacement.

## 9. Evidence checklist for the release record

- Approved asset class, district, maintenance authority, 90-day defect definition, inspection capacity and thresholds.
- Official asset/source agreements, live coverage denominator, reconciled geometry/ownership sample, missingness and label audit.
- Reproducible training snapshot, model card, forward holdout and baseline comparison, calibration report if a percentage is displayed, subgroup/high-consequence analysis.
- Production-like load result on the actual deployment topology; artifact integrity, versioned API/CSV, server-side access and privacy tests.
- End-to-end inspection → My Work → work-order/referral → independent verification scenarios, including duplicate command, conflict, stale/offline feed and model failure.
- Light/dark, keyboard, map/list alternative, zoom and responsive review; Figma-to-implementation review when design work is authorized.
- Migration and restore rehearsal, rollback rehearsal, monitoring/runbook ownership, staff training, support escalation and dated go/no-go signatures.

**Current verification limit:** This plan is based on repository source and the dated deployment record, not a fresh VPS database audit, real outcome evaluation, model calibration result or operational approval. Do not claim the existing model or a future probability is production validated from this document alone.
