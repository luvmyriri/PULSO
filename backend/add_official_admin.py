from database import SessionLocal
import models
import auth

def add_admin():
    db = SessionLocal()
    email = "vjlamsenlamsen28@gmail.com"
    
    # Check if exists in Officials table
    existing = db.query(models.Official).filter(models.Official.email == email).first()
    if existing:
        print(f"Official {email} already exists. Updating to system_admin...")
        existing.role = "system_admin"
        db.commit()
    else:
        print(f"Creating new system_admin account for {email}...")
        new_user = models.Official(
            email=email,
            full_name="PULSO Authorized Official",
            role="system_admin",
            password_hash=auth.get_password_hash("Official@pulso2025!"),
            address="PULSO Command Center, Caloocan City",
            barangay="City Hall",
            phone_number="09170000000",
            account_type="government"
        )
        db.add(new_user)
        db.commit()
    
    db.close()
    print(f"SUCCESS: {email} is now a registered System Admin.")

if __name__ == "__main__":
    add_admin()