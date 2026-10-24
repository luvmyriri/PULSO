import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';

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
    <footer className="w-full pt-6 mt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
      {/* Action Buttons: Single row (one line) on mobile and desktop */}
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left: Back Button (Icon Only, "Back" word removed) + Desktop Note */}
        <div className="flex items-center gap-3">
          {onBack && canBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={!canBack || isSubmitting}
              aria-label={resolvedBackText}
              title={resolvedBackText}
              className={`w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-xl border font-bold text-sm flex items-center justify-center shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                canBack && !isSubmitting
                  ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] cursor-pointer'
                  : 'border-slate-200/50 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
              }`}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          )}

          {/* Desktop Note */}
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight">
            {resolvedNote}
          </span>
        </div>

        {/* Right: Continue / Submit Action Button (Fills line on mobile) */}
        <button
          type="button"
          onClick={onContinue}
          disabled={isContinueDisabled || isSubmitting}
          className={`flex-1 sm:flex-initial min-h-[48px] h-12 sm:min-h-[52px] sm:h-[52px] px-8 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            !isContinueDisabled && !isSubmitting
              ? 'bg-[#ff6b00] hover:bg-[#ea580c] active:bg-[#c2410c] text-white hover:shadow-md active:scale-[0.98] cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin text-white" aria-hidden="true" />
              <span>{t('reportWizard.nav.submitting', 'Submitting...')}</span>
            </>
          ) : (
            <>
              <span>{resolvedContinueText}</span>
              {isSubmit ? (
                <Send size={18} aria-hidden="true" />
              ) : (
                <ArrowRight size={18} aria-hidden="true" />
              )}
            </>
          )}
        </button>
      </div>

      {/* Mobile Note below the button row */}
      <p className="sm:hidden text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        {resolvedNote}
      </p>
    </footer>
  );
}
