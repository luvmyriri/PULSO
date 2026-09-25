import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import OrangeSelect from '../components/OrangeSelect';
import './administration-workspace.css';

const ADMIN_TABS = [
    { key: 'staff', label: 'Staff Members' },
    { key: 'residents', label: 'Resident Accounts' },
    { key: 'settings', label: 'System Settings' },
    { key: 'agents', label: 'Automated & AI Tools' },
];

const MFA_FILTER_OPTIONS = [
    { value: 'all', label: 'All staff', description: 'Show all employee accounts' },
    { value: 'on', label: '2FA Enabled', description: 'Two-factor protection active' },
    { value: 'off', label: '2FA Disabled', description: 'Two-factor setup pending' },
];

const ROLE_OPTIONS = [
    { value: 'Engineer II', label: 'Engineer II', description: 'General engineering & reports' },
    { value: 'Senior Engineer', label: 'Senior Engineer', description: 'Lead, review & approvals' },
    { value: 'Project Engineer', label: 'Project Engineer', description: 'Project oversight & BoQ' },
    { value: 'Division Chief', label: 'Division Chief', description: 'Full division authority' },
    { value: 'City Engineer', label: 'City Engineer', description: 'Department executive head' },
    { value: 'Field Technician', label: 'Field Technician', description: 'Field work & mobile app' },
    { value: 'Lead Auditor', label: 'Lead Auditor', description: 'Review & compliance only' },
];

const INVITE_ROLE_OPTIONS = [
    { value: 'Engineer II', label: 'Engineer II', description: 'General engineering & reports' },
    { value: 'Senior Engineer', label: 'Senior Engineer', description: 'Lead, review & approvals' },
    { value: 'Project Engineer', label: 'Project Engineer', description: 'Project oversight & BoQ' },
    { value: 'Division Chief', label: 'Division Chief', description: 'Full division authority' },
    { value: 'Field Technician', label: 'Field Technician', description: 'Field work & mobile app' },
    { value: 'Lead Auditor', label: 'Lead Auditor', description: 'Review & compliance only' },
];

const OFFICE_OPTIONS = [
    { value: 'Field Operations Team', label: 'Field Operations Team' },
    { value: 'Quality & Inspection Division', label: 'Quality & Inspection Division' },
    { value: 'Survey & Planning Division', label: 'Survey & Planning Division' },
    { value: 'Depot Fleet Operations', label: 'Depot Fleet Operations' },
    { value: 'Project Delivery Office', label: 'Project Delivery Office' },
];

const ROLE_PERMISSIONS = {
    'Engineer II': [
        'Create and update assigned field work orders',
        'Review and draft engineering drawings for assigned projects',
        'View office cost estimates and material lists',
        'Standard staff activity logging',
    ],
    'Senior Engineer': [
        'Review, approve, and assign work orders to teams',
        'Edit and certify infrastructure design packages',
        'View budget and cost estimates across all department offices',
        'Review team activity logs and compliance history',
    ],
    'Division Chief': [
        'Full approval and expedite authority for division projects',
        'Final sign-off on design packages and work orders',
        'Certify bill of quantities and project budgets',
        'Full division oversight and administrative sign-off',
    ],
    'Project Engineer': [
        'Endorse and supervise specific project work orders',
        'Create and submit project design specifications',
        'View assigned project budgets and milestones',
        'Standard project activity logging',
    ],
    'City Engineer': [
        'Department-wide executive approval and statutory authority',
        'Final executive seal and sign-off on municipal infrastructure',
        'Department budget authorization and administrative control',
        'Complete system-wide access and governance',
    ],
    'Field Technician': [
        'View assigned daily inspection and repair tasks',
        'Upload site photos and completion reports via mobile',
        'Standard mobile field activity logging',
    ],
    'Lead Auditor': [
        'Read-only inspection access across all projects and work orders',
        'Review municipal infrastructure budgets and expenditure records',
        'Export and verify system activity and compliance logs',
    ],
};

