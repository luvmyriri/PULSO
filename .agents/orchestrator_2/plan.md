# Orchestrator Gen 2 Plan

## Objective
Deliver the complete PULSO Open Public Reporting and Contextual Authentication architecture across all remaining milestones (M2 through M6), ensuring 100% test pass rate, clean forensic audits, and flawless build verification.

## Step-by-Step Execution Plan

### Step 1: Milestone 2 Verification Gate
- Dispatch verification team for Milestone 2:
  - Reviewer 1 (`reviewer_m2_1_g2`): Correctness, contract conformance, security reviews.
  - Reviewer 2 (`reviewer_m2_2_g2`): Error handling, anti-enumeration, rate-limiting, edge cases.
  - Challenger 1 (`challenger_m2_1_g2`): Empirical stress tests, concurrency, token verification fuzzing.
  - Challenger 2 (`challenger_m2_2_g2`): Boundary, upload security, MIME attacks, boundary bypass.
  - Forensic Auditor (`auditor_m2_1_g2`): Anti-tamper, zero plaintext verification, constant-time validation.
- Evaluate Gate in `GATE_STATUS.md`.

### Step 2: Milestone 3 & Milestone 4 (Frontend Intake & Reporting Flow)
- Dispatch Explorers & Workers for:
  - Landing page redesign (`Landing.jsx`, `ResidentCinematicHero.jsx`), routes registration in `App.jsx`, staff gateway separation.
  - Guided 7-Step Reporting Flow (`ReportWizardPage.jsx`): Category Grid, Emergency Warning Banner, Caloocan Map & Jurisdictional Boundary Check, Evidence Upload with Advisory AI scan, Duplicate Report Proximity Alert, Contact Preferences, Review & Submission.
- Run Reviewers, Challengers, and Forensic Auditor for M3 & M4.
- Evaluate Gate.

### Step 3: Milestone 5 (Receipt, Public Tracking & Authenticated Dashboard)
- Dispatch Workers for:
  - Ticket Receipt View (`ReportSuccessPage.jsx`) with tracking token, copy link, QR code, claim link.
  - Public Tracking View (`PublicTrackPage.jsx`) with 6-stage PulseLine Progress Stepper and redacted public timeline.
  - Authenticated Resident Dashboard (`ResidentDashboard.jsx`) status tabs (`All`, `Active`, `Needs Information`, `Resolved`) and `ClaimReportModal.jsx`.
  - Bilingual localization (`en.json`, `tl.json`) and WCAG 2.2 AA accessibility verification (3px focus rings).
- Run Reviewers, Challengers, and Forensic Auditor for M5.
- Evaluate Gate.

### Step 4: Milestone 6 (Final Milestone: E2E Test Suite & Adversarial Hardening)
- Phase 1: Run 100% of E2E test suite (64/64 tests in `test_e2e_open_reporting.py`).
- Phase 2: Dispatch Challengers for Tier 5 adversarial coverage hardening.
- Verify production frontend build `npm run build` with 0 errors.
- Final forensic audit verification across all touched artifacts.
- Synthesize findings and report final completion to parent.
