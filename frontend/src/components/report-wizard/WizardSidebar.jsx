import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Lightbulb } from 'lucide-react';

export const REPORT_STEPS = [
  { id: 1, key: 'evidence_location', defaultLabel: 'Photo & Location', subtitle: 'Capture photo and auto-locate' },
  { id: 2, key: 'category', defaultLabel: 'Category', subtitle: 'Choose the type of issue' },
  { id: 3, key: 'details', defaultLabel: 'Details', subtitle: 'Describe the concern' },
  { id: 4, key: 'contact', defaultLabel: 'Contact', subtitle: 'How we can reach you' },
  { id: 5, key: 'review', defaultLabel: 'Review', subtitle: 'Check before submitting' },
];

export default function WizardSidebar({ currentStep, maxStepReached, onStepClick, onOpenHelpGuide }) {
  const { t } = useTranslation();

  return (
    <aside
      aria-label="Report Steps Navigation"
      className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col justify-between self-stretch bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs"
    >
      <div className="space-y-5">
        {/* Header Title & Subtitle */}
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.shell.reportAConcern', 'Report a concern')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('reportWizard.shell.tellUsWhatNeedsAttention', 'Tell us what needs attention.')}
          </p>
        </div>

        {/* Vertical Stepper with natural top-anchored flow */}
        <nav aria-label="Steps progress" className="pt-1">
          <ol className="relative space-y-4 xl:space-y-5">
            {REPORT_STEPS.map((step, idx) => {
              const isCurrent = step.id === currentStep;
              const isFinished = step.id < currentStep;
              const isClickable = step.id <= maxStepReached;
              const isLast = idx === REPORT_STEPS.length - 1;
              const label = t(`reportWizard.steps.${step.key}`, step.defaultLabel);
              const subtitle = t(`reportWizard.subtitles.${step.key}`, step.subtitle);

              return (
                <li key={step.id} className="relative flex items-start group">
                  {/* Vertical Connecting Line spanning to next node */}
                  {!isLast && (
                    <div
                      className={`absolute left-[15px] top-[34px] bottom-[-16px] xl:bottom-[-20px] w-[2px] transition-colors duration-200 ${
                        isFinished
                          ? 'bg-[#ff6b00]'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                      aria-hidden="true"
                    />
                  )}

                  {/* Step Button / Item */}
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick(step.id)}
                    disabled={!isClickable}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`w-full flex items-start gap-3.5 py-1 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-xl ${
                      isClickable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {/* Circle Indicator */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all duration-200 ${
                        isCurrent
                          ? 'bg-[#ff6b00] text-white shadow-xs'
                          : isFinished
                          ? 'bg-[#ff6b00] text-white'
                          : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isFinished ? (
                        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>

                    {/* Step Title & Subtitle */}
                    <div className="flex flex-col pt-0.5 leading-snug">
                      <span
                        className={`text-sm tracking-tight transition-colors ${
                          isCurrent
                            ? 'font-bold text-[#ff6b00] dark:text-[#ff8a3d]'
                            : isFinished
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : 'font-semibold text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {subtitle}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* "Need help choosing?" bottom card */}
      <button
        type="button"
        onClick={onOpenHelpGuide}
        className="w-full text-left bg-[#f0f5fa] dark:bg-slate-800/80 hover:bg-[#e4eff8] dark:hover:bg-slate-800 border border-blue-100/60 dark:border-slate-700/60 rounded-2xl p-4 flex items-start gap-3 mt-4 transition-all duration-200 cursor-pointer group shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
          <Lightbulb size={18} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div className="space-y-0.5 leading-snug">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            {t('reportWizard.shell.needHelpChoosing', 'Need help choosing?')}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            {t('reportWizard.shell.needHelpChoosingDesc', 'Read the examples or open the reporting guide.')}
          </p>
        </div>
      </button>
    </aside>
  );
}
