# PULSO reports, shared concerns, location, and independent learning data

**Status:** Proposed product and engineering contract; not an approved lifecycle, deployed feature, or implementation authorization.
**Version / last validated:** 0.1 / 1 November 2026 (Asia/Singapore).
**Planning owner:** PULSO product and engineering. Decision owners: product owner, designated location/data steward, City Engineering for official work/closure, privacy owner, and model reviewer; assignments remain proposed.
**Audience/job:** Residents submit one durable report containing all observed problems; reviewers connect evidence about the same problem without erasing individual reports; planners learn from real observations and outcomes.

## 1. Confirmed constraints and authority

- User confirmed on 1 November: regular Android/iPhone devices only; real outcome collection has not started. There is no demonstrated location benchmark or historical ETA training set.
- [PRODUCT.md](../../PRODUCT.md) remains approved product truth. This proposal preserves evidence, authorized decisions, independent report tracking, bilingual access, and truthful location/state.
- The user requests independent infrastructure discovery and data collection rather than dependence on government inventories/documents. This changes the proposed acquisition sequence in [38](38-infrastructure-intelligence-and-predictive-maintenance-plan-2026-10-29.md), which begins with city inventory. It does not establish ownership or permission to maintain an observed asset.
- [39](39-production-predictive-maintenance-release-plan-2026-10-29.md) proposes verified actionable-defect forecasting. Resolution-time estimation below is an additional, distinct target. These outputs need separate datasets, labels, evaluation, and release decisions.
- The older lifecycle/API dossier describes random/mock predictive outputs. Current source includes deterministic heuristics and generated calibration data. That older description is not sufficient evidence of current behavior or validated forecasting.
- No product source, database, provider, government record, or Figma artifact is changed by this document. Existing worktree changes belong to ongoing work and were not modified here.

## 2. Observed implementation and bounded verification

| Source | Observed behavior | Consequence |
|---|---|---|
| `backend/spatial_queries.py::nearby_active_report`; `backend/main.py::create_new_report` | Same category + active status + distance within 15 m rejects intake with HTTP 409. | Prevents preservation of a new resident's individual report about the same concern. Proximity is treated as identity. |
| `backend/deduplication_service.py::cluster_reports`; post-create code in `backend/main.py` | DBSCAN uses coordinates only, 10 m radius, `min_samples=1`; recalculates cluster labels over reports whose status is not resolved. | Category, physical identity, image content, uncertainty, and incident episode do not constrain membership. Labels are computed group numbers, not durable concern IDs. Nearby chains can connect distant endpoints. |
| `backend/spatial_router.py::check_duplicate_suggestions` | Separate staff candidate search defaults to 50 m and 30 days, with category input; does not merge/delete. | Useful candidate retrieval, but not a canonical case association service. Three spatial thresholds currently have different jobs. |
| `frontend/src/pages/ReportWizardPage.jsx` and `ResidentDashboard.jsx::handleQuickReportSubmit` | Both loop over selected categories and POST separate report requests. | A multi-category submission produces multiple reports and can partially succeed. |
| `backend/models.py::Report`; `schemas.py::ReportBase`; `main.py::create_new_report` | Model has scalar category and `accuracy_m`; inspected intake lacks accuracy, per-photo location provenance, and categories array. | Existing storage field does not prove capture-to-database accuracy preservation. |
| `Step2CameraLocation.jsx::resolveAddressAndNotify` | Sets `confirmed: inBounds`, and records callback time rather than preserving the Geolocation position timestamp there. | Jurisdiction membership, fresh device fix, and resident confirmation are conflated. |
| `backend/gov_models.py::ProjectReportLink`; `tests/test_project_coordination.py` | Project-related reports can preserve independent records. | Reuse the audited-link principle, but a project is not automatically a same-problem concern. |
| `backend/services/lightgbm_service.py` | Generates reference calibration rows for low empirical sample counts; derives probability/duration outputs. | Generated labels are development material, not observed city failure or completion evidence. |

