# Original User Request

## 2026-09-02T09:26:00Z

Implement the revised open public reporting and contextual authentication architecture for PULSO in Caloocan City, enabling anonymous/guest public reporting without prior account registration while preserving full GIS mapping, AI triage, staff operations, and contextual post-reporting account linking.

Working directory: `c:\Users\Val\Desktop\PULSO`
Integrity mode: development

---

## Requirements

### R1. Backend Domain & Database Schema Evolution
- Update database models and migrations so reports support both authenticated (`user_id = UUID/int`) and guest (`user_id = NULL`) submissions.
- Add fields for guest tracking: `reporter_type` ('guest' | 'registered'), `tracking_token_hash` (cryptographically salted/hashed; never stored in plaintext), `contact_email`, `contact_phone`, `contact_verified`, `claimed_at`, `claimed_by_user_id`, and `submission_source`.
- Preserve existing report relations, foreign keys, AI triage fields, and audit history.

### R2. Open Guest & Authenticated Reporting API
- Refactor `POST /api/reports` (or dedicated endpoint) to allow unauthenticated submissions with full input validation, file upload validation (MIME, size, type), and server-side rate limiting.
- Return public `report_id`, server-generated timestamp, lifecycle status (`received`), and a single-use/secure plaintext `tracking_token` (while storing its hash).
- Ensure guest reports enter the exact same Geospatial AI Triage pipeline and staff dispatch queue as authenticated reports with equal operational priority.

### R3. Secure Guest Tracking & Public Status API
- Implement public tracking endpoint (`POST /api/reports/track` or tokenized lookup) requiring Report ID + Private Tracking Code (or secure token).
- Return public-safe lifecycle history (`Received` → `Under Review` → `Validated` → `Assigned` → `In Progress` → `Resolved` → `Closed`) and generalized location without leaking reporter identity, contact info, staff notes, internal AI reasoning, or private evidence.

### R4. Contextual Account Registration & Secure Report Claiming
- Implement secure claim endpoint (`POST /api/reports/{id}/claim`) requiring authentication plus proof of ownership (matching tracking token or verified contact OTP).
- Link claimed guest reports to the authenticated user account with immutable audit logging (`claimed_at`, `claimed_by_user_id`).

### R5. Authenticated "My Reports" & Unified Management
- Implement/update `GET /api/me/reports` and resident dashboard views to display all reports owned or claimed by the user with filter states (`All`, `Active`, `Resolved`, `Needs Information`).

### R6. Redesigned Public Landing & Open Reporting Experience
- Update landing page hero and navigation hierarchy with primary CTA "Report an Issue" + microcopy "No account required", secondary CTA "Track a Report", and separated Staff Gateway.
- Implement guided 7-step reporting flow: Issue Type, Location (Caloocan map & boundaries), Evidence upload, Details, Optional Contact preferences, Review, and Submission.
- Include emergency warning banner for immediate life/safety threats prior to submission.
- Provide interactive duplicate report awareness ("This may already have been reported" with options to add evidence or submit new).

### R7. Receipt & Tracking Frontend Views
- Build high-trust `/report/success` receipt view displaying Report ID, authoritative timestamp, private tracking token, copyable tracking URL, and actions: `[Track This Report]`, `[Save to My Reports]`, and `Continue without an account`.
- Build public `/track` view allowing tracking via Report ID + Code with visual stage progress, safe public updates, and WCAG 2.2 AA accessibility.

---

## Acceptance Criteria

### Backend & Database
- [ ] Database migration executes cleanly against PostgreSQL/SQLite; `user_id` is nullable on reports table.
- [ ] Submitting a report without authorization header succeeds, creates DB record with `reporter_type='guest'`, stores hashed token, and returns plaintext tracking token in response.
- [ ] Tracking query with valid Report ID + correct tracking code returns 200 OK with sanitized public metadata; invalid code or nonexistent ID returns safe 404/403 without enumeration leakage.
- [ ] Attempting to claim a report with wrong tracking token fails (403 Forbidden); claiming with valid token successfully sets `claimed_by_user_id` and appears in user's `/api/me/reports`.
- [ ] Server rate limits and payload validation reject malicious/oversized uploads and rapid spam submissions.

### Frontend & UX
- [ ] First viewport of landing page shows "Report an Issue" with "No account required" subtext; clicking it immediately opens the reporting workflow without redirecting to `/login` or `/register`.
- [ ] Guest reporting workflow successfully uploads evidence, pins Caloocan location, accepts optional contact info, and submits report.
- [ ] Post-submission receipt displays `PULSO-XXXXXX` ticket ID and allows copy/download of private tracking credentials.
- [ ] `/track` page successfully loads public report lifecycle when provided with ticket ID and tracking code.
- [ ] "Save to My Reports" allows user to register or sign in and claims the submitted ticket seamlessly.
- [ ] Authenticated dashboard `/dashboard` shows claimed and user-created reports under "My Reports" with tabs (`All`, `Active`, `Resolved`, `Needs Information`).
- [ ] All forms and views pass keyboard navigation, 3px focus indicators, bilingual English/Filipino parity, and WCAG 2.2 AA contrast standards.
- [ ] `npm run build` in `frontend/` builds with 0 errors.

