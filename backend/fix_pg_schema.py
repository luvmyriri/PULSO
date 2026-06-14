import psycopg2

conn = psycopg2.connect('postgresql://postgres:0428@localhost/pulso_db')
cur = conn.cursor()

# Add missing columns to reports table
cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2)")
cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS deployment_date TIMESTAMP WITH TIME ZONE")

# Add index on status for better performance
cur.execute("CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON reports(updated_at DESC)")

conn.commit()
print("Database schema updated successfully")

# Verify
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'reports'")
print('Updated columns:', [r[0] for r in cur.fetchall()])