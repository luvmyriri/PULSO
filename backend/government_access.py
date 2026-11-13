"""Shared operational access rules.

Explicit module grants override legacy role defaults. Platform administration is
not a publishing delegation. Existing engineering defaults remain a pilot policy,
not a claim about the City's actual signing authority.
"""
from fastapi import HTTPException
from sqlalchemy import select
import models
from operational_roles import canonical_role

LEADERS = {'city_engineer', 'asst_city_engineer', 'manager', 'division_chief'}
COORDINATORS = LEADERS | {'dispatcher', 'admin_officer'}
EDITORS = LEADERS | {'admin_officer', 'admin_clerk', 'records_officer', 'project_engineer', 'system_admin'}
VERIFIERS = LEADERS | {'building_inspector', 'electrical_inspector', 'mechanical_inspector', 'project_engineer'}


def can(user, module, action='view'):
    if not isinstance(user, models.Official):
        return False
    role = canonical_role(str(user.role or ''))
    ref = getattr(user, 'role_ref', None)
    caps = (ref.capabilities or {}) if ref else {}
    if module in caps:
        grant = caps[module]
        return isinstance(grant, list) and (action in grant or '*' in grant)
    if module == 'announcements':
        return action == 'view' or (action in {'create', 'edit'} and role in EDITORS) or (action in {'review', 'approve', 'publish', 'withdraw', 'correct'} and role in LEADERS)
    if module == 'coordination':
        return role in COORDINATORS
    if module == 'verification':
        return role in VERIFIERS
    if module == 'maintenance':
        return can(user, 'insights') if action == 'view' else action == 'create_work_order' and role in {'dispatcher', 'project_engineer', 'asst_city_engineer', 'city_engineer', 'manager'}
    if module == 'insights':
        return role in COORDINATORS | VERIFIERS | {'design_engineer', 'estimator', 'system_admin'} or (isinstance(caps.get('analytics'), list) and 'view' in caps['analytics'])
    if module == 'overview':
        return can(user, 'insights', action)
    if module == 'analytics':
        return can(user, 'insights', action)
    if module == 'obo':
        return action == 'view' or role in {'city_engineer', 'asst_city_engineer', 'manager', 'system_admin', 'admin', 'building_inspector', 'electrical_inspector', 'mechanical_inspector', 'admin_clerk'}
    if module == 'field':
        return action == 'view' and role in {'project_engineer', 'dispatcher', 'building_inspector', 'asst_city_engineer', 'city_engineer', 'manager', 'foreman', 'construction_foreman', 'field_worker', 'system_admin', 'admin'}
    if module == 'reports':
        return action == 'view' or role in COORDINATORS
    return False


def require(user, module, action='view'):
    if not can(user, module, action):
        raise HTTPException(403, f'Your account needs {module}:{action} permission for this action.')


def jurisdiction_ids(user):
    """Keep configured district scope; a missing scope is not a made-up location."""
    raw = getattr(user, 'primary_jurisdiction', None)
    if not raw:
        return []
    if isinstance(raw, dict):
        raw = raw.get('district_ids', raw.get('districts', raw.get('district_id')))
        if isinstance(raw, (str, int)):
            raw = [raw]
    if not isinstance(raw, list):
        raise HTTPException(403, 'Your configured jurisdiction needs an administrator review before this view can be opened.')
    if any(not str(v).isdigit() or int(v) < 1 for v in raw):
        raise HTTPException(403, 'Your configured jurisdiction contains unsupported district identifiers.')
    return [int(v) for v in raw]


def scoped(query, column, user):
    ids = jurisdiction_ids(user)
    return query.filter(column.in_(ids)) if ids else query


def require_scope(user, record):
    ids = jurisdiction_ids(user)
    if ids and getattr(record, 'district_id', None) not in ids:
        raise HTTPException(403, 'This record is outside your configured district scope.')


def scoped_reports(query, user):
    ids = jurisdiction_ids(user)
    if not ids:
        return query
    return query.filter(models.Report.barangay_id.in_(select(models.Barangay.id).where(models.Barangay.district_id.in_(ids))))


def require_report_scope(db, user, report):
    ids = jurisdiction_ids(user)
    if ids:
        barangay = db.query(models.Barangay).filter(models.Barangay.id == report.barangay_id).first()
        if not barangay or barangay.district_id not in ids:
            raise HTTPException(403, 'This report is outside your configured district scope.')


def scoped_assets(query, user):
    from gov_models import InfrastructureAsset
    ids = jurisdiction_ids(user)
    return query.filter(InfrastructureAsset.barangay_id.in_(select(models.Barangay.id).where(models.Barangay.district_id.in_(ids)))) if ids else query


def require_asset_scope(db, user, asset):
    ids = jurisdiction_ids(user)
    if ids:
        area = db.query(models.Barangay).filter_by(id=asset.barangay_id).first()
        if not area or area.district_id not in ids:
            raise HTTPException(403, 'This asset is outside your configured district scope.')


def require_entity_scope(db,user,model,record_id):
    record=db.query(model).filter(model.id==record_id).first()
    if not record: raise HTTPException(404,'Linked record not found.')
    require_scope(user,record)
    return record


def resolve_record_area(db,user,payload):
    """Reconcile recorded lookup IDs; never infer service scope from a map label."""
    from types import SimpleNamespace
    area_id=getattr(payload,'barangay_id',None)
    district_id=getattr(payload,'district_id',None)
    if area_id:
        area=db.get(models.Barangay,area_id)
        if not area: raise HTTPException(422,'Choose an existing barangay.')
        if district_id and district_id != area.district_id:
            raise HTTPException(422,'The selected barangay and district do not match.')
        district_id=area.district_id
        payload.district_id=district_id
        payload.barangay=area.name
    if district_id and not db.get(models.District,district_id):
        raise HTTPException(422,'Choose an existing district.')
    require_scope(user,SimpleNamespace(district_id=district_id))


def scoped_residents(query,user):
    from sqlalchemy import and_,or_
    ids=jurisdiction_ids(user)
    if not ids: return query
    return query.filter(or_(models.Resident.district_id.in_(ids),and_(models.Resident.district_id.is_(None),
        models.Resident.barangay_id.in_(select(models.Barangay.id).where(models.Barangay.district_id.in_(ids))))))


def require_resident_scope(db,user,resident):
    from types import SimpleNamespace
    if not jurisdiction_ids(user): return
    district=resident.district_id
    if district is None and resident.barangay_id:
        area=db.get(models.Barangay,resident.barangay_id)
        district=area.district_id if area else None
    require_scope(user,SimpleNamespace(district_id=district))
