# Handoff Report: Predictive Router Randomness Purge & Deterministic Scoring Blueprint

**Role:** Predictive Analytics Explorer (Milestone 1)  
**Assigned Working Directory:** `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_predictive`  
**Parent Agent:** `teamwork_preview_orchestrator_2` (`fc4a17ac-bb06-478e-85a3-04b65dcbe650`)  
**Associated Artifact:** `predictive_plan.md`  
**Handoff Type:** Hard Handoff (Investigation Complete)  
**Date:** 2026-09-18  

---

## 1. Observation

Direct investigation of the PULSO codebase yielded the following factual observations:

1. **Synthetic Randomness Invocations in `predictive_router.py`**:
   Source file: `c:\Users\Val\Desktop\PULSO\backend\predictive_router.py`
   - **Line 11**: `import random`
   - **Line 107**: `"scheduled_90d_cost_formatted": format_currency(urgent_cnt * 12500), # Mock calc`
   - **Lines 129–131**:
     ```python
     fail_prob_30 = round(random.uniform(0.01, 0.1), 2)
     fail_prob_60 = round(random.uniform(0.1, 0.25), 2)
     fail_prob_90 = round(random.uniform(0.2, 0.5), 2)
     ```
   - **Line 172**: `"report_count": random.randint(0, 10),`
   - **Line 175**: `"recurrence_rate": round(random.uniform(0.1, 0.4), 2),`
   - **Line 176**: `"days_since_last_maintenance": random.randint(10, 300),`
   - **Line 177**: `"next_maintenance_date": (datetime.datetime.now() + datetime.timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d"),`
   - **Line 178**: `"freq_per_month": round(random.uniform(0.1, 2.0), 1),`
   - **Lines 212–213**:
     ```python
     week = random.randint(1, 4)
     cost = random.randint(5000, 50000)
     ```
   - **Lines 443–445, 450**:
     ```python
     fail_30 = round(random.uniform(0.01, 0.1), 2)
     fail_60 = round(random.uniform(0.1, 0.25), 2)
     fail_90 = round(random.uniform(0.2, 0.5), 2)
     ...
     (datetime.datetime.now() + datetime.timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")
     ```
   Total: Exactly 14 calls to `random.uniform` and `random.randint`, plus 1 `import random`, and 1 mock multiplier formula (`urgent_cnt * 12500`).

2. **Existing Deterministic Calculations in `predictive_service.py`**:
   Source file: `c:\Users\Val\Desktop\PULSO\backend\predictive_service.py`
   - Lines 27–37: Category risk profiles (`CATEGORY_RISK_PROFILE`) with decay rates ($\lambda = 0.03 \dots 0.15$).
   - Lines 71–76: Seasonal multiplier (`_seasonal_multiplier`) with Philippine rainy season coefficients (1.3 to 1.6).
   - Lines 79–103: Deterministic failure probability formula (`_failure_probability`) mapping `report_frequency`, `recurrence_rate`, `days_since_last_action`, and category decay rate.
   - Lines 105–114: Deterministic health score formula (`_health_score`).
   - Lines 125–134: Deterministic next maintenance date step function (`_next_maintenance_date`).
   - Lines 47–48: DPWH preventive maintenance cost ratio (`PREVENTIVE_COST_RATIO = 0.32`).
   - Zero occurrences of `random` in `predictive_service.py` or `predictive_engine.py`.

3. **Frontend Contract Usage**:
   Source file: `c:\Users\Val\Desktop\PULSO\frontend\src\components\PredictiveMaintenance.jsx`
   - Lines 628–631: Calls `GET /api/gov/predictive/summary`, `GET /api/gov/predictive/health`, `GET /api/gov/predictive/schedule`, `GET /api/gov/predictive/risk-map`.
   - Lines 660, 686, 709: Calls `POST /api/gov/predictive/ai-plan`, `POST /api/gov/predictive/convert-to-work-order`, `GET /api/gov/predictive/export`.
   - Requires consistent schema keys (`health_score`, `failure_probability_30d/60d/90d`, `report_count`, `trend`, `growth_pct`, `recurrence_rate`, `days_since_last_maintenance`, `next_maintenance_date`, `freq_per_month`, `estimated_cost_formatted`, `week_number`).

4. **Project Requirements & Missing Contract Endpoints**:
   Source file: `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_orchestrator_2\PROJECT.md`
   - Features 22, 23, 24 mandated: purge randomness, deterministic maintenance scoring, time-series demand model.
   - Interface contract specifies two additional endpoints not currently present in `predictive_router.py`:
     - `GET /api/gov/predictive/maintenance-scores`
     - `GET /api/gov/predictive/demand-forecast`

5. **Existing Pytest Test Environment**:
   - Running `python -m pytest backend/tests/test_milestone2_endpoints.py -q` passed 16/16 tests in 27.27 seconds using SQLite in-memory isolation.
   - Currently, zero unit tests exist for `predictive_router.py` in `backend/tests/`.

