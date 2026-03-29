import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, AlertTriangle, TrendingUp, TrendingDown, Minus,
    BarChart2, FileText, DollarSign, Zap, RefreshCw, Download,
    ChevronRight, ArrowRight, Eye, Brain, ClipboardList,
    Activity, Shield, Building2, Layers, Target, Clock,
    CheckCircle, XCircle, Info, Loader2, Search, Filter,
    PieChart, LineChart as LineChartIcon, Globe, Navigation,
    AlertCircle, Package, ChevronDown, X, RotateCcw
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, HeatmapLayer, CircleF, MarkerF } from '@react-google-maps/api';
import GovSidebar from '../components/GovSidebar';

const API = 'http://localhost:8000';
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LIBRARIES = ['places', 'geometry', 'visualization'];

// ─── Theme Constants ─────────────────────────────────────────────────────────
const THREAT_CONFIG = {
    CRITICAL:   { color: '#ef4444', bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800',    text: 'text-red-700 dark:text-red-400',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',    ring: '#ef4444', fillOpacity: 0.18, label: 'CRITICAL' },
    HIGH:       { color: '#f97316', bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', ring: '#f97316', fillOpacity: 0.14, label: 'HIGH' },
    EMERGING:   { color: '#eab308', bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', ring: '#eab308', fillOpacity: 0.12, label: 'EMERGING' },
    MONITORING: { color: '#22c55e', bg: 'bg-green-50 dark:bg-green-900/10',  border: 'border-green-200 dark:border-green-800',  text: 'text-green-700 dark:text-green-400',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  ring: '#22c55e', fillOpacity: 0.08, label: 'OK' },
};

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#475569' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c4a6e' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, icon: Icon, color = 'indigo', trend }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-${color}-100 dark:bg-${color}-900/20`}>
            <Icon size={20} className={`text-${color}-600 dark:text-${color}-400`} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate">{value ?? '—'}</p>
            {sub && <p className="text-[10px] text-slate-500 mt-0.5 font-medium truncate">{sub}</p>}
        </div>
        {trend !== undefined && (
            <div className={`shrink-0 flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-slate-400'}`}>
                {trend > 0 ? <TrendingUp size={14}/> : trend < 0 ? <TrendingDown size={14}/> : <Minus size={14}/>}
                {Math.abs(trend)}%
            </div>
        )}
    </motion.div>
);

// ─── Threat Badge ─────────────────────────────────────────────────────────────
const ThreatBadge = ({ level }) => {
    const cfg = THREAT_CONFIG[level] || THREAT_CONFIG.MONITORING;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.badge}`}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />
            {cfg.label}
        </span>
    );
};

// ─── Cluster Card ─────────────────────────────────────────────────────────────
const ClusterCard = ({ cluster, onSelect, selected }) => {
    const cfg = THREAT_CONFIG[cluster.threat_level] || THREAT_CONFIG.MONITORING;
    return (
        <motion.div layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            onClick={() => onSelect(cluster)}
            className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${cfg.bg} ${cfg.border} ${selected ? 'ring-2 ring-offset-2' : ''}`}
            style={selected ? { ringColor: cfg.color } : {}}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <ThreatBadge level={cluster.threat_level} />
                    <p className="font-black text-slate-900 dark:text-white text-sm mt-1.5 leading-tight">
                        {cluster.dominant_category.replace(/_/g,'  ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Barangay {cluster.barangay} · {cluster.radius_meters.toFixed(0)}m radius
                    </p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-xl font-black text-slate-900 dark:text-white">{cluster.report_count}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Reports</p>
                </div>
            </div>
            <div className="flex items-center justify-between mt-2">
                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate pr-2" title={cluster.estimated_cost_formatted}>
                    {cluster.estimated_cost_formatted}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold shrink-0">
                    <span className="opacity-70 whitespace-nowrap">Recurrence: {(cluster.recurrence_score * 100).toFixed(0)}%</span>
                    <ChevronRight size={12} className="opacity-50" />
                </div>
            </div>
        </motion.div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GovAnalyticsPage() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [summary, setSummary] = useState(null);
    const [clusters, setClusters] = useState([]);
    const [forecast, setForecast] = useState([]);
    const [recurrence, setRecurrence] = useState([]);
    const [heatmapData, setHeatmapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('map');
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [generatingNarrative, setGeneratingNarrative] = useState(false);
    const [narrative, setNarrative] = useState(null);
    const [creatingPR, setCreatingPR] = useState(false);
    const [prSuccess, setPrSuccess] = useState(null);
    const [daysBack, setDaysBack] = useState(90);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [mapRef, setMapRef] = useState(null);
    const [darkMode] = useState(true);
    const [currentUser] = useState(() => JSON.parse(localStorage.getItem('pulso_user') || '{}'));

    const { isLoaded: mapsLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_KEY || '',
        libraries: LIBRARIES,
    });

    // ── Fetch All Data ──────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [summaryRes, clustersRes, forecastRes, recurrenceRes, heatmapRes] = await Promise.all([
                fetch(`${API}/api/gov/analytics/summary`, { headers }),
                fetch(`${API}/api/gov/analytics/clusters?days_back=${daysBack}${categoryFilter ? `&category=${categoryFilter}` : ''}`, { headers }),
                fetch(`${API}/api/gov/analytics/forecast`, { headers }),
                fetch(`${API}/api/gov/analytics/recurrence`, { headers }),
                fetch(`${API}/api/gov/analytics/heatmap?days_back=${daysBack}`, { headers }),
            ]);
            if (summaryRes.ok)   setSummary(await summaryRes.json());
            if (clustersRes.ok)  setClusters((await clustersRes.json()).clusters || []);
            if (forecastRes.ok)  setForecast(await forecastRes.json());
            if (recurrenceRes.ok) setRecurrence((await recurrenceRes.json()).recurrence_events || []);
            if (heatmapRes.ok)   setHeatmapData(await heatmapRes.json());
        } catch (e) {
            console.error('Analytics fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [daysBack, categoryFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Generate AI Narrative ───────────────────────────────────────────────
    const generateNarrative = async (cluster) => {
        setGeneratingNarrative(true);
        setNarrative(null);
        try {
            const res = await fetch(`${API}/api/gov/analytics/narrative`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ cluster_id: cluster.cluster_id, days_back: daysBack }),
            });
            if (res.ok) {
                const data = await res.json();
                setNarrative(data);
            }
        } catch (e) {
            console.error('Narrative generation failed:', e);
        } finally {
            setGeneratingNarrative(false);
        }
    };

    // ── Create Procurement Request ──────────────────────────────────────────
    const createProcurement = async (cluster) => {
        setCreatingPR(true);
        setPrSuccess(null);
        try {
            const res = await fetch(`${API}/api/gov/analytics/create-procurement`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cluster_id: cluster.cluster_id,
                    days_back: daysBack,
                    narrative: narrative?.narrative || null,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setPrSuccess(data);
            }
        } catch (e) {
            console.error('PR creation failed:', e);
        } finally {
            setCreatingPR(false);
        }
    };

    // ── Map center ──────────────────────────────────────────────────────────
    const mapCenter = selectedCluster
        ? { lat: selectedCluster.centroid_lat, lng: selectedCluster.centroid_lng }
        : { lat: 14.749, lng: 120.983 };

    // ── Forecast chart (simple bar) ─────────────────────────────────────────
    const getCategoryColor = (cat) => {
        const c = (cat || '').toLowerCase();
        if (c.includes('flood') || c.includes('drain')) return '#3b82f6';
        if (c.includes('road') || c.includes('pothole')) return '#f97316';
        if (c.includes('light') || c.includes('electr')) return '#eab308';
        if (c.includes('structural')) return '#ef4444';
        if (c.includes('garbage')) return '#8b5cf6';
        return '#6366f1';
    };

    const filteredClusters = clusters.filter(c =>
        !searchTerm ||
        c.barangay?.includes(searchTerm) ||
        c.dominant_category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const TABS = [
        { key: 'map',        label: 'Intelligence Map',  icon: Globe },
        { key: 'clusters',   label: 'Stress Zones',      icon: Target },
        { key: 'forecast',   label: 'Forecast',          icon: TrendingUp },
        { key: 'recurrence', label: 'Chronic Failures',  icon: RotateCcw },
    ];

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
            <GovSidebar currentUser={currentUser} activeTab="analytics" />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-8 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                            <Brain size={12}/> Infrastructure Intelligence Engine
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Analytics Command Center</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Data-driven insights for budget justification and resource allocation</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={daysBack}
                            onChange={e => setDaysBack(Number(e.target.value))}
                            className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-4 py-2 font-semibold focus:outline-none focus:border-indigo-500"
                        >
                            <option value={30}>Last 30 days</option>
                            <option value={60}>Last 60 days</option>
                            <option value={90}>Last 90 days</option>
                            <option value={180}>Last 6 months</option>
                            <option value={365}>Last year</option>
                        </select>
                        <button onClick={fetchData}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-sm px-4 py-2 rounded-xl transition-colors">
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* KPI Strip */}
                    {summary && (
                        <div className="px-8 pt-6 grid grid-cols-4 lg:grid-cols-7 gap-3 shrink-0">
                            <KPICard label="Total Reports" value={summary.total_reports} sub={`Last ${daysBack} days`} icon={Activity} color="indigo" />
                            <KPICard label="Active Clusters" value={summary.total_clusters} sub="Infrastructure stress zones" icon={Layers} color="violet" />
                            <KPICard label="Critical Zones" value={summary.critical_zones} sub="Immediate action required" icon={AlertTriangle} color="red" trend={summary.critical_zones > 0 ? summary.critical_zones : undefined} />
                            <KPICard label="High Priority" value={summary.high_zones} sub="Needs assessment" icon={Shield} color="orange" />
                            <KPICard label="Emerging Zones" value={summary.emerging_zones} sub="Growing trend detected" icon={TrendingUp} color="yellow" />
                            <KPICard label="Recurrences" value={summary.chronic_recurrence_events} sub="Chronic failures" icon={RotateCcw} color="rose" />
                            <KPICard label="Budget Exposure" value={summary.total_estimated_cost ? `₱${(summary.total_estimated_cost / 1_000_000).toFixed(1)}M` : '₱0'} sub="DPWH 2024 est." icon={DollarSign} color="emerald" />
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="px-8 mt-6 flex items-center gap-1 border-b border-slate-800 shrink-0">
                        {TABS.map(tab => (
                            <button key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-indigo-500 text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}>
                                <tab.icon size={15} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Intelligence Map Tab ── */}
                    {activeTab === 'map' && (
                        <div className="flex flex-1 overflow-hidden gap-0">
                            {/* Cluster List Sidebar */}
                            <div className="w-80 border-r border-slate-800 flex flex-col overflow-hidden bg-slate-950">
                                <div className="p-4 border-b border-slate-800">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text" placeholder="Search barangay or category..."
                                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold mt-2">{filteredClusters.length} stress zone{filteredClusters.length !== 1 ? 's' : ''} detected</p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {loading ? (
                                        <div className="text-center py-12 text-slate-500">
                                            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                                            Running DBSCAN clustering...
                                        </div>
                                    ) : filteredClusters.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500">
                                            <Target size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm font-bold">No stress zones detected</p>
                                            <p className="text-xs mt-1">Try a wider date range</p>
                                        </div>
                                    ) : filteredClusters.map(c => (
                                        <ClusterCard key={c.cluster_id} cluster={c}
                                            selected={selectedCluster?.cluster_id === c.cluster_id}
                                            onSelect={(cl) => {
                                                setSelectedCluster(cl);
                                                setNarrative(null);
                                                setPrSuccess(null);
                                                if (mapRef) mapRef.panTo({ lat: cl.centroid_lat, lng: cl.centroid_lng });
                                            }} />
                                    ))}
                                </div>
                            </div>

                            {/* Map + Detail Panel */}
                            <div className="flex-1 flex flex-col relative">
                                {/* Map */}
                                <div className="flex-1 relative">
                                    {mapsLoaded ? (
                                        <GoogleMap
                                            center={mapCenter}
                                            zoom={selectedCluster ? 16 : 14}
                                            mapContainerStyle={{ width: '100%', height: '100%' }}
                                            options={{ styles: mapStyle, disableDefaultUI: false, mapTypeControl: false, zoomControl: true, streetViewControl: false, fullscreenControl: false }}
                                            onLoad={map => setMapRef(map)}
                                        >
                                            {/* Heatmap layer */}
                                            {heatmapData?.raw_points?.length > 0 && window.google?.maps?.visualization && (
                                                <HeatmapLayer
                                                    data={heatmapData.raw_points.map(p =>
                                                        ({ location: new window.google.maps.LatLng(p.lat, p.lng), weight: p.weight || 1 })
                                                    )}
                                                    options={{ radius: 30, opacity: 0.7, maxIntensity: 12,
                                                        gradient: ['rgba(0,0,0,0)','rgba(34,197,94,0.5)','rgba(234,179,8,0.7)','rgba(249,115,22,0.9)','rgba(239,68,68,1)'] }}
                                                />
                                            )}
                                            {/* Cluster threat circles */}
                                            {clusters.map(c => {
                                                const cfg = THREAT_CONFIG[c.threat_level] || THREAT_CONFIG.MONITORING;
                                                return (
                                                    <CircleF key={c.cluster_id}
                                                        center={{ lat: c.centroid_lat, lng: c.centroid_lng }}
                                                        radius={c.radius_meters}
                                                        options={{
                                                            strokeColor: cfg.ring,
                                                            strokeOpacity: 0.9,
                                                            strokeWeight: selectedCluster?.cluster_id === c.cluster_id ? 3 : 1.5,
                                                            fillColor: cfg.ring,
                                                            fillOpacity: selectedCluster?.cluster_id === c.cluster_id ? 0.25 : cfg.fillOpacity,
                                                            clickable: true,
                                                            zIndex: selectedCluster?.cluster_id === c.cluster_id ? 10 : 1,
                                                        }}
                                                        onClick={() => { setSelectedCluster(c); setNarrative(null); setPrSuccess(null); }}
                                                    />
                                                );
                                            })}
                                            {/* Selected cluster pin */}
                                            {selectedCluster && (
                                                <MarkerF
                                                    position={{ lat: selectedCluster.centroid_lat, lng: selectedCluster.centroid_lng }}
                                                    options={{ zIndex: 20 }}
                                                />
                                            )}
                                        </GoogleMap>
                                    ) : (
                                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500">
                                            <Globe size={40} className="opacity-20" />
                                        </div>
                                    )}

                                    {/* Map Legend */}
                                    <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-2xl p-3 space-y-1.5">
                                        {Object.entries(THREAT_CONFIG).map(([key, cfg]) => (
                                            <div key={key} className="flex items-center gap-2 text-xs">
                                                <span className="w-3 h-3 rounded-full border-2 shrink-0" style={{ borderColor: cfg.ring, background: cfg.ring + '30' }} />
                                                <span className="text-slate-400 font-semibold">{cfg.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Detail Panel */}
                            <AnimatePresence>
                                {selectedCluster && (
                                    <motion.div
                                        initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                        className="w-96 border-l border-slate-800 bg-slate-950 flex flex-col overflow-hidden"
                                    >
                                        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                                            <div>
                                                <ThreatBadge level={selectedCluster.threat_level} />
                                                <h3 className="font-black text-white text-sm mt-1">
                                                    Cluster {selectedCluster.cluster_id} — Brgy {selectedCluster.barangay}
                                                </h3>
                                            </div>
                                            <button onClick={() => setSelectedCluster(null)} className="text-slate-500 hover:text-white">
                                                <X size={18} />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {/* Metrics grid */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { label: 'Reports', value: selectedCluster.report_count, icon: Activity },
                                                    { label: 'Severity', value: selectedCluster.severity_score.toFixed(1), icon: AlertTriangle },
                                                    { label: 'Recurrence', value: `${(selectedCluster.recurrence_score * 100).toFixed(0)}%`, icon: RotateCcw },
                                                    { label: 'Radius', value: `${selectedCluster.radius_meters.toFixed(0)}m`, icon: Target },
                                                ].map(m => (
                                                    <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                                                            <m.icon size={12} /> {m.label}
                                                        </div>
                                                        <p className="text-lg font-black text-white">{m.value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Category breakdown */}
                                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Categories</p>
                                                {Object.entries(selectedCluster.categories || {}).map(([cat, count]) => (
                                                    <div key={cat} className="flex items-center gap-2 mb-2">
                                                        <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                                            <div className="h-2 rounded-full" style={{
                                                                width: `${(count / selectedCluster.report_count) * 100}%`,
                                                                background: getCategoryColor(cat)
                                                            }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400 w-24 truncate capitalize">{cat.replace(/_/g,' ')}</span>
                                                        <span className="text-xs font-black text-slate-300 w-5 text-right">{count}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* BoQ Estimate */}
                                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <DollarSign size={15} className="text-emerald-400" />
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preliminary Estimate</p>
                                                </div>
                                                <p className="text-2xl font-black text-emerald-400">{selectedCluster.estimated_cost_formatted}</p>
                                                <p className="text-xs text-slate-500 mt-1">DPWH 2024 Unit Price Guide, Region 3 · Incl. 12% contingency + 8% engineering</p>
                                            </div>

                                            {/* Sample descriptions */}
                                            {selectedCluster.sample_descriptions?.length > 0 && (
                                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Citizen Reports</p>
                                                    {selectedCluster.sample_descriptions.slice(0, 3).map((d, i) => (
                                                        <p key={i} className="text-xs text-slate-400 italic border-l-2 border-slate-700 pl-3 mb-2">"{d}"</p>
                                                    ))}
                                                </div>
                                            )}

                                            {/* AI Narrative */}
                                            {narrative && (
                                                <div className="bg-indigo-950/40 border border-indigo-900/50 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Brain size={15} className="text-indigo-400" />
                                                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Engineering Assessment</p>
                                                    </div>
                                                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{narrative.narrative}</p>
                                                    <p className="text-[10px] text-indigo-500 mt-3 font-bold">Generated by PULSO Intelligence Engine · {new Date(narrative.generated_at).toLocaleString('en-PH')}</p>
                                                </div>
                                            )}

                                            {prSuccess && (
                                                <div className="bg-green-950/40 border border-green-800/50 rounded-xl p-4 flex items-start gap-3">
                                                    <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-bold text-green-400 text-sm">Procurement Request Created</p>
                                                        <p className="text-xs text-slate-400 mt-1">PR# {prSuccess.pr_number} — {prSuccess.boq_summary?.total_formatted}</p>
                                                        <button onClick={() => navigate('/gov/procurement')}
                                                            className="mt-2 text-xs font-bold text-green-400 hover:text-green-300 flex items-center gap-1">
                                                            View in Procurement <ArrowRight size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="p-4 border-t border-slate-800 space-y-2 shrink-0">
                                            <button
                                                onClick={() => generateNarrative(selectedCluster)}
                                                disabled={generatingNarrative}
                                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                                                {generatingNarrative ? <><Loader2 size={15} className="animate-spin" /> Generating Assessment...</> : <><Brain size={15} /> Generate AI Assessment</>}
                                            </button>
                                            <button
                                                onClick={() => createProcurement(selectedCluster)}
                                                disabled={creatingPR}
                                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                                                {creatingPR ? <><Loader2 size={15} className="animate-spin" /> Creating PR...</> : <><ClipboardList size={15} /> Create Procurement Request</>}
                                            </button>
                                            <button
                                                onClick={() => navigate('/gov/work-orders')}
                                                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                                                <Package size={15} /> Dispatch Work Order
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* ── Stress Zones Tab ── */}
                    {activeTab === 'clusters' && (
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative flex-1 max-w-xs">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="text" placeholder="Search zones..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                                </div>
                                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500">
                                    <option value="">All Categories</option>
                                    {['pothole','road_damage','drainage','flooding','streetlight','structural','sidewalk','garbage'].map(c => (
                                        <option key={c} value={c}>{c.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                    <span className="font-bold text-slate-300">{filteredClusters.length} Infrastructure Stress Zones</span>
                                    <span className="text-xs text-slate-500 font-semibold">Sorted by threat severity</span>
                                </div>
                                <table className="w-full">
                                    <thead className="text-xs uppercase text-slate-500 font-bold border-b border-slate-800">
                                        <tr>
                                            <th className="p-4 text-left">Zone</th>
                                            <th className="p-4 text-left">Category</th>
                                            <th className="p-4 text-left">Barangay</th>
                                            <th className="p-4 text-right">Reports</th>
                                            <th className="p-4 text-right">Severity</th>
                                            <th className="p-4 text-right">Recurrence</th>
                                            <th className="p-4 text-right">Est. Cost</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filteredClusters.map(c => (
                                            <tr key={c.cluster_id} className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                                                onClick={() => { setActiveTab('map'); setSelectedCluster(c); }}>
                                                <td className="p-4"><ThreatBadge level={c.threat_level} /></td>
                                                <td className="p-4 font-bold text-slate-300 capitalize">{c.dominant_category.replace(/_/g,' ')}</td>
                                                <td className="p-4 text-slate-400 font-semibold">Brgy {c.barangay}</td>
                                                <td className="p-4 text-right font-black text-white">{c.report_count}</td>
                                                <td className="p-4 text-right font-bold text-orange-400">{c.severity_score.toFixed(1)}</td>
                                                <td className="p-4 text-right">
                                                    <span className={`font-bold text-sm ${c.recurrence_score > 0.6 ? 'text-red-400' : c.recurrence_score > 0.3 ? 'text-orange-400' : 'text-green-400'}`}>
                                                        {(c.recurrence_score * 100).toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-bold text-emerald-400 font-mono text-sm">{c.estimated_cost_formatted}</td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setActiveTab('map'); setSelectedCluster(c); }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors">
                                                        Analyze
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Forecast Tab ── */}
                    {activeTab === 'forecast' && (
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-white">30-Day Infrastructure Forecast</h2>
                                <p className="text-slate-400 text-sm mt-1">Weekly report frequency trends per barangay and category. EMERGING zones need preemptive action.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {forecast.slice(0, 12).map((f, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                        className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 ${
                                                    f.status === 'EMERGING'  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                    f.status === 'STABLE'    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    f.status === 'DECLINING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                    {f.status === 'EMERGING' ? <TrendingUp size={10}/> : f.status === 'DECLINING' ? <TrendingDown size={10}/> : <Minus size={10}/>}
                                                    {f.status}
                                                </div>
                                                <p className="font-black text-white text-sm capitalize">{f.category.replace(/_/g,' ')}</p>
                                                <p className="text-xs text-slate-500 font-semibold">Brgy {f.barangay}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-white">{f.total_reports}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Total</p>
                                            </div>
                                        </div>
                                        {/* Mini bar chart */}
                                        <div className="flex items-end gap-1 h-12">
                                            {[...f.history.slice(-6), ...f.forecast.map(fw => ({ ...fw, projected: true }))].map((w, wi) => {
                                                const count = w.count ?? w.projected_count;
                                                const maxCount = Math.max(...f.history.map(h => h.count), ...f.forecast.map(fw => fw.projected_count), 1);
                                                const heightPct = (count / maxCount) * 100;
                                                return (
                                                    <div key={wi} title={`${w.projected ? 'Projected' : 'Week'}: ${count}`}
                                                        className={`flex-1 rounded-t transition-all ${w.projected ? 'opacity-50 border border-dashed border-indigo-500' : ''}`}
                                                        style={{
                                                            height: `${Math.max(heightPct, 5)}%`,
                                                            background: w.projected ? '#6366f1' : getCategoryColor(f.category),
                                                        }} />
                                                );
                                            })}
                                        </div>
                                        <div className="flex justify-between text-[9px] text-slate-600 font-bold mt-1">
                                            <span>Historical</span>
                                            <span>▶ Projected</span>
                                        </div>
                                        <div className={`mt-3 flex items-center gap-2 text-xs font-bold ${f.growth_pct > 30 ? 'text-red-400' : f.growth_pct > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                                            {f.growth_pct > 0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
                                            {f.growth_pct > 0 ? '+' : ''}{f.growth_pct}% trend · {f.projected_4wk_total.toFixed(0)} projected next 4 weeks
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Recurrence Tab ── */}
                    {activeTab === 'recurrence' && (
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="mb-6 bg-red-950/20 border border-red-900/30 rounded-2xl p-5">
                                <div className="flex items-start gap-3">
                                    <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-black text-red-400 text-sm">Chronic Infrastructure Failure Alert</h3>
                                        <p className="text-slate-400 text-xs mt-1">
                                            These locations have been repaired and re-reported within {daysBack} days — indicating systemic structural failure.
                                            High recurrence rates require escalated budget requests and root-cause engineering assessment, not patch repairs.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {recurrence.length === 0 ? (
                                <div className="text-center py-16 text-slate-500">
                                    <CheckCircle size={40} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-bold">No recurrence events detected</p>
                                    <p className="text-sm mt-1">All resolved repairs appear to be holding within the monitoring window.</p>
                                </div>
                            ) : (
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="text-xs uppercase text-slate-500 font-bold border-b border-slate-800">
                                            <tr>
                                                <th className="p-4 text-left">Prior Report</th>
                                                <th className="p-4 text-left">New Report</th>
                                                <th className="p-4 text-left">Category</th>
                                                <th className="p-4 text-left">Location</th>
                                                <th className="p-4 text-right">Distance</th>
                                                <th className="p-4 text-right">Days Since Repair</th>
                                                <th className="p-4 text-right">Severity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {recurrence.map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4 font-mono font-bold text-slate-400 text-xs">#{r.prior_report_id}</td>
                                                    <td className="p-4 font-mono font-bold text-red-400 text-xs">#{r.new_report_id}</td>
                                                    <td className="p-4 font-bold text-slate-300 capitalize">{(r.category || '').replace(/_/g,' ')}</td>
                                                    <td className="p-4 text-slate-400 text-sm">{r.location_string || `Brgy ${r.barangay}`}</td>
                                                    <td className="p-4 text-right text-slate-400 text-sm">{r.distance_meters}m</td>
                                                    <td className="p-4 text-right">
                                                        <span className={`font-bold text-sm ${r.days_since_resolved < 30 ? 'text-red-400' : r.days_since_resolved < 60 ? 'text-orange-400' : 'text-yellow-400'}`}>
                                                            {r.days_since_resolved ?? '—'} days
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${r.severity === 'HIGH' ? 'bg-red-900/30 text-red-400' : 'bg-orange-900/30 text-orange-400'}`}>
                                                            {r.severity}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
