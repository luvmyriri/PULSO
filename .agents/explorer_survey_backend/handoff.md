# Handoff Report: Backend Architecture & Guest Reporting Survey

**Agent**: Backend Explorer (`explorer_survey_backend`)  
**Date**: 2026-09-02  
**Working Directory**: `c:\Users\Val\Desktop\PULSO\.agents\explorer_survey_backend`  
**Target Codebase**: `backend/` in `c:\Users\Val\Desktop\PULSO`  

---

## 1. Observation

1. **Database Engine & Connection**:
   - `backend/database.py:10`: `DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/pulso_db")`
   - `backend/.env:21`: `DATABASE_URL=postgresql://postgres:0428@localhost/pulso_db`
   - `backend/database.py:12-20`: `QueuePool(pool_size=10, max_overflow=20, pool_pre_ping=True, pool_recycle=3600)`
   - PostgreSQL is the primary database with SQLAlchemy 2.0 ORM; SQLite database `pulso.db` exists in `backend/` for development fallback.

2. **Existing Report Model Schema**:
   - `backend/models.py:217-277`: `Report` class contains:
     - `id = Column(Integer, primary_key=True, index=True)`
     - `ticket_id = Column(String, unique=True, index=True, default=generate_ticket_id)`
     - `resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)`
     - `category`, `description`, `location_lat`, `location_lng`, `location_string`, `status` (default="pending"), `image_url`, `resolution_image_url`
     - AI fields: `ai_category`, `ai_urgency`, `ai_summary`, `ai_reasoning`, `severity_score`, `ai_metadata`
     - Operational fields: `location_barangay`, `cluster_id`, `citizen_trust_score`, `kyc_tier_at_report`, `barangay_id`, `budget`, `deployment_date`, `created_at`, `updated_at`, `citizen_confirmed_at`, `satisfaction_rating`, `citizen_feedback_note`
   - Currently, there are NO columns for `reporter_type`, `tracking_token_hash`, `contact_email`, `contact_phone`, `contact_verified`, `claimed_at`, `claimed_by_user_id`, or `submission_source`.

3. **Current Report Submission Endpoint**:
   - `backend/main.py:956-966`:
     ```python
     @app.post("/api/reports", response_model=schemas.ReportResponse)
     async def create_new_report(
         category: str = Form(...),
         description: str = Form(...),
         lat: Optional[float] = Form(None),
         lng: Optional[float] = Form(None),
         location_string: Optional[str] = Form(None),
         image: Optional[UploadFile] = File(None),
         db: Session = Depends(get_db),
         current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
     )
     ```
   - Line 965 enforces `Depends(get_current_user)`, returning `401 Unauthorized` for any unauthenticated request.
   - Lines 1006-1021 write uploaded file directly to `UPLOAD_DIR` without checking file size or validating MIME type.
   - Line 1024 calls `gemini_service.analyze_report(description, image_data=image_bytes)` synchronously.
   - Lines 1027-1032 reject inappropriate content flagged by AI with `HTTP 400 Bad Request`.
   - Line 1050 calls `crud.create_report(db, report_dto, resident_id=current_user.id, ai_analysis=ai_analysis)`.

4. **Tracking & Claiming Endpoints**:
   - `backend/main.py`: Currently lacks `POST /api/reports/track`, `POST /api/reports/{id}/claim`, and `GET /api/me/reports`.
   - `backend/main.py:862`: Contains `GET /api/reports/user/{user_id}` which checks `current_user.id != user_id`.
   - `backend/main.py:904-915`: `GET /api/reports/{report_id}` forbids residents if `db_report.resident_id != current_user.id`, not accounting for `claimed_by_user_id`.

5. **Lifecycle & Audit Models**:
   - `backend/gov_models.py:164-188`: `AuditLog` table with `trigger_type`, `report_id`, `actor_id`, `action`, `details`, `created_at`.
   - `backend/gov_models.py:194-221`: `ProcessTimeline` table with `report_id`, `status`, `previous_status`, `actor_id`, `actor_role`, `note`, `is_public` (default=True), `created_at`.

6. **Authentication & Cryptography**:
   - `backend/auth.py:1-98`: Uses `python-jose` (HS256) with `SECRET_KEY = os.getenv("JWT_SECRET_KEY", ...)`.
   - `bcrypt` and `passlib` are installed and used for password hashing.
   - Python standard library `secrets`, `hashlib`, and `hmac` are available for cryptographic operations.

