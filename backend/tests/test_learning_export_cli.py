"""Offline export verification, grouping and download safety; no network or DB."""
from datetime import datetime, timezone
from io import BytesIO
import json
from urllib.error import HTTPError

import pytest

from learning_dataset_contract import canonical, components, project_features, seal
from scripts import export_report_learning as cli


def empty_export():
    return seal([], datetime.now(timezone.utc), include_asset_references=False)


def test_grouping_combines_shared_reports_and_assets_transitively():
    rows = [dict(concern_id=key, lineage=dict(report_ids=reports,
        reviewed_survey_asset_ids=assets, recorded_barangay_ids=areas)) for key, reports, assets, areas in (
        ('A',[1],[],[10]), ('B',[1,2],['pole-1'],[10]), ('C',[3],['pole-1'],[11]), ('D',[4],[],[11]),
    )]
    report_groups = components(rows)
    assert report_groups['A'] == report_groups['B'] != report_groups['C']
    asset_groups = components(rows, include_assets=True)
    assert asset_groups['A'] == asset_groups['B'] == asset_groups['C'] != asset_groups['D']
    area_groups = components(rows, include_assets=True, include_areas=True)
    assert len(set(area_groups.values())) == 1
    assert area_groups == components(list(reversed(rows)), include_assets=True, include_areas=True)


def test_verify_runs_offline_and_detects_manifest_tampering(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(cli, 'open_request', lambda *_: pytest.fail('Offline verification contacted the network.'))
    document = empty_export()
    source = tmp_path/'export.json'
    source.write_bytes(canonical(document))
    assert cli.main(['verify','--input',str(source)]) == 0
    assert 'training release blocked' in capsys.readouterr().out
    document['manifest']['data_origin'] = 'FAKE changed provenance'
    source.write_bytes(canonical(document))
    assert cli.main(['verify','--input',str(source)]) == 1
    assert 'FAKE changed provenance' not in capsys.readouterr().err


def test_free_text_category_cannot_escape_through_the_predictor_allow_list():
    raw = dict(submitted_categories=['private-contact@example.invalid'],
               observation_categories={'issue':['private-contact@example.invalid']},
               observation_count=1, location_source='unknown', photo_source='unknown')
    with pytest.raises(ValueError, match='Invalid category features'):
        project_features(raw)


def test_download_uses_bearer_and_never_overwrites_existing_export(tmp_path, monkeypatch, capsys):
    document = empty_export()
    calls = []

    def send(request):
        calls.append(request)
        assert request.full_url == 'https://api.example.invalid/api/gov/report-learning/dataset?max_cases=17'
        assert request.get_header('Authorization') == 'Bearer FAKE-PILOT-TOKEN'
        return BytesIO(canonical(document))

    monkeypatch.setenv('PULSO_LEARNING_TOKEN', 'FAKE-PILOT-TOKEN')
    monkeypatch.setattr(cli, 'open_request', send)
    output = tmp_path/'new-export.json'
    args = ['fetch','--base-url','https://api.example.invalid','--max-cases','17','--output',str(output)]
    assert cli.main(args) == 0 and json.loads(output.read_bytes()) == document
    assert cli.main(args) == 2 and len(calls) == 1
    with pytest.raises(FileExistsError):
        cli.write_new(output, b'replacement')
    assert json.loads(output.read_bytes()) == document
    result = capsys.readouterr()
    assert 'FAKE-PILOT-TOKEN' not in result.out + result.err


def test_refused_or_incomplete_download_creates_no_file(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv('PULSO_LEARNING_TOKEN', 'FAKE-PILOT-TOKEN')
    output = tmp_path/'new-export.json'
    args = ['fetch','--output',str(output)]

    def deny(request):
        raise HTTPError(request.full_url, 403, 'FAKE private detail', None, None)

    monkeypatch.setattr(cli, 'open_request', deny)
    assert cli.main(args) == 1 and not output.exists()
    assert 'FAKE private detail' not in capsys.readouterr().err
    monkeypatch.setattr(cli, 'open_request', lambda *_: BytesIO(b'{"incomplete":true}'))
    assert cli.main(args) == 1 and not output.exists()
    assert cli.NoRedirect().redirect_request(None, None, 302, 'redirect', {}, 'https://elsewhere.invalid') is None


@pytest.mark.parametrize('url', ['http://api.example.invalid', 'file:///tmp/file', 'https://u:p@api.example.invalid',
                                 'https://api.example.invalid?token=secret', 'https://api.example.invalid/#secret'])
def test_unsafe_origins_are_rejected(url):
    with pytest.raises(ValueError):
        cli.api_origin(url)


def test_matching_download_and_offline_verification_use_the_same_safe_transport(tmp_path, monkeypatch, capsys):
    from matching_dataset_contract import seal as seal_matching
    document = seal_matching([], datetime.now(timezone.utc))
    monkeypatch.setenv('PULSO_LEARNING_TOKEN', 'SAMPLE-MATCHING-TOKEN')
    calls = []
    def send(request):
        calls.append(request.full_url)
        assert request.get_header('Authorization') == 'Bearer SAMPLE-MATCHING-TOKEN'
        return BytesIO(canonical(document))
    monkeypatch.setattr(cli,'open_request',send)
    output = tmp_path/'matching.json'
    assert cli.main(['fetch','--dataset','matching','--max-cases','12','--output',str(output)]) == 0
    assert calls == ['http://127.0.0.1:8000/api/gov/report-learning/matching-dataset?max_reviews=12']
    assert cli.main(['verify','--input',str(output)]) == 0 and len(calls) == 1
    assert 'matching review rows' in capsys.readouterr().out
    document['manifest']['data_origin'] = 'SAMPLE unapproved change'
    output.write_bytes(canonical(document))
    assert cli.main(['verify','--input',str(output)]) == 1


def test_malformed_envelopes_do_not_crash_or_create_a_download(tmp_path, monkeypatch):
    monkeypatch.setenv('PULSO_LEARNING_TOKEN','SAMPLE-TOKEN')
    for raw in (b'[]', b'null', b'{"manifest":[]}'):
        monkeypatch.setattr(cli,'open_request',lambda *_:BytesIO(raw))
        output = tmp_path/'not-created.json'
        assert cli.main(['fetch','--dataset','matching','--output',str(output)]) == 1
        assert not output.exists()
