import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, ExternalLink, Megaphone } from 'lucide-react';
import { GovWorkspace, GovSearch, GovStatus, GovState, GovTabs, GovTable, GovDetail, GovConfirm, formatDate, reportUrl } from '../components/government/GovWorkspace';
import PublicationArticle from '../components/government/PublicationArticle';
import {PublicationButton, PublicationFormat, PUBLICATION_INPUT, PUBLICATION_LABEL} from '../components/government/PublicationControls';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';

const STAGES = [{ value: 'all', label: 'All updates' }, { value: 'draft', label: 'Drafts' }, { value: 'in_review', label: 'For review' }, { value: 'approved', label: 'Approved' }, { value: 'published', label: 'Published' }, { value: 'withdrawn', label: 'Withdrawn' }];
const ACTIONS = {
    submit: { label: 'Send for review', status: 'in_review', description: 'The saved content and report relationships will enter review. This does not publish the update or notify residents.' },
    approve: { label: 'Approve this version', status: 'approved', description: 'Approve the exact content, audience, report relationships and sourced disclosure shown here. Changed content will need another review.' },
    return_to_draft: { label: 'Return to draft', status: 'draft', description: 'Return this update for editing. It will need review again before publication.' },
    publish: { label: 'Publish update', status: 'published', description: 'This version will become public. Reviewed report links queue private notices according to each resident’s saved preferences. Email requires opt-in and a configured service. Phone push is not connected.' },
    withdraw: { label: 'Withdraw update', status: 'withdrawn', description: 'This removes the update from current public access and stops pending notifications. Delivered notifications cannot be recalled.' },
    correct: { label: 'Prepare correction', description: 'Create an editable correction draft. The last released version stays public until a new version is reviewed and published.' },
};

