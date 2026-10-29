"""Licensed weather/flood adapter: provider validation and private persistence."""
from datetime import datetime, timedelta, timezone

from geoalchemy2.elements import WKTElement
import pytest

import hazard_feeds
from gov_models import HazardSourceSnapshot, InfrastructureAsset
import models


def weather_payload(now):
    return {"latitude": 14.72, "longitude": 121.04, "hourly_units": {"precipitation": "mm"},
            "hourly": {"time": [(now + timedelta(hours=hour)).strftime("%Y-%m-%dT%H:00") for hour in range(72)],
                       "precipitation": [1.0] * 72}}


def flood_payload(now):
    return {"latitude": 14.72, "longitude": 121.04, "daily_units": {"river_discharge": "m³/s"},
            "daily": {"time": [(now + timedelta(days=day)).date().isoformat() for day in range(7)],
                      "river_discharge": [float(day + 1) for day in range(7)]}}


def test_forecast_parsers_preserve_units_time_and_limitations():
    now = datetime(2026, 10, 29, 0, tzinfo=timezone.utc)
    rain = hazard_feeds.parse_weather(weather_payload(now), now, 14.72, 121.04)
    river = hazard_feeds.parse_flood(flood_payload(now), now, 14.72, 121.04)
    assert rain["value"] == 72 and rain["unit"] == "mm"
    assert river["value"] == 7 and river["unit"] == "m³/s"
    assert "not observed street flooding" in rain["limitation"]
    assert river["source_resolution_km"] == 5
    bad = weather_payload(now)
    bad["latitude"] = 10.0
    with pytest.raises(ValueError, match="grid point"):
        hazard_feeds.parse_weather(bad, now, 14.72, 121.04)


def test_ingestion_is_disabled_without_licensed_configuration(clean_postgis, monkeypatch):
    monkeypatch.delenv("PULSO_HAZARD_FEED_ENABLED", raising=False)
    with clean_postgis() as db:
        assert hazard_feeds.ingest_licensed_forecasts(db)["status"] == "disabled"


def test_licensed_ingestion_uses_verified_location_and_persists_source(clean_postgis, monkeypatch):
    now = datetime(2026, 10, 29, 0, tzinfo=timezone.utc)
    monkeypatch.setenv("PULSO_HAZARD_FEED_ENABLED", "true")
    monkeypatch.setenv("PULSO_OPEN_METEO_API_KEY", "FAKE-TEST-KEY")
    monkeypatch.setenv("PULSO_HAZARD_LICENSE_REFERENCE", "FAKE data-use approval")
    with clean_postgis() as db:
        db.add(models.District(id=1, name="FAKE district", code="FAKE1"))
        db.flush()
        db.add(models.Barangay(id=1, name="FAKE area", district_id=1))
        db.add(InfrastructureAsset(asset_id="FAKE-HZ-1", asset_name="FAKE drain", category="Drainage",
                                   barangay_id=1, registry_status="verified", maintenance_authority="FAKE City",
                                   geom=WKTElement("POINT(121.04 14.72)", srid=4326)))
        db.commit()

        class Response:
            def __init__(self, payload):
                self.payload = payload
                self.content = b"{}"
            def raise_for_status(self):
                return None
            def json(self):
                return self.payload
        class Client:
            def get(self, url, params):
                assert params["apikey"] == "FAKE-TEST-KEY"
                return Response(weather_payload(now) if "forecast" in url else flood_payload(now))
        result = hazard_feeds.ingest_licensed_forecasts(db, client=Client(), now=now)
        assert result == {"status": "completed", "barangays_seen": 1, "snapshots_written": 2, "failed_signals": 0}
        rows = db.query(HazardSourceSnapshot).all()
        assert {row.signal for row in rows} == set(hazard_feeds.SIGNALS)
        assert all(row.license_reference == "FAKE data-use approval" for row in rows)
        assert all("FAKE-TEST-KEY" not in str(row.series) for row in rows)
