import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import GovSidebar from '../components/GovSidebar';
import OrangeSelect from '../components/OrangeSelect';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovUserDropdown from '../components/GovUserDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import SearchInput from '../components/SearchInput';
import './gov-reports-header.css';
import Swal from 'sweetalert2';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import { getCaloocanDistrict } from '../data/caloocanBoundaries';
import { 
    getStatusDescriptor, 
    getReportPlainTitle, 
    getUrgencyDescriptor, 
    CANONICAL_STATUS_LIST,
    formatTicketId,
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
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryReportId = searchParams.get('reportId');

    const apiHost = window.location.hostname;
    const API_BASE_URL = `http://${apiHost}:33159`;

    // ── Narrow-layout navigation state ──
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1280 : false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1280);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Reports & Selection state (Hidden initially until clicked) ──
    const [reports, setReports] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    const [isPinned, setIsPinned] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState(null);
    const [reportLoadError, setReportLoadError] = useState('');

    // ── Filters & Search state ──
    const [searchQuery, setSearchQuery] = useState('');
    const [savedView, setSavedView] = useState('All reports');
    const [statusFilter, setStatusFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const [barangayFilter, setBarangayFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [districtFilter, setDistrictFilter] = useState('All Districts');

    // ── Pagination state ──
    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    // ── Modals & Action States ──
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    
    // ── Unified Work Order Dispatch Modal State ──
    const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
    const [workOrderForm, setWorkOrderForm] = useState({
        title: '',
        description: '',
        priority: 'high',
        assigned_to_id: ''
    });
    const [isSubmittingWo, setIsSubmittingWo] = useState(false);
    const [eligibleAssignees, setEligibleAssignees] = useState([]);
    const [assigneeError, setAssigneeError] = useState('');
    useEffect(() => {
        if (!isWorkOrderModalOpen) return;
        const controller = new AbortController();
        setEligibleAssignees([]);
        setAssigneeError('');
        fetch(`${API_BASE_URL}/api/gov/dispatch/eligible-assignees`, {
            headers: { Authorization: `Bearer ${getAuthToken()}` }, signal: controller.signal,
        }).then(async (response) => {
            if (!response.ok) throw new Error(`Eligible staff unavailable (HTTP ${response.status})`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Eligible staff response is invalid');
            setEligibleAssignees(data);
        }).catch((cause) => { if (cause.name !== 'AbortError') setAssigneeError(cause.message); });
        return () => controller.abort();
    }, [isWorkOrderModalOpen]);

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
        mainContentRef.current?.setAttribute('inert', '');
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
            mainContentRef.current?.removeAttribute('inert');
            mobileNavTriggerRef.current?.focus();
        };
    }, [isMobileNavOpen]);

    // ── Live API Fetch & Real-time Database Synchronization ──
    const fetchLiveReports = async () => {
        const token = getAuthToken();
        if (!token) {
            setReportLoadError('Staff session is unavailable. Sign in again to load reports.');
            return;
        }
        setIsSyncing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports?limit=100&t=${Date.now()}`, {
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

                        const rawUrg = (r.urgency || r.ai_urgency || '').toLowerCase();
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
    };

    useEffect(() => {
        fetchLiveReports();
        const interval = setInterval(fetchLiveReports, 30000);
        return () => clearInterval(interval);
    }, []);

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
    }, [reports, searchQuery, statusFilter, severityFilter, barangayFilter, districtFilter, dateFilter]);

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
    const hasActiveFilters = searchQuery || statusFilter !== 'All' || severityFilter !== 'All' || barangayFilter !== 'All' || dateFilter !== 'All' || districtFilter !== 'All Districts';

    const clearAllFilters = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setSeverityFilter('All');
        setBarangayFilter('All');
        setDateFilter('All');
        setDistrictFilter('All Districts');
        setSavedView('All reports');
    };

    // ── Checkbox Selection Handlers ──
    const handleSelectAll = () => {
        if (selectedRowIds.length === filteredReports.length && filteredReports.length > 0) {
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

    // ── Copy Coordinates Toast ──
    const handleCopyCoordinates = (lat, lng) => {
        navigator.clipboard.writeText(`${lat}, ${lng}`);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Coordinates copied to clipboard',
            showConfirmButton: false,
            timer: 2000
        });
    };

    // ── Unified Work Order Dispatch Handlers (Synced with /api/work-orders) ──
    const handleOpenWorkOrderModal = () => {
        if (!selectedReport) return;
        setWorkOrderForm({
            title: `Repair ${selectedReport.issue || selectedReport.report_type || 'Infrastructure Issue'}`,
            description: '',
            priority: selectedReport.severity === 'Critical' ? 'critical' : selectedReport.severity === 'High' ? 'high' : 'normal',
            assigned_to_id: ''
        });
        setIsWorkOrderModalOpen(true);
    };

    const handleExecuteWorkOrder = async (e) => {
        if (e) e.preventDefault();
        if (!selectedReport) return;
        if (!workOrderForm.assigned_to_id || !workOrderForm.description.trim()) {
            Swal.fire({ icon: 'error', title: 'Assignment incomplete', text: 'Choose an eligible official and enter field instructions.' });
            return;
        }
        setIsSubmittingWo(true);
        const token = getAuthToken();
        try {
            const payload = {
                title: workOrderForm.title || `Repair ${selectedReport.issue || 'Infrastructure Issue'}`,
                description: workOrderForm.description,
                wo_type: 'standard',
                priority: workOrderForm.priority,
                assigned_to_id: parseInt(workOrderForm.assigned_to_id, 10),
                report_id: selectedReport.id
            };

            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const newWo = await res.json();
                setIsWorkOrderModalOpen(false);

                Swal.fire({
                    icon: 'success',
                    title: 'Work Order Dispatched!',
                    text: `Work order ${newWo.wo_number || ''} was assigned to the selected field official.`,
                    confirmButtonColor: '#ff6b00'
                });
                fetchLiveReports();
            } else {
                const err = await res.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Dispatch Failed',
                    text: err.detail || 'Could not create work order on the server.',
                    confirmButtonColor: '#ff6b00'
                });
            }
        } catch (err) {
            console.error("Failed to dispatch work order:", err);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Backend server is unreachable.',
                confirmButtonColor: '#ff6b00'
            });
        } finally {
            setIsSubmittingWo(false);
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6fa] dark:bg-[#070a12] text-slate-900 dark:text-slate-100 font-sans antialiased select-none">

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
                        <GovSidebar currentUser={currentUser} />
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
                <GovSidebar currentUser={currentUser} />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                MAIN VIEWPORT (Top Bar + Filter Bar + Table + Right Detail Panel)
            ══════════════════════════════════════════════════════════════════════ */}
            <div ref={mainContentRef} className="flex-1 flex flex-col h-full overflow-hidden">

                {/* ═════════════════════════════════════════════════════════════
                    2. TWO-TIER ADMIN HEADER
                    Tier 1: Global App Bar (Search, Notifications, Theme, User)
                    Tier 2: Page Header (Breadcrumb, Title, Subtitle, Actions)
                ══════════════════════════════════════════════════════════════ */}
                <header className="sticky top-0 z-50 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800/80 shadow-xs gov-admin-header-container">
                    {/* ── TIER 1: PAGE IDENTITY & GLOBAL TOOLS ── */}
                    <div className="gov-tier1-bar py-2.5 sm:py-3 px-3 sm:px-4 lg:px-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 relative z-20">
                        {/* Left: Mobile Nav Hamburger + Breadcrumbs + Title + Plain Subtitle */}
                        <div className="gov-tier2-title-block min-w-0 flex-1 flex items-start gap-2.5 sm:gap-3">
                            <button
                                ref={mobileNavTriggerRef}
                                type="button"
                                className="lg:hidden mt-0.5 inline-flex h-10 w-10 min-w-[40px] min-h-[40px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                                aria-label="Open government navigation"
                                aria-expanded={isMobileNavOpen}
                                aria-controls="gov-mobile-navigation"
                                onClick={() => setIsMobileNavOpen(true)}
                            >
                                <Menu size={18} />
                            </button>
                            <div className="min-w-0 flex-1">
                                <GovBreadcrumb
                                    category="Citizen Services"
                                    categoryLink="/gov/reports"
                                    current="Citizen Reports"
                                />
                                <div className="flex items-center gap-2 mt-0.5">
                                    <h1 className="gov-tier2-title font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap">
                                        Citizen reports
                                    </h1>
                                </div>
                                <p className="gov-tier2-subtitle text-xs mt-0.5 line-clamp-2 max-w-xl font-normal leading-relaxed">
                                    Review, verify and assign incoming reports.
                                </p>
                            </div>
                        </div>

                        {/* Right: Global Tools Cluster (Notifications, Theme, User Profile) */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {/* Notification Bell with solid background badge */}
                            <GovNotificationDropdown />

                            {/* Theme Toggle: single icon on narrow, 3-option pill on xl+ */}
                            <ThemeToggle responsiveBreakpoint="xl" />

                            {/* User Avatar + Role Dropdown */}
                            <GovUserDropdown currentUser={currentUser} />
                        </div>
                    </div>

                    {/* ── TIER 2: SEARCH & PAGE ACTIONS TOOLBAR ── */}
                    <div className="gov-tier2-header py-2 sm:py-2.5 px-3 sm:px-4 lg:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
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
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const param = selectedReport?.id ? `?reportId=${selectedReport.id}` : '';
                                        navigate(`/dispatcher${param}`);
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                    title="Switch to Tactical GIS Map View (Field Dispatch & Routing)"
                                    aria-label="Switch to Tactical GIS Map View"
                                >
                                    <MapIcon size={14} />
                                    <span className="hidden sm:inline">Map View</span>
                                </button>
                                <div
                                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs border border-slate-200/60 dark:border-slate-600"
                                    aria-current="page"
                                    title="Table View (Current)"
                                >
                                    <FileText size={14} />
                                    <span className="hidden sm:inline">Table View</span>
                                </div>
                            </div>

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
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/40 transition-all cursor-pointer disabled:opacity-50 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                title={lastSynced ? `Last synced at ${lastSynced}` : "Sync with live citizen database"}
                                aria-label={isSyncing ? "Syncing live reports" : "Sync live citizen database"}
                            >
                                <RefreshCw size={13} className={isSyncing ? "animate-spin text-[#ff6b00]" : "text-slate-400"} />
                                <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync"}</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* ─────────────────────────────────────────────────────────────
                    3. FILTER BAR
                ────────────────────────────────────────────────────────────── */}
                <div className="min-h-14 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center text-xs font-medium relative z-30 overflow-visible">
                    <div className="flex flex-wrap items-center gap-2.5 py-2 overflow-visible">
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
                                { value: 'All', label: 'Severity: All' },
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
                    {!reportLoadError && isSyncing && !lastSynced && (
                        <div role="status" className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Loading reports…</div>
                    )}
                </div>
                <div className="flex-1 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden p-3 sm:p-4 lg:p-6 gap-0">

                    <div
                        className="xl:hidden flex shrink-0 gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-[#090e1a] custom-scrollbar mb-3"
                        role="listbox"
                        aria-label="Citizen reports"
                    >
                        {visibleReports.map((report) => {
                            const isSelected = selectedReport?.id === report.id;
                            return (
                                <button
                                    key={report.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => setSelectedReportId(prev => prev === report.id ? null : report.id)}
                                    className={`min-h-14 min-w-44 rounded-lg border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2563EB] ${
                                        isSelected
                                            ? 'border-[#ff6b00] bg-[#ff6b00]/10 text-[#ff6b00] dark:border-[#ff6b00] dark:bg-[#ff6b00]/15 dark:text-[#ff6b00]'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                                    }`}
                                >
                                    <span className="block font-mono-data text-[11px] font-bold">{report.ticket_id}</span>
                                    <span className="mt-0.5 block truncate text-xs font-semibold">{report.issue}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ── LEFT: REPORTS TABLE ────────────────────────────────── */}
                    <div className="hidden xl:flex flex-1 flex-col bg-white dark:bg-[#090e1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden min-w-0">

                        {/* Table Header & Rows Container */}
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 z-10 backdrop-blur-xs">
                                        <th className="py-3.5 pl-5 pr-3 w-10">
                                            <button
                                                type="button"
                                                role="checkbox"
                                                aria-checked={selectedRowIds.length === filteredReports.length && filteredReports.length > 0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectAll();
                                                }}
                                                className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                                                    selectedRowIds.length === filteredReports.length && filteredReports.length > 0
                                                        ? 'bg-[#ff6b00] border-[#ff6b00] text-white shadow-xs'
                                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#ff6b00]'
                                                }`}
                                                title="Select all"
                                            >
                                                {selectedRowIds.length === filteredReports.length && filteredReports.length > 0 && (
                                                    <Check size={10} strokeWidth={3.5} className="text-white" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="py-3.5 px-3">Ticket ↑</th>
                                        <th className="py-3.5 px-3">Issue</th>
                                        <th className="py-3.5 px-3">Barangay</th>
                                        <th className="py-3.5 px-3">Severity</th>
                                        <th className="py-3.5 px-3">Status</th>
                                        <th className="py-3.5 px-3 pr-5 text-right">Updated ↑</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                    {!reportLoadError && !isSyncing && reports.length > 0 && filteredReports.length === 0 && (
                                        <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-600 dark:text-slate-300">No reports match these filters. Clear filters to return to the full queue.</td></tr>
                                    )}
                                    {visibleReports.map((report) => {
                                        const isSelected = selectedReport?.id === report.id;
                                        const isChecked = selectedRowIds.includes(report.id);

                                        return (
                                            <tr
                                                key={report.id}
                                                onClick={() => setSelectedReportId(prev => prev === report.id ? null : report.id)}
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedReportId(prev => prev === report.id ? null : report.id);
                                                    }
                                                }}
                                                className={`transition-colors cursor-pointer group focus:outline-none ${
                                                    isSelected
                                                        ? 'bg-orange-50/70 dark:bg-orange-950/25 border-l-4 border-l-[#ff6b00]'
                                                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                                                }`}
                                            >
                                                {/* Checkbox */}
                                                <td className="py-4 pl-5 pr-3">
                                                    <button
                                                        type="button"
                                                        role="checkbox"
                                                        aria-checked={isChecked}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRowCheckbox(e, report.id);
                                                        }}
                                                        className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                                                            isChecked
                                                                ? 'bg-[#ff6b00] border-[#ff6b00] text-white shadow-xs'
                                                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#ff6b00]'
                                                        }`}
                                                        title={isChecked ? "Deselect row" : "Select row"}
                                                    >
                                                        {isChecked && (
                                                            <Check size={10} strokeWidth={3.5} className="text-white" />
                                                        )}
                                                    </button>
                                                </td>

                                                {/* Ticket ID */}
                                                <td className="py-4 px-3 font-mono-data font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                    {report.ticket_id}
                                                </td>

                                                {/* Issue */}
                                                <td className="py-4 px-3 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                                                    {report.issue}
                                                </td>

                                                {/* Barangay */}
                                                <td className="py-4 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                    {report.barangay}
                                                </td>

                                                {/* Severity Badge */}
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
                        <div className="h-14 shrink-0 border-t border-slate-200 dark:border-slate-800 px-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <div>
                                Showing {filteredReports.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredReports.length)} of {filteredReports.length} reports
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Page Buttons (Circular shape) */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all text-slate-500 dark:text-slate-400"
                                        title="Previous page"
                                    >
                                        <ChevronLeft size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        className="w-7 h-7 flex items-center justify-center font-bold text-xs bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] border border-[#ff6b00] rounded-full shadow-xs cursor-pointer"
                                    >
                                        {currentPage}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                                        disabled={currentPage >= pageCount}
                                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all text-slate-500 dark:text-slate-400"
                                        title="Next page"
                                    >
                                        <ChevronRight size={15} />
                                    </button>
                                </div>

                                {/* Page Size Selector */}
                                <OrangeSelect
                                    value={pageSize}
                                    onChange={(val) => {
                                        setPageSize(Number(val));
                                        setCurrentPage(1);
                                    }}
                                    size="sm"
                                    minWidth="105px"
                                    searchable={false}
                                    dropUp={true}
                                    align="right"
                                    options={[
                                        { value: 10, label: '10 / page' },
                                        { value: 20, label: '20 / page' },
                                        { value: 50, label: '50 / page' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: DETAIL PANEL (Simultaneous Aperture Reveal) ───────────────────── */}
                    <AnimatePresence initial={false}>
                        {selectedReport && (
                            <motion.aside
                                key="report-detail-rail"
                                initial={!isMobile ? { width: 0, opacity: 0, marginLeft: 0 } : { opacity: 0, y: 16 }}
                                animate={!isMobile ? { width: 440, opacity: 1, marginLeft: 24 } : { opacity: 1, y: 0 }}
                                exit={!isMobile ? { width: 0, opacity: 0, marginLeft: 0 } : { opacity: 0, y: 16 }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="w-full xl:w-[440px] shrink-0 overflow-hidden flex flex-col mt-3 xl:mt-0"
                                style={{ flexShrink: 0 }}
                            >
                                <div className="w-full xl:w-[440px] xl:min-w-[440px] h-full min-h-[620px] xl:min-h-0 shrink-0 bg-white dark:bg-[#090e1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">

                                    {/* Detail Panel Header */}
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <h2 className="font-heading font-black text-sm text-slate-900 dark:text-white truncate">
                                                {selectedReport.ticket_id}
                                            </h2>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                                {selectedReport.issue}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setIsPinned(!isPinned)}
                                                title={isPinned ? 'Unpin panel' : 'Pin panel'}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                            >
                                                {isPinned ? <Pin className="text-[#ff6b00]" size={15} /> : <Pin size={15} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedReportId(null)}
                                                title="Close details panel"
                                                aria-label="Close details panel"
                                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Instant inner transition when switching reports */}
                                    <motion.div
                                        key={selectedReport.id}
                                        initial={{ opacity: 0.6 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.1 }}
                                        className="flex-1 flex flex-col overflow-hidden min-h-0"
                                    >
                                        {/* Detail Panel Body */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">

                                {/* Evidence Photo & Reporter Meta */}
                                <div className="grid grid-cols-2 gap-4 items-start">
                                    {/* Evidence Thumbnail */}
                                    <div>
                                        <div className="text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                            Evidence
                                        </div>
                                        {selectedReport.evidence.length ? (
                                            <button type="button" onClick={() => setSelectedPhoto(selectedReport.evidence[0])}
                                                className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600">
                                                <img src={selectedReport.evidence[0]} alt={`Evidence submitted for ${selectedReport.ticket_id}`} className="w-full h-full object-cover" />
                                            </button>
                                        ) : <p className="text-xs text-slate-600 dark:text-slate-300">No evidence image is attached to this report.</p>}
                                    </div>

                                    {/* Reporter (Privacy Protected) & Type */}
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                                Reporter (private)
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                <Users size={14} className="text-slate-400 shrink-0" />
                                                <span>{selectedReport.reporter.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1.5">
                                                <Phone size={12} className="text-[#ff6b00] shrink-0" />
                                                <span>{selectedReport.reporter.contact_method}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                                Report type
                                            </div>
                                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                                {selectedReport.report_type}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Location Section */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                        Location
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 items-start">
                                        {/* Address Text & Coordinates */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {selectedReport.location.address}
                                            </p>
                                            {selectedReport.location.lat !== null && selectedReport.location.lng !== null ? <div className="flex items-center gap-1.5 text-[11px] font-mono-data text-slate-500 dark:text-slate-400">
                                                <span>{selectedReport.location.lat}, {selectedReport.location.lng}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyCoordinates(selectedReport.location.lat, selectedReport.location.lng)}
                                                    title="Copy coordinates"
                                                    className="hover:text-[#ff6b00] cursor-pointer"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div> : <p className="text-xs text-slate-600 dark:text-slate-300">Coordinates not recorded.</p>}
                                            {/* Tactical Map Deep-link Button */}
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/dispatcher?reportId=${selectedReport.id}`)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-[11px] font-bold transition-all cursor-pointer mt-1"
                                                title={`Locate ${selectedReport.ticket_id} on Tactical GIS Command Map`}
                                                aria-label={`Locate ${selectedReport.ticket_id} on Tactical GIS Command Map`}
                                            >
                                                <MapIcon size={12} />
                                                <span>Locate on Tactical Map</span>
                                                <ArrowUpRight size={12} />
                                            </button>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                            <MapPin size={16} aria-hidden="true" className="mb-2" />
                                            <p>{selectedReport.location.address}</p>
                                            <p className="mt-1">Use the report map for geographic context.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Pulseline Status (Horizontal Step Tracker) ── */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                                        Pulseline status
                                    </div>

                                    <div className="flex items-start w-full px-2 py-1">
                                        {selectedReport.steps.map((step, idx) => (
                                            <React.Fragment key={step.id}>
                                                {/* Step Node */}
                                                <div className="flex min-w-0 flex-col items-center">
                                                    {/* Step Circle */}
                                                    <div
                                                        className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                                                            step.active
                                                                ? 'bg-[#ff6b00] text-white border-[#ff6b00] ring-4 ring-orange-500/20'
                                                                : step.completed
                                                                    ? 'bg-[#0a1324] dark:bg-slate-800 text-white border-[#0a1324] dark:border-slate-700'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                                                        }`}
                                                    >
                                                        {step.completed ? (
                                                            <Check size={13} strokeWidth={3} />
                                                        ) : (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                        )}
                                                    </div>

                                                    {/* Label */}
                                                    <span className={`text-center text-[9px] sm:text-[10px] leading-tight font-heading font-bold mt-1.5 ${
                                                        step.active ? 'text-[#ff6b00]' : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {step.label}
                                                    </span>

                                                    {/* Timestamp */}
                                                    <span className="hidden sm:block text-[9px] font-mono-data text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                        {step.time}
                                                    </span>
                                                </div>

                                                {/* Connector Line between steps */}
                                                {idx < selectedReport.steps.length - 1 && (
                                                    <div className="flex-1 h-[2px] mt-[13px] bg-slate-200 dark:bg-slate-700 mx-1" />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Activity Log ── */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                                        Activity
                                    </div>

                                    <div className="space-y-3">
                                        {selectedReport.activity.length === 0 && <p className="text-xs text-slate-600 dark:text-slate-300">Open the report history to review recorded events.</p>}
                                        {selectedReport.activity.map((act) => {
                                            const Icon = act.icon;
                                            return (
                                                <div key={act.id} className="flex gap-2.5 items-start">
                                                    <div className="mt-0.5 shrink-0">
                                                        <Icon size={14} className={act.color} />
                                                    </div>
                                                    <div className="flex-1 text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-heading font-bold text-slate-800 dark:text-slate-200">
                                                                {act.title}
                                                            </span>
                                                            <span className="font-mono-data text-[10px] text-slate-400">
                                                                {act.time}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5 leading-normal">
                                                            {act.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                </div>
                            </div>

                            {/* ── Detail Panel Action Bar (Bottom) ── */}
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50/50 p-3.5 sm:flex sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/50">
                                {selectedReport.raw_status === 'approved_internal' ? <button
                                    type="button"
                                    onClick={handleOpenWorkOrderModal}
                                    className="order-1 col-span-2 inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#ff6b00] px-3 py-2.5 font-heading text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#e65c00] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ff6b00] active:scale-[0.98] cursor-pointer sm:order-none dark:bg-[#ff6b00] dark:hover:bg-[#e65c00] dark:text-white"
                                >
                                    <Wrench size={14} />
                                    <span>Assign work order</span>
                                </button> : <Link to={`/gov/reports/${selectedReport.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 dark:border-slate-700 dark:text-slate-200">Review report before assignment</Link>}

                            </div>
                        </motion.div>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>

                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                MODALS: PHOTO ENLARGEMENT
            ══════════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedPhoto(null)}
                        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    >
                        <div className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black transition-colors z-10"
                            >
                                <X size={18} />
                            </button>
                            <img src={selectedPhoto} alt="Evidence Full View" className="w-full h-auto object-contain max-h-[80vh]" />
                            <div className="p-4 bg-slate-900 text-white flex justify-between items-center text-xs">
                                <span>{selectedReport?.ticket_id} • {selectedReport?.issue}</span>
                                <span className="font-mono-data text-slate-400">{selectedReport?.location.address}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════════════
                MODALS: UNIFIED WORK ORDER CREATION & FIELD DISPATCH
            ═══════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isWorkOrderModalOpen && selectedReport && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                            className="bg-white dark:bg-[#090e1a] rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="wo-modal-title"
                        >
                            {/* Top Accent Gradient Strip */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 shrink-0" />

                            {/* Modal Header */}
                            <div className="px-6 py-4.5 sm:px-7 sm:py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                                        <Briefcase size={13} className="text-[#ff6b00]" />
                                        <span>MUNICIPAL WORK ORDER DISPATCH</span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsWorkOrderModalOpen(false)}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                        aria-label="Close dialog"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <h2 id="wo-modal-title" className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                                    Create & Dispatch Work Order
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                    Authorize and deploy engineering field teams with official dispatch parameters.
                                </p>
                            </div>
                            
                            {/* Modal Landscape Form Body */}
                            <form onSubmit={handleExecuteWorkOrder} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
                                <div className="p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                    {/* ── LEFT COLUMN: Incident Target & Location Dossier (5 cols) ── */}
                                    <div className="lg:col-span-5 flex flex-col gap-4">
                                        {/* Target Incident Summary Card */}
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#030712]/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-2.5 shadow-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-xs font-extrabold text-[#ff6b00]">
                                                        {formatTicketId(selectedReport.ticket_id, selectedReport.id)}
                                                    </span>
                                                    {selectedReport.barangay && (
                                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <span>•</span>
                                                            <MapPin size={10} className="text-slate-400 shrink-0" />
                                                            <span>{selectedReport.barangay.startsWith('Barangay') ? selectedReport.barangay : `Brgy. ${selectedReport.barangay}`}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {(() => {
                                                    const desc = getStatusDescriptor(selectedReport.status);
                                                    const StatusIcon = desc?.icon || Clock;
                                                    return (
                                                        <div className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${desc?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                            <StatusIcon size={11} className="shrink-0" />
                                                            <span>{desc?.label || selectedReport.status}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                                {getReportPlainTitle(selectedReport)}
                                            </h4>
                                            {selectedReport.description && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                    {selectedReport.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Field Operations Site Card */}
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#030712]/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3 shadow-xs">
                                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#ff6b00] flex items-center justify-center shrink-0 mt-0.5 border border-orange-500/20">
                                                <MapPin size={15} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                                                    Field Operations Site
                                                </div>
                                                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words">
                                                    {selectedReport.location?.address || 'Address not recorded'}
                                                </div>
                                                {selectedReport.barangay && (
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                                        {selectedReport.barangay}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Information Notice Strip */}
                                        <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-slate-700 dark:text-slate-300 text-[11px] flex items-start gap-2.5">
                                            <Sparkles size={15} className="text-[#ff6b00] shrink-0 mt-0.5" />
                                            <div className="leading-relaxed">
                                                Assignment records the work order and moves an approved report to <strong className="text-orange-600 dark:text-orange-400 font-bold">dispatched</strong>. Field work begins when the assigned official starts the order.
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── RIGHT COLUMN: Directive & Fleet Allocation Form (7 cols) ── */}
                                    <div className="lg:col-span-7 flex flex-col gap-4">
                                        {/* Row 1: Designed Dropdowns */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-30">
                                            {/* Assigned Fleet / Lead */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                    <Truck size={13} className="text-[#ff6b00]" />
                                                    <span>Assign to field official</span>
                                                </label>
                                                <OrangeSelect 
                                                    value={workOrderForm.assigned_to_id}
                                                    onChange={(val) => {
                                                        setWorkOrderForm(prev => ({
                                                            ...prev,
                                                            assigned_to_id: Number(val)
                                                        }));
                                                    }}
                                                    options={eligibleAssignees.map((person) => ({ value: person.id, label: `${person.full_name} · ${person.role.replaceAll('_', ' ')}` }))}
                                                    searchable={false}
                                                    icon={Truck}
                                                    className="w-full"
                                                />
                                                {assigneeError && <p role="alert" className="text-red-600 text-xs mt-1">{assigneeError}</p>}
                                            </div>

                                            {/* Priority Level */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                    <ShieldCheck size={13} className="text-[#ff6b00]" />
                                                    <span>Priority Level</span>
                                                </label>
                                                <OrangeSelect 
                                                    value={workOrderForm.priority || 'normal'}
                                                    onChange={(val) => setWorkOrderForm(prev => ({ ...prev, priority: val }))}
                                                    options={DISPATCH_PRIORITY_OPTIONS}
                                                    searchable={false}
                                                    icon={ShieldCheck}
                                                    align="right"
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>

                                        {/* Task Title */}
                                        <div className="relative z-10">
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                <Wrench size={13} className="text-[#ff6b00]" />
                                                <span>Work Order Task Title</span>
                                            </label>
                                            <input 
                                                type="text"
                                                required
                                                placeholder={`e.g. Repair ${selectedReport.report_type || selectedReport.issue || 'damaged infrastructure'}`}
                                                value={workOrderForm.title}
                                                onChange={(e) => setWorkOrderForm({ ...workOrderForm, title: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] transition-all shadow-xs"
                                            />
                                        </div>

                                        {/* Instructions & Action Plan */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                <FileText size={13} className="text-[#ff6b00]" />
                                                <span>Dispatcher Instructions & Action Plan</span>
                                            </label>
                                            <textarea 
                                                rows="4"
                                                placeholder="Specify field instructions, required heavy equipment, safety perimeters, or coordinate notes..."
                                                value={workOrderForm.description}
                                                onChange={(e) => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] transition-all shadow-xs resize-none leading-relaxed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Controls */}
                                <div className="px-6 py-4 sm:px-7 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 shrink-0">
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
                                        Department of Engineering & Public Works • Caloocan City
                                    </span>
                                    <div className="flex items-center gap-3 ml-auto">
                                        <button 
                                            type="button"
                                            onClick={() => setIsWorkOrderModalOpen(false)}
                                            disabled={isSubmittingWo}
                                            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isSubmittingWo || eligibleAssignees.length === 0}
                                            className="px-6 py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white text-xs font-bold shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                                        >
                                            {isSubmittingWo ? (
                                                <div className="flex items-center gap-2">
                                                    <RefreshCw size={14} className="animate-spin" />
                                                    <span>Dispatching...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Navigation size={14} />
                                                    <span>Confirm & Dispatch Crew</span>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
