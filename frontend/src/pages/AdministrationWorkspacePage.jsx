import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    ArrowRight,
    Check,
    CheckCircle2,
    Layers,
    RefreshCw,
    Search,
    ShieldCheck,
    Sliders,
    Smartphone,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import './administration-workspace.css';

const ADMIN_TABS = [
    { key: 'staff', label: 'People and roles' },
    { key: 'residents', label: 'Resident accounts' },
    { key: 'settings', label: 'System settings' },
    { key: 'agents', label: 'Agent governance' },
];

const INITIAL_OFFICIALS = [
    {
        id: 1,
        name: 'Luis Morales',
        official_id: 'ENG00123',
        account_state: 'Active',
        role: 'Engineer II',
        scope: 'North Caloocan',
        mfa: 'MFA On',
        mfa_enabled: true,
        last_access: 'May 15, 2026 08:21 AM PHT',
        delegation: 'None',
        email: 'luis.morales@northcaloocan.gov.ph',
        office: 'Field Operations Team',
        capabilities: {
            approve_wo: 'View, Create',
            modify_design: 'View (own)',
            cost_estimates: 'View (own office)',
            audit_stream: 'Standard logging',
        },
    },
    {
        id: 2,
        name: 'Marga Dela Cruz',
        official_id: 'ENG00125',
        account_state: 'Active',
        role: 'Engineer II',
        scope: 'North Caloocan',
        mfa: 'MFA On',
        mfa_enabled: true,
        last_access: 'May 15, 2026 07:58 AM PHT',
        delegation: 'None',
        email: 'marga.delacruz@northcaloocan.gov.ph',
        office: 'Quality & Inspection Division',
        capabilities: {
            approve_wo: 'View, Create, Inspect',
            modify_design: 'View (own)',
            cost_estimates: 'View (own office)',
            audit_stream: 'Standard logging',
        },
    },
    {
        id: 3,
        name: 'Ramon Cruz',
        official_id: 'ENG00165',
        account_state: 'Active',
        role: 'Engineer II',
        scope: 'North Caloocan',
        mfa: 'MFA On',
        mfa_enabled: true,
        last_access: 'May 15, 2026 07:05 AM PHT',
        delegation: 'None',
        email: 'ramon.cruz@northcaloocan.gov.ph',
        office: 'Survey & Planning Division',
        capabilities: {
            approve_wo: 'View, Create',
            modify_design: 'View, Edit (Surveys)',
            cost_estimates: 'View (own office)',
            audit_stream: 'Standard logging',
        },
    },
    {
        id: 4,
        name: 'Jon Cruz',
        official_id: 'TECH00087',
        account_state: 'Active',
        role: 'Technician II',
        scope: 'North Caloocan',
        mfa: 'MFA Off',
        mfa_enabled: false,
        last_access: 'May 14, 2026 04:21 PM PHT',
        delegation: 'None',
        email: 'jon.cruz@northcaloocan.gov.ph',
        office: 'Depot Fleet Operations',
        capabilities: {
            approve_wo: 'View assigned',
            modify_design: 'None',
            cost_estimates: 'None',
            audit_stream: 'Standard logging',
        },
    },
    {
        id: 5,
        name: 'Ana Reyes',
        official_id: 'ENG00098',
        account_state: 'Active',
        role: 'Senior Engineer',
        scope: 'North Caloocan',
        mfa: 'MFA On',
        mfa_enabled: true,
        last_access: 'May 15, 2026 08:35 AM PHT',
        delegation: 'None',
        email: 'ana.reyes@northcaloocan.gov.ph',
        office: 'Project Delivery Office',
        capabilities: {
            approve_wo: 'View, Create, Approve',
            modify_design: 'View, Edit',
            cost_estimates: 'View (all offices)',
            audit_stream: 'Audit review access',
        },
    },
    {
        id: 6,
        name: 'Design Team Group',
        official_id: 'GRP0042',
        account_state: 'Group',
        role: 'Design Engineers',
        scope: 'North Caloocan',
        mfa: 'MFA On',
        mfa_enabled: true,
        last_access: 'May 14, 2026 03:12 PM PHT',
        delegation: 'Delegated (5 members)',
        email: 'design.group@northcaloocan.gov.ph',
        office: 'Design Division',
        capabilities: {
            approve_wo: 'View, Create',
            modify_design: 'View, Edit, Draft BoQ',
            cost_estimates: 'View (own office)',
            audit_stream: 'Standard logging',
        },
    },
];

