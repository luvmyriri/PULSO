# DISPATCH: Specification & Requirements Miner

## Assigned Role: Specification & Requirements Miner
## Working Directory: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_spec_miner_survey
## Parent: teamwork_preview_orchestrator_2
## Source of Truth: c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md (see ## 2026-09-18T15:00:42Z)

### Objective
Examine all authoritative specifications in:
- `c:\Users\Val\Desktop\PULSO\PRODUCT.md`
- `c:\Users\Val\Desktop\PULSO\docs\ui-ux-audit\09-visual-art-direction-v2.md`
- `c:\Users\Val\Desktop\PULSO\docs\government-system-proposal\09-reconciled-government-implementation-plan.md`
- `c:\Users\Val\Desktop\PULSO\docs\government-system-proposal\10-user-profiling-and-operational-research-framework.md`
- `c:\Users\Val\Desktop\PULSO\AGENTS.md`

### Task
Extract and document the precise requirements, constraints, UI/UX models, data flows, and invariants for the 6 requirements:
1. R1: Role-Aware Daily Operations Hub ("Today") — GovTodayPage.jsx, 5 core leadership metrics, triage feed, dual-sector map (North & South Caloocan), capacity/blocker indicators.
2. R2: Reports Docket & Full Detail Experience — CitizenReportsPage.jsx refactor (non-modal collapsible 48px rail docket vs close), real backend APIs for citizen info request and work order assignment, full-page docket at /gov/reports/:reportId (GovReportDetailPage.jsx).
3. R3: Work Orders, Inspections & Blocker Workflow — GovWorkOrdersPage.jsx (Active, Blocked, Awaiting Verification, Completed), structured blocker reporting (reason codes, estimated delays), independent inspection verification modal (GovInspectionModal.jsx) enforcing separation of duties (Inspector ID != Field Worker ID).
4. R4: Physical Infrastructure Assets Register — Sidebar /gov/assets route, GovAssetsPage.jsx, GovAssetDetailPage.jsx (Roads, Drainage, Bridges, Public Buildings, Facilities), linking historical inspection logs and maintenance work orders. Move capital projects exclusively into Work module.
5. R5: Plain-Language Service Performance & Honest Prediction — GovAnalyticsPage.jsx (plain civic questions), purge synthetic random.randint in predictive_router.py with deterministic rule-based maintenance scoring and time-series demand models.
6. R6: Governed Updates & Announcements Publishing — GovAnnouncementsPage.jsx, GovAnnouncementEditor.jsx, announcements_router.py (Draft -> In Review -> Approved -> Scheduled -> Published -> Expired/Withdrawn, bilingual en/fil, timestamped correction notices, per-channel delivery tracking).

Write your structured findings to:

## 2026-09-18T15:02:54Z
You are the Specification & Requirements Miner for the PULSO government workspace UI implementation.
Your working directory is: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_spec_miner_survey
Read your instructions in c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_spec_miner_survey\DISPATCH.md and the source request in c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md (see section ## 2026-09-18T15:00:42Z).
Also inspect:
- c:\Users\Val\Desktop\PULSO\PRODUCT.md
- c:\Users\Val\Desktop\PULSO\docs\ui-ux-audit\09-visual-art-direction-v2.md
- c:\Users\Val\Desktop\PULSO\docs\government-system-proposal\09-reconciled-government-implementation-plan.md
- c:\Users\Val\Desktop\PULSO\docs\government-system-proposal\10-user-profiling-and-operational-research-framework.md
- c:\Users\Val\Desktop\PULSO\AGENTS.md

Mine and document all requirements, metrics, states, invariants, and data contracts across R1 to R6.
Write your full report to c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_spec_miner_survey\survey_spec_report.md and create your handoff.md.
Notify your parent (teamwork_preview_orchestrator_2) via send_message when complete.

