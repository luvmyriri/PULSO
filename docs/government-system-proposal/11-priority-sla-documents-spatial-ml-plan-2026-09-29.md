# Government operations: priority, SLA, documents, spatial data, and predictive maintenance

**Status:** Proposed research and implementation plan for City Engineering Division review. **Validated:** 29 September 2026 against repository commit `a69c8271` and the official references below. **Scope:** Government operations only. **Owner:** City Engineer or delegated operational product owner to nominate. **Implementation:** No product code, migration, deployment, or public service commitment authorized by this document.

## 1. Decision in one page

Build PULSO as a **case and asset operating system**. A report is an observation; a case is the accountable decision and service record; a work order authorizes physical work; an inspection independently verifies the result; a document is a versioned official output; an asset carries condition and maintenance history. These records must link by stable IDs but retain their own lifecycle, permissions, and evidence. This sharpens the existing [government proposal](README.md), which is still proposed, not approved policy.

Recommended delivery order: (1) establish reliable records, roles, priority and service clocks, (2) make work orders and document drafting operational, (3) add governed PostGIS location and assets, (4) measure prediction against real outcomes. AI assists triage and drafting; it cannot silently demote an emergency, certify engineering work, approve spending, or publish public information.

**Two separate clocks:** P0–P5 below is a proposed *internal risk and dispatch* scale. A statutory or Citizen's Charter processing deadline for a specific government transaction is a different field and must be configured from the approved service entry. The RA 11032 implementing rules describe simple, complex, and highly technical service classes and their processing limits; they do not make the P0–P5 targets below legal promises. [RA 11032 IRR](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/96391).

## 2. What exists today, and what is missing

| Area | Observed at commit `a69c8271` | Decision before production use |
|---|---|---|
| Database | `backend/database.py` defaults to PostgreSQL; SQLAlchemy models and Alembic exist. | Verify actual deployment, migration discipline, backups, restore, and data quality. A PostgreSQL URL alone does not mean PostGIS is installed. |
| Case and priority | `backend/models.py` has report AI urgency and severity fields; `backend/gov_models.py` has work-order `low/normal/high/critical` and a floating score. | Introduce an explicit case priority decision with reason, actor, evidence, policy version, and changed-at history. No canonical P0–P5 or server-owned SLA contract was found. |
| Documents | `backend/document_router.py` uploads files, hashes them, assigns a hardcoded retention/confidentiality value, and serves authorized downloads. Project certificate endpoints record issuance state. | Govern retention with the records officer; add template-based generation, versioned review/approval, actual signed artifact verification, redacted release, and accessible export. A certificate status is not proof a valid PDF was issued. |
| Assets/spatial | `backend/gov_models.py` stores asset coordinates as JSON and reports as float latitude/longitude. No PostGIS usage or `lightgbm` package was found in backend source/requirements. | Create authoritative geometry and boundary versions, quality checks, indexes, and spatially linked maintenance history. |
| Prediction | `backend/predictive_engine.py` and `backend/predictive_service.py` compute deterministic formulas, including hardcoded flood/rainfall and assumed maintenance age; `backend/predictive_router.py` labels outputs as failure probabilities. `InfrastructureAsset.condition_score` defaults to 100, and a missing asset returns health 100 in `calculate_ahs`. | Treat uninspected/missing condition as **unknown**, re-label current outputs as illustrative heuristics until calibrated on actual asset failures, and do not expose numerical failure probabilities or cost-savings claims as validated predictions. |

Source inspection establishes code behavior, not deployed operational performance. Existing `docs/government-system-proposal/09-reconciled-government-implementation-plan.md` already proposes a linked case chain, outbox jobs, and a dedicated asset register; this plan supplies the missing decision tests and narrower release gates.

## 3. A workable City Engineering flow