const ROLE_CAPABILITY_DEFINITIONS = {
    'Senior Engineer': {
        approve_wo: 'View, Create, Approve',
        modify_design: 'View, Edit',
        cost_estimates: 'View (all offices)',
        audit_stream: 'Audit review access',
        impact_scope: '1 role change · 3 capabilities affected · 12 routes · 3 data domains',
    },
    'Division Chief': {
        approve_wo: 'View, Create, Approve, Expedite',
        modify_design: 'Full Division Approval Authority',
        cost_estimates: 'View, Modify, Certify BoQ',
        audit_stream: 'Full division audit stream & sign-off',
        impact_scope: '1 role change · 4 capabilities affected · 18 routes · 5 data domains',
    },
    'Project Engineer': {
        approve_wo: 'View, Create, Endorse',
        modify_design: 'View, Edit, Submit BoQ',
        cost_estimates: 'View (assigned projects)',
        audit_stream: 'Standard logging',
        impact_scope: '1 role change · 2 capabilities affected · 8 routes · 2 data domains',
    },
    'City Engineer': {
        approve_wo: 'Full Statutory Approval & Override',
        modify_design: 'Executive Seal & Sign-Off',
        cost_estimates: 'Final Statutory Certification',
        audit_stream: 'Executive audit controller & purge protection',
        impact_scope: 'Executive role change · 6 capabilities affected · Full workspace · All domains',
    },
    'Field Technician': {
        approve_wo: 'View assigned, Upload proof',
        modify_design: 'None',
        cost_estimates: 'None',
        audit_stream: 'Standard mobile logging',
        impact_scope: 'Field scope · 2 capabilities adjusted · Mobile routes only',
    },
    'Lead Auditor': {
        approve_wo: 'Read-only compliance inspection',
        modify_design: 'Read-only design archive',
        cost_estimates: 'Full financial audit read-only',
        audit_stream: 'Immutable audit ledger exporter & verifier',
        impact_scope: 'Auditor scope · Complete read/verify permissions across all records',
    },
};

