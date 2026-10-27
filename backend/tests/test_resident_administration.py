"""Resident access, identity provenance and confirmation delivery in disposable data."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import patch
import pytest
import models, auth, resident_accounts as ra
import gov_models as gm
from tests.test_government_workspace import context


def command(**values):
    return dict(expected_version=0,reason='FAKE documented resident account review',**values)


def test_resident_list_has_no_fabricated_identity_or_activity(context):
    client,sessions,tokens=context
    result=client.get('/api/admin/residents',headers=tokens['platform'])
    assert result.status_code==200,result.text
    assert result.json()['total']==2  # Names and email patterns must not silently hide accounts.
    item=result.json()['items'][0]
    assert item['barangay']=='Not recorded' and item['id_type'] is None
    assert item['id_verification_status']=='N/A' and item['sign_in_confirmed']
    assert 'last_active' not in item and 'password_hash' not in item
    assert item['masked_email']!='owner@test.invalid'
    identity=client.get('/api/admin/residents/100/verification',headers=tokens['platform']).json()
    assert not identity['has_id_photo'] and identity['masked_id_number'] is None
    with sessions() as db:
        assert db.query(gm.AuditLog).filter_by(action='Resident identity metadata inspected').count()==1


def test_access_change_revokes_sessions_and_is_atomic(context):
    client,sessions,tokens=context
    response=client.patch('/api/admin/residents/100/status',json=command(status='suspended'),headers=tokens['platform'])
    assert response.status_code==200,response.text
    assert response.json()['version']==1
    assert client.get('/api/notifications/user/100',headers=tokens['owner']).status_code==403
    restored=client.patch('/api/admin/residents/100/status',json={**command(status='active'),'expected_version':1},headers=tokens['platform'])
    assert restored.status_code==200
    assert client.get('/api/notifications/user/100',headers=tokens['owner']).status_code==401
    new={'Authorization':'Bearer '+auth.create_access_token({'sub':'owner@test.invalid','sv':2})}
    assert client.get('/api/notifications/user/100',headers=new).status_code==200
    with sessions() as db:
        assert db.query(gm.AuditLog).filter_by(action='Resident account access changed').count()==2
        assert db.query(models.Notification).filter_by(resident_id=100).count()==2


def test_concurrent_access_changes_reject_stale_version(context):
    client,sessions,tokens=context
    def save(status):
        return client.patch('/api/admin/residents/100/status',json=command(status=status),headers=tokens['platform']).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(save,['suspended','deactivated']))==[200,409]


def test_legacy_resident_access_alias_uses_same_history_and_version_guard(context):
    client,sessions,tokens=context
    body=dict(action='suspend',reason='FAKE documented resident restriction',expected_version=0)
    saved=client.patch('/api/gov/users/100/status',json=body,headers=tokens['platform'])
    assert saved.status_code==200,saved.text
    assert saved.json()['version']==1 and saved.json()['status']=='suspended'
    assert client.patch('/api/gov/users/100/status',json=body,headers=tokens['platform']).status_code==409
    with sessions() as db:
        assert db.get(models.Resident,100).access_version==1
        assert db.query(gm.AuditLog).filter_by(action='Resident account access changed').count()==1


def test_audit_failure_rolls_back_access_change(context):
    client,sessions,tokens=context
    with patch('resident_accounts.audit',side_effect=RuntimeError('FAKE audit failure')):
        with pytest.raises(RuntimeError):
            client.patch('/api/admin/residents/100/status',json=command(status='suspended'),headers=tokens['platform'])
    with sessions() as db:
        resident=db.get(models.Resident,100)
        assert resident.is_active and resident.access_version==0
        assert db.query(models.Notification).count()==0


@pytest.mark.parametrize('body',[{'decision':'approve'},{'decision':'anything','reference':'FAKE ref'},{'decision':'approve','reference':'  '}])
def test_identity_review_requires_explicit_decision_and_external_reference(context,body):
    client,_,tokens=context
    assert client.post('/api/admin/residents/100/verify',json=command(**body),headers=tokens['platform']).status_code==422


def test_identity_review_does_not_confirm_sign_in_and_rejection_clears_old_claim(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Resident,100).is_verified=False;db.commit()
    result=client.post('/api/admin/residents/100/verify',json=command(decision='approve',reference='FAKE external identity review 001'),headers=tokens['platform'])
    assert result.status_code==200,result.text
    assert not result.json()['sign_in_confirmed']
    assert result.json()['id_verified_at'] and result.json()['id_review_reference']
    rejected=client.post('/api/admin/residents/100/verify',json={**command(decision='reject',reference='FAKE corrected review 002'),'expected_version':1},headers=tokens['platform'])
    assert rejected.status_code==200,rejected.text
    assert rejected.json()['id_verified_at'] is None
    history=client.get('/api/admin/residents/100/history',headers=tokens['platform'])
    assert history.status_code==200,history.text
    assert history.json()['total']==2
    assert history.json()['items'][0]['reference']=='FAKE corrected review 002'


def test_scoped_read_does_not_leak_out_of_scope_report_counts(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,6).primary_jurisdiction=[1]
        db.get(models.Resident,100).district_id=1
        db.get(models.Report,2).barangay_id=2
        db.get(models.Resident,101).district_id=2;db.commit()
    item=client.get('/api/admin/residents/100',headers=tokens['platform']).json()
    assert item['reports_count']==1
    assert client.get('/api/admin/residents/101/history',headers=tokens['platform']).status_code==403


def test_view_only_administrator_cannot_modify_residents(context):
    client,sessions,tokens=context
    with sessions() as db:
        role=models.SystemRole(name='FAKE resident reader',capabilities={'admin':['residents_view']})
        db.add(role);db.flush();db.get(models.Official,3).role_id=role.id;db.commit()
    item=client.get('/api/admin/residents/100',headers=tokens['inspector'])
    assert item.status_code==200 and item.json()['allowed_actions']==[]
    assert client.patch('/api/admin/residents/100/status',json=command(status='suspended'),headers=tokens['inspector']).status_code==403


def pending(sessions):
    with sessions() as db:
        resident=db.get(models.Resident,100);resident.is_verified=False;db.commit()


def test_confirmation_uses_hashed_expiring_single_use_code(context):
    client,sessions,tokens=context
    pending(sessions)
    with patch('main.send_otp_email',return_value=True) as sender:
        response=client.post('/api/admin/residents/100/resend-confirmation',json=command(),headers=tokens['platform'])
    assert response.status_code==200,response.text
    assert response.json()['delivery_status']=='smtp_accepted'
    code=sender.call_args.args[1]
    with sessions() as db:
        resident=db.get(models.Resident,100)
        assert resident.verification_code.startswith('hmac:') and code not in resident.verification_code
        assert resident.email_code_expires_at>ra.now()
        assert code not in '\n'.join(event.details for event in db.query(gm.AuditLog))
    body={'email':'owner@test.invalid','code':code}
    assert client.post('/api/auth/verify-registration',json=body).status_code==200
    assert client.post('/api/auth/verify-registration',json=body).status_code==400


def test_confirmation_provider_failure_never_claims_success(context):
    client,sessions,tokens=context
    pending(sessions)
    with patch('main.send_otp_email',return_value=False):
        result=client.post('/api/admin/residents/100/resend-confirmation',json=command(),headers=tokens['platform'])
    assert result.status_code==503
    history=client.get('/api/admin/residents/100/history',headers=tokens['platform']).json()
    assert history['items'][0]['delivery_status']=='failed'
    with patch('main.send_otp_email') as sender:
        result=client.post('/api/admin/residents/100/resend-confirmation',json={**command(),'expected_version':1},headers=tokens['platform'])
    assert result.status_code==429
    sender.assert_not_called()


def test_expired_legacy_and_exhausted_codes_are_rejected(context):
    client,sessions,_=context
    pending(sessions)
    with sessions() as db:
        resident=db.get(models.Resident,100);resident.verification_code='123456';db.commit()
    assert client.post('/api/auth/verify-registration',json={'email':'owner@test.invalid','code':'123456'}).status_code==400
    with sessions() as db:
        resident=db.get(models.Resident,100);code=ra.prepare_code(resident);resident.email_code_expires_at=ra.now()-timedelta(seconds=1);db.commit()
    assert client.post('/api/auth/verify-registration',json={'email':'owner@test.invalid','code':code}).status_code==400
    with sessions() as db:
        resident=db.get(models.Resident,100);code=ra.prepare_code(resident);db.commit()
    for _ in range(5):
        assert client.post('/api/auth/verify-registration',json={'email':'owner@test.invalid','code':'wrong'}).status_code==400
    assert client.post('/api/auth/verify-registration',json={'email':'owner@test.invalid','code':code}).status_code==400


def test_concurrent_confirmation_can_be_accepted_only_once(context):
    client,sessions,_=context
    pending(sessions)
    with sessions() as db:
        code=ra.prepare_code(db.get(models.Resident,100));db.commit()
    def accept(_): return client.post('/api/auth/verify-registration',json={'email':'owner@test.invalid','code':code}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(accept,range(2)))==[200,400]
