import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertCircle, Check
} from 'lucide-react';
import { cleanDescription } from '../../utils/reportWizardValidation';
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
  onDetailsChange,
  onBack,
  onContinue,
  stepErrors = [],
}) {
  const { t } = useTranslation();
  const textareaRef = useRef(null);

  const rawDescription = detailsData?.description || '';
  const urgency = detailsData?.urgency || 'medium';
  const charCount = rawDescription.trim().length;

  const descError = stepErrors.find(e => e.field === 'description');
  const hasError = Boolean(descError);

  useEffect(() => {
    if (hasError && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [hasError]);

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

  const handleDescriptionBlur = () => {
    // Sanitize on blur
    const cleaned = cleanDescription(rawDescription);
    if (cleaned !== rawDescription) {
      onDetailsChange({
        ...detailsData,
        description: cleaned,
      });
    }
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Inline Step Error Banner */}
        {hasError && (
          <div id="description-error-banner" role="alert" className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-sm font-semibold text-red-700 dark:text-red-300 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 text-red-500" aria-hidden="true" />
            <span>{descError.message}</span>
          </div>
        )}

        {/* Top: Severity Section */}
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
                ref={textareaRef}
                id="report-description"
                rows={6}
                value={rawDescription}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionBlur}
                aria-invalid={hasError ? 'true' : undefined}
                aria-describedby={hasError ? 'description-error-msg' : undefined}
                placeholder={t('reportWizard.step4Details.descriptionPlaceholder', "What did you notice? When did it start?\nInclude any details that could help the team understand the concern.")}
                className={`w-full min-h-[160px] p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900 text-sm sm:text-base leading-relaxed placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors ${
                  hasError
                    ? 'border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>

            {/* Inline Error under field if present */}
            {hasError && (
              <p id="description-error-msg" className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
                <AlertCircle size={14} className="shrink-0 text-red-500" aria-hidden="true" />
                <span>{descError.message}</span>
              </p>
            )}

            {/* Hint and Character Counter Row */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                {t('reportWizard.step4Details.charLimitMin', 'Between 20 and 1000 characters')}
              </span>
              <span className={`font-mono ${charCount > 1000 ? 'text-red-500 font-bold' : ''}`}>
                {charCount.toLocaleString()} / 1,000
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Footer: Primary button stays enabled */}
      <WizardCardFooter
        onBack={onBack}
        canBack={true}
        onContinue={onContinue}
        isContinueDisabled={false}
      />
    </div>
  );
}
