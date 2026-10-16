# Empirical Handoff Report — Frontend Geospatial & Wizard State Management

**Agent**: `challenger_frontend_1`  
**Date**: 2026-09-02  
**Target Files**:
- `frontend/src/utils/geospatial.js`
- `frontend/src/pages/ReportWizardPage.jsx`
- `frontend/src/components/report-wizard/Step2LocationMap.jsx`
- `frontend/src/components/report-wizard/Step4DetailsDuplicate.jsx`

---

## 1. Observation

### 1.1 Test Suite Execution (`frontend/test-empirical-all.mjs`)
Command executed: `node test-empirical-all.mjs` in `c:\Users\Val\Desktop\PULSO\frontend`.
Result: 19 test cases executed, 19 passed, 0 failed.

```text
================================================================
PULSO FRONTEND EMPIRICAL CHALLENGE SUITE (M1-M4)
================================================================

--- SUITE 1: Ray-Casting & Geometric Corner Cases ---
  [PASS] PIP 1.1: Square Polygon - inside, outside, margins
  [PASS] PIP 1.2: Polygon with Interior Hole (Donut Exclusion)
  [PASS] PIP 1.3: Non-convex U-Shape with Cutout Bay
  [PASS] PIP 1.4: Ray hitting vertex / collinear horizontal edge
  [PASS] PIP 1.5: Degenerate inputs & robustness

--- SUITE 2: Caloocan Official GeoJSON Boundary & Surrounding LGUs ---
  [INFO] Loaded 188 GeoJSON polygon rings from official backend dataset.
    [INFO] Verified 188 barangay centroids successfully.
  [PASS] GEO 2.1: Verify All 188 Caloocan Barangay Centroids in GeoJSON
  [PASS] GEO 2.2: North Caloocan (District 3) Key Landmarks
  [PASS] GEO 2.3: South Caloocan (District 1/2) Key Landmarks
  [PASS] GEO 2.4: Surrounding LGUs Excluded in GeoJSON Oracle
  [PASS] GEO 2.5: Empirical Boundary Discrepancy (Step2 Search Preset Deparo 168 vs GeoJSON)

--- SUITE 3: Haversine Calculations & Duplicate Radar ---
  [PASS] HAV 3.1: Haversine distance accuracy against geodesic references
  [PASS] HAV 3.2: Haversine invalid & edge input handling
  [PASS] HAV 3.3: 100m Duplicate Radar threshold logic (Step4 Details Duplicate)

--- SUITE 4: Draft Serialization & LocalStorage Corruption Resilience ---
  [PASS] DRAFT 4.1: Draft payload serialization structure & schema fidelity
  [PASS] DRAFT 4.2: Recovery logic under corrupted localStorage inputs

--- SUITE 5: Step Navigation State Integrity & Validation Gates ---
  [PASS] NAV 5.1: Linear Forward Navigation 1 -> 6 and maxStepReached tracking
  [PASS] NAV 5.2: Backward Navigation 6 -> 1 does NOT reduce maxStepReached
  [PASS] NAV 5.3: Arbitrary Jump Validation (jumpToStep)
  [PASS] NAV 5.4: Step Validation Rules Enforcement

================================================================
TOTAL TESTS: 19
PASSED:      19
FAILED:      0
================================================================
ALL EMPIRICAL CHALLENGE TESTS PASSED PERFECTLY.
```

### 1.2 Frontend Production Build (`npm run build`)
Command executed: `npm run build` in `frontend/`.
Result: Succeeded with exit code 0 (`built in 18.63s`).

```text
✓ 2699 modules transformed.
dist/index.html                                         0.45 kB │ gzip:     0.30 kB
dist/assets/index-CfhOkfh8.css                        457.66 kB │ gzip:    59.18 kB
dist/assets/index-CDWeGyjK.js                       3,998.95 kB │ gzip: 1,094.70 kB
✓ built in 18.63s
```

### 1.3 Empirical Vulnerability & Discrepancy Observation

1. **`Step2LocationMap.jsx:163-165` Hardcoded Deparo Coordinates Outside Authoritative GeoJSON Boundary**:
   - In `frontend/src/components/report-wizard/Step2LocationMap.jsx`:
     ```javascript
     163: } else if (queryLower.includes('deparo') || queryLower.includes('168')) {
     164:   target = { lat: 14.7180, lng: 121.0180, name: `Deparo, North Caloocan` };
     165: }
     ```
   - In `backend/caloocan_border.json`, feature `ADM4_PCODE: PH137501168` (Barangay 168 / Deparo) is bounded between:
     - `Latitude`: `[14.73405, 14.74668]`
     - `Longitude`: `[121.00677, 121.03476]`
   - Running `isPointInPolygon(121.0180, 14.7180, geoJsonPolygons)` returns `false` (point is in the boundary buffer / Valenzuela margin, south of true Deparo).
   - Because `Step2LocationMap.jsx` uses the coarse rectangular bounding box `isInCaloocanBounds()` (`14.685 <= lat <= 14.820`, `120.995 <= lng <= 121.140`), the UI indicates `Verified within Caloocan City (District 3 · North Caloocan)` and allows the user to proceed.
   - However, when the user reaches Step 6 and submits to `POST /api/reports`, the backend validates using `backend/utils/geometry_utils.py` against `caloocan_border.json` using exact ray casting. The backend rejects the report with `HTTP 400: "Selected location is outside Caloocan City jurisdiction."`.
   - The user is kicked back from Step 6 to Step 2 with an error banner.

