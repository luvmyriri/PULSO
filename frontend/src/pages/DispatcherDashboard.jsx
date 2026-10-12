import { createDensityLayer } from '../components/maps/ReportDensityLayer';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    AlertTriangle, 
    Search, 
    CheckCircle, 
    Clock, 
    ChevronRight,
    ChevronLeft, 
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
    Image as ImageIcon,
    Building2,
    HelpCircle,
    Info,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Sparkles,
    FileText,
    ArrowUpRight,
    Wrench,
    ShieldCheck,
    Users,
    Compass,
    RotateCcw
} from 'lucide-react';
import { GoogleMap, MarkerF, InfoWindowF, CircleF, PolygonF, DirectionsRenderer, PolylineF, OverlayViewF } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import GovSidebar from '../components/GovSidebar';
import OrangeSelect from '../components/OrangeSelect';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import Swal from 'sweetalert2';
import { CANONICAL_STATUS_LIST, getStatusDescriptor, formatTicketId } from '../utils/reportWorkflow';
import { getAuthToken, getAuthUser, clearAuthSession } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiBase';
import { GOOGLE_MAPS_LIBRARIES } from '../utils/mapsConfig';
import {
    CALOOCAN_NORTH_BARANGAYS_DETAILED,
    CALOOCAN_SOUTH_BARANGAYS_DETAILED,
    CALOOCAN_ALL_BARANGAYS_OPTIONS
} from '../utils/philippineAddress';

import {
    NORTH_CALOOCAN_PATH,
    SOUTH_CALOOCAN_PATH,
    NORTH_CALOOCAN_CENTROID,
    SOUTH_CALOOCAN_CENTROID,
    COMBINED_CALOOCAN_BOUNDS,
    getCaloocanDistrict,
    isInsideCaloocan
} from '../data/caloocanBoundaries';
import caloocanBorderData from '../data/caloocan_border.json';

const CALOOCAN_CENTER = COMBINED_CALOOCAN_BOUNDS.center;
const CALOOCAN_CITY_HALL_NORTH_LOC = { lat: 14.7505408, lng: 121.0540317 }; // Zapote Rd North HQ
const CALOOCAN_CITY_HALL_SOUTH_LOC = { lat: 14.6469, lng: 120.9844 }; // 8th Ave South City Hall
const MONUMENTO_CIRCLE_LOC = { lat: 14.6574, lng: 120.9840 }; // Bonifacio Monument Circle
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };


const INFRASTRUCTURE_CATEGORIES = [
    'All Categories',
    'Water Supply & Distribution',
    'Power & Street Lighting',
    'Roads & Bridges',
    'Traffic & Road Signs',
    'Public Safety & Hazards',
    'Public Buildings & Facilities',
    'Others'
];

const STATUS_OPTIONS = [
    'All Statuses',
    'Pending Review',
    'Verified',
    'Assigned',
    'In Progress',
    'Resolved',
    'Rejected'
];

export const CALOOCAN_AREA_OPTIONS = [
    { value: 'all', label: 'All Caloocan (North & South)', description: 'All 188 Barangays across both sectors' },
    { value: 'north', label: 'North Caloocan (District 3)', description: 'Brgy. 165–188 · Bagumbong, Camarin, Tala, Bagong Silang' },
    { value: 'south', label: 'South Caloocan (Districts 1 & 2)', description: 'Brgy. 1–164 · Monumento, Grace Park, Bagong Barrio, Maypajo' }
];

/**
 * Authoritative Caloocan Area & District classifier.
 * Strictly divides Caloocan into:
 *   - North Caloocan (District 3): Barangays 165–188
 *   - South Caloocan (Districts 1 & 2): Barangays 1–164
 *
 * Evaluation hierarchy:
 * 1. Primary Authority: Barangay number (never overridden by coordinates)
 * 2. Distinct landmark / area keywords
 * 3. Coordinate boundary fallback (~14.69 latitude)
 */
