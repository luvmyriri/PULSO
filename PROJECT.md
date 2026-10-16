# Project: PULSO Open Public Reporting and Contextual Authentication

## Architecture
PULSO is the City Engineering Department Management System for Caloocan City.
This project establishes open public reporting without mandatory pre-registration while preserving GIS boundary enforcement, AI multi-modal triage, staff operations, secure tokenized public tracking, contextual post-reporting claim linking, and unified resident management.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND ARCHITECTURE                                │
│                                                                                        │
│  [Landing Page] ──► Primary CTA: "Report an Issue" (No account required) ──► [/report] │
│                 ──► Secondary CTA: "Track a Report" ───────────────────────► [/track]  │
│                 ──► Discrete Staff Gateway ────────────────────────────────► [/gov]    │
│                                                                                        │
│  [/report] 7-Step Reporting Wizard:                                                    │
│    1. Issue Type & Emergency Warning Banner (911 / 888-1234)                           │
│    2. Caloocan Map & Jurisdictional Boundary Check                                     │
│    3. Evidence Upload & Non-blocking Advisory AI Scan                                  │
│    4. Details & 100m Duplicate Report Awareness                                        │
│    5. Contact Preferences (Anonymous / Email / Phone / Sign In)                        │
│    6. Review & Civic Consent                                                           │
│    7. Atomic API Submission ──► [/report/success]                                      │
│                                                                                        │
│  [/report/success] Ticket Receipt:                                                     │
│    - Ticket ID + Authoritative Timestamp                                              │
│    - Private Tracking Token (TRK-XXXX-XXXX-XXXX-XXXX) + Copy Link + QR Code            │
│    - CTAs: [Track Report] | [Save to My Reports (Claim)] | [Return Home]               │
│                                                                                        │
│  [/track] Public Tracking View:                                                        │
│    - Ticket ID + Secret Tracking Token lookup                                          │
│    - 6-Stage PulseLine Progress Stepper (Received ──► Closed)                          │
│    - Public-safe timeline (Strict PII & Internal Note Redaction)                       │
│                                                                                        │
│  [Resident Dashboard] (/dashboard):                                                    │
│    - Filter Tabs: All, Active, Needs Information, Resolved                             │
│    - Claim Report Modal: Link guest tickets to account via tracking token              │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │ HTTP / JSON / Multipart
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BACKEND ARCHITECTURE                                 │
│                                                                                        │
│  [FastAPI Endpoints]:                                                                  │
│    - POST /api/reports: Dual guest/registered intake, upload validation, AI triage     │
│    - POST /api/reports/track: Token-verified public lookup, sanitized public payload    │
│    - POST /api/reports/{id}/claim: Authenticated resident claim via tracking token      │
│    - GET /api/me/reports: Unified query for authored and claimed reports               │
│    - GET /api/reports/user/{user_id}: Updated legacy compatible user report query       │
│                                                                                        │
│  [Security & Cryptography]:                                                            │
│    - 128-bit cryptographic tokens (TRK-XXXX-XXXX-XXXX-XXXX)                            │
│    - HMAC-SHA256 salted token hashing (zero plaintext persistence)                     │
│    - Constant-time verification (secrets.compare_digest / hmac.compare_digest)         │
│    - 10MB upload ceiling, magic-byte image validation, IP rate limiting                │
│                                                                                        │
│  [Database & Models]:                                                                  │
│    - PostgreSQL (with SQLite fallback), 3NF normalized schema                          │
│    - Nullable resident_id, 8 guest tracking columns on `reports` table                 │
│    - Immutable `audit_logs` and `process_timelines` logging                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Code Layout
- `backend/models.py`: SQLAlchemy models (`Report`, `Resident`, `Official`, `AuditLog`, `ProcessTimeline`).
- `backend/schemas.py`: Pydantic request/response validation schemas.
- `backend/auth.py` / `backend/utils/security.py`: Auth dependencies, token generation, HMAC-SHA256 hashing, constant-time verification.
- `backend/main.py`: FastAPI endpoint routing, middleware, file validation, AI triage integration.
- `backend/migrate_guest_reporting.py`: Idempotent database schema migration.
- `frontend/src/App.jsx`: Top-level routing (`/`, `/report`, `/report/success`, `/track`, `/dashboard`, `/gov`).
- `frontend/src/pages/Landing.jsx`: Landing page hero, navigation, and staff gateway separation.
- `frontend/src/components/ResidentCinematicHero.jsx`: Civic Aperture cinematic hero component.
- `frontend/src/pages/ReportWizardPage.jsx`: 7-step guided reporting flow with map, emergency warning, duplicate check.
- `frontend/src/pages/ReportSuccessPage.jsx`: Ticket receipt with tracking credentials, QR code, claim link.
- `frontend/src/pages/PublicTrackPage.jsx`: Public tracking view with 6-stage PulseLine progress stepper.
- `frontend/src/pages/ResidentDashboard.jsx`: Authenticated citizen dashboard with updated tabs (`All`, `Active`, `Needs Information`, `Resolved`).
- `frontend/src/components/modals/ClaimReportModal.jsx`: Modal for linking guest tickets via tracking token.
- `frontend/src/locales/en.json` & `frontend/src/locales/tl.json`: English and Tagalog internationalization dictionaries.

