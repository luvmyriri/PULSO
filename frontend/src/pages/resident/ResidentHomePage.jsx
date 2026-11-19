import { Building2, LayoutGrid, ClipboardCheck, ExternalLink, Settings, ChevronRight, MapPin, PhoneCall, ShieldCheck, Plus, Droplets, Zap, FileText, AlertTriangle, Radio, Lightbulb, HelpCircle, Trash2, Signpost, Waves } from 'lucide-react';
import { EMERGENCY_HOTLINES } from './residentConstants';
import RoadIcon from './RoadIcon';

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
                <button onClick={() => handleSetModal('map')} className="text-[12px] font-bold text-[#EA580C] hover:text-orange-700 dark:text-[#ff6b00] dark:hover:text-orange-400 flex items-center gap-1 cursor-pointer">
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
                                    <span className="text-[10px] font-mono font-extrabold text-black dark:text-white bg-white/60 dark:bg-slate-800/50 backdrop-blur-md px-2 py-0.5 rounded-full shrink-0 border border-slate-200/80 dark:border-white/10 shadow-xs">
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
    userReports = [],
    loadingReports,
    loadingPublicReports = false,
    publicReportsError = false,
    onRetryPublicReports,
    lguUpdates = [],
    loadingAdvisories,
    nearbyReports = [],
    handleSetTab,
    setActiveModal,
    setSelectedPost,
    setReportCategory,
    unreadUpdatesCount = 0,
    showToast,
    t
}) => {
    const barangayName = user?.barangay || 'Barangay 171';
    const userReportCount = userReports ? userReports.length : 0;

    // What can you report categories (9 categories matching municipal engineering scope with unique palette)
    const REPORT_CATEGORIES = [
        {
            id: 'roads',
            categoryKey: 'Roads & Bridges',
            title: 'Roads & bridges',
            desc: 'Potholes, damaged roads, and sidewalks',
            icon: <RoadIcon size={20} className="text-[#EA580C]" />,
            iconBg: 'bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] border border-orange-100 dark:border-orange-900/30'
        },
        {
            id: 'drainage',
            categoryKey: 'Drainage & Flood Control',
            title: 'Drainage & flooding',
            desc: 'Clogged drains, gutters, and flooding',
            icon: <Waves size={20} className="text-cyan-500" />,
            iconBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 border border-cyan-100 dark:border-cyan-900/30'
        },
        {
            id: 'streetlights',
            categoryKey: 'Streetlights',
            title: 'Street lighting',
            desc: 'Busted, flickering, or damaged lights',
            icon: <Lightbulb size={20} className="text-amber-500" />,
            iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-100 dark:border-amber-900/30'
        },
        {
            id: 'water',
            categoryKey: 'Water Pipeline',
            title: 'Water pipeline',
            desc: 'Pipeline leaks, burst pipes, and low water pressure',
            icon: <Droplets size={20} className="text-sky-500" />,
            iconBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-500 border border-sky-100 dark:border-sky-900/30'
        },
        {
            id: 'safety',
            categoryKey: 'Public Safety',
            title: 'Public safety hazards',
            desc: 'Fallen trees, open manholes, hazards',
            icon: <AlertTriangle size={20} className="text-rose-500" />,
            iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-100 dark:border-rose-900/30'
        },
        {
            id: 'traffic',
            categoryKey: 'Traffic & Road Signs',
            title: 'Traffic & road signs',
            desc: 'Missing or damaged traffic signs',
            icon: <Signpost size={20} className="text-purple-500" />,
            iconBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-500 border border-purple-100 dark:border-purple-900/30'
        },
        {
            id: 'facilities',
            categoryKey: 'Public Buildings & Facilities',
            title: 'Public facilities',
            desc: 'Parks, civic centers, and buildings',
            icon: <Building2 size={20} className="text-[#6366F1]" style={{ color: '#6366F1' }} />,
            iconBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-[#6366F1] border border-indigo-100 dark:border-indigo-900/30',
            iconBgStyle: {
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                borderColor: 'rgba(99, 102, 241, 0.28)',
                color: '#6366F1'
            }
        },
        {
            id: 'electrical',
            categoryKey: 'Electrical Wiring',
            title: 'Electrical wiring',
            desc: 'Dangling cables and exposed wires',
            icon: <Zap size={20} className="text-yellow-500" />,
            iconBg: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-500 border border-yellow-100 dark:border-yellow-900/30'
        },
        {
            id: 'waste',
            categoryKey: 'Waste Management',
            title: 'Waste management',
            desc: 'Uncollected garbage, illegal dumping, litter',
            icon: <Trash2 size={20} className="text-emerald-500" />,
            iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-100 dark:border-emerald-900/30'
        }
    ];

    // The public feed is the authority for this list. Pending private reports belong in My reports.
    const nearbyItems = nearbyReports.slice(0, 3).map(issue => ({
        id: issue.id,
        title: issue.title || issue.category || t('dashboard.publicConcerns.report', { defaultValue: 'Civic report' }),
        location: issue.location_string || issue.barangay || t('dashboard.publicConcerns.locationUnavailable', { defaultValue: 'Location unavailable' }),
        raw: issue
    }));

    return (
        <div className="w-full pb-32 sm:pb-36 lg:pb-16 pt-2 sm:pt-4 px-3 sm:px-4 lg:px-5 xl:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-5 items-start">

                {/* ── LEFT COLUMN (Primary Content, 8 cols on desktop) ── */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5 sm:gap-6 w-full">

                    {/* 1. Hero Banner Card using uploaded Caloocan monument photo */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden relative p-6 sm:p-8 lg:p-9 shadow-xs min-h-[175px] sm:min-h-[205px] flex items-center">
                        {/* Right Caloocan Landmark Banner Photo */}
                        <div className="absolute right-0 top-0 bottom-0 w-3/5 sm:w-2/3 lg:w-[62%] pointer-events-none select-none overflow-hidden">
                            <img
                                src="/caloocan-hero-banner.png"
                                alt="Caloocan City Landmark - I Love Caloocan"
                                className="w-full h-full object-cover object-right"
                            />
                            {/* Soft fading gradient matching the card background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 pointer-events-none" />
                        </div>

                        {/* Content overlay on the left */}
                        <div className="relative z-10 max-w-md sm:max-w-lg">
                            <span className="text-[11px] sm:text-xs font-black tracking-wider text-[#EA580C] uppercase block mb-1">
                                CLEANER STREETS. SAFER COMMUNITIES.
                            </span>
                            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#0B1528] dark:text-white leading-[1.18] tracking-tight">
                                A better neighborhood<br className="hidden sm:inline" /> starts with you.
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                                Report concerns, follow updates, and find help in Caloocan.
                            </p>
                        </div>
                    </div>

                    {/* 2. Standalone Callout Action Card */}
                    <div className="w-full rounded-2xl sm:rounded-3xl bg-[#FFF9F5] dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-900/40 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-[#FFEADB] dark:bg-orange-900/50 text-[#EA580C] border border-orange-200/60 dark:border-orange-800/50 flex items-center justify-center shrink-0">
                                <FileText size={22} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                                    See an issue? Let the city know.
                                </h3>
                                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                                    {userReportCount === 0
                                        ? "You haven't filed a report yet. Add a location, photo, and description to get started."
                                        : `You have ${userReportCount} ${userReportCount === 1 ? 'report' : 'reports'} on file. Submit another issue anytime.`
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setActiveModal('file-report')}
                                className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-95 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                                <Plus size={16} strokeWidth={2.8} />
                                <span>{userReportCount === 0 ? 'File your first report' : 'File a report'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal('map')}
                                className="px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
                            >
                                <MapPin size={15} className="text-[#EA580C]" />
                                <span>Explore city map</span>
                            </button>
                        </div>
                    </div>

                    {/* 2. "What can you report?" Section */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-1 rounded-lg text-[#EA580C] shrink-0 mt-0.5">
                                <LayoutGrid size={22} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                    What can you report?
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Help us keep Caloocan safe, clean, and well-maintained.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-3">
                            {REPORT_CATEGORIES.map(cat => {
                                const isWaste = cat.id === 'waste';
                                return (
                                    <div
                                        key={cat.id}
                                        className={`p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-left flex flex-col sm:flex-row items-start gap-2.5 sm:gap-3 h-full select-none ${
                                            isWaste ? 'col-span-2 justify-self-center w-[calc(50%-5px)] sm:w-[calc(50%-6px)] md:col-span-1 md:w-full md:justify-self-auto' : ''
                                        }`}
                                    >
                                        <div
                                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.iconBg}`}
                                            style={cat.iconBgStyle}
                                        >
                                            {cat.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                                {cat.title}
                                            </h4>
                                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                {cat.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. "How reporting works" Section */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-1 rounded-lg text-[#EA580C] shrink-0 mt-0.5">
                                <Settings size={22} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                    How reporting works
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    From report to action — a simple and transparent process.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Step 1 */}
                            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#EA580C] font-bold text-sm flex items-center justify-center shrink-0">
                                    1
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                        Share the details
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Add the location, a clear photo, and a short description of the issue.
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#EA580C] font-bold text-sm flex items-center justify-center shrink-0">
                                    2
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                        Department review
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Your report goes directly to the City Engineering Department for assessment.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#EA580C] font-bold text-sm flex items-center justify-center shrink-0">
                                    3
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                        Follow the outcome
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Track updates in real time and be notified as progress is made.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. "Nearby concerns" Section */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <MapPin size={20} className="text-[#EA580C] shrink-0" />
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                    {t('dashboard.publicConcerns.title', { defaultValue: 'Public concerns' })}
                                </h3>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {t('dashboard.publicConcerns.count', { count: nearbyReports.length, defaultValue: '{{count}} public' })}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveModal('map')}
                                className="text-xs font-bold text-[#EA580C] hover:text-orange-700 dark:text-[#ff6b00] dark:hover:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <span>{t('dashboard.publicConcerns.viewMap', { defaultValue: 'View map' })}</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {nearbyItems.map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => {
                                        if (setSelectedPost && item.raw) setSelectedPost(item.raw);
                                        setActiveModal('map');
                                    }}
                                    className="w-full p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group text-left focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[#ff6b00]"
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/40 group-hover:text-[#EA580C] flex items-center justify-center shrink-0 transition-colors mt-0.5">
                                            <MapPin size={17} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-white group-hover:text-[#EA580C] transition-colors">
                                                {item.title}
                                            </h4>
                                            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5" title={item.location}>
                                                {item.location}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                                    </div>
                                </button>
                            ))}
                            {nearbyItems.length === 0 && (
                                <div className="p-5 text-sm text-slate-600 dark:text-slate-300" role={publicReportsError ? 'alert' : 'status'}>
                                    {loadingPublicReports
                                        ? t('dashboard.publicConcerns.loading', { defaultValue: 'Loading public reports…' })
                                        : publicReportsError
                                            ? t('dashboard.publicConcerns.error', { defaultValue: 'Public reports could not be loaded.' })
                                            : t('dashboard.publicConcerns.empty', { defaultValue: 'No reports are public yet. Reports awaiting government review appear in My reports for their authors.' })}
                                    {publicReportsError && onRetryPublicReports && (
                                        <button type="button" onClick={onRetryPublicReports} className="ml-2 min-h-11 px-3 rounded-lg font-semibold text-[#EA580C] focus-visible:outline-3 focus-visible:outline-[#ff6b00]">
                                            {t('dashboard.publicConcerns.retry', { defaultValue: 'Try again' })}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN (Sidebar Cards, 4 cols on desktop) ── */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 sm:gap-5 w-full">

                    {/* 1. Before you submit Card */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] flex items-center justify-center shrink-0">
                                <ClipboardCheck size={20} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                                    Before you submit
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    A few quick tips for a faster and more accurate report.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3.5">
                            {/* Tip 1 */}
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    1
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                        Exact location
                                    </h4>
                                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        Pin the correct spot on the map or enter the address.
                                    </p>
                                </div>
                            </div>

                            {/* Tip 2 */}
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    2
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                        Clear photo
                                    </h4>
                                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        Take a recent, clear photo of the issue.
                                    </p>
                                </div>
                            </div>

                            {/* Tip 3 */}
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    3
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                        Short description
                                    </h4>
                                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        Briefly describe what happened and any safety concerns.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Your reports Card */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                                <FileText size={18} className="text-[#EA580C]" />
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                    Your reports
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleSetTab('reports')}
                                className="text-xs font-bold text-[#EA580C] hover:text-orange-700 dark:text-[#ff6b00] dark:hover:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <span>View all</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className="pt-1">
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {userReportCount} <span className="text-sm font-bold text-slate-700 dark:text-slate-300">reports submitted</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Track your submissions here.
                            </p>
                        </div>
                    </div>

                    {/* 3. City updates & advisories Card */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                                <Radio size={18} className="text-[#EA580C]" />
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                    City updates &amp; advisories
                                </h3>
                                {unreadUpdatesCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 tabular-nums">
                                        {unreadUpdatesCount} new
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleSetTab('updates')}
                                className="text-xs font-bold text-[#EA580C] hover:text-orange-700 dark:text-[#ff6b00] dark:hover:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <span>View updates</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className="pt-1 space-y-1">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Official bulletins will appear here.
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Check back for the latest announcements from the City Engineering Department.
                            </p>
                        </div>
                    </div>

                    {/* 4. Emergency assistance Card */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                        <div className="flex items-start gap-2.5 mb-3">
                            <PhoneCall size={18} className="text-[#EA580C] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                                    Emergency assistance
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    For urgent concerns, contact the appropriate city offices.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setActiveModal('emergency')}
                            className="w-full mt-2 py-3 px-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100/80 dark:hover:bg-orange-900/40 border border-orange-200/80 dark:border-orange-900/40 text-[#EA580C] font-bold text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <ExternalLink size={15} />
                                <span>Open emergency contacts</span>
                            </div>
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* 5. Help center Card */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                                <HelpCircle size={18} className="text-blue-500" />
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                    Help center
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveModal('help-center')}
                                className="text-xs font-bold text-[#EA580C] hover:text-orange-700 dark:text-[#ff6b00] dark:hover:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <span>View help center</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Find guides, FAQs, and reporting tips.
                        </p>
                    </div>

                </div>

            </div>
        </div>
    );
};
export default ResidentHomeView;
