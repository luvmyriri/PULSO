import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovTable, GovDetail, GovState, formatDate } from '../components/government/GovWorkspace';
import { useGovernmentData } from '../utils/governmentApi';

const money=value=>value==null?'Not recorded':new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(value);

export default function GovFinancialHistoryPage(){
    const [params,setParams]=useSearchParams();
    const page=Math.max(1,Number(params.get('page'))||1);
    const search=params.get('search')||'';
    const id=params.get('record');
    const trigger=useRef(null);
    const records=useGovernmentData(`/api/gov/financial-history?${new URLSearchParams({page:String(page),search})}`);
    function change(key,value){setParams(current=>{const next=new URLSearchParams(current);value?next.set(key,value):next.delete(key);if(key==='search')next.delete('page');next.delete('view');next.delete('tab');return next;},{replace:key==='search'});}
    function close(){change('record','');requestAnimationFrame(()=>trigger.current?.focus());}
    return <GovWorkspace title="Historical procurement records" description="Retained references from earlier records. Financial processing is handled by the responsible city office." breadcrumb="Records" actions={<><GovSearch value={search} onChange={value=>change('search',value)} placeholder="Search reference or title"/><div className="gov-page-actions__group"><Link className="gov-button" to="/gov/records-workspace"><ArrowLeft size={15}/> Records</Link><GovButton onClick={records.reload} disabled={records.loading}><RefreshCw size={15}/> Refresh</GovButton></div></>}>
        <GovState loading={records.loading&&!records.data} error={records.error} onRetry={records.reload}/>
        {records.data&&!records.error&&<div className={`gov-record-layout ${id?'has-detail':''}`}><GovTable label="Historical procurement register" rows={records.data.items} rowKey={row=>row.id} selected={Number(id)} onSelect={(row,element)=>{trigger.current=element;change('record',String(row.id));}} pagination={{page,total:records.data.total,onChange:value=>change('page',String(value))}} columns={[
            {key:'pr_number',label:'Reference',render:row=><>{row.pr_number}<small>{row.title}</small></>},
            {key:'status',label:'Recorded status',render:row=>row.status.replaceAll('_',' ')},
            {key:'total_estimated_cost',label:'Historical estimate',render:row=>money(row.total_estimated_cost)},
            {key:'created_at',label:'Recorded',render:row=>formatDate(row.created_at)},
        ]}/>{id&&<HistoricalRecord key={id} id={id} onClose={close}/>}</div>}
    </GovWorkspace>;
}

function HistoricalRecord({id,onClose}){
    const record=useGovernmentData(`/api/gov/procurement/${id}`);
    const item=record.data;
    return <GovDetail title={item?.pr_number||'Historical record'} onClose={onClose}>
        <GovState loading={record.loading&&!item} error={record.error} onRetry={record.reload}/>
        {item&&!record.error&&<><h3>{item.title}</h3><p>{item.purpose}</p><dl className="gov-facts"><dt>Recorded status</dt><dd>{item.status.replaceAll('_',' ')}</dd><dt>Raised by</dt><dd>{item.raised_by_name||'Not recorded'}</dd><dt>Recorded</dt><dd>{formatDate(item.created_at)}</dd><dt>Historical estimate</dt><dd>{money(item.total_estimated_cost)}</dd></dl>
            <h3>Recorded quantities</h3><GovTable label="Historical line items" rows={item.items} rowKey={row=>row.id} columns={[{key:'item_name',label:'Item'},{key:'quantity',label:'Quantity',render:row=>`${row.quantity} ${row.unit||''}`},{key:'unit_cost',label:'Unit estimate',render:row=>money(row.unit_cost)},{key:'total_cost',label:'Total estimate',render:row=>money(row.total_cost)}]}/>
        </>}
    </GovDetail>;
}
