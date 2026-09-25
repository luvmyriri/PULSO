import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    Clock3,
    FileImage,
    HelpCircle,
    History,
    MapPin,
    ShieldCheck,
    Truck,
    Wrench,
    ExternalLink,
    Send,
    User,
    Calendar,
    ChevronRight,
    Tag,
    AlertTriangle
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import RequestInfoModal from '../components/modals/RequestInfoModal';
import AssignWorkOrderModal from '../components/modals/AssignWorkOrderModal';
import { checkPermission } from '../utils/rbac_utils';
import { formatTicketId } from '../utils/reportWorkflow';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import './citizen-reports.css';

const PULSELINE_STEPS = [
    { key: 'unverified', label: 'Received' },
    { key: 'pending_approval', label: 'Verified' },
    { key: 'dispatched', label: 'Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
];

const humanize = (value, fallback = 'Not available') => {
    if (!value) return fallback;
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDateTime = (value) => {
    if (!value) return 'Time not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Time not available';
    return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

export default function GovReportDetailPage() {
    const { reportId } = useParams();
    const navigate = useNavigate();
    const token = getAuthToken();
    const [user] = useState(() => getAuthUser());

    const [report, setReport] = useState(null);
    const [docketData, setDocketData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);

    const canVerify = checkPermission(user, 'verify_report');
    const canAssign = checkPermission(user, 'assign_work_order');
    const canRequestInfo = checkPermission(user, 'request_info');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 5000);
    };

    const loadReportDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentToken = getAuthToken();
            const authHeaders = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};

            // First load standard report data
            const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
                headers: authHeaders
            });
            if (!res.ok) throw new Error('Report could not be retrieved from the server.');
            const data = await res.json();
            setReport(data);

            // Attempt to load extended docket metadata
            try {
                const docketRes = await fetch(`${API_BASE_URL}/api/gov/reports/${reportId}/docket`, {
                    headers: authHeaders
                });
                if (docketRes.ok) {
                    const dData = await docketRes.json();
                    setDocketData(dData);
                }
            } catch {
                // Extended docket endpoint optional fallback
            }
        } catch (err) {
            setError(err.message || 'Error loading report details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReportDetails();
    }, [reportId]);

    const handleVerifyReport = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/${report.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: 'pending_approval' }),
            });
            if (res.ok) {
                showToast(`Report ${report.ticket_id || report.id} verified.`);
                loadReportDetails();
            } else {
                showToast('Failed to verify report.');
            }
        } catch {
            showToast('Network error while verifying report.');
        }
    };

    const handleRequestInfoSubmit = async ({ reason, message }) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/reports/${report.id}/request-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reason, message }),
            });
            if (res.ok) {
                showToast(`Information request dispatched to citizen.`);
                loadReportDetails();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || 'Failed to dispatch information request.');
            }
        } catch {
            showToast('Network error while requesting information.');
        }
    };

    const handleAssignWorkOrderSubmit = async (woData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    report_id: report.id,
                    title: woData.title,
                    priority: woData.priority,
                    notes: `${woData.reason} | Team: ${woData.team}`,
                }),
            });
            if (res.ok) {
                showToast(`Work order successfully dispatched to ${woData.team}.`);
                loadReportDetails();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || 'Failed to dispatch work order.');
            }
        } catch {
            showToast('Network error while assigning work order.');
        }
    };

    const currentStepIndex = (() => {
        if (!report) return 0;
        const st = report.status;
        if (st === 'unverified' || st === 'unvalidated') return 0;
        if (st === 'pending' || st === 'pending_approval') return 1;
        if (st === 'dispatched') return 2;
        if (st === 'in_progress') return 3;
        if (st === 'resolved' || st === 'completed') return 4;
        return 1;
    })();

    const displayTicket = report ? formatTicketId(report.ticket_id, report.id, true) : '';

    return (
        <div className="citizen-reports-page">
            <GovSidebar />
            <main className="citizen-reports-main" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 2rem' }}>
                {toastMessage && (
                    <div className="citizen-reports-toast" role="status">
                        <CheckCircle2 size={16} aria-hidden="true" />
                        <span>{toastMessage}</span>
                    </div>
                )}

                {/* Back navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn-back"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.875rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            background: 'var(--bg-card, #ffffff)',
                            color: 'var(--text-primary, #0f172a)',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        <ArrowLeft size={16} aria-hidden="true" />
                        <span>Back to Reports Queue</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <GovNotificationDropdown />
                        <GovUserDropdown />
                    </div>
                </div>

                {loading && (
                    <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
                        <Clock3 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
                        <p>Loading authoritative docket for {displayTicket}...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="citizen-reports-state is-error" role="alert" style={{ margin: '2rem 0' }}>
                        <AlertCircle size={24} aria-hidden="true" />
                        <div>
                            <strong>Unable to load report docket</strong>
                            <p>{error}</p>
                        </div>
                        <button type="button" onClick={loadReportDetails} style={{ marginTop: '0.75rem' }}>Try again</button>
                    </div>
                )}

                {!loading && report && (
                    <div className="gov-report-detail-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem' }}>
                        {/* Main docket column */}
                        <div className="gov-report-detail-primary" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Header Card */}
                            <section style={{
                                background: 'var(--bg-card, #ffffff)',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                borderRadius: '8px',
                                padding: '1.75rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <div className="mb-2">
                                            <GovBreadcrumb items={[
                                                { label: 'Home', to: '/gov/dashboard' },
                                                { label: 'Citizen Services', to: '/gov/reports' },
                                                { label: 'Reports', to: '/gov/reports' },
                                                { label: `Report #${displayTicket}` }
                                            ]} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontFamily: 'monospace',
                                                fontWeight: '600',
                                                padding: '0.125rem 0.5rem',
                                                borderRadius: '4px',
                                                background: 'var(--bg-badge, #f1f5f9)',
                                                color: 'var(--text-secondary, #475569)'
                                            }}>
                                                {displayTicket}
                                            </span>
                                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #64748b)' }}>
                                                {formatDateTime(report.created_at)}
                                            </span>
                                        </div>
                                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">
                                            {humanize(report.category || report.title, 'Infrastructure Incident')}
                                        </h1>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.5rem' }}>
                                            <MapPin size={15} style={{ color: 'var(--accent-gov, #0284c7)' }} />
                                            {report.location_string || report.location || report.barangay || 'Caloocan City'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            background: report.status === 'resolved' ? '#dcfce7' : report.status === 'critical' ? '#fee2e2' : '#e0f2fe',
                                            color: report.status === 'resolved' ? '#166534' : report.status === 'critical' ? '#991b1b' : '#0369a1',
                                            border: '1px solid currentColor'
                                        }}>
                                            {humanize(report.status)}
                                        </span>
                                        {report.urgency && (
                                            <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#b91c1c' }}>
                                                Urgency: {humanize(report.urgency)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Pulseline Visualizer */}
                                <div className="citizen-report-pulseline" style={{ margin: '1.5rem 0 0.5rem' }}>
                                    <div className="citizen-pulseline-track">
                                        <div className="citizen-pulseline-bar" style={{ width: `${(currentStepIndex / (PULSELINE_STEPS.length - 1)) * 100}%` }} />
                                    </div>
                                    <div className="citizen-pulseline-steps">
                                        {PULSELINE_STEPS.map((step, idx) => {
                                            const isDone = idx <= currentStepIndex;
                                            const isCurrent = idx === currentStepIndex;
                                            return (
                                                <div key={step.key} className={`citizen-pulseline-node${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}>
                                                    <span className="citizen-pulseline-dot" />
                                                    <span className="citizen-pulseline-label">{step.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>

                            {/* Description and Observations */}
                            <section style={{
                                background: 'var(--bg-card, #ffffff)',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                borderRadius: '8px',
                                padding: '1.5rem',
                            }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary, #0f172a)', marginBottom: '0.75rem' }}>
                                    Citizen Description
                                </h2>
                                <p style={{ fontSize: '0.9375rem', lineHeight: '1.6', color: 'var(--text-secondary, #334155)', margin: 0 }}>
                                    {report.description || 'No detailed narrative description provided.'}
                                </p>
                            </section>

                            {/* Field Photo Evidence Aperture */}
                            <section style={{
                                background: 'var(--bg-card, #ffffff)',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                borderRadius: '8px',
                                padding: '1.5rem',
                            }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary, #0f172a)', marginBottom: '0.75rem' }}>
                                    Field Evidence Aperture (True-Color)
                                </h2>
                                {report.image_url ? (
                                    <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)' }}>
                                        <img
                                            src={report.image_url}
                                            alt={`Evidence for ${displayTicket}`}
                                            style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }}
                                        />
                                        <div style={{
                                            background: 'var(--bg-muted, #f8fafc)',
                                            padding: '0.75rem 1rem',
                                            fontSize: '0.8125rem',
                                            color: 'var(--text-secondary, #64748b)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            borderTop: '1px solid var(--border-color, #e2e8f0)'
                                        }}>
                                            <span>Captured: {formatDateTime(report.created_at)}</span>
                                            <span>Format: True-color Municipal Field Record</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '2.5rem 1rem',
                                        textAlign: 'center',
                                        background: 'var(--bg-muted, #f8fafc)',
                                        border: '1px dashed var(--border-color, #cbd5e1)',
                                        borderRadius: '6px',
                                        color: 'var(--text-secondary, #64748b)'
                                    }}>
                                        <FileImage size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                                        <p style={{ margin: 0, fontSize: '0.875rem' }}>No photographic evidence uploaded with this report.</p>
                                    </div>
                                )}
                            </section>

                            {/* Connected Work Orders / Inspections */}
                            {docketData && docketData.work_orders && docketData.work_orders.length > 0 && (
                                <section style={{
                                    background: 'var(--bg-card, #ffffff)',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    borderRadius: '8px',
                                    padding: '1.5rem',
                                }}>
                                    <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary, #0f172a)', marginBottom: '0.75rem' }}>
                                        Linked Work Orders & Execution
                                    </h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {docketData.work_orders.map((wo) => (
                                            <div key={wo.id} style={{
                                                padding: '0.875rem',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color, #e2e8f0)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <strong>WO-{wo.id}: {wo.title}</strong>
                                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.25rem' }}>
                                                        Assigned to: {wo.assigned_team || 'Maintenance Division'} · Priority: {wo.priority}
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '0.25rem 0.5rem', borderRadius: '4px', background: '#f1f5f9' }}>
                                                    {humanize(wo.status)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Sidebar details & actions column */}
                        <div className="gov-report-detail-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Action Bar */}
                            <section style={{
                                background: 'var(--bg-card, #ffffff)',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                borderRadius: '8px',
                                padding: '1.25rem',
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary, #64748b)', marginBottom: '1rem' }}>
                                    Authorized Actions
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                    {canVerify && (report.status === 'unverified' || report.status === 'unvalidated') && (
                                        <button
                                            type="button"
                                            onClick={handleVerifyReport}
                                            style={{
                                                padding: '0.625rem 1rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: 'var(--accent-gov, #0284c7)',
                                                color: '#ffffff',
                                                fontWeight: '600',
                                                fontSize: '0.875rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <ShieldCheck size={16} /> Verify & Triage Report
                                        </button>
                                    )}

                                    {canAssign && (
                                        <button
                                            type="button"
                                            onClick={() => setAssignModalOpen(true)}
                                            style={{
                                                padding: '0.625rem 1rem',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color, #e2e8f0)',
                                                background: 'var(--bg-surface, #f8fafc)',
                                                color: 'var(--text-primary, #0f172a)',
                                                fontWeight: '600',
                                                fontSize: '0.875rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <Wrench size={16} /> Dispatch Work Order
                                        </button>
                                    )}

                                    {canRequestInfo && (
                                        <button
                                            type="button"
                                            onClick={() => setRequestModalOpen(true)}
                                            style={{
                                                padding: '0.625rem 1rem',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color, #e2e8f0)',
                                                background: 'var(--bg-surface, #f8fafc)',
                                                color: 'var(--text-primary, #0f172a)',
                                                fontWeight: '600',
                                                fontSize: '0.875rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <HelpCircle size={16} /> Request Citizen Info
                                        </button>
                                    )}
                                </div>
                            </section>

                            {/* Location Context */}
                            <section style={{
                                background: 'var(--bg-card, #ffffff)',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                borderRadius: '8px',
                                padding: '1.25rem',
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary, #64748b)', marginBottom: '0.75rem' }}>
                                    Municipal Coordinates
                                </h3>
                                <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div>
                                        <span style={{ color: 'var(--text-secondary, #64748b)', display: 'block', fontSize: '0.75rem' }}>Barangay</span>
                                        <strong>{report.location_barangay || report.barangay || 'Barangay 176'}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--text-secondary, #64748b)', display: 'block', fontSize: '0.75rem' }}>Operational Sector</span>
                                        <strong>{report.sector || 'North Caloocan'}</strong>
                                    </div>
                                    {report.latitude && report.longitude && (
                                        <div>
                                            <span style={{ color: 'var(--text-secondary, #64748b)', display: 'block', fontSize: '0.75rem' }}>GPS Coordinates</span>
                                            <code style={{ fontSize: '0.8125rem' }}>{Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)}</code>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Immutable Audit Log */}
                            <section style={{
                                background: 'var(--bg-card, #ffffff)',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                borderRadius: '8px',
                                padding: '1.25rem',
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary, #64748b)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <History size={15} /> Audit Chronology
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '2px solid var(--border-color, #e2e8f0)', paddingLeft: '0.75rem', marginLeft: '0.25rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>{formatDateTime(report.created_at)}</span>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: '500' }}>Initial Report Submitted</div>
                                    </div>
                                    {report.updated_at && report.updated_at !== report.created_at && (
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>{formatDateTime(report.updated_at)}</span>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: '500' }}>Status updated to {humanize(report.status)}</div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <RequestInfoModal
                    isOpen={requestModalOpen}
                    onClose={() => setRequestModalOpen(false)}
                    onSubmit={handleRequestInfoSubmit}
                    reportId={report?.id}
                />

                <AssignWorkOrderModal
                    isOpen={assignModalOpen}
                    onClose={() => setAssignModalOpen(false)}
                    onSubmit={handleAssignWorkOrderSubmit}
                    report={report}
                />
            </main>
        </div>
    );
}
