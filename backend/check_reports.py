import requests

BASE_URL = "http://127.0.0.1:33159"

def login():
    data = {"username": "manager@pulso.gov.ph", "password": "password123"}
    response = requests.post(f"{BASE_URL}/api/auth/login", data=data)
    if response.status_code == 200:
        return response.json()['access_token']
    
    data = {"username": "dispatcher@pulso.gov.ph", "password": "password123"}
    response = requests.post(f"{BASE_URL}/api/auth/login", data=data)
    if response.status_code == 200:
        return response.json()['access_token']
        
    print("Login failed:", response.text)
    return None

token = login()
if token:
    print("Logged in!")
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE_URL}/api/reports?t=123", headers=headers)
    print("Reports status code:", r.status_code)
    try:
        data = r.json()
        print("Data type:", type(data), "length:", len(data) if isinstance(data, list) else 0)
        if len(data) > 0:
            print(data[0])
    except Exception as e:
        print("Error reading json:", r.text[:200])
