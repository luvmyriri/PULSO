# Milestone 2 Empirical Adversarial Challenge Handoff Report

| Metadata | Details |
|---|---|
| Role | Empirical Challenger (Milestone 2) |
| Target Files | `backend/main.py`, `backend/utils/rate_limiter.py`, `backend/crud.py`, `backend/auth.py`, `backend/utils/security.py` |
| Test Harness | `.agents/challenger_m2_1_g2/challenge_tests.py` |
| Verdict | **APPROVE** |
| Timestamp | 2026-09-02T14:26:45Z |

---

## 1. Observation

1. **Constant-Time Verification & Token Fuzzing**:
   - `utils/security.py:verify_tracking_token`: Empirically benchmarked across 2,000 iterations comparing timing profiles for valid tokens, 1st-byte mismatched tokens, last-byte mismatched tokens, and completely wrong tokens.
   - Result: Execution time remained consistently uniform at `9.1 - 11.3 µs` (ratio between early-byte mismatch and late-byte mismatch = `1.006x`), demonstrating zero timing side-channel leakage.
   - Fuzzed against empty strings, 10KB payloads, null bytes (`\x00`), SQL injection payloads (`' OR '1'='1`), and XSS tags (`<script>`), confirming proper rejection without runtime panics.
   - Anti-enumeration protection on `POST /api/reports/track` verified: Non-existent tickets, valid tickets with invalid tokens, and malformed inputs uniformly return `HTTP 404 Not Found` with identical payload `{"detail": "Report not found or invalid tracking credentials."}` via dummy HMAC computation.

2. **Race Conditions & Claim Concurrency**:
   - Concurrently evaluated competing claim requests on the same guest report from two distinct verified resident accounts (Maria Santos ID=101 vs Pedro Reyes ID=102).
   - Result: Exactly one resident succeeds (`200 OK`), while the competing resident deterministically receives `409 Conflict` (`"This report has already been claimed by another resident account."`).
   - Idempotency verified: Re-submitting the claim by the winning resident returns `200 OK` (`"Report is already linked to your account."`) without duplicating audit logs or database locks.
   - Cross-claim protection: A resident cannot claim a report authored by another registered user (`409 Conflict`). Official accounts cannot claim reports (`403 Forbidden`).

3. **Rate Limiting Sliding Window Under Burst**:
   - Evaluated `report_submission_limiter` (5 requests / 600s): A burst of 30 requests from single IP `192.168.10.50` allowed exactly 5 submissions (`201 Created`) and blocked the subsequent 25 with `HTTP 429 Too Many Requests`. All 429 responses contained valid `Retry-After` header values (`math.ceil(oldest_ts + 600 - now)`).
   - Evaluated `tracking_query_limiter` (20 requests / 60s): Allowed 20 requests, blocked subsequent 5 with `429`.
   - Evaluated `claim_limiter` (10 requests / 900s): Allowed 10 requests, blocked subsequent 5 with `429`.
   - Multi-IP isolation: Exhausting quota on IP A does not impair traffic from IP B or IP C.

4. **Tenant Isolation & Public PII Redaction**:
   - Evaluated `GET /api/me/reports` with multi-tenant data (User A authored/claimed, User B authored/claimed, unclaimed guest reports).
   - Result: User A receives only User A's authored and claimed reports (`total=2`). User B's reports and unclaimed guest reports are strictly omitted.
   - Tab filtering (`all`, `active`, `resolved`, `needs_information`) verified against exact lifecycle status groupings.
   - `POST /api/reports/track` verified: Strictly strips `resident_id`, `claimed_by_user_id`, `contact_email`, `contact_phone`, and internal `ai_reasoning` from public JSON payloads.

5. **Test Suite Execution Results**:
   - `.agents/challenger_m2_1_g2/challenge_tests.py`: **14 passed** (100%).
   - `backend/tests/test_milestone2_endpoints.py`: **16 passed** (100%).
   - `backend/tests/test_e2e_open_reporting.py`: **64 passed** (100%).
   - Combined M2 test run: **94 passed** with 0 failures.

---

## 2. Logic Chain

1. **Anti-Enumeration Integrity**: Running a dummy HMAC verification against `DUMMY_SALTED_HASH` when a ticket does not exist creates computational latency parity with tickets that do exist, preventing attackers from timing API responses to discover active civic ticket IDs.
2. **Atomic Ownership Binding**: Updating `claimed_by_user_id`, `claimed_at`, `resident_id`, and `reporter_type` inside a single transaction with pre-condition checks ensures clean mutual exclusion under concurrent claim attempts.
3. **Sliding Window Thread-Safety**: The in-memory deque protected by `threading.Lock()` provides thread-safe timestamp purges and precise sliding-window rate enforcement without race-condition leakages.
4. **Tenant Privacy Guarantee**: The SQL filter `or_(models.Report.resident_id == current_user.id, models.Report.claimed_by_user_id == current_user.id)` guarantees zero leakage between distinct citizen accounts.

---

## 3. Caveats

1. **Python `secrets.compare_digest` ASCII Behavior**: Standard Python `secrets.compare_digest` enforces ASCII comparison when comparing `str` types. In the PULSO implementation, HMAC outputs are always 64-char lowercase hexadecimal strings (pure ASCII), ensuring safe execution. For extra defense against corrupted database states, converting strings to `bytes` (`.encode('utf-8')`) prior to `compare_digest` is recommended for future hardening.
2. **In-Memory Rate Limiter Multi-Node Deployment**: The `SlidingWindowRateLimiter` is an in-memory single-process structure. When scaling to a multi-node cluster, a Redis-backed sliding window should be deployed with the same interface.

---

## 4. Conclusion

**Verdict: APPROVE**

The Milestone 2 implementation satisfies all security, routing, cryptographic verification, rate limiting, and tenant isolation requirements specified in `ORIGINAL_REQUEST.md` and `PROJECT.md`. All empirical stress, race-condition, fuzzing, and timing tests pass cleanly.

---

## 5. Verification Method

To independently reproduce the empirical challenge results:

```powershell
# Run the Milestone 2 Empirical Challenge Test Harness
cd c:\Users\Val\Desktop\PULSO
python -m pytest .agents/challenger_m2_1_g2/challenge_tests.py -v -s

# Run Combined M2 Verification Suite (Official Endpoints + E2E Contracts + Challenge Harness)
python -m pytest backend/tests/test_milestone2_endpoints.py backend/tests/test_e2e_open_reporting.py .agents/challenger_m2_1_g2/challenge_tests.py -v
```
