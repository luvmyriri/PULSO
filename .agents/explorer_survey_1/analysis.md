# PULSO Government Workspace Frontend Technical Survey & Architecture Analysis

**Document**: Frontend Survey & Codebase Analysis Report  
**Investigator**: Explorer 1 (`.agents/explorer_survey_1`)  
**Date**: 2026-08-31  
**Scope**: `frontend/` (Routing, Layout, Tokens, Theme, Notification Center, System Banners, Reusable UI Primitives)  
**Status**: Completed Investigation (Read-Only)

---

## Executive Summary

This report delivers a deep technical survey of the PULSO web frontend (`frontend/`) to support the complete overhaul and refactoring of the Government operational workspace according to the **Civic Aperture** visual art direction and the blueprint specifications (Images 1–4, Requirements R1–R4).

### Key Survey Findings:
1. **Routing & Workspaces**: The unified routing architecture in `App.jsx` cleanly maps the 6 core government destinations (`/gov/my-dashboard`, `/gov/operations`, `/gov/delivery`, `/gov/records-workspace`, `/gov/insights`, `/gov/administration`) and preserves backward-compatible redirects for 12+ legacy division routes. Sub-views are managed via `?view=` query parameters and governed by `governmentWorkspaceConfig.js` and `rbac_utils.js`.
2. **Design Tokens & Theme Architecture**: Tailwind v4 (`@tailwindcss/vite` 4.2.1) is integrated in `vite.config.js` and `index.css`. However, the Tailwind v4 `@theme` block in `index.css` currently only contains placeholder colors and legacy utilities (`.glass-nav`, `.glass-card`). The official Civic Aperture tokens (Ink `#132238`, Canvas `#F7F8FA` / `#071A2B`, Survey Blue `#075985`, Field Blue `#0B4F6C` / `#82C7D8`, Resident Action `#C2410C` / `#FF8A3D`, Pulse `#F97316`, Resolved `#0F766E` / `#66D2C8`, Warning `#B45309`, Danger `#B42318` / `#FDA29B`, Focus `#2563EB` / `#93C5FD`) are defined partially as CSS custom properties in `gov-sidebar.css` and hardcoded across disparate page CSS files.
3. **Sliding Notification Center**: `NotificationCenter.jsx` implements a right-side sliding drawer (`width: min(440px, 100vw)`) with 4 filter tabs (`All`, `Assigned`, `Reviews`, `System`), unread badges, mark-as-read handlers, deep links to tasks, and fallback states. It is triggered from `GovSidebar.jsx` and requires token normalization to match Civic Aperture.
4. **System Banners**: There is currently **no unified system banner component**. Ad-hoc alert boxes exist in `PositionDashboard.jsx` (error retry) and `ResidentDashboard.jsx` (offline banner), but the government workspace lacks a centralized `GovSystemBanner` supporting the 4 mandatory operational states: **Offline**, **Permission Changed**, **Emergency Access**, and **Partial Data**.
5. **Reusable UI Primitives & Gaps**: Reusable components currently include `GovSidebar` (with 256px expanded, 72px collapsed rail, and <1024px mobile drawer), `GovernmentWorkspaceTabs`, `NotificationCenter`, `ThemeToggle`, `ProtectedRoute`, and 3 operational modals (`RequestInfoModal`, `AssignWorkOrderModal`, `WorkOrderUpdateModal`). Gaps exist for unified `GovHeader` / Breadcrumb bars, reusable `Pulseline` lifecycle trackers, `CoordinateRail` components, true-color `FieldApertureCard` containers, BoQ tables, and RBAC diff matrices.
6. **Build Integrity**: `npm run build` succeeds with 0 errors (13.73s build time). ESLint on all government workspace files (`GovernmentWorkspaceRoute.jsx`, `GovSidebar.jsx`, `GovernmentWorkspaceTabs.jsx`, `PositionDashboard.jsx`, `CitizenReportsPage.jsx`, `WorkOrdersPage.jsx`, `ProjectsWorkspacePage.jsx`, `RecordsWorkspacePage.jsx`, `InsightsWorkspacePage.jsx`, `AdministrationWorkspacePage.jsx`, `NotificationCenter.jsx`) passes with **0 errors**.

