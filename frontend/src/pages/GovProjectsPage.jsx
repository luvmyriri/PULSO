import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, Upload } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovTabs, GovTable, GovDetail, GovState, GovStatus, GovConfirm, formatDate } from '../components/government/GovWorkspace';
import WorkNavigation from '../components/government/WorkNavigation';
import PrivateDocumentPreview from '../components/government/PrivateDocumentPreview';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';

const QUEUES=[['all','All projects'],['open','Open'],['assessment','Site assessment'],['planning','Engineering planning'],['waiting','External follow-up'],['for_review','For verification'],['completed','Completed'],['historical','Historical records']];
const LABELS={intake:'Intake',assessment:'Site assessment',planning:'Engineering planning',ready_for_work:'Ready for work',in_progress:'Work in progress',awaiting_verification:'For completion review',completed:'Completed',cancelled:'Cancelled',historical_record:'Historical record'};
const NEXT={intake:'Start assessment',assessment:'Start planning',planning:'Mark ready for work',ready_for_work:'Record work start',in_progress:'Submit completion'};
const DOC_TYPES={planning_record:'Planning record',work_authorization:'Work authorization',completion_report:'Completion report',inspection_report:'Inspection report',completion_certificate:'Official completion certificate',survey_report:'Survey report',design_plans:'Design plans',final_photo:'Site photograph'};
const PROOF={planning:'planning_record',ready_for_work:'work_authorization',in_progress:'completion_report'};
const ACTIONS={adopt:'Begin coordination review',edit:'Edit project details',assign:'Assign owner',add_dependency:'Add external dependency',resolve_dependency:'Record external response',accept_completion:'Accept completion',return_for_work:'Return for work',record_certificate:'Record official certificate',verify_report_resolution:'Verify report resolution',cancel:'Cancel coordination'};

