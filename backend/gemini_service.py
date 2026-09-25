"""
gemini_service.py — PULSO AI Intelligence Layer
Caloocan City Engineering Office — PULSO System

SDK:   google-genai (Vertex AI mode via service account)
Auth:  Configured service account credentials
Model: Configurable Vertex AI model and serving region
"""

import os
import json
import base64
import time
import hashlib
import threading
from collections import OrderedDict
from dotenv import load_dotenv
from typing import Dict, Any, Optional

load_dotenv()

GOOGLE_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "google-credentials.json")
GCP_PROJECT        = os.getenv("GOOGLE_CLOUD_PROJECT", "pulso-509010")
GCP_LOCATION       = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
GEMINI_MODEL       = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ── SDK Init ──────────────────────────────────────────────────────────────────

_client    = None
_SDK_READY = False

def _init():
    global _client, _SDK_READY
    # Set credentials path for ADC (Application Default Credentials)
    creds_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), GOOGLE_CREDENTIALS)
    if os.path.exists(creds_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
    elif os.path.exists(GOOGLE_CREDENTIALS):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS
    else:
        print(f"[AI] [FAILED] Service account credentials not found at '{GOOGLE_CREDENTIALS}' — AI features disabled.")
        return
    try:
        from google import genai
        _client = genai.Client(
            vertexai=True,
            project=GCP_PROJECT,
            location=GCP_LOCATION,
        )
        _SDK_READY = True
        print(f"[AI] [SUCCESS] Vertex AI SDK ready  |  Model: {GEMINI_MODEL}")
        print(f"[AI]    Project  : {GCP_PROJECT}")
        print(f"[AI]    Location : {GCP_LOCATION}")
        print("[AI]    Auth     : Configured service account; request access verified on use")
    except Exception as e:
        print(f"[AI] [ERROR] Vertex AI SDK init failed: {e}")

_init()


# ── Rate Limiting & Cost Protection ───────────────────────────────────────────
# Student project budget protection — hard caps to prevent bill blowup

# Configurable limits (adjust as needed)
DAILY_API_CAP       = int(os.getenv("AI_DAILY_CAP", "200"))     # Max Gemini calls per day (200 = ~100 ID scans)
PER_USER_RPM        = int(os.getenv("AI_PER_USER_RPM", "10"))    # Max calls per user per minute
CACHE_MAX_SIZE      = int(os.getenv("AI_CACHE_SIZE", "100"))     # Max cached responses
CACHE_TTL_SECONDS   = int(os.getenv("AI_CACHE_TTL", "300"))      # Cache TTL (5 min default)
AI_DISABLED         = os.getenv("AI_DISABLED", "false").lower() == "true"

# Paths for persistence
USAGE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".ai_usage.json")

