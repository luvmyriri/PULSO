import { useRef, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { GovWorkspace, GovButton, GovTable, GovDetail, GovState, GovConfirm } from '../components/government/GovWorkspace';
import { AdministrationTabs } from './StaffAdministrationPage';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import './role-administration.css';

// These are application capability keys and actions, not claims about LGU signing authority.
const MODULES = [
    ['overview', 'Dashboard', ['view']],
    ['reports', 'Reports queue', ['view']],
    ['report_review', 'Report review decisions', ['assign', 'intake', 'peer_transfer', 'review', 'verify', 'approve', 'reject']],
    ['work_orders', 'Work orders', ['view', 'create', 'assign', 'reassign', 'acknowledge', 'start', 'remark', 'block', 'unblock', 'submit_completion', 'verify', 'approve', 'cancel', 'refer_project']],
    ['field', 'Field workspace', ['view']],
    ['projects', 'Projects', ['view', 'manage']],
    ['maintenance', 'Assets and maintenance', ['view', 'create_work_order']],
    ['analytics', 'Analytics', ['view', 'export']],
    ['insights', 'Insights', ['view']],
    ['records', 'Records', ['view', 'create', 'edit', 'legal_hold']],
    ['announcements', 'Public updates', ['view', 'create', 'edit', 'review', 'approve', 'publish', 'withdraw', 'correct']],
    ['obo', 'OBO', ['view', 'create', 'edit']],
    ['procurement', 'Financial history', ['view', 'manage']],
    ['verification', 'Independent verification', ['view', 'verify']],
    ['referrals', 'External referrals', ['view', 'create', 'review', 'reroute']],
    ['admin', 'Administration', ['staff_view', 'staff_manage', 'residents_view', 'residents_manage', 'settings_view', 'settings_manage', 'audit_view']],
];
const MODULE_KEYS = new Set(MODULES.map(([key]) => key));
const emptyRole = () => ({ name: '', label: '', access_level: 'staff', capabilities: Object.fromEntries(MODULES.map(([key]) => [key, []])) });
const copy = value => structuredClone(value);
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export default function RoleAdministrationPage() {
    const roles = useGovernmentData('/api/gov/roles');
    const templates = useGovernmentData('/api/gov/roles/templates');
    const access = useGovernmentData('/api/admin/access');
    const [selectedId, setSelectedId] = useState(null);
    const [draft, setDraft] = useState(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [templateId, setTemplateId] = useState('');
    const [grantModes, setGrantModes] = useState({});
    const form = useRef(null);
    const trigger = useRef(null);
    const selected = roles.data?.find(role => role.id === selectedId);
    const canManage = Boolean(access.data?.can_manage_roles);

    function begin(role = null) {
        setDraft(role ? copy(role) : emptyRole());
        setTemplateId('');
        setGrantModes({});
        setReason('');
        setError('');
    }
    function close() {
        setDraft(null);
        requestAnimationFrame(() => trigger.current?.focus());
    }
    function setModule(key, mode) {
        setGrantModes(current => ({ ...current, [key]: mode }));
        setDraft(current => {
            const capabilities = copy(current.capabilities);
            if (mode === 'inherit') delete capabilities[key];
            else capabilities[key] = mode === 'deny' ? [] : (Array.isArray(capabilities[key]) && capabilities[key].length ? capabilities[key] : []);
            return { ...current, capabilities };
        });
    }
    function toggle(key, action) {
        setDraft(current => {
            const capabilities = copy(current.capabilities);
            const values = Array.isArray(capabilities[key]) ? capabilities[key] : [];
            capabilities[key] = values.includes(action) ? values.filter(value => value !== action) : [...values, action];
            return { ...current, capabilities };
        });
    }
    async function save() {
        if (!form.current?.reportValidity() || busy) return;
        if (reason.trim().length < 10) { setError('Explain the access change in at least 10 characters.'); return; }
        if (Object.values(draft.capabilities).some(value => !Array.isArray(value))) { setError('This role contains unsupported capability metadata. Ask an administrator to review it before editing.'); return; }
        if (Object.entries(grantModes).some(([key, mode]) => mode === 'grant' && !draft.capabilities[key]?.length)) { setError('Choose at least one action for each module set to grant.'); return; }
        setBusy(true); setError('');
        try {
            const payload = { name: draft.name.trim(), label: draft.label.trim(), access_level: draft.access_level, capabilities: draft.capabilities, reason: reason.trim() };
            if (draft.id) payload.expected_capabilities = selected?.capabilities;
            const saved = await governmentRequest(draft.id ? `/api/gov/roles/${draft.id}` : '/api/gov/roles', { method: draft.id ? 'PUT' : 'POST', body: payload });
            setSelectedId(saved.id);
            setDraft(null);
            roles.reload();
        } catch (cause) { setError(cause.status === 409 ? 'The role changed since you opened it. Refresh the role list before editing again.' : cause.message); }
        finally { setBusy(false); }
    }

    return <GovWorkspace title="Roles and permissions" description="Review staff capabilities and configure explicit access for stored roles." actions={<div className="gov-page-actions__group"><GovButton onClick={() => { roles.reload(); templates.reload(); access.reload(); }} disabled={roles.loading}><RefreshCw size={15}/> Refresh</GovButton>{canManage && <GovButton primary onClick={() => begin()}><Plus size={15}/> Create role</GovButton>}</div>}>
        <AdministrationTabs value="roles" access={access.data}/>
        <p className="gov-note">A missing module key uses the application’s existing role default. An empty grant explicitly denies that module. Report decisions and report queue visibility are separate permissions. Access also depends on jurisdiction, assignment and record state.</p>
        <GovState loading={roles.loading && !roles.data} error={roles.error || access.error || templates.error} onRetry={() => { roles.reload(); access.reload(); templates.reload(); }}/>
        {roles.data && !roles.error && <div className={`gov-record-layout ${selectedId ? 'has-detail' : ''}`}>
            <GovTable label="Stored staff roles" rows={roles.data} rowKey={role => role.id} selected={selectedId} onSelect={(role, element) => { trigger.current = element; setSelectedId(role.id); }} columns={[
                { key: 'label', label: 'Role', render: role => <>{role.label || role.name}<small>{role.name}</small></> },
                { key: 'capabilities', label: 'Explicit modules', render: role => Object.keys(role.capabilities || {}).length },
                { key: 'access_level', label: 'Access level' },
            ]} emptyMessage="No stored roles" emptyDescription="Legacy positions still use application defaults. A system administrator can create a stored role with explicit grants."/>
            {selected && <GovDetail title={selected.label || selected.name} onClose={() => setSelectedId(null)} actions={canManage && <GovButton onClick={() => begin(selected)}>Edit capabilities</GovButton>}>
                <p className="gov-note">Role key: {selected.name}. Access level: {selected.access_level}. Changes to this definition sign out staff assigned to it.</p>
                <dl className="gov-facts">{MODULES.map(([key, label]) => <div key={key} className="role-grant-line"><dt>{label}</dt><dd>{!has(selected.capabilities || {}, key) ? 'Role default' : !Array.isArray(selected.capabilities[key]) ? 'Legacy metadata: review before editing' : !selected.capabilities[key].length ? 'Explicitly denied' : selected.capabilities[key].join(', ')}</dd></div>)}</dl>
            </GovDetail>}
        </div>}
        <GovConfirm open={Boolean(draft)} title={draft?.id ? `Edit ${draft.label}` : 'Create staff role'} confirmLabel={draft?.id ? 'Save role access' : 'Create role'} busy={busy} error={error} onClose={close} onConfirm={save} className="role-editor">
            {draft && <form ref={form} onSubmit={event => { event.preventDefault(); save(); }}>
                {!draft.id && templates.data?.length > 0 && <label className="gov-field">Start from a template<select value={templateId} onChange={event => { const value = event.target.value; setTemplateId(value); setGrantModes({}); const template = templates.data.find(item => String(item.id) === value); setDraft(current => ({ ...current, capabilities: template ? copy(template.capabilities) : emptyRole().capabilities })); }}><option value="">No template: deny listed modules</option>{templates.data.map(item => <option key={item.id} value={item.id}>{item.label || item.name}</option>)}</select></label>}
                {!draft.id && <label className="gov-field">Role key<input required pattern="[a-z][a-z0-9_]{1,63}" maxLength={64} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="district_intake_reviewer"/></label>}
                <label className="gov-field">Display name<input required maxLength={120} value={draft.label || ''} onChange={event => setDraft(current => ({ ...current, label: event.target.value }))}/></label>
                <p className="gov-note">Select explicit grants. “Use role default” retains existing behavior for this role; it does not grant a new capability to a custom role. An empty grant denies access even when a legacy role normally has it.</p>
                <div className="role-editor__modules">{MODULES.map(([key, label, actions]) => {
                    const grant = draft.capabilities[key];
                    const mode = grantModes[key] || (!has(draft.capabilities, key) ? 'inherit' : !Array.isArray(grant) ? 'deny' : grant.length ? 'grant' : 'deny');
                    return <fieldset className="gov-access-choices" key={key}><legend>{label}</legend><label className="gov-field">Access rule<select value={mode} onChange={event => setModule(key, event.target.value)}><option value="inherit">Use role default</option><option value="deny">Explicitly deny</option><option value="grant">Grant selected actions</option></select></label>{mode === 'grant' && <div className="role-editor__actions">{['*', ...actions].map(action => <label key={action}><input type="checkbox" checked={Array.isArray(grant) && grant.includes(action)} onChange={() => toggle(key, action)}/>{action === '*' ? 'All actions in this module' : action.replaceAll('_', ' ')}</label>)}</div>}</fieldset>;
                })}</div>
                {Object.keys(draft.capabilities).filter(key => !MODULE_KEYS.has(key)).length > 0 && <p className="gov-note">Additional stored keys are preserved: {Object.keys(draft.capabilities).filter(key => !MODULE_KEYS.has(key)).join(', ')}.</p>}
                <label className="gov-field">Reason for access change<textarea required minLength={10} maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)}/></label>
                <p className="gov-note">This changes access for every staff member using this role. Their active sessions will be invalidated.</p>
            </form>}
        </GovConfirm>
    </GovWorkspace>;
}
