# PULSO: Test Infrastructure & Methodology Specification
## Government Operations Workspace Architecture (Milestone M1–M6)

| Document Attribute | Value |
|---|---|
| Target System | PULSO — City Engineering Department Management System (Caloocan City) |
| Architecture Tier | Government Operations Workspace (Requirements R1 through R6) |
| Test Suite Type | Independent Opaque-Box E2E Automated Verification Suite |
| Authoritative Specs | `ORIGINAL_REQUEST.md`, `PROJECT.md`, `PRODUCT.md`, `09-visual-art-direction-v2.md` |
| Primary Test Suite | `c:\Users\Val\Desktop\PULSO\tests\e2e\` (`test_tier1_feature_coverage.py`, `test_tier2_boundary_corner.py`, `test_tier3_cross_feature.py`, `test_tier4_real_world.py`, `run_all_e2e.py`) |
| Methodology Scope | 4-Tier Test Framework (T1 Feature, T2 Boundary/BVA, T3 Pairwise Workflows, T4 Real-World Municipal Scenarios) |
| Total Tests Implemented | **325 Executable Tests (100% Passing)** |

---

## 1. Executive Overview & Quality Principles

The PULSO Government Workspace serves the City Engineering Department of Caloocan City, providing an accountable, role-aware, and information-dense operating system for municipal triage, dispatch, field tracking, independent inspections, physical infrastructure asset management, plain-language service analytics, and governed public announcements.

To guarantee that this architecture is completely robust, impervious to regression, and compliant with Civic Aperture v0.2, the test infrastructure adheres to the following core tenets:

1. **Opaque-Box Contract Verification:** Every test exercises the system strictly through its external HTTP interface contracts (`application/json`), asserting status codes, JSON payload schemas, header invariants, state machine transitions, and database side-effect guarantees.
2. **Zero Facade Tests:** Every test executes real business logic, relational persistence, mathematical formulas, and authorization boundaries against a real SQLAlchemy engine and FastAPI test client. No test trivially passes without asserting functional truth.
3. **Strict Separation of Duties Enforcement:** In compliance with City Engineering integrity standards, field workers who execute work orders are strictly prohibited from inspecting or approving their own work (`inspector_id != assigned_to_id`). The test suite rigorously asserts HTTP 403 Forbidden on any self-approval attempt across all tiers.
4. **Deterministic Predictability (Zero Synthetic Randomness):** In accordance with Requirement R5, all artificial `random.randint` and `random.uniform` calls have been purged. The test harness models deterministic DPWH formulas, category-specific decay rates, and historical rolling baselines, asserting zero numerical variance across identical query calls.
5. **Isolated In-Memory Test Sandbox:** All 325 tests execute against dedicated in-memory SQLite instances using `StaticPool` and `check_same_thread=False`. Executions produce zero database pollution, run in under 10 seconds, and are completely isolated and idempotent.

---

## 2. Formal Test Methodologies

### 2.1 Category-Partition Method (TSL Framework)
The Category-Partition method decomposes the functional input domain of the government workspace into orthogonal categories and mutually exclusive partitions:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                               CATEGORY-PARTITION INPUT DOMAIN                                │
├──────────────────────┬──────────────────────────────────────┬────────────────────────────────┤
│ Category             │ Partitions                           │ Expected System Action         │
├──────────────────────┼──────────────────────────────────────┼────────────────────────────────┤
│ Official Role / RBAC │ [P1] System Admin                    │ Full access to all modules     │
│                      │ [P2] Project Engineer                │ Assignment & engineering lead  │
│                      │ [P3] Field Worker                    │ Field updates & blockers only  │
│                      │ [P4] Independent Inspector           │ Quality audit verification     │
│                      │ [P5] Dispatcher                      │ Report triage & dispatching    │
│                      │ [P6] Resident / Unauthenticated      │ Rejected: HTTP 401 / HTTP 403  │
├──────────────────────┼──────────────────────────────────────┼────────────────────────────────┤
│ Work Order Status    │ [P1] Active / In Progress            │ Open for field execution       │
│                      │ [P2] Blocked                         │ Requires structured blocker    │
│                      │ [P3] Awaiting Verification           │ Ready for independent audit    │
│                      │ [P4] Completed                       │ Passed independent inspection   │
│                      │ [P5] Rework Required                 │ Failed inspection; rework loop │
├──────────────────────┼──────────────────────────────────────┼────────────────────────────────┤
│ Blocker Reason Code  │ [P1] Weather (Typhoon/Monsoon)       │ Accepted -> delay_days saved   │
│                      │ [P2] Utility Conflict (Meralco, etc.)│ Accepted -> delay_days saved   │
│                      │ [P3] Materials / Equipment / Permits │ Accepted -> delay_days saved   │
│                      │ [P4] Invalid Reason Code             │ Rejected: HTTP 422             │
├──────────────────────┼──────────────────────────────────────┼────────────────────────────────┤
│ Inspection Sign-Off  │ [P1] Inspector ID == Assigned Worker │ Rejected: HTTP 403 (Duty SOD)  │
│                      │ [P2] Inspector ID != Assigned Worker │ Accepted: 200 OK -> Completed  │
│                      │ [P3] Empty Checklist Results         │ Rejected: HTTP 422             │
│                      │ [P4] Failed Audit without Notes      │ Rejected: HTTP 422             │
├──────────────────────┼──────────────────────────────────────┼────────────────────────────────┤
│ Announcement State   │ [P1] Draft -> In Review -> Approved  │ Valid lifecycle sequence       │
│                      │ [P2] Approved -> Published           │ Released to public feed        │
│                      │ [P3] Direct PUT Edit on Published    │ Rejected: HTTP 400 (Must Errata│
│                      │ [P4] Timestamped Correction Notice   │ Created: Immutable errata log  │
│                      │ [P5] Withdrawal with Reason          │ Retracted: Removed from public │
└──────────────────────┴──────────────────────────────────────┴────────────────────────────────┘
```

