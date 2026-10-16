## 2026-09-02T09:48:08Z
Working directory: c:\Users\Val\Desktop\PULSO\.agents\worker_m1
Your role: Worker (Milestone 1 Implementation)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You own these files exclusively:
- backend/models.py
- backend/schemas.py
- backend/auth.py
- backend/migrate_guest_reporting.py
- backend/tests/test_milestone1_schema_security.py

Tasks:
1. Read the explorer reports:
   - c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md
   - c:\Users\Val\Desktop\PULSO\PROJECT.md
   - c:\Users\Val\Desktop\PULSO\.agents\explorer_m1_1\report.md
   - c:\Users\Val\Desktop\PULSO\.agents\explorer_m1_2\report.md
   - c:\Users\Val\Desktop\PULSO\.agents\explorer_m1_3\report.md
2. Update backend/models.py:
   - Update `Report` model to make `resident_id` explicitly nullable with foreign key indexing.
   - Add 8 guest tracking columns: `reporter_type`, `tracking_token_hash`, `contact_email`, `contact_phone`, `contact_verified`, `claimed_at`, `claimed_by_user_id`, `submission_source`.
   - Add relationship `claimed_by = relationship("Resident", foreign_keys=[claimed_by_user_id], backref="claimed_reports")`.
3. Update backend/schemas.py:
   - Update Pydantic schemas: `ReportBase`, `ReportCreate`, `ReportResponse`, `PublicTimelineItem`, `ReportTrackRequest`, `ReportTrackResponse`, `ReportClaimRequest`, `ReportClaimResponse`, `UserReportsResponse`.
4. Update backend/auth.py (or backend/utils/security.py):
   - Add `generate_tracking_token() -> str` (returning formatted `TRK-XXXX-XXXX-XXXX-XXXX`).
   - Add `hash_tracking_token(token: str) -> str` (HMAC-SHA256 with normalization).
   - Add `verify_tracking_token(provided_token: str, stored_hash: str) -> bool` (constant-time verification).
   - Add `get_optional_current_user(...) -> Optional[Union[models.Official, models.Resident]]`.
5. Create and execute database migration backend/migrate_guest_reporting.py:
   - Must be idempotent and support both PostgreSQL and SQLite. Run the migration and verify table schema.
6. Create and run backend unit tests backend/tests/test_milestone1_schema_security.py:
   - Run the test suite and ensure 100% tests pass.
7. Write a detailed handoff report to c:\Users\Val\Desktop\PULSO\.agents\worker_m1\handoff.md documenting all modified files, migration results, and passing test results. Then notify the orchestrator via send_message.
