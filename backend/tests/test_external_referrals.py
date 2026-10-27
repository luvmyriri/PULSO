"""Real HTTP/DB lifecycle checks in guarded disposable PostGIS; no external sends."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import hashlib
import pytest
from tests.test_government_workspace import context as core_context
import models
import gov_models as gm
from referral_models import ReferralRecipient, ExternalReferral, ReferralDelivery, ReferralPacket
from referral_transport import deliver_referrals, DispatchError


def future(): return (datetime.now(timezone.utc)+timedelta(days=2)).isoformat()


@pytest.fixture
def context(core_context, monkeypatch):
    monkeypatch.setenv('PULSO_REFERRAL_APPROVER_ROLES', 'city_engineer,asst_city_engineer')
    monkeypatch.setenv('PULSO_REFERRAL_REPLY_TO', 'reply@example.org')
    monkeypatch.setenv('PULSO_REFERRALS_ENABLED', 'true')
    monkeypatch.setenv('SMTP_USER', 'sender@example.org')
    monkeypatch.setenv('SMTP_PASS', 'FAKE-NOT-A-CREDENTIAL')
    _, sessions, _ = core_context
    with sessions() as db:
        delegated=db.get(models.Official,3).role_ref
        delegated.capabilities={**delegated.capabilities,'referrals':['view','verify']}
        db.commit()
    return core_context


def recipient(client, tokens, **values):
    body=dict(name='FAKE Utility department',email='receiver@example.org',phone='FAKE 123',verification_reference='FAKE verified test directory source')
    body.update(values)
    result=client.post('/api/gov/referrals/recipients',json=body,headers=tokens['platform'])
    assert result.status_code==201,result.text
    return result.json()


def draft(client,tokens,**values):
    person=recipient(client,tokens)
    report=client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['report']
    body=dict(report_id=1,expected_report_version=report['version'],recipient_id=person['id'],owner_id=2,
        reason='FAKE external responsibility requires coordination',summary='FAKE reviewed infrastructure concern without resident data',
        requested_action='FAKE inspect the issue and provide a response',next_follow_up_at=future(),disclosure_reviewed=True)
    body.update(values)
    result=client.post('/api/gov/referrals',json=body,headers=tokens['clerk'])
    assert result.status_code==201,result.text
    return result.json()


def command(client,tokens,item,action,actor='clerk',**values):
    body=dict(action=action,expected_version=item['version'],reason='FAKE documented referral decision')
    if action=='approve': body['expected_packet_hash']=item['preview_hash']
    if action=='send': body['expected_packet_hash']=item['packet_hash']
    if action in {'record_manual_handoff','acknowledge','decline','record_response','follow_up','assign_owner','confirm_sent'}:
        body['next_follow_up_at']=future()
    body.update(values)
    return client.post(f'/api/gov/referrals/{item["id"]}/commands',json=body,headers=tokens[actor])


def approved(client,tokens,**values):
    item=draft(client,tokens,**values)
    result=command(client,tokens,item,'approve',actor='chief')
    assert result.status_code==200,result.text
    return result.json()


def queued(client,tokens):
    item=approved(client,tokens)
    result=command(client,tokens,item,'send')
    assert result.status_code==200,result.text
    assert result.json()['transport']=='queued'
    return result.json()


def reload(client,tokens,item,actor='clerk'):
    response=client.get(f'/api/gov/referrals/{item["id"]}',headers=tokens[actor])
    assert response.status_code==200,response.text
    return response.json()


def test_draft_approval_dispatch_acknowledgment_and_separate_resolution(context):
    client,sessions,tokens=context
    item=queued(client,tokens)
    with patch('referral_transport.transmit') as sender:
        deliver_referrals(sessions)
        sender.assert_called_once()
        packet,pdf,_=sender.call_args.args
        assert pdf.startswith(b'%PDF') and 'resident' not in packet and packet['recipient_email']=='receiver@example.org'
    item=reload(client,tokens,item)
    assert item['status']=='awaiting_acknowledgment' and item['report_status']=='pending'
    item=command(client,tokens,item,'acknowledge',reference='FAKE-ACK-001').json()
    assert item['status']=='acknowledged' and item['report_status']=='pending'
    item=command(client,tokens,item,'record_response',reference='FAKE-RESPONSE-001').json()
    result=command(client,tokens,item,'close_coordination',reference='FAKE-CLOSE-001')
    assert result.status_code==200,result.text
    item=result.json()
    assert item['status']=='coordinated_closed' and item['report_status']=='pending'
    denied=command(client,tokens,item,'verify_report_resolution',reference='FAKE-OUTCOME',report_issue_addressed=True,expected_report_version=item['report_version'])
    assert denied.status_code==403
    result=command(client,tokens,item,'verify_report_resolution',actor='inspector',reference='FAKE-OUTCOME',report_issue_addressed=True,expected_report_version=item['report_version'])
    assert result.status_code==200,result.text
    with sessions() as db:
        assert db.get(models.Report,1).status=='resolved'


def test_explicit_authority_and_independent_approval(context,monkeypatch):
    client,sessions,tokens=context
    item=draft(client,tokens)
    assert command(client,tokens,item,'approve',actor='platform').status_code==403
    monkeypatch.setenv('PULSO_REFERRAL_APPROVER_ROLES','admin_clerk')
    assert command(client,tokens,item,'approve').status_code==403
    monkeypatch.delenv('PULSO_REFERRAL_APPROVER_ROLES')
    assert command(client,tokens,item,'approve',actor='chief').status_code==403


def test_preview_hash_and_stale_version_protect_approval(context):
    client,_,tokens=context
    item=draft(client,tokens)
    assert command(client,tokens,item,'approve',actor='chief',expected_packet_hash='stale').status_code==409
    changed=command(client,tokens,item,'follow_up',reference='FAKE-call').json()
    assert command(client,tokens,item,'approve',actor='chief').status_code==409
    assert command(client,tokens,changed,'approve',actor='chief').status_code==200


def test_directory_permission_scope_and_recipient_change(context):
    client,sessions,tokens=context
    assert client.post('/api/gov/referrals/recipients',json=dict(name='FAKE',email='wrong@example.org',verification_reference='FAKE reference'),headers=tokens['chief']).status_code==403
    item=approved(client,tokens)
    entry=client.get('/api/gov/referrals/options',headers=tokens['platform']).json()['recipients'][0]
    result=client.put(f'/api/gov/referrals/recipients/{entry["id"]}',json=dict(name=entry['name'],email='changed@example.org',phone=entry['phone'],verification_reference='FAKE new verification source',expected_version=entry['version']),headers=tokens['platform'])
    assert result.status_code==200,result.text
    assert command(client,tokens,item,'send').status_code==403
    with sessions() as db:
        db.get(models.Official,2).primary_jurisdiction=[2];db.commit()
    assert client.get(f'/api/gov/referrals/{item["id"]}',headers=tokens['clerk']).status_code==403
    assert client.get(f'/api/gov/referrals/{item["id"]}/letter',headers=tokens['owner']).status_code==403


def test_unknown_delivery_is_never_automatically_resent(context):
    client,sessions,tokens=context
    item=queued(client,tokens)
    with patch('referral_transport.transmit',side_effect=DispatchError('delivery_unknown',uncertain=True)) as sender:
        deliver_referrals(sessions)
        deliver_referrals(sessions)
        assert sender.call_count==1
    item=reload(client,tokens,item)
    assert item['transport']=='delivery_unknown' and item['status']=='approved'
    assert command(client,tokens,item,'send').status_code==403
    item=command(client,tokens,item,'confirm_not_sent',reference='FAKE mailbox trace confirmed no send').json()
    assert command(client,tokens,item,'send').status_code==200


def test_worker_rechecks_approval_before_transmission(context,monkeypatch):
    client,sessions,tokens=context
    item=queued(client,tokens)
    monkeypatch.setenv('PULSO_REFERRAL_APPROVER_ROLES','asst_city_engineer')
    with patch('referral_transport.transmit') as sender:
        deliver_referrals(sessions)
        sender.assert_not_called()
    assert reload(client,tokens,item)['transport_error']=='approval_or_recipient_changed'


def test_manual_handoff_and_reroute_keep_previous_history(context):
    client,sessions,tokens=context
    phone=recipient(client,tokens,name='FAKE phone-only office',email=None)
    item=approved(client,tokens,recipient_id=phone['id'])
    assert 'send' not in item['allowed_actions'] and 'record_manual_handoff' in item['allowed_actions']
    item=command(client,tokens,item,'record_manual_handoff',reference='FAKE stamped receipt').json()
    item=command(client,tokens,item,'decline',reference='FAKE declined responsibility').json()
    rerouted=draft(client,tokens,previous_referral_id=item['id'])
    assert reload(client,tokens,item)['status']=='superseded'
    assert rerouted['previous_referral_id']==item['id']
    with sessions() as db:
        assert db.get(models.Report,1).status=='pending'
        assert db.query(ReferralPacket).filter_by(referral_id=item['id']).count()==1


def test_packet_is_private_stable_and_retained_on_revision(context):
    client,sessions,tokens=context
    item=approved(client,tokens)
    first=client.get(f'/api/gov/referrals/{item["id"]}/letter',headers=tokens['chief'])
    second=client.get(f'/api/gov/referrals/{item["id"]}/letter',headers=tokens['chief'])
    assert first.content==second.content and hashlib.sha256(first.content).hexdigest()==item['packet_hash']
    assert first.headers['cache-control']=='private, no-store'
    assert client.get(f'/api/gov/referrals/{item["id"]}/letter',headers=tokens['resident2']).status_code==403
    item=command(client,tokens,item,'return_to_draft').json()
    assert item['status']=='draft' and item['packet_hash'] is None
    with sessions() as db:
        assert bytes(db.query(ReferralPacket).one().letter_pdf)==first.content


def test_work_verification_does_not_resolve_pending_external_referral(context):
    client,sessions,tokens=context
    item=draft(client,tokens)
    with sessions() as db:
        db.get(models.Report,1).status='in_progress'
        db.add(gm.WorkOrder(id=90,wo_number='FAKE-WO-90',title='FAKE linked assessment',district_id=1,assigned_to_id=4,assigned_by_id=1,report_id=1,status='completed_pending_review'))
        db.commit()
    result=client.post('/api/gov/work-orders/90/verify',json=dict(passed=True,notes='FAKE assessment completed, external follow-up remains',checklist_results={key:True for key in ['specifications','siteCleared','qualityTested','photoVerified']}),headers=tokens['inspector'])
    assert result.status_code==200,result.text
    with sessions() as db: assert db.get(models.Report,1).status=='in_progress'


def test_followup_is_in_personal_queue_and_overdue_filter(context):
    client,sessions,tokens=context
    item=draft(client,tokens)
    with sessions() as db:
        db.get(ExternalReferral,item['id']).next_follow_up_at=datetime.now(timezone.utc)-timedelta(days=1);db.commit()
    result=client.get('/api/gov/referrals?view=overdue',headers=tokens['clerk'])
    assert result.status_code==200 and result.json()['items'][0]['id']==item['id']
    queue=client.get('/api/gov/operations/today',headers=tokens['clerk'])
    assert queue.status_code==200,queue.text
    assert any(row['entity_type']=='referral' and row['assigned_to_id']==2 for row in queue.json()['needs_attention'])


def test_disabled_transport_prevents_queue_without_provider_call(context,monkeypatch):
    client,sessions,tokens=context
    item=approved(client,tokens)
    monkeypatch.setenv('PULSO_REFERRALS_ENABLED','false')
    with patch('referral_transport.transmit') as sender:
        assert command(client,tokens,item,'send').status_code==503
        deliver_referrals(sessions)
        sender.assert_not_called()
    with sessions() as db: assert db.query(ReferralDelivery).count()==0


def test_interrupted_worker_requires_reconciliation(context):
    client,sessions,tokens=context
    item=queued(client,tokens)
    with sessions() as db:
        delivery=db.query(ReferralDelivery).one();delivery.status='sending';delivery.started_at=datetime.now(timezone.utc)-timedelta(minutes=11);db.commit()
    with patch('referral_transport.transmit') as sender:
        deliver_referrals(sessions)
        sender.assert_not_called()
    assert reload(client,tokens,item)['transport']=='delivery_unknown'


def test_duplicate_queue_and_cross_referral_packet_access(context):
    client,sessions,tokens=context
    item=approved(client,tokens)
    assert command(client,tokens,item,'send').status_code==200
    assert command(client,tokens,item,'send').status_code==409
    other=draft(client,tokens)
    packet=item['approved_packets'][0]
    assert client.get(f'/api/gov/referrals/{other["id"]}/packets/{packet["id"]}/letter',headers=tokens['chief']).status_code==404
    with sessions() as db: assert db.query(ReferralDelivery).count()==1


def test_changed_source_stops_queued_dispatch(context):
    client,sessions,tokens=context
    item=queued(client,tokens)
    with sessions() as db:
        report=db.get(models.Report,1);report.status='under_review';db.commit()
    with patch('referral_transport.transmit') as sender:
        deliver_referrals(sessions)
        sender.assert_not_called()
    assert reload(client,tokens,item)['transport']=='failed'


def test_resolution_requires_independent_confirmation_and_all_referrals_closed(context):
    client,sessions,tokens=context
    item=draft(client,tokens)
    other=draft(client,tokens)
    with sessions() as db:
        db.get(ExternalReferral,item['id']).status='coordinated_closed';db.commit()
    item=reload(client,tokens,item)
    assert command(client,tokens,item,'verify_report_resolution',actor='inspector',reference='FAKE proof',expected_report_version=item['report_version']).status_code==422
    result=command(client,tokens,item,'verify_report_resolution',actor='inspector',reference='FAKE proof',expected_report_version=item['report_version'],report_issue_addressed=True)
    assert result.status_code==409
    assert 'follow-up' in result.json()['detail']


def test_owner_reassignment_is_scoped_and_recorded(context):
    client,sessions,tokens=context
    item=draft(client,tokens)
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[2];db.commit()
    assert command(client,tokens,item,'assign_owner',owner_id=1).status_code==403
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[1];db.commit()
    result=command(client,tokens,item,'assign_owner',owner_id=1)
    assert result.status_code==200,result.text
    assert result.json()['owner_id']==1 and result.json()['events'][0]['action']=='assign_owner'


def test_report_docket_hides_routing_for_ineligible_accounts(context):
    client,sessions,tokens=context
    chief=client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()
    assert chief['referral_permissions']['view'] and chief['referral_permissions']['create']
    with sessions() as db:
        db.add(gm.WorkOrder(id=90,wo_number='FAKE-WO-90',title='FAKE assigned field case',district_id=1,assigned_to_id=4,assigned_by_id=1,report_id=1,status='assigned'))
        db.commit()
    field=client.get('/api/gov/reports/1/docket',headers=tokens['field'])
    assert field.status_code==200,field.text
    assert field.json()['referral_permissions']==dict(view=False,create=False,approve=False,manage_directory=False)
    assert client.get('/api/gov/referrals?report_id=1',headers=tokens['field']).status_code==403
    assert client.get('/api/gov/referrals/options?report_id=1',headers=tokens['field']).status_code==403
    assert 'referrals' not in client.get('/api/gov/navigation',headers=tokens['chief']).json()['modules']


def test_explicit_referral_denial_wins_and_links_stay_in_reports(context):
    client,sessions,tokens=context
    item=draft(client,tokens)
    queue=client.get('/api/gov/operations/today',headers=tokens['clerk']).json()
    row=next(value for value in queue['needs_attention'] if value['entity_type']=='referral')
    assert row['action_url']==f'/gov/reports/1?reportTab=routing&referral={item["id"]}'
    assert client.get(f'/api/gov/referrals/{item["id"]}?report_id=2',headers=tokens['chief']).status_code==404
    with sessions() as db:
        role=models.SystemRole(name='FAKE no referral authority',capabilities={'referrals':[]})
        db.add(role);db.flush();db.get(models.Official,1).role_id=role.id;db.commit()
    assert client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['referral_permissions']['view'] is False
    assert client.get(f'/api/gov/referrals/{item["id"]}',headers=tokens['chief']).status_code==403
