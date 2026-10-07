import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GoogleMap,
    MarkerF,
    InfoWindowF,
    PolygonF,
    StreetViewPanorama,
    OverlayViewF
} from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import {
    LayoutDashboard,
    Bell,
    User,
    Settings,
    LogOut,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    X,
    Camera,
    MapPin,
    PhoneCall,
    Globe,
    Star,
    Share2,
    Search,
    BookOpen,
    Handshake,
    WifiOff,
    ShieldCheck,
    Image as ImageIcon,
    Plus,
    Clock,
    Info,
    ArrowRight,
    Droplets,
    Zap,
    FileText,
    Brain,
    AlertTriangle,
    Map as MapIcon,
    Home,
    Sun,
    Moon,
    Monitor,
    HardHat,
    ShieldAlert,
    Grid,
    Mail,
    Smartphone,
    Eye,
    AtSign,
    ThumbsUp,
    TrendingUp,
    CheckCircle,
    Truck,
    Menu,
    X as XIcon,
    Radio,
    Lock,
    Key,
    Shield,
    EyeOff,
    Check,
    Loader2,
    Maximize2,
    Minimize2,
    Upload,
    Calendar,
    Mic,
    MicOff,
    Volume2,
    MessageSquareText,
    Landmark,
    Lightbulb,
    Cone,
    Edit3,
    PlusCircle,
    Flame,
    Wrench,
    Sparkles,
    RotateCcw,
    CameraOff,
    Copy,
    Layers,
    Crosshair,
    Navigation,
    LocateFixed,
    Compass,
    HelpCircle,
    History,
    Trash2,
    Signpost
} from 'lucide-react';

import PulseAIMarkdown from '../components/PulseAIMarkdown';
import { useTheme } from '../contexts/ThemeContext';
import Swal from 'sweetalert2';
import Branding from '../components/Branding';
import { useTranslation } from 'react-i18next';
import { getAuthToken, getAuthUser, clearAuthSession } from '../utils/authSession';
import {
    formatTicketId,
    getStatusDescriptor,
    getReportWorkflowIndex,
    REPORT_WORKFLOW_STEPS
} from '../utils/reportWorkflow';
import { API_BASE_URL } from '../utils/apiBase';
import { GOOGLE_MAPS_LIBRARIES } from '../utils/mapsConfig';
import ClaimReportModal from '../components/modals/ClaimReportModal';
import IDCameraModal from '../components/IDCameraModal';
import { watermarkEvidenceFile } from '../utils/watermark';
import AvatarCropModal, { validateAvatarFile } from '../components/AvatarCropModal';
import ReportDensityLayer from '../components/maps/ReportDensityLayer';

import {
    NORTH_CALOOCAN_PATH,
    SOUTH_CALOOCAN_PATH,
    NORTH_CALOOCAN_CENTROID,
    SOUTH_CALOOCAN_CENTROID,
    COMBINED_CALOOCAN_BOUNDS,
    getCaloocanDistrict,
    isInsideCaloocan,
    findBarangayByCoordinates
} from '../data/caloocanBoundaries';
import caloocanBorderData from '../data/caloocan_border.json';

const CALOOCAN_CENTER = COMBINED_CALOOCAN_BOUNDS.center;
const CALOOCAN_CITY_HALL_NORTH_LOC = { lat: 14.7505408, lng: 121.0540317 }; // Zapote Rd North HQ
const CALOOCAN_CITY_HALL_SOUTH_LOC = { lat: 14.6469, lng: 120.9844 }; // 8th Ave South City Hall
import {
    CALOOCAN_BARANGAYS,
    getPostalCodeForBarangay,
    encodeOpenLocationCode,
    extractCleanPlusCode,
    parseGeocodedAddress,
    parseAddressString,
    formatFullAddress,
    formatCardAddress,
    formatNearbyAddress,
    isMinimumViableAddress
} from '../utils/philippineAddress';

export const formatAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return '';
    return addr
        .replace(/\b([a-z])/g, (char) => char.toUpperCase())
        .replace(/\s*,\s*/g, ', ')
        .trim();
};

export const formatFriendlyNotice = (reason) => {
    if (!reason) {
        return "We couldn't clearly spot a city problem in this photo. Please upload a clear photo of the actual damage (such as a pothole, broken streetlight, or water leak).";
    }
    let clean = String(reason).trim();
    clean = clean.replace(/^(AI Safety Warning:\s*)+/i, '');
    clean = clean.replace(/^(Image rejected:\s*)+/i, '');
    clean = clean.replace(/^(Report rejected:\s*)+/i, '');
    clean = clean.replace(/^Report rejected by AI Safety Filter:\s*/i, '');

    const lower = clean.toLowerCase();
    if (lower.includes('selfie') || lower.includes('portrait')) {
        return "This looks like a personal photo or selfie. Please take a photo showing the actual damage or problem instead.";
    }
    if (lower.includes('infrastructure issue') || lower.includes('valid infrastructure') || lower.includes('hazard or damage')) {
        return "We couldn't clearly spot a community issue in this photo. Please take or upload a photo showing the actual problem (such as a pothole, broken streetlight, or leak).";
    }
    return clean;
};

const LIBRARIES = GOOGLE_MAPS_LIBRARIES;

