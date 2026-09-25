## 2026-09-02T14:55:00Z
You are worker_frontend_fix, performing targeted remediation for Frontend Milestones 3, 4, and 5 based on Reviewer and Challenger feedback.
Your working directory is: `c:\Users\Val\Desktop\PULSO\.agents\worker_frontend_fix`.
Project root: `c:\Users\Val\Desktop\PULSO`.

Relevant Skills to load and use:
- Impeccable: `C:\Users\Val\.gemini\config\skills\impeccable\SKILL.md`
- PULSO Frontend Design: `c:\Users\Val\Desktop\PULSO\.agents\skills\pulso-frontend-design\SKILL.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Review Feedback to Read:
- `c:\Users\Val\Desktop\PULSO\.agents\challenger_frontend_2\handoff.md`
- `c:\Users\Val\Desktop\PULSO\.agents\challenger_frontend_1\handoff.md`
- `c:\Users\Val\Desktop\PULSO\.agents\reviewer_frontend_2\handoff.md`
- `c:\Users\Val\Desktop\PULSO\.agents\reviewer_frontend_1\handoff.md`

Required Changes:
1. **Fix `ClaimReportModal.jsx` (`frontend/src/components/modals/ClaimReportModal.jsx`)**:
   - Change import on line 2 to:
     `import { motion, AnimatePresence } from 'framer-motion';`
   - Verify modal renders cleanly without `ReferenceError: motion is not defined`.
2. **Fix `ResidentDashboard.jsx` (`frontend/src/pages/ResidentDashboard.jsx`)**:
   - Ensure `History`, `Activity`, and all other used Lucide icons are imported from `'lucide-react'`.
   - Ensure focus visible styling (`focus-visible:ring-3 focus-visible:ring-offset-2`) is present on interactive buttons.
3. **Fix `Step2LocationMap.jsx` (`frontend/src/components/report-wizard/Step2LocationMap.jsx`)**:
   - Fix preset coordinate for "Deparo / 168" on line 164 to `lat: 14.7380, lng: 121.0200` (within Caloocan bounds).
4. **Bilingual Parity (`frontend/src/locales/en.json` & `frontend/src/locales/tl.json`)**:
   - Add all 36 missing translation keys documented in `reviewer_frontend_2/handoff.md` to both `en.json` and `tl.json`.
5. **Verification**:
   - Run `npm run build` in `frontend/` (0 errors).
   - Run challenger tests: `node frontend/test-empirical-all.mjs` and SSR/DOM test in `frontend/test-challenger-m2-ssr-dom.mjs` (or create and run).
   - Write `c:\Users\Val\Desktop\PULSO\.agents\worker_frontend_fix\handoff.md`.
   - Send message to orchestrator with your completion report.
