import { useRef, useState } from 'react';
import { X } from '../../icons';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import './modal-dialogs.css';

export default function ApproveReportModal({ report, onClose, onApproved }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const retryRef = useRef(null);
    if (!report) return null;

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        if (reason.trim().length < 10) {
            setError('Enter at least 10 characters explaining this decision.');
            return;
        }
        setSubmitting(true);
        try {
            const trimmedReason = reason.trim();
            if (!retryRef.current || retryRef.current.reason !== trimmedReason) {
                retryRef.current = { reason: trimmedReason, key: crypto.randomUUID() };
            }
            const response = await fetch(`${API_BASE_URL}/api/gov/reports/${report.id}/approve-for-work`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}`,
                    'Idempotency-Key': retryRef.current.key,
                    ...(report.version ? { 'If-Match': String(report.version) } : {}),
                },
                body: JSON.stringify({ reason: trimmedReason }),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                if (response.status === 409) retryRef.current = null;
                throw new Error(body.detail?.next_action || (typeof body.detail === 'string' ? body.detail : `Approval failed (HTTP ${response.status})`));
            }
            const decision = await response.json();
            retryRef.current = null;
            onApproved(decision);
            onClose();
        } catch (cause) {
            setError(cause.message || 'Approval failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="gov-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
            <div className="gov-sheet-drawer" role="dialog" aria-modal="true" aria-labelledby="approve-report-title">
                <div className="gov-sheet-header">
                    <h3 id="approve-report-title">Approve report for field work</h3>
                    <button type="button" className="gov-modal-close" onClick={onClose} disabled={submitting} aria-label="Close dialog"><X size={18} /></button>
                </div>
                <form className="gov-sheet-form" onSubmit={submit}>
                    <p>{report.ticket_id || `Report #${report.id}`} · {report.title || report.category || 'Reported issue'}</p>
                    <p>Approval makes this report eligible for assignment. It does not allocate a budget or create a project.</p>
                    <div className="gov-sheet-field-group">
                        <label htmlFor="work-approval-reason" className="gov-modal-label">Decision reason</label>
                        <textarea id="work-approval-reason" className="gov-modal-textarea" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} required />
                    </div>
                    {error && <p role="alert">{error}</p>}
                    <div className="gov-sheet-footer">
                        <button type="button" className="gov-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="gov-btn-primary" disabled={submitting}>{submitting ? 'Approving…' : 'Approve for work'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