---

## 2. Logic Chain

1. **Identification of Root Defect**:
   - Observation 1 demonstrates that `predictive_router.py` currently synthesizes data via `random.randint` and `random.uniform` across 14 points, yielding different failure probabilities and schedules on every page load.
   - Observation 2 demonstrates that `predictive_service.py` was authored with all necessary deterministic civil engineering formulas (decay rates, seasonal amplification, failure probability, DPWH preventive cost ratio) but was never connected to `predictive_router.py`.

2. **Feasibility of Deterministic Replacement**:
   - For `days_since_last_maintenance`: Real data exists in `MaintenanceHistory.completion_date`, `WorkOrder.completed_date`, and `InfrastructureAsset.date_completed`. Querying `func.max` yields the exact elapsed days.
   - For `report_count` and `freq_per_month`: Querying `MaintenanceHistory`, `WorkOrder`, and `Report` records over a 90-day window provides the exact count. Dividing by 3.0 months provides the true monthly frequency.
   - For `recurrence_rate`: Calculating multi-interval repeated maintenance events provides a bounded $[0.0, 1.0]$ recurrence metric.
   - For `fail_prob_30/60/90`: Passing the above deterministic metrics into `predictive_service._failure_probability` yields reproducible, monotonic probabilities ($P_{30} \le P_{60} \le P_{90}$).
   - For `next_maintenance_date`: `predictive_service._next_maintenance_date` maps asset health score to discrete scheduled intervals (7, 30, 60, 120, 180 days).
   - For `scheduled_90d_cost_formatted` and schedule items: DPWH Region 3 unit costs from `analytics_service.COST_MODEL` scaled by `PREVENTIVE_COST_RATIO = 0.32` replaces both `urgent_cnt * 12500` and `random.randint(5000, 50000)`.

3. **Frontend Contract Preservation**:
   - Observation 3 proves that `PredictiveMaintenance.jsx` expects exact property names and data shapes. By keeping the response schema identical while replacing the value generation with deterministic outputs, frontend components will display stable, truthful operational metrics without UI breakage.

4. **Completeness of Interface Contracts**:
   - Observation 4 requires `maintenance-scores` and `demand-forecast`. `maintenance-scores` can be directly exposed using the deterministic scoring engine, and `demand-forecast` can connect directly to `analytics_service.get_forecast(db, weeks_back=12, weeks_forward=4)`.

---

## 3. Caveats

1. **Sparse Database Baseline**:
   - If a new environment has zero `MaintenanceHistory` or `Report` records for an asset, `report_count` will be 0, `days_since_last_maintenance` will fall back to `(today - asset.date_completed).days` or a 365-day baseline. The mathematical formulas are designed to handle 0 without division-by-zero errors.
2. **AI Action Plan Generation**:
   - `POST /api/gov/predictive/ai-plan` calls `gemini_service.generate_maintenance_plan` or `get_ai_assistant_response`. While the mathematical scoring is 100% deterministic, LLM responses naturally exhibit minor wording variations unless cached or temperature is set to 0.0. This is expected and governed by the AI service interface.

---

## 4. Conclusion

A complete, actionable blueprint has been formulated and recorded in `predictive_plan.md`:
- All 14 `random` calls in `predictive_router.py` are mapped to exact replacement formulas and database queries.
- `predictive_service.py` mathematical equations and DPWH Region 3 unit costs will directly power all endpoints.
- Two new endpoints (`/maintenance-scores` and `/demand-forecast`) are specified to fulfill PROJECT.md requirements.
- A 7-test Pytest test suite specification (`tests/test_milestone1_predictive_engine.py`) is defined to guarantee zero randomness, AST purity, and reproducibility.

---

## 5. Verification Method

To independently verify the findings and the resulting implementation:

1. **Verify No `random` Invocations via AST**:
   Run an AST check on `predictive_router.py`:
   ```bash
   python -c "import ast; tree = ast.parse(open('backend/predictive_router.py').read()); [print(node.lineno, ast.dump(node)) for node in ast.walk(tree) if isinstance(node, ast.Attribute) and getattr(node.value, 'id', None) == 'random']"
   ```
   *Expected result after implementation: 0 lines output.*

2. **Verify Deterministic Reproducibility**:
   Execute consecutive API calls to `/api/gov/predictive/summary`, `/health`, and `/schedule` against the SQLite test database with identical seed data. Compare payloads:
   $$\text{payload}_1 == \text{payload}_2$$
   *Expected result: 100% exact equality, zero variance across runs.*

3. **Verify Pytest Execution**:
   Run the newly specified unit test suite:
   ```bash
   python -m pytest backend/tests/test_milestone1_predictive_engine.py -v
   ```
   And run the existing regression suite:
   ```bash
   python -m pytest backend/tests/test_milestone2_endpoints.py -q
   ```
