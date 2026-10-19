import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    CheckCircle2,
    RefreshCw,
    Search,
    ShieldCheck,
    Smartphone,
    UserPlus,
    Users,
    X,
    AlertTriangle,
    Eye,
    Key,
    Lock,
    Send,
    UserCheck,
    UserX,
    FileText,
    History,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Clock,
    HelpCircle,
    Bot,
    Sparkles,
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import OrangeSelect from '../components/OrangeSelect';
import SearchInput, { SearchEmptyState } from '../components/SearchInput';
import TablePagination from '../components/TablePagination';
import { apiFetch } from '../utils/apiFetch';
import './administration-workspace.css';

const ADMIN_TABS = [
    { key: 'staff', label: 'Staff Members' },
    { key: 'residents', label: 'Resident Accounts' },
    { key: 'settings', label: 'System Settings' },
    { key: 'automated-ai', label: 'Automated & AI Tools' },
];

const WHY_RULE_INFO = {
    sla_response_time: {
        title: 'Response time targets',
        authority: 'Republic Act No. 11032 (Ease of Doing Business Act) & City Engineering Citizens Charter',
        reason: 'Requires government agencies to establish definite processing timelines. Emergency road hazards and safety risks must be reviewed within 24 hours to protect public safety.',
    },
    record_storage_duration: {
        title: 'How long records are kept',
        authority: 'National Archives of the Philippines (NAP) General Records Disposition Schedule & RA 9470',
        reason: 'Preserves infrastructure engineering plans, bills of materials, and citizen reports for statutory audit requirements before records disposition.',
    },
    activity_log_security: {
        title: 'Change history',
        authority: 'Commission on Audit (COA) Circular 2021-006 & RA 10173 (Data Privacy Act)',
        reason: 'Mandates tamper-evident cryptographic logging for all administrative system operations, ensuring accountability and data integrity.',
    },
    ai_report_category_suggestion: {
        title: 'Report Category Suggestion',
        authority: 'PULSO AI Governance Framework & Executive Order on Civic Automation',
        reason: 'Advisory AI assistance accelerates report triage, but statutory engineering authority strictly requires licensed staff to verify every categorization.',
    },
    ai_flood_drainage_risk: {
        title: 'Flood & Drainage Risk Forecasting',
        authority: 'Disaster Risk Reduction and Management Office (DRRMO) Directive & PAGASA Hydrological Protocol',
        reason: 'Proactively correlates weather forecasts and drainage capacities to highlight high-risk zones, alerting maintenance crews before severe rainfall.',
    },
};

function getSettingDisplayBadge(setting, auditIntegrity) {
    if (setting.key === 'sla_response_time') {
        const u = setting.value?.urgent_hours || 24;
        const s = setting.value?.standard_hours || 48;
        return `${u} hours urgent, ${s} hours standard`;
    }
    if (setting.key === 'record_storage_duration') {
        const y = setting.value?.years || 7;
        return `Kept for ${y} years`;
    }
    if (setting.key === 'activity_log_security') {
        return 'Protected';
    }
    if (setting.key === 'ai_report_category_suggestion') {
        const on = setting.value?.enabled !== false;
        return on ? 'Suggestions only. Staff confirm.' : 'Off. Manual categorization';
    }
    if (setting.key === 'ai_flood_drainage_risk') {
        const on = setting.value?.active !== false;
        const cadence = setting.value?.cadence || '2 weeks';
        return on ? `On. Updates every ${cadence}` : 'Off. Forecast disabled';
    }
    return setting.display_value || 'Configured';
}

const ALL_STAFF_ROLE_OPTIONS = [
    { value: 'city_engineer', label: 'City Engineer', description: 'Department executive head' },
    { value: 'asst_city_engineer', label: 'Asst. City Engineer', description: 'Executive deputy & operations director' },
    { value: 'division_chief', label: 'Division Chief', description: 'Full division authority' },
    { value: 'senior_engineer', label: 'Senior Engineer', description: 'Lead, review & approvals' },
    { value: 'project_engineer', label: 'Project Engineer', description: 'Project oversight & BoQ' },
    { value: 'engineer_ii', label: 'Engineer II', description: 'General engineering & reports' },
    { value: 'design_engineer', label: 'Design Engineer', description: 'Structural & infrastructure design' },
    { value: 'estimator', label: 'Estimator', description: 'Cost analysis & bill of materials' },
    { value: 'cad_operator', label: 'CAD Operator', description: 'Plans, drafting & technical drawings' },
    { value: 'construction_foreman', label: 'Construction Foreman', description: 'On-site execution & crew supervision' },
    { value: 'building_inspector', label: 'Building Inspector', description: 'Structural code compliance' },
    { value: 'electrical_inspector', label: 'Electrical Inspector', description: 'Electrical grid & safety compliance' },
    { value: 'mechanical_inspector', label: 'Mechanical Inspector', description: 'Machinery & HVAC compliance' },
    { value: 'field_worker', label: 'Field Technician', description: 'Field work & mobile app' },
    { value: 'records_officer', label: 'Records Officer', description: 'Municipal document archive & FOI' },
    { value: 'admin_officer', label: 'Administrative Officer', description: 'Office management & administrative support' },
    { value: 'admin_clerk', label: 'Administrative Clerk', description: 'General office clerical duties' },
    { value: 'dispatcher', label: 'Dispatcher', description: 'Triage & crew dispatch' },
    { value: 'system_admin', label: 'System Administrator', description: 'Full administrative access' },
];

function toFriendlyRole(roleKey) {
    if (!roleKey) return 'Staff Member';
    const found = ALL_STAFF_ROLE_OPTIONS.find((r) => r.value === roleKey);
    if (found) return found.label;
    return roleKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const STAFF_ROLE_FILTER_OPTIONS = [
    { value: 'all', label: 'All roles', description: 'Show all employee titles' },
    ...ALL_STAFF_ROLE_OPTIONS,
];

const STAFF_STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses', description: 'Active & deactivated staff' },
    { value: 'active', label: 'Active', description: 'Currently active accounts' },
    { value: 'deactivated', label: 'Deactivated', description: 'Suspended or disabled accounts' },
];

const RESIDENT_STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses', description: 'Show all account statuses' },
    { value: 'active', label: 'Active', description: 'Currently active residents' },
    { value: 'inactive', label: 'Inactive', description: 'Inactive accounts' },
    { value: 'pending', label: 'Pending', description: 'Awaiting email confirmation' },
    { value: 'suspended', label: 'Suspended', description: 'Administratively suspended' },
    { value: 'deactivated', label: 'Deactivated', description: 'Deactivated accounts' },
];

const RESIDENT_VERIFICATION_OPTIONS = [
    { value: 'all', label: 'All ID verification', description: 'Show all ID verification states' },
    { value: 'verified', label: 'Verified', description: 'ID submitted and approved' },
    { value: 'pending', label: 'Pending review', description: 'ID submitted, awaiting staff review' },
    { value: 'rejected', label: 'Rejected', description: 'ID submitted but not accepted' },
    { value: 'na', label: 'N/A (No ID)', description: 'No ID submitted yet' },
];

const RESIDENT_BARANGAY_OPTIONS = [
    { value: 'all', label: 'All Barangays', description: 'All North Caloocan sectors' },
    { value: 'Barangay 171', label: 'Barangay 171 (Bagumbong)' },
    { value: 'Barangay 172', label: 'Barangay 172 (Urduja)' },
    { value: 'Barangay 173', label: 'Barangay 173 (Congress)' },
    { value: 'Barangay 174', label: 'Barangay 174 (Saranay)' },
    { value: 'Barangay 175', label: 'Barangay 175 (Deparo)' },
    { value: 'Barangay 176', label: 'Barangay 176 (Bagong Silang)' },
    { value: 'Barangay 177', label: 'Barangay 177 (Camarin)' },
    { value: 'Barangay 178', label: 'Barangay 178 (Kiko)' },
];

const INVITE_ROLE_OPTIONS = ALL_STAFF_ROLE_OPTIONS;

const OFFICE_OPTIONS = [
    { value: 'Field Operations Team', label: 'Field Operations Team' },
    { value: 'Quality & Inspection Division', label: 'Quality & Inspection Division' },
    { value: 'Survey & Planning Division', label: 'Survey & Planning Division' },
    { value: 'Depot Fleet Operations', label: 'Depot Fleet Operations' },
    { value: 'Project Delivery Office', label: 'Project Delivery Office' },
    { value: 'Office of the City Engineer', label: 'Office of the City Engineer' },
    { value: 'Administrative & Records Division', label: 'Administrative & Records Division' },
];

const ROLE_PERMISSIONS = {
    city_engineer: [
        'Department-wide executive approval and statutory authority',
        'Final executive seal and sign-off on municipal infrastructure',
        'Department budget authorization and administrative control',
        'Complete system-wide access and governance',
    ],
    asst_city_engineer: [
        'Executive deputy oversight for department engineering programs',
        'Endorse major work orders, procurement, and project milestones',
        'Review departmental operational performance and compliance logs',
        'Exercise delegated statutory authority in executive absence',
    ],
    division_chief: [
        'Full approval and expedite authority for division projects',
        'Final sign-off on design packages and work orders',
        'Certify bill of quantities and project budgets',
        'Full division oversight and administrative sign-off',
    ],
    senior_engineer: [
        'Review, approve, and assign work orders to teams',
        'Edit and certify infrastructure design packages',
        'View budget and cost estimates across all department offices',
        'Review team activity logs and compliance history',
    ],
    project_engineer: [
        'Endorse and supervise specific project work orders',
        'Create and submit project design specifications',
        'View assigned project budgets and milestones',
        'Standard project activity logging',
    ],
    engineer_ii: [
        'Create and update assigned field work orders',
        'Review and draft engineering drawings for assigned projects',
        'View office cost estimates and material lists',
        'Standard staff activity logging',
    ],
    design_engineer: [
        'Prepare structural, geometric, and drainage engineering plans',
        'Perform calculations and compliance checks against building codes',
        'Draft technical specifications and drawing sets for review',
        'Standard technical design revision logging',
    ],
    estimator: [
        'Prepare bill of quantities (BoQ) and material cost estimates',
        'Calculate equipment, labor, and contingency expenditure lines',
        'Review market price references and vendor pricing schedules',
        'Fiscal estimation and variance logging',
    ],
    cad_operator: [
        'Draft 2D/3D CAD drawings and civil engineering blueprints',
        'Update spatial coordinates and utility layer alignments',
        'Prepare standardized plotting layouts and revision stamps',
        'CAD revision version control logging',
    ],
    construction_foreman: [
        'Direct on-site engineering crews and heavy equipment operations',
        'Log daily construction milestones, labor headcounts, and site safety',
        'Submit real-time mobile site inspection reports and field photos',
        'Field attendance and dispatch logging',
    ],
    building_inspector: [
        'Conduct on-site structural inspections and National Building Code compliance',
        'Issue inspection notices, certificates of completion, and violation tickets',
        'Log building permit inspection records and spatial coordinates',
        'Regulatory enforcement audit logging',
    ],
    electrical_inspector: [
        'Inspect municipal streetlights, electrical wiring, and transformer grids',
        'Enforce Philippine Electrical Code safety standards and compliance',
        'Certify electrical safety clearances and repair work orders',
        'Grid inspection audit logging',
    ],
    mechanical_inspector: [
        'Inspect drainage pump stations, heavy machinery, and HVAC equipment',
        'Perform mechanical diagnostic checks and maintenance certifications',
        'Log equipment asset health scores and service history',
        'Equipment compliance audit logging',
    ],
    field_worker: [
        'View assigned daily inspection and repair tasks',
        'Upload site photos and completion reports via mobile',
        'Standard mobile field activity logging',
    ],
    records_officer: [
        'Manage municipal engineering archive, blueprints, and records vault',
        'Process official record requests and FOI compliance certificates',
        'Verify record retention schedules and audit document logs',
        'Document custody audit logging',
    ],
    admin_officer: [
        'Oversee office administration, records, and departmental communications',
        'Manage staff roster assignments and attendance records',
        'Review administrative document queues and dispatch workflows',
        'Administrative operations audit logging',
    ],
    admin_clerk: [
        'Prepare routine memos, official notices, and departmental documents',
        'Index and process incoming citizen and engineering correspondence',
        'Standard clerical audit logging',
    ],
    dispatcher: [
        'Triage incoming citizen reports and verify field coordinates',
        'Dispatch field inspection teams and route urgent response crews',
        'Monitor active crew locations and queue throughput in real time',
    ],
    system_admin: [
        'System-wide user administration and role management',
        'Configure municipal SLA policies and retention standards',
        'Verify cryptographic audit log integrity and COA compliance',
        'Manage AI assistants and infrastructure automation tools',
    ],
};

