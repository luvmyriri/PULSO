import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed } from 'lucide-react';
import { GovButton, GovConfirm, formatDate } from './GovWorkspace';
import FieldPhotoInput from './FieldPhotoInput';
import { governmentRequest } from '../../utils/governmentApi';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken, getAuthUser } from '../../utils/authSession';
import { fieldPayload, saveSurveyDraft, submitFieldSurvey, surveySlot, surveyStore } from '../../utils/fieldSurvey';
import './field-survey.css';

const empty = { assetName: '', category: '', barangayId: '', observedAt: '', latitude: '', longitude: '',
    pinConfirmed: false, confirmedAt: null, visibility: 'visible', condition: 'not_assessed', notes: '' };
const nowLocal = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export default function FieldSurveyDialog({ assetId = null, assetName, permissions, onClose, onSaved }) {
    const navigate = useNavigate();
    const [values, setValues] = useState(empty);
    const [deviceFix, setDeviceFix] = useState(null);
    const [image, setImage] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [restore, setRestore] = useState(0);
    const [pending, setPending] = useState(false);
    const [busy, setBusy] = useState(false);
    const [sensorBusy, setSensorBusy] = useState(false);
    const [cameraBusy, setCameraBusy] = useState(false);
    const [error, setError] = useState('');
    const [storageError, setStorageError] = useState('');
    const [draftStatus, setDraftStatus] = useState('Loading this device’s draft…');
    const [nearby, setNearby] = useState(null);
    const [nearbyError, setNearbyError] = useState('');
    const [nearbyBusy, setNearbyBusy] = useState(false);
    const form = useRef(null);
    const saving = useRef(false);
    const generation = useRef({ value: 0 });
    const timer = useRef(null);
    const alive = useRef(true);
    const dirty = useRef(false);
    const revision = useRef({ value: 0 });
    const slot = surveySlot(permissions.current_user_id, assetId);
    const locked = pending || busy;
    const draft = { values, deviceFix, image, photo };

    useEffect(() => {
        alive.current = true;
        const counter = generation.current;
        void surveyStore.load(slot).then(saved => {
            if (!alive.current) return;
            if (saved?.values) { setValues(saved.values); setDeviceFix(saved.deviceFix || null); setImage(saved.image || null); setPhoto(saved.photo || null); setPending(Boolean(saved.operation)); }
            setLoaded(true); setDraftStatus(saved ? 'Draft restored from this device.' : 'New observation.');
        }).catch(() => { if (alive.current) setStorageError('The stored draft could not be opened. Retry device storage before editing.'); });
        return () => { alive.current = false; counter.value++; clearTimeout(timer.current); };
    }, [slot, restore]);
    useEffect(() => {
        if (!loaded || locked) return;
        dirty.current = true;
        setDraftStatus('Saving draft on this device…');
        const counter = revision.current;
        const request = ++counter.value;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            void saveSurveyDraft(slot, { values, deviceFix, image, photo }).then(saved => {
                if (!alive.current || request !== counter.value) return;
                setPending(Boolean(saved?.operation)); setStorageError(''); setDraftStatus('Draft saved on this device.'); dirty.current = false;
                if (saved?.operation) { setValues(saved.values); setDeviceFix(saved.deviceFix || null); setImage(saved.image || null); setPhoto(saved.photo || null); }
            }).catch(() => { if (alive.current) setStorageError('Draft could not be saved on this device. Keep the form open and try again.'); });
        }, 300);
        return () => { clearTimeout(timer.current); counter.value++; };
    }, [loaded, locked, slot, values, deviceFix, image, photo]);
    useEffect(() => {
        if (!loaded || busy) return;
        const frame = requestAnimationFrame(() => {
            if (!alive.current || !form.current) return;
            const destination = pending
                ? form.current.closest('dialog')?.querySelector(':scope > .gov-form-actions .is-primary')
                : form.current.querySelector('input,select');
            destination?.focus();
        });
        return () => cancelAnimationFrame(frame);
    }, [loaded, pending, busy]);
    useEffect(() => {
        const protect = event => { if (dirty.current || saving.current) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', protect);
        return () => window.removeEventListener('beforeunload', protect);
    }, []);

    function update(name, value) {
        setValues(current => ({ ...current, [name]: value,
            ...(['latitude','longitude'].includes(name) ? { pinConfirmed: false, confirmedAt: null } : {}),
            ...(name === 'visibility' && value !== 'visible' ? { condition: 'not_assessed' } : {}),
        }));
        if (['latitude','longitude'].includes(name)) setNearby(null);
    }
    function locate() {
        if (!navigator.geolocation) { setError('Device location is unavailable. Enter a checked point manually.'); return; }
        setSensorBusy(true); setError(''); const request = ++generation.current.value;
        navigator.geolocation.getCurrentPosition(position => {
            if (!alive.current || request !== generation.current.value) return;
            const fix = { latitude: position.coords.latitude, longitude: position.coords.longitude,
                accuracy_m: Number.isFinite(position.coords.accuracy) && position.coords.accuracy > 0 ? position.coords.accuracy : null,
                measured_at: new Date(position.timestamp).toISOString() };
            setDeviceFix(fix); setValues(current => ({ ...current, latitude: String(fix.latitude), longitude: String(fix.longitude), pinConfirmed: false, confirmedAt: null }));
            setNearby(null); setSensorBusy(false);
        }, () => { if (alive.current && request === generation.current.value) { setSensorBusy(false); setError('Location access failed or was denied. Enter the proposed point manually; precision remains unknown.'); } },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    }
    async function searchNearby() {
        if (!values.latitude || !values.longitude) { setNearbyError('Enter or obtain a point first.'); return; }
        setNearbyBusy(true); setNearbyError('');
        try { const result = await governmentRequest(`/api/gov/field-inventory/assets/nearby?${new URLSearchParams({ latitude: values.latitude, longitude: values.longitude, radius_m: '100' })}`); if (alive.current) setNearby(result); }
        catch (cause) { if (alive.current) { setNearby(null); setNearbyError(cause.message); } }
        finally { if (alive.current) setNearbyBusy(false); }
    }
    async function close() {
        if (busy || saving.current) return false;
        if (!loaded) { onClose(); return true; }
        clearTimeout(timer.current);
        try { if (!pending) await saveSurveyDraft(slot, draft); dirty.current = false; onClose(); return true; }
        catch { setStorageError('Draft could not be preserved. Keep this form open and retry saving.'); return false; }
    }
    async function submit() {
        if (saving.current || !loaded || sensorBusy || cameraBusy) return;
        if (String(getAuthUser()?.id) !== String(permissions.current_user_id)) { setError('The signed-in account changed. Close and reopen this record before saving.'); return; }
        if (!pending && !form.current.reportValidity()) return;
        clearTimeout(timer.current); setError('');
        let payload;
        try {
            if (!pending) {
                payload = fieldPayload(values, deviceFix, photo, !assetId);
                if (values.visibility === 'visible' && !image) throw new Error('Attach a field photo for this visible observation.');
            }
        } catch (cause) { setError(cause.message); return; }
        saving.current = true; setBusy(true); setPending(true);
        try {
            const receipt = await submitFieldSurvey({ actorId: permissions.current_user_id, assetId, draft, payload,
                token: getAuthToken(), apiBase: API_BASE_URL });
            dirty.current = false; onSaved(receipt); onClose();
        } catch (cause) {
            let restoreFailed = false;
            const saved = await surveyStore.load(slot).catch(() => { restoreFailed = true; return null; });
            const uncertain = restoreFailed ? cause.pending !== false : Boolean(saved?.operation) || Boolean(cause.pending);
            if (alive.current) { setPending(uncertain); setError(`${cause.message} ${uncertain ? 'Retry to recover the original operation and check its receipt.' : 'Your draft remains available for correction.'}`); }
        } finally { saving.current = false; if (alive.current) setBusy(false); }
    }
    return <GovConfirm open title={assetId ? 'Record a field visit' : 'Record an infrastructure candidate'}
        confirmLabel={pending ? 'Recover or retry original save' : 'Save field observation'} busy={busy} confirmDisabled={!loaded || cameraBusy || sensorBusy}
        onConfirm={submit} onClose={close} error={error} className="field-survey-dialog">
        <p>{assetId ? `${assetName || 'Infrastructure'} · ${assetId}` : 'Start a candidate from your own field observation. Ownership and condition score remain unknown.'}</p>
        <p role="status" className="gov-note">{pending ? 'Save outcome unconfirmed. Editing is paused while the original operation is recovered.' : draftStatus}</p>
        {storageError && <p role="alert" className="gov-error">{storageError} {!loaded && <GovButton onClick={() => { setStorageError(''); setRestore(value => value+1); }}>Retry device storage</GovButton>}</p>}
        <form ref={form} onSubmit={event => { event.preventDefault(); void submit(); }}>
            <fieldset disabled={locked || !loaded}>
                {!assetId && <><div className="gov-form-grid"><label className="gov-field">Candidate name<input value={values.assetName} required minLength={3} maxLength={160} onChange={e => update('assetName', e.target.value)}/></label><label className="gov-field">Category<select required value={values.category} onChange={e => update('category', e.target.value)}><option value="">Choose category</option>{['Road','Bridge','Drainage','Building','Light'].map(name => <option key={name}>{name}</option>)}</select></label></div>
                <label className="gov-field">Recorded barangay<select required value={values.barangayId} onChange={e => update('barangayId', e.target.value)}><option value="">Choose barangay</option>{permissions.barangays.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label></>}
                <div className="field-survey-heading"><h3>Observation and location</h3><GovButton onClick={() => update('observedAt', nowLocal())}>Use current time</GovButton></div>
                <label className="gov-field">Observed at<input type="datetime-local" required value={values.observedAt} onChange={e => update('observedAt', e.target.value)}/><small>Time you observed the site, in this device’s local timezone.</small></label>
                <GovButton onClick={locate} disabled={sensorBusy}><LocateFixed size={16} aria-hidden="true"/>{sensorBusy ? 'Obtaining device estimate…' : 'Use device location'}</GovButton>
                <div className="gov-form-grid"><label className="gov-field">Proposed latitude<input type="number" step="any" min="4" max="22" required value={values.latitude} onChange={e => update('latitude', e.target.value)}/></label><label className="gov-field">Proposed longitude<input type="number" step="any" min="116" max="127" required value={values.longitude} onChange={e => update('longitude', e.target.value)}/></label></div>
                <p className="gov-note">{deviceFix ? `Device estimate: ${deviceFix.accuracy_m == null ? 'accuracy unknown' : `±${deviceFix.accuracy_m} m`}, measured ${formatDate(deviceFix.measured_at)}. A corrected pin has unknown precision.` : 'Manual point · measurement accuracy unknown.'} Check the infrastructure’s position, which can differ from where the phone is held.</p>
                <label className="gov-checkbox"><input type="checkbox" required checked={values.pinConfirmed} onChange={e => setValues(current => ({ ...current, pinConfirmed: e.target.checked, confirmedAt: e.target.checked ? new Date().toISOString() : null }))}/>I checked this proposed point against the infrastructure.</label>
                {!assetId && <><GovButton onClick={searchNearby} disabled={nearbyBusy}>{nearbyBusy ? 'Checking nearby records…' : 'Check nearby records'}</GovButton>
                    {nearbyError && <p role="alert" className="gov-error">{nearbyError}</p>}
                    {nearby && <div className="field-nearby"><p>{nearby.items.length ? `Nearby suggestions within 100 m. Showing up to five of ${nearby.items.length} returned records.` : 'No records returned within 100 m. Object uniqueness remains unverified.'}</p><ul>{nearby.items.slice(0, 5).map(item => <li key={item.asset_id}><button type="button" className="gov-record-link" onClick={async () => { if (await close()) navigate(`/gov/assets?asset=${encodeURIComponent(item.asset_id)}`); }}>{item.asset_name} · {item.distance_m} m</button><small>{item.asset_id} · {item.registry_status}. Open the record to record a revisit.</small></li>)}</ul>{nearby.truncated && <p>More candidates exist. Narrow the search through the infrastructure register.</p>}</div>}
                </>}
                <h3>Visible condition</h3><div className="gov-form-grid"><label className="gov-field">Site visibility<select value={values.visibility} onChange={e => update('visibility', e.target.value)}><option value="visible">Visible</option><option value="not_visible">Not visible</option><option value="unsafe">Unsafe to inspect</option><option value="missing">Object not found</option></select></label><label className="gov-field">Condition finding<select value={values.visibility === 'visible' ? values.condition : 'not_assessed'} disabled={values.visibility !== 'visible'} onChange={e => update('condition', e.target.value)}><option value="not_assessed">Not assessed</option><option value="defect_observed">Defect observed</option><option value="no_defect_observed">No defect observed</option></select></label></div>
                <label className="gov-field">Field notes<textarea required minLength={20} maxLength={4000} value={values.notes} onChange={e => update('notes', e.target.value)}/><small>Describe the observed condition, landmark and any visibility limits. Unknown findings remain not assessed.</small></label>
            </fieldset>
            <FieldPhotoInput image={image} metadata={photo} deviceFix={deviceFix} disabled={locked || !loaded} onBusyChange={setCameraBusy} onChange={(file, provenance) => { setImage(file); setPhoto(provenance); }}/>
        </form>
        <p className="gov-note">One save records this observation and its private photo for independent review. Only a returned server receipt confirms submission.</p>
    </GovConfirm>;
}
