# Handoff Report — Milestone 4: Guided 7-Step Reporting Flow & Map Integration

## 1. Observation
- **Original User Request & Architecture**: `ORIGINAL_REQUEST.md` (lines 35-40) and `PROJECT.md` (lines 15-23, 104-109, 128) define Milestone 4 scope: guided 7-step reporting wizard with issue category, emergency warning banner (911 / 888-1234), interactive Caloocan map & boundary verification, evidence upload with 10MB ceiling & advisory AI, details with 100m duplicate report awareness, contact preferences, review & civic consent, and atomic submission to `/report/success`.
- **Backend API & Contracts**:
  - `backend/main.py:1011-1188` implements `POST /api/reports` with `multipart/form-data`, description validation (10–5000 chars), boundary verification via `is_in_caloocan(lat, lng)`, 15m duplicate conflict check (HTTP 409), 10MB upload ceiling, magic-byte inspection (JPEG/PNG/WebP), Gemini AI triage, and returning ephemeral plaintext `tracking_token` + `tracking_url`.
  - `backend/main.py:935-958` implements `GET /api/reports/public` returning public active reports with anonymized names for public consumption.
  - `backend/utils/geometry_utils.py:75-95` implements `is_in_caloocan(lat, lng)` using ray casting over `backend/caloocan_border.json` with fallback bounding boxes: South (`14.63 <= lat <= 14.67`, `120.95 <= lng <= 121.00`) and North (`14.69 <= lat <= 14.81`, `121.00 <= lng <= 121.13`).
- **Frontend Stack & Theme Tokens**:
  - `frontend/package.json` contains `@react-google-maps/api: ^2.20.8`, `lucide-react: ^0.575.0`, `framer-motion: ^12.34.3`, `i18next: ^25.8.13`, `react-i18next: ^16.5.4`, `tailwindcss: ^4.2.1`.
  - `frontend/src/index.css:17-39` establishes Civic Aperture color variables: `--color-canvas: #f7f8fa`, `--color-canvas-dark: #071a2b`, `--color-resident-action: #c2410c`, `--color-resident-action-dark: #ff8a3d`, `--color-pulse: #f97316`, `--color-focus: #2563eb`.
  - `frontend/src/App.jsx:59-66` defines public routes; `/report` must be rendered within `ResidentSurface`.

## 2. Logic Chain
1. **Step-by-Step Flow Partitioning**: Combining the 7 user-facing stages into modular components (`Step1CategoryEmergency`, `Step2LocationMap`, `Step3EvidenceUpload`, `Step4DetailsDuplicate`, `Step5ContactPreferences`, `Step6ReviewConsent`, and `ReportWizardPage`) ensures maintainability, isolated unit testability, and clear separation of state.
2. **Boundary Enforcement Consistency**: By porting the ray-casting algorithm to client-side `frontend/src/utils/geospatial.js`, the wizard can instantly prevent users from placing pins outside Caloocan boundaries before reaching submission, preventing unnecessary HTTP 400 errors while matching `backend/utils/geometry_utils.py`.
3. **Non-Blocking Advisory AI Principle**: In accordance with `AGENTS.md` and `SKILL.md`, AI is strictly advisory. An image scan helps suggest categories, but scan latency, failure, or undetermined outcomes will never block the resident from manually filing a report for human engineering triage.
4. **Dual-Tier Duplicate Protection**: Frontend performs a soft 100-meter proximity radar check against `/api/reports/public` in Step 4 to warn residents of existing active tickets and offer attachment, preventing them from hitting the backend's strict 15-meter hard HTTP 409 conflict.
5. **Data Loss Resilience**: Storing form state in `localStorage` under `pulso_report_wizard_draft_v1` on every input update ensures that page refreshes, accidental browser exits, or connectivity drops allow instant draft recovery.

## 3. Caveats
- **Offline Map Rendering**: Google Maps requires an active internet connection to load tiles. When offline, fallback coordinate inputs and landmark text ensure reports can still be composed and saved locally in draft.
- **Large Image Draft Storage**: `localStorage` has a typical 5MB quota. Image data URLs are only cached in localStorage if under 2MB; otherwise, file metadata is saved and the user is prompted to confirm or re-select the photo upon draft restore.

## 4. Conclusion
The comprehensive blueprint in `c:\Users\Val\Desktop\PULSO\.agents\explorer_m3m4_2\report.md` provides an end-to-end, production-ready specification and implementation guide for Milestone 4 (`ReportWizardPage.jsx`). It satisfies all 7 wizard steps, boundary checks, duplicate awareness, draft persistence, WCAG 2.2 AA accessibility (3px focus rings, 44px targets), and bilingual parity.

## 5. Verification Method
1. Inspect blueprint: `view_file` on `c:\Users\Val\Desktop\PULSO\.agents\explorer_m3m4_2\report.md`.
2. Code verification: When authorized for implementation, verify build with `npm run build` in `frontend/` (0 errors expected).
3. Geospatial verification: Test coordinates `(14.7565, 121.0450)` (North Caloocan -> valid) vs `(14.6000, 120.9800)` (Manila -> invalid boundary alert).
