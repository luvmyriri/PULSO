import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatWatermarkAddress } from '../../utils/locationPrivacy';
import { formatWatermarkCoordinates } from '../../utils/watermark';
import { cameraFrameProvenance } from '../../utils/captureLocation';

// Display metadata separately from the encoded camera frame. The report retains
// the original image and capture provenance for review and analysis.
export default function CameraWatermark({ metadata, status, capturedAt, sample = false }) {
    const { t, i18n } = useTranslation();
    const overlay = useRef(null);
    const [now, setNow] = useState(Date.now);
    useLayoutEffect(() => {
        const node = overlay.current;
        const frame = node?.parentElement;
        const deck = node?.closest('[role="dialog"]')?.querySelector('footer');
        if (!frame || !deck) return;
        const position = () => {
            const bounds = frame.getBoundingClientRect();
            // The existing full-screen camera deck overlays part of the frame.
            // Keep the complete stamp above it for every camera ratio.
            node.style.bottom = `${Math.max(0, bounds.bottom - deck.getBoundingClientRect().top + 16)}px`;
        };
        position();
        const observer = new ResizeObserver(position);
        observer.observe(frame);
        observer.observe(deck);
        window.addEventListener('resize', position);
        return () => { observer.disconnect(); window.removeEventListener('resize', position); };
    }, []);
    useEffect(() => {
        if (capturedAt) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [capturedAt]);

    const selected = metadata?.location || metadata?.reportLocation || metadata?.coordinates;
    const hasSelected = Boolean(formatWatermarkCoordinates({ location: selected }));
    const fix = cameraFrameProvenance([status?.fix], capturedAt || now).deviceFix;
    const point = hasSelected ? selected : fix ? { lat: fix.latitude, lng: fix.longitude } : null;
    const coordinates = formatWatermarkCoordinates({ location: point });
    const address = hasSelected ? formatWatermarkAddress(
        metadata?.structuredAddress || metadata?.locationAddress || selected?.structuredAddress || selected?.address,
        selected,
    ) : '';
    const timestamp = new Date(capturedAt || now).toLocaleString(i18n.language?.startsWith('tl') ? 'fil-PH' : 'en-PH', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    // Accuracy describes a measured device fix, never a manually selected pin.
    const sameFix = fix && point && Math.abs(point.lat - fix.latitude) < 0.000001 && Math.abs(point.lng - fix.longitude) < 0.000001;
    const accuracy = sameFix && fix.accuracy_m != null ? Math.max(1, Math.round(fix.accuracy_m)) : null;

    const source = hasSelected ? t('captureLocation.watermarkSelected') : t('captureLocation.watermarkDevice');

    return <div ref={overlay} data-camera-watermark className="pulso-camera-watermark">
        <div className="pulso-camera-watermark__heading">
            <span className="font-bold"><span className="text-[#ff8a3d]">PULSO</span> · Caloocan City</span>
            <time dateTime={new Date(capturedAt || now).toISOString()}>{timestamp}</time>
        </div>
        {(sample || !point) && <p>{t(sample ? 'captureLocation.watermarkSample' : 'captureLocation.watermarkUnavailable')}</p>}
        {point && <div role="group" aria-label={source}>
            {address && <p className="pulso-camera-watermark__address">{address}</p>}
            {coordinates && <p>{coordinates}{accuracy != null && <span aria-label={t('captureLocation.watermarkAccuracy', { accuracy })}>{` (±${accuracy}m)`}</span>}</p>}
        </div>}
    </div>;
}
