# Government core workspace implementation

Status: observed local implementation, with explicit limitations below. Work began 23 October 2026; last verified 24 October 2026 (Asia/Manila). Owner: PULSO product team. Version: 1.0. This records implemented behavior against proposal 16 and the historical findings in review 17. It does not approve an LGU position structure, signing delegation, emergency policy or lifecycle.

## What changed

The current Reports interface remains the visual reference. My work, Service insights, Predictive maintenance, Updates and the Reports map now use a shared government header, restrained Field Blue actions, persistent navigation, readable tables, record details, search, loading and recovery patterns. Reports retains its existing queue and docket. Work retains its existing evidence and inspection functions and gains the missing owner-assignment step.

The active map is `frontend/src/pages/GovReportsMapPage.jsx`. Both `/gov/map` and the legacy operations dispatch view mount it. `DispatcherDashboard.jsx` remains unmounted legacy source, preserved to avoid discarding earlier work; its old command-center UI is not the active map.

| Area | Implemented behavior | Authority and limitation |
|---|---|---|
| My work | Personal work ownership; shared intake and independent verification queues; publication decisions; exact source links | Personal ownership never falls back to another staff member. Shared reviews are identified as shared. Staff availability and team capacity are not invented. |
| Reports | Existing visual UI; exact `ids` and asset drill-through; map handoff preserves a filtered report selection | Backend applies district and field-assignment scope. At most 1,000 selected report IDs per query. |
| Reports map | Scoped report query, pins, density layer, status/category/barangay/search filters, selected record, fit-to-reports, equivalent report list | Includes reports without usable coordinates in the list and counts them explicitly. Fetch failures are errors. Latest 1,000 permitted records; truncation is disclosed. |
| Heatmap | Supported Google Maps OverlayView canvas, derived from the same filtered located reports as the pins/list | Each report contributes weight 1. Density reflects overlap at the current zoom; it is not severity, risk, canonical-case volume or verified recurrence. No synthetic points or coordinates. |
| Service insights | Open reports by status/area, age since submission, actual blockers and owners, work awaiting independent verification, exact record links | The period applies to received reports; current work-order stock is identified separately. Staff counts are not productivity or capacity. No historical-backlog claim. |
| Predictive maintenance | Registry condition, recent explicitly linked reports, actual completion history, historical review projection when comparable history permits, per-asset LightGBM calculation, manual work creation | See prediction contract below. Model results are supporting estimates and never authorize work or funding. |
| Work | Open → assigned owner → existing field/evidence/review flow; eligible staff, recorded reason, confirmation and saved audit/timeline | Same-owner retries are idempotent. Field assignment and district scope remain server checks. Existing evidence and executor-conflict gates are retained. |
| Updates | Save/edit, submit, approve exact version, publish, corrections, withdrawal; reviewed report relationships; sourced Decimal disclosure | Changes invalidate approval. Public content comes from immutable released snapshots. A correction draft cannot silently replace or hide released content. |
| Resident update | Public English/Filipino content; separate authenticated owner context; canonical notification link; safe sign-in return | Public projection excludes internal report IDs and staff associations. A publication does not change report status. |
| Notifications | Durable grouped in-app outbox event per resident/release, idempotent delivery and visible delivery outcomes | Phone push, SMS and email broadcast are not configured. Web publication, queued notice, delivered notice and read are separate states. |
| Budget boundary | Optional sourced disclosure; official bidding URL; legacy procurement/funding/cash/BAC/NTP/BoQ mutation commands disabled | Project budget-check/confirmation transitions and report approve-with-budget shortcut also return 409. Historical records are retained. No budget processing is implemented. |

## Prediction contract

The maintenance list is record-based. Assets enter suggested review when their recorded condition is at or below the existing review threshold, condition is missing, linked recent reports exist, or an approaching historical interval warrants attention. An existing open work order is shown instead of encouraging duplicate work.

Selecting an asset loads its actual maintenance history and the existing LightGBM calculation. The result is presented as an **exploratory review index**, with the training limitation visible. The existing model mixes synthetic training examples and registry-derived proxy labels. Its old internal `empirical_calibrated` label is not presented as evidence of predictive validation. This implementation does not claim a calibrated failure probability, a validated repair duration, approved maintenance schedule, or automatic engineering decision. District-restricted accounts do not run the existing citywide model; their scoped history and manual review remain usable.

The historical date projection requires at least three distinct, non-future completed dates for the same recorded work type. It computes the median interval and shows the observed shortest/longest intervals, projected review date, basis and caveat. Duplicate dates and different work types are not silently treated as comparable recurring work. Missing history remains missing. Cost, allocation, ABC and disclosed budgets are excluded from this calculation.

At verification, the configured development database contained 34 assets and 44 maintenance rows, but no asset met that comparability requirement. Therefore no historical review dates were fabricated. The LightGBM calculation completed for a selected asset and returned an experimental index. This is a working calculation path, not evidence that the model predicts real infrastructure failures accurately. Longitudinal condition/outcome data and evaluation remain necessary for that claim.

An authorized reviewer can create a scoped inspection or preventive work order without AI drafting. The returned saved work-order ID opens the actual work record, where an eligible owner can be assigned. A manual scope is not labelled AI-generated. Duplicate open preventive work is rejected.

## API and data authority

