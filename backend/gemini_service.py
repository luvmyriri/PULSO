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
GEMINI_MODEL       = "gemini-2.5-flash"   # Latest stable 2026 High-Speed Flash model

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
            response_mime_type="application/json" if json_mode else "text/plain",
            temperature=0.0
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
        cfg = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0,
        )
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[prompt, img_part],
            config=cfg,
        )
        return resp.text.strip()
    except Exception as e:
        print(f"[AI] multimodal error: {e}")
        return None


def _generate_multimodal_dual(prompt: str, img1: bytes, img2: bytes, mime: str = "image/jpeg") -> Optional[str]:
    """Call Gemini with a text + two ID images for visual cross-referencing."""
    if not _SDK_READY or _client is None:
        return None
    try:
        from google.genai import types
        part1 = types.Part.from_bytes(data=img1, mime_type=mime)
        part2 = types.Part.from_bytes(data=img2, mime_type=mime)
        cfg = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0,
        )
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[prompt, "FRONT ID IMAGE:", part1, "BACK ID IMAGE:", part2],
            config=cfg,
        )
        return resp.text.strip()
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


def extract_id_data(front_ocr: str, back_ocr: str = "", id_type: str = "unknown", front_image: Optional[bytes] = None, back_image: Optional[bytes] = None) -> Optional[Dict]:
    """
    AI Multi-Side ID Parser & Visual Auditor — Structures OCR and performs 
    Multimodal Vision analysis to ensure front and back portraits match.
    """
    if not _SDK_READY:
        return None

    ocr_context = f"FRONT SIDE OCR:\n{front_ocr}\n\nBACK SIDE OCR:\n{back_ocr}" if back_ocr else f"FRONT SIDE ONLY:\n{front_ocr}"

    prompt = f"""You are an elite ID Verification agent for the Caloocan City Engineering Office.
You are performing a MULTIMODAL AUDIT of a Philippine ID (type: {id_type}).

{ocr_context}

{"Two images (FRONT and BACK) are attached for Visual Verification." if back_image else "One image (FRONT) is attached."}

Extract into a JSON object with these exact fields:
{{
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
  "is_back_correct": true
}}

Intelligence Rules (ZERO TOLERANCE FOR ERROR):
1. VISUAL OCR OVERRIDE:
   If the provided "FRONT SIDE OCR" or "BACK SIDE OCR" text is messy, incomplete, or contains obvious spelling errors (e.g., "B4gumBong" instead of "Bagumbong"), you MUST ignore the OCR text and perform a fresh, high-precision visual scan of the raw pixels in the images.

2. DATA CONSISTENCY:
   - Full Name: Combine First, Middle, and Last names into a consistent identity.
   - Birthdate: Must be in YYYY-MM-DD. If formatted as "01-JAN-1990", convert to "1990-01-01".
   - Sex: "Male" or "Female" only.
   - "postal_code": 4-digit code.

3. Side Identification:
   - Identify the exact type: "UMID", "PHILID" (National ID/Philsys), "LTO" (Driver's License), "POSTAL", "COMELEC", "UMID", "GSIS", "PRC", or "PASSPORT".
   - FRONT side has the primary portrait Photo, Full Name, and personal details.
   - BACK side has QR code, magnetic stripe, barcode, or secondary metadata.
   - PHILID Back: Has Kasarian/Sex, Uri ng Dugo, Kalagayang Sibil, Lugar ng Kapanganakan labels and a QR code. DO NOT classify this as COMELEC.
   - If the "FRONT SIDE" image looks like a back side, set "is_front_correct": false.

4. VISUAL FACE MATCH — CRITICAL HIGH-SECURITY BIOMETRIC AUDIT:
   This is the most important step. You must perform a detailed person-identity comparison.

   STEP A — Face Detection:
   - On the FRONT image: Locate the main ID portrait photo (usually top-left or top-center).
   - On the BACK image: Look for any secondary photo, ghost image, watermark photo, or tinted/transparent face overlay (common on new Philippine National IDs, LTO licenses, and UMID cards).

   STEP B — Biometric Comparison (if BOTH sides have a face):
   Carefully compare the following facial features between the two photos:
   - Facial geometry: Overall face shape (oval, round, square, heart-shaped).
   - Eye characteristics: Eye spacing, eye shape, distance between eyes and eyebrows.
   - Nose shape: Nose bridge width and tip shape.
   - Jawline and cheekbones: Jaw angle and cheekbone prominence.
   - Skin tone and complexion.
   - Gender presentation: Male vs. Female appearance.
   - Approximate age range: Do both photos appear to be the same approximate age?

   STEP C — Decision:
   - If the biometric features are CONSISTENT (same person, accounting for photo angle, lighting, or monochrome/tinted rendering): Set "is_visual_face_match": true, "face_match_confidence": "high".
   - If there are MINOR inconsistencies (same person but different angle): Set "is_visual_face_match": true, "face_match_confidence": "medium".
   - If the faces CLEARLY belong to DIFFERENT individuals (different gender, different bone structure, significantly different age): Set "is_visual_face_match": false, "is_document_mismatch": true, "face_match_confidence": "low", "mismatch_reason": "FACE MISMATCH: The portrait on the front ID does not match the person on the back. These appear to be two different individuals."
   - If ONLY the front has a face and back has no face (older ID formats): Set "is_visual_face_match": true, "face_match_confidence": "na" (not applicable, cannot verify visually).

5. PHILIPPINE ADDRESS INTELLIGENCE (DEEP DIVE):
   - "house_no": Strictly numeric house, floor, or unit numbers (e.g. "123", "Unit 4B"). DO NOT put Phase (PH) or Package (PKG) numbers here.
   - "block_lot": Identify BLK/LOT precisely (e.g., "B100 L11", "LOT 5 BLK 2").
   - "subdivision": Include all named subdivisions, PH (Phase), PKG (Package), and NV (Northville) identifiers together here. 
     *Example: "PH1 PKG2 Northville 1" or "Northville 15" or "PH8A PKG14".*
   - "barangay": The specific Barangay. In Caloocan North, this is usually "Bagumbong", "Camarin", "Deparo", "Lumbac", etc. Ensure the Barangay name is accurately spelled.
   - "postal_code": 4-digit code.

6. Cross-Verification:
   - Compare images vs OCR. If the visual ID says "JUAN" but OCR said "JOIN", the visual ID (Juan) is 100% correct.
   - Set "is_document_mismatch": true if any critical field (Name, DOB, ID Type) differs drastically between eyes and OCR.
   - Extract Jr., Sr., III, IV, etc. into the "suffix" field.
   - Fix OCR Noise: Clean common errors (0 vs O, 1 vs I, 8 vs B). Be aggressive about fixing these based on context (e.g. 0 in a Name is probably O).
   - Names: Title Case.
   - INTELLIGENT DISPATCH: If the ID type is not one of the majors, use its visual and text clues to identify the most likely government issuer and return it in "front_id_type".
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
