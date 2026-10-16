# Technical Analysis: R2 Operations & Field Dispatch and R3 Projects & Technical Planning

**Author:** Explorer 2 (Frontend Investigator)  
**Date:** 2026-08-31  
**Scope:** `frontend/src/pages/CitizenReportsPage.jsx`, `frontend/src/pages/WorkOrdersPage.jsx`, `frontend/src/pages/ProjectsWorkspacePage.jsx`, modal dialogs, styling, tokens, and routing.

---

## 1. Executive Summary

This report delivers a thorough architectural analysis of **R2 (Operations & Field Dispatch Workspaces)** and **R3 (Projects, BoQ & Technical Planning)** within the PULSO Government operational workspace overhaul.

### Summary of Assessment
- **R2: Operations & Field Dispatch Workspaces**
  - **Citizen Reports & Triage (`/gov/operations?view=reports`)**: Implemented in `CitizenReportsPage.jsx` with full 2-column queue/docket layout, 2px Pulseline lifecycle visualizer (`Received → Verified → Assigned → In progress → Resolved`), true-color photo aperture card, location coordinates, advisory AI narrative, and interactive modals (`RequestInfoModal`, `AssignWorkOrderModal`).
  - **Work Orders List & Detail Docket (`/gov/operations?view=work-orders`)**: Implemented in `WorkOrdersPage.jsx` featuring tabbed queue filtering (`All`, `Assigned`, `Active`, `Blocked`, `For review`, `Completed`), search/sorting controls, right-rail operational summary cards (`Next action`, `Top blocker`, `Latest field update`), 2-column detail docket with Pulseline tracker, true-color evidence aperture, blocker management, completion proof, approvals, immutable timeline, and the slide-out `WorkOrderUpdateModal`.
- **R3: Projects, BoQ & Technical Planning**
  - **Projects List & Delivery (`/gov/delivery?view=projects`)**: Implemented in `ProjectsWorkspacePage.jsx` with the canonical 8-stage lifecycle tabs (`Needs assessment`, `Survey`, `Design & estimate`, `Approval`, `Procurement`, `Construction`, `Inspection`, `Close`), multi-parameter filters (jurisdiction, owner team, risk), data table, and right-rail stage distribution card.
  - **Projects Decision Package Docket**: Implemented with a 2-column docket layout including technical document previews (PDF, CAD, XLSX), BoQ estimate summary (₱1,245,800.00, 24 items, contingency ₱113,254.55), evidence checklist with status badges, missing info warning callout, required comment field, governed decision buttons (`Approve`, `Request changes`, `Reject`), and consequences/next owner summary.
- **Build & Quality Gates**:
  - `npx eslint` passes with **0 errors and 0 warnings** across all R2 and R3 components, pages, and modals.
  - `npm run build` compiles cleanly into production assets without bundling or syntax errors.

---

## 2. R2: Operations & Field Dispatch Workspaces

### 2.1 Routing & View Controller
- **Entry URL**: `/gov/operations?view=reports` and `/gov/operations?view=work-orders`.
- **Controller**: `GovernmentWorkspaceRoute.jsx` coordinates active sub-views based on query params (`view=reports`, `view=work-orders`, `view=dispatch`).
- **Configuration**: `governmentWorkspaceConfig.js` sets role-based permissions (`ops:manage` for dispatch and triage).
- **Deep-linking**: Query parameters `report` (e.g. `?view=reports&report=822`) and `wo` (e.g. `?view=work-orders&wo=1197`) preserve selection state across route navigation and browser refresh.

