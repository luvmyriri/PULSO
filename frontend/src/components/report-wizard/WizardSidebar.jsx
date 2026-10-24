import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Lock } from 'lucide-react';

export const REPORT_STEPS = [
  { id: 1, key: 'category', defaultLabel: 'Category' },
  { id: 2, key: 'location', defaultLabel: 'Location' },
  { id: 3, key: 'evidence', defaultLabel: 'Photos' },
  { id: 4, key: 'details', defaultLabel: 'Details' },
  { id: 5, key: 'contact', defaultLabel: 'Contact' },
  { id: 6, key: 'review', defaultLabel: 'Review' },
];

export default function WizardSidebar({ currentStep, maxStepReached, onStepClick }) {
  const { t } = useTranslation();

  return (
    <aside 
      aria-label="Report Steps Navigation"
      className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col justify-between self-stretch pr-4"
    >
      <div className="space-y-6">
        {/* Header Eyebrow & Title */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            {t('reportWizard.shell.newReport', 'NEW REPORT')}
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.shell.reportAConcern', 'Report a concern')}
          </h2>
        </div>

        {/* Vertical Step List */}
        <nav aria-label="Steps" className="space-y-1.5">
          <ol className="space-y-1.5">
            {REPORT_STEPS.map((step) => {
              const isCurrent = step.id === currentStep;
              const isFinished = step.id < currentStep || (maxStepReached >= step.id && step.id !== currentStep);
              const isClickable = step.id <= maxStepReached;
              const label = t(`reportWizard.steps.${step.key}`, step.defaultLabel);

              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick(step.id)}
                    disabled={!isClickable}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      isCurrent
                        ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 shadow-xs'
                        : isClickable
                        ? 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {/* Circle Indicator */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all duration-200 ${
                        isCurrent
                          ? 'bg-[#ff6b00] text-white shadow-xs'
                          : isFinished
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isFinished ? (
                        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>

                    {/* Step Label */}
                    <span
                      className={`text-sm tracking-tight transition-colors ${
                        isCurrent
                          ? 'font-bold text-orange-600 dark:text-orange-400'
                          : isFinished
                          ? 'font-medium text-slate-800 dark:text-slate-200'
                          : 'font-normal text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Privacy Note at Bottom */}
      <div className="pt-6 mt-8 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">
            <Lock size={16} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {t('reportWizard.shell.privacyTitle', 'Your information stays private')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('reportWizard.shell.privacyDesc', 'Contact details help us follow up and are not shown on public reports.')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
