/**
 * GovDivisionPage.jsx
 * Generic division-level page template for all City Engineering Office sub-divisions.
 * Used for routes like /gov/work-orders, /gov/projects, /gov/obo, /gov/procurement, etc.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
    GitBranch, Map, Building2, ShieldCheck, PackageCheck,
    ClipboardList, Ruler, Eye, HardHat, Wrench, FileBarChart2,
    Clock, CheckCircle2, AlertTriangle, Users, Plus, Filter,
    Search, ChevronRight, Activity, FileCheck, ArrowRight,
    BookOpen, UserCog, Settings
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';

const API_BASE = 'http://localhost:8000';

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
        apiPath: null,
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
        apiPath: null,
        statuses: [],
    },
    '/gov/surveys': {
        title: 'Field Surveys',
        subtitle: 'Geodetic and civil engineering field survey assignments and results.',
        icon: Eye,
        color: 'green',
        apiPath: null,
        statuses: [],
    },
    '/gov/boq': {
        title: 'Bill of Quantities',
        subtitle: 'Material and labor cost estimates for all active engineering projects.',
        icon: ClipboardList,
        color: 'amber',
        apiPath: null,
        statuses: [],
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
const ItemRow = ({ item, path }) => {
    const idKey = item.wo_number || item.project_number || item.pr_number || item.obo_number || `#${item.id}`;
    const title = item.title || item.description?.substring(0, 60) || item.scope_of_work?.substring(0, 60) || item.project_name || item.building_name || idKey;
    const status = item.status || 'unknown';
    const statusClass = STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('en-PH') : '—';

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer">
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
        if (!token || !currentUser) { navigate('/login'); return; }
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
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            (item.title || '').toLowerCase().includes(s) ||
            (item.description || '').toLowerCase().includes(s) ||
            (item.wo_number || '').toLowerCase().includes(s) ||
            (item.project_number || '').toLowerCase().includes(s) ||
            (item.pr_number || '').toLowerCase().includes(s) ||
            (item.obo_number || '').toLowerCase().includes(s) ||
            (item.status || '').toLowerCase().includes(s) ||
            (item.action || '').toLowerCase().includes(s)
        );
    });

    const isAuditLog = location.pathname === '/gov/audit-logs';
    const isStatic = !config.apiPath;

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
                    {config.apiPath && !isAuditLog && (
                        <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-colors bg-indigo-600 hover:bg-indigo-700`}>
                            <Plus size={14} /> New
                        </button>
                    )}
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full mx-auto space-y-4">

                        {/* Static / placeholder pages */}
                        {isStatic && (
                            <div className={`rounded-2xl border p-10 text-center ${colors.bg} ${colors.border}`}>
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${colors.icon}`}>
                                    <Icon size={32} />
                                </div>
                                <h2 className={`text-2xl font-black mb-2 ${colors.text}`}>{config.title}</h2>
                                <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">{config.subtitle}</p>
                                <p className="mt-4 text-xs text-slate-400 bg-white/60 dark:bg-slate-900/60 inline-block px-3 py-1 rounded-full">
                                    This module is under active development. Backend APIs are ready — frontend integration coming soon.
                                </p>
                            </div>
                        )}

                        {/* API-backed pages */}
                        {config.apiPath && (
                            <>
                                {/* Filters */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="relative flex-1 min-w-48">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder={`Search ${config.title.toLowerCase()}...`}
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                    {config.statuses.length > 0 && (
                                        <select
                                            value={statusFilter}
                                            onChange={e => setStatusFilter(e.target.value)}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                        >
                                            <option value="">All Statuses</option>
                                            {config.statuses.map(s => (
                                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    )}
                                    <div className="text-xs text-slate-400 font-bold whitespace-nowrap">
                                        {loading ? 'Loading...' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
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
                                                    {filtered.map(item =>
                                                        isAuditLog
                                                            ? <AuditRow key={item.id} entry={item} />
                                                            : <ItemRow key={item.id} item={item} path={location.pathname} />
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default GovDivisionPage;
