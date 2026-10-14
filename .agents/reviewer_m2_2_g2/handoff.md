# Milestone 2 Review Report: Backend Endpoints, Routing, & Security

| Metadata | Details |
|---|---|
| Reviewer | `reviewer_m2_2_g2` (Reviewer & Critic) |
| Target Milestone | Milestone 2: Backend Endpoints & Routing |
| Working Directory | `c:\Users\Val\Desktop\PULSO\.agents\reviewer_m2_2_g2` |
| Target Files | `backend/main.py`, `backend/utils/rate_limiter.py`, `backend/crud.py`, `backend/auth.py`, `backend/utils/security.py`, `backend/schemas.py`, `backend/tests/test_milestone2_endpoints.py`, `backend/tests/test_e2e_open_reporting.py` |
| Authoritative References | `c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md`, `c:\Users\Val\Desktop\PULSO\PROJECT.md` |
| Verdict | **APPROVE** |
| Timestamp | 2026-09-02T14:22:30Z |

---

## 1. Observation

### 1.1 Rate Limiting Architecture (`backend/utils/rate_limiter.py`)
- `SlidingWindowRateLimiter` implements thread-safe sliding window tracking via `threading.Lock()` and timestamp `collections.deque` (lines 16–85).
- Client IP extraction (`_get_client_ip`, lines 28–40) properly inspects multi-hop `X-Forwarded-For` (extracting the leftmost client IP), `X-Real-IP`, and `request.client.host`.
- When rate limit thresholds are exceeded, `check()` raises `HTTPException(status_code=429, detail=..., headers={"Retry-After": ...})` (lines 58–65).
- Three singleton limiters are configured with exact specifications:
  - `report_submission_limiter`: 5 requests / 600s (10 min) (line 88).
  - `tracking_query_limiter`: 20 requests / 60s (1 min) (line 94).
  - `claim_limiter`: 10 requests / 900s (15 min) (line 100).
- Explicitly hooked into route handlers in `backend/main.py`:
  - `POST /api/reports` (line 1033): `report_submission_limiter.check(request)`
  - `POST /api/reports/track` (line 1203): `tracking_query_limiter.check(request)`
  - `POST /api/reports/{report_id}/claim` (line 1297): `claim_limiter.check(request)`

### 1.2 Open Intake & Payload Validation (`backend/main.py:1011–1188`)
- Supports both anonymous/guest and authenticated submissions via `auth.get_optional_current_user` dependency (line 1025).
- Validates description length: minimum 10 characters, maximum 5000 characters (lines 1036–1046).
- Jurisdictional boundary check: calls `is_in_caloocan(lat, lng)` and rejects coordinates outside city boundaries with `HTTP 400 Bad Request` (lines 1049–1054).
- 15-meter spatial deduplication: checks active non-resolved reports in same category and rejects proximity conflicts with `HTTP 409 Conflict` and `X-Canonical-Ticket-ID` header (lines 1056–1072).
- File upload security:
  - 10MB ceiling (`10,485,760` bytes) (line 1084).
  - 0-byte file rejection (`HTTP 422 Unprocessable Entity`) (lines 1080–1083).
  - Magic byte inspection for JPEG (`\xFF\xD8\xFF`), PNG (`\x89PNG\r\n\x1a\n`), and WebP (`RIFF...WEBP`) (lines 1090–1098). Rejects spoofed executables, PDFs, Bash scripts, SVGs, and HTML payloads.
  - Generates secure randomized filenames `report_{secrets.token_hex(8)}{file_extension}` preventing path traversal (lines 1104–1107).
- Multi-modal AI Triage: calls `gemini_service.analyze_report()` and enforces safety moderation filters (lines 1111–1117).
- Cryptographic Token issuance: generates 128-bit `TRK-XXXX-XXXX-XXXX-XXXX` token, stores HMAC-SHA256 salted hash in `tracking_token_hash`, and attaches plaintext token to response (lines 1125–1186).

### 1.3 Public Tracking & PII Redaction (`backend/main.py:1192–1282`)
- Public tracking endpoint accepts `ticket_id` and `tracking_token` (or `tracking_code`).
- Anti-enumeration defense: uniform `HTTP 404 Not Found` with detail `"Report not found or invalid tracking credentials."` for nonexistent ticket, corrupted token, or mismatched token (lines 1208–1232).
- Constant-time HMAC comparison: runs `auth.verify_tracking_token()` against `DUMMY_SALTED_HASH` when ticket is absent to eliminate timing side-channel attacks (line 1222).
- Public payload projection (`schemas.ReportTrackResponse`, `schemas.py:234–253`):
  - Completely redacts `contact_email`, `contact_phone`, `resident_id`, `claimed_by_user_id`, `tracking_token_hash`, `ai_reasoning`, `ai_metadata`, and `budget`.
  - Queries `gov_models.ProcessTimeline` with `is_public == True` only (line 1237), filtering out internal staff notes and contractor quotes.

### 1.4 Contextual Report Claiming (`backend/main.py:1284–1393`)
- Requires authenticated resident (`current_user: Union[models.Official, models.Resident] = Depends(auth.get_current_user)`, verifying `isinstance(current_user, models.Resident)`; rejects officials with 403 Forbidden).
- Validates token via `auth.verify_tracking_token(provided_token, report.tracking_token_hash)` (lines 1342–1346).
- Idempotency & conflict management:
  - Returns `200 OK` if already claimed by current user (lines 1324–1328).
  - Returns `409 Conflict` if claimed by another resident (lines 1329–1332).
  - Returns `409 Conflict` if report was authored by another registered resident (lines 1334–1339).
