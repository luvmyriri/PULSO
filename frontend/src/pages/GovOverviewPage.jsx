import { RefreshCw, Shield, Download } from 'lucide-react';
import { downloadCsv } from '../utils/csvExport';
import { GovWorkspace, GovButton, GovState } from '../components/government/GovWorkspace';
import GovBiDashboard from '../components/GovBiDashboard';
import { GovAssistantSlot } from '../components/government/GovAssistantHost';
import { useGovernmentData } from '../utils/governmentApi';
import { getAuthUser } from '../utils/authSession';

export default function GovOverviewPage() {
    const user = getAuthUser();
    const savedFirstName = (user?.first_name || user?.firstName || '').trim();
    const savedName = (user?.full_name || user?.name || '').trim();
    const greetingName = savedFirstName || savedName.replace(/^(?:engr|atty|dr|mr|mrs|ms)\.?\s+/i, '').split(/\s+/)[0];
    const { data, loading, error, reload, fetchedAt } = useGovernmentData('/api/gov/overview');
    const asOf = data?.as_of ? new Date(data.as_of) : fetchedAt;
    const asOfLabel = asOf && !Number.isNaN(asOf.getTime())
        ? asOf.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' })
        : null;
    const sourceErrors = Object.values(data?.source_errors || {});
    const complete = data?.relationships && data?.report_intake && data?.priorities && data?.priority_work && Array.isArray(data?.areas) && Array.isArray(data?.work_stages);

    function handleExportCSV() {
        if (!data) return;
        const headers = [
            'Record Type',
            'Category / Area',
            'Total Count',
            'With Current Work',
            'Without Current Work'
        ];
        const rows = [];
        if (data.relationships) {
            rows.push(['Metric', 'Open Reports', data.relationships.open_reports ?? '', '', '']);
            rows.push(['Metric', 'Current Work Orders', data.relationships.current_work_orders ?? '', '', '']);
            rows.push(['Metric', 'Reports With Work', data.relationships.reports_with_current_work ?? '', '', '']);
            rows.push(['Metric', 'Reports Without Work', data.relationships.reports_without_current_work ?? '', '', '']);
        }
        if (data.totals) {
            rows.push(['Metric', 'Needs Triage or Owner', data.totals.unreviewed_reports ?? '', '', '']);
            rows.push(['Metric', 'Urgent Reports (P4-P5)', data.totals.urgent_reports ?? '', '', '']);
            rows.push(['Metric', 'Blocked Work Orders', data.totals.blocked_work_orders ?? '', '', '']);
        }
        if (Array.isArray(data.areas)) {
            data.areas.forEach(a => {
                rows.push(['Barangay Demand', a.barangay || '', a.count ?? 0, a.with_work_count ?? 0, a.without_work_count ?? 0]);
            });
        }
        if (data.priorities && data.priority_work) {
            Object.entries(data.priorities).forEach(([k, count]) => {
                const work = data.priority_work[k] || {};
                rows.push(['Priority Workload', k.toUpperCase(), count ?? 0, work.with_work ?? 0, work.without_work ?? 0]);
            });
        }
        const dateStr = new Date().toISOString().slice(0, 10);
        downloadCsv(headers, rows, `PULSO_Operations_Overview_Summary_${dateStr}`);
    }

    return <GovWorkspace
        className="gov-overview-workspace"
        title="Operations overview"
        description="Report demand, current work, and queues that need a decision across your authorized scope."
        actions={<>
            <div className="gov-overview-welcome">
                <p className="gov-overview-welcome__greeting">{greetingName && !greetingName.includes('@') ? `Hello, ${greetingName}.` : 'Hello.'}</p>
                <div className="gov-overview-welcome__context">
                    <span><Shield size={13} aria-hidden="true"/>{data?.scope || 'Loading scope…'}</span>
                    <span>{asOfLabel ? `Records as of ${asOfLabel}` : 'Waiting for source time'}</span>
                </div>
            </div>
            <span className="gov-overview-welcome__city" aria-hidden="true"/>
            <GovButton onClick={handleExportCSV} disabled={loading || !data} title="Export operations overview summary as CSV"><Download size={15} aria-hidden="true"/> Export CSV</GovButton>
            <GovButton onClick={reload} disabled={loading}><RefreshCw size={15} aria-hidden="true"/> Refresh overview</GovButton>
        </>}
    >
        <GovState loading={loading && !data} error={error} onRetry={reload}/>
        {(!complete || error) && <GovAssistantSlot />}
        {!error && data && <>
            {sourceErrors.length > 0 && <div className="gov-bi-source-error" role="alert"><strong>Some supporting records could not be loaded.</strong><span>{sourceErrors.join(' ')}</span><button type="button" onClick={reload}>Retry overview</button></div>}
            {complete
                ? <GovBiDashboard data={data}/>
                : <div className="gov-bi-source-error" role="alert"><strong>Dashboard data is incomplete.</strong><span>Refresh to load the report and work-order relationships.</span><button type="button" onClick={reload}>Retry overview</button></div>}
        </>}
    </GovWorkspace>;
}
