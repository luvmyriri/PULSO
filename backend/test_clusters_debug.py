import sys
import os
sys.path.append('c:\\Apache24\\htdocs\\PULSO\\backend')

from database import SessionLocal
import analytics_service

db = SessionLocal()
try:
    print("Testing clusters...")
    clusters = analytics_service.get_infrastructure_clusters(db)
    print(f"Clusters found: {len(clusters)}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
