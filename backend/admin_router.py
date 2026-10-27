"""
admin_router.py — System Administration & Governance Endpoints
City Engineering Office, Caloocan City — PULSO System

Mounts under /api/admin/ (and aliased under /api/gov/admin/)

Endpoints:
  Staff Members     : GET, POST /api/admin/staff, PATCH /api/admin/staff/{id}, actions
  Resident Accounts : GET /api/admin/residents, PATCH /api/admin/residents/{id}/status, KYC review
  System Settings   : GET, PUT /api/admin/settings/{key} with version history & reasons
  Audit Integrity   : GET /api/admin/audit-integrity & GET /api/admin/audit-logs
"""

import json
import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, or_, desc, and_, not_
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, get_password_hash
import models
import gov_models
import staff_accounts
from government_access import scoped_residents,require_resident_scope
from roles_service import has_permission

router = APIRouter(prefix="/api/admin", tags=["System Administration"])


# ─────────────────────────────────────────────────────────────────────────────
# RBAC & Authorization Guardrails
# ─────────────────────────────────────────────────────────────────────────────

def require_admin(current_user=Depends(get_current_user)) -> models.Official:
    if not staff_accounts.admin_grants(current_user):
        raise HTTPException(403, 'Administrative access is required.')
    return current_user


def admin_action(action):
    def dependency(current_user=Depends(get_current_user)):
        staff_accounts.require_action(current_user,action)
        return current_user
    return dependency


