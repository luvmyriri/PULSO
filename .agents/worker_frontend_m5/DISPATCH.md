## 2026-09-02T14:42:35Z
You are worker_frontend_m5, implementing Milestone 5 (Frontend Receipt, Public Tracking, Contextual Claiming Modal, and Resident Dashboard Integration).
Your working directory is: `c:\Users\Val\Desktop\PULSO\.agents\worker_frontend_m5`.
Project root: `c:\Users\Val\Desktop\PULSO`.

Relevant Skills to load and use:
- Impeccable: `C:\Users\Val\.gemini\config\skills\impeccable\SKILL.md`
- PULSO Frontend Design: `c:\Users\Val\Desktop\PULSO\.agents\skills\pulso-frontend-design\SKILL.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Authority & Blueprints to read:
- `c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Val\Desktop\PULSO\PROJECT.md`
- `c:\Users\Val\Desktop\PULSO\.agents\spec_miner_frontend\report.md`
- `c:\Users\Val\Desktop\PULSO\.agents\worker_frontend_m3m4\handoff.md`

Target Files (Write Ownership):
- `frontend/src/components/modals/ClaimReportModal.jsx` (Create modal)
- `frontend/src/pages/ResidentDashboard.jsx` (Update status filter tabs & claim modal trigger)
- `frontend/src/pages/ReportSuccessPage.jsx` (Receipt view polish)
- `frontend/src/pages/PublicTrackPage.jsx` (Public tracking polish)
- `frontend/src/locales/en.json`
- `frontend/src/locales/tl.json`

Implementation Requirements:
1. **`ClaimReportModal.jsx`**:
   - Modal allowing an authenticated resident to enter a `Ticket ID` (e.g. `RPT-20260902-8F92E1B4` or numeric ID) and a private `Tracking Token` (e.g. `TRK-XXXX-XXXX-XXXX-XXXX`).
   - Calls `POST /api/reports/{id}/claim` (or parses ID from ticket) with `tracking_token` in body and resident JWT in header.
   - Handles `200 OK` (success, shows confirmation and triggers refresh callback), `403 Forbidden` (invalid tracking token), `409 Conflict` (already claimed by another user), `404 Not Found` (ticket not found).
   - 3px focus rings, accessible dialog semantics (`role="dialog"`, `aria-modal="true"`, focus trap/esc to close), English and Tagalog translations.
2. **`ResidentDashboard.jsx`**:
   - Integrate status filter tabs: `All`, `Active`, `Needs Information`, `Resolved` for the "My Reports" section.
   - Connect to `GET /api/me/reports` (or query reports where `resident_id == user.id OR claimed_by_user_id == user.id`).
   - Display a prominent "Claim a Guest Report" button in the My Reports section header that opens `ClaimReportModal`.
   - Ensure claimed reports display a subtle badge (e.g. "Claimed Ticket").
3. **`ReportSuccessPage.jsx` & `PublicTrackPage.jsx`**:
   - Verify `ReportSuccessPage.jsx` displays Ticket ID, authoritative timestamp, private tracking token, copyable tracking URL, QR code, and actions: `[Track This Report]`, `[Save to My Reports (Claim)]`, and `[Return Home]`.
   - Verify `PublicTrackPage.jsx` loads report via Ticket ID + Code with 6-stage PulseLine progress stepper (`Received` -> `Under Review` -> `Validated` -> `Assigned` -> `In Progress` -> `Resolved/Closed`) and sanitized timeline.
4. **Bilingual Localization & WCAG 2.2 AA**:
   - Ensure all new strings in `ClaimReportModal`, `ResidentDashboard`, `ReportSuccessPage`, and `PublicTrackPage` are present in `en.json` and `tl.json`.
   - Ensure 3px focus rings on all interactive buttons/inputs.

Verification Requirements:
1. Run `npm run build` in `frontend/` (Must build with 0 errors).
2. Verify all components compile and lint cleanly.
3. Write `c:\Users\Val\Desktop\PULSO\.agents\worker_frontend_m5\handoff.md` with complete implementation details, verification commands, and results.
4. Send a message to orchestrator with your completion report.