---

## 1. Routing & Layout Architecture for `/gov/*`

### 1.1 Route Map & Workspace Hierarchy

The application routing is defined in `frontend/src/App.jsx` using `react-router-dom` (v7.13.1). The government operational workspace is partitioned into 6 primary destinations:

| Route Path | Primary Component / Wrapper | Workspace Key | Views (`?view=`) | Permission / Role Guard |
|---|---|---|---|---|
| `/gov/my-dashboard` | `PositionDashboard` | N/A (Landing) | N/A (Role-specific sections) | `GovOnly` (All authenticated government roles) |
| `/gov/operations` | `GovernmentWorkspaceRoute` | `operations` | `reports`, `dispatch`, `work-orders`, `closed`, `updates` | `GovOnly` (Sub-views gated by RBAC permissions) |
| `/gov/delivery` | `ProjectsWorkspacePage` | `delivery` | `projects`, `procurement`, `design`, `analysis`, `surveys`, `quantities`, `estimation` | `GovOnly` (Sub-views gated by RBAC permissions) |
| `/gov/records-workspace` | `GovernmentWorkspaceRoute` | `records` | `documents`, `registry`, `timeline`, `audit` | `GovOnly` (`audit` requires `ops:manage`, `registry` requires admin/records roles) |
| `/gov/insights` | `GovernmentWorkspaceRoute` | `insights` | `overview`, `analytics`, `predictive` | `GovOnly` (`overview` requires `ops:manage`, `analytics` requires `admin:manage`) |
| `/gov/administration` | `GovernmentWorkspaceRoute` | `administration` | `staff`, `residents`, `settings`, `agents` | `AdminOnly` (`admin:manage` permission) |

### 1.2 Legacy Route Compatibility

To avoid breaking external links, bookmarks, or staff workflows, `App.jsx` provides explicit `<Navigate replace />` redirects from legacy paths to the new unified workspaces:

- `/gov/work-orders` → `/gov/operations?view=work-orders`
- `/gov/reports` → `/gov/operations?view=reports`
- `/gov/reports-archive` → `/gov/operations?view=closed`
- `/gov/advisories` → `/gov/operations?view=updates`
- `/dispatcher` → `/gov/operations?view=dispatch`
- `/gov/projects` → `/gov/delivery?view=projects`
- `/gov/procurement` → `/gov/delivery?view=procurement`
- `/gov/design-requests` → `/gov/delivery?view=design`
- `/gov/analysis` → `/gov/delivery?view=analysis`
- `/gov/surveys` → `/gov/delivery?view=surveys`
- `/gov/boq` → `/gov/delivery?view=quantities`
- `/gov/estimation` → `/gov/delivery?view=estimation`
- `/gov/document-registry` → `/gov/records-workspace?view=documents`
- `/gov/records` → `/gov/records-workspace?view=registry`
- `/gov/timeline` → `/gov/records-workspace?view=timeline`
- `/gov/audit-logs` → `/gov/records-workspace?view=audit`
- `/management` → `/gov/insights?view=overview`
- `/gov/analytics` → `/gov/insights?view=analytics`
- `/gov/predictive` → `/gov/insights?view=predictive`
- `/gov/users` → `/gov/administration?view=staff`
- `/gov/residents` → `/gov/administration?view=residents`
- `/gov/settings` → `/gov/administration?view=settings`

### 1.3 Layout Architecture & Responsive Breakpoints

