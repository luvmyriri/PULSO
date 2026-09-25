# DISPATCH: Milestone 1 Worker — Backend Domain Models & REST APIs

## Assigned Role: Backend Systems Worker
## Working Directory: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_worker_m1
## Parent: teamwork_preview_orchestrator_2
## Source Documents:
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_orchestrator_2\PROJECT.md`
- `c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md` (section ## 2026-09-18T15:00:42Z)
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_predictive\predictive_plan.md`
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_announcements\announcements_plan.md`
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_gov_endpoints\gov_endpoints_plan.md`

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### File Ownership (Exclusively Owned)
- `backend/predictive_router.py`
- `backend/announcements_router.py`
- `backend/gov_models.py`
- `backend/gov_schemas.py`
- `backend/gov_crud.py`
- `backend/gov_router.py`
- `backend/main.py`
- `backend/tests/test_milestone1_backend.py`

### Implementation Tasks
1. **Purge Synthetic Randomness in `backend/predictive_router.py`**:
   - Completely remove `import random` and all 14 `random.randint`/`random.uniform` calls.
   - Wire deterministic algorithms from `backend/predictive_service.py` using live database entities (`InfrastructureAsset`, `MaintenanceHistory`, `WorkOrder`, `Report`, `EnvironmentalContext`).
   - Ensure reproducible, genuine math for failure probabilities, health scores, next maintenance dates, and DPWH cost estimates.
2. **Governed Announcements Module**:
   - In `backend/gov_models.py`: add `Announcement`, `AnnouncementCorrection`, and `AnnouncementDelivery`.
   - In `backend/gov_schemas.py`: add announcement Pydantic schemas.
   - Create `backend/announcements_router.py` supporting 6-stage lifecycle (`draft`, `in_review`, `approved`, `scheduled`, `published`, `expired`, `withdrawn`), bilingual `title_en`/`title_fil` and `content_en`/`content_fil`, timestamped corrections, and channel delivery tracking.
   - Mount in `backend/main.py`.
3. **Physical Assets Register REST APIs**:
   - Expose `GET /api/gov/assets`, `GET /api/gov/assets/stats`, `GET /api/gov/assets/{id}`, and `POST /api/gov/assets` in `backend/gov_router.py` backed by `InfrastructureAsset`.
4. **Work Order Blockers & Separation-of-Duties Inspection Verification**:
   - In `backend/gov_models.py`: add `WorkOrderBlocker` and `WorkOrderInspection`.
   - In `backend/gov_router.py`: add `POST /api/gov/work-orders/{id}/block` and `POST /api/gov/work-orders/{id}/verify`.
   - MANDATORY SERVER CHECK: Enforce that `current_user.id != work_order.assigned_to_id` (raise HTTP 403 Forbidden if identical).
5. **Citizen Report Request-Info & Operations Today Hub**:
   - In `backend/gov_router.py`: add `POST /api/gov/reports/{id}/request-info` and `GET /api/gov/operations/today`.
6. **Automated Testing & Verification**:
   - Create comprehensive pytest suite in `backend/tests/test_milestone1_backend.py` covering all new models, endpoints, lifecycle stages, separation of duties, and zero randomness.
   - Run `python -m pytest tests/test_milestone1_backend.py tests/test_milestone2_endpoints.py -q` in `backend/`.
   - Ensure all tests pass with 0 failures and 0 errors.

Write your results to `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_worker_m1\handoff.md` and communicate back via `send_message`.
