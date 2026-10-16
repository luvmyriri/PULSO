# BRIEFING — 2026-09-18T15:17:00Z

## Mission
Design the complete plan to purge all 14 random calls from `predictive_router.py` and connect `predictive_service.py` deterministic formulas using real database counts.

## 🔒 My Identity
- Archetype: explorer
- Roles: [investigator, synthesizer, architect]
- Working directory: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_predictive
- Original parent: fc4a17ac-bb06-478e-85a3-04b65dcbe650
- Milestone: Milestone 1 - Backend Integrity & Predictive Engine

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in product code (`backend/`, `frontend/`, `mobile_app/`)
- Adhere to PULSO AGENTS.md rules (no fabrication, real DB counts, deterministic DPWH unit costs, WCAG / Civic Aperture truth)
- Communication via files for delivery, send_message for coordination

## Current Parent
- Conversation ID: fc4a17ac-bb06-478e-85a3-04b65dcbe650
- Updated: 2026-09-18T15:17:00Z

## Investigation State
- **Explored paths**: `backend/predictive_router.py`, `backend/predictive_service.py`, `backend/predictive_engine.py`, `backend/analytics_service.py`, `backend/gov_models.py`, `backend/models.py`, `backend/tests/test_milestone2_endpoints.py`, `frontend/src/components/PredictiveMaintenance.jsx`, `frontend/src/pages/GovAnalyticsPage.jsx`
- **Key findings**:
  - Exactly 14 `random.uniform`/`random.randint` calls and 1 `import random` cataloged in `predictive_router.py`.
  - Line 107 mock calculation identified (`urgent_cnt * 12500`).
  - `predictive_service.py` possesses all deterministic mathematical models (decay rates, seasonal multipliers, failure probabilities, health scores, DPWH cost ratios) and has zero random calls.
  - Specified real DB queries across `InfrastructureAsset`, `MaintenanceHistory`, `WorkOrder`, and `Report` to calculate `days_since_last_maintenance`, `report_count`, `freq_per_month`, and `recurrence_rate`.
  - Formulated 7-test Pytest suite specification (`test_milestone1_predictive_engine.py`) including AST check, reproducibility, and contract conformance.
- **Unexplored areas**: None for this milestone. Complete blueprint formulated.

## Key Decisions Made
- Cataloged all 14 `random` instances + mock multiplier.
- Selected DPWH Region 3 2024 Unit Price Guide (`COST_MODEL`) with standard preventive maintenance ratio (`0.32`).
- Preserved existing response schemas required by `PredictiveMaintenance.jsx` while upgrading data sources to deterministic DB state.
- Formulated specification for 2 new endpoints: `GET /api/gov/predictive/maintenance-scores` and `GET /api/gov/predictive/demand-forecast`.

## Artifact Index
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_predictive\predictive_plan.md` — Detailed step-by-step blueprint for randomness purge and deterministic service integration
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_predictive\handoff.md` — 5-component handoff report for parent orchestrator
