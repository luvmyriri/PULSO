import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
load_dotenv('backend/.env')

from database import SessionLocal
import models

def update_images():
    db = SessionLocal()
    try:
        items = db.query(models.NewsItem).all()
        
        updates = {
            "Emergency Maynilad Pipeline Repair: Temporary Water Interruption": "/news/water_repair.jpg",
            "Major Asphalt Overlay & Drainage Rehabilitation Along Samson Road": "/news/asphalt.jpg",
            "Caloocan Mega Civic Job Fair & Skills Registration at Sports Complex": "/news/job_fair.jpg",
            "PULSO 24/7 Rapid Pothole & Streetlight Repair Protocol Activated": "/news/night_repair.jpg",
            "Smart LED Streetlight Modernization: Phase 3 Completed in District 1": "/news/led_streetlight.jpg"
        }
        
        for item in items:
            if item.headline in updates:
                item.image_url = updates[item.headline]
                
        db.commit()
        print("Successfully updated news images to local paths!")
    except Exception as e:
        db.rollback()
        print(f"Error updating images: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_images()
