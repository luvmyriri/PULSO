import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldAssessmentDecision,createFieldAssessmentCommand,fetchFieldPhoto} from '../observationField.js';

const path='/api/report-intelligence/reports/5/observations/20/field-assessments';
const id='00000000-0000-0000-0000-000000000001';
const context={can_record:true,expected_revision:3,expected_field_sha256:'a'.repeat(64),
    problem:{report_id:5,observation_id:20,report_version:9,concern_version:2,categories:['Roads & Bridges','Water & Drainage']},
    field:{field_observation_id:id,condition:'defect_observed'}};
const findings={'Roads & Bridges':'no_defect_observed','Water & Drainage':'defect_observed'};
const body=()=>fieldAssessmentDecision(context,findings,true,'SAMPLE independently compared every reported category with the reviewed field photo.');
const receipt=payload=>({lifecycle_changed:false,assessment:{id:1,revision:payload.expected_revision+1,
    snapshot:{problem:{...context.problem,report_version:payload.expected_report_version,concern_version:payload.expected_concern_version}},
    field_observation_id:payload.field_observation_id,category_findings:payload.category_findings,reason:payload.reason}});
function store(){const records=new Map();let queue=Promise.resolve();return {load:async key=>structuredClone(records.get(key)),
    update(key,change){const next=queue.catch(()=>{}).then(()=>{const value=change(structuredClone(records.get(key)));records.set(key,structuredClone(value));return value;});queue=next;return next;}};}

test('each category is explicit, uncertainty is retained and versions come from the reviewed context',()=>{
    assert.deepEqual(body().category_findings,[{category:'Roads & Bridges',finding:'no_defect_observed'},{category:'Water & Drainage',finding:'defect_observed'}]);
    assert.equal(body().expected_report_version,9);
    assert.throws(()=>fieldAssessmentDecision(context,{'Roads & Bridges':'no_defect_observed'},true,body().reason),/every reported category/);
    assert.throws(()=>fieldAssessmentDecision(context,findings,false,body().reason),/same reported object/);
    assert.throws(()=>fieldAssessmentDecision(context,{'Roads & Bridges':'no_defect_observed','Water & Drainage':'no_defect_observed'},true,body().reason),/conflict/);
    assert.throws(()=>fieldAssessmentDecision({...context,can_record:false},findings,true,body().reason),/not available/);
    assert.throws(()=>fieldAssessmentDecision({...context,expected_revision:-1},findings,true,body().reason),/incomplete/);
});

test('lost acknowledgement and a new controller recover the original key/body despite edited fields',async()=>{
    const cache=store(),calls=[];
    const request=async(_,options)=>{calls.push(options);if(calls.length===1)throw new Error('SAMPLE lost response');return receipt(options.body);};
    const options={principal:'subject:SAMPLE',path,store:cache,request};
    await assert.rejects(createFieldAssessmentCommand(options).submit(body()),/lost response/);
    const driver=createFieldAssessmentCommand(options);assert.equal((await driver.load()).state,'pending');
    const result=await driver.submit({...body(),reason:'SAMPLE later edits must never replace the pending judgment.'});
    assert.equal(result.lifecycle_changed,false);assert.deepEqual(calls[0],calls[1]);assert.equal((await driver.load()).state,'confirmed');
});

test('incomplete or different-observation receipts never clear the pending operation',async()=>{
    for(const corrupt of [r=>r.lifecycle_changed=true,r=>r.assessment.snapshot.problem.observation_id=99,
        r=>r.assessment.category_findings=[],r=>r.assessment.revision=8,r=>r.assessment.field_observation_id='other']){
        const cache=store(),driver=createFieldAssessmentCommand({principal:'SAMPLE',path,store:cache,request:async(_,options)=>{const result=structuredClone(receipt(options.body));corrupt(result);return result;}});
        await assert.rejects(driver.submit(body()),/complete assessment receipt/);assert.equal((await driver.load()).state,'pending');
    }
});

