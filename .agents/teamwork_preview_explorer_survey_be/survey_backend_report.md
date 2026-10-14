# Comprehensive Backend Survey Report: PULSO Government Workspace UI Implementation

**Date:** 2026-09-18  
**Investigator:** Backend Endpoints & Data Model Explorer  
**Working Directory:** `c:\Users\Val\Desktop\PULSO\backend`  
**Target Modules:** Requirements R1 through R6 (Operations Today Hub, Reports Docket & Full Detail, Work Orders & Inspections, Physical Assets Register, Plain-Language Performance & Honest Prediction, Governed Announcements)

---

## 1. Executive Summary

A thorough architectural and source-level investigation of `c:\Users\Val\Desktop\PULSO\backend` was conducted to assess backend readiness for the full PULSO Government Workspace UI implementation (Requirements R1 through R6). 

The backend is built on **FastAPI**, **SQLAlchemy 2.0**, and **Pydantic v2**, backed in production by **PostgreSQL** (`postgresql://postgres:0428@localhost/pulso_db`) and for automated testing by an in-memory **SQLite** engine with `StaticPool`.

### Key Findings & Structural Deficits

1. **Synthetic Randomness in `predictive_router.py`**: The predictive maintenance engine currently contains **14 distinct invocations of `random.randint` and `random.uniform`**, generating artificial failure probabilities, mock recurrence rates, synthetic maintenance schedules, and randomized cost figures. A fully deterministic, DPWH-compliant mathematical calculation service (`predictive_service.py`) already exists in the repository but was bypassed by `predictive_router.py`.
2. **Missing Announcements Module**: `announcements_router.py` **does not exist**. The legacy `NewsItem` and `Advisory` models only provide basic single-author CRUD and completely lack the mandated publishing lifecycle (`Draft → In Review → Approved → Scheduled → Published → Expired/Withdrawn`), bilingual English/Filipino fields, timestamped revision/correction tracking, and multi-channel delivery auditing.
3. **Missing Physical Infrastructure Asset Endpoints**: While database models `InfrastructureAsset` and `MaintenanceHistory` exist in `gov_models.py`, there are **zero REST API endpoints** to query, filter, view, or manage them. Sidebar navigation to `/gov/assets` currently fails.
4. **Work Orders Lack Blocker & Separation-of-Duties Inspection Models**: `WorkOrder` status only supports rudimentary states (`open`, `assigned`, `in_progress`, `completed`, `cancelled`). Blockers and delay tracking are unmodeled (0 schema fields). Crucially, there is **no inspection verification table or validation check** enforcing that an independent inspector approves completed field work (`inspector_id != assigned_worker_id`), allowing field workers to self-complete their own work orders.
5. **Citizen Reports Missing "Request Information" Endpoint**: In `CitizenReportsPage.jsx`, clicking "Request Info" only displays a mock toast (`showToast`) with no backend API call. No endpoint exists to put a report into `needs_information`, notify the resident, and log an audit trail.
6. **Testing Setup is Robust**: Running `python -m pytest tests/test_milestone2_endpoints.py -q` against the system Python 3.14 environment passes 16/16 tests cleanly in 31 seconds using SQLite in-memory isolation.

---

## 2. Deep Dive: `main.py`, Router Registrations, Models, Schemas & Migrations

### 2.1 `main.py` Architecture & Router Mounting
`main.py` is 2,231 lines long and serves as the central application hub.
The application registers routers at lines 280–290:
```python
# Lines 280–290 in main.py
app.include_router(gov_router.router)
app.include_router(analytics_router.router)
app.include_router(philsys_router.router)
app.include_router(predictive_router.router)
app.include_router(document_router.router, prefix="/api/gov/documents", tags=["System Documents"])
```
- Citizen endpoints (`/api/reports`, `/api/auth/*`, `/api/me/reports`, `/api/news`, `/api/advisories`) are declared directly inside `main.py`.
- Noticeably absent: `app.include_router(announcements_router.router)` does not exist.

### 2.2 Database Models Breakdown
The backend maintains a two-tier model separation:

#### `models.py` (Citizen & Master Identity Models)
- **Geographic Lookup (3NF)**: `District` (D1, D2, D3) and `Barangay` (id, name, district_id, zip_code).
- **Identity Segregation**:
  - `Resident`: citizen-facing accounts with `trust_score`, `kyc_level`, `is_verified`.
  - `Official`: government personnel accounts with `role_id` (FK to `SystemRole`), `display_name`, `account_type`, `primary_jurisdiction`.
