# Comprehensive Backend Architecture & Guest Reporting Survey Report

**Date**: 2026-09-02  
**Target System**: PULSO — Caloocan City Engineering Department Management System  
**Working Directory**: `c:\Users\Val\Desktop\PULSO`  
**Focus**: Open Public Guest Reporting, Contextual Authentication, AI Triage Pipeline, and Database Evolution  

---

## Executive Summary

The PULSO backend is built on **FastAPI** with **SQLAlchemy 2.0** ORM, connected to a **PostgreSQL** database (with SQLite local fallback compatibility). The system uses a 3NF normalized schema featuring segregated identity tables (`residents` and `officials`), dynamic RBAC (`system_roles`), incident tickets (`reports`), dispatch work orders (`work_orders`), full lifecycle logs (`process_timelines`), and immutable audit trails (`audit_logs`).

Currently, `POST /api/reports` strictly requires an authenticated Bearer token via `get_current_user`, blocking open civic submissions from unregistered guests. To implement the open public reporting and contextual authentication architecture (R1–R7), the backend requires:
1. **Schema Evolution**: Adding guest tracking columns (`reporter_type`, `tracking_token_hash`, `contact_email`, `contact_phone`, `contact_verified`, `claimed_at`, `claimed_by_user_id`, `submission_source`) to the `reports` table.
2. **Endpoint Refactoring**: Modifying `POST /api/reports` to use optional authentication (`get_optional_current_user`), returning a secure single-use plaintext `tracking_token` for guests while storing its HMAC-SHA256 hash.
3. **Hardened File & Rate Validation**: Enforcing 10MB upload limits, image magic byte / MIME checks, and IP-based sliding window rate limiting.
4. **New Core Endpoints**:
   - `POST /api/reports/track`: Secure tokenized lookup returning public-safe lifecycle progress.
   - `POST /api/reports/{id}/claim`: Authenticated linking of guest reports via matching tracking token.
   - `GET /api/me/reports`: Unified resident dashboard endpoint returning both authored and claimed reports.

---

## 1. Database Engine, Schema Architecture & Migrations

### 1.1 Database Engine & Connection Management
- **ORM**: SQLAlchemy 2.0 (`database.py`) using `declarative_base()`.
- **Database Engine**: PostgreSQL via `psycopg2-binary` (default connection string configured in `.env`: `postgresql://postgres:0428@localhost/pulso_db`).
- **Connection Pooling**: `QueuePool(pool_size=10, max_overflow=20, pool_pre_ping=True, pool_recycle=3600)` with a connection event listener enforcing `SET statement_timeout = '30s'`.
- **SQLite Fallback**: Local development database `pulso.db` exists and remains compatible with SQLAlchemy models.

### 1.2 Identity Segregation & Geographic Normalization
The database follows a strict 3NF normalized design:
- **`districts`**: Caloocan legislative districts (D1: South Caloocan, D2: North Caloocan, D3: Far North Caloocan).
- **`barangays`**: Authoritative list of Caloocan barangays linked to `districts.id`.
- **`residents`**: Citizen accounts with `trust_score`, `kyc_level`, and `is_verified` flags.
- **`officials`**: LGU personnel accounts linked to `system_roles.id`, with `primary_jurisdiction` and `account_type`.
- **`reports`**: Main incident reporting table linked to `residents.id` via `resident_id` and `barangays.id` via `barangay_id`.
- **`process_timelines`**: Immutable lifecycle transition log for reports, work orders, and projects with an `is_public` boolean flag for citizen visibility.
- **`audit_logs`**: Immutable event-triggered audit log recording all administrative, state, and claim transitions.

### 1.3 Existing Migration Framework
- **Alembic**: Configured in `backend/alembic.ini` and `backend/alembic/env.py`. Revisions:
  - `23c829162372_initial_complete_schema.py`
  - `da48716fc54d_3nf_normalization_sync.py`
  - `676539ba1680_finalize_architecture.py`
  - `add_agent_locations.py`
- **Migration Scripts**: Standalone idempotent migration scripts in `backend/` (`migrate_segregated_schema.py`, `migrate_rbac_v2.py`, etc.) executing raw DDL via `psycopg2`.

