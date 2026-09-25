import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Inbox,
    AlertTriangle,
    Clock,
    ShieldCheck,
    CheckCircle2,
    ArrowRight,
    RefreshCw,
    MapPin,
    Truck,
    Users,
    AlertCircle,
    Calendar,
    ChevronRight,
    ExternalLink,
    Wrench,
    FileText,
    Megaphone,
    Building2,
    Flame,
    Layers,
    Compass
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, PolygonF, MarkerF, InfoWindowF } from '@react-google-maps/api';
import ReportDensityLayer from '../components/maps/ReportDensityLayer';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import GovUserDropdown from '../components/GovUserDropdown';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import { formatTicketId } from '../utils/reportWorkflow';
import {
    NORTH_CALOOCAN_PATH,
    SOUTH_CALOOCAN_PATH,
    NORTH_CALOOCAN_CENTROID,
    SOUTH_CALOOCAN_CENTROID,
    COMBINED_CALOOCAN_BOUNDS,
    getCaloocanDistrict
} from '../data/caloocanBoundaries';
import './citizen-reports.css';

const LIBRARIES = ['places', 'geometry'];

const DARK_MAP_STYLE = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { elementType: 'geometry', stylers: [{ color: '#0c1322' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0c1322' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#090f1a' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070b14' }] },
    { featureType: 'water', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }, { weight: 1 }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.stroke', stylers: [{ color: '#0c1322' }, { weight: 3 }] },
    { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'administrative.neighborhood', elementType: 'labels.text.stroke', stylers: [{ color: '#0c1322' }, { weight: 2 }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#162030' }, { weight: 0.8 }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#0c1322' }, { weight: 2 }] },
];

const humanize = (value, fallback = 'Not available') => {
    if (!value) return fallback;
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

export default function GovTodayPage() {
    const navigate = useNavigate();
    const token = getAuthToken();
    const [user] = useState(() => getAuthUser());

    const { theme } = useTheme();
    const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

    const { isLoaded: isMapLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES,
    });

    const [todayData, setTodayData] = useState(null);
    const [publicReports, setPublicReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSector, setActiveSector] = useState('all'); // 'all' | 'north' | 'south'
    const [showMapHeatmap, setShowMapHeatmap] = useState(true);
    const [showIncidentPins, setShowIncidentPins] = useState(true);
    const [mapStyleType, setMapStyleType] = useState('roadmap'); // 'roadmap' | 'hybrid'
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [todayMap, setTodayMap] = useState(null);

    const loadTodayData = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentToken = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/gov/operations/today`, {
                headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
            });
            if (!res.ok) throw new Error('Unable to retrieve daily operations hub data.');
            const data = await res.json();
            setTodayData(data);
        } catch (err) {
            setError(err.message || 'Failed to load operations data');
        } finally {
            setLoading(false);
        }
    };

    const loadPublicReports = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/public?limit=100`);
            if (res.ok) {
                const data = await res.json();
                const reports = Array.isArray(data) ? data : (data.items || data.reports || []);
                setPublicReports(reports);
            }
        } catch (err) {
            console.error('Failed to load public reports for operations overview:', err);
        }
    };

    useEffect(() => {
        loadTodayData();
        loadPublicReports();
    }, []);

    const sectorFilteredIncidents = useMemo(() => {
        if (!publicReports || publicReports.length === 0) return [];
        return publicReports.filter(item => {
            const lat = Number(item.latitude);
            const lng = Number(item.longitude);
            if (isNaN(lat) || isNaN(lng)) return false;
            if (activeSector === 'all') return true;
            const district = getCaloocanDistrict(lat, lng);
            return district === activeSector;
        });
    }, [publicReports, activeSector]);

    const heatmapPoints = useMemo(() => {
        return sectorFilteredIncidents.map(item => ({
            location: { lat: Number(item.latitude), lng: Number(item.longitude) },
            weight: item.ai_urgency === 'critical' || item.urgency === 'critical' ? 3 :
                    item.ai_urgency === 'high' || item.urgency === 'high' ? 2 : 1
        }));
    }, [sectorFilteredIncidents]);

    const handleSectorChange = (sector) => {
        setActiveSector(sector);
        setSelectedIncident(null);
        if (!todayMap) return;

        if (sector === 'north') {
            todayMap.panTo(NORTH_CALOOCAN_CENTROID);
            todayMap.setZoom(12);
        } else if (sector === 'south') {
            todayMap.panTo(SOUTH_CALOOCAN_CENTROID);
            todayMap.setZoom(13);
        } else {
            todayMap.panTo(COMBINED_CALOOCAN_BOUNDS.center);
            todayMap.setZoom(11);
        }
    };

    const mapOptions = useMemo(() => ({
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: isDark && mapStyleType !== 'hybrid' ? DARK_MAP_STYLE : undefined,
    }), [isDark, mapStyleType]);

    const metrics = todayData?.metrics || {
        unassigned_concerns: 0,
        overdue_actions: 0,
        awaiting_verification: 0,
        open_high_priority: 0,
        resolved_in_period: 0
    };

    const needsAttention = todayData?.needs_attention || [];
    const sectorSummary = todayData?.sector_summary;
    const teamCapacity = todayData?.team_capacity || [];

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6fa] dark:bg-[#070a12] text-slate-900 dark:text-slate-100 font-sans antialiased select-none">
            {/* Left Navigation Sidebar */}
            <GovSidebar currentUser={user} activeTab="today" />

            {/* Main Viewport */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
                {/* Top App Bar */}
                <header className="h-16 px-6 flex items-center justify-between shrink-0 bg-white dark:bg-[#0c1424] border-b border-slate-200 dark:border-slate-800/80 relative z-50">
                    <div className="flex flex-col text-left">
                        <GovBreadcrumb category="Operations" current="Daily Briefing & Today" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-none mt-0.5">
                            Daily Operations: Today
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={loadTodayData}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090e1a] text-xs font-heading font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shadow-2xs"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin text-[#ff6b00]' : 'text-slate-400'} />
                            <span>Refresh</span>
                        </button>
                        <ThemeToggle />
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={user} />
                    </div>
                </header>

                {/* Scrollable Operations Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Error Banner */}
                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 flex items-center justify-between gap-3 text-xs text-red-700 dark:text-red-400">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0 text-red-500" />
                                <div>
                                    <strong className="font-semibold">Error loading operations data:</strong> {error}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={loadTodayData}
                                className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-semibold hover:bg-red-200 transition-colors cursor-pointer"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Top 5 Leadership Metric Cards */}
                    <section aria-label="Operational Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* 1. Unassigned Concerns */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 border-t-3 border-t-amber-500 p-4.5 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Unassigned Concerns</span>
                                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500">
                                    <Inbox size={15} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {metrics.unassigned_concerns}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Incoming reports awaiting intake triage
                            </p>
                        </div>

                        {/* 2. Overdue Actions */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 border-t-3 border-t-rose-500 p-4.5 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Overdue Actions</span>
                                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-500">
                                    <Clock size={15} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {metrics.overdue_actions}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Past approved SLA completion threshold
                            </p>
                        </div>

                        {/* 3. Awaiting Verification */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 border-t-3 border-t-sky-500 p-4.5 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Awaiting Verification</span>
                                <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-500">
                                    <ShieldCheck size={15} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {metrics.awaiting_verification}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Work submitted, pending review
                            </p>
                        </div>

                        {/* 4. Open High-Priority */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 border-t-3 border-t-red-600 p-4.5 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Open High-Priority</span>
                                <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600">
                                    <AlertTriangle size={15} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {metrics.open_high_priority}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Critical or hazardous community reports
                            </p>
                        </div>

                        {/* 5. Resolved (7d) */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 border-t-3 border-t-emerald-500 p-4.5 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Resolved (7d)</span>
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 size={15} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {metrics.resolved_in_period}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Cases certified & resolved this period
                            </p>
                        </div>
                    </section>

                    {/* 2-Column Operational Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Column: Triage Feed & Sector Distribution */}
                        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
                            {/* Needs Your Attention Triage Feed */}
                            <section className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="font-heading font-black text-base text-slate-900 dark:text-white tracking-tight">
                                            Needs Your Attention
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Prioritized items requiring assignment, verification, or blocker resolution.
                                        </p>
                                    </div>
                                    <Link
                                        to="/gov/reports"
                                        className="text-xs font-heading font-bold text-[#ff6b00] hover:text-[#e65c00] flex items-center gap-1 transition-colors"
                                    >
                                        <span>View full queue</span>
                                        <ChevronRight size={13} />
                                    </Link>
                                </div>

                                {loading && (
                                    <div className="py-10 text-center text-slate-400">
                                        <Clock size={22} className="animate-spin mx-auto mb-2 text-[#ff6b00]" />
                                        <p className="text-xs font-medium">Loading triage queue...</p>
                                    </div>
                                )}

                                {!loading && needsAttention.length === 0 && (
                                    <div className="py-10 text-center text-slate-400">
                                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                                        <p className="text-sm font-heading font-bold text-slate-800 dark:text-slate-200">All clear! No urgent items pending.</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All incoming reports have been triaged or dispatched.</p>
                                    </div>
                                )}

                                {!loading && needsAttention.length > 0 && (
                                    <div className="space-y-3">
                                        {needsAttention.map((item) => (
                                            <div
                                                key={`${item.entity_type}-${item.id}`}
                                                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#090e1a] flex items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-mono-data font-bold text-[#ff6b00]">
                                                            {formatTicketId(item.ticket_id, item.id, true)}
                                                        </span>
                                                        <span className={`text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-md border ${
                                                            item.priority === 'CRITICAL'
                                                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                : item.priority === 'HIGH'
                                                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                                        }`}>
                                                            {item.priority}
                                                        </span>
                                                        <span className="text-xs font-mono-data text-slate-400">
                                                            · {item.time_in_state}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white truncate">
                                                        {humanize(item.title)}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                        {item.barangay || 'Caloocan City'} · Next: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{item.recommended_action}</strong>
                                                    </p>
                                                </div>

                                                <Link
                                                    to={item.action_url || `/gov/reports/${item.id}`}
                                                    className="shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white text-xs font-heading font-bold shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
                                                >
                                                    <span>Act</span>
                                                    <ArrowRight size={13} />
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Municipal Sector Distribution */}
                            {sectorSummary && (
                                <section className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="font-heading font-black text-base text-slate-900 dark:text-white tracking-tight">
                                                    Municipal Sector Distribution
                                                </h2>
                                                <span className="text-[10px] font-mono-data font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                    GIS OPERATIONAL HUB
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Dual-sector jurisdiction boundaries, live incident density, and rapid sector switching.
                                            </p>
                                        </div>

                                        {/* Quick Map & Sector Controls */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {/* Sector Scope Pills */}
                                            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSectorChange('all')}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer ${
                                                        activeSector === 'all'
                                                            ? 'bg-white dark:bg-[#131d31] text-slate-900 dark:text-white shadow-xs'
                                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    All
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSectorChange('north')}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer ${
                                                        activeSector === 'north'
                                                            ? 'bg-[#ff6b00] text-white shadow-xs'
                                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    North
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSectorChange('south')}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer ${
                                                        activeSector === 'south'
                                                            ? 'bg-amber-500 text-white shadow-xs'
                                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    South
                                                </button>
                                            </div>

                                            {/* Heatmap Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => setShowMapHeatmap(prev => !prev)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-heading font-semibold transition-all cursor-pointer ${
                                                    showMapHeatmap
                                                        ? 'bg-orange-500/10 dark:bg-orange-500/20 text-[#ff6b00] border-orange-500/30'
                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                }`}
                                                title="Toggle live incident heatmap"
                                            >
                                                <Flame size={13} className={showMapHeatmap ? 'text-[#ff6b00]' : ''} />
                                                <span>Heatmap</span>
                                            </button>

                                            {/* Incident Pins Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => setShowIncidentPins(prev => !prev)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-heading font-semibold transition-all cursor-pointer ${
                                                    showIncidentPins
                                                        ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                }`}
                                                title="Toggle incident markers"
                                            >
                                                <MapPin size={13} />
                                                <span>Pins</span>
                                            </button>

                                            {/* Style Toggle (Roadmap vs Satellite) */}
                                            <button
                                                type="button"
                                                onClick={() => setMapStyleType(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
                                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                                                title={`Switch to ${mapStyleType === 'roadmap' ? 'Satellite' : 'Roadmap'} view`}
                                            >
                                                <Layers size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dual-Sector Interactive GIS Map */}
                                    <div className="relative w-full h-[280px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#070c16] mb-4">
                                        {!isMapLoaded ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-[#090f1a] text-xs font-heading text-slate-400 animate-pulse">
                                                <div className="flex items-center gap-2">
                                                    <Compass className="animate-spin text-[#ff6b00]" size={16} />
                                                    <span>Initializing Civic GIS Aperture...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <GoogleMap
                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                center={
                                                    activeSector === 'north'
                                                        ? NORTH_CALOOCAN_CENTROID
                                                        : activeSector === 'south'
                                                        ? SOUTH_CALOOCAN_CENTROID
                                                        : COMBINED_CALOOCAN_BOUNDS.center
                                                }
                                                zoom={activeSector === 'north' || activeSector === 'south' ? 12 : 11}
                                                options={mapOptions}
                                                mapTypeId={mapStyleType}
                                                onLoad={(map) => setTodayMap(map)}
                                            >
                                                {/* North Caloocan Sector Boundary */}
                                                <PolygonF
                                                    paths={NORTH_CALOOCAN_PATH}
                                                    options={{
                                                        strokeColor: '#ff6b00',
                                                        strokeOpacity: activeSector === 'north' ? 1.0 : 0.6,
                                                        strokeWeight: activeSector === 'north' ? 2.5 : 1.5,
                                                        fillColor: '#ff6b00',
                                                        fillOpacity: activeSector === 'north' ? 0.14 : 0.04,
                                                    }}
                                                    onClick={() => handleSectorChange('north')}
                                                />

                                                {/* South Caloocan Sector Boundary */}
                                                <PolygonF
                                                    paths={SOUTH_CALOOCAN_PATH}
                                                    options={{
                                                        strokeColor: '#f59e0b',
                                                        strokeOpacity: activeSector === 'south' ? 1.0 : 0.6,
                                                        strokeWeight: activeSector === 'south' ? 2.5 : 1.5,
                                                        fillColor: '#f59e0b',
                                                        fillOpacity: activeSector === 'south' ? 0.14 : 0.04,
                                                    }}
                                                    onClick={() => handleSectorChange('south')}
                                                />

                                                {/* Report Density Heatmap Layer */}
                                                <ReportDensityLayer
                                                    data={heatmapPoints}
                                                    enabled={showMapHeatmap}
                                                    radius={28}
                                                    opacity={0.8}
                                                />

                                                {/* Incident Markers */}
                                                {showIncidentPins && sectorFilteredIncidents.map((inc) => {
                                                    const isCrit = inc.ai_urgency === 'critical' || inc.urgency === 'critical';
                                                    const markerFill = isCrit ? '#ef4444' : '#ff6b00';
                                                    return (
                                                        <MarkerF
                                                            key={inc.id || inc.ticket_id}
                                                            position={{ lat: Number(inc.latitude), lng: Number(inc.longitude) }}
                                                            icon={{
                                                                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z',
                                                                fillColor: markerFill,
                                                                fillOpacity: 1,
                                                                strokeWeight: 1.5,
                                                                strokeColor: '#ffffff',
                                                                scale: 1.25,
                                                                anchor: { x: 12, y: 22 }
                                                            }}
                                                            onClick={() => setSelectedIncident(inc)}
                                                        />
                                                    );
                                                })}

                                                {/* Selected Incident Info Window */}
                                                {selectedIncident && (
                                                    <InfoWindowF
                                                        position={{
                                                            lat: Number(selectedIncident.latitude),
                                                            lng: Number(selectedIncident.longitude)
                                                        }}
                                                        onCloseClick={() => setSelectedIncident(null)}
                                                    >
                                                        <div className="p-1 min-w-[190px] max-w-[240px] text-slate-900 font-sans">
                                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                                <span className="font-mono text-xs font-bold text-[#ff6b00]">
                                                                    {formatTicketId(selectedIncident.ticket_id, selectedIncident.id, true)}
                                                                </span>
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 uppercase">
                                                                    {selectedIncident.status || 'Active'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-900 line-clamp-1 mb-0.5">
                                                                {selectedIncident.title || selectedIncident.description || 'Civic Concern'}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 mb-2 truncate">
                                                                {selectedIncident.location_barangay || selectedIncident.location_address || 'Caloocan City'}
                                                            </p>
                                                            <Link
                                                                to={`/gov/reports/${selectedIncident.id}`}
                                                                className="block text-center py-1 px-2 rounded-lg bg-[#ff6b00] hover:bg-[#e65c00] text-white text-[11px] font-bold transition-all cursor-pointer"
                                                            >
                                                                Open Docket
                                                            </Link>
                                                        </div>
                                                    </InfoWindowF>
                                                )}
                                            </GoogleMap>
                                        )}

                                        {/* Corner Sector Legend Badges */}
                                        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 pointer-events-none">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 dark:bg-black/80 backdrop-blur-xs text-[10px] font-mono-data font-bold text-[#ff6b00] border border-[#ff6b00]/30 shadow-xs">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]" />
                                                North Sector
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 dark:bg-black/80 backdrop-blur-xs text-[10px] font-mono-data font-bold text-amber-500 border border-amber-500/30 shadow-xs">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                South Sector
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sector Summaries (Clickable to switch map focus) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* North Caloocan */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleSectorChange('north')}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSectorChange('north')}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                                                activeSector === 'north'
                                                    ? 'border-[#ff6b00] ring-1 ring-[#ff6b00]/40 bg-orange-50/40 dark:bg-orange-950/10'
                                                    : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#090e1a] hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={15} className="text-[#ff6b00]" />
                                                    <strong className="font-heading font-bold text-sm text-slate-900 dark:text-white">North Caloocan</strong>
                                                </div>
                                                <span className="text-[10px] font-heading font-semibold text-slate-400 hover:text-[#ff6b00]">
                                                    {activeSector === 'north' ? '● Active' : 'Focus Sector →'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <span className="text-[11px] font-heading font-medium text-slate-500 dark:text-slate-400">Open Tickets</span>
                                                    <div className="text-xl font-mono-data font-bold text-slate-900 dark:text-white mt-0.5">
                                                        {sectorSummary.north_caloocan.open_tickets}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-heading font-medium text-slate-500 dark:text-slate-400">Critical</span>
                                                    <div className="text-xl font-mono-data font-bold text-red-500 mt-0.5">
                                                        {sectorSummary.north_caloocan.critical_count}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-heading font-medium text-slate-500 dark:text-slate-400">Active WOs</span>
                                                    <div className="text-xl font-mono-data font-bold text-slate-900 dark:text-white mt-0.5">
                                                        {sectorSummary.north_caloocan.active_work_orders}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-heading font-medium text-slate-500 dark:text-slate-400">Resolved (7d)</span>
                                                    <div className="text-xl font-mono-data font-bold text-emerald-500 mt-0.5">
                                                        {sectorSummary.north_caloocan.resolved_7d}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* South Caloocan */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleSectorChange('south')}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSectorChange('south')}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                                                activeSector === 'south'
                                                    ? 'border-amber-500 ring-1 ring-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10'
                                                    : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#090e1a] hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={15} className="text-amber-500" />
                                                    <strong className="font-heading font-bold text-sm text-slate-900 dark:text-white">South Caloocan</strong>
                                                </div>
                                                <span className="text-[10px] font-heading font-semibold text-slate-400 hover:text-amber-500">
                                                    {activeSector === 'south' ? '● Active' : 'Focus Sector →'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <span className="text-[11px] font-heading font-medium text-slate-500 dark:text-slate-400">Open Tickets</span>
                                                    <div className="text-xl font-mono-data font-bold text-slate-900 dark:text-white mt-0.5">
                                                        {sectorSummary.south_caloocan.open_tickets}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-heading font-medium text-slate-500 dark:text-slate-400">Critical</span>
                                                    <div className="text-xl font-mono-data font-bold text-red-500 mt-0.5">
                                                        {sectorSummary.south_caloocan.critical_count}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-heading font-medium text-slate-500 dark:text-slate-400">Active WOs</span>
                                                    <div className="text-xl font-mono-data font-bold text-slate-900 dark:text-white mt-0.5">
                                                        {sectorSummary.south_caloocan.active_work_orders}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-heading font-medium text-slate-500 dark:text-slate-400">Resolved (7d)</span>
                                                    <div className="text-xl font-mono-data font-bold text-emerald-500 mt-0.5">
                                                        {sectorSummary.south_caloocan.resolved_7d}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Right Column: Team Capacity & Workspaces */}
                        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
                            {/* Team Capacity & Blockers */}
                            <section className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-heading font-black text-base text-slate-900 dark:text-white tracking-tight">
                                        Team Capacity & Blockers
                                    </h2>
                                    <Link
                                        to="/gov/work-orders"
                                        className="text-xs font-heading font-bold text-[#ff6b00] hover:text-[#e65c00] transition-colors"
                                    >
                                        Work orders
                                    </Link>
                                </div>

                                {teamCapacity.length === 0 ? (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">No active field teams currently configured.</p>
                                ) : (
                                    <div className="space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {teamCapacity.map((team, idx) => (
                                            <div key={team.team_id} className={idx > 0 ? 'pt-3' : ''}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <strong className="font-heading font-bold text-xs text-slate-800 dark:text-slate-200">
                                                        {team.team_name}
                                                    </strong>
                                                    <span className="text-[11px] font-mono-data text-slate-500 dark:text-slate-400">
                                                        {team.active_orders} active · {team.blocked_orders > 0 ? (
                                                            <span className="text-red-500 font-bold">{team.blocked_orders} blocked</span>
                                                        ) : (
                                                            '0 blocked'
                                                        )}
                                                    </span>
                                                </div>

                                                {/* Capacity Progress Bar */}
                                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden my-1">
                                                    <div
                                                        style={{ width: `${Math.min(team.capacity_pct, 100)}%` }}
                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                            team.capacity_pct > 85
                                                                ? 'bg-red-500'
                                                                : team.capacity_pct > 65
                                                                ? 'bg-amber-500'
                                                                : 'bg-[#ff6b00]'
                                                        }`}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] font-mono-data text-slate-400">
                                                    <span>{team.category} ({team.personnel_count} staff)</span>
                                                    <span>{team.capacity_pct}% capacity</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Quick Engineering Workspaces Navigators */}
                            <section className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs">
                                <h2 className="font-heading font-black text-base text-slate-900 dark:text-white tracking-tight mb-3">
                                    Engineering Workspaces
                                </h2>
                                <div className="grid grid-cols-2 gap-3">
                                    <Link
                                        to="/gov/reports"
                                        className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#090e1a] text-slate-800 dark:text-slate-200 text-xs font-heading font-bold hover:border-[#ff6b00] hover:text-[#ff6b00] dark:hover:border-[#ff6b00] dark:hover:text-[#ff6b00] transition-all group"
                                    >
                                        <Inbox size={16} className="text-[#ff6b00] shrink-0" />
                                        <span>Citizen Reports</span>
                                    </Link>

                                    <Link
                                        to="/gov/work-orders"
                                        className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#090e1a] text-slate-800 dark:text-slate-200 text-xs font-heading font-bold hover:border-amber-500 hover:text-amber-500 dark:hover:border-amber-500 dark:hover:text-amber-500 transition-all group"
                                    >
                                        <Wrench size={16} className="text-amber-500 shrink-0" />
                                        <span>Work Orders</span>
                                    </Link>

                                    <Link
                                        to="/gov/assets"
                                        className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#090e1a] text-slate-800 dark:text-slate-200 text-xs font-heading font-bold hover:border-emerald-500 hover:text-emerald-500 dark:hover:border-emerald-500 dark:hover:text-emerald-500 transition-all group"
                                    >
                                        <Building2 size={16} className="text-emerald-500 shrink-0" />
                                        <span>Physical Assets</span>
                                    </Link>

                                    <Link
                                        to="/gov/announcements"
                                        className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#090e1a] text-slate-800 dark:text-slate-200 text-xs font-heading font-bold hover:border-violet-500 hover:text-violet-500 dark:hover:border-violet-500 dark:hover:text-violet-500 transition-all group"
                                    >
                                        <Megaphone size={16} className="text-violet-500 shrink-0" />
                                        <span>Advisories</span>
                                    </Link>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
