import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ClipboardList, Wrench, Building2, MapPin, BarChart2,
    Users, Settings, ChevronLeft, ChevronRight, Search,
    Bell, Check, AlertTriangle, ShieldCheck, ShieldAlert, Clock, CheckSquare,
    Square, ChevronDown, Filter, X, Copy, ExternalLink,
    MessageSquare, Phone, Flag, Shield, Lock, FileText,
    Share2, Pin, PinOff, Eye, RefreshCw, Layers, ArrowUpRight,
    Bookmark, Map as MapIcon, CheckCircle2, Sparkles, Truck,
    Briefcase, Navigation, Menu
} from 'lucide-react';
import ReportDocket from '../components/government/ReportDocket';
import ReportSelectionActions from '../components/government/ReportSelectionActions';
import { GovPageHeader } from '../components/government/GovWorkspace';
import ReportViewToggle from '../components/government/ReportViewToggle';
import ReportPriority from '../components/government/ReportPriority';
import { useGovernmentData } from '../utils/governmentApi';
import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import GovSidebar from '../components/GovSidebar';
import OrangeSelect from '../components/OrangeSelect';
import SearchInput from '../components/SearchInput';
import TablePagination from '../components/TablePagination';
import './gov-reports-header.css';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import { getCaloocanDistrict } from '../data/caloocanBoundaries';
import { API_BASE_URL } from '../utils/apiBase';
import { 
    getStatusDescriptor, 
    getReportPlainTitle, 
    CANONICAL_STATUS_LIST,
    buildReportWorkflowSteps
} from '../utils/reportWorkflow';

const DISPATCH_PRIORITY_OPTIONS = [
    {
        value: 'critical',
        label: 'Critical work priority',
        description: 'Priority does not grant emergency access'
    },
    {
        value: 'high',
        label: 'High (Urgent Infrastructure Repair)',
        description: 'Urgent engineering review'
    },
    {
        value: 'normal',
        label: 'Normal',
        description: 'Routine field assignment'
    },
    {
        value: 'low',
        label: 'Low (Routine Maintenance Sweep)',
        description: 'Scheduled Preventive Infrastructure Maintenance'
    }
];

