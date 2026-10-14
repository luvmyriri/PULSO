# Milestone 2: Backend Endpoints & Routing Handoff Report

| Metadata | Details |
|---|---|
| Role | Backend Worker (Milestone 2) |
| Target Files | `backend/main.py`, `backend/utils/rate_limiter.py`, `backend/crud.py`, `backend/tests/test_milestone2_endpoints.py` |
| Authority | `ORIGINAL_REQUEST.md`, `PROJECT.md`, `explorer_m2_1/report.md`, `explorer_m2_2/report.md`, `explorer_m2_3/report.md` |
| Status | Hard Handoff — Complete & Verified |
| Timestamp | 2026-09-02T10:08:00Z |

---

## 1. Observation

1. **Rate Limiting Middleware (`backend/utils/rate_limiter.py`)**:
   - Implemented thread-safe `SlidingWindowRateLimiter` utilizing a threading lock and sliding timestamp deques.
   - Configured exact per-route rate limits:
     - `POST /api/reports`: 5 requests / 10 minutes (600s).
     - `POST /api/reports/track`: 20 requests / 1 minute (60s).
     - `POST /api/reports/{id}/claim`: 10 requests / 15 minutes (900s).
   - Rate limit violations raise `HTTPException(429, detail=..., headers={"Retry-After": ...})`.

2. **Database CRUD Operations (`backend/crud.py`)**:
   - `create_report()` in `backend/crud.py` now accepts `resident_id: Optional[int] = None`, `tracking_token_hash: Optional[str] = None`, and `ai_analysis: Optional[dict] = None`.
   - Populates `reporter_type = "registered" if resident_id else "guest"`.
   - Dynamically resolves `location_barangay` and canonical `barangay_id` from the master table.
   - Automatically appends the initial public lifecycle event to `process_timelines` with `stage="received"`, `status="pending"`, `is_public=True`.
   - `get_reports_by_user()` updated with `or_(models.Report.resident_id == resident_id, models.Report.claimed_by_user_id == resident_id)` to unify portfolio retrieval.

3. **API Routing & Security Endpoints (`backend/main.py`)**:
   - `POST /api/reports`:
     - Optional authentication via `auth.get_optional_current_user`.
     - Rate-limited via `report_submission_limiter.check(request)`.
     - 10MB upload ceiling (`10,485,760` bytes) with magic byte validation (`\xFF\xD8\xFF` for JPEG, `\x89PNG\r\n\x1a\n` for PNG, `RIFF...WEBP` for WebP) and 0-byte file rejection.
     - Caloocan City jurisdictional boundary enforcement (`is_in_caloocan(lat, lng)`).
     - Spatial deduplication: 15-meter proximity conflict check against active reports returning `409 Conflict` with `X-Canonical-Ticket-ID`.
     - Multi-modal Gemini 1.5 Flash AI Triage with moderation safety filtering.
     - Cryptographic 128-bit tracking token issuance (`auth.generate_tracking_token()`), storing HMAC-SHA256 hash in `tracking_token_hash` and returning ephemeral plaintext token and `tracking_url` in the `201 Created` response.
   - `POST /api/reports/track`:
     - Rate-limited via `tracking_query_limiter.check(request)`.
     - Constant-time verification (`auth.verify_tracking_token`).
     - Anti-enumeration protection: Returns uniform `HTTP 404 Not Found` with `detail="Report not found or invalid tracking credentials."` on missing tickets, missing hashes, or mismatched tokens. Performs dummy HMAC computation to eliminate timing side-channels.
     - Returns sanitized `ReportTrackResponse` with `public_timeline` (`is_public=True` events only) and total PII redaction (no `contact_email`, `contact_phone`, `resident_id`, or `ai_reasoning`).
   - `POST /api/reports/{report_id}/claim`:
     - Authenticated resident endpoint (`auth.get_current_user`), verifying resident account type.
     - Rate-limited via `claim_limiter.check(request)`.
     - Conflict checks: `409 Conflict` if claimed by another resident or authored by another registered user; `200 OK` idempotent response if already claimed by current user.
     - Token validation: `403 Forbidden` if tracking token is invalid.
     - Atomic mutation: sets `claimed_by_user_id = current_user.id`, `claimed_at = now()`, `resident_id = current_user.id` (if guest), `reporter_type = "registered"`, and verifies matching contact info.
     - Inserts immutable `gov_models.AuditLog` record (`trigger_type="report_claimed"`, `actor_role="resident"`) and in-app `models.Notification`.
   - `GET /api/me/reports`:
     - Requires authenticated resident.
     - Queries all reports where `resident_id == current_user.id OR claimed_by_user_id == current_user.id`.
     - Supports filter tabs: `all`, `active`, `resolved`, `needs_information` with pagination (`page`, `limit`, `skip`).
   - `GET /api/reports/user/{user_id}` and `GET /api/reports/public`:
     - Updated to reflect unified ownership and public access without leaking reporter identities.

4. **Test Suite Verification**:
   - Created `backend/tests/test_milestone2_endpoints.py` with 16 comprehensive unit & integration test cases.
   - Ran `test_milestone2_endpoints.py`: 16 passed.
   - Ran `test_e2e_open_reporting.py`: 64 passed.
   - Ran full backend test suite (`backend/tests/`): 153 passed with 0 failures.

---

## 2. Logic Chain

1. **Intake Decoupling**: Allowing `resident_id = None` in `crud.create_report()` while generating a cryptographically secure token enables open guest reporting without breaking foreign key constraints or operational pipelines.
2. **Timing Side-Channel Elimination**: By running a constant-time HMAC check against a dummy hash when a ticket ID is not found in the DB, the response latency is indistinguishable between existent and non-existent tickets, preventing user enumeration attacks.
3. **Auditability & Integrity**: All report claiming operations execute atomically within a DB transaction and record an immutable audit log entry in `gov_models.AuditLog` alongside an in-app user notification.
4. **Data Isolation**: `GET /api/me/reports` and `POST /api/reports/track` enforce strict tenant separation and PII redaction at the database query and serialization layers.

---

## 3. Caveats

1. **Rate Limiter Storage**: The in-memory sliding window rate limiter is optimized for single-process instances. In a distributed multi-node production deployment with multiple uvicorn workers across separate servers, a shared Redis backing store can replace the in-memory deque without changing the interface.
2. **Static Uploads**: In test execution, mock file streams are validated in-memory and static file paths are assigned. Real production deployment uses persistent volume mounts for `uploads/reports/`.

---

## 4. Conclusion

Milestone 2 (Backend Endpoints & Routing) has been fully implemented, hardened, and verified in strict accordance with `ORIGINAL_REQUEST.md`, `PROJECT.md`, and all security specifications. All 153 backend tests pass with 100% success rate.

---

## 5. Verification Method

To independently verify the implementation:

```powershell
# 1. Run Milestone 2 dedicated endpoint tests
cd c:\Users\Val\Desktop\PULSO
python -m pytest backend/tests/test_milestone2_endpoints.py -v

# 2. Run Open Reporting E2E contract test suite
python -m pytest backend/tests/test_e2e_open_reporting.py -v

# 3. Run full backend test suite
python -m pytest backend/tests/ -v
```
