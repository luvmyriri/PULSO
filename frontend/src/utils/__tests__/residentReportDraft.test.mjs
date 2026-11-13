import test from 'node:test';
import assert from 'node:assert/strict';
import {createResidentDraft,DraftConflict,packResidentPhoto,unpackResidentPhoto,reportDraftPrincipal,RESIDENT_DRAFT_MAX_AGE_MS} from '../residentReportDraft.js';
import {pendingReportIntake,submitReportIntake,recoverReportIntake,finishReportIntake} from '../reportIntake.js';
import {reportReceipt} from '../reportReceipt.js';

function repository(){const values=new Map();let queue=Promise.resolve();return{values,load:async key=>structuredClone(values.get(key)),
    update(key,change){const next=queue.catch(()=>{}).then(()=>{const result=change(structuredClone(values.get(key)));values.set(key,structuredClone(result));return result;});queue=next;return next;}};}
function storage(){const values=new Map();return{values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
const file=()=>new File(['SAMPLE original photo bytes'],'sample.png',{type:'image/png',lastModified:1000});
const provenance={source:'camera',capturedAt:'2026-11-06T00:00:02Z',photoDeviceFix:{latitude:14.72,longitude:121.04,accuracy_m:12,measured_at:'2026-11-06T00:00:01Z'},
    photoLocationRequest:{schema_version:'camera-location-request-v1',started_at:'2026-11-06T00:00:00Z',finished_at:'2026-11-06T00:00:02Z',
        first_fix_received_at:'2026-11-06T00:00:01Z',outcome:'success',end_reason:'capture'}};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const receipt={id:1,ticket_id:'SAMPLE-REPORT-1'};

test('draft bytes and provenance survive a controller reload without blob URLs or timestamp replacement',async()=>{
    const store=repository();const first=createResidentDraft({kind:'quick',principal:'SAMPLE-actor',store});await first.load();
    const packed=packResidentPhoto(file(),provenance);
    await first.save({photo:packed,notes:'SAMPLE concern',location:{lat:14.721,lng:121.041}});
    const second=createResidentDraft({kind:'quick',principal:'SAMPLE-actor',store});
    const restored=await second.load(), photo=unpackResidentPhoto(restored.data.photo);
    assert.equal(await photo.file.text(),'SAMPLE original photo bytes');assert.equal(photo.file.name,'sample.png');
    assert.deepEqual(photo.provenance,provenance);assert.equal(restored.data.location.lat,14.721);
    assert.ok(!JSON.stringify(restored.data).includes('blob:'));
});

test('accounts and flows have separate draft slots; invalid sessions do not select a resident slot',async()=>{
    const store=repository(), one=createResidentDraft({kind:'quick',principal:'SAMPLE-one',store});await one.load();await one.save({notes:'PRIVATE fixture'});
    assert.equal((await createResidentDraft({kind:'quick',principal:'SAMPLE-two',store}).load()).data,null);
    assert.equal((await createResidentDraft({kind:'wizard',principal:'SAMPLE-one',store}).load()).data,null);
    const token='SAMPLE.'+btoa(JSON.stringify({sub:'one@test.invalid'}))+'.SAMPLE';
    assert.equal(reportDraftPrincipal(token), 'subject:one@test.invalid');
    assert.equal(reportDraftPrincipal('invalid',{id:1}), 'invalid-session');
});

test('concurrent writers conflict and stale tabs cannot resurrect a cleared draft',async()=>{
    const store=repository(), args={kind:'quick',principal:'SAMPLE',store};
    const one=createResidentDraft(args),two=createResidentDraft(args);await Promise.all([one.load(),two.load()]);
    const results=await Promise.allSettled([one.save({notes:'SAMPLE first'}),two.save({notes:'SAMPLE second'})]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(results.find(r=>r.status==='rejected').reason instanceof DraftConflict);
    await one.clear();await assert.rejects(two.save({notes:'SAMPLE stale'}),DraftConflict);
    assert.equal((await createResidentDraft(args).load()).data,null);
});

test('expired drafts are not restored or silently deleted and load failures cannot become empty drafts',async()=>{
    const store=repository(), args={kind:'wizard',principal:'SAMPLE',store,now:()=>1000};
    const original=createResidentDraft(args);await original.load();await original.save({notes:'SAMPLE expired'});
    const old=createResidentDraft({...args,now:()=>RESIDENT_DRAFT_MAX_AGE_MS+2000});
    assert.equal((await old.load()).expired,true);assert.equal(store.values.size,1);
    const failed=createResidentDraft({...args,store:{load:async()=>{throw new Error('SAMPLE blocked');}}});
    await assert.rejects(failed.load());await assert.rejects(failed.save({notes:'SAMPLE'}),/Open the saved draft/);
});

test('a confirmed receipt marker prevents restoring a submitted draft if database cleanup fails',async()=>{
    const store=repository(), completionStore=storage(), args={kind:'quick',principal:'SAMPLE',store,completionStore};
    const driver=createResidentDraft(args);await driver.load();await driver.save({notes:'SAMPLE received'});
    const update=store.update;store.update=async()=>{throw new Error('SAMPLE disk unavailable');};
    await assert.rejects(driver.clear({confirmed:true}));store.update=update;
    const fresh=createResidentDraft(args);assert.equal((await fresh.load()).data,null);
    await fresh.save({notes:'SAMPLE new report'});
    assert.equal((await createResidentDraft(args).load()).data.notes,'SAMPLE new report');
});

test('uploads never inherit capture timestamps and missing/corrupt photo bytes fail validation',()=>{
    const photo=packResidentPhoto(file(),{...provenance,source:'upload'});
    assert.deepEqual(photo.provenance,{source:'upload',capturedAt:null,photoDeviceFix:null,photoLocationRequest:null});
    assert.throws(()=>unpackResidentPhoto({provenance}),/Choose a JPEG/);
    assert.throws(()=>packResidentPhoto(new Blob(['SAMPLE'],{type:'text/plain'})),/Choose a JPEG/);
});

test('receipt recovery works without local photos and original retries keep the immutable payload',async()=>{
    const local=storage(),images=new Map(),evidenceStore={save:async(k,v)=>images.set(k,v),load:async k=>images.get(k),drop:async k=>images.delete(k)};
    const options={fields:{description:'SAMPLE original'},image:file(),storage:local,evidenceStore,draftKey:'quick'};
    await assert.rejects(submitReportIntake({...options,fetchImpl:async()=>{throw new Error('SAMPLE connection lost');}}));
    const key=pendingReportIntake('quick',null,local).key;
    const recovered=await recoverReportIntake({draftKey:'quick',storage:local,evidenceStore:{load:async()=>{throw new Error('Must not read local photo');}},fetchImpl:async()=>response(receipt)});
    assert.equal(recovered.id,1);
    let posts=0;
    const replay=await recoverReportIntake({draftKey:'quick',storage:local,evidenceStore,fetchImpl:async(url,init)=>{
        if(!init.method)return response({},404);
        posts++;assert.equal(init.headers['Idempotency-Key'],key);assert.equal(init.body.get('description'),'SAMPLE original');
        assert.equal(await init.body.get('image').text(),'SAMPLE original photo bytes');return response(receipt);
    }});
    assert.equal(replay.id,1);assert.equal(posts,1);
    finishReportIntake('quick',null,local,evidenceStore);
    assert.equal(pendingReportIntake('quick',null,local),null);
});

test('corrupt operation state or original bytes block a replacement submission',async()=>{
    const local=storage(),images=new Map(),evidenceStore={save:async(k,v)=>images.set(k,v),load:async k=>images.get(k),drop:async()=>{}};
    const options={fields:{description:'SAMPLE original'},image:file(),storage:local,evidenceStore};
    await assert.rejects(submitReportIntake({...options,fetchImpl:async()=>{throw new Error('SAMPLE connection');}}));
    const key=pendingReportIntake('report',null,local).key;images.set(key,new Blob(['SAMPLE corruption']));
    await assert.rejects(recoverReportIntake({storage:local,evidenceStore,fetchImpl:async()=>response({},404)}),/integrity/);
    local.values.set([...local.values.keys()][0],'{bad JSON');
    let calls=0;
    await assert.rejects(submitReportIntake({...options,fetchImpl:async()=>{calls++;return response(receipt);}}),/could not be read/);
    assert.equal(calls,0);
});

test('unavailable photo storage prevents POST and receipt pages never manufacture a sample ticket',async()=>{
    let called=false;
    await assert.rejects(submitReportIntake({fields:{description:'SAMPLE'},image:file(),storage:storage(),fetchImpl:async()=>{called=true;return response(receipt);}}),/storage is unavailable/);
    assert.equal(called,false);
    assert.equal(reportReceipt({}),null);
    assert.equal(reportReceipt({ticketId:'SAMPLE',report:{id:1,ticket_id:'OTHER'}}),null);
    assert.deepEqual(reportReceipt({ticketId:receipt.ticket_id,report:receipt}),{
        ticketId:receipt.ticket_id,trackingToken:null,trackingUrl:null,createdAt:null,category:null,locationString:null,status:null});
});
