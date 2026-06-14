from sqlalchemy import create_engine, text
import json

engine = create_engine('postgresql://postgres:0428@localhost/pulso_db')
with engine.connect() as conn:
    print("--- Status Counts ---")
    res = conn.execute(text("SELECT status, count(*) FROM reports GROUP BY status"))
    for row in res:
        print(row)

    print("\n--- Unvalidated Reports with NULL Coords ---")
    res = conn.execute(text("SELECT count(*) FROM reports WHERE status = 'unvalidated' AND (location_lat IS NULL OR location_lng IS NULL)"))
    print(res.fetchone())

    print("\n--- Unvalidated Reports Created At range ---")
    res = conn.execute(text("SELECT MIN(created_at), MAX(created_at) FROM reports WHERE status = 'unvalidated'"))
    print(res.fetchone())

    print("\n--- Sample Unvalidated Report ---")
    res = conn.execute(text("SELECT id, ticket_id, category, status, location_lat, location_lng FROM reports WHERE status = 'unvalidated' LIMIT 5"))
    for row in res:
        print(row)
