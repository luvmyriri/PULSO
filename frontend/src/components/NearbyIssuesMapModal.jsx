import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    GoogleMap,
    MarkerF,
    OverlayViewF
} from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import {
    X,
    Layers,
    LocateFixed,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    MapPin,
    AlertTriangle,
    Menu,
    Droplets,
    Zap,
    Car,
    Signpost,
    Building2,
    MoreHorizontal,
    Search,
    Plus,
    Minus,
    Calendar,
    Clock,
    ExternalLink,
    FileText,
    List,
    RotateCcw,
    SlidersHorizontal,
    ArrowRight,
    ArrowLeft,
    Maximize2,
    Minimize2,
    Waves,
    Lightbulb,
    Trash2,
    Check
} from 'lucide-react';
import CaloocanBoundaryLayer from './CaloocanBoundaryLayer';
import {
    NORTH_CALOOCAN_CENTROID,
    SOUTH_CALOOCAN_CENTROID,
    COMBINED_CALOOCAN_BOUNDS,
    getCaloocanDistrict
} from '../data/caloocanBoundaries';
import { CALOOCAN_ALL_BARANGAYS_OPTIONS, CALOOCAN_BARANGAYS } from '../utils/philippineAddress';
import { cleanResidentAddress } from '../utils/locationPrivacy';
import { API_BASE_URL } from '../utils/apiBase';
import PhotoMapPin from './MapPin';

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
    if (meters < 1000) return `≈ ${Math.round(meters)} m`;
    return `≈ ${(meters / 1000).toFixed(1)} km`;
}

// Format date helper: "Oct 27, 2026"
function formatDate(dateStr) {
    if (!dateStr) {
        return new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            return new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

// Calm, clean civic cartography styles matching approved Civic Aperture art direction
const DARK_CIVIC_MAP_STYLE = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#070c18" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#19243a" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#293952" }, { weight: 1.5 }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#8193aa" }] },
    { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#1c283a" }, { weight: 1.2 }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "road.arterial", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#141d2c" }, { weight: 0.8 }] },
    { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] }
];

const LIGHT_CIVIC_MAP_STYLE = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] }
];

const SATELLITE_CIVIC_MAP_STYLE = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] }
];

// Complete 188 Caloocan Barangays (North Caloocan 165-188 & South Caloocan 1-164)
export const ALL_CALOOCAN_BARANGAYS_FOR_PICKER = [
    { value: 'all', label: 'All Barangays', sector: 'all', number: 0 },
    // North Caloocan (165 to 188)
    ...(CALOOCAN_BARANGAYS || []).filter(b => b.number >= 165 && b.number <= 188).map(b => ({
        value: `Barangay ${b.number}`,
        label: `Barangay ${b.number}`,
        sector: 'north',
        number: b.number,
        alias: b.alias
    })),
    // South Caloocan (1 to 164)
    ...(CALOOCAN_BARANGAYS || []).filter(b => b.number >= 1 && b.number <= 164).map(b => ({
        value: `Barangay ${b.number}`,
        label: `Barangay ${b.number}`,
        sector: 'south',
        number: b.number,
        alias: b.alias
    }))
];

// RoadIcon matching ResidentDashboard
const RoadIcon = ({ size = 20, className = "", style = {} }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
    >
        <path d="M4 19L9 5M20 19L15 5M12 7V9M12 13V15M12 19V21" />
    </svg>
);

// Authoritative Category Configuration (Matches Approved "What can you report?" Design Image)
export const ISSUE_CATEGORIES = [
    {
        id: 'all',
        label: 'All',
        shortLabel: 'All',
        color: '#EA580C',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        textColor: 'text-orange-700 dark:text-orange-300',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: Menu
    },
    {
        id: 'roads',
        label: 'Roads & bridges',
        shortLabel: 'Roads',
        color: '#EA580C',
        bgColor: 'bg-orange-50 dark:bg-orange-950/40',
        textColor: 'text-orange-700 dark:text-orange-300',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: RoadIcon
    },
    {
        id: 'drainage',
        label: 'Drainage & flooding',
        shortLabel: 'Drainage',
        color: '#06B6D4',
        bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
        textColor: 'text-cyan-700 dark:text-cyan-300',
        borderColor: 'border-cyan-200 dark:border-cyan-800',
        icon: Waves
    },
    {
        id: 'streetlights',
        label: 'Street lighting',
        shortLabel: 'Lighting',
        color: '#F59E0B',
        bgColor: 'bg-amber-50 dark:bg-amber-950/40',
        textColor: 'text-amber-700 dark:text-amber-300',
        borderColor: 'border-amber-200 dark:border-amber-800',
        icon: Lightbulb
    },
    {
        id: 'water',
        label: 'Water supply',
        shortLabel: 'Water',
        color: '#0EA5E9',
        bgColor: 'bg-sky-50 dark:bg-sky-950/40',
        textColor: 'text-sky-700 dark:text-sky-300',
        borderColor: 'border-sky-200 dark:border-sky-800',
        icon: Droplets
    },
    {
        id: 'safety',
        label: 'Public safety hazards',
        shortLabel: 'Safety',
        color: '#F43F5E',
        bgColor: 'bg-rose-50 dark:bg-rose-950/40',
        textColor: 'text-rose-700 dark:text-rose-300',
        borderColor: 'border-rose-200 dark:border-rose-800',
        icon: AlertTriangle
    },
    {
        id: 'traffic',
        label: 'Traffic & road signs',
        shortLabel: 'Traffic',
        color: '#A855F7',
        bgColor: 'bg-purple-50 dark:bg-purple-950/40',
        textColor: 'text-purple-700 dark:text-purple-300',
        borderColor: 'border-purple-200 dark:border-purple-800',
        icon: Signpost
    },
    {
        id: 'facilities',
        label: 'Public facilities',
        shortLabel: 'Buildings',
        color: '#6366F1',
        bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
        textColor: 'text-indigo-700 dark:text-indigo-300',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        icon: Building2
    },
    {
        id: 'electrical',
        label: 'Electrical wiring',
        shortLabel: 'Electrical',
        color: '#EAB308',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/40',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        icon: Zap
    },
    {
        id: 'waste',
        label: 'Waste management',
        shortLabel: 'Waste',
        color: '#10B981',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
        textColor: 'text-emerald-700 dark:text-emerald-300',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        icon: Trash2
    }
];

export const CATEGORY_TILES = ISSUE_CATEGORIES.map(c => ({
    id: c.id,
    shortLabel: c.shortLabel || c.label,
    fullLabel: c.label,
    icon: c.icon
}));

export const MAP_CATEGORIES = ISSUE_CATEGORIES.map(c => ({
    id: c.id,
    label: c.label
}));

export function classifyTextToCategoryId(text) {
    if (!text || typeof text !== 'string') return null;
    const str = text.trim().toLowerCase();
    if (!str || str === 'others' || str === 'other' || str === 'general' || str === 'civic infrastructure report') return null;

    // 1. Traffic & Road Signs (must check before roads because of "road signs")
    if (
        str.includes('traffic') ||
        str.includes('road sign') ||
        str.includes('street sign') ||
        str.includes('signage') ||
        str.includes('signal') ||
        str.includes('semaforo') ||
        str.includes('stoplight') ||
        str.includes('crossing') ||
        str.includes('lane marking')
    ) {
        return 'traffic';
    }

    // 2. Public Safety Hazards
    if (
        str.includes('safety') ||
        str.includes('hazard') ||
        str.includes('danger') ||
        str.includes('sunog') ||
        str.includes('fire') ||
        str.includes('collapse') ||
        str.includes('emergency') ||
        str.includes('open manhole') ||
        str.includes('sinkhole') ||
        str.includes('unstable') ||
        str.includes('tree fallen') ||
        str.includes('falling debris')
    ) {
        return 'safety';
    }

    // 3. Street Lighting (including canonical "Power & Street Lighting" or "Streetlights")
    if (
        str.includes('street light') ||
        str.includes('streetlight') ||
        str.includes('street lighting') ||
        str.includes('power & street lighting') ||
        str.includes('lighting') ||
        str.includes('lamp') ||
        str.includes('poste') ||
        str.includes('ilaw') ||
        str.includes('busted light') ||
        str.includes('flicker') ||
        str.includes('bulb')
    ) {
        return 'streetlights';
    }

    // 4. Electrical Wiring (live wire, dangling wire, transformer, high voltage, kuryente)
    if (
        str.includes('wire') ||
        str.includes('wiring') ||
        str.includes('kuryente') ||
        str.includes('electric') ||
        str.includes('transformer') ||
        str.includes('cable') ||
        str.includes('power line') ||
        str.includes('high voltage') ||
        str.includes('blackout') ||
        str.includes('brownout')
    ) {
        return 'electrical';
    }

    // 5. Drainage & Flooding
    if (
        str.includes('drain') ||
        str.includes('flood') ||
        str.includes('baha') ||
        str.includes('canal') ||
        str.includes('kanal') ||
        str.includes('gutter') ||
        str.includes('sewer') ||
        str.includes('estero') ||
        str.includes('barado') ||
        str.includes('clog') ||
        str.includes('culvert') ||
        str.includes('overflow')
    ) {
        return 'drainage';
    }

    // 6. Water Supply (water supply, water distribution, pipe leak, tubo, tubig, maynilad)
    if (
        str.includes('water supply') ||
        str.includes('water distribution') ||
        str.includes('water network') ||
        str.includes('maynilad') ||
        str.includes('pipe') ||
        str.includes('tubo') ||
        str.includes('water leak') ||
        str.includes('burst pipe') ||
        str.includes('low pressure') ||
        (str.includes('water') && !str.includes('waterway') && !str.includes('flood') && !str.includes('baha') && !str.includes('drain')) ||
        (str.includes('tubig') && !str.includes('baha'))
    ) {
        return 'water';
    }

    // 7. Waste Management
    if (
        str.includes('waste') ||
        str.includes('garbage') ||
        str.includes('basura') ||
        str.includes('dump') ||
        str.includes('trash') ||
        str.includes('litter') ||
        str.includes('uncollected') ||
        str.includes('collection') ||
        str.includes('smell') ||
        str.includes('dumi')
    ) {
        return 'waste';
    }

    // 8. Public Facilities
    if (
        str.includes('building') ||
        str.includes('facilit') ||
        str.includes('hall') ||
        str.includes('park') ||
        str.includes('court') ||
        str.includes('school') ||
        str.includes('center') ||
        str.includes('plaza') ||
        str.includes('barangay hall') ||
        str.includes('gym')
    ) {
        return 'facilities';
    }

    // 9. Roads & Bridges
    if (
        str.includes('road') ||
        str.includes('bridge') ||
        str.includes('pothole') ||
        str.includes('lubak') ||
        str.includes('kalsada') ||
        str.includes('tulay') ||
        str.includes('asphalt') ||
        str.includes('pavement') ||
        str.includes('sidewalk') ||
        str.includes('curb') ||
        str.includes('crack') ||
        str.includes('driveway') ||
        str.includes('infrastructure')
    ) {
        return 'roads';
    }

    return null;
}

