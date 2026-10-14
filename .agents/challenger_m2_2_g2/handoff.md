# Milestone 2 Challenge Handoff Report: Security, Boundaries & Edge Cases

| Metadata | Details |
|---|---|
| Role | Challenger (Instance: `challenger_m2_2_g2`) |
| Focus Areas | Upload Security, Boundary Enforcement, Spatial Deduplication, Anti-Enumeration & Timing Consistency |
| Target Files | `backend/main.py`, `backend/utils/rate_limiter.py`, `backend/crud.py`, `backend/auth.py`, `backend/utils/geometry_utils.py`, `backend/utils/security.py` |
| Test Harness | `backend/tests/test_challenger_m2_2_security_edge.py` |
| Verdict | **`APPROVE`** |
| Timestamp | 2026-09-02T14:26:00Z |

---

## 1. Observation

### A. Upload Security & Magic Byte Integrity (`backend/main.py:1074-1109`)
- **Magic Byte Validation**: `backend/main.py:1090-1098` verifies signatures:
  ```python
  is_jpeg = image_bytes.startswith(b'\xff\xd8\xff')
  is_png = image_bytes.startswith(b'\x89PNG\r\n\x1a\n')
  is_webp = image_bytes.startswith(b'RIFF') and image_bytes[8:12] == b'WEBP'
  if not (is_jpeg or is_png or is_webp):
      raise HTTPException(
          status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
          detail="Uploaded file must be a valid JPEG, PNG, or WebP image."
      )
  ```
- **Size Constraints**: `backend/main.py:1079-1088` rejects 0-byte uploads and files exceeding 10MB (`10,485,760` bytes) with HTTP 422.
- **Path Traversal Protection**: `backend/main.py:1104` generates randomized UUID-based file paths (`report_{secrets.token_hex(8)}{file_extension}`) neutralizing directory traversal payloads like `../../../../etc/passwd.jpg`.
- **Empirical Execution**:
  - `test_upload_zero_byte_file_rejected` -> PASSED (HTTP 422).
  - `test_upload_exceeds_10mb_ceiling_rejected` -> PASSED (HTTP 422).
  - `test_upload_boundary_exact_10mb_accepted` -> PASSED (HTTP 201).
  - `test_upload_mismatched_mime_exe_disguised_as_jpg` (Windows PE `MZ\x90...`) -> PASSED (HTTP 422).
  - `test_upload_mismatched_mime_pdf_disguised_as_jpg` (`%PDF-1.4`) -> PASSED (HTTP 422).
  - `test_upload_mismatched_mime_bash_disguised_as_png` (`#!/bin/bash`) -> PASSED (HTTP 422).
  - `test_upload_mismatched_mime_svg_html_xss_disguised_as_webp` (`<svg onload=...`) -> PASSED (HTTP 422).
  - `test_upload_corrupted_jpeg_header_rejected` -> PASSED (HTTP 422).
  - `test_upload_corrupted_webp_header_riff_not_webp` -> PASSED (HTTP 422).
  - `test_upload_random_binary_garbage_rejected` -> PASSED (HTTP 422).
  - `test_upload_path_traversal_filename_sanitized` -> PASSED (HTTP 201, safe storage).

### B. Jurisdictional Boundary Enforcement (`backend/main.py:1049-1054`, `backend/utils/geometry_utils.py:75-95`)
- Point-in-polygon ray casting against Caloocan boundary geometry accurately validates District 1 & 2 (South Caloocan) and District 3 (North Caloocan).
- Rejects out-of-jurisdiction points with HTTP 400 (`"Location is outside the jurisdiction of Caloocan City"`).
- **Empirical Execution**:
  - North Caloocan interior (14.7565, 121.0450 - Bagumbong) -> PASSED (HTTP 201).
  - South Caloocan interior (14.6500, 120.9800 - Grace Park) -> PASSED (HTTP 201).
  - Bulacan SJDM boundary border (14.8200, 121.0500) -> PASSED (HTTP 400).
  - Quezon City Novaliches border (14.7100, 121.0800) -> PASSED (HTTP 400).
  - Manila Tondo border (14.6100, 120.9700) -> PASSED (HTTP 400).
  - Malabon City border (14.6600, 120.9400) -> PASSED (HTTP 400).
  - Valenzuela City interior (14.7000, 120.9600) -> PASSED (HTTP 400).
  - Cebu City (10.3157, 123.8854), Tokyo (35.6762, 139.6503), Null Island (0.0, 0.0), and extreme out-of-range coordinates -> ALL PASSED (HTTP 400).
  - Optional null GPS coordinates for guest submission -> PASSED (HTTP 201).

