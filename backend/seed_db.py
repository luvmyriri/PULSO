from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, schemas

models.Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    
    # Check if we already seeded
    if db.query(models.Advisory).first():
        print("Database already seeded!")
        return
        
    # Seed Advisories
    advisories = [
        models.Advisory(
            advisory_id='PUB-4029',
            category='Public Works',
            title='Road Maintenance: Phase 1 Main Avenue',
            department='City Engineering Dept.',
            description='Please be advised that road milling and asphalt overlay operations will commence on Phase 1 Main Avenue starting tomorrow, 8:00 PM until 4:00 AM. Expect moderate to heavy traffic. Motorists are advised to take alternate routes.',
            priority='high',
            has_image=True,
            image_url='https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80',
            stats_views=1205,
            stats_affected='2,500 residents'
        ),
        models.Advisory(
            advisory_id='PUB-4028',
            category='Utilities',
            title='Water Service Interruption Notice',
            department='Maynilad Water Services',
            description='Emergency leak repair at the primary transmission line affecting Zones 10 to 15. Water service interruption will begin at 1:00 PM today. Estimated restoration time is 10:00 PM. We apologize for the inconvenience.',
            priority='medium',
            has_image=False,
            stats_views=3400,
            stats_affected='15,000 residents'
        ),
        models.Advisory(
            advisory_id='PUB-4025',
            category='Advisory',
            title='Suspension of Classes and Government Work',
            department="LGU Caloocan North (Mayor's Office)",
            description='Due to the continuous heavy rainfall and expected flooding brought by the southwest monsoon, all levels of public and private schools, as well as local government work in Caloocan North, are suspended today. Emergency services remain operational. Stay safe.',
            priority='critical',
            has_image=False,
            stats_views=12500,
            stats_affected='City-wide'
        )
    ]
    
    # Seed a Demo User
    demo_user = models.User(
        full_name='Gener Dela Cruz',
        email='gener.delacruz@example.com',
        password_hash='dummy_hash',
        role='resident',
        address='Blk 5 Lot 12',
        barangay='Bagong Silang (176)',
        trust_score=98
    )
    
    db.add_all(advisories)
    db.add(demo_user)
    db.commit()
    
    # Seed a Demo Report
    demo_report = models.Report(
        ticket_id='RPT-8291',
        user_id=demo_user.id,
        category='Water / Flooding',
        description='Water Pipe Burst at Zone 15, Near Plaza.',
        status='dispatched'
    )
    db.add(demo_report)
    db.commit()
    
    print("Seeding complete!")
    db.close()

if __name__ == "__main__":
    seed_data()
