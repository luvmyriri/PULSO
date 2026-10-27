"""Staff account provisioning, access changes and credential recovery."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timedelta,timezone
import json
from unittest.mock import patch
import pytest
from sqlalchemy import text
import auth,models,staff_accounts
import gov_models as gm
from tests.test_government_workspace import context as core_context


@pytest.fixture
def context(core_context):
    client,sessions,tokens=core_context
    with sessions() as db:
        db.execute(text("SELECT setval(pg_get_serial_sequence('officials','id'),(SELECT max(id) FROM officials),true)"))
        db.commit()
    return core_context


def invite(client,tokens,**overrides):
    body=dict(full_name='FAKE Invited staff',email='newstaff@example.com',role='field_worker',district_ids=[1],reason='FAKE approved staff appointment')
    body.update(overrides)
    return client.post('/api/admin/staff',json=body,headers=tokens['platform'])


def secret(result,key='invite_link'):
    return result.json()[key].split('#token=')[1]


def accept(client,token):
    return client.post('/api/admin/staff-credentials/accept',json={'token':token,'password':'FAKE-long-passphrase-2026'})


def test_invitation_is_persisted_hashed_inactive_and_single_use(context):
    client,sessions,tokens=context
    result=invite(client,tokens)
    assert result.status_code==201,result.text
    data=result.json(); raw=secret(result)
    assert data['status']=='Invited' and data['delivery_status']=='manual_required'
    with sessions() as db:
        person=db.get(models.Official,data['id'])
        assert not person.is_active and person.invitation_pending
        assert person.primary_jurisdiction=={'district_ids':[1]}
        token=db.query(models.StaffCredentialToken).one()
        assert token.token_hash!=raw and len(token.token_hash)==64
        assert raw not in '\n'.join(e.details or '' for e in db.query(gm.AuditLog))
    assert accept(client,raw).status_code==200
    assert accept(client,raw).status_code==400
    with sessions() as db:
        person=db.get(models.Official,data['id'])
        assert person.is_active and not person.invitation_pending
        assert auth.verify_password('FAKE-long-passphrase-2026',person.password_hash)
        assert person.access_version==1


def test_reissued_and_expired_invites_cannot_be_redeemed(context):
    client,sessions,tokens=context
    result=invite(client,tokens); first=secret(result)
    again=client.post(f'/api/admin/staff/{result.json()["id"]}/resend-invite',json={'reason':'FAKE replacement invitation'},headers=tokens['platform'])
    assert again.status_code==200,again.text
    assert accept(client,first).status_code==400
    second=secret(again)
    with sessions() as db:
        token=db.query(models.StaffCredentialToken).filter_by(revoked_at=None).one()
        token.expires_at=datetime.now(timezone.utc)-timedelta(seconds=1);db.commit()
    assert accept(client,second).status_code==400


def test_reset_changes_password_once_and_revokes_previous_sessions(context):
    client,sessions,tokens=context
    result=client.post('/api/admin/staff/4/reset-password',json={'reason':'FAKE requested credential recovery'},headers=tokens['platform'])
    assert result.status_code==200,result.text
    raw=secret(result,'reset_link')
    assert client.get('/api/gov/obo-options',headers=tokens['field']).status_code==200
    assert accept(client,raw).status_code==200
    assert client.get('/api/gov/obo-options',headers=tokens['field']).status_code==401
    assert accept(client,raw).status_code==400
    with sessions() as db:
        person=db.get(models.Official,4)
        assert person.access_version==1
        assert auth.verify_password('FAKE-long-passphrase-2026',person.password_hash)
    signed=auth.create_access_token({'sub':'field@test.invalid','sv':1})
    assert client.get('/api/gov/obo-options',headers={'Authorization':'Bearer '+signed}).status_code==200


def test_concurrent_credential_acceptance_succeeds_once(context):
    client,sessions,tokens=context
    raw=secret(invite(client,tokens))
    with ThreadPoolExecutor(max_workers=2) as workers:
        codes=sorted(workers.map(lambda _:accept(client,raw).status_code,range(2)))
    assert codes==[200,400]
    with sessions() as db:
        assert db.query(gm.AuditLog).filter_by(action='Staff invitation accepted').count()==1


def test_staff_role_and_scope_edit_updates_real_capabilities_and_rejects_stale_edit(context):
    client,sessions,tokens=context
    with sessions() as db:
        old=models.SystemRole(name='FAKE_old',capabilities={'reports':['assign']})
        new=models.SystemRole(name='fake_new',label='FAKE New role',capabilities={'reports':['view']})
        db.add_all([old,new]);db.flush()
        person=db.get(models.Official,4);person.role_id=old.id;db.commit();new_id=new.id
    body={'role':'fake_new','district_ids':[2],'expected_version':0,'reason':'FAKE reassignment to another office'}
    saved=client.patch('/api/admin/staff/4',json=body,headers=tokens['platform'])
    assert saved.status_code==200,saved.text
    assert saved.json()['district_ids']==[2]
    assert client.patch('/api/admin/staff/4',json=body,headers=tokens['platform']).status_code==409
    with sessions() as db:
        person=db.get(models.Official,4)
        assert person.role_id==new_id and person.role=='fake_new'
        assert person.capabilities=={'reports':['view']}
        history=json.loads(db.query(gm.AuditLog).filter_by(action='Staff member updated').one().details)
        assert history['before']['role_id']!=history['after']['role_id']


def test_auditor_cannot_create_staff_or_change_settings(context):
    client,sessions,tokens=context
    with sessions() as db:
        role=models.SystemRole(name='FAKE audit-only',capabilities={'admin':['audit']});db.add(role);db.flush()
        db.get(models.Official,3).role_id=role.id;db.commit()
    assert client.get('/api/admin/audit-integrity',headers=tokens['inspector']).status_code==200
    assert client.get('/api/admin/staff',headers=tokens['inspector']).status_code==403
    assert client.get('/api/admin/residents/100/verification',headers=tokens['inspector']).status_code==403
    response=client.post('/api/admin/staff',json=dict(full_name='FAKE denied',email='denied@example.com',role='field_worker',district_ids=[1],reason='FAKE denied invitation'),headers=tokens['inspector'])
    assert response.status_code==403
    assert client.put('/api/admin/settings/sla_response_time',json={'value':{},'reason':'FAKE denied setting'},headers=tokens['inspector']).status_code==403


def test_staff_scope_and_role_grants_require_explicit_valid_choices(context):
    client,sessions,tokens=context
    assert invite(client,tokens,district_ids=[]).status_code==422
    assert invite(client,tokens,district_ids=[999]).status_code==422
    assert invite(client,tokens,role='made_up_role').status_code==422
    with sessions() as db:
        db.get(models.Official,6).primary_jurisdiction=[1];db.commit()
    assert invite(client,tokens,district_ids=[2]).status_code==403
    assert invite(client,tokens,district_ids=[],citywide=True).status_code==403
    result=invite(client,tokens)
    assert result.status_code==201,result.text
    # Another district's account is not visible or editable to this administrator.
    with sessions() as db:
        db.get(models.Official,4).primary_jurisdiction=[2];db.commit()
    visible=client.get('/api/admin/staff',headers=tokens['platform']).json()
    assert 4 not in {row['id'] for row in visible['items']}
    assert client.patch('/api/admin/staff/4',json={'expected_version':0,'office':'FAKE','reason':'FAKE out of scope change'},headers=tokens['platform']).status_code==403


def test_staff_audit_failure_rolls_back_account_creation(context):
    client,sessions,tokens=context
    with patch('staff_accounts.audit',side_effect=RuntimeError('FAKE audit unavailable')):
        with pytest.raises(RuntimeError,match='FAKE audit unavailable'):
            invite(client,tokens)
    with sessions() as db:
        assert db.query(models.Official).filter_by(email='newstaff@example.com').count()==0
        assert db.query(models.StaffCredentialToken).count()==0


def test_deactivation_revokes_pending_credentials_and_requires_fresh_version(context):
    client,sessions,tokens=context
    result=invite(client,tokens);id=result.json()['id'];raw=secret(result)
    changed=client.patch(f'/api/admin/staff/{id}',json={'is_active':False,'expected_version':0,'reason':'FAKE cancelled appointment'},headers=tokens['platform'])
    assert changed.status_code==200,changed.text
    assert accept(client,raw).status_code==400
    assert client.patch('/api/admin/staff/6',json={'is_active':False,'expected_version':0,'reason':'FAKE own deactivation'},headers=tokens['platform']).status_code==409


def test_staff_metadata_does_not_fabricate_mfa_or_login_times(context):
    client,sessions,tokens=context
    result=client.get('/api/admin/staff',headers=tokens['platform'])
    assert result.status_code==200,result.text
    for row in result.json()['items']:
        assert row['mfa_enabled'] is None and row['last_active'] is None


def test_staff_recovery_requests_are_private_deduplicated_and_do_not_send_email(context):
    client,sessions,tokens=context
    known=client.post('/api/admin/staff-credentials/request',json={'email':'newstaff@example.com'})
    assert known.status_code==200
    with sessions() as db:
        db.get(models.Official,4).email='staff@example.com';db.commit()
    requested=client.post('/api/admin/staff-credentials/request',json={'email':'staff@example.com'})
    assert requested.status_code==200
    assert requested.json()==known.json()
    assert client.post('/api/admin/staff-credentials/request',json={'email':'staff@example.com'}).status_code==200
    with sessions() as db:
        notices=db.query(models.Notification).filter_by(title='Staff password recovery requested').all()
        assert len(notices)==1
        assert notices[0].official_id==6 and 'user=4' in notices[0].target_url
        assert db.query(models.StaffCredentialToken).count()==0
        assert db.query(gm.AuditLog).filter_by(action='Staff password recovery requested').count()==1


def test_alternate_staff_role_and_status_paths_use_the_same_guards(context):
    client,sessions,tokens=context
    assert client.patch('/api/gov/users/4/status',json={'action':'deactivate','reason':'FAKE account restriction'},headers=tokens['platform']).status_code==428
    response=client.patch('/api/gov/users/4/role',json={'role':'project_engineer','expected_version':0,'reason':'FAKE reassignment decision'},headers=tokens['platform'])
    assert response.status_code==200,response.text
    assert response.json()['version']==1
    response=client.patch('/api/gov/users/4/status',json={'action':'deactivate','expected_version':1,'reason':'FAKE account restriction'},headers=tokens['platform'])
    assert response.status_code==200,response.text
    with sessions() as db:
        person=db.get(models.Official,4)
        assert person.is_suspended and not person.is_active and person.access_version==2


def test_concurrent_administrators_cannot_remove_each_others_last_access(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(models.Official(id=7,full_name='FAKE second admin',email='admin2@test.invalid',password_hash='test-only',role='system_admin',is_active=True,is_suspended=False))
        db.commit()
    other={'Authorization':'Bearer '+auth.create_access_token({'sub':'admin2@test.invalid'})}
    requests=[(7,tokens['platform']),(6,other)]
    def deactivate(entry):
        id,headers=entry
        return client.patch(f'/api/admin/staff/{id}',json={'is_active':False,'expected_version':0,'reason':'FAKE concurrent admin departure'},headers=headers).status_code
    with ThreadPoolExecutor(max_workers=2) as workers:
        result=list(workers.map(deactivate,requests))
    assert result.count(200)==1 and all(code in (200,401,403,409) for code in result)
    with sessions() as db:
        assert db.query(models.Official).filter(models.Official.role=='system_admin',models.Official.is_active==True,models.Official.is_suspended==False).count()==1


def test_explicit_empty_admin_grant_overrides_platform_role(context):
    client,sessions,tokens=context
    with sessions() as db:
        role=models.SystemRole(name='FAKE denied admin',capabilities={'admin':[]});db.add(role);db.flush()
        db.get(models.Official,6).role_id=role.id;db.commit()
    assert client.get('/api/admin/staff',headers=tokens['platform']).status_code==403
    assert client.get('/api/admin/access',headers=tokens['platform']).status_code==403


def test_role_definition_changes_are_audited_and_revoke_linked_sessions(context):
    client,sessions,tokens=context
    data={'name':'fake_staff','label':'FAKE Staff','capabilities':{'reports':['view']},'reason':'FAKE approved role definition'}
    created=client.post('/api/gov/roles',json=data,headers=tokens['platform'])
    assert created.status_code==200,created.text
    id=created.json()['id']
    with sessions() as db:
        db.get(models.Official,4).role_id=id;db.commit()
    changed=client.put(f'/api/gov/roles/{id}',json={**data,'capabilities':{'reports':[]},'expected_capabilities':{'reports':['view']}},headers=tokens['platform'])
    assert changed.status_code==200,changed.text
    assert client.get('/api/gov/obo-options',headers=tokens['field']).status_code==401
    assert client.put(f'/api/gov/roles/{id}',json={**data,'expected_capabilities':{'reports':['view']}},headers=tokens['platform']).status_code==409
    with sessions() as db:
        assert db.query(gm.AuditLog).filter_by(action='Staff role definition updated').count()==1


def test_self_profile_updates_do_not_cross_resident_and_official_ids(context):
    client,sessions,tokens=context
    with sessions() as db:
        # Both identity tables can contain the same numeric ID.
        db.add(models.Resident(id=4,full_name='FAKE overlapping resident',email='overlap@example.com',password_hash='test-only',is_active=True,is_verified=True))
        db.commit()
    result=client.patch('/api/users/4',json={'full_name':'FAKE updated official'},headers=tokens['field'])
    assert result.status_code==200,result.text
    assert result.json()['full_name']=='FAKE updated official'
    with sessions() as db:
        assert db.get(models.Official,4).full_name=='FAKE updated official'
        assert db.get(models.Resident,4).full_name=='FAKE overlapping resident'
    assert client.get('/api/users/100',headers=tokens['field']).status_code==403


def test_staff_password_acceptance_supports_real_sign_in_and_rejects_short_passwords(context):
    client,sessions,tokens=context
    created=invite(client,tokens);raw=secret(created)
    assert client.post('/api/admin/staff-credentials/accept',json={'token':raw,'password':'short'}).status_code==422
    assert accept(client,raw).status_code==200
    login=client.post('/api/auth/login',data={'username':'newstaff@example.com','password':'FAKE-long-passphrase-2026'})
    assert login.status_code==200,login.text
    signed={'Authorization':'Bearer '+login.json()['access_token']}
    assert client.get('/api/gov/obo-options',headers=signed).status_code==200
    # Resident OTP recovery cannot change staff credentials.
    assert client.post('/api/auth/forgot-password',json={'email':'newstaff@example.com'}).status_code==409


def test_administrative_resident_aliases_keep_the_same_district_scope(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,6).primary_jurisdiction=[1]
        db.get(models.Resident,100).district_id=1
        db.get(models.Resident,100).barangay_id=1
        db.get(models.Resident,101).district_id=2
        db.get(models.Resident,101).barangay_id=2
        db.commit()
    current=client.get('/api/admin/residents?show_test=true',headers=tokens['platform'])
    assert current.status_code==200,current.text
    assert {row['id'] for row in current.json()['items']}=={100}
    legacy=client.get('/api/gov/users?account_type=resident',headers=tokens['platform'])
    assert legacy.status_code==200,legacy.text
    assert {row['id'] for row in legacy.json()['users']}=={100}
    for method,path,body in [
        ('GET','/api/admin/residents/101/verification',None),
        ('POST','/api/admin/residents/101/verify',{'decision':'approve','reference':'FAKE-review-record','expected_version':0,'reason':'FAKE inaccessible verification'}),
        ('PATCH','/api/admin/residents/101/status',{'status':'suspended','expected_version':0,'reason':'FAKE inaccessible restriction'}),
        ('POST','/api/admin/residents/101/resend-confirmation',{'expected_version':0,'reason':'FAKE inaccessible confirmation'}),
    ]:
        response=client.request(method,path,json=body,headers=tokens['platform'])
        assert response.status_code==403,(path,response.text)


def test_delegated_administration_navigation_matches_access(context):
    client,sessions,tokens=context
    with sessions() as db:
        role=models.SystemRole(name='fake_audit_reader',capabilities={'admin':['audit_view']})
        db.add(role);db.flush();db.get(models.Official,3).role_id=role.id;db.commit()
    result=client.get('/api/admin/access',headers=tokens['inspector'])
    assert result.status_code==200 and result.json()['tabs']==['audit']
    assert 'settings' in client.get('/api/gov/navigation',headers=tokens['inspector']).json()['modules']
    assert client.get('/api/gov/roles',headers=tokens['inspector']).status_code==403


def test_staff_self_account_is_private_and_password_change_requires_reauthentication(context):
    client,sessions,tokens=context
    result=client.get('/api/gov/account',headers=tokens['field'])
    assert result.status_code==200,result.text
    assert result.json()['id']==4 and result.json()['name']=='FAKE field'
    assert client.get('/api/gov/account',headers=tokens['owner']).status_code==403
    with sessions() as db:
        db.get(models.Official,4).password_hash=auth.get_password_hash('FAKE-old-password')
        db.commit()
    changed=client.patch('/api/auth/change-password',json={'current_password':'FAKE-old-password','new_password':'FAKE-new-long-passphrase'},headers=tokens['field'])
    assert changed.status_code==200,changed.text
    assert changed.json()['reauthentication_required'] is True
    assert client.get('/api/gov/account',headers=tokens['field']).status_code==401


def test_unknown_credential_token_purpose_cannot_activate_staff(context):
    client,sessions,tokens=context
    created=invite(client,tokens);raw=secret(created)
    with sessions() as db:
        db.query(models.StaffCredentialToken).one().purpose='unknown'
        db.commit()
    assert accept(client,raw).status_code==400
    with sessions() as db:
        assert db.get(models.Official,created.json()['id']).invitation_pending


def test_legacy_admin_manage_grant_preserves_existing_platform_access(context):
    client,sessions,tokens=context
    with sessions() as db:
        role=models.SystemRole(name='system_admin',capabilities={'admin':['manage']})
        db.add(role);db.flush();db.get(models.Official,6).role_id=role.id;db.commit()
    result=client.get('/api/admin/access',headers=tokens['platform'])
    assert result.status_code==200 and 'staff' in result.json()['tabs']
    assert client.get('/api/admin/staff-options',headers=tokens['platform']).json()['can_manage'] is True
    created=invite(client,tokens)
    assert created.status_code==201,created.text


def test_legacy_admin_view_grant_is_read_only(context):
    client,sessions,tokens=context
    with sessions() as db:
        role=models.SystemRole(name='fake_read_only',capabilities={'admin':['view']})
        db.add(role);db.flush();db.get(models.Official,3).role_id=role.id;db.commit()
    assert client.get('/api/admin/staff',headers=tokens['inspector']).status_code==200
    assert client.get('/api/admin/audit-integrity',headers=tokens['inspector']).status_code==200
    assert client.patch('/api/admin/staff/4',json={'is_active':False,'expected_version':0,'reason':'FAKE denied restriction'},headers=tokens['inspector']).status_code==403


def test_historical_role_metadata_is_readable_without_becoming_action_grants(context):
    client,sessions,tokens=context
    with sessions() as db:
        role=models.SystemRole(name='fake_legacy',label='FAKE Historical role',capabilities={'reports':['view'],'pii_access':False,'specialization':'structural','jurisdiction_lock':True})
        db.add(role);db.commit()
    result=client.get('/api/gov/roles',headers=tokens['platform'])
    assert result.status_code==200,result.text
    row=next(item for item in result.json() if item['name']=='fake_legacy')
    assert row['capabilities']['pii_access'] is False
    assert row['capabilities']['specialization']=='structural'
    assert row['capabilities']['jurisdiction_lock'] is True
    assert row['capabilities']['reports']==['view']
