import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    ClipboardList, Wrench, Building2, MapPin, BarChart2,
    Users, Settings, ChevronLeft, ChevronRight, Search,
    Bell, Check, AlertTriangle, ShieldCheck, Clock, CheckSquare,
    Square, ChevronDown, Filter, X, Copy, ExternalLink,
    MessageSquare, Phone, Flag, Shield, Lock, FileText,
    Share2, Pin, PinOff, Eye, RefreshCw, Layers, ArrowUpRight,
    Bookmark
} from 'lucide-react';
import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import GovSidebar from '../components/GovSidebar';
import OrangeSelect from '../components/OrangeSelect';
import Swal from 'sweetalert2';
import { getAuthToken, getAuthUser } from '../utils/authSession';

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
        steps: [
            { id: 'received', label: 'Received', time: '8:12 AM Today', icon: 'mail', completed: true },
            { id: 'verified', label: 'Verified', time: '8:27 AM Today', icon: 'shield', completed: true, active: true },
            { id: 'assigned', label: 'Assigned', time: '8:35 AM Today', icon: 'user', completed: true },
            { id: 'in_progress', label: 'In progress', time: '—', icon: 'wrench', completed: false },
            { id: 'resolved', label: 'Resolved', time: '—', icon: 'check', completed: false }
        ],
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
        steps: [
            { id: 'received', label: 'Received', time: '7:40 AM Today', icon: 'mail', completed: true },
            { id: 'verified', label: 'Verified', time: '8:05 AM Today', icon: 'shield', completed: true },
            { id: 'assigned', label: 'Assigned', time: '8:15 AM Today', icon: 'user', completed: true, active: true },
            { id: 'in_progress', label: 'In progress', time: '—', icon: 'wrench', completed: false },
            { id: 'resolved', label: 'Resolved', time: '—', icon: 'check', completed: false }
        ],
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
        steps: [
            { id: 'received', label: 'Received', time: '6:30 AM Today', icon: 'mail', completed: true },
            { id: 'verified', label: 'Verified', time: '6:50 AM Today', icon: 'shield', completed: true },
            { id: 'assigned', label: 'Assigned', time: '7:10 AM Today', icon: 'user', completed: true },
            { id: 'in_progress', label: 'In progress', time: '7:30 AM Today', icon: 'wrench', completed: true, active: true },
            { id: 'resolved', label: 'Resolved', time: '—', icon: 'check', completed: false }
        ],
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
        steps: [
            { id: 'received', label: 'Received', time: '5:45 AM Today', icon: 'mail', completed: true, active: true },
            { id: 'verified', label: 'Verified', time: '—', icon: 'shield', completed: false },
            { id: 'assigned', label: 'Assigned', time: '—', icon: 'user', completed: false },
            { id: 'in_progress', label: 'In progress', time: '—', icon: 'wrench', completed: false },
            { id: 'resolved', label: 'Resolved', time: '—', icon: 'check', completed: false }
        ],
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
        steps: [
            { id: 'received', label: 'Received', time: 'Yesterday 4:00 PM', icon: 'mail', completed: true },
            { id: 'verified', label: 'Verified', time: 'Yesterday 4:20 PM', icon: 'shield', completed: true },
            { id: 'assigned', label: 'Assigned', time: 'Yesterday 5:00 PM', icon: 'user', completed: true },
            { id: 'in_progress', label: 'In progress', time: 'Yesterday 6:00 PM', icon: 'wrench', completed: true },
            { id: 'resolved', label: 'Resolved', time: 'Today 5:30 AM', icon: 'check', completed: true, active: true }
        ],
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

    // ── Sidebar collapse state ──
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // ── Reports & Selection state ──
    const [reports, setReports] = useState(INITIAL_REPORTS);
    const [selectedReportId, setSelectedReportId] = useState(INITIAL_REPORTS[0].id);
    const [selectedRowIds, setSelectedRowIds] = useState([INITIAL_REPORTS[0].id]);
    const [isPinned, setIsPinned] = useState(false);

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
    const [workOrderTeam, setWorkOrderTeam] = useState('Electrical Maintenance Division');

    const searchInputRef = useRef(null);

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

    // ── Attempt live API fetch if token exists ──
    useEffect(() => {
        const fetchLiveReports = async () => {
            const token = getAuthToken();
            if (!token) return;
            try {
                const res = await fetch(`http://localhost:33159/api/reports?limit=50&t=${Date.now()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const mapped = data.map((r, index) => ({
                            id: r.id || index + 10,
                            ticket_id: r.ticket_id || `PUL-2026-${String(r.id).padStart(4, '0')}`,
                            issue: r.description || r.category || 'Citizen reported issue',
                            barangay: r.barangay ? `Barangay ${r.barangay.replace(/[^0-9]/g, '')}` : 'Barangay 176',
                            district: 'North Caloocan',
                            severity: r.urgency === 'critical' ? 'Critical' : r.urgency === 'high' ? 'High' : 'Medium',
                            status: r.status === 'verified' ? 'Verified' :
                                    r.status === 'assigned' ? 'Assigned' :
                                    r.status === 'in_progress' || r.status === 'dispatched' ? 'In progress' :
                                    r.status === 'resolved' ? 'Resolved' : 'Received',
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
                                r.image_url.startsWith('http') ? r.image_url : `http://localhost:33159${r.image_url}`
                            ] : INITIAL_REPORTS[0].evidence,
                            steps: [
                                { id: 'received', label: 'Received', time: 'Today', completed: true },
                                { id: 'verified', label: 'Verified', time: r.status !== 'unverified' ? 'Today' : '—', completed: r.status !== 'unverified' },
                                { id: 'assigned', label: 'Assigned', time: ['assigned', 'in_progress', 'resolved'].includes(r.status) ? 'Today' : '—', completed: ['assigned', 'in_progress', 'resolved'].includes(r.status) },
                                { id: 'in_progress', label: 'In progress', time: ['in_progress', 'resolved'].includes(r.status) ? 'Today' : '—', completed: ['in_progress', 'resolved'].includes(r.status) },
                                { id: 'resolved', label: 'Resolved', time: r.status === 'resolved' ? 'Today' : '—', completed: r.status === 'resolved' }
                            ],
                            activity: INITIAL_REPORTS[0].activity
                        }));
                        setReports(mapped);
                        setSelectedReportId(mapped[0].id);
                        setSelectedRowIds([mapped[0].id]);
                    }
                }
            } catch { /* Fallback to rich reference data */ }
        };
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

    // ── Action Handlers ──
    const handleAssignWorkOrder = () => {
        Swal.fire({
            title: 'Assign Work Order',
            html: `
                <div style="text-align: left; font-size: 13px;">
                    <p style="margin-bottom: 8px;"><strong>Ticket:</strong> ${selectedReport.ticket_id}</p>
                    <p style="margin-bottom: 12px;"><strong>Issue:</strong> ${selectedReport.issue}</p>
                    <label style="display:block; font-weight: bold; margin-bottom: 4px;">Assign To Maintenance Team:</label>
                    <select id="swal-team-select" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 12px;">
                        <option value="Electrical Maintenance Division">Electrical Maintenance Division</option>
                        <option value="Road Repair & Asphalt Crew">Road Repair & Asphalt Crew</option>
                        <option value="Drainage & Flood Control Unit">Drainage & Flood Control Unit</option>
                        <option value="Building Safety Inspection Office">Building Safety Inspection Office</option>
                    </select>
                    <label style="display:block; font-weight: bold; margin-bottom: 4px;">Priority Level:</label>
                    <select id="swal-priority-select" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        <option value="immediate">Immediate Dispatch (< 2 hrs)</option>
                        <option value="high" selected>High Priority (Within 24 hrs)</option>
                        <option value="scheduled">Scheduled Routine</option>
                    </select>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Create & Dispatch Work Order',
            confirmButtonColor: '#ff6b00',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                // Update report status
                setReports(prev => prev.map(r => {
                    if (r.id === selectedReport.id) {
                        return {
                            ...r,
                            status: 'Assigned',
                            updated: 'Just now',
                            activity: [
                                {
                                    id: Date.now(),
                                    icon: Users,
                                    color: 'text-emerald-500',
                                    title: `Assigned to ${document.getElementById('swal-team-select')?.value || 'Maintenance Team'}`,
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    desc: 'Official work order dispatched via PULSO Command.'
                                },
                                ...r.activity
                            ]
                        };
                    }
                    return r;
                }));
                Swal.fire({
                    icon: 'success',
                    title: 'Work Order Assigned!',
                    text: `Work order dispatched for ${selectedReport.ticket_id}`,
                    confirmButtonColor: '#ff6b00'
                });
            }
        });
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

            {/* ═══════════════════════════════════════════════════════════════════
                1. LEFT SIDEBAR (Dark Navy, Orange Active Accents, Collapsible)
            ══════════════════════════════════════════════════════════════════════ */}
            {/* ═══════════════════════════════════════════════════════════════════
                1. LEFT SIDEBAR (Shared GovSidebar: 7 Primary Items, PULSO Theme)
            ══════════════════════════════════════════════════════════════════════ */}
            <GovSidebar currentUser={currentUser} />

            {/* ═══════════════════════════════════════════════════════════════════
                MAIN VIEWPORT (Top Bar + Filter Bar + Table + Right Detail Panel)
            ══════════════════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">

                {/* ─────────────────────────────────────────────────────────────
                    2. TOP BAR
                ────────────────────────────────────────────────────────────── */}
                <header className="h-20 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800/80 px-6 flex items-center justify-between z-20">
                    {/* Left: Breadcrumbs + Title */}
                    <div>
                        <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                            <Link to="/gov/my-dashboard" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Home</Link>
                            <span>/</span>
                            <span className="text-slate-500 dark:text-slate-400">Reports</span>
                            <span>/</span>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold">Citizen reports</span>
                        </nav>
                        <h1 className="font-heading font-black text-2xl sm:text-[26px] text-slate-900 dark:text-white tracking-tight leading-none mt-1">
                            Citizen reports
                        </h1>
                    </div>

                    {/* Right: Controls & User cluster */}
                    <div className="flex items-center gap-3">
                        {/* District Filter Dropdown */}
                        <div className="relative">
                            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                                <MapPin size={14} className="text-[#ff6b00]" />
                                <span>{districtFilter}</span>
                                <ChevronDown size={14} className="text-slate-400" />
                            </div>
                        </div>

                        {/* Search Input with '/' shortcut */}
                        <div className="relative w-64">
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
                        <ThemeToggle />

                        {/* User Avatar + Role Dropdown */}
                        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0a1324] to-[#1e293b] text-white flex items-center justify-center text-xs font-heading font-black border border-slate-300 dark:border-slate-700 shadow-xs">
                                AR
                            </div>
                            <div className="hidden lg:flex flex-col text-left leading-tight">
                                <span className="font-heading font-bold text-xs text-slate-900 dark:text-white">
                                    {currentUser.name}
                                </span>
                                <span className="text-[10px] font-mono-data text-[#ff6b00] font-semibold">
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
                <div className="h-14 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between text-xs font-medium relative z-40 overflow-visible">
                    <div className="flex items-center gap-2.5 py-2 overflow-visible">
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
                <div className="flex-1 flex overflow-hidden p-6 gap-6">

                    {/* ── LEFT: REPORTS TABLE ────────────────────────────────── */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-[#090e1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden min-w-[500px]">

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

                                                {/* Status Badge (PULSO Tokens) */}
                                                <td className="py-4 px-3 whitespace-nowrap">
                                                    {report.status === 'Verified' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] border border-orange-200 dark:border-orange-800/60">
                                                            <ShieldCheck size={13} className="shrink-0" />
                                                            <span>Verified</span>
                                                        </span>
                                                    )}
                                                    {report.status === 'Assigned' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                                            <CheckSquare size={13} className="shrink-0" />
                                                            <span>Assigned</span>
                                                        </span>
                                                    )}
                                                    {report.status === 'In progress' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60">
                                                            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
                                                            <span>In progress</span>
                                                        </span>
                                                    )}
                                                    {report.status === 'Received' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                            <span>Received</span>
                                                        </span>
                                                    )}
                                                    {report.status === 'Resolved' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60">
                                                            <Check size={13} className="shrink-0" />
                                                            <span>Resolved</span>
                                                        </span>
                                                    )}
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
                        <aside className="w-[430px] shrink-0 bg-white dark:bg-[#090e1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">

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
                                                onClick={() => navigate('/dispatcher')}
                                                title="Open in Full GIS Command Map"
                                                className="absolute bottom-1.5 right-1.5 p-1 bg-white/90 dark:bg-slate-900/90 rounded border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-[#ff6b00] cursor-pointer"
                                            >
                                                <ArrowUpRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Pulseline Status (Horizontal Step Tracker) ── */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-[11px] font-heading font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                                        Pulseline status
                                    </div>

                                    <div className="relative flex items-center justify-between w-full px-2 py-1">
                                        {/* Connector Line Background */}
                                        <div className="absolute top-4 left-4 right-4 h-[2px] bg-slate-200 dark:bg-slate-700 z-0" />

                                        {/* Steps */}
                                        {selectedReport.steps.map((step, idx) => (
                                            <div key={step.id} className="relative z-10 flex flex-col items-center">
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
                                                <span className={`text-[10px] font-heading font-bold mt-1.5 ${
                                                    step.active ? 'text-[#ff6b00]' : 'text-slate-700 dark:text-slate-300'
                                                }`}>
                                                    {step.label}
                                                </span>

                                                {/* Timestamp */}
                                                <span className="text-[9px] font-mono-data text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                    {step.time}
                                                </span>
                                            </div>
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
                            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50">
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
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-heading font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                    <MessageSquare size={14} />
                                    <span>Request changes</span>
                                </button>

                                {/* 2. Assign Work Order (PULSO Orange Primary) */}
                                <button
                                    type="button"
                                    onClick={handleAssignWorkOrder}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-heading font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                                >
                                    <Wrench size={14} />
                                    <span>Assign work order</span>
                                </button>

                                {/* 3. Escalate (Red/Destructive Outline) */}
                                <button
                                    type="button"
                                    onClick={handleEscalateReport}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-heading font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
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

        </div>
    );
}
