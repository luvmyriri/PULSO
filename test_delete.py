import requests
import sys

BASE_URL = "http://localhost:33159"

def test_delete(report_id):
    # Try to get a report first to see if reached
    print(f"Testing connectivity to {BASE_URL}...")
    try:
        r = requests.get(f"{BASE_URL}/api/reports?limit=1")
        print(f"GET Status: {r.status_code}")
    except Exception as e:
        print(f"Connectivity Error: {e}")
        return

    # Try DELETE without auth just to see if it reaches the server
    print(f"Testing DELETE on report {report_id}...")
    try:
        r = requests.delete(f"{BASE_URL}/api/reports/{report_id}")
        print(f"DELETE Status: {r.status_code}")
        print(f"DELETE Response: {r.text}")
    except Exception as e:
        print(f"DELETE Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_delete(sys.argv[1])
    else:
        print("Usage: python test_delete.py <report_id>")