---

## 2. Report Model Analysis & Schema Changes for Guest Reporting

### 2.1 Current `models.Report` Field Map
| Field Name | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | Integer | PK, index=True | Internal primary key |
| `ticket_id` | String | Unique, index=True, default=`generate_ticket_id` | Public ticket ID (`RPT-YYYYMMDD-HEX8`) |
| `resident_id` | Integer | FK(`residents.id`), nullable=True | Submitting resident ID |
| `category` | String | index=True, nullable=False | Infrastructure category |
| `description` | String | nullable=False | Citizen issue description |
| `location_lat` | Float | nullable=True | GPS Latitude |
| `location_lng` | Float | nullable=True | GPS Longitude |
| `location_string` | String | nullable=True | Reverse-geocoded address string |
| `status` | String | index=True, default="pending" | Lifecycle status |
| `image_url` | String | nullable=True | Uploaded evidence image relative URL |
| `resolution_image_url` | String | nullable=True | Completion photo uploaded by field crew |
| `ai_category` | String | index=True, nullable=True | Gemini-inferred category |
| `ai_urgency` | String | index=True, nullable=True | Urgency level (`Low`, `Medium`, `High`, `Critical`) |
| `ai_summary` | String | nullable=True | One-line dispatcher summary |
| `ai_reasoning` | String | nullable=True | AI explanation of severity |
| `severity_score` | Float | default=0.0 | Numeric severity score (0.0 to 10.0) |
| `ai_metadata` | JSON | nullable=True | Full Gemini structured JSON analysis |
| `location_barangay` | String | index=True, nullable=True | Detected barangay name |
| `cluster_id` | Integer | nullable=True | Geospatial deduplication cluster ID |
| `citizen_trust_score` | Integer | default=0 | Reporter trust score at time of submission |
| `kyc_tier_at_report` | String | nullable=True | Reporter KYC level at time of submission |
| `barangay_id` | Integer | FK(`barangays.id`), nullable=True, index=True | Canonical barangay ID |
| `budget` | Float | nullable=True | Allocated repair budget in PHP |
| `deployment_date` | DateTime(tz) | nullable=True | Scheduled crew deployment |
| `created_at` | DateTime(tz) | server_default=func.now() | Creation timestamp |
| `updated_at` | DateTime(tz) | onupdate=func.now() | Last update timestamp |
| `citizen_confirmed_at` | DateTime(tz) | nullable=True | Resident confirmation timestamp |
| `satisfaction_rating` | Integer | nullable=True | Citizen feedback rating (1–5) |
| `citizen_feedback_note` | String | nullable=True | Citizen closing comment |

### 2.2 Required New Fields & DDL Migration
To satisfy requirements R1–R5, the following 8 fields must be added to `models.Report`:

```python
# Guest Reporting & Contextual Authentication Extensions
reporter_type       = Column(String(20), default="registered", nullable=False, index=True) # 'guest' | 'registered'
tracking_token_hash = Column(String(128), nullable=True, index=True)                       # HMAC-SHA256 hash
contact_email       = Column(String(255), nullable=True, index=True)                       # Optional guest contact email
contact_phone       = Column(String(50), nullable=True)                                    # Optional guest contact phone
contact_verified     = Column(Boolean, default=False, nullable=False)                       # Verification flag (e.g. OTP)
claimed_at          = Column(DateTime(timezone=True), nullable=True)                       # Timestamp when claimed
claimed_by_user_id  = Column(Integer, ForeignKey("residents.id"), nullable=True, index=True) # Linked resident ID
submission_source   = Column(String(30), default="web", nullable=False)                    # 'web' | 'mobile' | 'assisted'
```

### 2.3 SQL Migration Script (PostgreSQL / SQLite Compatible)
```sql
-- Migration: Add Guest Reporting and Contextual Auth Fields to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_type VARCHAR(20) DEFAULT 'registered';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS tracking_token_hash VARCHAR(128);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS contact_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS claimed_by_user_id INTEGER REFERENCES residents(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS submission_source VARCHAR(30) DEFAULT 'web';

CREATE INDEX IF NOT EXISTS ix_reports_reporter_type ON reports(reporter_type);
CREATE INDEX IF NOT EXISTS ix_reports_tracking_token_hash ON reports(tracking_token_hash);
CREATE INDEX IF NOT EXISTS ix_reports_contact_email ON reports(contact_email);
CREATE INDEX IF NOT EXISTS ix_reports_claimed_by_user_id ON reports(claimed_by_user_id);
```

