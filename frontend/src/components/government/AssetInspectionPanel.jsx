import { useState } from 'react';
import { GovButton, GovConfirm, GovState, formatDate } from './GovWorkspace';
import { governmentRequest, useGovernmentData } from '../../utils/governmentApi';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';

function localDateTime() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AssetInspectionPanel({ assetId, permissions, onVerified }) {
    const inspections = useGovernmentData(`/api/gov/predictive/inspections?asset_id=${encodeURIComponent(assetId)}&limit=50`);
    const [observedAt, setObservedAt] = useState(localDateTime);
    const [defectFound, setDefectFound] = useState(false);
    const [condition, setCondition] = useState('');
    const [defectType, setDefectType] = useState('');
    const [severity, setSeverity] = useState('moderate');
    const [finding, setFinding] = useState('');
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [evidenceReference, setEvidenceReference] = useState(null);
    const [evidenceInputKey, setEvidenceInputKey] = useState(0);
    const [commandId, setCommandId] = useState(() => crypto.randomUUID());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [review, setReview] = useState(null);
    const [reviewReason, setReviewReason] = useState('');

    async function submit(event) {
        event.preventDefault();
        setBusy(true); setError(''); setNotice('');
        try {
            if (defectFound && !evidenceFile) throw new Error('Attach a field photo for a defect finding.');
            if (evidenceFile && evidenceFile.size > 5 * 1024 * 1024) throw new Error('Choose a field photo up to 5 MB.');
            let attachedEvidence = evidenceReference;
            if (evidenceFile && !attachedEvidence) {
                const body = new FormData();
                body.append('file', evidenceFile);
                const uploaded = await governmentRequest(`/api/gov/predictive/assets/${encodeURIComponent(assetId)}/inspection-evidence`, { method: 'POST', body });
                attachedEvidence = uploaded.id;
                setEvidenceReference(uploaded.id);
            }
            await governmentRequest(`/api/gov/predictive/assets/${encodeURIComponent(assetId)}/inspection-outcomes`, {
                method: 'POST', headers: { 'Idempotency-Key': commandId },
                body: { observed_at: new Date(observedAt).toISOString(), defect_found: defectFound,
                    defect_type: defectFound ? defectType.trim() : null, severity: defectFound ? severity : null,
                    condition_score: Number(condition), finding: finding.trim(), evidence_reference: attachedEvidence },
            });
            setNotice('Inspection saved for independent review. The recorded asset condition has not changed.');
            setFinding(''); setDefectType(''); setCondition(''); setEvidenceFile(null); setEvidenceReference(null);
            setEvidenceInputKey(value => value + 1); setCommandId(crypto.randomUUID()); inspections.reload();
        } catch (cause) { setError(cause.message); } finally { setBusy(false); }
    }

    async function downloadEvidence(item) {
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/gov/predictive/inspection-evidence/${encodeURIComponent(item.evidence_reference)}`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (!response.ok) throw new Error(`Evidence is unavailable or access was denied (HTTP ${response.status}).`);
            const url = URL.createObjectURL(await response.blob());
            const anchor = document.createElement('a');
            anchor.href = url; anchor.download = `inspection-${item.id}-evidence`;
            document.body.appendChild(anchor); anchor.click(); anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (cause) { setError(cause.message); }
    }

    async function decide() {
        if (reviewReason.trim().length < 10) { setError('Enter a review reason of at least 10 characters.'); return; }
        setBusy(true); setError('');
        try {
            await governmentRequest(`/api/gov/predictive/inspections/${review.id}/review`, {
                method: 'POST', body: { decision: review.decision, reason: reviewReason.trim() },
            });
            setNotice(`Inspection ${review.decision}.`); setReview(null); setReviewReason('');
            inspections.reload(); onVerified?.();
        } catch (cause) { setError(cause.message); } finally { setBusy(false); }
    }

    return <section>
        <h3>Reviewed field inspections</h3>
        <p className="gov-note">A verified finding can update condition and support future maintenance evaluation. A submitted finding needs another qualified reviewer.</p>
        <GovState loading={inspections.loading && !inspections.data} error={inspections.error} onRetry={inspections.reload} />
        {notice && <p role="status" className="gov-note">{notice}</p>}
        {error && !review && <p role="alert" className="gov-error">{error}</p>}
        {inspections.data?.items?.length ? <ul className="gov-inline-list">{inspections.data.items.map(item => <li key={item.id}>
            <strong>{item.defect_found ? `${item.severity} defect: ${item.defect_type}` : 'No defect found'}</strong> · {item.review_status}
            <p>{item.finding}</p><small>Observed {formatDate(item.observed_at)} · condition {item.condition_score == null ? 'not scored' : `${item.condition_score}/100`}</small>
            {item.evidence_reference && <div><GovButton onClick={() => downloadEvidence(item)}>Download evidence</GovButton></div>}
            {permissions?.review_outcome && item.review_status === 'pending' && item.recorded_by_id !== permissions.current_user_id && <div className="gov-form-actions">
                <GovButton onClick={() => { setError(''); setReviewReason(''); setReview({ id: item.id, decision: 'verified' }); }}>Verify finding</GovButton>
                <GovButton onClick={() => { setError(''); setReviewReason(''); setReview({ id: item.id, decision: 'rejected' }); }}>Reject finding</GovButton>
            </div>}
        </li>)}</ul> : !inspections.loading && !inspections.error ? <p>No reviewed or pending field inspections are recorded for this asset.</p> : null}
        {permissions?.assess && <form onSubmit={submit}>
            <h4>Submit an inspection</h4>
            <label className="gov-field">Observed at<input required type="datetime-local" value={observedAt} onChange={event => setObservedAt(event.target.value)} /></label>
            <label className="gov-field">Finding<select value={defectFound ? 'defect' : 'none'} onChange={event => setDefectFound(event.target.value === 'defect')}><option value="none">No defect observed</option><option value="defect">Defect observed</option></select></label>
            {defectFound && <><label className="gov-field">Defect type<input required minLength={3} maxLength={120} value={defectType} onChange={event => setDefectType(event.target.value)} /></label>
                <label className="gov-field">Severity<select value={severity} onChange={event => setSeverity(event.target.value)}><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="major">Major</option><option value="critical">Critical</option></select></label></>}
            <label className="gov-field">Observed condition score<input required type="number" min="0" max="100" step="0.1" value={condition} onChange={event => setCondition(event.target.value)} /></label>
            <label className="gov-field">Field findings<textarea required minLength={20} maxLength={4000} value={finding} onChange={event => setFinding(event.target.value)} /><small>Record what was actually inspected, including no-defect observations.</small></label>
            <label className="gov-field">Field photo {defectFound ? '(required)' : '(optional)'}<input key={evidenceInputKey} type="file" accept="image/png,image/jpeg,image/webp" required={defectFound} onChange={event => { setEvidenceFile(event.target.files?.[0] || null); setEvidenceReference(null); setCommandId(crypto.randomUUID()); }} /><small>PNG, JPEG or WebP, up to 5 MB. Only authorized staff can access this evidence.</small></label>
            <div className="gov-form-actions"><GovButton primary type="submit" disabled={busy}>{busy ? 'Saving inspection…' : 'Submit for review'}</GovButton></div>
        </form>}
        <GovConfirm open={Boolean(review)} title={`${review?.decision === 'verified' ? 'Verify' : 'Reject'} this finding?`} confirmLabel={review?.decision === 'verified' ? 'Verify finding' : 'Reject finding'} busy={busy} error={error} onClose={() => setReview(null)} onConfirm={decide}>
            <p>This decision is recorded with your name and time. Verification may update the asset condition.</p>
            <label className="gov-field">Review reason<textarea required minLength={10} maxLength={2000} value={reviewReason} onChange={event => setReviewReason(event.target.value)} /></label>
            {reviewReason.trim().length < 10 && <p className="gov-note">Enter at least 10 characters before confirming.</p>}
        </GovConfirm>
    </section>;
}
