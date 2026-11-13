import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraFrameProvenance, createCaptureLocationSampler, normalizeCaptureFix } from '../captureLocation.js';
import { locationEvidence } from '../reportIntake.js';
import {packResidentPhoto,unpackResidentPhoto} from '../residentReportDraft.js';
import {fieldPayload} from '../fieldSurvey.js';

const base = Date.parse('2026-11-06T00:00:00Z');
const fix = (offset = 0, values = {}) => ({ latitude: 14.72, longitude: 121.04, accuracy_m: 12,
    measured_at: new Date(base + offset).toISOString(), ...values });
function provider(options = {}) {
    let at = base;
    let success, failure;
    const timers = new Map(), states = [], cleared = [];
    let optionsSent;
    const geo = {
        watchPosition(ok, error, sent) { success = ok; failure = error; optionsSent = sent; return 0; },
        clearWatch(id) { cleared.push(id); },
    };
    const sampler = createCaptureLocationSampler({ geolocation: geo, now: () => at,
        setTimer: (fn, delay) => { timers.set(1, { fn, delay }); return 1; }, clearTimer: id => timers.delete(id),
        onState: state => states.push(state), ...options });
    return { sampler, states, cleared, timers, advance: delta => { at = base + delta; },
        emit: (offset, coords = {}) => success({ timestamp: base + offset, coords: { latitude: 14.72, longitude: 121.04, accuracy: 12, ...coords } }),
        raw: position => success(position), error: code => failure({ code }), sent: () => optionsSent };
}

test('frame selection uses latest eligible pre-capture fix without averaging or changing source time', () => {
    const old = fix(-5000, { latitude: 14.71 });
    const selected = fix(-1000, { latitude: 14.73 });
    const future = fix(1000);
    const frame = cameraFrameProvenance([old, selected, future], base);
    assert.equal(frame.deviceFix.latitude, 14.73);
    assert.equal(frame.deviceFix.measured_at, selected.measured_at);
    selected.latitude = 15;
    assert.equal(frame.deviceFix.latitude, 14.73);
    assert.equal(frame.capturedAt, '2026-11-06T00:00:00.000Z');
    assert.equal(cameraFrameProvenance([fix(-120001)], base).deviceFix, null);
    assert.equal(cameraFrameProvenance([fix(-120000)], base).deviceFix.measured_at, fix(-120000).measured_at);
});

test('capture always succeeds with unknown location when fixes are absent, stale or malformed', () => {
    for (const input of [null, fix(-130000), fix(1), fix(0,{latitude:91}), fix(0,{longitude:NaN}), fix(0,{measured_at:null})]) {
        assert.equal(cameraFrameProvenance([input],base).deviceFix,null);
    }
    assert.equal(normalizeCaptureFix(fix(0,{accuracy_m:0}),base).accuracy_m,null);
    assert.equal(normalizeCaptureFix(fix(0,{accuracy_m:200000}),base).accuracy_m,null);
});

test('watch is bounded and requests fresh high-accuracy estimates; capture clears ID zero and ignores late delivery', () => {
    const p = provider();
    p.sampler.start(); p.sampler.start();
    assert.deepEqual(p.sent(), { enableHighAccuracy:true, maximumAge:0, timeout:20000 });
    p.emit(-1000);
    const frame = p.sampler.capture();
    assert.equal(frame.deviceFix.measured_at,fix(-1000).measured_at);
    assert.deepEqual(p.cleared,[0]); assert.equal(p.timers.size,0);
    const count = p.states.length;
    p.emit(0,{latitude:14.75}); p.error(1);
    assert.equal(p.states.length,count);
    assert.equal(frame.deviceFix.latitude,14.72);
});

test('deadline stops watch even if fixes keep arriving and does not relabel old fixes as new', () => {
    const p = provider(); p.sampler.start(); p.emit(-1000);
    const deadline = p.timers.get(1);
    assert.equal(deadline.delay,20000);
    p.advance(20000); deadline.fn();
    assert.equal(p.states.at(-1).state,'timed_out'); assert.deepEqual(p.cleared,[0]);
    assert.equal(p.sampler.capture().deviceFix.measured_at,fix(-1000).measured_at);
    p.advance(130000);
    assert.equal(p.sampler.capture().deviceFix,null);
});

test('permission denial terminates collection while transient failure remains bounded', () => {
    const denied = provider(); denied.sampler.start(); denied.error(1);
    assert.equal(denied.states.at(-1).state,'denied'); assert.deepEqual(denied.cleared,[0]);
    assert.equal(denied.sampler.capture().deviceFix,null);
    const transient = provider(); transient.sampler.start(); transient.error(2);
    assert.equal(transient.states.at(-1).state,'unavailable'); assert.equal(transient.cleared.length,0);
    transient.emit(0); assert.equal(transient.states.at(-1).state,'available');
    transient.sampler.stop('hidden'); assert.equal(transient.timers.size,0); assert.deepEqual(transient.cleared,[0]);
});

test('unsupported or synchronously failing providers preserve photo capture and clean subscriptions', () => {
    const p = provider({geolocation:{}}); p.sampler.start();
    assert.equal(p.states.at(-1).state,'unsupported'); assert.equal(p.sampler.capture().deviceFix,null);
    let cleared;
    const sync = createCaptureLocationSampler({ now:()=>base,
        geolocation:{watchPosition(_ok,fail){fail({code:1});return 7;},clearWatch(id){cleared=id;}} });
    sync.start(); assert.equal(cleared,7);
    const thrown = provider({geolocation:{watchPosition(){throw new Error('SAMPLE unavailable');}}});
    thrown.sampler.start(); assert.equal(thrown.states.at(-1).state,'unavailable'); assert.equal(thrown.timers.size,0);
});

