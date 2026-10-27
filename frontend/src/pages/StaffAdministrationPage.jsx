import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, Plus, RefreshCw } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovTabs, GovSelect, GovTable, GovDetail, GovState, GovStatus, GovConfirm, formatDate } from '../components/government/GovWorkspace';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import { ADMIN_VIEWS } from '../utils/adminAccess';

export function AdministrationTabs({ value, access }) {
    return <GovTabs label="Administration sections" value={value} items={ADMIN_VIEWS.filter(item => access?.tabs.includes(item.value)).map(item => ({...item,to:`/gov/administration?view=${item.value}&tab=${item.value}`}))} />;
}

export default function StaffAdministrationPage() {
    const [params,setParams] = useSearchParams();
    const search=params.get('search') || '';
    const status=params.get('status') || 'all';
    const page=Math.max(1,Number(params.get('staff_page') || params.get('page')) || 1);
    const id=params.get('user');
    const query=new URLSearchParams({search,status,page:String(page),page_size:'15'});
    const records=useGovernmentData(`/api/admin/staff?${query}`);
    const options=useGovernmentData('/api/admin/staff-options');
    const access=useGovernmentData('/api/admin/access');
    const [creating,setCreating]=useState(false);
    const [link,setLink]=useState(null);
    const trigger=useRef(null);
    function change(name,value) { setParams(current => {const next=new URLSearchParams(current); value && value!=='all' ? next.set(name,value) : next.delete(name); if (['search','status'].includes(name)) {next.delete('page');next.delete('staff_page');} return next;},{replace:name==='search'}); }
    function close() {change('user','');requestAnimationFrame(() => trigger.current?.focus());}
    return <GovWorkspace title="Staff and roles" description="Staff access, district assignments and account recovery." actions={<><GovSearch value={search} onChange={value=>change('search',value)} placeholder="Search name, email or role" /><div className="gov-page-actions__group"><GovButton onClick={records.reload} disabled={records.loading}><RefreshCw size={15}/> Refresh</GovButton>{options.data?.can_manage && <GovButton primary onClick={()=>setCreating(true)}><Plus size={15}/> Invite staff</GovButton>}</div></>}>
        <AdministrationTabs value="staff" access={access.data}/>
        <div className="gov-summary-line"><GovSelect label="Account status" value={status} onChange={value=>change('status',value)} options={[{value:'all',label:'All accounts'},{value:'active',label:'Active'},{value:'invited',label:'Invited'},{value:'deactivated',label:'Deactivated'}]}/>{records.data && <span>{records.data.total} matching accounts</span>}</div>
        <GovState loading={records.loading&&!records.data} error={records.error||options.error||access.error} onRetry={()=>{records.reload();options.reload();access.reload();}}/>
        {records.data&&!records.error&&<div className={`gov-record-layout ${id?'has-detail':''}`}><GovTable label="Government staff accounts" rows={records.data.items} rowKey={person=>person.id} selected={Number(id)} onSelect={(person,element)=>{trigger.current=element;change('user',String(person.id));}} pagination={{total:records.data.total,page,onChange:value=>change('staff_page',String(value))}} columns={[
            {key:'name',label:'Staff member',render:person=><>{person.name}<small>{person.email}</small></>},
            {key:'friendly_role',label:'Role'},
            {key:'scope',label:'District access'},
            {key:'status',label:'Account',render:person=><GovStatus value={person.status.toLowerCase()}/>},
        ]} emptyMessage={search||status!=='all'?'No staff match these filters':'No staff accounts available'}/>{id&&<StaffRecord key={id} id={id} options={options.data} onClose={close} onChanged={records.reload} onLink={setLink}/>}</div>}
        {creating&&<StaffForm options={options.data} onClose={()=>setCreating(false)} onSave={async body=>{const saved=await governmentRequest('/api/admin/staff',{method:'POST',body});setCreating(false);records.reload();change('user',String(saved.id));setLink(saved);}}/>}
        {link&&<CredentialLinkResult value={link} onClose={()=>setLink(null)}/>}
    </GovWorkspace>;
}

