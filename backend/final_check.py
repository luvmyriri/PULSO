import os
from dotenv import load_dotenv
load_dotenv()

key = os.getenv("GOOGLE_GEMINI_API_KEY")
from google import genai
try:
    client = genai.Client(api_key=key)
    # Testing the name I just set in gemini_service.py
    model_name = "gemini-1.5-flash" 
    print(f"Testing model: {model_name}")
    resp = client.models.generate_content(
        model=model_name,
        contents="Say 'OK'"
    )
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
