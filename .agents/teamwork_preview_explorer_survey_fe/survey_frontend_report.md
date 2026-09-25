# Comprehensive Survey Report: PULSO Government Workspace Frontend Codebase

**Date:** 2026-09-18  
**Author:** Frontend Codebase Explorer (`teamwork_preview_explorer_survey_fe`)  
**Parent Orchestrator:** `teamwork_preview_orchestrator_2`  
**Reference Sources:** `PRODUCT.md`, `ORIGINAL_REQUEST.md` (## 2026-09-18T15:00:42Z), `docs/ui-ux-audit/09-visual-art-direction-v2.md`, `AGENTS.md`

---

## Executive Summary

This report delivers a thorough architectural and empirical survey of the PULSO web frontend located at `c:\Users\Val\Desktop\PULSO\frontend`. The survey evaluates the frontend against the visual and operational benchmark established in `CitizenReportsPage.jsx` (Civic Aperture v0.2), maps out the `/gov` routing hierarchy and navigation mechanisms, catalogs existing government pages and missing stubs, examines API clients and mock data fallbacks, and verifies build and testing infrastructure.

**Key Findings:**
1. **Visual Standard Established in `CitizenReportsPage.jsx`:** The page strictly embodies Civic Aperture v0.2 ("Morning Field Sheet" / "Night Inspection"), utilizing semantic CSS variables (`--gov-*`), 2px Signal Cut indicator lines, a 2px Pulseline lifecycle progress visualizer, true-color evidence framing with corner brackets, honest AI advisory bounding, and high-contrast typography (Archivo, Source Sans 3, IBM Plex Mono).
2. **Routing Mismatches in `App.jsx`:** `/gov/reports` currently points to a legacy dashboard (`GovReportsDashboard.jsx`) containing mock data, whereas the authoritative `CitizenReportsPage.jsx` is only reachable via `/gov/operations?view=reports`. Additionally, `/gov/today`, `/gov/reports/:reportId`, `/gov/assets`, and `/gov/announcements` do not exist in the routing table.
3. **Sidebar Alignment:** `GovSidebar.jsx` routes the "Assets" nav item to `/gov/projects` (capital infrastructure projects) instead of a dedicated physical asset register (`/gov/assets`), lacks links for "Today" and "Announcements", and uses an orange accent (`#ff6b00`) rather than Field Blue (`var(--gov-action)` / `#0b4f6c`).
4. **Mock Fallbacks & Synthetic Data:** Multiple existing views (`WorkOrdersPage.jsx`, `InsightsWorkspacePage.jsx`, `GovReportsDashboard.jsx`) embed static arrays (`SAMPLE_WORK_ORDERS`, `COMPLETION_TREND`, `ISSUE_CLUSTERS`, `PREDICTIVE_ITEMS`) or use random number generation (`predictive_router.py`), violating the "zero mock fallbacks" mandate.
5. **Auth Session Desynchronization:** `authSession.js` stores active tokens in `sessionStorage` and actively purges `localStorage`, but multiple components (including `CitizenReportsPage.jsx` and `WorkOrdersPage.jsx`) attempt to retrieve tokens solely from `localStorage`, causing potential 401 unauthenticated errors.
6. **Build & Test Health:** `npm run build` succeeds with 0 errors (Vite 7.3.1, transforming 2,715 modules). All 4 automated frontend test suites (`test-challenger-m2-frontend.mjs`, `test-challenger-m2-ssr-dom.mjs`, `test-empirical-all.mjs`, `test-m1-comprehensive.mjs`) pass completely (63/63 tests passing).

---

## 1. Deep Dive: `CitizenReportsPage.jsx` & Civic Aperture v0.2 Standard

### 1.1 Architecture and Layout
`frontend/src/pages/CitizenReportsPage.jsx` (632 lines) along with its co-located stylesheet `frontend/src/pages/citizen-reports.css` (366 lines) represents the design and interaction benchmark for the PULSO Government Operate mode.

- **Shell & Structure:**
  - Outer container (`citizen-reports-page`) mounts `GovSidebar` alongside `citizen-reports-shell`.
  - Topbar (`citizen-reports-topbar`, lines 343–361): 64px height, title (`h1`), subtitle, live data age indicator (`ageLabel`), status pill for notifications, `ThemeToggle`, and manual refresh button.
  - Workspace Context Bar: Mounts `<GovernmentWorkspaceTabs workspace={workspace} />` when rendered within a government workspace route.
  - Main Grid (`citizen-reports-main`, lines 365–612): A split-pane layout driven by CSS Grid that dynamically responds to docket state:
    - Default (Docket closed): Single column `grid-template-columns: minmax(0, 1fr);`
    - Docket open (`is-docket-open`): Two columns `grid-template-columns: minmax(480px, 0.92fr) minmax(520px, 1.08fr);`
    - Responsive adaptation (<= 900px): Transitions from side-by-side grid to vertical stacked flow.

### 1.2 Design Tokens & Theming (Light/Dark Parity)
All styling relies on CSS Custom Properties defined in `frontend/src/index.css`:
- **Morning Field Sheet (Light Mode):**
  - Background Canvas: `var(--gov-canvas)` (`#f7f8fa`)
  - Work Surface: `var(--gov-surface)` (`#ffffff`)
  - Subtle Surface: `var(--gov-surface-subtle)` (`#f8faf9`)
  - Rules & Borders: `var(--gov-rule)` (`#c9d4d9`)
  - Primary Text: `var(--gov-text)` (`#132238`)
  - Secondary Text: `var(--gov-text-secondary)` (`#465d6c`)
  - Action / Accent (Field Blue): `var(--gov-action)` (`#0b4f6c`), `var(--gov-action-strong)` (`#083e55`)
  - Selection Fill: `var(--gov-selection)` (`#e7f3f7`)
  - Semantic Statuses: `var(--gov-critical)` (`#b42318`), `var(--gov-resolved)` (`#0f766e`), `var(--gov-warning)` (`#b45309`)
- **Night Inspection (Dark Mode via `.dark` selector):**
  - Background Canvas: `var(--gov-canvas)` (`#071a2b` deep survey blue)
  - Work Surface: `var(--gov-surface)` (`#0e283e`)
  - Subtle Surface: `var(--gov-surface-subtle)` (`#15364d`)
  - Rules & Borders: `var(--gov-rule)` (`#335166`)
  - Primary Text: `var(--gov-text)` (`#f4f7f2`)
  - Secondary Text: `var(--gov-text-secondary)` (`#b9c7cf`)
  - Action / Accent: `var(--gov-action)` (`#82c7d8`), `var(--gov-action-strong)` (`#a5d9e5`)
  - Selection Fill: `var(--gov-selection)` (`#15364d`)
  - Focus Ring: `var(--gov-focus)` (`#93c5fd` 3px outline with 2px offset)

### 1.3 Signature Civic Aperture Interaction Elements
1. **Signal Cut (2px indicator):**
   - Implemented via `.citizen-report-row__signal` (line 123 in CSS): A 2px vertical rule pinned to the left edge of each row. In normal state it is transparent; on row selection (`.is-selected`), it lights up in `var(--gov-action)` (`#0b4f6c` / `#82c7d8`).
2. **2px Pulseline Lifecycle Visualizer:**
   - Implemented in lines 496–518 (`citizen-report-pulseline`):
   - A 2px horizontal track (`citizen-pulseline-track`) with an active animated fill (`citizen-pulseline-bar`) indicating overall progress across 5 canonical milestones: `Received` → `Verified` → `Assigned` → `In progress` → `Resolved`.
   - Each milestone node features a 10px circular dot (`citizen-pulseline-dot`). Completed nodes are solid Field Blue; the current active step displays an outer halo box-shadow ring (`box-shadow: 0 0 0 3px ...`).
3. **Field Aperture Evidence Framing:**
   - True-color evidence container (`citizen-report-evidence`, lines 160–191 in CSS).
   - Precision white corner registration marks rendered via `::before` and `::after` pseudo-elements (2px top/left and top/right borders).
   - Figcaption providing authoritative audit metadata: camera icon, "Photo evidence", formatted timestamp, and "True-color" confirmation.
4. **Honest AI Advisory Bounding:**
   - Section `.citizen-report-advisory` (lines 555–561):
   - Clear visual containment in subtle surface with `Sparkles` icon.
   - Prominent mandatory bounding microcopy: *"Automated suggestion. Staff review remains required before any decision."*
5. **Coordinate & Location Presentation:**
   - Formatted barangay and landmark details paired with exact latitude/longitude coordinates rendered inside a monospace `<code>` badge (`IBM Plex Mono`, 11px).
   - Note: The current page does not embed an inline Google Map in the docket; it provides textual and coordinate geospatial data.
6. **Docket Collapse vs. Close Gap:**
   - Currently, clicking Close (`X`) or Escape completely removes the `report` URL query parameter, unmounting the docket entirely.
   - Requirement R2 specifies that the docket must support a distinct **Collapse** action (collapsing into a compact 48px rail preserving filters, selection, and map) versus **Close** (clearing selection). This distinct 48px collapsed state is not yet implemented.

---

## 2. Routing Architecture & RBAC Analysis (`App.jsx`)

### 2.1 Route Mapping Table

| Route Path | Component Mounted | Access Guard | Notes & Discrepancies |
|---|---|---|---|
| `/gov` | `GovLanding.jsx` | Public | Government staff portal login |
| `/gov/dashboard` | `GovBiDashboard.jsx` | `GovOnly` | Props `token` and `currentUser` are NOT passed; causes fetch failure |
| `/gov/my-dashboard` | `GovBiDashboard.jsx` | `GovOnly` | Duplicate alias for `/gov/dashboard` |
| `/gov/operations` | `GovernmentWorkspaceRoute` | `GovOnly` | Sub-views: `dispatch`, `reports`, `work-orders`, `closed`, `updates` |
| `/gov/operations?view=reports` | `CitizenReportsPage.jsx` | `GovOnly` | **This is where CitizenReportsPage is actually rendered!** |
| `/gov/reports` | `GovReportsDashboard.jsx` | `GovOnly` | **Discrepancy:** Direct `/gov/reports` loads legacy 1,809-line mock dashboard instead of `CitizenReportsPage`! |
| `/gov/citizen-reports` | `<Navigate to="/gov/reports" />` | Public | Redirects to `/gov/reports` |
| `/gov/reports/:reportId` | *Missing* | — | **Requirement R2:** Dedicated full-page engineering docket is missing |
| `/gov/today` | *Missing* | — | **Requirement R1:** Centralized daily operations hub is missing |
| `/gov/work-orders` | `<Navigate to="/gov/operations?view=work-orders" />` | `GovOnly` | Redirects to workspace view rendering `WorkOrdersPage.jsx` |
| `/gov/assets` | *Missing* | — | **Requirement R4:** Physical infrastructure asset register is missing |
| `/gov/projects` | `GovProjectsPage.jsx` | `GovOnly` | Mounts `LguProjectsView.jsx` (Capital Infrastructure Projects Phase 1–6) |
| `/gov/announcements` | *Missing* | — | **Requirement R6:** Governed announcements module is missing |
| `/gov/analytics` | `GovAnalyticsPage.jsx` | `GovOnly` | Current implementation uses SaaS cards, needs plain-language overhaul |
| `/gov/bi` | `GovBiDashboard.jsx` | `GovOnly` | Standalone BI route |
| `/gov/records-workspace` | `GovernmentWorkspaceRoute` | `GovOnly` | Sub-views: `registry`, `documents`, `timeline`, `audit` |
| `/gov/insights` | `GovernmentWorkspaceRoute` | `GovOnly` | Sub-views: `overview`, `analytics`, `predictive` |
| `/gov/administration` | `GovernmentWorkspaceRoute` | `AdminOnly` | Sub-views: `staff`, `residents`, `settings`, `agents` |

### 2.2 Navigation Architecture (`GovSidebar.jsx`)
`frontend/src/components/GovSidebar.jsx` defines the primary left-rail navigation:
- **Navigation Links:**
  1. `Dashboard` (`/gov/dashboard`)
  2. `Reports` (`/gov/reports`)
  3. `Work orders` (`/gov/work-orders`)
  4. `Assets` (`/gov/projects`) — **Problem:** Points to capital projects, not `/gov/assets`
  5. `Map` (`/gov/map`)
  6. `Analytics` (`/gov/analytics`)
  7. `Directory` (`/gov/users`)
  8. `Settings` (`/gov/settings`)
- **Visual Gaps:**
  - Active item indicator uses `bg-[#ff6b00]` (PULSO orange) rather than Field Blue (`var(--gov-action)` / `#0b4f6c`), violating Civic Aperture operate-mode requirements.
  - Sidebar dimensions (`w-60` = 240px, collapsed `w-20` = 80px) deviate slightly from the CSS design tokens (`--gov-sidebar-width: 256px`, `--gov-sidebar-rail-width: 72px`).
  - Missing nav entries for `Today` (`/gov/today`) and `Announcements` (`/gov/announcements`).

### 2.3 Role-Based Access Control (RBAC)
- RBAC is enforced on the client via `ProtectedRoute.jsx` and `rbac_utils.js`.
- Role hierarchy:
  - `EXECUTIVE_ROLES`: `city_engineer`, `asst_city_engineer`, `manager`, `system_admin`
  - `SENIOR_ROLES`: `city_engineer`, `asst_city_engineer`, `admin_officer`, `division_chief`, `manager`, `system_admin`
  - `INSPECTOR_ROLES`: `building_inspector`, `electrical_inspector`, `mechanical_inspector`, + Executive
  - `FIELD_ROLES`: `project_engineer`, `construction_foreman`, `field_worker`, `dispatcher`, + Senior
  - `PROCUREMENT_ROLES`: `project_engineer`, `admin_officer`, `estimator`, + Executive
  - `ADMIN_ONLY`: `system_admin`, `manager`
- **Session Bug:** `authSession.js` sets token into `sessionStorage` and actively removes `localStorage.getItem('pulso_token')`. However, `CitizenReportsPage.jsx` (line 106) and `WorkOrdersPage.jsx` (line 157) read only `localStorage.getItem('pulso_token')`. When a user signs in via `Login.jsx` or `GovLanding.jsx`, `localStorage` has no token, causing these pages to send `Authorization: Bearer null` unless fixed to use `getAuthToken() || localStorage.getItem('pulso_token')`.

---

## 3. Inventory of Existing Gov Pages, Stubs, & Requirements

### 3.1 `GovTodayPage.jsx` (Requirement R1)
- **Status:** **DOES NOT EXIST.**
- **Required Implementation:**
  - Route: `/gov/today` (and integration into default government landing).
  - 5 Core Leadership Metrics: Unassigned Concerns, Overdue Actions, Awaiting Verification, Open High-Priority, Resolved in Period.
  - Actionable "Needs Attention" triage feed with direct deep-links into the reports docket and work order inspector.
  - Dual-sector map overview (North Caloocan District 3 and South Caloocan Districts 1/2).
  - Team capacity and blocker indicators (e.g. Field Crew A, Road Maintenance, Drainage Division).

### 3.2 `GovReportDetailPage.jsx` (Requirement R2)
- **Status:** **DOES NOT EXIST.**
- **Current State:** Single-page docket exists only as a collapsible slide-out drawer inside `CitizenReportsPage.jsx`.
- **Required Implementation:**
  - Route: `/gov/reports/:reportId`.
  - Full-page engineering docket with context-preserving back navigation to `/gov/operations?view=reports` or `/gov/reports`.
  - Real API integration for requesting citizen info (`POST /api/reports/{id}/request-info`) and work order assignment (`POST /api/gov/work-orders`), removing all mock alerts/toasts.

### 3.3 `GovWorkOrdersPage.jsx` & Work Module (Requirement R3)
- **Status:** Currently exists as `frontend/src/pages/WorkOrdersPage.jsx` (781 lines), mounted under `/gov/operations?view=work-orders`.
- **Issues Identified:**
  - Merges server data with hardcoded `SAMPLE_WORK_ORDERS` (lines 49–154, 184–202). If the backend is empty or fails, it falls back to synthetic data.
  - Operational tabs exist (`all`, `assigned`, `active`, `blocked`, `for_review`, `completed`), but lack strict filtering for `Awaiting Verification` and structured blocker delay tracking.
  - Moving capital infrastructure projects into Work module (tabs: Field Work Orders vs. Capital Projects).

### 3.4 `GovInspectionModal.jsx` (Requirement R3)
- **Status:** **DOES NOT EXIST.**
- **Current State:** `WorkOrderUpdateModal.jsx` exists, allowing any user to submit an update or change status to `completed`.
- **Required Implementation:**
  - A dedicated independent verification modal enforcing strict **Separation of Duties**: Inspector ID must NOT equal Field Worker ID (`inspector_id !== field_worker_id`).
  - Fields for verification checklist, structural compliance sign-off, photo evidence upload, and punch-list rejection reason codes.

### 3.5 `GovAssetsPage.jsx` & `GovAssetDetailPage.jsx` (Requirement R4)
- **Status:** **DOES NOT EXIST.**
- **Current State:** Clicking "Assets" in `GovSidebar.jsx` routes to `/gov/projects`, showing `LguProjectsView.jsx` (6-phase capital project tracking).
- **Required Implementation:**
  - Route `/gov/assets` and `/gov/assets/:assetId`.
  - Municipal physical asset register matching backend `InfrastructureAsset` model (`gov_models.py` line 518):
    - Categorization: Roads, Drainage, Bridges, Public Buildings, Facilities.
    - Fields: Asset ID (`CAL-RD-001`), name, material type, date completed, design life, contractor, barangay, condition score.
    - Linked historical inspection logs (`maintenance_history`) and maintenance work orders (`work_orders`).
  - Move capital projects exclusively into the Work module.

### 3.6 `GovAnalyticsPage.jsx` (Requirement R5)
- **Status:** Exists at `frontend/src/pages/GovAnalyticsPage.jsx` (1,256 lines).
- **Issues Identified:**
  - Uses generic SaaS colored KPI cards (`bg-indigo-100`, etc.), "Stress Zones", and "Threat Level" badges.
  - Does NOT lead with plain civic questions:
    1. *Are we keeping up?* (Incoming demand vs. resolution rate velocity)
    2. *Where are concerns recurring?* (Chronic hotspots by barangay and category)
    3. *Which work is delayed?* (Overdue SLA and blocked work orders)
    4. *What should we inspect next?* (Deterministic asset risk scoring)
  - Backend dependency: `backend/predictive_router.py` currently uses random number generators (`random.randint`, `random.uniform`) on lines 129–131, 172, 175–178, 212–213, 443–450, which must be purged and replaced with deterministic scoring.

### 3.7 `GovAnnouncementsPage.jsx` & `GovAnnouncementEditor.jsx` (Requirement R6)
- **Status:** **DOES NOT EXIST.**
- **Current State:** Only a rudimentary news endpoint exists in `backend/main.py` (`/api/news`), with no multi-stage editorial workflow.
- **Required Implementation:**
  - Routes: `/gov/announcements` and `/gov/announcements/new` (or editor modal).
  - Multi-stage publishing lifecycle: `Draft` → `In Review` → `Approved` → `Scheduled` → `Published` → `Expired/Withdrawn`.
  - Bilingual drafting support (English and Filipino side-by-side / tabs).
  - Timestamped public correction notice affordance.
  - Delivery channel tracking (Web Banner, Resident Portal, Mobile Push, SMS Gateway).

---

## 4. API Client Layer & Synthetic Data Audit

### 4.1 Client Layer Architecture
- `frontend/src/utils/apiBase.js`: Resolves API base URL from `import.meta.env.VITE_API_BASE_URL` or falls back to `http://${window.location.hostname}:33159`.
- `frontend/src/utils/apiFetch.js`: Error handling wrapper around `fetch()`.
- Most components directly use native `fetch(`${API_BASE_URL}/...`)` with `Authorization: Bearer ${token}` headers.

### 4.2 Comprehensive Mock / Synthetic Data Catalog

| File | Location | Synthetic / Mock Data Description | Action Required |
|---|---|---|---|
| `WorkOrdersPage.jsx` | Lines 49–154, 184–202 | `SAMPLE_WORK_ORDERS`: 5 static work orders merged into API response or used as full fallback when API fails. | Eliminate mock fallback; render real API data or authoritative empty/error states. |
| `GovReportsDashboard.jsx` | Lines 32–60 | `INITIAL_REPORTS`: Hardcoded reports with Unsplash images. | Replace route with `CitizenReportsPage.jsx` or connect fully to API. |
| `InsightsWorkspacePage.jsx` | Lines 27–145 | `COMPLETION_TREND`, `ISSUE_CLUSTERS`, `PREDICTIVE_ITEMS`, `BARANGAY_DISTRIBUTION`: Completely static arrays. ZERO fetch calls are made. | Connect to `/api/gov/analytics/*` and `/api/gov/predictive/*` endpoints. |
| `GovBiDashboard.jsx` | Lines 1–69 | `TRAJECTORY_DATA`, `CAPITAL_MILESTONES`: Hardcoded arrays. Does not fetch if token prop is missing. | Pass token from `getAuthToken()`; remove static trajectories. |
| `CitizenReportsPage.jsx` | Lines 275–280 | `handleRequestInfoSubmit`: Simulates citizen info request using a `showToast()` timeout without calling backend. | Connect to backend info request endpoint. |
| `predictive_router.py` (Backend) | Lines 129–131, 172, 175–178, 212–213, 443–450 | `random.uniform(0.01, 0.1)`, `random.randint(0, 10)`, etc., generating fake failure probabilities and costs. | Purge all `random.*` calls; implement deterministic scoring based on real asset age, material, and maintenance logs. |

---

## 5. Build & Testing Tooling Verification

### 5.1 Build Configuration & Execution
- **Dependencies:** React 19.2.0, TailwindCSS v4 (`@tailwindcss/vite` 4.2.1), `react-router-dom` 7.13.1, `lucide-react` 0.575.0, `framer-motion` 12.34.3, `@react-google-maps/api` 2.20.8, `axios` 1.13.5.
- **Build Verification Command:** `npm run build` inside `frontend/`.
- **Empirical Execution Result:**
  ```
  vite v7.3.1 building client environment for production...
  transforming...
  ✓ 2715 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                                         1.81 kB │ gzip:     0.78 kB
  dist/assets/index-t50hcwLj.css                        520.53 kB │ gzip:    65.11 kB
  ...
  dist/assets/index-1kfJQGo8.js                       4,395.29 kB │ gzip: 1,183.65 kB
  ✓ built in 24.06s
  Exit code: 0 (Zero errors)
  ```

### 5.2 Test Suites & Verification
The repository uses custom ES module test runners (`node <test-file>.mjs`) executing assertion suites:
1. `node test-challenger-m2-frontend.mjs`:
   - Validates deep linking URL parameter extraction, PulseLine 6-stage lifecycle step mapping, `ClaimReportModal` validation and error mapping, resident dashboard tab filtering, and component integrity.
   - **Result:** 19/19 PASSED.
2. `node test-challenger-m2-ssr-dom.mjs`:
   - Validates Vite SSR and DOM component rendering for `ClaimReportModal`, `PublicTrackPage`, `ReportSuccessPage`, and `ResidentDashboard`.
   - **Result:** 5/5 PASSED.
3. `node test-empirical-all.mjs`:
   - Validates Ray-casting and geometric corner cases, Caloocan official GeoJSON boundary (188 barangays), Haversine calculations and duplicate radar, draft serialization, and step navigation state integrity.
   - **Result:** 19/19 PASSED.
4. `node test-m1-comprehensive.mjs`:
   - Validates `GovSystemBanner` ARIA contracts, dynamic interactivity and callbacks, `NotificationCenter` drawer, Civic Aperture token fidelity & WCAG 2.2 AA contrast ratios, and `GovernmentWorkspaceRoute` integration.
   - **Result:** 20/20 PASSED.
5. **Total Test Coverage:** 63/63 automated tests pass cleanly.
- **SSR Observation:** A non-fatal warning (`ReferenceError: sessionStorage is not defined`) occurs during Node SSR execution when `authSession.js` evaluates without checking `typeof window !== 'undefined'`. Adding a browser environment guard will clean this up.

---

## 6. Synthesis & Proposed Implementation Architecture

To fulfill all requirements of the 2026-09-18 mandate without breaking existing functionality, the implementation plan should execute across the following phases:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PROPOSED FRONTEND ARCHITECTURE                          │
├───────────────────────┬───────────────────────────┬─────────────────────────────┤
│ Target Module         │ Target Route(s)           │ Core Components             │
├───────────────────────┼───────────────────────────┼─────────────────────────────┤
│ 1. Daily Ops (Today)  │ /gov/today                │ GovTodayPage.jsx            │
│                       │ /gov/operations?view=today│ NeedsAttentionFeed.jsx      │
│                       │                           │ SectorMapDual.jsx           │
├───────────────────────┼───────────────────────────┼─────────────────────────────┤
│ 2. Reports & Docket   │ /gov/reports              │ CitizenReportsPage.jsx      │
│                       │ /gov/reports/:reportId    │ GovReportDetailPage.jsx     │
│                       │ /gov/operations?view=reps │ CollapsibleDocketRail (48px)│
├───────────────────────┼───────────────────────────┼─────────────────────────────┤
│ 3. Work & Inspections │ /gov/work-orders          │ GovWorkOrdersPage.jsx       │
│                       │ /gov/operations?view=work │ GovInspectionModal.jsx      │
│                       │                           │ BlockerReportModal.jsx      │
├───────────────────────┼───────────────────────────┼─────────────────────────────┤
│ 4. Asset Register     │ /gov/assets               │ GovAssetsPage.jsx           │
│                       │ /gov/assets/:assetId      │ GovAssetDetailPage.jsx      │
│                       │                           │ AssetMaintenanceHistory.jsx │
├───────────────────────┼───────────────────────────┼─────────────────────────────┤
│ 5. Civic Performance  │ /gov/analytics            │ GovAnalyticsPage.jsx        │
│                       │ /gov/insights?view=analyt │ PlainCivicQuestionsView.jsx │
│                       │                           │ DeterministicDemandModel.js │
├───────────────────────┼───────────────────────────┼─────────────────────────────┤
│ 6. Governed Updates   │ /gov/announcements        │ GovAnnouncementsPage.jsx    │
│                       │ /gov/announcements/new    │ GovAnnouncementEditor.jsx   │
│                       │ /gov/operations?view=upd  │ BilingualDraftTabs.jsx      │
└───────────────────────┴───────────────────────────┴─────────────────────────────┘
```

### Key Technical Enforcements for Implementation:
1. **Unify `/gov/reports` to `CitizenReportsPage`:** In `App.jsx`, replace `GovReportsDashboard` with `CitizenReportsPage`.
2. **Add Missing Routes in `App.jsx`:** Add `/gov/today`, `/gov/reports/:reportId`, `/gov/assets`, `/gov/assets/:assetId`, and `/gov/announcements`.
3. **Harmonize `GovSidebar.jsx`:**
   - Add links for `Today` (`/gov/today`) and `Announcements` (`/gov/announcements`).
   - Re-route `Assets` to `/gov/assets`.
   - Update active state styling to Field Blue (`bg-[var(--gov-action)]`).
4. **Fix Token Retrieval:** Ensure all components use `getAuthToken() || localStorage.getItem('pulso_token')` so that `sessionStorage` logins succeed.
5. **Zero Mock Fallbacks:** In all new and refactored components, completely remove static sample arrays (`SAMPLE_WORK_ORDERS`, `PREDICTIVE_ITEMS`, etc.) and render authentic server data or explicit error/empty states.
6. **Separation of Duties in Verification:** Ensure `GovInspectionModal` prevents self-approval by validating `currentUser.id !== workOrder.assigned_to_id`.

---
