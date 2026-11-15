"""RELogic intake screening. Model observations never establish service responsibility."""
import hashlib
import json
import math
from datetime import datetime, timezone
from io import BytesIO
from typing import Literal

from fastapi import HTTPException
from PIL import Image
from pydantic import BaseModel, ConfigDict, ValidationError

VERSION = 'pulso-relogic-screening-v1'
EVENT = 'report_screening'
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000


class ScreeningSignals(BaseModel):
    model_config = ConfigDict(extra='forbid')
    service_scope: Literal['unknown', 'potentially_out_of_service'] = 'unknown'
    authenticity: Literal['not_assessed', 'uncertain', 'screen_suspected'] = 'not_assessed'
    evidence_quality: Literal['not_assessed', 'usable', 'unclear'] = 'not_assessed'
    content_safety: Literal['not_assessed', 'clear', 'requires_review', 'prohibited'] = 'not_assessed'
    scene_context: Literal['not_assessed', 'public_or_outdoor', 'private_indoor_suspected', 'uncertain'] = 'not_assessed'
    category_fit: Literal['not_assessed', 'matches_selected', 'mismatch_selected', 'uncertain'] = 'not_assessed'


def validate_analysis_image(data):
    """Bound vision requests before a provider sees an upload; never follow image URLs."""
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(422, 'Choose a JPEG, PNG or WebP photo up to 10 MB.')
    try:
        with Image.open(BytesIO(data)) as picture:
            if picture.format not in {'JPEG', 'PNG', 'WEBP'} or picture.width * picture.height > MAX_IMAGE_PIXELS:
                raise ValueError('Unsupported or oversized image')
            picture.verify()
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, 'The photo cannot be read safely. Choose another JPEG, PNG or WebP photo.') from None


def _text(value, limit=4000):
    return value.strip()[:limit] if isinstance(value, str) else None


def selected_categories(value):
    """Accept a bounded category list for advisory image comparison only."""
    if value is None:
        return []
    try:
        parsed = json.loads(value) if isinstance(value, str) else value
    except (TypeError, ValueError):
        raise HTTPException(422, 'Selected categories must be a JSON list.') from None
    if not isinstance(parsed, list) or len(parsed) > 3:
        raise HTTPException(422, 'Choose up to three categories.')
    if any(not isinstance(item, str) or not 1 <= len(item.strip()) <= 80 or '\x00' in item for item in parsed):
        raise HTTPException(422, 'Selected categories must be nonempty text up to 80 characters.')
    return list(dict.fromkeys(item.strip() for item in parsed))


