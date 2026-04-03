import sys
import os
sys.path.append('c:\\Apache24\\htdocs\\PULSO\\backend')

from database import SessionLocal
import analytics_service

db = SessionLocal()
try:
    print("Testing summary...")
    summary = analytics_service.get_analytics_summary(db)
    print("Summary keys:", summary.keys())
    print("Total reports:", summary.get("total_reports"))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