## 2026-09-18T15:00:42Z

Implement the full PULSO government workspace UI across all target modules (Today, Reports Polish & Full Detail, Work Orders & Inspections, Physical Infrastructure Assets, Plain-Language Service Performance, and Updates & Announcements) along with necessary supporting backend endpoints, matching the sleek, easy-to-understand, non-AI-slop visual standard established in the Citizen Reports module (`CitizenReportsPage.jsx`), strictly adhering to Civic Aperture v0.2 and Impeccable operate-mode craft.

Working directory: `C:\Users\Val\Desktop\PULSO`  
Branch: `Initial-Defense-PULSO-Refractors`  
Integrity mode: development  

Reference Specifications:
- `PRODUCT.md`
- `docs/ui-ux-audit/09-visual-art-direction-v2.md`
- `docs/government-system-proposal/09-reconciled-government-implementation-plan.md`
- `docs/government-system-proposal/10-user-profiling-and-operational-research-framework.md`

## Requirements

### R1. Role-Aware Daily Operations Hub ("Today")
Build a centralized daily dashboard (`GovTodayPage.jsx`) displaying five core leadership metrics (Unassigned Concerns, Overdue Actions, Awaiting Verification, Open High-Priority, Resolved in Period), an actionable "Needs Attention" triage feed with direct execution links, a dual-sector map overview (North and South Caloocan), and capacity/blocker indicators by team.

### R2. Reports Docket & Full Detail Experience
Refactor `CitizenReportsPage.jsx` to feature a non-modal collapsible right-side engineering docket with distinct Collapse (compact 48 px rail preserving filters, selection, and map) vs. Close (clearing selection) actions. Connect real backend APIs for requesting citizen information and assigning work orders (eliminating mock toasts). Implement the dedicated full-page engineering docket at route `/gov/reports/:reportId` (`GovReportDetailPage.jsx`) with context-preserving back navigation.

### R3. Work Orders, Inspections & Blocker Workflow
Update the Work module (`GovWorkOrdersPage.jsx`) with distinct operational views (Active, Blocked, Awaiting Verification, Completed), structured blocker reporting (reason codes, estimated delays), and an independent inspection verification modal (`GovInspectionModal.jsx`) that enforces separation of duties (preventing field workers from self-approving their own work).

### R4. Physical Infrastructure Assets Register
Re-route the sidebar `Assets` link to `/gov/assets` and implement a dedicated municipal physical asset register (`GovAssetsPage.jsx`, `GovAssetDetailPage.jsx`) categorizing infrastructure into Roads, Drainage, Bridges, Public Buildings, Facilities, linking each asset to historical inspection logs and maintenance work orders. Move capital projects exclusively into the Work module.

### R5. Plain-Language Service Performance & Honest Prediction
Refactor the analytics interface (`GovAnalyticsPage.jsx`) to lead with plain civic questions (*Are we keeping up?*, *Where are concerns recurring?*, *Which work is delayed?*, *What should we inspect next?*). Purge all synthetic `random.randint` number generation from `predictive_router.py` and replace with deterministic rule-based maintenance scoring and time-series demand models evaluated against historical baselines.

### R6. Governed Updates & Announcements Publishing
Implement the Updates & Announcements module (`GovAnnouncementsPage.jsx`, `GovAnnouncementEditor.jsx`, `announcements_router.py`) supporting the complete multi-stage publishing lifecycle (`Draft → In Review → Approved → Scheduled → Published → Expired/Withdrawn`), dual-language English/Filipino drafting, visible timestamped correction notices, and per-channel delivery tracking.

## Acceptance Criteria

### Visual & Impeccable Craft
- [ ] Visual styling across all modules matches the sleek, minimal, quiet aesthetic of `CitizenReportsPage.jsx` with Civic Aperture v0.2 foundations (Morning Field Sheet in light, Night Inspection in dark).
- [ ] No generic SaaS templates, no glass, neon, gradient clutter, decorative telemetry, or artificial KPI gauges.
- [ ] Visible 3 px focus rings, WCAG 2.2 AA contrast compliance in light and dark modes, and full keyboard navigation.
- [ ] 320 px viewport reflow and 200% zoom support without horizontal layout breaks.

### Functional Truth & Integrity
- [ ] Zero mock fallbacks: all numbers, lists, and statuses derive from authoritative server data or display explicit empty/error banners.
- [ ] No synthetic `random` numbers in `predictive_router.py`.
- [ ] Field execution and independent verification enforce strict separation of duties (Inspector ID ≠ Field Worker ID).
- [ ] All existing automated test suites pass, and newly added routes have corresponding unit/component tests.

