import psycopg2

conn = psycopg2.connect('postgresql://postgres:0428@localhost/pulso_db')
cur = conn.cursor()

# Fix sequences
cur.execute("SELECT setval('audit_logs_id_seq', (SELECT MAX(id) FROM audit_logs))")
cur.execute("SELECT setval('process_timelines_id_seq', (SELECT MAX(id) FROM process_timelines))")

conn.commit()
print("Sequences fixed!")

# Test
cur.execute("SELECT MAX(id) FROM audit_logs")
print(f"Audit max ID: {cur.fetchone()[0]}")
cur.execute("SELECT MAX(id) FROM process_timelines")
print(f"Timeline max ID: {cur.fetchone()[0]}")