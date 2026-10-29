# PULSO infrastructure intelligence and predictive maintenance plan

**Status:** Proposed for City Engineering, GIS, CDRRMO, Records, privacy, and utility-owner review. Documentation only; no product code or Figma was changed by this plan.

**Version / last checked:** 0.1 / 29 October 2026. **Planning owner:** PULSO engineering; operational decisions belong to the named LGU owners below.

**Primary job:** Help authorized staff find assets that need inspection, decide who is responsible, record the result, and learn from verified outcomes. A maintenance recommendation is not a citizen report, an approved work order, or a prediction of failure.

**Production release update:** [39 — Production predictive maintenance release plan](39-production-predictive-maintenance-release-plan-2026-10-29.md) supersedes this document's exploratory release sequence and defines the deployable model, service, operations, and go/no-go gates. This document remains the broader asset registry, source, and dashboard reference.

## 1. Authority and starting point

| Material | Status | Consequence for this plan |
|---|---|---|
| [PRODUCT.md](../../PRODUCT.md) and [Civic Aperture](../ui-ux-audit/09-visual-art-direction-v2.md) | Approved product and visual principles | Keep one accountable civic record, truthful state, role-based access, evidence provenance, and the established government shell. |
| Existing source in `backend/gov_models.py`, `backend/predictive_router.py`, `backend/maintenance_planning.py`, and `backend/asset_map_context.py` | Observed repository behavior on 29 October; deployment and live data not audited | Reuse the asset model, PostGIS geometry, map context, maintenance endpoints, and work handoff. Reconcile migrations and live schema before changing them. |
| [Earlier spatial and ML plan](11-priority-sla-documents-spatial-ml-plan-2026-09-29.md) and [AI integrity ledger](34-government-ai-integrity-finalization-2026-10-28.md) | Proposals and dated implementation evidence | Preserve the 90-day verified-defect evaluation question and the human review boundary. The older statement that PostGIS is absent is stale; current model source contains `geom`. |
| Supplied API proposal and dashboard image | User-provided inspiration, not verified operational data or a mandate to copy labels | Use the map → priority queue → asset docket pattern. The pictured asset IDs, pins, 30-day percentages, flood labels, and impact counts are samples, not Caloocan facts. |

**Immediate integrity issue:** `InfrastructureAsset.condition_score` defaults to `100.0` and `design_life` to `20`; neither proves an uninspected asset is healthy or has that design life. Current predictive routes return heuristic `failure_probability_30d` and model-named fields while also labeling the model `exploratory_heuristic_unvalidated`. The summary reads at most 200 assets. An implementation must audit actual stored rows and consumers before changing contracts, then stop displaying these values as calibrated failure probabilities or complete citywide counts. Preserve the endpoints for compatibility until clients are migrated; add explicit assessment type, data coverage, and source fields rather than silently changing meaning.

## 2. What can be built now

The first useful release needs no new external API and no trained model:

1. **Pilot asset register:** choose one maintained class, preferably drainage inlets/canals or city roads, and one bounded district. Import existing city records into staging; let the GIS/asset custodian verify identity, geometry, owner, maintenance authority, and source. Unknown condition stays unknown. OpenStreetMap may supply *candidates*, never verified city assets.
2. **Inspection evidence:** capture dated inspection, inspector, method, condition rubric, photos, defects, **no-defect findings**, accessibility/safety restrictions, and next review. Keep original evidence and corrections traceable. Record work-order completion and independent verification separately.
3. **Honest inspection queue:** rank explicit reasons such as overdue inspection, confirmed repeat defect, recent verified hazard exposure, or missing critical information. Show the rule and source date on every row. Use labels such as `Inspection due`, `Needs location review`, and `Confirmed defect`; do not show fabricated 30-day percentages.
4. **Operational handoff:** an authorized reviewer can dismiss with reason, request an inspection, refer to the responsible utility, or draft a work order. The action is confirmed and audited. Assigned inspection appears in My Work; reports remain in Reports; approved coordinated work may link to a Project. No alert silently creates a citizen report or authorizes physical work.
5. **Map/list/docket view:** reuse existing government navigation, map components, table patterns, asset details, and work-order draft path. The map shows only verified geometry by default and has an equivalent sorted list and textual location. The selected docket shows observed condition, linked cases, maintenance history, exposure, missing data, source freshness, owner, and permissible action.
6. **Data-quality and export view:** show registered, verified, uninspected, missing-owner, stale-source, and inspection-overdue counts with denominators and as-of time. Each metric and queue exports a scoped CSV with clear headers, units, source, as-of time, filter scope, and `unknown` rather than misleading zeroes. Protect private fields in exports server-side.

