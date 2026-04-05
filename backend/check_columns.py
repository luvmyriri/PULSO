import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_columns(table):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}';")
    cols = cur.fetchall()
    print(f"Columns in {table}:", [c[0] for c in cols])
    conn.close()

if __name__ == "__main__":
    check_columns('dispatch_status_updates')
    check_columns('audit_logs')
    check_columns('process_timeline')
    check_columns('work_orders')
    check_columns('reports')
