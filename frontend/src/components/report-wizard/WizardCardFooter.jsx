import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Send, Loader2, Info } from 'lucide-react';
import { isNativeAndroid } from '../../utils/appContext';

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
  const showNote = !isNativeAndroid() || isSubmit;

  return (
    <footer className="fixed bottom-0 inset-x-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-3 sm:px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.06)] lg:static lg:inset-auto lg:z-auto lg:w-full lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none lg:border-t lg:border-slate-100 lg:dark:border-slate-800 lg:px-0 lg:py-0 lg:pt-4 lg:mt-auto lg:shadow-none shrink-0">
      <div className="max-w-7xl mx-auto w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-3 gap-y-2 sm:gap-4">
        {/* Back stays beside the primary action at the bottom on phones. */}
        {onBack && canBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={!canBack || isSubmitting}
              aria-label={resolvedBackText}
              title={resolvedBackText}
              className={`order-1 min-h-12 px-3 sm:px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 shrink-0 transition-colors focus-visible:outline-3 focus-visible:outline-blue-600 cursor-pointer ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span className="text-sm font-bold">{resolvedBackText}</span>
            </button>
        )}
        {showNote && <div className="order-3 sm:order-2 flex w-full sm:w-auto sm:flex-1 items-center gap-1.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
            <Info size={15} className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
            <span className="text-xs">{resolvedNote}</span>
          </div>}

        {/* Continue shares the same reachable action row. */}
        <div className="order-2 sm:order-3 flex flex-1 sm:flex-none min-w-0 justify-end">
          <button
            type="button"
            onClick={onContinue}
            disabled={isContinueDisabled || isSubmitting}
            className={`w-full sm:w-auto min-h-12 px-3 sm:px-7 text-sm sm:text-base rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 ${
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
