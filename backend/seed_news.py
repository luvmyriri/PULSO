import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import models
from database import SessionLocal, engine

def seed_news():
    print("Ensuring database tables exist...")
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_count = db.query(models.NewsItem).count()
        print(f"Current news items in database: {existing_count}")

        if existing_count > 0:
            print("News items already present. Skipping re-seed.")
            return

        now = datetime.now(timezone.utc)

        sample_news = [
            models.NewsItem(
                category="Advisories",
                priority="urgent",
                headline="Emergency Maynilad Pipeline Repair: Temporary Water Interruption",
                excerpt="Emergency repair of 600mm distribution pipe along Zabarte Road. Temporary water service interruption affects Brgy. 171, 175, and 178 until 6:00 PM today. Water delivery tankers deployed.",
                barangay="Brgy. 171 / 175 / 178",
                image_url="/engineering-logo.jpg",
                source_url="https://caloocancity.gov.ph",
                posted_by="Engr. R. Ramos (City Engineering Dept)",
                published_at=now - timedelta(hours=2)
            ),
            models.NewsItem(
                category="Infrastructure",
                priority="normal",
                headline="Major Asphalt Overlay & Drainage Rehabilitation Along Samson Road",
                excerpt="City Engineering road maintenance crews have initiated Phase 2 asphalt resurfacing and box culvert expansion along the Samson Road corridor to prevent seasonal monsoon flooding.",
                barangay="Brgy. 73 / 77 / 80",
                image_url="/attractions/monumento.jpg",
                source_url="https://caloocancity.gov.ph",
                posted_by="Public Works Division",
                published_at=now - timedelta(hours=6)
            ),
            models.NewsItem(
                category="Events",
                priority="normal",
                headline="Caloocan Mega Civic Job Fair & Skills Registration at Sports Complex",
                excerpt="Over 45 accredited employers offering 2,500+ local government and engineering technician openings. Free NBI clearance, SSS, and PhilHealth assistance desks available onsite.",
                barangay="Bagumbong, North Caloocan",
                image_url="/attractions/city_hall.jpg",
                source_url="https://caloocancity.gov.ph",
                posted_by="Caloocan PESO & LGU",
                published_at=now - timedelta(hours=18)
            ),
            models.NewsItem(
                category="Advisories",
                priority="normal",
                headline="PULSO 24/7 Rapid Pothole & Streetlight Repair Protocol Activated",
                excerpt="City Maintenance crews now operate on accelerated 24-hour response cycles for all verified streetlight outages and road hazard tickets submitted through the PULSO citizen desk.",
                barangay="All 188 Barangays",
                image_url="/engineering-logo.jpg",
                source_url="https://caloocancity.gov.ph",
                posted_by="Office of the City Mayor",
                published_at=now - timedelta(days=1, hours=4)
            ),
            models.NewsItem(
                category="Infrastructure",
                priority="normal",
                headline="Smart LED Streetlight Modernization: Phase 3 Completed in District 1",
                excerpt="350 high-efficiency solar-backed LED fixtures installed across Camarin, improving nighttime visibility and reducing municipal public works energy consumption by 40%.",
                barangay="Brgy. 165 - 170",
                image_url="/attractions/ucc.jpg",
                source_url="https://caloocancity.gov.ph",
                posted_by="Electrical Engineering Division",
                published_at=now - timedelta(days=2)
            ),
        ]

        db.add_all(sample_news)
        db.commit()
        print(f"Successfully seeded {len(sample_news)} Caloocan City News items!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding news: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_news()
