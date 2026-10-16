# Milestone 2 Endpoint Verification Test Specifications
**Author**: Endpoint Verification Explorer (`explorer_m2_3`)  
**Target Milestone**: Milestone 2 (Backend Endpoints: Intake, Tracking, Claiming, Unified My Reports)  
**Applicable Authority**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_READY.md`, `backend/tests/test_e2e_open_reporting.py`  
**System Target**: PULSO — City Engineering Department Management System (Caloocan City)

---

## 1. Executive Summary

Milestone 2 operationalizes the open public reporting and contextual authentication architecture for PULSO. This specification defines the exact **Unit** and **Integration** verification test suites for the four core Milestone 2 API endpoints:
1. `POST /api/reports`: Dual guest & authenticated intake with file security, geo-boundary enforcement, AI triage, and token issuance.
2. `POST /api/reports/track`: Token-verified public lifecycle lookup with anti-enumeration protection and strict PII/internal operational data redaction.
3. `POST /api/reports/{id}/claim`: Authenticated resident claim of guest reports with constant-time cryptographic proof of ownership, conflict protection, and immutable audit logging.
4. `GET /api/me/reports`: Unified resident portfolio query aggregating authored and claimed reports with multi-state status filtering and pagination.

All test designs enforce deterministic isolation using in-memory SQLite (`StaticPool`), zero database pollution, strict RFC/HTTP status compliance, and cryptographic verification integrity.

---

## 2. Interface Contracts & Verification Specifications

### 2.1 Endpoint 1: `POST /api/reports` (Intake)

#### 2.1.1 Contract Specification
- **Method / Route**: `POST /api/reports`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Optional Bearer JWT (`get_optional_current_user`).
  - *Guest Mode*: Missing or invalid `Authorization` header -> `resident_id = None`, `reporter_type = 'guest'`.
  - *Registered Mode*: Valid Bearer JWT -> `resident_id = current_user.id`, `reporter_type = 'registered'`.

#### 2.1.2 Request Fields
| Field Name | Type | Required? | Validation Rule |
|---|---|---|---|
| `category` | String Form | **Yes** | Non-empty string (e.g. "Roads & Bridges", "Drainage & Flood Control", "Streetlights") |
| `description` | String Form | **Yes** | Minimum 10 characters, maximum 5000 characters; whitespace-trimmed |
| `lat` | Float Form | **Yes** | Must be within Caloocan City polygon borders (`is_in_caloocan(lat, lng) == True`) |
| `lng` | Float Form | **Yes** | Must be within Caloocan City polygon borders (`is_in_caloocan(lat, lng) == True`) |
| `location_string` | String Form | Optional | Free text address or landmark (defaults to coordinate string if missing) |
| `location_barangay`| String Form | Optional | Canonical Barangay name (e.g., "Barangay 171") |
| `contact_email` | String Form | Optional | Valid email format (RFC 5322) |
| `contact_phone` | String Form | Optional | Philippine mobile/landline format (e.g., "09171234567") |
| `submission_source`| String Form | Optional | Default: "web" ("web", "mobile", "assisted") |
| `image` | Binary File | Optional | Maximum 10MB (10,485,760 bytes); Magic byte verification for JPEG (`\xFF\xD8\xFF`), PNG (`\x89PNG\r\n\x1a\n`), or WebP (`RIFF...WEBP`) |

#### 2.1.3 Response Specification
- **Success Status**: `201 Created`
- **Response Headers**: `Content-Type: application/json`
- **Success Payload Schema**:
```json
{
  "id": 142,
  "ticket_id": "RPT-20260902-8F92E1B4",
  "status": "pending",
  "category": "Roads & Bridges",
  "description": "Deep pothole causing vehicle damage along Congressional Rd.",
  "location_lat": 14.7565,
  "location_lng": 121.0450,
  "location_string": "Congressional Rd, Bagumbong",
  "location_barangay": "Barangay 171",
  "image_url": "/api/uploads/reports/rpt_9a8b7c.jpg",
  "reporter_type": "guest",
  "tracking_token": "TRK-9F83-A8B2-C4E6-10D7",
  "tracking_url": "https://pulso.caloocan.gov.ph/track?id=RPT-20260902-8F92E1B4&code=TRK-9F83-A8B2-C4E6-10D7",
  "created_at": "2026-09-02T09:30:00Z"
}
```

#### 2.1.4 Invariants & Error Rules
1. **Empty / Short Description (<10 chars)**: Returns `422 Unprocessable Entity`.
2. **Oversized Description (>5000 chars)**: Returns `422 Unprocessable Entity`.
3. **Out-of-Bounds Coordinates** (e.g. Manila `14.5995, 120.9842` or QC `14.6500, 121.0500`): Returns `400 Bad Request` with detail explaining jurisdictional boundary limitation.
4. **Duplicate Report Collision**: Active report within 15 meters for the same category returns `409 Conflict` with `X-Canonical-Ticket-ID` header.
5. **File Size > 10MB**: Returns `422 Unprocessable Entity`.
6. **Corrupt / Disguised Image** (e.g. `.exe` or `.pdf` named `.jpg` failing magic byte verification): Returns `422 Unprocessable Entity`.
7. **Plaintext Token Zero-Persistence**: `tracking_token` is returned in response but NEVER stored in database; only `tracking_token_hash` (HMAC-SHA256) is persisted.

---

### 2.2 Endpoint 2: `POST /api/reports/track` (Public Status Tracking)

#### 2.2.1 Contract Specification
- **Method / Route**: `POST /api/reports/track`
- **Content-Type**: `application/json`
- **Authentication**: None (Public endpoint).
- **Security Mechanism**: Constant-time HMAC-SHA256 verification (`secrets.compare_digest` / `hmac.compare_digest`).

#### 2.2.2 Request Payload
```json
{
  "ticket_id": "RPT-20260902-8F92E1B4",
  "tracking_token": "TRK-9F83-A8B2-C4E6-10D7"
}
```
*Note: Accepts either `tracking_token` or `tracking_code`. Normalizer strips whitespace, hyphens, and optional `TRK-` prefix.*

#### 2.2.3 Response Specification
- **Success Status**: `200 OK`
- **Success Payload Schema**:
```json
{
  "ticket_id": "RPT-20260902-8F92E1B4",
  "category": "Roads & Bridges",
  "status": "in_progress",
  "public_status_label": "In Progress",
  "created_at": "2026-09-02T09:30:00Z",
  "updated_at": "2026-09-02T11:15:00Z",
  "location_barangay": "Barangay 171",
  "district_code": "D3",
  "location_summary": "Congressional Rd, Bagumbong, Barangay 171",
  "is_claimed": false,
  "public_timeline": [
    {
      "stage": "received",
      "label": "Report Received",
      "timestamp": "2026-09-02T09:30:00Z",
      "note": "Report logged and queued for engineering triage."
    },
    {
      "stage": "in_progress",
      "label": "Work in Progress",
      "timestamp": "2026-09-02T11:15:00Z",
      "note": "Maintenance team dispatched to site."
    }
  ]
}
```

#### 2.2.4 Invariants & Security Rules
1. **Strict PII Redaction**: Response payload MUST NOT include `contact_email`, `contact_phone`, `resident_id`, reporter name, or reporter user object.
2. **Internal Operations Redaction**: MUST NOT leak `ai_reasoning`, internal official comments, staff dispatcher notes, or sensitive triage calculations.
3. **Timeline Visibility**: Only events with `is_public == True` are included in `public_timeline`.
4. **Safe Anti-Enumeration**: If `ticket_id` does not exist OR `tracking_token` fails constant-time verification, the endpoint MUST return an identical `404 Not Found` (`{"detail": "Report not found or invalid tracking credentials."}`).
5. **Injection Resilience**: Handles SQL injection payloads, script tags, empty tokens, and malformed strings safely without 500 errors.

---

### 2.3 Endpoint 3: `POST /api/reports/{id}/claim` (Contextual Claiming)

#### 2.3.1 Contract Specification
- **Method / Route**: `POST /api/reports/{id}/claim` (where `{id}` is the report ID or ticket ID)
- **Content-Type**: `application/json`
- **Authentication**: Required Resident Bearer JWT (`get_required_user`).
  - Missing/invalid JWT -> `401 Unauthorized`.
  - Unverified resident account (`is_verified == False`) -> `403 Forbidden`.

#### 2.3.2 Request Payload
```json
{
  "tracking_token": "TRK-9F83-A8B2-C4E6-10D7"
}
```

#### 2.3.3 Response Specification
- **Success Status**: `200 OK`
- **Success Payload Schema**:
```json
{
  "message": "Report successfully linked to your account.",
  "report": {
    "id": 142,
    "ticket_id": "RPT-20260902-8F92E1B4",
    "resident_id": 101,
    "claimed_at": "2026-09-02T12:00:00Z",
    "claimed_by_user_id": 101,
    "reporter_type": "registered",
    "status": "in_progress"
  }
}
```

#### 2.3.4 Invariants & State Mutation Rules
1. **Invalid Token**: If tracking token fails verification against stored `tracking_token_hash`, return `403 Forbidden` (`{"detail": "Invalid tracking token for this report."}`).
2. **Already Claimed by Different User**: If `claimed_by_user_id` is set to another user, return `409 Conflict` (`{"detail": "This report has already been claimed by another resident account."}`).
3. **Report Authored by Another Registered User**: If `resident_id` is set to another user upon creation, return `409 Conflict` (`{"detail": "This report was authored by a registered account and cannot be claimed."}`).
4. **Idempotent Claim by Same User**: If already claimed by `current_user.id`, return `200 OK` (`{"message": "Report is already linked to your account."}`).
5. **Atomic DB Mutation**:
   - `claimed_by_user_id` set to `current_user.id`
   - `claimed_at` set to current UTC datetime
   - `resident_id` set to `current_user.id` (if previously NULL)
   - `reporter_type` updated to `"registered"`
6. **Immutable Audit Logging**: Creates an audit log record with `trigger_type = "report_claimed"`, `actor_id = current_user.id`, `report_id = report.id`, `action = "..."`.

---

### 2.4 Endpoint 4: `GET /api/me/reports` (Unified Resident My Reports)

#### 2.4.1 Contract Specification
- **Method / Route**: `GET /api/me/reports` (and backward-compatible `GET /api/reports/user/{user_id}`)
- **Authentication**: Required Resident Bearer JWT (`get_required_user`).
  - Missing/invalid JWT -> `401 Unauthorized`.

#### 2.4.2 Query Parameters
| Parameter | Type | Default | Allowed Values / Validation |
|---|---|---|---|
| `filter` (or `status`) | String | `"all"` | `"all"`, `"active"`, `"resolved"`, `"needs_information"` |
| `page` | Integer | `1` | Minimum `1` |
| `limit` | Integer | `20` | Minimum `1`, Maximum `100` |

#### 2.4.3 Response Specification
- **Success Status**: `200 OK`
- **Success Payload Schema**:
```json
{
  "total": 5,
  "page": 1,
  "limit": 20,
  "filter": "active",
  "reports": [
    {
      "id": 142,
      "ticket_id": "RPT-20260902-8F92E1B4",
      "status": "in_progress",
      "status_label": "In Progress",
      "category": "Roads & Bridges",
      "description": "Deep pothole along Congressional Rd.",
      "location_lat": 14.7565,
      "location_lng": 121.0450,
      "location_barangay": "Barangay 171",
      "location_string": "Congressional Rd, Bagumbong",
      "image_url": "/api/uploads/reports/rpt_9a8b7c.jpg",
      "resolution_image_url": null,
      "is_claimed": true,
      "claimed_at": "2026-09-02T12:00:00Z",
      "created_at": "2026-09-02T09:30:00Z",
      "updated_at": "2026-09-02T11:15:00Z",
      "satisfaction_rating": null
    }
  ]
}
```

#### 2.4.4 Invariants & Filter Partitioning Rules
1. **Unified Aggregation**: Query filter uses `OR` condition: `(Report.resident_id == current_user.id) | (Report.claimed_by_user_id == current_user.id)`.
2. **Filter Partitions**:
   - `all`: All reports belonging or claimed by the resident.
   - `active`: Status in `["pending", "received", "under_review", "assigned", "dispatched", "in_progress", "pending_approval"]`.
   - `resolved`: Status in `["resolved", "closed", "closed_by_citizen"]`.
   - `needs_information`: Status in `["needs_information", "unverified"]`.
3. **Cross-Tenant Isolation**: Must NEVER return reports belonging to or claimed by other users.

---

## 3. Comprehensive Verification Test Matrix

The following table defines the complete test case catalog for Milestone 2 verification across all unit and integration dimensions.

| Test ID | Category | Endpoint / Unit Target | Auth Context | Input / Fixture | Expected HTTP | Key Assertions & Checks |
|---|---|---|---|---|---|---|
| **M2-INT-01** | Open Intake | `POST /api/reports` | None (Guest) | Category="Roads", Desc (25 chars), Lat=14.7565, Lng=121.0450 | `201 Created` | `reporter_type=='guest'`, `resident_id is None`, `tracking_token` matches `^TRK-`, `tracking_url` populated, DB `tracking_token_hash` is 64-hex HMAC |
| **M2-INT-02** | Open Intake | `POST /api/reports` | None (Guest) | Contact email="guest@caloocan.ph", phone="09171234567" | `201 Created` | `contact_email` and `contact_phone` stored correctly; `contact_verified==False` |
| **M2-INT-03** | Open Intake | `POST /api/reports` | None (Guest) | Valid JPEG image attached (magic bytes `\xFF\xD8\xFF`) | `201 Created` | Image accepted, `image_url` returned, file created in mock upload directory |
| **M2-INT-04** | Auth Intake | `POST /api/reports` | Bearer Maria (ID: 101) | Category="Drainage", Desc (30 chars), Lat=14.7565, Lng=121.0450 | `201 Created` | `reporter_type=='registered'`, `resident_id==101`, `tracking_token` returned |
| **M2-BND-01** | Boundary | `POST /api/reports` | None (Guest) | Description="" (empty string) | `422 Unprocessable` | Rejection error mentions description required |
| **M2-BND-02** | Boundary | `POST /api/reports` | None (Guest) | Description="Short" (5 chars < 10 chars) | `422 Unprocessable` | Rejection error mentions minimum 10 characters |
| **M2-BND-03** | Boundary | `POST /api/reports` | None (Guest) | Description="A" * 5001 (>5000 chars) | `422 Unprocessable` | Rejection error mentions maximum 5000 characters |
| **M2-BND-04** | Boundary | `POST /api/reports` | None (Guest) | Missing required `category` | `422 Unprocessable` | Schema validation error |
| **M2-BND-05** | Geo Boundary | `POST /api/reports` | None (Guest) | Lat=14.7565, Lng=121.0450 (North Caloocan / D3) | `201 Created` | Within jurisdiction; District 3 assigned |
| **M2-BND-06** | Geo Boundary | `POST /api/reports` | None (Guest) | Lat=14.6500, Lng=120.9750 (South Caloocan / D1) | `201 Created` | Within jurisdiction; District 1 assigned |
| **M2-BND-07** | Geo Boundary | `POST /api/reports` | None (Guest) | Lat=14.5995, Lng=120.9842 (Manila City) | `400 Bad Request` | Detail explains location is outside Caloocan City jurisdiction |
| **M2-BND-08** | Geo Boundary | `POST /api/reports` | None (Guest) | Lat=14.6500, Lng=121.0500 (Quezon City) | `400 Bad Request` | Detail explains location is outside Caloocan City jurisdiction |
| **M2-BND-09** | Duplicate | `POST /api/reports` | None (Guest) | Same category + coords within 15m of active report | `409 Conflict` | Duplicate prevented; `X-Canonical-Ticket-ID` provided |
| **M2-SEC-01** | File Security | `POST /api/reports` | None (Guest) | 0-byte empty file attachment | `422 Unprocessable` | Magic byte validator rejects empty stream |
| **M2-SEC-02** | File Security | `POST /api/reports` | None (Guest) | File size = exactly 10MB (10,485,760 bytes) | `201 Created` | Boundary upper limit accepted |
| **M2-SEC-03** | File Security | `POST /api/reports` | None (Guest) | File size = 10MB + 10KB (10,496,000 bytes) | `422 Unprocessable` | Rejection for exceeding 10MB ceiling |
| **M2-SEC-04** | File Security | `POST /api/reports` | None (Guest) | Executable payload disguised with `.jpg` extension | `422 Unprocessable` | Magic byte check detects binary mismatch |
| **M2-SEC-05** | File Security | `POST /api/reports` | None (Guest) | Polyglot PNG/HTML content mismatch | `422 Unprocessable` | Magic byte check rejects invalid header |
| **M2-INT-05** | Public Track | `POST /api/reports/track` | Public (None) | Valid `ticket_id` + matching `tracking_token` | `200 OK` | Returns `public_status_label`, `district_code`, `public_timeline` |
| **M2-SEC-06** | Sanitization | `POST /api/reports/track` | Public (None) | Valid track query on report with email & phone | `200 OK` | `contact_email`, `contact_phone`, `resident_id` NOT present in payload |
| **M2-SEC-07** | Sanitization | `POST /api/reports/track` | Public (None) | Valid track query on report with AI reasoning | `200 OK` | `ai_reasoning`, official internal notes NOT present in payload |
| **M2-SEC-08** | Anti-Enum | `POST /api/reports/track` | Public (None) | Non-existent `ticket_id` (`RPT-99999999-XXXX`) | `404 Not Found` | Detail: "Report not found or invalid tracking credentials." |
| **M2-SEC-09** | Anti-Enum | `POST /api/reports/track` | Public (None) | Valid `ticket_id` + incorrect `tracking_token` | `404 Not Found` | Detail identical to non-existent ticket (prevents enumeration) |
| **M2-SEC-10** | Anti-Enum | `POST /api/reports/track` | Public (None) | Single-character corrupted `tracking_token` | `404 Not Found` | Constant-time failure without timing leak |
| **M2-SEC-11** | Injection | `POST /api/reports/track` | Public (None) | SQLi: `{"ticket_id": "' OR 1=1 --", ...}` | `404 Not Found` | Handled safely, 0 SQL errors |
| **M2-SEC-12** | Injection | `POST /api/reports/track` | Public (None) | XSS: `{"ticket_id": "<script>alert(1)</script>"}` | `404 Not Found` | Handled safely, sanitized response |
| **M2-INT-06** | Claiming | `POST /api/reports/{id}/claim` | Bearer Maria (ID: 101) | Guest report ID + valid `tracking_token` | `200 OK` | `report.claimed_by_user_id==101`, `report.resident_id==101`, `claimed_at` set |
| **M2-INT-07** | Claiming | `POST /api/reports/{id}/claim` | Bearer Maria (ID: 101) | Claim operation verification in DB | `200 OK` | DB confirms `audit_logs` record created with `trigger_type='report_claimed'` |
| **M2-SEC-13** | Claiming | `POST /api/reports/{id}/claim` | None (Unauthenticated)| Valid report ID + valid `tracking_token` | `401 Unauthorized` | Rejection for missing Bearer token |
| **M2-SEC-14** | Claiming | `POST /api/reports/{id}/claim` | Bearer Juan (Unverified) | Valid report ID + valid `tracking_token` | `403 Forbidden` | Rejection: "Account not verified." |
| **M2-SEC-15** | Claiming | `POST /api/reports/{id}/claim` | Bearer Maria (ID: 101) | Valid report ID + wrong `tracking_token` | `403 Forbidden` | Rejection: "Invalid tracking token for this report." |
| **M2-SEC-16** | Claiming | `POST /api/reports/{id}/claim` | Bearer Pedro (ID: 102) | Report already claimed by Maria (ID: 101) | `409 Conflict` | Rejection: "already been claimed by another resident account." |
| **M2-SEC-17** | Claiming | `POST /api/reports/{id}/claim` | Bearer Pedro (ID: 102) | Report originally authored by Maria (ID: 101)| `409 Conflict` | Rejection: "authored by a registered account and cannot be claimed." |
| **M2-INT-08** | Claiming | `POST /api/reports/{id}/claim` | Bearer Maria (ID: 101) | Report already claimed by Maria (ID: 101) | `200 OK` | Idempotent success response |
| **M2-INT-09** | Unified My | `GET /api/me/reports` | Bearer Maria (ID: 101) | Filter="all" | `200 OK` | Returns both directly authored reports AND claimed guest reports |
| **M2-INT-10** | Unified My | `GET /api/me/reports` | Bearer Maria (ID: 101) | Filter="active" | `200 OK` | Returns only active tickets (`pending`, `in_progress`, etc.) |
| **M2-INT-11** | Unified My | `GET /api/me/reports` | Bearer Maria (ID: 101) | Filter="resolved" | `200 OK` | Returns only resolved tickets (`resolved`, `closed`) |
| **M2-INT-12** | Unified My | `GET /api/me/reports` | Bearer Maria (ID: 101) | Filter="needs_information" | `200 OK` | Returns tickets needing resident input |
| **M2-SEC-18** | Unified My | `GET /api/me/reports` | None (Unauthenticated)| No Bearer token | `401 Unauthorized` | Auth required |
| **M2-SEC-19** | Unified My | `GET /api/me/reports` | Bearer Pedro (ID: 102) | Verify Maria's reports are NOT returned | `200 OK` | Strict cross-tenant isolation; 0 leak of Maria's tickets |

---

## 4. Test Infrastructure & Mocking Architecture

### 4.1 In-Memory Database Isolation
Tests execute against SQLite using `StaticPool` to ensure 100% test isolation, zero filesystem side effects, and sub-2-second execution:
```python
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
```

### 4.2 Seed Fixtures & Cryptographic Constants
1. **Districts Seed**:
   - District 1 (South Caloocan, code `D1`)
   - District 2 (South Caloocan, code `D2`)
   - District 3 (North Caloocan, code `D3`)
2. **Barangays Seed**:
   - Barangay 171 (District 3, North Caloocan, ZIP 1420)
   - Barangay 176 - Bagong Silang (District 3, North Caloocan, ZIP 1428)
   - Barangay 1 (District 1, South Caloocan, ZIP 1400)
3. **Resident Personas**:
   - `Maria Santos` (`id=101`, `maria@example.com`, `is_verified=True`, District 3)
   - `Pedro Reyes` (`id=102`, `pedro@example.com`, `is_verified=True`, District 1)
   - `Juan Unverified` (`id=103`, `juan.unverified@example.com`, `is_verified=False`)
4. **Geographic Coordinates**:
   - Deep North Caloocan: `lat = 14.7565, lng = 121.0450`
   - Deep South Caloocan: `lat = 14.6500, lng = 120.9750`
   - Manila (Out-of-bounds): `lat = 14.5995, lng = 120.9842`
   - Quezon City (Out-of-bounds): `lat = 14.6500, lng = 121.0500`
5. **Magic Byte Media Generators**:
   - JPEG: `b"\xFF\xD8\xFF" + b"\x00" * 50`
   - PNG: `b"\x89PNG\r\n\x1a\n" + b"\x00" * 50`
   - WebP: `b"RIFF\x00\x00\x00\x00WEBPVP8 \x00\x00\x00\x00"`
   - Disguised Corrupt File: `b"MZ\x90\x00\x03\x00\x00\x00..."` (PE Executable header)

---

## 5. Execution Commands & Test Harness

### 5.1 Pytest Execution Commands
```powershell
# 1. Run Complete Verification Suite
cd c:\Users\Val\Desktop\PULSO\backend
python -m pytest tests/test_e2e_open_reporting.py -v

