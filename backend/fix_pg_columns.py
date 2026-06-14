import psycopg2
conn = psycopg2.connect('postgresql://postgres:0428@localhost/pulso_db')
cur = conn.cursor()
cur.execute("ALTER TABLE project_requests ADD COLUMN source_report_id INTEGER")
conn.commit()
print('Added source_report_id column')
cur.close()
conn.close()