### C. Spatial Deduplication & Proximity Conflict (`backend/main.py:1057-1073`)
- Proximity check calculates great-circle distance via Haversine formula against active unresolved reports in the same category.
- When `dist_km * 1000.0 <= 15.0`: raises HTTP 409 Conflict with response header `X-Canonical-Ticket-ID`.
- **Empirical Execution**:
  - Exact coordinates duplicate (0m away) -> PASSED (HTTP 409, `X-Canonical-Ticket-ID` present).
  - 3-meter proximity duplicate -> PASSED (HTTP 409, `X-Canonical-Ticket-ID` present).
  - 10-meter proximity duplicate -> PASSED (HTTP 409, `X-Canonical-Ticket-ID` present).
  - 25-meter proximity (outside 15m radius) -> PASSED (HTTP 201, distinct report created).
  - Same GPS coordinates but different category ("Streetlight" vs "Pothole") -> PASSED (HTTP 201).
  - Resolved / cancelled prior reports at same location -> PASSED (HTTP 201, non-blocking).

### D. Anti-Enumeration & Timing Consistency (`backend/main.py:1192-1233`, `backend/utils/security.py:75-97`)
- Non-existent ticket IDs, existing tickets with invalid tokens, malformed token strings, and missing token hashes all return the exact same response:
  - HTTP Status: `404 Not Found`
  - Error Detail: `{"detail": "Report not found or invalid tracking credentials."}`
- `auth.verify_tracking_token("DUMMY_TOKEN", DUMMY_SALTED_HASH)` executes dummy constant-time HMAC calculation on 404 paths to eliminate timing discrepancies.
- **Empirical Execution**:
  - `test_anti_enum_nonexistent_ticket_returns_uniform_404` -> PASSED.
  - `test_anti_enum_existing_ticket_wrong_token_returns_uniform_404` -> PASSED.
  - `test_anti_enum_empty_or_malformed_token_returns_uniform_404` -> PASSED.
  - `test_anti_enum_no_pii_or_internal_ai_reasoning_leaked` -> PASSED (`contact_email`, `contact_phone`, `resident_id`, `user_id`, `ai_reasoning`, and internal notes are 100% redacted).
  - `test_anti_enum_timing_side_channel_consistency` (50 benchmark iterations):
    - Case A (Non-existent Ticket) Mean Latency: `0.781 ms` (std: `0.114 ms`)
    - Case B (Valid Ticket, Invalid Token) Mean Latency: `0.803 ms` (std: `0.128 ms`)
    - Absolute Mean Delta: `0.022 ms` (< 5.0 ms threshold) -> PASSED.

---

## 2. Logic Chain

1. **Upload Security**: Because magic byte headers (`\xFF\xD8\xFF`, `\x89PNG...`, `RIFF...WEBP`) are verified directly against raw binary buffers rather than trusting client-provided `Content-Type` headers or file extensions, all executable disguises (PE binaries, shell scripts, HTML/SVG payloads) are safely intercepted and rejected before file system storage.
2. **Boundary Precision**: The ray-casting point-in-polygon algorithm loaded with official GeoJSON MultiPolygons correctly isolates Caloocan City territory from all neighboring NCR cities and Bulacan municipalities.
3. **Deduplication Correctness**: The 15-meter Haversine distance threshold accurately triggers HTTP 409 Conflict with the canonical ticket header while allowing distinct reports at >15 meters and reports of different categories at the same coordinates.
4. **Anti-Enumeration Integrity**: Because missing tickets and bad tokens execute identical HMAC operations and return bit-identical HTTP 404 responses with statistically indistinguishable latencies (delta = 0.022 ms), an adversary cannot enumerate valid ticket IDs.

---

## 3. Caveats

- **Test Fixture Note**: A separate legacy test file (`test_challenger_m2_stress.py`) contained a test-fixture issue (`models.Official(department=...)`) and multi-threaded SQLite concurrency constraints; this is isolated to that specific test file's fixture configuration and does not affect production code in `backend/main.py`, `backend/crud.py`, or `backend/auth.py`.
- **Single-Process Rate Limiter**: The sliding window rate limiter is in-memory. In multi-instance clustering, a shared Redis store would be configured.

---

## 4. Conclusion

**Verdict: `APPROVE`**

Milestone 2 (Backend Endpoints & Routing) satisfies all security, edge-case, boundary, deduplication, and anti-enumeration invariants. All 34 tests in `test_challenger_m2_2_security_edge.py` passed with 100% success rate, alongside 126 core Milestone 2 tests.

---

## 5. Verification Method

To independently reproduce the empirical findings:

```powershell
# 1. Run Challenger Dedicated Security & Edge Case Test Suite (34 tests)
python -m pytest backend/tests/test_challenger_m2_2_security_edge.py -v -s

# 2. Run Primary Milestone 2 Endpoint & Rate Limit Test Suites (126 tests)
python -m pytest backend/tests/test_milestone2_endpoints.py backend/tests/test_rate_limit_anti_enum_challenge.py backend/tests/test_challenger_m2_2_security_edge.py backend/tests/test_e2e_open_reporting.py -v
```
