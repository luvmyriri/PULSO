import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GoogleMap,
    useJsApiLoader,
    MarkerF,
    InfoWindowF,
    PolygonF,
    StreetViewPanorama,
    OverlayViewF
} from '@react-google-maps/api';
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
    MessageSquare,
    X,
    Camera,
    MapPin,
    PhoneCall,
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
    Map,
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
    Shield,
    EyeOff,
    Check,
    Loader2,
    Maximize2,
    Minimize2,
    Upload,
    Calendar,
    MicOff,
    Volume2,
    MessageSquareText,
    Filter,
    LayoutGrid
} from 'lucide-react';

import { useTheme } from '../contexts/ThemeContext';
import Swal from 'sweetalert2';
import Branding from '../components/Branding';
import { useTranslation } from 'react-i18next';
import IDCameraModal from '../components/IDCameraModal';

const CALOOCAN_CITY_PLACE_ID = 'ChIJXxuEGbWxlzMRGi0EJeJw5wU';

const LIBRARIES = ['places', 'geometry'];

import { API_BASE_URL } from '../utils/apiBase';
import { handleApiError } from '../utils/apiFetch';
import { useInteractionHarden } from '../hooks/useInteractionHarden';

const REPORT_CATEGORIES = (t) => [
    t('landing.solutions.s1_title', { defaultValue: 'Roads & Bridges' }),
    t('landing.solutions.s2_title', { defaultValue: 'Water & Drainage' }),
    t('landing.solutions.s3_title', { defaultValue: 'Street Lighting' }),
    t('landing.solutions.s4_title', { defaultValue: 'Public Safety & Regulatory' }),
    t('landing.solutions.s5_title', { defaultValue: 'Public Facilities' }),
];

const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#f97316' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#f97316' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] }
];

const LIGHT_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f8fafc' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
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
    { id: 'map', icon: <Map size={22} />, label: t('dashboard.sidebar.map', { defaultValue: 'Barangay Map' }), color: 'blue', modal: 'map' },
    { id: 'services', icon: <Handshake size={22} />, label: t('dashboard.sidebar.services', { defaultValue: 'LGU Services' }), color: 'green', modal: 'services' },
    { id: 'knowledge', icon: <BookOpen size={22} />, label: t('dashboard.sidebar.knowledge', { defaultValue: 'Knowledge Base' }), color: 'indigo', modal: 'knowledge' },
    { id: 'track', icon: <Search size={22} />, label: t('dashboard.sidebar.track', { defaultValue: 'Track Issue' }), color: 'teal', tab: 'reports' }
];

