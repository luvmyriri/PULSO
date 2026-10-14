import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken } from '../utils/authSession';

export default function WorkOrderEvidence({ url, title }) {
    const [source, setSource] = useState(null);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);

    useEffect(() => {
        if (!url) return;
        if (!/^\/api\/gov\/work-orders\/\d+\/evidence\/[a-f0-9]{32}\.jpg$/.test(url)) {
            setError('Evidence reference is invalid');
            return;
        }
        const controller = new AbortController();
        let objectUrl;
        setSource(null);
        setError('');
        fetch(`${API_BASE_URL}${url}`, {
            headers: { Authorization: `Bearer ${getAuthToken()}` },
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) throw new Error(`Evidence unavailable (HTTP ${response.status})`);
                objectUrl = URL.createObjectURL(await response.blob());
                setSource(objectUrl);
            })
            .catch((cause) => { if (cause.name !== 'AbortError') setError(cause.message || 'Evidence unavailable'); });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url, reload]);

    if (!url) return <p>No completion evidence has been submitted.</p>;
    if (error) return <p role="alert">{error} <button type="button" onClick={() => setReload((count) => count + 1)}>Retry</button></p>;
    if (!source) return <p role="status">Loading completion evidence…</p>;
    return <figure className="citizen-report-evidence"><img src={source} alt={`Completion evidence for ${title}`} /><figcaption>Field proof submitted for independent review</figcaption></figure>;
}
