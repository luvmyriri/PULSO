import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Clock3,
    ExternalLink,
    Filter,
    Inbox,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Truck,
    Wrench,
    X,
    Unlock,
    User,
    Calendar,
    FileImage
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import GovInspectionModal from '../components/modals/GovInspectionModal';
import GovBlockerModal from '../components/modals/GovBlockerModal';
import AssignWorkOrderModal from '../components/modals/AssignWorkOrderModal';
import WorkOrderCompletionModal from '../components/modals/WorkOrderCompletionModal';
import WorkOrderEvidence from '../components/WorkOrderEvidence';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import './work-orders.css';
import './citizen-reports.css';
import './records-workspace.css';
import './administration-workspace.css';

const WO_TABS = [
    { key: 'all', label: 'All orders' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'active', label: 'Active' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'completed_pending_review', label: 'Awaiting review' },
    { key: 'completed', label: 'Completed' },
];

const PULSELINE_WO_STEPS = [
    { key: 'assigned', label: 'Assigned' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'completed_pending_review', label: 'Inspection' },
    { key: 'completed', label: 'Completed' },
];

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem('pulso_user') || 'null');
    } catch {
        return null;
    }
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
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes <= 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const priorityTone = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'critical' || p === 'urgent' || p === 'high') return 'critical';
    if (p === 'medium') return 'pending';
    return 'progress';
};

const statusTone = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed' || s === 'resolved') return 'resolved';
    if (s === 'blocked') return 'critical';
    if (s === 'completed_pending_review' || s === 'awaiting_verification') return 'attention';
    if (s === 'in_progress') return 'progress';
    return 'neutral';
};

