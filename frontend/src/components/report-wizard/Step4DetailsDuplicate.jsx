import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { cleanDescription, validateDetails } from '../../utils/reportWizardValidation';
import WizardCardFooter from './WizardCardFooter';

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
  const charCount = rawDescription.trim().length;

  const descError = stepErrors.find(e => e.field === 'description');
  const hasError = Boolean(descError);

  useEffect(() => {
    if (hasError && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [hasError]);

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
    <div className="flex flex-col justify-between flex-1 h-full space-y-4 lg:space-y-6">
      <div className="space-y-3.5 lg:flex-1 lg:flex lg:flex-col">
        {/* Inline Step Error Banner */}
        {hasError && (
          <div id="description-error-banner" role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-sm font-semibold text-red-700 dark:text-red-300 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 text-red-500" aria-hidden="true" />
            <span>{descError.message}</span>
          </div>
        )}

        {/* Tell us what happened / Description */}
        <div className="space-y-3 lg:flex-1 lg:flex lg:flex-col">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('reportWizard.step4Details.stepBadge', 'STEP 3 OF 5')}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('reportWizard.step4Details.title', 'Tell us what happened')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {t('reportWizard.step4Details.subtitle', 'Share the details that will help the team review your report.')}
            </p>
          </div>

          <div className="space-y-1.5 lg:flex-1 lg:flex lg:flex-col">
            <label htmlFor="report-description" className="sr-only">
              {t('reportWizard.step4Details.descriptionLabel', 'Description')}
            </label>
            <div className="relative lg:flex-1 lg:flex lg:flex-col">
              <textarea
                ref={textareaRef}
                id="report-description"
                rows={5}
                value={rawDescription}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionBlur}
                aria-invalid={hasError ? 'true' : undefined}
                aria-describedby={hasError ? 'description-error-msg' : undefined}
                placeholder={t('reportWizard.step4Details.descriptionPlaceholder', "What did you notice? When did it start?\nInclude any details that could help the team understand the concern.")}
                className={`w-full min-h-[140px] lg:flex-1 lg:min-h-[220px] p-3.5 sm:p-4 rounded-2xl border bg-white dark:bg-slate-900 text-sm leading-relaxed placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors ${
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

      {/* Pinned Footer: Disabled until required description is valid */}
      <WizardCardFooter
        onBack={onBack}
        canBack={true}
        onContinue={onContinue}
        isContinueDisabled={!validateDetails(detailsData).valid}
        compact={true}
      />
    </div>
  );
}
