# DISPATCH: Milestone 1 Explorer — Predictive Router Randomness Purge

## Assigned Role: Predictive Analytics Explorer
## Working Directory: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_predictive
## Parent: teamwork_preview_orchestrator_2
## Source Documents:
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_orchestrator_2\PROJECT.md`
- `c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md` (section ## 2026-09-18T15:00:42Z)
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_survey_be\survey_backend_report.md` §3
- `c:\Users\Val\Desktop\PULSO\backend\predictive_router.py`
- `c:\Users\Val\Desktop\PULSO\backend\predictive_service.py`

### Objective
Produce a complete, step-by-step implementation blueprint to purge all synthetic randomness from `predictive_router.py`:
1. Identify every instance of `random` in `predictive_router.py` (e.g. lines 11, 107, 129–131, 172, 175–178, 212–213, 443–450).
2. Detail how each calculation must be replaced with deterministic calculations from `predictive_service.py` (e.g. `_failure_probability`, `_health_score`, `_next_maintenance_date`, DPWH unit costs).
3. Specify the exact function replacements, database queries for `Report`, `WorkOrder`, `InfrastructureAsset`, and `MaintenanceHistory`, input validation, and expected responses.
4. Specify pytest unit tests to verify zero randomness and test reproducibility.

Write your report to `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_predictive\predictive_plan.md` and `handoff.md`. Communicate back via `send_message`.