---

## 3. Secure Token Generation & Hashing Architecture

### 3.1 Token Format and Entropy
- **Entropy Requirement**: 128 bits of cryptographic randomness generated via Python's `secrets` module.
- **Format**: Structured uppercase alphanumeric token with clean chunking for high readability and mobile entry:
  `TRK-XXXX-XXXX-XXXX-XXXX` (16 hexadecimal characters formatted into 4 blocks).
  Example: `TRK-8F3D-9A2C-7E1B-4F0A`.

### 3.2 Hashing Algorithm & Comparison
- **Algorithm**: **HMAC-SHA256** keyed with the server's `JWT_SECRET_KEY` (or dedicated `TRACKING_TOKEN_SALT`).
- **Constant-Time Verification**: Uses `hmac.compare_digest()` to prevent timing side-channel attacks.
- **Input Normalization**: Strips spaces, dashes, and casing prior to hashing so `trk-8f3d9a2c...` and `TRK-8F3D-9A2C...` resolve identically.

```python
import hashlib
import hmac
import secrets
import os

def generate_tracking_token() -> str:
    """Generates a 128-bit cryptographic tracking token formatted as TRK-XXXX-XXXX-XXXX-XXXX."""
    raw = secrets.token_hex(8).upper() # 16 hex chars
    return f"TRK-{raw[:4]}-{raw[4:8]}-{raw[8:12]}-{raw[12:16]}"

def hash_tracking_token(token: str) -> str:
    """Generates an HMAC-SHA256 hash of the normalized tracking token."""
    if not token:
        return ""
    normalized = token.strip().replace("-", "").upper()
    secret = os.getenv("JWT_SECRET_KEY", "PULSO_CORE_ENGINE_DEV_SECURE_TOKEN_2024_LGU_CALOOCAN").encode("utf-8")
    return hmac.new(secret, normalized.encode("utf-8"), hashlib.sha256).hexdigest()

def verify_tracking_token(provided_token: str, stored_hash: str) -> bool:
    """Verifies a user-supplied token against stored hash using constant-time comparison."""
    if not provided_token or not stored_hash:
        return False
    computed_hash = hash_tracking_token(provided_token)
    return hmac.compare_digest(computed_hash, stored_hash)
```

---

## 4. `POST /api/reports` Endpoint & AI Triage Pipeline

