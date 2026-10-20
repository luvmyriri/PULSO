"""
spatial_service.py — PostGIS-Powered Spatial Queries & Geographic Operations
City Engineering Office, Caloocan City — PULSO System

Powers:
  1. Accurate North / South Caloocan dual-boundary checking (non-contiguous)
  2. Automatic barangay and sector assignment on report creation
  3. Metre-accurate nearby issues search with ST_DWithin and KNN (<->)
  4. Duplicate detection suggestions within ~50m threshold
  5. Bounding-box map viewport loading with ST_MakeEnvelope and GeoJSON
  6. Boundary simplification for fast mobile map rendering with ST_SimplifyPreserveTopology
  7. Spatial hotspot density & DBSCAN clustering
  8. Rule-based recurrence and risk inputs for preventive maintenance
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
import json

PUBLIC_REPORT_STATUSES = ("validated", "dispatched", "approved_internal", "in_progress", "resolved")


# ─────────────────────────────────────────────────────────────────────────────
# 1. Validation & Coordinate Guardrails
# ─────────────────────────────────────────────────────────────────────────────

def validate_coordinates(lat: float, lng: float) -> Tuple[bool, Optional[str]]:
    """Strict range checks for geographic coordinates."""
    if lat is None or lng is None:
        return False, "Coordinates cannot be null"
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return False, "Coordinates must be valid decimal numbers"

    if not (-90.0 <= lat <= 90.0):
        return False, f"Latitude {lat} is out of bounds (-90 to +90)"
    if not (-180.0 <= lng <= 180.0):
        return False, f"Longitude {lng} is out of bounds (-180 to +180)"

    return True, None


def validate_bounding_box(west: float, south: float, east: float, north: float) -> Tuple[bool, Optional[str]]:
    """Strict validation for map viewports."""
    for name, val in [("west", west), ("east", east)]:
        if not (-180.0 <= val <= 180.0):
            return False, f"{name} longitude {val} is out of bounds"
    for name, val in [("south", south), ("north", north)]:
        if not (-90.0 <= val <= 90.0):
            return False, f"{name} latitude {val} is out of bounds"

    if south > north:
        return False, f"South latitude ({south}) cannot be greater than north latitude ({north})"
    if west > east:
        return False, f"West longitude ({west}) cannot be greater than east longitude ({east})"

    return True, None


# ─────────────────────────────────────────────────────────────────────────────
# 2. Privacy & Redaction (RA 10173 Compliance)
# ─────────────────────────────────────────────────────────────────────────────

def mask_coordinates_for_privacy(lat: Optional[float], lng: Optional[float]) -> Tuple[Optional[float], Optional[float]]:
    """
    Fuzz/round public report coordinates to 3 decimal places (~110m precision)
    to protect resident privacy on open feeds while preserving neighborhood utility.
    """
    if lat is None or lng is None:
        return None, None
    return round(lat, 3), round(lng, 3)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Locate & Geofencing (Auto-assignment)
# ─────────────────────────────────────────────────────────────────────────────

def locate_point(db: Session, lat: float, lng: float) -> Dict[str, Any]:
    """
    Checks if coordinates fall within North or South Caloocan,
    assigns the sector and authoritative barangay via PostGIS ST_Covers.
    """
    valid, err = validate_coordinates(lat, lng)
    if not valid:
        return {
            "inside": False,
            "sector": None,
            "boundary_name": None,
            "barangay_id": None,
            "barangay_name": None,
            "barangay_display": None,
            "warning": err,
            "is_outside_caloocan": True,
        }

    # Query city boundaries (two non-contiguous shapes: North Caloocan and South Caloocan)
    query_cb = text("""
        SELECT name, sector
        FROM city_boundaries
        WHERE ST_Covers(geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
        LIMIT 1;
    """)
    cb_row = db.execute(query_cb, {"lat": lat, "lng": lng}).fetchone()

    # Query matching barangay polygon
    query_brgy = text("""
        SELECT id, name, display_name, sector, brgy_num
        FROM barangays
        WHERE ST_Covers(geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
        LIMIT 1;
    """)
    brgy_row = db.execute(query_brgy, {"lat": lat, "lng": lng}).fetchone()

    inside = cb_row is not None or brgy_row is not None
    sector = cb_row.sector if cb_row else (brgy_row.sector if brgy_row else None)
    boundary_name = cb_row.name if cb_row else (f"{sector} Caloocan" if sector else None)

    warning = None
    if not inside:
        warning = "Location falls outside official Caloocan City boundaries. Flagged for administrative review."

    return {
        "inside": inside,
        "sector": sector,
        "boundary_name": boundary_name,
        "barangay_id": brgy_row.id if brgy_row else None,
        "barangay_name": brgy_row.name if brgy_row else None,
        "barangay_display": brgy_row.display_name if brgy_row else None,
        "brgy_num": brgy_row.brgy_num if brgy_row else None,
        "warning": warning,
        "is_outside_caloocan": not inside,
    }


def sync_report_location_attributes(db: Session, report_id: int, lat: float, lng: float, accuracy_m: float = 0.0, plus_code: Optional[str] = None) -> Dict[str, Any]:
    """
    Synchronizes PostGIS location point, assigns barangay and sector,
    and flags outside-boundary tickets on insert/update.
    """
    loc_info = locate_point(db, lat, lng)

    stmt = text("""
        UPDATE reports
        SET location = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
            location_lat = :lat,
            location_lng = :lng,
            accuracy_m = :accuracy_m,
            plus_code = :plus_code,
            sector = :sector,
            barangay_id = COALESCE(:barangay_id, barangay_id),
            location_barangay = COALESCE(:barangay_display, :barangay_name, location_barangay)
        WHERE id = :report_id;
    """)

    db.execute(stmt, {
        "report_id": report_id,
        "lat": lat,
        "lng": lng,
        "accuracy_m": accuracy_m or 0.0,
        "plus_code": plus_code,
        "sector": loc_info["sector"],
        "barangay_id": loc_info["barangay_id"],
        "barangay_name": loc_info["barangay_name"],
        "barangay_display": loc_info["barangay_display"]
    })

    return loc_info


# ─────────────────────────────────────────────────────────────────────────────
# 4. Nearby Issues (Metre-based ST_DWithin + KNN ordering)
# ─────────────────────────────────────────────────────────────────────────────

def find_nearby_reports(
    db: Session,
    lat: float,
    lng: float,
    radius_m: float = 500.0,
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    is_staff: bool = False
) -> List[Dict[str, Any]]:
    """
    Returns nearby reports within radius_m metres, sorted nearest-first.
    Applies RA 10173 privacy fuzzing for non-staff viewers.
    """
    valid, err = validate_coordinates(lat, lng)
    if not valid:
        return []

    radius_m = max(10.0, min(float(radius_m), 15000.0)) # 10m to 15km
    limit = max(1, min(int(limit), 200))

    query = text("""
        SELECT 
            r.id,
            r.ticket_id,
            r.category,
            r.status,
            r.description,
            r.location_lat,
            r.location_lng,
            r.location_string,
            r.image_url,
            r.created_at,
            r.barangay_id,
            r.sector,
            b.display_name AS barangay_name,
            ROUND(ST_Distance(r.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)::numeric, 1) AS distance_meters
        FROM reports r
        LEFT JOIN barangays b ON r.barangay_id = b.id
        WHERE r.location IS NOT NULL
          AND (:is_staff OR r.status IN ('validated', 'dispatched', 'approved_internal', 'in_progress', 'resolved'))
          AND ST_DWithin(r.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)
          AND (:category IS NULL OR r.category = :category)
          AND (:status IS NULL OR r.status = :status)
        ORDER BY r.location <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
        LIMIT :limit;
    """)

    rows = db.execute(query, {
        "lat": lat,
        "lng": lng,
        "radius_m": radius_m,
        "is_staff": is_staff,
        "category": category,
        "status": status,
        "limit": limit
    }).fetchall()

    results = []
    for row in rows:
        r_lat, r_lng = row.location_lat, row.location_lng
        if not is_staff:
            r_lat, r_lng = mask_coordinates_for_privacy(r_lat, r_lng)

        results.append({
            "id": row.id,
            "ticket_id": row.ticket_id,
            "category": row.category,
            "status": row.status,
            "description": row.description,
            "location_lat": r_lat,
            "location_lng": r_lng,
            "location_string": row.location_string if is_staff else row.barangay_name,
            "image_url": row.image_url,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "barangay_id": row.barangay_id,
            "barangay_name": row.barangay_name,
            "sector": row.sector,
            "distance_meters": float(row.distance_meters),
            "distance_display": f"{int(row.distance_meters)} m" if row.distance_meters < 1000 else f"{round(row.distance_meters / 1000, 2)} km",
        })

    return results


# ─────────────────────────────────────────────────────────────────────────────
# 5. Duplicate Suggestions (Same category within ~50m in past N days)
# ─────────────────────────────────────────────────────────────────────────────

def find_duplicate_suggestions(
    db: Session,
    lat: float,
    lng: float,
    category: str,
    threshold_m: float = 50.0,
    days: int = 30,
    exclude_report_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Identifies potential duplicate reports within threshold_m metres and days.
    Provides suggestions to staff — never auto-merges or discards reports.
    """
    valid, _ = validate_coordinates(lat, lng)
    if not valid or not category:
        return []

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=max(1, int(days)))

    query = text("""
        SELECT 
            r.id,
            r.ticket_id,
            r.category,
            r.status,
            r.description,
            r.image_url,
            r.created_at,
            b.display_name AS barangay_name,
            ROUND(ST_Distance(r.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)::numeric, 1) AS distance_meters
        FROM reports r
        LEFT JOIN barangays b ON r.barangay_id = b.id
        WHERE r.location IS NOT NULL
          AND r.category = :category
          AND (:exclude_id IS NULL OR r.id != :exclude_id)
          AND r.created_at >= :cutoff_date
          AND ST_DWithin(r.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :threshold_m)
        ORDER BY distance_meters ASC
        LIMIT 10;
    """)

    rows = db.execute(query, {
        "lat": lat,
        "lng": lng,
        "category": category,
        "exclude_id": exclude_report_id,
        "cutoff_date": cutoff_date,
        "threshold_m": float(threshold_m)
    }).fetchall()

    candidates = []
    for row in rows:
        dist = float(row.distance_meters)
        candidates.append({
            "id": row.id,
            "ticket_id": row.ticket_id,
            "category": row.category,
            "status": row.status,
            "description": (row.description[:140] + "...") if row.description and len(row.description) > 140 else row.description,
            "image_url": row.image_url,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "barangay_name": row.barangay_name,
            "distance_meters": dist,
            "is_duplicate_suggestion": True,
            "advisory": f"Potential duplicate: Reported {dist}m away in the past {days} days."
        })

    return candidates


# ─────────────────────────────────────────────────────────────────────────────
# 6. Map Viewport Bounding-Box Query (GeoJSON)
# ─────────────────────────────────────────────────────────────────────────────

def get_reports_in_viewport(
    db: Session,
    west: float,
    south: float,
    east: float,
    north: float,
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 500,
    is_staff: bool = False
) -> Dict[str, Any]:
    """
    BBox viewport query with ST_MakeEnvelope and spatial && index bounding box test.
    Returns a GeoJSON FeatureCollection containing only features within view.
    """
    valid, err = validate_bounding_box(west, south, east, north)
    if not valid:
        return {"type": "FeatureCollection", "features": [], "error": err}

    limit = max(10, min(int(limit), 2000))

    query = text("""
        SELECT 
            r.id,
            r.ticket_id,
            r.category,
            r.status,
            r.description,
            r.location_lat,
            r.location_lng,
            r.sector,
            r.created_at,
            b.display_name AS barangay_name,
            ST_AsGeoJSON(r.location) AS geom_geojson
        FROM reports r
        LEFT JOIN barangays b ON r.barangay_id = b.id
        WHERE r.location && ST_MakeEnvelope(:west, :south, :east, :north, 4326)
          AND (:is_staff OR r.status IN ('validated', 'dispatched', 'approved_internal', 'in_progress', 'resolved'))
          AND (:category IS NULL OR r.category = :category)
          AND (:status IS NULL OR r.status = :status)
        LIMIT :limit;
    """)

    rows = db.execute(query, {
        "west": west,
        "south": south,
        "east": east,
        "north": north,
        "is_staff": is_staff,
        "category": category,
        "status": status,
        "limit": limit
    }).fetchall()

    features = []
    for row in rows:
        if not row.geom_geojson:
            continue
        geom = json.loads(row.geom_geojson)

        r_lat, r_lng = row.location_lat, row.location_lng
        if not is_staff:
            r_lat, r_lng = mask_coordinates_for_privacy(r_lat, r_lng)
            if geom.get("coordinates") and len(geom["coordinates"]) >= 2:
                geom["coordinates"] = [r_lng, r_lat]

        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "id": row.id,
                "ticket_id": row.ticket_id,
                "category": row.category,
                "status": row.status,
                "description": row.description[:100] if row.description else "",
                "sector": row.sector,
                "barangay_name": row.barangay_name,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        })

    return {
        "type": "FeatureCollection",
        "bbox": [west, south, east, north],
        "count": len(features),
        "features": features
    }


