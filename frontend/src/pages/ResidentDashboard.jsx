import React, { useState, useEffect } from 'react';
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
    ChevronRight,
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
    ThumbsUp,
    TrendingUp,
    CheckCircle,
    Truck,
    Menu,
    X as XIcon,
    Radio,
    Loader2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
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

const REPORT_CATEGORIES = [
    'Road Issue',
    'Water / Drainage',
    'Waste Management',
    'Street Lighting',
    'Public Safety',
    'Flooding',
    'Other',
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

const EMERGENCY_HOTLINES = [
    { name: 'City Engineering', tags: 'Public Works, Hazards', num: '888-1234', color: 'orange' },
    { name: 'Maynilad', tags: 'Water Leaks, Drainage', num: '1626', color: 'blue' },
    { name: 'Meralco', tags: 'Live Wires, Outages', num: '16211', color: 'yellow' }
];

const QUICK_FUNCTIONS_DATA = [
    { id: 'report', icon: <Camera size={22} />, label: 'File Report', color: 'orange', modal: 'file-report' },
    { id: 'map', icon: <Map size={22} />, label: 'Barangay Map', color: 'blue', modal: 'map' },
    { id: 'services', icon: <Handshake size={22} />, label: 'LGU Services', color: 'green', modal: 'services' },
    { id: 'knowledge', icon: <BookOpen size={22} />, label: 'Knowledge Base', color: 'indigo', modal: 'knowledge' },
    { id: 'track', icon: <Search size={22} />, label: 'Track Issue', color: 'teal', tab: 'reports' }
];

const NAV_ITEMS = (t) => [
    { id: 'overview', icon: <Home size={28} strokeWidth={2.5} />, label: t('dashboard.sidebar.overview', { defaultValue: 'Home' }) },
    { id: 'reports', icon: <FileText size={28} />, label: t('dashboard.sidebar.reports', { defaultValue: 'My Reports' }) },
    { id: 'profile', icon: <User size={28} />, label: t('dashboard.sidebar.profile', { defaultValue: 'Profile' }) },
    { id: 'settings', icon: <Settings size={28} />, label: t('dashboard.sidebar.settings', { defaultValue: 'Settings' }) },
];

const LeftSidebar = ({ user, handleSetTab, handleSetModal }) => (
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
            <div className="px-3 pb-2 text-[13px] font-bold text-slate-500 dark:text-slate-400">Shortcuts</div>
            {QUICK_FUNCTIONS_DATA.map(func => (
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
            <a href="#" className="hover:underline hover:text-orange-500 mr-2 inline-block">Privacy</a> · 
            <a href="#" className="hover:underline hover:text-orange-500 mx-2 inline-block">Terms</a> · 
            <a href="#" className="hover:underline hover:text-orange-500 mx-2 inline-block">Cookies</a> · 
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
    map 
}) => (
    <div className="w-full h-full pb-6 hidden xl:block pr-2 pl-4 lg:pl-6 pt-6">
        <div className="mb-6">
            <h3 className="font-bold text-[13px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">Your Impact</h3>
            <div onClick={() => handleSetModal(null)} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-orange-500/50 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                           <ShieldCheck size={20} className="text-orange-500" />
                       </div>
                       <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Trust Score</span>
                    </div>
                    <span className="text-2xl font-display font-bold text-orange-500">{user.trustScore}</span>
                </div>
                <div className="relative grid grid-cols-2 gap-2 mt-2 pt-4">
                    <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="text-lg font-bold font-display text-slate-900 dark:text-white">
                            {loadingReports ? '...' : userReports.filter(r => r.status === 'resolved').length}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase">Resolved</div>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="text-lg font-bold font-display text-slate-900 dark:text-white">
                            {loadingReports ? '...' : userReports.filter(r => r.status !== 'resolved' && r.status !== 'rejected').length}
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
                    See All <ChevronRight size={14}/>
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
                                     {hazard.category} • {hazard.time}
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
                                        <MapPin size={12} strokeWidth={2.5}/> View on Map
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
                    {EMERGENCY_HOTLINES.map((hotline, idx) => (
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

const LguFeed = ({ lguUpdates, loadingAdvisories, getIconForCategory, setSelectedPost, setActiveModal, containerVariants }) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full">
        <div className="mb-4 hidden md:block relative pb-4">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 px-1">
                <ShieldCheck className="text-orange-500" size={24} /> Official Board
            </h2>
            <p className="text-slate-500 text-[14px] mt-1 px-1">Important updates and advisories from your local government.</p>
        </div>
        <div className="space-y-4">
            {loadingAdvisories ? (
                <div className="flex justify-center py-10"><span className="text-slate-400">Loading advisories...</span></div>
            ) : lguUpdates.length === 0 ? (
                <div className="text-center text-slate-400 py-16 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Bell className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="font-bold text-slate-500">No new advisories today</p>
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
                             <button onClick={() => { setSelectedPost(update); setActiveModal('post-details'); }} className="text-[14px] font-bold text-orange-500">Read Details</button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    </motion.div>
);

const STATUS_CONFIG = {
    resolved:   { label: 'Resolved',   bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
    pending:    { label: 'Pending',    bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
    unverified: { label: 'Unverified', bg: '#e0e7ff', text: '#4338ca', dot: '#6366f1' },
    rejected:   { label: 'Rejected',   bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
    'in_progress': { label: 'In Progress', bg: '#ffe4c4', text: '#c2410c', dot: '#f97316' },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status?.toLowerCase()] || { label: status, bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
    return (
        <span style={{ background: cfg.bg, color: cfg.text }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
            <span style={{ background: cfg.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
            {cfg.label}
        </span>
    );
};

const MyReports = ({ userReports, loadingReports, handleSetModal, containerVariants }) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white">My Reports</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track all your submitted incidents</p>
            </div>
            <button onClick={() => handleSetModal('file-report')} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95">
                <Camera size={15}/> File Report
            </button>
        </div>
        <div className="space-y-3">
            {loadingReports ? (
                <div className="text-center text-slate-400 py-10 flex flex-col items-center gap-2">
                    <Loader2 size={24} className="animate-spin text-orange-500" />
                    <span className="text-sm">Loading your reports...</span>
                </div>
            ) : userReports.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <FileText size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="font-bold text-slate-400">No reports filed yet</p>
                    <p className="text-sm text-slate-400 mt-1">Be the first to report an issue in your area.</p>
                </div>
            ) : userReports.map((report) => (
                <div key={report.id} className={`border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-start gap-4 transition-all hover:border-orange-500/40 hover:shadow-sm ${report.status === 'resolved' ? 'opacity-75' : ''}`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        report.status === 'resolved' ? 'bg-green-50 dark:bg-green-900/20 text-green-500' :
                        report.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' :
                        'bg-orange-50 dark:bg-orange-900/20 text-orange-500'
                    }`}>
                        <Zap size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="font-bold text-slate-900 dark:text-white text-[14px] leading-tight">{report.ai_category || report.category}</div>
                            <StatusBadge status={report.status} />
                        </div>
                        <div className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">{report.ticket_id}</div>
                        <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                            {new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} • {report.location_string}
                        </div>
                        {report.status === 'rejected' && (
                            <div className="mt-2 text-[11px] text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg px-2.5 py-1.5 border border-red-100 dark:border-red-900/20">
                                ⚠ This report did not meet submission requirements.
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </motion.div>
);

const ProfileView = ({ user, setUser, handleUpdateProfile, updatingProfile, containerVariants }) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <h2 className="text-2xl font-bold font-display mb-8">Personal Information</h2>
        <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center gap-4 shrink-0">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold flex items-center justify-center text-white text-5xl shadow-lg relative">{user.avatar}</div>
                <div className="text-center"><div className="text-xs text-slate-500 uppercase font-bold">PULSO User</div><div className="text-sm text-slate-400">Joined {user.memberSince}</div></div>
            </div>
            <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label><input type="text" disabled defaultValue={user.fullName} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2.5" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Barangay</label><input type="text" disabled defaultValue={user.barangay} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2.5" /></div>
                </div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><div className="flex"><input type="email" value={user.email} onChange={(e) => setUser({...user, email: e.target.value})} className="w-full border rounded-l-lg px-4 py-2.5" /><button onClick={() => handleUpdateProfile('email', user.email)} className="bg-slate-100 border border-l-0 rounded-r-lg px-4 font-bold text-sm">{updatingProfile ? '...' : 'Update'}</button></div></div>
            </div>
        </div>
    </motion.div>
);

const SettingsView = ({ handleLogout, containerVariants }) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <h2 className="text-2xl font-bold font-display mb-6">Account Settings</h2>
        <button onClick={handleLogout} className="flex items-center gap-2 p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-bold transition-colors"><LogOut size={18}/> Sign Out of PULSO</button>
    </motion.div>
);

const ResidentModals = ({ 
    activeModal, setActiveModal, selectedPost, setSelectedPost, isLoaded, map, setMap, panorama, setPanorama, reportLocation, setReportLocation, 
    locationAddress, geocodingAddress, reportCategory, setReportCategory, reportNotes, setReportNotes, selectedImage, setSelectedImage, 
    submittingReport, handleFileReport, isSelectingLocation, setIsSelectingLocation, isIDCameraOpen, setIsIDCameraOpen, checkJurisdiction, 
    reverseGeocode, mapOptions, pulseRadius, processedHazards, selectedHazard, setSelectedHazard, svLocation, handleStreetViewClick, 
    getIconForCategory, getMarkerSVG, mapFilter, setMapFilter 
}) => (
    <AnimatePresence>
        {activeModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setActiveModal(null)}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`w-full flex flex-col my-8 pointer-events-auto ${activeModal === 'map' ? 'max-w-7xl h-[90vh]' : 'max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden'}`} onClick={e => e.stopPropagation()}>
                    {activeModal === 'file-report' && (
                        <div className="p-6 space-y-5">
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">New AI Report</h3><button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-slate-100 rounded-full"><X size={20}/></button></div>
                            {selectedImage ? <img src={selectedImage} className="w-full rounded-2xl aspect-video object-cover" /> : <button onClick={() => setIsIDCameraOpen(true)} className="w-full bg-slate-900 rounded-2xl aspect-video flex flex-col items-center justify-center text-white"><Camera size={40} className="text-orange-500 mb-2"/><span>Open Camera</span></button>}
                            <IDCameraModal isOpen={isIDCameraOpen} onClose={() => setIsIDCameraOpen(false)} onCapture={file => setSelectedImage(URL.createObjectURL(file))} title="Issue Photo" side="ISSUE" />
                            <div className="space-y-3">
                                <select className="w-full border p-3 rounded-xl" value={reportCategory} onChange={e => setReportCategory(e.target.value)}>{REPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                <textarea className="w-full border p-3 rounded-xl" rows="2" placeholder="Additional notes..." value={reportNotes} onChange={e => setReportNotes(e.target.value)} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button className="flex-1 py-3 bg-slate-100 font-bold rounded-xl" onClick={() => setActiveModal(null)}>Cancel</button>
                                <button className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl" onClick={handleFileReport} disabled={submittingReport}>{submittingReport ? '...' : 'Submit Report'}</button>
                            </div>
                        </div>
                    )}
                    {activeModal === 'map' && (
                        <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white">Nearby Hazards</h2><p className="text-slate-500 dark:text-slate-400 font-medium">Live technical incidents board</p></div>
                                <button onClick={() => setActiveModal(null)} className="p-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><X size={20}/></button>
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
                                                <div style={{ background:'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', borderRadius:'16px', padding:'18px', minWidth:'230px', border:'1px solid rgba(255,255,255,0.07)', margin:'-10px', boxShadow:'0 25px 50px rgba(0,0,0,0.7)', fontFamily:'Inter,sans-serif', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', position:'relative' }}>
                                                    <button onClick={() => setSelectedHazard(null)} style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:'28px', height:'28px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>×</button>
                                                    <div style={{ width:'46px', height:'46px', borderRadius:'50%', background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.25)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'12px', color:'#f97316' }}><AlertTriangle size={20} /></div>
                                                    <div style={{ fontSize:'10px', fontWeight:800, letterSpacing:'0.12em', color: selectedHazard.status==='resolved'?'#4ade80':'#fb923c', background: selectedHazard.status==='resolved'?'rgba(74,222,128,0.12)':'rgba(251,146,60,0.12)', padding:'3px 12px', borderRadius:'999px', marginBottom:'10px', textTransform:'uppercase' }}>{selectedHazard.status}</div>
                                                    <h4 style={{ fontWeight:700, fontSize:'15px', color:'#f1f5f9', lineHeight:'1.35', margin:'0 0 4px', padding:'0 20px' }}>{selectedHazard.title}</h4>
                                                    <p style={{ fontSize:'10px', fontWeight:800, letterSpacing:'0.15em', color:'#60a5fa', marginBottom:'12px', textTransform:'uppercase' }}>{selectedHazard.category}</p>
                                                    <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'999px', padding:'5px 14px', marginBottom:'14px' }}>
                                                        <span style={{ color:'#f97316', display:'flex' }}><MapPin size={12} /></span>
                                                        <span style={{ fontSize:'12px', fontWeight:700, color:'#cbd5e1' }}>{selectedHazard.dynamicDistance || selectedHazard.distance} away</span>
                                                    </div>
                                                    <button onClick={() => handleStreetViewClick({ lat:selectedHazard.lat, lng:selectedHazard.lng })} style={{ width:'100%', padding:'11px 0', background:'linear-gradient(135deg,#ea580c,#f97316)', border:'none', borderRadius:'12px', color:'white', fontSize:'13px', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(249,115,22,0.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                                                        <Eye size={14} /> Open Street View
                                                    </button>
                                                </div>
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
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

// --- MAIN COMPONENT ---

// --- SUB-COMPONENTS (Defined outside to prevent re-creation on render) ---

const TopNavigation = ({ 
    activeTab, 
    handleSetTab, 
    theme, 
    changeTheme, 
    showNotifications, 
    setShowNotifications, 
    notifications, 
    handleMarkAllRead, 
    handleLogout, 
    handleSearch, 
    showSearchDropdown, 
    setShowSearchDropdown,
    user,
    navItems,
    showToast
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
                        placeholder="Search PULSO..." 
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
                                <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Recent Searches</div>
                                <button className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm flex items-center gap-2"><Clock size={14}/> Water Interruption Schedule</button>
                                <button className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm flex items-center gap-2"><Clock size={14}/> Engineering Contact Number</button>
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

                <button className="relative w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none" onClick={() => showToast('Opening App Drawer...')}>
                    <Grid size={20} />
                </button>
                <div className="relative">
                    <button 
                        className="relative w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none" 
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {notifications.length > 0 && notifications.some(n => !n.is_read) && (
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
                                    <button 
                                        onClick={handleMarkAllRead}
                                        className="text-orange-500 text-xs font-bold hover:underline"
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                                <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-500">No new notifications</div>
                                    ) : (
                                        notifications.map(notification => (
                                            <button key={notification.id} className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex gap-3 relative overflow-hidden group">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{notification.title}</p>
                                                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{notification.message}</p>
                                                    <span className="text-[10px] text-blue-500 font-bold mt-1 block">{new Date(notification.created_at).toLocaleString()}</span>
                                                </div>
                                                {!notification.is_read && (
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-4 right-3 group-hover:opacity-0 transition-opacity"></div>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                                <button className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mt-2 py-2 border-t border-slate-100 dark:border-slate-800">See previous notifications</button>
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
    const { t } = useTranslation();
    const { theme, changeTheme } = useTheme();
    const navigate = useNavigate();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [activeModal, setActiveModal] = useState(null); // 'file-report', 'post-details'

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
    const [toastMessage, setToastMessage] = useState('');
    const [isIDCameraOpen, setIsIDCameraOpen] = useState(false);

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const [lguUpdates, setLguUpdates] = useState([]);
    const [loadingAdvisories, setLoadingAdvisories] = useState(true);

    // New State for User Reports
    const [userReports, setUserReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);

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
            const response = await fetch(`http://localhost:8000/api/reports/user/${userId}`, {
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
            const response = await fetch(`http://localhost:8000/api/notifications/user/${userId}`, {
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
            const response = await fetch(`http://localhost:8000/api/notifications/user/${currentUser.id}/read`, {
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

    useEffect(() => {
        console.log("PULSO: ResidentDashboard useEffect triggered. currentUser:", currentUser?.id);
        const fetchAdvisories = async () => {
            console.log("PULSO: Fetching advisories from http://localhost:8000/api/advisories");
            try {
                const response = await fetch('http://localhost:8000/api/advisories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log("PULSO: Advisories response status:", response.status);
                if (response.ok) {
                    const data = await response.json();
                    console.log("PULSO: Advisories fetched count:", data.length);
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
                console.log("PULSO: Starting loadData for user:", currentUser.id);
                try {
                    await fetchUser(currentUser.id);
                    await fetchAdvisories();
                    await fetchUserReports(currentUser.id);
                    await fetchNotifications(currentUser.id);
                } catch (e) {
                    console.error("PULSO: Error in loadData sequence:", e);
                }
            } else {
                console.log("PULSO: No currentUser, loadData skipped.");
            }
        };
        loadData();
    }, [currentUser]);

    const [reportNotes, setReportNotes] = useState('');
    const [reportCategory, setReportCategory] = useState('Road Issue');
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportLocation, setReportLocation] = useState({ lat: 14.7566, lng: 121.0450 }); // Center of Caloocan North
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [mapFilter, setMapFilter] = useState('Nearby'); // State for new map UI filter
    const [selectedHazard, setSelectedHazard] = useState(null); // Tracks the clicked map marker

    const REPORT_CATEGORIES = [
        'Road Issue',
        'Water / Drainage',
        'Waste Management',
        'Street Lighting',
        'Public Safety',
        'Flooding',
        'Other',
    ];

    // SVG Marker Pin Generator for Map Symbols
    const getMarkerSVG = (category, status) => {
        let color = status === 'resolved' ? '#22c55e' : (status === 'pending' || status === 'unverified' ? '#ef4444' : '#f97316');
        let svgIcon = ''; 
        const cat = (category || '').toLowerCase();
        
        if (cat.includes('flood') || cat.includes('water') || cat.includes('drainage')) {
            svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
        } else if (cat.includes('electric') || cat.includes('wire') || cat.includes('power') || cat.includes('lighting')) {
            svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
        } else if (cat.includes('road') || cat.includes('pothole') || cat.includes('infrastructure')) {
            svgIcon = `<path d="M12 2a6 6 0 0 0-6 6v2H4v2h16v-2h-2V8a6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4v2H8V8a4 4 0 0 1 4-4z" fill="white"/>`;
        } else {
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

    // Simulated data for presentation layer
    const simulatedHazards = [
        { id: 1, category: 'Flooding', title: 'Deep Puddles on Highway', lat: 14.7566, lng: 121.0450, status: 'pending', time: '10 mins ago', distance: '1.2 km' }, 
        { id: 2, category: 'Road Issue', title: 'Cracked Surface', lat: 14.7610, lng: 121.0480, status: 'unverified', time: '1 hr ago', distance: '2.5 km' }, 
        { id: 3, category: 'Electrical', title: 'Fallen Wire Hazard', lat: 14.7520, lng: 121.0410, status: 'pending', time: '5 hrs ago', distance: '0.8 km' },
        { id: 4, category: 'Waste Management', title: 'Uncollected Trash Blockage', lat: 14.7590, lng: 121.0390, status: 'pending', time: '1 day ago', distance: '3.1 km' }, 
        { id: 5, category: 'Flooding', title: 'Blocked City Drainage', lat: 14.7650, lng: 121.0500, status: 'pending', time: '30 mins ago', distance: '4.0 km' }, 
        { id: 6, category: 'Road Issue', title: 'Severe Pothole', lat: 14.7480, lng: 121.0350, status: 'resolved', time: '2 days ago', distance: '1.5 km' },
        { id: 7, category: 'Public Safety', title: 'Broken Street Light', lat: 14.7630, lng: 121.0420, status: 'pending', time: '2 hrs ago', distance: '0.5 km' }, 
        { id: 8, category: 'Electrical', title: 'Transformer Sparking', lat: 14.7540, lng: 121.0550, status: 'pending', time: '4 hrs ago', distance: '2.2 km' }
    ];

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
        if (!isLoaded) return simulatedHazards;
        return simulatedHazards.map(hazard => {
            const meters = getDistance(reportLocation, { lat: hazard.lat, lng: hazard.lng });
            return {
                ...hazard,
                dynamicDistance: formatDistance(meters),
                distanceValue: meters || 999999
            };
        }).sort((a, b) => a.distanceValue - b.distanceValue);
    }, [reportLocation, simulatedHazards, isLoaded]);


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



    // Reverse-geocoded address for the report location picker
    const [locationAddress, setLocationAddress] = useState('');
    const [geocodingAddress, setGeocodingAddress] = useState(false);

    const reverseGeocode = async (lat, lng) => {
        setGeocodingAddress(true);
        try {
            const res = await fetch(
                `http://localhost:8000/api/geocode/reverse?lat=${lat}&lng=${lng}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setLocationAddress(data.address);
            }
        } catch (_) {
            setLocationAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
            setGeocodingAddress(false);
        }
    };

    const handleFileReport = async () => {
        setSubmittingReport(true);
        try {
        const payload = {
                category: reportCategory,
                description: reportNotes || "Citizen report from PULSO app.",
                location_lat: reportLocation.lat,
                location_lng: reportLocation.lng,
                // Send human-readable address as location string (backend will also auto-reverse-geocode as fallback)
                location_string: locationAddress || `Lat: ${reportLocation.lat.toFixed(4)}, Lng: ${reportLocation.lng.toFixed(4)}`
            };

            const response = await fetch('http://localhost:8000/api/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast('Report sent to Gemini AI for verification!');
                setActiveModal(null);
                setActiveTab('reports');
                setReportNotes(''); // Reset form
                setSelectedImage(null);
                fetchUserReports(currentUser.id); // Refresh the list
            } else {
                showToast('Failed to submit report.');
            }
        } catch (error) {
            console.error("PULSO: Error submitting report:", error);
            showToast('Error connecting to server.');
        } finally {
            setSubmittingReport(false);
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
            const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUser({
                    name: data.full_name ? data.full_name.split(' ')[0] : 'Resident',
                    fullName: data.full_name || '',
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

            const response = await fetch(`http://localhost:8000/api/users/${currentUser.id}`, {
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
                showToast("Failed to update profile");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast("An error occurred");
        } finally {
            setUpdatingProfile(false);
        }
    };

    // Client-side effect for offline tracking
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
    const quickFunctions = QUICK_FUNCTIONS_DATA.map(f => ({
        ...f,
        action: f.modal ? () => handleSetModal(f.modal) : () => handleSetTab(f.tab)
    }));

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors flex flex-col overflow-hidden">

            {/* Global Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                        <CheckCircle2 size={16} className="text-green-500"/> {toastMessage}
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
                mapFilter={mapFilter}
                setMapFilter={setMapFilter}
            />

            {/* Top Navigation */}
            <TopNavigation 
                activeTab={activeTab} 
                handleSetTab={handleSetTab}
                theme={theme}
                changeTheme={changeTheme}
                showNotifications={showNotifications}
                setShowNotifications={setShowNotifications}
                notifications={notifications}
                handleMarkAllRead={handleMarkAllRead}
                handleLogout={handleLogout}
                handleSearch={handleSearch}
                showSearchDropdown={showSearchDropdown}
                setShowSearchDropdown={setShowSearchDropdown}
                user={user}
                navItems={navItems}
                showToast={showToast}
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
                                    handleSetTab={handleSetTab} 
                                    handleSetModal={handleSetModal} 
                                />
                            </aside>

                            {/* Mobile Layout Fallback (Shows shortcuts above feed) */}
                            <div className="md:hidden w-full px-4 pt-4 pb-2 bg-white dark:bg-slate-900 mb-2 shrink-0 relative z-20">
                                <h3 className="font-bold text-[15px] text-slate-900 dark:text-white mb-3">
                                     Shortcuts
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
                                    />
                                </div>
                            )}
                            {activeTab === 'settings' && (
                                <div className="w-full max-w-3xl px-0 sm:px-4">
                                    <SettingsView 
                                        handleLogout={handleLogout} 
                                        containerVariants={containerVariants} 
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
