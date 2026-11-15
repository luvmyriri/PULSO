import { useTranslation } from 'react-i18next';

export default function CaptureLocationStatus({ status, captured = false, sample = false, className = '' }) {
    const { t, i18n } = useTranslation();
    const fix = status?.fix;
    const key = sample ? 'sample' : captured ? 'saved' : status?.state === 'acquiring' ? 'acquiring' : status?.state === 'denied' ? 'denied'
        : status?.state === 'hidden' ? 'paused' : fix ? 'estimate' : 'unavailable';
    return <p className={className} role="status" aria-live="polite" aria-atomic="true">
        {t(`captureLocation.${key}`)}{' '}
        {fix && !captured && !sample && t('captureLocation.reading', {
            accuracy: fix.accuracy_m == null ? t('captureLocation.unknownAccuracy') : `${Math.round(fix.accuracy_m * 10) / 10} m`,
            time: new Date(fix.measured_at).toLocaleTimeString(i18n.language?.startsWith('tl') ? 'fil-PH' : 'en-PH'),
        })}
    </p>;
}
