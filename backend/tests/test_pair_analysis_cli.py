"""Worker CLI validates storage configuration without touching an app database."""
import pytest
import database
import pair_analysis_jobs
from scripts import process_pair_analysis as cli


def test_explicit_root_is_forwarded_without_importing_api_or_processing_real_jobs(tmp_path,monkeypatch,capsys):
    factory=object()
    monkeypatch.setattr(database,'SessionLocal',factory)
    supplied=[]
    monkeypatch.setattr(pair_analysis_jobs,'run_one',lambda sessions,root:supplied.append((sessions,root)))
    assert cli.main(['--upload-root',str(tmp_path),'--limit','1'])==0
    assert supplied==[(factory,tmp_path.resolve())]
    assert 'Processed 0' in capsys.readouterr().out


@pytest.mark.parametrize('arguments',[[],['--upload-root','relative/path'],['--upload-root','relative/path','--limit','0']])
def test_missing_or_relative_roots_and_invalid_bounds_fail_before_processing(arguments,monkeypatch):
    monkeypatch.setattr(pair_analysis_jobs,'run_one',lambda *_:pytest.fail('Unsafe CLI invocation processed work.'))
    with pytest.raises(SystemExit) as failed:
        cli.main(arguments)
    assert failed.value.code==2
