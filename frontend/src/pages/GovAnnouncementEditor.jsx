import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Megaphone,
    Save,
    Send,
    FileText,
    Globe,
    Radio,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import './citizen-reports.css';

export default function GovAnnouncementEditor() {
    const navigate = useNavigate();
    const token = getAuthToken();
    const [user] = useState(() => getAuthUser());

    const [activeLangTab, setActiveLangTab] = useState('en'); // 'en' | 'fil'
    const [titleEn, setTitleEn] = useState('');
    const [contentEn, setContentEn] = useState('');
    const [titleFil, setTitleFil] = useState('');
    const [contentFil, setContentFil] = useState('');
    const [category, setCategory] = useState('roadworks');
    const [priority, setPriority] = useState('normal');
    const [barangayScope, setBarangayScope] = useState('all');
    const [targetBarangay, setTargetBarangay] = useState('171');

    // Channels
    const [channels, setChannels] = useState({
        web: true,
        mobile: true,
        sms: false,
        email: false
    });

    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const toggleChannel = (ch) => {
        setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));
    };

    const handleSubmit = async (submitStatus = 'draft') => {
        setErrorMessage('');
        if (!titleEn.trim() || !contentEn.trim()) {
            setErrorMessage('English title and content are required.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/announcements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title_en: titleEn.trim(),
                    content_en: contentEn.trim(),
                    title_fil: titleFil.trim() || null,
                    content_fil: contentFil.trim() || null,
                    category,
                    priority,
                    target_scope: barangayScope,
                    target_barangay: barangayScope === 'specific' ? targetBarangay : null,
                    channels_json: channels
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Failed to create advisory (HTTP ${res.status})`);
            }

            const created = await res.json();

            // If user clicked Submit for Review or Publish immediately, update status
            if (submitStatus !== 'draft') {
                await fetch(`${API_BASE_URL}/api/gov/announcements/${created.id}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: submitStatus })
                });
            }

            navigate('/gov/announcements');
        } catch (err) {
            setErrorMessage(err.message || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="citizen-reports-page">
            <GovSidebar currentUser={user} />
            <div className="citizen-reports-shell">
                <header className="citizen-reports-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/gov/announcements')}
                            className="citizen-reports-back-button"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--gov-text-secondary)',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600
                            }}
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Announcements</span>
                        </button>
                        <span style={{ color: 'var(--gov-rule)' }}>|</span>
                        <div className="flex flex-col text-left">
                            <GovBreadcrumb items={[
                                { label: 'Home', to: '/gov/dashboard' },
                                { label: 'Public Information', to: '/gov/announcements' },
                                { label: 'Advisories', to: '/gov/announcements' },
                                { label: 'Draft Advisory' }
                            ]} />
                            <h1 className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">Draft Governed Advisory</h1>
                        </div>
                    </div>

                    <div className="citizen-reports-topbar__actions">
                        <ThemeToggle />
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={user} />
                    </div>
                </header>

                <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '24px 32px 80px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
                    {errorMessage && (
                        <div style={{
                            marginBottom: '16px',
                            padding: '12px 16px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            color: '#dc2626',
                            fontSize: '13px'
                        }}>
                            {errorMessage}
                        </div>
                    )}

                    <div style={{ background: 'var(--gov-surface)', border: '1px solid var(--gov-rule)', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Dual Language Tabs */}
                        <div>
                            <label className="gov-modal-label" style={{ marginBottom: '8px', display: 'block' }}>
                                Language Edition
                            </label>
                            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--gov-rule)', paddingBottom: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveLangTab('en')}
                                    style={{
                                        padding: '6px 14px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        border: activeLangTab === 'en' ? '1px solid #ff6b00' : '1px solid transparent',
                                        background: activeLangTab === 'en' ? 'rgba(255, 107, 0, 0.1)' : 'transparent',
                                        color: activeLangTab === 'en' ? '#ff6b00' : 'var(--gov-text-secondary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    English (Primary)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveLangTab('fil')}
                                    style={{
                                        padding: '6px 14px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        border: activeLangTab === 'fil' ? '1px solid #ff6b00' : '1px solid transparent',
                                        background: activeLangTab === 'fil' ? 'rgba(255, 107, 0, 0.1)' : 'transparent',
                                        color: activeLangTab === 'fil' ? '#ff6b00' : 'var(--gov-text-secondary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Filipino (Salin)
                                </button>
                            </div>
                        </div>

                        {/* Language Fields */}
                        {activeLangTab === 'en' ? (
                            <>
                                <div className="gov-sheet-field-group">
                                    <label className="gov-modal-label">Advisory Headline (English) *</label>
                                    <input
                                        type="text"
                                        className="gov-modal-input"
                                        placeholder="e.g. Scheduled Road Maintenance on Camarin Road"
                                        value={titleEn}
                                        onChange={(e) => setTitleEn(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="gov-sheet-field-group">
                                    <label className="gov-modal-label">Advisory Notice Body (English) *</label>
                                    <textarea
                                        className="gov-modal-textarea"
                                        rows={5}
                                        placeholder="Explain the civil works, affected areas, temporary lane closures, alternative routes, and expected restoration..."
                                        value={contentEn}
                                        onChange={(e) => setContentEn(e.target.value)}
                                        required
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="gov-sheet-field-group">
                                    <label className="gov-modal-label">Pamagat ng Pabatid (Filipino)</label>
                                    <input
                                        type="text"
                                        className="gov-modal-input"
                                        placeholder="hal. Nakatakdang Pagkukumpuni ng Kalsada sa Camarin Road"
                                        value={titleFil}
                                        onChange={(e) => setTitleFil(e.target.value)}
                                    />
                                </div>

                                <div className="gov-sheet-field-group">
                                    <label className="gov-modal-label">Nilalaman ng Pabatid (Filipino)</label>
                                    <textarea
                                        className="gov-modal-textarea"
                                        rows={5}
                                        placeholder="Ipaliwanag ang isinasagawang gawaing pambayan, apektadong kalsada, at alternatibong ruta para sa mga motorista..."
                                        value={contentFil}
                                        onChange={(e) => setContentFil(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {/* Classification & Scope */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                            <div className="gov-sheet-field-group">
                                <label className="gov-modal-label">Category</label>
                                <select
                                    className="gov-modal-select"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="roadworks">Roadworks & Street Maintenance</option>
                                    <option value="drainage">Drainage Clearing & Flood Mitigation</option>
                                    <option value="public_safety">Public Safety & Utility Hazard</option>
                                    <option value="service_interruption">Service / Water Interruption</option>
                                    <option value="general_notice">General Municipal Notice</option>
                                </select>
                            </div>

                            <div className="gov-sheet-field-group">
                                <label className="gov-modal-label">Priority Tone</label>
                                <select
                                    className="gov-modal-select"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    <option value="normal">Normal Public Information</option>
                                    <option value="urgent">Urgent Operational Advisory</option>
                                    <option value="emergency">Emergency Public Safety</option>
                                </select>
                            </div>
                        </div>

                        {/* Distribution Channels */}
                        <div>
                            <label className="gov-modal-label" style={{ marginBottom: '8px', display: 'block' }}>
                                Broadcast Channels
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                                {[
                                    { key: 'web', label: 'Resident Web Portal' },
                                    { key: 'mobile', label: 'Mobile App Feed' },
                                    { key: 'sms', label: 'SMS Blast (Gov Alpha)' },
                                    { key: 'email', label: 'Subscribed Email' }
                                ].map((ch) => (
                                    <label
                                        key={ch.key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 12px',
                                            border: '1px solid var(--gov-rule)',
                                            borderRadius: '6px',
                                            background: channels[ch.key] ? 'rgba(11, 79, 108, 0.05)' : 'transparent',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={channels[ch.key]}
                                            onChange={() => toggleChannel(ch.key)}
                                            style={{ accentColor: 'var(--gov-action, #0b4f6c)' }}
                                        />
                                        <span>{ch.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--gov-rule)' }}>
                            <button
                                type="button"
                                onClick={() => handleSubmit('draft')}
                                disabled={submitting}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: 'var(--gov-surface)',
                                    color: 'var(--gov-text)',
                                    border: '1px solid var(--gov-rule)',
                                    borderRadius: '6px',
                                    cursor: submitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <Save size={14} /> Save Draft
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSubmit('in_review')}
                                disabled={submitting}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: 'rgba(255, 107, 0, 0.08)',
                                    color: '#ff6b00',
                                    border: '1px solid rgba(255, 107, 0, 0.4)',
                                    borderRadius: '8px',
                                    cursor: submitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Submit for Review
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSubmit('published')}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#ff6b00] hover:bg-[#e65c00] transition-all shadow-md shadow-orange-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={14} /> {submitting ? 'Publishing...' : 'Publish Advisory'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
