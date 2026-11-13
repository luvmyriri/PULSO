import test from 'node:test';
import assert from 'node:assert/strict';
import {pairVersions,pairDecision,createPairCommand} from '../observationPair.js';

const path='/api/report-intelligence/reports/5/observations/20/pairs/10';
const context={source_observation_id:20,target_observation_id:10,pair_revision:3,
    evidence:{left:{observation_id:10,report_version:7,concern_version:4},right:{observation_id:20,report_version:9,concern_version:2}}};
const payload=()=>pairDecision(context,'uncertain',['location'],'SAMPLE insufficient identity evidence for a reliable comparison.');
const receipt=body=>({membership_changed:false,review:{id:1,revision:4,relation:body.relation,
    snapshot:{left:{observation_id:10},right:{observation_id:20}}}});
function store(){const records=new Map();let queue=Promise.resolve();return {records,load:async key=>structuredClone(records.get(key)),
    update(key,change){const next=queue.catch(()=>{}).then(()=>{const value=change(structuredClone(records.get(key)));records.set(key,structuredClone(value));return value;});queue=next;return next;}};}

test('canonical pair order never swaps source and destination report versions',()=>{
    assert.deepEqual(pairVersions(context),{expected_version:9,expected_target_version:7,
        expected_concern_version:2,expected_target_concern_version:4,expected_pair_revision:3});
    assert.throws(()=>pairVersions({...context,source_observation_id:30}),/incomplete/);
});
test('decisive labels require observed evidence and uncertainty remains explicit',()=>{
    assert.equal(payload().relation,'uncertain');
    assert.throws(()=>pairDecision(context,'same_problem',['location'],'SAMPLE reasonable long description of evidence.'),/photos or a field visit/);
    assert.throws(()=>pairDecision(context,'uncertain',['photos','photos'],'SAMPLE reasonable long description of evidence.'),/Choose/);
    assert.throws(()=>pairDecision(context,'different_asset',['photos'],'short'),/20 to 2000/);
});
test('lost acknowledgement and controller reload replay the original body and operation key',async()=>{
    const cache=store(), calls=[];
    const request=async(url,options)=>{calls.push(options);if(calls.length===1)throw new Error('SAMPLE lost response');return receipt(options.body);};
    const options={principal:'subject:SAMPLE',path,request,store:cache};
    const first=createPairCommand(options);await assert.rejects(first.submit(payload()),/lost/);
    const second=createPairCommand(options);assert.equal((await second.load()).state,'pending');
    const result=await second.submit({...payload(),reason:'SAMPLE edited fields cannot replace an uncertain review.'});
    assert.equal(result.membership_changed,false);assert.deepEqual(calls[0],calls[1]);
    assert.equal((await second.load()).state,'confirmed');
});
test('storage failure prevents a request; accounts and pairs do not share operations',async()=>{
    let sent=false;const request=async()=>{sent=true;};
    const command=createPairCommand({principal:'subject:SAMPLE',path,request,store:{update:async()=>{throw new Error('SAMPLE storage');}}});
    await assert.rejects(command.submit(payload()),/storage/);assert.equal(sent,false);
    const cache=store();const original=createPairCommand({principal:'subject:A',path,store:cache,request:async()=>{throw new Error('SAMPLE lost');}});
    await assert.rejects(original.submit(payload()));
    assert.equal(await createPairCommand({principal:'subject:B',path,store:cache}).load(),undefined);
    assert.equal(await createPairCommand({principal:'subject:A',path:path+'1',store:cache}).load(),undefined);
    await assert.rejects(createPairCommand({principal:'guest',path,store:cache}).load(),/Sign in/);
});
test('rejected versions allow a freshly reviewed command while an incomplete receipt stays pending',async()=>{
    const cache=store();let reject=true;
    const request=async(_,options)=>{if(reject){const error=new Error('SAMPLE stale');error.status=409;throw error;}return receipt(options.body);};
    const command=createPairCommand({principal:'SAMPLE',path,request,store:cache});
    await assert.rejects(command.submit(payload()),/stale/);const old=(await command.load()).key;
    assert.equal((await command.load()).state,'rejected');reject=false;
    await command.submit({...payload(),expected_pair_revision:4});assert.notEqual((await command.load()).key,old);
    const bad=createPairCommand({principal:'OTHER',path,store:cache,request:async()=>({...receipt(payload()),membership_changed:true})});
    await assert.rejects(bad.submit(payload()),/No complete/);assert.equal((await bad.load()).state,'pending');
});
test('a confirmed receipt survives a device receipt write failure',async()=>{
    const cache=store();let writes=0;
    const original=cache.update;
    cache.update=(...args)=>{if(++writes===2)throw new Error('SAMPLE cleanup');return original(...args);};
    const command=createPairCommand({principal:'SAMPLE',path,store:cache,request:async(_,options)=>receipt(options.body)});
    const result=await command.submit(payload());assert.equal(result.cleanupWarning,true);
    assert.equal((await command.load()).state,'pending');
});
