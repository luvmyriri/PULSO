import { useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Download, RefreshCw, Upload } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovTabs, GovState, GovTable, GovDetail, GovConfirm, formatDate } from '../components/government/GovWorkspace';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken } from '../utils/authSession';

const targetLink = row => row.target_model === 'WorkOrder' ? `/gov/work-orders?wo=${row.target_id}` : row.target_model === 'ProjectRequest' ? `/gov/projects?project=${row.target_id}` : row.target_model === 'OBOInspection' ? '/gov/obo' : null;
const activityLink = row => row.report_id ? `/gov/reports?reportId=${row.report_id}` : row.work_order_id ? `/gov/work-orders?wo=${row.work_order_id}` : row.project_id ? `/gov/projects?project=${row.project_id}` : null;

export default function RecordsWorkspacePage() {
    const [params,setParams]=useSearchParams();
    const requestedView=['timeline','audit'].includes(params.get('view')) ? params.get('view') : 'documents';
    const page=Math.max(1,Number(params.get('page'))||1);
    const search=params.get('search')||'';
    const permissions=useGovernmentData('/api/gov/records-workspace/permissions');
    const view=requestedView==='audit'&&permissions.data&&!permissions.data.audit?'documents':requestedView;
    const records=useGovernmentData(permissions.data&&!permissions.error?`/api/gov/records-workspace?${new URLSearchParams({view,page:String(page),search})}`:null);
    const selected=records.data?.items.find(r=>String(r.id)===params.get('selected'));
    const [uploadOpen,setUploadOpen]=useState(false);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [notice,setNotice]=useState('');
    const form=useRef(null);
    function change(name,value){setParams(p=>{const n=new URLSearchParams(p);value?n.set(name,value):n.delete(name);if(['search','view'].includes(name)){n.delete('page');n.delete('selected');}n.delete('tab');return n;},{replace:name==='search'});}
    async function upload(){
        if(!form.current.reportValidity())return;
        setBusy(true);setError('');
        try{await governmentRequest('/api/gov/documents/upload',{method:'POST',body:new FormData(form.current)});setUploadOpen(false);setNotice('Document saved in the registry.');change('view','registry');records.reload();}catch(e){setError(e.message);}finally{setBusy(false);}
    }
    async function download(row){
        setError('');setBusy(true);
        try{const response=await fetch(`${API_BASE_URL}/api/gov/documents/get/${row.id}`,{headers:{Authorization:`Bearer ${getAuthToken()}`}});if(!response.ok){const detail=await response.json().catch(()=>null);throw new Error(detail?.detail||'The document could not be downloaded. Try again.');}const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=row.title;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e.message);}finally{setBusy(false);}
    }
    if(permissions.data&&requestedView==='audit'&&!permissions.data.audit){const next=new URLSearchParams(params);next.set('view','documents');next.delete('tab');return <Navigate to={`/gov/records-workspace?${next}`} replace/>;}
    return <GovWorkspace title="Records" description="Find saved documents and review the history of reports and work orders." actions={permissions.data&&!permissions.error?<><GovSearch value={search} onChange={v=>change('search',v)} placeholder={view==='documents'?'Search filename or document type':'Search recorded activity'} /><div className="gov-page-actions__group"><GovButton onClick={records.reload} disabled={records.loading}><RefreshCw size={15}/> Refresh</GovButton>{permissions.data?.upload&&<GovButton primary onClick={()=>{setError('');setUploadOpen(true);}}><Upload size={15}/> Upload document</GovButton>}</div></>:null}>
        {permissions.data&&!permissions.error&&<GovTabs label="Records sections" value={view} onChange={v=>change('view',v==='documents'?'registry':v)} items={[{value:'documents',label:'Documents'},{value:'timeline',label:'Activity timeline'},...(permissions.data?.audit?[{value:'audit',label:'Audit trail'}]:[])]}/>}
        {permissions.data?.financial_history&&<p className="gov-note"><Link to="/gov/financial-history">Historical procurement records</Link></p>}
        {notice&&<p role="status" className="gov-note">{notice}</p>}
        {error&&!uploadOpen&&<p role="alert" className="gov-error">{error}</p>}
        <GovState loading={permissions.loading||records.loading&&!records.data} error={records.error||permissions.error} onRetry={()=>{records.reload();permissions.reload();}}/>
        {records.data&&!records.error&&<>
            <p className="gov-note">{view==='documents'?'Only saved files appear here. A stored fingerprint identifies a file; it is not a claim that its contents have been approved.':'This history comes from saved activity. It does not include actions that have not been recorded.'} Updated {formatDate(records.fetchedAt)}.</p>
            <div className={`gov-record-layout ${selected?'has-detail':''}`}>
                <GovTable label={view==='documents'?'Saved documents':'Recorded activity'} rows={records.data.items} pagination={{page,total:records.data.total,onChange:p=>change('page',String(p))}} rowKey={r=>r.id} selected={selected?.id} onSelect={r=>change('selected',String(r.id))} emptyMessage={search?'No matching records':view==='documents'?'No documents have been saved yet':'No recorded activity in this view'} columns={view==='documents'?[
                    {key:'title',label:'Document',render:r=><>{r.title}<small>{r.document_type?.replaceAll('_',' ')}</small></>},
                    {key:'classification',label:'Access'},{key:'owner',label:'Uploaded by'},
                    {key:'created_at',label:'Uploaded',render:r=>formatDate(r.created_at)},
                    {key:'target_id',label:'Linked record',render:r=>targetLink(r)?<Link className="gov-text-button" to={targetLink(r)}>{r.target_model==='WorkOrder'?'Work order':r.target_model==='ProjectRequest'?'Project':'Inspection'} #{r.target_id}</Link>:'Historical reference'},
                ]:[{key:'title',label:'Activity'},{key:'owner',label:'Recorded actor'},{key:'created_at',label:'When',render:r=>formatDate(r.created_at)},{key:'detail',label:'Note',render:r=>r.detail||'No note recorded'}]}/>
                {selected&&<GovDetail title={selected.title} onClose={()=>change('selected','')} actions={view==='documents'?<GovButton primary disabled={busy} onClick={()=>download(selected)}><Download size={15}/> Download document</GovButton>:activityLink(selected)?<Link className="gov-button" to={activityLink(selected)}>Open related record</Link>:null}>
                    {view==='documents'?<section><dl className="gov-facts"><dt>Document type</dt><dd>{selected.document_type?.replaceAll('_',' ')}</dd><dt>Uploaded by</dt><dd>{selected.owner}</dd><dt>Uploaded</dt><dd>{formatDate(selected.created_at)}</dd><dt>File size</dt><dd>{Number(selected.size_bytes).toLocaleString()} bytes</dd><dt>Access</dt><dd>{selected.classification}</dd><dt>Retention rule</dt><dd>{selected.retention?.replaceAll('_',' ')||'Not recorded'}</dd><dt>Legal hold</dt><dd>{selected.legal_hold?'In place':'Not recorded'}</dd></dl><details><summary>File fingerprint</summary><p className="gov-note" style={{overflowWrap:'anywhere'}}>{selected.checksum||'No fingerprint recorded'}</p></details></section>:<section><dl className="gov-facts"><dt>When</dt><dd>{formatDate(selected.created_at)}</dd><dt>Recorded actor</dt><dd>{selected.owner}</dd></dl><p>{selected.detail||'No additional note recorded.'}</p></section>}
                </GovDetail>}
            </div>
        </>}
        <GovConfirm open={uploadOpen} title="Upload a document" confirmLabel="Upload document" onClose={()=>setUploadOpen(false)} onConfirm={upload} busy={busy} error={error}>
            <p>Attach the original file to an existing record. Uploading does not approve the document or change the work status.</p>
            <form ref={form} onSubmit={e=>{e.preventDefault();upload();}}>
                <label className="gov-field">Linked record type<select name="target_model" required><option value="WorkOrder">Work order</option><option value="ProjectRequest">Project</option><option value="OBOInspection">Inspection</option></select></label>
                <label className="gov-field">Linked record ID<input name="target_id" type="number" min="1" required/></label>
                <label className="gov-field">Document type<select name="document_type"><option value="survey_report">Survey report</option><option value="design_plans">Design plans</option><option value="completion_report">Completion report</option><option value="final_photo">Completion photo</option><option value="materials_test">Materials test</option><option value="as_built_plan">As-built plan</option></select></label>
                <label className="gov-field">File<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt,.csv" required/><small>Maximum 50 MB. The linked record must already exist.</small></label>
            </form>
        </GovConfirm>
    </GovWorkspace>;
}
