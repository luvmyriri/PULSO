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
    Image as ImageIcon
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF, PolygonF, DirectionsRenderer, PolylineF, HeatmapLayerF } from '@react-google-maps/api';
import { Link, useNavigate } from 'react-router-dom';
import GovSidebar from '../components/GovSidebar';

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
    'Pending Approval',
    'In Progress',
    'Resolved',
    'Rejected'
];

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

    const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'fleet'
    const [dashboardMode, setDashboardMode] = useState('triage'); // 'triage', 'active'
    const [selectedReport, setSelectedReport] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [allReports, setAllReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [map, setMap] = useState(null);
    const [panorama, setPanorama] = useState(null);
    const heatmapLayerRef = useRef(null);
    const [zoomedImage, setZoomedImage] = useState(null);

    const centerOnHQ = () => {
        if (map) {
            map.panTo(CALOOCAN_CITY_HALL_NORTH_LOC);
            map.setZoom(16);
        }
    };

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
    const [showHeatmap, setShowHeatmap] = useState(false);

    // AI Omni-Assistant State
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', text: `Greetings, Dispatcher ${currentUser?.full_name || ''}. I am your Engineering Co-pilot. How can I assist with triage today?` }
    ]);
    const [isAILoading, setIsAILoading] = useState(false);
    const [isAIMaximized, setIsAIMaximized] = useState(false);

    const aiChatEndRef = useRef(null);

    const LOCATION_KEYWORDS = /location|where|report|map|address|barangay|coordinates|lat|lng|pin|incident|hazard|site|area|place/i;


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
                    const rResp = await fetch('http://localhost:33159/api/reports?limit=30', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (rResp.ok) {
                        reportsForMap = await rResp.json();
                        reportContext = `\n\nLive Report Data (${reportsForMap.length} active reports):\n` +
                            reportsForMap.map((r, i) =>
                                `${i + 1}. [RPT-${r.id}] ${r.ai_category || r.category || 'Uncategorized'} — ${r.location_string || `Lat:${r.location_lat?.toFixed(4)}, Lng:${r.location_lng?.toFixed(4)}`} — Status: ${r.status}`
                            ).join('\n');
                    }
                } catch { /* silently skip if reports unavailable */ }
            }

            const resp = await fetch('http://localhost:33159/api/ai/assistant', {
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
                map.panTo({ lat: pos.lat(), lng: pos.lng() });
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
        const originStr = `${originObj.lat},${originObj.lng}`;
        const destStr = target ? `${target.location_lat},${target.location_lng}` : '';
        
        console.log("handleGetDirections (Proxy) triggered for:", target?.id);

        if (target && destStr) {
            setDirectionsLoading(true);
            try {
                // Using the secure backend proxy we created earlier
                const response = await fetch(`http://localhost:33159/api/maps/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.polyline) {
                        console.log("Directions Proxy OK:", data.distance);
                        
                                // Decode the polyline points for the map
                        if (window.google && window.google.maps && window.google.maps.geometry) {
                            const decodedPath = window.google.maps.geometry.encoding.decodePath(data.polyline);
                            
                            // Find Midpoint for the label
                            const midpointIndex = Math.floor(decodedPath.length / 2);
                            const midpoint = { 
                                lat: decodedPath[midpointIndex].lat(), 
                                lng: decodedPath[midpointIndex].lng() 
                            };

                            setDirectionsResponse({
                                routes: [{
                                    legs: [{
                                        distance: { text: data.distance },
                                        duration: { text: data.duration },
                                        steps: [],
                                    }],
                                    overview_path: decodedPath,
                                    overview_polyline: data.polyline, 
                                    bounds: data.bounds,
                                    midpoint: midpoint
                                }]
                            });
                        }
                        
                        setDistance(data.distance);
                        setDuration(data.duration);
                        
                        if (!selectedMarker || selectedMarker.id !== target.id) {
                            setSelectedMarker(target);
                        }
                    } else {
                        throw new Error("Invalid route data received");
                    }
                } else {
                    const err = await response.json();
                    throw new Error(err.detail || "API Request Denied (Check GCP Console)");
                }
            } catch (err) {
                console.error('Directions Proxy failed:', err);
                alert(`Routing Error: ${err.message}. Please ensure 'Directions API' is enabled in your Google Cloud Console.`);
                setDirectionsResponse(null);
                setDistance('');
                setDuration('');
            } finally {
                setDirectionsLoading(false);
            }
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

    const mapOptions = React.useMemo(() => ({
        styles: [
            { "elementType": "geometry", "stylers": [{ "color": "#121826" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#637282" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#121826" }] },
            { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#2c3e50" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#232b3d" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0d1117" }] }
        ],
        disableDefaultUI: true,
        zoomControl: true,
        // streetViewControl is intentionally disabled — we use our own custom toggle button
        streetViewControl: false,
    }), []);

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
            const response = await fetch('http://localhost:33159/api/reports', {
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

    const handleStatusAction = async (reportId, endpoint, successMsg, confirmTitle = null) => {
        if (confirmTitle) {
            const result = await Swal.fire({
                title: confirmTitle,
                text: "Are you sure you want to perform this action?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f97316',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, proceed',
                background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
            });
            if (!result.isConfirmed) return;
        }

        setActionLoading(reportId);
        try {
            const response = await fetch(`http://localhost:33159/api/reports/${reportId}${endpoint}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: endpoint === '/status' ? JSON.stringify({ status: 'pending_approval' }) : undefined
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

    const handleVerifyReport  = (id) => handleStatusAction(id, '/status', 'Report moved to verified queue.');
    const handleRejectReport  = (id) => handleStatusAction(id, '/reject', 'Report rejected and resident penalized.', "Reject this report?");
    const handleResolveReport  = (id) => handleStatusAction(id, '/resolve', 'Incident marked as resolved.', "Close this incident?");

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

            const response = await fetch('http://localhost:33159/api/work-orders', {
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
                    'Pending Approval': 'pending_approval',
                    'In Progress': ['approved_internal', 'dispatched'],
                    'Resolved': 'resolved',
                    'Rejected': 'rejected'
                };
                const targetStatus = statusMap[selectedStatus];
                if (Array.isArray(targetStatus)) {
                    if (!targetStatus.includes(report.status)) return false;
                } else if (report.status !== targetStatus) {
                    return false;
                }
            } else {
                const matchesMode = dashboardMode === 'triage' 
                    ? ['unverified', 'pending', 'pending_approval'].includes(report.status)
                    : report.status === 'approved_internal';
                
                if (!matchesMode) return false;
            }

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

            // 4. Issue Type (Category) Filter (Robust / Fuzzy Match)
            if (selectedCategory !== 'All Categories') {
                const reportCat = (report.ai_category || report.category || '').toLowerCase();
                
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

    const activeReports = filteredReports; // Re-alias for minimal code disruption

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
        if (cat.includes('electrical') || cat.includes('wire') || cat.includes('power')) return 'red';
        if (cat.includes('road') || cat.includes('pothole') || cat.includes('infrastructure')) return 'orange';
        return 'slate';
    };

    // Beautiful Dynamic SVG Pin Generator
    const getMarkerSVG = (category, status) => {
        let color = status === 'resolved' ? '#22c55e' : (status === 'pending' || status === 'unverified' ? '#ef4444' : '#f97316');
        let svgIcon = ''; 
        const cat = (category || '').toLowerCase();
        
        // Crisp, solid vector shapes corresponding to report classifications
        if (cat.includes('flood') || cat.includes('water')) {
            // Droplet
            svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
        } else if (cat.includes('electric') || cat.includes('wire') || cat.includes('power')) {
            // Zap
            svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
        } else if (cat.includes('road') || cat.includes('pothole') || cat.includes('infrastructure')) {
            // Hardhat / Cone approximation
            svgIcon = `<path d="M12 2a6 6 0 0 0-6 6v2H4v2h16v-2h-2V8a6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4v2H8V8a4 4 0 0 1 4-4z" fill="white"/>`;
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

    // Mock Fleet Data with GPS Coordinates
    const fleetStatus = [
        { id: 'FL-01', name: 'Team Alpha', status: 'Available', type: 'Electrical', location: 'Zone 12', lat: 14.758, lng: 121.035 },
        { id: 'FL-02', name: 'Team Beta', status: 'En Route', type: 'General/Roads', location: 'Main Avenue', lat: 14.745, lng: 121.065 },
        { id: 'FL-03', name: 'Team Gamma', status: 'On Site', type: 'Plumbing/Water', location: 'Block 4', lat: 14.762, lng: 121.042 },
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
                                    <div className="flex flex-col gap-2">
                                        <div className="relative w-full">
                                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                                            <select 
                                                value={selectedBarangay}
                                                onChange={(e) => setSelectedBarangay(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-8 py-2 text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-300 dark:focus:border-slate-600 appearance-none transition-colors"
                                            >
                                                {CALOOCAN_NORTH_BARANGAYS.map(brgy => (
                                                    <option key={brgy} value={brgy}>{brgy}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 opacity-50">
                                                <ChevronRight size={12} className="rotate-90" />
                                            </div>
                                        </div>
                                        <div className="relative w-full">
                                            <AlertTriangle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                                            <select 
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-8 py-2 text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-300 dark:focus:border-slate-600 appearance-none transition-colors"
                                            >
                                                {INFRASTRUCTURE_CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 opacity-50">
                                                <ChevronRight size={12} className="rotate-90" />
                                            </div>
                                        </div>
                                        <div className="relative w-full">
                                            <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                                            <select 
                                                value={selectedStatus}
                                                onChange={(e) => setSelectedStatus(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-8 py-2 text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-300 dark:focus:border-slate-600 appearance-none transition-colors"
                                            >
                                                {STATUS_OPTIONS.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 opacity-50">
                                                <ChevronRight size={12} className="rotate-90" />
                                            </div>
                                        </div>
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
                                {loadingReports ? (
                                    <div className="p-4 text-center text-slate-500">Loading reports...</div>
                                ) : activeReports.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500">No active reports in queue.</div>
                                ) : (
                                    activeReports.map(report => {
                                        const color = getReportColor(report.ai_category || report.category);
                                        const icon = getReportIcon(report.ai_category || report.category);
                                        const aiConfidence = urgencyToConfidence(report.ai_urgency);
                                        
                                        const selectionClass = selectedReport?.id === report.id 
                                            ? {
                                                orange: 'bg-orange-500/10 border-orange-500/50 ring-1 ring-orange-500/20',
                                                blue: 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/20',
                                                red: 'bg-red-500/10 border-red-500/50 ring-1 ring-red-500/20',
                                                slate: 'bg-slate-800/80 border-slate-500/50 ring-1 ring-slate-500/20'
                                            }[color] || 'bg-slate-800 border-blue-500'
                                            : 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm';

                                        return (
                                        <button 
                                            key={report.id}
                                            onClick={() => {
                                                const reportWithContext = {...report, aiConfidence, color, icon};
                                                setSelectedReport(reportWithContext);
                                                setSelectedMarker(report);
                                                if (map) map.panTo({ lat: report.location_lat, lng: report.location_lng });
                                            }}
                                            className={`w-full text-left p-3 rounded-xl border transition-all ${selectionClass}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                                        color === 'orange' ? 'bg-orange-500/10 text-orange-500' :
                                                        color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                                                        color === 'red' ? 'bg-red-500/10 text-red-500' :
                                                        'bg-slate-500/10 text-slate-500'
                                                    }`}>
                                                        {icon}
                                                    </div>
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm">{report.ticket_id || `RPT-${report.id}`}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-slate-500 whitespace-nowrap mb-1">{new Date(report.created_at).toLocaleDateString()}</span>
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
                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-bold truncate mb-1">{report.ai_category || report.category}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mb-3 truncate font-medium">
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
                                                        className="p-1 px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                                        title="Quick Street View"
                                                    >
                                                        <Eye size={14} />
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
                                        key={report.id}
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
                                            url: getMarkerSVG(report.ai_category || report.category, report.status),
                                            scaledSize: new window.google.maps.Size(44, 50),
                                            anchor: new window.google.maps.Point(22, 50)
                                        } : undefined}
                                    />
                                )
                            ))}

                            {selectedMarker && (
                                <InfoWindowF
                                    position={{ lat: selectedMarker.location_lat, lng: selectedMarker.location_lng }}
                                    onCloseClick={() => setSelectedMarker(null)}
                                    options={{ 
                                        pixelOffset: new window.google.maps.Size(0, -35),
                                        zIndex: 1000 
                                    }}
                                >
                                    {/* All inline styles — Tailwind dark: classes are unreliable inside Google Maps DOM */}
                                    <div 
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ background:'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', borderRadius:'16px', padding:'16px', minWidth:'220px', border:'1px solid rgba(255,255,255,0.07)', margin:'-10px', boxShadow:'0 25px 50px rgba(0,0,0,0.7)', fontFamily:'Inter,sans-serif', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', position:'relative' }}
                                    >
                                        {/* Close */}
                                        <button onClick={() => setSelectedMarker(null)} style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:'26px', height:'26px', cursor:'pointer', color:'#94a3b8', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                                        {/* Icon */}
                                        <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.25)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'10px', color:'#f97316' }}><AlertTriangle size={18} /></div>
                                        {/* Ticket ID */}
                                        <div style={{ fontSize:'10px', fontWeight:800, letterSpacing:'0.1em', color:'#94a3b8', marginBottom:'4px', fontFamily:'monospace' }}>RPT-{selectedMarker.id}</div>
                                        {/* Category */}
                                        <h4 style={{ fontWeight:700, fontSize:'14px', color:'#f1f5f9', lineHeight:1.3, margin:'0 0 6px', padding:'0 16px' }}>{selectedMarker.ai_category || selectedMarker.category || 'Uncategorized'}</h4>
                                        {/* Distance & Duration from HQ or Get Route Button */}
                                        {!directionsResponse ? (
                                            <button
                                                disabled={directionsLoading}
                                                onPointerDown={(e) => { e.stopPropagation(); handleGetDirections(selectedMarker); }}
                                                onClick={(e) => { e.stopPropagation(); handleGetDirections(selectedMarker); }}
                                                style={{ width:'100%', padding:'10px 0', background: directionsLoading ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'#f1f5f9', fontSize:'12px', fontWeight:600, cursor: directionsLoading ? 'wait' : 'pointer', marginBottom:'14px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'all 0.2s', position:'relative', zIndex:1001 }}
                                                onMouseOver={(e) => { if(!directionsLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                                onMouseOut={(e) => { if(!directionsLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                            >
                                                {directionsLoading ? (
                                                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                                ) : (
                                                    <><Navigation size={14} color="#f97316" /> Get Directions</>
                                                )}
                                            </button>
                                        ) : (
                                            <div style={{ display:'flex', flexDirection:'column', gap:'8px', width:'100%', marginBottom:'14px' }}>
                                                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:'12px', padding:'8px 14px' }}>
                                                    <Truck size={12} style={{ color:'#f97316' }} />
                                                    <span style={{ fontSize:'10px', fontWeight:800, color:'#f1f5f9' }}>{distance} • {duration}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleExternalDirections(selectedMarker)}
                                                    style={{ width:'100%', background:'transparent', border:'none', color:'#94a3b8', fontSize:'9px', fontWeight:700, textTransform:'uppercase', cursor:'pointer', textDecoration:'underline' }}
                                                >
                                                    Open in Maps App
                                                </button>
                                            </div>
                                        )}
                                        {/* Status pill */}
                                        <div style={{ fontSize:'10px', fontWeight:800, letterSpacing:'0.12em', color: selectedMarker.status==='resolved'?'#4ade80': selectedMarker.status==='rejected'?'#f87171':'#fb923c', background: selectedMarker.status==='resolved'?'rgba(74,222,128,0.12)': selectedMarker.status==='rejected'?'rgba(248,113,113,0.12)':'rgba(251,146,60,0.12)', padding:'3px 12px', borderRadius:'999px', marginBottom:'14px', textTransform:'uppercase' }}>{(selectedMarker.status || '').replace(/_/g,' ')}</div>
                                        {/* Street View button */}
                                        <button
                                            onClick={() => handleStreetViewClick({ lat: selectedMarker.location_lat, lng: selectedMarker.location_lng })}
                                            style={{ width:'100%', padding:'10px 0', background:'linear-gradient(135deg,#ea580c,#f97316)', border:'none', borderRadius:'12px', color:'white', fontSize:'12px', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(249,115,22,0.35)', letterSpacing:'0.02em', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}
                                        >
                                            <Eye size={14} /> Open Street View
                                        </button>
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

                            {/* Caloocan City Hall North Pin */}
                            <MarkerF 
                                position={CALOOCAN_CITY_HALL_NORTH_LOC}
                                zIndex={200}
                                icon={window.google && window.google.maps ? {
                                    path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                                    fillColor: '#f97316',
                                    fillOpacity: 1,
                                    scale: 6,
                                    strokeColor: 'white',
                                    strokeWeight: 2,
                                } : undefined}
                                title="Caloocan City Hall North (HQ)"
                            />

                            {/* Fleet unit markers */}
                            {fleetStatus.map(team => (
                                <MarkerF
                                    key={team.id}
                                    position={{ lat: team.lat, lng: team.lng }}
                                    icon={window.google && window.google.maps ? {
                                        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                        scale: 5,
                                        fillColor: team.status === 'Available' ? '#22c55e' : (team.status === 'En Route' ? '#f97316' : '#f97316'),
                                        fillOpacity: 1,
                                        strokeWeight: 2,
                                        strokeColor: 'white',
                                        rotation: 0
                                    } : undefined}
                                    title={`${team.name} (${team.status})`}
                                />
                            ))}

                            {/* Route to Selected Hazard - NAVIGATION VISUALS (On Main Map) */}
                            {directionsResponse && directionsResponse.routes && directionsResponse.routes[0] && (
                                <>
                                    {/* Path Casing (Border) */}
                                    <PolylineF
                                        path={directionsResponse.routes[0].overview_path}
                                        options={{
                                            strokeColor: '#ffffff',
                                            strokeOpacity: 1,
                                            strokeWeight: 10,
                                            zIndex: 499,
                                            clickable: false
                                        }}
                                    />
                                    {/* Main Path (Safety Orange) */}
                                    <PolylineF
                                        path={directionsResponse.routes[0].overview_path}
                                        options={{
                                            strokeColor: '#f97316', 
                                            strokeOpacity: 1,
                                            strokeWeight: 6,
                                            zIndex: 500,
                                            clickable: false
                                        }}
                                    />
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
                                        <div className="flex items-start gap-3">
                                            <ShieldAlert className="text-orange-500 shrink-0" size={20}/>
                                            <div className="w-full">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Human-in-the-Loop Required</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">AI Vision confidence for <strong>RPT-[{selectedReport.id}]</strong> is {selectedReport.aiConfidence}%. Manual categorization required before generating Work Order.</p>
                                                
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
                                                            className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur text-white p-2 rounded-lg text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
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

                                                {/* Route Info in Sidebar */}
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
                                                    <button className="text-blue-400 hover:text-blue-300 font-bold">Assign</button>
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
                                        <div className="w-10 h-10 rounded-xl bg-blue-100/50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">Generate Work Order</h2>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">For Ticket RPT-[{selectedReport.id}]</p>
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
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
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
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
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
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Dispatcher Notes / Action Plan</label>
                                        <textarea 
                                            rows="3"
                                            placeholder="Provide specific instructions to the field team..."
                                            value={dispatchForm.description}
                                            onChange={(e) => setDispatchForm({...dispatchForm, description: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors custom-scrollbar"
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
                                            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
                                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-4">
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
                                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
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
                                                                    styles: [
                                                                        { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
                                                                        { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
                                                                        { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
                                                                        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
                                                                        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1626' }] },
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
                                                                    <span className="text-[9px] font-mono text-slate-600 group-hover:text-orange-400 transition-colors shrink-0">RPT-{r.id}</span>
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
