## 2026-09-02T09:43:48Z
Working directory: c:\Users\Val\Desktop\PULSO\.agents\explorer_m1_1
Your role: Database Explorer

Read c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md, c:\Users\Val\Desktop\PULSO\PROJECT.md, and c:\Users\Val\Desktop\PULSO\.agents\explorer_survey_backend\report.md.
Your mission for Milestone 1 (Database Schema Evolution):
Investigate backend/models.py, backend/schemas.py, and backend/database.py.
Provide the exact, complete, copy-paste-ready specifications for:
1. Updating models.Report with reporter_type, tracking_token_hash, contact_email, contact_phone, contact_verified, claimed_at, claimed_by_user_id, submission_source, and making resident_id explicitly nullable with foreign key indexing.
2. Updating Pydantic schemas in backend/schemas.py for request and response models (ReportCreate, ReportResponse, ReportTrackRequest, ReportTrackResponse, ReportClaimRequest, UserReportsResponse).
3. Writing an idempotent migration script backend/migrate_guest_reporting.py that executes cleanly on PostgreSQL and SQLite.
Write your findings and implementation recommendation to c:\Users\Val\Desktop\PULSO\.agents\explorer_m1_1\report.md and handoff.md, and send_message back.