const NAV_ITEMS = (t) => [
    { id: 'overview', icon: <Home size={28} strokeWidth={2.5} />, label: t('dashboard.sidebar.overview', { defaultValue: 'Overview' }) },
    { id: 'reports', icon: <FileText size={28} />, label: t('dashboard.sidebar.reports', { defaultValue: 'My Reports' }) },
    { id: 'profile', icon: <User size={28} />, label: t('dashboard.sidebar.profile', { defaultValue: 'Profile' }) },
    { id: 'settings', icon: <Settings size={28} />, label: t('dashboard.sidebar.settings', { defaultValue: 'Settings' }) },
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

const LeftSidebar = ({ user, handleSetTab, handleSetModal, t }) => (
    <div className="w-full h-full pb-6 hidden md:block pl-2 pr-4 lg:pr-6 pt-6">
        <div onClick={() => handleSetTab('profile')} className="flex items-center gap-3 p-3 mb-4 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden relative">
                {user.avatar}
                <div className="absolute inset-0 bg-black/10 transition-opacity"></div>
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[15px] text-slate-900 dark:text-white truncate group-hover:text-orange-500 transition-colors">{user.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.barangay}</p>
            </div>
        </div>
        <nav className="space-y-1 mt-4">
            <div className="px-3 pb-2 text-[13px] font-bold text-slate-500 dark:text-slate-400">{t('dashboard.sidebar.shortcuts', { defaultValue: 'Shortcuts' })}</div>
            {QUICK_FUNCTIONS_DATA(t).map(func => (
                <button
                    key={func.id}
                    onClick={func.modal ? () => handleSetModal(func.modal) : () => handleSetTab(func.tab)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none group text-left"
                >
                    <div className={`w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-${func.color}-500 shrink-0 group-hover:bg-white dark:group-hover:bg-slate-700 shadow-sm transition-colors`}>
                        {func.icon}
                    </div>
                    <span className="font-semibold text-[15px] text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{func.label}</span>
                </button>
            ))}
        </nav>
        <div className="px-4 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mt-8">
            <button onClick={() => handleSetModal('privacy')} className="hover:underline hover:text-orange-500 mr-2 inline-block">{t('footer.privacy', { defaultValue: 'Privacy' })}</button> ·
            <button onClick={() => handleSetModal('terms')} className="hover:underline hover:text-orange-500 mx-2 inline-block">{t('footer.terms', { defaultValue: 'Terms' })}</button> ·
            <button onClick={() => handleSetModal('cookies')} className="hover:underline hover:text-orange-500 mx-2 inline-block">{t('footer.cookie', { defaultValue: 'Cookies' })}</button> ·
            <div className="mt-2 text-slate-400 dark:text-slate-600">PULSO Caloocan North © 2026</div>
        </div>
    </div>
);

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
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md group/trust">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                            <ShieldCheck size={20} className="text-orange-500" />
                        </div>
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Trust Score</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-display font-bold text-orange-500 leading-none">{user.trustScore}</span>
                        <span className="text-[9px] font-black uppercase text-slate-400 mt-1 tracking-tighter">Integrity Level</span>
                    </div>
                </div>

                {/* Visual Legend / How it's computed */}
                <div className="space-y-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500 uppercase tracking-tight">Verified & Resolved</span>
                        <span className="text-emerald-500">+5 pts</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500 uppercase tracking-tight">Report Approved</span>
                        <span className="text-blue-500">+2 pts</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500 uppercase tracking-tight">Report Rejected</span>
                        <span className="text-rose-500">-10 pts</span>
                    </div>
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

const LguFeed = ({ lguUpdates, loadingAdvisories, getIconForCategory, setSelectedPost, setActiveModal, containerVariants, t }) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full">
        <div className="mb-4 hidden md:block relative pb-4">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 px-1">
                <ShieldCheck className="text-orange-500" size={24} /> {t('dashboard.overview.latestUpdate', { defaultValue: 'Official Board' })}
            </h2>
            <p className="text-slate-500 text-[14px] mt-1 px-1">{t('landing.features.subtitle', { defaultValue: 'Important updates and advisories from your local government.' })}</p>
        </div>
        <div className="space-y-4">
            {loadingAdvisories ? (
                <div className="flex justify-center py-10"><span className="text-slate-400">{t('Synchronizing Data...')}</span></div>
            ) : lguUpdates.length === 0 ? (
                <div className="text-center text-slate-400 py-16 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Bell className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="font-bold text-slate-500">{t('No new advisories today')}</p>
                </div>
            ) : lguUpdates.map((update) => (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} key={update.id} className="bg-white dark:bg-slate-900 border lg:border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <div className="flex items-start justify-between mb-3 pb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200 dark:border-slate-700">
                                {getIconForCategory(update.category)}
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5"><span className="font-bold text-slate-900 dark:text-white text-[15px]">{update.department}</span><CheckCircle2 size={14} className="text-blue-500 shrink-0" /></div>
                                <div className="text-[13px] text-slate-500 dark:text-slate-400 flex items-center gap-1">{new Date(update.created_at).toLocaleDateString()} • {update.priority}</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1.5">{update.title}</h4>
                        <p className="text-[15px] text-slate-800 dark:text-slate-200 mb-3 whitespace-pre-line leading-relaxed">{update.description}</p>
                        {update.has_image && update.image_url && <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 mb-3"><img src={update.image_url} alt="Advisory" className="w-full max-h-[450px] object-cover" /></div>}
                        <div className="mt-3 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[12px] font-mono text-slate-400">Ref: {update.advisory_id}</span>
                            <button onClick={() => { setSelectedPost(update); setActiveModal('post-details'); }} className="text-[14px] font-bold text-orange-500">{t('dashboard.overview.viewAll', { defaultValue: 'Read Details' })}</button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    </motion.div>
);

const STATUS_CONFIG = {
    resolved: { label: 'Resolved', bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
    pending: { label: 'Pending', bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
    unvalidated: { label: 'Verifying', bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
    unverified: { label: 'Pending', bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
    rejected: { label: 'Rejected', bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
    'in_progress': { label: 'In Progress', bg: '#ffe4c4', text: '#c2410c', dot: '#f97316' },
    approved_internal: { label: 'In Progress', bg: '#ffe4c4', text: '#c2410c', dot: '#f97316' },
    dispatched: { label: 'In Progress', bg: '#ffe4c4', text: '#c2410c', dot: '#f97316' },
    cancelled: { label: 'Cancelled', bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status?.toLowerCase()] || { label: status, bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
    return (
        <span style={{ background: cfg.bg, color: cfg.text }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-current opacity-90 shadow-sm">
            <span style={{ background: cfg.dot }} className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" />
            {cfg.label}
        </span>
    );
};

const MyReports = ({ userReports, loadingReports, handleSetModal, containerVariants, setZoomedImage, reportStatusFilter, setReportStatusFilter, handleCancelReport, t }) => {
    const scrollRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    const scrollItems = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = 200;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const filterOptions = [
        { id: 'all', label: 'All' },
        { id: 'pending', label: 'Pending' },
        { id: 'in_progress', label: 'In Progress' },
        { id: 'resolved', label: 'Resolved' },
        { id: 'rejected', label: 'Rejected' },
        { id: 'cancelled', label: 'Cancelled' },
    ];

    const filteredReports = reportStatusFilter === 'all'
        ? userReports
        : userReports.filter(r => {
            if (reportStatusFilter === 'in_progress') {
                return ['dispatched', 'approved_internal'].includes(r.status);
            }
            // Include 'unvalidated' and legacy 'unverified' in pending filter
            if (reportStatusFilter === 'pending') {
                return ['pending', 'unverified', 'unvalidated'].includes(r.status);
            }
            return r.status === reportStatusFilter;
        });

    useEffect(() => {
        setCurrentPage(1);
    }, [reportStatusFilter]);

    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                <div>
                    <h2 className="text-3xl font-black font-display text-slate-900 dark:text-white tracking-tight">{t('dashboard.reports.history')}</h2>
                    <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.reports.historyDesc')}</p>
                </div>
                <button
                    onClick={() => handleSetModal('file-report')}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                >
                    <Plus size={14} strokeWidth={3} />
                    {t('dashboard.quickReport.submitBtn', { defaultValue: 'Submit a Report' })}
                </button>
            </div>

            {/* User-Friendly Filter Navigation with Scroll Indicators */}
            <div className="bg-slate-100/50 dark:bg-slate-800/40 p-1.5 rounded-2xl mb-10 border border-slate-200/50 dark:border-slate-700/50 flex items-center shadow-sm group/filters overflow-hidden">
                <button
                    onClick={() => scrollItems('left')}
                    className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90"
                    title="Scroll Left"
                >
                    <ChevronLeft size={20} className="shrink-0" />
                </button>

                <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 pb-0.5 px-0.5 scroll-smooth">
                    {filterOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setReportStatusFilter(opt.id)}
                            className={`px-5 py-3 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2.5 whitespace-nowrap ${reportStatusFilter === opt.id
                                    ? 'bg-white dark:bg-slate-700 text-orange-500 shadow-xl shadow-orange-500/10 ring-1 ring-slate-200/50 dark:ring-slate-600'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
                                }`}
                        >
                            {opt.id !== 'all' && (
                                <span className={`w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-800 ${opt.id === 'pending' ? 'bg-amber-400' :
                                        opt.id === 'in_progress' ? 'bg-blue-400' :
                                            opt.id === 'resolved' ? 'bg-green-400' :
                                                opt.id === 'rejected' ? 'bg-red-400' :
                                                    'bg-slate-400'
                                    }`} />
                            )}
                            <span>{opt.label}</span>
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${reportStatusFilter === opt.id
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                }`}>
                                {opt.id === 'all'
                                    ? userReports.length
                                    : userReports.filter(r => {
                                        if (opt.id === 'in_progress') return ['dispatched', 'approved_internal'].includes(r.status);
                                        if (opt.id === 'pending') return ['pending', 'unverified', 'unvalidated'].includes(r.status);
                                        return r.status === opt.id;
                                    }).length}
                            </span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => scrollItems('right')}
                    className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90"
                    title="Scroll Right"
                >
                    <ChevronRight size={20} className="shrink-0" />
                </button>
            </div>

            <div className="space-y-4">
                {loadingReports ? (
                    <div className="text-center text-slate-400 py-16 flex flex-col items-center gap-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border border-slate-200/50 dark:border-slate-800/50">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                        <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Synchronizing Data...</span>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="text-center py-20 border-3 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/30 dark:bg-slate-800/10">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText size={40} className="text-slate-300 dark:text-slate-700" />
                        </div>
                        <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">No {reportStatusFilter !== 'all' ? reportStatusFilter : ''} Records Found</p>
                        <p className="text-slate-500 dark:text-slate-500 mt-2 font-medium max-w-sm mx-auto px-4">There are no reports matching your current filter criteria. Try adjusting your selection or contribute by reporting a new hazard.</p>
                    </div>
                ) : paginatedReports.map((report) => (
                    <div
                        key={report.id}
                        className={`group bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 lg:p-5 flex flex-col md:flex-row items-center gap-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-none hover:border-orange-500/30 ${(report.status === 'resolved' || report.status === 'cancelled') ? 'opacity-80' : ''
                            }`}
                    >
                        {/* 1. Image Column */}
                        <div className="w-full md:w-40 h-28 shrink-0 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm relative group/img">
                            {report.image_url ? (
                                <button
                                    onClick={() => setZoomedImage(`${API_BASE_URL}${report.image_url}`)}
                                    className="w-full h-full cursor-zoom-in"
                                >
                                    <img
                                        src={`${API_BASE_URL}${report.image_url}`}
                                        alt="Report Proof"
                                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <Eye size={20} className="text-white transition-opacity drop-shadow-md" />
                                    </div>
                                </button>
                            ) : (
                                <div className="w-full h-full bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                                    <ImageIcon size={24} strokeWidth={1.5} />
                                    <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">No Media</span>
                                </div>
                            )}
                        </div>

                        {/* 2. Content Column */}
                        <div className="flex-1 min-w-0 w-full flex flex-col justify-center">
                            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                <h3 className="text-[17px] font-black text-slate-900 dark:text-white truncate">
                                    {report.category || report.ai_category}
                                </h3>
                                <span className="text-[10px] font-mono font-bold bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                    {report.ticket_id}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-5 text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} className="text-orange-500/70" />
                                    {new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                                    <MapPin size={14} className="text-blue-500/70" />
                                        {(() => {
                                            if (!report.location_string || !report.location_string.includes('|')) {
                                                return report.location_string || 'Location N/A';
                                            }
                                            const parts = report.location_string.split('|').map(p => p.trim());
                                            const plus = parts[0] || "";
                                            let addr = parts[1] || "";
                                            const brgy = parts[2] || "Barangay Unknown";
                                            
                                            let cleanAddr = addr.replace(new RegExp(`,?\\s*${brgy}`, 'i'), '')
                                                                .replace(/,?\s*Caloocan(?: City)?/i, '')
                                                                .replace(/,?\s*Metro Manila/i, '')
                                                                .replace(/,?\s*Philippines/i, '')
                                                                .replace(/,$/, '')
                                                                .trim();
                                            
                                            return `${plus}, ${cleanAddr}, ${brgy}, Caloocan, Metro Manila`;
                                        })()}
                                </div>
                            </div>

                            {report.status === 'rejected' && (
                                <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-500/5 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-500/10 w-fit">
                                    <AlertTriangle size={13} />
                                    <span>Verification required. Please review criteria.</span>
                                </div>
                            )}
                        </div>

                        {/* 3. Actions & Status Column */}
                        <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-4 w-full md:w-32 py-2 md:py-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pl-0 md:pl-6 shrink-0">
                            <StatusBadge status={report.status} />

                            {(report.status === 'pending' || report.status === 'unverified' || report.status === 'unvalidated') && (
                                <button
                                    onClick={() => handleCancelReport(report.id)}
                                    className="text-[11px] font-black text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 dark:bg-rose-500/10 dark:hover:bg-rose-500 px-4 py-2 rounded-lg transition-all border border-rose-100 dark:border-rose-500/20 active:scale-95 uppercase tracking-wider"
                                >
                                    Retract
                                </button>
                            )}

                            {report.status === 'resolved' && report.resolution_image_url && (
                                <button
                                    onClick={() => setZoomedImage(`${API_BASE_URL}${report.resolution_image_url}`)}
                                    className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:text-white bg-emerald-50 hover:bg-emerald-500 dark:bg-emerald-500/10 dark:hover:bg-emerald-500 px-3 py-1.5 rounded transition-all border border-emerald-100 dark:border-emerald-500/20 active:scale-95 uppercase tracking-wider flex items-center justify-center gap-1 w-full"
                                >
                                    <ImageIcon size={12} /> View Proof
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {filteredReports.length > 0 && (
                <div className="flex flex-col items-center gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-[13px] text-slate-500 dark:text-slate-400">
                        Showing <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredReports.length)}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredReports.length}</span> records
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="w-[34px] h-[34px] flex items-center justify-center rounded-lg bg-transparent border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={14} strokeWidth={2.5} />
                            </button>
                            
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-[34px] h-[34px] flex items-center justify-center rounded-lg text-[13px] font-bold transition-all ${
                                        currentPage === i + 1 
                                        ? 'bg-orange-500 text-white border border-transparent' 
                                        : 'bg-transparent border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="w-[34px] h-[34px] flex items-center justify-center rounded-lg bg-transparent border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight size={14} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

const ProfileView = ({ user, setUser, handleUpdateProfile, updatingProfile, containerVariants, t }) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-10 relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row gap-10 relative z-10">
            {/* Left: Identity Card */}
            <div className="flex flex-col items-center gap-6 shrink-0 w-full md:w-56">
                <div className="w-40 h-40 rounded-[32px] bg-gradient-to-br from-orange-400 to-orange-600 font-black flex items-center justify-center text-white text-6xl shadow-[0_20px_50px_rgba(249,115,22,0.3)] relative group">
                    {user.avatar}
                    <div className="absolute inset-0 bg-black/10 rounded-[32px] transition-opacity flex items-center justify-center">
                        <Camera size={24} className="text-white/60" />
                    </div>
                </div>
                <div className="text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{t('dashboard.profile.verified', { defaultValue: 'Verified Citizen' })}</span>
                    </div>
                    <h3 className="font-black text-xl text-slate-900 dark:text-white leading-tight">{user.fullName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">{t('dashboard.profile.memberSince', { defaultValue: 'Joined' })} {user.memberSince}</p>
                </div>
            </div>

            {/* Right: Detailed Information */}
            <div className="flex-1 space-y-8">
                <div>
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                        {t('dashboard.profile.personalInfo', { defaultValue: 'Account Identity' })}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{t('dashboard.profile.regName', { defaultValue: 'Official Name' })}</label>
                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                {user.fullName}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{t('dashboard.profile.barangay', { defaultValue: 'Barangay' })}</label>
                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                {user.barangay}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                        {t('dashboard.profile.resAddress', { defaultValue: 'Residential Address' })}
                    </h4>
                    <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-[15px] font-bold text-slate-900 dark:text-white flex items-start gap-3 min-h-[56px]">
                        <div className="flex-1 leading-relaxed">
                            {user.address || "No complete address recorded. Please contact LGU for verification."}
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                        {t('dashboard.profile.connectivity', { defaultValue: 'Contact Connectivity' })}
                    </h4>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{t('dashboard.profile.secureEmail', { defaultValue: 'Secure Email' })}</label>
                            <div className="flex group focus-within:ring-2 ring-emerald-500/20 transition-all rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                <input
                                    type="email"
                                    value={user.email}
                                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                                    className="flex-1 bg-transparent px-5 py-3.5 text-[14px] font-bold text-slate-900 dark:text-white outline-none min-w-0"
                                />
                                <button
                                    onClick={() => handleUpdateProfile('email', user.email)}
                                    disabled={updatingProfile}
                                    className="bg-slate-100 dark:bg-slate-800 px-6 font-black text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 shrink-0"
                                >
                                    {updatingProfile ? '...' : 'Update'}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{t('dashboard.profile.mobileNumber', { defaultValue: 'Mobile Number' })}</label>
                            <div className="flex group focus-within:ring-2 ring-emerald-500/20 transition-all rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                <input
                                    type="tel"
                                    value={user.phone}
                                    onChange={(e) => setUser({ ...user, phone: e.target.value })}
                                    className="flex-1 bg-transparent px-5 py-3.5 text-[14px] font-bold text-slate-900 dark:text-white outline-none min-w-0"
                                />
                                <button
                                    onClick={() => handleUpdateProfile('phone', user.phone)}
                                    disabled={updatingProfile}
                                    className="bg-slate-100 dark:bg-slate-800 px-6 font-black text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 shrink-0"
                                >
                                    {updatingProfile ? '...' : 'Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
);

const SettingsView = ({ handleLogout, containerVariants, token, showToast, t }) => {
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [changing, setChanging] = useState(false);
    const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const getStrength = (pass) => {
        if (!pass) return { label: '', color: 'bg-slate-200 dark:bg-slate-800', width: '0%' };
        if (pass.length < 6) return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
        const hasLetters = /[a-zA-Z]/.test(pass);
        const hasNumbers = /[0-9]/.test(pass);
        const hasSpecial = /[^A-Za-z0-9]/.test(pass);

        if (pass.length >= 8 && hasLetters && hasNumbers && hasSpecial) return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
        if (pass.length >= 6 && hasLetters && hasNumbers) return { label: 'Medium', color: 'bg-orange-500', width: '66%' };
        return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
    };

    const handleUpdatePassword = (e) => {
        e.preventDefault();
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            showToast('Please fill in all password fields', 'error');
            return;
        }
        if (passwords.new !== passwords.confirm) {
            showToast('New passwords do not match', 'error');
            return;
        }
        if (passwords.new === passwords.current) {
            showToast('New password cannot be the same as the current password', 'error');
            return;
        }
        if (passwords.new.length < 6) {
            showToast('Password is too weak', 'error');
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

    const strength = getStrength(passwords.new);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 md:p-12">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('dashboard.settings.portal', { defaultValue: 'Security Portal' })}</h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">{t('dashboard.settings.portalDesc', { defaultValue: 'Manage your account protection and credentials' })}</p>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2.5 px-4 py-2.5 text-rose-500 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm">
                    <LogOut size={16} /> {t('dashboard.sidebar.signOut', { defaultValue: 'Sign Out' })}
                </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="max-w-2xl space-y-8">
                <div className="space-y-6">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        {t('dashboard.settings.identity', { defaultValue: 'Identity Verification' })}
                    </h4>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{t('dashboard.settings.currentPass', { defaultValue: 'Current Password' })}</label>
                        <div className="relative group focus-within:ring-2 ring-orange-500/20 transition-all rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                            <input
                                type={showPass.current ? "text" : "password"}
                                value={passwords.current}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-800/40 px-5 py-4 text-[15px] font-bold text-slate-900 dark:text-white outline-none"
                                placeholder="Enter existing password"
                            />
                            <button type="button" onClick={() => setShowPass({ ...showPass, current: !showPass.current })} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500">
                                {showPass.current ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-4">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        {t('dashboard.settings.transition', { defaultValue: 'Transition New Credentials' })}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{t('dashboard.settings.newPass', { defaultValue: 'New Password' })}</label>
                            <div className="relative group focus-within:ring-2 ring-blue-500/20 transition-all rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type={showPass.new ? "text" : "password"}
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800/40 pl-12 pr-12 py-4 text-[15px] font-bold text-slate-900 dark:text-white outline-none"
                                    placeholder="Enter secure password"
                                />
                                <button type="button" onClick={() => setShowPass({ ...showPass, new: !showPass.new })} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">
                                    {showPass.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{t('dashboard.settings.confirmPass', { defaultValue: 'Confirm New Password' })}</label>
                            <div className="relative group focus-within:ring-2 ring-blue-500/20 transition-all rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500">
                                    <Lock size={18} opacity={0.5} />
                                </span>
                                <input
                                    type={showPass.confirm ? "text" : "password"}
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800/40 pl-12 pr-12 py-4 text-[15px] font-bold text-slate-900 dark:text-white outline-none"
                                    placeholder="Verify new password"
                                />
                                <button type="button" onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">
                                    {showPass.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* High-Fidelity Security Strength HUD */}
                    {passwords.new && (() => {
                        const hasLength = passwords.new.length >= 8;
                        const hasCapital = /[A-Z]/.test(passwords.new);
                        const hasNumber = /[0-9]/.test(passwords.new);
                        const hasSpecial = /[^A-Za-z0-9]/.test(passwords.new);

                        let score = 0;
                        if (hasLength) score++;
                        if (hasCapital) score++;
                        if (hasNumber) score++;
                        if (hasSpecial) score++;

                        const getHUDLabel = () => {
                            if (score <= 1) return { text: 'WEAK', color: 'text-rose-500', bar: 'bg-rose-500' };
                            if (score === 2) return { text: 'MEDIUM', color: 'text-orange-500', bar: 'bg-orange-500' };
                            if (score >= 3) return { text: 'STRONG', color: 'text-emerald-500', bar: 'bg-emerald-500' };
                            return { text: '...', color: 'text-slate-400', bar: 'bg-slate-400' };
                        };
                        const hud = getHUDLabel();

                        return (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1">
                                    <span className="text-slate-500">{t('dashboard.settings.secStrength', { defaultValue: 'Security Strength' })}</span>
                                    <span className={hud.color}>{t(`auth.strength.${hud.text.toLowerCase()}`, { defaultValue: hud.text })}</span>
                                </div>

                                {/* Segmented Bar */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 3, 4].map(idx => (
                                        <div key={idx} className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <motion.div
                                                initial={{ x: '-100%' }}
                                                animate={{ x: idx <= score ? '0%' : '-100%' }}
                                                className={`h-full ${hud.bar}`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Requirement Badges */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {[
                                        { label: '8+ Chars', met: hasLength },
                                        { label: 'Capital A-Z', met: hasCapital },
                                        { label: 'Number 0-9', met: hasNumber },
                                        { label: 'Special #$!', met: hasSpecial },
                                    ].map((req, i) => (
                                        <div
                                            key={i}
                                            className={`px-3 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all duration-300 ${req.met
                                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400'
                                                }`}
                                        >
                                            {req.label}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })()}
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={changing || !passwords.new || !passwords.current}
                        className="group flex items-center gap-3 px-10 py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-full active:scale-95 transition-all text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 disabled:opacity-50"
                    >
                        <span>{changing ? t('dashboard.settings.securing', { defaultValue: 'Securing...' }) : t('dashboard.settings.updatePass', { defaultValue: 'Update Password' })}</span>
                    </button>
                </div>
            </form>

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
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0f172a] border border-slate-800 w-full max-w-md p-8 rounded-[32px] text-center relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-6">
                                <Lock size={32} className="text-orange-500" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3">{t('dashboard.settings.confirmTitle', { defaultValue: 'Change Password?' })}</h3>
                            <p className="text-slate-400 text-sm font-medium mb-8">
                                {t('dashboard.settings.confirmText', { defaultValue: 'Are you sure you want to update your security credentials? You will need to use your new password for all future logins.' })}
                            </p>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={actuallyUpdatePassword}
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest"
                                >
                                    {t('dashboard.settings.confirmBtn', { defaultValue: 'Confirm Change' })}
                                </button>
                                <button 
                                    onClick={() => setIsConfirmOpen(false)}
                                    className="w-full py-4 text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest transition-colors"
                                >
                                    Go Back
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
    'Roads & Bridges': {
        color: 'orange',
        icon: '🛣️',
        scope: [
            'Local city roads and barangay road repair',
            'Pothole patching and broken pavement',
            'Sidewalks, gutters, and drainage channels beside roads',
            'Pavement markings (pedestrian crossings, lane dividers)',
        ],
    },
    'Water & Drainage': {
        color: 'blue',
        icon: '💧',
        scope: [
            'De-clogging of blocked canals and manholes',
            'Pumping stations and estero flood control (city jurisdiction)',
            'Maintenance of public water fountains and toilets in city parks',
            'Note: Potable water supply (Maynilad) and major rivers are NOT covered',
        ],
    },
    'Street Lighting': {
        color: 'yellow',
        icon: '💡',
        scope: [
            'Installation and replacement of burned-out streetlight bulbs',
            'Repair of city-owned electrical wiring and lamp posts',
            'Ensuring nighttime safety along city and barangay roads',
        ],
    },
    'Public Safety & Regulatory': {
        color: 'red',
        icon: '🛡️',
        scope: [
            'Structural safety inspection of buildings (especially post-earthquake)',
            'Building permit evaluation — compliance with National Building Code',
            'Debris and fallen tree clearing after typhoons or disasters',
            'Fire safety and electrical compliance checks for new constructions',
        ],
    },
    'Public Facilities': {
        color: 'green',
        icon: '🏛️',
        scope: [
            'Construction and maintenance of public school buildings',
            'Barangay health centers and City Hall office repairs',
            'Basketball courts, plazas, and recreational areas',
            'Covered courts, parks, and other city-owned public spaces',
        ],
    },
};

const COLOR_MAP = {
    orange: { ring: 'ring-orange-500', bg: 'bg-orange-500/10 dark:bg-orange-500/15', dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-400', badge: 'bg-orange-500' },
    blue: { ring: 'ring-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/15', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-400', badge: 'bg-blue-500' },
    yellow: { ring: 'ring-yellow-500', bg: 'bg-yellow-500/10 dark:bg-yellow-500/15', dot: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-400', badge: 'bg-yellow-500' },
    red: { ring: 'ring-red-500', bg: 'bg-red-500/10 dark:bg-red-500/15', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', border: 'border-red-400', badge: 'bg-red-500' },
    green: { ring: 'ring-green-500', bg: 'bg-green-500/10 dark:bg-green-500/15', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400', border: 'border-green-400', badge: 'bg-green-500' },
};

const ReportCategoryRadio = ({ value, onChange, options, disabled = false, darkMode = false }) => {
    const [tooltip, setTooltip] = useState(null); // key of open tooltip
    const tooltipRef = useRef(null);

    // Ensure array format for toggling
    const selectedOptions = Array.isArray(value) ? value : [value];

    useEffect(() => {
        const handler = e => {
            if (tooltipRef.current && !tooltipRef.current.contains(e.target)) setTooltip(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleToggle = (opt) => {
        if (selectedOptions.includes(opt)) {
            if (selectedOptions.length > 1) {
                onChange(selectedOptions.filter(v => v !== opt));
            }
        } else {
            if (selectedOptions.length < 3) {
                onChange([...selectedOptions, opt]);
            }
        }
    };

    return (
        <div className={disabled ? 'opacity-40 grayscale pointer-events-none' : ''}>
            {/* Header — hidden in darkMode since parent renders it */}
            {!darkMode && (
                <div className="flex justify-between items-center mb-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Issue Type</p>
                    <p className="text-[10px] font-bold text-slate-400">Max 3 selections</p>
                </div>
            )}
            <div className="grid grid-cols-1 gap-1.5" ref={tooltipRef}>
                {options.map(opt => {
                    const meta = CATEGORY_META[opt];
                    const clr = COLOR_MAP[meta.color];
                    const selected = selectedOptions.includes(opt);
                    const infoOpen = tooltip === opt;
                    const atCapacity = !selected && selectedOptions.length >= 3;

                    if (darkMode) {
                        return (
                            <div key={opt} className="relative">
                                <div
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                                    style={{
                                        background: selected ? 'rgba(99,102,241,0.12)' : atCapacity ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                                        border: selected ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.07)',
                                        opacity: atCapacity ? 0.5 : 1,
                                        cursor: atCapacity ? 'not-allowed' : 'default',
                                    }}
                                >
                                    <button
                                        type="button"
                                        disabled={atCapacity}
                                        onClick={() => { handleToggle(opt); setTooltip(null); }}
                                        className="flex items-center gap-2.5 flex-1 text-left disabled:cursor-not-allowed"
                                    >
                                        <span
                                            className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                                            style={{
                                                border: selected ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.18)',
                                                background: selected ? 'rgba(99,102,241,0.2)' : 'transparent'
                                            }}
                                        >
                                            {selected && <span className="w-2 h-2 rounded-sm bg-indigo-400" />}
                                        </span>
                                        <span
                                            className="text-[13px] font-semibold leading-tight"
                                            style={{ color: selected ? '#a5b4fc' : '#94a3b8' }}
                                        >{opt}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); setTooltip(infoOpen ? null : opt); }}
                                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors"
                                        style={{
                                            border: infoOpen ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                            background: infoOpen ? '#6366f1' : 'transparent',
                                            color: infoOpen ? '#fff' : '#475569'
                                        }}
                                        title="What does this category cover?"
                                    >i</button>
                                </div>
                                {/* Dark popover */}
                                {infoOpen && (
                                    <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl shadow-2xl p-4 pointer-events-auto"
                                        style={{ background: '#0f1825', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">{meta.icon}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${clr.text}`}>{opt}</span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Scope of Service</p>
                                        <ul className="space-y-1">
                                            {meta.scope.map((line, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[11px] leading-snug" style={{ color: '#64748b' }}>
                                                    <span className={`mt-1 w-1.5 h-1.5 rounded-full ${clr.badge} shrink-0 opacity-80`} />
                                                    {line}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={opt} className="relative">
                            {/* Card row */}
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${selected
                                    ? `${clr.bg} ${clr.border} ring-1 ${clr.ring} shadow-sm`
                                    : atCapacity
                                        ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-60 cursor-not-allowed'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}>
                                {/* Checkbox — clicking toggles */}
                                <button
                                    type="button"
                                    disabled={atCapacity}
                                    onClick={() => { handleToggle(opt); setTooltip(null); }}
                                    className="flex items-center gap-3 flex-1 text-left disabled:cursor-not-allowed"
                                >
                                    <span className={`w-4 h-4 rounded shadow-sm border-2 flex items-center justify-center shrink-0 transition-all ${selected ? `${clr.border}` : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                        {selected && <span className={`w-2 h-2 rounded-[2px] ${clr.dot}`} />}
                                    </span>
                                    <span className={`text-sm font-bold leading-tight ${selected ? clr.text : 'text-slate-700 dark:text-slate-200'
                                        }`}>{opt}</span>
                                </button>
                                {/* Info button */}
                                <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); setTooltip(infoOpen ? null : opt); }}
                                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-colors border ${infoOpen
                                            ? `${clr.badge} text-white border-transparent`
                                            : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-slate-400 dark:hover:border-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                    title="What does this category cover?"
                                >i</button>
                            </div>

                            {/* Info popover */}
                            {infoOpen && (
                                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl shadow-black/20 p-4 pointer-events-auto">
                                    {/* Top accent */}
                                    <div className={`h-0.5 w-full rounded-full ${clr.badge} mb-3 -mt-1 opacity-70`} />
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <span className="text-xl">{meta.icon}</span>
                                        <span className={`text-xs font-black uppercase tracking-widest ${clr.text}`}>{opt}</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Scope of Service</p>
                                    <ul className="space-y-1.5">
                                        {meta.scope.map((line, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-snug">
                                                <span className={`mt-1 w-1.5 h-1.5 rounded-full ${clr.badge} shrink-0 opacity-80`} />
                                                {line}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const HazardCard = ({ hazard, getCategoryColor, getIconForCategory, setSelectedHazard, setHazardView, map, t }) => {
    const clr = getCategoryColor(hazard.category);
    
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white dark:bg-slate-800/40 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-700/50 hover:border-orange-500/50 transition-all p-5 shadow-sm hover:shadow-xl hover:-translate-y-1"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg`} style={{ background: `linear-gradient(135deg, ${clr}, ${clr}dd)` }}>
                        {getIconForCategory(hazard.category)}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{hazard.title}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{hazard.category}</p>
                    </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${hazard.status === 'resolved' ? 'bg-green-100 text-green-600 dark:bg-green-500/10' : 'bg-orange-100 text-orange-600 dark:bg-orange-500/10'}`}>
                    {hazard.status}
                </div>
            </div>
            
            <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <MapPin size={14} className="text-blue-500" />
                <span>{hazard.dynamicDistance || hazard.distance} away</span>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => {
                        setSelectedHazard(hazard);
                        setHazardView('map');
                        if (map) map.panTo({ lat: hazard.lat, lng: hazard.lng });
                    }}
                    className="flex-1 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                    <Map size={14} /> View on Map
                </button>
            </div>
        </motion.div>
    );
};

const HazardBoardView = ({ 
    displayHazards, hazardSearchQuery, setHazardSearchQuery, hazardFilterStatus, setHazardFilterStatus, 
    hazardFilterCategory, setHazardFilterCategory, getCategoryColor, getIconForCategory, 
    setSelectedHazard, setHazardView, map, t 
}) => {
    const statuses = ['all', 'pending', 'in-progress', 'resolved'];
    const categories = ['all', 'Road & Bridge', 'Water & Drainage', 'Street Lighting', 'Public Safety', 'LGU Facility'];

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-3xl p-6 sm:p-8">
            {/* Search & Filter Header */}
            <div className="mb-8 space-y-6">
                <div className="relative group max-w-2xl mx-auto">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search nearby hazards by name or category..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 outline-none shadow-sm transition-all"
                        value={hazardSearchQuery}
                        onChange={(e) => setHazardSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full">
                        {statuses.map(s => (
                            <button 
                                key={s} 
                                onClick={() => setHazardFilterStatus(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${hazardFilterStatus === s ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full">
                        {categories.map(c => (
                            <button 
                                key={c} 
                                onClick={() => setHazardFilterCategory(c)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${hazardFilterCategory === c ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {displayHazards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayHazards.map(h => (
                            <HazardCard 
                                key={h.id} 
                                hazard={h} 
                                getCategoryColor={getCategoryColor} 
                                getIconForCategory={getIconForCategory}
                                setSelectedHazard={setSelectedHazard}
                                setHazardView={setHazardView}
                                map={map}
                                t={t}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 mb-4 border border-slate-200 dark:border-slate-800">
                            <WifiOff size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Matching Hazards</h4>
                        <p className="text-slate-500 max-w-xs mx-auto">Try adjusting your filters or search query to see local incidents.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ResidentModals = ({
    activeModal, setActiveModal, selectedPost, setSelectedPost, isLoaded, map, setMap, panorama, setPanorama, reportLocation, setReportLocation,
    locationAddress, geocodingAddress, reportCategory, setReportCategory, reportNotes, setReportNotes, selectedImage, setSelectedImage,
    submittingReport, handleFileReport, isSelectingLocation, setIsSelectingLocation, isIDCameraOpen, setIsIDCameraOpen, checkJurisdiction,
    reverseGeocode, mapOptions, pulseRadius, processedHazards, displayHazards, selectedHazard, setSelectedHazard, 
    hazardView, setHazardView, hazardSearchQuery, setHazardSearchQuery, hazardFilterStatus, setHazardFilterStatus,
    hazardFilterCategory, setHazardFilterCategory,
    svLocation, handleStreetViewClick,
    getIconForCategory, getMarkerSVG, getCategoryColor, mapFilter, setMapFilter,
    isAnalyzing, aiFeedback, setAiFeedback, fileInputRef, handleFileSelect,
    reportToCancel, setReportToCancel, confirmCancelReport,
    isSubmitConfirmOpen, setIsSubmitConfirmOpen, actuallySubmitReport,
    locationDescription, setLocationDescription,
    isCooldown,
    selectedReport, setSelectedReport,
    reportTimeline, loadingTimeline,
    onLoad,
    t,
    currentUser
}) => {
    return (
        <AnimatePresence>
        {activeModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setActiveModal(null)}>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className={`pointer-events-auto ${activeModal === 'map'
                            ? 'w-full max-w-7xl h-[90vh] flex flex-col my-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[40px] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl'
                            : activeModal === 'file-report'
                                ? 'fixed z-[70] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-slate-200/50 dark:border-slate-800/50 w-[calc(100vw-2rem)] max-w-[1400px] h-[calc(100vh-2rem)] max-h-[900px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
                                : 'w-full max-w-xl flex flex-col my-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[40px] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl'
                        }`}

                    onClick={e => e.stopPropagation()}
                >
                    {activeModal === 'file-report' && (
                        <div className="flex flex-col h-full p-6 sm:p-8">
                             {/* Header */}
                             <div className="flex justify-between items-start mb-6 shrink-0">
                                 <div className="flex items-center gap-4">
                                     <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 ${isAnalyzing ? 'animate-pulse' : ''}`}>
                                         {isAnalyzing ? <Zap size={24} /> : <FileText size={24} />}
                                     </div>
                                     <div>
                                         <h3 className="font-black text-2xl text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                                             {t('dashboard.quickReport.title', { defaultValue: 'Quick Report' })}
                                             {isAnalyzing && <span className="text-[10px] bg-blue-500 text-white px-3 py-1 rounded-full font-black animate-pulse uppercase tracking-wider">{t('dashboard.quickReport.scanning', { defaultValue: 'Scanning...' })}</span>}
                                         </h3>
                                         <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5 opacity-80 uppercase tracking-widest text-[10px]">{aiFeedback ? `${t('dashboard.quickReport.aiDetected', { defaultValue: 'Assessment Complete' })}: ${aiFeedback.category}` : t('dashboard.quickReport.desc', { defaultValue: 'Snap a priority infrastructure hazard' })}</p>
                                     </div>
                                 </div>
                                 <button onClick={() => { setActiveModal(null); setAiFeedback(null); setSelectedImage(null); setReportNotes(''); setLocationDescription(''); setReportCategory([]); }} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full transition-all active:scale-90"><X size={24} /></button>
                             </div>
                               {/* Main Content Area - Scrollable for safety but optimized */}
                             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                                 {/* Verified Location Banner */}
                                 <div className="mb-6 p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl flex items-center gap-4 shrink-0 shadow-inner relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full" />
                                     <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                                         <MapPin size={20} />
                                     </div>
                                        <div className="flex-1 min-w-0">
                                            <div>
                                                {(() => {
                                                    // priority: 1. Deduced from 3-part pipe format 2. Regex in address 3. Fallback only if necessary
                                                    let finalBrgy = null;
                                                    
                                                    if (locationAddress) {
                                                        const parts = locationAddress.split('|').map(s => s.trim());
                                                        if (parts.length >= 3) {
                                                            finalBrgy = parts[2];
                                                        } else {
                                                            for (const p of parts) {
                                                                const match = p.match(/(Barangay|Brgy)\s+([A-Z0-9\-\s]+?)(?:,|$)/i);
                                                                if (match) {
                                                                    finalBrgy = match[0].replace(/,$/, '').trim();
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                    
                                                    if (!finalBrgy || finalBrgy.toLowerCase().includes('unknown')) {
                                                        finalBrgy = "Barangay Unknown";
                                                    }
                                                    
                                                    if (finalBrgy && finalBrgy.toLowerCase().startsWith('barangay barangay')) {
                                                        finalBrgy = finalBrgy.substring(9).trim();
                                                    }
                                                    
                                                })()}
                                            </div>
                                            <div className="flex flex-col gap-0.5" title={locationAddress}>
                                                {locationAddress ? (
                                                    locationAddress.includes('|') ? (
                                                        <div className="flex flex-col">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 opacity-90 mb-1">Verified Incident Location</p>
                                                            <span className="text-[13px] font-black tracking-tight text-slate-800 dark:text-slate-200 leading-tight">
                                                                {(() => {
                                                                    const parts = locationAddress.split('|').map(p => p.trim());
                                                                    const plus = parts[0] || "";
                                                                    let addr = parts[1] || "";
                                                                    const brgy = parts[2] || "Barangay Unknown";
                                                                    
                                                                    // Clean redundancy
                                                                    let cleanAddr = addr.replace(new RegExp(`,?\\s*${brgy}`, 'i'), '')
                                                                                        .replace(/,?\s*Caloocan(?: City)?/i, '')
                                                                                        .replace(/,?\s*Metro Manila/i, '')
                                                                                        .replace(/,?\s*Philippines/i, '')
                                                                                        .replace(/,$/, '')
                                                                                        .trim();
                                                                    
                                                                    // Add the final parts
                                                                    return `${plus}, ${cleanAddr}, ${brgy}, Caloocan, Metro Manila`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 opacity-90 mb-1">Verified Incident Location</p>
                                                            <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{locationAddress}</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 opacity-90 mb-1">Verified Incident Location</p>
                                                        <span className="text-[11px] text-slate-400 animate-pulse font-bold tracking-widest uppercase">Resolving precise location...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                     <div className="px-3 py-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm shrink-0">
                                         <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-500 tracking-wider">
                                             {reportLocation.lat.toFixed(4)}, {reportLocation.lng.toFixed(4)}
                                         </span>
                                     </div>
                                 </div>

                                 {/* Landscape 2-col layout */}
                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                     {/* LEFT — Camera / Photo */}
                                     <div className="flex flex-col gap-4 h-full">
                                         <div className="flex-1 min-h-[16rem] sm:min-h-[20rem] bg-slate-100/50 dark:bg-slate-900/50 rounded-[28px] p-1 shadow-inner border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
                                             {selectedImage
                                                 ? (
                                                     <div className="relative w-full h-full group bg-slate-950 rounded-[26px] overflow-hidden">
                                                         <img src={selectedImage} alt="Selected Issue" className="w-full h-full object-contain" />
                                                         <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity" />
                                                         <button
                                                             onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setAiFeedback(null); }}
                                                             className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-500 transition-all shadow-xl border border-white/20 active:scale-90"
                                                             title="Remove Image"
                                                         >
                                                             <X size={20} strokeWidth={3} />
                                                         </button>
                                                     </div>
                                                 )
                                                 : (
                                                     <div className="w-full h-full bg-white dark:bg-slate-800/40 rounded-[26px] flex flex-col items-center justify-center text-white border-2 border-dashed border-slate-200 dark:border-slate-800/60 hover:border-orange-500 dark:hover:border-orange-500/50 transition-all group p-6 text-center relative overflow-hidden">
                                                         <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-blue-500/5 transition-opacity" />
                                                         <div className="w-16 h-16 rounded-[24px] bg-orange-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                                             <Camera size={32} className="text-orange-500" />
                                                         </div>
                                                         <div className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Add Issue Photo</div>
                                                         <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 px-4 font-medium leading-relaxed">Technical photo required for AI triage.</p>
                                                         <div className="flex flex-col sm:flex-row gap-3 w-full relative z-10 px-2">
                                                             <button onClick={() => setIsIDCameraOpen(true)} className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2">
                                                                 <Camera size={14} /> Camera
                                                             </button>
                                                             <button onClick={() => fileInputRef.current?.click()} className="flex-1 px-4 py-3 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/50 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                                                                 <Upload size={14} /> Upload
                                                             </button>
                                                         </div>
                                                         <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                                     </div>
                                                 )
                                             }
                                         </div>
                                         <IDCameraModal
                                             isOpen={isIDCameraOpen}
                                             onClose={() => setIsIDCameraOpen(false)}
                                             onCapture={file => setSelectedImage(URL.createObjectURL(file))}
                                             title="Infrastructure Issue Photo"
                                             side="ISSUE"
                                             metadata={{
                                                 lat: reportLocation.lat,
                                                 lng: reportLocation.lng,
                                                 address: locationAddress
                                             }}
                                             guideText="Center the infrastructure issue in the frame"
                                         />
                                     </div>

                                     {/* RIGHT — Issue type + notes */}
                                     <div className="flex flex-col gap-6">
                                         <div className="relative group shrink-0">
                                             <ReportCategoryRadio
                                                 value={reportCategory}
                                                 onChange={setReportCategory}
                                                 options={REPORT_CATEGORIES(t)}
                                                 disabled={!selectedImage || isAnalyzing || aiFeedback?.category === 'Undetermined'}
                                             />
                                             {( !selectedImage || isAnalyzing || aiFeedback?.category === 'Undetermined' || aiFeedback?.category?.toUpperCase().includes('INAPPROPRIATE')) && (
                                                 <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] rounded-[28px] flex items-center justify-center z-10 border border-white/5 cursor-not-allowed">
                                                     <div className="bg-slate-900/90 px-4 py-2.5 rounded-xl border border-white/10 shadow-2xl flex items-center gap-2.5 active:scale-95 transition-transform">
                                                         <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isAnalyzing ? 'bg-blue-500/20' : aiFeedback?.category?.toUpperCase().includes('INAPPROPRIATE') ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
                                                             {isAnalyzing ? (
                                                                 <Zap size={14} className="text-blue-500 animate-pulse" />
                                                             ) : aiFeedback?.category?.toUpperCase().includes('INAPPROPRIATE') ? (
                                                                 <ShieldAlert size={14} className="text-red-500" />
                                                             ) : (
                                                                 <Lock size={14} className="text-orange-500" />
                                                             )}
                                                         </div>
                                                         <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
                                                             {isAnalyzing 
                                                                ? "AI Scanning Image..." 
                                                                : aiFeedback?.category?.toUpperCase().includes('INAPPROPRIATE') 
                                                                    ? "Inappropriate Content Blocked" 
                                                                    : aiFeedback?.category === 'Undetermined' 
                                                                        ? "Out of Scope / Undetermined" 
                                                                        : "Photo Required to Select Type"}
                                                         </span>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                              <div className="flex flex-col">
                                              <div className="flex items-center gap-3 mb-2.5 ml-1">
                                                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700/50">
                                                      <MapPin size={14} />
                                                  </div>
                                                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Exact Location Description</p>
                                              </div>
                                              <div className="h-20 relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:border-orange-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-800/40">
                                                  <textarea
                                                      className="w-full h-full bg-transparent text-slate-900 dark:text-white p-4 outline-none placeholder:text-slate-400/60 text-sm font-semibold tracking-tight resize-none transition-colors"
                                                      placeholder="e.g., '3 meters from the yellow street sign at the corner of...'"
                                                      value={locationDescription}
                                                      onChange={e => setLocationDescription(e.target.value)}
                                                  />
                                              </div>
                                              <p className="text-[10px] text-orange-500 mt-1 ml-1">
                                                  ⚠️ Please describe exactly where in the photo the issue is located
                                              </p>
                                          </div>
                                          
                                          <div className="flex flex-col">
                                              <div className="flex items-center gap-3 mb-2.5 ml-1">
                                                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700/50">
                                                      <MessageSquareText size={14} />
                                                  </div>
                                                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Additional Notes</p>
                                              </div>
                                              <div className="h-32 sm:h-40 relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:border-orange-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-800/40">
                                                  <textarea
                                                      className="w-full h-full bg-transparent text-slate-900 dark:text-white p-5 outline-none placeholder:text-slate-400/60 text-sm font-semibold tracking-tight resize-none transition-colors"
                                                      placeholder="Provide technical markers, landmarks, or specific damage details..."
                                                      value={reportNotes}
                                                      onChange={e => setReportNotes(e.target.value)}
                                                  />
                                                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent translate-y-full group-focus-within:translate-y-0 transition-transform" />
                                              </div>
                                          </div>
                                     </div>
                                 </div>
                             </div>

                             {/* Actions — pinned to bottom */}
                             <div className="flex gap-4 shrink-0 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
                                 <button className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 text-[10px] uppercase tracking-[0.2em] active:scale-95" onClick={() => { setActiveModal(null); setReportCategory([]); setAiFeedback(null); setSelectedImage(null); setReportNotes(''); setLocationDescription(''); }}>Cancel</button>
                                 <button
                                     className="flex-[2] py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black rounded-xl hover:shadow-[0_15px_40px_rgba(249,115,22,0.3)] transition-all disabled:opacity-30 disabled:grayscale disabled:pointer-events-none text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] relative overflow-hidden group"
                                     onClick={handleFileReport}
                                     disabled={submittingReport || !selectedImage || isAnalyzing || aiFeedback?.category === 'Undetermined' || aiFeedback?.category?.toUpperCase().includes('INAPPROPRIATE') || reportCategory.length === 0}
                                 >
                                     <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12" />
                                     <span className="relative z-10">{submittingReport ? 'Encrypting…' : 'Finalize & Submit Report'}</span>
                                 </button>
                             </div>
                        </div>
                    )}

                    {activeModal === 'map' && (
                        <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Nearby Hazards</h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">Live technical incidents board</p>
                                </div>
                                
                                {/* View Toggle */}
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner group">
                                    <button 
                                        onClick={() => setHazardView('map')}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${hazardView === 'map' ? 'bg-white dark:bg-slate-700 text-orange-500 shadow-lg shadow-black/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        <Map size={14} className={hazardView === 'map' ? 'text-orange-500' : ''} /> Map View
                                    </button>
                                    <button 
                                        onClick={() => setHazardView('board')}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${hazardView === 'board' ? 'bg-white dark:bg-slate-700 text-orange-500 shadow-lg shadow-black/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        <LayoutGrid size={14} className={hazardView === 'board' ? 'text-orange-500' : ''} /> List Board
                                    </button>
                                </div>

                                <button onClick={() => setActiveModal(null)} className="p-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="flex-1 relative overflow-hidden">
                                {hazardView === 'board' ? (
                                    <HazardBoardView 
                                        displayHazards={displayHazards}
                                        hazardSearchQuery={hazardSearchQuery}
                                        setHazardSearchQuery={setHazardSearchQuery}
                                        hazardFilterStatus={hazardFilterStatus}
                                        setHazardFilterStatus={setHazardFilterStatus}
                                        hazardFilterCategory={hazardFilterCategory}
                                        setHazardFilterCategory={setHazardFilterCategory}
                                        getCategoryColor={getCategoryColor}
                                        getIconForCategory={getIconForCategory}
                                        setSelectedHazard={setSelectedHazard}
                                        setHazardView={setHazardView}
                                        map={map}
                                        t={t}
                                    />
                                ) : (
                                    isLoaded && (
                                        <GoogleMap 
                                            mapContainerStyle={{ width: '100%', height: '100%' }} 
                                            center={reportLocation} 
                                            zoom={13} 
                                            options={mapOptions}
                                            onLoad={onLoad}
                                        >
                                            {/* Animated Wave Sonar Overlay for User Location */}
                                            <OverlayViewF
                                                position={reportLocation}
                                                mapPaneName="overlayMouseTarget"
                                                getPixelPositionOffset={() => ({ x: -24, y: -24 })}
                                            >
                                                <div className="relative flex items-center justify-center w-12 h-12">
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
                                            {processedHazards.map(h => <MarkerF key={h.id} position={{ lat: h.lat, lng: h.lng }} onClick={() => setSelectedHazard(h)} icon={{ url: getMarkerSVG(h.category, h.status), scaledSize: new window.google.maps.Size(40, 46) }} />)}
                                            {selectedHazard && (
                                                <InfoWindowF position={{ lat: selectedHazard.lat, lng: selectedHazard.lng }} onCloseClick={() => setSelectedHazard(null)}>
                                                    {(() => {
                                                        const catColor = getCategoryColor(selectedHazard.category);
                                                        return (
                                                            <div style={{ background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', borderRadius: '16px', padding: '18px', minWidth: '230px', border: '1px solid rgba(255,255,255,0.07)', margin: '-10px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)', fontFamily: 'Inter,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                                                                <button onClick={() => setSelectedHazard(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>×</button>
                                                                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: `${catColor}20`, border: `1px solid ${catColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: catColor }}><AlertTriangle size={20} /></div>
                                                                <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', color: selectedHazard.status === 'resolved' ? '#4ade80' : '#fb923c', background: selectedHazard.status === 'resolved' ? 'rgba(74,222,128,0.12)' : 'rgba(251,146,60,0.12)', padding: '3px 12px', borderRadius: '999px', marginBottom: '10px', textTransform: 'uppercase' }}>{selectedHazard.status}</div>
                                                                <h4 style={{ fontWeight: 700, fontSize: '15px', color: '#f1f5f9', lineHeight: '1.35', margin: '0 0 4px', padding: '0 20px' }}>{selectedHazard.title}</h4>
                                                                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', color: catColor, marginBottom: '12px', textTransform: 'uppercase' }}>{selectedHazard.category}</p>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '5px 14px', marginBottom: '8px' }}>
                                                                    <span style={{ color: catColor, display: 'flex' }}><MapPin size={12} /></span>
                                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>{selectedHazard.dynamicDistance || selectedHazard.distance} away</span>
                                                                </div>
                                                                {selectedHazard.displayAddress && selectedHazard.displayAddress !== 'N/A' && (
                                                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px', maxWidth: '200px', fontWeight: 500, lineHeight: '1.4' }}>
                                                                        {selectedHazard.displayAddress}
                                                                    </div>
                                                                )}
                                                                <button onClick={() => handleStreetViewClick({ lat: selectedHazard.lat, lng: selectedHazard.lng })} style={{ width: '100%', padding: '11px 0', background: `linear-gradient(135deg,${catColor},${catColor}dd)`, border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 20px ${catColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                    <Eye size={14} /> Open Street View
                                                                </button>
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
                                                        options={{ enableCloseButton: false }}
                                                        onLoad={(pano) => setPanorama(pano)}
                                                    />
                                                    {/* Floating Back Button */}
                                                    <div className="absolute top-4 left-4 z-10">
                                                        <button
                                                            onClick={() => handleStreetViewClick(null)}
                                                            className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] font-bold px-4 py-2.5 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                                                        >
                                                            <ArrowRight size={14} className="rotate-180" /> Back to Map
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </GoogleMap>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                    {activeModal === 'services' && (
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">LGU Services</h3>
                                    <p className="text-slate-500 font-medium">Official Digital Portal Services</p>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {LGU_SERVICES_LIST(t).map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => window.open(service.url, '_blank')}
                                        className="flex items-start gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-orange-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group"
                                    >
                                        <div className={`w-12 h-12 rounded-2xl bg-${service.color}-500/10 text-${service.color}-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                            {service.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">{service.name}</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium">{service.desc}</p>
                                            <span className="text-[10px] font-black uppercase text-orange-500 mt-2 inline-block tracking-widest group-hover:translate-x-1 transition-transform">Apply Now →</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeModal === 'knowledge' && (
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Knowledge Base</h3>
                                    <p className="text-slate-500 font-medium">Guides, Tips & Information Hub</p>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
                            </div>
                            <div className="space-y-4">
                                {KNOWLEDGE_BASE_ARTICLES(t).map(article => (
                                    <button key={article.id} className="w-full p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-orange-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all text-left flex flex-col items-start gap-1">
                                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">{article.category}</span>
                                        <h4 className="font-bold text-lg text-slate-900 dark:text-white">{article.title}</h4>
                                        <p className="text-sm text-slate-500 font-medium">{article.excerpt}</p>
                                        <div className="mt-2 h-0 w-0 group-hover:w-full border-b border-orange-500 transition-all"></div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-8 p-4 bg-orange-500 text-white rounded-3xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><Info size={20} /></div>
                                    <div><p className="text-sm font-bold">Need more help?</p><p className="text-[10px] opacity-80">Message our AI Assistant available 24/7.</p></div>
                                </div>
                                <button className="px-5 py-2 bg-white text-orange-500 rounded-2xl font-black text-xs uppercase shadow-lg">Chat Support</button>
                            </div>
                        </div>
                    )}

                    {activeModal.startsWith('calling-') && (() => {
                        const hotlineName = activeModal.split('calling-')[1];
                        const hotlineList = EMERGENCY_HOTLINES(t);
                        const hotline = hotlineList.find(h => h.name === hotlineName) || hotlineList[0];
                        return (
                            <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center relative overflow-hidden">
                                {/* Calling HUD Background Animation */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <motion.div
                                        animate={{ scale: [1, 1.5], opacity: [0.15, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                        className="w-64 h-64 rounded-full border-4 border-orange-500/20"
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.8], opacity: [0.1, 0] }}
                                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut", delay: 0.5 }}
                                        className="w-64 h-64 rounded-full border-2 border-orange-500/10"
                                    />
                                </div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                    className="relative z-10"
                                >
                                    <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-white mb-8 mx-auto shadow-[0_0_40px_rgba(249,115,22,0.4)] animate-pulse">
                                        <PhoneCall size={42} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/80 mb-2">Connecting to Secure Line</h3>
                                    <h2 className="text-3xl font-black text-white mb-1">{hotline?.name || 'Emergency Line'}</h2>
                                    <p className="text-xl font-mono font-bold text-slate-400 tracking-tighter mb-10">{hotline?.num || '---'}</p>

                                    <div className="flex items-center gap-6 mb-12">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                                <MicOff size={20} />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mute</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                                <Volume2 size={20} />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Speaker</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-[0_15px_30px_rgba(220,38,38,0.3)] active:scale-90 transition-all group"
                                    >
                                        <X size={32} strokeWidth={3} className="rotate-45" />
                                    </button>
                                    <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest mt-4">End Call</p>
                                </motion.div>
                            </div>
                        );
                    })()}

                    {activeModal === 'privacy' && (
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-2xl font-black text-slate-900 dark:text-white">{t('dashboard.footer.privacy', { defaultValue: 'Privacy Policy' })}</h3><p className="text-slate-500 font-medium text-xs">PULSO Data Protection standards</p></div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="space-y-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed overflow-y-auto max-h-[60vh] custom-scrollbar pr-4">
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-orange-500/30 underline-offset-4">{t('dashboard.privacy.s1_title', { defaultValue: '1. Information Collection' })}</h4>
                                    <p>{t('dashboard.privacy.s1_desc', { defaultValue: 'PULSO collects data relevant to infrastructure reporting, including precise GPS coordinates, photographic evidence, and resident account details for verification purposes.' })}</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-orange-500/30 underline-offset-4">2. Digital Stewardship</h4>
                                    <p>Your data is stored in encrypted government-grade servers. We do not sell or share citizen data with 3rd party advertising entities.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-orange-500/30 underline-offset-4">3. AI Analysis Disclosure</h4>
                                    <p>Triage automation uses Gemini AI to analyze report photos. No resident facial biometric data is stored or used for surveillance.</p>
                                </section>
                            </div>
                        </div>
                    )}

                    {activeModal === 'terms' && (
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-2xl font-black text-slate-900 dark:text-white">{t('dashboard.footer.terms', { defaultValue: 'Terms of Service' })}</h3><p className="text-slate-500 font-medium text-xs">Resident User agreement for reporting</p></div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="space-y-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed overflow-y-auto max-h-[60vh] custom-scrollbar pr-4">
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500/30 underline-offset-4">{t('dashboard.terms.s1_title', { defaultValue: '1. Integrity Clause' })}</h4>
                                    <p>{t('dashboard.terms.s1_desc', { defaultValue: 'Residents are accountable for the accuracy of their reports. Fraudulent reporting will result in immediate Trust Score reduction and possible service restrictions.' })}</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500/30 underline-offset-4">2. Citizen Conduct</h4>
                                    <p>Harassment, abusive language, or uploading unrelated media to the engineering portal is strictly prohibited.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500/30 underline-offset-4">3. Jurisdiction</h4>
                                    <p>PULSO North Caloocan applies only to incidents within the city boundary as defined by the LGU mapping department.</p>
                                </section>
                            </div>
                        </div>
                    )}
                    {activeModal === 'post-details' && selectedPost && (
                        <div className="flex flex-col h-full max-h-[85vh]">
                            <div className="p-8 pb-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-100 dark:border-orange-500/20 shrink-0">
                                            <Bell size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight pr-4">{selectedPost.department}</h3>
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">{new Date(selectedPost.created_at).toLocaleDateString()} • Ref: {selectedPost.advisory_id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"><X size={24} /></button>
                                </div>
                            </div>
                            <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Issued By</p>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">Caloocan Command Center</p>
                                        </div>
                                </div>
                            </div>
                                <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-full transition-all backdrop-blur-md border border-white/10 z-10">
                                <X size={20} className="text-white md:text-slate-400" />
                            </button>
                        </div>
                    )}

                    {activeModal === 'cookies' && (
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-2xl font-black text-slate-900 dark:text-white">{t('dashboard.footer.cookie', { defaultValue: 'Cookie Policy' })}</h3><p className="text-slate-500 font-medium text-xs">How we manage your portal session</p></div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="space-y-6 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed overflow-y-auto max-h-[60vh] custom-scrollbar pr-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl mb-4">
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

        {/* --- Report Details Modal --- */}
        {activeModal === 'report-details' && selectedReport && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 30 }}
                    className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="h-2/5 relative bg-slate-100 dark:bg-slate-950">
                        {selectedReport.image_url ? (
                            <img src={`${API_BASE_URL}${selectedReport.image_url}`} alt="Report Verification" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                <div className="p-8 rounded-full bg-slate-200 dark:bg-slate-800 translate-y-[-10px]">
                                    <CameraOff size={48} />
                                </div>
                                <p className="font-black uppercase tracking-widest text-xs">No Visual Evidence Attached</p>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 md:p-12">
                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                <span className="px-5 py-2 bg-white text-slate-900 text-[11px] font-black uppercase tracking-widest rounded-full shadow-2xl">
                                    {selectedReport.ticket_id}
                                </span>
                                <div className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border backdrop-blur-md shadow-2xl ${
                                    selectedReport.status?.toLowerCase() === 'resolved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                    selectedReport.status?.toLowerCase() === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                    selectedReport.status?.toLowerCase() === 'validated' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                    'bg-slate-500/20 text-slate-300 border-slate-500/30'
                                }`}>
                                    Status: {selectedReport.status}
                                </div>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-2xl line-clamp-2">
                                {selectedReport.description}
                            </h2>
                        </div>
                        <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 dark:bg-slate-800/50 rounded-full transition-all backdrop-blur-md border border-white/20 z-10 text-white">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-2 space-y-12">
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-900 flex items-center justify-center text-white shadow-lg shadow-blue-900/40">
                                            <FileText size={20} />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Report Insight</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800/50">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Category</p>
                                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                                                {getIconForCategory(selectedReport.category)}
                                                {selectedReport.category}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800/50">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Location</p>
                                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                                                <MapPin size={16} className="text-rose-500" />
                                                <span className="truncate">{selectedReport.location_string}</span>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800/50">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Reported on</p>
                                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                                                <Calendar size={16} className="text-blue-500" />
                                                {new Date(selectedReport.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800/50">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Reporter</p>
                                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                                                <User size={16} className="text-slate-400" />
                                                {selectedReport.reporter_name || 'Anonymous Resident'}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {selectedReport.ai_summary && (
                                    <section className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[32px] border border-blue-100 dark:border-blue-900/20">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Brain size={20} className="text-blue-600" />
                                            <h4 className="text-sm font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest">AI Operational Assessment</h4>
                                        </div>
                                        <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed text-[14px]">
                                            {selectedReport.ai_summary}
                                        </p>
                                    </section>
                                )}
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/40">
                                        <History size={20} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Live Tracking</h3>
                                </div>

                                <div className="relative pl-6 space-y-8">
                                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800" />
                                    
                                    {loadingTimeline ? (
                                        <div className="space-y-8">
                                            {[1,2,3].map(i => (
                                                <div key={i} className="animate-pulse flex gap-4">
                                                    <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-800 -translate-x-[25px] mt-1.5" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                                                        <div className="h-3 w-40 bg-slate-50 dark:bg-slate-800/50 rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : reportTimeline && reportTimeline.length > 0 ? (
                                        reportTimeline.map((step, idx) => (
                                            <div key={idx} className="relative">
                                                <div className={`absolute left-[-24.5px] top-1.5 w-3 h-3 rounded-full border-2 ${idx === 0 ? 'bg-orange-500 border-orange-200 dark:border-orange-500/50 shadow-lg shadow-orange-500/20' : 'bg-slate-300 dark:bg-slate-700 border-white dark:border-slate-900'}`} />
                                                <div>
                                                    <p className={`text-sm font-black uppercase tracking-widest ${idx === 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                                        {step.status_display || step.status}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                                        {new Date(step.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </p>
                                                    {step.official_notes && (
                                                        <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                                            <p className="text-[13px] text-slate-600 dark:text-slate-400 italic">"{step.official_notes}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-slate-500 text-xs font-medium italic">Waiting for government validation...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                             <div className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center gap-2">
                                <Activity size={16} className="text-blue-500" />
                                {selectedReport.status === 'resolved' ? 'Resolution Complete' : 'Operational Tracking Active'}
                             </div>
                        </div>
                        <button 
                            onClick={() => setActiveModal(null)}
                            className="px-10 py-4 bg-blue-900 hover:bg-blue-800 text-white font-black rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 text-sm uppercase tracking-widest"
                        >
                            Close Intel
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}

        {/* --- Submit Final Confirmation Modal --- */}
        {isSubmitConfirmOpen && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setIsSubmitConfirmOpen(false)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,1)] p-12 flex flex-col items-center text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />

                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-[0_20px_50px_rgba(249,115,22,0.3)] mb-8 rotate-3">
                        <ShieldCheck size={48} className="text-white drop-shadow-lg" />
                    </div>

                    <div className="space-y-3 mb-10">
                        <h3 className="text-3xl font-black text-white tracking-tight leading-none">Ready to Submit?</h3>
                        <p className="text-slate-400 text-base font-medium leading-relaxed px-2">
                            Please ensure all details are <span className="text-white">accurate and real</span>. Generating false reports is a serious violation.
                        </p>
                        <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                            <p className="text-sm font-bold text-orange-400">
                                ⚠️ If your report is found to be fraudulent, your <span className="underline decoration-2">Trust Score (Integrity Level)</span> will be reduced.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full">
                        <button
                            onClick={actuallySubmitReport}
                            disabled={isCooldown}
                            className={`group relative w-full py-5 font-black rounded-2xl overflow-hidden active:scale-95 transition-all text-base uppercase tracking-widest shadow-xl ${isCooldown ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white text-[#0f172a]'}`}
                        >
                            <span className="relative z-10">{isCooldown ? 'Cooldown Active...' : 'Finalize & Submit'}</span>
                            {!isCooldown && <div className="absolute inset-0 bg-gradient-to-r from-white via-slate-100 to-white transition-opacity" />}
                        </button>
                        <button
                            onClick={() => setIsSubmitConfirmOpen(false)}
                            className="w-full py-4 text-slate-500 hover:text-white font-black text-xs uppercase tracking-[0.2em] transition-colors"
                        >
                            Never mind, let me double check
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}

        {/* --- Custom High-Fidelity Retract Confirmation Modal --- */}
        {reportToCancel && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setReportToCancel(null)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-[32px] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.5)] p-10 flex flex-col items-center text-center space-y-6"
                >
                    <div className="w-24 h-24 rounded-full border-4 border-orange-500/30 flex items-center justify-center shadow-[0_0_40_rgba(249,115,22,0.1)] relative">
                        <div className="absolute inset-0 rounded-full animate-ping bg-orange-500/10" style={{ animationDuration: '3s' }}></div>
                        <AlertTriangle size={48} className="text-orange-500" strokeWidth={1.5} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-3xl font-black text-white tracking-tight">Cancel Report?</h3>
                        <p className="text-slate-400 text-[15px] font-medium leading-relaxed px-4">
                            Are you sure you want to retract this report? This action <span className="text-orange-400 font-bold">cannot be undone</span> and will be logged in your activity history.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                        <button
                            onClick={() => confirmCancelReport(reportToCancel)}
                            className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-[15px] uppercase tracking-wider"
                        >
                            Yes, Retract it!
                        </button>
                        <button
                            onClick={() => setReportToCancel(null)}
                            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl active:scale-95 transition-all text-[15px] border border-slate-700 uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
    );
};

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
    handleSearch,
    showSearchDropdown,
    setShowSearchDropdown,
    user,
    navItems,
    showToast,
    i18n,
    t
}) => (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 w-full relative">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">

            {/* Left Area: Logo & Search (Facebook Style) */}
            <div className="flex items-center gap-4 w-1/4 min-w-[200px] relative">
                <a href="/dashboard" className="flex items-center gap-2 group focus:outline-none shrink-0" onClick={(e) => { e.preventDefault(); handleSetTab('overview'); }}>
                    <Branding size="h-9" showText={false} />
                    <span className="font-extrabold text-2xl tracking-tight text-orange-500 hidden xl:block">PULSO</span>
                </a>

                <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 rounded-full items-center px-4 py-2 border border-transparent focus-within:border-orange-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all w-full max-w-[240px] relative">
                    <Search size={18} className="text-slate-400 shrink-0" />
                    <input
                        type="text"
                        placeholder={t('dashboard.topNav.searchPlaceholder', { defaultValue: 'Search PULSO...' })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-[15px] ml-2 w-full text-slate-900 dark:text-white placeholder-slate-500"
                        onFocus={() => setShowSearchDropdown(true)}
                        onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                    />
                    {/* Mock Search Dropdown */}
                    <AnimatePresence>
                        {showSearchDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="absolute top-12 left-0 w-full min-w-[300px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-slate-900 dark:text-white"
                            >
                                <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">{t('dashboard.topNav.recentSearches', { defaultValue: 'Recent Searches' })}</div>
                                <button className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm flex items-center gap-2"><Clock size={14} /> Water Interruption Schedule</button>
                                <button className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm flex items-center gap-2"><Clock size={14} /> Engineering Contact Number</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Center Navigation Tabs */}
            <nav className="flex items-center justify-center gap-2 md:gap-4 lg:gap-8 h-full flex-1 max-w-[600px]">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleSetTab(item.id)}
                        className={`relative h-full px-2 sm:px-4 lg:px-8 flex flex-col items-center justify-center transition-colors group focus:outline-none 
                            ${activeTab === item.id
                                ? 'text-orange-500'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <div className="relative">
                            {React.cloneElement(item.icon, {
                                className: `transition-transform duration-200 ${activeTab === item.id ? 'stroke-[2.5px]' : 'group-hover:scale-110'}`
                            })}
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold mt-0.5 hidden sm:block whitespace-nowrap truncate max-w-[80px] md:max-w-[120px] lg:max-w-[150px] px-1">{item.label}</span>

                        {/* Active Tab Indicator */}
                        {activeTab === item.id && (
                            <motion.div layoutId="activeTabBottom" className="absolute bottom-0 left-0 right-0 h-[3px] bg-orange-500 rounded-t-full" />
                        )}
                    </button>
                ))}
            </nav>

            {/* Right Area: Profile & Settings */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 w-1/4 min-w-[200px]">



                {/* Theme Toggle menu item */}
                <div className="hidden lg:flex bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700/50 mr-2">
                    <button onClick={() => changeTheme('light')} className={`p-1.5 rounded-full transition-all flex justify-center ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`} title="Light"><Sun size={15} /></button>
                    <button onClick={() => changeTheme('system')} className={`p-1.5 rounded-full transition-all flex justify-center ${theme === 'system' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`} title="System"><Monitor size={15} /></button>
                    <button onClick={() => changeTheme('dark')} className={`p-1.5 rounded-full transition-all flex justify-center ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`} title="Dark"><Moon size={15} /></button>
                </div>

                <div className="relative">
                    <button
                        className="relative w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {notifications.length > 0 && notifications.some(n => !n.is_read && !n.is_hidden) && (
                            <span className="absolute top-[8px] right-[10px] w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-100 dark:ring-slate-800"></span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-12 right-0 w-[320px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-700 p-3 z-50 text-slate-900 dark:text-white"
                            >
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <h3 className="font-bold text-lg">Notifications</h3>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="text-orange-500 text-xs font-bold hover:underline shrink-0"
                                        >
                                            Mark all as read
                                        </button>
                                        <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {notifications.filter(n => !n.is_hidden).length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-500">No new notifications</div>
                                    ) : (
                                        notifications.filter(n => !n.is_hidden).map(notification => (
                                            <div key={notification.id} className="relative group block w-full">
                                                <button 
                                                    onClick={() => handleNotificationClick(notification)}
                                                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex gap-3 overflow-hidden pr-10"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white pr-2">{notification.title}</p>
                                                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{notification.message}</p>
                                                        <span className="text-[10px] text-blue-500 font-bold mt-1 block">{new Date(notification.created_at).toLocaleString()}</span>
                                                    </div>
                                                    {!notification.is_read && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-4 right-3 group-hover:opacity-0 transition-opacity"></div>
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_hidden: true } : n));
                                                        try {
                                                            await fetch(`${API_BASE_URL}/api/notifications/${notification.id}`, {
                                                                method: 'DELETE',
                                                                headers: { 'Authorization': `Bearer ${token}` }
                                                            });
                                                        } catch (err) {
                                                            console.error("Delete error:", err);
                                                        }
                                                    }}
                                                    title="Dismiss notification"
                                                    className="absolute top-3 right-2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all z-10"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <button onClick={() => { setShowNotifications(false); handleSetModal('all-notifications'); }} className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mt-2 py-2 border-t border-slate-100 dark:border-slate-800">See previous notifications</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-10 h-10 ml-2 flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:hover:bg-red-900/50 rounded-full transition-colors focus:outline-none"
                    title="Sign Out"
                >
                    <LogOut size={18} />
                </button>

                <button onClick={() => handleSetTab('profile')} className="w-10 h-10 ml-2 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold flex items-center justify-center text-white shadow-sm shrink-0 hover:opacity-90 transition-opacity focus:outline-none cursor-pointer">
                    {user.avatar}
                </button>
            </div>
        </div>
    </header>
);

export default function ResidentDashboard() {
    const { t, i18n } = useTranslation();
    const { theme, changeTheme } = useTheme();
    const navigate = useNavigate();
    const { throttleAction, isCooldown, startCooldown } = useInteractionHarden();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [activeModal, setActiveModal] = useState(null); // 'file-report', 'post-details'
    const [zoomedImage, setZoomedImage] = useState(null);
    const [reportToCancel, setReportToCancel] = useState(null);
    const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);

    // Centralized modal cleanup: Ensures all report form states are reset whenever any modal is closed
    // (Handles X button, Cancel button, and Backdrop clicks)
    useEffect(() => {
        if (!activeModal) {
            setReportCategory([]);
            setAiFeedback(null);
            setSelectedImage(null);
            setReportNotes('');
        }
    }, [activeModal]);

    // Auth State - Initialize synchronously from localStorage to prevent race conditions on reload
    const [token, setToken] = useState(() => localStorage.getItem('pulso_token'));
    const [currentUser, setCurrentUser] = useState(() => {
        const storedUser = localStorage.getItem('pulso_user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

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

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    });

    const [pulseRadius, setPulseRadius] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPulseRadius(prev => (prev + 1) % 40); // Pulse scale from 0 to 40
        }, 40);
        return () => clearInterval(interval);
    }, []);

    const checkJurisdiction = (location) => {
        // Legacy manual check preserved for now as a fallback, 
        // but visual boundary is now managed by Google Maps DDS
        return true; 
    };

    const mapOptions = React.useMemo(() => ({
        styles: theme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        mapId: theme === 'dark' ? null : (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '42e0e28462d4a298b3b3eb3f')
    }), [theme]);

    // Map state must be declared BEFORE the onLoad useCallback that closes over setMap
    const [map, setMap] = useState(null);
    const [panorama, setPanorama] = useState(null);
    const [svLocation, setSvLocation] = useState(null);

    const onLoad = React.useCallback((mapInstance) => {
        setMap(mapInstance);
        
        try {
            // Apply Data-Driven Styling for Caloocan City Boundary
            // Note: getFeatureLayer requires a valid mapId in mapOptions (disabled in dark mode)
            const featureLayer = mapInstance.getFeatureLayer('LOCALITY');
            
            if (featureLayer) {
                featureLayer.style = (options) => {
                    if (options.feature.placeId === CALOOCAN_CITY_PLACE_ID) {
                        return {
                            fillColor: '#6366f1',
                            fillOpacity: 0.15,
                            strokeColor: '#6366f1',
                            strokeWeight: 3,
                            strokeOpacity: 0.8
                        };
                    }
                };
                console.log("PULSO: DDS Localized styling applied for Caloocan.");
            } else {
                console.log("PULSO: Data-Driven Styling boundary layer skipped (expected in dark mode or if mapId is missing)");
            }
        } catch (err) {
            console.warn("PULSO: Error applying map boundary styling:", err);
        }
    }, [setMap]);

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

    const handleSetTab = (tab) => {
        console.log(`PULSO: Switching tab: ${activeTab} -> ${tab}`);
        setActiveTab(tab);
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

    const showToast = (message, type = 'success') => {
        // Robust check to prevent rendering objects as React children which crashes the UI
        const finalMsg = typeof message === 'string' ? message : (
            Array.isArray(message) && message[0]?.msg
                ? message[0].msg
                : JSON.stringify(message)
        );
        setToast({ message: finalMsg, type });
        setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
    };

    const [lguUpdates, setLguUpdates] = useState([]);
    const [loadingAdvisories, setLoadingAdvisories] = useState(true);

    // New State for User Reports
    const [userReports, setUserReports] = useState([]);
    const [publicHazards, setPublicHazards] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [reportStatusFilter, setReportStatusFilter] = useState('all');
    const [selectedReport, setSelectedReport] = useState(null);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [reportTimeline, setReportTimeline] = useState([]);

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/login';
    };

    const handleSearch = (query) => {
        if (query) {
            showToast(`Searching for: ${query}`);
        }
    };

    const getIconForCategory = (category) => {
        switch (category) {
            case 'Public Works': return <HardHat size={18} className="text-orange-500" />;
            case 'Utilities': return <Droplets size={18} className="text-blue-500" />;
            case 'Advisory': return <ShieldAlert size={18} className="text-red-500" />;
            default: return <ShieldCheck size={18} className="text-slate-500" />;
        }
    };

    const fetchUserReports = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const result = await handleApiError(response);
            if (result.ok) {
                setUserReports(result.data);
                setUser(prev => ({ ...prev, reportsCount: result.data.length }));
            } else {
                showToast(result.message);
            }
        } catch (error) {
            console.error("PULSO: Error fetching reports:", error);
            showToast('Failed to load reports');
        } finally {
            setLoadingReports(false);
        }
    };

    const fetchPublicHazards = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/public`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const result = await handleApiError(response);
            if (result.ok) {
                setPublicHazards(result.data);
            }
        } catch (error) {
            console.error("PULSO: Error fetching public hazards:", error);
        }
    };

    const fetchReportTimeline = async (reportId) => {
        setLoadingTimeline(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/timeline`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await handleApiError(response);
            if (result.ok) {
                setReportTimeline(result.data);
            }
        } catch (error) {
            console.error("PULSO: Error fetching timeline:", error);
        } finally {
            setLoadingTimeline(false);
        }
    };

    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const result = await handleApiError(response);
            if (result.ok) {
                setNotifications(result.data);
            } else {
                showToast(result.message);
            }
        } catch (error) {
            console.error("PULSO: Error fetching notifications:", error);
            showToast('Failed to load notifications');
        }
    };

    const handleMarkAllRead = async () => {
        if (!currentUser) return;
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        try {
            await fetch(`${API_BASE_URL}/api/notifications/user/${currentUser.id}/read-all`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Mark all read failed:", err);
        }
    };

    const handleViewReport = (report) => {
        setSelectedReport(report);
        setReportTimeline([]);
        setActiveModal('report-details');
        if (report.id) {
            fetchReportTimeline(report.id);
        } else if (report.ticket_id) {
             // If we only have ticket_id (from public hazards)
             // We'll need to fetch the full report or just show what we have
             // For now, let's assume we have the ID or can find it
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
        if (notif.message.includes('RPT-')) {
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

    useEffect(() => {
        console.log("PULSO: ResidentDashboard useEffect triggered. currentUser:", currentUser?.id);
        const fetchAdvisories = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/advisories`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                const result = await handleApiError(response);
                if (result.ok) {
                    setLguUpdates(result.data);
                } else {
                    showToast(result.message);
                }
            } catch (error) {
                console.error("PULSO: Error fetching advisories:", error);
                showToast('Failed to load advisories');
            } finally {
                setLoadingAdvisories(false);
            }
        };
        const loadData = async () => {
            if (currentUser) {
                try {
                    await fetchUser(currentUser.id);
                    await fetchAdvisories();
                    await fetchUserReports(currentUser.id);
                    await fetchPublicHazards();
                    await fetchNotifications(currentUser.id);
                } catch (e) {
                    console.error("PULSO: Error in loadData sequence:", e);
                }
            }
        };
        loadData();
        // Auto-refresh user data and reports every 30s to keep status badges sync'd
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [currentUser]);

    const [reportNotes, setReportNotes] = useState('');
    const [locationDescription, setLocationDescription] = useState('');
    const [reportCategory, setReportCategory] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportLocation, setReportLocation] = useState({ lat: 14.7566, lng: 121.0450 }); // Center of Caloocan North
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [mapFilter, setMapFilter] = useState('Nearby'); // State for new map UI filter
    const [selectedHazard, setSelectedHazard] = useState(null); // Tracks the clicked map marker
    const [hazardView, setHazardView] = useState('map'); // 'map' | 'board'
    const [hazardSearchQuery, setHazardSearchQuery] = useState('');
    const [hazardFilterStatus, setHazardFilterStatus] = useState('all');
    const [hazardFilterCategory, setHazardFilterCategory] = useState('all');
    

    const getCategoryColor = (category) => {
        const cat = (category || '').toLowerCase();
        if (cat.includes('road') || cat.includes('bridge')) return '#f97316';
        if (cat.includes('water') || cat.includes('drainage') || cat.includes('flood')) return '#3b82f6';
        if (cat.includes('lighting') || cat.includes('street') || cat.includes('electric')) return '#eab308';
        if (cat.includes('safety') || cat.includes('regulatory') || cat.includes('emergency')) return '#ef4444';
        if (cat.includes('facilit') || cat.includes('build') || cat.includes('park')) return '#22c55e';
        return '#94a3b8';
    };

    // SVG Marker Pin Generator for Map Symbols
    const getMarkerSVG = (category, status) => {
        let color = getCategoryColor(category);
        let svgIcon = '';
        const cat = (category || '').toLowerCase();

        // Match specific category keywords to their designated HEX colors and icons
        if (cat.includes('road') || cat.includes('bridge')) {
            svgIcon = `<path d="M12 2a6 6 0 0 0-6 6v2H4v2h16v-2h-2V8a6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4v2H8V8a4 4 0 0 1 4-4z" fill="white"/>`;
        } else if (cat.includes('water') || cat.includes('drainage') || cat.includes('flood')) {
            svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
        } else if (cat.includes('lighting') || cat.includes('street') || cat.includes('electric')) {
            svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
        } else if (cat.includes('safety') || cat.includes('regulatory') || cat.includes('emergency')) {
            color = '#ef4444'; // red (Shield)
            svgIcon = `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white"/>`;
        } else if (cat.includes('facilit') || cat.includes('build') || cat.includes('park')) {
            color = '#22c55e'; // green (Building)
            svgIcon = `<path d="M3 21h18v-2H3v2zm9-18L2 9h2v10h16V9h2L12 3zm-3 14v-4h6v4H9z" fill="white"/>`;
        } else {
            // Default generic warning
            svgIcon = `<path d="M12 2L1 21h22L12 2zm0 3.5l7 13.5H5l7-13.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" fill="white"/>`;
        }

        const statusColor = status === 'resolved' ? '#22c55e' : (status === 'pending' ? '#ef4444' : '#f97316');

        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 50" width="46" height="50">
                <!-- Large Pin Body (Offset to make room for badge) -->
                <g transform="translate(3, 4)">
                    <path d="M20 44c0 0 16-15.5 16-24a16 16 0 0 0-32 0c0 8.5 16 24 16 24z" fill="${color}" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0px 3px 2px rgba(0,0,0,0.3))" />
                    <!-- Dark Inner Circle background -->
                    <circle cx="20" cy="18" r="11" fill="rgba(0,0,0,0.15)"/>
                    <!-- Centered White Icon -->
                    <g transform="translate(10, 8) scale(0.8)">
                        ${svgIcon}
                    </g>
                </g>
                <!-- Status Badge Indicator top right -->
                <circle cx="36" cy="10" r="7" fill="${statusColor}" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.2))"/>
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

        const myReportMarkers = (userReports || []).map(r => ({
            ...r,
            lat: parseFloat(r.location_lat || r.lat),
            lng: parseFloat(r.location_lng || r.lng)
        })).filter(r => !isNaN(r.lat) && !isNaN(r.lng));

        const publicMarkers = (publicHazards || []).map(r => ({
            ...r,
            lat: parseFloat(r.location_lat || r.lat),
            lng: parseFloat(r.location_lng || r.lng),
            isPublic: true
        })).filter(r => !isNaN(r.lat) && !isNaN(r.lng));

        // Combine and dedup by ticket_id (in case user's own report is also in public)
        const combined = [...myReportMarkers];
        publicMarkers.forEach(pm => {
            if (!combined.some(cm => cm.ticket_id === pm.ticket_id)) {
                combined.push(pm);
            }
        });

        return combined.map(hazard => {
            const meters = getDistance(reportLocation, { lat: hazard.lat, lng: hazard.lng });
            
            // Generate a clean title: Use the beginning of description but remove GPS if it exists
            let displayTitle = hazard.description || `City Hazard - ${hazard.ticket_id}`;
            const address = hazard.location_string || hazard.address || 'N/A';
            
            // If the title contains the GPS string, let's clean it up for the map view
            if (displayTitle.includes('(GPS:')) {
                displayTitle = displayTitle.split('(GPS:')[0].trim();
                // If it's empty now, fallback to something useful
                if (!displayTitle) displayTitle = "Citizen Report";
            }

            return {
                ...hazard,
                id: hazard.id || `hazard-${hazard.ticket_id}`,
                title: displayTitle,
                category: hazard.category || hazard.ai_category || 'General Issue',
                status: (hazard.status || 'pending').toLowerCase(),
                location: address,
                displayAddress: address,
                dynamicDistance: formatDistance(meters),
                distanceValue: meters || 999999
            };
        }).sort((a, b) => a.distanceValue - b.distanceValue);
    }, [reportLocation, userReports, publicHazards, isLoaded]);

    // Derived state for filtered hazards in the Board view
    const displayHazards = React.useMemo(() => {
        return processedHazards.filter(h => {
            const matchesSearch = !hazardSearchQuery || 
                h.title.toLowerCase().includes(hazardSearchQuery.toLowerCase()) || 
                h.category.toLowerCase().includes(hazardSearchQuery.toLowerCase());
            
            const matchesStatus = hazardFilterStatus === 'all' || h.status.toLowerCase() === hazardFilterStatus.toLowerCase();
            const matchesCategory = hazardFilterCategory === 'all' || h.category.toLowerCase() === hazardFilterCategory.toLowerCase();
            
            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [processedHazards, hazardSearchQuery, hazardFilterStatus, hazardFilterCategory]);


    // Auto-fetch location on mount and periodic updates for proximity tracking
    useEffect(() => {
        const fetchLocation = () => {
            if (navigator.geolocation) {
                console.log("PULSO: Fetching current GPS location for proximity tracking...");
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const newLoc = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        console.log("PULSO: Successfully fetched GPS location:", newLoc);
                        setReportLocation(newLoc);
                        // Only reverse geocode if modal is open or manual pick requested
                        if (activeModal === 'file-report') {
                            reverseGeocode(newLoc.lat, newLoc.lng);
                        }
                    },
                    (error) => {
                        console.error("PULSO: Geolocation error:", error);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
                );
            }
        };

        fetchLocation(); // Initial fetch
        const interval = setInterval(fetchLocation, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [activeModal]); // Dependency on activeModal to trigger reverse geocode if turned on while modal is open

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

            // 3. Apply watermark for uploaded files just like camera captures
            try {
                const metadata = { lat: reportLocation.lat, lng: reportLocation.lng, address: locationAddress };
                const watermarkedBlob = await applyWatermarkToFile(file, metadata);
                const watermarkedFile = new File([watermarkedBlob], file.name, { type: file.type });
                setSelectedImage(URL.createObjectURL(watermarkedFile));
            } catch (err) {
                console.error("Error watermarking file:", err);
                setSelectedImage(URL.createObjectURL(file)); // Fallback to raw if failed
            }
        }
    };

    // Helper to apply GPS watermark to an uploaded file (re-using IDCameraModal logic)
    const applyWatermarkToFile = (file, metadata) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Keep original aspects but maybe cap for UI performance if extremely large
                // However, we process original quality for analysis.
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                if (metadata) {
                    // Scaling logic: Base dimensions on the smaller dimension to prevent overflow
                    const baseDim = Math.min(canvas.width, canvas.height);
                    const padding = baseDim * 0.04;
                    const fontSizeHeader = Math.max(14, baseDim * 0.015);
                    const fontSizeDetail = Math.max(18, baseDim * 0.025);
                    const fontSizeAddr = Math.max(12, baseDim * 0.012);
                    const timestamp = new Date().toLocaleString();

                    // Placement: Bottom Left Card Area
                    // 1. Draw a semi-transparent card backdrop for maximum visibility
                    const boxWidth = canvas.width * 0.4;
                    const boxHeight = canvas.height * 0.22;
                    const boxX = padding;
                    const boxY = canvas.height - boxHeight - padding;

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.beginPath();
                    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, baseDim * 0.02);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Text setup
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 4;

                    // 1. Header (PULSO GPS VERIFIED)
                    ctx.fillStyle = '#22c55e'; // Green Dot
                    ctx.beginPath();
                    ctx.arc(boxX + (padding * 0.6), boxY + (padding * 0.6), baseDim * 0.005, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.font = `black ${fontSizeHeader}px system-ui, -apple-system, sans-serif`;
                    ctx.fillStyle = 'white';
                    ctx.fillText(`PULSO GPS VERIFIED • ${timestamp}`, boxX + (padding * 1.0), boxY + (padding * 0.7));

                    // 2. Latitude/Longitude
                    const detailYStart = boxY + (padding * 1.6);
                    ctx.font = `bold ${fontSizeDetail}px monospace`;
                    ctx.fillStyle = '#f97316'; // Orange label
                    ctx.fillText('LAT', boxX + (padding * 0.6), detailYStart);
                    ctx.fillStyle = 'white';
                    ctx.fillText(metadata.lat?.toFixed(6) || '0.0', boxX + (padding * 2), detailYStart);

                    ctx.fillStyle = '#f97316';
                    ctx.fillText('LNG', boxX + (padding * 0.6), detailYStart + (fontSizeDetail * 1.2));
                    ctx.fillStyle = 'white';
                    ctx.fillText(metadata.lng?.toFixed(6) || '0.0', boxX + (padding * 2), detailYStart + (fontSizeDetail * 1.2));

                    // 3. Address
                    if (metadata.address) {
                        ctx.font = `bold ${fontSizeAddr}px system-ui, -apple-system, sans-serif`;
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

                        const words = metadata.address.split(' ');
                        let line = '';
                        let y = detailYStart + (fontSizeDetail * 1.2) + (padding * 0.8);
                        const maxChars = 40;

                        for (let n = 0; n < words.length; n++) {
                            const testLine = line + words[n] + ' ';
                            if (testLine.length > maxChars && n > 0) {
                                ctx.fillText(line, boxX + (padding * 0.6), y);
                                line = words[n] + ' ';
                                y += (fontSizeAddr * 1.3);
                            } else {
                                line = testLine;
                            }
                        }
                        ctx.fillText(line, boxX + (padding * 0.6), y);
                    }

                    // Reset shadow
                    ctx.shadowBlur = 0;
                }

                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const handleAIAnalyze = async () => {
        if (isAnalyzing || isCooldown) return;

        throttleAction(async () => {
            setIsAnalyzing(true);
            try {
            const formData = new FormData();
            if (reportNotes) formData.append('description', reportNotes);

            if (selectedImage && selectedImage.startsWith('blob:')) {
                const response = await fetch(selectedImage);
                const blob = await response.blob();
                formData.append('image', blob, 'analysis.jpg');
            }

            const res = await fetch(`${API_BASE_URL}/api/reports/analyze`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAiFeedback(data);

                // Map AI category to our RADIO options (Identify ALL matching)
                const aiCat = (data.category || '').toLowerCase();
                let mapped = [];

                if (aiCat.includes('road') || aiCat.includes('bridge')) mapped.push('Roads & Bridges');
                if (aiCat.includes('water') || aiCat.includes('drain') || aiCat.includes('flood')) mapped.push('Water & Drainage');
                if (aiCat.includes('light') || aiCat.includes('electric')) mapped.push('Street Lighting');
                if (aiCat.includes('safety') || aiCat.includes('regulat') || aiCat.includes('hazard')) mapped.push('Public Safety & Regulatory');
                if (aiCat.includes('facilit') || aiCat.includes('build') || aiCat.includes('park')) mapped.push('Public Facilities');

                if (mapped.length > 0) {
                    setReportCategory(mapped);
                } else {
                    setReportCategory(['Undetermined']);
                }
            }
        } catch (err) {
            console.error("AI Analysis failed:", err);
        } finally {
            setIsAnalyzing(false);
        }
    }, 3000);
};



    // Reverse-geocoded address for the report location picker
    const [locationAddress, setLocationAddress] = useState('');
    const [geocodingAddress, setGeocodingAddress] = useState(false);

    const reverseGeocode = async (lat, lng) => {
        setGeocodingAddress(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/geocode/reverse?lat=${lat}&lng=${lng}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                // Standardize: Plus Code | Human Address | Barangay extraction
                let finalAddress = data.address;
                // No longer appending home barangay here. maps_service now handles 100% accurate extraction.
                setLocationAddress(finalAddress);
            }
        } catch (_) {
            setLocationAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
            setGeocodingAddress(false);
        }
    };

    const handleFileReport = () => {
        if (!selectedImage) {
            showToast('A photo is required before submitting a report.', 'error');
            return;
        }
        if (isAnalyzing) {
            showToast('Please wait for the AI scan to complete.', 'error');
            return;
        }
        if (!aiFeedback || aiFeedback.category === 'Undetermined' || aiFeedback.category?.toUpperCase().includes('INAPPROPRIATE')) {
            const errorMsg = aiFeedback?.category?.toUpperCase().includes('INAPPROPRIATE') 
                ? 'Report blocked: the image contains inappropriate content. Please upload a clear photo of an infrastructure issue.'
                : 'Report blocked: the image was not identified as a valid infrastructure issue. Please upload a clear photo of the problem.';
            showToast(errorMsg, 'error');
            return;
        }
        if (reportCategory.length === 0) {
            showToast('Please select at least one issue category.', 'error');
            return;
        }
        setIsSubmitConfirmOpen(true);
    };

    const actuallySubmitReport = async () => {
        if (isCooldown) return;

        throttleAction(async () => {
            setIsSubmitConfirmOpen(false);
            setSubmittingReport(true);
            try {
                // Build description with location details
                let fullDescription = reportNotes || "Citizen report from PULSO app.";
                // Standardized location formatting is handled via the separate location_string field.
                // We keep the description clean and dedicated to the user's specific notes.

                const formData = new FormData();
                formData.append('category', Array.isArray(reportCategory) ? reportCategory.join(', ') : reportCategory);
                formData.append('description', fullDescription);
                formData.append('lat', reportLocation.lat);
                formData.append('lng', reportLocation.lng);
                formData.append('location_string', locationAddress || `Lat: ${reportLocation.lat.toFixed(4)}, Lng: ${reportLocation.lng.toFixed(4)}`);

                if (selectedImage) {
                    const response = await fetch(selectedImage);
                    const blob = await response.blob();
                    // Name the file with GPS coordinates
                    const latStr = reportLocation.lat.toFixed(6).replaceAll('.', 'p');
                    const lngStr = reportLocation.lng.toFixed(6).replaceAll('.', 'p');
                    const filename = `report_${latStr}_${lngStr}_${Date.now()}.jpg`;
                    formData.append('image', blob, filename);
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
                    setLocationDescription('');
                    setSelectedImage(null);
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
        }, 5000);
    };

    const handleCancelReport = (reportId) => {
        setReportToCancel(reportId);
    };

    const confirmCancelReport = async (reportId) => {
        setReportToCancel(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/cancel`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showToast('Report retracted successfully');
                if (currentUser) {
                    fetchUserReports(currentUser.id);
                }
            } else {
                const err = await res.json();
                showToast(err.detail || "Failed to cancel report", 'error');
            }
        } catch (error) {
            console.error("Error cancelling report:", error);
            showToast("An error occurred while cancelling the report", 'error');
        }
    };


    // Real User Data State
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('pulso_user');
        const userData = storedUser ? JSON.parse(storedUser) : null;
        return {
            name: userData?.full_name ? userData.full_name.split(' ')[0] : 'Resident',
            fullName: userData?.full_name || 'Resident',
            email: userData?.email || '',
            barangay: userData?.barangay || 'Caloocan District',
            trustScore: userData?.trust_score || 0,
            reportsCount: 0,
            avatar: userData?.full_name ? userData.full_name.charAt(0).toUpperCase() : 'R',
            memberSince: userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—',
            address: userData?.address || '',
            phone: userData?.phone_number || ''
        };
    });
    const [updatingProfile, setUpdatingProfile] = useState(false);

    const fetchUser = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const userData = {
                    name: data.full_name ? data.full_name.split(' ')[0] : 'Resident',
                    fullName: data.full_name || '',
                    email: data.email || '',
                    barangay: data.barangay || 'Caloocan District',
                    trustScore: data.trust_score || 0,
                    reportsCount: user.reportsCount, // Keep current count, updated in fetchUserReports
                    avatar: data.full_name ? data.full_name.charAt(0).toUpperCase() : 'R',
                    memberSince: data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—',
                    address: data.address || '',
                    phone: data.phone_number || ''
                };
                setUser(userData);
                
                // Sync back to currentUser/localStorage if significant update
                if (data.full_name !== currentUser.full_name || data.barangay !== currentUser.barangay) {
                    const upUser = { ...currentUser, ...data };
                    setCurrentUser(upUser);
                    localStorage.setItem('pulso_user', JSON.stringify(upUser));
                }
            }
        } catch (error) {
            console.error("PULSO: Error fetching user data:", error);
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

    // ── Resident AI Assistant State ───────────────────────────────────────────
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [isAIMaximized, setIsAIMaximized] = useState(false);
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', text: `Hi ${currentUser?.full_name?.split(' ')[0] || 'there'}! I am PULSO Assistant, your 24/7 community helper. Ask me about filing reports, nearby hazards, city services, or anything about Caloocan City!` }
    ]);
    const aiChatEndRef = React.useRef(null);

    const handleResidentAIChat = async (e) => {
        e.preventDefault();
        if (!aiQuery.trim() || isAILoading || isCooldown) return;

        throttleAction(async () => {
            const captured = aiQuery;
            const userMsg = { role: 'user', text: captured };
            setAiMessages(prev => [...prev, userMsg]);
            setAiQuery('');
            setIsAILoading(true);

        try {
            const resp = await fetch(`${API_BASE_URL}/api/ai/assistant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    query: captured,
                    context: `Resident Portal. User: ${user.name}, Barangay: ${user.barangay}. Active tab: ${activeTab}. The user is a citizen, NOT a staff member. Help them navigate PULSO, understand how to report issues, check their report status, learn about city services, evacuation routes, and local government procedures in Caloocan City North.`
                })
            });
            const data = await resp.json();
            setAiMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
        } catch {
            setAiMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I am temporarily unavailable. Please try again shortly.' }]);
        } finally {
            setIsAILoading(false);
            setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, 4000);
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
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors flex flex-col overflow-hidden">

            {/* Global Toast Notification */}
            <AnimatePresence>
                {toast.message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 border border-slate-700/50 backdrop-blur-xl dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 text-sm whitespace-nowrap"
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
                activeModal={activeModal} setActiveModal={setActiveModal} selectedPost={selectedPost} setSelectedPost={setSelectedPost} isLoaded={isLoaded} map={map} setMap={setMap} panorama={panorama} setPanorama={setPanorama} reportLocation={reportLocation} setReportLocation={setReportLocation}
                locationAddress={locationAddress} geocodingAddress={geocodingAddress} reportCategory={reportCategory} setReportCategory={setReportCategory} reportNotes={reportNotes} setReportNotes={setReportNotes} selectedImage={selectedImage} setSelectedImage={setSelectedImage}
                submittingReport={submittingReport} handleFileReport={handleFileReport} isSelectingLocation={isSelectingLocation} setIsSelectingLocation={setIsSelectingLocation} isIDCameraOpen={isIDCameraOpen} setIsIDCameraOpen={setIsIDCameraOpen} checkJurisdiction={checkJurisdiction}
                reverseGeocode={reverseGeocode} mapOptions={mapOptions} pulseRadius={pulseRadius} processedHazards={processedHazards} displayHazards={displayHazards} selectedHazard={selectedHazard} setSelectedHazard={setSelectedHazard} 
                hazardView={hazardView} setHazardView={setHazardView} hazardSearchQuery={hazardSearchQuery} setHazardSearchQuery={setHazardSearchQuery} hazardFilterStatus={hazardFilterStatus} setHazardFilterStatus={setHazardFilterStatus}
                hazardFilterCategory={hazardFilterCategory} setHazardFilterCategory={setHazardFilterCategory}
                svLocation={svLocation} handleStreetViewClick={handleStreetViewClick}
                getIconForCategory={getIconForCategory} getMarkerSVG={getMarkerSVG} getCategoryColor={getCategoryColor} mapFilter={mapFilter} setMapFilter={setMapFilter}
                isAnalyzing={isAnalyzing} aiFeedback={aiFeedback} setAiFeedback={setAiFeedback} fileInputRef={fileInputRef} handleFileSelect={handleFileSelect}
                reportToCancel={reportToCancel} setReportToCancel={setReportToCancel} confirmCancelReport={confirmCancelReport}
                isSubmitConfirmOpen={isSubmitConfirmOpen} setIsSubmitConfirmOpen={setIsSubmitConfirmOpen} actuallySubmitReport={actuallySubmitReport}
                locationDescription={locationDescription} setLocationDescription={setLocationDescription}
                isCooldown={isCooldown}
                selectedReport={selectedReport} setSelectedReport={setSelectedReport}
                reportTimeline={reportTimeline} loadingTimeline={loadingTimeline}
                onLoad={onLoad}
                t={t}
                currentUser={currentUser}
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
                                                                await fetch(`${API_BASE_URL}/api/notifications/${notif.id}`, {
                                                                    method: 'DELETE',
                                                                    headers: { 'Authorization': `Bearer ${token}` }
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
                handleSearch={handleSearch}
                showSearchDropdown={showSearchDropdown}
                setShowSearchDropdown={setShowSearchDropdown}
                user={user}
                navItems={navItems}
                showToast={showToast}
                i18n={i18n}
                t={t}
            />

            {/* Main Layout Grid (3-Column Facebook Style) */}
            <main className="flex-1 overflow-hidden w-full flex flex-col relative">

                {/* Mobile Bottom Bar Navigation (Replaces Top Nav on very small screens) */}
                <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 z-40 flex justify-around items-center p-2 pb-6 pt-3 shadow-xl relative">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`p-2 flex-1 flex flex-col items-center gap-1 transition-colors ${activeTab === item.id ? 'text-orange-500' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            {React.cloneElement(item.icon, {
                                className: `transition-transform ${activeTab === item.id ? 'stroke-[2.5px]' : ''}`,
                                size: 24
                            })}
                        </button>
                    ))}
                </div>

                <div className="max-w-[1600px] mx-auto w-full px-0 sm:px-4 h-[calc(100vh-4rem)]">

                    {/* Content switcher based on tabs */}
                    {(activeTab === 'overview' || activeTab === 'home') && (
                        <div className="w-full h-full flex flex-row items-start justify-center gap-0 lg:gap-6 xl:gap-8">

                            {/* Left Column (Shortcuts) - 280px */}
                            <aside className="w-[280px] lg:w-[300px] xl:w-[320px] shrink-0 hidden md:block h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
                                <LeftSidebar
                                    user={user}
                                    activeTab={activeTab}
                                    handleSetTab={handleSetTab}
                                    handleSetModal={handleSetModal}
                                    t={t}
                                />
                            </aside>

                            {/* Mobile Layout Fallback (Shows shortcuts above feed) */}
                            <div className="md:hidden w-full px-4 pt-4 pb-2 bg-white dark:bg-slate-900 mb-2 shrink-0 relative z-20">
                                <h3 className="font-bold text-[15px] text-slate-900 dark:text-white mb-3">
                                    {t('dashboard.overview.shortcuts', { defaultValue: 'Shortcuts' })}
                                </h3>
                                <div className="flex overflow-x-auto gap-3 pb-4 snap-x hide-scrollbar -mx-4 px-4">
                                    {quickFunctions.map((func) => (
                                        <button key={func.id} onClick={func.action} className="min-w-[72px] flex flex-col items-center justify-center snap-center focus:outline-none group">
                                            <div className={`w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 text-${func.color}-500 border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform`}>
                                                {func.icon}
                                            </div>
                                            <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap text-center">{func.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Center Column (Main Feed) - 680px */}
                            <div className="flex-1 w-full min-w-[350px] lg:min-w-[500px] max-w-[680px] h-full overflow-y-auto custom-scrollbar pb-24 sm:pb-8 pt-0 md:pt-6 px-0 md:px-2">
                                <LguFeed
                                    lguUpdates={lguUpdates}
                                    loadingAdvisories={loadingAdvisories}
                                    getIconForCategory={getIconForCategory}
                                    setSelectedPost={setSelectedPost}
                                    setActiveModal={setActiveModal}
                                    containerVariants={containerVariants}
                                    t={t}
                                />
                            </div>

                            {/* Right Column (Widgets) - 320px */}
                            <aside className="w-[320px] shrink-0 hidden xl:block h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
                                <RightSidebar
                                    user={user}
                                    handleSetModal={handleSetModal}
                                    userReports={userReports}
                                    loadingReports={loadingReports}
                                    processedHazards={processedHazards}
                                    setSelectedHazard={setSelectedHazard}
                                    map={map}
                                    t={t}
                                />
                            </aside>

                        </div>
                    )}

                    {/* Full Width Tab Views Container */}
                    {activeTab !== 'overview' && activeTab !== 'home' && (
                        <div className="w-full h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar flex flex-col items-center pb-24 sm:pb-8 pt-0 sm:pt-6">
                            {activeTab === 'reports' && (
                                <div className="w-full max-w-3xl px-0 sm:px-4">
                                    <MyReports
                                        userReports={userReports}
                                        loadingReports={loadingReports}
                                        handleSetModal={handleSetModal}
                                        containerVariants={containerVariants}
                                        setZoomedImage={setZoomedImage}
                                        reportStatusFilter={reportStatusFilter}
                                        setReportStatusFilter={setReportStatusFilter}
                                        handleCancelReport={handleCancelReport}
                                        t={t}
                                    />
                                </div>
                            )}
                            {activeTab === 'profile' && (
                                <div className="w-full max-w-3xl px-0 sm:px-4">
                                    <ProfileView
                                        user={user}
                                        setUser={setUser}
                                        handleUpdateProfile={handleUpdateProfile}
                                        updatingProfile={updatingProfile}
                                        containerVariants={containerVariants}
                                        t={t}
                                    />
                                </div>
                            )}
                            {activeTab === 'settings' && (
                                <div className="w-full max-w-3xl px-0 sm:px-4">
                                    <SettingsView
                                        handleLogout={handleLogout}
                                        containerVariants={containerVariants}
                                        token={token}
                                        showToast={showToast}
                                        t={t}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* ── PULSO Resident AI Assistant FAB ────────────────────────────── */}
            <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-4">
                <AnimatePresence>
                    {isAIChatOpen && (
                        <>
                            {/* Backdrop for maximized mode */}
                            {isAIMaximized && (
                                <motion.div
                                    key="resident-ai-backdrop"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
                                    onClick={() => setIsAIMaximized(false)}
                                />
                            )}

                            <motion.div
                                key="resident-ai-chat"
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                className={`bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-300 ${isAIMaximized
                                        ? 'fixed inset-6 md:inset-12 lg:inset-20 z-[100] rounded-3xl'
                                        : 'w-[360px] h-[500px] rounded-2xl relative z-[100]'
                                    }`}
                            >
                                {/* Header */}
                                <div className="p-4 bg-gradient-to-r from-blue-900 to-blue-800 flex justify-between items-center shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                            <Brain size={18} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">PULSO Assistant</h4>
                                            <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">Community Helper · 24/7</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setIsAIMaximized(prev => !prev)}
                                            title={isAIMaximized ? 'Minimize' : 'Maximize'}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                                        >
                                            {isAIMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                                        </button>
                                        <button
                                            onClick={() => { setIsAIChatOpen(false); setIsAIMaximized(false); }}
                                            title="Close"
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* Suggested quick-actions (shown only when 1 message = greeting) */}
                                {aiMessages.length === 1 && (
                                    <div className="px-3 py-2 bg-orange-50 dark:bg-slate-800 border-b border-orange-100 dark:border-slate-700 flex gap-2 flex-wrap shrink-0">
                                        {['How to file a report?', 'My report status', 'City hotlines', 'Evacuation routes'].map(q => (
                                            <button
                                                key={q}
                                                onClick={() => { setAiQuery(q); }}
                                                className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-700 border border-blue-200 dark:border-slate-600 px-2.5 py-1 rounded-full hover:bg-blue-800 hover:text-white hover:border-blue-800 transition-colors"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                    {aiMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                                                    <Brain size={12} className="text-white" />
                                                </div>
                                            )}
                                            <div className={`${isAIMaximized ? 'max-w-[65%]' : 'max-w-[82%]'
                                                } p-3 rounded-2xl text-[13px] font-medium leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-blue-700 text-white rounded-br-md'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md'
                                                }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {isAILoading && (
                                        <div className="flex justify-start">
                                            <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                                                <Brain size={12} className="text-white" />
                                            </div>
                                            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-bl-md flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={aiChatEndRef} />
                                </div>

                                {/* Input */}
                                <form onSubmit={handleResidentAIChat} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={aiQuery}
                                            onChange={e => setAiQuery(e.target.value)}
                                            placeholder="Ask PULSO Assistant..."
                                            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-[13px] text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-700 outline-none placeholder:text-slate-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isAILoading || isCooldown}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white transition-colors shrink-0 ${isCooldown ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed' : 'bg-blue-800 hover:bg-blue-700'}`}
                                        >
                                            {isCooldown ? <Clock size={16} /> : <Search size={16} />}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Pulsing FAB button */}
                <motion.button
                    onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-14 h-14 rounded-full bg-blue-900 shadow-xl shadow-blue-900/50 flex items-center justify-center text-white"
                    title="PULSO Assistant"
                >
                    <AnimatePresence>
                        {!isAIChatOpen && (
                            <motion.span
                                key="pulse"
                                className="absolute inset-0 rounded-full bg-blue-700 opacity-60"
                                animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                            />
                        )}
                    </AnimatePresence>
                    {isAIChatOpen ? <X size={22} /> : <Brain size={24} />}
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
        </div>
    );
} 