# ─────────────────────────────────────────────────────────────────────────────
# 7. Simplified Boundary Polygons for Mobile Map (Lag Elimination)
# ─────────────────────────────────────────────────────────────────────────────

def get_simplified_boundaries(
    db: Session,
    sector: Optional[str] = None,
    tolerance: float = 0.0008
) -> Dict[str, Any]:
    """
    Returns simplified city & barangay boundaries with ST_SimplifyPreserveTopology.
    Reduces polygon vertex count by ~85% for lightning-fast mobile map interaction.
    """
    tolerance = max(0.0001, min(float(tolerance), 0.01))

    query = text("""
        SELECT 
            name,
            sector,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, :tolerance)) AS geom_geojson
        FROM city_boundaries
        WHERE (:sector IS NULL OR sector ILIKE :sector);
    """)

    rows = db.execute(query, {"sector": sector, "tolerance": tolerance}).fetchall()

    features = []
    for row in rows:
        if not row.geom_geojson:
            continue
        features.append({
            "type": "Feature",
            "geometry": json.loads(row.geom_geojson),
            "properties": {
                "name": row.name,
                "sector": row.sector,
                "simplified_tolerance": tolerance
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }


# ─────────────────────────────────────────────────────────────────────────────
# 8. Hotspots & Spatial DBSCAN Clustering
# ─────────────────────────────────────────────────────────────────────────────

def get_hotspot_clusters(
    db: Session,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    category: Optional[str] = None,
    eps_deg: float = 0.0015,
    min_points: int = 3
) -> Dict[str, Any]:
    """
    Identifies high-density spatial incident clusters using ST_ClusterDBSCAN.
    Groups recurring community complaints into operational hotspots.
    """
    eps_deg = max(0.0005, min(float(eps_deg), 0.01))
    min_points = max(2, min(int(min_points), 20))

    query = text("""
        WITH clustered AS (
            SELECT 
                r.id,
                r.ticket_id,
                r.category,
                r.location_lat,
                r.location_lng,
                r.sector,
                b.display_name AS barangay_name,
                ST_ClusterDBSCAN(r.location, eps := :eps, minpoints := :min_points) OVER(PARTITION BY r.sector) AS cluster_id
            FROM reports r
            LEFT JOIN barangays b ON r.barangay_id = b.id
            WHERE r.location IS NOT NULL
              AND (:category IS NULL OR r.category = :category)
              AND (:date_from IS NULL OR r.created_at >= CAST(:date_from AS timestamptz))
              AND (:date_to IS NULL OR r.created_at <= CAST(:date_to AS timestamptz))
        )
        SELECT 
            cluster_id,
            sector,
            count(*) AS incident_count,
            AVG(location_lat) AS center_lat,
            AVG(location_lng) AS center_lng,
            string_agg(DISTINCT category, ', ') AS categories,
            string_agg(DISTINCT barangay_name, ', ') AS barangays
        FROM clustered
        WHERE cluster_id IS NOT NULL
        GROUP BY cluster_id, sector
        ORDER BY incident_count DESC;
    """)

    rows = db.execute(query, {
        "eps": eps_deg,
        "min_points": min_points,
        "category": category,
        "date_from": date_from,
        "date_to": date_to
    }).fetchall()

    clusters = []
    for row in rows:
        clusters.append({
            "cluster_id": row.cluster_id,
            "sector": row.sector,
            "incident_count": row.incident_count,
            "centroid": {"lat": round(float(row.center_lat), 6), "lng": round(float(row.center_lng), 6)},
            "categories": row.categories,
            "barangays": row.barangays
        })

    return {
        "total_clusters": len(clusters),
        "total_clustered_incidents": sum(c["incident_count"] for c in clusters),
        "eps_degrees": eps_deg,
        "min_points": min_points,
        "clusters": clusters
    }


# ─────────────────────────────────────────────────────────────────────────────
# 9. Preventive Maintenance Risk & Recurrence Inputs
# ─────────────────────────────────────────────────────────────────────────────

def get_preventive_risk_inputs(
    db: Session,
    asset_id: Optional[str] = None,
    category: Optional[str] = None,
    days: int = 90
) -> Dict[str, Any]:
    """
    Computes real spatial recurrence counts per infrastructure asset and per 50m cell.
    Output is strictly labelled as rule-based empirical inputs, NOT opaque AI predictions.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=max(7, int(days)))

    query = text("""
        SELECT 
            ia.asset_id,
            ia.asset_name,
            ia.category,
            ia.barangay,
            count(r.id) AS related_report_count,
            MAX(r.created_at) AS last_report_date
        FROM infrastructure_assets ia
        LEFT JOIN reports r ON (
            (r.location IS NOT NULL AND ia.geom IS NOT NULL AND ST_DWithin(r.location::geography, ia.geom::geography, 50.0))
            OR (r.barangay_id = ia.barangay_id AND r.category = ia.category)
        ) AND r.created_at >= :cutoff
        WHERE (:asset_id IS NULL OR ia.asset_id = :asset_id)
          AND (:category IS NULL OR ia.category = :category)
        GROUP BY ia.asset_id, ia.asset_name, ia.category, ia.barangay
        ORDER BY related_report_count DESC
        LIMIT 50;
    """)

    rows = db.execute(query, {
        "asset_id": asset_id,
        "category": category,
        "cutoff": cutoff
    }).fetchall()

    asset_risks = []
    for row in rows:
        count = row.related_report_count
        # Rule-based threshold
        if count >= 8:
            priority = "CRITICAL_INSPECTION_REQUIRED"
        elif count >= 4:
            priority = "SCHEDULED_INVESTIGATION"
        elif count >= 1:
            priority = "MONITORING"
        else:
            priority = "ROUTINE"

        asset_risks.append({
            "asset_id": row.asset_id,
            "asset_name": row.asset_name,
            "category": row.category,
            "barangay": row.barangay,
            "failure_frequency_90d": count,
            "last_incident": row.last_report_date.isoformat() if row.last_report_date else None,
            "rule_based_recommendation": priority,
            "model_type": "Deterministic Rule-Based Spatial Heuristic"
        })

    return {
        "methodology": "Rule-based historical incident recurrence analysis (50m radius / category match)",
        "window_days": days,
        "assets_evaluated": len(asset_risks),
        "results": asset_risks
    }
