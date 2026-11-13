import { useEffect, useRef, useState } from 'react';
import { cameraFrameProvenance, createCaptureLocationSampler } from '../utils/captureLocation';

export default function useCaptureLocation(active, seedFix) {
    const sampler = useRef(null);
    const seed = useRef(seedFix);
    useEffect(() => { seed.current = seedFix; }, [seedFix]);
    const [status, setStatus] = useState({ state: 'idle', fix: null });
    useEffect(() => {
        if (!active) return;
        let mounted = true;
        const current = createCaptureLocationSampler({ seedFix: seed.current, onState: value => { if (mounted) setStatus(value); } });
        sampler.current = current;
        const hide = () => { if (document.visibilityState === 'hidden') current.stop('hidden'); };
        const leave = () => current.stop('hidden');
        document.addEventListener('visibilitychange', hide);
        window.addEventListener('pagehide', leave);
        if (document.visibilityState !== 'hidden') current.start();
        else current.stop('hidden');
        return () => {
            mounted = false;
            current.stop();
            if (sampler.current === current) sampler.current = null;
            document.removeEventListener('visibilitychange', hide);
            window.removeEventListener('pagehide', leave);
        };
    }, [active]);
    return {
        status,
        stop() { sampler.current?.stop(); },
        capture(at = Date.now()) {
            return sampler.current?.capture(at) ?? cameraFrameProvenance([seed.current], at);
        },
    };
}