const INITIAL_OFFICIALS = [
    {
        id: 1,
        name: 'Luis Morales',
        official_id: 'ENG00123',
        account_state: 'Active',
        role: 'Engineer II',
        scope: 'North Caloocan',
        mfa: 'Enabled',
        mfa_enabled: true,
        last_access: 'May 15, 2026 08:21 AM PHT',
        delegation: 'Field Operations',
        email: 'luis.morales@northcaloocan.gov.ph',
        office: 'Field Operations Team',
    },
    {
        id: 2,
        name: 'Marga Dela Cruz',
        official_id: 'ENG00125',
        account_state: 'Active',
        role: 'Engineer II',
        scope: 'North Caloocan',
        mfa: 'Enabled',
        mfa_enabled: true,
        last_access: 'May 15, 2026 07:58 AM PHT',
        delegation: 'Inspection Team',
        email: 'marga.delacruz@northcaloocan.gov.ph',
        office: 'Quality & Inspection Division',
    },
    {
        id: 3,
        name: 'Ramon Cruz',
        official_id: 'ENG00165',
        account_state: 'Active',
        role: 'Engineer II',
        scope: 'North Caloocan',
        mfa: 'Enabled',
        mfa_enabled: true,
        last_access: 'May 15, 2026 07:05 AM PHT',
        delegation: 'Planning Team',
        email: 'ramon.cruz@northcaloocan.gov.ph',
        office: 'Survey & Planning Division',
    },
    {
        id: 4,
        name: 'Jon Cruz',
        official_id: 'TECH00087',
        account_state: 'Active',
        role: 'Field Technician',
        scope: 'North Caloocan',
        mfa: 'Not Enabled',
        mfa_enabled: false,
        last_access: 'May 14, 2026 04:21 PM PHT',
        delegation: 'Fleet Team',
        email: 'jon.cruz@northcaloocan.gov.ph',
        office: 'Depot Fleet Operations',
    },
    {
        id: 5,
        name: 'Ana Reyes',
        official_id: 'ENG00098',
        account_state: 'Active',
        role: 'Senior Engineer',
        scope: 'North Caloocan',
        mfa: 'Enabled',
        mfa_enabled: true,
        last_access: 'May 15, 2026 08:35 AM PHT',
        delegation: 'Project Delivery',
        email: 'ana.reyes@northcaloocan.gov.ph',
        office: 'Project Delivery Office',
    },
    {
        id: 6,
        name: 'Design Team Group',
        official_id: 'GRP0042',
        account_state: 'Active',
        role: 'Project Engineer',
        scope: 'North Caloocan',
        mfa: 'Enabled',
        mfa_enabled: true,
        last_access: 'May 14, 2026 03:12 PM PHT',
        delegation: 'Design Division (5 members)',
        email: 'design.group@northcaloocan.gov.ph',
        office: 'Design Division',
    },
];

const SAMPLE_RESIDENTS = [
    { id: 'RES-0891', name: 'Maria Santos', barangay: 'Brgy. 176', tier: 'Verified (National ID)', reports_count: 5, active_reports: 1, status: 'Active', mfa: 'SMS Verified' },
    { id: 'RES-0844', name: 'Danilo Ramos', barangay: 'Brgy. 172', tier: 'Verified (Barangay ID)', reports_count: 12, active_reports: 2, status: 'Active', mfa: 'App Verified' },
    { id: 'RES-0762', name: 'Corazon Mendoza', barangay: 'Brgy. 170', tier: 'Basic (Mobile Only)', reports_count: 2, active_reports: 0, status: 'Active', mfa: 'SMS Verified' },
    { id: 'RES-0619', name: 'Eduardo Bautista', barangay: 'Brgy. 167', tier: 'Verified (National ID)', reports_count: 8, active_reports: 1, status: 'Active', mfa: 'SMS Verified' },
];

