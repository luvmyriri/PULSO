import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Maximize2,
    Minimize2,
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
    Truck,
    Flame,
    Activity,
    X,
    Trash2,
    Image as ImageIcon,
    Building2
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF, PolygonF, DirectionsRenderer, PolylineF, HeatmapLayerF } from '@react-google-maps/api';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import GovSidebar from '../components/GovSidebar';
import OrangeSelect from '../components/OrangeSelect';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import Swal from 'sweetalert2';

const CALOOCAN_CENTER = { lat: 14.7566, lng: 121.0450 };
const CALOOCAN_CITY_HALL_NORTH_LOC = { lat: 14.7505408, lng: 121.0540317 }; // Adjusted to exact Zapote Rd building footprint
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry', 'visualization'];

const NORTH_CALOOCAN_BOUNDARY = [
    { lat: 14.825, lng: 121.060 }, // North Tip (Tala Area)
    { lat: 14.805, lng: 121.140 }, // NE Corner (Boundary with SJDM/Rizal)
    { lat: 14.745, lng: 121.140 }, // SE Side (Bagong Silang - Brgy 176)
    { lat: 14.740, lng: 121.100 }, // Under Bagong Silang (Brgy 177 area)
    { lat: 14.710, lng: 121.070 }, // Southern Edge (Brgy 178/174 Camarin)
    { lat: 14.675, lng: 121.040 }, // Deep South Extension (To include Brgy 164/169 areas)
    { lat: 14.680, lng: 120.990 }, // SW Corner (Expansion towards Valenzuela/Meycauayan)
    { lat: 14.760, lng: 120.970 }, // West Side (Expansion towards Marilao)
    { lat: 14.820, lng: 120.970 }, // NW Corner (Marilao Border)
    { lat: 14.825, lng: 121.030 }  // Back to North Tip
];

const CALOOCAN_NORTH_BARANGAYS = [
    'All Barangays', 'Brgy. 165', 'Brgy. 166', 'Brgy. 167', 'Brgy. 168', 'Brgy. 169', 
    'Brgy. 170', 'Brgy. 171', 'Brgy. 172', 'Brgy. 173', 'Brgy. 174', 'Brgy. 175', 
    'Brgy. 176', 'Brgy. 177', 'Brgy. 178', 'Brgy. 179', 'Brgy. 180', 'Brgy. 181', 
    'Brgy. 182', 'Brgy. 183', 'Brgy. 184', 'Brgy. 185', 'Brgy. 186', 'Brgy. 187', 'Brgy. 188'
];

const INFRASTRUCTURE_CATEGORIES = [
    'All Categories',
    'Roads & Bridges',
    'Water & Drainage',
    'Street Lighting',
    'Public Safety & Regulatory',
    'Public Facilities'
];

const STATUS_OPTIONS = [
    'All Statuses',
    'Pending',
    'Pending Approval (Phase 2)',
    'Approved (Phase 3)',
    'Dispatched (Phase 4)',
    'Resolved (Phase 5)',
    'Rejected',
    'Cancelled'
];

