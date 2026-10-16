# PULSO: Open Public Reporting and Contextual Authentication Specification

| Document Metadata | Value |
|---|---|
| Document Type | Comprehensive Architectural Specification & API Contract |
| System | PULSO -- City Engineering Department Management System (Caloocan City) |
| Architecture Tier | Open Public Reporting, Contextual Authentication & Resident Lifecycle |
| Authority | `ORIGINAL_REQUEST.md`, `PRODUCT.md`, `AGENTS.md`, `docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md` |
| Author | Specification Miner (`spec_miner_requirements`) |
| Date | 2026-09-02 |
| Integrity Mode | Development / Production Baseline |

---

## 1. Executive Summary & Architectural Overview

PULSO is the official City Engineering Department Management System for Caloocan City. It bridges two unified experiences:
1. A **Public & Resident Service** for open reporting, evidence capture, public tracking, and civic updates.
2. A **Government Operations Workspace** for triage, dispatch, field execution, approvals, records, and analytics.

The **Open Public Reporting and Contextual Authentication Architecture** eliminates the barrier of mandatory pre-registration. Any resident or visitor in Caloocan City can instantly report civic infrastructure issues (potholes, flooding, street lighting outages, damaged public facilities, illegal obstructions) anonymously or as a guest.

The system provides:
- **Instant Unauthenticated Submission:** No account needed; instant cryptographic tracking token issued on submission.
- **Unified Operational Pipeline:** Guest reports immediately enter the exact same Geospatial AI Triage (Gemini 1.5 Flash multi-modal vision/text analysis) and staff dispatch queue as authenticated reports with equal operational priority.
- **Secure Public Tracking:** Anyone with the Ticket ID + Private Tracking Token can view sanitized, public-safe lifecycle progress without exposing personal data.
- **Contextual Post-Reporting Claiming:** Residents can claim guest reports during or after registration/login using their tracking token, automatically consolidating their civic history into their authenticated dashboard.
- **Geographic & Jurisdictional Integrity:** Real-time GeoJSON boundary enforcement and spatial point-in-polygon validation across North and South Caloocan City.

---
## 2. Comprehensive Requirements Inventory (R1 - R7)

```text
++----------------------------------------------------------------------------------------------------+
|                                 PULSO OPEN REPORTING ARCHITECTURE                              |
++---------------------------------------------------------------------------------------------------+
|  [Guest / Resident User]                                                                       |
|          |                                                                                   |
|          v                                                                                   |
|  [R6: 7-Step Guided Wizard]  --->  [Boundary & Duplicate Check]  --->  [AI Multi-Modal Safety Triage]   |
|          |                                                                                     |
|          v                                                                                  |
|  [R2: POST /api/reports]                                                                       |
|     - user_id = NULL (guest) or UUID/int (registered)                                         |
|     - Generates Ticket ID (RPT-YYYMMDD-XXXX)                                                  |
|     - Generates Cryptographic Tracking Token                                                  |
|     - Stores SHA-256 Salted Hash in DB (Never Plaintext)                                       |
|          |                                                                                     |
|          +------------------------------------+--------------------------------+----------------------+                       |
|          |                                  |                                   |                         |
|          v                                  v                                   v                         |
|  [R7: Receipt View]                  [R3: Public Tracking]              [R4: Report Claiming]           |
|  - Plaintext Tracking Token          - POST /api/reports/track          - POST /api/reports/{id}/claim  |
|  - Copyable Direct URL               - Ticket ID + Tracking Token       - Auth Token + Tracking Token   |
|  - [Track] / [Save to Account]       - Sanitized Public Timeline        - Binds resident_id to report   |
|                                       - Redacts PII & Staff Notes        - Emits Immutable Audit Log     |
|                                                                             |                         |
|                                                                              v                         |
|                                                                         [R5: Authenticated My Reports]      |
|                                                                         - GET /api/me/reports              |
|                                                                         - Filter Tabs: All, Active,         |
|                                                                           Resolved, Needs Info              |
++---------------------------------------------------------------------------------------------------+
```

