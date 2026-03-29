import psycopg2
import os

# From database.py: postgresql://postgres:0428@localhost/pulso_db
try:
    conn = psycopg2.connect("dbname='pulso_db' user='postgres' password='0428' host='localhost'")
    cursor = conn.cursor()

    email = 'tabios.gcncbssis2023@gmail.com'
    cursor.execute("SELECT id, email, is_verified, verification_code FROM users WHERE email = %s", (email,))
    results = cursor.fetchall()

    print(f"Checking {email}:")
    if results:
        for row in results:
            print(f"ID: {row[0]}, Email: {row[1]}, Verified: {row[2]}, Code: {row[3]}")
    else:
        print("Email not found in database.")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