Executed a local, read-only reproduction with `backend/.venv/Scripts/python.exe`, importing the actual `cluster_reports` function. Three synthetic points at latitude 14.75, 14.750072, and 14.750144, longitude 121.05, categories Roads/Lighting/Drainage, all received cluster 0 at 10 m. Adjacent points are about 8 m apart; endpoints about 16 m. This confirms cross-category proximity chaining in that function, not field deduplication accuracy. System Python initially lacked sklearn; the repository virtual environment succeeded. No production API, live DB, full integration suite, or recognition benchmark was exercised.

## 3. Canonical objects: one submission, independent reports, shared problems

| Proposed object | Meaning and minimum fields |
|---|---|
| Report | One resident submission and one durable ticket: author/access scope, submitted timestamp, categories array, description, evidence references, version, idempotency key. |
| Observation item | An actual problem described in a report: local item ID, editable category labels, evidence region/photo references, claimed location, uncertainty, source. Multiple labels describing one problem do not automatically create multiple items. |
| Infrastructure record | Stable PULSO identity for an observed physical object or bounded road/drain segment: geometry version, type, identity cues, observation provenance, location quality, verification scope. Owner/maintenance authority remain unknown unless supported. |
| Concern / incident episode | One distinct problem at an infrastructure record or location: stable ID, defect type, first evidence time, lifecycle events, scope, resolution evidence. Asset linkage can remain unknown while a legitimate concern is reviewed. |
| Report–concern link | Observation item, concern, relation (`same_problem`, `related_context`), proposed/confirmed/rejected decision, sources, actor/model version, reason, time, audit history. |
| Inspection / follow-up | Physical observation, date, observer, method/rubric, defect/no-defect/not-visible/unknown, evidence, location quality, and verification. |
| Outcome event | Claimed completion, observed condition change, authorized completion, verification, reopening; distinguish event time, observation time, and server receipt time. |
| Estimate snapshot | Target, as-of time, features available then, comparable cohort/count, predicted range or unavailable reason, model/baseline version, later outcome/error. |

**Example (illustrative only):** 12 resident reports about the same pothole remain 12 reports linked to one concern episode on one road segment. The case history contains one repair outcome, not 12 independent completed repairs. Show submission count, distinct reporter count where safely computable, confirmed contributing report count, concern count, and work count separately. Anonymous reporter independence may be unknown; never fabricate it.

One report with road damage + blocked drainage keeps one ticket and two editable category labels. If evidence describes two distinct problems, create two observation items and link them to the appropriate concerns under that ticket. Separate assignees/work items can act independently. The report shows partial progress until its applicable items are resolved or otherwise explicitly dispositioned; grouping never silently closes reports. A concern resolution requires authorized per-link propagation with an audit event, idempotent notifications, and a way to dispute incorrect linkage.

A repaired pole can have a later, new defect episode. Do not merge all past/future problems merely because the asset is the same. Reopen versus new episode requires an explicit policy and reason. Linking a late report never resets the original concern clock.

## 4. Location contract with ordinary phones

The acceptance goal is reliably identifying the intended object/defect and preserving measured uncertainty. Exact coordinates under all conditions are not an achievable smartphone-only guarantee. Device location is not automatically the position of the photographed object.

1. Explain collection and request permission in context. Start bounded high-accuracy sampling while the camera is open; preserve the photo even when acquisition fails. Use fresh fixes, record the Geolocation/OS timestamp, accuracy and coordinate source; stop sampling after capture/timeout/navigation.
2. Bind each photo to its capture event and nearest suitable fix in time. Record the time difference and freshness. A fix obtained well after capture stays labeled post-capture; uploads/EXIF are unverified claims, not proof of on-site presence. A watermark/filename is not independent verification.
3. Store camera/device position separately from resident-confirmed issue position. Ask the resident to mark the object/defect, identify road side/segment and landmark, and confirm the pin. Manual correction does not inherit the GPS accuracy value or become survey-grade.
4. Store structured provenance: fix time, capture time and source, receipt time, horizontal accuracy when available, original fix, issue geometry, location method, confirmation actor/time, edits, boundary source/version and asset-match state. Unknown accuracy is null, never zero meters.
5. Use point geometry for poles/inlets and defect spots; lines/polygons for road/drain extents. A road name or centroid cannot identify every defect on that road. Address conversion adds readable context and never silently moves the issue geometry.
6. Server validates finite coordinates, coordinate order/range, service scope, provenance and version. Treat uncertain boundary overlap as reviewable; a city check does not verify an asset or the reporter's claim. Client metadata may be spoofed; preserve review states.
7. GPS denied/timeout/offline: preserve draft, allow manual address/pin/landmark and flag location for review. Never substitute a default map point as captured evidence. Unsynced is not submitted.

