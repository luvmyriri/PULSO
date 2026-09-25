# Project: PULSO Government Workspace UI Implementation

## Architecture
PULSO is the City Engineering Department Management System for Caloocan City.
This project establishes the full government operations workspace UI across all target modules:
1. Daily Operations Hub ("Today" — `GovTodayPage.jsx`)
2. Citizen Reports Docket & Full Detail (`CitizenReportsPage.jsx` refactor + `GovReportDetailPage.jsx`)
3. Work Orders, Inspections & Blocker Workflow (`GovWorkOrdersPage.jsx` + `GovInspectionModal.jsx`)
4. Physical Infrastructure Assets Register (`GovAssetsPage.jsx` + `GovAssetDetailPage.jsx`)
5. Plain-Language Service Performance & Honest Prediction (`GovAnalyticsPage.jsx` + `predictive_router.py`)
6. Governed Updates & Announcements Publishing (`GovAnnouncementsPage.jsx` + `GovAnnouncementEditor.jsx` + `announcements_router.py`)

Adheres strictly to Civic Aperture v0.2:
- Morning Field Sheet (Light mode) and Night Inspection (Dark mode)
- Field Aperture true-color evidence framing with corner marks
- 2px Signal Cut indicator line for selection and status
- Coordinate rail with authentic North and South Caloocan GIS data
- 3px focus indicators, WCAG 2.2 AA compliance, 320px reflow, 200% zoom
- Zero mock fallbacks: authentic database state or explicit error/empty banners
- Strict separation of duties: Inspector ID ≠ Field Worker ID

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FRONTEND ARCHITECTURE (/gov)                             │
│                                                                                        │
│  [GovSidebar]:                                                                         │
│    - Today: /gov/today ──► GovTodayPage.jsx (Leadership metrics, triage feed, map)     │
│    - Reports: /gov/reports ──► CitizenReportsPage.jsx (48px collapsible rail docket)    │
│    - Detail: /gov/reports/:reportId ──► GovReportDetailPage.jsx (Full-page docket)     │
│    - Work: /gov/work ──► GovWorkOrdersPage.jsx + GovInspectionModal.jsx                │
│    - Assets: /gov/assets ──► GovAssetsPage.jsx + GovAssetDetailPage.jsx                │
│    - Performance: /gov/analytics ──► GovAnalyticsPage.jsx (Plain civic questions)      │
│    - Announcements: /gov/announcements ──► GovAnnouncementsPage.jsx + Editor          │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │ REST / JSON (JWT Session Auth)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BACKEND ARCHITECTURE                                 │
│                                                                                        │
│  [FastAPI Endpoints]:                                                                  │
│    - GET /api/gov/operations/today: Aggregated metrics, triage queue, team capacity    │
│    - POST /api/gov/reports/{id}/request-info: Authenticated citizen info inquiry       │
│    - GET /api/gov/reports/{id}/docket: Deep engineering docket metadata                │
│    - POST /api/gov/work-orders/{id}/block: Blocker reporting with reason code/delay    │
│    - POST /api/gov/work-orders/{id}/verify: Separation of duties verification check    │
│    - GET /api/gov/assets, GET /api/gov/assets/{id}: Municipal physical assets register │
│    - GET /api/gov/predictive/maintenance-scores: Deterministic DPWH engineering model  │
│    - /api/gov/announcements: 6-stage lifecycle, bilingual en/fil, corrections, logs   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Today Leadership Metrics | 5 core metrics (Unassigned, Overdue, Awaiting Verification, Open High-Priority, Resolved) | M2 | R1 / Survey |
| 2 | Today Triage Feed | Actionable "Needs Attention" queue with direct execution links | M2 | R1 / Survey |
| 3 | Today Dual-Sector Map | Caloocan North & South boundary toggle and cluster visualization | M2 | R1 / Survey |
| 4 | Today Team Capacity Indicator | Team workload and active blocker breakdown | M2 | R1 / Survey |
| 5 | Today Aggregated Backend API | `GET /api/gov/operations/today` serving combined dashboard state | M1 | R1 / Survey |
| 6 | Reports Docket Non-Modal Collapsible Rail | Distinct 48px collapse rail preserving map/filters vs clear selection close | M2 | R2 / Survey |
| 7 | Real Citizen Info Request API | `POST /api/gov/reports/{id}/request-info` replacing mock toast | M1, M2 | R2 / Survey |
| 8 | Real Work Order Assignment API | Linking work order creation to reports without fallback toast | M1, M2 | R2 / Survey |
| 9 | Full-Page Engineering Docket Route | `/gov/reports/:reportId` (`GovReportDetailPage.jsx`) with context-preserving back navigation | M2 | R2 / Survey |
| 10 | Mount CitizenReportsPage at /gov/reports | Replace legacy mock dashboard with standard Civic Aperture page | M2 | R2 / Survey |
| 11 | Work Orders Operational Views | Active, Blocked, Awaiting Verification, Completed filter tabs | M3 | R3 / Survey |
| 12 | Purge SAMPLE_WORK_ORDERS | Completely eliminate mock data fallback on load or network error | M3 | R3 / Survey |
| 13 | Structured Blocker Reporting | Reason codes (weather, utility, permit, materials, security), estimated delays | M1, M3 | R3 / Survey |
| 14 | Independent Inspection Verification Modal | `GovInspectionModal.jsx` for post-completion field audit | M3 | R3 / Survey |
| 15 | Separation of Duties API Enforcement | Server check: `inspector_id != assigned_to_id` (no self-approval) | M1, M3 | R3 / Survey |
| 16 | Capital Projects Relocation | Keep capital projects strictly in Work module; unbundle from Assets | M3 | R4 / Survey |
| 17 | Sidebar Assets Re-route | Re-route `/gov/projects` to `/gov/assets` in `GovSidebar.jsx` | M4 | R4 / Survey |
| 18 | Municipal Asset Register Page | `GovAssetsPage.jsx` for Roads, Drainage, Bridges, Public Buildings, Facilities | M4 | R4 / Survey |
| 19 | Asset Detail & History View | `GovAssetDetailPage.jsx` linking historical inspections and work orders | M4 | R4 / Survey |
| 20 | Physical Asset Backend REST APIs | `GET /api/gov/assets`, `GET /api/gov/assets/{id}`, `GET /api/gov/assets/stats` | M1, M4 | R4 / Survey |
| 21 | Plain Civic Questions Analytics | Refactor `GovAnalyticsPage.jsx` around 4 plain civic questions | M5 | R5 / Survey |
| 22 | Purge Randomness from Predictive Router | Replace 14 `random.randint`/`random.uniform` calls in `predictive_router.py` | M1 | R5 / Survey |
| 23 | Deterministic Maintenance Scoring | Wire `predictive_service.py` formulas with real asset age and report recurrence | M1, M5 | R5 / Survey |
| 24 | Time-Series Demand Model | Replace mock trend generation with historical weekly baseline calculation | M1, M5 | R5 / Survey |
| 25 | Purge Mock Arrays from Insights | Purge `COMPLETION_TREND`, `ISSUE_CLUSTERS`, `PREDICTIVE_ITEMS` static arrays | M5 | R5 / Survey |
| 26 | Announcements Data Models | `Announcement`, `AnnouncementCorrection`, `AnnouncementDelivery` in database | M1 | R6 / Survey |
| 27 | Announcements Backend Router | `announcements_router.py` supporting 6-stage lifecycle | M1 | R6 / Survey |
| 28 | Announcements Management Page | `GovAnnouncementsPage.jsx` with lifecycle status filtering and delivery badges | M5 | R6 / Survey |
| 29 | Bilingual Announcement Editor | `GovAnnouncementEditor.jsx` with English & Filipino side-by-side drafting | M5 | R6 / Survey |
| 30 | Timestamped Correction Notices | Immutable audit trail of published corrections | M1, M5 | R6 / Survey |
| 31 | Per-Channel Delivery Tracking | Tracking delivery status across Web, SMS, and Email channels | M1, M5 | R6 / Survey |
| 32 | Opaque-Box E2E Test Suite (T1-T4) | 4-tier E2E testing covering all 31 features without internal mocking | M6 / E2E | AC / Spec |
| 33 | Adversarial Coverage Hardening (T5) | White-box stress testing of edge cases, separation of duties, and data integrity | M6 / E2E | AC / Spec |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Domain Models & REST APIs | Predictive router randomness purge (deterministic scoring), announcements models & router, asset REST endpoints, work order blocker & separation-of-duties inspection endpoints, citizen report request-info endpoint, operations today aggregated endpoint | none | PLANNED |
| M2 | Operations Hub & Reports Full Detail | `GovTodayPage.jsx` (5 leadership metrics, triage feed, dual-sector map, capacity), `CitizenReportsPage.jsx` refactor (48px collapsible rail docket, real API mutations), `/gov/reports/:reportId` (`GovReportDetailPage.jsx`), route `/gov/reports` directly to `CitizenReportsPage.jsx` | M1 | PLANNED |
| M3 | Work Orders, Inspections & Blocker Workflow | `GovWorkOrdersPage.jsx` operational views, purge `SAMPLE_WORK_ORDERS`, `GovInspectionModal.jsx` with strict separation of duties, capital projects unbundling | M1 | PLANNED |
| M4 | Physical Infrastructure Assets Register | Re-route sidebar `Assets` to `/gov/assets`, `GovAssetsPage.jsx`, `GovAssetDetailPage.jsx` for 5 asset categories, linked historical logs | M1 | PLANNED |
| M5 | Plain-Language Analytics & Governed Announcements | `GovAnalyticsPage.jsx` refactored to 4 plain civic questions, purge static mock arrays, `GovAnnouncementsPage.jsx`, `GovAnnouncementEditor.jsx` (bilingual, 6-stage lifecycle, corrections) | M1 | PLANNED |
| M6 | E2E Testing Suite & System Integration Gate | Dual-track E2E test suite (Tiers 1-4, `TEST_READY.md`), pass 100% E2E tests, Tier 5 adversarial hardening, WCAG 2.2 AA & responsive verification | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### Citizen Reports & Operations Hub ↔ Backend
- `GET /api/gov/operations/today` -> `{ unassigned_reports: int, overdue_actions: int, awaiting_verification: int, open_high_priority: int, resolved_period: int, triage_feed: List[ReportSummary], sector_stats: { north: SectorSummary, south: SectorSummary }, team_capacity: List[TeamCapacity] }`
- `POST /api/gov/reports/{id}/request-info` -> `{ reason: str, message: str }` -> `{ status: "success", report_id: int, timeline_id: int }`
- `GET /api/gov/reports/{id}/docket` -> Full report details, audit history, linked work orders, inspections, photos.

