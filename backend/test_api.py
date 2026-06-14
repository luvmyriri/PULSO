import requests

def test_api():
    # Login as resident to get token
    login_url = "http://localhost:33159/api/auth/login"
    login_data = {
        "username": "resident@gmail.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(login_url, data=login_data)
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return
        
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test Advisories
        adv_url = "http://localhost:33159/api/advisories"
        adv_resp = requests.get(adv_url, headers=headers)
        print(f"Advisories Status: {adv_resp.status_code}")
        print(f"Advisories Data: {adv_resp.json()}")
        
        # Test Reports
        user_id = response.json().get("user").get("id")
        rep_url = f"http://localhost:33159/api/reports/user/{user_id}"
        rep_resp = requests.get(rep_url, headers=headers)
        print(f"Reports Status: {rep_resp.status_code}")
        print(f"Reports Data: {rep_resp.json()}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
