import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { GovWorkspace, GovButton, GovSelect, GovState, GovTable, GovTabs, formatDate } from '../components/government/GovWorkspace';
import { useGovernmentData } from '../utils/governmentApi';

function reportsLink(row) { return `/gov/reports?ids=${row.report_ids.join(',')}&source=${encodeURIComponent(row.label.replaceAll('_', ' '))}`; }
const insightTabs = [{ value: 'queues', label: 'Waiting work' }, { value: 'areas', label: 'By area' }, { value: 'workload', label: 'Workload' }];
export default function GovAnalyticsPage() {
    const [params, setParams] = useSearchParams();
    const days = params.get('days') || '90';
    const active = params.get('insight') || 'queues';
    const { data, loading, error, reload } = useGovernmentData(`/api/gov/service-insights?days=${days}`);
    function change(name, value) { setParams(p => { const n = new URLSearchParams(p); n.set(name, value); return n; }); }
    const reportColumns = [
        { key: 'label', label: active === 'areas' ? 'Area' : 'Current report status', render: r => <Link className="gov-record-link" to={reportsLink(r)}>{r.label.replaceAll('_', ' ')} <ArrowUpRight size={13} /></Link> },
        { key: 'count', label: 'Open reports', render: r => <span className="gov-volume"><span>{r.count}</span><span aria-hidden="true" className="gov-volume__track"><span style={{ width: `${100 * r.count / Math.max(1, ...(active === 'areas' ? data.areas : data.stages).map(row => row.count))}%` }} /></span></span> },
        { key: 'oldest_days', label: 'Oldest report', render: r => r.oldest_days == null ? 'Not recorded' : `${r.oldest_days} days since submission` },
    ];
    return <GovWorkspace title="Report analysis" description="See where reports are waiting, which areas need attention, and which work orders need support." actions={<>
        <div className="gov-page-actions__group"><GovSelect label="Reports received" value={days} onChange={v => change('days', v)} options={[{ value: '30', label: 'Past 30 days' }, { value: '90', label: 'Past 90 days' }, { value: '180', label: 'Past 180 days' }, { value: '365', label: 'Past year' }]} /></div>
        <GovButton onClick={reload} disabled={loading}><RefreshCw size={15} /> Refresh</GovButton>
    </>}>
        <GovState loading={loading && !data} error={error} onRetry={reload} />
        {data && !error && <>
            <div className="gov-summary-line"><span><strong>{data.open_report_count}</strong> currently open from <strong>{data.received_report_count}</strong> received reports</span><span><strong>{data.unlocated_report_count}</strong> without a recorded barangay</span><span>As of {formatDate(data.as_of)}</span></div>
            <GovTabs label="Decision views" items={insightTabs} value={active} onChange={v => change('insight', v)} />
            {active === 'queues' && <>
                <h2 className="gov-section-title">Where is work waiting?</h2><p className="gov-note">An older report in a review queue may need a routing or ownership check. Open a row to inspect those exact reports. Age is measured from submission, not entry into the current status.</p>
                <GovTable label="Open reports by current status" columns={reportColumns} rows={data.stages} rowKey={r => r.label} />
                <h2 className="gov-section-title">What is preventing progress?</h2><p className="gov-note">These are currently blocked work orders. The recorded reason helps the coordinator find the next person or dependency to follow up.</p>
                <GovTable label="Blocked work orders" rowKey={r => r.id} rows={data.blockers} emptyMessage="No blocked work orders in your scope" columns={[{ key: 'reference', label: 'Work order', render: r => <Link className="gov-record-link" to={r.url}>{r.reference}<small>{r.title}</small></Link> }, { key: 'reason', label: 'Recorded blocker', render: r => r.reason.replaceAll('_', ' ') }, { key: 'owner', label: 'Owner' }, { key: 'blocked_since', label: 'Blocked since', render: r => formatDate(r.blocked_since) }]} />
                <h2 className="gov-section-title">Which jobs need verification?</h2><p className="gov-note">A completion submission is awaiting a separate acceptance decision. Open the work record to review its evidence.</p>
                <GovTable label="Work awaiting completion review" rowKey={r => r.id} rows={data.verification} emptyMessage="No work awaiting verification" columns={[{ key: 'reference', label: 'Work order', render: r => <Link className="gov-record-link" to={r.url}>{r.reference}<small>{r.title}</small></Link> }, { key: 'owner', label: 'Work owner' }, { key: 'updated_at', label: 'Last record update', render: r => formatDate(r.updated_at) }]} />
            </>}
            {active === 'areas' && <><h2 className="gov-section-title">Where are related concerns being reported?</h2><p className="gov-note">Compare open report volume by recorded barangay. More reports can reflect greater reporting activity; volume alone does not establish danger or a recurring defect.</p><GovTable label="Open reports by area" columns={reportColumns} rows={data.areas} rowKey={r => r.label} /></>}
            {active === 'workload' && <><h2 className="gov-section-title">Who has open work?</h2><p className="gov-note">Compare assigned jobs and blocked jobs to identify a follow-up conversation. Counts do not measure staff capacity or productivity; availability and effort are not recorded.</p><GovTable label="Current work-order ownership" rowKey={r => r.owner} rows={data.workload} columns={[{ key: 'owner', label: 'Recorded owner' }, { key: 'active', label: 'Open jobs' }, { key: 'blocked', label: 'Blocked jobs' }, { key: 'work_order_ids', label: 'Records', render: r => <div className="gov-toolbar">{r.work_order_ids.map(id => <Link className="gov-text-button" key={id} to={`/gov/work-orders?wo=${id}`}>Work #{id}</Link>)}</div> }]} /></>}
            <p className="gov-note">{data.period_definition} Scope: {data.scope}. Historical backlog changes and repeated incidents require verified event history; they are not inferred here.</p>
        </>}
    </GovWorkspace>;
}
