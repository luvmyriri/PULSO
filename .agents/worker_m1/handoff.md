# Milestone 1 Implementation Handoff Report: Database Schema Expansion, Security Primitives & Migration

**Worker Agent**: `worker_m1` (Implementer, QA, Specialist)  
**Target System**: PULSO — Caloocan City Engineering Department Management System  
**Working Directory**: `c:\Users\Val\Desktop\PULSO\.agents\worker_m1`  
**Date**: 2026-09-02  
**Status**: COMPLETE (100% Tests Passing, Verified on PostgreSQL and SQLite)

---

## 1. Observation

Direct observations and execution outputs across the modified codebase:

### 1.1 Modified Files & Deliverables
1. **`backend/models.py`** (Lines 120-125, 218-285):
   - `resident_id`: Updated from `Column(Integer, ForeignKey("residents.id"), nullable=True)` to `Column(Integer, ForeignKey("residents.id"), nullable=True, index=True)`.
   - Added 8 guest tracking and claiming columns:
     - `reporter_type = Column(String(20), default="registered", nullable=False, index=True)`
     - `tracking_token_hash = Column(String(128), nullable=True, index=True)`
     - `contact_email = Column(String(255), nullable=True, index=True)`
     - `contact_phone = Column(String(50), nullable=True)`
     - `contact_verified = Column(Boolean, default=False, nullable=False)`
     - `claimed_at = Column(DateTime(timezone=True), nullable=True)`
     - `claimed_by_user_id = Column(Integer, ForeignKey("residents.id"), nullable=True, index=True)`
     - `submission_source = Column(String(30), default="web", nullable=False)`
   - Added `is_claimed` property and updated `reporter_name` social fallback property.
   - Added `claimed_by = relationship("Resident", foreign_keys=[claimed_by_user_id], back_populates="claimed_reports")` on `Report` and `claimed_reports = relationship("Report", foreign_keys="[Report.claimed_by_user_id]", back_populates="claimed_by")` on `Resident`.

2. **`backend/schemas.py`** (Lines 129-234):
   - `ReportBase`: Added `contact_email`, `contact_phone`, and `submission_source`.
   - `ReportCreate`: Added `reporter_type: Optional[str] = "registered"`.
   - `ReportResponse`: Added `reporter_type`, `contact_verified`, `claimed_at`, `claimed_by_user_id`, `is_claimed`, `tracking_token`, `tracking_url`. Confirmed **`tracking_token_hash` is strictly excluded from output schema**.
   - Added `PublicTimelineItem`, `ReportTrackRequest` (with normalization and `get_token()`), `ReportTrackResponse` (redacted PII/internal notes), `ReportClaimRequest` (with `get_token()`), `ReportClaimResponse`, and `UserReportsResponse`.

3. **`backend/utils/security.py` & `backend/auth.py`**:
   - `generate_tracking_token() -> str`: Generates CSPRNG token in format `TRK-XXXX-XXXX-XXXX-XXXX` (16 uppercase hex chars, 64-bit entropy).
   - `generate_tracking_token_128bit() -> str`: Generates 128-bit CSPRNG token in 4 chunks of 8 chars.
   - `normalize_tracking_token(token) -> str`: Normalizes whitespace, hyphens, underscores, casing, and strips `TRK` prefix.
   - `hash_tracking_token(token, secret_key) -> str`: Produces deterministic 64-char HMAC-SHA256 digest keyed with `TRACKING_TOKEN_SALT`/`JWT_SECRET_KEY`.
   - `verify_tracking_token(provided_token, stored_hash, secret_key) -> bool`: Constant-time verification using `secrets.compare_digest`.
   - `get_optional_current_user(...) -> Optional[Union[models.Official, models.Resident]]`: FastAPI dependency with `auto_error=False` returning authenticated user or `None` without raising HTTP 401.

4. **`backend/migrate_guest_reporting.py`**:
   - Idempotent dual-dialect migration script supporting PostgreSQL and SQLite.
   - Adds 8 missing columns with dialect-appropriate definitions, updates nullability, creates 5 performance indexes, and backfills default values for legacy rows.

5. **`backend/tests/test_milestone1_schema_security.py`**:
   - 26 unit test methods covering:
     - Model instantiation, foreign keys, claiming, and properties (4 tests)
     - Pydantic schema validation, zero hash leakage, and PII redaction (7 tests)
     - Token generation, hashing determinism, normalization invariance, constant-time verification, and edge cases (8 tests)
     - Optional authentication middleware with valid/expired/garbage JWTs and guest mode (6 tests)
     - Database migration idempotency and legacy row preservation across SQLite/PostgreSQL (1 test)

