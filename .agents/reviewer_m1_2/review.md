# Milestone 1 Security & Cryptography Review Report

## Review Summary

**Verdict**: APPROVE  
**Reviewer Role**: Security & Cryptography Reviewer  
**Scope**: Milestone 1 (Backend Domain & Database Schema Evolution, Cryptographic Token Security, Zero Plaintext Persistence, Optional Authentication Dependency)  
**Date**: 2026-09-02  

---

## Findings

### Integrity & Security Assessment
- **Integrity Violations**: None found. Zero hardcoded bypasses, dummy implementations, or fake logic detected in source files.
- **Zero Plaintext Token Persistence**: VERIFIED. No tracking_token column exists on the Report database table; only tracking_token_hash = Column(String(128), nullable=True, index=True) is defined. Pydantic schemas ReportResponse and ReportTrackResponse strictly exclude tracking_token_hash. tracking_token is only transiently populated upon initial creation response.
- **HMAC-SHA256 Salted Hashing & Normalization**: VERIFIED. normalize_tracking_token() robustly strips formatting, punctuation, whitespace, and leading 'TRK' prefix so that canonical representations are identical. hash_tracking_token() uses standard library hmac.new() with SHA-256 and server-side secret/salt key.
- **Constant-Time Verification**: VERIFIED. verify_tracking_token() employs secrets.compare_digest() to compare digests in constant time, preventing timing side-channel attacks on public tracking lookups.
- **Robust Optional Authentication**: VERIFIED. get_optional_current_user uses OAuth2PasswordBearer(auto_error=False) and wraps JWT decoding in a safe try-catch, gracefully returning None for missing headers, expired JWTs, unverified residents, or malformed tokens without leaking 401/403 exceptions.

---

## Verified Claims

1. **Zero Plaintext Tracking Token Persistence**:
   - models.Report: Has tracking_token_hash column (String(128)), no plaintext tracking_token column.
   - schemas.ReportResponse: Does NOT contain tracking_token_hash.
   - schemas.ReportTrackResponse: Does NOT contain tracking_token_hash, resident_id, contact_email, contact_phone, or internal notes/AI reasoning.
   - Verified via static code inspection and unit tests M1-SCH-03 & M1-SCH-04 -> **PASS**.

2. **Proper HMAC-SHA256 Salted Hashing & Input Normalization**:
   - utils.security.normalize_tracking_token: Normalizes casing, hyphens, spaces, underscores, and strips 'TRK' prefix.
   - utils.security.hash_tracking_token: Generates 64-char HMAC-SHA256 digest keyed with TRACKING_TOKEN_SALT or JWT_SECRET_KEY.
   - Verified via unit tests M1-SEC-04 & M1-SEC-05 and adversarial fuzz testing -> **PASS**.

3. **Constant-Time Digest Comparison**:
   - utils.security.verify_tracking_token: Uses secrets.compare_digest(computed_hash.lower(), stored_hash.strip().lower()).
   - Verified via unit tests M1-SEC-06, M1-SEC-07, M1-SEC-08 and adversarial tests -> **PASS**.

4. **Optional Authentication Dependency**:
   - auth.get_optional_current_user: Returns Official, verified Resident, or None.
   - Verified via unit tests M1-AUT-01 through M1-AUT-06 and adversarial tests -> **PASS**.

5. **Test Suite Execution**:
   - python -m unittest backend/tests/test_milestone1_schema_security.py -> 26/26 tests passed in 0.379s.
   - python -m unittest discover backend/tests -v -> 90/90 tests passed in 2.510s.

---

## Adversarial & Stress Testing Results

| Test Scenario | Input / Vector | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| Non-string token normalization | None, 123, [] | Return empty string without raising exception | Returned empty string safely | PASS |
| Non-standard delimiter variations | trk_abcd_ef01_2345_6789, trk abcd ef01 2345 6789 | Match canonical hash TRK-ABCD-EF01-2345-6789 | Identical 64-char hash | PASS |
| Prefix collisions | trk-trk-1234 | Strip only first TRK -> TRK1234 | Stripped leading TRK | PASS |
| Unicode & Emoji payload | TRK-ABCD-EF01-2345-6789-日本語-🔥 | Compute valid HMAC, verify successfully | Successfully hashed and verified | PASS |
| Buffer overflow / large payload | 10,000 char string | Compute valid HMAC, verify successfully | Successfully hashed and verified | PASS |
| Timing attack resistance | Altered last character of 64-char hash | Return False in constant time via secrets.compare_digest | Returned False safely | PASS |
| Expired / forged JWT token | Expired token, signature with wrong key | Return None (guest mode) without 401 error | Returned None | PASS |
| Unverified citizen JWT token | Account with is_verified=False | Return None (guest mode) | Returned None | PASS |

---

## Coverage Gaps & Unverified Items
- None within Milestone 1 scope.
- Note: Production deployment must configure TRACKING_TOKEN_SALT and JWT_SECRET_KEY via secure environment secrets rather than development defaults.
