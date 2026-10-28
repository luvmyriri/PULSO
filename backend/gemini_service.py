"""
gemini_service.py — PULSO AI Intelligence Layer
Caloocan City Engineering Office — PULSO System

SDK:   google-genai (Vertex AI mode via service account)
Auth:  Configured service account credentials
Model: Configurable Vertex AI model and serving region
"""

import os
import re
import json
import base64
import time
import hashlib
import threading
from collections import OrderedDict
from dotenv import load_dotenv
from typing import Dict, Any, Optional

env_path = os.path.join(os.path.dirname(__file__), ".env")
local_env_path = os.path.join(os.path.dirname(__file__), ".env.local")
if os.path.exists(local_env_path):
    load_dotenv(local_env_path)
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
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
    # 1. Try Vertex AI via service account credentials
    creds_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), GOOGLE_CREDENTIALS)
    if os.path.exists(creds_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
    elif os.path.exists(GOOGLE_CREDENTIALS):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS

    vertex_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if vertex_creds and os.path.exists(vertex_creds):
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
            return
        except Exception as e:
            print(f"[AI] [WARN] Vertex AI init failed: {e}. Falling back to GOOGLE_GEMINI_API_KEY...")

    # 2. Fallback to direct Gemini API key
    gemini_key = os.getenv("GOOGLE_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            from google import genai
            _client = genai.Client(api_key=gemini_key)
            _SDK_READY = True
            print(f"[AI] [SUCCESS] Google Gemini API Key ready  |  Model: {GEMINI_MODEL}")
            return
        except Exception as e:
            print(f"[AI] [ERROR] Gemini API Key init failed: {e}")

    print(f"[AI] [FAILED] Service account credentials not found at '{GOOGLE_CREDENTIALS}' and no GOOGLE_GEMINI_API_KEY — AI features disabled.")

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


def _generate_with_tools(prompt: str, tools: list, user_id: str = "system") -> Optional[str]:
    """Call Gemini with Python callable tools for automatic grounding and tool calling."""
    if not _SDK_READY or _client is None:
        return None

    # Rate limit check
    allowed, reason = _rate_limiter.check_and_consume(user_id)
    if not allowed:
        print(f"[AI] Rate limited: {reason}")
        return None

    try:
        from google.genai import types
        cfg = types.GenerateContentConfig(
            tools=tools,
            temperature=0.1
        )
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=cfg,
        )
        if resp and resp.text:
            return resp.text.strip()
    except Exception as e:
        print(f"[AI] generate_with_tools error: {e}")
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
    Sanitizes AI assistant responses:
    - Strips all emojis and emoji variation selectors to enforce official civic tone.
    - Normalizes line breaks and whitespace.
    - Preserves all markdown formatting (**bold**, *italic*, headers, lists, code, tables).
    """
    if not text:
        return ""
    import re
    # Strip emojis, transport/map symbols, pictographs, and variation selectors
    EMOJI_PATTERN = re.compile(
        r'[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50\u2b55\u203c\u2049\u2122\u2139\u2194-\u2199\u21a9-\u21aa]|[\ufe00-\ufe0f]',
        flags=re.UNICODE
    )
    cleaned = EMOJI_PATTERN.sub('', text)
    # Collapse 3+ consecutive newlines into 2
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


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
   - Street Lighting: Burned-out streetlight bulbs, flickering or damaged lamp posts, unlit intersections.
   - Electrical Wiring: Dangling cables, exposed wires, sparking utility connections, leaning electrical poles.
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
      - "rejection_reason": "We couldn't clearly see a city infrastructure issue in this photo. Please take a photo showing the actual problem."
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
            return dict(parsed,analysis_status='suggested',provider_used=True)
    except Exception as e:
        print(f"[AI] analyze_report parse error: {e}")

    return dict(_local_safety_check(description),analysis_status='manual_review',provider_used=False)


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
  "unit": "",
  "building": "",
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
    "address": "high",
    "house_no": "high",
    "building": "high",
    "subdivision": "high",
    "street": "high",
    "barangay": "high"
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
   - unit: Unit, room or floor (e.g. "UNIT 224", "RM 5B", "3RD FLOOR").
   - building: Building name or identifier (e.g. "BLDG. D", "BUILDING 7").
   - house_no: House or unit number ONLY without building (e.g. "UNIT 224", "12").
   - block_lot: Block and Lot if specified (e.g. "BLK 15 LOT 11", "PHASE 1").
   - subdivision: Village, subdivision, condominium or residence name (e.g. "CAMARIN RESIDENCES I", "NORTHVILLE 2B", "PH8A PKG14").
   - street: Street or road name (e.g. "CAMARIN ROAD", "SAMPAGUITA ST").
   - barangay: Exact number for Caloocan (e.g. "175", "176") or name. Priority: numeric string without "Barangay" prefix.
   - Copy words exactly, do not invent. If pattern is "BLDG. D UNIT 224 CAMARIN RESIDENCES I CAMARIN", set building="BLDG. D", unit="UNIT 224", house_no="UNIT 224", subdivision="CAMARIN RESIDENCES I", street="CAMARIN".
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


def get_ai_assistant_response(
    query: str,
    context: Optional[str] = None,
    user: Optional[Any] = None,
    db: Optional[Any] = None
) -> Dict:
    """
    PULSO Omni-Assistant — Domain-aware AI chat grounded in real PULSO database records.
    Provides tool calling for resident report statuses, verified city hotlines,
    real-time advisories, and disaster guidance. Enforces professional civic tone with zero emojis.
    """
    # ── Tool Tracking & Definitions ───────────────────────────────────────────
    invoked_tools = []

    def get_my_reports(status_filter: Optional[str] = None) -> str:
        """Retrieve the authenticated resident's real filed and claimed infrastructure hazard reports from the PULSO database, including Ticket IDs, categories, statuses, locations, and filing dates."""
        if not user or not hasattr(user, "id"):
            msg = "User is not authenticated. Please log in to check your filed reports."
            invoked_tools.append({"tool": "get_my_reports", "data": msg})
            return msg
        if not db:
            msg = "Database connection unavailable to retrieve reports."
            invoked_tools.append({"tool": "get_my_reports", "data": msg})
            return msg
        try:
            from sqlalchemy import or_
            import models
            reports = db.query(models.Report).filter(
                or_(
                    models.Report.resident_id == user.id,
                    models.Report.claimed_by_user_id == user.id
                )
            ).order_by(models.Report.created_at.desc()).limit(8).all()

            if not reports:
                msg = (
                    "No infrastructure reports were found under your resident account. "
                    "If you submitted a report earlier as a guest, you can track it on the Track page using your Ticket ID and private access token."
                )
                invoked_tools.append({"tool": "get_my_reports", "data": msg})
                return msg

            lines = ["Reports on record for your account:"]
            for r in reports:
                date_str = r.created_at.strftime('%B %d, %Y') if r.created_at else 'Recent'
                loc = r.location_barangay or r.location_string or 'Caloocan City'
                lines.append(
                    f"- Ticket ID: **{r.ticket_id}** | Category: **{r.category}** | Status: **{r.status}** | Location: {loc} | Filed: {date_str} | Urgency: {r.ai_urgency or 'Normal'}"
                )
            full_res = "\n".join(lines)
            invoked_tools.append({"tool": "get_my_reports", "data": full_res[:500]})
            return full_res
        except Exception as err:
            err_msg = f"Error querying reports: {err}"
            invoked_tools.append({"tool": "get_my_reports", "data": err_msg})
            return err_msg

    def get_city_hotlines() -> str:
        """Retrieve verified official emergency hotline telephone numbers for Caloocan City (NDRRMC, PNP, BFP, DRRMO, and City Engineering Office)."""
        res = (
            "Official Caloocan City Emergency Hotlines:\n"
            "- **NDRRMC Rescue**: **911** (National Emergency & Disaster Rescue)\n"
            "- **Caloocan PNP (Philippine National Police)**: **(02) 8892-6166** / **8892-6166**\n"
            "- **BFP Caloocan (Bureau of Fire Protection)**: **(02) 8896-5700** / **8896-5700**\n"
            "- **Caloocan DRRMO (Disaster Risk Reduction and Management Office)**: **(02) 8397-6212** / **8397-6212**\n"
            "- **Caloocan City Engineering Office / Action Center**: **(02) 8288-8811 to 8830**\n"
            "- **Caloocan City North Action Center**: **(02) 8288-8811** (Local 2200 / 2201)"
        )
        invoked_tools.append({"tool": "get_city_hotlines", "data": res[:500]})
        return res

    def get_active_advisories() -> str:
        """Retrieve active city engineering notices, roadwork advisories, and emergency alerts from the Caloocan City Engineering Office."""
        if not db:
            msg = "Advisory service temporarily unavailable."
            invoked_tools.append({"tool": "get_active_advisories", "data": msg})
            return msg
        try:
            import models
            advisories = db.query(models.Advisory).order_by(models.Advisory.created_at.desc()).limit(5).all()
            if not advisories:
                msg = "There are currently no active public advisories or emergency notices from the Caloocan City Engineering Office. Check the Updates tab for real-time announcements."
                invoked_tools.append({"tool": "get_active_advisories", "data": msg})
                return msg
            lines = ["Active Public Advisories:"]
            for adv in advisories:
                date_str = adv.created_at.strftime('%B %d, %Y') if adv.created_at else 'Recent'
                lines.append(
                    f"- **[{adv.priority.upper()}] {adv.title}** ({adv.department or 'City Engineering Office'} — {date_str}): {adv.description[:220]}"
                )
            full_res = "\n".join(lines)
            invoked_tools.append({"tool": "get_active_advisories", "data": full_res[:500]})
            return full_res
        except Exception as err:
            err_msg = f"Error retrieving advisories: {err}"
            invoked_tools.append({"tool": "get_active_advisories", "data": err_msg})
            return err_msg

    def get_evacuation_routes(barangay: Optional[str] = None) -> str:
        """Check designated evacuation routes and emergency evacuation centers for Caloocan City."""
        res = (
            "Official mapped evacuation route data is not yet available in the PULSO digital system. "
            "Residents requiring emergency evacuation guidance or shelter locations during severe weather or flooding "
            "should immediately contact **Caloocan DRRMO** at **(02) 8397-6212**, **NDRRMC** at **911**, "
            "or consult their local **Barangay Hall** for designated emergency evacuation centers."
        )
        invoked_tools.append({"tool": "get_evacuation_routes", "data": res[:500]})
        return res

    def get_staff_reports_overview(status_or_scope: Optional[str] = None) -> str:
        """Retrieve real administrative citizen reports for government staff triage, including unassigned, pending verification, and today's priority cases."""
        if not db:
            return "I couldn't load that right now. You can open Reports to check."
        try:
            import models
            import gov_models
            from sqlalchemy import or_
            query = db.query(models.Report)
            s_lower = (status_or_scope or "").lower()

            if "unassigned" in s_lower:
                assigned_report_ids = [
                    row[0] for row in db.query(gov_models.WorkOrder.report_id)
                    .filter(
                        gov_models.WorkOrder.report_id.isnot(None),
                        gov_models.WorkOrder.status.notin_(['cancelled', 'rejected'])
                    ).all()
                ]
                q_unassigned = query.filter(
                    models.Report.status.in_(['pending', 'unverified', 'pending_approval', 'verified', 'for_verification'])
                )
                if assigned_report_ids:
                    q_unassigned = q_unassigned.filter(~models.Report.id.in_(assigned_report_ids))
                reports = q_unassigned.order_by(models.Report.created_at.desc()).limit(6).all()
                title_label = "Unassigned citizen reports requiring dispatch:"
            elif "verification" in s_lower or "needs_verification" in s_lower or "unverified" in s_lower or "awaiting" in s_lower:
                reports = query.filter(
                    models.Report.status.in_(['pending', 'unverified', 'pending_approval', 'for_verification'])
                ).order_by(models.Report.created_at.desc()).limit(6).all()
                title_label = "Reports awaiting administrative verification:"
            elif "priority" in s_lower or "critical" in s_lower or "today" in s_lower or "high" in s_lower:
                reports = query.filter(
                    or_(
                        models.Report.ai_urgency.ilike('%critical%'),
                        models.Report.ai_urgency.ilike('%high%'),
                        models.Report.severity_score >= 7.0
                    ),
                    models.Report.status.notin_(['resolved', 'rejected'])
                ).order_by(models.Report.severity_score.desc(), models.Report.created_at.desc()).limit(6).all()
                if not reports:
                    reports = query.filter(
                        models.Report.status.notin_(['resolved', 'rejected'])
                    ).order_by(models.Report.severity_score.desc(), models.Report.created_at.desc()).limit(6).all()
                title_label = "Current high and critical priority reports:"
            else:
                reports = query.order_by(models.Report.created_at.desc()).limit(6).all()
                title_label = "Recent incoming citizen reports:"

            if not reports:
                msg = f"No reports matching **{status_or_scope or 'current filter'}** were found in the active queue."
                invoked_tools.append({"tool": "get_staff_reports_overview", "data": msg})
                return msg

            lines = [title_label, ""]
            for r in reports:
                ticket_str = r.ticket_id or f"PUL-2026-{r.id:04d}"
                loc = r.location_barangay or r.location_string or "North Caloocan"
                cat = r.ai_category or r.category or "Infrastructure"
                urg = r.ai_urgency or "Normal"
                desc_snippet = (r.ai_summary or r.description or "").strip()
                if len(desc_snippet) > 90:
                    desc_snippet = desc_snippet[:87] + "..."
                lines.append(
                    f"- **#{ticket_str}** — **{cat}** ({loc}) | Status: **{r.status}** | Urgency: **{urg}**"
                    + (f"\n  Summary: {desc_snippet}" if desc_snippet else "")
                )
            lines.append("\nYou can open any ticket in the **Command Center** or **Reports** workspace to verify, dispatch a crew, or update status.")
            full_res = "\n".join(lines)
            invoked_tools.append({"tool": "get_staff_reports_overview", "data": full_res[:500]})
            return full_res
        except Exception as err:
            err_msg = f"I couldn't load that right now. You can open Reports to check. ({err})"
            invoked_tools.append({"tool": "get_staff_reports_overview", "data": err_msg})
            return err_msg

    def get_staff_work_orders_overview(status_or_scope: Optional[str] = None) -> str:
        """Retrieve real government work orders from the PULSO engineering operations system."""
        if not db:
            return "I couldn't load that right now. You can open Work Orders to check."
        try:
            import gov_models
            query = db.query(gov_models.WorkOrder)
            s_lower = (status_or_scope or "").lower()
            if "overdue" in s_lower or "late" in s_lower or "sla" in s_lower:
                wos = query.filter(
                    gov_models.WorkOrder.status.in_(['open', 'assigned', 'in_progress', 'rework_required', 'blocked'])
                ).order_by(gov_models.WorkOrder.created_at.asc()).limit(6).all()
                title_label = "Active work orders requiring SLA and scheduling review:"
            else:
                wos = query.order_by(gov_models.WorkOrder.created_at.desc()).limit(6).all()
                title_label = "Current engineering work orders:"

            if not wos:
                msg = "There are no overdue or active work orders flagged in the current engineering queue."
                invoked_tools.append({"tool": "get_staff_work_orders_overview", "data": msg})
                return msg

            lines = [title_label, ""]
            for wo in wos:
                wo_id = getattr(wo, "wo_number", None) or f"WO-2026-{wo.id:03d}"
                prio = (wo.priority or "normal").upper()
                lines.append(
                    f"- **#{wo_id}** — **{wo.title or 'Field Maintenance'}** | Status: **{wo.status}** | Priority: **{prio}**"
                )
            lines.append("\nPlease review crew dispatch and verify completion milestones in the **Field Operations** workspace.")
            full_res = "\n".join(lines)
            invoked_tools.append({"tool": "get_staff_work_orders_overview", "data": full_res[:500]})
            return full_res
        except Exception as err:
            err_msg = f"I couldn't load that right now. You can open Work Orders to check. ({err})"
            invoked_tools.append({"tool": "get_staff_work_orders_overview", "data": err_msg})
            return err_msg

    def predict_maintenance_and_resolution_plan(target_ticket_or_category: Optional[str] = None) -> str:
        """Predict repair duration, recommended engineering actions, and post-resolution preventive maintenance schedule for a citizen report, ticket ID, or infrastructure category (e.g., Roads & Bridges, Water & Drainage, Street Lighting)."""
        try:
            import models
            import gov_models
            from sqlalchemy import or_

            combined_text = f"{target_ticket_or_category or ''} {query or ''} {context or ''}"
            ticket_matches = re.findall(r"(PUL-\d{4}-\d+)", combined_text, flags=re.IGNORECASE)

            matched_report = None
            if db and ticket_matches:
                # Use the most recently mentioned ticket ID in the query/conversation
                target_tid = ticket_matches[-1].upper()
                matched_report = (
                    db.query(models.Report)
                    .filter(models.Report.ticket_id.ilike(target_tid))
                    .first()
                )

            if db and not matched_report:
                # Try matching the top active high/critical report if user asks a follow-up
                matched_report = (
                    db.query(models.Report)
                    .filter(
                        or_(
                            models.Report.ai_urgency.ilike('%critical%'),
                            models.Report.ai_urgency.ilike('%high%'),
                            models.Report.severity_score >= 7.0
                        ),
                        models.Report.status.notin_(['resolved', 'rejected'])
                    )
                    .order_by(models.Report.severity_score.desc(), models.Report.created_at.desc())
                    .first()
                )

            # Determine category, urgency, and issue specifics
            cat_text = (
                (matched_report.ai_category or matched_report.category or "")
                if matched_report else ""
            ) + " " + combined_text
            cat_lower = cat_text.lower()
            desc_lower = (
                f"{matched_report.ai_summary or ''} {matched_report.description or ''}".lower()
                if matched_report else combined_text.lower()
            )

            # Check historical work orders for grounding
            completed_count = 0
            avg_days_note = ""
            if db:
                try:
                    completed_wos = (
                        db.query(gov_models.WorkOrder)
                        .filter(
                            gov_models.WorkOrder.completed_date.isnot(None),
                            gov_models.WorkOrder.created_at.isnot(None)
                        )
                        .limit(20)
                        .all()
                    )
                    durations = []
                    for w in completed_wos:
                        delta = (w.completed_date - w.created_at).total_seconds() / 86400.0
                        if 0.1 <= delta <= 90:
                            durations.append(delta)
                    if durations:
                        completed_count = len(durations)
                        avg_d = sum(durations) / len(durations)
                        avg_days_note = f" (Historical LGU benchmark across {completed_count} completed work orders: **{avg_d:.1f} days** average turnaround)"
                except Exception:
                    pass

            is_collapse_or_severe = any(
                k in desc_lower for k in ["collapse", "collapsed", "sinkhole", "erosion", "submerged", "washed out", "structural", "major"]
            )
            is_road_bridge = any(k in cat_lower for k in ["road", "bridge", "pothole", "asphalt", "pavement"])
            is_drainage = any(k in cat_lower for k in ["drainage", "water", "flood", "canal", "culvert", "sewer"])
            is_lighting = any(k in cat_lower for k in ["light", "street lighting", "lamp", "electrical", "post"])

            if is_road_bridge and (is_collapse_or_severe or is_drainage):
                scope_label = "Roads & Bridges / Water & Drainage Structural Rehabilitation"
                stabilization_time = "4 to 12 hours"
                repair_duration = "7 to 14 working days"
                minor_comparison = "1 to 3 working days for standard pothole/asphalt patching; 3 to 5 days for localized drainage declogging"
                curing_qa_time = "2 to 3 days (concrete curing, compaction & load inspection)"
                service_lifespan = "8 to 12 years (reinforced concrete / slope & riprap protection) or 4 to 6 years (heavy-duty asphalt overlay)"
                preventive_cycle = (
                    "- **30-Day Post-Resolution Inspection**: Verify sub-base settlement, road shoulder stability, and water runoff flow.\n"
                    "- **Every 6 Months (Pre- & Post-Rainy Season)**: Mandatory drainage de-silting, culvert clearing, and embankment erosion check.\n"
                    "- **Every 12 Months (Annual Asset Audit)**: Structural condition scoring and pavement surface inspection in the PULSO Asset Registry."
                )
                action_steps = (
                    "1. **Immediate Site Stabilization (First 4-12 Hours)**: Deploy safety barricades, traffic warning signage, and cordon off the collapsed road edge adjacent to the waterway to prevent vehicle hazards.\n"
                    "2. **Engineering Triage & Work Order Dispatch (Day 1)**: Approve the report in the **Command Center** and dispatch a **Civil/Structural Engineer**, **Heavy Equipment Road Crew**, and **Drainage Team**.\n"
                    "3. **Slope, Drainage & Sub-Base Reconstruction (Days 2-10)**: Excavate unstable saturated soil, install riprap or reinforced retaining wall protection along the water edge, restore drainage culvert flow, and compact aggregate sub-base.\n"
                    "4. **Pavement Resurfacing & Curing (Days 11-14)**: Pour Portland Cement Concrete Pavement (PCCP) or hot-mix asphalt overlay, allow proper curing, and complete final quality assurance inspection before marking **resolved**."
                )
            elif is_road_bridge:
                scope_label = "Roads & Bridges Maintenance and Surface Rehabilitation"
                stabilization_time = "2 to 6 hours"
                repair_duration = "1 to 3 working days (minor/moderate pothole or surface crack) or 7 to 14 working days (major road section rehabilitation)"
                minor_comparison = "1 to 2 days for cold/hot-mix asphalt patching"
                curing_qa_time = "1 day (compaction and surface level verification)"
                service_lifespan = "3 to 5 years for asphalt patching/overlay; 10 to 15 years for concrete reblocking"
                preventive_cycle = (
                    "- **30-Day Post-Repair Check**: Inspect patch bonding and edge sealing under traffic load.\n"
                    "- **Every 6 Months**: Routine pavement distress survey and roadside drainage clearing to prevent water infiltration.\n"
                    "- **Every 12-18 Months**: Preventive crack sealing and surface wear audit."
                )
                action_steps = (
                    "1. **Site Verification & Traffic Control (2-6 Hours)**: Verify defect dimensions and place safety cones around the damaged road lane.\n"
                    "2. **Crew Dispatch (Day 1)**: Assign the **Road Maintenance Crew** via a PULSO Work Order.\n"
                    "3. **Surface Preparation & Repair (Days 1-3)**: Saw-cut damaged edges, clear standing water/debris, compact base course, and apply hot-mix asphalt or concrete patch.\n"
                    "4. **Final Compaction & Closure**: Verify level surface, upload completion photo evidence, and mark the ticket **resolved**."
                )
            elif is_drainage:
                scope_label = "Water & Drainage Infrastructure Maintenance"
                stabilization_time = "2 to 6 hours"
                repair_duration = "2 to 5 working days (declogging & desilting) or 7 to 10 working days (culvert/line replacement)"
                minor_comparison = "1 to 2 days for localized inlet clearing"
                curing_qa_time = "1 day (hydraulic flow verification)"
                service_lifespan = "5 to 10 years for structural culvert repairs"
                preventive_cycle = (
                    "- **30-Day Flow Check**: Confirm zero silt accumulation after rainfall.\n"
                    "- **Every 3 to 6 Months**: Scheduled pre-monsoon declogging and solid waste trap maintenance.\n"
                    "- **Annual Drainage Audit**: Full line capacity inspection before typhoon season."
                )
                action_steps = (
                    "1. **Hazard Isolation (2-6 Hours)**: Secure open manholes or flooded road sections.\n"
                    "2. **Dispatch Drainage Crew (Day 1)**: Assign vacuum/declogging equipment and masonry crew.\n"
                    "3. **Desilting & Structural Repair (Days 2-5)**: Remove silt/debris blockage, repair damaged concrete drainage covers or culvert walls, and test water flow."
                )
            elif is_lighting:
                scope_label = "Street Lighting & Electrical Maintenance"
                stabilization_time = "1 to 4 hours"
                repair_duration = "4 to 24 hours (1 working day) for luminaire/wiring repair, or 2 to 4 days if pole replacement is required"
                minor_comparison = "Under 24 hours for LED fixture or photo-sensor replacement"
                curing_qa_time = "2 hours (electrical load & night illumination test)"
                service_lifespan = "5 to 7 years (LED luminaire rated life: 50,000 operational hours)"
                preventive_cycle = (
                    "- **30-Day Illumination Check**: Verify timer/photocell operation and circuit stability.\n"
                    "- **Every 6 Months**: Inspect pole grounding, bracket corrosion, and overhead cable clearance.\n"
                    "- **Every 24 Months**: Preventive driver and surge protection check."
                )
                action_steps = (
                    "1. **Electrical Safety Check (1-4 Hours)**: Isolate faulty circuit or broken fixture lens.\n"
                    "2. **Dispatch Electrical Team (Day 1)**: Assign bucket truck and licensed LGU electrician.\n"
                    "3. **Fixture Replacement & Testing (Day 1)**: Replace damaged LED luminaire/ballast, seal weatherproof housing, and verify illumination."
                )
            else:
                scope_label = "Public Infrastructure Maintenance & Rehabilitation"
                stabilization_time = "4 to 8 hours"
                repair_duration = "3 to 7 working days (depending on structural scope and material curing)"
                minor_comparison = "1 to 3 days for minor surface/facility repairs"
                curing_qa_time = "1 day (engineering quality inspection)"
                service_lifespan = "5 to 10 years with routine preventive upkeep"
                preventive_cycle = (
                    "- **30-Day Post-Resolution Check**: Verify repair integrity under normal public use.\n"
                    "- **Every 6 Months**: Routine preventive maintenance and safety inspection.\n"
                    "- **Every 12 Months**: Annual Digital Twin asset condition assessment."
                )
                action_steps = (
                    "1. **Triage & Site Inspection (4-8 Hours)**: Verify field evidence and secure the affected area.\n"
                    "2. **Work Order Dispatch (Day 1)**: Assign the appropriate District Engineering Crew.\n"
                    "3. **Repair Execution & QA (Days 2-7)**: Complete structural/surface restoration, upload post-repair photo evidence, and close the work order."
                )

            lines = [f"Predictive Engineering & Maintenance Forecast — **{scope_label}**:", ""]
            if matched_report:
                tid = matched_report.ticket_id or f"PUL-2026-{matched_report.id:04d}"
                loc = matched_report.location_barangay or matched_report.location_string or "North Caloocan"
                urg = matched_report.ai_urgency or "High"
                summary_str = (matched_report.ai_summary or matched_report.description or "").strip()
                lines.append(
                    f"**Reference Ticket**: **#{tid}** | **Category**: **{matched_report.ai_category or matched_report.category}** | **Urgency**: **{urg}** | **Location**: {loc}"
                )
                if summary_str:
                    lines.append(f"**Observed Condition**: {summary_str}")
                lines.append("")

            lines.extend([
                "**1. Recommended Engineering Action Plan (What You Can Do Now)**",
                action_steps,
                "",
                f"**2. Predicted Repair & Resolution Duration (How Long It Takes to Resolve)**{avg_days_note}",
                f"- **Emergency Site Stabilization & Triage**: **{stabilization_time}**",
                f"- **Estimated Active Repair Duration**: **{repair_duration}** ({minor_comparison})",
                f"- **Quality Assurance & Curing Gate**: **{curing_qa_time}**",
                "",
                "**3. Post-Resolution Predictive Maintenance Schedule (After the Problem Is Resolved)**",
                f"- **Predicted Service Lifespan of Repair**: **{service_lifespan}**",
                preventive_cycle,
            ])

            if db:
                try:
                    from services import lightgbm_service
                    lgbm_telemetry = lightgbm_service.predict_for_location_or_ticket(
                        db,
                        report=matched_report,
                        category=cat_text,
                    )
                    if lgbm_telemetry:
                        st = lgbm_telemetry.get("spatial_telemetry") or {}
                        p30 = lgbm_telemetry.get("lgbm_failure_probability_30d", 0.0) * 100.0
                        p60 = lgbm_telemetry.get("lgbm_failure_probability_60d", 0.0) * 100.0
                        p90 = lgbm_telemetry.get("lgbm_failure_probability_90d", 0.0) * 100.0
                        p50_days = lgbm_telemetry.get("predicted_repair_days_p50", 2.0)
                        p90_days = lgbm_telemetry.get("predicted_repair_days_p90", 5.0)
                        drivers = lgbm_telemetry.get("risk_drivers") or []
                        hotspot_flag = (
                            f"**Active DBSCAN Hotspot** (**{st.get('hotspot_cluster_size', 0)} incidents** clustered within 50m)"
                            if st.get("in_dbscan_hotspot")
                            else "No active 50m cluster threshold exceeded"
                        )
                        lines.extend([
                            "",
                            "**4. PostGIS Spatial Ring & LightGBM Telemetry (Live Grounded Data)**",
                            f"- **PostGIS 50m / 150m Proximity Ring**: **{st.get('reports_50m_90d', 0)} reports** within 50m (90d) | **{st.get('reports_150m_90d', 0)} reports** within 150m | **{st.get('nearby_drainage_150m_90d', 0)} drainage/flood stress incidents** within 150m",
                            f"- **Spatial Cluster Status**: {hotspot_flag}",
                            f"- **LightGBM Quantile Turnaround Forecast**: **P50 Median: {p50_days:.1f} working days** | **P90 Upper-Bound (with weather/curing buffer): {p90_days:.1f} working days**",
                            f"- **LightGBM Recurrence Risk Horizon**: **30-Day: {p30:.1f}%** | **60-Day: {p60:.1f}%** | **90-Day: {p90:.1f}%**",
                        ])
                        if drivers:
                            driver_str = "; ".join(
                                [f"**{d['label']}** (value: {d['value']}, SHAP impact: {d['shap_impact']:+.2f})" for d in drivers[:3]]
                            )
                            lines.append(f"- **Top TreeSHAP Risk Drivers**: {driver_str}")
                except Exception:
                    pass

            full_res = "\n".join(lines)
            invoked_tools.append({"tool": "predict_maintenance_and_resolution_plan", "data": full_res[:500]})
            return full_res
        except Exception as err:
            err_msg = f"Unable to compute predictive maintenance estimate right now: {err}"
            invoked_tools.append({"tool": "predict_maintenance_and_resolution_plan", "data": err_msg})
            return err_msg

    def get_predictive_hotspots_and_asset_risks(barangay_or_category: Optional[str] = None) -> str:
        """Fetch live PostGIS spatial hotspots and LightGBM predictive maintenance scores, P50/P90 repair turnaround estimates, and TreeSHAP risk drivers for registered infrastructure assets."""
        if not db:
            return "Database connection unavailable for PostGIS + LightGBM asset risk analysis."
        try:
            import gov_models
            from services import lightgbm_service

            q = db.query(gov_models.InfrastructureAsset)
            scope_str = (barangay_or_category or "").strip()
            if scope_str:
                brgy_match = re.findall(r"\b(1[678]\d)\b", scope_str)
                if brgy_match:
                    q = q.filter(gov_models.InfrastructureAsset.barangay == brgy_match[0])
                elif any(c in scope_str.lower() for c in ["road", "bridge", "drain", "light", "flood", "school", "facil"]):
                    for kw in ["road", "bridge", "drain", "light", "facil"]:
                        if kw in scope_str.lower():
                            q = q.filter(gov_models.InfrastructureAsset.category.ilike(f"%{kw}%"))
                            break

            assets = q.limit(25).all()
            diag = lightgbm_service.get_global_model_diagnostics(db)
            if not assets:
                res = (
                    f"**PostGIS + LightGBM Predictive Maintenance Engine** (`{diag.get('engine')}`):\n\n"
                    "- No registered infrastructure assets matched the requested filter. Try querying all North Caloocan assets or a specific barangay (165-188)."
                )
                invoked_tools.append({"tool": "get_predictive_hotspots_and_asset_risks", "data": res})
                return res

            scored = []
            for a in assets:
                pred = lightgbm_service.predict_for_asset(db, a)
                scored.append((a, pred))

            scored.sort(key=lambda item: item[1]["lgbm_failure_probability_30d"], reverse=True)
            top_items = scored[:5]

            lines = [
                f"**PostGIS + LightGBM Predictive Maintenance & Spatial Risk Summary** (`{diag.get('training_mode', 'lightgbm_hybrid_cold_start')}`):",
                "",
            ]
            for idx, (asset, pred) in enumerate(top_items, 1):
                st = pred.get("spatial_telemetry") or {}
                drivers = pred.get("risk_drivers") or []
                top_driver = drivers[0]["label"] if drivers else "Baseline Age & Wear"
                p30 = pred["lgbm_failure_probability_30d"] * 100.0
                p90 = pred["lgbm_failure_probability_90d"] * 100.0
                p50_d = pred["predicted_repair_days_p50"]
                p90_d = pred["predicted_repair_days_p90"]
                lines.append(
                    f"{idx}. **{asset.asset_name}** (**{asset.asset_id}** | Brgy **{asset.barangay}** | {asset.category})\n"
                    f"   - **LightGBM Recurrence Risk**: **30d: {p30:.1f}%** | **90d: {p90:.1f}%** | **Primary SHAP Driver**: **{top_driver}**\n"
                    f"   - **PostGIS Spatial Ring (90d)**: **{st.get('reports_50m_90d', 0)} reports** within 50m | **{st.get('reports_150m_90d', 0)} reports** within 150m\n"
                    f"   - **Predicted Repair Turnaround**: **P50: {p50_d:.1f} days** (P90 upper-bound: **{p90_d:.1f} days**)"
                )

            full_res = "\n\n".join(lines)
            invoked_tools.append({"tool": "get_predictive_hotspots_and_asset_risks", "data": full_res[:500]})
            return full_res
        except Exception as err:
            err_msg = f"Unable to query PostGIS + LightGBM asset risks right now: {err}"
            invoked_tools.append({"tool": "get_predictive_hotspots_and_asset_risks", "data": err_msg})
            return err_msg

    # ── Grounded Knowledge: Filing a report in PULSO ───────────────────────────
    REPORTING_GUIDE = (
        "To file an infrastructure report in PULSO, follow these steps:\n\n"
        "1. **Access Report Flow**: Tap the orange **Report Issue** action button on the resident dashboard.\n"
        "2. **Upload Photo Evidence**: Capture or upload a clear photo of the hazard. PULSO's AI vision system verifies the image, detects the issue type (e.g., pothole, broken streetlight, clogged drainage), and assesses initial urgency.\n"
        "3. **Pin Location**: Confirm or adjust the pin on the North Caloocan interactive map (Barangays 165 to 188).\n"
        "4. **Review & Confirm**: Review the auto-detected category and enter any additional notes, then tap **Submit**.\n"
        "5. **Track Progress**: You will receive a unique **Ticket ID** (e.g., **CE-2026-XXXX**) and private tracking token. You can track real-time inspection, dispatch, and completion under **My Reports**."
    )

    # ── Deterministic Keyword Fallback Handler ─────────────────────────────────
    def _deterministic_fallback(q: str) -> str:
        ql = q.lower()
        if any(w in ql for w in [
            "hotspot", "hotspots", "at risk", "highest risk", "asset risk",
            "lightgbm", "postgis", "shap", "risk driver", "risk drivers"
        ]):
            return get_predictive_hotspots_and_asset_risks(q)
        if any(w in ql for w in [
            "predict", "predictive", "duration", "how long", "long it takes",
            "maintenance", "what can i do", "how to fix", "how to resolve",
            "when i resolved", "when resolved", "repair time", "timeline", "estimate"
        ]):
            return predict_maintenance_and_resolution_plan(q)
        if any(w in ql for w in ["unassigned", "unassigned report", "unassigned reports"]):
            return get_staff_reports_overview("unassigned")
        if any(w in ql for w in ["overdue", "work order", "work orders", "sla"]):
            return get_staff_work_orders_overview("overdue")
        if any(w in ql for w in ["needs verification", "unverified", "awaiting verification", "verification"]):
            return get_staff_reports_overview("needs_verification")
        if any(w in ql for w in ["priority", "priorities", "today's priorities", "critical", "urgent"]):
            return get_staff_reports_overview("today_priorities")
        if any(w in ql for w in ["hotline", "emergency", "police", "pnp", "fire", "bfp", "drrmo", "contact number"]):
            return get_city_hotlines()
        if any(w in ql for w in ["my report", "report status", "ticket status", "track report", "check report", "my ticket"]):
            return get_my_reports()
        if any(w in ql for w in ["evacuation", "evacuate", "flood route", "evacuation center"]):
            return get_evacuation_routes()
        if any(w in ql for w in ["advisory", "advisories", "bulletin", "announcement"]):
            return get_active_advisories()
        if any(w in ql for w in ["how to file", "how to report", "file a report", "submit a report"]):
            return REPORTING_GUIDE
        if "staff" in (context or "").lower() or "government" in (context or "").lower():
            return get_staff_reports_overview("recent")
        return (
            "I couldn't load that right now. You can open Reports to check. "
            "For urgent emergencies or infrastructure hazards, please contact the **Caloocan City Action Center** at **(02) 8288-8811** "
            "or **Caloocan DRRMO** at **(02) 8397-6212**."
        )

    if not _SDK_READY:
        fallback_res = _deterministic_fallback(query)
        return {
            "response": _clean_response(fallback_res),
            "tool_name": invoked_tools[0]["tool"] if invoked_tools else None,
            "tool_data": invoked_tools[0]["data"] if invoked_tools else None
        }

    prompt = f"""You are PULSO AI, the official intelligent assistant for the Caloocan City Engineering Office (PULSO System).
You assist citizens and LGU staff with infrastructure management, hazard reporting, predictive maintenance planning, and city operations.

STRICT OPERATIONAL & TONE RULES:
1. NO EMOJIS: Do not use emojis in any response. Maintain a professional, helpful tone appropriate for an official city government service.
2. MARKDOWN STRUCTURE: Always structure responses with clean paragraph breaks (double newlines). Use markdown bold (**text**) for all key terms: hotline numbers, ticket IDs, work order IDs, durations/timelines, report statuses (**pending**, **in_progress**, **resolved**), department names, and important notices. Use bullet points (- ) or numbered lists (1. ) for readability.
3. GROUNDING IN REAL DATA (MANDATORY TOOL USE):
   - When asked what to do for a report, how long repair or maintenance takes, or to predict maintenance duration/schedule (before or after resolution): You MUST call `predict_maintenance_and_resolution_plan` and present the complete engineering action plan, predicted repair duration (hours/days), PostGIS spatial ring telemetry, LightGBM P50/P90 turnaround forecast, TreeSHAP risk drivers, and post-resolution preventive maintenance cycle. NEVER say you cannot predict maintenance durations or timelines.
   - When asked about highest-risk infrastructure assets, spatial hotspots, LightGBM recurrence probabilities, or PostGIS risk rankings: You MUST call `get_predictive_hotspots_and_asset_risks` and report the exact asset IDs, 30d/90d LightGBM failure probabilities, primary TreeSHAP risk drivers, PostGIS 50m/150m report counts, and P50/P90 repair turnaround days.
   - When asked about unassigned reports, reports awaiting verification, or critical/priority reports by staff: You MUST call `get_staff_reports_overview` with `status_or_scope` set to `"unassigned"`, `"needs_verification"`, or `"today_priorities"`. Present the exact ticket IDs, categories, locations, and statuses returned by the tool.
   - When asked about work orders, overdue work orders, or SLA alerts: You MUST call `get_staff_work_orders_overview` with `status_or_scope="overdue"`. Present the exact work order numbers, titles, statuses, and priorities returned by the tool.
   - When asked about a resident's own reports or report status: You MUST call `get_my_reports` to fetch their real database records.
   - When asked about city hotlines or emergency contacts: You MUST call `get_city_hotlines`.
   - When asked about active advisories, roadworks, or city notices: You MUST call `get_active_advisories`.
   - When asked about evacuation routes: You MUST call `get_evacuation_routes`.
   - When asked how to file a report: Describe the 5-step PULSO workflow.
4. FOLLOW-UP CONTEXT: Use the `Recent Conversation History` in `System Context` to resolve pronouns like "this", "that", or "it" to the specific Ticket ID (e.g., **#PUL-2026-8714**) or infrastructure category discussed in prior messages.

System Context: {context or "General citizen inquiry"}
User Query: {query}
"""

    tools = [
        get_my_reports,
        get_city_hotlines,
        get_active_advisories,
        get_evacuation_routes,
        get_staff_reports_overview,
        get_staff_work_orders_overview,
        predict_maintenance_and_resolution_plan,
        get_predictive_hotspots_and_asset_risks,
    ]
    user_id = str(getattr(user, "id", "citizen"))

    try:
        raw = _generate_with_tools(prompt, tools=tools, user_id=user_id)
        if raw:
            raw_lower = raw.lower()
            refusal_phrases = [
                "cannot predict", "can't predict", "do not have the functionality",
                "unable to predict", "cannot forecast", "not able to predict"
            ]
            if not any(p in raw_lower for p in refusal_phrases):
                return {
                    "response": _clean_response(raw),
                    "tool_name": invoked_tools[0]["tool"] if invoked_tools else None,
                    "tool_data": invoked_tools[0]["data"] if invoked_tools else None
                }
    except Exception as e:
        print(f"[AI] Assistant tool-calling error: {e}")

    # Fallback if API fails, is rate limited, or declines predictive estimation
    fallback_res = _deterministic_fallback(query)
    return {
        "response": _clean_response(fallback_res),
        "tool_name": invoked_tools[0]["tool"] if invoked_tools else None,
        "tool_data": invoked_tools[0]["data"] if invoked_tools else None
    }


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
        return {}

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
- LightGBM 30-Day Failure Probability: {asset_data.get('lgbm_failure_probability_30d', 'N/A')}
- LightGBM P50/P90 Repair Turnaround (Days): {asset_data.get('predicted_repair_days_p50', 'N/A')} / {asset_data.get('predicted_repair_days_p90', 'N/A')}
- PostGIS Spatial Telemetry: {asset_data.get('spatial_telemetry', {})}
- Top TreeSHAP Risk Drivers: {asset_data.get('risk_drivers', [])}

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

    return {}
