import psycopg2

conn = psycopg2.connect('postgresql://postgres:0428@localhost/pulso_db')
cur = conn.cursor()

# Add remaining missing columns
cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS citizen_confirmed_at TIMESTAMP WITH TIME ZONE")
cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER")
cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS citizen_feedback_note TEXT")

conn.commit()
print("Additional columns added successfully")

# Verify
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'reports'")
print('All columns:', [r[0] for r in cur.fetchall()])