class _RateLimiter:
    """In-memory rate limiter with daily cap, per-user throttle, and response cache."""

    def __init__(self):
        self._lock = threading.Lock()
        # Daily counter (load from file if exists)
        self._daily_count = 0
        self._daily_reset_date = time.strftime("%Y-%m-%d")
        self._load_usage()
        
        # Per-user sliding window: { user_id: [timestamp, ...] }
        self._user_windows: Dict[str, list] = {}
        # Burst window: { user_id: [timestamp, ...] } (3 requests / 10s)
        self._user_bursts: Dict[str, list] = {}
        
        # Response cache: OrderedDict for LRU eviction
        self._cache: OrderedDict = OrderedDict()
        # Stats
        self._total_cached_hits = 0
        self._total_blocked = 0

    def _load_usage(self):
        """Restore daily usage from local file."""
        if os.path.exists(USAGE_FILE):
            try:
                with open(USAGE_FILE, "r") as f:
                    data = json.load(f)
                    if data.get("date") == self._daily_reset_date:
                        self._daily_count = data.get("count", 0)
                        print(f"[AI RATE] [RESTORE] Loaded usage: {self._daily_count} calls today.")
                    else:
                        print(f"[AI RATE] [INFO] Skipping stale usage file from {data.get('date')}")
            except Exception as e:
                print(f"[AI RATE] [ERROR] Failed to load usage file: {e}")

    def _persist_usage(self):
        """Save current daily usage to file."""
        try:
            with open(USAGE_FILE, "w") as f:
                json.dump({"date": self._daily_reset_date, "count": self._daily_count}, f)
        except Exception as e:
            print(f"[AI RATE] [ERROR] Failed to save usage: {e}")

    def _reset_daily_if_needed(self):
        today = time.strftime("%Y-%m-%d")
        if today != self._daily_reset_date:
            print(f"[AI RATE] [RESET] Daily counter reset. Yesterday: {self._daily_count} calls.")
            self._daily_count = 0
            self._daily_reset_date = today
            self._persist_usage()

    def check_and_consume(self, user_id: str = "anonymous") -> tuple:
        """
        Check if a request is allowed.
        Returns (allowed: bool, reason: str)
        """
        if AI_DISABLED:
             return False, "AI features are currently disabled by the administrator."

        with self._lock:
            self._reset_daily_if_needed()

            # 1. Daily hard cap
            if self._daily_count >= DAILY_API_CAP:
                self._total_blocked += 1
                print(f"[AI RATE] [BLOCKED] DAILY CAP REACHED ({DAILY_API_CAP}). Call blocked for {user_id}.")
                return False, f"AI daily limit reached ({DAILY_API_CAP}/day). Resets at midnight."

            # 2. Burst Protection (Max 3 per 10s)
            now = time.time()
            burst_window = self._user_bursts.setdefault(user_id, [])
            burst_window[:] = [t for t in burst_window if now - t < 10]
            if len(burst_window) >= 3:
                self._total_blocked += 1
                return False, "Request sent too quickly. Please wait a few seconds."

            # 3. Per-user rate limit (sliding window - 1 min)
            window = self._user_windows.setdefault(user_id, [])
            # Purge entries older than 60 seconds
            window[:] = [t for t in window if now - t < 60]
            if len(window) >= PER_USER_RPM:
                self._total_blocked += 1
                print(f"[AI RATE] [WARNING] User {user_id} exceeded {PER_USER_RPM} calls/min. Throttled.")
                return False, f"Too many requests. ({PER_USER_RPM}/min limit)."

            # 4. Allowed — consume
            burst_window.append(now)
            window.append(now)
            self._daily_count += 1
            self._persist_usage()
            
            remaining = DAILY_API_CAP - self._daily_count

            # Print status every 10 calls or when below 20%
            if self._daily_count % 10 == 0 or remaining < DAILY_API_CAP * 0.2:
                pct = (self._daily_count / max(DAILY_API_CAP, 1)) * 100
                print(f"[AI RATE] [STATS] {self._daily_count}/{DAILY_API_CAP} daily calls used ({pct:.0f}%) | Cache hits: {self._total_cached_hits} | Blocked: {self._total_blocked}")

            return True, ""

    def get_cached(self, cache_key: str) -> Optional[str]:
        """Check if a response is cached and still valid."""
        with self._lock:
            if cache_key in self._cache:
                value, timestamp = self._cache[cache_key]
                if time.time() - timestamp < CACHE_TTL_SECONDS:
                    self._total_cached_hits += 1
                    self._cache.move_to_end(cache_key)  # LRU
                    return value
                else:
                    del self._cache[cache_key]  # Expired
        return None

    def set_cached(self, cache_key: str, value: str):
        """Store a response in cache."""
        with self._lock:
            self._cache[cache_key] = (value, time.time())
            # Evict oldest if over size
            while len(self._cache) > CACHE_MAX_SIZE:
                self._cache.popitem(last=False)

    def get_stats(self) -> Dict:
        """Return current rate limiter stats."""
        with self._lock:
            self._reset_daily_if_needed()
            return {
                "daily_used": self._daily_count,
                "daily_cap": DAILY_API_CAP,
                "daily_remaining": DAILY_API_CAP - self._daily_count,
                "daily_pct": round((self._daily_count / max(DAILY_API_CAP, 1)) * 100, 1),
                "cache_size": len(self._cache),
                "cache_hits": self._total_cached_hits,
                "total_blocked": self._total_blocked,
                "per_user_rpm": PER_USER_RPM,
                "ai_disabled": AI_DISABLED
            }


_rate_limiter = _RateLimiter()

def _make_cache_key(prompt: str, image_data: Optional[bytes] = None, image_data2: Optional[bytes] = None) -> str:
    """Generate a cache key from the prompt and optional image hash."""
    h = hashlib.md5(prompt.encode("utf-8", errors="ignore"))
    if image_data:
        h.update(hashlib.md5(image_data[:8192]).digest())  # Hash first 8KB of image for speed
    if image_data2:
        h.update(hashlib.md5(image_data2[:8192]).digest())
    return h.hexdigest()

def get_rate_limit_stats() -> Dict:
    """Public accessor for rate limit dashboard."""
    return _rate_limiter.get_stats()

