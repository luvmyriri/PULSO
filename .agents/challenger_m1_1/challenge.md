# Empirical Challenge Report: Milestone 1 Database Schema & Migration

**Evaluator**: Empirical Challenger (`challenger_m1_1`)  
**Target Milestone**: Milestone 1 — Database Schema Evolution, Security Primitives & Dual-Dialect Migration  
**Target Files**: `backend/models.py`, `backend/migrate_guest_reporting.py`, `backend/schemas.py`, `backend/auth.py`, `backend/utils/security.py`, `database.py`  
**Execution Timestamp**: 2026-09-02T17:55:00+08:00  
**Verdict**: **APPROVE** (All 27 challenge stress tests and 26 unit tests passed with 100% assertions satisfied across SQLite and live PostgreSQL engines)

---

## Executive Summary

| Challenge Dimension | Target Requirement | Empirical Test Result | Status |
|---|---|---|---|
| **Migration Idempotency** | Run 5x consecutively on fresh, populated, and partial schemas | 5/5 consecutive runs without errors or duplicate indexes | **PASSED** |
| **Null `resident_id` & Guest Reporting** | Nullable resident association on `reports` with guest fields | Verified in SQLite & live PostgreSQL | **PASSED** |
| **Foreign Key & 3NF Integrity** | Referential integrity with `PRAGMA foreign_keys=ON` | Raised `IntegrityError` on invalid FKs, full 3NF resolution | **PASSED** |
| **Extreme Column Inputs & SQLi** | 100k char payloads, SQL injection strings, unicode, boundaries | 0 SQL injections, 0 data corruptions, exact persistence | **PASSED** |
| **Cryptographic Primitives** | 128-bit & 64-bit token entropy, normalization, constant-time hash | 20,000 tokens generated with 0 collisions; 100% tamper rejected | **PASSED** |
| **Schema Zero-Leakage & PII Redaction** | Zero hash leakage and strict public field sanitization | `tracking_token_hash` excluded from public schemas | **PASSED** |
| **Optional Auth Dependency** | `get_optional_current_user` robustness against malformed/expired JWTs | Clean fallback to `None` without unhandled exceptions | **PASSED** |
| **PostgreSQL Live Engine** | Dual-dialect execution on live PostgreSQL instance | Clean migration, nullable `resident_id`, raw SQL verified | **PASSED** |

---

## Challenge Summary

**Overall risk assessment**: **LOW** (Highly resilient, idempotent, and cryptographically sound)

---

## Challenges & Empirical Findings

### 1. [LOW RISK] Migration Script Idempotency & Partial State Recovery
- **Assumption challenged**: Migration script `migrate_guest_reporting.run_migration()` can run repeatedly on fresh, legacy, or partially migrated databases without schema corruption, syntax errors, or duplicate index collisions.
- **Attack scenario**:
  1. Ran `run_migration` 5 consecutive times on fresh SQLite in-memory engine.
  2. Ran `run_migration` 5 consecutive times on legacy database containing pre-existing reports with NULL columns.
  3. Simulated an interrupted migration where only 3 of 8 columns existed (`reporter_type`, `contact_email`, `submission_source`), then executed migration.
  4. Ran migration against live PostgreSQL database 3 times.
- **Empirical result**:
  - All 5 fresh runs returned `True`; all 8 columns verified.
  - All 5 legacy runs returned `True`; legacy rows cleanly backfilled (`reporter_type='registered'`, `submission_source='web'`, `contact_verified=0`, `tracking_token_hash=NULL`).
  - Partial column state was cleanly repaired; missing 5 columns added without erroring on existing 3.
  - All 5 indexes (`ix_reports_reporter_type`, `ix_reports_tracking_token_hash`, `ix_reports_contact_email`, `ix_reports_claimed_by_user_id`, `ix_reports_resident_id`) created idempotently using `CREATE INDEX IF NOT EXISTS`.
- **Verdict**: **PASSED**

### 2. [LOW RISK] Null `resident_id` & Relational Integrity (3NF)
- **Assumption challenged**: `resident_id` is truly nullable across ORM and raw SQL levels, allowing guest reports while strictly enforcing relational foreign keys when present.
- **Attack scenario**:
  1. Inserted report with non-existent `resident_id=999999` under `PRAGMA foreign_keys=ON`.
  2. Inserted report with non-existent `claimed_by_user_id=888888`.
  3. Inserted report with non-existent `barangay_id=777777`.
  4. Inserted guest report with `resident_id=None` linked to valid `barangay_id` and verified 3NF chain: `Report -> Barangay -> District`.
  5. Tested two-way claiming lifecycle: transition from guest report (`resident_id=None`, `claimed_by_user_id=None`) to claimed (`claimed_by_user_id=resident.id`), verifying `resident.claimed_reports` contains the report while `resident.reports` remains empty.
- **Empirical result**:
  - Tests 1, 2, and 3 raised `sqlalchemy.exc.IntegrityError` as expected.
  - Test 4 succeeded: `guest_report.barangay_ref.name == "Barangay 171 Bagumbong"` and `district.code == "D2"`.
  - Test 5 succeeded: `report.is_claimed == True`, `report.claimed_by.full_name == "Maria Santos"`, and bidirectional relationship mapped cleanly.
