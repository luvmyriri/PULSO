# PULSO: Test Infrastructure & Methodology Specification
## Open Public Reporting and Contextual Authentication Architecture

| Document Attribute | Value |
|---|---|
| Target System | PULSO — City Engineering Department Management System (Caloocan City) |
| Architecture Tier | Open Public Reporting, Contextual Authentication & Resident Lifecycle |
| Test Suite Type | Independent Opaque-Box E2E Automated Verification Suite |
| Authoritative Specs | `ORIGINAL_REQUEST.md`, `PROJECT.md`, `spec_miner_requirements/spec.md` |
| Primary Test Suite | `backend/tests/test_e2e_open_reporting.py` |
| Coverage Scope | Tiers 1–4 (Feature, Boundary/BVA, Combinatorial/Pairwise, Real-World Workloads) |

---

## 1. Executive Overview & Quality Principles

The PULSO Open Public Reporting and Contextual Authentication architecture provides barrier-free civic engagement for Caloocan City residents by decoupling incident reporting from mandatory pre-registration while preserving cryptographic tracking, strict PII privacy, anti-enumeration security, and seamless post-reporting account claim consolidation.

To guarantee that this architecture is impervious to regression, data leakage, and race conditions, the testing infrastructure adheres to the following foundational tenets:

1. **Opaque-Box Contract Verification:** Every test exercises the system strictly through its external HTTP interface contracts (`multipart/form-data` and `application/json`), validating HTTP status codes, structured JSON schemas, response headers, and side-effect guarantees.
2. **Zero Facade Tests:** Every test executes concrete validation logic, cryptographic operations, relational persistence, and boundary calculations against a real SQLAlchemy engine and FastAPI router. No test trivially passes without asserting functional truth.
3. **Deterministic Isolation:** All automated tests run against dedicated in-memory SQLite instances or isolated test schemas. Test executions never mutate persistent operational databases and can run concurrently without state interference.
4. **Air-Gapped External Sandbox:** External cloud dependencies (such as Google Gemini 1.5 Flash Vision AI and third-party SMS providers) are deterministically mocked with high-fidelity contract stubs, ensuring 100% test reproducibility regardless of network connectivity or API quota.

---

## 2. Formal Test Methodologies

