import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovTabs, GovTable, GovDetail, GovState, GovStatus, GovConfirm, formatDate, reportUrl } from '../components/government/GovWorkspace';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import OboScheduleModal from '../components/modals/OboScheduleModal';
import OboFindingsModal from '../components/modals/OboFindingsModal';
import OboTechnicalReviewModal from '../components/modals/OboTechnicalReviewModal';
import OboNewApplicationModal from '../components/modals/OboNewApplicationModal';

const QUEUES = [['all','All applications'],['application_received','Received'],['technical_review','Technical review'],['inspection_scheduled','Scheduled'],['inspection_complete','Inspected'],['notice_issued','Notices'],['re_inspection_scheduled','For reinspection'],['permit_issued','Permit recorded'],['cleared','Cleared']];

export default function OboInspectionsPage() {
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get('page')) || 1);
    const view = params.get('tab') || 'all';
    const search = params.get('search') || '';
    const id = params.get('obo');
    const records = useGovernmentData(`/api/gov/obo-workspace?${new URLSearchParams({ page: String(page), view, search })}`);
    const options = useGovernmentData('/api/gov/obo-options');
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState('');
    const trigger = useRef(null);
    function change(name, value) {
        setParams(current => { const next = new URLSearchParams(current); value && value !== 'all' ? next.set(name,value) : next.delete(name); if (['tab','search'].includes(name)) next.delete('page'); return next; }, { replace: name === 'search' });
    }
    function close() { change('obo',''); requestAnimationFrame(() => trigger.current?.focus()); }
    return <GovWorkspace title="Building inspections" description="Applications, inspection findings and recorded official decisions." actions={<><GovSearch value={search} onChange={value => change('search', value)} placeholder="Search application, applicant or address" /><div className="gov-page-actions__group"><GovButton onClick={records.reload} disabled={records.loading}><RefreshCw size={15} /> Refresh</GovButton>{options.data?.create && <GovButton primary onClick={() => setCreating(true)}><Plus size={15} /> Register application</GovButton>}</div></>}>
        <GovTabs label="Inspection queues" value={view} onChange={value => change('tab',value)} items={QUEUES.map(([value,label]) => ({ value,label,count: records.error ? null : records.data?.counts[value] }))} />
        {notice && <p role="status" className="gov-note">{notice}</p>}
        <GovState loading={records.loading && !records.data} error={records.error || options.error} onRetry={() => { records.reload(); options.reload(); }} />
        {records.data && !records.error && <div className={`gov-record-layout ${id ? 'has-detail' : ''}`}><GovTable label="Inspection applications" rows={records.data.items} rowKey={item => item.id} selected={Number(id)} onSelect={(item, element) => { trigger.current = element; change('obo', String(item.id)); }} pagination={{ total: records.data.total, page, onChange: value => change('page', String(value)) }} columns={[
            { key:'obo_number',label:'Application',render:item => <>{item.obo_number}<small>{item.applicant_name}</small></> },
            { key:'property_address',label:'Property',render:item => <>{item.property_address}<small>{item.barangay || 'Barangay not recorded'}</small></> },
            { key:'assigned_inspector_name',label:'Inspector',render:item => item.assigned_inspector_name || 'Unassigned' },
            { key:'status',label:'Status',render:item => <GovStatus value={item.status} /> },
            { key:'inspection_date',label:'Inspection date',render:item => formatDate(item.inspection_date) },
        ]} emptyMessage={search || view !== 'all' ? 'No applications match this view' : 'No inspection applications registered'} />{id && <InspectionRecord key={id} id={id} options={options.data} onClose={close} onChanged={records.reload} />}</div>}
        {creating && <OboNewApplicationModal barangays={options.data?.barangays} onClose={() => setCreating(false)} onSubmit={async body => { const created = await governmentRequest('/api/gov/obo',{ method:'POST',body }); records.reload(); change('obo',String(created.id)); setNotice(`${created.obo_number} registered.`); }} />}
    </GovWorkspace>;
}

