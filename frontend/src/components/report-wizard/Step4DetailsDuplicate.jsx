import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, CheckCircle2, Circle, Sparkles, 
  Check, ArrowRight, ShieldAlert 
} from 'lucide-react';
import { getHaversineDistanceMeters } from '../../utils/geospatial';
import WizardCardFooter from './WizardCardFooter';

const SEVERITY_OPTIONS = [
  { 
    id: 'low', 
    labelKey: 'reportWizard.step4Details.severityMinor', 
    defaultLabel: 'Minor', 
    descKey: 'reportWizard.step4Details.severityMinorDesc', 
    defaultDesc: 'Little disruption' 
  },
  { 
    id: 'medium', 
    labelKey: 'reportWizard.step4Details.severityModerate', 
    defaultLabel: 'Moderate', 
    descKey: 'reportWizard.step4Details.severityModerateDesc', 
    defaultDesc: 'Some disruption' 
  },
  { 
    id: 'high', 
    labelKey: 'reportWizard.step4Details.severityHigh', 
    defaultLabel: 'High', 
    descKey: 'reportWizard.step4Details.severityHighDesc', 
    defaultDesc: 'Significant impact' 
  },
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
  const description = detailsData?.description || '';
  const urgency = detailsData?.urgency || 'medium';
  const charCount = description.trim().length;
  const isDescriptionValid = charCount >= 10 && charCount <= 5000;

  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // Proximity radar duplicate check
  const nearbyReport = useMemo(() => {
    if (!locationData?.lat || !locationData?.lng) return null;

    const simulatedActiveReports = [
      {
        ticketId: 'RPT-20260830-4F81',
        category: 'Roads & Bridges',
        lat: 14.7568,
        lng: 121.0454,
        status: 'Validated / Work Order Dispatched',
      },
      {
        ticketId: 'RPT-20260831-7C22',
        category: 'Water & Drainage',
        lat: 14.6505,
        lng: 120.9805,
        status: 'In Progress / Maintenance Crew On-Site',
      },
    ];

    const match = simulatedActiveReports.find((rep) => {
      const dist = getHaversineDistanceMeters(locationData.lat, locationData.lng, rep.lat, rep.lng);
      return dist <= 100 && (!category || rep.category.toLowerCase().includes(category.toLowerCase().slice(0, 4)));
    });

    return match ? { ...match, distance: 45 } : null;
  }, [locationData, category]);

  const handleUrgencySelect = (val) => {
    onDetailsChange({
      ...detailsData,
      urgency: val,
    });
  };

  const handleDescriptionChange = (e) => {
    onDetailsChange({
      ...detailsData,
      description: e.target.value,
    });
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Nearby Duplicate Notice if detected */}
        {nearbyReport && !duplicateDismissed && (
          <aside
            aria-label="Nearby duplicate report warning"
            className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-4 sm:p-5 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  {t('reportWizard.step4Details.duplicateBannerTitle', 'Similar Active Report Found Nearby')}
                </h2>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  {t('reportWizard.step4Details.duplicateBannerDesc', 'A report in this category is already active within {{distance}}m of your pin (Ticket: {{ticketId}}).', {
                    distance: nearbyReport.distance,
                    ticketId: nearbyReport.ticketId,
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDuplicateDismissed(true)}
              className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline shrink-0"
            >
              Dismiss
            </button>
          </aside>
        )}

        {/* Top: Severity Section (How much is it affecting the area?) */}
        <div className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('reportWizard.step4Details.severityTitle', 'How much is it affecting the area?')}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {t('reportWizard.step4Details.severitySubtitle', 'Choose the closest option. The team will assess the report.')}
            </p>
          </div>

          <fieldset role="radiogroup" aria-label="Severity level" className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            <legend className="sr-only">Severity selection</legend>
            {SEVERITY_OPTIONS.map((opt) => {
              const isSelected = urgency === opt.id;
              const label = t(opt.labelKey, opt.defaultLabel);
              const desc = t(opt.descKey, opt.defaultDesc);

              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleUrgencySelect(opt.id)}
                  className={`relative p-5 rounded-2xl border text-left flex flex-col justify-between min-h-[96px] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    isSelected
                      ? 'border-orange-600 dark:border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 ring-2 ring-orange-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-base text-slate-900 dark:text-white">
                      {label}
                    </span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[#ff6b00] text-white'
                        : 'border border-slate-300 dark:border-slate-600 bg-transparent'
                    }`}>
                      {isSelected && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {desc}
                  </p>
                </button>
              );
            })}
          </fieldset>
        </div>

        {/* Below: Tell us what happened / Description */}
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('reportWizard.step4Details.title', 'Tell us what happened')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {t('reportWizard.step4Details.subtitle', 'Share the details that will help the team review your report.')}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="report-description" className="sr-only">
              {t('reportWizard.step4Details.descriptionLabel', 'Description')}
            </label>
            <div className="relative">
              <textarea
                id="report-description"
                rows={6}
                value={description}
                onChange={handleDescriptionChange}
                placeholder={t('reportWizard.step4Details.descriptionPlaceholder', "What did you notice? When did it start?\nInclude any details that could help the team understand the concern.")}
                className={`w-full min-h-[160px] p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900 text-sm sm:text-base leading-relaxed placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors ${
                  charCount > 0 && charCount < 10
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>

            {/* Hint and Character Counter Row */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span className={charCount > 0 && charCount < 10 ? 'text-red-500 font-bold' : ''}>
                {t('reportWizard.step4Details.charLimitMin', 'At least 10 characters')}
              </span>
              <span className="font-mono">
                {charCount.toLocaleString()} / 5,000
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Footer */}
      <WizardCardFooter
        onBack={onBack}
        canBack={true}
        onContinue={onContinue}
        isContinueDisabled={!isDescriptionValid}
      />
    </div>
  );
}
