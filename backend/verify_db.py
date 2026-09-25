from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT viewname FROM pg_views WHERE schemaname = 'public'"))
    print("Views:", [r[0] for r in result])
    
    result = conn.execute(text("SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'"))
    print("Materialized Views:", [r[0] for r in result])
    
    result = conn.execute(text("SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%'"))
    print("Indexes:", [r[0] for r in result])
