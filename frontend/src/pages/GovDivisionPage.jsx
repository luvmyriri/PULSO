/**
 * GovDivisionPage.jsx
 * Generic division-level page template for all City Engineering Office sub-divisions.
 * Used for routes like /gov/work-orders, /gov/projects, /gov/obo, /gov/procurement, etc.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
    GitBranch, Map, Building2, ShieldCheck, PackageCheck,
    ClipboardList, Ruler, Eye, HardHat, Wrench, FileBarChart2,
    Clock, CheckCircle2, AlertTriangle, Users, Plus, Filter,
    Search, ChevronRight, Activity, FileCheck, ArrowRight,
    BookOpen, UserCog, Settings, FlaskConical, Bell, Globe,
    Shield, Database, RefreshCw, Monitor, Lock, Server, User,
    ChevronDown, Check, X
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';

const API_BASE = 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// OrangeSelect — custom styled dropdown replacing native <select>
// ─────────────────────────────────────────────────────────────────────────────
const OrangeSelect = ({ value, onChange, options, placeholder = 'Select…', minWidth = '160px' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selected = options.find(o => o.value === value);

    return (
        <div ref={ref} className="relative" style={{ minWidth }}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(p => !p)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                    open
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-300 shadow-sm shadow-orange-500/10'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
            >
                <span className="truncate">{selected ? selected.label : placeholder}</span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform duration-200 ${
                        open ? 'rotate-180 text-orange-500' : 'text-slate-400'
                    }`}
                />
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute top-full left-0 mt-1.5 w-full z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                    {/* Orange top accent line */}
                    <div className="h-0.5 bg-gradient-to-r from-orange-400 to-orange-600" />
                    <div className="py-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                        {options.map(opt => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                                        isSelected
                                            ? 'bg-orange-50 dark:bg-orange-900/25 text-orange-700 dark:text-orange-300 font-bold'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-orange-50/60 dark:hover:bg-orange-900/10 hover:text-orange-600 dark:hover:text-orange-400 font-medium'
                                    }`}
                                >
                                    <span>{opt.label}</span>
                                    {isSelected && <Check size={13} className="text-orange-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};


// ─────────────────────────────────────────────────────────────────────────────
// Page config map: route → UI metadata + content
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_CONFIG = {
    '/gov/work-orders': {
        title: 'Work Orders',
        subtitle: 'Track and manage all engineering work orders assigned across field teams.',
        icon: GitBranch,
        color: 'blue',
        apiPath: '/api/gov/work-orders',
        statuses: ['pending','assigned','in_progress','completed','cancelled'],
    },
    '/gov/projects': {
        title: 'LGU Infrastructure Projects',
        subtitle: 'Monitor all 6-phase infrastructure projects from request to certified completion.',
        icon: Map,
        color: 'indigo',
        apiPath: '/api/gov/projects',
        statuses: ['request_received','survey_in_progress','design_in_progress','approved_by_city_engineer','in_progress','resolved','closed_completion_certified'],
    },
    '/gov/obo': {
        title: 'OBO Inspections',
        subtitle: 'Office of the Building Official — building, electrical & mechanical permit applications.',
        icon: ShieldCheck,
        color: 'teal',
        apiPath: '/api/gov/obo',
        statuses: ['application_received','inspection_scheduled','inspection_complete','permit_issued','failed_inspection'],
    },
    '/gov/procurement': {
        title: 'Procurement Requests',
        subtitle: 'RA 9184 compliant procurement workflow from draft to awarded bid.',
        icon: PackageCheck,
        color: 'violet',
        apiPath: '/api/gov/procurement',
        statuses: ['draft','submitted','validated','sent_to_procurement'],
    },
    '/gov/timeline': {
        title: 'Process Timeline',
        subtitle: 'Full lifecycle audit trail for all reports, work orders and projects.',
        icon: Activity,
        color: 'orange',
        apiPath: '/api/gov/timeline',
        statuses: [],
    },
    '/gov/audit-logs': {
        title: 'Audit Logs',
        subtitle: 'Immutable audit trail for all government actions in the system (FR-10).',
        icon: FileCheck,
        color: 'red',
        apiPath: '/api/gov/audit-logs',
        statuses: [],
    },
    '/gov/records': {
        title: 'Records & Registry',
        subtitle: 'Administrative records management for the City Engineering Office.',
        icon: BookOpen,
        color: 'purple',
        apiPath: '/api/gov/records',
        statuses: [],
    },

    '/gov/design-requests': {
        title: 'Design Requests',
        subtitle: 'Active design and planning requests across infrastructure project phases.',
        icon: Ruler,
        color: 'indigo',
        apiPath: '/api/gov/design-requests',
        statuses: ['request_received','survey_in_progress','design_in_progress','approved_by_city_engineer'],
    },
    '/gov/analysis': {
        title: 'Structure Analysis',
        subtitle: 'Structural and civil engineering analysis queue from active project phases.',
        icon: FlaskConical,
        color: 'blue',
        apiPath: '/api/gov/analysis',
        statuses: ['survey_in_progress','design_in_progress','approved_by_city_engineer'],
    },
    '/gov/surveys': {
        title: 'Field Surveys',
        subtitle: 'Geodetic and civil engineering field survey assignments and results.',
        icon: Eye,
        color: 'green',
        apiPath: '/api/gov/surveys',
        statuses: ['assigned','in_progress','survey_in_progress'],
    },
    '/gov/boq': {
        title: 'Bill of Quantities',
        subtitle: 'Material and labor cost estimates across all active procurement requests.',
        icon: ClipboardList,
        color: 'amber',
        apiPath: '/api/gov/boq',
        statuses: [],
    },
    '/gov/estimation': {
        title: 'Cost Estimation',
        subtitle: 'Aggregated BoQ cost estimates per procurement request. RA 9184 compliant.',
        icon: PackageCheck,
        color: 'violet',
        apiPath: '/api/gov/estimation',
        statuses: ['draft','submitted','validated','sent_to_procurement'],
    },
    '/gov/reports-archive': {
        title: 'Reports Archive',
        subtitle: 'Closed, resolved, and rejected citizen infrastructure reports for administrative records.',
        icon: FileBarChart2,
        color: 'purple',
        apiPath: '/api/gov/reports-archive',
        statuses: ['resolved','rejected','closed'],
    },
    '/gov/users': {
        title: 'Role Management',
        subtitle: 'Assign and manage Plantilla position roles for all LGU system users.',
        icon: UserCog,
        color: 'slate',
        apiPath: '/api/gov/users',
        statuses: [],
    },
    '/gov/settings': {
        title: 'System Settings',
        subtitle: 'Configure system parameters for the PULSO platform.',
        icon: Settings,
        color: 'slate',
        apiPath: null,
        statuses: [],
    },
};

// Status badge colors
const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    request_received: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    survey_in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    design_in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    approved_by_city_engineer: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed_completion_certified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    application_received: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    inspection_scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    inspection_complete: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    permit_issued: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed_inspection: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    submitted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    validated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    sent_to_procurement: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const colorMap = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', icon: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', icon: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', icon: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', icon: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600' },
    red: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', icon: 'bg-red-100 dark:bg-red-900/40 text-red-600' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', icon: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600' },
    green: { bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800', icon: 'bg-green-100 dark:bg-green-900/40 text-green-600' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' },
    slate: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-800', icon: 'bg-slate-100 dark:bg-slate-800 text-slate-600' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Generic Row renderer for list items
// ─────────────────────────────────────────────────────────────────────────────
const ItemRow = ({ item, path, onView }) => {
    const idKey = item.wo_number || item.project_number || item.pr_number || item.obo_number || `#${item.id}`;
    const title = item.title || item.description?.substring(0, 60) || item.scope_of_work?.substring(0, 60) || item.project_name || item.building_name || idKey;
    const status = item.status || 'unknown';
    const statusClass = STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('en-PH') : '—';

    return (
        <tr onClick={() => onView?.(item)} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer">
            <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">{idKey}</td>
            <td className="p-4">
                <div className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-xs">{title}</div>
                {item.barangay && <div className="text-xs text-slate-500">Brgy {item.barangay}</div>}
                {item.location && <div className="text-xs text-slate-500">{item.location}</div>}
            </td>
            <td className="p-4">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                    {status.replace(/_/g, ' ')}
                </span>
            </td>
            <td className="p-4 text-xs text-slate-500">{date}</td>
            <td className="p-4 text-right">
                <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                    View <ArrowRight size={12} />
                </button>
            </td>
        </tr>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Event Component (FR-14)
// ─────────────────────────────────────────────────────────────────────────────
const TimelineEvent = ({ entry }) => {
    let contextLabel = 'System Event';
    let contextColor = 'bg-slate-500';

    if (entry.report_id) {
        contextLabel = `Citizen Report #${entry.report_id}`;
        contextColor = 'bg-rose-500';
    } else if (entry.work_order_id) {
        contextLabel = `Work Order #${entry.work_order_id}`;
        contextColor = 'bg-blue-500';
    } else if (entry.project_id) {
        contextLabel = `Project #${entry.project_id}`;
        contextColor = 'bg-indigo-500';
    }

    const statusText = (entry.status || '').replace(/_/g, ' ').toUpperCase();
    const dateObj = entry.created_at ? new Date(entry.created_at) : new Date();
    const dateStr = dateObj.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="relative pl-8 sm:pl-32 py-4 group">
            <div className="hidden sm:block absolute left-0 top-6 w-24 text-right">
                <div className="text-xs font-bold text-slate-900 dark:text-white">{dateStr}</div>
                <div className="text-[10px] text-slate-500">{timeStr}</div>
            </div>

            <div className="absolute left-0 sm:left-28 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 min-h-[100px] group-last:h-full"></div>
            <div className={`absolute left-[-4px] sm:left-[108px] top-7 w-2.5 h-2.5 rounded-full ${contextColor} ring-4 ring-white dark:ring-slate-900 z-10 shadow-sm`}></div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase text-white ${contextColor}`}>
                            {contextLabel}
                        </span>
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <span className="text-slate-300 dark:text-slate-700">→</span>
                            <span className="text-slate-900 dark:text-slate-200">{statusText}</span>
                        </span>
                    </div>
                    <div className="sm:hidden text-[10px] font-medium text-slate-400">
                        {dateStr} • {timeStr}
                    </div>
                </div>
                
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
                    {entry.note || `Status updated to ${statusText.toLowerCase()}`}
                </p>
                
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-500 dark:text-slate-400 shrink-0">
                            {(entry.actor_name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            {entry.actor_name || 'System Automated'}
                            {entry.actor_role && <span className="text-slate-400 dark:text-slate-500"> • {entry.actor_role.replace(/_/g, ' ')}</span>}
                        </div>
                    </div>
                    {entry.previous_status && (
                        <div className="text-[10px] text-slate-400 italic hidden sm:block">
                            Prev: {entry.previous_status.replace(/_/g, ' ')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Record log row (Records & Registry)
// ─────────────────────────────────────────────────────────────────────────────
const RecordRow = ({ entry }) => {
    let typeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (entry.record_type.includes('Completion')) typeColor = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400';
    else if (entry.record_type.includes('Permit')) typeColor = 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400';
    else if (entry.record_type.includes('Award')) typeColor = 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400';

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group text-sm">
            <td className="p-4">
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">{entry.record_id}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Ref: {entry.reference_no}</div>
            </td>
            <td className="p-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${typeColor}`}>
                    {entry.record_type}
                </span>
            </td>
            <td className="p-4">
                <div className="font-bold text-slate-900 dark:text-white max-w-sm truncate">{entry.title_or_applicant}</div>
            </td>
            <td className="p-4 text-xs text-slate-500">
                {entry.date_issued ? new Date(entry.date_issued).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </td>
            <td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-400">{entry.issued_by_name}</td>
            <td className="p-4 text-right">
                <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                    Open <ArrowRight size={12} />
                </button>
            </td>
        </tr>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Audit log row
// ─────────────────────────────────────────────────────────────────────────────
const AuditRow = ({ entry }) => (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-xs">
        <td className="p-3 font-mono text-slate-500">{entry.id}</td>
        <td className="p-3 font-bold text-slate-900 dark:text-white">{entry.action}</td>
        <td className="p-3">
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">{entry.trigger_type}</span>
        </td>
        <td className="p-3 text-slate-500">{entry.actor_id ? `User #${entry.actor_id}` : 'System'}</td>
        <td className="p-3 text-slate-500">{entry.created_at ? new Date(entry.created_at).toLocaleString('en-PH') : '—'}</td>
    </tr>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
const GovDivisionPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [token] = useState(() => localStorage.getItem('pulso_token'));
    const [currentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }
    });
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [trustFilter, setTrustFilter] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [savingRole, setSavingRole] = useState(false);
    const [page, setPage] = useState(1);
    const [jurisdictionMode, setJurisdictionMode] = useState('strict'); // strict or emergency
    const [selectedItem, setSelectedItem] = useState(null);
    const [showNewModal, setShowNewModal] = useState(false);
    const ITEMS_PER_PAGE = 10;


    const config = PAGE_CONFIG[location.pathname] || {
        title: 'Division Page',
        subtitle: 'City Engineering Office module',
        icon: HardHat,
        color: 'slate',
        apiPath: null,
        statuses: [],
    };

    const colors = colorMap[config.color] || colorMap.slate;
    const Icon = config.icon;

    useEffect(() => {
        if (!token || !currentUser) { navigate('/gov'); return; }
        if (!config.apiPath) return;
        setLoading(true);
        const params = statusFilter ? `?status=${statusFilter}` : '';
        fetch(`${API_BASE}${config.apiPath}${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.ok ? r.json() : [])
        .then(data => setItems(Array.isArray(data) ? data : []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, [location.pathname, statusFilter, token]);

    const filtered = items.filter(item => {
        const s = search.toLowerCase();
        const matchesSearch = !search || (
            (item.title || '').toLowerCase().includes(s) ||
            (item.description || '').toLowerCase().includes(s) ||
            (item.wo_number || '').toLowerCase().includes(s) ||
            (item.project_number || '').toLowerCase().includes(s) ||
            (item.pr_number || '').toLowerCase().includes(s) ||
            (item.obo_number || '').toLowerCase().includes(s) ||
            (item.status || '').toLowerCase().includes(s) ||
            (item.action || '').toLowerCase().includes(s) ||
            (item.record_id || '').toLowerCase().includes(s) ||
            (item.record_type || '').toLowerCase().includes(s) ||
            (item.title_or_applicant || '').toLowerCase().includes(s) ||
            (item.issued_by_name || '').toLowerCase().includes(s) ||
            (item.full_name || '').toLowerCase().includes(s) ||
            (item.email || '').toLowerCase().includes(s) ||
            (item.barangay || '').toLowerCase().includes(s) ||
            (item.role || '').toLowerCase().includes(s)
        );
        const matchesRole = !roleFilter || item.role === roleFilter;
        const matchesTrust = !trustFilter || (
            trustFilter === '100' ? (item.trust_score ?? 100) === 100 :
            trustFilter === '90' ? (item.trust_score ?? 100) >= 90 && (item.trust_score ?? 100) < 100 :
            trustFilter === '70' ? (item.trust_score ?? 100) >= 70 && (item.trust_score ?? 100) < 90 :
            trustFilter === 'low' ? (item.trust_score ?? 100) < 70 : true
        );
        
        let matchesJurisdiction = true;
        const IS_FIELD_ENGINEER = ['project_engineer', 'design_engineer', 'estimator', 'cad_operator', 'construction_foreman', 'building_inspector', 'electrical_inspector', 'mechanical_inspector'].includes(currentUser?.role);
        if (IS_FIELD_ENGINEER && jurisdictionMode === 'strict' && currentUser?.barangay) {
            const targetBg = currentUser.barangay.replace(/\D/g, ''); 
            const itemString = ((item.barangay || '') + ' ' + (item.location_string || '')).toLowerCase();
            if (itemString.trim() !== '' && targetBg !== '') {
                if (!itemString.includes(targetBg) && !itemString.includes(currentUser.barangay.toLowerCase())) {
                    matchesJurisdiction = false;
                }
            }
        }
        
        return matchesSearch && matchesRole && matchesTrust && matchesJurisdiction;
    });


    const isAuditLog = location.pathname === '/gov/audit-logs';
    const isTimeline = location.pathname === '/gov/timeline';
    const isRecords = location.pathname === '/gov/records';
    const isStatic = !config.apiPath;
    const isSettings = location.pathname === '/gov/settings';
    const isUsers = location.pathname === '/gov/users';

    // Pagination — computed after route flags are known
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const GOV_ROLE_OPTIONS = [
        'city_engineer','asst_city_engineer','admin_officer','admin_clerk',
        'records_officer','division_chief','design_engineer','estimator',
        'cad_operator','project_engineer','construction_foreman','field_worker',
        'building_inspector','electrical_inspector','mechanical_inspector',
        'dispatcher','manager','system_admin','resident',
    ];

    // Title-case helper: "city_engineer" → "City Engineer"
    const toTitleCase = str => str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Reset page when filters/search change
    useEffect(() => { setPage(1); }, [search, roleFilter, trustFilter, statusFilter, location.pathname]);

    const activeFilterCount = [roleFilter, trustFilter].filter(Boolean).length;

    // Role-change handler for /gov/users
    const handleRoleChange = async (userId, newRole) => {
        setSavingRole(true);
        try {
            const res = await fetch(`${API_BASE}/api/gov/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) {
                setItems(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
                setEditingUser(null);
            }
        } finally { setSavingRole(false); }
    };

    // Settings panels state
    const [notifSettings, setNotifSettings] = React.useState({ email: true, sms: false, inApp: true, digest: true });
    const [settingsSaved, setSettingsSaved] = React.useState(false);
    const saveSettings = () => { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2500); };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-300 font-sans flex text-sm">
            <GovSidebar currentUser={currentUser} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900/80 flex items-center justify-between px-8 shrink-0 border-b border-slate-100 dark:border-slate-800 z-40">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.icon}`}>
                            <Icon size={18} />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-slate-900 dark:text-white leading-tight">{config.title}</h1>
                            <p className="text-[11px] text-slate-500 hidden sm:block">{config.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setLoading(true); fetch(`${API_BASE}${config.apiPath}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).then(data => setItems(Array.isArray(data) ? data : [])).catch(() => setItems([])).finally(() => setLoading(false)); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600 transition-all"
                            title="Refresh"
                        >
                            <RefreshCw size={14} />
                        </button>
                        {config.apiPath && !isAuditLog && !isTimeline && (
                            <button
                                onClick={() => setShowNewModal(true)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-colors bg-indigo-600 hover:bg-indigo-700`}
                            >
                                <Plus size={14} /> New
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full mx-auto space-y-4">

                        {/* Settings Page — Full UI */}
                        {isSettings && (
                            <div className="space-y-6">
                                {/* System Info Card */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <Server size={18} className="text-slate-500" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-slate-900 dark:text-white text-base">System Information</h2>
                                            <p className="text-xs text-slate-500">Read-only platform environment details</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { label: 'Platform', value: 'PULSO — City Engineering Office', icon: Globe },
                                            { label: 'Version', value: 'v2.4.1 (Production)', icon: Monitor },
                                            { label: 'Environment', value: 'Caloocan City, Metro Manila', icon: Shield },
                                            { label: 'Database', value: 'PostgreSQL 15 (Active)', icon: Database },
                                            { label: 'API Status', value: 'All systems operational', icon: Server },
                                            { label: 'Last Sync', value: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }), icon: RefreshCw },
                                        ].map(({ label, value, icon: InfoIcon }) => (
                                            <div key={label} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <InfoIcon size={15} className="text-slate-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{label}</div>
                                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{value}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Notification Preferences */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                            <Bell size={18} className="text-indigo-500" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-slate-900 dark:text-white text-base">Notification Preferences</h2>
                                            <p className="text-xs text-slate-500">Choose how you receive system alerts</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'email', label: 'Email Notifications', desc: 'Receive alerts at your registered email address' },
                                            { key: 'sms', label: 'SMS Alerts', desc: 'Get urgent notifications via SMS (requires phone number)' },
                                            { key: 'inApp', label: 'In-App Notifications', desc: 'Show notification badge and bell alerts in PULSO' },
                                            { key: 'digest', label: 'Daily Digest', desc: 'Morning summary of all pending actions and updates' },
                                        ].map(({ key, label, desc }) => (
                                            <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white">{label}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                                                </div>
                                                <button
                                                    onClick={() => setNotifSettings(p => ({ ...p, [key]: !p[key] }))}
                                                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                                                        notifSettings[key] ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                                                    }`}
                                                >
                                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
                                                        notifSettings[key] ? 'left-[22px]' : 'left-0.5'
                                                    }`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={saveSettings}
                                        className={`mt-4 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                            settingsSaved
                                                ? 'bg-green-500 text-white'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        }`}
                                    >
                                        {settingsSaved ? '✓ Saved' : 'Save Preferences'}
                                    </button>
                                </div>

                                {/* Security Settings */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                                            <Lock size={18} className="text-red-500" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-slate-900 dark:text-white text-base">Security &amp; Access</h2>
                                            <p className="text-xs text-slate-500">Account security options for your government profile</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-white">Signed-in as</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">{currentUser?.email || '—'}</div>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full">
                                                {currentUser?.role?.replace(/_/g, ' ') || 'Staff'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => { localStorage.clear(); navigate('/gov'); }}
                                            className="w-full flex items-center gap-3 p-4 rounded-xl border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-bold"
                                        >
                                            <Lock size={15} />
                                            Sign out of PULSO (all sessions)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Static placeholder for pages without an API path */}
                        {isStatic && !isSettings && (
                            <div className={`rounded-2xl border p-10 text-center ${colors.bg} ${colors.border}`}>
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${colors.icon}`}>
                                    <Icon size={32} />
                                </div>
                                <h2 className={`text-2xl font-black mb-2 ${colors.text}`}>{config.title}</h2>
                                <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">This module is currently under development. Please check back later for updates or contact the system administrator.</p>
                                <div className="mt-6 flex gap-3 justify-center flex-wrap">
                                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                                        ← Go Back
                                    </button>
                                    <button onClick={() => navigate('/gov/my-dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors shadow-sm">
                                        My Dashboard
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* API-backed pages */}
                        {config.apiPath && (
                            <>
                                {/* Filters */}

                                <div className="flex items-center gap-3 flex-wrap">

                                    {/* Search */}

                                    <div className="relative flex-1 min-w-48">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder={isUsers ? 'Search by name, email, role, barangay…' : `Search ${config.title.toLowerCase()}...`}
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                                        />
                                    </div>
                                    
                                    {/* J-ABAC Jurisdiction Toggle (Engineers Only) */}
                                    {['project_engineer', 'design_engineer', 'estimator', 'cad_operator', 'construction_foreman', 'building_inspector', 'electrical_inspector', 'mechanical_inspector'].includes(currentUser?.role) && currentUser?.barangay && (
                                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
                                            <button
                                                onClick={() => setJurisdictionMode('strict')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${jurisdictionMode === 'strict' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                            >
                                                My Jurisdiction
                                            </button>
                                            <button
                                                onClick={() => setJurisdictionMode('emergency')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${jurisdictionMode === 'emergency' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:text-red-500'}`}
                                            >
                                                <AlertTriangle size={12} />
                                                Emergency Access
                                            </button>
                                        </div>
                                    )}



                                     {/* Status filter — for non-user pages */}

                                     {config.statuses.length > 0 && !isUsers && (

                                         <OrangeSelect

                                             value={statusFilter}

                                             onChange={v => setStatusFilter(v)}

                                             placeholder="All Statuses"

                                             minWidth="180px"

                                             options={[

                                                 { value: '', label: 'All Statuses' },

                                                 ...config.statuses.map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))

                                             ]}

                                         />

                                     )}



                                     {/* Users-specific filters */}

                                     {isUsers && (

                                         <>

                                             <OrangeSelect

                                                 value={roleFilter}

                                                 onChange={v => setRoleFilter(v)}

                                                 placeholder="All Roles"

                                                 minWidth="190px"

                                                 options={[

                                                     { value: '', label: 'All Roles' },

                                                     ...GOV_ROLE_OPTIONS.map(r => ({ value: r, label: toTitleCase(r) }))

                                                 ]}

                                             />



                                             <OrangeSelect

                                                 value={trustFilter}

                                                 onChange={v => setTrustFilter(v)}

                                                 placeholder="All Trust Scores"

                                                 minWidth="175px"

                                                 options={[

                                                     { value: '', label: 'All Trust Scores' },

                                                     { value: '100', label: 'Perfect (100)' },

                                                     { value: '90',  label: 'High (90–99)' },

                                                     { value: '70',  label: 'Medium (70–89)' },

                                                     { value: 'low', label: 'Low (<70)' },

                                                 ]}

                                             />



                                             {activeFilterCount > 0 && (

                                                 <button

                                                     onClick={() => { setRoleFilter(''); setTrustFilter(''); setSearch(''); }}

                                                     className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800 hover:bg-orange-100 transition-colors whitespace-nowrap"

                                                 >

                                                     <Filter size={11} />

                                                     {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active · clear

                                                 </button>

                                             )}

                                         </>

                                     )}



                                    <div className="text-xs text-slate-400 font-bold whitespace-nowrap ml-auto">

                                        {loading ? 'Loading…' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}

                                    </div>

                                </div>



                                {/* Table */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                                    {loading ? (
                                        <div className="text-center py-16 text-slate-400">
                                            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                                            Loading...
                                        </div>
                                    ) : filtered.length === 0 ? (
                                        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl m-4">
                                            <Icon size={40} className="mx-auto mb-3 opacity-20 text-slate-400" />
                                            <p className="font-bold text-slate-500">No {config.title.toLowerCase()} found</p>
                                            {search && <p className="text-sm text-slate-400 mt-1">Try a different search term</p>}
                                        </div>
                                    ) : isTimeline ? (
                                        <div className="max-w-4xl mx-auto py-2 px-2 overflow-hidden">
                                            {paginated.map(item => <TimelineEvent key={item.id} entry={item} />)}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="text-[10px] uppercase text-slate-500 font-black bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 tracking-wider">
                                                    <tr>
                                                        {isAuditLog ? (
                                                            <>
                                                                <th className="p-3">ID</th>
                                                                <th className="p-3">Action</th>
                                                                <th className="p-3">Type</th>
                                                                <th className="p-3">Actor</th>
                                                                <th className="p-3">Timestamp</th>
                                                            </>
                                                        ) : isRecords ? (
                                                            <>
                                                                <th className="p-4">Record ID</th>
                                                                <th className="p-4">Document Type</th>
                                                                <th className="p-4">Subject / Applicant</th>
                                                                <th className="p-4">Date Finalized</th>
                                                                <th className="p-4">Finalized By</th>
                                                                <th className="p-4 text-right">Action</th>
                                                            </>
                                                        ) : isUsers ? (
                                                            <>
                                                                <th className="p-4">ID</th>
                                                                <th className="p-4">Full Name</th>
                                                                <th className="p-4">Role</th>
                                                                <th className="p-4">Barangay</th>
                                                                <th className="p-4">Trust Score</th>
                                                                <th className="p-4">Joined</th>
                                                                <th className="p-4 text-right">Actions</th>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <th className="p-4">Tracking No.</th>
                                                                <th className="p-4">Details</th>
                                                                <th className="p-4">Status</th>
                                                                <th className="p-4">Date Filed</th>
                                                                <th className="p-4 text-right">Action</th>
                                                            </>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                    {paginated.map(item =>
                                                        isAuditLog ? <AuditRow key={item.id || item.record_id} entry={item} /> :
                                                        isRecords ? <RecordRow key={item.record_id} entry={item} /> :
                                                        isUsers ? (
                                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-sm group">
                                                                <td className="p-4 font-mono text-slate-400 text-xs">{item.id}</td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        {/* Avatar with orange gradient */}
                                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-sm">
                                                                            {(item.full_name || '?').charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-900 dark:text-white">{item.full_name}</div>
                                                                            <div className="text-xs text-slate-400">{item.email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    {editingUser?.id === item.id ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <select
                                                                                defaultValue={item.role}
                                                                                onChange={e => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                                                                                className="bg-white dark:bg-slate-800 border border-orange-400 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                                                                            >
                                                                                {GOV_ROLE_OPTIONS.map(r => (
                                                                                    <option key={r} value={r}>{toTitleCase(r)}</option>
                                                                                ))}
                                                                            </select>
                                                                            <button
                                                                                onClick={() => handleRoleChange(item.id, editingUser.role || item.role)}
                                                                                disabled={savingRole}
                                                                                className="px-2 py-1 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
                                                                            >
                                                                                {savingRole ? '…' : 'Save'}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingUser(null)}
                                                                                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                                                            {toTitleCase(item.role || '')}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4 text-xs text-slate-500">{item.barangay || '—'}</td>
                                                                <td className="p-4">
                                                                    {/* Trust score redesigned */}
                                                                    <div className="flex flex-col gap-1 min-w-[80px]">
                                                                        <div className="flex items-center justify-between mb-0.5">
                                                                            <span className={`text-xs font-black ${
                                                                                (item.trust_score ?? 100) >= 90 ? 'text-green-600 dark:text-green-400' :
                                                                                (item.trust_score ?? 100) >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'
                                                                            }`}>{item.trust_score ?? 100}</span>
                                                                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                                                                                (item.trust_score ?? 100) >= 90 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                                                                (item.trust_score ?? 100) >= 70 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                                                                'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                                            }`}>
                                                                                {(item.trust_score ?? 100) >= 90 ? 'High' : (item.trust_score ?? 100) >= 70 ? 'Med' : 'Low'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all ${
                                                                                    (item.trust_score ?? 100) >= 90 ? 'bg-green-500' :
                                                                                    (item.trust_score ?? 100) >= 70 ? 'bg-yellow-400' : 'bg-red-400'
                                                                                }`}
                                                                                style={{ width: `${item.trust_score ?? 100}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-xs text-slate-500">
                                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric'}) : '—'}
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => setEditingUser({ id: item.id, role: item.role })}
                                                                            className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-bold hover:bg-orange-100 transition-colors border border-orange-200 dark:border-orange-800"
                                                                        >
                                                                            Edit Role
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) :
                                                        <ItemRow key={item.id} item={item} path={location.pathname} onView={setSelectedItem} />
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex flex-col items-center gap-3 py-4">
                                        <div className="text-xs text-slate-400 font-medium">
                                            Showing <span className="font-bold text-slate-600 dark:text-slate-300">{Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}</span>–<span className="font-bold text-slate-600 dark:text-slate-300">{Math.min(page * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-bold text-slate-600 dark:text-slate-300">{filtered.length}</span> records
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {/* Prev */}
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-orange-400 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                            </button>

                                            {/* Page numbers */}
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                                                .reduce((acc, n, idx, arr) => {
                                                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
                                                    acc.push(n);
                                                    return acc;
                                                }, [])
                                                .map((n, idx) =>
                                                    typeof n === 'string' ? (
                                                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 select-none">{n}</span>
                                                    ) : (
                                                        <button
                                                            key={n}
                                                            onClick={() => setPage(n)}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                                                n === page
                                                                    ? 'bg-orange-500 text-white border border-orange-500 shadow-sm shadow-orange-500/30'
                                                                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-400 hover:text-orange-500'
                                                            }`}
                                                        >{n}</button>
                                                    )
                                                )
                                            }

                                            {/* Next */}
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-orange-400 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                </main>
            </div>

            {/* ── Item Detail Modal ── */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 z-10"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`flex items-center gap-2`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors.icon}`}>
                                    <Icon size={16} />
                                </div>
                                <span className="font-black text-slate-900 dark:text-white">
                                    {selectedItem.wo_number || selectedItem.project_number || selectedItem.pr_number || selectedItem.obo_number || `Record #${selectedItem.id}`}
                                </span>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors">
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            {selectedItem.title && (
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Title</div>
                                    <div className="font-bold text-slate-900 dark:text-white">{selectedItem.title}</div>
                                </div>
                            )}
                            {selectedItem.description && (
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Description</div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{selectedItem.description}</div>
                                </div>
                            )}
                            {selectedItem.scope_of_work && (
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Scope of Work</div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400">{selectedItem.scope_of_work}</div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                {selectedItem.status && (
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[selectedItem.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {selectedItem.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                )}
                                {selectedItem.barangay && (
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Barangay</div>
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedItem.barangay}</div>
                                    </div>
                                )}
                                {selectedItem.current_phase && (
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Phase</div>
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedItem.current_phase}</div>
                                    </div>
                                )}
                                {selectedItem.created_at && (
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Filed</div>
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(selectedItem.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</div>
                                    </div>
                                )}
                            </div>
                            {(selectedItem.location || selectedItem.location_description) && (
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Location</div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400">{selectedItem.location || selectedItem.location_description}</div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setSelectedItem(null)} className="flex-1 py-2 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                Close
                            </button>
                            {(location.pathname === '/gov/work-orders' || location.pathname === '/gov/projects') && (
                                <button onClick={() => { setSelectedItem(null); navigate(location.pathname === '/gov/work-orders' ? '/dispatcher' : '/gov/projects'); }} className="flex-1 py-2 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                                    {location.pathname === '/gov/work-orders' ? 'Open in Command Center' : 'View Timeline'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ── New Record Modal Stub ── */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNewModal(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 z-10 text-center"
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${colors.icon}`}>
                            <Plus size={28} />
                        </div>
                        <h2 className="font-black text-xl text-slate-900 dark:text-white mb-2">New {config.title.replace(/s$/, '')}</h2>
                        <p className="text-sm text-slate-500 mb-4">Full creation form for {config.title.toLowerCase()} is being finalized. Use the Command Center or your division workflow to create new records.</p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowNewModal(false)} className="flex-1 py-2 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                            {location.pathname === '/gov/work-orders' && (
                                <button onClick={() => { setShowNewModal(false); navigate('/dispatcher'); }} className="flex-1 py-2 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">Go to Command Center</button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default GovDivisionPage;
