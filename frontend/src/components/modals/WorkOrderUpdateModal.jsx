import React, { useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, FileText, UploadCloud, Wrench, X } from 'lucide-react';
import './modal-dialogs.css';

export default function WorkOrderUpdateModal({ isOpen, onClose, workOrder, onSubmit }) {
    const [status, setStatus] = useState('in_progress');
    const [comment, setComment] = useState('');
    const [blockerReason, setBlockerReason] = useState('');
    const [safetyPlan, setSafetyPlan] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !workOrder) return null;

    const woIdentifier = workOrder.wo_number || `WO-2026-${String(workOrder.id).padStart(4, '0')}`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit({
                workOrderId: workOrder.id,
                status,
                comment: comment.trim(),
                blockerReason: status === 'blocked' ? blockerReason : null,
                safetyPlan: status === 'blocked' ? safetyPlan : null,
                imageUrl: imageUrl.trim() || null,
            });
            onClose();
        } catch (err) {
            console.error('Failed to submit work order update', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="gov-sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="wo-update-title">
            <div className="gov-sheet-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="gov-sheet-header">
                    <div className="gov-sheet-title-row">
                        <Wrench size={18} className="gov-modal-icon-blue" />
                        <h3 id="wo-update-title">Add field update</h3>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close sheet">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="gov-sheet-form">
                    <div className="gov-sheet-field-group">
                        <label className="gov-modal-label">Work Order</label>
                        <div className="gov-modal-read-box">
                            <strong>{woIdentifier}</strong> — {workOrder.title || 'Engineering field task'}
                        </div>
                    </div>

                    <div className="gov-sheet-field-group">
                        <label htmlFor="wo-status" className="gov-modal-label">Update status to</label>
                        <select
                            id="wo-status"
                            className="gov-modal-select"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            required
                        >
                            <option value="in_progress">In progress (Field work active)</option>
                            <option value="blocked">Blocked (Awaiting clearance, equipment, or weather)</option>
                            <option value="completed">Completed (Work finished, ready for inspection/review)</option>
                        </select>
                    </div>

                    {status === 'blocked' && (
                        <div className="gov-blocker-section">
                            <div className="gov-sheet-field-group">
                                <label htmlFor="blocker-reason" className="gov-modal-label">
                                    <AlertTriangle size={14} className="text-amber-500 inline mr-1" />
                                    Blocker reason (required)
                                </label>
                                <select
                                    id="blocker-reason"
                                    className="gov-modal-select"
                                    value={blockerReason}
                                    onChange={(e) => setBlockerReason(e.target.value)}
                                    required
                                >
                                    <option value="">Select blocker category</option>
                                    <option value="traffic_safety">Awaiting traffic management / safety plan</option>
                                    <option value="heavy_equipment">Heavy equipment / excavator needed</option>
                                    <option value="weather_delay">Severe flooding / inclement weather</option>
                                    <option value="utility_coordination">Awaiting electric / water utility shutdown</option>
                                    <option value="right_of_way">Right-of-way / private property obstruction</option>
                                </select>
                            </div>

                            <div className="gov-sheet-field-group">
                                <label htmlFor="safety-plan" className="gov-modal-label">Mitigation / Action plan</label>
                                <input
                                    id="safety-plan"
                                    type="text"
                                    className="gov-modal-input"
                                    placeholder="e.g. Requested traffic coordination from North Caloocan TPMO"
                                    value={safetyPlan}
                                    onChange={(e) => setSafetyPlan(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="gov-sheet-field-group">
                        <label htmlFor="wo-comment" className="gov-modal-label">Progress notes & observations (required)</label>
                        <textarea
                            id="wo-comment"
                            className="gov-modal-textarea"
                            rows={3}
                            placeholder="Describe field operations conducted, measurements taken, or material deployed..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            required
                        />
                    </div>

                    <div className="gov-sheet-field-group">
                        <label htmlFor="wo-image" className="gov-modal-label">
                            <Camera size={14} className="inline mr-1" />
                            Field Photo Evidence URL (optional)
                        </label>
                        <input
                            id="wo-image"
                            type="url"
                            className="gov-modal-input"
                            placeholder="https://... (or local upload photo URL)"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                        />
                        <span className="gov-modal-subtext">True-color photo will appear in the Field Evidence aperture card.</span>
                    </div>

                    <div className="gov-sheet-footer">
                        <button type="button" className="gov-btn-secondary" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="gov-btn-primary" disabled={submitting || !comment.trim()}>
                            {submitting ? 'Saving update...' : 'Submit field update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
