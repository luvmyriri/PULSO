"""Spatial ticket queries. PostgreSQL uses the PostGIS index; SQLite supports tests."""

import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

import models
import gov_models
from utils.geometry_utils import calculate_haversine_distance


def _has_spatial_column(db: Session, table: str) -> bool:
    if db.bind.dialect.name != "postgresql":
        return False
    return bool(db.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = :table AND column_name = 'location_geog'
        )
    """), {"table": table}).scalar())


def nearby_active_report(
    db: Session, category: str, latitude: float, longitude: float, radius_meters: float = 15.0
):
    """Return the nearest active report of this category within a metre radius."""
    if _has_spatial_column(db, "reports"):
        report_id = db.execute(text("""
            SELECT id FROM reports
            WHERE category = :category
              AND status NOT IN ('resolved', 'cancelled', 'rejected')
              AND location_geog IS NOT NULL
              AND ST_DWithin(
                  location_geog,
                  ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                  :radius_meters
              )
            ORDER BY ST_Distance(
                location_geog,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
            ), id
            LIMIT 1
        """), {
            "category": category,
            "latitude": latitude,
            "longitude": longitude,
            "radius_meters": radius_meters,
        }).scalar()
        return db.get(models.Report, report_id) if report_id is not None else None

    # The in-memory test database has no PostGIS. Bound the candidate set, then
    # apply the same metre radius with a great-circle distance calculation.
    lat_delta = radius_meters / 110_000.0
    lng_delta = radius_meters / (110_000.0 * max(math.cos(math.radians(latitude)), 0.01))
    candidates = db.query(models.Report).filter(
        models.Report.category == category,
        models.Report.status.notin_(["resolved", "cancelled", "rejected"]),
        models.Report.location_lat.between(latitude - lat_delta, latitude + lat_delta),
        models.Report.location_lng.between(longitude - lng_delta, longitude + lng_delta),
    ).all()
    matches = [
        (calculate_haversine_distance(latitude, longitude, r.location_lat, r.location_lng), r)
        for r in candidates
    ]
    matches = [(distance, report) for distance, report in matches if distance * 1000 <= radius_meters]
    return min(matches, key=lambda item: (item[0], item[1].id))[1] if matches else None


def nearby_available_agents(
    db: Session, latitude: float, longitude: float, limit: int = 3, max_age_minutes: int = 15, allowed_agent_ids=None
):
    """Return fresh, active field officials nearest a report; older GPS is ineligible."""
    fresh_since = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)
    if allowed_agent_ids is not None and not allowed_agent_ids: return []
    eligible_roles = ("field_worker", "foreman", "construction_foreman", "project_engineer", "building_inspector")
    limit = max(1, min(limit, 20))
    if _has_spatial_column(db, "agent_locations"):
        rows = db.execute(text("""
            SELECT a.agent_id, o.full_name, a.status, a.updated_at,
                   ST_Distance(a.location_geog, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography) AS distance_m
            FROM agent_locations a
            JOIN officials o ON o.id = a.agent_id
            WHERE a.status IN ('available', 'returning')
              AND a.updated_at >= :fresh_since
              AND o.is_active = true AND o.is_suspended = false
              AND o.role IN ('field_worker', 'foreman', 'construction_foreman', 'project_engineer', 'building_inspector')
              AND a.location_geog IS NOT NULL
              AND (:all_agents OR a.agent_id = ANY(CAST(:allowed_ids AS INTEGER[])))
              AND ST_DWithin(a.location_geog, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, 50000)
            ORDER BY distance_m, a.agent_id
            LIMIT :limit
        """), {
            "latitude": latitude, "longitude": longitude, "fresh_since": fresh_since, "limit": limit,
            "all_agents": allowed_agent_ids is None, "allowed_ids": list(allowed_agent_ids or []),
        }).mappings().all()
        return [{
            "agent_id": row["agent_id"], "full_name": row["full_name"],
            "status": row["status"], "distance_km": round(row["distance_m"] / 1000, 2),
            "location_updated_at": row["updated_at"],
        } for row in rows]

    rows = db.query(gov_models.AgentLocation, models.Official).join(
        models.Official, models.Official.id == gov_models.AgentLocation.agent_id
    ).filter(
        gov_models.AgentLocation.status.in_(["available", "returning"]),
        gov_models.AgentLocation.updated_at >= fresh_since,
        models.Official.is_active == True,
        models.Official.is_suspended == False,
        models.Official.role.in_(eligible_roles),
    )
    if allowed_agent_ids is not None: rows = rows.filter(models.Official.id.in_(allowed_agent_ids))
    rows = rows.all()
    result = []
    for location, official in rows:
        if location.latitude is None or location.longitude is None:
            continue
        distance_km = calculate_haversine_distance(
            latitude, longitude, location.latitude, location.longitude
        )
        if distance_km <= 50:
            result.append({
                "agent_id": official.id, "full_name": official.full_name,
                "status": location.status, "distance_km": round(distance_km, 2),
                "location_updated_at": location.updated_at,
            })
    result.sort(key=lambda item: (item["distance_km"], item["agent_id"]))
    return result[:limit]
