import NativeAppHeader, { NativeResidentGreeting } from "../../components/mobile/NativeAppHeader";
import NativeDashboardSearch from "../../components/mobile/NativeDashboardSearch";
import NotificationDropdown from "../../components/NotificationDropdown";
import { useState, useEffect, useRef } from 'react';
import { isNativeAndroid } from "../../utils/appContext";
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, LifeBuoy, Settings, LogOut, ChevronRight, X, Camera, PhoneCall, Search, BookOpen, Handshake, Plus, Clock, ArrowRight, FileText, Map as MapIcon, Home, Radio, HelpCircle } from 'lucide-react';
import { getAuthToken } from "../../utils/authSession";
import { API_BASE_URL } from "../../utils/apiBase";
import HomeHeader from "../../components/HomeHeader";
import BrandHeader from "../../components/BrandHeader";
import { EMERGENCY_HOTLINES, KNOWLEDGE_BASE_ARTICLES } from './residentConstants';

const LeftSidebar = ({ user, activeTab, activeModal, handleSetTab, handleSetModal, handleLogout, t, unreadCount, unreadBadgeText, unreadUpdatesCount = 0, unreadUpdatesBadgeText = '0' }) => {
    const navDestinations = [
        { id: 'overview', icon: <Home size={19} strokeWidth={2.2} aria-hidden="true" />, label: 'Home' },
        { id: 'reports', icon: <FileText size={19} strokeWidth={2} aria-hidden="true" />, label: 'My Reports' },
        { id: 'updates', icon: <Radio size={19} strokeWidth={2} aria-hidden="true" />, label: 'Updates' },
        { id: 'map', icon: <MapIcon size={19} strokeWidth={2} aria-hidden="true" />, label: 'Map' },
    ];

    const residentInitial = (() => {
        if (user?.avatar) return user.avatar;
        if (user?.name && user.name.trim()) return user.name.trim()[0].toUpperCase();
        return 'M';
    })();

    return (
        <div className="w-full h-full pb-3 hidden lg:flex flex-col justify-between pt-2.5 px-3">
            <div>
                {/* 1. User Identity Snapshot Card */}
                <div
                    onClick={() => handleSetTab('profile')}
                    className="flex items-center gap-2.5 p-2.5 mb-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-orange-500/40 cursor-pointer transition-all group shadow-2xs"
                    title="View Account & Settings"
                >
                    <div className="w-9 h-9 rounded-full font-bold flex items-center justify-center text-white bg-[#EA580C] shrink-0 text-sm shadow-xs select-none">
                        {residentInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[13.5px] text-slate-900 dark:text-white truncate group-hover:text-orange-500 transition-colors">
                            {user?.name || 'Marc Alexis'}
                        </h3>
                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                            {user?.barangay || 'Barangay 171'}
                        </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* 2. Primary Action Button */}
                <div className="mb-3">
                    <button
                        type="button"
                        onClick={() => handleSetModal('file-report')}
                        className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-sm hover:shadow transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-400"
                        title="Submit a new civic infrastructure report"
                    >
                        <Plus size={17} strokeWidth={2.8} className="text-white shrink-0" />
                        <span>Report an issue</span>
                    </button>
                </div>

                {/* 3. Section: WORKSPACE */}
                <div className="mb-1.5">
                    <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-1.5">
                        WORKSPACE
                    </span>
                    <nav className="space-y-1" aria-label="Workspace Navigation">
                        {navDestinations.map(item => {
                            const isActive = item.id === 'map'
                                ? activeModal === 'map'
                                : ((item.id === 'overview' && (activeTab === 'overview' || activeTab === 'home')) || activeTab === item.id) && activeModal !== 'map';
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        if (item.id === 'map') {
                                            handleSetModal('map');
                                        } else {
                                            handleSetTab(item.id);
                                        }
                                    }}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`w-full relative flex items-center gap-2.5 px-3 py-2 text-sm transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C] group ${
                                        isActive
                                            ? 'bg-[#FFF7ED] dark:bg-orange-950/30 text-[#EA580C] font-bold border-l-[3.5px] border-[#EA580C] rounded-r-xl rounded-l-xs shadow-2xs'
                                            : 'text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white rounded-xl border-l-[3.5px] border-transparent'
                                    }`}
                                >
                                    <span className={`shrink-0 transition-colors ${isActive ? 'text-[#EA580C]' : 'text-slate-800 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="truncate flex-1">{item.label}</span>
                                    {item.id === 'updates' && unreadUpdatesCount > 0 && (
                                        <span
                                            className="ml-auto min-w-[18px] h-4 px-1 rounded-full bg-[#f05a00] text-white text-[10px] font-bold flex items-center justify-center leading-none tabular-nums shadow-2xs"
                                            aria-label={`${unreadUpdatesCount} unread updates`}
                                        >
                                            {unreadUpdatesBadgeText}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Divider between Workspace and Resources */}
                <div className="border-t border-slate-200/80 dark:border-slate-800 my-2" />

                {/* 4. Section: RESOURCES */}
                <div className="mb-2">
                    <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-1.5">
                        RESOURCES
                    </span>
                    <nav className="space-y-1" aria-label="Resources Navigation">
                        <button
                            type="button"
                            onClick={() => handleSetModal('help-center')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer group"
                        >
                            <HelpCircle size={18} strokeWidth={2} className="text-slate-800 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white shrink-0" />
                            <span className="truncate">Help center</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSetModal('reporting-guide')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer group"
                        >
                            <BookOpen size={18} strokeWidth={2} className="text-slate-800 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white shrink-0" />
                            <span className="truncate">Reporting guide</span>
                        </button>
                    </nav>
                </div>

                {/* 5. "Need a hand?" Support Row */}
                <div className="my-2 p-2.5 rounded-xl bg-[#FFF8F0] dark:bg-orange-950/20 border border-orange-100/80 dark:border-orange-900/30">
                    <button
                        type="button"
                        onClick={() => handleSetModal('reporting-guide')}
                        className="w-full flex items-center justify-between text-left group cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <LifeBuoy size={16} className="text-[#EA580C] shrink-0" />
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-[#EA580C] transition-colors">
                                Need help reporting?
                            </span>
                        </div>
                        <ArrowRight size={13} strokeWidth={2.5} className="text-[#EA580C] group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                </div>
            </div>

            {/* 6. Supporting Footer */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="text-center">
                    <div className="text-[11.5px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 mb-1 font-medium">
                        <button onClick={() => handleSetModal('privacy')} className="hover:underline hover:text-orange-500 cursor-pointer">{t('footer.privacy', { defaultValue: 'Privacy' })}</button>
                        <span>·</span>
                        <button onClick={() => handleSetModal('terms')} className="hover:underline hover:text-orange-500 cursor-pointer">{t('footer.terms', { defaultValue: 'Terms' })}</button>
                        <span>·</span>
                        <button onClick={() => handleSetModal('cookies')} className="hover:underline hover:text-orange-500 cursor-pointer">{t('footer.cookie', { defaultValue: 'Cookies' })}</button>
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-600">
                        PULSO Caloocan © 2026
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const TopNavigation = ({
    activeTab,
    activeModal = null,
    handleSetTab,
    handleSetModal,
    onGoHome,
    isAIChatOpen = false,
    setIsAIChatOpen,
    theme,
    changeTheme,
    showNotifications,
    setShowNotifications,
    notifications,
    setNotifications,
    handleMarkAllRead,
    handleNotificationClick,
    loadingNotifications,
    notificationsError,
    onRetryNotifications,
    handleLogout,
    user,
    navItems,
    showToast,
    i18n,
    t,
    userReports = [],
    lguUpdates = [],
    searchLoading = false,
    searchUpdatesUnavailable = false,
    processedHazards = [],
    setSelectedPost,
    setSelectedHazard,
    setSelectedReportForDetails,
    setReportStatusFilter,
    token,
    isSearchOpen: controlledIsSearchOpen,
    setIsSearchOpen: controlledSetIsSearchOpen,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [internalIsSearchOpen, setInternalIsSearchOpen] = useState(false);
    const isSearchOpen = controlledIsSearchOpen !== undefined ? controlledIsSearchOpen : internalIsSearchOpen;
    const setIsSearchOpen = (val) => {
        setInternalIsSearchOpen(val);
        controlledSetIsSearchOpen?.(val);
    };
    const [recentSearches, setRecentSearches] = useState(() => {
        if (isNativeAndroid()) {
            try {
                const stored = JSON.parse(localStorage.getItem('pulso_recent_searches') || '[]');
                return Array.isArray(stored) ? stored.filter(value => typeof value === 'string').slice(0, 6) : [];
            } catch { return []; }
        }
        try {
            const saved = localStorage.getItem('pulso_recent_searches');
            return saved ? JSON.parse(saved) : ['Water Interruption', 'Street Lighting', 'Engineering Contact'];
        } catch {
            return ['Water Interruption', 'Street Lighting', 'Engineering Contact'];
        }
    });

    const searchRef = useRef(null);
    const searchInputRef = useRef(null);
    const mobileSearchRef = useRef(null);
    const nativeBellRef = useRef(null);
    const mobileSearchInputRef = useRef(null);
    const [searchPillWidth, setSearchPillWidth] = useState(240);
    const [recentSearchAnnouncement, setRecentSearchAnnouncement] = useState('');
    const removeButtonRefs = useRef([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuTimeoutRef = useRef(null);
    const userMenuRef = useRef(null);

    useEffect(() => {
        if (isSearchOpen && typeof window !== 'undefined' && window.innerWidth < 768) {
            mobileSearchInputRef.current?.focus();
        }
    }, [isSearchOpen]);

    useEffect(() => {
        if (!searchRef.current || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect?.width) {
                    setSearchPillWidth(entry.contentRect.width);
                }
            }
        });
        observer.observe(searchRef.current);
        return () => observer.disconnect();
    }, []);

    const nativeAndroid = isNativeAndroid();
    const [isNativeHeaderHidden, setIsNativeHeaderHidden] = useState(false);

    useEffect(() => {
        setIsNativeHeaderHidden(false);
        if (!nativeAndroid || isSearchOpen || showNotifications) return;

        let previousY = Math.max(0, window.scrollY);
        let travel = 0;
        const handleScroll = () => {
            const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const currentY = Math.min(limit, Math.max(0, window.scrollY));
            const delta = currentY - previousY;
            previousY = currentY;
            if (currentY <= 24) {
                travel = 0;
                setIsNativeHeaderHidden(false);
                return;
            }
            if (!delta) return;
            travel = Math.sign(travel) === Math.sign(delta) ? travel + delta : delta;
            if (travel >= 12 && currentY >= 72) {
                travel = 0;
                setIsNativeHeaderHidden(true);
            } else if (travel <= -12) {
                travel = 0;
                setIsNativeHeaderHidden(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeTab, nativeAndroid, isSearchOpen, showNotifications]);

    const saveRecentSearch = (query) => {
        if (!query || !query.trim()) return;
        const trimmed = query.trim();
        setRecentSearches(prev => {
            const updated = [trimmed, ...prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
            try { localStorage.setItem('pulso_recent_searches', JSON.stringify(updated)); } catch (e) { /* ignore */ }
            return updated;
        });
    };

    const removeRecentSearch = (e, item, idx) => {
        e.stopPropagation();
        e.preventDefault();
        const isKeyboard = e.detail === 0;

        setRecentSearches(prev => {
            const updated = prev.filter(s => s !== item);
            try { localStorage.setItem('pulso_recent_searches', JSON.stringify(updated)); } catch (err) { /* ignore */ }
            return updated;
        });

        setRecentSearchAnnouncement(nativeAndroid ? t('nativeAndroid.search.removed', { query: item }) : `${item} removed.`);

        // Focus management: preserve focus without closing or jumping to top
        setTimeout(() => {
            if (isKeyboard) {
                const currentLength = recentSearches.length;
                if (currentLength <= 1) {
                    const searchInput = document.querySelector('[data-pulso-search-input="true"]');
                    searchInput?.focus();
                } else if (idx >= currentLength - 1) {
                    removeButtonRefs.current[idx - 1]?.focus();
                } else {
                    removeButtonRefs.current[idx]?.focus();
                }
            } else {
                const searchInput = document.querySelector('[data-pulso-search-input="true"]');
                searchInput?.focus();
            }
        }, 50);
    };

    const clearAllRecent = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setRecentSearches([]);
        try { localStorage.removeItem('pulso_recent_searches'); } catch (err) { /* ignore */ }
        setRecentSearchAnnouncement(nativeAndroid ? t('nativeAndroid.search.cleared') : 'All recent searches cleared.');

        setTimeout(() => {
            const searchInput = document.querySelector('[data-pulso-search-input="true"]');
            searchInput?.focus();
        }, 50);
    };

    // Pointer-down outside detection to close search and user menu without breaking on deleted elements
    useEffect(() => {
        const handleClickOutside = (e) => {
            const path = e.composedPath ? e.composedPath() : [];
            const isInsideSearch = path.some(el =>
                el?.getAttribute && (
                    el.getAttribute('data-pulso-search') === 'true' ||
                    el.getAttribute('data-pulso-search-dropdown') === 'true'
                )
            ) || (searchRef.current && searchRef.current.contains(e.target)) || (mobileSearchRef.current && mobileSearchRef.current.contains(e.target));

            if (!isInsideSearch) {
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
        document.addEventListener('pointerdown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
        };
    }, []);

    // Filter items based on query
    const q = searchQuery.toLowerCase().trim();

    // 1. Navigation & Quick Actions
    const quickActions = [
        { label: 'File infrastructure report', category: 'Action', icon: <Camera size={16} />, onClick: () => { handleSetModal('file-report'); setIsSearchOpen(false); saveRecentSearch('File infrastructure report'); } },
        { label: 'Barangay hazard map', category: 'Action', icon: <MapIcon size={16} />, onClick: () => { handleSetModal('map'); setIsSearchOpen(false); saveRecentSearch('Barangay hazard map'); } },
        { label: 'City services', category: 'Action', icon: <Handshake size={16} />, onClick: () => { handleSetModal('services'); setIsSearchOpen(false); saveRecentSearch('City services'); } },
        { label: 'Help guides', category: 'Action', icon: <BookOpen size={16} />, onClick: () => { handleSetModal('knowledge'); setIsSearchOpen(false); saveRecentSearch('Help guides'); } },
        { label: 'My Report History', category: 'Navigation', icon: <FileText size={16} />, onClick: () => { handleSetTab('reports'); setIsSearchOpen(false); saveRecentSearch('My Reports'); } },
        { label: 'My Profile & Account', category: 'Navigation', icon: <User size={16} />, onClick: () => { handleSetTab('profile'); setIsSearchOpen(false); saveRecentSearch('My Profile'); } },
        { label: 'Account Settings & Security', category: 'Navigation', icon: <Settings size={16} />, onClick: () => { handleSetTab('settings'); setIsSearchOpen(false); saveRecentSearch('Settings'); } },
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
        if (!r) return;
        saveRecentSearch(r.category || r.ticket_id);
        if (setReportStatusFilter) setReportStatusFilter('all');
        handleSetTab('reports');
        if (setSelectedReportForDetails) {
            setSelectedReportForDetails(r);
        }
        setIsSearchOpen(false);
        setSearchQuery('');
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        if (showToast) showToast(`Opened report: ${r.ticket_id}`);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (matchedReports.length > 0) {
                e.preventDefault();
                handleSelectReport(matchedReports[0]);
            } else if (matchedActions.length > 0) {
                e.preventDefault();
                matchedActions[0].onClick();
            } else if (matchedAdvisories.length > 0) {
                e.preventDefault();
                handleSelectAdvisory(matchedAdvisories[0]);
            } else if (matchedKB.length > 0) {
                e.preventDefault();
                handleSelectKB(matchedKB[0]);
            } else if (matchedHotlines.length > 0) {
                e.preventDefault();
                handleSelectHotline(matchedHotlines[0]);
            }
        }
    };

    const handleSelectAdvisory = (adv) => {
        saveRecentSearch(adv.title);
        if (setSelectedPost) setSelectedPost(adv);
        handleSetModal('post-details');
        setIsSearchOpen(false);
    };

    const handleSelectHotline = (h) => {
        saveRecentSearch(h.name);
        handleSetModal(`calling-${h.name}`);
        setIsSearchOpen(false);
    };

    const handleSelectKB = (kb) => {
        saveRecentSearch(kb.title);
        handleSetModal('knowledge');
        setIsSearchOpen(false);
    };

    const renderSearchDropdown = (isMobile = false) => (
        <div
            data-pulso-search-dropdown="true"
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-full ${isMobile ? 'p-2' : 'max-h-[calc(100dvh-5rem)] overflow-y-auto custom-scrollbar p-3'} divide-y divide-slate-100 dark:divide-slate-800/80`}
        >
            {/* Screen reader live announcement region */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {recentSearchAnnouncement}
            </div>

            {/* If Query is Empty -> Show Shortcuts and Recent Searches */}
            {!q ? (
                <div>
                    <div className="p-1 mb-2">
                        <div className="flex items-center justify-between px-1 py-1 mb-2">
                            <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Recent searches</span>
                            {recentSearches.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearAllRecent}
                                    className="min-h-[48px] px-2 text-[13px] font-medium text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 flex items-center transition-colors cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                        {recentSearches.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                <AnimatePresence initial={false}>
                                    {recentSearches.map((item, idx) => (
                                        <motion.div
                                            key={item}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                                            transition={{ duration: 0.15 }}
                                            className="group/chip inline-flex items-center bg-slate-100 dark:bg-slate-800/80 hover:bg-orange-50/50 dark:hover:bg-orange-950/30 text-slate-700 dark:text-slate-200 rounded-xl text-[14px] font-normal border border-slate-200/70 dark:border-slate-700/70 overflow-hidden shadow-2xs"
                                        >
                                            {/* Tapping the label runs the search */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery(item);
                                                    setIsSearchOpen(true);
                                                }}
                                                className="flex items-center gap-2 min-h-[48px] pl-3.5 pr-2.5 py-2 text-left cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] rounded-l-xl transition-colors"
                                            >
                                                <Clock size={16} className="text-slate-400 shrink-0 group-hover/chip:text-orange-500 transition-colors" />
                                                <span className="truncate max-w-[200px] sm:max-w-[260px]">{item}</span>
                                            </button>

                                            {/* 1px vertical divider */}
                                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700/80 shrink-0" aria-hidden="true" />

                                            {/* Tapping X removes the chip with dedicated >= 48x48px tap target */}
                                            <button
                                                ref={el => removeButtonRefs.current[idx] = el}
                                                type="button"
                                                onClick={(e) => removeRecentSearch(e, item, idx)}
                                                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 active:bg-slate-300/60 dark:active:bg-slate-600/60 rounded-r-xl transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                                                title={`Remove ${item} from recent searches`}
                                                aria-label={`Remove ${item} from recent searches`}
                                            >
                                                <X size={16} className="transition-transform group-active:scale-90" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <p className="text-[14px] text-slate-400 dark:text-slate-500 italic py-2 px-1">
                                No recent searches yet.
                            </p>
                        )}
                    </div>

                    <div className="p-1">
                        <div className="px-1 py-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Quick shortcuts</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {quickActions.slice(0, 4).map((action, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={action.onClick}
                                    className="flex items-center gap-3.5 px-3 min-h-[48px] py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors text-slate-800 dark:text-slate-200 group cursor-pointer"
                                >
                                    <span className="text-slate-400 group-hover:text-[#ff6b00] transition-colors shrink-0 flex items-center justify-center">
                                        {idx === 0 && <Camera size={24} strokeWidth={1.75} />}
                                        {idx === 1 && <MapIcon size={24} strokeWidth={1.75} />}
                                        {idx === 2 && <Handshake size={24} strokeWidth={1.75} />}
                                        {idx === 3 && <BookOpen size={24} strokeWidth={1.75} />}
                                    </span>
                                    <span className="text-[14px] sm:text-[15px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#ff6b00] transition-colors">{action.label}</span>
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
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No results. Try a different word.</p>
                    <p className="text-xs text-slate-500 mt-1">Try searching for ticket IDs, barangay locations, or services.</p>
                </div>
            ) : (
                <div className="space-y-3 p-1">
                    {/* Quick Shortcuts */}
                    {matchedActions.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">Guides</div>
                            <div className="space-y-1 mt-1">
                                {matchedActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={action.onClick}
                                        className="w-full flex items-center justify-between px-3 min-h-[48px] py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400 group-hover:text-[#ff6b00] transition-colors shrink-0">
                                                {action.icon}
                                            </span>
                                            <span className="text-[14px] font-medium text-slate-900 dark:text-white">{action.label}</span>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reports */}
                    {matchedReports.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">Reports</div>
                            <div className="space-y-1 mt-1">
                                {matchedReports.map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelectReport(r)}
                                        className="w-full flex items-center justify-between px-3 min-h-[48px] py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                                <FileText size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{r.category || r.ai_category}</span>
                                                    <span className="font-mono text-[11px] text-slate-400">{r.ticket_id}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 break-words text-left">{r.location_string || 'No location specified'}</div>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Places & Advisories */}
                    {matchedAdvisories.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">Places</div>
                            <div className="space-y-1 mt-1">
                                {matchedAdvisories.map((adv) => (
                                    <button
                                        key={adv.id}
                                        type="button"
                                        onClick={() => handleSelectAdvisory(adv)}
                                        className="w-full flex items-center justify-between px-3 min-h-[48px] py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                                <Bell size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{adv.title}</p>
                                                <p className="text-xs text-slate-500 truncate">{adv.department} • {adv.category}</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hotlines */}
                    {matchedHotlines.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">Hotlines</div>
                            <div className="space-y-1 mt-1">
                                {matchedHotlines.map((h, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectHotline(h)}
                                        className="w-full flex items-center justify-between px-3 min-h-[48px] py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                                <PhoneCall size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{h.name}</p>
                                                <p className="text-xs text-slate-500">{h.tags}</p>
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

                    {/* Guides & Knowledge Base */}
                    {matchedKB.length > 0 && (
                        <div className="pt-2">
                            <div className="px-2 py-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">Guides</div>
                            <div className="space-y-1 mt-1">
                                {matchedKB.map((kb) => (
                                    <button
                                        key={kb.id}
                                        type="button"
                                        onClick={() => handleSelectKB(kb)}
                                        className="w-full flex items-center justify-between px-3 min-h-[48px] py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                                <BookOpen size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{kb.title}</p>
                                                <p className="text-xs text-slate-500 truncate">{kb.excerpt}</p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-indigo-500 shrink-0">{kb.category}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const unreadCount = Array.isArray(notifications)
        ? notifications.filter(n => !n.is_read && !n.is_hidden).length
        : 0;
    const unreadBadgeText = unreadCount > 9 ? '9+' : String(unreadCount);

    const firstName = (() => {
        const raw = (user?.name || (user?.fullName && user.fullName !== 'Loading...' ? user.fullName.split(' ')[0] : 'Resident')).trim();
        return raw || 'Resident';
    })();

    const avatarInitials = (() => {
        const raw = (user?.fullName && user.fullName !== 'Loading...' ? user.fullName : (user?.name || '')).trim();
        if (!raw) return 'ME';
        const parts = raw.split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        if (raw.length >= 2) {
            return raw.slice(0, 2).toUpperCase();
        }
        return raw.toUpperCase();
    })();

    const isHomeTab = activeTab === 'overview' || activeTab === 'home';

    const getScreenTitle = () => {
        if (activeModal === 'map') {
            return t('dashboard.sidebar.communityMap', { defaultValue: 'Community map' });
        }
        if (isHomeTab) {
            return t('dashboard.topNav.headline', { defaultValue: 'Your city, your reports' });
        }
        if (activeTab === 'reports') {
            return t('dashboard.sidebar.reports', { defaultValue: 'My reports' });
        }
        if (activeTab === 'updates') {
            return t('dashboard.sidebar.updates', { defaultValue: 'Updates' });
        }
        if (activeTab === 'profile') {
            return t('dashboard.sidebar.account', { defaultValue: 'Account' });
        }
        if (activeTab === 'settings') {
            return t('dashboard.sidebar.settings', { defaultValue: 'Settings' });
        }
        const currentNav = navItems?.find(n => n.id === activeTab);
        return currentNav?.label || 'PULSO';
    };

    const userMenuItems = [
        {
            id: 'account',
            label: t('dashboard.sidebar.account', { defaultValue: 'My Account' }),
            icon: User,
            onClick: () => handleSetTab('profile'),
        },
        {
            id: 'divider-signout',
            divider: true,
        },
        ...(handleLogout
            ? [
                  {
                      id: 'signout',
                      label: t('dashboard.sidebar.signOut', { defaultValue: 'Sign Out' }),
                      icon: LogOut,
                      danger: true,
                      isSignOut: true,
                      onClick: handleLogout,
                  },
              ]
            : []),
    ];

    const renderNotificationsContent = () => (
        <>
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-base sm:text-lg">Notifications</h3>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleMarkAllRead}
                        className="text-orange-500 text-xs font-bold hover:underline shrink-0 cursor-pointer"
                    >
                        Mark all read
                    </button>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer" aria-label="Close notifications">
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
                                className="w-full text-left p-2.5 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex gap-2.5 sm:gap-3 overflow-hidden pr-8 cursor-pointer"
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
                                className="absolute top-2.5 right-1.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10 cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    ))
                )}
            </div>
            <button onClick={() => { setShowNotifications(false); handleSetModal('all-notifications'); }} className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mt-2 py-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer">See previous notifications</button>
        </>
    );

    const isHeaderlessTab = activeTab === 'reports' || activeTab === 'updates' || activeTab === 'profile' || activeTab === 'account';

    const handleNavGoHome = () => {
        setIsSearchOpen(false);
        setSearchQuery('');
        if (onGoHome) {
            onGoHome();
        } else if (handleSetTab) {
            handleSetTab('overview');
        }
    };

    if (nativeAndroid) {
        if (!isHomeTab || activeModal) return null;
        return (
            <div className="native-dashboard-topbar sticky top-0 z-50 shrink-0" data-scroll-hidden={isNativeHeaderHidden || undefined}>
                <NativeAppHeader appearance="hero" showThemeToggle={false} brand={<NativeResidentGreeting user={user} onOpenAccount={() => {
                    setIsSearchOpen(false);
                    setShowNotifications(false);
                    handleSetTab('profile');
                }} />}>
                    <button type="button" ref={nativeBellRef}
                        aria-label={t('notificationCenter.title', 'All notifications')}
                        aria-expanded={showNotifications}
                        onClick={() => { setShowNotifications(!showNotifications); setIsSearchOpen(false); }}
                        className="relative flex size-11 items-center justify-center rounded-md text-slate-700 hover:bg-slate-200 focus-visible:outline-3 focus-visible:outline-blue-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:outline-blue-300">
                        <Bell size={20} aria-hidden="true" />
                        {unreadCount > 0 && <span className="absolute right-0 top-0 rounded-full bg-primary px-1 text-xs font-bold text-[#0b1630]">{unreadBadgeText}</span>}
                    </button>
                </NativeAppHeader>
                <NativeDashboardSearch isOpen={isSearchOpen} onOpen={() => { setShowNotifications(false); setIsSearchOpen(true); }}
                    onClose={() => setIsSearchOpen(false)} query={searchQuery} onQueryChange={setSearchQuery}
                    actions={quickActions.map((action, index) => ({ ...action,
                        id: ['report', 'map', 'services', 'help', 'reports', 'profile', 'settings'][index],
                        label: t(`nativeAndroid.search.shortcuts.${['report', 'map', 'services', 'help', 'reports', 'profile', 'settings'][index]}`),
                        searchText: action.label,
                    }))}
                    reports={matchedReports} updates={matchedAdvisories} guides={matchedKB} hotlines={matchedHotlines}
                    recent={recentSearches} announcement={recentSearchAnnouncement} onClearRecent={clearAllRecent} onRemoveRecent={removeRecentSearch}
                    onReport={handleSelectReport} onUpdate={handleSelectAdvisory} onGuide={handleSelectKB} onHotline={handleSelectHotline}
                    loading={searchLoading} updatesUnavailable={searchUpdatesUnavailable} />
                <NotificationDropdown isOpen={showNotifications} onClose={() => setShowNotifications(false)}
                    notifications={notifications} onNotificationClick={handleNotificationClick}
                    onMarkAllRead={handleMarkAllRead} onOpenAllNotifications={() => { setShowNotifications(false); handleSetModal('all-notifications'); }}
                    unreadCount={unreadCount} loading={loadingNotifications} error={notificationsError}
                    onRetry={onRetryNotifications} triggerRefs={[nativeBellRef]} activeTriggerRef={nativeBellRef} />
            </div>
        );
    }

    return (
        <header className={`${isHeaderlessTab ? 'hidden md:block' : ''} app-header-landmark shrink-0 sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md w-full border-b border-slate-200/80 dark:border-slate-800`}>
            {/* Background 60% Navy Overlay on mobile when search is open: strictly starts below full header */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-x-0 bottom-0 top-[100%] bg-slate-950/60 backdrop-blur-xs z-30 pointer-events-auto"
                        onClick={() => {
                            setIsSearchOpen(false);
                            searchInputRef.current?.blur();
                            mobileSearchInputRef.current?.blur();
                        }}
                    />
                )}
            </AnimatePresence>

            {isHomeTab ? (
                <HomeHeader
                    user={user}
                    unreadCount={unreadCount}
                    onOpenAccount={() => handleSetTab('profile')}
                    onOpenUpdates={() => handleSetTab('updates')}
                    onSignIn={() => handleSetModal('login')}
                    onOpenAIChat={() => setIsAIChatOpen && setIsAIChatOpen(prev => !prev)}
                    isAIChatOpen={isAIChatOpen}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isSearchOpen={isSearchOpen}
                    setIsSearchOpen={setIsSearchOpen}
                    renderSearchDropdown={renderSearchDropdown}
                    notifications={notifications}
                    showNotifications={showNotifications}
                    setShowNotifications={setShowNotifications}
                    onNotificationClick={handleNotificationClick}
                    onOpenAllNotifications={() => handleSetModal('all-notifications')}
                    onMarkAllRead={handleMarkAllRead}
                    loadingNotifications={loadingNotifications}
                    notificationsError={notificationsError}
                    onRetryNotifications={onRetryNotifications}
                    renderNotificationsContent={renderNotificationsContent}
                    userMenuItems={userMenuItems}
                    handleLogout={handleLogout}
                    handleSetTab={handleSetTab}
                    onGoHome={handleNavGoHome}
                    onSearchKeyDown={handleSearchKeyDown}
                    t={t}
                />
            ) : (
                <BrandHeader
                    activeTab={activeTab}
                    screenTitle={getScreenTitle()}
                    user={user}
                    unreadCount={unreadCount}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isSearchOpen={isSearchOpen}
                    setIsSearchOpen={setIsSearchOpen}
                    renderSearchDropdown={renderSearchDropdown}
                    notifications={notifications}
                    showNotifications={showNotifications}
                    setShowNotifications={setShowNotifications}
                    onNotificationClick={handleNotificationClick}
                    onOpenAllNotifications={() => handleSetModal('all-notifications')}
                    onMarkAllRead={handleMarkAllRead}
                    loadingNotifications={loadingNotifications}
                    notificationsError={notificationsError}
                    onRetryNotifications={onRetryNotifications}
                    renderNotificationsContent={renderNotificationsContent}
                    userMenuItems={userMenuItems}
                    avatarInitials={avatarInitials}
                    handleSetTab={handleSetTab}
                    onGoHome={handleNavGoHome}
                    onSearchKeyDown={handleSearchKeyDown}
                    t={t}
                    hideMobileHeader={isHeaderlessTab}
                    showSearch={false}
                />
            )}
        </header>
    );
};

export { LeftSidebar, TopNavigation };
