"""Google verification with explicit, loopback-only development test keys."""
import logging
import os
from urllib.parse import urlsplit
import httpx

TEST_SECRET = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'
LOOPBACK_HOSTS = {'localhost', '127.0.0.1', '::1'}
LEGACY_BYPASS_TOKENS = {'mobile_bypass', 'dev_bypass', 'mock_captcha_token'}


def verification_secret(request=None):
    local_test = os.getenv('PULSO_RECAPTCHA_LOCAL_TEST', '').lower() == 'true'
    if local_test:
        if os.getenv('PULSO_ENV', '').lower() != 'development' or request is None:
            return None
        peer = request.client.host if request.client else ''
        if peer not in LOOPBACK_HOSTS or request.url.hostname not in LOOPBACK_HOSTS:
            return None
        origin = request.headers.get('origin')
        if origin:
            try:
                if urlsplit(origin).hostname not in LOOPBACK_HOSTS:
                    return None
            except ValueError:
                return None
        return TEST_SECRET
    secret = os.getenv('RECAPTCHA_SECRET_KEY', '').strip()
    # An omitted key must not silently turn production verification into a test.
    return secret if secret and secret != TEST_SECRET else None


async def verify_recaptcha(token, request=None):
    if not isinstance(token, str) or not token.strip() or token in LEGACY_BYPASS_TOKENS:
        return False
    secret = verification_secret(request)
    if not secret:
        logging.getLogger(__name__).warning('CAPTCHA verification configuration is unavailable for this request.')
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post('https://www.google.com/recaptcha/api/siteverify',
                data={'secret': secret, 'response': token})
            response.raise_for_status()
            data = response.json()
            return isinstance(data, dict) and data.get('success') is True
    except (httpx.HTTPError, ValueError):
        logging.getLogger(__name__).warning('CAPTCHA provider verification failed.')
        return False
