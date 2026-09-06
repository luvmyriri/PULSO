import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock3,
    ExternalLink,
    FileCheck,
    FileImage,
    Filter,
    FolderKanban,
    History,
    Inbox,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Truck,
    Wrench,
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import WorkOrderUpdateModal from '../components/modals/WorkOrderUpdateModal';
import { API_BASE_URL } from '../utils/apiBase';
import './work-orders.css';

const WO_TABS = [
    { key: 'all', label: 'All orders' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'active', label: 'Active' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'for_review', label: 'For review' },
    { key: 'completed', label: 'Completed' },
];

const PULSELINE_WO_STEPS = [
    { key: 'open', label: 'Open' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'reviewed', label: 'Reviewed' },
];

const SAMPLE_WORK_ORDERS = [
    {
        id: 1197,
        wo_number: 'WO-2026-1197',
        report_id: 822,
        source_report: 'PUL-2026-0822',
        title: 'Exposed electrical wire',
        description: 'Verify exposed electrical wire along utility pole and secure the area to eliminate public risk.',
        location_string: '176 Deparo St., Brgy. 176, North Caloocan City',
        barangay: 'Brgy. 176',
        priority: 'high',
        assigned_team: 'Field Ops Team: Ana Reyes (Engineer II)',
        status: 'in_progress',
        target_date: 'May 15, 2026 (within 24h)',
        policy_label: 'Policy: High priority – 24h',
        updated_at: new Date(Date.now() - 14 * 60000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&q=80&w=800',
        blocker: 'Awaiting traffic safety plan',
        blocker_plan: 'Requested from Traffic Management Office on May 15, 2026.',
        latest_update: 'Photo evidence uploaded by Ana Reyes (Mobile app)',
        completion_proof: null,
        approvals: 'Not requested',
    },
    {
        id: 1182,
        wo_number: 'WO-2026-1182',
        report_id: 820,
        source_report: 'PUL-2026-0820',
        title: 'Garbage collection area clearing',
        description: 'Clear heavy illegal trash accumulation obstructing sidewalk and drainage culvert.',
        location_string: 'Camarin Rd., Brgy. 172, North Caloocan City',
        barangay: 'Brgy. 172',
        priority: 'medium',
        assigned_team: 'Field Crew B: Miguel Santos',
        status: 'for_review',
        target_date: 'May 15, 2026',
        updated_at: new Date(Date.now() - 32 * 60000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1618060932014-4deda4932554?auto=format&fit=crop&q=80&w=800',
        blocker: null,
        latest_update: 'Clearing completed, awaiting supervisor inspection',
        completion_proof: 'Photo uploaded: clean sidewalk and clear culvert',
        approvals: 'Pending review by Division Chief',
    },
    {
        id: 1170,
        wo_number: 'WO-2026-1170',
        report_id: 816,
        source_report: 'PUL-2026-0816',
        title: 'Broken streetlight restoration',
        description: 'Replace burned luminaire and inspect underground conduit wiring.',
        location_string: 'Bagumbong Rd., Brgy. 170, North Caloocan City',
        barangay: 'Brgy. 170',
        priority: 'medium',
        assigned_team: 'Field Crew A: Jose Dela Cruz',
        status: 'completed',
        target_date: 'May 15, 2026',
        updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&q=80&w=800',
        blocker: null,
        latest_update: 'Luminaire replaced and energized',
        completion_proof: 'Verified operational at night test',
        approvals: 'Approved by City Engineer',
    },
    {
        id: 1165,
        wo_number: 'WO-2026-1165',
        report_id: 815,
        source_report: 'PUL-2026-0815',
        title: 'Drainage culvert desilting',
        description: 'Remove heavy silt and debris buildup causing backflow during high tide / rainfall.',
        location_string: '10th Ave., Brgy. 167, North Caloocan City',
        barangay: 'Brgy. 167',
        priority: 'high',
        assigned_team: 'Field Ops Team: Ana Reyes',
        status: 'in_progress',
        target_date: 'May 16, 2026',
        updated_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?auto=format&fit=crop&q=80&w=800',
        blocker: 'Awaiting high-pressure flusher truck',
        blocker_plan: 'Equipment dispatched from Central Depot',
        latest_update: 'Initial manual clearing complete (30%)',
        completion_proof: null,
        approvals: 'Not requested',
    },
    {
        id: 1156,
        wo_number: 'WO-2026-1156',
        report_id: 813,
        source_report: 'PUL-2026-0813',
        title: 'Pothole restoration on road',
        description: 'Cold-mix asphalt application and mechanical compaction for surface depression.',
        location_string: 'St. Jude St., Brgy. 165, North Caloocan City',
        barangay: 'Brgy. 165',
        priority: 'high',
        assigned_team: 'Field Crew B: Miguel Santos',
        status: 'blocked',
        target_date: 'May 16, 2026',
        updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&q=80&w=800',
        blocker: 'Severe torrential rainfall',
        blocker_plan: 'Work rescheduled immediately upon road surface dryout',
        latest_update: 'Work paused due to standing water',
        completion_proof: null,
        approvals: 'Not requested',
    },
];

export default function WorkOrdersPage({ workspace }) {
    const token = localStorage.getItem('pulso_token');
    const [params, setParams] = useSearchParams();
    const [workOrders, setWorkOrders] = useState([]);
    const [toastMessage, setToastMessage] = useState(null);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);

    const activeTab = params.get('tab') || 'all';
    const searchQuery = params.get('search') || '';
    const selectedWoId = Number(params.get('wo')) || null;

    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem('pulso_user') || 'null');
        } catch {
            return null;
        }
    };
    const currentUser = readUser();

    const fetchWorkOrders = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const merged = data.map((d, index) => ({
                        ...SAMPLE_WORK_ORDERS[index % SAMPLE_WORK_ORDERS.length],
                        ...d,
                        id: d.id,
                        wo_number: d.wo_number || `WO-2026-${String(d.id).padStart(4, '0')}`,
                        title: d.title || 'Civil engineering work order',
                        status: d.status || 'in_progress',
                        priority: d.priority || 'normal',
                    }));
                    setWorkOrders(merged);
                } else {
                    setWorkOrders(SAMPLE_WORK_ORDERS);
                }
            } else {
                setWorkOrders(SAMPLE_WORK_ORDERS);
            }
        } catch {
            setWorkOrders(SAMPLE_WORK_ORDERS);
        }
    };

    useEffect(() => {
        fetchWorkOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 5000);
    };

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
            if (activeTab === 'for_review' && wo.status !== 'for_review') return false;
            if (activeTab === 'completed' && wo.status !== 'completed') return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    wo.wo_number?.toLowerCase().includes(q) ||
                    wo.title?.toLowerCase().includes(q) ||
                    wo.barangay?.toLowerCase().includes(q) ||
                    wo.assigned_team?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [workOrders, activeTab, searchQuery]);

    const selectedWo = useMemo(() => {
        if (!selectedWoId) return null;
        return workOrders.find((w) => w.id === selectedWoId) || null;
    }, [workOrders, selectedWoId]);

    const handleUpdateSubmit = async (updateData) => {
        try {
            await fetch(`${API_BASE_URL}/api/gov/work-orders/${updateData.workOrderId}/updates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    comment: updateData.comment,
                    new_status: updateData.status,
                    image_url: updateData.imageUrl,
                }),
            });
        } catch {
            // Local state update
        }

        setWorkOrders((prev) =>
            prev.map((w) => {
                if (w.id === updateData.workOrderId) {
                    return {
                        ...w,
                        status: updateData.status,
                        blocker: updateData.blockerReason || null,
                        blocker_plan: updateData.safetyPlan || null,
                        latest_update: updateData.comment,
                        image_url: updateData.imageUrl || w.image_url,
                        updated_at: new Date().toISOString(),
                    };
                }
                return w;
            })
        );
        showToast(`Work order update recorded for ${selectedWo?.wo_number || 'order'}.`);
    };

    const handleApproveComplete = async () => {
        if (!selectedWo) return;
        try {
            await fetch(`${API_BASE_URL}/api/gov/work-orders/${selectedWo.id}/approval`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'approve',
                    notes: 'Work order certified and approved for closure.',
                }),
            });
        } catch {
            // Local fallback
        }

        setWorkOrders((prev) =>
            prev.map((w) =>
                w.id === selectedWo.id
                    ? { ...w, status: 'completed', approvals: 'Approved by City Engineer' }
                    : w
            )
        );
        showToast(`${selectedWo.wo_number} approved and marked completed.`);
    };

    // Calculate active pulseline step
    const currentStepIndex = useMemo(() => {
        if (!selectedWo) return 0;
        const st = selectedWo.status;
        if (st === 'open') return 0;
        if (st === 'assigned') return 1;
        if (st === 'in_progress' || st === 'blocked') return 2;
        if (st === 'for_review' || st === 'completed') return 3;
        if (st === 'reviewed') return 4;
        return 2;
    }, [selectedWo]);

    return (
        <div className="work-orders-page">
            <GovSidebar currentUser={currentUser} />
            <div className="work-orders-shell">
                <header className="work-orders-topbar">
                    <div>
                        <h1>Work orders</h1>
                        <p>Track, dispatch, and review engineering work orders across field teams.</p>
                    </div>
                    <div className="work-orders-topbar-actions">
                        {toastMessage && (
                            <div className="citizen-reports-toast-pill" role="status">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <span className="work-orders-freshness">Data as of today 08:42 AM</span>
                        <ThemeToggle />
                        <button
                            type="button"
                            className="citizen-reports-icon-button"
                            onClick={fetchWorkOrders}
                            aria-label="Refresh work orders"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </header>

                {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

                {/* Workspace Tab Bar (Image 2 Panel 1) */}
                <div className="work-orders-tabs-bar">
                    <div className="work-orders-tabs-list" role="tablist">
                        {WO_TABS.map((tab) => {
                            const count =
                                tab.key === 'all'
                                    ? workOrders.length
                                    : workOrders.filter((w) =>
                                          tab.key === 'active'
                                              ? w.status === 'in_progress'
                                              : tab.key === 'for_review'
                                              ? w.status === 'for_review'
                                              : w.status === tab.key
                                      ).length;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab.key}
                                    className={`work-orders-tab${activeTab === tab.key ? ' is-active' : ''}`}
                                    onClick={() => {
                                        updateParam('tab', tab.key);
                                        updateParam('wo', null);
                                    }}
                                >
                                    {tab.label}
                                    <span className="work-orders-tab-count">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        className="work-orders-create-btn"
                        onClick={() => showToast('Use Citizen Reports triage or Dispatch to create work orders.')}
                    >
                        <Plus size={15} /> Create work order
                    </button>
                </div>

                <main className="work-orders-main">
                    {!selectedWo ? (
                        /* ── PANEL 1: LIST VIEW ─────────────────────────────────────── */
                        <>
                            <div className="work-orders-controls">
                                <div className="work-orders-search-box">
                                    <Search size={16} />
                                    <input
                                        type="search"
                                        placeholder="Search work orders..."
                                        className="work-orders-search-input"
                                        value={searchQuery}
                                        onChange={(e) => updateParam('search', e.target.value)}
                                    />
                                </div>
                                <div className="work-orders-filter-actions">
                                    <button
                                        type="button"
                                        className="gov-btn-secondary"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <Filter size={14} /> Filters
                                    </button>
                                    <select className="work-orders-select-filter">
                                        <option value="newest">Sort: Updated (newest)</option>
                                        <option value="priority">Sort: Priority (critical first)</option>
                                        <option value="sla">Sort: Target SLA</option>
                                    </select>
                                    <span className="work-orders-result-meta">
                                        {filteredOrders.length} results · Updated 2m ago
                                    </span>
                                </div>
                            </div>

                            <div className="work-orders-layout-split">
                                <div className="work-orders-table-wrapper">
                                    <table className="work-orders-table" aria-label="Work orders table">
                                        <thead>
                                            <tr>
                                                <th>WO ID</th>
                                                <th>Source report</th>
                                                <th>Work</th>
                                                <th>Barangay</th>
                                                <th>Priority</th>
                                                <th>Team / Assignee</th>
                                                <th>State</th>
                                                <th>Target</th>
                                                <th>Updated</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredOrders.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} style={{ textAlign: 'center', padding: '36px' }}>
                                                        <Inbox size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                                                        <strong>No work orders found</strong>
                                                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                                                            No work orders match the selected filter or search query.
                                                        </p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredOrders.map((wo) => (
                                                    <tr key={wo.id}>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="work-orders-table-btn-link"
                                                                onClick={() => updateParam('wo', String(wo.id))}
                                                            >
                                                                {wo.wo_number}
                                                            </button>
                                                        </td>
                                                        <td style={{ fontFamily: 'monospace', color: '#64748b' }}>
                                                            {wo.source_report || '—'}
                                                        </td>
                                                        <td>
                                                            <strong>{wo.title}</strong>
                                                        </td>
                                                        <td>{wo.barangay || 'North Caloocan'}</td>
                                                        <td>
                                                            <span className={`gov-priority-badge is-${wo.priority}`}>
                                                                {wo.priority}
                                                            </span>
                                                        </td>
                                                        <td>{wo.assigned_team}</td>
                                                        <td>
                                                            <span className={`gov-state-badge is-${wo.status}`}>
                                                                {wo.status.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{wo.target_date}</td>
                                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                                                            {new Date(wo.updated_at).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right-Rail Summary (Image 2 Panel 1) */}
                                <aside className="work-orders-rail-summary">
                                    <div className="work-orders-summary-card">
                                        <h4>Next action</h4>
                                        <strong>Continue field verification</strong>
                                        <p>Confirm the location and take safe clearance measurement.</p>
                                        <button
                                            type="button"
                                            className="work-orders-summary-card-link"
                                            onClick={() => updateParam('wo', '1197')}
                                        >
                                            Open work order →
                                        </button>
                                    </div>

                                    <div className="work-orders-summary-card">
                                        <h4>Top blocker</h4>
                                        <strong>Awaiting traffic safety plan</strong>
                                        <p>Requested from Traffic Management Office on May 15, 2026.</p>
                                        <button
                                            type="button"
                                            className="work-orders-summary-card-link"
                                            onClick={() => updateParam('wo', '1197')}
                                        >
                                            View details →
                                        </button>
                                    </div>

                                    <div className="work-orders-summary-card">
                                        <h4>Latest field update</h4>
                                        <strong>Photo evidence uploaded</strong>
                                        <p>Ana Reyes · 14 min ago · Mobile app</p>
                                    </div>
                                </aside>
                            </div>
                        </>
                    ) : (
                        /* ── PANEL 2: DETAIL DOCKET VIEW ────────────────────────────── */
                        <article className="wo-docket-container">
                            <div className="wo-docket-breadcrumb-bar">
                                <div className="wo-docket-breadcrumbs">
                                    <button
                                        type="button"
                                        className="wo-docket-btn-back"
                                        onClick={() => updateParam('wo', null)}
                                    >
                                        <ArrowLeft size={14} style={{ display: 'inline', marginRight: 4 }} />
                                        Work orders
                                    </button>
                                    <span>/</span>
                                    <strong>{selectedWo.wo_number}</strong>
                                    <span className={`gov-priority-badge is-${selectedWo.priority}`}>
                                        {selectedWo.priority}
                                    </span>
                                </div>
                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                    Reported 14 min ago · By Juan Dela Cruz · {selectedWo.source_report}
                                </span>
                            </div>

                            <div className="wo-docket-header-row">
                                <div className="wo-docket-title-area">
                                    <h2>
                                        {selectedWo.wo_number}{' '}
                                        <span className={`gov-priority-badge is-${selectedWo.priority}`}>
                                            {selectedWo.priority}
                                        </span>
                                    </h2>
                                    <p>{selectedWo.title}</p>
                                </div>
                                <div className="wo-docket-actions-row">
                                    <button
                                        type="button"
                                        className="gov-btn-primary"
                                        onClick={() => setUpdateModalOpen(true)}
                                    >
                                        <Wrench size={14} style={{ display: 'inline', marginRight: 6 }} />
                                        Add field update
                                    </button>
                                    <button
                                        type="button"
                                        className="gov-btn-secondary"
                                        onClick={handleApproveComplete}
                                    >
                                        <FileCheck size={14} style={{ display: 'inline', marginRight: 6 }} />
                                        {selectedWo.status === 'completed' ? 'Approved' : 'Request review'}
                                    </button>
                                </div>
                            </div>

                            {/* 2px Pulseline Progress Bar (Image 2 Panel 2) */}
                            <div className="wo-pulseline-bar-box" aria-label="Work order progress">
                                <div className="wo-pulseline-track">
                                    <div
                                        className="wo-pulseline-fill"
                                        style={{
                                            width: `${(currentStepIndex / (PULSELINE_WO_STEPS.length - 1)) * 100}%`,
                                        }}
                                    />
                                </div>
                                <div className="wo-pulseline-steps">
                                    {PULSELINE_WO_STEPS.map((st, idx) => {
                                        const isDone = idx <= currentStepIndex;
                                        const isCurrent = idx === currentStepIndex;
                                        return (
                                            <div
                                                key={st.key}
                                                className={`wo-pulseline-step${isDone ? ' is-done' : ''}${
                                                    isCurrent ? ' is-current' : ''
                                                }`}
                                            >
                                                <span className="wo-pulseline-dot" />
                                                <span className="wo-pulseline-label">{st.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2-Column Grid */}
                            <div className="wo-docket-grid">
                                {/* Left Column */}
                                <div className="wo-docket-col">
                                    <div className="wo-card">
                                        <h4>Scope</h4>
                                        <p>{selectedWo.description}</p>
                                    </div>

                                    <div className="wo-card">
                                        <h4>Location</h4>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <MapPin size={16} className="text-sky-600" />
                                            <strong>{selectedWo.location_string}</strong>
                                        </p>
                                        <Link
                                            to="/gov/operations?view=dispatch"
                                            className="work-orders-summary-card-link"
                                        >
                                            View on map →
                                        </Link>
                                    </div>

                                    <div className="wo-card">
                                        <h4>Source report</h4>
                                        <p>
                                            <Link
                                                to={`/gov/operations?view=reports&report=${selectedWo.report_id}`}
                                                className="work-orders-table-btn-link"
                                            >
                                                {selectedWo.source_report}
                                            </Link>{' '}
                                            — {selectedWo.title}
                                        </p>
                                    </div>

                                    <div className="wo-card">
                                        <h4>Field photo evidence</h4>
                                        <div className="wo-evidence-aperture">
                                            {selectedWo.image_url ? (
                                                <div className="wo-evidence-frame">
                                                    <img
                                                        src={selectedWo.image_url}
                                                        alt="Field evidence"
                                                        className="wo-evidence-img"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="citizen-report-empty-evidence">
                                                    <FileImage size={24} /> No photo uploaded yet.
                                                </div>
                                            )}
                                            <div className="wo-evidence-meta">
                                                <span>Photo • May 15, 2026 08:12 AM</span>
                                                <span>Source: Mobile app</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="wo-docket-col">
                                    <div className="wo-card">
                                        <h4>Team / Assignee</h4>
                                        <p>
                                            <strong>{selectedWo.assigned_team}</strong>
                                        </p>
                                    </div>

                                    <div className="wo-card">
                                        <h4>Priority & Target</h4>
                                        <p>
                                            <strong>Priority:</strong>{' '}
                                            <span className={`gov-priority-badge is-${selectedWo.priority}`}>
                                                {selectedWo.priority}
                                            </span>
                                        </p>
                                        <p>
                                            <strong>Target:</strong> {selectedWo.target_date}
                                        </p>
                                        <small style={{ color: '#64748b' }}>{selectedWo.policy_label}</small>
                                    </div>

                                    <div className="wo-card">
                                        <h4>Blockers and changes</h4>
                                        {selectedWo.blocker ? (
                                            <div className="gov-blocker-section" style={{ margin: '4px 0' }}>
                                                <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <AlertTriangle size={14} /> Top blocker: {selectedWo.blocker}
                                                </strong>
                                                <p style={{ fontSize: 12 }}>{selectedWo.blocker_plan}</p>
                                            </div>
                                        ) : (
                                            <p style={{ color: '#64748b' }}>No active blockers flagged.</p>
                                        )}
                                        <div style={{ marginTop: 8 }}>
                                            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                                                Latest field update:
                                            </span>
                                            <p style={{ fontSize: 12, marginTop: 2 }}>{selectedWo.latest_update}</p>
                                        </div>
                                    </div>

                                    <div className="wo-card">
                                        <h4>Completion proof</h4>
                                        <p style={{ color: selectedWo.completion_proof ? '#059669' : '#64748b' }}>
                                            {selectedWo.completion_proof || 'No completion proof yet'}
                                        </p>
                                    </div>

                                    <div className="wo-card">
                                        <h4>Approvals</h4>
                                        <p>{selectedWo.approvals}</p>
                                    </div>

                                    <div className="wo-card">
                                        <h4>Activity (Immutable)</h4>
                                        <div className="wo-timeline">
                                            <div className="wo-timeline-item">
                                                <span className="wo-timeline-dot" />
                                                <div className="wo-timeline-content">
                                                    <strong>Added field update with photo evidence</strong>
                                                    <span>14 min ago · Ana Reyes</span>
                                                </div>
                                            </div>
                                            <div className="wo-timeline-item">
                                                <span className="wo-timeline-dot" />
                                                <div className="wo-timeline-content">
                                                    <strong>Work order assigned to Field Ops Team</strong>
                                                    <span>32 min ago · Dispatcher / System</span>
                                                </div>
                                            </div>
                                            <div className="wo-timeline-item">
                                                <span className="wo-timeline-dot" />
                                                <div className="wo-timeline-content">
                                                    <strong>Work order created from {selectedWo.source_report}</strong>
                                                    <span>36 min ago · System</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    )}
                </main>
            </div>

            {/* Update Drawer Modal */}
            <WorkOrderUpdateModal
                isOpen={updateModalOpen}
                onClose={() => setUpdateModalOpen(false)}
                workOrder={selectedWo}
                onSubmit={handleUpdateSubmit}
            />
        </div>
    );
}
