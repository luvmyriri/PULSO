
from database import SessionLocal, engine
from models import User
import json

db = SessionLocal()
try:
    users = db.query(User).all()
    user_list = []
    for u in users:
        user_list.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "barangay": u.barangay
        })
    print(json.dumps(user_list, indent=2))
finally:
    db.close()