---

## Feature Inventory
Every feature from the survey phase appears here with its assigned milestone. No feature is left unassigned.

| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Nullable Resident Association | Database allows `resident_id=NULL` on reports for guest submissions | M1 | Survey / R1.1 |
| 2 | Guest Tracking Schema Columns | Add 8 columns: `reporter_type`, `tracking_token_hash`, `contact_email`, `contact_phone`, `contact_verified`, `claimed_at`, `claimed_by_user_id`, `submission_source` | M1 | Survey / R1.2 |
| 3 | Relational & 3NF Preservation | Maintain foreign keys to `barangays`, `districts`, `cluster_id`, `process_timelines`, `audit_logs` | M1 | Survey / R1.3 |
| 4 | Cryptographic Token Generation & Hashing | 128-bit tokens (`TRK-XXXX-...`), HMAC-SHA256 hashing, constant-time digest verification | M1 | Survey / R1.2, R3.2 |
| 5 | Optional Auth Middleware | `get_optional_current_user` extracts JWT if present, allows guest if absent | M1 | Survey / R2.1 |
| 6 | Open & Registered Report Endpoint | `POST /api/reports` supporting both guest and authenticated users | M2 | Survey / R2.1 |
| 7 | Upload Security & Magic Byte Validation | 10MB file size ceiling, MIME checks, magic byte header inspection | M2 | Survey / R2.3 |
| 8 | Multi-Modal AI Triage Integration | Gemini 1.5 Flash vision/text analysis, safety moderation, severity scoring, non-blocking fallback | M2 | Survey / R2.4 |
| 9 | Geospatial & Caloocan Boundary Enforcement | MultiPolygon boundary verification for North & South Caloocan | M2 | Survey / R2.5 |
| 10 | Public Status Tracking Endpoint | `POST /api/reports/track` with Ticket ID + Token lookup and constant-time check | M2 | Survey / R3.1 |
| 11 | Public Data Sanitization & PII Redaction | Sanitized public payload, public timeline filtering, redacting internal notes and PII | M2 | Survey / R3.3 |
| 12 | Anti-Enumeration Security | Uniform safe error responses for invalid tickets and tokens | M2 | Survey / R3.4 |
| 13 | Contextual Report Claiming Endpoint | `POST /api/reports/{id}/claim` linking guest tickets to authenticated residents | M2 | Survey / R4.1 |
| 14 | Claim State Mutation & Conflict Protection | Atomic claim update, conflict rejection (409) if already claimed | M2 | Survey / R4.3 |
| 15 | Immutable Claim Audit Logging & Notifications | Create audit log and in-app notification on report claim | M2 | Survey / R4.4, R4.5 |
| 16 | Unified "My Reports" Endpoint | `GET /api/me/reports` querying authored and claimed reports with status filters | M2 | Survey / R5.1 |
| 17 | Landing Page Hero & Navigation Redesign | Primary CTA "Report an Issue" (No account required), secondary CTA "Track a Report", separated Staff Gateway | M3 | Survey / R6.1 |
| 18 | Top-Level Route Registration | Register `/report`, `/report/success`, `/track` in `App.jsx` | M3 | Survey / R6.1 |
| 19 | Emergency Warning Banner | Prominent life/safety threat alert (911 / 888-1234) on reporting flow | M4 | Survey / R6.3 |
| 20 | Interactive Caloocan Map & Boundary Verification | Interactive Google Map with GPS pin, boundary check, and reverse geocoding | M4 | Survey / R6.2 |
| 21 | Evidence Upload & Advisory AI Scan | Camera/file upload with non-blocking advisory AI categorization | M4 | Survey / R6.2 |
| 22 | Duplicate Report Awareness Alert | Proximity check alerting user to nearby open reports with attach/continue options | M4 | Survey / R6.4 |
| 23 | Contact Preferences Step | Guest choices: Anonymous, SMS/Email notifications, or Sign In | M4 | Survey / R6.2 |
| 24 | Guided 7-Step Flow Integration | Complete step state management, back/forward navigation, draft resilience | M4 | Survey / R6.2 |
| 25 | High-Trust Ticket Receipt View | `/report/success` with Ticket ID, timestamp, tracking token, copy link, QR code | M5 | Survey / R7.1 |
| 26 | Public Tracking View & PulseLine Stepper | `/track` with 6-stage lifecycle progress stepper and sanitized timeline | M5 | Survey / R7.2 |
| 27 | Authenticated Dashboard Status Tabs | Dashboard tabs: `All`, `Active`, `Needs Information`, `Resolved` | M5 | Survey / R5.2 |
| 28 | Contextual Claim Modal | `ClaimReportModal` allowing logged-in residents to claim guest tickets | M5 | Survey / R4.2, R7.1 |
| 29 | Bilingual Parity & WCAG 2.2 AA Compliance | English/Tagalog translations, 3px focus indicators, keyboard accessibility | M5 | Survey / R7.2 |
| 30 | Opaque-Box E2E Testing Suite (Tiers 1-4) | Comprehensive test suite covering feature, boundary, pairwise, and application workloads | M6 / E2E Track | Survey / AC Matrix |
| 31 | White-Box Adversarial Coverage Hardening (Tier 5) | Challenger-driven coverage audit and adversarial stress testing | M6 | Survey / AC Matrix |
| 32 | Build & Production Quality Verification | Clean `npm run build` (0 errors) and passing test executions | M6 | Survey / AC Matrix |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Database Schema Evolution & Security Primitives | Update `models.py`, `schemas.py`, migration script `migrate_guest_reporting.py`, token generator/hasher/verifier, `get_optional_current_user` in `auth.py`. | none | DONE |
| M2 | Backend Endpoints (Intake, Tracking, Claiming, My Reports) | Implement `POST /api/reports`, `POST /api/reports/track`, `POST /api/reports/{id}/claim`, `GET /api/me/reports` in `main.py` with upload/MIME validation, rate limiting, audit logging. | M1 | DONE |
| M3 | Frontend Landing Page & Navigation Hierarchy | Redesign `Landing.jsx` & `ResidentCinematicHero.jsx` (Hero CTAs, Staff Gateway, EN/TL parity), update `App.jsx` routes. | none | DONE |
| M4 | Guided 7-Step Reporting Flow & Map Integration | Implement `ReportWizardPage.jsx` with Category grid, Emergency Banner, Caloocan Map, Boundary Check, Evidence Upload, Advisory AI, Duplicate Alert, Contact Options, Review & Submit. | M2, M3 | DONE |
| M5 | Receipt, Public Tracking & Authenticated Dashboard | Implement `ReportSuccessPage.jsx`, `PublicTrackPage.jsx`, `ClaimReportModal.jsx`, update `ResidentDashboard.jsx` filter tabs (`All`, `Active`, `Needs Info`, `Resolved`), update `en.json` & `tl.json`. | M2, M4 | DONE |
| M6 | Final Milestone: E2E Test Suite (Tiers 1-4) & Adversarial Hardening (Tier 5) | Pass 100% of E2E test suite from `TEST_READY.md`, adversarial Challenger coverage hardening, verify `npm run build` with 0 errors. | M1, M2, M3, M4, M5, E2E Track | IN_PROGRESS |

