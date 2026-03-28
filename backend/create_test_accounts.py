from database import SessionLocal
import models
import auth

db = SessionLocal()

test_users = [
    {
        "email": "resident@pulso.com",
        "full_name": "Test Resident",
        "role": "resident",
        "password": "password123",
        "barangay": "174",
        "address": "123 Test Street",
        "trust_score": 100
    },
    {
        "email": "dispatcher@pulso.com",
        "full_name": "Test Dispatcher",
        "role": "dispatcher",
        "password": "password123",
         "barangay": "174",
        "address": "City Hall",
        "trust_score": 100
    },
    {
        "email": "manager@pulso.com",
        "full_name": "Test Manager",
        "role": "manager",
        "password": "password123",
        "barangay": "174",
        "address": "City Hall",
        "trust_score": 100
    }
]

for user_data in test_users:
    existing_user = db.query(models.User).filter(models.User.email == user_data["email"]).first()
    if not existing_user:
        hashed_password = auth.get_password_hash(user_data["password"])
        new_user = models.User(
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            password_hash=hashed_password,
            address=user_data["address"],
            barangay=user_data["barangay"],
            trust_score=user_data["trust_score"]
        )
        db.add(new_user)
        print(f"Created {user_data['role']} account: {user_data['email']}")
    else:
        # Update existing user's password just to be sure
        existing_user.password_hash = auth.get_password_hash(user_data["password"])
        print(f"Updated password for existing {user_data['role']} account: {user_data['email']}")

db.commit()
db.close()
print("Test accounts ready!")
