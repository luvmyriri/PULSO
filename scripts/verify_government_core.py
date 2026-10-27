"""Run government integration checks only in a named disposable local database.

Uses the configured local PostgreSQL credentials without displaying them. It
never seeds, resets, or runs tests against the configured application database.
"""
import os
import atexit
from pathlib import Path
import subprocess
import sys
import shutil
import hashlib
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from database import DATABASE_URL

TARGET = 'pulso_test_government_core_20261023'
url = make_url(DATABASE_URL)
if url.host not in {'localhost', '127.0.0.1', '::1'} or url.database == TARGET:
    raise SystemExit('Checks require a local configured source database and a separate disposable target.')
target_url = url.set(database=TARGET).render_as_string(hide_password=False)
env = {**os.environ, 'DATABASE_URL': target_url, 'PULSO_TEST_DATABASE': '1', 'PYTHONIOENCODING': 'utf-8'}


def run(*args, cwd=ROOT / 'backend'):
    subprocess.run([sys.executable, *args], cwd=cwd, env=env, check=True)


maintenance = create_engine(url.set(database='postgres'), isolation_level='AUTOCOMMIT')
guard_connection=maintenance.connect()
if not guard_connection.execute(text('SELECT pg_try_advisory_lock(86173333)')).scalar():
    guard_connection.close()
    raise SystemExit('Another government verification run is using the disposable database. Wait for it to finish before retrying.')
atexit.register(guard_connection.close)
with maintenance.connect() as connection:
    exists = connection.execute(text('SELECT 1 FROM pg_database WHERE datname=:name'), {'name': TARGET}).scalar()
maintenance.dispose()
if not exists:
    run(str(ROOT / 'scripts/db_schema.py'), 'bootstrap')
    run('-m', 'alembic', 'stamp', 'c455ca49f6d5')
run('-m', 'alembic', 'upgrade', 'head')
run(str(ROOT / 'scripts/db_schema.py'), 'inventory', '--output', str(ROOT / 'backend/schema/head_18efa117cb09.inventory.json'))
if sys.argv[1:] in (['--browser-review'], ['--browser-resume']):
    if sys.argv[1:] == ['--browser-review']:
        run('-m', 'tests.government_browser_fixture')
    # Never replace the configured application's API with disposable review data.
    run('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '33160')
else:
    tests = sys.argv[1:] or ['tests/test_government_workspace.py', 'tests/test_government_access_guards.py', 'tests/test_extended_command_reliability.py', 'tests/test_staff_accounts.py','tests/test_operational_settings.py','tests/test_resident_administration.py','tests/test_project_coordination.py','tests/test_notification_delivery.py','tests/test_retained_operations.py']
    report=ROOT/'backend/.pytest_cache/government-core-junit.xml'
    try:
        run('-m','pytest',*tests,'-q','--disable-warnings','--junitxml='+str(report))
    finally:
        if report.exists():
            scope=hashlib.sha256('\n'.join(tests).encode()).hexdigest()[:12]
            shutil.copyfile(report,report.with_name(f'government-core-{scope}.xml'))
