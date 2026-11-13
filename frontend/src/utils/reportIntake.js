import { saveReportEvidence, loadReportEvidence, dropReportEvidence } from './reportEvidenceStore.js';

const OPERATIONS = 'pulso_intake_operation_v2:';
const defaultEvidenceStore = {save:saveReportEvidence,load:loadReportEvidence,drop:dropReportEvidence};
function operationChanged(){if(typeof window!=='undefined')window.dispatchEvent(new Event('pulso-intake-state'));}
async function photoDigest(image) {return image?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await image.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join(''):null;}

function operationSlot(draftKey, token) {
  // This partitions local drafts; authentication remains server-enforced.
  let actor = 'guest';
  if (token) {
    try { actor = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || 'authenticated'; }
    catch { actor = 'authenticated'; }
  }
  return OPERATIONS + draftKey + ':' + actor;
}

export function pendingReportIntake(draftKey, token = null, storage = localStorage) {
  const raw = storage.getItem(operationSlot(draftKey,token));
  if (raw == null) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value?.key !== 'string' || value.key.length < 32) throw new Error('Invalid operation');
    return value;
  } catch { throw new Error('The previous submission record could not be read. Keep this draft and recover its original ticket before starting another submission.'); }
}

export function finishReportIntake(draftKey, token = null, storage = localStorage, evidenceStore = defaultEvidenceStore) {
  const slot = operationSlot(draftKey, token);
  try {
    const entry = JSON.parse(storage.getItem(slot) || 'null');
    if (entry?.key) void evidenceStore.drop(entry.key).catch(() => {});
  } catch { /* Do not replace an authoritative receipt with a cleanup error. */ }
  try { storage.removeItem(slot); } catch { /* A confirmed server receipt remains authoritative. */ }
  operationChanged();
}
const iso = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

export function locationEvidence(location = {}, photo = {}) {
  const raw = location.deviceFix;
  const device = raw && Number.isFinite(raw.latitude) && Number.isFinite(raw.longitude) ? {
    latitude: raw.latitude, longitude: raw.longitude,
    accuracy_m: Number.isFinite(raw.accuracy_m) && raw.accuracy_m > 0 ? raw.accuracy_m : null,
    measured_at: iso(raw.measured_at),
  } : null;
  const source = device && location.source === 'device-gps' && device.latitude === location.lat && device.longitude === location.lng ? 'device'
    : location.source === 'place-search' ? 'search'
      : location.confirmed || location.pinConfirmed ? 'manual' : 'unknown';
  return {
    source, device_fix: device,
    issue_pin_confirmed: Boolean(location.pinConfirmed || (source !== 'device' && location.confirmed)),
    confirmed_at: iso(location.confirmedAt),
    photo_captured_at: iso(photo.capturedAt),
    photo_source: ['camera', 'upload'].includes(photo.source) ? photo.source : 'unknown',
    photo_device_fix: photo.photoDeviceFix || null,
    photo_location_request: photo.source === 'camera' ? photo.photoLocationRequest || photo.locationRequest || null : null,
  };
}

export async function recoverReportIntake(options) {
  const {draftKey='report',token,storage=localStorage,evidenceStore=defaultEvidenceStore}=options;
  const entry=pendingReportIntake(draftKey,token,storage);
  if (!entry) throw new Error('No previous submission was found for this account.');
  // Receipt lookup must still work if local photo storage is currently unavailable.
  const headers=token?{Authorization:`Bearer ${token}`}:{ };
  const response=await (options.fetchImpl || fetch)(`${options.apiBase || ''}/api/report-intelligence/intake-receipt`,{
    headers:{...headers,'Idempotency-Key':entry.key},
  });
  if (response.ok) {
    const result=await response.json();
    if (!result?.ticket_id || !result?.id) throw new Error('The server receipt is incomplete. Retry recovery.');
    return result;
  }
  if (response.status!==404) throw new Error('Unable to reconcile the previous submission. Keep your draft and retry.');
  const image=entry.imageDigest ? await evidenceStore.load(entry.key) : null;
  if (!entry.fields || (entry.imageDigest && !image)) throw new Error('The original photo or submission details are unavailable. Keep the operation key and recover the original ticket before creating a new report.');
  if(entry.imageDigest && await photoDigest(image)!==entry.imageDigest)throw new Error('The stored original photo failed its integrity check. Recover the original ticket before creating a new report.');
  return submitReportIntake({...options,fields:entry.fields,image});
}

export async function submitReportIntake({ fields, image, token, apiBase = '', draftKey = 'report', fetchImpl = fetch, storage = localStorage, evidenceStore=defaultEvidenceStore }) {
  // Persist the original fields and evidence before the request, so a reload
  // can recover that operation before edited details become a new submission.
  const imageDigest = await photoDigest(image);
  const signature = JSON.stringify({ fields, imageDigest });
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature))), n => n.toString(16).padStart(2, '0')).join('');
  const storageKey = operationSlot(draftKey, token);
  let entry = pendingReportIntake(draftKey,token,storage);
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (entry?.key) {
    const receipt = await fetchImpl(`${apiBase}/api/report-intelligence/intake-receipt`, {
      headers: { ...headers, 'Idempotency-Key': entry.key },
    });
    if (receipt.ok) {
      const original = await receipt.json();
      if (!original?.ticket_id || !original?.id) throw new Error('The server receipt is incomplete. Retry to recover the original ticket.');
      return original;
    }
    if (receipt.status !== 404) throw new Error('Unable to reconcile the previous submission. Keep your draft and retry.');
    if (entry.digest !== digest) {
      const originalImage = entry.imageDigest === imageDigest ? image : await evidenceStore.load(entry.key);
      if (!entry.fields || (entry.imageDigest && !originalImage)) throw new Error('The previous submission has an uncertain outcome. Restore the original photo or retry receipt recovery before submitting edited details.');
      if(entry.imageDigest && await photoDigest(originalImage)!==entry.imageDigest)throw new Error('The original photo failed its integrity check. Keep this uncertain operation and recover its receipt.');
      fields = entry.fields;
      image = originalImage;
    }
  } else {
    entry = { key: crypto.randomUUID(), digest, fields, imageDigest, createdAt: Date.now() };
    if (image) await evidenceStore.save(entry.key, image);
    storage.setItem(storageKey, JSON.stringify(entry));
    operationChanged();
  }
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined && value !== '') body.append(name, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  if (image) body.append('image', image, 'evidence.jpg');
  const response = await fetchImpl(`${apiBase}/api/reports`, {
    method: 'POST', body,
    headers: { ...headers, 'Idempotency-Key': entry.key },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if ([400, 401, 403, 404, 413, 415, 422, 429].includes(response.status)) {
      // These responses rejected the command before a report was committed.
      // Keep editable draft content while allowing a corrected new operation.
      finishReportIntake(draftKey, token, storage,evidenceStore);
    }
    const error = new Error(typeof result?.detail === 'string' ? result.detail : 'Unable to submit. Your draft is preserved; retry when connected.');
    error.status = response.status;
    throw error;
  }
  if (!result?.ticket_id || !result?.id) throw new Error('The server receipt is incomplete. Retry to recover the original ticket.');
  return result;
}