- **Core Entities**:
  - `Report`: central citizen report model. Fully evolved for guest reporting (`reporter_type`, `tracking_token_hash`, `contact_email`, `contact_phone`, `contact_verified`, `claimed_at`, `claimed_by_user_id`), GIS coordinates, AI triage fields (`ai_category`, `ai_urgency`, `ai_summary`, `severity_score`, `ai_metadata`), and citizen feedback (`satisfaction_rating`, `citizen_feedback_note`).
  - `Advisory`: public advisories with `advisory_id`, `department`, `title`, `description`, `priority`, `author_id`.
  - `NewsItem`: public city news with `category`, `headline`, `excerpt`, `image_url`, `published_at`, `priority`.
  - `Notification`: dual FK (`resident_id`, `official_id`) notification system.

#### `gov_models.py` (Government Operational Models)
- `WorkOrder`: dispatch assignments tied to `report_id`, `project_id`, or `asset_id`.
- `WorkOrderApproval`: tracks approval/rejection actions on work orders.
- `WorkOrderUpdate`: field-level updates with comments and image URLs.
- `AuditLog`: immutable event audit logs (`trigger_type`, `actor_id`, `action`, `details`).
- `ProcessTimeline`: immutable append-only lifecycle event tracker (`report_id`, `work_order_id`, `project_id`, `status`, `actor_id`, `note`, `is_public`).
- `ProcurementRequest` & `BoQItem`: RA 9184 procurement workflows.
- `ProjectRequest`: 6-phase LGU infrastructure project tickets.
- `OBOInspection`: private building/electrical/mechanical inspection workflow.
- `AgentLocation`: real-time GPS tracking for field personnel.
- `InfrastructureAsset`: centralized registry for municipal physical infrastructure (Roads, Drainage, Bridges, Buildings, Lights).
- `MaintenanceHistory`: chronological maintenance/repair logs for assets.
- `EnvironmentalContext`: flood risk and soil subsidence per barangay.
- `SystemDocument`: document-as-a-status-gate registry with SHA-256 integrity fingerprints and NPKI signatures.

### 2.3 Alembic & Database Migrations
- Alembic environment configured in `backend/alembic/`.
- Versions present in `backend/alembic/versions/`:
  - `23c829162372_initial_complete_schema.py`
  - `676539ba1680_finalize_architecture.py`
  - `add_agent_locations.py`
  - `da48716fc54d_3nf_normalization_sync.py`
- In addition, several standalone SQL and Python migration scripts exist in `backend/`: `pulso_3nf_migration.sql`, `pulso_3nf_unified_v2.sql`, `migrate_guest_reporting.py`, `migrate_digital_twin.py`, `migrate_segregated_schema.py`.
- Both `Base.metadata.create_all(bind=engine)` and `gov_models.Base.metadata.create_all(bind=engine)` are invoked in `main.py:51-52`, ensuring newly declared models are automatically provisioned on startup.

---

## 3. Deep Dive: `predictive_router.py` & Synthetic Randomness Purge (R5)

### 3.1 Identification of Synthetic Random Numbers
Inspection of `backend/predictive_router.py` revealed pervasive use of Python's standard `random` module:
- **Line 11**: `import random`
- **Line 107**: Hardcoded mock cost multiplier: `"scheduled_90d_cost_formatted": format_currency(urgent_cnt * 12500)`
- **Lines 129–131**: Synthetic failure probabilities in `GET /api/gov/predictive/health`:
  ```python
  fail_prob_30 = round(random.uniform(0.01, 0.1), 2)
  fail_prob_60 = round(random.uniform(0.1, 0.25), 2)
  fail_prob_90 = round(random.uniform(0.2, 0.5), 2)
  ```
- **Line 172**: Synthetic report counts: `"report_count": random.randint(0, 10)`
- **Line 175**: Synthetic recurrence rate: `"recurrence_rate": round(random.uniform(0.1, 0.4), 2)`
- **Line 176**: Synthetic maintenance days: `"days_since_last_maintenance": random.randint(10, 300)`
- **Line 177**: Synthetic next maintenance date:
  ```python
  "next_maintenance_date": (datetime.datetime.now() + datetime.timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")
  ```
