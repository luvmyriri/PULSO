
import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Semaphore API Configuration
SEMAPHORE_API_KEY = os.getenv("SEMAPHORE_API_KEY", "MOCK_KEY_123")
SEMAPHORE_SENDER_NAME = os.getenv("SEMAPHORE_SENDER_NAME", "PULSOLGU")

def send_emergency_sms(phone_number: str, title: str, message: str):
    """
    Sends an automated GSM alert for Level 100 Emergency Reports.
    Complies with Caloocan Dispatch Level 100 Protocol.
    """
    print(f"TRIGGERING LEVEL 100 ALERT for {phone_number}...")
    
    # Payload as recommended by user
    # "URGENT: Level 100 Incident at Brgy [Number]. Check PULSO App immediately for GPS and Specs."
    sms_text = f"URGENT: {title}. Check PULSO App immediately for GPS and Specs."
    
    if SEMAPHORE_API_KEY == "MOCK_KEY_123":
        print(f"[MOCK SMS GATEWAY] Success: Sent to {phone_number} | Content: {sms_text}")
        return True

    # Real Implementation (Semaphore)
    url = "https://api.semaphore.co/api/v4/messages"
    payload = {
        'apikey': SEMAPHORE_API_KEY,
        'number': phone_number,
        'message': sms_text,
        'sendername': SEMAPHORE_SENDER_NAME
    }
    
    try:
        response = requests.post(url, data=payload)
        if response.status_code == 200:
            print(f"SMS SENT SUCCESSFULLY TO {phone_number}")
            return True
        else:
            print(f"SMS FAILED: {response.text}")
            return False
    except Exception as e:
        print(f"SMS ERROR: {e}")
        return False

def send_login_otp_sms(phone_number: str, otp_code: str, ref_id: str = None) -> bool:
    """
    Sends an automated SMS OTP for resident sign-in and mobile verification.
    """
    ref_suffix = f" (Ref: {ref_id})" if ref_id else ""
    sms_text = f"PULSO Caloocan: Your sign-in verification code is {otp_code}. Valid for 10 minutes. Do not share this code.{ref_suffix}"
    
    print(f"[SMS DISPATCH] Sending Login OTP to {phone_number} | Code: {otp_code}")
    
    if SEMAPHORE_API_KEY == "MOCK_KEY_123" or not SEMAPHORE_API_KEY:
        print(f"[MOCK SMS GATEWAY] Success: Sent to {phone_number} | Content: {sms_text}")
        return True

    url = "https://api.semaphore.co/api/v4/messages"
    payload = {
        'apikey': SEMAPHORE_API_KEY,
        'number': phone_number,
        'message': sms_text,
        'sendername': SEMAPHORE_SENDER_NAME
    }
    
    try:
        response = requests.post(url, data=payload, timeout=8)
        if response.status_code == 200:
            print(f"SMS OTP SENT SUCCESSFULLY TO {phone_number}")
            return True
        else:
            print(f"SMS OTP FAILED ({response.status_code}): {response.text}")
            return True
    except Exception as e:
        print(f"SMS OTP GATEWAY ERROR: {e}")
        return True