function InspectionRecord({ id, options, onClose, onChanged }) {
    const record = useGovernmentData(`/api/gov/obo/${id}`);
    const history = useGovernmentData(`/api/gov/obo/${id}/history`);
    const [tab,setTab] = useState('details');
    const [action,setAction] = useState('');
    const [error,setError] = useState('');
    const [busy,setBusy] = useState(false);
    const form = useRef(null);
    const item = record.data;
    const closed = item && ['permit_issued','cleared'].includes(item.status);
    function changed() { record.reload(); history.reload(); onChanged(); }
    async function save({ oboId, ...body }, suffix = '') {
        const saved = await governmentRequest(`/api/gov/obo/${oboId}${suffix}`,{ method:'PATCH',body }); changed(); return saved;
    }
    async function decision() {
        if (!form.current.reportValidity() || busy) return;
        setBusy(true); setError('');
        try { await save({ oboId: item.id, status: action, ...Object.fromEntries(new FormData(form.current)) }); setAction(''); }
        catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
    }
    return <GovDetail title={item?.obo_number || 'Inspection record'} onClose={onClose} actions={item && !record.error && <>{options?.inspect && !closed && <>
        {['application_received','technical_review','inspection_complete','notice_issued','inspection_scheduled','re_inspection_scheduled'].includes(item.status) && <GovButton onClick={() => setAction('schedule')}>Schedule inspection</GovButton>}
        {['inspection_scheduled','re_inspection_scheduled','inspection_complete'].includes(item.status) && <GovButton primary onClick={() => setAction('findings')}>Record findings</GovButton>}
        <GovButton onClick={() => setAction('review')}>Technical review</GovButton>
    </>}{options?.record_decision && item.status === 'inspection_complete' && <GovButton onClick={() => { setError(''); setAction(item.is_compliant ? 'permit_issued' : 'notice_issued'); }}>Record official decision</GovButton>}{options?.record_decision && item.status === 'permit_issued' && <GovButton onClick={() => { setError(''); setAction('cleared'); }}>Record clearance</GovButton>}</>}>
        <GovState loading={record.loading && !item} error={record.error} onRetry={record.reload} />
        {item && !record.error && <><GovStatus value={item.status} /><GovTabs label="Inspection record sections" value={tab} onChange={setTab} items={[{value:'details',label:'Details'},{value:'activity',label:'Activity'}]} />
            {tab === 'details' ? <>
                <dl className="gov-facts"><div><dt>Applicant</dt><dd>{item.applicant_name}</dd></div><div><dt>Contact</dt><dd>{item.applicant_contact || 'Not recorded'}</dd></div><div><dt>Property</dt><dd>{item.property_address}</dd></div><div><dt>Barangay</dt><dd>{item.barangay || 'Not recorded'}</dd></div><div><dt>Type</dt><dd>{item.inspection_type}</dd></div><div><dt>Inspector</dt><dd>{item.assigned_inspector_name || 'Unassigned'}</dd></div><div><dt>Scheduled</dt><dd>{formatDate(item.inspection_date)}</dd></div><div><dt>Registered</dt><dd>{formatDate(item.created_at)}</dd></div></dl>
                <section><h3>Inspection findings</h3><p>{item.findings || 'No findings recorded.'}</p><p>Assessment: {item.is_compliant == null ? 'Not recorded' : item.is_compliant ? 'Compliant' : 'Compliance concerns found'}</p>{item.violation_details && <p>{item.violation_details}</p>}</section>
                <section><h3>Technical reviews</h3><dl className="gov-facts">{[['arch','Architectural'],['civil','Civil / structural'],['elec','Electrical'],['sani','Sanitary / plumbing'],['mech','Mechanical']].map(([key,label]) => <div key={key}><dt>{label}</dt><dd>{item[`${key}_review`]?.replaceAll('_',' ') || 'Not recorded'}</dd></div>)}</dl></section>
                {item.source_report_id && <Link className="gov-record-link" to={reportUrl(item.source_report_id)}>Open source report ↗</Link>}
            </> : <><GovState loading={history.loading && !history.data} error={history.error} onRetry={history.reload} />{history.data && !history.error && (history.data.length ? <ol className="gov-inline-list">{history.data.map(event => <li key={event.id}><p>{event.action}</p><small>{event.actor_name || 'Actor not recorded'} · {formatDate(event.created_at)}</small></li>)}</ol> : <p>No activity entries recorded for this inspection.</p>)}</>}
            {action === 'schedule' && <OboScheduleModal inspection={item} onClose={() => setAction('')} onSubmit={save} />}
            {action === 'findings' && <OboFindingsModal inspection={item} onClose={() => setAction('')} onSubmit={save} />}
            {action === 'review' && <OboTechnicalReviewModal inspection={item} onClose={() => setAction('')} onSubmit={body => save(body,'/technical-review')} />}
            <GovConfirm open={['permit_issued','notice_issued','cleared'].includes(action)} title={action === 'cleared' ? 'Record official clearance' : 'Record official decision'} onClose={() => setAction('')} busy={busy} error={error} confirmLabel="Save decision record" onConfirm={decision}>
                <p>Enter the reference from the issued official decision.</p><form ref={form} onSubmit={event => { event.preventDefault(); decision(); }}><label className="gov-field">Official decision reference<input name="decision_reference" required minLength={5} maxLength={500} /></label><label className="gov-field">Decision notes<textarea name="notes" required minLength={10} maxLength={4000} rows={3} /></label></form>
            </GovConfirm>
        </>}
    </GovDetail>;
}