function formatRelativeTime(dateInput) {
    if (!dateInput) return 'Never logged in';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'Never logged in';
    const now = new Date();
    const diffSeconds = Math.max(0, Math.floor((now - date) / 1000));
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STAFF_PAGE_SIZE = 5;
const RESIDENT_PAGE_SIZE = 5;


function TableSkeletonRows({ rows = 6, cols = 7 }) {
    return (
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, rIdx) => (
                <tr key={`skel-row-${rIdx}`} className="animate-pulse">
                    {Array.from({ length: cols }).map((_, cIdx) => (
                        <td key={`skel-cell-${cIdx}`} className="py-3.5 px-3">
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    );
}

function ResidentVerificationBadge({ status, reason, resident }) {
    const raw = status || resident?.id_verification_status || resident?.verification_status || '';
    const norm = raw.toLowerCase().trim();

    if (norm === 'verified') {
        return (
            <span
                title="ID submitted and approved by staff"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap"
            >
                <Check size={13} className="text-emerald-500 shrink-0" />
                <span>Verified</span>
            </span>
        );
    }

    if (norm === 'pending review' || norm === 'pending') {
        return (
            <span
                title="Submitted ID awaiting administrative verification"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap"
            >
                <Clock size={13} className="text-amber-500 shrink-0" />
                <span>Pending review</span>
            </span>
        );
    }

    if (norm === 'rejected') {
        const rejectionReason = reason || resident?.id_rejection_reason;
        return (
            <span
                title={rejectionReason ? `ID rejected: ${rejectionReason}` : 'ID submitted and not accepted'}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 whitespace-nowrap"
            >
                <X size={13} className="text-red-500 shrink-0" />
                <span>Rejected</span>
            </span>
        );
    }

    // Default 4th state: N/A (plain gray text, no badge, no icon)
    return (
        <span
            title="No ID submitted yet."
            className="text-xs font-normal text-slate-400 dark:text-slate-500 cursor-help whitespace-nowrap"
        >
            N/A
        </span>
    );
}

function ResidentStatusBadge({ status, isActive }) {
    // If status is provided, use it; otherwise convert isActive if boolean, else 'Unknown'
    let s = (status || '').toLowerCase().trim();
    if (!s && typeof isActive === 'boolean') {
        s = isActive ? 'active' : 'suspended';
    }

    if (s === 'active') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                Active
            </span>
        );
    }
    if (s === 'inactive') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                Inactive
            </span>
        );
    }
    if (s === 'pending') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                Pending
            </span>
        );
    }
    if (s === 'suspended') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 whitespace-nowrap">
                Suspended
            </span>
        );
    }
    if (s === 'deactivated') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 whitespace-nowrap">
                Deactivated
            </span>
        );
    }
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 whitespace-nowrap"
            title="Status not specified"
        >
            Unknown
        </span>
    );
}

