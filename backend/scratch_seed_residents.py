from database import SessionLocal
import models
import auth
from sqlalchemy import text

db = SessionLocal()

RESIDENTS = [
    "vjlamsenlamsen28@gmail.com",
    "alexismarc066@gmail.com",
    "gene.tabios13@gmail.com",
    "garciamarc1900@gmail.com"
]

def seed_residents():
    print("=" * 60)
    print("  PULSO — Seeding Requested Residents")
    print("=" * 60)

    # 1. Truncate residents table (CASCADE removed because it might affect reports, but here we want fresh start)
    print("  [INIT] Truncating residents table...")
    db.execute(text("TRUNCATE TABLE residents RESTART IDENTITY CASCADE"))
    db.commit()

    created = 0
    password = "Pulso@2025!"
    hashed = auth.get_password_hash(password)

    for email in RESIDENTS:
        new_res = models.Resident(
            email=email,
            full_name=email.split("@")[0].replace(".", " ").title(),
            password_hash=hashed,
            phone_number="09170000000",
            address="Caloocan City",
            is_verified=True,
            kyc_level="Gold (PSA Verified)",
            trust_score=100
        )
        db.add(new_res)
        print(f"  [CREATE] Resident: {email}")
        created += 1

    db.commit()
    return created

if __name__ == "__main__":
    try:
        count = seed_residents()
        print(f"\n  Done! Created: {count} residents.")
    except Exception as e:
        print(f"\n  [ERROR] Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()
