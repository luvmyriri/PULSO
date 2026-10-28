import { RefreshCw, Shield, Download } from 'lucide-react';
import { downloadCsv } from '../utils/csvExport';
import { buildOverviewCsv } from '../utils/overviewCsv';
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
    const complete = data?.relationships && data?.totals && data?.report_intake && data?.priorities && data?.priority_work && Array.isArray(data?.areas) && Array.isArray(data?.work_stages);
    const exportReady = Boolean(complete && !error && sourceErrors.length===0 && data?.as_of);

    function exportCsv(kind, options) {
        if (!exportReady) return;
        const { headers, rows, filename } = buildOverviewCsv(data, kind, options);
        downloadCsv(headers, rows, filename);
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
            <GovButton onClick={() => exportCsv('summary')} disabled={!exportReady || loading} title={exportReady ? 'Export all overview values as CSV' : 'Complete, current records are required for export'}><Download size={15} aria-hidden="true"/> Export all CSV</GovButton>
            <GovButton onClick={reload} disabled={loading}><RefreshCw size={15} aria-hidden="true"/> Refresh overview</GovButton>
        </>}
    >
        <GovState loading={loading && !data} error={error} onRetry={reload}/>
        {(!complete || error) && <GovAssistantSlot />}
        {!error && data && <>
            {sourceErrors.length > 0 && <div className="gov-bi-source-error" role="alert"><strong>Some supporting records could not be loaded.</strong><span>{sourceErrors.join(' ')}</span><button type="button" onClick={reload}>Retry overview</button></div>}
            {complete
                ? <GovBiDashboard data={data} onExport={exportReady ? exportCsv : null}/>
                : <div className="gov-bi-source-error" role="alert"><strong>Dashboard data is incomplete.</strong><span>Refresh to load the report and work-order relationships.</span><button type="button" onClick={reload}>Retry overview</button></div>}
        </>}
    </GovWorkspace>;
}
