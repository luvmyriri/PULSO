
import sys
import os
sys.path.append(os.getcwd())
import random
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import gov_models

def seed_agent_locations():
    db = SessionLocal()
    try:
        # Define some field-related roles
        target_roles = ['field_worker', 'construction_foreman', 'building_inspector', 'electrical_inspector', 'mechanical_inspector']
        field_agents = db.query(models.Official).filter(models.Official.role.in_(target_roles)).all()
        
        if not field_agents:
            print("No officials found with field roles.")
            return

        print(f"Found {len(field_agents)} potential field agents.")
        
        # North Caloocan bounds approx: 14.75, 121.0 to 14.80, 121.1
        for agent in field_agents:
            # Check if location already exists
            loc = db.query(gov_models.AgentLocation).filter(gov_models.AgentLocation.agent_id == agent.id).first()
            
            lat = 14.75 + (random.random() * 0.05)
            lng = 121.05 + (random.random() * 0.05)
            
            if not loc:
                loc = gov_models.AgentLocation(
                    agent_id=agent.id,
                    latitude=lat,
                    longitude=lng,
                    status="active",
                    accuracy=5.0,
                    battery_level=random.randint(60, 95),
                    location_name="North Caloocan Sector",
                    updated_at=datetime.utcnow()
                )
                db.add(loc)
                print(f"Created location for agent: {agent.full_name} ({agent.role})")
            else:
                loc.latitude = lat
                loc.longitude = lng
                loc.status = "active"
                loc.updated_at = datetime.utcnow()
                print(f"Updated location for agent: {agent.full_name}")
        
        db.commit()
        print("Successfully seeded agent locations.")
    except Exception as e:
        print(f"Error seeding agents: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_agent_locations()
