import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovTabs, GovTable, GovDetail, GovState, GovStatus, GovConfirm, formatDate } from '../components/government/GovWorkspace';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import { getAuthUser } from '../utils/authSession';
import AssignWorkOrderModal from '../components/modals/AssignWorkOrderModal';
import GovInspectionModal from '../components/modals/GovInspectionModal';
import GovBlockerModal from '../components/modals/GovBlockerModal';
import WorkOrderCompletionModal from '../components/modals/WorkOrderCompletionModal';
import WorkOrderEvidence from '../components/WorkOrderEvidence';
import WorkNavigation from '../components/government/WorkNavigation';

const QUEUES=[['all','All orders'],['current','Current work'],['open','For assignment'],['assigned','Assigned'],['active','In progress'],['blocked','Blocked'],['completed_pending_review','For verification'],['completed','Completed'],['cancelled','Cancelled']];

export default function WorkOrdersWorkspace(){
    const [params,setParams]=useSearchParams();
    const page=Math.max(1,Number(params.get('page'))||1);
    const view=params.get('tab')||'all';
    const search=params.get('search')||'';
    const assignee=params.get('assignee');
    const records=useGovernmentData(`/api/gov/work-order-workspace?${new URLSearchParams({page:String(page),view,search,...(assignee?{assignee}:{})})}`);
    const [creating,setCreating]=useState(false);
    const [notice,setNotice]=useState('');
    const trigger=useRef(null);
    function change(name,value){setParams(current=>{const next=new URLSearchParams(current);value&&value!=='all'?next.set(name,value):next.delete(name);if(['tab','search'].includes(name))next.delete('page');return next;},{replace:name==='search'});}
    function close(){change('wo','');requestAnimationFrame(()=>trigger.current?.focus());}
    return <GovWorkspace title="Work orders" description="Assignments, field progress and independent completion review." actions={<><GovSearch value={search} onChange={value=>change('search',value)} placeholder="Search work order, location or owner"/><div className="gov-page-actions__group"><GovButton onClick={records.reload} disabled={records.loading}><RefreshCw size={15}/> Refresh</GovButton>{records.data?.can_create&&<GovButton primary onClick={()=>setCreating(true)}><Plus size={15}/> Create work order</GovButton>}</div></>}>
        <WorkNavigation value="work-orders"/>
        {assignee&&<p className="gov-note" role="status">Showing work for {records.data?.owner_filter || (assignee==='unassigned'?'unassigned orders':'the selected owner')}. <button type="button" className="gov-text-button" onClick={()=>change('assignee','')}>Clear owner filter</button></p>}
        <GovTabs label="Work order queues" value={view} onChange={value=>change('tab',value)} items={QUEUES.map(([value,label])=>({value,label,count:records.error?null:records.data?.counts[value]}))}/>
        {notice&&<p className="gov-note" role="status">{notice}</p>}
        <GovState loading={records.loading&&!records.data} error={records.error} onRetry={records.reload}/>
        {records.data&&!records.error&&<div className={`gov-record-layout ${params.get('wo')?'has-detail':''}`}><GovTable label="Work order register" rows={records.data.items} rowKey={work=>work.id} selected={Number(params.get('wo'))} onSelect={(work,element)=>{trigger.current=element;change('wo',String(work.id));}} pagination={{total:records.data.total,page,onChange:value=>change('page',String(value))}} columns={[
            {key:'wo_number',label:'Work order',render:work=><>{work.wo_number}<small>{work.title}</small></>},
            {key:'assigned_to_name',label:'Owner',render:work=><>{work.assigned_to_name||(work.assigned_to_id?`Official #${work.assigned_to_id}`:['completed','resolved','cancelled'].includes(work.status)?'Not recorded':'Unassigned')}{work.status==='open'&&work.assigned_to_id&&<small>Assignment not confirmed</small>}</>},
            {key:'priority',label:'Priority',render:work=><GovStatus value={work.priority}/>},
            {key:'status',label:'Status',render:work=><GovStatus value={work.status}/>},
            {key:'updated_at',label:'Updated',render:work=>formatDate(work.updated_at||work.created_at)},
        ]} emptyMessage={search?'No work orders match this search':'No work orders in this queue'}/>{params.get('wo')&&<WorkOrderRecord key={params.get('wo')} id={params.get('wo')} onClose={close} onChanged={()=>{records.reload();setNotice('Work order updated.');}}/>}</div>}
        <AssignWorkOrderModal isOpen={creating} onClose={()=>setCreating(false)} report={null} onSubmit={async values=>{
            const work=await governmentRequest('/api/gov/work-orders',{method:'POST',body:{title:values.title,wo_type:'preemptive',assigned_to_id:values.assigned_to_id,description:values.reason,priority:values.priority}});
            records.reload();setNotice(`${work.wo_number} created and assigned.`);change('wo',String(work.id));
        }}/>
    </GovWorkspace>;
}

