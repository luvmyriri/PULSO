# Milestone 2: Security, Uploads & Rate-Limiting Specification Report

| Document Metadata | Value |
|---|---|
| Target System | PULSO — City Engineering Department Management System (Caloocan City) |
| Milestone | Milestone 2 (Security, Uploads & Rate Limiting) |
| Author | Security & Rate-Limiting Explorer (`explorer_m2_2`) |
| Date | 2026-09-02 |
| Focus Areas | (1) 10MB Upload & Magic-Byte Validation, (2) IP Sliding-Window Rate Limiting, (3) Anti-Enumeration 404 Handling, (4) Public Data Sanitization & Zero-Leak Rules |

---

## 1. Executive Summary

Milestone 2 operationalizes open public reporting for Caloocan City without mandatory pre-registration. Because unauthenticated public endpoints (`POST /api/reports` and `POST /api/reports/track`) are exposed to the open internet, robust server-side defensive architecture is essential to prevent:
1. **Malicious / Corrupt File Upload Attacks:** Polyglot payloads, executable disguise, storage exhaustion, and MIME spoofing.
2. **Denial-of-Service & Resource Exhaustion (Spam):** Automated report flooding, Gemini AI quota depletion, and GIS clustering load.
3. **Brute-Force Token & Ticket Enumeration:** Guessing ticket IDs or tracking tokens to discover civic records.
4. **Data Leaks & PII Exposure:** Exposing reporter contact emails/phones, internal AI chain-of-thought prompts, dispatcher notes, and internal operational budgets to the public.

This specification provides concrete, verified implementation blueprints for all four security pillars, ready for immediate backend integration in `backend/main.py`, `backend/schemas.py`, `backend/crud.py`, and security middleware.

---

## 2. Specification 1: 10MB Upload Ceiling & Magic-Byte Image Validation

### 2.1 Threat Model
- **MIME Header Spoofing:** An attacker uploads an executable (`.exe`, `.sh`, `.php`) with `Content-Type: image/jpeg`.
- **Extension Disguise / Polyglot Attacks:** Attackers rename `.php` or script files to `.jpg` with embedded executable payloads in headers/EXIF metadata.
- **Resource Exhaustion (Storage DoS):** Massive multi-gigabyte files submitted to exhaust disk space and memory buffers.
- **Corrupted / Truncated Payloads:** Truncated byte streams causing backend image processing or AI vision services to crash.

### 2.2 Technical Requirements & Rules
1. **File Size Ceiling:** Exactly **10 MB** ($10 \times 1024 \times 1024 = 10,485,760$ bytes).
   - If payload exceeds 10MB, immediately reject with `422 Unprocessable Entity` and detail `"Uploaded file exceeds 10MB ceiling."`.
   - Exact 10MB ($10,485,760$ bytes) must be accepted.
2. **Allowed MIME Content-Types:**
   - `image/jpeg`, `image/jpg`, `image/png`, `image/webp`.
3. **Magic-Byte Header Signatures (Offset Inspection):**
   - Minimum byte length: 12 bytes.
   - **JPEG / JPG:** Must begin with bytes `\xFF\xD8\xFF` (SOI - Start of Image marker).
   - **PNG:** Must begin with the 8-byte signature: `\x89\x50\x4E\x47\x0D\x0A\x1A\x0A` (`\x89PNG\r\n\x1a\n`).
   - **WebP:** Must begin with `b"RIFF"` (bytes 0..3) AND have `b"WEBP"` at offset 8..11 (`file_bytes[8:12] == b"WEBP"`).
4. **File Storage & Path Sanitization:**
   - Never use client-supplied filenames.
   - Generate cryptographically randomized filename: `report_{report_id}_{secrets.token_hex(6)}.{ext}`.
   - Extension must be derived from verified magic bytes (e.g. `.jpg`, `.png`, `.webp`), not client headers.
   - Save to isolated directory (`uploads/reports/`).
5. **Zero-Byte & Missing File Handling:**
   - If `image` is `None` or not provided: Allow submission (images are optional).
   - If `image` is provided with 0 bytes: Treat as empty / no image, or reject if explicitly required.

### 2.3 Proposed Python Implementation (`backend/utils/security.py` or `backend/main.py`)

