import React, { useState } from 'react';
import {
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    FileText,
    X,
    Clock,
    Lock
} from '../../icons';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import './modal-dialogs.css';

export default function GovInspectionModal({ isOpen, onClose, workOrder, currentUser, onVerified }) {
    const [passed, setPassed] = useState(true);
    const [notes, setNotes] = useState('');
    const [checklist, setChecklist] = useState({
        specifications: false,
        siteCleared: false,
        qualityTested: false,
        photoVerified: false,
    });
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen || !workOrder) return null;

    const token = getAuthToken();
    const woIdentifier = workOrder.wo_number || `WO-2026-${String(workOrder.id).padStart(4, '0')}`;

    // Strict Separation of Duties check:
    // The current inspector cannot be the person assigned to execute the work order
    const isSelfAssignee = currentUser && workOrder.assigned_to_id && (currentUser.id === workOrder.assigned_to_id);

    const handleChecklistChange = (key) => {
        setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (isSelfAssignee) {
            setErrorMessage('Separation of duties violation: You cannot verify a work order assigned to yourself.');
            return;
        }
        if (!notes.trim()) {
            setErrorMessage('Enter your inspection findings.');
            return;
        }
        if (passed && !Object.values(checklist).every(Boolean)) {
            setErrorMessage('Complete every inspection check before certification.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/work-orders/${workOrder.id}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    passed,
                    notes: notes.trim(),
                    checklist_results: checklist,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Verification failed with HTTP ${res.status}`);
            }

            const data = await res.json();
            if (onVerified) {
                onVerified(data);
            }
            onClose();
        } catch (err) {
            setErrorMessage(err.message || 'Failed to submit inspection verification.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="gov-sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="inspection-modal-title">
            <div className="gov-sheet-drawer" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
                <div className="gov-sheet-header">
                    <div className="gov-sheet-title-row">
                        <ShieldCheck size={20} className="gov-modal-icon-blue" />
                        <div>
                            <h3 id="inspection-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Independent Inspection Verification</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--gov-text-secondary, #64748b)' }}>
                                Order {woIdentifier} · Caloocan City Engineering Office
                            </p>
                        </div>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close dialog">
                        <X size={18} />
                    </button>
                </div>

                {/* Separation of Duties Warning if assignee attempts verification */}
                {isSelfAssignee && (
                    <div style={{
                        margin: '16px 24px 0',
                        padding: '12px 16px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                    }}>
                        <Lock size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                            <strong style={{ display: 'block', fontWeight: 600 }}>Separation of Duties Enforced</strong>
                            You are designated as the assigned field worker on this work order. City Engineering regulations prohibit field personnel from certifying their own execution. An independent inspector must review and sign off.
                        </div>
                    </div>
                )}

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

                <form onSubmit={handleSubmit} className="gov-sheet-form">
                    {/* Work Order Info Box */}
                    <div className="gov-sheet-field-group">
                        <label className="gov-modal-label">Work Order Summary</label>
                        <div className="gov-modal-read-box">
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--gov-text)' }}>
                                {workOrder.title}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--gov-text-secondary)', marginTop: '4px' }}>
                                Location: {workOrder.location_string || workOrder.barangay || 'Location unavailable'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--gov-text-secondary)', marginTop: '2px' }}>
                                Assigned to: {workOrder.assigned_team || workOrder.assigned_to_name || `Worker ID #${workOrder.assigned_to_id || 'N/A'}`}
                            </div>
                        </div>
                    </div>

                    {/* Verdict Decision: Pass vs Request Rework */}
                    <div className="gov-sheet-field-group">
                        <label className="gov-modal-label">Inspection Verdict</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => setPassed(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    border: passed ? '2px solid var(--gov-resolved, #0f766e)' : '1px solid var(--gov-rule, #cbd5e1)',
                                    background: passed ? 'rgba(15, 118, 110, 0.08)' : 'transparent',
                                    color: passed ? 'var(--gov-resolved, #0f766e)' : 'var(--gov-text-secondary, #64748b)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px'
                                }}
                            >
                                <CheckCircle2 size={18} />
                                <div style={{ textAlign: 'left' }}>
                                    <div>Accept & Certify</div>
                                    <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.8 }}>Mark order complete</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPassed(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    border: !passed ? '2px solid var(--gov-critical, #ef4444)' : '1px solid var(--gov-rule, #cbd5e1)',
                                    background: !passed ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                                    color: !passed ? 'var(--gov-critical, #ef4444)' : 'var(--gov-text-secondary, #64748b)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px'
                                }}
                            >
                                <XCircle size={18} />
                                <div style={{ textAlign: 'left' }}>
                                    <div>Request Rework</div>
                                    <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.8 }}>Punch-list fixes needed</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Explicit review checks */}
                    <div className="gov-sheet-field-group">
                        <label className="gov-modal-label">Independent Compliance Checklist</label>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            background: 'var(--gov-surface-subtle, #f8fafc)',
                            border: '1px solid var(--gov-rule, #e2e8f0)',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            marginTop: '6px'
                        }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={checklist.specifications}
                                    onChange={() => handleChecklistChange('specifications')}
                                    style={{ width: '15px', height: '15px', accentColor: 'var(--gov-action, #0b4f6c)' }}
                                />
                                <span>Civil engineering specifications and materials verified</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={checklist.siteCleared}
                                    onChange={() => handleChecklistChange('siteCleared')}
                                    style={{ width: '15px', height: '15px', accentColor: 'var(--gov-action, #0b4f6c)' }}
                                />
                                <span>Site completely cleared of construction debris and safety hazards</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={checklist.qualityTested}
                                    onChange={() => handleChecklistChange('qualityTested')}
                                    style={{ width: '15px', height: '15px', accentColor: 'var(--gov-action, #0b4f6c)' }}
                                />
                                <span>Functional / structural test passed (e.g. water flow, asphalt compaction)</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={checklist.photoVerified}
                                    onChange={() => handleChecklistChange('photoVerified')}
                                    style={{ width: '15px', height: '15px', accentColor: 'var(--gov-action, #0b4f6c)' }}
                                />
                                <span>Field photo proof confirmed at physical location</span>
                            </label>
                        </div>
                    </div>

                    {/* Inspection Notes */}
                    <div className="gov-sheet-field-group">
                        <label htmlFor="inspect-notes" className="gov-modal-label">
                            <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            Inspector Findings / Punch-List Notes
                        </label>
                        <textarea
                            id="inspect-notes"
                            className="gov-modal-textarea"
                            rows={3}
                            placeholder={passed ? "Detail the acceptance inspection results..." : "Describe required remedial works and punch list items..."}
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
                            className={`gov-modal-btn-submit ${passed ? 'is-pass' : 'is-rework'}`}
                            disabled={submitting || isSelfAssignee}
                            style={{
                                background: passed ? 'var(--gov-action-strong, #0b4f6c)' : 'var(--gov-critical, #ef4444)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 18px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: (submitting || isSelfAssignee) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {submitting ? 'Submitting...' : (passed ? 'Certify Work Order' : 'Return for Rework')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
