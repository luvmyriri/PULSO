import sqlite3
import os

db_path = 'pulso.db'
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = 'tabios.gcncbssis2023@gmail.com'
cursor.execute("SELECT id, email, is_verified, verification_code FROM users WHERE email = ?", (email,))
results = cursor.fetchall()

print(f"Checking {email}:")
if results:
    for row in results:
        print(f"ID: {row[0]}, Email: {row[1]}, Verified: {row[2]}, Code: {row[3]}")
else:
    print("Email not found in database.")

conn.close()
