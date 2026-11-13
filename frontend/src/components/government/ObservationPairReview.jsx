import { useEffect, useMemo, useRef, useState } from 'react';
import { GovButton, GovConfirm, GovState, formatDate } from './GovWorkspace';
import { governmentRequest, useGovernmentData } from '../../utils/governmentApi';
import { getAuthToken } from '../../utils/authSession';
import { reportDraftPrincipal } from '../../utils/residentReportDraft';
import { createPairCommand, pairDecision, PAIR_BASES, PAIR_RELATIONS } from '../../utils/observationPair';
import useResidentReportDraft from '../../hooks/useResidentReportDraft';
import PairImageAssistance from './PairImageAssistance';

export default function ObservationPairReview({ path, onReloadEvidence }) {
    const context=useGovernmentData(path);
    const [principal]=useState(()=>reportDraftPrincipal(getAuthToken()));
    const driver=useMemo(()=>createPairCommand({principal,path,request:(url,options)=>{
        const token=getAuthToken();
        if(reportDraftPrincipal(token)!==principal)throw new Error('The signed-in account changed. Return to this comparison using the original account.');
        return governmentRequest(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token}`}});
    }}),[path,principal]);
    const [relation,setRelation]=useState('');
    const [basis,setBasis]=useState([]);
    const [reason,setReason]=useState('');
    const [storage,setStorage]=useState({loading:true,pending:false,error:''});
    const [storageRevision,setStorageRevision]=useState(0);
    const [error,setError]=useState('');
    const [conflict,setConflict]=useState(false);
    const [busy,setBusy]=useState(false);
    const [confirmation,setConfirmation]=useState(null);
    const [receipt,setReceipt]=useState(null);
    const form=useRef(null), saving=useRef(false), notice=useRef(null), recoveryFocus=useRef(null), errorFocus=useRef(null);
    useEffect(()=>{
        if(busy||!error)return;
        const frame=requestAnimationFrame(()=>{const destination=storage.pending?recoveryFocus.current:errorFocus.current;destination?.focus();});
        return()=>cancelAnimationFrame(frame);
    },[busy,error,storage.pending]);
    const values=useMemo(()=>({relation,basis,reason}),[relation,basis,reason]);
    const draft=useResidentReportDraft({kind:`observation-pair:${path}`,principal,data:values,
        hasContent:Boolean(relation||basis.length||reason),restore:data=>{
            if(data&&(typeof data.relation!=='string'||!Array.isArray(data.basis)||typeof data.reason!=='string'))throw new Error('Invalid comparison draft.');
            setRelation(data?.relation||'');setBasis(data?.basis||[]);setReason(data?.reason||'');
        }});
    useEffect(()=>{
        let alive=true;
        driver.load().then(record=>{
            if(!alive)return;
            setStorage({loading:false,pending:record?.state==='pending',original:record?.payload,error:''});
            if(record?.state==='confirmed')setReceipt(record.receipt);
        }).catch(()=>{if(alive)setStorage({loading:false,pending:false,error:'Device recovery storage could not be opened. Retry before recording a comparison.'});});
        return()=>{alive=false;};
    },[driver,storageRevision]);
    const loaded=context.data&&!context.loading&&!context.error;
    const allowed=loaded&&context.data.can_record_review===true;
    const locked=!allowed||!draft.ready||draft.locked||storage.loading||Boolean(storage.error)||storage.pending||busy||conflict;
    const grouped=loaded&&context.data.evidence.left.concern_id===context.data.evidence.right.concern_id;
    const photos=loaded&&context.data.evidence.left.photo_present&&context.data.evidence.right.photo_present;
    async function prepare(){
        if(locked||saving.current||!form.current?.reportValidity())return;
        saving.current=true;setBusy(true);
        try{const payload=pairDecision(context.data,relation,basis,reason);await draft.flush();setConfirmation(payload);setError('');}
        catch(e){setError(e.message);}
        finally{saving.current=false;setBusy(false);}
    }
    async function execute(recover=false){
        if(saving.current||!allowed)return;
        saving.current=true;setBusy(true);setError('');
        try{
            const result=await driver.submit(recover?null:confirmation);
            setReceipt(result);setConfirmation(null);setStorage({loading:false,pending:false,error:''});
            try{await draft.clear({confirmed:true});await draft.reload();}
            catch{setReceipt({...result,cleanupWarning:true});await draft.reload();}
            context.reload();
            requestAnimationFrame(()=>notice.current?.focus());
        }catch(e){
            setError(e.status===409?'The comparison changed. Your text is retained. Reload the comparison, check the evidence and confirm again.':e.message);
            if(e.status===409)setConflict(true);
            try{const record=await driver.load();setStorage({loading:false,pending:record?.state==='pending',original:record?.payload,error:''});}
            catch{setStorage({loading:false,pending:true,error:'The original review could not be read. Retry device recovery storage.'});}
            setConfirmation(null);
        }finally{saving.current=false;setBusy(false);}
    }
    return <section className="concern-pair-review" aria-label="Observation comparison">
        <h4>Record comparison evidence</h4>
        <p className="gov-note">Record what these observations show. Linking reports is a separate decision.</p>
        <GovState loading={context.loading} error={context.error} onRetry={context.reload}/>
        {receipt?.review&&<p role="status" ref={notice} tabIndex={-1} className="gov-note concern-receipt">
            Received comparison revision {receipt.review.revision}: {PAIR_RELATIONS[receipt.review.relation]}. Report membership was unchanged.
            {receipt.cleanupWarning&&' The device recovery record could not be updated. Retrying the original review will recover this receipt.'}
        </p>}
        {storage.loading&&<p role="status">Checking this device for an interrupted review…</p>}
        {!draft.ready&&<p role="status">Opening this device’s comparison draft…</p>}
        {!storage.pending&&draft.status==='restored'&&<p role="status" className="gov-note">Comparison draft restored. Check the current evidence before recording it.</p>}
        {!storage.pending&&draft.status==='saving'&&<p role="status" className="gov-note">Saving comparison draft on this device…</p>}
        {!storage.pending&&draft.status==='saved'&&<p role="status" className="gov-note">Comparison draft changes saved on this device. Review and confirm to record them as a judgment.</p>}
        {draft.status==='expired'&&<p className="gov-note">The saved comparison draft is older than 24 hours and was not restored.</p>}
        {['save_error','load_error','conflict'].includes(draft.status)&&<div role="alert"><p>{draft.status==='conflict'?'Another tab changed this draft. Load its saved version before editing.':'The comparison draft could not be saved or opened. Keep this page open and retry device storage.'}</p>
            <GovButton onClick={()=>draft.status==='save_error'?void draft.flush().catch(()=>{}):void draft.reload()}>{draft.status==='conflict'?'Load saved version and replace this tab':'Retry draft storage'}</GovButton></div>}
        {storage.error&&<div role="alert"><p>{storage.error}</p><GovButton onClick={()=>setStorageRevision(n=>n+1)}>Retry device storage</GovButton></div>}
        {storage.pending&&<div role="status"><p>A previous save has an uncertain result. Recover its original comparison before recording another.</p>
            <p>{PAIR_RELATIONS[storage.original?.relation]}: {storage.original?.reason}</p>
            <button type="button" ref={recoveryFocus} className="gov-button" disabled={!allowed||busy||Boolean(storage.error)} onClick={()=>void execute(true)}>{busy?'Recovering…':'Recover original comparison'}</button></div>}
        {loaded&&!allowed&&<p className="gov-note">{context.data.record_block_reason||'Comparison recording is unavailable for your account.'}</p>}
        {error&&<p role="alert" tabIndex={-1} ref={errorFocus} className="gov-error">{error}</p>}
        {conflict&&<GovButton disabled={busy} onClick={()=>{setConflict(false);setError('');if(onReloadEvidence)onReloadEvidence();else context.reload();}}>Reload comparison</GovButton>}
        {loaded&&<>
            {grouped&&<p className="gov-note">These observations already share a concern. To record different problems or assets, first review and separate their membership.</p>}
            <form ref={form} onSubmit={event=>{event.preventDefault();void prepare();}}>
                <fieldset disabled={locked}>
                    <legend className="sr-only">Comparison judgment</legend>
                    <label className="gov-field">Comparison result<select required value={relation} onChange={event=>setRelation(event.target.value)}>
                        <option value="">Choose what the evidence supports</option>
                        {Object.entries(PAIR_RELATIONS).map(([key,label])=><option key={key} value={key} disabled={grouped&&['same_asset_different_problem','different_asset'].includes(key)}>{label}</option>)}
                    </select></label>
                    <fieldset className="concern-evidence-basis"><legend>Evidence reviewed</legend>
                        {Object.entries(PAIR_BASES).map(([key,label])=><label key={key}><input type="checkbox" checked={basis.includes(key)} disabled={key==='photos'&&!photos}
                            onChange={event=>setBasis(current=>event.target.checked?[...current,key]:current.filter(value=>value!==key))}/>{label}</label>)}
                    </fieldset>
                    {!photos&&<p className="gov-note">Both reports need recorded photos to choose report photos as the basis.</p>}
                    <p className="gov-note">Location and descriptions alone cannot establish identity. Choose “Cannot determine yet” if the evidence is insufficient.</p>
                    <label className="gov-field">Evidence and reason<textarea required minLength={20} maxLength={2000} rows={3} value={reason} onChange={event=>setReason(event.target.value)}/><small>20–2000 characters. Record the observation; keep personal contact details out of this note.</small></label>
                    <GovButton type="submit" disabled={locked}>Review comparison</GovButton>
                </fieldset>
            </form>
            <details className="concern-history"><summary>Comparison history ({context.data.reviews.length})</summary>
                {!context.data.reviews.length?<p>No comparison judgments are recorded for this pair.</p>:<ol>
                    {context.data.reviews.map(review=><li key={review.id}><strong>Revision {review.revision}: {PAIR_RELATIONS[review.relation]||review.relation}</strong>
                        <p>{review.reason}</p><p className="gov-note">{review.evidence_basis.map(key=>PAIR_BASES[key]||key).join(', ')}. Recorded {formatDate(review.created_at)} by staff #{review.actor_id}.</p>
                        <p className="gov-note">{review.current_evidence?'Evidence context is unchanged.':'Evidence context changed after this judgment; review it again before relying on it.'}</p>
                    </li>)}
                </ol>}
                <p className="gov-note">Showing up to {context.data.maximum_history_results} latest judgments. These are reviewer observations, not validated AI predictions.</p>
            </details>
            <PairImageAssistance key={path} pairPath={path} context={context.data} principal={principal}
                blocked={busy||storage.pending||conflict} onReloadEvidence={onReloadEvidence}/>
        </>}
        <GovConfirm open={Boolean(confirmation)} title="Record this comparison?" confirmLabel="Record comparison" busy={busy} onClose={()=>setConfirmation(null)} onConfirm={()=>void execute()}>
            <p>{PAIR_RELATIONS[confirmation?.relation]}</p><p>{confirmation?.reason}</p>
            <p>This records an internal judgment with its evidence and history. Each report keeps its own ticket, status and concern membership.</p>
        </GovConfirm>
    </section>;
}
