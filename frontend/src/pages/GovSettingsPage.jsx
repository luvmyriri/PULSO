import { useRef,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { GovWorkspace,GovButton,GovState,GovTable,GovDetail,GovTabs,GovConfirm,formatDate } from '../components/government/GovWorkspace';
import { AdministrationTabs } from './StaffAdministrationPage';
import { governmentRequest,useGovernmentData } from '../utils/governmentApi';

const STATUS={application_default:'Application default',unconfigured:'Not configured',configured:'Saved configuration',needs_review:'Needs review',informational:'Informational',legacy:'Historical entry'};
const OPERATION={disabled:'Suggestions off',deployment_disabled:'Unavailable in this deployment',configured:'Requests enabled; results require review',not_configured:'Provider not configured'};

export default function GovSettingsPage(){
    const [params,setParams]=useSearchParams();
    const view=params.get('view')||params.get('tab')||'settings';
    const selected=params.get('setting');
    const settings=useGovernmentData('/api/admin/settings');
    const access=useGovernmentData('/api/admin/access');
    const [notice,setNotice]=useState('');
    const trigger=useRef(null);
    const rows=(settings.data?.settings||[]).filter(item=>view==='automated-ai'?item.category==='ai':item.category!=='ai');
    const item=rows.find(row=>row.key===selected);
    function change(key){setParams(current=>{const next=new URLSearchParams(current);key?next.set('setting',key):next.delete('setting');next.delete('history_page');return next;});}
    function close(){change('');requestAnimationFrame(()=>trigger.current?.focus());}
    return <GovWorkspace title={view==='automated-ai'?'Automation and AI':'System settings'} description={view==='automated-ai'?'Report suggestions and engineering review support.':'Operational controls and recorded configuration changes.'} actions={<GovButton onClick={settings.reload} disabled={settings.loading}><RefreshCw size={15}/> Refresh</GovButton>}>
        <AdministrationTabs value={view} access={access.data}/>
        {notice&&<p role="status" className="gov-note">{notice}</p>}
        <GovState loading={settings.loading&&!settings.data} error={settings.error||access.error} onRetry={()=>{settings.reload();access.reload();}}/>
        {settings.data&&!settings.error&&<div className={`gov-record-layout ${item?'has-detail':''}`}><GovTable label="Operational settings" rows={rows} rowKey={row=>row.key} selected={selected} onSelect={(row,element)=>{trigger.current=element;change(row.key);}} columns={[
            {key:'title',label:'Setting'},
            {key:'display_value',label:'Configuration',render:row=><>{row.display_value}{row.status==='needs_review'&&<small>Needs review</small>}{row.key==='ai_report_category_suggestion'&&<small>{OPERATION[row.operational_status]}</small>}</>},
            {key:'updated_at',label:'Last saved',render:row=>row.updated_at?<>{formatDate(row.updated_at)}<small>{row.updated_by||'Author not recorded'}</small></>:row.status==='application_default'?'Default':<span aria-label="No saved change">—</span>},
        ]}/>{item&&<SettingRecord key={item.key} item={item} onClose={close} onSaved={()=>{settings.reload();setNotice('Configuration saved.');}}/>}</div>}
        {selected&&settings.data&&!item&&!settings.error&&<GovState empty title="Setting is not in this section"><GovButton onClick={close}>Back to settings</GovButton></GovState>}
    </GovWorkspace>;
}

function SettingRecord({item,onClose,onSaved}){
    const [params,setParams]=useSearchParams();
    const page=Math.max(1,Number(params.get('history_page'))||1);
    const [tab,setTab]=useState('details');
    const [editing,setEditing]=useState(false);
    const history=useGovernmentData(tab==='history'?`/api/admin/settings/${item.key}/history?page=${page}`:null);
    const link=item.related_url?[item.related_label,item.related_url]:null;
    return <GovDetail title={item.title} onClose={onClose} actions={<>{item.can_edit&&<GovButton primary onClick={()=>setEditing(true)}>{item.configured?'Edit configuration':'Configure'}</GovButton>}{link&&<Link className="gov-button" to={link[1]}>{link[0]} ↗</Link>}</>}>
        <GovTabs label="Setting record sections" value={tab} onChange={setTab} items={[{value:'details',label:'Details'},{value:'history',label:'Change history'}]}/>
        {tab==='details'?<><p>{item.description}</p><dl className="gov-facts"><dt>Configuration</dt><dd>{item.display_value}</dd>{item.key==='ai_report_category_suggestion'&&<><dt>Availability</dt><dd>{OPERATION[item.operational_status]}</dd></>}<dt>Saved state</dt><dd>{STATUS[item.status]||'Informational'}</dd><dt>Last changed</dt><dd>{formatDate(item.updated_at)}</dd><dt>Changed by</dt><dd>{item.updated_by||'Not recorded'}</dd>{item.source_reference&&<><dt>Recorded reference</dt><dd>{item.source_reference}</dd></>}</dl>{item.status==='needs_review'&&<p className="gov-note">Review and save a valid configuration before it can be used.</p>}{item.key==='maintenance_review_support'&&<p>Suggestions support an engineering review. A maintenance date requires sufficient completed-work history.</p>}</>:<><GovState loading={history.loading&&!history.data} error={history.error} onRetry={history.reload}/>{history.data&&!history.error&&<GovTable label="Setting change history" rows={history.data.items} rowKey={row=>row.id} pagination={{total:history.data.total,page,onChange:value=>setParams(current=>{const next=new URLSearchParams(current);next.set('history_page',String(value));return next;})}} columns={[
            {key:'new_display',label:'Change',render:row=><><strong>{row.new_display}</strong><small>Previously: {row.old_display}</small><p>{row.reason}</p></>},
            {key:'actor',label:'Staff member',render:row=>row.actor||'Not recorded'},
            {key:'created_at',label:'Recorded',render:row=>formatDate(row.created_at)},
        ]} emptyMessage="No configuration changes recorded"/>}</>}
        {editing&&<SettingForm item={item} onClose={()=>setEditing(false)} onSaved={()=>{setEditing(false);history.reload();onSaved();}}/>}
    </GovDetail>;
}

function SettingForm({item,onClose,onSaved}){
    const [enabled,setEnabled]=useState(Boolean(item.value?.enabled));
    const [urgency,setUrgency]=useState(Boolean(item.value?.suggest_urgency));
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const form=useRef(null);
    async function save(){
        if(!form.current.reportValidity()||busy)return;
        const fields=Object.fromEntries(new FormData(form.current));
        const value=item.key==='sla_response_time'?{urgent_hours:Number(fields.urgent_hours),standard_hours:Number(fields.standard_hours)}:item.key==='report_review_routing'?{enabled}:{enabled,suggest_urgency:urgency};
        setBusy(true);setError('');
        try{await governmentRequest(`/api/admin/settings/${item.key}`,{method:'PUT',body:{value,expected_version:item.version,reason:fields.reason,source_reference:fields.source_reference||null}});onSaved();}
        catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    return <GovConfirm open title={item.title} confirmLabel="Save configuration" busy={busy} error={error} onClose={onClose} onConfirm={save}>
        <form ref={form} onSubmit={event=>{event.preventDefault();save();}}>
            {item.key==='sla_response_time'?<><div className="gov-form-grid"><label className="gov-field">P4–P5 target (hours)<input name="urgent_hours" type="number" required min="1" max="8760" step="1" defaultValue={item.value?.urgent_hours??''}/></label><label className="gov-field">Other reports (hours)<input name="standard_hours" type="number" required min="1" max="8760" step="1" defaultValue={item.value?.standard_hours??''}/></label></div><p>Measured from submission while initial staff review is pending. Targets appear in My work.</p></>:<fieldset className="gov-access-choices"><legend>{item.key==='report_review_routing'?'Review assignment':'Report suggestions'}</legend><label><input type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)} disabled={busy}/>{item.key==='report_review_routing'?'Automatically queue incoming reports to eligible reviewers':'Request report category suggestions'}</label>{item.key==='ai_report_category_suggestion'&&<label><input type="checkbox" checked={urgency} onChange={event=>setUrgency(event.target.checked)} disabled={busy||!enabled}/> Include advisory urgency</label>}</fieldset>}
            {item.key==='report_review_routing'&&<p>Turning this off keeps existing owners and leaves incoming reports for manual assignment.</p>}
            {item.key==='ai_report_category_suggestion'&&<p>Turning this off keeps reporting available for staff review. It does not change staff severity grades.</p>}
            <label className="gov-field">{item.key==='sla_response_time'?'Authorizing reference':'Reference (optional)'}<input name="source_reference" required={item.key==='sla_response_time'} minLength={item.key==='sla_response_time'?3:undefined} maxLength={255} defaultValue={item.source_reference||''}/></label><label className="gov-field">Reason<textarea name="reason" required minLength={10} maxLength={2000} rows={3}/></label>
        </form>
    </GovConfirm>;
}