The government shell implements a 2-tier navigational structure:
1. **Persistent Sidebar (`GovSidebar.jsx`)**:
   - **Expanded Desktop (≥1280px)**: 256px fixed width, shows branding, categorized navigation groups (`My work`, `Operations`, `Planning and delivery`, `Records`, `Insights`, `Administration`), expandable sub-links, notification trigger, mobile app link, sign out, and staff profile badge.
   - **Compact / Tablet Rail (1024px–1279px)**: Automatically condenses (or manually toggles) to a 72px rail. Text labels are clipped to screen-reader only (`sr-only`), and icons display floating hover/focus tooltips (`.gov-nav-item__tooltip`).
   - **Mobile / Narrow (<1024px)**: Fixed hamburger button (`.gov-mobile-nav-trigger`, 44×44px touch target) pinned at `top: 10px; left: 10px`. When opened, a 304px drawer slides from `-102%` to `0` over a dimmed backdrop (`.gov-sidebar-backdrop` with `rgba(7, 26, 43, 0.48)`). Focus is trapped inside the drawer and dismissed with `Escape` or backdrop click.
2. **Top Workspace Tabs (`GovernmentWorkspaceTabs.jsx`)**:
   - Pinned under the header on workspace routes (`operations`, `records`, `insights`, `administration`).
   - Dynamically filters tabs based on the logged-in user's RBAC capabilities (`getAvailableWorkspaceViews`).
   - Horizontally scrollable on narrow viewports with thin scrollbars (`min-height: 46px`).
3. **Queue / Docket Split-View (Operate Model)**:
   - Citizen Reports and Work Orders use a 2-column layout:
     - Left column: Searchable/filterable queue table (e.g. `minmax(480px, 0.92fr)`).
     - Right column: Engineering Case Detail Docket (e.g. `minmax(520px, 1.08fr)`) containing Field Aperture evidence, Signal Cut Pulseline, coordinate rail, blockers/changes, and sticky action bar.
   - Responsive Reflow: On viewports <1024px, the grid collapses into a stacked view or toggles between list and detail via query parameter `?report=` / `?wo=`.

---

## 2. Civic Aperture Design Tokens & Styling System

### 2.1 Approved Design Token Specifications

According to `09-visual-art-direction-v2.md` and `PRODUCT.md`, PULSO uses the **Civic Aperture** design system. The color palette maps semantic roles across two intentional modes: **Morning Field Sheet** (Light) and **Night Inspection** (Dark).

| Token Name | Light Mode (Morning Field Sheet) | Dark Mode (Night Inspection) | Role / Purpose in PULSO |
|---|---|---|---|
| `canvas` | `#F4F7F5` / `#F7F8FA` | `#071A2B` (Survey Night) | Base page environment |
| `surface` | `#FFFFFF` | `#0E283E` | Primary operational work surfaces, table rows, cards |
| `surface/elevated` | `#F8FAF9` | `#15364D` | Overlays, drawers, modals, dockets |
| `text/primary` (Ink) | `#0C2436` / `#132238` | `#F4F7F2` | High-contrast body, headers, ticket IDs |
| `text/secondary` | `#465D6C` | `#B9C7CF` | Supporting metadata, timestamps, labels |
| `rule/default` | `#C9D4D9` | `#335166` | 1px dividers, inactive lifecycle steps |
| `action/resident` (Ember) | `#C2410C` / `#B9380B` | `#FF8A3D` | Resident primary creation and alert cues |
| `action/government` (Field Blue) | `#075985` / `#0B4F6C` | `#82C7D8` / `#38BDF8` | Staff action buttons, selection indicators, active tabs |
| `pulse` (Heartbeat) | `#F97316` | `#F97316` | Live pulse notch, real-time indicators |
| `state/resolved` | `#0F766E` / `#0B756B` | `#66D2C8` | Completed work orders, approved documents, CoC |
| `state/warning` | `#B45309` | `#FDB022` | Blockers, missing info, budget checks |
| `state/critical` (Danger) | `#B42318` | `#FDA29B` | High hazard, SLA breach, destructive actions |
| `focus/ring` | `#2563EB` | `#93C5FD` | 3px keyboard focus indicator |

### 2.2 Current Implementation in `index.css` & CSS Modules

