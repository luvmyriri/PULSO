import { useRef, useState } from 'react';
import { GovConfirm } from '../government/GovWorkspace';
import { useInspectionSave } from './useInspectionSave';

export default function OboTechnicalReviewModal({ onClose, inspection, onSubmit }) {
    const [department, setDepartment] = useState('');
    const [status, setStatus] = useState('');
    const [remarks, setRemarks] = useState('');
    const form = useRef(null);
    const save = useInspectionSave(onSubmit, onClose);
    return <GovConfirm open title="Record technical review" onClose={onClose} busy={save.busy} error={save.error} confirmLabel="Save review" onConfirm={() => form.current.requestSubmit()}>
        <p>{inspection.obo_number} · {inspection.applicant_name}</p>
        <form className="gov-form" ref={form} onSubmit={e => { e.preventDefault(); save.submit({ oboId: inspection.id, department, status, remarks }); }}>
            <label className="gov-field">Discipline<select required value={department} onChange={e => setDepartment(e.target.value)} disabled={save.busy}><option value="">Choose discipline</option>{[['arch','Architectural'],['civil','Civil / structural'],['elec','Electrical'],['sani','Sanitary / plumbing'],['mech','Mechanical']].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="gov-field">Review outcome<select required value={status} onChange={e => setStatus(e.target.value)} disabled={save.busy}><option value="">Choose outcome</option><option value="approved">Approved</option><option value="rejected">Revisions required</option></select></label>
            <label className="gov-field">Review notes<textarea required minLength={10} maxLength={4000} rows={4} value={remarks} onChange={e => setRemarks(e.target.value)} disabled={save.busy} /></label>
        </form>
    </GovConfirm>;
}
