import os
import json
import base64
import requests
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Dict, Any, Optional

load_dotenv()

GEMINI_API_KEY = os.getenv('GOOGLE_GEMINI_API_KEY')
GOOGLE_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
GEMINI_MODEL = "gemini-1.5-flash"

# Configure the SDK
# Priority 1: Official Service Account (ADC) automatically handled by SDK via env
# Priority 2: Explicit API Key
if GEMINI_API_KEY and not GOOGLE_CREDENTIALS:
    genai.configure(api_key=GEMINI_API_KEY)
elif GOOGLE_CREDENTIALS:
    # Explicitly check if path exists to avoid silent failures
    if os.path.exists(GOOGLE_CREDENTIALS):
        print(f"[AI] Initializing Vertex AI via Service Account: {GOOGLE_CREDENTIALS}")
    else:
        print(f"[AI] WARNING: Credentials path {GOOGLE_CREDENTIALS} not found. Falling back to API Key.")
        if GEMINI_API_KEY: genai.configure(api_key=GEMINI_API_KEY)

def analyze_report(description: str, image_data: Optional[bytes] = None):
    """
    Uses Gemini AI (Vertex/Flash) to analyze a resident report.
    Supports multi-modal analysis if an image is provided.
    
    Returns a dictionary with: category, urgency, smart_summary, severity_score, reasoning, and image_analysis.
    """
    if not GEMINI_API_KEY:
        print("Gemini API Key not configured. Skipping AI analysis.")
        return None
        
    model = genai.GenerativeModel(GEMINI_MODEL)
    
    # Advanced prompt for report triage
    prompt = f"""
    You are the "Vision Eye" triage agent for PULSO, an infrastructure management system for Caloocan City.
    Analyze the following resident report and provide a structured technical assessment.
    
    Report Description: "{description}"
    
    If an image is provided, examine it for hazards, structural damage, or public safety risks related to the description.
    
    Return a valid JSON object with the following fields:
    - category: string (One of: Road Issue, Water/Drainage, Waste Management, Lighting, Public Safety, Engineering Hazard, Inappropriate Content)
    - urgency: string (Low, Medium, High, Critical)
    - severity_score: float (1.0 to 10.0 based on safety risk and engineering impact)
    - smart_summary: string (One-sentence technical summary for a dispatcher)
    - reasoning: string (Brief technical justification for the assigned severity score)
    - image_analysis: string (If image provided, describe what was detected. If no image, "No image provided")
    - is_inappropriate: boolean (True if the content violates safety guidelines: violence, nudity, hate speech, spam, or totally irrelevant/trash content)
    - rejection_reason: string (If is_inappropriate is True, provide a brief reason)
    
    Guidelines:
    - Electrical hazards (downed wires), structural collapses, or large fires are "Critical" (10.0).
    - Missing manhole covers, deep potholes on main roads, or major flooding are "High" (8.0).
    - Minor potholes, uncollected garbage, or flickering streetlights are "Low" to "Medium" (2.0 - 5.0).
    - If the report is a joke, spam, or contains offensive imagery/text, set is_inappropriate to True and set category to "Inappropriate Content".
    """
    
    try:
        content = [prompt]
        if image_data:
            content.append({
                "mime_type": "image/jpeg",
                "data": image_data
            })
            
        response = model.generate_content(
            content,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        return json.loads(response.text.strip())
        
    except Exception as e:
        print(f"Error calling Gemini AI: {e}")
        # Fallback to text-only REST call if SDK fails or image processing errors
        return _fallback_analyze_report(description)

def extract_id_data(ocr_text: str, id_type: str = "unknown"):
    """
    Uses Gemini AI to clean up and structure noisy OCR text from government IDs.
    This resolves the "bleed" issues where labels and values are merged.
    """
    if not GEMINI_API_KEY:
        return None
        
    model = genai.GenerativeModel(GEMINI_MODEL)
    
    prompt = f"""
    You are an expert at parsing noisy OCR text from Philippine Government IDs ({id_type}).
    Extract the following fields into a structured JSON object. 
    If a field is not found, use an empty string.
    
    OCR Text:
    \"\"\"
    {ocr_text}
    \"\"\"
    
    Fields to extract:
    - first_name: (Exclude middle name/initial)
    - last_name: 
    - middle_name: (If found)
    - dob: (Format: YYYY-MM-DD)
    - sex: (Male or Female)
    - address: (The primary residence address)
    - barangay: (Extract only the number if possible, e.g. "171")
    - pcn: (If PhilID, the 16-digit number)
    - license_no: (If LTO, the license number)
    - postal_code: (If found, e.g. 1421)
    
    Rules:
    1. Clean up OCR errors (e.g., '0' instead of 'O', '1' instead of 'I' where appropriate).
    2. Ensure names are in Title Case.
    3. If the address contains Caloocan, ensure the barangay number is correctly associated.
    4. Ignore government headers like "REPUBLIC OF THE PHILIPPINES".
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        return json.loads(response.text.strip())
    except Exception as e:
        print(f"Error in AI ID extraction: {e}")
        return None

def generate_advisory_content(report_details: Dict[str, Any]):
    """
    Generates a professional public advisory draft based on a technical report.
    Used by Dispatchers to quickly draft announcements.
    """
    if not GEMINI_API_KEY:
        return None
        
    model = genai.GenerativeModel(GEMINI_MODEL)
    
    prompt = f"""
    You are the Senior Communications Officer for the Caloocan City Engineering Office.
    Draft a professional public advisory based on the following incident report.
    
    Report Data:
    - Type: {report_details.get('category')}
    - Summary: {report_details.get('ai_summary')}
    - Location: {report_details.get('location_string')}
    - Severity: {report_details.get('severity_score')}
    
    Requirements:
    1. Provide a professional 'title'.
    2. Provide a 'body' text that is clear, institutional, and helpful. 
    3. The body should include a short Tagalog translation or summary (bilingual).
    4. Provide 'priority' level (High, Medium, Info).
    
    Return a valid JSON object with fields: title, body, priority.
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        return json.loads(response.text.strip())
    except Exception as e:
        print(f"Error generating advisory: {e}")
        return {
            "title": f"Advisory: {report_details.get('category')}",
            "body": f"Please be advised of an issue at {report_details.get('location_string')}. Repairs are being scheduled.",
            "priority": "Info"
        }

def get_ai_assistant_response(query: str, context: Optional[str] = None):
    """
    Central AI Chat Assistant for PULSO.
    Provides guidance to both LGU staff and Citizens on engineering, 
    reporting, and system usage.
    """
    if not GEMINI_API_KEY:
        return {"response": "AI services are currently offline. Please try again later."}
        
    model = genai.GenerativeModel(GEMINI_MODEL)
    
    system_instruction = """
    You are PULSO AI, the official intelligent assistant for the City of Caloocan Infrastructure Management System.
    Your goal is to assist LGU employees (Engineers, Dispatchers, Clerks) and Citizens.
    
    Knowledge Base:
    - You know about DPWH engineering standards and PhilSys ID verification.
    - You assist in categorizing infrastructure hazards (Roads, Drainage, Electrical).
    - You provide guidance on city hall procedures and RA 9184 procurement.
    - If a user asks about a report, assume you can see 'context' provided by the system.
    
    Voice:
    - Professional, institutional, yet helpful and polite.
    - Use bilingual English/Tagalog for citizen queries if appropriate.
    - For engineers, use more precise technical terminology.
    """
    
    prompt = f"{system_instruction}\n\nContext: {context if context else 'General System Use'}\n\nUser Query: {query}"
    
    try:
        response = model.generate_content(prompt)
        return {"response": response.text.strip()}
    except Exception as e:
        print(f"Error in AI Assistant: {e}")
        return {"response": "The PULSO Brain is experiencing high traffic. Please try again shortly."}

def _fallback_analyze_report(description: str):
    """Old REST implementation as a fallback."""
    if not GEMINI_API_KEY: return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    prompt = f"Analyze this infrastructure report description and return JSON (category, urgency, severity_score, smart_summary, reasoning): \"{description}\""
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"response_mime_type": "application/json"}}
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            return json.loads(response.json()['candidates'][0]['content']['parts'][0]['text'].strip())
    except: pass
    return None
