import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def find_fks():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    sql = """
    SELECT
        conrelid::regclass AS table_name,
        a.attname AS column_name
    FROM
        pg_constraint AS c
    JOIN
        pg_attribute AS a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE
        confrelid = 'reports'::regclass;
    """
    cur.execute(sql)
    fks = cur.fetchall()
    print("Tables referencing reports:")
    for table, col in fks:
        print(f"Table: {table}, Column: {col}")
    conn.close()

if __name__ == "__main__":
    find_fks()
