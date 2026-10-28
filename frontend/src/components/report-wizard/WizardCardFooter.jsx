import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Send, Loader2, Info } from 'lucide-react';

export default function WizardCardFooter({
  onBack,
  canBack = true,
  backLabel,
  onContinue,
  isContinueDisabled = false,
  continueLabel,
  isSubmit = false,
  isSubmitting = false,
  noteText,
}) {
  const { t } = useTranslation();

  const resolvedBackText = backLabel || t('reportWizard.shell.back', 'Back');
  const resolvedContinueText =
    continueLabel ||
    (isSubmit
      ? t('reportWizard.shell.submitReport', 'Submit Report')
      : t('reportWizard.shell.continue', 'Continue'));
  const resolvedNote =
    noteText ||
    (isSubmit
      ? t('reportWizard.shell.reviewBeforeSubmit', 'Review your details carefully before submitting.')
      : t('reportWizard.shell.notSubmittedYet', 'Your report has not been submitted yet.'));

  return (
    <footer className="fixed bottom-0 inset-x-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-4 py-3 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] lg:static lg:inset-auto lg:z-auto lg:w-full lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none lg:border-t lg:border-slate-100 lg:dark:border-slate-800 lg:px-0 lg:py-0 lg:pt-4 lg:mt-auto lg:shadow-none shrink-0">
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left: Back Button (if allowed) + Information Note */}
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 order-2 sm:order-1 self-start sm:self-auto">
          {onBack && canBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={!canBack || isSubmitting}
              aria-label={resolvedBackText}
              title={resolvedBackText}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] flex items-center justify-center shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
          )}

          <div className="flex items-center gap-1.5 leading-snug">
            <Info size={15} className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
            <span className="text-xs">{resolvedNote}</span>
          </div>
        </div>

        {/* Right: Continue / Submit Action Button */}
        <div className="w-full sm:w-auto order-1 sm:order-2 flex justify-end">
          <button
            type="button"
            onClick={onContinue}
            disabled={isContinueDisabled || isSubmitting}
            className={`w-full sm:w-auto min-h-[46px] h-11 sm:h-12 px-6 sm:px-7 text-sm sm:text-base rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              isSubmitting
                ? 'bg-[#ff6b00]/90 text-white cursor-wait shadow-xs'
                : !isContinueDisabled
                ? 'bg-[#ff6b00] hover:bg-[#ea580c] active:bg-[#c2410c] text-white hover:shadow-md active:scale-[0.98] cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" aria-hidden="true" />
                <span>{t('reportWizard.nav.submitting', 'Submitting...')}</span>
              </>
            ) : (
              <>
                <span>{resolvedContinueText}</span>
                {isSubmit ? (
                  <Send size={16} aria-hidden="true" />
                ) : (
                  <ArrowRight size={16} aria-hidden="true" />
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
