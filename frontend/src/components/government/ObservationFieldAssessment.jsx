/* Local Operate extension: evidence comparison leads; each category stays explicit.
   Inherit Reports typography, semantic theme tokens, ruled history and shared controls.
   Inspect a field visit, compare the original report, confirm findings, retain the receipt.
   Inline section after concern review; paired evidence stacks on narrow layouts.
   No new visual world, navigation, lifecycle or automatic repair claim. Figma guest inspection: Nov 7, 2026. */
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {GovButton,GovConfirm,GovState,formatDate} from './GovWorkspace';
import RecordedReportEvidence from './RecordedReportEvidence';
import {governmentRequest,useGovernmentData} from '../../utils/governmentApi';
import {getAuthToken} from '../../utils/authSession';
import {API_BASE_URL} from '../../utils/apiBase';
import {reportDraftPrincipal} from '../../utils/residentReportDraft';
import useResidentReportDraft,{useReportDraftPrincipal} from '../../hooks/useResidentReportDraft';
import {FIELD_FINDINGS,FIELD_BLOCKERS,fieldAssessmentDecision,createFieldAssessmentCommand,fetchFieldPhoto} from '../../utils/observationField';
import './observation-field.css';

function Blockers({values}) {
    return values?.length?<ul className="field-assessment-blockers">{values.map(value=><li key={value}>{FIELD_BLOCKERS[value]||'The evidence requirements changed. Refresh this visit before recording.'}</li>)}</ul>:null;
}

function FieldPhotoInspection({url,description,onClose}) {
    const dialog=useRef(null),title=useId(),[full,setFull]=useState(false);
    useEffect(()=>{
        const element=dialog.current,prior=document.activeElement;
        element.showModal();
        return()=>{element.close();if(prior?.isConnected)prior.focus();};
    },[]);
    return <dialog ref={dialog} className="gov-confirm field-photo-inspection" aria-labelledby={title}
        onCancel={event=>{event.preventDefault();onClose();}}>
        <h2 id={title}>Inspect private field photo</h2>
        <p className="gov-note">Original stored image. Full resolution enables scrolling within the photo; the report and draft stay open.</p>
        <div className="gov-form-actions"><GovButton onClick={onClose}>Close photo inspection</GovButton><GovButton aria-pressed={full} onClick={()=>setFull(value=>!value)}>{full?'Fit photo to view':'Show full resolution'}</GovButton></div>
        <div className={`field-photo-inspection-region ${full?'is-full-resolution':''}`} role="region" aria-label="Private photo inspection area" tabIndex={0}>
            <img src={url} alt={description}/>
        </div>
    </dialog>;
}

export default function ObservationFieldAssessment(props) {
    const [open,setOpen]=useState(false),principal=useReportDraftPrincipal();
    const id=useId();
    return <section className="observation-field-assessment" aria-label="Reported category field findings">
        <h4>Field findings</h4>
        <p className="gov-note">Compare a reviewed field visit with this reported problem. Each category keeps its own finding; report resolution remains separate.</p>
        <GovButton aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>{open?'Hide field findings':'Review field findings'}</GovButton>
        <div id={id} hidden={!open}>{open&&<FieldAssessmentWorkspace key={`${principal}:${props.reportId}:${props.item.id}`} {...props} principal={principal}/>}</div>
    </section>;
}

