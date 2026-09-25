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

def _get_api_key():
    return os.getenv("GOOGLE_MAPS_API_KEY", "")

GEOCODING_URL   = "https://maps.googleapis.com/maps/api/geocode/json"
PLACES_TEXT_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DIRECTIONS_URL  = "https://maps.googleapis.com/maps/api/directions/json"


async def reverse_geocode(lat: float, lng: float) -> str:
    """
    Convert GPS coordinates → full human-readable Philippine address string.
    Specifically ensures Barangay information is included for local government standards.
    """
    api_key = _get_api_key()
    if not api_key:
        return f"Lat: {lat:.6f}, Lng: {lng:.6f}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                GEOCODING_URL,
                params={
                    "latlng": f"{lat},{lng}",
                    "key": api_key,
                    "language": "en",
                    "region": "ph",
                }
            )
            data = resp.json()

        if data.get("status") == "OK" and data.get("results"):
            # Extract Plus Code if available in the response level
            plus_code = ""
            if "plus_code" in data:
                plus_code = data["plus_code"].get("compound_code", "")
            
            final_address = ""
            detected_brgy = ""
            # We want the most specific non-plus-code address
            for result in data["results"]:
                if "plus_code" in result.get("types", []):
                    continue
                
                # Check for plus code in the address string itself
                formatted = result.get("formatted_address", "")
                if "+" in formatted.split(",")[0]:
                    continue

                # Reconstruct address from components to ensure Barangay is present
                components = result.get("address_components", [])
                parts = {
                    "number": "",
                    "street": "",
                    "barangay": "",
                    "city": "",
                    "province": "",
                    "country": ""
                }
                
                for comp in components:
                    types = comp.get("types", [])
                    name = comp.get("long_name", "")
                    
                    if any(t in types for t in ["street_number", "premise", "subpremise"]):
                        if parts["number"]:
                            parts["number"] = f"{name}, {parts['number']}"
                        else:
                            parts["number"] = name
                    elif "route" in types:
                        parts["street"] = name
                    elif any(t in types for t in ["sublocality_level_1", "sublocality_level_2", "neighborhood", "sublocality", "administrative_area_level_4", "administrative_area_level_5"]):
                        # Ensure "Barangay" prefix
                        if name and not name.lower().startswith(("barangay", "brgy")):
                            # If it's just a number, it's definitely a barangay in Caloocan (1-188)
                            if name.isdigit() and 1 <= int(name) <= 188:
                                name = f"Barangay {name}"
                            elif "village" not in name.lower() and "subdivision" not in name.lower():
                                # Only prefix if it's likely a barangay name
                                if any(word in name.lower() for word in ["bagong", "silang", "camarin", "vicas"]):
                                    name = f"Barangay {name}"
                        parts["barangay"] = name
                    elif "locality" in types:
                        parts["city"] = name
                    elif "administrative_area_level_1" in types:
                        parts["province"] = name
                    elif "country" in types:
                        parts["country"] = name

                # Store the detected barangay separately
                if parts["barangay"] and not detected_brgy:
                    detected_brgy = parts["barangay"]

                # If we have a reconstructed specific address, use it
                if (parts["street"] or parts["number"]) and parts["city"] and not final_address:
                    addr_str = ""
                    if parts["number"]: addr_str += f"{parts['number']}, "
                    if parts["street"]: addr_str += f"{parts['street']}"
                    
                    if parts["barangay"]: 
                        if not addr_str.endswith(", "): addr_str += ", "
                        addr_str += f"{parts['barangay']}"
                    if parts["city"]:
                        if not addr_str.endswith(", "): addr_str += ", "
                        addr_str += f"{parts['city']}"
                    final_address = addr_str
                    # Don't break yet, keep looking for barangay in other results if still empty
                
                # If we have both, we can break
                if final_address and detected_brgy:
                    break
                
            if not final_address and data["results"]:
                final_address = data["results"][0].get("formatted_address", f"{lat}, {lng}")

            # Extract from formatted if components failed us or gave "Unknown"
            if not detected_brgy or "unknown" in detected_brgy.lower():
                import re
                # 1. Look for explicit "Barangay X" or "Brgy X"
                match = re.search(r"(?:Barangay|Brgy\.?)\s*([A-Z0-9\-\s]+?)(?:,|$)", final_address, re.I)
                if match:
                    detected_brgy = match.group(0).strip().rstrip(",")
                else:
                    # 2. Look for common Caloocan pattern: "..., 175, Caloocan, ..."
                    brgy_num_match = re.search(r",\s*(\d{1,3}[A-Z]?)\s*,\s*Caloocan", final_address, re.I)
                    if brgy_num_match:
                        detected_brgy = f"Barangay {brgy_num_match.group(1)}"
                    else:
                        # 3. Search in the first result components specifically for any part containing "Barangay"
                        for comp in data["results"][0].get("address_components", []):
                            if "barangay" in comp.get("long_name", "").lower():
                                detected_brgy = comp.get("long_name")
                                break

            if not detected_brgy:
                detected_brgy = "Barangay Unknown"

            # Final standardizations
            if not detected_brgy.lower().startswith(("barangay", "brgy")):
                detected_brgy = f"Barangay {detected_brgy}"
            
            final_address = _shorten_address(final_address)

            if plus_code:
                return f"{plus_code} | {final_address} | {detected_brgy}"
            return f"{final_address} | {detected_brgy}"
        else:
            return f"{lat:.6f}, {lng:.6f} | Barangay Unknown"

    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Reverse geocode failed for {lat},{lng}: {e}")
        return f"{lat:.6f}, {lng:.6f} | Barangay Unknown"


async def forward_geocode(query: str, region: str = "PH") -> list:
    """
    Search for places by text query. Returns list of dicts with
    { name, address, lat, lng }.
    """
    api_key = _get_api_key()
    if not api_key or not query.strip():
        return []

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                PLACES_TEXT_URL,
                params={
                    "query": query,
                    "key": api_key,
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

    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Forward geocode failed for query '{query}': {e}")
        return []


async def get_directions(origin: str, destination: str, mode: str = "driving") -> Optional[dict]:
    """
    Get directions between two points (coords or address).
    Returns basic route data including encoded polyline, distance, and duration.
    """
    api_key = _get_api_key()
    if not api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                DIRECTIONS_URL,
                params={
                    "origin": origin,
                    "destination": destination,
                    "mode": mode,
                    "key": api_key,
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