export default function GovReportsDashboard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryReportId = searchParams.get('reportId');
    const queryReportIds = searchParams.get('ids');
    const queryAssetId = searchParams.get('asset_id');
    const querySearch = searchParams.get('search') || '';
    const overviewSelection = searchParams.get('overview');
    const overviewArea = searchParams.get('area');
    const overviewPriority = searchParams.get('priority');
    const overviewGrade = overviewPriority === 'unassessed' ? 'unassessed' : overviewPriority;
    const overviewLabel = overviewSelection === 'open' ? 'All open reports'
        : overviewSelection === 'unowned' ? 'Reports without review owner'
        : overviewSelection === 'triage' ? 'Reports pending triage or owner'
        : overviewSelection === 'urgent' ? 'Urgent reports (P4–P5)'
        : overviewSelection === 'unlocated' ? 'Open reports without recorded location'
        : overviewSelection === 'with_work' ? `Open ${overviewGrade ? `${overviewGrade} ` : ''}reports${overviewArea ? ` in ${overviewArea}` : ''} with current work orders`
        : overviewSelection === 'without_work' ? `Open ${overviewGrade ? `${overviewGrade} ` : ''}reports${overviewArea ? ` in ${overviewArea}` : ''} without current work orders`
        : overviewSelection === 'area' && overviewArea ? `Open reports in ${overviewArea}`
        : overviewSelection === 'priority' && overviewPriority ? `Open reports graded ${overviewPriority === 'unassessed' ? 'not assessed' : overviewPriority}` : null;


    // ── Narrow-layout navigation state ──
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    // ── Reports & Selection state (Hidden initially until clicked) ──
    const [reports, setReports] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reviewQueue, setReviewQueue] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const reviewOps = useGovernmentData(reports.length ? `/api/gov/report-review?ids=${reports.map(r => r.id).join(',')}` : null);
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    const [quickAction, setQuickAction] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState(null);
    const [reportLoadError, setReportLoadError] = useState('');

    // ── Filters & Search state ──
    const [searchQuery, setSearchQuery] = useState(querySearch);
    const [savedView, setSavedView] = useState('All reports');
    const [statusFilter, setStatusFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const [barangayFilter, setBarangayFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [districtFilter, setDistrictFilter] = useState('All Districts');

    // ── Pagination state ──
    const [pageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    const searchInputRef = useRef(null);
    const mobileNavRef = useRef(null);
    const mobileNavTriggerRef = useRef(null);
    const mainContentRef = useRef(null);

    // ── Current User Profile ──
    const [currentUser, setCurrentUser] = useState({
        name: 'Staff member',
        role: '',
        roleLabel: 'Staff',
        email: ''
    });

    // ── Read user from session ──
    useEffect(() => {
        try {
            const u = getAuthUser();
            if (u && (u.name || u.username || u.full_name)) {
                setCurrentUser({
                    id: u.id,
                    name: u.full_name || u.name || 'Staff member',
                    role: u.role || '',
                    roleLabel: (u.role || 'staff').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    email: u.email || ''
                });
            }
        } catch { /* fallback */ }
    }, []);

    // ── Deep-Link URL Parameter Listener (?reportId=...) ──
    useEffect(() => {
        if (!queryReportId || reports.length === 0) return;
        const target = reports.find(r => r.id?.toString() === queryReportId || r.ticket_id === queryReportId);
        if (target) {
            setSelectedReportId(target.id);
            setSelectedRowIds([target.id]);
        }
    }, [queryReportId, reports]);

    // ── Keyboard shortcut '/' to focus search ──
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === '/' && document.activeElement !== searchInputRef.current) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!isMobileNavOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const mainContent = mainContentRef.current;
        const navTrigger = mobileNavTriggerRef.current;
        mainContent?.setAttribute('inert', '');
        const focusTimer = window.setTimeout(() => {
            mobileNavRef.current?.querySelector('a, button')?.focus();
        }, 0);

        const handleMobileNavKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsMobileNavOpen(false);
                return;
            }

            if (event.key !== 'Tab' || !mobileNavRef.current) return;
            const focusable = [...mobileNavRef.current.querySelectorAll(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )];
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', handleMobileNavKeyDown);
        return () => {
            window.clearTimeout(focusTimer);
            window.removeEventListener('keydown', handleMobileNavKeyDown);
            document.body.style.overflow = previousOverflow;
            mainContent?.removeAttribute('inert');
            navTrigger?.focus();
        };
    }, [isMobileNavOpen]);

    // ── Live API Fetch & Real-time Database Synchronization ──
    const fetchLiveReports = useCallback(async () => {
        const token = getAuthToken();
        if (!token) {
            setReportLoadError('Staff session is unavailable. Sign in again to load reports.');
            return;
        }
        setIsSyncing(true);
        try {
            const scope = new URLSearchParams({ limit: '1000', t: String(Date.now()) });
            if (queryReportIds !== null) scope.set('ids', queryReportIds);
            if (queryAssetId !== null) scope.set('asset_id', queryAssetId);
            if (overviewSelection !== null) scope.set('overview', overviewSelection);
            if (overviewArea !== null) scope.set('area', overviewArea);
            if (overviewPriority !== null) scope.set('priority', overviewPriority);
            const res = await fetch(`${API_BASE_URL}/api/reports?${scope}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`Reports could not be loaded (HTTP ${res.status}). Retry to check the current queue.`);
            {
                const data = await res.json();
                if (!Array.isArray(data)) throw new Error('Report response was invalid. Retry to check the current queue.');
                {
                    const mapped = data.filter(r => Number.isInteger(r.id)).map((r) => {
                        const rawBrgy = (r.barangay || r.location_barangay || '').toString().trim();
                        const brgyDigits = rawBrgy.replace(/\D/g, '');
                        const barangay = brgyDigits ? `Barangay ${brgyDigits}` : (rawBrgy || 'Not recorded');

                        const lat = parseFloat(r.location_lat);
                        const lng = parseFloat(r.location_lng);
                        const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
                        const dist = hasCoordinates ? getCaloocanDistrict(lat, lng) : null;
                        const district = dist === 'south' ? 'South Caloocan' : dist === 'north' ? 'North Caloocan' : (r.district || 'Not recorded');

                        const rawUrg = (r.ai_urgency || '').toLowerCase();
                        const severity = rawUrg === 'critical' ? 'Critical' :
                                         rawUrg === 'high' ? 'High' :
                                         rawUrg === 'medium' || rawUrg === 'normal' ? 'Medium' :
                                         rawUrg === 'low' ? 'Low' : 'Not assessed';

                        const rawStatus = (r.status || '').toLowerCase().trim();
                        const status = ['verified', 'pending_approval'].includes(rawStatus) ? 'Verified' :
                                       rawStatus === 'approved_internal' ? 'Approved' :
                                       ['assigned', 'dispatched'].includes(rawStatus) ? 'Assigned' :
                                       rawStatus === 'in_progress' ? 'In Progress' :
                                       rawStatus === 'resolved' ? 'Resolved' : 
                                       rawStatus === 'rejected' ? 'Rejected' :
                                       rawStatus === 'cancelled' ? 'Cancelled' :
                                       rawStatus === 'needs_information' ? 'Needs information' :
                                       rawStatus === 'unverified' ? 'Unverified' :
                                       rawStatus === 'pending' ? 'Received' : (r.status || 'Status unavailable');

                        const hasReporterName = Boolean(r.reporter_name && r.reporter_name.trim() && !r.is_anonymous);

                        return {
                            id: r.id,
                            ticket_id: r.ticket_id || 'Ticket unavailable',
                            issue: getReportPlainTitle(r),
                            barangay,
                            district,
                            severity,
                            status,
                            raw_status: rawStatus,
                            updated: r.updated_at ? new Date(r.updated_at).toLocaleString() : 'Time unavailable',
                            updated_at: r.updated_at || null,
                            report_type: r.ai_category || r.category || 'General',
                            reporter: {
                                name: hasReporterName ? r.reporter_name.trim() : (r.is_anonymous ? 'Anonymous Citizen' : 'Citizen Reporter'),
                                is_private: Boolean(r.is_anonymous),
                                contact_method: r.reporter_contact || 'Contact unavailable'
                            },
                            location: {
                                address: r.location_string || 'Address not recorded',
                                lat: hasCoordinates ? lat : null,
                                lng: hasCoordinates ? lng : null,
                                landmark: r.landmark || null
                            },
                            evidence: r.image_url ? [
                                r.image_url.startsWith('http') ? r.image_url : `${API_BASE_URL}${r.image_url}`
                            ] : [],
                            steps: buildReportWorkflowSteps(rawStatus, {
                                received: r.created_at ? new Date(r.created_at).toLocaleString() : undefined,
                            }),
                            activity: []
                        };
                    });
                    setReports(mapped);
                    setReportLoadError('');
                    setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    
                    // If deep-linked report is in dataset, keep it selected
                    if (queryReportId) {
                        const target = mapped.find(m => m.id.toString() === queryReportId || m.ticket_id === queryReportId);
                        if (target) {
                            setSelectedReportId(target.id);
                            setSelectedRowIds([target.id]);
                            return;
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Live fetch failed:", err);
            setReportLoadError(err.message || 'Reports could not be loaded. Retry to check the current queue.');
        } finally {
            setIsSyncing(false);
        }
    }, [queryReportIds, queryAssetId, queryReportId, overviewSelection, overviewArea, overviewPriority]);

    useEffect(() => {
        fetchLiveReports();
        const interval = setInterval(fetchLiveReports, 30000);
        return () => clearInterval(interval);
    }, [fetchLiveReports]);

    useEffect(() => { setSearchQuery(querySearch); }, [querySearch]);
    useEffect(() => {
        setReviewQueue('all'); setPriorityFilter('all'); setStatusFilter('All');
        setSeverityFilter('All'); setBarangayFilter('All'); setDateFilter('All');
        setDistrictFilter('All Districts'); setSavedView('All reports'); setCurrentPage(1);
        setSelectedReportId(null); setSelectedRowIds([]);
    }, [overviewSelection, overviewArea, overviewPriority]);

    // Dynamic barangay list computed from active dataset
    const dynamicBarangayOptions = useMemo(() => {
        const set = new Set();
        reports.forEach(r => {
            if (r.barangay) set.add(r.barangay);
        });
        const sorted = Array.from(set).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });
        return [
            { value: 'All', label: 'Barangay: All' },
            ...sorted.map(b => {
                const num = parseInt(b.replace(/\D/g, ''), 10) || 0;
                const isNorth = num >= 165 && num <= 188;
                return {
                    value: b,
                    label: b,
                    group: isNorth ? 'North Caloocan (District 3)' : 'South Caloocan (Districts 1 & 2)',
                    description: isNorth ? 'District 3 · North Sector' : 'Districts 1 & 2 · South Sector'
                };
            })
        ];
    }, [reports]);

    // ── Filter computation ──
    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const operations = reviewOps.data?.[r.id];
            if (reviewOps.data && reviewQueue === 'mine' && operations?.review_owner_id !== currentUser?.id) return false;
            if (reviewOps.data && reviewQueue === 'unassigned' && ((operations?.review_owner_id && operations?.owner_available) || ['resolved','completed','rejected','cancelled','duplicate','spam'].includes(r.raw_status))) return false;
            if (reviewOps.data && priorityFilter !== 'all' && (operations?.priority_grade || 'unreviewed') !== priorityFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const cleanQ = q.replace(/^#/, '');
                const matchTicket = (r.ticket_id || '').toLowerCase().includes(q) || (r.ticket_id || '').toLowerCase().includes(cleanQ);
                const matchIssue = (r.issue || '').toLowerCase().includes(q);
                const matchBarangay = (r.barangay || '').toLowerCase().includes(q);
                if (!matchTicket && !matchIssue && !matchBarangay) return false;
            }
            if (statusFilter !== 'All') {
                const s1 = (r.status || '').toLowerCase().replace(/\s+/g, '_');
                const s2 = statusFilter.toLowerCase().replace(/\s+/g, '_');
                const isPendingOrReceived = ['received', 'pending', 'pending_review', 'unverified'].includes(s1) && ['received', 'pending', 'pending_review', 'unverified'].includes(s2);
                if (!isPendingOrReceived && s1 !== s2) return false;
            }
            if (severityFilter !== 'All') {
                if ((r.severity || '').toLowerCase() !== severityFilter.toLowerCase()) return false;
            }
            if (barangayFilter !== 'All') {
                const b1 = (r.barangay || '').toLowerCase().replace(/\s+/g, '');
                const b2 = barangayFilter.toLowerCase().replace(/\s+/g, '');
                if (b1 !== b2) return false;
            }
            if (districtFilter !== 'All Districts' && r.district !== districtFilter) return false;
            if (dateFilter !== 'All') {
                const updated = r.updated_at ? new Date(r.updated_at).getTime() : NaN;
                if (!Number.isFinite(updated)) return false;
                const now = Date.now();
                const startOfToday = new Date().setHours(0, 0, 0, 0);
                if (dateFilter === 'Today' && updated < startOfToday) return false;
                if (dateFilter === 'Past 24h' && updated < now - 24 * 60 * 60 * 1000) return false;
                if (dateFilter === 'Past 7 days' && updated < now - 7 * 24 * 60 * 60 * 1000) return false;
            }
            return true;
        });
    }, [reports, searchQuery, statusFilter, severityFilter, barangayFilter, districtFilter, dateFilter, reviewOps.data, reviewQueue, priorityFilter, currentUser?.id]);

    const pageCount = Math.max(1, Math.ceil(filteredReports.length / pageSize));
    const visibleReports = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    useEffect(() => {
        if (currentPage > pageCount) setCurrentPage(pageCount);
    }, [currentPage, pageCount]);

    // Currently selected report object (null when nothing is selected)
    const selectedReport = useMemo(() => {
        if (!selectedReportId) return null;
        return reports.find(r => r.id === selectedReportId) || null;
    }, [reports, selectedReportId]);

    // Check if any filter is active
    const hasLocalFilters = searchQuery || statusFilter !== 'All' || severityFilter !== 'All' || barangayFilter !== 'All' || dateFilter !== 'All' || districtFilter !== 'All Districts' || reviewQueue !== 'all' || priorityFilter !== 'all';
    const hasActiveFilters = hasLocalFilters || Boolean(overviewSelection);

    const clearAllFilters = () => {
        setReviewQueue('all'); setPriorityFilter('all');
        setSearchQuery('');
        setStatusFilter('All');
        setSeverityFilter('All');
        setBarangayFilter('All');
        setDateFilter('All');
        setDistrictFilter('All Districts');
        setSavedView('All reports');
        setSearchParams(current => { const next = new URLSearchParams(current); ['overview','area','ids','asset_id','source','search','status','priority','barangay','unlocated'].forEach(key => next.delete(key)); return next; });
    };

    const selectedInView=useMemo(()=>filteredReports.filter(report=>selectedRowIds.includes(report.id)),[filteredReports,selectedRowIds]);
    useEffect(()=>{setSelectedRowIds(current=>{const visible=new Set(filteredReports.map(report=>report.id));const next=current.filter(id=>visible.has(id));return next.length===current.length?current:next;});},[filteredReports]);
    const allSelected=filteredReports.length>0&&selectedInView.length===filteredReports.length;
    const selectAllRef=useRef(null);
    useEffect(()=>{if(selectAllRef.current)selectAllRef.current.indeterminate=selectedInView.length>0&&!allSelected;},[selectedInView.length,allSelected]);
    function reviewSelected(id,action=''){setSelectedReportId(id);setQuickAction(action?{id,action,key:Date.now()}:null);}
    function openReport(id){setQuickAction(null);setSelectedReportId(current=>current===id?null:id);}

    // ── Checkbox Selection Handlers ──
    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedRowIds([]);
        } else {
            setSelectedRowIds(filteredReports.map(r => r.id));
        }
    };

    const handleRowCheckbox = (e, id) => {
        e.stopPropagation();
        setSelectedRowIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const mapViewParams = new URLSearchParams(searchParams);
    if (selectedReport?.id) mapViewParams.set('reportId',selectedReport.id);
    if (hasLocalFilters) { mapViewParams.set('ids',filteredReports.map(r => r.id).join(',')); mapViewParams.set('source','Reports list selection'); mapViewParams.delete('search'); }
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6fa] dark:bg-[#070a12] text-slate-900 dark:text-slate-100 font-sans antialiased gov-reports-page">

            {isMobileNavOpen && (
                <div
                    className="fixed inset-0 z-50 lg:hidden"
                    id="gov-mobile-navigation"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Government navigation"
                >
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-slate-950/55"
                        onClick={() => setIsMobileNavOpen(false)}
                    />
                    <div ref={mobileNavRef} className="relative h-full w-60 max-w-[85vw] shadow-2xl">
                        <button
                            type="button"
                            aria-label="Close government navigation"
                            onClick={() => setIsMobileNavOpen(false)}
                            className="absolute right-2 top-2 z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                            <X size={20} />
                        </button>
                        <div className="absolute bottom-20 left-3 z-50">
                            <ThemeToggle size={16} />
                        </div>
                        <GovSidebar currentUser={currentUser} responsive={false} />
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                1. LEFT SIDEBAR (Dark Navy, Orange Active Accents, Collapsible)
            ══════════════════════════════════════════════════════════════════════ */}
            {/* ═══════════════════════════════════════════════════════════════════
                1. LEFT SIDEBAR (Shared GovSidebar: 7 Primary Items, PULSO Theme)
            ══════════════════════════════════════════════════════════════════════ */}
            <div className="hidden lg:block shrink-0">
                <GovSidebar currentUser={currentUser} responsive={false} />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                MAIN VIEWPORT (Top Bar + Filter Bar + Table + Right Detail Panel)
            ══════════════════════════════════════════════════════════════════════ */}
            <div ref={mainContentRef} className="flex-1 flex flex-col h-full overflow-hidden min-w-0">

                {/* ═════════════════════════════════════════════════════════════
                    2. TWO-TIER ADMIN HEADER
                    Tier 1: Global App Bar (Search, Notifications, Theme, User)
                    Tier 2: Page Header (Breadcrumb, Title, Subtitle, Actions)
                ══════════════════════════════════════════════════════════════ */}
                <div className="shrink-0 gov-reports-shared-header">
                    <GovPageHeader title="Reports" description="Review, verify and assign incoming reports." user={currentUser} navigation={<button ref={mobileNavTriggerRef} type="button" className="gov-button gov-menu-trigger" aria-label="Open government navigation" aria-expanded={isMobileNavOpen} aria-controls="gov-mobile-navigation" onClick={()=>setIsMobileNavOpen(true)}><Menu size={20}/></button>}/>

                    {/* ── TIER 2: SEARCH & PAGE ACTIONS TOOLBAR ── */}
                    <div className="gov-page-actions">
                        {/* Left: Global Search Bar */}
                        <div className="gov-tier1-search relative w-full md:w-auto">
                            <SearchInput
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search ticket, citizen or category"
                                ariaLabel="Search ticket, citizen or category"
                                onClear={() => setSearchQuery('')}
                                className="w-full sm:w-[320px] md:w-[360px]"
                            />
                        </div>

                        {/* Right: Page Actions (Map/Table Toggle, All Districts, Sync) */}
                        <div className="gov-tier2-actions flex flex-wrap items-center gap-2 sm:gap-2.5">
                            {/* Segmented View Switcher: Map View ↔ Table View */}
                            <ReportViewToggle mode="table" tableTo={`/gov/reports?${searchParams}`} mapTo={`/gov/map?${mapViewParams}`} />

                            {/* District Filter Dropdown */}
                            <div className="relative" title={`District Filter: ${districtFilter}`}>
                                <OrangeSelect
                                    value={districtFilter}
                                    onChange={setDistrictFilter}
                                    size="sm"
                                    minWidth="125px"
                                    icon={MapPin}
                                    searchable={false}
                                    placeholder="All Districts"
                                    options={[
                                        { value: 'All Districts', label: 'All Districts' },
                                        { value: 'North Caloocan', label: 'North Caloocan' },
                                        { value: 'South Caloocan', label: 'South Caloocan' }
                                    ]}
                                />
                            </div>

                            {/* On-demand Live Sync Button */}
                            <button
                                type="button"
                                onClick={fetchLiveReports}
                                disabled={isSyncing}
                                className="gov-control flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/40 transition-all cursor-pointer disabled:opacity-50 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                title={lastSynced ? `Last synced at ${lastSynced}` : "Sync with live citizen database"}
                                aria-label={isSyncing ? "Syncing live reports" : "Sync live citizen database"}
                            >
                                <RefreshCw size={13} className={isSyncing ? "animate-spin text-[#ff6b00]" : "text-slate-400"} />
                                <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    3. FILTER BAR
                ────────────────────────────────────────────────────────────── */}
                <div className="min-h-14 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center text-xs font-medium relative z-30 overflow-visible">
                    <div className="flex flex-wrap items-center gap-2.5 py-2 overflow-visible">
                        {(queryReportIds !== null || queryAssetId !== null || overviewSelection !== null) && <span className="inline-flex items-center gap-2 text-xs">Source: {overviewLabel || searchParams.get('source') || 'Linked records'}<button className="underline min-h-9" onClick={clearAllFilters}>Show all reports</button>{overviewSelection !== null && <Link className="underline min-h-9 inline-flex items-center" to="/gov/overview">Back to overview</Link>}</span>}
                        <OrangeSelect value={reviewQueue} onChange={setReviewQueue} size="sm" minWidth="140px" searchable={false} options={[{value:'all',label:'All review queues'},{value:'mine',label:'My review queue'},{value:'unassigned',label:'Needs routing'}]} />
                        <OrangeSelect value={priorityFilter} onChange={setPriorityFilter} size="sm" minWidth="140px" searchable={false} options={[{value:'all',label:'Severity: All'},{value:'unreviewed',label:'Not graded'},...['P5','P4','P3','P2','P1','P0'].map(value => ({value,label:value}))]} />
                        {reviewOps.error && <p role="alert">Review ownership unavailable. <button type="button" onClick={reviewOps.reload}>Retry</button></p>}
                        {/* Saved View */}
                        <OrangeSelect
                            value={savedView}
                            onChange={(val) => {
                                setSavedView(val);
                                if (val === 'All reports') {
                                    setStatusFilter('All');
                                    setSeverityFilter('All');
                                    setBarangayFilter('All');
                                } else if (val === 'Critical only') {
                                    setSeverityFilter('Critical');
                                } else if (val === 'Verified only') {
                                    setStatusFilter('Verified');
                                }
                            }}
                            size="sm"
                            minWidth="140px"
                            icon={Bookmark}
                            searchable={false}
                            placeholder="Saved view"
                            options={[
                                { value: 'All reports', label: 'View: All reports' },
                                { value: 'Critical only', label: 'Critical only' },
                                { value: 'Verified only', label: 'Verified only' }
                            ]}
                        />

                        {/* Status Filter */}
                        <OrangeSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            size="sm"
                            minWidth="125px"
                            searchable={false}
                            placeholder="Status: All"
                            options={[
                                { value: 'All', label: 'Status: All' },
                                { value: 'Verified', label: 'Verified' },
                                { value: 'Assigned', label: 'Assigned' },
                                { value: 'In progress', label: 'In progress' },
                                { value: 'Received', label: 'Received' },
                                { value: 'Resolved', label: 'Resolved' }
                            ]}
                        />

                        {/* Severity Filter */}
                        <OrangeSelect
                            value={severityFilter}
                            onChange={setSeverityFilter}
                            size="sm"
                            minWidth="125px"
                            searchable={false}
                            placeholder="Severity: All"
                            options={[
                                { value: 'All', label: 'Urgency: All' },
                                { value: 'Critical', label: 'Critical' },
                                { value: 'High', label: 'High' },
                                { value: 'Medium', label: 'Medium' }
                            ]}
                        />

                        {/* Barangay Filter */}
                        <OrangeSelect
                            value={barangayFilter}
                            onChange={setBarangayFilter}
                            size="sm"
                            minWidth="135px"
                            searchable={true}
                            placeholder="Barangay: All"
                            options={dynamicBarangayOptions}
                        />

                        {/* Date Filter */}
                        <OrangeSelect
                            value={dateFilter}
                            onChange={setDateFilter}
                            size="sm"
                            minWidth="115px"
                            searchable={false}
                            placeholder="Date: All"
                            options={[
                                { value: 'All', label: 'Date: All' },
                                { value: 'Today', label: 'Today' },
                                { value: 'Past 24h', label: 'Past 24h' },
                                { value: 'Past 7 days', label: 'Past 7 days' }
                            ]}
                        />

                        {/* Clear filters action */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="text-xs font-bold text-[#ff6b00] hover:text-[#e65c00] hover:underline px-2 transition-colors cursor-pointer"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    4. CONTENT WORKSPACE: REPORTS TABLE (LEFT) + DETAIL PANEL (RIGHT)
                ────────────────────────────────────────────────────────────── */}
                <div className="px-3 sm:px-4 lg:px-6">
                    <div className="sr-only" role="status" aria-live="polite">{isSyncing && !lastSynced ? 'Loading reports' : reportLoadError || ''}</div>
                    {reportLoadError && (
                        <div role="alert" className="w-full rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
                            <p>{reportLoadError}</p>
                            {lastSynced && <p className="mt-1">Showing the last loaded queue from {lastSynced}. It may be stale.</p>}
                            <button type="button" onClick={fetchLiveReports} className="mt-2 rounded-lg border border-current px-3 py-2 font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600">Retry loading reports</button>
                        </div>
                    )}
                    {!reportLoadError && !isSyncing && reports.length === 0 && (
                        <div role="status" className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">No reports are in this queue.</div>
                    )}
                    {overviewSelection !== null && reports.length === 1000 && <p role="status" className="my-2 text-xs text-[var(--gov-text-secondary)]">This queue shows the latest 1,000 matching reports. The overview may include older records beyond this list.</p>}
                    {!reportLoadError && isSyncing && !lastSynced && (
                        <div role="status" className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Loading reports…</div>
                    )}
                </div>
                <ReportSelectionActions key={selectedInView.map(report=>`${report.id}:${report.updated_at}:${report.raw_status}`).join('|')} reports={filteredReports} selectedIds={selectedRowIds} activeId={selectedReportId} onReview={reviewSelected} onClear={()=>setSelectedRowIds([])}/>
                <div className={`gov-reports-queue-layout flex-1 min-h-0 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden p-3 sm:p-4 lg:p-6 gap-0 ${selectedReport ? 'has-selection' : ''}`}>

                    <div
                        className="gov-surface reports-narrow-queue lg:hidden flex flex-col shrink-0 gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-[#090e1a] mb-3"
                        aria-label="Citizen reports"
                    >
                        {visibleReports.map((report) => {
                            const isSelected = selectedReport?.id === report.id;
                            return (
                                <div key={report.id} className="report-mobile-selection">
                                    <input type="checkbox" className="report-select-checkbox" aria-label={`Select ${report.ticket_id}`} checked={selectedRowIds.includes(report.id)} onChange={event=>handleRowCheckbox(event,report.id)}/>
                                <button
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => openReport(report.id)}
                                    className={`gov-report-choice min-h-14 flex-1 min-w-0 rounded-lg border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2563EB] ${
                                        isSelected
                                            ? 'border-[#ff6b00] bg-[#ff6b00]/10 text-[#ff6b00] dark:border-[#ff6b00] dark:bg-[#ff6b00]/15 dark:text-[#ff6b00]'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                                    }`}
                                >
                                    <span className="block font-mono-data text-[11px] font-bold">{report.ticket_id}</span>
                                    <span className="mt-0.5 block whitespace-normal text-xs font-semibold">{report.issue}</span><span className="mt-1 block text-[11px]">{report.barangay} · {getStatusDescriptor(report.status).label}</span>
                                </button>
                                </div>
                            );
                        })}
                        {filteredReports.length > 0 && <TablePagination page={currentPage} pageSize={pageSize} total={filteredReports.length} itemLabel="reports" onPageChange={setCurrentPage}/>}
                    </div>

                    {/* ── LEFT: REPORTS TABLE ────────────────────────────────── */}
                    <div className="gov-surface gov-reports-table-surface hidden lg:flex flex-1 flex-col bg-white dark:bg-[#090e1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden min-w-0">

                        {/* Table Header & Rows Container */}
                        <div className="flex-1 overflow-auto custom-scrollbar" role="region" aria-label="Reports table" tabIndex={0}>
                            <table className={`reports-review-table w-full text-left border-collapse ${selectedReport?'has-detail':''}`}>
                                <caption className="sr-only">Reported concerns in the current scope and filters</caption>
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 z-10 backdrop-blur-xs">
                                        <th scope="col" className="py-3.5 pl-5 pr-3 w-10">
                                            <input ref={selectAllRef} type="checkbox" className="report-select-checkbox" aria-label="Select all filtered reports" checked={allSelected} onChange={handleSelectAll} onClick={event=>event.stopPropagation()}/>

                                        </th>
                                        <th scope="col" className="py-3.5 px-3">Ticket</th>
                                        <th scope="col" className="py-3.5 px-3">Issue</th>
                                        <th scope="col" className="py-3.5 px-3">Barangay</th>
                                        <th scope="col" className="py-3.5 px-3">Severity grade</th><th scope="col" className="py-3.5 px-3">Review owner</th><th scope="col" className="py-3.5 px-3">AI urgency</th>
                                        <th scope="col" className="py-3.5 px-3">Status</th>
                                        <th scope="col" className="py-3.5 px-3 pr-5 text-right">Updated</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                    {!reportLoadError && !isSyncing && reports.length > 0 && filteredReports.length === 0 && (
                                        <tr><td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-600 dark:text-slate-300">No reports match these filters. Clear filters to return to the full queue.</td></tr>
                                    )}
                                    {visibleReports.map((report) => {
                                        const isSelected = selectedReport?.id === report.id;
                                        const isChecked = selectedRowIds.includes(report.id);

                                        return (
                                            <tr
                                                key={report.id}
                                                onClick={event=>{
                                                    if(event.target.closest('button,a,input,select,textarea')||window.getSelection()?.toString())return;
                                                    event.currentTarget.querySelector('.gov-record-link')?.focus({preventScroll:true});
                                                    openReport(report.id);
                                                }}
                                                className={`transition-colors cursor-pointer group focus:outline-none ${
                                                    isSelected
                                                        ? 'gov-report-selected'
                                                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                                                }`}
                                            >
                                                {/* Checkbox */}
                                                <td className="py-4 pl-5 pr-3">
                                                    <input type="checkbox" className="report-select-checkbox" aria-label={`Select ${report.ticket_id}`} checked={isChecked} onChange={event=>handleRowCheckbox(event,report.id)} onClick={event=>event.stopPropagation()}/>

                                                </td>

                                                {/* Ticket ID */}
                                                <td className="py-4 px-3 font-mono-data font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                    <button type="button" className="gov-record-link" aria-expanded={isSelected} onClick={()=>openReport(report.id)}>{report.ticket_id}</button>
                                                </td>

                                                {/* Issue */}
                                                <td className="py-4 px-3 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                                                    {report.issue}
                                                </td>

                                                {/* Barangay */}
                                                <td className="py-4 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                    {report.barangay}
                                                </td>

                                                <td className="py-4 px-3">{reviewOps.error ? 'Unavailable' : reviewOps.loading ? 'Loading…' : <ReportPriority compact grade={reviewOps.data?.[report.id]?.priority_grade} />}</td>
                                                <td className="py-4 px-3 text-slate-600 dark:text-slate-300">{reviewOps.error ? 'Unavailable' : reviewOps.loading ? 'Loading…' : reviewOps.data?.[report.id]?.review_owner_name || (['resolved','completed','rejected','cancelled'].includes(report.raw_status) ? 'Not recorded' : 'Needs routing')}</td>
                                                {/* AI urgency */}
                                                <td className="py-4 px-3 whitespace-nowrap">
                                                    {report.severity === 'Critical' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60">
                                                            <AlertTriangle size={12} className="shrink-0" />
                                                            <span>Critical</span>
                                                        </span>
                                                    )}
                                                    {report.severity === 'High' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] border border-orange-200 dark:border-orange-800/60">
                                                            <AlertTriangle size={12} className="shrink-0" />
                                                            <span>High</span>
                                                        </span>
                                                    )}
                                                    {report.severity === 'Medium' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                            <span>Medium</span>
                                                        </span>
                                                    )}
                                                    {['Low','Not assessed'].includes(report.severity)&&<span className="text-slate-500 dark:text-slate-400">{report.severity}</span>}
                                                </td>

                                                {/* Status Badge (PULSO Canonical Tokens) */}
                                                <td className="py-4 px-3 whitespace-nowrap">
                                                    {(() => {
                                                        const desc = getStatusDescriptor(report.status);
                                                        const StatusIcon = desc.icon;
                                                        return (
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${desc.badgeClass}`}>
                                                                <StatusIcon size={12} className="shrink-0" />
                                                                <span>{desc.label}</span>
                                                            </span>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Relative Timestamp */}
                                                <td className="py-4 px-3 pr-5 text-right font-mono-data text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                    {report.updated}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {filteredReports.length > 0 && (
                            <TablePagination
                                page={currentPage}
                                pageSize={pageSize}
                                total={filteredReports.length}
                                itemLabel="reports"
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>

                    {/* ── RIGHT: DETAIL PANEL (Simultaneous Aperture Reveal) ───────────────────── */}
                    {selectedReport && <div className="reports-table-docket"><ReportDocket key={`${selectedReport.id}-${quickAction?.id===selectedReport.id?quickAction.key:0}`} initialAction={quickAction?.id===selectedReport.id?quickAction.action:''} selected={selectedReport} onClose={() => setSelectedReportId(null)} onChanged={() => { fetchLiveReports(); reviewOps.reload(); }} /></div>}

                </div>
            </div>


        </div>
    );
}
