import { useRef, useState } from 'react';
import { GovConfirm } from '../government/GovWorkspace';
import { useInspectionSave } from './useInspectionSave';

export default function OboFindingsModal({ onClose, inspection, onSubmit }) {
    const [compliance, setCompliance] = useState(inspection.is_compliant == null ? '' : String(inspection.is_compliant));
    const [findings, setFindings] = useState(inspection.findings || '');
    const [concerns, setConcerns] = useState(inspection.violation_details || '');
    const form = useRef(null);
    const save = useInspectionSave(onSubmit, onClose);
    return <GovConfirm open title="Record inspection findings" onClose={onClose} busy={save.busy} error={save.error} confirmLabel="Save findings" onConfirm={() => form.current.requestSubmit()}>
        <p>{inspection.obo_number} · {inspection.property_address}</p>
        <form className="gov-form" ref={form} onSubmit={e => { e.preventDefault(); save.submit({ oboId: inspection.id, findings, is_compliant: compliance === 'true', violation_details: compliance === 'false' ? concerns : null, status: 'inspection_complete' }); }}>
            <label className="gov-field">Findings<textarea required rows={4} value={findings} onChange={e => setFindings(e.target.value)} disabled={save.busy} /></label>
            <label className="gov-field">Compliance assessment<select required value={compliance} onChange={e => setCompliance(e.target.value)} disabled={save.busy}><option value="">Choose after inspection</option><option value="true">Compliant</option><option value="false">Compliance concerns found</option></select></label>
            {compliance === 'false' && <label className="gov-field">Observed concerns<textarea required rows={3} value={concerns} onChange={e => setConcerns(e.target.value)} disabled={save.busy} /></label>}
        </form>
    </GovConfirm>;
}
