import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, X, MapPin, Search, Clock, Info, ArrowRight, Droplets, FileText, Check, Calendar, Lightbulb, Cone, Wrench, Megaphone, ArrowRightLeft, Car } from 'lucide-react';
import { CALOOCAN_BARANGAYS } from "../../utils/philippineAddress";
import RoadIcon from './RoadIcon';

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

const CALOOCAN_SCOPE_AREAS = [
    { id: 'all', name: 'All Caloocan', label: 'All Caloocan (Whole City)', sector: 'All', isGlobal: true },
    { id: 'north-all', name: 'Caloocan North', label: 'Caloocan North (Brgy 165–188)', sector: 'North', isGlobal: true },
    { id: 'south-all', name: 'Caloocan South', label: 'Caloocan South (Brgy 1–164)', sector: 'South', isGlobal: true }
];

const CALOOCAN_ALL_AREAS = [
    ...CALOOCAN_SCOPE_AREAS,
    ...CALOOCAN_BARANGAYS.map(b => ({
        id: `brgy-${b.number}`,
        number: b.number,
        name: b.name,
        alias: b.alias,
        label: b.label,
        sector: b.number >= 165 ? 'North' : 'South',
        isGlobal: false
    }))
];

const CALOOCAN_AREAS = CALOOCAN_ALL_AREAS.map(a => a.label);

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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedArea, setSelectedArea] = useState('Barangay 171');
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
    const [areaSearchQuery, setAreaSearchQuery] = useState('');
    const [areaSectorTab, setAreaSectorTab] = useState('all'); // 'all' | 'north' | 'south'
    const areaDropdownRef = useRef(null);
    const areaSearchInputRef = useRef(null);

    // Auto-focus search input when area dropdown opens
    useEffect(() => {
        if (isAreaDropdownOpen) {
            const timer = setTimeout(() => {
                areaSearchInputRef.current?.focus();
            }, 60);
            return () => clearTimeout(timer);
        } else {
            setAreaSearchQuery('');
        }
    }, [isAreaDropdownOpen]);

    // Filtered areas based on sector tab and search query
    const filteredAreas = useMemo(() => {
        let list = CALOOCAN_ALL_AREAS;

        if (areaSectorTab === 'north') {
            list = list.filter(a => a.sector === 'North' && !a.isGlobal);
        } else if (areaSectorTab === 'south') {
            list = list.filter(a => a.sector === 'South' && !a.isGlobal);
        }

        if (areaSearchQuery.trim()) {
            const q = areaSearchQuery.toLowerCase().trim();
            list = list.filter(a => {
                const matchName = (a.name || '').toLowerCase().includes(q);
                const matchLabel = (a.label || '').toLowerCase().includes(q);
                const matchAlias = (a.alias || '').toLowerCase().includes(q);
                const matchNum = a.number ? String(a.number) === q || String(a.number).startsWith(q) : false;
                return matchName || matchLabel || matchAlias || matchNum;
            });
        }

        return list;
    }, [areaSectorTab, areaSearchQuery]);

    const globalAreasList = useMemo(() => filteredAreas.filter(a => a.isGlobal), [filteredAreas]);
    const northAreasList = useMemo(() => filteredAreas.filter(a => !a.isGlobal && a.sector === 'North'), [filteredAreas]);
    const southAreasList = useMemo(() => filteredAreas.filter(a => !a.isGlobal && a.sector === 'South'), [filteredAreas]);

    useEffect(() => {
        if (!isAreaDropdownOpen) return;
        const handleClickOutside = (e) => {
            if (areaDropdownRef.current && !areaDropdownRef.current.contains(e.target)) {
                setIsAreaDropdownOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsAreaDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isAreaDropdownOpen]);

    // Merge live updates with sample advisories
    const allNotices = useMemo(() => {
        if (!lguUpdates || lguUpdates.length === 0) {
            return [];
        }

        // Normalize live updates
        const normalizedLive = lguUpdates.map((u, i) => {
            const cat = (u.category || '').toLowerCase();
            const dept = (u.department || '').toLowerCase();
            const isUtil = cat.includes('util') || dept.includes('maynilad') || dept.includes('meralco');
            const isRoad = cat.includes('road') || cat.includes('infra') || dept.includes('engineering');

            return {
                id: u.id || u.advisory_id || `live-${i}`,
                advisory_id: u.announcement_id || u.id,
                type: isUtil ? 'service_interruption' : (isRoad ? 'scheduled_works' : 'advisory'),
                category: isUtil ? 'Utilities' : (isRoad ? 'Roadworks' : (cat.includes('event') ? 'Events' : 'Advisories')),
                department: u.department || 'City Government of Caloocan',
                source: u.department || 'City Government of Caloocan',
                title: u.title || 'Municipal Advisory',
                description: u.description || '',
                time: u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
                location: u.barangay || 'Citywide',
                barangay: u.barangay || 'Citywide',
                published: u.created_at ? `Published ${new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Recent',
                image_url: u.image_url || null,
                has_image: !!u.image_url,
                theme: isUtil ? 'amber' : (isRoad ? 'sky' : 'amber'),
                status_label: isUtil ? 'Service interruption' : (isRoad ? 'Scheduled works' : 'Advisories'),
                cta_primary: isRoad ? 'View details' : 'Read full notice',
                cta_secondary: isRoad ? 'View location' : 'Affected areas'
            };
        });

        // Combine sample notices at top, then live notices
        return normalizedLive;
    }, [lguUpdates]);

    // Category Tabs definition matching target design
    const categoryTabs = [
        { id: 'all', label: 'All', icon: null },
        { id: 'utilities', label: 'Utilities', icon: Droplets, color: 'text-blue-500' },
        { id: 'roadworks', label: 'Roadworks', icon: RoadIcon, color: 'text-amber-500' },
        { id: 'advisories', label: 'Advisories', icon: Megaphone, color: 'text-rose-500' },
        { id: 'events', label: 'Events', icon: Calendar, color: 'text-emerald-500' },
    ];

    // Filtered notices
    const filteredNotices = useMemo(() => {
        return allNotices.filter(notice => {
            // Category filter
            if (selectedCategory !== 'all') {
                const c = (notice.category || '').toLowerCase();
                if (selectedCategory === 'utilities' && !c.includes('util')) return false;
                if (selectedCategory === 'roadworks' && !c.includes('road') && !c.includes('infra')) return false;
                if (selectedCategory === 'advisories' && !c.includes('advis')) return false;
                if (selectedCategory === 'events' && !c.includes('event')) return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchTitle = (notice.title || '').toLowerCase().includes(q);
                const matchDesc = (notice.description || '').toLowerCase().includes(q);
                const matchDept = (notice.department || '').toLowerCase().includes(q);
                const matchLoc = (notice.location || '').toLowerCase().includes(q);
                const matchReason = (notice.reason || '').toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchDept && !matchLoc && !matchReason) return false;
            }

            return true;
        });
    }, [allNotices, selectedCategory, searchQuery]);

    const areaNoticesCount = useMemo(() => {
        return allNotices.filter(n => {
            if (selectedArea === 'All Caloocan' || selectedArea.startsWith('All Caloocan')) return true;
            const b = (n.barangay || '').toLowerCase();
            const l = (n.location || '').toLowerCase();
            const s = selectedArea.toLowerCase();

            // Caloocan North sector scope
            if (s.includes('caloocan north') || s.includes('north caloocan')) {
                const matchNum = b.match(/(?:^|\D)(16[5-9]|17[0-9]|18[0-8])(?:\D|$)/);
                return !!matchNum || b.includes('north') || l.includes('north');
            }
            // Caloocan South sector scope
            if (s.includes('caloocan south') || s.includes('south caloocan')) {
                const matchNum = b.match(/(?:^|\D)([1-9]|[1-9][0-9]|1[0-5][0-9]|16[0-4])(?:\D|$)/);
                return (!!matchNum && !b.includes('north')) || b.includes('south') || l.includes('south');
            }

            // Extract specific barangay number
            const numMatch = s.match(/(?:barangay|brgy)\s*(\d+)/i);
            if (numMatch) {
                const brgyNum = numMatch[1];
                const re = new RegExp('(?:barangay|brgy|bgy)[^0-9]*' + brgyNum + '(?![0-9])|(?:^|[^0-9])' + brgyNum + '(?:[^0-9]|$)', 'i');
                if (re.test(b) || re.test(l)) {
                    return true;
                }
            }
            return b.includes(s) || l.includes(s);
        }).length;
    }, [allNotices, selectedArea]);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full space-y-6"
        >
            {/* ── Top Header Row ── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1528] dark:text-white tracking-tight">
                        City Updates &amp; Advisories
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Plan ahead with notices that matter to your area.
                    </p>
                </div>
            </div>

            {/* ── Search Input & Area Dropdown Controls Row ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notices, locations or keywords.."
                        className="w-full h-11 sm:h-12 pl-10 pr-9 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20 transition-all shadow-2xs"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Custom Area / Barangay Dropdown List */}
                <div className="relative shrink-0 w-full sm:w-auto" ref={areaDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
                        aria-haspopup="listbox"
                        aria-expanded={isAreaDropdownOpen}
                        className={`w-full sm:w-auto h-11 sm:h-12 px-4 bg-white dark:bg-slate-900 border rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between sm:justify-start gap-2.5 shadow-2xs transition-all cursor-pointer select-none ${
                            isAreaDropdownOpen
                                ? 'border-[#EA580C] ring-2 ring-[#EA580C]/20 shadow-xs'
                                : 'border-slate-200/90 dark:border-slate-800 hover:border-[#EA580C]/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <MapPin size={16} className={`shrink-0 transition-colors ${isAreaDropdownOpen ? 'text-[#EA580C]' : 'text-[#0B1528] dark:text-white'}`} />
                            <span className="truncate">{selectedArea}</span>
                        </div>
                        <ChevronDown
                            size={14}
                            className={`text-slate-400 ml-1 shrink-0 transition-transform duration-200 ${isAreaDropdownOpen ? 'rotate-180 text-[#EA580C]' : ''}`}
                        />
                    </button>

                    <AnimatePresence>
                        {isAreaDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                role="listbox"
                                className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-full sm:w-80 md:w-96 bg-white dark:bg-[#0C1528] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/70 z-50 overflow-hidden flex flex-col"
                            >
                                {/* Header + Search + Sector Tabs */}
                                <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xs">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Select Area / Barangay
                                        </span>
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {filteredAreas.length} {filteredAreas.length === 1 ? 'area' : 'areas'}
                                        </span>
                                    </div>

                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search
                                            size={14}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                                        />
                                        <input
                                            ref={areaSearchInputRef}
                                            type="text"
                                            value={areaSearchQuery}
                                            onChange={(e) => setAreaSearchQuery(e.target.value)}
                                            placeholder="Search barangay (e.g. 171, Camarin, Sangandaan)..."
                                            className="w-full pl-8 pr-7 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-all"
                                        />
                                        {areaSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setAreaSearchQuery('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
                                                aria-label="Clear area search"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Sector Filter Tabs */}
                                    <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                                        {[
                                            { id: 'all', label: 'All', count: 188 },
                                            { id: 'north', label: 'North', count: 24 },
                                            { id: 'south', label: 'South', count: 164 }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setAreaSectorTab(tab.id)}
                                                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                                    areaSectorTab === tab.id
                                                        ? 'bg-[#EA580C] text-white shadow-2xs'
                                                        : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                <span className={`text-[9px] font-mono px-1 rounded ${areaSectorTab === tab.id ? 'bg-white/20 text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                    {tab.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Scrollable List of Barangays and Areas */}
                                <div className="max-h-72 overflow-y-auto p-1.5 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {/* Global / Citywide Options */}
                                    {globalAreasList.length > 0 && (
                                        <div className="pt-1 pb-1 first:pt-0">
                                            <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                City & Sector Scopes
                                            </div>
                                            <div className="space-y-0.5 mt-0.5">
                                                {globalAreasList.map(area => {
                                                    const isSelected = selectedArea === area.label || selectedArea === area.name;
                                                    return (
                                                        <button
                                                            key={area.id}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={isSelected}
                                                            onClick={() => {
                                                                setSelectedArea(area.name);
                                                                setIsAreaDropdownOpen(false);
                                                                setAreaSearchQuery('');
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-900/50 shadow-2xs'
                                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-transparent'
                                                            }`}
                                                        >
                                                            <span className="truncate">{area.label}</span>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                                                    Scope
                                                                </span>
                                                                {isSelected && (
                                                                    <div className="w-4 h-4 rounded-full bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0">
                                                                        <Check size={11} strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* North Caloocan Barangays (165-188) */}
                                    {northAreasList.length > 0 && (
                                        <div className="pt-1.5 pb-1 first:pt-0">
                                            <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                                                <span>North Caloocan ({northAreasList.length})</span>
                                                <span className="text-[8px] font-mono opacity-80">Brgy 165–188</span>
                                            </div>
                                            <div className="space-y-0.5 mt-0.5">
                                                {northAreasList.map(area => {
                                                    const isSelected = selectedArea === area.label ||
                                                                       selectedArea === area.name ||
                                                                       (area.number && (selectedArea === `Barangay ${area.number}` || selectedArea.startsWith(`Barangay ${area.number} `)));
                                                    return (
                                                        <button
                                                            key={area.id}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={isSelected}
                                                            onClick={() => {
                                                                setSelectedArea(area.label);
                                                                setIsAreaDropdownOpen(false);
                                                                setAreaSearchQuery('');
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-900/50 shadow-2xs'
                                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-transparent'
                                                            }`}
                                                        >
                                                            <span className="truncate">{area.label}</span>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                                                                    North
                                                                </span>
                                                                {isSelected && (
                                                                    <div className="w-4 h-4 rounded-full bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0">
                                                                        <Check size={11} strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* South Caloocan Barangays (1-164) */}
                                    {southAreasList.length > 0 && (
                                        <div className="pt-1.5 pb-1 first:pt-0">
                                            <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center justify-between">
                                                <span>South Caloocan ({southAreasList.length})</span>
                                                <span className="text-[8px] font-mono opacity-80">Brgy 1–164</span>
                                            </div>
                                            <div className="space-y-0.5 mt-0.5">
                                                {southAreasList.map(area => {
                                                    const isSelected = selectedArea === area.label ||
                                                                       selectedArea === area.name ||
                                                                       (area.number && (selectedArea === `Barangay ${area.number}` || selectedArea.startsWith(`Barangay ${area.number} `)));
                                                    return (
                                                        <button
                                                            key={area.id}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={isSelected}
                                                            onClick={() => {
                                                                setSelectedArea(area.label);
                                                                setIsAreaDropdownOpen(false);
                                                                setAreaSearchQuery('');
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-900/50 shadow-2xs'
                                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-transparent'
                                                            }`}
                                                        >
                                                            <span className="truncate">{area.label}</span>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-medium bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/50">
                                                                    South
                                                                </span>
                                                                {isSelected && (
                                                                    <div className="w-4 h-4 rounded-full bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0">
                                                                        <Check size={11} strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty Search Results */}
                                    {filteredAreas.length === 0 && (
                                        <div className="py-8 px-4 text-center">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                No barangay found
                                            </p>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                                No matching barangay for &quot;{areaSearchQuery}&quot;. Try searching by number (e.g. &quot;171&quot;) or area name.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAreaSearchQuery('');
                                                    setAreaSectorTab('all');
                                                }}
                                                className="mt-3 px-3 py-1 text-[11px] font-bold text-[#EA580C] hover:underline cursor-pointer"
                                            >
                                                Reset search filter
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Category Filter Tabs ── */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
                {categoryTabs.map(tab => {
                    const isActive = selectedCategory === tab.id;
                    const IconComponent = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedCategory(tab.id)}
                            className={`h-10 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer select-none shrink-0 ${
                                isActive
                                    ? 'bg-[#EA580C] text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                            }`}
                        >
                            {IconComponent && (
                                <IconComponent
                                    size={14}
                                    className={isActive ? 'text-white' : (tab.color || 'text-slate-500')}
                                />
                            )}
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Main 2-Column Content Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* ── Left Column: Notices List (Span 2) ── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Area Notice Count Banner Card */}
                    <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0B1528] dark:text-white flex items-center justify-center shrink-0 mt-0.5">
                                <MapPin size={17} strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                                    {selectedArea}
                                </h2>
                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                    {areaNoticesCount} {areaNoticesCount === 1 ? 'notice' : 'notices'} in your area
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setIsAreaDropdownOpen(true);
                                areaDropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 border border-sky-100 dark:border-slate-700 text-sky-700 dark:text-sky-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                            <ArrowRightLeft size={13} />
                            <span>Change area</span>
                        </button>
                    </div>

                    {/* Notices Stream */}
                    {filteredNotices.length === 0 ? (
                        <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                No notices found for your filters.
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Try adjusting your search query or selecting &quot;All&quot; categories.
                            </p>
                        </div>
                    ) : (
                        filteredNotices.map((notice) => {
                            const isServiceInterruption = notice.type === 'service_interruption' || notice.theme === 'amber';
                            const isScheduledWorks = notice.type === 'scheduled_works' || notice.theme === 'sky';

                            // Card Styling
                            let cardBg = 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800';
                            let iconBg = 'bg-orange-100 dark:bg-orange-950/50 text-[#EA580C]';
                            let badgeStyle = 'bg-[#FFEDD5] dark:bg-amber-900/60 text-[#C2410C] dark:text-amber-300 border border-[#FDBA74]/60';

                            if (isServiceInterruption) {
                                cardBg = 'bg-[#FFFBF5] dark:bg-amber-950/15 border border-[#FED7AA]/80 dark:border-amber-900/40';
                                iconBg = 'bg-[#FFEDD5] dark:bg-amber-900/50 text-[#EA580C]';
                                badgeStyle = 'bg-[#FFEDD5] dark:bg-amber-900/60 text-[#C2410C] dark:text-amber-300 border border-[#FDBA74]/60';
                            } else if (isScheduledWorks) {
                                cardBg = 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800';
                                iconBg = 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300';
                                badgeStyle = 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/80';
                            } else if (notice.theme === 'emerald') {
                                cardBg = 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800';
                                iconBg = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300';
                                badgeStyle = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80';
                            }

                            return (
                                <div
                                    key={notice.id || notice.advisory_id}
                                    className={`p-4 sm:p-6 rounded-2xl ${cardBg} shadow-xs space-y-3.5 sm:space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700`}
                                >
                                    {/* Top Bar: Icon + Badge and Source */}
                                    <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
                                                {isServiceInterruption ? (
                                                    <Droplets size={19} className="text-[#EA580C]" />
                                                ) : isScheduledWorks ? (
                                                    <RoadIcon size={18} className="text-sky-700 dark:text-sky-300" />
                                                ) : notice.theme === 'emerald' ? (
                                                    <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-300" />
                                                ) : (
                                                    <Megaphone size={18} className="text-rose-600" />
                                                )}
                                            </div>

                                            <span className={`px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold ${badgeStyle}`}>
                                                {notice.status_label || notice.category}
                                            </span>
                                        </div>

                                        <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0 ml-auto sm:ml-0">
                                            Source: {notice.source || notice.department}
                                        </span>
                                    </div>

                                    {/* Title & Description */}
                                    <div>
                                        <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                            {notice.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                            {notice.description}
                                        </p>
                                    </div>

                                    {/* Content Detail Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 pt-1">
                                        {/* Left Meta Sub-col */}
                                        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400 shrink-0" />
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{notice.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-slate-400 shrink-0" />
                                                <span>{notice.location}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} className="text-slate-400 shrink-0" />
                                                <span className="text-slate-500 dark:text-slate-400">{notice.published}</span>
                                            </div>

                                            {/* Photo thumbnail if present in scheduled works */}
                                            {notice.has_image && notice.image_url && (
                                                <div className="pt-2">
                                                    <img
                                                        src={notice.image_url}
                                                        alt={notice.title}
                                                        className="w-40 sm:w-48 h-24 sm:h-28 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Guidance Sub-col */}
                                        <div className="space-y-2.5 sm:space-y-3 text-xs text-slate-600 dark:text-slate-300">
                                            {notice.reason && (
                                                <div>
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                                        <Wrench size={13} className="text-slate-500 shrink-0" />
                                                        <span>Reason</span>
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 ml-4.5">
                                                        {notice.reason}
                                                    </p>
                                                </div>
                                            )}

                                            {notice.expected_impact && (
                                                <div>
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                                        <Car size={14} className="text-slate-500 shrink-0" />
                                                        <span>Expected impact</span>
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 ml-5">
                                                        {notice.expected_impact}
                                                    </p>
                                                </div>
                                            )}

                                            {notice.what_you_can_do && notice.what_you_can_do.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                                        <Lightbulb size={13} className="text-amber-500 shrink-0" />
                                                        <span>What you can do</span>
                                                    </div>
                                                    <div className="text-slate-500 dark:text-slate-400 mt-0.5 ml-4.5 space-y-0.5">
                                                        {notice.what_you_can_do.map((item, i) => (
                                                            <p key={i}>{item}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {notice.note && (
                                                <div>
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                                        <Info size={13} className="text-slate-400 shrink-0" />
                                                        <span>Note</span>
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 ml-4.5">
                                                        {notice.note}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons Row */}
                                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (setSelectedPost) setSelectedPost(notice);
                                                if (setActiveModal) setActiveModal('post-details');
                                            }}
                                            className="w-full sm:w-auto px-3 sm:px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
                                        >
                                            <span>{notice.cta_primary || 'Read full notice'}</span>
                                            <ArrowRight size={14} className="shrink-0" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (setSelectedPost) setSelectedPost(notice);
                                                if (setActiveModal) setActiveModal('map');
                                            }}
                                            className="w-full sm:w-auto px-3 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer text-center"
                                        >
                                            <MapPin size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
                                            <span>{notice.cta_secondary || 'Affected areas'}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Right Column: Information & Assistance Widgets (Span 1) ── */}
                <div className="space-y-5">
                    {/* Widget 1: Your Area */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Your area
                        </div>
                        <div className="flex items-center justify-between gap-3 mt-2">
                            <div className="flex items-center gap-2">
                                <MapPin size={18} className="text-[#EA580C] shrink-0" />
                                <span className="font-bold text-slate-900 dark:text-white text-base">
                                    {selectedArea}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAreaDropdownOpen(true);
                                    areaDropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                                className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 border border-sky-100 dark:border-slate-700 text-sky-700 dark:text-sky-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                            >
                                <ArrowRightLeft size={13} />
                                <span>Change area</span>
                            </button>
                        </div>
                    </div>

                    {/* Widget 2: Notice Status Guide */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Notice status guide
                        </h3>

                        <div className="space-y-3">
                            {/* Service Interruption */}
                            <div className="p-3 rounded-xl bg-[#FFF7ED] dark:bg-amber-950/20 border border-[#FED7AA]/60 dark:border-amber-900/30">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFEDD5] text-[#C2410C]">
                                    <Droplets size={12} className="text-[#C2410C]" />
                                    <span>Service interruption</span>
                                </span>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-snug">
                                    Temporary disruption to a service (e.g. water, power).
                                </p>
                            </div>

                            {/* Scheduled Works */}
                            <div className="p-3 rounded-xl bg-[#F0F9FF] dark:bg-sky-950/20 border border-[#BAE6FD]/60 dark:border-sky-900/30">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                                    <RoadIcon size={12} className="text-sky-800" />
                                    <span>Scheduled works</span>
                                </span>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-snug">
                                    Planned construction or maintenance activities.
                                </p>
                            </div>

                            {/* Completed */}
                            <div className="p-3 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/20 border border-[#BBF7D0]/60 dark:border-emerald-900/30">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 size={12} className="text-emerald-700" />
                                    <span>Completed</span>
                                </span>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-snug">
                                    Previously announced activity that has been completed.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSelectedCategory('all')}
                            className="w-full pt-1 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-orange-600 hover:text-orange-700 dark:text-orange-500 transition-colors cursor-pointer"
                        >
                            <Clock size={14} />
                            <span>View past notices</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>

                    {/* Widget 3: Report a Concern */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
                        <div className="flex items-start gap-3">
                            <Cone size={28} className="text-orange-500 shrink-0 mt-0.5" strokeWidth={2.2} />
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                    Report a concern
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    See an urgent issue in your area? Let us know so our team can look into it.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (setActiveModal) setActiveModal('file-report');
                                else if (handleSetTab) handleSetTab('reports');
                            }}
                            className="w-full py-3 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                        >
                            <span>Report a concern</span>
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export { CALOOCAN_SCOPE_AREAS, CALOOCAN_ALL_AREAS };
export default LguFeed;
