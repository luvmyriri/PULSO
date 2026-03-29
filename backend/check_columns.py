import psycopg2

try:
    conn = psycopg2.connect("dbname='pulso_db' user='postgres' password='0428' host='localhost'")
    cursor = conn.cursor()

    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'")
    columns = cursor.fetchall()
    
    print("Table: users")
    for col in columns:
        print(f"- {col[0]} ({col[1]})")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
