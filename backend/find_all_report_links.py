import os
import psycopg2
from dotenv import load_dotenv

# Absolute Path to project root
PROJECT_ROOT = r"C:\Apache24\htdocs\PULSO"

# Load environment
load_dotenv(os.path.join(PROJECT_ROOT, "backend", ".env"))
DATABASE_URL = os.getenv("DATABASE_URL")

def find_targets():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # This finds ANY column that might link to reports
    sql = """
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND (column_name LIKE '%report_id%' OR column_name = 'source_report_id' OR column_name = 'report_id');
    """
    cur.execute(sql)
    results = cur.fetchall()
    
    print("Potential dependencies found:")
    for table, col in results:
        print(f"Table: {table}, Column: {col}")
    
    conn.close()

if __name__ == "__main__":
    find_targets()