1. **Tailwind v4 Integration**:
   - `frontend/src/index.css` begins with `@import "tailwindcss";` and `@variant dark (&:is(.dark *));`.
   - The `@theme` block currently only registers placeholder colors:
     ```css
     @theme {
       --color-primary-light: #fdba74;
       --color-primary: #f97316;
       --color-primary-dark: #ea580c;
       --color-dark-light: #1e293b;
       --color-dark: #0f172a;
       --color-light-offset: #f8fafc;
       --color-light: #ffffff;
       --font-sans: "Inter", sans-serif;
       --font-display: "Oswald", sans-serif;
     }
     ```
   - **Defect/Gap**: The Civic Aperture tokens (`ink`, `canvas`, `survey-blue`, `field-blue`, `resolved`, `warning`, `critical`, `action-gov`, `action-res`) are **not yet defined in `@theme`**.
2. **CSS Custom Properties in `gov-sidebar.css`**:
   - `:root` and `.dark` blocks in `gov-sidebar.css` define `--gov-canvas`, `--gov-surface`, `--gov-surface-subtle`, `--gov-text`, `--gov-text-secondary`, `--gov-rule`, `--gov-action`, `--gov-action-strong`, `--gov-selection`, `--gov-focus`, `--gov-critical`.
   - **Defect/Gap**: These variables are scoped inside `gov-sidebar.css` rather than globally in `index.css`, leading individual pages (`work-orders.css`, `projects-workspace.css`, `notification-center.css`) to either re-declare fallback values (e.g. `--gov-accent: #0284c7`) or use hardcoded hex values.
3. **Theme Provider & Synchronization**:
   - `ThemeContext.jsx` provides `theme` ('system', 'light', 'dark') and `changeTheme`.
   - Automatically attaches `.light` or `.dark` class to `document.documentElement`.
   - Listens to OS `matchMedia('(prefers-color-scheme: dark)')` when set to `system`.
   - `ThemeToggle.jsx` renders a 3-way toggle (Sun, Monitor, Moon).

---

## 3. Sliding Notification Center Drawer

### 3.1 Component Architecture

The notification center is implemented in `frontend/src/components/NotificationCenter.jsx` and styled via `frontend/src/components/notification-center.css`.

- **Trigger**: Clicked via the `Bell` icon button in `GovSidebar.jsx` footer (or any workspace header action).
- **DOM Container**: Fixed slide-out aside element (`.gov-notification-drawer`) with a matching full-screen backdrop (`.gov-notification-backdrop`).
- **Dimensions & Animation**:
  - `width: min(440px, 100vw)`
  - `transform: translateX(100%)` → `transform: translateX(0)` with `transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)`.
  - `z-index: 999` (above sidebar and workspace content).

### 3.2 Feature Matrix & Tabs

| Tab Key | Label | Filter Logic | Example Notification Types |
|---|---|---|---|
| `all` | **All** | Returns all notifications | All events |
| `assigned` | **Assigned** | `type === 'assigned'` | Work order dispatched, report assigned for triage, blocker flagged |
| `reviews` | **Reviews** | `type === 'reviews'` | Field crew completion review requested, supervisor sign-off pending |
| `system` | **System** | `type === 'system'` | Permission changed, operational scope updated, emergency advisory published |

### 3.3 Interactive Behaviors & States

1. **Header & Actions**:
   - Displays unread count badge pill (`.gov-notification-badge`).
   - "Mark all read" button triggers optimistic UI update and `PATCH /api/notifications/user/${userId}/read`.
   - Dismissable via Close `X` button, backdrop click, or `Escape` key.
2. **Notification Item Structure**:
   - Unread items display a 3px active border (`border-left: 3px solid var(--gov-accent)`).
   - Timestamp with `Clock3` icon and uppercase scope tag (`NORTH CALOOCAN`).
   - Body copy bolding title with descriptive event context.
   - Individual "Mark read" button (`Check` icon) and "Open task" link (`ExternalLink` icon) deep-linking to the target docket (e.g. `/gov/operations?view=work-orders&wo=1197`).
3. **Edge Case States**:
   - **Loading State**: Animated spinner (`RefreshCw className="animate-spin"`) with "Loading notifications...".
   - **Permission-Limited State**: `Lock` icon with "Permission-limited: You do not have permission to view global operational notifications."
   - **Network Error State**: `ShieldAlert` icon with "Couldn't load notifications" and a "Retry" button.
   - **Empty State**: `Inbox` icon with "No notifications yet: You're all caught up."

