import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Selected coordinates, copy action and GPS status share one compact row. */
export default function LocationCoordinates({ coordinates, children }) {
    const { t } = useTranslation();
    const [copiedValue, setCopiedValue] = useState('');
    const [copyError, setCopyError] = useState(false);
    const valid = Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng)
        && Math.abs(coordinates.lat) <= 90 && Math.abs(coordinates.lng) <= 180;
    const value = valid ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : '';
    const copied = Boolean(value && copiedValue === value);

    useEffect(() => {
        if (!copiedValue) return;
        const timer = setTimeout(() => setCopiedValue(''), 2000);
        return () => clearTimeout(timer);
    }, [copiedValue]);

    const copyCoordinates = async () => {
        setCopyError(false);
        try {
            await navigator.clipboard.writeText(value);
            setCopiedValue(value);
        } catch {
            setCopyError(true);
        }
    };

    if (!valid && !children) return null;
    return (
        <div className="min-w-0 max-w-full mt-1">
            <div data-location-coordinates className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5">
                {valid && (
                    <div className="inline-flex items-center gap-1.5 shrink-0 max-w-full">
                        <p className="shrink-0 whitespace-nowrap text-xs tabular-nums text-slate-600 dark:text-slate-300 select-text">
                            <abbr title={t('locationPrivacy.latitude')} className="no-underline">Lat</abbr> {coordinates.lat.toFixed(6)}
                            {' · '}
                            <abbr title={t('locationPrivacy.longitude')} className="no-underline">Lng</abbr> {coordinates.lng.toFixed(6)}
                        </p>
                        <button type="button" onClick={copyCoordinates}
                            aria-label={t(copied ? 'locationPrivacy.coordinatesCopied' : 'locationPrivacy.copyCoordinates')}
                            title={t(copied ? 'locationPrivacy.coordinatesCopied' : 'locationPrivacy.copyCoordinates')}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white focus-visible:outline-3 focus-visible:outline-blue-600 cursor-pointer">
                            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                        </button>
                    </div>
                )}
                {children}
            </div>
            {copied && <span role="status" className="sr-only">{t('locationPrivacy.coordinatesCopied')}</span>}
            {copyError && <p role="status" className="text-xs text-slate-600 dark:text-slate-300">{t('locationPrivacy.copyCoordinatesFailed')}</p>}
        </div>
    );
}