def normalize_analysis(result, *, has_image=False, provider_state=None, selected_categories=()):
    """Discard provider-supplied decisions and enforce PULSO's evidence eligibility rules."""
    raw = result if isinstance(result, dict) else {}
    state = provider_state or raw.get('analysis_status', 'suggested' if raw else 'unavailable')
    if not isinstance(state, str) or state not in {'suggested', 'disabled', 'unavailable'}:
        state = 'unavailable'
    available = state == 'suggested'
    reasons = ['service_responsibility_unverified']
    try:
        signals = ScreeningSignals.model_validate(raw.get('screening_signals', {})) if available else ScreeningSignals()
    except (ValidationError, TypeError):
        signals = ScreeningSignals()
        reasons.append('invalid_provider_signals')
    if not available:
        reasons.append('analysis_disabled' if state == 'disabled' else 'analysis_unavailable')
    category = _text(raw.get('category'), 240) if available else None
    if not category or category.lower() in {'undetermined', 'inappropriate content', 'unknown'}:
        category = None
        reasons.append('classification_uncertain')
    if raw.get('is_inappropriate') is True or raw.get('is_infrastructure') is False:
        reasons.append('legacy_classification_requires_review')
    if not has_image:
        signals = ScreeningSignals(service_scope=signals.service_scope)
        reasons.append('no_photo_assessed')
    if signals.authenticity == 'screen_suspected':
        reasons.append('possible_screen_rephotography')
    if signals.authenticity == 'uncertain':
        reasons.append('scene_authenticity_uncertain')
    if signals.evidence_quality == 'unclear':
        reasons.append('evidence_unclear')
    if signals.service_scope == 'potentially_out_of_service':
        reasons.append('service_scope_requires_review')
    if signals.content_safety in {'requires_review', 'prohibited'}:
        reasons.append('content_safety_review')
    if signals.scene_context == 'private_indoor_suspected':
        reasons.append('private_indoor_rephotography')
    if signals.category_fit == 'mismatch_selected':
        reasons.append('category_mismatch_rephotography')
    # A screen photo cannot establish the required true-color, on-site evidence.
    # This is an intake validation only: it does not decide city responsibility.
    screen_suspected = signals.authenticity == 'screen_suspected'
    private_indoor = signals.scene_context == 'private_indoor_suspected'
    category_mismatch = bool(selected_categories) and signals.category_fit == 'mismatch_selected'
    restricted = available and has_image and (signals.content_safety == 'prohibited' or screen_suspected or private_indoor or category_mismatch)
    if private_indoor:
        rejection_reason = 'This appears to be inside a private home. Retake the photo outside, showing the public infrastructure issue.'
    elif category_mismatch:
        rejection_reason = 'This photo does not match the selected issue category. Retake it showing the reported problem.'
    elif screen_suspected:
        rejection_reason = 'This appears to be a photo of a screen. Retake it with the surroundings visible.'
    elif restricted:
        rejection_reason = 'This image cannot be used. Replace it with a photo of the issue.'
    else:
        rejection_reason = ''
    if category is None or raw.get('is_infrastructure') is False:
        category = None
    severity = raw.get('severity_score') if available else None
    if type(severity) not in (int, float) or not math.isfinite(severity) or not 0 <= severity <= 10:
        severity = None
    urgency = _text(raw.get('urgency'), 20) if available else None
    return {
        'category': category,
        'urgency': urgency if urgency in {'Low', 'Medium', 'High', 'Critical'} else None,
        'severity_score': severity,
        'smart_summary': _text(raw.get('smart_summary')) if available else None,
        'reasoning': _text(raw.get('reasoning')) if available else 'Staff review required.',
        'image_analysis': _text(raw.get('image_analysis')) if available and has_image else None,
        'auto_description': (_text(raw.get('auto_description')) or '') if category and not restricted else '',
        # Compatibility fields for older clients.
        'is_infrastructure': True if available and raw.get('is_infrastructure') is True else None,
        'is_inappropriate': restricted,
        'rejection_reason': rejection_reason,
        'analysis_status': state,
        'provider_used': available,
        'screening_signals': signals.model_dump(),
        'screening': {
            'version': VERSION, 'mode': 'advisory',
            'outcome': 'restricted_upload' if restricted else 'submit_for_review',
            'submission_allowed': not restricted, 'requires_human_review': True,
            'service_eligibility': signals.service_scope,
            'authenticity': signals.authenticity, 'evidence_quality': signals.evidence_quality,
            'content_safety': signals.content_safety, 'scene_context': signals.scene_context,
            'category_fit': signals.category_fit, 'provider_state': state,
            'reason_codes': list(dict.fromkeys(reasons)),
            'location_verified': False, 'responsibility_verified': False,
        },
    }


def finalize_analysis(result, *, has_image, input_digest, location_evidence=None, latitude=None, longitude=None, items=(), selected_categories=()):
    analysis = normalize_analysis(result, has_image=has_image, selected_categories=selected_categories)
    assessment = analysis['screening']
    assessment['input_digest'] = input_digest
    assessment['assessed_at'] = datetime.now(timezone.utc).isoformat()
    if location_evidence is not None:
        from report_intelligence import issue_accuracy, location_quality
        assessment['location'] = {
            'source': location_evidence.source,
            'issue_pin_confirmed': location_evidence.issue_pin_confirmed,
            'reported_accuracy_m': issue_accuracy(location_evidence, latitude, longitude),
            'quality': location_quality(location_evidence),
            'point_recorded': latitude is not None and longitude is not None,
        }
    assessment['observations'] = [dict(item_key=item.item_key, categories=item.categories,
        service_eligibility='unknown', requires_human_review=True) for item in items]
    assessment['signal_scope'] = 'report_evidence_not_individual_object_verification'
    return analysis


def analysis_digest(description, image_data):
    return hashlib.sha256(json.dumps({'description': description,
        'image_sha256': hashlib.sha256(image_data).hexdigest() if image_data else None}, sort_keys=True).encode()).hexdigest()


def record_assessment(db, report, analysis):
    """Append with the report transaction; retries never create a second committed report event."""
    import gov_models as gm
    assessment = (analysis or {}).get('screening')
    if not isinstance(assessment, dict) or assessment.get('version') != VERSION:
        return
    db.add(gm.AuditLog(trigger_type=EVENT, report_id=report.id, actor_role='system',
        action='RELogic intake screening recorded; staff verification required',
        details=json.dumps(assessment, allow_nan=False)))


def latest_assessment(db, report_id):
    import gov_models as gm
    event = db.query(gm.AuditLog).filter_by(report_id=report_id, trigger_type=EVENT).order_by(gm.AuditLog.id.desc()).first()
    if not event:
        return None
    try:
        assessment = json.loads(event.details)
        return assessment if isinstance(assessment, dict) and assessment.get('version') == VERSION else None
    except (TypeError, ValueError):
        return None
