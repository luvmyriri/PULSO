import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Building2,
    Search,
    RefreshCw,
    Plus,
    Filter,
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    MapPin,
    ArrowRight,
    CheckCircle2,
    Calendar,
    FileText,
    Inbox,
    AlertCircle,
    X,
    Layers,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import OrangeSelect from '../components/OrangeSelect';
import SearchInput from '../components/SearchInput';
import TablePagination from '../components/TablePagination';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import './citizen-reports.css';
import './records-workspace.css';
import './administration-workspace.css';

const ASSET_CATEGORIES = [
    { key: 'all', label: 'All Assets' },
    { key: 'Roads', label: 'Roads' },
    { key: 'Drainage', label: 'Drainage' },
    { key: 'Bridges', label: 'Bridges' },
    { key: 'Public Buildings', label: 'Public Buildings' },
    { key: 'Facilities', label: 'Facilities' }
];

const CONDITION_FILTERS = [
    { value: 'all', label: 'All Conditions', description: 'Show all condition levels' },
    { value: 'good', label: 'Good', description: 'Optimal integrity, standard maintenance' },
    { value: 'fair', label: 'Fair', description: 'Minor wear, scheduled monitoring' },
    { value: 'poor', label: 'Poor', description: 'Deteriorated, repair recommended' },
    { value: 'critical', label: 'Critical', description: 'Severe defects, immediate attention' }
];

const MODAL_CATEGORIES = [
    { value: 'Roads', label: 'Roads', description: 'Highways, avenues, street pavements' },
    { value: 'Drainage', label: 'Drainage', description: 'Canals, culverts, flood control' },
    { value: 'Bridges', label: 'Bridges', description: 'Overpasses, footbridges, viaducts' },
    { value: 'Public Buildings', label: 'Public Buildings', description: 'Barangay halls, municipal centers' },
    { value: 'Facilities', label: 'Facilities', description: 'Parks, streetlights, pumping stations' },
];

