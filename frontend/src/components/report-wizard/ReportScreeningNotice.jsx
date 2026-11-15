import React from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isReportPhotoRestricted, screeningMessageKey } from '../../utils/reportScreening';

export default function ReportScreeningNotice({ analysis }) {
    const { t } = useTranslation();
    const message = screeningMessageKey(analysis);
    if (!message) return null;
    const restricted = isReportPhotoRestricted(analysis);
    return <p role={restricted ? 'alert' : 'status'} aria-live="polite" aria-atomic="true"
        className="flex items-start gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>{t(message)}</span>
    </p>;
}