export default function GovAnnouncementsPage() {
    const permissions = useGovernmentData('/api/gov/announcements/permissions');
    const [params, setParams] = useSearchParams();
    const stage = params.get('status') || 'all';
    const search = params.get('search') || '';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const query = new URLSearchParams({ page: String(page), limit: '15', q: search });
    if (stage !== 'all') query.set('status', stage);
    const { data, loading, error, reload } = useGovernmentData(`/api/gov/announcements?${query}`);
    const detail = useGovernmentData(/^\d+$/.test(params.get('selected') || '') ? `/api/gov/announcements/${params.get('selected')}` : null);
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [success, setSuccess] = useState('');
    const [detailTab, setDetailTab] = useState('preview');
    const returnFocus = useRef(null);
    const items = data?.items || [];
    const rows = items;
    const selected = detail.data;
    const activeTab=detailTab==='delivery'&&!selected?.published_version?'preview':detailTab;
    const delivery = useGovernmentData(selected?.published_version ? `/api/gov/announcements/${selected.id}/deliveries` : null);
    function change(name, value) { setParams(p => { const n = new URLSearchParams(p); value ? n.set(name, value) : n.delete(name); if (['status', 'search'].includes(name)) n.delete('page'); return n; }, { replace: name === 'search' }); }
    function close() { change('selected', ''); requestAnimationFrame(() => returnFocus.current?.focus()); }
    function begin(name) { setActionError(''); setReason(''); setAction(name); }
    async function confirm() {
        if (['withdraw', 'correct'].includes(action) && reason.trim().length < 10) { setActionError('Explain the reason in at least 10 characters.'); return; }
        setBusy(true); setActionError('');
        try {
            const body = { expected_version: selected.content_version, ...(action === 'correct' ? { correction_summary: reason.trim(), reason: reason.trim() } : { status: ACTIONS[action].status, ...(action === 'withdraw' ? { withdrawal_reason: reason.trim() } : {}) }) };
            await governmentRequest(`/api/gov/announcements/${selected.id}/${action === 'correct' ? 'corrections' : 'status'}`, { method: action === 'correct' ? 'POST' : 'PATCH', body });
            setSuccess(action === 'publish' ? 'Update published. Notification status is available in Delivery.' : action === 'correct' ? 'Correction draft prepared. Open Edit draft to revise the content.' : 'The update was saved.');
            if(action==='publish')setDetailTab('delivery');
            setAction(null); reload(); detail.reload(); delivery.reload();
        } catch (e) { setActionError(e.message); } finally { setBusy(false); }
    }
    return <GovWorkspace title="Updates" description="Prepare, review and publish announcements, advisories and news." actions={<>
        <GovSearch value={search} onChange={v => change('search', v)} placeholder="Search update title or reference" />
        <div className="gov-page-actions__group">{permissions.data?.notification_delivery&&<PublicationButton to="/gov/notification-deliveries">Notification delivery</PublicationButton>}<PublicationButton onClick={reload} disabled={loading}><RefreshCw size={15} /> Refresh</PublicationButton>{permissions.data?.create ? <PublicationButton primary to="/gov/announcements/new"><Plus size={16} /> Create update</PublicationButton> : <PublicationButton disabled title={permissions.loading ? 'Checking drafting permission…' : 'Your account needs permission to draft public updates.'}><Plus size={16} /> Create update</PublicationButton>}</div>
    </>}>
        <GovTabs label="Publication status" items={STAGES} value={stage} onChange={v => change('status', v)} />
        {permissions.error && <p role="alert">Drafting permissions could not be checked. <button className="gov-text-button" onClick={permissions.reload}>Try again</button></p>}
        {permissions.data && !permissions.data.create && <p className="gov-note">Your account can view updates. An authorized drafter can create an announcement, advisory or news item.</p>}
        {success && <p role="status" className="gov-note">{success}</p>}
        <GovState loading={loading && !data} error={error} onRetry={reload} />
        <GovState loading={detail.loading && !detail.data} error={detail.error} onRetry={detail.reload} />
        {data&&!error&&data.total===0&&!search&&stage==='all'&&!selected&&<section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-[var(--gov-rule)] bg-[var(--gov-surface)] px-6 py-14 text-center"><span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--gov-rule)] bg-[var(--gov-surface-subtle)] text-[var(--gov-text-secondary)]"><Megaphone size={25}/></span><h2 className="text-lg font-semibold text-[var(--gov-text)]">No publications yet</h2><p className="mb-6 mt-2 max-w-sm text-sm leading-relaxed text-[var(--gov-text-secondary)]">Prepare city news, service advisories and official announcements for review.</p>{permissions.data?.create&&<PublicationButton primary to="/gov/announcements/new"><Plus size={16}/>Draft a publication</PublicationButton>}</section>}
        {data && !error && (rows.length>0||search||stage!=='all'||selected) && <div className={`gov-record-layout ${selected ? 'has-detail' : ''}`}>
            <GovTable label="Public updates" rows={rows} pagination={{ total: data.total, page, onChange: p => change('page', String(p)) }} rowKey={a => a.id} selected={selected?.id} onSelect={(a, trigger) => { returnFocus.current = trigger; setDetailTab('preview'); change('selected', String(a.id)); }} emptyMessage="No updates in this view" columns={[
                { key: 'title_en', label: 'Publication', render: a => <span className="flex items-start gap-3"><PublicationFormat compact value={a.publication_format}/><span className="min-w-0"><span className="block text-[13px] font-semibold leading-5">{a.title_en}</span><small className="mt-1! font-normal">{a.announcement_id}</small></span></span> },
                { key: 'publication_format', label: 'Format',render:a=><span className="capitalize">{a.publication_format}</span> }, { key: 'status', label: 'Status', render: a => <span className="inline-flex rounded-md border border-[var(--gov-rule)] bg-[var(--gov-surface-subtle)] px-2 py-1"><GovStatus value={a.status} label={{draft:'Draft',in_review:'For review',approved:'Approved',published:'Published',withdrawn:'Withdrawn'}[a.status]}/></span> },
                { key: 'target_barangays', label: 'Area', render: a => a.target_barangays.join(', ') || (a.district_id ? 'District scope' : 'Citywide') },
                { key: 'updated_at', label: 'Updated', render: a => formatDate(a.updated_at) },
            ]} />
            {selected && <GovDetail title={selected.announcement_id} onClose={close} actions={<>
                {selected.allowed_actions.includes('edit') && <PublicationButton to={`/gov/announcements/${selected.id}/edit`}>Edit draft</PublicationButton>}
                {selected.allowed_actions.filter(a => a !== 'edit').map(a => <PublicationButton key={a} primary={['submit', 'approve', 'publish'].includes(a)} onClick={() => begin(a)}>{ACTIONS[a].label}</PublicationButton>)}
            </>}>
                <div className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-1 border-b border-[var(--gov-rule)] bg-[var(--gov-surface)] py-3" aria-label="Publication record sections">{[['preview','Preview'],['details','Details'],['reports','Report links'],...(selected.published_version?[['delivery','Delivery']]:[])].map(([value,label])=><PublicationButton quiet key={value} aria-pressed={activeTab===value} onClick={()=>setDetailTab(value)} className={activeTab===value?'bg-[var(--workspace-selection)]! text-[var(--workspace-accent)]!':''}>{label}</PublicationButton>)}</div>
                {activeTab==='details'&&<section><GovStatus value={selected.status} /><p className="gov-note">{selected.announcement_id} · Version {selected.content_version}{selected.published_version ? ` · Public version ${selected.published_version}` : ''}</p><dl className="gov-facts"><dt>Format</dt><dd>{selected.publication_format}</dd><dt>Area</dt><dd>{selected.target_barangays.join(', ') || (selected.district_id ? 'Selected district' : 'Citywide')}</dd><dt>Author</dt><dd>{selected.author_name || 'Not recorded'}</dd><dt>Updated</dt><dd>{formatDate(selected.updated_at)}</dd></dl></section>}
                {activeTab==='preview'&&<section><h3>Publication preview</h3><PublicationArticle item={selected} draftId={selected.id} />{selected.content_fil && <details><summary>Filipino preview</summary><PublicationArticle item={selected} language="fil" draftId={selected.id} /></details>}{selected.published_version && <Link className="gov-text-button" to={`/updates/${selected.id}`}>Open released public version <ExternalLink size={14} /></Link>}</section>}
                {activeTab==='reports'&&<section><h3>Related reports</h3><p>These links do not change report status. Candidates remain internal until a reviewer confirms their relevance.</p><ul className="gov-inline-list">{selected.report_associations.map(a => <li key={a.id}><Link to={reportUrl(a.report_id)}>{a.ticket_id || `Report ${a.report_id}`}</Link> · <GovStatus value={a.association_type} /><p>{a.basis_reason || 'Awaiting a recorded review reason.'}</p></li>)}</ul>{!selected.report_associations.length && <p>No reports linked. An update can be published without report links.</p>}</section>}
                {activeTab==='details'&&<section><h3>Budget disclosure</h3>{selected.budget_disclosure?.amount != null ? <><p><strong>{Number(selected.budget_disclosure.amount).toLocaleString('en-PH', { style: 'currency', currency: selected.budget_disclosure.currency })}</strong> · {selected.budget_disclosure.amount_type.replaceAll('_', ' ')}</p><a className="gov-text-button" href={selected.budget_disclosure.source_url} target="_blank" rel="noreferrer">{selected.budget_disclosure.source_label} <ExternalLink size={14} /></a><p className="gov-note">Source date: {selected.budget_disclosure.source_date}. {selected.budget_disclosure.scope_caveat}</p></> : <p>No budget amount is disclosed in this update.</p>}<p>Disclosure records a sourced fact. It does not authorize funds or process procurement.</p><a className="gov-text-button" href="https://caloocancity.gov.ph/invitation-to-bid/" target="_blank" rel="noreferrer">View official bidding opportunities <ExternalLink size={14} /></a></section>}
                {activeTab==='delivery' && selected.published_version && <section><h3>Notification status</h3>{delivery.loading ? <p>Checking delivery…</p> : delivery.error ? <p role="alert">Delivery status is unavailable. <button className="gov-text-button" onClick={delivery.reload}>Try again</button></p> : delivery.data && <><dl className="gov-facts">{Object.entries(delivery.data.in_app).map(([state, count]) => <div key={state} style={{ display: 'contents' }}><dt>In-app {state}</dt><dd>{count}</dd></div>)}</dl><h4>Email notifications</h4><dl className="gov-facts">{Object.entries(delivery.data.email||{}).map(([state,count])=><div className="contents" key={state}><dt>{state.replaceAll('_',' ')}</dt><dd>{count}</dd></div>)}</dl><p className="gov-note">Email service: {delivery.data.email_service==='configured'?'configured':'not configured'}. SMTP acceptance does not confirm mailbox delivery. Phone push is not connected.</p></>}</section>}
            </GovDetail>}
        </div>}
        <GovConfirm open={Boolean(action)} title={ACTIONS[action]?.label} confirmLabel={ACTIONS[action]?.label} onClose={() => setAction(null)} onConfirm={confirm} busy={busy} error={actionError}><p>{ACTIONS[action]?.description}</p>{['withdraw', 'correct'].includes(action) && <label className={PUBLICATION_LABEL}>Reason<textarea className={PUBLICATION_INPUT} autoFocus value={reason} onChange={e => setReason(e.target.value)} minLength={10} required /></label>}</GovConfirm>
    </GovWorkspace>;
}
