"""Serve an isolated real-HTTP browser review, never the configured app DB."""
import atexit
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys

from sqlalchemy import create_engine,text
from sqlalchemy.engine import make_url

ROOT=Path(__file__).resolve().parents[1]
TARGET='pulso_test_intelligence_browser_20261106'
sys.path.insert(0,str(ROOT/'backend'))
from database import DATABASE_URL


def main():
    url=make_url(DATABASE_URL)
    if url.host not in {'localhost','127.0.0.1','::1'} or url.database==TARGET:
        raise SystemExit('Use a local configured source and a separate disposable review target.')
    # Refuse a busy port before resetting even this named disposable target.
    with socket.socket() as listener:
        try:
            listener.bind(('127.0.0.1',33161))
        except OSError:
            raise SystemExit('Review port 33161 is already in use; no fixture data was reset.') from None
    env={**os.environ,'DATABASE_URL':url.set(database=TARGET).render_as_string(hide_password=False),
        'PULSO_TEST_DATABASE':'1','PULSO_INTELLIGENCE_BROWSER_REVIEW':'1','PYTHONIOENCODING':'utf-8',
        'JWT_SECRET_KEY':secrets.token_urlsafe(48),'AI_DISABLED':'true','PULSO_PAIR_ANALYSIS_ENABLED':'true',
        'PULSO_PUBLIC_BASE_URL':'http://127.0.0.1:5182'}
    maintenance=create_engine(url.set(database='postgres'),isolation_level='AUTOCOMMIT')
    guard=maintenance.connect()
    atexit.register(guard.close)
    if not guard.execute(text('SELECT pg_try_advisory_lock(86173336)')).scalar():
        raise SystemExit('The isolated intelligence browser review is already active.')
    exists=guard.execute(text('SELECT 1 FROM pg_database WHERE datname=:target'),{'target':TARGET}).scalar()
    def run(*args):
        subprocess.run([sys.executable,*args],cwd=ROOT/'backend',env=env,check=True)
    if not exists:
        run(str(ROOT/'scripts/db_schema.py'),'bootstrap')
        run('-m','alembic','stamp','c455ca49f6d5')
    run('-m','alembic','upgrade','head')
    run(str(ROOT/'scripts/db_schema.py'),'check-existing')
    run('-m','tests.intelligence_browser_app','--seed')
    run('-m','uvicorn','tests.intelligence_browser_app:app','--host','127.0.0.1','--port','33161')


if __name__=='__main__':
    main()
