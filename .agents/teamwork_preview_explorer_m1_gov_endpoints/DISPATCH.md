# DISPATCH: Milestone 1 Explorer — Gov Endpoints, Assets, Blockers & Inspections

## Assigned Role: Operational Endpoints Explorer
## Working Directory: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_gov_endpoints
## Parent: teamwork_preview_orchestrator_2
## Source Documents:
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_orchestrator_2\PROJECT.md`
- `c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md` (section ## 2026-09-18T15:00:42Z)
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_survey_be\survey_backend_report.md` §5, §6, §7
- `c:\Users\Val\Desktop\PULSO\backend\gov_router.py`
- `c:\Users\Val\Desktop\PULSO\backend\gov_models.py`

### Objective
Produce a complete implementation blueprint for:
1. Physical Infrastructure Asset REST endpoints in `gov_router.py`:
   - `GET /api/gov/assets` (filters: category, barangay, condition_score, search query)
   - `GET /api/gov/assets/stats` (counts and condition breakdown across Roads, Drainage, Bridges, Public Buildings, Facilities)
   - `GET /api/gov/assets/{id}` (asset details, linked `maintenance_history`, linked `work_orders`)
   - `POST /api/gov/assets` (create asset)
2. Work Order Blocker & Separation of Duties Models & Endpoints:
   - Model `WorkOrderBlocker` (`id`, `work_order_id`, `reason_code` [weather, utility, permit, materials, security], `delay_days`, `notes`, `created_at`, `resolved_at`)
   - Model `WorkOrderInspection` (`id`, `work_order_id`, `inspector_id`, `inspection_date`, `checklist_results`, `passed`, `notes`, `created_at`)
   - `POST /api/gov/work-orders/{id}/block` (updates status to 'blocked', creates blocker)
   - `POST /api/gov/work-orders/{id}/verify` (verifies work order):
     - MANDATORY ENFORCEMENT: `current_user.id != work_order.assigned_to_id` (returns HTTP 403 Forbidden if identical)
     - If passed=True, transitions status to 'completed'. If passed=False, transitions to 'rework_required'.
3. Citizen Reports & Today Operations Hub Endpoints:
   - `POST /api/gov/reports/{id}/request-info` (sets status to 'needs_information', logs `ProcessTimeline`, sends resident notification)
   - `GET /api/gov/operations/today` (returns 5 core metrics: unassigned, overdue, awaiting_verification, open_high_priority, resolved_period; triage feed; sector stats for North & South Caloocan; team capacity)


Write your report to `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_gov_endpoints\gov_endpoints_plan.md` and `handoff.md`. Communicate back via `send_message`.

## 2026-09-18T15:11:58Z
You are the Operational Endpoints Explorer for Milestone 1.
Your working directory is: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_gov_endpoints
Read your dispatch instructions in c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_gov_endpoints\DISPATCH.md.
Design the complete models and endpoints in gov_router.py for:
1. Physical asset REST endpoints (/api/gov/assets, stats, detail)
2. Work order blockers and independent inspection verification enforcing separation of duties (inspector_id != assigned_to_id)
3. Citizen reports request-info endpoint (/api/gov/reports/{id}/request-info)
4. Today operations hub aggregated endpoint (/api/gov/operations/today)
Write your plan to c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_gov_endpoints\gov_endpoints_plan.md and handoff.md.
Notify your parent (teamwork_preview_orchestrator_2) via send_message when complete.
