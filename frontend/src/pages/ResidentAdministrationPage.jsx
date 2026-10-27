import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovSelect, GovTabs, GovTable, GovDetail, GovState, GovStatus, GovConfirm, formatDate } from '../components/government/GovWorkspace';
import { AdministrationTabs } from './StaffAdministrationPage';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';

const STATUS = ['active','pending','suspended','deactivated','inactive'];
const IDENTITY = ['Pending review','Verified','Rejected','N/A'];

export default function ResidentAdministrationPage() {
    const [params,setParams]=useSearchParams();
    const search=params.get('res_search')||'';
    const status=params.get('res_status')||'all';
    const identity=params.get('res_ver')||'all';
    const page=Math.max(1,Number(params.get('res_page'))||1);
    const selected=params.get('resident')?.replace(/^RES-/i,'');
    const query=new URLSearchParams({search,status,id_verification:identity,page:String(page),page_size:'15'});
    const records=useGovernmentData(`/api/admin/residents?${query}`);
    const access=useGovernmentData('/api/admin/access');
    const trigger=useRef(null);
    function change(key,value){setParams(current=>{const next=new URLSearchParams(current);value&&value!=='all'?next.set(key,value):next.delete(key);if(['res_search','res_status','res_ver'].includes(key))next.delete('res_page');return next;},{replace:key==='res_search'});}
    function close(){change('resident','');requestAnimationFrame(()=>trigger.current?.focus());}
    return <GovWorkspace title="Resident accounts" description="Account access, identity review records and contact confirmation." actions={<><GovSearch value={search} onChange={value=>change('res_search',value)} placeholder="Search name, email or resident reference"/><GovButton onClick={records.reload} disabled={records.loading}><RefreshCw size={15}/> Refresh</GovButton></>}>
        <AdministrationTabs value="residents" access={access.data}/>
        <div className="gov-summary-line"><GovSelect label="Account access" value={status} onChange={value=>change('res_status',value)} options={[{value:'all',label:'All accounts'},...STATUS.map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))]}/><GovSelect label="Identity review" value={identity} onChange={value=>change('res_ver',value)} options={[{value:'all',label:'All review states'},...IDENTITY.map(value=>({value,label:value==='N/A'?'Not recorded':value}))]}/>{records.data&&<span>{records.data.total} matching accounts</span>}</div>
        <GovState loading={records.loading&&!records.data} error={records.error||access.error} onRetry={()=>{records.reload();access.reload();}}/>
        {records.data&&!records.error&&<div className={`gov-record-layout ${selected?'has-detail':''}`}><GovTable label="Resident accounts" rows={records.data.items} rowKey={row=>row.id} selected={Number(selected)} onSelect={(row,element)=>{trigger.current=element;change('resident',String(row.id));}} pagination={{total:records.data.total,page,onChange:value=>change('res_page',String(value))}} columns={[
            {key:'name',label:'Resident',render:row=><>{row.name}<small>{row.resident_id}</small></>},
            {key:'barangay',label:'Barangay'},
            {key:'status',label:'Account access',render:row=><GovStatus value={row.status}/>},
            {key:'id_verification_status',label:'Identity review',render:row=>row.id_verification_status==='N/A'?'Not recorded':row.id_verification_status},
        ]}/>{selected&&<ResidentRecord key={selected} id={selected} onClose={close} onChanged={records.reload}/>}</div>}
    </GovWorkspace>;
}