### 4.1 Current Implementation & Flaws
- **Current Signature**:
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
      current_user: Union[models.Official, models.Resident] = Depends(get_current_user) # BLOCKS GUESTS
  )
  ```
- **Flaws & Security Gaps**:
  1. `Depends(get_current_user)` immediately raises `401 Unauthorized` if no valid JWT header is present.
  2. No MIME type checking or magic byte inspection on `image: UploadFile`.
  3. No file size ceiling (susceptible to disk exhaustion / memory DOS).
  4. No rate limiting on unauthenticated report submissions.

### 4.2 Required Refactoring for Open Guest Reporting
1. **Optional User Dependency**:
   ```python
   oauth2_optional_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

   def get_optional_current_user(
       token: Optional[str] = Depends(oauth2_optional_scheme),
       db: Session = Depends(get_db)
   ) -> Optional[Union[models.Official, models.Resident]]:
       if not token:
           return None
       try:
           payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
           email: str = payload.get("sub")
           if not email:
               return None
           user = db.query(models.Official).filter(models.Official.email == email).first()
           if user: return user
           user = db.query(models.Resident).filter(models.Resident.email == email).first()
           return user if user and user.is_verified else None
       except JWTError:
           return None
   ```
2. **Form Parameter Additions**:
   - `contact_email: Optional[str] = Form(None)`
   - `contact_phone: Optional[str] = Form(None)`
   - `submission_source: Optional[str] = Form("web")`
3. **Upload Validation & Hardening**:
   - Limit file size to 10 MB:
     ```python
     MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB
     ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
     ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
     ```
   - Validate image magic bytes using `PIL.Image.open` or header checks.
4. **AI Triage Integration**:
   - Multi-modal analysis via `gemini_service.analyze_report(description, image_data=image_bytes)`.
   - Rejects inappropriate submissions (selfies, memes, abuse) with `HTTP 400 Bad Request`.
   - Inactive or rate-limited Vertex AI falls back cleanly to `_local_safety_check`.
   - Guest reports receive the exact same AI classification, severity scoring, and dispatcher prioritization as registered reports.
5. **Geospatial Processing**:
   - Caloocan border validation via `is_in_caloocan(lat, lng)`.
   - Reverse geocoding via `maps_service.reverse_geocode`.
   - Deduplication clustering via `deduplication_service.cluster_reports`.
6. **Return Payload**:
   - For guest submissions: Generates plaintext `tracking_token`, stores `tracking_token_hash`, and returns `tracking_token` in response.
   - For registered submissions: `tracking_token` is returned or null, `resident_id = current_user.id`, `reporter_type = "registered"`.

---

## 5. Integration Architecture: Tracking, Claiming, and "My Reports"

### 5.1 `POST /api/reports/track` (Public Tracking API)
- **Authentication**: None required (Public).
- **Rate Limit**: Max 15 requests / min per IP address to prevent brute-force token enumeration.
- **Request Schema**:
  ```python
  class ReportTrackRequest(BaseModel):
      ticket_id: str
      tracking_code: str
  ```
- **Lookup & Validation Logic**:
  1. Query `models.Report` by `ticket_id = payload.ticket_id.strip()`.
  2. If not found: return `HTTP 404 Not Found` with generic message: `"Report not found or invalid tracking credentials"`.
  3. Verify `verify_tracking_token(payload.tracking_code, report.tracking_token_hash)`.
  4. If invalid: return `HTTP 403 Forbidden` with identical generic timing message.
- **Public-Safe Response Schema**:
  Returns sanitized public fields and filtered timeline entries (`is_public == True`):
  ```python
  class PublicTimelineItem(BaseModel):
      status: str
      note: Optional[str] = None
      created_at: datetime

  class ReportTrackResponse(BaseModel):
      ticket_id: str
      category: str
      description: str
      status: str
      location_barangay: Optional[str] = None
      location_string: Optional[str] = None
      image_url: Optional[str] = None
      resolution_image_url: Optional[str] = None
      created_at: datetime
      updated_at: Optional[datetime] = None
      is_claimed: bool
      timeline: List[PublicTimelineItem]
  ```

### 5.2 `POST /api/reports/{id}/claim` (Contextual Claiming API)
- **Authentication**: Required (`current_user = Depends(get_current_user)` where `role == "resident"`).
- **Request Schema**:
  ```python
  class ReportClaimRequest(BaseModel):
      tracking_code: str
  ```
- **Claim Logic**:
  1. Retrieve report by ID (or `ticket_id`).
  2. If report is already linked to `current_user.id`: return success (`"Report is already linked to your account"`).
  3. If report is already claimed by another user (`claimed_by_user_id is not None and claimed_by_user_id != current_user.id`): return `HTTP 409 Conflict` (`"This report has already been claimed by another account"`).
  4. If report was submitted as `registered` by a different user (`resident_id is not None and resident_id != current_user.id and reporter_type == 'registered'`): return `HTTP 403 Forbidden`.
  5. Validate `verify_tracking_token(payload.tracking_code, report.tracking_token_hash)`. If mismatch: return `HTTP 403 Forbidden` (`"Invalid tracking code for this report"`).
  6. Execute atomic claim update:
     - `report.claimed_by_user_id = current_user.id`
     - `report.claimed_at = func.now()`
     - If `report.resident_id is None`: `report.resident_id = current_user.id`
  7. Audit Trail & Timeline:
     - Insert `gov_models.AuditLog(trigger_type="report_claim", actor_id=current_user.id, action=f"Guest report {report.ticket_id} claimed by resident {current_user.email}")`.
     - Insert `gov_models.ProcessTimeline(report_id=report.id, status=report.status, actor_id=current_user.id, actor_role="resident", note=f"Linked to citizen account ({current_user.full_name})", is_public=False)`.
     - Insert `models.Notification(resident_id=current_user.id, title="Report Claimed", message=f"Ticket {report.ticket_id} has been added to your PULSO dashboard.")`.
  8. Commit transaction and return updated report.

### 5.3 `GET /api/me/reports` (Unified Resident Report Management)
- **Authentication**: Required (`current_user = Depends(get_current_user)`).
- **Query Parameters**:
  - `status`: Optional[str] filter (`all`, `active`, `resolved`, `needs_info`).
  - `skip`: int = 0
  - `limit`: int = 50
- **Filter Query**:
  ```python
  query = db.query(models.Report).filter(
      or_(
          models.Report.resident_id == current_user.id,
          models.Report.claimed_by_user_id == current_user.id
      )
  )
  if status == "active":
      query = query.filter(models.Report.status.in_(["received", "pending", "validated", "approved_internal", "dispatched", "in_progress"]))
  elif status == "resolved":
      query = query.filter(models.Report.status.in_(["resolved", "closed"]))
  elif status in ["needs_info", "needs_information"]:
      query = query.filter(models.Report.status.in_(["needs_info", "needs_clarification", "rejected"]))
  
  reports = query.order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()
  ```

---

## 6. Testing Framework & Execution Analysis

### 6.1 Current Test Infrastructure
The backend repository contains 25+ standalone test scripts under `backend/` and `backend/scripts/`:
- `test_gov_endpoints.py`: Functional test script testing HTTP endpoints against `http://localhost:33159`.
- `test_crud_direct.py`: Direct database ORM test querying `SessionLocal()`.
- `test_dispatch_logic.py`: Verification of territorial dispatch rules and emergency priorities.
- `test_pydantic_validation.py`: Pydantic schema validation tests.
- `test_ocr.py` & `test_id_parsers.py`: PhilSys / ID parser unit tests.