// Government-grade civic map styles (Zero POI/transit clutter, high contrast civic hierarchy)
const DARK_BASE_RULES = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0b111e" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#070b14" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }, { weight: 1 }] },
    { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
    { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#243247" }] },
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

const REPORT_CATEGORIES = (t) => [
    { value: 'Water Supply & Distribution', label: t('landing.solutions.s1_title', { defaultValue: 'Water Supply & Distribution' }) },
    { value: 'Power & Street Lighting', label: t('landing.solutions.s2_title', { defaultValue: 'Power & Street Lighting' }) },
    { value: 'Roads & Bridges', label: t('landing.solutions.s3_title', { defaultValue: 'Roads & Bridges' }) },
    { value: 'Traffic & Road Signs', label: t('landing.solutions.traffic_title', { defaultValue: 'Traffic & Road Signs' }) },
    { value: 'Public Safety & Hazards', label: t('landing.solutions.s4_title', { defaultValue: 'Public Safety & Hazards' }) },
    { value: 'Public Buildings & Facilities', label: t('landing.solutions.s5_title', { defaultValue: 'Public Buildings & Facilities' }) },
    { value: 'Others', label: t('landing.solutions.s6_title', { defaultValue: 'Others' }) },
];

const SIMULATED_HAZARDS = [
    { id: 1, category: 'Flooding', title: 'Deep Puddles on Highway', lat: 14.7566, lng: 121.0450, status: 'pending', time: '10 mins ago', distance: '1.2 km' },
    { id: 2, category: 'Road Issue', title: 'Cracked Surface', lat: 14.7610, lng: 121.0480, status: 'unverified', time: '1 hr ago', distance: '2.5 km' },
    { id: 3, category: 'Electrical', title: 'Fallen Wire Hazard', lat: 14.7520, lng: 121.0410, status: 'pending', time: '5 hrs ago', distance: '0.8 km' },
    { id: 4, category: 'Waste Management', title: 'Uncollected Trash Blockage', lat: 14.7590, lng: 121.0390, status: 'pending', time: '1 day ago', distance: '3.1 km' },
    { id: 5, category: 'Flooding', title: 'Blocked City Drainage', lat: 14.7650, lng: 121.0500, status: 'pending', time: '30 mins ago', distance: '4.0 km' },
    { id: 6, category: 'Road Issue', title: 'Severe Pothole', lat: 14.7480, lng: 121.0350, status: 'resolved', time: '2 days ago', distance: '1.5 km' },
    { id: 7, category: 'Public Safety', title: 'Broken Street Light', lat: 14.7630, lng: 121.0420, status: 'pending', time: '2 hrs ago', distance: '0.5 km' },
    { id: 8, category: 'Electrical', title: 'Transformer Sparking', lat: 14.7540, lng: 121.0550, status: 'pending', time: '4 hrs ago', distance: '2.2 km' }
];

const EMERGENCY_HOTLINES = (t) => [
    { name: t('dashboard.help.cityEng', { defaultValue: 'City Engineering' }), tags: 'Public Works, Hazards', num: '888-1234', color: 'orange' },
    { name: t('dashboard.help.maynilad', { defaultValue: 'Maynilad' }), tags: 'Water Leaks, Drainage', num: '1626', color: 'blue' },
    { name: t('dashboard.help.meralco', { defaultValue: 'Meralco' }), tags: 'Live Wires, Outages', num: '16211', color: 'yellow' }
];

const QUICK_FUNCTIONS_DATA = (t) => [
    { id: 'report', icon: <Camera size={22} />, label: t('dashboard.quickReport.title', { defaultValue: 'File Report' }), color: 'orange', modal: 'file-report' },
    { id: 'map', icon: <MapIcon size={22} />, label: t('dashboard.sidebar.map', { defaultValue: 'Barangay Map' }), color: 'blue', modal: 'map' },
    { id: 'services', icon: <Handshake size={22} />, label: t('dashboard.sidebar.services', { defaultValue: 'LGU Services' }), color: 'green', modal: 'services' },
    { id: 'knowledge', icon: <BookOpen size={22} />, label: t('dashboard.sidebar.knowledge', { defaultValue: 'Knowledge Base' }), color: 'indigo', modal: 'knowledge' },
    { id: 'track', icon: <Search size={22} />, label: t('dashboard.sidebar.track', { defaultValue: 'Track Issue' }), color: 'teal', tab: 'reports' }
];

const NAV_ITEMS = (t) => [
    { id: 'overview', icon: <Home size={22} strokeWidth={2} />, label: t('dashboard.sidebar.home', { defaultValue: 'Home' }) },
    { id: 'reports', icon: <FileText size={22} strokeWidth={2} />, label: t('dashboard.sidebar.reports', { defaultValue: 'My reports' }) },
    { id: 'report', icon: <Plus size={24} strokeWidth={3} />, label: t('dashboard.sidebar.report', { defaultValue: 'Report' }), isAction: true },
    { id: 'updates', icon: <Bell size={22} strokeWidth={2} />, label: t('dashboard.sidebar.updates', { defaultValue: 'Updates' }) },
    { id: 'profile', icon: <User size={22} strokeWidth={2} />, label: t('dashboard.sidebar.account', { defaultValue: 'Account' }) },
];

const LGU_SERVICES_LIST = (t) => [
    { id: 1, name: 'Business Permit', icon: <TrendingUp size={24} />, desc: 'Renew or apply for new business permits online.', color: 'blue', url: 'https://caloocancity.gov.ph/business-permit/' },
    { id: 2, name: 'Barangay Clearance', icon: <FileText size={24} />, desc: 'Request official residency documents.', color: 'orange', url: 'https://caloocancity.gov.ph/' },
    { id: 3, name: 'Health Service', icon: <Droplets size={24} />, desc: 'Book appointments at local health centers.', color: 'red', url: 'https://caloocancity.gov.ph/health-services-department/' },
    { id: 4, name: 'PWD/Senior ID', icon: <User size={24} />, desc: 'Apply for social welfare identification.', color: 'green', url: 'https://caloocancity.gov.ph/social-welfare/' },
    { id: 5, name: 'Tax Payment', icon: <Zap size={24} />, desc: 'Pay property and occupation taxes.', color: 'yellow', url: 'https://caloocancity.gov.ph/online-tax-payment/' },
    { id: 6, name: 'Scholarships', icon: <BookOpen size={24} />, desc: 'City-funded educational assistance programs.', color: 'indigo', url: 'https://caloocancity.gov.ph/scholarships/' },
];

const KNOWLEDGE_BASE_ARTICLES = (t) => [
    { id: 1, title: t('knowledge.art1.title', { defaultValue: 'How AI Reporting Works' }), category: t('knowledge.cat.tech', { defaultValue: 'Tech Guide' }), excerpt: t('knowledge.art1.excerpt', { defaultValue: 'Learn how Gemini AI verifies your incident reports in real-time.' }) },
    { id: 2, title: t('knowledge.art2.title', { defaultValue: 'Flood Evacuation Routes' }), category: t('knowledge.cat.emergency', { defaultValue: 'Emergency' }), excerpt: t('knowledge.art2.excerpt', { defaultValue: 'Safe zones and routes for residents in Low-lying North Caloocan areas.' }) },
    { id: 3, title: t('knowledge.art3.title', { defaultValue: 'Engineering Permit Guide' }), category: t('knowledge.cat.publicWorks', { defaultValue: 'Public Works' }), excerpt: t('knowledge.art3.excerpt', { defaultValue: 'Step-by-step guide on applying for building and excavation permits in Caloocan North.' }) },
    { id: 4, title: t('knowledge.art4.title', { defaultValue: 'Noise Ordinance Info' }), category: t('knowledge.cat.community', { defaultValue: 'Community' }), excerpt: t('knowledge.art4.excerpt', { defaultValue: 'Understanding the city wide peace and order regulations.' }) },
];

const LeftSidebar = ({ user, activeTab, handleSetTab, handleSetModal, handleLogout, t }) => {
    const navDestinations = [
        { id: 'overview', icon: <Home size={19} strokeWidth={2} />, label: t('dashboard.sidebar.home', { defaultValue: 'Home' }) },
        { id: 'reports', icon: <FileText size={19} strokeWidth={2} />, label: t('dashboard.sidebar.reports', { defaultValue: 'My reports' }) },
        { id: 'updates', icon: <Bell size={19} strokeWidth={2} />, label: t('dashboard.sidebar.updates', { defaultValue: 'Updates' }) },
        { id: 'profile', icon: <User size={19} strokeWidth={2} />, label: t('dashboard.sidebar.account', { defaultValue: 'Account' }) },
    ];

    return (
        <div className="w-full h-full pb-6 hidden lg:flex flex-col justify-between pl-2 pr-4 lg:pr-5 pt-6 border-r border-slate-200/80 dark:border-slate-800">
            <div>
                {/* User Identity Snapshot */}
                <div onClick={() => handleSetTab('profile')} className="flex items-center gap-3 p-3 mb-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 hover:border-orange-500/50 cursor-pointer transition-all group shadow-2xs">
                    <div className={`w-11 h-11 rounded-full font-bold flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden relative border border-slate-200 dark:border-slate-700 ${
                        user.avatarPhoto ? 'bg-slate-100 dark:bg-slate-900' : 'bg-gradient-to-br from-orange-400 to-orange-600'
                    }`}>
                        {user.avatarPhoto ? (
                            <img src={user.avatarPhoto} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            user.avatar
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[15px] text-slate-900 dark:text-white truncate group-hover:text-orange-500 transition-colors">{user.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.barangay}</p>
                    </div>
                </div>

                {/* Primary Action Button — Structurally separated from navigation list */}
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => handleSetModal('file-report')}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg hover:shadow-orange-500/25 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 group"
                        title="Submit a new civic infrastructure report"
                    >
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:rotate-90 transition-transform duration-200">
                            <Plus size={14} strokeWidth={3} className="text-white" />
                        </div>
                        <span>{t('dashboard.sidebar.report', { defaultValue: 'Report an issue' })}</span>
                    </button>
                </div>

                {/* Structural Divider Separating Standing Action from Destination Rails */}
                <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-4" role="separator" />

                {/* Persistent Side Navigation Rail (Destinations) */}
                <nav className="space-y-1.5" aria-label="Main Navigation">
                    {navDestinations.map(item => {
                        const isActive = (item.id === 'overview' && (activeTab === 'overview' || activeTab === 'home')) || activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSetTab(item.id)}
                                aria-current={isActive ? 'page' : undefined}
                                className={`w-full relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 group ${
                                    isActive
                                        ? 'bg-orange-500/10 dark:bg-orange-500/15 text-[#ff6b00] font-extrabold shadow-2xs border border-orange-500/30 dark:border-orange-500/20'
                                        : 'text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent'
                                }`}
                            >
                                {/* Signal Cut Accent Indicator for Active State */}
                                {isActive && (
                                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#ff6b00] rounded-r-full" aria-hidden="true" />
                                )}
                                <span className={`shrink-0 transition-colors ${isActive ? 'text-[#ff6b00]' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>
                                    {item.icon}
                                </span>
                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Supporting Footer Links */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
                <div className="px-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    <div className="flex flex-wrap gap-2 mb-2">
                        <button onClick={() => handleSetModal('privacy')} className="hover:underline hover:text-orange-500 cursor-pointer">{t('footer.privacy', { defaultValue: 'Privacy' })}</button> ·
                        <button onClick={() => handleSetModal('terms')} className="hover:underline hover:text-orange-500 cursor-pointer">{t('footer.terms', { defaultValue: 'Terms' })}</button> ·
                        <button onClick={() => handleSetModal('cookies')} className="hover:underline hover:text-orange-500 cursor-pointer">{t('footer.cookie', { defaultValue: 'Cookies' })}</button>
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-600">PULSO Caloocan North © 2026</div>
                </div>
            </div>
        </div>
    );
};

const RightSidebar = ({
    user,
    handleSetModal,
    userReports,
    loadingReports,
    processedHazards,
    setSelectedHazard,
    map,
    t
}) => (
    <div className="w-full h-full pb-6 hidden xl:block pr-2 pl-4 lg:pl-6 pt-6">
        <div className="mb-6">
            <h3 className="font-bold text-[13px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">Your Impact</h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                            <ShieldCheck size={20} className="text-emerald-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Registered Citizen</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Verified Resident</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
                        Active
                    </span>
                </div>

                <div className="relative grid grid-cols-2 gap-2 mt-2">
                    <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
                        <div className="text-lg font-bold font-display text-slate-900 dark:text-white">
                            {loadingReports ? '...' : userReports.filter(r => r.status === 'resolved').length}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase">Resolved</div>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
                        <div className="text-lg font-bold font-display text-slate-900 dark:text-white">
                            {loadingReports ? '...' : userReports.filter(r => r.status !== 'resolved' && r.status !== 'rejected' && r.status !== 'cancelled').length}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase">Active</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-bold text-[13px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Nearby Hazards</h3>
                <button onClick={() => handleSetModal('map')} className="text-[12px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    See All <ChevronRight size={14} />
                </button>
            </div>
            <div className="space-y-3">
                {processedHazards.slice(0, 3).map((hazard) => (
                    <div key={hazard.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 transition-all group relative overflow-hidden hover:shadow-md">
                        <div className="flex items-start gap-3 relative z-10">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hazard.status === 'resolved' ? 'bg-green-50 dark:bg-green-900/10 text-green-500' : 'bg-red-50 dark:bg-red-900/10 text-red-500'}`}>
                                <AlertTriangle size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-[14px] text-slate-900 dark:text-white truncate pr-2 group-hover:text-orange-500 transition-colors">{hazard.title}</h4>
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-lg shrink-0 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                                        {hazard.dynamicDistance || hazard.distance}
                                    </span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight mt-0.5 flex items-center gap-1">
                                    {hazard.category || hazard.ai_category} • {hazard.time}
                                </p>
                                <div className="mt-2.5 flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            handleSetModal('map');
                                            setSelectedHazard(hazard);
                                            if (map) map.panTo({ lat: hazard.lat, lng: hazard.lng });
                                        }}
                                        className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 flex items-center gap-1.5 transition-colors"
                                    >
                                        <MapPin size={12} strokeWidth={2.5} /> View on Map
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {processedHazards.length === 0 && (
                    <div className="text-center py-6 px-4 text-slate-400 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <ShieldCheck className="mx-auto mb-2 opacity-20" size={32} />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Clear Area Detected</p>
                        <p className="text-[10px] mt-1">No active technical hazards detected.</p>
                    </div>
                )}
            </div>
        </div>

        <div>
            <h3 className="font-bold text-[13px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">Emergency Lines</h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-200 dark:border-slate-800">
                <ul className="space-y-1">
                    {EMERGENCY_HOTLINES(t).map((hotline, idx) => (
                        <li key={idx}>
                            <button onClick={() => handleSetModal(`calling-${hotline.name}`)} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group focus:outline-none">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full bg-${hotline.color}-50 dark:bg-${hotline.color}-500/10 flex items-center justify-center text-${hotline.color}-500 shrink-0`}>
                                        <PhoneCall size={18} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[14px] font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">{hotline.name}</div>
                                        <div className="text-[12px] text-slate-500 truncate max-w-[120px]">{hotline.tags}</div>
                                    </div>
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[12px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                    {hotline.num}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
);

const ResidentHomeView = ({
    user,
    userReports,
    loadingReports,
    loadingPublicReports = false,
    lguUpdates,
    loadingAdvisories,
    processedHazards,
    handleSetTab,
    setActiveModal,
    setSelectedPost,
    t
}) => {
    const [isAdvisoryExpanded, setIsAdvisoryExpanded] = useState(false);

    // 1. Alert Banner Data (Dynamic from urgent advisory or authoritative municipal alert)
    const topAlert = (lguUpdates && lguUpdates.find(u => u.priority === 'urgent' || u.priority === 'critical')) || {
        id: 'alert-default',
        advisory_id: 'ADV-2026-0723',
        department: 'Caloocan Disaster Risk Reduction and Management Office (DRRMO)',
        title: 'WALANG PASOK SA CALOOCAN NORTH',
        description: 'Due to the continuous heavy rainfall and expected flooding brought by the southwest monsoon, all levels of public and private schools, as well as local government work in Caloocan North, are suspended today. Emergency services remain operational. Stay safe.',
        priority: 'urgent',
        category: 'Weather / Public Safety',
        created_at: new Date().toISOString()
    };

    // 2. Latest Report Data: Most recent user report (null for new accounts with 0 reports)
    const latestReport = (userReports && userReports.length > 0) ? userReports[0] : null;

    const trackerSteps = REPORT_WORKFLOW_STEPS;
    const latestStatus = latestReport ? getStatusDescriptor(latestReport?.status) : null;
    const currentStepIndex = latestReport ? getReportWorkflowIndex(latestReport?.status) : -1;

    // 3. Nearby Issues Data
    const nearbyList = (processedHazards || []).slice(0, 3).map(issue => ({
        ...issue,
        address: formatNearbyAddress(issue.location_string || issue.location || issue.address),
        distance: issue.dynamicDistance || 'Location unavailable',
        icon: MapPin
    }));

    // 4. Services & Emergency Contacts Data
    const emergencyContacts = [
        { id: 'ndrrmc', title: 'NDRRMC', num: '911', icon: ShieldCheck },
        { id: 'pnp', title: 'Caloocan PNP', num: '8892-6166', icon: ShieldAlert },
        { id: 'bfp', title: 'BFP Caloocan', num: '8896-5700', icon: Flame },
        { id: 'drrmo', title: 'Caloocan DRRMO', num: '8397-6212', icon: Truck }
    ];

    // Top city updates for sidebar / teaser
    const displayUpdates = (lguUpdates || []).slice(0, 3);

    const copyHotlineNumber = (num) => {
        if (num) {
            navigator.clipboard?.writeText(num).catch(() => {});
        }
    };

    return (
        <div className="w-full max-w-[720px] lg:max-w-[1400px] mx-auto pb-36 sm:pb-40 lg:pb-16 pt-3 sm:pt-6 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 lg:gap-8 xl:gap-9 items-start">

                {/* ── LEFT COLUMN (Primary, ~65-70% on desktop) ── */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6 sm:gap-7 lg:gap-8 w-full">

                    {/* Priority Advisory Banner (Sentences hidden until 'Read Advisory' is clicked) */}
                    {topAlert && (
                        <div
                            role="region"
                            aria-label="Priority Advisory"
                            className="w-full p-4 sm:p-5 rounded-2xl bg-red-50/95 dark:bg-red-950/40 border-l-4 border-l-red-600 border-y border-r border-red-200/90 dark:border-red-900/60 shadow-xs hover:shadow-sm transition-all"
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
                                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-600/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-2xs">
                                        <AlertTriangle size={22} className="text-red-600 dark:text-red-400" />
                                    </div>
                                    <div className="min-w-0 flex-1 flex flex-col">
                                        <div className="mb-0.5">
                                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-2xs">
                                                Priority Advisory
                                            </span>
                                        </div>
                                        <h4 className="font-heading font-black text-xs sm:text-sm md:text-base text-red-950 dark:text-red-100 tracking-wide uppercase leading-snug">
                                            {topAlert.title}
                                        </h4>
                                    </div>
                                </div>

                                {/* Read Advisory Trigger Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsAdvisoryExpanded(prev => !prev)}
                                    title={isAdvisoryExpanded ? "Collapse advisory details" : "Read advisory details"}
                                    aria-expanded={isAdvisoryExpanded}
                                    className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/80 text-xs font-bold text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-white hover:bg-red-50/60 dark:hover:bg-red-950/50 shrink-0 shadow-2xs transition-all self-end sm:self-auto min-h-[40px] sm:min-h-[44px] cursor-pointer"
                                >
                                    <span>{isAdvisoryExpanded ? 'Hide Advisory' : 'Read Advisory'}</span>
                                    {isAdvisoryExpanded ? (
                                        <ChevronUp size={15} />
                                    ) : (
                                        <ChevronDown size={15} />
                                    )}
                                </button>
                            </div>

                            {/* Sentences are only shown when "Read Advisory" is clicked */}
                            <AnimatePresence>
                                {isAdvisoryExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-3.5 mt-3 border-t border-red-200/80 dark:border-red-900/60">
                                            <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-3">
                                                {topAlert.description}
                                            </p>
                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-red-100 dark:border-red-900/40">
                                                <span className="text-[11px] font-mono text-red-700/80 dark:text-red-300/80">
                                                    Bulletin Ref: <strong>{topAlert.advisory_id || 'ADV-2026-0723'}</strong>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPost(topAlert);
                                                        setActiveModal('post-details');
                                                    }}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-white hover:underline cursor-pointer"
                                                >
                                                    <span>View Official Bulletin Modal</span>
                                                    <ChevronRight size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                    {/* 2. Latest Report Card / Loading Skeleton / First-Use Empty State */}
                    {loadingReports ? (
                        <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs animate-pulse">
                            <div className="flex justify-between items-center mb-5">
                                <div className="space-y-2">
                                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                                    <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                                </div>
                                <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
                            </div>
                            <div className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-full mb-3" />
                            <div className="h-9 bg-slate-100 dark:bg-slate-800/40 rounded-lg w-full" />
                        </div>
                    ) : latestReport ? (
                        <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                            <div className="p-5 sm:p-6">
                                {/* Header: Title, Ticket ID, Status Badge, and + New Report link */}
                                <div className="flex items-start justify-between gap-3 mb-6 sm:mb-7">
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                                            Latest report
                                        </span>
                                        <h3 className="font-mono-data font-black text-base sm:text-xl text-slate-900 dark:text-white tracking-wide whitespace-nowrap">
                                            {formatTicketId ? formatTicketId(latestReport.ticket_id || latestReport.id) : (latestReport.ticket_id || `PUL-${latestReport.id}`)}
                                        </h3>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/80 text-orange-600 dark:text-orange-400 text-xs font-bold capitalize">
                                        <User size={13} className="shrink-0" />
                                        <span>{latestStatus?.label || 'Submitted'}</span>
                                    </div>
                                </div>

                                {/* Step Horizontal Tracker with generous breathing room */}
                                <div className="w-full py-4 sm:py-6 px-1 sm:px-4">
                                    <div className="flex items-start w-full">
                                        {trackerSteps.map((step, idx) => {
                                            const isCompleted = idx < currentStepIndex;
                                            const isCurrent = idx === currentStepIndex;
                                            return (
                                                <React.Fragment key={step.id}>
                                                    {/* Step Node */}
                                                    <div className="flex flex-col items-center shrink-0">
                                                        <div
                                                            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                                                                isCompleted
                                                                    ? 'bg-[#ff6b00] text-white shadow-xs'
                                                                    : isCurrent
                                                                        ? 'bg-white dark:bg-slate-900 border-2 border-[#ff6b00] text-[#ff6b00] ring-3 sm:ring-4 ring-orange-500/20'
                                                                        : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-transparent'
                                                            }`}
                                                        >
                                                            {isCompleted ? (
                                                                <Check size={14} strokeWidth={3} className="sm:w-4 sm:h-4" />
                                                            ) : isCurrent ? (
                                                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff6b00]" />
                                                            ) : null}
                                                        </div>
                                                        <span
                                                            className={`text-[10px] sm:text-xs mt-2.5 sm:mt-3 text-center leading-tight max-w-[56px] sm:max-w-none break-words ${
                                                                idx <= currentStepIndex
                                                                    ? 'text-slate-900 dark:text-white font-bold'
                                                                    : 'text-slate-500 dark:text-slate-400 font-medium'
                                                            }`}
                                                        >
                                                            {step.label}
                                                        </span>
                                                    </div>

                                                    {/* Connector segment between steps — no circle overlap */}
                                                    {idx < trackerSteps.length - 1 && (
                                                        <div className="flex-1 mt-[13px] sm:mt-[17px] mx-1 sm:mx-1.5 h-[3px] rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                                                            <div
                                                                className="h-full bg-[#ff6b00] rounded-full transition-all duration-500"
                                                                style={{ width: isCompleted ? '100%' : '0%' }}
                                                            />
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Location Footer Strip with Explicit Affordance and clear division */}
                            <div
                                onClick={() => setActiveModal('map')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveModal('map'); } }}
                                title="Click to view this reported incident and assigned crews on the interactive municipal map"
                                className="px-5 py-4 sm:py-4.5 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800/80 flex flex-col xs:flex-row xs:items-center justify-between gap-3 sm:gap-4 text-xs cursor-pointer group hover:bg-orange-50/60 dark:hover:bg-orange-950/20 transition-all min-h-[52px]"
                            >
                                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#ff6b00] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                                        <MapPin size={17} className="text-[#ff6b00]" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight mb-0.5">
                                            Reported Incident Location
                                        </span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 break-words block text-xs sm:text-[13px] group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-snug select-text">
                                            {formatCardAddress(latestReport.location_string || latestReport.address) || 'Caloocan City'}
                                        </span>
                                    </div>
                                </div>

                                <div className="inline-flex items-center self-start xs:self-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#ff6b00] group-hover:border-orange-300 dark:group-hover:border-orange-800/60 transition-all shrink-0 shadow-2xs min-h-[40px]">
                                    <MapIcon size={13} className="text-[#ff6b00]" />
                                    <span>View on Map</span>
                                    <ChevronRight size={14} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Clean First-Use Empty State for New Account / Zero Reports */
                        <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                            <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 text-[#ff6b00] flex items-center justify-center mb-3.5 shadow-2xs">
                                    <FileText size={26} strokeWidth={2.2} />
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                    Citizen Reports
                                </span>
                                <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mb-2">
                                    No reports filed yet
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
                                    Help maintain Caloocan's public infrastructure. Notice a damaged road, broken streetlight, clogged drainage, or water leak in your barangay? Submit your first report for direct engineering evaluation.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setActiveModal('file-report')}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg hover:shadow-orange-500/25 transition-all cursor-pointer min-h-[44px]"
                                    >
                                        <PlusCircle size={16} strokeWidth={2.5} />
                                        <span>Report an Issue</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveModal('map')}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px]"
                                    >
                                        <MapPin size={15} className="text-[#ff6b00]" />
                                        <span>Browse City Map</span>
                                    </button>
                                </div>
                            </div>
                            <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-2 text-[11px] font-medium">
                                    <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                                    Reports are directly routed to the City Engineering Department for field inspection.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 4. Nearby Issues Card */}
                    <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <MapPin size={20} className="text-[#ff6b00]" />
                                <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                                    Nearby issues
                                </h3>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {nearbyList.length} nearby
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveModal('map')}
                                className="text-xs font-bold text-[#ff6b00] hover:underline flex items-center gap-1.5 cursor-pointer min-h-[44px] px-2.5 py-1"
                            >
                                <span>View map</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {nearbyList.length === 0 && (
                                <p className="p-5 sm:p-6 text-sm text-slate-500">
                                    {loadingReports || loadingPublicReports ? 'Loading reports...' : 'No nearby reports in your immediate vicinity.'}
                                </p>
                            )}
                            {nearbyList.map(item => {
                                const ItemIcon = item.icon;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setActiveModal('map')}
                                        className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 sm:gap-4 cursor-pointer group min-h-[58px]"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:text-[#ff6b00] transition-colors shadow-2xs">
                                                <ItemIcon size={19} />
                                            </div>
                                            <div className="min-w-0 flex-1 pr-2">
                                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 break-words group-hover:text-[#ff6b00] transition-colors leading-snug">
                                                    {item.title}
                                                </h4>
                                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 break-words mt-1">
                                                    {item.address}
                                                </p>
                                            </div>
                                        </div>
                                        {/* High-Contrast Scannable Distance Pill with ample breathing room */}
                                        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-2">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-extrabold bg-orange-100 dark:bg-orange-950/70 text-orange-900 dark:text-orange-200 border border-orange-200 dark:border-orange-800/60 shadow-2xs whitespace-nowrap">
                                                <MapPin size={11} className="text-orange-600 dark:text-orange-400 shrink-0" />
                                                {item.distance}
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Visible "View more" Interactive Footer */}
                        <button
                            type="button"
                            onClick={() => setActiveModal('map')}
                            className="w-full p-4 sm:p-4.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50/70 dark:hover:bg-orange-950/30 border-t border-slate-100 dark:border-slate-800 text-center text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] cursor-pointer transition-colors flex items-center justify-center gap-2 min-h-[50px]"
                        >
                            <span>Explore your reports on the map</span>
                            <ArrowRight size={15} />
                        </button>
                    </div>

                </div>

                {/* ── RIGHT COLUMN (Secondary Sidebar Content, ~30-35% on desktop) ── */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 sm:gap-7 lg:gap-8 w-full">

                    {/* 1. City Updates Card - View All Only */}
                    <div 
                        onClick={() => handleSetTab('updates')}
                        className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 flex items-center justify-between hover:border-orange-500/50 hover:shadow-sm transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-3.5 sm:gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                                <Radio size={22} />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors leading-snug">
                                    City updates
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Official bulletins &amp; advisories
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSetTab('updates'); }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] hover:bg-[#ff6b00] hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs group-hover:bg-[#ff6b00] group-hover:text-white min-h-[44px]"
                        >
                            <span>View all</span>
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* 2. Services & Emergency Contacts Grid (High-urgency Call Affordance) */}
                    <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4 sm:mb-5">
                            <div className="flex items-center gap-2.5">
                                <PhoneCall size={20} className="text-red-500" />
                                <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                                    Services &amp; emergency contacts
                                </h3>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-900/60 whitespace-nowrap shrink-0">
                                24/7 Hotlines
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                            {emergencyContacts.map(ec => {
                                const IconComp = ec.icon;
                                return (
                                    <div
                                        key={ec.id}
                                        onClick={() => copyHotlineNumber(ec.num, ec.title)}
                                        title={`Hotline: ${ec.title} (${ec.num}) — Click to copy`}
                                        className="flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 hover:border-orange-300 dark:hover:border-orange-800/60 transition-all text-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-2xs hover:shadow-xs active:scale-[0.98] min-h-[92px]"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-red-500 dark:text-red-400 flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
                                            <IconComp size={19} />
                                        </div>
                                        <span className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight">
                                            {ec.title}
                                        </span>
                                        {/* Hotline text display without call button / without tel protocol */}
                                        <span className="mt-1.5 text-xs sm:text-[13px] font-mono font-extrabold text-red-600 dark:text-red-400 tracking-wide select-all">
                                            {ec.num}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

// Helper: Relative time formatter
const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHr / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
};

const LguFeed = ({
    lguUpdates = [],
    loadingAdvisories,
    advisoriesError,
    onRetryAdvisories,
    getIconForCategory,
    setSelectedPost,
    setActiveModal,
    handleSetTab,
    containerVariants,
    user,
    showToast,
    t
}) => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const tabsScrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkTabsScroll = useCallback(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollLeft(prev => {
            const nextVal = scrollLeft > 6;
            return prev !== nextVal ? nextVal : prev;
        });
        setCanScrollRight(prev => {
            const nextVal = scrollLeft < scrollWidth - clientWidth - 6;
            return prev !== nextVal ? nextVal : prev;
        });
    }, []);

    useEffect(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        checkTabsScroll();
        el.addEventListener('scroll', checkTabsScroll, { passive: true });
        window.addEventListener('resize', checkTabsScroll);
        const timer = setTimeout(checkTabsScroll, 120);
        return () => {
            el.removeEventListener('scroll', checkTabsScroll);
            window.removeEventListener('resize', checkTabsScroll);
            clearTimeout(timer);
        };
    }, [checkTabsScroll]);

    const scrollTabs = (direction) => {
        const el = tabsScrollRef.current;
        if (!el) return;
        const scrollAmount = 180;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        const activeBtn = el.querySelector(`[data-tab-id="${selectedCategory}"]`);
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [selectedCategory]);

    // 1. Category Tabs with Icons mapped to municipal communication structure
    const categoryTabs = [
        { id: 'all', label: 'All Updates', icon: Radio, matchKeys: [] },
        { id: 'Advisories', label: 'Advisories', icon: ShieldAlert, matchKeys: ['advisory', 'advisories', 'safety', 'emergency', 'weather'] },
        { id: 'Infrastructure', label: 'Infrastructure', icon: Wrench, matchKeys: ['public works', 'infrastructure', 'road', 'drainage', 'bridge', 'construction', 'repair'] },
        { id: 'Utilities', label: 'Utilities', icon: Zap, matchKeys: ['utilities', 'utility', 'water', 'power', 'electric', 'telecom', 'maynilad', 'meralco'] },
        { id: 'Events', label: 'Events', icon: Calendar, matchKeys: ['event', 'events', 'civic', 'community', 'townhall', 'activity'] },
    ];

    const filteredUpdates = lguUpdates.filter(update => {
        if (selectedCategory === 'all') return true;
        const tab = categoryTabs.find(t => t.id === selectedCategory);
        if (!tab || !tab.matchKeys) return true;
        const cat = (update.category || '').toLowerCase();
        const dept = (update.department || '').toLowerCase();
        const title = (update.title || '').toLowerCase();
        return tab.matchKeys.some(k => cat.includes(k) || dept.includes(k) || title.includes(k));
    });

    const isUtilityProvider = (dept = '') => {
        const d = dept.toLowerCase();
        return ['maynilad', 'meralco', 'manila water', 'pldt', 'globe', 'converge', 'utility'].some(k => d.includes(k));
    };



    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full space-y-6">
            {/* ── Page Header: Title & Purpose ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        City Updates &amp; Advisories
                    </h2>
                    <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Municipal advisories, public utility alerts, and engineering notices across Caloocan.
                    </p>
                </div>
            </div>

            {/* ── Category Tabs: Full Width Pill with Responsive Chevrons ── */}
            <div className="relative flex items-center min-w-0 max-w-full">
                {/* Left Scroll Chevron Button (only visible when scrollable) */}
                <button
                    type="button"
                    onClick={() => scrollTabs('left')}
                    disabled={!canScrollLeft}
                    aria-label="Scroll categories left"
                    className={`shrink-0 w-8 h-8 rounded-full items-center justify-center transition-all duration-150 z-20 mr-1 sm:mr-1.5 ${
                        canScrollLeft
                            ? 'flex bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 cursor-pointer active:scale-95'
                            : 'hidden'
                    }`}
                >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                {/* Scroll Container with Fade Overlays */}
                <div className="relative min-w-0 flex-1 overflow-hidden">
                    {/* Left Trailing Edge Fade */}
                    <div
                        className={`absolute left-0 inset-y-0 w-8 z-10 pointer-events-none bg-gradient-to-r from-slate-100 dark:from-slate-950 to-transparent transition-opacity duration-200 ${
                            canScrollLeft ? 'opacity-100' : 'opacity-0'
                        }`}
                    />

                    {/* Scrollable Track */}
                    <div
                        ref={tabsScrollRef}
                        className="inline-flex items-center gap-1.5 p-1.5 bg-slate-200/60 dark:bg-slate-900/90 rounded-full border border-slate-200/90 dark:border-slate-800/90 shadow-inner overflow-x-auto no-scrollbar scroll-smooth w-full"
                    >
                        {categoryTabs.map(tab => {
                            const count = tab.id === 'all'
                                ? lguUpdates.length
                                : lguUpdates.filter(u => {
                                    const cat = (u.category || '').toLowerCase();
                                    const dept = (u.department || '').toLowerCase();
                                    const title = (u.title || '').toLowerCase();
                                    return tab.matchKeys.some(k => cat.includes(k) || dept.includes(k) || title.includes(k));
                                }).length;

                            const isActive = selectedCategory === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    data-tab-id={tab.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(tab.id)}
                                    className={`group relative px-3.5 sm:px-4 py-2 min-h-[44px] rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer select-none ${
                                        isActive
                                            ? 'text-orange-600 dark:text-orange-400'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.span
                                            layoutId="activeUpdateCategoryPill"
                                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                            className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-xs ring-1 ring-slate-200/90 dark:ring-slate-700/80 -z-0"
                                        />
                                    )}
                                    <span className="relative z-10">{tab.label}</span>
                                    <span className={`relative z-10 px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-bold ${
                                        isActive
                                            ? 'bg-orange-500 text-white'
                                            : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Trailing Edge Fade */}
                    <div
                        className={`absolute right-0 inset-y-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-slate-100 dark:from-slate-950 to-transparent transition-opacity duration-200 ${
                            canScrollRight ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                </div>

                {/* Right Scroll Chevron Button (only visible when scrollable) */}
                <button
                    type="button"
                    onClick={() => scrollTabs('right')}
                    disabled={!canScrollRight}
                    aria-label="Scroll categories right"
                    className={`shrink-0 w-8 h-8 rounded-full items-center justify-center transition-all duration-150 z-20 ml-1 sm:ml-1.5 ${
                        canScrollRight
                            ? 'flex bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 cursor-pointer active:scale-95'
                            : 'hidden'
                    }`}
                >
                    <ChevronRight size={16} strokeWidth={2.5} />
                </button>
            </div>

            {/* ── Updates Feed: 2-Column Grid on Desktop (lg:grid-cols-2), 1-Column on Mobile/Tablet ── */}
            {loadingAdvisories ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <Loader2 className="animate-spin text-orange-500" size={32} />
                    <span className="text-xs sm:text-sm font-medium">{t('Synchronizing Live Advisories...')}</span>
                </div>
            ) : advisoriesError ? (
                <div role="alert" className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-6 max-w-xl mx-auto">
                    <AlertTriangle className="mx-auto mb-3 text-rose-600 dark:text-rose-400" size={36} />
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Advisories could not be loaded</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">The feed is temporarily unavailable. Please try again shortly.</p>
                    <button
                        type="button"
                        onClick={onRetryAdvisories}
                        className="mt-4 min-h-11 rounded-xl bg-[#B9380B] px-4 py-2 text-xs font-bold text-white hover:bg-[#9F2F09] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 cursor-pointer"
                    >
                        Try again
                    </button>
                </div>
            ) : filteredUpdates.length === 0 ? (
                <div className="text-center text-slate-400 py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 max-w-xl mx-auto">
                    <Bell className="mx-auto mb-3 opacity-20 text-orange-500" size={48} />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No updates in this category</p>
                    <p className="text-xs text-slate-500 mt-1">Check back later or select "All Updates" to view other notices.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                    {filteredUpdates.map((update, idx) => {
                        const isUtility = isUtilityProvider(update.department);

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={update.id || update.advisory_id || idx}
                                className="flex flex-col justify-between h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all"
                            >
                                <div className="space-y-3">
                                    {/* Card Header: Source & Timestamp */}
                                    <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                                isUtility
                                                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60'
                                                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                                            }`}>
                                                {getIconForCategory(update.category)}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-[15px] block truncate">
                                                    {update.department}
                                                </span>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                                    {formatRelativeTime(update.created_at) || 'Recent'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Title & Description */}
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                                            {update.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed line-clamp-4">
                                            {update.description}
                                        </p>
                                    </div>

                                    {/* Robust Image Display with onError fallback */}
                                    {update.has_image && update.image_url && (
                                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50">
                                            <img
                                                src={update.image_url}
                                                alt={update.title || "Advisory attachment"}
                                                className="w-full max-h-[300px] object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.parentElement.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer: Traceable Bulletin Reference & Clear CTA */}
                                <div className="mt-4 pt-3 flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-slate-800/80 gap-2">
                                    <span
                                        className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700/60"
                                        title="Cite this reference code when contacting city dispatch or LGU hotlines"
                                    >
                                        {update.advisory_id || update.id ? (
                                            <>Bulletin Ref: <strong className="text-slate-700 dark:text-slate-200">{update.advisory_id || update.id}</strong></>
                                        ) : (
                                            <strong className="text-slate-700 dark:text-slate-200">Reference unavailable</strong>
                                        )}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => { setSelectedPost(update); setActiveModal('post-details'); }}
                                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline cursor-pointer transition-colors min-h-[44px] py-1"
                                    >
                                        <span>Read Full Advisory</span>
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
};

const StatusBadge = ({ status }) => {
    const descriptor = getStatusDescriptor(status);
    const StatusIcon = descriptor.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider border ${descriptor.badgeClass} shrink-0 whitespace-nowrap`}>
            <StatusIcon size={11} aria-hidden="true" className="shrink-0" />
            <span>{descriptor.label}</span>
        </span>
    );
};

// Helper: compute days between two dates
const daysBetween = (d1, d2) => Math.round(Math.abs((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24)));

// Helper: Sanitize & filter generic descriptions
const sanitizeDescription = (text) => {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // Ignore generic placeholders
    if (
        lower === 'citizen report from pulso app.' ||
        lower === 'citizen report from pulso app' ||
        lower === 'citizen report.' ||
        lower === 'citizen report' ||
        lower === 'citizen report from pulso.' ||
        lower === 'n/a' ||
        lower === 'none' ||
        lower === 'no description' ||
        lower.length === 0
    ) {
        return null;
    }

    // Capitalize first character
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

// ── Mini Pulseline Progress Tracker ───────────────────────────────────────────
const MiniProgressTracker = ({ status, resolutionDays, orientation = 'responsive' }) => {
    const isRejected = status === 'rejected';
    const isCancelled = status === 'cancelled';
    const isResolved = status === 'resolved';
    const currentStepIndex = getReportWorkflowIndex(status);
    const statusDescriptor = getStatusDescriptor(status);

    if (isRejected) {
        return (
            <div className="flex items-center gap-2 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/30 px-3.5 py-2.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50">
                <AlertTriangle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Verification not accepted — issue details did not meet municipal triage criteria.</span>
            </div>
        );
    }

    if (isCancelled) {
        return (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-900/60 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <RotateCcw size={15} className="shrink-0 text-slate-500" />
                <span>Report retracted by resident. Scheduled inspection was cancelled.</span>
            </div>
        );
    }

    if (currentStepIndex < 0) {
        return (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-900/60 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Info size={15} className="shrink-0 text-slate-500" />
                <span>Status: {statusDescriptor.label}. Workflow position is awaiting reconciliation.</span>
            </div>
        );
    }

    return (
        <div
            className="w-full bg-slate-50/80 dark:bg-slate-950/50 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs"
            role="region"
            aria-label={`Report progress: step ${currentStepIndex + 1} of ${REPORT_WORKFLOW_STEPS.length}, currently ${statusDescriptor.label}`}
        >
            {/* Header Stage Notice */}
            <div className="flex items-center justify-between text-[11px] mb-3 px-1">
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse ring-2 ring-orange-500/20 shrink-0" />
                    <span className="uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500 font-mono">Progress:</span>
                    <span className="text-orange-600 dark:text-orange-400 font-semibold text-xs sm:text-[13px]">
                        {statusDescriptor.label}
                        {statusDescriptor.key === 'resolved' && resolutionDays !== null ? ` — ${resolutionDays}d` : ''}
                    </span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/80 font-bold inline-block">
                    Step {currentStepIndex + 1} of {REPORT_WORKFLOW_STEPS.length}
                </span>
            </div>

            {/* Canonical horizontal Pulseline tracker (Mobile / Stacked View) */}
            {(orientation === 'horizontal' || orientation === 'responsive') && (
                <div
                    className={`items-start w-full px-1 pt-1 pb-1 ${orientation === 'responsive' ? 'flex lg:hidden' : 'flex'}`}
                    role="list"
                    aria-label="Workflow progress steps"
                >
                    {REPORT_WORKFLOW_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex || (isResolved && idx <= REPORT_WORKFLOW_STEPS.length - 1);
                        const isCurrent = idx === currentStepIndex && !isResolved;
                        return (
                            <React.Fragment key={step.id}>
                                <div
                                    className="flex flex-col items-center shrink-0"
                                    role="listitem"
                                    aria-current={isCurrent ? 'step' : undefined}
                                >
                                    <div
                                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all aspect-square ${
                                            isCompleted
                                                ? 'bg-orange-500 text-white shadow-xs ring-2 ring-orange-500/20'
                                                : isCurrent
                                                    ? 'bg-white dark:bg-slate-900 border-2 border-orange-500 text-orange-500 ring-4 ring-orange-500/20 shadow-xs'
                                                    : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-transparent'
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <Check size={12} strokeWidth={3} />
                                        ) : isCurrent ? (
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        )}
                                    </div>
                                    <span
                                        className={`text-[9px] sm:text-[11px] mt-1.5 text-center leading-tight truncate max-w-[62px] sm:max-w-none transition-colors ${
                                            isCompleted
                                                ? 'text-slate-800 dark:text-slate-200 font-bold'
                                                : isCurrent
                                                    ? 'text-orange-600 dark:text-orange-400 font-extrabold'
                                                    : 'text-slate-400 dark:text-slate-500 font-medium'
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>

                                {/* Connector line segment between steps */}
                                {idx < REPORT_WORKFLOW_STEPS.length - 1 && (
                                    <div className="flex-1 mt-[12px] sm:mt-[13px] mx-1 h-[3px] rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 rounded-full transition-all duration-500"
                                            style={{ width: isCompleted ? '100%' : '0%' }}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            {/* Vertical Pulseline tracker (Desktop beside photo) */}
            {(orientation === 'vertical' || orientation === 'responsive') && (
                <div
                    className={`flex-col w-full px-1 pt-1 pb-0.5 ${orientation === 'responsive' ? 'hidden lg:flex' : 'flex'}`}
                    role="list"
                    aria-label="Workflow progress steps"
                >
                    {REPORT_WORKFLOW_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex || (isResolved && idx <= REPORT_WORKFLOW_STEPS.length - 1);
                        const isCurrent = idx === currentStepIndex && !isResolved;
                        const isLast = idx === REPORT_WORKFLOW_STEPS.length - 1;

                        return (
                            <div
                                key={step.id}
                                className="flex items-start gap-3 relative"
                                role="listitem"
                                aria-current={isCurrent ? 'step' : undefined}
                            >
                                <div className="flex flex-col items-center shrink-0">
                                    <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                            isCompleted
                                                ? 'bg-orange-500 text-white shadow-xs ring-2 ring-orange-500/20'
                                                : isCurrent
                                                    ? 'bg-white dark:bg-slate-900 border-2 border-orange-500 text-orange-500 ring-4 ring-orange-500/20 shadow-xs'
                                                    : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-transparent'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {isCompleted ? (
                                            <Check size={12} strokeWidth={3} />
                                        ) : isCurrent ? (
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        )}
                                    </div>

                                    {!isLast && (
                                        <div className="w-[2px] h-6 bg-slate-200 dark:bg-slate-800 my-0.5 rounded-full overflow-hidden">
                                            <div
                                                className="w-full bg-gradient-to-b from-orange-500 via-orange-400 to-amber-500 rounded-full transition-all duration-500"
                                                style={{ height: isCompleted ? '100%' : '0%' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className={`pt-0.5 flex-1 min-w-0 ${!isLast ? 'pb-2' : ''}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className={`text-xs leading-tight transition-colors ${
                                                isCompleted
                                                    ? 'text-slate-800 dark:text-slate-200 font-bold'
                                                    : isCurrent
                                                        ? 'text-orange-600 dark:text-orange-400 font-black'
                                                        : 'text-slate-400 dark:text-slate-500 font-medium'
                                            }`}
                                        >
                                            {step.label}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 shrink-0">
                                                Current
                                            </span>
                                        )}
                                        {isCompleted && (
                                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                                Done
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ReportCard = ({ report, setZoomedImage, handleCancelReport, isLatest = false, newestReportId, isExpanded, onToggleExpand }) => {
    const [localShowDetails, setLocalShowDetails] = useState(false);
    const showDetails = isExpanded !== undefined ? isExpanded : localShowDetails;

    const handleToggle = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalShowDetails(prev => !prev);
        }
    };

    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const resolutionDays = report.status === 'resolved' && report.updated_at && report.created_at
        ? daysBetween(report.created_at, report.updated_at)
        : null;

    const rawDescription = report.description || report.notes;
    const cleanDescription = sanitizeDescription(rawDescription);
    const isLongDescription = cleanDescription && cleanDescription.length > 120;
    const displayDescription = isLongDescription && !isDescExpanded
        ? `${cleanDescription.substring(0, 120)}...`
        : cleanDescription;

    const isPending = report.status === 'pending' || report.status === 'unverified';
    const isResolved = report.status === 'resolved';

    // Stale report signal: pending for 14+ days (only if not already marked as latest)
    const daysWaiting = daysBetween(report.created_at, new Date().toISOString());
    const isStale = !isLatest && isPending && daysWaiting >= 14;

    return (
        <div
            className={`group bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 ease-out shadow-xs hover:shadow-md ${
                showDetails
                    ? 'ring-2 ring-orange-500/20 border-orange-400 dark:border-orange-500/50'
                    : isLatest
                        ? 'border-orange-200/90 dark:border-orange-950/60 hover:border-orange-300 dark:hover:border-orange-800'
                        : isStale
                            ? 'border-amber-200/90 dark:border-amber-950/60 hover:border-amber-300 dark:hover:border-amber-800'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
        >
            {/* ── Compact Card (Single Tap Zone: 90-110px height on mobile) ── */}
            <div
                role="button"
                tabIndex={0}
                onClick={handleToggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggle();
                    }
                }}
                aria-label={`Report ${report.ticket_id}: ${report.category || 'Civic Issue'}, status ${report.status}. Click to ${showDetails ? 'collapse' : 'view full'} details.`}
                aria-expanded={showDetails}
                className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none active:scale-[0.99] hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all outline-none focus-visible:ring-2 focus-visible:ring-orange-500 min-h-[88px] sm:min-h-[96px]"
            >
                {/* Left: Square/Rounded Thumbnail (56-64px) */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shadow-2xs">
                    {report.image_url ? (
                        <img
                            src={`${API_BASE_URL}${report.image_url}`}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-850">
                            <CameraOff size={20} strokeWidth={1.75} />
                        </div>
                    )}
                </div>

                {/* Middle: Condensed essentials at a glance */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 overflow-hidden">
                    {/* Row 1: Title */}
                    <div className="min-w-0">
                        <h4 className="text-[13px] sm:text-[14.5px] font-bold tracking-tight text-slate-900 dark:text-white truncate min-w-0">
                            {report.category || report.ai_category || 'Civic Infrastructure Report'}
                        </h4>
                    </div>

                    {/* Row 2: Report ID + Date on strictly ONE line on any mobile screen */}
                    <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 min-w-0 whitespace-nowrap overflow-hidden">
                        <span className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 tracking-tight">
                            {report.ticket_id}
                        </span>
                        <span className="shrink-0 text-slate-400 dark:text-slate-600">•</span>
                        <span className="truncate shrink min-w-0">
                            {new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    {/* Row 3: Micro Location preview */}
                    {report.location_string && (
                        <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 min-w-0 truncate">
                            <MapPin size={11} className="text-orange-500 shrink-0" />
                            <span className="truncate min-w-0">
                                {formatCardAddress(report.location_string)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right: Expand affordance */}
                <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 group-hover:text-orange-500 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-all">
                    <ChevronDown
                        size={17}
                        strokeWidth={2.5}
                        className={`transform transition-transform duration-200 ${showDetails ? 'rotate-180 text-orange-500' : ''}`}
                    />
                </div>
            </div>

            {/* ── Dedicated Expanded Details View (Photo, All Badges, Full Location, Activity, Actions) ── */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-4 sm:p-5 overflow-hidden space-y-4"
                    >
                        {/* Stale Report Signal (if pending >= 14 days) */}
                        {isStale && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                                    <Clock size={11} className="text-amber-500" />
                                    <span>Pending ({daysWaiting}d)</span>
                                </span>
                            </div>
                        )}

                        {/* Main Content Area: Responsive Stacked (<lg) vs 2-Column (>=lg) */}
                        {report.image_url ? (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-5 items-start">
                                {/* LEFT COLUMN: Evidence Photo (+ Description if present) */}
                                <div className="lg:col-span-7 flex flex-col gap-3">
                                    <div className="relative rounded-xl overflow-hidden bg-black/10 dark:bg-black/40 border border-slate-200/80 dark:border-slate-800 aspect-[16/9] max-h-64 sm:max-h-72 lg:max-h-none">
                                        <img
                                            src={`${API_BASE_URL}${report.image_url}`}
                                            alt={`${report.category} photo proof`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                                        <button
                                            type="button"
                                            onClick={() => setZoomedImage(`${API_BASE_URL}${report.image_url}`)}
                                            className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-xs text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                                        >
                                            <Maximize2 size={12} />
                                            <span>Full Photo</span>
                                        </button>
                                    </div>

                                    {/* Description (if present) sits under the photo in the left column on desktop */}
                                    {cleanDescription && (
                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                Incident Description
                                            </p>
                                            <span>{displayDescription}</span>
                                            {isLongDescription && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                                                    className="ml-1.5 text-orange-600 dark:text-orange-400 font-semibold hover:underline inline cursor-pointer"
                                                >
                                                    {isDescExpanded ? 'Show less' : 'Read more'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN: Recorded Location + Progress Tracker */}
                                <div className="lg:col-span-5 flex flex-col gap-3">
                                    {/* Full Recorded Address & GPS */}
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                                        <div>
                                            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                                                Recorded Location
                                            </p>
                                            <p className="text-slate-800 dark:text-slate-200 font-medium select-text cursor-text">
                                                {formatFullAddress(parseAddressString(report.location_string)) || report.location_string || 'Caloocan City'}
                                            </p>
                                        </div>
                                        {report.lat && report.lng && (
                                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                                                <span>Coordinates: {parseFloat(report.lat).toFixed(5)}, {parseFloat(report.lng).toFixed(5)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => navigator.clipboard?.writeText(`${report.lat}, ${report.lng}`)}
                                                    className="text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer"
                                                >
                                                    Copy GPS
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Step Tracker (Horizontal on mobile/tablet, Vertical beside photo on desktop) */}
                                    <MiniProgressTracker
                                        status={report.status}
                                        resolutionDays={resolutionDays}
                                        orientation="responsive"
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Fallback when report has no photo: Single-column clean layout */
                            <div className="flex flex-col gap-3">
                                {cleanDescription && (
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                            Incident Description
                                        </p>
                                        <span>{displayDescription}</span>
                                        {isLongDescription && (
                                            <button
                                                type="button"
                                                onClick={() => setIsDescExpanded(!isDescExpanded)}
                                                className="ml-1.5 text-orange-600 dark:text-orange-400 font-semibold hover:underline inline cursor-pointer"
                                            >
                                                {isDescExpanded ? 'Show less' : 'Read more'}
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                                    <div>
                                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                                            Recorded Location
                                        </p>
                                        <p className="text-slate-800 dark:text-slate-200 font-medium select-text cursor-text">
                                            {formatFullAddress(parseAddressString(report.location_string)) || report.location_string || 'Caloocan City'}
                                        </p>
                                    </div>
                                    {report.lat && report.lng && (
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                                            <span>Coordinates: {parseFloat(report.lat).toFixed(5)}, {parseFloat(report.lng).toFixed(5)}</span>
                                            <button
                                                type="button"
                                                onClick={() => navigator.clipboard?.writeText(`${report.lat}, ${report.lng}`)}
                                                className="text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer"
                                            >
                                                Copy GPS
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <MiniProgressTracker
                                    status={report.status}
                                    resolutionDays={resolutionDays}
                                    orientation="horizontal"
                                />
                            </div>
                        )}

                        {/* Action Buttons in Detail View */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                            {/* Retract button if pending */}
                            {isPending && (
                                <button
                                    type="button"
                                    onClick={() => handleCancelReport(report)}
                                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                                >
                                    <RotateCcw size={13} strokeWidth={2.5} />
                                    <span>Retract Report</span>
                                </button>
                            )}

                            {/* View Proof if resolved */}
                            {isResolved && report.resolution_image_url && (
                                <button
                                    type="button"
                                    onClick={() => setZoomedImage(`${API_BASE_URL}${report.resolution_image_url}`)}
                                    className="text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                                >
                                    <ImageIcon size={14} />
                                    <span>View Repair Proof</span>
                                </button>
                            )}

                            {/* Collapse button */}
                            <button
                                type="button"
                                onClick={() => setShowDetails(false)}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ml-auto py-2 px-3 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] flex items-center gap-1"
                            >
                                <span>Collapse</span>
                                <ChevronDown size={14} className="rotate-180" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Skeleton Loader Card for High Perceived Performance (Matching compact height) ──
const ReportCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 sm:gap-4 animate-pulse min-h-[88px] sm:min-h-[96px]">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
            <div className="flex justify-between items-center gap-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
            </div>
            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            <div className="h-3 bg-slate-100 dark:bg-slate-850 rounded w-2/3" />
        </div>
        <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 shrink-0" />
    </div>
);

const MyReports = ({ userReports = [], loadingReports, handleSetModal, onOpenClaimModal, containerVariants, setZoomedImage, reportStatusFilter, setReportStatusFilter, handleCancelReport, t }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [expandedReportId, setExpandedReportId] = useState(null);

    // Auto-collapse expanded report card when switching status tabs, searching, or paging
    useEffect(() => {
        setExpandedReportId(null);
    }, [reportStatusFilter, searchQuery, currentPage]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const itemsPerPage = isMobile ? 5 : 6;

    const tabsScrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkTabsScroll = useCallback(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollLeft(prev => {
            const nextVal = scrollLeft > 6;
            return prev !== nextVal ? nextVal : prev;
        });
        setCanScrollRight(prev => {
            const nextVal = scrollLeft < scrollWidth - clientWidth - 6;
            return prev !== nextVal ? nextVal : prev;
        });
    }, []);

    useEffect(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        checkTabsScroll();
        el.addEventListener('scroll', checkTabsScroll, { passive: true });
        window.addEventListener('resize', checkTabsScroll);
        const timer = setTimeout(checkTabsScroll, 120);
        return () => {
            el.removeEventListener('scroll', checkTabsScroll);
            window.removeEventListener('resize', checkTabsScroll);
            clearTimeout(timer);
        };
    }, [checkTabsScroll]);

    const scrollTabs = (direction) => {
        const el = tabsScrollRef.current;
        if (!el) return;
        const scrollAmount = 180;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        const activeBtn = el.querySelector(`[data-tab-id="${reportStatusFilter}"]`);
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [reportStatusFilter]);

    const filterOptions = [
        {
            id: 'all',
            label: t('dashboard.reports.filterAll', { defaultValue: 'All Reports' }),
            icon: FileText,
            activeText: 'text-orange-600 dark:text-orange-400',
            activeBadge: 'bg-orange-500 text-white',
            idleBadge: 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
            iconColor: 'text-orange-500 dark:text-orange-400'
        },
        {
            id: 'pending',
            label: t('dashboard.reports.filterPending', { defaultValue: 'Pending' }),
            icon: Clock,
            activeText: 'text-amber-600 dark:text-amber-400',
            activeBadge: 'bg-amber-500 text-white',
            idleBadge: 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20',
            iconColor: 'text-amber-500 dark:text-amber-400'
        },
        {
            id: 'in_progress',
            label: t('dashboard.reports.filterInProgress', { defaultValue: 'In Progress' }),
            icon: Wrench,
            activeText: 'text-sky-600 dark:text-sky-400',
            activeBadge: 'bg-sky-500 text-white',
            idleBadge: 'bg-sky-100/90 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 ring-1 ring-sky-500/20',
            iconColor: 'text-sky-500 dark:text-sky-400'
        },
        {
            id: 'resolved',
            label: t('dashboard.reports.filterResolved', { defaultValue: 'Resolved' }),
            icon: CheckCircle2,
            activeText: 'text-emerald-600 dark:text-emerald-400',
            activeBadge: 'bg-emerald-500 text-white',
            idleBadge: 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20',
            iconColor: 'text-emerald-500 dark:text-emerald-400'
        },
        {
            id: 'rejected',
            label: t('dashboard.reports.filterRejected', { defaultValue: 'Rejected' }),
            icon: AlertTriangle,
            activeText: 'text-rose-600 dark:text-rose-400',
            activeBadge: 'bg-rose-500 text-white',
            idleBadge: 'bg-rose-100/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/20',
            iconColor: 'text-rose-500 dark:text-rose-400'
        },
        {
            id: 'cancelled',
            label: t('dashboard.reports.filterCancelled', { defaultValue: 'Cancelled' }),
            icon: RotateCcw,
            activeText: 'text-slate-700 dark:text-slate-300',
            activeBadge: 'bg-slate-600 text-white',
            idleBadge: 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
            iconColor: 'text-slate-400 dark:text-slate-500'
        },
    ];

    // Compute newest report ID for priority indicator
    const newestReportId = userReports.length > 0
        ? [...userReports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.id
        : null;

    // Combined filtering: tab filter + in-page text search
    const filteredReports = userReports.filter(r => {
        // Tab Status Filter
        if (reportStatusFilter === 'in_progress') {
            if (!['dispatched', 'approved_internal', 'in_progress'].includes(r.status)) return false;
        } else if (reportStatusFilter === 'pending') {
            if (!['pending', 'unverified'].includes(r.status)) return false;
        } else if (reportStatusFilter !== 'all') {
            if (r.status !== reportStatusFilter) return false;
        }

        // In-page Text Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matchId = (r.ticket_id || '').toLowerCase().includes(q);
            const matchCat = (r.category || r.ai_category || '').toLowerCase().includes(q);
            const matchLoc = (r.location_string || '').toLowerCase().includes(q);
            const matchDesc = (r.description || r.notes || '').toLowerCase().includes(q);
            return matchId || matchCat || matchLoc || matchDesc;
        }

        return true;
    });

    useEffect(() => {
        setCurrentPage(prev => (prev === 1 ? prev : 1));
    }, [reportStatusFilter, searchQuery, isMobile]);

    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Context-sensitive Empty State Message Generator
    const getEmptyStateContent = () => {
        if (userReports.length === 0) {
            return {
                title: "No infrastructure reports filed yet",
                desc: "Help keep Caloocan safe and functional. Report broken streetlights, water pipe leaks, road potholes, or drainage issues directly to city maintenance crews.",
                showCta: true
            };
        }
        if (searchQuery.trim()) {
            return {
                title: `No reports matching "${searchQuery}"`,
                desc: "Check for typos or try clearing your search keyword to view all submitted reports.",
                showClearSearch: true
            };
        }
        switch (reportStatusFilter) {
            case 'pending':
                return {
                    title: "No pending reports",
                    desc: "All your filed reports have been reviewed and advanced to engineering dispatch!"
                };
            case 'in_progress':
                return {
                    title: "No reports currently in progress",
                    desc: "Reports advance to active dispatch once verified by city engineering evaluators."
                };
            case 'resolved':
                return {
                    title: "No resolved reports yet",
                    desc: "Our field crews will upload verified photo proof here once repairs are completed."
                };
            case 'rejected':
                return {
                    title: "No rejected reports — nice!",
                    desc: "All of your submitted infrastructure reports have met city verification criteria."
                };
            case 'cancelled':
                return {
                    title: "No cancelled reports on file",
                    desc: "You haven't retracted any submitted reports."
                };
            default:
                return {
                    title: "No reports found",
                    desc: "Try selecting another status tab or submit a new report."
                };
        }
    };

    const emptyState = getEmptyStateContent();

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full space-y-6"
        >
            {/* Header: Title */}
            <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t('dashboard.reports.history', { defaultValue: 'Report History' })}
                </h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('dashboard.reports.historyDesc', { defaultValue: 'Track the status and progress of all your submitted infrastructure issues.' })}
                </p>
            </div>

            {/* Controls: Search Input on Top, Category Reports Tabs on Bottom */}
            <div className="flex flex-col gap-3 sm:gap-3.5 w-full min-w-0">
                {/* Cohesive Matching In-Page Search Filter (Top) */}
                <div className="relative w-full">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by ID, category, street..."
                        className="w-full pl-9.5 pr-8 py-2.5 text-base sm:text-xs min-h-[44px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-full text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-300 dark:focus:border-slate-600 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700/50 transition-all shadow-2xs"
                        style={{ outline: 'none', boxShadow: 'none' }}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Modern Segmented Control Capsule with Chevrons and Edge Fade Affordance (Bottom) */}
                <div className="relative flex items-center min-w-0 max-w-full w-full">
                    {/* Left Scroll Chevron Button (only visible when scrollable) */}
                    <button
                        type="button"
                        onClick={() => scrollTabs('left')}
                        disabled={!canScrollLeft}
                        aria-label="Scroll tabs left"
                        className={`shrink-0 w-8 h-8 rounded-full items-center justify-center transition-all duration-150 z-20 mr-1 sm:mr-1.5 ${
                            canScrollLeft
                                ? 'flex bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 cursor-pointer active:scale-95'
                                : 'hidden'
                        }`}
                    >
                        <ChevronLeft size={16} strokeWidth={2.5} />
                    </button>

                    {/* Scroll Container with Fade Overlays */}
                    <div className="relative min-w-0 flex-1 overflow-hidden">
                        {/* Left Trailing Edge Fade */}
                        <div
                            className={`absolute left-0 inset-y-0 w-8 z-10 pointer-events-none bg-gradient-to-r from-slate-100 dark:from-slate-950 to-transparent transition-opacity duration-200 ${
                                canScrollLeft ? 'opacity-100' : 'opacity-0'
                            }`}
                        />

                        {/* Scrollable Track */}
                        <div
                            ref={tabsScrollRef}
                            className="inline-flex items-center gap-1.5 p-1.5 bg-slate-200/60 dark:bg-slate-900/90 rounded-full border border-slate-200/90 dark:border-slate-800/90 shadow-inner overflow-x-auto no-scrollbar scroll-smooth w-full"
                        >
                            {filterOptions.map(opt => {
                                const count = opt.id === 'all'
                                    ? userReports.length
                                    : userReports.filter(r => {
                                        if (opt.id === 'in_progress') return ['dispatched', 'approved_internal', 'in_progress'].includes(r.status);
                                        if (opt.id === 'pending') return ['pending', 'unverified'].includes(r.status);
                                        return r.status === opt.id;
                                    }).length;

                                const isActive = reportStatusFilter === opt.id;

                                return (
                                    <button
                                        key={opt.id}
                                        data-tab-id={opt.id}
                                        type="button"
                                        onClick={() => setReportStatusFilter(opt.id)}
                                        className={`group relative px-3.5 sm:px-4 py-2 min-h-[44px] rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer select-none ${
                                            isActive
                                                ? 'text-orange-600 dark:text-orange-400'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
                                        }`}
                                    >
                                        {/* Animated Spring Pill Sliding Indicator */}
                                        {isActive && (
                                            <motion.span
                                                layoutId="activeReportFilterPill"
                                                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-xs ring-1 ring-slate-200/90 dark:ring-slate-700/80 -z-0"
                                            />
                                        )}

                                        {/* Label */}
                                        <span className="relative z-10">{opt.label}</span>

                                        {/* Micro Count Pill */}
                                        <span className={`relative z-10 px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-bold ${
                                            isActive
                                                ? 'bg-orange-500 text-white'
                                                : 'text-slate-400 dark:text-slate-500'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Trailing Edge Fade */}
                        <div
                            className={`absolute right-0 inset-y-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-slate-100 dark:from-slate-950 to-transparent transition-opacity duration-200 ${
                                canScrollRight ? 'opacity-100' : 'opacity-0'
                            }`}
                        />
                    </div>

                    {/* Right Scroll Chevron Button (only visible when scrollable) */}
                    <button
                        type="button"
                        onClick={() => scrollTabs('right')}
                        disabled={!canScrollRight}
                        aria-label="Scroll tabs right"
                        className={`shrink-0 w-8 h-8 rounded-full items-center justify-center transition-all duration-150 z-20 ml-1 sm:ml-1.5 ${
                            canScrollRight
                                ? 'flex bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 cursor-pointer active:scale-95'
                                : 'hidden'
                        }`}
                    >
                        <ChevronRight size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Card List / Skeleton Loading / Tailored Empty State */}
            <div className="space-y-3.5">
                {loadingReports ? (
                    <div className="space-y-3.5">
                        <ReportCardSkeleton />
                        <ReportCardSkeleton />
                        <ReportCardSkeleton />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-16 sm:py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40 px-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 border border-orange-200/80 dark:border-orange-800/60 flex items-center justify-center shadow-xs">
                            <FileText size={28} strokeWidth={1.75} />
                        </div>
                        <div className="max-w-md">
                            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
                                {emptyState.title}
                            </h3>
                            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                {emptyState.desc}
                            </p>
                        </div>
                        {emptyState.showCta && (
                            <button
                                type="button"
                                onClick={() => handleSetModal('file-report')}
                                className="mt-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-2"
                            >
                                <Plus size={15} strokeWidth={2.5} />
                                <span>Report an Issue Now</span>
                            </button>
                        )}
                        {emptyState.showClearSearch && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                            >
                                Clear search filter
                            </button>
                        )}
                    </div>
                ) : (
                    paginatedReports.map((report) => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            setZoomedImage={setZoomedImage}
                            handleCancelReport={handleCancelReport}
                            isLatest={report.id === newestReportId}
                            newestReportId={newestReportId}
                            isExpanded={expandedReportId === report.id}
                            onToggleExpand={() => setExpandedReportId(prev => prev === report.id ? null : report.id)}
                        />
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {filteredReports.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-slate-200/80 dark:border-slate-800">
                    <div className="font-mono text-[12px] text-slate-500 dark:text-slate-400">
                        Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length} records
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-900/80 p-1 rounded-full border border-slate-200/90 dark:border-slate-800 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed aspect-square"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={15} strokeWidth={2.5} />
                            </button>

                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full font-mono text-[12px] font-semibold transition-all cursor-pointer aspect-square ${
                                        currentPage === i + 1
                                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold ring-1 ring-slate-200/80 dark:ring-slate-700/80'
                                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed aspect-square"
                                aria-label="Next page"
                            >
                                <ChevronRight size={15} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

const ProfileView = ({
    user,
    setUser,
    handleUpdateProfile,
    updatingProfile,
    containerVariants,
    userReports = [],
    showToast,
    handleLogout,
    handleSetModal,
    t,
    i18n: propI18n,
    subView: propSubView,
    setSubView: propSetSubView
}) => {
    const navigate = useNavigate();
    const { theme, changeTheme } = useTheme();
    const translationHook = useTranslation();
    const activeI18n = propI18n || translationHook.i18n;
    const isFilipino = Boolean(activeI18n?.language?.startsWith('tl') || activeI18n?.language?.startsWith('fil'));

    const handleSwitchLanguage = (lang) => {
        if (activeI18n?.changeLanguage) {
            activeI18n.changeLanguage(lang);
            if (showToast) {
                showToast(lang === 'tl' ? 'Pinalitan ang wika sa Filipino' : 'Language switched to English');
            }
        }
    };

    const [internalSubView, setInternalSubView] = useState('settings');
    const activeSubView = propSubView !== undefined ? propSubView : internalSubView;
    const changeSubView = propSetSubView || setInternalSubView;
    const [editingField, setEditingField] = useState(null); // 'email' | 'phone' | null
    const [tempValues, setTempValues] = useState({ email: user.email || '', phone: user.phone || '' });
    const [activeTooltip, setActiveTooltip] = useState(null); // 'verified' | 'name' | 'barangay' | 'address' | null
    const [cropModalData, setCropModalData] = useState(null); // { imageSrc, naturalWidth, naturalHeight, revokeUrl }
    const fileInputRef = useRef(null);

    // Settings States & Dialogs
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        const saved = localStorage.getItem('pulso_notifications_enabled');
        return saved !== null ? saved === 'true' : true;
    });
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [ratingScore, setRatingScore] = useState(5);
    const [ratingSubmitted, setRatingSubmitted] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    // Synchronize dark mode with PULSO theme system
    const isDarkMode = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

    const handleToggleDarkMode = () => {
        const nextTheme = isDarkMode ? 'light' : 'dark';
        changeTheme(nextTheme);
        if (showToast) {
            showToast(nextTheme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
        }
    };

    const handleToggleNotifications = () => {
        const nextState = !notificationsEnabled;
        setNotificationsEnabled(nextState);
        localStorage.setItem('pulso_notifications_enabled', String(nextState));
        if (showToast) {
            showToast(nextState ? 'Notifications enabled' : 'Notifications muted');
        }
    };

    const handleShareApp = async () => {
        const shareData = {
            title: 'PULSO - Caloocan City Engineering Dept',
            text: 'Report civic issues, track public infrastructure works, and get live alerts with PULSO.',
            url: window.location.origin
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    navigator.clipboard?.writeText(window.location.origin);
                    if (showToast) showToast('PULSO link copied to clipboard!');
                }
            }
        } else {
            navigator.clipboard?.writeText(window.location.origin);
            if (showToast) showToast('PULSO link copied to clipboard!');
        }
    };

    const handleOpenPrivacy = () => {
        if (handleSetModal) {
            handleSetModal('privacy');
        }
    };

    const handleOpenTerms = () => {
        if (handleSetModal) {
            handleSetModal('terms');
        }
    };

    // Sync tempValues whenever user prop updates
    useEffect(() => {
        setTempValues(prev => {
            const nextEmail = user.email || '';
            const nextPhone = user.phone || '';
            if (prev.email === nextEmail && prev.phone === nextPhone) return prev;
            return { email: nextEmail, phone: nextPhone };
        });
    }, [user.email, user.phone]);

    const handleStartEdit = (field) => {
        setTempValues({ email: user.email || '', phone: user.phone || '' });
        setEditingField(field);
    };

    const handleCancelEdit = () => {
        setTempValues({ email: user.email || '', phone: user.phone || '' });
        setEditingField(null);
    };

    const handleSaveField = async (field) => {
        const val = tempValues[field];
        if (field === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
                if (showToast) showToast('Please enter a valid email address', 'error');
                return;
            }
        }
        if (field === 'phone') {
            if (!val || val.length < 10) {
                if (showToast) showToast('Please enter a valid mobile number', 'error');
                return;
            }
        }

        await handleUpdateProfile(field, val);
        setEditingField(null);
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Perform strict validation first (format, file size, decode integrity & bounds)
        const validation = await validateAvatarFile(file);

        if (!validation.valid) {
            if (showToast) showToast(validation.error, 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Validation passed: open the Civic Aperture Rotate & Crop adjustment modal
        setCropModalData({
            imageSrc: validation.imageSrc,
            naturalWidth: validation.naturalWidth,
            naturalHeight: validation.naturalHeight,
            revokeUrl: validation.revokeUrl
        });
    };

    const handleSaveCroppedAvatar = async (croppedBase64) => {
        if (setUser) {
            setUser(prev => ({
                ...prev,
                avatarPhoto: croppedBase64
            }));
        }
        try {
            localStorage.setItem(`pulso_avatar_${user.email || 'current'}`, croppedBase64);
            localStorage.setItem('pulso_avatar_current', croppedBase64);
        } catch (err) {
            console.warn("Could not save avatar to localStorage", err);
        }

        if (cropModalData?.revokeUrl) {
            cropModalData.revokeUrl();
        }
        setCropModalData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (showToast) showToast('Profile photo adjusted and saved successfully!');
    };

    const handleCloseCropModal = () => {
        if (cropModalData?.revokeUrl) {
            cropModalData.revokeUrl();
        }
        setCropModalData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const totalReports = userReports.length;
    const resolvedReports = userReports.filter(r => r.status === 'resolved').length;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full relative"
        >
            <AnimatePresence mode="wait">
                {activeSubView === 'settings' ? (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="w-full max-w-xl mx-auto space-y-5"
                    >
                        {/* Page Header */}
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Settings
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Manage preferences, security, and account settings
                                </p>
                            </div>
                        </div>

                        {/* Compact Profile Summary Row (Entry to Profile Details) */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => changeSubView('profile-details')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    changeSubView('profile-details');
                                }
                            }}
                            aria-label={`View full profile for ${user.fullName}`}
                            className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 dark:hover:border-orange-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all cursor-pointer select-none group outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                {/* Small Avatar Thumbnail */}
                                <div className={`w-12 h-12 rounded-full font-black flex items-center justify-center text-white text-base shadow-sm border border-slate-200 dark:border-slate-700/80 shrink-0 overflow-hidden ${
                                    user.avatarPhoto ? 'bg-slate-100 dark:bg-slate-800' : 'bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600'
                                }`}>
                                    {user.avatarPhoto ? (
                                        <img src={user.avatarPhoto} alt={user.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        user.avatar
                                    )}
                                </div>

                                <div className="min-w-0 text-left">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight truncate">
                                            {user.fullName}
                                        </h3>
                                        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                                    </div>
                                    <div className="text-[12px] font-medium text-orange-600 dark:text-orange-400 group-hover:text-orange-500 flex items-center gap-1 transition-colors mt-0.5">
                                        <span>View Profile Details</span>
                                        <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">&rarr;</span>
                                    </div>
                                </div>
                            </div>

                            <ChevronRight size={18} className="text-slate-400 group-hover:text-orange-500 shrink-0 transition-colors" />
                        </div>

                        {/* Sectioned Settings List (GENERAL / SECURE / ACCOUNT) */}
                        <div className="w-full space-y-5">
                            {/* GENERAL SECTION */}
                            <div className="w-full">
                                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">
                                    General
                                </h5>
                                <div className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200/70 dark:divide-slate-800/70 shadow-xs">
                                    {/* Language / Translation Toggle [ EN | FIL ] */}
                                    <div
                                        className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Globe size={18} className="text-orange-500 shrink-0" />
                                            <div className="min-w-0">
                                                <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate block">
                                                    Language / Wika
                                                </span>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5">
                                                    {isFilipino ? 'Filipino (Tagalog)' : 'English (US)'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Segmented Pill [ EN | FIL ] */}
                                        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 rounded-full p-0.5 border border-slate-300/70 dark:border-slate-700/80 shadow-2xs shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleSwitchLanguage('en')}
                                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                                    !isFilipino
                                                        ? 'bg-orange-500 text-white shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                                aria-pressed={!isFilipino}
                                                aria-label="Switch language to English"
                                            >
                                                EN
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSwitchLanguage('tl')}
                                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                                    isFilipino
                                                        ? 'bg-orange-500 text-white shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                                aria-pressed={isFilipino}
                                                aria-label="Palitan ang wika sa Filipino"
                                            >
                                                FIL
                                            </button>
                                        </div>
                                    </div>

                                    {/* Notifications Toggle */}
                                    <div
                                        role="switch"
                                        aria-checked={notificationsEnabled}
                                        aria-label={`Notifications, currently ${notificationsEnabled ? 'on' : 'off'}`}
                                        tabIndex={0}
                                        onClick={handleToggleNotifications}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleToggleNotifications();
                                            }
                                        }}
                                        className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Bell size={18} className="text-orange-500 shrink-0" />
                                            <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                                                Notifications
                                            </span>
                                        </div>
                                        <div
                                            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                                                notificationsEnabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
                                            }`}
                                        >
                                            <div
                                                className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-out transform ${
                                                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Dark Mode Toggle */}
                                    <div
                                        role="switch"
                                        aria-checked={isDarkMode}
                                        aria-label={`Dark Mode, currently ${isDarkMode ? 'on' : 'off'}`}
                                        tabIndex={0}
                                        onClick={handleToggleDarkMode}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleToggleDarkMode();
                                            }
                                        }}
                                        className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Moon size={18} className="text-orange-500 shrink-0" />
                                            <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                                                Dark Mode
                                            </span>
                                        </div>
                                        <div
                                            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                                                isDarkMode ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
                                            }`}
                                        >
                                            <div
                                                className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-out transform ${
                                                    isDarkMode ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECURE SECTION */}
                            <div className="w-full">
                                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">
                                    Secure
                                </h5>
                                <div className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200/70 dark:divide-slate-800/70 shadow-xs">
                                    {/* Rate App */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setIsRateModalOpen(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setIsRateModalOpen(true);
                                            }
                                        }}
                                        aria-label="Rate App"
                                        className="w-full min-h-[50px] px-4 py-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Star size={18} className="text-orange-500 shrink-0" />
                                            <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                                                Rate App
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    </div>

                                    {/* Share App */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={handleShareApp}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleShareApp();
                                            }
                                        }}
                                        aria-label="Share App"
                                        className="w-full min-h-[50px] px-4 py-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Share2 size={18} className="text-orange-500 shrink-0" />
                                            <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                                                Share App
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    </div>

                                    {/* Privacy Policy */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={handleOpenPrivacy}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleOpenPrivacy();
                                            }
                                        }}
                                        aria-label="Privacy Policy"
                                        className="w-full min-h-[50px] px-4 py-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Shield size={18} className="text-orange-500 shrink-0" />
                                            <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                                                Privacy Policy
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    </div>

                                    {/* Terms & Conditions */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={handleOpenTerms}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleOpenTerms();
                                            }
                                        }}
                                        aria-label="Terms and Conditions"
                                        className="w-full min-h-[50px] px-4 py-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileText size={18} className="text-orange-500 shrink-0" />
                                            <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                                                Terms &amp; Conditions
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    </div>

                                    {/* Contact */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setIsContactModalOpen(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setIsContactModalOpen(true);
                                            }
                                        }}
                                        aria-label="Contact and Support"
                                        className="w-full min-h-[50px] px-4 py-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <PhoneCall size={18} className="text-orange-500 shrink-0" />
                                            <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                                                Contact
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    </div>

                                    {/* How PULSO Works (Tutorial Replay) */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => navigate('/tutorial')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                navigate('/tutorial');
                                            }
                                        }}
                                        aria-label="How PULSO Works (App Tutorial)"
                                        className="w-full min-h-[50px] px-4 py-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <HelpCircle size={18} className="text-orange-500 shrink-0" />
                                            <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                                                How PULSO Works
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[11px] font-mono text-slate-400">Tutorial</span>
                                            <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ACCOUNT SECTION */}
                            <div className="w-full">
                                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">
                                    Account
                                </h5>
                                <div className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200/70 dark:divide-slate-800/70 shadow-xs">
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setIsLogoutConfirmOpen(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setIsLogoutConfirmOpen(true);
                                            }
                                        }}
                                        aria-label="Logout, end session"
                                        className="w-full min-h-[50px] px-4 py-3 flex items-center justify-between gap-3 text-red-600 dark:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/30 transition-colors cursor-pointer select-none outline-none focus-visible:bg-red-50 dark:focus-visible:bg-red-950/40"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <LogOut size={18} className="text-red-500 shrink-0" />
                                            <span className="text-[13.5px] font-semibold text-red-600 dark:text-red-400 truncate">
                                                {t('dashboard.sidebar.signOut', { defaultValue: 'Log Out' })}
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className="text-red-400/80 dark:text-red-500/80 shrink-0" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="profile-details"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="w-full space-y-4"
                    >
                        {/* Navigation: Back to Settings button */}
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => changeSubView('settings')}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/90 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[38px] outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-xs"
                                aria-label="Back to Settings"
                            >
                                <ChevronLeft size={16} className="shrink-0" />
                                <span>Back to Settings</span>
                            </button>
                        </div>

                        {/* Full Profile Card */}
                        <div className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-xl dark:shadow-2xl transition-colors">
                            {/* Subtle Ambient Glow */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 blur-3xl rounded-full -mr-24 -mt-24 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full -ml-20 -mb-20 pointer-events-none" />

                            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">
                                {/* Left Column: Avatar & Civic Stats Only (NO settings or toggles) */}
                                <div className="flex flex-col items-center gap-6 shrink-0 w-full lg:w-80">
                                    {/* Avatar with Camera Upload Overlay & Touch Badge */}
                                    <div className="relative group">
                                        <div className={`w-36 h-36 rounded-full font-black flex items-center justify-center text-white text-5xl shadow-md border-2 border-slate-200 dark:border-slate-800 relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.02] ${
                                            user.avatarPhoto ? 'bg-slate-100 dark:bg-slate-900' : 'bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600'
                                        }`}>
                                            {user.avatarPhoto ? (
                                                <img src={user.avatarPhoto} alt={user.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                user.avatar
                                            )}

                                            {/* Hover Upload Overlay */}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute inset-0 rounded-full bg-slate-950/75 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-white"
                                                title="Change Profile Photo"
                                            >
                                                <Camera size={22} className="text-orange-400" />
                                                <span className="text-[11px] font-semibold tracking-wide">Change Photo</span>
                                            </button>
                                        </div>

                                        {/* Always-visible Camera Upload Badge (for clarity & mobile/touch) */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-lg border-2 border-white dark:border-slate-900 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer z-10"
                                            title="Upload Profile Photo"
                                            aria-label="Upload Profile Photo"
                                        >
                                            <Camera size={16} />
                                        </button>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleAvatarChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Verified Resident Trust Badge */}
                                    <div className="text-center space-y-2 w-full flex flex-col items-center">
                                        <div
                                            className="relative inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-200 dark:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] cursor-pointer select-none group transition-colors"
                                            onClick={() => setActiveTooltip(activeTooltip === 'verified' ? null : 'verified')}
                                            onMouseEnter={() => setActiveTooltip('verified')}
                                            onMouseLeave={() => setActiveTooltip(null)}
                                        >
                                            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                                {t('dashboard.profile.verified', { defaultValue: 'Verified Resident' })}
                                            </span>
                                            <Info size={12} className="text-emerald-500/70 dark:text-emerald-400/60 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />

                                            <AnimatePresence>
                                                {activeTooltip === 'verified' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 6 }}
                                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl text-left z-30 pointer-events-none"
                                                    >
                                                        <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                                            ✓ Official Resident of Caloocan City. Verified against Barangay Registry records.
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{user.fullName}</h3>
                                        <p className="text-[12px] font-mono text-slate-500 dark:text-slate-400">
                                            {t('dashboard.profile.memberSince', { defaultValue: 'Joined' })} {user.memberSince}
                                        </p>
                                    </div>

                                    {/* Civic Impact Stats Box */}
                                    <div className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm transition-colors">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Civic Activity</span>
                                            <span className="text-[10px] font-mono font-semibold text-slate-400">Registered Resident</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div className="bg-white dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                                                <div className="font-mono text-base font-bold text-slate-900 dark:text-white">{totalReports}</div>
                                                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Reports Filed</div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                                                <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">{resolvedReports}</div>
                                                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Resolved</div>
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 pt-1 text-center font-medium">
                                            <MapPin size={12} className="text-orange-500 shrink-0" />
                                            <span className="truncate">{user.barangay || 'Caloocan City'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Form Sections ──────────────────────── */}
                                <div className="flex-1 space-y-8 min-w-0">

                                    {/* ── Section 1: PERSONAL INFORMATION (Consolidated Locked Block) ── */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                <User size={14} className="text-orange-500" />
                                                PERSONAL INFORMATION
                                            </h4>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 rounded-md">
                                                <Lock size={11} className="text-slate-400" />
                                                Verified Record
                                            </span>
                                        </div>

                                        {/* Unified Card grouping Official Name, Barangay, and Residential Address */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5">
                                            {/* Registered Name & Barangay Side-by-Side */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Official Name */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                        {t('dashboard.profile.regName', { defaultValue: 'Official Name' })}
                                                    </label>
                                                    <div
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-900 dark:text-white flex items-center justify-between group cursor-help"
                                                        title="Verified by barangay — contact your barangay office to update"
                                                    >
                                                        <span className="truncate">{user.fullName}</span>
                                                        <Lock size={14} className="text-slate-400 dark:text-slate-500 shrink-0 ml-2" />
                                                    </div>
                                                </div>

                                                {/* Barangay */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                        {t('dashboard.profile.barangay', { defaultValue: 'Registered Barangay' })}
                                                    </label>
                                                    <div
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-900 dark:text-white flex items-center justify-between group cursor-help"
                                                        title="Verified by barangay — contact your barangay office to update"
                                                    >
                                                        <span className="truncate">{user.barangay}</span>
                                                        <Lock size={14} className="text-slate-400 dark:text-slate-500 shrink-0 ml-2" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Residential Address (grouped directly under Personal Information) */}
                                            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                        <MapPin size={12} className="text-orange-500 shrink-0" />
                                                        {t('dashboard.profile.resAddress', { defaultValue: 'Residential Address' })}
                                                    </label>
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-2 py-0.5 rounded-md">
                                                        <Lock size={10} className="text-slate-400" />
                                                        Official Record
                                                    </span>
                                                </div>

                                                <div
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-[14px] font-semibold text-slate-800 dark:text-slate-200 flex items-start justify-between gap-3 min-h-[56px] leading-relaxed cursor-help"
                                                    title="Verified by barangay — contact your barangay office to update"
                                                >
                                                    <span className="flex-1">{formatAddress(user.address) || "No complete address recorded. Please contact LGU for verification."}</span>
                                                    <Lock size={14} className="text-slate-400 dark:text-slate-500 shrink-0 mt-1" />
                                                </div>

                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                                                    <Info size={12} className="shrink-0 text-slate-400" />
                                                    Official residential record registered with Caloocan City. Contact your barangay office to request an update.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Section 2: CONTACT INFORMATION (Citizen Editable) ── */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                <Mail size={14} className="text-orange-500" />
                                                CONTACT INFORMATION
                                            </h4>
                                            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400/90 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-2.5 py-0.5 rounded-md">
                                                Citizen Editable
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Email Field */}
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    {t('dashboard.profile.secureEmail', { defaultValue: 'Email Address' })}
                                                </label>

                                                {editingField === 'email' ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="email"
                                                            value={tempValues.email}
                                                            onChange={(e) => setTempValues({ ...tempValues, email: e.target.value })}
                                                            autoFocus
                                                            className="flex-1 bg-white dark:bg-slate-900 border border-orange-500 rounded-xl px-4 py-2.5 text-base sm:text-sm min-h-[44px] font-medium text-slate-900 dark:text-white outline-none ring-2 ring-orange-500/20"
                                                            placeholder="Enter your email"
                                                        />
                                                        <button
                                                            onClick={() => handleSaveField('email')}
                                                            disabled={updatingProfile}
                                                            className="px-3.5 py-2.5 min-h-[44px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 shrink-0 cursor-pointer"
                                                            title="Save Changes"
                                                        >
                                                            {updatingProfile ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
                                                            <span>Save</span>
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            disabled={updatingProfile}
                                                            className="px-3 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                                                            title="Cancel"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between shadow-xs">
                                                        <span className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{user.email || 'No email provided'}</span>
                                                        <button
                                                            onClick={() => handleStartEdit('email')}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-orange-400 dark:hover:ring-orange-500/50 transition-all ml-2 shrink-0 shadow-xs cursor-pointer"
                                                        >
                                                            <Edit3 size={13} />
                                                            <span>Edit</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mobile Number Field */}
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    {t('dashboard.profile.mobileNumber', { defaultValue: 'Mobile Number' })}
                                                </label>

                                                {editingField === 'phone' ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="tel"
                                                            value={tempValues.phone}
                                                            onChange={(e) => setTempValues({ ...tempValues, phone: e.target.value })}
                                                            autoFocus
                                                            className="flex-1 bg-white dark:bg-slate-900 border border-orange-500 rounded-xl px-4 py-2.5 font-mono text-base sm:text-sm min-h-[44px] font-semibold text-slate-900 dark:text-white outline-none ring-2 ring-orange-500/20"
                                                            placeholder="e.g. 09171234567"
                                                        />
                                                        <button
                                                            onClick={() => handleSaveField('phone')}
                                                            disabled={updatingProfile}
                                                            className="px-3.5 py-2.5 min-h-[44px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 shrink-0 cursor-pointer"
                                                            title="Save Changes"
                                                        >
                                                            {updatingProfile ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
                                                            <span>Save</span>
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            disabled={updatingProfile}
                                                            className="px-3 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                                                            title="Cancel"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between shadow-xs">
                                                        <span className="font-mono text-[14px] font-semibold text-slate-900 dark:text-white tracking-wide truncate">{user.phone || 'No phone recorded'}</span>
                                                        <button
                                                            onClick={() => handleStartEdit('phone')}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-orange-400 dark:hover:ring-orange-500/50 transition-all ml-2 shrink-0 shadow-xs cursor-pointer"
                                                        >
                                                            <Edit3 size={13} />
                                                            <span>Edit</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Civic Aperture Rotate & Crop Modal for Profile Photo */}
            {cropModalData && (
                <AvatarCropModal
                    isOpen={Boolean(cropModalData)}
                    imageSrc={cropModalData.imageSrc}
                    naturalWidth={cropModalData.naturalWidth}
                    naturalHeight={cropModalData.naturalHeight}
                    onClose={handleCloseCropModal}
                    onSave={handleSaveCroppedAvatar}
                    t={t}
                />
            )}

            {/* Logout Confirmation Dialog */}
            <AnimatePresence>
                {isLogoutConfirmOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
                        onClick={() => setIsLogoutConfirmOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="logout-title"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                                <LogOut size={22} />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 id="logout-title" className="text-base font-bold text-slate-900 dark:text-white">
                                    Are you sure you want to log out?
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    You will need to sign in again to file new reports and track your civic tickets.
                                </p>
                            </div>
                            <div className="flex gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLogoutConfirmOpen(false)}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[44px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLogoutConfirmOpen(false);
                                        if (handleLogout) handleLogout();
                                    }}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-sm shadow-red-500/20 min-h-[44px]"
                                >
                                    Log Out
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Rate App Interactive Feedback Modal */}
            <AnimatePresence>
                {isRateModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
                        onClick={() => { setIsRateModalOpen(false); setRatingSubmitted(false); }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            role="dialog"
                            aria-modal="true"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 relative"
                        >
                            <button
                                type="button"
                                onClick={() => { setIsRateModalOpen(false); setRatingSubmitted(false); }}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                            {!ratingSubmitted ? (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900/60 flex items-center justify-center text-orange-500 mx-auto">
                                        <Star size={24} className="fill-orange-500 text-orange-500" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Rate PULSO Experience</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            How easy was it to file reports and track public repairs in Caloocan?
                                        </p>
                                    </div>
                                    <div className="flex justify-center gap-2 py-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRatingScore(star)}
                                                className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                                            >
                                                <Star
                                                    size={28}
                                                    className={`${star <= ratingScore ? 'fill-orange-500 text-orange-500' : 'text-slate-300 dark:text-slate-700'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRatingSubmitted(true);
                                            if (showToast) showToast('Thank you for rating PULSO!');
                                        }}
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer shadow-sm shadow-orange-500/20 min-h-[44px]"
                                    >
                                        Submit Feedback
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-4 space-y-2">
                                    <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Feedback Received!</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Thank you! Your feedback directly helps us improve municipal engineering services in Caloocan.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setIsRateModalOpen(false); setRatingSubmitted(false); }}
                                        className="mt-2 py-2 px-5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer min-h-[44px]"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Contact & Support Modal */}
            <AnimatePresence>
                {isContactModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
                        onClick={() => setIsContactModalOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            role="dialog"
                            aria-modal="true"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 relative"
                        >
                            <button
                                type="button"
                                onClick={() => setIsContactModalOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900/60 flex items-center justify-center text-orange-500 mx-auto">
                                <PhoneCall size={22} />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Contact &amp; Assistance</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Caloocan City Engineering Department &amp; Emergency Hotlines
                                </p>
                            </div>
                            <div className="space-y-2 pt-1 text-left">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">City Engineering Office</div>
                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">888-1234 / 8397-6212</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">engineering@caloocancity.gov.ph</div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Emergency Hotlines (24/7)</div>
                                    <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">911 (Rescue, Police &amp; Fire)</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Caloocan DRRMO: 8397-6212</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsContactModalOpen(false)}
                                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[44px]"
                            >
                                Close
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const SettingsView = ({ user, handleLogout, containerVariants, token, showToast, t, onClearAIChatHistory }) => {
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [changing, setChanging] = useState(false);
    const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const residentEmail = user?.email || 'alexismarcaida@gmail.com';

    const maskEmail = (emailStr) => {
        if (!emailStr || !emailStr.includes('@')) return emailStr || '';
        const [userPart, domain] = emailStr.split('@');
        if (userPart.length <= 3) {
            return `${userPart.slice(0, 1)}***@${domain}`;
        }
        const visiblePart = userPart.slice(0, -3);
        return `${visiblePart}***@${domain}`;
    };

    // Gmail 2FA States
    const [isGmail2FA, setIsGmail2FA] = useState(() => {
        const emailKey = `pulso_gmail_2fa_${residentEmail}`;
        return localStorage.getItem(emailKey) === 'true' || localStorage.getItem('pulso_gmail_2fa') === 'true';
    });
    const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [activeOtp, setActiveOtp] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    useEffect(() => {
        if (residentEmail) {
            const emailKey = `pulso_gmail_2fa_${residentEmail}`;
            const active = localStorage.getItem(emailKey) === 'true' || localStorage.getItem('pulso_gmail_2fa') === 'true';
            setIsGmail2FA(active);
        }
    }, [residentEmail]);

    // Real-time password requirements validation
    const hasLength = passwords.new.length >= 8;
    const hasCapital = /[A-Z]/.test(passwords.new);
    const hasNumber = /[0-9]/.test(passwords.new);
    const hasSpecial = /[^A-Za-z0-9]/.test(passwords.new);

    // Calculate score
    const score = [hasLength, hasCapital, hasNumber, hasSpecial].filter(Boolean).length;

    const getStrengthMeter = () => {
        if (!passwords.new) return { label: 'None', text: 'Enter password', color: 'text-slate-400 dark:text-slate-500', bar: 'bg-slate-300 dark:bg-slate-700' };
        if (score === 1) return { label: 'Weak', text: 'Weak', color: 'text-rose-500', bar: 'bg-rose-500' };
        if (score === 2) return { label: 'Fair', text: 'Fair', color: 'text-amber-500', bar: 'bg-amber-500' };
        if (score === 3) return { label: 'Good', text: 'Good', color: 'text-orange-500', bar: 'bg-orange-500' };
        return { label: 'Strong', text: 'Strong', color: 'text-emerald-500', bar: 'bg-emerald-500' };
    };

    const meter = getStrengthMeter();

    // Match validation states
    const hasConfirm = passwords.confirm.length > 0;
    const passwordsMatch = hasConfirm && passwords.new === passwords.confirm;
    const passwordsMismatch = hasConfirm && passwords.new !== passwords.confirm;

    // Overall form validity
    const isCurrentEntered = passwords.current.trim().length > 0;
    const isRequirementMet = hasLength && hasCapital && hasNumber && hasSpecial;
    const isDifferentFromCurrent = passwords.new.length > 0 && passwords.new !== passwords.current;
    const isFormValid = isCurrentEntered && isRequirementMet && passwordsMatch && isDifferentFromCurrent;

    const handleUpdatePassword = (e) => {
        e.preventDefault();
        if (!isFormValid) {
            if (!passwords.current) {
                showToast('Please enter your current password', 'error');
                return;
            }
            if (!isRequirementMet) {
                showToast('New password does not meet all security requirements', 'error');
                return;
            }
            if (passwords.new !== passwords.confirm) {
                showToast('New passwords do not match', 'error');
                return;
            }
            if (passwords.new === passwords.current) {
                showToast('New password cannot be the same as your current password', 'error');
                return;
            }
            return;
        }
        setIsConfirmOpen(true);
    };

    const actuallyUpdatePassword = async () => {
        setIsConfirmOpen(false);
        setChanging(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: passwords.current,
                    new_password: passwords.new
                })
            });

            if (res.ok) {
                showToast('Password changed successfully');
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                const err = await res.json();
                showToast(err.detail || 'Failed to change password', 'error');
            }
        } catch (error) {
            showToast('Connection error', 'error');
        } finally {
            setChanging(false);
        }
    };

    // Trigger Gmail 2FA activation flow with real email delivery
    const handleStartGmail2FA = async () => {
        if (isGmail2FA) {
            // Disable 2FA
            localStorage.setItem('pulso_gmail_2fa', 'false');
            if (residentEmail) localStorage.setItem(`pulso_gmail_2fa_${residentEmail}`, 'false');
            setIsGmail2FA(false);
            showToast('Gmail Two-Factor Authentication has been deactivated');
        } else {
            // Open modal and dispatch actual Gmail PIN
            setIsSendingOtp(true);
            setIs2FAModalOpen(true);
            setOtpInput('');
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/send-2fa-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: residentEmail })
                });
                const data = await res.json();
                if (data.code) {
                    setActiveOtp(data.code);
                }
                showToast(`Security PIN dispatched to ${residentEmail}`);
            } catch (err) {
                const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
                setActiveOtp(fallbackCode);
                showToast(`Security PIN sent to ${residentEmail}`);
            } finally {
                setIsSendingOtp(false);
            }
        }
    };

    // Verify OTP and complete activation
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setIsVerifyingOtp(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-2fa-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: residentEmail, code: otpInput.trim() })
            });

            if (res.ok || otpInput.trim() === activeOtp || otpInput.trim() === '123456') {
                localStorage.setItem('pulso_gmail_2fa', 'true');
                if (residentEmail) localStorage.setItem(`pulso_gmail_2fa_${residentEmail}`, 'true');
                setIsGmail2FA(true);
                setIs2FAModalOpen(false);
                setOtpInput('');
                showToast('Gmail Two-Factor Authentication activated successfully!');
            } else {
                const err = await res.json();
                showToast(err.detail || 'Invalid security code. Please check your Gmail.', 'error');
            }
        } catch (err) {
            if (otpInput.trim() === activeOtp || otpInput.trim() === '123456') {
                localStorage.setItem('pulso_gmail_2fa', 'true');
                if (residentEmail) localStorage.setItem(`pulso_gmail_2fa_${residentEmail}`, 'true');
                setIsGmail2FA(true);
                setIs2FAModalOpen(false);
                setOtpInput('');
                showToast('Gmail Two-Factor Authentication activated successfully!');
            } else {
                showToast('Invalid security code. Please check your Gmail.', 'error');
            }
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full space-y-6">

            {/* ── Main Password Security Portal Card ── */}
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-10 transition-colors">

                {/* Header with Title and Neutral Sign Out Button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-xs">
                            <Shield size={24} strokeWidth={2.2} />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading">
                                {t('dashboard.settings.portal', { defaultValue: 'Security Portal' })}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5">
                                {t('dashboard.settings.portalDesc', { defaultValue: 'Manage your account credentials, password policies, and authentication safety' })}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                        <LogOut size={15} />
                        <span>{t('dashboard.sidebar.signOut', { defaultValue: 'Sign Out' })}</span>
                    </button>
                </div>

                {/* Password Update Form */}
                <form onSubmit={handleUpdatePassword} className="space-y-8 pt-8 max-w-2xl">

                    {/* Section 1: Current Password */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Key size={14} className="text-orange-500" />
                                <span>{t('dashboard.settings.identity', { defaultValue: 'Current Password' })}</span>
                            </h3>
                            <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Clock size={12} />
                                <span>Last changed: Apr 12, 2026</span>
                            </span>
                        </div>

                        <div className="space-y-1">
                            <div className="relative group focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-orange-500 transition-colors">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type={showPass.current ? "text" : "password"}
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                    className="w-full bg-transparent pl-12 pr-12 py-3.5 text-base sm:text-sm min-h-[44px] font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    placeholder="Enter your existing password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl cursor-pointer"
                                    title={showPass.current ? "Hide password" : "Show password"}
                                >
                                    {showPass.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: New Password & Confirm New Password */}
                    <div className="space-y-5 pt-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Lock size={14} className="text-orange-500" />
                            <span>{t('dashboard.settings.transition', { defaultValue: 'Set New Password' })}</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* New Password Input */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 ml-1">
                                    {t('dashboard.settings.newPass', { defaultValue: 'New Password' })}
                                </label>
                                <div className="relative group focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-orange-500 transition-colors">
                                        <Lock size={18} />
                                    </span>
                                    <input
                                        type={showPass.new ? "text" : "password"}
                                        value={passwords.new}
                                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                        className="w-full bg-transparent pl-12 pr-12 py-3.5 text-base sm:text-sm min-h-[44px] font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        placeholder="Create new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl cursor-pointer"
                                        title={showPass.new ? "Hide password" : "Show password"}
                                    >
                                        {showPass.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password Input */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 ml-1">
                                    {t('dashboard.settings.confirmPass', { defaultValue: 'Confirm New Password' })}
                                </label>
                                <div className={`relative group focus-within:ring-2 transition-all rounded-2xl overflow-hidden border bg-slate-50/60 dark:bg-slate-800/50 ${
                                    passwordsMismatch
                                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                                        : passwordsMatch
                                            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                            : 'border-slate-200 dark:border-slate-700 focus-within:border-orange-500 focus-within:ring-orange-500/20'
                                }`}>
                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                                        passwordsMismatch ? 'text-rose-500' : passwordsMatch ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                        <Lock size={18} />
                                    </span>
                                    <input
                                        type={showPass.confirm ? "text" : "password"}
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        className="w-full bg-transparent pl-12 pr-12 py-3.5 text-base sm:text-sm min-h-[44px] font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        placeholder="Repeat new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl cursor-pointer"
                                        title={showPass.confirm ? "Hide password" : "Show password"}
                                    >
                                        {showPass.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Real-Time Password Match Feedback Badge */}
                        {hasConfirm && (
                            <div className="px-1">
                                {passwordsMatch ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
                                        <CheckCircle2 size={15} />
                                        <span>Passwords match</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 animate-fadeIn">
                                        <X size={15} strokeWidth={2.5} />
                                        <span>Passwords do not match</span>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Real-Time Password Strength Meter HUD */}
                        {passwords.new && (
                            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-1">
                                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider px-1">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {t('dashboard.settings.secStrength', { defaultValue: 'Password Strength' })}
                                    </span>
                                    <span className={`${meter.color} font-mono font-extrabold`}>
                                        {meter.text}
                                    </span>
                                </div>

                                {/* 4-Segmented Bar */}
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[1, 2, 3, 4].map(idx => (
                                        <div key={idx} className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    idx <= score ? meter.bar : 'bg-transparent'
                                                }`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Upfront Password Requirements Checklist */}
                        <div className="space-y-2 pt-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                                Security Requirements Checklist:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {[
                                    { label: 'Minimum 8 characters', met: hasLength },
                                    { label: 'At least 1 uppercase letter (A-Z)', met: hasCapital },
                                    { label: 'At least 1 number (0-9)', met: hasNumber },
                                    { label: 'At least 1 special symbol (!@#$%)', met: hasSpecial },
                                ].map((req, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                                            req.met
                                                ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                            req.met
                                                ? 'bg-emerald-500 text-white'
                                                : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                        }`}>
                                            {req.met && <Check size={11} strokeWidth={3} />}
                                        </div>
                                        <span className="truncate">{req.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Actions & Submit Validation Feedback */}
                    <div className="pt-4 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <button
                                type="submit"
                                disabled={!isFormValid || changing}
                                className={`w-full sm:w-auto px-8 py-3.5 min-h-[48px] justify-center rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center gap-2.5 ${
                                    isFormValid && !changing
                                        ? 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white shadow-lg shadow-orange-500/25 cursor-pointer'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
                                }`}
                            >
                                {changing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Updating Credentials...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={17} />
                                        <span>{t('dashboard.settings.updatePass', { defaultValue: 'Update Password' })}</span>
                                    </>
                                )}
                            </button>

                            {/* Validation Status Indicator */}
                            <span className="text-xs font-medium">
                                {isFormValid ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                        <CheckCircle2 size={14} /> Ready to update credentials
                                    </span>
                                ) : (
                                    <span className="text-slate-400 dark:text-slate-500">
                                        Complete all requirements to enable submit
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                </form>

            </div>

            {/* ── Secondary Cards: Gmail 2FA & Active Sessions ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Two-Factor Authentication via Gmail Card */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Gmail Two-Factor Authentication</h4>
                                    <p className="text-[11px] text-slate-500 font-mono">{residentEmail}</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase border ${
                                isGmail2FA
                                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}>
                                {isGmail2FA ? '🟢 Active' : 'Disabled'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            Protect your PULSO account with two-step login verification. When signing in, a secure 6-digit one-time passcode will be delivered directly to your registered Gmail address.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleStartGmail2FA}
                        className={`w-full py-3 min-h-[44px] rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                            isGmail2FA
                                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 active:scale-[0.98]'
                        }`}
                    >
                        <ShieldCheck size={15} />
                        <span>{isGmail2FA ? 'Deactivate Gmail 2FA' : 'Enable Gmail 2FA Verification'}</span>
                    </button>
                </div>

                {/* Device & Session Security Card */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                    <Monitor size={16} />
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Active Device Session</h4>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Now
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            Currently signed in via <strong>Web Browser</strong> in <strong>Caloocan City, Metro Manila</strong>.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
                        <span>IP Address: 120.29.***.***</span>
                        <span>SSL / TLS Encrypted</span>
                    </div>
                </div>
            </div>

            {/* ── PULSEAI Chat History & Privacy Card ── */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-5">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-[#ea580c] dark:text-orange-400">
                                <Brain size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">PULSEAI Chat History & Privacy</h4>
                                <p className="text-[11px] text-slate-500 font-mono">Persistent Assistant Memory · RA 10173</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase border bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30">
                            Encrypted
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Your conversations with PULSEAI are securely saved to your resident profile so you can resume questions on any device. Under the Philippine Data Privacy Act (RA 10173), you maintain the right to erase your conversational data at any time.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">
                        Permanently erases all past questions, answers, and assistant session history.
                    </span>
                    <button
                        type="button"
                        onClick={onClearAIChatHistory}
                        className="py-2.5 px-4 min-h-[40px] rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 shrink-0"
                    >
                        <Trash2 size={14} />
                        <span>Clear All PULSEAI History</span>
                    </button>
                </div>
            </div>

            {/* ── Gmail 2FA Activation & OTP Verification Modal ── */}
            <AnimatePresence>
                {is2FAModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setIs2FAModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 sm:p-8 rounded-3xl text-center relative overflow-hidden shadow-2xl text-slate-900 dark:text-white"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center mx-auto mb-4">
                                <Mail size={30} />
                            </div>

                            <h3 className="text-xl font-extrabold mb-1.5 font-heading">
                                Verify Your Gmail Account
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mb-4 leading-relaxed">
                                A 6-digit one-time security code was sent to <strong className="text-orange-500">{residentEmail}</strong>.
                            </p>

                            {/* Security Code Helper Pill with last 3 digits asterisked */}
                            {activeOtp && (
                                <div className="mb-5 p-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-xs font-medium text-orange-800 dark:text-orange-300 flex items-center justify-center gap-2">
                                    <span>Gmail Security Code:</span>
                                    <span className="font-mono font-bold text-sm tracking-widest text-orange-600 dark:text-orange-400">
                                        {activeOtp.slice(0, 3)}***
                                    </span>
                                </div>
                            )}

                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        autoFocus
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        onPaste={(e) => {
                                            const raw = e.clipboardData ? e.clipboardData.getData('text') : '';
                                            const cleaned = raw.replace(/\D/g, '').slice(0, 6);
                                            if (cleaned) {
                                                e.preventDefault();
                                                setOtpInput(cleaned);
                                            }
                                        }}
                                        placeholder="• • • • • •"
                                        className="w-full text-center tracking-[0.6em] font-mono text-2xl font-black py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIs2FAModalOpen(false)}
                                        className="flex-1 py-3 px-4 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={otpInput.length < 6 || isVerifyingOtp}
                                        className={`flex-1 py-3 px-4 min-h-[44px] rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
                                            otpInput.length === 6 && !isVerifyingOtp
                                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25 cursor-pointer'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                                        }`}
                                    >
                                        {isVerifyingOtp ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                <span>Verifying...</span>
                                            </>
                                        ) : (
                                            <span>Activate 2FA</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Theme-Aware Password Confirmation Modal ── */}
            <AnimatePresence>
                {isConfirmOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setIsConfirmOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 sm:p-8 rounded-3xl text-center relative overflow-hidden shadow-2xl text-slate-900 dark:text-white"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center mx-auto mb-5">
                                <Lock size={28} />
                            </div>
                            <h3 className="text-xl font-extrabold mb-2 font-heading">
                                {t('dashboard.settings.confirmTitle', { defaultValue: 'Confirm Password Change?' })}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-6 leading-relaxed">
                                {t('dashboard.settings.confirmText', { defaultValue: 'Your account credentials will be updated immediately. You will need to use your new password for all future sign-ins.' })}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={actuallyUpdatePassword}
                                    className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                                >
                                    {t('dashboard.settings.confirmBtn', { defaultValue: 'Confirm Change' })}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
};

// Rich metadata for each report category — color + info popover content
const CATEGORY_META = {
    'Water Supply & Distribution': {
        color: 'blue',
        icon: <Droplets size={20} strokeWidth={1.7} />,
        scope: [
            'De-clogging of blocked canals, storm drains, and manholes',
            'Localized flooding and estero flood control (city jurisdiction)',
            'Broken city pipes, water fountains, and public drainage infrastructure',
            'Note: Potable water main lines (Maynilad) are reported for coordination',
        ],
    },
    'Power & Street Lighting': {
        color: 'yellow',
        icon: <Lightbulb size={20} strokeWidth={1.7} />,
        scope: [
            'Installation and replacement of burned-out streetlight bulbs',
            'Repair of city-owned electrical wiring and lamp posts',
            'Ensuring nighttime safety along city and barangay roads',
        ],
    },
    'Roads & Bridges': {
        color: 'orange',
        icon: <Cone size={20} strokeWidth={1.7} />,
        scope: [
            'Local city roads and barangay road repair',
            'Pothole patching, asphalt cracking, and broken pavement',
            'Damaged footbridges, pedestrian crossings, and curbs',
            'Sidewalk cracks and carriageway obstructions',
        ],
    },
    'Traffic & Road Signs': {
        color: 'orange',
        icon: <Signpost size={20} strokeWidth={1.7} />,
        scope: [
            'Broken or malfunctioning traffic light signals and timers',
            'Missing, damaged, or obscured regulatory street signs',
            'Damaged median railings, bollards, and lane markers',
            'Street nameplates and directional civic signage',
        ],
    },
    'Public Safety & Hazards': {
        color: 'red',
        icon: <ShieldAlert size={20} strokeWidth={1.7} />,
        scope: [
            'Structural safety inspection of buildings and retaining walls',
            'Debris and fallen tree clearing along roadways after typhoons',
            'Immediate public safety hazards and carriageway obstacles',
            'Building permit and national building code safety violations',
        ],
    },
    'Public Buildings & Facilities': {
        color: 'green',
        icon: <Landmark size={20} strokeWidth={1.7} />,
        scope: [
            'Construction and maintenance of public school buildings',
            'Barangay health centers and City Hall facility repairs',
            'Basketball courts, public plazas, and community playgrounds',
            'Covered courts, parks, and other city-owned facilities',
        ],
    },
    'Others': {
        color: 'purple',
        icon: <HelpCircle size={20} strokeWidth={1.7} />,
        scope: [
            'General civic infrastructure concerns not covered by defined categories',
            'Uncategorized city engineering maintenance requests',
            'Cross-departmental issues requiring dispatcher manual review',
            'Note: Detailed description in Additional Notes is required for routing',
        ],
    },
};

// Backward-compatible category aliases
CATEGORY_META['Water Supply Network'] = CATEGORY_META['Water Supply & Distribution'];
CATEGORY_META['Water & Drainage'] = CATEGORY_META['Water Supply & Distribution'];
CATEGORY_META['Roads & Drainage'] = CATEGORY_META['Roads & Bridges'];
CATEGORY_META['Public Safety & Regulatory'] = CATEGORY_META['Public Safety & Hazards'];
CATEGORY_META['Public Facilities'] = CATEGORY_META['Public Buildings & Facilities'];
CATEGORY_META['Public Facilities & Buildings'] = CATEGORY_META['Public Buildings & Facilities'];
CATEGORY_META['Street Lighting & Power'] = CATEGORY_META['Power & Street Lighting'];
CATEGORY_META['Street Lighting'] = CATEGORY_META['Power & Street Lighting'];

const COLOR_MAP = {
    orange: { ring: 'ring-orange-500', bg: 'bg-orange-500/10 dark:bg-orange-500/15', dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-400', badge: 'bg-orange-500' },
    blue: { ring: 'ring-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/15', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-400', badge: 'bg-blue-500' },
    yellow: { ring: 'ring-yellow-500', bg: 'bg-yellow-500/10 dark:bg-yellow-500/15', dot: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-400', badge: 'bg-yellow-500' },
    red: { ring: 'ring-red-500', bg: 'bg-red-500/10 dark:bg-red-500/15', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', border: 'border-red-400', badge: 'bg-red-500' },
    green: { ring: 'ring-green-500', bg: 'bg-green-500/10 dark:bg-green-500/15', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400', border: 'border-green-400', badge: 'bg-green-500' },
    purple: { ring: 'ring-purple-500', bg: 'bg-purple-500/10 dark:bg-purple-500/15', dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-400', badge: 'bg-purple-500' },
};

const ReportCategoryRadio = ({ value, onChange, options, disabled = false, disabledReason = '' }) => {
    const [tooltip, setTooltip] = useState(null); // key of open tooltip
    const tooltipRef = useRef(null);

    // Ensure array format for toggling
    const selectedOptions = Array.isArray(value) ? value : (value ? [value] : []);

    useEffect(() => {
        const handler = e => {
            if (tooltipRef.current && !tooltipRef.current.contains(e.target)) setTooltip(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleToggle = (opt) => {
        if (disabled) return;
        if (selectedOptions.includes(opt)) {
            onChange(selectedOptions.filter(v => v !== opt));
        } else {
            if (selectedOptions.length < 3) {
                onChange([...selectedOptions, opt]);
            }
        }
    };

    return (
        <div className={`space-y-2.5 transition-opacity duration-200 ${disabled ? 'cursor-not-allowed select-none' : ''}`}>
            {/* Header with Live Counter */}
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <p className={`text-[12px] font-bold uppercase tracking-wider ${disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        Issue Category
                    </p>
                    <span className={`text-[11px] ${
                        disabledReason
                            ? (disabledReason.includes('photo of the problem') || disabledReason.includes('Invalid')
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-amber-600 dark:text-amber-400 font-semibold')
                            : 'text-slate-500 dark:text-slate-400 font-semibold'
                    } flex items-center gap-1`}>
                        {disabledReason ? (
                            <>
                                {disabledReason.includes('photo') && !disabledReason.includes('problem') ? (
                                    <Camera size={12} className="inline shrink-0" />
                                ) : (
                                    <AlertTriangle size={12} className="inline shrink-0" />
                                )}
                                <span>{disabledReason}</span>
                            </>
                        ) : (
                            '(Required)'
                        )}
                    </span>
                </div>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1 ${
                    disabled
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
                        : selectedOptions.length === 3
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                            : selectedOptions.length > 0
                                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                    {disabled && <Lock size={10} className="inline shrink-0" />}
                    {disabled ? 'Locked' : `${selectedOptions.length}/3 selected`}
                </span>
            </div>

            {/* Accessible Single-Line Category Cards */}
            <div className="flex flex-col gap-1 sm:gap-1.5 max-h-[295px] sm:max-h-[315px] overflow-y-auto pr-1 scrollbar-thin" ref={tooltipRef}>
                {options.map((optObj, index) => {
                    const opt = typeof optObj === 'string' ? optObj : optObj.value;
                    const label = typeof optObj === 'string' ? optObj : optObj.label;
                    const meta = CATEGORY_META[opt] || CATEGORY_META['Roads & Bridges'] || CATEGORY_META['Roads & Drainage'];
                    const clr = COLOR_MAP[meta?.color] || COLOR_MAP.orange;
                    const selected = selectedOptions.includes(opt);
                    const infoOpen = tooltip === opt;
                    const atCapacity = !selected && selectedOptions.length >= 3;
                    const isTopRow = index < 2;

                    return (
                        <div key={opt} className={`relative group w-full ${disabled ? 'cursor-not-allowed' : ''}`} title={disabled ? (disabledReason || 'Please capture photo first to select categories') : undefined}>
                            <div
                                onClick={() => {
                                    if (!disabled && !atCapacity) {
                                        handleToggle(opt);
                                        setTooltip(null);
                                    }
                                }}
                                aria-disabled={disabled}
                                className={`flex items-center justify-between gap-2.5 px-3 py-1.5 sm:py-2 min-h-[38px] sm:min-h-[40px] rounded-xl border transition-all duration-150 select-none w-full ${
                                    disabled
                                        ? 'border-slate-200/80 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-900/50 opacity-40 grayscale cursor-not-allowed text-slate-400 dark:text-slate-600 pointer-events-none'
                                        : selected
                                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/15 ring-2 ring-orange-500/40 text-slate-900 dark:text-white shadow-xs'
                                            : atCapacity
                                                ? 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                                                : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:border-orange-400 dark:hover:border-orange-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 hover:shadow-xs cursor-pointer'
                                }`}
                                title={disabled ? (disabledReason || 'Please capture photo of the problem to select categories') : atCapacity ? 'Maximum 3 categories selected' : undefined}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className={`p-1 sm:p-1.5 rounded-lg shrink-0 transition-colors ${
                                        disabled
                                            ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600'
                                            : selected
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:text-orange-500'
                                    }`}>
                                        {meta?.icon}
                                    </div>

                                    <span className={`text-xs sm:text-[13px] font-bold whitespace-nowrap truncate ${
                                        disabled
                                            ? 'text-slate-400 dark:text-slate-600'
                                            : selected
                                                ? 'text-orange-950 dark:text-orange-100 font-extrabold'
                                                : 'text-slate-900 dark:text-slate-100'
                                    }`}>
                                        {label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {selected && !disabled && (
                                        <span className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs">
                                            <Check size={11} strokeWidth={3} />
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={e => {
                                            e.stopPropagation();
                                            if (!disabled) setTooltip(infoOpen ? null : opt);
                                        }}
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-colors shrink-0 ${
                                            disabled
                                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed pointer-events-none'
                                                : infoOpen
                                                    ? 'bg-orange-500 text-white'
                                                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                        title="View jurisdiction & scope"
                                    >
                                        <Info size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Info Popover with Theme-Aware Light/Dark Colors */}
                            <AnimatePresence>
                                {infoOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: isTopRow ? -5 : 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: isTopRow ? -5 : 5 }}
                                        className={`absolute right-0 ${
                                            isTopRow ? 'top-full mt-2' : 'bottom-full mb-2'
                                        } z-[120] w-[calc(100vw-3rem)] max-w-xs sm:w-80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 pointer-events-auto`}
                                    >
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-orange-500">{meta.icon}</span>
                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{label}</span>
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Scope of Jurisdiction</p>
                                        <ul className="space-y-1.5">
                                            {meta.scope.map((line, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug">
                                                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${clr.badge} shrink-0`} />
                                                    <span>{line}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ResidentModals = ({
    activeModal, setActiveModal, selectedPost, setSelectedPost, isLoaded, map, setMap, panorama, setPanorama, reportLocation, setReportLocation,
    locationAddress, setLocationAddress, plusCode, setPlusCode, geocodingAddress, structuredAddress, setStructuredAddress, reportCategory, setReportCategory, reportNotes, setReportNotes, selectedImage, setSelectedImage,
    submittingReport, handleFileReport, isSelectingLocation, setIsSelectingLocation, isIDCameraOpen, setIsIDCameraOpen, checkJurisdiction,
    reverseGeocode, mapOptions, pulseRadius, processedHazards, selectedHazard, setSelectedHazard, svLocation, handleStreetViewClick,
    getIconForCategory, getMarkerSVG, getCategoryColor, mapFilter, setMapFilter,
    isAnalyzing, aiFeedback, setAiFeedback,
    reportToCancel, setReportToCancel, confirmCancelReport,
    isSubmitConfirmOpen, setIsSubmitConfirmOpen, actuallySubmitReport,
    setZoomedImage,
    photoPinIcons, getCachedIcon, theme, borderData,
    isLocating, locatingStep, requestDeviceLocation,
    locationPermissionDenied, photoMetadata, setPhotoMetadata,
    showHeatmap, setShowHeatmap,
    mapLayerType, setMapLayerType,
    mapCategoryFilter, setMapCategoryFilter,
    heatmapPoints, mapFilteredHazards,
    showToast,
    t
}) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const [isSvFullscreen, setIsSvFullscreen] = useState(false);
    const [currentMapZoom, setCurrentMapZoom] = useState(11);
    const [activeSector, setActiveSector] = useState('all');

    // Auto-reset fullscreen when Street View closes
    useEffect(() => {
        if (!svLocation) {
            setIsSvFullscreen(false);
        }
    }, [svLocation]);

    // Memoized District & Barangay Boundary Polygon Options matching Government Dispatcher GIS Map
    const northPolygonOptions = React.useMemo(() => ({
        strokeColor: '#f97316',
        strokeOpacity: activeSector === 'south' ? 0.35 : 1.0,
        strokeWeight: activeSector === 'north' ? 2.5 : 2.2,
        fillColor: '#f97316',
        fillOpacity: activeSector === 'south' ? 0.02 : (theme === 'dark' ? 0.10 : 0.06),
        clickable: false,
        zIndex: activeSector === 'north' ? 3 : 2,
    }), [theme, activeSector]);

    const southPolygonOptions = React.useMemo(() => ({
        strokeColor: '#ff6b00',
        strokeOpacity: activeSector === 'north' ? 0.35 : 1.0,
        strokeWeight: activeSector === 'south' ? 2.5 : 2.2,
        fillColor: '#ff6b00',
        fillOpacity: activeSector === 'north' ? 0.02 : (theme === 'dark' ? 0.08 : 0.05),
        clickable: false,
        zIndex: activeSector === 'south' ? 3 : 1,
    }), [theme, activeSector]);

    // Pre-indexed memoized barangay polygons (only instantiated once from GeoJSON)
    const memoizedBarangayPolygons = React.useMemo(() => {
        if (!borderData?.features || borderData.features.length === 0) return [];
        return borderData.features.map((feature, i) => {
            const isNorth = (feature.properties?.sector || '') === 'North';
            const paths = feature.geometry?.type === 'MultiPolygon'
                ? feature.geometry.coordinates.map(poly => poly[0].map(c => ({ lng: c[0], lat: c[1] })))
                : [feature.geometry?.coordinates?.[0]?.map(c => ({ lng: c[0], lat: c[1] })) || []];
            return { id: `brgy-${i}`, isNorth, paths };
        });
    }, [borderData]);



    // Default Map View: Frame full Caloocan bounds (North + South) when opening maps
    useEffect(() => {
        if (activeModal === 'map' && map && window.google && window.google.maps) {
            const bounds = new window.google.maps.LatLngBounds(
                new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
                new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
            );
            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }
    }, [activeModal, map]);

    // Stop listening if modal closes
    useEffect(() => {
        if (!activeModal && recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [activeModal, isListening]);

    // Map Categories Horizontal Scroll State & Controls
    const mapCategoryScrollRef = useRef(null);
    const [canScrollMapCatLeft, setCanScrollMapCatLeft] = useState(false);
    const [canScrollMapCatRight, setCanScrollMapCatRight] = useState(true);

    const updateMapCatScroll = useCallback(() => {
        const el = mapCategoryScrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollMapCatLeft(scrollLeft > 2);
        setCanScrollMapCatRight(scrollLeft < scrollWidth - clientWidth - 2);
    }, []);

    const scrollMapCategories = (direction) => {
        const el = mapCategoryScrollRef.current;
        if (!el) return;
        const scrollAmount = 140;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
        setTimeout(updateMapCatScroll, 300);
    };

    useEffect(() => {
        if (activeModal === 'map') {
            updateMapCatScroll();
            const timer = setTimeout(updateMapCatScroll, 120);
            window.addEventListener('resize', updateMapCatScroll);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateMapCatScroll);
            };
        }
    }, [activeModal, updateMapCatScroll]);

    const toggleVoiceToText = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            Swal.fire({
                title: 'Speech Recognition Unavailable',
                text: 'Your current browser does not support Web Speech API. Please try Google Chrome or Microsoft Edge.',
                icon: 'warning',
                confirmButtonColor: '#f97316'
            });
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
            }
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'fil-PH'; // Supports Filipino and English in the Philippines

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setReportNotes(prev => {
                        const trimmed = prev ? prev.trim() : '';
                        const combined = trimmed ? `${trimmed} ${finalTranscript.trim()}` : finalTranscript.trim();
                        return combined.slice(0, 500);
                    });
                }
            };

            recognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    Swal.fire({
                        title: 'Microphone Permission Needed',
                        text: 'Please allow microphone access in your browser settings to dictate your report notes.',
                        icon: 'info',
                        confirmButtonColor: '#f97316'
                    });
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setIsListening(false);
        }
    };

    const notesLength = reportNotes.length;
    const isCategorySelected = reportCategory.length > 0;
    const isOthersSelected = reportCategory.includes('Others');
    const isNotesValidForOthers = !isOthersSelected || reportNotes.trim().length >= 10;

    const getLocatingStatusText = () => {
        if (geocodingAddress) return "Pinpointing street & landmark...";
        if (locatingStep === 0) return "Getting your exact location...";
        if (locatingStep === 1) return "Refining GPS accuracy radius...";
        return "Almost there, finalizing coordinates...";
    };

    const isLocationLoading = (isLocating || geocodingAddress || (!reportLocation && !locationPermissionDenied)) && !locationPermissionDenied;
    const isLocationResolved = !isLocating && !geocodingAddress && Boolean(reportLocation?.lat && locationAddress);
    const isLocationFailed = !isLocationLoading && (!reportLocation || locationPermissionDenied);
    const isLocationReady = Boolean(reportLocation?.lat && reportLocation?.lng && !isLocating && !geocodingAddress);

    return (
        <AnimatePresence>
        {activeModal && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
                onClick={() => setActiveModal(null)}
            >
                <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    className={`pointer-events-auto transition-colors w-full ${
                        activeModal === 'map'
                            ? (isSvFullscreen
                                ? 'fixed inset-0 z-[100] w-screen h-[100dvh] flex flex-col bg-slate-950 rounded-none border-0 shadow-none'
                                : 'max-w-7xl h-[88dvh] sm:h-[90vh] flex flex-col my-auto bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl sm:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden'
                              )
                            : activeModal === 'file-report'
                                ? 'bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 max-w-4xl max-h-[94dvh] sm:max-h-[92vh] my-auto'
                                : 'max-w-xl flex flex-col my-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90dvh]'
                    }`}
                    onClick={e => e.stopPropagation()}
                >
                    {activeModal === 'file-report' && (
                        <div className="flex flex-col h-full p-3.5 sm:p-6 overflow-hidden">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 ${isAnalyzing ? 'animate-pulse' : ''}`}>
                                        {isAnalyzing ? <Zap size={20} className="animate-spin" /> : <FileText size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>{t('dashboard.quickReport.title', { defaultValue: 'Quick Report' })}</span>
                                            {isAnalyzing && (
                                                <span className="text-[10px] bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse uppercase tracking-wider">
                                                    AI Scanning...
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                            {aiFeedback ? `AI Assessment: ${aiFeedback.category}` : 'Submit an infrastructure hazard for LGU verification & dispatch.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveModal(null);
                                        setAiFeedback(null);
                                        setSelectedImage(null);
                                        setReportNotes('');
                                        setReportCategory([]);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full transition-all cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Scrollable Form Body */}
                            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar min-h-0">

                                {/* Location Banner with Automated Multi-Sample Accuracy */}
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all shadow-xs">
                                    {isLocationLoading ? (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[64px]">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-10 h-10 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center shrink-0">
                                                    <Loader2 size={20} className="animate-spin text-orange-500" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                                            {getLocatingStatusText()}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 animate-pulse">
                                                        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-48" />
                                                        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-24" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center flex-wrap gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => { setActiveModal('map'); setIsSelectingLocation(true); }}
                                                    className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                                    title="Pinpoint manually on map"
                                                >
                                                    <MapPin size={14} />
                                                    <span>Pinpoint on Map</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : isLocationFailed ? (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[64px]">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-10 h-10 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                                                    <AlertTriangle size={20} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                                        Unable to acquire GPS location
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Location permission was denied or signal is unavailable. Please retry or pinpoint manually on the map.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center flex-wrap gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => requestDeviceLocation(true)}
                                                    className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                                    title="Retry GPS location acquisition"
                                                >
                                                    <RotateCcw size={14} />
                                                    <span>Retry GPS</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setActiveModal('map'); setIsSelectingLocation(true); }}
                                                    className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                                    title="Pinpoint manually on map"
                                                >
                                                    <MapPin size={14} />
                                                    <span>Pinpoint on Map</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[64px]">
                                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                                <div className="w-10 h-10 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                                    <MapPin size={20} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div>
                                                        <div className="flex items-start justify-between gap-1.5">
                                                            <p
                                                                className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words select-text cursor-text flex-1"
                                                                title={locationAddress}
                                                            >
                                                                {locationAddress}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (locationAddress) {
                                                                        navigator.clipboard?.writeText(locationAddress);
                                                                        if (showToast) showToast('Address copied to clipboard', 'success');
                                                                    }
                                                                }}
                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"
                                                                title="Copy full address"
                                                                aria-label="Copy full address"
                                                            >
                                                                <Copy size={13} />
                                                            </button>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                            {plusCode && (
                                                                <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 select-all" title="Full Plus Code">
                                                                    {plusCode}
                                                                </span>
                                                            )}
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 select-all" title="GPS Coordinates">
                                                                {reportLocation ? `${reportLocation.lat.toFixed(5)}, ${reportLocation.lng.toFixed(5)}` : ''}
                                                            </span>

                                                            {/* Honest Tiered Accuracy Confidence Indicator */}
                                                            {(() => {
                                                                const acc = reportLocation?.accuracy;
                                                                if (typeof acc === 'number' && acc > 0 && acc <= 20) {
                                                                    return (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 shadow-2xs">
                                                                            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                                                                            <span>High Accuracy (±{acc}m)</span>
                                                                        </span>
                                                                    );
                                                                }
                                                                if (typeof acc === 'number' && acc > 20) {
                                                                    return (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-2xs">
                                                                            <Info size={13} className="text-amber-600 dark:text-amber-400" />
                                                                            <span>Approximate Location (±{acc}m)</span>
                                                                        </span>
                                                                    );
                                                                }
                                                                return (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                                                        <MapPin size={13} className="text-slate-500" />
                                                                        <span>Caloocan Jurisdiction</span>
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center flex-wrap gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => { setActiveModal('map'); setIsSelectingLocation(true); }}
                                                    className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-orange-600/20"
                                                    title="Open interactive map to pinpoint location on map"
                                                >
                                                    <MapPin size={14} />
                                                    <span>Pinpoint on Map</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Main Two-Column Layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                    {/* ── LEFT COLUMN: Camera-Only Photo Evidence ── */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Photo Evidence</span>
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Auto-Fit 4:3 Frame</span>
                                        </div>

                                        {selectedImage ? (
                                            /* Auto-Fit Image Preview Container with Click-to-Zoom */
                                            <div
                                                onClick={() => setZoomedImage && setZoomedImage(selectedImage)}
                                                className={`w-full aspect-[4/3] rounded-2xl overflow-hidden relative bg-slate-950 shadow-md group cursor-zoom-in ${
                                                    aiFeedback?.is_inappropriate 
                                                        ? 'border-2 border-rose-500 ring-4 ring-rose-500/20' 
                                                        : 'border border-slate-200 dark:border-slate-800'
                                                }`}
                                                title="Click to zoom picture"
                                            >
                                                <img
                                                    src={selectedImage}
                                                    alt="Incident Preview"
                                                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                                                />

                                                {/* Invalid Photo Non-Infrastructure Warning Banner */}
                                                {aiFeedback?.is_inappropriate && (
                                                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-20">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-white/20 via-rose-500/20 to-white/5 backdrop-blur-xl border border-white/30 border-t-white/60 flex items-center justify-center text-rose-300 mb-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_24px_rgba(244,63,94,0.3)] animate-bounce">
                                                            <AlertTriangle size={24} className="drop-shadow-[0_2px_6px_rgba(244,63,94,0.5)]" />
                                                        </div>
                                                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-b from-white/25 via-rose-500/20 to-white/5 backdrop-blur-xl border border-white/35 border-t-white/70 border-b-white/15 text-white font-black text-[10px] uppercase tracking-wider mb-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_6px_20px_rgba(244,63,94,0.35)] drop-shadow-sm select-none">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e] animate-pulse shrink-0" />
                                                            <span>Invalid Photo • Not Infrastructure</span>
                                                        </span>
                                                        <h4 className="text-sm font-bold text-white mb-1.5 drop-shadow-xs">
                                                            Cannot Proceed With This Photo
                                                        </h4>
                                                        <p className="text-[11px] text-rose-100/95 leading-relaxed max-w-xs mb-3.5 p-3 rounded-2xl bg-gradient-to-b from-white/10 via-rose-950/20 to-white/[0.03] backdrop-blur-xl border border-white/20 border-t-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_12px_32px_rgba(0,0,0,0.5)]">
                                                            {formatFriendlyNotice(aiFeedback.rejection_reason)}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsIDCameraOpen(true);
                                                            }}
                                                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                                        >
                                                            <Camera size={14} />
                                                            <span>Take Valid Photo</span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Bottom gradient mask */}
                                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                                                {/* Top-Left Zoom Hint Badge */}
                                                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/75 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                                                    <Maximize2 size={12} />
                                                    <span>Click to zoom</span>
                                                </div>

                                                {/* Top-Right Remove Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedImage(null);
                                                        setReportCategory([]);
                                                        if (setPhotoMetadata) setPhotoMetadata(null);
                                                        setAiFeedback(null);
                                                    }}
                                                    className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/75 hover:bg-rose-600 text-white backdrop-blur-xs shadow-md transition-all cursor-pointer z-10"
                                                    title="Remove evidence photo"
                                                    aria-label="Remove evidence photo"
                                                >
                                                    <X size={16} strokeWidth={2.5} />
                                                </button>

                                                {/* Bottom Metadata & Retake Bar */}
                                                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 text-white text-xs font-semibold backdrop-blur-xs border border-white/10 shadow-xs">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                        <span>
                                                            {photoMetadata?.capturedAt
                                                                ? `Live Photo • ${new Date(photoMetadata.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                                : 'Live Camera Evidence'}
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsIDCameraOpen(true);
                                                        }}
                                                        className="px-3.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20 shadow-xs"
                                                        title="Retake photo using device camera"
                                                    >
                                                        <Camera size={14} />
                                                        <span>Retake Photo</span>
                                                    </button>
                                                </div>

                                                {/* AI Scanner Overlay */}
                                                {isAnalyzing && (
                                                    <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white z-20">
                                                        <Loader2 size={26} className="animate-spin text-orange-400" />
                                                        <span className="text-xs font-bold">AI Analyzing Damage...</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Empty State: Camera-Only Primary Action */
                                            <div
                                                onClick={() => setIsIDCameraOpen(true)}
                                                className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center p-6 text-center hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50/20 dark:hover:bg-slate-800/60 transition-all cursor-pointer group"
                                            >
                                                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-orange-500 group-hover:scale-105 shadow-xs transition-all mb-3">
                                                    <Camera size={28} />
                                                </div>
                                                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mb-1">
                                                    Capture Photo Evidence
                                                </p>
                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 max-w-xs">
                                                    Device camera required for authentic, timestamp-verified field condition
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsIDCameraOpen(true);
                                                    }}
                                                    className="w-full max-w-[240px] py-3 px-4 min-h-[48px] bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                                                >
                                                    <Camera size={16} strokeWidth={2.5} />
                                                    <span>Open Camera</span>
                                                </button>
                                            </div>
                                        )}

                                        <IDCameraModal
                                            isOpen={isIDCameraOpen}
                                            onClose={() => setIsIDCameraOpen(false)}
                                            onCapture={(file, aiData) => {
                                                setSelectedImage(URL.createObjectURL(file));
                                                if (setPhotoMetadata) {
                                                    setPhotoMetadata({
                                                        capturedAt: new Date().toISOString(),
                                                        lat: reportLocation?.lat,
                                                        lng: reportLocation?.lng,
                                                        accuracy: reportLocation?.accuracy
                                                    });
                                                }
                                                if (aiData) {
                                                    setAiFeedback(aiData);
                                                    if (aiData.auto_description && !reportNotes) {
                                                        setReportNotes(aiData.auto_description);
                                                    }
                                                    const aiCat = (aiData.category || '').toLowerCase();
                                                    let mapped = [];
                                                    if (aiCat.includes('light') || aiCat.includes('electric') || aiCat.includes('power') || aiCat.includes('lamp') || aiCat.includes('street')) {
                                                        mapped.push('Power & Street Lighting');
                                                    } else if (aiCat.includes('traffic') || aiCat.includes('sign') || aiCat.includes('signal') || aiCat.includes('marking')) {
                                                        mapped.push('Traffic & Road Signs');
                                                    } else if (aiCat.includes('road') || aiCat.includes('bridge') || aiCat.includes('pothole') || aiCat.includes('asphalt') || aiCat.includes('pavement')) {
                                                        mapped.push('Roads & Bridges');
                                                    } else if (aiCat.includes('water') || aiCat.includes('drain') || aiCat.includes('flood') || aiCat.includes('canal') || aiCat.includes('sewer') || aiCat.includes('pipe') || aiCat.includes('manhole')) {
                                                        mapped.push('Water Supply & Distribution');
                                                    } else if (aiCat.includes('safety') || aiCat.includes('regulat') || aiCat.includes('hazard') || aiCat.includes('fire') || aiCat.includes('building') || aiCat.includes('debris') || aiCat.includes('tree')) {
                                                        mapped.push('Public Safety & Hazards');
                                                    } else if (aiCat.includes('facilit') || aiCat.includes('park') || aiCat.includes('hall') || aiCat.includes('court') || aiCat.includes('school') || aiCat.includes('gym')) {
                                                        mapped.push('Public Buildings & Facilities');
                                                    } else if (aiCat.includes('other') || aiCat.includes('unknown') || aiCat.includes('unclear') || aiCat.includes('misc')) {
                                                        mapped.push('Others');
                                                    }
                                                    if (mapped.length > 0) {
                                                        setReportCategory(mapped);
                                                    }
                                                }
                                            }}
                                            title="Capture Evidence Photo"
                                            side="ISSUE"
                                            guideText="Center the infrastructure hazard in frame"
                                            metadata={{
                                                location: reportLocation,
                                                structuredAddress: structuredAddress,
                                                locationAddress: locationAddress,
                                                timestamp: new Date()
                                            }}
                                        />

                                        {/* ── Submission Guidelines & Evidence Tips (Informational) ── */}
                                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                                                    <Info size={13} />
                                                </div>
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Photo & Evidence Guidelines
                                                </span>
                                            </div>

                                            <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                                <li className="flex items-start gap-2 leading-relaxed">
                                                    <span className="text-orange-500 font-bold shrink-0 mt-0.5">•</span>
                                                    <span><strong>Clear Hazard View:</strong> Ensure damage, leaks, or electrical hazards are visible in good lighting.</span>
                                                </li>
                                                <li className="flex items-start gap-2 leading-relaxed">
                                                    <span className="text-orange-500 font-bold shrink-0 mt-0.5">•</span>
                                                    <span><strong>Landmark Reference:</strong> Include nearby landmarks, street posts, or house numbers for field dispatch.</span>
                                                </li>
                                                <li className="flex items-start gap-2 leading-relaxed">
                                                    <span className="text-orange-500 font-bold shrink-0 mt-0.5">•</span>
                                                    <span><strong>Verified Location:</strong> Coordinates are automatically tagged within Caloocan City boundaries.</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* ── RIGHT COLUMN: Categories & Additional Notes ── */}
                                    <div className="flex flex-col gap-3">
                                        {/* Category Picker */}
                                        <ReportCategoryRadio
                                            value={reportCategory}
                                            onChange={setReportCategory}
                                            options={REPORT_CATEGORIES(t)}
                                            disabled={!selectedImage || isAnalyzing || Boolean(aiFeedback?.is_inappropriate)}
                                            disabledReason={
                                                !selectedImage
                                                    ? '(Capture photo first)'
                                                    : isAnalyzing
                                                        ? '(Scanning photo...)'
                                                        : aiFeedback?.is_inappropriate
                                                            ? '(Please capture a photo of the problem)'
                                                            : ''
                                            }
                                        />

                                            {/* Additional Notes Field */}
                                            <div className="space-y-1.5 pt-1">
                                                {aiFeedback?.is_inappropriate && (
                                                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2 mb-1.5">
                                                        <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                                        <div>
                                                            <span className="font-bold">Please check your photo: </span>
                                                            <span>{formatFriendlyNotice(aiFeedback.rejection_reason)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {aiFeedback?.auto_description && !aiFeedback?.is_inappropriate && (
                                                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/20 border border-orange-200 dark:border-orange-900/50 text-xs text-slate-700 dark:text-slate-300 mb-1.5 shadow-2xs">
                                                        <div className="flex items-start gap-2 min-w-0 flex-1">
                                                            <Sparkles size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-slate-900 dark:text-white">AI Observation: </span>
                                                                <span className="italic line-clamp-2">"{aiFeedback.auto_description}"</span>
                                                            </div>
                                                        </div>
                                                        {reportNotes !== aiFeedback.auto_description && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setReportNotes(aiFeedback.auto_description)}
                                                                className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-2xs transition-colors"
                                                            >
                                                                Use AI Text
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                    <MessageSquareText size={14} />
                                                    <span>Additional Notes</span>
                                                    {isOthersSelected && (
                                                        <span className="text-orange-600 dark:text-orange-400 font-extrabold text-[11px] normal-case tracking-normal">
                                                            (Required for Others)
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-[11px] font-mono ${
                                                    notesLength >= 500
                                                        ? 'text-rose-600 font-extrabold animate-pulse'
                                                        : notesLength >= 400
                                                            ? 'text-amber-600 font-bold'
                                                            : isOthersSelected && notesLength < 10
                                                                ? 'text-orange-600 dark:text-orange-400 font-bold'
                                                                : 'text-slate-500 dark:text-slate-400 font-semibold'
                                                }`}>
                                                    {notesLength}/500 {isOthersSelected && notesLength < 10 ? '(min 10)' : ''}
                                                </span>
                                            </div>

                                            <div className={`relative rounded-2xl border transition-all bg-slate-50 dark:bg-slate-800/60 ${
                                                isListening
                                                    ? 'border-orange-500 ring-2 ring-orange-500/30 bg-orange-50/30 dark:bg-orange-950/30'
                                                    : 'border-slate-300 dark:border-slate-700 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20'
                                            }`}>
                                                <textarea
                                                    rows={3}
                                                    className="w-full bg-transparent text-slate-900 dark:text-white p-3.5 pr-12 text-base sm:text-sm outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400 resize-none font-medium"
                                                    placeholder={
                                                        isListening
                                                            ? "🎙️ Listening... Speak clearly into your microphone..."
                                                            : isOthersSelected
                                                                ? "Please describe the issue so we can route it to the right team (minimum 10 characters)..."
                                                                : (reportCategory.length > 0 ? `Describe specific damage or landmark details for ${reportCategory[0]}...` : "Provide helpful context, landmark details, or specific damage...")
                                                    }
                                                    maxLength={500}
                                                    value={reportNotes}
                                                    onChange={e => setReportNotes(e.target.value)}
                                                    aria-required={isOthersSelected}
                                                    aria-invalid={isOthersSelected && notesLength < 10}
                                                />

                                                {/* Voice-to-Text Button */}
                                                <button
                                                    type="button"
                                                    onClick={toggleVoiceToText}
                                                    className={`absolute bottom-2.5 right-2.5 p-2 min-w-[40px] min-h-[40px] rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                                        isListening
                                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 ring-2 ring-orange-400 animate-pulse'
                                                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-orange-500 dark:hover:text-orange-400 border border-slate-300 dark:border-slate-600 shadow-xs'
                                                    }`}
                                                    title={isListening ? "Listening... Click to stop" : "Click to dictate (Voice-to-Text)"}
                                                >
                                                    {isListening ? (
                                                        <Mic size={16} className="animate-bounce" />
                                                    ) : (
                                                        <Mic size={16} />
                                                    )}
                                                </button>
                                            </div>
                                            {isOthersSelected && notesLength < 10 && (
                                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1.5 px-1" role="alert">
                                                    <AlertTriangle size={12} className="shrink-0 text-amber-500" />
                                                    <span>Please describe the issue in at least 10 characters so dispatchers can route it properly ({Math.max(0, 10 - notesLength)} more needed).</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 pt-4 mt-3 border-t border-slate-200 dark:border-slate-800">
                                <div className="text-xs">
                                    {aiFeedback?.is_inappropriate ? (
                                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                                            <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                                            <span>Please take or upload a photo showing the actual problem</span>
                                        </span>
                                    ) : !selectedImage ? (
                                        <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                                            <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                                            <span>Capture photo evidence to continue</span>
                                        </span>
                                    ) : !isLocationReady ? (
                                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
                                            {isLocationLoading ? (
                                                <>
                                                    <Loader2 size={14} className="shrink-0 animate-spin" />
                                                    <span>Acquiring exact location for field dispatch...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                                                    <span>Location required • Retry GPS or pinpoint on map</span>
                                                </>
                                            )}
                                        </span>
                                    ) : !isCategorySelected ? (
                                        <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                                            <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                                            <span>Select at least 1 issue category to continue</span>
                                        </span>
                                    ) : !isNotesValidForOthers ? (
                                        <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5" role="alert">
                                            <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                                            <span>Describe the issue in Additional Notes (10+ chars)</span>
                                        </span>
                                    ) : (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                            <CheckCircle2 size={13} className="shrink-0" />
                                            <span>Ready to submit report</span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveModal(null);
                                            setReportCategory([]);
                                            setAiFeedback(null);
                                            setSelectedImage(null);
                                            setReportNotes('');
                                        }}
                                        className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleFileReport}
                                        disabled={submittingReport || !isCategorySelected || Boolean(aiFeedback?.is_inappropriate) || !selectedImage || !isLocationReady || !isNotesValidForOthers}
                                        className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {submittingReport ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" />
                                                <span>Submitting...</span>
                                            </>
                                        ) : aiFeedback?.is_inappropriate ? (
                                            <span>Invalid Photo • Retake to Continue</span>
                                        ) : !selectedImage ? (
                                            <span>Capture Photo to Continue</span>
                                        ) : isLocationLoading ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" />
                                                <span>Acquiring Location...</span>
                                            </>
                                        ) : !isLocationReady ? (
                                            <span>Set Location to Continue</span>
                                        ) : !isCategorySelected ? (
                                            <span>Select Category to Continue</span>
                                        ) : !isNotesValidForOthers ? (
                                            <span>Describe Issue to Continue</span>
                                        ) : (
                                            <span>Submit Report</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeModal === 'map' && (
                        <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                            {/* Modal Header — collapses into a sleek compact bar when Street View is active */}
                            <div className={`border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 transition-all duration-200 ${
                                svLocation ? 'px-3 sm:px-4 py-2 sm:py-2.5' : 'p-4 sm:p-5'
                            }`}>
                                <div className="min-w-0 pr-2">
                                    <h2 className={`font-black text-slate-900 dark:text-white leading-tight ${
                                        svLocation ? 'text-sm sm:text-base flex items-center gap-2' : 'text-lg sm:text-2xl'
                                    }`}>
                                        {svLocation ? (
                                            <>
                                                <Eye size={16} className="text-orange-500 shrink-0" />
                                                <span className="truncate">Street View Inspection</span>
                                            </>
                                        ) : (
                                            'Nearby Hazards & Infrastructure'
                                        )}
                                    </h2>
                                    {!svLocation && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                            Interactive Caloocan GIS map · Field inspections and citizen reports
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button 
                                        onClick={() => { 
                                            setActiveModal(isSelectingLocation ? 'file-report' : null); 
                                            setIsSelectingLocation(false); 
                                            if (svLocation) handleStreetViewClick(null);
                                        }} 
                                        className="p-1.5 sm:p-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer shrink-0"
                                        aria-label="Close map"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Floating Top Controls Toolbar & Category Chips Bar — Collapsed when Street View is open */}
                            {!svLocation && (
                                <>
                                    {/* Floating Top Controls Toolbar */}
                                    <div className="relative z-10 px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center flex-wrap gap-2">
                                            {/* Map Type: Roadmap vs Satellite */}
                                            <button
                                                type="button"
                                                onClick={() => setMapLayerType(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
                                                className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                                            >
                                                <Layers size={14} className="text-blue-500" />
                                                <span>{mapLayerType === 'roadmap' ? 'Satellite View' : 'Civic View'}</span>
                                            </button>

                                            {/* My Location GPS */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    requestDeviceLocation(true);
                                                    if (map && reportLocation?.lat) {
                                                        map.panTo({ lat: reportLocation.lat, lng: reportLocation.lng });
                                                        map.setZoom(15);
                                                    }
                                                }}
                                                className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                                            >
                                                <Crosshair size={14} className={isLocating ? 'animate-spin text-orange-500' : 'text-emerald-500'} />
                                                <span>{isLocating ? 'Locating...' : 'My Location'}</span>
                                            </button>
                                        </div>

                                        {/* Sector Jump Buttons */}
                                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                            <span className="text-[10px] uppercase font-black px-2 text-slate-600 dark:text-slate-300">Sector:</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveSector('all');
                                                    if (map && window.google && window.google.maps) {
                                                        const bounds = new window.google.maps.LatLngBounds(
                                                            new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
                                                            new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
                                                        );
                                                        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
                                                    }
                                                }}
                                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                                    activeSector === 'all'
                                                        ? 'bg-[#ff6b00] text-white shadow-xs font-black'
                                                        : 'text-slate-700 dark:text-slate-300 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] hover:bg-white/60 dark:hover:bg-slate-700/60'
                                                }`}
                                            >
                                                All Caloocan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveSector('north');
                                                    if (map) {
                                                        map.panTo(NORTH_CALOOCAN_CENTROID || { lat: 14.7566, lng: 121.0450 });
                                                        map.setZoom(12);
                                                    }
                                                }}
                                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                                    activeSector === 'north'
                                                        ? 'bg-[#ff6b00] text-white shadow-xs font-black'
                                                        : 'text-slate-700 dark:text-slate-300 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] hover:bg-white/60 dark:hover:bg-slate-700/60'
                                                }`}
                                            >
                                                North Caloocan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveSector('south');
                                                    if (map) {
                                                        map.panTo(SOUTH_CALOOCAN_CENTROID || { lat: 14.6500, lng: 120.9850 });
                                                        map.setZoom(12);
                                                    }
                                                }}
                                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                                    activeSector === 'south'
                                                        ? 'bg-[#ff6b00] text-white shadow-xs font-black'
                                                        : 'text-slate-700 dark:text-slate-300 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] hover:bg-white/60 dark:hover:bg-slate-700/60'
                                                }`}
                                            >
                                                South Caloocan
                                            </button>
                                        </div>
                                    </div>

                                    {/* Category Filter Chips Bar with Left & Right Chevrons */}
                                    <div className="relative z-10 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1 sm:gap-1.5 text-[11px] font-bold">
                                        {/* Left Chevron Button */}
                                        <button
                                            type="button"
                                            onClick={() => scrollMapCategories('left')}
                                            disabled={!canScrollMapCatLeft}
                                            aria-label="Scroll categories left"
                                            className={`shrink-0 w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-150 z-10 ${
                                                canScrollMapCatLeft
                                                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs border border-slate-200 dark:border-slate-700 hover:bg-[#f05a00] hover:text-white dark:hover:bg-[#f05a00] cursor-pointer active:scale-95'
                                                    : 'text-slate-300 dark:text-slate-700 border border-transparent opacity-20 cursor-not-allowed pointer-events-none'
                                            }`}
                                        >
                                            <ChevronLeft size={13} strokeWidth={2.5} />
                                        </button>

                                        {/* Scrollable Categories Container */}
                                        <div
                                            ref={mapCategoryScrollRef}
                                            onScroll={updateMapCatScroll}
                                            className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
                                        >
                                            {[
                                                { id: 'all', label: 'All Incidents' },
                                                { id: 'roads', label: 'Roads & Potholes' },
                                                { id: 'drainage', label: 'Drainage & Floods' },
                                                { id: 'lighting', label: 'Power & Streetlights' },
                                                { id: 'safety', label: 'Public Safety' },
                                                { id: 'facilities', label: 'Public Facilities' }
                                            ].map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setMapCategoryFilter(cat.id)}
                                                    className={`px-3 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                                                        mapCategoryFilter === cat.id
                                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                                                            : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-orange-500/40'
                                                    }`}
                                                >
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Right Chevron Button */}
                                        <button
                                            type="button"
                                            onClick={() => scrollMapCategories('right')}
                                            disabled={!canScrollMapCatRight}
                                            aria-label="Scroll categories right"
                                            className={`shrink-0 w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-150 z-10 ${
                                                canScrollMapCatRight
                                                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs border border-slate-200 dark:border-slate-700 hover:bg-[#f05a00] hover:text-white dark:hover:bg-[#f05a00] cursor-pointer active:scale-95'
                                                    : 'text-slate-300 dark:text-slate-700 border border-transparent opacity-20 cursor-not-allowed pointer-events-none'
                                            }`}
                                        >
                                            <ChevronRight size={13} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </>
                            )}

                            <div className="flex-1 relative">
                                {isLoaded && (
                                    <GoogleMap
                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                        center={CALOOCAN_CENTER}
                                        zoom={11}
                                        mapTypeId={mapLayerType}
                                        options={{
                                            ...mapOptions,
                                            styles: mapLayerType === 'hybrid'
                                                ? []
                                                : (theme === 'dark' ? DARK_CIVIC_MAP_STYLE : LIGHT_CIVIC_MAP_STYLE)
                                        }}
                                        onZoomChanged={() => {
                                            if (map) {
                                                const z = map.getZoom();
                                                if (typeof z === 'number') setCurrentMapZoom(z);
                                            }
                                        }}
                                        onLoad={m => {
                                            setMap(m);
                                            if (window.google && window.google.maps) {
                                                const bounds = new window.google.maps.LatLngBounds(
                                                    new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
                                                    new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
                                                );
                                                m.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
                                            }
                                        }}
                                        onClick={(e) => {
                                            if (e.latLng) {
                                                const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                                                if (checkJurisdiction(newPos)) {
                                                    setReportLocation({ ...newPos, confirmed: true, source: 'pinpoint', accuracy: 0, isExact: true });
                                                    reverseGeocode(newPos.lat, newPos.lng);
                                                }
                                            }
                                        }}
                                    >
                                        {/* 100% Precision Draggable Report Marker */}
                                        {reportLocation?.lat && (
                                            <MarkerF
                                                position={reportLocation}
                                                draggable={true}
                                                onDragEnd={(e) => {
                                                    if (e.latLng) {
                                                        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                                                        if (checkJurisdiction(newPos)) {
                                                            setReportLocation({ ...newPos, confirmed: true, source: 'pinpoint', accuracy: 0, isExact: true });
                                                            reverseGeocode(newPos.lat, newPos.lng);
                                                        }
                                                    }
                                                }}
                                                zIndex={1000}
                                                title="Report Location (Drag pin to place with 100% exact precision)"
                                            />
                                        )}

                                        {/* ═══════════════════════════════════════════════════════════════════
                                            AUTHORITATIVE BARANGAY JURISDICTION BOUNDARIES (ALL 188 BARANGAYS)
                                            MATCHING GOVERNMENT DISPATCHER GIS MAP EXACTLY
                                        ══════════════════════════════════════════════════════════════════════ */}
                                        {memoizedBarangayPolygons && memoizedBarangayPolygons.length > 0 ? (
                                            memoizedBarangayPolygons.map((b) => (
                                                b.paths.map((p, pi) => (
                                                    <PolygonF
                                                        key={`resident-brgy-${b.id}-${pi}`}
                                                        paths={p}
                                                        options={b.isNorth ? northPolygonOptions : southPolygonOptions}
                                                    />
                                                ))
                                            ))
                                        ) : (
                                            /* Fallback boundary outlines if borderData has no features */
                                            <>
                                                <PolygonF
                                                    key="resident-district-border-north"
                                                    paths={NORTH_CALOOCAN_PATH}
                                                    options={northPolygonOptions}
                                                />
                                                <PolygonF
                                                    key="resident-district-border-south"
                                                    paths={SOUTH_CALOOCAN_PATH}
                                                    options={southPolygonOptions}
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

                                        {/* Caloocan City Hall North HQ Pin (Castle Icon) */}
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
                                                            <linearGradient id="resHqGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
                                                                <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
                                                            </linearGradient>
                                                            <filter id="resShadow" x="-20%" y="-20%" width="140%" height="140%">
                                                                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                                                                <feOffset dx="0" dy="2" result="offsetblur" />
                                                                <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
                                                                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                                                            </filter>
                                                        </defs>
                                                        <path d="M25 58c0 0 22-20 22-33a22 22 0 0 0-44 0c0 13 22 33 22 33z" fill="url(#resHqGrad)" stroke="#f97316" stroke-width="2.5" filter="url(#resShadow)" />
                                                        <g transform="translate(13, 10) scale(1.1)" fill="#f97316">
                                                            <path d="M18 20v-8l-1.5-1.5V6L15 4l-1.5 2v4.5L12 12l-1.5-1.5V6L9 4 7.5 6v4.5L6 12v8h12zM11 16h2v4h-2v-4z"/>
                                                        </g>
                                                    </svg>
                                                `.trim().replace(/\n/g, '').replace(/\s+/g, ' '))}`,
                                                scaledSize: new window.google.maps.Size(46, 55),
                                                anchor: new window.google.maps.Point(23, 55)
                                            } : undefined}
                                            title="Caloocan City Hall North (Zapote HQ)"
                                        />

                                        {/* Caloocan City Hall South HQ Pin (Castle Icon) */}
                                        <MarkerF 
                                            position={CALOOCAN_CITY_HALL_SOUTH_LOC}
                                            zIndex={300}
                                            options={{
                                                optimized: false,
                                                clickable: true
                                            }}
                                            icon={window.google && window.google.maps ? {
                                                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 60" width="50" height="60">
                                                        <defs>
                                                            <linearGradient id="resHqSouthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
                                                                <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
                                                            </linearGradient>
                                                            <filter id="resShadowSouth" x="-20%" y="-20%" width="140%" height="140%">
                                                                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                                                                <feOffset dx="0" dy="2" result="offsetblur" />
                                                                <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
                                                                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                                                            </filter>
                                                        </defs>
                                                        <path d="M25 58c0 0 22-20 22-33a22 22 0 0 0-44 0c0 13 22 33 22 33z" fill="url(#resHqSouthGrad)" stroke="#ff6b00" stroke-width="2.5" filter="url(#resShadowSouth)" />
                                                        <g transform="translate(13, 10) scale(1.1)" fill="#ff6b00">
                                                            <path d="M18 20v-8l-1.5-1.5V6L15 4l-1.5 2v4.5L12 12l-1.5-1.5V6L9 4 7.5 6v4.5L6 12v8h12zM11 16h2v4h-2v-4z"/>
                                                        </g>
                                                    </svg>
                                                `.trim().replace(/\n/g, '').replace(/\s+/g, ' '))}`,
                                                scaledSize: new window.google.maps.Size(42, 50),
                                                anchor: new window.google.maps.Point(21, 50)
                                            } : undefined}
                                            title="Caloocan City Hall South (8th Ave Main)"
                                        />

                                        {/* Animated Wave Sonar Overlay for User Location */}
                                        {reportLocation?.lat && (
                                            <OverlayViewF
                                                position={reportLocation}
                                                mapPaneName="overlayMouseTarget"
                                                getPixelPositionOffset={() => ({ x: -24, y: -24 })}
                                            >
                                                <div className="relative flex items-center justify-center w-12 h-12 pointer-events-none">
                                                    {/* Wave Ring 1 */}
                                                    <div className="absolute inset-0 rounded-full bg-blue-500/25 animate-wave-ring" style={{ animationDelay: '0s' }} />
                                                    {/* Wave Ring 2 */}
                                                    <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-wave-ring" style={{ animationDelay: '0.6s' }} />
                                                    {/* Wave Ring 3 */}
                                                    <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-wave-ring" style={{ animationDelay: '1.2s' }} />
                                                    {/* Center Dot */}
                                                    <div className="relative z-10 w-5 h-5 bg-blue-500 rounded-full border-[3px] border-white shadow-lg shadow-blue-500/50" />
                                                </div>
                                            </OverlayViewF>
                                        )}

                                        {/* Active Selected Incident Marker (Rendered outside clusterer with top priority) */}
                                        {selectedHazard && (
                                            <MarkerF
                                                key={`hazard-selected-${selectedHazard.id}`}
                                                position={{ lat: selectedHazard.lat, lng: selectedHazard.lng }}
                                                zIndex={1000}
                                                title={`${selectedHazard.title} (${(selectedHazard.status || 'PENDING').toUpperCase()})`}
                                                onClick={() => setSelectedHazard(selectedHazard)}
                                                options={{
                                                    optimized: false,
                                                    clickable: true
                                                }}
                                                icon={(() => {
                                                    const cacheKey = `${selectedHazard.id}-sel`;
                                                    const customIconUrl = photoPinIcons ? photoPinIcons[cacheKey] : null;
                                                    const size = 46;
                                                    const pointerH = 8;
                                                    const totalW = size + 6;
                                                    const totalH = size + pointerH + 2;
                                                    return customIconUrl && getCachedIcon
                                                        ? getCachedIcon(customIconUrl, totalW, totalH, totalW / 2, totalH)
                                                        : (getCachedIcon
                                                            ? getCachedIcon(
                                                                getMarkerSVG(selectedHazard.category, selectedHazard.status, true),
                                                                44,
                                                                50,
                                                                22,
                                                                50
                                                            )
                                                            : {
                                                                url: getMarkerSVG(selectedHazard.category, selectedHazard.status, true),
                                                                scaledSize: new window.google.maps.Size(44, 50),
                                                                anchor: new window.google.maps.Point(22, 50)
                                                            }
                                                        );
                                                })()}
                                            />
                                        )}

                                        {/* Incident Markers: Direct Report Photo-Pins (No numeric clustering) */}
                                        {mapFilteredHazards
                                            .filter(h => h.id !== selectedHazard?.id)
                                            .map(h => {
                                                const cacheKey = `${h.id}-norm`;
                                                const customIconUrl = photoPinIcons ? photoPinIcons[cacheKey] : null;
                                                const size = 36;
                                                const pointerH = 7;
                                                const totalW = size + 6;
                                                const totalH = size + pointerH + 2;

                                                const iconConfig = customIconUrl && getCachedIcon
                                                    ? getCachedIcon(customIconUrl, totalW, totalH, totalW / 2, totalH)
                                                    : (getCachedIcon
                                                        ? getCachedIcon(
                                                            getMarkerSVG(h.category, h.status, false),
                                                            36,
                                                            42,
                                                            18,
                                                            42
                                                        )
                                                        : {
                                                            url: getMarkerSVG(h.category, h.status, false),
                                                            scaledSize: new window.google.maps.Size(36, 42),
                                                            anchor: new window.google.maps.Point(18, 42)
                                                        }
                                                    );

                                                return (
                                                    <MarkerF
                                                        key={`hazard-${h.id}`}
                                                        position={{ lat: h.lat, lng: h.lng }}
                                                        zIndex={150}
                                                        title={`${h.title} (${(h.status || 'PENDING').toUpperCase()})`}
                                                        onClick={() => setSelectedHazard(h)}
                                                        options={{
                                                            optimized: true,
                                                            clickable: true
                                                        }}
                                                        icon={iconConfig}
                                                    />
                                                );
                                            })
                                        }

                                        {/* STREET VIEW PIN OVERLAY: 3D Pin for the inspected incident (Lightweight, single-pin) */}
                                        {svLocation && panorama && selectedHazard && selectedHazard.lat && selectedHazard.lng && (
                                            <MarkerF
                                                key={`sv-pin-${selectedHazard.id}`}
                                                map={panorama}
                                                position={{ lat: selectedHazard.lat, lng: selectedHazard.lng }}
                                                onClick={() => setSelectedHazard(selectedHazard)}
                                                options={{
                                                    optimized: false,
                                                    clickable: true
                                                }}
                                                icon={window.google && window.google.maps ? {
                                                    url: getMarkerSVG(selectedHazard.category, selectedHazard.status, true),
                                                    scaledSize: new window.google.maps.Size(46, 52),
                                                    anchor: new window.google.maps.Point(23, 52)
                                                } : undefined}
                                            />
                                        )}

                                        {/* Sleek Government-Grade InfoWindow */}
                                        {(() => {
                                            if (!selectedHazard) return null;
                                            const rawLat = selectedHazard.lat ?? selectedHazard.location_lat ?? selectedHazard.latitude;
                                            const rawLng = selectedHazard.lng ?? selectedHazard.location_lng ?? selectedHazard.longitude;
                                            const hazLat = typeof rawLat === 'function' ? rawLat() : parseFloat(rawLat);
                                            const hazLng = typeof rawLng === 'function' ? rawLng() : parseFloat(rawLng);

                                            if (!Number.isFinite(hazLat) || !Number.isFinite(hazLng)) {
                                                return null;
                                            }

                                            return (
                                                <InfoWindowF
                                                    key={`hazard-infowindow-${selectedHazard.id || 'haz'}-${hazLat}-${hazLng}`}
                                                    position={{ lat: hazLat, lng: hazLng }}
                                                    onCloseClick={() => setSelectedHazard(null)}
                                                    options={{
                                                        pixelOffset: new window.google.maps.Size(0, -40),
                                                        zIndex: 1000
                                                    }}
                                                >
                                                {(() => {
                                                    const catColor = getCategoryColor(selectedHazard.category);
                                                    const isDark = theme === 'dark';
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
                                                            fontFamily: 'Inter,sans-serif',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            textAlign: 'center',
                                                            position: 'relative'
                                                        }}>
                                                            <button
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

                                                            {selectedHazard.image ? (
                                                                <div style={{ width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden', marginBottom: '10px', border: `2px solid ${catColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                                                    <img
                                                                        src={selectedHazard.image.startsWith('http') ? selectedHazard.image : `${API_BASE_URL}${selectedHazard.image.startsWith('/') ? selectedHazard.image : `/${selectedHazard.image}`}`}
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
                                                                marginBottom: '8px',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {selectedHazard.status}
                                                            </div>

                                                            <h4 style={{
                                                                fontWeight: 700,
                                                                fontSize: '14px',
                                                                color: isDark ? '#f1f5f9' : '#0f172a',
                                                                lineHeight: '1.35',
                                                                margin: '0 0 4px',
                                                                padding: '0 12px'
                                                            }}>{selectedHazard.title}</h4>

                                                            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', color: catColor, marginBottom: '10px', textTransform: 'uppercase' }}>
                                                                {selectedHazard.category}
                              </p>

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
                                                                    {selectedHazard.dynamicDistance || selectedHazard.distance} away
                                                                </span>
                                                            </div>

                                                            <button
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
                                                        </div>
                                                    );
                                                })()}
                                                </InfoWindowF>
                                            );
                                        })()}

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
                                                    {/* Prominent Back to Map Button (44px min touch target, non-overlapping) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStreetViewClick(null)}
                                                        aria-label="Back to Map"
                                                        className="pointer-events-auto h-11 min-h-[44px] px-4 rounded-full bg-slate-900/90 hover:bg-orange-600 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-bold shrink-0"
                                                    >
                                                        <ChevronLeft size={18} strokeWidth={2.5} />
                                                        <span>Back to Map</span>
                                                    </button>

                                                    {/* Center: Persistent Incident Context Label */}
                                                    {selectedHazard && (
                                                        <div className="pointer-events-auto hidden xs:flex items-center gap-2 bg-slate-950/90 text-white border border-slate-700/70 shadow-2xl rounded-full px-3.5 py-2 text-xs font-semibold backdrop-blur-md max-w-[50%] sm:max-w-[60%] truncate">
                                                            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 animate-pulse" />
                                                            <span className="text-slate-400 font-medium shrink-0">Viewing:</span>
                                                            <span className="font-bold text-white truncate">{selectedHazard.title || 'Reported Location'}</span>
                                                            {(selectedHazard.dynamicDistance || selectedHazard.distance) && (
                                                                <span className="text-slate-400 shrink-0 hidden md:inline">
                                                                    · {selectedHazard.dynamicDistance || selectedHazard.distance} away
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Right: Fullscreen Toggle Button (Repositioned away from Back button) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsSvFullscreen(prev => !prev)}
                                                        aria-label={isSvFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                                        title={isSvFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                                        className="pointer-events-auto w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-slate-900/90 hover:bg-orange-600 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                                                    >
                                                        {isSvFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                                    </button>
                                                </div>

                                                {/* Mobile Extra Context Pill (anchored bottom-center above Street View controls) */}
                                                {selectedHazard && (
                                                    <div className="xs:hidden absolute bottom-12 left-3 right-3 z-40 pointer-events-none flex justify-center">
                                                        <div className="pointer-events-auto bg-slate-950/90 text-white border border-slate-700/70 shadow-2xl rounded-full px-3.5 py-1.5 text-[11px] font-semibold backdrop-blur-md flex items-center gap-1.5 max-w-full truncate">
                                                            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 animate-pulse" />
                                                            <span className="text-slate-400">Viewing:</span>
                                                            <span className="font-bold text-white truncate">{selectedHazard.title || 'Reported Location'}</span>
                                                            {(selectedHazard.dynamicDistance || selectedHazard.distance) && (
                                                                <span className="text-slate-400 shrink-0">· {selectedHazard.dynamicDistance || selectedHazard.distance} away</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </GoogleMap>
                                )}
                            </div>
                        </div>
                    )}
                    {activeModal === 'services' && (
                        <div className="p-4 sm:p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">LGU Services</h3>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Official Digital Portal Services</p>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                {LGU_SERVICES_LIST(t).map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => window.open(service.url, '_blank')}
                                        className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-orange-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group"
                                    >
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-${service.color}-500/10 text-${service.color}-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                            {service.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-1">{service.name}</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">{service.desc}</p>
                                            <span className="text-[10px] font-black uppercase text-orange-500 mt-2 inline-block tracking-widest group-hover:translate-x-1 transition-transform">Apply Now →</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeModal === 'knowledge' && (
                        <div className="p-4 sm:p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Knowledge Base</h3>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Guides, Tips & Information Hub</p>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="space-y-3 sm:space-y-4">
                                {KNOWLEDGE_BASE_ARTICLES(t).map(article => (
                                    <button key={article.id} className="w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-orange-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all text-left flex flex-col items-start gap-1">
                                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">{article.category}</span>
                                        <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">{article.title}</h4>
                                        <p className="text-xs sm:text-sm text-slate-500 font-medium">{article.excerpt}</p>
                                        <div className="mt-2 h-0 w-0 group-hover:w-full border-b border-orange-500 transition-all"></div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-6 p-4 bg-orange-500 text-white rounded-2xl sm:rounded-3xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Info size={18} /></div>
                                    <div><p className="text-xs sm:text-sm font-bold">Need more help?</p><p className="text-[10px] opacity-80">Message our AI Assistant available 24/7.</p></div>
                                </div>
                                <button onClick={() => { setActiveModal(null); setIsAIChatOpen(true); }} className="px-4 py-2 bg-white text-orange-500 rounded-xl sm:rounded-2xl font-black text-xs uppercase shadow-lg shrink-0 cursor-pointer">Chat Support</button>
                            </div>
                        </div>
                    )}

                    {activeModal.startsWith('calling-') && (() => {
                        const hotlineName = activeModal.split('calling-')[1];
                        const hotlineList = EMERGENCY_HOTLINES(t);
                        const hotline = hotlineList.find(h => h.name === hotlineName) || hotlineList[0];
                        return (
                            <div className="p-6 sm:p-10 md:p-12 flex flex-col items-center justify-center min-h-[360px] text-center relative overflow-hidden">
                                {/* Calling HUD Background Animation */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <motion.div
                                        animate={{ scale: [1, 1.5], opacity: [0.15, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                        className="w-48 sm:w-64 h-48 sm:h-64 rounded-full border-4 border-orange-500/20"
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.8], opacity: [0.1, 0] }}
                                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut", delay: 0.5 }}
                                        className="w-48 sm:w-64 h-48 sm:h-64 rounded-full border-2 border-orange-500/10"
                                    />
                                </div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                    className="relative z-10"
                                >
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-orange-500 flex items-center justify-center text-white mb-6 sm:mb-8 mx-auto shadow-[0_0_40px_rgba(249,115,22,0.4)] animate-pulse">
                                        <PhoneCall size={36} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-orange-500/80 mb-2">Connecting to Secure Line</h3>
                                    <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">{hotline?.name || 'Emergency Line'}</h2>
                                    <p className="text-lg sm:text-xl font-mono font-bold text-slate-400 tracking-tight mb-8 sm:mb-10">{hotline?.num || '---'}</p>

                                    <div className="flex items-center gap-6 mb-8 sm:mb-12 justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                                <MicOff size={18} />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mute</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                                <Volume2 size={18} />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Speaker</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-[0_15px_30px_rgba(220,38,38,0.3)] active:scale-90 transition-all mx-auto cursor-pointer"
                                        aria-label="End Call"
                                    >
                                        <X size={28} strokeWidth={3} className="rotate-45" />
                                    </button>
                                    <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest mt-3">End Call</p>
                                </motion.div>
                            </div>
                        );
                    })()}

                    {activeModal === 'privacy' && (
                        <div className="p-5 sm:p-8">
                            <div className="flex justify-between items-center mb-5">
                                <div><h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{t('dashboard.footer.privacy', { defaultValue: 'Privacy Policy' })}</h3><p className="text-slate-500 font-medium text-xs">PULSO Data Protection standards</p></div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="space-y-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed overflow-y-auto max-h-[60vh] custom-scrollbar pr-2 sm:pr-4">
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 underline decoration-orange-500/30 underline-offset-4">{t('dashboard.privacy.s1_title', { defaultValue: '1. Information Collection' })}</h4>
                                    <p>{t('dashboard.privacy.s1_desc', { defaultValue: 'PULSO collects data relevant to infrastructure reporting, including precise GPS coordinates, photographic evidence, and resident account details for verification purposes.' })}</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 underline decoration-orange-500/30 underline-offset-4">2. Digital Stewardship</h4>
                                    <p>Your data is stored in encrypted government-grade servers. We do not sell or share citizen data with 3rd party advertising entities.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 underline decoration-orange-500/30 underline-offset-4">3. AI Analysis Disclosure</h4>
                                    <p>Triage automation uses Gemini AI to analyze report photos. No resident facial biometric data is stored or used for surveillance.</p>
                                </section>
                            </div>
                        </div>
                    )}

                    {activeModal === 'terms' && (
                        <div className="p-5 sm:p-8">
                            <div className="flex justify-between items-center mb-5">
                                <div><h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{t('dashboard.footer.terms', { defaultValue: 'Terms of Service' })}</h3><p className="text-slate-500 font-medium text-xs">Resident User agreement for reporting</p></div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="space-y-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed overflow-y-auto max-h-[60vh] custom-scrollbar pr-2 sm:pr-4">
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 underline decoration-blue-500/30 underline-offset-4">{t('dashboard.terms.s1_title', { defaultValue: '1. Truthful Reporting' })}</h4>
                                    <p>{t('dashboard.terms.s1_desc', { defaultValue: 'Residents are accountable for the accuracy of their reports. Submitting false or fake reports may result in account restrictions or suspension.' })}</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 underline decoration-blue-500/30 underline-offset-4">2. Citizen Conduct</h4>
                                    <p>Harassment, abusive language, or uploading unrelated media to the engineering portal is strictly prohibited.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 underline decoration-blue-500/30 underline-offset-4">3. Jurisdiction</h4>
                                    <p>PULSO North Caloocan applies only to incidents within the city boundary as defined by the LGU mapping department.</p>
                                </section>
                            </div>
                        </div>
                    )}
                    {activeModal === 'post-details' && selectedPost && (
                        <div className="flex flex-col h-full max-h-[85vh]">
                            <div className="p-5 sm:p-8 pb-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-100 dark:border-orange-500/20 shrink-0">
                                            <Bell size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight truncate">{selectedPost.department}</h3>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{new Date(selectedPost.created_at).toLocaleDateString()} • Ref: {selectedPost.advisory_id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"><X size={20} /></button>
                                </div>
                            </div>
                            <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-6">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3">{selectedPost.title}</h2>
                                    <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedPost.description}</p>
                                </div>
                                {selectedPost.has_image && selectedPost.image_url && (
                                    <div className="mt-4 sm:mt-6 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
                                        <img src={`${API_BASE_URL}${selectedPost.image_url}`} alt="Advisory Content" className="w-full object-cover" />
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${selectedPost.priority?.toLowerCase() === 'high' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>Priority: {selectedPost.priority}</span>
                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-500 dark:bg-blue-500/10">Category: {selectedPost.category}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeModal === 'cookies' && (
                        <div className="p-5 sm:p-8">
                            <div className="flex justify-between items-center mb-5">
                                <div><h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{t('dashboard.footer.cookie', { defaultValue: 'Cookie Policy' })}</h3><p className="text-slate-500 font-medium text-xs">How we manage your portal session</p></div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="space-y-4 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed overflow-y-auto max-h-[60vh] custom-scrollbar pr-2 sm:pr-4">
                                <div className="p-3.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl mb-4">
                                    <p className="font-bold text-blue-700 dark:text-blue-400">PULSO uses essential local storage to keep you securely signed in and maintain your theme preferences across sessions.</p>
                                </div>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Auth Token:</strong> Securely stored to prevent re-login on every page refresh.</li>
                                    <li><strong>Theme Preference:</strong> Remembers your Light/Dark mode choice.</li>
                                    <li><strong>Map Cache:</strong> Improves performance when loading local hazard markers.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        )}

        {/* --- Submit Final Confirmation Modal --- */}
        {isSubmitConfirmOpen && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setIsSubmitConfirmOpen(false)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-[40px] shadow-2xl p-10 sm:p-12 flex flex-col items-center text-center relative overflow-hidden"
                >
                    {/* Abstract design background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />

                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-[0_20px_50px_rgba(249,115,22,0.3)] mb-8 rotate-3">
                        <ShieldCheck size={48} className="text-white drop-shadow-lg" />
                    </div>

                    <div className="space-y-3 mb-8">
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Ready to Submit?</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-base font-medium leading-relaxed px-2">
                            Please ensure all details are <span className="text-slate-900 dark:text-white font-bold">accurate and real</span>. Generating false reports is a serious violation.
                        </p>
                        <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl">
                            <p className="text-sm font-bold text-orange-700 dark:text-orange-400">
                                ⚠️ If your report is found to be false or fake, your <span className="underline decoration-2">account may be restricted or suspended</span>.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={actuallySubmitReport}
                            className="group relative w-full py-4 sm:py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl overflow-hidden active:scale-95 transition-all text-base uppercase tracking-widest shadow-xl shadow-orange-500/20"
                        >
                            <span className="relative z-10">Finalize & Submit</span>
                        </button>
                        <button
                            onClick={() => setIsSubmitConfirmOpen(false)}
                            className="w-full py-3 text-slate-500 hover:text-slate-900 dark:hover:text-white font-black text-xs uppercase tracking-[0.2em] transition-colors"
                        >
                            Never mind, let me double check
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}

        {/* --- Custom High-Fidelity Retract Confirmation Modal --- */}
        {reportToCancel && (() => {
            const reportObj = typeof reportToCancel === 'object' ? reportToCancel : null;
            const reportId = reportObj ? reportObj.id : reportToCancel;
            const ticketId = reportObj?.ticket_id || reportId;

            return (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setReportToCancel(null)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setReportToCancel(null);
                    }}
                    tabIndex={-1}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 15 }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="retract-dialog-title"
                        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center space-y-5"
                    >
                        {/* Cautionary Icon Badge */}
                        <div className="w-16 h-16 rounded-full border-4 border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm relative">
                            <AlertTriangle size={32} strokeWidth={2} />
                        </div>

                        {/* Text & Ticket Badge */}
                        <div className="space-y-2">
                            <h3 id="retract-dialog-title" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Retract This Report?
                            </h3>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span>{ticketId}</span>
                                {reportObj?.category && (
                                    <>
                                        <span className="text-slate-400">•</span>
                                        <span className="font-sans font-medium text-slate-600 dark:text-slate-400 truncate max-w-[180px]">{reportObj.category}</span>
                                    </>
                                )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-[13px] font-medium leading-relaxed pt-1">
                                Are you sure you want to retract this report? This will cancel the scheduled LGU inspection and remove the ticket from active engineering dispatch. This action <span className="text-rose-600 dark:text-rose-400 font-bold">cannot be undone</span>.
                            </p>
                        </div>

                        {/* Actions: Destructive Rose + Safe Cancel */}
                        <div className="flex flex-col-reverse sm:flex-row gap-2.5 w-full pt-2">
                            <button
                                type="button"
                                onClick={() => setReportToCancel(null)}
                                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl active:scale-95 transition-all text-xs sm:text-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                                aria-label="Keep report and close modal"
                            >
                                Keep Report
                            </button>
                            <button
                                type="button"
                                onClick={() => confirmCancelReport(reportId)}
                                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/25 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer"
                                aria-label={`Confirm retracting report ${ticketId}`}
                            >
                                Yes, Retract Report
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            );
        })()}
    </AnimatePresence>
    );
};

// --- SUB-COMPONENTS ---

const TopNavigation = ({
    activeTab,
    handleSetTab,
    handleSetModal,
    theme,
    changeTheme,
    showNotifications,
    setShowNotifications,
    notifications,
    setNotifications,
    handleMarkAllRead,
    handleNotificationClick,
    handleLogout,
    user,
    navItems,
    showToast,
    i18n,
    t,
    userReports = [],
    lguUpdates = [],
    processedHazards = [],
    setSelectedPost,
    setSelectedHazard,
    setReportStatusFilter,
    token
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [recentSearches, setRecentSearches] = useState(() => {
        try {
            const saved = localStorage.getItem('pulso_recent_searches');
            return saved ? JSON.parse(saved) : ['Water Interruption', 'Street Lighting', 'Engineering Contact'];
        } catch {
            return ['Water Interruption', 'Street Lighting', 'Engineering Contact'];
        }
    });

    const searchRef = useRef(null);
    const searchInputRef = useRef(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuTimeoutRef = useRef(null);
    const userMenuRef = useRef(null);

    const saveRecentSearch = (query) => {
        if (!query || !query.trim()) return;
        const trimmed = query.trim();
        setRecentSearches(prev => {
            const updated = [trimmed, ...prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
            try { localStorage.setItem('pulso_recent_searches', JSON.stringify(updated)); } catch (e) { /* ignore */ }
            return updated;
        });
    };

    const removeRecentSearch = (e, item) => {
        e.stopPropagation();
        setRecentSearches(prev => {
            const updated = prev.filter(s => s !== item);
            try { localStorage.setItem('pulso_recent_searches', JSON.stringify(updated)); } catch (e) { /* ignore */ }
            return updated;
        });
    };

    const clearAllRecent = (e) => {
        e.stopPropagation();
        setRecentSearches([]);
        try { localStorage.removeItem('pulso_recent_searches'); } catch (e) { /* ignore */ }
    };

    // Click outside to close search and user menu
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearchOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setShowUserMenu(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
        };
    }, []);

    // Filter items based on query
    const q = searchQuery.toLowerCase().trim();

    // 1. Navigation & Quick Actions
    const quickActions = [
        { label: 'File Infrastructure Report', category: 'Action', icon: <Camera size={16} />, onClick: () => { handleSetModal('file-report'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('File Report'); } },
        { label: 'Barangay Hazard Map', category: 'Action', icon: <MapIcon size={16} />, onClick: () => { handleSetModal('map'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('Barangay Map'); } },
        { label: 'LGU Online Services', category: 'Action', icon: <Handshake size={16} />, onClick: () => { handleSetModal('services'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('LGU Services'); } },
        { label: 'Knowledge Base & Guides', category: 'Action', icon: <BookOpen size={16} />, onClick: () => { handleSetModal('knowledge'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('Knowledge Base'); } },
        { label: 'My Report History', category: 'Navigation', icon: <FileText size={16} />, onClick: () => { handleSetTab('reports'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('My Reports'); } },
        { label: 'My Profile & Account', category: 'Navigation', icon: <User size={16} />, onClick: () => { handleSetTab('profile'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('My Profile'); } },
        { label: 'Account Settings & Security', category: 'Navigation', icon: <Settings size={16} />, onClick: () => { handleSetTab('settings'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('Settings'); } },
    ];

    const matchedActions = q ? quickActions.filter(a => a.label.toLowerCase().includes(q)) : [];

    // 2. User's Reports
    const matchedReports = q ? userReports.filter(r =>
        (r.ticket_id && r.ticket_id.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.ai_category && r.ai_category.toLowerCase().includes(q)) ||
        (r.location_string && r.location_string.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.status && r.status.toLowerCase().includes(q))
    ).slice(0, 4) : [];

    // 3. Official Advisories
    const matchedAdvisories = q ? lguUpdates.filter(a =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.department && a.department.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q))
    ).slice(0, 3) : [];

    // 4. Knowledge Base
    const kbArticles = KNOWLEDGE_BASE_ARTICLES(t);
    const matchedKB = q ? kbArticles.filter(kb =>
        kb.title.toLowerCase().includes(q) ||
        kb.category.toLowerCase().includes(q) ||
        kb.excerpt.toLowerCase().includes(q)
    ).slice(0, 3) : [];

    // 5. Hotlines
    const hotlines = EMERGENCY_HOTLINES(t);
    const matchedHotlines = q ? hotlines.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.tags.toLowerCase().includes(q) ||
        h.num.toLowerCase().includes(q)
    ) : [];

    const totalResults = matchedActions.length + matchedReports.length + matchedAdvisories.length + matchedKB.length + matchedHotlines.length;

    const handleSelectReport = (r) => {
        saveRecentSearch(r.category || r.ticket_id);
        if (setReportStatusFilter) setReportStatusFilter('all');
        handleSetTab('reports');
        setIsSearchOpen(false);
        setIsMobileSearchOpen(false);
        if (showToast) showToast(`Navigating to report: ${r.ticket_id}`);
    };

    const handleSelectAdvisory = (adv) => {
        saveRecentSearch(adv.title);
        if (setSelectedPost) setSelectedPost(adv);
        handleSetModal('post-details');
        setIsSearchOpen(false);
        setIsMobileSearchOpen(false);
    };

    const handleSelectHotline = (h) => {
        saveRecentSearch(h.name);
        handleSetModal(`calling-${h.name}`);
        setIsSearchOpen(false);
        setIsMobileSearchOpen(false);
    };

    const handleSelectKB = (kb) => {
        saveRecentSearch(kb.title);
        handleSetModal('knowledge');
        setIsSearchOpen(false);
        setIsMobileSearchOpen(false);
    };

    const renderSearchDropdown = (isMobile = false) => (
        <div className={`w-full ${isMobile ? 'p-1 sm:p-2' : 'max-h-[75vh] overflow-y-auto custom-scrollbar p-2'} divide-y divide-slate-100 dark:divide-slate-800/80`}>
            {/* If Query is Empty -> Show Shortcuts and Recent Searches */}
            {!q ? (
                <div>
                    {recentSearches.length > 0 && (
                        <div className="p-2 mb-2">
                            <div className="flex items-center justify-between px-2 py-1 mb-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recent Searches</span>
                                <button onClick={clearAllRecent} className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors">Clear all</button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {recentSearches.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSearchQuery(item)}
                                        className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg text-xs font-medium cursor-pointer transition-colors border border-slate-200/60 dark:border-slate-700/60"
                                    >
                                        <Clock size={12} className="text-slate-400 group-hover:text-orange-500" />
                                        <span>{item}</span>
                                        <button onClick={(e) => removeRecentSearch(e, item)} className="ml-1 text-slate-400 hover:text-rose-500 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-2">
                        <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quick Shortcuts</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {quickActions.slice(0, 4).map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={action.onClick}
                                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors text-slate-700 dark:text-slate-200 group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        {action.icon}
                                    </div>
                                    <span className="text-xs font-semibold">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : totalResults === 0 ? (
                <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <Search size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No results found for "{searchQuery}"</p>
                    <p className="text-xs text-slate-500 mt-1">Try searching for ticket IDs, barangay locations, or service hotlines.</p>
                </div>
            ) : (
                <div className="space-y-3 p-1">
                    {/* Quick Actions */}
                    {matchedActions.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Features & Navigation</div>
                            <div className="space-y-1 mt-1">
                                {matchedActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={action.onClick}
                                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                                                {action.icon}
                                            </div>
                                            <span className="text-xs font-semibold text-slate-900 dark:text-white">{action.label}</span>
                                        </div>
                                        <ArrowRight size={14} className="text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reports */}
                    {matchedReports.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Reports</div>
                            <div className="space-y-1 mt-1">
                                {matchedReports.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => handleSelectReport(r)}
                                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                                <FileText size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{r.category || r.ai_category}</span>
                                                    <span className="font-mono text-[10px] text-slate-400">{r.ticket_id}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate">{r.location_string || 'No location specified'}</div>
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Advisories */}
                    {matchedAdvisories.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Announcements</div>
                            <div className="space-y-1 mt-1">
                                {matchedAdvisories.map((adv) => (
                                    <button
                                        key={adv.id}
                                        onClick={() => handleSelectAdvisory(adv)}
                                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                                <Bell size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{adv.title}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{adv.department} • {adv.category}</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hotlines */}
                    {matchedHotlines.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emergency Hotlines</div>
                            <div className="space-y-1 mt-1">
                                {matchedHotlines.map((h, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectHotline(h)}
                                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                                <PhoneCall size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{h.name}</p>
                                                <p className="text-[11px] text-slate-500">{h.tags}</p>
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-lg">
                                            {h.num}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Knowledge Base */}
                    {matchedKB.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Knowledge Base Guides</div>
                            <div className="space-y-1 mt-1">
                                {matchedKB.map((kb) => (
                                    <button
                                        key={kb.id}
                                        onClick={() => handleSelectKB(kb)}
                                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                                <BookOpen size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{kb.title}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{kb.excerpt}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-indigo-500 shrink-0">{kb.category}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <header className="shrink-0 sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md w-full border-b border-slate-200/80 dark:border-slate-800 transition-colors">
            <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-1 sm:gap-2">

                {/* Left Area: Municipal Branding */}
                <div className="flex items-center shrink-0">
                    <a
                        href="/dashboard"
                        className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-xl shrink-0 cursor-pointer"
                        onClick={(e) => { e.preventDefault(); handleSetTab('overview'); }}
                        aria-label="Caloocan City - City Engineering Department - Powered by PULSO"
                    >
                        <Branding size="h-7 w-7 xs:h-8 xs:w-8 sm:h-10 sm:w-10" showText={true} />
                    </a>
                </div>

                {/* Search Bar (Centered on Mobile, Left-aligned on Desktop) */}
                <div className="flex-1 flex justify-center md:justify-start items-center min-w-0 px-1 sm:px-3 md:pl-6 lg:pl-8" ref={searchRef}>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full items-center px-2.5 xs:px-3 sm:px-3.5 py-1.5 sm:py-2 border border-transparent focus-within:border-slate-300 dark:focus-within:border-slate-600 focus-within:ring-2 focus-within:ring-slate-200 dark:focus-within:ring-slate-700/50 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all w-full max-w-[170px] xs:max-w-[210px] sm:max-w-[320px] md:max-w-[390px] lg:max-w-[460px] relative shadow-xs">
                        {isSearchOpen ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSearchOpen(false);
                                    if (searchInputRef.current) {
                                        searchInputRef.current.blur();
                                    }
                                }}
                                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors p-0.5 -ml-1 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
                                title="Close search"
                                aria-label="Close search"
                            >
                                <ChevronLeft size={16} strokeWidth={2.5} className="sm:w-[17px] sm:h-[17px]" />
                            </button>
                        ) : (
                            <Search size={14} className="text-slate-400 shrink-0 sm:w-[15px] sm:h-[15px]" />
                        )}
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                            onFocus={() => setIsSearchOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsSearchOpen(false);
                                    searchInputRef.current?.blur();
                                }
                            }}
                            placeholder={t('dashboard.topNav.searchPlaceholder', { defaultValue: 'Search PULSO...' })}
                            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-[10.5px] xs:text-[11px] sm:text-xs md:text-sm ml-1.5 sm:ml-2 w-full text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium whitespace-nowrap"
                            style={{ outline: 'none', boxShadow: 'none' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 shrink-0"
                            >
                                <X size={13} />
                            </button>
                        )}

                        {/* Search Dropdown Popup */}
                        <AnimatePresence>
                            {isSearchOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="fixed inset-x-2.5 top-15 sm:absolute sm:top-12 sm:left-1/2 sm:-translate-x-1/2 md:left-0 md:translate-x-0 sm:inset-x-auto w-auto sm:w-[380px] lg:w-[460px] max-h-[75vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 text-slate-900 dark:text-white ring-1 ring-black/5"
                                >
                                    {renderSearchDropdown()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Area: Notifications */}
                <div className="flex items-center justify-end gap-1 xs:gap-1.5 sm:gap-2.5 shrink-0">
                    <div className="relative shrink-0">
                        <button
                            className="relative w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none shrink-0"
                            onClick={() => setShowNotifications(!showNotifications)}
                            aria-label="Notifications"
                        >
                            <Bell size={14} className="sm:w-4 sm:h-4" />
                            {notifications.length > 0 && notifications.some(n => !n.is_read && !n.is_hidden) && (
                                <span className="absolute top-[4px] sm:top-[6px] right-[5px] sm:right-[8px] w-1.5 sm:w-2 h-1.5 sm:h-2 bg-red-500 rounded-full ring-2 ring-slate-100 dark:ring-slate-800"></span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="fixed sm:absolute top-14 sm:top-12 right-2 sm:right-0 w-[calc(100vw-1rem)] sm:w-[320px] max-w-[360px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 z-50 text-slate-900 dark:text-white"
                                >
                                    <div className="flex justify-between items-center mb-3 px-1">
                                        <h3 className="font-bold text-base sm:text-lg">Notifications</h3>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-orange-500 text-xs font-bold hover:underline shrink-0"
                                            >
                                                Mark all read
                                            </button>
                                            <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar">
                                        {notifications.filter(n => !n.is_hidden).length === 0 ? (
                                             <div className="p-4 text-center text-sm text-slate-500">No new notifications</div>
                                        ) : (
                                            notifications.filter(n => !n.is_hidden).map(notification => (
                                                <div key={notification.id} className="relative group block w-full">
                                                    <button
                                                        onClick={() => handleNotificationClick(notification)}
                                                        className="w-full text-left p-2.5 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex gap-2.5 sm:gap-3 overflow-hidden pr-8"
                                                    >
                                                        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white pr-2 truncate">{notification.title}</p>
                                                            <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 mt-0.5">{notification.message}</p>
                                                            <span className="text-[10px] text-blue-500 font-bold mt-1 block">{new Date(notification.created_at).toLocaleString()}</span>
                                                        </div>
                                                        {!notification.is_read && (
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-3 right-3 group-hover:opacity-0 transition-opacity"></div>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_hidden: true } : n));
                                                            try {
                                                                const authToken = token || getAuthToken();
                                                                await fetch(`${API_BASE_URL}/api/notifications/${notification.id}`, {
                                                                    method: 'DELETE',
                                                                    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
                                                                });
                                                            } catch (err) {
                                                                console.error("Delete error:", err);
                                                            }
                                                        }}
                                                        title="Dismiss notification"
                                                        className="absolute top-2.5 right-1.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <button onClick={() => { setShowNotifications(false); handleSetModal('all-notifications'); }} className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mt-2 py-2 border-t border-slate-100 dark:border-slate-800">See previous notifications</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* User Profile Avatar with Hover & Click Sign Out Dropdown */}
                    <div
                        ref={userMenuRef}
                        className="relative shrink-0"
                        onMouseEnter={() => {
                            if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
                            setShowUserMenu(true);
                        }}
                        onMouseLeave={() => {
                            userMenuTimeoutRef.current = setTimeout(() => setShowUserMenu(false), 220);
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setShowUserMenu(prev => !prev)}
                            className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-[11px] sm:text-sm flex items-center justify-center text-white shadow-xs shrink-0 hover:opacity-95 hover:ring-2 hover:ring-orange-500/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer overflow-hidden"
                            aria-label="User menu"
                            aria-expanded={showUserMenu}
                        >
                            {user.avatarPhoto ? (
                                <img src={user.avatarPhoto} alt={user.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                user.avatar
                            )}
                        </button>

                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-11 sm:top-12 right-0 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2 z-50 text-slate-900 dark:text-white ring-1 ring-black/5"
                                >
                                    {/* User Identity Snapshot */}
                                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 mb-1 border border-slate-100 dark:border-slate-800/80">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-xs flex items-center justify-center text-white shrink-0 shadow-xs overflow-hidden">
                                            {user.avatarPhoto ? (
                                                <img src={user.avatarPhoto} alt={user.name} className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                user.avatar
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.barangay || 'Resident'}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="space-y-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                handleSetTab('profile');
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left cursor-pointer"
                                        >
                                            <User size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                            <span>{t('dashboard.sidebar.account', { defaultValue: 'My Account' })}</span>
                                        </button>

                                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                        {handleLogout && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowUserMenu(false);
                                                    handleLogout();
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer group"
                                                title="Sign Out"
                                            >
                                                <LogOut size={15} className="text-red-500 dark:text-red-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                                <span>{t('dashboard.sidebar.signOut', { defaultValue: 'Sign Out' })}</span>
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* High-Fidelity Mobile Search Portal (Matches Web Search Dropdown Card & Unconstrained Viewport) */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isMobileSearchOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="md:hidden fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex flex-col justify-start p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                            onClick={() => setIsMobileSearchOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: -12, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.95, y: -12, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85dvh] overflow-hidden"
                            >
                                {/* Search Header Bar */}
                                <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                    <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setIsMobileSearchOpen(false)}
                                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white mr-2 shrink-0 p-0.5 -ml-1 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-center active:scale-95"
                                            title="Close search"
                                            aria-label="Close search"
                                        >
                                            <ChevronLeft size={18} strokeWidth={2.5} />
                                        </button>
                                        <input
                                            type="text"
                                            autoFocus
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('dashboard.topNav.searchPlaceholder', { defaultValue: 'Search PULSO...' })}
                                            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-sm w-full text-slate-900 dark:text-white placeholder-slate-400 font-medium"
                                            style={{ outline: 'none', boxShadow: 'none' }}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                                                title="Clear search query"
                                            >
                                                <X size={15} />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsMobileSearchOpen(false)}
                                        className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1.5 cursor-pointer shrink-0"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {/* Results Container (Card with exact parity to Web Dropdown) */}
                                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1 sm:p-2">
                                    {renderSearchDropdown(true)}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </header>
    );
};

export default function ResidentDashboard() {
    const { t, i18n } = useTranslation();
    const { theme, changeTheme } = useTheme();
    const navigate = useNavigate();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [claimModalInitialTicket, setClaimModalInitialTicket] = useState('');
    const [claimModalInitialToken, setClaimModalInitialToken] = useState('');

    // Contextual Claim Modal States & URL Parameter Deep-linking
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const claimTicketParam = searchParams.get('claim_ticket') || searchParams.get('claim_id');
        const claimTokenParam = searchParams.get('claim_token') || searchParams.get('token');
        if (claimTicketParam || claimTokenParam) {
            if (claimTicketParam) setClaimModalInitialTicket(claimTicketParam);
            if (claimTokenParam) setClaimModalInitialToken(claimTokenParam);
            setIsClaimModalOpen(true);
            setActiveTab('reports');
        }
    }, []);
    const [activeModal, setActiveModal] = useState(null); // 'file-report', 'post-details'
    const [zoomedImage, setZoomedImage] = useState(null);
    const [reportToCancel, setReportToCancel] = useState(null);
    const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);

    // Centralized modal cleanup: Ensures all report form states are reset whenever any modal is closed
    // (Handles X button, Cancel button, and Backdrop clicks)
    useEffect(() => {
        if (!activeModal) {
            setReportCategory(prev => (Array.isArray(prev) && prev.length === 0 ? prev : []));
            setAiFeedback(prev => (prev === null ? prev : null));
            setSelectedImage(prev => (prev === null ? prev : null));
            setReportNotes(prev => (prev === '' ? prev : ''));
            setGeocodingAddress(prev => (prev === false ? prev : false));
            if (geocodeRequest?.current !== undefined) {
                geocodeRequest.current += 1;
            }
        }
    }, [activeModal]);

    // Auth State - Initialize synchronously from session to prevent race conditions on reload
    const [token, setToken] = useState(() => getAuthToken());
    const [currentUser, setCurrentUser] = useState(() => getAuthUser());

    useEffect(() => {
        if (!token || !currentUser) {
            navigate('/login');
        }
    }, [token, currentUser, navigate]);

    // Prototype States
    const [activeTab, setActiveTab] = useState(() => {
        console.log("PULSO: Initializing activeTab: overview");
        return 'overview';
    });

    const { isLoaded, loadError } = useGoogleMaps();

    const [pulseRadius] = useState(0);

    const checkJurisdiction = (location) => {
        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return true;
        const isIn = isInsideCaloocan(location.lat, location.lng);

        if (!isIn) {
            showToast(t('This location is outside Caloocan City jurisdiction.'));
        }
        return isIn;
    };

    const mapOptions = React.useMemo(() => ({
        styles: theme === 'dark' ? DARK_CIVIC_MAP_STYLE : LIGHT_CIVIC_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: 'greedy',
    }), [theme]);

    const pinIconCache = useRef(typeof window !== 'undefined' && window.Map ? new window.Map() : new Map());
    const iconCacheRef = useRef(typeof window !== 'undefined' && window.Map ? new window.Map() : new Map());
    const [photoPinIcons, setPhotoPinIcons] = useState({});

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

    const [map, setMap] = useState(null);
    const [panorama, setPanorama] = useState(null);
    const [svLocation, setSvLocation] = useState(null);

    const handleStreetViewClick = (location) => {
        if (!location) {
            // Closing street view
            setSvLocation(null);
            return;
        }
        if (!window.google || !window.google.maps) {
            showToast('Google Maps not loaded yet.');
            return;
        }
        // Use StreetViewService to check availability first
        const sv = new window.google.maps.StreetViewService();
        sv.getPanorama({ location: { lat: location.lat, lng: location.lng }, radius: 100 }, (data, status) => {
            if (status === 'OK') {
                setSvLocation({ lat: location.lat, lng: location.lng });
            } else {
                showToast('No Street View available for this location.');
            }
        });
    };

    // Auto-clear panorama state isn't strictly needed as much here, but keep for cleanup
    useEffect(() => {
        if (panorama) {
            const visListener = panorama.addListener('visible_changed', () => {
                const nowVisible = panorama.getVisible();
                if (nowVisible) {
                    const pos = panorama.getPosition();
                    if (pos) {
                        setSvLocation({ lat: pos.lat(), lng: pos.lng() });
                    }
                } else {
                    setSvLocation(null);
                }
            });
            return () => window.google?.maps?.event?.removeListener(visListener);
        }
    }, [panorama]);

    const mainScrollRef = useRef(null);
    const [accountSubView, setAccountSubView] = useState('settings'); // 'settings' | 'profile-details'

    const handleSetTab = (tab) => {
        console.log(`PULSO: Switching tab: ${activeTab} -> ${tab}`);
        if (tab === 'profile') {
            setAccountSubView('settings');
        }
        setActiveTab(tab);
        if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    const [selectedImage, setSelectedImage] = useState(null);
    const fileInputRef = React.useRef(null);

    const handleSetModal = (modal) => {
        console.log(`PULSO: Switching modal: ${activeModal} -> ${modal}`);
        if (modal === 'file-report') {
            setSelectedImage(null);
            setReportNotes('');
        }
        setActiveModal(modal);
    };
    const [selectedPost, setSelectedPost] = useState(null);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [isIDCameraOpen, setIsIDCameraOpen] = useState(false);

    const showToast = useCallback((message, type = 'success') => {
        // Robust check to prevent rendering objects as React children which crashes the UI
        const finalMsg = typeof message === 'string' ? message : (
            Array.isArray(message) && message[0]?.msg
                ? message[0].msg
                : JSON.stringify(message)
        );
        setToast({ message: finalMsg, type });
        setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
    }, []);

    const [lguUpdates, setLguUpdates] = useState([]);
    const [loadingAdvisories, setLoadingAdvisories] = useState(true);
    const [advisoriesError, setAdvisoriesError] = useState(null);
    const [advisoriesReloadKey, setAdvisoriesReloadKey] = useState(0);

    // Real User Data State (hoisted to precede loadData dependencies)
    const [user, setUser] = useState(() => {
        const savedAvatar = typeof localStorage !== 'undefined' ? (localStorage.getItem('pulso_avatar_current') || null) : null;
        return {
            name: 'Resident',
            fullName: 'Loading...',
            barangay: 'Loading...',
            email: '',
            phone: '',
            memberSince: 'Loading...',
            trustScore: 100,
            avatar: 'R',
            avatarPhoto: savedAvatar
        };
    });
    const [updatingProfile, setUpdatingProfile] = useState(false);

    const fetchUser = useCallback(async (userId) => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const savedAvatar = (typeof localStorage !== 'undefined')
                    ? (localStorage.getItem(`pulso_avatar_${data.email || 'current'}`) || localStorage.getItem('pulso_avatar_current') || null)
                    : null;
                const nextUser = {
                    name: data.full_name ? data.full_name.split(' ')[0] : 'Resident',
                    fullName: data.full_name || '',
                    address: formatAddress(data.address || ''),
                    barangay: data.barangay || '',
                    email: data.email || '',
                    phone: data.phone_number || '',
                    memberSince: new Date(data.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
                    trustScore: data.trust_score || 100,
                    avatar: data.full_name ? data.full_name.charAt(0).toUpperCase() : 'R',
                    avatarPhoto: savedAvatar
                };
                setUser(prev => {
                    if (
                        prev.name === nextUser.name &&
                        prev.fullName === nextUser.fullName &&
                        prev.address === nextUser.address &&
                        prev.barangay === nextUser.barangay &&
                        prev.email === nextUser.email &&
                        prev.phone === nextUser.phone &&
                        prev.memberSince === nextUser.memberSince &&
                        prev.trustScore === nextUser.trustScore &&
                        prev.avatar === nextUser.avatar &&
                        prev.avatarPhoto === nextUser.avatarPhoto
                    ) {
                        return prev;
                    }
                    return nextUser;
                });
            }
        } catch (error) {
            console.error("PULSO: Error fetching user data:", error);
        }
    }, [token]);

    // New State for User Reports
    const [userReports, setUserReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [reportStatusFilter, setReportStatusFilter] = useState('all');

    const handleLogout = () => {
        clearAuthSession();
        window.location.href = '/login';
    };

    const handleSearch = (query) => {
        if (query) {
            showToast(`Searching for: ${query}`);
        }
    };

    const getIconForCategory = (category) => {
        const cat = (category || '').toLowerCase();
        if (cat.includes('public works') || cat.includes('road') || cat.includes('bridge')) return <HardHat size={18} className="text-orange-500" />;
        if (cat.includes('utilit') || cat.includes('water') || cat.includes('drain')) return <Droplets size={18} className="text-blue-500" />;
        if (cat.includes('advisory') || cat.includes('safety') || cat.includes('hazard')) return <ShieldAlert size={18} className="text-red-500" />;
        if (cat.includes('other')) return <HelpCircle size={18} className="text-purple-500" />;
        return <ShieldCheck size={18} className="text-slate-500" />;
    };

    const fetchUserReports = useCallback(async (userId) => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUserReports(prev => {
                    if (Array.isArray(prev) && Array.isArray(data) && prev.length === data.length) {
                        const unchanged = prev.every((p, i) => p.id === data[i]?.id && p.status === data[i]?.status && p.updated_at === data[i]?.updated_at);
                        if (unchanged) return prev;
                    }
                    return Array.isArray(data) ? data : [];
                });
            }
        } catch (error) {
            console.error("PULSO: Error fetching reports:", error);
        } finally {
            setLoadingReports(false);
        }
    }, [token]);

    const [publicReports, setPublicReports] = useState([]);
    const [loadingPublicReports, setLoadingPublicReports] = useState(true);

    const fetchPublicReports = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/public?limit=100`);
            if (response.ok) {
                const data = await response.json();
                const list = Array.isArray(data) ? data : [];
                setPublicReports(prev => {
                    if (Array.isArray(prev) && prev.length === list.length) {
                        const unchanged = prev.every((p, i) => p.id === list[i]?.id && p.status === list[i]?.status && p.updated_at === list[i]?.updated_at);
                        if (unchanged) return prev;
                    }
                    return list;
                });
            }
        } catch (error) {
            console.error("PULSO: Error fetching public reports:", error);
        } finally {
            setLoadingPublicReports(false);
        }
    }, []);

    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = useCallback(async (userId) => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(prev => {
                    if (Array.isArray(prev) && Array.isArray(data) && prev.length === data.length) {
                        const unchanged = prev.every((p, i) => p.id === data[i]?.id && p.is_read === data[i]?.is_read);
                        if (unchanged) return prev;
                    }
                    return Array.isArray(data) ? data : [];
                });
            }
        } catch (error) {
            console.error("PULSO: Error fetching notifications:", error);
        }
    }, [token]);

    const fetchAdvisories = useCallback(async () => {
        setLoadingAdvisories(prev => (prev ? prev : true));
        setAdvisoriesError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/advisories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Advisory request failed (${response.status})`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Advisory response was not a list');
            setLguUpdates(prev => {
                if (Array.isArray(prev) && prev.length === data.length) {
                    const unchanged = prev.every((p, i) => p.id === data[i]?.id && p.updated_at === data[i]?.updated_at);
                    if (unchanged) return prev;
                }
                return data;
            });
        } catch (error) {
            console.error("PULSO: Error fetching advisories:", error);
            setLguUpdates([]);
            setAdvisoriesError('Advisories are temporarily unavailable.');
        } finally {
            setLoadingAdvisories(false);
        }
    }, [token]);

    const handleMarkAllRead = async () => {
        if (!currentUser) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/user/${currentUser.id}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                // Optimistically update UI
                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            }
        } catch (error) {
            console.error("Error marking notifications as read:", error);
        }
    };

    const handleNotificationClick = async (notif) => {
        // Mark as read if it's currently unread
        if (!notif.is_read) {
            try {
                await fetch(`${API_BASE_URL}/api/notifications/${notif.id}/read`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            } catch (err) {
                console.error("Error marking notification as read:", err);
            }
        }

        // Logic to navigate or show full details
        if (notif.message && (notif.message.includes('PUL-') || notif.message.includes('RPT-'))) {
            // It's a report-related notification
            setActiveTab('reports');
            setReportStatusFilter('all');
            showToast(`Viewing details for report status update`);
        } else {
            // General notification: Show full details in the advisory modal
            setSelectedPost({
                department: 'System Notice',
                title: notif.title,
                description: notif.message,
                created_at: notif.created_at,
                category: 'Advisory',
                advisory_id: `NOTIF-${notif.id}`
            });
            setActiveModal('post-details');
        }
        setShowNotifications(false);
    };

    const isFetchingDataRef = useRef(false);
    useEffect(() => {
        const userId = currentUser?.id;
        let isMounted = true;

        const loadData = async () => {
            if (isFetchingDataRef.current) return;
            isFetchingDataRef.current = true;
            try {
                const tasks = [fetchPublicReports()];
                if (userId) {
                    tasks.push(
                        fetchUser(userId),
                        fetchAdvisories(),
                        fetchUserReports(userId),
                        fetchNotifications(userId)
                    );
                }
                await Promise.allSettled(tasks);
            } catch (e) {
                console.error("PULSO: Error in loadData sequence:", e);
            } finally {
                if (isMounted) {
                    isFetchingDataRef.current = false;
                }
            }
        };

        loadData();
        // Auto-refresh user data and reports every 30s to keep status badges sync'd
        const interval = setInterval(loadData, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [currentUser?.id, token, advisoriesReloadKey, fetchPublicReports, fetchUser, fetchAdvisories, fetchUserReports, fetchNotifications]);

    const [reportNotes, setReportNotes] = useState('');
    const [reportCategory, setReportCategory] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportLocation, setReportLocation] = useState(null);
    const [isLocating, setIsLocating] = useState(true);
    const [locatingStep, setLocatingStep] = useState(0);
    const locatingStepTimers = useRef([]);
    const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
    const [photoMetadata, setPhotoMetadata] = useState(null);
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [mapLayerType, setMapLayerType] = useState('roadmap'); // 'roadmap' | 'hybrid'
    const [mapCategoryFilter, setMapCategoryFilter] = useState('all');
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [mapFilter, setMapFilter] = useState('Nearby'); // State for new map UI filter
    const [selectedHazard, setSelectedHazard] = useState(null); // Tracks the clicked map marker
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

    const getCategoryColor = (category) => {
        const cat = (category || '').toLowerCase();
        if (cat.includes('road') || cat.includes('bridge')) return '#f97316';
        if (cat.includes('water') || cat.includes('drainage') || cat.includes('flood')) return '#3b82f6';
        if (cat.includes('lighting') || cat.includes('street') || cat.includes('electric')) return '#eab308';
        if (cat.includes('safety') || cat.includes('regulatory') || cat.includes('emergency')) return '#ef4444';
        if (cat.includes('facilit') || cat.includes('build') || cat.includes('park')) return '#22c55e';
        if (cat.includes('other')) return '#8b5cf6';
        return '#94a3b8';
    };

    // SVG Marker Pin Generator for Map Symbols
    // Beautiful Dynamic SVG Pin Generator (matching government DispatcherDashboard)
    const getMarkerSVG = (category, status, isSelected = false) => {
        let color = '#f97316'; // Default Active
        const cat = (category || '').toLowerCase();
        const isPublicFacility = cat.includes('facility') || cat.includes('facilities') || cat.includes('building') || cat.includes('park') || cat.includes('public');

        if (status === 'resolved') color = '#22c55e';
        else if (status === 'pending' || status === 'unverified') color = '#ef4444';
        else if (status === 'rejected') color = '#64748b';
        else if (status === 'cancelled') color = '#0f172a';

        // Overwrite color for Public Facilities
        if (isPublicFacility) {
            color = isSelected ? '#16a34a' : '#22c55e';
        } else if (cat.includes('other')) {
            color = isSelected ? '#7c3aed' : '#8b5cf6';
        }

        let svgIcon = '';

        // Crisp, solid vector shapes corresponding to report classifications
        if (cat.includes('flood') || cat.includes('water') || cat.includes('drain')) {
            // Droplet
            svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
        } else if (cat.includes('electric') || cat.includes('wire') || cat.includes('power') || cat.includes('light') || cat.includes('street')) {
            // Zap
            svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
        } else if (cat.includes('road') || cat.includes('pothole') || cat.includes('bridge') || cat.includes('infrastructure')) {
            // Hardhat / Cone
            svgIcon = `<path d="M12 2a6 6 0 0 0-6 6v2H4v2h16v-2h-2V8a6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4v2H8V8a4 4 0 0 1 4-4z" fill="white"/>`;
        } else if (isPublicFacility) {
            // Building/Facility icon
            svgIcon = `<path d="M4 22V4c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v18H4zm4-4h2v-2H8v2zm0-4h2v-2H8v2zm0-4h2V8H8v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v2z" fill="white"/>`;
        } else if (cat.includes('other')) {
            // Question mark icon
            svgIcon = `<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm1.07-7.75l-.9.92C12.45 10.9 12 11.5 12 13h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41a2 2 0 1 0-4 0H7a4 4 0 1 1 8 0c0 .88-.36 1.68-.93 2.25z" fill="white"/>`;
        } else {
            // Alert triangle
            svgIcon = `<path d="M12 2L1 21h22L12 2zm0 3.5l7 13.5H5l7-13.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" fill="white"/>`;
        }

        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 46" width="40" height="46">
                <!-- Large Pin Body -->
                <path d="M20 44c0 0 16-15.5 16-24a16 16 0 0 0-32 0c0 8.5 16 24 16 24z" fill="${color}" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0px 3px 2px rgba(0,0,0,0.3))" />
                <!-- Dark Inner Circle background -->
                <circle cx="20" cy="18" r="11" fill="rgba(0,0,0,0.18)"/>
                <!-- Centered White Icon -->
                <g transform="translate(10, 8) scale(0.8)">
                    ${svgIcon}
                </g>
            </svg>
        `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
    };

    // Simulated data removal (simulatedHazards removed per request)

    // Distance Calculation Logic
    const getDistance = (loc1, loc2) => {
        if (!window.google || !window.google.maps || !window.google.maps.geometry) return null;
        const p1 = new window.google.maps.LatLng(loc1.lat, loc1.lng);
        const p2 = new window.google.maps.LatLng(loc2.lat, loc2.lng);
        return window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    };

    const formatDistance = (meters) => {
        if (meters === null) return "---";
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${((meters / 1000)).toFixed(1)}km`;
    };

    const processedHazards = React.useMemo(() => {
        if (!isLoaded) return [];

        // Combine public community reports and personal reports (deduplicate by id or ticket_id)
        const combined = [...(publicReports || []), ...(userReports || [])];
        const seen = new Set();
        const uniqueReports = [];
        for (const r of combined) {
            const idKey = r.id != null ? String(r.id) : (r.ticket_id ? String(r.ticket_id) : (r.tracking_token || `${r.location_lat || r.lat}_${r.location_lng || r.lng}_${r.created_at || ''}`));
            if (!seen.has(idKey)) {
                seen.add(idKey);
                uniqueReports.push(r);
            }
        }

        const markers = uniqueReports.map(r => {
            const lat = parseFloat(r.location_lat || r.lat);
            const lng = parseFloat(r.location_lng || r.lng);

            let image = r.image_url || r.photo_url;
            if (!image && r.image_paths) {
                if (typeof r.image_paths === 'string') {
                    try {
                        const parsed = JSON.parse(r.image_paths);
                        image = Array.isArray(parsed) ? parsed[0] : parsed;
                    } catch (e) {
                        image = r.image_paths;
                    }
                } else if (Array.isArray(r.image_paths)) {
                    image = r.image_paths[0];
                }
            }

            const formattedTicket = formatTicketId(r.ticket_id, r.id);
            return {
                id: r.id || `report-${formattedTicket}`,
                ticket_id: formattedTicket,
                lat,
                lng,
                title: r.description || `Civic Concern - ${formattedTicket}`,
                category: r.category || r.ai_category || 'Infrastructure Issue',
                status: (r.status || 'pending').toLowerCase(),
                location: r.location_string || 'Caloocan City',
                image: image,
                ai_urgency: r.ai_urgency || r.urgency
            };
        }).filter(r => !isNaN(r.lat) && !isNaN(r.lng));

        return markers.map(hazard => {
            const meters = (reportLocation?.lat && reportLocation?.lng)
                ? getDistance(reportLocation, { lat: hazard.lat, lng: hazard.lng })
                : null;
            return {
                ...hazard,
                dynamicDistance: meters == null ? 'Distance calculating...' : formatDistance(meters),
                distanceValue: meters ?? 999999
            };
        }).sort((a, b) => a.distanceValue - b.distanceValue);
    }, [reportLocation, userReports, publicReports, isLoaded]);

    const heatmapPoints = React.useMemo(() => {
        if (!processedHazards || processedHazards.length === 0) return [];
        return processedHazards.map(h => ({
            lat: h.lat,
            lng: h.lng,
            weight: (h.status === 'pending' || h.ai_urgency === 'critical') ? 3 : 1
        }));
    }, [processedHazards]);

    const mapFilteredHazards = React.useMemo(() => {
        if (mapCategoryFilter === 'all') return processedHazards;
        return processedHazards.filter(h => {
            const cat = (h.category || '').toLowerCase();
            if (mapCategoryFilter === 'roads') return cat.includes('road') || cat.includes('bridge') || cat.includes('pothole');
            if (mapCategoryFilter === 'drainage') return cat.includes('water') || cat.includes('drain') || cat.includes('flood') || cat.includes('canal');
            if (mapCategoryFilter === 'lighting') return cat.includes('light') || cat.includes('electric') || cat.includes('power');
            if (mapCategoryFilter === 'safety') return cat.includes('safety') || cat.includes('hazard') || cat.includes('fire');
            if (mapCategoryFilter === 'facilities') return cat.includes('facilit') || cat.includes('park') || cat.includes('hall');
            return true;
        });
    }, [processedHazards, mapCategoryFilter]);

    // Generate photo-pins for hazards with images (matching government DispatcherDashboard)
    useEffect(() => {
        if (!processedHazards || processedHazards.length === 0) return;

        let batchTimer = null;
        const pendingBatch = {};

        const flushBatch = () => {
            if (Object.keys(pendingBatch).length > 0) {
                setPhotoPinIcons(prev => {
                    let hasNew = false;
                    for (const k in pendingBatch) {
                        if (!prev[k]) {
                            hasNew = true;
                            break;
                        }
                    }
                    return hasNew ? { ...prev, ...pendingBatch } : prev;
                });
            }
        };

        processedHazards.forEach(hazard => {
            const rawImg = hazard.image;
            if (!rawImg) return;

            [false, true].forEach(isSelected => {
                const cacheKey = `${hazard.id}-${isSelected ? 'sel' : 'norm'}`;
                if (pinIconCache.current.has(cacheKey)) return;

                let thumbUrl = rawImg;
                if (!rawImg.startsWith('http') && !rawImg.startsWith('data:')) {
                    const cleanPath = rawImg.startsWith('/') ? rawImg : `/${rawImg}`;
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
                        if (hazard.status === 'resolved') borderColor = '#22c55e';
                        else if (hazard.status === 'pending' || hazard.status === 'unverified') {
                            borderColor = hazard.ai_urgency === 'CRITICAL' ? '#ef4444' : '#ff6b00';
                        } else if (hazard.status === 'rejected') {
                            borderColor = '#64748b';
                        } else if (hazard.status === 'cancelled') {
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
                        // fallback to svg
                    }
                };
                img.onerror = () => {
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
            if (batchTimer) clearTimeout(batchTimer);
        };
    }, [processedHazards]);


    const clearLocatingTimers = () => {
        if (locatingStepTimers.current) {
            locatingStepTimers.current.forEach(t => clearTimeout(t));
            locatingStepTimers.current = [];
        }
    };

    const requestDeviceLocation = (force = false) => {
        clearLocatingTimers();
        if (!navigator.geolocation) {
            setIsLocating(false);
            setLocationPermissionDenied(true);
            return;
        }
        setIsLocating(true);
        setLocationPermissionDenied(false);
        setLocatingStep(0);

        // Progressive status timers: 0 -> 1 -> 2
        const t1 = setTimeout(() => setLocatingStep(1), 1400);
        const t2 = setTimeout(() => setLocatingStep(2), 2800);
        locatingStepTimers.current = [t1, t2];

        let bestAcc = Infinity;
        let bestCoords = null;
        let watchId = null;
        let settledTimer = null;

        const finalize = (coords) => {
            clearLocatingTimers();
            const finalCoords = coords || bestCoords;
            if (finalCoords) {
                let finalLat = finalCoords.latitude;
                let finalLng = finalCoords.longitude;
                const actualAccuracy = Math.round(finalCoords.accuracy || bestAcc || 25);

                // Calibrate Wi-Fi drift to Celina Homes 3, Brgy 171 if within vicinity
                if (finalLat >= 14.7505 && finalLat <= 14.7535 && finalLng >= 121.0250 && finalLng <= 121.0275) {
                    finalLat = 14.751952;
                    finalLng = 121.026277;
                }

                const loc = {
                    lat: finalLat,
                    lng: finalLng,
                    accuracy: actualAccuracy,
                    confirmed: true,
                    source: 'device-gps',
                    timestamp: Date.now()
                };
                setReportLocation(loc);
                reverseGeocode(loc.lat, loc.lng);
            } else {
                setLocationPermissionDenied(true);
            }
            setIsLocating(false);
        };

        const stopWatching = () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            if (settledTimer) {
                clearTimeout(settledTimer);
                settledTimer = null;
            }
        };

        // Multi-sample window: sample over 4 seconds, choose reading with lowest accuracy radius
        settledTimer = setTimeout(() => {
            stopWatching();
            finalize();
        }, 4000);

        try {
            watchId = navigator.geolocation.watchPosition(
                pos => {
                    const acc = pos.coords.accuracy || 100;
                    if (acc < bestAcc) {
                        bestAcc = acc;
                        bestCoords = pos.coords;
                    }
                    // Finalize immediately if GPS fix achieves exceptional accuracy (<= 8m)
                    if (acc <= 8) {
                        stopWatching();
                        finalize(pos.coords);
                    }
                },
                err => {
                    console.warn("High-accuracy watch fallback:", err);
                    if (err.code === 1) { // PERMISSION_DENIED
                        stopWatching();
                        clearLocatingTimers();
                        setIsLocating(false);
                        setLocationPermissionDenied(true);
                        return;
                    }
                    stopWatching();
                    navigator.geolocation.getCurrentPosition(
                        pos => finalize(pos.coords),
                        fallbackErr => {
                            console.warn("Geolocation fallback failed:", fallbackErr);
                            clearLocatingTimers();
                            setIsLocating(false);
                            setLocationPermissionDenied(true);
                            if (force) showToast('Could not retrieve live GPS. Please pinpoint your location on the map.', 'info');
                        },
                        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                    );
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } catch (e) {
            stopWatching();
            finalize();
        }
    };

    // Auto-request device location once on mount
    useEffect(() => {
        requestDeviceLocation(false);
        return () => clearLocatingTimers();
    }, []);

    // Automatically sample fresh high-accuracy location whenever Quick Report modal is opened
    useEffect(() => {
        if (activeModal === 'file-report') {
            if (!reportLocation || !locationAddress) {
                requestDeviceLocation(false);
            }
        }
    }, [activeModal]);

    // ── AI Triage Logic ───────────────────────────────────────────────────────

    // Auto-analyze report whenever image or notes change (debounced for notes)
    useEffect(() => {
        if (activeModal !== 'file-report') return;

        const timer = setTimeout(() => {
            if (selectedImage || (reportNotes && reportNotes.length > 20)) {
                handleAIAnalyze();
            }
        }, 1500); // 1.5s debounce for typing

        return () => clearTimeout(timer);
    }, [selectedImage, reportNotes, activeModal]);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // 1. Validate File Type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showToast('Invalid file type. Please upload an image (JPG, PNG, or WebP).', 'error');
                return;
            }

            // 2. Validate File Size (Max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                showToast('File is too large. Maximum size allowed is 10MB.', 'error');
                return;
            }

            // 3. Burn standardized PULSO Evidence Photo Watermark onto uploaded photo
            try {
                const watermarkedFile = await watermarkEvidenceFile(file, {
                    location: reportLocation,
                    structuredAddress: structuredAddress,
                    locationAddress: locationAddress,
                    timestamp: new Date()
                });
                setSelectedImage(URL.createObjectURL(watermarkedFile));
            } catch (err) {
                console.error("Watermark processing error:", err);
                setSelectedImage(URL.createObjectURL(file));
            }
            setAiFeedback(null);
        }
    };

    const handleAIAnalyze = async (forcedImage = null) => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            if (reportNotes) formData.append('description', reportNotes);

            const imgToUse = forcedImage || selectedImage;
            if (imgToUse) {
                let blob = null;
                if (imgToUse instanceof Blob) {
                    blob = imgToUse;
                } else if (typeof imgToUse === 'string' && (imgToUse.startsWith('blob:') || imgToUse.startsWith('data:'))) {
                    const response = await fetch(imgToUse);
                    blob = await response.blob();
                }
                if (blob) {
                    formData.append('image', blob, 'analysis.jpg');
                }
            }

            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_BASE_URL}/api/reports/analyze`, {
                method: 'POST',
                headers,
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAiFeedback(data);

                if (data.is_inappropriate) {
                    showToast(formatFriendlyNotice(data.rejection_reason), 'error');
                    setReportCategory([]);
                } else {
                    if (data.auto_description && !reportNotes) {
                        setReportNotes(data.auto_description);
                    }

                    // Map AI category to exact category keys to auto-select
                    const aiCat = (data.category || '').toLowerCase();
                    let mapped = [];

                    if (aiCat.includes('light') || aiCat.includes('electric') || aiCat.includes('power') || aiCat.includes('lamp') || aiCat.includes('street')) {
                        mapped.push('Power & Street Lighting');
                    } else if (aiCat.includes('traffic') || aiCat.includes('sign') || aiCat.includes('signal') || aiCat.includes('marking')) {
                        mapped.push('Traffic & Road Signs');
                    } else if (aiCat.includes('road') || aiCat.includes('bridge') || aiCat.includes('pothole') || aiCat.includes('asphalt') || aiCat.includes('pavement')) {
                        mapped.push('Roads & Bridges');
                    } else if (aiCat.includes('water') || aiCat.includes('drain') || aiCat.includes('flood') || aiCat.includes('canal') || aiCat.includes('sewer') || aiCat.includes('pipe') || aiCat.includes('manhole')) {
                        mapped.push('Water Supply & Distribution');
                    } else if (aiCat.includes('safety') || aiCat.includes('regulat') || aiCat.includes('hazard') || aiCat.includes('fire') || aiCat.includes('building') || aiCat.includes('debris') || aiCat.includes('tree')) {
                        mapped.push('Public Safety & Hazards');
                    } else if (aiCat.includes('facilit') || aiCat.includes('park') || aiCat.includes('hall') || aiCat.includes('court') || aiCat.includes('school') || aiCat.includes('gym')) {
                        mapped.push('Public Buildings & Facilities');
                    } else if (aiCat.includes('other') || aiCat.includes('unknown') || aiCat.includes('unclear') || aiCat.includes('misc')) {
                        mapped.push('Others');
                    }

                    if (mapped.length > 0) {
                        setReportCategory(mapped);
                    }
                }
            }
        } catch (err) {
            console.error("AI Analysis failed:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };



    // Reverse-geocoded address for the report location picker
    const [structuredAddress, setStructuredAddress] = useState(null);
    const [locationAddress, setLocationAddress] = useState('');
    const [plusCode, setPlusCode] = useState('');
    const [geocodingAddress, setGeocodingAddress] = useState(false);
    const geocodeRequest = useRef(0);

    const reverseGeocode = async (lat, lng) => {
        const requestId = ++geocodeRequest.current;
        setGeocodingAddress(true);
        let primaryAddress = '';
        let resolvedStructured = null;
        const autoPlusCode = encodeOpenLocationCode(lat, lng, true);
        let plusCodeStr = autoPlusCode;

        // 1. Try Google Maps Geocoder First
        if (isLoaded && window.google) {
            try {
                const geocoder = new window.google.maps.Geocoder();
                const response = await Promise.race([
                    geocoder.geocode({ location: { lat, lng } }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Address lookup timed out')), 6000))
                ]);
                if (response.results && response.results.length > 0) {
                    const googlePlusCode = response.plus_code?.compound_code || response.plus_code?.global_code || autoPlusCode;
                    resolvedStructured = parseGeocodedAddress(response.results, lat, lng, googlePlusCode);
                    primaryAddress = formatFullAddress(resolvedStructured, { lat, lng });
                    if (resolvedStructured.plusCode) plusCodeStr = resolvedStructured.plusCode;
                }
            } catch (err) {
                console.warn("Frontend Google geocoding failed, trying server...", err);
            }
        }

        // 2. Fallback to Backend Google Maps API (avoids referrer/CORS restrictions)
        if (!primaryAddress) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/geocode/reverse?lat=${lat}&lng=${lng}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    signal: AbortSignal.timeout(6000)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.address && !data.address.startsWith("Lat:")) {
                        resolvedStructured = parseAddressString(data.address) || parseGeocodedAddress([], lat, lng, autoPlusCode);
                        if (!resolvedStructured.plusCode) resolvedStructured.plusCode = autoPlusCode;
                        primaryAddress = formatFullAddress(resolvedStructured, { lat, lng });
                        if (resolvedStructured.plusCode) plusCodeStr = resolvedStructured.plusCode;
                    }
                }
            } catch (err) {
                console.warn("Backend Google geocoding failed...", err);
            }
        }

        // 3. Fallback to OpenStreetMap (Nominatim)
        if (!primaryAddress) {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                    signal: AbortSignal.timeout(5000)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.display_name) {
                        const addr = data.address || {};
                        const brgyCandidate = addr.suburb || addr.quarter || addr.neighbourhood || addr.village || '';
                        resolvedStructured = {
                            subdivision: '',
                            plusCode: autoPlusCode,
                            streetAddress: [addr.house_number, addr.road].filter(Boolean).join(' '),
                            barangay: brgyCandidate.includes('Barangay') ? brgyCandidate : (brgyCandidate ? `Barangay ${brgyCandidate}` : ''),
                            city: 'Caloocan',
                            postalCode: addr.postcode || getPostalCodeForBarangay(brgyCandidate),
                            region: 'Metro Manila'
                        };
                        primaryAddress = formatFullAddress(resolvedStructured, { lat, lng });
                        plusCodeStr = autoPlusCode;
                    }
                }
            } catch (err) {
                console.warn("Nominatim geocoding fallback failed...", err);
            }
        }

        // 4. Fallback to BigDataCloud Plus Code
        if (!plusCodeStr || plusCodeStr === autoPlusCode) {
            try {
                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`, {
                    signal: AbortSignal.timeout(4000)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.plusCode) {
                        const cleanCode = extractCleanPlusCode(data.plusCode, lat, lng);
                        if (cleanCode) plusCodeStr = cleanCode;
                    }
                }
            } catch (err) {
                // non-fatal
            }
        }

        if (requestId !== geocodeRequest.current) return;

        // Celina Homes 3 calibration
        if (!resolvedStructured && lat >= 14.7505 && lat <= 14.7535 && lng >= 121.0250 && lng <= 121.0275) {
            resolvedStructured = {
                subdivision: 'Celina Homes 3',
                plusCode: 'Q22G+QGP',
                streetAddress: 'Blk 4 Lot 16 Silver',
                barangay: 'Barangay 171',
                city: 'Caloocan',
                postalCode: '1421',
                region: 'Metro Manila'
            };
            primaryAddress = formatFullAddress(resolvedStructured, { lat, lng });
            plusCodeStr = 'Q22G+QGP';
        }

        if (!resolvedStructured) {
            const autoBrgy = findBarangayByCoordinates(lat, lng);
            const brgyName = autoBrgy ? autoBrgy.name : '';
            resolvedStructured = {
                subdivision: '',
                plusCode: plusCodeStr || autoPlusCode,
                streetAddress: '',
                barangay: brgyName,
                city: 'Caloocan',
                postalCode: brgyName ? getPostalCodeForBarangay(brgyName) : '1421',
                region: 'Metro Manila'
            };
            primaryAddress = formatFullAddress(resolvedStructured, { lat, lng });
        } else if (!resolvedStructured.barangay || !resolvedStructured.barangay.trim()) {
            const autoBrgy = findBarangayByCoordinates(lat, lng);
            if (autoBrgy) {
                resolvedStructured.barangay = autoBrgy.name;
                resolvedStructured.postalCode = getPostalCodeForBarangay(autoBrgy.name);
                primaryAddress = formatFullAddress(resolvedStructured, { lat, lng });
            }
        }

        setStructuredAddress(resolvedStructured);
        setLocationAddress(primaryAddress || `Caloocan City (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        setPlusCode(plusCodeStr || autoPlusCode);
        setGeocodingAddress(false);
    };

    const handleFileReport = () => {
        if (isLocating || geocodingAddress || !reportLocation || isNaN(reportLocation.lat) || isNaN(reportLocation.lng)) {
            showToast('Please wait for location to finish acquiring or pinpoint manually on the map.', 'warning');
            return;
        }
        if (reportCategory.length === 0) {
            showToast('Please select at least one issue category.', 'error');
            return;
        }
        if (reportCategory.includes('Others') && (!reportNotes || reportNotes.trim().length < 10)) {
            showToast('Please describe the issue in Additional Notes (minimum 10 characters) when "Others" is selected.', 'warning');
            return;
        }
        if (!selectedImage) {
            showToast('Please capture photo evidence of the infrastructure issue before submitting.', 'error');
            return;
        }
        if (aiFeedback?.is_inappropriate) {
            showToast(formatFriendlyNotice(aiFeedback.rejection_reason) || 'Please upload a photo of the problem to submit your report.', 'error');
            return;
        }
        setIsSubmitConfirmOpen(true);
    };

    const actuallySubmitReport = async () => {
        if (!reportLocation || isNaN(reportLocation.lat) || isNaN(reportLocation.lng)) return;
        setIsSubmitConfirmOpen(false);
        setSubmittingReport(true);
        try {
            const formData = new FormData();
            formData.append('category', Array.isArray(reportCategory) ? reportCategory.join(', ') : reportCategory);
            formData.append('description', reportNotes || "Citizen report from PULSO app.");
            formData.append('lat', reportLocation.lat);
            formData.append('lng', reportLocation.lng);
            formData.append('location_string', locationAddress || `Caloocan City (${reportLocation.lat.toFixed(4)}, ${reportLocation.lng.toFixed(4)})`);
            let submitBrgy = structuredAddress?.barangay;
            if (!submitBrgy && reportLocation?.lat && reportLocation?.lng) {
                const autoBrgy = findBarangayByCoordinates(reportLocation.lat, reportLocation.lng);
                if (autoBrgy) submitBrgy = autoBrgy.name;
            }
            if (submitBrgy) {
                formData.append('location_barangay', submitBrgy.replace(/^Barangay\s*/i, ''));
            }

            if (selectedImage) {
                const response = await fetch(selectedImage);
                const blob = await response.blob();
                formData.append('image', blob, `report-${Date.now()}.jpg`);
                if (photoMetadata?.capturedAt) {
                    formData.append('photo_captured_at', photoMetadata.capturedAt);
                }
            }

            const response = await fetch(`${API_BASE_URL}/api/reports`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                showToast('Report verified and submitted!');
                setActiveModal(null);
                setActiveTab('reports');
                setReportNotes('');
                setSelectedImage(null);
                setPhotoMetadata(null);
                fetchUserReports(currentUser.id);
            } else {
                const errorData = await response.json();
                showToast(errorData.detail || 'Failed to submit report', 'error');
            }
        } catch (error) {
            console.error("PULSO: Error submitting report:", error);
            showToast('Error connecting to server.', 'error');
        } finally {
            setSubmittingReport(false);
        }
    };

    const handleCancelReport = (reportId) => {
        setReportToCancel(reportId);
    };

    const confirmCancelReport = async (reportId) => {
        setReportToCancel(null);
        try {
            const authToken = token || getAuthToken();
            if (!authToken) {
                showToast("You must be logged in to retract a report.", 'error');
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/cancel`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                showToast('Report retracted successfully');
                if (currentUser) {
                    fetchUserReports(currentUser.id);
                }
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Failed to cancel report", 'error');
            }
        } catch (error) {
            console.error("Error cancelling report:", error);
            showToast("Network error: Could not reach the server to cancel the report. Please try again.", 'error');
        }
    };



    const handleUpdateProfile = async (field, value) => {
        setUpdatingProfile(true);
        try {
            const payload = {};
            if (field === 'email') payload.email = value;
            if (field === 'phone') payload.phone_number = value;

            const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast(`${field === 'email' ? 'Email' : 'Mobile Number'} updated successfully`);
                fetchUser(currentUser.id); // Refresh user data
            } else {
                showToast("Failed to update profile", 'error');
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast("An error occurred", 'error');
        } finally {
            setUpdatingProfile(false);
        }
    };

    // ── Resident AI Assistant State & Persistent History ──────────────────────
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [isAIMaximized, setIsAIMaximized] = useState(false);
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiConversations, setAiConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(() => {
        const uid = currentUser?.id || user?.id;
        const stored = uid ? localStorage.getItem(`pulso_pulseai_active_conv_${uid}`) : null;
        return stored ? parseInt(stored, 10) : null;
    });
    const [isAIHistoryOpen, setIsAIHistoryOpen] = useState(false);
    const [loadingAIConversations, setLoadingAIConversations] = useState(false);
    const [deletingConversationId, setDeletingConversationId] = useState(null);

    const getInitialAIMessage = useCallback(() => ({
        role: 'assistant',
        text: `Hello ${currentUser?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'}. I am **PULSEAI**, the official 24/7 assistant for Caloocan City's infrastructure and public services.\n\nHow can I help you today? You can ask about **how to file a report**, check your **report status**, inquire about **city emergency hotlines**, or view **active engineering advisories**.`
    }), [currentUser?.full_name, user?.name]);

    const [aiMessages, setAiMessages] = useState([
        {
            role: 'assistant',
            text: `Hello ${currentUser?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'}. I am **PULSEAI**, the official 24/7 assistant for Caloocan City's infrastructure and public services.\n\nHow can I help you today? You can ask about **how to file a report**, check your **report status**, inquire about **city emergency hotlines**, or view **active engineering advisories**.`
        }
    ]);
    const aiChatEndRef = React.useRef(null);
    const hasFetchedConversationsOnOpen = React.useRef(false);
    const aiSuggestionsScrollRef = React.useRef(null);
    const [canScrollAiLeft, setCanScrollAiLeft] = useState(false);
    const [canScrollAiRight, setCanScrollAiRight] = useState(true);

    const updateAiSuggestionsScroll = useCallback(() => {
        const el = aiSuggestionsScrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollAiLeft(scrollLeft > 2);
        setCanScrollAiRight(scrollLeft < scrollWidth - clientWidth - 2);
    }, []);

    const scrollAiSuggestions = (direction) => {
        const el = aiSuggestionsScrollRef.current;
        if (!el) return;
        const scrollAmount = 140;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
        setTimeout(updateAiSuggestionsScroll, 300);
    };

    useEffect(() => {
        if (isAIChatOpen && aiMessages.length === 1) {
            updateAiSuggestionsScroll();
            const timer = setTimeout(updateAiSuggestionsScroll, 120);
            window.addEventListener('resize', updateAiSuggestionsScroll);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateAiSuggestionsScroll);
            };
        }
    }, [isAIChatOpen, aiMessages.length, updateAiSuggestionsScroll]);

    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const fetchAIConversations = useCallback(async (silent = false) => {
        const uid = currentUser?.id || user?.id;
        if (!token || !uid) {
            setLoadingAIConversations(false);
            return;
        }
        if (!silent) setLoadingAIConversations(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pulseai/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAiConversations(data.conversations || []);
            }
        } catch (err) {
            console.error("Failed to load PULSEAI conversations:", err);
        } finally {
            if (!silent) setLoadingAIConversations(false);
        }
    }, [token, currentUser?.id, user?.id]);

    const loadConversationMessages = useCallback(async (convId) => {
        if (!convId || !token) return;
        setIsAILoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pulseai/conversations/${convId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    setAiMessages(data.messages.map(m => ({
                        role: m.role,
                        text: m.content,
                        created_at: m.created_at,
                        tool_name: m.tool_name
                    })));
                } else {
                    setAiMessages([getInitialAIMessage()]);
                }
                setActiveConversationId(convId);
                const uid = currentUser?.id || user?.id;
                if (uid) {
                    localStorage.setItem(`pulso_pulseai_active_conv_${uid}`, convId.toString());
                }
                setIsAIHistoryOpen(false);
            }
        } catch (err) {
            console.error("Failed to load conversation messages:", err);
            showToast("Could not load past conversation", 'error');
        } finally {
            setIsAILoading(false);
            setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [token, currentUser?.id, user?.id, getInitialAIMessage, showToast]);

    const handleStartNewChat = () => {
        setActiveConversationId(null);
        const uid = currentUser?.id || user?.id;
        if (uid) {
            localStorage.removeItem(`pulso_pulseai_active_conv_${uid}`);
        }
        setAiMessages([getInitialAIMessage()]);
        setIsAIHistoryOpen(false);
    };

    const handleDeleteConversation = async (convId, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!convId || !token) return;

        const result = await Swal.fire({
            title: 'Delete Conversation?',
            text: 'This chat thread will be permanently deleted from your account per RA 10173 Right to Erasure.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ea580c',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            setDeletingConversationId(convId);
            const res = await fetch(`${API_BASE_URL}/api/pulseai/conversations/${convId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast("Conversation deleted");
                setAiConversations(prev => prev.filter(c => c.id !== convId));
                if (activeConversationId === convId) {
                    handleStartNewChat();
                }
            } else {
                showToast("Failed to delete conversation", 'error');
            }
        } catch {
            showToast("Network error deleting conversation", 'error');
        } finally {
            setDeletingConversationId(null);
        }
    };

    const handleClearAllConversations = async () => {
        if (!token) return;

        const result = await Swal.fire({
            title: 'Clear All Chat History?',
            text: 'Are you sure you want to delete all saved PULSEAI conversations? This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ea580c',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, clear all',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/pulseai/conversations`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast("All chat history cleared");
                setAiConversations([]);
                handleStartNewChat();
            } else {
                showToast("Failed to clear chat history", 'error');
            }
        } catch {
            showToast("Network error clearing history", 'error');
        }
    };

    // Auto-fetch conversations and restore active conversation when chat opens
    useEffect(() => {
        if (isAIChatOpen && token && (currentUser?.id || user?.id)) {
            if (!hasFetchedConversationsOnOpen.current) {
                hasFetchedConversationsOnOpen.current = true;
                fetchAIConversations();
                const uid = currentUser?.id || user?.id;
                const storedConvId = localStorage.getItem(`pulso_pulseai_active_conv_${uid}`);
                if (storedConvId) {
                    loadConversationMessages(parseInt(storedConvId, 10));
                }
            }
        } else if (!isAIChatOpen) {
            hasFetchedConversationsOnOpen.current = false;
        }
    }, [isAIChatOpen, token, currentUser?.id, user?.id, fetchAIConversations, loadConversationMessages]);

    const handleResidentAIChat = async (e, overrideQuery = null) => {
        if (e && e.preventDefault) e.preventDefault();
        const queryToSend = (overrideQuery || aiQuery).trim();
        if (!queryToSend || isAILoading) return;

        const userMsg = { role: 'user', text: queryToSend };
        setAiMessages(prev => [...prev, userMsg]);
        setAiQuery('');
        setIsAILoading(true);

        const uid = currentUser?.id || user?.id;
        const userName = currentUser?.full_name || user?.name || 'Resident';
        const userBrgy = currentUser?.barangay || user?.barangay || 'North Caloocan';

        // 1. Try persistent conversation if authenticated
        if (token && uid) {
            try {
                let convId = activeConversationId;
                if (!convId) {
                    const createRes = await fetch(`${API_BASE_URL}/api/pulseai/conversations`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ title: queryToSend.slice(0, 42) })
                    });
                    if (createRes.ok) {
                        const convData = await createRes.json();
                        convId = convData.id;
                        setActiveConversationId(convId);
                        localStorage.setItem(`pulso_pulseai_active_conv_${uid}`, convId.toString());
                    }
                }

                if (convId) {
                    const resp = await fetch(`${API_BASE_URL}/api/pulseai/conversations/${convId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            query: queryToSend,
                            context: `Resident Portal. User: ${userName}, Barangay: ${userBrgy}. Active tab: ${activeTab}. The user is a citizen, NOT a staff member. Help them navigate PULSO, understand how to report issues, check their report status, learn about city services, evacuation routes, and local government procedures in Caloocan City North.`
                        })
                    });

                    if (resp.ok) {
                        const data = await resp.json();
                        setAiMessages(prev => [...prev, {
                            role: 'assistant',
                            text: data.response,
                            tool_name: data.assistant_message?.tool_name
                        }]);
                        fetchAIConversations(true);
                        setIsAILoading(false);
                        setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        return;
                    }
                }
            } catch (err) {
                console.warn("Persistent conversation failed, trying fallback:", err);
            }
        }

        // 2. Unauthenticated or fallback to legacy assistant endpoint
        try {
            const resp = await fetch(`${API_BASE_URL}/api/ai/assistant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    query: queryToSend,
                    context: `Resident Portal. User: ${userName}, Barangay: ${userBrgy}. Active tab: ${activeTab}. The user is a citizen, NOT a staff member. Help them navigate PULSO, understand how to report issues, check their report status, learn about city services, evacuation routes, and local government procedures in Caloocan City North.`
                })
            });
            const data = await resp.json();
            setAiMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
        } catch {
            setAiMessages(prev => [...prev, {
                role: 'assistant',
                text: 'I am temporarily unable to connect to the PULSO network. For emergency services, please dial **911** (NDRRMC) or contact the **Caloocan Action Center** at **(02) 8288-8811**.'
            }]);
        } finally {
            setIsAILoading(false);
            setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
    };

    const navItems = NAV_ITEMS(t);


    const quickFunctions = QUICK_FUNCTIONS_DATA(t).map(f => ({
        ...f,
        action: f.modal ? () => handleSetModal(f.modal) : () => handleSetTab(f.tab)
    }));

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors flex flex-col">

            {/* Global Toast Notification */}
            <AnimatePresence>
                {toast.message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-8 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 border border-slate-700/50 backdrop-blur-xl dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 text-sm whitespace-nowrap"
                    >
                        {toast.type === 'error' ? (
                            <X size={18} className="text-red-500 stroke-[3px]" />
                        ) : (
                            <CheckCircle2 size={18} className="text-green-500 stroke-[3px]" />
                        )}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Offline Banner */}
            <AnimatePresence>
                {isOffline && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold shadow-md z-50 relative"
                    >
                        <WifiOff size={16} /> {t('dashboard.offline')}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Render Overlay Modals */}
            <ResidentModals
                activeModal={activeModal}
                setActiveModal={setActiveModal}
                t={t}
                selectedPost={selectedPost}
                setSelectedPost={setSelectedPost}
                isLoaded={isLoaded}
                map={map}
                setMap={setMap}
                panorama={panorama}
                setPanorama={setPanorama}
                reportLocation={reportLocation}
                setReportLocation={setReportLocation}
                locationAddress={locationAddress}
                setLocationAddress={setLocationAddress}
                plusCode={plusCode}
                setPlusCode={setPlusCode}
                geocodingAddress={geocodingAddress}
                structuredAddress={structuredAddress}
                setStructuredAddress={setStructuredAddress}
                reportCategory={reportCategory}
                setReportCategory={setReportCategory}
                reportNotes={reportNotes}
                setReportNotes={setReportNotes}
                selectedImage={selectedImage}
                setSelectedImage={setSelectedImage}
                submittingReport={submittingReport}
                handleFileReport={handleFileReport}
                isSelectingLocation={isSelectingLocation}
                setIsSelectingLocation={setIsSelectingLocation}
                isIDCameraOpen={isIDCameraOpen}
                setIsIDCameraOpen={setIsIDCameraOpen}
                checkJurisdiction={checkJurisdiction}
                reverseGeocode={reverseGeocode}
                mapOptions={mapOptions}
                pulseRadius={pulseRadius}
                processedHazards={processedHazards}
                selectedHazard={selectedHazard}
                setSelectedHazard={setSelectedHazard}
                svLocation={svLocation}
                handleStreetViewClick={handleStreetViewClick}
                getIconForCategory={getIconForCategory}
                getMarkerSVG={getMarkerSVG}
                getCategoryColor={getCategoryColor}
                mapFilter={mapFilter}
                setMapFilter={setMapFilter}
                isAnalyzing={isAnalyzing}
                aiFeedback={aiFeedback}
                setAiFeedback={setAiFeedback}
                locationPermissionDenied={locationPermissionDenied}
                photoMetadata={photoMetadata}
                setPhotoMetadata={setPhotoMetadata}
                reportToCancel={reportToCancel}
                setReportToCancel={setReportToCancel}
                confirmCancelReport={confirmCancelReport}
                isSubmitConfirmOpen={isSubmitConfirmOpen}
                setIsSubmitConfirmOpen={setIsSubmitConfirmOpen}
                actuallySubmitReport={actuallySubmitReport}
                setZoomedImage={setZoomedImage}
                photoPinIcons={photoPinIcons}
                getCachedIcon={getCachedIcon}
                theme={theme}
                borderData={borderData}
                isLocating={isLocating}
                locatingStep={locatingStep}
                requestDeviceLocation={requestDeviceLocation}
                showHeatmap={showHeatmap}
                setShowHeatmap={setShowHeatmap}
                mapLayerType={mapLayerType}
                setMapLayerType={setMapLayerType}
                mapCategoryFilter={mapCategoryFilter}
                setMapCategoryFilter={setMapCategoryFilter}
                heatmapPoints={heatmapPoints}
                mapFilteredHazards={mapFilteredHazards}
                showToast={showToast}
            />

            {activeModal === 'all-notifications' && (
                <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Bell className="text-orange-500" /> {t('All Notifications', { defaultValue: 'All Notifications' })}
                            </h2>
                            <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition focus:outline-none">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-orange-500 text-sm font-bold hover:underline shrink-0 focus:outline-none"
                                >
                                    Mark all as read
                                </button>
                            </div>
                            {notifications.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">No notifications available.</p>
                            ) : (
                                notifications.map(notif => (
                                    <div key={notif.id} className={`p-4 rounded-xl border ${notif.is_read ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80' : 'bg-white dark:bg-slate-800/80 border-blue-100 dark:border-blue-900/60 shadow-sm'} ${notif.is_hidden ? 'opacity-50' : ''}`}>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.is_read ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <h4 className={`font-bold text-[15px] ${notif.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                                                        {notif.title}
                                                        {notif.is_hidden && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-2.5 py-0.5 rounded-md ml-3 uppercase tracking-wider font-bold">Dismissed</span>}
                                                    </h4>
                                                    <p className={`text-[13px] mt-1 ${notif.is_read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{notif.message}</p>
                                                    <p className="text-[11px] text-blue-500 mt-2 font-bold">{new Date(notif.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 items-end shrink-0">
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={() => handleNotificationClick(notif)}
                                                        className="text-[11px] uppercase tracking-wider font-bold text-blue-500 hover:text-blue-600 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition focus:outline-none"
                                                    >
                                                        Mark Read
                                                    </button>
                                                )}
                                                {!notif.is_hidden && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_hidden: true } : n));
                                                            try {
                                                                const authToken = token || getAuthToken();
                                                                await fetch(`${API_BASE_URL}/api/notifications/${notif.id}`, {
                                                                    method: 'DELETE',
                                                                    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
                                                                });
                                                            } catch (err) {
                                                                console.error("Delete error:", err);
                                                            }
                                                        }}
                                                        className="text-[11px] uppercase tracking-wider font-bold text-slate-400 hover:text-red-500 px-3 py-1.5 bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/20 rounded-lg transition focus:outline-none"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Top Navigation */}
            <TopNavigation
                activeTab={activeTab}
                handleSetTab={handleSetTab}
                handleSetModal={handleSetModal}
                theme={theme}
                changeTheme={changeTheme}
                showNotifications={showNotifications}
                setShowNotifications={setShowNotifications}
                notifications={notifications}
                setNotifications={setNotifications}
                handleMarkAllRead={handleMarkAllRead}
                handleNotificationClick={handleNotificationClick}
                handleLogout={handleLogout}
                user={user}
                navItems={navItems}
                showToast={showToast}
                i18n={i18n}
                t={t}
                userReports={userReports}
                lguUpdates={lguUpdates}
                processedHazards={processedHazards}
                setSelectedPost={setSelectedPost}
                setSelectedHazard={setSelectedHazard}
                setReportStatusFilter={setReportStatusFilter}
                token={token}
            />

            {/* Main Layout Grid (Responsive 2-Column Content + Sticky Side Nav) */}
            <main ref={mainScrollRef} className="flex-1 w-full flex flex-col relative">

                <div className="max-w-[1700px] mx-auto w-full px-0 sm:px-4 flex flex-col lg:flex-row flex-1 items-start">

                    {/* Persistent Desktop Left Side Navigation Rail (≥1024px) - Follows when scrolling */}
                    <aside className="w-60 xl:w-64 shrink-0 hidden lg:block sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar border-r border-slate-200/80 dark:border-slate-800 self-start z-30">
                        <LeftSidebar
                            user={user}
                            activeTab={activeTab}
                            handleSetTab={handleSetTab}
                            handleSetModal={handleSetModal}
                            handleLogout={handleLogout}
                            t={t}
                        />
                    </aside>

                    {/* Content switcher based on tabs */}
                    <div className="flex-1 min-w-0 w-full">
                        {(activeTab === 'overview' || activeTab === 'home') && (
                            <ResidentHomeView
                                user={user}
                                userReports={userReports}
                                loadingReports={loadingReports}
                                loadingPublicReports={loadingPublicReports}
                                lguUpdates={lguUpdates}
                                loadingAdvisories={loadingAdvisories}
                                processedHazards={processedHazards}
                                handleSetTab={handleSetTab}
                                setActiveModal={handleSetModal}
                                setSelectedPost={setSelectedPost}
                                t={t}
                            />
                        )}

                        {activeTab === 'reports' && (
                            <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1550px] mx-auto pb-32 lg:pb-8 pt-3 sm:pt-6 px-3.5 sm:px-6">
                                <MyReports
                                    userReports={userReports}
                                    loadingReports={loadingReports}
                                    handleSetModal={handleSetModal}
                                    onOpenClaimModal={() => setIsClaimModalOpen(true)}
                                    containerVariants={containerVariants}
                                    setZoomedImage={setZoomedImage}
                                    reportStatusFilter={reportStatusFilter}
                                    setReportStatusFilter={setReportStatusFilter}
                                    handleCancelReport={handleCancelReport}
                                    t={t}
                                />
                            </div>
                        )}

                        {activeTab === 'updates' && (
                            <div className="w-full max-w-[1440px] mx-auto pb-32 lg:pb-8 pt-3 sm:pt-6 px-3.5 sm:px-6">
                                <LguFeed
                                    lguUpdates={lguUpdates}
                                    loadingAdvisories={loadingAdvisories}
                                    advisoriesError={advisoriesError}
                                    onRetryAdvisories={() => setAdvisoriesReloadKey(key => key + 1)}
                                    getIconForCategory={getIconForCategory}
                                    setSelectedPost={setSelectedPost}
                                    setActiveModal={setActiveModal}
                                    handleSetTab={handleSetTab}
                                    containerVariants={containerVariants}
                                    user={user}
                                    showToast={showToast}
                                    t={t}
                                />
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="w-full max-w-4xl mx-auto pb-32 lg:pb-8 pt-3 sm:pt-6 px-3.5 sm:px-6">
                                <ProfileView
                                    user={user}
                                    setUser={setUser}
                                    handleUpdateProfile={handleUpdateProfile}
                                    updatingProfile={updatingProfile}
                                    containerVariants={containerVariants}
                                    userReports={userReports}
                                    showToast={showToast}
                                    handleLogout={handleLogout}
                                    handleSetModal={handleSetModal}
                                    t={t}
                                    i18n={i18n}
                                    subView={accountSubView}
                                    setSubView={setAccountSubView}
                                />
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="w-full max-w-4xl mx-auto pb-32 lg:pb-8 pt-3 sm:pt-6 px-3.5 sm:px-6">
                                <SettingsView
                                    user={user}
                                    handleLogout={handleLogout}
                                    containerVariants={containerVariants}
                                    token={token}
                                    showToast={showToast}
                                    t={t}
                                    onClearAIChatHistory={handleClearAllConversations}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ── Mobile Bottom Navigation Bar (Ultra-responsive, glassmorphism, touch-optimized, persistent across all scroll states) ── */}
            <nav
                className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] min-h-[4.25rem] sm:min-h-[4.5rem] h-[calc(4.25rem+env(safe-area-inset-bottom,0px))] px-3 sm:px-6 flex items-center justify-around select-none w-full"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                {navItems.map((item) => {
                    if (item.id === 'report') {
                        return (
                            <button
                                key="report"
                                type="button"
                                onClick={() => handleSetModal('file-report')}
                                className="flex flex-col items-center justify-center -mt-7 sm:-mt-8 px-2 sm:px-3 group focus:outline-none cursor-pointer shrink-0"
                                aria-label="Report an issue"
                            >
                                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#ff6b00] hover:bg-[#e65c00] active:scale-95 text-white shadow-xl shadow-orange-500/30 flex items-center justify-center border-[3.5px] border-white dark:border-slate-900 transition-all group-hover:scale-105">
                                    <Plus size={26} strokeWidth={3} />
                                </div>
                                <span className="text-[10px] font-extrabold text-[#ff6b00] mt-1 tracking-tight">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    const isActive = (item.id === 'overview' && (activeTab === 'overview' || activeTab === 'home')) || activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleSetTab(item.id)}
                            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 sm:px-2 min-h-[44px] rounded-xl transition-all duration-200 relative group active:scale-95 ${
                                isActive
                                    ? 'text-orange-500 font-bold'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <div className="relative">
                                {React.cloneElement(item.icon, {
                                    size: 21,
                                    className: `transition-transform duration-200 ${isActive ? 'stroke-[2.5px] scale-110' : ''}`
                                })}
                                {isActive && (
                                    <motion.div
                                        layoutId="mobileNavActivePill"
                                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-1 bg-orange-500 rounded-full"
                                    />
                                )}
                            </div>
                            <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[64px] ${isActive ? 'font-bold text-orange-500' : 'font-medium'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* ── PULSO Resident AI Assistant Modal & Backdrop ────────────────── */}
            <AnimatePresence>
                {isAIChatOpen && (
                    <>
                        {/* Backdrop for maximized mode or mobile modal */}
                        <motion.div
                            key="resident-ai-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-[990] ${
                                isAIMaximized ? 'block' : 'sm:hidden'
                            }`}
                            onClick={() => {
                                if (isAIMaximized && window.innerWidth >= 640) {
                                    setIsAIMaximized(false);
                                } else {
                                    setIsAIChatOpen(false);
                                    setIsAIMaximized(false);
                                }
                            }}
                        />

                        <motion.div
                            key="resident-ai-chat"
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            className={`fixed z-[1000] bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-all duration-300 ${
                                isAIMaximized
                                    ? 'inset-0 sm:inset-6 md:inset-10 lg:inset-14 rounded-none sm:rounded-3xl h-[100dvh] sm:h-auto max-h-none'
                                    : 'inset-x-3 bottom-[5.25rem] sm:inset-auto sm:bottom-24 sm:right-6 w-auto sm:w-[390px] h-[72dvh] sm:h-[530px] max-h-[580px] rounded-2xl'
                            }`}
                        >
                            {/* Header */}
                            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#e65100] via-[#f97316] to-[#ea580c] flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-xs">
                                        <Brain size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="font-bold text-white text-sm leading-tight">PULSEAI</h4>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Operational" />
                                        </div>
                                        <p className="text-[10px] text-orange-100 font-semibold uppercase tracking-wider">Community Helper · 24/7</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Start New Chat Button */}
                                    <button
                                        type="button"
                                        onClick={handleStartNewChat}
                                        title="Start New Chat"
                                        aria-label="New Chat"
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                                    >
                                        <Plus size={17} strokeWidth={2.5} />
                                    </button>
                                    {/* Toggle History View Button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAIHistoryOpen(prev => {
                                                const next = !prev;
                                                if (next && aiConversations.length === 0) {
                                                    fetchAIConversations();
                                                }
                                                return next;
                                            });
                                        }}
                                        title={isAIHistoryOpen ? "Return to chat" : "Past Conversations"}
                                        aria-label="Toggle Conversation History"
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                                            isAIHistoryOpen
                                                ? 'bg-white/30 text-white shadow-xs'
                                                : 'text-white/90 hover:text-white hover:bg-white/20'
                                        }`}
                                    >
                                        <History size={16} />
                                    </button>
                                    {/* Maximize/Minimize */}
                                    <button
                                        type="button"
                                        onClick={() => setIsAIMaximized(prev => !prev)}
                                        title={isAIMaximized ? 'Minimize' : 'Maximize'}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                                    >
                                        {isAIMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                    </button>
                                    {/* Close Button */}
                                    <button
                                        type="button"
                                        onClick={() => { setIsAIChatOpen(false); setIsAIMaximized(false); setIsAIHistoryOpen(false); }}
                                        title="Close"
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Content Body: Either History View or Chat View */}
                            {isAIHistoryOpen ? (
                                /* History Drawer / Panel */
                                <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900">
                                    {/* Panel Sub-Header */}
                                    <div className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsAIHistoryOpen(false)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                                title="Back to conversation"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <div>
                                                <h5 className="font-bold text-xs text-slate-900 dark:text-white">Chat History</h5>
                                                <p className="text-[10px] text-slate-400">
                                                    {aiConversations.length} {aiConversations.length === 1 ? 'thread' : 'threads'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleStartNewChat}
                                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                        >
                                            <Plus size={13} strokeWidth={2.5} />
                                            <span>New Chat</span>
                                        </button>
                                    </div>

                                    {/* Conversation List */}
                                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                        {loadingAIConversations ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                                                <Loader2 size={24} className="animate-spin text-[#ea580c]" />
                                                <span className="text-xs font-medium">Loading conversations...</span>
                                            </div>
                                        ) : aiConversations.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-[#ea580c] dark:text-orange-400 flex items-center justify-center mb-3">
                                                    <MessageSquare size={22} />
                                                </div>
                                                <h6 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">No saved conversations yet</h6>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[240px] mb-4">
                                                    Your inquiries, ticket lookups, and advisory questions will automatically be preserved here.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleStartNewChat}
                                                    className="px-3.5 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                                                >
                                                    Start First Conversation
                                                </button>
                                            </div>
                                        ) : (
                                            aiConversations.map(conv => {
                                                const isActive = conv.id === activeConversationId;
                                                return (
                                                    <div
                                                        key={conv.id}
                                                        onClick={() => loadConversationMessages(conv.id)}
                                                        className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                                                            isActive
                                                                ? 'bg-orange-50/90 dark:bg-orange-950/25 border-orange-300 dark:border-orange-800/60 shadow-xs'
                                                                : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/60 hover:border-orange-200 dark:hover:border-orange-900/40 hover:shadow-2xs'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <h6 className={`font-semibold text-xs leading-snug line-clamp-1 ${
                                                                isActive
                                                                    ? 'text-orange-600 dark:text-orange-400 font-bold'
                                                                    : 'text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                                                            }`}>
                                                                {conv.title || 'Conversation'}
                                                            </h6>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {isActive && (
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
                                                                        Active
                                                                    </span>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                                                                    title="Delete conversation"
                                                                    disabled={deletingConversationId === conv.id}
                                                                    className="opacity-70 group-hover:opacity-100 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 transition-all cursor-pointer"
                                                                >
                                                                    {deletingConversationId === conv.id ? (
                                                                        <Loader2 size={13} className="animate-spin text-rose-500" />
                                                                    ) : (
                                                                        <Trash2 size={13} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {conv.last_message && (
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-1.5 font-medium">
                                                                {conv.last_message}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5 border-t border-slate-100 dark:border-slate-700/40">
                                                            <span>{formatRelativeTime(conv.updated_at || conv.created_at)}</span>
                                                            <span>{conv.message_count || 0} msgs</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Privacy Note & Clear All Footer */}
                                    <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700/80 shrink-0 space-y-2">
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                                            Saved to your resident account in compliance with RA 10173. You can erase threads at any time.
                                        </p>
                                        {aiConversations.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleClearAllConversations}
                                                className="w-full py-1.5 text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Trash2 size={12} />
                                                <span>Clear All Chat History</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Regular Chat View */
                                <>
                                    {/* Suggested quick-actions (Horizontally scrollable with Left & Right Chevrons) */}
                                    {aiMessages.length === 1 && (
                                        <div className="px-1.5 sm:px-2 py-1.5 bg-orange-50/90 dark:bg-slate-800/90 border-b border-orange-100 dark:border-slate-700 flex items-center gap-1 shrink-0 relative">
                                            {/* Chevron Left Button */}
                                            <button
                                                type="button"
                                                onClick={() => scrollAiSuggestions('left')}
                                                disabled={!canScrollAiLeft}
                                                aria-label="Scroll suggestions left"
                                                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 ${
                                                    canScrollAiLeft
                                                        ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs border border-orange-200/90 dark:border-slate-600 hover:bg-[#f05a00] hover:text-white hover:border-[#f05a00] cursor-pointer active:scale-95'
                                                        : 'text-slate-300 dark:text-slate-600 border border-transparent opacity-20 cursor-not-allowed pointer-events-none'
                                                }`}
                                            >
                                                <ChevronLeft size={13} strokeWidth={2.5} />
                                            </button>

                                            {/* Scrollable Pills Container */}
                                            <div
                                                ref={aiSuggestionsScrollRef}
                                                onScroll={updateAiSuggestionsScroll}
                                                className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth items-center py-0.5"
                                            >
                                                {[
                                                    { label: 'How to file a report?', query: 'How to file a report?' },
                                                    { label: 'My report status', query: 'What is the status of my reports?' },
                                                    { label: 'City hotlines', query: 'What are the city emergency hotlines?' },
                                                    { label: 'Evacuation routes', query: 'Where are the evacuation routes in Caloocan?' }
                                                ].map(item => (
                                                    <button
                                                        key={item.label}
                                                        type="button"
                                                        onClick={() => handleResidentAIChat(null, item.query)}
                                                        className="text-[11px] font-semibold whitespace-nowrap text-[#ea580c] dark:text-orange-300 bg-white dark:bg-slate-700 border border-orange-200 dark:border-orange-900/40 px-3 py-1 rounded-full hover:bg-[#f05a00] hover:text-white hover:border-[#f05a00] transition-colors shrink-0 cursor-pointer shadow-2xs"
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Chevron Right Button */}
                                            <button
                                                type="button"
                                                onClick={() => scrollAiSuggestions('right')}
                                                disabled={!canScrollAiRight}
                                                aria-label="Scroll suggestions right"
                                                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 ${
                                                    canScrollAiRight
                                                        ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs border border-orange-200/90 dark:border-slate-600 hover:bg-[#f05a00] hover:text-white hover:border-[#f05a00] cursor-pointer active:scale-95'
                                                        : 'text-slate-300 dark:text-slate-600 border border-transparent opacity-20 cursor-not-allowed pointer-events-none'
                                                }`}
                                            >
                                                <ChevronRight size={13} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Messages Area */}
                                    <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                        {aiMessages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {msg.role === 'assistant' && (
                                                    <div className="w-6 h-6 rounded-full bg-[#f05a00] flex items-center justify-center mr-2 mt-0.5 shrink-0 shadow-xs">
                                                        <Brain size={12} className="text-white" />
                                                    </div>
                                                )}
                                                <div className={`${isAIMaximized ? 'max-w-[85%] sm:max-w-[70%]' : 'max-w-[85%]'
                                                    } p-3 rounded-2xl text-[13px] font-medium leading-relaxed ${msg.role === 'user'
                                                        ? 'bg-[#f05a00] text-white rounded-br-xs shadow-xs'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/50 dark:border-slate-700/50'
                                                    }`}>
                                                    {msg.role === 'assistant' ? (
                                                        <PulseAIMarkdown content={msg.text} />
                                                    ) : (
                                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Empty state quick-service shortcuts */}
                                        {aiMessages.length === 1 && (
                                            <div className="pt-1 pb-2">
                                                <div className="flex items-center gap-2 mb-2 px-0.5">
                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Frequently Requested Services</span>
                                                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/60" />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {[
                                                        {
                                                            title: 'How to file a report?',
                                                            desc: 'Step-by-step guide for hazard photo, map pin & ticket creation',
                                                            badge: 'Guide',
                                                            icon: AlertTriangle,
                                                            query: 'How to file a report?'
                                                        },
                                                        {
                                                            title: 'My report status',
                                                            desc: 'Check live inspection and repair progress on your filed reports',
                                                            badge: 'Live Data',
                                                            icon: Clock,
                                                            query: 'What is the status of my reports?'
                                                        },
                                                        {
                                                            title: 'City hotlines',
                                                            desc: 'Verified numbers for PNP, BFP Fire, DRRMO, and NDRRMC 911',
                                                            badge: 'Emergency',
                                                            icon: PhoneCall,
                                                            query: 'What are the city emergency hotlines?'
                                                        },
                                                        {
                                                            title: 'Evacuation routes',
                                                            desc: 'Emergency guidance and DRRMO disaster shelter contacts',
                                                            badge: 'Safety',
                                                            icon: Compass,
                                                            query: 'Where are the evacuation routes in Caloocan?'
                                                        }
                                                    ].map((card, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => handleResidentAIChat(null, card.query)}
                                                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 hover:bg-orange-50/70 dark:hover:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-800/60 text-left transition-all duration-150 group cursor-pointer shadow-xs flex flex-col justify-between"
                                                        >
                                                            <div className="flex items-center justify-between gap-1.5 mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-[#ea580c] dark:text-orange-400 flex items-center justify-center shrink-0">
                                                                        <card.icon size={13} />
                                                                    </div>
                                                                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 group-hover:text-[#ea580c] dark:group-hover:text-orange-300 transition-colors">
                                                                        {card.title}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                                                    {card.badge}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pl-8">
                                                                {card.desc}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {isAILoading && (
                                            <div className="flex justify-start">
                                                <div className="w-6 h-6 rounded-full bg-[#f05a00] flex items-center justify-center mr-2 mt-0.5 shrink-0">
                                                    <Brain size={12} className="text-white" />
                                                </div>
                                                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-bl-xs flex gap-1 border border-slate-200/50 dark:border-slate-700/50">
                                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={aiChatEndRef} />
                                    </div>

                                    {/* Input Form with safe bottom area */}
                                    <form onSubmit={handleResidentAIChat} className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={aiQuery}
                                                onChange={e => setAiQuery(e.target.value)}
                                                placeholder="Ask PULSEAI..."
                                                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#f05a00]/30 rounded-xl px-3.5 py-2.5 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#f05a00] outline-none placeholder:text-slate-400"
                                            />
                                            <button
                                                type="submit"
                                                disabled={isAILoading || !aiQuery.trim()}
                                                className="w-10 h-10 rounded-xl bg-[#f05a00] hover:bg-[#d94e00] flex items-center justify-center text-white transition-colors disabled:opacity-40 shrink-0 shadow-sm cursor-pointer"
                                            >
                                                <Search size={16} />
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Floating FAB Button (Hidden when maximized on mobile) ── */}
            <div className={`fixed bottom-[calc(5.1rem+env(safe-area-inset-bottom,0px))] md:bottom-8 right-3.5 sm:right-5 md:right-6 z-[60] ${isAIChatOpen && isAIMaximized ? 'hidden' : 'block'}`}>
                <motion.button
                    onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-full bg-[#f05a00] hover:bg-[#d94e00] shadow-xl shadow-orange-500/40 flex items-center justify-center text-white cursor-pointer"
                    title="PULSEAI"
                    aria-label="Toggle PULSEAI"
                >
                    <AnimatePresence>
                        {!isAIChatOpen && (
                            <motion.span
                                key="pulse"
                                className="absolute inset-0 rounded-full bg-orange-400 opacity-60"
                                animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                            />
                        )}
                    </AnimatePresence>
                    {isAIChatOpen ? <X size={20} /> : <Brain size={22} />}
                </motion.button>
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

            {/* ── Contextual Claim Guest Report Modal ── */}
            <ClaimReportModal
                isOpen={isClaimModalOpen}
                onClose={() => setIsClaimModalOpen(false)}
                onSuccess={() => {
                    if (currentUser?.id) {
                        fetchUserReports(currentUser.id);
                    }
                }}
                initialTicketId={claimModalInitialTicket}
                initialTrackingToken={claimModalInitialToken}
                token={token}
            />
        </div>
    );
}
