import requests
import json

BASE_URL = "http://localhost:8000"

def verify_ai_functionality():
    print("\n" + "="*60)
    print(" PULSO AI SYSTEM FUNCTIONAL VERIFICATION")
    print("="*60)

    # ── 1. AUTH AS DISPATCHER (has access to /api/reports) ──────────────
    print("\n[1] Authenticating as Dispatcher (city.engineer)...")
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "city.engineer@caloocan.gov.ph",
            "password": "CEO@pulso2025!"
        })
        if resp.status_code != 200:
            print(f"❌ Gov Login Failed: {resp.text}")
            return
        gov_token = resp.json()["access_token"]
        gov_headers = {"Authorization": f"Bearer {gov_token}"}
        print("✅ Gov Auth OK.")
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    # Also get a resident token (can POST to /api/reports as a reporter)
    try:
        resp2 = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "admin@pulso.system",
            "password": "SysAdmin@pulso2025!"
        })
        admin_token = resp2.json()["access_token"] if resp2.status_code == 200 else gov_token
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("✅ Admin Auth OK.")
    except:
        admin_headers = gov_headers

    # ── 2. OMNI-ASSISTANT ───────────────────────────────────────────────
    print("\n[2] Testing Omni-Assistant (Vertex AI Chat)...")
    try:
        resp = requests.post(f"{BASE_URL}/api/ai/assistant", json={
            "query": "What is the DPWH standard for pothole repair depth in urban roads?",
            "context": "Dispatcher verification test"
        }, headers=gov_headers)
        if resp.status_code == 200:
            text = resp.json().get("response", "")
            print(f"✅ AI Response OK: \"{text[:120]}...\"")
        else:
            print(f"❌ Omni-Assistant Failed [{resp.status_code}]: {resp.text[:200]}")
    except Exception as e:
        print(f"❌ Chat Error: {e}")

    # ── 3. ADVISORY GENERATION ──────────────────────────────────────────
    print("\n[3] Testing AI Advisory Drafting...")
    try:
        # First get existing reports (city_engineer has manager-level access)
        reports_resp = requests.get(f"{BASE_URL}/api/reports?limit=5", headers=gov_headers)

        report_id = None
        if reports_resp.status_code == 200 and reports_resp.json():
            report_id = reports_resp.json()[0]["id"]
            print(f"   Using existing Report ID: {report_id}")
        else:
            # Create a report as the system admin (who has broader role)
            print("   No reports found via gov endpoint — creating one via admin...")
            create_resp = requests.post(f"{BASE_URL}/api/reports",
                data={
                    "category": "Road Issue",
                    "description": "Critical pothole cluster on Zabarte Road near Bagong Silang Phase 3, causing accidents.",
                    "lat": "14.7610",
                    "lng": "121.0491"
                },
                headers=admin_headers
            )
            if create_resp.status_code in (200, 201):
                report_id = create_resp.json()["id"]
                print(f"   Created Report ID: {report_id}")
            else:
                print(f"   ❌ Could not create report [{create_resp.status_code}]: {create_resp.text[:200]}")

        if report_id:
            gen_resp = requests.post(
                f"{BASE_URL}/api/advisories/generate/{report_id}",
                headers=gov_headers
            )
            if gen_resp.status_code == 200:
                draft = gen_resp.json()
                print(f"✅ AI Drafted Advisory: \"{draft.get('title')}\"")
                print(f"   Priority: {draft.get('priority')}")
            else:
                print(f"❌ Advisory Gen Failed [{gen_resp.status_code}]: {gen_resp.text[:200]}")
        else:
            print("⚠️ Skipping: No report available.")
    except Exception as e:
        print(f"❌ Advisory Test Error: {e}")

    # ── 4. CONTENT SAFETY MODERATION ────────────────────────────────────
    print("\n[4] Testing AI Content Safety Moderation (Rejection Logic)...")
    try:
        resp = requests.post(
            f"{BASE_URL}/api/reports",
            data={
                "description": "This is a fake spam report filled with hate speech and violent threats.",
                "category": "Safety Test",
                "lat": "14.7566",
                "lng": "121.0450"
            },
            headers=admin_headers
        )
        if resp.status_code == 400:
            print(f"✅ AI Moderation OK: Report correctly rejected.")
            detail = resp.json().get("detail", "")
            print(f"   Reason: {detail[:150]}")
        elif resp.status_code in (200, 201):
            print("❌ AI Moderation FAILED: Inappropriate report was allowed through!")
        else:
            print(f"❌ Unexpected status [{resp.status_code}]: {resp.text[:300]}")
    except Exception as e:
        print(f"❌ Moderation Test Error: {e}")

    print("\n" + "="*60)
    print(" VERIFICATION COMPLETE")
    print("="*60 + "\n")


if __name__ == "__main__":
    verify_ai_functionality()