export default function AdministrationWorkspacePage({ workspace = 'administration' }) {
    const [params, setParams] = useSearchParams();
    const [officials, setOfficials] = useState(INITIAL_OFFICIALS);
    const [toastMessage, setToastMessage] = useState(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [mfaFilter, setMfaFilter] = useState('all');

    // Role mutation editor state
    const [selectedRole, setSelectedRole] = useState('Senior Engineer');
    const [reason, setReason] = useState('');

    // Modal states
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        name: '',
        email: '',
        official_id: '',
        role: 'Engineer II',
        office: 'Field Operations Team',
        scope: 'North Caloocan',
    });

    const activeTab = params.get('view') || 'staff';
    const userParam = params.get('user');
    const selectedOfficialId = userParam ? Number(userParam) : null;

    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem('pulso_user') || 'null');
        } catch {
            return null;
        }
    };
    const currentUser = readUser();

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const updateParam = (key, value) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            if (!value) next.delete(key);
            else next.set(key, value);
            return next;
        }, { replace: true });
    };

    const filteredOfficials = useMemo(() => {
        return officials.filter((off) => {
            const matchesSearch =
                off.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                off.official_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                off.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                off.office.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesMfa =
                mfaFilter === 'all' || (mfaFilter === 'on' ? off.mfa_enabled : !off.mfa_enabled);
            return matchesSearch && matchesMfa;
        });
    }, [officials, searchQuery, mfaFilter]);

    const selectedOfficial = selectedOfficialId ? officials.find((o) => o.id === selectedOfficialId) || null : null;

    // Sync selectedRole when selectedOfficial changes
    useEffect(() => {
        if (selectedOfficial?.role) {
            setSelectedRole(selectedOfficial.role);
            setReason('');
        }
    }, [selectedOfficial?.id]);

    const handleSubmitChange = () => {
        if (!selectedOfficial) return;
        setOfficials((prev) =>
            prev.map((off) => {
                if (off.id === selectedOfficial.id) {
                    return {
                        ...off,
                        role: selectedRole,
                        last_access: 'Just now (Role updated)',
                    };
                }
                return off;
            })
        );

        showToast(`Role updated to ${selectedRole} for ${selectedOfficial.name}.`);
        setIsPreviewModalOpen(false);
    };

    const handleInviteSubmit = (e) => {
        e.preventDefault();
        if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
            showToast('Please enter both name and email.');
            return;
        }

        const newOfficial = {
            id: Date.now(),
            name: inviteForm.name.trim(),
            official_id: inviteForm.official_id || `ENG00${Math.floor(100 + Math.random() * 900)}`,
            account_state: 'Active',
            role: inviteForm.role,
            scope: inviteForm.scope,
            mfa: 'Enabled',
            mfa_enabled: true,
            last_access: 'Pending first sign-in',
            delegation: inviteForm.office,
            email: inviteForm.email.trim(),
            office: inviteForm.office,
        };

        setOfficials([...officials, newOfficial]);
        setIsInviteModalOpen(false);
        setInviteForm({
            name: '',
            email: '',
            official_id: '',
            role: 'Engineer II',
            office: 'Field Operations Team',
            scope: 'North Caloocan',
        });
        updateParam('user', String(newOfficial.id));
        showToast(`Invitation sent to ${newOfficial.email}. Staff member added.`);
    };

    return (
        <div className="admin-page">
            <GovSidebar currentUser={currentUser} activeTab="settings" />
            <div className="admin-shell">
                {/* Topbar */}
                <header className="admin-topbar relative z-50">
                    <div className="admin-topbar__title-group flex flex-col text-left">
                        <GovBreadcrumb category="System Admin" current="Staff & System Settings" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">Staff & System Settings</h1>
                        <p>Manage city engineering staff accounts, roles, resident access, and department preferences.</p>
                    </div>
                    <div className="projects-topbar-actions">
                        {toastMessage && (
                            <div className="citizen-reports-toast-pill" role="status">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <span className="projects-freshness">Updated today at 08:42 AM PHT</span>
                        <ThemeToggle />
                        <button
                            type="button"
                            className="citizen-reports-icon-button"
                            onClick={() => showToast('Staff directory and settings updated.')}
                            aria-label="Refresh settings"
                            title="Refresh settings"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </header>

                {/* Tabs Bar */}
                <div className="admin-tabs-bar">
                    <div className="admin-tabs-list" role="tablist">
                        {ADMIN_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                className={`admin-tab${activeTab === tab.key ? ' is-active' : ''}`}
                                onClick={() => updateParam('view', tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="admin-actions-bar">
                        <button
                            type="button"
                            className="work-orders-create-btn"
                            onClick={() => setIsInviteModalOpen(true)}
                        >
                            <UserPlus size={14} /> Add Staff Member
                        </button>
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                {activeTab === 'staff' && (
                    <div className="records-controls-bar">
                        <div className="records-search-box">
                            <Search size={14} className="records-search-icon" />
                            <input
                                type="text"
                                placeholder="Search by name, ID, role, or department..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="records-search-input"
                                aria-label="Search staff"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="records-search-clear"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <div className="records-filter-group flex items-center gap-2">
                            <span className="records-filter-label flex items-center gap-1">
                                <Smartphone size={12} /> Security:
                            </span>
                            <OrangeSelect
                                value={mfaFilter}
                                onChange={setMfaFilter}
                                options={MFA_FILTER_OPTIONS}
                                size="sm"
                                minWidth="150px"
                                align="right"
                                searchable={false}
                            />
                        </div>
                    </div>
                )}

                <main className="admin-main">
                    {activeTab === 'staff' ? (
                        /* ── PANEL: STAFF MEMBERS & ROLES ─────────────────────────────── */
                        <div className="admin-layout-split">
                            <div className="admin-table-wrapper">
                                <table className="records-table" aria-label="Staff directory table">
                                    <thead>
                                        <tr>
                                            <th>Staff Member</th>
                                            <th>Employee ID</th>
                                            <th>Status</th>
                                            <th>Assigned Role</th>
                                            <th>Department</th>
                                            <th>2FA Security</th>
                                            <th>Last Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOfficials.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--gov-text-secondary)' }}>
                                                    <Users size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
                                                    No staff members found matching search.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOfficials.map((off) => {
                                                const isSelected = selectedOfficial?.id === off.id;
                                                return (
                                                    <tr
                                                        key={off.id}
                                                        className={isSelected ? 'is-selected' : ''}
                                                        onClick={() => updateParam('user', isSelected ? null : String(off.id))}
                                                        style={{ cursor: 'pointer' }}
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                updateParam('user', isSelected ? null : String(off.id));
                                                            }
                                                        }}
                                                    >
                                                        <td>
                                                            <div className="records-signal-marker-cell">
                                                                {isSelected && <span className="records-signal-cut" />}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div className="admin-avatar-small">
                                                                        {off.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <strong>{off.name}</strong>
                                                                        <div style={{ fontSize: 11, color: 'var(--gov-text-secondary)' }}>{off.email}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="records-cell-mono" style={{ color: 'var(--gov-action)' }}>
                                                            {off.official_id}
                                                        </td>
                                                        <td>
                                                            <span className="gov-state-badge is-completed">
                                                                {off.account_state}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <strong style={{ color: 'var(--gov-text)' }}>{off.role}</strong>
                                                        </td>
                                                        <td>{off.office}</td>
                                                        <td>
                                                            <span
                                                                className={`admin-mfa-badge is-${off.mfa_enabled ? 'on' : 'off'}`}
                                                            >
                                                                <Smartphone size={11} /> {off.mfa}
                                                            </span>
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{off.last_access}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Right Rail: Staff Profile & Simple Role Editor */}
                            <AnimatePresence initial={false}>
                                {selectedOfficial && (
                                    <motion.aside
                                        key="admin-editor-rail"
                                        initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                        animate={{ width: 440, opacity: 1, marginLeft: 20 }}
                                        exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                        className="admin-editor-rail"
                                    >
                                        <div className="admin-editor-card">
                                            <div className="admin-editor-header flex items-center justify-between">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="records-docket-signal-cut shrink-0" />
                                                    <div className="min-w-0">
                                                        <h3>Staff Profile & Role</h3>
                                                        <span className="admin-editor-sub">
                                                            View staff member details and manage assigned permissions
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => updateParam('user', null)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                                    title="Close profile panel"
                                                    aria-label="Close profile panel"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            {/* Instant inner profile card update when switching staff */}
                                            <motion.div
                                                key={selectedOfficial.id}
                                                initial={{ opacity: 0.6 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.1 }}
                                                className="flex flex-col gap-4"
                                            >
                                                {/* Staff Summary Card */}
                                                <div className="admin-profile-summary">
                                                    <div className="admin-profile-avatar">
                                                        {selectedOfficial.name.charAt(0)}
                                                    </div>
                                                    <div className="admin-profile-details">
                                                        <h4>{selectedOfficial.name}</h4>
                                                        <div className="admin-profile-meta">
                                                            <span className="records-cell-mono">{selectedOfficial.official_id}</span>
                                                            <span>•</span>
                                                            <span>{selectedOfficial.office}</span>
                                                        </div>
                                                        <div className="admin-profile-email">{selectedOfficial.email}</div>
                                                    </div>
                                                </div>

                                                {/* Role Selector */}
                                                <div className="admin-role-picker">
                                                    <label className="admin-field-label">
                                                        Assigned Role
                                                    </label>
                                                    <OrangeSelect
                                                        value={selectedRole}
                                                        onChange={setSelectedRole}
                                                        options={ROLE_OPTIONS}
                                                        size="md"
                                                        className="w-full"
                                                        minWidth="100%"
                                                        searchable={false}
                                                    />
                                                </div>

                                                {/* What this role can do */}
                                                <div className="admin-permissions-box">
                                                    <div className="admin-permissions-title">
                                                        What this role can do:
                                                    </div>
                                                    <ul className="admin-permissions-list">
                                                        {(ROLE_PERMISSIONS[selectedRole] || []).map((perm, idx) => (
                                                            <li key={idx} className="admin-permission-item">
                                                                <Check size={14} className="admin-permission-icon" />
                                                                <span>{perm}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Optional reason / note */}
                                                <div>
                                                    <label className="admin-field-label" htmlFor="role-reason">
                                                        Reason for update (optional)
                                                    </label>
                                                    <input
                                                        id="role-reason"
                                                        type="text"
                                                        className="admin-input-field"
                                                        value={reason}
                                                        onChange={(e) => setReason(e.target.value)}
                                                        placeholder="e.g. Promotion, reassignment, or project transfer"
                                                    />
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="admin-editor-actions">
                                                    {selectedRole !== selectedOfficial.role && (
                                                        <button
                                                            type="button"
                                                            className="gov-btn-secondary"
                                                            onClick={() => setSelectedRole(selectedOfficial.role)}
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="gov-btn-primary inline-flex items-center justify-center gap-1.5"
                                                        style={{ gridColumn: selectedRole === selectedOfficial.role ? '1 / -1' : 'auto' }}
                                                        onClick={() => {
                                                            if (selectedRole === selectedOfficial.role) {
                                                                showToast(`${selectedOfficial.name} is already assigned as ${selectedRole}.`);
                                                            } else {
                                                                setIsPreviewModalOpen(true);
                                                            }
                                                        }}
                                                    >
                                                        <Check size={16} strokeWidth={2.5} className="shrink-0" />
                                                        <span>Save Role Change</span>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.aside>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : activeTab === 'residents' ? (
                        /* ── PANEL: RESIDENT ACCOUNTS ─────────────────────────────── */
                        <div className="insights-section-card">
                            <div className="insights-card-header">
                                <div>
                                    <h3>Resident Accounts & Verification</h3>
                                    <p className="insights-card-sub">View verified citizen accounts, reporting activity, and security status</p>
                                </div>
                            </div>
                            <div className="records-table-wrapper">
                                <table className="records-table">
                                    <thead>
                                        <tr>
                                            <th>Resident ID</th>
                                            <th>Full Name</th>
                                            <th>Barangay</th>
                                            <th>Verification Level</th>
                                            <th>Total Reports</th>
                                            <th>Active Reports</th>
                                            <th>Sign-in Security</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SAMPLE_RESIDENTS.map((res) => (
                                            <tr key={res.id}>
                                                <td className="records-cell-mono">{res.id}</td>
                                                <td><strong>{res.name}</strong></td>
                                                <td>{res.barangay}</td>
                                                <td>
                                                    <span className="gov-state-badge is-completed">
                                                        <ShieldCheck size={11} style={{ display: 'inline', marginRight: 4 }} />
                                                        {res.tier}
                                                    </span>
                                                </td>
                                                <td>{res.reports_count} filed</td>
                                                <td>{res.active_reports} active</td>
                                                <td>{res.mfa}</td>
                                                <td>
                                                    <span className="admin-mfa-badge is-on">
                                                        {res.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : activeTab === 'settings' ? (
                        /* ── PANEL: SYSTEM SETTINGS ──────────────────────────────── */
                        <div className="insights-section-card">
                            <div className="insights-card-header">
                                <div>
                                    <h3>System Settings & Policies</h3>
                                    <p className="insights-card-sub">Default response times, document retention, and security standards</p>
                                </div>
                            </div>
                            <div className="admin-settings-grid">
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Target Response Time (SLA)</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>Maximum triage time before automated supervisor reminder</p>
                                    </div>
                                    <span className="admin-setting-badge">24 Hours (Urgent) / 48 Hours (Standard)</span>
                                </div>
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Record Storage Duration</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>Minimum retention period before scheduled archivist review</p>
                                    </div>
                                    <span className="admin-setting-badge">7 Years (Government Standard)</span>
                                </div>
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Activity Log Security</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>Tamper-evident audit logging and continuous change tracking</p>
                                    </div>
                                    <span className="admin-setting-badge is-active">Active & Protected</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── PANEL: AUTOMATED & AI TOOLS ──────────────────────── */
                        <div className="insights-section-card">
                            <div className="insights-card-header">
                                <div>
                                    <h3>Automated & AI Tools</h3>
                                    <p className="insights-card-sub">Configure how automated assistants suggest report categories and predict maintenance risks</p>
                                </div>
                            </div>
                            <div className="admin-settings-grid">
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Report Category Suggestion</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>Suggests category and urgency for incoming citizen reports</p>
                                    </div>
                                    <span className="admin-setting-badge is-active">Advisory Mode (Staff Confirmation Required)</span>
                                </div>
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Flood & Drainage Risk Forecasting</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>Analyzes weather and historical drainage data to highlight high-risk zones</p>
                                    </div>
                                    <span className="admin-setting-badge is-active">Active · Bi-weekly Forecast</span>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Confirm Role Change Modal */}
            {isPreviewModalOpen && selectedOfficial && (
                <div className="records-modal-overlay" role="dialog" aria-modal="true">
                    <div className="records-modal-card">
                        <div className="records-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                    Confirm Role Change
                                </h3>
                                <div style={{ fontSize: 12, color: 'var(--gov-text-secondary)', marginTop: 2 }}>
                                    Updating permissions for {selectedOfficial.name}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="citizen-reports-icon-button"
                                onClick={() => setIsPreviewModalOpen(false)}
                                aria-label="Close modal"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="records-modal-body">
                            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--gov-text)', lineHeight: 1.5 }}>
                                Are you sure you want to change <strong>{selectedOfficial.name}</strong>'s role from{' '}
                                <span style={{ textDecoration: 'line-through', color: 'var(--gov-text-secondary)' }}>
                                    {selectedOfficial.role}
                                </span>{' '}
                                to <strong style={{ color: 'var(--gov-action, #ff6b00)' }}>{selectedRole}</strong>?
                            </p>

                            <div className="admin-permissions-box" style={{ marginTop: 8 }}>
                                <div className="admin-permissions-title">
                                    Permissions for {selectedRole}:
                                </div>
                                <ul className="admin-permissions-list">
                                    {(ROLE_PERMISSIONS[selectedRole] || []).map((perm, idx) => (
                                        <li key={idx} className="admin-permission-item">
                                            <Check size={14} className="admin-permission-icon" />
                                            <span>{perm}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {reason && (
                                <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--gov-canvas)', borderRadius: 6, fontSize: 12 }}>
                                    <strong>Note / Reason:</strong>
                                    <p style={{ margin: '4px 0 0', color: 'var(--gov-text-secondary)' }}>{reason}</p>
                                </div>
                            )}
                        </div>
                        <div className="records-modal-footer">
                            <button
                                type="button"
                                className="gov-btn-secondary"
                                onClick={() => setIsPreviewModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="gov-btn-primary inline-flex items-center justify-center gap-1.5"
                                onClick={handleSubmitChange}
                            >
                                <Check size={16} strokeWidth={2.5} className="shrink-0" />
                                <span>Confirm & Save</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Staff Member Modal */}
            {isInviteModalOpen && (
                <div className="records-modal-overlay" role="dialog" aria-modal="true">
                    <form className="records-modal-card" onSubmit={handleInviteSubmit}>
                        <div className="records-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                    Add New Staff Member
                                </h3>
                                <div style={{ fontSize: 12, color: 'var(--gov-text-secondary)', marginTop: 2 }}>
                                    Create an account for city engineering personnel
                                </div>
                            </div>
                            <button
                                type="button"
                                className="citizen-reports-icon-button"
                                onClick={() => setIsInviteModalOpen(false)}
                                aria-label="Close modal"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="records-modal-body">
                            <div className="records-form-grid">
                                <div>
                                    <label className="records-form-label" htmlFor="invite-name">
                                        Full Name *
                                    </label>
                                    <input
                                        id="invite-name"
                                        type="text"
                                        required
                                        className="records-form-input"
                                        placeholder="e.g. Engr. Gabriel Santos"
                                        value={inviteForm.name}
                                        onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="records-form-label" htmlFor="invite-email">
                                        Official Email Address *
                                    </label>
                                    <input
                                        id="invite-email"
                                        type="email"
                                        required
                                        className="records-form-input"
                                        placeholder="e.g. gabriel.santos@northcaloocan.gov.ph"
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label className="records-form-label">
                                            Role
                                        </label>
                                        <OrangeSelect
                                            value={inviteForm.role}
                                            onChange={(val) => setInviteForm((prev) => ({ ...prev, role: val }))}
                                            options={INVITE_ROLE_OPTIONS}
                                            size="md"
                                            className="w-full"
                                            minWidth="100%"
                                            searchable={false}
                                            dropUp={true}
                                        />
                                    </div>
                                    <div>
                                        <label className="records-form-label">
                                            Office / Department
                                        </label>
                                        <OrangeSelect
                                            value={inviteForm.office}
                                            onChange={(val) => setInviteForm((prev) => ({ ...prev, office: val }))}
                                            options={OFFICE_OPTIONS}
                                            size="md"
                                            className="w-full"
                                            minWidth="100%"
                                            searchable={false}
                                            dropUp={true}
                                            align="right"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="records-modal-footer">
                            <button
                                type="button"
                                className="gov-btn-secondary"
                                onClick={() => setIsInviteModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="gov-btn-primary inline-flex items-center justify-center gap-1.5"
                            >
                                <UserPlus size={16} strokeWidth={2.5} className="shrink-0" />
                                <span>Send Invitation</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
