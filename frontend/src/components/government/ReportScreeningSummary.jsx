import React from 'react';

const evidenceLabels = {
    not_assessed: 'Not assessed', uncertain: 'Scene needs review',
    screen_suspected: 'Possible photo of a screen; not a fraud finding',
};

export default function ReportScreeningSummary({ assessment }) {
    if (!assessment) return null;
    return <section aria-label="Intake screening" className="gov-note">
        <h4>Intake screening</h4>
        <p>Advisory check recorded. Staff verification is required.</p>
        <dl className="gov-facts">
            <dt>Responsibility</dt><dd>{assessment.service_eligibility === 'potentially_out_of_service' ? 'Possible service mismatch; responsibility is not verified.' : 'Not verified; check the responsible service.'}</dd>
            <dt>Photo authenticity</dt><dd>{evidenceLabels[assessment.authenticity] || 'Not assessed'}</dd>
            <dt>Evidence detail</dt><dd>{assessment.evidence_quality === 'unclear' ? 'Photo detail needs clarification.' : 'Inspect the original evidence; automated detail is advisory.'}</dd>
            <dt>Content handling</dt><dd>{assessment.content_safety === 'requires_review' ? 'Content safety needs review before any public release.' : 'Staff must review evidence before any public release.'}</dd>
            <dt>Issue location</dt><dd>{assessment.location?.point_recorded ? 'Recorded point; location is not verified.' : 'No incident point recorded.'}</dd>
            <dt>Automated analysis</dt><dd>{assessment.provider_state === 'suggested' ? 'Provider supplied advisory observations.' : 'Unavailable or disabled; manual review required.'}</dd>
        </dl>
        <details><summary>Assessment record</summary>
            <p>{assessment.version}</p>
            {assessment.assessed_at && <time dateTime={assessment.assessed_at}>{new Date(assessment.assessed_at).toLocaleString()}</time>}
        </details>
    </section>;
}