| Stage | Accountable action | Automation allowed | Required record/exception |
|---|---|---|---|
| Intake | Administrative intake accepts web, walk-in, call, referral, or staff observation. | Receipt ID, duplicate candidates, acknowledgment draft, language assistance. | Record source, received time, evidence, reporter contact in a restricted partition. Incomplete or offline submissions remain recoverable. |
| Safety screen | Duty reviewer checks immediate danger and emergency agency referral. | Keyword/image *flags* and conspicuous rule triggers. | P0 invokes established emergency communications immediately; PULSO is not the emergency dispatch authority. Human confirms referral, risk controls, and time. |
| Validate and triage | Reviewer checks jurisdiction, asset/location, duplicates, risk, and service type. | Proposed category, boundary/nearby asset match, priority suggestion, evidence summary. | Record unknown location, boundary dispute, outside remit, duplicate link, or request for information as **dispositions**, never as low priority. |
| Assign | Coordinator names owner, team, next action, and deadlines. | Queue routing by scope, shift, skills, and current load. | Unowned cases remain visible and escalate. No AI-only assignment for critical work. |
| Execute | Authorized lead issues work order; field team records arrival, safety controls, labor/materials, photos and blockers. | Pre-filled order/checklist, reminders, photo metadata checks. | Material shortage, unsafe site, weather, utility conflict, and no access each have an explicit blocker and escalation. |
| Verify | Different authorized inspector records inspection, defects, acceptance or rework. | Assemble evidence pack and draft inspection report. | Executor cannot self-certify; acceptance depends on technical criteria and approved signatory. |
| Resolve and communicate | Case owner confirms linked work is sufficient, sends resident update, and closes/reopens as appropriate. | Draft plain-language update and official release package. | Close reason, before/after proof, unresolved scope, challenge route, and public-safe text. |
| Archive/learn | Records officer registers final versions; asset custodian updates maintenance and condition. | Indexing, due inspection task, retention review. | Corrections produce new versions; legal hold and approved disposition govern deletion. |

The default staff workspace should open to **My action**, **Unassigned/high risk**, **Due soon**, **Blocked**, and **Awaiting verification** with a case docket that preserves queue filters and selection. Every badge needs a time, owner, and actionable next step. Provide keyboard access, 3 px focus, table/list alternatives to maps, usable 320 px reflow/200% zoom, reduced motion, and distinct empty, stale, partial, offline, permission, and error states. Target WCAG 2.2 AA. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## 4. Proposed P0–P5 priority policy

Priority is an **operational decision about response order**. It is separate from lifecycle status, certainty, public interest, case age, asset condition, ML risk, and statutory transaction deadline. P0 is a safety escalation; P5 is a genuine planned-monitoring action with an owner and review date, never a parking place for incomplete or unwanted reports.

| Level | Proposed meaning and example | Minimum control |
|---|---|---|
| P0 | Credible immediate threat to life/major public safety: exposed live wire, unstable structure, open deep excavation in a pedestrian path. | Immediate duty notification and existing emergency-agency route; human dispatch and make-safe record. AI may raise a flag but cannot lower P0. |
| P1 | Severe active hazard or critical service failure with broad exposure: bridge restriction, severe flooding at critical access. | Same-shift technical review, senior escalation, interim safety control. |
| P2 | Significant localized risk or rapidly worsening defect: recurring drainage overflow, dangerous road damage near a school. | Scheduled field assessment and dated containment decision. |
| P3 | Standard repair/service need without verified imminent harm: pothole, damaged curb, routine drainage obstruction. | Normal owned work queue with service-clock visibility. |
| P4 | Planned preventive work or minor degradation: asset nearing inspection interval, nonurgent repair bundle. | Asset/work plan, scheduled review, and explicit reason for deferral. |
| P5 | Observation or monitoring action where no immediate physical intervention is supported yet: repeat inspection of uncertain early deterioration. | Named owner, revisit date, evidence needed. If there is no actionable task, use a disposition, not P5. |

**Decision rubric for pilot adjudication:** score four independently recorded dimensions, each 0–3: (A) safety severity, (B) current exposure/criticality, (C) deterioration/time sensitivity, and (D) corroboration. Apply hard floors before sorting: credible immediate life threat → P0 review; credible severe active hazard → at least P1 review. Then use the dimensions to recommend P2–P5, with no opaque weighted sum acting as policy. Record affected asset, nearby critical facilities only where authoritative, location confidence, reporter/evidence provenance, rationale, human confirmer, and override reason. Do not use reporter identity, socioeconomic proxies, or number of app users as a reason to discount physical risk. Uncertainty routes to investigation, not automatic demotion.

