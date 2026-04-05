import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_pt():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'project_timelines';")
    cols = [c[0] for c in cur.fetchall()]
    print(f"Columns in project_timelines: {cols}")
    conn.close()

if __name__ == "__main__":
    check_pt()
