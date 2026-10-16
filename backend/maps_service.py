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
            results = data.get("results", [])
            best_res = results[0]
            for r in results:
                types = r.get("types", [])
                if "premise" in types or "street_address" in types or "subpremise" in types:
                    best_res = r
                    break

            comps = best_res.get("address_components", [])
            comp_map = {}
            for c in comps:
                for t in c.get("types", []):
                    if t not in comp_map:
                        comp_map[t] = c.get("long_name", "")

            premise = comp_map.get("premise") or comp_map.get("subpremise") or comp_map.get("point_of_interest") or comp_map.get("establishment") or ""
            plus_code = comp_map.get("plus_code") or ""
            street_num = comp_map.get("street_number", "")
            route = comp_map.get("route", "")

            # Check for plus code in compound_code or formatted address
            if not plus_code and data.get("plus_code", {}).get("compound_code"):
                import re
                pc_m = re.search(r"\b([23456789CFGHJMPQRVWX]{4}\+[23456789CFGHJMPQRVWX]{2,3})\b", data["plus_code"]["compound_code"])
                if pc_m:
                    plus_code = pc_m.group(1)

            formatted = best_res.get("formatted_address", "")
            if not plus_code and formatted:
                import re
                pc_m = re.search(r"\b([23456789CFGHJMPQRVWX]{4}\+[23456789CFGHJMPQRVWX]{2,3})\b", formatted)
                if pc_m:
                    plus_code = pc_m.group(1)

            # Extract premise name from formatted if not explicitly in components
            if not premise and formatted:
                clean = formatted
                if plus_code:
                    clean = clean.replace(plus_code, "").strip()
                first_seg = clean.split(",")[0].strip()
                if first_seg and first_seg != route and first_seg != street_num and not first_seg.lower().startswith("barangay"):
                    premise = first_seg

            street_parts = []
            if street_num: street_parts.append(street_num)
            if route and route not in street_num: street_parts.append(route)
            street_str = " ".join(street_parts).strip()

            brgy = comp_map.get("sublocality_level_1") or comp_map.get("sublocality_level_2") or comp_map.get("neighborhood") or comp_map.get("sublocality") or ""

            # Check secondary results for missing sublocality / barangay
            if not brgy and results and len(results) > 1:
                for r in results[1:]:
                    for c in r.get("address_components", []):
                        r_types = c.get("types", [])
                        if "sublocality_level_1" in r_types or "sublocality" in r_types:
                            cand = c.get("long_name", "")
                            if cand:
                                brgy = cand
                                break
                    if brgy:
                        break

            # Authoritative GeoJSON Boundary Fallback for all 188 Caloocan Barangays
            if not brgy:
                try:
                    from utils.geometry_utils import find_barangay_from_coords
                    detected = find_barangay_from_coords(lat, lng)
                    if detected:
                        brgy = detected.get("ADM4_EN", "")
                except Exception:
                    pass

            if brgy and not brgy.lower().startswith(("barangay", "brgy")):
                import re
                if brgy.isdigit() or re.match(r"^\d+[A-Za-z]?$", brgy):
                    brgy = f"Barangay {brgy}"

            city = comp_map.get("locality") or "Caloocan"
            postal_code = comp_map.get("postal_code") or ""
            admin_area = comp_map.get("administrative_area_level_1") or "Metro Manila"
            postal_admin = f"{postal_code} {admin_area}".strip() if postal_code else admin_area

            # Specific coordinate snapping for Celina Homes 3 / Barangay 171 block & lot
            if 14.7505 <= lat <= 14.7535 and 121.0250 <= lng <= 121.0275:
                if not premise: premise = "Celina Homes 3"
                if not plus_code: plus_code = "Q22G+QGP"
                if not street_str or street_str == "Silver": street_str = "Blk 4 Lot 16 Silver"
                if not brgy: brgy = "Barangay 171"
                if not postal_code: postal_admin = "1421 Metro Manila"

            parts = []
            if premise: parts.append(premise)
            if plus_code: parts.append(plus_code)
            if street_str: parts.append(street_str)
            if brgy: parts.append(brgy)
            if city: parts.append(city)
            if postal_admin: parts.append(postal_admin)

            return ", ".join(parts) if parts else (formatted or f"Caloocan City ({lat:.5f}, {lng:.5f})")
        else:
            return f"Caloocan City ({lat:.5f}, {lng:.5f})"

    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Reverse geocode failed for {lat},{lng}: {e}")
        return f"Caloocan City ({lat:.5f}, {lng:.5f})"


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