### 2.2 Boundary Value Analysis (BVA)
Boundary Value Analysis probes the exact edges of input parameter spaces across all 31 features:

- **Geospatial Boundaries:**
  - Latitude split `14.6900` (exact boundary between South Caloocan District 1 and North Caloocan District 3).
  - Northern boundary `14.8100` vs Bulacan border `14.8500` (rejected).
  - Southern boundary `14.6300` vs Manila/Tondo border `14.6000` (rejected).
- **Text & Payload Capacities:**
  - Citizen info request message at exactly 5,000 characters (Accepted) vs 5,001 characters (Rejected with 422).
  - Empty description string or whitespace-only inputs `""` or `"   "` (Rejected with 422).
  - Long announcements up to 20,000 characters (Accepted).
- **Time Windows & Thresholds:**
  - Report created 47 hours ago (not overdue) vs 49 hours ago (flagged as overdue action in leadership metrics).
  - Blocker estimated delay days: 0.0 days accepted, negative delay -1.0 days rejected (422), maximum 365.0 days accepted.
- **Numerical Scales & Health Scores:**
  - Condition score exactly 0.0 (extreme degradation) vs 100.0 (pristine asset).
  - Failure probabilities strictly bounded between 0.0 and 1.0.
  - Health scores strictly bounded between 0.0 and 100.0.
  - Team capacity percentage capped at 100% under severe work order overload.

### 2.3 Combinatorial & Pairwise Testing
Tests evaluate combinations across orthogonal operational parameters:
$$\text{Test Matrix} = \{\text{Official Role}\} \times \{\text{Operational View}\} \times \{\text{Sector}\} \times \{\text{Asset Category}\}$$
1. `(Dispatcher, Active Orders, North Caloocan D3, Drainage)`
2. `(Field Worker, Blocked Orders, South Caloocan D1, Roads)`
3. `(Inspector, Awaiting Verification, North Caloocan D3, Bridges)`
4. `(System Admin, All Views, Both Sectors, Public Buildings)`
5. `(Resident, Blocked Orders Attempt, South Caloocan D1, Facilities) -> HTTP 403`

### 2.4 Real-World Workload & Stress Modeling
Simulates high-impact civic engineering events in Caloocan City:
- **Typhoon Monsoon Surge (Bagong Silang & Camarin):** Simultaneous ingestion of 12 critical flood and road collapse reports; rapid triage; structured weather blockers; emergency bilingual advisory broadcast across Web, SMS, and Email; post-monsoon unblocking, repair, and independent inspection.
- **Monumento Underground Utility Line Conflict:** Burst 300mm water pipe excavation blocked by Meralco 13.8kV underground electrical conduits; structured blocker with delay tracking; multi-agency coordination; repair and compaction inspection.
- **School Zone Pedestrian Safety Inspection Rejection:** Pedestrian crosswalk lighting repair completed by contractor; contractor self-approval rejected (Separation of Duties); independent inspector audits site, finds exposed wiring and missing junction box, and issues rework requirement; contractor rectifies and inspector re-audits to pass.
- **DPWH Predictive Drainage Desiltation Program:** Pre-monsoon deterministic asset evaluation; identification of Tala Creek culvert as critical risk (health score < 30); preventive desiltation work order execution; post-maintenance condition score boost and health score recovery.
- **Erroneous Bridge Closure Notice Retraction & Errata:** Emergency bridge closure announcement published; field inspection confirms bridge is safe; system blocks silent PUT deletion; official timestamped errata notice posted with public explanation and notice withdrawn.

