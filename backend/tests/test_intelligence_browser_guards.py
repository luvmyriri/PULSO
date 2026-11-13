"""The manual HTTP fixture must refuse app/remote targets before loading main."""
import os
from pathlib import Path
import subprocess
import sys

import pytest


APP=Path(__file__).with_name('intelligence_browser_app.py')
TARGET='pulso_test_intelligence_browser_20261106'


@pytest.mark.parametrize('flag,test_guard,url,key,message',[
    ('0','1',f'postgresql://localhost/{TARGET}','x'*48,'explicit isolated'),
    ('1','1','postgresql://localhost/pulso','x'*48,'exact disposable'),
    ('1','1',f'postgresql://remote.invalid/{TARGET}','x'*48,'exact disposable'),
    ('1','0',f'postgresql://localhost/{TARGET}','x'*48,'exact disposable'),
    ('1','1',f'postgresql://localhost/{TARGET}','','signing key'),
])
def test_fixture_refuses_unsafe_startup(flag,test_guard,url,key,message):
    # A fake database module avoids opening any connection, including app fallbacks.
    code="""
import os,runpy,sys,types
db=types.ModuleType('database')
db.DATABASE_URL=os.environ['SAMPLE_GUARD_URL']
db.SessionLocal=db.get_db=None
sys.modules['database']=db
runpy.run_path(sys.argv[1],run_name='guard_probe')
"""
    result=subprocess.run([sys.executable,'-c',code,str(APP)],capture_output=True,text=True,
        env={**os.environ,'PULSO_INTELLIGENCE_BROWSER_REVIEW':flag,'PULSO_TEST_DATABASE':test_guard,
            'SAMPLE_GUARD_URL':url,'JWT_SECRET_KEY':key},timeout=20)
    assert result.returncode!=0
    assert message in result.stderr
    assert 'import main' not in result.stderr