export default function WorkOrdersPage({ workspace }) {
    const token = getAuthToken();
    const currentUser = getAuthUser() || readUser();
    const [params, setParams] = useSearchParams();
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [refreshTime, setRefreshTime] = useState(new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }));
    const [toastMessage, setToastMessage] = useState(null);

    // Modals
    const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
    const [blockerModalOpen, setBlockerModalOpen] = useState(false);
    const [isResolvingBlocker, setIsResolvingBlocker] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [completionModalOpen, setCompletionModalOpen] = useState(false);

    const activeTab = params.get('tab') || 'all';
    const searchQuery = params.get('search') || '';
    const selectedWoId = Number(params.get('wo')) || null;

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 5000);
    };

    const fetchWorkOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentToken = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders`, {
                headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
            });
            if (!res.ok) {
                throw new Error(`Failed to load work orders from server (HTTP ${res.status})`);
            }
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error('Work order response is invalid');
            setWorkOrders(data);
            setRefreshTime(new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }));
        } catch (err) {
            setError(err.message || 'Unable to connect to Work Orders service.');
            setWorkOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateParam = (key, value) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            if (!value || value === 'all') next.delete(key);
            else next.set(key, value);
            return next;
        }, { replace: true });
    };

    const filteredOrders = useMemo(() => {
        return workOrders.filter((wo) => {
            if (activeTab === 'assigned' && wo.status !== 'assigned') return false;
            if (activeTab === 'active' && wo.status !== 'in_progress') return false;
            if (activeTab === 'blocked' && wo.status !== 'blocked') return false;
            if (activeTab === 'completed_pending_review' && wo.status !== 'completed_pending_review' && wo.status !== 'awaiting_verification') return false;
            if (activeTab === 'completed' && wo.status !== 'completed' && wo.status !== 'resolved') return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const woNum = (wo.wo_number || `Order #${wo.id}`).toLowerCase();
                const title = (wo.title || '').toLowerCase();
                const brgy = (wo.barangay || wo.location_string || '').toLowerCase();
                const team = (wo.assigned_team || wo.assigned_to_name || '').toLowerCase();
                return woNum.includes(q) || title.includes(q) || brgy.includes(q) || team.includes(q);
            }
            return true;
        });
    }, [workOrders, activeTab, searchQuery]);

    const selectedWo = useMemo(() => {
        if (!selectedWoId) return null;
        return workOrders.find((w) => w.id === selectedWoId) || null;
    }, [workOrders, selectedWoId]);
    const canManageFieldWork = ['project_engineer', 'dispatcher', 'building_inspector', 'asst_city_engineer', 'city_engineer', 'manager', 'system_admin', 'foreman', 'construction_foreman', 'field_worker'].includes(currentUser?.role);
    const canDispatch = ['dispatcher', 'project_engineer', 'asst_city_engineer', 'city_engineer', 'manager', 'system_admin'].includes(currentUser?.role);
    const canInspect = ['building_inspector', 'architect', 'project_engineer', 'asst_city_engineer', 'city_engineer', 'manager', 'system_admin', 'electrical_inspector', 'mechanical_inspector'].includes(currentUser?.role);
    const completionEvidence = selectedWo?.updates?.find((update) => update.image_url)?.image_url;

    // Handle inspection verified callback
    const handleInspectionComplete = (data) => {
        showToast(`Inspection submitted: ${data.work_order?.status === 'completed' ? 'Certified Complete' : 'Rework Requested'}`);
        fetchWorkOrders();
    };

    // Handle blocker updated callback
    const handleBlockerUpdated = (data) => {
        showToast(`Work order status updated to ${data.status}`);
        fetchWorkOrders();
    };

    const startAssignedWork = async (wo) => {
        setActionError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/gov/agents/work-orders/${wo.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
                body: JSON.stringify({ status: 'in_progress' }),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.detail || `Could not start work (HTTP ${response.status})`);
            }
            showToast('Work order started.');
            fetchWorkOrders();
        } catch (cause) {
            setActionError(cause.message || 'Could not start work');
        }
    };

    const getStepIndex = (wo) => {
        if (!wo) return 0;
        const st = wo.status;
        if (st === 'assigned' || st === 'open') return 0;
        if (st === 'in_progress' || st === 'blocked') return 1;
        if (st === 'completed_pending_review' || st === 'awaiting_verification' || st === 'rework_required') return 2;
        if (st === 'completed' || st === 'resolved') return 3;
        return 1;
    };

    return (
        <div className="work-orders-page">
            <GovSidebar currentUser={currentUser} />
            <div className="work-orders-shell">
                <header className="min-h-[80px] py-3.5 sm:py-4 px-4 sm:px-6 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between relative z-50 gap-3 flex-nowrap">
                    <div className="min-w-0 pt-1 pb-0.5">
                        <GovBreadcrumb category="Field Operations" current="Work Orders & Execution" />
                        <div className="flex items-center gap-2 mt-0.5">
                            <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap">
                                Work Orders & Field Execution
                            </h1>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden xl:block mt-0.5 truncate max-w-lg">
                            Track assignments, report blockers, and perform independent inspection verification.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                        {toastMessage && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60 text-xs font-semibold" role="status">
                                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline">Last loaded {refreshTime}</span>
                        <ThemeToggle />
                        <button
                            type="button"
                            className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-[#ff6b00] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                            onClick={fetchWorkOrders}
                            aria-label="Refresh work orders"
                            title="Refresh work orders"
                        >
                            <RefreshCw size={15} />
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </header>

                {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

                {/* Tab Bar */}
                <div className="min-h-14 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between text-xs font-medium relative z-30 overflow-x-auto gap-4">
                    <div className="flex items-center gap-4 sm:gap-6">
                        {WO_TABS.map((tab) => {
                            const count =
                                tab.key === 'all'
                                    ? workOrders.length
                                    : workOrders.filter((w) => {
                                          if (tab.key === 'active') return w.status === 'in_progress';
                                          if (tab.key === 'completed_pending_review') return w.status === 'completed_pending_review' || w.status === 'awaiting_verification';
                                          if (tab.key === 'completed') return w.status === 'completed' || w.status === 'resolved';
                                          return w.status === tab.key;
                                      }).length;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    className={`py-3.5 px-0.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                                        isActive
                                            ? 'text-[#ff6b00] border-[#ff6b00]'
                                            : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                    onClick={() => {
                                        updateParam('tab', tab.key);
                                        updateParam('wo', null);
                                    }}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                                        isActive
                                            ? 'bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] border border-orange-200 dark:border-orange-800/60'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {canDispatch && <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#ff6b00] hover:bg-[#e65c00] rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                        onClick={() => setAssignModalOpen(true)}
                    >
                        <Plus size={15} /> <span>Create work order</span>
                    </button>}
                </div>

                {/* Main Split Area */}
                <main className="admin-layout-split flex flex-col xl:flex-row items-start w-full flex-1 overflow-y-auto p-4 sm:p-6 min-w-0" style={{ gap: 0 }}>
                    {/* Left Column: Orders Queue */}
                    <div className="citizen-reports-queue flex-1 min-w-0" style={{ height: 'auto', padding: 0 }}>
                        {/* Search & Filter Header */}
                        <div className="relative mb-3.5 max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Search size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by order ID, title, barangay, or assigned team..."
                                value={searchQuery}
                                onChange={(e) => updateParam('search', e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b00] transition-all shadow-xs"
                            />
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="citizen-reports-state is-error" style={{ marginBottom: '16px' }}>
                                <AlertCircle size={20} />
                                <div>
                                    <strong>Unable to load work orders</strong>
                                    <p>{error}</p>
                                    <button type="button" onClick={fetchWorkOrders} style={{ marginTop: '8px' }}>
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )}
                        {actionError && <div className="citizen-reports-state is-error" role="alert"><AlertCircle size={20} /><div><strong>Action could not be completed</strong><p>{actionError}</p></div></div>}

                        {/* Loading State */}
                        {loading && (
                            <div className="citizen-reports-list">
                                <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                                <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                                <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !error && filteredOrders.length === 0 && (
                            <div className="citizen-reports-state">
                                <Inbox size={28} />
                                <div>
                                    <strong>No work orders found</strong>
                                    <p>
                                        {searchQuery
                                            ? `No records matching "${searchQuery}" in this view.`
                                            : `No work orders currently categorized under "${activeTab}".`}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Work Orders List */}
                        {!loading && !error && filteredOrders.length > 0 && (
                            <div className="citizen-reports-list">
                                {filteredOrders.map((wo) => {
                                    const woNum = wo.wo_number || `Order #${wo.id}`;
                                    const isSelected = selectedWoId === wo.id;
                                    const sTone = statusTone(wo.status);

                                    return (
                                        <button
                                            key={wo.id}
                                            type="button"
                                            className={`citizen-report-row ${isSelected ? 'is-selected' : ''}`}
                                            aria-selected={isSelected}
                                            aria-expanded={isSelected}
                                            onClick={() => updateParam('wo', isSelected ? null : String(wo.id))}
                                        >
                                            <span className="citizen-report-row__signal" />
                                            <span className="citizen-report-row__id">{woNum}</span>
                                            <div className="citizen-report-row__issue">
                                                <strong>{wo.title}</strong>
                                                <small className="flex items-center gap-1">
                                                    <MapPin size={11} className="shrink-0 text-slate-400" />
                                                    <span>{wo.location_string || wo.barangay || 'Location unavailable'}</span>
                                                </small>
                                            </div>
                                            <span className={`citizen-reports-status is-${sTone}`}>
                                                <span aria-hidden="true" />
                                                {String(wo.status || 'unknown').replace(/_/g, ' ')}
                                            </span>
                                            <span className="citizen-report-row__age">
                                                <Clock3 size={11} className="shrink-0 text-slate-400" />
                                                <span>{ageLabel(wo.updated_at || wo.created_at)}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Docket Detail (Simultaneous Aperture Reveal) */}
                    <AnimatePresence initial={false}>
                        {selectedWo && (
                            <motion.aside
                                key="wo-docket-rail"
                                initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                animate={{ width: 440, opacity: 1, marginLeft: 20 }}
                                exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="admin-editor-rail shrink-0 overflow-hidden flex flex-col mt-4 xl:mt-0"
                                style={{ flexShrink: 0 }}
                            >
                                <div className="admin-editor-card w-[440px] max-w-[440px] box-border" style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                                    <div className="admin-editor-header flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="records-docket-signal-cut shrink-0" />
                                            <div className="min-w-0">
                                                <span className="citizen-report-docket__id block">
                                                    {selectedWo.wo_number || `Order #${selectedWo.id}`}
                                                </span>
                                                <h3 className="truncate m-0 text-[15px] font-bold text-slate-900 dark:text-white leading-tight">
                                                    {selectedWo.title}
                                                </h3>
                                                <span className="admin-editor-sub block text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Priority: <strong style={{ textTransform: 'capitalize' }}>{selectedWo.priority || 'Normal'}</strong>
                                                    {selectedWo.target_date && ` · Due: ${selectedWo.target_date}`}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateParam('wo', null)}
                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                            title="Close docket"
                                            aria-label="Close docket"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Instant inner transition when switching work orders */}
                                    <motion.div
                                        key={selectedWo.id}
                                        initial={{ opacity: 0.6 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.1 }}
                                        className="flex flex-col gap-4"
                                    >
                                        {/* 2px Pulseline Lifecycle */}
                                        <div className="citizen-report-pulseline" style={{ marginTop: '4px' }}>
                                            <div className="citizen-pulseline-track">
                                                <div
                                                    className="citizen-pulseline-bar"
                                                    style={{ width: `${(getStepIndex(selectedWo) / (PULSELINE_WO_STEPS.length - 1)) * 100}%` }}
                                                />
                                            </div>
                                            <div className="citizen-pulseline-steps">
                                                {PULSELINE_WO_STEPS.map((step, idx) => {
                                                    const currentIdx = getStepIndex(selectedWo);
                                                    const isDone = idx <= currentIdx;
                                                    const isCurrent = idx === currentIdx;
                                                    return (
                                                        <div
                                                            key={step.key}
                                                            className={`citizen-pulseline-node ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}
                                                        >
                                                            <div className="citizen-pulseline-dot" />
                                                            <span className="citizen-pulseline-label">{step.label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Blocker Alert Banner (if order is blocked) */}
                                        {selectedWo.status === 'blocked' && (
                                            <div style={{
                                                margin: '8px 0 0',
                                                padding: '12px 14px',
                                                background: 'rgba(217, 119, 6, 0.08)',
                                                border: '1px solid rgba(217, 119, 6, 0.3)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                    <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                                                    <div style={{ fontSize: '12px' }}>
                                                        <strong style={{ display: 'block', color: '#b45309', fontWeight: 600 }}>
                                                            Work Order Blocked: {selectedWo.blocker_reason || selectedWo.blocker || 'Operational Impediment'}
                                                        </strong>
                                                        <p style={{ margin: '2px 0 0', color: 'var(--gov-text-secondary)' }}>
                                                            {selectedWo.blocker_notes || selectedWo.blocker_plan || 'Awaiting clearance to resume.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {(canDispatch || selectedWo.assigned_to_id === currentUser?.id) && <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsResolvingBlocker(true);
                                                        setBlockerModalOpen(true);
                                                    }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        background: '#d97706',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    Clear Blocker
                                                </button>}
                                            </div>
                                        )}

                                        {/* Location Section */}
                                        <div className="citizen-report-docket__section citizen-report-location">
                                            <h3>Location Context</h3>
                                            <div>
                                                <MapPin size={16} />
                                                <span>
                                                    <strong>{selectedWo.location_string || selectedWo.barangay || 'Location unavailable'}</strong>
                                                    {selectedWo.barangay && <small>{selectedWo.barangay}</small>}
                                                </span>
                                            </div>
                                            {selectedWo.location_lat && selectedWo.location_lng && (
                                                <code>{selectedWo.location_lat.toFixed(5)}, {selectedWo.location_lng.toFixed(5)}</code>
                                            )}
                                        </div>

                                        {/* Assignment & Source Report */}
                                        <div className="citizen-report-docket__section">
                                            <h3>Assignment & Source</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                                                <div>
                                                    <span style={{ color: 'var(--gov-text-secondary)', display: 'block' }}>Assigned Team:</span>
                                                    <strong>{selectedWo.assigned_team || selectedWo.assigned_to_name || `Worker ID #${selectedWo.assigned_to_id || 'N/A'}`}</strong>
                                                </div>
                                                {selectedWo.report_id && (
                                                    <div>
                                                        <span style={{ color: 'var(--gov-text-secondary)', display: 'block' }}>Source Report:</span>
                                                        <Link
                                                            to={`/gov/reports?reportId=${selectedWo.report_id}`}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ff6b00', fontWeight: 700 }}
                                                        >
                                                            <span>View Report #{selectedWo.report_id}</span>
                                                            <ExternalLink size={12} />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Field Evidence Photo */}
                                        <div className="citizen-report-docket__section">
                                            <h3>Field Completion Evidence</h3>
                                            <WorkOrderEvidence url={completionEvidence} title={selectedWo.title} />
                                        </div>

                                        {/* Action Bar */}
                                        <div className="citizen-report-docket__actions" style={{ position: 'relative', bottom: 'auto', margin: '12px 0 0', padding: '14px 0 0', borderTop: '1px solid var(--gov-rule)' }}>
                                            {selectedWo.status === 'assigned' && selectedWo.assigned_to_id === currentUser?.id && (
                                                <button type="button" className="citizen-report-primary-action" onClick={() => startAssignedWork(selectedWo)}>
                                                    <Wrench size={14} /> Start work
                                                </button>
                                            )}
                                            {selectedWo.status === 'in_progress' && selectedWo.assigned_to_id === currentUser?.id && (
                                                <button type="button" className="citizen-report-primary-action" onClick={() => setCompletionModalOpen(true)}>
                                                    <FileImage size={14} /> Submit completion proof
                                                </button>
                                            )}
                                            {canManageFieldWork && (canDispatch || selectedWo.assigned_to_id === currentUser?.id) && ['assigned', 'in_progress'].includes(selectedWo.status) && (
                                                <button
                                                    type="button"
                                                    className="citizen-report-secondary-action"
                                                    onClick={() => {
                                                        setIsResolvingBlocker(false);
                                                        setBlockerModalOpen(true);
                                                    }}
                                                >
                                                    <AlertTriangle size={14} style={{ color: '#d97706' }} />
                                                    Report Blocker
                                                </button>
                                            )}

                                            {canInspect && selectedWo.status === 'completed_pending_review' && currentUser?.id !== selectedWo.assigned_to_id && <button
                                                type="button"
                                                className="citizen-report-primary-action"
                                                onClick={() => setInspectionModalOpen(true)}
                                            >
                                                <ShieldCheck size={14} />
                                                Independent Inspection
                                            </button>}
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* Modals */}
            {selectedWo && (
                <>
                    {completionModalOpen && <WorkOrderCompletionModal
                        workOrder={selectedWo}
                        onClose={() => setCompletionModalOpen(false)}
                        onSubmitted={() => { showToast('Completion proof submitted for independent review.'); fetchWorkOrders(); }}
                    />}
                    <GovInspectionModal
                        isOpen={inspectionModalOpen}
                        onClose={() => setInspectionModalOpen(false)}
                        workOrder={selectedWo}
                        currentUser={currentUser}
                        onVerified={handleInspectionComplete}
                    />
                    <GovBlockerModal
                        isOpen={blockerModalOpen}
                        onClose={() => setBlockerModalOpen(false)}
                        workOrder={selectedWo}
                        isResolving={isResolvingBlocker}
                        onUpdated={handleBlockerUpdated}
                    />
                </>
            )}

            <AssignWorkOrderModal
                isOpen={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                report={null}
                onSubmit={async (assignedData) => {
                        const res = await fetch(`${API_BASE_URL}/api/gov/work-orders`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                title: assignedData.title,
                                wo_type: 'preemptive',
                                assigned_to_id: assignedData.assigned_to_id,
                                description: assignedData.reason,
                                priority: assignedData.priority,
                            }),
                        });
                        if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            throw new Error(body.detail || `Work order creation failed (HTTP ${res.status})`);
                        }
                        showToast('Work order assigned to the selected field official.');
                        fetchWorkOrders();
                }}
            />
        </div>
    );
}