### 6.2 Recommended Test Harness for Open Guest Reporting
- Use FastAPI's `TestClient` (`starlette.testclient.TestClient` / `httpx`) with an in-memory SQLite or test PostgreSQL database session.
- Implement comprehensive test suites covering:
  1. Unauthenticated `POST /api/reports` returns valid `ticket_id` and plaintext `tracking_token`, with `reporter_type='guest'` in DB.
  2. Tracking query with valid ticket ID + correct code returns 200 with public sanitized schema.
  3. Tracking query with incorrect code or non-existent ticket returns safe 403/404 without information disclosure.
  4. Claiming guest report with valid tracking code links account and records audit history.
  5. Claiming with invalid code returns 403 Forbidden.
  6. Double claiming by another user returns 409 Conflict.
  7. `GET /api/me/reports` returns both authored and claimed tickets.
  8. Oversized (>10MB) or non-image uploads are rejected with 413 / 400.

---

## 7. Actionable Implementation Blueprint for Subsequent Work

1. **Step 1 — Database & Models**:
   - Update `backend/models.py` with 8 new fields on `Report`.
   - Update `backend/schemas.py` with `ReportCreate`, `ReportResponse`, `ReportTrackRequest`, `ReportTrackResponse`, `ReportClaimRequest`.
   - Execute database migration script (`backend/migrate_guest_reporting.py`).
2. **Step 2 — Security & Helpers**:
   - Add `generate_tracking_token`, `hash_tracking_token`, `verify_tracking_token` in `backend/auth.py` or `backend/utils/security.py`.
   - Add `get_optional_current_user` in `backend/auth.py`.
3. **Step 3 — Endpoint Implementation in `main.py`**:
   - Refactor `POST /api/reports` for guest + registered dual mode with file validation.
   - Implement `POST /api/reports/track`.
   - Implement `POST /api/reports/{report_id}/claim`.
   - Implement `GET /api/me/reports`.
4. **Step 4 — Verification**:
   - Run end-to-end Python integration test verifying open reporting, tracking, claiming, and dashboard views.
