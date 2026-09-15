import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ClipboardList, Wrench, Building2, MapPin, BarChart2,
    Users, Settings, ChevronLeft, ChevronRight, Search,
    Bell, Check, AlertTriangle, ShieldCheck, Clock, CheckSquare,
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
import Swal from 'sweetalert2';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import { 
    getStatusDescriptor, 
    getReportPlainTitle, 
    getUrgencyDescriptor, 
    CANONICAL_STATUS_LIST,
    formatTicketId,
    buildReportWorkflowSteps
} from '../utils/reportWorkflow';

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE INITIAL DATA (Exact Parity with media_1788468315863.png)
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_REPORTS = [
    {
        id: 1,
        ticket_id: 'PUL-2026-0822',
        issue: 'Exposed electrical wire',
        barangay: 'Barangay 176',
        district: 'North Caloocan',
        severity: 'Critical',
        status: 'Verified',
        updated: '14 min ago',
        report_type: 'Hazard',
        reporter: {
            name: 'Name withheld',
            is_private: true,
            contact_method: 'Contact via Pulseline'
        },
        location: {
            address: '176 Deparo St., Brgy. 176, North Caloocan City',
            lat: 14.720712,
            lng: 120.985134,
            landmark: 'Near Camarin Rd. junction'
        },
        evidence: [
            'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=600&q=80'
        ],
        steps: buildReportWorkflowSteps('Verified', {
            received: '8:12 AM Today',
            verified: '8:27 AM Today'
        }),
        activity: [
            {
                id: 1,
                icon: ShieldCheck,
                color: 'text-[#ff6b00]',
                title: 'Verified by Ana Reyes (Dispatcher)',
                time: '8:27 AM',
                desc: 'Confirmed hazard. Exposed live wire near utility pole.'
            },
            {
                id: 2,
                icon: Users,
                color: 'text-emerald-500',
                title: 'Assigned to Electrical Maintenance Team',
                time: '8:35 AM',
                desc: 'Work order WO-2026-1197 created.'
            },
            {
                id: 3,
                icon: MessageSquare,
                color: 'text-slate-400',
                title: 'Note added by Ana Reyes (Dispatcher)',
                time: '8:37 AM',
                desc: 'Coordinated with Meralco. On-site inspection scheduled.'
            }
        ]
    },
    {
        id: 2,
        ticket_id: 'PUL-2026-0821',
        issue: 'Pothole on road',
        barangay: 'Barangay 165',
        district: 'North Caloocan',
        severity: 'High',
        status: 'Assigned',
        updated: '32 min ago',
        report_type: 'Road',
        reporter: {
            name: 'Name withheld',
            is_private: true,
            contact_method: 'Contact via Pulseline'
        },
        location: {
            address: '42 Bagumbong Rd., Brgy. 165, North Caloocan City',
            lat: 14.741200,
            lng: 121.034500,
            landmark: 'Near Bagumbong Elementary School'
        },
        evidence: [
            'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
        ],
        steps: buildReportWorkflowSteps('Assigned', {
            received: '7:40 AM Today',
            verified: '8:05 AM Today',
            assigned: '8:15 AM Today'
        }),
        activity: [
            {
                id: 1,
                icon: ShieldCheck,
                color: 'text-[#ff6b00]',
                title: 'Verified by Ana Reyes (Dispatcher)',
                time: '8:05 AM',
                desc: 'Confirmed deep road crater measuring approx 1.2m across.'
            },
            {
                id: 2,
                icon: Users,
                color: 'text-emerald-500',
                title: 'Assigned to Road Asphalt Crew 3',
                time: '8:15 AM',
                desc: 'Work order WO-2026-1196 created for cold-mix patching.'
            }
        ]
    },
    {
        id: 3,
        ticket_id: 'PUL-2026-0820',
        issue: 'Flooded street',
        barangay: 'Barangay 162',
        district: 'North Caloocan',
        severity: 'High',
        status: 'In progress',
        updated: '1 hr ago',
        report_type: 'Drainage',
        reporter: {
            name: 'Name withheld',
            is_private: true,
            contact_method: 'Contact via Pulseline'
        },
        location: {
            address: 'Corner Malanting St., Brgy. 162, North Caloocan City',
            lat: 14.718900,
            lng: 121.012300,
            landmark: 'Near Caloocan North Floodway'
        },
        evidence: [
            'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80'
        ],
        steps: buildReportWorkflowSteps('In progress', {
            received: '6:30 AM Today',
            verified: '6:50 AM Today',
            assigned: '7:10 AM Today',
            in_progress: '7:30 AM Today'
        }),
        activity: [
            {
                id: 1,
                icon: ShieldCheck,
                color: 'text-[#ff6b00]',
                title: 'Verified by Carlos D. (Admin Clerk)',
                time: '6:50 AM',
                desc: 'Knee-deep flooding due to obstructed drainage culvert.'
            },
            {
                id: 2,
                icon: Wrench,
                color: 'text-sky-500',
                title: 'Suction Dredging Crew Dispatched',
                time: '7:30 AM',
                desc: 'Vactor truck on site clearing debris.'
            }
        ]
    },
    {
        id: 4,
        ticket_id: 'PUL-2026-0819',
        issue: 'Broken streetlight',
        barangay: 'Barangay 170',
        district: 'North Caloocan',
        severity: 'Medium',
        status: 'Received',
        updated: '2 hr ago',
        report_type: 'Lighting',
        reporter: {
            name: 'Name withheld',
            is_private: true,
            contact_method: 'Contact via Pulseline'
        },
        location: {
            address: 'Phase 4, Package 2, Brgy. 170, North Caloocan City',
            lat: 14.735600,
            lng: 121.028900,
            landmark: 'Opposite Community Chapel'
        },
        evidence: [
            'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80'
        ],
        steps: buildReportWorkflowSteps('Received', {
            received: '5:45 AM Today'
        }),
        activity: [
            {
                id: 1,
                icon: Clock,
                color: 'text-slate-400',
                title: 'Report Received via PULSO Mobile App',
                time: '5:45 AM',
                desc: 'Pending dispatcher triage and verification.'
            }
        ]
    },
    {
        id: 5,
        ticket_id: 'PUL-2026-0818',
        issue: 'Garbage collection missed',
        barangay: 'Barangay 183',
        district: 'North Caloocan',
        severity: 'Medium',
        status: 'Resolved',
        updated: '3 hr ago',
        report_type: 'Sanitation',
        reporter: {
            name: 'Name withheld',
            is_private: true,
            contact_method: 'Contact via Pulseline'
        },
        location: {
            address: 'Block 12 Lot 5, Tala, Brgy. 183, North Caloocan City',
            lat: 14.764500,
            lng: 121.056700,
            landmark: 'Near Tala Market'
        },
        evidence: [
            'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80'
        ],
        steps: buildReportWorkflowSteps('Resolved', {
            received: 'Yesterday 4:00 PM',
            verified: 'Yesterday 4:20 PM',
            assigned: 'Yesterday 5:00 PM',
            in_progress: 'Yesterday 6:00 PM',
            resolved: 'Today 5:30 AM'
        }),
        activity: [
            {
                id: 1,
                icon: Check,
                color: 'text-emerald-500',
                title: 'Resolved by Sanitation Task Force',
                time: '5:30 AM',
                desc: 'Special collection completed. Area cleared and sanitized.'
            }
        ]
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

    // ── Reports & Selection state ──
    const [reports, setReports] = useState(INITIAL_REPORTS);
    const [selectedReportId, setSelectedReportId] = useState(INITIAL_REPORTS[0].id);
    const [selectedRowIds, setSelectedRowIds] = useState([INITIAL_REPORTS[0].id]);
    const [isPinned, setIsPinned] = useState(false);

    // ── Live Sync State ──
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState('just now');

    // ── Filters & Search state ──
    const [searchQuery, setSearchQuery] = useState('');
    const [savedView, setSavedView] = useState('All reports');
    const [statusFilter, setStatusFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const [barangayFilter, setBarangayFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [districtFilter, setDistrictFilter] = useState('North Caloocan');

    // ── Pagination state ──
    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    // ── Modals & Action States ──
    const [activeModal, setActiveModal] = useState(null); // 'work_order' | 'escalate' | 'note' | 'photo' | null
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [newNoteText, setNewNoteText] = useState('');
    const [escalateReason, setEscalateReason] = useState('High risk to public pedestrian safety');
    
    // ── Unified Work Order Dispatch Modal State ──
    const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
    const [workOrderForm, setWorkOrderForm] = useState({
        title: '',
        description: '',
        priority: 'high',
        team: 'Team Beta — Engr. Bautista (Roads & Bridges)',
        assigned_to_id: 3
    });
    const [isSubmittingWo, setIsSubmittingWo] = useState(false);

    const searchInputRef = useRef(null);
    const mobileNavRef = useRef(null);
    const mobileNavTriggerRef = useRef(null);
    const mainContentRef = useRef(null);

    // ── Current User Profile ──
    const [currentUser, setCurrentUser] = useState({
        name: 'Ana Reyes',
        role: 'dispatcher',
        roleLabel: 'Dispatcher',
        email: 'ana.reyes@caloocan.gov.ph'
    });

    // ── Read user from session ──
    useEffect(() => {
        try {
            const u = getAuthUser();
            if (u && (u.name || u.username || u.full_name)) {
                setCurrentUser({
                    name: u.full_name || u.name || 'Ana Reyes',
                    role: u.role || 'dispatcher',
                    roleLabel: (u.role || 'dispatcher').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    email: u.email || 'dispatcher@caloocan.gov.ph'
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
        if (!token) return;
        setIsSyncing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports?limit=50&t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const mapped = data.map((r, index) => ({
                        id: r.id || index + 10,
                        ticket_id: formatTicketId(r.ticket_id, r.id),
                        issue: getReportPlainTitle(r),
                        barangay: r.barangay ? `Barangay ${r.barangay.replace(/[^0-9]/g, '')}` : 'Barangay 176',
                        district: 'North Caloocan',
                        severity: r.urgency === 'critical' ? 'Critical' : r.urgency === 'high' ? 'High' : 'Medium',
                        status: r.status === 'verified' ? 'Verified' :
                                r.status === 'assigned' || r.status === 'approved_internal' ? 'Assigned' :
                                r.status === 'in_progress' || r.status === 'dispatched' ? 'In Progress' :
                                r.status === 'resolved' ? 'Resolved' : 
                                r.status === 'rejected' ? 'Rejected' : 'Pending Review',
                        updated: 'Just now',
                        report_type: r.ai_category || r.category || 'General',
                        reporter: {
                            name: 'Name withheld',
                            is_private: true,
                            contact_method: 'Contact via Pulseline'
                        },
                        location: {
                            address: r.location_string || 'North Caloocan City',
                            lat: r.location_lat || 14.7566,
                            lng: r.location_lng || 121.0450,
                            landmark: 'Reported location'
                        },
                        evidence: r.image_url ? [
                            r.image_url.startsWith('http') ? r.image_url : `${API_BASE_URL}${r.image_url}`
                        ] : INITIAL_REPORTS[0].evidence,
                        steps: buildReportWorkflowSteps(r.status, {
                            received: 'Today',
                            verified: ['verified', 'reviewed', 'under_review', 'assigned', 'approved_internal', 'dispatched', 'in_progress', 'resolved'].includes(r.status) ? 'Today' : '—',
                            assigned: ['assigned', 'approved_internal', 'dispatched', 'in_progress', 'resolved'].includes(r.status) ? 'Today' : '—',
                            in_progress: ['dispatched', 'in_progress', 'resolved'].includes(r.status) ? 'Today' : '—',
                            resolved: r.status === 'resolved' ? 'Today' : '—'
                        }),
                        activity: INITIAL_REPORTS[0].activity
                    }));
                    setReports(mapped);
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
                    setSelectedReportId(mapped[0].id);
                    setSelectedRowIds([mapped[0].id]);
                }
            }
        } catch (err) {
            console.error("Live fetch failed:", err);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchLiveReports();
    }, []);

    // ── Filter computation ──
    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTicket = r.ticket_id.toLowerCase().includes(q);
                const matchIssue = r.issue.toLowerCase().includes(q);
                const matchBarangay = r.barangay.toLowerCase().includes(q);
                if (!matchTicket && !matchIssue && !matchBarangay) return false;
            }
            if (statusFilter !== 'All' && r.status !== statusFilter) return false;
            if (severityFilter !== 'All' && r.severity !== severityFilter) return false;
            if (barangayFilter !== 'All' && r.barangay !== barangayFilter) return false;
            if (districtFilter !== 'All Districts' && r.district !== districtFilter) return false;
            return true;
        });
    }, [reports, searchQuery, statusFilter, severityFilter, barangayFilter, districtFilter]);

    // Currently selected report object
    const selectedReport = useMemo(() => {
        return reports.find(r => r.id === selectedReportId) || filteredReports[0] || reports[0];
    }, [reports, selectedReportId, filteredReports]);

    // Check if any filter is active
    const hasActiveFilters = searchQuery || statusFilter !== 'All' || severityFilter !== 'All' || barangayFilter !== 'All' || dateFilter !== 'All';

    const clearAllFilters = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setSeverityFilter('All');
        setBarangayFilter('All');
        setDateFilter('All');
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
            description: `Field repair work order created via Citizen Reports. Location: ${selectedReport.location?.address || 'Caloocan City'}`,
            priority: selectedReport.severity === 'Critical' ? 'critical' : selectedReport.severity === 'High' ? 'high' : 'normal',
            team: 'Team Beta — Engr. Bautista (Roads & Bridges)',
            assigned_to_id: 3
        });
        setIsWorkOrderModalOpen(true);
    };

    const handleExecuteWorkOrder = async (e) => {
        if (e) e.preventDefault();
        if (!selectedReport) return;
        setIsSubmittingWo(true);
        const token = getAuthToken();
        try {
            const payload = {
                title: workOrderForm.title || `Repair ${selectedReport.issue || 'Infrastructure Issue'}`,
                description: workOrderForm.description || 'Dispatched via Citizen Reports processing desk.',
                wo_type: 'standard',
                status: 'open',
                priority: workOrderForm.priority,
                assigned_to_id: parseInt(workOrderForm.assigned_to_id, 10),
                report_id: selectedReport.id
            };

            const res = await fetch(`${API_BASE_URL}/api/work-orders`, {
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

                // Update report status to In Progress (since backend sets dispatched)
                setReports(prev => prev.map(r => {
                    if (r.id === selectedReport.id) {
                        return {
                            ...r,
                            status: 'In Progress',
                            updated: 'Just now',
                            activity: [
                                {
                                    id: Date.now(),
                                    icon: Users,
                                    color: 'text-indigo-500',
                                    title: `Work Order ${newWo.wo_number || ''} Dispatched (${workOrderForm.team})`,
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    desc: `Official work order created and dispatched with ${workOrderForm.priority.toUpperCase()} priority.`
                                },
                                ...r.activity
                            ]
                        };
                    }
                    return r;
                }));

                Swal.fire({
                    icon: 'success',
                    title: 'Work Order Dispatched!',
                    text: `Work order ${newWo.wo_number || ''} created for ${selectedReport.ticket_id}. Shared database and Command Center map are synchronized.`,
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

    const handleEscalateReport = () => {
        Swal.fire({
            title: 'Escalate Report',
            text: `Escalate ${selectedReport.ticket_id} to City Engineer Executive Desk?`,
            icon: 'warning',
            input: 'textarea',
            inputPlaceholder: 'Enter urgent escalation justification...',
            inputValidator: (value) => {
                if (!value) return 'You must provide an escalation reason.';
            },
            showCancelButton: true,
            confirmButtonText: 'Escalate to City Engineer',
            confirmButtonColor: '#dc2626',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                setReports(prev => prev.map(r => {
                    if (r.id === selectedReport.id) {
                        return {
                            ...r,
                            severity: 'Critical',
                            updated: 'Just now',
                            activity: [
                                {
                                    id: Date.now(),
                                    icon: Flag,
                                    color: 'text-red-500',
                                    title: 'Escalated by Dispatcher to City Engineer Desk',
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    desc: result.value
                                },
                                ...r.activity
                            ]
                        };
                    }
                    return r;
                }));
                Swal.fire({
                    icon: 'success',
                    title: 'Report Escalated',
                    text: `Executive alert sent for ${selectedReport.ticket_id}`,
                    confirmButtonColor: '#ff6b00'
                });
            }
        });
    };

    const handleAddNote = (e) => {
        e.preventDefault();
        if (!newNoteText.trim()) return;
        setReports(prev => prev.map(r => {
            if (r.id === selectedReport.id) {
                return {
                    ...r,
                    activity: [
                        {
                            id: Date.now(),
                            icon: MessageSquare,
                            color: 'text-slate-400',
                            title: `Note added by ${currentUser.name} (${currentUser.roleLabel})`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            desc: newNoteText.trim()
                        },
                        ...r.activity
                    ]
                };
            }
            return r;
        }));
        setNewNoteText('');
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

                {/* ─────────────────────────────────────────────────────────────
                    2. TOP BAR & UNIFIED WORKFLOW CONTROLS
                ────────────────────────────────────────────────────────────── */}
                <header className="min-h-16 h-auto py-2.5 lg:py-0 lg:h-20 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-4 lg:px-6 flex items-center justify-between z-20 gap-3 flex-nowrap">
                    {/* Left: Breadcrumbs + Title + Persistent Role Subtitle */}
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            ref={mobileNavTriggerRef}
                            type="button"
                            className="lg:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            aria-label="Open government navigation"
                            aria-expanded={isMobileNavOpen}
                            aria-controls="gov-mobile-navigation"
                            onClick={() => setIsMobileNavOpen(true)}
                        >
                            <Menu size={20} />
                        </button>
                        <div className="min-w-0">
                        <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                            <Link to="/gov/my-dashboard" className="hidden sm:inline hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Home</Link>
                            <span className="hidden sm:inline">/</span>
                            <span className="hidden sm:inline text-slate-500 dark:text-slate-400">Reports</span>
                            <span className="hidden sm:inline">/</span>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold">Citizen reports</span>
                        </nav>
                        <div className="flex items-center gap-2 mt-1">
                            <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-none">
                                Citizen reports
                            </h1>
                            <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
                                Report Processing & Audit
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden xl:block mt-0.5 truncate max-w-lg">
                            Administrative Triage — Review citizen submissions, verify evidence, inspect audit trails, and manage compliance.
                        </p>
                        </div>
                    </div>

                    {/* Right: Workflow View Switcher + Controls & User cluster */}
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto">
                        {/* Segmented View Switcher: Map View ↔ Table View */}
                        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                            <button
                                type="button"
                                onClick={() => {
                                    const param = selectedReport?.id ? `?reportId=${selectedReport.id}` : '';
                                    navigate(`/dispatcher${param}`);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                                title="Switch to Tactical GIS Map View (Field Dispatch & Routing)"
                                aria-label="Switch to Tactical GIS Map View for Field Dispatch"
                            >
                                <MapIcon size={14} />
                                <span className="hidden sm:inline">Map View</span>
                            </button>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs border border-slate-200/60 dark:border-slate-600">
                                <FileText size={14} />
                                <span className="hidden sm:inline">Table View</span>
                            </div>
                        </div>

                        {/* Live Database Sync Indicator */}
                        <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-orange-500 animate-ping' : 'bg-emerald-500'}`} />
                            <span className="font-mono text-[10px] hidden xl:inline">Live Sync</span>
                            <button
                                type="button"
                                onClick={fetchLiveReports}
                                disabled={isSyncing}
                                className="p-0.5 hover:text-orange-500 transition-colors cursor-pointer"
                                title="Force sync with live database"
                                aria-label="Synchronize live reports"
                            >
                                <RefreshCw size={12} className={isSyncing ? 'animate-spin text-orange-500' : ''} />
                            </button>
                        </div>

                        {/* District Filter Dropdown */}
                        <div className="relative hidden sm:block">
                            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                                <MapPin size={14} className="text-[#ff6b00]" />
                                <span>{districtFilter}</span>
                                <ChevronDown size={14} className="text-slate-400" />
                            </div>
                        </div>

                        {/* Search Input with '/' shortcut */}
                        <div className="relative hidden md:block w-56 lg:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Search size={14} />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search reports"
                                className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b00] transition-all"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <kbd className="px-1.5 py-0.5 text-[10px] font-mono-data font-semibold text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                                    /
                                </kbd>
                            </div>
                        </div>

                        {/* Notification Bell */}
                        <button
                            type="button"
                            title="3 urgent notifications"
                            className="relative p-2.5 text-slate-600 dark:text-slate-300 hover:text-[#ff6b00] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#ff6b00] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                3
                            </span>
                        </button>

                        {/* Theme Toggle */}
                        <ThemeToggle className="hidden sm:flex" />

                        {/* User Avatar + Role Dropdown */}
                        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0a1324] to-[#1e293b] text-white flex items-center justify-center text-xs font-heading font-black border border-slate-300 dark:border-slate-700 shadow-xs">
                                AR
                            </div>
                            <div className="hidden lg:flex flex-col text-left leading-tight">
                                <span className="font-heading font-bold text-xs text-slate-900 dark:text-white">
                                    {currentUser.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {currentUser.roleLabel}
                                </span>
                            </div>
                            <ChevronDown size={14} className="text-slate-400 cursor-pointer hover:text-slate-600" />
                        </div>
                    </div>
                </header>

                {/* ─────────────────────────────────────────────────────────────
                    3. FILTER BAR
                ────────────────────────────────────────────────────────────── */}
                <div className="min-h-14 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center text-xs font-medium relative z-40 overflow-x-auto overflow-y-visible custom-scrollbar">
                    <div className="flex min-w-max items-center gap-2.5 py-2 overflow-visible">
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
                            options={[
                                { value: 'All', label: 'Barangay: All' },
                                { value: 'Barangay 176', label: 'Barangay 176' },
                                { value: 'Barangay 165', label: 'Barangay 165' },
                                { value: 'Barangay 162', label: 'Barangay 162' },
                                { value: 'Barangay 170', label: 'Barangay 170' },
                                { value: 'Barangay 183', label: 'Barangay 183' }
                            ]}
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
                <div className="flex-1 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden p-3 sm:p-4 lg:p-6 gap-3 sm:gap-4 lg:gap-6">

                    <div
                        className="xl:hidden flex shrink-0 gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-[#090e1a] custom-scrollbar"
                        role="listbox"
                        aria-label="Citizen reports"
                    >
                        {filteredReports.map((report) => {
                            const isSelected = selectedReport?.id === report.id;
                            return (
                                <button
                                    key={report.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => setSelectedReportId(report.id)}
                                    className={`min-h-14 min-w-44 rounded-lg border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2563EB] ${
                                        isSelected
                                            ? 'border-[#0B4F6C] bg-[#0B4F6C]/10 text-[#0B4F6C] dark:border-[#82C7D8] dark:bg-[#82C7D8]/10 dark:text-[#82C7D8]'
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
                                    {filteredReports.map((report) => {
                                        const isSelected = selectedReport?.id === report.id;
                                        const isChecked = selectedRowIds.includes(report.id);

                                        return (
                                            <tr
                                                key={report.id}
                                                onClick={() => setSelectedReportId(report.id)}
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedReportId(report.id);
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
                                Showing 1 to {filteredReports.length} of {filteredReports.length} reports
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
                                        1
                                    </button>
                                    <button
                                        type="button"
                                        disabled
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
                                    options={[
                                        { value: 10, label: '10 / page' },
                                        { value: 20, label: '20 / page' },
                                        { value: 50, label: '50 / page' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: DETAIL PANEL (Persistent) ───────────────────── */}
                    {selectedReport && (
                        <aside className="w-full xl:w-[420px] min-h-[620px] xl:min-h-0 shrink-0 bg-white dark:bg-[#090e1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">

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
                                <button
                                    type="button"
                                    onClick={() => setIsPinned(!isPinned)}
                                    title={isPinned ? 'Unpin panel' : 'Pin panel'}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                    {isPinned ? <Pin className="text-[#ff6b00]" size={15} /> : <Pin size={15} />}
                                </button>
                            </div>

                            {/* Detail Panel Body */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">

                                {/* Evidence Photo & Reporter Meta */}
                                <div className="grid grid-cols-2 gap-4 items-start">
                                    {/* Evidence Thumbnail */}
                                    <div>
                                        <div className="text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                            Evidence
                                        </div>
                                        <div
                                            onClick={() => setSelectedPhoto(selectedReport.evidence[0])}
                                            className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer group shadow-2xs"
                                        >
                                            <img
                                                src={selectedReport.evidence[0]}
                                                alt="Report Evidence"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                <Eye size={18} />
                                            </div>
                                        </div>
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
                                            <button
                                                type="button"
                                                onClick={() => Swal.fire({
                                                    title: 'Pulseline Secure Contact',
                                                    text: 'Direct messaging resident through PULSO platform messenger (phone numbers protected under RA 10173).',
                                                    icon: 'info',
                                                    confirmButtonColor: '#ff6b00'
                                                })}
                                                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-[#ff6b00] mt-1.5 transition-colors cursor-pointer"
                                            >
                                                <Phone size={12} className="text-[#ff6b00] shrink-0" />
                                                <span>{selectedReport.reporter.contact_method}</span>
                                            </button>
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
                                            <div className="flex items-center gap-1.5 text-[11px] font-mono-data text-slate-500 dark:text-slate-400">
                                                <span>{selectedReport.location.lat}, {selectedReport.location.lng}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyCoordinates(selectedReport.location.lat, selectedReport.location.lng)}
                                                    title="Copy coordinates"
                                                    className="hover:text-[#ff6b00] cursor-pointer"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
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

                                        {/* Embedded Map Preview with Pin */}
                                        <div className="relative h-24 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                            {/* Stylized Street Grid Background */}
                                            <svg className="w-full h-full opacity-60 dark:opacity-30" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <pattern id="street-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                                                        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-600" />
                                                    </pattern>
                                                </defs>
                                                <rect width="100%" height="100%" fill="url(#street-grid)" />
                                                <path d="M 0 30 Q 50 20 120 70 T 200 90" fill="none" stroke="#94a3b8" strokeWidth="4" />
                                                <path d="M 60 0 L 140 100" fill="none" stroke="#cbd5e1" strokeWidth="3" />
                                            </svg>

                                            {/* Map Labels */}
                                            <div className="absolute top-1 left-2 text-[9px] font-mono-data text-slate-500">Camarin Rd.</div>
                                            <div className="absolute top-1 right-2 text-[9px] font-mono-data text-slate-500">Deparo St.</div>
                                            <div className="absolute bottom-1 right-2 text-[9px] font-mono-data text-slate-500">10th Ave.</div>

                                            {/* Location Pin */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                                                <div className="w-7 h-7 bg-[#0a1324] dark:bg-slate-950 text-[#ff6b00] rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 animate-bounce">
                                                    <MapPin size={15} />
                                                </div>
                                            </div>

                                            {/* Locate button */}
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/dispatcher?reportId=${selectedReport.id}`)}
                                                title={`Locate ${selectedReport.ticket_id} on Tactical GIS Command Map`}
                                                aria-label={`Locate ${selectedReport.ticket_id} on Tactical GIS Command Map`}
                                                className="absolute bottom-1.5 right-1.5 p-1.5 bg-white/95 dark:bg-slate-900/95 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-[#ff6b00] shadow-xs cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                            >
                                                <ArrowUpRight size={13} />
                                            </button>
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

                                    {/* Quick Note Input */}
                                    <form onSubmit={handleAddNote} className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={newNoteText}
                                            onChange={(e) => setNewNoteText(e.target.value)}
                                            placeholder="Add internal dispatcher note..."
                                            className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newNoteText.trim()}
                                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-[#ff6b00] hover:text-white rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            Post
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* ── Detail Panel Action Bar (Bottom) ── */}
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50/50 p-3.5 sm:flex sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/50">
                                {/* 1. Request Changes (Outline) */}
                                <button
                                    type="button"
                                    onClick={() => Swal.fire({
                                        title: 'Request Changes',
                                        input: 'textarea',
                                        inputPlaceholder: 'Specify required modifications from field crew or citizen...',
                                        showCancelButton: true,
                                        confirmButtonText: 'Submit Request',
                                        confirmButtonColor: '#ff6b00'
                                    })}
                                    className="order-2 inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-heading text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2563EB] sm:order-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                    <MessageSquare size={14} />
                                    <span>Request changes</span>
                                </button>

                                {/* 2. Assign Work Order (PULSO Orange Primary) */}
                                <button
                                    type="button"
                                    onClick={handleOpenWorkOrderModal}
                                    className="order-1 col-span-2 inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0B4F6C] px-3 py-2.5 font-heading text-xs font-bold text-white shadow-md shadow-sky-900/15 transition-all hover:bg-[#083F57] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2563EB] active:scale-[0.98] sm:order-none dark:bg-[#82C7D8] dark:text-[#071A2B] dark:hover:bg-[#A6DBE7]"
                                >
                                    <Wrench size={14} />
                                    <span>Assign work order</span>
                                </button>

                                {/* 3. Escalate (Red/Destructive Outline) */}
                                <button
                                    type="button"
                                    onClick={handleEscalateReport}
                                    className="order-3 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-50/50 px-3 py-2.5 font-heading text-xs font-bold text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2563EB] sm:order-none dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                >
                                    <Flag size={14} />
                                    <span>Escalate</span>
                                </button>
                            </div>
                        </aside>
                    )}

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
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.94, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 16 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="wo-modal-title"
                        >
                            {/* Top Accent Gradient Strip */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 shrink-0" />

                            {/* Modal Header */}
                            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div className="flex items-center justify-between gap-3 mb-2.5">
                                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                                        <Briefcase size={13} className="text-orange-500" />
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

                                <h2 id="wo-modal-title" className="text-xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                                    Create & Dispatch Work Order
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                    Authorize and deploy engineering field teams with official dispatch parameters.
                                </p>

                                {/* Incident Summary Lockup */}
                                <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-mono text-xs font-extrabold text-orange-500">
                                                #{formatTicketId(selectedReport.ticket_id, selectedReport.id)}
                                            </span>
                                            {selectedReport.barangay && (
                                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                                    <span>•</span>
                                                    <MapPin size={10} className="text-slate-400 shrink-0" />
                                                    <span>{selectedReport.barangay.startsWith('Barangay') ? selectedReport.barangay : `Brgy. ${selectedReport.barangay}`}</span>
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {getReportPlainTitle(selectedReport)}
                                        </h4>
                                    </div>
                                    {(() => {
                                        const desc = getStatusDescriptor(selectedReport.status);
                                        const StatusIcon = desc?.icon || Clock;
                                        return (
                                            <div className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${desc?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                <StatusIcon size={12} className="shrink-0" />
                                                <span>{desc?.label || selectedReport.status}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            
                            {/* Modal Scrollable Form Body */}
                            <form onSubmit={handleExecuteWorkOrder} className="p-6 overflow-y-auto space-y-4 text-xs">
                                {/* Issue Verified Location Card */}
                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5 border border-orange-500/20">
                                        <MapPin size={15} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                                            Field Operations Site
                                        </div>
                                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words">
                                            {selectedReport.location?.address || selectedReport.location_string || `${selectedReport.location?.lat || selectedReport.location_lat || 14.7566}°N, ${selectedReport.location?.lng || selectedReport.location_lng || 121.0450}°E (Caloocan)`}
                                        </div>
                                    </div>
                                </div>

                                {/* 2-Column Responsive Form Controls */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Assigned Fleet / Engineer */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <Truck size={13} className="text-orange-500" />
                                            <span>Assign To Fleet / Lead</span>
                                        </label>
                                        <select 
                                            required
                                            value={workOrderForm.assigned_to_id || 3}
                                            onChange={(e) => {
                                                const teamId = parseInt(e.target.value, 10);
                                                const teamNames = {
                                                    2: 'Team Alpha — Engr. Dela Cruz (Electrical & Lighting)',
                                                    3: 'Team Beta — Engr. Bautista (Roads & Bridges)',
                                                    4: 'Team Gamma — Engr. Reyes (Drainage & Waterworks)',
                                                    5: 'Team Delta — Environmental Sanitation Task Force'
                                                };
                                                setWorkOrderForm({ 
                                                    ...workOrderForm, 
                                                    assigned_to_id: teamId, 
                                                    team: teamNames[teamId] || 'Team Beta — Roads & Bridges' 
                                                });
                                            }}
                                            className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all cursor-pointer shadow-xs"
                                        >
                                            <option value="2">Team Alpha — Engr. Dela Cruz (Electrical & Lighting)</option>
                                            <option value="3">Team Beta — Engr. Bautista (Roads & Bridges)</option>
                                            <option value="4">Team Gamma — Engr. Reyes (Drainage & Waterworks)</option>
                                            <option value="5">Team Delta — Environmental Sanitation Task Force</option>
                                        </select>
                                    </div>

                                    {/* Priority Level */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <ShieldCheck size={13} className="text-orange-500" />
                                            <span>Priority Level</span>
                                        </label>
                                        <select 
                                            value={workOrderForm.priority}
                                            onChange={(e) => setWorkOrderForm({ ...workOrderForm, priority: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all cursor-pointer shadow-xs"
                                        >
                                            <option value="critical">Critical (Immediate Danger / Safety Hazard)</option>
                                            <option value="high">High (Urgent Infrastructure Repair)</option>
                                            <option value="normal">Normal (Standard Dispatch SLA)</option>
                                            <option value="low">Low (Routine Maintenance Sweep)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Task Title */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                        <Wrench size={13} className="text-orange-500" />
                                        <span>Work Order Task Title</span>
                                    </label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder={`e.g. Repair ${selectedReport.report_type || selectedReport.issue || 'damaged infrastructure'}`}
                                        value={workOrderForm.title}
                                        onChange={(e) => setWorkOrderForm({ ...workOrderForm, title: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all shadow-xs"
                                    />
                                </div>

                                {/* Instructions & Action Plan */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                        <FileText size={13} className="text-orange-500" />
                                        <span>Dispatcher Instructions & Action Plan</span>
                                    </label>
                                    <textarea 
                                        rows="3"
                                        placeholder="Specify field instructions, required heavy equipment, safety perimeters, or coordinate notes..."
                                        value={workOrderForm.description}
                                        onChange={(e) => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all shadow-xs resize-none"
                                    ></textarea>
                                </div>

                                {/* Information Notice Strip */}
                                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-slate-700 dark:text-slate-300 text-[11px] flex items-start gap-2.5">
                                    <Sparkles size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                    <div className="leading-relaxed">
                                        Executing dispatch sets report status to <strong className="text-orange-600 dark:text-orange-400 font-bold">In Progress</strong>, logs an audit trail event, and synchronizes across the Tactical GIS Command Map and field crew tablets.
                                    </div>
                                </div>

                                {/* Footer Controls */}
                                <div className="pt-2 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => setIsWorkOrderModalOpen(false)}
                                        disabled={isSubmittingWo}
                                        className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isSubmittingWo}
                                        className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
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
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
