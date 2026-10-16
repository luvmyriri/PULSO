import React, { useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    X,
    Unlock
} from '../../icons';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import './modal-dialogs.css';

export default function GovBlockerModal({ isOpen, onClose, workOrder, isResolving = false, onUpdated }) {
    const [reasonCode, setReasonCode] = useState('weather');
    const [delayDays, setDelayDays] = useState(1);
    const [notes, setNotes] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen || !workOrder) return null;

    const token = getAuthToken();
    const woIdentifier = workOrder.wo_number || `WO-2026-${String(workOrder.id).padStart(4, '0')}`;

    const handleBlockSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders/${workOrder.id}/block`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    reason_code: reasonCode,
                    delay_days: parseFloat(delayDays) || 1.0,
                    notes: notes.trim(),
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Failed to block work order (HTTP ${res.status})`);
            }

            const data = await res.json();
            if (onUpdated) onUpdated(data);
            onClose();
        } catch (err) {
            setErrorMessage(err.message || 'Failed to submit blocker report.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnblockSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders/${workOrder.id}/unblock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    resolution_notes: resolutionNotes.trim() || 'Blocker resolved; resumed execution.',
                    next_status: 'in_progress',
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Failed to unblock work order (HTTP ${res.status})`);
            }

            const data = await res.json();
            if (onUpdated) onUpdated(data);
            onClose();
        } catch (err) {
            setErrorMessage(err.message || 'Failed to resume work order.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="gov-sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="blocker-modal-title">
            <div className="gov-sheet-drawer" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
                <div className="gov-sheet-header">
                    <div className="gov-sheet-title-row">
                        {isResolving ? (
                            <Unlock size={20} className="gov-modal-icon-blue" />
                        ) : (
                            <AlertTriangle size={20} style={{ color: '#d97706' }} />
                        )}
                        <div>
                            <h3 id="blocker-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                                {isResolving ? 'Resolve Operational Blocker' : 'Report Work Order Blocker'}
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--gov-text-secondary, #64748b)' }}>
                                Order {woIdentifier} · Caloocan City Engineering Office
                            </p>
                        </div>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close dialog">
                        <X size={18} />
                    </button>
                </div>

                {errorMessage && (
                    <div style={{
                        margin: '16px 24px 0',
                        padding: '10px 14px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        color: '#dc2626',
                        fontSize: '12px'
                    }}>
                        {errorMessage}
                    </div>
                )}

                {isResolving ? (
                    <form onSubmit={handleUnblockSubmit} className="gov-sheet-form">
                        <div className="gov-sheet-field-group">
                            <label className="gov-modal-label">Current Active Blocker</label>
                            <div className="gov-modal-read-box">
                                <div style={{ fontWeight: 600, fontSize: '13px', color: '#b45309' }}>
                                    Reason: {workOrder.blocker_reason || workOrder.blocker || 'Operational impediment'}
                                </div>
                                {workOrder.blocker_notes && (
                                    <div style={{ fontSize: '12px', color: 'var(--gov-text-secondary)', marginTop: '4px' }}>
                                        {workOrder.blocker_notes}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="gov-sheet-field-group">
                            <label htmlFor="unblock-notes" className="gov-modal-label">
                                <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Resolution Details / Resumption Notes
                            </label>
                            <textarea
                                id="unblock-notes"
                                className="gov-modal-textarea"
                                rows={3}
                                placeholder="Explain how the impediment was cleared (e.g. weather cleared, traffic permit approved, equipment arrived)..."
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                required
                            />
                        </div>

                        <div className="gov-sheet-actions">
                            <button
                                type="button"
                                className="gov-modal-btn-cancel"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="gov-modal-btn-submit"
                                disabled={submitting}
                                style={{
                                    background: 'var(--gov-action-strong, #0b4f6c)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 18px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: submitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {submitting ? 'Resuming...' : 'Clear Blocker & Resume Work'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleBlockSubmit} className="gov-sheet-form">
                        <div className="gov-sheet-field-group">
                            <label htmlFor="blocker-category" className="gov-modal-label">Blocker Reason Code</label>
                            <select
                                id="blocker-category"
                                className="gov-modal-select"
                                value={reasonCode}
                                onChange={(e) => setReasonCode(e.target.value)}
                                required
                            >
                                <option value="weather">Inclement Weather / Flooding Delay</option>
                                <option value="traffic_safety">Traffic Safety / Road Closure Clearance Needed</option>
                                <option value="heavy_equipment">Heavy Equipment / Machinery Dispatched</option>
                                <option value="utility_coordination">Utility Coordination (Meralco / Maynilad Interruption)</option>
                                <option value="right_of_way">Right of Way / Private Property Obstruction</option>
                                <option value="materials_shortage">Materials / Concrete Mix Delivery Shortage</option>
                            </select>
                        </div>

                        <div className="gov-sheet-field-group">
                            <label htmlFor="delay-days" className="gov-modal-label">
                                <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Estimated Work Delay (in days)
                            </label>
                            <input
                                id="delay-days"
                                type="number"
                                min="0.5"
                                max="60"
                                step="0.5"
                                className="gov-modal-input"
                                value={delayDays}
                                onChange={(e) => setDelayDays(e.target.value)}
                                required
                            />
                        </div>

                        <div className="gov-sheet-field-group">
                            <label htmlFor="blocker-detail" className="gov-modal-label">
                                <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Blocker Explanation & Mitigation Plan
                            </label>
                            <textarea
                                id="blocker-detail"
                                className="gov-modal-textarea"
                                rows={3}
                                placeholder="Describe the physical condition preventing execution and what actions are being taken..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                required
                            />
                        </div>

                        <div className="gov-sheet-actions">
                            <button
                                type="button"
                                className="gov-modal-btn-cancel"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="gov-modal-btn-submit"
                                disabled={submitting}
                                style={{
                                    background: '#d97706',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 18px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: submitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {submitting ? 'Logging Blocker...' : 'Flag as Blocked'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
