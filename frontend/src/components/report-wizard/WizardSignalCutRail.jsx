import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, key: 'category', defaultLabel: 'Category' },
  { id: 2, key: 'location', defaultLabel: 'Location' },
  { id: 3, key: 'evidence', defaultLabel: 'Evidence' },
  { id: 4, key: 'details', defaultLabel: 'Details' },
  { id: 5, key: 'contact', defaultLabel: 'Contact' },
  { id: 6, key: 'review', defaultLabel: 'Review' },
];

export default function WizardSignalCutRail({ currentStep, maxStepReached, onStepClick }) {
  const { t } = useTranslation();

  return (
    <nav 
      aria-label="Report progress steps" 
      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm"
    >
      {/* Desktop & Tablet Stepper */}
      <ol className="hidden sm:flex items-center justify-between gap-1 md:gap-2">
        {STEPS.map((step, idx) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = step.id < currentStep || (maxStepReached >= step.id && step.id !== currentStep);
          const isClickable = step.id <= maxStepReached;
          const label = t(`reportWizard.steps.${step.key}`, step.defaultLabel);

          return (
            <React.Fragment key={step.id}>
              {/* Step Item */}
              <li className="flex-1 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`group w-full flex flex-col items-center text-center p-1 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  {/* Step Circle & Number/Check */}
                  <div
                    className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                      isCurrent
                        ? 'bg-orange-600 text-white shadow-md shadow-orange-500/30 scale-105 ring-4 ring-orange-100 dark:ring-orange-950/50'
                        : isCompleted
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                    }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check size={16} strokeWidth={2.5} />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>

                  {/* Step Label */}
                  <span
                    className={`mt-1.5 text-xs font-semibold tracking-tight transition-colors ${
                      isCurrent
                        ? 'text-orange-600 dark:text-orange-400'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              </li>

              {/* 2px Signal Cut Connector Line */}
              {idx < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={`h-0.5 flex-1 mx-1 transition-colors duration-300 rounded-full ${
                    step.id < currentStep
                      ? 'bg-emerald-500'
                      : step.id === currentStep
                      ? 'bg-orange-500/60'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>

      {/* Mobile Segmented Stepper */}
      <div className="sm:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-xs uppercase tracking-wider text-orange-600 dark:text-[#ff8a3d]">
            {t('reportWizard.stepCountUppercase', 'STEP {{current}} OF {{total}}', { current: currentStep, total: 6 })}
          </span>
          <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            {t(`reportWizard.steps.${STEPS[currentStep - 1]?.key}`, STEPS[currentStep - 1]?.defaultLabel)}
          </span>
        </div>

        {/* 6 Segmented Progress Bars */}
        <div 
          className="grid grid-cols-6 gap-2 w-full"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={6}
        >
          {STEPS.map((step) => {
            const isPassedOrCurrent = step.id <= currentStep;
            const isClickable = step.id <= maxStepReached;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                aria-label={`Step ${step.id}: ${step.defaultLabel}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                } ${
                  isPassedOrCurrent ? 'bg-[#ff6b00]' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
