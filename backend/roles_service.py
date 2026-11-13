from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session
import models

WORK_BUNDLE_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "intake_routing": {
        "key": "intake_routing",
        "label": "Intake & Routing",
        "description": "Verify incoming reports, classify concerns, request resident info, and route to engineering.",
    },
    "engineering_field": {
        "key": "engineering_field",
        "label": "Engineering & Field Execution",
        "description": "Execute assigned work orders, log field blockers, upload evidence, and submit work for review.",
    },
    "inspection_qa": {
        "key": "inspection_qa",
        "label": "Inspection & Quality Review",
        "description": "Conduct technical inspections, verify completion quality, and review asset maintenance needs.",
    },
    "records_disclosure": {
        "key": "records_disclosure",
        "label": "Records & Disclosure Governance",
        "description": "Manage official records, retention policies, and sourced budget/procurement reference disclosures.",
    },
    "executive_approvals": {
        "key": "executive_approvals",
        "label": "Executive Approvals & Publication",
        "description": "Final engineering sign-off, emergency overrides, and public announcement approval.",
    },
    "system_admin": {
        "key": "system_admin",
        "label": "System Administration",
        "description": "Staff accounts, role capabilities, audit logs, and platform configuration.",
    },
}

ROLE_TO_WORK_BUNDLES: Dict[str, List[str]] = {
    "system_admin": ["system_admin", "executive_approvals", "records_disclosure", "intake_routing", "engineering_field", "inspection_qa"],
    "admin": ["system_admin", "executive_approvals", "records_disclosure"],
    "manager": ["executive_approvals", "inspection_qa", "records_disclosure", "intake_routing", "engineering_field"],
    "supervisor": ["intake_routing", "engineering_field", "inspection_qa", "records_disclosure"],
    "dispatcher": ["intake_routing", "engineering_field"],
    "validator": ["intake_routing", "inspection_qa"],
    "inspector": ["inspection_qa", "engineering_field"],
    "agent": ["engineering_field"],
    "engineer": ["engineering_field", "inspection_qa"],
    "records_officer": ["records_disclosure"],
    "finance": ["records_disclosure"],
    "treasury": ["records_disclosure"],
    "bac_secretariat": ["records_disclosure"],
}

def get_user_capabilities(db: Session, user: Union[models.Official, models.Resident]) -> Dict[str, List[str]]:
    """
    Fetch the capabilities map for a user based on their dynamic role.
    If role isn't found in system_roles, returns fallback capabilities map.
    """
    # Residents have no capabilities by default unless handled elsewhere
    if not hasattr(user, 'role') or not user.role or user.role == "resident":
        return {}
    
    # Reconcile role_ref (defined on Official) and role_details (legacy alias)
    role_details = getattr(user, 'role_ref', None) or getattr(user, 'role_details', None)
    
    # Fallback: if relationship isn't populated or cache is stale
    if not role_details and db is not None:
        role_details = db.query(models.SystemRole).filter(models.SystemRole.name == user.role).first()
    
    if role_details and role_details.capabilities:
        return role_details.capabilities

    if hasattr(user, "capabilities") and isinstance(user.capabilities, dict):
        return user.capabilities

    return {}

def get_user_work_bundles(db: Session, user: Union[models.Official, models.Resident]) -> List[Dict[str, Any]]:
    """
    Resolve the functional permission bundles (work bundles) active for a government official.
    """
    if not hasattr(user, 'role') or not user.role or user.role == "resident":
        return []

    role_key = str(user.role).lower()
    bundle_keys = list(ROLE_TO_WORK_BUNDLES.get(role_key, ["engineering_field"]))

    caps = get_user_capabilities(db, user)
    if "admin" in caps or "staff" in caps:
        if "system_admin" not in bundle_keys:
            bundle_keys.append("system_admin")
    if "records" in caps or "documents" in caps:
        if "records_disclosure" not in bundle_keys:
            bundle_keys.append("records_disclosure")
    if "announcements" in caps or "projects" in caps:
        if "executive_approvals" not in bundle_keys:
            bundle_keys.append("executive_approvals")

    return [WORK_BUNDLE_DEFINITIONS[k] for k in bundle_keys if k in WORK_BUNDLE_DEFINITIONS]

def has_permission(db: Session, user: Union[models.Official, models.Resident], module: str, action: str) -> bool:
    """
    Fine-grained permission check.
    Example: has_permission(db, user, "records", "view")
    """
    if not isinstance(user, models.Official): return False
    explicit = (user.role_ref.capabilities or {}) if user.role_ref else {}
    if module in explicit:
        grant = explicit[module]
        return isinstance(grant, list) and (action in grant or '*' in grant)
    # The fallback Official.capabilities property gives platform admins '*'.
    # Domain grants come only from the stored role, never that fallback.
    if module in {'analytics','reports','procurement'}:
        if not isinstance(user,models.Official): return False
        ref = user.role_ref
        grants = (ref.capabilities or {}).get(module,[]) if ref else []
        return isinstance(grants,list) and (action in grants or '*' in grants)
    if hasattr(user, 'role') and user.role in ["system_admin", "admin", "manager"]:
        return True
        
    caps = get_user_capabilities(db, user)
    if "admin" in caps and "*" in caps.get("admin", []):
        return True

    module_caps = caps.get(module, [])
    
    # Handle both list format ["view", "edit"] and potentially "*" for all
    if "*" in module_caps:
        return True
        
    return action in module_caps

def assert_permission(db: Session, user: Union[models.Official, models.Resident], module: str, action: str):
    """Raises 403 if permission is missing."""
    from fastapi import HTTPException
    if not has_permission(db, user, module, action):
        raise HTTPException(
            status_code=403,
            detail=f"Access Denied: Missing '{module}:{action}' capability."
        )

def get_all_roles(db: Session, include_templates: bool = False):
    query = db.query(models.SystemRole)
    if not include_templates:
        query = query.filter(models.SystemRole.is_template == False)
    return query.all()

def get_templates(db: Session):
    return db.query(models.SystemRole).filter(models.SystemRole.is_template == True).all()
