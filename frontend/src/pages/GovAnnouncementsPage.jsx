import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Megaphone,
    Search,
    RefreshCw,
    Plus,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Eye,
    X,
    FileText,
    Send,
    Edit3,
    Ban,
    Radio,
    Inbox,
    AlertCircle,
    Globe
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import './citizen-reports.css';

const STAGE_TABS = [
    { key: 'all', label: 'All Notices' },
    { key: 'draft', label: 'Drafts' },
    { key: 'in_review', label: 'In Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'published', label: 'Published' },
    { key: 'withdrawn', label: 'Withdrawn' }
];

export default function GovAnnouncementsPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const token = getAuthToken();
    const [user] = useState(() => getAuthUser());

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    // Modal state for withdrawal or correction
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [selectedAnn, setSelectedAnn] = useState(null);
    const [withdrawalReason, setWithdrawalReason] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);

    // Modal state for correction
    const [correctModalOpen, setCorrectModalOpen] = useState(false);
    const [correctionNote, setCorrectionNote] = useState('');
    const [correctedTitle, setCorrectedTitle] = useState('');
    const [correctedContent, setCorrectedContent] = useState('');

    const statusParam = params.get('status') || 'all';
    const searchQuery = params.get('search') || '';

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 5000);
    };

    const updateParam = (key, val) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            if (!val || val === 'all') next.delete(key);
            else next.set(key, val);
            return next;
        }, { replace: true });
    };

    const fetchAnnouncements = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentToken = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/gov/announcements`, {
                headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
            });
            if (!res.ok) throw new Error(`Failed to load announcements (HTTP ${res.status})`);
            const data = await res.json();
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Unable to connect to announcements service');
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter((ann) => {
            if (statusParam !== 'all' && ann.status !== statusParam) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const titleEn = (ann.title_en || '').toLowerCase();
                const titleFil = (ann.title_fil || '').toLowerCase();
                const cat = (ann.category || '').toLowerCase();
                return titleEn.includes(q) || titleFil.includes(q) || cat.includes(q);
            }
            return true;
        });
    }, [announcements, statusParam, searchQuery]);

    const handlePublish = async (annId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/announcements/${annId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'published' })
            });
            if (res.ok) {
                showToast('Announcement published to public portal and mobile feed.');
                fetchAnnouncements();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || 'Failed to publish announcement.');
            }
        } catch {
            showToast('Publish request failed.');
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (!selectedAnn || !withdrawalReason.trim()) return;

        setSubmittingAction(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/announcements/${selectedAnn.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'withdrawn',
                    withdrawal_reason: withdrawalReason.trim()
                })
            });

            if (res.ok) {
                showToast('Notice withdrawn and public broadcast revoked.');
                setWithdrawModalOpen(false);
                setWithdrawalReason('');
                fetchAnnouncements();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || 'Withdrawal rejected by server.');
            }
        } catch {
            showToast('Withdrawal failed.');
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleCorrect = async (e) => {
        e.preventDefault();
        if (!selectedAnn || !correctionNote.trim()) return;

        setSubmittingAction(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/announcements/${selectedAnn.id}/correct`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title_en: correctedTitle || selectedAnn.title_en,
                    content_en: correctedContent || selectedAnn.content_en,
                    correction_note: correctionNote.trim()
                })
            });

            if (res.ok) {
                showToast('Amended revision and timestamped correction notice saved.');
                setCorrectModalOpen(false);
                setCorrectionNote('');
                fetchAnnouncements();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || 'Correction rejected by server.');
            }
        } catch {
            showToast('Correction submission failed.');
        } finally {
            setSubmittingAction(false);
        }
    };

    const stageBadge = (status) => {
        const s = (status || 'draft').toLowerCase();
        let color = 'var(--gov-text-secondary)';
        let bg = 'var(--gov-surface-subtle)';
        if (s === 'published') { color = 'var(--gov-resolved, #0f766e)'; bg = 'rgba(15, 118, 110, 0.1)'; }
        else if (s === 'approved') { color = '#0284c7'; bg = 'rgba(2, 132, 199, 0.1)'; }
        else if (s === 'in_review') { color = '#8a4b08'; bg = 'rgba(138, 75, 8, 0.1)'; }
        else if (s === 'scheduled') { color = '#6366f1'; bg = 'rgba(99, 102, 241, 0.1)'; }
        else if (s === 'withdrawn') { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.1)'; }

        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                color,
                background: bg,
                textTransform: 'capitalize'
            }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                {s.replace(/_/g, ' ')}
            </span>
        );
    };

    return (
        <div className="citizen-reports-page">
            <GovSidebar currentUser={user} />
            <div className="citizen-reports-shell">
                <header className="min-h-[80px] py-3.5 sm:py-4 px-4 sm:px-6 shrink-0 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 relative z-50">
                    <div className="min-w-0 pt-1 pb-0.5">
                        <GovBreadcrumb category="Public Information" current="Governed Advisories" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">
                            Updates & Public Advisories
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5 truncate max-w-lg">
                            Governed multi-stage publishing lifecycle with dual-language support and audit logs.
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto">
                        {toastMessage && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60 text-xs font-semibold" role="status">
                                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <ThemeToggle />
                        <button
                            type="button"
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-[#ff6b00] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                            onClick={fetchAnnouncements}
                            aria-label="Refresh announcements"
                            title="Refresh announcements"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={user} />
                    </div>
                </header>

                <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '20px 24px 60px' }}>
                    {/* Stage Tabs & Create Action */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 mb-4 flex-wrap gap-3">
                        <div className="flex gap-2 sm:gap-3 overflow-x-auto custom-scrollbar py-1">
                            {STAGE_TABS.map((tab) => {
                                const isActive = statusParam === tab.key;
                                const count = tab.key === 'all'
                                    ? announcements.length
                                    : announcements.filter((a) => a.status === tab.key).length;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => updateParam('status', tab.key)}
                                        className={`py-2 px-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border-b-2 ${
                                            isActive
                                                ? 'border-[#ff6b00] text-[#ff6b00]'
                                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono-data ${
                                            isActive
                                                ? 'bg-orange-500/15 text-[#ff6b00] border border-orange-500/30 font-bold'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/gov/announcements/new')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#ff6b00] hover:bg-[#e65c00] transition-all shadow-md shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
                        >
                            <Plus size={15} /> <span>Draft Advisory</span>
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Search size={14} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search announcements by title or category..."
                            value={searchQuery}
                            onChange={(e) => updateParam('search', e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b00] transition-all shadow-xs"
                        />
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="citizen-reports-state is-error" style={{ marginBottom: '16px' }}>
                            <AlertCircle size={20} />
                            <div>
                                <strong>Unable to load announcements</strong>
                                <p>{error}</p>
                                <button type="button" onClick={fetchAnnouncements} style={{ marginTop: '8px' }}>
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="citizen-reports-list">
                            <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                            <div className="citizen-reports-skeleton"><span /><span /><span /></div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && filteredAnnouncements.length === 0 && (
                        <div className="citizen-reports-state" style={{ minHeight: '280px' }}>
                            <Inbox size={32} />
                            <div>
                                <strong>No announcements found</strong>
                                <p>No records found in stage "{statusParam}". Use "Draft Advisory" to compose a new notice.</p>
                            </div>
                        </div>
                    )}

                    {/* Announcements List */}
                    {!loading && !error && filteredAnnouncements.length > 0 && (
                        <div className="citizen-reports-list">
                            {filteredAnnouncements.map((ann) => (
                                <div
                                    key={ann.id}
                                    style={{
                                        padding: '16px 20px',
                                        borderBottom: '1px solid var(--gov-rule)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: '16px',
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    <div style={{ flex: '1 1 320px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            {stageBadge(ann.status)}
                                            <span style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', textTransform: 'uppercase' }}>
                                                {ann.category || 'General Notice'}
                                            </span>
                                            {ann.title_fil && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-[#ff6b00] border border-orange-500/20">
                                                    EN / FIL
                                                </span>
                                            )}
                                        </div>

                                        <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: 'var(--gov-text)' }}>
                                            {ann.title_en || ann.title}
                                        </h3>
                                        {ann.title_fil && (
                                            <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--gov-text-secondary)', fontStyle: 'italic' }}>
                                                "{ann.title_fil}"
                                            </p>
                                        )}

                                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--gov-text-secondary)', lineHeight: 1.5, maxWidth: '75ch' }}>
                                            {ann.content_en || ann.content}
                                        </p>

                                        {/* Correction Notice Banner if amended */}
                                        {ann.correction_note && (
                                            <div style={{
                                                marginTop: '8px',
                                                padding: '6px 10px',
                                                background: 'rgba(217, 119, 6, 0.08)',
                                                border: '1px solid rgba(217, 119, 6, 0.25)',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                color: '#b45309'
                                            }}>
                                                <strong>Correction Notice:</strong> {ann.correction_note}
                                            </div>
                                        )}

                                        {/* Withdrawal Reason if withdrawn */}
                                        {ann.withdrawal_reason && (
                                            <div style={{
                                                marginTop: '8px',
                                                padding: '6px 10px',
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                color: '#b91c1c'
                                            }}>
                                                <strong>Withdrawal Reason:</strong> {ann.withdrawal_reason}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        {ann.status !== 'published' && ann.status !== 'withdrawn' && (
                                            <button
                                                type="button"
                                                onClick={() => handlePublish(ann.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#ff6b00] hover:bg-[#e65c00] transition-all cursor-pointer shadow-xs"
                                            >
                                                <Send size={12} /> Publish
                                            </button>
                                        )}

                                        {ann.status === 'published' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAnn(ann);
                                                    setCorrectedTitle(ann.title_en || ann.title || '');
                                                    setCorrectedContent(ann.content_en || ann.content || '');
                                                    setCorrectModalOpen(true);
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '6px 12px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    background: 'var(--gov-surface)',
                                                    color: 'var(--gov-text)',
                                                    border: '1px solid var(--gov-rule)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Edit3 size={12} /> Correct
                                            </button>
                                        )}

                                        {ann.status !== 'withdrawn' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAnn(ann);
                                                    setWithdrawModalOpen(true);
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '6px 12px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    background: 'transparent',
                                                    color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Ban size={12} /> Withdraw
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Withdraw Announcement Modal */}
            {withdrawModalOpen && selectedAnn && (
                <div className="gov-sheet-backdrop" onClick={() => setWithdrawModalOpen(false)}>
                    <div className="gov-sheet-drawer" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="gov-sheet-header">
                            <div className="gov-sheet-title-row">
                                <Ban size={20} style={{ color: '#ef4444' }} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Withdraw Public Notice</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--gov-text-secondary)' }}>
                                        Notice: {selectedAnn.title_en || selectedAnn.title}
                                    </p>
                                </div>
                            </div>
                            <button type="button" className="gov-modal-close" onClick={() => setWithdrawModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleWithdraw} className="gov-sheet-form">
                            <div className="gov-sheet-field-group">
                                <label className="gov-modal-label">Mandatory Withdrawal Reason (Required by LGU Policy)</label>
                                <textarea
                                    className="gov-modal-textarea"
                                    rows={3}
                                    placeholder="Explain why this notice is being recalled or cancelled..."
                                    value={withdrawalReason}
                                    onChange={(e) => setWithdrawalReason(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="gov-sheet-actions">
                                <button
                                    type="button"
                                    className="gov-modal-btn-cancel"
                                    onClick={() => setWithdrawModalOpen(false)}
                                    disabled={submittingAction}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="gov-modal-btn-submit"
                                    disabled={submittingAction || !withdrawalReason.trim()}
                                    style={{
                                        background: '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '8px 18px',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '13px'
                                    }}
                                >
                                    {submittingAction ? 'Withdrawing...' : 'Confirm Withdrawal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Amend / Correct Modal */}
            {correctModalOpen && selectedAnn && (
                <div className="gov-sheet-backdrop" onClick={() => setCorrectModalOpen(false)}>
                    <div className="gov-sheet-drawer" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="gov-sheet-header">
                            <div className="gov-sheet-title-row">
                                <Edit3 size={20} className="gov-modal-icon-blue" />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Issue Correction Notice</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--gov-text-secondary)' }}>
                                        Amends published advisory with timestamped correction record
                                    </p>
                                </div>
                            </div>
                            <button type="button" className="gov-modal-close" onClick={() => setCorrectModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCorrect} className="gov-sheet-form">
                            <div className="gov-sheet-field-group">
                                <label className="gov-modal-label">Title (English)</label>
                                <input
                                    type="text"
                                    className="gov-modal-input"
                                    value={correctedTitle}
                                    onChange={(e) => setCorrectedTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="gov-sheet-field-group">
                                <label className="gov-modal-label">Advisory Content (English)</label>
                                <textarea
                                    className="gov-modal-textarea"
                                    rows={4}
                                    value={correctedContent}
                                    onChange={(e) => setCorrectedContent(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="gov-sheet-field-group">
                                <label className="gov-modal-label">Public Correction Note</label>
                                <textarea
                                    className="gov-modal-textarea"
                                    rows={2}
                                    placeholder="Explain the correction made (e.g. Schedule updated to 8:00 AM due to contractor reschedule)..."
                                    value={correctionNote}
                                    onChange={(e) => setCorrectionNote(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="gov-sheet-actions">
                                <button
                                    type="button"
                                    className="gov-modal-btn-cancel"
                                    onClick={() => setCorrectModalOpen(false)}
                                    disabled={submittingAction}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="gov-modal-btn-submit"
                                    disabled={submittingAction || !correctionNote.trim()}
                                    style={{
                                        background: 'var(--gov-action, #0b4f6c)',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '8px 18px',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '13px'
                                    }}
                                >
                                    {submittingAction ? 'Saving...' : 'Publish Correction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