- **Line 178**: Synthetic monthly frequency: `"freq_per_month": round(random.uniform(0.1, 2.0), 1)`
- **Lines 212–213**: Synthetic scheduling week and costs in `GET /api/gov/predictive/schedule`:
  ```python
  week = random.randint(1, 4)
  cost = random.randint(5000, 50000)
  ```
- **Lines 443–445, 450**: Export CSV endpoint replicating the exact same random numbers.

### 3.2 The Deterministic Solution: Reconciling with `predictive_service.py`
`predictive_service.py` (469 lines) was specifically authored to implement deterministic modeling, but `predictive_router.py` never wired into it!

`predictive_service.py` provides:
1. **Category Risk Profiles (`CATEGORY_RISK_PROFILE`)**:
   - Explicit decay rates: Roads (0.08), Drainage (0.12), Streetlights (0.05), Structural (0.03), Flooding (0.15).
   - Seasonal amplification factors (rainy season months 6–11 multiplier 1.3× to 1.6×).
2. **Deterministic Failure Probability (`_failure_probability`)**:
   $$\text{Raw} = \left(0.35 \cdot \text{FreqFactor} + 0.35 \cdot (1 - e^{-\text{decay} \cdot t / 30}) + 0.30 \cdot \text{RecurrenceFactor}\right) \cdot \text{Seasonal}$$
3. **Deterministic Health Score (`_health_score`)**:
   $$\text{Health} = \max(0, \min(100, (1 - P_{30}) \cdot 60 - \text{RecurrencePenalty} - \text{SeverityPenalty}))$$
4. **Authoritative DPWH Cost Standards**:
   - Links directly to `analytics_service.COST_MODEL` (DPWH 2024 Region 3 Price Guide) and applies standard preventive maintenance ratios (`PREVENTIVE_COST_RATIO = 0.32`).
5. **Real Database Data Sources**:
   - `report_count`: real query `db.query(func.count(Report.id))` filtered by asset/barangay and category.
   - `days_since_last_maintenance`: `(today - max(MaintenanceHistory.completion_date)).days`.
   - `next_maintenance_date`: deterministic function of `health_score` ($\le 15 \to 7$ days, $\le 35 \to 30$ days, $\le 55 \to 60$ days, $\le 75 \to 120$ days, $> 75 \to 180$ days).

---

## 4. Deep Dive: Updates & Announcements Module (`announcements_router.py`) (R6)

### 4.1 Current Codebase Status
- `backend/announcements_router.py` does **not exist**.
- Currently, public communications are fragmented between `/api/news` (`NewsItem`) and `/api/advisories` (`Advisory`) in `main.py`.
- Neither model supports the required governance workflows.

### 4.2 Gap Analysis vs. `02-updates-announcements-and-notifications.md`

| Requirement | Current State | Required by R6 & Spec |
|---|---|---|
| **Publishing Lifecycle** | Direct insert, no states | `Draft` → `In Review` → `Approved` → `Scheduled` → `Published` → `Expired/Withdrawn` |
| **Bilingual Support** | Single `headline` / `excerpt` | Dual-language fields: `title_en`, `title_fil`, `content_en`, `content_fil` |
| **Corrections Audit** | Overwrites or deletes record | Immutable correction log: visible notice, timestamp, editor, diff |
| **Channel Tracking** | No channel breakdown | Delivery status per channel (`web`, `sms`, `email`): `queued`, `attempted`, `delivered`, `failed` |
| **Source Traceability** | No link to engineering records | Foreign keys to `source_report_id`, `source_work_order_id`, `source_project_id`, `source_asset_id` |
| **RBAC Authority** | Any staff can post news | Drafter prepares; Tech Lead verifies facts; Authorized Official approves |

