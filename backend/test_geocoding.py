import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

async def test_reverse_geocode(lat, lng):
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    if not GOOGLE_MAPS_API_KEY:
        print("Error: GOOGLE_MAPS_API_KEY not found in .env")
        return

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url,
            params={
                "latlng": f"{lat},{lng}",
                "key": GOOGLE_MAPS_API_KEY,
                "language": "en",
                "region": "ph"
            }
        )
        data = resp.json()
        import json
        print(json.dumps(data, indent=2))
        if data.get("status") == "OK" and data.get("results"):
            print(f"Address for {lat}, {lng}:")
            print(data["results"][0]["formatted_address"])
            
            # Shorten logic check
            full_address = data["results"][0]["formatted_address"]
            parts = full_address.split(",")
            cleaned = []
            for part in parts:
                p = part.strip()
                if p == "Philippines":
                    break
                if any(p.startswith(code) for code in ["Metro Manila", "NCR", "National Capital"]):
                    break
                cleaned.append(p)
            print("Shortened:", ", ".join(cleaned))
        else:
            print(f"Error: {data.get('status')} - {data.get('error_message', 'No address found')}")

if __name__ == "__main__":
    asyncio.run(test_reverse_geocode(14.75252, 121.02629))
