from database import SessionLocal
import models

def check_db():
    db = SessionLocal()
    try:
        users = db.query(models.User).count()
        reports = db.query(models.Report).count()
        advisories = db.query(models.Advisory).count()
        notifications = db.query(models.Notification).count()
        
        print(f"Users: {users}")
        print(f"Reports: {reports}")
        print(f"Advisories: {advisories}")
        print(f"Notifications: {notifications}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
