import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, RefreshCw, ArrowUpRight } from 'lucide-react';
import { GovButton, GovConfirm, GovState, GovStatus, formatDate } from './GovWorkspace';
import { governmentRequest, useGovernmentData } from '../../utils/governmentApi';
import ReportSeverityAssessment from './ReportSeverityAssessment';
import ReportPriority from './ReportPriority';
import ReportRouting from './ReportRouting';
import './report-docket.css';
import { API_BASE_URL } from '../../utils/apiBase';
import { getStatusDescriptor } from '../../utils/reportWorkflow';

const ACTIONS = {
    verify: { label: 'Verify report', title: 'Verify and publish this report?', detail: 'Check the incident address, map pin, description, and photo for accuracy and personal information. Verification publishes these incident details to residents at the recorded coordinates. Reporter identity and contact details remain private. This also sends the report for field-work approval and notifies the resident.' },
    publish_details: { label: 'Publish report details', title: 'Publish this verified report?', detail: 'This report was verified before full incident details were public. Check its address, map pin, description, and photo again for accuracy and personal information. Publishing makes those details visible to residents.' },
    approve: { label: 'Approve for work', title: 'Approve this report for field work?', detail: 'Record the decision to make this report available for work-order assignment.' },
    reject: { label: 'Reject report', title: 'Reject this report?', detail: 'Explain why this report cannot proceed. The decision is recorded in its history and the resident is notified.' },
    request_info: { label: 'Request information', title: 'Request information from the resident', detail: 'Tell the resident what is missing. The report will wait for their response.' },
    owner: { label: 'Assign reviewer', title: 'Assign report review', detail: 'This employee will own the review task. Field work is assigned separately after approval.' },
    priority: { label: 'Save severity grade', title: 'Assess report severity', detail: 'Choose the impact level supported by the report evidence.' },
    assign: { label: 'Create work order', title: 'Create and assign a work order', detail: 'Assign this approved report to an eligible field official. The work order and assignment are recorded together.' },
};

