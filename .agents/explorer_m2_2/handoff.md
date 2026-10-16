# Milestone 2 Security & Rate Limiting Handoff Report

## 1. Observation

1. **Upload Handling & Image Persistence in `backend/main.py`:**
   - Lines 1008-1021:
     ```python
     if image:
         image_bytes = await image.read()
         file_extension = os.path.splitext(image.filename)[1] or ".jpg"
         unique_filename = f"report_{db.query(models.Report).count() + 1}_{secrets.token_hex(4)}{file_extension}"
         file_path = os.path.join(UPLOAD_DIR, unique_filename)
         with open(file_path, "wb") as buffer:
             buffer.write(image_bytes)
         image_url = f"/api/uploads/reports/{unique_filename}"
     ```
   - *Observation:* No file size ceiling check (e.g. 10MB) currently exists in `main.py:1008-1021`. Extension is derived directly from client-supplied `image.filename` without magic-byte signature validation, allowing arbitrary files (e.g. `.exe`, `.html`, `.php`, polyglot files) to be stored.

2. **Rate Limiting State in `backend/`:**
   - Grep search across `backend/` for rate limiting (`slowapi`, `limiter`, `rate_limit`) returned zero existing rate limiting middlewares or dependencies.
   - `backend/requirements.txt` contains core libraries (`fastapi==0.115.12`, `uvicorn==0.34.0`, `pillow==11.2.1`, `python-jose`, `bcrypt`) without external Redis or third-party rate limiter dependencies.

3. **Public Status Tracking & Anti-Enumeration:**
   - In `backend/models.py:228-235`, guest reporting columns (`reporter_type`, `tracking_token_hash`, `contact_email`, `contact_phone`, `claimed_at`, `claimed_by_user_id`, `submission_source`) were integrated in Milestone 1.
   - In `backend/utils/security.py:75-97`, constant-time token verification (`verify_tracking_token` with `secrets.compare_digest`) exists.
   - In `backend/schemas.py:215-250`, `ReportTrackRequest` and `ReportTrackResponse` are defined.
   - In `backend/tests/test_e2e_open_reporting.py:396-442`, the specification enforces that `POST /api/reports/track` must return identical `404 Not Found` (`{"detail": "Report not found or invalid tracking credentials."}`) whether the ticket ID is non-existent or the token is invalid, preventing enumeration.

4. **Public Route Exposure & PII/Internal Data Leak Surface:**
   - In `backend/models.py:246-265`, `Report` model contains sensitive internal fields: `ai_reasoning`, `budget`, `citizen_trust_score`, `kyc_tier_at_report`, `contact_email`, `contact_phone`, `resident_id`.
   - In `backend/main.py:879-903`, `GET /api/reports/public` currently requires `Depends(get_current_user)` (blocking unauthenticated visitors) and returns `schemas.ReportResponse` without masking `ai_reasoning`, `budget`, or `contact_email`.
   - In `backend/gov_models.py:216` and `backend/gov_crud.py:686-691`, `ProcessTimeline.is_public` controls visibility of timeline events.

---

## 2. Logic Chain

1. **Upload Security (Observation 1 $\rightarrow$ Spec 1):**
   - Unauthenticated reporting means anyone can send payloads to `POST /api/reports`.
   - Without size limits, a memory/disk exhaustion attack is trivial.
   - Without magic-byte validation, client-supplied MIME headers and file extensions can be spoofed to upload malicious scripts.
   - *Therefore:* A strict 10MB ceiling ($10 \times 1024 \times 1024$ bytes) must be enforced with `422 Unprocessable Entity` rejection, and file headers must be validated against `\xFF\xD8\xFF` (JPEG), `\x89\x50\x4E\x47\x0D\x0A\x1A\x0A` (PNG), and `b"RIFF" ... b"WEBP"` (WebP), with Pillow `verify()` and randomized filenames.