### 1.2 Verbatim Test & Migration Tool Outputs

**Database Migration Execution Output (`python backend/migrate_guest_reporting.py`):**
```text
2026-09-02 17:50:48,887 [INFO] Inspected 'reports' table: 38 existing columns found.

=================================================================
  PULSO -- DB Migration: Guest Reporting & Contextual Auth
  Target Engine Dialect: POSTGRESQL
=================================================================

--- 1. Column Synchronization ---
  [EXISTS] Column 'reporter_type' already present
  [EXISTS] Column 'tracking_token_hash' already present
  [EXISTS] Column 'contact_email' already present
  [EXISTS] Column 'contact_phone' already present
  [EXISTS] Column 'contact_verified' already present
  [EXISTS] Column 'claimed_at' already present
  [EXISTS] Column 'claimed_by_user_id' already present
  [EXISTS] Column 'submission_source' already present

--- 2. Foreign Key & Nullability Verification ---
  [OK] Verified 'resident_id' is nullable

--- 3. Performance Indexes ---
  [INDEX] ix_reports_reporter_type verified
  [INDEX] ix_reports_tracking_token_hash verified
  [INDEX] ix_reports_contact_email verified
  [INDEX] ix_reports_claimed_by_user_id verified
  [INDEX] ix_reports_resident_id verified

--- 4. Legacy Data Sanitization & Backfill ---
  [BACKFILL] Legacy reports backfilled with default values
=================================================================
  Migration completed successfully. Schema is in sync.
=================================================================
```

**Unit Test Suite Output (`python backend/tests/test_milestone1_schema_security.py`):**
```text
Ran 26 tests in 0.387s

OK
```

**Full Backend Test Discovery Output (`python -m unittest discover backend/tests -v`):**
```text
Ran 90 tests in 2.451s

OK
```

---

## 2. Logic Chain

1. **Step 1 — Nullable Resident ID & Discriminator**: By modifying `resident_id` in `models.Report` to `nullable=True, index=True` and introducing `reporter_type = 'guest' | 'registered'`, PULSO models can store unauthenticated citizen reports without violating foreign key constraints or orphan record restrictions.
2. **Step 2 — Zero Plaintext Persistence**: By storing only `tracking_token_hash` (computed via HMAC-SHA256 keyed with server secrets) and strictly excluding `tracking_token_hash` from `ReportResponse` and `ReportTrackResponse`, plaintext tokens and internal hashes can never be leaked to clients, logs, or unauthorized endpoints.
3. **Step 3 — Timing Side-Channel Immunity**: Constant-time comparison using Python standard `secrets.compare_digest` prevents sub-microsecond latency profiling attacks during token validation on public lookup endpoints.
4. **Step 4 — Dual Intake Auth Dependency**: `get_optional_current_user` uses `OAuth2PasswordBearer(auto_error=False)` so that requests without `Authorization` headers or with invalid tokens gracefully resolve to `None` (guest mode), enabling unified `/api/reports` endpoints in subsequent milestones.
5. **Step 5 — Migration Idempotency & Multi-Engine Parity**: `migrate_guest_reporting.py` inspects schema metadata before DDL execution, allowing safe execution on production PostgreSQL as well as in-memory SQLite instances during test runs without schema conflicts.

---

## 3. Caveats

- **Frontend Integration**: Milestone 1 implements backend schema, security helpers, models, and migration scripts. Frontend components (`/report`, `/track`, `/report/success`) and REST router endpoints (`/api/reports`, `/api/reports/track`, `/api/reports/{id}/claim`) will consume these schemas and helpers in Milestone 2 and Milestone 3.
- **Production Secret Key**: In production environments, `TRACKING_TOKEN_SALT` and `JWT_SECRET_KEY` must be populated via secure environment variables rather than the development fallback key.

---

## 4. Conclusion

Milestone 1 is complete, verified, and passes 100% of unit tests and regression tests across both PostgreSQL and SQLite. The database models, Pydantic schemas, cryptographic token primitives, optional authentication dependency, and idempotent migration script are fully operational and ready for Milestone 2 API routing integration.

---

## 5. Verification Method

To independently reproduce and verify all results:

```bash
# 1. Run Milestone 1 dedicated unit test suite (26 tests)
python backend/tests/test_milestone1_schema_security.py

# 2. Run all backend tests
python -m unittest discover backend/tests -v

# 3. Run database migration against live or test database
python backend/migrate_guest_reporting.py
```
