import requests
import json

def repro():
    login_url = "http://localhost:33159/api/auth/login"
    login_data = {
        "username": "resident@pulso.com",
        "password": "password123",
        "captcha_token": "mobile_bypass"
    }
    
    try:
        # OAuth2PasswordRequestForm expects data in form-encoded format
        response = requests.post(login_url, data=login_data)
        if response.status_code != 200:
            print(f"Login failed ({response.status_code}): {response.text}")
            return
        
        login_resp = response.json()
        token = login_resp.get("access_token")
        user = login_resp.get("user")
        if not user:
            print("Login success but 'user' object is missing in response!")
            print(f"Full response: {json.dumps(login_resp, indent=2)}")
            return
            
        print(f"Logged in as: {user.get('email')} (Role: {user.get('role')})")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test Public Reports
        url = "http://localhost:33159/api/reports/public"
        resp = requests.get(url, headers=headers)
        print(f"Public Reports Status Code: {resp.status_code}")
        if resp.status_code == 500:
            print(f"500 Error detail: {resp.text}")
        elif resp.status_code == 200:
            data = resp.json()
            print(f"Success! Found {len(data)} public reports.")
            if len(data) > 0:
                print(f"Sample Report: {data[0].get('ticket_id')} | Reporter: {data[0].get('reporter_name')}")
        else:
            print(f"Unexpected status code: {resp.status_code}")
            print(resp.text)
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    repro()
