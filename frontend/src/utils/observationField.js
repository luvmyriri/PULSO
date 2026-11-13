import { loadReportEvidence, updateReportEvidence } from './reportEvidenceStore.js';

export const FIELD_FINDINGS = {defect_observed:'Defect observed',no_defect_observed:'No defect observed',not_assessed:'Cannot assess this category'};
export const FIELD_BLOCKERS = {
    independent_accepted_field_review_required:'An independent accepted field review is required.',
    visible_field_evidence_required:'The field visit must have visible evidence.',private_evidence_required:'Stored private evidence is required.',
    same_recorded_area_required:'The report and field record need the same recorded barangay.',
    field_source_belongs_to_another_report:'This field visit is linked to a different report.',
    post_report_consistent_field_clock_required:'Check the visit and review dates against report receipt.',
    private_evidence_missing_or_changed:'The private photo is missing or changed.',
    field_recorder_cannot_adjudicate_own_evidence:'The field recorder cannot assess their own evidence.',
    record_permission_or_report_ownership_required:'Engineering review access and report ownership are required.',
    recorded_context_changed:'The report, concern or field context has changed.',
    superseded_by_later_assessment:'A later assessment supersedes this judgment.',
    later_or_same_time_accepted_field_context_requires_review:'Another accepted visit requires a new comparison.',
};
const schema='pulso-field-assessment-command-v1';
const storeDefault={load:loadReportEvidence,update:updateReportEvidence};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function fieldAssessmentDecision(context,findings,identity,reason) {
    const p=context?.problem;
    if(!p||!Array.isArray(p.categories)||!p.categories.length||new Set(p.categories).size!==p.categories.length||
        [p.report_version,p.concern_version].some(n=>!Number.isInteger(n)||n<1)||!Number.isInteger(context.expected_revision)||context.expected_revision<0||
        !/^[0-9a-f]{64}$/.test(context.expected_field_sha256)||!context.field?.field_observation_id)
        throw new Error('The evidence context is incomplete. Reload this field visit.');
    if(context.can_record!==true)throw new Error('This evidence is not available for recording. Review the listed requirements.');
    if(identity!==true)throw new Error('Compare the same reported object and problem before confirming identity.');
    if(!findings||p.categories.some(category=>!Object.hasOwn(FIELD_FINDINGS,findings[category])))
        throw new Error('Choose a finding for every reported category.');
    if(typeof reason!=='string'||reason.trim().length<20||reason.trim().length>2000)
        throw new Error('Explain the evidence in 20 to 2000 characters.');
    const known=p.categories.map(c=>findings[c]).filter(f=>f!=='not_assessed');
    if(known.length&&(known.includes('defect_observed')?context.field.condition!=='defect_observed':context.field.condition!=='no_defect_observed'))
        throw new Error('The category findings conflict with the accepted field condition. Keep uncertainty as “Cannot assess this category”.');
    return {field_observation_id:context.field.field_observation_id,expected_report_version:p.report_version,
        expected_concern_version:p.concern_version,expected_revision:context.expected_revision,
        expected_field_sha256:context.expected_field_sha256,identity_confirmed:true,
        category_findings:[...p.categories].sort().map(category=>({category,finding:findings[category]})),reason:reason.trim()};
}

export function createFieldAssessmentCommand({principal,path,request,store=storeDefault}) {
    const expected=path.match(/^\/api\/report-intelligence\/reports\/(\d+)\/observations\/(\d+)\/field-assessments$/)?.slice(1).map(Number);
    const slot=`pulso-field-assessment-v1:${encodeURIComponent(principal)}:${path}`;
    const requirePrincipal=()=>{if(!expected||!principal||['guest','invalid-session'].includes(principal))throw new Error('Sign in again before recording field findings.');};
    const checked=record=>{
        if(record!=null&&(record.schema!==schema||record.principal!==principal||record.path!==path||
            !['pending','confirmed','rejected'].includes(record.state)||typeof record.key!=='string'||record.key.length<32||
            !Array.isArray(record.payload?.category_findings)||!record.payload.field_observation_id))
            throw new Error('The original assessment could not be read. Retry device storage before recording another.');
        return record;
    };
    return {slot,load:async()=>{requirePrincipal();return checked(await store.load(slot));},async submit(payload=null){
        requirePrincipal();let recovery=false;
        const operation=await store.update(slot,current=>{
            checked(current);
            if(current?.state==='pending'){recovery=true;return current;}
            if(!payload)throw new Error('No original assessment is pending. Refresh its history.');
            return {schema,principal,path,state:'pending',key:crypto.randomUUID(),payload:structuredClone(payload)};
        });
        let receipt;
        try{
            receipt=await request(path,{method:'POST',headers:{'Idempotency-Key':operation.key},body:operation.payload});
            const a=receipt?.assessment,p=a?.snapshot?.problem,body=operation.payload;
            if(!Number.isInteger(a?.id)||a.id<1||a.revision!==body.expected_revision+1||
                p?.report_id!==expected[0]||p?.observation_id!==expected[1]||p?.report_version!==body.expected_report_version||
                p?.concern_version!==body.expected_concern_version||a.field_observation_id!==body.field_observation_id||
                !equal(a.category_findings,body.category_findings)||a.reason!==body.reason||receipt.lifecycle_changed!==false)
                throw new Error('No complete assessment receipt was confirmed. Recover the original save.');
        }catch(error){
            const denied=[400,401,403,404,409,413,415,422,429].includes(error.status);
            if(denied&&(!recovery||[400,409,422].includes(error.status)))
                await store.update(slot,current=>current?.key===operation.key?{...current,state:'rejected'}:current);
            throw error;
        }
        let cleanupWarning=false;
        try{await store.update(slot,current=>current?.key===operation.key?{...current,state:'confirmed',receipt}:current);}
        catch{cleanupWarning=true;}
        return {...receipt,cleanupWarning};
    }};
}

export async function fetchFieldPhoto(context,{token,apiBase='',signal,fetchImpl=fetch}={}) {
    const path=context?.private_evidence_url,expected=context?.field?.evidence_sha256;
    if(!/^\/api\/gov\/predictive\/inspection-evidence\/[0-9a-f-]{36}$/.test(path)||!token||!/^[0-9a-f]{64}$/.test(expected))
        throw new Error('A stored private photo reference is required. Reload this visit.');
    const response=await fetchImpl(apiBase+path,{headers:{Authorization:`Bearer ${token}`},signal});
    if(!response.ok)throw new Error(response.status===401?'Your session has expired. Sign in again to view evidence.':'The private photo could not be opened. Refresh the field evidence and retry.');
    const reader=response.body?.getReader();
    if(!reader)throw new Error('Private photo streaming is unavailable in this browser.');
    const chunks=[];let size=0;
    try{
        while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
            if(size>5*1024*1024)throw new Error('The private photo exceeds the supported size. Refresh its evidence record.');chunks.push(value);}
    }catch(error){await reader.cancel().catch(()=>{});throw error;}
    finally{reader.releaseLock();}
    const type=response.headers.get('content-type')?.split(';')[0];
    if(!size||!['image/png','image/jpeg','image/webp'].includes(type))throw new Error('The private evidence response is not a supported photo.');
    const blob=new Blob(chunks,{type});
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
    if(hash!==expected)throw new Error('The displayed photo differs from the stored evidence. Reload the field visit.');
    return blob;
}
