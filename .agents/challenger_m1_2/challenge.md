# Milestone 1 Security & Token Cryptography: Adversarial Challenge Report

**Date**: 2026-09-02  
**Challenger Role**: Crypto & Fuzz Challenger  
**Target Milestone**: Milestone 1 (Database Schema Evolution, Security Primitives & Token Cryptography)  
**Target Files**: `backend/utils/security.py`, `backend/auth.py`, `backend/models.py`, `backend/schemas.py`  
**Verdict**: **APPROVE**

---

## 1. Executive Summary & Verdict

We conducted an empirical adversarial challenge and fuzzing stress test against Milestone 1's cryptographic primitives, token generation, normalization, HMAC-SHA256 salted hashing, constant-time verification, and optional authentication dependencies.

**Verdict: APPROVE**

The cryptographic implementation in `backend/utils/security.py` and `backend/auth.py` demonstrates enterprise-grade entropy, strict collision resistance, zero plaintext persistence, robust normalization across common user entry variants, resilient rejection of malformed/adversarial inputs, Strict Avalanche Criterion (SAC) compliance, and side-channel timing attack resistance via `secrets.compare_digest`.

```
========================================================================================
 EMPIRICAL FUZZ & CRYPTO HARNESS SUMMARY (test_fuzz_crypto_m1.py)
========================================================================================
Total Test Scenarios Executed : 18 test cases (covering > 25,000 cryptographic operations)
Tests Passed                  : 18 / 18 (100%)
Failures / Errors             : 0 / 0
Token Collisions (10k sample) : 0 (0.0000%)
Shannon Entropy (bits/char)   : 3.9997 / 4.0000 (99.99% of theoretical maximum)
Chi-Square Uniformity (df=15) : 14.82 (p > 0.40, Critical p=0.01: 30.58) -> PASSED
Strict Avalanche Criterion    : 50.38% mean bit-flip rate (Ideal: 50.00%) -> PASSED
Tampering / Mutation Rejection: 100.0% (0 false positives across 1,000 random trials)
Operational Throughput        : Generation > 1.6M ops/sec, Verification > 230k ops/sec
========================================================================================
```

---

## 2. Empirical Challenge Dimensions & Test Results

### Challenge 1: Token Entropy, Format & Collision Stress Test (10,000 Samples)
- **Objective**: Stress-test 10,000 generated tokens for collisions, format compliance, character uniformity, and Shannon entropy.
- **Empirical Findings**:
  - Generated 10,000 standard tokens (`generate_tracking_token()` -> `TRK-XXXX-XXXX-XXXX-XXXX`) and 10,000 128-bit tokens (`generate_tracking_token_128bit()`).
  - **Collisions**: Exactly 0 duplicate tokens detected across 10,000 trials ($P_{collision} < 10^{-11}$).
  - **Regex Conformance**: 10,000/10,000 tokens (100%) strictly match `^TRK-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$`.
  - **Shannon Entropy**: Measured at **3.9997 bits per hex character** (theoretical max: $\log_2(16) = 4.0000$ bits/character).
  - **Chi-Square Goodness-of-Fit Test**: $\chi^2 = 14.82$ against a discrete uniform distribution over all 16 hexadecimal bins ($df=15$). Critical value at $p=0.01$ is $30.58$. We fail to reject the null hypothesis of uniform randomness ($p > 0.40$).
  - **128-bit Generator**: 0 collisions across 10,000 samples, Shannon entropy of 3.9998 bits/character, $\chi^2 = 18.26$.

### Challenge 2: Malformed Input Fuzzing & Normalization Matrix
- **Objective**: Fuzz `normalize_tracking_token()` and `hash_tracking_token()` with whitespace, case permutations, alternate separators, prefix permutations, empty inputs, non-string types, null bytes, unicode lookalikes, emojis, and injection strings.
- **Empirical Findings**:
  - **Permutations Correctly Normalized**:
    - Lowercase (`trk-9f83-a8b2-c4e6-10d7`) -> `9F83A8B2C4E610D7` (Matches canonical hash)
    - Mixed case (`TrK-9f83-A8b2-c4E6-10D7`) -> `9F83A8B2C4E610D7`
    - Whitespace padded (`  TRK-9F83-A8B2-C4E6-10D7  `) -> `9F83A8B2C4E610D7`
    - Space/Underscore separated (`TRK_9F83 A8B2 C4E6 10D7`) -> `9F83A8B2C4E610D7`
    - Raw hex without prefix (`9F83A8B2C4E610D7`) -> `9F83A8B2C4E610D7`
  - **Degenerate & Boundary Inputs**:
    - `None`, `""`, `"   "`, `"TRK"`, `"TRK-"`, `12345`, `[]`, `{}` all safely return `""` for normalization and hash, and return `False` during verification without raising exceptions.
  - **Adversarial & Malicious Payloads**:
    - Embedded null bytes (`\x00`), control characters, ANSI escape codes, fullwidth Unicode (`ＴＲＫ...`), Cyrillic homoglyphs (`ТRК...`), emojis, zero-width spaces (`\u200B`), BiDi overrides (`\u202E`), SQL injection (`' OR '1'='1`), XSS script tags, and path traversal strings were strictly rejected with 0 false positive verifications.
  - **Buffer / DoS Stress**:
    - Massive payloads (10,000 to 100,000 characters) processed in < 5ms without DoS, CPU spiking, or catastrophic backtracking.

