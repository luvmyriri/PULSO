import { useRef, useState } from 'react';
import { GovConfirm } from '../government/GovWorkspace';
import { useInspectionSave } from './useInspectionSave';

export default function OboNewApplicationModal({ onClose, onSubmit, barangays = [] }) {
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [address, setAddress] = useState('');
    const [barangay, setBarangay] = useState('');
    const [type, setType] = useState('');
    const [report, setReport] = useState('');
    const form = useRef(null);
    const save = useInspectionSave(onSubmit, onClose);
    return <GovConfirm open title="Register inspection application" onClose={onClose} busy={save.busy} error={save.error} confirmLabel="Register application" onConfirm={() => form.current.requestSubmit()}>
        <form className="gov-form" ref={form} onSubmit={e => { e.preventDefault(); save.submit({ applicant_name: name, applicant_contact: contact || null, property_address: address, barangay_id: Number(barangay), inspection_type: type, source_report_id: report ? Number(report) : null }); }}>
            <label className="gov-field">Applicant name<input required value={name} onChange={e => setName(e.target.value)} disabled={save.busy} /></label>
            <label className="gov-field">Contact details (optional)<input value={contact} onChange={e => setContact(e.target.value)} disabled={save.busy} /></label>
            <label className="gov-field">Property address<input required value={address} onChange={e => setAddress(e.target.value)} disabled={save.busy} /></label>
            <label className="gov-field">Barangay<select required value={barangay} onChange={e => setBarangay(e.target.value)} disabled={save.busy}><option value="">Choose barangay</option>{barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label className="gov-field">Inspection type<select required value={type} onChange={e => setType(e.target.value)} disabled={save.busy}><option value="">Choose type</option><option value="building">Building / structural</option><option value="electrical">Electrical</option><option value="mechanical">Mechanical</option></select></label>
            <label className="gov-field">Source report record ID (optional)<input type="number" min="1" step="1" value={report} onChange={e => setReport(e.target.value)} disabled={save.busy} /></label>
        </form>
    </GovConfirm>;
}
