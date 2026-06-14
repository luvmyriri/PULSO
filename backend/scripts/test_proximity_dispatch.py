import sys
import os

# Add the backend directory to sys.path for local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from database import SessionLocal
import models
import gov_models
import gov_crud
import gov_schemas
from datetime import datetime

def setup_simulation():
    db = SessionLocal()
    try:
        print("--- Simulation Setup: Proximity Dispatch ---")
        
        # 1. Clear existing locations for a clean test
        db.query(gov_models.AgentLocation).delete()
        
        # 2. Get some engineers from our seeded data
        # We need 3 agents
        agents = db.query(models.User).filter(models.User.role == "lead_engineer").limit(3).all()
        if len(agents) < 3:
            print("Error: Need at least 3 lead_engineers seeded in the DB.")
            return

        # 3. Create a Report (Pothole at SM Center Sangandaan - South)
        # 14.654, 120.975
        report = models.Report(
            ticket_id="TEST-DISP-001",
            category="Roads",
            description="Large sinkhole posing immediate danger at SM Center Sangandaan.",
            location_lat=14.6542,
            location_lng=120.9751,
            location_barangay="Barangay 3",
            location_string="SM Center Sangandaan",
            ai_urgency="critical",
            status="pending"
        )
        db.add(report)
        db.flush()

        # 4. Position Agents
        # Agent 3: Nearest (South City Hall) - 14.646, 120.973 (~1km)
        loc3 = gov_models.AgentLocation(
            agent_id=agents[0].id,
            latitude=14.6466,
            longitude=120.9732,
            status="available"
        )
        
        # Agent 2: Mid (Monumento) - 14.657, 120.984 (~1.5km)
        loc2 = gov_models.AgentLocation(
            agent_id=agents[1].id,
            latitude=14.6575,
            longitude=120.9842,
            status="returning"
        )
        
        # Agent 1: Far (North Bagong Silang) - 14.78, 121.10 (~>10km)
        loc1 = gov_models.AgentLocation(
            agent_id=agents[2].id,
            latitude=14.7823,
            longitude=121.1021,
            status="available"
        )
        
        db.add_all([loc1, loc2, loc3])
        db.commit()

        print(f"Report ID: {report.id} at Sangandaan")
        print(f"Agent A (Near): {agents[0].full_name} at City Hall South")
        print(f"Agent B (Mid): {agents[1].full_name} at Monumento")
        print(f"Agent C (Far): {agents[2].full_name} at Bagong Silang")

        # 5. TEST: Proximity Suggestion
        print("\n--- Testing Suggestion Ranking ---")
        suggestions = gov_crud.find_smart_dispatch_suggestions(db, report.id, limit=3)
        for i, s in enumerate(suggestions):
            print(f"{i+1}. {s['full_name']} - {s['distance_km']}km ({s['status']})")
        
        assert suggestions[0]['agent_id'] == agents[0].id, "Error: Nearest agent mismatch"
        assert suggestions[2]['agent_id'] == agents[2].id, "Error: Farthest agent mismatch"

        # 6. TEST: Auto-Assignment for Critical Report
        print("\n--- Testing Auto-Assignment (Critical) ---")
        wo_data = gov_schemas.WorkOrderCreate(
            title="Emergency Response: Sangandaan",
            description="Auto-dispatched via proximity logic.",
            priority="critical",
            report_id=report.id,
            wo_type="emergency"
        )
        
        # Dispatch as the City Engineer (User ID 1 if usually seeded first)
        chief = db.query(models.User).filter(models.User.role == "city_engineer").first()
        chief_id = chief.id if chief else 1
        
        wo = gov_crud.create_work_order(db, wo_data, actor_id=chief_id, actor_role="city_engineer")
        
        print(f"Work Order Created: ID {wo.id}")
        print(f"Assigned To: {wo.assigned_to.full_name if wo.assigned_to else 'None'}")
        print(f"Assignment Type: {wo.assignment_type}")
        
        assert wo.assigned_to_id == agents[0].id, "Error: Auto-assignment picked wrong agent"
        assert wo.assignment_type == "proximity_auto", "Error: Assignment type is not proximity_auto"
        
        print("\nVerification Successful! Haversine & Auto-Dispatch Logic Confirmed.")

    except Exception as e:
        print(f"Simulation Failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    setup_simulation()
