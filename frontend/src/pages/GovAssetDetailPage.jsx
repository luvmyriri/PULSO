import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    MapPin,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Wrench,
    AlertTriangle,
    Plus,
    X,
    ExternalLink,
    Activity,
    Layers
} from '../icons';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import './citizen-reports.css';

export default function GovAssetDetailPage() {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const token = getAuthToken();
    const [user] = useState(() => getAuthUser());

    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    // Condition Assessment Modal
    const [inspectModalOpen, setInspectModalOpen] = useState(false);
    const [conditionScore, setConditionScore] = useState(75);
    const [assessmentNotes, setAssessmentNotes] = useState('');
    const [submittingAssessment, setSubmittingAssessment] = useState(false);
    const [modalError, setModalError] = useState('');

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 5000);
    };

    const fetchAssetDetail = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentToken = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/gov/assets/${encodeURIComponent(assetId)}`, {
                headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
            });
            if (!res.ok) throw new Error(`Asset not found (HTTP ${res.status})`);
            const data = await res.json();
            setAsset(data);
        } catch (err) {
            setError(err.message || 'Unable to load asset docket.');
            setAsset(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssetDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assetId]);

    const handleRecordAssessment = async (e) => {
        e.preventDefault();
        setModalError('');
        setSubmittingAssessment(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/assets/${encodeURIComponent(assetId)}/inspections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    condition_score: parseFloat(conditionScore),
                    notes: assessmentNotes.trim() || 'Periodic engineering inspection recorded.'
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Failed to log condition inspection (HTTP ${res.status})`);
            }

            showToast('Condition assessment recorded successfully.');
            setInspectModalOpen(false);
            setAssessmentNotes('');
            fetchAssetDetail();
        } catch (err) {
            setModalError(err.message || 'Failed to submit inspection');
        } finally {
            setSubmittingAssessment(false);
        }
    };

    const conditionBadge = (tier) => {
        const t = (tier || 'unknown').toLowerCase();
        let color = 'var(--gov-text-secondary)';
        let bg = 'var(--gov-surface-subtle)';
        if (t === 'good') { color = 'var(--gov-resolved, #0f766e)'; bg = 'rgba(15, 118, 110, 0.1)'; }
        else if (t === 'fair') { color = '#0284c7'; bg = 'rgba(2, 132, 199, 0.1)'; }
        else if (t === 'poor') { color = '#d97706'; bg = 'rgba(217, 119, 6, 0.1)'; }
        else if (t === 'critical') { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.1)'; }

        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                color,
                background: bg,
                textTransform: 'capitalize'
            }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} />
                {tier || 'Unassessed'}
            </span>
        );
    };

    return (
        <div className="citizen-reports-page">
            <GovSidebar currentUser={user} />
            <div className="citizen-reports-shell">
                <header className="citizen-reports-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/gov/assets')}
                            className="citizen-reports-back-button"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--gov-text-secondary)',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600
                            }}
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Assets</span>
                        </button>
                        <span style={{ color: 'var(--gov-rule)' }}>|</span>
                        <div className="flex flex-col text-left">
                            <GovBreadcrumb items={[
                                { label: 'Home', to: '/gov/dashboard' },
                                { label: 'Infrastructure', to: '/gov/assets' },
                                { label: 'Asset Register', to: '/gov/assets' },
                                { label: `Asset ${assetId}` }
                            ]} />
                            <h1 className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">Asset Docket: {assetId}</h1>
                        </div>
                    </div>

                    <div className="citizen-reports-topbar__actions">
                        {toastMessage && (
                            <div className="citizen-reports-toast-pill" role="status">
                                <CheckCircle2 size={14} style={{ color: 'var(--gov-resolved, #0f766e)' }} />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <ThemeToggle />
                        <button
                            type="button"
                            className="citizen-reports-icon-button"
                            onClick={fetchAssetDetail}
                            aria-label="Refresh asset docket"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={user} />
                    </div>
                </header>

                <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '24px 32px 80px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                    {loading && (
                        <div className="citizen-reports-list" style={{ marginTop: '20px' }}>
                            <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                            <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                        </div>
                    )}

                    {error && (
                        <div className="citizen-reports-state is-error">
                            <AlertTriangle size={24} />
                            <div>
                                <strong>Asset Record Error</strong>
                                <p>{error}</p>
                                <button type="button" onClick={() => navigate('/gov/assets')} style={{ marginTop: '8px' }}>
                                    Return to Assets Register
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && !error && asset && (
                        <div>
                            {/* Asset Header Card */}
                            <div style={{
                                padding: '20px 24px',
                                background: 'var(--gov-surface)',
                                border: '1px solid var(--gov-rule)',
                                borderRadius: '10px',
                                marginBottom: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                                gap: '16px'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--gov-action, #0b4f6c)' }}>
                                            {asset.asset_id}
                                        </span>
                                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--gov-surface-subtle)', border: '1px solid var(--gov-rule)' }}>
                                            {asset.category || 'Roads'}
                                        </span>
                                    </div>
                                    <h2 style={{ margin: '8px 0 4px', fontSize: '22px', fontWeight: 700, color: 'var(--gov-text)' }}>
                                        {asset.asset_name}
                                    </h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gov-text-secondary)', fontSize: '13px' }}>
                                        <MapPin size={14} />
                                        <span>{asset.barangay || 'Caloocan City'}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', marginBottom: '4px' }}>Condition Status</div>
                                        {conditionBadge(asset.condition_tier)}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setInspectModalOpen(true)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 14px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            background: 'var(--gov-action, #0b4f6c)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <ShieldCheck size={15} />
                                        Log Inspection
                                    </button>
                                </div>
                            </div>

                            {/* Two-column Specifications and Risk */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                                {/* Asset Specifications */}
                                <div style={{ padding: '20px', background: 'var(--gov-surface)', border: '1px solid var(--gov-rule)', borderRadius: '10px' }}>
                                    <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: 'var(--gov-text)' }}>
                                        Engineering Specifications
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Material Composition:</span>
                                            <strong style={{ color: 'var(--gov-text)' }}>{asset.material_type || 'Reinforced Concrete'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Design Life:</span>
                                            <strong style={{ color: 'var(--gov-text)' }}>{asset.design_life ? `${asset.design_life} years` : '25 years'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Current Condition Score:</span>
                                            <strong style={{ color: 'var(--gov-text)' }}>{asset.condition_score ? `${Math.round(asset.condition_score)} / 100` : 'Not assessed'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Jurisdiction / Maintenance:</span>
                                            <strong style={{ color: 'var(--gov-text)' }}>City Engineering Department</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Deterioration & Risk Indicator */}
                                <div style={{ padding: '20px', background: 'var(--gov-surface)', border: '1px solid var(--gov-rule)', borderRadius: '10px' }}>
                                    <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: 'var(--gov-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Activity size={16} style={{ color: 'var(--gov-action, #0b4f6c)' }} />
                                        Deterioration & Environmental Context
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Deterioration Velocity:</span>
                                            <strong style={{ color: 'var(--gov-text)' }}>
                                                {asset.deterioration_velocity ? `${asset.deterioration_velocity} pts/year` : '0.8 pts/year (Baseline)'}
                                            </strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Rainy Season Vulnerability:</span>
                                            <strong style={{ color: '#b45309' }}>Monitored (Culvert flood risk)</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Suggested Next Inspection:</span>
                                            <strong style={{ color: 'var(--gov-text)' }}>Quarterly cycle (within 60 days)</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Active Work Orders */}
                            <div style={{
                                padding: '20px',
                                background: 'var(--gov-surface)',
                                border: '1px solid var(--gov-rule)',
                                borderRadius: '10px',
                                marginBottom: '20px'
                            }}>
                                <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: 'var(--gov-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Wrench size={16} style={{ color: 'var(--gov-action, #0b4f6c)' }} />
                                    Active Work Orders on Asset ({asset.active_work_orders?.length || 0})
                                </h3>
                                {(!asset.active_work_orders || asset.active_work_orders.length === 0) ? (
                                    <div style={{ fontSize: '12px', color: 'var(--gov-text-secondary)', padding: '10px 0' }}>
                                        No active work orders currently scheduled for this asset.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {asset.active_work_orders.map((wo) => (
                                            <div
                                                key={wo.id}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '10px 14px',
                                                    background: 'var(--gov-surface-subtle)',
                                                    border: '1px solid var(--gov-rule)',
                                                    borderRadius: '6px',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                <div>
                                                    <strong style={{ color: 'var(--gov-text)' }}>{wo.title}</strong>
                                                    <div style={{ color: 'var(--gov-text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                                                        Status: {wo.status} · Priority: {wo.priority}
                                                    </div>
                                                </div>
                                                <Link
                                                    to={`/gov/work-orders?wo=${wo.id}`}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--gov-action, #0b4f6c)', fontWeight: 600 }}
                                                >
                                                    View Order <ExternalLink size={12} />
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Chronological Maintenance History */}
                            <div style={{
                                padding: '20px',
                                background: 'var(--gov-surface)',
                                border: '1px solid var(--gov-rule)',
                                borderRadius: '10px'
                            }}>
                                <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: 'var(--gov-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={16} style={{ color: 'var(--gov-action, #0b4f6c)' }} />
                                    Maintenance & Inspection History
                                </h3>
                                {(!asset.maintenance_history || asset.maintenance_history.length === 0) ? (
                                    <div style={{ fontSize: '12px', color: 'var(--gov-text-secondary)', padding: '10px 0' }}>
                                        Initial asset registration on record. No historical repair logs logged yet.
                                    </div>
                                ) : (
                                    <div className="citizen-report-history">
                                        {asset.maintenance_history.map((hist, idx) => (
                                            <div key={idx}>
                                                <span />
                                                <p>
                                                    <strong>{hist.intervention_type || hist.action || 'Inspection / Maintenance'}</strong>
                                                    <small>{hist.notes || 'Routine condition assessment verified'}</small>
                                                    <small style={{ color: 'var(--gov-text-secondary)', marginTop: '2px' }}>
                                                        {hist.created_at ? new Date(hist.created_at).toLocaleDateString() : 'Historical log'}
                                                    </small>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Condition Assessment Modal */}
            {inspectModalOpen && (
                <div className="gov-sheet-backdrop" onClick={() => setInspectModalOpen(false)}>
                    <div className="gov-sheet-drawer" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="gov-sheet-header">
                            <div className="gov-sheet-title-row">
                                <ShieldCheck size={20} className="gov-modal-icon-blue" />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Log Asset Inspection</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--gov-text-secondary)' }}>
                                        Asset {assetId} · Engineering Quality Inspection
                                    </p>
                                </div>
                            </div>
                            <button type="button" className="gov-modal-close" onClick={() => setInspectModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {modalError && (
                            <div style={{
                                margin: '16px 24px 0',
                                padding: '10px 14px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid #ef4444',
                                borderRadius: '6px',
                                color: '#dc2626',
                                fontSize: '12px'
                            }}>
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleRecordAssessment} className="gov-sheet-form">
                            <div className="gov-sheet-field-group">
                                <label className="gov-modal-label">Condition Assessment Score (0 - 100)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={conditionScore}
                                        onChange={(e) => setConditionScore(Number(e.target.value))}
                                        style={{ flex: 1, accentColor: 'var(--gov-action, #0b4f6c)' }}
                                    />
                                    <span style={{ fontSize: '16px', fontWeight: 700, width: '45px', textAlign: 'right', color: 'var(--gov-text)' }}>
                                        {conditionScore}%
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--gov-text-secondary)', marginTop: '4px' }}>
                                    <span>0 - Critical Failure</span>
                                    <span>50 - Fair / Worn</span>
                                    <span>100 - Good / As Built</span>
                                </div>
                            </div>

                            <div className="gov-sheet-field-group">
                                <label className="gov-modal-label">Inspector Assessment Notes</label>
                                <textarea
                                    className="gov-modal-textarea"
                                    rows={3}
                                    placeholder="Enter physical observations, surface cracks, drainage clearance, or wear and tear..."
                                    value={assessmentNotes}
                                    onChange={(e) => setAssessmentNotes(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="gov-sheet-actions">
                                <button
                                    type="button"
                                    className="gov-modal-btn-cancel"
                                    onClick={() => setInspectModalOpen(false)}
                                    disabled={submittingAssessment}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="gov-modal-btn-submit"
                                    disabled={submittingAssessment}
                                    style={{
                                        background: 'var(--gov-action, #0b4f6c)',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '8px 18px',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '13px'
                                    }}
                                >
                                    {submittingAssessment ? 'Recording...' : 'Record Inspection'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
