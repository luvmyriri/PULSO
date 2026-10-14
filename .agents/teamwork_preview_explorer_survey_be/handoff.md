# Handoff Report: Backend Endpoints & Data Model Survey

**Agent Role:** Backend Endpoints & Data Model Explorer  
**Working Directory:** `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_survey_be`  
**Parent Agent:** `teamwork_preview_orchestrator_2` (`fc4a17ac-bb06-478e-85a3-04b65dcbe650`)  
**Handoff Type:** Hard (Survey Task Complete)  
**Detailed Findings Document:** `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_survey_be\survey_backend_report.md`  

---

## 1. Observation

1. **Synthetic Randomness in Predictive Router (`predictive_router.py`)**:
   - `predictive_router.py` line 11 imports `random`.
   - Line 107 uses mock multiplier: `"scheduled_90d_cost_formatted": format_currency(urgent_cnt * 12500)`.
   - Lines 129–131 generate fake failure probabilities using `random.uniform(0.01, 0.1)`, `random.uniform(0.1, 0.25)`, `random.uniform(0.2, 0.5)`.
   - Line 172 generates `"report_count": random.randint(0, 10)`.
   - Line 175 generates `"recurrence_rate": round(random.uniform(0.1, 0.4), 2)`.
   - Line 176 generates `"days_since_last_maintenance": random.randint(10, 300)`.
   - Line 177 computes `"next_maintenance_date"` using `random.randint(5, 60)`.
   - Line 178 generates `"freq_per_month": round(random.uniform(0.1, 2.0), 1)`.
   - Lines 212–213 generate `"week": random.randint(1, 4)` and `"cost": random.randint(5000, 50000)`.
   - Lines 443–450 repeat identical `random.uniform` and `random.randint` calls in CSV export.
   - Meanwhile, `backend/predictive_service.py` (lines 79–102, 105–114, 125–133) already defines fully deterministic equations for `_failure_probability`, `_health_score`, `_next_maintenance_date`, and DPWH cost calculations, but is completely bypassed by `predictive_router.py`.

2. **Announcements Router & Models Absent (`announcements_router.py`)**:
   - Searching the repository confirms `announcements_router.py` does not exist.
   - `models.py` only defines `NewsItem` (lines 349–362) and `Advisory` (lines 298–323).
   - Neither model supports the required publishing lifecycle (`Draft → In Review → Approved → Scheduled → Published → Expired/Withdrawn`), dual-language English/Filipino fields (`title_en`, `title_fil`, `content_en`, `content_fil`), visible timestamped correction notices, or per-channel delivery tracking (`web`, `sms`, `email`).

3. **Physical Infrastructure Assets Models Exist but Have Zero Endpoints (`gov_models.py`, `gov_router.py`)**:
   - `gov_models.py` defines `InfrastructureAsset` (line 518) and `MaintenanceHistory` (line 545).
   - Grep search across `gov_router.py` and `main.py` for `/assets` returned 0 matches.
   - Frontend navigation to `/gov/assets` has no backing API.

4. **Work Orders Lack Blockers and Separation-of-Duties Inspection Verification (`gov_models.py`, `gov_router.py`)**:
   - `gov_models.py` defines `WorkOrder` (line 46) with status enum limited to `open`, `assigned`, `in_progress`, `completed`, `cancelled`.
   - Blocker and delay tracking fields do not exist (0 occurrences of blocker/delay in `gov_models.py`, `gov_schemas.py`, `gov_crud.py`).
   - `OBOInspection` (line 405) handles private construction permits only. No work order inspection model exists for public works.
   - In `gov_router.py` line 212 (`update_work_order_status`), an assigned field worker (`assigned_to_id`) can advance their own work order directly to `"completed"` without independent inspection or verification.

5. **Citizen Reports Missing "Request Info" Endpoint (`CitizenReportsPage.jsx`, `main.py`)**:
   - `CitizenReportsPage.jsx` lines 275–280 handles info requests with a client-side mock toast: `showToast("Information request sent to citizen: ...")`. No HTTP call is made.
   - Grep search for `request-info` in `backend/` returned 0 matches.

6. **Operations Today Dashboard Has No Aggregated Backend API (`gov_router.py`)**:
   - No endpoint exists for `GET /api/gov/operations/today` or `GET /api/gov/today` to serve the 5 core leadership metrics, actionable triage feed, team capacity, and dual-sector overview.

7. **Test Suite Verification**:
   - Pytest command executed: `python -m pytest tests/test_milestone2_endpoints.py -q`.
   - Result: `16 passed, 42 warnings in 31.16s` (Exit Code 0).
   - Tests execute in-memory against SQLite with `StaticPool` and autouse table recreation.

---

## 2. Logic Chain

1. **From Observation 1 (Predictive Router Randomness)**:
   - Observation 1 shows 14 instances of `random` generation in `predictive_router.py` and establishes that `predictive_service.py` contains deterministic formulas.
   - The user request Acceptance Criteria explicitly states: *"No synthetic random numbers in predictive_router.py"*.
   - Therefore, `predictive_router.py` must be refactored to consume `predictive_service.py` and real database counts from `Report`, `WorkOrder`, and `MaintenanceHistory`, purging all `random` calls.