export default function GovAssetsPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const token = getAuthToken();
    const [user] = useState(() => getAuthUser());

    const [assets, setAssets] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    // Form state for new asset registration
    const [newAsset, setNewAsset] = useState({
        asset_id: '',
        asset_name: '',
        category: 'Roads',
        material_type: 'Reinforced Concrete',
        design_life: 25,
        barangay: 'Barangay 171',
        condition_score: 85.0
    });
    const [submittingAsset, setSubmittingAsset] = useState(false);
    const [modalError, setModalError] = useState('');

    const categoryParam = params.get('category') || 'all';
    const conditionParam = params.get('condition') || 'all';
    const searchQuery = params.get('search') || '';
    const assetParam = params.get('asset') || null;

    const [selectedAssetId, setSelectedAssetId] = useState(assetParam);

    useEffect(() => {
        if (assetParam !== selectedAssetId) {
            setSelectedAssetId(assetParam);
        }
    }, [assetParam]);

    const selectedAsset = useMemo(() => {
        if (!selectedAssetId) return null;
        return assets.find((a) => (
            (a.asset_id && a.asset_id === selectedAssetId) ||
            (a.id != null && String(a.id) === String(selectedAssetId))
        )) || null;
    }, [assets, selectedAssetId]);

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 5000);
    };

    const updateParam = (key, val) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            if (!val || val === 'all') next.delete(key);
            else next.set(key, val);
            return next;
        }, { replace: true });
    };

    const fetchAssetsAndStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentToken = getAuthToken();
            const authHeaders = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
            const catQuery = categoryParam !== 'all' ? `?category=${encodeURIComponent(categoryParam)}` : '';
            const [assetsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/gov/assets${catQuery}`, {
                    headers: authHeaders
                }),
                fetch(`${API_BASE_URL}/api/gov/assets/stats`, {
                    headers: authHeaders
                })
            ]);

            if (!assetsRes.ok) {
                if (assetsRes.status === 401) {
                    throw new Error('Session authentication expired or missing (HTTP 401). Please re-authenticate.');
                }
                throw new Error(`Assets fetch failed (HTTP ${assetsRes.status})`);
            }
            const assetsData = await assetsRes.json();
            setAssets(Array.isArray(assetsData) ? assetsData : []);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
        } catch (err) {
            setError(err.message || 'Failed to load assets register');
            setAssets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssetsAndStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryParam]);

    const filteredAssets = useMemo(() => {
        return assets.filter((asset) => {
            if (conditionParam !== 'all') {
                const tier = (asset.condition_tier || '').toLowerCase();
                if (tier !== conditionParam) return false;
            }

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const code = (asset.asset_id || '').toLowerCase();
                const name = (asset.asset_name || '').toLowerCase();
                const brgy = (asset.barangay || '').toLowerCase();
                return code.includes(q) || name.includes(q) || brgy.includes(q);
            }
            return true;
        });
    }, [assets, conditionParam, searchQuery]);

    // ── Pagination State (Default: 10 items per page) ──────────────────────────
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(() => {
        const p = parseInt(params.get('page') || '1', 10);
        return isNaN(p) || p < 1 ? 1 : p;
    });

    const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));

    // Reset to page 1 whenever filters or search query change
    useEffect(() => {
        setCurrentPage(1);
    }, [categoryParam, conditionParam, searchQuery]);

    // Keep currentPage within bounds if totalPages decreases
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredAssets.length);

    const paginatedAssets = useMemo(() => {
        return filteredAssets.slice(startIndex, endIndex);
    }, [filteredAssets, startIndex, endIndex]);

    const handlePageChange = (newPage) => {
        const clamped = Math.max(1, Math.min(newPage, totalPages));
        setCurrentPage(clamped);
        updateParam('page', clamped === 1 ? null : String(clamped));
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        }
        if (currentPage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    };

    const conditionCounts = useMemo(() => {
        if (stats?.categories) {
            return Object.values(stats.categories).reduce((acc, cat) => {
                const cb = cat.condition_breakdown || {};
                acc.good += cb.good || 0;
                acc.fair += cb.fair || 0;
                acc.poor += cb.poor || 0;
                acc.critical += cb.critical || 0;
                return acc;
            }, { good: 0, fair: 0, poor: 0, critical: 0 });
        }
        return assets.reduce((acc, a) => {
            const tier = (a.condition_tier || '').toLowerCase();
            if (tier in acc) acc[tier]++;
            return acc;
        }, { good: 0, fair: 0, poor: 0, critical: 0 });
    }, [stats, assets]);

    const handleCreateAsset = async (e) => {
        e.preventDefault();
        setModalError('');
        setSubmittingAsset(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/assets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newAsset)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Failed to create asset (HTTP ${res.status})`);
            }

            showToast(`Asset ${newAsset.asset_id} registered successfully.`);
            setCreateModalOpen(false);
            setNewAsset({
                asset_id: '',
                asset_name: '',
                category: 'Roads',
                material_type: 'Reinforced Concrete',
                design_life: 25,
                barangay: 'Barangay 171',
                condition_score: 85.0
            });
            fetchAssetsAndStats();
        } catch (err) {
            setModalError(err.message || 'Failed to register new asset');
        } finally {
            setSubmittingAsset(false);
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
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                color,
                background: bg,
                textTransform: 'capitalize'
            }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                {tier || 'Unassessed'}
            </span>
        );
    };

    return (
        <div className="citizen-reports-page">
            <GovSidebar currentUser={user} />
            <div className="citizen-reports-shell">
                <header className="citizen-reports-topbar">
                    <div className="flex flex-col text-left">
                        <GovBreadcrumb category="Infrastructure" current="Asset Register" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">
                            Physical Infrastructure Assets
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Authoritative municipal register for roads, drainage, bridges, and public facilities.</p>
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
                            onClick={fetchAssetsAndStats}
                            aria-label="Refresh asset register"
                            title="Refresh assets"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={user} />
                    </div>
                </header>

                <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '20px 24px 60px' }}>
                    {/* Top KPI Metric Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ padding: '16px', background: 'var(--gov-surface)', border: '1px solid var(--gov-rule)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Registered Assets</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--gov-text)' }}>
                                {stats?.total_assets ?? assets.length}
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: 'var(--gov-surface)', border: '1px solid var(--gov-rule)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Good Condition</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--gov-resolved, #0f766e)' }}>
                                {conditionCounts.good}
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: 'var(--gov-surface)', border: '1px solid var(--gov-rule)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fair Condition</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#0284c7' }}>
                                {conditionCounts.fair}
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: 'var(--gov-surface)', border: '1px solid var(--gov-rule)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Poor / Deteriorated</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#d97706' }}>
                                {conditionCounts.poor}
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: 'var(--gov-surface)', border: '1px solid var(--gov-rule)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Critical / Needs Repair</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#ef4444' }}>
                                {stats?.total_critical_assets ?? conditionCounts.critical}
                            </div>
                        </div>
                    </div>

                    {/* Category Tab Bar & Action Button */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--gov-rule)',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            {ASSET_CATEGORIES.map((cat) => {
                                const isActive = categoryParam === cat.key;
                                const categoryStat = stats?.categories?.[cat.key];
                                const count = typeof categoryStat === 'object'
                                    ? (categoryStat?.total_count ?? 0)
                                    : (categoryStat ?? 0);

                                return (
                                    <button
                                        key={cat.key}
                                        type="button"
                                        onClick={() => updateParam('category', cat.key)}
                                        style={{
                                            padding: '10px 4px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: isActive ? '2px solid var(--gov-action, #ff6b00)' : '2px solid transparent',
                                            color: isActive ? 'var(--gov-action, #ff6b00)' : 'var(--gov-text-secondary)',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span>{cat.label}</span>
                                        {cat.key !== 'all' && stats?.categories && categoryStat !== undefined && (
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '1px 6px',
                                                borderRadius: '10px',
                                                background: 'var(--gov-surface-subtle)',
                                                border: '1px solid var(--gov-rule)'
                                            }}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setCreateModalOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#ffffff',
                                background: 'var(--gov-action, #ff6b00)',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={15} /> Register Asset
                        </button>
                    </div>

                    {/* Filter Bar: Search & Condition Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <SearchInput
                            value={searchQuery}
                            onChange={(val) => updateParam('search', val)}
                            placeholder="Search issue, location or category"
                            ariaLabel="Search issue, location or category"
                            onClear={() => updateParam('search', '')}
                            className="w-full sm:w-[320px] md:w-[360px]"
                        />

                        <OrangeSelect
                            value={conditionParam}
                            onChange={(val) => updateParam('condition', val)}
                            options={CONDITION_FILTERS}
                            size="md"
                            minWidth="200px"
                            align="right"
                            searchable={false}
                        />
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="citizen-reports-state is-error" style={{ marginBottom: '16px' }}>
                            <AlertCircle size={20} />
                            <div>
                                <strong>Unable to load assets</strong>
                                <p>{error}</p>
                                <button type="button" onClick={fetchAssetsAndStats} style={{ marginTop: '8px' }}>
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="citizen-reports-list">
                            <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                            <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                            <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && filteredAssets.length === 0 && (
                        <div className="citizen-reports-state" style={{ minHeight: '300px' }}>
                            <Inbox size={32} />
                            <div>
                                <strong>No physical assets found</strong>
                                <p>
                                    {searchQuery || categoryParam !== 'all' || conditionParam !== 'all'
                                        ? 'No asset records matched your current search and filter settings.'
                                        : 'No physical assets are currently registered in this municipal category.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Assets Table & Detail Rail */}
                    {!loading && !error && filteredAssets.length > 0 && (
                        <div className="admin-layout-split">
                            <div className="admin-table-wrapper flex flex-col justify-between overflow-hidden">
                                <div className="overflow-x-auto w-full">
                                    <table className="records-table" aria-label="Physical infrastructure assets table">
                                        <thead>
                                            <tr>
                                                <th>Asset Code</th>
                                                <th>Asset Name & Location</th>
                                                <th>Category</th>
                                                <th>Condition</th>
                                                <th>Integrity Score</th>
                                                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedAssets.map((asset) => {
                                                const assetCode = asset.asset_id || (asset.id != null ? `CAL-AST-${String(asset.id).padStart(4, '0')}` : 'CAL-AST-0000');
                                                const isSelected = Boolean(
                                                    selectedAsset &&
                                                    (
                                                        (asset.asset_id && selectedAsset.asset_id === asset.asset_id) ||
                                                        (asset.id != null && selectedAsset.id != null && String(selectedAsset.id) === String(asset.id))
                                                    )
                                                );
                                                return (
                                                    <tr
                                                        key={asset.asset_id || asset.id}
                                                        className={isSelected ? 'is-selected' : ''}
                                                        onClick={() => {
                                                            const targetId = asset.asset_id || (asset.id != null ? String(asset.id) : null);
                                                            if (!targetId) return;
                                                            const nextId = isSelected ? null : targetId;
                                                            setSelectedAssetId(nextId);
                                                            updateParam('asset', nextId);
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                const targetId = asset.asset_id || (asset.id != null ? String(asset.id) : null);
                                                                if (!targetId) return;
                                                                const nextId = isSelected ? null : targetId;
                                                                setSelectedAssetId(nextId);
                                                                updateParam('asset', nextId);
                                                            }
                                                        }}
                                                    >
                                                        <td>
                                                            <div className="records-signal-marker-cell">
                                                                {isSelected && <span className="records-signal-cut" />}
                                                                <span
                                                                    className="records-cell-mono"
                                                                    style={{
                                                                        color: isSelected ? 'var(--gov-action, #ff6b00)' : 'var(--gov-text, #132238)',
                                                                        fontWeight: isSelected ? 700 : 600
                                                                    }}
                                                                >
                                                                    {assetCode}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div>
                                                                <strong style={{ color: 'var(--gov-text, #132238)', display: 'block' }}>
                                                                    {asset.asset_name || 'Civil Infrastructure Asset'}
                                                                </strong>
                                                                <div style={{ fontSize: 11, color: 'var(--gov-text-secondary, #465d6c)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                                    <MapPin size={11} /> {asset.barangay || 'Caloocan City'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span style={{ fontSize: 12, color: 'var(--gov-text-secondary, #465d6c)' }}>
                                                                {asset.category || 'Roads'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {conditionBadge(asset.condition_tier)}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ width: 48, height: 6, borderRadius: 3, background: 'var(--gov-rule, #cbd5e1)', overflow: 'hidden' }}>
                                                                    <div
                                                                        style={{
                                                                            height: '100%',
                                                                            width: `${Math.min(100, Math.max(0, asset.condition_score || 0))}%`,
                                                                            background: (asset.condition_score || 0) >= 80 ? 'var(--gov-resolved, #0f766e)' : (asset.condition_score || 0) >= 60 ? '#0284c7' : (asset.condition_score || 0) >= 40 ? '#d97706' : '#ef4444'
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="records-cell-mono" style={{ fontSize: 11 }}>
                                                                    {asset.condition_score ? `${Math.round(asset.condition_score)}%` : 'N/A'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                                                            <div style={{ display: 'inline-flex', color: isSelected ? 'var(--gov-action, #ff6b00)' : 'var(--gov-text-secondary, #465d6c)' }}>
                                                                <ArrowRight size={15} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Table Pagination Footer */}
                                {filteredAssets.length > 0 && (
                                    <TablePagination
                                        page={currentPage}
                                        pageSize={pageSize}
                                        total={filteredAssets.length}
                                        itemLabel="assets"
                                        onPageChange={handlePageChange}
                                    />
                                )}
                            </div>

                            {/* Right Rail: Asset Profile & Registry */}
                            <AnimatePresence initial={false}>
                                {selectedAsset && (
                                    <motion.aside
                                        key="asset-editor-rail"
                                        initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                        animate={{ width: 440, opacity: 1, marginLeft: 20 }}
                                        exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                        className="admin-editor-rail"
                                    >
                                        <div className="admin-editor-card">
                                            <div className="admin-editor-header flex items-center justify-between">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="records-docket-signal-cut shrink-0" />
                                                    <div className="min-w-0">
                                                        <h3>Asset Profile & Registry</h3>
                                                        <span className="admin-editor-sub">
                                                            Municipal infrastructure docket & integrity record
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedAssetId(null);
                                                        updateParam('asset', null);
                                                    }}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                                    title="Close asset panel"
                                                    aria-label="Close asset panel"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            {/* Instant inner card update when switching asset */}
                                            <motion.div
                                                key={selectedAsset.asset_id || selectedAsset.id}
                                                initial={{ opacity: 0.6 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.1 }}
                                                className="flex flex-col gap-4"
                                            >
                                                {/* Asset Profile Summary */}
                                                <div className="admin-profile-summary">
                                                    <div className="admin-profile-avatar" style={{ background: 'var(--gov-surface-card, #f8fafc)', border: '1px solid var(--gov-rule, #cbd5e1)' }}>
                                                        <Building2 size={22} style={{ color: 'var(--gov-action, #0b4f6c)' }} />
                                                    </div>
                                                    <div className="admin-profile-details">
                                                        <h4>{selectedAsset.asset_name || 'Civil Infrastructure Asset'}</h4>
                                                        <div className="admin-profile-meta">
                                                            <span className="records-cell-mono">{selectedAsset.asset_id || `CAL-AST-${String(selectedAsset.id).padStart(4, '0')}`}</span>
                                                            <span>•</span>
                                                            <span>{selectedAsset.category || 'Roads'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Stats Grid */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <div style={{ padding: '10px 12px', background: 'var(--gov-surface, #ffffff)', border: '1px solid var(--gov-rule, #cbd5e1)', borderRadius: '6px' }}>
                                                        <span style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Condition Tier</span>
                                                        <div style={{ marginTop: '4px' }}>
                                                            {conditionBadge(selectedAsset.condition_tier)}
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '10px 12px', background: 'var(--gov-surface, #ffffff)', border: '1px solid var(--gov-rule, #cbd5e1)', borderRadius: '6px' }}>
                                                        <span style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Integrity Score</span>
                                                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gov-text)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', display: 'block', marginTop: '2px' }}>
                                                            {selectedAsset.condition_score ? `${Math.round(selectedAsset.condition_score)}%` : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Specifications Box */}
                                                <div className="admin-permissions-box">
                                                    <div className="admin-permissions-title">
                                                        Infrastructure Specifications
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gov-rule, rgba(0,0,0,0.06))', paddingBottom: '6px' }}>
                                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Location / Barangay</span>
                                                            <span style={{ fontWeight: 600, color: 'var(--gov-text)' }}>{selectedAsset.barangay || 'Caloocan City'}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gov-rule, rgba(0,0,0,0.06))', paddingBottom: '6px' }}>
                                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Material Composition</span>
                                                            <span style={{ fontWeight: 600, color: 'var(--gov-text)' }}>{selectedAsset.material_type || 'Reinforced Concrete'}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gov-rule, rgba(0,0,0,0.06))', paddingBottom: '6px' }}>
                                                            <span style={{ color: 'var(--gov-text-secondary)' }}>Design Life</span>
                                                            <span style={{ fontWeight: 600, color: 'var(--gov-text)' }}>{selectedAsset.design_life ? `${selectedAsset.design_life} Years` : 'Standard (25 Yrs)'}</span>
                                                        </div>
                                                        {selectedAsset.installed_year && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gov-rule, rgba(0,0,0,0.06))', paddingBottom: '6px' }}>
                                                                <span style={{ color: 'var(--gov-text-secondary)' }}>Commissioned Year</span>
                                                                <span style={{ fontWeight: 600, color: 'var(--gov-text)' }}>{selectedAsset.installed_year}</span>
                                                            </div>
                                                        )}
                                                        {selectedAsset.last_inspected && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: 'var(--gov-text-secondary)' }}>Last Inspection</span>
                                                                <span style={{ fontWeight: 600, color: 'var(--gov-text)' }}>{new Date(selectedAsset.last_inspected).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <div className="admin-editor-actions" style={{ marginTop: '8px' }}>
                                                    <button
                                                        type="button"
                                                        className="gov-btn-primary inline-flex items-center justify-center gap-1.5 w-full"
                                                        onClick={() => navigate(`/gov/assets/${encodeURIComponent(selectedAsset.asset_id || selectedAsset.id)}`)}
                                                    >
                                                        <FileText size={15} />
                                                        <span>Open Full Asset Record</span>
                                                        <ArrowRight size={14} style={{ marginLeft: 4 }} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.aside>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Register Asset Modal */}
            <AnimatePresence>
                {createModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="gov-sheet-backdrop"
                        onClick={() => setCreateModalOpen(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                            className="gov-sheet-drawer"
                            style={{ maxWidth: '580px' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="gov-sheet-header">
                                <div className="gov-sheet-title-row">
                                    <Building2 size={20} className="gov-modal-icon-blue" />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Register Physical Asset</h3>
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--gov-text-secondary)' }}>
                                            Add infrastructure object to municipal asset inventory
                                        </p>
                                    </div>
                                </div>
                                <button type="button" className="gov-modal-close" onClick={() => setCreateModalOpen(false)}>
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

                            <form onSubmit={handleCreateAsset} className="gov-sheet-form">
                                <div className="gov-sheet-field-group">
                                    <label className="gov-modal-label">Asset Identifier (Asset Code)</label>
                                    <input
                                        type="text"
                                        className="gov-modal-input"
                                        placeholder="e.g. CAL-RD-BAGONG-01"
                                        value={newAsset.asset_id}
                                        onChange={(e) => setNewAsset({ ...newAsset, asset_id: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="gov-sheet-field-group">
                                    <label className="gov-modal-label">Asset Name / Street Description</label>
                                    <input
                                        type="text"
                                        className="gov-modal-input"
                                        placeholder="e.g. Bagong Silang Access Spine"
                                        value={newAsset.asset_name}
                                        onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="gov-sheet-field-group">
                                    <label className="gov-modal-label">Category</label>
                                    <OrangeSelect
                                        value={newAsset.category}
                                        onChange={(val) => setNewAsset({ ...newAsset, category: val })}
                                        options={MODAL_CATEGORIES}
                                        size="md"
                                        minWidth="100%"
                                        searchable={false}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="gov-sheet-field-group">
                                        <label className="gov-modal-label">Material Composition</label>
                                        <input
                                            type="text"
                                            className="gov-modal-input"
                                            value={newAsset.material_type}
                                            onChange={(e) => setNewAsset({ ...newAsset, material_type: e.target.value })}
                                            placeholder="e.g. Asphalt Concrete"
                                            required
                                        />
                                    </div>
                                    <div className="gov-sheet-field-group">
                                        <label className="gov-modal-label">Design Life (Years)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            className="gov-modal-input"
                                            value={newAsset.design_life}
                                            onChange={(e) => setNewAsset({ ...newAsset, design_life: parseInt(e.target.value) || 25 })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="gov-sheet-field-group">
                                    <label className="gov-modal-label">Barangay Jurisdiction</label>
                                    <input
                                        type="text"
                                        className="gov-modal-input"
                                        placeholder="e.g. Barangay 176"
                                        value={newAsset.barangay}
                                        onChange={(e) => setNewAsset({ ...newAsset, barangay: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="gov-sheet-field-group">
                                    <label className="gov-modal-label">Initial Integrity / Condition Score (0–100%)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input
                                            type="range"
                                            min="1"
                                            max="100"
                                            value={newAsset.condition_score}
                                            onChange={(e) => setNewAsset({ ...newAsset, condition_score: parseFloat(e.target.value) })}
                                            style={{ flex: 1, accentColor: 'var(--gov-action, #ff6b00)' }}
                                        />
                                        <span style={{
                                            fontWeight: 700,
                                            fontFamily: 'monospace',
                                            fontSize: '14px',
                                            minWidth: '45px',
                                            textAlign: 'right'
                                        }}>
                                            {Math.round(newAsset.condition_score)}%
                                        </span>
                                    </div>
                                </div>

                                <div className="gov-sheet-footer" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button
                                        type="button"
                                        className="gov-btn-secondary"
                                        onClick={() => setCreateModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="gov-btn-primary"
                                        disabled={submittingAsset}
                                    >
                                        {submittingAsset ? 'Registering...' : 'Register Asset'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
