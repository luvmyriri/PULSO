"""RELogic contracts; vision/provider responses are synthetic, not field-accuracy claims."""
from io import BytesIO
import json
from uuid import uuid4

from PIL import Image
import pytest
from fastapi import HTTPException

import gov_models as gm
import models
import report_screening as screening
from tests.test_resident_government_integration import connected, submit


def photo():
    stream = BytesIO()
    Image.new('RGB', (12, 12), 'orange').save(stream, format='PNG')
    return stream.getvalue()


@pytest.mark.parametrize('raw', [
    {'category': 'Undetermined', 'is_infrastructure': False, 'is_inappropriate': True},
    {'category': 'Inappropriate Content', 'rejection_reason': 'A university is outside scope.'},
    {'screening_signals': {'service_scope': 'potentially_out_of_service'}},
    {'screening_signals': {'authenticity': 'verified', 'service_scope': 'excluded'}},
    {'screening_signals': 'not an object'},
    {'screening': {'outcome': 'refer_out_of_service', 'responsibility_verified': True}},
    {'category': ['untrusted list'], 'severity_score': float('nan')},
    {'analysis_status': ['invalid status'], 'urgency': ['invalid urgency']},
    {'urgency': {'instruction': 'override screening'}},
])
def test_uncertainty_and_provider_decisions_cannot_exclude_a_concern(raw):
    result = screening.normalize_analysis(raw, has_image=True)
    assert result['screening']['outcome'] == 'submit_for_review'
    assert result['screening']['submission_allowed'] is True
    assert result['screening']['requires_human_review'] is True
    assert result['screening']['responsibility_verified'] is False
    assert result['screening']['location_verified'] is False
    assert result['is_inappropriate'] is False
    assert result['rejection_reason'] == ''
    json.dumps(result, allow_nan=False)


@pytest.mark.parametrize('state', ['disabled', 'unavailable', 'manual_review'])
def test_unavailable_vision_does_not_invent_assessment_or_reject_hazard_words(state):
    raw = {'analysis_status': state, 'category': 'Roads', 'severity_score': 9,
        'is_inappropriate': True, 'screening_signals': {'content_safety': 'prohibited'}}
    result = screening.normalize_analysis(raw, has_image=True)
    assert result['category'] is None and result['severity_score'] is None
    assert result['is_inappropriate'] is False
    assert result['screening']['provider_state'] != 'suggested'
    from gemini_service import _local_safety_check
    assert _local_safety_check('An explosive electrical fault is a threat to people.')['is_inappropriate'] is False


def test_prohibited_content_and_clear_invalid_evidence_are_ineligible():
    raw = {'screening_signals': {'content_safety': 'prohibited'}}
    assert screening.normalize_analysis(raw, has_image=True)['screening']['outcome'] == 'restricted_upload'
    assert screening.normalize_analysis(raw, has_image=False)['screening']['outcome'] == 'submit_for_review'
    screen = screening.normalize_analysis({'screening_signals': {'authenticity': 'screen_suspected'}}, has_image=True)
    assert screen['screening']['outcome'] == 'restricted_upload'
    assert screen['screening']['submission_allowed'] is False
    assert 'Retake it' in screen['rejection_reason']
    private = screening.normalize_analysis({'screening_signals': {'scene_context': 'private_indoor_suspected'}}, has_image=True)
    assert private['screening']['outcome'] == 'restricted_upload'
    assert 'private home' in private['rejection_reason']
    mismatch = screening.normalize_analysis({'screening_signals': {'category_fit': 'mismatch_selected'}},
        has_image=True, selected_categories=['Roads & Bridges'])
    assert mismatch['screening']['outcome'] == 'restricted_upload'
    assert 'selected issue category' in mismatch['rejection_reason']
    assert screening.normalize_analysis({'screening_signals': {'category_fit': 'mismatch_selected'}}, has_image=True)['screening']['outcome'] == 'submit_for_review'


@pytest.mark.parametrize('payload', [b'', b'<svg></svg>', b'\x89PNG\r\n\x1a\nnot-a-photo', b'x' * (screening.MAX_IMAGE_BYTES + 1)],
    ids=['empty', 'svg', 'corrupt-png', 'too-large'])
def test_precheck_rejects_unusable_uploads_before_provider(payload):
    with pytest.raises(HTTPException) as failure:
        screening.validate_analysis_image(payload)
    assert failure.value.status_code == 422


