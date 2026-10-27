"""Synthetic local browser-review fixture, confined to the dedicated test DB."""
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.engine import make_url
from sqlalchemy import text
from database import SessionLocal, DATABASE_URL
from tests.postgis_support import reset_rows
import auth
import models
import gov_models as gm

if make_url(DATABASE_URL).database != 'pulso_test_government_core_20261023':
    raise RuntimeError('Browser fixture is restricted to the dedicated disposable database.')
reset_rows()
with SessionLocal() as db:
    db.add(models.District(id=1, name='Sample review district', code='SAMPLE'))
    db.flush()
    db.add(models.Barangay(id=1, name='Sample review area', district_id=1))
    password = auth.get_password_hash('PulsoReviewOnly2026!')
    db.add_all([
        models.Official(id=1, full_name='Sample Engineering Reviewer', email='review.engineer@test.invalid', password_hash=password, role='city_engineer', is_active=True),
        models.Official(id=2, full_name='Sample Field Worker', email='review.field@test.invalid', password_hash=password, role='field_worker', is_active=True),
        models.Resident(id=100, full_name='Sample Resident', email='review.resident@test.invalid', password_hash=password, is_verified=True, is_active=True),
    ])
    db.flush()
    db.add(gm.InfrastructureAsset(asset_id='SAMPLE-ASSET-01', asset_name='Sample drainage inspection site', category='Drainage', barangay='Sample review area', barangay_id=1, condition_score=48, date_completed=date(2024,1,1)))
    for id, title, status in [(1,'Sample drainage concern awaiting review','pending'),(2,'Sample road surface concern','validated'),(3,'Sample drainage work awaiting verification','in_progress')]:
        db.add(models.Report(id=id, ticket_id=f'SAMPLE-REPORT-{id:03}', resident_id=100, description=title, category='Drainage' if id != 2 else 'Roads', status=status, barangay_id=1, location_barangay='Sample review area', created_at=datetime.now(timezone.utc)-timedelta(days=8+id)))
    db.flush()
    db.add_all([
        gm.WorkOrder(id=1, wo_number='SAMPLE-WORK-001', title='Inspect sample road surface', assigned_by_id=1, assigned_to_id=1, status='assigned', category='Roads', district_id=1, barangay_id=1, report_id=2),
        gm.WorkOrder(id=2, wo_number='SAMPLE-WORK-002', title='Review sample drainage completion evidence', assigned_by_id=1, assigned_to_id=2, status='completed_pending_review', category='Drainage', district_id=1, barangay_id=1, report_id=3),
        gm.WorkOrder(id=3, wo_number='SAMPLE-WORK-003', title='Sample work waiting for site access', assigned_by_id=1, assigned_to_id=2, status='blocked', category='Drainage', district_id=1, barangay_id=1),
    ])
    db.flush()
    db.add(gm.WorkOrderBlocker(work_order_id=3, reason_code='access', notes='Sample access dependency', blocked_by_id=2))
    db.commit()
    for table in ('districts', 'barangays', 'officials', 'residents', 'reports', 'work_orders'):
        db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), (SELECT max(id) FROM {table}), true)"))
    db.commit()
print('Synthetic browser-review data prepared in the dedicated disposable database.')