| API | Use |
|---|---|
| `GET /api/gov/navigation` | Server-derived available module IDs |
| `GET /api/gov/operations/today` | Personal ownership and eligible shared review queues |
| `GET /api/gov/report-map` | Minimal scoped staff report projection; optional exact IDs or asset link |
| `GET /api/gov/service-insights?days=90` | Record-backed decision tables and exact underlying IDs |
| `GET /api/gov/predictive/health` | Condition/history-based maintenance queue |
| `GET /api/gov/predictive/assets/{asset_id}/forecast` | History and historical projection; `include_model=true` requests model analysis |
| `POST /api/gov/predictive/convert-to-work-order` | Reviewed manual work creation |
| `POST /api/gov/work-orders/{id}/assignment` | First owner assignment with eligibility, scope and audit |
| `/api/gov/announcements` | Versioned staff content, workflow, disclosure, relationships and delivery state |
| `/api/announcements/{id}` | Strict released public projection |
| `/api/announcements/{id}/my-report-context` | Authenticated resident-owned report context |

Explicit module capability grants override pilot title defaults in the shared core access helper. A platform-administrator title alone does not grant publication approval. Malformed configured jurisdiction fails closed. Geography and field-assignment checks apply before map/report aggregation and before work pagination. These controls do not constitute confirmation that the pilot title policy matches the City's real delegations.

Platform administrators retain read access to service insights and maintenance analysis for support. That read access does not grant maintenance work creation or publication approval; those require operational roles or explicit capabilities.

## State, accessibility and responsive contract

| Pattern | Implemented states and recovery |
|---|---|
| Shared queues | Loading, first/filtered empty, failure with retry, refresh, selected record, success; failures do not become empty lists |
| Navigation | Server-derived destinations, current-page indicator, labelled narrow-layout dialog, close/Escape and focus return |
| Record detail | Full-width record below 1280 px; Back to list; focus heading; restore source trigger where available |
| Tables | Captions, header scope, explicit record buttons, pagination; labelled compact rows below 640 px |
| Decisions | Native confirmation dialog, named consequence, cancel/focus return, saving state, retained error and reason; server rejects stale/unauthorized decisions |
| Map | Loading/provider error, filtered empty, missing coordinates, report list/address alternative, selected record and exact source context |
| Maintenance | Missing condition/history, insufficient comparable history, unavailable experimental calculation, existing work, failed/successful work creation |
| Publishing | Draft/review/approved/published/withdrawn, optimistic conflict, correction draft, immutable release, absent optional disclosure/translation, channel delivery outcomes |

Shared core CSS supplies 3 px visible focus, non-color status text, light/dark parity, reduced-motion and forced-color rules. Earlier browser checks exercised core desktop and narrow detail layouts and publication/assignment actions on explicitly synthetic data. The latest map and prediction changes passed build/API checks, but their final browser visual pass was unavailable because local browser use was disabled in Work settings. Do not claim full screen-reader, 200% browser zoom, Google-provider rendering or WCAG 2.2 AA certification from these checks.

## Verification and environment

- Production frontend build: passed. Existing large Spline/Three bundle warnings remain; no application-wide performance certification is claimed.
- Targeted frontend lint: passed with no errors for the new map, prediction, insights, updates, public view, shared API helper and navigation files. Shared component exports retain development fast-refresh warnings when included.
- Government integration/access/command regression suite: **65 passed**, with existing dependency/deprecation warnings. Includes map scope and unlocated records, exact selections, historical projection input rules, optional model calculation, manual work creation, assignment retries, public/private projection, correction preservation, outbox retries and disabled financial commands.
- Authenticated HTTP checks against the configured local API returned 200 for map, maintenance, insights, work, updates and a selected asset forecast. Observed development data: 13 reports, all 13 located, 34 assets and 34 work orders. Counts are development records, not verified City outcomes.
- No real resident was sent a test announcement. Publication and assignment browser mutations were confined to the disposable review database.

The normal backend at `127.0.0.1:33159` has been restored to the configured application database. A previous disposable browser-review server on that port caused the app to show the wrong dataset; that setup mistake is corrected. Review mode now uses **33160**, so running it cannot occupy the normal application API port. Any temporary `review.*@test.invalid` browser session must sign out and use a normal configured staff account.

Run regression checks from the repository root with:

```powershell
.\backend\.venv\Scripts\python.exe scripts/verify_government_core.py
```

The helper only creates/resets `pulso_test_government_core_20261023`, validates localhost and sets the disposable-test guard. It never runs destructive fixtures against the configured application database. Browser-review mode is separate and requires a separate frontend configured for its 33160 API; do not redirect the main frontend to disposable data.

Alembic revision `09b4d6e8f210` adds immutable announcement revisions, disclosure references/Decimal amounts, associations and canonical notification targets. It was applied locally. Schema inventory and bootstrap head references are updated. Released civic history is not automatically deleted by downgrade; restoration must be planned. No deployment or remote migration is claimed.

## Design reference and remaining scope

The shared Figma file received an editable core-record reference family before the final map/prediction correction: [Core patterns](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi?node-id=103-180). It contains paired themes and queue/detail/empty/error/loading instances, not complete route prototypes or a substitute for functioning code. Its state ledger and historical screenshots are in `docs/ui-ux-audit/core-workspace-implementation-2026-10-23/`. Existing reviewer templates remain intact. The latest implementation and checks above are the evidence for this delivery.

This completes the implemented core correction scope, not every proposal in document 16. Actual LGU role/delegation interviews, canonical case grouping, evidence-defined recurrence, validated prediction, staff availability, historical backlog reconstruction, phone push and broader Projects/OBO/administration modernization remain separate work. Existing adjacent pages retain their current functional interfaces. No measured KPI, institutional approval or full government-wide visual certification is implied.
