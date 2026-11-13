// SAMPLE-only browser review. Real components and IndexedDB; all APIs mocked.
import React, {useState} from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ReportConcernReview from '../../src/components/government/ReportConcernReview';
import '../../src/index.css';
import '../../src/components/government/report-docket.css';

const token='SAMPLE.'+btoa(JSON.stringify({sub:'SAMPLE-pair-review@test.invalid'}))+'.SAMPLE';
localStorage.setItem('pulso_token',token);sessionStorage.setItem('pulso_token',token);
let mode='normal', denied=false, failedRead=false;
let assistanceEnabled=false,analysisMode='normal',analysisReadFailed=false;
const serverKey='SAMPLE-pair-review-server-v2';
let state=JSON.parse(localStorage.getItem(serverKey)||'null')||{reviews:[],receipts:{},version:1,grouped:false};
state.jobs||=[];state.analysisReceipts||={};
const save=()=>localStorage.setItem(serverKey,JSON.stringify(state));
const item=id=>({id:id*10,report_id:id,item_key:'issue-1',categories:['Roads & Bridges'],
    description:`SAMPLE observation ${id}: an infrastructure issue for comparing report context. Images are illustrative city photos.`,
    concern_id:state.grouped?'SAMPLE-CONCERN-2':`SAMPLE-CONCERN-${id}`,concern_version:state.version,
    association_status:state.grouped?'reviewer_confirmed':'unreviewed',contributing_report_count:state.grouped?2:1});
const snapshot=()=>({schema_version:'observation-pair-evidence-v1',left:{...item(1),observation_id:10,report_version:state.version,photo_present:true},
    right:{...item(2),observation_id:20,report_version:state.version,photo_present:true},distance_m:8,shared_categories:['Roads & Bridges']});
