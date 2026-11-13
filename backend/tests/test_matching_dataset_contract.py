"""Audit grouping and fail-closed validation, without DB or provider calls."""
from copy import deepcopy
from datetime import datetime, timezone

import pytest

from matching_dataset_contract import seal, verify


def row(key, left, right, revision=1):
    return dict(review_id=key, revision=revision, left_observation_id=left*10,
        right_observation_id=right*10, left_report_id=left, right_report_id=right,
        relation='uncertain', evidence_basis=['location'], recorded_at=datetime.now(timezone.utc).isoformat(),
        features=dict(distance_m=None, shared_categories=[], left_issue_accuracy_m=None,
            right_issue_accuracy_m=10, left_location_source='manual', right_location_source='device',
            left_photo_present=True, right_photo_present=True), current_evidence=True,
        latest_review=True, label_status='operational_reviewer_judgment', training_release_eligible=False)


def test_pair_groups_keep_corrections_and_shared_reports_together_transitively():
    rows = [row(1,1,2), row(2,1,2,2), row(3,2,3), row(4,4,5)]
    document = seal(rows, datetime.now(timezone.utc))
    assert verify(document)['row_count'] == 4
    a,b,c,d = document['rows']
    assert a['evaluation_group'] == b['evaluation_group'] == c['evaluation_group'] != d['evaluation_group']
    reverse = seal(list(reversed(deepcopy(rows))), datetime.now(timezone.utc))
    assert [r['evaluation_group'] for r in reverse['rows']] == [r['evaluation_group'] for r in document['rows']]


@pytest.mark.parametrize('change', [dict(training_release_eligible=True), dict(reason='SAMPLE private reason'),
    dict(relation='predicted_same_object'),dict(current_evidence='true'), dict(left_report_id=True)])
def test_unexpected_or_relabelled_rows_are_rejected_even_with_recomputed_checksum(change):
    sample = row(1,1,2)
    sample.update(change)
    document = seal([sample],datetime.now(timezone.utc))
    with pytest.raises(ValueError):
        verify(document)


def test_payload_or_manifest_tampering_is_detected():
    document = seal([row(1,1,2)],datetime.now(timezone.utc))
    document['rows'][0]['relation'] = 'different_asset'
    with pytest.raises(ValueError,match='checksum'):
        verify(document)