function WorkOrderRecord({id,onClose,onChanged}){
    const navigate=useNavigate();
    const record=useGovernmentData(`/api/gov/work-orders/${id}`);
    const permissions=useGovernmentData(`/api/gov/work-order-actions/${id}`);
    const timeline=useGovernmentData(`/api/gov/timeline/work-order/${id}`);
    const [action,setAction]=useState('');
    const [owner,setOwner]=useState('');
    const [reason,setReason]=useState('');
    const [error,setError]=useState('');
    const [busy,setBusy]=useState(false);
    const form=useRef(null);
    const work=record.data;
    const staff=useGovernmentData(['assign','reassign'].includes(action)?`/api/gov/dispatch/eligible-assignees?wo_id=${id}`:null);
    const allowed=permissions.data?.allowed_actions||[];
    const user=getAuthUser();
    const proof=work?.updates?.find(update=>update.image_url)?.image_url;
    function refresh(){record.reload();permissions.reload();timeline.reload();onChanged();}
    function begin(value){setError('');setOwner('');setReason('');setAction(value);}
    async function confirm(){
        if(['assign','reassign','refer_project'].includes(action)&&!form.current.reportValidity())return;
        setBusy(true);setError('');
        try {
            if(action==='refer_project'){
                const project=await governmentRequest(`/api/gov/work-orders/${id}/promote`,{method:'POST',body:{reason:reason.trim(),expected_updated_at:work.updated_at}});
                setAction('');navigate(`/gov/projects?project=${project.id}`);return;
            }
            await governmentRequest(['assign','reassign'].includes(action)?`/api/gov/work-orders/${id}/${action==='assign'?'assignment':'reassignment'}`:`/api/gov/agents/work-orders/${id}/status`,{method:['assign','reassign'].includes(action)?'POST':'PATCH',body:['assign','reassign'].includes(action)?{assigned_to_id:Number(owner),reason:reason.trim(),...(action==='reassign'?{expected_assignment_version:work.assignment_version}:{})}:{status:'in_progress'}});
            setAction('');refresh();
        }catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    return <GovDetail title={work?.wo_number||`Work #${id}`} onClose={onClose} actions={!record.error&&!permissions.error?<>
        {allowed.includes('assign')&&<GovButton primary onClick={()=>begin('assign')}>Assign work owner</GovButton>}
        {allowed.includes('reassign')&&<GovButton onClick={()=>begin('reassign')}>Reassign work owner</GovButton>}
        {allowed.includes('start')&&<GovButton primary onClick={()=>begin('start')}>Start work</GovButton>}
        {allowed.includes('submit_completion')&&<GovButton primary onClick={()=>begin('complete')}>Submit completion proof</GovButton>}
        {allowed.includes('block')&&<GovButton onClick={()=>begin('block')}>Report blocker</GovButton>}
        {allowed.includes('unblock')&&<GovButton onClick={()=>begin('unblock')}>Clear blocker</GovButton>}
        {allowed.includes('verify')&&<GovButton primary onClick={()=>begin('verify')}>Review completion</GovButton>}
        {allowed.includes('refer_project')&&<GovButton onClick={()=>begin('refer_project')}>Create project referral</GovButton>}
    </>:null}>
        <GovState loading={record.loading&&!work} error={record.error||permissions.error} onRetry={()=>{record.reload();permissions.reload();}}/>
        {work&&!record.error&&<>
            <section><h3>{work.title}</h3><GovStatus value={work.status}/>{work.description&&<p>{work.description}</p>}<dl className="gov-facts"><dt>Owner</dt><dd>{work.assigned_to_name||'Unassigned'}</dd><dt>Assigned by</dt><dd>{work.assigned_by_name||'Not recorded'}</dd><dt>Priority</dt><dd><GovStatus value={work.priority}/></dd><dt>Location</dt><dd>{work.location_string||work.barangay||'Not recorded'}</dd><dt>Created</dt><dd>{formatDate(work.created_at)}</dd><dt>Updated</dt><dd>{formatDate(work.updated_at)}</dd>{work.report_id&&<><dt>Source report</dt><dd><Link className="gov-text-button" to={`/gov/reports?reportId=${work.report_id}`}>Open report #{work.report_id}</Link></dd></>}</dl></section>
            {work.project_id&&<p><Link className="gov-text-button" to={`/gov/projects?project=${work.project_id}`}>Open linked project coordination</Link></p>}
            {work.status==='blocked'&&<section><h3>Recorded blocker</h3><p>{work.notes||'See the work history for the recorded reason.'}</p></section>}
            <section><h3>Completion evidence</h3><WorkOrderEvidence url={proof} title={work.title}/></section>
            <section><h3>Assignment and status history</h3><GovState loading={timeline.loading&&!timeline.data} error={timeline.error} onRetry={timeline.reload}/>{timeline.data&&!timeline.error?<ul className="gov-inline-list">{[...timeline.data].reverse().map(entry=><li key={entry.id}><GovStatus value={entry.status}/><p>{entry.note||'Status recorded.'}</p><small>{entry.actor_name||'Recorded staff'} · {formatDate(entry.created_at)}</small></li>)}</ul>:null}</section>
            <section><h3>Work history</h3>{work.updates?.length?<ul className="gov-inline-list">{[...work.updates].reverse().map(update=><li key={update.id}><GovStatus value={update.new_status}/><p>{update.comment||'No note recorded.'}</p><small>{update.user_name||'Recorded staff'} · {formatDate(update.created_at)}</small></li>)}</ul>:<p>No field updates recorded.</p>}</section>
        </>}
        <GovConfirm open={['assign','reassign','start','refer_project'].includes(action)} title={action==='refer_project'?'Create project referral?':action==='reassign'?'Transfer this work order?':action==='assign'?'Assign this work order?':'Start this work order?'} confirmLabel={action==='refer_project'?'Create linked project':action==='reassign'?'Transfer owner':action==='assign'?'Assign owner':'Start work'} busy={busy} error={error||staff.error} onConfirm={confirm} onClose={()=>setAction('')}>
            <p>{action==='refer_project'?'Create a linked coordination record for work that needs a larger project. The work order keeps its recorded status.':action==='reassign'?'The new owner will receive this work in My work. Existing progress and evidence remain on this work order. Record why responsibility is changing.':action==='assign'?'The selected employee will own this job and receive it in My work.':'This records that field work has started and updates the linked report. Confirm that you are ready to begin.'}</p>
            {action==='refer_project'&&<form ref={form} onSubmit={event=>{event.preventDefault();confirm();}}><label className="gov-field">Referral reason<textarea required minLength={10} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label></form>}
            {['assign','reassign'].includes(action)&&<form ref={form} onSubmit={event=>{event.preventDefault();confirm();}}><label className="gov-field">Work owner<select required value={owner} disabled={staff.loading||Boolean(staff.error)} onChange={event=>setOwner(event.target.value)}><option value="">Choose an eligible employee</option>{(staff.data||[]).filter(person=>action!=='reassign'||person.id!==work.assigned_to_id).map(person=><option key={person.id} value={person.id}>{person.full_name} · {person.role.replaceAll('_',' ')} · {person.active_work_count} current orders</option>)}</select></label>{!staff.loading&&!staff.error&&!staff.data?.length&&<p>No eligible employees are available. A coordinator needs to review coverage.</p>}<label className="gov-field">Assignment reason<textarea required minLength={10} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label></form>}
        </GovConfirm>
        {work&&<><GovBlockerModal isOpen={['block','unblock'].includes(action)} onClose={()=>setAction('')} workOrder={work} isResolving={action==='unblock'} onUpdated={()=>{setAction('');refresh();}}/><GovInspectionModal isOpen={action==='verify'} onClose={()=>setAction('')} workOrder={work} currentUser={user} onVerified={()=>{setAction('');refresh();}}/>{action==='complete'&&<WorkOrderCompletionModal workOrder={work} onClose={()=>setAction('')} onSubmitted={()=>{setAction('');refresh();}}/>}</>}
    </GovDetail>;
}