### 4.3 Target Data Models to Add in `gov_models.py`
```python
class Announcement(Base):
    __tablename__ = "announcements"

    id                   = Column(Integer, primary_key=True, index=True)
    announcement_id      = Column(String, unique=True, index=True) # e.g. "ANN-2026-0042"
    
    # Bilingual Content
    title_en             = Column(String, nullable=False)
    title_fil            = Column(String, nullable=True)
    content_en           = Column(Text, nullable=False)
    content_fil          = Column(Text, nullable=True)
    
    # Classification & Governance
    category             = Column(String, index=True) # planned_works, service_interruption, progress_update, work_completed, general_notice, advisory
    priority             = Column(String, default="normal", index=True) # normal | urgent | emergency
    status               = Column(String, default="draft", index=True) # draft, in_review, approved, scheduled, published, expired, withdrawn
    
    # Scope & Audience
    target_audience      = Column(String, default="public") # public, district_1, district_2, district_3, barangay, staff
    district_id          = Column(Integer, ForeignKey("districts.id"), nullable=True)
    barangay_id          = Column(Integer, ForeignKey("barangays.id"), nullable=True)
    channels             = Column(JSON, default=lambda: ["web"]) # ["web", "sms", "email"]
    
    # Timing
    scheduled_at         = Column(DateTime(timezone=True), nullable=True)
    published_at         = Column(DateTime(timezone=True), nullable=True)
    expires_at           = Column(DateTime(timezone=True), nullable=True)
    
    # Workflow Roles
    author_id            = Column(Integer, ForeignKey("officials.id"), nullable=False)
    reviewer_id          = Column(Integer, ForeignKey("officials.id"), nullable=True)
    approved_at          = Column(DateTime(timezone=True), nullable=True)
    
    # Withdrawal
    withdrawal_reason    = Column(Text, nullable=True)
    withdrawn_at         = Column(DateTime(timezone=True), nullable=True)
    withdrawn_by_id      = Column(Integer, ForeignKey("officials.id"), nullable=True)
    
    # Linked Engineering Records
    source_report_id     = Column(Integer, ForeignKey("reports.id"), nullable=True)
    source_work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    source_project_id    = Column(Integer, ForeignKey("project_requests.id"), nullable=True)
    source_asset_id      = Column(String, ForeignKey("infrastructure_assets.asset_id"), nullable=True)
    image_url            = Column(String, nullable=True)
    
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    author               = relationship("Official", foreign_keys=[author_id])
    reviewer             = relationship("Official", foreign_keys=[reviewer_id])
    corrections          = relationship("AnnouncementCorrection", back_populates="announcement", cascade="all, delete-orphan")
    deliveries           = relationship("AnnouncementDelivery", back_populates="announcement", cascade="all, delete-orphan")


class AnnouncementCorrection(Base):
    __tablename__ = "announcement_corrections"

    id               = Column(Integer, primary_key=True, index=True)
    announcement_id  = Column(Integer, ForeignKey("announcements.id"), nullable=False)
    correction_note  = Column(Text, nullable=False)
    corrected_by_id  = Column(Integer, ForeignKey("officials.id"), nullable=False)
    previous_content = Column(JSON, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    announcement     = relationship("Announcement", back_populates="corrections")
    corrected_by     = relationship("Official")


class AnnouncementDelivery(Base):
    __tablename__ = "announcement_deliveries"

    id               = Column(Integer, primary_key=True, index=True)
    announcement_id  = Column(Integer, ForeignKey("announcements.id"), nullable=False)
    channel          = Column(String, nullable=False) # "web", "sms", "email"
    status           = Column(String, default="queued") # queued, attempted, delivered, failed
    attempt_count    = Column(Integer, default=0)
    error_message    = Column(Text, nullable=True)
    last_attempted_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at     = Column(DateTime(timezone=True), nullable=True)

    announcement     = relationship("Announcement", back_populates="deliveries")
```

### 4.4 Endpoints to Expose in `announcements_router.py`
- `GET /api/gov/announcements`: List announcements with tab filters (`all`, `draft`, `in_review`, `approved`, `scheduled`, `published`, `withdrawn`, `expired`).
- `GET /api/gov/announcements/{id}`: Full announcement docket with revision history and channel deliveries.
- `POST /api/gov/announcements`: Create new draft (optional pre-fill from report, work order, or project).
- `PUT /api/gov/announcements/{id}`: Update draft (invalidates approval if modified).
- `POST /api/gov/announcements/{id}/submit-review`: Request peer/leadership review.
- `POST /api/gov/announcements/{id}/approve`: Authority sign-off.
- `POST /api/gov/announcements/{id}/publish`: Execute immediate release.
- `POST /api/gov/announcements/{id}/schedule`: Schedule future publication.
- `POST /api/gov/announcements/{id}/correct`: Post a timestamped visible correction.
- `POST /api/gov/announcements/{id}/withdraw`: Withdraw notice with mandatory justification.
- `GET /api/announcements/public`: Public resident portal feed serving published announcements with bilingual toggle support and pinned urgent items.

