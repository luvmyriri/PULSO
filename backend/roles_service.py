from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session
import models

def get_user_capabilities(db: Session, user: Union[models.Official, models.Resident]) -> Dict[str, List[str]]:
    """
    Fetch the capabilities map for a user based on their dynamic role.
    If role isn't found in system_roles, returns empty map.
    """
    # Residents have no capabilities by default unless handled elsewhere
    if not hasattr(user, 'role') or not user.role or user.role == "resident":
        return {}
    
    # We can use the viewonly relationship defined in models.py
    role_details = getattr(user, 'role_details', None)
    
    # Fallback: if relationship isn't populated or cache is stale
    if not role_details:
        role_details = db.query(models.SystemRole).filter(models.SystemRole.name == user.role).first()
    
    if not role_details:
        return {}
        
    return role_details.capabilities or {}

def has_permission(db: Session, user: Union[models.Official, models.Resident], module: str, action: str) -> bool:
    """
    Fine-grained permission check.
    Example: has_permission(db, user, "records", "view")
    """
    # System Admin and Managers bypass checks for LGU modules
    if hasattr(user, 'role') and user.role in ["system_admin", "manager"]:
        return True
        
    caps = get_user_capabilities(db, user)
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
