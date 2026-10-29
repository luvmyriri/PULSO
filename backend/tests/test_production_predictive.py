"""Outcome and abstention gates for the production maintenance model."""
from datetime import datetime, date, timezone
from types import SimpleNamespace

import numpy as np
import pytest

from production_predictive import FEATURE_NAMES, assess_asset, build_labeled_rows, train_release


class Query:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *args):
        return self

    def filter_by(self, **kwargs):
        return self

    def order_by(self, *args):
        return self

    def all(self):
        return self.rows


class Database:
    def __init__(self, assets, outcomes, maintenance=(), hazards=()):
        self.assets, self.outcomes, self.maintenance, self.hazards = assets, outcomes, maintenance, hazards

    def query(self, entity):
        from gov_models import InfrastructureAsset, AssetInspectionOutcome, MaintenanceHistory, HazardSourceSnapshot
        if entity is InfrastructureAsset:
            return Query(self.assets)
        if entity is AssetInspectionOutcome:
            return Query(self.outcomes)
        if entity is MaintenanceHistory:
            return Query(self.maintenance)
        if entity is HazardSourceSnapshot:
            return Query(self.hazards)
        raise AssertionError(entity)


def observation(id, year, month, day, defect, score=75):
    return SimpleNamespace(id=id, asset_id="FAKE-DRAIN-1", observed_at=datetime(year, month, day, tzinfo=timezone.utc),
                           defect_found=defect, severity="major" if defect else None,
                           condition_score=score, review_status="verified")


def test_verified_defect_and_observed_no_defect_become_distinct_labels():
    asset = SimpleNamespace(asset_id="FAKE-DRAIN-1", date_completed=date(2020, 1, 1), category="Drainage", barangay_id=1)
    events = [observation(1, 2025, 1, 1, False), observation(2, 2025, 2, 1, True),
              observation(3, 2025, 5, 1, False), observation(4, 2025, 8, 5, False)]
    rows, report = build_labeled_rows(Database([asset], events), "Drainage", datetime(2026, 1, 1, tzinfo=timezone.utc))
    assert [row["y"] for row in rows] == [1, 0]
    assert report["labeled_windows"] == 2
    assert len(rows[0]["x"]) == len(FEATURE_NAMES)


def test_hazard_features_use_only_snapshots_available_at_baseline():
    asset = SimpleNamespace(asset_id="FAKE-DRAIN-1", date_completed=date(2020, 1, 1), category="Drainage", barangay_id=1)
    events = [observation(1, 2025, 1, 1, False), observation(2, 2025, 2, 1, True),
              observation(3, 2025, 5, 1, False), observation(4, 2025, 8, 5, False)]
    hazards = [SimpleNamespace(id=index, barangay_id=1, signal=signal, value=value,
                               fetched_at=datetime(2024, 12, 31, tzinfo=timezone.utc),
                               expires_at=datetime(2025, 1, 2, tzinfo=timezone.utc))
               for index, (signal, value) in enumerate((('rain_forecast_72h_mm', 12),
                                                         ('regional_river_discharge_7d_peak_m3s', 3)), start=1)]
    hazards.append(SimpleNamespace(id=3, barangay_id=1, signal='rain_forecast_72h_mm', value=900,
                                   fetched_at=datetime(2025, 2, 1, tzinfo=timezone.utc),
                                   expires_at=datetime(2025, 2, 2, tzinfo=timezone.utc)))
    rows, coverage = build_labeled_rows(Database([asset], events, hazards=hazards), "Drainage",
                                        datetime(2026, 1, 1, tzinfo=timezone.utc))
    assert rows[0]["x"][-2:].tolist() == [12, 3]
    assert rows[0]["hazard_complete"] is True
    assert coverage["hazard_complete_windows"] == 1


def test_unverified_asset_abstains_without_loading_a_model():
    asset = SimpleNamespace(registry_status="candidate", maintenance_authority=None, geom=None)
    assert assess_asset(None, asset)["status"] == "insufficient_data"


def test_no_release_can_be_built_without_owner_policy(tmp_path):
    with pytest.raises(ValueError, match="release policy"):
        train_release(None, "Drainage", {}, tmp_path / "release")
    assert not (tmp_path / "release").exists()


def test_calibrated_inference_uses_only_approved_release_and_current_inspection(monkeypatch):
    monkeypatch.setenv("PULSO_HAZARD_FEED_ENABLED", "true")
    monkeypatch.setenv("PULSO_OPEN_METEO_API_KEY", "FAKE-TEST-KEY")
    monkeypatch.setenv("PULSO_HAZARD_LICENSE_REFERENCE", "FAKE approval")
    asset = SimpleNamespace(asset_id="FAKE-DRAIN-1", registry_status="verified", maintenance_authority="City Engineering",
                            geom=object(), category="Drainage", barangay_id=1, date_completed=date(2020, 1, 1))
    baseline = observation(1, 2026, 1, 1, False)
    hazards = [SimpleNamespace(id=index, signal=signal, value=value, barangay_id=1,
                               fetched_at=datetime(2025, 12, 31, tzinfo=timezone.utc),
                               expires_at=datetime(2026, 1, 2, tzinfo=timezone.utc))
               for index, (signal, value) in enumerate((('rain_forecast_72h_mm', 12),
                                                         ('regional_river_discharge_7d_peak_m3s', 3)), start=1)]
    db = Database([asset], [baseline], hazards=hazards)
    monkeypatch.setattr('production_predictive.latest_signal', lambda db, barangay_id, signal, at: next(row for row in hazards if row.signal == signal))
    class Booster:
        def predict(self, x):
            assert x.shape == (1, len(FEATURE_NAMES))
            return np.array([0.5])
    manifest = dict(category="Drainage", policy={"approved_barangay_ids": [1]}, calibration_coefficient=1.0, calibration_intercept=0.0,
                    model_sha256="f" * 64)
    result = assess_asset(db, asset, (manifest, Booster()), datetime(2026, 1, 5, tzinfo=timezone.utc))
    assert result["status"] == "available"
    assert 0 < result["probability"] < 1
    assert result["horizon_days"] == 90
    stale = assess_asset(db, asset, (manifest, Booster()), datetime(2026, 1, 15, tzinfo=timezone.utc))
    assert stale["status"] == "stale_inspection"
