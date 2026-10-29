import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovSelect, GovTabs, GovState, GovTable, GovDetail, GovStatus, GovConfirm, formatDate } from './government/GovWorkspace';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken } from '../utils/authSession';
import PredictiveHazardMap from './maps/PredictiveHazardMap';
import AssetHazardContext from './government/AssetHazardContext';
import PredictiveTestingProgress from './government/PredictiveTestingProgress';
import ReportViewToggle from './government/ReportViewToggle';

const key = asset => asset.asset_id;
export default function PredictiveMaintenance() {
    const { data, loading, error, reload } = useGovernmentData('/api/gov/predictive/health');
    const production = useGovernmentData('/api/gov/predictive/production/status');
    const [modelPage, setModelPage] = useState(1);
    const productionQueue = useGovernmentData(production.data?.status === 'available' ? `/api/gov/predictive/production/queue?limit=30&offset=${(modelPage - 1) * 30}` : null);
    const navigate = useNavigate();
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
    const [exportError, setExportError] = useState('');
    const returnFocus = useRef(null);
    const assets = data?.health_scores || [];
    const view = params.get('queue') || 'review';
    const display = params.get('display') === 'map' ? 'map' : 'table';
    const mapParams = new URLSearchParams(params);
    mapParams.set('display', 'map');
    const tableParams = new URLSearchParams(params);
    tableParams.delete('display');
    const search = params.get('search') || '';
    const barangay = params.get('barangay') || 'all';
    const needsReview = a => !a.existing_work_order && a.review_needed;
    const rows = assets.filter(a => (view === 'all' || (view === 'open' ? a.existing_work_order : needsReview(a))) && (barangay === 'all' || a.barangay === barangay) && `${a.asset_name} ${a.asset_id} ${a.barangay} ${a.category}`.toLowerCase().includes(search.toLowerCase()));
    const selected = assets.find(a => a.asset_id === params.get('asset'));
    const forecast = useGovernmentData(selected ? `/api/gov/predictive/assets/${encodeURIComponent(selected.asset_id)}/forecast?include_model=false` : null);
    const approvedAssessment = useGovernmentData(selected ? `/api/gov/predictive/production/assets/${encodeURIComponent(selected.asset_id)}` : null);
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
    async function exportApprovedQueue() {
        setExportError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/gov/predictive/production/queue.csv`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (!response.ok) throw new Error('The approved queue changed or is unavailable. Refresh and try again.');
            const url = URL.createObjectURL(await response.blob());
            const anchor = document.createElement('a');
            anchor.href = url; anchor.download = 'PULSO_Validated_Maintenance_Queue.csv';
            document.body.appendChild(anchor); anchor.click(); anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (cause) { setExportError(cause.message); }
    }
    return <GovWorkspace title="Predictive maintenance" description="Find infrastructure that may need inspection, review its location and history, and plan the next job." actions={<>
        <GovSearch value={search} onChange={v => change('search', v)} placeholder="Search asset, ID or location" />
        <div className="gov-page-actions__group"><ReportViewToggle label="Maintenance view" mode={display} tableTo={`?${tableParams}`} mapTo={`?${mapParams}`} /><GovSelect label="Barangay" value={barangay} onChange={v => change('barangay', v)} options={[{ value: 'all', label: 'All recorded areas' }, ...[...new Set(assets.map(a => a.barangay))].sort().map(b => ({ value: b, label: /^\d+$/.test(b) ? `Barangay ${b}` : b }))]} /><GovButton disabled={loading} onClick={reload}><RefreshCw size={15} /> Refresh</GovButton></div>
    </>}>
        <GovState loading={loading && !data} error={error} onRetry={reload} />
        {!error && data && <>
            <GovTabs label="Maintenance queues" value={view} onChange={v => change('queue', v)} items={[{ value: 'review', label: 'Suggested reviews', count: assets.filter(needsReview).length }, { value: 'open', label: 'With open work', count: assets.filter(a => a.existing_work_order).length }, { value: 'all', label: 'All assets', count: assets.length }]} />
            <p className="gov-note">Start with assets showing poor condition, recent linked reports or gaps in inspection history. Review the evidence before requesting work. Updated {formatDate(data.as_of)}.</p>
            {!assets.length && <GovState empty title="Register infrastructure before calculating maintenance reviews">No infrastructure assets are available in your scope. <Link to="/gov/assets">Open Infrastructure</Link> to review the asset registry.</GovState>}
            <div className={`gov-record-layout ${selected ? 'has-detail' : ''}`}>
                {display === 'map' ? <PredictiveHazardMap assets={rows} selected={selected} onSelect={select} /> : <GovTable label="Assets for maintenance review" rows={rows} rowKey={key} selected={selected?.asset_id} onSelect={select} columns={[
                    { key: 'asset_name', label: 'Asset', render: a => <>{a.asset_name}<small>{a.asset_id}</small></> },
                    { key: 'barangay', label: 'Location', render: a => <>{/^\d+$/.test(a.barangay) ? `Barangay ${a.barangay}` : a.barangay}<small>{a.category}</small></> },
                    { key: 'health_score', label: 'Condition', render: a => <><GovStatus value={a.priority.toLowerCase()} label={a.priority === 'GOOD' ? 'Monitoring' : a.priority === 'UNKNOWN' ? 'Needs inspection' : a.priority.toLowerCase()} /><small>{a.health_score == null ? 'Condition not recorded' : `${a.health_score}/100 · recorded condition`}</small></> },
                    { key: 'report_count', label: 'Linked reports (90 days)', render: a => <>{a.report_count}<small>{a.last_maintenance_date ? `Last maintenance ${a.last_maintenance_date}` : 'Maintenance date not recorded'}</small></> },
                    { key: 'existing_work_order', label: 'Work', render: a => a.existing_work_order ? <GovStatus value={a.existing_work_order.status} /> : 'No open work order' },
                ]} />}
                {selected && <GovDetail title={selected.asset_name} onClose={close}>
                    <section><dl className="gov-facts"><dt>Asset ID</dt><dd>{selected.asset_id}</dd><dt>Location</dt><dd>{selected.barangay}</dd><dt>Category</dt><dd>{selected.category}</dd><dt>Condition</dt><dd>{selected.health_score == null ? 'Not recorded · needs inspection' : `${selected.health_score}/100 · ${selected.priority.toLowerCase()}`}</dd><dt>Maintenance</dt><dd>{selected.last_maintenance_date || 'No maintenance completion recorded'}</dd></dl></section>
                    <section><h3>Recorded location</h3><p>{selected.geometry?.type === 'Point' ? `${selected.geometry.coordinates[1].toFixed(5)}, ${selected.geometry.coordinates[0].toFixed(5)}` : selected.geometry ? 'Recorded asset geometry is shown on the infrastructure map.' : 'No asset geometry is recorded.'}</p><p className="gov-note">Registry: {selected.registry_status || 'unverified'}. Review the recorded location before using mapped exposure.</p><Link className="gov-text-button" to={`/gov/map?asset=${encodeURIComponent(selected.asset_id)}&radius=500`}>Investigate related reports on the Reports map <ArrowUpRight size={14} /></Link></section>
                    <AssetHazardContext assetId={selected.asset_id} />
                    <section><h3>Suggested inspection timing</h3><GovState loading={forecast.loading} error={forecast.error} onRetry={forecast.reload} />{forecast.data && !forecast.loading && <>{forecast.data.projection ? <><p><strong>{forecast.data.projection.projected_review_date}</strong> · suggested review date</p><dl className="gov-facts"><dt>Previous work</dt><dd>{forecast.data.projection.work_type}</dd><dt>Usual interval</dt><dd>{forecast.data.projection.typical_interval_days} days</dd><dt>Suggested window</dt><dd>{forecast.data.projection.review_window_start} to {forecast.data.projection.review_window_end}</dd></dl><p className="gov-note">Based on {forecast.data.projection.completed_count} past maintenance dates. Confirm the timing with the engineering team.</p></> : <p>There is not enough comparable maintenance history to suggest a date yet. Use the recorded condition and location to decide whether an inspection is needed.</p>}</>}</section>
                    <section><h3>Recorded maintenance history</h3>{forecast.data?.history.length ? <ul className="gov-inline-list">{forecast.data.history.map(log => <li key={log.id}><strong>{log.completed_date || 'Date not recorded'}</strong> · {log.work_type || 'Work type not recorded'}</li>)}</ul> : <p>{forecast.loading ? 'Loading history…' : forecast.error ? 'Maintenance history could not be loaded. Retry the request above.' : 'No completed maintenance is recorded for this asset.'}</p>}</section>
                    <section><h3>Outcome-based assessment</h3>{approvedAssessment.loading ? <p role="status">Checking approved assessment…</p> : approvedAssessment.error ? <p role="alert">Assessment could not be loaded. Use the recorded condition and history while the service is unavailable.</p> : approvedAssessment.data?.status === 'available' ? <><p><strong>{Math.round(approvedAssessment.data.probability * 100)}% estimated likelihood</strong> of a new verified actionable defect within 90 days of the last verified inspection.</p><dl className="gov-facts"><dt>Verified baseline</dt><dd>{formatDate(approvedAssessment.data.prediction_window_start)}</dd><dt>Prediction window ends</dt><dd>{formatDate(approvedAssessment.data.prediction_window_end)}</dd><dt>Model version</dt><dd>{approvedAssessment.data.model_sha256?.slice(0, 12)}</dd></dl><p className="gov-note">{approvedAssessment.data.limitation}</p></> : <p>{approvedAssessment.data?.reason || 'No approved assessment is available for this asset.'} Use the recorded condition and history to plan an inspection.</p>}</section>
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
        <details className="predictive-data-details">
            <summary>Data progress and model availability</summary>
        <PredictiveTestingProgress />
        <section aria-label="Outcome-based maintenance model queue">
            <h2>Outcome-based model queue</h2>
            <p className="gov-note" role="status">{production.loading ? 'Checking outcome-based model availability…' : production.error ? 'Model availability could not be checked. Recorded maintenance reviews remain available.' : production.data?.status === 'available' ? `Approved ${production.data.category} cohort · ${production.data.approved_class_assets_in_scope} verified assets in this scope · scored ${formatDate(production.data.last_scored_at)}.` : `Outcome-based ranking unavailable: ${production.data?.reason || 'No approved model is configured.'} Recorded maintenance reviews remain available below.`}</p>
            {exportError && <p role="alert" className="gov-error">{exportError}</p>}
            {production.data?.status === 'available' && <><div className="gov-form-actions"><GovButton onClick={exportApprovedQueue}>Export approved queue CSV</GovButton></div><GovState loading={productionQueue.loading && !productionQueue.data} error={productionQueue.error} onRetry={productionQueue.reload} />
                {productionQueue.data?.status === 'available' && <GovTable label="Approved model assessments" rows={productionQueue.data.items || []} rowKey={item => item.asset_id} onSelect={item => navigate(`/gov/assets/${encodeURIComponent(item.asset_id)}`)} pageSize={30} pagination={{ page: modelPage, total: productionQueue.data.total || 0, onChange: setModelPage }} emptyMessage="No current eligible assessments" emptyDescription="Verified assets need a recent independently reviewed no-defect inspection before model ranking." columns={[
                    { key: 'asset_id', label: 'Asset', render: item => <>{item.asset_name}<small>{item.asset_id}</small></> },
                    { key: 'barangay', label: 'Location', render: item => <>{item.barangay}<small>{item.category}</small></> },
                    { key: 'probability', label: '90-day defect likelihood', render: item => <>{Math.round((item.assessment?.probability || 0) * 100)}%<small>From verified inspection</small></> },
                    { key: 'prediction_window_end', label: 'Window ends', render: item => formatDate(item.assessment?.prediction_window_end) },
                ]} />}</>}
        </section>
        </details>
        <GovConfirm open={confirming} title="Create this work order?" confirmLabel="Create work order" onClose={() => setConfirming(false)} onConfirm={createOrder} busy={saving} error={actionError}><p>{kind} for <strong>{selected?.asset_name}</strong>, with {priority === 'moderate' ? 'normal' : priority} priority. This creates a work record; it does not assign a team, authorize funds or approve construction.</p><p style={{ whiteSpace: 'pre-wrap' }}>{reason}</p></GovConfirm>
    </GovWorkspace>;
}