print(f"[AI RATE] [INFO] Rate limiter active: {DAILY_API_CAP}/day, {PER_USER_RPM}/user/min, cache={CACHE_MAX_SIZE}, kill_switch={'ON' if AI_DISABLED else 'OFF'}")

# ── Internal helpers ──────────────────────────────────────────────────────────

def _generate(prompt: str, json_mode: bool = True, user_id: str = "system") -> Optional[str]:
    """Call Gemini with a text-only prompt (rate-limited + cached)."""
    if not _SDK_READY or _client is None:
        return None

    # Check cache first (text-only calls are very cacheable)
    cache_key = _make_cache_key(prompt)
    cached = _rate_limiter.get_cached(cache_key)
    if cached:
        return cached

    # Rate limit check
    allowed, reason = _rate_limiter.check_and_consume(user_id)
    if not allowed:
        print(f"[AI] Rate limited: {reason}")
        return None

    try:
        from google.genai import types
        cfg = types.GenerateContentConfig(
            response_mime_type="application/json" if json_mode else "text/plain",
            temperature=0.0
        )
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=cfg,
        )
        result = resp.text.strip()
        # Cache successful responses
        if result and json_mode:
            _rate_limiter.set_cached(cache_key, result)
        return result
    except Exception as e:
        print(f"[AI] generate error: {e}")
        return None


def _detect_image_mime(image_bytes: bytes, default_mime: str = "image/jpeg") -> str:
    """Detect image MIME from magic bytes."""
    if not image_bytes:
        return default_mime
    if image_bytes.startswith(b'\x89PNG\r\n\x1a\n') or image_bytes.startswith(b'\x89PNG'):
        return "image/png"
    if image_bytes.startswith(b'RIFF') and len(image_bytes) >= 12 and image_bytes[8:12] == b'WEBP':
        return "image/webp"
    if image_bytes.startswith(b'\xff\xd8\xff'):
        return "image/jpeg"
    return default_mime


def _generate_multimodal(prompt: str, image_bytes: bytes, mime: str = "image/jpeg", user_id: str = "system") -> Optional[str]:
    """Call Gemini with a text + image prompt (Vision) — rate-limited + cached."""
    if not _SDK_READY or _client is None:
        return None

    # Check cache (image hash included)
    cache_key = _make_cache_key(prompt, image_bytes)
    cached = _rate_limiter.get_cached(cache_key)
    if cached:
        return cached

    # Rate limit check
    allowed, reason = _rate_limiter.check_and_consume(user_id)
    if not allowed:
        print(f"[AI] Rate limited (multimodal): {reason}")
        return None

    try:
        from google.genai import types
        real_mime = _detect_image_mime(image_bytes, mime)
        img_part = types.Part.from_bytes(data=image_bytes, mime_type=real_mime)
        cfg = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0,
        )
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[prompt, img_part],
            config=cfg,
        )
        result = resp.text.strip()
        # Cache successful multimodal responses
        if result:
            _rate_limiter.set_cached(cache_key, result)
        return result
    except Exception as e:
        print(f"[AI] multimodal error: {e}")
        return None


def _generate_multimodal_dual(prompt: str, img1: bytes, img2: bytes, mime: str = "image/jpeg", user_id: str = "system") -> Optional[str]:
    """Call Gemini with a text + two ID images for visual cross-referencing (rate-limited + cached)."""
    if not _SDK_READY or _client is None:
        return None

    # Check cache
    cache_key = _make_cache_key(prompt, img1, img2)
    cached = _rate_limiter.get_cached(cache_key)
    if cached:
        return cached

    # Rate limit check (dual images are expensive)
    allowed, reason = _rate_limiter.check_and_consume(user_id)
    if not allowed:
        print(f"[AI] Rate limited (dual-modal): {reason}")
        return None

    try:
        from google.genai import types
        part1 = types.Part.from_bytes(data=img1, mime_type=_detect_image_mime(img1, mime))
        part2 = types.Part.from_bytes(data=img2, mime_type=_detect_image_mime(img2, mime))
        cfg = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0,
        )
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[prompt, "FRONT ID IMAGE:", part1, "BACK ID IMAGE:", part2],
            config=cfg,
        )
        result = resp.text.strip()
        # Cache successful responses
        if result:
            _rate_limiter.set_cached(cache_key, result)
        return result
    except Exception as e:
        print(f"[AI] multimodal-dual error: {e}")
        return None


# ── Response Cleaner ─────────────────────────────────────────────────────────

