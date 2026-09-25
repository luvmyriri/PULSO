import sqlite3
import psycopg2

sqlite_conn = sqlite3.connect('pulso.db')
sqlite_cur = sqlite_conn.cursor()
pg_conn = psycopg2.connect('postgresql://postgres:0428@localhost/pulso_db')
pg_cur = pg_conn.cursor()

# Get valid IDs
pg_cur.execute("SELECT id FROM officials")
valid_officials = {r[0] for r in pg_cur.fetchall()}
pg_cur.execute("SELECT id FROM work_orders")
valid_wos = {r[0] for r in pg_cur.fetchall()} if pg_cur.rowcount > 0 else set()
pg_cur.execute("SELECT id FROM project_requests")
valid_projects = {r[0] for r in pg_cur.fetchall()} if pg_cur.rowcount > 0 else set()

print(f"Valid: officials={len(valid_officials)}, WOs={len(valid_wos)}, projects={len(valid_projects)}")

# Migrate Reports
print("\nMigrating Reports...")
sqlite_cur.execute("SELECT * FROM reports")
rows = sqlite_cur.fetchall()
sqlite_cur.execute("PRAGMA table_info(reports)")
cols = [col[1] for col in sqlite_cur.fetchall()]

for row in rows:
    data = dict(zip(cols, row))
    placeholders = ','.join(['%s'] * len(cols))
    sql = f"""INSERT INTO reports ({','.join(cols)}) VALUES ({placeholders})
              ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at"""
    pg_cur.execute(sql, list(data.values()))

pg_conn.commit()
print(f"Migrated {len(rows)} reports")

# Migrate Process Timelines
print("\nMigrating Process Timelines...")
sqlite_cur.execute("SELECT * FROM process_timelines")
rows = sqlite_cur.fetchall()
sqlite_cur.execute("PRAGMA table_info(process_timelines)")
cols = [col[1] for col in sqlite_cur.fetchall()]

for row in rows:
    data = dict(zip(cols, row))
    data['is_public'] = bool(data.get('is_public', 0))
    
    # Fix actor_id
    if data.get('actor_id') and data['actor_id'] not in valid_officials:
        data['actor_id'] = 1
    elif not data.get('actor_id'):
        data['actor_id'] = 1
    
    # Fix work_order_id
    if data.get('work_order_id') and data['work_order_id'] not in valid_wos:
        data['work_order_id'] = None
    
    # Fix project_id
    if data.get('project_id') and data['project_id'] not in valid_projects:
        data['project_id'] = None
    
    placeholders = ','.join(['%s'] * len(cols))
    sql = f"INSERT INTO process_timelines ({','.join(cols)}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING"
    pg_cur.execute(sql, list(data.values()))

pg_conn.commit()
print(f"Migrated {len(rows)} timeline entries")

# Migrate Audit Logs
print("\nMigrating Audit Logs...")
sqlite_cur.execute("SELECT * FROM audit_logs")
rows = sqlite_cur.fetchall()
sqlite_cur.execute("PRAGMA table_info(audit_logs)")
cols = [col[1] for col in sqlite_cur.fetchall()]

for row in rows:
    data = dict(zip(cols, row))
    
    if data.get('actor_id') and data['actor_id'] not in valid_officials:
        data['actor_id'] = 1
    elif not data.get('actor_id'):
        data['actor_id'] = 1
    
    if data.get('work_order_id') and data['work_order_id'] not in valid_wos:
        data['work_order_id'] = None
    
    if data.get('project_id') and data['project_id'] not in valid_projects:
        data['project_id'] = None
    
    placeholders = ','.join(['%s'] * len(cols))
    sql = f"INSERT INTO audit_logs ({','.join(cols)}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING"
    pg_cur.execute(sql, list(data.values()))

pg_conn.commit()
print(f"Migrated {len(rows)} audit logs")

# Verify
print("\n=== VERIFICATION ===")
pg_cur.execute("SELECT COUNT(*) FROM reports")
print(f"Reports: {pg_cur.fetchone()[0]}")
pg_cur.execute("SELECT COUNT(*) FROM process_timelines")
print(f"Timelines: {pg_cur.fetchone()[0]}")
pg_cur.execute("SELECT COUNT(*) FROM audit_logs")
print(f"Audit Logs: {pg_cur.fetchone()[0]}")

print("\n=== Recent Timeline Entries ===")
pg_cur.execute("SELECT id, status, report_id, created_at FROM process_timelines ORDER BY id DESC LIMIT 5")
for r in pg_cur.fetchall():
    print(f"  {r}")

sqlite_conn.close()
pg_conn.close()
print("\nMigration complete!")