import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageOff } from 'lucide-react';

export default function ReportEvidenceImage({ src, alt, className }) {
    const { t } = useTranslation();
    const [failedSrc, setFailedSrc] = useState(null);
    if (!src || failedSrc === src) return <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm" role="img" aria-label={alt}>
        <ImageOff size={24} aria-hidden="true" />
        <span>{t('reportMedia.photoUnavailable', { defaultValue: 'Photo unavailable' })}</span>
    </div>;
    return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />;
}