def _clean_response(text: str) -> str:
    """
    Strip markdown formatting symbols from AI responses so they display
    cleanly in the PULSO chat UI without raw asterisks or hashes.
    """
    import re
    # Remove bold (**text** or __text__)
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
    text = re.sub(r'_{1,2}(.*?)_{1,2}', r'\1', text)
    # Remove heading markers
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Replace bullet points (* item or - item) with a clean dash
    text = re.sub(r'^[\*\-]\s+', '• ', text, flags=re.MULTILINE)
    # Remove leftover lone asterisks
    text = text.replace('**', '').replace('*', '')
    # Collapse 3+ blank lines into 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def analyze_report(description: str, image_data: Optional[bytes] = None) -> Dict:
    """
    PULSO Vision Eye — Triage agent for resident infrastructure reports.
    Performs multi-modal Vision analysis when an image is attached.

    Returns: category, urgency, severity_score, smart_summary,
             reasoning, image_analysis, is_inappropriate, rejection_reason,
             auto_description
    """
    prompt = f"""You are the "Vision Eye" triage agent for PULSO, the infrastructure management system of the Caloocan City Engineering Office, Metro Manila.

Analyze the following resident report and provide a structured technical assessment.

Report Description: "{description}"
{"An image has been attached. Examine it carefully for visible hazards, structural damage, or public safety risks related to the description." if image_data else "No image attached."}

Return ONLY a valid JSON object with EXACTLY these keys (no extra text before or after):
{{
  "category": "Road Issue, Water/Drainage",
  "urgency": "Medium",
  "severity_score": 5.0,
  "smart_summary": "One-sentence technical summary for a dispatcher",
  "reasoning": "Brief justification for the severity score and category choice based on Scope of Service",
  "image_analysis": "Detailed description of detected hazards, infrastructure types, and technical markers seen in the image",
  "auto_description": "A 1-3 sentence technical description of what is visible in the image, suitable as a citizen report body (e.g. 'Severe pothole approximately 1 meter wide on Main Avenue near Deparo. Road surface has deteriorated significantly, exposing the aggregate base.')",
  "is_infrastructure": true,
  "is_inappropriate": false,
  "rejection_reason": ""
}}

Intelligence Rules (STRICT SCOPE OF SERVICE):
1. CATEGORY SELECTION: Identify ALL that apply, separated by comma. Use the following Scope of Service:
   - Roads & Bridges: Local city/barangay roads, potholes, broken pavement, sidewalks, gutters, pavement markings (crossings/dividers).
   - Water & Drainage: De-clogging canals/manholes, pumping stations, estero flood control. Public fountains/toilets in parks. 
     *EXCLUSION: Do NOT include potable water supply (Maynilad) or major rivers.*
   - Street Lighting: Burned-out streetlight bulbs, city-owned electrical wiring/lamp posts.
   - Public Safety & Regulatory: Structural safety (post-earthquake), building permit compliance, debris/fallen tree clearing, fire/electrical compliance for NEW constructions.
   - Public Facilities: Public schools, health centers, City Hall, basketball courts, plazas, covered courts, parks.

2. SCANNING GUIDELINES: 
   - Examine images CAREFULLY for infrastructure markers (city-owned vs private utility).
   - Look for specific technical details: pavement cracks, clogged drainage grates, burnt out LED modules, or structural fractures in public school walls.

3. ZERO-GUESS POLICY: If the issue is NOT within the Engineering Office scope (e.g., private indoor plumbing, Maynilad water leaks, Meralco power line issues without post damage) or is ambiguous, you MUST set "category": "Undetermined" and "is_infrastructure": false, "is_inappropriate": true.

4. Urgency options: Low | Medium | High | Critical

Severity Guidelines:
- Downed electrical wires / structural collapse / active fire → Critical, score 9–10
- Missing manhole covers / deep potholes on main roads / major flooding → High, score 7–8
- Minor potholes / uncollected garbage / flickering streetlights → Low–Medium, score 2–5
- Spam, joke, hate speech, or offensive content → is_inappropriate: true, is_infrastructure: false

5. CRITICAL IMAGE CONTENT MODERATION — MANDATORY:
   If an image is attached, you MUST perform content screening BEFORE any infrastructure analysis:
   a) FACE / SELFIE DETECTION: If the image is primarily a selfie, portrait, person, or close-up of a human face (not an incidental bystander in the background of an infrastructure photo), this is NOT a valid infrastructure report. Set:
      - "is_infrastructure": false
      - "is_inappropriate": true
      - "rejection_reason": "This looks like a personal photo or selfie. Please take a photo showing the actual road damage, street lighting, drainage, or city hazard instead."
      - "category": "Inappropriate Content"
   b) NON-INFRASTRUCTURE CONTENT: If the image shows food, animals, random objects, memes, indoor rooms, screenshots, or any content clearly unrelated to city public works and infrastructure, set:
      - "is_infrastructure": false
      - "is_inappropriate": true  
      - "rejection_reason": "We couldn't clearly see a city infrastructure issue in this photo. Please take a photo showing the actual problem (such as a pothole, broken streetlight, or drainage hazard)."
      - "category": "Inappropriate Content"
   c) VALID INFRASTRUCTURE images:
      - "is_infrastructure": true
      - "is_inappropriate": false

6. AUTO-DESCRIPTION: If the image shows a legitimate infrastructure issue, generate a professional 1-3 sentence description in "auto_description" that describes the visible problem as if a citizen is reporting it. This should be factual, specific, and include observable details (size of damage, type of infrastructure, visible severity). If the image is inappropriate or no image is provided, set "auto_description" to an empty string.
"""
    try:
        raw = (_generate_multimodal(prompt, image_data) if image_data
               else _generate(prompt, json_mode=True))
        if raw:
            parsed = json.loads(raw)
            # Enforce strict infrastructure validity
            is_infra = parsed.get("is_infrastructure", True)
            is_inapp = parsed.get("is_inappropriate", False)
            cat = str(parsed.get("category", "")).lower()

            if is_inapp or not is_infra or "inappropriate" in cat or cat == "undetermined":
                parsed["is_inappropriate"] = True
                parsed["is_infrastructure"] = False
                if not parsed.get("rejection_reason"):
                    parsed["rejection_reason"] = "We couldn't clearly see a city infrastructure issue in this photo. Please take a photo showing the actual problem."
            else:
                parsed["is_inappropriate"] = False
                parsed["is_infrastructure"] = True
            return parsed
    except Exception as e:
        print(f"[AI] analyze_report parse error: {e}")

    return _local_safety_check(description)