### Work Orders & Inspections ↔ Backend
- `POST /api/gov/work-orders/{id}/block` -> `{ reason_code: str, delay_days: int, notes: str }` -> `{ id: int, status: "blocked", blocker: BlockerDetail }`
- `POST /api/gov/work-orders/{id}/verify` -> `{ inspection_date: str, checklist_results: dict, passed: bool, notes: str }`
  - Validation constraint: `request.user.id != work_order.assigned_to_id` (HTTP 403 Forbidden if identical)
  - Result: status transitions to `"completed"` if passed=True, else `"rework_required"`.

### Infrastructure Assets ↔ Backend
- `GET /api/gov/assets?category={category}&barangay={barangay}&search={q}` -> `List[InfrastructureAsset]`
- `GET /api/gov/assets/{id}` -> `{ asset: InfrastructureAsset, maintenance_history: List[MaintenanceHistory], active_work_orders: List[WorkOrder] }`
- `GET /api/gov/assets/stats` -> Breakdown by category (Roads, Drainage, Bridges, Public Buildings, Facilities) and condition score.

### Predictive Router ↔ Analytics
- `GET /api/gov/predictive/maintenance-scores` -> Deterministic DPWH scores based on `asset.installation_date`, `asset.condition_score`, recurrence frequency, and rain/flood exposure. Zero `random` calls.
- `GET /api/gov/predictive/demand-forecast` -> Historical rolling baseline time-series forecast.