- Atomic state mutation: sets `claimed_by_user_id = current_user.id`, `claimed_at = now()`, `resident_id = current_user.id` (if guest), `reporter_type = "registered"`, and verifies matching contact info (`contact_verified = True`) (lines 1349–1361).
- Inserts immutable `gov_models.AuditLog` record (`trigger_type="report_claimed"`, `actor_role="resident"`) with serialized JSON details (lines 1365–1378).
- Inserts in-app notification via `crud._create_notification()` (lines 1381–1386).

### 1.5 Legacy Compatibility & Portfolio Queries (`backend/main.py:864–958`)
- `GET /api/me/reports` (lines 864–910): unified query filtering `or_(Report.resident_id == current_user.id, Report.claimed_by_user_id == current_user.id)`, with tabs (`all`, `active`, `resolved`, `needs_information`) and pagination.
- `GET /api/reports/user/{user_id}` (lines 912–933): legacy compatibility endpoint verifying authorization and querying authored + claimed reports.
- `GET /api/reports/public` (lines 935–958): public feed filtering validated statuses (`validated`, `dispatched`, `approved_internal`, `in_progress`, `resolved`) and anonymizing reporter names to `"Anonymous Resident"`.

### 1.6 Independent Test Execution Results
1. `backend/tests/test_milestone2_endpoints.py`: **16 passed / 16 total (100%)** in 39.94s.
2. `backend/tests/test_e2e_open_reporting.py`: **64 passed / 64 total (100%)** in 3.17s.
3. `backend/tests/test_challenger_m2_2_security_edge.py`: **34 passed / 34 total (100%)** in 28.81s.
4. `backend/tests/test_rate_limit_anti_enum_challenge.py`: **12 passed / 12 total (100%)** in 25.36s.

---

## 2. Logic Chain

1. **Intake Decoupling & Schema Integrity**:
   - `models.Report.resident_id` is nullable, and `reporter_type` defaults to `"guest"` when unauthenticated, satisfying R1 and R2 of `ORIGINAL_REQUEST.md`.
   - `auth.generate_tracking_token()` creates 128-bit cryptographic tokens stored exclusively as HMAC-SHA256 hashes (`tracking_token_hash`), ensuring zero plaintext credential leaks at rest.
2. **Rate Limiting & Denial-of-Service Defense**:
   - The thread-safe in-memory sliding window limiter operates with $O(1)$ amortized complexity per IP.
   - Tests confirm burst protection across all three public endpoints (`POST /api/reports` @ 5/10m, `POST /api/reports/track` @ 20/1m, `POST /api/reports/{id}/claim` @ 10/15m) with proper `Retry-After` headers and IP isolation.
3. **Anti-Enumeration & Privacy Hardening**:
   - Because `POST /api/reports/track` executes a dummy HMAC calculation against a constant salt whenever a ticket ID is not found, response latency is statistically indistinguishable from a valid ticket evaluated with an invalid token ($\Delta < 5\text{ms}$ in benchmark tests).
   - Public projections completely omit citizen PII and internal operational notes, satisfying R3.
4. **Ownership Transition & Auditability**:
   - The claim workflow (`POST /api/reports/{id}/claim`) verifies caller identity (resident only), validates proof of ownership via constant-time token comparison, binds ownership atomically, and writes an immutable audit trail (`gov_models.AuditLog`) and citizen notification, satisfying R4.
5. **Absence of Integrity Violations**:
   - Code inspections confirmed no hardcoded mock results, no dummy facades, and no synthetic verification bypasses. All cryptographic, geospatial, and database routines execute genuine algorithms.

---

## 3. Caveats

1. **Distributed Multi-Node Rate Limiting**: The current `SlidingWindowRateLimiter` uses in-memory deque structures. In a multi-worker or multi-server distributed cluster, a shared Redis backing store (e.g., Redis sliding sorted sets) should replace the in-memory dictionary. For single-process development and standalone production nodes, the current implementation is fully thread-safe and robust.
2. **SQLite In-Memory Test Runner Limitation**: In test harnesses utilizing `sqlite:///:memory:` with `StaticPool`, high concurrency multi-threaded test cases (such as 10 concurrent OS threads writing simultaneously) can encounter SQLite table-lock contention. In production PostgreSQL deployments with MVCC row-level locking, concurrent writes are fully supported.

---

## 4. Conclusion

Milestone 2 (Backend Endpoints & Routing) is **fully implemented, hardened, and verified**. All requirements from `ORIGINAL_REQUEST.md` (R1–R5) and `PROJECT.md` (Features 6–16) are completely satisfied with comprehensive test coverage and 0 integrity defects.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently verify the implementation and test suites:

```powershell
# 1. Run Milestone 2 dedicated endpoint tests
python -m pytest backend/tests/test_milestone2_endpoints.py -v

# 2. Run Open Reporting E2E contract test suite
python -m pytest backend/tests/test_e2e_open_reporting.py -v

# 3. Run Challenger Security & Edge test suite
python -m pytest backend/tests/test_challenger_m2_2_security_edge.py -v

# 4. Run Rate Limit & Anti-Enumeration Empirical Challenge suite
python -m pytest backend/tests/test_rate_limit_anti_enum_challenge.py -v
```

### Invalidation Conditions
- Any rate limiter failing to return HTTP 429 and `Retry-After` on limit breach.
- Any leak of `contact_email`, `contact_phone`, or `resident_id` in `POST /api/reports/track` responses.
- Any claim execution permitting unauthorized double-claiming or failing to record `gov_models.AuditLog`.
- Any failure in the test commands above.
