import assert from 'node:assert/strict';
import { finishReportIntake as finishWithStore, locationEvidence, submitReportIntake as submitWithStore } from '../reportIntake.js';

const images=new Map();
const evidenceStore={save:async(key,value)=>images.set(key,value),load:async key=>images.get(key),drop:async key=>images.delete(key)};
const submitReportIntake=options=>submitWithStore({...options,evidenceStore});
const finishReportIntake=(key,token,storage)=>finishWithStore(key,token,storage,evidenceStore);

const entries = new Map();
const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
const calls = [];
const fetchImpl = async (url, options) => {
  calls.push({ url, ...options });
  return { ok: true, json: async () => ({ id: 1, ticket_id: 'FAKE-TICKET-1' }) };
};
const fix = { latitude: 14.75, longitude: 121.05, accuracy_m: 14, measured_at: '2026-10-31T05:00:00Z' };
const location = { lat: 14.7501, lng: 121.05, source: 'selected-map', deviceFix: fix, confirmed: true, confirmedAt: '2026-10-31T05:01:00Z' };
const metadata = locationEvidence(location, { source: 'upload' });
assert.equal(metadata.source, 'manual');
assert.equal(metadata.device_fix.accuracy_m, 14);
assert.equal(metadata.photo_captured_at, null);
assert.equal(metadata.issue_pin_confirmed, true);
assert.equal(locationEvidence({ source: 'device-gps', lat: 14.75, lng: 121.05 }).source, 'unknown');

const fields = { categories: ['Roads & Bridges', 'Water & Drainage'], description: 'FAKE test concern', location_metadata: metadata };
const image = new Blob(['FAKE evidence']);
await submitReportIntake({ fields, image, storage, fetchImpl });
await submitReportIntake({ fields, image, storage, fetchImpl });
assert.equal(calls.length, 2);
assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
assert.deepEqual(JSON.parse(calls[0].body.get('categories')), fields.categories);
assert.equal(calls[0].body.getAll('image').length, 1);
await submitReportIntake({ fields: { ...fields, description: 'FAKE changed observation' }, image, storage, fetchImpl });
// An uncertain submission is recovered before sending edited details.
assert.equal(calls[2].body, undefined);
finishReportIntake('report', null, storage);
await submitReportIntake({ fields, image, storage, fetchImpl });
assert.notEqual(calls[0].headers['Idempotency-Key'], calls[3].headers['Idempotency-Key']);
finishReportIntake('report', null, storage);
await assert.rejects(submitReportIntake({ fields, image, storage, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }), /receipt is incomplete/);
await assert.rejects(submitReportIntake({ fields, image, storage, fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) }), /reconcile/);
images.clear(); // Simulate lost device evidence while the operation's outcome remains uncertain.
await assert.rejects(submitReportIntake({ fields: { ...fields, description: 'FAKE changed while pending' }, image: new Blob(['DIFFERENT PHOTO']), storage, fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) }) }), /uncertain outcome/);
console.log('Report intake: one payload, stable retries, location provenance and truthful receipts passed.');
finishReportIntake('report', null, storage);
await assert.rejects(submitReportIntake({ fields, image, storage, fetchImpl: async () => ({ ok: false, status: 422, json: async () => ({ detail: 'FAKE invalid description' }) }) }), /invalid description/);
const beforeCorrection = calls.length;
await submitReportIntake({ fields: { ...fields, description: 'FAKE corrected description' }, image, storage, fetchImpl });
assert.ok(calls[beforeCorrection].body instanceof FormData);