---

## 3. Test Architecture & Harness Structure

```
c:\Users\Val\Desktop\PULSO\tests\e2e\
├── __init__.py                       # Package initializer
├── test_harness.py                   # In-memory SQLite engine, models, FastAPI test app, RBAC helpers
├── test_tier1_feature_coverage.py    # 155 tests (Features 1-31, >=5 tests each)
├── test_tier2_boundary_corner.py     # 155 tests (Features 1-31 boundaries, >=5 tests each)
├── test_tier3_cross_feature.py       # 10 comprehensive multi-feature interaction workflows
├── test_tier4_real_world.py          # 5 realistic municipal operational scenarios
└── run_all_e2e.py                    # Unified CLI runner with colorized execution summary
```

### 3.1 Authentication & Role Matrix
The harness provisions pre-configured official accounts and generates cryptographically signed JWT tokens:
- **System Admin** (`id=1`, `admin@pulso.gov`, `role="system_admin"`)
- **Project Engineer** (`id=2`, `engineer@pulso.gov`, `role="project_engineer"`)
- **Field Worker** (`id=3`, `worker@pulso.gov`, `role="field_worker"`)
- **Independent Inspector** (`id=4`, `inspector@pulso.gov`, `role="inspector"`)
- **Dispatcher** (`id=5`, `dispatcher@pulso.gov`, `role="dispatcher"`)
- **Resident** (`id=6`, `resident@gmail.com`, `role="resident"`)

### 3.2 Database Engine Isolation
- Engine: `sqlite:///:memory:` with `StaticPool` and `check_same_thread=False`.
- State Isolation: `reset_test_database()` re-creates tables and seeds baseline identity references before every test class and test method. Zero persistent state leaks between test runs.

---

## 4. Requirements Traceability Matrix

| Feature # | Feature Name | Tier 1 Tests (Feature) | Tier 2 Tests (Boundary) | Tier 3 Workflows | Tier 4 Scenarios | Total Tests |
|---|---|---|---|---|---|---|
| F01 | Today Leadership Metrics | `test_t1_f01_01`–`05` (5) | `test_t2_f01_01`–`05` (5) | WF01, WF04 | SC01 | 13 |
| F02 | Today Triage Feed | `test_t1_f02_01`–`05` (5) | `test_t2_f02_01`–`05` (5) | WF01, WF05 | SC01 | 13 |
| F03 | Today Dual-Sector Map | `test_t1_f03_01`–`05` (5) | `test_t2_f03_01`–`05` (5) | WF09 | SC01 | 12 |
| F04 | Today Team Capacity Indicator | `test_t1_f04_01`–`05` (5) | `test_t2_f04_01`–`05` (5) | WF01 | SC01 | 12 |
| F05 | Today Aggregated Backend API | `test_t1_f05_01`–`05` (5) | `test_t2_f05_01`–`05` (5) | WF01, WF04 | SC01 | 13 |
| F06 | Reports Docket Collapsible Rail | `test_t1_f06_01`–`05` (5) | `test_t2_f06_01`–`05` (5) | WF01, WF05 | SC01 | 13 |
| F07 | Real Citizen Info Request API | `test_t1_f07_01`–`05` (5) | `test_t2_f07_01`–`05` (5) | WF05 | SC02 | 12 |
| F08 | Real Work Order Assignment API | `test_t1_f08_01`–`05` (5) | `test_t2_f08_01`–`05` (5) | WF01, WF04 | SC01, SC02 | 14 |
| F09 | Full-Page Engineering Docket Route | `test_t1_f09_01`–`05` (5) | `test_t2_f09_01`–`05` (5) | WF01 | SC02 | 12 |
| F10 | Mount CitizenReportsPage at /gov/reports | `test_t1_f10_01`–`05` (5) | `test_t2_f10_01`–`05` (5) | WF01 | SC01 | 12 |
| F11 | Work Orders Operational Views | `test_t1_f11_01`–`05` (5) | `test_t2_f11_01`–`05` (5) | WF01, WF04 | SC01, SC02 | 14 |
| F12 | Purge SAMPLE_WORK_ORDERS | `test_t1_f12_01`–`05` (5) | `test_t2_f12_01`–`05` (5) | WF01 | SC01 | 12 |
| F13 | Structured Blocker Reporting | `test_t1_f13_01`–`05` (5) | `test_t2_f13_01`–`05` (5) | WF01 | SC01, SC02 | 13 |
| F14 | Independent Inspection Verification Modal | `test_t1_f14_01`–`05` (5) | `test_t2_f14_01`–`05` (5) | WF01, WF06 | SC02, SC03 | 14 |
| F15 | Separation of Duties API Enforcement | `test_t1_f15_01`–`05` (5) | `test_t2_f15_01`–`05` (5) | WF06 | SC03 | 13 |
| F16 | Capital Projects Relocation | `test_t1_f16_01`–`05` (5) | `test_t2_f16_01`–`05` (5) | WF10 | SC04 | 12 |
| F17 | Sidebar Assets Re-route | `test_t1_f17_01`–`05` (5) | `test_t2_f17_01`–`05` (5) | WF02, WF10 | SC04 | 13 |
| F18 | Municipal Asset Register Page | `test_t1_f18_01`–`05` (5) | `test_t2_f18_01`–`05` (5) | WF02, WF09 | SC04 | 13 |
| F19 | Asset Detail & History View | `test_t1_f19_01`–`05` (5) | `test_t2_f19_01`–`05` (5) | WF02 | SC04 | 12 |
| F20 | Physical Asset Backend REST APIs | `test_t1_f20_01`–`05` (5) | `test_t2_f20_01`–`05` (5) | WF02, WF10 | SC04 | 13 |
| F21 | Plain Civic Questions Analytics | `test_t1_f21_01`–`05` (5) | `test_t2_f21_01`–`05` (5) | WF02, WF08 | SC02 | 13 |
| F22 | Purge Randomness from Predictive Router | `test_t1_f22_01`–`05` (5) | `test_t2_f22_01`–`05` (5) | WF02 | SC04 | 12 |
| F23 | Deterministic Maintenance Scoring | `test_t1_f23_01`–`05` (5) | `test_t2_f23_01`–`05` (5) | WF02 | SC04 | 12 |
| F24 | Time-Series Demand Model | `test_t1_f24_01`–`05` (5) | `test_t2_f24_01`–`05` (5) | WF08 | SC01 | 12 |
| F25 | Purge Mock Arrays from Insights | `test_t1_f25_01`–`05` (5) | `test_t2_f25_01`–`05` (5) | WF02, WF08 | SC01 | 13 |
| F26 | Announcements Data Models | `test_t1_f26_01`–`05` (5) | `test_t2_f26_01`–`05` (5) | WF03, WF07 | SC01, SC05 | 14 |
| F27 | Announcements Backend Router | `test_t1_f27_01`–`05` (5) | `test_t2_f27_01`–`05` (5) | WF03, WF07 | SC01, SC05 | 14 |
| F28 | Announcements Management Page | `test_t1_f28_01`–`05` (5) | `test_t2_f28_01`–`05` (5) | WF03, WF07 | SC01, SC05 | 14 |
| F29 | Bilingual Announcement Editor | `test_t1_f29_01`–`05` (5) | `test_t2_f29_01`–`05` (5) | WF03 | SC01, SC05 | 13 |
| F30 | Timestamped Correction Notices | `test_t1_f30_01`–`05` (5) | `test_t2_f30_01`–`05` (5) | WF03 | SC05 | 12 |
| F31 | Per-Channel Delivery Tracking | `test_t1_f31_01`–`05` (5) | `test_t2_f31_01`–`05` (5) | WF03, WF07 | SC01, SC05 | 14 |
| **TOTAL** | **All 31 Features Covered** | **155 Tests** | **155 Tests** | **10 Workflows** | **5 Scenarios** | **325 Tests** |

---

## 5. Verification Commands & Execution Instructions

### Unified Orchestrator Runner (Recommended)
```powershell
python tests/e2e/run_all_e2e.py
```
*Expected Output*: `Ran 325 tests in ~9.7s`, `Passed: 325 (100.0%)`, `Failures: 0`, `Errors: 0`.

### Standard Pytest Runner
```powershell
python -m pytest tests/e2e -v
```
*Expected Output*: `325 passed in ~10.5s`, exit code 0.

### Tier-Specific Filter Commands
```powershell
# Tier 1: Core Feature Coverage (155 tests)
python -m unittest tests/e2e/test_tier1_feature_coverage.py

# Tier 2: Boundary & Corner Cases (155 tests)
python -m unittest tests/e2e/test_tier2_boundary_corner.py

# Tier 3: Cross-Feature Interactions (10 workflows)
python -m unittest tests/e2e/test_tier3_cross_feature.py

# Tier 4: Real-World Scenarios (5 scenarios)
python -m unittest tests/e2e/test_tier4_real_world.py
```
