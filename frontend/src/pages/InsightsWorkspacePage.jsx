import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ArrowDownRight,
    ArrowUpRight,
    Check,
    CheckCircle2,
    ExternalLink,
    Info,
    RefreshCw,
    Sparkles,
    Wrench,
    X,
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import './insights-workspace.css';

const INSIGHTS_TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'analytics', label: 'Analytics & Spatial Clusters' },
    { key: 'predictive', label: 'Predictive maintenance' },
];

const COMPLETION_TREND = [
    { date: 'Apr 15', rate: 60, total: 20, on_time: 12, delayed: 8 },
    { date: 'Apr 20', rate: 68, total: 25, on_time: 17, delayed: 8 },
    { date: 'Apr 25', rate: 74, total: 23, on_time: 17, delayed: 6 },
    { date: 'Apr 30', rate: 79, total: 28, on_time: 22, delayed: 6 },
    { date: 'May 05', rate: 81, total: 31, on_time: 25, delayed: 6 },
    { date: 'May 14', rate: 84, total: 36, on_time: 30, delayed: 6 },
];

const ISSUE_CLUSTERS = [
    {
        issue: 'Drain clogging',
        work_orders: 46,
        percent: 36,
        trend: 'up',
        delta: '+8%',
        source: 'WO-2026-1182',
        barangay: 'Brgy. 172, 176',
        severity: 'high',
    },
    {
        issue: 'Flooding - low area',
        work_orders: 27,
        percent: 21,
        trend: 'up',
        delta: '+4%',
        source: 'WO-2026-1170',
        barangay: 'Brgy. 170',
        severity: 'high',
    },
    {
        issue: 'Broken inlet',
        work_orders: 17,
        percent: 13,
        trend: 'down',
        delta: '-3%',
        source: 'WO-2026-1165',
        barangay: 'Brgy. 167',
        severity: 'medium',
    },
    {
        issue: 'Garbage accumulation',
        work_orders: 14,
        percent: 11,
        trend: 'down',
        delta: '-6%',
        source: 'WO-2026-1182',
        barangay: 'Brgy. 176, 178',
        severity: 'medium',
    },
    {
        issue: 'Siltation',
        work_orders: 9,
        percent: 7,
        trend: 'up',
        delta: '+2%',
        source: 'WO-2026-1152',
        barangay: 'Brgy. 171',
        severity: 'normal',
    },
];

const PREDICTIVE_ITEMS = [
    {
        id: 'PRED-001',
        asset: 'Camarin St. Drain – Segment 3',
        risk: 82,
        level: 'High',
        issue: 'Drain clogging',
        window: 'May 16 – May 30, 2026',
        confidence: 'Medium',
        incidents_history: 3,
        est_impact: 'High localized backflow (400m radius)',
        recommendation: 'Deploy high-velocity vacuum truck for preventive culvert extraction before anticipated rain cycle.',
    },
    {
        id: 'PRED-002',
        asset: 'Deparo St. Drain – Segment 1',
        risk: 67,
        level: 'Medium-High',
        issue: 'Siltation',
        window: 'May 16 – May 30, 2026',
        confidence: 'Medium',
        incidents_history: 2,
        est_impact: 'Reduced hydraulic discharge capacity (-35%)',
        recommendation: 'Schedule manual desilting crew with sediment traps along main drainage outlet.',
    },
    {
        id: 'PRED-003',
        asset: '10th Ave. Drain – Segment 2',
        risk: 58,
        level: 'Medium',
        issue: 'Flooding – low area',
        window: 'May 16 – May 30, 2026',
        confidence: 'Medium',
        incidents_history: 1,
        est_impact: 'Minor curb ponding during high-tide rainfall',
        recommendation: 'Inspect one-way flap gates and clear inlet trash screens.',
    },
    {
        id: 'PRED-004',
        asset: 'St. Jude St. Drain – Segment 4',
        risk: 41,
        level: 'Low',
        issue: 'Garbage accumulation',
        window: 'May 16 – May 30, 2026',
        confidence: 'Low',
        incidents_history: 1,
        est_impact: 'Surface litter obstructing grated inlet',
        recommendation: 'Coordinate with Barangay Environmental Sanitation team for weekly sweeping.',
    },
];

