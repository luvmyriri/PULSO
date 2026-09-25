import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ShieldAlert, Truck, X } from 'lucide-react';
import { formatTicketId } from '../../utils/reportWorkflow';
import './modal-dialogs.css';

const ELIGIBLE_TEAMS = [
    { id: 'field_ops_a', name: 'Field Operations Team A (Road & Pothole Crew)', lead: 'Ana Reyes (Engineer II)', capacity: 'Available (2 active jobs)' },
    { id: 'field_ops_b', name: 'Field Operations Team B (Drainage & Flood Crew)', lead: 'Miguel Santos (Foreman)', capacity: 'Available (1 active job)' },
    { id: 'field_ops_c', name: 'Field Operations Team C (Electrical & Hazard Crew)', lead: 'Jose Dela Cruz (Technician)', capacity: 'Optimal (0 active jobs)' },
    { id: 'design_team', name: 'Engineering Design & Survey Team', lead: 'Luis Morales (Senior Engineer)', capacity: 'Available (3 active jobs)' },
    { id: 'obo_inspectors', name: 'OBO Building & Safety Inspection Unit', lead: 'Ramon Cruz (Inspector)', capacity: 'Available' },
];

export default function AssignWorkOrderModal({ isOpen, onClose, report, onSubmit }) {
    const [directTitle, setDirectTitle] = useState('');
    const [directLocation, setDirectLocation] = useState('North Caloocan');
    const [team, setTeam] = useState('field_ops_a');
    const [priority, setPriority] = useState('normal');
    const [reason, setReason] = useState('Public safety & city maintenance repair');
    const [notifyOwner, setNotifyOwner] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const reportIdentifier = report ? formatTicketId(report.ticket_id, report.id, true) : null;
    const selectedTeamObj = ELIGIBLE_TEAMS.find((t) => t.id === team) || ELIGIBLE_TEAMS[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit({
                reportId: report?.id || null,
                team: selectedTeamObj.name,
                lead: selectedTeamObj.lead,
                priority,
                reason,
                notifyOwner,
                location: report ? (report.address || `Brgy. ${report.barangay || 'North Caloocan'}`) : directLocation,
                title: report
                    ? `Work Order for ${reportIdentifier}: ${report.issue_category || report.title || 'City Maintenance'}`
                    : (directTitle || 'Civil engineering maintenance order'),
                description: reason,
            });
            onClose();
        } catch (err) {
            console.error('Failed to assign work order', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="gov-sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="assign-wo-title">
            <div className="gov-sheet-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="gov-sheet-header">
                    <div className="gov-sheet-title-row">
                        <Truck size={18} className="gov-modal-icon-blue" />
                        <h3 id="assign-wo-title">{report ? 'Assign work order' : 'Create new work order'}</h3>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close sheet">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="gov-sheet-form">
                    {report ? (
                        <div className="gov-sheet-field-group">
                            <label className="gov-modal-label">Source report</label>
                            <div className="gov-modal-read-box">
                                <strong>{reportIdentifier}</strong> — {report.issue_category || report.title || 'Reported city issue'}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="gov-sheet-field-group">
                                <label htmlFor="assign-wo-name" className="gov-modal-label">Work Order Title (required)</label>
                                <input
                                    id="assign-wo-name"
                                    type="text"
                                    className="gov-modal-input"
                                    value={directTitle}
                                    onChange={(e) => setDirectTitle(e.target.value)}
                                    placeholder="e.g., Road repair and asphalt repatching"
                                    required
                                />
                            </div>
                            <div className="gov-sheet-field-group">
                                <label htmlFor="assign-wo-loc" className="gov-modal-label">Location / Barangay</label>
                                <input
                                    id="assign-wo-loc"
                                    type="text"
                                    className="gov-modal-input"
                                    value={directLocation}
                                    onChange={(e) => setDirectLocation(e.target.value)}
                                    placeholder="e.g., Barangay 178, Camarin Road"
                                />
                            </div>
                        </>
                    )}

                    <div className="gov-sheet-field-group">
                        <label htmlFor="assign-team" className="gov-modal-label">Eligible team (required)</label>
                        <select
                            id="assign-team"
                            className="gov-modal-select"
                            value={team}
                            onChange={(e) => setTeam(e.target.value)}
                            required
                        >
                            {ELIGIBLE_TEAMS.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} — {t.capacity}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="gov-sheet-field-group">
                        <label htmlFor="assign-priority" className="gov-modal-label">Priority (required)</label>
                        <select
                            id="assign-priority"
                            className="gov-modal-select"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            required
                        >
                            <option value="low">Low (Standard SLA 72h)</option>
                            <option value="normal">Normal (Standard SLA 48h)</option>
                            <option value="high">High (Urgent SLA 24h)</option>
                            <option value="critical">Critical (Immediate response &lt; 4h)</option>
                        </select>
                    </div>

                    <div className="gov-sheet-field-group">
                        <label htmlFor="assign-reason" className="gov-modal-label">Reason / Justification</label>
                        <input
                            id="assign-reason"
                            type="text"
                            className="gov-modal-input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Operational reason for assignment..."
                            required
                        />
                    </div>

                    <div className="gov-sheet-field-group">
                        <label className="gov-modal-label">Next owner</label>
                        <div className="gov-modal-read-box">
                            <strong>{selectedTeamObj.name}</strong>
                            <span className="gov-modal-subtext">Team Lead: {selectedTeamObj.lead}</span>
                        </div>
                    </div>

                    <div className="gov-checkbox-row">
                        <input
                            type="checkbox"
                            id="notify-owner"
                            checked={notifyOwner}
                            onChange={(e) => setNotifyOwner(e.target.checked)}
                        />
                        <label htmlFor="notify-owner" className="gov-checkbox-label">
                            <strong>Send assignment notification</strong>
                            <span>Message will include report summary, coordinates, and photo evidence.</span>
                        </label>
                    </div>

                    <div className="gov-sheet-footer">
                        <button type="button" className="gov-btn-secondary" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="gov-btn-primary" disabled={submitting}>
                            {submitting ? 'Dispatching...' : 'Dispatch work order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
