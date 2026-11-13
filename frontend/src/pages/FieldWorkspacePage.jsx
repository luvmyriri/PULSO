import { fieldIncidentPoint } from '../utils/fieldSurvey';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Inbox,
    Clock,
    Wrench,
    CheckCircle2,
    AlertTriangle,
    MapPin,
    Camera,
    Navigation,
    RefreshCw,
    X,
    Upload,
    LogOut,
    ExternalLink,
    ChevronRight,
    Wifi,
    WifiOff,
    Shield,
    PhoneCall,
    Send,
    Play,
    Check,
    Download,
    Smartphone,
    Share2
} from 'lucide-react';
import { getAuthUser, clearAuthSession, getAuthToken } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiBase';
import ThemeToggle from '../components/ThemeToggle';
import './field-workspace.css';

const CACHE_KEY = 'pulso_field_cache_v1';
const OUTBOX_KEY = 'pulso_field_outbox_v1';

export default function FieldWorkspacePage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'today';
    const currentUser = getAuthUser();

    // Data States
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [lastSync, setLastSync] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // PWA Installation & Standalone Mode Detection
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(() => {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    });
    const [installDismissed, setInstallDismissed] = useState(false);

    // Dynamic Manifest: switch to field-worker manifest on /field
    useEffect(() => {
        const link = document.querySelector('link[rel="manifest"]');
        const originalHref = link ? link.getAttribute('href') : '/manifest.webmanifest';
        if (link) {
            link.setAttribute('href', '/manifest-field.webmanifest');
        }
        return () => {
            if (link) {
                link.setAttribute('href', originalHref);
            }
        };
    }, []);

    useEffect(() => {
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallApp = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
                setDeferredPrompt(null);
            }
        } else {
            alert("To install PULSO Field on your phone:\n\n1. Tap your browser's Share/Menu icon (bottom or top bar)\n2. Tap 'Add to Home Screen'\n3. Confirm 'Add'\n\nThe PULSO Field icon will appear directly on your home screen with offline capabilities.");
        }
    };

    // Duty shift status ('on_site' | 'en_route' | 'available')
    const [dutyStatus, setDutyStatus] = useState('on_site');

    // Selected Work Order for Docket Sheet
    const [selectedWO, setSelectedWO] = useState(null);

    // Sub-modal states
    const [completionModalWO, setCompletionModalWO] = useState(null);
    const [blockerModalWO, setBlockerModalWO] = useState(null);

    // Location Sharing State
    const [sharingLocation, setSharingLocation] = useState(false);
    const [currentCoords, setCurrentCoords] = useState(null);
    const locationWatchId = useRef(null);

    // Filter & Search states for 'My Work' tab
    const [workFilter, setWorkFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Outbox / Pending uploads
    const [outbox, setOutbox] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
        } catch {
            return [];
        }
    });

    // ── Online / Offline Listeners ─────────────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            replayOutbox();
            fetchWorkOrders(true);
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ── Fetch Work Orders with Cache Fallback ──────────────────────────────────
    const fetchWorkOrders = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        setError('');

        const token = getAuthToken();
        if (!token) {
            setError('Authentication required');
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/agents/my-work-orders?status=all`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error(`Server returned HTTP ${res.status}`);
            }

            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setWorkOrders(list);
            setLastSync(new Date());

            // Cache to localStorage
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: new Date().toISOString(),
                    items: list
                }));
            } catch (e) {
                console.warn('Cache write failed:', e);
            }
        } catch (err) {
            console.warn('Fetch failed, loading from local cache:', err);
            // Fallback to cache
            try {
                const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
                if (cached && Array.isArray(cached.items)) {
                    setWorkOrders(cached.items);
                    setLastSync(new Date(cached.timestamp));
                } else {
                    setError('Unable to load assignments and no local cache is available.');
                }
            } catch {
                setError('Failed to load assignments.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkOrders();
    }, [fetchWorkOrders]);

    // ── Replay Outbox Queue ───────────────────────────────────────────────────
    const replayOutbox = async () => {
        const pending = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
        if (!pending.length) return;

        const token = getAuthToken();
        const remaining = [];

        for (const item of pending) {
            try {
                if (item.type === 'field-report') {
                    const formData = new FormData();
                    formData.append('category', item.payload.category);
                    formData.append('description', item.payload.description);
                    formData.append('latitude', item.payload.latitude);
                    formData.append('longitude', item.payload.longitude);
                    formData.append('location_string', item.payload.location_string || '');
                    formData.append('severity', item.payload.severity || 'medium');
                    if (item.payload.work_order_id) formData.append('work_order_id', item.payload.work_order_id);

                    await fetch(`${API_BASE_URL}/api/gov/agents/field-report`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                }
            } catch {
                remaining.push(item);
            }
        }

        setOutbox(remaining);
        localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
    };

    // ── Duty-Window Location Broadcasting (Government Field Protocol) ───────
    const toggleLocationSharing = () => {
        if (sharingLocation) {
            if (locationWatchId.current !== null) {
                navigator.geolocation.clearWatch(locationWatchId.current);
                locationWatchId.current = null;
            }
            setSharingLocation(false);
            // Notify server duty window ended
            const token = getAuthToken();
            if (token) {
                fetch(`${API_BASE_URL}/api/gov/agents/location`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'offline' })
                }).catch(() => {});
            }
        } else {
            if (!('geolocation' in navigator)) {
                alert('GPS location is not supported on this device.');
                return;
            }

            locationWatchId.current = navigator.geolocation.watchPosition(
                async (pos) => {
                    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setCurrentCoords(coords);

                    let batteryLevel = null;
                    if (navigator.getBattery) {
                        try {
                            const b = await navigator.getBattery();
                            batteryLevel = Math.round(b.level * 100);
                        } catch { /* ignore */ }
                    }

                    // Send compliant AgentLocationUpdate to backend
                    const token = getAuthToken();
                    if (token) {
                        try {
                            await fetch(`${API_BASE_URL}/api/gov/agents/location`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    latitude: Number(pos.coords.latitude.toFixed(7)),
                                    longitude: Number(pos.coords.longitude.toFixed(7)),
                                    status: dutyStatus,
                                    accuracy: Number.isFinite(pos.coords.accuracy) && pos.coords.accuracy > 0 ? pos.coords.accuracy : null,
                                    battery_level: batteryLevel,
                                    location_name: `Caloocan Field Crew - ${dutyStatus.replace('_', ' ').toUpperCase()}`
                                })
                            });
                        } catch {
                            // Non-fatal
                        }
                    }
                },
                (err) => {
                    console.warn('Geolocation watch error:', err);
                    setSharingLocation(false);
                },
                { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
            );

            setSharingLocation(true);
        }
    };

    useEffect(() => {
        return () => {
            if (locationWatchId.current !== null) {
                navigator.geolocation.clearWatch(locationWatchId.current);
            }
        };
    }, []);

    // ── Actions on Work Orders ─────────────────────────────────────────────────
    const handleAcknowledge = async (woId) => {
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/agents/work-orders/${woId}/acknowledge`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchWorkOrders(true);
                if (selectedWO?.id === woId) {
                    setSelectedWO(prev => ({ ...prev, acknowledged: true }));
                }
            }
        } catch (e) {
            console.error('Failed to acknowledge:', e);
        }
    };

    const handleStartWork = async (woId) => {
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/agents/work-orders/${woId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'in_progress', notes: 'Field official started work on-site' })
            });
            if (res.ok) {
                fetchWorkOrders(true);
                if (selectedWO?.id === woId) {
                    setSelectedWO(prev => ({ ...prev, status: 'in_progress' }));
                }
            }
        } catch (e) {
            console.error('Failed to start work:', e);
        }
    };

    const handleUnblockWork = async (woId) => {
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders/${woId}/unblock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ resolution_notes: 'Blocker resolved on-site by field team' })
            });
            if (res.ok) {
                fetchWorkOrders(true);
                if (selectedWO?.id === woId) {
                    setSelectedWO(prev => ({ ...prev, status: 'in_progress' }));
                }
            }
        } catch (e) {
            console.error('Failed to unblock work:', e);
        }
    };

    const handleLogProgress = async (woId, note) => {
        if (!note || !note.trim()) return false;
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders/${woId}/updates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    note: note.trim()
                })
            });
            if (res.ok) {
                fetchWorkOrders(true);
                return true;
            }
        } catch (e) {
            console.error('Failed to log progress note:', e);
        }
        return false;
    };

    const handleSignOut = () => {
        clearAuthSession();
        navigate('/gov');
    };

    const setTab = (tab) => {
        setSearchParams({ tab });
    };

    // Filtered Lists
    const todayOrders = workOrders.filter(w => ['assigned', 'in_progress', 'rework_required', 'blocked'].includes(w.status));
    const activeCount = workOrders.filter(w => w.status === 'in_progress').length;
    const criticalCount = workOrders.filter(w => ['critical', 'urgent', 'high'].includes(w.priority?.toLowerCase())).length;
    const blockedCount = workOrders.filter(w => w.status === 'blocked').length;

    const filteredMyWork = workOrders.filter(wo => {
        if (workFilter !== 'all' && wo.status !== workFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (
                (wo.wo_number && wo.wo_number.toLowerCase().includes(q)) ||
                (wo.title && wo.title.toLowerCase().includes(q)) ||
                (wo.location_string && wo.location_string.toLowerCase().includes(q))
            );
        }
        return true;
    });

    return (
        <div className="field-app">
            {/* ── STICKY TOP APP HEADER ────────────────────────────────────────── */}
            <header className="field-header">
                <div className="field-header-inner">
                    <div className="field-brand-group">
                        <img
                            src="/city-engineering-logo.png"
                            alt="City Engineering Logo"
                            className="field-logo"
                        />
                        <div className="field-brand-titles">
                            <span className="field-brand-title">
                                PULSO <span className="field-brand-tag">FIELD</span>
                            </span>
                            <span className="field-brand-subtitle">
                                {currentUser?.name || currentUser?.full_name || 'Field Official'} • {currentUser?.role ? currentUser.role.replace('_', ' ') : 'Operations'}
                            </span>
                        </div>
                    </div>

                    <div className="field-header-actions">
                        {/* Connection Pill */}
                        <span className={`field-pill ${isOnline ? 'field-pill--online' : 'field-pill--offline'}`}>
                            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                            <span>{isOnline ? 'Online' : 'Offline'}</span>
                        </span>

                        {/* GPS Location Broadcaster Toggle */}
                        <button
                            type="button"
                            onClick={toggleLocationSharing}
                            className={`field-gps-button ${sharingLocation ? 'is-active' : ''}`}
                            title={sharingLocation ? 'Location sharing active' : 'Turn on duty shift location sharing'}
                        >
                            <Navigation size={13} className={sharingLocation ? 'animate-pulse' : ''} />
                            <span className="hidden sm:inline">{sharingLocation ? 'GPS On' : 'GPS Off'}</span>
                        </button>

                        <ThemeToggle />

                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="field-sheet-close"
                            title="Sign out of field workspace"
                            aria-label="Sign out"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── DESKTOP TABS (Tablet+) ────────────────────────────────────────── */}
            <div className="field-container">
                {/* ── PWA DOWNLOAD / INSTALL BANNER ────────────────────────────── */}
                {!isInstalled && !installDismissed && (
                    <div className="field-install-banner">
                        <div className="field-install-banner__content">
                            <div className="field-install-banner__icon">
                                <Download size={18} />
                            </div>
                            <div className="field-install-banner__text">
                                <h4>Install PULSO Field App</h4>
                                <p>Add to your phone home screen for 1-tap launch, offline caching & duty GPS.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={handleInstallApp}
                                className="field-install-banner__btn"
                            >
                                <Download size={13} />
                                <span>Install App</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setInstallDismissed(true)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                aria-label="Dismiss banner"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>
                )}
                <div className="field-desktop-tabs">
                    <button
                        type="button"
                        onClick={() => setTab('today')}
                        className={`field-tab-button ${activeTab === 'today' ? 'is-active' : ''}`}
                    >
                        <Clock size={15} />
                        <span>Today&apos;s Jobs ({todayOrders.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('work')}
                        className={`field-tab-button ${activeTab === 'work' ? 'is-active' : ''}`}
                    >
                        <Inbox size={15} />
                        <span>My Work ({workOrders.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('report')}
                        className={`field-tab-button ${activeTab === 'report' ? 'is-active' : ''}`}
                    >
                        <Camera size={15} />
                        <span>Field Incident Report</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('sync')}
                        className={`field-tab-button ${activeTab === 'sync' ? 'is-active' : ''}`}
                    >
                        <Shield size={15} />
                        <span>Device & Sync</span>
                    </button>
                </div>

                {/* ── TAB 1: TODAY'S JOBS ──────────────────────────────────────────── */}
                {activeTab === 'today' && (
                    <div>
                        {/* KPI Metrics */}
                        <div className="field-kpi-grid">
                            <div className="field-kpi-card">
                                <div className="field-kpi-num">{activeCount}</div>
                                <div className="field-kpi-label">In Progress</div>
                            </div>
                            <div className="field-kpi-card">
                                <div className="field-kpi-num text-amber-600 dark:text-amber-400">{criticalCount}</div>
                                <div className="field-kpi-label">High Priority</div>
                            </div>
                            <div className="field-kpi-card">
                                <div className="field-kpi-num text-rose-600 dark:text-rose-400">{blockedCount}</div>
                                <div className="field-kpi-label">Blocked</div>
                            </div>
                        </div>

                        {/* Refresh Header */}
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                                Today&apos;s Active Work ({todayOrders.length})
                            </h2>
                            <button
                                type="button"
                                onClick={() => fetchWorkOrders(true)}
                                disabled={refreshing}
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            >
                                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                                <span>{refreshing ? 'Syncing…' : 'Refresh'}</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-xs text-slate-500">
                                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#ea580c]" />
                                Loading assigned work orders…
                            </div>
                        ) : todayOrders.length === 0 ? (
                            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No active work orders</h3>
                                <p className="text-xs text-slate-500 mt-1">You are all caught up! Check My Work for completed records.</p>
                            </div>
                        ) : (
                            todayOrders.map(wo => (
                                <WorkOrderCard
                                    key={wo.id || wo.wo_id}
                                    workOrder={wo}
                                    onSelect={() => setSelectedWO(wo)}
                                    onAcknowledge={() => handleAcknowledge(wo.id || wo.wo_id)}
                                    onStartWork={() => handleStartWork(wo.id || wo.wo_id)}
                                    onSubmitProof={() => setCompletionModalWO(wo)}
                                    onBlock={() => setBlockerModalWO(wo)}
                                    onUnblock={() => handleUnblockWork(wo.id || wo.wo_id)}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* ── TAB 2: MY WORK REGISTER ──────────────────────────────────────── */}
                {activeTab === 'work' && (
                    <div>
                        {/* Search & Filter Bar */}
                        <div className="flex flex-col gap-2 mb-3">
                            <input
                                type="search"
                                placeholder="Search by WO#, title, address…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                            />

                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                                {[
                                    { id: 'all', label: 'All Orders' },
                                    { id: 'in_progress', label: 'In Progress' },
                                    { id: 'assigned', label: 'Assigned' },
                                    { id: 'blocked', label: 'Blocked' },
                                    { id: 'completed_pending_review', label: 'For Review' },
                                    { id: 'completed', label: 'Completed' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setWorkFilter(f.id)}
                                        className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
                                            workFilter === f.id
                                                ? 'bg-[#ea580c] text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredMyWork.length === 0 ? (
                            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                <p className="text-xs text-slate-500">No work orders match this filter.</p>
                            </div>
                        ) : (
                            filteredMyWork.map(wo => (
                                <WorkOrderCard
                                    key={wo.id || wo.wo_id}
                                    workOrder={wo}
                                    onSelect={() => setSelectedWO(wo)}
                                    onAcknowledge={() => handleAcknowledge(wo.id || wo.wo_id)}
                                    onStartWork={() => handleStartWork(wo.id || wo.wo_id)}
                                    onSubmitProof={() => setCompletionModalWO(wo)}
                                    onBlock={() => setBlockerModalWO(wo)}
                                    onUnblock={() => handleUnblockWork(wo.id || wo.wo_id)}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* ── TAB 3: FIELD INCIDENT INTAKE ─────────────────────────────────── */}
                {activeTab === 'report' && (
                    <FieldIncidentForm
                        currentCoords={currentCoords}
                        onSubmitted={() => {
                            fetchWorkOrders(true);
                            setTab('today');
                        }}
                    />
                )}

                {/* ── TAB 4: DEVICE & SYNC STATUS ──────────────────────────────────── */}
                {activeTab === 'sync' && (
                    <DeviceSyncPanel
                        isOnline={isOnline}
                        lastSync={lastSync}
                        outbox={outbox}
                        cachedCount={workOrders.length}
                        onReplayOutbox={replayOutbox}
                        onForceSync={() => fetchWorkOrders(true)}
                        isInstalled={isInstalled}
                        onInstallApp={handleInstallApp}
                        sharingLocation={sharingLocation}
                        onToggleLocation={toggleLocationSharing}
                        dutyStatus={dutyStatus}
                        onChangeDutyStatus={setDutyStatus}
                        currentCoords={currentCoords}
                    />
                )}
            </div>

            {/* ── BOTTOM PHONE NAVIGATION (Fixed on Mobile) ────────────────────── */}
            <nav className="field-bottom-nav">
                <button
                    type="button"
                    onClick={() => setTab('today')}
                    className={`field-nav-item ${activeTab === 'today' ? 'is-active' : ''}`}
                >
                    <Clock size={19} />
                    <span>Today</span>
                </button>
                <button
                    type="button"
                    onClick={() => setTab('work')}
                    className={`field-nav-item ${activeTab === 'work' ? 'is-active' : ''}`}
                >
                    <Inbox size={19} />
                    <span>My Work</span>
                </button>
                <button
                    type="button"
                    onClick={() => setTab('report')}
                    className={`field-nav-item ${activeTab === 'report' ? 'is-active' : ''}`}
                >
                    <Camera size={19} />
                    <span>Report</span>
                </button>
                <button
                    type="button"
                    onClick={() => setTab('sync')}
                    className={`field-nav-item ${activeTab === 'sync' ? 'is-active' : ''}`}
                >
                    <Shield size={19} />
                    <span>Sync</span>
                </button>
            </nav>

            {/* ── DOCKET DETAIL SHEET ──────────────────────────────────────────── */}
            {selectedWO && (
                <WorkOrderDocketSheet
                    workOrder={selectedWO}
                    onClose={() => setSelectedWO(null)}
                    onAcknowledge={() => handleAcknowledge(selectedWO.id || selectedWO.wo_id)}
                    onStartWork={() => handleStartWork(selectedWO.id || selectedWO.wo_id)}
                    onLogProgress={(note) => handleLogProgress(selectedWO.id || selectedWO.wo_id, note)}
                    onSubmitProof={() => {
                        setCompletionModalWO(selectedWO);
                        setSelectedWO(null);
                    }}
                    onBlock={() => {
                        setBlockerModalWO(selectedWO);
                        setSelectedWO(null);
                    }}
                    onUnblock={() => handleUnblockWork(selectedWO.id || selectedWO.wo_id)}
                />
            )}

            {/* ── COMPLETION PROOF MODAL ───────────────────────────────────────── */}
            {completionModalWO && (
                <FieldCompletionSheet
                    workOrder={completionModalWO}
                    onClose={() => setCompletionModalWO(null)}
                    onSubmitted={() => {
                        setCompletionModalWO(null);
                        fetchWorkOrders(true);
                    }}
                />
            )}

            {/* ── BLOCKER MODAL ────────────────────────────────────────────────── */}
            {blockerModalWO && (
                <FieldBlockerSheet
                    workOrder={blockerModalWO}
                    onClose={() => setBlockerModalWO(null)}
                    onSubmitted={() => {
                        setBlockerModalWO(null);
                        fetchWorkOrders(true);
                    }}
                />
            )}
        </div>
    );
}

// ── WORK ORDER CARD COMPONENT ────────────────────────────────────────────────
function WorkOrderCard({ workOrder, onSelect, onAcknowledge, onStartWork, onSubmitProof, onBlock, onUnblock }) {
    const isCritical = ['critical', 'urgent', 'p5', 'p4'].includes((workOrder.priority || '').toLowerCase());
    const isUrgent = ['high', 'p3'].includes((workOrder.priority || '').toLowerCase());
    const isProgress = workOrder.status === 'in_progress';
    const isBlocked = workOrder.status === 'blocked';
    const isAssigned = workOrder.status === 'assigned';
    const isPendingReview = workOrder.status === 'completed_pending_review';

    return (
        <div
            className={`field-card ${isCritical ? 'is-critical' : isUrgent ? 'is-urgent' : isProgress ? 'is-active' : ''}`}
            onClick={onSelect}
        >
            <div className="field-card-head">
                <span className="field-wo-num">{workOrder.wo_number || `WO #${workOrder.id || workOrder.wo_id}`}</span>
                <span className="field-pill text-[10.5px]">
                    {workOrder.status === 'in_progress' ? 'In Progress' :
                     workOrder.status === 'assigned' ? 'Assigned' :
                     workOrder.status === 'blocked' ? 'Blocked' :
                     workOrder.status === 'completed_pending_review' ? 'For Verification' :
                     workOrder.status === 'completed' ? 'Completed' : workOrder.status}
                </span>
            </div>

            <h3 className="field-card-title">{workOrder.title}</h3>
            {workOrder.description && <p className="field-card-desc">{workOrder.description}</p>}

            <div className="field-card-meta">
                <div className="field-card-meta-item">
                    <MapPin size={13} className="text-[#ea580c] shrink-0" />
                    <span className="truncate">{workOrder.location_string || 'North Caloocan site'}</span>
                </div>
                {workOrder.priority && (
                    <div className="field-card-meta-item font-semibold">
                        <span>Priority: {workOrder.priority.toUpperCase()}</span>
                    </div>
                )}
            </div>

            {/* Contextual Action Button */}
            <div onClick={(e) => e.stopPropagation()} className="mt-2.5">
                {isAssigned && (
                    <button
                        type="button"
                        onClick={onStartWork}
                        className="field-action-button field-action-button--primary"
                    >
                        <Play size={15} />
                        <span>Start Work</span>
                    </button>
                )}

                {isProgress && (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onSubmitProof}
                            className="field-action-button field-action-button--primary flex-1"
                        >
                            <CheckCircle2 size={15} />
                            <span>Submit Proof</span>
                        </button>
                        <button
                            type="button"
                            onClick={onBlock}
                            className="field-action-button field-action-button--secondary w-28 shrink-0"
                        >
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span>Blocker</span>
                        </button>
                    </div>
                )}

                {isBlocked && (
                    <button
                        type="button"
                        onClick={onUnblock}
                        className="field-action-button field-action-button--blue"
                    >
                        <Check size={15} />
                        <span>Clear Blocker & Resume</span>
                    </button>
                )}

                {isPendingReview && (
                    <div className="p-2 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                        Under Inspector Verification
                    </div>
                )}
            </div>
        </div>
    );
}

// ── DOCKET DETAIL SHEET COMPONENT ─────────────────────────────────────────────
function WorkOrderDocketSheet({ workOrder, onClose, onAcknowledge, onStartWork, onLogProgress, onSubmitProof, onBlock, onUnblock }) {
    const [progressNote, setProgressNote] = useState('');
    const [loggingProgress, setLoggingProgress] = useState(false);
    const [progressFeedback, setProgressFeedback] = useState('');

    const handleSendProgress = async (e) => {
        e.preventDefault();
        if (!progressNote.trim() || loggingProgress) return;
        setLoggingProgress(true);
        const success = await onLogProgress(progressNote);
        setLoggingProgress(false);
        if (success) {
            setProgressFeedback('Progress update saved to timeline!');
            setProgressNote('');
            setTimeout(() => setProgressFeedback(''), 3500);
        } else {
            setProgressFeedback('Failed to log update. Check connection.');
        }
    };
    const mapsUrl = (workOrder.location_lat && workOrder.location_lng)
        ? `https://www.google.com/maps/dir/?api=1&destination=${workOrder.location_lat},${workOrder.location_lng}`
        : null;

    return (
        <div className="field-sheet-backdrop" onClick={onClose}>
            <div className="field-sheet-content" onClick={(e) => e.stopPropagation()}>
                <div className="field-sheet-header">
                    <div>
                        <span className="field-wo-num">{workOrder.wo_number || `WO #${workOrder.id || workOrder.wo_id}`}</span>
                        <h2 className="field-sheet-title mt-1">{workOrder.title}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="field-sheet-close">
                        <X size={18} />
                    </button>
                </div>

                {/* Status & Priority Strip */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="field-pill">Status: <strong>{workOrder.status}</strong></span>
                    <span className="field-pill">Priority: <strong>{workOrder.priority}</strong></span>
                    {workOrder.wo_type && <span className="field-pill">Type: {workOrder.wo_type}</span>}
                </div>

                {/* Evidence Photo Frame (Civic Aperture) */}
                {(workOrder.report_image || workOrder.proof_image) && (
                    <div className="field-aperture-frame">
                        <img
                            src={workOrder.proof_image || workOrder.report_image}
                            alt="Incident Evidence"
                            className="field-aperture-img"
                        />
                        <div className="field-aperture-tag">
                            {workOrder.proof_image ? 'Field Completion Proof' : 'Citizen Incident Evidence'}
                        </div>
                    </div>
                )}

                {/* Description & Scope */}
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description & Scope</h4>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        {workOrder.description || 'No detailed scope recorded.'}
                    </p>
                </div>

                {/* Location Details & Navigation Button */}
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Incident Site</h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                            <MapPin size={15} className="text-[#ea580c] shrink-0" />
                            {workOrder.location_string || 'North Caloocan City Site'}
                        </p>
                        {mapsUrl && (
                            <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-700"
                            >
                                <Navigation size={13} />
                                <span>Get Directions (Google Maps)</span>
                                <ExternalLink size={11} />
                            </a>
                        )}
                    </div>
                </div>

                {/* Safety Protocol Note */}
                <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                    <strong>Safety First:</strong> Wear official PPE and inspect utilities before mechanical excavation. Report unmapped gas or electric hazards immediately.
                </div>

                {/* Quick Field Progress Note */}
                <div className="field-progress-box">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            Post Field Activity Note
                        </span>
                        {progressFeedback && (
                            <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {progressFeedback}
                            </span>
                        )}
                    </div>
                    <form onSubmit={handleSendProgress}>
                        <textarea
                            placeholder="e.g. Unloaded aggregate, clearing drainage culvert on site..."
                            value={progressNote}
                            onChange={(e) => setProgressNote(e.target.value)}
                            disabled={loggingProgress}
                        />
                        <div className="flex justify-end mt-1.5">
                            <button
                                type="submit"
                                disabled={!progressNote.trim() || loggingProgress}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                <Send size={12} />
                                <span>{loggingProgress ? 'Posting...' : 'Log Note'}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Operations Actions */}
                <div className="flex flex-col gap-2">
                    {workOrder.status === 'assigned' && (
                        <button
                            type="button"
                            onClick={() => {
                                onStartWork();
                                onClose();
                            }}
                            className="field-action-button field-action-button--primary"
                        >
                            <Play size={16} />
                            <span>Start Work On-Site</span>
                        </button>
                    )}

                    {workOrder.status === 'in_progress' && (
                        <>
                            <button
                                type="button"
                                onClick={onSubmitProof}
                                className="field-action-button field-action-button--primary"
                            >
                                <CheckCircle2 size={16} />
                                <span>Submit Completion Proof</span>
                            </button>
                            <button
                                type="button"
                                onClick={onBlock}
                                className="field-action-button field-action-button--secondary"
                            >
                                <AlertTriangle size={15} className="text-amber-500" />
                                <span>Report Operational Blocker</span>
                            </button>
                        </>
                    )}

                    {workOrder.status === 'blocked' && (
                        <button
                            type="button"
                            onClick={() => {
                                onUnblock();
                                onClose();
                            }}
                            className="field-action-button field-action-button--blue"
                        >
                            <Check size={16} />
                            <span>Clear Blocker & Resume</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── COMPLETION PROOF MODAL ────────────────────────────────────────────────────
function FieldCompletionSheet({ workOrder, onClose, onSubmitted }) {
    const [image, setImage] = useState(null);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!image) {
            setError('Completion proof photo is required.');
            return;
        }
        if (!notes.trim()) {
            setError('Please describe the work completed.');
            return;
        }

        setSubmitting(true);
        setError('');

        const token = getAuthToken();
        const body = new FormData();
        body.append('image', image);
        body.append('notes', notes.trim());

        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders/${workOrder.id || workOrder.wo_id}/completion-evidence`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `Submission failed (HTTP ${res.status})`);
            }

            onSubmitted();
        } catch (err) {
            setError(err.message || 'Failed to submit completion evidence.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="field-sheet-backdrop" onClick={onClose}>
            <div className="field-sheet-content" onClick={(e) => e.stopPropagation()}>
                <div className="field-sheet-header">
                    <div>
                        <span className="field-wo-num">{workOrder.wo_number || `WO #${workOrder.id || workOrder.wo_id}`}</span>
                        <h2 className="field-sheet-title mt-1">Submit Completion Proof</h2>
                    </div>
                    <button type="button" onClick={onClose} className="field-sheet-close">
                        <X size={18} />
                    </button>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                    Submit verified on-site photographic proof. The job will enter inspector review before closing the citizen report.
                </p>

                {error && (
                    <div className="p-3 mb-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Completion Photo (True-Color Evidence)
                        </label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            onChange={(e) => setImage(e.target.files?.[0] || null)}
                            required
                            className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#ea580c] file:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Work Completed & Materials Used
                        </label>
                        <textarea
                            rows={4}
                            required
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Describe what was repaired, asphalt or concrete tonnage used, and safety clean-up completed…"
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="field-action-button field-action-button--primary mt-2"
                    >
                        <Upload size={16} />
                        <span>{submitting ? 'Submitting Proof…' : 'Submit for Inspector Review'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── BLOCKER REPORT MODAL ──────────────────────────────────────────────────────
function FieldBlockerSheet({ workOrder, onClose, onSubmitted }) {
    const [reasonCode, setReasonCode] = useState('weather');
    const [delayDays, setDelayDays] = useState(1);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const token = getAuthToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders/${workOrder.id || workOrder.wo_id}/block`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reason_code: reasonCode,
                    delay_days: Number(delayDays) || 1,
                    notes: notes.trim() || `Operational blocker reported: ${reasonCode}`
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `Blocker report failed (HTTP ${res.status})`);
            }

            onSubmitted();
        } catch (err) {
            setError(err.message || 'Failed to report blocker.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="field-sheet-backdrop" onClick={onClose}>
            <div className="field-sheet-content" onClick={(e) => e.stopPropagation()}>
                <div className="field-sheet-header">
                    <div>
                        <span className="field-wo-num">{workOrder.wo_number || `WO #${workOrder.id || workOrder.wo_id}`}</span>
                        <h2 className="field-sheet-title mt-1 text-rose-600 dark:text-rose-400">Report Field Blocker</h2>
                    </div>
                    <button type="button" onClick={onClose} className="field-sheet-close">
                        <X size={18} />
                    </button>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                    Log an operational constraint that halts on-site progress. Dispatch will be alerted immediately.
                </p>

                {error && (
                    <div className="p-3 mb-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Blocker Category
                        </label>
                        <select
                            value={reasonCode}
                            onChange={(e) => setReasonCode(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium"
                        >
                            <option value="weather">Severe Weather / Flooding</option>
                            <option value="access_denied">Site Access Denied / Barricaded</option>
                            <option value="safety_hazard">Active Safety Hazard (Power / Gas Leak)</option>
                            <option value="materials_shortage">Missing Materials or Asphalt Batch</option>
                            <option value="utility_conflict">Underground Utility Conflict</option>
                            <option value="equipment_failure">Heavy Equipment Breakdown</option>
                            <option value="other">Other Operational Obstacle</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Estimated Delay (Days)
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={30}
                            value={delayDays}
                            onChange={(e) => setDelayDays(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Specific Details & Immediate Actions Taken
                        </label>
                        <textarea
                            rows={3}
                            required
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Detail why work cannot proceed safely and what is needed to resume…"
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="field-action-button field-action-button--danger mt-2"
                    >
                        <AlertTriangle size={16} />
                        <span>{submitting ? 'Recording Blocker…' : 'Halt Work & Alert Dispatch'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── FIELD INCIDENT INTAKE FORM ────────────────────────────────────────────────
function FieldIncidentForm({ currentCoords, onSubmitted }) {
    const [category, setCategory] = useState('Pothole / Road Surface Damage');
    const [severity, setSeverity] = useState('medium');
    const [description, setDescription] = useState('');
    const [locationString, setLocationString] = useState('');
    const [image, setImage] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setStatusMessage('');

        const point = fieldIncidentPoint(currentCoords);
        if (!point) {
            setStatusMessage('A device location is needed for this field report. Enable location and try again; your description is kept.');
            setSubmitting(false);
            return;
        }
        const { lat, lng } = point;

        const token = getAuthToken();

        // If offline, save to local outbox
        if (!navigator.onLine) {
            const outboxItem = {
                id: Date.now(),
                type: 'field-report',
                payload: {
                    category,
                    severity,
                    description,
                    latitude: lat,
                    longitude: lng,
                    location_string: locationString || 'North Caloocan Field Location'
                }
            };
            const existing = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
            existing.push(outboxItem);
            localStorage.setItem(OUTBOX_KEY, JSON.stringify(existing));

            setStatusMessage('Saved to offline outbox. Will sync automatically when connection restores.');
            setSubmitting(false);
            setDescription('');
            return;
        }

        const formData = new FormData();
        formData.append('category', category);
        formData.append('severity', severity);
        formData.append('description', description);
        formData.append('latitude', lat);
        formData.append('longitude', lng);
        formData.append('location_string', locationString || 'North Caloocan');
        if (image) formData.append('image', image);

        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/agents/field-report`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) throw new Error('Submission failed');

            setStatusMessage('Field incident report logged successfully.');
            setDescription('');
            setImage(null);
            onSubmitted();
        } catch (err) {
            setStatusMessage('Failed to submit field report. Please retry.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-white mb-1">
                Log New Field Observation
            </h2>
            <p className="text-xs text-slate-500 mb-4">
                Record an infrastructure hazard or defect discovered while on patrol.
            </p>

            {statusMessage && (
                <div className="p-3 mb-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    {statusMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Incident Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    >
                        <option value="Pothole / Road Surface Damage">Pothole / Road Surface Damage</option>
                        <option value="Flooding / Clogged Drainage">Flooding / Clogged Drainage</option>
                        <option value="Broken Streetlight / Dark Area">Broken Streetlight / Dark Area</option>
                        <option value="Water Pipe Leak / Low Pressure">Water Pipe Leak / Low Pressure</option>
                        <option value="Fallen Tree / Road Obstruction">Fallen Tree / Road Obstruction</option>
                        <option value="Illegal Utility Excavation">Illegal Utility Excavation</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Severity</label>
                    <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                        {['low', 'medium', 'high', 'critical'].map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSeverity(s)}
                                className={`py-2 rounded-xl uppercase transition-all ${
                                    severity === s
                                        ? s === 'critical' ? 'bg-rose-600 text-white' :
                                          s === 'high' ? 'bg-amber-600 text-white' : 'bg-[#ea580c] text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Location / Landmark Description</label>
                    <input
                        type="text"
                        value={locationString}
                        onChange={(e) => setLocationString(e.target.value)}
                        placeholder="e.g. In front of Barangay 176 Hall, Zabarte Road"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                    />
                    {currentCoords && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono-data">
                            GPS Locked: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Observation Photo</label>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        onChange={(e) => setImage(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Observation Description</label>
                    <textarea
                        rows={3}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the condition, lane blockage, safety risk, or urgency…"
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="field-action-button field-action-button--primary mt-2"
                >
                    <Send size={15} />
                    <span>{submitting ? 'Transmitting…' : 'Submit Field Report'}</span>
                </button>
            </form>
        </div>
    );
}

// ── DEVICE & SYNC PANEL COMPONENT ─────────────────────────────────────────────
function DeviceSyncPanel({
    isOnline,
    lastSync,
    outbox,
    cachedCount,
    onReplayOutbox,
    onForceSync,
    isInstalled,
    onInstallApp,
    sharingLocation,
    onToggleLocation,
    dutyStatus,
    onChangeDutyStatus,
    currentCoords
}) {
    return (
        <div className="flex flex-col gap-3">
            {/* ── PWA DOWNLOAD & STANDALONE INSTALL CARD ───────────────────── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Smartphone size={16} className="text-[#ea580c]" />
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">PULSO Field PWA Application</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                    Designed specifically for field crew members on mobile devices. Install the app to your home screen for rapid camera intake, background GPS duty tracking, and offline outbox sync.
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 mb-3 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">App Status</span>
                        <strong className="text-xs text-slate-800 dark:text-white">
                            {isInstalled ? '✅ Installed (Standalone Phone Mode)' : '📱 Running in Browser (Installable)'}
                        </strong>
                    </div>
                    {!isInstalled && (
                        <button
                            type="button"
                            onClick={onInstallApp}
                            className="field-action-button field-action-button--primary text-xs py-1.5 px-3"
                        >
                            <Download size={13} />
                            <span>Download App</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── DUTY SHIFT & GPS LOCATION BROADCASTING ───────────────────── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Navigation size={16} className={sharingLocation ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Duty Location Tracking</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleLocation}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                            sharingLocation
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        {sharingLocation ? '● GPS Broadcasting' : 'GPS Off'}
                    </button>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                    Broadcasts your location to the dispatch command center during your shift window only.
                </p>

                {/* Duty Status Selector */}
                <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        Active Field Status:
                    </label>
                    <div className="field-duty-selector">
                        <button
                            type="button"
                            onClick={() => onChangeDutyStatus('on_site')}
                            className={`field-duty-pill ${dutyStatus === 'on_site' ? 'is-active-onsite' : ''}`}
                        >
                            <span>🟢 On Site</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeDutyStatus('en_route')}
                            className={`field-duty-pill ${dutyStatus === 'en_route' ? 'is-active-enroute' : ''}`}
                        >
                            <span>🟡 En Route</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeDutyStatus('available')}
                            className={`field-duty-pill ${dutyStatus === 'available' ? 'is-active-duty' : ''}`}
                        >
                            <span>🔵 Available</span>
                        </button>
                    </div>
                </div>

                {currentCoords && (
                    <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] font-mono-data text-slate-600 dark:text-slate-400 flex justify-between">
                        <span>Lat: {currentCoords.lat?.toFixed(5)}</span>
                        <span>Lng: {currentCoords.lng?.toFixed(5)}</span>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-2">Network & Storage Status</h3>
                <dl className="text-xs flex flex-col gap-2">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <dt className="text-slate-500">Connection Mode</dt>
                        <dd className="font-bold flex items-center gap-1">
                            {isOnline ? <Wifi size={13} className="text-emerald-500" /> : <WifiOff size={13} className="text-amber-500" />}
                            {isOnline ? 'Online (Real-Time)' : 'Offline (Local Cache)'}
                        </dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <dt className="text-slate-500">Last Successful Sync</dt>
                        <dd className="font-semibold text-slate-700 dark:text-slate-300">
                            {lastSync ? lastSync.toLocaleTimeString('en-PH') : 'Not synced yet'}
                        </dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <dt className="text-slate-500">Cached Work Orders</dt>
                        <dd className="font-semibold text-slate-700 dark:text-slate-300">{cachedCount} orders</dd>
                    </div>
                    <div className="flex justify-between py-1">
                        <dt className="text-slate-500">Pending Outbox Items</dt>
                        <dd className="font-bold text-[#ea580c]">{outbox.length} pending</dd>
                    </div>
                </dl>

                <div className="flex gap-2 mt-4">
                    <button
                        type="button"
                        onClick={onForceSync}
                        className="field-action-button field-action-button--primary flex-1"
                    >
                        <RefreshCw size={14} />
                        <span>Force Sync Now</span>
                    </button>
                    {outbox.length > 0 && (
                        <button
                            type="button"
                            onClick={onReplayOutbox}
                            className="field-action-button field-action-button--blue flex-1"
                        >
                            <Send size={14} />
                            <span>Flush Outbox</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Emergency Hotlines Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                    <PhoneCall size={15} className="text-[#ea580c]" />
                    <span>Operations & Dispatch Contacts</span>
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                    If an emergency or impassable road hazard occurs on-site:
                </p>
                <div className="text-xs flex flex-col gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                        <div>
                            <strong>Caloocan Command Center</strong>
                            <p className="text-slate-500 text-[11px]">24/7 Disaster & Emergency</p>
                        </div>
                        <a href="tel:8888-2857" className="font-mono-data font-bold text-[#ea580c] px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            (02) 8888-2857
                        </a>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                        <div>
                            <strong>City Engineering Dispatch</strong>
                            <p className="text-slate-500 text-[11px]">Operations & Heavy Equipment</p>
                        </div>
                        <a href="tel:0917-123-4567" className="font-mono-data font-bold text-[#2563eb] px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            0917-123-4567
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
