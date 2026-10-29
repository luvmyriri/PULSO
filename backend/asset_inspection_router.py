"""Independently reviewed asset observations for maintenance evidence and labels."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from io import BytesIO
from io import StringIO
import csv
import json
import os
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Response, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, model_validator
from geoalchemy2.elements import WKTElement
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from auth import get_current_user
from database import get_db
from government_access import LEADERS, can, require_asset_scope, scoped_assets
from gov_models import AssetInspectionEvidence, AssetInspectionOutcome, AssetModelAssessment, AssetModelRun, HazardIngestionRun, InfrastructureAsset
import gov_crud
import models
from operational_roles import canonical_role
from production_predictive import MAX_BASELINE_AGE_DAYS, load_release
from hazard_feeds import SIGNALS, configured as hazard_configured, latest_signal
from noah_flood import asset_exposure
from testing_hazard_context import enabled as testing_enabled, forecast_context

router = APIRouter(prefix="/api/gov/predictive", tags=["predictive"])
INSPECTOR_ROLES = {"building_inspector", "architect", "project_engineer", "asst_city_engineer",
                   "city_engineer", "manager", "electrical_inspector", "mechanical_inspector"}
EVIDENCE_ROOT = Path(os.getenv("PUBLICATION_FILE_DIR", Path(__file__).parent / "private_publications")) / "asset_inspections"
MAX_EVIDENCE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {"PNG": (".png", "image/png"), "JPEG": (".jpg", "image/jpeg"), "WEBP": (".webp", "image/webp")}


def _testing_access(user):
    _require_staff(user)
    if not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")


@router.get("/testing/progress")
def testing_progress(export: bool = False, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _testing_access(user)
    assets = scoped_assets(db.query(InfrastructureAsset), user)
    ids = assets.with_entities(InfrastructureAsset.asset_id).subquery()
    metrics = {
        "Recorded assets": assets.count(),
        "Assets with recorded locations": assets.filter(InfrastructureAsset.geom.isnot(None)).count(),
        "Assets with condition scores": assets.filter(InfrastructureAsset.condition_score.isnot(None)).count(),
        "Assets with maintenance history": assets.filter(InfrastructureAsset.maintenance_logs.any()).count(),
        "Verified registry assets": assets.filter(InfrastructureAsset.registry_status == "verified").count(),
        "Recorded inspection outcomes": db.query(AssetInspectionOutcome).filter(AssetInspectionOutcome.asset_id.in_(select(ids.c.asset_id))).count(),
        "Verified inspection outcomes": db.query(AssetInspectionOutcome).filter(AssetInspectionOutcome.asset_id.in_(select(ids.c.asset_id)), AssetInspectionOutcome.review_status == "verified").count(),
    }
    now = datetime.now(timezone.utc).isoformat()
    if export:
        stream = StringIO(newline="")
        writer = csv.writer(stream)
        writer.writerow(["Metric", "Count", "Scope", "Checked at UTC", "Data status"])
        for name, count in metrics.items():
            writer.writerow([name, count, "Authorized asset scope", now, "Testing; recorded assets may be unverified"])
        return Response("\ufeff" + stream.getvalue(), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": 'attachment; filename="PULSO_Testing_Data_Progress.csv"', "Cache-Control": "private, no-store"})
    return dict(mode="testing" if testing_enabled() else "recorded", weather_enabled=testing_enabled(),
                checked_at=now, metrics=metrics)


@router.get("/testing/assets/{asset_id}/weather")
def testing_weather(asset_id: str, export: bool = False, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _testing_access(user)
    asset = db.get(InfrastructureAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Infrastructure asset not found.")
    require_asset_scope(db, user, asset)
    if not testing_enabled():
        return dict(status="disabled", reason="Evaluation weather is not enabled on this installation.")
    if asset.geom is None:
        return dict(status="insufficient_location", reason="This asset has no recorded map location.")
    lat, lon = db.query(func.ST_Y(func.ST_PointOnSurface(asset.geom)), func.ST_X(func.ST_PointOnSurface(asset.geom))).one()
    result = dict(asset_id=asset_id, registry_status=asset.registry_status, **forecast_context(float(lat), float(lon)))
    if export:
        stream = StringIO(newline="")
        writer = csv.writer(stream)
        writer.writerow(["Asset ID", "Registry status", "Signal", "Forecast time UTC", "Value", "Unit", "Fetched at UTC", "Provider", "Usage"])
        # Never export user-controlled labels as spreadsheet formulas.
        safe_id = "'" + asset_id if asset_id.startswith(("=", "+", "-", "@")) else asset_id
        for signal in result.get("signals", []):
            for point in signal.get("series", []):
                writer.writerow([safe_id, asset.registry_status, signal["signal"], point["at"], point["value"], signal["unit"], result["fetched_at"], "Open-Meteo", "Noncommercial testing forecast"])
        return Response("\ufeff" + stream.getvalue(), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": 'attachment; filename="PULSO_Testing_Forecasts.csv"', "Cache-Control": "private, no-store"})
    return result


class InspectionSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    observed_at: datetime
    defect_found: bool
    defect_type: str | None = Field(None, min_length=3, max_length=120)
    severity: str | None = None
    condition_score: float | None = Field(None, ge=0, le=100)
    finding: str = Field(min_length=20, max_length=4000)
    evidence_reference: str | None = Field(None, max_length=36)

    @model_validator(mode="after")
    def check_finding(self):
        if self.observed_at.tzinfo is None:
            raise ValueError("Inspection time must include a timezone.")
        if self.defect_found and (not self.defect_type or self.severity not in {"minor", "moderate", "major", "critical"}):
            raise ValueError("A confirmed defect needs its type and severity.")
        if not self.defect_found and (self.defect_type or self.severity):
            raise ValueError("A no-defect finding cannot include defect details.")
        if self.defect_found and not self.evidence_reference:
            raise ValueError("A defect finding requires private field evidence.")
        if self.evidence_reference:
            try:
                UUID(self.evidence_reference)
            except ValueError as exc:
                raise ValueError("Evidence reference must be a stored evidence ID.") from exc
        return self


class InspectionReview(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    decision: str = Field(pattern="^(verified|rejected)$")
    reason: str = Field(min_length=10, max_length=2000)


class RegistryVerification(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    maintenance_authority: str = Field(min_length=3, max_length=160)
    source_reference: str = Field(min_length=8, max_length=500)
    reason: str = Field(min_length=10, max_length=2000)
    latitude: float | None = Field(None, ge=4, le=22)
    longitude: float | None = Field(None, ge=116, le=127)

    @model_validator(mode="after")
    def coordinates_together(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together.")
        return self


def _require_staff(user):
    if not isinstance(user, models.Official):
        raise HTTPException(403, "Staff access is required.")


def _project(row):
    return dict(id=row.id, asset_id=row.asset_id, observed_at=row.observed_at,
                defect_found=row.defect_found, defect_type=row.defect_type,
                severity=row.severity, condition_score=row.condition_score,
                finding=row.finding, evidence_reference=row.evidence_reference,
                review_status=row.review_status, recorded_by_id=row.recorded_by_id,
                recorded_at=row.recorded_at, reviewed_by_id=row.reviewed_by_id,
                reviewed_at=row.reviewed_at, review_reason=row.review_reason)


@router.post("/assets/{asset_id}/inspection-evidence", status_code=201)
async def upload_inspection_evidence(asset_id: str, file: UploadFile = File(...),
                                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if canonical_role(user.role) not in INSPECTOR_ROLES:
        raise HTTPException(403, "Inspection capability is required.")
    asset = db.get(InfrastructureAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Infrastructure asset not found.")
    require_asset_scope(db, user, asset)
    data = await file.read(MAX_EVIDENCE_BYTES + 1)
    if not data or len(data) > MAX_EVIDENCE_BYTES:
        raise HTTPException(422, "Choose an image up to 5 MB.")
    try:
        with Image.open(BytesIO(data)) as image:
            image_format = image.format
            image.verify()
        suffix, media_type = IMAGE_TYPES[image_format]
    except (UnidentifiedImageError, KeyError, ValueError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, "Choose a valid PNG, JPEG or WebP image.")
    evidence_id = str(uuid4())
    folder = EVIDENCE_ROOT / evidence_id[:2]
    folder.mkdir(parents=True, exist_ok=True)
    location = folder / f"{evidence_id}{suffix}"
    try:
        with location.open("xb") as target:
            target.write(data)
        row = AssetInspectionEvidence(id=evidence_id, asset_id=asset_id, uploaded_by_id=user.id,
                                      stored_path=str(location.relative_to(EVIDENCE_ROOT)),
                                      content_type=media_type, byte_size=len(data), sha256=sha256(data).hexdigest())
        db.add(row)
        db.commit()
    except Exception:
        db.rollback()
        location.unlink(missing_ok=True)
        raise
    return {"id": evidence_id, "byte_size": len(data), "content_type": media_type}


@router.get("/inspection-evidence/{evidence_id}")
def get_inspection_evidence(evidence_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")
    try:
        UUID(evidence_id)
    except ValueError:
        raise HTTPException(404, "Evidence not found.")
    row = db.get(AssetInspectionEvidence, evidence_id)
    if not row:
        raise HTTPException(404, "Evidence not found.")
    require_asset_scope(db, user, db.get(InfrastructureAsset, row.asset_id))
    location = (EVIDENCE_ROOT / row.stored_path).resolve()
    if not location.is_relative_to(EVIDENCE_ROOT.resolve()):
        raise HTTPException(404, "Evidence not found.")
    if not location.is_file():
        raise HTTPException(404, "Evidence file is unavailable.")
    return FileResponse(location, media_type=row.content_type,
                        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
                                 "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'none'"})


def _model_release():
    enabled, source_reason = hazard_configured()
    if not enabled:
        return None, source_reason
    try:
        return load_release(), None
    except (OSError, ValueError, KeyError, ImportError) as exc:
        return None, f"Approved model artifact could not be loaded: {type(exc).__name__}."


def _current_run(db, digest):
    run = db.query(AssetModelRun).filter_by(model_sha256=digest).order_by(AssetModelRun.started_at.desc()).first()
    if not run:
        return None, "The approved model has not completed a scoring run."
    if run.status != "completed":
        return None, "The latest scoring run failed; recorded maintenance reviews remain available."
    finished = run.finished_at.replace(tzinfo=timezone.utc) if run.finished_at and run.finished_at.tzinfo is None else run.finished_at
    if not finished or datetime.now(timezone.utc) - finished.astimezone(timezone.utc) > timedelta(hours=12):
        return None, "The latest scoring run is stale; refresh scoring before using predictions."
    return run, None


def _snapshot(db, asset, digest):
    row = db.query(AssetModelAssessment).filter_by(asset_id=asset.asset_id, model_sha256=digest).first()
    if not row or row.status != "available" or not row.valid_until or row.valid_until < datetime.now(timezone.utc):
        return dict(status="insufficient_data", reason=row.reason if row and row.reason else "No current approved assessment is available.")
    latest = db.query(AssetInspectionOutcome).filter_by(asset_id=asset.asset_id, review_status="verified").order_by(
        AssetInspectionOutcome.reviewed_at.desc(), AssetInspectionOutcome.id.desc()).first()
    if not latest or latest.id != row.inspection_id or asset.registry_status != "verified":
        return dict(status="stale_inspection", reason="Asset or inspection changed after the last approved scoring run.")
    inspected_at = latest.reviewed_at or latest.observed_at
    inspected_at = inspected_at.replace(tzinfo=timezone.utc) if inspected_at.tzinfo is None else inspected_at
    if inspected_at + timedelta(days=MAX_BASELINE_AGE_DAYS) < datetime.now(timezone.utc):
        return dict(status="stale_inspection", reason="A new verified baseline inspection is required after seven days.")
    return dict(status="available", asset_id=asset.asset_id, probability=row.probability,
                horizon_days=90, target="new verified actionable defect", as_of=row.generated_at,
                prediction_window_start=inspected_at, prediction_window_end=row.valid_until,
                model_sha256=digest, inspection_id=row.inspection_id,
                weather_snapshot_id=row.weather_snapshot_id, flood_snapshot_id=row.flood_snapshot_id,
                limitation="Advisory likelihood for the 90 days after the verified inspection; it is not a rolling 90-day forecast. An engineer decides inspection and work.")


@router.get("/production/status")
def production_model_status(db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")
    release, error = _model_release()
    verified = scoped_assets(db.query(InfrastructureAsset), user).filter(
        InfrastructureAsset.registry_status == "verified").count()
    if not release:
        return dict(status="unavailable", reason=error or "No approved predictive model is configured.",
                    verified_assets_in_scope=verified)
    manifest, _ = release
    run, run_error = _current_run(db, manifest["model_sha256"])
    eligible_class = scoped_assets(db.query(InfrastructureAsset), user).filter(
        InfrastructureAsset.registry_status == "verified",
        InfrastructureAsset.category == manifest["category"],
        InfrastructureAsset.barangay_id.in_(manifest["policy"]["approved_barangay_ids"])).count()
    return dict(status="available" if run else "unavailable", reason=run_error,
                category=manifest["category"], horizon_days=manifest["horizon_days"],
                model_sha256=manifest["model_sha256"], trained_at=manifest["trained_at"],
                last_scored_at=run.finished_at if run else None,
                verified_assets_in_scope=verified, approved_class_assets_in_scope=eligible_class,
                limitation="An advisory model; staff verify condition and authorize work.")


@router.get("/production/hazards/status")
def hazard_feed_status(db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")
    enabled, reason = hazard_configured()
    run = db.query(HazardIngestionRun).order_by(HazardIngestionRun.started_at.desc()).first()
    leader = canonical_role(user.role) in LEADERS
    return {"status": "enabled" if enabled else "disabled", "reason": reason or None,
            "last_run": {"status": run.status, "finished_at": run.finished_at,
                         **({"barangays_seen": run.barangays_seen, "snapshots_written": run.snapshots_written,
                             "error_summary": run.error_summary} if leader else {})} if run else None,
            "interpretation": "Rainfall forecast and regional river discharge are context, not a confirmed local flood or asset defect."}


@router.get("/production/assets/{asset_id}/hazards")
def asset_hazard_context(asset_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")
    asset = db.get(InfrastructureAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Infrastructure asset not found.")
    require_asset_scope(db, user, asset)
    if asset.registry_status != "verified" or not asset.barangay_id:
        return {"status": "insufficient_location", "reason": "Verify the asset and its barangay before applying area forecast context.", "signals": []}
    now = datetime.now(timezone.utc)
    feed_enabled, feed_reason = hazard_configured()
    items = []
    for signal in SIGNALS:
        row = latest_signal(db, asset.barangay_id, signal, now)
        if not row:
            items.append({"signal": signal, "status": "unavailable", "reason": "No licensed source snapshot is recorded for this barangay."})
            continue
        expires = row.expires_at.replace(tzinfo=timezone.utc) if row.expires_at.tzinfo is None else row.expires_at
        items.append({"signal": signal, "status": "current" if feed_enabled and expires > now else "disabled" if not feed_enabled else "stale",
                      "reason": feed_reason if not feed_enabled else None,
                      "value": row.value, "unit": row.unit, "fetched_at": row.fetched_at,
                      "expires_at": row.expires_at, "valid_from": row.valid_from, "valid_to": row.valid_to,
                      "provider": row.provider, "product": row.product,
                      "requested_point": {"latitude": row.requested_latitude, "longitude": row.requested_longitude},
                      "grid_point": {"latitude": row.grid_latitude, "longitude": row.grid_longitude},
                      "source_resolution_km": row.source_resolution_km,
                      "license_reference": row.license_reference, "documentation_url": row.documentation_url,
                      "payload_sha256": row.payload_sha256, "limitation": row.limitation})
    return {"status": "current" if all(item["status"] == "current" for item in items) else "partial_or_stale",
            "barangay_id": asset.barangay_id, "signals": items,
            "interpretation": "Area forecast context only. A qualified person verifies local flooding and decides maintenance."}


@router.get("/production/assets/{asset_id}/hazards.csv")
def asset_hazard_csv(asset_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    context = asset_hazard_context(asset_id, db, user)
    if context["status"] == "insufficient_location":
        raise HTTPException(409, context["reason"])
    stream = StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["Asset ID", "Barangay ID", "Signal", "Status", "Value", "Unit", "Provider", "Product",
                     "Fetched at", "Expires at", "Valid from", "Valid to", "Grid resolution km", "Source URL",
                     "License reference", "Payload SHA-256", "Limitation"])
    def safe(value):
        value = str(value) if value is not None else ""
        return f"'{value}" if value.lstrip().startswith(("=", "+", "-", "@")) else value
    for item in context["signals"]:
        writer.writerow(map(safe, [asset_id, context["barangay_id"], item["signal"], item["status"],
                         item.get("value", ""), item.get("unit", ""), item.get("provider", ""), item.get("product", ""),
                         item.get("fetched_at", ""), item.get("expires_at", ""), item.get("valid_from", ""),
                         item.get("valid_to", ""), item.get("source_resolution_km", ""),
                         item.get("documentation_url", ""), item.get("license_reference", ""),
                         item.get("payload_sha256", ""), item.get("limitation") or item.get("reason", "")]))
    return Response(content="\ufeff" + stream.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="PULSO_Asset_Hazard_Context.csv"',
                             "Cache-Control": "private, no-store"})


@router.get("/production/assets/{asset_id}/flood-exposure")
def noah_asset_flood_exposure(asset_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")
    asset = db.get(InfrastructureAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Infrastructure asset not found.")
    require_asset_scope(db, user, asset)
    return asset_exposure(db, asset)


@router.get("/production/assets/{asset_id}/flood-exposure.csv")
def noah_asset_flood_exposure_csv(asset_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    context = noah_asset_flood_exposure(asset_id, db, user)
    if context["status"] != "available":
        raise HTTPException(409, context.get("reason", "Approved exposure data is unavailable."))
    stream = StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["Asset ID", "Return period (years)", "Hazard class", "Classification", "Source",
                     "Source revision", "Approved at", "Approval reference", "License", "License URL", "Source URL", "Limitations"])
    def safe(value):
        value = str(value) if value is not None else ""
        return f"'{value}" if value.lstrip().startswith(("=", "+", "-", "@")) else value
    for scenario in context["scenarios"]:
        writer.writerow(map(safe, [asset_id, scenario["return_period_years"], scenario["hazard_class"],
                                   scenario["classification"], context["source"], context["source_revision"],
                                   context["approved_at"], context["approval_reference"], context["license"], context["license_url"],
                                   context["source_url"], context["limitation"]]))
    return Response(content="\ufeff" + stream.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="PULSO_Asset_NOAH_Flood_Exposure.csv"',
                             "Cache-Control": "private, no-store"})


@router.get("/production/queue")
def production_queue(limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")
    release, error = _model_release()
    if not release:
        return dict(status="unavailable", reason=error or "No approved predictive model is configured.", total=0, items=[])
    manifest, _ = release
    run, run_error = _current_run(db, manifest["model_sha256"])
    if not run:
        return dict(status="unavailable", reason=run_error, total=0, items=[])
    latest_id = (select(AssetInspectionOutcome.id)
                 .where(AssetInspectionOutcome.asset_id == InfrastructureAsset.asset_id,
                        AssetInspectionOutcome.review_status == "verified")
                 .order_by(AssetInspectionOutcome.reviewed_at.desc(), AssetInspectionOutcome.id.desc())
                 .limit(1).scalar_subquery())
    latest_review_at = (select(AssetInspectionOutcome.reviewed_at)
                        .where(AssetInspectionOutcome.asset_id == InfrastructureAsset.asset_id,
                               AssetInspectionOutcome.review_status == "verified")
                        .order_by(AssetInspectionOutcome.reviewed_at.desc(), AssetInspectionOutcome.id.desc())
                        .limit(1).scalar_subquery())
    query = scoped_assets(db.query(InfrastructureAsset), user).join(
        AssetModelAssessment, AssetModelAssessment.asset_id == InfrastructureAsset.asset_id).filter(
        InfrastructureAsset.category == manifest["category"],
        InfrastructureAsset.registry_status == "verified",
        InfrastructureAsset.barangay_id.in_(manifest["policy"]["approved_barangay_ids"]),
        AssetModelAssessment.model_sha256 == manifest["model_sha256"],
        AssetModelAssessment.status == "available",
        AssetModelAssessment.valid_until > datetime.now(timezone.utc),
        latest_review_at >= datetime.now(timezone.utc) - timedelta(days=MAX_BASELINE_AGE_DAYS),
        AssetModelAssessment.inspection_id == latest_id)
    total = query.count()
    assets = query.order_by(AssetModelAssessment.probability.desc(), InfrastructureAsset.asset_id).offset(offset).limit(limit).all()
    return dict(status="available", total=total, limit=limit, offset=offset,
                model_sha256=manifest["model_sha256"],
                items=[dict(asset_id=asset.asset_id, asset_name=asset.asset_name,
                            barangay=asset.barangay, category=asset.category,
                            registry_status=asset.registry_status,
                            assessment=_snapshot(db, asset, manifest["model_sha256"])) for asset in assets])


@router.get("/production/queue.csv")
def production_queue_csv(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Export exactly the server-authorized approved queue with provenance columns."""
    first = production_queue(limit=100, offset=0, db=db, user=user)
    if first["status"] != "available":
        raise HTTPException(409, first.get("reason") or "No current approved queue is available.")
    stream = StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["Asset ID", "Asset name", "Barangay", "Category", "90-day defect likelihood (%)",
                     "Inspection baseline", "Prediction window ends", "Assessment as of", "Model SHA-256",
                     "Rainfall snapshot ID", "Regional river snapshot ID", "Interpretation"])

    def safe(value):
        value = str(value or "")
        return f"'{value}" if value.lstrip().startswith(("=", "+", "-", "@")) else value

    page = first
    while True:
        for item in page["items"]:
            assessment = item["assessment"]
            if assessment["status"] != "available":
                continue
            writer.writerow([safe(item["asset_id"]), safe(item["asset_name"]), safe(item["barangay"]),
                             safe(item["category"]), f'{assessment["probability"] * 100:.1f}',
                             assessment["prediction_window_start"].isoformat(),
                             assessment["prediction_window_end"].isoformat(),
                             assessment["as_of"].isoformat(), page["model_sha256"],
                             assessment["weather_snapshot_id"], assessment["flood_snapshot_id"],
                             "Advisory; inspect and authorize work separately"])
        next_offset = page["offset"] + len(page["items"])
        if next_offset >= first["total"] or not page["items"]:
            break
        page = production_queue(limit=100, offset=next_offset, db=db, user=user)
        if page["status"] != "available" or page["model_sha256"] != first["model_sha256"]:
            raise HTTPException(409, "Model queue changed during export; retry.")
    return Response(content="\ufeff" + stream.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="PULSO_Validated_Maintenance_Queue.csv"',
                             "Cache-Control": "private, no-store"})


