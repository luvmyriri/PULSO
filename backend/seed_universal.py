import sys
import os
import random
import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
import gov_models
import gov_schemas
import gov_crud

def generate_massive_seed():
    db = SessionLocal()

    print("\n" + "="*80)
    print("  PULSO — Universal Massive Seeding (1000+ Connected Entities, with Spatial Clusters)")
    print("="*80)

    # ─────────────────────────────────────────────────────────────────────────
    # 0. FETCH KEY PERSONNEL
    # ─────────────────────────────────────────────────────────────────────────
    resident = db.query(models.User).filter(models.User.role == "resident").first()
    admin = db.query(models.User).filter(models.User.role == "system_admin").first()
    city_engineer = db.query(models.User).filter(models.User.role == "city_engineer").first()
    asst_engineer = db.query(models.User).filter(models.User.role == "asst_city_engineer").first()
    inspector = db.query(models.User).filter(models.User.role == "building_inspector").first()
    field_worker = db.query(models.User).filter(models.User.role == "field_worker").first()
    foreman = db.query(models.User).filter(models.User.role == "construction_foreman").first()
    design_engr = db.query(models.User).filter(models.User.role == "design_engineer").first()
    estimator = db.query(models.User).filter(models.User.role == "estimator").first()

    if not admin:
        print("  [ERROR] Database missing foundational users. Run seed_gov_users.py first.")
        return

    admin_id = admin.id
    res_id = resident.id if resident else admin_id
    ce_id = city_engineer.id if city_engineer else admin_id
    fw_id = field_worker.id if field_worker else admin_id
    insp_id = inspector.id if inspector else admin_id
    ae_id = asst_engineer.id if asst_engineer else ce_id
    est_id = estimator.id if estimator else ae_id

    # ─────────────────────────────────────────────────────────────────────────
    # 1. SEED 350+ REPORTS (TIGHTLY CLUSTERED TO TRIGGER ANALYTICS STRESS ZONES)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n  [SCENARIO A] Seeding Clustered Citizen Reports & Work Orders...")

    # We define 15 "Stress Zones". For each, we'll spawn 10-25 reports in extremely tight proximity (<100 meters).
    clusters = [
        {"center_lat": 14.7566, "center_lng": 121.0450, "brgy": "Deparo", "cat": "Road Issue", "urg": "Critical", "base_desc": "Severe asphalt deterioration"},
        {"center_lat": 14.7610, "center_lng": 121.0420, "brgy": "Camarin", "cat": "Flooding", "urg": "Critical", "base_desc": "Street gutter overflows immediately on rain"},
        {"center_lat": 14.7400, "center_lng": 121.0550, "brgy": "Bagong Silang", "cat": "Electrical", "urg": "High", "base_desc": "Exposed high voltage cables"},
        {"center_lat": 14.7430, "center_lng": 121.0500, "brgy": "Bagong Silang", "cat": "Waste Mgmt", "urg": "Medium", "base_desc": "Illegal massive dumpsite"},
        {"center_lat": 14.7300, "center_lng": 121.0600, "brgy": "Tala", "cat": "Road Issue", "urg": "High", "base_desc": "Manhole cover missing, deep drops"},
        {"center_lat": 14.7200, "center_lng": 121.0650, "brgy": "Tala", "cat": "Water Leak", "urg": "High", "base_desc": "Major busted water pipe"},
        {"center_lat": 14.6500, "center_lng": 120.9800, "brgy": "Sangandaan", "cat": "Flooding", "urg": "Critical", "base_desc": "Clogged main estero"},
        {"center_lat": 14.6550, "center_lng": 120.9850, "brgy": "Maypajo", "cat": "Road Issue", "urg": "Medium", "base_desc": "Sidewalk fully collapsed"},
        {"center_lat": 14.6600, "center_lng": 120.9900, "brgy": "Grace Park East", "cat": "Electrical", "urg": "Critical", "base_desc": "Transformer sparking excessively"},
        {"center_lat": 14.6620, "center_lng": 120.9920, "brgy": "Grace Park East", "cat": "Road Issue", "urg": "Critical", "base_desc": "Road base subsidence (sinkhole risk)"},
    ]

    # Additional random scatter targets
    barangays = ["City Hall", "Deparo", "Grace Park East", "Bagong Silang", "Camarin", "Tala", "Maypajo", "Sangandaan", "Monumento"]

    ai_cat_map = {"Road Issue": "Infrastructure", "Flooding": "Water/Drainage", "Electrical": "Public Safety", "Waste Mgmt": "Sanitation", "Water Leak": "Water Issue"}
    
    reports_created = 0
    work_orders_created = 0

    now = datetime.datetime.now()

    # Create stress zone clusters
    for cluster in clusters:
        num_reports = random.randint(15, 30) # High density to guarantee DBSCAN pickup
        for _ in range(num_reports):
            # Variance up to ~50 meters
            lat = cluster["center_lat"] + random.uniform(-0.0005, 0.0005)
            lng = cluster["center_lng"] + random.uniform(-0.0005, 0.0005)
            
            # Days back for analytics history
            days_ago = random.randint(1, 85)
            report_date = now - datetime.timedelta(days=days_ago)
            
            report = models.Report(
                user_id=res_id,
                category=cluster["cat"],
                description=f"{cluster['base_desc']} at {cluster['brgy']}",
                location_lat=lat,
                location_lng=lng,
                location_string=f"Clustered Zone, {cluster['brgy']}",
                status="pending",
                ai_category=ai_cat_map[cluster["cat"]],
                ai_urgency=cluster["urg"],
                severity_score=random.uniform(7.0, 9.8),
                created_at=report_date,
            )
            db.add(report)
            db.flush()
            reports_created += 1

            # Transform 30% of clustered reports into actively tracked Work Orders
            if random.random() < 0.3:
                wo_data = gov_schemas.WorkOrderCreate(
                    title=f"Repair: {cluster['cat']}",
                    description=f"Automated field worker dispatch for ticket {report.id}",
                    report_id=report.id,
                    assigned_to_id=fw_id,
                    wo_type="standard",
                    priority="high",
                    scheduled_date=report_date + datetime.timedelta(days=1)
                )
                wo = gov_crud.create_work_order(db, wo_data, actor_id=admin_id, actor_role="system_admin")
                
                # Advance Work Order to completed for historical ones
                if days_ago > 30:
                    gov_crud.update_work_order_status(db, wo.id, "in_progress", fw_id, "field_worker")
                    gov_crud.update_work_order_status(db, wo.id, "completed", fw_id, "field_worker")
                elif days_ago > 10:
                    gov_crud.update_work_order_status(db, wo.id, "in_progress", fw_id, "field_worker")
                
                work_orders_created += 1

    # Add 100 scattered noisy reports (background noise)
    for _ in range(100):
        brgy = random.choice(barangays)
        cat = random.choice(list(ai_cat_map.keys()))
        report = models.Report(
            user_id=res_id,
            category=cat,
            description=f"Scattered issue reported by citizen in {brgy}.",
            location_lat=14.7 + random.uniform(-0.08, 0.08),
            location_lng=121.0 + random.uniform(-0.05, 0.05),
            location_string=f"Random St, {brgy}",
            status="pending",
            ai_category=ai_cat_map[cat],
            ai_urgency="Low",
            severity_score=random.uniform(2.0, 5.0),
            created_at=now - datetime.timedelta(days=random.randint(1, 90)),
        )
        db.add(report)
        reports_created += 1

    # Add 50 Standalone Work Orders (Preemptive / Maintenance not directly from citizens)
    for _ in range(50):
        brgy = random.choice(barangays)
        wo_data = gov_schemas.WorkOrderCreate(
            title=f"Preemptive Maintenance: {random.choice(['Sewer Audit', 'Bridge Inspection', 'Light Fixtures'])}",
            description=f"Routine patrol and repair tasks in {brgy}.",
            assigned_to_id=fw_id,
            wo_type="preemptive",
            priority="normal",
            scheduled_date=now - datetime.timedelta(days=random.randint(1, 60))
        )
        wo = gov_crud.create_work_order(db, wo_data, actor_id=ae_id, actor_role="asst_city_engineer")
        gov_crud.update_work_order_status(db, wo.id, "completed", fw_id, "field_worker")
        work_orders_created += 1

    db.commit()
    print(f"    -> Generated {reports_created} Citizen Reports! (Highly Clustered)")
    print(f"    -> Generated {work_orders_created} Work Orders!")

    # ─────────────────────────────────────────────────────────────────────────
    # 2. SEED 120 LGU PROJECTS & PROCUREMENTS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n  [SCENARIO B] Seeding Macro Projects & Hundreds of Procurements...")

    project_titles = [
        "Rehabilitation of Drainage Canal", "Asphalt Overlay of Main Road", 
        "Construction of Multi-Purpose Hall", "Installation of LED Streetlights",
        "Repair of Public School Roof", "Upgrading of Water Distribution Line",
        "Paving of Local Pathways", "Construction of Evacuation Center",
        "Retrofitting of Concrete Beams", "Overhaul of City Pumping Stations"
    ]

    projects_created = 0
    procurements_created = 0

    for i in range(120):
        brgy = random.choice(barangays)
        title = f"{random.choice(project_titles)} ({brgy}) - Batch {i}"
        
        proj_data = gov_schemas.ProjectRequestCreate(
            title=title,
            description=f"Massive budget allocation intended for {title.lower()} to improve local infrastructure.",
            requesting_party=f"Barangay {brgy} Council",
            barangay=brgy,
            location_string=f"Arterial Road, {brgy}",
            location_lat=14.7 + random.uniform(-0.06, 0.06),
            location_lng=121.0 + random.uniform(-0.06, 0.06),
        )
        proj = gov_crud.create_project_request(db, proj_data, actor_id=admin_id, actor_role="system_admin")
        projects_created += 1

        target_phase = random.randint(1, 13)
        phases = [
            (2, "survey_in_progress", "Engineers dispatched for survey"),
            (3, "survey_complete", "Geodetic survey verified"),
            (4, "design_in_progress", "Drafting structural plans"),
            (5, "boq_submitted", "Bill of Quantities and cost estimations finalized"),
            (6, "pending_budget_check", "Forwarded to accounting for clearance"),
            (7, "budget_confirmed", "Budget secured"),
            (8, "approved_by_city_engineer", "Approved for execution"),
            (9, "dispatched", "Project awarded"),
            (10, "in_progress", "Construction ongoing (Phase 1)"),
            (11, "milestone_inspections", "Mid-way structural checks"),
            (12, "resolved", "Construction physical completion"),
            (13, "closed_completion_certified", "Final certification and turnover")
        ]

        for phase_num, status, note in phases:
            if phase_num > target_phase: break
            gov_crud.advance_project_phase(db, proj.id, status, ce_id, "city_engineer", note)
            
            # Massive Procurement generation
            if status == "boq_submitted":
                # Create 1-3 procurements for this project
                for pr_idx in range(random.randint(1, 3)):
                    pr_data = gov_schemas.ProcurementRequestCreate(
                        title=f"Materials Suppy {pr_idx+1} for {title}",
                        purpose=f"Procurement tranche {pr_idx+1} for {title}",
                        project_id=proj.id,
                        items=[
                            gov_schemas.BoQItemCreate(item_name="Cement Class A", unit="bags", quantity=random.randint(50,500), unit_cost=320),
                            gov_schemas.BoQItemCreate(item_name="RSB 16mm", unit="pcs", quantity=random.randint(100,800), unit_cost=450),
                            gov_schemas.BoQItemCreate(item_name="Gravel & Sand", unit="cu.m", quantity=random.randint(10, 50), unit_cost=1800),
                        ]
                    )
                    pr = gov_crud.create_procurement_request(db, pr_data, actor_id=est_id, actor_role="estimator")
                    procurements_created += 1
                    
                    if target_phase >= 8:
                        if random.random() > 0.1:
                            gov_crud.update_procurement_status(db, pr.id, "validated", ae_id, "asst_city_engineer")
                            gov_crud.update_procurement_status(db, pr.id, "sent_to_procurement", ce_id, "city_engineer")
                            if random.random() > 0.2:
                                gov_crud.update_procurement_status(db, pr.id, "procured", ce_id, "city_engineer")

            # Link some work orders for the construction
            if status == "dispatched":
                wo_data = gov_schemas.WorkOrderCreate(
                    title=f"Project Dispatch: {title}",
                    description=f"Field force dispatched for phase 1 of project {proj.proj_number}",
                    project_id=proj.id,
                    assigned_to_id=fw_id,
                    wo_type="standard",
                    priority="critical"
                )
                gov_crud.create_work_order(db, wo_data, actor_id=ce_id, actor_role="city_engineer")
                work_orders_created += 1

        if target_phase == 13:
            gov_crud.issue_certificate_of_completion(db, proj.id, ce_id, "city_engineer")

    print(f"    -> Generated {projects_created} Civil Projects!")
    print(f"    -> Generated {procurements_created} Connected Procurements (with thousands of BoQ Items)!")

    # ─────────────────────────────────────────────────────────────────────────
    # 3. SEED 150 OBO INSPECTIONS (BUILDING / ELECTRICAL / MECHANICAL)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n  [SCENARIO C] Seeding OBO Inspections...")

    obo_created = 0
    status_flow = ["application_received", "inspection_scheduled", "cleared", "permit_issued"]
    
    for i in range(150):
        brgy = random.choice(barangays)
        itype = random.choice(["building", "electrical", "mechanical"])
        
        obo_data = gov_schemas.OBOInspectionCreate(
            applicant_name=f"Developer Network {random.randint(10, 999)} Inc.",
            applicant_contact=f"0917{random.randint(1000000, 9999999)}",
            property_address=f"Lot {random.randint(1,500)} {brgy} Ave",
            barangay=brgy,
            location_lat=14.7 + random.uniform(-0.06, 0.06),
            location_lng=121.0 + random.uniform(-0.06, 0.06),
            inspection_type=itype
        )
        
        obo = gov_crud.create_obo_inspection(db, obo_data, actor_id=admin_id, actor_role="system_admin")
        obo_created += 1

        # Advance status
        rnd = random.random()
        if rnd > 0.2: # 80% reach inspection scheduled
            gov_crud.update_obo_inspection(db, obo.id, gov_schemas.OBOInspectionUpdate(
                status="inspection_scheduled",
                assigned_inspector_id=insp_id,
                inspection_date=now + datetime.timedelta(days=random.randint(-15, 10))
            ), actor_id=admin_id, actor_role="system_admin")
            
            if rnd > 0.5: # 50% get inspected
                is_compliant = (random.random() > 0.15) # 85% passing rate
                gov_crud.update_obo_inspection(db, obo.id, gov_schemas.OBOInspectionUpdate(
                    status="cleared" if is_compliant else "non_compliant",
                    is_compliant=is_compliant,
                    findings="Approved per National Building Code." if is_compliant else "Failed load-bearing assessment.",
                ), actor_id=insp_id, actor_role="building_inspector")
                
                if is_compliant and rnd > 0.7:
                    gov_crud.update_obo_inspection(db, obo.id, gov_schemas.OBOInspectionUpdate(status="permit_issued"), actor_id=ae_id, actor_role="asst_city_engineer")

    print(f"    -> Generated {obo_created} OBO Inspections!")

    print("\n" + "="*80)
    print("  ✓ MASSIVE UNIVERSAL SEED COMPLETION")
    print(f"  Final Counts -> Reports: {reports_created} | Projects: {projects_created} | WOs: {work_orders_created} | OBOs: {obo_created} | Procurements: {procurements_created}")
    print("="*80 + "\n")

    db.close()


if __name__ == "__main__":
    generate_massive_seed()
