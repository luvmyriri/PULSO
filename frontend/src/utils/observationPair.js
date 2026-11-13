import { loadReportEvidence, updateReportEvidence } from './reportEvidenceStore.js';

export const PAIR_RELATIONS = {
    same_problem:'Same problem episode',
    same_asset_different_problem:'Same asset, different problem',
    different_asset:'Different assets',
    uncertain:'Cannot determine yet',
};
export const PAIR_BASES = {photos:'Report photos',field_visit:'Field visit',location:'Recorded locations',report_details:'Report descriptions'};
const schema='pulso-pair-review-command-v1';
const defaultStore={load:loadReportEvidence,update:updateReportEvidence};
export function pairVersions(context) {
    const evidence=context?.evidence;
    const source=[evidence?.left,evidence?.right].find(item=>item?.observation_id===context?.source_observation_id);
    const target=[evidence?.left,evidence?.right].find(item=>item?.observation_id===context?.target_observation_id);
    if(!source||!target||!Number.isInteger(context.pair_revision)||context.pair_revision<0||
        [source.report_version,target.report_version,source.concern_version,target.concern_version].some(n=>!Number.isInteger(n)||n<1))
        throw new Error('The comparison context is incomplete. Reload both observations.');
    return {expected_version:source.report_version,expected_target_version:target.report_version,
        expected_concern_version:source.concern_version,expected_target_concern_version:target.concern_version,
        expected_pair_revision:context.pair_revision};
}
export function pairDecision(context,relation,basis,reason) {
    if(!Object.hasOwn(PAIR_RELATIONS,relation)||!basis.length||new Set(basis).size!==basis.length||basis.some(key=>!Object.hasOwn(PAIR_BASES,key)))
        throw new Error('Choose a comparison result and its evidence.');
    if(relation!=='uncertain'&&!basis.some(key=>['photos','field_visit'].includes(key)))
        throw new Error('A definite comparison needs report photos or a field visit. Location alone cannot establish identity.');
    if(reason.trim().length<20||reason.trim().length>2000)throw new Error('Explain the reviewed evidence in 20 to 2000 characters.');
    return {...pairVersions(context),relation,evidence_basis:[...basis].sort(),reason:reason.trim()};
}

export function createPairCommand({principal,path,request,store=defaultStore}) {
    const requirePrincipal=()=>{if(!principal||['guest','invalid-session'].includes(principal))throw new Error('Sign in to review observations.');};
    const slot=`pulso-pair-review-v1:${encodeURIComponent(principal)}:${path}`;
    const checked=record=>{
        if(record!=null&&(record.schema!==schema||record.principal!==principal||record.path!==path||
            !['pending','confirmed','rejected'].includes(record.state)||typeof record.key!=='string'||record.key.length<32||
            !record.payload||!Object.hasOwn(PAIR_RELATIONS,record.payload.relation)))
            throw new Error('The original review could not be read. Retry device storage before recording another comparison.');
        return record;
    };
    return {slot,load:async()=>{requirePrincipal();return checked(await store.load(slot));},
        async submit(payload=null) {
            requirePrincipal();
            const operation=await store.update(slot,current=>{
                checked(current);
                if(current?.state==='pending')return current;
                if(!payload)throw new Error('No original review is pending on this device. Reload comparison history.');
                return {schema,principal,path,state:'pending',key:crypto.randomUUID(),payload:structuredClone(payload)};
            });
            let receipt;
            try {
                receipt=await request(path,{method:'POST',headers:{'Idempotency-Key':operation.key},body:operation.payload});
                const result=receipt?.review;
                const ids=[result?.snapshot?.left?.observation_id,result?.snapshot?.right?.observation_id].sort((a,b)=>a-b);
                const expected=path.match(/observations\/(\d+)\/pairs\/(\d+)$/)?.slice(1).map(Number).sort((a,b)=>a-b);
                if(!Number.isInteger(result?.id)||result.id<=0||!Number.isInteger(result.revision)||result.revision<=0||
                    !expected||ids.some((id,index)=>id!==expected[index])||
                    result.relation!==operation.payload.relation||receipt.membership_changed!==false)
                    throw new Error('No complete review receipt was confirmed. Recover the original review.');
            }catch(error){
                if([400,401,403,404,409,413,415,422,429].includes(error.status)){
                    await store.update(slot,current=>current?.key===operation.key?{...current,state:'rejected'}:current);
                }
                throw error;
            }
            let cleanupWarning=false;
            try{await store.update(slot,current=>current?.key===operation.key?{...current,state:'confirmed',receipt}:current);}
            catch{cleanupWarning=true;}
            return {...receipt,cleanupWarning};
        }};
}
