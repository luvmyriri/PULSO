import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, FileCheck, FileImage, X } from '../../icons';
import './modal-dialogs.css';

export default function OboFindingsModal({ isOpen, onClose, inspection, onSubmit }) {
    const [isCompliant, setIsCompliant] = useState(inspection?.is_compliant !== false);
    const [findings, setFindings] = useState(inspection?.findings || '');
    const [violationDetails, setViolationDetails] = useState(inspection?.violation_details || '');
    const [evidenceUrl, setEvidenceUrl] = useState(inspection?.evidence_url || '');

    if (!isOpen || !inspection) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            oboId: inspection.id,
            findings,
            is_compliant: isCompliant,
            violation_details: !isCompliant ? violationDetails : null,
            status: isCompliant ? 'inspection_complete' : 'notice_issued',
            evidence_url: evidenceUrl || null,
        });
        onClose();
    };

    return (
        <div className="gov-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="obo-findings-title">
            <div className="gov-modal-card" style={{ maxWidth: 540 }}>
                <div className="gov-modal-header">
                    <div>
                        <h3 id="obo-findings-title">Record inspection findings & compliance</h3>
                        <p>
                            {inspection.obo_number} — {inspection.property_address}
                        </p>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="gov-modal-form">
                    <div className="gov-form-group">
                        <label>Compliance determination:</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                            <button
                                type="button"
                                className={`gov-btn-secondary${isCompliant ? ' is-active' : ''}`}
                                style={{
                                    borderColor: isCompliant ? '#059669' : 'var(--gov-rule)',
                                    background: isCompliant ? 'rgba(16, 185, 129, 0.12)' : 'var(--gov-surface)',
                                    color: isCompliant ? '#059669' : 'var(--gov-text)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                }}
                                onClick={() => setIsCompliant(true)}
                            >
                                <CheckCircle size={16} /> Compliant (Passed)
                            </button>
                            <button
                                type="button"
                                className={`gov-btn-secondary${!isCompliant ? ' is-active' : ''}`}
                                style={{
                                    borderColor: !isCompliant ? '#dc2626' : 'var(--gov-rule)',
                                    background: !isCompliant ? 'rgba(220, 38, 38, 0.12)' : 'var(--gov-surface)',
                                    color: !isCompliant ? '#dc2626' : 'var(--gov-text)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                }}
                                onClick={() => setIsCompliant(false)}
                            >
                                <AlertTriangle size={16} /> Non-compliant (Violations)
                            </button>
                        </div>
                    </div>

                    <div className="gov-form-group">
                        <label htmlFor="obo-findings-text">
                            <FileCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Technical inspection findings:
                        </label>
                        <textarea
                            id="obo-findings-text"
                            rows={3}
                            className="gov-form-textarea"
                            placeholder="Detailed observations on structural integrity, electrical wiring, setbacks, clearances, and National Building Code compliance..."
                            value={findings}
                            onChange={(e) => setFindings(e.target.value)}
                            required
                        />
                    </div>

                    {!isCompliant && (
                        <div className="gov-form-group">
                            <label htmlFor="obo-violations-text" style={{ color: '#dc2626' }}>
                                <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />
                                Violation details & required corrective actions:
                            </label>
                            <textarea
                                id="obo-violations-text"
                                rows={3}
                                className="gov-form-textarea"
                                style={{ borderColor: 'rgba(220, 38, 38, 0.4)' }}
                                placeholder="Specify exact code violations (e.g. Sec. 301 Building without permit, setback obstruction < 1.5m) and mandatory rectification period..."
                                value={violationDetails}
                                onChange={(e) => setViolationDetails(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="gov-form-group">
                        <label htmlFor="obo-evidence-url">
                            <FileImage size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Inspection photo evidence URL:
                        </label>
                        <input
                            id="obo-evidence-url"
                            type="url"
                            className="gov-form-input"
                            placeholder="https://..."
                            value={evidenceUrl}
                            onChange={(e) => setEvidenceUrl(e.target.value)}
                        />
                    </div>

                    <div className="gov-modal-actions">
                        <button type="button" className="gov-btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="gov-btn-primary"
                            style={{ background: isCompliant ? '#059669' : '#d97706', borderColor: isCompliant ? '#059669' : '#d97706' }}
                        >
                            {isCompliant ? 'Record compliant findings' : 'Issue notice of violation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
