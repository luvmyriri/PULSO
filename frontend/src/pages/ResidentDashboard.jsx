import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GoogleMap,
    useJsApiLoader,
    MarkerF,
    InfoWindowF
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
import { PulsoLogo } from './Landing';
import { useTranslation } from 'react-i18next';
import IDCameraModal from '../components/IDCameraModal';

export default function ResidentDashboard() {
    const { t } = useTranslation();
    const { theme, changeTheme } = useTheme();
    const navigate = useNavigate();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
    
    const handleSetTab = (tab) => {
        console.log(`PULSO: Switching tab: ${activeTab} -> ${tab}`);
        setActiveTab(tab);
    };

    const [activeModal, setActiveModal] = useState(null); // 'file-report', 'post-details'
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

    const REPORT_CATEGORIES = [
        'Road Issue',
        'Water / Drainage',
        'Waste Management',
        'Street Lighting',
        'Public Safety',
        'Flooding',
        'Other',
    ];

    // Auto-fetch location when report modal opens
    useEffect(() => {
        if (activeModal === 'file-report') {
            console.log("PULSO: Report modal opened, attempting to fetch current GPS location...");
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const newLoc = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        console.log("PULSO: Successfully fetched GPS location:", newLoc);
                        setReportLocation(newLoc);
                    },
                    (error) => {
                        console.error("PULSO: Geolocation error:", error);
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            }
        }
    }, [activeModal]);


    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    });

    const handleFileReport = async () => {
        setSubmittingReport(true);
        try {
        const payload = {
                category: reportCategory,
                description: reportNotes || "Citizen report from PULSO mobile app.",
                location_lat: reportLocation.lat,
                location_lng: reportLocation.lng,
                location_string: `Lat: ${reportLocation.lat.toFixed(4)}, Lng: ${reportLocation.lng.toFixed(4)}`
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

    const navItems = [
        { id: 'overview', icon: <Home size={28} strokeWidth={2.5} />, label: t('dashboard.sidebar.overview', { defaultValue: 'Home' }) },
        { id: 'reports', icon: <FileText size={28} />, label: t('dashboard.sidebar.reports', { defaultValue: 'My Reports' }) },
        { id: 'profile', icon: <User size={28} />, label: t('dashboard.sidebar.profile', { defaultValue: 'Profile' }) },
        { id: 'settings', icon: <Settings size={28} />, label: t('dashboard.sidebar.settings', { defaultValue: 'Settings' }) },
    ];

    const quickFunctions = [
        { id: 'report', icon: <Camera size={22} />, label: 'File Report', color: 'orange', action: () => handleSetModal('file-report') },
        { id: 'map', icon: <Map size={22} />, label: 'Barangay Map', color: 'blue', action: () => handleSetModal('map') },
        { id: 'services', icon: <Handshake size={22} />, label: 'LGU Services', color: 'green', action: () => handleSetModal('services') },
        { id: 'knowledge', icon: <BookOpen size={22} />, label: 'Knowledge Base', color: 'indigo', action: () => handleSetModal('knowledge') },
        { id: 'track', icon: <Search size={22} />, label: 'Track Issue', color: 'teal', action: () => handleSetTab('reports') }
    ];

    const emergencyHotlines = [
        { name: 'City Engineering', tags: 'Public Works, Hazards', num: '888-1234', color: 'orange' },
        { name: 'Maynilad', tags: 'Water Leaks, Drainage', num: '1626', color: 'blue' },
        { name: 'Meralco', tags: 'Live Wires, Outages', num: '16211', color: 'yellow' }
    ];

    const TopNavigation = () => (
        <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 w-full relative">
            {/* Removed internal border shadow */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                
                {/* Left Area: Logo & Search (Facebook Style) */}
                <div className="flex items-center gap-4 w-1/4 min-w-[200px] relative">
                    <a href="/dashboard" className="flex items-center gap-2 group focus:outline-none shrink-0">
                        <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                            <PulsoLogo className="w-full h-full shrink-0 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="font-extrabold text-2xl tracking-tight text-orange-500 hidden xl:block">PULSO</span>
                    </a>
                    
                    <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 rounded-full items-center px-4 py-2 border border-transparent focus-within:border-orange-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all w-full max-w-[240px] relative">
                        <Search size={18} className="text-slate-400 shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Search PULSO..." 
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
                        onClick={() => {
                            localStorage.removeItem('pulso_token');
                            localStorage.removeItem('pulso_user');
                            navigate('/login');
                        }}
                        className="w-10 h-10 ml-2 flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors focus:outline-none" 
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>

                    <button onClick={() => setActiveTab('profile')} className="w-10 h-10 ml-2 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold flex items-center justify-center text-white shadow-sm shrink-0 hover:opacity-90 transition-opacity focus:outline-none cursor-pointer">
                        {user.avatar}
                    </button>
                </div>
            </div>
        </header>
    );

    const renderLeftSidebar = () => (
        <div className="w-full h-full pb-6 hidden md:block pl-2 pr-4 lg:pr-6 pt-6">
            
            {/* User Profile Card */}
            <div onClick={() => setActiveTab('profile')} className="flex items-center gap-3 p-3 mb-4 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden relative">
                    {user.avatar}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[15px] text-slate-900 dark:text-white truncate group-hover:text-orange-500 transition-colors">{user.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.barangay}</p>
                </div>
            </div>

            {/* Removed top fading border */}

            {/* Quick Links Menu */}
            <nav className="space-y-1 mt-4">
                <div className="px-3 pb-2 text-[13px] font-bold text-slate-500 dark:text-slate-400">Shortcuts</div>
                {quickFunctions.map(func => (
                    <button key={func.id} onClick={func.action} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none group text-left">
                        <div className={`w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-${func.color}-500 shrink-0 group-hover:bg-white dark:group-hover:bg-slate-700 shadow-sm transition-colors`}>
                            {func.icon}
                        </div>
                        <span className="font-semibold text-[15px] text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{func.label}</span>
                    </button>
                ))}
            </nav>

             {/* Footer Links (Moved to bottom left similar to FB) */}
             <div className="px-4 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mt-8">
                <a href="#" className="hover:underline hover:text-orange-500 mr-2 inline-block">Privacy</a> · 
                <a href="#" className="hover:underline hover:text-orange-500 mx-2 inline-block">Terms</a> · 
                <a href="#" className="hover:underline hover:text-orange-500 mx-2 inline-block">Cookies</a> · 
                <div className="mt-2 text-slate-400 dark:text-slate-600">PULSO Caloocan North © 2026</div>
            </div>
        </div>
    );

    const renderLguFeed = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full">
            <div className="mb-4 hidden md:block relative pb-4">
                {/* Removed bottom fading border */}
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
                        <p className="text-xs text-slate-400 mt-1 px-8">Stay tuned for official updates from your local government units.</p>
                    </div>
                ) : lguUpdates.map((update) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        key={update.id} 
                        className="bg-white dark:bg-slate-900 border lg:border border-slate-300 dark:border-slate-800 rounded-none sm:rounded-2xl p-4 shadow-sm dark:shadow-none transition-colors"
                    >
                        
                        {/* Advisory Header */}
                        <div className="flex items-start justify-between mb-3 pb-2">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200 dark:border-slate-700">
                                   {getIconForCategory(update.category)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-900 dark:text-white text-[15px] hover:underline cursor-pointer">{update.department}</span>
                                        <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                                    </div>
                                    <div className="text-[13px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        {new Date(update.created_at).toLocaleDateString()} • 
                                        {update.priority === 'critical' && <span className="text-red-500 font-medium">Critical</span>}
                                        {update.priority === 'high' && <span className="text-orange-500 font-medium">High</span>}
                                        {update.priority === 'medium' && <span>Advisory</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Advisory Body */}
                        <div>
                            <h4 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">{update.title}</h4>
                            <p className="text-[15px] text-slate-800 dark:text-slate-200 mb-3 whitespace-pre-line leading-relaxed">{update.description}</p>
                            
                            {/* Embedded Photo */}
                            {update.has_image && update.image_url && (
                                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 -mx-4 sm:mx-0 sm:rounded-xl">
                                    <img src={update.image_url} alt="Advisory attachment" className="w-full max-h-[450px] object-cover" />
                                </div>
                            )}

                            {/* Divider & Read More */}
                            <div className="mt-3 pt-3 flex items-center justify-between relative">
                                 {/* Removed internal shadow fading */}
                                 <span className="text-[12px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">Ref: {update.advisory_id}</span>
                                 <button 
                                     onClick={() => { setSelectedPost(update); setActiveModal('post-details'); }}
                                     className="text-[14px] font-bold text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 transition-colors"
                                 >
                                     Read Full Details
                                 </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );

    const renderRightSidebar = () => (
        <div className="w-full h-full pb-6 hidden xl:block pr-2 pl-4 lg:pl-6 pt-6">
            
            {/* Impact Metrics Widget */}
            <div className="mb-6">
                <h3 className="font-bold text-[15px] text-slate-500 dark:text-slate-400 mb-3 px-1">Your Impact</h3>
                <div onClick={() => setActiveTab('profile')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-300 dark:border-slate-800 cursor-pointer hover:border-orange-500/50 transition-colors">
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
                        {/* Removed shadow fading */}
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

            {/* Emergency Hotlines Widget */}
            <div>
                <h3 className="font-bold text-[15px] text-slate-500 dark:text-slate-400 mb-3 px-1">Emergency Lines</h3>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-300 dark:border-slate-800">
                    <ul className="space-y-1">
                        {emergencyHotlines.map((hotline, idx) => (
                            <li key={idx}>
                                <button onClick={() => setActiveModal(`calling-${hotline.name}`)} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group focus:outline-none">
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

    // MOCK VIEWS FOR TABS
    const renderMyReports = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-800 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold font-display">My Reports History</h2>
                <button onClick={() => handleSetModal('file-report')} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-md transition-all flex items-center gap-2">
                    <Camera size={16}/> New Report
                </button>
            </div>
            <div className="space-y-4">
                {loadingReports ? (
                    <div className="text-center text-slate-400 py-10">Loading your reports...</div>
                ) : userReports.length === 0 ? (
                    <div className="text-center text-slate-400 py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">You haven't submitted any reports yet.</div>
                ) : userReports.map((report) => (
                    <div key={report.id} className={`border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex justify-between items-center group ${report.status === 'resolved' ? 'opacity-70 bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                        <div className="flex gap-4 items-start">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                                ${report.status === 'pending' ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' :
                                  report.status === 'dispatched' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-500' :
                                  report.status === 'resolved' ? 'bg-green-50 dark:bg-green-900/20 text-green-500' :
                                  'bg-blue-50 dark:bg-blue-900/40 text-blue-500'}`}>
                                <Zap size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white text-[15px]">{report.ticket_id}: {report.ai_category || report.category}</div>
                                <div className="text-xs text-slate-500 mt-1 mb-2">Reported: {new Date(report.created_at).toLocaleDateString()} • {report.location_string || 'Location Attached'}</div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                                        ${report.status === 'pending' ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                                          report.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                          report.status === 'dispatched' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                          report.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                        {report.status.replace(/_/g, ' ')}
                                    </span>
                                    {report.ai_urgency && (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                            ${report.ai_urgency === 'Critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                              report.ai_urgency === 'High'     ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            AI: {report.ai_urgency}
                                        </span>
                                    )}
                                </div>
                                {report.ai_summary && (
                                    <div className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 italic bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-2.5 py-1.5 border border-indigo-100 dark:border-indigo-800">
                                        <span className="font-bold not-italic text-[10px] uppercase mr-1">Gemini:</span>
                                        "{report.ai_summary}"
                                    </div>
                                )}
                            </div>
                        </div>
                        <button className="hidden sm:block text-slate-400 hover:text-orange-500 transition-colors"><Search size={18}/></button>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    const renderProfile = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
            <h2 className="text-2xl font-bold font-display mb-8">Personal Information</h2>
            
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4 shrink-0">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold flex items-center justify-center text-white text-5xl shadow-lg relative">
                        {user.avatar}
                        <button className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full shadow border-2 border-white dark:border-slate-900 hover:bg-orange-500 transition-colors">
                            <Camera size={16} />
                        </button>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">PULSO User</div>
                        <div className="text-sm text-slate-400">Joined {user.memberSince}</div>
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                            <input type="text" disabled defaultValue={user.fullName} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Barangay</label>
                            <input type="text" disabled defaultValue={user.barangay} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                        <div className="flex">
                            <input 
                                type="email" 
                                value={user.email} 
                                onChange={(e) => setUser({...user, email: e.target.value})}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-l-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500" 
                            />
                            <button 
                                onClick={() => handleUpdateProfile('email', user.email)}
                                disabled={updatingProfile}
                                className="bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-lg px-4 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold text-sm disabled:opacity-50"
                            >
                                {updatingProfile ? '...' : 'Update'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Number</label>
                        <div className="flex">
                            <input 
                                type="tel" 
                                value={user.phone} 
                                onChange={(e) => setUser({...user, phone: e.target.value})}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-l-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500" 
                            />
                            <button 
                                onClick={() => handleUpdateProfile('phone', user.phone)}
                                disabled={updatingProfile}
                                className="bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-lg px-4 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold text-sm disabled:opacity-50"
                            >
                                {updatingProfile ? '...' : 'Update'}
                            </button>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-full font-bold shadow transition-colors" onClick={() => showToast('Profile Settings Saved!')}>Save Changes</button>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderSettings = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
            <h2 className="text-2xl font-bold font-display mb-6">Account Settings</h2>
            
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Bell className="text-orange-500" size={20}/> Notifications</h3>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                            <div>
                                <div className="font-bold">Email Alerts</div>
                                <div className="text-sm text-slate-500">Receive major LGU advisories via email.</div>
                            </div>
                            <input type="checkbox" defaultChecked className="w-5 h-5 accent-orange-500" />
                        </label>
                        <label className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                            <div>
                                <div className="font-bold">SMS Notifications</div>
                                <div className="text-sm text-slate-500">Get text messages for critical emergencies.</div>
                            </div>
                            <input type="checkbox" defaultChecked className="w-5 h-5 accent-orange-500" />
                        </label>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin className="text-blue-500" size={20}/> Privacy & Location</h3>
                    <label className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                        <div>
                            <div className="font-bold">Share Location for Reports</div>
                            <div className="text-sm text-slate-500">Automatically attach GPS coordinates to your reports.</div>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-orange-500" />
                    </label>
                </div>

                <div className="pt-6 mt-6 max-w-xs">
                    <button className="w-full flex justify-center items-center gap-2 p-3 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors">
                        <LogOut size={18}/> Sign Out of PULSO
                    </button>
                </div>
            </div>
        </motion.div>
    );

    // MODALS
    const renderModals = () => {
        return (
            <AnimatePresence>
                {activeModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setActiveModal(null)}
                    >
                        {/* Modal Content Wrapper - stop propagation so clicks inside don't close it */}
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 my-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* File Report Modal (AI Vision Triage Flow) */}
                            {activeModal === 'file-report' && (
                                <div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="font-bold font-display text-lg flex items-center gap-2"><Camera className="text-orange-500"/> AI Vision Report</h3>
                                        <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        
                                        {/* Camera / Photo Area */}
                                        <div>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                capture="environment" 
                                                className="hidden" 
                                                ref={fileInputRef}
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const url = URL.createObjectURL(file);
                                                        setSelectedImage(url);
                                                    }
                                                }}
                                            />
                                            {selectedImage ? (
                                                <div className="relative w-full rounded-2xl aspect-video overflow-hidden border border-slate-200 dark:border-slate-800">
                                                    <img src={selectedImage} alt="Captured preview" className="w-full h-full object-cover" />
                                                    <button 
                                                        onClick={() => setSelectedImage(null)}
                                                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors backdrop-blur-sm"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => setIsIDCameraOpen(true)}
                                                    className="w-full bg-slate-900 dark:bg-black rounded-2xl aspect-video flex flex-col items-center justify-center gap-3 text-slate-300 hover:text-white transition-colors group relative overflow-hidden focus:outline-none"
                                                >
                                                    <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <Camera size={40} className="group-hover:scale-110 transition-transform text-orange-500"/>
                                                    <div className="text-center">
                                                        <span className="block font-bold text-lg">Tap to open Camera</span>
                                                        <span className="text-xs text-slate-400">Gemini 2.5 AI will auto-categorize this issue</span>
                                                    </div>
                                                </button>
                                            )}

                                            {/* Camera Modal Integration */}
                                            <IDCameraModal 
                                                isOpen={isIDCameraOpen}
                                                onClose={() => setIsIDCameraOpen(false)}
                                                onCapture={(file) => {
                                                    const url = URL.createObjectURL(file);
                                                    setSelectedImage(url);
                                                    setIsIDCameraOpen(false);
                                                }}
                                                title="Issue Photo Capture"
                                                subtitle="Capture a clear photo of the reported issue for AI analysis."
                                                side="ISSUE"
                                            />
                                        </div>

                                        {/* Automated GPS Locator with Map Picker */}
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl overflow-hidden">
                                            <div className="p-3 flex items-center gap-3 border-b border-blue-100/50 dark:border-blue-800/30">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0">
                                                    <MapPin className="text-blue-500 animate-pulse" size={16} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">LGU Locator Precision</div>
                                                    <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                                                        {isSelectingLocation ? "Tap on map to set pinpoint" : "Location verified via GPS"}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setIsSelectingLocation(!isSelectingLocation)}
                                                    className="text-xs font-bold text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-2 py-1 rounded-md transition-colors"
                                                >
                                                    {isSelectingLocation ? "Done" : "Change"}
                                                </button>
                                            </div>

                                            {/* Mini Map Picker */}
                                            <div className={`transition-all duration-300 ease-in-out ${isSelectingLocation ? 'h-48' : 'h-0'}`}>
                                                {isLoaded && (
                                                    <GoogleMap
                                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                                        center={reportLocation}
                                                        zoom={15}
                                                        onClick={(e) => setReportLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
                                                        options={{
                                                            disableDefaultUI: true,
                                                            zoomControl: false,
                                                            styles: [
                                                                { "elementType": "geometry", "stylers": [{ "color": "#121826" }] },
                                                                { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#232b3d" }] }
                                                            ]
                                                        }}
                                                    >
                                                        <MarkerF position={reportLocation} />
                                                    </GoogleMap>
                                                )}
                                            </div>

                                            {!isSelectingLocation && (
                                                <div className="px-3 py-1.5 bg-blue-500/5 text-[10px] font-mono text-slate-500 text-center border-t border-blue-100/20">
                                                    Coordinates: {reportLocation.lat.toFixed(6)}, {reportLocation.lng.toFixed(6)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Issue Category */}
                                        <div>
                                            <label className="block text-sm font-bold mb-1">Issue Category</label>
                                            <select
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                                value={reportCategory}
                                                onChange={(e) => setReportCategory(e.target.value)}
                                            >
                                                {REPORT_CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <div className="text-[11px] text-slate-400 mt-1 pl-1">Gemini AI will refine this classification automatically.</div>
                                        </div>

                                        {/* Additional Details */}
                                        <div>
                                            <label className="block text-sm font-bold mb-1">Additional Notes (Optional)</label>
                                            <textarea 
                                                rows="2" 
                                                placeholder="Add any details not visible in the photo..." 
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                                                value={reportNotes}
                                                onChange={(e) => setReportNotes(e.target.value)}
                                            ></textarea>
                                        </div>

                                        <div className="pt-2 flex gap-3">
                                            <button onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                            <button 
                                                onClick={handleFileReport} 
                                                disabled={submittingReport}
                                                className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2 ${submittingReport ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}
                                            >
                                                {submittingReport ? 'Submitting...' : 'Submit to AI'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Post Details Modal */}
                            {activeModal === 'post-details' && selectedPost && (
                                <div>
                                    <div className="flex justify-between items-center p-4 absolute top-0 right-0 w-full z-10">
                                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-full px-3 py-1 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                            Ref: {selectedPost.id}
                                        </div>
                                        <button onClick={() => setActiveModal(null)} className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur"><X size={20}/></button>
                                    </div>
                                    
                                    {selectedPost.hasImage ? (
                                        <div className="w-full h-64 bg-slate-200 dark:bg-slate-800 relative">
                                            <img src={selectedPost.imageUrl} alt="Advisory" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"></div>
                                    )}

                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {selectedPost.headerIcon}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1">{selectedPost.department} <CheckCircle2 size={12} className="text-blue-500" /></div>
                                                <div className="text-xs text-slate-500">{selectedPost.time}</div>
                                            </div>
                                        </div>
                                        
                                        <h2 className="text-2xl font-bold font-display mb-4 leading-tight">{selectedPost.title}</h2>
                                        
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-700/50">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs uppercase font-bold text-slate-500">Affected Scope</div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedPost.stats.affected}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs uppercase font-bold text-slate-500">Priority</div>
                                                    <div className={`font-semibold capitalize ${selectedPost.priority === 'critical' ? 'text-red-500' : selectedPost.priority === 'high' ? 'text-orange-500' : 'text-blue-500'}`}>{selectedPost.priority}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-[15px] whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                                            {selectedPost.desc}
                                            {'\n\nFor more information or emergency assistance, please contact the City Engineering hotline or your local barangay outpost.'}
                                        </p>

                                        <div className="flex gap-2">
                                            <button className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-xl transition-colors flex justify-center items-center gap-2">
                                                <MessageSquare size={18}/> Contact Department
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Map Modal */}
                            {activeModal === 'map' && (
                                <div className="flex flex-col h-full max-h-[80vh]">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                                        <h3 className="font-bold font-display text-lg flex items-center gap-2"><Map className="text-blue-500"/> Barangay Map</h3>
                                        <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                                    </div>
                                    <div className="p-0 overflow-hidden relative h-[500px] w-full shrink-0">
                                        {isLoaded ? (
                                            <GoogleMap
                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                center={{ lat: 14.7566, lng: 121.0450 }}
                                                zoom={14}
                                                options={{
                                                    disableDefaultUI: false,
                                                    styles: [
                                                        { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
                                                        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
                                                        { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
                                                    ]
                                                }}
                                            >
                                                {/* Mock markers for barangay resources */}
                                                <MarkerF position={{ lat: 14.7580, lng: 121.0460 }} label="Police" />
                                                <MarkerF position={{ lat: 14.7550, lng: 121.0430 }} label="Health" />
                                            </GoogleMap>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                                                <div className="text-center">
                                                    <Loader2 className="animate-spin mx-auto text-orange-500 mb-2" />
                                                    <p className="text-sm font-bold">Loading Satellite Infrastructure...</p>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Overlay Controls */}
                                        <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2 z-10">
                                            <button className="whitespace-nowrap bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1">
                                                <ShieldCheck size={12} className="text-blue-500"/> Police Outposts
                                            </button>
                                            <button className="whitespace-nowrap bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1">
                                                <AlertTriangle size={12} className="text-red-500"/> Evacuation Sites
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LGU Services Modal (Permit Tracking Module) */}
                            {activeModal === 'services' && (
                                <div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="font-bold font-display text-lg flex items-center gap-2"><Handshake className="text-green-500"/> Permit Tracking Module</h3>
                                        <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-sm text-slate-500 mb-4 text-center">Manage and track your official city utility and construction permits.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { icon: <ShieldCheck size={24}/>, label: 'Building Permit', color: 'blue' },
                                                { icon: <Zap size={24}/>, label: 'Electrical Permit', color: 'orange' },
                                                { icon: <Droplets size={24}/>, label: 'Sanitary Permit', color: 'teal' },
                                                { icon: <FileText size={24}/>, label: 'Occupancy Permit', color: 'indigo' }
                                            ].map((service, idx) => (
                                                <button key={idx} onClick={() => { setActiveModal(null); showToast(`Redirecting to ${service.label} Portal...`); }} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-green-500 transition-all group">
                                                    <div className={`text-${service.color}-500 mb-2 group-hover:scale-110 transition-transform`}>{service.icon}</div>
                                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{service.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Knowledge Base Modal */}
                            {activeModal === 'knowledge' && (
                                <div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="font-bold font-display text-lg flex items-center gap-2"><BookOpen className="text-indigo-500"/> Knowledge Base</h3>
                                        <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="text" placeholder="Search FAQs..." className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            {['How to apply for a Barangay ID?', 'Garbage collection schedules per zone', 'Requirements for Indigency Certificate'].map((faq, idx) => (
                                                <details key={idx} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                    <summary className="font-bold text-sm p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors list-none flex justify-between items-center">
                                                        {faq}
                                                        <span className="text-indigo-500 group-open:rotate-180 transition-transform">▼</span>
                                                    </summary>
                                                    <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                                                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                                                    </div>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    </motion.div>
                )}

                {/* Emergency Calling Modal - Specially styled alert modal */}
                {activeModal && activeModal.startsWith('calling-') && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
                        onClick={() => setActiveModal(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-transparent flex flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mb-6 animate-pulse relative">
                                <div className="absolute inset-0 rounded-full border-4 border-red-500/50 animate-ping"></div>
                                <div className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl">
                                    <PhoneCall size={32} className="animate-bounce"/>
                                </div>
                            </div>
                            <h2 className="text-3xl font-display font-bold text-white mb-2">Calling...</h2>
                            <p className="text-xl text-slate-300 font-semibold mb-12">
                                {activeModal.replace('calling-', '')} Emergency Line
                            </p>
                            
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                            >
                                <PhoneCall size={24} className="rotate-[135deg]" />
                            </button>
                            <span className="text-red-400 font-bold mt-3 text-sm tracking-widest uppercase">End Call</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };

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
            {renderModals()}

            {/* Top Navigation */}
            <TopNavigation />

            {/* Main Layout Grid (3-Column Facebook Style) */}
            <main className="flex-1 overflow-hidden w-full flex flex-col relative">
                
                {/* Mobile Bottom Bar Navigation (Replaces Top Nav on very small screens) */}
                <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 z-40 flex justify-around items-center p-2 pb-6 pt-3 shadow-xl relative">
                    {/* Removed shadow */}
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
                                {renderLeftSidebar()}
                            </aside>

                            {/* Mobile Layout Fallback (Shows shortcuts above feed) */}
                            <div className="md:hidden w-full px-4 pt-4 pb-2 bg-white dark:bg-slate-900 mb-2 shrink-0 relative z-20">
                                {/* Removed shadow */}
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
                                {renderLguFeed()}
                            </div>

                            {/* Right Column (Widgets) - 320px */}
                            <aside className="w-[320px] shrink-0 hidden xl:block h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
                                {renderRightSidebar()}
                            </aside>

                        </div>
                    )}

                    {/* Full Width Tab Views Container */}
                    {activeTab !== 'overview' && activeTab !== 'home' && (
                        <div className="w-full h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar flex flex-col items-center pb-24 sm:pb-8 pt-0 sm:pt-6">
                            {activeTab === 'reports' && (
                                <div className="w-full max-w-3xl px-0 sm:px-4">
                                    {renderMyReports()}
                                </div>
                            )}
                            {activeTab === 'profile' && (
                                <div className="w-full max-w-3xl px-0 sm:px-4">
                                    {renderProfile()}
                                </div>
                            )}
                            {activeTab === 'settings' && (
                                <div className="w-full max-w-3xl px-0 sm:px-4">
                                    {renderSettings()}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