function StaffRecord({id,options,onClose,onChanged,onLink}) {
    const record=useGovernmentData(`/api/admin/staff/${id}`);
    const [action,setAction]=useState('');
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const form=useRef(null);
    const person=record.data;
    const allowed=person?.allowed_actions||[];
    function changed(){record.reload();onChanged();}
    async function confirm(){
        if(!form.current.reportValidity()||busy)return;
        setBusy(true);setError('');
        const reason=new FormData(form.current).get('reason').trim();
        try {
            if(['invite','reset'].includes(action)){
                const result=await governmentRequest(`/api/admin/staff/${id}/${action==='invite'?'resend-invite':'reset-password'}`,{method:'POST',body:{reason}});onLink(result);
            } else await governmentRequest(`/api/admin/staff/${id}`,{method:'PATCH',body:{is_active:action==='activate',expected_version:person.version,reason}});
            setAction('');changed();
        }catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    return <GovDetail title={person?.name||'Staff account'} onClose={onClose} actions={person&&!record.error&&<>{allowed.includes('edit')&&<GovButton onClick={()=>setAction('edit')}>Edit role and access</GovButton>}{allowed.includes('invite')&&<GovButton onClick={()=>{setError('');setAction('invite');}}>Renew invitation</GovButton>}{allowed.includes('reset')&&<GovButton onClick={()=>{setError('');setAction('reset');}}>Create recovery link</GovButton>}{['activate','deactivate'].filter(value=>allowed.includes(value)).map(value=><GovButton key={value} onClick={()=>{setError('');setAction(value);}}>{value==='activate'?'Reactivate account':'Deactivate account'}</GovButton>)}</>}>
        <GovState loading={record.loading&&!person} error={record.error} onRetry={record.reload}/>
        {person&&!record.error&&<><GovStatus value={person.status.toLowerCase()}/><dl className="gov-facts"><dt>Account</dt><dd>{person.official_id}</dd><dt>Email</dt><dd>{person.email}</dd><dt>Role</dt><dd>{person.friendly_role}</dd><dt>Office</dt><dd>{person.office||'Not recorded'}</dd><dt>District access</dt><dd>{person.scope}</dd><dt>Registered</dt><dd>{formatDate(person.date_added)}</dd></dl>{person.scope_needs_review&&<p className="gov-note">This account needs a district access review.</p>}
            {action==='edit'&&<StaffForm person={person} options={options} onClose={()=>setAction('')} onSave={async body=>{await governmentRequest(`/api/admin/staff/${id}`,{method:'PATCH',body});setAction('');changed();}}/>}
            <GovConfirm open={['invite','reset','activate','deactivate'].includes(action)} title={{invite:'Renew staff invitation',reset:'Create password recovery link',activate:'Reactivate staff account',deactivate:'Deactivate staff account'}[action]||'Staff account'} confirmLabel={['invite','reset'].includes(action)?'Create secure link':'Confirm account change'} busy={busy} error={error} onClose={()=>setAction('')} onConfirm={confirm}>
                <p>{action==='deactivate'?'This signs the staff member out and cancels unused account links.':action==='activate'?'The staff member can sign in again with their existing password.': 'This replaces unused account links. The new link must be shared privately; it will not be emailed automatically.'}</p><form ref={form} onSubmit={event=>{event.preventDefault();confirm();}}><label className="gov-field">Reason<textarea name="reason" required minLength={10} maxLength={2000} rows={3}/></label></form>
            </GovConfirm>
        </>}
    </GovDetail>;
}

function StaffForm({person,options,onClose,onSave}) {
    const [citywide,setCitywide]=useState(Boolean(person?.citywide));
    const [districts,setDistricts]=useState(person?.district_ids||[]);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const form=useRef(null);
    async function save(){
        if(!form.current.reportValidity()||busy)return;
        if(!citywide&&!districts.length){setError('Choose at least one district.');return;}
        const values=Object.fromEntries(new FormData(form.current));
        const body={...values,reason:values.reason.trim(),district_ids:citywide?[]:districts,citywide};
        if(person){body.expected_version=person.version;if(body.role===person.role)delete body.role;}
        setBusy(true);setError('');
        try{await onSave(body);}catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    return <GovConfirm open title={person?'Edit staff role and access':'Invite staff member'} confirmLabel={person?'Save access changes':'Create invitation'} busy={busy} error={error} onClose={onClose} onConfirm={save}>
        {person&&<p>Access changes sign this staff member out and cancel unused account links.</p>}
        <form ref={form} onSubmit={event=>{event.preventDefault();save();}}>
            {!person&&<><label className="gov-field">Full name<input name="full_name" required minLength={2} maxLength={150} autoComplete="name"/></label><label className="gov-field">Staff email<input name="email" type="email" required autoComplete="email"/></label></>}
            <label className="gov-field">Role<select name="role" required defaultValue={person?.role||''} disabled={busy}><option value="">Choose role</option>{person&&!options?.roles.some(role=>role.value===person.role)&&<option value={person.role}>{person.friendly_role}</option>}{options?.roles.map(role=><option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
            <label className="gov-field">Office or division (optional)<input name="office" maxLength={150} defaultValue={person?.office||''}/></label>
            <fieldset className="gov-access-choices"><legend>District access</legend>{options?.can_grant_citywide&&<label><input type="checkbox" checked={citywide} onChange={event=>setCitywide(event.target.checked)} disabled={busy}/> Citywide access</label>}{!citywide&&options?.districts.map(district=><label key={district.id}><input type="checkbox" checked={districts.includes(district.id)} onChange={event=>setDistricts(current=>event.target.checked?[...current,district.id]:current.filter(id=>id!==district.id))} disabled={busy}/>{district.name}</label>)}</fieldset>
            <label className="gov-field">Reason<textarea name="reason" required minLength={10} maxLength={2000} rows={3}/></label>
        </form>
    </GovConfirm>;
}

function CredentialLinkResult({value,onClose}) {
    const [message,setMessage]=useState('');
    const link=new URL(value.invite_link||value.reset_link,window.location.origin).href;
    return <GovConfirm open title="Secure account link ready" confirmLabel="Done" onClose={onClose} onConfirm={onClose}>
        <p>No email has been sent. Share this link privately with the staff member. It expires {formatDate(value.expires_at)}.</p><label className="gov-field">Account link<input readOnly value={link} onFocus={event=>event.target.select()}/></label><GovButton onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage('Link copied.');}catch{setMessage('Select and copy the link above.');}}}><Copy size={15}/> Copy link</GovButton>{message&&<p role="status">{message}</p>}
    </GovConfirm>;
}

export function AdministrationAuditPage(){
    const [params,setParams]=useSearchParams();
    const page=Math.max(1,Number(params.get('page'))||1);
    const access=useGovernmentData('/api/admin/access');
    const records=useGovernmentData(`/api/admin/audit-logs?page=${page}&page_size=15`);
    const coverage=useGovernmentData('/api/admin/audit-integrity');
    return <GovWorkspace title="Administration activity" actions={<GovButton onClick={()=>{records.reload();coverage.reload();}}><RefreshCw size={15}/> Refresh</GovButton>}>
        <AdministrationTabs value="audit" access={access.data}/><GovState loading={records.loading&&!records.data} error={records.error||coverage.error||access.error} onRetry={()=>{records.reload();coverage.reload();access.reload();}}/>
        {coverage.data&&<p className="gov-note">{coverage.data.total_audit_events} events recorded. Historical integrity verification is not configured.</p>}
        {records.data&&!records.error&&<GovTable label="Administrative activity history" rows={records.data.items} rowKey={row=>row.id} pagination={{total:records.data.total,page,onChange:value=>setParams(current=>{const next=new URLSearchParams(current);next.set('page',String(value));return next;})}} columns={[{key:'action',label:'Action'},{key:'actor',label:'Staff member'},{key:'timestamp',label:'Recorded'}]}/>}
    </GovWorkspace>;
}
