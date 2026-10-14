# Milestone 1 Code & Schema Review Report

**Reviewer**: `reviewer_m1_1` (Reviewer & Adversarial Critic)  
**Target Milestone**: Milestone 1 (Database Schema Evolution & Security Primitives)  
**System**: PULSO — Caloocan City Engineering Department Management System  
**Date**: 2026-09-02  
**Verdict**: **APPROVE**

---

## 1. Review Summary

Milestone 1 implements the foundational database schema evolutions, Pydantic validation schemas, cryptographic security primitives (HMAC-SHA256 tracking token generation, normalization, and constant-time verification), optional authentication dependency, and dual-dialect idempotent migration script.

All deliverables conform directly to `ORIGINAL_REQUEST.md`, `PROJECT.md`, and Civic Aperture architecture invariants. Independent execution of the dedicated Milestone 1 test suite (26 tests), the end-to-end open reporting test suite (64 tests), and full backend discovery (90 tests) resulted in **100% test pass rate with 0 failures**.

No integrity violations, fake facades, hardcoded test shortcuts, or unverified claims were detected.

---

## 2. Detailed Findings by Dimension

### 2.1 Correctness & Schema Integrity (Models & Relations)
- **Nullable Resident Association (`resident_id`)**: `models.Report.resident_id` has been updated to `Column(Integer, ForeignKey("residents.id"), nullable=True, index=True)`. This allows guest submissions without orphan record anomalies.
- **Guest Tracking Columns**: All 8 required columns are present with appropriate types, indexes, and nullability constraints:
  1. `reporter_type`: `VARCHAR(20)` (default "registered", `NOT NULL`, indexed)
  2. `tracking_token_hash`: `VARCHAR(128)` (nullable, indexed)
  3. `contact_email`: `VARCHAR(255)` (nullable, indexed)
  4. `contact_phone`: `VARCHAR(50)` (nullable)
  5. `contact_verified`: `BOOLEAN` (default `False`, `NOT NULL`)
  6. `claimed_at`: `DateTime(timezone=True)` (nullable)
  7. `claimed_by_user_id`: `Integer` (`ForeignKey("residents.id")`, nullable, indexed)
  8. `submission_source`: `VARCHAR(30)` (default "web", `NOT NULL`)
- **Relational Integrity & 3NF Conformance**:
  - `Report.claimed_by` and `Resident.claimed_reports` relationship pair cleanly resolves the ambiguity with `Report.reporter` and `Resident.reports` using explicit `foreign_keys`.
  - Derived helper properties `is_claimed` and `reporter_name` operate correctly across both guest, registered, and claimed report states.

### 2.2 Security Primitives & Cryptography
- **CSPRNG Token Generation**: `generate_tracking_token()` uses `secrets.token_hex(8)` formatted as `TRK-XXXX-XXXX-XXXX-XXXX` (64-bit entropy), and `generate_tracking_token_128bit()` uses `secrets.token_hex(16)` (128-bit entropy).
- **Normalization Invariance**: `normalize_tracking_token()` strips whitespace, hyphens, underscores, and `TRK` prefix, ensuring formatting variations (e.g. lowercase, spaces) resolve to canonical uppercase hex.
- **HMAC-SHA256 Salted Hashing**: `hash_tracking_token()` hashes the normalized token using server secrets (`TRACKING_TOKEN_SALT` / `JWT_SECRET_KEY`), never persisting plaintext tracking tokens in the database.
- **Constant-Time Verification**: `verify_tracking_token()` executes `secrets.compare_digest` across lowercased hash representations, providing immunity against sub-microsecond timing side-channel attacks.
- **Zero Hash Leakage & PII Redaction**:
  - `ReportResponse` strictly omits `tracking_token_hash`.
  - `ReportTrackResponse` strictly redacts PII (`resident_id`, `contact_email`, `contact_phone`), internal AI reasoning (`ai_reasoning`, `ai_metadata`), and internal notes, returning only sanitized public fields and timeline items.

