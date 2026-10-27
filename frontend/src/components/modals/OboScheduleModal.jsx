import { useRef, useState } from 'react';
import { GovConfirm } from '../government/GovWorkspace';
import { useGovernmentData } from '../../utils/governmentApi';
import { useInspectionSave } from './useInspectionSave';

export default function OboScheduleModal({ onClose, inspection, onSubmit }) {
    const [inspector, setInspector] = useState(inspection.assigned_inspector_id || '');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const form = useRef(null);
    const staff = useGovernmentData(`/api/gov/obo/${inspection.id}/inspectors`);
    const save = useInspectionSave(onSubmit, onClose);
    return <GovConfirm open title="Schedule inspection" onClose={onClose} busy={save.busy} error={save.error} confirmLabel="Save schedule" onConfirm={() => form.current.requestSubmit()}>
        <p>{inspection.obo_number} · {inspection.property_address}</p>
        <form className="gov-form" ref={form} onSubmit={e => { e.preventDefault(); save.submit({ oboId: inspection.id, assigned_inspector_id: Number(inspector), inspection_date: new Date(date).toISOString(), status: inspection.status === 'notice_issued' ? 're_inspection_scheduled' : 'inspection_scheduled', notes }); }}>
            {staff.error && <p role="alert">{staff.error} <button type="button" className="gov-button" onClick={staff.reload}>Retry</button></p>}
            <label className="gov-field">Inspector<select value={inspector} onChange={e => setInspector(e.target.value)} required disabled={staff.loading || save.busy}><option value="">{staff.loading ? 'Loading inspectors…' : 'Choose inspector'}</option>{staff.data?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
            {!staff.loading && !staff.error && !staff.data?.length && <p>No eligible inspectors are available in this district. Ask an administrator to review staff access.</p>}
            <label className="gov-field">Inspection date and time<input type="datetime-local" required value={date} onChange={e => setDate(e.target.value)} disabled={save.busy} /></label>
            <label className="gov-field">Inspection instructions<textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} maxLength={4000} disabled={save.busy} /></label>
        </form>
    </GovConfirm>;
}
