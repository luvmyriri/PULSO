"""Cross-portal contracts, with provider calls mocked and data in disposable PostGIS."""
from unittest.mock import patch
from starlette.requests import Request
from fastapi import HTTPException
import pytest
import auth
import models
import resident_accounts
import main
from types import SimpleNamespace
from sqlalchemy import text
from tests.test_government_workspace import context, draft, transition
from utils.rate_limiter import SlidingWindowRateLimiter, auth_limiter, availability_check_limiter, report_submission_limiter


def test_registration_confirmation_and_government_account_restriction(context):
    client, sessions, tokens = context
    auth_limiter.reset()
    captured = []
    payload = dict(full_name='FAKE Integrated resident', email='integrated@test.invalid',
                   phone_number='09171234567', password='FakeRegistrationPassword2026', barangay='FAKE Area one')
    with patch('main.send_resident_confirmation', side_effect=lambda resident, code: captured.append(code) or True):
        response = client.post('/api/auth/register', json=payload)
    assert response.status_code == 200, response.text
    resident_id = response.json()['id']
    with sessions() as db:
        resident = db.get(models.Resident, resident_id)
        assert not resident.is_verified
        assert resident.verification_code.startswith('hmac:') and captured[0] not in resident.verification_code
        assert resident.email_code_expires_at > resident_accounts.now()
        assert resident.normalized_phone_number == '+639171234567'
        assert resident.barangay_id == 1 and resident.district_id == 1
        assert resident.kyc_level == 'Bronze (Self-Signed)'
    verified = client.post('/api/auth/verify-code', json=dict(email=payload['email'], code=captured[0]))
    assert verified.status_code == 200, verified.text
    headers = {'Authorization': 'Bearer ' + auth.create_access_token({'sub': payload['email'], 'sv': 0})}
    assert client.get(f'/api/users/{resident_id}', headers=headers).status_code == 200
    accounts = client.get('/api/admin/residents?search=Integrated', headers=tokens['platform']).json()
    assert accounts['total'] == 1 and accounts['items'][0]['sign_in_confirmed']
    restricted = client.patch(f'/api/admin/residents/{resident_id}/status', headers=tokens['platform'],
        json=dict(expected_version=1, status='suspended', reason='FAKE integration restriction check'))
    assert restricted.status_code == 200, restricted.text
    assert client.get(f'/api/users/{resident_id}', headers=headers).status_code == 403


def test_legacy_shared_contacts_are_detected_without_merging_accounts(context):
    client, sessions, tokens = context
    availability_check_limiter.reset()
    with sessions() as db:
        for resident_id, number in ((100, '09171234567'), (101, '+639171234567')):
            db.get(models.Resident, resident_id).phone_number = number
        db.commit()
    result = client.post('/api/auth/check-availability', json=dict(mobile='639171234567'))
    assert result.status_code == 200 and result.json()['mobile_available'] is False
    with sessions() as db:
        assert db.get(models.Resident, 100).phone_number == '09171234567'
        assert db.get(models.Resident, 101).phone_number == '+639171234567'


def test_verified_contact_cannot_be_duplicated_by_registration_or_profile(context):
    client, sessions, tokens = context
    auth_limiter.reset()
    with sessions() as db:
        owner = db.get(models.Resident, 100)
        owner.email = 'first.last@gmail.com'
        owner.phone_number = '09171234567'
        db.commit()
    blocked = client.post('/api/auth/register', json=dict(full_name='FAKE Duplicate',
        email='firstlast+other@googlemail.com', password='FakeRegistrationPassword2026'))
    assert blocked.status_code == 409, blocked.text
    blocked_phone = client.patch('/api/users/101', headers=tokens['resident2'], json=dict(phone_number='+639171234567'))
    assert blocked_phone.status_code == 409, blocked_phone.text


def test_resident_intake_enters_government_review_and_preserves_ownership(context):
    client, sessions, tokens = context
    report_submission_limiter.reset()
    with sessions() as db:
        db.execute(text("SELECT setval(pg_get_serial_sequence('reports', 'id'), (SELECT max(id) FROM reports), true)"))
        db.commit()
    with patch('system_settings.report_analysis', return_value={'analysis_status': 'disabled'}):
        submitted = client.post('/api/reports', headers=tokens['owner'], data=dict(category='Roads',
            description='FAKE newly reported pavement defect for integration', location_string='FAKE reviewed location',
            location_barangay='FAKE Area one'))
    assert submitted.status_code == 201, submitted.text
    report = submitted.json()
    docket = client.get(f'/api/gov/reports/{report["id"]}/docket', headers=tokens['chief'])
    assert docket.status_code == 200, docket.text
    assert docket.json()['report']['ticket_id'] == report['ticket_id']
    assigned = client.post(f'/api/gov/report-review/{report["id"]}/assignment', headers=tokens['chief'],
        json=dict(expected_version=docket.json()['report']['version'], assigned_to_id=3, reason='FAKE assign incoming resident concern'))
    assert assigned.status_code == 200, assigned.text
    own = client.get('/api/reports/user/100', headers=tokens['owner']).json()
    assert any(row['id'] == report['id'] for row in own)
    assert client.get(f'/api/reports/user/100', headers=tokens['resident2']).status_code == 403
    with sessions() as db:
        row = db.get(models.Report, report['id'])
        assert row.resident_id == 100 and row.review_assigned_to_id == 3
        assert row.submission_source == 'web_resident'
        assert row.status != 'resolved'


@pytest.mark.parametrize('publication_format', ['news', 'advisory', 'announcement'])
def test_resident_feed_only_receives_reviewed_published_government_snapshots(context, publication_format):
    client, sessions, tokens = context
    item = draft(client, tokens, publication_format=publication_format)
    assert not client.get('/api/announcements').json()
    assert client.get(f'/api/announcements/{item["id"]}').status_code == 404
    for status in ('in_review', 'approved', 'published'):
        item = transition(client, tokens, item, status)
    public = client.get('/api/announcements').json()
    assert len(public) == 1 and public[0]['id'] == item['id']
    assert public[0]['publication_format'] == publication_format
    assert 'author_id' not in public[0] and 'internal_notes' not in public[0]


def test_unverified_bearer_payload_cannot_select_rate_limit_identity():
    limiter = SlidingWindowRateLimiter(1, 60, 'FAKE rate limit')
    def request(token):
        return Request({'type': 'http', 'headers': [(b'authorization', f'Bearer {token}'.encode())], 'client': ('127.0.0.1', 1234)})
    limiter.check(request('forged-one'))
    with pytest.raises(HTTPException) as error:
        limiter.check(request('forged-two'))
    assert error.value.status_code == 429


def test_email_confirmation_secret_is_not_sent_to_unverified_phone():
    resident = SimpleNamespace(full_name='FAKE Resident', email='fake@test.invalid', phone_number='09171234567')
    with patch('main.send_otp_email', return_value=True) as email, patch('main.sms_utils.send_plain_sms') as sms:
        assert main.send_resident_confirmation(resident, '456789')
    email.assert_called_once()
    sms.assert_not_called()


def test_password_recovery_uses_confirmed_email_not_unverified_profile_phone(context):
    client, sessions, tokens = context
    with sessions() as db:
        db.get(models.Resident, 100).phone_number = '09171234567'
        db.commit()
    with patch('main.send_otp_email', return_value=True), patch('main.sms_utils.send_plain_sms') as sms:
        response = client.post('/api/auth/forgot-password', json=dict(email='owner@test.invalid'))
    assert response.status_code == 200, response.text
    assert response.json()['sms_sent'] is False
    sms.assert_not_called()
