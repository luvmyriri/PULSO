import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageOff, LoaderCircle } from 'lucide-react';
import useReportImageSource from '../utils/useReportImageSource';

export default function ReportEvidenceImage({ src, alt, className }) {
    const { t } = useTranslation();
    const [failedSrc, setFailedSrc] = useState(null);
    const image = useReportImageSource(src);
    if (image.loading) return <div className="w-full h-full grid place-items-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" role="status" aria-label={t('reportMedia.loading')}><LoaderCircle size={24} className="animate-spin" aria-hidden="true" /></div>;
    if (!src || image.failed || failedSrc === image.src) return <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
        <ImageOff size={24} aria-hidden="true" />
        <span>{t('reportMedia.photoUnavailable', { defaultValue: 'Photo unavailable' })}</span>
        {src && <button type="button" className="min-h-11 px-3 underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2" onClick={() => { setFailedSrc(null); image.retry(); }}>{t('reportMedia.retry')}</button>}
    </div>;
    return <img src={image.src} alt={alt} className={className} onError={() => setFailedSrc(image.src)} />;
}