def extract_id_data(
    front_ocr: str, 
    back_ocr: str = "", 
    id_type: str = "unknown", 
    front_image: Optional[bytes] = None, 
    back_image: Optional[bytes] = None,
    heuristic_context: str = "",
    expected_id_type: Optional[str] = None
) -> Optional[Dict]:
    """
    AI Multi-Side ID Parser & Visual Auditor — Structures OCR and performs 
    Multimodal Vision analysis to ensure front and back portraits match and
    extracts fields according to known Philippine ID templates.
    """
    if not _SDK_READY:
        return None

    target_type = expected_id_type or id_type or "unknown"
    ocr_context = f"FRONT SIDE OCR:\n{front_ocr}\n\nBACK SIDE OCR:\n{back_ocr}" if back_ocr else f"FRONT SIDE ONLY:\n{front_ocr}"
    advisory_context = f"ADVISORY: System suspects a potential data/surface inconsistency.\n{heuristic_context}\n" if heuristic_context else ""
    image_context = "Two images (FRONT and BACK) are attached for Visual Verification." if back_image else "One image (FRONT) is attached."

    prompt = f"""You are an elite ID Verification agent for the Caloocan City Engineering Office.
You are performing a TEMPLATE-AWARE MULTIMODAL AUDIT of a Philippine ID (Declared Type: {target_type}).

{ocr_context}

{advisory_context}
{image_context}

Extract into a JSON object with these exact fields:
{{
  "id_number": "",
  "first_name": "",
  "last_name": "",
  "middle_name": "",
  "suffix": "",
  "dob": "",
  "sex": "",
  "address": "",
  "house_no": "",
  "block_lot": "",
  "subdivision": "",
  "street": "",
  "barangay": "",
  "pcn": "",
  "license_no": "",
  "postal_code": "",
  "is_document_mismatch": false,
  "is_visual_face_match": true,
  "face_match_confidence": "high",
  "mismatch_reason": "",
  "front_id_type": "unknown",
  "back_id_type": "unknown",
  "is_front_correct": true,
  "is_back_correct": true,
  "field_confidences": {{
    "id_number": "high",
    "first_name": "high",
    "last_name": "high",
    "dob": "high",
    "address": "high"
  }}
}}

Intelligence Rules (STRICT ZERO TOLERANCE FOR ERROR):
1. TEMPLATE-BASED ID NUMBER EXTRACTION:
   - "id_number" is the MOST CRITICAL FIELD. Extract the primary identification number for this card:
     * PhilSys National ID: 16 digits (PCN), format XXXX-XXXX-XXXX-XXXX or 16 continuous digits.
     * Driver's License (LTO): License number at top right, format [A-Z]XX-XX-XXXXXX.
     * UMID: 12-digit Common Reference Number (CRN) at top right, format XXXX-XXXXXXX-X.
     * Passport (DFA): Passport number at top right and on MRZ line, format [A-Z]XXXXXXX.
     * PhilHealth: 12-digit PIN at top, format XX-XXXXXXXXX-X.
     * Voter's ID / Cert: Voter ID / VIN (Voter Identification Number) or Precinct Number.
     * SSS / GSIS: 10-digit SSS Number (XX-XXXXXXX-X) or GSIS BP Number.
     * Postal ID: 16-character Postal Reference Number (PRN) or PH- number.
     * Barangay ID: Control number or Certificate number.
   - Populate "id_number" with the clean, formatted number without label prefixes.

2. PHILIPPINE NATIONAL ID (PhilSys) TWO-SIDED STRUCTURE — CRITICAL:
   - The FRONT of PhilSys contains:
     * PCN: 16-digit card number (e.g. 2197-1609-8154-0734)
     * Full Name: Last Name (Apelyido), Given Names (Mga Pangalan), Middle Name (Gitnang Apelyido)
     * Date of Birth (Petsa ng Kapanganakan)
     * RESIDENCE ADDRESS (Tirahan): e.g. "PH8A PKG14 BLK15 LOT11, BARANGAY 176, CITY OF CALOOCAN, NCR, THIRD DISTRICT"
     * Portrait Photo
   - The BACK of PhilSys contains:
     * Large QR Code
     * Sex (Kasarian / Sex: MALE or FEMALE)
     * Blood Type (Uri ng Dugo)
     * Marital Status (Kalagayang Sibil)
     * PLACE OF BIRTH (Lugar ng Kapanganakan): e.g. "CAMALIGAN, CAMARINES SUR" or any Philippine province/town.
   - RESIDENCE ADDRESS vs PLACE OF BIRTH:
     * "Lugar ng Kapanganakan" on the back is the PLACE OF BIRTH, NOT the residence address.
     * The RESIDENCE ADDRESS is printed strictly on the FRONT ("Tirahan").
     * NEVER compare the front Residence Address to the back Place of Birth! It is completely expected and normal for someone born in another province to now reside in Caloocan City. This is NEVER an address discrepancy or document mismatch.
   - COMBINE BOTH SIDES:
     * Extract Name, ID Number, DOB, and Address from the FRONT.
     * Extract Sex (Kasarian) from the BACK.

3. VISUAL OCR OVERRIDE:
   - The provided images are the ultimate source of truth. If raw OCR text has typos or misread characters, use your visual reading of the images. NEVER report a mismatch due to minor OCR character noise.

4. ID Type & Mismatch Check:
   - Identify the exact ID type on Front and Back.
   - If the resident declared "{target_type}" but the uploaded card is clearly a completely different government document (e.g. resident declared Driver's License but uploaded a Passport or PhilHealth), set "is_document_mismatch": true and "mismatch_reason": "You selected [declared type], but the uploaded card appears to be [actual card type]. Please choose the matching ID type or upload the correct card."
   - If BOTH the FRONT and BACK images are the same side, set "is_document_mismatch": true and "mismatch_reason": "SCAN ERROR: You have scanned the same side of the ID twice. Please scan Front and Back separately."

5. VISUAL FACE MATCH — BIOMETRIC AUDIT:
   - Compare portrait on Front with secondary photo/ghost portrait on Back if present.
   - If different people, set "is_visual_face_match": false, "is_document_mismatch": true, "mismatch_reason": "IDENTITY MISMATCH: The portrait photo on the front does not match the individual on the back."

6. PHILIPPINE ADDRESS & NAME INTELLIGENCE:
   - Names: Separate into first_name, middle_name, last_name, suffix.
   - Birthdate: Must be YYYY-MM-DD.
   - house_no: House / Unit / Lot number.
   - block_lot: Block and Lot if specified (e.g. "BLK 15 LOT 11").
   - subdivision: Phase / Package / Subdivision name (e.g. "PH8A PKG14").
   - barangay: Exact number for Caloocan (e.g. "176") or name. Priority: numeric string without "Barangay" prefix.
   - Assign confidence ("high", "medium", "low") for key fields based on image legibility.

7. RESPONSE FORMAT:
   - If "is_document_mismatch" is true, ensure "mismatch_reason" is descriptive and professional. Do NOT flag mismatch for normal multi-side ID card structures.

"""
    try:
        if front_image and back_image:
             raw = _generate_multimodal_dual(prompt, front_image, back_image)
        elif front_image:
             raw = _generate_multimodal(prompt, front_image)
        else:
             raw = _generate(prompt, json_mode=True)
             
        if raw:
            return json.loads(raw)
    except Exception as e:
        print(f"[AI] ID extraction error: {e}")
    return None