export function getReportCategoryMeta(report) {
    if (!report) return ISSUE_CATEGORIES[1]; // Roads fallback

    // 1. Authoritative category field assigned to report (exact match / keywords)
    const rawCat = report.category || report.raw_category;
    let catId = classifyTextToCategoryId(rawCat);

    // 2. AI Category
    if (!catId && report.ai_category) {
        catId = classifyTextToCategoryId(report.ai_category);
    }

    // 3. Title
    if (!catId && report.title) {
        catId = classifyTextToCategoryId(report.title);
    }

    // 4. Tags
    if (!catId && report.tags) {
        catId = classifyTextToCategoryId(report.tags);
    }

    // 5. Description as last resort
    if (!catId && report.description) {
        catId = classifyTextToCategoryId(report.description);
    }

    const finalId = catId || 'roads';
    return ISSUE_CATEGORIES.find(c => c.id === finalId) || ISSUE_CATEGORIES[1];
}

export function matchesCategory(r, catId) {
    if (!catId || catId === 'all') return true;
    const meta = getReportCategoryMeta(r);
    return meta.id === catId;
}

export function getCategoryColor(categoryOrReport) {
    if (!categoryOrReport) return '#EA580C';
    const obj = typeof categoryOrReport === 'object' ? categoryOrReport : { category: categoryOrReport };
    const meta = getReportCategoryMeta(obj);
    return meta.color || '#EA580C';
}

export function getCategoryIconComponent(category, rawCategory) {
    const meta = getReportCategoryMeta({ category, raw_category: rawCategory });
    return meta.icon;
}

export function getReportPhoto(report) {
    if (!report) return null;
    const raw = (
        report.photo_url ||
        report.image_url ||
        report.image ||
        report.photo_thumbnail ||
        report.media_url ||
        (Array.isArray(report.photos) ? report.photos[0] : null) ||
        (Array.isArray(report.media_urls) ? report.media_urls[0] : null) ||
        (typeof report.image_paths === 'string' ? (() => {
            try {
                const p = JSON.parse(report.image_paths);
                return Array.isArray(p) ? p[0] : p;
            } catch {
                return report.image_paths;
            }
        })() : (Array.isArray(report.image_paths) ? report.image_paths[0] : null))
    );
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
        return raw;
    }
    const clean = raw.startsWith('/') ? raw : `/${raw}`;
    return `${API_BASE_URL}${clean}`;
}