---

## 5. Deep Dive: Work Orders, Blockers & Independent Inspections (R3)

### 5.1 Current Work Order Workflow
- `WorkOrder` in `gov_models.py` has status flow: `open → assigned → in_progress → completed | cancelled`.
- `POST /api/gov/work-orders` (`gov_router.py:119`) allows creation.
- `PATCH /api/gov/work-orders/{wo_id}/status` (`gov_router.py:212`) allows status updates.
- `POST /api/gov/work-orders/{wo_id}/approval` (`gov_router.py:236`) approves/rejects initial assignment.

### 5.2 Critical Flaw: Absence of Separation of Duties
Currently, the assigned field crew (`assigned_to_id`) can call `PATCH /api/gov/work-orders/{wo_id}/status` with `status: "completed"`.
- There is **no inspection record**.
- There is **no independent quality gate**.
- A worker can unilaterally mark their own assigned work order as completed.

### 5.3 Blocker & Delay Gaps
- There are **0 fields** in `WorkOrder` or any table representing blockers or delays.
- A field crew facing blocked access, missing asphalt, utility clashes, or severe monsoon weather has no structured mechanism to mark a ticket as blocked with estimated delay hours.

### 5.4 Proposed Model & Schema Extensions
1. **Extend `WorkOrder` Status**:
   - Valid statuses: `open`, `assigned`, `in_progress`, `blocked`, `awaiting_verification`, `completed`, `cancelled`.
2. **Add `WorkOrderBlocker` Model**:
   ```python
   class WorkOrderBlocker(Base):
       __tablename__ = "work_order_blockers"
       id                   = Column(Integer, primary_key=True, index=True)
       work_order_id        = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
       reason_code          = Column(String, nullable=False) # weather, materials, access, equipment, permits, safety, utility_conflict, other
       description          = Column(Text, nullable=False)
       estimated_delay_days = Column(Float, default=1.0)
       blocked_by_id        = Column(Integer, ForeignKey("officials.id"), nullable=False)
       is_resolved          = Column(Boolean, default=False)
       resolved_at          = Column(DateTime(timezone=True), nullable=True)
       resolved_by_id       = Column(Integer, ForeignKey("officials.id"), nullable=True)
       resolution_notes     = Column(Text, nullable=True)
       created_at           = Column(DateTime(timezone=True), server_default=func.now())
   ```
3. **Add `WorkOrderInspection` Model**:
   ```python
   class WorkOrderInspection(Base):
       __tablename__ = "work_order_inspections"
       id                   = Column(Integer, primary_key=True, index=True)
       work_order_id        = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
       inspector_id         = Column(Integer, ForeignKey("officials.id"), nullable=False)
       status               = Column(String, nullable=False) # passed | failed | rework_required
       checklist            = Column(JSON, nullable=True) # e.g. {"dimensions_verified": true, "compaction_tested": true, "debris_cleared": true}
       findings             = Column(Text, nullable=True)
       evidence_photo_url   = Column(String, nullable=True)
       inspection_date      = Column(DateTime(timezone=True), server_default=func.now())
       created_at           = Column(DateTime(timezone=True), server_default=func.now())
   ```
4. **Strict Enforcement Logic in Inspection API**:
   ```python
   @router.post("/work-orders/{wo_id}/inspect")
   def inspect_work_order(wo_id: int, payload: InspectionCreate, db: Session, current_user):
       wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
       if not wo:
           raise HTTPException(404, "Work order not found")
           
       # SEPARATION OF DUTIES ENFORCEMENT
       if wo.assigned_to_id == current_user.id:
           raise HTTPException(
               status_code=403,
               detail="Separation of duties violation: Assigned field worker cannot inspect or verify their own work order."
           )
           
       # Must be in awaiting_verification state
       if wo.status != "awaiting_verification":
           raise HTTPException(
               status_code=400,
               detail=f"Cannot inspect work order with status '{wo.status}'. Must be 'awaiting_verification'."
           )
           
       # Log inspection and update WO status
       ...
   ```

---

## 6. Deep Dive: Physical Infrastructure Assets Register (R4)

