import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, ArrowRight, ArrowLeft, 
  CheckCircle2, Sparkles 
} from 'lucide-react';
import { getHaversineDistanceMeters } from '../../utils/geospatial';

const URGENCY_LEVELS = [
  { id: 'low', key: 'low', label: 'Low', desc: 'Minor cosmetic or non-blocking defect' },
  { id: 'medium', key: 'medium', label: 'Medium', desc: 'Moderate inconvenience or recurring issue' },
  { id: 'high', key: 'high', label: 'High', desc: 'Impeding traffic, pedestrian safety, or water flow' },
  { id: 'critical', key: 'critical', label: 'Critical', desc: 'Immediate hazard to public safety' },
];

export default function Step4DetailsDuplicate({
  detailsData,
  locationData,
  category,
  evidenceData,
  onDetailsChange,
  onBack,
  onContinue,
}) {
  const { t } = useTranslation();
  const description = detailsData.description || '';
  const urgency = detailsData.urgency || 'medium';
  const charCount = description.trim().length;
  const isDescriptionValid = charCount >= 10 && charCount <= 5000;

  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // 100-meter proximity radar duplicate check computed reactively
  const nearbyReport = useMemo(() => {
    if (!locationData?.lat || !locationData?.lng) return null;

    const simulatedActiveReports = [
      {
        ticketId: 'RPT-20260830-4F81',
        category: 'Roads & Bridges',
        lat: 14.7568,
        lng: 121.0454,
        status: 'Validated / Work Order Dispatched',
        reportedAgo: 'Yesterday at 3:15 PM',
      },
      {
        ticketId: 'RPT-20260831-7C22',
        category: 'Water & Drainage',
        lat: 14.6505,
        lng: 120.9805,
        status: 'In Progress / Maintenance Crew On-Site',
        reportedAgo: '3 hours ago',
      },
    ];

    const match = simulatedActiveReports.find((rep) => {
      const dist = getHaversineDistanceMeters(locationData.lat, locationData.lng, rep.lat, rep.lng);
      return dist <= 100 && (!category || rep.category.toLowerCase() === category.toLowerCase());
    });

    if (match) {
      const distance = getHaversineDistanceMeters(locationData.lat, locationData.lng, match.lat, match.lng);
      return { ...match, distance };
    }
    return null;
  }, [locationData, category]);

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          {t('reportWizard.step4Details.title', 'Describe the Problem')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('reportWizard.step4Details.subtitle', 'Provide clear details on the size, duration, and safety hazard to help crews prepare.')}
        </p>
      </div>

      {/* ── 100-METER DUPLICATE REPORT AWARENESS RADAR ───────────────────────── */}
      {nearbyReport && !duplicateDismissed && (
        <aside
          aria-label="Duplicate report notification"
          className="rounded-2xl border-2 border-amber-300 dark:border-amber-700/70 bg-amber-50/90 dark:bg-amber-950/40 p-4 sm:p-5 shadow-sm space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-200/70 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 shrink-0 mt-0.5">
              <AlertTriangle size={20} strokeWidth={2.2} />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-bold text-base text-amber-950 dark:text-amber-100">
                {t('reportWizard.step4Details.duplicateBannerTitle', 'Similar Active Report Found Nearby')}
              </h3>
              <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-300/90">
                {t('reportWizard.step4Details.duplicateBannerDesc', 'A report in this category is already active within {{distance}}m of your pin (Ticket: {{ticketId}}).', {
                  distance: nearbyReport.distance,
                  ticketId: nearbyReport.ticketId,
                })}
              </p>

              <div className="mt-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1">
                <div className="flex justify-between font-mono font-bold text-slate-800 dark:text-slate-200">
                  <span>Ticket: {nearbyReport.ticketId}</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{nearbyReport.status}</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Category: {nearbyReport.category} · Reported {nearbyReport.reportedAgo}
                </div>
              </div>
            </div>
          </div>

          {/* Action Choices */}
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pl-11">
            <button
              type="button"
              onClick={() => {
                alert(`Evidence will be attached to ticket ${nearbyReport.ticketId}. Priority escalated.`);
                setDuplicateDismissed(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer"
            >
              {t('reportWizard.step4Details.duplicateAttachBtn', 'Attach Evidence to Existing Report')}
            </button>
            <button
              type="button"
              onClick={() => setDuplicateDismissed(true)}
              className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer"
            >
              {t('reportWizard.step4Details.duplicateProceedBtn', 'Continue Submitting as New Report')}
            </button>
          </div>
        </aside>
      )}

      {/* ── DESCRIPTION TEXTAREA ────────────────────────────────────────────── */}
      <div className="space-y-2">
        {evidenceData?.autoDescription && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mb-2">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <Sparkles size={16} className="text-orange-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-white">AI Vision Observation: </span>
                <p className="text-slate-700 dark:text-slate-300 italic mt-0.5 leading-relaxed">
                  "{evidenceData.autoDescription}"
                </p>
              </div>
            </div>
            {description !== evidenceData.autoDescription && (
              <button
                type="button"
                onClick={() => onDetailsChange({ ...detailsData, description: evidenceData.autoDescription })}
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shrink-0 shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Sparkles size={13} />
                <span>Use AI Description</span>
              </button>
            )}
          </div>
        )}

        <label
          htmlFor="report-description"
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
        >
          {t('reportWizard.step4Details.descriptionLabel', 'Detailed Description')}
        </label>
        <textarea
          id="report-description"
          rows={5}
          value={description}
          onChange={(e) => onDetailsChange({ ...detailsData, description: e.target.value })}
          placeholder={t('reportWizard.step4Details.descriptionPlaceholder', 'Describe what is broken, how big the hazard is, and how long it has been present...')}
          className={`w-full p-4 rounded-2xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 leading-relaxed ${
            charCount > 0 && !isDescriptionValid
              ? 'border-red-400 dark:border-red-700'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        />

        {/* Character Count & Minimum Requirement Indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className={`${charCount >= 10 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
            {charCount >= 10 ? '✓ Minimum length satisfied' : 'Minimum 10 characters required'}
          </span>
          <span className="font-mono text-slate-400 dark:text-slate-500">
            {charCount} / 5000
          </span>
        </div>
      </div>

      {/* ── URGENCY SELECTOR ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {t('reportWizard.step4Details.urgencyLabel', 'Perceived Urgency')}
        </label>
        <div role="radiogroup" aria-label="Urgency level selector" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {URGENCY_LEVELS.map((lvl) => {
            const isSelected = urgency === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onDetailsChange({ ...detailsData, urgency: lvl.id })}
                className={`p-3 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 ring-2 ring-orange-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-xs ${isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {lvl.label}
                  </span>
                  {isSelected && <CheckCircle2 size={14} className="text-orange-600" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {lvl.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTION FOOTER ────────────────────────────────────────────────────── */}
      <div className="pt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{t('reportWizard.nav.back', 'Back')}</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={!isDescriptionValid}
          className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            isDescriptionValid
              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          }`}
        >
          <span>{t('reportWizard.nav.next', 'Continue')}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