export default function GovProjectsPage(){
    const navigate=useNavigate();
    const [params,setParams]=useSearchParams();
    const search=params.get('search')||'';
    const view=params.get('view')||'all';
    const page=Math.max(1,Number(params.get('page'))||1);
    const id=params.get('project')||params.get('selected');
    const sourceReport=params.get('sourceReport');
    const source=useGovernmentData(sourceReport?`/api/gov/project-workspace/report/${sourceReport}/context`:null);
    const records=useGovernmentData(`/api/gov/project-workspace?${new URLSearchParams({search,view,page:String(page)})}`);
    const options=useGovernmentData('/api/gov/project-workspace/options');
    const [creating,setCreating]=useState(false);
    const [notice,setNotice]=useState('');
    const trigger=useRef(null);
    function change(key,value){setParams(current=>{const next=new URLSearchParams(current);value&&value!=='all'?next.set(key,value):next.delete(key);if(['view','search'].includes(key))next.delete('page');return next;},{replace:key==='search'});}
    function closeCreation(){setCreating(false);const from=params.get('from');if(sourceReport&&from&&/^\/gov\/(?:reports|map)(?:[/?#]|$)/.test(from)&&!from.includes('\\')){navigate(from);return;}setParams(current=>{const next=new URLSearchParams(current);next.delete('sourceReport');next.delete('from');return next;});}
    function savedProject(saved){setCreating(false);records.reload();setParams(current=>{const next=new URLSearchParams(current);next.set('project',String(saved.id));next.delete('sourceReport');next.delete('from');return next;});setNotice(`${saved.reference} created.`);}
    function close(){change('project','');change('selected','');requestAnimationFrame(()=>trigger.current?.focus());}
    return <GovWorkspace title="Projects" description="Engineering coordination, external follow-ups and completion evidence." actions={<><GovSearch value={search} onChange={value=>change('search',value)} placeholder="Search project or reference"/><div className="gov-page-actions__group"><GovButton disabled={records.loading} onClick={records.reload}><RefreshCw size={15}/> Refresh</GovButton>{records.data?.can_create&&!sourceReport&&<GovButton primary onClick={()=>setCreating(true)}><Plus size={15}/> Create project</GovButton>}</div></>}>
        <WorkNavigation value="projects"/>
        <GovTabs label="Project queues" value={view} onChange={value=>change('view',value)} items={QUEUES.map(([value,label])=>({value,label}))}/>
        {notice&&<p role="status" className="gov-note">{notice}</p>}
        <GovState loading={records.loading&&!records.data} error={records.error||options.error||source.error} onRetry={()=>{records.reload();options.reload();source.reload();}}/>
        {records.data&&!records.error&&<div className={`gov-record-layout ${id?'has-detail':''}`}><GovTable label="Project coordination register" rows={records.data.items} rowKey={row=>row.id} selected={Number(id)} onSelect={(row,element)=>{trigger.current=element;change('project',String(row.id));}} pagination={{total:records.data.total,page,onChange:value=>change('page',String(value))}} columns={[
            {key:'reference',label:'Project',render:row=><>{row.reference}<small>{row.title}</small></>},
            {key:'owner_name',label:'Engineering owner',render:row=>row.owner_name||'Unassigned'},
            {key:'status',label:'Stage',render:row=><><GovStatus value={row.status} label={LABELS[row.status]||row.status}/>{row.status==='historical_record'&&row.historical_status&&<small>{row.historical_status.replaceAll('_',' ')}</small>}{row.pending_dependencies>0&&<small>{row.pending_dependencies} pending external follow-up</small>}</>},
            {key:'next_review_at',label:'Next review',render:row=>formatDate(row.next_review_at)},
        ]}/>{id&&<ProjectRecord key={id} id={id} options={options.data} onClose={close} onChanged={records.reload}/>}</div>}
        {sourceReport&&source.loading&&<GovState loading/>}
        {source.error&&<GovButton onClick={closeCreation}>Back to report</GovButton>}
        {source.data&&!source.data.can_create&&<div className="gov-note" role="status"><p>{source.data.location_needed?'Record the report barangay before creating a project.':source.data.projects.length?'This report already has an open project.':'This report cannot start new project coordination.'}</p>{source.data.projects.map(project=><Link key={project.id} className="gov-button" to={`/gov/projects?project=${project.id}`}>Open {project.reference}</Link>)}<GovButton onClick={closeCreation}>Back to report</GovButton></div>}
        {(creating||source.data?.can_create)&&<ProjectForm key={source.data?.version||'new'} source={source.data} options={options.data} onClose={closeCreation} onSaved={savedProject}/>}
    </GovWorkspace>;
}

function ProjectRecord({id,options,onClose,onChanged}){
    const record=useGovernmentData(`/api/gov/project-workspace/${id}`);
    const [tab,setTab]=useState('details');
    const [historyPage,setHistoryPage]=useState(1);
    const history=useGovernmentData(tab==='activity'?`/api/gov/project-workspace/${id}/history?page=${historyPage}`:null);
    const [action,setAction]=useState('');
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [notice,setNotice]=useState('');
    const [preview,setPreview]=useState(null);
    const form=useRef(null);
    const version=useRef(null);
    const reportVersion=useRef(null);
    const project=record.data;
    const allowed=project?.allowed_actions||[];
    function begin(value){version.current=project.version;reportVersion.current=project.source_report_version;setError('');setNotice('');setAction(value);}
    function refresh(){record.reload();history.reload();onChanged();}
    async function save(){
        if(busy||!form.current.reportValidity())return;
        setBusy(true);setError('');
        try{
            if(action==='upload'){
                const body=new FormData(form.current);body.set('target_model','ProjectRequest');body.set('target_id',id);
                await governmentRequest('/api/gov/documents/upload',{method:'POST',body});
                setNotice('Document saved. Uploading does not approve it or advance the project.');
            }else{
                const body={...Object.fromEntries(new FormData(form.current)),action,expected_version:version.current};
                if(action==='verify_report_resolution'){body.expected_report_version=reportVersion.current;body.report_issue_addressed=body.report_issue_addressed==='on';}
                for(const field of ['owner_id','document_id','dependency_id'])if(body[field])body[field]=Number(body[field]);else delete body[field];
                if(body.next_review_at)body.next_review_at=new Date(body.next_review_at).toISOString();else delete body.next_review_at;
                await governmentRequest(`/api/gov/project-workspace/${id}/commands`,{method:'POST',body});
                setNotice('Project record saved.');
            }
            setAction('');refresh();
        }catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    const proofType=action==='advance'?PROOF[project?.status]:action==='accept_completion'?'inspection_report':action==='record_certificate'?'completion_certificate':null;
    return <GovDetail title={project?`${project.reference} · ${project.title}`:'Project record'} onClose={onClose} actions={project&&<>{allowed.includes('advance')&&<GovButton primary onClick={()=>begin('advance')}>{NEXT[project.status]}</GovButton>}{['adopt','assign','accept_completion','return_for_work','record_certificate','verify_report_resolution'].filter(value=>allowed.includes(value)).map(value=><GovButton key={value} onClick={()=>begin(value)}>{ACTIONS[value]}</GovButton>)}{project.can_upload&&<GovButton onClick={()=>begin('upload')}><Upload size={15}/> Upload evidence</GovButton>}{allowed.includes('edit')&&<GovButton onClick={()=>begin('edit')}>Edit details</GovButton>}{allowed.includes('cancel')&&<GovButton onClick={()=>begin('cancel')}>Cancel coordination</GovButton>}</>}>
        <GovState loading={record.loading&&!project} error={record.error} onRetry={record.reload}/>
        {project&&!record.error&&<><GovStatus value={project.status} label={LABELS[project.status]||project.status}/><GovTabs label="Project record sections" value={tab} onChange={setTab} items={[{value:'details',label:'Details'},{value:'dependencies',label:'Follow-ups',count:project.pending_dependencies},{value:'documents',label:'Evidence'},{value:'activity',label:'Activity'}]}/>{notice&&<p role="status" className="gov-note">{notice}</p>}
            {tab==='details'&&<><p>{project.description}</p><dl className="gov-facts"><dt>Requesting office</dt><dd>{project.requesting_party||'Not recorded'}</dd><dt>Location</dt><dd>{project.location||project.barangay}</dd><dt>Engineering owner</dt><dd>{project.owner_name||'Unassigned'}</dd><dt>Next review</dt><dd>{formatDate(project.next_review_at)}</dd><dt>Last updated</dt><dd>{formatDate(project.updated_at)}</dd>{project.historical_status&&<><dt>Historical stage</dt><dd>{project.historical_status.replaceAll('_',' ')}</dd></>}{project.completion_reviewed_by&&<><dt>Completion reviewer</dt><dd>{project.completion_reviewed_by}</dd><dt>Completed</dt><dd>{formatDate(project.completed_at)}</dd></>}{project.certificate_reference&&<><dt>Official certificate</dt><dd>{project.certificate_reference}<small>Recorded {formatDate(project.certificate_recorded_at)}</small></dd></>}</dl>{project.source_report_id&&<p><Link className="gov-text-button" to={`/gov/reports?reportId=${project.source_report_id}`}>Open source report</Link></p>}{project.status==='historical_record'&&<p className="gov-note">The original stage is retained. Begin a coordination review to record current responsibilities and evidence.</p>}</>}
            {tab==='dependencies'&&<><div className="gov-summary-line">{allowed.includes('add_dependency')&&<GovButton onClick={()=>begin('add_dependency')}>Add external dependency</GovButton>}{allowed.includes('resolve_dependency')&&project.pending_dependencies>0&&<GovButton onClick={()=>begin('resolve_dependency')}>Record external response</GovButton>}</div>{project.dependencies.length?project.dependencies.map(item=><section className="gov-detail-section" key={item.id}><h3>{item.office}</h3><GovStatus value={item.status}/><p>{item.description}</p><dl className="gov-facts"><dt>Follow-up owner</dt><dd>{item.owner||'Not recorded'}</dd><dt>Next review</dt><dd>{formatDate(item.next_review_at)}</dd><dt>Reference</dt><dd>{item.reference||'Not recorded'}</dd>{item.resolution_reference&&<><dt>Response</dt><dd>{item.resolution_reference}</dd><dt>Recorded</dt><dd>{formatDate(item.resolved_at)}</dd></>}</dl></section>):<p>No external dependencies recorded.</p>}</>}
            {tab==='documents'&&<><p className="gov-note">Evidence remains private. Adding a file does not approve its contents.</p>{project.documents.length?<><label className="gov-field">Document<select value={preview||''} onChange={event=>setPreview(Number(event.target.value)||null)}><option value="">Choose document to view</option>{project.documents.map(document=><option key={document.id} value={document.id}>{document.file_name} · {DOC_TYPES[document.document_type]||document.document_type}</option>)}</select></label>{project.documents.find(document=>document.id===preview)&&<PrivateDocumentPreview document={project.documents.find(document=>document.id===preview)}/>}</>:<p>No accessible evidence documents in this record.</p>}</>}
            {tab==='activity'&&<><GovState loading={history.loading&&!history.data} error={history.error} onRetry={history.reload}/>{history.data&&!history.error&&<GovTable label="Project activity history" rows={history.data.items} rowKey={row=>row.id} pagination={{total:history.data.total,page:historyPage,onChange:setHistoryPage}} columns={[{key:'action',label:'Action',render:row=><>{row.action}<small>{row.actor||'Actor not recorded'} · {formatDate(row.at)}</small></>},{key:'details',label:'Decision',render:row=><ActivityNote value={row.details}/>}]} emptyMessage="No project activity recorded"/>}</>}
        </>}
        {action&&<GovConfirm open title={action==='upload'?'Upload project evidence':action==='advance'?NEXT[project.status]:ACTIONS[action]} confirmLabel={action==='upload'?'Upload evidence':'Save record'} busy={busy} error={error} onClose={()=>setAction('')} onConfirm={save}>
            <p>{action==='verify_report_resolution'?'Confirm that the completed project addressed the resident’s reported issue. This resolves the report and notifies the resident.':action==='record_certificate'?'Record an existing official certificate and its issuing office. PULSO does not issue the certificate.':action==='accept_completion'?'Review the submitted completion evidence and record your independent inspection. The source resident report keeps its own verification process.':action==='adopt'?'The original stage stays in history. This opens a coordination review without confirming funding or authorizing construction.':action==='cancel'?'End this coordination record. Source reports, work orders and evidence remain available.':action==='advance'?'Record the completed step and the next review date. Pending external dependencies must be resolved first.':action==='upload'?'Attach the original file to this project. Maximum 50 MB.':'Record the responsible person, supporting reference and reason where applicable.'}</p>
            <form ref={form} onSubmit={event=>{event.preventDefault();save();}}>
                {action==='verify_report_resolution'&&<label className="gov-field"><span><input name="report_issue_addressed" type="checkbox" required/> I reviewed the report and confirmed the reported issue has been addressed.</span></label>}
                {error.includes('changed')&&<GovButton onClick={()=>{setAction('');refresh();}}>Refresh project and review again</GovButton>}
                {action==='edit'&&<><label className="gov-field">Project title<input name="title" required minLength={3} maxLength={255} defaultValue={project.title}/></label><label className="gov-field">Description<textarea name="description" required minLength={10} rows={4} defaultValue={project.description}/></label><label className="gov-field">Location<input name="location_string" defaultValue={project.location||''} maxLength={1000}/></label></>}
                {['assign','add_dependency'].includes(action)&&<OwnerField options={options} districtId={project.district_id} defaultValue={project.owner_id}/>}
                {action==='add_dependency'&&<><label className="gov-field">External office<input name="office" required minLength={3} maxLength={255}/></label><label className="gov-field">What is needed<textarea name="description" required minLength={10} rows={3}/></label><label className="gov-field">Existing reference (optional)<input name="reference" maxLength={255}/></label></>}
                {['assign','add_dependency','advance','return_for_work'].includes(action)&&<label className="gov-field">Next review<input name="next_review_at" type="datetime-local" required/></label>}
                {action==='resolve_dependency'&&<><label className="gov-field">Pending follow-up<select name="dependency_id" required><option value="">Choose dependency</option>{project.dependencies.filter(item=>item.status==='pending').map(item=><option value={item.id} key={item.id}>{item.office} · {item.description}</option>)}</select></label><label className="gov-field">External response reference<input name="reference" required minLength={3} maxLength={255}/></label></>}
                {action==='record_certificate'&&<><label className="gov-field">Official certificate reference<input name="reference" required minLength={3} maxLength={255}/></label><label className="gov-field">Issuing office<input name="office" required minLength={3} maxLength={255}/></label></>}
                {proofType&&<label className="gov-field">{DOC_TYPES[proofType]}<select name="document_id" required><option value="">Choose uploaded evidence</option>{project.documents.filter(document=>document.document_type===proofType).map(document=><option key={document.id} value={document.id}>{document.file_name}</option>)}</select><small>Upload this evidence type first if no document is listed.</small></label>}
                {action==='upload'?<><label className="gov-field">Document type<select name="document_type">{Object.entries(DOC_TYPES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="gov-field">File<input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv" required/></label></>:<label className="gov-field">Reason<textarea name="reason" required minLength={10} maxLength={2000} rows={3}/></label>}
            </form>
        </GovConfirm>}
    </GovDetail>;
}

function OwnerField({options,districtId,defaultValue}){
    const owners=(options?.owners||[]).filter(person=>!person.district_ids.length||!districtId||person.district_ids.includes(Number(districtId)));
    return <label className="gov-field">Engineering owner<select name="owner_id" required defaultValue={defaultValue||''}><option value="">Choose engineering owner</option>{owners.map(person=><option value={person.id} key={person.id}>{person.name}</option>)}</select>{!owners.length&&<small>No eligible owner is available for this district.</small>}</label>;
}

function ActivityNote({value}){
    let record;try{record=JSON.parse(value);}catch{return value||'No additional note';}
    return <>{record.reason||'Project record updated'}{record.reference&&<small>{record.reference}</small>}{record.issuing_office&&<small>{record.issuing_office}</small>}</>;
}

function ProjectForm({options,onClose,onSaved,source}){
    const form=useRef(null);
    const [area,setArea]=useState(source?.barangay_id?String(source.barangay_id):'');
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const district=options?.areas.find(item=>item.id===Number(area))?.district_id;
    async function save(){
        if(busy||!form.current.reportValidity())return;
        setBusy(true);setError('');
        const body={...Object.fromEntries(new FormData(form.current))};
        body.barangay_id=Number(body.barangay_id);
        if(source){body.source_report_id=source.report_id;body.expected_source_version=source.version;}
        if(body.owner_id){body.owner_id=Number(body.owner_id);if(!body.next_review_at){setError('Choose the first review date.');setBusy(false);return;}body.next_review_at=new Date(body.next_review_at).toISOString();}else{delete body.owner_id;delete body.next_review_at;}
        try{onSaved(await governmentRequest('/api/gov/project-workspace',{method:'POST',body}));}catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    return <GovConfirm open title="Create project coordination record" confirmLabel="Create project" busy={busy} error={error} onClose={onClose} onConfirm={save}>
        {source&&error&&<p><Link className="gov-text-button" to={`/gov/reports?reportId=${source.report_id}`}>Review the current report and related projects</Link></p>}
        {source&&<p className="gov-note">Source report: {source.ticket}. Creating a project records a referral; the report retains its own review and resolution.</p>}
        <form ref={form} onSubmit={event=>{event.preventDefault();save();}}>
            <label className="gov-field">Project title<input name="title" required minLength={3} maxLength={255} defaultValue={source?`Engineering coordination for ${source.ticket}`:''}/></label><label className="gov-field">Description<textarea name="description" required minLength={10} maxLength={10000} rows={3} defaultValue={source?.description||''}/></label><label className="gov-field">Requesting office or party<input name="requesting_party" required minLength={3} maxLength={255}/></label>
            <label className="gov-field">Barangay<select name="barangay_id" value={area} required onChange={event=>setArea(event.target.value)}><option value="">Choose barangay</option>{options?.areas.map(item=><option key={item.id} value={item.id}>{/^\d+$/.test(item.name)?`Barangay ${item.name}`:item.name}</option>)}</select></label>
            <label className="gov-field">Site or address (optional)<input name="location_string" maxLength={1000} defaultValue={source?.location||''}/></label>
            <label className="gov-field">Engineering owner (optional)<select key={area} name="owner_id" defaultValue=""><option value="">Assign after intake review</option>{options?.owners.filter(person=>!person.district_ids.length||person.district_ids.includes(district)).map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label className="gov-field">First review date (required when assigning an owner)<input name="next_review_at" type="datetime-local"/></label>
            <label className="gov-field">Reason<textarea name="reason" required minLength={10} maxLength={2000} rows={3}/></label>
        </form>
    </GovConfirm>;
}
