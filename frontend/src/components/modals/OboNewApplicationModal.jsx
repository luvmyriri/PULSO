import React, { useState } from 'react';
import { Building2, FilePlus, MapPin, Phone, User, X } from '../../icons';
import './modal-dialogs.css';

const BARANGAYS = [
    'Barangay 165',
    'Barangay 166',
    'Barangay 167',
    'Barangay 168',
    'Barangay 170',
    'Barangay 171',
    'Barangay 172',
    'Barangay 176',
    'Barangay 183',
];

export default function OboNewApplicationModal({ isOpen, onClose, onSubmit }) {
    const [applicantName, setApplicantName] = useState('');
    const [applicantContact, setApplicantContact] = useState('');
    const [propertyAddress, setPropertyAddress] = useState('');
    const [barangay, setBarangay] = useState('Barangay 176');
    const [inspectionType, setInspectionType] = useState('building');
    const [sourceReportId, setSourceReportId] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            applicant_name: applicantName,
            applicant_contact: applicantContact,
            property_address: propertyAddress,
            barangay,
            inspection_type: inspectionType,
            source_report_id: sourceReportId ? Number(sourceReportId) : null,
        });
        onClose();
    };

    return (
        <div className="gov-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="obo-new-app-title">
            <div className="gov-modal-card" style={{ maxWidth: 540 }}>
                <div className="gov-modal-header">
                    <div>
                        <h3 id="obo-new-app-title">File new OBO inspection application</h3>
                        <p>Office of the Building Official — North Caloocan</p>
                    </div>
                    <button type="button" className="gov-modal-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="gov-modal-form">
                    <div className="gov-form-group">
                        <label htmlFor="obo-app-name">
                            <User size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Applicant / Property owner name:
                        </label>
                        <input
                            id="obo-app-name"
                            type="text"
                            className="gov-form-input"
                            placeholder="e.g. Maria Santos / ABC Construction Corp."
                            value={applicantName}
                            onChange={(e) => setApplicantName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="gov-form-group">
                        <label htmlFor="obo-app-contact">
                            <Phone size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Contact number / email:
                        </label>
                        <input
                            id="obo-app-contact"
                            type="text"
                            className="gov-form-input"
                            placeholder="e.g. 0917-123-4567 or contact@owner.ph"
                            value={applicantContact}
                            onChange={(e) => setApplicantContact(e.target.value)}
                        />
                    </div>

                    <div className="gov-form-group">
                        <label htmlFor="obo-prop-address">
                            <MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Property address:
                        </label>
                        <input
                            id="obo-prop-address"
                            type="text"
                            className="gov-form-input"
                            placeholder="e.g. Lot 12 Blk 4, Camarin Rd., North Caloocan"
                            value={propertyAddress}
                            onChange={(e) => setPropertyAddress(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="gov-form-group">
                            <label htmlFor="obo-brgy-select">Barangay:</label>
                            <select
                                id="obo-brgy-select"
                                className="gov-form-select"
                                value={barangay}
                                onChange={(e) => setBarangay(e.target.value)}
                            >
                                {BARANGAYS.map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="gov-form-group">
                            <label htmlFor="obo-type-select">
                                <Building2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                                Inspection type:
                            </label>
                            <select
                                id="obo-type-select"
                                className="gov-form-select"
                                value={inspectionType}
                                onChange={(e) => setInspectionType(e.target.value)}
                            >
                                <option value="building">Building / Structural</option>
                                <option value="electrical">Electrical Wiring & Load</option>
                                <option value="mechanical">Mechanical & HVAC</option>
                                <option value="sanitary">Sanitary & Plumbing</option>
                            </select>
                        </div>
                    </div>

                    <div className="gov-form-group">
                        <label htmlFor="obo-source-report">
                            <FilePlus size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Linked citizen report ID (optional, for complaints):
                        </label>
                        <input
                            id="obo-source-report"
                            type="number"
                            className="gov-form-input"
                            placeholder="e.g. 822"
                            value={sourceReportId}
                            onChange={(e) => setSourceReportId(e.target.value)}
                        />
                    </div>

                    <div className="gov-modal-actions">
                        <button type="button" className="gov-btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="gov-btn-primary">
                            Register OBO application
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
