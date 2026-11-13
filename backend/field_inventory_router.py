"""Private, scoped field inventory APIs. No provider calls or official asset claims."""
from datetime import datetime, timezone
from hashlib import sha256
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from sqlalchemy import case, cast, func, text
from sqlalchemy.orm import Session
from pydantic import ValidationError

from auth import get_current_user
from database import get_db
from government_access import require_asset_scope, scoped_assets
import gov_models as gm
import field_inventory as field
from command_integrity import request_hash

class FieldInventoryRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def validated(request):
            try:
                return await original(request)
            except RequestValidationError as exc:
                # Never echo private notes or invalid nonfinite coordinates in errors.
                raise HTTPException(422, detail=[{name: error[name] for name in ('loc', 'msg', 'type')}
                    for error in exc.errors()]) from exc
        return validated


router = APIRouter(prefix='/api/gov/field-inventory', tags=['First-party field inventory'], route_class=FieldInventoryRoute)


def asset_for(db, user, asset_id, lock=False):
    query = db.query(gm.InfrastructureAsset).filter_by(asset_id=asset_id)
    asset = (query.with_for_update() if lock else query).first()
    if not asset:
        raise HTTPException(404, 'Infrastructure record not found.')
    require_asset_scope(db, user, asset)
    return asset


def operation(db, user, kind, asset_id, key, payload, image_bytes=None):
    command_hash, payload_hash = field.command(user, kind, asset_id, key, payload)
    if kind in {'create_capture','observe_capture'}:
        payload_hash = request_hash(dict(payload=payload.model_dump(mode='json'),image_sha256=sha256(image_bytes).hexdigest() if image_bytes else None))
    # A transaction lock also covers a replay racing the original commit.
    db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': int(command_hash[:16], 16) % (2**63)})
    return command_hash, payload_hash, field.prior(db, command_hash, payload_hash)


def receipt(db, user, row):
    asset = asset_for(db, user, row.asset_id)
    return dict(asset=field.project_asset(asset), observation=field.project_observation(row))


@router.get('/permissions')
def permissions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    field.require_access(user)
    from government_access import jurisdiction_ids
    from models import Barangay
    ids = jurisdiction_ids(user)
    areas = db.query(Barangay).filter(Barangay.district_id.is_not(None))
    if ids:
        areas = areas.filter(Barangay.district_id.in_(ids))
    return dict(record=field.action_allowed(user,'record'),review=field.action_allowed(user,'review'),current_user_id=user.id,
        barangays=[dict(id=a.id,name=a.name) for a in areas.order_by(Barangay.name).all()])


@router.get('/receipt')
def capture_receipt(operation: Literal['create_capture','observe_capture'], asset_id: str | None = None,
                    idempotency_key: str = Header(alias='Idempotency-Key'),
                    db: Session = Depends(get_db), user=Depends(get_current_user)):
    field.require_access(user,'record')
    if (operation == 'observe_capture') != bool(asset_id):
        raise HTTPException(422,'Choose the original capture operation and target.')
    command_hash = field.command_scope(user,operation,asset_id,idempotency_key)
    row = db.query(gm.AssetFieldObservation).filter_by(command_hash=command_hash).first()
    if not row:
        raise HTTPException(404,'No committed field receipt is available yet. Keep the original operation for retry.')
    return receipt(db,user,row)


async def capture_record(db,user,asset_id,raw_payload,file,key):
    field.require_access(user,'record')
    schema = field.FieldObservationInput if asset_id else field.FieldCandidateInput
    try:
        payload = schema.model_validate_json(raw_payload)
    except ValidationError as exc:
        raise HTTPException(422,detail=[{name:e[name] for name in ('loc','msg','type')} for e in exc.errors()]) from exc
    if payload.evidence_reference:
        raise HTTPException(422,'Capture intake attaches its own photo; omit evidence_reference.')
    if payload.visibility == 'visible' and not file:
        raise HTTPException(422,'Attach a field photo for a visible finding, including a no-defect finding.')
    from asset_evidence_store import MAX_EVIDENCE_BYTES, store_image
    import asset_inspection_router
    data = await file.read(MAX_EVIDENCE_BYTES+1) if file else None
    if data is not None and (not data or len(data) > MAX_EVIDENCE_BYTES):
        raise HTTPException(422,'Choose an image up to 5 MB.')
    kind = 'observe_capture' if asset_id else 'create_capture'
    command_hash,payload_hash,previous = operation(db,user,kind,asset_id,key,payload,data)
    if previous:
        return receipt(db,user,previous)
    stored_path = None
    committing = False
    try:
        row_id = str(uuid4())
        if asset_id:
            asset = asset_for(db,user,asset_id,lock=True)
            if asset.registry_status == 'retired':
                raise HTTPException(409,'A retired record needs a reviewed correction before a new survey.')
        else:
            area = field.area_for(db,user,payload.barangay_id)
            point,_ = field.checked_location(db,area,payload)
            from gov_crud import normalize_asset_category
            asset = gm.InfrastructureAsset(asset_id='PULSO-FI-'+str(uuid4()),asset_name=payload.asset_name,
                category=normalize_asset_category(payload.category),barangay_id=area.id,barangay=area.name,geom=point,
                gps_coordinates={'type':'Point','coordinates':[payload.longitude,payload.latitude]},
                registry_status='candidate',status='unassessed',condition_score=None,design_life=None,
                maintenance_authority=None,source_reference=f'pulso-field-observation:{row_id}')
            db.add(asset)
            db.flush()
        if data:
            evidence,stored_path = store_image(db,asset_inspection_router.EVIDENCE_ROOT,asset.asset_id,user.id,data)
            db.flush()
            payload = payload.model_copy(update={'evidence_reference':UUID(evidence.id)})
        row = field.make_observation(db,user,asset,payload,command_hash,payload_hash,row_id)
        committing = True
        db.commit()
    except Exception:
        db.rollback()
        if stored_path and not committing:
            stored_path.unlink(missing_ok=True)
        raise
    return receipt(db,user,row)


