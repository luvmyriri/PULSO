import psycopg2

conn = psycopg2.connect('postgresql://postgres:0428@localhost/pulso_db')
cur = conn.cursor()
cur.execute("SELECT status, COUNT(*) FROM reports GROUP BY status")
print('Status counts:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')