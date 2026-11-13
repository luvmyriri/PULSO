import {useEffect,useMemo,useRef,useState} from 'react';
import {GovButton,GovConfirm,GovState,formatDate} from './GovWorkspace';
import {governmentRequest,useGovernmentData} from '../../utils/governmentApi';
import {getAuthToken} from '../../utils/authSession';
import {reportDraftPrincipal} from '../../utils/residentReportDraft';
import {analysisPayload,analysisStatus,assetHints,createAnalysisCommand,currentVisualHints,defectHints,validateAnalysisHistory} from '../../utils/pairImageAssistance';

const failureText={
    deployment_disabled:'Image assistance is disabled. Manual comparison remains available.',
    provider_not_configured:'The image provider is not configured. Ask an operator to check service availability.',
    daily_pair_budget_exhausted:'The daily comparison budget was exhausted. No call was reserved for this job.',
    provider_budget_or_rate_limit:'The provider budget or rate limit prevented analysis.',
    evidence_context_changed:'Report evidence changed. Reload both reports before requesting new advice.',
    photo_bytes_changed:'A recorded photo changed. Check the original evidence before requesting new advice.',
    worker_interrupted_outcome_unknown:'The worker was interrupted. Images may already have been sent. This job will not automatically retry.',
    review_access_changed:'Review access changed. An authorized reviewer must check the reports.',
    provider_failed_or_invalid_output:'The provider failed or returned unsupported output. No visual advice was accepted.',
};

function VisualResult({job,sourceId}){
    const hints=currentVisualHints(job);
    if(job.context_current===false)return <p className="gov-note">Evidence context changed. This historical output is not current advice; reload the reports and review their evidence.</p>;
    if(job.status!=='completed')return null;
    if(!hints)return <p role="alert">The completed response contains no usable visual advice. Continue with manual comparison.</p>;
    return <details open className="concern-visual-result"><summary>AI visual hints and limitations</summary>
        <p><strong>{assetHints[hints.asset_relation]}</strong></p><p>{defectHints[hints.defect_relation]}</p>
        <p className="gov-note">Image A: {job.image_a_observation_id===sourceId?'current report':'comparison report'}. Image B: {job.image_b_observation_id===sourceId?'current report':'comparison report'}.</p>
        <p className="gov-note">Image usability: A {hints.source_usable?'usable':'not usable'}; B {hints.target_usable?'usable':'not usable'}.</p>
        <h5>Visible similarities</h5>{hints.visible_matches.length?<ul>{hints.visible_matches.map((text,index)=><li key={index}>{text}</li>)}</ul>:<p>None recorded by the model.</p>}
        <h5>Visible differences</h5>{hints.visible_differences.length?<ul>{hints.visible_differences.map((text,index)=><li key={index}>{text}</li>)}</ul>:<p>None recorded by the model.</p>}
        <h5>Limits of this advice</h5><ul>{hints.limitations.map((text,index)=><li key={index}>{text}</li>)}</ul>
        <p className="gov-note">These hints do not establish the same physical object, incident episode or exact location. Record your own judgment separately.</p>
    </details>;
}

