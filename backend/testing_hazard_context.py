"""Opt-in, noncommercial evaluation forecasts; never written to model inputs."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import os
from threading import Lock

import httpx

from hazard_feeds import _fetch, parse_weather, parse_flood

_cache = {}
_lock = Lock()


def enabled():
    return os.getenv("PULSO_PREDICTIVE_TESTING", "").lower() == "true"


def forecast_context(latitude, longitude, client=None, now=None):
    if not enabled():
        return dict(status="disabled", reason="Evaluation weather is not enabled on this installation.")
    # Only the supported city envelope; coordinates always come from scoped assets.
    if not (14.5 <= latitude <= 14.85 and 120.85 <= longitude <= 121.2):
        return dict(status="insufficient_location", reason="A recorded Caloocan location is required.")
    now = now or datetime.now(timezone.utc)
    point = (round(latitude, 2), round(longitude, 2))
    # One fetch per rounded area per hour, including provider failures.
    with _lock:
        previous = _cache.get(point)
        if previous and previous[0] > now:
            return deepcopy(previous[1])
        own_client = client is None
        client = client or httpx.Client(timeout=8, follow_redirects=False, trust_env=False)
        signals = []
        try:
            for url, parser, params, signal in (
                ("https://api.open-meteo.com/v1/forecast", parse_weather,
                 {"hourly": "precipitation", "forecast_hours": 72}, "rain_forecast_72h_mm"),
                ("https://flood-api.open-meteo.com/v1/flood", parse_flood,
                 {"daily": "river_discharge", "forecast_days": 7, "models": "forecast_v4"},
                 "regional_river_discharge_7d_peak_m3s"),
            ):
                try:
                    payload = _fetch(client, url, {"latitude": point[0], "longitude": point[1], "timezone": "GMT", **params})
                    normalized = parser(payload, now, *point)
                    signals.append(dict(status="current", fetched_at=now.isoformat(), **normalized))
                except (httpx.HTTPError, ValueError, KeyError, TypeError):
                    signals.append(dict(status="unavailable", signal=signal,
                                        reason="Provider data is unavailable or has insufficient coverage for this location."))
        finally:
            if own_client:
                client.close()
        result = dict(status="available" if all(s["status"] == "current" for s in signals) else "partial",
                      mode="testing", requested_latitude=point[0], requested_longitude=point[1],
                      fetched_at=now.isoformat(), signals=signals,
                      attribution="Weather data by Open-Meteo.com · CC BY 4.0 · noncommercial evaluation",
                      source_url="https://open-meteo.com/", expires_at=(now + timedelta(hours=1)).isoformat(),
                      limitation="Testing context uses an unverified asset location rounded to an area point. Forecasts are modeled data, not observed flooding or a calibrated failure probability.")
        if len(_cache) >= 200:
            _cache.clear()
        _cache[point] = (now + timedelta(hours=1), result)
        return deepcopy(result)
