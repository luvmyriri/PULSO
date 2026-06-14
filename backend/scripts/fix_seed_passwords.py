"""
Fix seed user passwords - hashes them properly
"""
import sys
import os

# Add backend to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from database import SessionLocal
from models import User
import auth

db = SessionLocal()

# Get all users with the dummy hash
users = db.query(User).filter(User.password_hash == "$2b$12$dummy_hash_for_seeding").all()
print(f"Found {len(users)} users with dummy hash")

for u in users:
    u.password_hash = auth.get_password_hash("test123")

db.commit()
db.close()

print("Updated all seed users with password: test123")