import React, { useState } from 'react';
import { CheckCircle2, FileText, ShieldAlert, X } from '../../icons';
import './modal-dialogs.css';

const DISCIPLINES = [
    { key: 'arch', label: 'Architectural Review (Sec. 302 PD 1096)' },
    { key: 'civil', label: 'Civil / Structural Engineering Review' },
    { key: 'elec', label: 'Electrical Engineering Review (PEC)' },
    { key: 'sani', label: 'Sanitary / Plumbing Review (NPCP)' },
    { key: 'mech', label: 'Mechanical Engineering Review (PSME)' },
];

export default function OboTechnicalReviewModal({ isOpen, onClose, inspection, onSubmit }) {
    const [department, setDepartment] = useState('arch');
    const [status, setStatus] = useState('approved');
    const [remarks, setRemarks] = useState('');

    if (!isOpen || !inspection) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            oboId: inspection.id,
            department,
            status,
            remarks,
        });
        onClose();
    };

    return (
        <div className="gov-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="obo-tech-review-title">
            <div className="gov-modal-card" style={{ maxWidth: 520 }}>
                <div className="gov-modal-header">
                    <div>
                        <h3 id="obo-tech-review-title">Technical discipline evaluation (PD 1096)</h3>
                        <p>
                            {inspection.obo_number} — {inspection.applicant_name}
                        </p>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="gov-modal-form">
                    <div className="gov-form-group">
                        <label htmlFor="obo-dept-select">
                            <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Engineering discipline:
                        </label>
                        <select
                            id="obo-dept-select"
                            className="gov-form-select"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                        >
                            {DISCIPLINES.map((d) => (
                                <option key={d.key} value={d.key}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="gov-form-group">
                        <label>Technical determination:</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                            <button
                                type="button"
                                className={`gov-btn-secondary${status === 'approved' ? ' is-active' : ''}`}
                                style={{
                                    borderColor: status === 'approved' ? '#059669' : 'var(--gov-rule)',
                                    background: status === 'approved' ? 'rgba(16, 185, 129, 0.12)' : 'var(--gov-surface)',
                                    color: status === 'approved' ? '#059669' : 'var(--gov-text)',
                                    fontWeight: 700,
                                }}
                                onClick={() => setStatus('approved')}
                            >
                                <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 4 }} />
                                Approved / Cleared
                            </button>
                            <button
                                type="button"
                                className={`gov-btn-secondary${status === 'rejected' ? ' is-active' : ''}`}
                                style={{
                                    borderColor: status === 'rejected' ? '#dc2626' : 'var(--gov-rule)',
                                    background: status === 'rejected' ? 'rgba(220, 38, 38, 0.12)' : 'var(--gov-surface)',
                                    color: status === 'rejected' ? '#dc2626' : 'var(--gov-text)',
                                    fontWeight: 700,
                                }}
                                onClick={() => setStatus('rejected')}
                            >
                                <ShieldAlert size={16} style={{ display: 'inline', marginRight: 4 }} />
                                Revisions Required
                            </button>
                        </div>
                    </div>

                    <div className="gov-form-group">
                        <label htmlFor="obo-eval-remarks">
                            Evaluator notes / compliance conditions:
                        </label>
                        <textarea
                            id="obo-eval-remarks"
                            rows={3}
                            className="gov-form-textarea"
                            placeholder="State technical basis, calculations reviewed, reference sheets, or specific revisions required..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                    </div>

                    <div className="gov-modal-actions">
                        <button type="button" className="gov-btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="gov-btn-primary">
                            Submit technical evaluation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