// System Pin Design: SVG pin with embedded category icon and exact anchor
export function getMarkerSVG(categoryOrReport, status, isSelected = false) {
    const obj = typeof categoryOrReport === 'object' && categoryOrReport !== null
        ? categoryOrReport
        : { category: categoryOrReport };
    const meta = getReportCategoryMeta(obj);
    const color = meta.color || '#EA580C';

    let svgIcon = '';
    switch (meta.id) {
        case 'drainage':
            svgIcon = `<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>`;
            break;
        case 'water':
            svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
            break;
        case 'streetlights':
            svgIcon = `<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4.5 12.4c.9.8 1.5 2 1.5 3.1h6c0-1.1.6-2.3 1.5-3.1A7 7 0 0 0 12 2z" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>`;
            break;
        case 'electrical':
            svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
            break;
        case 'waste':
            svgIcon = `<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
            break;
        case 'traffic':
            svgIcon = `<path d="M12 3v3M18.5 6H5.5a1.5 1.5 0 0 0-1.5 1.5v3A1.5 1.5 0 0 0 5.5 12H18.5l3.5-3-3.5-3zM12 12v9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
            break;
        case 'facilities':
            svgIcon = `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2ZM18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2ZM10 6h4M10 10h4M10 14h4M10 18h4" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>`;
            break;
        case 'safety':
            svgIcon = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
            break;
        case 'roads':
        default:
            svgIcon = `<path d="M4 19L9 5M20 19L15 5M12 7V9M12 13V15M12 19V21" stroke="white" stroke-width="2.3" stroke-linecap="round" fill="none"/>`;
            break;
    }

    const strokeColor = '#ffffff';
    const strokeWidth = isSelected ? '3.5' : '2.5';
    const scale = isSelected ? '1.18' : '1.0';

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

/**
 * NearbyIssuesMapModal — Rebuilt to exact approved Issue Categories design
 * Sits directly under the existing navbar (h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)])
 * Preserves exact boundary line, exact category pin icons, camera restore, and real data.
 */
export default function NearbyIssuesMapModal({
    isOpen = true,
    onClose,
    theme = 'dark',
    isLoaded: propIsLoaded,
    loadError: propLoadError,
    reports = [],
    reportsLoading = false,
    reportsError = false,
    onRetryReports,
    reportLocation = null,
    setReportLocation,
    isLocating = false,
    requestDeviceLocation,
    locationPermissionDenied = false,
    checkJurisdiction,
    reverseGeocode,
    onOpenReportDetail,
    onOpenReportForm,
    standalone = false,
    photoPinIcons: externalPhotoPinIcons = null,
    initialSelectedReport = null
}) {
    const { t } = useTranslation();
    const { isLoaded: contextLoaded, loadError: contextError } = useGoogleMaps();
    const isLoaded = Boolean(
        (propIsLoaded !== undefined ? propIsLoaded : contextLoaded) &&
        typeof window !== 'undefined' &&
        window.google &&
        window.google.maps &&
        typeof window.google.maps.Map === 'function'
    );
    const loadError = propLoadError || contextError;
    const isDark = theme === 'dark';

    // Map and state refs
    const [map, setMap] = useState(null);
    const mapInstanceRef = useRef(null);
    const mapContainerRef = useRef(null);
    const listScrollContainerRef = useRef(null);
    const rowRefs = useRef({});
    const pinRef = useRef(null);

    // Photo pin caching and generation
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

    // Filter states
    const [activeSector, setActiveSector] = useState('all'); // 'all' | 'north' | 'south'
    const [selectedBarangay, setSelectedBarangay] = useState('all'); // 'all' | 'Barangay 171' | etc.
    const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'water' | etc.
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedHazard, setSelectedHazard] = useState(null);

    // Map layers state (persisted)
    const [mapLayers, setMapLayers] = useState(() => {
        try {
            const saved = localStorage.getItem('pulso_community_map_layers');
            if (saved) return JSON.parse(saved);
        } catch {}
        return { reports: true, serviceBoundary: true, publicFacilities: false };
    });
    const [showLayersBox, setShowLayersBox] = useState(false);

    // Satellite / Roadmap map view state
    const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'hybrid'

    const toggleSatelliteView = useCallback(() => {
        setMapType(prev => (prev === 'roadmap' ? 'hybrid' : 'roadmap'));
    }, []);

    useEffect(() => {
        if (map) {
            map.setMapTypeId(mapType);
            if (mapType === 'hybrid') {
                map.setOptions({ styles: SATELLITE_CIVIC_MAP_STYLE });
            } else {
                map.setOptions({ styles: isDark ? DARK_CIVIC_MAP_STYLE : LIGHT_CIVIC_MAP_STYLE });
            }
        }
    }, [map, mapType, isDark]);

    // Dynamic "Reports in view" counter
    const [reportsInViewCount, setReportsInViewCount] = useState(0);
    const boundsDebounceTimer = useRef(null);

    // Mobile sheet position: 'collapsed' | 'half' | 'full'
    const [mobileSheetSnap, setMobileSheetSnap] = useState('collapsed');
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [isBarangayPickerOpen, setIsBarangayPickerOpen] = useState(false);
    const [isBarangayDropdownOpen, setIsBarangayDropdownOpen] = useState(false);
    const barangayDropdownRef = useRef(null);

    // Close desktop barangay dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (barangayDropdownRef.current && !barangayDropdownRef.current.contains(event.target)) {
                setIsBarangayDropdownOpen(false);
            }
        }
        if (isBarangayDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isBarangayDropdownOpen]);
    const [isLayersSheetOpen, setIsLayersSheetOpen] = useState(false);
    const [isLegendOpen, setIsLegendOpen] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [barangaySearchFilter, setBarangaySearchFilter] = useState('');
    const [barangaySectorFilter, setBarangaySectorFilter] = useState('all'); // 'all' | 'north' | 'south'

    const filteredBarangaysList = useMemo(() => {
        const q = barangaySearchFilter.trim().toLowerCase();
        return ALL_CALOOCAN_BARANGAYS_FOR_PICKER.filter(b => {
            if (b.value === 'all') return true;
            if (barangaySectorFilter === 'north' && b.sector !== 'north') return false;
            if (barangaySectorFilter === 'south' && b.sector !== 'south') return false;
            if (!q) return true;
            return (
                b.label.toLowerCase().includes(q) ||
                String(b.number).includes(q) ||
                (b.alias && b.alias.toLowerCase().includes(q))
            );
        });
    }, [barangaySearchFilter, barangaySectorFilter]);

    const selectedBarangayLabel = useMemo(() => {
        if (!selectedBarangay || selectedBarangay === 'all') return 'All Barangays';
        const match = ALL_CALOOCAN_BARANGAYS_FOR_PICKER.find(b => b.value === selectedBarangay);
        return match ? match.label : selectedBarangay;
    }, [selectedBarangay]);
    const [isMobileFullscreenMap, setIsMobileFullscreenMap] = useState(false);

    // Touch gesture tracking for bottom sheet
    const touchStartYRef = useRef(null);
    const touchDeltaYRef = useRef(0);

    const handleTouchStart = (e) => {
        touchStartYRef.current = e.touches[0].clientY;
        touchDeltaYRef.current = 0;
    };

    const handleTouchMove = (e) => {
        if (touchStartYRef.current === null) return;
        touchDeltaYRef.current = e.touches[0].clientY - touchStartYRef.current;
    };

    const handleTouchEnd = () => {
        if (touchStartYRef.current === null) return;
        const delta = touchDeltaYRef.current;
        if (delta < -35) {
            // Dragged upward
            if (mobileSheetSnap === 'collapsed') setMobileSheetSnap('half');
            else if (mobileSheetSnap === 'half') setMobileSheetSnap('full');
        } else if (delta > 35) {
            // Dragged downward
            if (mobileSheetSnap === 'full') setMobileSheetSnap('half');
            else if (mobileSheetSnap === 'half') {
                setMobileSheetSnap('collapsed');
                setSelectedHazard(null);
            }
        }
        touchStartYRef.current = null;
        touchDeltaYRef.current = 0;
    };

    // Camera save and restore state
    const savedCameraRef = useRef(null);
    const userInteractedWhilePopupOpenRef = useRef(false);
    const isSelectedOpenRef = useRef(false);

    useEffect(() => {
        isSelectedOpenRef.current = Boolean(selectedHazard);
    }, [selectedHazard]);

    // Track user drag/zoom while report detail panel is open
    useEffect(() => {
        const activeMap = mapInstanceRef.current || map;
        if (!activeMap || !window.google?.maps) return;

        const dragListener = activeMap.addListener('dragstart', () => {
            if (isSelectedOpenRef.current) {
                userInteractedWhilePopupOpenRef.current = true;
            }
        });
        const zoomListener = activeMap.addListener('zoom_changed', () => {
            if (isSelectedOpenRef.current) {
                userInteractedWhilePopupOpenRef.current = true;
            }
        });

        return () => {
            if (window.google?.maps?.event) {
                window.google.maps.event.removeListener(dragListener);
                window.google.maps.event.removeListener(zoomListener);
            }
        };
    }, [map]);

    // Update map layer settings
    const toggleLayer = useCallback((layerKey, val) => {
        setMapLayers(prev => {
            const next = { ...prev, [layerKey]: val };
            try {
                localStorage.setItem('pulso_community_map_layers', JSON.stringify(next));
            } catch {}
            return next;
        });
    }, []);

    // 1. Area Filtered Reports (Follows Area Tabs and Barangay Selector)
    const areaFilteredReports = useMemo(() => {
        return (reports || []).filter(r => {
            if (r.lat == null || r.lng == null || isNaN(r.lat) || isNaN(r.lng)) return false;

            // Area Sector Filter
            if (activeSector === 'north') {
                const district = getCaloocanDistrict(r.lat, r.lng);
                const brgyNum = Number(String(r.barangay || '').match(/\d+/)?.[0] || 0);
                if (district !== 'north' && !(brgyNum >= 165 && brgyNum <= 188)) return false;
            } else if (activeSector === 'south') {
                const district = getCaloocanDistrict(r.lat, r.lng);
                const brgyNum = Number(String(r.barangay || '').match(/\d+/)?.[0] || 0);
                if (district !== 'south' && !(brgyNum >= 1 && brgyNum <= 164)) return false;
            }

            // Barangay Selector Filter
            if (selectedBarangay !== 'all') {
                const rBrgy = String(r.barangay || '').toLowerCase();
                const targetBrgy = selectedBarangay.toLowerCase();
                const targetNum = targetBrgy.match(/\d+/)?.[0];
                const rNum = rBrgy.match(/\d+/)?.[0];
                if (targetNum && rNum) {
                    if (targetNum !== rNum) return false;
                } else if (!rBrgy.includes(targetBrgy)) {
                    return false;
                }
            }

            return true;
        });
    }, [reports, activeSector, selectedBarangay]);

    // 2. Real Category Counts (Calculated dynamically from area-filtered reports)
    const categoryCounts = useMemo(() => {
        const counts = {
            all: areaFilteredReports.length,
            roads: 0,
            drainage: 0,
            streetlights: 0,
            water: 0,
            safety: 0,
            traffic: 0,
            facilities: 0,
            electrical: 0,
            waste: 0
        };

        areaFilteredReports.forEach(r => {
            const meta = getReportCategoryMeta(r);
            if (counts[meta.id] !== undefined) {
                counts[meta.id]++;
            } else {
                counts.roads++;
            }
        });

        return counts;
    }, [areaFilteredReports]);

    // 3. Fully Filtered Reports (Category + Search Query)
    const filteredReports = useMemo(() => {
        return areaFilteredReports.filter(r => {
            // Category Filter
            if (activeCategory !== 'all') {
                if (!matchesCategory(r, activeCategory)) return false;
            }

            // Search Filter (by ticket_id, title, or address)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const ticketId = String(r.ticket_id || '').toLowerCase();
                const title = String(r.title || '').toLowerCase();
                const loc = String(r.location_string || r.address || r.barangay || '').toLowerCase();
                if (!ticketId.includes(q) && !title.includes(q) && !loc.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [areaFilteredReports, activeCategory, searchQuery]);

    const hasReportFilters = activeSector !== 'all' || selectedBarangay !== 'all' || activeCategory !== 'all' || Boolean(searchQuery.trim());
    const emptyReportsMessage = reportsLoading
        ? t('mapPublicReports.loading', { defaultValue: 'Loading public reports…' })
        : reportsError
            ? t('mapPublicReports.error', { defaultValue: 'Public reports could not be loaded.' })
            : reports.length === 0
                ? t('mapPublicReports.empty', { defaultValue: 'No reports are public yet. Reports awaiting government review are not shown on this map.' })
                : t('mapPublicReports.filteredEmpty', { defaultValue: 'No reports match these filters.' });
    const resetReportFilters = () => {
        setActiveCategory('all');
        setActiveSector('all');
        setSelectedBarangay('all');
        setSearchQuery('');
    };

    // Matching reports for search autocomplete dropdown
    const matchingSearchReports = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return (areaFilteredReports || []).filter(r => {
            const ticketId = String(r.ticket_id || '').toLowerCase();
            const title = String(r.title || '').toLowerCase();
            const loc = String(r.location_string || r.address || r.barangay || '').toLowerCase();
            return ticketId.includes(q) || title.includes(q) || loc.includes(q);
        }).slice(0, 5);
    }, [areaFilteredReports, searchQuery]);

    // Generate Canvas Image Pins for Native Google Maps MarkerF with Incident Pictures
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
            const photoUrl = getReportPhoto(report);
            if (!photoUrl) return;

            const meta = getReportCategoryMeta(report);
            const borderColor = meta.color;

            [false, true].forEach(isSelected => {
                const cacheKey = `${report.id}-${meta.color}-${isSelected ? 'sel' : 'norm'}`;
                if (pinIconCache.current.has(cacheKey) || photoPinIcons[cacheKey]) return;

                let thumbUrl = photoUrl;
                if (photoUrl.includes('/api/thumbnails?')) {
                    thumbUrl = photoUrl.replace(/([?&]size=)512(&|$)/, (_, prefix, suffix) => `${prefix}80${suffix}`);
                } else if (!photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
                    const cleanPath = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
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
                            ctx.fillStyle = `${borderColor}59`;
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
                        fallbackImg.onerror = () => {};
                        fallbackImg.src = photoUrl;
                    }
                };
                img.src = thumbUrl;
            });
        });

        return () => {
            isMounted = false;
            if (batchTimer) clearTimeout(batchTimer);
        };
    }, [filteredReports, photoPinIcons]);

    // 4. Update "Reports in view" on map idle
    const handleMapIdle = useCallback(() => {
        const activeMap = mapInstanceRef.current || map;
        if (!activeMap || !window.google?.maps) return;

        if (boundsDebounceTimer.current) {
            clearTimeout(boundsDebounceTimer.current);
        }

        boundsDebounceTimer.current = setTimeout(() => {
            const bounds = activeMap.getBounds();
            if (!bounds) return;

            let inView = 0;
            filteredReports.forEach(r => {
                if (r.lat && r.lng) {
                    const pt = new window.google.maps.LatLng(r.lat, r.lng);
                    if (bounds.contains(pt)) inView++;
                }
            });
            setReportsInViewCount(inView);
        }, 300);
    }, [map, filteredReports]);

    // 5. Camera Management & Pin Selection
    const handleSelectHazard = useCallback((hazard) => {
        const activeMap = mapInstanceRef.current || map;
        if (!activeMap || !window.google?.maps || !hazard?.lat || !hazard?.lng) {
            setSelectedHazard(hazard);
            return;
        }

        // Save camera before programmatic pan/zoom
        if (!savedCameraRef.current) {
            savedCameraRef.current = {
                center: activeMap.getCenter(),
                zoom: activeMap.getZoom()
            };
        }
        userInteractedWhilePopupOpenRef.current = false;
        setSelectedHazard(hazard);

        // Smoothly pan to the coordinates with padding for panels
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1100;
        const targetZoom = Math.max(activeMap.getZoom() || 14, 16);
        activeMap.setZoom(targetZoom);

        if (isDesktop) {
            // Offset center slightly to account for the 360px right detail panel
            activeMap.panTo({ lat: hazard.lat, lng: hazard.lng });
        } else {
            activeMap.panTo({ lat: hazard.lat, lng: hazard.lng });
            setMobileSheetSnap('half');
        }

        // Auto-scroll left list row into view
        const targetRow = rowRefs.current[hazard.id];
        if (targetRow && typeof targetRow.scrollIntoView === 'function') {
            targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [map]);

    const handleCloseDetail = useCallback(() => {
        const activeMap = mapInstanceRef.current || map;
        setSelectedHazard(null);

        // Camera restore: If user moved map by hand, preserve their view; otherwise restore saved view
        if (activeMap && savedCameraRef.current && !userInteractedWhilePopupOpenRef.current) {
            activeMap.panTo(savedCameraRef.current.center);
            activeMap.setZoom(savedCameraRef.current.zoom);
        }
        savedCameraRef.current = null;
        userInteractedWhilePopupOpenRef.current = false;
    }, [map]);

    // Handle initialSelectedReport (e.g. when opening map from ReportDetailView or MyReports)
    useEffect(() => {
        if (!initialSelectedReport) return;
        const found = reports.find(
            (r) =>
                (initialSelectedReport.id && r.id === initialSelectedReport.id) ||
                (initialSelectedReport.ticket_id && r.ticket_id === initialSelectedReport.ticket_id)
        );
        const target = found || initialSelectedReport;
        const repLat = Number(target.lat ?? target.latitude ?? target.coordinates?.lat);
        const repLng = Number(target.lng ?? target.longitude ?? target.coordinates?.lng);
        const validReport = {
            ...target,
            lat: !isNaN(repLat) ? repLat : target.lat,
            lng: !isNaN(repLng) ? repLng : target.lng
        };

        // Reset restrictive filters so the selected report is visible in the list
        setActiveCategory('all');
        setActiveSector('all');
        setSelectedBarangay('all');

        setSelectedHazard(validReport);

        const activeMap = mapInstanceRef.current || map;
        if (activeMap && validReport.lat && validReport.lng) {
            handleSelectHazard(validReport);
        }
    }, [initialSelectedReport, map, reports, handleSelectHazard]);

    // Keyboard support: Escape closes detail panel or modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (selectedHazard) {
                    e.stopPropagation();
                    handleCloseDetail();
                } else if (onClose) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedHazard, handleCloseDetail, onClose]);

    // Handle Area Sector tab switch
    const handleSectorChange = useCallback((sector) => {
        setActiveSector(sector);
        const activeMap = mapInstanceRef.current || map;
        if (!activeMap || !window.google?.maps) return;

        if (sector === 'north') {
            activeMap.panTo(NORTH_CALOOCAN_CENTROID || { lat: 14.7695, lng: 121.0569 });
            activeMap.setZoom(13);
        } else if (sector === 'south') {
            activeMap.panTo(SOUTH_CALOOCAN_CENTROID || { lat: 14.6643, lng: 120.9890 });
            activeMap.setZoom(13);
        } else {
            if (COMBINED_CALOOCAN_BOUNDS?.southWest && COMBINED_CALOOCAN_BOUNDS?.northEast) {
                const bounds = new window.google.maps.LatLngBounds(
                    new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
                    new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
                );
                activeMap.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
            }
        }
    }, [map]);

    // Handle My Location
    const handleMyLocation = useCallback(() => {
        if (requestDeviceLocation) {
            requestDeviceLocation(true);
        } else if (navigator.geolocation && map) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    map.panTo(coords);
                    map.setZoom(16);
                },
                (err) => {
                    console.warn('[Community Map] Geolocation refused:', err);
                },
                { enableHighAccuracy: true, timeout: 6000 }
            );
        }
    }, [requestDeviceLocation, map]);

    // Selected hazard category metadata
    const selectedCategoryMeta = useMemo(() => {
        return getReportCategoryMeta(selectedHazard);
    }, [selectedHazard]);

    const selectedHazardPhotoUrl = useMemo(() => {
        if (!selectedHazard) return '';
        return getReportPhoto(selectedHazard) || '';
    }, [selectedHazard]);

    const publicStatusLabel = useMemo(() => ({
        pending_approval: t('mapPublicReports.status.verified', { defaultValue: 'Verified · Awaiting work approval' }),
        validated: t('mapPublicReports.status.validated', { defaultValue: 'Verified' }),
        approved_internal: t('mapPublicReports.status.approved', { defaultValue: 'Approved for work' }),
        dispatched: t('mapPublicReports.status.dispatched', { defaultValue: 'Dispatched' }),
        in_progress: t('mapPublicReports.status.inProgress', { defaultValue: 'Work in progress' }),
        resolved: t('mapPublicReports.status.resolved', { defaultValue: 'Resolved' }),
    })[selectedHazard?.status] || selectedHazard?.status || '', [selectedHazard?.status, t]);

    if (!isOpen) return null;

    return (
        <div
            ref={mapContainerRef}
            className={`${
                standalone ? 'absolute inset-0 z-10' : 'fixed inset-0 z-[60]'
            } lg:top-14 xl:top-16 lg:bottom-0 lg:z-40 lg:h-[calc(100dvh-3.5rem)] xl:h-[calc(100dvh-4rem)] flex flex-col bg-[#F8FAFC] dark:bg-[#070D18] text-slate-900 dark:text-white overflow-hidden select-none`}
            role="region"
            aria-label="Community Map"
        >
            {/* ── TOP SLIM PAGE TOOLBAR FOR DESKTOP (56px directly under the existing navbar) ── */}
            <header className="hidden lg:flex h-14 shrink-0 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 items-center justify-between gap-3 z-30 shadow-2xs">
                {/* Left: Search Box */}
                <div className="flex-1 max-w-md relative">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs transition-all focus-within:ring-2 focus-within:ring-[#ea580c] focus-within:border-transparent">
                        <Search size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search address or report ID (e.g. PUL-2026-1681)"
                            aria-label="Search address or report ID"
                            className="bg-transparent border-none outline-hidden w-full text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
                                aria-label="Clear search query"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Barangay Selector + Report Issue Button + Close Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                    {/* Barangay Selector Custom Dropdown */}
                    <div className="relative" ref={barangayDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsBarangayDropdownOpen(prev => !prev)}
                            aria-expanded={isBarangayDropdownOpen}
                            className={`min-h-[40px] pl-8 pr-8 py-2 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isBarangayDropdownOpen
                                    ? 'border-[#ea580c] ring-2 ring-[#ea580c]/30 bg-white dark:bg-slate-800 shadow-sm'
                                    : 'border-slate-200/90 dark:border-slate-700 hover:border-slate-300'
                            }`}
                        >
                            <MapPin size={14} className="text-[#ea580c] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <span className="truncate max-w-[170px] select-none">{selectedBarangayLabel}</span>
                            <ChevronDown
                                size={14}
                                className={`text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${
                                    isBarangayDropdownOpen ? 'rotate-180 text-[#ea580c]' : ''
                                }`}
                            />
                        </button>

                        {/* Custom Dropdown Menu Panel */}
                        {isBarangayDropdownOpen && (
                            <div
                                className="absolute right-0 top-full mt-2 w-[320px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col"
                                style={{ maxHeight: '420px' }}
                            >
                                {/* Header with Scope & Reset */}
                                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                                            Caloocan Barangays
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                            188 total · North & South Caloocan
                                        </span>
                                    </div>
                                    {selectedBarangay !== 'all' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedBarangay('all');
                                                handleSectorChange('all');
                                            }}
                                            className="text-[10.5px] font-bold text-[#ea580c] hover:underline cursor-pointer"
                                        >
                                            Reset to All
                                        </button>
                                    )}
                                </div>

                                {/* Search Bar & Sector Quick Filters */}
                                <div className="p-2 border-b border-slate-100 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                                        <Search size={13} className="text-slate-400 shrink-0" />
                                        <input
                                            type="text"
                                            autoFocus
                                            value={barangaySearchFilter}
                                            onChange={(e) => setBarangaySearchFilter(e.target.value)}
                                            placeholder="Search barangay number..."
                                            className="bg-transparent border-none outline-hidden w-full text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                                        />
                                        {barangaySearchFilter && (
                                            <button
                                                type="button"
                                                onClick={() => setBarangaySearchFilter('')}
                                                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Sector Pills: All | North (165-188) | South (1-164) */}
                                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                        <button
                                            type="button"
                                            onClick={() => setBarangaySectorFilter('all')}
                                            className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                                barangaySectorFilter === 'all'
                                                    ? 'bg-[#ea580c] text-white shadow-2xs'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            All (188)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBarangaySectorFilter('north')}
                                            className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                                barangaySectorFilter === 'north'
                                                    ? 'bg-[#ea580c] text-white shadow-2xs'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            North (165–188)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBarangaySectorFilter('south')}
                                            className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                                barangaySectorFilter === 'south'
                                                    ? 'bg-[#ea580c] text-white shadow-2xs'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            South (1–164)
                                        </button>
                                    </div>
                                </div>

                                {/* Dropdown Items List */}
                                <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-slate-100 dark:divide-slate-800/80 custom-scrollbar max-h-60">
                                    {filteredBarangaysList.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            No barangay found matching "{barangaySearchFilter}"
                                        </div>
                                    ) : (
                                        filteredBarangaysList.map(b => {
                                            const isCurrent = selectedBarangay === b.value;
                                            return (
                                                <button
                                                    key={b.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedBarangay(b.value);
                                                        setIsBarangayDropdownOpen(false);
                                                        if (b.value === 'all') {
                                                            handleSectorChange('all');
                                                        } else if (b.number >= 165 && b.number <= 188) {
                                                            handleSectorChange('north');
                                                            map?.panTo(NORTH_CALOOCAN_CENTROID || { lat: 14.7695, lng: 121.0569 });
                                                            map?.setZoom(15);
                                                        } else {
                                                            handleSectorChange('south');
                                                            map?.panTo(SOUTH_CALOOCAN_CENTROID || { lat: 14.6643, lng: 120.9890 });
                                                            map?.setZoom(15);
                                                        }
                                                    }}
                                                    className={`w-full p-2 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                                        isCurrent
                                                            ? 'bg-orange-50 dark:bg-orange-950/40 text-[#ea580c] font-bold'
                                                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold truncate">{b.label}</span>
                                                            {b.sector && b.sector !== 'all' && (
                                                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                                                                    b.sector === 'north'
                                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                                                                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                }`}>
                                                                    {b.sector === 'north' ? 'North' : 'South'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isCurrent && (
                                                        <Check size={14} className="text-[#ea580c] shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Report an Issue Button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (onOpenReportForm) onOpenReportForm();
                        }}
                        className="min-h-[40px] px-3.5 py-2 bg-[#ea580c] hover:bg-[#d94e07] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#ea580c] focus:ring-offset-2"
                        title="Submit a new report"
                    >
                        <Plus size={16} strokeWidth={2.8} className="shrink-0" />
                        <span className="hidden sm:inline">Report an issue</span>
                    </button>

                    {/* Close (X) to exit community map back to dashboard */}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                            title="Close Community Map"
                            aria-label="Close Community Map"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </header>

            {/* ── MOBILE TOP APP HEADER (Phones & Tablets < 1024px) ── */}
            <div className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3.5 pt-[max(env(safe-area-inset-top,0px),10px)] pb-2.5 flex items-center justify-between gap-2.5 z-40 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 -ml-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Back to dashboard"
                            title="Back to dashboard"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                            Community map
                        </h1>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            Caloocan City · Real-time civic view
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsMobileFullscreenMap(prev => !prev)}
                        className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isMobileFullscreenMap
                                ? 'bg-[#ea580c] text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                        title={isMobileFullscreenMap ? 'Exit fullscreen map' : 'View fullscreen map'}
                    >
                        {isMobileFullscreenMap ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                        <span className="hidden sm:inline">{isMobileFullscreenMap ? 'Standard' : 'Fullscreen'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (onOpenReportForm) onOpenReportForm();
                        }}
                        className="h-8 px-2.5 bg-[#ea580c] hover:bg-[#d94e07] text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        aria-label="Report an issue"
                    >
                        <Plus size={14} strokeWidth={2.8} />
                        <span>Report</span>
                    </button>
                </div>
            </div>

            {/* ── MOBILE TOP FILTER BLOCK (Phones & Small Screens under Header) ── */}
            {!isMobileFullscreenMap && (
                <div className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 p-3 space-y-2.5 z-30 shadow-2xs">
                {/* 1. Full-width Search Box */}
                <div className="relative">
                    <div className="h-12 px-3.5 rounded-[14px] bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5 transition-all focus-within:ring-2 focus-within:ring-[#ea580c] focus-within:border-transparent">
                        <Search size={18} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search address or report ID"
                            aria-label="Search address or report ID"
                            className="bg-transparent border-none outline-hidden w-full text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setIsSearchFocused(false);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
                                aria-label="Clear search"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {isSearchFocused && matchingSearchReports.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-50">
                            <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                                Matching reports ({matchingSearchReports.length})
                            </div>
                            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                {matchingSearchReports.map((report) => {
                                    const meta = getReportCategoryMeta(report);
                                    const CatIcon = meta.icon;
                                    return (
                                        <div
                                            key={`match-${report.id}`}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                                handleSelectHazard(report);
                                                setIsSearchFocused(false);
                                            }}
                                            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                                        >
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: `${meta.color}18` }}
                                            >
                                                <CatIcon size={14} style={{ color: meta.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {report.title}
                                                </div>
                                                <div className="text-[10.5px] text-slate-400 font-mono truncate">
                                                    {report.ticket_id || String(report.id)} · {cleanResidentAddress(report.location_string) || cleanResidentAddress(report.barangay) || t('mapPublicReports.locationUnavailable', { defaultValue: 'Location unavailable' })}
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-400 shrink-0" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Barangay Selector + Square Filter Button Row */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsBarangayPickerOpen(true)}
                        className="flex-1 h-12 px-3.5 rounded-[14px] bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-left transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"
                        aria-label="Select Barangay"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <MapPin size={16} className="text-[#ea580c] shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {selectedBarangayLabel}
                            </span>
                        </div>
                        <ChevronDown size={16} className="text-slate-400 shrink-0 ml-1" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsFilterSheetOpen(true)}
                        className="w-12 h-12 rounded-[14px] bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-orange-600 transition-colors cursor-pointer relative shrink-0"
                        title="Filter map & layers"
                        aria-label="Filter map and layers"
                    >
                        <SlidersHorizontal size={18} />
                        {(activeSector !== 'all' || !mapLayers.reports || !mapLayers.serviceBoundary) && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#ea580c] ring-2 ring-white dark:ring-slate-800" />
                        )}
                    </button>
                </div>

                {/* 3. Issue Categories Header + Wrapped Category Chips */}
                <div className="space-y-1.5 pt-0.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Issue categories
                    </div>
                    <div className="flex flex-wrap gap-1.5 w-full">
                        {ISSUE_CATEGORIES.map(cat => {
                            const isSelected = activeCategory === cat.id;
                            const count = categoryCounts[cat.id] || 0;
                            const IconComp = cat.icon;

                            if (cat.id === 'all') {
                                return (
                                    <button
                                        key="cat-all"
                                        type="button"
                                        onClick={() => setActiveCategory('all')}
                                        className={`h-8 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                            isSelected
                                                ? 'bg-[#ea580c] text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                                        }`}
                                    >
                                        <span>All</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            }

                            return (
                                <button
                                    key={`cat-${cat.id}`}
                                    type="button"
                                    onClick={() => setActiveCategory(cat.id)}
                                    title={cat.label}
                                    className={`h-8 px-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isSelected
                                            ? 'bg-[#ea580c] text-white shadow-xs'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <IconComp size={13} style={{ color: isSelected ? '#ffffff' : cat.color }} className="shrink-0" />
                                    <span>{cat.shortLabel || cat.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                        isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            )}

            {/* ── MAIN WORKSPACE: 3-COLUMN LAYOUT (Left Panel | Map | Right Detail Panel) ── */}
            <div className="flex-1 flex relative overflow-hidden">
                {/* ── LEFT PANEL (~390px Desktop, hidden on phone) ── */}
                <aside className="hidden lg:flex lg:w-[390px] shrink-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex-col z-20 shadow-xs">
                    {/* Header: Title + Subtitle */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
                        <div>
                            <div className="flex items-center justify-between">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                                    Nearby reports ({filteredReports.length})
                                </h1>
                                {(activeCategory !== 'all' || activeSector !== 'all' || searchQuery) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveCategory('all');
                                            setActiveSector('all');
                                            setSelectedBarangay('all');
                                            setSearchQuery('');
                                        }}
                                        className="text-xs font-semibold text-[#ea580c] hover:underline"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Use filters to explore reports. Select a marker for details.
                            </p>
                        </div>

                        {/* Area Segmented Tabs (All areas, North, South) */}
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-xs font-semibold select-none">
                            <button
                                type="button"
                                onClick={() => handleSectorChange('all')}
                                className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                                    activeSector === 'all'
                                        ? 'bg-[#ea580c]/10 dark:bg-[#ea580c]/20 border border-[#ea580c] text-[#ea580c] font-bold shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                aria-pressed={activeSector === 'all'}
                            >
                                All areas
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSectorChange('north')}
                                className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                                    activeSector === 'north'
                                        ? 'bg-[#ea580c]/10 dark:bg-[#ea580c]/20 border border-[#ea580c] text-[#ea580c] font-bold shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                aria-pressed={activeSector === 'north'}
                            >
                                North
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSectorChange('south')}
                                className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                                    activeSector === 'south'
                                        ? 'bg-[#ea580c]/10 dark:bg-[#ea580c]/20 border border-[#ea580c] text-[#ea580c] font-bold shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                aria-pressed={activeSector === 'south'}
                            >
                                South
                            </button>
                        </div>

                        {/* Issue Categories Title + 5x2 Cards Grid */}
                        <div className="space-y-2 pt-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                                Issue categories
                            </span>
                            <div className="grid grid-cols-5 gap-1.5">
                                {ISSUE_CATEGORIES.map(cat => {
                                    const isSelected = activeCategory === cat.id;
                                    const count = categoryCounts[cat.id] || 0;
                                    const IconComp = cat.icon;
                                    const isDimmed = count === 0 && !isSelected;

                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setActiveCategory(cat.id)}
                                            aria-pressed={isSelected}
                                            title={cat.label}
                                            className={`min-h-[52px] p-1.5 rounded-xl flex flex-col justify-between text-left transition-all cursor-pointer border ${
                                                isSelected
                                                    ? 'bg-[#ea580c]/10 dark:bg-[#ea580c]/20 border-[#ea580c] text-[#ea580c] shadow-2xs'
                                                    : isDimmed
                                                    ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/40 opacity-45'
                                                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                                            }`}
                                        >
                                            <span className="text-[9.5px] font-bold tracking-tight truncate block">
                                                {cat.shortLabel || cat.label}
                                            </span>
                                            <div className="flex items-center justify-between w-full mt-1">
                                                <IconComp size={14} style={{ color: cat.color }} className="shrink-0" />
                                                <span className="text-[11px] font-bold tabular-nums">
                                                    {count}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Report List Rows (Scrolls independently) */}
                    <div
                        ref={listScrollContainerRef}
                        className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2"
                        role="list"
                        aria-label="Nearby Reports List"
                    >
                        {filteredReports.length === 0 ? (
                            <div className="p-8 text-center space-y-3">
                                <AlertTriangle size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {emptyReportsMessage}
                                </p>
                                {reportsError && onRetryReports && <button
                                    type="button"
                                    onClick={onRetryReports}
                                    className="min-h-11 px-3.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#ea580c] focus-visible:outline-3 focus-visible:outline-[#ea580c]"
                                >{t('mapPublicReports.retry', { defaultValue: 'Try again' })}</button>}
                                {hasReportFilters && !reportsError && !reportsLoading && <button
                                    type="button"
                                    onClick={resetReportFilters}
                                    className="min-h-11 px-3.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#ea580c] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:outline-3 focus-visible:outline-[#ea580c]"
                                >
                                    {t('mapPublicReports.clearFilters', { defaultValue: 'Clear filters' })}
                                </button>}
                            </div>
                        ) : (
                            filteredReports.map(report => {
                                const isSelected = selectedHazard?.id === report.id;
                                const meta = getReportCategoryMeta(report);
                                const IconComp = meta.icon;

                                // Compute distance if reportLocation is known
                                const distanceMeters = reportLocation?.lat && report.lat
                                    ? getDistance(reportLocation, { lat: report.lat, lng: report.lng })
                                    : null;
                                const distanceText = formatDistance(distanceMeters);

                                return (
                                    <div
                                        key={report.id}
                                        ref={el => { rowRefs.current[report.id] = el; }}
                                        role="button"
                                        tabIndex={0}
                                        aria-current={isSelected ? 'true' : undefined}
                                        onClick={() => handleSelectHazard(report)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleSelectHazard(report);
                                            }
                                        }}
                                        className={`w-full min-h-[72px] p-3 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 border-l-[3.5px] border-l-[#0284c7] shadow-xs'
                                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300'
                                        }`}
                                    >
                                        {/* Round category icon in soft tint */}
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-2xs"
                                            style={{ backgroundColor: `${meta.color}18` }}
                                        >
                                            <IconComp size={18} style={{ color: meta.color }} />
                                        </div>

                                        {/* Title + Location Subline + Distance */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                {report.title || 'Civic infrastructure report'}
                                            </h3>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                {cleanResidentAddress(report.location_string) || cleanResidentAddress(report.barangay) || t('mapPublicReports.locationUnavailable', { defaultValue: 'Location unavailable' })}
                                            </p>
                                            {distanceText && (
                                                <span className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500 block mt-0.5">
                                                    {distanceText}
                                                </span>
                                            )}
                                        </div>

                                        {/* Right Arrow */}
                                        <div className="flex items-center shrink-0">
                                            <ChevronRight size={15} className="text-slate-400" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* ── MIDDLE COLUMN: MAP ── */}
                <main className="flex-1 h-full relative overflow-hidden bg-[#E8EEF1] dark:bg-slate-950">
                    {/* Top-Left Floating Chips */}
                    <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
                        <div
                            onClick={() => {
                                // Scroll left list to first report
                                if (listScrollContainerRef.current) {
                                    listScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                                setMobileSheetSnap(prev => (prev === 'collapsed' ? 'half' : 'collapsed'));
                            }}
                            className="px-3 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer hover:border-orange-500/50 transition-colors"
                        >
                            <List size={14} className="text-[#ea580c]" />
                            <span>{reportsInViewCount} reports in view</span>
                        </div>

                    </div>

                    {/* Floating Exit Fullscreen Button on Mobile */}
                    {isMobileFullscreenMap && (
                        <div className="lg:hidden absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                            <button
                                type="button"
                                onClick={() => setIsMobileFullscreenMap(false)}
                                className="px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold shadow-lg backdrop-blur-sm flex items-center gap-1.5 border border-white/20 active:scale-95 transition-all cursor-pointer"
                            >
                                <Minimize2 size={13} />
                                <span>Exit fullscreen</span>
                            </button>
                        </div>
                    )}

                    {/* Google Map Instance */}
                    {isLoaded ? (
                        <GoogleMap
                            onLoad={(mapInstance) => {
                                setMap(mapInstance);
                                mapInstanceRef.current = mapInstance;
                            }}
                            onIdle={handleMapIdle}
                            onClick={() => {
                                if (selectedHazard) handleCloseDetail();
                                setMobileSheetSnap('collapsed');
                            }}
                            center={NORTH_CALOOCAN_CENTROID}
                            zoom={14}
                            mapContainerClassName="w-full h-full"
                            options={{
                                disableDefaultUI: true,
                                zoomControl: false,
                                mapTypeId: mapType,
                                clickableIcons: false,
                                gestureHandling: 'greedy',
                                styles: mapType === 'hybrid' ? SATELLITE_CIVIC_MAP_STYLE : (isDark ? DARK_CIVIC_MAP_STYLE : LIGHT_CIVIC_MAP_STYLE)
                            }}
                        >
                            {/* Authoritative Service Boundary Layer (Unchanged Line Design) */}
                            {mapLayers.serviceBoundary && (
                                <CaloocanBoundaryLayer
                                    activeSector={activeSector}
                                    onSectorClick={(sector) => handleSectorChange(sector)}
                                    isDarkMode={isDark}
                                />
                            )}

                            {/* User Device Location Blue Dot with Soft Accuracy Ring */}
                            {reportLocation?.lat && reportLocation?.lng && (
                                <OverlayViewF
                                    position={reportLocation}
                                    mapPaneName="floatPane"
                                    getPixelPositionOffset={() => ({ x: -16, y: -16 })}
                                >
                                    <div className="relative w-8 h-8 flex items-center justify-center pointer-events-none">
                                        <div className="absolute inset-0 rounded-full bg-blue-500/25 animate-ping" />
                                        <div className="relative z-10 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md" />
                                    </div>
                                </OverlayViewF>
                            )}

                            {/* Incident Markers: Uses canvas pin with picture if available; fallback to category pin */}
                            {mapLayers.reports && filteredReports.map(h => {
                                const isSelected = selectedHazard?.id === h.id;
                                if (isSelected) return null; // Rendered as rich PhotoMapPin via OverlayViewF below

                                const meta = getReportCategoryMeta(h);
                                const cacheKey = `${h.id}-${meta.color}-norm`;
                                const customIconUrl = photoPinIcons[cacheKey];

                                const size = 36;
                                const pointerH = 7;
                                const totalW = size + 6;
                                const totalH = size + pointerH + 2;

                                const iconConfig = customIconUrl
                                    ? getCachedIcon(customIconUrl, totalW, totalH, totalW / 2, totalH)
                                    : (window.google?.maps ? {
                                        url: getMarkerSVG(h, h.status, false),
                                        scaledSize: new window.google.maps.Size(36, 42),
                                        anchor: new window.google.maps.Point(18, 42)
                                    } : undefined);

                                return (
                                    <MarkerF
                                        key={`hazard-${h.id}`}
                                        position={{ lat: h.lat, lng: h.lng }}
                                        zIndex={150}
                                        title={`${h.title} (${h.category})`}
                                        onClick={() => handleSelectHazard(h)}
                                        options={{
                                            optimized: true,
                                            clickable: true
                                        }}
                                        icon={iconConfig}
                                    />
                                );
                            })}

                            {/* Selected Pin rendered via OverlayViewF with PhotoMapPin (3.5rem round photo, dual ring) */}
                            {mapLayers.reports && selectedHazard?.lat != null && selectedHazard?.lng != null && (
                                <OverlayViewF
                                    key={`selected-pin-${selectedHazard.id}`}
                                    position={{ lat: selectedHazard.lat, lng: selectedHazard.lng }}
                                    mapPaneName="floatPane"
                                    getPixelPositionOffset={() => ({ x: -28, y: -28 })}
                                >
                                    <PhotoMapPin
                                        innerRef={pinRef}
                                        report={selectedHazard}
                                        isSelected={true}
                                        isDark={isDark}
                                        categoryColor={selectedCategoryMeta?.color}
                                        onClick={() => handleSelectHazard(selectedHazard)}
                                        reportLocation={reportLocation}
                                    />
                                </OverlayViewF>
                            )}
                        </GoogleMap>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900">
                            <span>Loading community map...</span>
                        </div>
                    )}

                    {/* Desktop Satellite / Map View Toggle Button */}
                    <div className="hidden lg:flex absolute right-4 bottom-6 z-10 pointer-events-auto">
                        <button
                            type="button"
                            onClick={toggleSatelliteView}
                            className={`w-11 h-11 rounded-xl border shadow-md flex items-center justify-center transition-all cursor-pointer ${
                                mapType === 'hybrid'
                                    ? 'bg-[#ea580c] border-[#ea580c] text-white shadow-orange-500/25 ring-2 ring-[#ea580c]/40'
                                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                            title={mapType === 'hybrid' ? 'Switch to map view' : 'Switch to satellite view'}
                            aria-label={mapType === 'hybrid' ? 'Switch to map view' : 'Switch to satellite view'}
                        >
                            <Layers size={19} />
                        </button>
                    </div>

                    {/* Desktop Bottom Category Legend (Horizontal rounded pill bar) */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-lg hidden lg:flex items-center gap-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[95vw] overflow-x-auto no-scrollbar">
                        {ISSUE_CATEGORIES.filter(c => c.id !== 'all').map(c => {
                            const IconComp = c.icon;
                            return (
                                <span key={c.id} className="flex items-center gap-1.5 shrink-0">
                                    <IconComp size={13} style={{ color: c.color }} />
                                    <span>{c.shortLabel || c.label}</span>
                                </span>
                            );
                        })}
                    </div>

                    {/* ── MOBILE SATELLITE / MAP VIEW TOGGLE (Single control kept per user request) ── */}
                    <div
                        className="lg:hidden absolute right-3 z-20 flex flex-col items-center transition-all duration-300 pointer-events-auto"
                        style={{
                            bottom: isMobileFullscreenMap
                                ? 'calc(env(safe-area-inset-bottom, 0px) + 20px)'
                                : mobileSheetSnap === 'collapsed'
                                ? 'calc(env(safe-area-inset-bottom, 0px) + 88px)'
                                : mobileSheetSnap === 'half'
                                ? 'calc(env(safe-area-inset-bottom, 0px) + 380px)'
                                : '-999px',
                            opacity: mobileSheetSnap === 'full' && !isMobileFullscreenMap ? 0 : 1,
                            pointerEvents: mobileSheetSnap === 'full' && !isMobileFullscreenMap ? 'none' : 'auto'
                        }}
                    >
                        <button
                            type="button"
                            onClick={toggleSatelliteView}
                            className={`w-11 h-11 rounded-xl border shadow-md flex items-center justify-center transition-all cursor-pointer ${
                                mapType === 'hybrid'
                                    ? 'bg-[#ea580c] border-[#ea580c] text-white shadow-orange-500/25 ring-2 ring-[#ea580c]/40'
                                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-orange-600'
                            }`}
                            title={mapType === 'hybrid' ? 'Switch to map view' : 'Switch to satellite view'}
                            aria-label={mapType === 'hybrid' ? 'Switch to map view' : 'Switch to satellite view'}
                        >
                            <Layers size={18} />
                        </button>
                    </div>



                    {/* ── MOBILE DRAGGABLE BOTTOM SHEET (3 POSITIONS: COLLAPSED, HALF, FULL) ── */}
                    <div
                        className={`lg:hidden absolute inset-x-0 bottom-0 z-30 bg-white dark:bg-slate-900 rounded-t-[24px] border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col transition-all duration-300 ease-out select-none ${
                            isMobileFullscreenMap || (isSearchFocused && matchingSearchReports.length > 0)
                                ? 'translate-y-full opacity-0 pointer-events-none'
                                : mobileSheetSnap === 'collapsed'
                                ? 'h-[74px] pb-[env(safe-area-inset-bottom,0px)]'
                                : mobileSheetSnap === 'half'
                                ? 'h-[365px] max-h-[75vh] pb-[calc(env(safe-area-inset-bottom,0px)+6px)]'
                                : 'h-[calc(100%-60px)] max-h-[calc(100%-60px)] pb-[env(safe-area-inset-bottom,0px)]'
                        }`}
                    >
                        {/* Drag Handle Bar */}
                        <div
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onClick={() => {
                                if (mobileSheetSnap === 'collapsed') {
                                    setMobileSheetSnap(selectedHazard ? 'half' : 'full');
                                } else if (mobileSheetSnap === 'half') {
                                    setMobileSheetSnap('collapsed');
                                } else if (mobileSheetSnap === 'full') {
                                    setMobileSheetSnap('collapsed');
                                }
                            }}
                            className="w-full h-7 pt-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shrink-0 select-none"
                            aria-label="Drag handle"
                        >
                            <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </div>

                        {/* Position 1: Peek / Collapsed (~84px height) */}
                        {mobileSheetSnap === 'collapsed' && (
                            <div
                                onClick={() => setMobileSheetSnap(selectedHazard ? 'half' : 'full')}
                                className="px-4 pt-1 pb-3 flex items-center justify-between cursor-pointer"
                            >
                                <div className="min-w-0 pr-2">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                        Nearby reports ({filteredReports.length})
                                    </h2>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {selectedHazard ? selectedHazard.title : filteredReports.length === 0 ? emptyReportsMessage : 'Tap to explore reports or select a marker'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMobileSheetSnap('full');
                                    }}
                                    className="text-xs font-bold text-[#ea580c] flex items-center gap-0.5 hover:underline cursor-pointer shrink-0"
                                >
                                    <span>View list</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}

                        {/* Position 2: Half / Card View (Selected Report Details) */}
                        {mobileSheetSnap === 'half' && (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Header with close/collapse button */}
                                <div
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    className="px-4 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0 cursor-grab active:cursor-grabbing"
                                >
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Report details
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMobileSheetSnap('collapsed');
                                            setSelectedHazard(null);
                                        }}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                        aria-label="Close card"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {selectedHazard ? (
                                    <div className="flex-1 overflow-y-auto px-4 py-2.5 pb-2 space-y-2.5 custom-scrollbar">
                                        {/* Top Card: Photo + Title + Meta (Responsive) */}
                                        <div className="flex flex-col sm:flex-row items-start gap-3">
                                            {selectedHazardPhotoUrl ? <img
                                                src={selectedHazardPhotoUrl}
                                                alt={selectedHazard.title || 'Report preview'}
                                                className="w-20 h-20 sm:w-[100px] sm:h-[80px] rounded-xl object-cover border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shrink-0 self-start"
                                                /> : <div className="w-20 h-20 sm:w-[100px] sm:h-[80px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 shrink-0 self-start" aria-label={t('mapPublicReports.photoPrivate', { defaultValue: 'No report photo available' })}><FileText size={24} aria-hidden="true" /></div>}
                                            <div className="flex-1 min-w-0 flex flex-col justify-between w-full">
                                                <div>
                                                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug break-words">
                                                        {selectedHazard.title || 'Civic infrastructure report'}
                                                    </h3>
                                                    <span className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500 block mt-0.5">
                                                        {selectedHazard.ticket_id || `PUL-2026-${String(selectedHazard.id).padStart(4, '0')}`}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${selectedCategoryMeta.bgColor} ${selectedCategoryMeta.textColor} ${selectedCategoryMeta.borderColor} shrink-0`}>
                                                        {selectedCategoryMeta.label}
                                                    </span>
                                                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 min-w-0 flex items-center gap-1">
                                                        <MapPin size={11} className="text-slate-400 shrink-0" />
                                                        <span className="break-words line-clamp-1">{cleanResidentAddress(selectedHazard.location_string) || cleanResidentAddress(selectedHazard.barangay) || t('mapPublicReports.locationUnavailable', { defaultValue: 'Location unavailable' })}</span>
                                                    </span>
                                                </div>
                                                {!selectedHazard.isOwnReport && <p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">{publicStatusLabel}</p>}
                                            </div>
                                        </div>

                                        {/* Latest Update Box */}
                                        {(selectedHazard.staff_notes || selectedHazard.latest_update) && <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 flex items-start gap-2">
                                            <FileText size={15} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 block">
                                                    Latest update
                                                </span>
                                                <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 font-medium leading-relaxed line-clamp-2">
                                                    {selectedHazard.staff_notes || selectedHazard.latest_update}
                                                </p>
                                            </div>
                                        </div>}

                                        {/* Action Button: View full report (Full Width) */}
                                        {selectedHazard.isOwnReport && (
                                            <div className="pt-1.5 pb-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (onOpenReportDetail) onOpenReportDetail(selectedHazard);
                                                    }}
                                                    className="w-full h-11 min-h-[44px] rounded-xl bg-[#ea580c] hover:bg-[#d94e07] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                                                >
                                                    <ExternalLink size={15} />
                                                    <span>View full report</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-xs text-slate-500">
                                        Select a report marker on the map to view details.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Position 3: Full Sheet / Scrollable List of Reports */}
                        {mobileSheetSnap === 'full' && (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    className="px-4 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0 cursor-grab active:cursor-grabbing"
                                >
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                            Nearby reports ({filteredReports.length})
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Showing reports in Caloocan
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setMobileSheetSnap('collapsed')}
                                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                                    >
                                        <span>Back to map</span>
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                    {filteredReports.length === 0 && <div className="p-5 text-sm text-slate-600 dark:text-slate-300" role={reportsError ? 'alert' : 'status'}>
                                        <p>{emptyReportsMessage}</p>
                                        {reportsError && onRetryReports && <button type="button" onClick={onRetryReports} className="mt-3 min-h-11 px-3 rounded-lg font-semibold text-[#ea580c] focus-visible:outline-3 focus-visible:outline-[#ea580c]">{t('mapPublicReports.retry', { defaultValue: 'Try again' })}</button>}
                                        {hasReportFilters && !reportsError && !reportsLoading && <button type="button" onClick={resetReportFilters} className="mt-3 min-h-11 px-3 rounded-lg font-semibold text-[#ea580c] focus-visible:outline-3 focus-visible:outline-[#ea580c]">{t('mapPublicReports.clearFilters', { defaultValue: 'Clear filters' })}</button>}
                                    </div>}
                                    {filteredReports.map(report => {
                                        const isSelected = selectedHazard?.id === report.id;
                                        const meta = getReportCategoryMeta(report);
                                        const IconComp = meta.icon;
                                        const distanceMeters = reportLocation?.lat && report.lat
                                            ? getDistance(reportLocation, { lat: report.lat, lng: report.lng })
                                            : null;
                                        const distanceText = formatDistance(distanceMeters);

                                        return (
                                            <div
                                                key={`mob-${report.id}`}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => {
                                                    handleSelectHazard(report);
                                                    setMobileSheetSnap('half');
                                                }}
                                                className={`w-full min-h-[72px] p-3 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 border-l-[3.5px] border-l-[#0284c7] shadow-xs'
                                                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-2xs"
                                                    style={{ backgroundColor: `${meta.color}18` }}
                                                >
                                                    <IconComp size={18} style={{ color: meta.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                        {report.title || 'Civic infrastructure report'}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                        {cleanResidentAddress(report.location_string) || cleanResidentAddress(report.barangay) || t('mapPublicReports.locationUnavailable', { defaultValue: 'Location unavailable' })}
                                                    </p>
                                                    {distanceText && (
                                                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                                            {distanceText}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center shrink-0">
                                                    <ChevronRight size={15} className="text-slate-400" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* ── RIGHT DETAIL PANEL FOR DESKTOP (~360px, hidden on phone) ── */}
                {selectedHazard && (
                    <aside className="hidden lg:flex lg:w-[360px] shrink-0 h-full border-l border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col overflow-y-auto custom-scrollbar shadow-xl transition-all duration-200 z-20">
                        {/* Header: Title + Close Button */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Report details
                            </span>
                            <button
                                type="button"
                                onClick={handleCloseDetail}
                                className="w-10 h-10 -mr-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                                title="Close details (Esc)"
                                aria-label="Close details"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Panel Body */}
                        <div className="p-4 sm:p-5 space-y-4">
                            {/* Category Chip + Title + Ticket ID */}
                            <div>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${selectedCategoryMeta.bgColor} ${selectedCategoryMeta.textColor} border ${selectedCategoryMeta.borderColor}`}>
                                    <selectedCategoryMeta.icon size={13} />
                                    <span>{selectedHazard.category || selectedHazard.raw_category || selectedCategoryMeta.label}</span>
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2 leading-tight">
                                    {selectedHazard.title || 'Civic infrastructure report'}
                                </h2>
                                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1 block">
                                    {selectedHazard.ticket_id || `PUL-2026-${String(selectedHazard.id || '').padStart(4, '0')}`}
                                </span>
                                {!selectedHazard.isOwnReport && <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{publicStatusLabel}</p>}
                            </div>

                            {/* Photo Preview */}
                            <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                                {selectedHazardPhotoUrl ? <img
                                    src={selectedHazardPhotoUrl}
                                    alt={selectedHazard.title || 'Report photo'}
                                    className="w-full h-full object-cover"
                                /> : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-300"><FileText size={24} aria-hidden="true" /><span>{t('mapPublicReports.photoPrivate', { defaultValue: 'No report photo available' })}</span></div>}
                            </div>

                            {/* Key-Value Metadata Rows */}
                            <div className="space-y-2 py-2 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                                <div className="flex items-center gap-2.5">
                                    <MapPin size={15} className="text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-500 w-20">Location</span>
                                    <span className="font-medium text-slate-900 dark:text-white break-words min-w-0">
                                        {cleanResidentAddress(selectedHazard.location_string) || cleanResidentAddress(selectedHazard.barangay) || t('mapPublicReports.locationUnavailable', { defaultValue: 'Location unavailable' })}
                                    </span>
                                </div>
                                {selectedHazard.accuracy_m > 0 && <div className="pl-[25px] text-slate-600 dark:text-slate-300">Reported map accuracy: ±{Math.round(selectedHazard.accuracy_m)} m</div>}
                                <div className="flex items-center gap-2.5">
                                    <Layers size={15} className="text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-500 w-20">Category</span>
                                    <span className="font-medium text-slate-900 dark:text-white truncate">
                                        {selectedHazard.category || selectedHazard.raw_category || selectedCategoryMeta.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Calendar size={15} className="text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-500 w-20">Submitted</span>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {formatDate(selectedHazard.created_at)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Clock size={15} className="text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-500 w-20">Updated</span>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {formatDate(selectedHazard.updated_at || selectedHazard.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Latest Update */}
                            {(selectedHazard.staff_notes || selectedHazard.latest_update) && <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                    <FileText size={13} />
                                    <span>Latest update</span>
                                </span>
                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                    {selectedHazard.staff_notes || selectedHazard.latest_update}
                                </p>
                            </div>}



                            {/* Description */}
                            {(selectedHazard.isOwnReport || selectedHazard.public_details_approved) && <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                                    Description
                                </span>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {selectedHazard.description || t('mapPublicReports.descriptionUnavailable', { defaultValue: 'No description recorded.' })}
                                </p>
                            </div>}

                            {/* Nearby Landmark (shown only if available) */}
                            {selectedHazard.landmark && (
                                <div className="space-y-1 pt-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                                        Nearby landmark
                                    </span>
                                    <p className="text-xs text-slate-700 dark:text-slate-300">
                                        {selectedHazard.landmark}
                                    </p>
                                </div>
                            )}

                            {/* Action Button: View full report (filled orange) */}
                            {selectedHazard.isOwnReport && (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onOpenReportDetail) onOpenReportDetail(selectedHazard);
                                        }}
                                        className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#d94e07] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                                    >
                                        <ExternalLink size={16} />
                                        <span>View full report</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* ── BARANGAY PICKER BOTTOM SHEET MODAL (All 188 North & South Caloocan Barangays) ── */}
            {isBarangayPickerOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
                    <div className="bg-white dark:bg-slate-900 rounded-t-[24px] border-t border-slate-200 dark:border-slate-800 max-h-[82dvh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">Select Barangay</h3>
                                <p className="text-xs text-slate-500">Filter reports by Caloocan barangay (188 total)</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBarangayPickerOpen(false)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                                <Search size={14} className="text-slate-400 shrink-0" />
                                <input
                                    type="text"
                                    value={barangaySearchFilter}
                                    onChange={(e) => setBarangaySearchFilter(e.target.value)}
                                    placeholder="Search barangay number..."
                                    className="bg-transparent border-none outline-hidden w-full text-xs text-slate-900 dark:text-white"
                                />
                                {barangaySearchFilter && (
                                    <button type="button" onClick={() => setBarangaySearchFilter('')} className="p-0.5 text-slate-400 cursor-pointer">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Quick Sector Filter Pills: All | North (165-188) | South (1-164) */}
                            <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => setBarangaySectorFilter('all')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        barangaySectorFilter === 'all'
                                            ? 'bg-[#ea580c] text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    All (188)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBarangaySectorFilter('north')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        barangaySectorFilter === 'north'
                                            ? 'bg-[#ea580c] text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    North Caloocan (165–188)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBarangaySectorFilter('south')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        barangaySectorFilter === 'south'
                                            ? 'bg-[#ea580c] text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    South Caloocan (1–164)
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
                            {filteredBarangaysList.map(b => {
                                const isCurrent = selectedBarangay === b.value;
                                return (
                                    <button
                                        key={b.value}
                                        type="button"
                                        onClick={() => {
                                            setSelectedBarangay(b.value);
                                            setIsBarangayPickerOpen(false);
                                            if (b.value === 'all') {
                                                handleSectorChange('all');
                                            } else if (b.number >= 165 && b.number <= 188) {
                                                handleSectorChange('north');
                                                map?.panTo(NORTH_CALOOCAN_CENTROID || { lat: 14.7695, lng: 121.0569 });
                                                map?.setZoom(15);
                                            } else {
                                                handleSectorChange('south');
                                                map?.panTo(SOUTH_CALOOCAN_CENTROID || { lat: 14.6643, lng: 120.9890 });
                                                map?.setZoom(15);
                                            }
                                        }}
                                        className={`w-full p-2.5 sm:p-3 text-left rounded-xl flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                                            isCurrent
                                                ? 'bg-[#ea580c]/10 text-[#ea580c] font-bold'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <MapPin size={14} className={isCurrent ? 'text-[#ea580c] shrink-0' : 'text-slate-400 shrink-0'} />
                                            <div className="truncate">
                                                <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                                                    {b.label}
                                                </span>
                                                {b.sector !== 'all' && (
                                                    <span className="text-[10px] text-slate-400 font-normal block">
                                                        {b.sector === 'north' ? 'North Caloocan · District 3' : 'South Caloocan · Districts 1 & 2'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isCurrent && <span className="w-2 h-2 rounded-full bg-[#ea580c] shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── AREA & MAP LAYERS BOTTOM SHEET MODAL ── */}
            {isFilterSheetOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
                    <div className="bg-white dark:bg-slate-900 rounded-t-[24px] border-t border-slate-200 dark:border-slate-800 max-h-[75dvh] flex flex-col shadow-2xl p-4 space-y-4 animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">Map Filters & Layers</h3>
                                <p className="text-xs text-slate-500">Filter area sector and toggle map layers</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFilterSheetOpen(false)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Area Sector Selection */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Area Sector</span>
                            <div className="grid grid-cols-3 gap-2">
                                {['all', 'north', 'south'].map(sector => (
                                    <button
                                        key={sector}
                                        type="button"
                                        onClick={() => handleSectorChange(sector)}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                                            activeSector === sector
                                                ? 'bg-[#ea580c] text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {sector === 'all' ? 'All areas' : `${sector} Caloocan`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Map Layers Toggles */}
                        <div className="space-y-2 pt-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Map Layers</span>
                            <div className="space-y-2">
                                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 cursor-pointer">
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Civic Reports Pins</span>
                                    <input
                                        type="checkbox"
                                        checked={mapLayers.reports}
                                        onChange={(e) => toggleLayer('reports', e.target.checked)}
                                        className="w-4 h-4 rounded text-[#ea580c] focus:ring-[#ea580c] cursor-pointer"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 cursor-pointer">
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Service Boundary Line</span>
                                    <input
                                        type="checkbox"
                                        checked={mapLayers.serviceBoundary}
                                        onChange={(e) => toggleLayer('serviceBoundary', e.target.checked)}
                                        className="w-4 h-4 rounded text-[#ea580c] focus:ring-[#ea580c] cursor-pointer"
                                    />
                                </label>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsFilterSheetOpen(false)}
                            className="w-full h-12 rounded-xl bg-[#ea580c] hover:bg-[#d94e07] text-white font-bold text-xs sm:text-sm flex items-center justify-center transition-colors cursor-pointer mt-2"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
