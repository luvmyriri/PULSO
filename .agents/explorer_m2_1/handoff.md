# Milestone 2 Handoff Report: Backend Endpoints & Routing

## 1. Observation

Direct observations from the repository inspection:
1. **Model Support (`backend/models.py:218-297`):**
   `Report` model already has nullable `resident_id` (`Column(Integer, ForeignKey("residents.id"), nullable=True, index=True)`), guest classification (`reporter_type = Column(String(20), default="registered", nullable=False)`), cryptographic hash storage (`tracking_token_hash = Column(String(128), nullable=True)`), guest contact fields (`contact_email`, `contact_phone`, `contact_verified`), and contextual claiming fields (`claimed_at`, `claimed_by_user_id = Column(Integer, ForeignKey("residents.id"), nullable=True)`). `Resident` model (`backend/models.py:123-124`) defines relationships `reports` and `claimed_reports`.
2. **Cryptographic Utilities (`backend/utils/security.py:1-97`):**
   `generate_tracking_token()` produces 16-character hex strings formatted as `TRK-XXXX-XXXX-XXXX-XXXX`, `hash_tracking_token()` computes HMAC-SHA256 digests, and `verify_tracking_token()` executes constant-time comparisons via `secrets.compare_digest`.
3. **Optional Auth Dependency (`backend/auth.py:110-145`):**
   `get_optional_current_user` extracts JWT Bearer token if valid and returns `Resident` or `Official`, returning `None` if unauthenticated or invalid without raising 401 exceptions.
4. **Existing Intake Endpoint (`backend/main.py:956-1085`):**
   `create_new_report` currently enforces `current_user: Union[models.Official, models.Resident] = Depends(get_current_user)`, which rejects unauthenticated guest submissions. It also lacks guest form fields (`contact_email`, `contact_phone`, `submission_source`), token generation/hashing, and magic-byte image validation.
5. **Missing Public Tracking & Claim Endpoints (`backend/main.py`):**
   `POST /api/reports/track`, `POST /api/reports/{id}/claim`, and `GET /api/me/reports` are currently absent from `backend/main.py`, although the contract schemas `ReportTrackRequest`, `ReportTrackResponse`, `ReportClaimRequest`, `ReportClaimResponse`, and `UserReportsResponse` are defined in `backend/schemas.py:203-278`.
6. **AuditLog Schema Invariant (`backend/gov_models.py:159-189`):**
   `AuditLog.actor_id` has `ForeignKey("officials.id")`. If a resident claims a report, setting `actor_id = resident.id` can violate Postgres foreign key constraints. Storing `actor_id = None`, `actor_role = "resident"`, and logging resident details in `details` or `action` prevents database constraint errors.

---

## 2. Logic Chain

1. **Step 1 (Ingestion Decoupling):** By replacing `Depends(get_current_user)` with `Depends(auth.get_optional_current_user)` on `POST /api/reports` (Obs 3, 4), the intake pipeline accepts unauthenticated guests while seamlessly retaining user identity when a valid resident JWT is present.
2. **Step 2 (Input Validation & Upload Security):** Incorporating description length checks (10-5000 chars), Caloocan boundary ray-casting (`utils.geometry_utils.is_in_caloocan`), 15-meter Haversine duplicate checks, 10MB size checks, and magic-byte inspection (JPEG `\xff\xd8\xff`, PNG `\x89PNG`, WebP `RIFF...WEBP`) protects against payload attacks and spam before database interaction.
3. **Step 3 (Cryptographic Security):** Generating `TRK-XXXX-XXXX-XXXX-XXXX` with `auth.generate_tracking_token()` and hashing with `auth.hash_tracking_token()` (Obs 2) guarantees zero plaintext storage in persistence while returning the single-use tracking token and URL in the creation response (`schemas.ReportResponse`).
4. **Step 4 (Anti-Enumeration Tracking):** Implementing `POST /api/reports/track` with `secrets.compare_digest` and uniform `404 Not Found` responses for nonexistent tickets or invalid tokens (Obs 5) prevents malicious enumeration of public civic records. Redacting PII (`contact_email`, `contact_phone`, `resident_id`, `reporter_name`) and internal notes satisfies public privacy rules.
5. **Step 5 (Conflict-Safe Contextual Claiming):** Implementing `POST /api/reports/{id}/claim` ensures only authenticated residents can claim tickets. Verifying the token against `tracking_token_hash` prevents unauthorized takeover, while idempotency checks allow the same resident to re-claim without error and reject third-party claims with `409 Conflict`. Emitting `AuditLog` (with `actor_id=None`, `actor_role="resident"`, Obs 6) and creating a `Notification` ensures complete operational traceability.
6. **Step 6 (Unified Portfolio Querying):** Implementing `GET /api/me/reports` querying `(resident_id == user.id) | (claimed_by_user_id == user.id)` with status filters (`all`, `active`, `resolved`, `needs_information`) consolidates both authored and claimed reports into a single resident dashboard.

---

## 3. Caveats

- **External Geocoding & Reverse Geocoding Rate Limits:** `maps_service.reverse_geocode` is non-blocking with fallbacks, but high network latency or missing API keys will fall back to `"Lat: {lat}, Lng: {lng}"` or client-provided `location_string`.
- **DBSCAN Clustering Scale:** `deduplication_service.cluster_reports` performs clustering across all active reports. At very high volume (>10,000 active reports), background worker batching should replace synchronous execution.
- **SQLite vs. PostgreSQL Concurrency:** In PostgreSQL, transactions are ACID-isolated; in SQLite memory mode during testing, static connection pools must be configured as demonstrated in `test_e2e_open_reporting.py`.

---

## 4. Conclusion

The architectural investigation and code blueprint for Milestone 2 are complete. The proposed implementations for `POST /api/reports`, `POST /api/reports/track`, `POST /api/reports/{id}/claim`, and `GET /api/me/reports` satisfy all requirements from `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `spec.md`. The design is fully compatible with the existing database schema, schemas, models, auth, and AI services.

The implementation team can apply the blueprints directly to `backend/main.py` and `backend/crud.py`.

---

## 5. Verification Method

To independently verify the implementation once applied by the implementation agent:

1. **Automated E2E Test Suite Execution:**
   Run the comprehensive test suite in `backend/tests/test_e2e_open_reporting.py`:
   ```bash
   pytest backend/tests/test_e2e_open_reporting.py -v
   ```
2. **Endpoint Smoke Tests:**
   - Test Guest Intake: `curl -X POST http://localhost:8000/api/reports -F "category=Roads & Bridges" -F "description=Test pothole on Congressional Road" -F "lat=14.7565" -F "lng=121.0450"` -> Verify `201 Created`, `reporter_type='guest'`, and `tracking_token` in response.
   - Test Public Tracking: `curl -X POST http://localhost:8000/api/reports/track -H "Content-Type: application/json" -d '{"ticket_id":"<ticket_id>", "tracking_token":"<token>"}'` -> Verify `200 OK`, public timeline, and absence of PII.
   - Test Anti-Enumeration: Send invalid token -> Verify identical `404 Not Found`.
   - Test Report Claiming: `curl -X POST http://localhost:8000/api/reports/<id>/claim -H "Authorization: Bearer <resident_jwt>" -H "Content-Type: application/json" -d '{"tracking_token":"<token>"}'` -> Verify `200 OK` and claim confirmation.
   - Test My Reports: `curl -X GET http://localhost:8000/api/me/reports?filter=active -H "Authorization: Bearer <resident_jwt>"` -> Verify claimed report is returned.