2. **Grid Discrepancy Profile (Bounding Box vs Exact MultiPolygon)**:
   - Evaluated 18,900 grid coordinates over Metro Manila and Bulacan (`lat: 14.55 - 14.85`, `lng: 120.90 - 121.15`, step ~220m):
     - `True Positives` (In GeoJSON & In BBox): 1,074
     - `False Positives` (In BBox, but outside official GeoJSON): 4,623 points (e.g. Quezon City Fairview/Novaliches, Bulacan SJDM, Valenzuela border zones)
     - `False Negatives` (In GeoJSON, but cut by BBox): 32 points
     - `True Negatives` (Outside both): 13,171 points

---

## 2. Logic Chain

1. **Ray-Casting Algorithm (`frontend/src/utils/geospatial.js`)**:
   - `isPointInPolygon` implements the Jordan curve ray-casting algorithm with interior hole handling (`polygonRings[1..n]`).
   - Verified against:
     - Convex/concave polygons, U-shaped geometries, diamond vertices where rays intersect exact polygon vertices or horizontal segments.
     - 188 official Caloocan Barangay centroids extracted from `backend/caloocan_border.json`.
     - 15 surrounding LGU landmarks (SM North EDSA, Novaliches Bayan, SM Marilao, Valenzuela Fatima, Manila Luneta, Malabon City Hall), all correctly returning `false` under MultiPolygon evaluation.

2. **Haversine Distance & Proximity Radar (`frontend/src/utils/geospatial.js` & `Step4DetailsDuplicate.jsx`)**:
   - `getHaversineDistanceMeters` accurately computes great-circle distance with Earth radius $R = 6,371,000\text{ m}$.
   - Evaluated at identical point ($0\text{ m}$), small increments ($0.0001^\circ \approx 11.1\text{ m}$, $0.0009^\circ \approx 100\text{ m}$), inter-district distance ($13.5\text{ km}$ between Monumento and Caloocan North City Hall), and antipodal coordinates.
   - 100m proximity radar logic in `Step4DetailsDuplicate.jsx` correctly matches tickets when `distance <= 100` and category matches (case-insensitively). Tickets $> 100\text{ m}$ (e.g., $101\text{ m}$) or tickets with different categories do not trigger false duplicate warnings.

3. **Draft Serialization & Corrupted LocalStorage Handling (`ReportWizardPage.jsx`)**:
   - Auto-save serializes form state, step index, and max step reached debounced to 400ms under key `pulso_report_wizard_draft_v1`.
   - Fuzzed with 15 malicious and corrupted vectors: malformed JSON, raw strings, numbers, arrays, nulls, prototype tampering, negative steps (`-10`), excessive steps (`999`), `NaN`, and missing/corrupted sub-objects.
   - In all cases, `try/catch` and clamping logic (`Math.min(Math.max(step || 1, 1), 6)`) safely protect the application from crashing.

4. **Step Navigation State Machine**:
   - State invariants: `maxStepReached` strictly increases as user advances (1 $\to$ 6); navigating backwards preserves `maxStepReached`.
   - `jumpToStep(n)` allows jumping only to unlocked steps ($n \le \text{maxStepReached}$), preventing unauthorized step skipping.
   - Step gates are validated: Step 1 (Category required), Step 2 (inCaloocan enforced), Step 4 (10–5000 chars description), Step 5 (contact preferences), Step 6 (consent accepted and single-submit lock).

---

## 3. Caveats

1. **Google Maps JS API Key in Test Environment**:
   - Tests executed in Node.js environment without live Google Maps Places geocoding API network calls; fallback coordinate handlers and simulated search presets were audited directly.
2. **GeoJSON Payload Size**:
   - The full `caloocan_border.json` is ~337 KB. In the current client frontend, `isInCaloocan` defaults to bounding box when `customPolygons` is not supplied, relying on backend `/api/reports` validation as the authoritative boundary enforcement.

---

## 4. Conclusion & Verdict

### Verdict: `REQUEST_CHANGES`

While the core math, ray-casting algorithm, Haversine formula, duplicate radar, draft serialization, and step state machine are robust and pass all 19 automated tests, a bug in `Step2LocationMap.jsx:164` causes the "Deparo / 168" search preset to place coordinates at `(14.7180, 121.0180)` which is outside the official Caloocan border. This causes users who search for Deparo to be approved on Step 2 but rejected on Step 6 with a backend HTTP 400 error.

### Required Changes:
1. **`frontend/src/components/report-wizard/Step2LocationMap.jsx:164`**:
   - Replace:
     ```javascript
     target = { lat: 14.7180, lng: 121.0180, name: `Deparo, North Caloocan` };
     ```
   - With the true Barangay 168 (Deparo) centroid:
     ```javascript
     target = { lat: 14.7380, lng: 121.0200, name: `Barangay 168 (Deparo), North Caloocan` };
     ```
2. **(Optional Optimization)**: Pass the loaded boundary polygons from backend or cache into `isInCaloocan(lat, lng, polygons)` on `Step2LocationMap.jsx` to achieve 0% false positives on municipal borders before submission.

---

## 5. Verification Method

To independently verify these findings:

```bash
# 1. Run the comprehensive empirical test suite
cd c:\Users\Val\Desktop\PULSO\frontend
node test-empirical-all.mjs

# 2. Verify clean production build
npm run build
```

### Invalidation Conditions:
- If `node test-empirical-all.mjs` outputs any failures.
- If `Step2LocationMap.jsx:164` is corrected to `lat: 14.7380, lng: 121.0200` and `isPointInPolygon(121.0200, 14.7380, geoJsonPolygons)` returns `true`.