@router.get("/production/assets/{asset_id}")
def production_asset_assessment(asset_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")
    asset = db.get(InfrastructureAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Infrastructure asset not found.")
    require_asset_scope(db, user, asset)
    release, error = _model_release()
    if error:
        return dict(status="model_unavailable", reason=error)
    if not release:
        return dict(status="model_unavailable", reason="No approved predictive model is configured.")
    digest = release[0]["model_sha256"]
    run, run_error = _current_run(db, digest)
    if not run:
        return dict(status="model_unavailable", reason=run_error)
    if asset.category != release[0]["category"] or asset.barangay_id not in release[0]["policy"]["approved_barangay_ids"]:
        return dict(status="out_of_scope", reason="This asset is outside the approved model cohort.")
    return _snapshot(db, asset, digest)


@router.post("/assets/{asset_id}/verify-registry")
def verify_registry_asset(asset_id: str, payload: RegistryVerification,
                          db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if canonical_role(user.role) not in LEADERS:
        raise HTTPException(403, "Engineering asset verification capability is required.")
    asset = db.query(InfrastructureAsset).filter_by(asset_id=asset_id).with_for_update().first()
    if not asset:
        raise HTTPException(404, "Infrastructure asset not found.")
    require_asset_scope(db, user, asset)
    if asset.registry_status == "verified":
        raise HTTPException(409, "This asset is already verified.")
    if asset.registry_status == "retired":
        raise HTTPException(409, "A retired asset cannot be verified without a reviewed registry correction.")
    if asset.barangay_id is None:
        raise HTTPException(422, "A recorded barangay is required before registry approval.")
    if asset.geom is None and payload.latitude is None:
        raise HTTPException(422, "Provide field-verified coordinates before registry approval.")
    if payload.latitude is not None:
        candidate = WKTElement(f"POINT({payload.longitude} {payload.latitude})", srid=4326)
        barangay = db.get(models.Barangay, asset.barangay_id)
        if barangay and barangay.geom is not None and not db.query(func.ST_Covers(barangay.geom, candidate)).scalar():
            raise HTTPException(422, "Field coordinates fall outside the recorded barangay boundary.")
        asset.geom = candidate
        asset.gps_coordinates = {"type": "Point", "coordinates": [payload.longitude, payload.latitude]}
    asset.registry_status = "verified"
    asset.maintenance_authority = payload.maintenance_authority
    asset.source_reference = payload.source_reference
    asset.verified_by_id = user.id
    asset.verified_at = datetime.now(timezone.utc)
    gov_crud._append_audit(db, trigger_type="asset_registry", action=f"Registry asset verified: {asset_id}",
                           actor_id=user.id, actor_role=user.role,
                           details=json.dumps(dict(source_reference=payload.source_reference,
                                                   maintenance_authority=payload.maintenance_authority,
                                                   latitude=payload.latitude, longitude=payload.longitude,
                                                   reason=payload.reason)))
    db.commit()
    return dict(asset_id=asset_id, registry_status=asset.registry_status,
                maintenance_authority=asset.maintenance_authority,
                source_reference=asset.source_reference, verified_at=asset.verified_at)


@router.get("/inspections")
def list_inspections(asset_id: str | None = None, status: str | None = Query(None, pattern="^(pending|verified|rejected)$"),
                     limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")
    visible = scoped_assets(db.query(InfrastructureAsset.asset_id), user).subquery()
    query = db.query(AssetInspectionOutcome).filter(AssetInspectionOutcome.asset_id.in_(visible))
    if asset_id:
        query = query.filter(AssetInspectionOutcome.asset_id == asset_id)
    if status:
        query = query.filter(AssetInspectionOutcome.review_status == status)
    total = query.count()
    rows = query.order_by(AssetInspectionOutcome.observed_at.desc(), AssetInspectionOutcome.id.desc()).offset(offset).limit(limit).all()
    return dict(total=total, items=[_project(row) for row in rows])


@router.post("/assets/{asset_id}/inspection-outcomes", status_code=201)
def submit_inspection(asset_id: str, payload: InspectionSubmission,
                      idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=36, max_length=64),
                      db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if canonical_role(user.role) not in INSPECTOR_ROLES:
        raise HTTPException(403, "Inspection capability is required.")
    try:
        UUID(idempotency_key)
    except ValueError:
        raise HTTPException(422, "Idempotency-Key must be a UUID.")
    fingerprint = sha256(json.dumps(payload.model_dump(mode="json"), sort_keys=True).encode()).hexdigest()
    existing = db.query(AssetInspectionOutcome).filter_by(command_id=idempotency_key).first()
    if existing:
        if existing.asset_id != asset_id or existing.recorded_by_id != user.id or existing.payload_hash != fingerprint:
            raise HTTPException(409, "This command key was already used for another inspection.")
        require_asset_scope(db, user, db.get(InfrastructureAsset, asset_id))
        return _project(existing)
    asset = db.get(InfrastructureAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Infrastructure asset not found.")
    require_asset_scope(db, user, asset)
    now = datetime.now(timezone.utc)
    if payload.observed_at > now:
        raise HTTPException(422, "Inspection time cannot be in the future.")
    if payload.evidence_reference:
        evidence = db.get(AssetInspectionEvidence, payload.evidence_reference)
        if not evidence or evidence.asset_id != asset_id or evidence.uploaded_by_id != user.id:
            raise HTTPException(422, "Evidence must be uploaded by you for this asset.")
        if db.query(AssetInspectionOutcome.id).filter_by(evidence_reference=evidence.id).first():
            raise HTTPException(409, "This evidence is already attached to an inspection.")
    row = AssetInspectionOutcome(command_id=idempotency_key, payload_hash=fingerprint, asset_id=asset_id,
                                 observed_at=payload.observed_at, defect_found=payload.defect_found,
                                 defect_type=payload.defect_type, severity=payload.severity,
                                 condition_score=payload.condition_score, finding=payload.finding,
                                 evidence_reference=payload.evidence_reference, recorded_by_id=user.id,
                                 review_status="pending")
    db.add(row)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        previous = db.query(AssetInspectionOutcome).filter_by(command_id=idempotency_key).first()
        if previous and previous.asset_id == asset_id and previous.recorded_by_id == user.id and previous.payload_hash == fingerprint:
            return _project(previous)
        raise HTTPException(409, "The inspection command or evidence was already used.")
    gov_crud._append_audit(db, trigger_type="asset_inspection", action=f"Inspection submitted for {asset_id}",
                           actor_id=user.id, actor_role=user.role,
                           details=f"inspection_id={row.id}; pending independent review")
    db.commit()
    db.refresh(row)
    return _project(row)


@router.post("/inspections/{inspection_id}/review")
def review_inspection(inspection_id: int, payload: InspectionReview,
                      db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_staff(user)
    if not can(user, "maintenance", "create_work_order") or not can(user, "verification", "view"):
        raise HTTPException(403, "Engineering review capability is required.")
    row = db.query(AssetInspectionOutcome).filter_by(id=inspection_id).with_for_update().first()
    if not row:
        raise HTTPException(404, "Inspection not found.")
    asset = db.get(InfrastructureAsset, row.asset_id)
    require_asset_scope(db, user, asset)
    if row.review_status != "pending":
        raise HTTPException(409, "This inspection has already been reviewed.")
    if row.recorded_by_id == user.id:
        raise HTTPException(403, "An independent reviewer is required.")
    row.review_status = payload.decision
    row.reviewed_by_id = user.id
    row.reviewed_at = datetime.now(timezone.utc)
    row.review_reason = payload.reason
    if payload.decision == "verified" and row.condition_score is not None:
        newer = db.query(AssetInspectionOutcome.id).filter(
            AssetInspectionOutcome.asset_id == row.asset_id,
            AssetInspectionOutcome.review_status == "verified",
            AssetInspectionOutcome.observed_at > row.observed_at).first()
        if not newer:
            asset.condition_score = row.condition_score
    gov_crud._append_audit(db, trigger_type="asset_inspection", action=f"Inspection {payload.decision} for {row.asset_id}",
                           actor_id=user.id, actor_role=user.role,
                           details=f"inspection_id={row.id}; reason={payload.reason}")
    db.commit()
    db.refresh(row)
    return _project(row)