```python
import io
import os
import secrets
from typing import Optional, Tuple
from fastapi import HTTPException, status, UploadFile
from PIL import Image

MAGIC_SIGNATURES = {
    "jpeg": b"\xFF\xD8\xFF",
    "png": b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A",
    "webp_riff": b"RIFF",
    "webp_tag": b"WEBP"
}

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB (10,485,760 bytes)


def detect_image_type(file_bytes: bytes) -> Optional[str]:
    """
    Inspects leading magic byte signatures to detect valid image formats.
    Returns canonical extension string ('jpg', 'png', 'webp') or None if invalid.
    """
    if not file_bytes or len(file_bytes) < 12:
        return None
    
    # Check JPEG (FF D8 FF)
    if file_bytes.startswith(MAGIC_SIGNATURES["jpeg"]):
        return "jpg"
    
    # Check PNG (89 50 4E 47 0D 0A 1A 0A)
    if file_bytes.startswith(MAGIC_SIGNATURES["png"]):
        return "png"
    
    # Check WebP (RIFF .... WEBP)
    if file_bytes.startswith(MAGIC_SIGNATURES["webp_riff"]) and file_bytes[8:12] == MAGIC_SIGNATURES["webp_tag"]:
        return "webp"
    
    return None


async def validate_and_save_upload(
    image: Optional[UploadFile],
    upload_dir: str = "uploads/reports"
) -> Tuple[Optional[bytes], Optional[str]]:
    """
    Validates uploaded file size, MIME type, and magic bytes.
    Saves file with randomized secure name.
    
    Returns:
        (image_bytes, image_url)
    """
    if not image or not image.filename:
        return None, None
    
    # 1. Read file bytes
    content = await image.read()
    if len(content) == 0:
        return None, None
    
    # 2. 10MB Ceiling Validation
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file exceeds 10MB ceiling."
        )
    
    # 3. MIME Content-Type Validation
    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must be a valid JPEG, PNG, or WebP image."
        )
    
    # 4. Magic Byte Signature Inspection
    ext = detect_image_type(content)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must be a valid JPEG, PNG, or WebP image."
        )
    
    # 5. Pillow Parser Integrity Check (Guards against polyglot / corrupt payloads)
    try:
        with Image.open(io.BytesIO(content)) as img:
            img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is corrupted or not a valid image format."
        )
    
    # 6. Secure Path Generation & Storage
    os.makedirs(upload_dir, exist_ok=True)
    unique_filename = f"report_{secrets.token_hex(8)}.{ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as f:
        f.write(content)
        
    image_url = f"/api/uploads/reports/{unique_filename}"
    return content, image_url
```

---

## 3. Specification 2: IP-Based Sliding Window Rate Limiting

### 3.1 Threat Model
- **Report Ingestion Spam:** Automated bots spamming `POST /api/reports` to congest municipal queues and exhaust Gemini API tokens.
- **Credential Brute-Forcing:** Attackers attempting automated sweeps of `POST /api/reports/track` with dictionary combinations of `ticket_id` and `tracking_token`.
- **Claim Flooding:** Malicious users brute-forcing tracking tokens on `/api/reports/{id}/claim`.

### 3.2 Rate-Limiting Policy Matrix

| Route | Target Action | Sliding Window | Max Requests | On Breach Status | Detail Message |
|---|---|---|---|---|---|
| `POST /api/reports` | Open Guest & Auth Submission | 10 minutes (600s) | 5 requests | `429 Too Many Requests` | `"Too many submissions. Please wait 10 minutes before submitting another report."` |
| `POST /api/reports/track` | Public Status Tracking | 1 minute (60s) | 20 requests | `429 Too Many Requests` | `"Too many tracking attempts. Please try again in 5 minutes."` |
| `POST /api/reports/{id}/claim` | Account Report Claim | 15 minutes (900s) | 10 failed attempts | `429 Too Many Requests` | `"Too many claim attempts. Please try again in 15 minutes."` |

