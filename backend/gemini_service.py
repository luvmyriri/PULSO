"""
gemini_service.py — PULSO AI Intelligence Layer
Caloocan City Engineering Office — PULSO System

SDK:   google-genai (new official SDK, replaces deprecated google.generativeai)
Key:   Google AI Studio API Key — project: pulso-backend-system
Model: gemini-2.0-flash (latest stable, available on this project)
"""

import os
import json
import base64
from dotenv import load_dotenv
from typing import Dict, Any, Optional

load_dotenv()

GEMINI_API_KEY     = os.getenv("GOOGLE_GEMINI_API_KEY")
GOOGLE_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "google-credentials.json")
GEMINI_MODEL       = "gemini-2.5-flash"

# ── SDK Init ──────────────────────────────────────────────────────────────────

_client    = None
_SDK_READY = False

def _init():
    global _client, _SDK_READY
    if not GEMINI_API_KEY:
        print("[AI] ❌ GOOGLE_GEMINI_API_KEY not set — AI features disabled.")
        return
    try:
        from google import genai
        _client = genai.Client(api_key=GEMINI_API_KEY)
        _SDK_READY = True
        sa_ok = os.path.exists(GOOGLE_CREDENTIALS)
        print(f"[AI] ✅ google-genai SDK ready  |  Model: {GEMINI_MODEL}")
        print(f"[AI]    Project     : pulso-backend-system")
        print(f"[AI]    Service Acct: vertex-express@pulso-backend-system {'✅' if sa_ok else '⚠️ creds not found'}")
    except Exception as e:
        print(f"[AI] ❌ SDK init failed: {e}")

_init()


# ── Internal helpers ──────────────────────────────────────────────────────────

def _generate(prompt: str, json_mode: bool = True) -> Optional[str]:
    """Call Gemini with a text-only prompt."""
    if not _SDK_READY or _client is None:
        return None
    try:
        from google.genai import types
        cfg = types.GenerateContentConfig(
            response_mime_type="application/json" if json_mode else "text/plain"
        )
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=cfg,
        )
        return resp.text.strip()
    except Exception as e:
        print(f"[AI] generate error: {e}")
        return None


def _generate_multimodal(prompt: str, image_bytes: bytes, mime: str = "image/jpeg") -> Optional[str]:
    """Call Gemini with a text + image prompt (Vision)."""
    if not _SDK_READY or _client is None:
        return None
    try:
        from google.genai import types
        img_part = types.Part.from_bytes(data=image_bytes, mime_type=mime)
        cfg = types.GenerateContentConfig(response_mime_type="application/json")
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[prompt, img_part],
            config=cfg,
        )
        return resp.text.strip()
    except Exception as e:
        print(f"[AI] multimodal error: {e}")
        return None


# ── Public AI Functions ───────────────────────────────────────────────────────

def analyze_report(description: str, image_data: Optional[bytes] = None) -> Dict:
    """
    PULSO Vision Eye — Triage agent for resident infrastructure reports.
    Performs multi-modal Vision analysis when an image is attached.

    Returns: category, urgency, severity_score, smart_summary,
             reasoning, image_analysis, is_inappropriate, rejection_reason
    """
    prompt = f"""You are the "Vision Eye" triage agent for PULSO, the infrastructure management system of the Caloocan City Engineering Office, Metro Manila.

Analyze the following resident report and provide a structured technical assessment.

Report Description: "{description}"
{"An image has been attached. Examine it carefully for visible hazards, structural damage, or public safety risks related to the description." if image_data else "No image attached."}

Return ONLY a valid JSON object with EXACTLY these keys (no extra text before or after):
{{
  "category": "Road Issue",
  "urgency": "Medium",
  "severity_score": 5.0,
  "smart_summary": "One-sentence technical summary for a dispatcher",
  "reasoning": "Brief justification for the severity score",
  "image_analysis": "Description of detected hazards, or 'No image provided'",
  "is_inappropriate": false,
  "rejection_reason": ""
}}

Category options: Road Issue | Water/Drainage | Waste Management | Lighting | Public Safety | Engineering Hazard | Inappropriate Content
Urgency options: Low | Medium | High | Critical

Severity Guidelines:
- Downed electrical wires / structural collapse / active fire → Critical, score 9–10
- Missing manhole covers / deep potholes on main roads / major flooding → High, score 7–8
- Minor potholes / uncollected garbage / flickering streetlights → Low–Medium, score 2–5
- Spam, joke, hate speech, or offensive content → is_inappropriate: true
"""
    try:
        raw = (_generate_multimodal(prompt, image_data) if image_data
               else _generate(prompt, json_mode=True))
        if raw:
            return json.loads(raw)
    except Exception as e:
        print(f"[AI] analyze_report parse error: {e}")

    return _local_safety_check(description)


def extract_id_data(ocr_text: str, id_type: str = "unknown") -> Optional[Dict]:
    """
    AI ID Parser — Structures noisy OCR output from Philippine Government IDs
    (PhilSys, LTO, UMID) into clean JSON for registration pre-fill.
    """
    if not _SDK_READY:
        return None

    prompt = f"""You are an expert at parsing noisy OCR text from Philippine Government IDs (type: {id_type}).

OCR Text:
\"\"\"
{ocr_text}
\"\"\"

Extract into a JSON object with these exact fields (use "" for missing values):
{{
  "first_name": "",
  "last_name": "",
  "middle_name": "",
  "dob": "",
  "sex": "",
  "address": "",
  "barangay": "",
  "pcn": "",
  "license_no": "",
  "postal_code": ""
}}

Rules:
1. Fix OCR errors (0→O, 1→I where contextually appropriate).
2. Names must be Title Case.
3. dob format: YYYY-MM-DD.
4. sex: "Male" or "Female" only.
5. barangay: number only (e.g. "171").
6. For Caloocan addresses, extract barangay number correctly.
7. Ignore government letterheads and agency names.
"""
    try:
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

System Context: {context or "General system inquiry"}
User Query: {query}

Provide a helpful, accurate response:"""

    try:
        raw = _generate(prompt, json_mode=False)
        if raw:
            return {"response": raw}
    except Exception as e:
        print(f"[AI] Assistant error: {e}")

    return {"response": (
        "Pagpasensya na, ang PULSO Brain ay abala ngayon. Subukan muli sa ilang sandali.\n"
        "The PULSO Brain is currently processing. Please try again in a moment."
    )}


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
