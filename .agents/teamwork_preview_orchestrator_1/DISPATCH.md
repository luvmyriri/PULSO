## 2026-08-31T06:56:23+08:00

You are the Project Orchestrator for the PULSO Government operational workspace overhaul and refactor.

### Your Identity & Workspace
- Type: teamwork_preview_orchestrator
- Working Directory: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_orchestrator_1
- Authoritative User Request: Read c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md

### Task Scope & Objectives
Execute the complete frontend overhaul and refactor for the PULSO Government operational workspace in `c:\Users\Val\Desktop\PULSO\frontend`, adhering strictly to the Civic Aperture visual direction, user rules in `c:\Users\Val\Desktop\PULSO\AGENTS.md`, and the user requirements:

1. **R1. Government Workspace Route Architecture & Foundations**:
   - Navigation: `/gov/my-dashboard`, `/gov/operations`, `/gov/delivery`, `/gov/records-workspace`, `/gov/insights`, `/gov/administration`.
   - Civic Aperture design tokens (Ink #132238, Canvas #F7F8FA, Survey Blue #075985, Resident Action #C2410C, Pulse #F97316, Resolved #0F766E, Warning #B45309, Danger #B42318) across Morning Field Sheet (light) and Night Inspection (dark) themes.
   - Sliding Notification Center drawer (All, Assigned, Reviews, System) and system banners (Offline, Permission changed, Emergency access, Partial data).

2. **R2. Operations & Field Dispatch Workspaces**:
   - Citizen Reports & Triage (`/gov/operations?view=reports`): 2px Pulseline lifecycle visualizer, true-color photo aperture card, RequestInfoModal, AssignWorkOrderModal.
   - Work Orders List & Detail Docket (`/gov/operations?view=work-orders`): List view with tabs (Assigned, Active, Blocked, For review, Completed), search/filters, right-rail summary cards; 2-column detail docket with Pulseline, scope, map location, evidence card, blockers & changes, completion proof, approvals, immutable timeline, WorkOrderUpdateModal.

3. **R3. Projects, BoQ & Technical Planning**:
   - Projects List & Delivery (`/gov/delivery?view=projects`): 8-stage lifecycle tabs, search filters, right-rail stage distribution card.
   - Projects Decision Package Docket: 2-column layout with BoQ estimate summary, technical document previews, evidence checklist, missing info flags, required comments, governed decision buttons (Approve, Request changes, Reject).

4. **R4. Records, Audit Trail, Insights & Administration**:
   - Documents & Official Records (`/gov/records-workspace?view=documents`): SHA-256 integrity checksums, version history, retention rules, custody tracking.
   - Timeline & Audit Trail (`/gov/records-workspace?view=timeline`): Immutable audit stream with PHT timestamp, actor, source system, state transition, correlation ID, Signal Cut.
   - Operational Insights & Predictive Maintenance (`/gov/insights`): SLA KPI tiles, completion trend chart, top 5 issue clusters, predictive risk matrix with draft AI narrative.
   - Administration & RBAC Governance (`/gov/administration`): Staff directory with MFA tracking, right-rail capability editor with diff matrix, required audit note logging.

### Acceptance Criteria
- All views, tabs, badges, tables, and dockets adhere strictly to the visual spec and tokens with zero visual deviations.
- Complete functional parity between light and dark themes.
- `npm run build` in `frontend/` builds cleanly with 0 compilation errors.
- `npx eslint` in `frontend/` passes with 0 errors.
- Fully responsive reflow from 1440px to 1024px tablet split-views and mobile navigation drawers.