export const classifyReportArea = (report) => {
    if (!report) return { area: 'unknown', district: null, brgyNum: null };

    const brgyRaw = (report.barangay || report.location_barangay || '').toString();
    const locStr = (report.location_string || report.address || '').toString().toLowerCase();

    // 1. Primary Authority: Barangay number
    let brgyNum = null;
    const brgyMatch = brgyRaw.match(/(?:barangay|brgy\.?|bgy\.?)?\s*(\d{1,3})/i);
    if (brgyMatch && brgyMatch[1]) {
        const num = parseInt(brgyMatch[1], 10);
        if (num >= 1 && num <= 188) {
            brgyNum = num;
        }
    }

    if (brgyNum === null) {
        const locMatch = locStr.match(/(?:barangay|brgy\.?|bgy\.?)\s*(\d{1,3})/i);
        if (locMatch && locMatch[1]) {
            const num = parseInt(locMatch[1], 10);
            if (num >= 1 && num <= 188) {
                brgyNum = num;
            }
        }
    }

    if (brgyNum !== null) {
        if (brgyNum >= 165 && brgyNum <= 188) {
            return { area: 'north', district: 3, brgyNum };
        } else if (brgyNum >= 1 && brgyNum <= 164) {
            return { area: 'south', district: '1-2', brgyNum };
        }
    }

    // 2. Named-Location Fallback
    const combinedText = `${brgyRaw} ${locStr}`.toLowerCase();

    const northKeywords = [
        'north caloocan', 'bagong silang', 'bagumbong', 'camarin', 'tala', 
        'deparo', 'kaybiga', 'llano', 'bagbaguin', 'amparo', 'malaria', 
        'pangarap', 'urduja', 'vicas', 'congressional', 'kiko'
    ];
    const southKeywords = [
        'south caloocan', 'monumento', 'grace park', 'bagong barrio', 
        'maypajo', 'sangandaan', 'kaunlaran', 'c-3', 'c3', 'balintawak', 
        'poblacion', 'morning breeze', '10th ave', '5th ave', 'samson rd', 
        'rizal ave', 'a. mabini', 'dagat-dagatan', 'heroes del 96'
    ];

    const hasNorthKw = northKeywords.some(kw => combinedText.includes(kw));
    const hasSouthKw = southKeywords.some(kw => combinedText.includes(kw));

    if (hasNorthKw && !hasSouthKw) {
        return { area: 'north', district: 3, brgyNum: null };
    }
    if (hasSouthKw && !hasNorthKw) {
        return { area: 'south', district: '1-2', brgyNum: null };
    }

    // 3. Coordinate Fallback (only when no barangay or keyword matched)
    const lat = typeof report.lat === 'number' ? report.lat : (typeof report.latitude === 'number' ? report.latitude : 0);
    if (lat > 0) {
        if (lat >= 14.69) {
            return { area: 'north', district: 3, brgyNum: null };
        } else {
            return { area: 'south', district: '1-2', brgyNum: null };
        }
    }

    return { area: 'unknown', district: null, brgyNum: null };
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAIN LANGUAGE CIVIC TRIAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a human-readable, plain-language title for any report.
 * Promotes real problem descriptions/summaries over technical tracking codes.
 */
export const getReportPlainTitle = (report) => {
    if (!report) return 'Citizen Report';
    if (report.title && report.title.trim()) return report.title.trim();
    if (report.ai_summary && report.ai_summary.trim()) {
        const clean = report.ai_summary.replace(/^["']|["']$/g, '').trim();
        if (clean.length > 0 && clean.length <= 65) return clean;
        if (clean.length > 65) return clean.substring(0, 62) + '...';
    }
    if (report.description && report.description.trim()) {
        const desc = report.description.trim();
        return desc.length <= 55 ? desc : desc.substring(0, 52) + '...';
    }
    if (report.category) return report.category;
    if (report.ai_category) return report.ai_category;
    return 'Infrastructure Issue';
};

/**
 * Maps raw AI confidence scores to plain-language guidance qualifiers.
 */
export const getAiConfidenceDetails = (confidence) => {
    const conf = Number(confidence) || 70;
    if (conf >= 80) {
        return {
            level: 'High',
            badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            dotColor: 'bg-emerald-500',
            qualifier: 'High confidence — AI detection matches verified infrastructure patterns.',
            shortNote: 'High confidence'
        };
    } else if (conf >= 60) {
        return {
            level: 'Medium',
            badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
            dotColor: 'bg-orange-500',
            qualifier: 'Medium confidence — please verify the attached photo before dispatching.',
            shortNote: 'Medium confidence'
        };
    } else {
        return {
            level: 'Low',
            badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
            dotColor: 'bg-rose-500',
            qualifier: 'Low confidence — manual staff review strongly advised.',
            shortNote: 'Low confidence'
        };
    }
};


/**
 * Returns plain-language urgency descriptor with icon, text label, and meaning.
 */
export const getUrgencyDescriptor = (urgency) => {
    const u = (urgency || '').toLowerCase();
    if (u === 'critical' || u === 'high') {
        return {
            label: 'High Priority',
            badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
            dotClass: 'bg-red-500',
            plainMeaning: 'Immediate hazard (e.g. live wire, major flooding, deep road crater)'
        };
    }
    if (u === 'medium') {
        return {
            label: 'Medium Priority',
            badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
            dotClass: 'bg-orange-500',
            plainMeaning: 'Standard repair (affects neighborhood services)'
        };
    }
    return {
        label: 'Low Priority',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-500',
        plainMeaning: 'Routine maintenance (minor aesthetic or non-blocking)'
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM CIVIC-FOCUSED MAP STYLES (Zero POI clutter, Progressive Disclosure)
// ─────────────────────────────────────────────────────────────────────────────

// Shared core rules across dark theme zoom tiers
const DARK_BASE_RULES = [
    // 1. Completely suppress all commercial & tourist POIs (malls, hotels, attractions, etc.)
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    
    // 2. Flat low-contrast landmass matching PULSO dark palette (#0c1322 / #090e1a)
    { elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0b111e" }] },
    
    // 3. Flat low-contrast water without decorative texture
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#070b14" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    
    // 4. Administrative boundaries (subtle orientation lines)
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }, { weight: 1 }] },
    { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
    { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#243247" }] },
];

// Tier 1: City-Wide View (Zoom < 13)
// Show only boundary polygons, district labels, and report markers — no road labels, minimal locality
const DARK_MAP_STYLE_CITY = [
    ...DARK_BASE_RULES,
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#162030" }, { weight: 0.8 }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#223147" }, { weight: 1.2 }] },
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "administrative.locality", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "administrative.neighborhood", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] }
];

// Tier 2: District-Level View (13 <= Zoom < 16)
// Introduce major road names (highway / arterial) and unclustered report markers
const DARK_MAP_STYLE_DISTRICT = [
    ...DARK_BASE_RULES,
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#293952" }, { weight: 1.5 }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#8193aa" }] },
    { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#1c283a" }, { weight: 1.2 }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "road.arterial", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#141d2c" }, { weight: 0.8 }] },
    { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#7b8ea5" }] },
    { featureType: "administrative.locality", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#546478" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 2 }] }
];

// Tier 3: Street-Level View (Zoom >= 16)
// Precision mode: street names, local roads, and addresses for verifying reports
const DARK_MAP_STYLE_STREET = [
    ...DARK_BASE_RULES,
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334562" }, { weight: 2 }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#25344c" }, { weight: 1.5 }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#8193aa" }] },
    { featureType: "road.arterial", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#1c2738" }, { weight: 1.2 }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#6b7c93" }] },
    { featureType: "road.local", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "administrative.locality", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#6b7c93" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 2 }] }
];

// Light Theme Variants
const LIGHT_BASE_RULES = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] },
];

const LIGHT_MAP_STYLE_CITY = [
    ...LIGHT_BASE_RULES,
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "administrative.locality", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
    { featureType: "administrative.neighborhood", elementType: "labels", stylers: [{ visibility: "off" }] }
];

const LIGHT_MAP_STYLE_DISTRICT = [
    ...LIGHT_BASE_RULES,
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] }
];

const LIGHT_MAP_STYLE_STREET = [
    ...LIGHT_BASE_RULES,
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#94a3b8" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#1e293b" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#1e293b" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] }
];

const DispatcherDashboard = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const queryReportId = searchParams.get('reportId');

    const [token, setToken] = useState(() => getAuthToken());
    const [currentUser, setCurrentUser] = useState(() => getAuthUser());

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
    const [dashboardMode, setDashboardMode] = useState('triage'); // 'triage', 'active'
    const [showHeatmap, setShowHeatmap] = useState(false);
    
    const [selectedReport, setSelectedReport] = useState(null);
    const approvalRetryRef = useRef(null);
    const dispatchRetryRef = useRef(null);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

    // Tactical Deep-Link state: set when navigated from Analytics Command Center
    const [tacticalContext, setTacticalContext] = useState(null); // { center, zoom, category, barangay }
    const pendingTacticalRef = useRef(null); // stores state before map is ready

    const [allReports, setAllReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [map, setMap] = useState(null);
    const [panorama, setPanorama] = useState(null);

    const [zoomedImage, setZoomedImage] = useState(null);
    const pinIconCache = useRef(new Map());
    const iconCacheRef = useRef(new Map());
    const [photoPinIcons, setPhotoPinIcons] = useState({});
    const [borderData, setBorderData] = useState(caloocanBorderData);

    // Fetch live authoritative Caloocan barangay borders, fallback to bundled GeoJSON
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/geo/caloocan-border`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.features?.length > 0) {
                    setBorderData(data);
                }
            })
            .catch(err => console.debug('Caloocan border fetch fallback to bundled:', err));
    }, []);

    // Deep-link auto-selection listener from Citizen Reports (?reportId=...)
    useEffect(() => {
        if (!queryReportId || allReports.length === 0) return;
        const target = allReports.find(r => r.id?.toString() === queryReportId || r.ticket_id === queryReportId);
        if (target) {
            setSelectedReport(target);
            setSelectedMarker(target);
            setIsRightSidebarOpen(true);
            if (map && target.location_lat && target.location_lng) {
                map.panTo({ lat: Number(target.location_lat), lng: Number(target.location_lng) });
                map.setZoom(16);
            }
        }
    }, [queryReportId, allReports, map]);

    // Memoized Google Maps Icon Object Cache to prevent MarkerF re-render flicker
    const getCachedIcon = (url, w, h, ax, ay) => {
        if (!window.google || !window.google.maps || !url) return undefined;
        const key = `${url}_${w}_${h}_${ax}_${ay}`;
        if (!iconCacheRef.current.has(key)) {
            iconCacheRef.current.set(key, {
                url: url,
                scaledSize: new window.google.maps.Size(w, h),
                anchor: new window.google.maps.Point(ax, ay)
            });
        }
        return iconCacheRef.current.get(key);
    };

    const [currentZoom, setCurrentZoom] = useState(12);
    const [currentBounds, setCurrentBounds] = useState(null);

    // Dynamic PULSO Cluster Badge SVG Generator
    const getClusterBadgeSVG = (count, statusColor = '#ff6b00') => {
        const size = count > 99 ? 44 : (count > 9 ? 38 : 34);
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#0c1424" stroke="${statusColor}" stroke-width="2.5" />
                <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 5}" fill="${statusColor}" fill-opacity="0.25" />
                <text x="${size/2}" y="${size/2 + 4.5}" text-anchor="middle" font-family="monospace, sans-serif" font-size="${count > 99 ? 11 : 13}px" font-weight="800" fill="#ffffff">
                    ${count}
                </text>
            </svg>
        `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
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
    const [selectedArea, setSelectedArea] = useState('all');
    const [selectedBarangay, setSelectedBarangay] = useState('All Barangays');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [selectedStatus, setSelectedStatus] = useState('All Statuses');
    const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: string }
    const [showLegend, setShowLegend] = useState(false); // Collapsible status/priority legend
    const [showAiHelp, setShowAiHelp] = useState(false); // Expandable Gemini AI helper in triage queue

    const handleClearAllFilters = () => {
        setSearchQuery('');
        setSelectedArea('all');
        setSelectedBarangay('All Barangays');
        setSelectedCategory('All Categories');
        setSelectedStatus('All Statuses');
    };

    const isFiltersActive = searchQuery.trim() !== '' || 
        selectedArea !== 'all' ||
        selectedBarangay !== 'All Barangays' || 
        selectedCategory !== 'All Categories' || 
        selectedStatus !== 'All Statuses';

    const handleAreaChange = (area) => {
        setSelectedArea(area);
        setSelectedBarangay('All Barangays');
        if (map) {
            if (area === 'north') {
                map.panTo(CALOOCAN_CITY_HALL_NORTH_LOC);
                map.setZoom(13);
            } else if (area === 'south') {
                map.panTo(CALOOCAN_CITY_HALL_SOUTH_LOC);
                map.setZoom(13);
            } else {
                map.panTo(CALOOCAN_CENTER);
                map.setZoom(12);
            }
        }
    };

    const barangaySelectOptions = React.useMemo(() => {
        if (selectedArea === 'north') {
            return [
                { value: 'All Barangays', label: 'All North Barangays (Brgy. 165–188)' },
                ...CALOOCAN_NORTH_BARANGAYS_DETAILED
            ];
        }
        if (selectedArea === 'south') {
            return [
                { value: 'All Barangays', label: 'All South Barangays (Brgy. 1–164)' },
                ...CALOOCAN_SOUTH_BARANGAYS_DETAILED
            ];
        }
        return CALOOCAN_ALL_BARANGAYS_OPTIONS;
    }, [selectedArea]);

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
                                `${i + 1}. ${formatTicketId(r.ticket_id, r.id)} — ${r.ai_category || r.category || 'Uncategorized'} — ${r.location_string || `Lat:${r.location_lat?.toFixed(4)}, Lng:${r.location_lng?.toFixed(4)}`} — Status: ${r.status}`
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
        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return true;
        const district = getCaloocanDistrict(location.lat, location.lng);
        const isIn = district !== null;
        
        if (!isIn && !isJurisdictionModalOpen) {
            setJurisdictionErrorMsg(t('This location is outside Caloocan City jurisdiction. Visual verification tools and Street View are restricted to authorized areas.'));
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
        assigned_to_id: '',
        priority: 'normal',
        title: '',
        description: ''
    });
    const [eligibleAssignees, setEligibleAssignees] = useState([]);
    const [assigneeError, setAssigneeError] = useState('');
    useEffect(() => {
        if (!isDispatchModalOpen) return;
        const controller = new AbortController();
        setEligibleAssignees([]);
        setAssigneeError('');
        fetch(`${API_BASE_URL}/api/gov/dispatch/eligible-assignees`, {
            headers: { Authorization: `Bearer ${getAuthToken()}` }, signal: controller.signal,
        }).then(async (response) => {
            if (!response.ok) throw new Error(`Eligible staff unavailable (HTTP ${response.status})`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Eligible staff response is invalid');
            setEligibleAssignees(data);
        }).catch((cause) => { if (cause.name !== 'AbortError') setAssigneeError(cause.message); });
        return () => controller.abort();
    }, [isDispatchModalOpen]);

    const isDarkMode = theme === 'system' 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches 
        : theme === 'dark';

    const zoomTier = currentZoom < 13 ? 'city' : currentZoom < 16 ? 'district' : 'street';

    const currentMapStyles = React.useMemo(() => {
        if (isDarkMode) {
            if (zoomTier === 'city') return DARK_MAP_STYLE_CITY;
            if (zoomTier === 'district') return DARK_MAP_STYLE_DISTRICT;
            return DARK_MAP_STYLE_STREET;
        } else {
            if (zoomTier === 'city') return LIGHT_MAP_STYLE_CITY;
            if (zoomTier === 'district') return LIGHT_MAP_STYLE_DISTRICT;
            return LIGHT_MAP_STYLE_STREET;
        }
    }, [isDarkMode, zoomTier]);

    const mapOptions = React.useMemo(() => ({
        styles: currentMapStyles,
        disableDefaultUI: true,
        zoomControl: true,
        // streetViewControl is intentionally disabled — we use our own custom toggle button
        streetViewControl: false,
    }), [currentMapStyles]);

    const { isLoaded } = useGoogleMaps();

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
            const ticketId = report ? formatTicketId(report.ticket_id, reportId) : `Report #${reportId}`;
            
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

    const handleVerifyReport  = (id) => handleStatusAction(id, '/status', 'Report moved to verified queue.', null, 'pending_approval');
    const handleApproveReport = async (id) => {
        const { value: reason } = await Swal.fire({
            title: 'Approve for field work',
            input: 'textarea',
            inputLabel: 'Decision reason',
            inputPlaceholder: 'Record why this report is ready for field work',
            inputValidator: (value) => value?.trim().length >= 10 ? undefined : 'Enter at least 10 characters.',
            showCancelButton: true,
            confirmButtonText: 'Approve for work',
        });
        if (!reason) return;
        setActionLoading(id);
        try {
            const trimmedReason = reason.trim();
            const report = allReports.find((item) => item.id === id) || selectedReport;
            if (!approvalRetryRef.current || approvalRetryRef.current.id !== id || approvalRetryRef.current.reason !== trimmedReason) {
                approvalRetryRef.current = { id, reason: trimmedReason, key: crypto.randomUUID() };
            }
            const response = await fetch(`${API_BASE_URL}/api/gov/reports/${id}/approve-for-work`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
                    'Idempotency-Key': approvalRetryRef.current.key,
                    ...(report?.version ? { 'If-Match': String(report.version) } : {}),
                },
                body: JSON.stringify({ reason: trimmedReason }),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                if (response.status === 409) approvalRetryRef.current = null;
                throw new Error(body.detail?.next_action || (typeof body.detail === 'string' ? body.detail : `Approval failed (HTTP ${response.status})`));
            }
            approvalRetryRef.current = null;
            await Swal.fire({ icon: 'success', title: 'Approved for field work', text: 'The report can now be assigned to an eligible field official.' });
            fetchReports();
            setSelectedReport(null);
        } catch (cause) {
            Swal.fire({ icon: 'error', title: 'Approval failed', text: cause.message || 'Unable to approve this report.' });
        } finally {
            setActionLoading(null);
        }
    };
    const handleRejectReport = async (id) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject report',
            input: 'textarea',
            inputLabel: 'Decision reason',
            inputPlaceholder: 'Explain why this report cannot proceed',
            inputValidator: (value) => value?.trim().length >= 10 ? undefined : 'Enter at least 10 characters.',
            showCancelButton: true,
            confirmButtonText: 'Record rejection',
        });
        if (!reason) return;
        setActionLoading(id);
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/${id}/reject`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason: reason.trim() }),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.detail || `Rejection failed (HTTP ${response.status})`);
            }
            await Swal.fire({ icon: 'success', title: 'Rejection recorded', text: 'The decision reason was saved with the report history.' });
            fetchReports();
            setSelectedReport(null);
        } catch (cause) {
            Swal.fire({ icon: 'error', title: 'Rejection failed', text: cause.message || 'Unable to reject this report.' });
        } finally {
            setActionLoading(null);
        }
    };
    const handleResolveReport = () => navigate('/gov/work-orders');

    // Replaces the generic handleStatusAction('/dispatch') with actual Work Order creation
    const handleCreateWorkOrder = async (e) => {
        e.preventDefault();
        if (!dispatchForm.assigned_to_id || !dispatchForm.description.trim()) {
            Swal.fire({ icon: 'error', title: 'Assignment incomplete', text: 'Choose an eligible official and enter field instructions.' });
            return;
        }
        setActionLoading(selectedReport.id);
        
        try {
            const payload = {
                title: dispatchForm.title || `Fix ${selectedReport.ai_category || selectedReport.category}`,
                description: dispatchForm.description || selectedReport.ai_summary || "Please address the reported issue.",
                wo_type: "standard",
                priority: dispatchForm.priority,
                assigned_to_id: parseInt(dispatchForm.assigned_to_id, 10),
                report_id: selectedReport.id
            };
            const fingerprint = JSON.stringify(payload);
            if (!dispatchRetryRef.current || dispatchRetryRef.current.fingerprint !== fingerprint) {
                dispatchRetryRef.current = { fingerprint, key: crypto.randomUUID() };
            }

            const response = await fetch(`${API_BASE_URL}/api/gov/work-orders`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Idempotency-Key': dispatchRetryRef.current.key,
                    ...(selectedReport.version ? { 'If-Match': String(selectedReport.version) } : {}),
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const newWo = await response.json();
                dispatchRetryRef.current = null;
                setIsDispatchModalOpen(false);
                fetchReports();
                setSelectedReport(null);
                Swal.fire({
                    icon: 'success',
                    title: 'Work Order Dispatched!',
                    text: `Work order ${newWo.wo_number || ''} was assigned to the selected field official.`,
                    timer: 3500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                });
            } else {
                const err = await response.json();
                if (response.status === 409) dispatchRetryRef.current = null;
                console.error("Failed to create Work Order:", err);
                Swal.fire({
                    icon: 'error',
                    title: 'Dispatch Failed',
                    text: err.detail?.next_action || (typeof err.detail === 'string' ? err.detail : 'Could not create work order on the server.'),
                    confirmButtonColor: '#ff6b00'
                });
            }
        } catch (error) {
            console.error("Error creating Work Order:", error);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Backend server is unreachable.',
                confirmButtonColor: '#ff6b00'
            });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredReports = React.useMemo(() => {
        return allReports.filter(report => {
            // 1. Dashboard Mode & Granular Status Filter
            if (selectedStatus !== 'All Statuses') {
                const statusMap = {
                    'Pending Review': ['pending', 'unverified'],
                    'Pending': ['pending', 'unverified'],
                    'Verified': ['verified', 'pending_approval'],
                    'Awaiting Approval': ['pending_approval'],
                    'Pending Approval (Phase 2)': ['pending_approval'],
                    'Assigned': ['assigned', 'approved_internal'],
                    'Approved for Work Order': ['approved_internal'],
                    'Approved (Phase 3)': ['approved_internal'],
                    'In Progress': ['in_progress', 'dispatched'],
                    'Dispatched (In Progress)': ['dispatched', 'in_progress'],
                    'Dispatched (Phase 4)': ['dispatched'],
                    'Resolved': ['resolved'],
                    'Resolved (Fixed)': ['resolved'],
                    'Resolved (Phase 5)': ['resolved'],
                    'Rejected': ['rejected', 'cancelled'],
                    'Rejected (Spam / Invalid)': ['rejected'],
                    'Cancelled': ['cancelled']
                };
                const targetStatuses = statusMap[selectedStatus] || [selectedStatus.toLowerCase()];
                if (!targetStatuses.includes(report.status)) return false;
            }
            // By intentionally omitting the 'else' block, selecting 'All Statuses' overrides the 
            // restrictive Triage/Active mode toggles and strictly displays 100% of the dataset.

            // 2. Comprehensive Search Query Filter (Report ID, Plain Title, Description, AI Summary, Category, Location)
            const searchLower = searchQuery.toLowerCase().trim();
            if (searchLower) {
                const formattedTicket = formatTicketId(report.ticket_id, report.id).toLowerCase();
                const ticketIdText = (report.ticket_id || '').toLowerCase();
                const plainTitle = getReportPlainTitle(report).toLowerCase();
                const titleText = (report.title || '').toLowerCase();
                const descText = (report.description || '').toLowerCase();
                const aiSummaryText = (report.ai_summary || '').toLowerCase();
                const categoryText = (report.category || report.ai_category || '').toLowerCase();
                const locationText = (report.location_string || '').toLowerCase();
                const barangayText = (report.barangay || '').toString().toLowerCase();

                const matchesSearch = 
                    report.id.toString().includes(searchLower) || 
                    formattedTicket.includes(searchLower) ||
                    ticketIdText.includes(searchLower) ||
                    plainTitle.includes(searchLower) ||
                    titleText.includes(searchLower) ||
                    descText.includes(searchLower) ||
                    aiSummaryText.includes(searchLower) ||
                    categoryText.includes(searchLower) ||
                    locationText.includes(searchLower) ||
                    barangayText.includes(searchLower);
                
                if (!matchesSearch) return false;
            }

            // 3a. District / Sector Filter (North vs South Caloocan)
            if (selectedArea === 'north') {
                const cl = classifyReportArea(report);
                if (cl.area !== 'north') return false;
            } else if (selectedArea === 'south') {
                const cl = classifyReportArea(report);
                if (cl.area !== 'south') return false;
            }

            // 3b. Barangay Filter (Robust Match)
            if (selectedBarangay !== 'All Barangays' && selectedBarangay !== 'All North Barangays (Brgy. 165–188)' && selectedBarangay !== 'All South Barangays (Brgy. 1–164)') {
                const selectedDigits = selectedBarangay.replace(/\D/g, '');
                const reportBarangayRaw = (report.barangay || report.location_barangay || '').toString();
                const reportBarangayDigits = reportBarangayRaw.replace(/\D/g, '');
                const locationString = (report.location_string || report.address || '').toLowerCase();
                
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
                    'Water Supply & Distribution': ['water', 'drain', 'flood', 'leak', 'pipe', 'sewage', 'canal', 'clog', 'supply', 'distribution'],
                    'Water & Drainage': ['water', 'drain', 'flood', 'leak', 'pipe', 'sewage', 'canal', 'clog'],
                    'Power & Street Lighting': ['light', 'lamp', 'electric', 'power', 'post', 'wire', 'dark', 'bulb'],
                    'Street Lighting': ['light', 'lamp', 'electric', 'power', 'post', 'wire', 'dark', 'bulb'],
                    'Roads & Bridges': ['road', 'bridge', 'pothole', 'pavement', 'asphalt', 'infrastructure', 'sidewalk'],
                    'Traffic & Road Signs': ['traffic', 'sign', 'signal', 'lane', 'bollard', 'railing', 'marking', 'post'],
                    'Public Safety & Hazards': ['safety', 'hazard', 'regulatory', 'security', 'emergency', 'danger', 'risk', 'collapsed', 'obstacle', 'tree', 'debris'],
                    'Public Safety & Regulatory': ['safety', 'hazard', 'regulatory', 'security', 'emergency', 'danger', 'risk', 'collapsed', 'obstacle'],
                    'Public Buildings & Facilities': ['facility', 'building', 'park', 'playground', 'library', 'school', 'office', 'center', 'court'],
                    'Public Facilities': ['facility', 'building', 'park', 'playground', 'library', 'school', 'office', 'center'],
                    'Others': ['other', 'others', 'uncategorized', 'misc']
                };

                const keywords = CATEGORY_KEYWORDS[selectedCategory] || [];
                const matchesKeyword = keywords.some(key => reportCat.includes(key));
                const matchesDirect = reportCat.includes(selectedCategory.toLowerCase().split(' & ')[0]); // e.g. "roads" matches "Roads & Bridges"

                if (!matchesKeyword && !matchesDirect) return false;
            }
            
            return true;
        });
    }, [allReports, dashboardMode, searchQuery, selectedArea, selectedBarangay, selectedCategory, selectedStatus]);

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

    // Generate high-performance Canvas Image Pins for Native Google Maps MarkerF
    // (Size-optimized 80x80 thumbnails, Viewport-aware lazy loading, Zero glitching, 60fps)
    useEffect(() => {
        if (!filteredReports || filteredReports.length === 0) return;

        let isMounted = true;
        let batchTimer = null;
        const pendingBatch = {};

        const flushBatch = () => {
            if (!isMounted || Object.keys(pendingBatch).length === 0) return;
            setPhotoPinIcons(prev => ({ ...prev, ...pendingBatch }));
        };

        // Lazy-load: prioritize reports currently in visible bounds
        const reportsToLoad = currentBounds
            ? filteredReports.filter(r => r.location_lat && r.location_lng && currentBounds.contains({ lat: r.location_lat, lng: r.location_lng }))
            : filteredReports.slice(0, 50);

        reportsToLoad.forEach(report => {
            const rawImg = report.image_url || report.photo_url || report.image;
            if (!rawImg) return;

            [false, true].forEach(isSelected => {
                const cacheKey = `${report.id}-${isSelected ? 'sel' : 'norm'}`;
                if (pinIconCache.current.has(cacheKey)) return;

                let thumbUrl = rawImg;
                if (!rawImg.startsWith('http') && !rawImg.startsWith('data:')) {
                    const cleanPath = rawImg.startsWith('/') ? rawImg : `/${rawImg}`;
                    // Use backend 80x80 optimized thumbnail endpoint for 10x faster load and low memory
                    thumbUrl = `${API_BASE_URL}/api/thumbnails?src=${encodeURIComponent(cleanPath)}&size=80`;
                }

                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const size = isSelected ? 46 : 36;
                        const pointerH = isSelected ? 8 : 7;
                        const totalW = size + 6;
                        const totalH = size + pointerH + 2;

                        const canvas = document.createElement('canvas');
                        canvas.width = totalW;
                        canvas.height = totalH;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;

                        const cx = totalW / 2;
                        const cy = size / 2 + 1;
                        const radius = (size - 4) / 2;

                        let borderColor = '#ff6b00';
                        if (report.status === 'resolved') borderColor = '#22c55e';
                        else if (report.status === 'pending' || report.status === 'unverified') {
                            borderColor = report.ai_urgency === 'CRITICAL' ? '#ef4444' : '#ff6b00';
                        } else if (report.status === 'rejected') {
                            borderColor = '#64748b';
                        } else if (report.status === 'cancelled') {
                            borderColor = '#0f172a';
                        }

                        // Pointer Arrow
                        ctx.beginPath();
                        ctx.moveTo(cx - 5, cy + radius - 2);
                        ctx.lineTo(cx + 5, cy + radius - 2);
                        ctx.lineTo(cx, cy + radius + pointerH);
                        ctx.closePath();
                        ctx.fillStyle = borderColor;
                        ctx.fill();

                        // Outer Glow if Selected
                        if (isSelected) {
                            ctx.beginPath();
                            ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
                            ctx.fillStyle = 'rgba(255, 107, 0, 0.35)';
                            ctx.fill();
                        }

                        // Outer Border Ring (2px thin border per spec)
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
                        ctx.fillStyle = borderColor;
                        ctx.fill();

                        // Inner background
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                        ctx.fillStyle = '#0c1424';
                        ctx.fill();

                        // Circular photo clip
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius - 0.5, 0, Math.PI * 2);
                        ctx.clip();

                        const aspect = img.width / img.height;
                        let dw, dh, dx, dy;
                        if (aspect > 1) {
                            dh = (radius - 0.5) * 2;
                            dw = dh * aspect;
                            dx = cx - dw / 2;
                            dy = cy - radius + 0.5;
                        } else {
                            dw = (radius - 0.5) * 2;
                            dh = dw / aspect;
                            dx = cx - radius + 0.5;
                            dy = cy - dh / 2;
                        }
                        ctx.drawImage(img, dx, dy, dw, dh);
                        ctx.restore();

                        // White inner accent ring
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius - 0.5, 0, Math.PI * 2);
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.0;
                        ctx.stroke();

                        const dataUrl = canvas.toDataURL('image/png');
                        pinIconCache.current.set(cacheKey, dataUrl);
                        pendingBatch[cacheKey] = dataUrl;

                        if (batchTimer) clearTimeout(batchTimer);
                        batchTimer = setTimeout(flushBatch, 100);
                    } catch (err) {
                        // Canvas tainted or fallback
                    }
                };
                img.onerror = () => {
                    // If thumbnail endpoint had an issue, try fallback to original
                    if (thumbUrl.includes('/api/thumbnails')) {
                        const fallbackImg = new Image();
                        fallbackImg.crossOrigin = 'anonymous';
                        fallbackImg.src = `${API_BASE_URL}${rawImg.startsWith('/') ? rawImg : `/${rawImg}`}`;
                    }
                };
                img.src = thumbUrl;
            });
        });

        return () => {
            isMounted = false;
            if (batchTimer) clearTimeout(batchTimer);
        };
    }, [filteredReports, currentBounds, API_BASE_URL]);

    // Adaptive Clustering Calculation: Clusters nearby reports into count badges at low zoom levels
    const { individualMarkers, clusterMarkers } = React.useMemo(() => {
        if (!filteredReports || filteredReports.length === 0) {
            return { individualMarkers: [], clusterMarkers: [] };
        }

        // Viewport filtering
        const visibleReports = currentBounds
            ? filteredReports.filter(r => r.location_lat && r.location_lng && currentBounds.contains({ lat: r.location_lat, lng: r.location_lng }))
            : filteredReports.filter(r => r.location_lat && r.location_lng);

        // When zoomed in past threshold (zoom >= 14) and under marker cap (<= 80), show all photo markers
        if (currentZoom >= 14 && visibleReports.length <= 80) {
            return { individualMarkers: visibleReports, clusterMarkers: [] };
        }

        // Dynamic grid degree threshold based on zoom level (~45 screen pixels)
        const gridDegree = 45 * 360 / (256 * Math.pow(2, Math.max(1, currentZoom)));
        const grid = new Map();

        visibleReports.forEach(report => {
            const cellX = Math.floor(report.location_lng / gridDegree);
            const cellY = Math.floor(report.location_lat / gridDegree);
            const key = `${cellX}_${cellY}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(report);
        });

        const individualMarkers = [];
        const clusterMarkers = [];

        grid.forEach((cellReports, cellKey) => {
            if (cellReports.length === 1 && currentZoom >= 13) {
                individualMarkers.push(cellReports[0]);
            } else {
                let sumLat = 0, sumLng = 0;
                let hasCritical = false, hasPending = false, hasActive = false;

                cellReports.forEach(r => {
                    sumLat += r.location_lat;
                    sumLng += r.location_lng;
                    if (r.ai_urgency === 'CRITICAL') hasCritical = true;
                    else if (r.status === 'pending' || r.status === 'unverified') hasPending = true;
                    else if (r.status === 'dispatched' || r.status === 'approved_internal') hasActive = true;
                });

                let clusterColor = '#22c55e'; // resolved default
                if (hasActive) clusterColor = '#ff6b00';
                if (hasPending) clusterColor = '#ff6b00';
                if (hasCritical) clusterColor = '#ef4444';

                clusterMarkers.push({
                    id: `cluster-${cellKey}`,
                    count: cellReports.length,
                    lat: sumLat / cellReports.length,
                    lng: sumLng / cellReports.length,
                    statusColor: clusterColor,
                    reports: cellReports
                });
            }
        });

        return { individualMarkers, clusterMarkers };
    }, [filteredReports, currentZoom, currentBounds]);

    // Supported canvas overlay replaces Google's retired visualization layer.
    useEffect(() => {
        if (!map || !showHeatmap || !heatmapData.length) return;
        const layer = createDensityLayer(map, heatmapData, heatmapOptions);
        return () => layer.setMap(null);
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
        if (cat.includes('other')) return 'HelpCircle';
        return 'AlertTriangle';
    };

    const getReportColor = (category) => {
        if (!category) return 'slate';
        const cat = category.toLowerCase();
        if (cat.includes('water') || cat.includes('flood') || cat.includes('drain')) return 'blue';
        if (cat.includes('electric') || cat.includes('wire') || cat.includes('light') || cat.includes('power')) return 'red';
        if (cat.includes('road') || cat.includes('pothole') || cat.includes('bridge') || cat.includes('infrastructure')) return 'orange';
        if (cat.includes('facility') || cat.includes('facilities') || cat.includes('building') || cat.includes('park') || cat.includes('public')) return 'green';
        if (cat.includes('other')) return 'purple';
        return 'slate';
    };

    // Beautiful Dynamic SVG Pin Generator
    const getMarkerSVG = (category, status, isSelected = false) => {
        let color = '#f97316'; // Default Active
        const cat = (category || '').toLowerCase();
        const isPublicFacility = cat.includes('facility') || cat.includes('facilities') || cat.includes('building') || cat.includes('park') || cat.includes('public');
        const isOthers = cat.includes('other');

        if (status === 'resolved') color = '#22c55e';
        else if (status === 'pending' || status === 'unverified') color = '#ef4444';
        else if (status === 'rejected') color = '#64748b';
        else if (status === 'cancelled') color = '#0f172a';
        
        // Overwrite color for Public Facilities or Others if selected or themed
        if (isPublicFacility) {
            color = isSelected ? '#16a34a' : (status === 'resolved' ? '#22c55e' : '#22c55e'); // Using green for all public facilities per request
        } else if (isOthers && status !== 'resolved' && status !== 'rejected') {
            color = isSelected ? '#7c3aed' : '#8b5cf6';
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
        } else if (isOthers) {
            // Help / Question mark icon
            svgIcon = `<circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="white"/>`;
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

    return (
        <div className="min-h-screen bg-neutral-bg dark:bg-[#070a12] text-neutral-text dark:text-slate-100 font-sans flex text-sm overflow-hidden transition-colors duration-150">
            
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
                
                {/* Top Header & Unified Navigation */}
                <header className="min-h-16 h-auto py-2 lg:py-0 lg:h-18 bg-white dark:bg-[#090e1a] flex items-center justify-between px-4 lg:px-6 shrink-0 z-50 relative border-b border-neutral-border dark:border-slate-800 transition-colors duration-150 gap-2 lg:gap-4 overflow-visible">
                    <div className="flex items-center gap-3 lg:gap-5 min-w-0">
                        <div className="min-w-0 flex flex-col text-left">
                            <GovBreadcrumb category="Operations" current="Command Center & GIS Map" />
                            <div className="flex items-center gap-2 mt-0.5">
                                <h1 className="font-heading font-black text-xl sm:text-2xl text-neutral-text dark:text-white tracking-tight leading-none whitespace-nowrap">
                                    LGU Command Center
                                </h1>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden 2xl:block mt-0.5 truncate max-w-md">
                                Spatial Dispatch & Geographic Routing — Coordinate repair fleets and dispatch crews.
                            </p>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block shrink-0"></div>
                        
                        {/* Dashboard Mode Toggle */}
                        <div className="flex bg-neutral-bg dark:bg-slate-950 p-0.5 sm:p-1 rounded-lg border border-neutral-border dark:border-slate-800 shrink-0">
                            <button
                                onClick={() => { setDashboardMode('triage'); setSelectedReport(null); }}
                                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${dashboardMode === 'triage' ? 'bg-white dark:bg-slate-800 text-primary dark:text-white shadow-sm border border-neutral-border/50' : 'text-neutral-muted hover:text-neutral-text dark:hover:text-slate-300'}`}
                                title="Triage Mode — Screen and verify incoming citizen reports"
                            >
                                <AlertTriangle size={14} className={dashboardMode === 'triage' ? 'text-primary' : 'text-neutral-muted'}/>
                                <span>Triage</span>
                            </button>
                            <button
                                onClick={() => { setDashboardMode('active'); setSelectedReport(null); }}
                                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${dashboardMode === 'active' ? 'bg-white dark:bg-slate-800 text-secondary dark:text-white shadow-sm border border-neutral-border/50' : 'text-neutral-muted hover:text-neutral-text dark:hover:text-slate-300'}`}
                                title="Active Operations — Track and coordinate deployed field crews"
                            >
                                <Radio size={14} className={dashboardMode === 'active' ? 'text-secondary' : 'text-neutral-muted'} />
                                <span>Active</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
                        {/* Segmented View Switcher: Map View ↔ Table View */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs border border-slate-200/60 dark:border-slate-600">
                                <MapIcon size={13} />
                                <span className="hidden sm:inline">Map</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const param = selectedReport?.id ? `?reportId=${selectedReport.id}` : '';
                                    navigate(`/gov/reports${param}`);
                                }}
                                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                                title="Switch to Administrative Table & Audit View (Citizen Reports)"
                                aria-label="Switch to Administrative Table & Audit View"
                            >
                                <FileText size={13} />
                                <span className="hidden sm:inline">Table</span>
                            </button>
                        </div>

                        {/* PULSO Omni-Assistant AI Copilot in Header */}
                        <button
                            onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                                isAIChatOpen
                                    ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400'
                                    : 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800'
                            }`}
                            title={isAIChatOpen ? "Close AI Copilot" : "Open PULSO Omni-Assistant (AI Copilot)"}
                            aria-label="Toggle PULSO Omni-Assistant AI Copilot"
                        >
                            <Brain size={14} className={isAIChatOpen ? 'animate-pulse' : ''} />
                            <span className="hidden md:inline">AI Copilot</span>
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </button>

                        <div className="hidden 2xl:flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="font-semibold text-slate-500 dark:text-slate-400"><span className="text-slate-900 dark:text-white">8/12</span> Teams</span>
                        </div>
                        <ThemeToggle />
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
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
                            className="w-72 2xl:w-80 bg-white dark:bg-slate-900 flex flex-col z-30 shrink-0 relative border-r border-neutral-border"
                        >
                            {/* Removed right subtle shadow */}
                            <div className="p-4 relative flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-neutral-text dark:text-white text-lg flex items-center gap-2">
                                        {dashboardMode === 'triage' ? (
                                            <><AlertTriangle size={18} className="text-primary"/> Incoming Reports</>
                                        ) : (
                                            <><Radio size={18} className="text-secondary"/> Dispatched Work</>
                                        )}
                                    </h2>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold font-mono">
                                        {activeReports.length} {activeReports.length === 1 ? 'report' : 'reports'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-slate-400 pointer-events-none" />
                                        <input 
                                            type="text" 
                                            placeholder="Search by issue, location, category, or report ID..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-neutral-bg dark:bg-slate-950 border border-neutral-border dark:border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-neutral-text dark:text-white placeholder-neutral-muted focus:outline-none focus:border-primary transition-colors" 
                                        />
                                        {searchQuery && (
                                            <button 
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                                                aria-label="Clear search query"
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {/* Area / Sector Filter (North vs South Caloocan) */}
                                        <OrangeSelect
                                            value={selectedArea}
                                            onChange={handleAreaChange}
                                            options={CALOOCAN_AREA_OPTIONS}
                                            icon={Compass}
                                            placeholder="All Caloocan"
                                            minWidth="100%"
                                        />

                                        {/* Barangay Filter (Separated into North & South Caloocan) */}
                                        <OrangeSelect
                                            value={selectedBarangay}
                                            onChange={setSelectedBarangay}
                                            options={barangaySelectOptions}
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
                                    
                                    {/* Heatmap & Filter Controls */}
                                    <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Flame size={14} className={`${showHeatmap ? 'text-orange-500 animate-pulse' : 'text-slate-400'}`} />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isFiltersActive && (
                                                <button 
                                                    onClick={handleClearAllFilters}
                                                    className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
                                                    title="Reset all search and dropdown filters"
                                                >
                                                    <RotateCcw size={10} /> Clear
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setShowHeatmap(!showHeatmap)}
                                                className={`relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none ${showHeatmap ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                                                aria-label={showHeatmap ? 'Hide incident heatmap' : 'Show incident heatmap'}
                                            >
                                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${showHeatmap ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Status & Urgency Legend Accordion (Always Accessible) */}
                                    <div className="mt-1 border border-slate-200/80 dark:border-slate-800/80 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setShowLegend(!showLegend)}
                                            className="w-full px-3 py-2 flex items-center justify-between text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                                            aria-expanded={showLegend}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Info size={13} className="text-orange-500 shrink-0" />
                                                <span className="text-[11px] font-bold tracking-tight">Status & Priority Guide</span>
                                            </span>
                                            {showLegend ? <ChevronUp size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" /> : <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />}
                                        </button>
                                        {showLegend && (
                                            <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2.5 text-[11px]">
                                                <div>
                                                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Report Status Meanings</div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0 w-24 justify-center">
                                                                <Clock size={9} /> Pending Review
                                                            </span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">Needs staff check</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1 shrink-0 w-24 justify-center">
                                                                <CheckCircle2 size={9} /> In Review
                                                            </span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">With Chief Engineer</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1 shrink-0 w-24 justify-center">
                                                                <Truck size={9} /> Dispatched
                                                            </span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">Crew en route to site</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0 w-24 justify-center">
                                                                <CheckCircle size={9} /> Resolved
                                                            </span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">Fixed with proof photo</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0 w-24 justify-center">
                                                                <X size={9} /> Rejected
                                                            </span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">Spam or invalid</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                                                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Priority Meanings</div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-[10px]">
                                                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                                                            <span className="font-bold text-red-600 dark:text-red-400">High:</span>
                                                            <span className="text-slate-500 dark:text-slate-400">Immediate hazard (live wire, flood, deep crater)</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px]">
                                                            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
                                                            <span className="font-bold text-orange-600 dark:text-orange-400">Medium:</span>
                                                            <span className="text-slate-500 dark:text-slate-400">Standard disruption</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px]">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">Low:</span>
                                                            <span className="text-slate-500 dark:text-slate-400">Routine maintenance</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                    <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs">Loading incoming reports...</span>
                                    </div>
                                ) : activeReports.length === 0 ? (
                                    <div className="p-6 text-center flex flex-col items-center justify-center my-auto min-h-[260px]">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3 border border-orange-500/20">
                                            <Filter size={22} />
                                        </div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">No reports found for this filter</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[220px] mb-4 leading-relaxed">
                                            Try adjusting your search terms, barangay, or status filters.
                                        </p>
                                        {isFiltersActive && (
                                            <button
                                                onClick={handleClearAllFilters}
                                                className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                                            >
                                                <RotateCcw size={12} /> Clear all filters
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    activeReports.map(report => {
                                        const color = getReportColor(report.category || report.ai_category);
                                        const icon = getReportIcon(report.category || report.ai_category);
                                        const aiConfidence = urgencyToConfidence(report.ai_urgency);
                                        const plainTitle = getReportPlainTitle(report);
                                        const statusDesc = getStatusDescriptor(report.status);
                                        const urgencyDesc = getUrgencyDescriptor(report.ai_urgency);
                                        const StatusIcon = statusDesc.icon;

                                        // Tactical highlight: glow yellow if this report is in the active stress zone
                                        const reportBrgyDigits = (report.barangay || '').toString().replace(/\D/g, '');
                                        const tacticalBrgyDigits = (tacticalContext?.barangay || '').toString().replace(/\D/g, '');
                                        const isTacticalMatch = tacticalContext && tacticalBrgyDigits && reportBrgyDigits === tacticalBrgyDigits;
                                        const isSelected = selectedReport?.id === report.id;
                                        const selectionClass = isSelected 
                                            ? ({
                                                orange: 'bg-primary/5 dark:bg-orange-950/30 border-primary ring-1 ring-primary/20 shadow-sm',
                                                blue: 'bg-secondary/5 dark:bg-blue-950/30 border-secondary ring-1 ring-secondary/20 shadow-sm',
                                                green: 'bg-secondary/5 dark:bg-green-950/30 border-secondary ring-1 ring-secondary/20 shadow-sm',
                                                red: 'bg-red-500/5 dark:bg-red-950/30 border-red-500/50 ring-1 ring-red-500/20 shadow-sm',
                                                slate: 'bg-neutral-bg dark:bg-slate-800/40 border-neutral-border ring-1 ring-neutral-border/20 shadow-sm'
                                            }[color] || 'bg-neutral-bg dark:bg-slate-800 border-primary/50')
                                            : isTacticalMatch
                                            ? 'bg-yellow-500/5 border-yellow-500/50 ring-1 ring-yellow-500/30 shadow-sm shadow-yellow-500/10'
                                            : `bg-white dark:bg-slate-950/50 border-neutral-border dark:border-slate-800/50 shadow-sm transition-all duration-200 ${
                                                color === 'green' ? 'hover:border-secondary dark:hover:border-green-500/30 hover:bg-secondary-light/30 dark:hover:bg-green-900/5' :
                                                color === 'blue' ? 'hover:border-secondary dark:hover:border-blue-500/30 hover:bg-secondary-light/30 dark:hover:bg-blue-900/5' :
                                                color === 'orange' ? 'hover:border-primary dark:hover:border-orange-700 hover:bg-primary-light/30 dark:hover:bg-orange-900/5' :
                                                color === 'red' ? 'hover:border-red-400/50 dark:hover:border-red-700 hover:bg-red-50/30 dark:hover:bg-red-900/5' :
                                                'hover:border-primary-hover dark:hover:border-slate-700'
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
                                            {/* Primary Line: Plain Language Issue Title + Status Pill with Icon & Label */}
                                            <div className="flex justify-between items-start gap-2 mb-1.5">
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 flex-1">
                                                    {plainTitle}
                                                </h4>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    {isTacticalMatch && (
                                                        <span className="text-[9px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                            ⚡ Zone
                                                        </span>
                                                    )}
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-sm whitespace-nowrap ${statusDesc.badgeClass}`}>
                                                        <StatusIcon size={10} />
                                                        {statusDesc.label}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Secondary Line: Category + Tracking ID reference + Date */}
                                            <div className="flex items-center justify-between gap-1 mb-1.5 text-xs">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold truncate">
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                                                        color === 'orange' ? 'text-orange-500' :
                                                        color === 'blue' ? 'text-blue-500' :
                                                        color === 'green' ? 'text-green-500' :
                                                        color === 'purple' ? 'text-purple-500' :
                                                        color === 'red' ? 'text-red-500' : 'text-slate-400'
                                                    }`}>
                                                        {(() => {
                                                            const iconName = getReportIcon(report.category || report.ai_category);
                                                            if (iconName === 'HardHat') return <HardHat size={12} />;
                                                            if (iconName === 'Droplets') return <Droplets size={12} />;
                                                            if (iconName === 'Zap') return <Zap size={12} />;
                                                            if (iconName === 'ShieldAlert') return <ShieldAlert size={12} />;
                                                            if (iconName === 'Building2') return <Building2 size={12} />;
                                                            if (iconName === 'HelpCircle') return <HelpCircle size={12} />;
                                                            return <AlertTriangle size={12} />;
                                                        })()}
                                                    </div>
                                                    <span className="truncate">{report.category || report.ai_category || 'General Issue'}</span>
                                                    <span className="text-slate-400 dark:text-slate-600 font-mono text-[10px]">
                                                        {formatTicketId(report.ticket_id, report.id)}
                                                    </span>
                                                    {(report.reporter_type === 'guest' || !report.resident_id) && (
                                                        <span className="shrink-0 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                            Guest
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {/* Location line with District badge */}
                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1 mb-2.5 truncate font-medium">
                                                <span className="flex items-center gap-1 truncate text-[11px]">
                                                    <MapPin size={11} className="text-slate-400 shrink-0"/> 
                                                    <span className="truncate">{report.location_string || `${report.location_lat?.toFixed(4)}, ${report.location_lng?.toFixed(4)}`}</span>
                                                </span>
                                                {(() => {
                                                    if (!report.location_lat || !report.location_lng) return null;
                                                    const dist = getCaloocanDistrict(report.location_lat, report.location_lng);
                                                    if (dist === 'north') {
                                                        return <span className="shrink-0 text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">North</span>;
                                                    }
                                                    if (dist === 'south') {
                                                        return <span className="shrink-0 text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">South</span>;
                                                    }
                                                    return (
                                                        <span className="shrink-0 text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30" title="Coordinates are outside Caloocan boundaries">
                                                            ⚠️ Outside
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            
                                            {/* Footer line: Priority/Urgency Badge with Icon + Separated Actions */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${urgencyDesc.dotClass}`}></span>
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                        {urgencyDesc.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            handleStreetViewClick({ lat: report.location_lat, lng: report.location_lng });
                                                        }}
                                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-orange-500 transition-all cursor-pointer shadow-sm active:scale-95"
                                                        title={`View street view for ${report.ticket_id || `Report #${report.id}`}`}
                                                        aria-label={`View street view for ${report.ticket_id || `Report #${report.id}`}`}
                                                    >
                                                        <Eye size={13} />
                                                    </button>
                                                    {(report.status === 'unverified' || report.status === 'pending') && (
                                                        <span 
                                                            onClick={(e) => { e.stopPropagation(); handleVerifyReport(report.id); }}
                                                            className="text-[10px] bg-primary hover:bg-primary-hover text-white px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
                                                        >
                                                            {actionLoading === report.id ? '...' : 'Verify'}
                                                        </span>
                                                    )}
                                                    {report.status === 'pending_approval' && (
                                                        <span className="text-[10px] bg-primary-light text-primary border border-primary/20 px-2 py-1 rounded-lg uppercase font-bold tracking-wider flex items-center gap-1">
                                                            <Clock size={10}/> In Review
                                                        </span>
                                                    )}
                                                    {report.status === 'approved_internal' && (
                                                        <span 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setSelectedReport({...report, aiConfidence, color, icon});
                                                                setIsDispatchModalOpen(true); 
                                                            }}
                                                            className="text-[10px] bg-primary-light text-primary border border-primary/20 px-2 py-1 rounded-lg uppercase font-bold tracking-wider hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                                        >
                                                            {actionLoading === report.id ? '...' : 'Create W.O.'}
                                                        </span>
                                                    )}
                                                    {report.status === 'dispatched' && (
                                                        <button type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleResolveReport(report.id); }}
                                                            className="text-[10px] bg-secondary-light text-secondary border border-secondary/20 px-2 py-1 rounded-lg uppercase font-bold tracking-wider hover:bg-secondary hover:text-white transition-colors cursor-pointer"
                                                        >
                                                            View work orders
                                                        </button>
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
                    {/* Toggle Left Sidebar Button */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="absolute top-4 left-4 z-40 bg-white dark:bg-slate-900 shadow-xl border border-neutral-border p-2.5 rounded-full text-neutral-text dark:text-neutral-muted hover:bg-primary-light transition-all flex items-center justify-center pointer-events-auto"
                        title={isSidebarOpen ? "Hide Incoming Reports" : "Show Incoming Reports"}
                    >
                        {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>

                    {/* Toggle Right Sidebar Button */}
                    <button
                        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                        className="absolute top-4 right-4 z-40 bg-white dark:bg-slate-900 shadow-xl border border-neutral-border p-2.5 rounded-full text-neutral-text dark:text-neutral-muted hover:bg-primary-light transition-all flex items-center justify-center pointer-events-auto"
                        title={isRightSidebarOpen ? "Hide Triage Details" : "Show Triage Details"}
                    >
                        {isRightSidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>

                    {/* PULSO Omni-Assistant AI Brain Button on Map Canvas (Always positioned on map, never blocking triage cards) */}
                    <button
                        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                        className={`absolute top-4 right-16 z-40 shadow-xl border p-2.5 rounded-full transition-all flex items-center justify-center pointer-events-auto group ${
                            isAIChatOpen
                                ? 'bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400'
                                : 'bg-white dark:bg-slate-900 border-neutral-border text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                        }`}
                        title={isAIChatOpen ? "Close AI Assistant" : "Open PULSO Omni-Assistant (AI Copilot)"}
                        aria-label="Toggle PULSO Omni-Assistant AI Copilot"
                    >
                        <Brain size={18} className={isAIChatOpen ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                    </button>

                    {isLoaded ? (
                        <>
                            <GoogleMap
                                mapContainerStyle={MAP_CONTAINER_STYLE}
                                center={CALOOCAN_CENTER}
                                zoom={12}
                                onLoad={map => {
                                    setMap(map);
                                    setPanorama(map.getStreetView());
                                    if (window.google && window.google.maps) {
                                        const bounds = new window.google.maps.LatLngBounds(
                                            new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
                                            new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
                                        );
                                        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
                                    }
                                }}
                                onUnmount={onUnmount}
                                options={mapOptions}
                                onZoomChanged={() => {
                                    if (map) setCurrentZoom(map.getZoom());
                                }}
                                onIdle={() => {
                                    if (map) {
                                        setCurrentZoom(map.getZoom());
                                        setCurrentBounds(map.getBounds());
                                    }
                                }}
                            >
                             {/* Urban Glow Heatmap Layer - Managed manually via heatmapLayerRef for stability */}
                             {/* (No <HeatmapLayerF> here to prevent stacking) */}

                            {/* Clustered Report Badges (at low zoom or dense clusters) */}
                            {clusterMarkers.map(cluster => {
                                const badgeSize = cluster.count > 99 ? 44 : (cluster.count > 9 ? 38 : 34);
                                const badgeIcon = getCachedIcon(
                                    getClusterBadgeSVG(cluster.count, cluster.statusColor),
                                    badgeSize,
                                    badgeSize,
                                    badgeSize / 2,
                                    badgeSize / 2
                                );

                                return (
                                    <MarkerF
                                        key={cluster.id}
                                        position={{ lat: cluster.lat, lng: cluster.lng }}
                                        zIndex={350}
                                        title={`${cluster.count} Reports clustered in this zone — click to expand`}
                                        onClick={() => {
                                            if (map) {
                                                map.panTo({ lat: cluster.lat, lng: cluster.lng });
                                                map.setZoom(Math.min(18, currentZoom + 2));
                                            }
                                        }}
                                        options={{
                                            optimized: true,
                                            clickable: true
                                        }}
                                        icon={badgeIcon}
                                    />
                                );
                            })}

                            {/* Render Report Photo-Pins (with size-optimized thumbnails, status borders & fallback) */}
                            {individualMarkers.map(report => {
                                const isSelected = selectedReport?.id === report.id;
                                const cacheKey = `${report.id}-${isSelected ? 'sel' : 'norm'}`;
                                const customIconUrl = photoPinIcons[cacheKey];

                                const size = isSelected ? 46 : 36;
                                const pointerH = isSelected ? 8 : 7;
                                const totalW = size + 6;
                                const totalH = size + pointerH + 2;

                                const iconConfig = customIconUrl 
                                    ? getCachedIcon(customIconUrl, totalW, totalH, totalW / 2, totalH)
                                    : getCachedIcon(
                                        getMarkerSVG(report.category || report.ai_category, report.status, isSelected),
                                        isSelected ? 44 : 36,
                                        isSelected ? 50 : 42,
                                        isSelected ? 22 : 18,
                                        isSelected ? 50 : 42
                                    );

                                const ariaTitle = `Report ${formatTicketId(report.ticket_id, report.id)}, ${report.category || report.ai_category || 'Incident'}, ${(report.status || 'PENDING').toUpperCase()} — click to view details`;

                                return (
                                    <MarkerF
                                        key={`map-pin-${report.id}`}
                                        position={{ lat: report.location_lat, lng: report.location_lng }}
                                        zIndex={isSelected ? 500 : 150}
                                        title={ariaTitle}
                                        onClick={() => {
                                            setSelectedReport(report);
                                            setSelectedMarker(report);
                                            if (map) map.panTo({ lat: report.location_lat, lng: report.location_lng });
                                        }}
                                        onDblClick={() => {
                                            handleStreetViewClick({ lat: report.location_lat, lng: report.location_lng });
                                        }}
                                        options={{
                                            optimized: true,
                                            clickable: true
                                        }}
                                        icon={iconConfig}
                                    />
                                );
                            })}

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
                            {(() => {
                                if (!selectedMarker) return null;
                                const rawLat = selectedMarker.location_lat ?? selectedMarker.lat ?? selectedMarker.latitude;
                                const rawLng = selectedMarker.location_lng ?? selectedMarker.lng ?? selectedMarker.longitude;
                                const markerLat = typeof rawLat === 'function' ? rawLat() : parseFloat(rawLat);
                                const markerLng = typeof rawLng === 'function' ? rawLng() : parseFloat(rawLng);

                                if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) {
                                    return null;
                                }

                                return (
                                    <InfoWindowF
                                        key={`tactical-card-${selectedMarker.id || 'hq'}-${markerLat}-${markerLng}`}
                                        map={isStreetViewVisible ? panorama : undefined} 
                                        position={{ lat: markerLat, lng: markerLng }}
                                        onCloseClick={() => setSelectedMarker(null)}
                                        options={{ 
                                            pixelOffset: new window.google.maps.Size(0, -35),
                                            zIndex: 1000 
                                        }}
                                    >
                                    {/* Professional Tactical Map Card */}
                                    <div 
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ 
                                            background: isDarkMode ? '#0f172a' : '#ffffff', 
                                            borderRadius: '18px', 
                                            padding: '16px', 
                                            width: '280px',
                                            maxWidth: '290px',
                                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', 
                                            margin: '-10px', 
                                            boxShadow: isDarkMode ? '0 20px 40px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)' : '0 14px 34px -4px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.05)', 
                                            fontFamily: 'Inter, system-ui, -apple-system, sans-serif', 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            textAlign: 'left', 
                                            position: 'relative' 
                                        }}
                                    >
                                        {selectedMarker.isHQ ? (
                                            /* HQ VARIANT: Strategic Operations Hub */
                                            <>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/25 text-xs font-bold text-orange-600 dark:text-orange-400">
                                                        <Building2 size={13} />
                                                        <span>LGU Headquarters</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => setSelectedMarker(null)} 
                                                        title="Close"
                                                        aria-label="Close"
                                                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </div>

                                                <h4 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white mb-1 leading-snug">
                                                    LGU COMMAND CENTER
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                                    Central Dispatch & Tactical Operations Hub • Caloocan City Hall
                                                </p>

                                                <button
                                                    onClick={() => handleStreetViewClick({ lat: selectedMarker.location_lat, lng: selectedMarker.location_lng })}
                                                    className="w-full py-2.5 px-3 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                                >
                                                    <Eye size={14} />
                                                    <span>Open Street View</span>
                                                </button>
                                            </>
                                        ) : (
                                            /* REPORT VARIANT: Standard Incident Triage */
                                            <>
                                                {/* Header Row: Category Badge + Top Action Controls */}
                                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                                                        {(() => {
                                                            const iconName = getReportIcon(selectedMarker.category || selectedMarker.ai_category);
                                                            if (iconName === 'HardHat') return <HardHat size={13} className="text-amber-500 shrink-0" />;
                                                            if (iconName === 'Droplets') return <Droplets size={13} className="text-blue-500 shrink-0" />;
                                                            if (iconName === 'Zap') return <Zap size={13} className="text-yellow-500 shrink-0" />;
                                                            if (iconName === 'ShieldAlert') return <ShieldAlert size={13} className="text-red-500 shrink-0" />;
                                                            if (iconName === 'Building2') return <Building2 size={13} className="text-indigo-500 shrink-0" />;
                                                            if (iconName === 'HelpCircle') return <HelpCircle size={13} className="text-purple-500 shrink-0" />;
                                                            return <AlertTriangle size={13} className="text-orange-500 shrink-0" />;
                                                        })()}
                                                        <span className="truncate max-w-[130px]">{selectedMarker.category || selectedMarker.ai_category || 'Public Report'}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {/* Clean close button */}
                                                        <button 
                                                            onClick={() => setSelectedMarker(null)} 
                                                            title="Close"
                                                            aria-label="Close"
                                                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Incident Plain Title */}
                                                <h4 className="font-heading font-extrabold text-[13px] text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1">
                                                    {getReportPlainTitle(selectedMarker)}
                                                </h4>

                                                {/* Ticket Code & Barangay Reference */}
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                                                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                                                        {formatTicketId(selectedMarker.ticket_id, selectedMarker.id)}
                                                    </span>
                                                    {selectedMarker.barangay && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300 truncate">
                                                                <MapPin size={10} className="shrink-0 text-slate-400" />
                                                                Brgy. {selectedMarker.barangay}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Standardized Canonical Status Badge */}
                                                {(() => {
                                                    const markerStatusDesc = getStatusDescriptor(selectedMarker.status);
                                                    const StatusIcon = markerStatusDesc.icon || Clock;
                                                    return (
                                                        <div className="mb-3">
                                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${markerStatusDesc.badgeClass}`}>
                                                                <StatusIcon size={12} className="shrink-0" />
                                                                <span>{markerStatusDesc.label}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Primary Route Dispatch Button */}
                                                {!directionsResponse ? (
                                                    <button
                                                        disabled={directionsLoading}
                                                        onPointerDown={(e) => { e.stopPropagation(); handleGetDirections(selectedMarker); }}
                                                        onClick={(e) => { e.stopPropagation(); handleGetDirections(selectedMarker); }}
                                                        className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-orange-600 dark:bg-slate-800 dark:hover:bg-orange-600 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer mb-2.5 disabled:opacity-50"
                                                    >
                                                        {directionsLoading ? (
                                                            <div className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"></div>
                                                        ) : (
                                                            <>
                                                                <Navigation size={13} className="text-orange-400" />
                                                                <span>Plan Team Route</span>
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <div className="w-full py-2 px-3 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-600 dark:text-orange-400 flex items-center justify-center gap-2 text-xs font-bold mb-2.5">
                                                        <Truck size={13} className="text-orange-500" />
                                                        <span>{distance} • {duration}</span>
                                                    </div>
                                                )}

                                                {/* Secondary Action Grid: Street View + Full Report */}
                                                <div className="grid grid-cols-2 gap-2 w-full">
                                                    <button
                                                        onClick={() => handleStreetViewClick({ lat: selectedMarker.location_lat, lng: selectedMarker.location_lng })}
                                                        className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                                        aria-label={`Open Google Street View for ${selectedMarker.ticket_id || `Report #${selectedMarker.id}`}`}
                                                        title="Open Google Street View"
                                                    >
                                                        <Eye size={13} className="text-orange-500 shrink-0" />
                                                        <span className="whitespace-nowrap">Street View</span>
                                                    </button>

                                                    <button
                                                        onClick={() => navigate(`/gov/reports?reportId=${selectedMarker.id}`)}
                                                        className="py-2 px-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                                        aria-label={`View full report for ${formatTicketId(selectedMarker.ticket_id, selectedMarker.id)} in citizen reports table`}
                                                        title="Open full administrative report and audit log"
                                                    >
                                                        <FileText size={13} className="text-blue-500 shrink-0" />
                                                        <span className="whitespace-nowrap">Full Report</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </InfoWindowF>
                            );
                        })()}


                            {/* User Position Marker */}
                            {/* ═══════════════════════════════════════════════════════════════════
                                AUTHORITATIVE BARANGAY JURISDICTION BOUNDARIES (ALL 188 BARANGAYS)
                            ══════════════════════════════════════════════════════════════════════ */}
                            {borderData?.features?.map((feature, i) => {
                                const props = feature.properties || {};
                                const sector = props.sector || 'Caloocan';
                                const isNorth = sector === 'North';

                                const polygonOptions = {
                                    strokeColor: isNorth ? '#f97316' : '#ff6b00',
                                    strokeOpacity: 1.0,
                                    strokeWeight: 2.2,
                                    fillColor: isNorth ? '#f97316' : '#ff6b00',
                                    fillOpacity: isNorth
                                        ? (isDarkMode ? 0.10 : 0.06)
                                        : (isDarkMode ? 0.08 : 0.05),
                                    clickable: false,
                                    zIndex: isNorth ? 2 : 1,
                                };

                                const paths = feature.geometry.type === 'MultiPolygon'
                                    ? feature.geometry.coordinates.map(poly => poly[0].map(c => ({ lng: c[0], lat: c[1] })))
                                    : [feature.geometry.coordinates[0].map(c => ({ lng: c[0], lat: c[1] }))];

                                return paths.map((path, pi) => (
                                    <PolygonF
                                        key={`caloocan-brgy-border-${i}-${pi}`}
                                        paths={path}
                                        options={polygonOptions}
                                    />
                                ));
                            })}

                            {/* Fallback boundary outlines if borderData has no features */}
                            {(!borderData?.features || borderData.features.length === 0) && (
                                <>
                                    <PolygonF
                                        paths={NORTH_CALOOCAN_PATH}
                                        options={{
                                            fillColor: "#ff6b00",
                                            fillOpacity: 0.08,
                                            strokeColor: "#ff6b00",
                                            strokeOpacity: 0.85,
                                            strokeWeight: 2.5,
                                            clickable: false,
                                        }}
                                    />
                                    <PolygonF
                                        paths={SOUTH_CALOOCAN_PATH}
                                        options={{
                                            fillColor: "#ff6b00",
                                            fillOpacity: 0.08,
                                            strokeColor: "#ff6b00",
                                            strokeOpacity: 0.85,
                                            strokeWeight: 2.5,
                                            clickable: false,
                                        }}
                                    />
                                </>
                            )}

                            {/* North Caloocan District Centroid Label */}
                            <MarkerF
                                position={NORTH_CALOOCAN_CENTROID}
                                zIndex={110}
                                options={{
                                    clickable: false,
                                    optimized: true
                                }}
                                icon={window.google && window.google.maps ? {
                                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                        <svg xmlns="http://www.w3.org/2000/svg" width="134" height="32" viewBox="0 0 134 32">
                                            <rect x="2" y="2" width="130" height="28" rx="8" fill="#0c1424" fill-opacity="0.92" stroke="#ff6b00" stroke-width="1.5" />
                                            <circle cx="16" cy="16" r="4" fill="#ff6b00" />
                                            <text x="70" y="20" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="0.3">NORTH CALOOCAN</text>
                                        </svg>
                                    `.trim().replace(/\n/g, '').replace(/\s+/g, ' '))}`,
                                    anchor: new window.google.maps.Point(67, 16)
                                } : undefined}
                            />

                            {/* South Caloocan District Centroid Label */}
                            <MarkerF
                                position={SOUTH_CALOOCAN_CENTROID}
                                zIndex={110}
                                options={{
                                    clickable: false,
                                    optimized: true
                                }}
                                icon={window.google && window.google.maps ? {
                                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                        <svg xmlns="http://www.w3.org/2000/svg" width="134" height="32" viewBox="0 0 134 32">
                                            <rect x="2" y="2" width="130" height="28" rx="8" fill="#0c1424" fill-opacity="0.92" stroke="#ff6b00" stroke-width="1.5" />
                                            <circle cx="16" cy="16" r="4" fill="#ff6b00" />
                                            <text x="70" y="20" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="0.3">SOUTH CALOOCAN</text>
                                        </svg>
                                    `.trim().replace(/\n/g, '').replace(/\s+/g, ' '))}`,
                                    anchor: new window.google.maps.Point(67, 16)
                                } : undefined}
                            />

                            {/* South Caloocan City Hall HQ Pin */}
                            <MarkerF 
                                position={CALOOCAN_CITY_HALL_SOUTH_LOC}
                                zIndex={300}
                                options={{
                                    optimized: false,
                                    clickable: true
                                }}
                                onClick={() => {
                                    setSelectedMarker({
                                        id: 'hq-south',
                                        isHQ: true,
                                        title: 'Caloocan City Hall (South Main)',
                                        location_lat: CALOOCAN_CITY_HALL_SOUTH_LOC.lat,
                                        location_lng: CALOOCAN_CITY_HALL_SOUTH_LOC.lng,
                                        description: 'South Caloocan Executive & Municipal Hall (8th Ave / Grace Park)'
                                    });
                                }}
                                icon={window.google && window.google.maps ? {
                                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 60" width="50" height="60">
                                            <defs>
                                                <linearGradient id="hqSouthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
                                                    <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
                                                </linearGradient>
                                                <filter id="shadowSouth" x="-20%" y="-20%" width="140%" height="140%">
                                                    <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                                                    <feOffset dx="0" dy="2" result="offsetblur" />
                                                    <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
                                                    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                                                </filter>
                                            </defs>
                                            <path d="M25 58c0 0 22-20 22-33a22 22 0 0 0-44 0c0 13 22 33 22 33z" fill="url(#hqSouthGrad)" stroke="#ff6b00" stroke-width="2.5" filter="url(#shadowSouth)" />
                                            <g transform="translate(13, 10) scale(1.1)" fill="#ff6b00">
                                                <path d="M18 20v-8l-1.5-1.5V6L15 4l-1.5 2v4.5L12 12l-1.5-1.5V6L9 4 7.5 6v4.5L6 12v8h12zM11 16h2v4h-2v-4z"/>
                                            </g>
                                        </svg>
                                    `.trim().replace(/\n/g, '').replace(/\s+/g, ' '))}`,
                                    scaledSize: new window.google.maps.Size(42, 50),
                                    anchor: new window.google.maps.Point(21, 50)
                                } : undefined}
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
                            {directionsResponse && (
                                (() => {
                                    const rawMidpoint = directionsResponse?.routes?.[0]?.midpoint || directionsResponse?.midpoint;
                                    if (!rawMidpoint) return null;
                                    const midLat = typeof rawMidpoint.lat === 'function' ? rawMidpoint.lat() : parseFloat(rawMidpoint.lat);
                                    const midLng = typeof rawMidpoint.lng === 'function' ? rawMidpoint.lng() : parseFloat(rawMidpoint.lng);
                                    if (!Number.isFinite(midLat) || !Number.isFinite(midLng)) return null;

                                    return (
                                        <InfoWindowF
                                            key={`route-midpoint-${midLat}-${midLng}`}
                                            position={{ lat: midLat, lng: midLng }}
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
                                    );
                                })()
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
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2 shadow-xl pointer-events-auto">
                            <h4 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Map Status Legend</h4>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div> Pending Review
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div> Dispatched
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Resolved
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div> Rejected
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></div> Cancelled
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

            <AnimatePresence>
                {isRightSidebarOpen && (
                    <motion.div
                        initial={{ x: 320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 320, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="w-72 2xl:w-80 bg-white dark:bg-slate-900 flex flex-col z-30 shrink-0 relative border-l border-neutral-border"
                    >
                        {/* Removed left sidebar inner shadow */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-border bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-orange-500" size={16} />
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                Triage Queue
                            </h3>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="space-y-4">
                                {selectedReport ? (
                                    <div className="bg-white dark:bg-slate-950/50 border border-neutral-border dark:border-slate-800 rounded-xl p-4">
                                        <div className="flex flex-col gap-3">
                                            {/* Header */}
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <ShieldAlert className="text-primary shrink-0" size={18}/>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Needs Your Review</h3>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    Barangay Staff Verification &amp; Triage
                                                </p>
                                            </div>

                                            {/* Selected Incident Plain Title & Reference */}
                                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-0.5">Selected Incident</div>
                                                <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                                                    {getReportPlainTitle(selectedReport)}
                                                </h4>
                                                <div className="text-[10px] font-mono text-orange-500 font-semibold mt-0.5">
                                                    {formatTicketId(selectedReport.ticket_id, selectedReport.id)}
                                                </div>
                                            </div>

                                            {/* Deep-link to Citizen Reports (Table View & Audit Log) */}
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/gov/reports?reportId=${selectedReport.id}`)}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 text-xs font-bold transition-all cursor-pointer group"
                                                title={`View full report & audit trail for #${formatTicketId(selectedReport.ticket_id, selectedReport.id)} in Citizen Reports`}
                                                aria-label={`View full report & audit trail for #${formatTicketId(selectedReport.ticket_id, selectedReport.id)}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <FileText size={14} className="text-blue-500" />
                                                    <span>View Full Report & Audit</span>
                                                </div>
                                                <ArrowUpRight size={13} className="text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            </button>

                                            {/* Strategic Process Roadmap */}
                                            <div className="mb-2 relative">
                                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-2">
                                                    <span className={['pending', 'unverified'].includes(selectedReport.status) ? 'text-orange-500' : 'text-slate-400'}>1. Intake</span>
                                                    <span className={selectedReport.status === 'pending_approval' ? 'text-orange-500' : 'text-slate-400'}>2. Review</span>
                                                    <span className={['approved_internal', 'dispatched'].includes(selectedReport.status) ? 'text-orange-500' : 'text-slate-400'}>3. Work Order</span>
                                                    <span className={selectedReport.status === 'resolved' ? 'text-green-500' : 'text-slate-400'}>4. Resolved</span>
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

                                            {/* Plain-Language AI Guidance Box */}
                                            {(() => {
                                                const conf = selectedReport.aiConfidence || urgencyToConfidence(selectedReport.ai_urgency);
                                                const confDetails = getAiConfidenceDetails(conf);
                                                return (
                                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                                <Sparkles size={13} className="text-orange-500" />
                                                                AI Verification Guidance
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${confDetails.badgeClass}`}>
                                                                {conf}% Sure · {confDetails.shortNote}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-1.5">
                                                            The AI is <strong>{conf}% sure</strong> about this category — please double-check the photo and location before approving.
                                                        </p>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${confDetails.dotColor} shrink-0`}></div>
                                                            <span>{confDetails.qualifier}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            
                                            {/* Attached Citizen Photo */}
                                            <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800">
                                                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center justify-between">
                                                    <span>Attached Citizen Photo:</span>
                                                    {selectedReport.image_url && (
                                                        <span className="text-[10px] text-slate-400">Click to expand</span>
                                                    )}
                                                </div>
                                                <div className="w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 relative group">
                                                    {selectedReport.image_url ? (
                                                        <button 
                                                            onClick={() => setZoomedImage(`${API_BASE_URL}${selectedReport.image_url}`)}
                                                            className="w-full h-full cursor-zoom-in"
                                                            title="Click to Zoom Photo"
                                                            aria-label="Click to Zoom Photo"
                                                        >
                                                            <img 
                                                                src={`${API_BASE_URL}${selectedReport.image_url}`} 
                                                                alt="Citizen report photographic evidence" 
                                                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                                                            />
                                                        </button>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <ImageIcon size={24} className="opacity-20"/>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No citizen media attached</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Quick Street View Toggle for Current Report Location */}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStreetViewClick({ lat: selectedReport.location_lat, lng: selectedReport.location_lng });
                                                        }}
                                                        className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur text-white p-2 rounded-lg text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-600"
                                                        aria-label="View Google Street View for this location"
                                                    >
                                                        <Eye size={12}/> View Street View
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Gemini AI Smart Analysis with "What does this mean?" Expandable */}
                                            {selectedReport.ai_summary && (
                                                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                                                    <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs mb-1.5 uppercase tracking-tight">
                                                        <Brain size={14}/> Gemini AI Smart Analysis
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 italic mb-2">
                                                        "{selectedReport.ai_summary}"
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">
                                                            Category: {selectedReport.ai_category || selectedReport.category || 'General'}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${selectedReport.ai_urgency === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                            Urgency: {selectedReport.ai_urgency || 'Standard'}
                                                        </span>
                                                    </div>

                                                    {/* Expandable "What does this mean?" Helper */}
                                                    <div className="mt-2.5 pt-2 border-t border-indigo-500/15">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAiHelp(!showAiHelp)}
                                                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-between w-full transition-colors"
                                                            aria-expanded={showAiHelp}
                                                        >
                                                            <span className="flex items-center gap-1">
                                                                <HelpCircle size={12} />
                                                                What does this mean?
                                                            </span>
                                                            {showAiHelp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        </button>
                                                        {showAiHelp && (
                                                            <div className="mt-2 space-y-1.5 text-[10px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/80 p-2.5 rounded-lg border border-indigo-500/20 leading-relaxed">
                                                                <p>
                                                                    <strong className="text-indigo-600 dark:text-indigo-400">AI Category:</strong> Auto-detected by Google Gemini Vision from citizen photos to route to the correct municipal division (e.g. Roads, Drainage, Lighting).
                                                                </p>
                                                                <p>
                                                                    <strong className="text-indigo-600 dark:text-indigo-400">AI Urgency:</strong> Estimates how quickly crews should respond based on hazard severity and public safety risk (Low, Medium, High).
                                                                </p>
                                                                <p>
                                                                    <strong className="text-indigo-600 dark:text-indigo-400">Confidence Score:</strong> How closely the visual evidence matches verified municipal patterns. Scores below 80% should be verified by staff.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Route Info in Sidebar (Detailed Road Logistics) */}
                                            {directionsResponse && (
                                                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-center justify-between">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">Route to Incident</div>
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                            <Truck size={14} className="text-orange-500"/> {distance} • {duration}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleExternalDirections(selectedReport)}
                                                        className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-500 transition-colors shadow-sm"
                                                        aria-label="Open directions in Google Maps external view"
                                                    >
                                                        <Navigation size={16} />
                                                    </button>
                                                </div>
                                            )}

                                            {!directionsResponse && (
                                                <button 
                                                    onClick={() => handleGetDirections(selectedReport)}
                                                    className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-800 active:scale-98"
                                                >
                                                    <Navigation size={14} className="text-orange-500"/>
                                                    Plan Team Route
                                                </button>
                                            )}

                                            {/* Guided Actions with Plain-Language Explanations */}
                                            <div className="space-y-2.5 pt-1">
                                                {/* Primary Action Button with Contextual Explanation */}
                                                {(selectedReport.status === 'unverified' || selectedReport.status === 'pending') && (
                                                    <div className="space-y-1">
                                                        <button 
                                                            onClick={() => handleVerifyReport(selectedReport.id)}
                                                            disabled={actionLoading === selectedReport.id}
                                                            className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
                                                        >
                                                            <CheckCircle2 size={14} />
                                                            {actionLoading === selectedReport.id ? 'Verifying...' : 'Verify & Send to Chief'}
                                                        </button>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">
                                                            Confirms report validity and forwards to Engineering Division Chief.
                                                        </p>
                                                    </div>
                                                )}

                                                {selectedReport.status === 'pending_approval' && (
                                                    <div className="space-y-1">
                                                        <button 
                                                            onClick={() => handleApproveReport(selectedReport.id)}
                                                            disabled={actionLoading === selectedReport.id}
                                                            className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
                                                        >
                                                            <Briefcase size={14} />
                                                            {actionLoading === selectedReport.id ? 'Approving...' : 'Approve for Work Order'}
                                                        </button>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">
                                                            Records a reason and makes this report eligible for field assignment.
                                                        </p>
                                                    </div>
                                                )}

                                                {selectedReport.status === 'approved_internal' && (
                                                    <div className="space-y-1">
                                                        <button 
                                                            onClick={() => {
                                                                setDispatchForm({
                                                                    assigned_to_id: '',
                                                                    priority: selectedReport.urgency === 'critical' ? 'critical' : selectedReport.urgency === 'high' ? 'high' : 'normal',
                                                                    title: `Repair ${selectedReport.ai_category || selectedReport.category || 'Infrastructure Issue'}`,
                                                                    description: selectedReport.description || selectedReport.ai_summary || ''
                                                                });
                                                                setIsDispatchModalOpen(true);
                                                            }}
                                                            className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-2 active:scale-98"
                                                        >
                                                            <Briefcase size={14} /> Generate Work Order
                                                        </button>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">
                                                            Assigns an eligible field official and records the dispatch.
                                                        </p>
                                                    </div>
                                                )}

                                                {selectedReport.status === 'dispatched' && (
                                                    <div className="space-y-1">
                                                        <button 
                                                            onClick={() => handleResolveReport(selectedReport.id)}
                                                            disabled={actionLoading === selectedReport.id}
                                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
                                                        >
                                                            <CheckCircle size={14} />
                                                            View work orders
                                                        </button>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">
                                                            Completion proof and independent inspection are handled on the work order.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Secondary Actions Row: Process Audit & Intake Decision */}
                                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setIsAuditModalOpen(true)}
                                                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 active:scale-95 cursor-pointer"
                                                        title="View milestone progress and audit trail"
                                                    >
                                                        <Activity size={13} className="text-orange-500" /> Process Audit
                                                    </button>

                                                    <button 
                                                        onClick={() => handleRejectReport(selectedReport.id)}
                                                        disabled={actionLoading === selectedReport.id || !['pending', 'unverified', 'needs_information', 'pending_approval'].includes(selectedReport.status)}
                                                        className="bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 py-2 rounded-xl text-[11px] font-bold transition-colors border border-red-200 dark:border-red-800/60 disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
                                                        title="Record a reasoned report rejection"
                                                    >
                                                        <X size={13} />
                                                        {actionLoading === selectedReport.id ? '...' : 'Reject report'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 px-4 text-slate-500 dark:text-slate-400 text-xs leading-relaxed flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-slate-300 mb-1">No Report Selected</span>
                                        <span>Select any citizen report from the left list to review photos, inspect AI guidance, and dispatch field crews.</span>
                                    </div>
                                )}
                            </div>
                    </div>
                    </motion.div>
                )}
            </AnimatePresence>

                {/* Dispatch / Generate Work Order Modal */}
                <AnimatePresence>
                    {isDispatchModalOpen && selectedReport && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
                            >
                                {/* Top Accent Gradient Strip */}
                                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 shrink-0" />

                                {/* Modal Header */}
                                <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                    <div className="flex items-center justify-between gap-3 mb-2.5">
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                                            <Briefcase size={13} className="text-orange-500" />
                                            <span>MUNICIPAL WORK ORDER DISPATCH</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setIsDispatchModalOpen(false)}
                                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                            aria-label="Close dialog"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                                        Generate Work Order
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                        Authorize and deploy engineering field teams with official dispatch parameters.
                                    </p>

                                    {/* Incident Summary Lockup */}
                                    <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-mono text-xs font-extrabold text-orange-500">
                                                    {formatTicketId(selectedReport.ticket_id, selectedReport.id)}
                                                </span>
                                                {selectedReport.barangay && (
                                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                                        <span>•</span>
                                                        <MapPin size={10} className="text-slate-400 shrink-0" />
                                                        <span>Brgy. {selectedReport.barangay}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {getReportPlainTitle(selectedReport)}
                                            </h4>
                                        </div>
                                        {(() => {
                                            const desc = getStatusDescriptor(selectedReport.status);
                                            const StatusIcon = desc.icon || Clock;
                                            return (
                                                <div className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${desc.badgeClass}`}>
                                                    <StatusIcon size={12} className="shrink-0" />
                                                    <span>{desc.label}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                
                                {/* Modal Scrollable Form Body */}
                                <form onSubmit={handleCreateWorkOrder} className="p-6 overflow-y-auto space-y-4 text-xs">
                                    {/* Issue Verified Location Card */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5 border border-orange-500/20">
                                            <MapPin size={15} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                                                Field Operations Site
                                            </div>
                                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words">
                                                {selectedReport.location_string || `${selectedReport.location_lat?.toFixed(5)}°N, ${selectedReport.location_lng?.toFixed(5)}°E (Caloocan)`}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2-Column Responsive Form Controls */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {/* Assigned Fleet / Engineer */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                <Truck size={13} className="text-orange-500" />
                                                <span>Assign to field official</span>
                                            </label>
                                            <select 
                                                required
                                                value={dispatchForm.assigned_to_id}
                                                onChange={(e) => setDispatchForm({...dispatchForm, assigned_to_id: e.target.value})}
                                                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all cursor-pointer shadow-xs"
                                            >
                                                <option value="">Choose an eligible official</option>
                                                {eligibleAssignees.map((person) => <option key={person.id} value={person.id}>{person.full_name} · {person.role.replaceAll('_', ' ')}</option>)}
                                            </select>
                                            {assigneeError && <p role="alert" className="text-red-600 text-xs mt-1">{assigneeError}</p>}
                                        </div>

                                        {/* Priority Level */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                <ShieldCheck size={13} className="text-orange-500" />
                                                <span>Priority Level</span>
                                            </label>
                                            <select 
                                                value={dispatchForm.priority}
                                                onChange={(e) => setDispatchForm({...dispatchForm, priority: e.target.value})}
                                                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all cursor-pointer shadow-xs"
                                            >
                                                <option value="critical">Critical (Immediate Danger / Safety Hazard)</option>
                                                <option value="high">High (Urgent Infrastructure Repair)</option>
                                                <option value="normal">Normal (Standard Dispatch SLA)</option>
                                                <option value="low">Low (Routine Maintenance Sweep)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Task Title */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <Wrench size={13} className="text-orange-500" />
                                            <span>Work Order Task Title</span>
                                        </label>
                                        <input 
                                            type="text"
                                            required
                                            placeholder={`e.g. Repair ${selectedReport.ai_category || selectedReport.category || 'damaged infrastructure'}`}
                                            value={dispatchForm.title}
                                            onChange={(e) => setDispatchForm({...dispatchForm, title: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all shadow-xs"
                                        />
                                    </div>

                                    {/* Dispatcher Instructions / Action Plan */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <FileText size={13} className="text-orange-500" />
                                            <span>Dispatcher Instructions & Action Plan</span>
                                        </label>
                                        <textarea 
                                            rows="3"
                                            placeholder="Specify field instructions, required heavy equipment, safety perimeters, or coordinate notes..."
                                            value={dispatchForm.description}
                                            onChange={(e) => setDispatchForm({...dispatchForm, description: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all shadow-xs resize-none"
                                        ></textarea>
                                    </div>

                                    {/* Information Notice Strip */}
                                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-slate-700 dark:text-slate-300 text-[11px] flex items-start gap-2.5">
                                        <Sparkles size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                        <div className="leading-relaxed">
                                            Assignment advances an approved report to dispatched and records the decision in the timeline and audit history.
                                        </div>
                                    </div>

                                    {/* Footer Controls */}
                                    <div className="pt-2 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800">
                                        <button 
                                            type="button"
                                            onClick={() => setIsDispatchModalOpen(false)}
                                            disabled={actionLoading === selectedReport.id}
                                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={actionLoading === selectedReport.id || eligibleAssignees.length === 0}
                                            className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                                        >
                                            {actionLoading === selectedReport.id ? (
                                                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                            ) : (
                                                <>
                                                    <Navigation size={14} />
                                                    <span>Confirm & Dispatch Crew</span>
                                                </>
                                            )}
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

                {/* PULSO Omni-Assistant Chat Window (Triggered from Top Header and Map Canvas toolbar) */}
                <AnimatePresence>
                    {isAIChatOpen && (
                        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
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
                                        : 'w-[380px] h-[520px] rounded-2xl relative z-[100]'
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
                                            <X size={18} />
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
                                                                    title={`${formatTicketId(r.ticket_id, r.id)}: ${r.ai_category || r.category}`}
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
                                                                <span className="text-[9px] font-mono text-slate-600 group-hover:text-orange-400 transition-colors shrink-0">{formatTicketId(r.ticket_id, r.id)}</span>
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
                        </div>
                    )}
                </AnimatePresence>
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

                {/* ── Milestone Progress & Audit Lifecycle Modal ── */}
                {isAuditModalOpen && selectedReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
                        onClick={() => setIsAuditModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 16 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-5xl xl:max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
                        >
                            {/* Top Accent Gradient Strip */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 shrink-0" />

                            {/* Modal Header */}
                            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div className="flex items-center justify-between gap-3 mb-2.5">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                            </span>
                                            <span>PULSO DISPATCH LIFECYCLE AUDIT</span>
                                        </div>
                                        {(() => {
                                            const raw = (selectedReport.status || '').toLowerCase();
                                            const isResolved = ['resolved', 'completed', 'fixed', 'closed'].some(k => raw.includes(k));
                                            const isDispatched = ['dispatched', 'in progress', 'in_progress', 'ongoing'].some(k => raw.includes(k));
                                            const isAssigned = ['assigned', 'approved_internal', 'approved for w.o.', 'approved for work order', 'approved'].some(k => raw.includes(k)) || isDispatched || isResolved;
                                            const isVerified = ['verified', 'pending_approval', 'awaiting approval'].some(k => raw.includes(k)) || isAssigned || isDispatched || isResolved;
                                            const currentStage = isResolved ? 5 : isDispatched ? 4 : isAssigned ? 3 : isVerified ? 2 : 1;
                                            const progressPct = currentStage * 20;

                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono-data font-bold text-slate-700 dark:text-slate-300">
                                                    <span>Phase {currentStage} of 5</span>
                                                    <span className="text-slate-400">•</span>
                                                    <span className={isResolved ? 'text-emerald-500' : 'text-[#ff6b00]'}>
                                                        {progressPct}% {isResolved ? 'Completed' : 'Dispatched'}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <button
                                        onClick={() => setIsAuditModalOpen(false)}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                        aria-label="Close modal"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="flex items-baseline justify-between flex-wrap gap-2">
                                    <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                                        Milestone Progress & Audit
                                    </h2>
                                    <span className="text-xs font-mono-data text-slate-500 dark:text-slate-400">
                                        Authoritative Municipal Dispatch Sequence & SLA Telemetry
                                    </span>
                                </div>
                                
                                {/* Report Summary Lockup Banner */}
                                <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
                                    <div className="min-w-0 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-950/40 text-[#ff6b00] border border-orange-500/20 flex items-center justify-center font-mono-data font-black text-xs shrink-0">
                                            WO
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-mono text-xs font-extrabold text-orange-500">
                                                    {formatTicketId(selectedReport.ticket_id, selectedReport.id)}
                                                </span>
                                                {selectedReport.barangay && (
                                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                                        <span>•</span>
                                                        <MapPin size={10} className="text-slate-400 shrink-0" />
                                                        <span>Brgy. {selectedReport.barangay}</span>
                                                    </span>
                                                )}
                                                {selectedReport.category && (
                                                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate hidden sm:inline-flex items-center gap-1">
                                                        <span>•</span>
                                                        <span>{selectedReport.category}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {getReportPlainTitle(selectedReport)}
                                            </h4>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                        {selectedReport.assigned_to && (
                                            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono-data text-slate-600 dark:text-slate-300">
                                                <span className="text-slate-400">Fleet:</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{selectedReport.assigned_to}</span>
                                            </div>
                                        )}
                                        {(() => {
                                            const desc = getStatusDescriptor(selectedReport.status);
                                            const StatusIcon = desc.icon || Clock;
                                            return (
                                                <div className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${desc.badgeClass}`}>
                                                    <StatusIcon size={13} className="shrink-0" />
                                                    <span>{desc.label}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Stepper Body: Landscape 5-Phase Assembly Pipeline */}
                            <div className="p-6 overflow-y-auto space-y-5">
                                {/* Rejected Alert Banner if applicable */}
                                {['rejected', 'cancelled', 'canceled', 'spam', 'invalid'].some(k => (selectedReport.status || '').toLowerCase().includes(k)) && (
                                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5">
                                        <X size={16} className="shrink-0 mt-0.5 text-rose-500" />
                                        <div>
                                            <strong className="font-bold">Submission Flagged as Rejected / Invalid</strong>
                                            <p className="mt-0.5 text-[11px] opacity-90">This report was screened and excluded from active dispatch. All audit events and photo logs remain preserved for record integrity.</p>
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    const raw = (selectedReport.status || '').toLowerCase();
                                    const isResolved = ['resolved', 'completed', 'fixed', 'closed'].some(k => raw.includes(k));
                                    const isDispatched = ['dispatched', 'in progress', 'in_progress', 'ongoing'].some(k => raw.includes(k));
                                    const isAssigned = ['assigned', 'approved_internal', 'approved for w.o.', 'approved for work order', 'approved'].some(k => raw.includes(k)) || isDispatched || isResolved;
                                    const isVerified = ['verified', 'pending_approval', 'awaiting approval'].some(k => raw.includes(k)) || isAssigned || isDispatched || isResolved;
                                    const isRejected = ['rejected', 'cancelled', 'canceled', 'spam', 'invalid'].some(k => raw.includes(k));

                                    const milestones = [
                                        {
                                            phase: 'Phase 1',
                                            title: 'Citizen Intake & AI Vision Analysis',
                                            description: 'Citizen report logged with photo evidence, GPS geotagging, and Gemini AI auto-classification.',
                                            meta: selectedReport.created_at ? `Logged on ${new Date(selectedReport.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Logged in PULSO Portal',
                                            isDone: true,
                                            isActive: false
                                        },
                                        {
                                            phase: 'Phase 2',
                                            title: 'Staff Triage & Hazard Verification',
                                            description: 'LGU desk dispatcher confirms physical report authenticity, inspects street hazards, and validates municipal service category.',
                                            meta: isVerified ? 'Verified by Staff Dispatcher' : (isRejected ? 'Declined at Triage' : 'Awaiting Desk Verification'),
                                            isDone: isVerified,
                                            isActive: !isVerified && !isRejected
                                        },
                                        {
                                            phase: 'Phase 3',
                                            title: 'Work Order & Division Dispatch',
                                            description: 'Department chief approves work order, locks required engineering resources, and assigns the responsible field fleet.',
                                            meta: isAssigned ? `Assigned: ${selectedReport.assigned_to || 'City Engineering Fleet'}` : (isVerified ? 'Ready for Division Assignment' : 'Pending Verification'),
                                            isDone: isAssigned,
                                            isActive: isVerified && !isAssigned && !isRejected
                                        },
                                        {
                                            phase: 'Phase 4',
                                            title: 'Field Operations & On-Site Repair',
                                            description: 'Dispatched engineering crew arrives on site with heavy equipment, safety perimeters, and executes infrastructure repair.',
                                            meta: isResolved ? 'Field Work Completed' : (isDispatched ? 'Field Crew Active On-Site' : 'Pending Crew Deployment'),
                                            isDone: isResolved,
                                            isActive: isDispatched && !isResolved
                                        },
                                        {
                                            phase: 'Phase 5',
                                            title: 'Final Quality Audit & Resolution',
                                            description: 'Field supervisor captures completion photo evidence, signs off on resolution, and triggers automated citizen SMS/email notification.',
                                            meta: isResolved ? 'Audit Complete • Citizen Notified' : 'Awaiting Work Completion Sign-Off',
                                            isDone: isResolved,
                                            isActive: false
                                        }
                                    ];

                                    return (
                                        <div className="space-y-4">
                                            {/* Horizontal Stepper Connector Bar (Visible on tablet/desktop) */}
                                            <div className="hidden md:flex items-center justify-between relative px-8 py-2">
                                                {/* Background Track Line */}
                                                <div className="absolute left-14 right-14 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />

                                                {/* Active Progress Track Line */}
                                                <div
                                                    className="absolute left-14 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-500 to-orange-500 z-0 transition-all duration-500"
                                                    style={{
                                                        width: isResolved ? 'calc(100% - 112px)' : isDispatched ? 'calc(75% - 84px)' : isAssigned ? 'calc(50% - 56px)' : isVerified ? 'calc(25% - 28px)' : '0%'
                                                    }}
                                                />

                                                {/* 5 Step Nodes */}
                                                {milestones.map((m, idx) => (
                                                    <div key={`node-${idx}`} className="relative z-10 flex flex-col items-center">
                                                        {m.isDone ? (
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 ring-4 ring-white dark:ring-slate-900 transition-transform">
                                                                <CheckCircle2 size={16} />
                                                            </div>
                                                        ) : m.isActive ? (
                                                            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 ring-4 ring-orange-500/25 animate-pulse">
                                                                <Activity size={15} />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
                                                                {idx + 1}
                                                            </div>
                                                        )}
                                                        <span className={`text-[10px] font-mono-data font-bold mt-1.5 uppercase tracking-wider ${
                                                            m.isActive ? 'text-orange-500' : m.isDone ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'
                                                        }`}>
                                                            {m.phase}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* 5-Column Landscape Milestone Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-stretch">
                                                {milestones.map((m, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-3.5 rounded-2xl flex flex-col justify-between min-h-[190px] transition-all relative overflow-hidden ${
                                                            m.isActive
                                                                ? 'bg-orange-500/5 dark:bg-orange-500/10 border-2 border-orange-500/40 shadow-lg shadow-orange-500/10'
                                                                : m.isDone
                                                                    ? 'bg-slate-50/80 dark:bg-slate-950/40 border border-emerald-500/20 dark:border-emerald-500/20'
                                                                    : 'opacity-70 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60'
                                                        }`}
                                                    >
                                                        {/* Active Phase Top Accent */}
                                                        {m.isActive && (
                                                            <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff6b00]" />
                                                        )}

                                                        <div>
                                                            {/* Header: Phase badge & Status Pill */}
                                                            <div className="flex items-center justify-between gap-1.5 mb-2">
                                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-500 font-mono-data">
                                                                    {m.phase}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 font-mono-data ${
                                                                    m.isDone
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                        : m.isActive
                                                                            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 animate-pulse'
                                                                            : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50'
                                                                }`}>
                                                                    {m.isDone ? 'Completed' : (m.isActive ? 'In Progress' : 'Queued')}
                                                                </span>
                                                            </div>

                                                            {/* Phase Title */}
                                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug mb-1.5">
                                                                {m.title}
                                                            </h4>

                                                            {/* Description */}
                                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                                                {m.description}
                                                            </p>
                                                        </div>

                                                        {/* Meta Pill pinned at bottom */}
                                                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 text-[10px] font-mono-data font-medium text-slate-600 dark:text-slate-300 max-w-full">
                                                                <Sparkles size={11} className="text-orange-500 shrink-0" />
                                                                <span className="truncate">{m.meta}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Footer Controls */}
                            <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAuditModalOpen(false);
                                        navigate(`/gov/reports?reportId=${selectedReport.id}`);
                                    }}
                                    className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                                    title="Open comprehensive administrative audit in Table View"
                                >
                                    <FileText size={14} />
                                    <span>Inspect Full Audit Log in Table View</span>
                                    <ArrowUpRight size={13} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsAuditModalOpen(false)}
                                    className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                                >
                                    Done
                                </button>
                            </div>
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
