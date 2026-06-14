import smtplib
import os
from dotenv import load_dotenv
from email.mime.text import MIMEText

load_dotenv()

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

def test_smtp():
    if not SMTP_USER or not SMTP_PASS:
        print("Error: SMTP_USER or SMTP_PASS not found in .env")
        return

    clean_pass = SMTP_PASS.replace(" ", "")
    print(f"Testing SMTP for user: {SMTP_USER}")
    
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.set_debuglevel(1)
            server.login(SMTP_USER, clean_pass)
            
            msg = MIMEText("This is a diagnostic test from PULSO Backend.")
            msg['Subject'] = "PULSO SMTP Diagnostic Test"
            msg['From'] = SMTP_USER
            msg['To'] = "alexismarc066@gmail.com" # Send to user
            
            server.send_message(msg)
            print("\nSUCCESS: SMTP connection and login successful. Test email sent to alexismarc066@gmail.com.")
    except smtplib.SMTPAuthenticationError:
        print("\nERROR: Authentication failed. Please check your App Password. Ensure it is a 16-character code with NO spaces (the spaces in the UI are just for readability).")
    except Exception as e:
        print(f"\nERROR: SMTP test failed: {e}")

if __name__ == "__main__":
    test_smtp()