### 3.3 Sliding Window Algorithm
Unlike fixed windows (which allow double-burst attacks around window reset boundaries), the **Sliding Window Log** algorithm maintains precise timestamps of requests for each client IP.
- When request arrives at $T_{now}$:
  1. Purge all timestamps $t < (T_{now} - \text{window\_seconds})$.
  2. If $\text{count}(\text{timestamps}) \ge \text{max\_requests}$:
     - Calculate cooldown: $\text{retry\_after} = \lceil \text{timestamps}[0] + \text{window\_seconds} - T_{now} \rceil$.
     - Raise `HTTPException(429, detail=..., headers={"Retry-After": str(retry_after)})`.
  3. Otherwise:
     - Append $T_{now}$ to list.
     - Allow request to proceed.

### 3.4 Client IP Resolution & Proxy Safety
- In production, PULSO runs behind Nginx/Cloudflare reverse proxies.
- IP extraction priority:
  1. `X-Forwarded-For` header: Split by comma and take the first (leftmost) IP, trimmed.
  2. `X-Real-IP` header.
  3. `request.client.host` fallback.
- Normalization: Remove port numbers and strip whitespace.

### 3.5 Proposed Implementation (`backend/utils/rate_limiter.py`)

```python
import time
import math
from collections import defaultdict, deque
from typing import Dict, Deque
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter.
    Zero external dependencies (no Redis required for single-node deployments).
    """
    def __init__(self, max_requests: int, window_seconds: int, error_detail: str):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.error_detail = error_detail
        self.requests: Dict[str, Deque[float]] = defaultdict(deque)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
            if ip:
                return ip
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "127.0.0.1"

    def check(self, request: Request):
        client_ip = self._get_client_ip(request)
        now = time.time()
        timestamps = self.requests[client_ip]

        # 1. Purge expired timestamps outside the sliding window
        while timestamps and timestamps[0] <= now - self.window_seconds:
            timestamps.popleft()

        # 2. Check threshold
        if len(timestamps) >= self.max_requests:
            oldest_ts = timestamps[0]
            retry_after = math.ceil(oldest_ts + self.window_seconds - now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=self.error_detail,
                headers={"Retry-After": str(max(1, retry_after))}
            )

        # 3. Record new timestamp
        timestamps.append(now)

    def cleanup_inactive(self, max_idle_seconds: int = 3600):
        """Purges stale IP entries to prevent unbounded memory growth."""
        now = time.time()
        stale_keys = [
            ip for ip, ts_deque in self.requests.items()
            if not ts_deque or ts_deque[-1] < now - max_idle_seconds
        ]
        for ip in stale_keys:
            del self.requests[ip]


# Singleton instances for route dependencies
report_submission_limiter = SlidingWindowRateLimiter(
    max_requests=5,
    window_seconds=600,  # 10 minutes
    error_detail="Too many submissions. Please wait 10 minutes before submitting another report."
)

tracking_query_limiter = SlidingWindowRateLimiter(
    max_requests=20,
    window_seconds=60,   # 1 minute
    error_detail="Too many tracking attempts. Please try again in 5 minutes."
)
```

---

## 4. Specification 3: Anti-Enumeration Uniform Error Handling on Tracking

### 4.1 Threat Model: Enumeration Oracle & Timing Attacks
1. **Status Code Oracle:**
   - If non-existent ticket returns `404 Not Found`, but valid ticket with wrong token returns `403 Forbidden`, an attacker can iterate through candidate Ticket IDs (e.g. `RPT-20260902-XXXX`) to discover which tickets exist in the system.
2. **Timing Side-Channel Oracle:**
   - If non-existent tickets fail in 2ms (fast DB index miss), while existing tickets take 25ms (HMAC hashing + string compare), an attacker can distinguish valid from invalid ticket IDs based on response latency.

### 4.2 Anti-Enumeration Specifications on `POST /api/reports/track`
1. **Uniform Status Code:** The endpoint MUST return **`404 Not Found`** for:
   - Ticket ID not found in database.
   - Ticket ID found, but `tracking_token_hash` is NULL.
   - `tracking_token` fails constant-time comparison against `tracking_token_hash`.
   - Supplied `ticket_id` or `tracking_token` is empty, malformed, or blank.
2. **Uniform Error Message Body:**
   - Status: `HTTP 404 NOT FOUND`
   - Detail: `{"detail": "Report not found or invalid tracking credentials."}`
   - Exact byte-for-byte message identity across all failure branches.
