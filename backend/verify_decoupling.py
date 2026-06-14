import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_login(email, password, is_resident=False):
    print(f"\nTesting login for {email}...")
    data = {
        "username": email,
        "password": password
    }
    if is_resident:
        data["captcha_token"] = "mobile_bypass"
        
    response = requests.post(f"{BASE_URL}/api/auth/login", data=data)
    if response.status_code == 200:
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Role: {data['user']['role']}")
        print(f"Capabilities: {data['user']['capabilities']}")
        return data["access_token"]
    else:
        print(f"Status: {response.status_code}")
        print(f"Error: {response.text}")
        return None

def test_user_list(token, account_type):
    print(f"\nTesting User Management list for {account_type}...")
    headers = {"Authorization": f"Bearer {token}"}
    params = {"account_type": account_type}
    response = requests.get(f"{BASE_URL}/api/gov/users", headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        users = data.get("users", [])
        total = data.get("total", 0)
        print(f"Found {len(users)} users (Total: {total})")
        if users:
            print(f"Sample User: {users[0]['email']} ({users[0].get('role', 'N/A')})")
    else:
        print(f"Error: {response.text}")

def test_user_counts(token):
    print("\nTesting User Counts...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/gov/users/stats", headers=headers)
    if response.status_code == 200:
        print(f"Counts: {response.json()}")
    else:
        print(f"Error: {response.text}")

def test_suspension(token, user_id):
    print(f"\nTesting Official Suspension for User ID {user_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Suspend
    print("Suspending user...")
    payload = {"action": "suspend", "reason": "Verification testing"}
    response = requests.patch(f"{BASE_URL}/api/gov/users/{user_id}/status", headers=headers, json=payload)
    print(f"Suspend Status: {response.status_code}")
    
    # Unsuspend
    print("Unsuspending user...")
    payload = {"action": "activate"}
    response = requests.patch(f"{BASE_URL}/api/gov/users/{user_id}/status", headers=headers, json=payload)
    print(f"Unsuspend Status: {response.status_code}")

if __name__ == "__main__":
    print("PULSO Decoupling Verification Suite\n")
    
    # 1. Test Official Login (System Admin)
    admin_token = test_login("admin@pulso.system", "SysAdmin@pulso2025!")
    
    if admin_token:
        # 2. Test Management
        test_user_list(admin_token, "government")
        test_user_list(admin_token, "resident")
        test_user_counts(admin_token)
        
        # 3. Test Official Suspension
        # Find an official to suspend (not admin)
        test_suspension(admin_token, 2) # Assuming Engr. Maria is ID 1, Engr. Jose is ID 2
        
    # 4. Test Resident Login
    test_login("vjlamsenlamsen28@gmail.com", "Pulso@2025!", is_resident=True)
