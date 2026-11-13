import { loadReportEvidence, updateReportEvidence } from './reportEvidenceStore.js';

export const RESIDENT_DRAFT_SCHEMA = 'resident-report-draft-v1';
export const RESIDENT_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TYPES = new Set(['image/jpeg','image/png','image/webp']);

export function reportDraftPrincipal(token, user = null) {
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
            if (typeof payload.sub === 'string' && payload.sub.length > 0 && payload.sub.length <= 320) return 'subject:'+payload.sub;
        } catch { /* Invalid authentication cannot select another account's draft. */ }
        return 'invalid-session';
    }
    return user?.id ? `account:${user.role || 'resident'}:${user.id}` : 'guest';
}

export const residentDraftSlot = (kind, principal) => `pulso-resident-draft-v1:${kind}:${encodeURIComponent(principal)}`;

export class DraftConflict extends Error {
    constructor() { super('Another tab changed this draft. Load its saved version before editing.'); this.name='DraftConflict'; }
}

export function packResidentPhoto(file, provenance = {}) {
    if (!file) return null;
    if (!(file instanceof Blob) || !TYPES.has(file.type) || !file.size || file.size > 10 * 1024 * 1024) {
        throw new Error('Choose a JPEG, PNG or WebP photo up to 10 MB.');
    }
    const source = ['camera','upload'].includes(provenance.source) ? provenance.source : 'unknown';
    return { blob:file, name:file.name || 'evidence.jpg', type:file.type, lastModified:file.lastModified || null,
        provenance:{ source, capturedAt:source==='camera' ? provenance.capturedAt || null : null,
            photoDeviceFix:source==='camera' ? provenance.photoDeviceFix || provenance.deviceFix || null : null,
            photoLocationRequest:source==='camera' ? provenance.photoLocationRequest || provenance.locationRequest || null : null } };
}

export function unpackResidentPhoto(photo) {
    if (!photo) return { file:null, provenance:{source:'unknown',capturedAt:null,photoDeviceFix:null,photoLocationRequest:null} };
    if(!(photo.blob instanceof Blob))throw new Error('Choose a JPEG, PNG or WebP photo up to 10 MB.');
    // Revalidate the stored bytes as well as the metadata. An orphan timestamp is not a photo.
    const checked = packResidentPhoto(photo.blob, photo.provenance);
    return { file:new File([checked.blob], photo.name || 'evidence.jpg', {
        type:checked.type, ...(Number.isFinite(photo.lastModified) ? {lastModified:photo.lastModified} : {}),
    }), provenance:checked.provenance };
}

const defaultStore = { load:loadReportEvidence, update:updateReportEvidence };
function validateStored(record, principal, kind) {
    if (record == null) return null;
    if (record.schema !== RESIDENT_DRAFT_SCHEMA || record.principal !== principal || record.kind !== kind ||
        !Number.isSafeInteger(record.revision) || record.revision < 1 || !Number.isFinite(record.savedAt) ||
        (record.data!==null&&(typeof record.data!=='object'||Array.isArray(record.data)))) {
        throw new Error('The saved draft could not be validated. Keep this tab open and retry storage.');
    }
    return record;
}

export function createResidentDraft({kind, principal, store=defaultStore, now=()=>Date.now(),completionStore=globalThis.localStorage}) {
    const slot = residentDraftSlot(kind,principal);
    let loaded=false, revision=0, queue=Promise.resolve(), finished=false;
    function serial(task) { const next=queue.catch(()=>{}).then(task); queue=next; return next; }
    return {
        slot,
        load() { return serial(async()=>{
            const record=validateStored(await store.load(slot),principal,kind);
            revision=record?.revision || 0; loaded=true; finished=false;
            const expired=Boolean(record?.data && now()-record.savedAt > RESIDENT_DRAFT_MAX_AGE_MS);
            let completed=0;
            try{completed=Number(completionStore?.getItem(slot+':completed')) || 0;}catch{ /* Database remains authoritative for the draft. */ }
            return {data:expired || (revision>0&&revision<=completed) ? null : record?.data || null, expired, revision};
        }); },
        save(data) {
            if (finished) return Promise.resolve(null);
            const snapshot=structuredClone(data);
            return serial(async()=>{
                if (!loaded) throw new Error('Open the saved draft before changing it.');
                const record=await store.update(slot,current=>{
                    validateStored(current,principal,kind);
                    if ((current?.revision || 0)!==revision) throw new DraftConflict();
                    return {schema:RESIDENT_DRAFT_SCHEMA,kind,principal,revision:revision+1,savedAt:now(),data:snapshot};
                });
                revision=record.revision; return record;
            });
        },
        clear({confirmed=false}={}) {
            finished=true;
            return serial(async()=>{
                if (!loaded) throw new Error('Open the saved draft before clearing it.');
                if(confirmed){try{completionStore?.setItem(slot+':completed',String(revision));}catch{ /* Still attempt the database tombstone. */ }}
                const record=await store.update(slot,current=>{
                    validateStored(current,principal,kind);
                    if ((current?.revision || 0)!==revision) throw new DraftConflict();
                    // A retained revision prevents a stale empty tab recreating a cleared draft.
                    return {schema:RESIDENT_DRAFT_SCHEMA,kind,principal,revision:revision+1,savedAt:now(),data:null};
                });
                revision=record.revision;
            });
        },
    };
}
