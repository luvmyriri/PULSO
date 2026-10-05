import { useState } from 'react';
import { X } from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import './modal-dialogs.css';

export default function WorkOrderCompletionModal({ workOrder, onClose, onSubmitted }) {
    const [image, setImage] = useState(null);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!workOrder) return null;

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        if (!image || !notes.trim()) {
            setError('A proof image and completion notes are required.');
            return;
        }
        const body = new FormData();
        body.append('image', image);
        body.append('notes', notes.trim());
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/gov/work-orders/${workOrder.id}/completion-evidence`, {
                method: 'POST', headers: { Authorization: `Bearer ${getAuthToken()}` }, body,
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.detail || `Proof submission failed (HTTP ${response.status})`);
            }
            onSubmitted();
            onClose();
        } catch (cause) {
            setError(cause.message || 'Proof submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="gov-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
            <div className="gov-sheet-drawer" role="dialog" aria-modal="true" aria-labelledby="completion-modal-title">
                <div className="gov-sheet-header">
                    <h3 id="completion-modal-title">Submit completion proof</h3>
                    <button type="button" className="gov-modal-close" onClick={onClose} disabled={submitting} aria-label="Close dialog"><X size={18} /></button>
                </div>
                <form onSubmit={submit} className="gov-sheet-form">
                    <p>{workOrder.wo_number || `Order #${workOrder.id}`} · {workOrder.title}</p>
                    <p>This sends the work order to an independent inspector. The resident report remains open until review passes.</p>
                    <div className="gov-sheet-field-group">
                        <label htmlFor="completion-image" className="gov-modal-label">Completion photo</label>
                        <input id="completion-image" className="gov-modal-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} required />
                    </div>
                    <div className="gov-sheet-field-group">
                        <label htmlFor="completion-notes" className="gov-modal-label">Work completed and proof context</label>
                        <textarea id="completion-notes" className="gov-modal-textarea" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} required />
                    </div>
                    {error && <p role="alert">{error}</p>}
                    <div className="gov-sheet-footer">
                        <button type="button" className="gov-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="gov-btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Send for review'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