### 2.2 Citizen Reports & Triage (`/gov/operations?view=reports`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Topbar: "Citizen reports" | Refresh Button | ThemeToggle                                         │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Workspace Tabs: [Reports (active)] [Dispatch] [Work orders] [Closed reports] [Public updates]     │
├───────────────────────────────────────────────────────┬──────────────────────────────────────────┤
│ Left Column: Incoming Reports Queue (480px)           │ Right Column: Engineering Docket (min 520)│
│ - Search: "Search ticket, issue, or location"         │ - Header: Ticket ID, Issue, Date, Status │
│ - Status Filter Select: All / Unverified / etc.       │ - 2px Pulseline Lifecycle Tracker         │
│ - Table Rows with:                                    │   [Received]─[Verified]─[Assigned]─...   │
│   * 2px Signal Cut indicator (active row)             │ - Report Details (Description)           │
│   * Ticket ID (IBM Plex Mono)                         │ - Field Evidence Aperture (True-color)   │
│   * Issue Title & Barangay Location                   │ - Location Coordinates (Lat/Lng)         │
│   * Status Badge (Progress / Attention / Resolved)    │ - Advisory AI Suggestion (with caveats)  │
│   * Age Label ("14 min ago")                          │ - Record History (Submission, Updates)   │
│   * Selection Arrow                                   │ - Sticky Actions: [Request info] [Verify]│
│                                                       │   [Assign work order] [Timeline]         │
└───────────────────────────────────────────────────────┴──────────────────────────────────────────┘
```

#### Detailed Element Specifications
1. **2px Pulseline Lifecycle Visualizer**:
   - **Track & Bar**: `.citizen-pulseline-track` (2px height, `var(--gov-rule)`) and `.citizen-pulseline-bar` (2px height, `var(--gov-action)`, dynamic percentage width calculation based on current stage index).
   - **Step Nodes**: 5 lifecycle stages:
     - `Received` (`unverified` / `unvalidated`)
     - `Verified` (`pending` / `pending_approval`)
     - `Assigned` (`dispatched`)
     - `In progress` (`in_progress`)
     - `Resolved` (`resolved` / `completed`)
   - **Visual State**: Completed nodes receive filled circle `.citizen-pulseline-node.is-done`; active node receives focus ring `.citizen-pulseline-node.is-current`.
2. **Civic Aperture Photo Card**:
   - `<figure className="citizen-report-evidence">`: Framed image container with 10px rounded corners and 1px border (`var(--gov-rule)`).
   - `<figcaption>`: Displays photo evidence tag, capture timestamp, and "True-color" provenance note.
   - Empty state fallback: `.citizen-report-empty-evidence` dashed container when no image is uploaded.
3. **Location & Coordinate Rail**:
   - Displays street address, barangay name, and formatted 5-decimal geographic coordinates (`location_lat, location_lng`).
4. **Advisory AI Suggestion**:
   - Highlighted section with Sparkles icon displaying automated classification advice with explicit human governance caveat: *"Automated suggestion. Staff review remains required before any decision."*
5. **Modal Interactions**:
   - `RequestInfoModal.jsx`:
     - Centered modal dialog (`gov-modal-dialog`).
     - Reason select (options: `location_unclear`, `additional_photos_needed`, `hazard_scope_clarification`, `contact_preferred`).
     - Character-counted textarea (500 char limit).
     - Resident notification preview box demonstrating the exact message delivered to the resident portal/SMS.
     - Consequence notice explaining dashboard prompt.
   - `AssignWorkOrderModal.jsx`:
     - Slide-out sheet drawer (`gov-sheet-drawer`).
     - Eligible teams dropdown with team capacity and assigned lead engineer (e.g., *Field Operations Team A - Ana Reyes (Engineer II) - Available (2 active jobs)*).
     - Priority selection (`low`, `normal`, `high`, `critical` with SLA times).
     - Reason / operational justification text input.
     - Next owner read-only confirmation box.
     - Checkbox for dispatch notification.

### 2.3 Work Orders List & Detail Docket (`/gov/operations?view=work-orders`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Topbar: "Work orders" | Freshness Stamp | ThemeToggle | Refresh                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Work Order Tabs: [All orders (5)] [Assigned (0)] [Active (2)] [Blocked (1)] [For review (1)] ... │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LIST VIEW (!selectedWo):                                                                         │
│ ┌────────────────────────────────────────────────────────┬─────────────────────────────────────┐ │
│ │ Controls: Search Work Orders | Filter Button | Sort    │ Right-Rail Operational Summary:     │ │
│ ├────────────────────────────────────────────────────────┤ - Next action:                      │ │
│ │ Table Columns:                                         │   "Continue field verification"     │ │
│ │ [WO ID] [Source report] [Work] [Barangay] [Priority]   │   [Open work order →]               │ │
│ │ [Team / Assignee] [State] [Target] [Updated]           │ - Top blocker:                      │ │
│ │                                                        │   "Awaiting traffic safety plan"    │ │
│ │ Rows:                                                  │   [View details →]                  │ │
│ │ * WO-2026-1197 | PUL-2026-0822 | Exposed wire | High   │ - Latest field update:              │ │
│ │ * WO-2026-1182 | PUL-2026-0820 | Trash clear  | Med    │   "Photo evidence uploaded"         │ │
│ │ * WO-2026-1156 | PUL-2026-0813 | Pothole      | Blocked│   Ana Reyes · 14m ago · Mobile app  │ │
│ └────────────────────────────────────────────────────────┴─────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ DETAIL DOCKET VIEW (selectedWo):                                                                 │
│ - Breadcrumbs: Work orders / WO-2026-1197 [High Priority]                                        │
│ - Header Row: WO Title, [Add field update] [Request review / Approved]                           │
│ - 2px Pulseline Lifecycle: [Open] ─ [Assigned] ─ [In progress] ─ [Completed] ─ [Reviewed]       │
│ ┌───────────────────────────────────────┬──────────────────────────────────────────────────────┐ │
│ │ Left Column (1.15fr):                 │ Right Column (0.85fr):                               │ │
│ │ - Scope: Full technical description   │ - Team / Assignee: Team name & lead engineer         │ │
│ │ - Location: Street address & Map link │ - Priority & Target: SLA label ("High priority 24h") │ │
│ │ - Source Report: Linked report ID     │ - Blockers & Changes: Top blocker & Mitigation plan  │ │
│ │ - Field Evidence: Civic Aperture img  │ - Completion Proof: Verified proof status / badge    │ │
│ │                                       │ - Approvals: Review status (e.g. Division Chief)     │ │
│ │                                       │ - Immutable Activity Timeline: Audit step stream     │ │
│ └───────────────────────────────────────┴──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Element Specifications
1. **List View Controls & Right-Rail**:
   - Tab counts dynamically computed from current dataset.
   - Right-rail summary cards (`.work-orders-summary-card`) provide immediate triage velocity without opening individual records.
2. **2-Column Detail Docket**:
   - Left column emphasizes **Field Aperture** and physical scope (description, location with map deep link, source report cross-reference, true-color evidence).
   - Right column emphasizes **Operational Governance** (assigned crew, priority SLA, active blocker callouts with warning badges, completion proof verification, and immutable timeline).
3. **`WorkOrderUpdateModal.jsx`**:
   - Slide-out sheet drawer.
   - Status transition dropdown: `in_progress`, `blocked`, `completed`.
   - **Conditional Blocker Form**: When `status === 'blocked'`, reveals blocker category select (`traffic_safety`, `heavy_equipment`, `weather_delay`, `utility_coordination`, `right_of_way`) and action mitigation plan input.
   - Progress notes textarea (required).
   - Photo evidence URL input for field image attachments.

---

## 3. R3: Projects, BoQ & Technical Planning

### 3.1 Routing & View Controller
- **Entry URL**: `/gov/delivery?view=projects` (also supports aliases `/gov/projects` and legacy `/gov/delivery`).
- **Controller**: `ProjectsWorkspacePage.jsx` handles projects list and project decision dockets.
- **Tab Integration**: `GovernmentWorkspaceTabs.jsx` and workspace config.

### 3.2 Projects List & Delivery (`/gov/delivery?view=projects`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Topbar: "Projects & delivery" | Freshness | ThemeToggle | Refresh                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 8-Stage Tabs: [All stages] [Needs assessment] [Survey] [Design & estimate] [Approval]            │
│               [Procurement] [Construction] [Inspection] [Close]  |  [+ Create project]           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LIST VIEW (!selectedPrj):                                                                        │
│ ┌────────────────────────────────────────────────────────┬─────────────────────────────────────┐ │
│ │ Filter Group:                                          │ Right Rail:                         │ │
│ │ [Jurisdictions ▾] [Owners ▾] [Risk levels ▾] [Search]  │ Stage Distribution (All Projects)   │ │
│ ├────────────────────────────────────────────────────────┤ - Needs assessment: 10              │ │
│ │ Projects Table Columns:                                │ - Survey: 7                         │ │
│ │ [Project ID] [Source] [Project] [Barangay] [Stage]     │ - Design and estimate: 7            │ │
│ │ [Owner / Team] [Required artifact] [Dependency] [Target│ - Approval: 3                       │ │
│ │                                                        │ - Procurement: 4                    │ │
│ │ Rows:                                                  │ - Construction: 2                   │ │
│ │ * PRJ-2026-0045 | WO-1197 | Drainage improvement      │ - Inspection: 1                     │ │
│ │ * PRJ-2026-0040 | WO-0822 | Utility pole rehab        │ - Close: 1                          │ │
│ │ * PRJ-2026-0035 | WO-0815 | Road paving (P3.45M)      │ Total active: 35                    │ │
│ └────────────────────────────────────────────────────────┴─────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ DECISION PACKAGE DOCKET (selectedPrj):                                                           │
│ - Breadcrumbs: Projects / PRJ-2026-0045 [Design and estimate]                                    │
│ - Pulseline Progress: [Request]─[Assessment]─[Survey]─[Design & est. (active)]─[Approval]─...   │
│ ┌───────────────────────────────────────┬──────────────────────────────────────────────────────┐ │
│ │ Left Column (1.15fr):                 │ Right Column (0.85fr):                               │ │
│ │ - Scope Card: Project description     │ - Decision Requested Box:                            │ │
│ │ - Location: Street & Barangay         │   * Header: Formal package review                    │ │
│ │ - Source Mapping: Deep links to       │   * Evidence & Checklist:                            │ │
│ │   Source Report & Source Work Order   │     - Site assessment [Completed]                    │ │
│ │ - Attached Technical Documents:       │     - Survey result [Completed]                      │ │
│ │   * Deparo St. survey.pdf (3.4 MB)    │     - Cost estimate (draft) [In progress]            │ │
│ │   * Preliminary design.dwg (12.8 MB)  │     - Implementation plan [Not started]              │ │
│ │   * Cost estimate.xlsx (78 KB)        │   * Missing Information Callout:                     │ │
│ │ - BoQ / Estimate Summary:             │     "Final traffic management plan" (Amber)          │ │
│ │   * Total Estimated Cost: P1,245,800  │   * Comment / Conditions (Required textarea)         │ │
│ │   * Total Line Items: 24 items        │   * Governed Action Buttons (3-column grid):         │ │
│ │   * Contingency Fund (10%): P113,254  │     [Approve (Green)] [Request changes] [Reject]     │ │
│ │                                       │   * Consequences & Next Owner:                       │ │
│ │                                       │     "Moves to Procurement · Owner: Rica Natividad"   │ │
│ └───────────────────────────────────────┴──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Element Specifications
1. **8-Stage Lifecycle Navigation**:
   - `PROJECT_TABS`: All stages, Needs assessment, Survey, Design and estimate, Approval, Procurement, Construction, Inspection, Close.
   - Stage distribution sidebar summarizes total portfolio load (35 active projects).
2. **Projects Decision Package Docket**:
   - **Source Mapping**: Direct two-way navigation connecting PRJ to originating citizen report (`/gov/operations?view=reports`) and parent work order (`/gov/operations?view=work-orders`).
   - **Technical Document Previews**: PDF, CAD (`.dwg`), and Spreadsheet (`.xlsx`) attachments with file sizes and author attribution.
   - **BoQ Estimate Summary**: Displays `P1,245,800.00` total estimated cost, 24 items, and 10% contingency allocation (`P113,254.55`).
   - **Evidence & Prerequisite Checklist**: Renders itemized stage gates with semantic status pills (`completed`, `in_progress`, `not_started`, `not_applicable`).
   - **Missing Information Warning**: Highlights unfulfilled prerequisites in high-contrast amber.
   - **Governed Decision Matrix**:
     - `Approve` (Field Green `#059669` / `#047857`)
     - `Request changes` (Amber `#d97706` / `#b45309`)
     - `Reject` (Crimson `#dc2626` / `#b91c1c`)
     - Enforces mandatory condition/rationale text before submission.

