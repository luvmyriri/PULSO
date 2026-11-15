// A screen capture is not usable photo evidence. Keep this client guard aligned
// with the backend restriction so an older assessment cannot enable submission.
export const REPORT_SCREENING_VERSION = 'pulso-relogic-screening-v1';

export function isReportPhotoRestricted(analysis) {
    const screening = analysis?.screening;
    if (screening?.version !== REPORT_SCREENING_VERSION) return false;
    return (screening.outcome === 'restricted_upload' && screening.submission_allowed === false) ||
        (screening.provider_state === 'suggested' && [
            screening.authenticity === 'screen_suspected',
            screening.scene_context === 'private_indoor_suspected',
            screening.category_fit === 'mismatch_selected',
        ].some(Boolean));
}

export function canAutoAdvancePhoto(analysis) {
    const finding = analysis?.screening;
    return Boolean(finding?.version === REPORT_SCREENING_VERSION && !isReportPhotoRestricted(analysis) &&
        analysis.category && finding.provider_state === 'suggested' &&
        finding.authenticity === 'not_assessed' && finding.evidence_quality === 'usable' &&
        finding.service_eligibility === 'unknown' && finding.content_safety === 'clear');
}

export function screeningMessageKey(analysis) {
    if (analysis?.analysisStatus === 'failed' || ['disabled', 'unavailable'].includes(analysis?.analysis_status)) {
        return 'reportScreening.unavailable';
    }
    const screening = analysis?.screening;
    if (!screening || screening.version !== REPORT_SCREENING_VERSION) return null;
    if (isReportPhotoRestricted(analysis)) return 'reportScreening.replacePhoto';
    if (screening.provider_state !== 'suggested') return 'reportScreening.unavailable';
    if (screening.service_eligibility === 'potentially_out_of_service') return 'reportScreening.scopeUnknown';
    return 'reportScreening.review';
}
