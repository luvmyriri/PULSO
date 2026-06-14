import requests
import json

def repro_submit():
    login_url = "http://localhost:33162/api/auth/login"
    login_data = {
        "username": "resident@pulso.com",
        "password": "password123",
        "captcha_token": "mobile_bypass"
    }
    
    try:
        # 1. LOGIN
        response = requests.post(login_url, data=login_data)
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return
            
        login_resp = response.json()
        token = login_resp.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. SUBMIT REPORT
        submit_url = "http://localhost:33162/api/reports"
        report_data = {
            "category": "Pot Hole",
            "description": "Large pot hole at Deparo Road",
            "lat": 14.657502,
            "lng": 120.973840
        }
        
        print("Submitting report...")
        resp = requests.post(submit_url, headers=headers, data=report_data)
        print(f"Submit Status Code: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Submit Error: {resp.text}")
        else:
            print(f"Report Created! Ticket ID: {resp.json().get('ticket_id')}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    repro_submit()
