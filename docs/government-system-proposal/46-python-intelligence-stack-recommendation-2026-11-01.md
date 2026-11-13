# PULSO Python intelligence: stack and module recommendation

**Status:** Proposed architecture and dependency review, not implementation or model selection approval.
**Version / checked:** 0.1 / 1 November 2026, Asia/Singapore.
**Owner:** PULSO engineering/product; data, location and operational decision owners remain those proposed in [45](45-report-concerns-location-and-independent-data-2026-11-01.md).
**Constraints:** ordinary Android/iPhone devices, no collected real completion dataset yet, individual resident reports preserved, one ticket with multiple categories, independent field data collection.

## Recommendation

Build a modular Python service package within the existing FastAPI backend. A command-line script can replay datasets, train and evaluate models, but camera capture, location acquisition, durable records, asynchronous processing, authorization and field verification require the whole application. Do not describe a single script or foundation model as guaranteeing all difficult features.

Keep FastAPI, PostgreSQL/PostGIS, SQLAlchemy/GeoAlchemy, Pydantic, Google GenAI and LightGBM as the initial foundation. Add capability only when a measured gap warrants it. Current dependencies are reasonable candidates, not a demonstrated optimal or validated stack.

## Observed repository evidence

- `backend/requirements.txt` already includes LightGBM, scikit-learn, SciPy, NumPy, Shapely, Google GenAI, FastAPI and the PostgreSQL/PostGIS integration libraries. Several packages are unpinned or have open-ended minimums. Production reproducibility requires a tested dependency lock; this review does not authorize blind upgrades.
- `backend/gemini_service.py` defaults to `gemini-2.5-flash`, configurable through environment. This does not establish the model actually deployed, account availability, region compatibility, quota or performance. Helpers request JSON MIME output; schema-constrained fields and semantic validation need a per-call audit.
- `backend/services/lightgbm_service.py` uses classification and quantile regressors and generates calibration data in its cold-start path. That supports a prototype, not a claim of real-world calibration. A fixed minimum sample counter is not an empirical sufficiency test.
- No image embedding integration or pgvector dependency was identified in the inspected dependency lists/services. This is a bounded source inspection, not an exhaustive deployed extension inventory.
- `mobile_app/pubspec.yaml` includes camera/geolocator/Google Maps; browser code uses device geolocation. Location acquisition is a client/platform task; backend Python cannot create an on-device sensor fix.

## Module boundaries (proposed names, not existing files)

| Module | Owns | Authority and fallback |
|---|---|---|
| `intake` | One idempotent ticket, category/item arrays, original evidence, receipt | Existing canonical report transaction and authorization; matching failures do not lose intake. |
| `location_quality` | Validate fix/capture time, accuracy, source, device versus issue point, geometry and jurisdiction | Preserve measured uncertainty; manual entry/review when missing. Never infer an exact GPS fix from Gemini prose. |
| `evidence_analysis` | Gemini extracts editable categories, observations, visible markings and descriptions | Typed schema plus semantic/server validation; no authoritative identity, severity or outcome from generated text alone. |
| `candidate_search` | PostGIS geographic/segment search, optionally image/text vector similarity | Retrieve scoped candidates; proximity and semantic similarity do not establish the same physical object. |
| `concern_matching` | Compare candidate asset/episode, defect, spatial uncertainty, time and evidence; produce proposed links | Versioned rules/reviewer confirmation initially; learned pairwise ranking only with labeled same/different examples. |
| `field_inventory` | Candidate infrastructure, stable identity, reviewed geometry, repeat observations and source lineage | Automatically save suggestions as candidates; ownership and maintenance authority remain unknown until supported. |
| `resolution_estimation` | Baseline and later LightGBM quantiles for a defined verified-completion target | No numeric ETA before sufficient comparable real outcomes; censored/interval observations require an appropriate model and cohort. |
| `maintenance_learning` | Repeat-defect and condition trajectories, inspection recommendations | Rules first; separate validated recurrence/defect target later. Do not reuse service-duration labels as infrastructure failure labels. |
| `evaluation` | Dataset snapshots, group/time holdouts, accuracy/errors, interval coverage, versions and rollback | Synthetic fixtures stay outside empirical performance claims and operational outputs. |

Processing sequence: commit report and durable analysis job → validate location metadata → analyze evidence → retrieve geographic/visual candidates → propose/review concern link → update scoped inventory/history → estimate only when data gates pass. Persist job status and allow retry. A database-backed outbox and worker can be sufficient for a small pilot; select Redis/Celery or another queue only after deployment capacity and workload justify the extra service. Slow AI jobs should not hold report intake open.

## Keep, add, and benchmark decisions

