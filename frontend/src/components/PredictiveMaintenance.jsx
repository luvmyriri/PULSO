import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovSelect, GovTabs, GovState, GovTable, GovDetail, GovStatus, GovConfirm, formatDate } from './government/GovWorkspace';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import AssetLocationPreview from './maps/AssetLocationPreview';

const key = asset => asset.asset_id;
export default function PredictiveMaintenance() {
    const { data, loading, error, reload } = useGovernmentData('/api/gov/predictive/health');
    const [params, setParams] = useSearchParams();
    const [reason, setReason] = useState('');
    const [priority, setPriority] = useState('high');
    const [kind, setKind] = useState('Field inspection');
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState('');
    const [created, setCreated] = useState(null);
    const [aiDraft, setAiDraft] = useState('');
    const [aiBusy, setAiBusy] = useState(false);
    const returnFocus = useRef(null);
    const assets = data?.health_scores || [];
    const view = params.get('queue') || 'review';
    const search = params.get('search') || '';
    const barangay = params.get('barangay') || 'all';
    const needsReview = a => !a.existing_work_order && a.review_needed;
    const rows = assets.filter(a => (view === 'all' || (view === 'open' ? a.existing_work_order : needsReview(a))) && (barangay === 'all' || a.barangay === barangay) && `${a.asset_name} ${a.asset_id} ${a.barangay} ${a.category}`.toLowerCase().includes(search.toLowerCase()));
    const selected = assets.find(a => a.asset_id === params.get('asset'));
    const forecast = useGovernmentData(selected ? `/api/gov/predictive/assets/${encodeURIComponent(selected.asset_id)}/forecast?include_model=true` : null);
    function change(name, value) { setParams(p => { const n = new URLSearchParams(p); value ? n.set(name, value) : n.delete(name); return n; }, { replace: name === 'search' }); }
    function select(asset, trigger) { returnFocus.current = trigger; setReason(''); setActionError(''); setCreated(null); setAiDraft(''); setPriority(['CRITICAL', 'HIGH', 'MODERATE'].includes(asset.priority) ? asset.priority.toLowerCase() : 'low'); change('asset', asset.asset_id); }
    function close() { change('asset', ''); requestAnimationFrame(() => returnFocus.current?.focus()); }
    async function createOrder() {
        setSaving(true); setActionError('');
        try {
            const result = await governmentRequest('/api/gov/predictive/convert-to-work-order', { method: 'POST', body: { asset_id: selected.asset_id, plan_summary: `${kind}: ${selected.asset_name}. ${reason.trim()}`, priority, review_reason: reason.trim() } });
            setCreated(result); setConfirming(false); change('queue', 'open'); reload();
        } catch (e) { setActionError(e.message); } finally { setSaving(false); }
    }
    async function draftNotes() {
        setAiBusy(true); setActionError('');
        try {
            const result = await governmentRequest('/api/gov/predictive/ai-plan', { method: 'POST', body: { asset_id: selected.asset_id, barangay: selected.barangay, category: selected.category } });
            setAiDraft(result.maintenance_plan);
        } catch { setActionError('Draft assistance is unavailable. You can still write the scope and create the work order manually.'); } finally { setAiBusy(false); }
    }
    return <GovWorkspace title="Predictive maintenance" description="Find infrastructure that may need inspection, review its location and history, and plan the next job." actions={<>
        <GovSearch value={search} onChange={v => change('search', v)} placeholder="Search asset, ID or location" />
        <div className="gov-page-actions__group"><GovSelect label="Barangay" value={barangay} onChange={v => change('barangay', v)} options={[{ value: 'all', label: 'All recorded areas' }, ...[...new Set(assets.map(a => a.barangay))].sort().map(b => ({ value: b, label: /^\d+$/.test(b) ? `Barangay ${b}` : b }))]} /><GovButton disabled={loading} onClick={reload}><RefreshCw size={15} /> Refresh</GovButton></div>
    </>}>
        <GovState loading={loading && !data} error={error} onRetry={reload} />
        {!error && data && <>
            <GovTabs label="Maintenance queues" value={view} onChange={v => change('queue', v)} items={[{ value: 'review', label: 'Suggested reviews', count: assets.filter(needsReview).length }, { value: 'open', label: 'With open work', count: assets.filter(a => a.existing_work_order).length }, { value: 'all', label: 'All assets', count: assets.length }]} />
            <p className="gov-note">Start with assets showing poor condition, recent linked reports or gaps in inspection history. Review the evidence before requesting work. Updated {formatDate(data.as_of)}.</p>
            {!assets.length && <GovState empty title="Register infrastructure before calculating maintenance reviews">No infrastructure assets are available in your scope. <Link to="/gov/assets">Open Infrastructure</Link> to review the asset registry.</GovState>}
            <div className={`gov-record-layout ${selected ? 'has-detail' : ''}`}>
                <GovTable label="Assets for maintenance review" rows={rows} rowKey={key} selected={selected?.asset_id} onSelect={select} columns={[
                    { key: 'asset_name', label: 'Asset', render: a => <>{a.asset_name}<small>{a.asset_id}</small></> },
                    { key: 'barangay', label: 'Location', render: a => <>{/^\d+$/.test(a.barangay) ? `Barangay ${a.barangay}` : a.barangay}<small>{a.category}</small></> },
                    { key: 'health_score', label: 'Condition', render: a => <><GovStatus value={a.priority.toLowerCase()} label={a.priority === 'GOOD' ? 'Monitoring' : a.priority === 'UNKNOWN' ? 'Needs inspection' : a.priority.toLowerCase()} /><small>{a.health_score == null ? 'Condition not recorded' : `${a.health_score}/100 · recorded condition`}</small></> },
                    { key: 'report_count', label: 'Linked reports (90 days)', render: a => <>{a.report_count}<small>{a.last_maintenance_date ? `Last maintenance ${a.last_maintenance_date}` : 'Maintenance date not recorded'}</small></> },
                    { key: 'existing_work_order', label: 'Work', render: a => a.existing_work_order ? <GovStatus value={a.existing_work_order.status} /> : 'No open work order' },
                ]} />
                {selected && <GovDetail title={selected.asset_name} onClose={close}>
                    <section><dl className="gov-facts"><dt>Asset ID</dt><dd>{selected.asset_id}</dd><dt>Location</dt><dd>{selected.barangay}</dd><dt>Category</dt><dd>{selected.category}</dd><dt>Condition</dt><dd>{selected.health_score == null ? 'Not recorded · needs inspection' : `${selected.health_score}/100 · ${selected.priority.toLowerCase()}`}</dd><dt>Maintenance</dt><dd>{selected.last_maintenance_date || 'No maintenance completion recorded'}</dd></dl></section>
                    <AssetLocationPreview assetId={selected.asset_id} data={forecast.data} loading={forecast.loading} error={forecast.error}/>
                    <section><h3>Suggested inspection timing</h3><GovState loading={forecast.loading} error={forecast.error} onRetry={forecast.reload} />{forecast.data && !forecast.loading && <>{forecast.data.projection ? <><p><strong>{forecast.data.projection.projected_review_date}</strong> · suggested review date</p><dl className="gov-facts"><dt>Previous work</dt><dd>{forecast.data.projection.work_type}</dd><dt>Usual interval</dt><dd>{forecast.data.projection.typical_interval_days} days</dd><dt>Suggested window</dt><dd>{forecast.data.projection.review_window_start} to {forecast.data.projection.review_window_end}</dd></dl><p className="gov-note">Based on {forecast.data.projection.completed_count} past maintenance dates. Confirm the timing with the engineering team.</p></> : <p>There is not enough comparable maintenance history to suggest a date yet. Use the recorded condition and location to decide whether an inspection is needed.</p>}</>}</section>
                    <section><h3>Recorded maintenance history</h3>{forecast.data?.history.length ? <ul className="gov-inline-list">{forecast.data.history.map(log => <li key={log.id}><strong>{log.completed_date || 'Date not recorded'}</strong> · {log.work_type || 'Work type not recorded'}</li>)}</ul> : <p>{forecast.loading ? 'Loading history…' : forecast.error ? 'Maintenance history could not be loaded. Retry the request above.' : 'No completed maintenance is recorded for this asset.'}</p>}</section>
                    <section><h3>Inspection suggestion</h3>{forecast.loading ? <p role="status">Preparing a suggestion…</p> : forecast.error ? <p>The suggestion is unavailable. You can still review the recorded evidence.</p> : forecast.data?.experimental_model?.status==='experimental'?<><p><strong>{forecast.data.experimental_model.review_index>=70?'Check this asset soon':forecast.data.experimental_model.review_index>=40?'Include this asset in inspection planning':'Continue routine monitoring'}</strong></p><p>Compare this suggestion with the site condition and recent reports before deciding on work.</p><details><summary>About this suggestion</summary><p>It considers asset condition, maintenance history and reports around the location. It has not been checked against enough real failure outcomes to confirm what will happen. An engineer should verify the site.</p></details></>:<p>An automatic suggestion is unavailable. Use the recorded condition and history to plan an inspection.</p>}</section>
                    <section><h3>Supporting reports</h3><p>{selected.report_count || 0} reports are linked through work orders in the past {data.data_window_days || 90} days. Repeated submissions alone do not confirm that a defect has returned.</p>{selected.report_count > 0 && <Link className="gov-text-button" to={`/gov/reports?asset_id=${encodeURIComponent(selected.asset_id)}&source=${encodeURIComponent(selected.asset_name)}`}>Open linked reports <ArrowUpRight size={14} /></Link>}</section>
                    {selected.existing_work_order ? <section><h3>Existing work</h3><p>{selected.existing_work_order.wo_number} · <GovStatus value={selected.existing_work_order.status} /></p><Link className="gov-button" to={`/gov/work-orders?wo=${selected.existing_work_order.id}`}>Open work order <ArrowUpRight size={14} /></Link></section> : data.can_create_work_order ? <section>
                        <h3>Create an inspection or preventive job</h3><p>Record the engineering scope. The work order will still need assignment and any required approval.</p>
                        <label className="gov-field">Work type<select value={kind} onChange={e => setKind(e.target.value)}><option>Field inspection</option><option>Preventive maintenance</option></select></label>
                        <label className="gov-field">Priority<select value={priority} onChange={e => setPriority(e.target.value)}><option value="critical">Critical</option><option value="high">High</option><option value="moderate">Normal</option><option value="low">Low</option></select></label>
                        <label className="gov-field">Scope and review reason<textarea value={reason} onChange={e => setReason(e.target.value)} minLength={10} placeholder="Describe what needs inspection and why." /><small>At least 10 characters. Do not include a budget authorization.</small></label>
                        <details><summary>Optional drafting assistance</summary><p className="gov-note">Generated notes are an unreviewed draft. Check them against this asset’s evidence.</p><GovButton onClick={draftNotes} disabled={aiBusy}>{aiBusy ? 'Preparing draft…' : 'Draft inspection notes'}</GovButton>{aiDraft && <><p className="gov-note" style={{ whiteSpace: 'pre-wrap' }}>{aiDraft}</p><GovButton onClick={() => setReason(aiDraft)}>Use this draft in my scope</GovButton></>}</details>
                        {actionError && !confirming && <p className="gov-error" role="alert">{actionError}</p>}
                        <div className="gov-form-actions"><GovButton primary disabled={reason.trim().length < 10 || saving || loading} onClick={() => setConfirming(true)}>Review work order</GovButton></div>
                    </section> : <section><p>Your account can review these records. Ask an authorized coordinator to create work.</p></section>}
                    {created && <section role="status"><h3>Work order created</h3><p>{created.wo_number} is saved.</p><Link className="gov-button is-primary" to={`/gov/work-orders?wo=${created.id}`}>Open created work order <ArrowUpRight size={14} /></Link></section>}
                </GovDetail>}
            </div>
        </>}
        <GovConfirm open={confirming} title="Create this work order?" confirmLabel="Create work order" onClose={() => setConfirming(false)} onConfirm={createOrder} busy={saving} error={actionError}><p>{kind} for <strong>{selected?.asset_name}</strong>, with {priority === 'moderate' ? 'normal' : priority} priority. This creates a work record; it does not assign a team, authorize funds or approve construction.</p><p style={{ whiteSpace: 'pre-wrap' }}>{reason}</p></GovConfirm>
    </GovWorkspace>;
}