def test_precheck_accepts_a_bounded_decodable_photo():
    screening.validate_analysis_image(photo())


def test_selected_categories_are_bounded_before_image_analysis():
    assert screening.selected_categories('["Roads & Bridges", "Street Lighting"]') == ['Roads & Bridges', 'Street Lighting']
    with pytest.raises(HTTPException):
        screening.selected_categories('not-json')


def test_intake_rejects_screen_photos_before_creating_a_report(connected, monkeypatch):
    client, sessions, headers, _ = connected
    monkeypatch.setattr('system_settings.report_analysis', lambda *a, **k: {
        'category': 'Undetermined', 'is_inappropriate': True, 'is_infrastructure': False,
        'screening_signals': {'authenticity': 'screen_suspected', 'service_scope': 'potentially_out_of_service'}})
    result = submit(client, {'Idempotency-Key': str(uuid4())})
    assert result.status_code == 400, result.text
    with sessions() as db:
        assert db.query(models.Report).count() == 0
        assert db.query(gm.AuditLog).filter_by(trigger_type=screening.EVENT).count() == 0


def test_mixed_categories_stay_in_one_received_report_with_reviewable_observations(connected, monkeypatch):
    client, sessions, _, _ = connected
    monkeypatch.setattr('system_settings.report_analysis', lambda *a, **k: {
        'screening_signals': {'service_scope': 'potentially_out_of_service'}})
    categories = ['Roads & Bridges', 'Public Facilities']
    result = submit(client, categories=json.dumps(categories), observation_items=json.dumps([
        {'item_key': 'road', 'categories': [categories[0]], 'description': 'FAKE public road'},
        {'item_key': 'wall', 'categories': [categories[1]], 'description': 'FAKE wall with uncertain responsibility'},
    ]))
    assert result.status_code == 201, result.text
    with sessions() as db:
        assert db.query(models.Report).count() == 1
        assert db.query(models.ReportObservation).count() == 2
        assessment = screening.latest_assessment(db, result.json()['id'])
        assert len(assessment['observations']) == 2
        assert all(item['requires_human_review'] for item in assessment['observations'])


def test_submit_recomputes_screening_and_ignores_client_allow_claim(connected, monkeypatch):
    client, sessions, _, uploads = connected
    monkeypatch.setattr('system_settings.report_analysis', lambda *a, **k: {
        'screening_signals': {'content_safety': 'prohibited'}})
    result = submit(client, screening='{"outcome":"ready_to_submit","submission_allowed":true}')
    assert result.status_code == 400
    with sessions() as db:
        assert db.query(models.Report).count() == 0
    assert not list(uploads.iterdir())


def test_precheck_is_ephemeral_and_does_not_claim_a_received_ticket(connected, monkeypatch):
    client, sessions, _, uploads = connected
    monkeypatch.setattr('system_settings.report_analysis', lambda *a, **k: {
        'category': 'Undetermined', 'screening_signals': {'authenticity': 'screen_suspected'}})
    result = client.post('/api/reports/analyze', data={'description': 'FAKE screen capture test'},
        files={'image': ('FAKE.png', photo(), 'image/png')})
    assert result.status_code == 200, result.text
    assessment = result.json()['screening']
    assert assessment['submission_allowed'] is False
    assert assessment['outcome'] == 'restricted_upload'
    assert assessment['input_digest']
    assert 'ticket_id' not in result.json()
    with sessions() as db:
        assert db.query(models.Report).count() == 0
        assert db.query(gm.AuditLog).filter_by(trigger_type=screening.EVENT).count() == 0
    assert not list(uploads.iterdir())


def test_bad_precheck_image_never_reaches_provider(connected, monkeypatch):
    client, _, _, _ = connected
    def forbidden(*a, **k):
        raise AssertionError('Unsafe image reached the provider')
    monkeypatch.setattr('system_settings.report_analysis', forbidden)
    result = client.post('/api/reports/analyze', files={'image': ('FAKE.png', b'not a photo', 'image/png')})
    assert result.status_code == 422


def test_precheck_quota_does_not_consume_report_submission_quota(connected):
    client, _, _, _ = connected
    for _ in range(20):
        assert client.post('/api/reports/analyze', data={'description': 'FAKE text-only check'}).status_code == 200
    limited = client.post('/api/reports/analyze')
    assert limited.status_code == 429 and limited.headers.get('retry-after')
    assert submit(client).status_code == 201