- **Verdict**: **PASSED**

### 3. [LOW RISK] Extreme Inputs, Boundary Values & SQL Injection Resilience
- **Assumption challenged**: Extreme character lengths, unicode/emojis, SQL injection attack payloads, and extreme float/coordinate values do not break database persistence or allow SQL injection.
- **Attack scenario**:
  1. Stored 252-char `contact_email`, 48-char `contact_phone`, 31-char `submission_source`.
  2. Stored 105,000-character description text payload.
  3. Stored Tagalog diacritics, multilingual strings (Filipino, Arabic, Chinese, Korean), emojis (`🌊🌧️🚨🚧🛑🔧`).
  4. Stored SQL injection strings (`'; DROP TABLE reports; --`, `' OR 1=1 --`, `' UNION SELECT ... --`, `EXEC xp_cmdshell`, `Robert'); DROP TABLE Students;--`).
  5. Stored extreme numeric boundaries: `lat=-90.0`, `lng=180.0`, `budget=999,999,999,999.99`, `citizen_trust_score=-50`.
  6. Stored deeply nested JSON metadata in `ai_metadata`.
- **Empirical result**:
  - All payloads stored and retrieved verbatim with 0 truncation, 0 unhandled exceptions, and 0 SQL injection executions. Database tables remained intact.
- **Verdict**: **PASSED**

### 4. [LOW RISK] Cryptographic Token Generation, Normalization & Constant-Time Verification
- **Assumption challenged**: Tracking tokens have sufficient entropy to prevent collisions and enumeration, normalization handles all user formatting variations, and constant-time HMAC-SHA256 verification resists bit flips and timing attacks.
- **Attack scenario**:
  1. Generated 10,000 standard 64-bit tokens (`TRK-XXXX-XXXX-XXXX-XXXX`) and 10,000 128-bit tokens (`TRK-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`).
  2. Tested 12 adversarial normalization variations: spaces, tabs, newlines, mixed case, underscores, missing prefixes, missing hyphens.
  3. Tampering matrix against `verify_tracking_token`: single-bit flip in token, single-char alteration in hash, truncated hash (32 chars), expanded hash (66 chars), empty string, `None`, wrong secret salt.
- **Empirical result**:
  - Exactly 20,000 unique tokens generated with 0 collisions and 100% regex match.
  - All 12 adversarial formatting variations normalized to canonical `9F83A8B2C4E610D7`.
  - Normalization of `None`, `""`, and non-strings safely returned `""` without exceptions.
  - Constant-time verification returned `True` for valid inputs and `False` for all tampered tokens, tampered hashes, truncated hashes, and wrong salts.
- **Verdict**: **PASSED**

### 5. [LOW RISK] Schema Zero-Leakage & PII Redaction Audit
- **Assumption challenged**: Internal tracking token hashes, reporter contact details, staff notes, and internal triage reasoning never leak across API response schemas.
- **Attack scenario**:
  - Inspected model fields of `schemas.ReportResponse`, `schemas.ReportTrackResponse`, and `schemas.UserReportsResponse`.
- **Empirical result**:
  - `tracking_token_hash` is NOT in `schemas.ReportResponse` (only the transient `tracking_token` plaintext is returned once upon guest creation).
  - `schemas.ReportTrackResponse` excludes `contact_email`, `contact_phone`, `resident_id`, `claimed_by_user_id`, `tracking_token_hash`, `ai_reasoning`, `citizen_feedback_note`, and `citizen_trust_score`.
  - `schemas.ReportTrackRequest` normalizes ticket IDs and validates token presence.
- **Verdict**: **PASSED**

### 6. [LOW RISK] Optional Authentication Dependency Robustness
- **Assumption challenged**: `auth.get_optional_current_user` never raises 401/403 exceptions on missing or malformed tokens, while correctly resolving valid credentials.
- **Attack scenario**:
  - Passed `None`, `""`, `"   "`, corrupted JWTs, unsigned JWTs, expired JWTs, unverified resident JWTs, and valid Official/Resident JWTs.
- **Empirical result**:
  - Malformed, expired, unverified, and missing tokens cleanly returned `None` (guest mode).
  - Valid Official and verified Resident JWTs resolved accurately to their respective ORM model instances.
- **Verdict**: **PASSED**

---

## Stress Test Results Summary

| Test File | Test Suite | Tests Run | Pass | Fail | Execution Time |
|---|---|---|---|---|---|
| `test_milestone1_schema_security.py` | Model, Schema, Token, Auth & Migration Unit Tests | 26 | 26 | 0 | 0.363s |
| `test_m1_database_challenge.py` | Challenger Adversarial Stress, FK & PG Live Tests | 27 | 27 | 0 | 0.559s |
| **Combined** | **Master Verification & Stress Harness** | **53** | **53** | **0** | **0.922s** |

---

## Final Challenger Verdict

### **VERDICT: APPROVE**

The database schema evolution, dual-dialect migration script, relational constraints, cryptographic security primitives, and optional authentication dependency for Milestone 1 fulfill all functional, architectural, and security requirements outlined in `PROJECT.md` and `ORIGINAL_REQUEST.md`. No blocking bugs, data corruptions, or security vulnerabilities were found.