### 6.1 Current Codebase Status
- `InfrastructureAsset` (`gov_models.py:518`) defines: `asset_id` (String primary key, e.g. "CAL-RD-001"), `asset_name`, `category` (Road, Bridge, Drainage, Building, Light), `gps_coordinates` (JSON GeoJSON), `material_type`, `date_completed`, `design_life`, `original_contractor`, `barangay`, `barangay_id`.
- `MaintenanceHistory` (`gov_models.py:545`) defines: `log_id`, `asset_id`, `work_type`, `cost`, `completion_date`.
- **Zero API endpoints exist to list or manage these assets.**
- Sidebar navigation link in the frontend (`/gov/assets`) currently has no backend data source.

### 6.2 Required Asset Endpoints to Mount in `gov_router.py`
- `GET /api/gov/assets`: Paginated asset register with filtering by `category` (Road, Drainage, Bridge, Public Building, Facility), `barangay_id`, `search`, and sorting by `health_score` or `date_completed`.
- `GET /api/gov/assets/stats`: High-level metrics (Total assets by category, average health score, critical assets count, active work orders count).
- `GET /api/gov/assets/{asset_id}`: Single asset detail returning:
  - Asset attributes and GeoJSON boundary/points.
  - Calculated Asset Health Score (AHS) and Deterioration Velocity (DV).
  - Linked historical inspection & maintenance logs (`maintenance_logs`).
  - Linked work orders (`work_orders`).
  - Linked capital projects (`projects`).
  - Environmental context (flood risk level, soil subsidence).
- `POST /api/gov/assets`: Register a new physical infrastructure asset.
- `PATCH /api/gov/assets/{asset_id}`: Update asset specifications.
- `POST /api/gov/assets/{asset_id}/maintenance`: Record a completed maintenance/inspection event.

---

## 7. Deep Dive: Citizen Reports APIs (R2)

### 7.1 "Request Information" Endpoint Analysis
In `frontend/src/pages/CitizenReportsPage.jsx` lines 275–280:
```javascript
const handleRequestInfoSubmit = async ({ reason, message }) => {
    showToast(`Information request sent to citizen: "${reason} - ${message.slice(0, 30)}..."`);
    if (selectedId) {
        loadReports({ background: true });
    }
};
```
No HTTP request was dispatched.

#### Required Backend Endpoint: `POST /api/gov/reports/{report_id}/request-info`
- **Request Payload**: `{ "reason": "Unclear location / Needs clearer evidence", "message": "Please attach a photo showing the landmark across the street." }`
- **Actions Executed**:
  1. Transitions `Report.status` to `"needs_information"`.
  2. Creates `ProcessTimeline` entry: `status="needs_information"`, `actor_id=current_user.id`, `note=f"{reason}: {message}"`, `is_public=True`.
  3. Dispatches `Notification` to `resident_id` (if registered) or logs external notification dispatch (if guest reporter with email/phone).
  4. Inserts `AuditLog` entry: `trigger_type="status_change"`, `action=f"Requested citizen information: {reason}"`.
  5. Returns updated `ReportResponse`.

### 7.2 Work Order Creation from Reports
In `CitizenReportsPage.jsx` lines 282–308:
- The UI sent camelCase `reportId` instead of `report_id`.
- Handled error responses by falling back to a toast saying "Work order created", disguising backend failure.
- `POST /api/gov/work-orders` already supports `report_id`, but needs to automatically transition report status to `"dispatched"` and emit a `ProcessTimeline` event linking the ticket number.

### 7.3 Full Report Detail Route `/gov/reports/:reportId`
To support `GovReportDetailPage.jsx`, `GET /api/reports/{report_id}` must return the complete engineering docket:
- Report core data (ticket ID, category, coordinates, address, timestamp).
- Reporter details (sanitized if unauthorized; full contact + trust score + KYC tier if authorized staff).
- Complete timeline (`ProcessTimeline`).
- Linked work orders and assigned field crew names.
- Complete AI analysis metadata (visual description, tags, severity score, duplicate detection metrics).
- Activity and audit logs.

---

## 8. Deep Dive: Daily Operations Hub ("Today") (R1)

### 8.1 Required Endpoint: `GET /api/gov/operations/today`
To power `GovTodayPage.jsx` without multiple disjointed HTTP calls and frontend client-side filtering, a single aggregated endpoint is needed:

