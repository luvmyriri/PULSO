import React, { useState } from 'react';
import { AlertCircle, HelpCircle, Send, X } from 'lucide-react';
import { formatTicketId } from '../../utils/reportWorkflow';
import './modal-dialogs.css';

export default function RequestInfoModal({ isOpen, onClose, report, onSubmit }) {
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !report) return null;

    const reportIdentifier = formatTicketId(report.ticket_id, report.id, true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason || !message.trim()) return;

        setSubmitting(true);
        try {
            await onSubmit({
                reason,
                message: message.trim(),
                reportId: report.id,
            });
            onClose();
        } catch (err) {
            console.error('Failed to submit info request', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="gov-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="req-info-title">
            <div className="gov-modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="gov-modal-header">
                    <div className="gov-modal-title-row">
                        <HelpCircle size={18} className="gov-modal-icon-blue" />
                        <h3 id="req-info-title">Request information</h3>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close dialog">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="gov-modal-form">
                    <div className="gov-modal-field-group">
                        <label className="gov-modal-label">Source report</label>
                        <div className="gov-modal-read-box">
                            <strong>{reportIdentifier}</strong> — {report.issue_category || report.title || 'Reported city issue'}
                        </div>
                    </div>

                    <div className="gov-modal-field-group">
                        <label htmlFor="req-reason" className="gov-modal-label">Reason (required)</label>
                        <select
                            id="req-reason"
                            className="gov-modal-select"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                        >
                            <option value="">Select a reason</option>
                            <option value="location_unclear">Location or landmark unclear</option>
                            <option value="additional_photos_needed">Additional clear photo evidence required</option>
                            <option value="hazard_scope_clarification">Need clarification on severity or affected area</option>
                            <option value="contact_preferred">Requesting resident on-site contact for inspection</option>
                        </select>
                    </div>

                    <div className="gov-modal-field-group">
                        <div className="gov-modal-label-row">
                            <label htmlFor="req-message" className="gov-modal-label">Message (required)</label>
                            <span className="gov-modal-char-count">{message.length}/500</span>
                        </div>
                        <textarea
                            id="req-message"
                            className="gov-modal-textarea"
                            rows={4}
                            maxLength={500}
                            placeholder="Provide details of what information is needed from the citizen..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        />
                    </div>

                    <div className="gov-modal-preview-box">
                        <span className="gov-modal-preview-label">Resident notification preview:</span>
                        <p className="gov-modal-preview-text">
                            "A request for more information has been sent regarding report <strong>{reportIdentifier}</strong>."
                        </p>
                    </div>

                    <div className="gov-modal-consequence-box">
                        <AlertCircle size={14} />
                        <span>The resident will be prompted in their dashboard and notified via SMS/email.</span>
                    </div>

                    <div className="gov-modal-footer">
                        <button type="button" className="gov-btn-secondary" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="gov-btn-primary" disabled={submitting || !reason || !message.trim()}>
                            {submitting ? 'Sending...' : 'Send request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