| Technology | Recommendation | Reason / limit |
|---|---|---|
| PostgreSQL/PostGIS | Keep as spatial and canonical-record foundation | Meter-based geography queries and indexed geometry support candidate retrieval; SQL cannot improve raw sensor accuracy. |
| LightGBM | Keep as tabular candidate | Supports classification and quantile objectives; use real historical inputs and evaluated targets. It does not directly compare raw photos or measure GPS. |
| Gemini through Google GenAI | Keep behind a provider adapter | Good candidate for structured evidence extraction; benchmark bilingual labels, multi-issue recall, unsupported claims, latency and cost. Newer model names are not proof of better PULSO performance. |
| Multimodal embeddings | First targeted model capability to evaluate | Image/text vectors can retrieve visually or semantically similar reports. Evaluate Google's currently available multimodal embedding options using the existing account/region before selecting a model. Different but similar poles are essential negative examples. |
| pgvector | Add only when vector retrieval is adopted and host supports extension | Store/search vectors alongside existing PostgreSQL records. For a tiny pilot, a bounded exact vector comparison can establish usefulness before adding an index. Validate model/dimension/normalization/index compatibility and authorization-filtered retrieval. |
| OpenCV | Optional visual-verification experiment | Local features/OCR-related processing may provide evidence about matching details. Viewpoint, texture and 3D object changes limit feature/homography methods; they cannot guarantee pole identity or coordinates. |
| CatBoost | Optional later challenger to LightGBM | Supports categorical/text/embedding features. Compare on identical real grouped time-forward splits; no local dataset exists yet to establish a winner. Do not install several boosting frameworks by default. |
| Dedicated object/defect detector | Later, if reviewed imagery supports training/evaluation | A task-specific detector may localize defects and object crops more consistently. A broad pretrained label is not a unique asset identifier; dataset and deployment/license review precede selection. |
| Google Maps Geocoding/Places | Keep for readable location/search context | An address/place result does not establish the exact photographed object. Preserve original coordinates, uncertainty and provenance. |
| Google Geolocation API | Not a default GPS precision upgrade | It estimates location from Wi-Fi/cell signals with an accuracy radius. Google recommends native platform services for devices that already offer location. |
| ARCore Geospatial/VPS | Optional separate native-device pilot | Combines sensors/GPS and visual positioning; coverage, supported devices, runtime accuracy and platform integration must be tested locally. Does not directly provide a verified defect position from an ordinary uploaded photo. |

Keep separate embedding/model versions and vector spaces. Re-embedding after an upgrade is a deliberate migration; never compare incompatible vectors. LightGBM may later learn match ranking from structured pair features such as distance, uncertainty, visual similarity, category compatibility and time, but needs reviewed identity labels and an abstain/review path.

## Data and evaluation gates

The largest current constraint is data and record integrity, not a demonstrated lack of model power. First fix multi-category ticket splitting, preservation of location provenance, durable concern identity and repeatable field observations as specified in 45. Collect known same-object/different-angle pairs and nearby lookalikes, including different defects and episodes on the same object. Preserve no-defect observations and unobserved/unknown distinctions.

Benchmark each capability separately: category/item extraction, same-problem link precision/recall and review rate, wrong-object rate and independently measured position error, ETA absolute error and range coverage/width, and recurrence/inspection yield. Also measure latency, retry/failure rate, model availability and per-report processing cost. Set release thresholds before evaluation; there is no justified percentage, universal sample count, or promised ETA yet.

For an honest first pilot, run rules and reviewed candidate links; collect data; compare descriptive completion baselines; and evaluate learned outputs in shadow mode before operational use. Treat observed community repair intervals and authorized government completion timestamps as distinct label sources. No provider produces missing city response history from infrastructure photographs.

## Source references and scope

Official sources checked 1 November 2026:

- [LightGBM parameters/objectives](https://lightgbm.readthedocs.io/en/stable/Parameters.html).
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output): schema-compatible output still requires application-level semantic checks.
- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings) and [Google Cloud multimodal embeddings](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-multimodal-embeddings): check actual model/account/region support before implementation.
- [PostGIS geography queries](https://www.postgis.net/workshops/postgis-intro/geography.html) and [pgvector](https://github.com/pgvector/pgvector).
- [Google Geolocation overview](https://developers.google.com/maps/documentation/geolocation/overview) and [ARCore Geospatial](https://developers.google.com/ar/develop/geospatial).
- [OpenCV feature matching](https://docs.opencv.org/4.10.0/dc/dc3/tutorial_py_matcher.html) and [CatBoost categorical features](https://catboost.ai/docs/en/features/categorical-features).

No provider benchmark, pricing quote, package installation, source implementation, API/model request, production-schema inspection or geolocation field trial was performed. The recommendations are architectural judgments based on source inspection and provider documentation, with empirical selection deliberately pending.
