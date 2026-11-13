"""CLI safety and receipt semantics; submissions are mocked, never sent."""
import json
from urllib.error import URLError
from uuid import uuid4

import pytest
from scripts import collect_field_inventory as cli
from tests.test_field_inventory import candidate


@pytest.fixture
def payload_file(tmp_path):
    source = tmp_path/'private-field.json'
    source.write_text(json.dumps(candidate()),encoding='utf-8')
    return source


def test_cli_defaults_to_offline_validation(payload_file, monkeypatch, capsys):
    monkeypatch.setattr(cli,'open_request',lambda *_: pytest.fail('Validation must not access the network.'))
    assert cli.main(['--input',str(payload_file)]) == 0
    assert 'No network request sent' in capsys.readouterr().out


@pytest.mark.parametrize('url', ['http://example.invalid','https://user:password@example.invalid','https://example.invalid?token=secret','file:///tmp/file','https://example.invalid/#secret'])
def test_cli_rejects_unprotected_or_credential_urls(url):
    with pytest.raises(ValueError):
        cli.api_origin(url)


def test_cli_requires_persistent_operation_key_and_staff_token(payload_file, monkeypatch):
    monkeypatch.delenv('PULSO_FIELD_TOKEN',raising=False)
    assert cli.main(['--input',str(payload_file),'--submit']) == 2
    assert cli.main(['--input',str(payload_file),'--submit','--idempotency-key',str(uuid4())]) == 2


def test_cli_sends_one_authorized_request_and_saves_private_receipt(payload_file, monkeypatch, tmp_path, capsys):
    from io import BytesIO
    key = str(uuid4())
    receipt = {'asset':{'asset_id':'SAMPLE-ASSET'},'observation':{'id':'SAMPLE-OBSERVATION'}}
    calls = []
    def send(request):
        calls.append(request)
        assert request.get_header('Authorization') == 'Bearer FAKE-TEST-TOKEN'
        assert request.get_header('Idempotency-key') == key
        assert request.full_url == 'https://api.example.invalid/api/gov/field-inventory/assets'
        return BytesIO(json.dumps(receipt).encode())
    monkeypatch.setenv('PULSO_FIELD_TOKEN','FAKE-TEST-TOKEN')
    monkeypatch.setattr(cli,'open_request',send)
    output = tmp_path/'receipt.json'
    assert cli.main(['--input',str(payload_file),'--submit','--idempotency-key',key,
        '--base-url','https://api.example.invalid','--receipt',str(output)]) == 0
    assert len(calls) == 1 and json.loads(output.read_text()) == receipt
    assert 'FAKE-TEST-TOKEN' not in capsys.readouterr().out


def test_cli_does_not_claim_a_failed_response_is_an_uncommitted_operation(payload_file, monkeypatch, capsys):
    monkeypatch.setenv('PULSO_FIELD_TOKEN','FAKE-TEST-TOKEN')
    def unavailable(request):
        raise URLError('FAKE private error that should not be echoed')
    monkeypatch.setattr(cli,'open_request',unavailable)
    assert cli.main(['--input',str(payload_file),'--submit','--idempotency-key',str(uuid4())]) == 1
    error = capsys.readouterr().err
    assert 'Preserve the operation key and original input' in error and 'FAKE private' not in error


def test_cli_redirects_do_not_forward_bearer_tokens():
    assert cli.NoRedirect().redirect_request(None,None,302,'redirect',{},'https://other.example.invalid') is None


def test_cli_validation_errors_do_not_echo_private_fields(payload_file, capsys):
    payload = candidate(maintenance_authority='FAKE sensitive private note')
    payload_file.write_text(json.dumps(payload),encoding='utf-8')
    assert cli.main(['--input',str(payload_file)]) == 2
    assert 'FAKE sensitive' not in capsys.readouterr().err