test('storage failure prevents network writes and accounts/observations remain isolated',async()=>{
    let sent=false;const broken=createFieldAssessmentCommand({principal:'A',path,request:async()=>{sent=true;},store:{update:async()=>{throw new Error('SAMPLE storage');}}});
    await assert.rejects(broken.submit(body()),/storage/);assert.equal(sent,false);
    const cache=store();const first=createFieldAssessmentCommand({principal:'A',path,store:cache,request:async()=>{throw new Error('SAMPLE lost');}});
    await assert.rejects(first.submit(body()));
    assert.equal(await createFieldAssessmentCommand({principal:'B',path,store:cache}).load(),undefined);
    assert.equal(await createFieldAssessmentCommand({principal:'A',path:path.replace('/20/','/21/'),store:cache}).load(),undefined);
    await assert.rejects(createFieldAssessmentCommand({principal:'guest',path,store:cache}).load(),/Sign in/);
});

test('recovery blocked by changed authorization preserves the uncertain original command',async()=>{
    const cache=store();let code=null;
    const driver=createFieldAssessmentCommand({principal:'SAMPLE',path,store:cache,request:async()=>{const error=new Error('SAMPLE interrupted');if(code)error.status=code;throw error;}});
    await assert.rejects(driver.submit(body()));const key=(await driver.load()).key;
    code=403;await assert.rejects(driver.submit());assert.equal((await driver.load()).state,'pending');assert.equal((await driver.load()).key,key);
    code=409;await assert.rejects(driver.submit());assert.equal((await driver.load()).state,'rejected');
});

test('a genuine version conflict permits a new explicit judgment with a new operation key',async()=>{
    const cache=store();let reject=true;
    const driver=createFieldAssessmentCommand({principal:'SAMPLE',path,store:cache,request:async(_,options)=>{if(reject){const e=new Error('SAMPLE conflict');e.status=409;throw e;}return receipt(options.body);}});
    await assert.rejects(driver.submit(body()));const previous=(await driver.load()).key;
    reject=false;await driver.submit({...body(),expected_revision:4});assert.notEqual((await driver.load()).key,previous);
});

test('confirmed server receipt survives local receipt-write failure for later replay',async()=>{
    const cache=store(),original=cache.update;let writes=0;
    cache.update=(...args)=>++writes===2?Promise.reject(new Error('SAMPLE receipt cleanup')):original(...args);
    const driver=createFieldAssessmentCommand({principal:'SAMPLE',path,store:cache,request:async(_,options)=>receipt(options.body)});
    assert.equal((await driver.submit(body())).cleanupWarning,true);assert.equal((await driver.load()).state,'pending');
    assert.equal((await driver.submit()).assessment.id,1);assert.equal((await driver.load()).state,'confirmed');
});

test('private photos require bounded same-origin authenticated bytes matching the reviewed digest',async()=>{
    const bytes=new Uint8Array([1,2,3]);
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    const evidence={private_evidence_url:'/api/gov/predictive/inspection-evidence/'+id,field:{evidence_sha256:hash}};
    let sent=0;
    const fetchImpl=async(url,options)=>{sent++;assert.equal(url,'http://localhost'+evidence.private_evidence_url);assert.equal(options.headers.Authorization,'Bearer SAMPLE');return new Response(bytes,{headers:{'content-type':'image/png'}});};
    const result=await fetchFieldPhoto(evidence,{token:'SAMPLE',apiBase:'http://localhost',fetchImpl});assert.equal(result.size,3);
    await assert.rejects(fetchFieldPhoto({...evidence,private_evidence_url:'https://elsewhere.invalid/private'},{token:'SAMPLE',fetchImpl}),/reference/);assert.equal(sent,1);
    await assert.rejects(fetchFieldPhoto({...evidence,field:{evidence_sha256:'a'.repeat(64)}},{token:'SAMPLE',apiBase:'http://localhost',fetchImpl}),/differs/);
    await assert.rejects(fetchFieldPhoto(evidence,{token:'SAMPLE',fetchImpl:async()=>new Response(new Uint8Array(5*1024*1024+1),{headers:{'content-type':'image/png'}})}),/exceeds/);
});
