import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    GoogleMap,
    MarkerF,
    OverlayViewF,
    InfoWindowF,
    StreetViewPanorama
} from '@react-google-maps/api';
import {
    X,
    Layers,
    Crosshair,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    MapPin,
    AlertTriangle,
    Eye,
    Maximize2,
    Minimize2,
    ShieldCheck,
    Menu,
    Droplets,
    Mountain,
    Zap,
    Car,
    Building2,
    MoreHorizontal
} from 'lucide-react';
import PulsoPulseLine from './common/PulsoPulseLine';
import CaloocanBoundaryLayer from './CaloocanBoundaryLayer';
import { getCityHallMarkerSvg } from '../config/boundaryStyle';
import {
    NORTH_CALOOCAN_CENTROID,
    SOUTH_CALOOCAN_CENTROID,
    COMBINED_CALOOCAN_BOUNDS,
    getCaloocanDistrict
} from '../data/caloocanBoundaries';
import { API_BASE_URL } from '../utils/apiBase';

export function getDistance(loc1, loc2) {
    if (!loc1 || !loc2 || loc1.lat == null || loc1.lng == null || loc2.lat == null || loc2.lng == null) return null;
    if (window.google?.maps?.geometry?.spherical) {
        const p1 = new window.google.maps.LatLng(loc1.lat, loc1.lng);
        const p2 = new window.google.maps.LatLng(loc2.lat, loc2.lng);
        return window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    }
    const R = 6371e3;
    const phi1 = (loc1.lat * Math.PI) / 180;
    const phi2 = (loc2.lat * Math.PI) / 180;
    const deltaPhi = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const deltaLambda = ((loc2.lng - loc1.lng) * Math.PI) / 180;
    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function formatDistance(meters) {
    if (meters == null || isNaN(meters)) return null;
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

const CALOOCAN_CENTER = { lat: 14.7104, lng: 121.0298 };
const CALOOCAN_CITY_HALL_NORTH_LOC = { lat: 14.7505408, lng: 121.0540317 };
const CALOOCAN_CITY_HALL_SOUTH_LOC = { lat: 14.6469, lng: 120.9844 };

const DARK_BASE_RULES = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#070c18" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#19243a" }] },
];

const DARK_CIVIC_MAP_STYLE = [
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

const LIGHT_BASE_RULES = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] },
];

const LIGHT_CIVIC_MAP_STYLE = [
    ...LIGHT_BASE_RULES,
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "administrative.locality", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 2 }] },
    { featureType: "administrative.province", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "administrative.province", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
    { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "administrative.country", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] }
];

export const MAP_CATEGORIES = [
    { id: 'all', label: 'All Incidents' },
    { id: 'water', label: 'Water Supply & Distribution' },
    { id: 'roads', label: 'Roads & Bridges' },
    { id: 'traffic', label: 'Traffic & Road Signs' },
    { id: 'power', label: 'Power & Street Lighting' },
    { id: 'safety', label: 'Public Safety & Hazards' },
    { id: 'facilities', label: 'Public Buildings & Facilities' },
    { id: 'others', label: 'Others' }
];

export function getCategoryColor(category) {
    if (!category) return '#f97316';
    const lower = String(category).toLowerCase();
    if (lower.includes('water') || lower.includes('drain') || lower.includes('flood') || lower.includes('tubig')) return '#3b82f6';
    if (lower.includes('power') || lower.includes('light') || lower.includes('electr') || lower.includes('kuryente')) return '#eab308';
    if (lower.includes('road') || lower.includes('bridge') || lower.includes('pothole') || lower.includes('lubak') || lower.includes('kalsada')) return '#f97316';
    if (lower.includes('safety') || lower.includes('hazard') || lower.includes('danger') || lower.includes('sunog')) return '#ef4444';
    if (lower.includes('building') || lower.includes('facilit') || lower.includes('hall')) return '#10b981';
    if (lower.includes('traffic') || lower.includes('sign')) return '#06b6d4';
    return '#8b5cf6';
}

