import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    User, Mail, Phone, MapPin, ShieldCheck, KeyRound, Building2,
    Calendar, CheckCircle2, Edit3, X, AlertCircle, Shield, ArrowUpRight
} from 'lucide-react';
import { GovWorkspace, GovButton, GovConfirm, GovState, formatDate } from '../components/government/GovWorkspace';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import { clearAuthSession, getAuthToken, getAuthUser, setAuthSession } from '../utils/authSession';

function getInitials(name) {
    if (!name) return 'ST';
    const clean = name.replace(/^(engr|dr|atty|hon|mr|ms|mrs)\.?\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'ST';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function GovAccountPage() {
    const record = useGovernmentData('/api/gov/account');
    const [action, setAction] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [signedOut, setSignedOut] = useState(false);
    const form = useRef(null);
    const person = record.data;

    async function save() {
        if (!form.current.reportValidity() || busy) return;
        const values = Object.fromEntries(new FormData(form.current));
        if (action === 'password' && values.new_password !== values.confirmation) {
            setError('The new passwords do not match.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            if (action === 'profile') {
                const saved = await governmentRequest(`/api/users/${person.id}`, { method: 'PATCH', body: values });
                setAuthSession(getAuthToken(), {
                    ...getAuthUser(),
                    full_name: saved.full_name,
                    phone_number: saved.phone_number,
                    address: saved.address,
                });
                record.reload();
                setNotice('Your contact details have been updated successfully.');
            } else {
                await governmentRequest('/api/auth/change-password', {
                    method: 'PATCH',
                    body: { current_password: values.current_password, new_password: values.new_password },
                });
                clearAuthSession();
                setSignedOut(true);
            }
            setAction('');
        } catch (cause) {
            setError(cause.message);
        } finally {
            setBusy(false);
        }
    }

    if (signedOut) {
        return (
            <div className="gov-core-workspace gov-account-page">
                <main className="gov-account-sheet">
                    <h1>Your password is saved</h1>
                    <p>Your password was updated. Sign in again with your new credentials to continue.</p>
                    <Link className="gov-button is-primary" to="/gov">
                        Staff sign-in
                    </Link>
                </main>
            </div>
        );
    }

    const officialId = person?.official_id || (person?.id ? `ENG-${String(person.id).padStart(5, '0')}` : 'ENG-STAFF');
    const initials = getInitials(person?.name);

    return (
        <GovWorkspace
            title="Your account"
            description="Your staff profile, official assignment, contact details, and credentials."
            parent={{ to: '/gov/dashboard', label: 'My work' }}
        >
            <GovState loading={record.loading && !person} error={record.error} onRetry={record.reload} />

            {notice && (
                <div role="status" className="gov-account-notice">
                    <div className="gov-account-notice__content">
                        <CheckCircle2 size={16} />
                        <span>{notice}</span>
                    </div>
                    <button
                        type="button"
                        className="gov-text-button"
                        onClick={() => setNotice('')}
                        aria-label="Dismiss notification"
                    >
                        <X size={15} />
                    </button>
                </div>
            )}

            {person && !record.error && (
                <div className="gov-account-layout">
                    {/* Hero Identity Banner */}
                    <div className="gov-account-hero">
                        <div className="gov-account-hero__identity">
                            <div className="gov-account-avatar" aria-hidden="true">
                                {initials}
                            </div>
                            <div className="gov-account-meta">
                                <div className="gov-account-title-row">
                                    <h2 className="gov-account-name">{person.name}</h2>
                                    <span className="gov-account-tag">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" aria-hidden="true" />
                                        {person.status || 'Active Personnel'}
                                    </span>
                                </div>
                                <div className="gov-account-subrow">
                                    <span className="gov-account-role-badge">
                                        <ShieldCheck size={14} aria-hidden="true" />
                                        {person.friendly_role}
                                    </span>
                                    <span className="gov-account-id-badge" title="Official Government Identifier">
                                        {officialId}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                        City Engineering Department · Caloocan City
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="gov-account-hero__status">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Commissioned
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {formatDate(person.date_added)}
                            </span>
                        </div>
                    </div>

                    {/* Card 1: Official Assignment & Jurisdiction */}
                    <section className="gov-account-card" aria-labelledby="section-assignment-heading">
                        <div className="gov-account-card__header">
                            <div className="gov-account-card__title-group">
                                <div className="gov-account-card__icon" aria-hidden="true">
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <h3 id="section-assignment-heading" className="text-sm font-bold text-slate-900 dark:text-white">
                                        Official Assignment &amp; Jurisdiction
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Governed role, departmental assignment, and statutory scope of authority.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="gov-account-card__body">
                            <div className="gov-property-grid">
                                <div className="gov-property-item">
                                    <span className="gov-property-label">Official Designation</span>
                                    <span className="gov-property-value font-semibold text-slate-900 dark:text-white">
                                        {person.friendly_role}
                                    </span>
                                </div>

                                <div className="gov-property-item">
                                    <span className="gov-property-label">Department / Office</span>
                                    <span className="gov-property-value">
                                        {person.office || 'Office of the City Engineer, Caloocan City Hall'}
                                    </span>
                                </div>

                                <div className="gov-property-item">
                                    <span className="gov-property-label">Jurisdiction / District Access</span>
                                    <div className="gov-property-value">
                                        <span className="gov-property-value--badge">
                                            <Shield size={12} aria-hidden="true" />
                                            {person.scope || 'Citywide'}
                                        </span>
                                    </div>
                                </div>

                                <div className="gov-property-item">
                                    <span className="gov-property-label">Official Staff Email</span>
                                    <span className="gov-property-value font-mono text-xs">
                                        {person.email}
                                    </span>
                                </div>

                                <div className="gov-property-item is-full">
                                    <span className="gov-property-label">Governance &amp; Authority Model</span>
                                    <span className="gov-property-value text-xs text-slate-600 dark:text-slate-300">
                                        Canonical Role-Based Access Control (RBAC) enforced by the City Government of Caloocan. Permissions are bound to staff designation and jurisdictional assignment.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Card 2: Contact Details */}
                    <section className="gov-account-card" aria-labelledby="section-contact-heading">
                        <div className="gov-account-card__header">
                            <div className="gov-account-card__title-group">
                                <div className="gov-account-card__icon" aria-hidden="true">
                                    <User size={18} />
                                </div>
                                <div>
                                    <h3 id="section-contact-heading" className="text-sm font-bold text-slate-900 dark:text-white">
                                        Contact Information
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Official channels for inter-departmental dispatch, escalation, and citizen operations.
                                    </p>
                                </div>
                            </div>

                            <GovButton onClick={() => { setError(''); setAction('profile'); }}>
                                <Edit3 size={14} aria-hidden="true" />
                                Edit contact details
                            </GovButton>
                        </div>

                        <div className="gov-account-card__body">
                            <div className="gov-property-grid">
                                <div className="gov-property-item">
                                    <span className="gov-property-label">
                                        <User size={12} aria-hidden="true" /> Full Name
                                    </span>
                                    <span className="gov-property-value font-semibold">
                                        {person.name}
                                    </span>
                                </div>

                                <div className="gov-property-item">
                                    <span className="gov-property-label">
                                        <Phone size={12} aria-hidden="true" /> Contact Phone Number
                                    </span>
                                    <span className="gov-property-value font-mono">
                                        {person.phone_number || <span className="text-slate-400 italic">Not recorded</span>}
                                    </span>
                                </div>

                                <div className="gov-property-item is-full">
                                    <span className="gov-property-label">
                                        <MapPin size={12} aria-hidden="true" /> Physical / Office Address
                                    </span>
                                    <span className="gov-property-value">
                                        {person.address || <span className="text-slate-400 italic">Not recorded</span>}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Card 3: Security & Credentials */}
                    <section className="gov-account-card" aria-labelledby="section-security-heading">
                        <div className="gov-account-card__header">
                            <div className="gov-account-card__title-group">
                                <div className="gov-account-card__icon" aria-hidden="true">
                                    <KeyRound size={18} />
                                </div>
                                <div>
                                    <h3 id="section-security-heading" className="text-sm font-bold text-slate-900 dark:text-white">
                                        Security &amp; Credentials
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Staff authentication credentials, session security, and access controls.
                                    </p>
                                </div>
                            </div>

                            <GovButton onClick={() => { setError(''); setAction('password'); }}>
                                <KeyRound size={14} aria-hidden="true" />
                                Change password
                            </GovButton>
                        </div>

                        <div className="gov-account-card__body">
                            <div className="gov-property-grid">
                                <div className="gov-property-item">
                                    <span className="gov-property-label">Authentication Method</span>
                                    <span className="gov-property-value">
                                        Standard Staff Password (12+ characters required)
                                    </span>
                                </div>

                                <div className="gov-property-item">
                                    <span className="gov-property-label">Session Protection</span>
                                    <span className="gov-property-value text-xs text-slate-600 dark:text-slate-300">
                                        Changing your password signs out active sessions on all other devices and revokes unused tokens.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Modal Confirmations */}
                    <GovConfirm
                        open={Boolean(action)}
                        title={action === 'profile' ? 'Edit contact details' : 'Change staff password'}
                        confirmLabel={action === 'profile' ? 'Save details' : 'Save password & sign out'}
                        busy={busy}
                        error={error}
                        onClose={() => setAction('')}
                        onConfirm={save}
                    >
                        {action === 'password' && (
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                                Updating your password will invalidate your existing sessions. You will be redirected to sign in again immediately.
                            </p>
                        )}
                        <form key={action} ref={form} onSubmit={event => { event.preventDefault(); save(); }}>
                            {action === 'profile' ? (
                                <>
                                    <label className="gov-field">
                                        Full name
                                        <input
                                            name="full_name"
                                            required
                                            minLength={2}
                                            maxLength={150}
                                            defaultValue={person.name}
                                        />
                                    </label>
                                    <label className="gov-field">
                                        Phone number (optional)
                                        <input
                                            name="phone_number"
                                            type="tel"
                                            placeholder="09XXXXXXXXX"
                                            defaultValue={person.phone_number || ''}
                                        />
                                    </label>
                                    <label className="gov-field">
                                        Office / Physical address (optional)
                                        <textarea
                                            name="address"
                                            rows={3}
                                            defaultValue={person.address || ''}
                                        />
                                    </label>
                                </>
                            ) : (
                                <>
                                    <label className="gov-field">
                                        Current password
                                        <input
                                            name="current_password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                        />
                                    </label>
                                    <label className="gov-field">
                                        New password
                                        <input
                                            name="new_password"
                                            type="password"
                                            autoComplete="new-password"
                                            required
                                            minLength={12}
                                            maxLength={72}
                                        />
                                        <small>Must be at least 12 characters long.</small>
                                    </label>
                                    <label className="gov-field">
                                        Confirm new password
                                        <input
                                            name="confirmation"
                                            type="password"
                                            autoComplete="new-password"
                                            required
                                            minLength={12}
                                            maxLength={72}
                                        />
                                    </label>
                                </>
                            )}
                        </form>
                    </GovConfirm>
                </div>
            )}
        </GovWorkspace>
    );
}
