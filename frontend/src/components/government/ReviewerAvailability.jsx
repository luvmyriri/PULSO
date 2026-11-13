import { useCallback, useEffect, useRef, useState } from 'react';
import { governmentRequest } from '../../utils/governmentApi';
import './reviewer-availability.css';

const PATH = '/api/gov/report-review/availability/me';
const LABELS = { available: 'Available', away: 'Away', offline: 'Offline', at_capacity: 'At capacity', routing_paused: 'Routing paused' };

export default function ReviewerAvailability({ userId }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [state, setState] = useState('offline');
    const [capacity, setCapacity] = useState(5);
    const current = useRef(null);
    const editingVersion = useRef(null);
    const disclosure = useRef(null);
    const summary = useRef(null);
    const form = useRef(null);
    const pending = useRef(false);
    const serial = useRef(0);

    const refresh = useCallback(async (heartbeat = false, signal, replaceDraft = false) => {
        const request = ++serial.current;
        try {
            const next = await governmentRequest(PATH + (heartbeat ? '/heartbeat' : ''), { method: heartbeat ? 'POST' : 'GET', signal });
            if (signal?.aborted || request !== serial.current) return;
            current.current = next; setData(next); setError('');
            if (replaceDraft || !disclosure.current?.open) {
                setState(next.state); setCapacity(next.capacity); editingVersion.current = next.version;
            }
        } catch (e) {
            if (e.name !== 'AbortError' && !signal?.aborted && request === serial.current) setError(e.message);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        current.current = null;
        void refresh(false, controller.signal);
        const timer = setInterval(() => {
            if (!pending.current) void refresh(current.current?.eligible && current.current?.state === 'available', controller.signal);
        }, 30000);
        return () => { controller.abort(); clearInterval(timer); };
    }, [refresh, userId]);

    async function save(event) {
        event.preventDefault();
        if (pending.current || !form.current.reportValidity()) return;
        pending.current = true; serial.current++; setBusy(true); setError('');
        try {
            const next = await governmentRequest(PATH, { method: 'PATCH', body: { state, capacity: Number(capacity), expected_version: editingVersion.current } });
            current.current = next; setData(next); setState(next.state); setCapacity(next.capacity);
            disclosure.current.open = false; summary.current.focus();
        } catch (e) {
            setError(e.message);
            if (e.status === 409) {
                const next = await governmentRequest(PATH).catch(() => null);
                if (next) { current.current = next; setData(next); setState(next.state); setCapacity(next.capacity); editingVersion.current = next.version; }
            }
        } finally { pending.current = false; setBusy(false); }
    }

    if (!data?.eligible) return null;
    return <details className="gov-review-availability" ref={disclosure} onKeyDown={e => {
        if (e.key === 'Escape' && !busy) { disclosure.current.open = false; summary.current.focus(); e.stopPropagation(); }
    }} onToggle={() => {
        if (disclosure.current?.open && current.current) { setState(current.current.state); setCapacity(current.current.capacity); editingVersion.current = current.current.version; }
    }}>
        <summary ref={summary} aria-label={`Report review availability: ${error ? 'unconfirmed' : LABELS[data.effective_state] || 'Offline'}`}>
            Review: {error ? 'Unconfirmed' : LABELS[data.effective_state] || 'Offline'}
        </summary>
        <form ref={form} onSubmit={save}>
            <p>Available accepts new validation reports up to your limit. Assigned reports stay with you when you go away or offline.</p>
            <label>Status<select value={state} disabled={busy} onChange={e => setState(e.target.value)}>
                <option value="available">Available</option><option value="away">Away</option><option value="offline">Offline</option>
            </select></label>
            <label>Maximum open reviews<input type="number" min="1" max="50" required value={capacity} disabled={busy} onChange={e => setCapacity(e.target.value)} /></label>
            <p aria-live="polite">{data.open_reviews} open · limit {data.capacity}{data.effective_state === 'at_capacity' ? '. New assignments resume when capacity is free.' : ''}</p>
            {data.routing_enabled === false && <p>Automatic routing is paused by an administrator.</p>}
            {error && <p role="alert">{error} Availability has not been confirmed.</p>}
            <div><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save availability'}</button>
                <button type="button" disabled={busy} onClick={() => refresh(false, undefined, true)}>Refresh status</button></div>
        </form>
    </details>;
}
