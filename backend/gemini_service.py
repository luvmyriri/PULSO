import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv('GOOGLE_GEMINI_API_KEY')
GEMINI_MODEL = "gemini-1.5-flash" # Faster and cheaper for simple tasks

def analyze_report(description: str):
    """
    Uses Gemini AI to analyze a resident report for urgency and categorization.
    Returns a dictionary with: category, urgency, smart_summary, severity_score, reasoning.
    """
    if not GEMINI_API_KEY:
        print("Gemini API Key not configured. Skipping AI analysis.")
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    
    # Advanced prompt as per PULSO Technical Specification
    prompt = f"""
    You are the "Vision Eye" triage agent for PULSO, an infrastructure management system for Caloocan City.
    Analyze the following resident report and provide a structured technical assessment.
    
    Report Description: "{description}"
    
    Return a valid JSON object with the following fields:
    - category: string (One of: Road Issue, Water/Drainage, Waste Management, Lighting, Public Safety, Engineering Hazard)
    - urgency: string (Low, Medium, High, Critical)
    - severity_score: float (1.0 to 10.0 based on safety risk and engineering impact)
    - smart_summary: string (One-sentence technical summary for a dispatcher)
    - reasoning: string (Brief technical justification for the assigned severity score)
    
    Guidelines:
    - Electrical hazards or structural collapses are "Critical" (10.0).
    - Potholes or minor leaks are "Low" to "Medium" (2.0 - 5.0).
    - Missing manhole covers are "High" (8.0).
    """
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    }
    
    try:
        response = requests.post(url, json=payload, timeout=12)
        if response.status_code != 200:
            print(f"Gemini API Error: {response.text}")
            return None
            
        result = response.json()
        if 'candidates' not in result or not result['candidates']:
            print(f"Gemini API returned no candidates: {result}")
            return None
            
        text_response = result['candidates'][0]['content']['parts'][0]['text']
        return json.loads(text_response.strip())
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return None
