from database import SessionLocal
import models
import auth

db = SessionLocal()

test_accounts = {
    "residents": [
        {
            "email": "resident@pulso.com",
            "full_name": "Test Resident",
            "password": "password123",
            "barangay": "174",
            "address": "123 Test Street",
            "trust_score": 100
        }
    ],
    "officials": [
        {
            "email": "dispatcher@pulso.gov",
            "full_name": "Caloocan Central Dispatcher",
            "role": "dispatcher",
            "password": "password123",
            "barangay": "174",
            "address": "City Engineering Office, Caloocan City Hall"
        },
        {
            "email": "dispatcher@pulso.com",
            "full_name": "Test Dispatcher",
            "role": "dispatcher",
            "password": "password123",
            "barangay": "174",
            "address": "City Hall"
        },
        {
            "email": "manager@pulso.com",
            "full_name": "Test Manager",
            "role": "system_admin",
            "password": "password123",
            "barangay": "174",
            "address": "City Hall"
        }
    ]
}

# Create residents
for user_data in test_accounts["residents"]:
    existing = db.query(models.Resident).filter(models.Resident.email == user_data["email"]).first()
    if not existing:
        hashed = auth.get_password_hash(user_data["password"])
        new_user = models.Resident(
            email=user_data["email"],
            full_name=user_data["full_name"],
            password_hash=hashed,
            address=user_data["address"],
            phone_number="09170000000",
            trust_score=user_data["trust_score"],
            is_verified=True
        )
        db.add(new_user)
        print(f"Created resident: {user_data['email']}")
    else:
        existing.password_hash = auth.get_password_hash(user_data["password"])
        print(f"Updated resident: {user_data['email']}")

# Create officials
for user_data in test_accounts["officials"]:
    existing = db.query(models.Official).filter(models.Official.email == user_data["email"]).first()
    if not existing:
        hashed = auth.get_password_hash(user_data["password"])
        new_user = models.Official(
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            password_hash=hashed,
            address=user_data["address"],
            barangay=user_data["barangay"],
            phone_number="09170000000",
            account_type="government"
        )
        db.add(new_user)
        print(f"Created official ({user_data['role']}): {user_data['email']}")
    else:
        existing.password_hash = auth.get_password_hash(user_data["password"])
        print(f"Updated official: {user_data['email']}")

db.commit()
db.close()
print("Test accounts ready!")