---

## Interface Contracts

### Backend ↔ Frontend Contracts

#### 1. Open / Guest & Authenticated Report Submission
- **Endpoint**: `POST /api/reports`
- **Headers**: `Authorization: Bearer <token>` (Optional)
- **Body**: `multipart/form-data`
  - `category`: string (Required)
  - `description`: string (Required)
  - `lat`: float (Required)
  - `lng`: float (Required)
  - `location_string`: string (Optional)
  - `location_barangay`: string (Optional)
  - `contact_email`: string (Optional)
  - `contact_phone`: string (Optional)
  - `submission_source`: string (Optional, default: "web")
  - `image`: binary file (Optional, max 10MB, jpeg/png/webp)
- **Success Response (`201 Created` / `200 OK`)**:
  ```json
  {
    "id": 142,
    "ticket_id": "RPT-20260902-8F92E1B4",
    "status": "pending",
    "category": "Roads & Bridges",
    "description": "...",
    "location_lat": 14.7565,
    "location_lng": 121.0450,
    "location_string": "...",
    "location_barangay": "Barangay 171",
    "image_url": "/api/uploads/reports/report_142.jpg",
    "reporter_type": "guest",
    "tracking_token": "TRK-9F83-A8B2-C4E6-10D7",
    "tracking_url": "https://.../track?id=RPT-20260902-8F92E1B4&code=TRK-9F83-A8B2-C4E6-10D7",
    "created_at": "2026-09-02T09:30:00Z"
  }
  ```

