import os
import sys
import json
# Add backend to path
sys.path.append(r'c:\Apache24\htdocs\PULSO\backend')
from database import SessionLocal
import analytics_service

def check_clustering():
    db = SessionLocal()
    try:
        clusters = analytics_service.get_infrastructure_clusters(db, days_back=90)
        print(f"Total Clusters: {len(clusters)}")
        for c in clusters:
            print(f"Cluster in {c['barangay']} | Category: {c['dominant_category']} | Reports: {c['report_count']}")
            print(f"  Centroid: {c['centroid_lat']}, {c['centroid_lng']}")
            print(f"  Threat Level: {c['threat_level']}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_clustering()