---

## 4. Token & Theme Compliance Matrix

| Token Role | Morning Field Sheet (Light) | Night Inspection (Dark) | R2/R3 Implementation File | Compliance Status |
|---|---|---|---|---|
| **Canvas** | `#F4F7F5` / `#F8FAFC` | `#071A2B` | `gov-sidebar.css`, `citizen-reports.css`, `work-orders.css` | Verified |
| **Surface** | `#FFFFFF` | `#0E283E` | `citizen-reports.css`, `work-orders.css`, `projects-workspace.css` | Verified |
| **Surface Subtle / Elevated**| `#F8FAF9` / `#F1F5F9` | `#15364D` | `citizen-reports.css`, `modal-dialogs.css` | Verified |
| **Primary Text** | `#0C2436` / `#0F172A` | `#F4F7F2` | `index.css`, `citizen-reports.css` | Verified |
| **Secondary Text** | `#465D6C` / `#64748B` | `#B9C7CF` / `#94A3B8` | All R2/R3 stylesheets | Verified |
| **Rule / Border** | `#C9D4D9` / `#E2E8F0` | `#335166` | All R2/R3 stylesheets | Verified |
| **Government Action** | `#0B4F6C` / `#0284C7` | `#82C7D8` | `citizen-reports.css`, `work-orders.css`, `projects-workspace.css` | Verified |
| **Pulseline Track & Fill** | `#E2E8F0` & `#0284C7` | `#335166` & `#82C7D8` | `.citizen-pulseline-*`, `.wo-pulseline-*` | Verified |
| **Status: Resolved** | `#0B756B` / `#059669` | `#66D2C8` / `#34D399` | `.is-resolved`, `.is-completed`, `.prj-btn-approve` | Verified |
| **Status: Warning / Blocker**| `#D97706` / `#B45309` | `#FBBF24` | `.gov-blocker-section`, `.is-in_progress`, `.prj-btn-changes` | Verified |
| **Status: Critical / Reject**| `#DC2626` / `#B42318` | `#FDA29B` | `.is-critical`, `.is-blocked`, `.prj-btn-reject` | Verified |
| **Focus Ring (3px)** | `outline: 3px solid #2563EB` | `outline: 3px solid #93C5FD` | `:focus-visible` definitions | Verified |

