"""Scoped first-party matching audit; never export raw report text or images."""
from fastapi import HTTPException
from sqlalchemy import func, select

import models
import report_learning as learning
import report_review as review
from government_access import scoped_reports
from learning_dataset_contract import CATEGORY_LABELS, iso
from matching_dataset_contract import seal, verify
from observation_matching import pair_rows, pair_snapshot


def collect(db, user, max_reviews=1000):
    learning.require_learning_access(user)
    if not review.permitted(user, 'review'):
        raise HTTPException(403, 'Staff report review access is required.')
    if not 1 <= max_reviews <= 5000:
        raise HTTPException(422, 'Choose between 1 and 5000 reviews.')
    as_of = db.execute(select(func.statement_timestamp())).scalar_one()
    reports = scoped_reports(db.query(models.Report.id), user)
    observations = db.query(models.ReportObservation.id).filter(models.ReportObservation.report_id.in_(reports))
    pair = models.ObservationPairReview
    query = db.query(pair).filter(pair.left_observation_id.in_(observations),
        pair.right_observation_id.in_(observations), pair.created_at <= as_of).order_by(pair.id)
    records = query.limit(10001).all()
    if len(records) > 10000:
        raise HTTPException(413, 'Matching audit exceeds the bounded scan; narrow the authorized scope.')
    rows, contexts, latest = [], {}, {}
    for record in records:
        key = (record.left_observation_id, record.right_observation_id)
        latest[key] = max(latest.get(key, 0), record.revision)
        if key not in contexts:
            source = db.get(models.ReportObservation, record.left_observation_id)
            try:
                a, b, reports_by_id, concerns = pair_rows(db, user, source.report_id, *key)
                contexts[key] = pair_snapshot(a, b, reports_by_id, concerns)
            except HTTPException as exc:
                if exc.status_code != 403:
                    raise
                contexts[key] = None
        if contexts[key] is None:
            continue
        if len(rows) >= max_reviews:
            raise HTTPException(413, 'Complete matching audit exceeds max_reviews; increase the bound or narrow scope.')
        frozen = record.snapshot
        try:
            left, right = frozen['left'], frozen['right']
            features = dict(distance_m=frozen['distance_m'],
                shared_categories=sorted(c for c in frozen['shared_categories'] if c in CATEGORY_LABELS),
                left_issue_accuracy_m=left['issue_accuracy_m'], right_issue_accuracy_m=right['issue_accuracy_m'],
                left_location_source=left['location_source'], right_location_source=right['location_source'],
                left_photo_present=left['photo_present'], right_photo_present=right['photo_present'])
            rows.append(dict(review_id=record.id, revision=record.revision,
                left_observation_id=key[0], right_observation_id=key[1],
                left_report_id=left['report_id'], right_report_id=right['report_id'],
                relation=record.relation, evidence_basis=record.evidence_basis, recorded_at=iso(record.created_at),
                features=features, current_evidence=frozen == contexts[key],
                label_status='operational_reviewer_judgment', training_release_eligible=False))
        except (KeyError, TypeError, ValueError):
            raise HTTPException(409, 'Matching review source needs correction before export.') from None
    for row in rows:
        row['latest_review'] = row['revision'] == latest[(row['left_observation_id'], row['right_observation_id'])]
    try:
        document = seal(rows, as_of)
        verify(document)
        return document
    except (KeyError, TypeError, ValueError):
        raise HTTPException(409, 'Matching review structure needs correction before export.') from None
