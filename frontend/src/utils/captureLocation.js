// Bounded camera-session sampling. Device fixes never move the issue pin.
export const CAPTURE_LOCATION_WINDOW_MS = 20_000;
export const MAX_CAPTURE_FIX_AGE_MS = 120_000; // Existing provenance freshness rule; no accuracy guarantee.

function validPoint(latitude, longitude) {
    return Number.isFinite(latitude) && Number.isFinite(longitude) &&
        latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function normalizeCaptureFix(raw, at = Date.now()) {
    if (!raw || !validPoint(raw.latitude, raw.longitude)) return null;
    if (typeof raw.measured_at !== 'string' || !/([zZ]|[+-]\d{2}:\d{2})$/.test(raw.measured_at)) return null;
    const measured = typeof raw.measured_at === 'string' ? Date.parse(raw.measured_at) : NaN;
    if (!Number.isFinite(measured) || measured > at) return null;
    return {
        latitude: raw.latitude, longitude: raw.longitude,
        accuracy_m: Number.isFinite(raw.accuracy_m) && raw.accuracy_m > 0 && raw.accuracy_m <= 100_000 ? raw.accuracy_m : null,
        measured_at: raw.measured_at,
    };
}

export function cameraFrameProvenance(fixes, capturedAt = Date.now(), maxAgeMs = MAX_CAPTURE_FIX_AGE_MS) {
    const at = typeof capturedAt === 'string' ? Date.parse(capturedAt) : capturedAt;
    if (!Number.isFinite(at)) throw new Error('A camera frame needs a valid capture time.');
    const candidates = fixes.map(raw => normalizeCaptureFix(raw, at)).filter(fix => fix && at - Date.parse(fix.measured_at) <= maxAgeMs);
    candidates.sort((a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at));
    return { source: 'camera', capturedAt: new Date(at).toISOString(), deviceFix: candidates[0] ? { ...candidates[0] } : null };
}

export function createCaptureLocationSampler({
    geolocation = globalThis.navigator?.geolocation,
    seedFix = null,
    now = () => Date.now(),
    setTimer = (callback, delay) => setTimeout(callback, delay),
    clearTimer = timer => clearTimeout(timer),
    onState = () => {},
    durationMs = CAPTURE_LOCATION_WINDOW_MS,
    maxAgeMs = MAX_CAPTURE_FIX_AGE_MS,
} = {}) {
    if (!Number.isFinite(durationMs) || durationMs <= 0 || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) {
        throw new Error('Camera location sampling needs finite bounded times.');
    }
    let watchId, timer, active = false, started = false;
    let startedAt = null, firstFixAt = null, lastFailure = null, request = null, finalized = false;
    const fixes = [];
    const seed = normalizeCaptureFix(seedFix, now());
    if (seed) fixes.push(seed);
    const provenance = at => cameraFrameProvenance(fixes, at, maxAgeMs);
    function notify(state) { onState({ state, fix: provenance(now()).deviceFix }); }
    function stop(state = 'stopped') {
        if (!finalized) {
            finalized = true;
            const end = now();
            // A wall-clock rollback cannot yield a trustworthy interval.
            if (startedAt !== null && end >= startedAt && (firstFixAt === null || (end >= firstFixAt && firstFixAt >= startedAt))) {
                const reasons = {captured:'capture',timed_out:'deadline',denied:'permission_denied',unavailable:'provider_error',unsupported:'unsupported',hidden:'hidden'};
                request = {schema_version:'camera-location-request-v1',started_at:new Date(startedAt).toISOString(),
                    finished_at:new Date(end).toISOString(),first_fix_received_at:firstFixAt === null ? null : new Date(firstFixAt).toISOString(),
                    outcome:state === 'denied' ? 'denied' : state === 'unsupported' ? 'unsupported' : firstFixAt !== null ? 'success'
                        : state === 'timed_out' ? 'timeout' : lastFailure || 'cancelled',end_reason:reasons[state] || 'stopped'};
            } else if (!started) {
                request = {schema_version:'camera-location-request-v1',started_at:null,finished_at:null,first_fix_received_at:null,
                    outcome:'not_requested',end_reason:'not_started'};
            }
        }
        active = false;
        if (timer !== undefined) { clearTimer(timer); timer = undefined; }
        if (watchId !== undefined) { geolocation?.clearWatch(watchId); watchId = undefined; }
        notify(state);
    }
    function start() {
        if (started || finalized) return;
        started = true;
        startedAt = now();
        if (!geolocation?.watchPosition) { stop('unsupported'); return; }
        active = true; notify('acquiring');
        timer = setTimer(() => stop('timed_out'), durationMs);
        try {
            const id = geolocation.watchPosition(position => {
                if (!active) return;
                const timestamp = position?.timestamp;
                const measured = Number.isFinite(timestamp) ? new Date(timestamp) : null;
                const fix = normalizeCaptureFix({
                    latitude: position?.coords?.latitude, longitude: position?.coords?.longitude,
                    accuracy_m: position?.coords?.accuracy,
                    measured_at: measured && Number.isFinite(measured.getTime()) ? measured.toISOString() : null,
                }, now());
                if (!fix) return;
                if (firstFixAt === null) firstFixAt = now();
                if (!fixes.some(item => item.measured_at === fix.measured_at && item.latitude === fix.latitude && item.longitude === fix.longitude)) {
                    fixes.push(fix);
                    fixes.sort((a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at));
                    fixes.splice(32);
                }
                notify('available');
            }, error => {
                if (!active) return;
                lastFailure = error?.code === 1 ? 'denied' : error?.code === 3 ? 'timeout' : 'unavailable';
                if (error?.code === 1) stop('denied');
                else notify(error?.code === 3 ? 'timed_out' : 'unavailable');
            }, { enableHighAccuracy: true, maximumAge: 0, timeout: durationMs });
            // Some providers/test doubles call back synchronously before returning an ID.
            if (active) watchId = id;
            else geolocation.clearWatch(id);
        } catch { lastFailure = 'unavailable'; stop('unavailable'); }
    }
    return {
        start, stop,
        capture(at = now()) { const result = provenance(at); stop('captured'); return {...result,locationRequest:request ? {...request} : null}; },
    };
}
