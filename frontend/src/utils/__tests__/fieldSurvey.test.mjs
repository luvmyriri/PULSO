import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldPayload, fieldIncidentPoint, frameProvenance, saveSurveyDraft, submitFieldSurvey, surveySlot } from '../fieldSurvey.js';

test('a missing or malformed field fix cannot become a default incident location', () => {
    for (const coords of [null, {}, { lat: 14.7 }, { lat: NaN, lng: 121 }, { lat: 91, lng: 121 }]) {
        assert.equal(fieldIncidentPoint(coords), null);
    }
    assert.deepEqual(fieldIncidentPoint({ lat: 0, lng: 0 }), { lat: 0, lng: 0 });
    assert.deepEqual(fieldIncidentPoint({ lat: 14.72, lng: 121.04 }), { lat: 14.72, lng: 121.04 });
});

const values={assetName:'SAMPLE inlet',category:'Drainage',barangayId:'1',observedAt:'2026-11-04T10:00',latitude:'14.72',longitude:'121.04',pinConfirmed:true,confirmedAt:'2026-11-04T02:00:00Z',visibility:'visible',condition:'defect_observed',notes:'SAMPLE visible blocked inlet at a synthetic site.'};
const fix={latitude:14.72,longitude:121.04,accuracy_m:12,measured_at:'2026-11-04T02:00:00Z'};
const receipt={asset:{asset_id:'SAMPLE-A'},observation:{id:'SAMPLE-O',asset_id:'SAMPLE-A'}};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function repo(){const data=new Map();return{data,load:async k=>data.get(k),save:async(k,v)=>data.set(k,structuredClone(v)),drop:async k=>data.delete(k)};}
const draft={values,deviceFix:fix,photo:{source:'upload'},image:new Blob(['SAMPLE bytes'],{type:'image/png'})};
const base=store=>({actorId:7,store,draft,payload:fieldPayload(values,fix,draft.photo,true),token:'SAMPLE-token'});

test('field payload preserves uncertainty, unknown capture time and unknown findings',()=>{
    const payload=fieldPayload({...values,latitude:'14.721',visibility:'unsafe'},fix,{source:'upload'},true);
    assert.equal(payload.location_metadata.source,'manual');assert.equal(payload.location_metadata.device_fix.accuracy_m,12);
    assert.equal(payload.location_metadata.photo_captured_at,null);assert.equal(payload.condition,'not_assessed');
    assert.throws(()=>fieldPayload({...values,latitude:''},fix,null,true));
    assert.throws(()=>fieldPayload({...values,pinConfirmed:false},fix,null,true));
    assert.equal(frameProvenance(fix,'2026-11-04T02:00:01Z').deviceFix.measured_at,fix.measured_at);
});

test('an uncertain save replays original payload and bytes after reload',async()=>{
    const store=repo();let key;
    await assert.rejects(submitFieldSurvey({...base(store),fetchImpl:async(url,options)=>{key=options.headers['Idempotency-Key'];throw new TypeError('SAMPLE disconnected');}}));
    const result=await submitFieldSurvey({...base(store),draft:{...draft,image:new Blob(['edited'])},payload:{...base(store).payload,notes:'edited'},fetchImpl:async(url,options)=>{
        assert.equal(options.headers['Idempotency-Key'],key);
        if(url.includes('/receipt?'))return response({detail:'not committed'},404);
        assert.equal(JSON.parse(options.body.get('payload')).notes,values.notes);
        assert.equal(await options.body.get('image').text(),'SAMPLE bytes');
        return response(receipt,201);
    }});
    assert.deepEqual(result,receipt);assert.equal(store.data.size,0);
});

test('receipt recovery avoids another POST and is partitioned by staff and target',async()=>{
    const store=repo();await store.save(surveySlot(7,null),{...draft,operation:{key:'SAMPLE-key',kind:'create_capture',assetId:null,payload:{},image:draft.image}});
    const result=await submitFieldSurvey({...base(store),fetchImpl:async(url,options)=>{assert.ok(url.includes('/receipt?'));assert.equal(options.method,undefined);return response(receipt);}});
    assert.deepEqual(result,receipt);assert.notEqual(surveySlot(7,'A'),surveySlot(8,'A'));assert.notEqual(surveySlot(7,null),surveySlot(7,'A'));
});

test('rejected validation permits correction while connection failure preserves the operation',async()=>{
    const store=repo();await assert.rejects(submitFieldSurvey({...base(store),fetchImpl:async()=>response({detail:'SAMPLE invalid observation'},422)}));
    assert.equal((await store.load(surveySlot(7,null))).operation,null);
    const newDraft=await saveSurveyDraft(surveySlot(7,null),{...draft,values:{...values,notes:'SAMPLE corrected observation'}},store);
    assert.match(newDraft.values.notes,/corrected/);
});

test('storage failure prevents network submission and cleanup failure preserves a confirmed receipt',async()=>{
    const store=repo();store.save=async()=>{throw new Error('SAMPLE quota');};
    await assert.rejects(submitFieldSurvey({...base(store),fetchImpl:async()=>assert.fail('network called before preserving evidence')}));
    const ready=repo();ready.drop=async()=>{throw new Error('SAMPLE cleanup');};
    assert.deepEqual(await submitFieldSurvey({...base(ready),fetchImpl:async()=>response(receipt,201)}),receipt);
});

test('pending operations cannot be overwritten by draft autosave or incomplete receipts',async()=>{
    const store=repo();await assert.rejects(submitFieldSurvey({...base(store),fetchImpl:async()=>response({asset:{asset_id:'SAMPLE-A'}},201)}));
    const key=(await store.load(surveySlot(7,null))).operation.key;
    const saved=await saveSurveyDraft(surveySlot(7,null),{values:{notes:'edited'}},store);
    assert.equal(saved.operation.key,key);assert.equal(saved.values.notes,values.notes);
});

test('a storage read failure before a new request keeps the draft editable',async()=>{
    const store=repo();store.load=async()=>{throw new Error('SAMPLE device storage unavailable');};
    await assert.rejects(submitFieldSurvey({...base(store),fetchImpl:async()=>assert.fail('network called after failed storage read')}),error=>error.pending===false);
});

test('a storage read failure during recovery preserves the uncertain state',async()=>{
    const store=repo();store.load=async()=>{throw new Error('SAMPLE device storage unavailable');};
    await assert.rejects(submitFieldSurvey({...base(store),payload:undefined,fetchImpl:async()=>assert.fail('network called without restored operation')}),error=>error.pending===true);
});
