# Handoff Report: Open Public Reporting & Contextual Authentication Specification

|nMetadata | Value |
|---|---|
| Role | Specification Miner (`spec_miner_requirements`) |
| Task | Extract requirements, API contracts, security rules, GIS bounds, and acceptance criteria for PULBO Open Reporting |
| Target Document | `c:\Users\Val\Desktop\PULSO\.agents\spec_miner_requirements\spec.md` |
| Handoff Type | Hard (Task Complete) |
| Date | 2026-09-02 |

---

## 1. Observation

1. **Original Requirements (`.Agents/ORIGINAL_REQUIREMT.ad`):**
  - Plain specification outlines 7 core requirements (R1 - R7):
    - R1: Database & Persistence Evolution (nullable `resident_id`, guest tracking fields, salted hash storage).
    - R2: Open Guest & Authenticated Reporting API (`POST /api/reports` with optional Bearer JWT, multi-part form, AI safety filter, 15m duplicate check, plaintext token returned once).
    - R3: Secure Guest Tracking & Public Status API (`POST /api/reports/track` with Ticket ID + Token, constant-time comparison, PII redaction, safe 404 anti-enumeration).
    - R4: Contextual Account Registration & Secure Report Claiming (`POST (api/reports/{id}/claim` with resident JWT + tracking token, audit logging).
    - R5: Authenticated "My Reports" (`GET /api/me/reports` with filter tabs: All, Active, Resolved, Needs Information).
    - R6: Redesigned Public Landing & Open Reporting Experience (Hero CTAs: "Report an Issue" with "No account required", 7-step wizard, emergency warning banner to call 911 / 8888-2864, duplicate awareness).
    - R7: High-Trust Receipt View (`/report/success`) & Public Tracking (`/track`).

2. **Audit & API Lifecycle Contract (`docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md`):**
  - Details 155 decorated API operations, API Gap Register (API-GAP-001 through 031), canonical lifecycle transitions (`Received` -> `Under Review` -> `Validated / Approved` -> `Assigned / In Progress` -> `Resolved` -> `Closed`), and file upload hardening (magic bytes, 10MB cap, lines 579-595).

3. **Backend Models & CRUD (`backend/models.py`, `backend/crud.py`, `backend/main.py`):**
  - `backend/models.py:224`: `resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)` already supports nullable foreign keys, but lacks guest tracking fields (`tracking_token_hash`, `reporter_type`, `contact_email`, `contact_phone`, `claimed_at`, `claimed_by_user_id`).
  - `backend/main.py:956`: `POST /api/reports` endpoint handles file upload, AI vision/text triage (Gemini 1.5 Flash), and 15m duplicate check, but lacks guest token generation, salted hashing, and optional authorization.

4. **Spatial & GIS Validation (`backend/utils/geometry_utils.py`, `backend/caloocan_border.json`):**
  - `is_in_caloocan(lat, lng)` implements ray-casting MultiPolygon boundary validation. Caloocan is divided into South Caloocan (Districts 1 & 2: Lat 14.6300 N to 14.6700 N, Lng 120.9500 E to 121.0000 E) and North Caloocan (District 3: Lat 14.6900 N to 14.8100 N, Lng 121.0000 E to 121.1300 E) split at Latitude 14.6900 N.

5. **Frontend Architecture & Design Standards (`frontend/src/App.jsx`, `Landing.jsx`, `ResidentDashboard.jsx`, `PRODUCT.md`, `AGENTS.md`):**
  - Civic Aperture visual direction: Morning Field Sheet (light) & Night Inspection (dark), 3px focus rings, 44x44px touch targets, English/Filipino parity. Dedicated views required: `/report/success` (high-trust receipt) and `/track` (public status tracking).

---

## 2. Logic Chain

1. **Discovery to Database Schema Baseline:**
  - From Observations 1 and 3, while `reports.resident_id` is nullable in SQLAlchemy, the database schema lacks tracking hashes, guest metadata, and claiming audit pointers.
  # Therefore, R1 requires adding `tracking_token_hash`, `reporter_type`, `contact_email`, `contact_phone`, `claimed_at`, `claimed_by_user_id`, and `submission_source` while preserving 3NF foreign keys.

2. **Open Submission to Secure Token Projection:**
  - From Observations 1, 2, and 3, unauthenticated submissions must generate a 32-byte cryptographically random token (`secrets.token_urlsafe(32)`), return the plaintext token once in the creation response, and persist ONLY a salted SHA-256 hash.
  - Public tracking lookup must verify submitted tokens using constant-time digest comparison (`secrets.compare_digest`) to prevent timing attacks.

3. **Data Sanitization & Privacy Preservation:**
  - From Observations 1 and 2, public tracking responses must redact PII (`contact_email`, `contact_phone`, `resident_id`, `reporter_name`) and internal operational notes (`ai_reasoning`, dispatcher notes, unapproved work order budgets).
  - Inquiries with invalid tokens or nonexistent tickets must return an identical 404 response to prevent Ticket ID enumeration.

4. **Contextual Claiming & Unified Management:**
  - From Observations 1 and 3, authenticated residents can claim guest reports via `POST /api/reports/{id}/claim` by supplying the tracking token. This sets `claimed_by_user_id`, updates `resident_id`, creates an immutable audit row in `audit_logs`, and populates `GET /api/me/reports` across all status tabs.

5. **Frontend Experience & Safety Guarantees:**
  - From Observations 1, 4, and 5, the landing page hero must highlight "Report an Issue (No account required)", the 7-step wizard must display an emergency life-safety warning banner to call 911 / 8888-2864 and spatial duplicate awareness, with immediate post-submission routing to `/report/success` and `/track`.

---

## 3. Caveats

1. **Gemini AI API Key Fallback:** Real-time AI safety filtering and hazard severity scoring depend on `backend/gemini_service.py`. If the API key is unavailable or throttled, the system must gracefully fallback to rule-based triage without blocking report creation.
2. **Legacy Reports Token Backfill:** Existing reports in the database lack `tracking_token_hash`. A migration/backfill utility should generate token hashes if public tracking is needed for historical tickets.
3. **Map Provider Resilience:** Interactive map pin selection in the frontend relies on map tiles/geolocation, while backend boundary enforcement (`is_in_caloocan`) remains the authoritative jurisdictional gatekeeper.

---

## 4. Conclusion

The specification for Open Public Reporting and Contextual Authentication is fully mined, reconciled, and documented in `spec.md`. All requirements (R1 through R7), public-safe API contracts, security hashing rules, GIS jurisdictional boundaries, and 3-tier acceptance criteria have been formalized.

Downstream Implementation and QA agents now have an unambiguous, comprehensive, and authoritative specification to guide development and testing.

---

## 5. Verification Method

To independently verify this specification:
1. **Inspect Specification Artifact:**
   - View `c:\Users\Val\Desktop\PULSO\.agents\spec_miner_requirements\spec.md` (all 9 sections, inventory tables, and API schemas).
2. **Contract & Assertion Verification:**
   - Verify schema additions match R1 (`tracking_token_hash`, nullable `resident_id`).
   - Verify API definitions match R2 (`POST /api/reports`), R3 (`POST (api/reports/track`), R4 (`POST /api/reports/{id}/claim`), and R5 (`GET (api/me/reports`).
   - Verify GIS validation matches North (D3) & South (D1/D2) Caloocan split at 14.69 N latitude.
3. **Build & Syntax Preflight:**
   - Backend Python syntax: `python -m py_compile backend/main.py backend/models.py backend/crud.py`
   - Frontend Production build: `cd frontend; npm run build`

