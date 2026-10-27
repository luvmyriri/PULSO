import { useRef,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { GovWorkspace,GovButton,GovSelect,GovTable,GovState,GovStatus,GovConfirm,formatDate } from '../components/government/GovWorkspace';
import { governmentRequest,useGovernmentData } from '../utils/governmentApi';

const LABELS={pending:'Queued',waiting_configuration:'Waiting for email service',sending:'Sending',retry:'Scheduled retry',smtp_accepted:'Accepted by email service',failed:'Failed',uncertain:'Outcome unknown',cancelled:'Cancelled'};
const ERRORS={authentication_failed:'Email service authentication failed',recipient_refused:'Recipient address was refused',smtp_rejected:'Email service rejected the message',connection_failed:'Could not connect to the email service',acceptance_unknown:'Connection ended before acceptance could be confirmed',worker_interrupted:'Delivery processing was interrupted',eligibility_changed:'Recipient preference or report relationship changed',invalid_target:'The destination link needs review',smtp_failed:'Email service could not complete the request',unexpected_transport_result:'Delivery outcome could not be confirmed'};

export default function GovNotificationDeliveryPage(){
    const [params,setParams]=useSearchParams();
    const page=Math.max(1,Number(params.get('page'))||1);
    const status=params.get('status')||'all';
    const records=useGovernmentData(`/api/gov/notification-deliveries?${new URLSearchParams({page:String(page),status})}`);
    const [selected,setSelected]=useState(null);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [notice,setNotice]=useState('');
    const form=useRef(null);
    async function retry(){
        if(busy||!form.current.reportValidity())return;
        setBusy(true);setError('');
        try{const saved=await governmentRequest(`/api/gov/notification-deliveries/${selected.id}/retry`,{method:'POST',body:{expected_attempts:selected.attempts,reason:new FormData(form.current).get('reason')}});setSelected(null);setNotice(saved.message);records.reload();}catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    return <GovWorkspace title="Notification delivery" parent={{label:'Updates',to:'/gov/announcements'}} description="Email queue outcomes for resident report and related city updates." actions={<><Link className="gov-button" to="/gov/announcements">Back to updates</Link><GovButton disabled={records.loading} onClick={records.reload}><RefreshCw size={15}/> Refresh</GovButton></>}>
        <div className="gov-summary-line"><GovSelect label="Email status" value={status} onChange={value=>setParams(value==='all'?{}:{status:value})} options={[{value:'all',label:'All outcomes'},...Object.entries(LABELS).map(([value,label])=>({value,label}))]}/>{records.data&&<span>Email service: {records.data.email_service==='configured'?'configured':'not configured'}</span>}</div>
        <p className="gov-note">Only residents who choose email receive these notices. Acceptance by the email service does not confirm mailbox delivery. Unknown outcomes are held for review to avoid duplicate messages.</p>
        {notice&&<p role="status">{notice}</p>}<GovState loading={records.loading&&!records.data} error={records.error} onRetry={records.reload}/>
        {records.data&&!records.error&&<GovTable label="Resident email delivery queue" rows={records.data.items} rowKey={row=>row.id} pagination={{total:records.data.total,page,onChange:value=>setParams(current=>{const next=new URLSearchParams(current);next.set('page',String(value));return next;})}} columns={[
            {key:'reference',label:'Related record',render:row=><Link className="gov-text-button" to={row.target_url}>{row.reference}</Link>},
            {key:'status',label:'Outcome',render:row=><><GovStatus value={row.status} label={LABELS[row.status]}/>{row.error_code&&<small>{ERRORS[row.error_code]||'Delivery needs review'}</small>}</>},
            {key:'attempts',label:'Attempts'},
            {key:'next_attempt_at',label:'Next attempt',render:row=>['pending','retry','waiting_configuration'].includes(row.status)?formatDate(row.next_attempt_at):'—'},
            {key:'accepted_at',label:'Accepted',render:row=>row.accepted_at?formatDate(row.accepted_at):'—'},
            {key:'action',label:'Action',render:row=>row.can_retry?<GovButton onClick={()=>{setError('');setSelected(row);}}>Queue retry</GovButton>:'—'},
        ]} emptyMessage={status==='all'?'No email notices queued':'No deliveries match this status'}/>}
        <GovConfirm open={Boolean(selected)} title="Queue email retry?" confirmLabel="Queue retry" busy={busy} error={error} onClose={()=>setSelected(null)} onConfirm={retry}><p>The worker will check current consent, recipient and report relevance before sending.</p><form ref={form} onSubmit={event=>{event.preventDefault();retry();}}><label className="gov-field">Retry reason<textarea name="reason" required minLength={10} maxLength={2000} rows={3}/></label></form></GovConfirm>
    </GovWorkspace>;
}