2. **Rate Limiting (Observation 2 $\rightarrow$ Spec 2):**
   - Unauthenticated report submission and public tracking endpoints are exposed to automated bot spam and credential brute-forcing.
   - Because no external Redis is in `requirements.txt`, an in-memory sliding window rate limiter is the optimal, zero-dependency solution.
   - *Therefore:* A pure Python `SlidingWindowRateLimiter` must enforce:
     - `POST /api/reports`: 5 submissions per IP per 10-minute sliding window (600s).
     - `POST /api/reports/track`: 20 tracking queries per IP per 1-minute sliding window (60s).
     - `POST /api/reports/{id}/claim`: 10 attempts per account/IP per 15 minutes (900s).
     - Breaches return `429 Too Many Requests` with a descriptive error message and `Retry-After` header.

3. **Anti-Enumeration (Observation 3 $\rightarrow$ Spec 3):**
   - Distinguishing "Ticket not found" (404) from "Invalid token" (403) creates an enumeration oracle for attackers to scrape all valid ticket IDs across Caloocan City.
   - *Therefore:* `POST /api/reports/track` must return uniform `404 Not Found` with identical body `{"detail": "Report not found or invalid tracking credentials."}` across all lookup failure branches, coupled with constant-time HMAC verification and dummy execution to prevent timing side-channels.

4. **Data Sanitization & Zero-Leak Rules (Observation 4 $\rightarrow$ Spec 4):**
   - Public users and unauthenticated map visitors must only see public civic infrastructure state.
   - Sensitive PII (`contact_email`, `contact_phone`, `resident_id`), internal AI reasoning (`ai_reasoning`, prompt metadata), dispatcher notes, budgets (`budget`), and private timeline events (`is_public == False`) must never leak into public responses.
   - *Therefore:* `ReportTrackResponse` and public feed endpoints must strictly project and whitelist only safe fields (`ticket_id`, `category`, `status`, `public_status_label`, `location_barangay`, `district_code`, `location_summary`, `public_timeline`, `image_url`, `resolution_image_url`).

---

## 3. Caveats

- **Distributed Deployments:** The in-memory sliding window rate limiter operates per worker process/node. If multiple uvicorn worker processes or a distributed cluster are deployed in production, rate limits will apply per node unless backed by a centralized Redis instance. For the current single-host development/production baseline, in-memory is lightweight and robust.
- **Client IP behind Proxies:** The limiter inspects `X-Forwarded-For` and `X-Real-IP`. In production, the upstream reverse proxy (Nginx/Cloudflare) must be configured to overwrite `X-Forwarded-For` rather than allow arbitrary client-forged headers.
- **Optional vs Required Uploads:** Images remain optional on report submission. If no file is provided or `len(file_bytes) == 0`, the validator safely permits creation without an image.

---

## 4. Conclusion

The security, rate limiting, upload validation, and anti-enumeration architecture is fully specified and ready for implementation in Milestone 2:
1. **Upload Validation:** 10MB ceiling + magic bytes inspection for JPEG, PNG, WebP + Pillow integrity check + random hex naming.
2. **Rate Limiting:** IP-based sliding window rate limiter (5 req/10 min for submissions, 20 req/min for tracking, 10 req/15 min for claims).
3. **Anti-Enumeration:** Uniform 404 response on tracking lookup + constant-time HMAC check + dummy timing equalizer.
4. **Data Sanitization:** Strict zero-leak public projection redacting PII, AI prompts/reasoning, budgets, and private timeline logs.

---

## 5. Verification Method

To independently verify the specifications:
1. **Inspect Report Document:** Review `c:\Users\Val\Desktop\PULSO\.agents\explorer_m2_2\report.md` for complete code listings and schemas.
2. **Run E2E Test Suite (Tiers 1-4):**
   ```bash
   python backend/tests/test_e2e_open_reporting.py
   ```
   Pass criteria: All 32+ tests across Feature, Boundary (10MB, MIME, Anti-Enumeration), Cross-Feature, and Workload tiers complete with 0 failures.
3. **Inspect Schema & Models:**
   - `backend/models.py` lines 218-297
   - `backend/schemas.py` lines 170-278
   - `backend/utils/security.py` lines 15-97