2. **From Observation 2 (Missing Announcements Module)**:
   - Observation 2 confirms `announcements_router.py` is absent, and existing news/advisory models lack publishing lifecycle, bilingual fields, correction logs, and channel delivery tracking.
   - Requirement R6 mandates an Updates & Announcements module supporting this full lifecycle and auditing.
   - Therefore, new models (`Announcement`, `AnnouncementCorrection`, `AnnouncementDelivery`) and router `announcements_router.py` mounted in `main.py` are required.

3. **From Observation 3 (Missing Asset Endpoints)**:
   - Observation 3 shows `InfrastructureAsset` exists in the database but lacks any REST endpoints.
   - Requirement R4 requires re-routing sidebar `Assets` to `/gov/assets` for a dedicated municipal physical asset register.
   - Therefore, endpoints `GET /api/gov/assets`, `GET /api/gov/assets/stats`, `GET /api/gov/assets/{id}`, and `POST /api/gov/assets` must be implemented.

4. **From Observation 4 (Work Orders & Separation of Duties)**:
   - Observation 4 shows field workers can mark work orders completed with no inspection or separation-of-duties check.
   - Requirement R3 and Acceptance Criteria dictate: *"Field execution and independent verification enforce strict separation of duties (Inspector ID != Field Worker ID)"*.
   - Therefore, `WorkOrderBlocker` and `WorkOrderInspection` models, a status update to include `blocked` and `awaiting_verification`, and a verification endpoint enforcing `inspector_id != assigned_to_id` must be introduced.

5. **From Observation 5 (Citizen Reports Mock Toast)**:
   - Observation 5 reveals `CitizenReportsPage.jsx` uses mock toasts for requesting citizen info, with no backend endpoint.
   - Requirement R2 mandates eliminating mock toasts and connecting real backend APIs.
   - Therefore, `POST /api/gov/reports/{id}/request-info` must be implemented, transitioning status to `needs_information`, creating a `ProcessTimeline` record, and dispatching a `Notification`.

6. **From Observation 6 (Operations Today Hub)**:
   - Requirement R1 requires a centralized dashboard (`GovTodayPage.jsx`) displaying five leadership metrics, triage feed, and capacity indicators.
   - To avoid multiple disjoint queries on the client, an aggregated endpoint `GET /api/gov/operations/today` is required.

7. **From Observation 7 (Test Suite Integrity)**:
   - Automated testing works reliably via `python -m pytest`.
   - New unit and integration tests covering R1–R6 endpoints must follow the existing pattern in `tests/test_milestone2_endpoints.py`.

---

## 3. Caveats

1. **Database Runtime vs Test Runtime**:
   - Production uses PostgreSQL (`postgresql://postgres:0428@localhost/pulso_db`).
   - Pytest uses SQLite in-memory with `StaticPool`. Any new model definitions or queries must avoid PostgreSQL-specific non-standard dialects (or use standard SQLAlchemy constructs) so that both PostgreSQL and SQLite in-memory execute without syntax divergence.
2. **Read-Only Investigation Boundary**:
   - In accordance with the Explorer archetype and user constraints, no application code in `backend/` or `frontend/` was modified during this survey. All blueprints, schemas, and endpoint specifications are documented in `survey_backend_report.md`.
3. **No Other Caveats**: All relevant files, models, routers, schemas, and tests have been thoroughly examined.

---

## 4. Conclusion

The PULSO backend contains high-quality architectural foundations (`models.py`, `gov_models.py`, `predictive_service.py`), but cannot currently support the target Government Workspace UI (R1 through R6) without five concrete backend additions:
1. **Purging synthetic data in `predictive_router.py`** and connecting it to deterministic models in `predictive_service.py` (R5).
2. **Creating `announcements_router.py`** and models `Announcement`, `AnnouncementCorrection`, and `AnnouncementDelivery` (R6).
3. **Exposing physical asset REST endpoints** (`GET /api/gov/assets`, `GET /api/gov/assets/{id}`, etc.) backed by `InfrastructureAsset` (R4).
4. **Implementing blocker tracking and separation-of-duties inspection verification** (`WorkOrderBlocker`, `WorkOrderInspection`, and API check `inspector_id != assigned_to_id`) (R3).
5. **Adding operational endpoints** for `GET /api/gov/operations/today` (R1) and `POST /api/gov/reports/{id}/request-info` (R2).

---

## 5. Verification Method

1. **Verify Existing Tests Pass**:
   ```powershell
   cd c:\Users\Val\Desktop\PULSO\backend
   python -m pytest tests/test_milestone2_endpoints.py -q
   ```
   *Expected Output*: `16 passed, 42 warnings in ~31s` (Exit code 0).

2. **Verify Predictive Randomness Locations**:
   Inspect `backend/predictive_router.py` at line 11 (`import random`) and lines 107, 129–131, 172, 175–178, 212–213, 443–450.

3. **Verify Absence of Announcements Router**:
   Verify that `c:\Users\Val\Desktop\PULSO\backend\announcements_router.py` does not exist.

4. **Verify Absence of Physical Asset Endpoints**:
   Search `backend/gov_router.py` and `backend/main.py` for `/assets`. Confirm 0 route registrations.

5. **Verify Mock Toast in CitizenReportsPage.jsx**:
   Inspect `c:\Users\Val\Desktop\PULSO\frontend\src\pages\CitizenReportsPage.jsx` lines 275–280 to confirm `handleRequestInfoSubmit` only calls `showToast`.
