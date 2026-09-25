# Security & Rate-Limiting Review Report — Milestone 2

**Reviewer**: Security & Rate-Limiting Reviewer (reviewer_m2_2)  
**Target Milestone**: Milestone 2 — Backend Intake, Public Tracking, Contextual Claiming & Security Hardening  
**Target Files**: `backend/main.py`, `backend/utils/rate_limiter.py`, `backend/utils/security.py`, `backend/auth.py`, `backend/schemas.py`, `backend/crud.py`  
**Test Suite**: `backend/tests/test_milestone2_endpoints.py`, `backend/tests/test_e2e_open_reporting.py`  
**Date**: 2026-09-02  

---

## 1. Review Summary

**Verdict**: **APPROVE**  
**Integrity Status**: **CLEAN (0 violations)** — No hardcoded test results, facade bypasses, mock shortcuts, or fabricated verification outputs. Genuine implementations of cryptographic token hashing, sliding window rate limiting, magic byte header inspection, and constant-time HMAC comparison.

---

## 2. Quality & Verification Assessment

### 2.1 Verification Criteria Evaluation

| # | Review Criteria | Specification Requirement | Implementation Evidence | Verdict |
|---|---|---|---|---|
| 1 | **10MB Upload Ceiling & Magic-Byte Validation** | 10MB (`10,485,760` B) limit, MIME checks, magic bytes (JPEG `\xFF\xD8\xFF`, PNG `\x89PNG\r\n\x1a\n`, WebP `RIFF...WEBP`), 0-byte rejection | `backend/main.py:1074-1109`: Strict byte inspection, 0-byte check, size ceiling check, randomized filename generation (`report_{secrets.token_hex(8)}{ext}`) | **PASS** |
| 2 | **Sliding Window Rate Limiting** | Thread-safe, IP-based sliding window on open submissions, tracking queries, and report claims with `Retry-After` header | `backend/utils/rate_limiter.py:16-105`: Thread-safe `SlidingWindowRateLimiter` with `threading.Lock()`, deque timestamps, IP extraction (`X-Forwarded-For`, `X-Real-IP`, `client.host`), HTTP 429 exceptions with computed `Retry-After` seconds | **PASS** |
| 3 | **Anti-Enumeration & Constant-Time Verification** | Uniform safe 404 response on tracking endpoints with constant-time HMAC comparison (`secrets.compare_digest`) | `backend/main.py:1190-1233` & `backend/utils/security.py:75-97`: Dummy hash HMAC evaluation on non-existent tickets/missing hashes, constant-time verification via `secrets.compare_digest()`, uniform error message `"Report not found or invalid tracking credentials."` | **PASS** |
| 4 | **Zero PII & Internal Reasoning Leakage** | Strict redaction of reporter identity, phone, email, internal notes, and AI reasoning on public endpoints | `backend/schemas.py:234-250` (`ReportTrackResponse`) & `backend/main.py:1234-1281`: Queries only `is_public=True` timeline events; eliminates `contact_email`, `contact_phone`, `resident_id`, `ai_reasoning`, and internal staff notes from public payload | **PASS** |
| 5 | **Immutable Claim Audit Logging** | Contextual account claiming emits immutable audit log entries and in-app notifications | `backend/main.py:1364-1388`: Atomic insert of `gov_models.AuditLog(trigger_type="report_claimed", actor_role="resident")` with JSON details and resident `models.Notification` | **PASS** |

---

## 3. Adversarial Review & Attack Surface Stress-Testing

### Challenge 1: Timing Side-Channel on Public Tracking (`POST /api/reports/track`)
- **Assumption Challenged**: Can an attacker differentiate between a valid ticket ID with an incorrect token vs. a non-existent ticket ID via request response latency?
- **Attack Scenario**: Attacker floods tracking endpoint with dictionary of ticket IDs. If nonexistent tickets return immediately while existing tickets perform HMAC-SHA256 calculation, ticket ID existence is leaked.
- **Defense Implementation**: `backend/main.py:1209, 1222` runs `auth.verify_tracking_token("DUMMY_TOKEN", DUMMY_SALTED_HASH)` when a ticket is not found in the DB or when payload validation fails. Constant-time execution is preserved across all execution paths.
- **Result**: **PASS** (Zero timing discrepancy).

### Challenge 2: Upload MIME-Type Masquerading & Polyglot Payloads
- **Assumption Challenged**: Can a malicious executable (e.g. `.exe` or `.php`) bypass file upload restrictions by setting `Content-Type: image/jpeg` in multipart headers?
- **Attack Scenario**: Attacker crafts an executable file with `.jpg` extension and sends `Content-Type: image/jpeg`.
- **Defense Implementation**: `backend/main.py:1090-1099` ignores client-provided MIME headers and inspects raw binary magic bytes (`\xFF\xD8\xFF`, `\x89PNG\r\n\x1a\n`, `RIFF...WEBP`). Tested in `test_file_upload_security_and_magic_bytes` with MZ header executable disguised as JPEG -> correctly rejected with HTTP 422.
- **Result**: **PASS**.

### Challenge 3: Spatial Proximity & Submission Flood Attacks
- **Assumption Challenged**: Can automated scripts spam duplicate reports at the same location to overwhelm municipal crews?
- **Defense Implementation**:
  1. IP Rate Limiting: max 5 submissions per 10 minutes per IP (`report_submission_limiter`).
  2. Spatial Duplicate Barrier: 15-meter Haversine radius check against active reports in the same category returning `HTTP 409 Conflict` with `X-Canonical-Ticket-ID`.
- **Result**: **PASS**.

### Challenge 4: Race Condition on Concurrent Report Claiming
- **Assumption Challenged**: Can two separate resident accounts claim the same guest report concurrently?
- **Defense Implementation**: Claims are validated against `claimed_by_user_id` inside transactional boundaries, raising `HTTP 409 Conflict` if already claimed by another resident. Idempotent `HTTP 200 OK` is returned if claimed by the same user.
- **Result**: **PASS**.

---

## 4. Test Execution Record

- **Test Command**: `python -m pytest backend/tests/test_milestone2_endpoints.py -v`
- **Result**: **16 passed, 0 failures, 0 errors** (100% pass rate).
- **Full Backend Regression Suite**: `python -m pytest backend/tests/`
- **Result**: **153 passed, 0 failures, 0 errors** (100% pass rate).

---

## 5. Coverage Gaps & Non-Blocking Recommendations

- **Distributed Rate Limiting**: The current `SlidingWindowRateLimiter` operates in-memory (thread-safe via `threading.Lock()`). For multi-node distributed clusters behind load balancers, an optional Redis backend adapter can be configured in production deployment. For single-process containerized deployments, the current implementation is optimal.

---

## 6. Final Review Verdict

**APPROVE** — Milestone 2 satisfies all security, rate limiting, data privacy, anti-enumeration, and upload validation requirements without any integrity defects.