**AI assistant contract:** return structured `candidate_level`, `observed_facts[]` with evidence references, `unknowns[]`, `policy_flags[]`, `confidence/abstain`, and model/prompt version. The server applies non-negotiable safety floors, permissions, and human confirmation. Review false negatives for P0/P1 first, then agreement by category, district, language, image quality, and reporter channel. The [NPC AI advisory](https://privacy.gov.ph/wp-content/uploads/2025/02/Advisory-2024.12.19-Guidelines-on-Artificial-Intelligence-w-SGD.pdf) and [NIST AI RMF](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) support documented purpose, governance, validation, and monitoring; they do not validate this particular rubric.

## 5. SLA engine and pilot clock proposal

Configure **separate due dates** for acknowledgment, safety triage, owner assignment, field assessment, make-safe action, next resident update, and technical resolution. The full repair deadline may depend on procurement, scope, and weather; an early safety action cannot be replaced by a distant completion target. Each clock stores trigger event, calendar version, due time, responsible role, pause event/reason/approver, resumption, breach, and notification history. Use UTC storage and Asia/Manila rendering. P0/P1 safety clocks run 24/7 only if the City actually operates a staffed duty channel; otherwise the operating policy must define who receives after-hours hazards.

**Illustrative pilot targets, not approved service promises:**

| Level | Acknowledge | Human safety/triage review | Named owner | Next dated action |
|---|---:|---:|---:|---|
| P0 | 5 min | 15 min | 15 min | Emergency referral/dispatch and make-safe plan within 1 hour |
| P1 | 15 min | 1 hour | 1 hour | Field assessment within 4 hours |
| P2 | 1 working hour | 4 working hours | 1 working day | Field assessment within 2 working days |
| P3 | 1 working day | 2 working days | 3 working days | Work plan within 5 working days |
| P4 | 2 working days | 5 working days | 5 working days | Scheduled inspection or plan date |
| P5 | 2 working days | 5 working days | 5 working days | Explicit monitoring/review date |

Before adopting any number, the City Engineering owner must examine 8–12 weeks of arrival volume, peak hours, available staff/vehicles, dispatch travel times, and the existing Citizen's Charter. Simulate the targets against historic cases and adjust so they are operable. Alert at a configurable fraction of time remaining and at breach; send the next escalation to a named role, not a generic notification inbox. Allowed pauses (for example, waiting for information, access, or material) require a reason and approval, preserve wall-clock time, and do not hide risk or override a statutory deadline. Publish only City-approved service commitments. [RA 11032 IRR](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/96391).

**SLA proof:** replay an event log through calendar changes, holiday, after-hours P0, reassignment, approved pause, reopened case, duplicate case, and failed notification. Report acknowledgment/triage/assignment/field/closure percentiles by priority, age of unowned work, breached clocks, and reason-coded pauses. Show denominators, missing timestamps, and excluded cases.

## 6. Automatic documents and public release

### Catalog and triggers

| Event | Drafted output | Mandatory reviewer/approval |
|---|---|---|
| Case received or accepted | Receipt and request-for-information notice | Intake rules; no false jurisdiction/verification claim |
| Work authorized | Work order, crew assignment, site checklist, safety/traffic control sheet | Authorized coordinator/engineer; spending/material gates remain separate |
| Field visit or materials request | Inspection field sheet, daily accomplishment/labor record, materials request, change/variation note | Field lead for facts; approving officer for commitment |
| Field completion | Completion evidence index and inspection report | Independent technical inspector |
| Technical acceptance | Certificate or closeout pack if this is the approved process | Required signatory and records officer; verify applicable formalities |
| Public communication | Work advisory, closure notice, public data extract | Designated publishing authority plus privacy/records review where needed |

Use versioned templates with typed fields and source references. A state machine should be `draft → reviewed → approved → issued → superseded/withdrawn`; rerendering creates a new version and never rewrites an issued artifact. Save template version, canonical record version, author/reviewer/approver, timestamps, hash, signature verification status, language, access class, and release scope. Generate drafts asynchronously with an idempotency key; recheck current approval and data version just before issue. A QR or verification URL can point to a public-safe validation page, but is not itself a digital signature. RA 8792 recognizes electronic documents/signatures in government transactions; the City's legal/records owners must approve which signatory method and document types are valid here. [RA 8792](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/3888).

For public release, create a **new redacted projection** from approved fields, inspect location/evidence for resident identifiers and sensitive infrastructure, log release decision and version, then produce accessible HTML and tagged/text-based PDF. JPG/PNG is a companion share graphic with alt text and a link to the full accessible release, not the only format for substantive information. For tabular open data, prefer a documented CSV plus human-readable HTML/PDF when release is authorized. Verify headings, reading order, tables, language, image alternatives, and content expansion in English/Filipino. [W3C PDF techniques](https://www.w3.org/WAI/WCAG22/Techniques/).

Do not treat the hardcoded retention values in `backend/document_router.py` as approved law. Inventory record series, map them to the City's approved Records Disposition Schedule, apply legal hold, and obtain required authorization for disposition. The National Archives says LGUs need records inventory and schedules and that public records disposal requires prior authority. [NAP records FAQ](https://nationalarchives.gov.ph/frequently-asked-question), [RA 9470 IRR](https://nationalarchives.gov.ph/wp-content/uploads/2024/09/IRR-of-R.A.-9470.pdf). Public release also needs a purpose and data-minimization review under Philippine privacy principles. [NPC Data Privacy Act IRR](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/).

## 7. Canonical data and PostGIS implementation

**Minimum entities:** `case`, `report_observation`, `asset`, `asset_geometry`, `location_assertion`, `priority_decision`, `sla_clock`, `work_order`, `field_visit`, `inspection`, `maintenance_event`, `document_version`, `public_release`, `audit_event`, and `outbox_event`. Keep original resident evidence in private object storage; store references and verified derivatives in records. Every location assertion needs raw input, method (GPS, geocoded, staff-set), accuracy/uncertainty, verification actor/time, boundary version, and a `needs_review` outcome. A coordinate is not proof of jurisdiction.

PostgreSQL is already the configured default; add PostGIS through a reviewed Alembic migration and deployment check (`CREATE EXTENSION postgis`), not an app-start side effect. Keep raw WGS84 location points (`geometry(Point, 4326)`) and versioned official barangay/city polygons plus asset point/line/polygon geometry. Validate geometry and CRS on import; retain source, license, effective date, import checksum, and approval. Use `ST_Covers(boundary.geom, point.geom)` for inclusive boundary checks, with a manual review band for ambiguous GPS near borders. Use `ST_DWithin(point::geography, asset::geography, meters)` for radius candidates; geometry distance on EPSG:4326 uses degrees. Add GiST indexes and verify plans with `EXPLAIN ANALYZE`. [PostGIS setup](https://www.postgis.net/documentation/getting_started/), [ST_Covers](https://postgis.net/docs/ST_Covers.html), [ST_DWithin](https://postgis.net/docs/ST_DWithin.html), [spatial indexes](https://postgis.net/documentation/faq/spatial-indexes/).

Migration order: establish authoritative boundary and asset source → import to staging → validate IDs, nulls, coordinate order/range, duplicates and invalid shapes → compare sampled maps and addresses with staff → backfill geometry alongside legacy fields → dual-read/compare counts and selected distances → cut API reads to PostGIS → retire legacy JSON/floats only after reconciliation. Do not silently assign asset links from proximity: present candidates for human confirmation. Public maps use aggregated or coarsened location according to release policy, never raw resident evidence locations by default.

## 8. Predictive maintenance: make it falsifiable

**Initial question:** For each inspected road segment or drainage asset, what is the chance of a *verified actionable defect requiring maintenance within the next 90 days*? Select one asset class first; do not mix roads, bridges, drainage, and buildings in one unvalidated target. A second, simpler task may forecast weekly work demand for staffing, which is not the same as physical asset failure. Existing formulas can be retained as a transparent heuristic comparator, clearly labeled as such.

**Required data feed:** stable asset ID/geometry; installation/material and change history; dated condition inspections including no-defect observations; verified defect type/severity/onset; linked cases and duplicate grouping; work orders with intervention type and completion date; downtime, cost, and independent inspection outcome; external exposure (rainfall/flood) only from licensed, time-stamped official data. Capture complete observation windows, including assets inspected and found healthy. A resident report count alone is an uneven measure of asset condition because reporting access varies.

Each training row represents `(asset_id, as_of_date)`. Features may include asset age, material, last verified condition, days since maintenance, prior confirmed defects, traffic/critical facility exposure **where sourced**, validated spatial context, and rainfall up to the cutoff. The label is a verified defect in `(as_of_date, as_of_date + 90 days]`. Exclude evidence or repairs learned after the cutoff. Track inspection coverage so unobserved failures are not treated as healthy negatives.

**Model ladder:**

1. Start with rules and a register of overdue inspections. If labels or inspection coverage are weak, stop here and improve capture.
2. Add a simple logistic/survival or historical-rate baseline with interpretable features.
3. Train a LightGBM tabular classifier only if it beats the baseline on held-out future periods and across asset/geography slices. LightGBM supports categorical data, missing values, validation sets, and early stopping, but these features do not establish predictive validity. [LightGBM documentation](https://lightgbm.readthedocs.io/en/stable/Python-Intro.html).
4. Calibrate probabilities on a separate later period; display a 90-day likelihood only when reliability testing supports it. Use time-forward splits, group related assets/duplicate incidents, and reserve the newest period as a final holdout. [scikit-learn time-aware example](https://scikit-learn.org/stable/auto_examples/applications/plot_cyclical_feature_engineering.html), [probability calibration](https://scikit-learn.org/stable/modules/generated/sklearn.calibration.calibration_curve.html).

**Proof package before staff reliance:** data dictionary and missingness report; label audit by engineer; baseline vs LightGBM on at least two forward test windows; precision/recall among the top *N* assets crews can actually inspect; calibration/Brier score; lead time before confirmed defect; false negatives on critical assets; subgroup performance by barangay/asset class and inspection coverage; model/data version; confidence interval or sample count; shadow-mode decision log; prospective field pilot measuring actionable defects found per inspection and avoided emergency repairs against a comparable workflow. Pre-register release thresholds with the City Engineer and data steward. If the model does not improve decisions, do not deploy it. NIST calls for validity, reliability, monitoring, and limits to be documented. [NIST AI RMF](https://airc.nist.gov/airmf-resources/airmf/3-sec-characteristics/).

The staff UI must say **why an asset is suggested**, the source date, missing fields, model version, and a one-click way to disagree or request inspection. Prediction may propose a planned work item; it never sets a P0/P1 case priority, issues a work order, spends funds, or marks a repair complete without authorized human action.

## 9. Delivery packages and release gates

| Package | Concrete output | Acceptance evidence | Likely owner |
|---|---|---|---|
| A. Operational policy discovery | Map 20–30 real recent cases, role/signatory matrix, Citizen's Charter mapping, emergency referrals, records series and current asset sources. | Named approvals for lifecycle, priority rubric, service calendars, pauses, publication and retention. | City Engineer + Admin/Records + privacy officer |
| B. Trustworthy case core | Canonical case/priority decision, audit events, role checks, explicit dispositions, SLA clocks and queue. | Scenario tests for P0, duplicate, unknown location, unauthorized change, clock pause/reopen, failed fetch; pilot staff can complete one case end to end. | Product/engineering lead |
| C. Physical work and documents | Work-order/inspection separation, template registry, generated draft, approval, signed issue, public-safe release and accessible export. | Sample real-case packet checked by signatory/records/privacy owner; issue, correction, withdrawal, and download authorization tests. | Engineering lead + records owner |
| D. Spatial foundation | Approved city/barangay boundaries, asset register pilot, PostGIS queries and migration reconciliation. | Staff-verified boundary/asset sample, invalid-location queue, query performance and public map privacy test. | GIS/data steward |
| E. Prediction pilot | Inspections/defects feed, baselines, LightGBM candidate, locked forward validation and shadow recommendations. | Pre-registered proof package above; release only if useful and safe in prospective pilot. | Asset custodian + data scientist |

For a small delivery team, plan packages A–C first; D can begin in parallel once the GIS owner supplies source data; E depends on real asset and inspection history. Estimate dates only after A measures volume, staffing, data availability, hosting and approval lead time. This avoids a fictional sprint schedule while keeping the work order concrete.

## 10. Decisions the City must own

1. **Service authority:** Which services are in the Citizen's Charter, with official processing class, clock start, extensions, notices, and signer? Which internal P0/P1 duties operate after hours?
2. **Emergency boundary:** Which office/number receives life-safety referrals, and what constitutes a confirmed handoff?
3. **Roles and signatures:** Who may triage, assign, approve spending, verify field work, sign documents, and publish public data? Existing role labels in code do not establish real delegations.
4. **Records/privacy:** Approved retention schedule, legal holds, data sharing/public-release rules, AI provider/data location, privacy impact assessment, and evidence access.
5. **GIS/asset scope:** Official boundary/asset source, geometry ownership, update cadence, near-border review tolerance, and first asset class.
6. **ML target and value:** Which verified failure outcome matters, which interventions can staff take, what inspection capacity exists, and what prospective gain justifies maintenance?

## Source and status notes

This plan uses official legal/regulator, W3C, PostGIS, LightGBM, scikit-learn, and NIST sources linked at the claims above. Legal interpretations and internal clock targets require City counsel and service owners. Code observations were source inspection only; no production data audit, live database check, accessibility run, migration, signed-document test, or ML benchmark was performed. The existing government proposal documents remain useful context but are not automatically approved policy. Figma was not used because the project team reports that it is outdated.
