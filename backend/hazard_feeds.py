"""Licensed Open-Meteo weather and GloFAS context for verified asset areas.

This adapter never converts forecast rainfall or regional discharge into an
observed flood, asset defect, emergency alert, or work order.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import math
import os

import httpx
from sqlalchemy import func, text
from sqlalchemy.orm import Session

import models
from gov_models import HazardIngestionRun, HazardSourceSnapshot, InfrastructureAsset

WEATHER_URL = "https://customer-api.open-meteo.com/v1/forecast"
FLOOD_URL = "https://customer-flood-api.open-meteo.com/v1/flood"
WEATHER_DOC = "https://open-meteo.com/en/docs"
FLOOD_DOC = "https://open-meteo.com/en/docs/flood-api"
SIGNALS = ("rain_forecast_72h_mm", "regional_river_discharge_7d_peak_m3s")


def configured() -> tuple[bool, str]:
    if os.getenv("PULSO_HAZARD_FEED_ENABLED", "").lower() != "true":
        return False, "Licensed hazard feed is disabled."
    if not os.getenv("PULSO_OPEN_METEO_API_KEY") or not os.getenv("PULSO_HAZARD_LICENSE_REFERENCE"):
        return False, "Licensed provider key and recorded data-use authority are required."
    return True, ""


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _parse_hour(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def _grid_point(payload, latitude: float, longitude: float):
    grid_lat = payload.get("latitude")
    grid_lon = payload.get("longitude")
    if not isinstance(grid_lat, (int, float)) or not isinstance(grid_lon, (int, float)):
        raise ValueError("Provider omitted grid coordinates.")
    if not (-90 <= grid_lat <= 90 and -180 <= grid_lon <= 180):
        raise ValueError("Provider returned invalid grid coordinates.")
    # A coarse model point is context only; a very distant point is rejected.
    km = math.hypot((grid_lat - latitude) * 111, (grid_lon - longitude) * 107)
    if km > 15:
        raise ValueError("Provider selected a grid point more than 15 km from the requested area.")
    return float(grid_lat), float(grid_lon)


def parse_weather(payload: dict, now: datetime, latitude: float, longitude: float):
    if payload.get("error") or payload.get("hourly_units", {}).get("precipitation") != "mm":
        raise ValueError("Weather response lacks precipitation in millimeters.")
    hours = payload.get("hourly", {})
    times, values = hours.get("time", []), hours.get("precipitation", [])
    if len(times) != len(values):
        raise ValueError("Weather timestamps and values differ in length.")
    selected = []
    for raw_time, value in zip(times, values):
        at = _parse_hour(raw_time)
        if now - timedelta(hours=1) <= at < now + timedelta(hours=72):
            if not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                raise ValueError("Weather forecast contains a missing or invalid precipitation hour.")
            selected.append((at, float(value)))
    if len(selected) < 60:
        raise ValueError("Weather forecast has fewer than 60 usable hours.")
    grid_lat, grid_lon = _grid_point(payload, latitude, longitude)
    return dict(product="Open-Meteo best-match weather forecast", signal=SIGNALS[0], value=sum(value for _, value in selected),
                unit="mm", valid_from=selected[0][0], valid_to=selected[-1][0] + timedelta(hours=1),
                expires_at=now + timedelta(hours=6), grid_latitude=grid_lat, grid_longitude=grid_lon,
                source_resolution_km=None, documentation_url=WEATHER_DOC,
                limitation="Forecast grid rainfall for the selected barangay point; not observed street flooding or asset-level depth.",
                series=[{"at": at.isoformat(), "value": value} for at, value in selected])


def parse_flood(payload: dict, now: datetime, latitude: float, longitude: float):
    if payload.get("error") or payload.get("daily_units", {}).get("river_discharge") != "m³/s":
        raise ValueError("Flood response lacks river discharge in cubic meters per second.")
    days = payload.get("daily", {})
    times, values = days.get("time", []), days.get("river_discharge", [])
    if len(times) != len(values):
        raise ValueError("Flood timestamps and values differ in length.")
    selected = []
    for raw_date, value in zip(times, values):
        at = datetime.fromisoformat(raw_date).replace(tzinfo=timezone.utc)
        if now.date() <= at.date() < (now + timedelta(days=7)).date():
            if value is None:
                continue
            if not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                raise ValueError("Flood forecast contains an invalid river discharge.")
            selected.append((at, float(value)))
    if len(selected) < 5:
        raise ValueError("Flood forecast has fewer than five usable daily values.")
    grid_lat, grid_lon = _grid_point(payload, latitude, longitude)
    return dict(product="GloFAS v4 forecast via Open-Meteo", signal=SIGNALS[1], value=max(value for _, value in selected),
                unit="m³/s", valid_from=selected[0][0], valid_to=selected[-1][0] + timedelta(days=1),
                expires_at=now + timedelta(hours=24), grid_latitude=grid_lat, grid_longitude=grid_lon,
                source_resolution_km=5, documentation_url=FLOOD_DOC,
                limitation="Regional modeled river discharge at roughly 5 km scale. It does not identify a local drainage flood, water depth, or asset failure.",
                series=[{"at": at.isoformat(), "value": value} for at, value in selected])


def _locations(db: Session):
    areas = (db.query(models.Barangay).join(InfrastructureAsset, InfrastructureAsset.barangay_id == models.Barangay.id)
             .filter(InfrastructureAsset.registry_status == "verified", InfrastructureAsset.geom.isnot(None))
             .distinct().order_by(models.Barangay.id).all())
    for area in areas:
        geometry = area.geom
        if geometry is None:
            asset = (db.query(InfrastructureAsset).filter_by(barangay_id=area.id, registry_status="verified")
                     .filter(InfrastructureAsset.geom.isnot(None)).order_by(InfrastructureAsset.asset_id).first())
            geometry = asset.geom if asset else None
        if geometry is None:
            continue
        lat, lon = db.query(func.ST_Y(func.ST_PointOnSurface(geometry)),
                            func.ST_X(func.ST_PointOnSurface(geometry))).one()
        if 14.5 <= lat <= 14.85 and 120.85 <= lon <= 121.2:
            yield area.id, float(lat), float(lon)


def _fetch(client: httpx.Client, url: str, params: dict):
    response = client.get(url, params=params)
    response.raise_for_status()
    if len(response.content) > 2_000_000:
        raise ValueError("Provider response exceeds the configured size limit.")
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Provider response is not a JSON object.")
    return payload


def ingest_licensed_forecasts(db: Session, client: httpx.Client | None = None, now: datetime | None = None):
    enabled, reason = configured()
    if not enabled:
        return {"status": "disabled", "reason": reason}
    now = _utc(now or datetime.now(timezone.utc))
    if db.bind.dialect.name == "postgresql" and not db.execute(text("SELECT pg_try_advisory_xact_lock(176202691)")).scalar():
        return {"status": "already_running"}
    areas = list(_locations(db))
    if not areas:
        db.rollback()
        return {"status": "no_verified_locations", "barangays_seen": 0}
    own_client = client is None
    client = client or httpx.Client(timeout=httpx.Timeout(12.0), follow_redirects=False, trust_env=False)
    errors = []
    snapshots = 0
    key = os.environ["PULSO_OPEN_METEO_API_KEY"]
    license_ref = os.environ["PULSO_HAZARD_LICENSE_REFERENCE"]
    try:
        for barangay_id, latitude, longitude in areas:
            for url, parser, variables in (
                (WEATHER_URL, parse_weather, {"hourly": "precipitation", "forecast_hours": 72}),
                (FLOOD_URL, parse_flood, {"daily": "river_discharge", "forecast_days": 7, "models": "forecast_v4"}),
            ):
                signal = SIGNALS[0] if parser is parse_weather else SIGNALS[1]
                latest = (db.query(HazardSourceSnapshot).filter_by(barangay_id=barangay_id, signal=signal)
                          .order_by(HazardSourceSnapshot.fetched_at.desc()).first())
                if latest and _utc(latest.fetched_at) > now - timedelta(hours=3):
                    continue
                try:
                    payload = _fetch(client, url, {"latitude": latitude, "longitude": longitude,
                                                   "timezone": "GMT", "apikey": key, **variables})
                    normalized = parser(payload, now, latitude, longitude)
                    digest = sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
                    db.add(HazardSourceSnapshot(barangay_id=barangay_id, provider="Open-Meteo",
                                                fetched_at=now, requested_latitude=latitude,
                                                requested_longitude=longitude, license_reference=license_ref,
                                                payload_sha256=digest, **normalized))
                    snapshots += 1
                except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                    errors.append(f"{signal} for barangay {barangay_id}: {type(exc).__name__}")
        status = "completed" if not errors else "partial" if snapshots else "failed"
        db.add(HazardIngestionRun(started_at=now, finished_at=datetime.now(timezone.utc), status=status,
                                  barangays_seen=len(areas), snapshots_written=snapshots,
                                  error_summary="; ".join(errors)[:2000] if errors else None))
        db.commit()
        return {"status": status, "barangays_seen": len(areas), "snapshots_written": snapshots,
                "failed_signals": len(errors)}
    except Exception:
        db.rollback()
        raise
    finally:
        if own_client:
            client.close()


def latest_signal(db: Session, barangay_id: int, signal: str, at: datetime | None = None):
    at = _utc(at or datetime.now(timezone.utc))
    return (db.query(HazardSourceSnapshot).filter(
        HazardSourceSnapshot.barangay_id == barangay_id,
        HazardSourceSnapshot.signal == signal,
        HazardSourceSnapshot.fetched_at <= at)
        .order_by(HazardSourceSnapshot.fetched_at.desc(), HazardSourceSnapshot.id.desc()).first())