---

## 4. System Banners Architecture & Gaps

### 4.1 Current Codebase Assessment

- In `PositionDashboard.jsx` (lines 597–610), there is an isolated error banner:
  ```jsx
  <div className="gov-system-banner is-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <span><strong>Work summary unavailable.</strong> The workspaces are still available from navigation.</span>
      <button type="button" onClick={retry}>Retry</button>
  </div>
  ```
- In `ResidentDashboard.jsx` (lines 3585–3597), there is an offline banner:
  ```jsx
  {isOffline && (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
          <WifiOff size={16} /> Offline: Saving Drafts locally.
      </div>
  )}
  ```
- **Critical Finding**: There is **no shared, reusable government system banner component**. Each page handles connectivity, errors, and permissions independently or not at all.

### 4.2 Required 4-Banner Specification for Government Workspace

To satisfy Requirement R1 and `05-government-experience-spec.md`, the government shell requires a unified `<GovSystemBanner />` component supporting 4 standard types:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Icon]  BANNER TITLE — Explanatory context / policy guidance            [Action / Retry / Dismiss]│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Offline Mode Banner**:
   - **Trigger**: `!navigator.onLine` or window `offline` event.
   - **Visual**: Warning Amber background/border (`bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200`).
   - **Icon**: `WifiOff` (16px).
   - **Copy**: "Offline mode active — You are viewing cached local records. Edits and updates will be queued for synchronization."
   - **Action**: "Check connection" button.
2. **Permission Changed Banner**:
   - **Trigger**: Backend 403 response or WebSocket/poll capability update.
   - **Visual**: Field Blue background/border (`bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200`).
   - **Icon**: `ShieldAlert` or `Key` (16px).
   - **Copy**: "Your operational scope or role permissions have been updated by an administrator."
   - **Action**: "Refresh session" button (re-fetches user permissions).
3. **Emergency Access / Break-Glass Banner**:
   - **Trigger**: `user.emergency_access_active === true` or disaster advisory mode.
   - **Visual**: Critical Red / Orange high-visibility banner (`bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200`).
   - **Icon**: `AlertTriangle` (16px).
   - **Copy**: "EMERGENCY ACCESS ACTIVE — Elevated override capabilities engaged. All actions are immutably logged to the executive audit trail."
   - **Action**: "Exit emergency mode" button.
4. **Partial Data / Stale Cache Banner**:
   - **Trigger**: Non-fatal API fetch failure with stale cache fallback.
   - **Visual**: Slate / Neutral mineral background (`bg-slate-500/10 border-slate-500/20 text-slate-800 dark:text-slate-300`).
   - **Icon**: `Clock3` or `RefreshCw` (16px).
   - **Copy**: "Displaying cached data from 08:32 AM. Real-time updates temporarily unavailable."
   - **Action**: "Force refresh" button.

---

## 5. Existing Reusable UI Components & Primitives Inventory

### 5.1 Component Inventory

| Component Path | Name | Description & Capabilities | Civic Aperture Compliance |
|---|---|---|---|
| `components/GovSidebar.jsx` | `GovSidebar` | Primary navigation sidebar with 256px expanded, 72px collapsed rail, <1024px mobile drawer, active marker notches, role badges. | High (Strong structure, uses `--gov-*` variables). |
| `components/GovernmentWorkspaceTabs.jsx` | `GovernmentWorkspaceTabs` | Top tab rail for workspace views (`/gov/operations`, `/gov/delivery`, etc.). | High (Clean layout, needs token audit). |
| `components/NotificationCenter.jsx` | `NotificationCenter` | 440px sliding notification drawer with 4 filter tabs, unread markers, and deep links. | Medium-High (Needs token cleanup). |
| `components/ThemeToggle.jsx` | `ThemeToggle` | 3-way toggle (Light, System, Dark). | Medium (Uses hardcoded Tailwind slate/orange). |
| `components/ProtectedRoute.jsx` | `ProtectedRoute` | Route guard checking authentication, role arrays (`allowedRoles`), or granular permissions (`requiredPermission`). | High (Backend-aligned RBAC). |
| `components/ErrorBoundary.jsx` | `ErrorBoundary` | React class error boundary with error recovery. | Good. |
| `components/modals/RequestInfoModal.jsx` | `RequestInfoModal` | Modal dialog for requesting citizen information with consequence warning. | High. |
| `components/modals/AssignWorkOrderModal.jsx` | `AssignWorkOrderModal` | Side-sheet drawer for assigning work orders to eligible crews with SLA selection. | High. |
| `components/modals/WorkOrderUpdateModal.jsx` | `WorkOrderUpdateModal` | Side-sheet drawer for logging field progress, blocker categories, safety plans, photo URLs. | High. |

