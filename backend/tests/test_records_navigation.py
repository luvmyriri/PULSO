"""Navigation must agree with the records endpoint's real authorization."""
from tests.test_government_workspace import context
import models


def test_records_link_absent_when_records_endpoint_denies(context):
    client,_,tokens=context
    assert client.get('/api/gov/records-workspace/permissions',headers=tokens['chief']).status_code==403
    response=client.get('/api/gov/navigation',headers=tokens['chief'])
    assert response.status_code==200
    assert 'records' not in response.json()['modules']


def test_record_grant_reveals_section_without_granting_audit_or_upload(context):
    client,sessions,tokens=context
    with sessions() as db:
        role=models.SystemRole(name='FAKE read-only records',capabilities={'records':['view']})
        db.add(role);db.flush();db.get(models.Official,2).role_id=role.id;db.commit()
    permissions=client.get('/api/gov/records-workspace/permissions',headers=tokens['clerk'])
    assert permissions.status_code==200
    assert not permissions.json()['upload'] and not permissions.json()['audit']
    assert 'records' in client.get('/api/gov/navigation',headers=tokens['clerk']).json()['modules']
    assert client.get('/api/gov/records-workspace?view=audit',headers=tokens['clerk']).status_code==403


def test_removing_record_grant_removes_link_and_denies_endpoint(context):
    client,sessions,tokens=context
    with sessions() as db:
        role=models.SystemRole(name='FAKE revoked records',capabilities={'records':[]})
        db.add(role);db.flush();db.get(models.Official,2).role_id=role.id;db.commit()
    assert 'records' not in client.get('/api/gov/navigation',headers=tokens['clerk']).json()['modules']
    assert client.get('/api/gov/records-workspace/permissions',headers=tokens['clerk']).status_code==403