```json
{
  "metrics": {
    "unassigned_concerns": 14,
    "overdue_actions": 3,
    "awaiting_verification": 5,
    "open_high_priority": 8,
    "resolved_in_period": 42
  },
  "needs_attention": [
    {
      "id": 101,
      "entity_type": "report",
      "ticket_id": "PUL-2026-8912",
      "title": "Severe Cave-in along Zabarte Rd",
      "category": "road_damage",
      "priority": "critical",
      "status": "pending",
      "barangay": "Barangay 172",
      "time_in_state": "4 hours",
      "action_url": "/gov/reports/101",
      "recommended_action": "Assign Emergency Work Order"
    },
    {
      "id": 45,
      "entity_type": "work_order",
      "ticket_id": "WO-98214312",
      "title": "Drainage Declogging - Phase 2",
      "category": "drainage",
      "priority": "high",
      "status": "awaiting_verification",
      "barangay": "Barangay 175",
      "time_in_state": "1 day",
      "action_url": "/gov/work/45",
      "recommended_action": "Dispatch Independent Inspector"
    }
  ],
  "sector_summary": {
    "north_caloocan": { "open_tickets": 28, "critical_count": 4 },
    "south_caloocan": { "open_tickets": 19, "critical_count": 2 }
  },
  "team_capacity": [
    { "team_name": "District 1 Road Maintenance", "active_orders": 6, "blocked_orders": 1, "capacity_pct": 75 },
    { "team_name": "North Drainage Taskforce", "active_orders": 8, "blocked_orders": 2, "capacity_pct": 95 },
    { "team_name": "Streetlight Repair Unit", "active_orders": 3, "blocked_orders": 0, "capacity_pct": 40 }
  ]
}
```

---

## 9. Plain-Language Service Performance (R5)

### 9.1 Required Endpoint: `GET /api/gov/analytics/plain-performance`
`GovAnalyticsPage.jsx` must lead with four direct civic questions:
1. **"Are we keeping up?"**
   - Calculates 7-day intake rate vs. 7-day resolution rate.
   - Net backlog velocity ($\Delta\text{backlog} = \text{Intake}_{7d} - \text{Resolved}_{7d}$).
   - Plain verdict: e.g., *"Resolution pace is exceeding intake by 12% over the last 7 days."*
2. **"Where are concerns recurring?"**
   - Identifies barangays and corridors with repeated reports within a 50-meter radius over 90 days.
   - Chronic recurrence score and repeat issue count.
3. **"Which work is delayed?"**
   - Overdue work order count (`scheduled_date < now`).
   - Active blocker breakdown by reason code and cumulative delay hours.
4. **"What should we inspect next?"**
   - Ranks infrastructure assets by Deterioration Velocity (DV) and Asset Health Score (AHS).
   - Generates proactive inspection candidates before resident complaints occur.

---

## 10. Backend Test Suite & Pytest Architecture

### 10.1 Existing Test Suite Inventory
The test suite in `backend/tests/` provides strong regression protection for citizen and auth endpoints:
- `test_milestone1_schema_security.py` (26 KB)
- `test_milestone2_endpoints.py` (28 KB)
- `test_m1_database_challenge.py` (40 KB)
- `test_e2e_open_reporting.py` (86 KB)
- `test_fuzz_crypto_m1.py` (28 KB)
- `test_challenger_m2_stress.py` (42 KB)
- `test_challenger_m2_2_security_edge.py` (32 KB)
- `test_rate_limit_anti_enum_challenge.py` (29 KB)
- `test_tier5_adversarial_hardening.py` (16 KB)

### 10.2 Test Execution Validation
- **Command Executed**: `python -m pytest tests/test_milestone2_endpoints.py -q`
- **Result**: `16 passed, 42 warnings in 31.16s` (Exit Code 0).
- **Environment**: Tested on Python 3.14.2 against an isolated in-memory SQLite database using `StaticPool`.
- **Test Fixture Pattern**: `setup_test_db` autouse fixture drops and recreates all tables (`Base.metadata.create_all` and `gov_models.Base.metadata.create_all`) for each test class, and resets the in-memory rate limiters (`report_submission_limiter`, `tracking_query_limiter`, `claim_limiter`).