const BARANGAY_DISTRIBUTION = [
    { barangay: 'Brgy. 176 (Bagong Silang)', active_wo: 38, resolved: 86, sla_rate: '88%', health: 'Good' },
    { barangay: 'Brgy. 172 (Camarin)', active_wo: 24, resolved: 54, sla_rate: '83%', health: 'Watch' },
    { barangay: 'Brgy. 170 (Deparo)', active_wo: 19, resolved: 41, sla_rate: '81%', health: 'Watch' },
    { barangay: 'Brgy. 167 (Llano)', active_wo: 14, resolved: 33, sla_rate: '79%', health: 'Needs Attention' },
    { barangay: 'Brgy. 178 (Camarin)', active_wo: 11, resolved: 28, sla_rate: '86%', health: 'Good' },
];

export default function InsightsWorkspacePage({ workspace = 'insights' }) {
    const [params, setParams] = useSearchParams();
    const [toastMessage, setToastMessage] = useState(null);
    const [selectedPredictiveAsset, setSelectedPredictiveAsset] = useState(PREDICTIVE_ITEMS[0]);
    const [hoveredBar, setHoveredBar] = useState(null);
    const [assetTypeFilter, setAssetTypeFilter] = useState('Drainage');
    const [timeframeFilter, setTimeframeFilter] = useState('30d');
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [maintenanceNotes, setMaintenanceNotes] = useState('');

    const activeTab = params.get('view') || 'overview';

    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem('pulso_user') || 'null');
        } catch {
            return null;
        }
    };
    const currentUser = readUser();

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const updateParam = (key, value) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            if (!value) next.delete(key);
            else next.set(key, value);
            return next;
        }, { replace: true });
    };

    const handleCreateMaintenanceReview = () => {
        setIsMaintenanceModalOpen(true);
    };

    const handleMaintenanceSubmit = (e) => {
        e.preventDefault();
        showToast(`Preventive maintenance ticket created for ${selectedPredictiveAsset.asset}. Scoped to Field Ops.`);
        setIsMaintenanceModalOpen(false);
        setMaintenanceNotes('');
    };

    return (
        <div className="insights-page">
            <GovSidebar currentUser={currentUser} />
            <div className="insights-shell">
                {/* Topbar */}
                <header className="insights-topbar">
                    <div className="insights-topbar__title-group">
                        <h1>Operational insights & predictive maintenance</h1>
                        <p>Executive performance metrics, SLA compliance trajectories, spatial issue clusters, and AI risk forecasts.</p>
                    </div>
                    <div className="projects-topbar-actions">
                        {toastMessage && (
                            <div className="citizen-reports-toast-pill" role="status">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <span className="projects-freshness">Live data sync (2 min ago)</span>
                        <ThemeToggle />
                        <button
                            type="button"
                            className="citizen-reports-icon-button"
                            onClick={() => showToast('Refreshed operational intelligence telemetry.')}
                            aria-label="Refresh insights"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </header>

                {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

                {/* Tabs & Scope Banner (Image 4 Panel 3) */}
                <div className="insights-tabs-bar">
                    <div className="insights-tabs-list" role="tablist">
                        {INSIGHTS_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                className={`insights-tab${activeTab === tab.key ? ' is-active' : ''}`}
                                onClick={() => updateParam('view', tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="insights-scope-meta">
                        <span className="insights-scope-tag">
                            <strong>Scope:</strong> North Caloocan
                        </span>
                        <span className="insights-scope-divider">·</span>
                        <label className="insights-scope-tag" htmlFor="insights-asset-select">
                            <strong>Asset:</strong>
                            <select
                                id="insights-asset-select"
                                value={assetTypeFilter}
                                onChange={(e) => setAssetTypeFilter(e.target.value)}
                                className="records-select"
                                style={{ height: 26, fontSize: 11, marginLeft: 4 }}
                            >
                                <option value="Drainage">Drainage</option>
                                <option value="Roadways">Roadways</option>
                                <option value="Streetlights">Streetlights</option>
                                <option value="All Assets">All Assets</option>
                            </select>
                        </label>
                        <span className="insights-scope-divider">·</span>
                        <label className="insights-scope-tag" htmlFor="insights-period-select">
                            <strong>Period:</strong>
                            <select
                                id="insights-period-select"
                                value={timeframeFilter}
                                onChange={(e) => setTimeframeFilter(e.target.value)}
                                className="records-select"
                                style={{ height: 26, fontSize: 11, marginLeft: 4 }}
                            >
                                <option value="30d">Apr 15 – May 14, 2026 (30d)</option>
                                <option value="90d">Feb 15 – May 14, 2026 (90d)</option>
                                <option value="ytd">Year to date (2026)</option>
                            </select>
                        </label>
                    </div>
                </div>

                <main className="insights-main">
                    {/* SLA Performance KPI Tiles (Image 4 Panel 3) */}
                    <div className="insights-kpi-grid">
                        {/* KPI 1 */}
                        <div className="insights-kpi-tile">
                            <div className="insights-kpi-header">
                                <span className="insights-kpi-label">On-time completion rate</span>
                                <span className="insights-target-pill">Target: 80% SLA</span>
                            </div>
                            <div className="insights-kpi-value-row">
                                <span className="insights-kpi-value">84%</span>
                                <span className="insights-kpi-trend is-up">
                                    <ArrowUpRight size={14} /> +9 pp vs Mar 16 – Apr 14
                                </span>
                            </div>
                            <div className="insights-kpi-footer">
                                <span>SLA compliance met across 6 barangay sectors.</span>
                            </div>
                        </div>

                        {/* KPI 2 */}
                        <div className="insights-kpi-tile">
                            <div className="insights-kpi-header">
                                <span className="insights-kpi-label">Work orders completed</span>
                                <span className="insights-target-pill">30-day window</span>
                            </div>
                            <div className="insights-kpi-value-row">
                                <span className="insights-kpi-value">128</span>
                                <span className="insights-kpi-trend is-up">
                                    <ArrowUpRight size={14} /> +14% vs previous period
                                </span>
                            </div>
                            <div className="insights-kpi-footer">
                                <span>Total field deployment: 2,380 crew hours.</span>
                            </div>
                        </div>

                        {/* KPI 3 */}
                        <div className="insights-kpi-tile">
                            <div className="insights-kpi-header">
                                <span className="insights-kpi-label">Avg. response time</span>
                                <span className="insights-target-pill">Target: &lt;24.0 h</span>
                            </div>
                            <div className="insights-kpi-value-row">
                                <span className="insights-kpi-value">18.6 h</span>
                                <span className="insights-kpi-trend is-up">
                                    <ArrowDownRight size={14} /> -1.8 h faster SLA
                                </span>
                            </div>
                            <div className="insights-kpi-footer">
                                <span>Median initial field dispatch: 1.4 hours.</span>
                            </div>
                        </div>
                    </div>

                    {/* 2-Column Insights Grid */}
                    <div className="insights-two-col">
                        {/* ── LEFT COLUMN: TREND & ISSUE CLUSTERS ────────────────────────── */}
                        <div className="insights-col-left">
                            {/* Completion Trend Bar Chart */}
                            <div className="insights-section-card">
                                <div className="insights-card-header">
                                    <div>
                                        <h3>Trend: On-time completion rate progression</h3>
                                        <p className="insights-card-sub">Bi-weekly percentage of work orders resolved within statutory SLA</p>
                                    </div>
                                    <span className="insights-benchmark-badge">
                                        <Check size={12} /> 80% SLA Threshold Met
                                    </span>
                                </div>

                                <div className="insights-trend-chart-box">
                                    {/* 80% Target Line Indicator */}
                                    <div className="insights-target-line-container">
                                        <div className="insights-target-line" />
                                        <span className="insights-target-line-label">80% SLA Target</span>
                                    </div>

                                    {/* Interactive Bars */}
                                    <div className="insights-chart-bars" role="img" aria-label="On-time completion trend chart">
                                        {COMPLETION_TREND.map((item, idx) => {
                                            const isMet = item.rate >= 80;
                                            const isHovered = hoveredBar?.date === item.date;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`insights-bar-col${isHovered ? ' is-hovered' : ''}`}
                                                    onMouseEnter={() => setHoveredBar(item)}
                                                    onMouseLeave={() => setHoveredBar(null)}
                                                    tabIndex={0}
                                                >
                                                    <div className="insights-bar-track">
                                                        <div
                                                            className={`insights-bar${isMet ? ' is-met' : ''}`}
                                                            style={{ height: `${item.rate}%` }}
                                                        >
                                                            <span className="insights-bar-value">{item.rate}%</span>
                                                        </div>
                                                    </div>
                                                    <span className="insights-bar-label">{item.date}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="insights-chart-caption">
                                        <span>Target threshold: 80% statutory SLA compliance (Met on May 05 & May 14)</span>
                                        {hoveredBar && (
                                            <span className="insights-chart-hover-info">
                                                {hoveredBar.date}: {hoveredBar.rate}% on-time ({hoveredBar.on_time}/{hoveredBar.total} orders)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Top 5 Issue Clusters by Volume */}
                            <div className="insights-section-card">
                                <div className="insights-card-header">
                                    <div>
                                        <h3>Top 5 issue clusters by volume</h3>
                                        <p className="insights-card-sub">Aggregated categorization of citizen reports and field inspection tickets</p>
                                    </div>
                                    <span className="insights-scope-tag">Top 5 of 18 categories</span>
                                </div>

                                <div className="records-table-wrapper">
                                    <table className="records-table" aria-label="Issue clusters table">
                                        <thead>
                                            <tr>
                                                <th>Issue cluster</th>
                                                <th>Work orders</th>
                                                <th>% of total</th>
                                                <th>Trend vs prior</th>
                                                <th>Primary hotspot</th>
                                                <th>Linked source</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ISSUE_CLUSTERS.map((cl, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span className={`insights-cluster-dot is-${cl.severity}`} />
                                                            <strong>{cl.issue}</strong>
                                                        </div>
                                                    </td>
                                                    <td>{cl.work_orders} orders</td>
                                                    <td>
                                                        <div className="insights-percent-cell">
                                                            <div className="insights-percent-track">
                                                                <div
                                                                    className="insights-percent-fill"
                                                                    style={{ width: `${cl.percent}%` }}
                                                                />
                                                            </div>
                                                            <span style={{ fontWeight: 700 }}>{cl.percent}%</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {cl.trend === 'up' ? (
                                                            <span className="insights-kpi-trend is-up">
                                                                <ArrowUpRight size={13} /> {cl.delta}
                                                            </span>
                                                        ) : (
                                                            <span className="insights-kpi-trend is-down">
                                                                <ArrowDownRight size={13} /> {cl.delta}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: 11, color: 'var(--gov-text-secondary)' }}>
                                                        {cl.barangay}
                                                    </td>
                                                    <td className="records-cell-mono" style={{ color: 'var(--gov-action)' }}>
                                                        <Link
                                                            to={`/gov/operations?view=work-orders&search=${cl.source}`}
                                                            style={{ color: 'inherit', textDecoration: 'none' }}
                                                        >
                                                            {cl.source}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN: PREDICTIVE MAINTENANCE ENGINE ─────────────────── */}
                        <div className="insights-col-right">
                            <div className="insights-predictive-box">
                                <div className="insights-card-header">
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <h3>Predictive maintenance engine</h3>
                                            <span className="gov-state-badge is-in_progress">
                                                <Sparkles size={11} style={{ display: 'inline', marginRight: 2 }} />
                                                AI Assisted
                                            </span>
                                        </div>
                                        <p className="insights-card-sub">
                                            Forecast window: May 16 – May 30, 2026 · Model: Drainage Risk v1.0
                                        </p>
                                    </div>
                                </div>

                                <div className="records-table-wrapper">
                                    <table className="records-table" style={{ fontSize: 11 }} aria-label="Predictive risk table">
                                        <thead>
                                            <tr>
                                                <th>Asset / Location</th>
                                                <th>Risk score</th>
                                                <th>Predicted issue</th>
                                                <th>Confidence</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {PREDICTIVE_ITEMS.map((item) => {
                                                const isSelected = item.id === selectedPredictiveAsset.id;
                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className={isSelected ? 'is-selected' : ''}
                                                        onClick={() => setSelectedPredictiveAsset(item)}
                                                        style={{ cursor: 'pointer' }}
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setSelectedPredictiveAsset(item);
                                                            }
                                                        }}
                                                    >
                                                        <td>
                                                            <div className="records-signal-marker-cell">
                                                                {isSelected && <span className="records-signal-cut" />}
                                                                <strong>{item.asset}</strong>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`gov-priority-badge is-${
                                                                    item.risk >= 80 ? 'critical' : item.risk >= 60 ? 'high' : 'normal'
                                                                }`}
                                                            >
                                                                {item.risk} ({item.level})
                                                            </span>
                                                        </td>
                                                        <td>{item.issue}</td>
                                                        <td>
                                                            <span className="insights-confidence-pill">
                                                                {item.confidence}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Asset Detail Snippet */}
                                <div className="insights-asset-card">
                                    <div className="insights-asset-card-header">
                                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gov-text)' }}>
                                            {selectedPredictiveAsset.asset}
                                        </div>
                                        <span className={`gov-priority-badge is-${selectedPredictiveAsset.risk >= 80 ? 'critical' : selectedPredictiveAsset.risk >= 60 ? 'high' : 'normal'}`}>
                                            Risk: {selectedPredictiveAsset.risk}/100
                                        </span>
                                    </div>
                                    <div className="insights-asset-grid">
                                        <div>
                                            <span className="records-meta-label">Estimated Impact:</span>
                                            <div style={{ fontSize: 11.5, fontWeight: 600 }}>{selectedPredictiveAsset.est_impact}</div>
                                        </div>
                                        <div>
                                            <span className="records-meta-label">Recommended Action:</span>
                                            <div style={{ fontSize: 11.5, color: 'var(--gov-text)' }}>{selectedPredictiveAsset.recommendation}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Narrative Callout (DRAFT) */}
                                <div className="insights-ai-narrative">
                                    <div className="insights-ai-narrative-title">
                                        <Sparkles size={14} />
                                        <span>AI Narrative Synthesis (DRAFT)</span>
                                    </div>
                                    <p>
                                        Drain clogging risk is concentrated in <strong>{selectedPredictiveAsset.asset}</strong> due to recent precipitation telemetry, recurring debris citizen reports (3 incidents), and aged grate geometry. Prioritize desilting operations before the forecasted heavy rain window (May 16–30).
                                    </p>
                                    <div className="insights-ai-caveat">
                                        <Info size={12} style={{ flexShrink: 0 }} />
                                        <span>
                                            Source: Analytics telemetry + Historical work order logs. Not production. Governed review required before municipal commitment.
                                        </span>
                                    </div>
                                </div>

                                {/* Governed Actions */}
                                <div className="insights-predictive-actions">
                                    <button
                                        type="button"
                                        className="gov-btn-primary"
                                        onClick={() => showToast(`Filtering operations view to scoped reports around ${selectedPredictiveAsset.asset}...`)}
                                    >
                                        <ExternalLink size={14} /> Open scoped reports
                                    </button>
                                    <button
                                        type="button"
                                        className="gov-btn-secondary"
                                        onClick={handleCreateMaintenanceReview}
                                    >
                                        <Wrench size={14} /> Create maintenance review
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Spatial Barangay Distribution Table (Analytics Tab view) */}
                    {activeTab === 'analytics' && (
                        <div className="insights-section-card" style={{ marginTop: 8 }}>
                            <div className="insights-card-header">
                                <div>
                                    <h3>North Caloocan Sectoral Barangay Distribution</h3>
                                    <p className="insights-card-sub">Operational density and statutory SLA resolution rates across administrative divisions</p>
                                </div>
                            </div>
                            <div className="records-table-wrapper">
                                <table className="records-table">
                                    <thead>
                                        <tr>
                                            <th>Barangay Sector</th>
                                            <th>Active Work Orders</th>
                                            <th>Resolved Orders</th>
                                            <th>SLA Compliance</th>
                                            <th>Infrastructure Health</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {BARANGAY_DISTRIBUTION.map((b, i) => (
                                            <tr key={i}>
                                                <td><strong>{b.barangay}</strong></td>
                                                <td>{b.active_wo} active</td>
                                                <td>{b.resolved} resolved</td>
                                                <td><span style={{ fontWeight: 700, color: 'var(--gov-action)' }}>{b.sla_rate}</span></td>
                                                <td>
                                                    <span className={`gov-state-badge is-${b.health === 'Good' ? 'completed' : b.health === 'Watch' ? 'assigned' : 'in_progress'}`}>
                                                        {b.health}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Create Maintenance Review Modal */}
            {isMaintenanceModalOpen && (
                <div className="records-modal-overlay" role="dialog" aria-modal="true">
                    <form className="records-modal-card" onSubmit={handleMaintenanceSubmit}>
                        <div className="records-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                    Create Preventive Maintenance Review
                                </h3>
                                <div style={{ fontSize: 12, color: 'var(--gov-text-secondary)', marginTop: 2 }}>
                                    Target Asset: {selectedPredictiveAsset.asset} (Risk Score: {selectedPredictiveAsset.risk})
                                </div>
                            </div>
                            <button
                                type="button"
                                className="citizen-reports-icon-button"
                                onClick={() => setIsMaintenanceModalOpen(false)}
                                aria-label="Close modal"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="records-modal-body">
                            <div className="records-form-grid">
                                <div>
                                    <label className="records-form-label">Asset & Predicted Anomaly</label>
                                    <div style={{ padding: '8px 10px', background: 'var(--gov-canvas)', borderRadius: 6, fontSize: 12 }}>
                                        <strong>{selectedPredictiveAsset.asset}</strong> — {selectedPredictiveAsset.issue} (Confidence: {selectedPredictiveAsset.confidence})
                                    </div>
                                </div>
                                <div>
                                    <label className="records-form-label">Recommended Preventive Action</label>
                                    <div style={{ padding: '8px 10px', background: 'var(--gov-canvas)', borderRadius: 6, fontSize: 12, color: 'var(--gov-text)' }}>
                                        {selectedPredictiveAsset.recommendation}
                                    </div>
                                </div>
                                <div>
                                    <label className="records-form-label" htmlFor="maint-notes">
                                        Engineering Review Notes & Crew Allocation *
                                    </label>
                                    <textarea
                                        id="maint-notes"
                                        required
                                        rows={3}
                                        className="records-form-input"
                                        style={{ height: 'auto', padding: '8px 10px' }}
                                        placeholder="Specify equipment requirements, traffic coordination, and designated crew lead..."
                                        value={maintenanceNotes}
                                        onChange={(e) => setMaintenanceNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="records-modal-footer">
                            <button
                                type="button"
                                className="gov-btn-secondary"
                                onClick={() => setIsMaintenanceModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="gov-btn-primary"
                            >
                                <Wrench size={14} /> Dispatch Preventive Review Order
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