### 2.1 Category-Partition Method (TSL Framework)
The Category-Partition method decomposes the functional input domain of each endpoint into orthogonal categories and mutually exclusive partitions:

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                           CATEGORY-PARTITION INPUT DOMAIN                             │
├──────────────────────┬────────────────────────────────┬───────────────────────────────┤
│ Category             │ Partitions                     │ Expected System Action        │
├──────────────────────┼────────────────────────────────┼───────────────────────────────┤
│ Reporter Identity    │ [P1] Unauthenticated Guest     │ Issue token, user_id=NULL     │
│                      │ [P2] Authenticated Resident    │ Link user_id, registered type │
│                      │ [P3] Authenticated Official    │ Admin/Official creator flag   │
├──────────────────────┼────────────────────────────────┼───────────────────────────────┤
│ Coordinate Spatial   │ [P1] Deep South Caloocan (D1/2)│ Accepted -> Routed D1/D2      │
│ Validity             │ [P2] Deep North Caloocan (D3)  │ Accepted -> Routed D3         │
│                      │ [P3] Exactly on Border Line    │ Accepted -> Jurisdiction Pass │
│                      │ [P4] Outside Caloocan Border   │ Rejected: HTTP 400            │
├──────────────────────┼────────────────────────────────┼───────────────────────────────┤
│ Media Attachment     │ [P1] No image attached         │ Accepted -> ai_category base  │
│                      │ [P2] Valid JPEG / PNG / WebP   │ Accepted -> Magic byte verify │
│                      │ [P3] Exceeds 10MB ceiling      │ Rejected: HTTP 413 / 422      │
│                      │ [P4] Non-image / Polyglot file │ Rejected: HTTP 422            │
├──────────────────────┼────────────────────────────────┼───────────────────────────────┤
│ Token & Claim State  │ [P1] Valid Matching Token      │ Claimed: 200 OK, Audit logged │
│                      │ [P2] Tampered / Wrong Token    │ Rejected: HTTP 403 Forbidden  │
│                      │ [P3] Non-existent Ticket ID    │ Rejected: HTTP 404 Not Found  │
│                      │ [P4] Already Claimed Ticket    │ Rejected: HTTP 409 Conflict   │
└──────────────────────┴────────────────────────────────┴───────────────────────────────┘
```

### 2.2 Boundary Value Analysis (BVA)
Boundary Value Analysis probes the exact edges of input parameter spaces:

- **Geospatial Borders:**
  - Latitude `14.8100` (Upper North boundary) vs `14.8105` (50m north in Bulacan).
  - Latitude `14.6300` (Lower South boundary) vs `14.6295` (50m south in Manila).
  - District Split `14.6900` (Exact sector transition between South and North Caloocan).
- **Payload & Text Lengths:**
  - Description string of length 9 (Rejected if minimum is 10) vs length 10 (Accepted).
  - Text description at 5,000 characters (Maximum valid buffer).
  - Empty string `""` or whitespace-only inputs.
- **Upload File Limits:**
  - File size `0` bytes (Empty file).
  - File size `10 * 1024 * 1024` bytes (10MB boundary — Accepted).
  - File size `(10 * 1024 * 1024) + 1` bytes (Over 10MB — Rejected with 422/413).
- **Rate Limiting Windows:**
  - 5 submissions within 10 minutes from single IP (Accepted).
  - 6th submission within 10 minutes (Rejected with `429 Too Many Requests`).
  - 20 tracking queries per minute (Accepted) vs 21st query (Rate limited).

### 2.3 Combinatorial & Pairwise Testing
Using an orthogonal testing matrix, all critical pairs of parameter values are covered:

$$\text{Test Matrix} = \{\text{Reporter Type}\} \times \{\text{Location Sector}\} \times \{\text{Media Format}\} \times \{\text{Contact Preference}\}$$

1. `(Guest, North Caloocan, WebP Image, Email Only)`
2. `(Guest, South Caloocan, PNG Image, SMS Phone Only)`
3. `(Guest, North Caloocan, No Media, Fully Anonymous)`
4. `(Registered Resident, South Caloocan, JPEG Image, Profile Contact)`
5. `(Registered Resident, North Caloocan, No Media, Profile Contact)`
6. `(Guest, Out-of-Bounds, JPEG Image, Email & Phone)`

### 2.4 Real-World Workload & Stress Modeling
Simulates operational load conditions in Caloocan City during high-impact civic events:
- **Monsoon Flash-Flood Surge:** 30 concurrent flood and road-damage reports filed across Barangay 171, Barangay 176 (Bagong Silang), and South Caloocan Monumento within milliseconds.
- **Concurrent Claim Race:** Multiple citizen accounts simultaneously attempting to claim the same high-visibility guest ticket, verifying strict transactional locking (`409 Conflict` on second claim).
- **Public Tracking Stream Load:** High-volume polling of ticket status via private tracking token while engineering dispatchers update stages from `received` to `resolved`.

---

## 3. Test Architecture & Harness Structure

```
backend/
├── tests/
│   ├── __init__.py
│   └── test_e2e_open_reporting.py   # Primary Standalone E2E Test Suite (Tiers 1-4)
├── utils/
│   └── geometry_utils.py            # GeoJSON MultiPolygon Boundary Engine
├── caloocan_border.json             # Official Caloocan City Boundaries
└── main.py                          # FastAPI Application Router & Middleware
```

### 3.1 Test Fixtures & Isolation Harness
- **`TestClient` Harness:** Uses FastAPI `TestClient` (`httpx`-backed) for realistic ASGI request/response cycling.
- **SQLite In-Memory Database:** Utilizes `sqlite:///:memory:` with full foreign key enforcement and dynamic session injection via `app.dependency_overrides[get_db]`.
- **Cryptographic Helper Suite:** Direct testing of token entropy generation (`secrets.token_urlsafe(32)`), HMAC-SHA256 salted token hashing, and `hmac.compare_digest` constant-time verification.

---

## 4. Comprehensive Test Catalog (Tiers 1–4)

