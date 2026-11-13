import {loadReportEvidence,updateReportEvidence} from './reportEvidenceStore.js';
import {pairVersions} from './observationPair.js';

const states=new Set(['queued','running','completed','failed','cancelled']);
const storeDefault={load:loadReportEvidence,update:updateReportEvidence};
const schema='pulso-pair-image-command-v1';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const assetHints={possibly_same:'Possibly the same asset — unverified',visibly_different:'Visibly different assets — AI suggestion',uncertain:'Asset identity is uncertain'};
export const defectHints={visually_consistent:'Visually consistent defects — unverified',different_visible_defects:'Different visible defects — AI suggestion',uncertain:'Defect relationship is uncertain'};
export function analysisPayload(context,acknowledged){
    if(acknowledged!==true)throw new Error('Review both photos for disclosure to Google before requesting image assistance.');
    const versions=pairVersions(context);
    return Object.fromEntries([...Object.entries(versions).filter(([key])=>key!=='expected_pair_revision'),['photos_reviewed_for_provider',true]]);
}
function expectedPair(path){return path.match(/observations\/(\d+)\/pairs\/(\d+)\/analysis$/)?.slice(1).map(Number).sort((a,b)=>a-b);}
export function validAnalysisJob(job,path){
    const expected=expectedPair(path);
    return Boolean(expected&&typeof job?.id==='string'&&uuid.test(job.id)&&states.has(job.status)&&
        job.image_a_observation_id===expected[0]&&job.image_b_observation_id===expected[1]&&
        typeof job.context_current==='boolean'&&typeof job.lease_expired==='boolean'&&
        typeof job.provider_call_may_have_started==='boolean'&&
        Array.isArray(job.image_hashes)&&job.image_hashes.length===2&&job.image_hashes.every(hash=>
            /^[a-f0-9]{64}$/i.test(hash?.original_sha256)&&/^[a-f0-9]{64}$/i.test(hash?.prepared_sha256))&&
        job.review_required===true&&job.membership_changed===false&&job.training_release_eligible===false);
}
export function validateAnalysisHistory(value,path){
    if(!value||typeof value.enabled!=='boolean'||typeof value.can_request!=='boolean'||
        !Array.isArray(value.jobs)||value.jobs.length>10||!Number.isInteger(value.maximum_results)||value.maximum_results<1||value.maximum_results>10||
        value.jobs.some(job=>!validAnalysisJob(job,path))||new Set(value.jobs.map(job=>job.id)).size!==value.jobs.length)
        throw new Error('The image-assistance response is incomplete. Refresh its status; no new analysis will be requested.');
    if(value.can_request&&(!value.enabled||value.jobs.some(job=>['queued','running'].includes(job.status))))
        throw new Error('The image-assistance response is inconsistent. Refresh its status before requesting analysis.');
    return value;
}
export function currentVisualHints(job){
    if(!job)return null;
    const result=job?.result,hints=result?.hints;
    if(job.status!=='completed'||job.context_current!==true||result?.review_required!==true||
        result?.episode_identity!=='not_established_from_images'||result?.location_verified!==false||result?.training_release_eligible!==false||
        !hints||typeof hints.source_usable!=='boolean'||typeof hints.target_usable!=='boolean'||
        !Object.hasOwn(assetHints,hints.asset_relation)||!Object.hasOwn(defectHints,hints.defect_relation))return null;
    const lists=[hints.visible_matches,hints.visible_differences,hints.limitations];
    if(lists.some(values=>!Array.isArray(values)||values.length>5||values.some(value=>typeof value!=='string'||!value.trim()||value.length>240))||!hints.limitations.length)return null;
    if((!hints.source_usable||!hints.target_usable)&&(hints.asset_relation!=='uncertain'||hints.defect_relation!=='uncertain'))return null;
    if(hints.asset_relation==='visibly_different'&&hints.defect_relation==='visually_consistent')return null;
    return hints;
}
export function analysisStatus(job){
    if(job.status==='running'&&job.lease_expired)return 'Worker progress is uncertain';
    return {queued:'Queued — waiting for a worker',running:'Running — result not yet available',completed:'Completed — AI advice only',failed:'Analysis failed',cancelled:'Analysis cancelled'}[job.status]||'Status unavailable';
}
export function createAnalysisCommand({principal,path,request,store=storeDefault}){
    const slot=`pulso-pair-image-v1:${encodeURIComponent(principal)}:${path}`;
    const verify=record=>{
        if(!principal||['guest','invalid-session'].includes(principal))throw new Error('Sign in to use image assistance.');
        if(record!=null&&(record.schema!==schema||record.principal!==principal||record.path!==path||!uuid.test(record.key)||
            !['pending','confirmed','rejected'].includes(record.state)||record.payload?.photos_reviewed_for_provider!==true||
            ['expected_version','expected_target_version','expected_concern_version','expected_target_concern_version'].some(key=>!Number.isInteger(record.payload?.[key])||record.payload[key]<1)))
            throw new Error('The original analysis request could not be read. Retry device recovery storage.');
        return record;
    };
    return {load:async()=>verify(await store.load(slot)),async submit(payload=null){
        const operation=await store.update(slot,current=>{
            verify(current);if(current?.state==='pending')return current;
            if(!payload)throw new Error('No original analysis request is pending on this device. Refresh job history.');
            return {schema,principal,path,state:'pending',key:crypto.randomUUID(),payload:structuredClone(payload)};
        });
        let receipt;
        try{
            receipt=await request(path,{method:'POST',headers:{'Idempotency-Key':operation.key},body:operation.payload});
            if(!validAnalysisJob(receipt,path))throw new Error('No complete analysis receipt was confirmed. Recover the original request.');
        }catch(error){
            if([400,401,403,404,409,413,415,422,429].includes(error.status))
                await store.update(slot,current=>current?.key===operation.key?{...current,state:'rejected'}:current);
            throw error;
        }
        let cleanupWarning=false;
        try{await store.update(slot,current=>current?.key===operation.key?{...current,state:'confirmed'}:current);}
        catch{cleanupWarning=true;}
        return {job:receipt,cleanupWarning};
    }};
}
