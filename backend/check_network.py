import socket
import requests
import os
from dotenv import load_dotenv

load_dotenv()

def check_connectivity():
    print("\n=== PULSO OCR CONNECTIVITY DIAGNOSTIC ===")
    
    hosts = [
        "vision.googleapis.com",
        "api.ocr.space",
        "generativelanguage.googleapis.com"
    ]
    
    for host in hosts:
        print(f"\nChecking {host}...")
        try:
            ip = socket.gethostbyname(host)
            print(f"  ✅ DNS Resolve: Success ({ip})")
            
            # Simple ping/request
            try:
                # Use a very short timeout for quick check
                requests.get(f"https://{host}", timeout=5)
                print(f"  ✅ HTTPS Reachable: Yes")
            except requests.exceptions.RequestException as e:
                print(f"  ⚠️  HTTPS Reachable: No ({type(e).__name__})")
        except socket.gaierror:
            print(f"  ❌ DNS Resolve: FAILED (Your network cannot find this domain)")

    print("\n--- API Keys Check ---")
    keys = {
        "GOOGLE_VISION_API_KEY": os.getenv("GOOGLE_VISION_API_KEY"),
        "OCR_API_KEY": os.getenv("OCR_API_KEY"),
    }
    
    for name, key in keys.items():
        if key:
            status = "Configured"
            if "AIza" in key or len(key) > 5:
                status += " (Looks valid)"
            print(f"  {name}: {status}")
        else:
            print(f"  {name}: NOT FOUND in .env")

if __name__ == "__main__":
    check_connectivity()
