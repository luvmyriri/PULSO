import { useRef, useState } from 'react';

// Keep the form and its input available when the server rejects a save.
export function useInspectionSave(onSubmit, onClose) {
    const pending = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function submit(data) {
        if (pending.current) return;
        pending.current = true; setBusy(true); setError('');
        try { await onSubmit(data); onClose(); }
        catch (failure) { setError(failure.message || 'The record could not be saved. Try again.'); }
        finally { pending.current = false; setBusy(false); }
    }
    return { busy, error, submit };
}