const record=id=>({report_version:state.version,can_associate:true,can_review_pairs:true,
    staff_evidence:{report_id:id,ticket_id:`SAMPLE-REPORT-${id}`,photo_url:location.origin+'/caloocan-day.jpg',photo_source:'unknown',photo_captured_at:null,location_string:'SAMPLE test location; not a real reported incident'},
    observations:[item(id)],candidates:[{report_id:id===1?2:1,ticket_id:`SAMPLE-REPORT-${id===1?2:1}`,distance_m:8,decision:'review_required'}]});
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
window.fetch=async(url,options={})=>{
    const path=new URL(url,location.origin).pathname;
    const id=Number(path.match(/reports\/(\d+)/)?.[1]);
    if(![1,2].includes(id))return response({detail:'SAMPLE route unavailable'},404);
    if(path.endsWith('/analysis')){
        if(options.method!=='POST'){
            if(analysisReadFailed)return response({detail:'SAMPLE image job read failed. Manual comparison is still available.'},503);
            const active=state.jobs.some(job=>['queued','running'].includes(job.status));
            const block=!assistanceEnabled?'Image assistance is disabled. Manual comparison remains available.':denied?'SAMPLE review ownership is required.':active?'An analysis is already queued or running. Check its progress before requesting another.':null;
            return response({enabled:assistanceEnabled,can_request:!block,request_block_reason:block,maximum_results:10,jobs:state.jobs.slice(0,10)});
        }
        if(denied)return response({detail:'SAMPLE review ownership denied.'},403);
        const key=options.headers['Idempotency-Key'];
        if(state.analysisReceipts[key])return response(state.jobs.find(job=>job.id===state.analysisReceipts[key]),202);
        if(!assistanceEnabled)return response({detail:'SAMPLE assistance disabled.'},503);
        const payload=JSON.parse(options.body);
        if(payload.expected_version!==state.version||payload.expected_target_version!==state.version)return response({detail:'SAMPLE evidence changed; reload both reports.'},409);
        if(state.jobs.some(job=>['queued','running'].includes(job.status)))return response({detail:'SAMPLE existing active analysis.'},409);
        const hashes={original_sha256:'a'.repeat(64),prepared_sha256:'b'.repeat(64)};
        const job={id:crypto.randomUUID(),status:'queued',created_at:new Date().toISOString(),finished_at:null,
            image_a_observation_id:10,image_b_observation_id:20,model:'SAMPLE-Gemini-model',prompt_version:'pulso-visual-pair-v1',image_recipe:'SAMPLE metadata-free copy',
            image_hashes:[hashes,hashes],context_current:true,lease_expired:false,provider_call_may_have_started:false,result:null,failure_code:null,
            review_required:true,membership_changed:false,training_release_eligible:false};
        state.jobs.unshift(job);state.analysisReceipts[key]=job.id;save();
        if(analysisMode==='lost'){analysisMode='normal';throw new Error('SAMPLE analysis acknowledgement lost. Recover its original request.');}
        return response(job,202);
    }
    if(path.includes('/pairs/')){
        if(options.method!=='POST'){
            if(failedRead)return response({detail:'SAMPLE comparison read failed; retry.'},503);
            return response({evidence:snapshot(),source_observation_id:10,target_observation_id:20,current_user_id:1,
                pair_revision:state.reviews.length,can_record_review:!denied,record_block_reason:denied?'SAMPLE: only a coordinator or owner of both reports can record.':null,
                maximum_history_results:20,reviews:[...state.reviews].reverse().slice(0,20)});
        }
        if(denied)return response({detail:'SAMPLE review ownership denied.'},403);
        const payload=JSON.parse(options.body), key=options.headers['Idempotency-Key'];
        if(state.receipts[key])return response(state.receipts[key]);
        if(mode==='conflict'){mode='normal';return response({detail:'SAMPLE concurrent review; reload.'},409);}
        if(payload.expected_pair_revision!==state.reviews.length)return response({detail:'SAMPLE stale pair revision'},409);
        const review={id:state.reviews.length+1,revision:state.reviews.length+1,relation:payload.relation,evidence_basis:payload.evidence_basis,
            reason:payload.reason,actor_id:1,created_at:new Date().toISOString(),snapshot:snapshot(),current_evidence:true,training_release_eligible:false};
        const receipt={review,membership_changed:false};state.reviews.push(review);state.receipts[key]=receipt;save();
        if(mode==='lost'){mode='normal';throw new Error('SAMPLE acknowledgement lost. Recover the original comparison.');}
        return response(receipt);
    }
    if(path.endsWith('/association')&&options.method==='POST'){state.grouped=JSON.parse(options.body).target_observation_id!==null;state.version++;save();return response({...record(id),version:state.version});}
    return response(record(id));
};
function Fixture(){const [revision,setRevision]=useState(0),[info,setInfo]=useState('SAMPLE APIs only.');
    function advance(kind){const job=state.jobs[0];if(!job){setInfo('SAMPLE: request a job first.');return;}
        job.provider_call_may_have_started=true;
        if(kind==='completed'){
            job.status='completed';job.finished_at=new Date().toISOString();job.lease_expired=false;job.failure_code=null;
            job.result={model_version:'SAMPLE-provider-version',review_required:true,location_verified:false,training_release_eligible:false,episode_identity:'not_established_from_images',
                hints:{source_usable:true,target_usable:true,asset_relation:'uncertain',defect_relation:'uncertain',visible_matches:['SAMPLE repeated design visible in the illustrative images.'],
                    visible_differences:[],limitations:['SAMPLE fixture output only. Object and episode identity are not established.']}};
        }else if(kind==='failed'){job.status='failed';job.result=null;job.lease_expired=false;job.failure_code='provider_failed_or_invalid_output';}
        else{job.status='running';job.lease_expired=true;job.result=null;}
        save();setInfo('SAMPLE analysis state: '+kind+'. Refresh image status to inspect it.');
    }
    return <MemoryRouter><main className="pair-review-fixture">
        <header><strong>SAMPLE comparison review — mocked APIs and illustrative photos. No real ticket, location or model.</strong>
            <div className="gov-form-actions">
                <button className="gov-button" onClick={()=>document.documentElement.classList.toggle('dark')}>Toggle fixture theme</button>
                <button className="gov-button" onClick={()=>{mode='lost';setInfo('SAMPLE next save loses its acknowledgement after commit.');}}>Lose next acknowledgement</button>
                <button className="gov-button" onClick={()=>{mode='conflict';setInfo('SAMPLE next save returns conflict.');}}>Conflict on next save</button>
                <button className="gov-button" onClick={()=>{denied=!denied;setInfo('SAMPLE ownership denied: '+denied);setRevision(n=>n+1);}}>Toggle review ownership</button>
                <button className="gov-button" onClick={()=>{failedRead=!failedRead;setInfo('SAMPLE comparison read failure: '+failedRead);setRevision(n=>n+1);}}>Toggle comparison read failure</button>
                <button className="gov-button" onClick={()=>{assistanceEnabled=!assistanceEnabled;setInfo('SAMPLE image assistance enabled: '+assistanceEnabled);}}>Toggle image assistance</button>
                <button className="gov-button" onClick={()=>{analysisMode='lost';setInfo('SAMPLE next image request loses its acknowledgement.');}}>Lose image request acknowledgement</button>
                <button className="gov-button" onClick={()=>advance('completed')}>Complete SAMPLE analysis</button>
                <button className="gov-button" onClick={()=>advance('failed')}>Fail SAMPLE analysis</button>
                <button className="gov-button" onClick={()=>advance('expired')}>Interrupt SAMPLE worker</button>
                <button className="gov-button" onClick={()=>{state.version++;state.jobs.forEach(job=>{job.context_current=false;});save();setInfo('SAMPLE report evidence changed.');}}>Change SAMPLE evidence</button>
                <button className="gov-button" onClick={()=>{analysisReadFailed=!analysisReadFailed;setInfo('SAMPLE image history read failure: '+analysisReadFailed);}}>Toggle image history failure</button>
            </div><p role="status">{info}</p></header>
        <section className="report-docket"><header><h2 tabIndex={-1}>SAMPLE-REPORT-1 · Concern review</h2></header>
            <div className="report-docket-body"><ReportConcernReview key={revision} reportId={1}/></div>
        </section>
    </main></MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
