/**
 * GovDivisionPage.jsx
 * Generic division-level page template for all City Engineering Office sub-divisions.
 * Used for routes like /gov/work-orders, /gov/projects, /gov/obo, /gov/procurement, etc.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import {
    GitBranch, Map, Building2, ShieldCheck, PackageCheck,
    ClipboardList, Ruler, Eye, HardHat, Wrench, FileBarChart2,
    Clock, CheckCircle2, AlertTriangle, Users, Plus, Filter,
    Search, ChevronRight, Activity, FileCheck, ArrowRight,
    BookOpen, UserCog, Settings, FlaskConical, Bell, Globe,
    Shield, Database, RefreshCw, Monitor, Lock, Server, User,
    ChevronDown, Check, X, Download, ExternalLink, FileText,
    Banknote, CalendarRange, Landmark, Coins
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import OrangeSelect from '../components/OrangeSelect';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import SearchInput from '../components/SearchInput';
import TablePagination from '../components/TablePagination';
import DocumentUploadModal from '../components/DocumentUploadModal';
import ComplianceReminder from '../components/ComplianceReminder';
import './planning-delivery-workspace.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getAuthToken, getAuthUser } from '../utils/authSession';

// Section 4.6 - Final Turnover & Audit Components
import PunchListMobile from './PunchListMobile';

import { API_BASE_URL } from '../utils/apiBase';

// ─────────────────────────────────────────────────────────────────────────────
// Page config map: route → UI metadata + content
const PAGE_CONFIG = {
    '/gov/work-orders': {
        title: 'Work Orders',
        subtitle: 'Track and manage all engineering work orders assigned across field teams.',
        icon: GitBranch,
        color: 'orange',
        apiPath: '/api/gov/work-orders',
        statuses: ['pending','assigned','in_progress','completed','cancelled'],
    },
    '/gov/projects': {
        title: 'Projects',
        subtitle: 'Manage infrastructure projects from request through completion.',
        icon: Map,
        color: 'orange',
        apiPath: '/api/gov/projects',
        statuses: ['request_received','survey_in_progress','design_in_progress','approved_by_city_engineer','in_progress','resolved','closed_completion_certified'],
    },
    '/gov/obo': {
        title: 'OBO Inspections',
        subtitle: 'Office of the Building Official — building, electrical & mechanical permit applications.',
        icon: ShieldCheck,
        color: 'orange',
        apiPath: '/api/gov/obo',
        statuses: ['application_received','inspection_scheduled','inspection_complete','permit_issued','failed_inspection'],
    },
    '/gov/procurement': {
        title: 'Procurement',
        subtitle: 'Manage procurement requests from draft through endorsement.',
        icon: PackageCheck,
        color: 'orange',
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
        color: 'orange',
        apiPath: '/api/gov/audit-logs',
        statuses: [],
    },
    '/gov/records': {
        title: 'Records & Registry',
        subtitle: 'Administrative records management for the City Engineering Office.',
        icon: BookOpen,
        color: 'orange',
        apiPath: '/api/gov/records',
        statuses: [],
    },

    '/gov/design-requests': {
        title: 'Design work',
        subtitle: 'Manage design requests, drawings, and review work for active projects.',
        icon: Ruler,
        color: 'orange',
        apiPath: '/api/gov/design-requests',
        statuses: ['request_received','survey_in_progress','design_in_progress','approved_by_city_engineer'],
    },
    '/gov/analysis': {
        title: 'Engineering analysis',
        subtitle: 'Review structural and civil engineering analysis for active projects.',
        icon: FlaskConical,
        color: 'orange',
        apiPath: '/api/gov/analysis',
        statuses: ['survey_in_progress','design_in_progress','approved_by_city_engineer'],
    },
    '/gov/surveys': {
        title: 'Field surveys',
        subtitle: 'Manage survey assignments, field observations, and submitted results.',
        icon: Eye,
        color: 'orange',
        apiPath: '/api/gov/surveys',
        statuses: ['assigned','in_progress','survey_in_progress'],
    },
    '/gov/boq': {
        title: 'Bill of quantities',
        subtitle: 'Prepare material, labor, and equipment quantities for active projects.',
        icon: ClipboardList,
        color: 'orange',
        apiPath: '/api/gov/boq',
        statuses: [],
    },
    '/gov/estimation': {
        title: 'Cost planning',
        subtitle: 'Review project quantities and cost estimates before procurement.',
        icon: PackageCheck,
        color: 'orange',
        apiPath: '/api/gov/estimation',
        statuses: ['draft','submitted','validated','sent_to_procurement'],
    },
    '/gov/reports': {
        title: 'Incoming Citizen Reports',
        subtitle: 'Active infrastructure fault reports submitted by citizens pending verification or triage action.',
        icon: AlertTriangle,
        color: 'red',
        apiPath: '/api/gov/reports',
        statuses: ['unvalidated', 'unverified', 'pending', 'pending_approval', 'dispatched'],
    },
    '/gov/reports-archive': {
        title: 'Reports Archive',
        subtitle: 'Closed, resolved, and rejected citizen infrastructure reports for administrative records.',
        icon: FileBarChart2,
        color: 'orange',
        apiPath: '/api/gov/reports-archive',
        statuses: ['resolved','rejected','closed'],
    },
    '/gov/document-registry': {
        title: 'Document Archive',
        subtitle: 'Immutable system-wide document registry and technical file archive.',
        icon: FileText,
        color: 'gray',
        apiPath: '/api/gov/document-registry',
        statuses: [],
    },
    '/gov/users': {
        title: 'Role Management',
        subtitle: 'Assign and manage Plantilla position roles for all LGU system users.',
        icon: UserCog,
        color: 'orange',
        apiPath: '/api/gov/users',
        statuses: [],
    },
    '/gov/settings': {
        title: 'System Settings',
        subtitle: 'Configure system parameters for the PULSO platform.',
        icon: Settings,
        color: 'orange',
        apiPath: null,
        statuses: [],
    },
    '/gov/agent-app': {
        title: 'Agent Mobile App',
        subtitle: 'Download and install the PULSO Agent application for field operations.',
        icon: HardHat,
        color: 'orange',
        apiPath: null,
        statuses: [],
    },
    '/gov/advisories': {
        title: 'Tactical Advisories',
        subtitle: 'View and monitor active municipal health, infrastructure, and safety advisories.',
        icon: Globe,
        color: 'orange',
        apiPath: '/api/gov/advisories',
        statuses: ['Urgent', 'High', 'Normal'],
    },
};

const DELIVERY_VIEWS = [
    { key: 'projects', label: 'Projects', shortLabel: 'Projects', path: '/gov/projects', icon: Map },
    { key: 'design', label: 'Design work', shortLabel: 'Design', path: '/gov/design-requests', icon: Ruler, roles: ['design_engineer', 'cad_operator', 'division_chief', 'city_engineer', 'asst_city_engineer', 'manager', 'system_admin'] },
    { key: 'analysis', label: 'Engineering analysis', shortLabel: 'Analysis', path: '/gov/analysis', icon: FlaskConical, roles: ['design_engineer', 'division_chief', 'city_engineer', 'asst_city_engineer', 'manager', 'system_admin'] },
    { key: 'surveys', label: 'Field surveys', shortLabel: 'Surveys', path: '/gov/surveys', icon: Eye, roles: ['project_engineer', 'estimator', 'division_chief', 'city_engineer', 'asst_city_engineer', 'manager', 'system_admin'] },
    { key: 'estimation', label: 'Cost planning', shortLabel: 'Costs', path: '/gov/estimation', icon: Coins, roles: ['estimator', 'project_engineer', 'division_chief', 'city_engineer', 'asst_city_engineer', 'manager', 'system_admin'] },
    { key: 'quantities', label: 'Bill of quantities', shortLabel: 'Quantities', path: '/gov/boq', icon: ClipboardList, roles: ['estimator', 'project_engineer', 'division_chief', 'admin_officer', 'city_engineer', 'asst_city_engineer', 'manager', 'system_admin'] },
    { key: 'procurement', label: 'Procurement', shortLabel: 'Procurement', path: '/gov/procurement', icon: PackageCheck, roles: ['estimator', 'project_engineer', 'division_chief', 'admin_officer', 'city_engineer', 'asst_city_engineer', 'manager', 'system_admin'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Budget Pipeline Component (Digital Handshake Visualizer)
const BudgetPipeline = ({ item, path }) => {
    if (!item || !['/gov/procurement', '/gov/estimation'].includes(path)) return null;

    const steps = [
        { id: 'validation', label: 'Validation', icon: CheckCircle2, completed: item.status === 'validated' || item.funding_certified || item.cash_released || item.bac_meeting_date },
        { id: 'funding', label: 'Funding record', icon: Banknote, completed: item.funding_certified, sub: item.obr_number },
        { id: 'cash', label: 'Cash confirmed', icon: Coins, completed: item.cash_released },
        { id: 'bac', label: 'BAC meeting', icon: CalendarRange, completed: !!item.bac_meeting_date, sub: item.bac_meeting_date ? new Date(item.bac_meeting_date).toLocaleDateString() : null },
        { id: 'ntp', label: 'Notice to proceed', icon: Shield, completed: item.ntp_issued }
    ];

    const currentStep = steps.findLastIndex(s => s.completed);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Landmark className="text-indigo-500" size={20} />
                        Funding and procurement progress
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Current funding, cash, BAC schedule, and notice-to-proceed status.</p>
                </div>
                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {item.pr_number || 'TR-2026-X'}
                </div>
            </div>

            <div className="relative flex items-center justify-between px-4">
                {/* Connecting Line */}
                <div className="absolute left-10 right-10 top-5 h-0.5 bg-slate-100 dark:bg-slate-800" />
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: currentStep >= 0 ? `${(currentStep / (steps.length - 1)) * 80 + 10}%` : '0%' }}
                    className="absolute left-10 top-5 h-0.5 bg-indigo-500 transition-all duration-500"
                />

                {steps.map((step, idx) => (
                    <div key={step.id} className="relative z-10 flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                            step.completed 
                            ? 'bg-indigo-500 border-indigo-500 text-white' 
                            : idx <= currentStep + 1 
                                ? 'bg-white dark:bg-slate-900 border-indigo-500 text-indigo-500' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}>
                            <step.icon size={18} />
                        </div>
                        <div className="absolute top-12 w-24 flex flex-col items-center text-center">
                            <span className={`text-[10px] leading-3 font-black uppercase tracking-wider ${step.completed ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                                {step.label}
                            </span>
                            {step.sub && (
                                <span className="text-[9px] font-mono text-slate-400 mt-0.5">{step.sub}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Status badge colors
const STATUS_COLORS = {
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    unvalidated: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    unverified: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    request_received: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    survey_in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    design_in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    approved_by_city_engineer: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    closed_completion_certified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    application_received: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    inspection_scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    inspection_complete: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    permit_issued: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed_inspection: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    draft: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    submitted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    validated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    sent_to_procurement: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    dispatched: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    approved_internal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    received: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    report_received: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    survey_complete: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
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

const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// ─────────────────────────────────────────────────────────────────────────────
// Generic Row renderer for list items
// ─────────────────────────────────────────────────────────────────────────────
const ItemRow = ({ item, path, onView }) => {
    const idKey = item.wo_number || item.project_number || item.pr_number || item.obo_number || `#${item.id}`;
    const title = item.title || item.description?.substring(0, 60) || item.scope_of_work?.substring(0, 60) || item.project_name || item.building_name || idKey;
    const status = item.status || 'unknown';
    const normalizedStatus = status.toLowerCase();
    const statusClass = STATUS_COLORS[normalizedStatus] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('en-PH') : '—';

    // Parse location data (Unified 3-part format: Plus|Address|Barangay)
    const rawLoc = item.location || item.location_string || item.location_description || '';
    let displayBrgy = item.barangay && item.barangay !== '—' ? item.barangay : null;
    let mainAddress = rawLoc;

    if (rawLoc && rawLoc.includes('|')) {
        const parts = rawLoc.split('|').map(p => p.trim());
        if (parts.length >= 3) {
            displayBrgy = parts[2] || displayBrgy;
            mainAddress = parts[1];
        } else if (parts.length === 2 && parts[0].includes('+')) {
            mainAddress = parts[1];
        }
    }

    // Secondary brgy extraction if not found
    if (!displayBrgy && mainAddress) {
        const m = mainAddress.match(/(?:Barangay|Brgy\.?)\s*(\d+[A-Za-z]?)/i);
        if (m) displayBrgy = m[1];
    }

    // Clean redundancy
    let cleanAddress = mainAddress;
    if (displayBrgy && cleanAddress.toLowerCase().includes(displayBrgy.toLowerCase())) {
        cleanAddress = cleanAddress.replace(new RegExp(`,?\\s*${displayBrgy}`, 'i'), '').trim();
        cleanAddress = cleanAddress.replace(/,$/, '').trim();
    }

    const isAdvisory = path === '/gov/advisories';
    
    if (isAdvisory) {
        const priorityColors = {
            'Urgent': 'bg-red-500 text-white',
            'High': 'bg-orange-500 text-white',
            'Normal': 'bg-blue-500 text-white'
        };
        const priorityClass = priorityColors[item.priority] || 'bg-slate-500 text-white';

        return (
            <tr onClick={() => onView?.(item)} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer border-b border-slate-100 dark:border-slate-800">
                <td className="p-4 font-mono font-bold text-orange-600 dark:text-orange-400 text-xs">{item.advisory_id || `ADV-${item.id}`}</td>
                <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-xs">{item.title}</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{item.category || 'MUNICIPAL'} • {item.department || 'GOV'}</div>
                </td>
                <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${priorityClass}`}>
                        {item.priority}
                    </span>
                </td>
                <td className="p-4 text-xs text-slate-500">{date}</td>
                <td className="p-4 text-right">
                    <button className="text-orange-600 dark:text-orange-400 hover:text-orange-800 font-bold text-xs transition-opacity flex items-center gap-1 ml-auto">
                        View <ArrowRight size={12} />
                    </button>
                </td>
            </tr>
        );
    }

    return (
        <tr onClick={() => onView?.(item)} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer">
            <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">{idKey}</td>
            <td className="p-4">
                <div className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-xs">{title}</div>
                {(() => {
                    const parts = (rawLoc || "").split('|').map(p => p.trim());
                    const plus = parts[0] || "";
                    const brgy = displayBrgy || "Barangay Unknown";
                    const addr = cleanAddress || "Address Unknown";
                    
                    // Already cleaned in cleanAddress variable
                    return (
                        <div className="text-[11px] text-slate-500 font-medium leading-tight mt-1">
                            {plus}, {addr}, {brgy}, Caloocan, Metro Manila
                        </div>
                    );
                })()}
            </td>
            <td className="p-4">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                    {status.replace(/_/g, ' ')}
                </span>
            </td>
            <td className="p-4 text-xs text-slate-500">{date}</td>
            <td className="p-4 text-right">
                <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold text-xs transition-opacity flex items-center gap-1 ml-auto">
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
        contextColor = 'bg-orange-500';
    } else if (entry.work_order_id) {
        contextLabel = `Work Order #${entry.work_order_id}`;
        contextColor = 'bg-blue-500';
    } else if (entry.project_id) {
        contextLabel = `Project #${entry.project_id}`;
        contextColor = 'bg-indigo-500';
    }

    const normalizedStatus = (entry.status || '').toLowerCase();
    const statusClass = STATUS_COLORS[normalizedStatus] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
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
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <span className="text-slate-300 dark:text-slate-700">→</span>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase ${statusClass}`}>
                                {statusText}
                            </span>
                        </span>
                    </div>
                    <div className="sm:hidden text-[10px] font-medium text-slate-400">
                        {dateStr} • {timeStr}
                    </div>
                </div>
                
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
                    {(entry.note || `Status updated to ${statusText.toLowerCase()}`)
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase())
                        .replace(/\bTo\b/g, 'to')}
                </p>
                
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-500 dark:text-slate-400 shrink-0">
                            {(entry.actor_name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            {entry.actor_name || 'System Automated'}
                            {entry.actor_role && <span className="text-slate-400 dark:text-slate-500"> • {entry.actor_role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>}
                        </div>
                    </div>
                    {entry.previous_status && (
                        <div className="text-[10px] text-slate-400 italic hidden sm:block">
                            Prev: {entry.previous_status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bTo\b/g, 'to')}
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
const RecordRow = ({ entry, onView }) => {
    let typeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (entry.record_type.includes('Completion')) typeColor = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400';
    else if (entry.record_type.includes('Permit')) typeColor = 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400';
    else if (entry.record_type.includes('Award')) typeColor = 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400';

    const handleView = () => {
        onView?.({
            ...entry,
            id: entry.record_id || entry.id,
            title: entry.title_or_applicant,
            description: `Document Type: ${entry.record_type}\nReference: ${entry.reference_no}\nFinalized By: ${entry.issued_by_name}`,
            created_at: entry.date_issued
        });
    };

    return (
        <tr onClick={handleView} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group text-sm">
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
                <button
                    onClick={(e) => { e.stopPropagation(); handleView(); }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold text-xs transition-opacity flex items-center gap-1 ml-auto"
                >
                    Open <ArrowRight size={12} />
                </button>
            </td>
        </tr>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Audit log row
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Audit Row component
// ─────────────────────────────────────────────────────────────────────────────

const AuditRow = ({ entry, index }) => {
    // Resolve actor name with fallback to persona/role for deleted users
    const getActorName = () => {
        if (entry.actor_name) return entry.actor_name;
        if (entry.actor_role) return `Deleted ${toTitleCase(entry.actor_role)}`;
        if (entry.actor_id) return `User #${entry.actor_id}`;
        return 'System';
    };

    // Replace technical strings with readable ones (e.g., pending_approval -> Pending Approval)
    const beautifyAction = (text) => {
        if (!text) return '—';
        return text.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const getTypeColor = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('procurement')) return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400';
        if (t.includes('status')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
        if (t.includes('maintenance') || t.includes('update')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
        if (t.includes('auth') || t.includes('login')) return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400';
        if (t.includes('report') || t.includes('citizen')) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400';
        if (t.includes('work') || t.includes('order')) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400';
        if (t.includes('project')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
        if (t.includes('create') || t.includes('insert')) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
        if (t.includes('delete') || t.includes('remove')) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    };

    const badgeColor = getTypeColor(entry.trigger_type);

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-xs border-b border-slate-50 dark:border-slate-800/50 last:border-0 group cursor-default">
            <td className="p-4 font-mono font-bold text-slate-400 dark:text-slate-500 text-[10px] w-12">{index}</td>
            <td className="p-4">
                <span className={`px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider ${badgeColor}`}>
                    {toTitleCase(entry.trigger_type)}
                </span>
            </td>
            <td className="p-4 font-bold text-slate-800 dark:text-slate-200 min-w-[300px] leading-relaxed">
                {beautifyAction(entry.action)}
            </td>
            <td className="p-4">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400 shrink-0">
                        {getActorName().charAt(0).toUpperCase()}
                    </div>
                    <span className="text-slate-600 dark:text-slate-300 font-medium text-xs">{getActorName()}</span>
                </div>
            </td>
            <td className="p-4 text-slate-400 dark:text-slate-500 text-xs font-medium">
                {entry.created_at ? new Date(entry.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </td>
        </tr>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
const GovDivisionPage = ({ workspace, activePathOverride }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [token] = useState(() => getAuthToken() || localStorage.getItem('pulso_token'));
    const [currentUser] = useState(() => getAuthUser() || (() => {
        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }
    })());
    const isDeliveryWorkspace = location.pathname === '/gov/delivery';
    const requestedDeliveryView = new URLSearchParams(location.search).get('view') || 'projects';
    const availableDeliveryViews = DELIVERY_VIEWS.filter((view) => !view.roles || view.roles.includes(currentUser?.role));
    const activeDeliveryView = availableDeliveryViews.find((view) => view.key === requestedDeliveryView) || availableDeliveryViews[0] || DELIVERY_VIEWS[0];
    const activePath = activePathOverride || (isDeliveryWorkspace ? activeDeliveryView.path : location.pathname);
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
    const [newRecordForm, setNewRecordForm] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalAction, setApprovalAction] = useState(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [dynamicAgentIp, setDynamicAgentIp] = useState(window.location.hostname);
    
    // Process Gate / FQA States
    const [showDocUploadModal, setShowDocUploadModal] = useState(false);
    const [advancingPhase, setAdvancingPhase] = useState(false);
    const [advanceError, setAdvanceError] = useState(null);
    const [fqaResult, setFqaResult] = useState(null);
    const [projectDocuments, setProjectDocuments] = useState([]);
    const [showNotification, setShowNotification] = useState(null); // { type: 'success' | 'error' | 'info', message: string }
    const [tmpObr, setTmpObr] = useState('');
    const [tmpBacDate, setTmpBacDate] = useState(null);

    // Section 4.6 - Mobile Audit & Turnover State
    const [showPunchList, setShowPunchList] = useState(false);
    const [punchListProject, setPunchListProject] = useState(null);

    useEffect(() => {
        const fetchServerIp = async () => {
            try {
                const baseUrl = `http://${window.location.hostname}:33159`;
                const response = await fetch(`${baseUrl}/api/system/ip`);
                const data = await response.json();
                if (data.ip) setDynamicAgentIp(data.ip);
            } catch (error) {
                console.error("Failed to fetch server IP:", error);
                if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    setDynamicAgentIp(window.location.hostname);
                }
            }
        };
        fetchServerIp();
    }, []);

    // Fetch documents when a project is selected
    useEffect(() => {
        if (selectedItem && activePath === '/gov/projects' && selectedItem.id) {
            fetchProjectDocuments(selectedItem.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItem, activePath]);
    
    // Sync temporary states for procurement modal
    useEffect(() => {
        if (selectedItem) {
            setTmpObr(selectedItem.obr_number || '');
            setTmpBacDate(selectedItem.bac_meeting_date ? new Date(selectedItem.bac_meeting_date) : null);
        }
    }, [selectedItem]);

    const handleOboTechnicalReview = async (id, section, actionStatus) => {
        setIsApproving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/obo/${id}/technical-review`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ section, status: actionStatus })
            });
            if (!res.ok) throw new Error('OBO technical review update failed');
            const updated = await res.json();
            
            // Re-fetch data or update locally
            setItems(prev => prev.map(item => item.id === id ? { ...item, [`tech_review_${section}_status`]: actionStatus } : item));
            if (selectedItem && selectedItem.id === id) {
                setSelectedItem(prev => ({ ...prev, [`tech_review_${section}_status`]: actionStatus }));
            }
        } catch (err) {
            setShowNotification({ type: 'error', message: err.message });
        } finally {
            setIsApproving(false);
        }
    };

    const handleProcurementToggle = async (id, field, value) => {
        try {
            const endpoint = field === 'funding_certified' ? 'funding' : 'ntp';
            const payload = field === 'funding_certified' ? { funding_certified: value } : { ntp_issued: value };
            
            const res = await fetch(`${API_BASE_URL}/api/gov/procurement/${id}/${endpoint}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Update failed for ${field}`);
            }
            const updated = await res.json();
            setItems(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
            if (selectedItem && selectedItem.id === id) {
                setSelectedItem(prev => ({ ...prev, ...updated }));
            }
        } catch (err) {
            setShowNotification({ type: 'error', message: err.message });
        }
    };

    const handleSpecificProcurementUpdate = async (id, endpoint, payload) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/procurement/${id}/${endpoint}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Update failed for ${endpoint}`);
            }
            const updated = await res.json();
            setItems(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
            if (selectedItem && selectedItem.id === id) {
                setSelectedItem(prev => ({ ...prev, ...updated }));
            }
            setShowNotification({ type: 'success', message: 'Procurement status updated.' });
        } catch (err) {
            setShowNotification({ type: 'error', message: err.message });
        }
    };

    const handleApproval = async () => {
        if (!selectedItem || !approvalAction) return;
        setIsApproving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders/${selectedItem.id}/approval`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: approvalAction, notes: approvalNotes })
            });
            if (!res.ok) throw new Error('Approval failed');
            const updated = await res.json();
            setItems(prev => prev.map(item => item.id === selectedItem.id ? { ...item, status: approvalAction === 'approve' ? 'assigned' : 'rejected' } : item));
            setSelectedItem({ ...selectedItem, status: approvalAction === 'approve' ? 'assigned' : 'rejected' });
            setShowApprovalModal(false);
            setApprovalNotes('');
        } catch (err) {
            setShowNotification({ type: 'error', message: err.message });
        } finally {
            setIsApproving(false);
        }
    };

    const getRequiredDocuments = (status, isEmergency, estimatedCost) => {
        if (isEmergency) {
            const emergencyCore = ["emergency_memo", "fund_certification", "direct_negotiation_record"];
            if (status === "design_in_progress") return [...emergencyCore, "prelim_survey"];
            if (status === "approved_by_city_engineer") return [...emergencyCore, "emergency_pow"];
            if (status === "in_progress") return [...emergencyCore, "ntp"];
            if (status === "resolved") return [...emergencyCore, "completion_report"];
            return [];
        }
        if (estimatedCost < 50000) {
            if (status === "design_in_progress") return ["topo_map"];
            if (status === "approved_by_city_engineer") return ["pow"];
            if (status === "in_progress") return ["quotations_3", "job_order"];
            if (status === "closed_completion_certified") return ["final_photo"];
            return [];
        }
        if (estimatedCost >= 1000000) {
            if (status === "design_in_progress") return ["survey_report", "topo_map", "geotechnical_test"];
            if (status === "approved_by_city_engineer") return ["design_plans", "detailed_estimate", "s_curve"];
            if (status === "in_progress") return ["abc", "pow", "itb", "bac_resolution"];
            if (status === "resolved") return ["contract", "ntp", "perf_bond", "car_insurance"];
            if (status === "closed_completion_certified") return ["as_built_plan", "materials_test", "coa_inspection"];
            return [];
        }
        if (status === "design_in_progress") return ["survey_report", "topo_map"];
        if (status === "approved_by_city_engineer") return ["design_plans"];
        if (status === "in_progress") return ["abc", "pow"];
        if (status === "resolved") return ["contract", "ntp"];
        if (status === "closed_completion_certified") return ["as_built_plan", "materials_test"];
        return [];
    };

    const fetchProjectDocuments = async (projId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/documents/target/ProjectRequest/${projId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const docs = await res.json();
                setProjectDocuments(docs || []);
            }
        } catch (err) {
            console.error("Failed to fetch documents:", err);
        }
    };

    const deleteDocument = async (docId, projId) => {
        if (!confirm("Are you sure you want to delete this document?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/documents/${docId}`, {
                method: "DELETE",
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchProjectDocuments(projId);
                setShowNotification({ type: 'success', message: 'Document deleted successfully.' });
            } else {
                setShowNotification({ type: 'error', message: 'Failed to delete document' });
            }
        } catch (err) {
            console.error("Failed to delete document:", err);
            setShowNotification({ type: 'error', message: 'Failed to delete document' });
        }
    };

    const handleAdvancePhase = async (project_id) => {
        const proj = items.find(p => p.id === project_id);
        if (!proj) return;

        // Determine next status based on current phase
        const nextPhase = (proj.current_phase || 1) + 1;
        const PHASE_STATUSES = {
            2: "survey_in_progress", 3: "survey_complete", 4: "design_in_progress",
            5: "boq_submitted", 6: "pending_budget_check", 7: "budget_confirmed",
            8: "approved_by_city_engineer", 9: "dispatched", 10: "in_progress",
            11: "milestone_inspections", 12: "resolved", 13: "closed_completion_certified",
        };
        const nextStatus = PHASE_STATUSES[nextPhase];
        if (!nextStatus) {
            setShowNotification({ type: 'info', message: 'No further phases defined for this project.' });
            return;
        }

        setAdvancingPhase(true);
        setAdvanceError(null);
        setFqaResult(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/projects/${project_id}/advance`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status: nextStatus })
            });
            const data = await res.json();
            
            if (!res.ok) {
                // Smart Gate Enforcement Logic - Reminders
                if (data.detail && String(data.detail).includes("Smart Gate Enforcement")) {
                    // Split the message to extract the track and the missing docs
                    const match = String(data.detail).match(/\(([^)]+)\): Missing required documents for ([^.]+)\. Required: ([^.]+)\./);
                    if (match) {
                        const [_, track, phase, docs] = match;
                        setAdvanceError({
                            type: 'COMPLIANCE',
                            track,
                            phase: toTitleCase(phase),
                            missing: docs.split(', ')
                        });
                    } else {
                        setAdvanceError(data.detail);
                    }
                } else {
                    throw new Error(data.detail || 'Failed to advance phase');
                }
            } else {
                // Success
                const updatedProj = data; // Backend returns the full ProjectRequestResponse now
                setItems(prev => prev.map(p => p.id === project_id ? updatedProj : p));
                if (selectedItem && selectedItem.id === project_id) {
                    setSelectedItem(updatedProj);
                }
                
                if (updatedProj.fqa_summary) {
                    setFqaResult(updatedProj.fqa_summary);
                }
            }
        } catch(e) {
            setAdvanceError(e.message);
        } finally {
            setAdvancingPhase(false);
        }
    };

    const handleCreateRecord = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const res = await fetch(`${API_BASE_URL}${config.apiPath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newRecordForm)
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to create record');
            }
            const created = await res.json();
            setItems(prev => [created, ...prev]);
            setShowNewModal(false);
            setNewRecordForm({});
        } catch (err) {
            setSubmitError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    const ITEMS_PER_PAGE = 10;


    const config = PAGE_CONFIG[activePath] || {
        title: 'Division Page',
        subtitle: 'City Engineering Office module',
        icon: HardHat,
        color: 'slate',
        apiPath: null,
        statuses: [],
    };

    const colors = colorMap[config.color] || colorMap.slate;
    const Icon = config.icon;
    const HeaderIcon = isDeliveryWorkspace ? Map : Icon;

    useEffect(() => {
        if (!token || !currentUser) { navigate('/gov'); return; }
        if (!config.apiPath) return;

        const handler = setTimeout(() => {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter && config.statuses?.length > 0) params.append('status', statusFilter);
            if (search && search.trim() !== '') params.append('search', search.trim());
            const paramStr = params.toString() ? `?${params.toString()}` : '';

            fetch(`${API_BASE_URL}${config.apiPath}${paramStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(r => {
                if (!r.ok) {
                    console.error('API Error:', r.status, r.statusText);
                    return [];
                }
                return r.json();
            })
            .then(data => {
                console.log('API Response for', config.apiPath, ':', data?.length || 0, 'items');
                setItems(Array.isArray(data) ? data : (data?.items || []));
            })
            .catch(err => {
                console.error('Fetch error:', err);
                setItems([]);
            })
            .finally(() => setLoading(false));
        }, search ? 400 : 0);

        return () => clearTimeout(handler);
    }, [activePath, statusFilter, search, token, config.apiPath]);

    const filtered = items.filter(item => {
        const s = search.toLowerCase();
        const backendHandlesSearch = ['/api/gov/work-orders', '/api/gov/projects', '/api/gov/obo', '/api/gov/procurement', '/api/gov/advisories'].includes(config.apiPath);
        const matchesSearch = backendHandlesSearch || !search || (
            (item.title || '').toLowerCase().includes(s) ||
            (item.description || '').toLowerCase().includes(s) ||
            (item.wo_number || '').toLowerCase().includes(s) ||
            (item.project_number || '').toLowerCase().includes(s) ||
            (item.pr_number || '').toLowerCase().includes(s) ||
            (item.advisory_id || '').toLowerCase().includes(s) ||
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


    const isAuditLog = activePath === '/gov/audit-logs';
    const isTimeline = activePath === '/gov/timeline';
    const isRecords = activePath === '/gov/records';
    const isStatic = !config.apiPath;
    const isSettings = activePath === '/gov/settings';
    const isAgentApp = activePath === '/gov/agent-app';
    const isUsers = activePath === '/gov/users';
    const isAdvisory = activePath === '/gov/advisories';

    // Pagination — computed after route flags are known
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const GOV_ROLE_OPTIONS = [
        'resident', 'city_engineer', 'asst_city_engineer', 'admin_officer', 'admin_clerk',
        'records_officer', 'division_chief', 'design_engineer', 'estimator',
        'cad_operator', 'project_engineer', 'construction_foreman', 'field_worker',
        'building_inspector', 'electrical_inspector', 'mechanical_inspector',
        'dispatcher', 'manager', 'system_admin'
    ];


    // Reset page when filters/search change
    useEffect(() => { 
        setPage(1); 
        setItems([]);
    }, [activePath, statusFilter, search, token, config.apiPath]);

    const activeFilterCount = [roleFilter, trustFilter].filter(Boolean).length;

    // Role-change handler for /gov/users
    const handleRoleChange = async (userId, newRole) => {
        setSavingRole(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/users/${userId}/role`, {
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
        <div className="min-h-screen bg-neutral-bg dark:bg-[#070a12] text-neutral-text dark:text-slate-100 font-sans flex text-sm transition-colors duration-150">
            <GovSidebar currentUser={currentUser} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-[#090e1a] flex items-center justify-between px-8 shrink-0 border-b border-neutral-border dark:border-slate-800 relative z-50 transition-colors duration-150">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.icon}`}>
                            <HeaderIcon size={18} />
                        </div>
                        <div className="flex flex-col text-left">
                            <GovBreadcrumb category="Organization" current={isDeliveryWorkspace ? 'Projects and delivery' : config.title} />
                            <h1 className="text-base sm:text-lg font-heading font-black text-neutral-text dark:text-white leading-tight mt-0.5">
                                {isDeliveryWorkspace ? 'Projects and delivery' : config.title}
                            </h1>
                            <p className="text-[11px] text-neutral-muted dark:text-slate-400 hidden sm:block">
                                {isDeliveryWorkspace ? 'Plan, survey, design, cost, and procure in one workspace.' : config.subtitle}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={() => { setLoading(true); fetch(`${API_BASE_URL}${config.apiPath}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).then(data => setItems(Array.isArray(data) ? data : [])).catch(() => setItems([])).finally(() => setLoading(false)); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500 hover:text-[#ff6b00] transition-all"
                            title="Refresh"
                        >
                            <RefreshCw size={14} />
                        </button>
                        {config.apiPath && !isAuditLog && !isTimeline && (
                            <button
                                onClick={() => setShowNewModal(true)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-colors bg-[#ff6b00] hover:bg-[#e65c00]`}
                            >
                                <Plus size={14} /> New
                            </button>
                        )}
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </header>

                {isDeliveryWorkspace && (
                    <nav className="delivery-workspace-tabs" aria-label="Projects and delivery functions">
                        {availableDeliveryViews.map((view) => {
                            const ViewIcon = view.icon;
                            const isActive = view.key === activeDeliveryView.key;
                            return (
                                <Link
                                    key={view.key}
                                    to={`/gov/delivery?view=${view.key}`}
                                    className={`delivery-workspace-tab${isActive ? ' is-active' : ''}`}
                                    aria-current={isActive ? 'page' : undefined}
                                    onClick={() => {
                                        setSearch('');
                                        setStatusFilter('');
                                        setSelectedItem(null);
                                        setPage(1);
                                    }}
                                >
                                    <ViewIcon size={15} strokeWidth={1.8} aria-hidden="true" />
                                    <span className="delivery-workspace-tab__long">{view.label}</span>
                                    <span className="delivery-workspace-tab__short">{view.shortLabel}</span>
                                </Link>
                            );
                        })}
                    </nav>
                )}

                {workspace && !isDeliveryWorkspace && (
                    <GovernmentWorkspaceTabs
                        workspace={workspace}
                        currentUser={currentUser}
                        onViewChange={() => {
                            setSearch('');
                            setStatusFilter('');
                            setSelectedItem(null);
                            setPage(1);
                        }}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full mx-auto space-y-4">

                        {isDeliveryWorkspace && (
                            <section className="delivery-workspace-context" aria-labelledby="delivery-view-heading">
                                <div>
                                    <h2 id="delivery-view-heading">{config.title}</h2>
                                    <p>{config.subtitle}</p>
                                </div>
                                <span>{activeDeliveryView.label}</span>
                            </section>
                        )}

                        {/* Settings Page — Full UI */}
                        {isSettings && (
                            <div className="space-y-6">
                                {/* System Info Card */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md shadow-orange-100/60 dark:shadow-orange-900/10">
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
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md shadow-orange-100/60 dark:shadow-orange-900/10">
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

                        {/* Agent App Download module */}
                        {isAgentApp && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600">
                                                <HardHat size={20} />
                                            </div>
                                            <div>
                                                <h2 className="font-black text-slate-900 dark:text-white text-base">Direct Download</h2>
                                                <p className="text-xs text-slate-500">Official APK for field personnel</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                                        <Monitor size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Android APK</div>
                                                        <div className="text-[10px] text-slate-500">v1.0.0 (Production)</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-400">~56 MB</span>
                                                     <a 
                                                        href={`http://${dynamicAgentIp}:33159/api/download/agent-app`}
                                                        download="pulso-agent.apk"
                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-2"
                                                    >
                                                        <Download size={14} />
                                                        Download
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700 opacity-60">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                                        <Globe size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">iOS App Store</div>
                                                        <div className="text-[10px] text-slate-500">Coming Soon (Q3 2026)</div>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Waitlisted</span>
                                            </div>
                                        </div>

                                        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                                                <ShieldCheck size={14} /> Installation Note
                                            </h3>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                                To install the APK, you may need to enable <strong>"Install from Unknown Sources"</strong> in your Android device security settings. This app is securely distributed within the LGU private network.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center">
                                        <h3 className="font-black text-slate-900 dark:text-white text-base mb-2">QR Code Installation</h3>
                                        <p className="text-xs text-slate-500 mb-6 text-center">Scan to download directly on your agent device</p>
                                        
                                        <div className="bg-white p-4 rounded-3xl shadow-xl border-4 border-slate-50 shadow-indigo-200/20">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                                                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                                                    ? `http://192.168.0.100:33159/api/download/agent-app`
                                                    : `http://192.168.0.100:33159/api/download/agent-app`
                                                )}`}
                                                alt="Agent App QR Code"
                                                className="w-48 h-48"
                                            />
                                        </div>
                                        
                                        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hostname</div>
                                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                                    {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '192.168.0.100' : window.location.hostname}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Port</div>
                                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{window.location.port || '80'}</div>
                                            </div>
                                        </div>
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
                                    <SearchInput
                                        value={search}
                                        onChange={setSearch}
                                        placeholder={isUsers ? 'Search name, email, role or barangay' : `Search ${config.title.toLowerCase()}`}
                                        ariaLabel={isUsers ? 'Search name, email, role or barangay' : `Search ${config.title.toLowerCase()}`}
                                        onClear={() => setSearch('')}
                                        className="w-full sm:w-[320px] md:w-[360px]"
                                    />
                                    
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



                                {/* Budget Pipeline - Only for Procurement/Estimation */}
                                <BudgetPipeline item={selectedItem || filtered[0]} path={activePath} />

                                {/* Table */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md shadow-orange-100/60 dark:shadow-orange-900/10 overflow-hidden">
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
                                                                <th className="p-4">ID</th>
                                                                <th className="p-4">Type</th>
                                                                <th className="p-4">Action</th>
                                                                <th className="p-4">Actor</th>
                                                                <th className="p-4">Timestamp</th>
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
                                                        ) : isAdvisory ? (
                                            <>
                                                <th className="p-4">Adv ID</th>
                                                <th className="p-4">Advisory Details</th>
                                                <th className="p-4">Priority</th>
                                                <th className="p-4">Date Issued</th>
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
                                                    {paginated.map((item, idx) =>
                                                        isAuditLog ? <AuditRow key={item.id || item.record_id} entry={item} index={(page - 1) * ITEMS_PER_PAGE + idx + 1} /> :
                                                        isRecords ? <RecordRow key={item.record_id} entry={item} onView={setSelectedItem} /> :
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
                                                                                className="bg-white dark:bg-slate-800 border border-orange-400 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer hover:text-black dark:hover:text-white"
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
                                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                                                                            GOV_ROLE_OPTIONS.includes(item.role) 
                                                                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                                                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                                        }`}>
                                                                            {toTitleCase(item.role || 'Unassigned')}
                                                                            {!GOV_ROLE_OPTIONS.includes(item.role) && item.role !== 'resident' && ' (Legacy)'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4 text-xs text-slate-500">{item.barangay || '—'}</td>
                                                                <td className="p-4">
                                                                    {/* Trust score redesigned */}
                                                                    {item.role === 'resident' ? (
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
                                                                    ) : (
                                                                        <div className="text-slate-400 font-bold ml-6">—</div>
                                                                    )}
                                                                </td>
                                                                <td className="p-4 text-xs text-slate-500">
                                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric'}) : '—'}
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <div className="flex items-center justify-end gap-2 transition-opacity">
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
                                                        <ItemRow key={item.id} item={item} path={activePath} onView={setSelectedItem} />
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {!loading && filtered.length > 0 && (
                                        <TablePagination
                                            page={page}
                                            pageSize={ITEMS_PER_PAGE}
                                            total={filtered.length}
                                            itemLabel="records"
                                            onPageChange={setPage}
                                        />
                                    )}
                                </div>

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
                            <button onClick={() => { setSelectedItem(null); setFqaResult(null); setAdvanceError(null); }} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors">
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
                                {(() => {
                                    const rawLoc = selectedItem.location || selectedItem.location_string || selectedItem.location_description || '';
                                    if (!rawLoc) return null;

                                    let plus = "";
                                    let addr = rawLoc;
                                    let brgy = selectedItem.barangay || "Barangay Unknown";

                                    if (rawLoc.includes('|')) {
                                        const parts = rawLoc.split('|').map(p => p.trim());
                                        plus = parts[0] || "";
                                        addr = parts[1] || "";
                                        brgy = parts[2] || brgy;
                                    }

                                    let cleanAddr = addr.replace(new RegExp(`,?\\s*${brgy}`, 'i'), '')
                                                        .replace(/,?\s*Caloocan(?: City)?/i, '')
                                                        .replace(/,?\s*Metro Manila/i, '')
                                                        .replace(/,?\s*Philippines/i, '')
                                                        .replace(/,$/, '')
                                                        .trim();

                                    return (
                                        <div className="col-span-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Verified Incident Location</div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-bold leading-snug">
                                                {plus ? `${plus}, ` : ""}{cleanAddr}, {brgy}, Caloocan, Metro Manila
                                            </div>
                                        </div>
                                    );
                                })()}
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
                                {selectedItem.estimated_cost !== undefined && (
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Estimated Cost</div>
                                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">₱{selectedItem.estimated_cost?.toLocaleString()}</div>
                                    </div>
                                )}
                                {selectedItem.is_emergency && (
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-2 rounded-xl">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400">Emergency Override Protocol Active</span>
                                        </div>
                                    </div>
                                )}
                                {isAdvisory && (
                                    <>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Priority</div>
                                            <div className="font-bold text-slate-900 dark:text-white">{selectedItem.priority}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Category</div>
                                            <div className="font-bold text-slate-900 dark:text-white">{selectedItem.category}</div>
                                        </div>
                                        <div className="col-span-1">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Department</div>
                                            <div className="font-bold text-slate-900 dark:text-white text-xs">{selectedItem.department}</div>
                                        </div>
                                        <div className="col-span-1">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Issued By</div>
                                            <div className="font-bold text-slate-900 dark:text-white text-xs">{selectedItem.author_name || 'System Admin'}</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* OBO Technical Review Panel */}
                            {selectedItem.obo_number && selectedItem.status === 'application_received' && (
                                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">5-Point Technical Review</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { key: 'arch', label: 'Architectural' },
                                            { key: 'civil', label: 'Civil/Structural' },
                                            { key: 'elec', label: 'Electrical' },
                                            { key: 'sani', label: 'Sanitary/Plumbing' },
                                            { key: 'mech', label: 'Mechanical' },
                                        ].map(sec => {
                                            const statusKey = `tech_review_${sec.key}_status`;
                                            const statusVal = selectedItem[statusKey] || 'pending';
                                            return (
                                                <div key={sec.key} className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{sec.label}</span>
                                                    <div className="flex items-center gap-2">
                                                        {statusVal === 'pending' ? (
                                                            <button onClick={() => {
                                                                // Future: Trigger API endpoint for Technical Review Approve
                                                                handleOboTechnicalReview(selectedItem.id, sec.key, 'approved');
                                                            }} className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Approve</button>
                                                        ) : (
                                                            <span className={`text-[10px] font-bold uppercase ${statusVal === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>{statusVal}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Work Order Citizen Verification Panel */}
                            {selectedItem.wo_number && selectedItem.citizen_rating && (
                                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Citizen Verification</div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Rating: {selectedItem.citizen_rating}/5</div>
                                            {selectedItem.citizen_feedback && (
                                                <span className="text-xs text-emerald-600 dark:text-emerald-500 italic">"{selectedItem.citizen_feedback}"</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Procurement Certification Panel - RA 9184 Compliance Gating */}
                            {selectedItem.pr_number && (
                                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[#0038A8] flex items-center gap-2">
                                            <Landmark size={12} />
                                            RA 9184 Compliance Gating
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget Handshake</div>
                                    </div>

                                    <div className="space-y-3">
                                        {/* 1. Funding Certification & ObR */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedItem.funding_certified ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        <Banknote size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Funding Certification</div>
                                                        <div className="text-[10px] text-slate-500">City Treasurer/Budget Office</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="ObR Number"
                                                        value={tmpObr}
                                                        onChange={(e) => setTmpObr(e.target.value)}
                                                        disabled={!['budget_officer', 'admin_officer'].includes(currentUser?.role)}
                                                        className="text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg w-32 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                                    />
                                                    <button
                                                        onClick={() => handleSpecificProcurementUpdate(selectedItem.id, 'funding-certification', { funding_certified: !selectedItem.funding_certified, obr_number: tmpObr })}
                                                        disabled={!['budget_officer', 'admin_officer'].includes(currentUser?.role)}
                                                        className={`text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all ${
                                                            selectedItem.funding_certified 
                                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-none' 
                                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:border-indigo-500 hover:text-indigo-500'
                                                        } disabled:opacity-50`}
                                                    >
                                                        {selectedItem.funding_certified ? 'Certified' : 'Certify'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Cash Availability */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedItem.cash_released ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        <Coins size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Cash Availability</div>
                                                        <div className="text-[10px] text-slate-500">Finance / Accounting Approval</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSpecificProcurementUpdate(selectedItem.id, 'cash-release', { cash_released: !selectedItem.cash_released })}
                                                    disabled={!['finance_officer', 'admin_officer'].includes(currentUser?.role)}
                                                    className={`text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all ${
                                                        selectedItem.cash_released 
                                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-none' 
                                                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:border-amber-500 hover:text-amber-500'
                                                    } disabled:opacity-50`}
                                                >
                                                    {selectedItem.cash_released ? 'Cash Released' : 'Confirm Cash'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* 3. BAC Pre-Procurement Schedule */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedItem.bac_meeting_date ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        <CalendarRange size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">BAC Meeting Schedule</div>
                                                        <div className="text-[10px] text-slate-500">Board Meeting & Pre-Procurement</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <DatePicker
                                                            selected={tmpBacDate}
                                                            onChange={(date) => setTmpBacDate(date)}
                                                            placeholderText="Select Date"
                                                            filterDate={(date) => date.getDay() !== 0 && date.getDay() !== 6} // No weekends
                                                            disabled={!['bac_secretariat', 'admin_officer', 'bac_member'].includes(currentUser?.role)}
                                                            className="text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg w-28 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 cursor-pointer"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleSpecificProcurementUpdate(selectedItem.id, 'bac-schedule', { bac_meeting_date: tmpBacDate })}
                                                        disabled={!['bac_secretariat', 'admin_officer', 'bac_member'].includes(currentUser?.role)}
                                                        className={`text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all ${
                                                            selectedItem.bac_meeting_date 
                                                            ? 'bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-none' 
                                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:border-violet-500 hover:text-violet-500'
                                                        } disabled:opacity-50`}
                                                    >
                                                        {selectedItem.bac_meeting_date ? 'Reschedule' : 'Set Date'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. Notice to Proceed (Legacy Gating) */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedItem.ntp_issued ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        <Shield size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Notice to Proceed (NTP)</div>
                                                        <div className="text-[10px] text-slate-500">Official Award & Mobilization Order</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleProcurementToggle(selectedItem.id, 'ntp_issued', !selectedItem.ntp_issued)}
                                                    disabled={!['city_engineer', 'city_mayor', 'admin_officer'].includes(currentUser?.role)}
                                                    className={`text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all ${
                                                        selectedItem.ntp_issued 
                                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none' 
                                                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:border-emerald-500 hover:text-emerald-500'
                                                    } disabled:opacity-50`}
                                                >
                                                    {selectedItem.ntp_issued ? 'NTP Issued' : 'Issue NTP'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Document & Advance Panel for Projects */}
                            {activePath === '/gov/projects' && (
                                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Phase Completion Gate</div>
                                    </div>

                                    {/* Document Vault - More Prominent */}
                                    <div className="mb-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
                                                Document Vault
                                            </div>
                                            <button onClick={() => setShowDocUploadModal(true)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                                Upload Document
                                            </button>
                                        </div>
                                        
                                        {/* Uploaded Documents List */}
                                        {(projectDocuments || []).length > 0 ? (
                                            <div className="space-y-2">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Uploaded Documents ({projectDocuments.length})</div>
                                                {projectDocuments.map((doc, idx) => (
                                                    <div key={doc.id || idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{doc.document_type?.replace(/_/g, ' ').toUpperCase()}</div>
                                                                <div className="text-[10px] text-slate-400">{doc.file_name}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-[10px] text-slate-400 font-mono">{doc.sha256_hash?.substring(0, 8)}...</div>
                                                            <button onClick={() => deleteDocument(doc.id, selectedItem?.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete document">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-3 text-xs text-slate-400 italic">
                                                No documents uploaded yet. Click "Upload Document" to add required files.
                                            </div>
                                        )}
                                    </div>
                                    
                                    <ComplianceReminder error={advanceError} toTitleCase={toTitleCase} />

                                    {/* Section 4.6 - FQA & Site Audit Gate */}
                                    {(fqaResult || selectedItem.status === 'resolved') && (
                                        <div className="mb-4 p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden relative">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                                            
                                            <div className="flex items-center justify-between mb-4 relative z-10">
                                                <div className="flex items-center gap-2 text-indigo-400">
                                                    <Shield size={18} className="animate-pulse" />
                                                    <span className="font-black text-xs uppercase tracking-widest">Final Quality Audit (FQA)</span>
                                                </div>
                                                {fqaResult && (
                                                    <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${fqaResult.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {fqaResult.passed ? 'CERTIFIED' : 'DEFECTS FOUND'}
                                                    </div>
                                                )}
                                            </div>

                                            {fqaResult ? (
                                                <div className="space-y-3 relative z-10">
                                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                        <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                                                            <div className="text-slate-400 uppercase font-bold mb-1">Technical Reconciliation</div>
                                                            <div className="text-slate-200 font-black">{fqaResult.technical_reconciliation}</div>
                                                        </div>
                                                        <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                                                            <div className="text-slate-400 uppercase font-bold mb-1">Social Clearance</div>
                                                            <div className={`font-black ${fqaResult.social_audit_cleared ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                {fqaResult.social_audit_cleared ? 'CLEARED' : 'PENDING'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selectedItem.fqa_savings > 0 && (
                                                        <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                                            <span className="text-[10px] font-bold text-emerald-400 uppercase">Audit Recovery (Savings):</span>
                                                            <span className="text-xs font-black text-emerald-400">₱{selectedItem.fqa_savings.toLocaleString()}</span>
                                                        </div>
                                                    )}

                                                    <div className="p-2 text-center text-[10px] text-slate-400 italic bg-white/5 rounded-lg border border-white/10">
                                                        {fqaResult.passed 
                                                            ? "Turnover to Permanent Asset Registry authorized. Warranty (DLP) period active." 
                                                            : "Site audit flagged discrepancies. Engineering team must resolve punch list before turnover."
                                                        }
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-2 relative z-10">
                                                    <p className="text-[10px] text-slate-400 mb-4 px-4">
                                                        SWA 100% reached. Field verification required to finalize design reconciliation and citizen closure.
                                                    </p>
                                                    <button 
                                                        onClick={() => {
                                                            setPunchListProject(selectedItem);
                                                            setShowPunchList(true);
                                                        }}
                                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/40 flex items-center justify-center transition-all active:scale-95"
                                                    >
                                                        <HardHat size={14} className="mr-2" />
                                                        PROCEED TO FIELD SITE AUDIT
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <ComplianceReminder error={advanceError} toTitleCase={toTitleCase} />
                                    
                                    {/* Phase Advance Logic */}
                                    {selectedItem.status !== 'closed_completion_certified' && !fqaResult?.passed && (() => {
                                        const proj = items.find(p => p.id === selectedItem.id);
                                        const nextPhase = (proj?.current_phase || 1) + 1;
                                        const PHASE_STATUSES = {
                                            2: "survey_in_progress", 3: "survey_complete", 4: "design_in_progress",
                                            5: "boq_submitted", 6: "pending_budget_check", 7: "budget_confirmed",
                                            8: "approved_by_city_engineer", 9: "dispatched", 10: "in_progress",
                                            11: "milestone_inspections", 12: "resolved", 13: "closed_completion_certified",
                                        };
                                        const nextStatus = PHASE_STATUSES[nextPhase];
                                        const requiredDocs = nextStatus ? getRequiredDocuments(nextStatus, proj?.is_emergency, proj?.estimated_cost) : [];
                                        const uploadedTypes = (projectDocuments || []).map(d => d.document_type);
                                        const missingDocs = requiredDocs.filter(doc => !uploadedTypes.includes(doc));
                                        const hasMissingDocs = missingDocs.length > 0;

                                        return (
                                            <>
                                                {hasMissingDocs && (
                                                    <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                                        <div className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                                                            Missing Required Documents
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {missingDocs.map(doc => (
                                                                <span key={doc} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase">
                                                                    {doc.replace(/_/g, ' ')}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={() => handleAdvancePhase(selectedItem.id)}
                                                    disabled={advancingPhase || hasMissingDocs}
                                                    className={`w-full relative overflow-hidden group text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2 ${hasMissingDocs ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-[#0b4f6c] hover:bg-[#083e55] disabled:bg-slate-400'}`}
                                                >
                                                    {advancingPhase ? 'Executing Compliance Gates...' : hasMissingDocs ? 'Documents Required' : 'Advance to Next Phase'}
                                                    {advancingPhase ? (
                                                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                                    ) : (
                                                        <svg className={`group-hover:translate-x-1 transition-transform ${hasMissingDocs ? 'hidden' : ''}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                                    )}
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                        </div>

                        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setSelectedItem(null)} className="flex-1 py-2 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                Close
                            </button>
                            {activePath === '/gov/work-orders' && selectedItem?.status === 'open' && (
                                <>
                                    <button onClick={() => { setApprovalAction('approve'); setShowApprovalModal(true); }} className="flex-1 py-2 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                                        Approve
                                    </button>
                                    <button onClick={() => { setApprovalAction('reject'); setShowApprovalModal(true); }} className="flex-1 py-2 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors">
                                        Reject
                                    </button>
                                </>
                            )}
                            {(activePath === '/gov/work-orders' || activePath === '/gov/projects') && (
                                <button onClick={() => { setSelectedItem(null); navigate(activePath === '/gov/work-orders' ? '/dispatcher' : '/gov/delivery?view=projects'); }} className="flex-1 py-2 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                                    {activePath === '/gov/work-orders' ? 'Open in reports and dispatch' : 'Return to projects'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ── New Record Modal ── */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNewModal(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 z-10 text-left flex flex-col"
                        style={{ maxHeight: '90vh' }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.icon}`}>
                                    <Plus size={16} />
                                </div>
                                New {config.title.replace(/s$/, '')}
                            </h2>
                            <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                            {submitError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold whitespace-pre-wrap">
                                    {submitError}
                                </div>
                            )}

                            <form id="new-record-form" onSubmit={handleCreateRecord} className="space-y-4 pt-1">
                                {activePath === '/gov/work-orders' && (
                                    <>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Title</label><input type="text" required onChange={e => setNewRecordForm({...newRecordForm, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Description</label><textarea required onChange={e => setNewRecordForm({...newRecordForm, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" rows={3}></textarea></div>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Type</label><OrangeSelect value={newRecordForm.wo_type || 'standard'} onChange={v => setNewRecordForm({...newRecordForm, wo_type: v})} options={[{value:'standard',label:'Standard'},{value:'preemptive',label:'Preemptive'}]} className="w-full" /></div>
                                    </>
                                )}
                                {activePath === '/gov/projects' && (
                                    <>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Project Title</label><input type="text" required onChange={e => setNewRecordForm({...newRecordForm, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Description</label><textarea required onChange={e => setNewRecordForm({...newRecordForm, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" rows={3}></textarea></div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1 block">Estimated Cost (₱)</label>
                                                <input type="number" required onChange={e => setNewRecordForm({...newRecordForm, estimated_cost: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" placeholder="0.00" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1 block">Category</label>
                                                <OrangeSelect 
                                                    value={newRecordForm.category || 'roads'} 
                                                    onChange={v => setNewRecordForm({...newRecordForm, category: v})} 
                                                    options={[
                                                        {value:'roads',label:'Roads & Bridges'},
                                                        {value:'buildings',label:'Public Buildings'},
                                                        {value:'drainage',label:'Drainage/Flood Control'},
                                                        {value:'water',label:'Water Systems'},
                                                        {value:'other',label:'Other'}
                                                    ]} 
                                                    className="w-full" 
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                                            <input 
                                                type="checkbox" 
                                                id="is_emergency"
                                                onChange={e => setNewRecordForm({...newRecordForm, is_emergency: e.target.checked})}
                                                className="w-4 h-4 text-orange-600 rounded bg-white border-slate-300"
                                            />
                                            <label htmlFor="is_emergency" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                                Emergency Project Case (RA 12009)
                                                <div className="text-[10px] font-normal text-slate-500">Enable high-speed negotiated procurement track.</div>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Requesting Party</label><input type="text" required onChange={e => setNewRecordForm({...newRecordForm, requesting_party: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" /></div>
                                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Barangay</label><input type="text" required onChange={e => setNewRecordForm({...newRecordForm, barangay: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" /></div>
                                        </div>
                                    </>
                                )}
                                {activePath === '/gov/obo' && (
                                    <>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Applicant Name</label><input type="text" required onChange={e => setNewRecordForm({...newRecordForm, applicant_name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Property Address</label><input type="text" required onChange={e => setNewRecordForm({...newRecordForm, property_address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Inspection Type</label><OrangeSelect value={newRecordForm.inspection_type || 'building'} onChange={v => setNewRecordForm({...newRecordForm, inspection_type: v})} options={[{value:'building',label:'Building'},{value:'electrical',label:'Electrical'},{value:'mechanical',label:'Mechanical'}]} className="w-full" /></div>
                                    </>
                                )}
                                {activePath === '/gov/procurement' && (
                                    <>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Request Title</label><input type="text" required onChange={e => setNewRecordForm({...newRecordForm, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Purpose</label><textarea required onChange={e => setNewRecordForm({...newRecordForm, purpose: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" rows={3}></textarea></div>
                                    </>
                                )}
                                {activePath === '/gov/advisories' && (
                                    <>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Advisory Title</label><input type="text" required onChange={e => setNewRecordForm({...newRecordForm, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" placeholder="e.g., Scheduled Power Interruption" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Description</label><textarea required onChange={e => setNewRecordForm({...newRecordForm, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" rows={3} placeholder="Provide details about the advisory..."></textarea></div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1 block">Priority</label>
                                                <OrangeSelect 
                                                    value={newRecordForm.priority || 'low'} 
                                                    onChange={v => setNewRecordForm({...newRecordForm, priority: v})} 
                                                    options={[
                                                        {value:'low',label:'Low'},
                                                        {value:'medium',label:'Medium'},
                                                        {value:'high',label:'High'},
                                                        {value:'emergency',label:'Emergency'}
                                                    ]} 
                                                    className="w-full" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1 block">Category</label>
                                                <OrangeSelect 
                                                    value={newRecordForm.category || 'general'} 
                                                    onChange={v => setNewRecordForm({...newRecordForm, category: v})} 
                                                    options={[
                                                        {value:'health',label:'Health & Wellness'},
                                                        {value:'safety',label:'Public Safety'},
                                                        {value:'infrastructure',label:'Infrastructure'},
                                                        {value:'weather',label:'Weather/Natural'},
                                                        {value:'general',label:'General Update'}
                                                    ]} 
                                                    className="w-full" 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Issuing Department</label>
                                            <input type="text" required onChange={e => setNewRecordForm({...newRecordForm, department: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" placeholder="e.g., City Health Office" />
                                        </div>
                                    </>
                                )}
                                {!['/gov/work-orders', '/gov/projects', '/gov/obo', '/gov/procurement', '/gov/advisories'].includes(activePath) && (
                                    <div className="text-sm text-slate-500 py-4 text-center">Form is not available for this module.</div>
                                )}
                            </form>

                        </div>
                        
                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Cancel</button>
                            <button type="submit" form="new-record-form" disabled={isSubmitting || !['/gov/work-orders', '/gov/projects', '/gov/obo', '/gov/procurement', '/gov/advisories'].includes(activePath)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50">
                                {isSubmitting ? 'Saving...' : 'Create Record'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ── Approval Modal ── */}
            {showApprovalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowApprovalModal(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 z-10"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${approvalAction === 'approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {approvalAction === 'approve' ? <CheckCircle2 size={16} /> : <X size={16} />}
                                </div>
                                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Work Order
                            </h2>
                            <button onClick={() => setShowApprovalModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Notes (Optional)</label>
                                <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" rows={3} placeholder="Add notes about this decision..."></textarea>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowApprovalModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Cancel</button>
                                <button onClick={handleApproval} disabled={isApproving} className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-colors ${approvalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
                                    {isApproving ? 'Processing...' : approvalAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* ── Document Upload Modal ── */}
            {showDocUploadModal && selectedItem && (
                <DocumentUploadModal 
                    targetModel="ProjectRequest"
                    targetId={selectedItem.id}
                    onClose={() => {
                        console.log("Modal onClose called");
                        setShowDocUploadModal(false);
                    }}
                    onUploadComplete={(data) => {
                        console.log("Upload complete, data:", data);
                        setAdvanceError(null);
                        if (selectedItem?.id) {
                            fetchProjectDocuments(selectedItem.id);
                        }
                    }}
                />
            )}
            {/* ── Notification Toast Modal ── */}
            {showNotification && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="absolute inset-0 bg-slate-900/40" 
                        onClick={() => setShowNotification(null)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`relative p-6 rounded-2xl shadow-2xl border-2 max-w-sm w-full text-center ${
                            showNotification.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' :
                            showNotification.type === 'error' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                            'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                            showNotification.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600' :
                            showNotification.type === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-600' :
                            'bg-blue-100 dark:bg-blue-900 text-blue-600'
                        }`}>
                            {showNotification.type === 'success' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : showNotification.type === 'error' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            )}
                        </div>
                        <p className={`text-sm font-bold ${
                            showNotification.type === 'success' ? 'text-emerald-800 dark:text-emerald-200' :
                            showNotification.type === 'error' ? 'text-red-800 dark:text-red-200' :
                            'text-blue-800 dark:text-blue-200'
                        }`}>
                            {showNotification.message}
                        </p>
                        <button 
                            onClick={() => setShowNotification(null)}
                            className={`mt-4 px-6 py-2 rounded-xl text-sm font-bold ${
                                showNotification.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                                showNotification.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                                'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            OK
                        </button>
                    </motion.div>
                </div>
            )}
            {/* Mobile Punch List Overlay */}
            {showPunchList && (
                <div className="fixed inset-0 z-[100] bg-white overflow-hidden">
                    <PunchListMobile 
                        project={punchListProject} 
                        onBack={() => {
                            setShowPunchList(false);
                            fetchData(); // Refresh to show audit results
                        }} 
                    />
                </div>
            )}
        </div>
    );
};

export default GovDivisionPage;
