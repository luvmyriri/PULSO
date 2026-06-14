
from database import engine, SessionLocal
import models
import json

def migrate():
    print("  Creating SystemRole table...")
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # ─────────────────────────────────────────────────────────────────────────────
    # CAPABILITY DEFINITIONS
    # ─────────────────────────────────────────────────────────────────────────────
    # Modules: records, analytics, procurement, obo, admin, ops, maintenance
    # Actions: view, create, edit, delete, approve, manage
    
    full_access = {
        "records": ["view", "create", "edit", "delete"],
        "analytics": ["view"],
        "procurement": ["view", "apply", "approve", "manage"],
        "obo": ["view", "inspect", "approve"],
        "admin": ["users", "roles", "audit", "settings"],
        "ops": ["dashboard", "dispatch", "timeline", "advisories"],
        "maintenance": ["view", "manage"],
        "predictive": ["view", "manage"]
    }
    
    staff_access = {
        "ops": ["dashboard", "timeline"],
        "maintenance": ["view"]
    }
    
    admin_access = {
        "records": ["view", "create", "edit"],
        "admin": ["users", "roles", "audit"],
        "ops": ["dashboard", "advisories"]
    }
    
    engineer_access = {
        "records": ["view", "create"], # As requested: Engineers can see records
        "ops": ["dashboard", "dispatch", "timeline"],
        "procurement": ["view", "apply"],
        "maintenance": ["view", "manage"],
        "predictive": ["view"]
    }
    
    inspector_access = {
        "obo": ["view", "inspect"],
        "ops": ["dashboard"]
    }

    # ─────────────────────────────────────────────────────────────────────────────
    # ROLES TO SEED
    # ─────────────────────────────────────────────────────────────────────────────
    ROLES = [
        # Executive
        {"name": "city_engineer", "label": "City Engineer", "caps": full_access, "level": "executive"},
        {"name": "asst_city_engineer", "label": "Asst. City Engineer", "caps": full_access, "level": "executive"},
        
        # Admin
        {"name": "admin_officer", "label": "Administrative Officer", "caps": admin_access, "level": "admin"},
        {"name": "admin_clerk", "label": "Administrative Clerk", "caps": {"ops": ["dashboard"], "records": ["view"]}, "level": "staff"},
        {"name": "records_officer", "label": "Records Officer", "caps": {"records": ["view", "create", "edit"]}, "level": "staff"},
        
        # Engineers
        {"name": "division_chief", "label": "Division Chief", "caps": engineer_access, "level": "senior"},
        {"name": "design_engineer", "label": "Design Engineer", "caps": {"ops": ["dashboard"], "maintenance": ["view"]}, "level": "staff"},
        {"name": "project_engineer", "label": "Project Engineer", "caps": engineer_access, "level": "staff"},
        {"name": "estimator", "label": "Estimator / QS", "caps": {"ops": ["dashboard"], "procurement": ["view", "apply"]}, "level": "staff"},
        {"name": "cad_operator", "label": "CAD Operator", "caps": {"ops": ["dashboard"]}, "level": "staff"},
        
        # Field / Maintenance
        {"name": "construction_foreman", "label": "Construction Foreman", "caps": staff_access, "level": "staff"},
        {"name": "field_worker", "label": "Field Worker", "caps": staff_access, "level": "staff"},
        {"name": "dispatcher", "label": "Dispatcher", "caps": {"ops": ["dashboard", "dispatch", "timeline"]}, "level": "staff"},
        
        # Inspectors
        {"name": "building_inspector", "label": "Building Inspector", "caps": inspector_access, "level": "staff"},
        {"name": "electrical_inspector", "label": "Electrical Inspector", "caps": inspector_access, "level": "staff"},
        {"name": "mechanical_inspector", "label": "Mechanical Inspector", "caps": inspector_access, "level": "staff"},
        
        # System
        {"name": "system_admin", "label": "System Administrator", "caps": full_access, "level": "admin"},
        {"name": "manager", "label": "Manager", "caps": full_access, "level": "admin"},
    ]
    
    # ─────────────────────────────────────────────────────────────────────────────
    # TEMPLATES
    # ─────────────────────────────────────────────────────────────────────────────
    TEMPLATES = [
        {"name": "template_executive", "label": "Executive Template", "caps": full_access, "level": "executive", "is_template": True},
        {"name": "template_senior", "label": "Senior Officer Template", "caps": engineer_access, "level": "senior", "is_template": True},
        {"name": "template_staff", "label": "Standard Staff Template", "caps": staff_access, "level": "staff", "is_template": True},
        {"name": "template_admin", "label": "Admin Template", "caps": admin_access, "level": "admin", "is_template": True},
    ]

    for r in ROLES + TEMPLATES:
        existing = db.query(models.SystemRole).filter(models.SystemRole.name == r["name"]).first()
        if not existing:
            new_role = models.SystemRole(
                name=r["name"],
                label=r["label"],
                capabilities=r["caps"],
                access_level=r["level"],
                is_template=r.get("is_template", False)
            )
            db.add(new_role)
            print(f"  [SEED] {r['name']}")
        else:
            existing.capabilities = r["caps"]
            existing.label = r["label"]
            existing.access_level = r["level"]
            existing.is_template = r.get("is_template", False)
            print(f"  [UPDATE] {r['name']}")

    db.commit()
    db.close()
    print("  Migration complete.")

if __name__ == "__main__":
    migrate()