### Announcements ↔ Backend
- `GET /api/gov/announcements?status={status}&channel={channel}` -> `List[Announcement]`
- `POST /api/gov/announcements` -> `{ title_en: str, title_fil: str, content_en: str, content_fil: str, target_audience: str, channels: List[str], scheduled_at: Optional[str] }`
- `PATCH /api/gov/announcements/{id}/status` -> Transition through `Draft → In Review → Approved → Scheduled → Published → Expired/Withdrawn`.
- `POST /api/gov/announcements/{id}/corrections` -> `{ correction_text: str }` -> Logged with authoritative timestamp.

## Code Layout
- Frontend Source: `c:\Users\Val\Desktop\PULSO\frontend\src`
  - Pages: `frontend/src/pages/`
    - `GovTodayPage.jsx` (New)
    - `CitizenReportsPage.jsx` (Refactor: 48px collapse rail docket, real API calls)
    - `GovReportDetailPage.jsx` (New)
    - `GovWorkOrdersPage.jsx` (Refactor: purge `SAMPLE_WORK_ORDERS`, views)
    - `GovInspectionModal.jsx` (New: separation of duties)
    - `GovAssetsPage.jsx` (New)
    - `GovAssetDetailPage.jsx` (New)
    - `GovAnalyticsPage.jsx` (Refactor: 4 plain civic questions)
    - `GovAnnouncementsPage.jsx` (New)
    - `GovAnnouncementEditor.jsx` (New)
  - Navigation & Routes: `frontend/src/App.jsx`, `frontend/src/components/GovSidebar.jsx`
  - API Client: `frontend/src/api/` or `frontend/src/utils/api.js` (consistent `getAuthToken()`)
- Backend Source: `c:\Users\Val\Desktop\PULSO\backend`
  - Models: `backend/models.py`, `backend/gov_models.py`
  - Routers:
    - `backend/gov_router.py` (Work order blockers, inspections, asset endpoints, today endpoint)
    - `backend/predictive_router.py` (Purge `random`, wire deterministic `predictive_service.py`)
    - `backend/announcements_router.py` (New: lifecycle, corrections, delivery)
  - Tests: `backend/tests/`
- E2E Test Suite: `c:\Users\Val\Desktop\PULSO\tests\e2e\` (Opaque-box test cases Tiers 1-4)
