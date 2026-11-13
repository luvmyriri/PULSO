import ReportScreeningSummary from './ReportScreeningSummary';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GovButton, GovConfirm, GovState } from './GovWorkspace';
import { governmentRequest, useGovernmentData } from '../../utils/governmentApi';
import ObservationPairReview from './ObservationPairReview';
import Evidence from './RecordedReportEvidence';
import ObservationFieldAssessment from './ObservationFieldAssessment';
import './concern-review.css';

export default function ReportConcernReview({ reportId, onChanged }) {
    const context = useGovernmentData(`/api/report-intelligence/reports/${reportId}`);
    const [itemId, setItemId] = useState('');
    const [targetId, setTargetId] = useState('');
    const target = useGovernmentData(targetId ? `/api/report-intelligence/reports/${targetId}` : null);
    const [targetItemId, setTargetItemId] = useState('');
    const [action, setAction] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const form = useRef(null);
    const items = context.data?.observations || [];
    const item = items.find(i => String(i.id) === itemId) || items[0];
    const targetItem = target.data?.observations?.find(i => String(i.id) === targetItemId);

    async function confirm() {
        if (!form.current?.reportValidity() || !item || (action === 'link' && !targetItem)) return;
        setBusy(true); setError('');
        try {
            await governmentRequest(`/api/report-intelligence/reports/${reportId}/association`, { method: 'POST', body: {
                observation_id: item.id, target_observation_id: action === 'link' ? targetItem.id : null,
                expected_version: context.data.report_version, expected_concern_version: item.concern_version,
                expected_target_version: action === 'link' ? target.data.report_version : null,
                expected_target_concern_version: action === 'link' ? targetItem.concern_version : null,
                reason: reason.trim(),
            } });
            setAction(''); setReason(''); setTargetId(''); setTargetItemId('');
            setNotice('Concern association saved. Each report retains its own ticket and status.');
            context.reload(); onChanged?.();
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }

    const canCompare=context.data?.can_review_pairs===true;
    const pairPath=item&&targetItem?`/api/report-intelligence/reports/${reportId}/observations/${item.id}/pairs/${targetItem.id}`:null;
    const currentReady=context.data&&!context.loading&&!context.error;
    const targetReady=target.data&&!target.loading&&!target.error;
    return <section className="report-docket-summary concern-review" aria-label="Shared concerns">
        <h3>Shared concerns</h3>
        <GovState loading={context.loading} error={context.error} onRetry={context.reload} />
        {notice && <p role="status" className="gov-note">{notice}</p>}
        {context.data && !context.loading && !context.error && <>
            <ReportScreeningSummary assessment={context.data.screening} />
            {!items.length && <p>No observation items are recorded for this report.</p>}
            {items.length > 1 && <label className="gov-field">Observation
                    <select value={String(item?.id || '')} onChange={e => { setItemId(e.target.value); setTargetId(''); setTargetItemId(''); }}>
                    {items.map(i => <option key={i.id} value={i.id}>{i.item_key} · {i.categories.join(' + ')}</option>)}
                </select>
            </label>}
            {item && <><p>{item.concern_id} · {item.contributing_report_count} contributing report(s)</p>
                <p className="gov-note">{item.association_status === 'unreviewed' ? 'Independent concern; matching has not been reviewed.' : 'Concern membership reviewed.'}</p>
                <p className="gov-note">Completion estimate: insufficient validated history.</p>
                <p className="gov-note">Nearby candidates use location and categories. Compare the evidence and confirm the physical problem.</p>
                {(context.data.candidates || []).map(candidate => <p key={candidate.report_id}>
                    <Link to={`/gov/reports?reportId=${candidate.report_id}`}>{candidate.ticket_id}</Link> · {candidate.distance_m} m · review required
                </p>)}
                {!context.data.candidates?.length && <p className="gov-note">No candidates found in this bounded search.</p>}
                {canCompare && <>
                    <label className="gov-field">Compare with report
                        <select value={targetId} onChange={e => { setTargetId(e.target.value); setTargetItemId(''); }}>
                            <option value="">Choose a candidate</option>
                            {(context.data.candidates || []).map(candidate => <option key={candidate.report_id} value={candidate.report_id}>{candidate.ticket_id} · {candidate.distance_m} m</option>)}
                        </select>
                    </label>
                    {targetId && <><GovState loading={target.loading} error={target.error} onRetry={target.reload} />
                        {target.data && !target.loading && !target.error && <label className="gov-field">Target problem
                            <select value={targetItemId} onChange={e => setTargetItemId(e.target.value)}>
                                <option value="">Choose an observation to compare</option>
                                {target.data.observations.map(i => <option key={i.id} value={i.id}>{i.item_key} · {i.description}</option>)}
                            </select>
                        </label>}
                    </>}
                    {currentReady&&targetReady&&targetItem&&<>
                        <div className="concern-evidence-pair">
                            <Evidence key={`source-${item.id}`} record={context.data.staff_evidence} item={item} label="Current report"/>
                            <Evidence key={`target-${targetItem.id}`} record={target.data.staff_evidence} item={targetItem} label="Comparison report"/>
                        </div>
                        <ObservationPairReview key={pairPath} path={pairPath} onReloadEvidence={()=>{context.reload();target.reload();}}/>
                    </>}
                    <div className="gov-form-actions">
                        <GovButton disabled={!context.data.can_associate||!target.data?.can_associate||!targetItem || Boolean(target.error) || target.loading} onClick={() => { setError(''); setAction('link'); }}>Link same problem</GovButton>
                        {context.data.can_associate&&item.contributing_report_count > 1 && <GovButton onClick={() => { setError(''); setAction('separate'); }}>Separate this observation</GovButton>}
                    </div>
                </>}
                {context.data.can_view_field_assessments&&<ObservationFieldAssessment key={`field-${item.id}`} reportId={reportId}
                    item={item} reportEvidence={context.data.staff_evidence}/>}
            </>}
        </>}
        <GovConfirm open={Boolean(action)} title={action === 'link' ? 'Confirm the same problem?' : 'Separate this observation?'}
            confirmLabel="Save concern association" busy={busy} error={error} onClose={() => setAction('')} onConfirm={confirm}>
            <p>{action === 'link' ? 'Confirm that both observations describe the same physical defect and incident episode. Every resident keeps their individual report.' : 'Create an independent concern for this observation. Previous membership and the correction reason remain in history.'}</p>
            <form ref={form} onSubmit={e => e.preventDefault()}><label className="gov-field">Evidence and reason
                <textarea required minLength={10} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} />
            </label></form>
        </GovConfirm>
    </section>;
}