3. **Constant-Time Verification & Dummy Computation:**
   - All token comparisons must use `hmac.compare_digest` / `secrets.compare_digest`.
   - When a ticket is not found in the DB, the server executes a dummy hash verification against a static dummy hash before raising 404. This equalizes CPU time and eliminates timing side-channels.

### 4.3 Contrasting `/api/reports/track` vs `/api/reports/{id}/claim`
- `POST /api/reports/track` (Public unauthenticated lookup):
  - Strict anti-enumeration $\rightarrow$ **Uniform 404**.
- `POST /api/reports/{id}/claim` (Authenticated resident claiming known ticket):
  - Report ID not found $\rightarrow$ `404 Not Found` (`{"detail": "Report not found."}`).
  - Report already claimed by another user $\rightarrow$ `409 Conflict` (`{"detail": "This report has already been claimed by another resident account."}`).
  - Report authored by registered resident $\rightarrow$ `409 Conflict` (`{"detail": "This report was authored by a registered account and cannot be claimed."}`).
  - Invalid tracking token $\rightarrow$ `403 Forbidden` (`{"detail": "Invalid tracking token for this report."}`).

### 4.4 Proposed Endpoint Implementation

```python
# Static dummy hash for constant-time dummy verification on 404
DUMMY_SALTED_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

@app.post("/api/reports/track", response_model=schemas.ReportTrackResponse)
def track_report_status(
    req: schemas.ReportTrackRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public report tracking with constant-time token verification,
    strict anti-enumeration 404 handling, and public-safe projection.
    """
    # 1. Rate Limiting Check
    tracking_query_limiter.check(request)
    
    # 2. Extract and normalize credentials
    ticket_id = (req.ticket_id or "").strip().upper()
    token = req.get_token()
    
    # 3. Query Database
    db_report = db.query(models.Report).filter(models.Report.ticket_id == ticket_id).first()
    
    # 4. Safe Anti-Enumeration Branch
    if not db_report or not db_report.tracking_token_hash:
        # Perform dummy verification to equalize execution time
        auth.verify_tracking_token(token, DUMMY_SALTED_HASH)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or invalid tracking credentials."
        )
        
    # 5. Constant-time token verification
    if not auth.verify_tracking_token(token, db_report.tracking_token_hash):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or invalid tracking credentials."
        )
        
    # 6. Build Sanitized Public Response (See Section 5)
    ...
```

---

## 5. Specification 4: Safe Public Data Sanitization & Zero-Leak Rules

### 5.1 Comprehensive Data Isolation Matrix

| Field Name | Storage Location | Exposed on `/track` (Public) | Exposed on `/public` (Hazards) | Exposed on `/me/reports` (Owner) | Exposed on `/gov` (Staff) |
|---|---|---|---|---|---|
| `id` (Database ID) | `reports.id` | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| `ticket_id` | `reports.ticket_id` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| `reporter_type` | `reports.reporter_type` | ❌ No | ❌ No | ❌ No | ✅ Yes |
| `tracking_token` (Plaintext) | Memory (Transient) | ❌ **NEVER** | ❌ **NEVER** | ❌ **NEVER** | ❌ **NEVER** |
| `tracking_token_hash` | `reports.tracking_token_hash`| ❌ **NEVER** | ❌ **NEVER** | ❌ **NEVER** | ❌ **NEVER** |
| `contact_email` | `reports.contact_email` | ❌ **REDACTED** | ❌ **REDACTED** | ❌ **REDACTED** | ✅ Yes (Staff only) |
| `contact_phone` | `reports.contact_phone` | ❌ **REDACTED** | ❌ **REDACTED** | ❌ **REDACTED** | ✅ Yes (Staff only) |
| `resident_id` | `reports.resident_id` | ❌ **REDACTED** | ❌ **REDACTED** | ❌ Redacted | ✅ Yes |
| `reporter_name` | Computed / Relational | ❌ Redacted | ❌ Redacted ("Anonymous Resident") | ❌ N/A | ✅ Full Name |
| `citizen_trust_score` | `reports.citizen_trust_score`| ❌ **REDACTED** | ❌ **REDACTED** | ❌ Redacted | ✅ Yes |
| `kyc_tier_at_report` | `reports.kyc_tier_at_report` | ❌ **REDACTED** | ❌ **REDACTED** | ❌ Redacted | ✅ Yes |
| `ai_reasoning` | `reports.ai_reasoning` | ❌ **REDACTED** | ❌ **REDACTED** | ❌ **REDACTED** | ✅ Yes |
| `ai_metadata` (Prompts) | `reports.ai_metadata` | ❌ **REDACTED** | ❌ **REDACTED** | ❌ **REDACTED** | ✅ Yes |
| `budget` | `reports.budget` | ❌ **REDACTED** | ❌ **REDACTED** | ❌ **REDACTED** | ✅ Yes |
| `deployment_date` | `reports.deployment_date` | ❌ No | ❌ No | ❌ No | ✅ Yes |
| `is_public=False` Timelines | `process_timelines` | ❌ **EXCLUDED** | ❌ **EXCLUDED** | ❌ **EXCLUDED** | ✅ Full Log |
| `is_public=True` Timelines | `process_timelines` | ✅ Included | ❌ No | ✅ Included | ✅ Yes |
| `location_barangay` | `reports.location_barangay` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| `district_code` | Derived from Coords | ✅ Yes ("D1"/"D2"/"D3") | ✅ Yes | ✅ Yes | ✅ Yes |
| `location_summary` | Sanitized Street / Barangay | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

