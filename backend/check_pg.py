import psycopg2

conn = psycopg2.connect('postgresql://postgres:0428@localhost/pulso_db')
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'reports'")
print('Reports columns:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'process_timelines'")
print('Timeline columns:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs'")
print('Audit columns:', [r[0] for r in cur.fetchall()])