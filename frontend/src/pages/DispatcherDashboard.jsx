import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    AlertTriangle, 
    Search, 
    CheckCircle, 
    Clock, 
    ChevronRight, 
    Map as MapIcon, 
    Filter, 
    MoreHorizontal,
    Navigation,
    ShieldAlert,
    TrendingUp,
    Droplets,
    Zap,
    HardHat,
    Eye,
    Brain,
    LayoutDashboard,
    Briefcase,
    Settings,
    Radio,
    MapPin,
    Truck
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Link, useNavigate } from 'react-router-dom';
import GovSidebar from '../components/GovSidebar';

const DispatcherDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [token, setToken] = useState(() => localStorage.getItem('pulso_token'));
    const [currentUser, setCurrentUser] = useState(() => {
        const storedUser = localStorage.getItem('pulso_user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    useEffect(() => {
        if (!token || !currentUser) {
            navigate('/login');
        } else {
            if (currentUser.role !== 'dispatcher' && currentUser.role !== 'manager') {
                navigate('/dashboard'); // Not authorized
            }
        }
    }, [token, currentUser, navigate]);

    const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'fleet'
    const [dashboardMode, setDashboardMode] = useState('triage'); // 'triage', 'active'
    const [selectedReport, setSelectedReport] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [allReports, setAllReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [map, setMap] = useState(null);

    const center = { lat: 14.7566, lng: 121.0450 }; // Caloocan North Center
    const mapContainerStyle = { width: '100%', height: '100%' };

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    });

    const onUnmount = useCallback(function callback(map) {
        setMap(null)
    }, []);

    // Derive a confidence score from real Gemini AI urgency
    const urgencyToConfidence = (urgency) => {
        if (!urgency) return 60;
        switch (urgency.toLowerCase()) {
            case 'critical': return 95;
            case 'high':     return 85;
            case 'medium':   return 70;
            case 'low':      return 55;
            default:         return 60;
        }
    };

    const fetchReports = async () => {
        setLoadingReports(true);
        try {
            const response = await fetch('http://localhost:8000/api/reports', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAllReports(data);
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setLoadingReports(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const [actionLoading, setActionLoading] = useState(null); // tracks which report is being actioned

    const handleStatusAction = async (reportId, endpoint, successMsg) => {
        setActionLoading(reportId);
        try {
            const response = await fetch(`http://localhost:8000/api/reports/${reportId}${endpoint}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // /status endpoint requires a body; specific endpoints (/reject, /dispatch, /resolve) do not
                body: endpoint === '/status' ? JSON.stringify({ status: 'pending_approval' }) : undefined
            });
            if (response.ok) {
                fetchReports();
                setSelectedReport(null);
            } else {
                const err = await response.json();
                console.error(`Action failed: ${err.detail || endpoint}`);
            }
        } catch (error) {
            console.error(`Error on ${endpoint}:`, error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleVerifyReport  = (id) => handleStatusAction(id, '/status');
    const handleRejectReport  = (id) => handleStatusAction(id, '/reject');
    const handleDispatchReport = (id) => handleStatusAction(id, '/dispatch');
    const handleResolveReport  = (id) => handleStatusAction(id, '/resolve');

    const activeReports = allReports.filter(report => 
        dashboardMode === 'triage' 
            ? ['unverified', 'pending', 'pending_approval'].includes(report.status) // In phase 1 reports are created as 'pending'
            : report.status === 'approved_internal'
    );

    // Fallback UI mapping for DB fields
    const getReportIcon = (category) => {
        if (!category) return <AlertTriangle size={16}/>;
        const cat = category.toLowerCase();
        if (cat.includes('water') || cat.includes('flood')) return <Droplets size={16}/>;
        if (cat.includes('electrical') || cat.includes('wire')) return <Zap size={16}/>;
        if (cat.includes('road') || cat.includes('pothole')) return <HardHat size={16}/>;
        return <AlertTriangle size={16}/>;
    };

    const getReportColor = (category) => {
        if (!category) return 'slate';
        const cat = category.toLowerCase();
        if (cat.includes('water') || cat.includes('flood')) return 'blue';
        if (cat.includes('electrical') || cat.includes('wire')) return 'red';
        if (cat.includes('road') || cat.includes('pothole')) return 'orange';
        return 'slate';
    };

    // Mock Fleet Data
    const fleetStatus = [
        { id: 'FL-01', name: 'Team Alpha', status: 'Available', type: 'Electrical', location: 'Zone 12' },
        { id: 'FL-02', name: 'Team Beta', status: 'En Route', type: 'General/Roads', location: 'Main Avenue' },
        { id: 'FL-03', name: 'Team Gamma', status: 'On Site', type: 'Plumbing/Water', location: 'Block 4' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-300 font-sans flex text-sm overflow-hidden">
            
            {/* Unified Left Sidebar Navigation */}
            <GovSidebar currentUser={currentUser} />


            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                
                {/* Top Header */}
                <header className="h-16 bg-white dark:bg-slate-900/50 flex items-center justify-between px-8 shrink-0 z-40 relative">
                    {/* Removed bottom header shadow */}
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                            LGU Command Center
                        </h1>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                        
                        {/* Dashboard Mode Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => { setDashboardMode('triage'); setActiveTab('queue'); setSelectedReport(null); }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${dashboardMode === 'triage' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <AlertTriangle size={16} className={dashboardMode === 'triage' ? 'text-orange-500' : ''}/>
                                Triage Mode
                            </button>
                            <button
                                onClick={() => { setDashboardMode('active'); setActiveTab('fleet'); setSelectedReport(null); }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${dashboardMode === 'active' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <Radio size={16} className={dashboardMode === 'active' ? 'text-blue-500' : ''} />
                                Active Operations
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400"><span className="text-slate-900 dark:text-white">{activeReports.length}</span> Unverified</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400"><span className="text-slate-900 dark:text-white">8/12</span> Teams Available</span>
                        </div>
                    </div>
                </header>

                {/* Dashboard Canvas */}
                <main className="flex-1 flex overflow-hidden relative">
                    {/* Left Inner Sidebar - Live Incident Feed */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div 
                            initial={{ x: -320, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -320, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-80 bg-white dark:bg-slate-900 flex flex-col z-30 shrink-0 relative"
                        >
                            {/* Removed right subtle shadow */}
                            <div className="p-4 relative flex flex-col gap-3">
                                {/* Removed bottom shadow */}
                                <h2 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                    {dashboardMode === 'triage' ? (
                                        <><AlertTriangle size={18} className="text-orange-500"/> Incoming Reports</>
                                    ) : (
                                        <><Radio size={18} className="text-blue-500"/> Dispatched Work</>
                                    )}
                                </h2>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                                    <input type="text" placeholder="Search reports..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-300 dark:focus:border-slate-600 transition-colors" />
                                </div>
                            </div>
                            
                            {/* Report List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {loadingReports ? (
                                    <div className="p-4 text-center text-slate-500">Loading reports...</div>
                                ) : activeReports.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500">No active reports in queue.</div>
                                ) : (
                                    activeReports.map(report => {
                                        const color = getReportColor(report.ai_category || report.category);
                                        const icon = getReportIcon(report.ai_category || report.category);
                                        const aiConfidence = urgencyToConfidence(report.ai_urgency);
                                        
                                        return (
                                        <button 
                                            key={report.id}
                                            onClick={() => setSelectedReport({...report, aiConfidence, color, icon})}
                                            className={`w-full text-left p-3 rounded-xl border transition-all ${selectedReport?.id === report.id ? `bg-${color}-50 dark:bg-${color}-900/20 border-${color}-200 dark:border-${color}-500/50` : 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-400 flex items-center justify-center`}>
                                                        {icon}
                                                    </div>
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm">{report.ticket_id || `RPT-${report.id}`}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(report.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate mb-1">{report.ai_category || report.category}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mb-3 truncate">
                                                <MapPin size={12}/> {report.location_string || `${report.location_lat?.toFixed(4)}, ${report.location_lng?.toFixed(4)}`}
                                            </div>
                                            
                                            <div className="flex items-center justify-between mt-2 pt-2 relative">
                                                <div className="absolute -top-4 left-0 w-full h-4 bg-gradient-to-t from-slate-100/50 to-transparent dark:from-slate-800/50 dark:to-transparent pointer-events-none"></div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`w-2 h-2 rounded-full ${aiConfidence < 75 ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                        {report.ai_urgency ? `AI: ${report.ai_urgency}` : `Conf: ${aiConfidence}%`}
                                                    </span>
                                                </div>
                                                {(report.status === 'unverified' || report.status === 'pending') && (
                                                    <span 
                                                        onClick={(e) => { e.stopPropagation(); handleVerifyReport(report.id); }}
                                                        className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 transition-colors cursor-pointer"
                                                    >
                                                        {actionLoading === report.id ? '...' : 'Verify'}
                                                    </span>
                                                )}
                                                {report.status === 'pending_approval' && (
                                                    <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-1"><Clock size={10}/> Pending Eng</span>
                                                )}
                                                {report.status === 'approved_internal' && (
                                                    <span 
                                                        onClick={(e) => { e.stopPropagation(); handleDispatchReport(report.id); }}
                                                        className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-colors cursor-pointer"
                                                    >
                                                        {actionLoading === report.id ? '...' : 'Dispatch'}
                                                    </span>
                                                )}
                                                {report.status === 'dispatched' && (
                                                    <span 
                                                        onClick={(e) => { e.stopPropagation(); handleResolveReport(report.id); }}
                                                        className="text-[10px] bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider hover:bg-green-600 hover:text-white dark:hover:bg-green-500 transition-colors cursor-pointer"
                                                    >
                                                        {actionLoading === report.id ? '...' : 'Resolve'}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    )})
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Map Area (Center) */}
                <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={center}
                            zoom={14}
                            onLoad={map => setMap(map)}
                            onUnmount={onUnmount}
                            options={{
                                styles: [
                                    { "elementType": "geometry", "stylers": [{ "color": "#121826" }] },
                                    { "elementType": "labels.text.fill", "stylers": [{ "color": "#637282" }] },
                                    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#121826" }] },
                                    { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#2c3e50" }] },
                                    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#232b3d" }] },
                                    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0d1117" }] }
                                ],
                                disableDefaultUI: true,
                                zoomControl: true
                            }}
                        >
                            {/* Render markers for all reports */}
                            {allReports.map(report => (
                                (report.location_lat && report.location_lng) && (
                                    <MarkerF
                                        key={report.id}
                                        position={{ lat: report.location_lat, lng: report.location_lng }}
                                        onClick={() => {
                                            setSelectedReport(report);
                                            setSelectedMarker(report);
                                        }}
                                        icon={{
                                            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                                            fillColor: report.status === 'resolved' ? '#22c55e' : (report.status === 'pending' ? '#ef4444' : '#f97316'),
                                            fillOpacity: 1,
                                            strokeWeight: 2,
                                            strokeColor: '#ffffff',
                                            scale: 1.5,
                                            anchor: new window.google.maps.Point(12, 22)
                                        }}
                                    />
                                )
                            ))}

                            {selectedMarker && (
                                <InfoWindowF
                                    position={{ lat: selectedMarker.location_lat, lng: selectedMarker.location_lng }}
                                    onCloseClick={() => setSelectedMarker(null)}
                                >
                                    <div className="p-2 text-slate-900 min-w-[150px]">
                                        <div className="font-bold text-xs mb-1">RPT-[{selectedMarker.id}]</div>
                                        <div className="text-[10px] mb-1 capitalize">{selectedMarker.category || 'Uncategorized'}</div>
                                        <div className={`text-[10px] font-bold ${selectedMarker.status === 'resolved' ? 'text-green-600' : 'text-orange-600'}`}>
                                            {selectedMarker.status.replace('_', ' ').toUpperCase()}
                                        </div>
                                    </div>
                                </InfoWindowF>
                            )}
                        </GoogleMap>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}

                    {/* Map UI Floating Controls */}
                    <div className="absolute bottom-6 left-6 flex flex-col gap-2 pointer-events-none">
                        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3 flex flex-col gap-3 shadow-xl pointer-events-auto">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Live Map Feed</h4>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Pending
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-500">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div> Active
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-500">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div> Resolved
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Selected Details or AI Validation Queue */}
                <div className="w-80 bg-white dark:bg-slate-900 flex flex-col z-30 shrink-0 relative">
                    {/* Removed left sidebar inner shadow */}
                    <div className="flex relative">
                        {/* Removed lower shadow */}
                        {dashboardMode === 'triage' && (
                            <button 
                                onClick={() => setActiveTab('queue')}
                                className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'queue' ? 'border-orange-500 text-orange-600 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Triage Queue
                            </button>
                        )}
                        <button 
                            onClick={() => setActiveTab('fleet')}
                            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'fleet' ? 'border-orange-500 text-orange-600 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Field Fleets
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {activeTab === 'queue' && dashboardMode === 'triage' && (
                            <div className="space-y-4">
                                {selectedReport ? (
                                    <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <ShieldAlert className="text-orange-500 shrink-0" size={20}/>
                                            <div className="w-full">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Human-in-the-Loop Required</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">AI Vision confidence for <strong>RPT-[{selectedReport.id}]</strong> is {selectedReport.aiConfidence}%. Manual categorization required before generating Work Order.</p>
                                                
                                                <div className="bg-white dark:bg-slate-900 rounded-lg p-2 mb-3 border border-slate-200 dark:border-slate-800">
                                                    <div className="text-xs font-bold text-slate-500 mb-2">Attached Image:</div>
                                                    <div className="w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex items-center justify-center text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700">
                                                        {selectedReport.image_url ? (
                                                            <img src={selectedReport.image_url} alt="Report" className="w-full h-full object-cover" />
                                                        ) : "[ Citizen Uploaded Media ]"}
                                                    </div>
                                                </div>

                                                {selectedReport.ai_summary && (
                                                    <div className="mb-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                                                        <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs mb-2 uppercase tracking-tight">
                                                            <Brain size={14}/> Gemini AI Smart Analysis
                                                        </div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                                                            "{selectedReport.ai_summary}"
                                                        </p>
                                                        <div className="mt-2 flex gap-2">
                                                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">
                                                                AI Category: {selectedReport.ai_category}
                                                            </span>
                                                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${selectedReport.ai_urgency === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                                AI Urgency: {selectedReport.ai_urgency}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button 
                                                        onClick={() => handleRejectReport(selectedReport.id)}
                                                        disabled={actionLoading === selectedReport.id}
                                                        className="bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 py-2 rounded text-xs font-bold transition-colors border border-red-200 dark:border-red-700 disabled:opacity-50"
                                                    >
                                                        {actionLoading === selectedReport.id ? '...' : 'Reject Spam'}
                                                    </button>
                                                    {(selectedReport.status === 'unverified' || selectedReport.status === 'pending') && (
                                                        <button 
                                                            onClick={() => handleVerifyReport(selectedReport.id)}
                                                            disabled={actionLoading === selectedReport.id}
                                                            className="bg-orange-600 hover:bg-orange-500 text-white py-2 rounded text-xs font-bold transition-colors shadow disabled:opacity-50"
                                                        >
                                                            {actionLoading === selectedReport.id ? '...' : 'Verify to Manager'}
                                                        </button>
                                                    )}
                                                    {selectedReport.status === 'approved_internal' && (
                                                        <button 
                                                            onClick={() => handleDispatchReport(selectedReport.id)}
                                                            disabled={actionLoading === selectedReport.id}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-xs font-bold transition-colors shadow disabled:opacity-50"
                                                        >
                                                            {actionLoading === selectedReport.id ? '...' : 'Dispatch Team'}
                                                        </button>
                                                    )}
                                                    {selectedReport.status === 'dispatched' && (
                                                        <button 
                                                            onClick={() => handleResolveReport(selectedReport.id)}
                                                            disabled={actionLoading === selectedReport.id}
                                                            className="bg-green-600 hover:bg-green-500 text-white py-2 rounded text-xs font-bold transition-colors shadow disabled:opacity-50"
                                                        >
                                                            {actionLoading === selectedReport.id ? '...' : 'Mark Resolved'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                                        Select an unverified report from the feed to review.
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'fleet' && (
                            <div className="space-y-3">
                                {fleetStatus.map(team => (
                                    <div key={team.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-sm text-white flex items-center gap-2"><Truck size={14} className="text-slate-400"/> {team.name}</h4>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                                team.status === 'Available' ? 'bg-green-900/30 text-green-400' :
                                                team.status === 'En Route' ? 'bg-blue-900/30 text-blue-400' :
                                                'bg-orange-900/30 text-orange-400'
                                            }`}>
                                                {team.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 mb-1">Type: <span className="text-slate-300">{team.type}</span></div>
                                        <div className="text-xs text-slate-400 flex justify-between items-center">
                                            <span>Loc: <span className="text-slate-300">{team.location}</span></span>
                                            {team.status === 'Available' && (
                                                <button className="text-blue-400 hover:text-blue-300 font-bold">Assign Work</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                </main>
            </div>
        </div>
    );
};

export default DispatcherDashboard;