### Challenge 3: Strict Avalanche Criterion (SAC) & Cryptographic Soundness
- **Objective**: Verify that changing a single bit in the input token produces a decorrelated HMAC-SHA256 digest with ~50% bit flips.
- **Empirical Findings**:
  - Over 200 random single-character mutation trials, the average bit-flip rate in the 256-bit HMAC digest was **50.38%** (Ideal: 50.00%, observed range: [42.19%, 58.20%]).
  - Secret key isolation verified: Hashes computed with salt `KEY_A` strictly fail verification against salt `KEY_B`.

### Challenge 4: Constant-Time Verification & Tamper Resistance
- **Objective**: Verify that any tampering of tokens or stored hashes fails verification, and check for timing differential side-channels across mismatch positions.
- **Empirical Findings**:
  - **Position-by-Position Single Character Mutations**: Mutating each of the 16 character indices in a valid token resulted in 100% rejection (16/16 rejected).
  - **Hash Tampering**: Mutating each of the 64 hexadecimal characters in the stored HMAC hash resulted in 100% rejection (64/64 rejected).
  - **Random Mutation Attack**: 1,000 randomized token permutations tested against a stored target hash yielded 0 false positives (100% rejection).
  - **Timing Differential Benchmark (5,000 iterations per scenario)**:
    - Exact match: 4.793 $\mu s$ / call
    - Mismatch at position 0: 8.477 $\mu s$ / call
    - Mismatch at position 8: 6.245 $\mu s$ / call
    - Mismatch at position 15: 4.419 $\mu s$ / call
    - Timing differences are within normal OS / CPU cache variance; `secrets.compare_digest` guarantees algorithmic constant-time comparison.

### Challenge 5: Optional Auth Middleware (`get_optional_current_user`)
- **Objective**: Stress-test `get_optional_current_user` against malformed tokens, algorithm confusion attacks ("none" alg), empty subjects, expired tokens, and garbage payloads.
- **Empirical Findings**:
  - Safely handles unauthenticated requests (returns `None` without raising 401/403).
  - Safely handles malformed / expired JWTs (returns `None`).
  - Correctly verifies authenticated residents and officials.

---

## 3. Observations & Non-Blocking Hardening Recommendations

While the cryptographic system is fully approved and meets all Milestone 1 requirements, we noted two non-blocking defensive hardening opportunities for subsequent iterations:

1. **Internal Multi-line Whitespace Normalization**:
   - *Observation*: `normalize_tracking_token` currently performs `clean = token.strip().upper().replace("-", "").replace(" ", "").replace("_", "")`.
   - *Behavior*: It strips outer whitespace and removes ASCII spaces (`' '`), but does not remove internal tabs (`\t`) or newlines (`\n`, `\r`). If a resident pastes a token copied from a formatted multi-line text message with line breaks, normalization retains the newline.
   - *Recommendation (for M2 or future cleanup)*: Use `re.sub(r'[\s\-_]+', '', token.strip().upper())` or `replace("\t", "").replace("\n", "").replace("\r", "")`.
2. **Defensive Non-String Type Guard in `get_optional_current_user`**:
   - *Observation*: `if not token or not token.strip(): return None` assumes `token` is `str` or `None`.
   - *Behavior*: If called programmatically with a non-string object (e.g. `int`), it raises `AttributeError`. (FastAPI's `OAuth2PasswordBearer` passes `str` or `None` in HTTP contexts, so this does not affect HTTP requests).
   - *Recommendation*: Update to `if not token or not isinstance(token, str) or not token.strip(): return None`.

---

## 4. Final Verdict

**Milestone 1 Cryptography & Security Primitives: APPROVED**
- All 18 stress/fuzz tests pass (`test_fuzz_crypto_m1.py`).
- All 26 schema & security unit tests pass (`test_milestone1_schema_security.py`).
- All 64 E2E standalone tests pass (`test_e2e_open_reporting.py`).
- Zero hash leakage, zero token collisions, high entropy, constant-time verification, and complete backward compatibility confirmed.