export default function ReportDocket({ selected, onClose, onChanged, mapContext = false, fullPage = false, initialAction = '' }) {
    const location = useLocation();
    const docket = useGovernmentData(`/api/gov/reports/${selected.id}/docket`);
    const [tab, setTab] = useState(() => new URLSearchParams(location.search).get('reportTab') === 'routing' ? 'routing' : 'details');
    const [startRoutingDraft, setStartRoutingDraft] = useState(false);
    const [action, setAction] = useState('');
    const [pendingAction, setPendingAction] = useState(initialAction);
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');
    const [assignee, setAssignee] = useState('');
    const [grade, setGrade] = useState('');
    const [revisit, setRevisit] = useState('');
    const [failedImage, setFailedImage] = useState(false);
    const [workPriority, setWorkPriority] = useState('normal');
    const [title, setTitle] = useState('');
    const [busy, setBusy] = useState(false);
    const [reviewedPublicContent, setReviewedPublicContent] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const heading = useRef(null);
    const returnFocus = useRef(null);
    const commandForm = useRef(null);
    const retry = useRef(null);
    const staff = useGovernmentData(action === 'owner' ? `/api/gov/report-review/${selected.id}/reviewers` : action === 'assign' ? '/api/gov/dispatch/eligible-assignees' : null);
    const report = docket.data?.report;
    const operations = docket.data?.review_operations || {};
    useEffect(() => { returnFocus.current = document.activeElement; heading.current?.focus({ preventScroll: true }); }, []);
    function close() { onClose(); requestAnimationFrame(() => { if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); }); }
    function refresh() { setAction(''); retry.current = null; setError(''); docket.reload(); onChanged(); }
    const start=useCallback(value => { setWorkPriority(({P0:'low',P1:'low',P2:'normal',P3:'high',P4:'critical',P5:'critical'})[operations.priority_grade] || 'normal'); setGrade(operations.priority_grade || ''); setRevisit(operations.next_review_at ? new Date(new Date(operations.next_review_at).getTime() - new Date(operations.next_review_at).getTimezoneOffset()*60000).toISOString().slice(0,16) : ''); setReason(''); setMessage(''); setAssignee(''); setReviewedPublicContent(false); setTitle(`Work order for ${selected.ticket_id}`); setError(''); retry.current = null; setAction(value); },[operations.priority_grade,operations.next_review_at,selected.ticket_id]);
    useEffect(()=>{
        if(!pendingAction||!report||docket.loading||docket.error)return;
        const permitted=pendingAction==='owner'?docket.data.can_assign_review&&!['resolved','rejected','cancelled','completed'].includes(report.status):pendingAction==='priority'?docket.data.can_grade_priority:docket.data.allowed_actions?.includes(pendingAction);
        if(permitted)start(pendingAction);
        setPendingAction('');
    },[pendingAction,report,docket.data,docket.loading,docket.error,start]);
    async function execute() {
        if (!commandForm.current?.reportValidity()) return;
        const body = action === 'owner' ? { assigned_to_id: Number(assignee), reason: reason.trim(), expected_version: report.version } : action === 'priority' ? { priority_grade: grade, reason: reason.trim(), next_review_at: revisit ? new Date(revisit).toISOString() : null, expected_version: report.version } : action === 'verify' ? { status: 'pending_approval', public_content_reviewed: reviewedPublicContent } : action === 'publish_details' ? { public_content_reviewed: reviewedPublicContent, expected_version: report.version } : action === 'assign' ? { report_id: report.id, title: title.trim(), assigned_to_id: Number(assignee), priority: workPriority, notes: reason.trim() } : action === 'request_info' ? { reason: reason.trim(), message: message.trim() } : { reason: reason.trim() };
        const paths = { owner: `/api/gov/report-review/${report.id}/assignment`, priority: `/api/gov/report-review/${report.id}/priority`, verify: `/api/reports/${report.id}/status`, publish_details: `/api/gov/reports/${report.id}/publish-details`, reject: `/api/reports/${report.id}/reject`, approve: `/api/gov/reports/${report.id}/approve-for-work`, request_info: `/api/gov/reports/${report.id}/request-info`, assign: '/api/gov/work-orders' };
        const fingerprint = JSON.stringify({ action, body, version: report.version });
        if (retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, key: crypto.randomUUID() };
        setBusy(true); setError('');
        try {
            await governmentRequest(paths[action], { method: ['verify', 'reject'].includes(action) ? 'PATCH' : 'POST', body, headers: { 'If-Match': String(report.version), 'Idempotency-Key': retry.current.key } });
            setNotice(`${ACTIONS[action].label}: saved.`); refresh();
        } catch (e) { if (e.status === 409) retry.current = null; setError(e.message); } finally { setBusy(false); }
    }
    const image = report?.photo_url || selected.image_url;
    const actions = docket.data?.allowed_actions || [];
    const routing = docket.data?.referral_permissions || {};
    const activeTab = tab === 'routing' && !routing.view ? 'details' : tab;
    const activity = [...(docket.data?.timeline || []).map(t => ({ ...t, key: `timeline:${t.id}` })), ...(docket.data?.review_history || []).map(t => ({ ...t, key: `review:${t.id}` }))].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return <section className={`report-docket ${mapContext ? 'report-map-selection' : ''}`} aria-label="Selected report">
        <header><div><h2 tabIndex={-1} ref={heading}>{selected.ticket_id || report?.ticket_id || `Report ${selected.id}`}</h2>{(report?.status || selected.status) && <GovStatus value={report?.status || selected.status} label={getStatusDescriptor(report?.status || selected.status).label}/>}<p className="report-docket-subtitle">{selected.title || selected.issue}</p></div><GovButton onClick={close} aria-label="Close report"><X size={17} /></GovButton></header>
        <div className="report-docket-tabs" aria-label="Report detail view"><GovButton aria-pressed={activeTab === 'details'} onClick={() => setTab('details')}>Details</GovButton><GovButton aria-pressed={activeTab === 'activity'} onClick={() => setTab('activity')}>Activity</GovButton>{routing.view && <GovButton aria-pressed={activeTab === 'routing'} onClick={() => { setStartRoutingDraft(false); setTab('routing'); }}>Routing</GovButton>}<GovButton onClick={refresh} aria-label="Refresh report" disabled={docket.loading}><RefreshCw size={14} /></GovButton></div>
        <GovState loading={docket.loading} error={docket.error} onRetry={refresh} />
        {notice && <p className="gov-note" role="status">{notice}</p>}
        {report && !docket.error && !docket.loading && <div className="report-docket-body">{activeTab === 'routing' ? <ReportRouting key={report.id} reportId={report.id} startNew={startRoutingDraft} onChanged={onChanged}/> : activeTab === 'details' ? <>
            <section className="report-docket-summary"><div><h3>Review owner</h3>{docket.data.can_assign_review && !['resolved','rejected','cancelled','completed'].includes(report.status) && <button type="button" className="gov-text-button" onClick={() => start('owner')}>{operations.review_owner_id ? 'Reassign' : 'Assign reviewer'}</button>}</div><strong>{operations.review_owner_name || (['resolved','completed','rejected','cancelled'].includes(report.status) ? 'Not recorded' : 'Needs routing')}</strong><small>{operations.review_owner_id ? `${operations.assignment_mode === 'automatic' ? 'Automatically queued' : 'Manually assigned'} · ${formatDate(operations.assigned_at)}` : (['resolved','completed','rejected','cancelled'].includes(report.status) ? 'No review ownership was recorded for this closed report.' : operations.routing_reason || 'Waiting for an eligible review owner')}</small>{operations.review_owner_id && !operations.owner_available && <p>Owner unavailable. A coordinator should reassign this review.</p>}</section>
            <section className="report-docket-summary"><div><h3>Severity grade</h3>{docket.data.can_grade_priority && <button type="button" className="gov-text-button" onClick={() => start('priority')}>{operations.priority_grade ? 'Review grade' : 'Set grade'}</button>}</div><ReportPriority grade={operations.priority_grade} />{operations.priority_reason && <p>{operations.priority_reason}</p>}<small>{operations.priority_reviewed_by ? `Reviewed by ${operations.priority_reviewed_by} · ${formatDate(operations.priority_reviewed_at)}` : 'Awaiting staff assessment'}</small>{operations.next_review_at && <small>Review due {formatDate(operations.next_review_at)}</small>}<small>AI urgency: {report.ai_urgency || 'Not assessed'}</small></section>
            <h3>Evidence</h3>{image && !failedImage ? <a href={image.startsWith('http') ? image : `${API_BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`} target="_blank" rel="noreferrer" aria-label="Open evidence image in full"><img className="report-docket-evidence" src={image.startsWith('http') ? image : `${API_BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`} alt={`Submitted evidence for ${selected.ticket_id}`} onError={() => setFailedImage(true)} /></a> : <div className="report-docket-evidence-unavailable">{failedImage ? 'Evidence image is unavailable.' : 'No evidence image recorded.'}</div>}
            <h3>{report.category}</h3><p>{report.description}</p><p className="report-map-address">{report.location_string || selected.address || selected.barangay || 'Address not recorded'}</p>
            {selected.relationship && <p className="gov-note">{selected.relationship === 'linked' ? 'Linked to this asset' : `Nearby · ${selected.distance_m ?? 'Unknown'} m from asset · link not confirmed`}</p>}
            <dl><dt>Submitted</dt><dd>{formatDate(report.created_at)}</dd>{report.updated_at && <><dt>Updated</dt><dd>{formatDate(report.updated_at)}</dd></>}</dl>
            {docket.data.work_orders?.length > 0 && <div className="report-docket-work-orders"><h3>Work orders</h3>{docket.data.work_orders.map(w => <Link key={w.id} to={`/gov/work-orders?wo=${w.id}`}>{w.wo_number} <ArrowUpRight size={14} /></Link>)}</div>}
            {docket.data.projects?.length>0&&<div className="report-docket-work-orders"><h3>Related projects</h3>{docket.data.projects.map(project=><Link key={project.id} to={`/gov/projects?project=${project.id}`}>{project.reference} <ArrowUpRight size={14}/></Link>)}</div>}
        </> : <ol className="report-docket-activity">{!activity.length && <li>No recorded activity.</li>}{activity.map(t => <li key={t.key}>{t.label ? <strong>{t.label}</strong> : <GovStatus value={t.status} />}<time>{formatDate(t.created_at)}{t.actor && ` · ${t.actor}`}</time>{t.previous_owner && <small>Previous owner: {t.previous_owner}</small>}{(t.reason || t.note) && <p>{t.reason || t.note}</p>}</li>)}</ol>}</div>}
        <footer>{report && !docket.error && !docket.loading && <><div className="report-docket-actions">{routing.create && activeTab !== 'routing' && <GovButton onClick={() => { setStartRoutingDraft(true); setTab('routing'); }}>Route to another office</GovButton>}{actions.map(value => <GovButton key={value} primary={['verify','approve','assign'].includes(value)} onClick={() => start(value)}>{ACTIONS[value].label}</GovButton>)}{docket.data.can_create_project&&<Link className="gov-button" to={`/gov/projects?sourceReport=${report.id}&from=${encodeURIComponent(location.pathname+location.search)}`}>Refer to project</Link>}</div>{!actions.length && !docket.data.can_create_project && !['resolved','completed'].includes(report.status) && <p className="gov-note">No report decisions available for your account.</p>}</>}{!fullPage && <Link className="gov-text-button" to={`/gov/reports/${selected.id}?from=${encodeURIComponent(location.pathname + location.search)}`}>Full report <ArrowUpRight size={14} /></Link>}</footer>
        <GovConfirm className={action === 'priority' ? 'report-grade-dialog' : ''} open={Boolean(action)} title={ACTIONS[action]?.title || ''} confirmLabel={ACTIONS[action]?.label} busy={busy} error={error} onClose={() => setAction('')} onConfirm={execute}>
            <p>{ACTIONS[action]?.detail}</p><form ref={commandForm} onSubmit={e => e.preventDefault()}>
                {['assign','owner'].includes(action) && <>{action === 'assign' && <label className="gov-field">Work order title<input required minLength={3} value={title} onChange={e => setTitle(e.target.value)} /></label>}<GovState loading={staff.loading} error={staff.error} onRetry={staff.reload} /><label className="gov-field">Assign to<select required value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">{action === 'owner' ? 'Choose review employee' : 'Choose field official'}</option>{(staff.data || []).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label>{action === 'assign' && <label className="gov-field">Work-order priority<select value={workPriority} onChange={e => setWorkPriority(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>}{!staff.loading && !staff.error && staff.data?.length === 0 && <p role="status">No eligible employee is available for this assignment. Staff permissions and district coverage need a coordinator review.</p>}</>}
                {action === 'priority' && <ReportSeverityAssessment grade={grade} onGrade={setGrade} revisit={revisit} onRevisit={setRevisit} reason={reason} onReason={setReason} currentGrade={operations.priority_grade} closed={['resolved','completed','rejected','cancelled'].includes(report?.status)} />}
                {['verify','publish_details'].includes(action) && <label className="gov-field"><span><input type="checkbox" required checked={reviewedPublicContent} onChange={e => setReviewedPublicContent(e.target.checked)} /> I checked the public address, pin, description, and photo for personal information and accuracy.</span></label>}
                {action && !['verify','publish_details','priority'].includes(action) && <label className="gov-field">{action === 'request_info' ? 'What is missing?' : 'Decision reason'}<textarea required minLength={10} value={reason} onChange={e => setReason(e.target.value)} rows={3} /></label>}
                {action === 'request_info' && <label className="gov-field">Message to the resident<textarea required minLength={10} value={message} onChange={e => setMessage(e.target.value)} rows={3} /></label>}
            </form><p className="gov-note">{selected.ticket_id}</p>{error && <GovButton onClick={refresh}>Reload report before trying again</GovButton>}
        </GovConfirm>
    </section>;
}
