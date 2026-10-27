"""Authoritative asset geometry and scoped report proximity; proximity is not linkage."""
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, cast, or_
from geoalchemy2 import Geography
from fastapi import HTTPException
import models
import gov_models as gm
from government_access import require, require_asset_scope, scoped_reports


def asset_report_context(db, user, asset_id, radius_m=500):
    require(user, 'maintenance')
    asset = db.query(gm.InfrastructureAsset).filter_by(asset_id=asset_id).first()
    if not asset: raise HTTPException(404, 'Infrastructure asset not found.')
    require_asset_scope(db, user, asset)
    raw = db.query(func.ST_AsGeoJSON(gm.InfrastructureAsset.geom)).filter(gm.InfrastructureAsset.asset_id == asset_id).scalar() if asset.geom is not None else None
    geometry = json.loads(raw) if raw else asset.gps_coordinates
    if isinstance(geometry, dict) and geometry.get('type') == 'Feature': geometry = geometry.get('geometry')
    if not isinstance(geometry, dict) or geometry.get('type') not in {'Point','LineString','Polygon','MultiPoint','MultiLineString','MultiPolygon'}: geometry = None
    linked = db.query(gm.WorkOrder.report_id).filter(gm.WorkOrder.asset_id == asset_id, gm.WorkOrder.report_id.isnot(None))
    base = scoped_reports(db.query(models.Report), user)
    if user.role in {'field_worker','foreman','construction_foreman'}:
        base = base.filter(models.Report.id.in_(db.query(gm.WorkOrder.report_id).filter_by(assigned_to_id=user.id)))
    linked_ids = {r.id for r in base.filter(models.Report.id.in_(linked)).all()}
    distances = {}
    cutoff = datetime.now(timezone.utc)-timedelta(days=90)
    if geometry:
        target = cast(func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(geometry)),4326),Geography)
        point = cast(func.ST_SetSRID(func.ST_MakePoint(models.Report.location_lng,models.Report.location_lat),4326),Geography)
        valid = base.filter(models.Report.location_lat.between(-90,90),models.Report.location_lng.between(-180,180),or_(models.Report.location_lat != 0,models.Report.location_lng != 0))
        nearby = valid.filter(models.Report.created_at >= cutoff,models.Report.status.notin_(['rejected','spam','cancelled']),func.ST_DWithin(point,target,radius_m))
        distances = {r.id:round(distance) for r,distance in nearby.add_columns(func.ST_Distance(point,target)).all()}
    ids = linked_ids | set(distances)
    reports = base.filter(models.Report.id.in_(ids)).order_by(models.Report.created_at.desc()).all() if ids else []
    return dict(asset=dict(asset_id=asset.asset_id, name=asset.asset_name, barangay=asset.barangay_ref.name if asset.barangay_ref else asset.barangay, geometry=geometry),
        reports=reports, linked_ids=linked_ids, distances=distances, radius_m=radius_m,
        nearby_window_days=90, location_available=bool(geometry))