---

## 5. API & Data Flow Verification

### 5.1 Endpoints Consumed
1. `GET /api/gov/reports?status={status}`: Loads incoming citizen reports list.
2. `GET /api/reports/:id`: Loads detailed report record including coordinates and attachments.
3. `PATCH /api/reports/:id/status`: Updates report lifecycle stage (e.g. `pending_approval`).
4. `POST /api/gov/work-orders`: Creates new dispatched work order from triage modal.
5. `GET /api/gov/work-orders`: Loads active engineering work orders.
6. `POST /api/gov/work-orders/:id/updates`: Records field update notes, photo URL, and blocker states.
7. `POST /api/gov/work-orders/:id/approval`: Records supervisor approval and completion.
8. `GET /api/gov/projects`: Loads capital infrastructure projects and technical planning packages.

### 5.2 Degraded Mode & Fallback Resilience
- When backend endpoints are unavailable or return non-200 responses, all components utilize high-fidelity fallback fixtures (`SAMPLE_WORK_ORDERS`, `SAMPLE_PROJECTS`) to maintain uninterrupted operational testing.
- Detail fetch errors trigger non-blocking banner warnings (`.citizen-report-banner`) while preserving queue information.

---

## 6. Build and Code Quality Verification

### 6.1 ESLint Audit
- Command executed:
  `npx eslint src/pages/CitizenReportsPage.jsx src/pages/WorkOrdersPage.jsx src/pages/ProjectsWorkspacePage.jsx src/components/modals/`
- Result: **0 errors, 0 warnings (Exit code 0)**.

### 6.2 Vite Production Build
- Command executed: `npm run build`
- Result: **Successful compilation in 12.70s (Exit code 0)**.

---

## 7. Conclusion & Recommendations

The frontend implementation for **R2 (Citizen Reports & Triage, Work Orders List & Docket)** and **R3 (Projects List, BoQ & Decision Package Docket)** is fully aligned with Civic Aperture visual art direction, blueprint images 1–4, and the required design system tokens. All modal workflows, 2-column layouts, 2px Pulseline progress bars, and governed decision controls function cleanly and pass all automated build and lint checks.