function ResidentRecord({id,onClose,onChanged}) {
    const record=useGovernmentData(`/api/admin/residents/${id}`);
    const [tab,setTab]=useState('details');
    const [historyPage,setHistoryPage]=useState(1);
    const history=useGovernmentData(tab==='history'?`/api/admin/residents/${id}/history?page=${historyPage}`:null);
    const [action,setAction]=useState('');
    const [notice,setNotice]=useState('');
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const form=useRef(null);
    const commandVersion=useRef(null);
    const person=record.data;
    const allowed=person?.allowed_actions||[];
    function begin(value){commandVersion.current=person.version;setError('');setNotice('');setAction(value);}
    async function confirm(){
        if(busy||!form.current.reportValidity())return;
        setBusy(true);setError('');
        const values=Object.fromEntries(new FormData(form.current));
        const body={...values,expected_version:commandVersion.current,reason:values.reason.trim()};
        const endpoint=action==='identity'?'verify':action==='confirmation'?'resend-confirmation':'status';
        if(['suspended','active','deactivated'].includes(action))body.status=action;
        try {
            const saved=await governmentRequest(`/api/admin/residents/${id}/${endpoint}`,{method:endpoint==='status'?'PATCH':'POST',body});
            setNotice(endpoint==='resend-confirmation'?saved.message:'Resident record saved.');
            setAction('');record.reload();history.reload();onChanged();
        } catch(cause){setError(cause.message);record.reload();history.reload();}
        finally{setBusy(false);}
    }
    return <GovDetail title={person?`${person.name} · ${person.resident_id}`:'Resident account'} onClose={onClose} actions={person&&allowed.length>0&&<>
        {allowed.includes('status')&&<><GovButton onClick={()=>begin(person.is_active?'suspended':'active')}>{person.is_active?'Suspend access':'Reactivate access'}</GovButton>{person.status!=='deactivated'&&<GovButton onClick={()=>begin('deactivated')}>Deactivate account</GovButton>}</>}
        {allowed.includes('review_identity')&&<GovButton onClick={()=>begin('identity')}>Record identity review</GovButton>}
        {allowed.includes('resend_confirmation')&&<GovButton onClick={()=>begin('confirmation')}>Send confirmation code</GovButton>}
    </>}>
        <GovState loading={record.loading&&!person} error={record.error} onRetry={record.reload}/>
        {person&&!record.error&&<><GovStatus value={person.status}/><GovTabs label="Resident record sections" value={tab} onChange={setTab} items={[{value:'details',label:'Details'},{value:'identity',label:'Identity review'},{value:'history',label:'Activity'}]}/>
            {notice&&<p role="status" className="gov-note">{notice}</p>}
            {tab==='details'&&<><dl className="gov-facts"><dt>Email</dt><dd>{person.masked_email}</dd><dt>Phone</dt><dd>{person.masked_phone}</dd><dt>Barangay</dt><dd>{person.barangay}</dd><dt>Sign-in confirmation</dt><dd>{person.sign_in_confirmed?'Recorded':'Awaiting confirmation'}</dd><dt>Registered</dt><dd>{formatDate(person.registered_at)}</dd><dt>Reports in your scope</dt><dd>{person.reports_count} total · {person.active_reports} open</dd></dl><section className="gov-detail-section"><h3>Latest access decision</h3>{person.status_reason?<><p>{person.status_reason}</p><p className="gov-note">{person.status_changed_by} · {formatDate(person.status_changed_at)}</p></>:<p>No administrative access decision recorded.</p>}</section></>}
            {tab==='identity'&&<IdentityRecord id={id} person={person}/>}
            {tab==='history'&&<><GovState loading={history.loading&&!history.data} error={history.error} onRetry={history.reload}/>{history.data&&!history.error&&<GovTable label="Resident administration history" rows={history.data.items} rowKey={row=>row.id} pagination={{total:history.data.total,page:historyPage,onChange:setHistoryPage}} columns={[{key:'action',label:'Action',render:row=><>{row.action}<small>{row.actor} · {formatDate(row.timestamp)}</small></>},{key:'reason',label:'Record',render:row=><>{row.reason||'Metadata access'}{row.reference&&<small>{row.reference}</small>}{row.delivery_status&&<small>{row.delivery_status.replaceAll('_',' ')}</small>}</>}]} emptyMessage="No account administration events recorded"/>}</>}
        </>}
        {action&&<GovConfirm open title={{active:'Reactivate resident access',suspended:'Suspend resident access',deactivated:'Deactivate resident account',identity:'Record identity review',confirmation:'Send sign-in confirmation code'}[action]} confirmLabel={action==='identity'?'Save review':action==='confirmation'?'Send code':'Confirm access change'} onClose={()=>setAction('')} onConfirm={confirm} busy={busy} error={error}>
            <p>{action==='identity'?'Record a completed review of identity evidence held by the authorized office. The reference is required; this does not confirm email or phone ownership.':action==='confirmation'?'Send a code to the resident’s recorded email. It expires in 10 minutes. This does not approve their identity review.':action==='active'?'Restore sign-in access. Existing sessions stay signed out; contact confirmation is still required.':'This signs the resident out and prevents authenticated reporting. Existing reports and records are retained.'}</p>
            <form ref={form} onSubmit={event=>{event.preventDefault();confirm();}}>
                {action==='identity'&&<><fieldset className="gov-access-choices"><legend>Review decision</legend><label><input name="decision" type="radio" value="approve" required disabled={busy}/> Evidence accepted</label><label><input name="decision" type="radio" value="reject" required disabled={busy}/> Evidence not accepted</label></fieldset><label className="gov-field">External review record reference<input name="reference" required minLength={3} maxLength={255} disabled={busy}/></label></>}
                <label className="gov-field">Reason<textarea name="reason" required minLength={10} maxLength={2000} rows={3} disabled={busy}/></label>
            </form>
        </GovConfirm>}
    </GovDetail>;
}

function IdentityRecord({id,person}) {
    const metadata=useGovernmentData(`/api/admin/residents/${id}/verification`);
    return <><GovState loading={metadata.loading&&!metadata.data} error={metadata.error} onRetry={metadata.reload}/>{metadata.data&&!metadata.error&&<><dl className="gov-facts"><dt>Review status</dt><dd>{person.id_verification_status==='N/A'?'Not recorded':person.id_verification_status}</dd><dt>ID type</dt><dd>{metadata.data.id_type||'Not recorded'}</dd><dt>Review reference</dt><dd>{person.id_review_reference||'Not recorded'}</dd><dt>Reviewed</dt><dd>{formatDate(person.id_reviewed_at)}</dd>{person.id_rejection_reason&&<><dt>Decision reason</dt><dd>{person.id_rejection_reason}</dd></>}</dl><p className="gov-note">Identity documents are not stored in this account record. Check the referenced office record for evidence. Access to this review metadata is logged.</p></>}</>;
}
