import React, { useState } from 'react';
import { Calendar, Clock, UserCheck, X } from '../../icons';
import './modal-dialogs.css';

const AVAILABLE_INSPECTORS = [
    { id: 101, name: 'Engr. Ramon Cruz (Senior Building Inspector)', specialty: 'Civil / Structural' },
    { id: 102, name: 'Engr. Marga Dela Cruz (Electrical Inspector)', specialty: 'Electrical Systems' },
    { id: 103, name: 'Engr. Luis Morales (Mechanical Inspector)', specialty: 'HVAC & Mechanical' },
    { id: 104, name: 'Engr. Ana Reyes (Sanitary Inspector)', specialty: 'Plumbing & Drainage' },
];

export default function OboScheduleModal({ isOpen, onClose, inspection, onSubmit }) {
    const [inspectorId, setInspectorId] = useState(inspection?.assigned_inspector_id || 101);
    const [inspectionDate, setInspectionDate] = useState(() => {
        if (inspection?.inspection_date) {
            return new Date(inspection.inspection_date).toISOString().slice(0, 16);
        }
        return new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16);
    });
    const [notes, setNotes] = useState('');

    if (!isOpen || !inspection) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const selectedInsp = AVAILABLE_INSPECTORS.find((i) => i.id === Number(inspectorId));
        onSubmit({
            oboId: inspection.id,
            assigned_inspector_id: Number(inspectorId),
            assigned_inspector_name: selectedInsp?.name || 'Assigned Inspector',
            inspection_date: new Date(inspectionDate).toISOString(),
            status: 'inspection_scheduled',
            notes,
        });
        onClose();
    };

    return (
        <div className="gov-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="obo-schedule-title">
            <div className="gov-modal-card" style={{ maxWidth: 500 }}>
                <div className="gov-modal-header">
                    <div>
                        <h3 id="obo-schedule-title">Schedule OBO site inspection</h3>
                        <p>
                            {inspection.obo_number} — {inspection.applicant_name} ({inspection.inspection_type})
                        </p>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="gov-modal-form">
                    <div className="gov-form-group">
                        <label htmlFor="obo-insp-select">
                            <UserCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Assigned building / safety inspector:
                        </label>
                        <select
                            id="obo-insp-select"
                            className="gov-form-select"
                            value={inspectorId}
                            onChange={(e) => setInspectorId(e.target.value)}
                            required
                        >
                            {AVAILABLE_INSPECTORS.map((insp) => (
                                <option key={insp.id} value={insp.id}>
                                    {insp.name} — {insp.specialty}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="gov-form-group">
                        <label htmlFor="obo-insp-date">
                            <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Inspection date & target time window:
                        </label>
                        <input
                            id="obo-insp-date"
                            type="datetime-local"
                            className="gov-form-input"
                            value={inspectionDate}
                            onChange={(e) => setInspectionDate(e.target.value)}
                            required
                        >
                        </input>
                    </div>

                    <div className="gov-form-group">
                        <label htmlFor="obo-insp-notes">
                            <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Inspection scope & special instructions:
                        </label>
                        <textarea
                            id="obo-insp-notes"
                            rows={3}
                            className="gov-form-textarea"
                            placeholder="e.g. Conduct structural verification of load-bearing columns and setback compliance along property line..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="gov-modal-actions">
                        <button type="button" className="gov-btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="gov-btn-primary">
                            Confirm inspection schedule
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