#### 2. Public Report Tracking
- **Endpoint**: `POST /api/reports/track`
- **Headers**: None (Public)
- **Body (`application/json`)**:
  ```json
  {
    "ticket_id": "RPT-20260902-8F92E1B4",
    "tracking_token": "TRK-9F83-A8B2-C4E6-10D7"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "ticket_id": "RPT-20260902-8F92E1B4",
    "category": "Roads & Bridges",
    "status": "in_progress",
    "public_status_label": "Work in Progress",
    "created_at": "2026-09-02T09:30:00Z",
    "updated_at": "2026-09-02T11:15:00Z",
    "location_barangay": "Barangay 171",
    "location_summary": "Congressional Rd, Barangay 171, North Caloocan",
    "is_claimed": false,
    "public_timeline": [
      {
        "stage": "received",
        "label": "Report Received",
        "timestamp": "2026-09-02T09:30:00Z",
        "note": "Report logged and queued for engineering triage."
      }
    ]
  }
  ```
- **Error Responses**:
  - `404 Not Found`: `{"detail": "Report not found or invalid tracking credentials"}` (Safe anti-enumeration response for non-existent ticket or invalid token).

#### 3. Contextual Report Claiming
- **Endpoint**: `POST /api/reports/{id}/claim`
- **Headers**: `Authorization: Bearer <resident_token>` (Required)
- **Body (`application/json`)**:
  ```json
  {
    "tracking_token": "TRK-9F83-A8B2-C4E6-10D7"
  }
  ```
- **Success Response (`200 OK`)**:
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
      "status": "in_progress"
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `403 Forbidden`: `{"detail": "Invalid tracking token for this report."}`
  - `409 Conflict`: `{"detail": "This report has already been claimed by another resident account."}`

#### 4. Unified Resident "My Reports"
- **Endpoint**: `GET /api/me/reports` (and updated `/api/reports/user/{user_id}`)
- **Headers**: `Authorization: Bearer <resident_token>` (Required)
- **Query Parameters**: `status` ("all" | "active" | "resolved" | "needs_information"), `skip` (int), `limit` (int)
- **Success Response (`200 OK`)**:
  ```json
  {
    "total": 5,
    "filter": "active",
    "reports": [
      {
        "id": 142,
        "ticket_id": "RPT-20260902-8F92E1B4",
        "status": "in_progress",
        "category": "Roads & Bridges",
        "description": "...",
        "location_barangay": "Barangay 171",
        "location_string": "...",
        "image_url": "/api/uploads/reports/report_142.jpg",
        "is_claimed": true,
        "claimed_at": "2026-09-02T12:00:00Z",
        "created_at": "2026-09-02T09:30:00Z",
        "updated_at": "2026-09-02T11:15:00Z"
      }
    ]
  }
  ```