### 10.3 Required New Test Suites for R1–R6
To maintain 100% test coverage for government workspace features, the following test suites must be introduced during the implementation phase:
1. `tests/test_gov_operations_today.py`: tests `GET /api/gov/operations/today` calculations and triage feed ranking.
2. `tests/test_gov_work_orders_inspections.py`: tests blocker transitions and verifies separation of duties rejection (`inspector_id == worker_id` returns 403).
3. `tests/test_gov_assets_registry.py`: tests CRUD and detail queries for municipal physical assets.
4. `tests/test_predictive_deterministic.py`: asserts zero random calls in predictive router; validates math output against DPWH standards.
5. `tests/test_gov_announcements_lifecycle.py`: tests multi-stage publishing lifecycle, bilingual fields, and timestamped correction notices.

---

## 11. Requirement-to-Backend Architecture Mapping Matrix

| Req | Module & UI Component | Required Backend Models | Target Endpoints | Key Backend Action Items |
|---|---|---|---|---|
| **R1** | Today Operations Hub (`GovTodayPage.jsx`) | Uses `Report`, `WorkOrder`, `WorkOrderBlocker` | `GET /api/gov/operations/today` | Aggregate 5 leadership metrics; assemble actionable triage feed; compute team capacity and dual-sector overview |
| **R2** | Reports Docket & Detail (`CitizenReportsPage.jsx`, `GovReportDetailPage.jsx`) | Uses `Report`, `ProcessTimeline`, `Notification`, `AuditLog` | `POST /api/gov/reports/{id}/request-info`<br>`GET /api/reports/{id}` | Replace mock toast with real info-request endpoint; enrich report detail with complete docket history and linked work orders |
| **R3** | Work Orders & Inspections (`GovWorkOrdersPage.jsx`, `GovInspectionModal.jsx`) | New: `WorkOrderBlocker`, `WorkOrderInspection`<br>Update: `WorkOrder` status enum | `POST /api/gov/work-orders/{id}/block`<br>`POST /api/gov/work-orders/{id}/unblock`<br>`POST /api/gov/work-orders/{id}/inspect`<br>`GET /api/gov/work-orders/{id}/inspections` | Add blocker reason codes and delay tracking; enforce strict separation of duties (`inspector_id != assigned_to_id`) in inspection verification |
| **R4** | Physical Infrastructure Assets (`GovAssetsPage.jsx`, `GovAssetDetailPage.jsx`) | Uses existing `InfrastructureAsset`, `MaintenanceHistory` | `GET /api/gov/assets`<br>`GET /api/gov/assets/stats`<br>`GET /api/gov/assets/{id}`<br>`POST /api/gov/assets`<br>`PATCH /api/gov/assets/{id}` | Expose full REST API for municipal asset register; link assets to maintenance history logs and work orders |
| **R5** | Plain-Language Performance & Honest Prediction (`GovAnalyticsPage.jsx`) | Uses `Report`, `WorkOrder`, `InfrastructureAsset` | `GET /api/gov/analytics/plain-performance`<br>Refactor `predictive_router.py` | Purge all 14 `random.randint`/`uniform` calls; wire `predictive_router` into deterministic `predictive_service.py`; answer 4 plain civic questions |
| **R6** | Governed Announcements (`GovAnnouncementsPage.jsx`, `GovAnnouncementEditor.jsx`) | New: `Announcement`, `AnnouncementCorrection`, `AnnouncementDelivery` | New Router: `announcements_router.py`<br>`GET /api/gov/announcements`<br>`POST /api/gov/announcements`<br>`PUT /api/gov/announcements/{id}`<br>`POST /api/gov/announcements/{id}/publish`<br>`POST /api/gov/announcements/{id}/correct`<br>`GET /api/announcements/public` | Build complete multi-stage publishing lifecycle (`Draft` → `In Review` → `Approved` → `Scheduled` → `Published` → `Expired/Withdrawn`), dual-language drafting, visible correction notices, and per-channel tracking |

---

## 12. Conclusion & Next Steps

The backend provides strong foundational primitives (`gov_models.py`, `models.py`, and `predictive_service.py`), but currently has significant functional gaps preventing the Government Workspace UI from operating on real data without mocks. 

By executing the implementation plan laid out above—purging predictive randomness, adding the announcements lifecycle, exposing physical asset endpoints, enforcing separation-of-duties inspections, and providing the operations today and report clarification endpoints—the PULSO backend will achieve complete functional integrity and truth in alignment with Civic Aperture v0.2.
