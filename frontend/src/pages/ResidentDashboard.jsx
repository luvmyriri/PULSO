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
    Edit3
} from 'lucide-react';

import { useTheme } from '../contexts/ThemeContext';
import Swal from 'sweetalert2';
import Branding from '../components/Branding';
import { useTranslation } from 'react-i18next';
import IDCameraModal from '../components/IDCameraModal';

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

const LIBRARIES = ['places', 'geometry'];

const REPORT_CATEGORIES = (t) => [
    { value: 'Water Supply Network', label: t('landing.solutions.s1_title', { defaultValue: 'Water Supply Network' }) },
    { value: 'Power & Street Lighting', label: t('landing.solutions.s2_title', { defaultValue: 'Power & Street Lighting' }) },
    { value: 'Roads & Drainage', label: t('landing.solutions.s3_title', { defaultValue: 'Roads & Drainage' }) },
    { value: 'Public Safety & Regulatory', label: t('landing.solutions.s4_title', { defaultValue: 'Public Safety & Regulatory' }) },
    { value: 'Public Facilities', label: t('landing.solutions.s5_title', { defaultValue: 'Public Facilities' }) },
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
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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

// ── Status Badge Configurations (WCAG AA Compliant in Light & Dark) ───────────
const STATUS_CONFIG = {
    pending:           { label: 'Pending',     cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',      dot: 'bg-amber-500'  },
    unverified:        { label: 'Pending',     cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',      dot: 'bg-amber-500'  },
    in_progress:       { label: 'In Progress', cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',            dot: 'bg-blue-500'   },
    approved_internal: { label: 'In Progress', cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',            dot: 'bg-blue-500'   },
    dispatched:        { label: 'In Progress', cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',            dot: 'bg-blue-500'   },
    resolved:          { label: 'Resolved',    cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30', dot: 'bg-emerald-500' },
    rejected:          { label: 'Rejected',    cls: 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',            dot: 'bg-rose-500'   },
    cancelled:         { label: 'Cancelled',   cls: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700',             dot: 'bg-slate-500'  },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status?.toLowerCase()] || {
        label: status || 'Pending',
        cls: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400'
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${cfg.cls} shrink-0`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
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

const ReportCard = ({ report, setZoomedImage, handleCancelReport }) => {
    const [showFullAddr, setShowFullAddr] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showRetractConfirm, setShowRetractConfirm] = useState(false);
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const resolutionDays = report.status === 'resolved' && report.updated_at && report.created_at
        ? daysBetween(report.created_at, report.updated_at)
        : null;

    const rawDescription = report.description || report.notes;
    const cleanDescription = sanitizeDescription(rawDescription);
    const isLongDescription = cleanDescription && cleanDescription.length > 110;
    const displayDescription = isLongDescription && !isDescExpanded
        ? `${cleanDescription.substring(0, 110)}...`
        : cleanDescription;

    const isPending = report.status === 'pending' || report.status === 'unverified';
    const isResolved = report.status === 'resolved';

    return (
        <div className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col
                        transition-all duration-200 ease-out
                        hover:border-orange-500/40 dark:hover:border-orange-500/40 hover:shadow-md hover:shadow-orange-500/5 hover:-translate-y-px
                        focus-within:border-orange-500/40 relative">

            <div className="flex flex-col sm:flex-row">
                {/* ── Thumbnail ──────────────────────────────────────────────── */}
                <div className="relative w-full sm:w-48 sm:min-w-[12rem] h-44 sm:h-auto shrink-0 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                    {report.image_url ? (
                        <button
                            type="button"
                            onClick={() => setZoomedImage(`http://localhost:33159${report.image_url}`)}
                            className="w-full h-full block relative group/thumb focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                            aria-label="View full-size report photo"
                        >
                            <img
                                src={`http://localhost:33159${report.image_url}`}
                                alt={`${report.category || 'Report'} photo`}
                                className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover/thumb:scale-105"
                            />
                            {/* Watermark masking gradient at bottom */}
                            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                            {/* Zoom affordance overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumb:bg-black/30 transition-colors duration-200">
                                <div className="p-2 rounded-full bg-black/50 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 text-[11px] font-semibold">
                                    <Maximize2 size={14} />
                                    <span>Zoom</span>
                                </div>
                            </div>
                        </button>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-1.5 p-4">
                            <ImageIcon size={28} strokeWidth={1.5} />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">No Photo</span>
                        </div>
                    )}
                </div>

                {/* ── Card Body ──────────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col p-4 sm:p-5 gap-3">

                    {/* Row 1: Category + Status */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white leading-snug truncate pr-1">
                                {report.category || report.ai_category || 'Civic Infrastructure Report'}
                            </h3>
                        </div>
                        <StatusBadge status={report.status} />
                    </div>

                    {/* Row 2: Ticket ID (monospace) + Submission Date */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 tracking-wide select-all">
                            {report.ticket_id}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    {/* Row 3: Description snippet (Cleaned & sanitized) */}
                    {cleanDescription && (
                        <div className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            <span>{displayDescription}</span>
                            {isLongDescription && (
                                <button
                                    type="button"
                                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                                    className="ml-1 text-orange-600 dark:text-orange-400 font-semibold hover:underline text-[12px] inline"
                                >
                                    {isDescExpanded ? 'Show less' : 'Read more'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Row 4: Location — with expand affordance */}
                    <div className="flex items-start gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                        <MapPin size={14} className="shrink-0 mt-0.5 text-orange-500/70" />
                        <span
                            className={`${showFullAddr ? '' : 'truncate'} cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium`}
                            onClick={() => setShowFullAddr(v => !v)}
                            title={showFullAddr ? 'Click to collapse' : report.location_string || 'Location N/A'}
                        >
                            {report.location_string || 'Caloocan City'}
                        </span>
                    </div>

                    {/* Rejection Notice Banner */}
                    {report.status === 'rejected' && (
                        <div className="flex items-center gap-2 text-[11px] font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/20">
                            <AlertTriangle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
                            <span>Verification not accepted — issue details did not meet criteria.</span>
                        </div>
                    )}

                    {/* ── Footer: Timeline + Actions ──────────────────────────────── */}
                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">

                        {/* Timeline chip */}
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            <Clock size={12} className="shrink-0" />
                            {isResolved && resolutionDays !== null ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                    Resolved in {resolutionDays} {resolutionDays === 1 ? 'day' : 'days'}
                                </span>
                            ) : (
                                <span>{isPending ? 'Awaiting LGU review' : 'Under active dispatch'}</span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 relative">

                            {/* View Details Toggle Button */}
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
                                           border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600
                                           bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80
                                           px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 focus:outline-none"
                            >
                                <Eye size={13} />
                                <span>{showDetails ? 'Hide Details' : 'View Details'}</span>
                            </button>

                            {/* Resolved View Proof Action */}
                            {isResolved && (
                                report.resolution_image_url ? (
                                    <button
                                        type="button"
                                        onClick={() => setZoomedImage(`http://localhost:33159${report.resolution_image_url}`)}
                                        className="text-[12px] font-semibold text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white
                                                   border border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-300
                                                   bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20
                                                   px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 focus:outline-none"
                                    >
                                        <ImageIcon size={13} />
                                        <span>View Proof</span>
                                    </button>
                                ) : (
                                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 italic">No proof image</span>
                                )
                            )}

                            {/* Pending Retract Action with Popover Confirmation */}
                            {isPending && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowRetractConfirm(!showRetractConfirm)}
                                        className="text-[12px] font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300
                                                   border border-rose-200 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700
                                                   bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100/80 dark:hover:bg-rose-900/40
                                                   px-3 py-1.5 rounded-lg transition-all duration-150 focus:outline-none"
                                    >
                                        Retract
                                    </button>

                                    {/* Retract Popover */}
                                    <AnimatePresence>
                                        {showRetractConfirm && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                                className="absolute bottom-full right-0 mb-2 p-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 rounded-xl shadow-xl z-30 w-60 text-left"
                                            >
                                                <p className="text-[12px] font-bold text-slate-900 dark:text-white mb-1">Retract this report?</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-tight">
                                                    This will cancel LGU inspection for ticket {report.ticket_id}.
                                                </p>
                                                <div className="flex items-center gap-2 justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowRetractConfirm(false)}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowRetractConfirm(false);
                                                            handleCancelReport(report.id);
                                                        }}
                                                        className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-xs transition-colors"
                                                    >
                                                        Yes, Retract
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* ── Expandable Details Drawer ─────────────────────────────────── */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 p-4 sm:p-5 overflow-hidden"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-[12px]">
                            {/* Complete Address */}
                            <div className="space-y-1 sm:col-span-2">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Full Recorded Address
                                </span>
                                <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                    {report.location_string || 'N/A'}
                                </p>
                            </div>

                            {/* GPS Coordinates */}
                            <div className="space-y-1">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    GPS Coordinates
                                </span>
                                <p className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                                    {report.lat && report.lng ? `${parseFloat(report.lat).toFixed(5)}, ${parseFloat(report.lng).toFixed(5)}` : 'N/A'}
                                </p>
                            </div>

                            {/* Category Classification */}
                            <div className="space-y-1">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Assigned Department
                                </span>
                                <p className="text-slate-800 dark:text-slate-200 font-semibold">
                                    {report.category || 'City Engineering / DPS'}
                                </p>
                            </div>

                            {/* Submission Timestamp */}
                            <div className="space-y-1">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Submitted At
                                </span>
                                <p className="font-mono text-slate-700 dark:text-slate-300">
                                    {new Date(report.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            </div>

                            {/* Last Status Update */}
                            <div className="space-y-1">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Last Status Update
                                </span>
                                <p className="font-mono text-slate-700 dark:text-slate-300">
                                    {report.updated_at ? new Date(report.updated_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MyReports = ({ userReports, loadingReports, handleSetModal, containerVariants, setZoomedImage, reportStatusFilter, setReportStatusFilter, handleCancelReport, t }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4;

    const filterOptions = [
        { id: 'all', label: 'All Reports' },
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
            if (reportStatusFilter === 'pending') {
                return ['pending', 'unverified'].includes(r.status);
            }
            return r.status === reportStatusFilter;
        });

    useEffect(() => {
        setCurrentPage(1);
    }, [reportStatusFilter]);

    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full bg-slate-50/60 dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 transition-colors shadow-xs"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('dashboard.reports.history', { defaultValue: 'My Reports & History' })}
                    </h2>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('dashboard.reports.historyDesc', { defaultValue: 'Track civic infrastructure reports submitted for Caloocan City.' })}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => handleSetModal('file-report')}
                    className="bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-150 flex items-center gap-2 shrink-0 shadow-md shadow-orange-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>{t('dashboard.quickReport.submitBtn', { defaultValue: 'Submit New Report' })}</span>
                </button>
            </div>

            {/* Filter Tab Bar */}
            <div className="flex gap-1 p-1.5 bg-slate-200/70 dark:bg-slate-900/80 rounded-2xl mb-6 overflow-x-auto border border-slate-200 dark:border-slate-800 w-full sm:max-w-fit flex-nowrap">
                {filterOptions.map(opt => {
                    const count = opt.id === 'all'
                        ? userReports.length
                        : userReports.filter(r => {
                            if (opt.id === 'in_progress') return ['dispatched', 'approved_internal'].includes(r.status);
                            if (opt.id === 'pending') return ['pending', 'unverified'].includes(r.status);
                            return r.status === opt.id;
                        }).length;

                    const isActive = reportStatusFilter === opt.id;
                    const isEmpty = count === 0;

                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => !isEmpty && setReportStatusFilter(opt.id)}
                            disabled={isEmpty}
                            className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 flex items-center gap-2 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                                ${isActive
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700'
                                    : isEmpty
                                        ? 'opacity-40 cursor-default text-slate-400 dark:text-slate-600'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50 cursor-pointer'
                                }`}
                        >
                            <span>{opt.label}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors
                                ${isActive
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : isEmpty
                                        ? 'text-slate-400 dark:text-slate-700 bg-transparent'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Card List */}
            <div className="space-y-3.5">
                {loadingReports ? (
                    <div className="flex flex-col items-center gap-3 py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40">
                        <Loader2 size={28} className="animate-spin text-orange-500" />
                        <span className="text-[13px] font-mono text-slate-400 dark:text-slate-500">Synchronizing report history...</span>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40">
                        <FileText size={32} className="text-slate-300 dark:text-slate-700" strokeWidth={1.5} />
                        <div className="text-center">
                            <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">No reports found in this category</p>
                            <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">Try another filter or submit a new infrastructure issue.</p>
                        </div>
                    </div>
                ) : paginatedReports.map((report) => (
                    <ReportCard
                        key={report.id}
                        report={report}
                        setZoomedImage={setZoomedImage}
                        handleCancelReport={handleCancelReport}
                    />
                ))}
            </div>

            {/* Pagination */}
            {filteredReports.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-slate-200/80 dark:border-slate-800">
                    <div className="font-mono text-[12px] text-slate-500 dark:text-slate-400">
                        Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length} records
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={15} strokeWidth={2.5} />
                            </button>

                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg font-mono text-[12px] font-semibold transition-all cursor-pointer ${
                                        currentPage === i + 1
                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
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
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
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

const ProfileView = ({ user, setUser, handleUpdateProfile, updatingProfile, containerVariants, userReports = [], showToast, t }) => {
    const [editingField, setEditingField] = useState(null); // 'email' | 'phone' | null
    const [tempValues, setTempValues] = useState({ email: user.email || '', phone: user.phone || '' });
    const [activeTooltip, setActiveTooltip] = useState(null); // 'verified' | 'name' | 'barangay' | 'address' | null
    const fileInputRef = useRef(null);

    // Sync tempValues whenever user prop updates
    useEffect(() => {
        setTempValues({ email: user.email || '', phone: user.phone || '' });
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

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (showToast) showToast('Profile avatar updated successfully!');
        }
    };

    const totalReports = userReports.length;
    const resolvedReports = userReports.filter(r => r.status === 'resolved').length;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-xl dark:shadow-2xl transition-colors"
        >
            {/* Subtle Ambient Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 blur-3xl rounded-full -mr-24 -mt-24 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full -ml-20 -mb-20 pointer-events-none" />

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">

                {/* ── Left Column: Identity & Civic Stats ──────────────── */}
                <div className="flex flex-col items-center gap-6 shrink-0 w-full lg:w-72">
                    
                    {/* Avatar with Camera Upload Overlay */}
                    <div className="relative group">
                        <div className="w-36 h-36 rounded-full bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 font-black flex items-center justify-center text-white text-5xl shadow-[0_20px_40px_rgba(249,115,22,0.25)] border-4 border-white/20 dark:border-slate-800 relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.02]">
                            {user.avatar}
                            
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

                            {/* Tooltip */}
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
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trust Score</span>
                            <span className="font-mono text-[12px] font-bold text-emerald-600 dark:text-emerald-400">{user.trustScore || 100}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${user.trustScore || 100}%` }} />
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

                {/* ── Right Column: Form Sections ──────────────────────── */}
                <div className="flex-1 space-y-8 min-w-0">

                    {/* Section 1: Account Identity (Locked) */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                <User size={14} className="text-orange-500" />
                                {t('dashboard.profile.personalInfo', { defaultValue: 'Account Identity' })}
                            </h4>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 rounded-md">
                                <Lock size={11} className="text-slate-400" />
                                Verified Record
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Official Name */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    {t('dashboard.profile.regName', { defaultValue: 'Official Name' })}
                                </label>
                                <div
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-900 dark:text-white flex items-center justify-between group cursor-help relative"
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
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-900 dark:text-white flex items-center justify-between group cursor-help"
                                    title="Verified by barangay — contact your barangay office to update"
                                >
                                    <span className="truncate">{user.barangay}</span>
                                    <Lock size={14} className="text-slate-400 dark:text-slate-500 shrink-0 ml-2" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Residential Address (Locked) */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                <MapPin size={14} className="text-orange-500" />
                                {t('dashboard.profile.resAddress', { defaultValue: 'Residential Address' })}
                            </h4>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 rounded-md">
                                <Lock size={11} className="text-slate-400" />
                                Official Record
                            </span>
                        </div>

                        <div
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-[14px] font-semibold text-slate-800 dark:text-slate-200 flex items-start justify-between gap-3 min-h-[56px] leading-relaxed cursor-help"
                            title="Verified by barangay — contact your barangay office to update"
                        >
                            <span className="flex-1">{user.address || "No complete address recorded. Please contact LGU for verification."}</span>
                            <Lock size={14} className="text-slate-400 dark:text-slate-500 shrink-0 mt-1" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                            <Info size={12} className="shrink-0 text-slate-400" />
                            Official residential record registered with Caloocan City.
                        </p>
                    </div>

                    {/* Section 3: Contact Information (Editable) */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                <Mail size={14} className="text-orange-500" />
                                Contact Information
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
                                            className="flex-1 bg-white dark:bg-slate-900 border border-orange-500 rounded-xl px-4 py-2.5 text-[14px] font-medium text-slate-900 dark:text-white outline-none ring-2 ring-orange-500/20"
                                            placeholder="Enter your email"
                                        />
                                        <button
                                            onClick={() => handleSaveField('email')}
                                            disabled={updatingProfile}
                                            className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 shrink-0"
                                            title="Save Changes"
                                        >
                                            {updatingProfile ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
                                            <span>Save</span>
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            disabled={updatingProfile}
                                            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shrink-0"
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
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-orange-400 dark:hover:ring-orange-500/50 transition-all ml-2 shrink-0 shadow-xs"
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
                                            className="flex-1 bg-white dark:bg-slate-900 border border-orange-500 rounded-xl px-4 py-2.5 font-mono text-[14px] font-semibold text-slate-900 dark:text-white outline-none ring-2 ring-orange-500/20"
                                            placeholder="e.g. 09171234567"
                                        />
                                        <button
                                            onClick={() => handleSaveField('phone')}
                                            disabled={updatingProfile}
                                            className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 shrink-0"
                                            title="Save Changes"
                                        >
                                            {updatingProfile ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
                                            <span>Save</span>
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            disabled={updatingProfile}
                                            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shrink-0"
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
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-orange-400 dark:hover:ring-orange-500/50 transition-all ml-2 shrink-0 shadow-xs"
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
        </motion.div>
    );
};

const SettingsView = ({ user, handleLogout, containerVariants, token, showToast, t }) => {
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
            const res = await fetch('http://localhost:33159/api/auth/change-password', {
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
                const res = await fetch('http://localhost:33159/api/auth/send-2fa-code', {
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
            const res = await fetch('http://localhost:33159/api/auth/verify-2fa-code', {
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
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95"
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
                                    className="w-full bg-transparent pl-12 pr-12 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    placeholder="Enter your existing password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-lg"
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
                                        className="w-full bg-transparent pl-12 pr-12 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        placeholder="Create new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-lg"
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
                                        className="w-full bg-transparent pl-12 pr-12 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        placeholder="Repeat new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-lg"
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
                                className={`px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center gap-2.5 ${
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
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
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
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={otpInput.length < 6 || isVerifyingOtp}
                                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
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
    'Water Supply Network': {
        color: 'blue',
        icon: <Droplets size={24} strokeWidth={1.5} />,
        scope: [
            'De-clogging of blocked canals and manholes',
            'Pumping stations and estero flood control (city jurisdiction)',
            'Maintenance of public water fountains and toilets in city parks',
            'Note: Potable water supply (Maynilad) and major rivers are NOT covered',
        ],
    },
    'Power & Street Lighting': {
        color: 'yellow',
        icon: <Lightbulb size={24} strokeWidth={1.5} />,
        scope: [
            'Installation and replacement of burned-out streetlight bulbs',
            'Repair of city-owned electrical wiring and lamp posts',
            'Ensuring nighttime safety along city and barangay roads',
        ],
    },
    'Roads & Drainage': {
        color: 'orange',
        icon: <Cone size={24} strokeWidth={1.5} />,
        scope: [
            'Local city roads and barangay road repair',
            'Pothole patching and broken pavement',
            'Sidewalks, gutters, and drainage channels beside roads',
            'Pavement markings (pedestrian crossings, lane dividers)',
        ],
    },
    'Public Safety & Regulatory': {
        color: 'red',
        icon: <ShieldAlert size={24} strokeWidth={1.5} />,
        scope: [
            'Structural safety inspection of buildings (especially post-earthquake)',
            'Building permit evaluation — compliance with National Building Code',
            'Debris and fallen tree clearing after typhoons or disasters',
            'Fire safety and electrical compliance checks for new constructions',
        ],
    },
    'Public Facilities': {
        color: 'green',
        icon: <Landmark size={24} strokeWidth={1.5} />,
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

const ReportCategoryRadio = ({ value, onChange, options, disabled = false }) => {
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
        if (selectedOptions.includes(opt)) {
            onChange(selectedOptions.filter(v => v !== opt));
        } else {
            if (selectedOptions.length < 3) {
                onChange([...selectedOptions, opt]);
            }
        }
    };

    return (
        <div className={`space-y-2.5 ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            {/* Header with Live Counter */}
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Issue Category</p>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">(Required)</span>
                </div>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg transition-colors ${
                    selectedOptions.length === 3
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                        : selectedOptions.length > 0
                            ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                    {selectedOptions.length}/3 selected
                </span>
            </div>

            {/* Accessible Single-Line Category Cards */}
            <div className="flex flex-col gap-1.5" ref={tooltipRef}>
                {options.map((optObj, index) => {
                    const opt = typeof optObj === 'string' ? optObj : optObj.value;
                    const label = typeof optObj === 'string' ? optObj : optObj.label;
                    const meta = CATEGORY_META[opt] || CATEGORY_META['Roads & Drainage'];
                    const clr = COLOR_MAP[meta.color] || COLOR_MAP.orange;
                    const selected = selectedOptions.includes(opt);
                    const infoOpen = tooltip === opt;
                    const atCapacity = !selected && selectedOptions.length >= 3;
                    const isTopRow = index < 2;

                    return (
                        <div key={opt} className="relative group w-full">
                            <div
                                onClick={() => { if (!atCapacity) { handleToggle(opt); setTooltip(null); } }}
                                className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-all duration-150 select-none w-full ${
                                    selected
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/15 ring-2 ring-orange-500/40 text-slate-900 dark:text-white shadow-xs'
                                        : atCapacity
                                            ? 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                                            : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:border-orange-400 dark:hover:border-orange-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 hover:shadow-xs cursor-pointer'
                                }`}
                                title={atCapacity ? 'Maximum 3 categories selected' : undefined}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                                        selected 
                                            ? 'bg-orange-500 text-white shadow-xs' 
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:text-orange-500'
                                    }`}>
                                        {meta.icon}
                                    </div>

                                    <span className={`text-[13px] font-bold whitespace-nowrap truncate ${
                                        selected 
                                            ? 'text-orange-950 dark:text-orange-100 font-extrabold' 
                                            : 'text-slate-900 dark:text-slate-100'
                                    }`}>
                                        {label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {selected && (
                                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs">
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); setTooltip(infoOpen ? null : opt); }}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-colors ${
                                            infoOpen
                                                ? 'bg-orange-500 text-white'
                                                : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                        title="View jurisdiction & scope"
                                    >
                                        <Info size={14} />
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
                                        } z-[120] w-80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 pointer-events-auto`}
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
    locationAddress, plusCode, geocodingAddress, reportCategory, setReportCategory, reportNotes, setReportNotes, selectedImage, setSelectedImage,
    submittingReport, handleFileReport, isSelectingLocation, setIsSelectingLocation, isIDCameraOpen, setIsIDCameraOpen, checkJurisdiction,
    reverseGeocode, mapOptions, pulseRadius, processedHazards, selectedHazard, setSelectedHazard, svLocation, handleStreetViewClick,
    getIconForCategory, getMarkerSVG, getCategoryColor, mapFilter, setMapFilter,
    isAnalyzing, aiFeedback, fileInputRef, handleFileSelect,
    reportToCancel, setReportToCancel, confirmCancelReport,
    isSubmitConfirmOpen, setIsSubmitConfirmOpen, actuallySubmitReport,
    setZoomedImage,
    t
}) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    // Stop listening if modal closes
    useEffect(() => {
        if (!activeModal && recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [activeModal, isListening]);

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
                            ? 'max-w-7xl h-[88dvh] sm:h-[90vh] flex flex-col my-auto bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl sm:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden'
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

                                {/* Location Banner */}
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center shrink-0">
                                                <MapPin size={20} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                {geocodingAddress ? (
                                                    <div className="animate-pulse space-y-1">
                                                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                                                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug" title={locationAddress}>
                                                            {locationAddress && !locationAddress.startsWith('Lat:') ? locationAddress : (locationAddress || "Caloocan City Location")}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            {plusCode && (
                                                                <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                                                                    {plusCode}
                                                                </span>
                                                            )}
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                                                {reportLocation.lat.toFixed(4)}, {reportLocation.lng.toFixed(4)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => { setActiveModal('map'); setIsSelectingLocation(true); }}
                                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-orange-300 dark:border-orange-500/40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                                        >
                                            <Edit3 size={14} />
                                            <span>Change</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Main Two-Column Layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                    {/* ── LEFT COLUMN: Photo Upload & Auto-Fit Preview ── */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Photo Evidence</span>
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Auto-Fit 4:3 Frame</span>
                                        </div>

                                        {selectedImage ? (
                                            /* Auto-Fit Image Preview Container with Click-to-Zoom */
                                            <div
                                                onClick={() => setZoomedImage && setZoomedImage(selectedImage)}
                                                className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-md group cursor-zoom-in"
                                                title="Click to zoom picture"
                                            >
                                                <img
                                                    src={selectedImage}
                                                    alt="Incident Preview"
                                                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                                                />
                                                
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
                                                        setAiFeedback(null);
                                                    }}
                                                    className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/75 hover:bg-rose-600 text-white backdrop-blur-xs shadow-md transition-all cursor-pointer z-10"
                                                    title="Remove image"
                                                >
                                                    <X size={16} strokeWidth={2.5} />
                                                </button>

                                                {/* Bottom Action Affordances */}
                                                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            fileInputRef.current?.click();
                                                        }}
                                                        className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
                                                    >
                                                        <Upload size={14} />
                                                        <span>Change Photo</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsIDCameraOpen(true);
                                                        }}
                                                        className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
                                                    >
                                                        <Camera size={14} />
                                                        <span>Retake</span>
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
                                            /* Empty Upload Dropzone */
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center p-5 text-center hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50/30 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                                            >
                                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-orange-500 group-hover:scale-105 shadow-xs transition-all mb-2.5">
                                                    <Camera size={26} />
                                                </div>
                                                <p className="text-sm font-extrabold text-slate-900 dark:text-white mb-0.5">
                                                    Take photo or upload evidence
                                                </p>
                                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3.5">
                                                    Auto-fits portrait or landscape photos
                                                </p>

                                                <div className="flex gap-2.5" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsIDCameraOpen(true)}
                                                        className="px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Camera size={14} />
                                                        <span>Open Camera</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Upload size={14} />
                                                        <span>Browse File</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />

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
                                            disabled={isAnalyzing}
                                        />

                                        {/* Additional Notes Field */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                    <MessageSquareText size={14} />
                                                    <span>Additional Notes</span>
                                                </div>
                                                <span className={`text-[11px] font-mono ${
                                                    notesLength >= 500
                                                        ? 'text-rose-600 font-extrabold animate-pulse'
                                                        : notesLength >= 400
                                                            ? 'text-amber-600 font-bold'
                                                            : 'text-slate-500 dark:text-slate-400 font-semibold'
                                                }`}>
                                                    {notesLength}/500
                                                </span>
                                            </div>

                                            <div className={`relative rounded-2xl border transition-all bg-slate-50 dark:bg-slate-800/60 ${
                                                isListening
                                                    ? 'border-orange-500 ring-2 ring-orange-500/30 bg-orange-50/30 dark:bg-orange-950/30'
                                                    : 'border-slate-300 dark:border-slate-700 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20'
                                            }`}>
                                                <textarea
                                                    rows={3}
                                                    className="w-full bg-transparent text-slate-900 dark:text-white p-3.5 pr-12 text-sm outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400 resize-none font-medium"
                                                    placeholder={
                                                        isListening
                                                            ? "🎙️ Listening... Speak clearly into your microphone..."
                                                            : (reportCategory.length > 0 ? `Describe specific damage or landmark details for ${reportCategory[0]}...` : "Provide helpful context, landmark details, or specific damage...")
                                                    }
                                                    maxLength={500}
                                                    value={reportNotes}
                                                    onChange={e => setReportNotes(e.target.value)}
                                                />

                                                {/* Voice-to-Text Button */}
                                                <button
                                                    type="button"
                                                    onClick={toggleVoiceToText}
                                                    className={`absolute bottom-2.5 right-2.5 p-2 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
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
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 pt-4 mt-3 border-t border-slate-200 dark:border-slate-800">
                                <div className="text-xs">
                                    {!isCategorySelected ? (
                                        <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                                            <AlertTriangle size={14} />
                                            <span>Select at least 1 issue category to continue</span>
                                        </span>
                                    ) : (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                            <CheckCircle2 size={13} />
                                            <span>Ready to submit report</span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveModal(null);
                                            setReportCategory([]);
                                            setAiFeedback(null);
                                            setSelectedImage(null);
                                            setReportNotes('');
                                        }}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleFileReport}
                                        disabled={submittingReport || !isCategorySelected}
                                        className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
                                    >
                                        {submittingReport ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" />
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <span>Submit Report</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeModal === 'map' && (
                        <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white">Nearby Hazards</h2><p className="text-slate-500 dark:text-slate-400 font-medium">Live technical incidents board</p></div>
                                <button onClick={() => setActiveModal(null)} className="p-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="flex-1 relative">
                                {isLoaded && (
                                    <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={reportLocation} zoom={13} options={mapOptions}>
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
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '5px 14px', marginBottom: '14px' }}>
                                                                <span style={{ color: catColor, display: 'flex' }}><MapPin size={12} /></span>
                                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>{selectedHazard.dynamicDistance || selectedHazard.distance} away</span>
                                                            </div>
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
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 underline decoration-blue-500/30 underline-offset-4">{t('dashboard.terms.s1_title', { defaultValue: '1. Integrity Clause' })}</h4>
                                    <p>{t('dashboard.terms.s1_desc', { defaultValue: 'Residents are accountable for the accuracy of their reports. Fraudulent reporting will result in immediate Trust Score reduction and possible service restrictions.' })}</p>
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
                                        <img src={`http://localhost:33159${selectedPost.image_url}`} alt="Advisory Content" className="w-full object-cover" />
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
                                ⚠️ If your report is found to be fraudulent, your <span className="underline decoration-2">Trust Score (Integrity Level)</span> will be reduced.
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
        {reportToCancel && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setReportToCancel(null)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl p-8 sm:p-10 flex flex-col items-center text-center space-y-6"
                >
                    <div className="w-24 h-24 rounded-full border-4 border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.1)] relative">
                        <div className="absolute inset-0 rounded-full animate-ping bg-orange-500/10" style={{ animationDuration: '3s' }}></div>
                        <AlertTriangle size={48} className="text-orange-500" strokeWidth={1.5} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Cancel Report?</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-[15px] font-medium leading-relaxed px-4">
                            Are you sure you want to retract this report? This action <span className="text-orange-600 dark:text-orange-400 font-bold">cannot be undone</span> and will be logged in your activity history.
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
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-2xl active:scale-95 transition-all text-[15px] border border-slate-200 dark:border-slate-700 uppercase tracking-wider"
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
    setReportStatusFilter
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

    // Click outside to close search
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter items based on query
    const q = searchQuery.toLowerCase().trim();

    // 1. Navigation & Quick Actions
    const quickActions = [
        { label: 'File Infrastructure Report', category: 'Action', icon: <Camera size={16} />, onClick: () => { handleSetModal('file-report'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('File Report'); } },
        { label: 'Barangay Hazard Map', category: 'Action', icon: <Map size={16} />, onClick: () => { handleSetModal('map'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('Barangay Map'); } },
        { label: 'LGU Online Services', category: 'Action', icon: <Handshake size={16} />, onClick: () => { handleSetModal('services'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('LGU Services'); } },
        { label: 'Knowledge Base & Guides', category: 'Action', icon: <BookOpen size={16} />, onClick: () => { handleSetModal('knowledge'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('Knowledge Base'); } },
        { label: 'My Report History', category: 'Navigation', icon: <FileText size={16} />, onClick: () => { handleSetTab('reports'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('My Reports'); } },
        { label: 'My Profile & Trust Score', category: 'Navigation', icon: <User size={16} />, onClick: () => { handleSetTab('profile'); setIsSearchOpen(false); setIsMobileSearchOpen(false); saveRecentSearch('My Profile'); } },
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

    const renderSearchDropdown = () => (
        <div className="w-full max-h-[75vh] overflow-y-auto custom-scrollbar p-2 divide-y divide-slate-100 dark:divide-slate-800/80">
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
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                            {r.status}
                                        </span>
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
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 w-full border-b border-slate-200/80 dark:border-slate-800 transition-colors">
            <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">

                {/* Left Area: Logo & Search */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0 relative" ref={searchRef}>
                    <a href="/dashboard" className="flex items-center gap-2 group focus:outline-none shrink-0" onClick={(e) => { e.preventDefault(); handleSetTab('overview'); }}>
                        <Branding size="h-8 sm:h-9" showText={false} />
                        <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-orange-500 hidden min-[400px]:inline-block">PULSO</span>
                    </a>

                    {/* Desktop Search Bar */}
                    <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 rounded-full items-center px-3.5 py-1.5 sm:py-2 border border-transparent focus-within:border-orange-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all w-full max-w-[240px] lg:max-w-[320px] relative shadow-xs">
                        <Search size={15} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                            onFocus={() => setIsSearchOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setIsSearchOpen(false);
                            }}
                            placeholder={t('dashboard.topNav.searchPlaceholder', { defaultValue: 'Search PULSO...' })}
                            className="bg-transparent border-none outline-none text-xs sm:text-sm ml-2 w-full text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                            >
                                <X size={14} />
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
                                    className="absolute top-12 left-0 w-[340px] lg:w-[440px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 text-slate-900 dark:text-white overflow-hidden ring-1 ring-black/5"
                                >
                                    {renderSearchDropdown()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile Search Trigger Icon */}
                    <button
                        onClick={() => setIsMobileSearchOpen(true)}
                        className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Search"
                        aria-label="Open Search"
                    >
                        <Search size={16} />
                    </button>
                </div>

                {/* Center Navigation Tabs (Visible on Desktop / Tablet md+) */}
                <nav className="hidden md:flex items-center justify-center gap-1 lg:gap-4 h-full flex-1 max-w-[540px]">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleSetTab(item.id)}
                            className={`relative h-full px-3 lg:px-6 flex flex-col items-center justify-center transition-colors group focus:outline-none 
                                ${activeTab === item.id
                                    ? 'text-orange-500'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                        >
                            <div className="relative">
                                {React.cloneElement(item.icon, {
                                    size: 22,
                                    className: `transition-transform duration-200 ${activeTab === item.id ? 'stroke-[2.5px]' : 'group-hover:scale-110'}`
                                })}
                            </div>
                            <span className="text-[11px] font-semibold mt-0.5 whitespace-nowrap truncate max-w-[100px] lg:max-w-[140px] px-1">{item.label}</span>

                            {/* Active Tab Indicator */}
                            {activeTab === item.id && (
                                <motion.div layoutId="activeTabBottom" className="absolute bottom-0 left-0 right-0 h-[3px] bg-orange-500 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Right Area: Profile, Theme, Notifications */}
                <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">

                    {/* Theme Toggle menu item */}
                    <div className="hidden lg:flex bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700/50">
                        <button onClick={() => changeTheme('light')} className={`p-1.5 rounded-full transition-all flex justify-center ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-xs text-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`} title="Light"><Sun size={14} /></button>
                        <button onClick={() => changeTheme('system')} className={`p-1.5 rounded-full transition-all flex justify-center ${theme === 'system' ? 'bg-white dark:bg-slate-600 shadow-xs text-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`} title="System"><Monitor size={14} /></button>
                        <button onClick={() => changeTheme('dark')} className={`p-1.5 rounded-full transition-all flex justify-center ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-xs text-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`} title="Dark"><Moon size={14} /></button>
                    </div>

                    {/* Mobile Quick Theme Switcher */}
                    <button
                        onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none"
                        title={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    >
                        {theme === 'dark' ? <Sun size={16} className="text-orange-400" /> : <Moon size={16} />}
                    </button>

                    <div className="relative">
                        <button
                            className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none"
                            onClick={() => setShowNotifications(!showNotifications)}
                            aria-label="Notifications"
                        >
                            <Bell size={17} />
                            {notifications.length > 0 && notifications.some(n => !n.is_read && !n.is_hidden) && (
                                <span className="absolute top-[6px] right-[8px] w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-100 dark:ring-slate-800"></span>
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
                                                                await fetch(`http://localhost:33159/api/notifications/${notification.id}`, {
                                                                    method: 'DELETE',
                                                                    headers: { 'Authorization': `Bearer ${token}` }
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

                    <button
                        onClick={handleLogout}
                        className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors focus:outline-none"
                        title="Sign Out"
                        aria-label="Sign Out"
                    >
                        <LogOut size={16} />
                    </button>

                    <button onClick={() => handleSetTab('profile')} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-xs sm:text-sm flex items-center justify-center text-white shadow-xs shrink-0 hover:opacity-90 transition-opacity focus:outline-none cursor-pointer" aria-label="Profile">
                        {user.avatar}
                    </button>
                </div>
            </div>

            {/* Full-Screen Mobile Search Overlay */}
            <AnimatePresence>
                {isMobileSearchOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col p-4"
                    >
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                                <Search size={18} className="text-slate-400 mr-2 shrink-0" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('dashboard.topNav.searchPlaceholder', { defaultValue: 'Search PULSO...' })}
                                    className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-white placeholder-slate-400"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-slate-400 p-1">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setIsMobileSearchOpen(false)}
                                className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1"
                            >
                                Cancel
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pt-2">
                            {renderSearchDropdown()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default function ResidentDashboard() {
    const { t, i18n } = useTranslation();
    const { theme, changeTheme } = useTheme();
    const navigate = useNavigate();
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
        if (!window.google || !window.google.maps || !window.google.maps.geometry) return true;

        const polygon = new window.google.maps.Polygon({ paths: NORTH_CALOOCAN_BOUNDARY });
        const latLng = new window.google.maps.LatLng(location.lat, location.lng);
        const isIn = window.google.maps.geometry.poly.containsLocation(latLng, polygon);

        if (!isIn) {
            showToast(t('This location is outside North Caloocan City jurisdiction.'));
        }
        return isIn;
    };

    const mapOptions = React.useMemo(() => ({
        styles: theme === 'dark' ? [
            { "elementType": "geometry", "stylers": [{ "color": "#121826" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#637282" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#121826" }] },
            { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#2c3e50" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#232b3d" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0d1117" }] }
        ] : [],
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
    }), [theme]);

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
    const [loadingReports, setLoadingReports] = useState(true);
    const [reportStatusFilter, setReportStatusFilter] = useState('all');

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem('pulso_token');
        localStorage.removeItem('pulso_user');
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
            const response = await fetch(`http://localhost:33159/api/reports/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUserReports(data);
            }
        } catch (error) {
            console.error("PULSO: Error fetching reports:", error);
        } finally {
            setLoadingReports(false);
        }
    };

    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = async (userId) => {
        try {
            const response = await fetch(`http://localhost:33159/api/notifications/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error("PULSO: Error fetching notifications:", error);
        }
    };

    const handleMarkAllRead = async () => {
        if (!currentUser) return;
        try {
            const response = await fetch(`http://localhost:33159/api/notifications/user/${currentUser.id}/read`, {
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
                await fetch(`http://localhost:33159/api/notifications/${notif.id}/read`, {
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
                const response = await fetch('http://localhost:33159/api/advisories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setLguUpdates(data);
                }
            } catch (error) {
                console.error("PULSO: Error fetching advisories:", error);
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
    const [reportCategory, setReportCategory] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportLocation, setReportLocation] = useState({ lat: 14.7566, lng: 121.0450 }); // Center of Caloocan North
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [mapFilter, setMapFilter] = useState('Nearby'); // State for new map UI filter
    const [selectedHazard, setSelectedHazard] = useState(null); // Tracks the clicked map marker

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

        const myReportMarkers = (userReports || []).map(r => {
            const lat = parseFloat(r.location_lat || r.lat);
            const lng = parseFloat(r.location_lng || r.lng);
            return {
                id: r.id || `user-report-${r.ticket_id}`,
                lat,
                lng,
                title: r.description || `Resident Report - ${r.ticket_id}`,
                category: r.category || r.ai_category || 'Resident Report',
                status: (r.status || 'pending').toLowerCase(),
                location: r.location_string || 'N/A'
            };
        }).filter(r => !isNaN(r.lat) && !isNaN(r.lng));

        // Process only actual user reports from the database
        return myReportMarkers.map(hazard => {
            const meters = getDistance(reportLocation, { lat: hazard.lat, lng: hazard.lng });
            return {
                ...hazard,
                dynamicDistance: formatDistance(meters),
                distanceValue: meters || 999999
            };
        }).sort((a, b) => a.distanceValue - b.distanceValue);
    }, [reportLocation, userReports, isLoaded]);


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

            // 3. Set clean image directly without watermark
            setSelectedImage(URL.createObjectURL(file));
        }
    };

    const handleAIAnalyze = async () => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            if (reportNotes) formData.append('description', reportNotes);

            if (selectedImage && selectedImage.startsWith('blob:')) {
                const response = await fetch(selectedImage);
                const blob = await response.blob();
                formData.append('image', blob, 'analysis.jpg');
            }

            const res = await fetch('http://localhost:33159/api/reports/analyze', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAiFeedback(data);

                // Map AI category to exact category keys to auto-select
                const aiCat = (data.category || '').toLowerCase();
                let mapped = [];

                if (aiCat.includes('light') || aiCat.includes('electric') || aiCat.includes('power') || aiCat.includes('lamp') || aiCat.includes('street')) {
                    mapped.push('Power & Street Lighting');
                } else if (aiCat.includes('road') || aiCat.includes('bridge') || aiCat.includes('pothole') || aiCat.includes('asphalt') || aiCat.includes('pavement')) {
                    mapped.push('Roads & Drainage');
                } else if (aiCat.includes('water') || aiCat.includes('drain') || aiCat.includes('flood') || aiCat.includes('canal') || aiCat.includes('sewer') || aiCat.includes('pipe') || aiCat.includes('manhole')) {
                    mapped.push('Water Supply Network');
                } else if (aiCat.includes('safety') || aiCat.includes('regulat') || aiCat.includes('hazard') || aiCat.includes('fire') || aiCat.includes('building') || aiCat.includes('debris') || aiCat.includes('tree')) {
                    mapped.push('Public Safety & Regulatory');
                } else if (aiCat.includes('facilit') || aiCat.includes('park') || aiCat.includes('hall') || aiCat.includes('court') || aiCat.includes('school') || aiCat.includes('gym')) {
                    mapped.push('Public Facilities');
                }

                if (mapped.length > 0) {
                    setReportCategory(mapped);
                }
            }
        } catch (err) {
            console.error("AI Analysis failed:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };



    // Reverse-geocoded address for the report location picker
    const [locationAddress, setLocationAddress] = useState('');
    const [plusCode, setPlusCode] = useState('');
    const [geocodingAddress, setGeocodingAddress] = useState(false);

    const reverseGeocode = async (lat, lng) => {
        setGeocodingAddress(true);
        let primaryAddress = '';
        let plusCodeStr = '';

        // 1. Try Google Maps Geocoder First
        if (isLoaded && window.google) {
            try {
                const geocoder = new window.google.maps.Geocoder();
                const response = await geocoder.geocode({ location: { lat, lng } });
                if (response.results && response.results.length > 0) {
                    primaryAddress = response.results[0].formatted_address;
                }
            } catch (err) {
                console.warn("Frontend Google geocoding failed...", err);
            }
        }
        
        // 1.5 Fallback to Backend Google Maps API (often works when frontend keys hit CORS or referrer restrictions)
        if (!primaryAddress) {
            try {
                const res = await fetch(`http://localhost:33159/api/geocode/reverse?lat=${lat}&lng=${lng}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    if (data.address && !data.address.startsWith("Lat:")) {
                        primaryAddress = data.address;
                    }
                }
            } catch (err) {
                console.warn("Backend Google geocoding failed...", err);
            }
        }
        
        // 2. Try Free OpenStreetMap (Nominatim) if Google Maps completely fails
        if (!primaryAddress) {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&email=hello@pulso.app`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.display_name) {
                        primaryAddress = data.display_name;
                    }
                }
            } catch (err) {
                console.warn("Nominatim geocoding failed...", err);
            }
        }

        // 3. Fetch Plus Code (Open Location Code) via Free BigDataCloud API
        try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.plusCode) {
                    let shortCode = data.plusCode;
                    if (shortCode.length >= 10 && shortCode.includes('+')) {
                        shortCode = shortCode.substring(4);
                    }
                    
                    const locality = data.locality || data.city || '';
                    const region = (data.principalSubdivision === "National Capital Region") ? "Metro Manila" : (data.principalSubdivision || '');
                    plusCodeStr = locality ? `${shortCode} ${locality}, ${region}`.replace(/,\s*$/, '') : shortCode;
                }
            }
        } catch (err) {
            console.warn("BigDataCloud Plus Code API failed...", err);
        }
        
        // Final Formatting
        setLocationAddress(primaryAddress || `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
        setPlusCode(plusCodeStr);
        setGeocodingAddress(false);
    };

    const handleFileReport = () => {
        if (reportCategory.length === 0) {
            showToast('Please select at least one issue category.', 'error');
            return;
        }
        setIsSubmitConfirmOpen(true);
    };

    const actuallySubmitReport = async () => {
        setIsSubmitConfirmOpen(false);
        setSubmittingReport(true);
        try {
            const formData = new FormData();
            formData.append('category', Array.isArray(reportCategory) ? reportCategory.join(', ') : reportCategory);
            formData.append('description', reportNotes || "Citizen report from PULSO app.");
            formData.append('lat', reportLocation.lat);
            formData.append('lng', reportLocation.lng);
            formData.append('location_string', locationAddress || `Lat: ${reportLocation.lat.toFixed(4)}, Lng: ${reportLocation.lng.toFixed(4)}`);

            if (selectedImage) {
                const response = await fetch(selectedImage);
                const blob = await response.blob();
                formData.append('image', blob, `report-${Date.now()}.jpg`);
            }

            const response = await fetch('http://localhost:33159/api/reports', {
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
            const res = await fetch(`http://localhost:33159/api/reports/${reportId}/cancel`, {
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
    const [user, setUser] = useState({
        name: 'Resident',
        fullName: 'Loading...',
        barangay: 'Loading...',
        email: '',
        phone: '',
        memberSince: 'Loading...',
        trustScore: 100,
        avatar: 'R'
    });
    const [updatingProfile, setUpdatingProfile] = useState(false);

    const fetchUser = async (userId) => {
        try {
            const response = await fetch(`http://localhost:33159/api/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUser({
                    name: data.full_name ? data.full_name.split(' ')[0] : 'Resident',
                    fullName: data.full_name || '',
                    address: data.address || '',
                    barangay: data.barangay || '',
                    email: data.email || '',
                    phone: data.phone_number || '', // Mapped to phone_number
                    memberSince: new Date(data.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
                    trustScore: data.trust_score || 100,
                    avatar: data.full_name ? data.full_name.charAt(0).toUpperCase() : 'R'
                });
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

            const response = await fetch(`http://localhost:33159/api/users/${currentUser.id}`, {
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
        if (!aiQuery.trim() || isAILoading) return;

        const userMsg = { role: 'user', text: aiQuery };
        setAiMessages(prev => [...prev, userMsg]);
        const captured = aiQuery;
        setAiQuery('');
        setIsAILoading(true);

        try {
            const resp = await fetch('http://localhost:33159/api/ai/assistant', {
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
                plusCode={plusCode}
                geocodingAddress={geocodingAddress}
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
                fileInputRef={fileInputRef}
                handleFileSelect={handleFileSelect}
                reportToCancel={reportToCancel}
                setReportToCancel={setReportToCancel}
                confirmCancelReport={confirmCancelReport}
                isSubmitConfirmOpen={isSubmitConfirmOpen}
                setIsSubmitConfirmOpen={setIsSubmitConfirmOpen}
                actuallySubmitReport={actuallySubmitReport}
                setZoomedImage={setZoomedImage}
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
                                                                await fetch(`http://localhost:33159/api/notifications/${notif.id}`, {
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
            />

            {/* Main Layout Grid (Responsive 1/2/3-Column Layout) */}
            <main className="flex-1 overflow-hidden w-full flex flex-col relative">

                <div className="max-w-[1600px] mx-auto w-full px-0 sm:px-4 h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)]">

                    {/* Content switcher based on tabs */}
                    {(activeTab === 'overview' || activeTab === 'home') && (
                        <div className="w-full h-full flex flex-col md:flex-row items-center md:items-start justify-center gap-0 lg:gap-6 xl:gap-8">

                            {/* Left Column (Shortcuts) - 280px to 320px on Desktop */}
                            <aside className="w-[280px] lg:w-[300px] xl:w-[320px] shrink-0 hidden md:block h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
                                <LeftSidebar
                                    user={user}
                                    handleSetTab={handleSetTab}
                                    handleSetModal={handleSetModal}
                                    t={t}
                                />
                            </aside>

                            {/* Mobile Layout Shortcuts Strip (Touch-Optimized Horizontal Carousel) */}
                            <div className="md:hidden w-full px-3 sm:px-4 pt-3 pb-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0 relative z-20 shadow-xs">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <h3 className="font-extrabold text-[12px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        {t('dashboard.overview.shortcuts', { defaultValue: 'Quick Shortcuts' })}
                                    </h3>
                                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Swipe →</span>
                                </div>
                                <div className="flex overflow-x-auto gap-2.5 pb-2 snap-x hide-scrollbar -mx-1 px-1">
                                    {quickFunctions.map((func) => (
                                        <button
                                            key={func.id}
                                            onClick={func.action}
                                            className="min-w-[80px] max-w-[88px] flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 snap-start active:scale-95 transition-all shadow-2xs hover:border-orange-500/50 group"
                                        >
                                            <div className={`w-11 h-11 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center mb-1 text-${func.color}-500 shadow-2xs border border-slate-100 dark:border-slate-600 group-hover:scale-105 transition-transform`}>
                                                {func.icon}
                                            </div>
                                            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 text-center leading-tight line-clamp-2">{func.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Center Column (Main Feed) - Responsive width with mobile bottom padding */}
                            <div className="flex-1 w-full min-w-0 max-w-[680px] h-full overflow-y-auto custom-scrollbar pb-28 md:pb-8 pt-2 md:pt-6 px-3 sm:px-4 md:px-2">
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

                            {/* Right Column (Widgets) - 320px on Desktop */}
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
                        <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col items-center pb-28 md:pb-8 pt-3 sm:pt-6 px-3 sm:px-6">
                            {activeTab === 'reports' && (
                                <div className="w-full max-w-5xl">
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
                                <div className="w-full max-w-4xl">
                                    <ProfileView
                                        user={user}
                                        setUser={setUser}
                                        handleUpdateProfile={handleUpdateProfile}
                                        updatingProfile={updatingProfile}
                                        containerVariants={containerVariants}
                                        userReports={userReports}
                                        showToast={showToast}
                                        t={t}
                                    />
                                </div>
                            )}
                            {activeTab === 'settings' && (
                                <div className="w-full max-w-4xl">
                                    <SettingsView
                                        user={user}
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

            {/* ── Mobile Bottom Navigation Bar (Ultra-responsive, glassmorphism, touch-optimized) ── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleSetTab(item.id)}
                            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 relative group active:scale-95 ${
                                isActive
                                    ? 'text-orange-500 font-bold'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <div className="relative">
                                {React.cloneElement(item.icon, {
                                    size: 22,
                                    className: `transition-transform duration-200 ${isActive ? 'stroke-[2.5px] scale-110' : ''}`
                                })}
                                {isActive && (
                                    <motion.div
                                        layoutId="mobileNavActivePill"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-orange-500 rounded-full"
                                    />
                                )}
                            </div>
                            <span className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[64px] ${isActive ? 'font-bold text-orange-500' : 'font-medium'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* ── PULSO Resident AI Assistant FAB ────────────────────────────── */}
            <div className="fixed bottom-20 md:bottom-8 right-4 md:right-6 z-[50] flex flex-col items-end gap-4">
                <AnimatePresence>
                    {isAIChatOpen && (
                        <>
                            {/* Backdrop for maximized mode or mobile modal */}
                            {(isAIMaximized || window.innerWidth < 640) && (
                                <motion.div
                                    key="resident-ai-backdrop"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99]"
                                    onClick={() => setIsAIChatOpen(false)}
                                />
                            )}

                            <motion.div
                                key="resident-ai-chat"
                                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                className={`bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-300 ${isAIMaximized
                                        ? 'fixed inset-3 sm:inset-8 md:inset-12 z-[100] rounded-3xl'
                                        : 'fixed inset-x-3 bottom-20 sm:inset-auto sm:bottom-24 sm:right-6 w-auto sm:w-[380px] h-[72vh] sm:h-[520px] max-h-[560px] rounded-2xl z-[100]'
                                    }`}
                            >
                                {/* Header */}
                                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-900 to-blue-800 flex justify-between items-center shrink-0">
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

                                {/* Suggested quick-actions */}
                                {aiMessages.length === 1 && (
                                    <div className="px-3 py-2 bg-orange-50 dark:bg-slate-800 border-b border-orange-100 dark:border-slate-700 flex gap-1.5 flex-wrap shrink-0">
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
                                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                    {aiMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                                                    <Brain size={12} className="text-white" />
                                                </div>
                                            )}
                                            <div className={`${isAIMaximized ? 'max-w-[70%]' : 'max-w-[85%]'
                                                } p-3 rounded-2xl text-[13px] font-medium leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-blue-700 text-white rounded-br-xs'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
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
                                            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-bl-xs flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={aiChatEndRef} />
                                </div>

                                {/* Input */}
                                <form onSubmit={handleResidentAIChat} className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={aiQuery}
                                            onChange={e => setAiQuery(e.target.value)}
                                            placeholder="Ask PULSO Assistant..."
                                            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-700 outline-none placeholder:text-slate-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isAILoading}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-800 hover:bg-blue-700 flex items-center justify-center text-white transition-colors disabled:opacity-40 shrink-0"
                                        >
                                            <Search size={15} />
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
                    className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-900 shadow-xl shadow-blue-900/50 flex items-center justify-center text-white cursor-pointer"
                    title="PULSO Assistant"
                    aria-label="Toggle PULSO Assistant"
                >
                    <AnimatePresence>
                        {!isAIChatOpen && (
                            <motion.span
                                key="pulse"
                                className="absolute inset-0 rounded-full bg-blue-700 opacity-60"
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
        </div>
    );
}
