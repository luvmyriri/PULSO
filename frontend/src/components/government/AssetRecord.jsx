import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { GovButton, GovConfirm, GovDetail, GovState, GovStatus, formatDate } from './GovWorkspace';
import { governmentRequest, useGovernmentData } from '../../utils/governmentApi';
import AssetLocationPreview from '../maps/AssetLocationPreview';
import AssetInspectionPanel from './AssetInspectionPanel';
import AssetHazardContext from './AssetHazardContext';
import FieldObservationsPanel from './FieldObservationsPanel';

export default function AssetRecord({ assetId, permissions, onClose, onSaved }) {
    const record=useGovernmentData(`/api/gov/assets/${encodeURIComponent(assetId)}`);
    const context=useGovernmentData(permissions?.plan ? `/api/gov/predictive/assets/${encodeURIComponent(assetId)}/forecast?include_model=false` : null);
    const [assessing,setAssessing]=useState(false);
    const [score,setScore]=useState('');
    const [notes,setNotes]=useState('');
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [notice,setNotice]=useState('');
    const [verifying,setVerifying]=useState(false);
    const [sourceReference,setSourceReference]=useState('');
    const [maintenanceAuthority,setMaintenanceAuthority]=useState('');
    const [verifyReason,setVerifyReason]=useState('');
    const [latitude,setLatitude]=useState('');
    const [longitude,setLongitude]=useState('');
    const form=useRef(null);
    const asset=record.data;
    async function save() {
        if(!form.current.reportValidity())return;
        setBusy(true);setError('');
        try {
            await governmentRequest(`/api/gov/assets/${encodeURIComponent(assetId)}/inspections`,{method:'POST',body:{condition_score:Number(score),expected_condition_score:asset.condition_score,notes:notes.trim()}});
            setAssessing(false);setNotice('Condition assessment recorded.');record.reload();context.reload();onSaved?.();
        } catch(cause) {setError(cause.message);} finally {setBusy(false);}
    }
    async function verifyRegistry() {
        if(sourceReference.trim().length<8||maintenanceAuthority.trim().length<3||verifyReason.trim().length<10||!latitude||!longitude){setError('Record the source, maintenance authority, reason and verified coordinates.');return;}
        setBusy(true);setError('');
        try {
            await governmentRequest(`/api/gov/predictive/assets/${encodeURIComponent(assetId)}/verify-registry`,{method:'POST',body:{source_reference:sourceReference.trim(),maintenance_authority:maintenanceAuthority.trim(),reason:verifyReason.trim(),latitude:Number(latitude),longitude:Number(longitude)}});
            setVerifying(false);setNotice('Asset registry verified. The maintenance model still requires a reviewed inspection.');record.reload();context.reload();onSaved?.();
        }catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    return <GovDetail title={asset?.asset_name || assetId} onClose={onClose} actions={asset&&!record.error ? <>
        {permissions?.assess&&<GovButton onClick={()=>{setScore('');setNotes('');setError('');setAssessing(true);}}>Record provisional condition</GovButton>}
        {permissions?.verify_registry&&asset.registry_status!=='verified'&&<GovButton primary onClick={()=>{setError('');setVerifying(true);}}>Verify asset registry</GovButton>}
        {permissions?.plan&&<Link className="gov-button" to={`/gov/insights?view=predictive&asset=${encodeURIComponent(assetId)}`}>Plan inspection <ArrowUpRight size={15}/></Link>}
    </>:null}>
        <GovState loading={record.loading&&!asset} error={record.error} onRetry={record.reload}/>
        {notice&&<p role="status" className="gov-note">{notice}</p>}
        {asset&&!record.error&&<>
            <section><GovStatus value={asset.condition_tier} label={asset.condition_score==null?'Needs assessment':asset.condition_tier}/><dl className="gov-facts"><dt>Asset ID</dt><dd>{asset.asset_id}</dd><dt>Category</dt><dd>{asset.category}</dd><dt>Location</dt><dd>{/^\d+$/.test(asset.barangay||'')?`Barangay ${asset.barangay}`:asset.barangay||'Not recorded'}</dd><dt>Registry</dt><dd>{asset.registry_status||'Candidate'}</dd><dt>Maintained by</dt><dd>{asset.maintenance_authority||'Not verified'}</dd><dt>Source</dt><dd>{asset.source_reference||'Not verified'}</dd><dt>Recorded condition</dt><dd>{asset.condition_score==null?'Not assessed':`${asset.condition_score}/100`}</dd><dt>Material</dt><dd>{asset.material_type||'Not recorded'}</dd><dt>Completed</dt><dd>{asset.date_completed||'Not recorded'}</dd><dt>Last maintenance</dt><dd>{asset.last_maintenance_date||'Not recorded'}</dd></dl></section>
            {permissions?.plan&&<AssetLocationPreview assetId={assetId} data={context.data} loading={context.loading} error={context.error}/>}
            {permissions?.plan&&<AssetHazardContext assetId={assetId}/>}
            <section><h3>Open work orders</h3>{asset.active_work_orders.length?<ul className="gov-inline-list">{asset.active_work_orders.map(work=><li key={work.id}><Link className="gov-record-link" to={`/gov/work-orders?wo=${work.id}`}>{work.wo_number||`Work #${work.id}`} · {work.title}</Link><p><GovStatus value={work.status}/></p></li>)}</ul>:<p>No open work orders recorded.</p>}</section>
            <section><h3>Maintenance history</h3>{asset.maintenance_history.length?<ul className="gov-inline-list">{asset.maintenance_history.map(log=><li key={log.log_id}><strong>{log.completion_date}</strong> · {log.work_type}</li>)}</ul>:<p>No completed maintenance recorded.</p>}</section>
            <section><h3>Condition assessment history</h3>{asset.condition_assessments?.length?<ul className="gov-inline-list">{asset.condition_assessments.map(entry=><li key={entry.id}><strong>{entry.condition_score}/100</strong><p>{entry.notes}</p><small>{entry.actor} · {formatDate(entry.created_at)}</small></li>)}</ul>:<p>No condition assessment event has been recorded. Earlier register values may have no review history.</p>}</section>
            <FieldObservationsPanel assetId={assetId} onSaved={()=>{record.reload();onSaved?.();}} />
            <AssetInspectionPanel assetId={assetId} permissions={permissions} onVerified={()=>{record.reload();context.reload();onSaved?.();}} />
        </>}
        <GovConfirm open={verifying} title="Verify this asset registry record?" confirmLabel="Verify registry" onConfirm={verifyRegistry} onClose={()=>setVerifying(false)} busy={busy} error={error}>
            <p>Confirm this asset’s official source, location and maintenance authority. Verification makes it eligible for a reviewed inspection and approved model cohort.</p>
            <label className="gov-field">Official source reference<input required minLength={8} maxLength={500} value={sourceReference} onChange={event=>setSourceReference(event.target.value)}/></label>
            <label className="gov-field">Maintenance authority<input required minLength={3} maxLength={160} value={maintenanceAuthority} onChange={event=>setMaintenanceAuthority(event.target.value)}/></label>
            <div className="gov-form-grid"><label className="gov-field">Verified latitude<input required type="number" min="4" max="22" step="any" value={latitude} onChange={event=>setLatitude(event.target.value)}/></label><label className="gov-field">Verified longitude<input required type="number" min="116" max="127" step="any" value={longitude} onChange={event=>setLongitude(event.target.value)}/></label></div>
            <label className="gov-field">Verification reason<textarea required minLength={10} maxLength={2000} value={verifyReason} onChange={event=>setVerifyReason(event.target.value)}/></label>
        </GovConfirm>
        <GovConfirm open={assessing} title="Record a provisional condition assessment" confirmLabel="Save assessment" onConfirm={save} onClose={()=>setAssessing(false)} busy={busy} error={error}>
            <p>{assetId} · {asset?.asset_name}</p><form ref={form} onSubmit={event=>{event.preventDefault();save();}}><label className="gov-field">Observed condition score<input required type="number" min="0" max="100" step="0.1" value={score} onChange={event=>setScore(event.target.value)}/><small>0 is the lowest condition; 100 is the highest. Enter the score supported by the inspection.</small></label><label className="gov-field">Assessment findings<textarea required minLength={10} maxLength={2000} value={notes} onChange={event=>setNotes(event.target.value)}/></label></form><p className="gov-note">This keeps the existing assessment workflow. It updates the register but is not an independently reviewed outcome and cannot train the production model. For model evidence, submit a field inspection below.</p>{error&&<GovButton onClick={record.reload}>Reload current condition</GovButton>}
        </GovConfirm>
    </GovDetail>;
}
