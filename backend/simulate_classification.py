import sys
import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DATABASE_URL
import models

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def simulate_classification():
    db = SessionLocal()
    CLASSIFICATIONS = [
        {"label": "Roads & Infrastructure",       "keywords": ["road", "roads", "pothole", "potholes", "bridge", "pavement", "asphalt", "sidewalk", "infrastructure"]},
        {"label": "Water & Drainage",              "keywords": ["water", "drain", "drainage", "flood", "flooding", "leak", "pipe", "sewage", "canal", "clog"]},
        {"label": "Electrical & Street Lighting",  "keywords": ["electric", "electrical", "light", "lighting", "lamp", "wire", "post", "power", "dark", "bulb", "pole"]},
        {"label": "Public Safety & Hazards",       "keywords": ["safety", "hazard", "hazardous", "collapse", "tree", "trees", "danger", "dangerous", "obstacle", "risk", "garbage"]},
        {"label": "Public Facilities & Others",    "keywords": ["facility", "facilities", "building", "park", "playground", "library", "school", "structural"]},
    ]
    
    # Matching logic exactly from gov_crud.py
    all_reports_raw = db.query(models.Report.id, models.Report.category, models.Report.status, models.Report.ai_category).all()
    
    for cls in CLASSIFICATIONS:
        total_cls = 0
        resolved_cls = 0
        matching_ids = []
        
        for r_id, category, status, ai_cat in all_reports_raw:
            if status == "cancelled": continue
            
            combined_text = f"{category or ''} {ai_cat or ''}".lower()
            if any(re.search(rf"\b{re.escape(kw)}\b", combined_text) for kw in cls["keywords"]):
                total_cls += 1
                matching_ids.append(r_id)
                if status == "resolved":
                    resolved_cls += 1
        
        print(f"Classification: {cls['label']}")
        print(f"  Total: {total_cls}, Resolved: {resolved_cls}")
        print(f"  Matching Report IDs: {matching_ids}")
        print("-" * 20)
    
    db.close()

if __name__ == "__main__":
    simulate_classification()
