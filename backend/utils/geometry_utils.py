import json
import os
import math

# Internal cache for border data
_border_polygons = None

def _load_border_data():
    global _border_polygons
    if _border_polygons is not None:
        return _border_polygons
    
    try:
        # Path relative to this file: backend/utils/geometry_utils.py -> backend/caloocan_border.json
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.normpath(os.path.join(current_dir, "..", "caloocan_border.json"))
        
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                data = json.load(f)
                _border_polygons = []
                for feature in data.get("features", []):
                    geom = feature.get("geometry")
                    if not geom:
                        continue
                    geom_type = geom.get("type")
                    coords = geom.get("coordinates", [])
                    if geom_type == "Polygon":
                        _border_polygons.append(coords)
                    elif geom_type == "MultiPolygon":
                        _border_polygons.extend(coords)
        else:
            _border_polygons = []
    except Exception as e:
        print(f"Error loading border data: {e}")
        _border_polygons = []
    
    return _border_polygons

def is_point_in_polygon(lng: float, lat: float, polygon_rings: list) -> bool:
    """
    Ray casting algorithm for point-in-polygon test.
    Handles holes by assuming the first ring is the exterior.
    """
    if not polygon_rings:
        return False
        
    exterior = polygon_rings[0]
    n = len(exterior)
    inside = False
    
    p1x, p1y = exterior[0] # lng, lat
    for i in range(1, n + 1):
        p2x, p2y = exterior[i % n]
        if lat > min(p1y, p2y):
            if lat <= max(p1y, p2y):
                if lng <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or lng <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
        
    # If not inside exterior, no need to check holes
    if not inside:
        return False
        
    # Check holes
    for hole in polygon_rings[1:]:
        if is_point_in_polygon(lng, lat, [hole]):
            return False
            
    return True

def is_in_caloocan(lat: float, lng: float) -> bool:
    """
    Validates if a GPS coordinate is within the North or South sectors of Caloocan City
    using the official MultiPolygon boundary.
    """
    if lat is None or lng is None:
        return False

    polygons = _load_border_data()
    if not polygons:
        # Fallback to rough boxes if GeoJSON is missing (safe-guard)
        in_south = (14.63 <= lat <= 14.67) and (120.95 <= lng <= 121.00)
        in_north = (14.69 <= lat <= 14.81) and (121.00 <= lng <= 121.13)
        return in_south or in_north

    # Check each polygon in the MultiPolygon
    for poly_rings in polygons:
        if is_point_in_polygon(lng, lat, poly_rings):
            return True
            
    return False

def get_district_from_coords(lat: float, lng: float) -> int:
    """
    Determines the district based on coordinates.
    District 1 & 2 are South Caloocan.
    District 3 is North Caloocan (above the separation).
    """
    if not is_in_caloocan(lat, lng):
        return 0
        
    # Latitude split (North Caloocan starts around 14.69N)
    if lat >= 14.69:
        return 3
    return 1 # Default South district

import math

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in Kilometers.
    """
    if None in [lat1, lon1, lat2, lon2]:
        return float('inf')

    # Convert decimal degrees to radians 
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers.
    return c * r

def get_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns distance between two GPS coordinates in meters."""
    dist_km = calculate_haversine_distance(lat1, lon1, lat2, lon2)
    if dist_km == float('inf'):
        return float('inf')
    return dist_km * 1000.0