export default function PairImageAssistance({pairPath,context,principal,blocked,onReloadEvidence}){
    const path=pairPath+'/analysis',history=useGovernmentData(path);
    const driver=useMemo(()=>createAnalysisCommand({principal,path,request:(url,options)=>{
        const token=getAuthToken();
        if(reportDraftPrincipal(token)!==principal)throw new Error('The signed-in account changed. Recover this request using the original account.');
        return governmentRequest(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token}`}});
    }}),[path,principal]);
    const [operation,setOperation]=useState({loading:true,pending:false,error:''});
    const [readRevision,setReadRevision]=useState(0),[acknowledged,setAcknowledged]=useState(false);
    const [confirmation,setConfirmation]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
    const [conflict,setConflict]=useState(false),[receipt,setReceipt]=useState(null);
    const guard=useRef(false),notice=useRef(null),recovery=useRef(null),errorFocus=useRef(null),refresh=useRef(history.reload);
    useEffect(()=>{refresh.current=history.reload;},[history.reload]);
    useEffect(()=>{
        let alive=true;
        driver.load().then(record=>{if(alive)setOperation({loading:false,pending:record?.state==='pending',error:''});})
            .catch(()=>{if(alive)setOperation({loading:false,pending:false,error:'The device recovery record could not be opened. Retry before requesting another analysis.'});});
        return()=>{alive=false;};
    },[driver,readRevision]);
    let data=null,validationError='';
    if(history.data){try{data=validateAnalysisHistory(history.data,path);}catch(e){validationError=e.message;}}
    const active=data?.jobs.some(job=>['queued','running'].includes(job.status)&&!job.lease_expired);
    useEffect(()=>{
        if(!active||history.error||validationError)return;
        const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh.current();},5000);
        return()=>clearInterval(timer);
    },[active,history.error,validationError]);
    useEffect(()=>{
        if(busy||!error)return;
        const frame=requestAnimationFrame(()=>{const destination=operation.pending?recovery.current:errorFocus.current;destination?.focus();});
        return()=>cancelAnimationFrame(frame);
    },[busy,error,operation.pending]);
    const ready=data&&!history.loading&&!history.error&&!validationError;
    const eligible=ready&&data.can_request===true&&context?.can_record_review===true;
    const locked=!eligible||blocked||busy||operation.loading||operation.pending||Boolean(operation.error)||conflict;
    function prepare(){
        if(locked)return;
        try{setConfirmation(analysisPayload(context,acknowledged));setError('');}catch(e){setError(e.message);}
    }
    async function submit(recover=false){
        if(guard.current||context?.can_record_review!==true)return;
        guard.current=true;setBusy(true);setError('');
        try{
            const result=await driver.submit(recover?null:confirmation);
            setReceipt(result);setOperation({loading:false,pending:result.cleanupWarning,error:''});
            setConfirmation(null);setAcknowledged(false);history.reload();
            requestAnimationFrame(()=>notice.current?.focus());
        }catch(e){
            setError(e.message);setConfirmation(null);setAcknowledged(false);
            if(e.status===409)setConflict(true);
            try{const record=await driver.load();setOperation({loading:false,pending:record?.state==='pending',error:''});}
            catch{setOperation({loading:false,pending:true,error:'The original analysis request could not be read. Retry device recovery storage.'});}
            history.reload();
        }finally{guard.current=false;setBusy(false);}
    }
    return <section className="concern-image-assistance" aria-label="Image assistance">
        <h4>Image assistance</h4><p className="gov-note">Optional Google Gemini visual hints. Your comparison judgment and report membership remain separate.</p>
        <div className="gov-form-actions"><GovButton disabled={history.loading||busy} onClick={()=>history.reload()}>Refresh image status</GovButton>
            {history.fetchedAt&&<span className="gov-note">Last checked {formatDate(history.fetchedAt)}</span>}</div>
        <GovState loading={!history.data&&history.loading} error={history.error||validationError} onRetry={history.reload}/>
        {history.data&&history.loading&&<p role="status">Refreshing image-assistance status…</p>}
        {ready&&data.request_block_reason&&<p className="gov-note">{data.request_block_reason}</p>}
        {operation.loading&&<p role="status">Checking for an interrupted analysis request…</p>}
        {operation.error&&<div role="alert"><p>{operation.error}</p><GovButton onClick={()=>setReadRevision(n=>n+1)}>Retry analysis recovery storage</GovButton></div>}
        {receipt&&<p role="status" tabIndex={-1} ref={notice}>Analysis request received: {receipt.job.id}. Check job history for its current status.
            {receipt.cleanupWarning&&' Its server receipt was confirmed, but the device recovery record could not be updated.'}</p>}
        {operation.pending&&<div><p>{receipt?'Recover the retained original request before requesting another.':'An earlier request has an uncertain result. Recover its original job before requesting another; a call may already have started.'}</p>
            <button ref={recovery} type="button" className="gov-button" disabled={busy||Boolean(operation.error)||context?.can_record_review!==true} onClick={()=>void submit(true)}>Recover original analysis request</button></div>}
        {error&&<p role="alert" ref={errorFocus} tabIndex={-1} className="gov-error">{error}</p>}
        {conflict&&<p><GovButton disabled={busy} onClick={()=>{setConflict(false);setError('');onReloadEvidence?.();history.reload();}}>Reload report evidence and status</GovButton></p>}
        {ready&&data.enabled&&<>
            <label className="concern-disclosure"><input type="checkbox" checked={acknowledged} disabled={locked} onChange={event=>setAcknowledged(event.target.checked)}/>
                I reviewed both photos for disclosure to the configured Google Gemini service.</label>
            <p className="gov-note">The request sends metadata-free photo copies and category labels. Personal information visible inside the images is not automatically removed. A provider call may incur charges.</p>
            <GovButton disabled={locked||!acknowledged} onClick={prepare}>Review image-assistance request</GovButton>
        </>}
        {data&&!history.error&&!validationError&&<div className="concern-analysis-history">
            {!data.jobs.length&&!history.loading&&<p>No image-assistance jobs are recorded in this bounded history.</p>}
            <ol className="concern-analysis-jobs">{data.jobs.map(job=><li key={job.id}>
                <h5>{analysisStatus(job)}</h5><p className="gov-note">Job {job.id}</p>
                <p className="gov-note">Requested {formatDate(job.created_at)}. Model: {job.model||'not recorded'}.</p>
                {job.lease_expired&&<p>The worker stopped reporting progress. An operator must check the queue. This job is not automatically resent.</p>}
                {job.status==='queued'&&<p className="gov-note">Waiting for the configured worker; no completed result is available.</p>}
                {job.failure_code&&<p>{failureText[job.failure_code]||'No supported visual result was produced. Check the original evidence and continue with manual comparison.'}</p>}
                {['failed','cancelled'].includes(job.status)&&job.provider_call_may_have_started&&<p className="gov-note">A provider call may already have started. Requesting another analysis is a separate action that may incur a new charge.</p>}
                {!history.loading&&<VisualResult job={job} sourceId={context?.source_observation_id}/>}
                <details><summary>Analysis provenance</summary><p>Prompt: {job.prompt_version}. Image copy: {job.image_recipe}.</p>
                    <p>Provider-reported model version: {job.result?.model_version||'not recorded'}.</p><p>Finished {formatDate(job.finished_at)}.</p>
                    {(job.image_hashes||[]).map((hash,index)=><p key={index} className="concern-checksum">Image {index===0?'A':'B'} original SHA-256: {hash.original_sha256}<br/>Copy SHA-256: {hash.prepared_sha256}</p>)}
                </details>
            </li>)}</ol><p className="gov-note">Showing at most {data.maximum_results} latest jobs. No AI output is a verified location, training label or automatic link.</p>
        </div>}
        <GovConfirm open={Boolean(confirmation)} title="Request Google image assistance?" confirmLabel="Request image assistance" busy={busy} onClose={()=>setConfirmation(null)} onConfirm={()=>void submit()}>
            <p>Send metadata-free copies of the two recorded photos and their infrastructure category labels to the configured Google Gemini service. Information visible in the pixels may still be personal.</p>
            <p>A call may incur provider charges. This creates an advisory job; it does not record a human judgment or link reports.</p>
        </GovConfirm>
    </section>;
}
