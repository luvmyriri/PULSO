import React, { useEffect, useRef, useState } from 'react';
import { Truck, X } from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import './modal-dialogs.css';

export default function AssignWorkOrderModal({ isOpen, onClose, report, onSubmit }) {
    const [title, setTitle] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [assignees, setAssignees] = useState([]);
    const [priority, setPriority] = useState('normal');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const retryRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        setTitle(report ? `Work order for ${report.ticket_id || `report #${report.id}`}` : '');
        retryRef.current = null;
        setAssigneeId('');
        setReason('');
        setError('');
        setLoading(true);
        const controller = new AbortController();
        fetch(`${API_BASE_URL}/api/gov/dispatch/eligible-assignees`, {
            headers: { Authorization: `Bearer ${getAuthToken()}` },
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) throw new Error(`Unable to load eligible staff (HTTP ${response.status})`);
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error('Eligible staff response is invalid');
                setAssignees(data);
            })
            .catch((cause) => {
                if (cause.name !== 'AbortError') setError(cause.message || 'Unable to load eligible staff');
            })
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, [isOpen, report?.id, report?.ticket_id, reload]);

    if (!isOpen) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        if (!assigneeId) {
            setError('Choose an eligible field official.');
            return;
        }
        setSubmitting(true);
        try {
            const command = {
                reportId: report?.id || null,
                title: title.trim(),
                assigned_to_id: Number(assigneeId),
                priority,
                reason: reason.trim(),
            };
            const fingerprint = JSON.stringify(command);
            if (!retryRef.current || retryRef.current.fingerprint !== fingerprint) {
                retryRef.current = { fingerprint, key: crypto.randomUUID() };
            }
            await onSubmit({ ...command, idempotencyKey: retryRef.current.key });
            retryRef.current = null;
            onClose();
        } catch (cause) {
            setError(cause.message || 'Could not create the work order. Retry after checking the record.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="gov-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <div className="gov-sheet-drawer" role="dialog" aria-modal="true" aria-labelledby="assign-wo-title">
                <div className="gov-sheet-header">
                    <div className="gov-sheet-title-row">
                        <Truck size={18} className="gov-modal-icon-blue" aria-hidden="true" />
                        <h3 id="assign-wo-title">{report ? 'Assign work order' : 'Create work order'}</h3>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="gov-sheet-form">
                    {report && <div className="gov-sheet-field-group"><span className="gov-modal-label">Source report</span><div className="gov-modal-read-box">{report.ticket_id || `Report #${report.id}`}</div></div>}
                    <div className="gov-sheet-field-group">
                        <label htmlFor="assign-wo-name" className="gov-modal-label">Work order title</label>
                        <input id="assign-wo-name" className="gov-modal-input" value={title} onChange={(event) => setTitle(event.target.value)} required />
                    </div>
                    <div className="gov-sheet-field-group">
                        <label htmlFor="assign-team" className="gov-modal-label">Assigned field official</label>
                        <select id="assign-team" className="gov-modal-select" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} required disabled={loading || assignees.length === 0}>
                            <option value="">{loading ? 'Loading eligible staff…' : 'Choose an official'}</option>
                            {assignees.map((person) => <option key={person.id} value={person.id}>{person.full_name} · {person.role.replaceAll('_', ' ')}</option>)}
                        </select>
                        {!loading && !error && assignees.length === 0 && <p>No active eligible field official is available. Contact an administrator.</p>}
                    </div>
                    <div className="gov-sheet-field-group">
                        <label htmlFor="assign-priority" className="gov-modal-label">Priority</label>
                        <select id="assign-priority" className="gov-modal-select" value={priority} onChange={(event) => setPriority(event.target.value)}>
                            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
                        </select>
                    </div>
                    <div className="gov-sheet-field-group">
                        <label htmlFor="assign-reason" className="gov-modal-label">Assignment reason</label>
                        <textarea id="assign-reason" className="gov-modal-textarea" value={reason} onChange={(event) => setReason(event.target.value)} required rows={3} />
                    </div>
                    {error && <p role="alert">{error} {assignees.length === 0 && <button type="button" onClick={() => setReload((count) => count + 1)}>Retry</button>}</p>}
                    <div className="gov-sheet-footer">
                        <button type="button" className="gov-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="gov-btn-primary" disabled={submitting || loading || assignees.length === 0}>{submitting ? 'Creating…' : 'Create work order'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