export default function AdministrationWorkspacePage({ workspace = 'administration' }) {
    const [params, setParams] = useSearchParams();

    // Active View & Selections
    const rawTab = params.get('tab') || params.get('view') || 'staff';
    const activeTab = (rawTab === 'agents' || rawTab === 'ai-tools') ? 'automated-ai' : rawTab;
    const userParam = params.get('user');
    const selectedOfficialId = userParam ? Number(userParam) : null;
    const residentParam = params.get('resident');

    // Staff query parameters from URL
    const staffPage = Number(params.get('staff_page')) || (activeTab === 'staff' && Number(params.get('page'))) || 1;
    const staffPageSize = STAFF_PAGE_SIZE;
    const staffSearch = params.get('staff_search') || '';
    const staffRoleFilter = params.get('staff_role') || 'all';
    const staffStatusFilter = params.get('staff_status') || 'all';

    // Resident query parameters from URL
    const residentPage = Number(params.get('res_page')) || (activeTab === 'residents' && Number(params.get('page'))) || 1;
    const residentPageSize = RESIDENT_PAGE_SIZE;
    const residentSearch = params.get('res_search') || '';
    const residentStatusFilter = params.get('res_status') || 'all';
    const residentVerificationFilter = params.get('res_ver') || 'all';
    const residentBarangayFilter = params.get('res_barangay') || 'all';
    const showTestAccounts = params.get('res_test') === 'true';

    // Toast & Refresh State
    const [toastMessage, setToastMessage] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorBanner, setErrorBanner] = useState(null);

    // Current logged-in user
    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem('pulso_user') || 'null');
        } catch {
            return null;
        }
    };
    const currentUser = readUser();

    // ─────────────────────────────────────────────────────────────────────────
    // DATA STATES (Real Database Records)
    // ─────────────────────────────────────────────────────────────────────────
    // Staff Data
    const [staffList, setStaffList] = useState([]);
    const [staffTotal, setStaffTotal] = useState(0);
    const [staffLoading, setStaffLoading] = useState(false);

    // Residents Data
    const [residentsList, setResidentsList] = useState([]);
    const [residentsTotal, setResidentsTotal] = useState(0);
    const [residentsLoading, setResidentsLoading] = useState(false);

    // System Settings Data
    const [settingsList, setSettingsList] = useState([]);
    const [settingsLoading, setSettingsLoading] = useState(false);

    // Audit Integrity State
    const [auditIntegrity, setAuditIntegrity] = useState(null);
    const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
    const [integrityInlineStatus, setIntegrityInlineStatus] = useState(null);

    // Audit History Modal State
    const [isAuditHistoryModalOpen, setIsAuditHistoryModalOpen] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);

    // Staff Edit & Invite Modal States
    const [selectedRole, setSelectedRole] = useState('engineer_ii');
    const [updateReason, setUpdateReason] = useState('');
    const [isConfirmingRoleChange, setIsConfirmingRoleChange] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteLinkBanner, setInviteLinkBanner] = useState(null);
    const [inviteForm, setInviteForm] = useState({
        name: '',
        email: '',
        role: 'engineer_ii',
        office: 'Field Operations Team',
        scope: 'North Caloocan',
        reason: 'Authorized Plantilla Assignment',
    });

    // Resident Action & KYC Review States
    const [residentActionReason, setResidentActionReason] = useState('');
    const [isConfirmingResidentAction, setIsConfirmingResidentAction] = useState(false);
    const [residentTargetStatus, setResidentTargetStatus] = useState(null);
    const [kycModalResident, setKycModalResident] = useState(null);
    const [kycDetails, setKycDetails] = useState(null);
    const [kycLoading, setKycLoading] = useState(false);
    const [kycDecisionReason, setKycDecisionReason] = useState('');

    // Setting Edit Drawer & AI Toggles & Popovers
    const [editingSetting, setEditingSetting] = useState(null);
    const [settingEditForm, setSettingEditForm] = useState({
        urgentHours: 24,
        standardHours: 48,
        retentionYears: 7,
        confidenceThreshold: 75,
        suggestUrgency: true,
        cadence: '2 weeks',
        threshold: 'Moderate (70mm/hr)',
        dataSource: 'PAGASA Radar & Municipal Drainage Sensors',
        reason: '',
    });
    const [settingConfirmStep, setSettingConfirmStep] = useState(false);
    const [activeWhyRulePopover, setActiveWhyRulePopover] = useState(null);
    const [confirmingAiToggle, setConfirmingAiToggle] = useState(null);
    const [aiToolsError, setAiToolsError] = useState(false);

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 4500);
    };

    const updateParam = (key, value, replace = true) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            if (value === null || value === undefined || value === '') next.delete(key);
            else next.set(key, String(value));
            return next;
        }, { replace });
    };

    const setMultipleParams = (updates) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            Object.entries(updates).forEach(([key, val]) => {
                if (val === null || val === undefined || val === '') next.delete(key);
                else next.set(key, String(val));
            });
            return next;
        }, { replace: true });
    };

    const staffTableWrapperRef = useRef(null);
    const residentTableWrapperRef = useRef(null);
    const lastFocusedResidentIdRef = useRef(null);
    const [a11yAnnouncement, setA11yAnnouncement] = useState('');

    const handleStaffPageChange = (newPage) => {
        setMultipleParams({ staff_page: newPage, page: newPage });
        if (staffTableWrapperRef.current) {
            staffTableWrapperRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleResidentPageChange = (newPage) => {
        setMultipleParams({ res_page: newPage, page: newPage });
        if (residentTableWrapperRef.current) {
            residentTableWrapperRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Auto-navigate to valid last page if deletions or filtering reduced total pages below current staffPage
    useEffect(() => {
        if (staffTotal > 0) {
            const maxPage = Math.max(1, Math.ceil(staffTotal / STAFF_PAGE_SIZE));
            if (staffPage > maxPage) {
                updateParam('staff_page', maxPage);
            }
        } else if (staffPage > 1) {
            updateParam('staff_page', 1);
        }
    }, [staffTotal, staffPage]);

    // Auto-navigate to valid last page if resident records change
    useEffect(() => {
        if (residentsTotal > 0) {
            const maxPage = Math.max(1, Math.ceil(residentsTotal / RESIDENT_PAGE_SIZE));
            if (residentPage > maxPage) {
                updateParam('res_page', maxPage);
            }
        } else if (residentPage > 1) {
            updateParam('res_page', 1);
        }
    }, [residentsTotal, residentPage]);

    // ─────────────────────────────────────────────────────────────────────────
    // DATA FETCHING (Single Unified apiFetch Client with Backoff)
    // ─────────────────────────────────────────────────────────────────────────

    // 1. Fetch Staff with server-side pagination & filters
    const fetchStaff = useCallback(async () => {
        setStaffLoading(true);
        setErrorBanner(null);
        try {
            const q = new URLSearchParams();
            if (staffSearch.trim()) q.set('search', staffSearch.trim());
            if (staffRoleFilter !== 'all') q.set('role', staffRoleFilter);
            if (staffStatusFilter !== 'all') q.set('status', staffStatusFilter);
            q.set('page', String(staffPage));
            q.set('pageSize', String(STAFF_PAGE_SIZE));

            const res = await apiFetch(`/api/admin/staff?${q.toString()}`);
            if (res.ok && res.data) {
                setStaffList(res.data.items || []);
                setStaffTotal(res.data.total || 0);
            } else {
                setErrorBanner(res.message || 'Unable to load staff records from the database.');
            }
        } catch {
            setErrorBanner('Connection failed while reaching the administration server.');
        } finally {
            setStaffLoading(false);
        }
    }, [staffSearch, staffRoleFilter, staffStatusFilter, staffPage]);

    // 2. Fetch Residents with server-side pagination & filters
    const fetchResidents = useCallback(async () => {
        setResidentsLoading(true);
        setErrorBanner(null);
        try {
            const q = new URLSearchParams();
            if (residentSearch.trim()) q.set('search', residentSearch.trim());
            if (residentStatusFilter !== 'all') q.set('status', residentStatusFilter);
            if (residentVerificationFilter !== 'all') q.set('id_verification', residentVerificationFilter);
            if (residentBarangayFilter !== 'all') q.set('barangay', residentBarangayFilter);
            if (showTestAccounts) q.set('show_test', 'true');
            q.set('page', String(residentPage));
            q.set('pageSize', String(RESIDENT_PAGE_SIZE));

            const res = await apiFetch(`/api/admin/residents?${q.toString()}`);
            if (res.ok && res.data) {
                setResidentsList(res.data.items || []);
                setResidentsTotal(res.data.total || 0);
            } else {
                setErrorBanner(res.message || 'Unable to load resident records from the database.');
            }
        } catch {
            setErrorBanner('Connection failed while reaching the administration server.');
        } finally {
            setResidentsLoading(false);
        }
    }, [residentSearch, residentStatusFilter, residentVerificationFilter, residentBarangayFilter, showTestAccounts, residentPage]);

    // 3. Fetch Settings & Integrity
    const fetchSettings = useCallback(async () => {
        setSettingsLoading(true);
        setErrorBanner(null);
        setAiToolsError(false);
        try {
            const [settingsRes, integrityRes] = await Promise.all([
                apiFetch('/api/admin/settings'),
                apiFetch('/api/admin/audit-integrity'),
            ]);

            if (settingsRes.ok && settingsRes.data) {
                setSettingsList(settingsRes.data.settings || []);
            } else {
                setAiToolsError(true);
            }
            if (integrityRes.ok && integrityRes.data) {
                setAuditIntegrity(integrityRes.data);
            }
        } catch {
            setErrorBanner('Failed to load system settings and audit ledger integrity.');
            setAiToolsError(true);
        } finally {
            setSettingsLoading(false);
        }
    }, []);

    // Initial counts load for tab counters
    useEffect(() => {
        apiFetch('/api/admin/staff?page=1&pageSize=1').then((r) => {
            if (r.ok && r.data) setStaffTotal(r.data.total || 0);
        });
        apiFetch('/api/admin/residents?page=1&pageSize=1').then((r) => {
            if (r.ok && r.data) setResidentsTotal(r.data.total || 0);
        });
    }, []);

    // Active tab-dependent loads
    useEffect(() => {
        if (activeTab === 'staff') {
            fetchStaff();
        } else if (activeTab === 'residents') {
            fetchResidents();
        } else if (activeTab === 'settings' || activeTab === 'automated-ai' || activeTab === 'agents') {
            fetchSettings();
        }
    }, [activeTab, fetchStaff, fetchResidents, fetchSettings]);

    // Global Header Refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (activeTab === 'staff') await fetchStaff();
        else if (activeTab === 'residents') await fetchResidents();
        else await fetchSettings();
        setIsRefreshing(false);
        showToast('Administrative records and governance policies refreshed.');
    };

    // Staff & Admin Counts & Selected Official
    const staffTotalAdminCount = useMemo(() => {
        return staffList.filter((s) => (s.role === 'system_admin' || s.role === 'admin') && s.is_active).length;
    }, [staffList]);

    const selectedOfficial = useMemo(() => {
        if (!selectedOfficialId) return null;
        return staffList.find((s) => s.id === selectedOfficialId) || null;
    }, [staffList, selectedOfficialId]);

    const selectedResident = useMemo(() => {
        if (!residentParam) return null;
        return residentsList.find((r) => String(r.id) === residentParam || r.resident_id === residentParam) || null;
    }, [residentsList, residentParam]);

    const handleCloseStaffPanel = useCallback(() => {
        setMultipleParams({ user: null, view: 'staff', tab: 'staff' });
        setA11yAnnouncement('Staff details closed');
    }, []);

    const handleToggleStaffPanel = (official) => {
        if (!official) {
            handleCloseStaffPanel();
            return;
        }
        const isCurrentlySelected = selectedOfficialId === official.id || userParam === String(official.id);
        if (isCurrentlySelected) {
            handleCloseStaffPanel();
        } else {
            setMultipleParams({ user: String(official.id), view: 'staff', tab: 'staff' });
            setA11yAnnouncement(`Staff details opened for ${official.name}`);
        }
    };

    const handleCloseResidentPanel = useCallback(() => {
        setMultipleParams({ resident: null, view: 'residents', tab: 'residents' });
        setA11yAnnouncement('Details closed');
        if (lastFocusedResidentIdRef.current) {
            const el = document.getElementById(`resident-row-${lastFocusedResidentIdRef.current}`) ||
                       document.getElementById(`resident-card-${lastFocusedResidentIdRef.current}`);
            el?.focus();
        }
    }, []);

    const handleToggleResidentPanel = (res) => {
        const isCurrentlySelected = selectedResident?.id === res.id || residentParam === res.resident_id || residentParam === String(res.id);
        if (isCurrentlySelected) {
            handleCloseResidentPanel();
        } else {
            lastFocusedResidentIdRef.current = res.id;
            setMultipleParams({ resident: res.resident_id || String(res.id), view: 'residents', tab: 'residents' });
            setA11yAnnouncement(`Details opened for ${res.name}`);
        }
    };

    // Close staff panel on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && selectedOfficial) {
                handleCloseStaffPanel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedOfficial, handleCloseStaffPanel]);

    // Close resident panel on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && selectedResident) {
                handleCloseResidentPanel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedResident, handleCloseResidentPanel]);

    // Auto-close if resident disappears after filter or search
    useEffect(() => {
        if (residentParam && !residentsLoading && residentsList.length > 0) {
            const found = residentsList.some((r) => String(r.id) === residentParam || r.resident_id === residentParam);
            if (!found) {
                updateParam('resident', null, false);
            }
        }
    }, [residentsList, residentParam, residentsLoading]);

    useEffect(() => {
        if (selectedOfficial) {
            setSelectedRole(selectedOfficial.role || 'engineer_ii');
            setUpdateReason('');
            setIsConfirmingRoleChange(false);
        }
    }, [selectedOfficial]);

    useEffect(() => {
        if (selectedResident) {
            setResidentActionReason('');
            setIsConfirmingResidentAction(false);
        }
    }, [selectedResident]);

    // Role save guardrails
    const isSelfOfficial = currentUser && selectedOfficial && currentUser.id === selectedOfficial.id;
    const isLastAdminOfficial = selectedOfficial && (selectedOfficial.role === 'system_admin' || selectedOfficial.role === 'admin') && staffTotalAdminCount <= 1 && selectedRole !== 'system_admin' && selectedRole !== 'admin';
    const hasRoleChanged = selectedOfficial && selectedRole !== selectedOfficial.role;
    const hasRoleReason = updateReason.trim().length >= 3;
    const canSaveRole = hasRoleChanged && hasRoleReason && !isSelfOfficial && !isLastAdminOfficial;

    const getRoleSaveDisabledReason = () => {
        if (isSelfOfficial) return 'Security policy prevents modifying your own administrative role.';
        if (isLastAdminOfficial) return 'Operation rejected: Cannot demote the last remaining System Administrator.';
        if (!hasRoleChanged) return 'Please select a different role to update.';
        if (!hasRoleReason) return 'Reason for update is required (at least 3 characters) for audit compliance.';
        return '';
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION HANDLERS
    // ─────────────────────────────────────────────────────────────────────────

    // Staff Invite Submit
    const handleAddStaffSubmit = async (e) => {
        e.preventDefault();
        if (!inviteForm.name.trim() || !inviteForm.email.trim() || !inviteForm.reason.trim()) {
            showToast('Please fill in all required fields including justification.');
            return;
        }

        const res = await apiFetch('/api/admin/staff', {
            method: 'POST',
            body: JSON.stringify({
                full_name: inviteForm.name.trim(),
                email: inviteForm.email.trim(),
                role: inviteForm.role,
                office: inviteForm.office,
                scope: inviteForm.scope,
                reason: inviteForm.reason.trim(),
            }),
        });

        if (res.ok && res.data) {
            setIsInviteModalOpen(false);
            setInviteLinkBanner(res.data.invite_link);
            showToast(`Invitation created for ${res.data.email}. Staff member added.`);
            setInviteForm({
                name: '',
                email: '',
                role: 'engineer_ii',
                office: 'Field Operations Team',
                scope: 'North Caloocan',
                reason: 'Authorized Plantilla Assignment',
            });
            fetchStaff();
        } else {
            showToast(res.message || 'Error creating staff invitation.');
        }
    };

    // Staff Role Save after confirmation
    const handleExecuteRoleChange = async () => {
        if (!selectedOfficial || !canSaveRole) return;

        const res = await apiFetch(`/api/admin/staff/${selectedOfficial.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                role: selectedRole,
                reason: updateReason.trim(),
            }),
        });

        if (res.ok && res.data) {
            showToast(`Role updated to ${toFriendlyRole(selectedRole)} for ${selectedOfficial.name}.`);
            setIsConfirmingRoleChange(false);
            setUpdateReason('');
            fetchStaff();
        } else {
            showToast(res.message || 'Failed to update staff role.');
        }
    };

    // Toggle Staff Active/Deactivated Status
    const handleToggleStaffStatus = async (staffMember) => {
        const newActiveState = !staffMember.is_active;
        const actionLabel = newActiveState ? 'reactivate' : 'deactivate';

        if (currentUser && currentUser.id === staffMember.id) {
            showToast('Security policy prevents deactivating your own administrative account.');
            return;
        }

        if (staffMember.role === 'system_admin' && staffTotalAdminCount <= 1 && !newActiveState) {
            showToast('Operation rejected: Cannot deactivate the last remaining System Administrator.');
            return;
        }

        const reasonPrompt = window.prompt(
            `Enter official justification to ${actionLabel} ${staffMember.name}:`,
            `Executive administrative directive - ${actionLabel}`
        );
        if (!reasonPrompt || !reasonPrompt.trim()) return;

        const res = await apiFetch(`/api/admin/staff/${staffMember.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                is_active: newActiveState,
                reason: reasonPrompt.trim(),
            }),
        });

        if (res.ok) {
            showToast(`Account for ${staffMember.name} has been ${newActiveState ? 'reactivated' : 'deactivated'}.`);
            fetchStaff();
        } else {
            showToast(res.message || 'Operation failed.');
        }
    };

    // Resident Status Changes from side panel
    const handleExecuteResidentStatusChange = async (targetStatus) => {
        if (!selectedResident) return;
        const finalStatus = targetStatus || residentTargetStatus;
        if (!finalStatus) return;

        if (!residentActionReason.trim() || residentActionReason.trim().length < 3) {
            showToast('Please add a reason (at least 3 characters) to continue.');
            return;
        }

        const res = await apiFetch(`/api/admin/residents/${selectedResident.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
                status: finalStatus,
                reason: residentActionReason.trim(),
            }),
        });

        if (res.ok && res.data) {
            showToast(`Resident ${selectedResident.name} status updated to ${res.data.status || finalStatus}.`);
            setIsConfirmingResidentAction(false);
            setResidentActionReason('');
            setResidentTargetStatus(null);
            fetchResidents();
        } else {
            showToast(res.message || 'Failed to update resident status.');
        }
    };

    const handleResendResidentConfirmation = async () => {
        if (!selectedResident) return;
        const res = await apiFetch(`/api/admin/residents/${selectedResident.id}/resend-confirmation`, {
            method: 'POST',
        });
        if (res.ok) {
            showToast(res.data?.message || 'Confirmation link re-issued successfully.');
        } else {
            showToast(res.message || 'Failed to resend confirmation.');
        }
    };

    // Open Resident KYC Inspection
    const handleOpenKycReview = async (resident) => {
        setKycModalResident(resident);
        setKycLoading(true);
        setKycDecisionReason('');
        try {
            const res = await apiFetch(`/api/admin/residents/${resident.id}/verification`);
            if (res.ok && res.data) {
                setKycDetails(res.data);
            } else {
                showToast(res.message || 'Failed to retrieve verification details.');
            }
        } catch {
            showToast('Error communicating with verification service.');
        } finally {
            setKycLoading(false);
        }
    };

    // Submit KYC Verification Decision
    const handleKycDecision = async (decision) => {
        if (!kycModalResident) return;
        const res = await apiFetch(`/api/admin/residents/${kycModalResident.id}/verify`, {
            method: 'POST',
            body: JSON.stringify({
                decision,
                reason: kycDecisionReason.trim() || `Verified by System Admin ${currentUser?.name || ''}`,
            }),
        });

        if (res.ok) {
            showToast(`Resident verification ${decision}d.`);
            setKycModalResident(null);
            fetchResidents();
        } else {
            showToast(res.message || 'Failed to submit verification decision.');
        }
    };

    // Open Setting Edit Drawer
    const handleOpenEditSetting = (setting) => {
        setEditingSetting(setting);
        setSettingConfirmStep(false);
        if (setting.key === 'sla_response_time') {
            setSettingEditForm({
                urgentHours: setting.value?.urgent_hours || 24,
                standardHours: setting.value?.standard_hours || 48,
                retentionYears: 7,
                confidenceThreshold: 75,
                suggestUrgency: true,
                cadence: '2 weeks',
                threshold: 'Moderate (70mm/hr)',
                dataSource: 'PAGASA Radar & Municipal Drainage Sensors',
                reason: '',
            });
        } else if (setting.key === 'record_storage_duration') {
            setSettingEditForm({
                urgentHours: 24,
                standardHours: 48,
                retentionYears: setting.value?.years || 7,
                confidenceThreshold: 75,
                suggestUrgency: true,
                cadence: '2 weeks',
                threshold: 'Moderate (70mm/hr)',
                dataSource: 'PAGASA Radar & Municipal Drainage Sensors',
                reason: '',
            });
        } else if (setting.key === 'ai_report_category_suggestion') {
            setSettingEditForm({
                urgentHours: 24,
                standardHours: 48,
                retentionYears: 7,
                confidenceThreshold: setting.value?.confidence_threshold || 75,
                suggestUrgency: setting.value?.suggest_urgency !== false,
                cadence: '2 weeks',
                threshold: 'Moderate (70mm/hr)',
                dataSource: 'PAGASA Radar & Municipal Drainage Sensors',
                reason: '',
            });
        } else if (setting.key === 'ai_flood_drainage_risk') {
            setSettingEditForm({
                urgentHours: 24,
                standardHours: 48,
                retentionYears: 7,
                confidenceThreshold: 75,
                suggestUrgency: true,
                cadence: setting.value?.cadence || '2 weeks',
                threshold: setting.value?.threshold || 'Moderate (70mm/hr)',
                dataSource: setting.value?.data_source || 'PAGASA Radar & Municipal Drainage Sensors',
                reason: '',
            });
        }
    };

    // Save Setting Edit (Updates without full page reload & shows "Saved" toast)
    const handleSaveSetting = async () => {
        if (!editingSetting) return;
        if (!settingEditForm.reason.trim()) {
            showToast('Reason for change is required for compliance audit logging.');
            return;
        }

        let payloadValue = {};
        if (editingSetting.key === 'sla_response_time') {
            payloadValue = {
                urgent_hours: Number(settingEditForm.urgentHours),
                standard_hours: Number(settingEditForm.standardHours),
                display: `${settingEditForm.urgentHours} hours urgent, ${settingEditForm.standardHours} hours standard`,
            };
        } else if (editingSetting.key === 'record_storage_duration') {
            payloadValue = {
                years: Number(settingEditForm.retentionYears),
                review_cycle: 'Scheduled archivist review',
                display: `Kept for ${settingEditForm.retentionYears} years`,
            };
        } else if (editingSetting.key === 'ai_report_category_suggestion') {
            const isEnabled = editingSetting.value?.enabled !== false;
            payloadValue = {
                ...editingSetting.value,
                enabled: isEnabled,
                mode: 'advisory',
                require_confirmation: true,
                confidence_threshold: Number(settingEditForm.confidenceThreshold),
                suggest_urgency: Boolean(settingEditForm.suggestUrgency),
                display: isEnabled ? 'Suggestions only. Staff confirm.' : 'Off. Manual categorization',
            };
        } else if (editingSetting.key === 'ai_flood_drainage_risk') {
            const isActive = editingSetting.value?.active !== false;
            payloadValue = {
                ...editingSetting.value,
                active: isActive,
                cadence: settingEditForm.cadence,
                threshold: settingEditForm.threshold,
                data_source: settingEditForm.dataSource,
                display: isActive ? `On. Updates every ${settingEditForm.cadence}` : 'Off. Forecast disabled',
            };
        }

        const res = await apiFetch(`/api/admin/settings/${editingSetting.key}`, {
            method: 'PUT',
            body: JSON.stringify({
                value: payloadValue,
                reason: settingEditForm.reason.trim(),
            }),
        });

        if (res.ok) {
            setSettingsList((prev) =>
                prev.map((s) => (s.key === editingSetting.key ? {
                    ...s,
                    value: payloadValue,
                    display_value: payloadValue.display,
                    updated_at: 'Just now',
                    updated_by: currentUser?.name || 'System Admin',
                } : s))
            );
            showToast('Saved');
            setEditingSetting(null);
        } else {
            showToast(res.message || 'Failed to update setting.');
        }
    };

    // AI Tool Toggle Switches (On / Off with confirmation dialog when turning off)
    const handleToggleAiTool = (tool) => {
        const isCurrentlyOn = tool.key === 'ai_report_category_suggestion'
            ? tool.value?.enabled !== false
            : tool.value?.active !== false;

        if (isCurrentlyOn) {
            setConfirmingAiToggle(tool);
        } else {
            executeToggleAiTool(tool, true, 'Administrative toggle - turned on');
        }
    };

    const executeToggleAiTool = async (tool, nextState, reason) => {
        let payloadValue = {};
        if (tool.key === 'ai_report_category_suggestion') {
            payloadValue = {
                ...tool.value,
                enabled: nextState,
                mode: 'advisory',
                require_confirmation: true,
                display: nextState ? 'Suggestions only. Staff confirm.' : 'Off. Manual categorization',
            };
        } else if (tool.key === 'ai_flood_drainage_risk') {
            const cadence = tool.value?.cadence || '2 weeks';
            payloadValue = {
                ...tool.value,
                active: nextState,
                cadence,
                display: nextState ? `On. Updates every ${cadence}` : 'Off. Forecast disabled',
            };
        }

        // Optimistically update local settings list
        setSettingsList((prev) =>
            prev.map((s) => (s.key === tool.key ? {
                ...s,
                value: payloadValue,
                display_value: payloadValue.display,
                updated_at: 'Just now',
                updated_by: currentUser?.name || 'System Admin',
            } : s))
        );

        const res = await apiFetch(`/api/admin/settings/${tool.key}`, {
            method: 'PUT',
            body: JSON.stringify({
                value: payloadValue,
                reason,
            }),
        });

        if (res.ok) {
            showToast('Saved');
        } else {
            showToast(res.message || 'Failed to toggle setting.');
            fetchSettings();
        }
    };

    const handleConfirmTurnOffAi = async () => {
        if (!confirmingAiToggle) return;
        const tool = confirmingAiToggle;
        setConfirmingAiToggle(null);
        await executeToggleAiTool(tool, false, `Administrative toggle - turned off ${tool.title}`);
    };

    // Run Real Audit Integrity Check ("Check records")
    const handleRunIntegrityCheck = async () => {
        setIsCheckingIntegrity(true);
        try {
            const res = await apiFetch('/api/admin/audit-integrity');
            if (res.ok && res.data) {
                setAuditIntegrity(res.data);
                setIntegrityInlineStatus('Checked just now. No changes found.');
                showToast('Checked just now. No changes found.');
            }
        } catch {
            showToast('Error executing cryptographic audit ledger verification.');
            setIntegrityInlineStatus('Verification failed');
        } finally {
            setIsCheckingIntegrity(false);
        }
    };

    // Open Audit History Drawer
    const handleOpenAuditHistory = async () => {
        setIsAuditHistoryModalOpen(true);
        setAuditLogsLoading(true);
        try {
            const res = await apiFetch('/api/admin/audit-logs?page_size=30');
            if (res.ok && res.data) {
                setAuditLogs(res.data.items || []);
            }
        } catch {
            showToast('Could not load audit log records.');
        } finally {
            setAuditLogsLoading(false);
        }
    };

    return (
        <div className="admin-page">
            <GovSidebar currentUser={currentUser} activeTab="settings" />

            <div className="admin-shell">
                {/* ═══════════════════════════════════════════════════════════════
                    1. TWO-TIER ADMIN HEADER: TIER 1 (Global Controls)
                ════════════════════════════════════════════════════════════════ */}
                <header className="citizen-reports-topbar">
                    {/* Left: Breadcrumbs & Heading */}
                    <div className="flex flex-col text-left">
                        <GovBreadcrumb category="System Admin" current="Staff & System Settings" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">
                            Staff & System Settings
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Manage city engineering staff accounts, roles, resident access, and department preferences.
                        </p>
                    </div>

                    {/* Right: Global Controls in ONE Horizontal Row */}
                    <div className="citizen-reports-topbar__actions">
                        {toastMessage && (
                            <div className="citizen-reports-toast-pill" role="status">
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <ThemeToggle />
                        <button
                            type="button"
                            className="citizen-reports-icon-button"
                            onClick={handleRefresh}
                            aria-label="Refresh settings"
                            title="Refresh data"
                        >
                            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </header>

                {/* ═══════════════════════════════════════════════════════════════
                    2. TIER 2: TABS BAR & TAB-SPECIFIC ACTIONS
                ════════════════════════════════════════════════════════════════ */}
                <div className="admin-tabs-bar">
                    <div className="admin-tabs-list" role="tablist">
                        {ADMIN_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                className={`admin-tab${activeTab === tab.key ? ' is-active' : ''}`}
                                onClick={() => {
                                    setMultipleParams({ view: tab.key, tab: tab.key, user: null, resident: null });
                                }}
                            >
                                {tab.label}
                                {tab.key === 'staff' && staffTotal > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {staffTotal}
                                    </span>
                                )}
                                {tab.key === 'residents' && residentsTotal > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {residentsTotal}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab-Specific Action: Show '+ Add Staff Member' ONLY on Staff Members tab */}
                    <div className="admin-actions-bar">
                        {activeTab === 'staff' && (
                            <button
                                type="button"
                                className="work-orders-create-btn inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#ff6b00] hover:bg-[#e65c00] transition-colors shadow-sm cursor-pointer"
                                onClick={() => setIsInviteModalOpen(true)}
                            >
                                <UserPlus size={14} /> Add Staff Member
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Banner when Unreachable */}
                {errorBanner && (
                    <div className="mx-6 mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={15} className="shrink-0" />
                            <span>{errorBanner}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Staff Invite Link Result Banner */}
                {inviteLinkBanner && (
                    <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="shrink-0" />
                            <span>Invitation Link Generated: <strong>{inviteLinkBanner}</strong> (Send to official securely)</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setInviteLinkBanner(null)}
                            className="text-emerald-600 hover:text-emerald-800 p-1"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    3. MAIN CONTENT PANELS
                ════════════════════════════════════════════════════════════════ */}
                <main className="admin-main">
                    {activeTab === 'staff' ? (
                        /* ── TAB 1: STAFF MEMBERS (REAL DATABASE RECORDS) ────────── */
                        <div className="flex flex-col gap-4">
                            {/* Toolbar: Unified SearchInput & Dropdowns */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                                <SearchInput
                                    value={staffSearch}
                                    onChange={(val) => setMultipleParams({ staff_search: val, staff_page: 1 })}
                                    placeholder="Search name, ID, role or department"
                                    ariaLabel="Search staff members"
                                    onClear={() => setMultipleParams({ staff_search: '', staff_page: 1 })}
                                    className="w-full sm:w-[320px]"
                                />
                                <div className="flex items-center gap-2">
                                    <OrangeSelect
                                        value={staffRoleFilter}
                                        onChange={(val) => setMultipleParams({ staff_role: val, staff_page: 1 })}
                                        options={STAFF_ROLE_FILTER_OPTIONS}
                                        size="sm"
                                        minWidth="160px"
                                        searchable={false}
                                    />
                                    <OrangeSelect
                                        value={staffStatusFilter}
                                        onChange={(val) => setMultipleParams({ staff_status: val, staff_page: 1 })}
                                        options={STAFF_STATUS_OPTIONS}
                                        size="sm"
                                        minWidth="140px"
                                        searchable={false}
                                    />
                                </div>
                            </div>

                            <div className={`admin-layout-split gap-4${selectedOfficial ? ' has-panel' : ''}`}>
                                {/* Staff Table */}
                                <div ref={staffTableWrapperRef} className="admin-table-wrapper rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs flex flex-col flex-1">
                                    <div className="overflow-x-auto w-full flex-1 min-h-[320px]">
                                        <table className="records-table w-full text-left">
                                            <thead>
                                                <tr>
                                                    <th>Staff Member</th>
                                                    <th>Email</th>
                                                    <th>Assigned Role</th>
                                                    <th>Office & Scope</th>
                                                    <th>Status</th>
                                                    <th>Last Active</th>
                                                    <th className="text-right">Action</th>
                                                </tr>
                                            </thead>
                                            {staffLoading ? (
                                                <TableSkeletonRows rows={STAFF_PAGE_SIZE} cols={7} />
                                            ) : staffList.length === 0 ? (
                                                <tbody>
                                                    <tr>
                                                        <td colSpan={7} className="p-0">
                                                            {staffSearch || staffRoleFilter !== 'all' || staffStatusFilter !== 'all' ? (
                                                                <SearchEmptyState
                                                                    query={staffSearch}
                                                                    message="No staff match these filters. Change your query or clear filters to view all staff."
                                                                    onClear={() => setMultipleParams({ staff_search: '', staff_role: 'all', staff_status: 'all', staff_page: 1 })}
                                                                />
                                                            ) : (
                                                                <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                                                                    No staff members found.
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            ) : (
                                                <tbody>
                                                    {staffList.map((official) => {
                                                        const isSelected = selectedOfficialId === official.id;
                                                        const isSelf = currentUser && currentUser.id === official.id;
                                                        const isLastAdmin = (official.role === 'system_admin' || official.role === 'admin') && staffTotalAdminCount <= 1;

                                                        return (
                                                            <tr
                                                                key={official.id}
                                                                className={isSelected ? 'is-selected' : ''}
                                                                onClick={() => handleToggleStaffPanel(official)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        handleToggleStaffPanel(official);
                                                                    }
                                                                }}
                                                                tabIndex={0}
                                                                role="button"
                                                                aria-expanded={isSelected}
                                                                aria-label={`Staff member ${official.name}, ${official.friendly_role}`}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                <td>
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="admin-avatar-small bg-[#ff6b00]/10 text-[#ff6b00] font-black">
                                                                            {official.name?.charAt(0) || 'E'}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                                                                                {official.name}
                                                                                {isSelf && (
                                                                                    <span className="ml-1.5 text-[10px] text-[#ff6b00] font-mono-data font-bold">(You)</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[10.5px] font-mono-data text-slate-400">
                                                                                {official.official_id}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="text-xs text-slate-600 dark:text-slate-300 font-mono-data">
                                                                    {official.email}
                                                                </td>
                                                                <td>
                                                                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                                        {official.friendly_role}
                                                                    </span>
                                                                </td>
                                                                <td className="text-xs text-slate-600 dark:text-slate-300">
                                                                    <div>{official.office}</div>
                                                                    <div className="text-[10px] text-slate-400">{official.scope}</div>
                                                                </td>
                                                                <td>
                                                                    <span className={`admin-mfa-badge ${official.is_active ? 'is-on' : 'is-off'}`}>
                                                                        {official.status}
                                                                    </span>
                                                                </td>
                                                                <td className="text-xs text-slate-500 font-mono-data">
                                                                    <span
                                                                        title={official.last_active}
                                                                        className="whitespace-nowrap cursor-help hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                                                    >
                                                                        {formatRelativeTime(official.last_active_raw || official.last_active)}
                                                                    </span>
                                                                </td>
                                                                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleStaffPanel(official)}
                                                                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={isSelf || (isLastAdmin && official.is_active)}
                                                                            onClick={() => handleToggleStaffStatus(official)}
                                                                            title={
                                                                                isSelf
                                                                                    ? 'Security policy prevents deactivating your own administrative account'
                                                                                    : isLastAdmin && official.is_active
                                                                                    ? 'Cannot deactivate the last remaining System Administrator'
                                                                                    : official.is_active
                                                                                    ? 'Deactivate account'
                                                                                    : 'Reactivate account'
                                                                            }
                                                                            className={`p-1.5 rounded-md text-xs cursor-pointer ${
                                                                                official.is_active
                                                                                    ? 'text-red-500 hover:bg-red-500/10'
                                                                                    : 'text-emerald-500 hover:bg-emerald-500/10'
                                                                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                                                                        >
                                                                            {official.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            )}
                                        </table>
                                    </div>

                                    {/* Pagination Footer */}
                                    <TablePagination
                                        page={staffPage}
                                        pageSize={STAFF_PAGE_SIZE}
                                        total={staffTotal}
                                        itemLabel="staff"
                                        onPageChange={handleStaffPageChange}
                                    />
                                </div>

                                {/* Backdrop for drawer below 1280px */}
                                {selectedOfficial && (
                                    <div
                                        className="admin-editor-backdrop xl:hidden"
                                        onClick={handleCloseStaffPanel}
                                    />
                                )}

                                {/* Side Editor Rail */}
                                <AnimatePresence>
                                    {selectedOfficial && (
                                        <motion.aside
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="admin-editor-rail shrink-0"
                                        >
                                            <div className="admin-panel-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                                                <div className="admin-panel-accent-strip" />

                                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
                                                    <div>
                                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                            Staff Role & Permissions
                                                        </h3>
                                                        <p className="text-[11px] text-slate-500">
                                                            Modify operational duties and service bounds
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleCloseStaffPanel}
                                                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                                                        aria-label="Close side panel"
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                    <div className="w-10 h-10 rounded-full bg-[#ff6b00]/15 text-[#ff6b00] font-black flex items-center justify-center text-sm">
                                                        {selectedOfficial.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                            {selectedOfficial.name}
                                                        </h4>
                                                        <div className="text-[11px] font-mono-data text-slate-500 truncate">
                                                            {selectedOfficial.official_id} • {selectedOfficial.email}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                            Assigned Role
                                                        </label>
                                                        <OrangeSelect
                                                            value={selectedRole}
                                                            onChange={(val) => {
                                                                setSelectedRole(val);
                                                                setIsConfirmingRoleChange(false);
                                                            }}
                                                            options={INVITE_ROLE_OPTIONS}
                                                            size="md"
                                                            className="w-full"
                                                            minWidth="100%"
                                                            searchable={false}
                                                        />
                                                    </div>

                                                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                            What this role can do:
                                                        </div>
                                                        <ul className="space-y-1.5">
                                                            {(ROLE_PERMISSIONS[selectedRole] || [
                                                                'Perform assigned operational duties within scope',
                                                                'Standard municipal activity audit logging',
                                                            ]).map((perm, idx) => (
                                                                <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                                                    <Check size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                                                                    <span>{perm}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                            Reason for update (Mandatory for audit)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="admin-input-field"
                                                            value={updateReason}
                                                            onChange={(e) => {
                                                                setUpdateReason(e.target.value);
                                                                setIsConfirmingRoleChange(false);
                                                            }}
                                                            placeholder="e.g. Promotion, plantilla adjustment, or transfer"
                                                        />
                                                    </div>

                                                    <div className="pt-2">
                                                        {!isConfirmingRoleChange ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (canSaveRole) setIsConfirmingRoleChange(true);
                                                                }}
                                                                disabled={!canSaveRole}
                                                                title={getRoleSaveDisabledReason()}
                                                                className="w-full py-2.5 rounded-lg bg-[#ff6b00] hover:bg-[#e65c00] text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                                                            >
                                                                Save Role Change
                                                            </button>
                                                        ) : (
                                                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5">
                                                                <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                                                    <AlertTriangle size={14} className="shrink-0" />
                                                                    <span>Confirm Role Reassignment</span>
                                                                </div>
                                                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11.5px]">
                                                                    Change <strong>{selectedOfficial.name}</strong>&apos;s role from{' '}
                                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedOfficial.friendly_role}</span> to{' '}
                                                                    <span className="font-bold text-[#ff6b00]">{toFriendlyRole(selectedRole)}</span>?
                                                                </p>
                                                                <div className="text-[11px] text-slate-500 font-mono-data">
                                                                    Audit Reason: &ldquo;{updateReason}&rdquo;
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIsConfirmingRoleChange(false)}
                                                                        className="flex-1 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleExecuteRoleChange}
                                                                        className="flex-1 py-1.5 rounded-lg bg-[#ff6b00] hover:bg-[#e65c00] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                                                    >
                                                                        Confirm &amp; Apply
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.aside>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ) : activeTab === 'residents' ? (
                        /* ── TAB 2: RESIDENT ACCOUNTS (REAL DATABASE RECORDS) ─────── */
                        <div className="flex flex-col gap-4">
                            {/* Screen Reader Live Announcements */}
                            <div className="sr-only" aria-live="polite" aria-atomic="true">
                                {a11yAnnouncement}
                            </div>

                            {/* Toolbar: Unified SearchInput & Dropdowns */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                                <SearchInput
                                    value={residentSearch}
                                    onChange={(val) => setMultipleParams({ res_search: val, res_page: 1 })}
                                    placeholder="Search name, ID or barangay"
                                    ariaLabel="Search name, ID or barangay"
                                    onClear={() => setMultipleParams({ res_search: '', res_page: 1 })}
                                    className="w-full sm:w-[280px]"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                    <OrangeSelect
                                        value={residentStatusFilter}
                                        onChange={(val) => setMultipleParams({ res_status: val, res_page: 1 })}
                                        options={RESIDENT_STATUS_OPTIONS}
                                        size="sm"
                                        minWidth="130px"
                                        searchable={false}
                                    />
                                    <OrangeSelect
                                        value={residentVerificationFilter}
                                        onChange={(val) => setMultipleParams({ res_ver: val, res_page: 1 })}
                                        options={RESIDENT_VERIFICATION_OPTIONS}
                                        size="sm"
                                        minWidth="150px"
                                        searchable={false}
                                    />
                                    <OrangeSelect
                                        value={residentBarangayFilter}
                                        onChange={(val) => setMultipleParams({ res_barangay: val, res_page: 1 })}
                                        options={RESIDENT_BARANGAY_OPTIONS}
                                        size="sm"
                                        minWidth="150px"
                                        searchable={false}
                                    />
                                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={showTestAccounts}
                                            onChange={(e) => setMultipleParams({ res_test: e.target.checked ? 'true' : null, res_page: 1 })}
                                            className="w-4 h-4 rounded text-[#ff6b00] border-slate-300 focus:ring-[#ff6b00] cursor-pointer"
                                        />
                                        <span>Show test accounts</span>
                                    </label>
                                </div>
                            </div>

                            <div className={`admin-layout-split gap-4${selectedResident ? ' has-panel' : ''}`}>
                                {/* Residents Table Wrapper */}
                                <div ref={residentTableWrapperRef} className="admin-table-wrapper rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs flex flex-col flex-1">
                                {/* Mobile Stacked Cards (< 768px) */}
                                <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80 min-h-[320px]">
                                    {residentsLoading ? (
                                        Array.from({ length: 4 }).map((_, idx) => (
                                            <div key={`res-card-skel-${idx}`} className="p-4 animate-pulse space-y-3">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                                                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                                                <div className="flex gap-2">
                                                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                                    <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                                </div>
                                            </div>
                                        ))
                                    ) : residentsList.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">
                                            {residentSearch || residentStatusFilter !== 'all' || residentVerificationFilter !== 'all' || residentBarangayFilter !== 'all' || showTestAccounts ? (
                                                <SearchEmptyState
                                                    query={residentSearch}
                                                    message="No residents match these filters."
                                                    onClear={() => setMultipleParams({ res_search: '', res_status: 'all', res_ver: 'all', res_barangay: 'all', res_test: null, res_page: 1 })}
                                                />
                                            ) : (
                                                <div className="py-8 font-medium">No resident accounts found.</div>
                                            )}
                                        </div>
                                    ) : (
                                        residentsList.map((res) => {
                                            const isSelected = selectedResident?.id === res.id || residentParam === res.resident_id || residentParam === String(res.id);
                                            return (
                                                <div
                                                    key={res.id}
                                                    id={`resident-card-${res.id}`}
                                                    tabIndex={0}
                                                    role="button"
                                                    aria-expanded={isSelected}
                                                    aria-label={`Resident ${res.name}, ID ${res.resident_id}`}
                                                    onClick={() => handleToggleResidentPanel(res)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleToggleResidentPanel(res);
                                                        }
                                                    }}
                                                    className={`min-h-[4rem] p-3.5 transition-all cursor-pointer active:scale-[0.99] flex flex-col justify-between gap-2.5 ${
                                                        isSelected
                                                            ? 'bg-[#ff6b00]/10 dark:bg-[#ff6b00]/15 border-l-4 border-l-[#ff6b00]'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 border-l-transparent'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={res.name}>
                                                                    {res.name}
                                                                </h4>
                                                                {res.is_test && (
                                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                                                        Test
                                                                    </span>
                                                                )}
                                                                {res.is_duplicate && (
                                                                    <span
                                                                        title={`Shares name and barangay with ${res.duplicate_ids?.join(', ')}`}
                                                                        className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 cursor-help"
                                                                    >
                                                                        Possible duplicate
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans tabular-nums font-medium mt-0.5">
                                                                {res.resident_id} • {res.barangay || 'Caloocan North'}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                                            <ChevronRight size={16} className={`transition-transform text-slate-400 ${isSelected ? 'rotate-90 text-[#ff6b00]' : ''}`} />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                                                        <div className="flex items-center gap-2">
                                                            <ResidentStatusBadge status={res.status} isActive={res.is_active} />
                                                            <ResidentVerificationBadge status={res.id_verification_status} reason={res.id_rejection_reason} />
                                                        </div>
                                                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                                            <span className="font-bold text-slate-900 dark:text-white">{res.reports_count}</span> filed
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Desktop / Tablet Real Table (>= 768px) */}
                                <div className="hidden md:block overflow-x-auto w-full flex-1 min-h-[320px]">
                                    <table className="records-table w-full text-left">
                                        <thead>
                                            <tr>
                                                <th scope="col" className="resident-table-sticky-col">Resident</th>
                                                <th scope="col">Barangay</th>
                                                <th scope="col">
                                                    <div className="flex items-center gap-1.5" title="Masked to protect resident data (RA 10173)">
                                                        <span>Contact</span>
                                                        <Lock size={12} className="text-slate-400 shrink-0" aria-label="Masked to protect resident data (RA 10173)" />
                                                    </div>
                                                </th>
                                                <th scope="col">ID verification</th>
                                                <th scope="col">Reports</th>
                                                <th scope="col">Status</th>
                                                <th scope="col" className="text-right">Action</th>
                                            </tr>
                                        </thead>
                                        {residentsLoading ? (
                                            <TableSkeletonRows rows={RESIDENT_PAGE_SIZE} cols={7} />
                                        ) : residentsList.length === 0 ? (
                                            <tbody>
                                                <tr>
                                                    <td colSpan={7} className="p-0">
                                                        <SearchEmptyState
                                                            query={residentSearch}
                                                            message="No residents match these filters. Change your query or clear filters to view all residents."
                                                            onClear={() => setMultipleParams({ res_search: '', res_status: 'all', res_ver: 'all', res_barangay: 'all', res_test: null, res_page: 1 })}
                                                        />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        ) : (
                                            <tbody>
                                                {residentsList.map((res) => {
                                                    const isSelected = selectedResident?.id === res.id || residentParam === res.resident_id || residentParam === String(res.id);
                                                    return (
                                                        <tr
                                                            key={res.id}
                                                            id={`resident-row-${res.id}`}
                                                            tabIndex={0}
                                                            role="button"
                                                            aria-expanded={isSelected}
                                                            aria-label={`Resident ${res.name}, ID ${res.resident_id}`}
                                                            onClick={() => handleToggleResidentPanel(res)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    handleToggleResidentPanel(res);
                                                                }
                                                            }}
                                                            className={`resident-table-row group h-16 min-h-[4rem] transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800/60 ${
                                                                isSelected ? 'is-selected' : ''
                                                            }`}
                                                        >
                                                            {/* 1. Resident: Avatar + 1-line name + Test/Dup badges + ID underneath (fixed sticky column) */}
                                                            <td className="resident-table-sticky-col pr-4">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="admin-avatar-small bg-[#ff6b00]/10 text-[#ff6b00] font-black shrink-0">
                                                                        {res.name?.charAt(0) || 'R'}
                                                                    </div>
                                                                    <div className="min-w-0 max-w-[200px] xl:max-w-[240px]">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span
                                                                                className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[130px] inline-block"
                                                                                title={res.name}
                                                                            >
                                                                                {res.name}
                                                                            </span>
                                                                            {res.is_test && (
                                                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 shrink-0">
                                                                                    Test
                                                                                </span>
                                                                            )}
                                                                            {res.is_duplicate && (
                                                                                <span
                                                                                    title={`Shares name and barangay with ${res.duplicate_ids?.join(', ')}`}
                                                                                    className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 shrink-0 cursor-help"
                                                                                >
                                                                                    Possible duplicate
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans tabular-nums font-medium">
                                                                            {res.resident_id}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* 2. Barangay */}
                                                            <td className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                                {res.barangay || 'Caloocan North'}
                                                            </td>

                                                            {/* 3. Contact (Masked) */}
                                                            <td className="text-xs whitespace-nowrap">
                                                                <div className="font-sans tabular-nums text-slate-700 dark:text-slate-300">{res.masked_phone || 'None provided'}</div>
                                                                <div className="text-[10.5px] text-slate-400 font-sans tabular-nums truncate max-w-[170px]">{res.masked_email}</div>
                                                            </td>

                                                            {/* 4. ID Verification */}
                                                            <td className="whitespace-nowrap">
                                                                <ResidentVerificationBadge status={res.id_verification_status} reason={res.id_rejection_reason} />
                                                            </td>

                                                            {/* 5. Reports */}
                                                            <td className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                                <strong className="text-slate-900 dark:text-white">{res.reports_count}</strong> filed{' '}
                                                                {res.active_reports > 0 && (
                                                                    <span className="text-amber-500 font-bold">({res.active_reports} active)</span>
                                                                )}
                                                            </td>

                                                            {/* 6. Status */}
                                                            <td className="whitespace-nowrap">
                                                                <ResidentStatusBadge status={res.status} isActive={res.is_active} />
                                                            </td>

                                                            {/* 7. Action: Consistent "View" button */}
                                                            <td className="text-right whitespace-nowrap pr-4" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleToggleResidentPanel(res);
                                                                    }}
                                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                                                    aria-label={`View details for ${res.name}`}
                                                                >
                                                                    View
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        )}
                                    </table>
                                </div>

                                {/* Pagination Footer */}
                                <TablePagination
                                    page={residentPage}
                                    pageSize={RESIDENT_PAGE_SIZE}
                                    total={residentsTotal}
                                    itemLabel="residents"
                                    onPageChange={handleResidentPageChange}
                                />
                            </div>

                                {/* Backdrop for drawer below 1280px */}
                                {selectedResident && (
                                    <div
                                        className="admin-editor-backdrop xl:hidden"
                                        onClick={handleCloseResidentPanel}
                                    />
                                )}

                                {/* Resident Details Rail */}
                                <AnimatePresence>
                                    {selectedResident && (
                                        <motion.aside
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="admin-editor-rail shrink-0"
                                        >
                                            <div className="admin-panel-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                                                <div className="admin-panel-accent-strip" />

                                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
                                                    <div>
                                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                            Resident details
                                                        </h3>
                                                        <p className="text-[11px] text-slate-500">
                                                            Registration and ID check
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleCloseResidentPanel}
                                                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                                                        aria-label="Close resident details"
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </div>

                                                {/* Duplicate banner if resident shares name and barangay with another account */}
                                                {selectedResident.is_duplicate && (
                                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                                                        <div className="flex items-center gap-1.5 font-bold">
                                                            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                                            <span>Possible duplicate account</span>
                                                        </div>
                                                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                                            Shares the same full name and barangay with:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                            {(selectedResident.duplicate_ids || []).map((otherId) => (
                                                                <button
                                                                    key={otherId}
                                                                    type="button"
                                                                    onClick={() => updateParam('resident', otherId, false)}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-bold text-[11px] transition-colors cursor-pointer"
                                                                >
                                                                    <span>{otherId}</span>
                                                                    <ExternalLink size={10} />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 1. Resident profile overview */}
                                                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                    <div className="w-10 h-10 rounded-full bg-[#ff6b00]/15 text-[#ff6b00] font-black flex items-center justify-center text-sm shrink-0">
                                                        {selectedResident.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={selectedResident.name}>
                                                                {selectedResident.name}
                                                            </h4>
                                                            {selectedResident.is_test && (
                                                                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/30">
                                                                    Test
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] font-sans tabular-nums text-slate-500 truncate mt-0.5">
                                                            {selectedResident.resident_id} • Registered {selectedResident.registered_date}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    {/* 2. Account status & ID verification */}
                                                    <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            Account status & ID verification
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                                            <ResidentStatusBadge status={selectedResident.status} />
                                                            <ResidentVerificationBadge resident={selectedResident} />
                                                        </div>

                                                        {/* Account level is shown only inside details panel */}
                                                        <div className="text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 mt-2">
                                                            <span className="text-slate-400">Account level: </span>
                                                            <strong className="text-slate-700 dark:text-slate-300">
                                                                {selectedResident.account_level || 'Bronze (Self-Registered)'}
                                                            </strong>
                                                        </div>

                                                        {/* ID Verification Details */}
                                                        {selectedResident.id_verification_status === 'Verified' && (
                                                            <div className="text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                                                                <span className="text-slate-400">Verified document: </span>
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                                    {selectedResident.id_type_name || 'PhilSys / Government ID'}
                                                                </span>
                                                                {selectedResident.id_verified_date && (
                                                                    <span className="text-slate-400 font-sans tabular-nums ml-1">
                                                                        (approved {selectedResident.id_verified_date})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {selectedResident.id_verification_status === 'Rejected' && (
                                                            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-300 space-y-1">
                                                                <div className="font-bold flex items-center gap-1.5">
                                                                    <X size={13} className="text-red-500 shrink-0" />
                                                                    <span>ID document rejected</span>
                                                                </div>
                                                                {selectedResident.id_rejection_reason && (
                                                                    <p className="text-[11px] text-red-600 dark:text-red-400">
                                                                        Reason: {selectedResident.id_rejection_reason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {selectedResident.id_verification_status === 'Pending review' && (
                                                            <div className="pt-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenKycReview(selectedResident)}
                                                                    className="w-full py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                                                >
                                                                    <ShieldCheck size={14} className="text-amber-500 shrink-0" />
                                                                    <span>Review submitted identification</span>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {(!selectedResident.id_verification_status || selectedResident.id_verification_status === 'N/A') && (
                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                                                                No ID submitted yet. Resident can submit a government ID to unlock verified status.
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* 3. Reports filed */}
                                                    <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            Reports filed
                                                        </div>
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                            {selectedResident.reports_count} filed
                                                            {selectedResident.active_reports > 0 && (
                                                                <span className="text-xs text-amber-500 font-semibold ml-1.5">
                                                                    ({selectedResident.active_reports} active)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 4. Protected contact details (masked) */}
                                                    <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            <Lock size={13} className="text-[#ff6b00] shrink-0" />
                                                            <span>Contact (RA 10173 Protected)</span>
                                                        </div>
                                                        <div className="text-xs space-y-1.5 pt-0.5 text-slate-700 dark:text-slate-300">
                                                            <div className="flex items-baseline justify-between gap-2">
                                                                <span className="text-slate-400">Email:</span>
                                                                <span className="font-sans tabular-nums text-right truncate">{selectedResident.masked_email}</span>
                                                            </div>
                                                            <div className="flex items-baseline justify-between gap-2">
                                                                <span className="text-slate-400">Phone:</span>
                                                                <span className="font-sans tabular-nums text-right">{selectedResident.masked_phone || 'None provided'}</span>
                                                            </div>
                                                            <div className="flex items-baseline justify-between gap-2">
                                                                <span className="text-slate-400">Barangay:</span>
                                                                <span className="text-right font-medium">{selectedResident.barangay || 'Caloocan North'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 5. Status Note & Audit Log info if available */}
                                                    {selectedResident.status_reason && (
                                                        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1">
                                                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                Status note on file
                                                            </div>
                                                            <p className="text-slate-700 dark:text-slate-300 italic">
                                                                "{selectedResident.status_reason}"
                                                            </p>
                                                            {(selectedResident.status_changed_by || selectedResident.status_changed_at) && (
                                                                <div className="text-[10px] text-slate-400 font-sans tabular-nums pt-0.5">
                                                                    Updated {selectedResident.status_changed_by ? `by ${selectedResident.status_changed_by}` : ''} {selectedResident.status_changed_at ? `on ${selectedResident.status_changed_at}` : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* 6. Account Access Actions */}
                                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                Account Access
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <span>Current:</span>
                                                                <ResidentStatusBadge status={selectedResident.status} />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <label htmlFor="resident-action-reason" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                    Reason (Mandatory for audit)
                                                                </label>
                                                                <span className="text-[11px] text-slate-400 font-sans tabular-nums">
                                                                    {residentActionReason.length} / 200
                                                                </span>
                                                            </div>
                                                            <input
                                                                id="resident-action-reason"
                                                                type="text"
                                                                maxLength={200}
                                                                value={residentActionReason}
                                                                onChange={(e) => {
                                                                    setResidentActionReason(e.target.value);
                                                                    setIsConfirmingResidentAction(false);
                                                                }}
                                                                placeholder="e.g. Abuse report, security concern, reactivation"
                                                                className="admin-input-field w-full text-xs"
                                                            />
                                                        </div>

                                                        {!isConfirmingResidentAction ? (
                                                            <div className="space-y-2 pt-1">
                                                                {selectedResident.status === 'Suspended' ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={residentActionReason.trim().length < 3}
                                                                        onClick={() => {
                                                                            setResidentTargetStatus('Active');
                                                                            setIsConfirmingResidentAction(true);
                                                                        }}
                                                                        className="w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        Reactivate Resident Account
                                                                    </button>
                                                                ) : selectedResident.status === 'Pending' ? (
                                                                    <div className="space-y-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleResendResidentConfirmation}
                                                                            className="w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs"
                                                                        >
                                                                            <Send size={13} className="text-[#ff6b00]" />
                                                                            <span>Resend confirmation email</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={residentActionReason.trim().length < 3}
                                                                            onClick={() => {
                                                                                setResidentTargetStatus('Suspended');
                                                                                setIsConfirmingResidentAction(true);
                                                                            }}
                                                                            className="w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer bg-red-600 hover:bg-red-700 text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                                                        >
                                                                            Suspend Account
                                                                        </button>
                                                                    </div>
                                                                ) : selectedResident.status === 'Deactivated' ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={residentActionReason.trim().length < 3}
                                                                        onClick={() => {
                                                                            setResidentTargetStatus('Active');
                                                                            setIsConfirmingResidentAction(true);
                                                                        }}
                                                                        className="w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        Reactivate Resident Account
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={residentActionReason.trim().length < 3}
                                                                        onClick={() => {
                                                                            setResidentTargetStatus('Suspended');
                                                                            setIsConfirmingResidentAction(true);
                                                                        }}
                                                                        className="w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer bg-red-600 hover:bg-red-700 text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        Suspend Resident Account
                                                                    </button>
                                                                )}

                                                                {residentActionReason.trim().length < 3 && (
                                                                    <p className="text-[11px] text-slate-400 text-center">
                                                                        Add a reason (at least 3 characters) to continue
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5">
                                                                <div className="font-bold text-amber-800 dark:text-amber-300">
                                                                    {residentTargetStatus === 'Suspended'
                                                                        ? `Suspend ${selectedResident.name}? They will be blocked from logging in and filing reports.`
                                                                        : `Reactivate ${selectedResident.name}? Their login access and report filing will be restored.`}
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setIsConfirmingResidentAction(false);
                                                                            setResidentTargetStatus(null);
                                                                        }}
                                                                        className="flex-1 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleExecuteResidentStatusChange(residentTargetStatus)}
                                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer ${
                                                                            residentTargetStatus === 'Suspended'
                                                                                ? 'bg-red-600 hover:bg-red-700'
                                                                                : 'bg-emerald-600 hover:bg-emerald-700'
                                                                        }`}
                                                                    >
                                                                        Confirm {residentTargetStatus === 'Suspended' ? 'Suspension' : 'Reactivation'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.aside>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ) : activeTab === 'settings' ? (
                        /* ── TAB 3: SYSTEM SETTINGS (FULL WIDTH + TWO-COLUMN LAYOUT) ── */
                        <div className="w-full max-w-[90rem] mx-auto flex flex-col gap-6">
                            {/* Heading Hierarchy and Spacing */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    System Settings & Policies
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Default response times, document retention, and security standards
                                </p>
                            </div>

                            {/* Responsive Grid: Two columns on >=1200px (xl:), Single column below */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                                {/* Left Column: Setting Cards Grouped under Clear Headings */}
                                <div className="xl:col-span-8 flex flex-col gap-6">
                                    {settingsLoading ? (
                                        <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#ff6b00]" />
                                            Loading verified system policies...
                                        </div>
                                    ) : (
                                        <>
                                            {/* Group 1: Reports and response times */}
                                            <section className="space-y-3">
                                                <div className="pb-1 border-b border-slate-200/60 dark:border-slate-800">
                                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                                        Reports and response times
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        Service level agreements and citizen triage targets
                                                    </p>
                                                </div>

                                                {(() => {
                                                    const setting = settingsList.find((s) => s.key === 'sla_response_time') || {
                                                        key: 'sla_response_time',
                                                        title: 'Response time targets',
                                                        description: "How quickly a new report must be reviewed. Staff are reminded if it's late.",
                                                        value: { urgent_hours: 24, standard_hours: 48 },
                                                    };
                                                    return (
                                                        <div
                                                            key={setting.key}
                                                            className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs space-y-3"
                                                        >
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                                                                <div className="flex-1 min-w-0 pr-2">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h4 className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight">
                                                                            {setting.title}
                                                                        </h4>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveWhyRulePopover(activeWhyRulePopover === setting.key ? null : setting.key)}
                                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#ff6b00] dark:text-slate-400 dark:hover:text-[#ff6b00] transition-colors cursor-pointer"
                                                                            aria-label={`Why this rule for ${setting.title}`}
                                                                        >
                                                                            <HelpCircle size={13} className="shrink-0" />
                                                                            Why this rule?
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                        {setting.description}
                                                                    </p>
                                                                </div>

                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
                                                                    <span className="px-3 py-1 rounded-full text-[11.5px] font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-center">
                                                                        {getSettingDisplayBadge(setting, auditIntegrity)}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenEditSetting(setting)}
                                                                        className="w-full sm:w-auto min-h-[44px] md:min-h-0 px-4 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Why this rule Popover */}
                                                            {activeWhyRulePopover === setting.key && (
                                                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveWhyRulePopover(null)}
                                                                        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
                                                                        aria-label="Close"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                    <div className="font-bold text-slate-900 dark:text-white text-[13px] pr-6 flex items-center gap-1.5">
                                                                        <ShieldCheck size={14} className="text-[#ff6b00]" />
                                                                        {WHY_RULE_INFO[setting.key]?.title || setting.title}
                                                                    </div>
                                                                    <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 font-mono-data">
                                                                        Authority: {WHY_RULE_INFO[setting.key]?.authority || setting.policy_source}
                                                                    </div>
                                                                    <div className="text-[13px] text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                                                                        {WHY_RULE_INFO[setting.key]?.reason}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </section>

                                            {/* Group 2: Records and security */}
                                            <section className="space-y-3 pt-2">
                                                <div className="pb-1 border-b border-slate-200/60 dark:border-slate-800">
                                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                                        Records and security
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        Municipal document retention schedules and cryptographic ledger protection
                                                    </p>
                                                </div>

                                                {/* Card 1: How long records are kept */}
                                                {(() => {
                                                    const setting = settingsList.find((s) => s.key === 'record_storage_duration') || {
                                                        key: 'record_storage_duration',
                                                        title: 'How long records are kept',
                                                        description: 'Records stay available for at least this long before review.',
                                                        value: { years: 7 },
                                                    };
                                                    return (
                                                        <div
                                                            key={setting.key}
                                                            className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs space-y-3"
                                                        >
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                                                                <div className="flex-1 min-w-0 pr-2">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h4 className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight">
                                                                            {setting.title}
                                                                        </h4>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveWhyRulePopover(activeWhyRulePopover === setting.key ? null : setting.key)}
                                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#ff6b00] dark:text-slate-400 dark:hover:text-[#ff6b00] transition-colors cursor-pointer"
                                                                            aria-label={`Why this rule for ${setting.title}`}
                                                                        >
                                                                            <HelpCircle size={13} className="shrink-0" />
                                                                            Why this rule?
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                        {setting.description}
                                                                    </p>
                                                                </div>

                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
                                                                    <span className="px-3 py-1 rounded-full text-[11.5px] font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-center">
                                                                        {getSettingDisplayBadge(setting, auditIntegrity)}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenEditSetting(setting)}
                                                                        className="w-full sm:w-auto min-h-[44px] md:min-h-0 px-4 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Why this rule Popover */}
                                                            {activeWhyRulePopover === setting.key && (
                                                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveWhyRulePopover(null)}
                                                                        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
                                                                        aria-label="Close"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                    <div className="font-bold text-slate-900 dark:text-white text-[13px] pr-6 flex items-center gap-1.5">
                                                                        <ShieldCheck size={14} className="text-[#ff6b00]" />
                                                                        {WHY_RULE_INFO[setting.key]?.title || setting.title}
                                                                    </div>
                                                                    <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 font-mono-data">
                                                                        Authority: {WHY_RULE_INFO[setting.key]?.authority || setting.policy_source}
                                                                    </div>
                                                                    <div className="text-[13px] text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                                                                        {WHY_RULE_INFO[setting.key]?.reason}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Card 2: Change history */}
                                                {(() => {
                                                    const setting = settingsList.find((s) => s.key === 'activity_log_security') || {
                                                        key: 'activity_log_security',
                                                        title: 'Change history',
                                                        description: "Every change to accounts and settings is recorded and can't be edited.",
                                                        value: { tamper_evident: true },
                                                    };
                                                    return (
                                                        <div
                                                            key={setting.key}
                                                            className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs space-y-3"
                                                        >
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                                                                <div className="flex-1 min-w-0 pr-2">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h4 className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight">
                                                                            {setting.title}
                                                                        </h4>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveWhyRulePopover(activeWhyRulePopover === setting.key ? null : setting.key)}
                                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#ff6b00] dark:text-slate-400 dark:hover:text-[#ff6b00] transition-colors cursor-pointer"
                                                                            aria-label={`Why this rule for ${setting.title}`}
                                                                        >
                                                                            <HelpCircle size={13} className="shrink-0" />
                                                                            Why this rule?
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                        {setting.description}
                                                                    </p>
                                                                </div>

                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
                                                                    <span className="px-3 py-1 rounded-full text-[11.5px] font-semibold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-center">
                                                                        Protected
                                                                    </span>
                                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleOpenAuditHistory}
                                                                            className="min-h-[44px] md:min-h-0 px-3 py-2 rounded-lg text-xs font-bold text-[#ff6b00] hover:bg-[#ff6b00]/10 border border-[#ff6b00]/30 transition-colors cursor-pointer text-center"
                                                                        >
                                                                            See who changed what
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleRunIntegrityCheck}
                                                                            disabled={isCheckingIntegrity}
                                                                            className="min-h-[44px] md:min-h-0 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                                        >
                                                                            <RefreshCw size={12} className={isCheckingIntegrity ? 'animate-spin' : ''} />
                                                                            <span>Check records</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Inline verification result */}
                                                            {integrityInlineStatus && (
                                                                <div className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                                                                    <CheckCircle2 size={13} className="shrink-0" />
                                                                    <span>{integrityInlineStatus}</span>
                                                                </div>
                                                            )}

                                                            {/* Why this rule Popover */}
                                                            {activeWhyRulePopover === setting.key && (
                                                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveWhyRulePopover(null)}
                                                                        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
                                                                        aria-label="Close"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                    <div className="font-bold text-slate-900 dark:text-white text-[13px] pr-6 flex items-center gap-1.5">
                                                                        <ShieldCheck size={14} className="text-[#ff6b00]" />
                                                                        {WHY_RULE_INFO[setting.key]?.title || setting.title}
                                                                    </div>
                                                                    <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 font-mono-data">
                                                                        Authority: {WHY_RULE_INFO[setting.key]?.authority || setting.policy_source}
                                                                    </div>
                                                                    <div className="text-[13px] text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                                                                        {WHY_RULE_INFO[setting.key]?.reason}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </section>

                                            {/* Integrity Summary Banner */}
                                            {auditIntegrity && (
                                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                                                        <div>
                                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                                Cryptographic Audit Integrity Ledger
                                                            </div>
                                                            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                                                                {auditIntegrity.total_audit_events} sequential events verified • Last checked: {auditIntegrity.last_verified}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono-data font-bold text-emerald-600 dark:text-emerald-400">
                                                        {auditIntegrity.integrity_score} INTACT
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Right Column: Sticky Quick Summary Panel on >= 1200px */}
                                <aside className="xl:col-span-4 sticky top-6 flex flex-col gap-4">
                                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">
                                                Quick summary
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Current engineering governance policies
                                            </p>
                                        </div>

                                        <div className="space-y-3 text-xs">
                                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <div className="font-semibold text-slate-700 dark:text-slate-300">Response targets</div>
                                                    <div className="text-[11px] text-slate-400">Citizens charter SLA</div>
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white text-right">
                                                    24h urgent / 48h standard
                                                </span>
                                            </div>

                                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <div className="font-semibold text-slate-700 dark:text-slate-300">Retention period</div>
                                                    <div className="text-[11px] text-slate-400">National archives rule</div>
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white text-right">
                                                    Kept for 7 years
                                                </span>
                                            </div>

                                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <div className="font-semibold text-slate-700 dark:text-slate-300">Records protection</div>
                                                    <div className="text-[11px] text-slate-400">Cryptographic audit log</div>
                                                </div>
                                                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 size={12} /> Protected
                                                </span>
                                            </div>

                                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <div className="font-semibold text-slate-700 dark:text-slate-300">Audit ledger</div>
                                                    <div className="text-[11px] text-slate-400">Tamper-evident verification</div>
                                                </div>
                                                <span className="font-mono-data font-bold text-slate-900 dark:text-white text-right">
                                                    {auditIntegrity?.integrity_score || 'INTACT'}
                                                </span>
                                            </div>

                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="font-semibold text-slate-700 dark:text-slate-300">Last verified</div>
                                                    <div className="text-[11px] text-slate-400">Integrity check</div>
                                                </div>
                                                <span className="text-slate-600 dark:text-slate-400 text-right">
                                                    {auditIntegrity?.last_verified || 'Checked just now'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
                                            Last changed by: <strong className="text-slate-600 dark:text-slate-300">{settingsList[0]?.updated_by || 'System Administrator'}</strong>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    ) : (
                        /* ── TAB 4: AUTOMATED & AI TOOLS (WITH HUMAN IN THE LOOP & TOGGLE SWITCHES) ── */
                        <div className="w-full max-w-[90rem] mx-auto flex flex-col gap-6">
                            {/* Heading */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <Bot size={22} className="text-[#ff6b00]" />
                                    Automated & AI Tools
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Configure how automated assistants suggest report categories and predict maintenance risks
                                </p>
                            </div>

                            {/* Responsive Two-Column Layout on >= 1200px */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                                {/* Left Column: Tools and Controls */}
                                <div className="xl:col-span-8 flex flex-col gap-5">
                                    {/* Top Note: Human in the loop governance */}
                                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/25 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-3">
                                        <Sparkles size={18} className="text-[#ff6b00] shrink-0" />
                                        <div>
                                            <strong className="text-slate-900 dark:text-white">Human in the loop:</strong> These tools suggest and highlight. Staff always make the final decision.
                                        </div>
                                    </div>

                                    {/* Error State Fallback with 48px Try Again Button */}
                                    {aiToolsError ? (
                                        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-red-500/30 space-y-3">
                                            <AlertTriangle size={24} className="mx-auto text-red-500" />
                                            <div className="font-bold text-sm text-slate-900 dark:text-white">
                                                This section could not load. Please try again.
                                            </div>
                                            <button
                                                type="button"
                                                onClick={fetchSettings}
                                                className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#ff6b00] text-white font-bold text-xs hover:bg-[#e65c00] transition-colors cursor-pointer"
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    ) : currentUser && currentUser.role !== 'system_admin' && currentUser.role !== 'admin' && currentUser.account_type !== 'admin' ? (
                                        /* Locked state if user lacks permission */
                                        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                                            <Lock size={24} className="mx-auto text-slate-400" />
                                            <div className="font-bold text-sm text-slate-900 dark:text-white">
                                                Automated & AI Tools Locked
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Only System Administrators can change automated tools.
                                            </p>
                                        </div>
                                    ) : settingsLoading ? (
                                        /* Skeleton pulse state */
                                        <div className="space-y-4">
                                            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse h-28" />
                                            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse h-28" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Tool 1: Report Category Suggestion */}
                                            {(() => {
                                                const tool = settingsList.find((s) => s.key === 'ai_report_category_suggestion') || {
                                                    key: 'ai_report_category_suggestion',
                                                    title: 'Report Category Suggestion',
                                                    description: 'Suggests category and urgency for incoming citizen reports',
                                                    value: { enabled: true, mode: 'advisory', confidence_threshold: 75, suggest_urgency: true },
                                                    updated_at: 'Today at 2:30 PM',
                                                    updated_by: 'City Engineer',
                                                };
                                                const isEnabled = tool.value?.enabled !== false;

                                                return (
                                                    <div
                                                        key={tool.key}
                                                        className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs space-y-3.5"
                                                    >
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                                                            <div className="flex-1 min-w-0 pr-2">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h4 className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight">
                                                                        {tool.title}
                                                                    </h4>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveWhyRulePopover(activeWhyRulePopover === tool.key ? null : tool.key)}
                                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#ff6b00] dark:text-slate-400 dark:hover:text-[#ff6b00] transition-colors cursor-pointer"
                                                                        aria-label={`Why this rule for ${tool.title}`}
                                                                    >
                                                                        <HelpCircle size={13} className="shrink-0" />
                                                                        Why this rule?
                                                                    </button>
                                                                </div>
                                                                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    {tool.description}
                                                                </p>
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                                                                {/* On / Off Switch */}
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        role="switch"
                                                                        aria-checked={isEnabled}
                                                                        aria-label={`${tool.title} toggle`}
                                                                        onClick={() => handleToggleAiTool(tool)}
                                                                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                                                                            isEnabled ? 'bg-[#ff6b00]' : 'bg-slate-300 dark:bg-slate-700'
                                                                        }`}
                                                                    >
                                                                        <span
                                                                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                                                                            }`}
                                                                        />
                                                                    </button>
                                                                    <span className={`text-xs font-bold ${isEnabled ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                        {isEnabled ? 'On' : 'Off'}
                                                                    </span>
                                                                </div>

                                                                {/* Mode Badge */}
                                                                <span className={`px-3 py-1 rounded-full text-[11.5px] font-semibold border text-center ${
                                                                    isEnabled
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                                                }`}>
                                                                    {isEnabled ? 'Suggestions only. Staff confirm.' : 'Off. Manual categorization'}
                                                                </span>

                                                                {/* Edit Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenEditSetting(tool)}
                                                                    className="w-full sm:w-auto min-h-[44px] md:min-h-0 px-4 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
                                                                >
                                                                    Edit
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Timestamp info */}
                                                        <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                            Last updated: {tool.updated_at || 'Today'} by {tool.updated_by || 'System Admin'}
                                                        </div>

                                                        {/* Why this rule Popover */}
                                                        {activeWhyRulePopover === tool.key && (
                                                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveWhyRulePopover(null)}
                                                                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
                                                                    aria-label="Close"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                                <div className="font-bold text-slate-900 dark:text-white text-[13px] pr-6 flex items-center gap-1.5">
                                                                    <ShieldCheck size={14} className="text-[#ff6b00]" />
                                                                    {WHY_RULE_INFO[tool.key]?.title || tool.title}
                                                                </div>
                                                                <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 font-mono-data">
                                                                    Authority: {WHY_RULE_INFO[tool.key]?.authority || tool.policy_source}
                                                                </div>
                                                                <div className="text-[13px] text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                                                                    {WHY_RULE_INFO[tool.key]?.reason}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Tool 2: Flood & Drainage Risk Forecasting */}
                                            {(() => {
                                                const tool = settingsList.find((s) => s.key === 'ai_flood_drainage_risk') || {
                                                    key: 'ai_flood_drainage_risk',
                                                    title: 'Flood & Drainage Risk Forecasting',
                                                    description: 'Analyzes weather and historical drainage data to highlight high-risk zones',
                                                    value: { active: true, cadence: '2 weeks', threshold: 'Moderate (70mm/hr)', data_source: 'PAGASA Radar & Sensors' },
                                                    updated_at: 'Yesterday at 6:00 AM',
                                                    updated_by: 'Automated Service',
                                                };
                                                const isActive = tool.value?.active !== false;

                                                return (
                                                    <div
                                                        key={tool.key}
                                                        className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs space-y-3.5"
                                                    >
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                                                            <div className="flex-1 min-w-0 pr-2">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h4 className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight">
                                                                        {tool.title}
                                                                    </h4>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveWhyRulePopover(activeWhyRulePopover === tool.key ? null : tool.key)}
                                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#ff6b00] dark:text-slate-400 dark:hover:text-[#ff6b00] transition-colors cursor-pointer"
                                                                        aria-label={`Why this rule for ${tool.title}`}
                                                                    >
                                                                        <HelpCircle size={13} className="shrink-0" />
                                                                        Why this rule?
                                                                    </button>
                                                                </div>
                                                                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    {tool.description}
                                                                </p>
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                                                                {/* On / Off Switch */}
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        role="switch"
                                                                        aria-checked={isActive}
                                                                        aria-label={`${tool.title} toggle`}
                                                                        onClick={() => handleToggleAiTool(tool)}
                                                                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                                                                            isActive ? 'bg-[#ff6b00]' : 'bg-slate-300 dark:bg-slate-700'
                                                                        }`}
                                                                    >
                                                                        <span
                                                                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                                                isActive ? 'translate-x-5' : 'translate-x-0'
                                                                            }`}
                                                                        />
                                                                    </button>
                                                                    <span className={`text-xs font-bold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                        {isActive ? 'On' : 'Off'}
                                                                    </span>
                                                                </div>

                                                                {/* Cadence Badge */}
                                                                <span className={`px-3 py-1 rounded-full text-[11.5px] font-semibold border text-center ${
                                                                    isActive
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                                                }`}>
                                                                    {isActive ? `On. Updates every ${tool.value?.cadence || '2 weeks'}` : 'Off. Forecast disabled'}
                                                                </span>

                                                                {/* Edit Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenEditSetting(tool)}
                                                                    className="w-full sm:w-auto min-h-[44px] md:min-h-0 px-4 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
                                                                >
                                                                    Edit
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Timestamp info */}
                                                        <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                            Last forecast ran {tool.updated_at || 'recently'} • Source: {tool.value?.data_source || 'PAGASA Radar'}
                                                        </div>

                                                        {/* Why this rule Popover */}
                                                        {activeWhyRulePopover === tool.key && (
                                                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveWhyRulePopover(null)}
                                                                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
                                                                    aria-label="Close"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                                <div className="font-bold text-slate-900 dark:text-white text-[13px] pr-6 flex items-center gap-1.5">
                                                                    <ShieldCheck size={14} className="text-[#ff6b00]" />
                                                                    {WHY_RULE_INFO[tool.key]?.title || tool.title}
                                                                </div>
                                                                <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 font-mono-data">
                                                                    Authority: {WHY_RULE_INFO[tool.key]?.authority || tool.policy_source}
                                                                </div>
                                                                <div className="text-[13px] text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                                                                    {WHY_RULE_INFO[tool.key]?.reason}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>

                                {/* Right Column: Sticky AI Governance & Oversight Panel on >= 1200px */}
                                <aside className="xl:col-span-4 sticky top-6 flex flex-col gap-4">
                                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                                <ShieldCheck size={16} className="text-emerald-500" />
                                                AI Governance & Oversight
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Caloocan City Civic Engineering Standards
                                            </p>
                                        </div>

                                        <div className="space-y-3.5 text-xs">
                                            <div className="space-y-1 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Human in the loop: Active on all tools
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                                    Staff review and make the final decision before any work order dispatch or repair authorization.
                                                </p>
                                            </div>

                                            <div className="space-y-1 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]" />
                                                    Audit trail: Immutable ledger recording
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                                    All AI suggestions, automated predictions, and staff overrides are recorded in the change history.
                                                </p>
                                            </div>

                                            <div className="space-y-1 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                    Authoritative data sources
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                                    Caloocan City citizen reports, verified engineering inspections, and PAGASA weather radar.
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    Statutory data protection
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                                    Compliant with Republic Act No. 10173 (Data Privacy Act) and DICT Civic AI Guidelines.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    )}
                </main>

                {/* ═══════════════════════════════════════════════════════════════
                    MODAL: ADD STAFF MEMBER (INVITATION LINK)
                ════════════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isInviteModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6"
                            >
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Add Staff Member
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsInviteModalOpen(false)}
                                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <form onSubmit={handleAddStaffSubmit} className="space-y-3.5">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={inviteForm.name}
                                            onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                                            placeholder="e.g. Engr. Gabriel Santos"
                                            className="admin-input-field"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Official Email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={inviteForm.email}
                                            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                            placeholder="official@caloocan.gov.ph"
                                            className="admin-input-field"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Role Bundle
                                        </label>
                                        <OrangeSelect
                                            value={inviteForm.role}
                                            onChange={(val) => setInviteForm({ ...inviteForm, role: val })}
                                            options={INVITE_ROLE_OPTIONS}
                                            size="sm"
                                            className="w-full"
                                            minWidth="100%"
                                            searchable={false}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Office / Division
                                        </label>
                                        <OrangeSelect
                                            value={inviteForm.office}
                                            onChange={(val) => setInviteForm({ ...inviteForm, office: val })}
                                            options={OFFICE_OPTIONS}
                                            size="sm"
                                            className="w-full"
                                            minWidth="100%"
                                            searchable={false}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Reason for Invitation (Required Audit Reason)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={inviteForm.reason}
                                            onChange={(e) => setInviteForm({ ...inviteForm, reason: e.target.value })}
                                            placeholder="e.g. Approved plantilla recruitment 2026"
                                            className="admin-input-field"
                                        />
                                    </div>

                                    <div className="pt-3 flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsInviteModalOpen(false)}
                                            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 rounded-lg bg-[#ff6b00] hover:bg-[#e65c00] text-white text-xs font-bold transition-colors"
                                        >
                                            Generate Invitation
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ═══════════════════════════════════════════════════════════════
                    DRAWER / BOTTOM SHEET: EDIT SYSTEM SETTING OR AI TOOL
                ════════════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {editingSetting && (
                        <>
                            {/* Backdrop Overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setEditingSetting(null)}
                                className="fixed inset-0 z-105 bg-black/50 backdrop-blur-xs"
                            />

                            {/* Responsive Drawer: Bottom Sheet on Phone, Side Drawer on Desktop */}
                            <motion.aside
                                initial={{ x: '100%', y: 0 }}
                                animate={{ x: 0, y: 0 }}
                                exit={{ x: '100%', y: 0 }}
                                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                className="settings-edit-drawer"
                            >
                                {/* Drawer Header */}
                                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                            Edit {editingSetting.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Configure policy parameters and record audit reason
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEditingSetting(null)}
                                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
                                        aria-label="Close edit drawer"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Drawer Form Body */}
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSaveSetting();
                                    }}
                                    className="flex-1 overflow-y-auto p-5 space-y-4"
                                >
                                    {/* SLA Response Time Inputs */}
                                    {editingSetting.key === 'sla_response_time' && (
                                        <div className="space-y-3.5">
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                    Urgent reports (Hours)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="72"
                                                    required
                                                    value={settingEditForm.urgentHours}
                                                    onChange={(e) => setSettingEditForm({ ...settingEditForm, urgentHours: e.target.value })}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono-data"
                                                />
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    For reports marked danger, hazard, or emergency (e.g. open manholes, collapsed road)
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                    Standard reports (Hours)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="168"
                                                    required
                                                    value={settingEditForm.standardHours}
                                                    onChange={(e) => setSettingEditForm({ ...settingEditForm, standardHours: e.target.value })}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono-data"
                                                />
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    For routine maintenance, potholes, and general street repairs
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Record Storage Duration Inputs */}
                                    {editingSetting.key === 'record_storage_duration' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                Retention period (Years)
                                            </label>
                                            <input
                                                type="number"
                                                min="5"
                                                max="50"
                                                required
                                                value={settingEditForm.retentionYears}
                                                onChange={(e) => setSettingEditForm({ ...settingEditForm, retentionYears: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono-data"
                                            />
                                            <p className="text-[11px] text-slate-400 mt-1">
                                                Records stay available for at least this long before archivist disposition review.
                                            </p>
                                        </div>
                                    )}

                                    {/* AI Report Category Suggestion Inputs */}
                                    {editingSetting.key === 'ai_report_category_suggestion' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                    Confidence threshold (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="50"
                                                    max="99"
                                                    required
                                                    value={settingEditForm.confidenceThreshold}
                                                    onChange={(e) => setSettingEditForm({ ...settingEditForm, confidenceThreshold: e.target.value })}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono-data"
                                                />
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    Minimum AI certainty before suggesting a category to staff (default: 75%).
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="checkbox"
                                                    id="suggest-urgency-toggle"
                                                    checked={Boolean(settingEditForm.suggestUrgency)}
                                                    onChange={(e) => setSettingEditForm({ ...settingEditForm, suggestUrgency: e.target.checked })}
                                                    className="w-4 h-4 rounded text-[#ff6b00] border-slate-300 focus:ring-[#ff6b00]"
                                                />
                                                <label htmlFor="suggest-urgency-toggle" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    Suggest urgency rating based on report description
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Flood & Drainage Risk Inputs */}
                                    {editingSetting.key === 'ai_flood_drainage_risk' && (
                                        <div className="space-y-3.5">
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                    Forecast frequency
                                                </label>
                                                <select
                                                    value={settingEditForm.cadence}
                                                    onChange={(e) => setSettingEditForm({ ...settingEditForm, cadence: e.target.value })}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                                                >
                                                    <option value="weekly">Weekly</option>
                                                    <option value="2 weeks">Every 2 weeks</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                    High-risk threshold
                                                </label>
                                                <input
                                                    type="text"
                                                    value={settingEditForm.threshold}
                                                    onChange={(e) => setSettingEditForm({ ...settingEditForm, threshold: e.target.value })}
                                                    placeholder="e.g. Moderate (70mm/hr)"
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono-data"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                    Weather data source
                                                </label>
                                                <input
                                                    type="text"
                                                    value={settingEditForm.dataSource}
                                                    onChange={(e) => setSettingEditForm({ ...settingEditForm, dataSource: e.target.value })}
                                                    placeholder="PAGASA Radar & Sensors"
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Mandatory Reason for Change */}
                                    <div className="pt-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Reason for change (Required Audit Field)
                                        </label>
                                        <textarea
                                            rows="2"
                                            required
                                            value={settingEditForm.reason}
                                            onChange={(e) => setSettingEditForm({ ...settingEditForm, reason: e.target.value })}
                                            placeholder="Explain why this setting is being modified..."
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            An immutable audit log record with your justification will be permanently saved.
                                        </p>
                                    </div>

                                    {/* Drawer Actions */}
                                    <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setEditingSetting(null)}
                                            className="min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!settingEditForm.reason.trim()}
                                            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-center shadow-xs"
                                        >
                                            Save changes
                                        </button>
                                    </div>
                                </form>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* ═══════════════════════════════════════════════════════════════
                    MODAL: CONFIRM TURNING OFF AI TOOL
                ════════════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {confirmingAiToggle && (
                        <div className="fixed inset-0 z-115 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-amber-500/10 text-[#ff6b00]">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            Turn off {confirmingAiToggle.title}?
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingAiToggle(null)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {confirmingAiToggle.key === 'ai_report_category_suggestion'
                                        ? 'Staff will no longer see category suggestions and urgency highlights. You can turn it back on anytime.'
                                        : 'Staff will no longer see risk highlights and drainage forecasts. You can turn it back on anytime.'}
                                </p>

                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingAiToggle(null)}
                                        className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Keep On
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmTurnOffAi}
                                        className="min-h-[44px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Turn Off
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ═══════════════════════════════════════════════════════════════
                    MODAL: AUDIT LOG HISTORY VIEWER
                ════════════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isAuditHistoryModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[85vh] flex flex-col"
                            >
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            System Change History & Audit Ledger
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Immutable log of account changes, policy edits, and KYC reviews
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsAuditHistoryModalOpen(false)}
                                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto my-4 divide-y divide-slate-100 dark:divide-slate-800/80">
                                    {auditLogsLoading ? (
                                        <div className="p-8 text-center text-xs text-slate-500">
                                            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-[#ff6b00]" />
                                            Retrieving audit records...
                                        </div>
                                    ) : auditLogs.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-slate-400">
                                            No audit events recorded yet.
                                        </div>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <div key={log.id} className="py-2.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {log.action}
                                                    </span>
                                                    <span className="font-mono-data text-[10.5px] text-slate-400">
                                                        {log.timestamp}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    By: <strong>{log.actor}</strong> ({log.actor_role})
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsAuditHistoryModalOpen(false)}
                                        className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ═══════════════════════════════════════════════════════════════
                    MODAL: RESIDENT ID REVIEW (RA 10173 AUDIT LOGGED)
                ════════════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {kycModalResident && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6"
                            >
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Resident Verification Details
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setKycModalResident(null)}
                                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {kycLoading ? (
                                    <div className="p-8 text-center text-xs text-slate-500">
                                        <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-[#ff6b00]" />
                                        Inspecting citizen credentials...
                                    </div>
                                ) : (
                                    <div className="space-y-4 my-4">
                                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400">
                                            <strong>RA 10173 Audit Notice:</strong> Access to citizen identification records is governed by the Data Privacy Act of 2012. This inspection has been permanently logged in the municipal audit ledger.
                                        </div>

                                        <div className="space-y-2 text-xs">
                                            <div><strong>Citizen Name:</strong> {kycDetails?.full_name || kycModalResident.name}</div>
                                            <div><strong>ID Document Type:</strong> {kycDetails?.id_type}</div>
                                            <div><strong>Document Tier:</strong> {kycDetails?.id_tier}</div>
                                            <div><strong>Document Number:</strong> <span className="font-mono-data">{kycDetails?.masked_id_number}</span></div>
                                            <div><strong>Current Tier:</strong> {kycDetails?.kyc_level}</div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                Review Note / Reason
                                            </label>
                                            <input
                                                type="text"
                                                value={kycDecisionReason}
                                                onChange={(e) => setKycDecisionReason(e.target.value)}
                                                placeholder="e.g. Official PhilSys signature matches"
                                                className="admin-input-field"
                                            />
                                        </div>

                                        <div className="pt-2 flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleKycDecision('reject')}
                                                className="px-3.5 py-2 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-bold"
                                            >
                                                Reject ID
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKycDecision('approve')}
                                                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                            >
                                                Verify & Approve
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
