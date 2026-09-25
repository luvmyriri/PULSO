# PULSO Government Workspace UI & System Specification Report
**Specification & Requirements Survey: R1 to R6 Comprehensive Mine**  
**Working Directory:** `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_spec_miner_survey`  
**Target Branch:** `Initial-Defense-PULSO-Refractors`  
**Date:** 2026-09-18  
**Integrity Mode:** Development (Zero Mock Fallbacks, Truth Before Polish)  
**Authoritative Sources:**
- `PRODUCT.md`
- `docs/ui-ux-audit/09-visual-art-direction-v2.md`
- `docs/government-system-proposal/09-reconciled-government-implementation-plan.md`
- `docs/government-system-proposal/10-user-profiling-and-operational-research-framework.md`
- `docs/government-system-proposal/02-updates-announcements-and-notifications.md`
- `docs/government-system-proposal/06-data-api-and-ux-contracts.md`
- `AGENTS.md`
- `ORIGINAL_REQUEST.md` (section ## 2026-09-18T15:00:42Z)
- Target Codebase: `frontend/src/` & `backend/`

---

## 1. Executive Summary & Specification Scope

This specification survey establishes the complete, authoritative operational, UX/UI, and data contracts for the full PULSO Government Workspace across six core requirements (R1–R6) and their discovered supporting architecture.

The PULSO Government Workspace is an **Operate Mode** municipal command suite designed under **Civic Aperture v0.2**. It presents one unified civic record across Caloocan City (all 193 barangays in North and South sectors), bridging resident reports into verifiable public works. The system strictly adheres to **Truth Before Polish**: all metrics, states, and actions derive from verifiable backend databases, purging synthetic random number generation (`random.randint`), eliminating deceptive client-side mock toasts, and enforcing statutory separation of duties.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1: Today Hub | 5 Core Leadership Metrics | Top-level executive KPI strip displaying Unassigned Concerns, Overdue Actions, Awaiting Verification, Open High-Priority, and Resolved in Period. | Query params: `period` (`today`, `7d`, `30d`), `sector` (`all`, `north`, `south`). | JSON with 5 validated metric counts, net velocity trend, period dates. | HTTP 401/403 for unauthorized roles; returns 0 counts with explicit baseline indicator if no data. | `09-reconciled-government-implementation-plan.md` §4.1, `ORIGINAL_REQUEST.md` R1 |
| 2 | R1: Today Hub | Actionable Needs Attention Triage Feed | High-priority exception feed surfacing blocked work, approaching SLAs, and unassigned urgent reports with direct resolution links. | User role token, optional urgency filter. | Ranked list of exception cards with blocker notes, remaining hours, and direct action route links. | Empty state banner if no active exceptions; graceful error banner on fetch failure. | `ORIGINAL_REQUEST.md` R1, `10-user-profiling-and-operational-research-framework.md` |
| 3 | R1: Today Hub | Dual-Sector GIS Cartography Overview | Map of Caloocan City (193 barangays) visualizing active incidents and work orders with North vs. South sector toggle. | GeoJSON boundary query, sector toggle (`All`, `North`, `South`). | Rendered interactive map with quiet civic styling, sector boundaries, and incident markers. | Unmapped reports grouped under "Location needs review" banner; never crashes or defaults to (0,0). | `09-reconciled-government-implementation-plan.md` §17, §4.1 |
| 4 | R1: Today Hub | Team Capacity & Blocker Indicators | Workload distribution by maintenance division (Roads, Drainage, Electrical, Facilities) showing active tasks and active blockers. | Date filter, division query. | Grouped capacity cards showing active orders, blocker count, and capacity utilization. | Excludes toxic individual employee leaderboards; shows empty team states cleanly. | `09-reconciled-government-implementation-plan.md` §4.1, `PRODUCT.md` |
| 5 | R2: Reports Docket | Non-Modal Collapsible Engineering Docket | Right-side sliding panel in `CitizenReportsPage.jsx` allowing staff to view report details without locking the background table. | Row selection event, query param `?report=:id`. | Collapsible docket drawer displaying true-color evidence aperture, coordinate rail, and signal cut lifecycle. | Focus traps avoided; Escape key or Close button clears selection and returns focus to table row. | `09-reconciled-government-implementation-plan.md` §4.2, `CitizenReportsPage.jsx` |
| 6 | R2: Reports Docket | Distinct Collapse vs. Close Affordances | Explicit two-state docket control: Collapse (minimizes to 48px rail, preserves filters/selection/map) vs. Close (clears selection). | Click on Collapse (48px rail toggle) or Close (X button). | Collapsed state shrinks to 48px vertical rail with ticket ID; Close resets page width to 100%. | State preserved across URL parameters; no lost selection on accidental collapse. | `ORIGINAL_REQUEST.md` R2, `06-data-api-and-ux-contracts.md` §Report queue |
| 7 | R2: Reports Docket | Real Citizen Information Request API | Replaces mock toasts with server-persisted information request sent to resident, creating timeline event and notification. | Payload: `{ reason_code, message, requested_fields }` to `POST /api/gov/reports/{id}/request-info`. | Updated report status (`info_requested`), new `ProcessTimeline` row, resident `Notification`. | HTTP 422 if reason is empty; HTTP 404 if report missing; HTTP 403 if unauthorized. | `CitizenReportsPage.jsx` lines 275-279, `09-reconciled-government-implementation-plan.md` |
| 8 | R2: Reports Docket | Real Work Order Dispatch API Connection | Connects docket "Assign Work Order" button to backend `POST /api/gov/work-orders`, advancing report lifecycle to `dispatched`. | Payload: `{ report_id, title, priority, assigned_to_id, category, scheduled_date, notes }`. | Created `WorkOrder` object, updated `Report.status='dispatched'`, timeline transition, resident alert. | HTTP 400 if report already dispatched; HTTP 422 on invalid dates; HTTP 403 for non-dispatchers. | `CitizenReportsPage.jsx` lines 283-308, `gov_crud.py` |
| 9 | R2: Reports Docket | Full-Page Engineering Docket Route | Dedicated deep-linked route `/gov/reports/:reportId` (`GovReportDetailPage.jsx`) for complete case analysis and printing. | Route param `reportId`, auth token. | Full-page responsive docket with evidence zoom, coordinate rail, citizen thread, and complete audit log. | HTTP 404 if report does not exist; unauthorized redirection if unauthenticated. | `ORIGINAL_REQUEST.md` R2, `App.jsx` |
| 10 | R2: Reports Docket | Context-Preserving Back Navigation | Navigating back from `/gov/reports/:reportId` to `/gov/reports` restores scroll position, active filters, page index, and docket state. | Browser Back button or docket Back button. | Restored table view at exact prior scroll position with active filters intact. | Fallback to default `/gov/reports` if no previous history entry exists. | `09-reconciled-government-implementation-plan.md` §4.2, `06-data-api-and-ux-contracts.md` |
| 11 | R3: Work Orders | Operational Tab Views in GovWorkOrdersPage | Structured views separating work orders into `Active`, `Blocked`, `Awaiting Verification`, and `Completed`. | Tab selection query param `?tab=active|blocked|awaiting_verification|completed`. | Filtered work order table with status badges, priority markers, assigned team, and target date. | Shows zero mock fallbacks; explicit empty state banner when no work orders match the filter. | `ORIGINAL_REQUEST.md` R3, `WorkOrdersPage.jsx` lines 32-39 |
| 12 | R3: Work Orders | Purge of SAMPLE_WORK_ORDERS Mock Data | Complete removal of hardcoded mock work orders and simulated merging in `WorkOrdersPage.jsx`. | Database query via `GET /api/gov/work-orders`. | Truthful rendering of database records; loading skeleton while fetching; error banner on fail. | Zero fallback to dummy arrays; prevents misleading dispatchers with fake repair jobs. | `WorkOrdersPage.jsx` lines 49-154, 184-202, `PRODUCT.md` |
| 13 | R3: Work Orders | Structured Blocker Reporting | Mechanism to report and record operational blockers preventing work execution (materials, utilities, weather). | Payload: `{ blocker_code, delay_hours, delay_days, blocker_notes, resolution_plan }` via `POST /api/gov/work-orders/{id}/blocker`. | Work order status updated to `blocked`, blocker details recorded, timeline event generated. | HTTP 422 if delay time is negative or missing blocker code; HTTP 403 if user not assigned crew. | `09-reconciled-government-implementation-plan.md` §4.3, `ORIGINAL_REQUEST.md` R3 |
| 14 | R3: Work Orders | Independent Inspection Verification Modal | Dedicated verification modal (`GovInspectionModal.jsx`) presenting side-by-side evidence for technical sign-off. | Work order ID, before evidence photo, after field photo. | Side-by-side comparison aperture with zoom, defect punch-list builder, and certification buttons. | Disables certification button if viewer is the field worker; enforces separation of duties. | `ORIGINAL_REQUEST.md` R3, `10-user-profiling-and-operational-research-framework.md` §3 |
| 15 | R3: Work Orders | Separation of Duties Enforcement | Statutory invariant: Field worker who executed the job cannot inspect or certify technical completion. | Server-side validation: `current_user.id != work_order.assigned_to_id`. | Technical approval recorded in `WorkOrderApproval`; case advances to `verified_completed`. | Server returns HTTP 403 Forbidden with detail "Inspector cannot be the assigned field worker". | `AGENTS.md`, `PRODUCT.md`, `10-user-profiling-and-operational-research-framework.md` §3 |
| 16 | R4: Asset Register | Sidebar Route Reorganization (/gov/assets) | Re-route sidebar navigation link `Assets` from `/gov/projects` to `/gov/assets`, unbundling OBO and procurement. | Click on sidebar `Assets` item. | Navigation to `/gov/assets` physical infrastructure register; active indicator highlighted. | Invalidates stale bookmarks with clean redirection; leaves `/gov/projects` under Work module. | `ORIGINAL_REQUEST.md` R4, `GovSidebar.jsx` lines 66-71 |
| 17 | R4: Asset Register | Municipal Physical Infrastructure Register | Comprehensive inventory (`GovAssetsPage.jsx`) of Roads, Drainage Networks, Bridges, Public Buildings, Facilities. | Search query, category filter, condition filter, barangay filter. | Paginated table and map view of assets with asset code, category, location, and condition status. | Clean empty state if no assets found; loading skeleton during query execution. | `09-reconciled-government-implementation-plan.md` §4.4, `gov_models.py` line 518 |
| 18 | R4: Asset Register | Truthful Condition State Model | Standardized condition tiers: `Good`, `Fair`, `Poor`, `Critical`, and `Not yet assessed` (prohibits default "Good"). | Asset registration or technical inspection update. | Visual condition badge with semantic color (Critical=red, Poor=orange, Fair=yellow, Good=teal, Unassessed=neutral). | Rejects uninspected asset defaulting to "Good"; forces explicit assessment date. | `09-reconciled-government-implementation-plan.md` §4.4 |
| 19 | R4: Asset Register | Dedicated Asset Detail Experience | Deep asset view (`GovAssetDetailPage.jsx`) at `/gov/assets/:assetId` linking technical specs, geometry, and logs. | Route param `assetId`. | Full asset docket showing construction year, design life, material, GIS geometry, and linked work. | HTTP 404 if asset ID does not exist; displays explicit error banner. | `ORIGINAL_REQUEST.md` R4, `09-reconciled-government-implementation-plan.md` §4.4 |
| 20 | R4: Asset Register | Linked Historical Maintenance & Inspection Logs | Chronological maintenance record (`MaintenanceHistory`) showing all past repairs, costs, and inspection approvals per asset. | Asset ID query. | Chronological audit timeline of repairs with dates, contractor/crew, cost, and linked tickets. | Displays "No recorded maintenance history" if asset is newly registered. | `gov_models.py` lines 545-558, `09-reconciled-government-implementation-plan.md` §4.4 |
| 21 | R5: Service Performance | Plain Civic Questions Analytics Interface | Refactored analytics (`GovAnalyticsPage.jsx`) organized around 4 plain civic questions rather than abstract KPI widgets. | Date range picker, sector toggle, category filter. | 4 structured panels: "Are we keeping up?", "Where are concerns recurring?", "Which work is delayed?", "What should we inspect next?". | Clean fallback cards when data is insufficient; never shows synthetic filler numbers. | `09-reconciled-government-implementation-plan.md` §4.5, `ORIGINAL_REQUEST.md` R5 |
| 22 | R5: Service Performance | Purge of Synthetic random.randint Endpoints | Complete removal of all `random.randint`, `random.uniform`, and `random.choice` in `predictive_router.py`. | API requests to `/api/gov/predictive/health`, `/schedule`, `/export`. | 100% deterministic outputs based on verified database queries and mathematical models. | Eliminates fabricated failure probabilities; returns genuine statistical metrics. | `predictive_router.py` lines 129, 172, 175, 212, 443, `ORIGINAL_REQUEST.md` R5 |
| 23 | R5: Service Performance | Deterministic Rule-Based Maintenance Scoring | Replaces fake probabilities with rule-based scoring (asset age, environmental flood risk, repeat reports, overdue inspection). | Asset condition data, `EnvironmentalContext`, report counts. | Health score (0-100) and risk priority (`CRITICAL`, `HIGH`, `MODERATE`, `WATCH`, `GOOD`). | Unassessed assets flagged for inspection; transparent scoring formula displayed. | `predictive_router.py`, `09-reconciled-government-implementation-plan.md` §4.5 |
| 24 | R5: Service Performance | Time-Series Demand Forecasting | Deterministic rolling-window time-series model evaluated against historical baselines using mean absolute error (MAE). | Weekly report history across categories and barangays. | Forecasted weekly intake ranges with confidence bands and baseline error metrics. | Suppresses forecast and displays "Insufficient historical data (<12 weeks)" if records are scarce. | `09-reconciled-government-implementation-plan.md` §4.5, `06-data-api-and-ux-contracts.md` §Metric definitions |
| 25 | R6: Announcements | Governed Multi-Stage Publishing Lifecycle | State-machine publishing flow: `Draft` → `In Review` → `Approved` → `Scheduled` → `Published` → `Expired/Withdrawn`. | Payload: announcement status transition commands with authorized publisher token. | Current lifecycle state, audit timestamp, authorized actor ID, next allowable actions. | HTTP 403 if drafter attempts self-approval; HTTP 409 if modifying approved version without resubmitting. | `02-updates-announcements-and-notifications.md` §2, `ORIGINAL_REQUEST.md` R6 |
| 26 | R6: Announcements | Dual-Language Bilingual Editor (en/fil) | Drafting interface (`GovAnnouncementEditor.jsx`) supporting parallel English and Filipino text entry. | Form input: English title/body/instructions and Filipino pamagat/nilalaman/tagubilin. | Synchronous side-by-side preview with character/segment counters for SMS. | Enforces mandatory content in both languages before moving to `In Review`. | `02-updates-announcements-and-notifications.md` §3, `PRODUCT.md` |
| 27 | R6: Announcements | Visible Timestamped Correction Notices | Mechanism to correct published advisories with prominent public correction banner while preserving prior versions. | Payload: `{ amendment_summary, updated_content, authorizing_official_id }`. | New immutable revision published with visible header: "Correction Notice issued on [Date]: [Summary]". | Prevents silent overwriting or hard deletion of previously broadcast public notices. | `02-updates-announcements-and-notifications.md` §2, `09-reconciled-government-implementation-plan.md` §4.6 |
| 28 | R6: Announcements | Per-Channel Delivery Telemetry Tracking | Delivery tracking monitor (`GovAnnouncementsPage.jsx`) showing real status across In-App, Email, Push, and SMS. | Outbox event delivery query via `GET /api/gov/announcements/{id}/delivery`. | Itemized telemetry: `Queued`, `Dispatched`, `Provider Accepted`, `Delivered`, `Failed` per channel. | Displays provider error reasons (e.g. invalid phone, bounced email); retry affordance with idempotency keys. | `02-updates-announcements-and-notifications.md` §2, §3 |
| 29 | R6: Announcements | Cancellation Safeguard for Linked Public Works | Automated safeguard blocking publication of scheduled advisories if linked roadwork/case is cancelled. | Work order or case cancellation trigger. | Scheduled advisory automatically locked with status `blocked_due_to_cancellation`; staff alert issued. | Prevents confusing public with announcements for cancelled road closures or repairs. | `09-reconciled-government-implementation-plan.md` §6.1 #6, `02-updates-announcements-and-notifications.md` §3 |
| 30 | Cross-Cutting | Transactional Outbox & Audit Pipeline | Reliable event dispatch via `outbox_events` table and immutable `AuditLog` / `ProcessTimeline` logging. | Any state-changing command in government workspace. | Atomic database commit containing business mutation + outbox event row. | Database rollback ensures no lost events or duplicate triggers; at-least-once idempotency. | `09-reconciled-government-implementation-plan.md` §4.8, `gov_models.py` lines 159-222 |
| 31 | Cross-Cutting | 3NF Geographic Boundary Resolution | All barangay and sector references resolve to canonical `districts` and `barangays` tables. | Barangay ID foreign key (1 to 193). | Authoritative barangay name, legislative district (D1/D2/D3), and operational sector. | Rejects arbitrary unverified barangay text strings; handles Barangays 176-A through 176-F cleanly. | `models.py` lines 16-47, `09-reconciled-government-implementation-plan.md` §4.2 |

---

## 3. Edge Cases & Boundary Conditions

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | R1: Today Hub Metrics | System query when total database records in selected period = 0. | Metrics display integer `0` with explicit helper text "No reports received in this period"; percentage change indicator is suppressed to prevent division by zero (`—%`). |
| 2 | R1: Today Map | Resident report submitted with missing GPS coordinates or ambiguous address text. | Report is excluded from map markers to prevent plotting at `(0,0)` or arbitrary defaults; displayed in queue under prominent `"Location needs review"` banner. |
| 3 | R2: Docket Collapse | User has report #842 selected, active filters applied (`category=drainage`, `status=pending`), and clicks Collapse handle. | Docket shrinks to 48px vertical rail; queue expands to fill remaining width; URL retains `?report=842&category=drainage&status=pending`; map marker for #842 remains highlighted. |
| 4 | R2: Docket Close | User clicks Close ("X") button or presses `Escape` while docket is open. | Selection is cleared (`report=null` removed from URL); docket unmounts; queue takes 100% width; focus automatically returns to the table row of report #842. |
| 5 | R2: Detail Back Nav | Staff deep-links to `/gov/reports/842`, inspects photos, then clicks the Back affordance. | If internal app history exists, restores prior queue scroll position, page index, and applied filters; if direct URL entry, navigates safely to `/gov/reports` without crash. |
| 6 | R2: Info Request API | Dispatcher submits citizen information request with blank message or missing reason code. | Server rejects mutation with HTTP 422 Unprocessable Entity; client displays inline validation warning; no fake success toast is displayed. |
| 7 | R3: Work Order Separation of Duties | Field foreman Ana Reyes (Official ID 45) attempts to certify her own completed pothole repair via `POST /api/gov/work-orders/102/approval`. | Server detects `current_user.id == work_order.assigned_to_id` and rejects with HTTP 403 Forbidden: "Separation of duties violation: Field worker cannot certify their own work". |
| 8 | R3: Blocker Submission | Field crew submits blocker report with negative estimated delay hours (`-5`). | Form client validation blocks submission; backend schema validator returns HTTP 422 with constraint error `delay_hours must be >= 0`. |
| 9 | R3: Mock Data Purge | Server database has zero work orders matching the "Blocked" filter. | UI renders empty state illustration with message "No blocked work orders. All active tasks are progressing on schedule", without falling back to `SAMPLE_WORK_ORDERS`. |
| 10 | R4: Asset Condition Default | Newly constructed drainage culvert is registered without an initial engineering inspection report. | Asset condition is stored and rendered as `Not yet assessed` (neutral badge); system strictly prevents default assignment of `Good`. |
| 11 | R4: Asset Navigation | User clicks legacy URL `/gov/projects` expecting to find physical bridge inventory. | Work projects workspace opens; banner informs user "Physical asset records have moved to /gov/assets" with one-click shortcut. |
| 12 | R5: Predictive Purge | Staff requests `/api/gov/predictive/health` when asset has no recorded maintenance logs. | `days_since_last_maintenance` is calculated from `date_completed`; if date is null, returns `null` and displays "Never maintained" instead of `random.randint(10, 300)`. |
| 13 | R5: Time-Series Forecast | Asset category has only 2 weeks of recorded incident history in the database. | Forecasting engine returns status `insufficient_data` with note "Minimum 12 weeks of continuous data required for rolling trend projection", suppressing speculative trendlines. |
| 14 | R6: Announcement Edit After Approval | An announcement is in `Approved` state; editor modifies the affected barangay list from "Brgy 172" to "Brgy 172, 173". | System detects material payload change; revokes prior approval; transitions status back to `Draft` / `Needs Review`; notifies approver of revision. |
| 15 | R6: Emergency Advisory Bypass | Field staff attempts to publish a high-priority advisory directly without required publisher role. | Server rejects with HTTP 403 Forbidden; system displays notification routing the draft to the City Engineer / Authorized Public Information Officer. |
| 16 | R6: SMS Segment Overflow | Drafter inputs Filipino text containing special Unicode characters (e.g. ñ, accented vowels) exceeding 70 characters. | SMS preview dynamically calculates UCS-2 encoding and updates segment indicator to "2 SMS segments (~PHP 1.60 per recipient)", warning of increased billing costs. |
| 17 | R6: Linked Work Cancellation | Case #309 for major asphalt overlay on Zabarte Rd is cancelled; linked announcement #14 is in `Scheduled` state set to publish in 3 hours. | Workflow triggers `CANCEL_SAFEGUARD`: announcement is placed on hold (`blocked_due_to_cancellation`); urgent task added to Communications "Needs Attention" feed. |
| 18 | Theme Parity (A11y) | User toggles from Morning Field Sheet (light) to Night Inspection (dark) on docket with high-resolution pothole photo. | True-color evidence photo remains 100% unfiltered and unaltered; surrounding chrome, coordinate rail, and docket background shift seamlessly to deep survey blue (`#0E283E`). |
| 19 | Viewport Reflow (320px) | Staff opens `/gov/reports` on a narrow mobile device (320px width). | Non-modal desktop drawer transforms into an accessible full-width view; table reflows into stacked cards without horizontal layout clipping. |
| 20 | Keyboard Navigation | Staff navigates docket using `Tab`, `Shift+Tab`, and `Enter` without a mouse. | High-visibility 3px focus ring (`#2563EB` light / `#93C5FD` dark) clearly outlines active interactive controls; focus wraps properly without trapping. |

---

## 4. Deep-Dive Specification by Requirement

### R1. Role-Aware Daily Operations Hub ("Today")

#### Objective & Purpose
The **Today Hub** (`GovTodayPage.jsx`) serves as the central operational cockpit for municipal staff upon logging in. It eliminates administrative hunting by synthesizing real-time operational status, overdue bottlenecks, and actionable triage items tailored to confirmed LGU responsibilities.

#### Information Architecture & Layout
1. **Top Header**: City Engineering Office header, active operational date (Asia/Manila), sector filter toggle (`All Caloocan (193 Brgys)`, `North Caloocan (Districts 2 & 3)`, `South Caloocan (District 1)`), and manual refresh button with authoritative timestamp.
2. **5 Core Leadership Metrics Strip**:
   - Card 1: *Unassigned Concerns* — Open reports lacking assigned crew/owner.
   - Card 2: *Overdue Actions* — Work orders past target completion timestamp.
   - Card 3: *Awaiting Verification* — Completed field work pending independent inspection.
   - Card 4: *Open High-Priority* — Verified cases flagged Critical/High severity.
   - Card 5: *Resolved in Period* — Completed & verified resolutions within active filter window.
3. **Actionable "Needs Attention" Triage Feed**:
   - Prioritized exception cards requiring immediate decision (e.g., "Pothole hazard on Camarin Rd — SLA expiring in 3 hours", "Drainage clearing blocked by utility clash — requires DPWH endorsement").
   - Direct execution affordances: `[Assign Crew]`, `[Review Blocker]`, `[Verify Work]`.
4. **Dual-Sector Geographic Map Overview**:
   - Governed North and South Caloocan basemap (Civic Aperture styling).
   - Real incident clusters and active work crews.
   - Separate `"Location needs review"` counter for unlocated reports.
5. **Team Workload & Capacity Indicators**:
   - Breakdown by operational division: *Road Maintenance*, *Drainage Clearing*, *Public Facilities*, *Electrical & Traffic*.
   - Capacity metrics: Active Work Orders, Crew Utilization %, Active Blockers.

#### Backend Interface Contract
- **Endpoint**: `GET /api/gov/today/summary`
- **Query Parameters**:
  - `period`: `string` (`today`, `7d`, `30d`, default `today`)
  - `sector`: `string` (`all`, `north`, `south`, default `all`)
- **Response Schema**:
  ```json
  {
    "period": "today",
    "sector": "all",
    "freshness_timestamp": "2026-09-18T15:30:00Z",
    "metrics": {
      "unassigned_concerns": 14,
      "overdue_actions": 3,
      "awaiting_verification": 7,
      "open_high_priority": 5,
      "resolved_in_period": 12,
      "unassigned_change_pct": -12.5,
      "resolved_change_pct": 20.0
    },
    "needs_attention": [
      {
        "id": 842,
        "ticket_id": "PUL-2026-0842",
        "title": "Severe road depression after waterline leak",
        "category": "roads_bridges",
        "barangay": "Barangay 176",
        "urgency": "critical",
        "hours_remaining": 2.5,
        "blocker_summary": null,
        "action_route": "/gov/reports/842"
      }
    ],
    "team_capacity": [
      {
        "division": "Road Maintenance",
        "active_work_orders": 8,
        "blocked_count": 1,
        "available_crews": 3,
        "utilization_rate": 0.72
      },
      {
        "division": "Drainage Clearing",
        "active_work_orders": 12,
        "blocked_count": 2,
        "available_crews": 2,
        "utilization_rate": 0.85
      }
    ],
    "unlocated_count": 2
  }
  ```

---

### R2. Reports Docket & Full Detail Experience

#### Objective & Purpose
Refactor `CitizenReportsPage.jsx` to introduce a non-modal collapsible right-side engineering docket that preserves queue context, eliminate mock toasts with real backend APIs, and provide a dedicated full-page engineering docket at `/gov/reports/:reportId` (`GovReportDetailPage.jsx`).

#### Non-Modal Collapsible Docket Interaction Spec
- **Non-Modal Architecture**:
  - The queue table and map remain fully interactive while the docket is visible.
  - Staff can continue searching, filtering, and clicking other rows without dismissing modal overlays.
- **Two Distinct Closing Affordances**:
  - **Collapse**: Minimizes the docket into a compact **48 px vertical rail handle** anchored to the right edge. The selected report ID, active query parameters, pagination, and map bounding box remain 100% preserved in URL state (`?report=842`). Clicking the 48 px handle smoothly expands the docket back.
  - **Close**: Permanently dismisses the docket, clears selection state (`?report=` parameter removed), returns 100% width to the queue, and automatically restores browser focus to the previously active table row.
- **Docket Components**:
  - *Field Aperture*: 1 dominant true-color image with subtle corner marks; metadata rail below image.
  - *Coordinate Rail*: `BRGY 176  /  14.720712, 120.985134  /  UPDATED 08:37`.
  - *Signal Cut Lifecycle*: 5-step progress line (`Received` → `Verified` → `Assigned` → `In progress` → `Resolved`).
  - *Decision Action Rail*: Sticky bottom bar with `[Request Information]`, `[Assign Work Order]`, `[Verify / Approve]`.
  - *Semantic Link*: Title and secondary button link to `/gov/reports/:reportId`.

#### Dedicated Full-Page Route (`GovReportDetailPage.jsx`)
- **Route**: `/gov/reports/:reportId`
- **Context-Preserving Back Navigation**:
  - Preserves incoming search filters, pagination page, and docket selection when returning to `/gov/reports`.
- **Dossier Sections**:
  1. Executive Summary & Verification Badge.
  2. True-Color Field Evidence Gallery with EXIF metadata (timestamp, device, coordinates).
  3. Geospatial Landmark & Barangay Authority Map.
  4. Geospatial AI Triage Audit: classification confidence, urgency rating, duplicate cluster ID.
  5. Citizen Communication Thread: official requests sent and resident responses.
  6. Linked Public Works & Field Execution: active work orders, assigned contractor/foreman, completion photos.
  7. Immutable Chronological Audit Trail (`ProcessTimeline` events with actor signatures).

#### Real Backend API Contracts
- **Citizen Information Request**:
  - `POST /api/gov/reports/{id}/request-info`
  - Payload:
    ```json
    {
      "reason_code": "LOCATION_AMBIGUOUS",
      "message": "Please confirm if the collapsed manhole is near the barangay outpost or school gate.",
      "requested_fields": ["location_notes", "landmark_photo"]
    }
    ```
  - Side Effects:
    - Sets `Report.status = 'info_requested'`.
    - Inserts `ProcessTimeline` event (`is_public=True`).
    - Creates resident `Notification` row.
    - Emits `outbox_events` message for SMS/push dispatch.
- **Work Order Assignment**:
  - `POST /api/gov/work-orders`
  - Payload:
    ```json
    {
      "report_id": 842,
      "title": "Immediate drainage clearing & grate replacement",
      "category": "Drainage",
      "priority": "high",
      "assigned_to_id": 18,
      "scheduled_date": "2026-09-19T08:00:00Z",
      "estimated_cost": 15000.00,
      "notes": "Bring vacuum truck unit 4"
    }
    ```
  - Side Effects:
    - Sets `Report.status = 'dispatched'`.
    - Creates `WorkOrder` in `gov_models.py`.
    - Inserts `ProcessTimeline` event.

---

### R3. Work Orders, Inspections & Blocker Workflow

#### Objective & Purpose
Transform the Work module (`GovWorkOrdersPage.jsx`) into an operate-mode operational workflow supporting four distinct operational views, structured blocker reporting, independent verification, and statutory separation of duties.

#### Operational Tabs in `GovWorkOrdersPage.jsx`
1. **Active**: Orders currently open, assigned, or under physical repair.
2. **Blocked**: Orders paused due to formal blocker reports (materials, weather, utilities).
3. **Awaiting Verification**: Orders where field crews have uploaded completion photos, pending technical inspection.
4. **Completed**: Formally inspected, certified, and closed work orders.

#### Structured Blocker Reporting
- **Endpoint**: `POST /api/gov/work-orders/{id}/blocker`
- **Payload Schema**:
  ```json
  {
    "blocker_code": "UTILITY_CLASH",
    "delay_days": 2,
    "delay_hours": 16,
    "blocker_notes": "Maynilad underground high-pressure pipe exposed during culvert excavation.",
    "resolution_plan": "Coordinated with Maynilad field engineer for on-site inspection on Friday morning."
  }
  ```
- **Standard Blocker Reason Codes**:
  - `MATERIALS_SHORTAGE`
  - `UTILITY_CLASH`
  - `WEATHER_DELAY`
  - `RIGHT_OF_WAY_DISPUTE`
  - `EQUIPMENT_BREAKDOWN`
  - `TRAFFIC_PERMIT_REQUIRED`
  - `OUTSIDE_MUNICIPAL_JURISDICTION`

#### Independent Inspection Verification (`GovInspectionModal.jsx`)
- **Separation of Duties Invariant**:
  $$\text{Inspector ID} \neq \text{Assigned Field Worker ID}$$
  - Enforced client-side (button disabled with explanatory tooltip).
  - Enforced server-side in `gov_router.py`:
    ```python
    if current_user.id == work_order.assigned_to_id:
        raise HTTPException(
            status_code=403,
            detail="Separation of duties violation: Field worker cannot certify their own work."
        )
    ```
- **Modal Visual Contract**:
  - *Side-by-Side Field Aperture*:
    - Left Panel: Original Citizen Report Evidence (labeled "Initial Complaint — [Timestamp]").
    - Right Panel: Field Crew Completion Proof (labeled "Field Repair Upload — [Timestamp]").
  - *Technical Punch-List Builder*: Checkbox items for compaction, site cleanup, water flow, pavement smoothness.
  - *Decision Actions*:
    - `[Accept & Certify]`: Technical certification; advances linked Report to `resolved`; writes to `MaintenanceHistory`.
    - `[Return for Rework]`: Reverts work order to `in_progress` with mandatory punch-list notes.
    - `[Reject with Reason]`: Rejects work order with formal justification.

---

### R4. Physical Infrastructure Assets Register

#### Objective & Purpose
Establish a dedicated municipal physical asset register at `/gov/assets` (`GovAssetsPage.jsx`, `GovAssetDetailPage.jsx`), linking physical assets to maintenance logs and inspection history, while moving capital construction projects exclusively into the Work module.

#### Navigation Reorganization
- Sidebar `Assets` link: Updated from `/gov/projects` to `/gov/assets`.
- Capital Projects: Retained exclusively under Work module (`/gov/delivery` / Work Orders tab).
- Administrative Permits (OBO) and Documents: Retained exclusively under Records module (`/gov/records-workspace`).

#### Physical Infrastructure Categories
1. **Roads**: Arterial roads, collector streets, barangay access ways, bridges approach slabs.
2. **Drainage Networks**: Stormwater culverts, box canals, open ditches, pumping station outfalls.
3. **Bridges**: Vehicular bridges, pedestrian overpasses, culvert bridges.
4. **Public Buildings**: Barangay halls, community health centers, public elementary/high schools.
5. **Facilities**: Municipal parks, multi-purpose sports complexes, materials recovery facilities.

#### Truthful Condition Assessment Model
- **Condition States**:
  - `Good`: Fully functional, structurally sound, regular preventive maintenance.
  - `Fair`: Superficial wear, minor patching required, fully operational.
  - `Poor`: Significant deterioration, structural defects, reduced service capacity.
  - `Critical`: Imminent structural failure, severe public hazard, urgent intervention needed.
  - `Not yet assessed`: Asset registered but pending baseline engineering audit.
- **Rule**: No uninspected asset may default to "Good".

#### Backend Data Schema (`InfrastructureAsset` & `MaintenanceHistory`)
- **Table**: `infrastructure_assets`
  - `asset_id`: `String` (PK, e.g. `CAL-RD-001`)
  - `asset_name`: `String`
  - `category`: `String` (`Roads`, `Drainage`, `Bridges`, `Public Buildings`, `Facilities`)
  - `barangay_id`: `Integer` (FK to `barangays.id`)
  - `gps_coordinates`: `JSON` (GeoJSON Point or LineString)
  - `material_type`: `String` (Asphalt, Reinforced Concrete, Structural Steel)
  - `date_completed`: `Date`
  - `design_life_years`: `Integer` (e.g. 20)
  - `current_condition`: `String` (`Good`, `Fair`, `Poor`, `Critical`, `Not yet assessed`)
  - `last_inspected_at`: `DateTime`
  - `last_inspected_by_id`: `Integer` (FK to `officials.id`)
- **Table**: `maintenance_history`
  - `log_id`: `String` (PK, UUID)
  - `asset_id`: `String` (FK to `infrastructure_assets.asset_id`)
  - `work_order_id`: `Integer` (FK to `work_orders.id`, nullable)
  - `work_type`: `String` (`Asphalt Patching`, `Desilting`, `Structural Retrofit`)
  - `cost`: `Float`
  - `completion_date`: `Date`
  - `certified_by_id`: `Integer` (FK to `officials.id`)

---

### R5. Plain-Language Service Performance & Honest Prediction

#### Objective & Purpose
Refactor `GovAnalyticsPage.jsx` to lead with plain civic questions rather than decorative telemetry. Purge all synthetic random numbers from `predictive_router.py` and implement deterministic, validated mathematical scoring.

#### Plain Civic Question Framework
1. **"Are we keeping up?"**
   - Net Backlog Velocity: Intake rate vs. Resolution throughput over rolling 7d/30d/90d windows.
   - Median Dwell Time: Hours from citizen report receipt to verified resolution.
   - Suppression of misleading percentage spikes when baseline counts are zero or negligible.
2. **"Where are concerns recurring?"**
   - Spatial and Asset Recurrence Hotspots: Tracks locations with $\ge 3$ verified reports within 60 days.
   - DBSCAN Spatial Clustering: Groups incidents within 150m radius to pinpoint infrastructure failures.
   - Estimated repair cost calculated from DPWH 2024 Region 3 unit price schedules.
3. **"Which work is delayed?"**
   - Dwell Time per Lifecycle Stage: Visual breakdown of time spent in `Intake`, `Triage`, `Field Work`, and `Inspection`.
   - Active Blocker Analysis: Ranked bar chart of blocker reasons (utility clashes, weather, material stockouts).
4. **"What should we inspect next?"**
   - Transparent, deterministic maintenance priority scoring:
     $$\text{Risk Score} = w_{\text{age}} \cdot \text{AgeRatio} + w_{\text{rain}} \cdot \text{RainRisk} + w_{\text{reports}} \cdot \text{Recurrence} + w_{\text{overdue}} \cdot \text{DaysSinceLastAudit}$$
   - Priority Buckets: `CRITICAL` ($\le 35$), `HIGH` ($\le 55$), `MODERATE` ($\le 75$), `WATCH` ($\le 90$), `GOOD` ($> 90$).

#### Purge of Synthetic Random Code in `predictive_router.py`
- **Lines Removed**:
  - `fail_prob_30 = round(random.uniform(0.01, 0.1), 2)` → Replaced with deterministic formula based on asset health score and environmental flood risk.
  - `report_count = random.randint(0, 10)` → Replaced with `db.query(func.count(Report.id)).filter(Report.asset_id == a.asset_id).scalar()`.
  - `days_since_last_maintenance = random.randint(10, 300)` → Replaced with `(datetime.now().date() - last_log.completion_date).days`.
  - `cost = random.randint(5000, 50000)` → Replaced with DPWH standard unit price schedule.
- **Time-Series Demand Forecasting**:
  - Scikit-learn `TimeSeriesSplit` evaluating weekly report arrival rates over 26-week historical baselines.
  - Returns honest error bound (Mean Absolute Error).
  - Explicitly returns `{"status": "insufficient_data"}` if historical record length is under 12 weeks.

---

### R6. Governed Updates & Announcements Publishing

#### Objective & Purpose
Implement a complete municipal communications workspace (`GovAnnouncementsPage.jsx`, `GovAnnouncementEditor.jsx`, `announcements_router.py`) supporting an auditable multi-stage publishing lifecycle, dual-language drafting, visible correction notices, and channel delivery tracking.

#### Multi-Stage Publishing Lifecycle
```
[Draft] ──> [In Review] ──> [Approved] ──> [Scheduled] ──> [Published] ──> [Expired / Withdrawn]
  │              │
  └──< Changes <─┘
     Requested
```
- **Rules**:
  - *Draft*: Created by authorized staff from scratch or from linked work order / case.
  - *In Review*: Formal review by authorized communications officer. Approver can approve or request changes.
  - *Approved*: Approval locks an immutable content revision. Any subsequent edit creates a new draft revision.
  - *Scheduled*: Enters background queue for dispatch at specified `scheduled_at` timestamp.
  - *Published*: Live across authorized channels.
  - *Withdrawn / Expired*: Withdrawn notices require authorizing officer ID and formal reason; archived permanently without hard deletion.

#### Editor & Bilingual Contract (`GovAnnouncementEditor.jsx`)
- **Fields**:
  - Category: `Road Closures`, `Drainage Maintenance`, `Service Interruption`, `Public Safety Notice`, `Project Milestone`.
  - English Content: Title, Summary, Body, Resident Action Advice.
  - Filipino Content: Pamagat, Buod, Nilalaman, Tagubilin sa Mamamayan.
  - Scope: City-wide or specific Barangays (multi-select from canonical 193 list).
  - Schedule: Publication datetime and Expiry datetime (Asia/Manila).
  - Target Distribution Channels: `Web Portal`, `In-App Push`, `Official Email`, `SMS Broadcast`.
- **Channel Previews**:
  - Web & Mobile App Card preview.
  - SMS Preview: Live character count, GSM-7 vs. Unicode detection, segment count, and estimated SMS cost.

#### Visible Timestamped Correction Notices
- Published notices cannot be silently rewritten or hard deleted.
- If an error is identified, an amended revision is submitted and approved.
- The public notice renders with a prominent amber correction badge:
  ```
  [!] CORRECTION NOTICE — Published on September 19, 2026 at 10:15 AM
  Correction Summary: Adjusted road closure boundary from Zabarte Rd to Camarin Rd.
  Prior version archived on September 18, 2026.
  ```

#### Delivery Telemetry & Infrastructure Safeguards
- **Channel Delivery Telemetry**:
  - Real status tracked per recipient/channel: `Queued` $\rightarrow$ `Dispatched` $\rightarrow$ `Provider Accepted` $\rightarrow$ `Delivered` / `Failed`.
  - Failed transmissions display genuine provider error codes without breaking published web notices.
- **Linked Work Cancellation Safeguard**:
  - If a work order or capital project is cancelled, all linked scheduled announcements are automatically locked with status `blocked_due_to_cancellation` and an alert is dispatched to communications staff.

---

## 5. Visual Art Direction & Craft Contract (Civic Aperture v0.2)

### Theme Tokens & Color Palette

| Semantic Token | Light Mode (Morning Field Sheet) | Dark Mode (Night Inspection) | Application & Meaning |
|---|---:|---:|---|
| `canvas` | `#F4F7F5` | `#071A2B` | Page background environment |
| `surface` | `#FFFFFF` | `#0E283E` | Primary card and workspace surface |
| `surface/elevated` | `#F8FAF9` | `#15364D` | Docket overlay, floating toolbars |
| `text/primary` | `#0C2436` | `#F4F7F2` | High-contrast body and heading ink |
| `text/secondary` | `#465D6C` | `#B9C7CF` | Metadata, supporting descriptions, coordinate text |
| `rule/default` | `#C9D4D9` | `#335166` | Table borders, dividers, inactive lifecycle lines |
| `action/government` | `#0B4F6C` | `#82C7D8` (with Dark Ink text) | Primary staff action buttons (Assign, Verify, Publish) |
| `action/resident` | `#B9380B` | `#FF8A3D` | Resident primary actions and public submission |
| `state/resolved` | `#0B756B` | `#66D2C8` | Completed, verified, approved statuses |
| `state/critical` | `#B42318` | `#FDA29B` | Emergency severity, destructive actions, blocker alerts |
| `state/warning` | `#B54708` | `#FEDF89` | Needs attention, pending review, delayed work |
| `focus/ring` | `#2563EB` | `#93C5FD` | 3 px high-visibility accessibility focus outline |

### Key Signatures
1. **Field Aperture**: Dominant panoramic evidence frame with quiet corner marks (`L` brackets). Metadata placed outside or on an opaque rail beneath. User evidence photos remain 100% unfiltered.
2. **Signal Cut**: 2-pixel heartbeat-derived route with sharp notch indicating active state, selected queue row, or timeline milestone.
3. **Coordinate Rail**: Monospaced engineering line (`IBM Plex Mono`) displaying real tickets, barangay numbers, coordinates, and timestamps. No decorative fake numbers.

---

## 6. End-to-End Verification & Quality Acceptance Gates

### Automated Test Matrix
1. **Separation of Duties Verification**: Unit test verifying `approve_or_reject_work_order` returns HTTP 403 Forbidden when `current_user.id == work_order.assigned_to_id`.
2. **Deterministic Prediction Verification**: Unit test ensuring `predictive_router.py` produces identical, reproducible results across multiple executions without `random` fluctuations.
3. **Outbox Reliability Test**: Transaction rollback test ensuring failed external notification calls do not roll back core business mutations.
4. **Bilingual Schema Validation**: Pydantic test enforcing non-empty strings for both English and Filipino announcement fields.
5. **Frontend Docket Regression Test**: Component test verifying Collapse retains selection in URL parameters while Close clears selection and restores focus.
6. **Accessibility Automated Scan**: Lighthouse / Axe-core test passing 100% WCAG 2.2 AA in both light and dark themes.

---

## 7. Conclusion & Handoff Readiness

This specification survey completely maps the requirements, interfaces, error handling, invariants, and visual craft necessary to execute the full PULSO Government Workspace UI refactoring. 

Proceed to orchestrator handoff for execution planning.
