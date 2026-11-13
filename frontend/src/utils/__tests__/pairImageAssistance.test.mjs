import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisPayload,analysisStatus,createAnalysisCommand,currentVisualHints,validAnalysisJob,validateAnalysisHistory} from '../pairImageAssistance.js';

const path='/api/report-intelligence/reports/2/observations/20/pairs/10/analysis';
const context={source_observation_id:20,target_observation_id:10,pair_revision:3,evidence:{left:{observation_id:10,report_version:4,concern_version:2},right:{observation_id:20,report_version:8,concern_version:5}}};
const payload=()=>analysisPayload(context,true);
const hash={original_sha256:'a'.repeat(64),prepared_sha256:'b'.repeat(64)};
const job=()=>({id:crypto.randomUUID(),status:'queued',image_a_observation_id:10,image_b_observation_id:20,
    context_current:true,lease_expired:false,provider_call_may_have_started:false,image_hashes:[hash,hash],
    review_required:true,membership_changed:false,training_release_eligible:false});
const result=()=>({review_required:true,episode_identity:'not_established_from_images',location_verified:false,training_release_eligible:false,
    hints:{source_usable:true,target_usable:true,asset_relation:'uncertain',defect_relation:'uncertain',visible_matches:[],visible_differences:[],limitations:['SAMPLE image evidence cannot establish a unique object or episode.']}});
function repository(){let queue=Promise.resolve();const rows=new Map();return {rows,load:async key=>structuredClone(rows.get(key)),
    update(key,change){const next=queue.catch(()=>{}).then(()=>{const value=change(structuredClone(rows.get(key)));rows.set(key,structuredClone(value));return value;});queue=next;return next;}};}

test('disclosure is explicit and canonical order keeps source versions and omits human labels',()=>{
    assert.throws(()=>analysisPayload(context,false),/Review both photos/);
    assert.deepEqual(payload(),{expected_version:8,expected_target_version:4,expected_concern_version:5,expected_target_concern_version:2,photos_reviewed_for_provider:true});
    assert.equal('relation' in payload(),false);
});
test('malformed or wrong-pair receipts cannot become a received-job claim',()=>{
    assert.equal(validAnalysisJob(job(),path),true);
    assert.equal(validAnalysisJob({...job(),image_b_observation_id:30},path),false);
    assert.equal(validAnalysisJob({...job(),membership_changed:true},path),false);
    assert.equal(validAnalysisJob({...job(),image_hashes:[]},path),false);
    assert.throws(()=>validateAnalysisHistory({enabled:true,can_request:true,maximum_results:10,jobs:[{status:'completed'}]},path),/incomplete/);
    assert.equal(validateAnalysisHistory({enabled:false,can_request:false,maximum_results:10,jobs:[]},path).enabled,false);
    assert.throws(()=>validateAnalysisHistory({enabled:true,can_request:true,maximum_results:10,jobs:{}},path),/incomplete/);
    assert.throws(()=>validateAnalysisHistory({enabled:false,can_request:true,maximum_results:10,jobs:[]},path),/inconsistent/);
    assert.throws(()=>validateAnalysisHistory({enabled:true,can_request:true,maximum_results:10,jobs:[null]},path),/incomplete/);
});
test('lost acknowledgements survive reload and edited inputs replay the same original request',async()=>{
    const store=repository(),calls=[];const receipt=job();
    const options={principal:'subject:SAMPLE',path,store,request:async(_,request)=>{calls.push(request);if(calls.length===1)throw new Error('SAMPLE lost');return receipt;}};
    await assert.rejects(createAnalysisCommand(options).submit(payload()),/lost/);
    const reloaded=createAnalysisCommand(options);assert.equal((await reloaded.load()).state,'pending');
    await reloaded.submit({...payload(),expected_version:99});
    assert.deepEqual(calls[0],calls[1]);assert.equal((await reloaded.load()).state,'confirmed');
});
test('durable storage must succeed before a request; corrupt and other-account operations are not reused',async()=>{
    let sent=0;const request=async()=>{sent++;return job();};
    await assert.rejects(createAnalysisCommand({principal:'SAMPLE',path,request,store:{update:async()=>{throw new Error('SAMPLE quota');}}}).submit(payload()),/quota/);
    assert.equal(sent,0);
    const store=repository(),one=createAnalysisCommand({principal:'ONE',path,store,request:async()=>{throw new Error('SAMPLE lost');}});
    await assert.rejects(one.submit(payload()));
    assert.equal(await createAnalysisCommand({principal:'TWO',path,store}).load(),undefined);
    const [key,record]=[...store.rows.entries()][0];record.payload.expected_version=null;store.rows.set(key,record);
    await assert.rejects(one.load(),/could not be read/);
});
test('definitive conflicts require a new reviewed command; malformed responses remain pending',async()=>{
    const store=repository();let first=true;const keys=[];
    const command=createAnalysisCommand({principal:'SAMPLE',path,store,request:async(_,options)=>{keys.push(options.headers['Idempotency-Key']);if(first){const error=new Error('SAMPLE conflict');error.status=409;throw error;}return job();}});
    await assert.rejects(command.submit(payload()));assert.equal((await command.load()).state,'rejected');
    first=false;await command.submit({...payload(),expected_version:9});assert.notEqual(keys[0],keys[1]);
    const invalid=createAnalysisCommand({principal:'OTHER',path,store,request:async()=>({status:'queued'})});
    await assert.rejects(invalid.submit(payload()),/No complete/);assert.equal((await invalid.load()).state,'pending');
});
test('server receipt survives device cleanup failure',async()=>{
    const store=repository();let writes=0;const update=store.update;
    store.update=(...args)=>{if(++writes===2)throw new Error('SAMPLE cleanup');return update(...args);};
    const command=createAnalysisCommand({principal:'SAMPLE',path,store,request:async()=>job()});
    const receipt=await command.submit(payload());assert.equal(receipt.cleanupWarning,true);assert.equal((await command.load()).state,'pending');
});
test('stale, interrupted, unsafe or malformed outputs never become current visual advice',()=>{
    const complete={...job(),status:'completed',result:result()};
    assert.equal(currentVisualHints(complete).asset_relation,'uncertain');
    assert.equal(currentVisualHints({...complete,context_current:false}),null);
    assert.equal(currentVisualHints({...complete,result:{...result(),location_verified:true}}),null);
    const unsafe=result();unsafe.hints.source_usable=false;unsafe.hints.asset_relation='possibly_same';
    assert.equal(currentVisualHints({...complete,result:unsafe}),null);
    assert.equal(currentVisualHints(undefined),null);
    assert.equal(analysisStatus({...job(),status:'running',lease_expired:true}),'Worker progress is uncertain');
});
