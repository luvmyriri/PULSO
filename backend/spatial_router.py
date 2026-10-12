"""
spatial_router.py — FastAPI Router for PostGIS Spatial Engine Endpoints
City Engineering Office, Caloocan City — PULSO System

Endpoints:
  - GET /api/locate?lat=&lng=
  - GET /api/reports/nearby?lat=&lng=&radius=
  - GET /api/reports/map?bbox=west,south,east,north&category=
  - GET /api/reports/duplicates?lat=&lng=&category=&days=&radius=
  - GET /api/analytics/hotspots?from=&to=&category=
  - GET /api/spatial/boundaries?sector=&simplify=
  - GET /api/preventive/risk-inputs?asset_id=&category=&days=
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from database import get_db
from services import spatial_service
from auth import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api", tags=["Spatial & PostGIS Engine"])


# ─────────────────────────────────────────────────────────────────────────────
# 1. Reverse Geocoding & Geofence Verification
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/locate")
def locate_coordinates(
    lat: float = Query(..., description="Latitude (-90 to +90)"),
    lng: float = Query(..., description="Longitude (-180 to +180)"),
    db: Session = Depends(get_db)
):
    """
    Reverse geocodes coordinates against authoritative Caloocan City boundaries.
    Auto-detects North/South sector and assigned Barangay.
    """
    valid, err = spatial_service.validate_coordinates(lat, lng)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    result = spatial_service.locate_point(db, lat, lng)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 2. Nearby Issues (Metre-based proximity search)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/reports/nearby")
def get_nearby_reports(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(500.0, ge=10.0, le=15000.0, description="Search radius in metres (default 500m)"),
    category: Optional[str] = Query(None, description="Filter by report category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by ticket status"),
    limit: int = Query(50, ge=1, le=100, description="Max results to return"),
    db: Session = Depends(get_db),
    current_user: Optional[Any] = Depends(get_optional_current_user)
):
    """
    Queries citizen reports within specified metre radius, ordered nearest-first.
    Enforces RA 10173 privacy (coordinates fuzzed for public, exact for staff).
    """
    valid, err = spatial_service.validate_coordinates(lat, lng)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    is_staff = False
    if current_user:
        # Check if user is an official / staff member
        is_staff = hasattr(current_user, "role_id") or getattr(current_user, "account_type", "") == "official"

    nearby = spatial_service.find_nearby_reports(
        db=db,
        lat=lat,
        lng=lng,
        radius_m=radius,
        category=category,
        status=status_filter,
        limit=limit,
        is_staff=is_staff
    )
    return {
        "origin": {"lat": lat, "lng": lng},
        "radius_meters": radius,
        "count": len(nearby),
        "reports": nearby
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Viewport Map Loading (GeoJSON Bounding Box)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/reports/map")
def get_reports_map_viewport(
    bbox: str = Query(..., description="Bounding box in format 'west,south,east,north'"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(300, ge=10, le=1000, description="Max points to stream"),
    db: Session = Depends(get_db),
    current_user: Optional[Any] = Depends(get_optional_current_user)
):
    """
    Streams reports falling strictly within client map bounding box as GeoJSON.
    Prevents loading out-of-screen markers to maintain 60 FPS mobile map fluidity.
    """
    try:
        parts = [float(p.strip()) for p in bbox.split(",")]
        if len(parts) != 4:
            raise ValueError
        west, south, east, north = parts
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="bbox must be four comma-separated decimals: west,south,east,north"
        )

    valid, err = spatial_service.validate_bounding_box(west, south, east, north)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    is_staff = False
    if current_user:
        is_staff = hasattr(current_user, "role_id") or getattr(current_user, "account_type", "") == "official"

    geojson = spatial_service.get_reports_in_viewport(
        db=db,
        west=west,
        south=south,
        east=east,
        north=north,
        category=category,
        status=status_filter,
        limit=limit,
        is_staff=is_staff
    )
    return geojson


# ─────────────────────────────────────────────────────────────────────────────
# 4. Duplicate Suggestions for Staff Triage
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/reports/duplicates")
def check_duplicate_suggestions(
    lat: float = Query(..., description="Report latitude"),
    lng: float = Query(..., description="Report longitude"),
    category: str = Query(..., description="Issue category (e.g. 'Roads & Bridges')"),
    radius: float = Query(50.0, ge=5.0, le=500.0, description="Deduplication distance threshold in metres"),
    days: int = Query(30, ge=1, le=180, description="Recency search window in days"),
    exclude_id: Optional[int] = Query(None, description="Exclude existing report ID"),
    db: Session = Depends(get_db)
):
    """
    Suggests possible duplicate tickets within ~50m matching category and time window.
    Surfaces suggestions for human verification (never auto-merges or deletes).
    """
    valid, err = spatial_service.validate_coordinates(lat, lng)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    suggestions = spatial_service.find_duplicate_suggestions(
        db=db,
        lat=lat,
        lng=lng,
        category=category,
        threshold_m=radius,
        days=days,
        exclude_report_id=exclude_id
    )

    return {
        "has_duplicates": len(suggestions) > 0,
        "suggestion_count": len(suggestions),
        "threshold_meters": radius,
        "search_window_days": days,
        "candidates": suggestions
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. Hotspot & Incident Density Clustering
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/hotspots")
def get_analytics_hotspots(
    from_date: Optional[str] = Query(None, alias="from", description="ISO start date"),
    to_date: Optional[str] = Query(None, alias="to", description="ISO end date"),
    category: Optional[str] = Query(None, description="Category filter"),
    eps: float = Query(0.0015, ge=0.0005, le=0.01, description="DBSCAN clustering epsilon in degrees (~150m)"),
    min_points: int = Query(3, ge=2, le=20, description="Min incidents to form a cluster"),
    db: Session = Depends(get_db)
):
    """
    Calculates spatial clusters using PostGIS ST_ClusterDBSCAN.
    Identifies high-density recurring civic hazard pockets.
    """
    hotspots = spatial_service.get_hotspot_clusters(
        db=db,
        date_from=from_date,
        date_to=to_date,
        category=category,
        eps_deg=eps,
        min_points=min_points
    )
    return hotspots


# ─────────────────────────────────────────────────────────────────────────────
# 6. Simplified Boundaries (Mobile Performance Optimizer)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/spatial/boundaries")
def get_spatial_boundaries(
    sector: Optional[str] = Query(None, description="Filter by 'North' or 'South'"),
    simplify: float = Query(0.0008, ge=0.0001, le=0.01, description="Topology simplification tolerance in degrees"),
    db: Session = Depends(get_db)
):
    """
    Returns simplified city boundary polygons for fast rendering on mobile viewports.
    """
    return spatial_service.get_simplified_boundaries(db=db, sector=sector, tolerance=simplify)


# ─────────────────────────────────────────────────────────────────────────────
# 7. Preventive Maintenance Spatial Risk Inputs
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/preventive/risk-inputs")
def get_preventive_risk_inputs(
    asset_id: Optional[str] = Query(None, description="Specific asset ID filter"),
    category: Optional[str] = Query(None, description="Category filter"),
    days: int = Query(90, ge=7, le=365, description="Lookback window in days"),
    db: Session = Depends(get_db)
):
    """
    Computes empirical spatial recurrence frequency per asset.
    Strictly labelled as rule-based deterministic heuristics.
    """
    return spatial_service.get_preventive_risk_inputs(
        db=db,
        asset_id=asset_id,
        category=category,
        days=days
    )
