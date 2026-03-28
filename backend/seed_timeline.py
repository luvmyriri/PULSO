import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import gov_models, gov_crud, gov_schemas, models

def run_seed():
    db = SessionLocal()

    import auth
    
    ce = db.query(models.User).filter(models.User.role == "city_engineer").first()
    if not ce:
        ce = models.User(full_name="Mock CE", email="ce@mock.com", password_hash=auth.get_password_hash("123"), role="city_engineer")
        db.add(ce)
        db.commit()
        db.refresh(ce)

    resident = db.query(models.User).filter(models.User.role == "resident").first()
    if not resident:
        resident = models.User(full_name="Mock Resident", email="resident@mock.com", password_hash=auth.get_password_hash("123"), role="resident")
        db.add(resident)
        db.commit()
        db.refresh(resident)

    dispatcher = db.query(models.User).filter(models.User.role == "dispatcher").first()
    if not dispatcher:
        dispatcher = models.User(full_name="Mock Dispatcher", email="dispatcher@mock.com", password_hash=auth.get_password_hash("123"), role="dispatcher")
        db.add(dispatcher)
        db.commit()
        db.refresh(dispatcher)

    foreman = db.query(models.User).filter(models.User.role == "construction_foreman").first()
    if not foreman:
        foreman = models.User(full_name="Mock Foreman", email="foreman@mock.com", password_hash=auth.get_password_hash("123"), role="construction_foreman")
        db.add(foreman)
        db.commit()
        db.refresh(foreman)

    if not all([ce, resident, dispatcher, foreman]):
        print(f"Missing. CE: {ce}, Resident: {resident}, Dispatch: {dispatcher}, Foreman: {foreman}")
        print("Required users not found. Run seed_data.py and seed_gov_users.py first.")
        return

    print("Cleaning up old timeline records...")
    db.query(gov_models.ProcessTimeline).delete()
    db.commit()

    print("Seeding Report and Work Order Timeline Data...")
    
    # Create a fresh Report
    rep1 = models.Report(
        user_id=resident.id,
        category="Infrastructure",
        description="Massive sinkhole in the middle of EDSA Monumento",
        location_lat=14.6540,
        location_lng=120.9839,
        location_string="Monumento Circle",
        status="dispatched"
    )
    db.add(rep1)
    db.commit()
    db.refresh(rep1)

    # 1. Report Timeline
    gov_crud._append_timeline(db, status="pending", actor_id=resident.id, actor_role="resident", note="Report successfully filed by citizen.", report_id=rep1.id)
    gov_crud._append_timeline(db, status="under_review", previous_status="pending", actor_id=dispatcher.id, actor_role="dispatcher", note="Reviewing severity of the sinkhole. Priority level adjusted to high.", report_id=rep1.id)

    # 2. Work Order Timeline
    wo_data = gov_schemas.WorkOrderCreate(
        title="Emergency Sinkhole Repair - Monumento",
        description="Immediate backfilling and cordoning required.",
        report_id=rep1.id,
        assigned_to_id=foreman.id,
        wo_type="standard",
        priority="critical"
    )
    wo1 = gov_crud.create_work_order(db, wo_data, actor_id=dispatcher.id, actor_role="dispatcher")

    gov_crud.update_work_order_status(db, wo1.id, "assigned", actor_id=dispatcher.id, actor_role="dispatcher", note="Assigned to Foreman Felix and structural team.")
    gov_crud.update_work_order_status(db, wo1.id, "in_progress", actor_id=foreman.id, actor_role="construction_foreman", note="Team arrived on site. Area cordoned off and backhoe deployed.")

    print("Seeding Project Request Timeline Data...")

    # 3. Project Request Timeline
    proj_data = gov_schemas.ProjectRequestCreate(
        title="Barangay 176 Health Center Renovation",
        description="Full structural renovation, roofing replacement, and electrical rewiring phase 1.",
        requesting_party="Office of the Mayor",
        barangay="Bagong Silang"
    )
    proj1 = gov_crud.create_project_request(db, proj_data, actor_id=ce.id, actor_role="city_engineer")
    gov_crud.advance_project_phase(db, proj1.id, "survey_in_progress", actor_id=ce.id, actor_role="city_engineer", note="Geodetic engineers dispatched for initial site survey and topography checks.")
    gov_crud.advance_project_phase(db, proj1.id, "survey_complete", actor_id=ce.id, actor_role="city_engineer", note="Survey submitted. Soil test indicates stable foundation. Moving to design phase.")

    print("Seed timeline data successfully generated! ✅")
    db.close()

if __name__ == "__main__":
    run_seed()