const SAMPLE_RESIDENTS = [
    { id: 'RES-0891', name: 'Maria Santos', barangay: 'Brgy. 176', tier: 'Tier 2 (National ID)', reports_count: 5, active_reports: 1, status: 'Active', mfa: 'SMS Verified' },
    { id: 'RES-0844', name: 'Danilo Ramos', barangay: 'Brgy. 172', tier: 'Tier 3 (Barangay Validated)', reports_count: 12, active_reports: 2, status: 'Active', mfa: 'Authenticator App' },
    { id: 'RES-0762', name: 'Corazon Mendoza', barangay: 'Brgy. 170', tier: 'Tier 1 (Mobile Verified)', reports_count: 2, active_reports: 0, status: 'Active', mfa: 'SMS Verified' },
    { id: 'RES-0619', name: 'Eduardo Bautista', barangay: 'Brgy. 167', tier: 'Tier 2 (National ID)', reports_count: 8, active_reports: 1, status: 'Active', mfa: 'SMS Verified' },
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
    const [reason, setReason] = useState('Project requires senior sign-off and approval authority for PRJ-2026-0045');
    const [auditNote, setAuditNote] = useState('Promoted to Senior Engineer for PRJ-2026-0045 execution and approvals under North Caloocan infrastructure mandate.');

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
    const selectedOfficialId = Number(params.get('user')) || officials[0]?.id;

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

    const selectedOfficial = officials.find((o) => o.id === selectedOfficialId) || filteredOfficials[0] || officials[0];

    const currentRoleCap = selectedOfficial?.capabilities || {
        approve_wo: 'View, Create',
        modify_design: 'View (own)',
        cost_estimates: 'View (own office)',
        audit_stream: 'Standard logging',
    };

    const targetRoleCap = ROLE_CAPABILITY_DEFINITIONS[selectedRole] || ROLE_CAPABILITY_DEFINITIONS['Senior Engineer'];

    const handleSubmitChange = () => {
        if (!auditNote.trim()) {
            showToast('Validation Error: Audit justification note is required before applying RBAC capability mutation.');
            return;
        }

        // Apply mutation to official in state
        setOfficials((prev) =>
            prev.map((off) => {
                if (off.id === selectedOfficial.id) {
                    return {
                        ...off,
                        role: selectedRole,
                        capabilities: {
                            approve_wo: targetRoleCap.approve_wo,
                            modify_design: targetRoleCap.modify_design,
                            cost_estimates: targetRoleCap.cost_estimates,
                            audit_stream: targetRoleCap.audit_stream,
                        },
                        last_access: 'Just now (Role updated)',
                    };
                }
                return off;
            })
        );

        showToast(`Role updated to ${selectedRole} for ${selectedOfficial.name}. Audit event logged with PHT timestamp.`);
        setIsPreviewModalOpen(false);
    };

    const handleInviteSubmit = (e) => {
        e.preventDefault();
        if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
            showToast('Name and email are required.');
            return;
        }

        const newOfficial = {
            id: Date.now(),
            name: inviteForm.name.trim(),
            official_id: inviteForm.official_id || `ENG00${Math.floor(100 + Math.random() * 900)}`,
            account_state: 'Active',
            role: inviteForm.role,
            scope: inviteForm.scope,
            mfa: 'MFA On',
            mfa_enabled: true,
            last_access: 'Pending first sign-in',
            delegation: 'None',
            email: inviteForm.email.trim(),
            office: inviteForm.office,
            capabilities: ROLE_CAPABILITY_DEFINITIONS[inviteForm.role] || ROLE_CAPABILITY_DEFINITIONS['Engineer II'],
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
        showToast(`Invitation sent to ${newOfficial.email}. Staff account registered.`);
    };

    return (
        <div className="admin-page">
            <GovSidebar currentUser={currentUser} />
            <div className="admin-shell">
                {/* Topbar */}
                <header className="admin-topbar">
                    <div className="admin-topbar__title-group">
                        <h1>Administration and RBAC governance</h1>
                        <p>Staff directory, MFA security tracking, before/after capability matrix, resident account controls, and audit integrity.</p>
                    </div>
                    <div className="projects-topbar-actions">
                        {toastMessage && (
                            <div className="citizen-reports-toast-pill" role="status">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <span className="projects-freshness">Data as of today 08:42 AM PHT</span>
                        <ThemeToggle />
                        <button
                            type="button"
                            className="citizen-reports-icon-button"
                            onClick={() => showToast('Refreshed administrative registry and permission cache.')}
                            aria-label="Refresh admin"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </header>

                {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

                {/* Tabs Bar (Image 4 Panel 4) */}
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
                            <UserPlus size={14} /> Invite official
                        </button>
                        <button
                            type="button"
                            className="gov-btn-secondary"
                            onClick={() => showToast('Permission change review queue: 0 pending emergency overrides.')}
                        >
                            <ShieldCheck size={14} /> Review permission change
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
                                placeholder="Search staff by name, official ID, role, or division..."
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

                        <div className="records-filter-group">
                            <label className="records-filter-label" htmlFor="filter-mfa">
                                <Smartphone size={12} /> MFA Status:
                            </label>
                            <select
                                id="filter-mfa"
                                value={mfaFilter}
                                onChange={(e) => setMfaFilter(e.target.value)}
                                className="records-select"
                            >
                                <option value="all">All staff</option>
                                <option value="on">MFA Enabled (On)</option>
                                <option value="off">MFA Disabled (Off)</option>
                            </select>
                        </div>
                    </div>
                )}

                <main className="admin-main">
                    {activeTab === 'staff' ? (
                        /* ── PANEL 4: PEOPLE AND ROLES ─────────────────────────────── */
                        <div className="admin-layout-split">
                            <div className="admin-table-wrapper">
                                <table className="records-table" aria-label="Staff directory table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Official ID</th>
                                            <th>Account state</th>
                                            <th>Plantilla / Role</th>
                                            <th>Scope</th>
                                            <th>MFA / Session</th>
                                            <th>Last access (PHT)</th>
                                            <th>Delegation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOfficials.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--gov-text-secondary)' }}>
                                                    <Users size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
                                                    No staff members matching criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOfficials.map((off) => {
                                                const isSelected = off.id === selectedOfficial.id;
                                                return (
                                                    <tr
                                                        key={off.id}
                                                        className={isSelected ? 'is-selected' : ''}
                                                        onClick={() => updateParam('user', String(off.id))}
                                                        style={{ cursor: 'pointer' }}
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                updateParam('user', String(off.id));
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
                                                                        <div style={{ fontSize: 11, color: 'var(--gov-text-secondary)' }}>{off.office}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="records-cell-mono" style={{ color: 'var(--gov-action)' }}>
                                                            {off.official_id}
                                                        </td>
                                                        <td>
                                                            <span className={`gov-state-badge is-${off.account_state.toLowerCase() === 'active' ? 'completed' : 'assigned'}`}>
                                                                {off.account_state}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <strong style={{ color: 'var(--gov-text)' }}>{off.role}</strong>
                                                        </td>
                                                        <td>{off.scope}</td>
                                                        <td>
                                                            <span
                                                                className={`admin-mfa-badge is-${off.mfa_enabled ? 'on' : 'off'}`}
                                                            >
                                                                <Smartphone size={11} /> {off.mfa}
                                                            </span>
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{off.last_access}</td>
                                                        <td style={{ color: 'var(--gov-text-secondary)' }}>{off.delegation}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Right Rail Role & Capability Editor (Image 4 Panel 4) */}
                            {selectedOfficial && (
                                <aside className="admin-editor-card">
                                    <div className="admin-editor-header">
                                        <div className="records-docket-signal-cut" />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3>Role and capability editor (before → after)</h3>
                                            <span className="admin-editor-sub">
                                                Governed role transition & granular capability diff
                                            </span>
                                        </div>
                                    </div>

                                    {/* Official Summary */}
                                    <div className="records-meta-grid">
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Official:</span>
                                            <span className="records-meta-value">
                                                {selectedOfficial.name} ({selectedOfficial.official_id})
                                            </span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Email:</span>
                                            <span className="records-meta-value">{selectedOfficial.email}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Office / Division:</span>
                                            <span className="records-meta-value">{selectedOfficial.office}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Scope:</span>
                                            <span className="records-meta-value">{selectedOfficial.scope}</span>
                                        </div>
                                    </div>

                                    {/* Role Mutation Row (Before → After) */}
                                    <div className="admin-role-diff-box">
                                        <div className="admin-role-from">
                                            <span className="admin-role-diff-label">Current role</span>
                                            <strong className="admin-role-text">{selectedOfficial.role}</strong>
                                        </div>
                                        <ArrowRight size={18} className="admin-role-arrow" />
                                        <div className="admin-role-to">
                                            <span className="admin-role-diff-label">New role target</span>
                                            <select
                                                value={selectedRole}
                                                onChange={(e) => setSelectedRole(e.target.value)}
                                                className="admin-role-select"
                                                aria-label="Select new role"
                                            >
                                                <option value="Senior Engineer">Senior Engineer</option>
                                                <option value="Division Chief">Division Chief</option>
                                                <option value="Project Engineer">Project Engineer</option>
                                                <option value="City Engineer">City Engineer</option>
                                                <option value="Field Technician">Field Technician</option>
                                                <option value="Lead Auditor">Lead Auditor</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Required Reason Input */}
                                    <div>
                                        <label className="admin-field-label" htmlFor="role-reason">
                                            Required business justification / reason:
                                        </label>
                                        <input
                                            id="role-reason"
                                            type="text"
                                            className="admin-input-field"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="e.g. Project requires senior sign-off"
                                        />
                                    </div>

                                    {/* Affected Capabilities Diff Matrix */}
                                    <div className="admin-diff-container">
                                        <div className="records-section-label" style={{ marginBottom: 6 }}>
                                            <Sliders size={12} style={{ display: 'inline', marginRight: 4 }} />
                                            Affected capabilities diff:
                                        </div>
                                        <table className="admin-diff-table" aria-label="Capabilities diff table">
                                            <thead>
                                                <tr>
                                                    <th>Capability</th>
                                                    <th>Before</th>
                                                    <th>After</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>Approve work orders</td>
                                                    <td className="admin-diff-before">{currentRoleCap.approve_wo}</td>
                                                    <td className="admin-diff-after">{targetRoleCap.approve_wo}</td>
                                                </tr>
                                                <tr>
                                                    <td>Modify design packages</td>
                                                    <td className="admin-diff-before">{currentRoleCap.modify_design}</td>
                                                    <td className="admin-diff-after">{targetRoleCap.modify_design}</td>
                                                </tr>
                                                <tr>
                                                    <td>Access cost estimates & BoQ</td>
                                                    <td className="admin-diff-before">{currentRoleCap.cost_estimates}</td>
                                                    <td className="admin-diff-after">{targetRoleCap.cost_estimates}</td>
                                                </tr>
                                                <tr>
                                                    <td>Audit trail & governance</td>
                                                    <td className="admin-diff-before">{currentRoleCap.audit_stream}</td>
                                                    <td className="admin-diff-after">{targetRoleCap.audit_stream}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Impact Scope Summary Pill */}
                                    <div className="admin-impact-pill">
                                        <Layers size={13} style={{ flexShrink: 0, color: 'var(--gov-action)' }} />
                                        <span>{targetRoleCap.impact_scope}</span>
                                    </div>

                                    {/* Mandatory Audit Note */}
                                    <div>
                                        <label className="admin-field-label" htmlFor="audit-note-field">
                                            Audit justification note (Required for compliance logging) *
                                        </label>
                                        <textarea
                                            id="audit-note-field"
                                            rows={2}
                                            required
                                            className="admin-input-field"
                                            style={{ height: 'auto', padding: '8px 10px' }}
                                            value={auditNote}
                                            onChange={(e) => setAuditNote(e.target.value)}
                                            placeholder="Provide official administrative rationale..."
                                        />
                                    </div>

                                    {/* Action Triggers */}
                                    <div className="admin-editor-actions">
                                        <button
                                            type="button"
                                            className="gov-btn-secondary"
                                            onClick={() => setIsPreviewModalOpen(true)}
                                        >
                                            Preview changes
                                        </button>
                                        <button
                                            type="button"
                                            className="gov-btn-primary"
                                            onClick={handleSubmitChange}
                                        >
                                            <Check size={14} /> Submit change
                                        </button>
                                    </div>
                                </aside>
                            )}
                        </div>
                    ) : activeTab === 'residents' ? (
                        /* ── PANEL: RESIDENT ACCOUNTS ─────────────────────────────── */
                        <div className="insights-section-card">
                            <div className="insights-card-header">
                                <div>
                                    <h3>Resident Account Controls & Verification Registry</h3>
                                    <p className="insights-card-sub">Identity verification tiers, barangay distribution, report quotas, and privacy controls</p>
                                </div>
                            </div>
                            <div className="records-table-wrapper">
                                <table className="records-table">
                                    <thead>
                                        <tr>
                                            <th>Resident ID</th>
                                            <th>Full Name</th>
                                            <th>Barangay</th>
                                            <th>Verification Tier</th>
                                            <th>Total Reports</th>
                                            <th>Active Reports</th>
                                            <th>MFA Security</th>
                                            <th>Account Status</th>
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
                                    <h3>System Policies & Governance Thresholds</h3>
                                    <p className="insights-card-sub">Retention periods, statutory SLA windows, and automated cryptographic backup parameters</p>
                                </div>
                            </div>
                            <div className="admin-settings-grid">
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Statutory SLA Default Window</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>Maximum response and triage threshold before automated escalation</p>
                                    </div>
                                    <span className="admin-setting-badge">24 Hours (High) / 48 Hours (Standard)</span>
                                </div>
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Document Retention Policy</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>Statutory holding timeline before scheduled archivist review</p>
                                    </div>
                                    <span className="admin-setting-badge">7 Years (Mandatory)</span>
                                </div>
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Immutable Audit Stream Ledger</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>SHA-256 block hashing and continuous correlation chaining</p>
                                    </div>
                                    <span className="admin-setting-badge is-active">Active (Enforced)</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── PANEL: AGENT ACCESS GOVERNANCE ──────────────────────── */
                        <div className="insights-section-card">
                            <div className="insights-card-header">
                                <div>
                                    <h3>Agent Governance & Autonomous Triage Boundaries</h3>
                                    <p className="insights-card-sub">AI assistance policies, confidence cutoff thresholds, and mandatory human-in-the-loop triggers</p>
                                </div>
                            </div>
                            <div className="admin-settings-grid">
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Triage Recommendation Model</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>Generates category and severity suggestions for citizen reports</p>
                                    </div>
                                    <span className="admin-setting-badge is-active">Advisory Mode (Human Confirmation Required)</span>
                                </div>
                                <div className="admin-setting-row">
                                    <div>
                                        <strong>Predictive Risk Model (v1.0)</strong>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gov-text-secondary)' }}>Drainage anomaly forecast and asset risk scoring</p>
                                    </div>
                                    <span className="admin-setting-badge is-active">Active · Bi-weekly Forecast</span>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Preview Changes Modal */}
            {isPreviewModalOpen && (
                <div className="records-modal-overlay" role="dialog" aria-modal="true">
                    <div className="records-modal-card">
                        <div className="records-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                    Confirm RBAC Capability Mutation
                                </h3>
                                <div style={{ fontSize: 12, color: 'var(--gov-text-secondary)', marginTop: 2 }}>
                                    Target Official: {selectedOfficial.name} ({selectedOfficial.official_id})
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
                            <div className="admin-role-diff-box">
                                <div>
                                    <span className="admin-role-diff-label">Current role</span>
                                    <strong>{selectedOfficial.role}</strong>
                                </div>
                                <ArrowRight size={18} className="admin-role-arrow" />
                                <div>
                                    <span className="admin-role-diff-label">Target role</span>
                                    <strong style={{ color: 'var(--gov-action)' }}>{selectedRole}</strong>
                                </div>
                            </div>

                            <table className="admin-diff-table" style={{ marginTop: 12 }}>
                                <thead>
                                    <tr>
                                        <th>Capability</th>
                                        <th>Before</th>
                                        <th>After</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Approve work orders</td>
                                        <td className="admin-diff-before">{currentRoleCap.approve_wo}</td>
                                        <td className="admin-diff-after">{targetRoleCap.approve_wo}</td>
                                    </tr>
                                    <tr>
                                        <td>Modify design packages</td>
                                        <td className="admin-diff-before">{currentRoleCap.modify_design}</td>
                                        <td className="admin-diff-after">{targetRoleCap.modify_design}</td>
                                    </tr>
                                    <tr>
                                        <td>Access cost estimates & BoQ</td>
                                        <td className="admin-diff-before">{currentRoleCap.cost_estimates}</td>
                                        <td className="admin-diff-after">{targetRoleCap.cost_estimates}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ marginTop: 12, padding: '10px', background: 'var(--gov-canvas)', borderRadius: 6, fontSize: 12 }}>
                                <strong>Logged Audit Note:</strong>
                                <p style={{ margin: '4px 0 0', color: 'var(--gov-text-secondary)' }}>{auditNote}</p>
                            </div>
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
                                className="gov-btn-primary"
                                onClick={handleSubmitChange}
                            >
                                <Check size={14} /> Commit Role Mutation & Log Audit Event
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Official Modal */}
            {isInviteModalOpen && (
                <div className="records-modal-overlay" role="dialog" aria-modal="true">
                    <form className="records-modal-card" onSubmit={handleInviteSubmit}>
                        <div className="records-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                    Invite Government Staff Official
                                </h3>
                                <div style={{ fontSize: 12, color: 'var(--gov-text-secondary)', marginTop: 2 }}>
                                    Issue official credentials with mandatory MFA requirement and division scoping.
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
                                        Full official name *
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
                                        Official government email *
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
                                        <label className="records-form-label" htmlFor="invite-role">
                                            Plantilla / Role
                                        </label>
                                        <select
                                            id="invite-role"
                                            className="records-form-input"
                                            value={inviteForm.role}
                                            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                        >
                                            <option value="Engineer II">Engineer II</option>
                                            <option value="Senior Engineer">Senior Engineer</option>
                                            <option value="Technician II">Technician II</option>
                                            <option value="Project Engineer">Project Engineer</option>
                                            <option value="Division Chief">Division Chief</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="records-form-label" htmlFor="invite-office">
                                            Office / Division
                                        </label>
                                        <select
                                            id="invite-office"
                                            className="records-form-input"
                                            value={inviteForm.office}
                                            onChange={(e) => setInviteForm({ ...inviteForm, office: e.target.value })}
                                        >
                                            <option value="Field Operations Team">Field Operations Team</option>
                                            <option value="Quality & Inspection Division">Quality & Inspection Division</option>
                                            <option value="Survey & Planning Division">Survey & Planning Division</option>
                                            <option value="Depot Fleet Operations">Depot Fleet Operations</option>
                                            <option value="Project Delivery Office">Project Delivery Office</option>
                                        </select>
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
                                className="gov-btn-primary"
                            >
                                <UserPlus size={14} /> Send Official Invitation & Issue Credentials
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