**Precision pilot:** use the team's actual Android/iPhone models outdoors, beside buildings, across the road from targets, and with degraded/denied location. Compare independently measured reference positions and correct-object identification against PULSO output; log acquisition time, actual horizontal error, reported accuracy, wrong-object association, manual correction and fallback rates. A manually chosen map pin alone is not independent ground truth. Survey-grade numeric accuracy requires a suitable surveyed reference/receiver and measured object offset. Approve thresholds after the pilot, before automatic matching; additional decimal places or repeated correlated fixes do not establish accuracy.

## 5. Same-problem association without losing reports

- Keep submission replay protection separate: retrying the same idempotency key returns the original ticket. A genuinely new submission about the same problem receives its own ticket and can link to an existing concern.
- Retrieve candidates using uncertainty-aware distance/geometry, object type, incident time/episode, road side and segment. A search radius retrieves possibilities; it never establishes identity. Apply bounded search and versioned class-specific rules rather than one universal 10/15/50 m rule.
- Compare stable identity cues: confirmed asset selection/ID, visible markings, surroundings, segment geometry, defect location and type, and time. Multi-angle photos may support a match using object-specific features; image similarity, generic image embeddings, compass bearing, or GPS alone cannot certify the same pole. Different defects on one pole remain distinguishable.
- First release: generate candidate rankings automatically; uncertain/new visual matches need human confirmation. Residents may suggest the existing concern while retaining their own report. Only a validated, explicitly governed rule can confirm a link automatically; retain correction and dispute paths.
- Store candidate evidence/reasons and decision provenance. Uncalibrated similarity scores are not match probabilities. Keep related-but-different concerns separate.
- Support merge/unlink/split with stable IDs, aliases, retained history, actor/reason, optimistic concurrency, scoped access and correction notifications. Match failure must not block report intake; queue/retry association and display pending state.
- Prevent concurrent submissions creating competing canonical concerns through transactional association/version checks. Do not use DBSCAN labels as primary keys or auto-collapse a chain of nearby defects.

**Evaluation:** build a consented, labeled local set with the same object from different angles, adjacent similar poles, two potholes within 15 m, the same road with distant defects, a repaired defect recurring, mixed categories, poor GPS, and ambiguous photos. Separate training/threshold selection from held-out objects, streets and capture sessions. Measure incorrect grouping, missed grouping, precision/recall, abstentions and reviewer workload. Set automatic-link thresholds only after measured errors and reviewer capacity are accepted. Until then, recommendations plus review are the release contract.

## 6. One multi-category submission and API integrity

Proposed intake accepts `categories[]`, `observation_items[]`, evidence references and per-item location claims in one request. AI produces editable suggestions; categories are controlled labels, not free-text concatenations or separate submissions. A machine-detected extra category never creates another resident ticket.

One operation commits the report, categories, items, staged evidence references, receipt and association jobs exactly once. Retry the same operation after timeout/offline replay; reconcile uncertain outcomes. Return one authoritative report ID/ticket, saved categories/items, association state, server time and applicable next action. Retain a scalar primary category only as a documented compatibility projection; it cannot drop other labels. No generated client ticket stands in for a server receipt.

Migrate existing scalar reports additively; historical category-split tickets require reviewed links, not destructive collapse or rewritten creation times. Audit resident web, quick report, guest, offline replay and mobile paths. Notify and authorize through canonical report/work services. API route names, enums and role assignments remain proposals until approved with the existing lifecycle/API contract.

## 7. Resolution-time estimates from actual case history