@router.post('/assets/capture',status_code=201)
async def capture_candidate(payload: str = Form(max_length=24000), image: UploadFile | None = File(default=None),
                            idempotency_key: str = Header(alias='Idempotency-Key'),
                            db: Session = Depends(get_db), user=Depends(get_current_user)):
    return await capture_record(db,user,None,payload,image,idempotency_key)


@router.post('/assets/{asset_id}/capture',status_code=201)
async def capture_visit(asset_id: str, payload: str = Form(max_length=24000), image: UploadFile | None = File(default=None),
                        idempotency_key: str = Header(alias='Idempotency-Key'),
                        db: Session = Depends(get_db), user=Depends(get_current_user)):
    return await capture_record(db,user,asset_id,payload,image,idempotency_key)


@router.post('/assets', status_code=201)
def create_candidate(payload: field.FieldCandidateInput, idempotency_key: str = Header(alias='Idempotency-Key'),
                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    field.require_access(user, 'record')
    area = field.area_for(db, user, payload.barangay_id)
    command_hash, payload_hash, previous = operation(db, user, 'create', None, idempotency_key, payload)
    if previous:
        return receipt(db, user, previous)
    point, _ = field.checked_location(db, area, payload)
    # Identity is deliberately independent of category, proximity and photo angle.
    asset_id, row_id = 'PULSO-FI-' + str(uuid4()), str(uuid4())
    field.checked_sources(db, user, asset_id, payload, area.id)
    from gov_crud import normalize_asset_category
    asset = gm.InfrastructureAsset(asset_id=asset_id, asset_name=payload.asset_name, category=normalize_asset_category(payload.category),
        barangay_id=area.id, barangay=area.name, geom=point,
        gps_coordinates={'type': 'Point', 'coordinates': [payload.longitude, payload.latitude]},
        registry_status='candidate', status='unassessed', condition_score=None, design_life=None,
        maintenance_authority=None, source_reference=f'pulso-field-observation:{row_id}')
    db.add(asset)
    db.flush()
    row = field.make_observation(db, user, asset, payload, command_hash, payload_hash, row_id)
    db.commit()
    return receipt(db, user, row)


@router.get('/assets/nearby')
def nearby(latitude: float = Query(ge=4, le=22), longitude: float = Query(ge=116, le=127),
           radius_m: int = Query(default=100, ge=10, le=500),
           db: Session = Depends(get_db), user=Depends(get_current_user)):
    field.require_access(user)
    # Query validation must also reject infinities/NaN before they reach PostGIS.
    from report_intelligence import validate_point
    validate_point(latitude, longitude)
    asset = gm.InfrastructureAsset
    point = cast(WKTElement(f'POINT({longitude} {latitude})', srid=4326), Geography())
    geometry = cast(asset.geom, Geography())
    distance = func.ST_Distance(geometry, point)
    query = scoped_assets(db.query(asset, distance.label('distance_m')), user).filter(
        asset.registry_status != 'retired', asset.geom.is_not(None), func.ST_DWithin(geometry, point, radius_m))
    rows = query.order_by(distance, asset.asset_id).limit(51).all()
    return dict(items=[dict(**field.project_asset(a), distance_m=round(d, 1), identity_status='not_established_by_proximity') for a, d in rows[:50]],
        radius_m=radius_m, truncated=len(rows) > 50, maximum_results=50)


@router.get('/assets')
def list_assets(offset: int = Query(default=0, ge=0), limit: int = Query(default=30, ge=1, le=100),
                registry_status: Literal['candidate', 'verified', 'retired'] | None = None,
                barangay_id: int | None = Query(default=None, gt=0),
                db: Session = Depends(get_db), user=Depends(get_current_user)):
    field.require_access(user)
    query = scoped_assets(db.query(gm.InfrastructureAsset), user)
    if registry_status:
        query = query.filter(gm.InfrastructureAsset.registry_status == registry_status)
    if barangay_id:
        field.area_for(db, user, barangay_id)
        query = query.filter(gm.InfrastructureAsset.barangay_id == barangay_id)
    total = query.count()
    rows = query.order_by(gm.InfrastructureAsset.created_at.desc(), gm.InfrastructureAsset.asset_id).offset(offset).limit(limit).all()
    return dict(items=[field.project_asset(a) for a in rows], total=total, offset=offset, limit=limit,
        next_offset=offset + limit if offset + limit < total else None)


@router.get('/coverage')
def coverage(db: Session = Depends(get_db), user=Depends(get_current_user)):
    field.require_access(user)
    row, asset = gm.AssetFieldObservation, gm.InfrastructureAsset
    categories = {
        **{name: row.visibility == name for name in ('visible', 'not_visible', 'unsafe', 'missing')},
        **{name: row.condition == name for name in ('defect_observed', 'no_defect_observed', 'not_assessed')},
        **{name: row.review_status == name for name in ('pending', 'accepted', 'rejected')},
        'identity_confirmed': (row.review_status == 'accepted') & row.identity_confirmed.is_(True),
        'location_reviewed': (row.review_status == 'accepted') & row.location_reviewed.is_(True),
    }
    query = db.query(func.count(row.id), func.count(func.distinct(row.asset_id)), func.min(row.observed_at), func.max(row.observed_at),
        *(func.coalesce(func.sum(case((test, 1), else_=0)), 0) for test in categories.values())).select_from(asset).join(row, row.asset_id == asset.asset_id)
    result = scoped_assets(query, user).one()
    return dict(observation_count=result[0], surveyed_record_count=result[1], first_observed_at=result[2], last_observed_at=result[3],
        counts=dict(zip(categories, result[4:])), model_label_status='not_exported_from_field_observations',
        counts_include_pending_and_rejected_claims=True,
        scope='First-party observations of accessible registry records only; records may still represent duplicate physical objects.',
        limitation='These counts do not measure citywide coverage, defect prevalence, or verified model performance. Not assessed is not a negative finding.')


@router.get('/assets/{asset_id}/observations')
def observations(asset_id: str, offset: int = Query(default=0, ge=0), limit: int = Query(default=30, ge=1, le=100),
                 db: Session = Depends(get_db), user=Depends(get_current_user)):
    field.require_access(user)
    asset = asset_for(db, user, asset_id)
    query = db.query(gm.AssetFieldObservation).filter_by(asset_id=asset_id)
    total = query.count()
    rows = query.order_by(gm.AssetFieldObservation.observed_at.desc(), gm.AssetFieldObservation.id).offset(offset).limit(limit).all()
    return dict(asset=field.project_asset(asset), items=[field.project_observation(row) for row in rows],
        total=total, offset=offset, limit=limit, next_offset=offset + limit if offset + limit < total else None)


@router.post('/assets/{asset_id}/observations', status_code=201)
def add_observation(asset_id: str, payload: field.FieldObservationInput,
                    idempotency_key: str = Header(alias='Idempotency-Key'),
                    db: Session = Depends(get_db), user=Depends(get_current_user)):
    field.require_access(user, 'record')
    command_hash, payload_hash, previous = operation(db, user, 'observe', asset_id, idempotency_key, payload)
    if previous:
        return receipt(db, user, previous)
    asset = asset_for(db, user, asset_id, lock=True)
    if asset.registry_status == 'retired':
        raise HTTPException(409, 'A retired record needs a reviewed registry correction before a new survey.')
    row = field.make_observation(db, user, asset, payload, command_hash, payload_hash, str(uuid4()))
    db.commit()
    return receipt(db, user, row)


@router.post('/observations/{observation_id}/review')
def review_observation(observation_id: str, payload: field.FieldReviewInput,
                      db: Session = Depends(get_db), user=Depends(get_current_user)):
    field.require_access(user, 'review')
    row = db.query(gm.AssetFieldObservation).filter_by(id=observation_id).with_for_update().first()
    if not row:
        raise HTTPException(404, 'Field observation not found.')
    asset_for(db, user, row.asset_id)
    if row.review_status != 'pending':
        raise HTTPException(409, 'This observation was already reviewed. Record a new observation for a correction.')
    if row.recorded_by_id == user.id:
        raise HTTPException(403, 'An independent reviewer must review the observation.')
    if payload.decision == 'accepted' and row.visibility == 'visible':
        if not row.evidence_reference:
            raise HTTPException(422, 'A visible finding needs stored private field evidence. Record a new observation with evidence; a source report is context, not revisit proof.')
    row.review_status, row.review_reason = payload.decision, payload.reason
    row.identity_confirmed, row.location_reviewed = payload.identity_confirmed, payload.location_reviewed
    row.reviewed_by_id, row.reviewed_at = user.id, datetime.now(timezone.utc)
    db.add(gm.AuditLog(trigger_type='field_inventory', actor_id=user.id, actor_role=user.role,
        action='First-party field observation reviewed', details=f'observation_id={row.id}; decision={row.review_status}; identity_confirmed={row.identity_confirmed}; location_reviewed={row.location_reviewed}'))
    db.commit()
    # This does not verify registry ownership, change geometry/condition, or train a model.
    return field.project_observation(row)
