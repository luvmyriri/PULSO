"""
maps_service.py — Google Maps API Integration
PULSO Backend — Caloocan City Engineering Office

Provides:
  - reverse_geocode(lat, lng) → human-readable address string
  - forward_geocode(query)    → list of place suggestions with lat/lng
"""

import os
import httpx
from typing import Optional

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

GEOCODING_URL   = "https://maps.googleapis.com/maps/api/geocode/json"
PLACES_TEXT_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DIRECTIONS_URL  = "https://maps.googleapis.com/maps/api/directions/json"


async def reverse_geocode(lat: float, lng: float) -> str:
    """
    Convert GPS coordinates → human-readable Philippine address string.
    Falls back to 'Lat: X, Lng: Y' if API is unavailable.
    """
    if not GOOGLE_MAPS_API_KEY:
        return f"Lat: {lat:.6f}, Lng: {lng:.6f}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                GEOCODING_URL,
                params={
                    "latlng": f"{lat},{lng}",
                    "key": GOOGLE_MAPS_API_KEY,
                    "language": "en",
                    "result_type": "street_address|sublocality|locality",
                    "region": "ph",
                }
            )
            data = resp.json()

        if data.get("status") == "OK" and data.get("results"):
            # Pick the most specific result
            best = data["results"][0]
            return _shorten_address(best.get("formatted_address", ""))
        else:
            return f"Lat: {lat:.6f}, Lng: {lng:.6f}"

    except Exception:
        return f"Lat: {lat:.6f}, Lng: {lng:.6f}"


async def forward_geocode(query: str, region: str = "PH") -> list:
    """
    Search for places by text query. Returns list of dicts with
    { name, address, lat, lng }.
    """
    if not GOOGLE_MAPS_API_KEY or not query.strip():
        return []

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                PLACES_TEXT_URL,
                params={
                    "query": query,
                    "key": GOOGLE_MAPS_API_KEY,
                    "language": "en",
                    "region": region,
                    "location": "14.7566,121.0450",     # Bias toward Caloocan North
                    "radius": 10000,
                }
            )
            data = resp.json()

        results = []
        for place in data.get("results", [])[:5]:
            loc = place.get("geometry", {}).get("location", {})
            results.append({
                "name":    place.get("name", ""),
                "address": _shorten_address(place.get("formatted_address", "")),
                "lat":     loc.get("lat"),
                "lng":     loc.get("lng"),
            })
        return results

    except Exception:
        return []


async def get_directions(origin: str, destination: str, mode: str = "driving") -> Optional[dict]:
    """
    Get directions between two points (coords or address).
    Returns basic route data including encoded polyline, distance, and duration.
    """
    if not GOOGLE_MAPS_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                DIRECTIONS_URL,
                params={
                    "origin": origin,
                    "destination": destination,
                    "mode": mode,
                    "key": GOOGLE_MAPS_API_KEY,
                    "region": "ph"
                }
            )
            data = resp.json()

        if data.get("status") == "OK" and data.get("routes"):
            route = data["routes"][0]
            leg = route["legs"][0]
            
            return {
                "polyline": route["overview_polyline"]["points"],
                "distance": leg["distance"]["text"],
                "duration": leg["duration"]["text"],
                "start_address": leg["start_address"],
                "end_address": leg["end_address"],
                "bounds": route["bounds"],
                "status": "OK"
            }
        
        print(f"[GOOGLE MAPS ERROR] Status: {data.get('status')} - Error Message: {data.get('error_message')}")
        return {
            "status": data.get("status"),
            "error_detail": data.get("error_message")
        }

    except Exception as e:
        print(f"[GOOGLE MAPS EXCEPTION] {str(e)}")
        return None


def _shorten_address(full_address: str) -> str:
    """
    Strip long Philippines postal suffixes for cleaner display.
    'Block 5, Lot 3, Camarin Rd, Bagong Silang, Caloocan, 1421 Metro Manila, Philippines'
    → 'Block 5, Lot 3, Camarin Rd, Bagong Silang, Caloocan'
    """
    parts = full_address.split(",")
    # Remove trailing country / postal-code segments
    cleaned = []
    for part in parts:
        p = part.strip()
        if p == "Philippines":
            break
        if any(p.startswith(code) for code in ["Metro Manila", "NCR", "National Capital"]):
            break
        cleaned.append(p)
    return ", ".join(cleaned) if cleaned else full_address
