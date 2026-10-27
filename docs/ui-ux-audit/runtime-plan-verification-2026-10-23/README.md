# Current implementation verification evidence

Captured 23 October 2026 against the local working tree. Full findings: [implementation review](../../government-system-proposal/17-government-plan-implementation-verification-2026-10-23.md).

These captures use existing local development records. Names, asset signals, and outcomes are not verified city information.

| File | Evidence |
|---|---|
| `01-my-work-runtime-error.png` | `/gov/my-dashboard`: server error with zero/empty completion-like presentation. Backend traceback identifies nonexistent `WorkOrder.location_string` in `gov_crud.py:2971`. |
| `02-reports-reference.png` | `/gov/reports`: current approved visual reference, 13 local records. |
| `03-service-insights.png` | `/gov/insights?view=analytics&tab=analytics`: retained card/map layout and crowded header. |
| `04-maintenance-review.png` | `/gov/insights?view=predictive`: asset queue/docket, heuristic explanations; constrained columns at 1280px. |
| `05-maintenance-drillthrough-unfiltered.png` | Clicking the selected asset's “View 0 reports” opens `/gov/reports?search=176` but still displays all 13 records with blank search and no barangay filter. |
| `06-maintenance-320px.png` | Maintenance at 320×800; persistent expanded sidebar consumes most of viewport, content clips and overlaps. Viewport override reset after capture. |
| `07-update-draft-rejected.png` | New Updates editor after Save Draft with default Roadworks category: backend rejects `roadworks` before database access. No draft was saved. |
| `reproduce_contracts.py` | Twelve isolated defect-characterization probes using fake database sessions. Does not create schema, publish, or modify configured database records. |
| `contract-probe-results.txt` | All twelve defect probes reproduced their expected observed behavior. This is not feature-acceptance success. |
| `review-state.json` | Source fingerprints, base commit, schema presence and check summary for this review. |

Current browser paths were navigated normally with an existing local test account. No authentication protections were disabled. No AI draft was generated, valid record saved, work order created, publication released, finance action performed, or notification sent to a real recipient. Announcement list/public requests that perform request-time schema creation were deliberately not used on the configured database. Public/mutation contract defects were checked in isolation.

Reproduce isolated probes from the repository root:

```powershell
& .\backend\.venv\Scripts\python.exe .\docs\ui-ux-audit\runtime-plan-verification-2026-10-23\reproduce_contracts.py -v
```

Existing access regression checks from `backend/`:

```powershell
& .\.venv\Scripts\python.exe -m pytest tests/test_government_access_guards.py -q
```

Do not run database-reset integration fixtures on the configured development database. They require a separately designated disposable test database.