### 2.3 Optional Authentication Dependency
- `get_optional_current_user` in `backend/auth.py` utilizes `OAuth2PasswordBearer(auto_error=False)`.
- Correctly parses valid Bearer JWTs to return `Official` or verified `Resident` instances.
- Gracefully handles missing `Authorization` headers, invalid tokens, expired tokens, or unverified resident accounts by returning `None` (guest mode) without throwing HTTP 401/403 exceptions.

### 2.4 Database Migration Robustness
- `backend/migrate_guest_reporting.py` provides idempotent DDL operations across PostgreSQL and SQLite.
- Inspects table metadata via SQLAlchemy Inspector prior to executing `ALTER TABLE ADD COLUMN`.
- Handles `ALTER COLUMN resident_id DROP NOT NULL` on PostgreSQL.
- Creates 5 performance indexes (`ix_reports_reporter_type`, `ix_reports_tracking_token_hash`, `ix_reports_contact_email`, `ix_reports_claimed_by_user_id`, `ix_reports_resident_id`).
- Backfills default values for legacy rows (`reporter_type='registered'`, `submission_source='web'`, `contact_verified=False`).

---

## 3. Verified Claims

| Claim | Verification Method | Result |
|---|---|---|
| `resident_id` is nullable in models and DB | Unit test `test_guest_report_instantiation` + SQL inspection | **PASS** |
| 8 guest tracking fields exist on `Report` model | Inspected `models.py` lines 228-235 | **PASS** |
| Zero leakage of `tracking_token_hash` in responses | Unit test `test_report_response_zero_hash_leakage` & schema inspection | **PASS** |
| PII & internal notes redacted in public tracking | Unit test `test_public_track_response_sanitization` & schema inspection | **PASS** |
| Normalization invariance across token formats | Unit test `test_token_normalization_invariance` (7 variations tested) | **PASS** |
| Constant-time token verification | Inspected `utils/security.py` line 96 (`secrets.compare_digest`) | **PASS** |
| Optional auth returns None on missing/expired JWT | Unit tests `test_missing_header_returns_none`, `test_expired_jwt_returns_none` | **PASS** |
| Migration idempotency across multiple runs | Unit test `test_migration_sqlite_idempotency_and_preservation` | **PASS** |
| 26 dedicated Milestone 1 unit tests | `python -m unittest backend/tests/test_milestone1_schema_security.py` | **PASS (26/26 in 0.370s)** |
| 64 E2E open reporting tests | `python -m unittest backend/tests/test_e2e_open_reporting.py` | **PASS (64/64 in 2.058s)** |
| 90 total backend tests | `python -m unittest discover backend/tests -v` | **PASS (90/90 in 2.416s)** |

---

## 4. Adversarial Stress-Test Findings & Observations

- **Token Collisions**: Stress-tested 10,000 generated tokens with CSPRNG; observed 0 collisions.
- **Empty / Tampered Inputs**: Verified `verify_tracking_token` handles `None`, empty string, whitespace, single-bit modifications, and tampered hex characters without throwing unhandled exceptions.
- **Deprecation Notices (Informational Only)**:
  - `DeprecationWarning: datetime.datetime.utcnow() is deprecated`: Future Python versions recommend `datetime.now(datetime.timezone.utc)`.
  - `DeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated`: Starlette / FastAPI recommends `HTTP_422_UNPROCESSABLE_CONTENT`.
  - These are non-blocking standard library deprecation warnings and do not affect functionality.

---

## 5. Coverage Gaps & Unverified Items

- None for Milestone 1 scope.
- Integration with HTTP routers (`/api/reports`, `/api/reports/track`, `/api/reports/{id}/claim`, `/api/me/reports`) is scheduled for Milestone 2.

---

## 6. Verdict

**APPROVE** — Milestone 1 is verified complete, correct, secure, and ready for Milestone 2 API router implementation.
