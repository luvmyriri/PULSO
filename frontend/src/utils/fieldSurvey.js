import { saveReportEvidence, loadReportEvidence, dropReportEvidence } from './reportEvidenceStore.js';
import { cameraFrameProvenance } from './captureLocation.js';

const queues = new Map();

export function fieldIncidentPoint(coords) {
    const lat = coords?.lat, lng = coords?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
}
export const surveySlot = (actorId, assetId) => `pulso-field-survey-v1:${actorId}:${assetId || 'new'}`;
export const surveyStore = { load: loadReportEvidence, save: (key, value) => {
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('This browser cannot preserve field drafts. Keep the form open and use a browser with device storage.'));
    return saveReportEvidence(key, value);
}, drop: dropReportEvidence };

function exclusive(slot, task) {
    const next = (queues.get(slot) || Promise.resolve()).catch(() => {}).then(() =>
        globalThis.navigator?.locks ? navigator.locks.request(slot, task) : task());
    queues.set(slot, next);
    void next.finally(() => { if (queues.get(slot) === next) queues.delete(slot); }).catch(() => {});
    return next;
}

export function saveSurveyDraft(slot, draft, store = surveyStore) {
    return exclusive(slot, async () => {
        const prior = await store.load(slot);
        if (prior?.operation) return prior;
        await store.save(slot, { version: 1, ...draft });
        return draft;
    });
}

export function fieldPayload(values, deviceFix, photo, isCandidate) {
    const latitude = values.latitude === '' ? NaN : Number(values.latitude);
    const longitude = values.longitude === '' ? NaN : Number(values.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Enter both proposed coordinates.');
    if (!values.observedAt || !Number.isFinite(new Date(values.observedAt).getTime())) throw new Error('Record when you observed the site.');
    if (!values.pinConfirmed) throw new Error('Check the proposed point against the infrastructure before saving.');
    const untouched = deviceFix && latitude === deviceFix.latitude && longitude === deviceFix.longitude;
    const payload = {
        observed_at: new Date(values.observedAt).toISOString(), latitude, longitude,
        visibility: values.visibility, condition: values.visibility === 'visible' ? values.condition : 'not_assessed',
        notes: values.notes.trim(),
        location_metadata: { source: untouched ? 'device' : 'manual', device_fix: deviceFix || null,
            issue_pin_confirmed: true, confirmed_at: values.confirmedAt,
            photo_source: photo?.source || 'unknown', photo_captured_at: photo?.capturedAt || null,
            photo_device_fix: photo?.deviceFix || null,
            photo_location_request: photo?.source === 'camera' ? photo.locationRequest || null : null },
    };
    if (isCandidate) Object.assign(payload, { asset_name: values.assetName.trim(), category: values.category, barangay_id: Number(values.barangayId) });
    return payload;
}

export function frameProvenance(deviceFix, capturedAt = new Date().toISOString()) {
    return cameraFrameProvenance([deviceFix], capturedAt);
}

function validReceipt(result, assetId) {
    return Boolean(result?.asset?.asset_id && result?.observation?.id &&
        result.observation.asset_id === result.asset.asset_id && (!assetId || result.asset.asset_id === assetId));
}

async function responseData(response) {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = data?.detail;
        const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(e => e.msg).join('; ') : `The request failed (HTTP ${response.status}).`;
        const error = new Error(message); error.status = response.status; throw error;
    }
    return data;
}

export function submitFieldSurvey({ actorId, assetId = null, draft, payload, token, apiBase = '', fetchImpl = fetch, store = surveyStore }) {
    const slot = surveySlot(actorId, assetId);
    return exclusive(slot, async () => {
        let previous;
        try { previous = await store.load(slot); }
        catch (error) { error.pending = !payload; throw error; }
        let saved = previous?.operation ? previous : { version: 1, ...draft, operation: {
            key: crypto.randomUUID(), payload, image: draft.image || null,
            kind: assetId ? 'observe_capture' : 'create_capture', assetId,
        } };
        if (!previous?.operation && !payload) {
            const error = new Error('The original operation could not be restored from this device. Keep this draft and retry storage recovery.');
            error.pending = true; throw error;
        }
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Idempotency-Key': saved.operation.key };
        if (previous?.operation) {
            const query = new URLSearchParams({ operation: saved.operation.kind });
            if (saved.operation.assetId) query.set('asset_id', saved.operation.assetId);
            const receipt = await fetchImpl(`${apiBase}/api/gov/field-inventory/receipt?${query}`, { headers });
            if (receipt.ok) {
                const result = await responseData(receipt);
                if (!validReceipt(result, assetId)) throw new Error('The receipt is incomplete. Keep the original operation and retry recovery.');
                await store.drop(slot).catch(() => {});
                return result;
            }
            if (receipt.status !== 404) {
                await responseData(receipt);
                throw new Error('The previous save could not be checked. Keep the original operation.');
            }
        } else {
            try { await store.save(slot, saved); } // Preserve bytes before sending anything.
            catch (error) { error.pending = false; throw error; }
        }
        const body = new FormData();
        body.append('payload', JSON.stringify(saved.operation.payload));
        if (saved.operation.image) body.append('image', saved.operation.image, 'field-evidence');
        const path = assetId ? `/assets/${encodeURIComponent(assetId)}/capture` : '/assets/capture';
        let response;
        try { response = await fetchImpl(`${apiBase}/api/gov/field-inventory${path}`, { method: 'POST', headers, body }); }
        catch (error) { error.pending = true; throw error; }
        let result;
        try { result = await responseData(response); }
        catch (error) {
            if ([400,401,403,404,413,415,422,429].includes(error.status)) {
                saved = { ...saved, operation: null };
                await store.save(slot, saved);
            }
            throw error;
        }
        if (!validReceipt(result, assetId)) throw new Error('No complete receipt was confirmed. Retry the original operation.');
        await store.drop(slot).catch(() => {});
        return result;
    });
}