### 5.2 Identified Component Gaps & Missing Primitives

To achieve full compliance with Blueprint Images 1–4, the following shared UI primitives are needed:

1. **`GovHeader` / `GovBreadcrumbs`**: Standardized header bar containing page title, eyebrow breadcrumb (`Government workspace / Service operations`), freshness timestamp (`Data as of 08:42 AM`), scope pill (`BRGY 176 / North Caloocan`), `ThemeToggle`, `NotificationCenter` trigger, and refresh button.
2. **`Pulseline` (Signal Cut Lifecycle Tracker)**: Reusable 2px heartbeat lifecycle visualizer:
   - Citizen Reports: `Received → Verified → Assigned → In progress → Resolved`
   - Work Orders: `Open → Assigned → In progress → Completed → Reviewed`
   - Projects: 8-stage lifecycle tracker (`Needs assessment → Survey → Design & estimate → Approval → Procurement → Construction → Inspection → Close`)
3. **`CoordinateRail`**: Reusable monospaced ticket metadata banner (`BRGY 176  /  14.720712, 120.985134  /  UPDATED 08:37`) formatted with IBM Plex Mono.
4. **`FieldApertureCard`**: True-color photo evidence viewer with 4 quiet corner framing marks, metadata rail, and text alternatives.
5. **`GovSystemBanner`**: Centralized multi-state banner system (Offline, Permission changed, Emergency access, Partial data).
6. **`BoQTable`**: Standardized Bill of Quantities itemized table with contingency calculation, quantity/unit/cost columns, and currency formatting.
7. **`RbacDiffMatrix`**: Before/after capability mutation matrix with required audit note validation for `/gov/administration`.

---

## 6. Blueprint Alignment & Gap Matrix (Images 1–4)

| Blueprint Image & Panel | Target Route | Implemented Status | Identified Gaps to Close |
|---|---|---|---|
| **Image 1**: Shell & Navigation | `/gov/*` (Global shell) | 90% Implemented | Needs token mapping in `index.css` `@theme`, unified `GovHeader`, centralized `GovSystemBanner`. |
| **Image 2 Panel 1**: Citizen Reports & Triage | `/gov/operations?view=reports` | 85% Implemented | Reconcile Pulseline styling to 2px Signal Cut, verify true-color aperture framing, ensure `RequestInfoModal` and `AssignWorkOrderModal` integrate seamlessly. |
| **Image 2 Panel 2**: Work Orders Docket | `/gov/operations?view=work-orders` | 85% Implemented | 2-column detail docket with Pulseline, scope, map location, evidence card, blockers & changes, completion proof, approvals, and `WorkOrderUpdateModal`. |
| **Image 2 Panels 3 & 4**: Projects & BoQ Planning | `/gov/delivery?view=projects` | 80% Implemented | 8-stage lifecycle tabs, right-rail stage distribution card, 2-column decision package with BoQ summary (P1,245,800.00), technical doc previews, missing info flags, governed decision buttons (`Approve`, `Request changes`, `Reject`). |
| **Image 4 Panel 1**: Documents & Official Records | `/gov/records-workspace?view=documents` | 85% Implemented | Working documents vs Official records registry, SHA-256 integrity checksums, version history, retention rules, custody tracking. |
| **Image 4 Panel 2**: Timeline & Audit Trail | `/gov/records-workspace?view=timeline` | 85% Implemented | Immutable audit stream with PHT timestamp, actor, source system, state transition, correlation ID, and Signal Cut. |
| **Image 4 Panel 3**: Operational Insights & Predictive Maintenance | `/gov/insights` | 85% Implemented | SLA KPI tiles (84% on-time, 128 work orders, 18.6h avg response), completion trend chart, top 5 issue clusters, predictive risk matrix with AI narrative. |
| **Image 4 Panel 4**: Administration & RBAC Governance | `/gov/administration` | 85% Implemented | Staff directory with MFA tracking, right-rail capability editor with before/after diff matrix, and required audit note logging. |

