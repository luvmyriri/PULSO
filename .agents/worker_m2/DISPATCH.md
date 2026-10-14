## 2026-09-02T09:59:54Z

Working directory: c:\Users\Val\Desktop\PULSO\.agents\worker_m2
Your role: Backend Worker (Milestone 2: Endpoints & Routing)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You own these files exclusively:
- backend/main.py
- backend/utils/rate_limiter.py
- backend/crud.py
- backend/tests/test_milestone2_endpoints.py

Tasks:
1. Read the explorer reports:
   - c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md
   - c:\Users\Val\Desktop\PULSO\PROJECT.md
   - c:\Users\Val\Desktop\PULSO\.agents\explorer_m2_1\report.md
   - c:\Users\Val\Desktop\PULSO\.agents\explorer_m2_2\report.md
   - c:\Users\Val\Desktop\PULSO\.agents\explorer_m2_3\report.md
2. Create `backend/utils/rate_limiter.py`:
   - Implement thread-safe sliding window rate limiter (`SlidingWindowRateLimiter`) with IP-based bucket limits:
     - `POST /api/reports`: 5 req / 10 min
     - `POST /api/reports/track`: 20 req / 1 min
     - `POST /api/reports/{id}/claim`: 10 req / 15 min
3. Update `backend/main.py`:
   - Refactor `POST /api/reports` to use `auth.get_optional_current_user`:
     - Form parameters: `category`, `description`, `lat`, `lng`, `location_string`, `location_barangay`, `contact_email`, `contact_phone`, `submission_source`, `image` (UploadFile).
     - Upload validation: 10MB limit (10,485,760 bytes), MIME and magic-byte header validation (JPEG, PNG, WebP).
     - Caloocan boundary validation (`is_in_caloocan(lat, lng)`).
     - AI Triage integration via `gemini_service.analyze_report` with graceful non-blocking local fallback (`_local_safety_check`).
     - Token generation for guests (`generate_tracking_token()`), HMAC hashing (`hash_tracking_token()`), storing `tracking_token_hash`.
     - Spatial deduplication / clustering.
     - Return `ReportResponse` with `tracking_token` (plaintext) and `tracking_url` for guests.
   - Implement `POST /api/reports/track`:
     - Accepts `ReportTrackRequest(ticket_id, tracking_token)`.
     - Rate-limited per IP.
     - Constant-time verification (`verify_tracking_token(payload.tracking_token, report.tracking_token_hash)`).
     - Anti-enumeration: Return uniform `HTTP 404 Not Found` with `detail="Report not found or invalid tracking credentials"` on any lookup or verification failure.
     - Return `ReportTrackResponse` with sanitized public timeline (`is_public=True`) and complete PII redaction (`contact_email`, `contact_phone`, `resident_id`, `ai_reasoning`, internal notes).
   - Implement `POST /api/reports/{id}/claim`:
     - Requires authenticated resident (`current_user = Depends(get_current_user)`).
     - Accepts `ReportClaimRequest(tracking_token)`.
     - Rate-limited per IP/account.
     - Validates token hash via `verify_tracking_token`.
     - Conflict checks: 409 Conflict if already claimed by another user; 403 Forbidden if authored as registered by another user.
     - Atomically sets `report.claimed_by_user_id = current_user.id`, `report.claimed_at = func.now()`. If `report.resident_id is None`: sets `report.resident_id = current_user.id`.
     - Inserts immutable `AuditLog` (`trigger_type="report_claim"`), `ProcessTimeline` event, and `Notification`.
     - Returns `ReportClaimResponse`.
   - Implement `GET /api/me/reports` (and update `/api/reports/user/{user_id}`):
     - Requires authenticated resident.
     - Accepts `filter` query param (`all`, `active`, `resolved`, `needs_information`), `skip`, `limit`.
     - Returns all reports where `resident_id == current_user.id OR claimed_by_user_id == current_user.id`.
4. Create and run tests in `backend/tests/test_milestone2_endpoints.py`:
   - Cover guest submission, registered submission, 10MB upload check, magic byte checks, tracking with valid/invalid tokens, safe anti-enumeration 404, claiming with valid/invalid/duplicate tokens, audit logging, and `GET /api/me/reports` with filter tabs.
   - Also run `pytest backend/tests/test_e2e_open_reporting.py`. Ensure 100% tests pass.
5. Write your handoff report to `c:\Users\Val\Desktop\PULSO\.agents\worker_m2\handoff.md` and notify orchestrator via send_message.