### R1. Backend Domain & Database Schema Evolution
- **R1.1 Nullable User/Resident Association:** Database schema and SQLAlchemy models must support both authenticated (`resident_id = INT/UUID`) and unauthenticated guest (`resident_id = NULL`) report submissions.
- **R1.2 Guest Tracking & Classification Fields:**
  - `reporter_type`: String/Enum (''uguest' | ''registered''), defaulting to ''guest'' if unauthenticated.
  - `tracking_token_hash`: String(128), storing a salted cryptographic hash (SHA-256 / PBKPF2). Plaintext tokens are strictly forbidden in persistence.
  - `contact_email`: Optional String(255) for guest tracking updates and claim notifications.
  - `contact_phone`: Optional String(50) for SMS tracking notifications.
  - `contact_verified`: Boolean, default `False`.
  - `claimed_at`: Nullable DateTime(timezone=True), timestamp when report was claimed by an authenticated resident.
  - `claimed_by_user_id`: Nullable Integer FK (`residents.id`), referencing the resident who claimed the report.
  - `submission_source`: String(50) (''web_guest'', ''web_resident'', ''mobile_app'', ''guest_portal'').
- **R1.3 Relational Preservation:** Maintain 3NF foreign keys to `barangays.id`, `districts.id`, `cluster_id`, and preserve linked `work_orders`, `process_timelines`, and `audit_logs`.

### R2. Open Guest & Authenticated Reporting API
- **R2.1 Open Access & Optional Authentication:** `POST /api/reports` must accept requests without `Authorization` headers while retaining user context when a valid Bearer token is provided.
- **R2.2 Multi-Part & Media Handling:** Support multi-part form submissions (`category`, `description`, `lat`, `lng`, `location_string`, `contact_email`, `contact_phone`, `image`).
- **R2.3 Upload Validation & Security:**
  - MIME check: image/jpeg, image/png, image/webp.
  - Magic-byte validation to prevent polyglot file attacks.
  - File size cap: 10 MB maximum.
  - File renaming with cryptographic random hex strings to prevent directory traversal or collision.
- **R2.4 Real-Time AI Safety & Triage:**
  - Ingest payload through Gemini 1.5 Flash multi-modal vision/text analysis.
  - AI Safety Filter immediately rejects inappropriate, toxic, or out-of-scope spam (400 Bad Request with safety detail).
  - Valid reports extract severity score (0.0 - 1.0), urgency (`low`, `medium`, `high`, `critical`), suggested category, and smart summary.
- **R2.5 Spatial & Duplicate Preflight:**
  - Enforce Caloocan City geographic boundaries via MultiPolygon point-in-polygon verification.
  - Detect active duplicates within a 15-meter proximity for identical categories.
- **R2.6 Secure Response Payload:** Returns public Ticket ID, server timestamp, lifecycle status (`pending`/`received`), and the plaintext `tracking_token` (returned only once in this creation response).

### R3. Secure Guest Tracking & Public Status API
- **R3.1 Dual-Credential Lookup:** Implement `POST /api/reports/track` requiring both `ticket_id` (or `report_id`) and `tracking_token`.
- **R3.2 Constant-Time Verification:** Compare submitted token hash against database `tracking_token_hash` using constant-time digest comparison (`secrets.compare_digest`) to prevent timing side-channels.
- **R3.3 Public-Safe Data Sanitization:**
  - Redact all private personal data: `contact_email`, `contact_phone`, `resident_id`, `reporter_name`.
  - Redact internal government operational data: internal `ai_reasoning`, staff dispatcher notes, unapproved work order budget details, private internal audit logs.
  - Return public fields: `ticket_id`, `category`, `status`, `created_at`, `updated_at`, `location_barangay`, `location_string` (anonymized/street level), `public_timeline` events marked `is_public=True`, `resolution_image_url` (if resolved).
- **R3.4 Anti-Enumeration Protection:** Invalid tracking codes or nonexistent Ticket IDs must return an identical safe error (`404 Not Found` or `403 Forbidden` with `Invalid ticket ID or tracking code`).

### R4. Contextual Account Registration & Secure Report Claiming
- **[4.1 Authenticated Claim Endpoint:** `POST /api/reports/{id}/claim` (or `POST (api/reports/claim`), requiring a valid Resident Bearer token.
- **R4.2 Proof of Ownership Verification:** Requires valid `tracking_token`.
- **R4.3 State Mutation & Conflict Protection:**
  - If report is already claimed (`claimed_by_user_id` is set or `resident_id` belongs to another resident), reject with `409 Conflict` or `403 Forbidden`.
  - Upon successful verification, set `claimed_by_user_id = current_user.id`, `resident_id = current_user.id` (if null), `claimed_at = func.now()`.
- **R4.4 Immutable Audit Logging:** Create an audit record in `audit_logs` (`trigger_type="report_claimed"', `actor_id=current_user.id`, `action="Guest report {ticket_id} claimed by resident {id}"').
- **R4.5 In-App Notification:** Deliver a confirmation notification to the resident account.

### R5. Authenticated "My Reports" & Unified Management
- **R5.1 Unified Ownership Query:** Implement `GET /api/me/reports` (and update `/api/reports/user/{user_id}`) returning all reports where `resident_id == current_user.id` QR `claimed_by_user_id == current_user.id`.
- **R5.2 Standard Filter Tabs:ʊ
  - `All`: All historical and active reports.
  - `Active`: Reports in status `received`, `pending`, `pending_approval`, `under_review`, `approved_internal`, `approved_for_action`, `dispatched`, `in_progress`.
  - `Resolved`: Reports in status `resolved`, `closed`, `closed_by_citizen`.
  - `Needs Information`: Reports in status `needs_information`, `unverified`.
- **R5.3 Response Structure:** Includes ticket ID, category, status, timestamps, evidence URLs, resolution image URLs, feedback ratings, and timeline summaries.

### R6. Redesigned Public Landing & Open Reporting Experience
- **R6.1 Hero & Navigation Hierarchy:**
  - Primary Hero CTA: `[Report an Issue]` with prominent microcopy `No account required`.
  - Secondary Hero CTA: `[Track a Report]`.
  - Navigation: Top-level links for Home, Services, Track Report, Resident Sign In.
  - Staff Gateway: Distinct, quiet, separate footer/secondary gateway for City Staff.
- **R6.2 Guided 7-Step Reporting Flow:**
  1. *Issue Type:* Visual icon grid of civic categories.
  2. *Location:* Interactive Caloocan map with GPS pin, boundary overlay, auto-reverse-geocoding, and barangay detection.
  3. *Evidence Upload:* Drag-and-drop or camera capture with thumbnail preview and compression.
  4. *Issue Details:* Description, landmark notes, urgency hints, pre-filled editable AI suggestions.
  5. *Optional Contact Preferences:* Email / SMS input for notifications, with "Skip / Submit Anonymously" button.
  6. *Review & Safety Check:* Consolidated summary with interactive duplicate awareness and emergency warning banner.
  7. *Submission:* Real-time submission state with loading indicators and immediate transition to receipt.
- **R6.3 Emergency Warning Banner:** Prominently warns users prior to submission: *For immediate life-safety emergencies, road collisions, or active structural collapses, contact Caloocan Rescue (8888-2864) or dial 911 immediately.*
- **R6.4 Interactive Duplicate Report Awareness:** Real-time spatial check displays existing nearby reports of the same category with options to view the existing ticket or proceed.

### R7. Receipt & Tracking Frontend Views
- **R7.1 High-Trust Receipt View (`/report/success`):**
  - Displays generated `PULSO-XXXXXX` / `RPT-YYYYMLDD-XXXX` Ticket ID.
  - Displays authoritative UTC/PST timestamp.
  - Displays Private Tracking Token with one-click copy and "Download Receipt / Save PDF".
  - Provides direct copyable URL (`https://pulso.caloocan.gov.ph/track?id=...&code=...`).
  - Action buttons: `[Track This Report]`, `[Save to My Reports]`, and `Continue without an account`.
- **R7.2 Public Tracking Page (`/track`):**
  - Form accepting Ticket ID + Tracking Code (auto-fills from URL query parameters).
  - Visual Step Progress Indicator:
    `Received` -> `Under Review` -> `Validated / Approved` -> `Assigned / In Progress` -> `Resolved` -> `Closed` 
  - Public timeline stream showing timestamped milestones and public engineering notes.
  - Contextual CTA to sign in and claim report.
  - WCAG 2.2 AA compliance: 3px high-contrast focus rings, full keyboard accessibility, English/Filipino parity.

---
## 3. Features Discovered & Probe Inventory

### Features Discovered Table
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Database | Nullable Resident FK | Allows reports to exist without pre-registered user account | `resident_id=None` | Stored report row | None | `backend/models.py:224`, `ORIGINAL_REQUEST.md:15` |
| 2 | Database | Cryptographic Token Storage | Salted hashing for tracking credentials | Plaintext token (32 bytes) | 64-byte hex hash stored in `tracking_token_hash` | Plaintext token never persisted | `ORIGINAL_REQUEST.md:16` |
| 3 | Database | Guest Metadata Schema | Tracking guest contact details, verification state, and source | `contact_email`, `contact_phone`, `submission_source` | Persisted columns in `reports` | Validation error if email/phone malformed | `ORIGINAL_REQUEST.md:16` |
| 4 | Database | Claim Audit Tracking | Records claiming user and timestamp | `claimed_by_user_id`, `claimed_at` | Updated report + audit log row | 409 Conflict if already claimed | `ORIGINAL_REQUEST.md:30` |
| 5 | API | Open Report Creation | Allows guest and authenticated users to file civic reports | Form-data (category, description, coords, photo, contact) | JSON with Ticket ID, status, plaintext token | 400 Bad Request, 409 Conflict (Duplicate) | `backend/main.py:956`, `ORIGINAL_REQUEST.md:20`p |
| 6 | API | Public Status Tracking | Unauthenticated lookup using Ticket ID + Tracking Token | `{"ticket_id": "...", "tracking_token": "..."}` | Sanitized report and public timeline | 404 Not Found (Safe, anti-enumeration) | `backend/main.py:904`, `ORIGINAL_REQUEST.md:25` |
| 7 | API | Report Claiming | Binds guest report to authenticated resident account | Bearer JWT + `{"tracking_token": "..."}` | 200 OK + Updated Report details | 401 Unauthorized, 403 Forbidden, 409 Conflict | `ORIGINAL_REQUEST.md:29` |
| 8 | API | Unified "My Reports" | Lists user reports including created and claimed reports | Bearer JWT + `filter` query param | Filtered list of reports with counts | 401 Unauthorized | `backend/main.py:862`, `ORIGINAL_REQUEST.md:33` |
| 9 | Spatial / GIS | Caloocan MultiPolygon Bounds | Ray-casting point-in-polygon validation against border GeoJSON | `lat: float`, `lng: float` | Boolean (`True` if within North/South Caloocan) | 400 Bad Request if outside border | `backend/utils/geometry_utils.py:75` |
| 10 | Spatial / GIS | Sector / District Detection | Latitude threshold splitting South (D1/D2) and North (D3) | `lat: float` (Threshold 14.69 N) | District ID (1, 2, or 3) | District 0 if invalid | `backend/utils/geometry_utils.py:97` |
| 11 | AI Triage | Multi-Modal Hazard Scan | Gemini 1.5 Flash safety moderation, categorization, and urgency | Image bytes + description text | `ai_category`, `ai_urgency`, `severity_score`, summary | 400 Bad Request if flagged inappropriate | `backend/main.py:1024`, `gemini_service.py` |
| 12 | UX / Frontend | Guided 7-Step Flow | Wizard for issue reporting with draft preservation | User step inputs (Category -> Location -> Photos -> Details -> Contact -> Review -> Submit) | Submission payload | Client-side validation errors | `ORIGINAL_REQUEST.md:37` |
| 13 | UX / Frontend | Duplicate Warning Modal | Real-time distance checking alerts user to existing nearby reports | Coords + Category | Warning card with option to view or continue | Prevents accidental duplicate spam | `backend/main.py:989`, `ORIGINAL_REQUEST.md:39` |
| 14 | UX / Frontend | Emergency Threat Banner | High-visibility warning to call emergency dispatch for life-threats | Page view state | Banner with click-to-call 911 / 8888-2864 | None | `ORIGINAL_REQUEST.md:38` |
| 15 | UX / Frontend | High-Trust Receipt | Displays tracking credentials, QRCode, copyable link | Submission response | Rendered receipt card with Copy/Download actions | Re-fetch fallback if network drops | `ORIGINAL_REQUEST.md:42` |
| 16 | Security | Rate Limiting | IP & Device bucket rate limiting for open submissions | Client IP, Request Count | HTTP 429 Too Many Requests | Blocks spam botnets | `ORIGINAL_REQUEST.md:20`p |
| 17 | Security | Magic Byte File Sanitization | Verifies image file headers regardless of file extension | Raw upload bytes | Verified MIME type | 422 Unprocessable Entity | `docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md:579` |

---

## 4. Edge Cases & Handling

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---|---|---|
| E1 | Guest Submission | `resident_id` is null, no Authorization header | Report is created with `reporter_type='guest'`, `resident_id=NULL`, secure token generated, plaintext token returned in response. |
| E2 | Authenticated Submission | User logged in with Bearer token | Report created with `reporter_type='registered'`, `resident_id=current_user.id`, tracking token generated and linked. |
| E3 | Out-of-Bounds Location | Pin placed in Quezon City or Manila (e.g. Lat 14.60, Lng 120.98) | Server returns 400 Bad Request: "Location is outside the jurisdiction of Caloocan City. Please move the pin within the city borders." Map UI shows boundary warning. |
| E4 | Duplicate Proximity | User submits same category within 15 meters of existing active report | Preflight/review alerts user. If submitted, API responds with 409 Conflict linking to the canonical ticket. |
| E5 | Inappropriate / AI Safety Violation | User uploads abusive, offensive, or non-infrastructure image | Gemini safety filter triggers: returns 400 Bad Request with safety rejection reason. No database record created. |
| E6 | Invalid File Upload | User uploads `.exe`, `.pdf`, or corrupt file disguised as `.jpg` | Magic-byte validator detects header mismatch; returns 422 Unprocessable Entity ("Invalid image format"). |
| E7 | Tracking with Invalid Code | Valid Ticket ID provided, but incorrect Tracking Token | Returns 404 Not Found ("Invalid Ticket ID or tracking code"). Identical response to nonexistent Ticket ID to prevent enumeration. |
| E8 | Claiming Already Claimed Report | Authenticated user attempts to claim a report where `claimed_by_user_id` is already set | Returns 409 Conflict: "This report has already been claimed by an account." |
| E9 | Claiming with Invalid Token | Authenticated user attempts to claim report with wrong token | Returns 403 Forbidden: "Invalid tracking token for this report." |
| E10 | Rapid Spam Submissions | Client sends >5 reports in 10 minutes from same IP | Rate limiter trips; returns 429 Too Many Requests with `Retry-After` header. |
| E11 | Offline Interruption during Submit | Network drops after upload starts | Client preserves encrypted draft in localStorage / IndexedDB; allows 1-click retry upon reconnection. |
| E12 | Missing Contact Info | Guest leaves email and phone blank | Submission proceeds smoothly (`contact_email=NULL`, `contact_phone=NULL`); user relies exclusively on Ticket ID + Tracking Token. |

---
## 5. Exact API Contract Definitions

```text
++---------------------------------------------------------------------------------------------------+
|                                     PULSO API ENDPOINTS                                     |
++---------------------------------------------------------------------------------------------------+
| Method | Endpoint                         | Auth        | Description                                      |
|-------|---------------------------------|-------------|-------------------------------------------------------|
| POST   | /api/reports                    | Optional    | Create Guest or Authenticated Report           |
| POST   | /api/reports/track              | Public      | Track Report Status via ID + Token             |
| POST   | /api/reports/{id}/claim         | Bearer JWT  | Claim a Guest Report to User Account           |
| GET    | /api/me/reports                 | Bearer JWT  | Get Unified Reports Owned/Claimed by User      |
| GET    | /api/geo/caloocan-border        | Public      | Get Official GeoJSON Boundary MultiPolygon     |
++---------------------------------------------------------------------------------------------------+
```

### 5.1 Endpoint: Create Open Report
- **Route:** `POST (api/reports`
- **Authentication:** Optional (`Bearer <jwt_token>` if authenticated resident; None for guests)
- **Content-Type:** `multipart/form-data`

#### Request Parameters (Form Fields):
|
 Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | Yes | Issue Category (e.g., "Roads & Bridges", "Water & Drainage", "Street Lighting") |
| `description` | string | Yes | Detailed description of the infrastructure issue (min 10 chars) |
| `lat` | float | Yes | Latitude coordinate (WGS84, e.g., 14.7565) |
| `lng` | float | Yes | Longitude coordinate (WGS84, e.g., 121.0450) |
| `location_string` | string | No | Human-readable address, landmark, or street name |
| `location_barangay` | string | No | Specific Caloocan Barangay (e.g., "Barangay 171") |
| `contact_email` | string | No | Optional email for notifications / recovery |
| `contact_phone` | string | No | Optional Philippine mobile number (+639... or 09...) |
| `submission_source` | string | No | Origin client ("web_guest", "web_resident", "mobile_app") |
| `image` | binary file | No | Photographic evidence (JPEG, PNG, WebP <= 10MB) |

#### Response Schema (`201 Created`):
```json
{
  "id": 142,
  "ticket_id": "RPT-20260902-8F92E1B4",
  "status": "pending",
  "category": "Roads & Bridges",
  "description": "Deep pothole causing vehicle damage near corner market.",
  "location_lat": 14.756512,
  "location_lng": 121.045023,
  "location_string": "Near Corner Market, Congressional Rd, Barangay 171, Caloocan City",
  "location_barangay": "Barangay 171",
  "image_url": "/api/uploads/reports/report_142_9a8b7c6d.jpg",
  "reporter_type": "guest",
  "tracking_token": "trk_9f83a8b2c4e610d7a1b2c3d4e5f67890",
  "tracking_url": "https://pulso.caloocan.gov.ph/track?id=RPT-20260902-8F92E1B4&code=trk_9f83a8b2c4e610d7a1b2c3d4e5f67890",
  "severity_score": 0.85,
  "ai_category": "Roads & Bridges",
  "ai_urgency": "high",
  "ai_summary": "Severe asphalt depression posing traffic hazard",
  "created_at": "2026-09-02T09:30:00Z"
}
```

#### Error Responses:
- `400 Bad Request` - Coordinates outside Caloocan City:
  ``json
  { "detail": "Location (Lat: 14.5995, Lng: 120.9842) is outside the jurisdiction of Caloocan City. Please move the pin within city borders." }
  ``@
- `400 Bad Request` - AI Content Moderation Rejection:
  ``json
  { "detail": "Report rejected by AI Safety Filter: Image contains inappropriate non-infrastructure content." }
  ``@
- `409 Conflict` - Active duplicate detected at exact coordinate:
  ```json
  { "detail": "An active report for 'Roads & Bridges' at this exact location is already being processed.", "canonical_ticket_id": "RPT-20260901-4A12B890" }
  ```@
- `422 Unprocessable Entity` - Invalid file MIME / corrupted image:
  ``json
  { "detail": "Uploaded file must be a valid JPEG, PNG, or WebP image under 10MB." }
  ```
- `429 Too Many Requests` - Rate limit exceeded:
  ``json
  { "detail": "Too many submissions. Please wait 10 minutes before submitting another report." }
  ```

---

### 5.2 Endpoint: Public Report Tracking
- **Route:** `POST (api/reports/track`
- **Authentication:** Publi`
- **Content-Type:** `application/json`

#### Request Body Schema:
```json
{
  "ticket_id": "RPT-20260902-8F92E1B4",
  "tracking_token": "trk_9f83a8b2c4e610d7a1b2c3d4e5f67890"
}
```

#### Response Schema (`200 OK`):
```json
{
  "ticket_id": "RPT-20260902-8F92E1B4",
  "category": "Roads & Bridges",
  "status": "in_progress",
  "public_status_label": "Work in Progress",
  "created_at": "2026-09-02T09:30:00Z",
  "updated_at": "2026-09-02T11:15:00Z",
  "location_barangay": "Barangay 171",
  "district_code": "D3",
  "location_summary": "Congressional Rd, Barangay 171, North Caloocan",
  "is_claimed": false,
  "public_timeline": [
    {
      "stage": "received",
      "label": "Report Received",
      "timestamp": "2026-09-02T09:30:00Z",
      "note": "Report logged and queued for engineering assessment."
    },
    {
      "stage": "under_review",
      "label": "Under Review",
      "timestamp": "2026-09-02T09:45:00Z",
      "note": "Validated by District 3 Command Center triage."
    },
    {
      "stage": "assigned",
      "label": "Team Assigned",
      "timestamp": "2026-09-02T10:30:00Z",
      "note": "Work Order #WO-2026-0492 dispatched to Road Maintenance Team Alpha."
    },
    {
      "stage": "in_progress",
      "label": "Work in Progress",
      "timestamp": "2026-09-02T11:15:00Z",
      "note": "Asphalt patching crew actively deploying on-site."
    }
  ]
}
```

#### Error Responses:
- `404 Not Found` - Invalid Ticket ID or Incorrect Tracking Token:
  ```json
  { "detail": "Invalid Ticket ID or tracking code. Please verify credentials." }
  ```@
- `429 Too Many Requests` - Lookup brute-force protection:
  ``json
  { "detail": "Too many tracking attempts. Please try again in 5 minutes." }
  ```@

---

### 5.3 Endpoint: Claim Guest Report
- **Route:** `POST /api/reports/{id}/claim` (or `POST (api/reports/claim`)
- **Authentication:** `Bearer <resident_jwt_token>` (Mandatory)
- **Content-Type:** `application/json`

#### Request Body Schema:
```json
{
  "tracking_token": "trc_9f83a8b2c4e610d7a1b2c3d4e5f67890"
}
```

#### Response Schema (`200 OK`):
```json
{
  "message": "Report successfully linked to your account.",
  "report": {
    "id": 142,
    "ticket_id": "RPT-20260902-8F92E1B4",
    "resident_id": 58,
    "claimed_at": "2026-09-02T12:00:00Z",
    "claimed_by_user_id": 58,
    "reporter_type": "registered",
    "status": "in_progress",
    "category": "Roads & Bridges",
    "description": "Deep pothole causing vehicle damage near corner market.",
    "location_barangay": "Barangay 171",
    "created_at": "2026-09-02T09:30:00Z"
  }
}
```

#### Error Responses:
- `401 Unauthorized` - Missing or expired resident JWT token.
- `403 Forbidden` - Invalid tracking token for the specified report:
  ```json
  { "detail": "Invalid tracking token provided for this report." }
  ``@
- `404 Not Found` - Report does not exist.
- `409 Conflict` - Report already claimed:
  ```json
  { "detail": "This report has already been claimed by another resident account." }
  ```@

---

### 5.4 Endpoint: Authenticated "My Reports"
- **Route:** `GET /api/me/reports` (and updated `/api/reports/user/{user_id}`)
- **Authentication:** `Bearer <resident_jwt_token>` (Mandatory)
- **Query Parameters:**
  - `filter`: string ("all" | "active" | "resolved" | "needs_information"), default "all"
  - `page`: integer, default 1
  - `limit`: integer, default 20

#### Response Schema (`200 OK`):
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
      "status_label": "Work in Progress",
      "category": "Roads & Bridges",
  "description": "Deep pothole causing vehicle damage near corner market.",
      "location_lat": 14.756512,
      "location_lng": 121.045023,
      "location_barangay": "Barangay 171",
      "location_string": "Near Corner Market, Congressional Rd, Barangay 171",
      "image_url": "/api/uploads/reports/report_142_9a8b7c6d.jpg",
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

---
## 6. Security, Privacy & Integrity Specifications

```text
++---------------------------------------------------------------------------------------------------+
|                                   SECURITY & INTEGRITY ARCHITECTURE                                |
++---------------------------------------------------------------------------------------------------+
| [Raw Token Generation]  --->  [Plaintext to Client (Once)]                                      |
|          |                                                                                   |
|          v                                                                                  |
| [Salt + SHA-256 / PBKDF2]  --->  [Stored in DB: tracking_token_hash]                             |
|                                                                                            |
| [Tracking Request]      --->  [Hash Provided Token]  --->  [Constant-Time compare_digest]              |
|                                                                                            |
| [Public Projection]     --->  [Strip PII: contact_email, contact_phone, resident_id, reporter_name]     |
|                        --->  [Strip Internal: ai_reasoning, staff audit logs, unapproved WO budget]    |
|                                                                                            |
| [Rate Limiter]          --->  [IP Bucket: 5 reports / 10 min] & [Track Lookups: 20 / min]              |
++---------------------------------------------------------------------------------------------------+
```

### 6.1 Cryptographic Token Hashing
1. **Token Generation:** Plaintext tracking tokens are generated using cryptographically strong pseudo-random bytes (`secrets.token_urlsafe(32)` or `secrets.token_hex(24)`).
2. **One-Way Salted Hash:** Before database insertion, the token is hashed using SHA-256 with an application-level pepper/salt or standard PBKDF2:
   hash = SHA256(SALT || plaintext_token)
3. **No Plaintext Persistence:** The plaintext token is NEVER written to the database, application log files, query strings, or error messages.
4. **Timing-Attack Resistance:** Token verification uses Python's `hmac.compare_digest(stored_hash, computed_hash)` or `secrets.compare_digest` to guarantee constant-time execution.

### 6.2 Data Sanitization & PII Redaction on Public Tracking
When returning tracking data through `POST (api/reports/track`
- **Explicit Redaction:** `contact_email`, `contact_phone`, `resident_id`, `reporter_name`, `citizen_trust_score`, `kyc_tier_at_report`.
- **Operational Data Isolation:** Internal `ai_reasoning`, prompt tokens, internal official notes, and unapproved financial work order estimates are omitted.
- **Location Generalization:** Exact sub-meter GPS coordinates may be rounded or represented as street/barangay text to protect resident residential privacy.

### 6.3 Anti-Abuse & Rate Limiting Rules
- **Guest Reporting Rate Limit:** Maximum 5 report submissions per IP address per 10-minute sliding window. Returns `429 Too Many Requests` on breach.
- **Tracking Verification Rate Limit:** Maximum 20 tracking lookup requests per IP per minute to prevent brute-force token harvesting.
- **Claim Rate Limit:** Maximum 10 failed claim attempts per account per 15 minutes before temporary lockout.

### 6.4 File Upload Hardening
- **MIME & Extension Whitelist:** Only `.jpg`, `.jpeg`, `.png`, `.webp` extensions and corresponding `image/jpeg', `image/png', `image/webp' headers.
- **Magic Byte Validation:** Verify leading file header signatures:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47 0D 0A 1A 0A`
  - WebP: `52 49 46 46 ... 57 45 42 50`
- **File System Isolation:** Store uploads with randomized alphanumeric IDs outside web root; serve only through validated media routers.

### 6.5 Immutable Audit Logging
- Every claim event generates an immutable row in `audit_logs`:
  `INSERT INTO audit_logs (trigger_type, report_id, actor_id, action, created_at) VALUES ('report_claimed', 142, 58, 'Guest report RPT-20260902-8F92E1B4 claimed by resident 58', NOW());`
- Soft status changes (`retracted`, `closed_by_citizen`) are recorded without cascading record deletions.

---

## 7. Caloocan City Geographic Bounds & GIS Validation

### 7.1 Geographic Jurisdiction Overview
Caloocan City is divided into two non-contiguous geographic sectors separated by Valenzuela and Quezon City:
1. **South Caloocan (Districts 1 & 2):** Urban, high-density zone containing the City Hall (South) and historical commercial districts.
2. **North Caloocan (District 3):** Rapidly expanding urban zone containing Novaliches-Caloocan, Camarin, Tala, Bagong Silang (Barangay 176 - largest in PH), and Congressional Road.

### 7.2 Boundary Bounding Coordinates
- **South Caloocan (Districts 1 & 2):**
  - Latitude: `14.6300 N` to `14.6700 N`
  - Longitude: `120.9500 E` to `121.0000 E`
- **North Caloocan (District 3):**
  - Latitude: `14.6900 N` to `14.8100 N`
  - Longitude: `121.0000 E` to `121.1300 E`
- **Sector Boundary Split Line:** Latitude `14.6900 N` (Points >= 14.6900 N resolve to District 3 / North Caloocan).

### 7.3 MultiPolygon Point-in-Polygon Algorithm
The system validates coordinates against `backend/caloocan_border.json` using standard Jordan Curve Ray-Casting:
```python
def is_in_caloocan(lat: float, lng: float) -> bool:
    polygons = _load_border_data()
    for poly_rings in polygons:
        if is_point_in_polygon(lng, lat, poly_rings):
            return True
    return False
```
If the coordinate is outside both polygons, the server and map UI reject the pin placement with clear user feedback.

### 7.4 Duplicate Proximity Radius
- Proximity Threshold: ~15 meters (0.00015 degree coordinate delta or Haversine distance <= 15.0 m).
- Filter Condition: Same `category` AND status not in `['resolved', 'cancelled', 'rejected']`.

---

## 8. Complete Acceptance Criteria & Verification Matrix

### Tier 1: Database & Persistence Verification
|
ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| AC-DB-01 | Nullable `resident_id` | Inspect schema / Execute migration | `reports.resident_id` is nullable; records with `NULP` insert without FK constraint errors. |
| AC-DB-02 | Tracking Token Hashing | Inspect database table columns | `tracking_token_hash` stores 64-character SHA-256 hex string; no plaintext token column exists. |
| AC-DB-03 | Guest Metadata Columns | Database query against `reports` | `reporter_type`, `contact_email`, `contact_phone`, `contact_verified`, `claimed_at`, `claimed_by_user_id`, `submission_source` exist with proper data types. |
| AC-DB-04 | Claim Audit Immutability | Inspect `audit_logs` post-claim | A row with `trigger_type='report_claimed'`, matching `actor_id`, and ticket ID is committed. |

### Tier 2: API & Security Verification
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| AC-API-01 | Unauthenticated Report Submission | `POST /api/reports` without auth header | Returns `201 Created` with `ticket_id`, status `pending`, `reporter_type='guest'`, and plaintext `tracking_token`. |
| AC-API-02 | Authenticated Report Submission | `POST /api/reports` with Bearer token | Returns `201 Created` with `resident_id=current_user.id`, `reporter_type='registered'`. |
| AC-API-03 | Boundary Enforcement | `POST /api/reports` with Lat 14.50, Lng 120.90 | Returns `400 Bad Request` citing Caloocan City jurisdiction. |
| AC-API-04 | Public Tracking Lookup | `POST /api/reports/track` with valid Ticket ID + Token | Returns `200 OK` with sanitized public timeline; no PII (email/phone/resident_id) exposed. |
| AC-API-05 | Tracking Anti-Enumeration | `POST /api/reports/track` with invalid token or non-existent ID | Returns identical `404 Not Found` without revealing whether ticket ID exists. |
| AC-API-06 | Secure Report Claiming | `POST /api/reports/{id}/claim` with valid auth + token | Returns `200 OK`; sets `claimed_by_user_id`; report appears in `/api/me/reports`. |
| AC-API-07 | Claim Conflict Handling | Claim already-claimed report | Returns `409 Conflict`. |
| AC-API-08 | Rate Limiting Enforcement | Send 6 rapid submissions from 1 IP | 6th request receives `429 Too Many Requests`. |

---

### Tier 3: Frontend & UX Verification
|
ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| AC-FE-01 | Landing Page Hero CTAs | Inspect `/` in browser | Primary CTA is `"Report an Issue"` with microcopy `"No account required"`; secondary CTA is `"Track a Report"`; Staff Gateway is separated. |
| AC-FE-02 | Unauthenticated Flow Initiation | Click `"Report an Issue"` on `/` | Opens 7-step report wizard directly without redirecting to `/login` or `/register`. |
| AC-FE-03 | 7-Step Reporting Flow | Step through wizard in browser | Steps for Category, Location (Caloocan map), Photos, Details, Contact preferences, Review, and Submission function smoothly. |
| AC-FE-04 | Emergency Warning Banner | Inspect Review step | Emergency warning banner (dial 911 / 8888-2864) is prominently displayed before submission. |
| AC-FE-05 | High-Trust Receipt Screen | Submit report in frontend | Navigates to `/report/success` displaying Ticket ID, private tracking token, copyable tracking URL, and actions. |
| AC-FE-06 | Public Tracking Page | Load `/track?id=...&code=...` | Automatically loads public progress stepper and milestone timeline. |
| AC-FE-07 | Contextual Claim from Receipt | Click `"Save to My Reports"` on receipt | Guides user through sign-in/registration and automatically claims the ticket to their account. |
| AC-FE-08 | Dashboard "My Reports" Tabs | Load `/dashboard` under authenticated resident | Displays claimed and created reports with functional filter tabs (`All`, `Active`, `Resolved`, `Needs Information`). |
| AC-FE-09 | Accessibility & i18n | Keyboard navigation & language switcher | Full tab navigation with 3px focus ring; English and Filipino language switchers translate all labels. |
| AC-FE-10 | Production Build | Run `npm run build` in `frontend/` | Completes with 0 compilation errors. |

---

## 9. Next Implementation Steps & Traceability

1. **Backend Implementation Agent:**
  - Execute database migration for `reports` table nullable `resident_id` and guest tracking columns.
  - Refactor `POST /api/reports` in `backend/main.py` and `backend/crud.py` to support guest mode, token generation, and salted hashing.
  - Implement `POST (api/reports/track` and `POST (api/reports/{id}/claim`.
  - Implement `GET /api/me/reports` with tab filtering.
2. **Frontend Implementation Agent:**
  - Update `Landing.jsx` hero and navigation hierarchy.
  - Create 7-step open reporting wizard component with emergency banner and duplicate modal.
  - Create `/report/success` receipt view and `/track` public tracking view.
  - Update `ResidentDashboard.jsx` My Reports tabs and contextual claim handler.
3. **QA O Validation Agent:**
  - Execute automated backend test suite covering all AC-DB and AC-API assertions.
  - Perform end-to-end Cypress/Playwright or manual verification for all AC-FE criteria.