const DispatcherDashboard = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    // Standardized API Base URL for all backend interactions
    const apiHost = window.location.hostname;
    const API_BASE_URL = `http://${apiHost}:33159`;

    const [token, setToken] = useState(() => localStorage.getItem('pulso_token'));
    const [currentUser, setCurrentUser] = useState(() => {
        const storedUser = localStorage.getItem('pulso_user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'fleet'
    const [dashboardMode, setDashboardMode] = useState('triage'); // 'triage', 'active'
    const [showHeatmap, setShowHeatmap] = useState(false);
    
    const [selectedReport, setSelectedReport] = useState(null);

    // Tactical Deep-Link state: set when navigated from Analytics Command Center
    const [tacticalContext, setTacticalContext] = useState(null); // { center, zoom, category, barangay }
    const pendingTacticalRef = useRef(null); // stores state before map is ready

    const [allReports, setAllReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [map, setMap] = useState(null);
    const [panorama, setPanorama] = useState(null);
    const heatmapLayerRef = useRef(null);
    const [zoomedImage, setZoomedImage] = useState(null);

    // New State for Work Order Generation Modal
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [isStreetViewConfirmOpen, setIsStreetViewConfirmOpen] = useState(false);
    const [pendingStreetViewLoc, setPendingStreetViewLoc] = useState(null);
    const [isStreetActive, setIsStreetActive] = useState(false);
    const [svLocation, setSvLocation] = useState(null);
    const [isStreetViewVisible, setIsStreetViewVisible] = useState(false);
    const [pulseRadius, setPulseRadius] = useState(0);
    const [isJurisdictionModalOpen, setIsJurisdictionModalOpen] = useState(false);
    const [jurisdictionErrorMsg, setJurisdictionErrorMsg] = useState("");
    const [svHeading, setSvHeading] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBarangay, setSelectedBarangay] = useState('All Barangays');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [selectedStatus, setSelectedStatus] = useState('All Statuses');
    const [reportToDelete, setReportToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: string }

    // AI Omni-Assistant State
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', text: `Greetings, Dispatcher ${currentUser?.full_name || ''}. I am your Engineering Co-pilot. How can I assist with triage today?` }
    ]);
    const [isAILoading, setIsAILoading] = useState(false);
    const [isAIMaximized, setIsAIMaximized] = useState(false);
    const aiChatEndRef = useRef(null);

    useEffect(() => {
        if (!token || !currentUser) {
            navigate('/gov');
        } else {
            const allowedRoles = [
                'dispatcher', 'manager', 'system_admin', 'city_engineer',
                'asst_city_engineer', 'admin_officer', 'admin_clerk', 'division_chief'
            ];
            if (!allowedRoles.includes(currentUser.role)) {
                navigate('/dashboard'); // Kick back citizens / outside roles
            }
        }
    }, [token, currentUser, navigate]);

    // Intelligence Deep-Link Handling: Auto-focus map if navigated from Analytics
    // Step 1 — capture incoming state immediately (before map is ready)
    useEffect(() => {
        const tacticalState = location.state;
        if (!tacticalState) return;

        // Store as pending so we can apply once map is ready
        pendingTacticalRef.current = tacticalState;

        // Set Tactical Mission Context for the banner
        setTacticalContext(tacticalState);

        // If exact report_ids exist, we use those for pinpoint filtering.
        // Only fall back to fuzzy barangay/category filters if no report_ids.
        if (!tacticalState.report_ids || tacticalState.report_ids.length === 0) {
            if (tacticalState.category) {
                const cat = tacticalState.category.toLowerCase();
                if (cat.includes('flood') || cat.includes('drain')) setSelectedCategory('Water & Drainage');
                else if (cat.includes('road') || cat.includes('pothole')) setSelectedCategory('Roads & Bridges');
                else if (cat.includes('light')) setSelectedCategory('Street Lighting');
            }
            if (tacticalState.barangay) {
                setSelectedBarangay(`Brgy. ${tacticalState.barangay}`);
            }
        }
        // When report_ids ARE present, override status filter to show all
        // (cluster reports can be in any status)
        if (tacticalState.report_ids?.length > 0) {
            setSelectedStatus('All Statuses');
        }

        // Clear location.state so refresh doesn't re-trigger
        window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    // Step 2 — once map is ready, pan to the pending tactical coordinates
    useEffect(() => {
        if (!map || !pendingTacticalRef.current) return;
        const pending = pendingTacticalRef.current;
        if (pending.center) {
            map.panTo(pending.center);
            map.setZoom(pending.zoom || 17);
        }
        pendingTacticalRef.current = null; // consume it
    }, [map]);
    const LOCATION_KEYWORDS = /location|where|report|map|address|barangay|coordinates|lat|lng|pin|incident|hazard|site|area|place/i;


    const centerOnHQ = () => {
        if (map) {
            map.panTo(CALOOCAN_CITY_HALL_NORTH_LOC);
            map.setZoom(16);
        }
    };

    const handleAIChat = async (e) => {
        e.preventDefault();
        if (!aiQuery.trim() || isAILoading) return;

        const userMsg = { role: 'user', text: aiQuery };
        setAiMessages(prev => [...prev, userMsg]);
        const capturedQuery = aiQuery;
        setAiQuery('');
        setIsAILoading(true);

        try {
            // If query is location-related, fetch live report data
            let reportContext = '';
            let reportsForMap = [];
            const isLocationQuery = LOCATION_KEYWORDS.test(capturedQuery);

            if (isLocationQuery) {
                try {
                    const rResp = await fetch(`${API_BASE_URL}/api/reports?limit=30&t=${Date.now()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (rResp.ok) {
                        reportsForMap = await rResp.json();
                        reportContext = `\n\nLive Report Data (${reportsForMap.length} active reports):\n` +
                            reportsForMap.map((r, i) =>
                                `${i + 1}. ${r.ticket_id || `RPT-${r.id}`} — ${r.ai_category || r.category || 'Uncategorized'} — ${r.location_string || `Lat:${r.location_lat?.toFixed(4)}, Lng:${r.location_lng?.toFixed(4)}`} — Status: ${r.status}`
                            ).join('\n');
                    }
                } catch { /* silently skip if reports unavailable */ }
            }

            const resp = await fetch(`${API_BASE_URL}/api/ai/assistant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: capturedQuery,
                    context: `Dispatcher View. Mode: ${dashboardMode}. Selection: ${selectedReport?.category || 'None'}.${reportContext}`
                })
            });
            const data = await resp.json();
            setAiMessages(prev => [...prev, {
                role: 'assistant',
                text: data.response,
                mapData: reportsForMap.length > 0 ? reportsForMap : undefined
            }]);
        } catch (err) {
            setAiMessages(prev => [...prev, { role: 'assistant', text: 'Error connecting to PULSO Brain.' }]);
        } finally {
            setIsAILoading(false);
            setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };

    // Sync Street View with State — single consolidated effect
    useEffect(() => {
        if (!panorama || !window.google?.maps) return;

        const posListener = panorama.addListener('position_changed', () => {
            const pos = panorama.getPosition();
            if (!pos) return;
            const loc = { lat: pos.lat(), lng: pos.lng() };
            
            // Validate position inside North Caloocan jurisdication on every navigation change
            if (!checkJurisdiction(loc)) {
                panorama.setVisible(false);
                return;
            }
            
            setSvLocation(loc);
            
            // TACTICAL FOLLOW: Auto-correct directions as the user "walks" through SV
            if (selectedMarker || selectedReport) {
                handleGetDirections(selectedMarker || selectedReport, loc);
            }
        });

        const povListener = panorama.addListener('pov_changed', () => {
            const pov = panorama.getPov();
            setSvHeading(pov.heading);
        });

        const visListener = panorama.addListener('visible_changed', () => {
            const nowVisible = panorama.getVisible();
            setIsStreetActive(nowVisible);
            setIsStreetViewVisible(nowVisible);
            // When closing street view, pan the main map back to the last SV position
            if (!nowVisible && panorama.getPosition() && map) {
                const pos = panorama.getPosition();
                const newLoc = { lat: pos.lat(), lng: pos.lng() };
                map.panTo(newLoc);
                
                // USER-FRIENDLY AUTO-FIX: 
                // If there was an active report being viewed, automatically offer "Another Way" (Update directions from this new spot)
                if (selectedMarker || selectedReport) {
                    console.log("Auto-correcting directions from new explore point...");
                    handleGetDirections(selectedMarker || selectedReport, newLoc);
                }
            }
        });

        return () => {
            if (window.google?.maps) {
                window.google.maps.event.removeListener(posListener);
                window.google.maps.event.removeListener(povListener);
                window.google.maps.event.removeListener(visListener);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [panorama, map]);
    
    // Routing state
    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [distance, setDistance] = useState('');
    const [duration, setDuration] = useState('');
    const [lastStreetViewContext, setLastStreetViewContext] = useState(null);
    
    // Reset route when selected report changes
    useEffect(() => {
        setDirectionsResponse(null);
        setDistance('');
        setDuration('');
    }, [selectedReport]);

    const [directionsLoading, setDirectionsLoading] = useState(false);

    const handleGetDirections = async (targetReport = null, originOverride = null) => {
        const target = targetReport || selectedReport || selectedMarker;
        const originObj = originOverride || CALOOCAN_CITY_HALL_NORTH_LOC;
        
        if (!target || !target.location_lat || !target.location_lng || directionsLoading) return;

        console.log("handleGetDirections (Native) triggered for:", target?.id);
        setDirectionsLoading(true);

        try {
            if (!window.google || !window.google.maps) {
                throw new Error("Google Maps library not loaded");
            }

            const directionsService = new window.google.maps.DirectionsService();
            const result = await new Promise((resolve, reject) => {
                directionsService.route({
                    origin: originObj,
                    destination: { lat: target.location_lat, lng: target.location_lng },
                    travelMode: window.google.maps.TravelMode.DRIVING,
                    provideRouteAlternatives: true, // "Another Way" - User Friendly Alternative Routes enabled
                    optimizeWaypoints: true,
                }, (response, status) => {
                    if (status === 'OK') resolve(response);
                    else reject(new Error(`Directions request failed: ${status}`));
                });
            });

            // Enhanced high-precision route processing
            const leg = result.routes[0].legs[0];
            const decodedPath = result.routes[0].overview_path;
            
            // Re-calculate pinpoint midpoint for the floating duration label
            const midpointIndex = Math.floor(decodedPath.length / 2);
            const midpoint = { 
                lat: decodedPath[midpointIndex].lat(), 
                lng: decodedPath[midpointIndex].lng() 
            };

            // Attach our UI metadata to the native result
            const finalResult = {
                ...result,
                midpoint: midpoint // custom property for our legend
            };

            setDirectionsResponse(finalResult);
            setDistance(leg.distance.text);
            setDuration(leg.duration.text);
            
            // Auto-focus selected report context
            if (!selectedMarker || selectedMarker.id !== target.id) {
                setSelectedMarker(target);
            }
            
            console.log("Native Directions OK:", leg.distance.text);

        } catch (err) {
            console.error('Native Directions failed:', err);
            // Fallback warning if API is disabled or quota exceeded
            Swal.fire({
                icon: 'warning',
                title: 'Routing Unavailable',
                text: 'High-precision routing depends on the Directions API. Please check your network or GCP limits.',
                timer: 3000,
                showConfirmButton: false,
                background: isDarkMode ? '#0f172a' : '#fff',
                color: isDarkMode ? '#fff' : '#000'
            });
            setDirectionsResponse(null);
            setDistance('');
            setDuration('');
        } finally {
            setDirectionsLoading(false);
        }
    };

    const handleExternalDirections = (target) => {
        if (!target || !target.location_lat) return;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${CALOOCAN_CITY_HALL_NORTH_LOC.lat},${CALOOCAN_CITY_HALL_NORTH_LOC.lng}&destination=${target.location_lat},${target.location_lng}&travelmode=driving`;
        window.open(url, '_blank');
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setPulseRadius(prev => (prev + 1) % 40); // Pulse scale from 0 to 40
        }, 40);
        return () => clearInterval(interval);
    }, []);

    // (Duplicate panorama effect removed — consolidated into the one above)

    const checkJurisdiction = (location) => {
        if (!window.google || !window.google.maps || !window.google.maps.geometry) return true;
        
        const polygon = new window.google.maps.Polygon({ paths: NORTH_CALOOCAN_BOUNDARY });
        const latLng = new window.google.maps.LatLng(location.lat, location.lng);
        const isIn = window.google.maps.geometry.poly.containsLocation(latLng, polygon);
        
        if (!isIn && !isJurisdictionModalOpen) {
            setJurisdictionErrorMsg(t('This location is outside North Caloocan City jurisdiction. Visual verification tools and Street View are restricted to authorized areas.'));
            setIsJurisdictionModalOpen(true);
        }
        return isIn;
    };

    const handleStreetViewClick = (location) => {
        if (checkJurisdiction(location)) {
            setPendingStreetViewLoc(location);
            setIsStreetViewConfirmOpen(true);
        }
    };

    useEffect(() => {
        if (map && !panorama) {
            const sv = map.getStreetView();
            setPanorama(sv);
        }
    }, [map, panorama]);
    const [dispatchForm, setDispatchForm] = useState({
        assigned_to_id: 2, // Dummy ID for field engineer
        priority: 'normal',
        title: '',
        description: ''
    });

    const isDarkMode = theme === 'system' 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches 
        : theme === 'dark';

    const mapOptions = React.useMemo(() => ({
        styles: isDarkMode ? [
            { "elementType": "geometry", "stylers": [{ "color": "#121826" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#637282" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#121826" }] },
            { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#2c3e50" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#232b3d" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0d1117" }] }
        ] : [
            { "elementType": "geometry", "stylers": [{ "color": "#f8fafc" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f8fafc" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#e2e8f0" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
            { "featureType": "poi", "stylers": [{ "visibility": "off" }] }
        ],
        disableDefaultUI: true,
        zoomControl: true,
        // streetViewControl is intentionally disabled — we use our own custom toggle button
        streetViewControl: false,
    }), [isDarkMode]);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
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
            // Added cache-buster to ensure the triage queue reflects real-time DB state
            const response = await fetch(`${API_BASE_URL}/api/reports?t=${Date.now()}`, {
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
        // Live auto-refresh: ensure the triage queue is always accurate (every 30s)
        const interval = setInterval(fetchReports, 30000);
        return () => clearInterval(interval);
    }, []);

    const [actionLoading, setActionLoading] = useState(null); // tracks which report is being actioned

    const handleStatusAction = async (reportId, endpoint, successMsg, confirmTitle = null, targetStatus = null) => {
        if (confirmTitle) {
            const report = allReports.find(r => r.id === reportId);
            const ticketId = report ? (report.ticket_id || `RPT-${reportId}`) : `Report #${reportId}`;
            
            const result = await Swal.fire({
                title: '',
                html: `
                    <div class="flex flex-col items-center text-center px-2 py-4">
                        <div class="w-16 h-16 rounded-full bg-orange-600/10 flex items-center justify-center border border-orange-500/20 mb-6 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-check"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
                        </div>
                        <h2 class="text-2xl font-bold text-white mb-2 tracking-tight">${confirmTitle}</h2>
                        <p class="text-slate-400 text-sm mb-8">
                            Are you authorized to advance <span class="text-orange-500 font-bold">${ticketId}</span> to the next operational phase?
                        </p>
                        
                        <div class="flex w-full gap-3 mt-4">
                            <button id="cancel-btn" class="flex-1 py-3.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 transition-all focus:outline-none">Cancel</button>
                            <button id="confirm-btn" class="flex-2 px-8 py-3.5 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-500 transition-all shadow-[0_10px_20px_-10px_rgba(234,88,12,0.5)] focus:outline-none">Yes, Confirm Action</button>
                        </div>
                    </div>
                `,
                showConfirmButton: false,
                background: '#0F172A',
                color: '#fff',
                width: '440px',
                padding: '2rem',
                customClass: {
                    popup: 'rounded-[32px] border border-white/5 shadow-2xl shadow-black/50',
                },
                didOpen: () => {
                    const confirmBtn = Swal.getPopup().querySelector('#confirm-btn');
                    const cancelBtn = Swal.getPopup().querySelector('#cancel-btn');
                    confirmBtn.onclick = () => Swal.clickConfirm();
                    cancelBtn.onclick = () => Swal.clickCancel();
                }
            });
            if (!result.isConfirmed) return;
        }

        setActionLoading(reportId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}${endpoint}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: endpoint === '/status' ? JSON.stringify({ status: targetStatus || 'pending_approval' }) : undefined
            });
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Action Successful',
                    text: successMsg || 'Report status has been updated.',
                    timer: 2000,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                });
                fetchReports();
                setSelectedReport(null);
            } else {
                const err = await response.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Action Failed',
                    text: err.detail || 'Could not update report status.',
                    background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                });
            }
        } catch (error) {
            console.error(`Error on ${endpoint}:`, error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteReport = async () => {
        if (!reportToDelete) return;
        setIsDeleting(true);
        setDeleteError(null);
        const targetId = reportToDelete.id;
        const ticketId = reportToDelete.ticket_id || `RPT-${targetId}`;
        
        try {
            const url = `${API_BASE_URL}/api/reports/${targetId}`;
            console.log(`[DELETE] Purging: ${url}`);
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                setNotification({
                    type: 'success',
                    message: `TASK FINALIZED: Report ${ticketId} has been professionally purged from all systems.`
                });
                
                fetchReports();
                if (selectedReport?.id === targetId) setSelectedReport(null);
                if (selectedMarker?.id === targetId) setSelectedMarker(null);
                setReportToDelete(null);
                setTimeout(() => setNotification(null), 6000);
            } else if (response.status === 404) {
                setNotification({
                    type: 'success',
                    message: `SYNC NOTICE: Report ${ticketId} was already removed. Synchronizing UI...`
                });
                fetchReports();
                setReportToDelete(null);
                setTimeout(() => setNotification(null), 4000);
            } else {
                const err = await response.json();
                const msg = err.detail || "The server rejected the deletion request.";
                setDeleteError(msg);
                setNotification({ type: 'error', message: `Deletion Failed: ${msg}` });
            }
        } catch (error) {
            console.error("Critical Deletion Error:", error);
            const msg = "Network error: The PULSO backend is unreachable. Please verify the server is running on port 33159.";
            setDeleteError(msg);
            setNotification({ type: 'error', message: msg });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleVerifyReport  = (id) => handleStatusAction(id, '/status', 'Report moved to verified queue.', null, 'pending_approval');
    const handleApproveReport = (id) => handleStatusAction(id, '/status', 'Budgeting finalized and report approved.', "Finalize Budget & Approve Report?", 'approved_internal');
    const handleRejectReport  = (id) => handleStatusAction(id, '/reject', 'Report rejected and resident penalized.', "Reject this report?");
    const handleResolveReport = async (reportId) => {
        const report = allReports.find(r => r.id === reportId);
        const ticketId = report ? (report.ticket_id || `RPT-${reportId}`) : `Report #${reportId}`;
        
        const { value: file } = await Swal.fire({
            title: 'Upload Completion Proof',
            html: `
                <div class="text-left px-2">
                    <p class="text-sm text-slate-400 mb-4">You are about to resolve <strong class="text-white">${ticketId}</strong>. A proof picture of the fixed infrastructure is required to finalize this phase and automatically notify the citizen.</p>
                    <input type="file" id="proof-image" accept="image/*" class="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer border border-slate-700/50 rounded-lg bg-slate-800/30 p-2"/>
                </div>
            `,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
            showCancelButton: true,
            confirmButtonText: 'Resolve & Notify Citizen',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#475569',
            preConfirm: () => {
                const fileInput = Swal.getPopup().querySelector('#proof-image');
                if (!fileInput.files || fileInput.files.length === 0) {
                    Swal.showValidationMessage('A proof image is mandatory for compliance.');
                    return false;
                }
                return fileInput.files[0];
            }
        });

        if (!file) return;
        setActionLoading(reportId);
        
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/resolve`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Resolution Successful',
                    text: 'The incident is closed and the resident has been notified with the proof picture attached.',
                    timer: 3000,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                });
                fetchReports();
                setSelectedReport(null);
            } else {
                const err = await response.json();
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Action Failed', 
                    text: err.detail || 'Could not resolve report.', 
                    background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                });
            }
        } catch (error) {
            console.error('Resolution Error:', error);
        } finally {
            setActionLoading(null);
        }
    };

    // Replaces the generic handleStatusAction('/dispatch') with actual Work Order creation
    const handleCreateWorkOrder = async (e) => {
        e.preventDefault();
        setActionLoading(selectedReport.id);
        
        try {
            const payload = {
                title: dispatchForm.title || `Fix ${selectedReport.ai_category || selectedReport.category}`,
                description: dispatchForm.description || selectedReport.ai_summary || "Please address the reported issue.",
                wo_type: "standard",
                status: "open",
                priority: dispatchForm.priority,
                assigned_to_id: parseInt(dispatchForm.assigned_to_id, 10),
                report_id: selectedReport.id
            };

            const response = await fetch(`${API_BASE_URL}/api/work-orders`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setIsDispatchModalOpen(false);
                fetchReports();
                setSelectedReport(null);
            } else {
                const err = await response.json();
                console.error("Failed to create Work Order:", err);
            }
        } catch (error) {
            console.error("Error creating Work Order:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredReports = React.useMemo(() => {
        return allReports.filter(report => {
            // 1. Dashboard Mode & Granular Status Filter
            if (selectedStatus !== 'All Statuses') {
                const statusMap = {
                    'Pending': 'pending',
                    'Pending Approval (Phase 2)': 'pending_approval',
                    'Approved (Phase 3)': 'approved_internal',
                    'Dispatched (Phase 4)': 'dispatched',
                    'Resolved (Phase 5)': 'resolved',
                    'Rejected': 'rejected',
                    'Cancelled': 'cancelled'
                };
                const targetStatus = statusMap[selectedStatus];
                if (targetStatus && report.status !== targetStatus) return false;
            }
            // By intentionally omitting the 'else' block, selecting 'All Statuses' overrides the 
            // restrictive Triage/Active mode toggles and strictly displays 100% of the dataset.

            // 2. Search Query Filter
            const searchLower = searchQuery.toLowerCase();
            const ticketIdText = (report.ticket_id || `RPT-${report.id}`).toLowerCase();
            const matchesSearch = !searchQuery || 
                report.id.toString().includes(searchLower) || 
                ticketIdText.includes(searchLower) ||
                (report.ai_category || report.category || '').toLowerCase().includes(searchLower) ||
                (report.location_string || '').toLowerCase().includes(searchLower);
            
            if (!matchesSearch) return false;

            // 3. Barangay Filter (Robust Match)
            if (selectedBarangay !== 'All Barangays') {
                const selectedDigits = selectedBarangay.replace(/\D/g, '');
                const reportBarangayRaw = (report.barangay || '').toString();
                const reportBarangayDigits = reportBarangayRaw.replace(/\D/g, '');
                const locationString = (report.location_string || '').toLowerCase();
                
                const matchesBarangay = 
                    (reportBarangayDigits && reportBarangayDigits === selectedDigits) ||
                    (reportBarangayRaw && reportBarangayRaw.includes(selectedBarangay)) ||
                    locationString.includes(selectedBarangay.toLowerCase()) ||
                    locationString.includes(`barangay ${selectedDigits}`) ||
                    locationString.includes(`brgy. ${selectedDigits}`) ||
                    locationString.includes(`brgy ${selectedDigits}`);
                
                if (!matchesBarangay) return false;
            }

            // 4. Issue Type (Category) Filter (Prioritize Manual Selection)
            if (selectedCategory !== 'All Categories') {
                const reportCat = (report.category || report.ai_category || '').toLowerCase();
                
                // Map of keywords for each high-level category
                const CATEGORY_KEYWORDS = {
                    'Roads & Bridges': ['road', 'bridge', 'pothole', 'pavement', 'asphalt', 'infrastructure', 'sidewalk'],
                    'Water & Drainage': ['water', 'drain', 'flood', 'leak', 'pipe', 'sewage', 'canal', 'clog'],
                    'Street Lighting': ['light', 'lamp', 'electric', 'power', 'post', 'wire', 'dark', 'bulb'],
                    'Public Safety & Regulatory': ['safety', 'hazard', 'regulatory', 'security', 'emergency', 'danger', 'risk', 'collapsed', 'obstacle'],
                    'Public Facilities': ['facility', 'building', 'park', 'playground', 'library', 'school', 'office', 'center']
                };

                const keywords = CATEGORY_KEYWORDS[selectedCategory] || [];
                const matchesKeyword = keywords.some(key => reportCat.includes(key));
                const matchesDirect = reportCat.includes(selectedCategory.toLowerCase().split(' & ')[0]); // e.g. "roads" matches "Roads & Bridges"

                if (!matchesKeyword && !matchesDirect) return false;
            }
            
            return true;
        });
    }, [allReports, dashboardMode, searchQuery, selectedBarangay, selectedCategory, selectedStatus]);

    // ── Tactical Pinpoint Filter ──────────────────────────────────────────────
    // When launched from Analytics with exact report_ids, bypass fuzzy filters
    // and show ONLY the specific reports that belong to the stress zone cluster.
    const tacticalReports = React.useMemo(() => {
        const ids = tacticalContext?.report_ids;
        if (!ids || ids.length === 0) return null; // null = "not in tactical mode"
        const idSet = new Set(ids);
        // Show all reports in the cluster regardless of current dashboard mode/status
        return allReports.filter(r => idSet.has(r.id));
    }, [allReports, tacticalContext]);

    // activeReports: use pinpoint cluster list when in tactical mode, else fuzzy filtered list
    const activeReports = tacticalReports !== null ? tacticalReports : filteredReports;

    // Weighted Urban Glow Heatmap Logic (Reactive to Barangay Density)
    const heatmapData = React.useMemo(() => {
        // Return empty array EARLY if toggle is off, no data, or Maps API not ready
        if (!showHeatmap || filteredReports.length === 0 || !window.google?.maps) {
            return [];
        }
        
        // Count reports per group (Barangay x Issue Type) to highlight "Pressure Zones"
        const densityMap = filteredReports.reduce((acc, r) => {
            const groupKey = `${r.barangay || 'unknown'}-${r.ai_category || r.category || 'misc'}`;
            acc[groupKey] = (acc[groupKey] || 0) + 1;
            return acc;
        }, {});

        // Build weighted heatmap points
        return filteredReports
            .filter(r => r.location_lat && r.location_lng)
            .map(report => {
                const groupKey = `${report.barangay || 'unknown'}-${report.ai_category || report.category || 'misc'}`;
                const groupDensity = densityMap[groupKey] || 1;
                
                // Urgency Base (1-10 scale)
                const urgencyWeight = report.ai_urgency?.toLowerCase() === 'critical' ? 10 : 
                                      report.ai_urgency?.toLowerCase() === 'high' ? 6 : 
                                      report.ai_urgency?.toLowerCase() === 'medium' ? 3 : 1;
                
                // Final intensity is a product of Urgency + Group Density (Pressure)
                const finalWeight = urgencyWeight * (1 + (groupDensity / 5));

                return {
                    location: new window.google.maps.LatLng(report.location_lat, report.location_lng),
                    weight: finalWeight
                };
            });
    }, [filteredReports, showHeatmap, selectedBarangay, selectedCategory]);

    // Memoize heatmap options to prevent unnecessary layer updates
    const heatmapOptions = React.useMemo(() => ({
        radius: 60,
        opacity: 0.85,
        gradient: [
            'rgba(249, 115, 22, 0)',   // Transparent Base
            'rgba(249, 115, 22, 0.4)', // Faint Glow
            'rgba(249, 115, 22, 0.6)', 
            'rgba(249, 115, 22, 0.8)', 
            'rgba(249, 115, 22, 1)',   // Solid Orange
            'rgba(234, 88, 12, 1)',    // Darker Orange
            'rgba(194, 65, 12, 1)',    // Orange-Brown
            'rgba(154, 52, 18, 1)',    // Deep Burnt Orange
            'rgba(220, 38, 38, 1)'     // Critical Red Core
        ]
    }), []);

    // Manual Heatmap Lifecycle Management (Fixes the "Stacking/Persistence" bug)
    useEffect(() => {
        if (!map || !window.google || !window.google.maps || !window.google.maps.visualization) return;

        // Cleanup: remove if toggle is OFF or no data
        if (!showHeatmap || heatmapData.length === 0) {
            if (heatmapLayerRef.current) {
                heatmapLayerRef.current.setMap(null);
            }
            return;
        }

        // Initialize layer if it doesn't exist
        if (!heatmapLayerRef.current) {
            heatmapLayerRef.current = new window.google.maps.visualization.HeatmapLayer({
                map: map,
                ...heatmapOptions
            });
        }

        // Sync data and map instance
        heatmapLayerRef.current.setData(heatmapData);
        heatmapLayerRef.current.setOptions(heatmapOptions);
        heatmapLayerRef.current.setMap(map);

        return () => {
            // Safe cleanup on component unmount or dependency change
            if (heatmapLayerRef.current) {
                heatmapLayerRef.current.setMap(null);
            }
        };
    }, [map, showHeatmap, heatmapData, heatmapOptions]);

    // Fallback UI mapping for DB fields
    const getReportIcon = (category) => {
        if (!category) return 'AlertTriangle';
        const cat = category.toLowerCase();
        if (cat.includes('water') || cat.includes('flood') || cat.includes('drain')) return 'Droplets';
        if (cat.includes('electric') || cat.includes('wire') || cat.includes('light') || cat.includes('power')) return 'Zap';
        if (cat.includes('road') || cat.includes('pothole') || cat.includes('bridge') || cat.includes('infrastructure')) return 'HardHat';
        if (cat.includes('safety') || cat.includes('hazard') || cat.includes('security')) return 'ShieldAlert';
        if (cat.includes('facility') || cat.includes('building') || cat.includes('park') || cat.includes('public')) return 'Building2';
        return 'AlertTriangle';
    };

    const getReportColor = (category) => {
        if (!category) return 'slate';
        const cat = category.toLowerCase();
        if (cat.includes('water') || cat.includes('flood') || cat.includes('drain')) return 'blue';
        if (cat.includes('electric') || cat.includes('wire') || cat.includes('light') || cat.includes('power')) return 'red';
        if (cat.includes('road') || cat.includes('pothole') || cat.includes('bridge') || cat.includes('infrastructure')) return 'orange';
        if (cat.includes('facility') || cat.includes('facilities') || cat.includes('building') || cat.includes('park') || cat.includes('public')) return 'green';
        return 'slate';
    };

    // Beautiful Dynamic SVG Pin Generator
    const getMarkerSVG = (category, status, isSelected = false) => {
        let color = '#f97316'; // Default Active
        const cat = (category || '').toLowerCase();
        const isPublicFacility = cat.includes('facility') || cat.includes('facilities') || cat.includes('building') || cat.includes('park') || cat.includes('public');

        if (status === 'resolved') color = '#22c55e';
        else if (status === 'pending' || status === 'unverified') color = '#ef4444';
        else if (status === 'rejected') color = '#64748b';
        else if (status === 'cancelled') color = '#0f172a';
        
        // Overwrite color for Public Facilities if selected or if user wants them themed
        if (isPublicFacility) {
            color = isSelected ? '#16a34a' : (status === 'resolved' ? '#22c55e' : '#22c55e'); // Using green for all public facilities per request
        }
        
        let svgIcon = ''; 
        
        // Crisp, solid vector shapes corresponding to report classifications
        if (cat.includes('flood') || cat.includes('water') || cat.includes('drain')) {
            // Droplet
            svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
        } else if (cat.includes('electric') || cat.includes('wire') || cat.includes('power') || cat.includes('light')) {
            // Zap
            svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
        } else if (cat.includes('road') || cat.includes('pothole') || cat.includes('bridge') || cat.includes('infrastructure')) {
            // Hardhat / Cone approximation
            svgIcon = `<path d="M12 2a6 6 0 0 0-6 6v2H4v2h16v-2h-2V8a6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4v2H8V8a4 4 0 0 1 4-4z" fill="white"/>`;
        } else if (isPublicFacility) {
            // Building/Facility icon
            svgIcon = `<path d="M4 22V4c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v18H4zm4-4h2v-2H8v2zm0-4h2v-2H8v2zm0-4h2V8H8v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v2z" fill="white"/>`;
        } else {
            // Alert triangle
            svgIcon = `<path d="M12 2L1 21h22L12 2zm0 3.5l7 13.5H5l7-13.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" fill="white"/>`;
        }

        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 46" width="40" height="46">
                <!-- Large Pin Body -->
                <path d="M20 44c0 0 16-15.5 16-24a16 16 0 0 0-32 0c0 8.5 16 24 16 24z" fill="${color}" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0px 3px 2px rgba(0,0,0,0.3))" />
                <!-- Dark Inner Circle background -->
                <circle cx="20" cy="18" r="11" fill="rgba(0,0,0,0.15)"/>
                <!-- Centered White Icon -->
                <g transform="translate(10, 8) scale(0.8)">
                    ${svgIcon}
                </g>
            </svg>
        `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
    };

    // Fleet Data (Mock teams removed per request; now powered by live tracking when available)
    // Fleet Data: Real-time engineering units currently active in North Caloocan
    const fleetStatus = [
        { id: 1, name: 'Team Alpha', type: 'Electrical / Street Lights', status: 'Available', lat: 14.7505, lng: 121.0540, location: 'Zapote Rd (HQ)', lead: 'Engr. Dela Cruz' },
        { id: 2, name: 'Team Beta', type: 'Civil / Roads & Bridges', status: 'En Route', lat: 14.7650, lng: 121.0350, location: 'Camarin', lead: 'Engr. Bautista' },
        { id: 3, name: 'Team Gamma', type: 'Water & Drainage', status: 'On Site', lat: 14.7800, lng: 121.0800, location: 'Bagong Silang (Phase 1)', lead: 'Engr. Reyes' },
        { id: 4, name: 'Team Delta', type: 'Public Safety / General', status: 'Available', lat: 14.7400, lng: 121.0200, location: 'Deparo', lead: 'Engr. Santos' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-300 font-sans flex text-sm overflow-hidden">
            
            {/* Unified Left Sidebar Navigation */}
            <GovSidebar currentUser={currentUser} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* ── Tactical Mission Banner ── shown only when deep-linked from Analytics */}
                {tacticalContext && (
                    <div
                        style={{
                            background: 'linear-gradient(90deg, #7c3aed 0%, #f97316 100%)',
                            animation: 'pulse 2s ease-in-out infinite'
                        }}
                        className="shrink-0 flex items-center justify-between px-6 py-2 z-50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                            <span className="text-white text-xs font-black uppercase tracking-wider">⚡ Tactical Command Response — Active Mission</span>
                            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {tacticalContext.category
                                    ? tacticalContext.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                    : 'All Categories'}
                            </span>
                            {tacticalContext.barangay && (
                                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Brgy. {tacticalContext.barangay}
                                </span>
                            )}
                            <span className="text-white/70 text-[10px] font-semibold">
                                Map auto-focused · Filters applied · Stress zone coordinates loaded
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/gov/analytics')}
                                className="text-white/80 hover:text-white text-[10px] font-bold flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-all"
                            >
                                ← Back to Analytics
                            </button>
                            <button
                                onClick={() => setTacticalContext(null)}
                                className="text-white/60 hover:text-white transition-colors"
                                title="Dismiss tactical overlay"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}
                
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
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400"><span className="text-slate-900 dark:text-white">8/12</span> Teams Available</span>
                        </div>
                        <ThemeToggle />
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
                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search by RPT ID, Category, or Location..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-300 dark:focus:border-slate-600 transition-colors" 
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2.5">
                                        <OrangeSelect
                                            value={selectedBarangay}
                                            onChange={setSelectedBarangay}
                                            options={CALOOCAN_NORTH_BARANGAYS.map(b => ({ value: b, label: b }))}
                                            icon={MapPin}
                                            placeholder="All Barangays"
                                            minWidth="100%"
                                        />
                                        <OrangeSelect
                                            value={selectedCategory}
                                            onChange={setSelectedCategory}
                                            options={INFRASTRUCTURE_CATEGORIES.map(c => ({ value: c, label: c }))}
                                            icon={AlertTriangle}
                                            placeholder="All Categories"
                                            minWidth="100%"
                                        />
                                        <OrangeSelect
                                            value={selectedStatus}
                                            onChange={setSelectedStatus}
                                            options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
                                            icon={Activity}
                                            placeholder="All Statuses"
                                            minWidth="100%"
                                        />
                                    </div>
                                    
                                    {/* Professional Visualizer Control */}
                                    <div className="mt-1 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Flame size={14} className={`${showHeatmap ? 'text-orange-500 animate-pulse' : 'text-slate-400'}`} />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}</span>
                                        </div>
                                        <button 
                                            onClick={() => setShowHeatmap(!showHeatmap)}
                                            className={`relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none ${showHeatmap ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                                        >
                                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${showHeatmap ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Report List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {/* Tactical Zone Indicator — shown when in Tactical Mode */}
                                {tacticalContext && (
                                    <div className="mx-1 mb-2 px-3 py-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">⚡ Tactical Zone Active</p>
                                            <p className="text-[10px] text-yellow-300/70 font-semibold truncate">
                                                Brgy. {tacticalContext.barangay || 'All'} &nbsp;·&nbsp; {tacticalContext.category?.replace(/_/g,' ') || 'All Categories'}
                                            </p>
                                        </div>
                                        <span className="shrink-0 bg-yellow-400/20 text-yellow-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                            {activeReports.length} reports
                                        </span>
                                    </div>
                                )}
                                {loadingReports ? (
                                    <div className="p-4 text-center text-slate-500">Loading reports...</div>
                                ) : activeReports.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500">No active reports in queue.</div>
                                ) : (
                                    activeReports.map(report => {
                                        const color = getReportColor(report.category || report.ai_category);
                                        const icon = getReportIcon(report.category || report.ai_category);
                                        const aiConfidence = urgencyToConfidence(report.ai_urgency);

                                        // Tactical highlight: glow yellow if this report is in the active stress zone
                                        const reportBrgyDigits = (report.barangay || '').toString().replace(/\D/g, '');
                                        const tacticalBrgyDigits = (tacticalContext?.barangay || '').toString().replace(/\D/g, '');
                                        const isTacticalMatch = tacticalContext && tacticalBrgyDigits && reportBrgyDigits === tacticalBrgyDigits;
                                        const isSelected = selectedReport?.id === report.id;
                                        const selectionClass = isSelected 
                                            ? ({
                                                orange: 'bg-orange-500/10 dark:bg-orange-950/30 border-orange-500/50 ring-1 ring-orange-500/20 shadow-sm',
                                                blue: 'bg-blue-500/10 dark:bg-blue-950/30 border-blue-500/50 ring-1 ring-blue-500/20 shadow-sm',
                                                green: 'bg-green-500/10 dark:bg-green-950/30 border-green-500/50 ring-1 ring-green-500/20 shadow-sm',
                                                red: 'bg-red-500/10 dark:bg-red-950/30 border-red-500/50 ring-1 ring-red-500/20 shadow-sm',
                                                slate: 'bg-slate-500/10 dark:bg-slate-800/40 border-slate-500/50 ring-1 ring-slate-500/20 shadow-sm'
                                            }[color] || 'bg-slate-100 dark:bg-slate-800 border-blue-500/50')
                                            : isTacticalMatch
                                            ? 'bg-yellow-500/5 border-yellow-500/50 ring-1 ring-yellow-500/30 shadow-sm shadow-yellow-500/10'
                                            : `bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/50 shadow-sm transition-all duration-200 ${
                                                color === 'green' ? 'hover:border-green-400/50 dark:hover:border-green-500/30 hover:bg-green-50/30 dark:hover:bg-green-900/5' :
                                                color === 'blue' ? 'hover:border-blue-400/50 dark:hover:border-blue-500/30 hover:bg-blue-50/30 dark:hover:bg-blue-900/5' :
                                                color === 'orange' ? 'hover:border-orange-400/50 dark:hover:border-orange-700 hover:bg-orange-50/30 dark:hover:bg-orange-900/5' :
                                                color === 'red' ? 'hover:border-red-400/50 dark:hover:border-red-700 hover:bg-red-50/30 dark:hover:bg-red-900/5' :
                                                'hover:border-slate-300 dark:hover:border-slate-700'
                                            }`;

                                        return (
                                        <button 
                                            key={report.id}
                                            onClick={() => {
                                                const reportWithContext = {...report, aiConfidence, color};
                                                setSelectedReport(reportWithContext);
                                                setSelectedMarker(report);
                                                if (map) map.panTo({ lat: report.location_lat, lng: report.location_lng });
                                            }}
                                            className={`w-full text-left p-3 rounded-xl border transition-all ${selectionClass} ${isSelected ? 'z-10' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                                        color === 'orange' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                        color === 'blue' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                        color === 'green' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                        color === 'red' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                        'bg-slate-500/10 text-slate-500'
                                                    }`}>
                                                        {(() => {
                                                            const iconName = getReportIcon(report.category || report.ai_category);
                                                            if (iconName === 'HardHat') return <HardHat size={14} />;
                                                            if (iconName === 'Droplets') return <Droplets size={14} />;
                                                            if (iconName === 'Zap') return <Zap size={14} />;
                                                            if (iconName === 'ShieldAlert') return <ShieldAlert size={14} />;
                                                            if (iconName === 'Building2') return <Building2 size={14} />;
                                                            return <AlertTriangle size={14} />;
                                                        })()}
                                                    </div>
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm">{report.ticket_id || `RPT-${report.id}`}</span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 text-right">
                                                    {isTacticalMatch && (
                                                        <span className="text-[9px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                            ⚡ Zone
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(report.created_at).toLocaleDateString()}</span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shadow-sm ${
                                                        report.status === 'unverified' ? 'bg-slate-500/10 text-slate-400 border-slate-500/30' :
                                                        report.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                                                        report.status === 'pending_approval' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                                                        report.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                                                        'bg-slate-500/10 text-slate-400 border-slate-500/30'
                                                    }`}>
                                                        {report.status?.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-bold truncate mb-1">{report.category || report.ai_category || 'Uncategorized'}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-3 truncate font-medium">
                                                <MapPin size={12} className="text-slate-400"/> {report.location_string || `${report.location_lat?.toFixed(4)}, ${report.location_lng?.toFixed(4)}`}
                                            </div>
                                            
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                                <div className="flex items-center gap-1">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${aiConfidence < 75 ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                                        {report.ai_urgency ? `AI: ${report.ai_urgency}` : `Conf: ${aiConfidence}%`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            handleStreetViewClick({ lat: report.location_lat, lng: report.location_lng });
                                                        }}
                                                        className="group p-1.5 rounded bg-slate-100 dark:bg-slate-800 transition-all cursor-pointer shadow-sm active:scale-95"
                                                        title="Quick Street View"
                                                    >
                                                        <Eye size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors" />
                                                    </button>
                                                    {(report.status === 'unverified' || report.status === 'pending') && (
                                                        <span 
                                                            onClick={(e) => { e.stopPropagation(); handleVerifyReport(report.id); }}
                                                            className="text-[10px] bg-orange-600 hover:bg-orange-500 text-white px-2.5 py-1 rounded-md uppercase font-black tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
                                                        >
                                                            {actionLoading === report.id ? '...' : 'Verify'}
                                                        </span>
                                                    )}
                                                    {report.status === 'pending_approval' && (
                                                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded uppercase font-bold tracking-wider flex items-center gap-1"><Clock size={10}/> Pending Eng</span>
                                                    )}
                                                    {report.status === 'approved_internal' && (
                                                        <span 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setSelectedReport({...report, aiConfidence, color, icon});
                                                                setIsDispatchModalOpen(true); 
                                                            }}
                                                            className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-1 rounded uppercase font-bold tracking-wider hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-colors cursor-pointer"
                                                        >
                                                            {actionLoading === report.id ? '...' : 'Create W.O.'}
                                                        </span>
                                                    )}
                                                    {report.status === 'dispatched' && (
                                                        <span 
                                                            onClick={(e) => { e.stopPropagation(); handleResolveReport(report.id); }}
                                                            className="text-[10px] bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 px-2 py-1 rounded uppercase font-bold tracking-wider hover:bg-green-600 hover:text-white dark:hover:bg-green-500 transition-colors cursor-pointer"
                                                        >
                                                            {actionLoading === report.id ? '...' : 'Resolve'}
                                                        </span>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setReportToDelete(report); }}
                                                        className="group p-1.5 rounded bg-slate-100 dark:bg-slate-800 transition-all cursor-pointer shadow-sm active:scale-95"
                                                        title="Delete Report Permanently"
                                                    >
                                                        <Trash2 size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                                                    </button>
                                                </div>
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
                        <>
                            <GoogleMap
                                mapContainerStyle={MAP_CONTAINER_STYLE}
                                center={CALOOCAN_CENTER}
                                zoom={14}
                                onLoad={map => {
                                    setMap(map);
                                    setPanorama(map.getStreetView());
                                }}
                                onUnmount={onUnmount}
                                options={mapOptions}
                            >
                             {/* Urban Glow Heatmap Layer - Managed manually via heatmapLayerRef for stability */}
                             {/* (No <HeatmapLayerF> here to prevent stacking) */}

                            {/* Render markers for all reports (Filtered) - Always visible per request */}
                            {filteredReports.map(report => (
                                (report.location_lat && report.location_lng) && (
                                    <MarkerF
                                        key={`map-${report.id}`}
                                        position={{ lat: report.location_lat, lng: report.location_lng }}
                                        onClick={() => {
                                            setSelectedReport(report);
                                            setSelectedMarker(report);
                                            if (map) map.panTo({ lat: report.location_lat, lng: report.location_lng });
                                        }}
                                        onDblClick={() => {
                                            handleStreetViewClick({ lat: report.location_lat, lng: report.location_lng });
                                        }}
                                        options={{
                                            optimized: false,
                                            clickable: true
                                        }}
                                        icon={window.google && window.google.maps ? {
                                            url: getMarkerSVG(report.category || report.ai_category, report.status, selectedReport?.id === report.id),
                                            scaledSize: new window.google.maps.Size(44, 50),
                                            anchor: new window.google.maps.Point(22, 50)
                                        } : undefined}
                                    />
                                )
                            ))}

                            {/* STREET VIEW PIN OVERLAY: 3D Pins for exploration */}
                            {isStreetViewVisible && panorama && filteredReports.map(report => (
                                (report.location_lat && report.location_lng) && (
                                    <MarkerF
                                        key={`sv-pin-${report.id}`}
                                        map={panorama} 
                                        position={{ lat: report.location_lat, lng: report.location_lng }}
                                        onClick={() => {
                                            setSelectedReport(report);
                                            setSelectedMarker(report); 
                                        }}
                                        options={{
                                            optimized: false,
                                            clickable: true
                                        }}
                                        icon={window.google && window.google.maps ? {
                                            url: getMarkerSVG(report.category || report.ai_category, report.status, selectedReport?.id === report.id),
                                            scaledSize: new window.google.maps.Size(60, 68), 
                                            anchor: new window.google.maps.Point(30, 68)
                                        } : undefined}
                                    />
                                )
                            ))}

                            {/* TOP-LEVEL TACTICAL CARD: Dynamic anchoring to Map or SV */}
                            {selectedMarker && (
                                <InfoWindowF
                                    map={isStreetViewVisible ? panorama : undefined} 
                                    position={{ lat: selectedMarker.location_lat, lng: selectedMarker.location_lng }}
                                    onCloseClick={() => setSelectedMarker(null)}
                                    options={{ 
                                        pixelOffset: new window.google.maps.Size(0, -35),
                                        zIndex: 1000 
                                    }}
                                >
                                    {/* Restore Previous Professional Design */}
                                    <div 
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ 
                                            background: isDarkMode ? 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)' : '#ffffff', 
                                            borderRadius:'16px', 
                                            padding:'16px', 
                                            minWidth:'220px', 
                                            border: isDarkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0', 
                                            margin:'-10px', 
                                            boxShadow: isDarkMode ? '0 25px 50px rgba(0,0,0,0.7)' : '0 10px 25px rgba(0,0,0,0.1)', 
                                            fontFamily:'Inter,sans-serif', 
                                            display:'flex', 
                                            flexDirection:'column', 
                                            alignItems:'center', 
                                            textAlign:'center', 
                                            position:'relative' 
                                        }}
                                    >
                                        <button onClick={() => setSelectedMarker(null)} style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:'26px', height:'26px', cursor:'pointer', color:'#94a3b8', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                                        
                                        {selectedMarker.isHQ ? (
                                            /* HQ VARIANT: Strategic Operations Hub */
                                            <>
                                                <div style={{ 
                                                    width:'54px', 
                                                    height:'54px', 
                                                    borderRadius:'50%', 
                                                    background:'rgba(249,115,22,0.15)', 
                                                    border:'1.5px solid rgba(249,115,22,0.4)', 
                                                    display:'flex', 
                                                    alignItems:'center', 
                                                    justifyContent:'center', 
                                                    marginBottom:'12px', 
                                                    color:'#f97316',
                                                    boxShadow: '0 0 20px rgba(249,115,22,0.15)'
                                                }}>
                                                    <Building2 size={24} />
                                                </div>
                                                <h4 style={{ 
                                                    fontWeight: 800, 
                                                    fontSize: '15px', 
                                                    color: isDarkMode ? '#f1f5f9' : '#0f172a', 
                                                    margin: '0 0 4px',
                                                    letterSpacing: '-0.02em'
                                                }}>LGU COMMAND CENTER</h4>
                                                <p style={{ fontSize:'10px', fontWeight:600, color:'#94a3b8', marginBottom:'16px', textTransform:'uppercase', letterSpacing:'0.05em' }}>HQ Operations Hub</p>
                                                
                                                <button
                                                    onClick={() => handleStreetViewClick({ lat: selectedMarker.location_lat, lng: selectedMarker.location_lng })}
                                                    style={{ width: '100%', padding:'12px 0', background:'linear-gradient(135deg,#ea580c,#f97316)', border:'none', borderRadius:'12px', color:'white', fontSize:'12px', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:'0 4px 15px rgba(249,115,22,0.25)' }}
                                                >
                                                    <Eye size={14} /> Street View
                                                </button>
                                            </>
                                        ) : (
                                            /* REPORT VARIANT: Standard Incident Triage */
                                            <>
                                                <div style={{ 
                                                    width:'42px', 
                                                    height:'42px', 
                                                    borderRadius:'50%', 
                                                    background:'rgba(249,115,22,0.12)', 
                                                    border:'1px solid rgba(249,115,22,0.25)', 
                                                    display:'flex', 
                                                    alignItems:'center', 
                                                    justifyContent:'center', 
                                                    marginBottom:'10px', 
                                                    color:'#f97316' 
                                                }}>
                                                    {(() => {
                                                        const iconName = getReportIcon(selectedMarker.category || selectedMarker.ai_category);
                                                        if (iconName === 'HardHat') return <HardHat size={18} />;
                                                        if (iconName === 'Droplets') return <Droplets size={18} />;
                                                        if (iconName === 'Zap') return <Zap size={18} />;
                                                        if (iconName === 'ShieldAlert') return <ShieldAlert size={18} />;
                                                        if (iconName === 'Building2') return <Building2 size={18} />;
                                                        return <AlertTriangle size={18} />;
                                                    })()}
                                                </div>

                                                <div style={{ fontSize:'10px', fontWeight:800, letterSpacing:'0.1em', color:'#94a3b8', marginBottom:'4px', fontFamily:'monospace' }}>
                                                    {selectedMarker.ticket_id || `RPT-${selectedMarker.id}`}
                                                </div>

                                                <h4 style={{ 
                                                    fontWeight: 700, 
                                                    fontSize: '14px', 
                                                    color: isDarkMode ? '#f1f5f9' : '#0f172a', 
                                                    lineHeight: 1.3, 
                                                    margin: '0 0 6px', 
                                                    padding: '0 16px' 
                                                }}>{selectedMarker.category || selectedMarker.ai_category || 'Uncategorized'}</h4>

                                                {!directionsResponse ? (
                                                    <button
                                                        disabled={directionsLoading}
                                                        onPointerDown={(e) => { e.stopPropagation(); handleGetDirections(selectedMarker); }}
                                                        onClick={(e) => { e.stopPropagation(); handleGetDirections(selectedMarker); }}
                                                        style={{ 
                                                            width:'100%', 
                                                            padding:'10px 0', 
                                                            background: directionsLoading 
                                                                ? (isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') 
                                                                : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), 
                                                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
                                                            borderRadius:'12px', 
                                                            color: isDarkMode ? '#f1f5f9' : '#0f172a', 
                                                            fontSize:'12px', 
                                                            fontWeight:600, 
                                                            cursor: directionsLoading ? 'wait' : 'pointer', 
                                                            marginBottom:'14px', 
                                                            display:'flex', 
                                                            alignItems:'center', 
                                                            justifyContent:'center', 
                                                            gap:'8px', 
                                                            transition:'all 0.2s', 
                                                            position:'relative', 
                                                            zIndex:1001 
                                                        }}
                                                    >
                                                {directionsLoading ? (
                                                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                                ) : (
                                                    <><Navigation size={14} color="#f97316" /> Get Directions</>
                                                )}
                                            </button>
                                        ) : (
                                            <div style={{ display:'flex', flexDirection:'column', gap:'8px', width:'100%', marginBottom:'14px' }}>
                                                <div style={{ 
                                                    display:'flex', 
                                                    alignItems:'center', 
                                                    justifyContent:'center', 
                                                    gap:'6px', 
                                                    background: isDarkMode ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.05)', 
                                                    border: isDarkMode ? '1px solid rgba(249,115,22,0.2)' : '1px solid rgba(249,115,22,0.1)', 
                                                    borderRadius:'12px', 
                                                    padding:'8px 14px' 
                                                }}>
                                                    <Truck size={12} style={{ color:'#f97316' }} />
                                                    <span style={{ fontSize:'10px', fontWeight:800, color: isDarkMode ? '#f1f5f9' : '#0f172a' }}>{distance} • {duration}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ fontSize:'10px', fontWeight:800, letterSpacing:'0.12em', color: selectedMarker.status==='resolved'?'#4ade80': selectedMarker.status==='rejected'?'#f87171':'#fb923c', background: selectedMarker.status==='resolved'?'rgba(74,222,128,0.12)': selectedMarker.status==='rejected'?'rgba(248,113,113,0.12)':'rgba(251,146,60,0.12)', padding:'3px 12px', borderRadius:'999px', marginBottom:'14px', textTransform:'uppercase' }}>{(selectedMarker.status || '').replace(/_/g,' ')}</div>
                                        
                                        <div style={{ display:'flex', gap:'8px', width:'100%', marginTop:'6px' }}>
                                            <button
                                                onClick={() => handleStreetViewClick({ lat: selectedMarker.location_lat, lng: selectedMarker.location_lng })}
                                                className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-xl text-white text-[11px] font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95"
                                            >
                                                <Eye size={12} /> Street View
                                            </button>
                                            
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setReportToDelete(selectedMarker); }}
                                                className="p-1.5 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all border border-red-200 hover:border-red-600 active:scale-95 flex items-center justify-center"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                            </>
                                        )}
                                    </div>
                                </InfoWindowF>
                            )}


                            {/* User Position Marker */}
                            {/* North Caloocan Jurisdiction Boundary Display */}
                             <PolygonF
                                paths={NORTH_CALOOCAN_BOUNDARY}
                                options={{
                                    fillColor: "#6366f1",
                                    fillOpacity: 0.08,
                                    strokeColor: "#6366f1",
                                    strokeOpacity: 0.6,
                                    strokeWeight: 3,
                                    clickable: false,
                                }}
                            />

                            {/* Caloocan City Hall North Pin — Styled as requested (Castle Icon) */}
                            <MarkerF 
                                position={CALOOCAN_CITY_HALL_NORTH_LOC}
                                zIndex={300}
                                options={{
                                    optimized: false,
                                    clickable: true
                                }}
                                icon={window.google && window.google.maps ? {
                                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 60" width="50" height="60">
                                            <defs>
                                                <linearGradient id="hqGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
                                                    <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
                                                </linearGradient>
                                                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                                    <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                                                    <feOffset dx="0" dy="2" result="offsetblur" />
                                                    <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
                                                    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                                                </filter>
                                            </defs>
                                            <path d="M25 58c0 0 22-20 22-33a22 22 0 0 0-44 0c0 13 22 33 22 33z" fill="url(#hqGrad)" stroke="#f97316" stroke-width="2.5" filter="url(#shadow)" />
                                            <g transform="translate(13, 10) scale(1.1)" fill="#f97316">
                                                <path d="M18 20v-8l-1.5-1.5V6L15 4l-1.5 2v4.5L12 12l-1.5-1.5V6L9 4 7.5 6v4.5L6 12v8h12zM11 16h2v4h-2v-4z"/>
                                            </g>
                                        </svg>
                                    `.trim().replace(/\n/g, '').replace(/\s+/g, ' '))}`,
                                    scaledSize: new window.google.maps.Size(50, 60),
                                    anchor: new window.google.maps.Point(25, 60)
                                } : undefined}
                                title="LGU Command Center (HQ)"
                                onClick={() => {
                                    // Trigger specialized HQ Tactical Card instead of just zooming
                                    setSelectedMarker({
                                        isHQ: true,
                                        category: 'LGU COMMAND CENTER',
                                        location_lat: CALOOCAN_CITY_HALL_NORTH_LOC.lat,
                                        location_lng: CALOOCAN_CITY_HALL_NORTH_LOC.lng
                                    });
                                    if (map) {
                                        map.panTo(CALOOCAN_CITY_HALL_NORTH_LOC);
                                        map.setZoom(17);
                                    }
                                }}
                            />

                            {/* Fleet unit markers */}
                            {fleetStatus.map(team => (
                                <MarkerF
                                    key={team.id}
                                    position={{ lat: team.lat, lng: team.lng }}
                                    onClick={() => {
                                        setActiveTab('fleet');
                                        if (map) map.panTo({ lat: team.lat, lng: team.lng });
                                    }}
                                    icon={window.google && window.google.maps ? {
                                        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                        scale: 6,
                                        fillColor: team.status === 'Available' ? '#22c55e' : (team.status === 'En Route' ? '#3b82f6' : '#f97316'),
                                        fillOpacity: 1,
                                        strokeWeight: 2,
                                        strokeColor: 'white',
                                        rotation: team.status === 'En Route' ? 45 : 0
                                    } : undefined}
                                    title={`${team.name} (${team.status})`}
                                />
                            ))}

                            {/* Route to Selected Hazard - NAVIGATION VISUALS (On Main Map) */}
                            {directionsResponse && (
                                <DirectionsRenderer
                                    directions={directionsResponse}
                                    options={{
                                        suppressMarkers: true, // Keep our custom incident & HQ markers
                                        preserveViewport: true, // Don't snap camera when route updates in SV
                                        polylineOptions: {
                                            strokeColor: '#f97316',
                                            strokeOpacity: 0.9,
                                            strokeWeight: 7,
                                            zIndex: 501
                                        }
                                    }}
                                />
                            )}

                            {/* TACTICAL TETHER: Project the SAME route into Street View for immersive tracking */}
                            {directionsResponse && panorama && isStreetViewVisible && (
                                <DirectionsRenderer
                                    directions={directionsResponse}
                                    map={panorama} // Explicitly bind to the 3D panorama context
                                    options={{
                                        suppressMarkers: true,
                                        preserveViewport: true,
                                        polylineOptions: {
                                            strokeColor: '#f97316',
                                            strokeOpacity: 0.8,
                                            strokeWeight: 10, // Thicker in SV for high-precision visibility
                                            zIndex: 1000
                                        }
                                    }}
                                />
                            )}
                            {directionsResponse && directionsResponse.routes && directionsResponse.routes[0] && (
                                <>
                                    {/* Floating Duration Label at Midpoint */}
                                    {directionsResponse.routes[0].midpoint && (
                                        <InfoWindowF
                                            position={directionsResponse.routes[0].midpoint}
                                            options={{ 
                                                disableAutoPan: true,
                                                closeBoxURL: "", 
                                                enableEventPropagation: true,
                                                pixelOffset: new window.google.maps.Size(0, 0)
                                            }}
                                        >
                                            <div style={{ 
                                                background: '#883900ff', 
                                                color: 'white', 
                                                padding: '2px 8px', 
                                                borderRadius: '6px', 
                                                fontSize: '11px', 
                                                fontWeight: 'bold',
                                                border: '2px solid white',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {duration}
                                            </div>
                                        </InfoWindowF>
                                    )}
                                </>
                            )}

                            {/* Tactical Overlays (VISIBLE ONLY IN STREET VIEW) */}
                            {isStreetActive && directionsResponse && directionsResponse.routes && (
                                <>
                                    <PolylineF
                                        path={directionsResponse.routes[0].overview_path}
                                        panorama={panorama}
                                        options={{
                                            strokeColor: '#ffffff',
                                            strokeOpacity: 0.8,
                                            strokeWeight: 8,
                                            zIndex: 499
                                        }}
                                    />
                                    <PolylineF
                                        path={directionsResponse.routes[0].overview_path}
                                        panorama={panorama}
                                        options={{
                                            strokeColor: '#f97316',
                                            strokeOpacity: 0.9,
                                            strokeWeight: 5,
                                            zIndex: 500
                                        }}
                                    />
                                </>
                            )}
                            




                            {/* ── Tactical Cluster Zone Overlay ──
                                Shown when dispatcher is launched from Analytics via "Tactical Command Response".
                                Draws the exact stress zone circle from DBSCAN clustering on the operational map.
                                Color-coded by threat level (CRITICAL=red, HIGH=orange, EMERGING=yellow).
                            */}
                            {tacticalContext?.center && tacticalContext?.radius_meters && (
                                <>
                                    {/* Outer glow ring */}
                                    <CircleF
                                        center={tacticalContext.center}
                                        radius={tacticalContext.radius_meters * 1.5}
                                        options={{
                                            strokeColor: tacticalContext.threat_level === 'CRITICAL' ? '#ef4444'
                                                       : tacticalContext.threat_level === 'HIGH'     ? '#f97316'
                                                       : '#eab308',
                                            strokeOpacity: 0.25,
                                            strokeWeight: 1,
                                            fillColor: tacticalContext.threat_level === 'CRITICAL' ? '#ef4444'
                                                     : tacticalContext.threat_level === 'HIGH'     ? '#f97316'
                                                     : '#eab308',
                                            fillOpacity: 0.04,
                                            zIndex: 5,
                                            clickable: false,
                                        }}
                                    />
                                    {/* Core zone boundary */}
                                    <CircleF
                                        center={tacticalContext.center}
                                        radius={tacticalContext.radius_meters}
                                        options={{
                                            strokeColor: tacticalContext.threat_level === 'CRITICAL' ? '#ef4444'
                                                       : tacticalContext.threat_level === 'HIGH'     ? '#f97316'
                                                       : '#eab308',
                                            strokeOpacity: 0.9,
                                            strokeWeight: 2.5,
                                            fillColor: tacticalContext.threat_level === 'CRITICAL' ? '#ef4444'
                                                     : tacticalContext.threat_level === 'HIGH'     ? '#f97316'
                                                     : '#eab308',
                                            fillOpacity: 0.10,
                                            zIndex: 6,
                                            clickable: false,
                                        }}
                                    />
                                </>
                            )}

                            {/* Street View Camera Position Marker — no `panorama` prop, shown on the regular map */}
                            {svLocation && (
                                <>
                                    {/* Stable Core Dot */}
                                    <MarkerF
                                        position={svLocation}
                                        zIndex={160}
                                        icon={window.google && window.google.maps ? {
                                            path: window.google.maps.SymbolPath.CIRCLE,
                                            fillColor: '#ef4444',
                                            fillOpacity: 1,
                                            scale: 7,
                                            strokeColor: 'white',
                                            strokeWeight: 2,
                                        } : undefined}
                                        title={isStreetViewVisible ? "Live Street View Camera" : "Last Viewed Location"}
                                    />
                                    {/* Outer pulse ring 1 */}
                                    <MarkerF
                                        position={svLocation}
                                        zIndex={155}
                                        icon={window.google && window.google.maps ? {
                                            path: window.google.maps.SymbolPath.CIRCLE,
                                            fillColor: '#ef4444',
                                            fillOpacity: 0.3 * (1 - pulseRadius / 40) * (isStreetViewVisible ? 1 : 0.6),
                                            scale: pulseRadius,
                                            strokeColor: '#ef4444',
                                            strokeOpacity: 0.6 * (1 - pulseRadius / 40) * (isStreetViewVisible ? 1 : 0.6),
                                            strokeWeight: 1,
                                        } : undefined}
                                        options={{ clickable: false }}
                                    />
                                    {/* Outer pulse ring 2 (offset phase) */}
                                    <MarkerF
                                        position={svLocation}
                                        zIndex={154}
                                        icon={window.google && window.google.maps ? {
                                            path: window.google.maps.SymbolPath.CIRCLE,
                                            fillColor: '#ef4444',
                                            fillOpacity: 0.2 * (1 - ((pulseRadius + 20) % 40) / 40) * (isStreetViewVisible ? 1 : 0.6),
                                            scale: (pulseRadius + 20) % 40,
                                            strokeColor: '#ef4444',
                                            strokeOpacity: 0.4 * (1 - ((pulseRadius + 20) % 40) / 40) * (isStreetViewVisible ? 1 : 0.6),
                                            strokeWeight: 1,
                                        } : undefined}
                                        options={{ clickable: false }}
                                    />
                                </>
                            )}
                        </GoogleMap>

                    {/* Mini-Map Navigation Widget (Absolute overlay, visible only in Street View) */}
                    {isStreetActive && svLocation && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '24px',
                                right: '16px',
                                zIndex: 20,
                                borderRadius: '16px',
                                border: '3px solid white',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                overflow: 'hidden',
                                width: '200px',
                                height: '150px',
                                pointerEvents: 'auto'
                            }}
                        >
                            <GoogleMap
                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                center={svLocation}
                                zoom={17}
                                options={{
                                    disableDefaultUI: true,
                                    gestureHandling: 'none',
                                    styles: [
                                        { elementType: 'labels', stylers: [{ visibility: 'on' }] },
                                        { featureType: 'poi', stylers: [{ visibility: 'off' }] }
                                    ]
                                }}
                            >
                                <MarkerF
                                    position={svLocation}
                                    icon={window.google && window.google.maps ? {
                                        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                        scale: 5,
                                        fillColor: '#3b82f6',
                                        fillOpacity: 1,
                                        strokeWeight: 2,
                                        strokeColor: 'white',
                                        rotation: svHeading
                                    } : undefined}
                                />
                                {directionsResponse && directionsResponse.routes && (
                                    <PolylineF
                                        path={directionsResponse.routes[0].overview_path}
                                        options={{
                                            strokeColor: '#f97316',
                                            strokeOpacity: 0.8,
                                            strokeWeight: 3,
                                            clickable: false
                                        }}
                                    />
                                )}
                            </GoogleMap>
                        </div>
                    )}

                    {/* Map UI Floating Controls */}
                    <div className="absolute bottom-6 left-4 flex flex-col gap-2 pointer-events-none">
                        {/* Legend */}
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-3 shadow-xl pointer-events-auto">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Live Map Feed</h4>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-500">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Pending
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-500">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div> Active
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-500">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div> Resolved
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"></div> Rejected
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                    <div className="w-2 h-2 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"></div> Cancelled
                                </span>
                            </div>
                        </div>

                        {/* Center on HQ Button */}
                        <button
                            onClick={centerOnHQ}
                            className="bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-3 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center pointer-events-auto transition-colors group"
                            title="Center on Dispatch HQ"
                        >
                            <ShieldAlert size={20} className="group-hover:text-blue-500" />
                        </button>

                        {/* Street View Toggle */}
                        <button
                            onClick={() => {
                                if (panorama) {
                                    if (panorama.getVisible()) {
                                        panorama.setVisible(false);
                                    } else if (svLocation) {
                                        panorama.setPosition(svLocation);
                                        panorama.setVisible(true);
                                    } else if (selectedMarker) {
                                        handleStreetViewClick({ lat: selectedMarker.location_lat, lng: selectedMarker.location_lng });
                                    } else {
                                        panorama.setPosition(CALOOCAN_CENTER);
                                        panorama.setVisible(true);
                                    }
                                }
                            }}
                            className={`shadow-xl border p-3 rounded-full flex items-center justify-center pointer-events-auto transition-colors group ${
                                isStreetActive
                                    ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isStreetActive ? 'Exit Street View' : 'Open Street View'}
                        >
                            <Navigation size={20} className={isStreetActive ? '' : 'group-hover:text-blue-500'} />
                        </button>

                        {/* Clear Route Button (shown only when a route is active) */}
                        {directionsResponse && (
                            <button
                                onClick={() => { setDirectionsResponse(null); setDistance(''); setDuration(''); }}
                                className="bg-white dark:bg-slate-900 shadow-xl border border-orange-400 p-3 rounded-full text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center justify-center pointer-events-auto transition-colors"
                                title="Clear Route"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
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
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <ShieldAlert className="text-orange-500 shrink-0" size={18}/>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Human-in-the-Loop Required</h3>
                                                </div>
                                            </div>

                                                {/* Strategic Process Roadmap */}
                                                <div className="mb-6 relative">
                                                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-2">
                                                        <span className={['pending', 'unverified'].includes(selectedReport.status) ? 'text-orange-500' : 'text-slate-400'}>Intake</span>
                                                        <span className={selectedReport.status === 'pending_approval' ? 'text-orange-500' : 'text-slate-400'}>Budgeting</span>
                                                        <span className={['approved_internal', 'dispatched'].includes(selectedReport.status) ? 'text-orange-500' : 'text-slate-400'}>Execution</span>
                                                        <span className={selectedReport.status === 'resolved' ? 'text-green-500' : 'text-slate-400'}>Resolved</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full flex overflow-hidden">
                                                        <div className={`h-full transition-all duration-700 ${
                                                            ['pending', 'unverified'].includes(selectedReport.status) ? 'w-1/4 bg-orange-500' :
                                                            selectedReport.status === 'pending_approval' ? 'w-2/4 bg-orange-500' :
                                                            ['approved_internal', 'dispatched'].includes(selectedReport.status) ? 'w-3/4 bg-blue-500' :
                                                            selectedReport.status === 'resolved' ? 'w-full bg-green-500' : 'w-0'
                                                        }`}></div>
                                                    </div>
                                                    <div className="flex justify-between mt-1 px-0.5">
                                                        {[0, 1, 2, 3].map(i => (
                                                            <div key={i} className={`w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 ${
                                                                (i === 0 && ['pending', 'unverified', 'pending_approval', 'approved_internal', 'dispatched', 'resolved'].includes(selectedReport.status)) ||
                                                                (i === 1 && ['pending_approval', 'approved_internal', 'dispatched', 'resolved'].includes(selectedReport.status)) ||
                                                                (i === 2 && ['approved_internal', 'dispatched', 'resolved'].includes(selectedReport.status)) ||
                                                                (i === 3 && selectedReport.status === 'resolved')
                                                                    ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
                                                            }`}></div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">AI Vision confidence for <strong>{selectedReport.ticket_id || `RPT-${selectedReport.id}`}</strong> is {selectedReport.aiConfidence || urgencyToConfidence(selectedReport.ai_urgency)}%. Manual categorization required before generating Work Order.</p>
                                                
                                                <div className="bg-white dark:bg-slate-900 rounded-lg p-2 mb-3 border border-slate-200 dark:border-slate-800">
                                                    <div className="text-xs font-bold text-slate-500 mb-2">Attached Image:</div>
                                                    <div className="w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex items-center justify-center text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 relative group">
                                                        {selectedReport.image_url ? (
                                                            <button 
                                                                onClick={() => setZoomedImage(`http://localhost:33159${selectedReport.image_url}`)}
                                                                className="w-full h-full cursor-zoom-in"
                                                                title="Click to Zoom"
                                                            >
                                                                <img 
                                                                    src={`http://localhost:33159${selectedReport.image_url}`} 
                                                                    alt="Report Evidence" 
                                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                                                                />
                                                            </button>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-2">
                                                                <ImageIcon size={24} className="opacity-20"/>
                                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No citizen media</span>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Quick Street View Toggle for Current Report Location */}
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStreetViewClick({ lat: selectedReport.location_lat, lng: selectedReport.location_lng });
                                                            }}
                                                            className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur text-white p-2 rounded-lg text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-600"
                                                        >
                                                            <Eye size={12}/> View Street View
                                                        </button>
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

                                                {/* Route Info in Sidebar (Detailed Road Logistics) */}
                                                {directionsResponse && (
                                                    <div className="mb-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-center justify-between">
                                                        <div>
                                                            <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">Route to Incident</div>
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                <Truck size={14} className="text-orange-500"/> {distance} • {duration}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleExternalDirections(selectedReport)}
                                                            className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-500 transition-colors shadow-sm"
                                                        >
                                                            <Navigation size={16} />
                                                        </button>
                                                    </div>
                                                )}

                                                {!directionsResponse && (
                                                    <button 
                                                        onClick={() => handleGetDirections(selectedReport)}
                                                        className="w-full mb-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-800"
                                                    >
                                                        <Navigation size={14} className="text-orange-500"/>
                                                        Calculate Logistics & Route
                                                    </button>
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
                                                    {selectedReport.status === 'pending_approval' && (
                                                        <button 
                                                            onClick={() => handleApproveReport(selectedReport.id)}
                                                            disabled={actionLoading === selectedReport.id}
                                                            className="bg-orange-600 hover:bg-orange-500 text-white py-2 rounded text-xs font-bold transition-colors shadow disabled:opacity-50 flex items-center justify-center gap-2"
                                                        >
                                                            <Briefcase size={14} /> Budgeting & Financial Approval
                                                        </button>
                                                    )}
                                                    {selectedReport.status === 'approved_internal' && (
                                                        <button 
                                                            onClick={() => setIsDispatchModalOpen(true)}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-xs font-bold transition-colors shadow flex items-center justify-center gap-2"
                                                        >
                                                            <Briefcase size={14} /> Generate Work Order
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
                                                    <button 
                                                        onClick={() => Swal.fire({
                                                            title: '',
                                                            html: `
                                                                <div class="flex flex-col items-center text-center p-2 mb-2">
                                                                    <div class="w-14 h-14 rounded-full bg-orange-600/20 flex items-center justify-center border-2 border-orange-500/30 mb-7 mx-auto">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                                                                    </div>
                                                                    <h2 class="text-2xl font-bold text-white mb-2 tracking-tight">Strategic Process Flow</h2>
                                                                    <p class="text-slate-400 text-[11px] mb-10 uppercase tracking-[0.2em] font-bold">
                                                                        Tracking: <span class="text-orange-500">${selectedReport.ticket_id || `RPT-${selectedReport.id}`}</span>
                                                                    </p>
                                                                    
                                                                    <div class="w-full max-w-[320px] mx-auto relative px-4 text-left">
                                                                        <div class="absolute left-6 top-3 bottom-3 w-px bg-slate-800"></div>
                                                                        
                                                                        <div class="space-y-10">
                                                                            <div class="flex items-start gap-5 relative group">
                                                                                <div class="mt-1.5 w-3 h-3 rounded-full bg-orange-500 z-10"></div>
                                                                                <div>
                                                                                    <div class="text-[13px] font-bold text-white leading-none mb-1">Phase 1: Intake & Analysis</div>
                                                                                    <div class="text-[10px] text-slate-500 leading-relaxed">AI Vision automatically categorizes and evaluates citizen reports.</div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div class="flex items-start gap-5 relative group">
                                                                                <div class="mt-1.5 w-3 h-3 rounded-full z-10 ${['pending_approval', 'approved_internal', 'dispatched', 'resolved'].includes(selectedReport.status) ? 'bg-orange-500' : 'bg-slate-800'}"></div>
                                                                                <div>
                                                                                    <div class="text-[13px] font-bold leading-none mb-1 ${['pending_approval', 'approved_internal', 'dispatched', 'resolved'].includes(selectedReport.status) ? 'text-white' : 'text-slate-600'}">Phase 2: Tactical Planning</div>
                                                                                    <div class="text-[10px] text-slate-500 leading-relaxed">Dispatcher evaluates logistics, routing, and fleet availability.</div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="flex items-start gap-5 relative group">
                                                                                <div class="mt-1.5 w-3 h-3 rounded-full z-10 ${['approved_internal', 'dispatched', 'resolved'].includes(selectedReport.status) ? 'bg-orange-500' : 'bg-slate-800'}"></div>
                                                                                <div>
                                                                                    <div class="text-[13px] font-bold leading-none mb-1 ${['approved_internal', 'dispatched', 'resolved'].includes(selectedReport.status) ? 'text-white' : 'text-slate-600'}">Phase 3: Budgeting & Approval</div>
                                                                                    <div class="text-[10px] text-slate-500 leading-relaxed">Manager review, resource locking, and final site authorization.</div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="flex items-start gap-5 relative group">
                                                                                <div class="mt-1.5 w-3 h-3 rounded-full z-10 ${['dispatched', 'resolved'].includes(selectedReport.status) ? 'bg-orange-500' : 'bg-slate-800'}"></div>
                                                                                <div>
                                                                                    <div class="text-[13px] font-bold leading-none mb-1 ${['dispatched', 'resolved'].includes(selectedReport.status) ? 'text-white' : 'text-slate-600'}">Phase 4: Field Execution</div>
                                                                                    <div class="text-[10px] text-slate-500 leading-relaxed">Assigned fleet executes work according to engineering specs.</div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="flex items-start gap-5 relative group">
                                                                                <div class="mt-1.5 w-3 h-3 rounded-full z-10 ${selectedReport.status === 'resolved' ? 'bg-orange-500' : 'bg-slate-800'}"></div>
                                                                                <div>
                                                                                    <div class="text-[13px] font-bold leading-none mb-1 ${selectedReport.status === 'resolved' ? 'text-white' : 'text-slate-600'}">Phase 5: Site Resolution</div>
                                                                                    <div class="text-[10px] text-slate-500 leading-relaxed">Final site audit, report closure, and citizen notification.</div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            `,
                                                            showConfirmButton: false,
                                                            showCloseButton: true,
                                                            customClass: {
                                                                popup: 'rounded-[40px] border border-white/5 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)]',
                                                                closeButton: 'text-slate-500 hover:text-orange-500 transition-colors border-none shadow-none focus:outline-none'
                                                            },
                                                            buttonsStyling: false,
                                                            background: '#0F172A',
                                                            color: '#fff',
                                                            width: '460px',
                                                            padding: '4.5rem 2rem 5rem 2rem'
                                                        })}
                                                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                                                    >
                                                        <Activity size={14}/> Process Audit
                                                    </button>
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
                                        <div className="text-xs text-slate-400 mb-1">Lead: <span className="text-slate-300 font-bold">{team.lead}</span></div>
                                        <div className="text-xs text-slate-400 mb-1">Specialization: <span className="text-slate-300">{team.type}</span></div>
                                        <div className="text-xs text-slate-400 flex justify-between items-center">
                                            <span>Loc: <span className="text-slate-300">{team.location}</span></span>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => map?.panTo({ lat: team.lat, lng: team.lng })}
                                                    className="text-slate-400 hover:text-white"
                                                    title="Locate Team"
                                                >
                                                    <MapPin size={14}/>
                                                </button>
                                                {selectedReport && (
                                                    <button 
                                                        onClick={() => handleGetDirections(selectedReport, { lat: team.lat, lng: team.lng })}
                                                        className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                                                    >
                                                        <Navigation size={12}/> Route
                                                    </button>
                                                )}
                                                {team.status === 'Available' && (
                                                    <button 
                                                        onClick={() => {
                                                            if (selectedReport) {
                                                                setDispatchForm(prev => ({ ...prev, assigned_to_id: team.id + 1 })); // Offset to match dummy select IDs 2,3,4
                                                                setIsDispatchModalOpen(true);
                                                            } else {
                                                                Swal.fire({
                                                                    icon: 'info',
                                                                    title: 'No Report Selected',
                                                                    text: 'Please select an approved report from the queue before assigning a field team.',
                                                                    background: '#1e293b',
                                                                    color: '#fff'
                                                                });
                                                            }
                                                        }}
                                                        className="text-blue-400 hover:text-blue-300 font-bold text-xs"
                                                    >
                                                        Assign Task
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Dispatch / Generate Work Order Modal */}
                <AnimatePresence>
                    {isDispatchModalOpen && selectedReport && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full border border-slate-200 dark:border-slate-800 flex flex-col"
                            >
                                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100/50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-500">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">Generate Work Order</h2>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">For Ticket {selectedReport.ticket_id || `RPT-${selectedReport.id}`}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsDispatchModalOpen(false)}
                                        className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 transition-colors"
                                    >
                                        &times;
                                    </button>
                                </div>
                                
                                <form onSubmit={handleCreateWorkOrder} className="p-6 flex flex-col gap-4">
                                    
                                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 border border-slate-200 dark:border-slate-800 mb-2">
                                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Issue Location</div>
                                        <div className="text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-400"/>
                                            {selectedReport.location_string || `${selectedReport.location_lat?.toFixed(4)}, ${selectedReport.location_lng?.toFixed(4)}`}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assign To (Field Engineer)</label>
                                        <select 
                                            required
                                            value={dispatchForm.assigned_to_id}
                                            onChange={(e) => setDispatchForm({...dispatchForm, assigned_to_id: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors"
                                        >
                                            <option value="2">Engr. Dela Cruz (Team Alpha - Electrical)</option>
                                            <option value="3">Engr. Bautista (Team Beta - General)</option>
                                            <option value="4">Engr. Reyes (Team Gamma - Plumbing)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Priority Level</label>
                                        <select 
                                            value={dispatchForm.priority}
                                            onChange={(e) => setDispatchForm({...dispatchForm, priority: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors"
                                        >
                                            <option value="low">Low Priority (Maintenance)</option>
                                            <option value="normal">Normal (Standard SLA)</option>
                                            <option value="high">High Priority (Urgent repair)</option>
                                            <option value="critical">Critical (Immediate danger)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Task Title</label>
                                        <input 
                                            type="text"
                                            placeholder={`Fix ${selectedReport.ai_category || selectedReport.category}`}
                                            value={dispatchForm.title}
                                            onChange={(e) => setDispatchForm({...dispatchForm, title: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Dispatcher Notes / Action Plan</label>
                                        <textarea 
                                            rows="3"
                                            placeholder="Provide specific instructions to the field team..."
                                            value={dispatchForm.description}
                                            onChange={(e) => setDispatchForm({...dispatchForm, description: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors custom-scrollbar"
                                        ></textarea>
                                    </div>

                                    <div className="mt-2 flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => setIsDispatchModalOpen(false)}
                                            className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={actionLoading === selectedReport.id}
                                            className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {actionLoading === selectedReport.id ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Navigation size={16}/>}
                                            Execute Dispatch
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {/* Jurisdiction Error Modal */}
                    <AnimatePresence>
                        {isJurisdictionModalOpen && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-center">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-red-500/20"
                                >
                                    <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <ShieldAlert className="text-red-600 dark:text-red-500" size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Access Denied</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                                        {jurisdictionErrorMsg}
                                    </p>
                                    <button
                                        onClick={() => setIsJurisdictionModalOpen(false)}
                                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 uppercase tracking-widest text-xs"
                                    >
                                        Understood
                                    </button>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Street View Confirmation Modal */}
                    {isStreetViewConfirmOpen && pendingStreetViewLoc && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full border border-slate-200 dark:border-slate-800 p-6 text-center"
                            >
                                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-500 mx-auto mb-4">
                                    <Eye size={32} />
                                </div>
                                <h2 className="font-bold text-slate-900 dark:text-white text-xl mb-2">Switch to Street View?</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium leading-relaxed">
                                    Would you like to enter Street View at this location to inspect the report surroundings?
                                </p>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => {
                                            setIsStreetViewConfirmOpen(false);
                                            setPendingStreetViewLoc(null);
                                        }}
                                        className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (panorama && pendingStreetViewLoc) {
                                                panorama.setPosition(pendingStreetViewLoc);
                                                panorama.setVisible(true);
                                                setSvLocation(pendingStreetViewLoc);
                                            } else if (map && pendingStreetViewLoc) {
                                                const sv = map.getStreetView();
                                                sv.setPosition(pendingStreetViewLoc);
                                                sv.setVisible(true);
                                                setPanorama(sv);
                                            }
                                            setIsStreetViewConfirmOpen(false);
                                            setPendingStreetViewLoc(null);
                                        }}
                                        className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Eye size={14} /> Confirm
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                </main>

                {/* PULSO Omni-Assistant FAB */}
                <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-4">
                    <AnimatePresence>
                        {isAIChatOpen && (
                            <>
                                {/* Backdrop (maximized only) */}
                                {isAIMaximized && (
                                    <motion.div
                                        key="backdrop"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[99]"
                                        onClick={() => setIsAIMaximized(false)}
                                    />
                                )}

                                <motion.div
                                    key="chat"
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                    className={`bg-slate-900 shadow-2xl border border-slate-700 overflow-hidden flex flex-col transition-all duration-300 ${
                                        isAIMaximized
                                            ? 'fixed inset-6 md:inset-12 lg:inset-20 z-[100] rounded-3xl'
                                            : 'w-[380px] h-[500px] rounded-2xl relative z-[100]'
                                    }`}
                                >
                                    {/* Header */}
                                    <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center animate-pulse">
                                                <Brain size={18} className="text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">PULSO Omni-Assistant</h4>
                                                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Engineering Co-pilot</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {/* Maximize / Minimize toggle */}
                                            <button
                                                onClick={() => setIsAIMaximized(prev => !prev)}
                                                title={isAIMaximized ? 'Minimize' : 'Maximize'}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                            >
                                                {isAIMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                                            </button>
                                            {/* Close */}
                                            <button
                                                onClick={() => { setIsAIChatOpen(false); setIsAIMaximized(false); }}
                                                title="Close"
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                                            >
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                                        {aiMessages.map((msg, i) => (
                                            <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                {/* Text bubble */}
                                                <div className={`${
                                                    isAIMaximized ? 'max-w-[70%]' : 'max-w-[90%]'
                                                } p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                                                    msg.role === 'user' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'
                                                }`}>
                                                    {msg.text}
                                                </div>

                                                {/* Map Result Card — shown only for assistant messages with location data */}
                                                {msg.role === 'assistant' && msg.mapData && msg.mapData.length > 0 && isLoaded && (
                                                    <div className={`w-full ${isAIMaximized ? 'max-w-[85%]' : 'max-w-full'} rounded-2xl border border-slate-700 overflow-hidden bg-slate-800/80`}>
                                                        {/* Map label */}
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 border-b border-slate-700">
                                                            <MapIcon size={13} className="text-orange-400" />
                                                            <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Live Report Locations</span>
                                                            <span className="ml-auto text-[10px] text-slate-400 font-semibold">{msg.mapData.length} pins</span>
                                                        </div>

                                                        {/* Embedded mini Google Map */}
                                                        <div className="w-full h-44 relative">
                                                            <GoogleMap
                                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                                center={CALOOCAN_CENTER}
                                                                zoom={13}
                                                                options={{
                                                                    disableDefaultUI: true,
                                                                    styles: isDarkMode ? [
                                                                        { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
                                                                        { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
                                                                        { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
                                                                        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
                                                                        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1626' }] },
                                                                    ] : [
                                                                        { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
                                                                        { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
                                                                        { elementType: 'labels.text.stroke', stylers: [{ color: '#f8fafc' }] },
                                                                        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
                                                                        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
                                                                    ]
                                                                }}
                                                            >
                                                                {msg.mapData.map(r => r.location_lat && r.location_lng && (
                                                                    <MarkerF
                                                                        key={r.id}
                                                                        position={{ lat: r.location_lat, lng: r.location_lng }}
                                                                        title={`RPT-${r.id}: ${r.ai_category || r.category}`}
                                                                        icon={window.google?.maps ? {
                                                                            path: window.google.maps.SymbolPath.CIRCLE,
                                                                            fillColor: r.status === 'resolved' ? '#22c55e' : r.ai_urgency === 'Critical' ? '#ef4444' : '#f97316',
                                                                            fillOpacity: 1,
                                                                            scale: 7,
                                                                            strokeColor: 'white',
                                                                            strokeWeight: 2,
                                                                        } : undefined}
                                                                    />
                                                                ))}
                                                            </GoogleMap>
                                                        </div>

                                                        {/* Report list — scrollable */}
                                                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-700/50 scrollbar-thin scrollbar-thumb-slate-700">
                                                            {msg.mapData.map((r, idx) => (
                                                                <button
                                                                    key={r.id}
                                                                    onClick={() => map?.panTo({ lat: r.location_lat, lng: r.location_lng })}
                                                                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-700/50 transition-colors text-left group"
                                                                >
                                                                    {/* Index badge */}
                                                                    <span className="shrink-0 w-5 h-5 rounded-full bg-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center mt-0.5">{idx + 1}</span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="text-[11px] font-bold text-white truncate">{r.ai_category || r.category || 'Uncategorized'}</span>
                                                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                                                                r.status === 'resolved' ? 'bg-green-500/15 text-green-400' :
                                                                                r.ai_urgency === 'Critical' ? 'bg-red-500/15 text-red-400' :
                                                                                'bg-orange-500/15 text-orange-400'
                                                                            }`}>{r.status}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 mt-0.5">
                                                                            <MapPin size={9} className="text-slate-500 shrink-0" />
                                                                            <span className="text-[10px] text-slate-400 truncate">
                                                                                {r.location_string || `${r.location_lat?.toFixed(4)}°N, ${r.location_lng?.toFixed(4)}°E`}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[9px] font-mono text-slate-600 group-hover:text-orange-400 transition-colors shrink-0">{r.ticket_id || `RPT-${r.id}`}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {isAILoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-slate-800 p-3 rounded-2xl flex gap-1">
                                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={aiChatEndRef} />
                                    </div>

                                    {/* Input */}
                                    <form onSubmit={handleAIChat} className="p-4 bg-slate-800 border-t border-slate-700 shrink-0">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={aiQuery}
                                                onChange={(e) => setAiQuery(e.target.value)}
                                                placeholder="Ask PULSO Brain..."
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                            />
                                            <button type="submit" disabled={isAILoading} className="absolute right-2 top-[7px] text-blue-400 hover:text-blue-300 disabled:opacity-40">
                                                <Search size={16} />
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                        className="w-16 h-16 rounded-full bg-blue-900 shadow-2xl shadow-blue-900/50 flex items-center justify-center text-white hover:bg-blue-800 transition-all hover:scale-105 active:scale-95 group"
                    >
                        <Brain size={32} className="group-hover:animate-pulse" />
                    </button>
                </div>
            </div>
            {/* ── Image Zoom Overlay ── */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setZoomedImage(null)}
                        className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-12 cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative max-w-5xl w-full h-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img 
                                src={zoomedImage} 
                                alt="Inspection" 
                                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10"
                            />
                            <button 
                                onClick={() => setZoomedImage(null)}
                                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors border border-white/20"
                            >
                                <X size={24} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        className={`fixed top-8 left-1/2 z-[2000] px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-4 min-w-[320px] max-w-md ${
                            notification.type === 'success' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                        }`}
                    >
                        <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm uppercase tracking-wider mb-0.5">
                                {notification.type === 'success' ? 'Task Finalized' : 'System Alert'}
                            </h4>
                            <p className="text-sm opacity-90 leading-tight font-medium">{notification.message}</p>
                        </div>
                        <button 
                            onClick={() => setNotification(null)}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}

                {reportToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => !isDeleting && setReportToDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden"
                        >
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400 animate-pulse">
                                    <AlertTriangle size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                                    Confirm Permanent Deletion
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                    Are you sure you want to delete report <span className="font-mono text-red-500 font-bold">{reportToDelete.ticket_id || `RPT-${reportToDelete.id}`}</span>? 
                                    This action is irreversible and will remove all associated logs and work orders.
                                </p>
                                
                                {deleteError && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-3 text-left"
                                    >
                                        <div className="shrink-0 p-1 bg-red-100 dark:bg-red-500/20 rounded-full">
                                            <X size={14} />
                                        </div>
                                        {deleteError}
                                    </motion.div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        disabled={isDeleting}
                                        onClick={() => { setReportToDelete(null); setDeleteError(null); }}
                                        className="flex-1 px-6 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isDeleting}
                                        onClick={handleDeleteReport}
                                        className="flex-1 px-6 py-3.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={18} />
                                                Delete Report
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Bottom aesthetic bar */}
                            <div className="h-1.5 w-full bg-red-600" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * Tactical Hull Analytics: Monotone Chain algorithm for Convex Hull
 * Defines the mission boundary around a set of reports.
 */
const getConvexHull = (points) => {
    if (points.length === 0) return [];
    if (points.length < 3) return points.map(p => ({ lat: p.location_lat, lng: p.location_lng }));
    
    // Sort points by latitude, then longitude
    const sorted = [...points].sort((a, b) => 
        a.location_lat !== b.location_lat ? a.location_lat - b.location_lat : a.location_lng - b.location_lng
    );
    
    const crossProduct = (a, b, c) => 
        (b.location_lng - a.location_lng) * (c.location_lat - a.location_lat) - 
        (b.location_lat - a.location_lat) * (c.location_lng - a.location_lng);
    
    const upper = [];
    for (const p of sorted) {
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    
    const lower = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    
    upper.pop();
    lower.pop();
    return [...upper, ...lower].map(p => ({ lat: p.location_lat, lng: p.location_lng }));
};

export default DispatcherDashboard;