def log_admin_audit(
    db: Session,
    actor: models.Official,
    action: str,
    details_dict: Dict[str, Any],
    trigger_type: str = "admin_action"
) -> gov_models.AuditLog:
    """
    Writes an append-only, tamper-resistant audit entry.
    Audit log rows cannot be updated or deleted through the API.
    """
    entry = gov_models.AuditLog(
        trigger_type=trigger_type,
        actor_id=actor.id,
        actor_role=actor.role,
        action=action,
        details=json.dumps(details_dict),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ─────────────────────────────────────────────────────────────────────────────
# Friendly Role Mapping
# ─────────────────────────────────────────────────────────────────────────────

ROLE_DISPLAY_MAP = {
    "system_admin": "System Administrator",
    "city_engineer": "City Engineer",
    "asst_city_engineer": "Asst. City Engineer",
    "division_chief": "Division Chief",
    "senior_engineer": "Senior Engineer",
    "project_engineer": "Project Engineer",
    "design_engineer": "Design Engineer",
    "engineer_ii": "Engineer II",
    "field_worker": "Field Technician",
    "construction_foreman": "Construction Foreman",
    "building_inspector": "Building Inspector",
    "electrical_inspector": "Electrical Inspector",
    "mechanical_inspector": "Mechanical Inspector",
    "admin_officer": "Admin Officer",
    "admin_clerk": "Admin Clerk",
    "records_officer": "Records Officer",
    "estimator": "Estimator",
    "cad_operator": "CAD Operator",
    "dispatcher": "Dispatcher",
    "manager": "Operations Manager",
}

def to_friendly_role(raw_role: Optional[str]) -> str:
    if not raw_role:
        return "Staff Member"
    slug = raw_role.strip().lower().replace(" ", "_")
    return ROLE_DISPLAY_MAP.get(slug, raw_role.replace("_", " ").title())


# ─────────────────────────────────────────────────────────────────────────────
# 1. Staff Members Management
# ─────────────────────────────────────────────────────────────────────────────

class StaffInviteRequest(BaseModel):
    full_name: str = Field(min_length=2,max_length=150)
    email: EmailStr
    role: str
    office: Optional[str] = Field(None,max_length=150)
    district_ids: List[int] = Field(default_factory=list)
    citywide: bool = False
    reason: str = Field(min_length=10,max_length=2000)

    @field_validator('full_name','reason')
    @classmethod
    def strip_required(cls,value,info):
        value=value.strip()
        minimum=10 if info.field_name=='reason' else 2
        if len(value)<minimum: raise ValueError(f'Enter at least {minimum} characters.')
        return value


class StaffUpdateRequest(BaseModel):
    role: Optional[str] = None
    office: Optional[str] = Field(None,max_length=150)
    district_ids: Optional[List[int]] = None
    citywide: Optional[bool] = None
    is_active: Optional[bool] = None
    expected_version: int = Field(ge=0)
    reason: str = Field(min_length=10,max_length=2000)

    @field_validator('reason')
    @classmethod
    def reason_length(cls,value):
        if len(value.strip())<10: raise ValueError('Enter a reason of at least 10 characters.')
        return value.strip()


class CredentialLinkRequest(BaseModel):
    reason: str = Field(min_length=10,max_length=2000)

    @field_validator('reason')
    @classmethod
    def strip_reason(cls,value):
        if len(value.strip())<10: raise ValueError('Enter a reason of at least 10 characters.')
        return value.strip()


class StaffCredentialAccept(BaseModel):
    token: str = Field(min_length=40,max_length=128)
    password: str = Field(min_length=12,max_length=72)

    @field_validator('password')
    @classmethod
    def password_bytes(cls,value):
        if len(value.encode('utf-8'))>72: raise ValueError('Use a password of at most 72 UTF-8 bytes.')
        return value


class StaffRecoveryRequest(BaseModel):
    email: EmailStr


@router.post('/staff-credentials/request')
def request_staff_recovery(payload: StaffRecoveryRequest, db: Session = Depends(get_db)):
    return staff_accounts.request_recovery(db,payload.email)


@router.post('/staff-credentials/accept')
def accept_staff_credentials(payload: StaffCredentialAccept, db: Session = Depends(get_db)):
    return staff_accounts.redeem(db,payload.token,payload.password)


@router.get('/access')
def admin_access(admin=Depends(require_admin)):
    return dict(tabs=[name for name,action in [('staff','staff_view'),('residents','residents_view'),('settings','settings_view'),('automated-ai','settings_view'),('audit','audit_view')] if staff_accounts.allowed(admin,action)])


@router.get('/staff-options')
def staff_options(db: Session = Depends(get_db), admin=Depends(admin_action('staff_view'))):
    from government_access import jurisdiction_ids
    ids=jurisdiction_ids(admin)
    districts=db.query(models.District)
    if ids: districts=districts.filter(models.District.id.in_(ids))
    stored=db.query(models.SystemRole).filter_by(is_template=False).all()
    roles={name:dict(value=name,label=to_friendly_role(name)) for name in staff_accounts.LEGACY_ROLES}
    for role in stored:
        roles[role.name]=dict(value=role.name,label=role.label or to_friendly_role(role.name))
    if '*' not in staff_accounts.admin_grants(admin):
        roles={name:item for name,item in roles.items() if name not in ('admin','system_admin') and not any(r.name==name and (r.capabilities or {}).get('admin') for r in stored)}
    return dict(can_manage=staff_accounts.allowed(admin,'staff_manage'),can_grant_citywide=not ids and '*' in staff_accounts.admin_grants(admin),
        roles=sorted(roles.values(),key=lambda r:r['label']),districts=[dict(id=d.id,name=d.name) for d in districts.order_by(models.District.id)],
        tabs=[name for name,action in [('staff','staff_view'),('residents','residents_view'),('settings','settings_view'),('automated-ai','settings_view')] if staff_accounts.allowed(admin,action)])


@router.get("/staff")
def list_staff_members(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: Optional[int] = Query(None),
    pageSize: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    admin: models.Official = Depends(admin_action('staff_view')),
):
    """
    Returns paginated list of government staff accounts from the authoritative database.
    """
    limit = pageSize or page_size or 10
    limit = max(1, min(limit, 100))

    query = staff_accounts.visible_query(db,admin)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Official.full_name.ilike(term),
                models.Official.email.ilike(term),
                models.Official.role.ilike(term),
                models.Official.display_name.ilike(term),
            )
        )

    if role and role.strip() and role != "all":
        role_slug = role.strip().lower().replace(" ", "_")
        query = query.filter(
            or_(
                models.Official.role.ilike(f"%{role_slug}%"),
                models.Official.role.ilike(f"%{role.strip()}%")
            )
        )

    if status and status.strip() and status != "all":
        st = status.strip().lower()
        if st in ["active"]:
            query = query.filter(models.Official.is_active == True, models.Official.is_suspended == False)
        elif st == "invited":
            query=query.filter(models.Official.invitation_pending==True,models.Official.is_suspended==False)
        elif st in ["deactivated", "suspended", "inactive"]:
            query = query.filter(or_(models.Official.is_active == False, models.Official.is_suspended == True),or_(models.Official.invitation_pending==False,models.Official.is_suspended==True))

    total = query.count()
    officials = query.order_by(models.Official.id.asc()).offset((page - 1) * limit).limit(limit).all()

    items = [staff_accounts.project(db,off) for off in officials]

    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": limit,
        "page_size": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1,
    }


