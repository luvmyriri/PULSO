import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { GovWorkspace, GovButton, GovConfirm, GovSearch, GovSelect, GovState, GovTable, GovTabs, GovStatus, formatDate } from '../components/government/GovWorkspace';
import AssetRecord from '../components/government/AssetRecord';
import FieldSurveyDialog from '../components/government/FieldSurveyDialog';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';

const CATEGORIES=['Roads','Drainage','Bridges','Public Buildings','Facilities'];
const CONDITIONS=[{value:'all',label:'All conditions'},{value:'unknown',label:'Needs assessment'},...['critical','poor','fair','good'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))];

export default function GovAssetsWorkspace() {
    const [params,setParams]=useSearchParams();
    const page=Math.max(1,Number(params.get('page'))||1);
    const category=params.get('category')||'all';
    const condition=params.get('condition')||'all';
    const search=params.get('search')||'';
    const assetId=params.get('asset');
    const query=new URLSearchParams({page:String(page),search});
    if(category!=='all')query.set('category',category);
    if(condition!=='all')query.set('condition',condition);
    const records=useGovernmentData(`/api/gov/asset-workspace?${query}`);
    const permissions=useGovernmentData('/api/gov/asset-permissions');
    const fieldPermissions=useGovernmentData('/api/gov/field-inventory/permissions');
    const [fieldRecording,setFieldRecording]=useState(false);
    const areas={...permissions,data:permissions.data?.barangays||[]};
    const [registering,setRegistering]=useState(false);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [notice,setNotice]=useState('');
    const form=useRef(null);
    const returnFocus=useRef(null);
    function change(name,value){setParams(current=>{const next=new URLSearchParams(current);value&&value!=='all'?next.set(name,value):next.delete(name);if(['category','condition','search'].includes(name))next.delete('page');return next;},{replace:name==='search'});}
    function close(){change('asset','');requestAnimationFrame(()=>returnFocus.current?.focus());}
    async function register(){
        if(!form.current.reportValidity())return;
        setBusy(true);setError('');
        const values=Object.fromEntries(new FormData(form.current));
        const area=(areas.data||[]).find(item=>String(item.id)===values.barangay_id);
        try {
            const created=await governmentRequest('/api/gov/assets',{method:'POST',body:{asset_id:values.asset_id.trim()||null,asset_name:values.asset_name.trim(),category:values.category,barangay_id:Number(values.barangay_id),barangay:area?.name,material_type:values.material_type.trim()||null,condition_score:values.condition_score===''?null:Number(values.condition_score)}});
            setRegistering(false);setNotice(`Asset ${created.asset_id} registered.`);records.reload();change('asset',created.asset_id);
        }catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    return <GovWorkspace title="Infrastructure" description="Registered assets, recorded condition and maintenance history." actions={<><GovSearch value={search} onChange={value=>change('search',value)} placeholder="Search asset, ID or barangay"/><div className="gov-page-actions__group"><GovButton onClick={records.reload} disabled={records.loading}><RefreshCw size={15}/> Refresh</GovButton>{fieldPermissions.data?.record&&<GovButton onClick={()=>setFieldRecording(true)}><Plus size={15} aria-hidden="true"/> Record field candidate</GovButton>}{permissions.data?.register&&<GovButton primary onClick={()=>{setError('');setRegistering(true);}}><Plus size={15}/> Register asset</GovButton>}</div></>}>
        <GovTabs label="Infrastructure categories" value={category} onChange={value=>change('category',value)} items={[{value:'all',label:'All assets'},...CATEGORIES.map(value=>({value,label:value}))]}/>
        <div className="gov-summary-line"><GovSelect label="Condition" value={condition} onChange={value=>change('condition',value)} options={CONDITIONS}/>{records.data&&<span><strong>{records.data.total}</strong> matching assets · Updated {formatDate(records.fetchedAt)}</span>}</div>
        {notice&&<p className="gov-note" role="status">{notice}</p>}
        {fieldPermissions.error&&<p className="gov-note" role="status">Field-survey access could not be loaded. <GovButton onClick={fieldPermissions.reload}>Retry field-survey access</GovButton></p>}
        <GovState loading={records.loading&&!records.data} error={records.error||permissions.error} onRetry={()=>{records.reload();permissions.reload();}}/>
        {records.data&&!records.error&&<div className={`gov-record-layout ${assetId?'has-detail':''}`}><GovTable label="Infrastructure register" rows={records.data.items} rowKey={asset=>asset.asset_id} selected={assetId} onSelect={(asset,trigger)=>{returnFocus.current=trigger;change('asset',asset.asset_id);}} pageSize={15} pagination={{total:records.data.total,page,onChange:value=>change('page',String(value))}} columns={[
            {key:'asset_name',label:'Asset',render:asset=><>{asset.asset_name}<small>{asset.asset_id}</small></>},
            {key:'barangay',label:'Location',render:asset=><>{/^\d+$/.test(asset.barangay||'')?`Barangay ${asset.barangay}`:asset.barangay||'Not recorded'}<small>{asset.category}</small></>},
            {key:'condition_score',label:'Recorded condition',render:asset=><><GovStatus value={asset.condition_tier} label={asset.condition_score==null?'Needs assessment':asset.condition_tier}/><small>{asset.condition_score==null?'No score recorded':`${asset.condition_score}/100`}</small></>},
            {key:'active_work_orders_count',label:'Open work'},
        ]} emptyMessage={search||condition!=='all'||category!=='all'?'No assets match these filters':'No assets registered'}/>{assetId&&<AssetRecord key={assetId} assetId={assetId} permissions={permissions.data} onClose={close} onSaved={records.reload}/>}</div>}
        <GovConfirm open={registering} title="Register infrastructure" confirmLabel="Register asset" busy={busy} error={error} onClose={()=>setRegistering(false)} onConfirm={register}>
            <p>Enter details from the asset record. Leave the condition score blank until assessed.</p><form ref={form} onSubmit={event=>{event.preventDefault();register();}}><label className="gov-field">Asset name<input name="asset_name" required minLength={3} maxLength={255}/></label><div className="gov-form-grid"><label className="gov-field">Asset ID (optional)<input name="asset_id" maxLength={100}/><small>Leave blank to generate an ID.</small></label><label className="gov-field">Category<select name="category" required defaultValue=""><option value="" disabled>Choose category</option>{CATEGORIES.map(value=><option key={value}>{value}</option>)}</select></label></div><label className="gov-field">Barangay<select name="barangay_id" required defaultValue="" disabled={areas.loading||Boolean(areas.error)}><option value="">{areas.loading?'Loading barangays…':'Choose barangay'}</option>{(areas.data||[]).map(area=><option key={area.id} value={area.id}>{/^\d+$/.test(area.name)?`Barangay ${area.name}`:area.name}</option>)}</select></label>{areas.error&&<p role="alert">Barangays could not be loaded. <GovButton onClick={areas.reload}>Try again</GovButton></p>}<label className="gov-field">Material (optional)<input name="material_type" maxLength={100}/></label><label className="gov-field">Recorded condition score (optional)<input name="condition_score" type="number" min="0" max="100" step="0.1"/><small>0–100, only when supported by an existing assessment.</small></label></form>
        </GovConfirm>
        {fieldRecording&&<FieldSurveyDialog permissions={fieldPermissions.data} onClose={()=>setFieldRecording(false)} onSaved={result=>{setNotice(`Candidate ${result.asset.asset_id} and observation ${result.observation.id} saved for independent review.`);records.reload();change('asset',result.asset.asset_id);}}/>}
    </GovWorkspace>;
}

export function GovAssetRecordPage(){
    const {assetId}=useParams();
    const navigate=useNavigate();
    const permissions=useGovernmentData('/api/gov/asset-permissions');
    return <GovWorkspace title="Infrastructure record" parent={{label:'Infrastructure',to:'/gov/assets'}} actions={<Link className="gov-button" to="/gov/assets">Back to register</Link>}><div className="report-full-docket"><AssetRecord key={assetId} assetId={assetId} permissions={permissions.data} onClose={()=>navigate('/gov/assets')}/></div></GovWorkspace>;
}