The question “how many days until a similar report is resolved?” is service-duration estimation. Maintenance forecasting asks whether/when a defect returns or requires intervention. Report both as separate capabilities.

Record these clocks separately:

- **Resident elapsed time:** own submission to authoritative relevant completion/verification; never shorten the waiting time to hide backlog.
- **Concern elapsed time:** first received evidence for that episode to verified resolution, counted once per concern.
- **Active work duration:** actual work start to actual finish where known; distinguish paused/waiting intervals.
- **Observation interval:** for independently revisited sites, last observed defective to first observed repaired. Exact repair time inside that interval is unknown.

At submission, predict remaining elapsed time from now using only facts known then. A later update can condition on current stage and elapsed time, recording a new estimate snapshot. A late report linked to an existing case needs its current case state, not the full original-duration estimate. Location/category alone cannot explain scope, approvals, crew capacity or external responsibility; omit unavailable factors and expose the resulting limitation.

**Cold start:** currently no real completed-case dataset, so return `Insufficient completed case history` with next-step guidance. Begin with descriptive comparable-case medians/ranges and cohort counts once sufficient representative outcomes exist; broaden sparse cohorts explicitly rather than pretending a barangay-specific estimate exists. The required sample size is an evaluation decision, not a universal 30-row rule.

**Learning gate:** define the target endpoint and observation policy, audit labels, compare a simple historical baseline with a quantile/survival approach when appropriate, and evaluate on later periods. Keep all reports/items from one concern together; control asset/area overlap to prevent leakage. Final report count, final severity, future approvals, and completion photos cannot be submission-time features. Open cases are right-censored, not zero-day completions or silently excluded slow cases. Community observations with interval-censored repair timing require a separate model/cohort from official verified completion.

Display an evaluated range, sample count, scope, as-of time, provenance, and “estimate, not a scheduled commitment.” Set acceptable absolute error, range coverage/width, abstention rate and geographic/category error before release. A sample “7–12 days” is never populated until supported. Multi-concern reports show component progress and a separately defined overall completion target; do not average unrelated issue durations. Report volume may be an input available at prediction time, but never proof of defect severity or a promise of faster service.

## 8. Build a first-party infrastructure dataset without government documents

Use report-assisted discovery plus a small, repeatable field survey. Own the observations and evidence lineage; do not claim ownership or maintenance authority over the physical infrastructure.

1. Pick a bounded pilot and one class, proposed city-road segments plus pothole locations. Define safe observation points and a repeatable rubric with an appropriate reviewer. Collect assets in apparently good condition as well as defects.
2. Let a report/photo suggest an infrastructure candidate: type, proposed geometry, visible identifiers and evidence. Automatically save it as a candidate observation. A detector does not establish a new unique asset, condition rating, road ownership, installation date or material strength.
3. Review existing candidates/records before promotion. Confirm object identity with context photos, geometry and repeat observations; assign a stable PULSO ID. Preserve `field_observed`, `identity_reviewed`, `location_reviewed`, unknown and disputed facts separately. “Official city asset” requires a different authority. Reuse/extend the existing register and source/version tables rather than build a competing registry; reconcile mandatory ownership fields before implementation.
4. Schedule revisits to the same sampled sites, including no-report/no-defect sites. Record condition, defect progression, not-visible/unsafe/missing observations, observer, method, time, source and measurement uncertainty. Coverage is the surveyed set, not the whole barangay/city.
5. Capture new reports as additional evidence of an existing or new episode; record interventions only when actually known. Before/after photos and resident follow-ups can document observed change. They cannot establish government repair method, cost, crew effort or exact completion timestamp.
6. Use an annotated subset for object/defect detection and identity matching; human corrections become reviewed training examples. Keep model-generated labels and synthetic fixtures out of ground truth. Record model/version, image permissions and accessible evidence descriptions.

This produces asset identity, location quality, defect/no-defect trajectories, recurrence observations, and observed outcome intervals without an LGU inventory. Start with inspection prioritization and monitoring. Predict recurrence/deterioration only after prospective validation against repeated observations. No reports does not mean no defect; add scheduled surveys so low-reporting areas are represented. Actual government resolution-time forecasting additionally needs authentic response/outcome events; data collection can start independently, but city action cannot be generated by software.