def generate_advisory_content(report_details: Dict[str, Any]) -> Dict:
    """
    AI Advisory Drafter — Creates professional, bilingual (English/Tagalog)
    public advisories from technical incident reports for LGU Dispatchers.
    """
    prompt = f"""You are the Senior Communications Officer of the Caloocan City Engineering Office.
Draft a professional public advisory based on the following incident report.

Report Details:
- Issue Type    : {report_details.get("category", "Infrastructure Issue")}
- AI Summary    : {report_details.get("ai_summary") or report_details.get("description", "N/A")}
- Location      : {report_details.get("location_string", "Caloocan City, Metro Manila")}
- Severity Score: {report_details.get("severity_score", "N/A")} / 10.0
- Urgency Level : {report_details.get("ai_urgency", "N/A")}

Return ONLY valid JSON with these exact fields:
{{
  "title": "Professional advisory heading",
  "body": "English advisory text.\\n\\nSalin sa Filipino: Tagalog translation here.",
  "priority": "High"
}}

Priority options: High | Medium | Info
"""
    try:
        raw = _generate(prompt, json_mode=True)
        if raw:
            return json.loads(raw)
    except Exception as e:
        print(f"[AI] Advisory generation error: {e}")

    # Graceful fallback
    return {
        "title": f"Public Advisory: {report_details.get('category', 'Infrastructure Issue')}",
        "body": (
            f"The Caloocan City Engineering Office has been informed of an infrastructure "
            f"concern at {report_details.get('location_string', 'Caloocan City')}. "
            f"Field engineers are currently on site. The public is advised to exercise "
            f"caution in the affected area.\n\n"
            f"Salin sa Filipino: Ang tanggapan ng Inhinyeriya ng Lungsod ng Caloocan ay "
            f"naabisuhan ng naturang isyu. Pakiusap na mag-ingat ang publiko sa lugar."
        ),
        "priority": "Info"
    }


