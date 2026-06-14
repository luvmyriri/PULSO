from database import engine
from sqlalchemy import text

gov_roles = ['admin_officer', 'admin_clerk', 'records_officer', 'city_engineer', 'asst_city_engineer', 'division_chief', 'design_engineer', 'estimator', 'cad_operator', 'project_engineer', 'construction_foreman', 'field_worker', 'building_inspector', 'electrical_inspector', 'mechanical_inspector', 'dispatcher', 'manager', 'system_admin']

with engine.connect() as conn:
    for role in gov_roles:
        conn.execute(text("UPDATE users SET account_type = 'government' WHERE role = :role"), {"role": role})
    conn.commit()
print('Gov users updated!')