import { useState } from 'react';
import { BarChart3, Building2, Clock3, RefreshCw, Shield } from 'lucide-react';
import { exportOverviewCSV, exportOverviewXLSX } from '../utils/overviewCsv';
import { GovWorkspace, GovButton, GovState } from '../components/government/GovWorkspace';
import GovBiDashboard, { OverviewLoading, OverviewSearch } from '../components/GovBiDashboard';
import { GovAssistantSlot } from '../components/government/GovAssistantHost';
import { GOV_ROLES } from '../components/ProtectedRoute';
import { useGovernmentData } from '../utils/governmentApi';
import { getAuthUser } from '../utils/authSession';

export default function GovOverviewPage() {
    const user = getAuthUser();
    const savedFirstName = (user?.first_name || user?.firstName || '').trim();
    const savedName = (user?.full_name || user?.name || '').trim();
    const greetingName = savedFirstName || savedName.replace(/^(?:engr|atty|dr|mr|mrs|ms)\.?\s+/i, '').split(/\s+/)[0];
    const { data, loading, error, reload, fetchedAt } = useGovernmentData('/api/gov/overview');
    const navigation = useGovernmentData('/api/gov/navigation');
    const modules = navigation.error ? [] : navigation.data?.modules ?? [];
    const asOf = data?.as_of ? new Date(data.as_of) : fetchedAt;
    const asOfLabel = asOf && !Number.isNaN(asOf.getTime())
        ? asOf.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' })
        : null;
    const sourceErrors = Object.values(data?.source_errors || {});
    const complete = data?.relationships && data?.totals && data?.report_intake && data?.priorities && data?.priority_work && Array.isArray(data?.areas) && Array.isArray(data?.work_stages);
    const exportReady = Boolean(complete && !error && sourceErrors.length === 0 && data?.as_of);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    async function handleExport(kind, format = 'xlsx', options) {
        if (!exportReady || isExporting) return;
        setIsExporting(true);
        setExportError('');
        try {
            if (format === 'csv') exportOverviewCSV(data, kind, options);
            else await exportOverviewXLSX(data, kind, options);
        } catch (err) {
            console.error(`Failed to export overview ${format}:`, err);
            setExportError(`The ${format === 'csv' ? 'CSV' : 'Excel'} download could not be prepared. Try again.`);
        } finally {
            setIsExporting(false);
        }
    }

    return <GovWorkspace
        className="gov-overview-workspace"
        title="Operations overview"
        description="Reports, work orders, infrastructure, and service performance across your scope."
        headingIcon={<span className="gov-overview-title-icon" aria-hidden="true"><BarChart3 size={23}/></span>}
        sidebarDecoration={<div className="gov-overview-sidebar-art" aria-hidden="true"><img src="/caloocan-skyline-illustration.png" alt="" width="238" height="80"/></div>}
        headerActions={<div className="gov-overview-controls">
            {complete && !error && <OverviewSearch canViewDemand={modules.includes('reports')}/>}
            <GovButton onClick={reload} disabled={loading}><RefreshCw size={14} aria-hidden="true"/>{loading && data ? 'Refreshing…' : 'Refresh'}</GovButton>
        </div>}
    >
        <section className="gov-overview-welcome" aria-label="Overview context">
            <div className="gov-overview-welcome__copy">
                <span className="gov-overview-welcome__mark" aria-hidden="true"><Building2 size={24}/></span>
                <div>
                    <h2>{greetingName && !greetingName.includes('@') ? `Hello, ${greetingName}.` : 'Hello.'}</h2>
                    <p>Here’s what’s in motion across city engineering.</p>
                </div>
            </div>
            <div className="gov-overview-welcome__context">
                <span><Shield size={13} aria-hidden="true"/>{!error && data?.scope || (loading ? 'Checking scope…' : 'Scope unavailable')}</span>
                <span><Clock3 size={13} aria-hidden="true"/>{!error && asOfLabel ? `As of ${asOfLabel}` : 'Source time unavailable'}</span>
            </div>
        </section>
        {loading && !data && <OverviewLoading/>}
        {loading && data && <p className="sr-only" role="status">Refreshing overview</p>}
        <GovState error={error} onRetry={reload}/>
        {exportError && <p className="gov-bi-source-error" role="alert">{exportError}</p>}
        {(!complete || error) && <GovAssistantSlot />}
        {!error && data && <>
            {sourceErrors.length > 0 && <div className="gov-bi-source-error" role="alert"><strong>Some supporting records could not be loaded.</strong><span>{sourceErrors.join(' ')}</span><button type="button" onClick={reload}>Retry overview</button></div>}
            {complete
                ? <GovBiDashboard data={data} modules={modules} onExport={exportReady && !loading && !isExporting ? handleExport : null} showAssistant={GOV_ROLES.includes(user?.role)}/>
                : <div className="gov-bi-source-error" role="alert"><strong>Dashboard data is incomplete.</strong><span>Refresh to load the report and work-order relationships.</span><button type="button" onClick={reload}>Retry overview</button></div>}
        </>}
    </GovWorkspace>;
}