## 9. Experience, privacy, and failure contract

Proposed resident copy pairs: `Report received / Natanggap ang ulat`; `Linked to the same concern / Nakaugnay sa parehong suliranin`; `Location needs checking / Kailangang suriin ang lokasyon`; `Not enough history for an estimate / Kulang pa ang datos para makapagbigay ng pagtataya`; `Saved on this device; not yet submitted / Naka-save sa device na ito; hindi pa naipapasa`. Apply functional English/Filipino parity to all actions, errors and accessible names.

Resident sees their own ticket, all categories/items, location source/uncertainty, association status and corrections, applicable case updates, and truthful partial completion. Reviewer sees the scoped concern, confirmed versus suggested links, separate report/concern counts, differing evidence and the reason for each suggested match. Identity/contact data remain access-scoped. Product-approved public incident publication still requires authorized verification; this proposal does not silently change coordinate visibility or publish candidate evidence.

Required states include acquiring/weak/denied/stale location, manual/unknown location, upload retry, offline draft, uncertain submission, association pending/provider failure/ambiguous/rejected/corrected, no history/sparse history/stale estimate, partial completion, reopened, conflict, authorization denied and verified success. Each state explains what saved/committed and the next recovery. Critical report submission must survive AI, matching, geocoder and estimate failures.

Implementation-ready screens must later define full control states, focus destination/return, announcements, keyboard behavior, 3 px focus, 44 px public targets, non-color cues, evidence text and map/list alternatives, light/dark parity, 320 px reflow, 200% zoom, reduced motion and forced colors. No layout or component version is asserted here. Next Figma action: inspect current shared file with official Figma skills; reconcile paired reporting, concern comparison and receipt patterns, then annotate data, failures and permissions before implementation.

## 10. Delivery sequence and acceptance

| Order | Deliverable | Required proof |
|---|---|---|
| 1 | Approve report/item/concern/asset/episode meanings and measurement plan | Multi-category and multi-report examples agree; clock endpoints, location reference method and owners named. |
| 2 | Single-ticket intake, provenance and safe retries | Three categories create one ticket; three residents create three tickets; replay creates no extra ticket; partial failures recover without lost evidence. |
| 3 | Durable concern links and reviewer matching | Same pole/different angle can be confirmed; neighboring poles and distinct defects stay separate; unlink/split and concurrent intake preserve history. |
| 4 | Independent inventory and repeat surveys | Pilot records include reviewed identity, unknown ownership where appropriate, geometry provenance, defect/no-defect evidence and measured coverage. |
| 5 | Descriptive service history | One concern with many reports contributes one case outcome; open and interval-unknown outcomes are accounted for; no-data response is honest. |
| 6 | Evaluated ETA and later maintenance target | Later-period performance and interval coverage beat/justify the baseline; grouped leakage checks pass; limitations and rollback accepted. |

Open decisions: pilot boundary/class and team survey capacity; location error and wrong-object tolerances after field measurement; canonical lifecycle/partial closure/reopen policy; reviewers and capabilities; evidence consent/retention and publication review; sufficient outcome coverage and model release thresholds. These are concrete decisions for the designated owners, not implied approvals from this document.

## Sources and limits

- [GPS.gov: GPS accuracy](https://www.gps.gov/gps-accuracy-0): smartphone accuracy varies with environment; typical open-sky figures are not a guarantee at each capture.
- [MDN: getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition): high-accuracy preference, cache age and timeout; use actual fix metadata.
- [scikit-learn: time-ordered validation](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html): avoid training on future observations and evaluating on the past; case grouping and irregular-event evaluation require additional dataset-specific logic.
- [scikit-learn: quantile prediction intervals](https://scikit-learn.org/stable/auto_examples/ensemble/plot_gradient_boosting_quantile.html): quantile estimates can construct ranges; held-out coverage still needs evaluation.

External sources consulted 1 November 2026. This is a source audit plus one synthetic local function reproduction, not proof of field recognition, location accuracy, calibrated estimates, live deployment, or complete data coverage.
