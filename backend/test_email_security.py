import httpx
import asyncio

async def test_email_security():
    base_url = "http://localhost:8000"
    
    print("\n--- 1. Testing Invalid Email Registration ---")
    try:
        register_payload = {
            "email": "fake@example.com",
            "password": "Password123!",
            "full_name": "Test User",
            "role": "resident"
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{base_url}/api/auth/register", json=register_payload)
            print(f"Status: {resp.status_code}")
            print(f"Detail: {resp.json().get('detail')}")
            if resp.status_code == 400:
                print("✅ Correctly rejected example.com")
    except Exception as e:
        print(f"Error: {e}")

    print("\n--- 2. Testing 123456 Bypass ---")
    try:
        verify_payload = {
            "email": "realuser@gmail.com", # Assuming this exists or just testing the code check
            "code": "123456"
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{base_url}/api/auth/verify-registration", json=verify_payload)
            print(f"Status: {resp.status_code}")
            print(f"Detail: {resp.json().get('detail')}")
            if resp.status_code == 400 and "Invalid verification code" in resp.text:
                print("✅ 123456 Bypass is REMOVED")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_email_security())
