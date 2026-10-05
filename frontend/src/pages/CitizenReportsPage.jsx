import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Clock3,
    FileImage,
    HelpCircle,
    History,
    Inbox,
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    Truck,
    Wrench,
    X,
    XCircle,
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import RequestInfoModal from '../components/modals/RequestInfoModal';
import AssignWorkOrderModal from '../components/modals/AssignWorkOrderModal';
import ApproveReportModal from '../components/modals/ApproveReportModal';
import { checkPermission } from '../utils/rbac_utils';
import { formatTicketId } from '../utils/reportWorkflow';
import { API_BASE_URL } from '../utils/apiBase';
import './citizen-reports.css';

const ACTIVE_STATUSES = ['all', 'unvalidated', 'unverified', 'pending', 'pending_approval', 'dispatched', 'in_progress', 'resolved', 'critical'];

const PULSELINE_STEPS = [
    { key: 'unverified', label: 'Received' },
    { key: 'pending_approval', label: 'Verified' },
    { key: 'dispatched', label: 'Assigned' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'resolved', label: 'Resolved' },
];

const readUser = () => {
    try {
        const raw = sessionStorage.getItem('pulso_user') || localStorage.getItem('pulso_user') || sessionStorage.getItem('user') || localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const humanize = (value, fallback = 'Not available') => {
    if (!value) return fallback;
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const reportId = (report) => {
    if (!report) return '#PUL-2026-0001';
    return formatTicketId(report.ticket_id, report.id, true);
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

const ageLabel = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Age unknown';
    const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes <= 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} d ago`;
};

const statusTone = (status) => {
    if (['dispatched', 'in_progress'].includes(status)) return 'progress';
    if (['unvalidated', 'unverified', 'pending_approval'].includes(status)) return 'attention';
    if (status === 'resolved') return 'resolved';
    if (status === 'critical') return 'critical';
    if (status === 'pending') return 'pending';
    return 'neutral';
};

const StatusLabel = ({ status }) => (
    <span className={`citizen-reports-status is-${statusTone(status)}`}>
        <span aria-hidden="true" />
        {humanize(status, 'Unknown')}
    </span>
);

const ReportSkeleton = () => (
    <div className="citizen-reports-skeleton" aria-hidden="true">
        <span /><span /><span />
    </div>
);

export default function CitizenReportsPage({ workspace }) {
    const prefersReducedMotion = useReducedMotion();
    const token = sessionStorage.getItem('pulso_token') || sessionStorage.getItem('token') || localStorage.getItem('pulso_token') || localStorage.getItem('token');
    const currentUser = readUser();
    const [params, setParams] = useSearchParams();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshTime, setRefreshTime] = useState(null);
    const [selectedDetail, setSelectedDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const reportRowRefs = useRef(new Map());
    const docketCloseRef = useRef(null);

    // Modal state
    const [requestInfoOpen, setRequestInfoOpen] = useState(false);
    const [assignWorkOrderOpen, setAssignWorkOrderOpen] = useState(false);
    const [approveReportOpen, setApproveReportOpen] = useState(false);

    const search = params.get('search') || '';
    const status = params.get('status') || 'all';
    const selectedId = Number(params.get('report')) || null;
    const [docketLayoutOpen, setDocketLayoutOpen] = useState(Boolean(selectedId));
    const canTriage = checkPermission(currentUser, 'ops', 'manage');
    const canApprove = ['dispatcher', 'asst_city_engineer', 'city_engineer', 'manager', 'system_admin'].includes(currentUser?.role);

    const docketMotion = prefersReducedMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { duration: 0.08 } },
            exit: { opacity: 0, transition: { duration: 0.08 } },
        }
        : {
            initial: { opacity: 0.96, x: 8 },
            animate: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
            },
            exit: {
                opacity: 0.96,
                x: 8,
                transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
            },
        };

    const updateParam = (key, value) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            if (!value || value === 'all') next.delete(key);
            else next.set(key, value);
            return next;
        }, { replace: true });
    };

    const closeReportDocket = useCallback(() => {
        const closingId = selectedId;
        setParams((current) => {
            const next = new URLSearchParams(current);
            next.delete('report');
            return next;
        }, { replace: true });
        window.requestAnimationFrame(() => reportRowRefs.current.get(closingId)?.focus());
    }, [selectedId, setParams]);

    useEffect(() => {
        if (selectedId) setDocketLayoutOpen(true);
    }, [selectedId]);

    const toggleReportDocket = (report) => {
        if (report.id === selectedId) {
            closeReportDocket();
            return;
        }
        setDocketLayoutOpen(true);
        updateParam('report', String(report.id));
    };

    const loadReports = async ({ background = false } = {}) => {
        if (!background) setLoading(true);
        setError('');
        try {
            const query = status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
            const response = await fetch(`${API_BASE_URL}/api/gov/reports${query}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(`Reports could not be loaded (${response.status}).`);
            const data = await response.json();
            const nextReports = Array.isArray(data) ? data : [];
            setReports(nextReports);
            setRefreshTime(new Date());

        } catch (reason) {
            setError(reason.message || 'Reports could not be loaded. Check the connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    useEffect(() => {
        if (!selectedId) {
            setSelectedDetail(null);
            setDetailLoading(false);
            return;
        }

        const controller = new AbortController();
        setDetailLoading(true);
        fetch(`${API_BASE_URL}/api/reports/${selectedId}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('The selected report details could not be loaded.');
                return response.json();
            })
            .then(setSelectedDetail)
            .catch((reason) => {
                if (reason.name !== 'AbortError') {
                    const fallback = reports.find((item) => item.id === selectedId) || null;
                    setSelectedDetail(fallback ? { ...fallback, detail_error: true } : null);
                }
            })
            .finally(() => setDetailLoading(false));

        return () => controller.abort();
    }, [selectedId, token, reports]);

    useEffect(() => {
        if (!selectedId) return undefined;
        const focusFrame = window.requestAnimationFrame(() => docketCloseRef.current?.focus());
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') closeReportDocket();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedId, closeReportDocket]);

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 5000);
    };

    const handleVerifyReport = async (report) => {
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
                showToast(`Report ${reportId(report)} verified and queued for dispatch.`);
                loadReports({ background: true });
            } else {
                showToast('Failed to verify report.');
            }
        } catch {
            showToast('Network error while verifying report.');
        }
    };

    const handleRequestInfoSubmit = async ({ reason, message }) => {
        showToast(`Information request sent to citizen: "${reason} - ${message.slice(0, 30)}..."`);
        if (selectedId) {
            loadReports({ background: true });
        }
    };

    const handleAssignWorkOrderSubmit = async (woData) => {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    report_id: woData.reportId,
                    title: woData.title,
                    assigned_to_id: woData.assigned_to_id,
                    priority: woData.priority,
                    notes: woData.reason,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.detail || `Work order creation failed (HTTP ${res.status})`);
            }
            showToast('Work order assigned to the selected field official.');
            loadReports({ background: true });
    };

    const visibleReports = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return reports;
        return reports.filter((report) => [
            reportId(report),
            report.ticket_id,
            report.title,
            report.description,
            report.barangay,
            report.location,
            report.location_string,
            report.status,
        ].some((value) => String(value || '').toLowerCase().includes(term)));
    }, [reports, search]);

    const selected = selectedDetail || reports.find((report) => report.id === selectedId) || null;
    const selectedLocation = selected?.location_string || selected?.location || selected?.barangay || 'Location not provided';

    // Calculate active pulseline step index
    const currentStepIndex = useMemo(() => {
        if (!selected) return 0;
        const st = selected.status;
        if (st === 'unverified' || st === 'unvalidated') return 0;
        if (st === 'pending' || st === 'pending_approval') return 1;
        if (st === 'dispatched') return 2;
        if (st === 'in_progress') return 3;
        if (st === 'resolved' || st === 'completed') return 4;
        return 1;
    }, [selected]);

    return (
        <div className="citizen-reports-page">
            <GovSidebar currentUser={currentUser} />
            <div className="citizen-reports-shell">
                <header className="citizen-reports-topbar">
                    <div className="flex flex-col text-left">
                        <GovBreadcrumb category="Citizen Services" current="Citizen Reports" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">Citizen reports</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Review incoming public reports and open authorized work in context.</p>
                    </div>
                    <div className="citizen-reports-topbar__actions">
                        {toastMessage && (
                            <div className="citizen-reports-toast-pill" role="status">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <span>{refreshTime ? `Updated ${ageLabel(refreshTime)}` : 'Waiting for data'}</span>
                        <ThemeToggle />
                        <button type="button" className="citizen-reports-icon-button" onClick={() => loadReports({ background: true })} aria-label="Refresh reports">
                            <RefreshCw size={17} aria-hidden="true" />
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </header>

                {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

                <main className={`citizen-reports-main${docketLayoutOpen ? ' is-docket-open' : ''}`}>
                    <Motion.section
                        layout
                        transition={{ layout: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
                        className="citizen-reports-queue"
                        aria-labelledby="citizen-report-queue-title"
                    >
                        <div className="citizen-reports-queue__heading">
                            <div>
                                <h2 id="citizen-report-queue-title">Incoming reports</h2>
                                <p>{loading ? 'Loading reports…' : `${visibleReports.length} ${visibleReports.length === 1 ? 'report' : 'reports'} in this view`}</p>
                            </div>
                            <span className="citizen-reports-scope">North Caloocan Division</span>
                        </div>

                        <div className="citizen-reports-filters">
                            <label className="citizen-reports-search">
                                <Search size={16} aria-hidden="true" />
                                <span className="sr-only">Search reports</span>
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => updateParam('search', event.target.value)}
                                    placeholder="Search ticket, issue, or location"
                                />
                            </label>
                            <label>
                                <span className="sr-only">Filter by status</span>
                                <select value={status} onChange={(event) => updateParam('status', event.target.value)}>
                                    {ACTIVE_STATUSES.map((value) => <option key={value} value={value}>{value === 'all' ? 'All statuses' : humanize(value)}</option>)}
                                </select>
                            </label>
                        </div>

                        <div className="citizen-reports-list" aria-busy={loading}>
                            {loading && <><ReportSkeleton /><ReportSkeleton /><ReportSkeleton /></>}

                            {!loading && error && (
                                <div className="citizen-reports-state is-error" role="alert">
                                    <AlertCircle size={24} aria-hidden="true" />
                                    <div><strong>Reports could not be loaded</strong><p>{error}</p></div>
                                    <button type="button" onClick={() => loadReports()}>Try again</button>
                                </div>
                            )}

                            {!loading && !error && reports.length === 0 && (
                                <div className="citizen-reports-state">
                                    <Inbox size={24} aria-hidden="true" />
                                    <div><strong>No active reports</strong><p>There are no reports in this status view.</p></div>
                                </div>
                            )}

                            {!loading && !error && reports.length > 0 && visibleReports.length === 0 && (
                                <div className="citizen-reports-state">
                                    <Search size={24} aria-hidden="true" />
                                    <div><strong>No matching reports</strong><p>Change the search or clear the status filter.</p></div>
                                    <button type="button" onClick={() => setParams({}, { replace: true })}>Clear filters</button>
                                </div>
                            )}

                            {!loading && !error && visibleReports.map((report) => {
                                const active = report.id === selectedId;
                                return (
                                    <button
                                        type="button"
                                        key={report.id}
                                        ref={(node) => {
                                            if (node) reportRowRefs.current.set(report.id, node);
                                            else reportRowRefs.current.delete(report.id);
                                        }}
                                        className={`citizen-report-row${active ? ' is-selected' : ''}`}
                                        onClick={() => toggleReportDocket(report)}
                                        aria-pressed={active}
                                        aria-expanded={active}
                                        aria-controls="citizen-report-docket"
                                    >
                                        <span className="citizen-report-row__signal" aria-hidden="true" />
                                        <span className="citizen-report-row__id">{reportId(report)}</span>
                                        <span className="citizen-report-row__issue">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <strong>{humanize(report.title, 'Infrastructure report')}</strong>
                                                {(report.reporter_type === 'guest' || !report.resident_id) && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                                        Guest Submission
                                                    </span>
                                                )}
                                            </div>
                                            <small>{report.location || report.barangay || 'Location not provided'}</small>
                                        </span>
                                        <StatusLabel status={report.status} />
                                        <span className="citizen-report-row__age"><Clock3 size={14} aria-hidden="true" />{ageLabel(report.created_at)}</span>
                                        <ArrowRight className="citizen-report-row__arrow" size={16} aria-hidden="true" />
                                    </button>
                                );
                            })}
                        </div>
                    </Motion.section>

                    <AnimatePresence initial={false} onExitComplete={() => setDocketLayoutOpen(false)}>
                        {selectedId && (
                        <Motion.article
                            id="citizen-report-docket"
                            key="citizen-report-docket"
                            className="citizen-report-docket"
                            role="dialog"
                            aria-modal="false"
                            aria-labelledby={selected ? 'citizen-report-docket-title' : undefined}
                            aria-live="polite"
                            initial={docketMotion.initial}
                            animate={docketMotion.animate}
                            exit={docketMotion.exit}
                        >
                            {detailLoading && !selected && <div className="citizen-report-docket__loading"><ReportSkeleton /><ReportSkeleton /></div>}

                            {selected && (
                            <>
                                <header className="citizen-report-docket__header">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="citizen-report-docket__id">{reportId(selected)}</span>
                                            {(selected.reporter_type === 'guest' || !selected.resident_id) ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                                    Guest Submission (Unverified)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                    Verified Resident
                                                </span>
                                            )}
                                        </div>
                                        <h2 id="citizen-report-docket-title">{humanize(selected.category || selected.title, 'Infrastructure report')}</h2>
                                        <p>{formatDateTime(selected.created_at)} · {selected.location_barangay || selected.barangay || 'Barangay not provided'}</p>
                                    </div>
                                    <div className="citizen-report-docket__tools">
                                        <StatusLabel status={selected.status} />
                                        <button
                                            ref={docketCloseRef}
                                            type="button"
                                            className="citizen-report-docket__close"
                                            onClick={closeReportDocket}
                                            aria-label="Close report details"
                                            title="Close report details"
                                        >
                                            <X size={18} aria-hidden="true" />
                                        </button>
                                    </div>
                                </header>

                                {/* 2px Pulseline Lifecycle Visualizer (Image 1 Panel 5) */}
                                <div className="citizen-report-pulseline" aria-label="Pulseline lifecycle progress">
                                    <div className="citizen-pulseline-track">
                                        <div
                                            className="citizen-pulseline-bar"
                                            style={{ width: `${(currentStepIndex / (PULSELINE_STEPS.length - 1)) * 100}%` }}
                                        />
                                    </div>
                                    <div className="citizen-pulseline-steps">
                                        {PULSELINE_STEPS.map((step, idx) => {
                                            const isDone = idx <= currentStepIndex;
                                            const isCurrent = idx === currentStepIndex;
                                            return (
                                                <div
                                                    key={step.key}
                                                    className={`citizen-pulseline-node${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
                                                >
                                                    <span className="citizen-pulseline-dot" />
                                                    <span className="citizen-pulseline-label">{step.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {selected.detail_error && (
                                    <div className="citizen-report-banner" role="status">
                                        <AlertCircle size={17} aria-hidden="true" />
                                        Some report details are unavailable. Queue information is shown below.
                                    </div>
                                )}

                                <section className="citizen-report-docket__section">
                                    <h3>Report details</h3>
                                    <p className="citizen-report-description">{selected.description || 'No description was provided with this report.'}</p>
                                </section>

                                <section className="citizen-report-docket__section">
                                    <h3>Field photo evidence</h3>
                                    {selected.image_url ? (
                                        <figure className="citizen-report-evidence">
                                            <img src={selected.image_url} alt={`Evidence attached to ${reportId(selected)} at ${selectedLocation}`} />
                                            <figcaption><FileImage size={15} aria-hidden="true" />Photo evidence · {formatDateTime(selected.created_at)} · True-color</figcaption>
                                        </figure>
                                    ) : (
                                        <div className="citizen-report-empty-evidence">
                                            <FileImage size={22} aria-hidden="true" />
                                            No evidence image attached to this report.
                                        </div>
                                    )}
                                </section>

                                <section className="citizen-report-docket__section citizen-report-location">
                                    <h3>Location</h3>
                                    <div><MapPin size={19} aria-hidden="true" /><span><strong>{selectedLocation}</strong><small>{selected.location_barangay || selected.barangay || 'Barangay not provided'}</small></span></div>
                                    {selected.location_lat != null && selected.location_lng != null && (
                                        <code>{Number(selected.location_lat).toFixed(5)}, {Number(selected.location_lng).toFixed(5)}</code>
                                    )}
                                </section>

                                {selected.ai_summary && (
                                    <section className="citizen-report-docket__section citizen-report-advisory">
                                        <h3><Sparkles size={17} aria-hidden="true" />Advisory AI suggestion</h3>
                                        <p>{selected.ai_summary}</p>
                                        <small>Automated suggestion. Staff review remains required before any decision.</small>
                                    </section>
                                )}

                                <section className="citizen-report-docket__section citizen-report-history">
                                    <h3>Record history</h3>
                                    <div><span aria-hidden="true" /><p><strong>Report submitted</strong><small>{formatDateTime(selected.created_at)}</small></p></div>
                                    {selected.updated_at && <div><span aria-hidden="true" /><p><strong>Record updated</strong><small>{formatDateTime(selected.updated_at)}</small></p></div>}
                                </section>

                                <footer className="citizen-report-docket__actions">
                                    <button
                                        type="button"
                                        className="citizen-report-secondary-action"
                                        onClick={() => setRequestInfoOpen(true)}
                                    >
                                        <HelpCircle size={15} aria-hidden="true" />
                                        Request info
                                    </button>

                                    {canTriage && (
                                        <>
                                            {['dispatcher', 'manager'].includes(currentUser?.role) && ['pending', 'unverified'].includes(selected.status) && (
                                                <button
                                                    type="button"
                                                    className="citizen-report-secondary-action"
                                                    onClick={() => handleVerifyReport(selected)}
                                                >
                                                    <CheckCircle2 size={15} aria-hidden="true" />
                                                    Verify report
                                                </button>
                                            )}
                                            {canApprove && selected.status === 'pending_approval' && <button
                                                type="button" className="citizen-report-primary-action" onClick={() => setApproveReportOpen(true)}
                                            ><ShieldCheck size={15} aria-hidden="true" />Approve for work</button>}
                                            {selected.status === 'approved_internal' && <button
                                                type="button"
                                                className="citizen-report-primary-action"
                                                onClick={() => setAssignWorkOrderOpen(true)}
                                            >
                                                <Truck size={15} aria-hidden="true" />
                                                Assign work order
                                            </button>}
                                        </>
                                    )}

                                    <Link className="citizen-report-secondary-action" to="/gov/timeline">
                                        <History size={15} aria-hidden="true" />
                                        Timeline
                                    </Link>
                                </footer>
                            </>
                            )}
                        </Motion.article>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* Decision Modals */}
            <RequestInfoModal
                isOpen={requestInfoOpen}
                onClose={() => setRequestInfoOpen(false)}
                report={selected}
                onSubmit={handleRequestInfoSubmit}
            />

            <AssignWorkOrderModal
                isOpen={assignWorkOrderOpen}
                onClose={() => setAssignWorkOrderOpen(false)}
                report={selected}
                onSubmit={handleAssignWorkOrderSubmit}
            />
            {approveReportOpen && selected && <ApproveReportModal
                report={selected}
                onClose={() => setApproveReportOpen(false)}
                onApproved={() => { showToast('Report approved for field work.'); loadReports({ background: true }); }}
            />}
        </div>
    );
}