This is a functional maintenance system even if prediction never passes validation. The first deliverable should be a **verified inventory plus inspection loop**, not a risk-score screen.

## 3. End-to-end operating model

```text
Source record or field discovery
  → candidate asset → steward verification → active asset register
  → scheduled inspection / report-linked defect / hazard exposure
  → explainable recommendation → authorized review
  → inspection task in My Work OR utility referral OR draft work order
  → field evidence → independent verification → updated asset history
  → data-quality review and, later, model evaluation
```

| Object | Owns | Key boundary |
|---|---|---|
| Asset | Physical identity, geometry, ownership, condition history | Candidate, verified, retired, and disputed records need separate states; location proximity alone is not a confirmed link. |
| Report | Resident-observed issue and its public/private lifecycle | It may link to an asset after review. A machine-generated alert never becomes a resident report. |
| Recommendation | Versioned reason to investigate or plan work | Advisory, expires when facts change; reviewer can accept, defer, or reject with reason. |
| Inspection task / My Work | A named employee's observation and evidence duty | Assignment follows existing permission and jurisdiction controls. The employee cannot self-approve the finding unless policy explicitly permits it. |
| Work order | Authorized physical work, resources, progress, and verification | Drafting from an asset recommendation does not issue the order. An authorized decision is required. |
| Project | Coordinated multi-task initiative | It can link many assets, reports, and work orders without replacing their records. |
| Hazard observation | Time-bounded exposure evidence | Rainfall or a hazard map is not an observed defect or asset failure probability. |

**Proposed role decisions:** City Engineer or delegated supervisor approves priority and work; asset custodian accepts inventory and condition; GIS/data steward verifies geometry and source lineage; inspector records findings; an independent reviewer verifies completed work; CDRRMO reviews disaster context and emergency referrals; utility liaison handles assets outside city maintenance authority; Records/privacy staff govern retention and access. Reconcile these with [the current role/process baseline](37-role-and-process-operational-baseline-2026-10-28.md) and approve capability, jurisdiction, delegation, and separation-of-duties rules before build.

## 4. Canonical data and service design

Extend the existing PostgreSQL/PostGIS register rather than creating a parallel asset database. Proposed additive records:

| Record | Minimum contract |
|---|---|
| `asset_source_record` | Provider, source ID, original payload reference/checksum, license, observation date, import time, claimed geometry, match decision and reviewer. |
| `asset_identity_version` | Stable PULSO ID, asset type, owner, operator, maintenance authority, lifecycle, aliases, duplicate/merge history, effective interval. |
| `asset_geometry_version` | Point/line/polygon, CRS, method, accuracy, boundary version, source, verified by/at, superseded by. |
| `asset_inspection` and `asset_defect` | Asset ID, task ID, inspector, inspection time, rubric/version, condition or unknown, defect/no-defect, photos, safety notes, reviewer outcome. |
| `maintenance_event` | Linked work order, intervention type, dates, cost only when recorded, completion evidence, verification outcome, resulting condition. |
| `hazard_source_snapshot` and `asset_exposure` | Provider/dataset/version, geographic resolution, issue/valid/import times, geometry, unit, quality flag, overlay method, uncertainty. |
| `maintenance_recommendation` | Asset, rule/model version, contributing facts, missing facts, created/expires times, disposition, actor, reason, related task/order/referral. |

Use typed, asset-specific attributes: a road segment, drainage inlet, bridge, and electrical pole do not share the same inspection rubric. Ownership, operator, and maintenance authority are different fields. Utility-owned or national assets may be visible for referral under an agreement; PULSO must not imply city authority to repair them. Start with official LGU inventory, then field surveys and permitted partner data; use OSM only to suggest missing records. A complete citywide asset database cannot be assumed from public maps.

**Processing:** the current backend is FastAPI/Python, not Laravel. Use a durable scheduled Python worker/queue compatible with the deployment, PostGIS queries, versioned imports, idempotency keys, retries, rate limits, dead-letter review, and per-source freshness monitoring. Stage each source; validate schema, coordinate order, CRS, duplicates, license, and coverage; then approve promotion. Keep raw snapshots immutable. Do not call third-party providers directly from the browser. Spatial joins produce *candidate* links with a distance/overlay method; a staff assertion confirms them. Use API versioning/compatibility fields for current predictive clients.

**Proposed service surface:** scoped `GET /assets`, `GET /assets/{id}/history`, `GET /maintenance/recommendations`, `POST /assets/{id}/inspections`, `POST /maintenance/recommendations/{id}/decision`, `POST /maintenance/recommendations/{id}/draft-work-order`, and source-health/CSV endpoints. Names are design proposals, not existing routes. Every command checks capability, district, asset state, evidence, version/ETag, idempotency, and audit actor on the server. A conflicting version yields a recoverable conflict state. Bulk imports and recommendation calculations must be restartable without duplicate events.