# 2. Run Milestone 2 Endpoint Feature Tests (Tier 1)
python -m pytest tests/test_e2e_open_reporting.py -k "TestTier1" -v

# 3. Run Boundary, Security & Anti-Enumeration Tests (Tier 2)
python -m pytest tests/test_e2e_open_reporting.py -k "TestTier2" -v

# 4. Run Cross-Feature State Machine Workflows (Tier 3)
python -m pytest tests/test_e2e_open_reporting.py -k "TestTier3" -v

# 5. Run Real-World Concurrency & Monsoon Workloads (Tier 4)
python -m pytest tests/test_e2e_open_reporting.py -k "TestTier4" -v
```

### 5.2 Standalone Python Test Runner
```powershell
cd c:\Users\Val\Desktop\PULSO\backend
python tests/test_e2e_open_reporting.py
```

### 5.3 Coverage Verification Command
```powershell
cd c:\Users\Val\Desktop\PULSO\backend
python -m pytest tests/test_e2e_open_reporting.py --cov=. --cov-report=term-missing
```

---

## 6. Integration Checklist for Downstream Implementers

When implementing Milestone 2 in `backend/main.py` and `backend/crud.py`:
- [x] Use `get_optional_current_user` for `POST /api/reports`.
- [x] Ensure `tracking_token` is generated via `generate_tracking_token()` and hashed via `hash_tracking_token()`. Never store plaintext tokens.
- [x] Use `normalize_tracking_token()` before calling `verify_tracking_token()` in `/track` and `/{id}/claim`.
- [x] Enforce `is_in_caloocan(lat, lng)` boundary verification.
- [x] Return uniform `404` for invalid ticket ID and invalid tracking token on `/api/reports/track`.
- [x] Implement atomic claim with `claimed_by_user_id`, `claimed_at`, and `TestAuditLog` insertion.
- [x] Support `filter` query param on `/api/me/reports` (`all`, `active`, `resolved`, `needs_information`).