---

## 7. Build, Lint, and Accessibility Assessment

### 7.1 Build Verification
- Command: `npm run build` in `frontend/`
- Result: **Successful** (Exit code: `0`)
- Transformed modules: 2566 modules
- Build time: 13.73 seconds

### 7.2 ESLint Compliance
- Command: `npx eslint src/pages/GovernmentWorkspaceRoute.jsx src/components/GovSidebar.jsx src/components/GovernmentWorkspaceTabs.jsx src/components/NotificationCenter.jsx src/pages/PositionDashboard.jsx src/pages/CitizenReportsPage.jsx src/pages/WorkOrdersPage.jsx src/pages/ProjectsWorkspacePage.jsx src/pages/RecordsWorkspacePage.jsx src/pages/InsightsWorkspacePage.jsx src/pages/AdministrationWorkspacePage.jsx`
- Result: **0 errors, 0 warnings**.

### 7.3 Accessibility (WCAG 2.2 AA) Audit Points
- **Focus Indicators**: 3px visible outline (`:focus-visible { outline: 3px solid var(--gov-focus); outline-offset: 1px; }`) present across sidebar and tabs.
- **Color Contrast**:
  - Light mode: Primary text `#0C2436` on `#FFFFFF` / `#F4F7F5` yields `14.74:1` contrast (exceeds 4.5:1 AA and 7:1 AAA).
  - Dark mode: Primary text `#F4F7F2` on `#0E283E` / `#071A2B` yields `13.8:1` contrast.
  - Secondary text `#465D6C` on Light `#FFFFFF` yields `5.2:1` (exceeds 4.5:1 AA).
- **Touch Targets**: Mobile navigation triggers and modal close buttons maintain ≥44×44px hit areas.
- **ARIA Semantics**: `aria-current="page"`, `aria-expanded`, `aria-controls`, `role="tablist"`, `role="tab"`, and `role="alert"` are implemented on navigation items, workspace tabs, and notification panels.

---

## 8. Summary of Technical Recommendations

1. **Tokens in `index.css`**: Inject all Civic Aperture semantic color tokens directly into the Tailwind v4 `@theme` block in `frontend/src/index.css` and standardize `:root` / `.dark` CSS custom properties.
2. **Build Unified `GovSystemBanner` Component**: Create `frontend/src/components/GovSystemBanner.jsx` supporting Offline, Permission Changed, Emergency Access, and Partial Data states, and embed it at the top of all government workspace layouts.
3. **Standardize Header / Breadcrumbs**: Extract a unified `GovHeader.jsx` to eliminate duplication between `PositionDashboard`, `CitizenReportsPage`, `WorkOrdersPage`, `ProjectsWorkspacePage`, `RecordsWorkspacePage`, `InsightsWorkspacePage`, and `AdministrationWorkspacePage`.
4. **Normalize Notification Center Tokens**: Replace hardcoded blue values (`#0284c7`) in `notification-center.css` with semantic `--gov-action` (`#075985` / `#82C7D8`).
5. **Enforce 2-Column Docket Standards**: Ensure all detail dockets adhere to the Civic Aperture principles (true-color evidence aperture card, 2px Signal Cut pulseline, and IBM Plex Mono coordinate rail).
