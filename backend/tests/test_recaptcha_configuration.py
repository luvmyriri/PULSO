"""Local CAPTCHA configuration never silently becomes production verification."""
import asyncio
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from starlette.requests import Request
import recaptcha_service as captcha


def request(host='127.0.0.1', peer='127.0.0.1', origin='http://127.0.0.1:5173'):
    return Request({'type': 'http', 'scheme': 'http', 'server': (host, 33159),
        'path': '/api/auth/login', 'query_string': b'', 'client': (peer, 1234),
        'headers': [(b'host', f'{host}:33159'.encode()), (b'origin', origin.encode())]})


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch):
    for name in ('PULSO_RECAPTCHA_LOCAL_TEST', 'PULSO_ENV', 'RECAPTCHA_SECRET_KEY'):
        monkeypatch.delenv(name, raising=False)


def test_no_implicit_test_secret(monkeypatch):
    assert captcha.verification_secret(request()) is None
    monkeypatch.setenv('RECAPTCHA_SECRET_KEY', captcha.TEST_SECRET)
    assert captcha.verification_secret(request()) is None


def test_real_secret_is_used_without_local_mode(monkeypatch):
    monkeypatch.setenv('RECAPTCHA_SECRET_KEY', 'FAKE-configured-secret')
    assert captcha.verification_secret(request()) == 'FAKE-configured-secret'


@pytest.mark.parametrize('environment', ['', 'production', 'staging'])
def test_test_key_rejected_outside_explicit_development(monkeypatch, environment):
    monkeypatch.setenv('PULSO_RECAPTCHA_LOCAL_TEST', 'true')
    monkeypatch.setenv('PULSO_ENV', environment)
    assert captcha.verification_secret(request()) is None


@pytest.mark.parametrize('params', [dict(host='pulso.example'), dict(peer='192.168.1.5'),
    dict(origin='https://pulso.example'), dict(origin='http://['), dict(host='localhost.evil.example')])
def test_development_test_key_is_loopback_only(monkeypatch, params):
    monkeypatch.setenv('PULSO_RECAPTCHA_LOCAL_TEST', 'true')
    monkeypatch.setenv('PULSO_ENV', 'development')
    assert captcha.verification_secret(request(**params)) is None


def test_explicit_local_development_selects_official_test_secret(monkeypatch):
    monkeypatch.setenv('PULSO_RECAPTCHA_LOCAL_TEST', 'true')
    monkeypatch.setenv('PULSO_ENV', 'development')
    assert captcha.verification_secret(request()) == captcha.TEST_SECRET
    assert captcha.verification_secret() is None


@pytest.mark.parametrize('token', ['', None, 'mobile_bypass', 'dev_bypass', 'mock_captcha_token'])
def test_magic_tokens_never_authenticate(monkeypatch, token):
    monkeypatch.setenv('RECAPTCHA_SECRET_KEY', 'FAKE-configured-secret')
    with patch('recaptcha_service.httpx.AsyncClient') as client:
        assert asyncio.run(captcha.verify_recaptcha(token, request())) is False
    client.assert_not_called()


@pytest.mark.parametrize('success', [True, False, 'true', 1])
def test_verification_requires_real_provider_boolean(monkeypatch, success):
    monkeypatch.setenv('RECAPTCHA_SECRET_KEY', 'FAKE-configured-secret')
    response = httpx.Response(200, json={'success': success}, request=httpx.Request('POST', 'https://www.google.com/recaptcha/api/siteverify'))
    client = AsyncMock()
    client.post.return_value = response
    with patch('recaptcha_service.httpx.AsyncClient') as factory:
        factory.return_value.__aenter__.return_value = client
        assert asyncio.run(captcha.verify_recaptcha('FAKE-provider-token', request())) is (success is True)
    assert client.post.call_args.kwargs['data']['secret'] == 'FAKE-configured-secret'


def test_provider_failure_fails_closed(monkeypatch):
    monkeypatch.setenv('RECAPTCHA_SECRET_KEY', 'FAKE-configured-secret')
    client = AsyncMock()
    client.post.side_effect = httpx.TimeoutException('FAKE provider timeout')
    with patch('recaptcha_service.httpx.AsyncClient') as factory:
        factory.return_value.__aenter__.return_value = client
        assert asyncio.run(captcha.verify_recaptcha('FAKE-provider-token', request())) is False