export function getMarkerSVG(category, status, isSelected = false) {
    let color = '#f97316';
    const cat = (category || '').toLowerCase();
    const isPublicFacility = (cat.includes('facility') || cat.includes('facilities') || cat.includes('building') || cat.includes('park') || cat.includes('court') || cat.includes('hall')) && !cat.includes('safety');

    if (status === 'resolved') color = '#22c55e';
    else if (status === 'pending' || status === 'unverified') color = '#ef4444';
    else if (status === 'in_progress' || status === 'investigating') color = '#f59e0b';
    else if (status === 'rejected') color = '#64748b';

    if (isPublicFacility) {
        color = isSelected ? '#16a34a' : '#22c55e';
    } else if (cat.includes('traffic') || cat.includes('sign')) {
        color = isSelected ? '#0891b2' : '#06b6d4';
    } else if (cat.includes('other')) {
        color = isSelected ? '#7c3aed' : '#8b5cf6';
    } else if (cat.includes('water') || cat.includes('drain')) {
        color = isSelected ? '#2563eb' : '#3b82f6';
    } else if (cat.includes('power') || cat.includes('light')) {
        color = isSelected ? '#d97706' : '#eab308';
    } else if (cat.includes('safety')) {
        color = isSelected ? '#dc2626' : '#ef4444';
    }

    let svgIcon = '';
    if (cat.includes('flood') || cat.includes('water') || cat.includes('drain')) {
        svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
    } else if (cat.includes('electric') || cat.includes('wire') || cat.includes('power') || cat.includes('light') || cat.includes('street')) {
        svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
    } else if (cat.includes('road') || cat.includes('pothole') || cat.includes('bridge') || cat.includes('infrastructure')) {
        svgIcon = `<path d="M12 2a6 6 0 0 0-6 6v2H4v2h16v-2h-2V8a6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4v2H8V8a4 4 0 0 1 4-4z" fill="white"/>`;
    } else if (isPublicFacility) {
        svgIcon = `<path d="M4 22V4c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v18H4zm4-4h2v-2H8v2zm0-4h2v-2H8v2zm0-4h2V8H8v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v2z" fill="white"/>`;
    } else if (cat.includes('traffic') || cat.includes('sign')) {
        svgIcon = `<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" fill="white"/>`;
    } else if (cat.includes('other')) {
        svgIcon = `<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm1.07-7.75l-.9.92C12.45 10.9 12 11.5 12 13h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41a2 2 0 1 0-4 0H7a4 4 0 1 1 8 0c0 .88-.36 1.68-.93 2.25z" fill="white"/>`;
    } else {
        svgIcon = `<path d="M12 2L1 21h22L12 2zm0 3.5l7 13.5H5l7-13.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" fill="white"/>`;
    }

    const strokeColor = isSelected ? '#ffffff' : '#ffffff';
    const strokeWidth = isSelected ? '3.5' : '2.5';
    const scale = isSelected ? '1.15' : '1.0';

    const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 46" width="40" height="46">
            <g transform="scale(${scale})" transform-origin="20 23">
                <path d="M20 44c0 0 16-15.5 16-24a16 16 0 0 0-32 0c0 8.5 16 24 16 24z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" filter="drop-shadow(0px 3px 2px rgba(0,0,0,0.3))" />
                <circle cx="20" cy="18" r="11" fill="rgba(0,0,0,0.22)"/>
                <g transform="translate(10, 8) scale(0.8)">
                    ${svgIcon}
                </g>
            </g>
        </svg>
    `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
}

export const CATEGORY_TILES = [
    { id: 'all', shortLabel: 'All', fullLabel: 'All Categories', icon: Menu },
    { id: 'water', shortLabel: 'Water', fullLabel: 'Water Supply & Distribution', icon: Droplets },
    { id: 'roads', shortLabel: 'Roads', fullLabel: 'Roads & Bridges', icon: Mountain },
    { id: 'power', shortLabel: 'Power', fullLabel: 'Power & Street Lighting', icon: Zap },
    { id: 'traffic', shortLabel: 'Traffic', fullLabel: 'Traffic & Road Signs', icon: Car },
    { id: 'safety', shortLabel: 'Safety', fullLabel: 'Public Safety & Hazards', icon: AlertTriangle },
    { id: 'facilities', shortLabel: 'Buildings', fullLabel: 'Public Buildings & Facilities', icon: Building2 },
    { id: 'others', shortLabel: 'Others', fullLabel: 'Other Incidents', icon: MoreHorizontal }
];

export function getCategoryIconComponent(category, rawCategory) {
    const cat = (category || rawCategory || '').toLowerCase();
    if (cat.includes('water') || cat.includes('flood') || cat.includes('drain')) return Droplets;
    if (cat.includes('power') || cat.includes('light') || cat.includes('electric')) return Zap;
    if (cat.includes('road') || cat.includes('bridge') || cat.includes('pothole')) return Mountain;
    if (cat.includes('safety') || cat.includes('hazard') || cat.includes('danger')) return AlertTriangle;
    if (cat.includes('building') || cat.includes('facility') || cat.includes('hall')) return Building2;
    if (cat.includes('traffic') || cat.includes('sign')) return Car;
    return MoreHorizontal;
}

export function IssueStatusPill({ status }) {
    const s = (status || 'received').toLowerCase();
    let label = 'Received';

    if (s === 'resolved') {
        label = 'Resolved';
    } else if (s === 'in_progress' || s === 'in progress' || s === 'investigating') {
        label = 'In Progress';
    } else if (s === 'assigned') {
        label = 'Assigned';
    } else if (s === 'verified') {
        label = 'Verified';
    } else if (s === 'received' || s === 'pending') {
        label = 'Received';
    }

    return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-black dark:text-white shadow-2xs">
            {label}
        </span>
    );
}

export function matchesCategory(r, catId) {
    if (!catId || catId === 'all') return true;
    const rawCat = (r.raw_category || r.category || '').toLowerCase();
    const aiCat = (r.ai_category || '').toLowerCase();
    const title = (r.title || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    const fullText = `${rawCat} ${aiCat} ${title} ${desc}`;

    switch (catId) {
        case 'water':
            return ['water', 'tubig', 'baha', 'flood', 'drain', 'leak', 'pipe', 'tubo', 'sewer', 'canal', 'barado'].some(k => fullText.includes(k));
        case 'power':
            return ['power', 'light', 'electric', 'kuryente', 'wire', 'poste', 'lamp', 'blackout'].some(k => fullText.includes(k));
        case 'roads':
            return ['road', 'bridge', 'pothole', 'lubak', 'kalsada', 'asphalt', 'crack', 'pavement', 'tulay', 'sidewalk'].some(k => fullText.includes(k));
        case 'safety':
            return ['safety', 'hazard', 'danger', 'collapse', 'sunog', 'fire', 'landslide', 'emergency'].some(k => fullText.includes(k));
        case 'facilities':
            return ['building', 'facility', 'hall', 'clinic', 'hospital', 'court', 'park', 'school', 'center'].some(k => fullText.includes(k));
        case 'traffic':
            return ['traffic', 'sign', 'signage', 'signal', 'stoplight', 'blockage', 'illegal parking'].some(k => fullText.includes(k));
        case 'others':
            return !['water', 'tubig', 'baha', 'flood', 'drain', 'leak', 'pipe', 'tubo', 'sewer', 'canal', 'barado',
                     'power', 'light', 'electric', 'kuryente', 'wire', 'poste', 'lamp', 'blackout',
                     'road', 'bridge', 'pothole', 'lubak', 'kalsada', 'asphalt', 'crack', 'pavement', 'tulay', 'sidewalk',
                     'safety', 'hazard', 'danger', 'collapse', 'sunog', 'fire', 'landslide', 'emergency',
                     'building', 'facility', 'hall', 'clinic', 'hospital', 'court', 'park', 'school', 'center',
                     'traffic', 'sign', 'signage', 'signal', 'stoplight', 'blockage', 'illegal parking'].some(k => fullText.includes(k));
        default:
            return true;
    }
}

/**
 * NearbyIssuesMapModal
 *
 * Renders the PULSO Civic Aperture GIS Map with Fullscreen Map & Redesigned Bottom Panel:
 * - Full-screen Map with authoritative Caloocan boundaries & photo-pins
 * - Top-right floating controls: Close (X), Satellite View, My Location (48px round buttons)
 * - Bottom Draggable Panel (3 snap positions: collapsed, half, full; 26rem card on desktop)
 * - Row 1: Title "Nearby issues", orange count chip, Minimize/Show list button
 * - Area control (All Caloocan, North Caloocan, South Caloocan)
 * - Category tiles 4x2 grid with live counts and disabled empty states
 * - Vertically scrolling list of issues with thumbnails, titles, sublines, status pills & themed scrollbar
 */
export default function NearbyIssuesMapModal({
    isOpen = true,
    onClose,
    theme = 'dark',
    isLoaded = true,
    loadError = null,
    reports = [],
    reportLocation = null,
    setReportLocation,
    isLocating = false,
    requestDeviceLocation,
    locationPermissionDenied = false,
    checkJurisdiction,
    reverseGeocode,
    onOpenReportDetail,
    standalone = false,
    photoPinIcons: externalPhotoPinIcons = null,
    initialSheetPosition = 'half'
}) {
    const isDark = theme === 'dark';
    const [map, setMap] = useState(null);
    const [mapLayerType, setMapLayerType] = useState('roadmap'); // 'roadmap' | 'hybrid'
    const [activeSector, setActiveSector] = useState('all'); // 'all' | 'north' | 'south'
    const [activeCategory, setActiveCategory] = useState('all'); // category id
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedHazard, setSelectedHazard] = useState(null);
    const [svLocation, setSvLocation] = useState(null);
    const [panorama, setPanorama] = useState(null);
    const [isSvFullscreen, setIsSvFullscreen] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(11);

    // Draggable bottom sheet state: 'collapsed' | 'half' | 'full'
    const [panelSnap, setPanelSnap] = useState(initialSheetPosition || 'half');

    useEffect(() => {
        if (initialSheetPosition) {
            setPanelSnap(initialSheetPosition);
        }
    }, [initialSheetPosition]);

    const dragStartY = useRef(0);
    const dragStartSnap = useRef('half');
    const isDragging = useRef(false);

    const handlePointerDown = (e) => {
        isDragging.current = true;
        dragStartY.current = e.clientY;
        dragStartSnap.current = panelSnap;
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current) return;
    };

    const handlePointerUp = (e) => {
        if (!isDragging.current) return;
        isDragging.current = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        const deltaY = e.clientY - dragStartY.current;

        if (deltaY > 40) {
            if (dragStartSnap.current === 'full') setPanelSnap('half');
            else if (dragStartSnap.current === 'half') setPanelSnap('collapsed');
        } else if (deltaY < -40) {
            if (dragStartSnap.current === 'collapsed') setPanelSnap('half');
            else if (dragStartSnap.current === 'half') setPanelSnap('full');
        } else if (Math.abs(deltaY) <= 10) {
            setPanelSnap(prev => prev === 'collapsed' ? 'half' : 'collapsed');
        }
    };

    const listContainerRef = useRef(null);
    const itemRefs = useRef({});

    useEffect(() => {
        if (selectedHazard?.id && itemRefs.current[selectedHazard.id]) {
            itemRefs.current[selectedHazard.id].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [selectedHazard?.id]);

    const pinIconCache = useRef(typeof window !== 'undefined' && window.Map ? new window.Map() : new Map());
    const iconCacheRef = useRef(typeof window !== 'undefined' && window.Map ? new window.Map() : new Map());
    const [internalPhotoPinIcons, setInternalPhotoPinIcons] = useState({});

    const photoPinIcons = useMemo(() => {
        return { ...(externalPhotoPinIcons || {}), ...internalPhotoPinIcons };
    }, [externalPhotoPinIcons, internalPhotoPinIcons]);

    // Memoized Google Maps Icon Object Cache to prevent MarkerF re-render flicker
    const getCachedIcon = useCallback((url, w, h, ax, ay) => {
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
    }, []);

    // Reports filtered by sector only (used to compute category counts)
    const sectorFilteredReports = useMemo(() => {
        if (!Array.isArray(reports)) return [];

        return reports.filter(r => {
            const lat = parseFloat(r.lat ?? r.location_lat ?? r.latitude);
            const lng = parseFloat(r.lng ?? r.location_lng ?? r.longitude);
            if (isNaN(lat) || isNaN(lng)) return false;

            // Sector Filter
            if (activeSector !== 'all') {
                const district = getCaloocanDistrict(lat, lng);
                const locStr = (r.location || r.location_string || r.barangay || '').toLowerCase();
                if (activeSector === 'north') {
                    if (district !== 'north' && !locStr.includes('north') && !locStr.includes('165') && !locStr.includes('171')) return false;
                } else if (activeSector === 'south') {
                    if (district !== 'south' && !locStr.includes('south')) return false;
                }
            }

            return true;
        });
    }, [reports, activeSector]);

    // Live counts for all 8 category tiles within current sector
    const categoryCounts = useMemo(() => {
        const counts = {};
        CATEGORY_TILES.forEach(cat => {
            counts[cat.id] = sectorFilteredReports.filter(r => matchesCategory(r, cat.id)).length;
        });
        return counts;
    }, [sectorFilteredReports]);

    // Reports filtered by activeSector & activeCategory
    const filteredReports = useMemo(() => {
        return sectorFilteredReports.filter(r => matchesCategory(r, activeCategory)).map(r => {
            const lat = parseFloat(r.lat ?? r.location_lat ?? r.latitude);
            const lng = parseFloat(r.lng ?? r.location_lng ?? r.longitude);
            const hasUserLocation = reportLocation?.lat && reportLocation?.lng;
            const meters = hasUserLocation ? getDistance(reportLocation, { lat, lng }) : null;
            return {
                ...r,
                lat,
                lng,
                distanceMeters: meters,
                formattedDistance: meters != null ? formatDistance(meters) : null
            };
        });
    }, [sectorFilteredReports, activeCategory, reportLocation]);

    // Pagination: 5 issues per page
    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE));

    useEffect(() => {
        setCurrentPage(1);
    }, [activeSector, activeCategory]);

    const paginatedReports = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredReports.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredReports, currentPage]);

    // If an issue is selected from map pins, ensure it's on the active page
    useEffect(() => {
        if (!selectedHazard?.id || filteredReports.length === 0) return;
        const index = filteredReports.findIndex(r => r.id === selectedHazard.id);
        if (index !== -1) {
            const targetPage = Math.floor(index / ITEMS_PER_PAGE) + 1;
            if (targetPage !== currentPage) {
                setCurrentPage(targetPage);
            }
        }
    }, [selectedHazard?.id]);

    // Screen reader announcement for filter changes (WCAG 2.2 AA)
    const [ariaAnnouncement, setAriaAnnouncement] = useState('');

    useEffect(() => {
        const currentCatObj = CATEGORY_TILES.find(c => c.id === activeCategory);
        const catLabel = currentCatObj ? currentCatObj.shortLabel : 'All';
        const areaLabel = activeSector === 'all' ? 'All Caloocan' : activeSector === 'north' ? 'North Caloocan' : 'South Caloocan';
        setAriaAnnouncement(`${filteredReports.length} issues shown, Page ${currentPage} of ${totalPages}, ${catLabel}, Area: ${areaLabel}`);
    }, [filteredReports.length, activeCategory, activeSector, currentPage, totalPages]);

    // Generate high-performance Canvas Image Pins for Native Google Maps MarkerF
    // (Size-optimized thumbnails, status borders & pointer arrow matching Government Dispatcher Command Center)
    useEffect(() => {
        if (!filteredReports || filteredReports.length === 0) return;

        let isMounted = true;
        let batchTimer = null;
        const pendingBatch = {};

        const flushBatch = () => {
            if (!isMounted || Object.keys(pendingBatch).length === 0) return;
            setInternalPhotoPinIcons(prev => ({ ...prev, ...pendingBatch }));
        };

        filteredReports.forEach(report => {
            const rawImg = report.image_url || report.photo_url || report.photo_thumbnail || report.media_url || report.image;
            if (!rawImg) return;

            [false, true].forEach(isSelected => {
                const cacheKey = `${report.id}-${isSelected ? 'sel' : 'norm'}`;
                if (pinIconCache.current.has(cacheKey)) return;

                let thumbUrl = rawImg;
                if (!rawImg.startsWith('http') && !rawImg.startsWith('data:')) {
                    const cleanPath = rawImg.startsWith('/') ? rawImg : `/${rawImg}`;
                    thumbUrl = `${API_BASE_URL}/api/thumbnails?src=${encodeURIComponent(cleanPath)}&size=80`;
                }

                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    if (!isMounted) return;
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

                        // Outer Border Ring
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
                        // fallback to default svg
                    }
                };
                img.onerror = () => {
                    if (thumbUrl.includes('/api/thumbnails')) {
                        const fallbackImg = new Image();
                        fallbackImg.crossOrigin = 'anonymous';
                        fallbackImg.onload = img.onload;
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
    }, [filteredReports]);

    // Handle Sector jump
    const handleSectorChange = (sector) => {
        setActiveSector(sector);
        if (!map || !window.google?.maps) return;

        if (sector === 'north') {
            map.panTo(NORTH_CALOOCAN_CENTROID || { lat: 14.7566, lng: 121.0450 });
            map.setZoom(12);
        } else if (sector === 'south') {
            map.panTo(SOUTH_CALOOCAN_CENTROID || { lat: 14.6500, lng: 120.9850 });
            map.setZoom(12);
        } else {
            const bounds = new window.google.maps.LatLngBounds(
                new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
                new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
            );
            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }
    };

    const handleStreetViewClick = (loc) => {
        setSvLocation(loc);
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className={`relative flex flex-col h-full w-full bg-[#0c1427] rounded-none sm:rounded-3xl overflow-hidden shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 ${isSvFullscreen ? 'fixed inset-0 z-[100] rounded-none border-0' : ''}`}>
            {/* Screen Reader Live Announcements */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">{ariaAnnouncement}</div>

            {/* Map Canvas Region — Fullscreen behind bottom panel */}
            <div className="absolute inset-0 w-full h-full overflow-hidden [&_.gm-style-cc]:!hidden [&_.gmnoprint]:!hidden [&_button[title*='shortcuts']]:!hidden [&_button[aria-label*='shortcuts']]:!hidden [&_a[href*='terms_maps']]:!hidden">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={CALOOCAN_CENTER}
                        zoom={11}
                        mapTypeId={mapLayerType}
                        options={{
                            styles: mapLayerType === 'hybrid'
                                ? []
                                : (isDark ? DARK_CIVIC_MAP_STYLE : LIGHT_CIVIC_MAP_STYLE),
                            disableDefaultUI: true,
                            zoomControl: false,
                            gestureHandling: 'greedy',
                            keyboardShortcuts: false
                        }}
                        onZoomChanged={() => {
                            if (map) {
                                const z = map.getZoom();
                                if (typeof z === 'number') setCurrentZoom(z);
                            }
                        }}
                        onLoad={m => {
                            setMap(m);
                            if (window.google?.maps) {
                                const bounds = new window.google.maps.LatLngBounds(
                                    new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
                                    new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
                                );
                                m.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
                            }
                        }}
                        onClick={(e) => {
                            if (e.latLng && setReportLocation) {
                                const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                                if (!checkJurisdiction || checkJurisdiction(newPos)) {
                                    setReportLocation({ ...newPos, confirmed: true, source: 'pinpoint', accuracy: 0, isExact: true });
                                    if (reverseGeocode) reverseGeocode(newPos.lat, newPos.lng);
                                }
                            }
                        }}
                    >
                        {/* Precision Draggable Location Marker if picking location */}
                        {reportLocation?.lat && setReportLocation && (
                            <MarkerF
                                position={reportLocation}
                                draggable={true}
                                onDragEnd={(e) => {
                                    if (e.latLng) {
                                        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                                        if (!checkJurisdiction || checkJurisdiction(newPos)) {
                                            setReportLocation({ ...newPos, confirmed: true, source: 'pinpoint', accuracy: 0, isExact: true });
                                            if (reverseGeocode) reverseGeocode(newPos.lat, newPos.lng);
                                        }
                                    }
                                }}
                                zIndex={1000}
                                title="Report Location"
                            />
                        )}

                        {/* Authoritative Dual-Sector Caloocan Boundary Layer */}
                        <CaloocanBoundaryLayer
                            activeSector={activeSector}
                            onSectorClick={(sector) => handleSectorChange(sector)}
                            isDarkMode={isDark}
                            zoom={currentZoom}
                            showBarangays={true}
                            showLabels={false}
                            interactive={true}
                        />

                        {/* Caloocan City Hall North HQ Pin (Landmark Facade Badge) */}
                        <MarkerF 
                            position={CALOOCAN_CITY_HALL_NORTH_LOC}
                            zIndex={300}
                            options={{
                                optimized: false,
                                clickable: true
                            }}
                            icon={window.google?.maps ? {
                                url: getCityHallMarkerSvg({ sector: 'north', isDarkMode: isDark }),
                                scaledSize: new window.google.maps.Size(42, 42),
                                anchor: new window.google.maps.Point(21, 21)
                            } : undefined}
                            title="Caloocan City Hall North"
                        />

                        {/* Caloocan City Hall South HQ Pin (Landmark Facade Badge) */}
                        <MarkerF 
                            position={CALOOCAN_CITY_HALL_SOUTH_LOC}
                            zIndex={300}
                            options={{
                                optimized: false,
                                clickable: true
                            }}
                            icon={window.google?.maps ? {
                                url: getCityHallMarkerSvg({ sector: 'south', isDarkMode: isDark }),
                                scaledSize: new window.google.maps.Size(42, 42),
                                anchor: new window.google.maps.Point(21, 21)
                            } : undefined}
                            title="Caloocan City Hall South"
                        />

                        {/* Animated Sonar User Location Overlay */}
                        {reportLocation?.lat && !setReportLocation && (
                            <OverlayViewF
                                position={reportLocation}
                                mapPaneName="overlayMouseTarget"
                                getPixelPositionOffset={() => ({ x: -24, y: -24 })}
                            >
                                <div className="relative flex items-center justify-center w-12 h-12 pointer-events-none select-none">
                                    <div className="absolute inset-0 rounded-full bg-blue-500/25 animate-ping" />
                                    <div className="relative z-10 w-5 h-5 bg-blue-600 rounded-full border-[3px] border-white shadow-lg shadow-blue-500/50" />
                                </div>
                            </OverlayViewF>
                        )}

                        {/* Incident Markers — with Photo-Pins matching Government side */}
                        {filteredReports.map(h => {
                            const isSelected = selectedHazard?.id === h.id;
                            const cacheKey = `${h.id}-${isSelected ? 'sel' : 'norm'}`;
                            const customIconUrl = photoPinIcons[cacheKey];

                            const size = isSelected ? 46 : 36;
                            const pointerH = isSelected ? 8 : 7;
                            const totalW = size + 6;
                            const totalH = size + pointerH + 2;

                            const iconConfig = customIconUrl
                                ? getCachedIcon(customIconUrl, totalW, totalH, totalW / 2, totalH)
                                : (window.google?.maps ? {
                                    url: getMarkerSVG(h.category || h.raw_category, h.status, isSelected),
                                    scaledSize: new window.google.maps.Size(isSelected ? 44 : 36, isSelected ? 50 : 42),
                                    anchor: new window.google.maps.Point(isSelected ? 22 : 18, isSelected ? 50 : 42)
                                } : undefined);

                            return (
                                <MarkerF
                                    key={`hazard-${h.id}`}
                                    position={{ lat: h.lat, lng: h.lng }}
                                    zIndex={isSelected ? 1000 : 150}
                                    title={`${h.title} (${(h.status || 'PENDING').toUpperCase()})`}
                                    onClick={() => setSelectedHazard(h)}
                                    options={{
                                        optimized: true,
                                        clickable: true
                                    }}
                                    icon={iconConfig}
                                />
                            );
                        })}

                        {/* Sleek Government-Grade InfoWindow */}
                        {selectedHazard && (
                            <InfoWindowF
                                position={{ lat: selectedHazard.lat, lng: selectedHazard.lng }}
                                onCloseClick={() => setSelectedHazard(null)}
                                options={{
                                    pixelOffset: window.google?.maps ? new window.google.maps.Size(0, -42) : undefined,
                                    zIndex: 1000
                                }}
                            >
                                {(() => {
                                    const catColor = getCategoryColor(selectedHazard.category || selectedHazard.raw_category);
                                    const photoUrl = selectedHazard.photo_url || selectedHazard.photo_thumbnail || selectedHazard.image_url || selectedHazard.media_url || selectedHazard.image;
                                    const distanceStr = selectedHazard.formattedDistance || selectedHazard.dynamicDistance || selectedHazard.distance;

                                    return (
                                        <div style={{
                                            background: isDark ? 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)' : '#ffffff',
                                            borderRadius: '16px',
                                            padding: '16px',
                                            minWidth: '230px',
                                            maxWidth: '280px',
                                            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                                            margin: '-10px',
                                            boxShadow: isDark ? '0 25px 50px rgba(0,0,0,0.7)' : '0 10px 25px rgba(0,0,0,0.1)',
                                            fontFamily: 'Inter,system-ui,sans-serif',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            position: 'relative'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedHazard(null)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '10px',
                                                    right: '10px',
                                                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '26px',
                                                    height: '26px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: isDark ? '#94a3b8' : '#64748b'
                                                }}
                                            >×</button>

                                            {photoUrl ? (
                                                <div style={{ width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden', marginBottom: '10px', border: `2px solid ${catColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                                    <img
                                                        src={photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`}`}
                                                        alt={selectedHazard.title}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '50%',
                                                    background: `${catColor}20`,
                                                    border: `1.5px solid ${catColor}50`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginBottom: '10px',
                                                    color: catColor
                                                }}>
                                                    <AlertTriangle size={20} />
                                                </div>
                                            )}

                                            {selectedHazard.ticket_id && (
                                                <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                                                    {selectedHazard.ticket_id}
                                                </div>
                                            )}

                                            <div style={{
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                letterSpacing: '0.12em',
                                                color: selectedHazard.status === 'resolved' ? '#4ade80' : selectedHazard.status === 'pending' ? '#f87171' : '#fb923c',
                                                background: selectedHazard.status === 'resolved' ? 'rgba(74,222,128,0.12)' : selectedHazard.status === 'pending' ? 'rgba(248,113,113,0.12)' : 'rgba(251,146,60,0.12)',
                                                padding: '3px 12px',
                                                borderRadius: '999px',
                                                marginBottom: '6px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {selectedHazard.status || 'Received'}
                                            </div>

                                            {/* Ownership & Identity Protection Indicator */}
                                            {selectedHazard.isOwnReport ? (
                                                <div style={{
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    color: '#ff6b00',
                                                    background: 'rgba(255,107,0,0.12)',
                                                    border: '1px solid rgba(255,107,0,0.25)',
                                                    padding: '2px 10px',
                                                    borderRadius: '999px',
                                                    marginBottom: '8px'
                                                }}>
                                                    Your Report
                                                </div>
                                            ) : (
                                                <div style={{
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    color: isDark ? '#94a3b8' : '#64748b',
                                                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                                                    padding: '2px 10px',
                                                    borderRadius: '999px',
                                                    marginBottom: '8px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <ShieldCheck size={11} /> Community Report · Identity Protected
                                                </div>
                                            )}

                                            <h4 style={{
                                                fontWeight: 700,
                                                fontSize: '14px',
                                                color: isDark ? '#f1f5f9' : '#0f172a',
                                                lineHeight: '1.35',
                                                margin: '0 0 4px',
                                                padding: '0 12px'
                                            }}>{selectedHazard.title}</h4>

                                            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', color: catColor, marginBottom: '10px', textTransform: 'uppercase' }}>
                                                {selectedHazard.category || selectedHazard.raw_category}
                                            </p>

                                            {distanceStr && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                                                    borderRadius: '999px',
                                                    padding: '4px 12px',
                                                    marginBottom: '12px'
                                                }}>
                                                    <span style={{ color: catColor, display: 'flex' }}><MapPin size={12} /></span>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569' }}>
                                                        {distanceStr} away
                                                    </span>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStreetViewClick({ lat: selectedHazard.lat, lng: selectedHazard.lng })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 0',
                                                        background: `linear-gradient(135deg, ${catColor}, ${catColor}dd)`,
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        color: 'white',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        boxShadow: `0 4px 16px ${catColor}40`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <Eye size={14} /> Open Street View
                                                </button>

                                                {onOpenReportDetail && selectedHazard.isOwnReport && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenReportDetail(selectedHazard)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 0',
                                                            background: 'transparent',
                                                            border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                                                            borderRadius: '12px',
                                                            color: isDark ? '#f1f5f9' : '#334155',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        View in My Reports
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </InfoWindowF>
                        )}

                        {/* Street View Overlay */}
                        {svLocation && (
                            <>
                                <StreetViewPanorama
                                    position={svLocation}
                                    visible={true}
                                    options={{
                                        enableCloseButton: false,
                                        fullscreenControl: false,
                                        zoomControl: false,
                                        motionTracking: false,
                                        motionTrackingControl: false,
                                        linksControl: true,
                                        panControl: false,
                                        addressControl: false
                                    }}
                                    onLoad={(pano) => setPanorama(pano)}
                                />
                                {/* Top Controls Overlay on Street View */}
                                <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-40 flex items-center justify-between pointer-events-none gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleStreetViewClick(null)}
                                        aria-label="Back to Map"
                                        className="pointer-events-auto h-11 min-h-[44px] px-4 rounded-full bg-slate-900/90 hover:bg-orange-600 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-bold shrink-0"
                                    >
                                        <ChevronLeft size={18} strokeWidth={2.5} />
                                        <span>Back to Map</span>
                                    </button>

                                    {selectedHazard && (
                                        <div className="pointer-events-auto hidden xs:flex items-center gap-2 bg-slate-950/90 text-white border border-slate-700/70 shadow-2xl rounded-full px-3.5 py-2 text-xs font-semibold backdrop-blur-md max-w-[50%] sm:max-w-[60%] truncate">
                                            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 animate-pulse" />
                                            <span className="text-slate-400 font-medium shrink-0">Viewing:</span>
                                            <span className="font-bold text-white truncate">{selectedHazard.title || 'Reported Location'}</span>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setIsSvFullscreen(prev => !prev)}
                                        aria-label={isSvFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                        className="pointer-events-auto w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-slate-900/90 hover:bg-orange-600 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                                    >
                                        {isSvFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                    </button>
                                </div>
                            </>
                        )}
                    </GoogleMap>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-6 text-center">
                        {loadError ? (
                            <div className="max-w-xs flex flex-col items-center">
                                <AlertTriangle size={36} className="text-amber-500 mb-3" />
                                <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                                    We can't load the map right now.
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    Please check your network connection and try again.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="min-h-[44px] px-6 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-md active:scale-95 cursor-pointer"
                                >
                                    Try again
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <PulsoPulseLine isDark={isDark} width={180} height={24} />
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3">
                                    Loading map...
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Floating Top-Left Back Button (< Chevron) */}
            {!svLocation && (
                <div className="absolute top-[calc(env(safe-area-inset-top,0px)+1rem)] left-4 sm:left-6 z-30 pointer-events-auto">
                    <button
                        type="button"
                        onClick={() => {
                            if (svLocation) handleStreetViewClick(null);
                            else if (onClose) onClose();
                        }}
                        aria-label="Back to dashboard"
                        title="Back"
                        className="group w-12 h-12 rounded-full bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center text-slate-800 dark:text-white hover:bg-[#ff6b00] hover:border-[#ff6b00] hover:text-white active:scale-95 transition-all cursor-pointer"
                    >
                        <ChevronLeft size={22} strokeWidth={2.5} className="mr-0.5 text-slate-800 dark:text-white group-hover:text-white transition-colors" />
                    </button>
                </div>
            )}

            {/* Floating Top-Right Controls Stack (Satellite View & My Location) */}
            {!svLocation && (
                <div className="absolute top-[calc(env(safe-area-inset-top,0px)+1rem)] right-4 sm:right-6 z-30 flex flex-col gap-3 items-end pointer-events-auto">
                    {/* Satellite View Toggle (48px round button) */}
                    <button
                        type="button"
                        onClick={() => setMapLayerType(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
                        aria-label={mapLayerType === 'roadmap' ? 'Switch to Satellite view' : 'Switch to Civic view'}
                        title={mapLayerType === 'roadmap' ? 'Satellite View' : 'Civic View'}
                        className={`group w-12 h-12 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                            mapLayerType === 'hybrid'
                                ? 'bg-[#ff6b00] border-[#ff6b00] hover:bg-[#e65c00] text-white shadow-orange-500/25'
                                : 'bg-white dark:bg-[#0c1427] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:bg-[#ff6b00] hover:border-[#ff6b00] hover:text-white'
                        }`}
                    >
                        <Layers size={20} className={mapLayerType === 'hybrid' ? 'text-white' : 'text-slate-800 dark:text-white group-hover:text-white transition-colors'} />
                    </button>

                    {/* My Location GPS (48px round button) */}
                    <button
                        type="button"
                        onClick={() => {
                            if (requestDeviceLocation) requestDeviceLocation(true);
                            if (map && reportLocation?.lat) {
                                map.panTo({ lat: reportLocation.lat, lng: reportLocation.lng });
                                map.setZoom(15);
                            }
                        }}
                        aria-label={isLocating ? 'Locating device...' : 'My location'}
                        title={isLocating ? 'Locating...' : 'My Location'}
                        className="group w-12 h-12 rounded-full bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center text-slate-800 dark:text-white hover:bg-[#ff6b00] hover:border-[#ff6b00] hover:text-white active:scale-95 transition-all cursor-pointer"
                    >
                        <Crosshair size={20} className={isLocating ? 'animate-spin text-orange-500' : 'text-slate-800 dark:text-white group-hover:text-white transition-colors'} />
                    </button>
                </div>
            )}

            {/* Redesigned Nearby Issues Bottom Panel */}
            {!svLocation && (
                <div
                    role="region"
                    aria-label="Nearby issues"
                    style={{
                        height: panelSnap === 'collapsed' ? '5.25rem' : panelSnap === 'full' ? '88%' : '50%'
                    }}
                    className={`z-20 flex flex-col bg-white dark:bg-[#0c1427] border-t border-slate-200 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] transition-[height] duration-300 motion-reduce:transition-none ease-out select-none
                        absolute inset-x-0 bottom-0 rounded-t-[1.25rem] pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)]
                        ${!standalone ? 'md:left-6 md:bottom-6 md:w-[26rem] md:max-h-[720px] md:rounded-2xl md:border md:border-slate-200 md:dark:border-slate-800 md:shadow-2xl md:pb-0' : ''}
                    `}
                >
                    {/* Centered Drag Handle & Header Row 1 */}
                    <div className="px-4 sm:px-5 pt-2 pb-1 shrink-0 select-none">
                        {/* Centered Drag Handle (2.5rem x 0.25rem = w-10 h-1) */}
                        <div
                            className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700/80 mx-auto mb-2 cursor-grab active:cursor-grabbing touch-none p-1 -m-1"
                            role="button"
                            tabIndex={0}
                            aria-label={panelSnap === 'full' ? 'Minimize list' : 'Expand list'}
                            aria-expanded={panelSnap === 'full'}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onClick={(e) => {
                                e.stopPropagation();
                                setPanelSnap(prev => prev === 'full' ? 'half' : 'full');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setPanelSnap(prev => prev === 'full' ? 'half' : 'full');
                                }
                            }}
                        />

                        {/* Row 1: Title, Count Chip & Expand / Collapse actions */}
                        <div className="flex items-center justify-between gap-1.5 min-h-[3rem]">
                            <div className="flex items-center gap-2 shrink-0">
                                <h2 className="text-lg xs:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                                    Nearby issues
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-black dark:text-white shadow-2xs shrink-0 whitespace-nowrap">
                                    {filteredReports.length} nearby
                                </span>
                            </div>

                            {panelSnap === 'collapsed' ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPanelSnap('half');
                                    }}
                                    aria-label="Expand list"
                                    aria-expanded="false"
                                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium flex items-center gap-1.5 min-h-[48px] px-2 -mr-2 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                                >
                                    <span className="whitespace-nowrap">Expand</span>
                                    <ChevronUp size={14} className="shrink-0" />
                                </button>
                            ) : panelSnap === 'full' ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPanelSnap('half');
                                    }}
                                    aria-label="Collapse to 2nd stage"
                                    aria-expanded="false"
                                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium flex items-center gap-1.5 min-h-[48px] px-2 -mr-2 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                                >
                                    <span className="whitespace-nowrap">Collapse</span>
                                    <ChevronDown size={14} className="shrink-0" />
                                </button>
                            ) : (
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPanelSnap('full');
                                        }}
                                        aria-label="Expand to full view"
                                        aria-expanded="false"
                                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium flex items-center gap-1 min-h-[48px] px-2 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                                    >
                                        <span className="whitespace-nowrap">Expand</span>
                                        <ChevronUp size={14} className="shrink-0" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPanelSnap('collapsed');
                                        }}
                                        aria-label="Collapse list"
                                        aria-expanded="true"
                                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium flex items-center gap-1 min-h-[48px] px-2 -mr-2 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                                    >
                                        <span className="whitespace-nowrap">Collapse</span>
                                        <ChevronDown size={14} className="shrink-0" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expanded Content Area: Area Control, Categories, & Issue List */}
                    {panelSnap !== 'collapsed' && (
                        <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-5 pb-3 gap-3">
                            {/* Area Control (3 equal segments, 48px tall) */}
                            <div
                                role="radiogroup"
                                aria-label="Area"
                                className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 dark:bg-[#101b33] border border-slate-200/80 dark:border-slate-800/80 h-12 shrink-0 select-none"
                            >
                                {[
                                    { id: 'all', label: 'All Caloocan' },
                                    { id: 'north', label: 'North Caloocan' },
                                    { id: 'south', label: 'South Caloocan' }
                                ].map(sector => {
                                    const isSelected = activeSector === sector.id;
                                    return (
                                        <button
                                            key={sector.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            onClick={() => handleSectorChange(sector.id)}
                                            className={`text-[13px] xs:text-sm font-semibold rounded-lg transition-all flex items-center justify-center cursor-pointer select-none ${
                                                isSelected
                                                    ? 'bg-[#ff6b00] text-white font-bold shadow-xs'
                                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            {sector.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Section Label: ISSUE CATEGORIES (clean text, no blue border/outline) */}
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase select-none outline-none border-0 pt-0.5">
                                ISSUE CATEGORIES
                            </div>

                            {/* Category Tiles Grid: 4 cols x 2 rows, equal width, 4.5rem tall, 0.5rem gaps */}
                            <div
                                role="radiogroup"
                                aria-label="Issue categories"
                                className="grid grid-cols-4 gap-2 shrink-0 select-none"
                            >
                                {CATEGORY_TILES.map(cat => {
                                    const count = categoryCounts[cat.id] || 0;
                                    const isSelected = activeCategory === cat.id;
                                    const isDisabled = count === 0;
                                    const IconComponent = cat.icon;

                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            aria-label={`${cat.fullLabel}, ${count} issues`}
                                            aria-disabled={isDisabled ? 'true' : undefined}
                                            disabled={isDisabled}
                                            onClick={() => {
                                                if (!isDisabled) setActiveCategory(cat.id);
                                            }}
                                            className={`h-[4.5rem] rounded-xl p-2 flex flex-col justify-between text-left transition-all relative ${
                                                isDisabled
                                                    ? 'opacity-55 cursor-not-allowed bg-slate-100/50 dark:bg-[#111c33]/50 border border-slate-200/50 dark:border-slate-800/40 text-slate-400 dark:text-slate-500'
                                                    : isSelected
                                                        ? 'bg-[#ff6b00]/10 dark:bg-[#ff6b00]/15 border border-[#ff6b00] text-[#B83A00] dark:text-[#ff6b00] shadow-2xs cursor-pointer'
                                                        : 'bg-slate-100/80 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${
                                                    isSelected ? 'text-[#B83A00] dark:text-[#ff6b00]' : 'text-slate-600 dark:text-slate-300'
                                                }`} />
                                                <span className={`text-xs font-semibold ${
                                                    isSelected ? 'text-[#B83A00] dark:text-[#ff6b00]' : 'text-slate-400 dark:text-slate-400'
                                                }`}>
                                                    {count}
                                                </span>
                                            </div>
                                            <span className={`text-xs font-semibold truncate leading-none ${
                                                isSelected ? 'text-[#B83A00] dark:text-[#ff6b00]' : 'text-slate-700 dark:text-slate-200'
                                            }`}>
                                                {cat.shortLabel}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Vertically Scrolling List */}
                            <div
                                ref={listContainerRef}
                                role="list"
                                aria-label="Nearby issues list"
                                className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col gap-2 py-1 pr-0.5"
                            >
                                {filteredReports.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                        <MapPin size={32} className="text-slate-400 dark:text-slate-500 mb-2" />
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            No issues found here.
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[240px]">
                                            Try selecting a different category or view all of Caloocan.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleSectorChange('all');
                                                setActiveCategory('all');
                                            }}
                                            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#ff6b00] hover:bg-[#e65c00] text-white shadow-xs transition-all cursor-pointer active:scale-95"
                                        >
                                            Show all of Caloocan
                                        </button>
                                    </div>
                                ) : (
                                    paginatedReports.map(report => {
                                        const isSelected = selectedHazard?.id === report.id;
                                        const rawImg = report.image_url || report.photo_url || report.photo_thumbnail || report.media_url || report.image;
                                        const barangayText = report.barangay || (report.location ? report.location.split(',')[0] : 'Caloocan');
                                        const categoryText = report.category || report.raw_category || 'General';
                                        const CatIcon = getCategoryIconComponent(report.category, report.raw_category);

                                        let thumbUrl = rawImg;
                                        if (rawImg && !rawImg.startsWith('http') && !rawImg.startsWith('data:')) {
                                            const cleanPath = rawImg.startsWith('/') ? rawImg : `/${rawImg}`;
                                            thumbUrl = `${API_BASE_URL}/api/thumbnails?src=${encodeURIComponent(cleanPath)}&size=80`;
                                        }

                                        return (
                                            <div
                                                key={report.id}
                                                ref={el => { itemRefs.current[report.id] = el; }}
                                                role="listitem"
                                                tabIndex={0}
                                                onClick={() => {
                                                    if (isSelected && onOpenReportDetail) {
                                                        onOpenReportDetail(report);
                                                    } else {
                                                        setSelectedHazard(report);
                                                        if (map && report.lat != null && report.lng != null) {
                                                            map.panTo({ lat: report.lat, lng: report.lng });
                                                            if (window.innerWidth < 768) {
                                                                map.panBy(0, panelSnap === 'full' ? 140 : 80);
                                                            }
                                                        }
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        if (isSelected && onOpenReportDetail) {
                                                            onOpenReportDetail(report);
                                                        } else {
                                                            setSelectedHazard(report);
                                                            if (map && report.lat != null && report.lng != null) {
                                                                map.panTo({ lat: report.lat, lng: report.lng });
                                                            }
                                                        }
                                                    }
                                                }}
                                                className={`p-3 rounded-2xl border transition-all cursor-pointer min-h-[4.5rem] flex items-center gap-3 ${
                                                    isSelected
                                                        ? 'bg-[#ff6b00]/10 dark:bg-[#ff6b00]/15 border-[#ff6b00] shadow-xs'
                                                        : 'bg-slate-50 dark:bg-[#111c33]/80 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-[#152340]'
                                                }`}
                                            >
                                                {/* Thumbnail (3.25rem = w-13 h-13) */}
                                                <div className="w-[3.25rem] h-[3.25rem] rounded-xl shrink-0 overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                                    {thumbUrl ? (
                                                        <img
                                                            src={thumbUrl}
                                                            alt={report.title}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <CatIcon size={22} className="text-slate-500 dark:text-slate-400" />
                                                    )}
                                                </div>

                                                {/* Middle: Title & Subline */}
                                                <div className="flex-1 min-w-0 pr-1">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                                                        {report.title || 'Civic Infrastructure Report'}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                                                        {barangayText} · {categoryText}
                                                    </div>
                                                </div>

                                                {/* Right Status Pill */}
                                                <IssueStatusPill status={report.status} />
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Pagination Controls (5 per page) */}
                            {filteredReports.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-between pt-1 pb-0.5 px-1 shrink-0 border-t border-slate-200/70 dark:border-slate-800/70 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredReports.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredReports.length)} of {filteredReports.length}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={currentPage <= 1}
                                            onClick={() => {
                                                setCurrentPage(prev => Math.max(1, prev - 1));
                                                if (listContainerRef.current) listContainerRef.current.scrollTop = 0;
                                            }}
                                            aria-label="Previous page"
                                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                        >
                                            Prev
                                        </button>
                                        <span className="px-1.5 py-0.5 text-[11px] font-bold text-slate-800 dark:text-white">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={currentPage >= totalPages}
                                            onClick={() => {
                                                setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                                if (listContainerRef.current) listContainerRef.current.scrollTop = 0;
                                            }}
                                            aria-label="Next page"
                                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    if (standalone) {
        return modalContent;
    }

    return (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
            <div className="w-full max-w-7xl h-full sm:h-[90vh] flex flex-col my-auto" onClick={(e) => e.stopPropagation()}>
                {modalContent}
            </div>
        </div>
    );
}
