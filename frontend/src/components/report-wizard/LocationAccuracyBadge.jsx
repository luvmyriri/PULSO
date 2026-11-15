import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hasReportLocation, locationEvidence } from '../../utils/reportIntake';

export default function LocationAccuracyBadge({ location }) {
  const { t } = useTranslation();
  if (!hasReportLocation(location)) return null;
  const evidence = locationEvidence(location);
  const device = evidence.source === 'device';
  const manual = ['manual', 'search'].includes(evidence.source);
  const accuracy = evidence.device_fix?.accuracy_m;
  const label = device
    ? accuracy ? t('locationPrivacy.approximateAccuracy', { accuracy: Math.max(1, Math.round(accuracy)) }) : t('locationPrivacy.approximateLocation')
    : t(manual ? 'residentDraft.manualLocation' : 'locationPrivacy.approximateLocation');
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${device
    ? 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-500/50'
    : 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/50'}`}>
    <Info size={13} className="shrink-0" aria-hidden="true" /><span>{label}</span>
  </span>;
}