def get_ai_assistant_response(query: str, context: Optional[str] = None) -> Dict:
    """
    PULSO Omni-Assistant — Domain-aware AI chat for LGU staff and Citizens.
    Covers DPWH standards, procurement law, city workflows, and system guidance.
    """
    if not _SDK_READY:
        return {"response": (
            "Pagpasensya na, ang PULSO AI ay pansamantalang hindi available. "
            "Subukan muli sa ilang sandali.\n"
            "PULSO AI is temporarily unavailable. Please try again shortly."
        )}

    prompt = f"""You are PULSO AI, the official intelligent assistant for the Caloocan City Infrastructure Management System.
You assist both LGU Staff (Engineers, Dispatchers, Clerks) and Citizens.

Knowledge Domain:
- DPWH engineering standards (roads, drainage, electrical, structural)
- Philippine government ID verification (PhilSys, LTO, UMID)
- RA 9184 Government Procurement Law
- Caloocan City Engineering Office procedures
- PULSO system navigation, features, and workflows
- Barangay-level infrastructure issues in Caloocan City

Communication Style:
- Technical and precise for engineers/dispatchers
- Friendly and bilingual (English/Tagalog) for citizens
- Always helpful, clear, and professional
- IMPORTANT: Do NOT use markdown formatting. No asterisks, no bold (**), no bullet symbols (*), no headers (#). Use plain text only. For lists, use numbered items (1. 2. 3.) or write in full sentences.

System Context: {context or "General system inquiry"}
User Query: {query}

Provide a helpful, accurate, plain-text response:"""

    try:
        raw = _generate(prompt, json_mode=False)
        if raw:
            return {"response": _clean_response(raw)}
    except Exception as e:
        print(f"[AI] Assistant error: {e}")

    return {"response": (
        "Pagpasensya na, ang PULSO Brain ay abala ngayon. Subukan muli sa ilang sandali.\n"
        "The PULSO Brain is currently processing. Please try again in a moment."
    )}


# ── Public Vision API Wrapper (used by philsys_service.py) ───────────────────

