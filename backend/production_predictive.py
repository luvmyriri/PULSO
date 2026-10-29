"""Offline, outcome-based maintenance model and fail-closed production inference.

This module never fits a model while serving an HTTP request. An artifact is
published only when a separately approved release policy passes a future holdout.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from functools import lru_cache
import json
import math
import os
from pathlib import Path

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from gov_models import AssetInspectionOutcome, AssetModelAssessment, AssetModelRun, HazardSourceSnapshot, InfrastructureAsset, MaintenanceHistory
from hazard_feeds import SIGNALS, configured as hazard_configured, latest_signal

HORIZON_DAYS = 90
FOLLOWUP_DAYS = 120
MAX_BASELINE_AGE_DAYS = 7
FEATURE_NAMES = (
    "condition_score_at_inspection",
    "asset_age_years",
    "days_since_maintenance",
    "maintenance_count_365d",
    "prior_verified_defects_365d",
    "prior_verified_inspections_365d",
    "days_since_previous_inspection",
    "forecast_rainfall_next_72h_mm",
    "regional_river_discharge_next_7d_peak_m3s",
)


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _available_at(observation) -> datetime:
    """A field result becomes model evidence only after independent review."""
    return _utc(getattr(observation, "reviewed_at", None) or observation.observed_at)


def _hazard_at(snapshots, at):
    available = {}
    for row in snapshots:
        fetched = _utc(row.fetched_at)
        expires = _utc(row.expires_at)
        if fetched <= at < expires and row.signal in SIGNALS:
            if row.signal not in available or fetched > _utc(available[row.signal].fetched_at):
                available[row.signal] = row
    return available


def _features(asset, baseline, prior, maintenance, hazards=None):
    at = _available_at(baseline)
    past_work = [row for row in maintenance if row.completion_date and row.completion_date <= at.date()]
    recent_work = [row for row in past_work if (at.date() - row.completion_date).days <= 365]
    previous = [row for row in prior if _available_at(row) < at]
    recent_inspections = [row for row in previous if (at - _available_at(row)).days <= 365]
    last_work = max((row.completion_date for row in past_work), default=None)
    last_inspection = max((_available_at(row) for row in previous), default=None)
    completed = asset.date_completed
    age = (at.date() - completed).days / 365.25 if completed and completed <= at.date() else math.nan
    return np.array([
        float(baseline.condition_score) if baseline.condition_score is not None else math.nan,
        age,
        float((at.date() - last_work).days) if last_work else math.nan,
        float(len(recent_work)),
        float(sum(row.defect_found for row in recent_inspections)),
        float(len(recent_inspections)),
        float((at - last_inspection).days) if last_inspection else math.nan,
        float(hazards[SIGNALS[0]].value) if hazards and SIGNALS[0] in hazards else math.nan,
        float(hazards[SIGNALS[1]].value) if hazards and SIGNALS[1] in hazards else math.nan,
    ], dtype=np.float64)


def build_labeled_rows(db: Session, category: str, now: datetime | None = None,
                       approved_barangay_ids: list[int] | None = None):
    """One matured, no-defect baseline per non-overlapping 90-day asset window.

    A negative needs a verified no-defect follow-up 90–120 days later and no
    recorded maintenance in the target window. Unobserved windows are censored.
    """
    now = _utc(now or datetime.now(timezone.utc))
    query = db.query(InfrastructureAsset).filter(
        InfrastructureAsset.category == category,
        InfrastructureAsset.registry_status == "verified",
    )
    if approved_barangay_ids is not None:
        query = query.filter(InfrastructureAsset.barangay_id.in_(approved_barangay_ids))
    assets = query.order_by(InfrastructureAsset.asset_id).all()
    observations = db.query(AssetInspectionOutcome).filter(
        AssetInspectionOutcome.review_status == "verified",
        AssetInspectionOutcome.asset_id.in_([a.asset_id for a in assets]),
    ).order_by(AssetInspectionOutcome.observed_at, AssetInspectionOutcome.id).all() if assets else []
    work = db.query(MaintenanceHistory).filter(MaintenanceHistory.asset_id.in_([a.asset_id for a in assets])).all() if assets else []
    area_ids = sorted({asset.barangay_id for asset in assets if asset.barangay_id is not None})
    hazard_rows = db.query(HazardSourceSnapshot).filter(HazardSourceSnapshot.barangay_id.in_(area_ids)).all() if area_ids else []
    by_asset = defaultdict(list)
    work_by_asset = defaultdict(list)
    hazard_by_area = defaultdict(list)
    for row in observations:
        by_asset[row.asset_id].append(row)
    for history in by_asset.values():
        history.sort(key=lambda row: (_available_at(row), row.id))
    for row in work:
        work_by_asset[row.asset_id].append(row)
    for row in hazard_rows:
        hazard_by_area[row.barangay_id].append(row)
    rows = []
    censored = 0
    for asset in assets:
        history = by_asset[asset.asset_id]
        maintenance = work_by_asset[asset.asset_id]
        last_baseline = None
        for index, baseline in enumerate(history):
            at = _available_at(baseline)
            if baseline.defect_found or baseline.condition_score is None or at + timedelta(days=FOLLOWUP_DAYS) > now:
                continue
            if last_baseline and at < last_baseline + timedelta(days=HORIZON_DAYS):
                continue
            future = [row for row in history[index + 1:] if at < _available_at(row) <= at + timedelta(days=FOLLOWUP_DAYS)
                      and _utc(row.observed_at) > at]
            future_defects = [row for row in future if row.defect_found and _available_at(row) <= at + timedelta(days=HORIZON_DAYS)]
            positive = bool(future_defects)
            critical = any(row.severity in {"major", "critical"} for row in future_defects)
            followup = any(not row.defect_found and at + timedelta(days=HORIZON_DAYS) <= _available_at(row) <= at + timedelta(days=FOLLOWUP_DAYS) for row in future)
            intervened = any(row.completion_date and at.date() < row.completion_date <= (at + timedelta(days=HORIZON_DAYS)).date() for row in maintenance)
            if not positive and (not followup or intervened):
                censored += 1
                continue
            hazards = _hazard_at(hazard_by_area[asset.barangay_id], at)
            rows.append(dict(asset_id=asset.asset_id, barangay_id=asset.barangay_id,
                             as_of=at, x=_features(asset, baseline, history[:index], maintenance, hazards),
                             hazard_complete=len(hazards) == len(SIGNALS),
                             hazard_sources={signal: {"id": source.id,
                                                      "payload_sha256": getattr(source, "payload_sha256", None),
                                                      "fetched_at": _utc(source.fetched_at).isoformat()}
                                             for signal, source in hazards.items()},
                             y=int(positive), critical=int(critical)))
            last_baseline = at
    rows.sort(key=lambda row: (row["as_of"], row["asset_id"]))
    return rows, dict(assets=len(assets), verified_observations=len(observations), labeled_windows=len(rows),
                      hazard_complete_windows=sum(row["hazard_complete"] for row in rows), censored_windows=censored)


def _split_forward(rows):
    dates = sorted({row["as_of"].date() for row in rows})
    if len(dates) < 6:
        raise ValueError("At least six distinct inspection dates are required for forward training, calibration and holdout.")
    first = dates[int(len(dates) * 0.6)]
    second = dates[int(len(dates) * 0.8)]
    train = [row for row in rows if row["as_of"].date() < first]
    calibration = [row for row in rows if first <= row["as_of"].date() < second]
    holdout = [row for row in rows if row["as_of"].date() >= second]
    return train, calibration, holdout


def _array(rows):
    return np.vstack([row["x"] for row in rows]), np.array([row["y"] for row in rows], dtype=np.int32)


def _precision_at_k(y, scores, k):
    order = np.argsort(-scores, kind="stable")[:min(k, len(y))]
    return float(np.mean(y[order])) if len(order) else 0.0


def train_release(db: Session, category: str, policy: dict, output_dir: Path, now: datetime | None = None):
    """Train and publish only if policy and chronological holdout gates pass."""
    import lightgbm as lgb
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import brier_score_loss

    required = {"approved_by", "approval_reference", "approved_barangay_ids", "inspection_capacity", "minimum_hazard_coverage", "minimum_train_events",
                "minimum_calibration_events", "minimum_holdout_events", "minimum_top_k_precision",
                "minimum_lift_over_condition_baseline", "minimum_hazard_incremental_precision", "maximum_brier",
                "minimum_critical_holdout_events", "maximum_critical_miss_rate"}
    missing = required - policy.keys()
    if missing or any(not isinstance(policy.get(key), str) or not policy[key].strip() or policy[key].strip().lower() in {"none", "null", "pending", "tbd"} for key in ("approved_by", "approval_reference")):
        raise ValueError(f"A signed operational release policy is required; missing: {', '.join(sorted(missing)) or 'approval identity'}.")
    k = int(policy["inspection_capacity"])
    if k < 1:
        raise ValueError("Inspection capacity must be positive.")
    areas = policy["approved_barangay_ids"]
    if not isinstance(areas, list) or not areas or any(not isinstance(area, int) or area < 1 for area in areas):
        raise ValueError("Release policy must name approved barangay IDs.")
    if any(int(policy[key]) < 1 for key in ("minimum_train_events", "minimum_calibration_events", "minimum_holdout_events", "minimum_critical_holdout_events")):
        raise ValueError("Every event-count release gate must be positive.")
    if not 0 <= float(policy["minimum_top_k_precision"]) <= 1 or not 0 < float(policy["maximum_brier"]) <= 1:
        raise ValueError("Precision and Brier release gates must be probabilities between zero and one.")
    if not 0 < float(policy["minimum_lift_over_condition_baseline"]) <= 1 or not 0 <= float(policy["maximum_critical_miss_rate"]) < 1:
        raise ValueError("Lift must be positive and the critical-miss gate must be below one.")
    if not 0 < float(policy["minimum_hazard_incremental_precision"]) <= 1:
        raise ValueError("Hazard inputs must show a pre-registered positive gain over the same model without them.")
    required_coverage = float(policy["minimum_hazard_coverage"])
    if not 0.8 <= required_coverage <= 1:
        raise ValueError("Hazard snapshot coverage gate must be at least 80% of each split.")
    rows, coverage = build_labeled_rows(db, category, now, areas)
    train, calibration, holdout = _split_forward(rows)
    for name, group, minimum in (("training", train, int(policy["minimum_train_events"])),
                                  ("calibration", calibration, int(policy["minimum_calibration_events"])),
                                  ("holdout", holdout, int(policy["minimum_holdout_events"]))):
        labels = [row["y"] for row in group]
        if min(sum(labels), len(labels) - sum(labels)) < minimum:
            raise ValueError(f"{name} requires at least {minimum} verified positive and negative outcomes; got {sum(labels)} positive and {len(labels)-sum(labels)} negative.")
        if sum(row["hazard_complete"] for row in group) / len(group) < required_coverage:
            raise ValueError(f"{name} lacks the approved as-of rainfall and river-discharge snapshot coverage.")
    x_train, y_train = _array(train)
    x_cal, y_cal = _array(calibration)
    x_test, y_test = _array(holdout)
    clf = lgb.LGBMClassifier(n_estimators=150, max_depth=4, num_leaves=12,
                             learning_rate=0.05, min_child_samples=10,
                             random_state=42, deterministic=True, force_col_wise=True,
                             n_jobs=1, verbose=-1)
    clf.fit(x_train, y_train)
    raw_cal = clf.predict_proba(x_cal)[:, 1]
    raw_test = clf.predict_proba(x_test)[:, 1]
    calibration_model = LogisticRegression(C=1.0, random_state=42)
    calibration_model.fit(raw_cal.reshape(-1, 1), y_cal)
    probabilities = calibration_model.predict_proba(raw_test.reshape(-1, 1))[:, 1]
    no_hazard = lgb.LGBMClassifier(n_estimators=150, max_depth=4, num_leaves=12,
                                   learning_rate=0.05, min_child_samples=10,
                                   random_state=42, deterministic=True, force_col_wise=True,
                                   n_jobs=1, verbose=-1)
    no_hazard.fit(x_train[:, :-2], y_train)
    no_hazard_cal = LogisticRegression(C=1.0, random_state=42)
    no_hazard_cal.fit(no_hazard.predict_proba(x_cal[:, :-2])[:, 1].reshape(-1, 1), y_cal)
    no_hazard_scores = no_hazard_cal.predict_proba(
        no_hazard.predict_proba(x_test[:, :-2])[:, 1].reshape(-1, 1))[:, 1]
    brier = float(brier_score_loss(y_test, probabilities))
    precision = _precision_at_k(y_test, probabilities, k)
    no_hazard_precision = _precision_at_k(y_test, no_hazard_scores, k)
    hazard_incremental_precision = precision - no_hazard_precision
    baseline = _precision_at_k(y_test, -x_test[:, 0], k)
    lift = precision - baseline
    chosen = set(np.argsort(-probabilities, kind="stable")[:min(k, len(y_test))].tolist())
    critical = [index for index, row in enumerate(holdout) if row["critical"]]
    critical_miss_rate = sum(index not in chosen for index in critical) / len(critical) if critical else None
    by_area = {}
    for area in sorted(set(row["barangay_id"] for row in holdout)):
        indexes = [index for index, row in enumerate(holdout) if row["barangay_id"] == area]
        by_area[str(area)] = dict(rows=len(indexes), events=int(y_test[indexes].sum()),
                                  brier=float(brier_score_loss(y_test[indexes], probabilities[indexes])))
    metrics = dict(holdout_brier=brier, top_k_precision=precision,
                   condition_baseline_top_k_precision=baseline, absolute_precision_lift=lift,
                   no_hazard_top_k_precision=no_hazard_precision,
                   hazard_incremental_top_k_precision=hazard_incremental_precision,
                   critical_holdout_events=len(critical), critical_miss_rate=critical_miss_rate,
                   by_barangay=by_area,
                   training_rows=len(train), calibration_rows=len(calibration), holdout_rows=len(holdout),
                   hazard_coverage_by_split={name: sum(row["hazard_complete"] for row in group) / len(group)
                                             for name, group in (("training", train), ("calibration", calibration), ("holdout", holdout))},
                   training_events=int(y_train.sum()), calibration_events=int(y_cal.sum()),
                   holdout_events=int(y_test.sum()), coverage=coverage)
    if (precision < float(policy["minimum_top_k_precision"]) or
            lift < float(policy["minimum_lift_over_condition_baseline"]) or
            hazard_incremental_precision < float(policy["minimum_hazard_incremental_precision"]) or
            brier > float(policy["maximum_brier"]) or
            len(critical) < int(policy["minimum_critical_holdout_events"]) or
            (critical_miss_rate is not None and critical_miss_rate > float(policy["maximum_critical_miss_rate"]))):
        raise ValueError(f"The future holdout failed the approved release gates: {json.dumps(metrics, sort_keys=True)}")
    if output_dir.exists():
        raise FileExistsError("Release directory already exists; model artifacts are immutable.")
    snapshot = [{"asset_id": row["asset_id"], "barangay_id": row["barangay_id"],
                 "as_of": row["as_of"].isoformat(), "features": [None if not math.isfinite(float(value)) else float(value) for value in row["x"]],
                 "label": row["y"], "critical": row["critical"], "hazard_sources": row["hazard_sources"]} for row in rows]
    dataset_digest = sha256(json.dumps(snapshot, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    output_dir.mkdir(parents=True)
    model_path = output_dir / "model.txt"
    clf.booster_.save_model(str(model_path))
    digest = sha256(model_path.read_bytes()).hexdigest()
    manifest = dict(status="approved_by_policy", category=category, horizon_days=HORIZON_DAYS,
                    feature_names=list(FEATURE_NAMES), model_sha256=digest,
                    calibration_coefficient=float(calibration_model.coef_[0, 0]),
                    calibration_intercept=float(calibration_model.intercept_[0]),
                    policy=policy, metrics=metrics, trained_at=datetime.now(timezone.utc).isoformat(),
                    data_cutoff=max(row["as_of"] for row in rows).isoformat(),
                    training_dataset_sha256=dataset_digest)
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    return manifest


def load_release(path: str | None = None):
    """Load a pinned release; never train or substitute an experimental model."""
    path = path or os.getenv("PULSO_PREDICTIVE_ARTIFACT")
    if not path:
        return None
    return _load_release_cached(str(Path(path).resolve()))


@lru_cache(maxsize=4)
def _load_release_cached(path: str):
    import lightgbm as lgb
    root = Path(path)
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    model_path = root / "model.txt"
    if (manifest.get("status") != "approved_by_policy" or manifest.get("horizon_days") != HORIZON_DAYS or
            manifest.get("feature_names") != list(FEATURE_NAMES) or not manifest.get("training_dataset_sha256")):
        raise ValueError("Predictive artifact contract is unsupported.")
    if sha256(model_path.read_bytes()).hexdigest() != manifest.get("model_sha256"):
        raise ValueError("Predictive artifact checksum does not match its manifest.")
    return manifest, lgb.Booster(model_file=str(model_path))


def assess_asset(db: Session, asset: InfrastructureAsset, release=None, now: datetime | None = None):
    now = _utc(now or datetime.now(timezone.utc))
    if asset.registry_status != "verified" or not asset.maintenance_authority or asset.geom is None:
        return dict(status="insufficient_data", reason="Asset registry, maintainer or geometry is not verified.")
    release = release if release is not None else load_release()
    if not release:
        return dict(status="model_unavailable", reason="No approved predictive model is configured.")
    manifest, booster = release
    source_enabled, source_reason = hazard_configured()
    if not source_enabled:
        return dict(status="stale_source", reason=source_reason)
    if asset.category != manifest["category"]:
        return dict(status="out_of_scope", reason="This asset class has no approved model.")
    if asset.barangay_id not in manifest["policy"]["approved_barangay_ids"]:
        return dict(status="out_of_scope", reason="This barangay is outside the approved model cohort.")
    history = db.query(AssetInspectionOutcome).filter_by(asset_id=asset.asset_id, review_status="verified").all()
    history.sort(key=lambda row: (_available_at(row), row.id))
    baseline = history[-1] if history else None
    if not baseline or baseline.defect_found or baseline.condition_score is None:
        return dict(status="insufficient_data", reason="A recent verified no-defect inspection with condition is required.")
    at = _available_at(baseline)
    if at > now or at + timedelta(days=MAX_BASELINE_AGE_DAYS) < now:
        return dict(status="stale_inspection", reason="A new verified baseline inspection is required after seven days.")
    work = db.query(MaintenanceHistory).filter_by(asset_id=asset.asset_id).all()
    hazard_rows = [latest_signal(db, asset.barangay_id, signal, at) for signal in SIGNALS]
    hazards = _hazard_at([row for row in hazard_rows if row], at)
    if len(hazards) != len(SIGNALS):
        return dict(status="insufficient_data", reason="Licensed rainfall and regional river forecast snapshots were unavailable when the baseline was verified.")
    x = _features(asset, baseline, history[:-1], work, hazards)
    raw = float(booster.predict(x.reshape(1, -1))[0])
    logit = manifest["calibration_coefficient"] * raw + manifest["calibration_intercept"]
    probability = 1.0 / (1.0 + math.exp(-logit))
    return dict(status="available", asset_id=asset.asset_id, target="new verified actionable defect",
                horizon_days=HORIZON_DAYS, prediction_window_start=at.isoformat(),
                prediction_window_end=(at + timedelta(days=HORIZON_DAYS)).isoformat(),
                probability=round(probability, 4), inspection_id=baseline.id,
                weather_snapshot_id=hazards[SIGNALS[0]].id, flood_snapshot_id=hazards[SIGNALS[1]].id,
                model_sha256=manifest["model_sha256"], as_of=now.isoformat(),
                limitation="Advisory likelihood for the 90 days after the verified inspection; it is not a rolling 90-day forecast. An engineer decides inspection and work.")


def score_batch(db: Session, now: datetime | None = None):
    """Atomically refresh the approved cohort; keep the previous snapshot on failure."""
    now = _utc(now or datetime.now(timezone.utc))
    release = load_release()
    if not release:
        return dict(status="unavailable", reason="No approved predictive artifact is configured.")
    manifest, _ = release
    digest = manifest["model_sha256"]
    try:
        if db.bind.dialect.name == "postgresql":
            acquired = db.execute(text("SELECT pg_try_advisory_xact_lock(176202690)" )).scalar()
            if not acquired:
                return dict(status="already_running", reason="A predictive scoring run is already active.")
        run = AssetModelRun(model_sha256=digest, started_at=now, status="running")
        db.add(run)
        db.flush()
        assets = db.query(InfrastructureAsset).filter(
            InfrastructureAsset.category == manifest["category"],
            InfrastructureAsset.barangay_id.in_(manifest["policy"]["approved_barangay_ids"]),
            InfrastructureAsset.registry_status == "verified",
        ).order_by(InfrastructureAsset.asset_id).all()
        scored = 0
        for asset in assets:
            result = assess_asset(db, asset, release, now)
            row = db.query(AssetModelAssessment).filter_by(asset_id=asset.asset_id, model_sha256=digest).first()
            if row is None:
                row = AssetModelAssessment(asset_id=asset.asset_id, model_sha256=digest)
                db.add(row)
            row.status = result["status"]
            row.reason = result.get("reason")
            row.inspection_id = result.get("inspection_id")
            row.weather_snapshot_id = result.get("weather_snapshot_id")
            row.flood_snapshot_id = result.get("flood_snapshot_id")
            row.probability = result.get("probability")
            row.generated_at = now
            row.valid_until = datetime.fromisoformat(result["prediction_window_end"]) if result["status"] == "available" else None
            scored += result["status"] == "available"
        run.status = "completed"
        run.finished_at = datetime.now(timezone.utc)
        run.assets_seen = len(assets)
        run.assets_scored = scored
        db.commit()
        return dict(status="completed", model_sha256=digest, assets_seen=len(assets), assets_scored=scored,
                    skipped=len(assets) - scored, finished_at=run.finished_at.isoformat())
    except Exception as exc:
        db.rollback()
        db.add(AssetModelRun(model_sha256=digest, started_at=now,
                             finished_at=datetime.now(timezone.utc), status="failed",
                             error_summary=f"{type(exc).__name__}: {str(exc)[:400]}"))
        db.commit()
        raise
