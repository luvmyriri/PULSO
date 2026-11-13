"""Regression checks in a separate named local PostGIS database.

No configured application or browser-review data is reset. Uses the backend venv.
"""
import os
from pathlib import Path
import subprocess
import sys

from sqlalchemy import create_engine,text
from sqlalchemy.engine import make_url

ROOT=Path(__file__).resolve().parents[1]
TARGET='pulso_test_intelligence_regression_20261106'
sys.path.insert(0,str(ROOT/'backend'))
from database import DATABASE_URL


def main():
    url=make_url(DATABASE_URL)
    if url.host not in {'localhost','127.0.0.1','::1'} or url.database==TARGET:
        raise SystemExit('Checks require a local source and the separate named regression target.')
    env={**os.environ,'DATABASE_URL':url.set(database=TARGET).render_as_string(hide_password=False),
        'PULSO_TEST_DATABASE':'1','PYTHONIOENCODING':'utf-8','AI_DISABLED':'true'}
    maintenance=create_engine(url.set(database='postgres'),isolation_level='AUTOCOMMIT')
    try:
        with maintenance.connect() as guard:
            if not guard.execute(text('SELECT pg_try_advisory_lock(86173337)')).scalar():
                raise SystemExit('Another intelligence regression run is using this target.')
            exists=guard.execute(text('SELECT 1 FROM pg_database WHERE datname=:name'),{'name':TARGET}).scalar()
            def run(*args):
                subprocess.run([sys.executable,*args],cwd=ROOT/'backend',env=env,check=True)
            if not exists:
                run(str(ROOT/'scripts/db_schema.py'),'bootstrap')
                run('-m','alembic','stamp','c455ca49f6d5')
            run('-m','alembic','upgrade','head')
            run(str(ROOT/'scripts/db_schema.py'),'check-existing')
            tests=sys.argv[1:] or ['tests/test_report_intelligence.py','tests/test_observation_matching.py',
                'tests/test_pair_analysis_jobs.py','tests/test_reviewer_availability.py','tests/test_intelligence_browser_guards.py',
                'tests/test_capture_request_contract.py','tests/test_location_pilot.py','tests/test_location_pilot_records.py',
                'tests/test_matching_evaluation.py','tests/test_matching_evaluation_records.py','tests/test_concern_checkpoints.py',
                'tests/test_checkpoint_dataset_contract.py','tests/test_checkpoint_dataset_export.py',
                'tests/test_checkpoint_baseline.py','tests/test_checkpoint_baseline_records.py',
                'tests/test_checkpoint_candidate.py','tests/test_checkpoint_candidate_records.py',
                'tests/test_observation_field_assessments.py','tests/test_observation_field_dataset_contract.py',
                'tests/test_observation_field_dataset_export.py','tests/test_observation_field_sources.py',
                'tests/test_report_media.py','tests/test_public_incident_projection.py']
            run('-m','pytest',*tests,'-q','--disable-warnings',
                '--junitxml='+str(ROOT/'backend/.pytest_cache/intelligence-regression-junit.xml'))
    finally:
        maintenance.dispose()


if __name__=='__main__':
    main()