@router.post("/staff", status_code=status.HTTP_201_CREATED)
def add_staff_member(
    payload: StaffInviteRequest,
    db: Session = Depends(get_db),
    admin: models.Official = Depends(admin_action('staff_manage')),
):
    return staff_accounts.create_staff(db,admin,payload)


@router.get('/staff/{staff_id}')
def get_staff_member(staff_id: int, db: Session = Depends(get_db), admin=Depends(admin_action('staff_view'))):
    person=staff_accounts.target_in_scope(db,admin,staff_id,manage=False)
    editable=staff_accounts.allowed(admin,'staff_manage') and admin.id != person.id and ('*' in staff_accounts.admin_grants(admin) or not staff_accounts.admin_grants(person))
    actions=[]
    if editable:
        actions.append('edit')
        actions.append('deactivate' if person.is_active or person.invitation_pending and not person.is_suspended else 'activate')
        if person.invitation_pending and not person.is_suspended: actions.append('invite')
        elif person.is_active and not person.is_suspended: actions.append('reset')
    return {**staff_accounts.project(db,person),'allowed_actions':actions}


@router.patch("/staff/{staff_id}")
def update_staff_member(
    staff_id: int,
    payload: StaffUpdateRequest,
    db: Session = Depends(get_db),
    admin: models.Official = Depends(admin_action('staff_manage')),
):
    return staff_accounts.update_staff(db,admin,staff_id,payload)


@router.post("/staff/{staff_id}/resend-invite")
def resend_staff_invite(
    staff_id: int,
    payload: CredentialLinkRequest,
    db: Session = Depends(get_db),
    admin: models.Official = Depends(admin_action('staff_manage')),
):
    return staff_accounts.reissue(db,admin,staff_id,'invite',payload.reason)


@router.post("/staff/{staff_id}/reset-password")
def reset_staff_password(
    staff_id: int,
    payload: CredentialLinkRequest,
    db: Session = Depends(get_db),
    admin: models.Official = Depends(admin_action('staff_manage')),
):
    return staff_accounts.reissue(db,admin,staff_id,'reset',payload.reason)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Resident Accounts Management
# ─────────────────────────────────────────────────────────────────────────────

from typing import Literal
import resident_accounts


class ResidentCommand(BaseModel):
    model_config = {'extra': 'forbid'}
    expected_version: int = Field(ge=0)
    reason: str = Field(min_length=10, max_length=2000)

    @field_validator('reason')
    @classmethod
    def meaningful_reason(cls, value):
        if len(value.strip()) < 10: raise ValueError('Provide a reason of at least 10 characters.')
        return value.strip()


class ResidentStatusCommand(ResidentCommand):
    status: Literal['active','suspended','deactivated','inactive','pending']


class ResidentIdentityCommand(ResidentCommand):
    decision: Literal['approve','reject']
    reference: str = Field(min_length=3,max_length=255)

    @field_validator('reference')
    @classmethod
    def review_reference(cls,value):
        if len(value.strip()) < 3: raise ValueError('Provide the external review record reference.')
        return value.strip()


@router.get('/residents')
def list_residents(search: str = Query('',max_length=200), status: str = 'all', id_verification: str = 'all',
    page: int = Query(1,ge=1), page_size: int = Query(15,ge=1,le=100),
    pageSize: Optional[int] = Query(None,ge=1,le=100), show_test: bool = False,
    db: Session = Depends(get_db), admin: models.Official = Depends(admin_action('residents_view'))):
    return resident_accounts.list_accounts(db,admin,search,status,id_verification,page,pageSize or page_size)


@router.get('/residents/{resident_id}')
def resident_detail(resident_id: int, db: Session = Depends(get_db), admin: models.Official = Depends(admin_action('residents_view'))):
    return resident_accounts.project(db,admin,resident_accounts.target(db,admin,resident_id))