## 5. Data-source ladder and release gates

| Source | Use | Gate and limitation |
|---|---|---|
| City Engineering and partner inventories | Authoritative starting candidates and maintenance history | Named data owner, extraction format, rights, completeness, geometry/ID reconciliation, and update agreement. |
| [OpenStreetMap / Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) | Missing-asset discovery and map context | Candidate only; verify on the ground or against authorized inventory, respect instance policy and [ODbL attribution](https://www.openstreetmap.org/copyright). Public instances are not a city registry or guaranteed production feed. |
| [PAGASA Ten-Day Forecast API](https://tenday.pagasa.dost.gov.ph/static/media/api-doc.c9cf6abbaa781437ed96.pdf) and [flood advisories](https://www.pagasa.dost.gov.ph/flood) | Official weather context and alerts | Confirm access terms, location mapping, permitted redistribution, issue/valid time and actual availability. A city forecast is not asset-level flood depth; no open FloodCaster API is assumed. |
| [GeoRiskPH / HazardHunterPH](https://georisk.gov.ph/request-for-account/requirements) | Governed hazard reference | Advanced account requires MOA and training. Obtain permitted layer/service terms and spatial resolution before ingestion; the public website alone is not an API contract. |
| [NASA GPM IMERG](https://gpm.nasa.gov/data/imerg) | Supplementary rainfall exposure and historical context | Early product is roughly four hours behind observation and coarse relative to a street asset. Label estimate, grid, run, and timestamp; never present as a drain-level sensor. |
| DPWH, utility operators, NAMRIA, CDRRMO | Roads/bridges, utility ownership, base layers and local incident context | Partner agreement or published dataset and license are required. Do not assume detailed power, water, or telecom networks are open or safe for general display. |

First connect sources only after access and data-use review. Show `last observed`, `published`, `ingested`, `valid until`, and `last checked` separately; define per-source staleness thresholds with owners. A failed feed keeps its last known snapshot visibly stale and blocks claims of current exposure. A disaster warning should route to existing emergency procedures even when predictive services are down.

## 6. Roadmap with exit gates

| Stage | Deliverable | Exit evidence / dependency |
|---|---|---|
| 0 — Truth and policy audit | Inventory current assets, endpoint consumers, migration state, `100`/`20` defaults, 200-row cap, heuristic labels, access rules, and source rights. Define pilot area/class and responsible organization. | City Engineer and data steward sign off the decision rubric and data dictionary; misleading probability/coverage claims are identified for migration. |
| 1 — Register and inspection pilot | Verified pilot register; candidate review; asset detail; field inspection including no-defect; maintenance and work-order links; scoped CSV. | Sample reconciliation against official lists and field checks; unknowns remain unknown; repeatable import; permission and audit tests pass. |
| 2 — Hazard intelligence | One licensed/approved official feed plus time-stamped exposure snapshots; hazard overlay and stale/offline states. | Spatial QA against sample assets and source resolution; no false “real time” claim; manual emergency path tested. |
| 3 — Rule-based prioritization | Versioned asset-class rules, reasons, missing-data flags, recommendation review, My Work inspection handoff, utility referral, draft order. | Prospective pilot records acceptance/override reasons and inspection yield; false urgent alerts and missed serious cases reviewed. No automatic issuance. |
| 4 — Predictive evaluation | First per-class model in shadow mode, initially using the [90-day verified actionable defect question](11-priority-sla-documents-spatial-ml-plan-2026-09-29.md#8-predictive-maintenance-make-it-falsifiable). | Time-forward holdout, label audit, no-defect coverage, baseline comparison, calibration, top-N inspection yield, subgroup/failure analysis, versioned model card and signed thresholds. Keep model hidden from operational decisions if it fails. |
| 5 — Governed scale-up | Add asset classes/districts and partner sources one at a time; monitor drift, feed health, inspection outcomes and ownership corrections. | Each new class passes data, authority, privacy, accessibility, and model gates independently. No citywide coverage claim until register reconciliation supports it. |

Dates should be estimated after Stage 0 measures source availability, staff inspection capacity, integration approval lead times, and existing data quality. No calendar timeline or model-accuracy target is credible yet.

## 7. Model policy: what “predictive” will mean

Keep three distinct outputs: **current hazard exposure** (weather/event overlay), **asset condition** (recorded inspection/engineering assessment), and **operational priority** (human-approved response order). The proposed ML target is a verified actionable defect within 90 days for one asset class. The inspiration's 30-day percentages are sample UI values and cannot be reused as calibrated predictions. A credible `81% failure risk` label requires representative labeled outcomes, a defined 30-day target, probability calibration, and prospective validation specific to that class.

Until then, use explainable rules with evidence citations and an explicit `Unknown / insufficient evidence` result. Do not use citizen report volume alone as a failure proxy; reporting access is uneven. Train only on facts available at each historical as-of time. Separate inspection selection bias from true negatives, use future-period holdouts, and compare against a simple baseline and current practice. Measure precision at the number of assets crews can inspect, missed high-consequence defects, calibration, lead time, geographic coverage, and override reasons. High-consequence assets retain qualified engineering review regardless of model output. AI may draft a plain-language inspection plan; it does not certify condition, assign emergency priority, issue work, or approve expenditure.

## 8. Dashboard direction from the supplied image

**Proposed UX brief, not a final Figma design:** for an asset custodian, engineer, or supervisor reviewing a scoped district, use one true-location map as the Field Aperture, a ranked **inspection queue** as the primary working list, and one selected engineering docket. The user should understand *why this asset is listed, how current the evidence is, who maintains it, and the next authorized decision* without leaving the context.

- Keep the current PULSO government sidebar, routes, branding, light/dark meaning, map controls, and shared detail patterns. Reuse the existing asset and work-order paths. Do not clone the image's green palette, illustrated grid map, or fabricated score badges.
- Queue rows: asset ID/type, place, verified/candidate state, reason, latest inspection, responsible organization, evidence freshness, and next action. Sort by approved rules; show the count and scope. A rule result is not a percentage.
- Docket: real geometry/text location; condition with inspection date and rubric; past confirmed defects and maintenance; hazard overlay source/time/resolution; nearby facilities only if authoritative; missing data; review history; action and consequence. An unavailable field says `Not recorded`.
- Replace the pictured `Draft Job Order` with `Request inspection`, `Refer to responsible owner`, or `Draft work order` according to capability and record state. Require confirmation for the consequential handoff. Keep review decisions in immutable history.
- Default map markers require verified geometry. Candidate or uncertain location is visually and textually distinct. Flood layers show hazard *exposure*, not inevitable failure. Provide map list/table and address alternatives, keyboard selection, non-color status cues, visible 3 px focus, screen-reader updates, and CSV access.
- At desktop widths preserve map/queue/docket continuity. At 320 px or 200% zoom, use a scoped queue followed by full-page detail and an optional map/list switch; never squeeze three columns. Preserve filters, selected asset, scroll and freshness across navigation. Test Morning Field Sheet and Night Inspection, reduced motion, forced colors, loading, first-use empty, filtered empty, stale, offline, permission-denied, conflict and recoverable error states.

**Next design action:** inspect the live PULSO Figma file and reconcile its current government template/components with this proposed map–queue–docket contract; then create paired light/dark annotated frames and reusable patterns. This planning phase makes no Figma claim or change.

## 9. Acceptance scenarios and decisions to approve

**Release scenarios:** an asset with no inspection is not shown as healthy; duplicate OSM/city rows merge by reviewed identity without losing lineage; an uncertain pin is not silently attached to a report; a utility-owned pole routes to its maintainer; a stale rainfall feed cannot label current exposure; a hazard event does not silently create a work order; a dismissed recommendation records actor/reason/version; an inspection with no defect is captured; a repeated command creates one task; conflicting edits preserve both users' work; a failed map/API fetch is not shown as an empty inventory; unauthorized records and CSV fields remain inaccessible; daylight/dark, keyboard, 320 px and 200% zoom preserve the decision path.

**Named decisions before implementation:** pilot asset class and district (City Engineer); official inventory and geometry authority (asset custodian/GIS); utility referral/data-sharing permissions (LGU legal and utility owner); hazard source terms and freshness thresholds (CDRRMO/data steward); inspection rubric, independent verification and work authority (City Engineer); retention/privacy/export rules (Records/privacy); priority thresholds and emergency routing (LGU decision owners); model target, sample size and prospective success thresholds (City Engineer/data steward). These remain proposed until approved.

## Source notes

Provider availability and access terms were checked against the linked primary provider documentation on 29 October 2026. Existing code was read as repository evidence, not tested against production records. No live city inventory, provider credentials, signed data-sharing agreement, calibrated model, or Figma binding was verified. The supplied proposal's Laravel queue suggestion was corrected to the repository's FastAPI/Python stack. This document extends the existing proposal and preserves established functions; it does not approve a new lifecycle or authorize implementation.