```
==========================================================================================
PULSO E2E TEST SUITE CATALOG
==========================================================================================

TIER 1: FEATURE COVERAGE (>=5 Cases per Feature)
  [Feature 1: Open Guest Submission]
    - test_t1_f1_01_guest_submission_basic_success
    - test_t1_f1_02_guest_submission_with_contact_email
    - test_t1_f1_03_guest_submission_with_contact_phone
    - test_t1_f1_04_guest_submission_with_jpeg_evidence
    - test_t1_f1_05_guest_submission_response_structure_and_tracking_url
    - test_t1_f1_06_authenticated_submission_binds_resident_id
  [Feature 2: Cryptographic Token Generation & Hashing]
    - test_t1_f2_01_tracking_token_entropy_and_format
    - test_t1_f2_02_token_hash_persistence_never_plaintext
    - test_t1_f2_03_token_hash_salt_uniqueness
    - test_t1_f2_04_constant_time_token_verification
    - test_t1_f2_05_token_tamper_detection
  [Feature 3: Public Status Tracking Endpoint]
    - test_t1_f3_01_public_tracking_valid_credentials_success
    - test_t1_f3_02_public_tracking_pii_redaction_email_phone_name
    - test_t1_f3_03_public_tracking_internal_data_redaction
    - test_t1_f3_04_public_tracking_timeline_event_stream
    - test_t1_f3_05_public_tracking_anti_enumeration_safe_error
  [Feature 4: Contextual Report Claiming Endpoint]
    - test_t1_f4_01_claim_report_valid_token_success
    - test_t1_f4_02_claim_report_updates_resident_id_and_timestamp
    - test_t1_f4_03_claim_report_generates_immutable_audit_log
    - test_t1_f4_04_claim_report_unauthenticated_returns_401
    - test_t1_f4_05_claim_report_invalid_token_returns_403
    - test_t1_f4_06_claim_report_already_claimed_returns_409
  [Feature 5: Unified "My Reports" Dashboard Query]
    - test_t1_f5_01_my_reports_includes_authored_reports
    - test_t1_f5_02_my_reports_includes_claimed_reports
    - test_t1_f5_03_my_reports_filter_active_status
    - test_t1_f5_04_my_reports_filter_resolved_status
    - test_t1_f5_05_my_reports_filter_needs_information_status
    - test_t1_f5_06_my_reports_unauthorized_returns_401

TIER 2: BOUNDARY & CORNER CASES (>=5 Cases per Category)
  [Boundary 1: Field Constraints & Validation]
    - test_t2_b1_01_empty_description_rejected
    - test_t2_b1_02_short_description_below_min_length_rejected
    - test_t2_b1_03_maximum_description_length_boundary
    - test_t2_b1_04_missing_required_category_rejected
    - test_t2_b1_05_malformed_email_format_handling
    - test_t2_b1_06_malformed_phone_format_handling
  [Boundary 2: Media & File Upload Limits]
    - test_t2_b2_01_zero_byte_empty_file_handling
    - test_t2_b2_02_exact_10mb_file_size_accepted
    - test_t2_b2_03_oversized_10_01mb_file_rejected
    - test_t2_b2_04_invalid_file_mime_type_pdf_exe_rejected
    - test_t2_b2_05_magic_byte_mismatch_polyglot_rejection
  [Boundary 3: Geospatial & Jurisdictional Boundaries]
    - test_t2_b3_01_coordinate_deep_inside_north_caloocan
    - test_t2_b3_02_coordinate_deep_inside_south_caloocan
    - test_t2_b3_03_coordinate_exact_northern_border_accepted
    - test_t2_b3_04_coordinate_outside_southern_border_manila_rejected
    - test_t2_b3_05_coordinate_outside_eastern_border_quezon_city_rejected
  [Boundary 4: Token Security & Anti-Enumeration]
    - test_t2_b4_01_nonexistent_ticket_id_returns_safe_404
    - test_t2_b4_02_valid_ticket_with_corrupted_token_returns_safe_404
    - test_t2_b4_03_empty_token_string_returns_safe_404
    - test_t2_b4_04_sql_injection_payload_in_token_safe_handling
    - test_t2_b4_05_xss_script_payload_in_ticket_id_safe_handling
  [Boundary 5: Concurrency & Duplicate Handling]
    - test_t2_b5_01_duplicate_claim_by_same_owner_idempotency
    - test_t2_b5_02_claim_attempt_by_second_user_returns_409
    - test_t2_b5_03_claim_attempt_on_already_registered_report_returns_409
    - test_t2_b5_04_claim_nonexistent_report_id_returns_404
    - test_t2_b5_05_duplicate_report_proximity_15m_conflict_check

TIER 3: CROSS-FEATURE COMBINATIONS & STATE MACHINES (5 Full Workflows)
  - test_t3_wf1_full_guest_to_claimed_lifecycle
  - test_t3_wf2_multi_stage_status_advancement_and_public_timeline
  - test_t3_wf3_cross_device_receipt_url_lookup_and_claim
  - test_t3_wf4_claim_and_citizen_feedback_rating_loop
  - test_t3_wf5_mixed_portfolio_dashboard_aggregation

TIER 4: REAL-WORLD WORKLOAD SCENARIOS (5 Heavy Workloads)
  - test_t4_wl1_multi_district_mass_ingestion_surge
  - test_t4_wl2_emergency_threat_vs_normal_priority_triage
  - test_t4_wl3_simultaneous_multi_citizen_claim_storm
  - test_t4_wl4_mixed_network_upload_and_anonymous_profiles
  - test_t4_wl5_full_civic_infrastructure_stress_batch
==========================================================================================
```

---

## 5. Test Execution Instructions

### Running with pytest:
```powershell
cd c:\Users\Val\Desktop\PULSO\backend
python -m pytest tests/test_e2e_open_reporting.py -v
```

### Running with standalone Python runner:
```powershell
cd c:\Users\Val\Desktop\PULSO\backend
python tests/test_e2e_open_reporting.py
```

### Running specific Tiers:
```powershell
# Run Tier 1 Feature Coverage
python -m pytest tests/test_e2e_open_reporting.py -k "test_t1" -v

# Run Tier 2 Boundary & Corner Cases
python -m pytest tests/test_e2e_open_reporting.py -k "test_t2" -v

# Run Tier 3 Cross-Feature Workflows
python -m pytest tests/test_e2e_open_reporting.py -k "test_t3" -v

# Run Tier 4 Real-World Workload Scenarios
python -m pytest tests/test_e2e_open_reporting.py -k "test_t4" -v
```