@router.get('/residents/{resident_id}/history')
def resident_history(resident_id: int,page: int = Query(1,ge=1),db: Session = Depends(get_db),admin: models.Official = Depends(admin_action('residents_view'))):
    return resident_accounts.history(db,admin,resident_id,page)


@router.patch('/residents/{resident_id}/status')
def update_resident_status(resident_id: int,payload: ResidentStatusCommand,db: Session = Depends(get_db),admin: models.Official = Depends(admin_action('residents_manage'))):
    return resident_accounts.set_status(db,admin,resident_id,payload)


@router.post('/residents/{resident_id}/resend-confirmation')
def resend_resident_confirmation(resident_id: int,payload: ResidentCommand,db: Session = Depends(get_db),admin: models.Official = Depends(admin_action('residents_manage'))):
    from main import send_otp_email
    return resident_accounts.send_confirmation(db,resident_accounts.target(db,admin,resident_id),send_otp_email,admin,payload)


@router.get('/residents/{resident_id}/verification')
def review_resident_id(resident_id: int,db: Session = Depends(get_db),admin: models.Official = Depends(admin_action('residents_view'))):
    return resident_accounts.inspect_identity(db,admin,resident_id)


@router.post('/residents/{resident_id}/verify')
def verify_resident_account(resident_id: int,payload: ResidentIdentityCommand,db: Session = Depends(get_db),admin: models.Official = Depends(admin_action('residents_manage'))):
    return resident_accounts.review_identity(db,admin,resident_id,payload)


# ─────────────────────────────────────────────────────────────────────────────
# 3. System Settings & Policies
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/settings")
def get_system_settings(
    db: Session = Depends(get_db),
    admin: models.Official = Depends(admin_action('settings_view')),
):
    import system_settings
    return system_settings.workspace(db,admin)


class SettingUpdateRequest(BaseModel):
    value: Dict[str,Any]
    expected_version: int = Field(ge=0)
    reason: str = Field(min_length=10,max_length=2000)
    source_reference: Optional[str] = Field(None,max_length=255)


@router.get('/settings/{key}/history')
def system_setting_history(key: str,page: int=Query(1,ge=1),db: Session=Depends(get_db),admin=Depends(admin_action('settings_view'))):
    import system_settings
    return system_settings.history(db,key,page)


@router.put("/settings/{key}")
def update_system_setting(
    key: str,
    payload: SettingUpdateRequest,
    db: Session = Depends(get_db),
    admin: models.Official = Depends(admin_action('settings_manage')),
):
    import system_settings
    return system_settings.save(db,admin,key,payload)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Audit Log & Integrity Check
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/audit-integrity")
def check_audit_integrity(
    db: Session = Depends(get_db),
    admin: models.Official = Depends(admin_action('audit_view')),
):
    """Report available log coverage without claiming cryptographic verification.

    Ordered database IDs cannot detect edited or deleted historical content.
    No signed checkpoint or hash-chain verifier is configured here.
    """
    total = db.query(func.count(gov_models.AuditLog.id)).scalar() or 0
    return {
        'status': 'Activity log available',
        'verification_status': 'not_configured',
        'is_healthy': None,
        'last_checked': datetime.now(timezone.utc).isoformat(),
        'last_verified': None,
        'total_audit_events': total,
        'verified_audit_events': 0,
        'integrity_score': None,
        'tamper_evident': False,
        'anomalies': [],
        'message': 'Activity entries are available. Historical integrity verification has not been configured.',
    }


@router.get("/audit-logs")
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: models.Official = Depends(admin_action('audit_view')),
):
    """Paginated list of system audit log entries for administrative compliance verification."""
    query = db.query(gov_models.AuditLog)
    total = query.count()
    logs = query.order_by(gov_models.AuditLog.id.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for l in logs:
        actor_name = l.actor.full_name if l.actor else "System Automated Engine"
        items.append({
            "id": l.id,
            "action": l.action,
            "trigger_type": l.trigger_type,
            "actor": actor_name,
            "actor_role": to_friendly_role(l.actor_role),
            "details": l.details,
            "timestamp": l.created_at.strftime("%b %d, %Y %I:%M:%S %p PHT") if l.created_at else "Recorded",
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }
