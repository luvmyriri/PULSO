# Specification & Requirements Miner — Handoff Report

**Agent:** `teamwork_preview_spec_miner_survey`  
**Parent:** `teamwork_preview_orchestrator_2` (Conversation ID: `fc4a17ac-bb06-478e-85a3-04b65dcbe650`)  
**Date:** 2026-09-18  
**Report File:** `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_spec_miner_survey\survey_spec_report.md`

---

## 1. Observation

Direct code and specification findings:

1. **Deceptive Mock Toasts in `CitizenReportsPage.jsx`**:
   - In `frontend/src/pages/CitizenReportsPage.jsx`:
     - Lines 275–279:
       ```javascript
       const handleRequestInfoSubmit = async ({ reason, message }) => {
           showToast(`Information request sent to citizen: "${reason} - ${message.slice(0, 30)}..."`);
           if (selectedId) {
               loadReports({ background: true });
           }
       };
       ```
       No network call is initiated; citizen information requests are simulated purely via toast.
     - Lines 300–307:
       ```javascript
       } else {
           showToast(`Work order created and queued for field execution.`);
           loadReports({ background: true });
       }
       ```
       Work order assignment falls back to claiming success via toast even when the API call fails or errors.
     - Lines 158–166:
       ```javascript
       const closeReportDocket = useCallback(() => {
           const closingId = selectedId;
           setParams((current) => {
               const next = new URLSearchParams(current);
               next.delete('report');
               return next;
           }, { replace: true });
           window.requestAnimationFrame(() => reportRowRefs.current.get(closingId)?.focus());
       }, [selectedId, setParams]);
       ```
       There is no distinction between "Collapse" (minimizing to a compact 48px rail handle preserving URL filters, selection, and map) vs. "Close" (clearing selection).

2. **Hardcoded Mock Work Orders in `WorkOrdersPage.jsx`**:
   - In `frontend/src/pages/WorkOrdersPage.jsx`:
     - Lines 49–154: Defines static `SAMPLE_WORK_ORDERS = [...]` array.
     - Lines 184–202:
       ```javascript
       const merged = data.map((d, index) => ({
           ...SAMPLE_WORK_ORDERS[index % SAMPLE_WORK_ORDERS.length],
           ...d,
           id: d.id, ...
       }));
       setWorkOrders(merged);
       // On API failure:
       setWorkOrders(SAMPLE_WORK_ORDERS);
       ```
       The UI injects mock work order data into live database responses and silently renders synthetic data on failure.

3. **Synthetic Random Number Generation in `predictive_router.py`**:
   - In `backend/predictive_router.py`:
     - Lines 129–131:
       ```python
       fail_prob_30 = round(random.uniform(0.01, 0.1), 2)
       fail_prob_60 = round(random.uniform(0.1, 0.25), 2)
       fail_prob_90 = round(random.uniform(0.2, 0.5), 2)
       ```
     - Line 172: `"report_count": random.randint(0, 10)`
     - Lines 176–178:
       ```python
       "days_since_last_maintenance": random.randint(10, 300),
       "next_maintenance_date": (datetime.datetime.now() + datetime.timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d"),
       ```
     - Lines 212–213: `week = random.randint(1, 4)`, `cost = random.randint(5000, 50000)`
     - Lines 443–450: Export endpoint fabricates failure probabilities and dates with `random.uniform` and `random.randint`.

4. **Misrouted Physical Assets Navigation in `GovSidebar.jsx`**:
   - In `frontend/src/components/GovSidebar.jsx`:
     - Lines 66–71:
       ```javascript
       {
           id: 'assets',
           label: 'Assets',
           icon: Building2,
           to: '/gov/projects',
           matches: ['/gov/projects', '/gov/obo', '/gov/procurement', '/gov/records']
       }
       ```
       The sidebar routes `Assets` to `/gov/projects` and conflates physical assets with administrative OBO permits, procurement, and records.

5. **Missing Routes in `frontend/src/App.jsx`**:
   - In `frontend/src/App.jsx`:
     - Route `/gov/reports/:reportId` (`GovReportDetailPage.jsx`) is missing.
     - Route `/gov/assets` (`GovAssetsPage.jsx`, `GovAssetDetailPage.jsx`) is missing.
     - Route `/gov/today` (`GovTodayPage.jsx`) is missing.
     - Route `/gov/announcements` (`GovAnnouncementsPage.jsx`, `GovAnnouncementEditor.jsx`) is missing.

6. **Lax Separation of Duties in `backend/gov_router.py`**:
   - Lines 240–280 (`approve_or_reject_work_order`): Checks role authorization (`dispatcher`, `city_engineer`, etc.), but fails to verify that `current_user.id != work_order.assigned_to_id`, allowing a field worker to self-certify their own work.

---

## 2. Logic Chain

1. **Step 1: Alignment with Authoritative Principles**
   - `PRODUCT.md` mandates **Truth Before Polish**: every status, metric, and location claim must reflect real database state.
   - Therefore, the mock toasts in `CitizenReportsPage.jsx` and the `SAMPLE_WORK_ORDERS` fallback in `WorkOrdersPage.jsx` directly violate product truth and must be replaced with real backend mutations and genuine empty/loading states.

