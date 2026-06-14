
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy.orm import Session
from database import SessionLocal
import gov_models

def check_agents():
    db = SessionLocal()
    try:
        count = db.query(gov_models.AgentLocation).count()
        print(f"Total agent locations: {count}")
        agents = db.query(gov_models.AgentLocation).all()
        for a in agents:
            print(f"Agent ID: {a.agent_id}, Status: {a.status}, Lat: {a.latitude}, Lng: {a.longitude}")
    finally:
        db.close()

if __name__ == "__main__":
    check_agents()
