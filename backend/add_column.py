from database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE reports ADD COLUMN resolution_image_url VARCHAR;"))
        conn.commit()
    print("Column added successfully.")
except Exception as e:
    print("Error:", e)
