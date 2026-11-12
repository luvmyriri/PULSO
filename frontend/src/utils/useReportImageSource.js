import { useEffect, useState } from 'react';
import { getReportThumbnailUrl } from './reportMedia';
import { loadReportImageSource, usesNativeReportMedia } from './nativeReportMedia';

export default function useReportImageSource(photo, size = 512) {
    const native = usesNativeReportMedia(photo);
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState(null);
    useEffect(() => {
        if (!native) return;
        let active = true;
        const thumbnail = getReportThumbnailUrl(photo, size);
        loadReportImageSource(thumbnail).catch(error => {
            if (thumbnail === photo) throw error;
            return loadReportImageSource(photo);
        }).then(src => { if (active) setResult({ photo, attempt, src }); },
            () => { if (active) setResult({ photo, attempt, failed: true }); });
        return () => { active = false; };
    }, [photo, size, native, attempt]);
    if (!native) return { src: photo, loading: false, failed: false, retry: () => setAttempt(value => value + 1) };
    const current = result?.photo === photo && result.attempt === attempt ? result : null;
    return { src: current?.src, loading: !current, failed: Boolean(current?.failed), retry: () => setAttempt(value => value + 1) };
}
