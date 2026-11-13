import { useEffect, useRef, useState } from 'react';
import { GovButton, GovConfirm, GovState, formatDate } from './GovWorkspace';
import FieldSurveyDialog from './FieldSurveyDialog';
import { governmentRequest, useGovernmentData } from '../../utils/governmentApi';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import './field-survey.css';

const labels = { visible:'Visible',not_visible:'Not visible',unsafe:'Unsafe to inspect',missing:'Object not found',
    defect_observed:'Defect observed',no_defect_observed:'No defect observed',not_assessed:'Not assessed' };

export default function FieldObservationsPanel({ assetId, onSaved }) {
    const permissions = useGovernmentData('/api/gov/field-inventory/permissions');
    const [offset, setOffset] = useState(0);
    const records = useGovernmentData(permissions.data ? `/api/gov/field-inventory/assets/${encodeURIComponent(assetId)}/observations?limit=10&offset=${offset}` : null);
    const [recording, setRecording] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [review, setReview] = useState(null);
    const [reason, setReason] = useState('');
    const [identity, setIdentity] = useState(false);
    const [location, setLocation] = useState(false);
    const [busy, setBusy] = useState(false);
    const [evidence, setEvidence] = useState(null);
    const [evidenceBusy, setEvidenceBusy] = useState(null);
    const [viewed, setViewed] = useState([]);
    const controller = useRef(null);
    const generation = useRef(0);
    const deciding = useRef(false);
    const heading = useRef(null);
    const focusAfterReview = useRef(false);
    useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
    useEffect(() => () => { if (evidence?.url) URL.revokeObjectURL(evidence.url); }, [evidence]);
    useEffect(() => {
        if (focusAfterReview.current && records.data && !records.loading) {
            heading.current?.focus({ preventScroll: true }); focusAfterReview.current = false;
        }
    }, [records.data, records.loading]);

    async function openEvidence(item) {
        controller.current?.abort(); const request = ++generation.current;
        controller.current = new AbortController();
        setEvidenceBusy(item.id); setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/gov/predictive/inspection-evidence/${encodeURIComponent(item.evidence_reference)}`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` }, cache:'no-store', signal:controller.current.signal,
            });
            if (!response.ok) throw new Error(`Private evidence could not be opened (HTTP ${response.status}).`);
            const blob = await response.blob();
            if (request !== generation.current) return;
            setEvidence({ id:item.id,url:URL.createObjectURL(blob) });
        } catch (cause) { if (cause.name !== 'AbortError' && request === generation.current) setError(cause.message); }
        finally { if (request === generation.current) setEvidenceBusy(null); }
    }
    function beginReview(item, decision) { setReview({ ...item, decision }); setReason(''); setIdentity(false); setLocation(false); setError(''); }
    async function decide() {
        if (deciding.current) return;
        if (reason.trim().length < 20) { setError('Explain the review in at least 20 characters.'); return; }
        deciding.current = true; setBusy(true); setError('');
        try {
            const result = await governmentRequest(`/api/gov/field-inventory/observations/${encodeURIComponent(review.id)}/review`, { method:'POST',
                body:{ decision:review.decision,reason:reason.trim(),identity_confirmed:review.decision === 'accepted' && identity,location_reviewed:review.decision === 'accepted' && location } });
            if (result.id !== review.id || result.review_status !== review.decision) throw new Error('The review receipt could not be confirmed. Refresh the observation history.');
            focusAfterReview.current = true;
            setNotice(`Observation ${result.id} ${result.review_status}.`); setReview(null); records.reload(); onSaved?.();
        } catch (cause) { setError(cause.status === 409 ? `${cause.message} Close this dialog and inspect the refreshed history.` : cause.message); if (cause.status === 409) records.reload(); }
        finally { deciding.current = false; setBusy(false); }
    }
    const rows = records.data?.items || [];
    return <section className="field-observations">
        <div className="field-observation-heading"><h3 ref={heading} tabIndex={-1}>Field observations</h3><div className="field-observation-actions"><GovButton disabled={!permissions.data || records.loading} onClick={()=>{permissions.reload();records.reload();}}>Refresh field history</GovButton>{permissions.data?.record && <GovButton disabled={!records.data || records.data.asset.registry_status === 'retired'} onClick={() => setRecording(true)}>Record field visit</GovButton>}</div></div>
        <p className="gov-note">Own field observations and repeat visits. Acceptance, object identity and location review are recorded separately.</p>
        <GovState loading={permissions.loading || (records.loading && !records.data)} error={permissions.error || records.error} onRetry={() => { permissions.reload(); records.reload(); }}/>
        {notice && <p role="status" className="gov-note">{notice}</p>}
        {error && !review && <p role="alert" className="gov-error">{error}</p>}
        {records.data && !records.error && <>
            <p className="gov-note">{records.data.total} recorded observations · Updated {formatDate(records.fetchedAt)}. {records.data.asset.registry_status === 'retired' && 'This record is retired; a registry correction is needed before another visit.'}</p>
            {!rows.length && <p>No field observations have been recorded for this asset.</p>}
            <ul className="field-observation-list">{rows.map(item => <li key={item.id}>
                <strong>{labels[item.condition]}</strong> · {labels[item.visibility]} · {item.review_status}
                <p>{item.notes}</p><small>Observed {formatDate(item.observed_at)} · Recorded {formatDate(item.recorded_at)} by staff #{item.recorded_by_id}</small>
                <dl className="gov-facts"><dt>Proposed point</dt><dd>{item.latitude}, {item.longitude}</dd><dt>Issue accuracy</dt><dd>{item.accuracy_m == null ? 'Unknown' : `Device estimate ±${item.accuracy_m} m`}</dd><dt>Barangay boundary</dt><dd>{item.boundary_status === 'within_recorded_boundary' ? 'Point within recorded polygon' : 'Boundary unavailable · match not verified'}</dd><dt>Location review</dt><dd>{item.location_reviewed ? 'Reviewed proposal' : 'Unreviewed proposal'}</dd><dt>Object identity</dt><dd>{item.identity_confirmed ? 'Confirmed by reviewer' : 'Not confirmed'}</dd><dt>Device fix timing</dt><dd>{item.location_quality?.fix_time_status?.replaceAll('_',' ') || 'Not recorded'}</dd><dt>Photo source</dt><dd>{item.location_metadata?.photo_source || 'Unknown'} · {item.location_metadata?.photo_captured_at ? formatDate(item.location_metadata.photo_captured_at) : 'Capture time unknown'}</dd></dl>
                <details><summary>Original location provenance</summary><dl className="gov-facts"><dt>Location source</dt><dd>{item.location_metadata?.source?.replaceAll('_',' ') || 'Unknown'}</dd><dt>Original phone fix</dt><dd>{item.location_metadata?.device_fix ? `${item.location_metadata.device_fix.latitude}, ${item.location_metadata.device_fix.longitude}` : 'Not recorded'}</dd><dt>Fix measured</dt><dd>{formatDate(item.location_metadata?.device_fix?.measured_at)}</dd><dt>Phone accuracy</dt><dd>{item.location_metadata?.device_fix?.accuracy_m ? `Device estimate ±${item.location_metadata.device_fix.accuracy_m} m` : 'Unknown'}</dd><dt>Photo-associated fix</dt><dd>{item.location_metadata?.photo_device_fix ? `${item.location_metadata.photo_device_fix.latitude}, ${item.location_metadata.photo_device_fix.longitude}` : 'Not recorded'}</dd><dt>Photo fix measured</dt><dd>{formatDate(item.location_metadata?.photo_device_fix?.measured_at)}</dd></dl></details>
                {item.review_reason && <p>Review by staff #{item.reviewed_by_id} · {formatDate(item.reviewed_at)}: {item.review_reason}</p>}
                {item.evidence_reference && <GovButton disabled={evidenceBusy === item.id} onClick={() => openEvidence(item)}>{evidenceBusy === item.id ? 'Opening evidence…' : 'View private evidence'}</GovButton>}
                {evidence?.id === item.id && <figure className="field-evidence"><img src={evidence.url} alt={`Private field evidence for observation ${item.id}`} onLoad={() => setViewed(current => current.includes(item.id) ? current : [...current,item.id])} onError={() => { setEvidence(null); setError('The evidence image could not be displayed. Retry before accepting this observation.'); }}/><figcaption>Original stored field evidence · {item.id}</figcaption><GovButton onClick={() => setEvidence(null)}>Close evidence</GovButton></figure>}
                {permissions.data?.review && item.review_status === 'pending' && item.recorded_by_id !== permissions.data.current_user_id && <>
                    <div className="gov-form-actions"><GovButton disabled={item.visibility === 'visible' && (!item.evidence_reference || !viewed.includes(item.id))} onClick={() => beginReview(item,'accepted')}>Accept observation</GovButton><GovButton onClick={() => beginReview(item,'rejected')}>Reject observation</GovButton></div>
                    {item.visibility === 'visible' && !viewed.includes(item.id) && <p className="gov-note">{item.evidence_reference ? 'Open the private evidence before accepting this visible finding.' : 'This finding has no attached evidence. A new visit with a photo is needed for acceptance.'}</p>}
                </>}
            </li>)}</ul>
            <div className="gov-table-footer"><span>{records.data.total ? `${offset+1}–${offset+rows.length} of ${records.data.total}` : '0 observations'}</span><div><GovButton disabled={!offset || records.loading} onClick={() => setOffset(value => Math.max(0,value-10))}>Previous observations</GovButton><GovButton disabled={records.data.next_offset == null || records.loading} onClick={() => setOffset(records.data.next_offset)}>Next observations</GovButton></div></div>
        </>}
        {recording && <FieldSurveyDialog assetId={assetId} assetName={records.data?.asset.asset_name} permissions={permissions.data} onClose={() => setRecording(false)} onSaved={result => { setNotice(`Observation ${result.observation.id} saved for independent review.`); setOffset(0); records.reload(); onSaved?.(); }}/>}
        <GovConfirm open={Boolean(review)} title={review?.decision === 'accepted' ? 'Accept this field observation?' : 'Reject this field observation?'} confirmLabel={review?.decision === 'accepted' ? 'Accept observation' : 'Reject observation'} busy={busy} error={error} onConfirm={decide} onClose={() => { setReview(null); setError(''); }}>
            <p>{review?.id} · {review && labels[review.condition]}. This records a collection review. Official registry approval and condition assessment use their separate asset actions.</p>
            {review?.decision === 'accepted' && <><label className="gov-checkbox"><input type="checkbox" checked={identity} onChange={e => setIdentity(e.target.checked)}/>I confirmed that this observation belongs to this physical asset.</label><label className="gov-checkbox"><input type="checkbox" checked={location} onChange={e => setLocation(e.target.checked)}/>I reviewed the proposed location and its uncertainty.</label></>}
            <label className="gov-field">Review reason<textarea required minLength={20} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/></label>
        </GovConfirm>
    </section>;
}