7. **Testing Infrastructure**:
   - `backend/test_gov_endpoints.py`, `backend/test_crud_direct.py`, `backend/test_dispatch_logic.py`, `backend/test_pydantic_validation.py` are executable with `python test_xxx.py`.

---

## 2. Logic Chain

1. **Supporting Unauthenticated Reporting (R1, R2)**:
   - *From Observation 3*: `POST /api/reports` blocks unauthenticated users via `Depends(get_current_user)`.
   - *Inference*: We must replace this dependency with `get_optional_current_user` using `OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)` so guest requests proceed with `current_user = None`.
   - *From Observation 2*: When `current_user` is `None`, `resident_id` is set to `None`, `reporter_type` is set to `'guest'`, and a cryptographic tracking token is generated and returned in the HTTP response while its HMAC-SHA256 hash is saved to `tracking_token_hash`.

2. **Secure Token Handling (R2, R3, R4)**:
   - *From Observation 6*: Standard HMAC-SHA256 keyed with the server secret key (`JWT_SECRET_KEY`) provides tamper-proof, one-way hash protection against database exfiltration.
   - *Inference*: Using `secrets.token_hex(8)` generates 128 bits of entropy. Formatted as `TRK-XXXX-XXXX-XXXX-XXXX`, it is user-readable. Using `hmac.compare_digest()` guarantees constant-time comparison during tracking and claiming.

3. **Secure Public Tracking (R3)**:
   - *From Observation 5*: `ProcessTimeline` already supports `is_public` filtering.
   - *Inference*: `POST /api/reports/track` accepts `{ ticket_id, tracking_code }`, validates the tracking code against `tracking_token_hash`, and queries `ProcessTimeline` for `is_public == True` entries while stripping reporter identity, staff notes, and internal AI reasoning.

4. **Contextual Account Claiming (R4, R5)**:
   - *From Observation 2 & 5*: Claiming an unclaimed guest report requires an authenticated resident (`Depends(get_current_user)`).
   - *Inference*: `POST /api/reports/{id}/claim` verifies the tracking code, links `claimed_by_user_id = current_user.id`, sets `claimed_at = func.now()`, writes an immutable `AuditLog` entry, and appends a `ProcessTimeline` event.
   - *From Observation 4*: `GET /api/me/reports` queries `(resident_id == user.id) | (claimed_by_user_id == user.id)` with status filters (`all`, `active`, `resolved`, `needs_info`).

---

## 3. Caveats

1. **Database Runtime Migration**: In local development without an active PostgreSQL instance running on port 5432, migrations must be executable against both PostgreSQL (via psycopg2) and SQLite (via SQLAlchemy DDL) to preserve testability.
2. **AI Rate Limiting**: If Google Vertex AI quota is exhausted or credentials are not configured, `gemini_service.py` falls back to `_local_safety_check`, ensuring guest report creation does not fail.
3. **No caveats** regarding core backend architecture or schema integrity.

---

## 4. Conclusion

The PULSO backend architecture is fully prepared to support open guest reporting and contextual authentication with zero disruption to the existing 3NF normalized schema, GIS mapping, AI triage pipeline, or staff dispatch operations.

Specific requirements for implementation:
- Add 8 fields (`reporter_type`, `tracking_token_hash`, `contact_email`, `contact_phone`, `contact_verified`, `claimed_at`, `claimed_by_user_id`, `submission_source`) to `models.Report`.
- Refactor `POST /api/reports` with `get_optional_current_user`, 10MB upload limits, and image verification.
- Add `POST /api/reports/track`, `POST /api/reports/{id}/claim`, and `GET /api/me/reports`.
- Implement HMAC-SHA256 tracking token generation and verification.

All detailed schemas, SQL statements, and endpoint designs are documented in `.agents/explorer_survey_backend/report.md`.

---

## 5. Verification Method

To independently verify this survey and future backend implementations:

1. **Schema Inspection**:
   - Inspect `backend/models.py:217-277` to verify existing `Report` columns.
   - Inspect `backend/alembic/versions/` for migration history.
2. **Endpoint Behavior Verification**:
   - Inspect `backend/main.py:956` to verify current dependency `Depends(get_current_user)`.
3. **Automated Test Execution**:
   - Run Python test commands:
     ```powershell
     python backend/test_pydantic_validation.py
     python backend/test_dispatch_logic.py
     ```
   - Build a comprehensive integration test verifying guest submission, tracking lookup, and contextual claiming using FastAPI `TestClient`.
