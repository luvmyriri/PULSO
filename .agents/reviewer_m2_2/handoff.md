# Milestone 2 Security & Rate-Limiting Review Handoff Report

| Metadata | Details |
|---|---|
| Role | Security & Rate-Limiting Reviewer (`reviewer_m2_2`) |
| Target Milestone | Milestone 2: Backend Endpoints, Intake, Public Tracking, Contextual Claiming & Security Hardening |
| Target Files | `backend/main.py`, `backend/utils/rate_limiter.py`, `backend/utils/security.py`, `backend/auth.py`, `backend/schemas.py`, `backend/crud.py` |
| Authority | `PROJECT.md`, `ORIGINAL_REQUEST.md`, `worker_m2/handoff.md` |
| Status | Hard Handoff — Complete & Approved |
| Verdict | **APPROVE** |
| Timestamp | 2026-09-02T10:09:30Z |

---

## 1. Observation

1. **Upload Security & Magic-Byte Validation (`backend/main.py:1074-1109`)**:
   - Explicit 0-byte file check (`len(image_bytes) == 0`) raising `HTTP 422`.
   - Explicit 10MB ceiling (`len(image_bytes) > 10 * 1024 * 1024` = `10,485,760` bytes) raising `HTTP 422`.
   - Strict binary header inspection for JPEG (`b'\xff\xd8\xff'`), PNG (`b'\x89PNG\r\n\x1a\n'`), and WebP (`b'RIFF'` + `bytes[8:12] == b'WEBP'`), rejecting masqueraded files with `HTTP 422`.
   - Randomized file naming (`report_{secrets.token_hex(8)}{ext}`) to prevent directory traversal and overwrite attacks.

2. **Thread-Safe Sliding Window Rate Limiting (`backend/utils/rate_limiter.py:16-105`)**:
   - Implements `SlidingWindowRateLimiter` utilizing `threading.Lock()` and double-ended timestamp deques per client IP.
   - Robust IP extraction via `X-Forwarded-For` (first entry stripped), `X-Real-IP`, and `request.client.host`.
   - Exact route quotas enforced:
     - `POST /api/reports`: 5 requests / 10 minutes (600s).
     - `POST /api/reports/track`: 20 requests / 1 minute (60s).
     - `POST /api/reports/{id}/claim`: 10 requests / 15 minutes (900s).
   - Raises `HTTP 429 Too Many Requests` with dynamic `Retry-After` header.

3. **Anti-Enumeration & Constant-Time Verification (`backend/main.py:1190-1233` & `backend/utils/security.py:75-97`)**:
   - `auth.verify_tracking_token()` computes HMAC-SHA256 of normalized tokens using secret salt and performs constant-time equality check via `secrets.compare_digest()`.
   - `POST /api/reports/track` executes dummy HMAC computation against `DUMMY_SALTED_HASH` on non-existent tickets and invalid request payloads, eliminating timing side-channels.
   - Returns uniform safe `HTTP 404 Not Found` (`"Report not found or invalid tracking credentials."`) for missing reports, missing tokens, and token mismatches.

4. **Public Data Sanitization & PII Redaction (`backend/main.py:1234-1281` & `backend/schemas.py:234-250`)**:
   - `ReportTrackResponse` strictly omits `contact_email`, `contact_phone`, `resident_id`, `reporter_name`, `ai_reasoning`, and `tracking_token_hash`.
   - Queries only `is_public == True` timeline entries, withholding private internal staff notes from public visibility.
   - `GET /api/reports/public` anonymizes reporter names as `"Anonymous Resident"` for non-officials.

5. **Contextual Claiming & Immutable Audit Logging (`backend/main.py:1284-1393`)**:
   - Restricts claiming to authenticated resident accounts (`isinstance(current_user, models.Resident)`).
   - Prevents duplicate claims by another user (`409 Conflict`) while allowing idempotent requests by the same user (`200 OK`).
   - Prevents claiming registered-authored reports (`409 Conflict`).
   - Inserts immutable `gov_models.AuditLog(trigger_type="report_claimed", actor_role="resident")` with JSON audit trail and emits in-app user notification.

6. **Test Verification Execution**:
   - `python -m pytest backend/tests/test_milestone2_endpoints.py`: 16 passed in 19.27s (0 failures).
   - `python -m pytest backend/tests/`: 153 passed in 25.11s (0 failures).

---

## 2. Logic Chain

1. **Intake Integrity**: Inspecting binary magic bytes directly prevents malicious payload execution regardless of client MIME headers.
2. **Side-Channel Immunity**: Computing dummy HMAC operations on missing records ensures constant latency across all lookup failure modes, closing user enumeration vectors.
3. **Privacy by Schema**: Public tracking schemas (`ReportTrackResponse`) explicitly exclude PII fields, ensuring that internal or contact information cannot leak even if present in the database row.
4. **Audit Immutability**: Enforcing audit logs within the same database transaction as ownership mutation guarantees complete traceability for civic accountability.

---

## 3. Caveats

1. **In-Memory Rate Limiting Scope**: The current rate limiter runs in-process with a thread lock. In horizontally scaled multi-node production setups, a distributed backing store (such as Redis) can be integrated without modifying the route interface.
2. **Reverse Proxy Configuration**: Rate limiter IP extraction relies on `X-Forwarded-For` from trusted upstream reverse proxies (e.g., Nginx). Production Nginx configurations should sanitize untrusted forwarded headers.

---

## 4. Conclusion

Milestone 2 (Security, Upload Validation & Rate Limiting) has been comprehensively inspected, stress-tested, and verified against all functional and adversarial criteria. Zero integrity violations or security vulnerabilities were discovered. The implementation is fully compliant with `PROJECT.md` and `ORIGINAL_REQUEST.md`. Verdict is **APPROVE**.

---

## 5. Verification Method

To independently reproduce the verification results:

```powershell
# Execute Milestone 2 dedicated security and endpoint tests
cd c:\Users\Val\Desktop\PULSO
python -m pytest backend/tests/test_milestone2_endpoints.py -v

# Execute full backend regression suite
python -m pytest backend/tests/ -v
```
