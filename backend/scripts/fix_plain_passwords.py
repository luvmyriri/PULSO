"""
Fix plain text passwords in database
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User
import auth

db = SessionLocal()

# Find users with plain_password
users = db.query(User).filter(User.password_hash == "plain_password").all()
print(f"Found {len(users)} users with plain_password")

for u in users:
    # Use different passwords based on email
    if "city.engineer" in u.email:
        u.password_hash = auth.get_password_hash("CEO@pulso2025!")
    elif "@pulso.system" in u.email:
        u.password_hash = auth.get_password_hash("SysAdmin@pulso2025!")
    else:
        u.password_hash = auth.get_password_hash("test123")
    print(f"  Fixed: {u.email}")

db.commit()
db.close()
print("Done!")