async def analyze_image_with_prompt(image_bytes: bytes, prompt: str, user_id: str = "philsys") -> Dict:
    """
    Public async wrapper for Gemini Vision (multimodal) OCR.
    Called by philsys_service.py for PhilID OCR extraction.
    
    Returns: { "text": "...", "success": bool }
    """
    # Detect mime type from file header
    mime = "image/jpeg"
    if image_bytes[:4] == b'\x89PNG':
        mime = "image/png"
    elif image_bytes[:4] == b'RIFF':
        mime = "image/webp"

    raw = _generate_multimodal(prompt, image_bytes, mime=mime, user_id=user_id)
    if raw:
        return {"text": raw, "success": True}
    return {"text": "", "success": False}


# ── Always-On Safety Fallback ─────────────────────────────────────────────────

def _local_safety_check(description: str) -> Dict:
    """
    Deterministic keyword-based content moderation.
    Active as final fallback when Gemini API is unreachable.
    Guarantees the moderation gateway NEVER fails — even during API outages.
    """
    BANNED = [
        "hate speech", "hate", "violence", "violent", "kill", "murder",
        "spam", "fake report", "prank", "threats", "offensive",
        "naked", "nudity", "bomb", "explosive", "racist", "sexist",
    ]
    lower = description.lower()
    matched = [kw for kw in BANNED if kw in lower]

    if matched:
        return {
            "category": "Inappropriate Content",
            "urgency": "Low",
            "severity_score": 0.0,
            "smart_summary": "Content flagged by local safety filter.",
            "reasoning": f"Prohibited keywords detected: {', '.join(matched)}",
            "image_analysis": "No image provided",
            "is_inappropriate": True,
            "rejection_reason": (
                f"Report rejected: contains prohibited content "
                f"({', '.join(matched)}). Please submit only genuine "
                "infrastructure hazard reports."
            )
        }

    return {
        "category": "General Infrastructure",
        "urgency": "Medium",
        "severity_score": 5.0,
        "smart_summary": description[:120],
        "reasoning": "AI temporarily unavailable. Manual review recommended.",
        "image_analysis": "No image provided",
        "is_inappropriate": False,
        "rejection_reason": ""
    }

def generate_maintenance_plan(asset_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    AI Engineering Planner — Generates a detailed maintenance strategy for an asset.
    """
    if not _SDK_READY:
        return {
            "plan": "AI maintenance planner is currently unavailable.",
            "steps": [],
            "estimated_cost": 0
        }

    prompt = f"""You are the Lead Maintenance Engineer for the Caloocan City Engineering Office.
Generate a structured maintenance plan for the following infrastructure asset.

Asset Information:
- Name: {asset_data.get('asset_name')}
- Category: {asset_data.get('category')}
- Barangay: {asset_data.get('barangay')}
- Health Score: {asset_data.get('health_score')} / 100
- Material: {asset_data.get('material_type')}
- Design Life: {asset_data.get('design_life')} years
- Last Maintenance: {asset_data.get('last_maintenance_date', 'Unknown')}
- Environmental Risks: {asset_data.get('environmental_risks', 'Standard')}

Return ONLY a valid JSON object with these EXACT fields:
{{
  "priority": "CRITICAL | HIGH | MODERATE | LOW",
  "maintenance_plan": "A concise executive summary of the recommended action.",
  "steps": [
    "Step 1: Description",
    "Step 2: Description",
    "Step 3: Description"
  ],
  "estimated_cost": 25000,
  "estimated_duration_days": 5,
  "required_personnel": ["Civil Engineer", "Maintenance Crew", "Inspector"],
  "technical_justification": "Why this specific plan is recommended based on asset health and risk."
}}

Engineering Rules:
1. Be technically specific (use engineering terms).
2. Cost estimate should be in PHP (Philippine Pesos).
3. If the asset health is < 40, prioritize replacement or major rehabilitation.
4. If the asset category is 'Drainage' and 'Rainy Season' is mentioned, prioritize de-clogging and structural reinforcement.
5. NO MARKDOWN. ONLY PLAIN TEXT STRINGS IN JSON.
"""

    try:
        raw = _generate(prompt, json_mode=True)
        if raw:
            return json.loads(raw)
    except Exception as e:
        print(f"[AI] Maintenance plan generation error: {e}")

    return {
        "priority": "HIGH",
        "maintenance_plan": f"Urgent preventive maintenance required for {asset_data.get('asset_name')}.",
        "steps": ["Site inspection", "Surface cleanup", "Material patching"],
        "estimated_cost": 45000,
        "estimated_duration_days": 3,
        "required_personnel": ["Field Inspector", "Maintenance Team"],
        "technical_justification": "Fallback plan generated due to AI processing error."
    }