function FieldAssessmentWorkspace({reportId,item,reportEvidence,principal}) {
    const path=`/api/report-intelligence/reports/${reportId}/observations/${item.id}/field-assessments`;
    const history=useGovernmentData(path),[before,setBefore]=useState('');
    const sources=useGovernmentData(`${path}/sources${before?`?before_id=${encodeURIComponent(before)}`:''}`);
    const [sourceId,setSourceId]=useState(''),[findings,setFindings]=useState({}),[identity,setIdentity]=useState(false),[reason,setReason]=useState('');
    const [storage,setStorage]=useState({loading:true,pending:false,error:''}),[storageRevision,setStorageRevision]=useState(0);
    const [receipt,setReceipt]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false),[confirmation,setConfirmation]=useState(null);
    const [photo,setPhoto]=useState({url:'',busy:false,error:'',viewed:''});
    const [inspection,setInspection]=useState(false);
    const form=useRef(null),saving=useRef(false),alive=useRef(false),notice=useRef(null),errorFocus=useRef(null),photoRequest=useRef(null),photoGeneration=useRef({value:0}),photoUrl=useRef(null);
    const driver=useMemo(()=>createFieldAssessmentCommand({principal,path,request:(url,options)=>{
        const token=getAuthToken();
        if(reportDraftPrincipal(token)!==principal)throw new Error('The signed-in account changed. Reopen this report with the original account.');
        return governmentRequest(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token}`}});
    }}),[principal,path]);
    const data=useMemo(()=>({sourceId,findings,identity,reason}),[sourceId,findings,identity,reason]);
    const draft=useResidentReportDraft({kind:`field-assessment:${path}`,principal,data,hasContent:Boolean(sourceId||reason||Object.keys(findings).length),restore:value=>{
        if(value&&(typeof value.sourceId!=='string'||typeof value.reason!=='string'||typeof value.identity!=='boolean'||
            !value.findings||typeof value.findings!=='object'||Array.isArray(value.findings)))throw new Error('Invalid field assessment draft.');
        setSourceId(value?.sourceId||'');setFindings(value?.findings||{});setIdentity(value?.identity||false);setReason(value?.reason||'');
    }});
    const selected=storage.pending?storage.original?.field_observation_id:sourceId;
    const context=useGovernmentData(selected?`${path}/evidence/${encodeURIComponent(selected)}`:null);
    const ready=history.data&&!history.loading&&!history.error;
    const evidenceReady=ready&&context.data&&!context.loading&&!context.error&&context.data.field.field_observation_id===selected;
    const stamp=evidenceReady?`${context.data.expected_field_sha256}:${context.data.problem.report_version}:${context.data.problem.concern_version}:${context.data.expected_revision}`:'';
    const locked=busy||storage.loading||storage.pending||Boolean(storage.error)||draft.locked||!draft.ready||['load_error','save_error'].includes(draft.status)||conflict;
    const canRecord=evidenceReady&&context.data.can_record===true&&history.data.can_record_review===true;
    const viewed=Boolean(stamp&&photo.viewed===stamp);
    useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
    useEffect(()=>{
        let active=true;
        driver.load().then(record=>{if(!active)return;setStorage({loading:false,pending:record?.state==='pending',original:record?.payload,error:''});if(record?.state==='confirmed')setReceipt(record.receipt);})
            .catch(()=>{if(active)setStorage({loading:false,pending:false,error:'Device recovery storage could not be opened. Retry storage before recording findings.'});});
        return()=>{active=false;};
    },[driver,storageRevision]);
    useEffect(()=>{
        const clock=photoGeneration.current;clock.value++;photoRequest.current?.abort();setPhoto({url:'',busy:false,error:'',viewed:''});setInspection(false);
        if(photoUrl.current)URL.revokeObjectURL(photoUrl.current);photoUrl.current=null;
        return()=>{clock.value++;photoRequest.current?.abort();if(photoUrl.current)URL.revokeObjectURL(photoUrl.current);photoUrl.current=null;};
    },[stamp]);
    useEffect(()=>{if(error&&!busy){const frame=requestAnimationFrame(()=>errorFocus.current?.focus());return()=>cancelAnimationFrame(frame);}},[error,busy]);
    function refresh(){setConflict(false);setError('');history.reload();context.reload();sources.reload();}
    async function openPhoto(){
        if(!evidenceReady||photo.busy)return;
        const generation=++photoGeneration.current.value;photoRequest.current?.abort();const controller=new AbortController();photoRequest.current=controller;
        setPhoto({url:'',busy:true,error:'',viewed:''});
        try{
            if(reportDraftPrincipal(getAuthToken())!==principal)throw new Error('The signed-in account changed. Reopen this report.');
            const blob=await fetchFieldPhoto(context.data,{token:getAuthToken(),apiBase:API_BASE_URL,signal:controller.signal});
            if(!alive.current||generation!==photoGeneration.current.value)return;
            if(photoUrl.current)URL.revokeObjectURL(photoUrl.current);photoUrl.current=URL.createObjectURL(blob);
            setPhoto({url:photoUrl.current,busy:false,error:'',viewed:''});
        }catch(cause){if(alive.current&&generation===photoGeneration.current.value)setPhoto({url:'',busy:false,error:cause.message,viewed:''});}
    }
    async function prepare(){
        if(locked||!canRecord||!viewed||saving.current||!form.current?.reportValidity())return;
        saving.current=true;setBusy(true);setError('');
        try{const body=fieldAssessmentDecision(context.data,findings,identity,reason);await draft.flush();if(alive.current)setConfirmation(body);}
        catch(cause){if(alive.current)setError(cause.message);}
        finally{saving.current=false;if(alive.current)setBusy(false);}
    }
    async function execute(recovery=false){
        if(saving.current||(!recovery&&(!canRecord||!viewed)))return;
        saving.current=true;setBusy(true);setError('');
        try{
            const result=await driver.submit(recovery?null:confirmation);
            if(!alive.current)return;
            setReceipt(result);setConfirmation(null);
            try{const record=await driver.load();if(alive.current)setStorage({loading:false,pending:record?.state==='pending',original:record?.payload,error:''});}
            catch{if(alive.current)setStorage({loading:false,pending:true,original:recovery?storage.original:confirmation,error:'The saved assessment is confirmed, but device receipt storage could not be checked. Retry device storage.'});}
            try{await draft.clear({confirmed:true});await draft.reload();}catch{if(alive.current)setReceipt({...result,draftWarning:true});}
            history.reload();context.reload();requestAnimationFrame(()=>notice.current?.focus());
        }catch(cause){
            if(!alive.current)return;
            setError(cause.status===409?'The context changed. Your draft is retained. Reload the evidence, check each finding and confirm again.':cause.message);
            if(cause.status===409)setConflict(true);
            try{const record=await driver.load();if(alive.current)setStorage({loading:false,pending:record?.state==='pending',original:record?.payload,error:''});}
            catch{if(alive.current)setStorage({loading:false,pending:true,error:'The original save could not be opened. Retry device recovery storage.'});}
            setConfirmation(null);
        }finally{saving.current=false;if(alive.current)setBusy(false);}
    }
    return <div className="field-assessment-workspace">
        <GovState loading={history.loading} error={history.error} onRetry={history.reload}/>
        {receipt?.assessment&&<p ref={notice} tabIndex={-1} role="status" className="gov-note concern-receipt">Recorded field assessment #{receipt.assessment.id}, revision {receipt.assessment.revision}. Report status and concern membership were unchanged.
            {receipt.cleanupWarning&&' Device receipt storage needs recovery. Retrying the original save will recover the same assessment.'}
            {receipt.draftWarning&&' The saved device draft could not be cleared. Reload draft storage before recording another judgment.'}</p>}
        {storage.loading&&<p role="status">Checking for an interrupted assessment…</p>}
        {storage.error&&<div role="alert"><p>{storage.error}</p><GovButton onClick={()=>setStorageRevision(n=>n+1)}>Retry device storage</GovButton></div>}
        {storage.pending&&<div role="status"><p>A previous save has an uncertain result. Recover it before recording another assessment.</p><p>{storage.original?.reason}</p>
            <GovButton disabled={busy||storage.loading||Boolean(storage.error)} onClick={()=>void execute(true)}>{busy?'Recovering assessment…':'Recover original assessment'}</GovButton></div>}
        {!draft.ready&&<p role="status">Opening the saved field-assessment draft…</p>}
        {draft.status==='restored'&&!storage.pending&&<p role="status" className="gov-note">Draft restored. Check the current evidence before recording it.</p>}
        {['saving','saved'].includes(draft.status)&&!storage.pending&&<p role="status" className="gov-note">{draft.status==='saving'?'Saving draft on this device…':'Draft saved on this device; these changes are not recorded yet.'}</p>}
        {draft.status==='expired'&&<p className="gov-note">The device draft was older than 24 hours and was not restored.</p>}
        {['load_error','save_error','conflict'].includes(draft.status)&&<div role="alert"><p>{draft.status==='conflict'?'Another tab changed this draft. Load the saved version before editing.':'Device draft storage failed. Keep this page open and retry.'}</p>
            <GovButton onClick={()=>draft.status==='save_error'&&!receipt?.draftWarning?void draft.flush().catch(()=>{}):void draft.reload()}>Retry draft storage</GovButton></div>}
        {error&&<p ref={errorFocus} tabIndex={-1} role="alert" className="gov-error">{error}</p>}
        {ready&&<>
            <div className="gov-form-actions"><GovButton disabled={busy||storage.pending} onClick={refresh}>Reload evidence and history</GovButton></div>
            {!history.data.can_record_review&&<p className="gov-note">You can read this history. Recording also requires engineering review access and report review ownership.</p>}
            <GovState loading={sources.loading} error={sources.error} onRetry={sources.reload}/>
            {sources.data&&!sources.loading&&!sources.error&&<>
                {!sources.data.items.length?<p className="gov-note">No field visits were found in this page of the bounded search. Record and independently review a visit in Assets, then reload the evidence.</p>:null}
                <label className="gov-field">Field visit<select value={selected||''} disabled={locked} onChange={event=>{setSourceId(event.target.value);setIdentity(false);}}>
                    <option value="">Choose recorded field evidence</option>
                    {selected&&!sources.data.items.some(row=>row.id===selected)&&<option value={selected}>Selected field visit · {selected}</option>}
                    {sources.data.items.map(row=><option key={row.id} value={row.id}>{row.asset_name} · {formatDate(row.observed_at)} · {row.review_status}</option>)}
                </select></label>
                <p className="gov-note">This bounded list includes report-linked visits and visits in the same recorded barangay. Location agreement does not establish the same object or problem.</p>
                <div className="gov-form-actions">{before&&<GovButton disabled={locked} onClick={()=>setBefore('')}>First field-visit page</GovButton>}{sources.data.next_before_id&&<GovButton disabled={locked} onClick={()=>setBefore(sources.data.next_before_id)}>More field visits</GovButton>}</div>
            </>}
            {selected&&<GovState loading={context.loading} error={context.error} onRetry={context.reload}/>}
            {evidenceReady&&<>
                <p><Link to={`/gov/assets?asset=${encodeURIComponent(context.data.field.asset_id)}`}>Open asset and field-review history</Link></p>
                <dl className="gov-facts"><dt>Observed</dt><dd>{formatDate(context.data.field.observed_at)}</dd><dt>Recorded field condition</dt><dd>{FIELD_FINDINGS[context.data.field.condition]||'Not assessed'} · {context.data.field.review_status}</dd><dt>Identity and location review</dt><dd>{context.data.field.identity_confirmed&&context.data.field.location_reviewed?'Recorded by field reviewer; not an accuracy guarantee':'Incomplete'}</dd></dl>
                <Blockers values={context.data.record_blockers}/>
                <div className="concern-evidence-pair">
                    <RecordedReportEvidence key={reportEvidence?.photo_url} record={reportEvidence} item={item} label="Original report"/>
                    <figure className="concern-evidence"><figcaption><strong>Selected field visit</strong></figcaption>
                        {photo.url&&<img src={photo.url} alt={`Private field evidence for reported observation ${item.item_key}`} onLoad={()=>setPhoto(value=>({...value,viewed:stamp}))}
                            onError={()=>setPhoto(value=>({...value,url:'',viewed:'',error:'The photo could not be displayed. Retry before recording findings.'}))}/>}
                        <GovButton disabled={photo.busy} onClick={()=>void openPhoto()}>{photo.busy?'Opening private photo…':photo.url?'Reload private photo':'View private field photo'}</GovButton>
                        {photo.url&&<GovButton onClick={()=>setInspection(true)}>Inspect full-size private photo</GovButton>}
                        {photo.error&&<p role="alert" className="gov-error">{photo.error}</p>}
                        <p className="gov-note">Original stored field photo. Observed {formatDate(context.data.field.observed_at)}; reviewed {formatDate(context.data.field.reviewed_at)}.</p>
                    </figure>
                </div>
                {!viewed&&<p className="gov-note">Open and inspect the private field photo before recording category findings.</p>}
                <form ref={form} onSubmit={event=>{event.preventDefault();void prepare();}}>
                    <fieldset disabled={locked||!canRecord||!viewed}>
                        <legend>Findings for this reported problem</legend>
                        {context.data.problem.categories.map(category=><label key={category} className="gov-field">{category}<select required value={findings[category]||''} onChange={event=>setFindings(value=>({...value,[category]:event.target.value}))}>
                            <option value="">Choose a finding</option>{Object.entries(FIELD_FINDINGS).map(([key,label])=><option key={key} value={key}>{label}</option>)}
                        </select></label>)}
                        <label className="field-assessment-identity"><input type="checkbox" required checked={identity} onChange={event=>setIdentity(event.target.checked)}/>I compared the same reported object and problem with this field visit.</label>
                        <label className="gov-field">Evidence and reason<textarea required minLength={20} maxLength={2000} rows={3} value={reason} onChange={event=>setReason(event.target.value)}/><small>20–2000 characters. Describe the evidence; keep personal contact details out of this note.</small></label>
                        <GovButton type="submit" disabled={locked||!canRecord||!viewed}>Review field assessment</GovButton>
                    </fieldset>
                </form>
            </>}
            <details className="concern-history"><summary>Field assessment history ({history.data.assessments.length})</summary>
                {!history.data.assessments.length?<p>No field assessments are recorded for this reported problem. Its categories remain unassessed.</p>:<ol>{history.data.assessments.map(row=><li key={row.id}>
                    <strong>Revision {row.revision} · {formatDate(row.created_at)}</strong>
                    <ul>{row.category_findings.map(part=><li key={part.category}>{part.category}: {FIELD_FINDINGS[part.finding]||'Not assessed'}</li>)}</ul><p>{row.reason}</p>
                    <p className="gov-note">Observed {formatDate(row.snapshot.field.observed_at)} · recorded by staff #{row.actor_id}. {row.current_context?'Evidence context is unchanged; physical condition may have changed since the visit.':'Historical assessment; review its context before relying on it.'}</p>
                    <Blockers values={row.current_context_blockers}/>
                </li>)}</ol>}
                <p className="gov-note">Showing up to {history.data.maximum_history_results} latest assessments. {history.data.history_not_exhaustive?'More history exists. ':''}A recorded absence does not establish repair cause, exact repair time or report closure.</p>
            </details>
        </>}
        <GovConfirm open={Boolean(confirmation)} title="Record these field findings?" confirmLabel="Record field assessment" busy={busy} onClose={()=>setConfirmation(null)} onConfirm={()=>void execute()}>
            <ul>{confirmation?.category_findings.map(part=><li key={part.category}>{part.category}: {FIELD_FINDINGS[part.finding]}</li>)}</ul><p>{confirmation?.reason}</p>
            <p>This records an internal assessment with its original evidence and history. Every report keeps its ticket, status and concern membership. Corrections create a later revision.</p>
        </GovConfirm>
        {inspection&&photo.url&&<FieldPhotoInspection url={photo.url} description={`Private field evidence for reported observation ${item.item_key}`} onClose={()=>setInspection(false)}/>}
    </div>;
}