test('out-of-order, invalid and future readings never replace the latest valid capture fix', () => {
    const p = provider(); p.sampler.start(); p.emit(-1000,{latitude:14.73}); p.emit(-2000,{latitude:14.71});
    p.emit(1000); p.raw({timestamp:1e50,coords:{latitude:14.72,longitude:121.04}});
    assert.equal(p.sampler.capture().deviceFix.latitude,14.73);
});

test('intake keeps a moved issue pin and its original fix separate from the new camera fix', () => {
    const original = fix(-5000,{latitude:14.71});
    const frame = cameraFrameProvenance([fix(-1000,{latitude:14.73})],base);
    const evidence = locationEvidence({lat:14.74,lng:121.05,source:'selected-map',deviceFix:original,
        pinConfirmed:true,confirmedAt:new Date(base).toISOString()},
        {source:frame.source,capturedAt:frame.capturedAt,photoDeviceFix:frame.deviceFix});
    assert.equal(evidence.source,'manual');
    assert.equal(evidence.device_fix.latitude,14.71);
    assert.equal(evidence.photo_device_fix.latitude,14.73);
    assert.equal(evidence.photo_source,'camera');
    assert.equal(evidence.photo_captured_at,frame.capturedAt);
});

test('recorded request duration and first delivery time are distinct and remain frozen on later captures', () => {
    const p=provider();p.sampler.start();p.advance(1200);p.emit(1000);p.advance(5000);
    const frame=p.sampler.capture();
    assert.deepEqual(frame.locationRequest,{schema_version:'camera-location-request-v1',started_at:new Date(base).toISOString(),
        finished_at:new Date(base+5000).toISOString(),first_fix_received_at:new Date(base+1200).toISOString(),outcome:'success',end_reason:'capture'});
    p.advance(10000);assert.deepEqual(p.sampler.capture().locationRequest,frame.locationRequest);
    frame.locationRequest.outcome='denied';assert.equal(p.sampler.capture().locationRequest.outcome,'success');
    assert.equal(p.sampler.capture().deviceFix.measured_at,fix(1000).measured_at);
});

test('a seed fix cannot manufacture a successful request or its delivery time', () => {
    const p=provider({seedFix:fix(-1000)});p.sampler.start();p.advance(1000);p.error(1);
    const frame=p.sampler.capture();assert.ok(frame.deviceFix);
    assert.equal(frame.locationRequest.outcome,'denied');assert.equal(frame.locationRequest.first_fix_received_at,null);
    assert.equal(frame.locationRequest.end_reason,'permission_denied');
});

test('deadline, unsupported, hidden and no-result outcomes retain their actual acquisition interval', () => {
    const timeout=provider();timeout.sampler.start();const timer=timeout.timers.get(1);timeout.advance(20000);timer.fn();
    assert.equal(timeout.sampler.capture().locationRequest.outcome,'timeout');
    assert.equal(timeout.sampler.capture().locationRequest.end_reason,'deadline');
    const hidden=provider();hidden.sampler.start();hidden.advance(500);hidden.sampler.stop('hidden');
    assert.equal(hidden.sampler.capture().locationRequest.outcome,'cancelled');assert.equal(hidden.sampler.capture().locationRequest.end_reason,'hidden');
    const unsupported=provider({geolocation:{}});unsupported.sampler.start();assert.equal(unsupported.sampler.capture().locationRequest.outcome,'unsupported');
    const never=provider();assert.equal(never.sampler.capture().locationRequest.outcome,'not_requested');
    const rollback=provider();rollback.sampler.start();rollback.advance(-1000);assert.equal(rollback.sampler.capture().locationRequest,null);
    rollback.advance(2000);assert.equal(rollback.sampler.capture().locationRequest,null);
});

test('resident and field payloads carry the same original request through photo storage; uploads drop it', () => {
    const p=provider();p.sampler.start();p.advance(1000);p.emit(0);p.advance(2000);const frame=p.sampler.capture();
    const original=JSON.stringify(frame.locationRequest);
    const restored=unpackResidentPhoto(packResidentPhoto(new File(['SAMPLE'],'sample.png',{type:'image/png'}),frame));
    const resident=locationEvidence({},restored.provenance);
    const field=fieldPayload({latitude:'14.72',longitude:'121.04',observedAt:new Date(base+2000).toISOString(),
        pinConfirmed:true,visibility:'visible',condition:'defect_observed',notes:'SAMPLE original observation'},null,frame,false);
    assert.equal(JSON.stringify(resident.photo_location_request),original);
    assert.equal(JSON.stringify(field.location_metadata.photo_location_request),original);
    assert.equal(locationEvidence({},{...restored.provenance,source:'upload'}).photo_location_request,null);
    assert.equal(fieldPayload({latitude:'14.72',longitude:'121.04',observedAt:new Date(base+2000).toISOString(),
        pinConfirmed:true,visibility:'visible',condition:'defect_observed',notes:'SAMPLE upload'},null,{...frame,source:'upload'},false).location_metadata.photo_location_request,null);
});