2. **Step 2: Operational Integrity in Analytics & Prediction (R5)**
   - `predictive_router.py` fabricates risk probabilities and repair costs using Python's `random` library.
   - By replacing `random.randint` with deterministic formulas (derived from `InfrastructureAsset` age, `EnvironmentalContext` flood risk, real report recurrence counts, and DPWH Region 3 unit costs), and using scikit-learn `TimeSeriesSplit` for demand models, the system fulfills R5 without synthetic filler.

3. **Step 3: Unbundling Assets from Administrative Processes (R4)**
   - As observed in `GovSidebar.jsx` (line 69), "Assets" currently routes to `/gov/projects`.
   - Architectural resolution in `09-reconciled-government-implementation-plan.md` §17 disentangles capital construction projects (Work module) and regulatory building permits (Records module) from physical infrastructure.
   - Thus, `/gov/assets` must be established as a dedicated register for Roads, Drainage, Bridges, Public Buildings, and Facilities.

4. **Step 4: Statutory Separation of Duties (R3)**
   - `10-user-profiling-and-operational-research-framework.md` §3 defines the critical conflict: a field foreman certifying their own repairs leads to unverified public works.
   - Enforcing $\text{Inspector ID} \neq \text{Field Worker ID}$ both on the client modal (`GovInspectionModal.jsx`) and in `gov_router.py` guarantees technical compliance with national engineering standards.

5. **Step 5: Governed Communications Workflow (R6)**
   - As observed in `02-updates-announcements-and-notifications.md`, public service announcements require strict approval locking, bilingual (en/fil) parity, and timestamped correction notices to prevent silent overwriting.
   - An independent router (`announcements_router.py`) with stages `Draft → In Review → Approved → Scheduled → Published → Expired/Withdrawn` is necessary.

---

## 3. Caveats

1. **No-Code Boundary Preserved**:
   - Per instructions and `AGENTS.md`, no production code in `frontend/`, `backend/`, or database migrations was modified during this mining survey.
2. **PostgreSQL Outbox Dependency**:
   - The outbox worker (`Celery` + `RabbitMQ`) is documented as the target background architecture; during dev mode, synchronous fallback execution in FastAPI or background tasks can be utilized if message brokers are not running locally.
3. **Google Maps API Key**:
   - Map components utilize `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`. Text and table alternatives must always remain available for WCAG 2.2 AA non-visual access.

---

## 4. Conclusion

The specification survey is **100% complete**. All 6 requirements (R1–R6), 31 discovered features, and 20 critical edge cases have been exhaustively documented in `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_spec_miner_survey\survey_spec_report.md`.

The system is fully primed for orchestrator work breakdown and subagent delegation:
- **R1 (Today Hub)**: Build `GovTodayPage.jsx` with 5 validated metrics, needs-attention feed, dual-sector map, team capacity.
- **R2 (Reports Docket & Detail)**: Refactor `CitizenReportsPage.jsx` with 48px collapse rail vs. close, real API endpoints, and `/gov/reports/:reportId`.
- **R3 (Work Orders & Inspections)**: Build `GovWorkOrdersPage.jsx`, purge `SAMPLE_WORK_ORDERS`, build `GovInspectionModal.jsx` with separation of duties.
- **R4 (Asset Register)**: Re-route sidebar to `/gov/assets`, build `GovAssetsPage.jsx` and `GovAssetDetailPage.jsx`.
- **R5 (Plain Analytics & Honest Prediction)**: Refactor `GovAnalyticsPage.jsx` to 4 civic questions, purge `random.randint` from `predictive_router.py`.
- **R6 (Governed Announcements)**: Build `GovAnnouncementsPage.jsx`, `GovAnnouncementEditor.jsx`, and `announcements_router.py`.

---

## 5. Verification Method

1. **Inspect Survey Report**:
   - View `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_spec_miner_survey\survey_spec_report.md`.
   - Verify table of 31 Features Discovered across R1 to R6.
   - Verify table of 20 Edge Cases with observed behaviors.
2. **Verify Code References**:
   - Check `frontend/src/pages/CitizenReportsPage.jsx` lines 275–307 to confirm mock toasts.
   - Check `frontend/src/pages/WorkOrdersPage.jsx` lines 49–154 to confirm `SAMPLE_WORK_ORDERS`.
   - Check `backend/predictive_router.py` lines 129, 172, 175, 212 to confirm synthetic `random` usage.
   - Check `frontend/src/components/GovSidebar.jsx` line 69 to confirm Assets misroute.
3. **Run Existing Test Suite**:
   - In `backend/`: Run project pytest suite: `pytest`
   - In `frontend/`: Run `npm run build` to verify existing build baseline.
4. **Invalidation Conditions**:
   - Any retention of `SAMPLE_WORK_ORDERS` or `random.randint` in target implementations invalidates acceptance.
   - Any self-approval permitted for field workers invalidates R3 compliance.