### 5.2 Public Tracking Response Schema (`schemas.ReportTrackResponse`)

```python
class PublicTimelineItem(BaseModel):
    stage: Optional[str] = None
    status: str
    label: Optional[str] = None
    note: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportTrackResponse(BaseModel):
    ticket_id: str
    category: str
    status: str
    public_status_label: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    location_barangay: Optional[str] = None
    district_code: Optional[str] = None
    location_summary: Optional[str] = None
    image_url: Optional[str] = None
    resolution_image_url: Optional[str] = None
    is_claimed: bool = False
    public_timeline: List[PublicTimelineItem] = []

    class Config:
        from_attributes = True
```

### 5.3 Public Feed Route (`GET /api/reports/public`) Hardening
- Change authentication dependency from `Depends(get_current_user)` to `Depends(auth.get_optional_current_user)` so unauthenticated public visitors on the landing page map can view nearby hazard markers.
- Filter out non-public statuses (`pending`, `rejected`, `cancelled`).
- Sanitize output: Set `resident_id = None`, `contact_email = None`, `contact_phone = None`, `ai_reasoning = None`, `ai_metadata = None`, `budget = None`, `reporter_name = "Anonymous Resident"`.

---

## 6. Implementation Verification Plan

| Verification Probe | Command / Request | Expected Outcome |
|---|---|---|
| **V1: 10MB Ceiling Validation** | Upload 10.01MB JPEG file to `POST /api/reports` | Returns `422 Unprocessable Entity` (`"Uploaded file exceeds 10MB ceiling."`). |
| **V2: Magic Byte Integrity** | Upload text file renamed to `hazard.jpg` (`Content-Type: image/jpeg`) | Returns `422 Unprocessable Entity` (`"Uploaded file must be a valid JPEG, PNG, or WebP image."`). |
| **V3: Submission Rate Limit** | Send 6 rapid requests from same IP to `POST /api/reports` | 1st - 5th return `201 Created`; 6th returns `429 Too Many Requests` with `Retry-After` header. |
| **V4: Tracking Anti-Enumeration** | Query `POST /api/reports/track` with non-existent ID `RPT-99999999-0000` | Returns `404 Not Found` (`"Report not found or invalid tracking credentials."`). |
| **V5: Tracking Invalid Token** | Query `POST /api/reports/track` with valid ID but invalid token `TRK-0000-0000-0000-0000` | Returns identical `404 Not Found` with exact same error body. |
| **V6: Public PII & AI Redaction** | Query `POST /api/reports/track` on report with stored email/phone/ai_reasoning | Response JSON does NOT contain `contact_email`, `contact_phone`, `resident_id`, or `ai_reasoning`. |
| **V7: Full E2E Test Suite** | `python backend/tests/test_e2e_open_reporting.py` | 100% tests pass (Feature, Boundary, Cross-Feature, Workloads). |
