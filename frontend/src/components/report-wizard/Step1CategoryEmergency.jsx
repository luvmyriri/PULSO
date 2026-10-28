import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Info, Sparkles, Check, AlertCircle } from 'lucide-react';
import WizardCardFooter from './WizardCardFooter';

// ── Custom Pictograms matching the redesign specification ──
function RoadIcon({ className = "w-6 h-6", color = "#ff6b00" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 20L7.5 4H16.5L20 20H4Z" fill={color} />
      <path d="M12 6V9" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 13V18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DrainageWavesIcon({ className = "w-6 h-6", color = "#0284c7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 8C4.5 6.5 7.5 6.5 9 8C10.5 9.5 13.5 9.5 15 8C16.5 6.5 19.5 6.5 21 8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M3 13C4.5 11.5 7.5 11.5 9 13C10.5 14.5 13.5 14.5 15 13C16.5 11.5 19.5 11.5 21 13" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M3 18C4.5 16.5 7.5 16.5 9 18C10.5 19.5 13.5 19.5 15 18C16.5 16.5 19.5 16.5 21 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function LightbulbIcon({ className = "w-6 h-6", color = "#d97706" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9 18H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 21H14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 3C7.58 3 4 6.58 4 11C4 13.8 5.43 16.26 7.6 17.7C8.16 18.07 8.5 18.7 8.5 19.37V19.5H15.5V19.37C15.5 18.7 15.84 18.07 16.4 17.7C18.57 16.26 20 13.8 20 11C20 6.58 16.42 3 12 3Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WaterDropletIcon({ className = "w-6 h-6", color = "#2563eb" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.69L6.5 10.5C4.85 12.85 4.85 16 6.5 18.35C8.15 20.7 11 21.5 12 21.5C13 21.5 15.85 20.7 17.5 18.35C19.15 16 19.15 12.85 17.5 10.5L12 2.69Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon({ className = "w-6 h-6", color = "#e11d48" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.6415 19.6871 1.81442 19.9905C1.98734 20.2939 2.23672 20.5461 2.53773 20.7219C2.83875 20.8978 3.18082 20.991 3.53 20.991H20.47C20.8192 20.991 21.1613 20.8978 21.4623 20.7219C21.7633 20.5461 22.0127 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56613 13.2807 3.32313 12.9812 3.15449C12.6817 2.98585 12.3438 2.89746 12 2.89746C11.6562 2.89746 11.3183 2.98585 11.0188 3.15449C10.7193 3.32313 10.4683 3.56613 10.29 3.86Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9V13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17H12.01" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function TrafficSignIcon({ className = "w-6 h-6", color = "#9333ea" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 3V21" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="5" y="7" width="14" height="6" rx="2" stroke={color} strokeWidth="2.2" />
    </svg>
  );
}

function PublicFacilityIcon({ className = "w-6 h-6", color = "#ea580c" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 21V9L12 4L20 9V21H4Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="8" y="14" width="3" height="7" stroke={color} strokeWidth="1.8" />
      <rect x="13" y="14" width="3" height="7" stroke={color} strokeWidth="1.8" />
      <rect x="9" y="10" width="2" height="2" fill={color} />
      <rect x="13" y="10" width="2" height="2" fill={color} />
    </svg>
  );
}

function ZapIcon({ className = "w-6 h-6", color = "#ca8a04" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WasteIcon({ className = "w-6 h-6", color = "#059669" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 7H20" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11V17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M14 11V17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M5 7L6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19L19 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export const CATEGORIES = [
  {
    id: 'Roads & Bridges',
    key: 'roads_bridges',
    Icon: RoadIcon,
    defaultLabel: 'Roads & bridges',
    subtitle: 'Potholes, damaged roads, and sidewalks',
    bgClass: 'bg-[#ffedd5] dark:bg-orange-950/60',
    color: '#ff6b00',
    examples: 'Potholes, broken asphalt, damaged bridges, sidewalk cracks, road subsidence, collapsed culverts.',
  },
  {
    id: 'Drainage & Flooding',
    key: 'drainage_flooding',
    Icon: DrainageWavesIcon,
    defaultLabel: 'Drainage & flooding',
    subtitle: 'Clogged drains, gutters, and flooding',
    bgClass: 'bg-[#e0f2fe] dark:bg-cyan-950/60',
    color: '#0284c7',
    examples: 'Clogged storm drains, missing drainage grates, street flooding, overflowing canals, blocked gutters.',
  },
  {
    id: 'Street Lighting',
    key: 'street_lighting',
    Icon: LightbulbIcon,
    defaultLabel: 'Street lighting',
    subtitle: 'Busted, flickering, or damaged lights',
    bgClass: 'bg-[#fef3c7] dark:bg-amber-950/60',
    color: '#d97706',
    examples: 'Dark lampposts, flickering streetlights, damaged light poles, unlit intersections.',
  },
  {
    id: 'Water Pipeline',
    key: 'water_pipeline',
    Icon: WaterDropletIcon,
    defaultLabel: 'Water pipeline',
    subtitle: 'Pipeline leaks, burst pipes, and low water pressure',
    bgClass: 'bg-[#dbeafe] dark:bg-blue-950/60',
    color: '#2563eb',
    examples: 'Burst municipal water pipes, leaking street mains, low pressure, damaged water meters.',
  },
  {
    id: 'Public Safety Hazards',
    key: 'public_safety_hazards',
    Icon: AlertIcon,
    defaultLabel: 'Public safety hazards',
    subtitle: 'Fallen trees, open manholes, hazards',
    bgClass: 'bg-[#ffe4e6] dark:bg-rose-950/60',
    color: '#e11d48',
    examples: 'Fallen roadside trees, missing manhole covers, dangerous road obstructions, unstable retaining walls.',
  },
  {
    id: 'Traffic & Road Signs',
    key: 'traffic_road_signs',
    Icon: TrafficSignIcon,
    defaultLabel: 'Traffic & road signs',
    subtitle: 'Missing or damaged traffic signs',
    bgClass: 'bg-[#f3e8ff] dark:bg-purple-950/60',
    color: '#9333ea',
    examples: 'Damaged or missing stop signs, broken traffic lights, faded pedestrian lane markings, broken guardrails.',
  },
  {
    id: 'Public Facilities',
    key: 'public_facilities',
    Icon: PublicFacilityIcon,
    defaultLabel: 'Public facilities',
    subtitle: 'Parks, civic centers, and buildings',
    bgClass: 'bg-[#ffedd5] dark:bg-orange-950/60',
    color: '#ea580c',
    examples: 'Barangay halls, public health centers, municipal parks, public playground damage, community centers.',
  },
  {
    id: 'Electrical Wiring',
    key: 'electrical_wiring',
    Icon: ZapIcon,
    defaultLabel: 'Electrical wiring',
    subtitle: 'Dangling cables and exposed wires',
    bgClass: 'bg-[#fef9c3] dark:bg-yellow-950/60',
    color: '#ca8a04',
    examples: 'Low-hanging power lines, exposed live wiring, leaning utility poles, sparking electrical connections.',
  },
  {
    id: 'Waste Management',
    key: 'waste_management',
    Icon: WasteIcon,
    defaultLabel: 'Waste management',
    subtitle: 'Uncollected garbage, illegal dumping, litter',
    bgClass: 'bg-[#d1fae5] dark:bg-emerald-950/60',
    color: '#059669',
    examples: 'Uncollected trash piles, illegal roadside dumping, overflowing civic waste bins, hazardous litter.',
  },
];

export default function Step1CategoryEmergency({
  selectedCategory,
  onSelectCategory,
  onContinue,
  onBack,
  isGuideModalOpen = false,
  onCloseGuideModal = () => {},
  onOpenGuideModal = () => {},
  stepErrors = [],
}) {
  const { t } = useTranslation();
  const [localModalOpen, setLocalModalOpen] = useState(false);

  const isModalVisible = isGuideModalOpen || localModalOpen;
  const closeModal = () => {
    setLocalModalOpen(false);
    onCloseGuideModal();
  };
  const openModal = () => {
    setLocalModalOpen(true);
    onOpenGuideModal();
  };

  const firstCardRef = useRef(null);
  const categoryError = stepErrors.find(e => e.field === 'category');
  const hasError = Boolean(categoryError);

  useEffect(() => {
    if (hasError && firstCardRef.current) {
      firstCardRef.current.focus();
    }
  }, [hasError]);

  const selectedCatObj = CATEGORIES.find(c =>
    c.id.toLowerCase() === selectedCategory?.toLowerCase() ||
    c.defaultLabel.toLowerCase() === selectedCategory?.toLowerCase() ||
    c.key === selectedCategory
  );

  // Keyboard accessibility: Close modal on Escape
  useEffect(() => {
    if (!isModalVisible) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isModalVisible]);

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Header Eyebrow, Title & Subtitle */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('reportWizard.step1Category.stepBadge', 'STEP 1 OF 6')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.step1Category.title', 'What would you like to report?')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t('reportWizard.step1Category.subtitle', 'Choose one category that best matches your concern.')}
          </p>
        </div>

        {/* Inline Category Error Message */}
        {hasError && (
          <div id="category-error-message" role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-sm font-semibold text-red-700 dark:text-red-300 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 text-red-500" aria-hidden="true" />
            <span>{categoryError.message || t('reportWizard.validation.category.required', 'Please choose the type of problem.')}</span>
          </div>
        )}

        {/* 3x3 Grid of Categories */}
        <fieldset
          role="radiogroup"
          aria-label="Issue category selector"
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={hasError ? 'category-error-message' : undefined}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4"
        >
          <legend className="sr-only">Choose an infrastructure category</legend>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCatObj?.id === cat.id;
            const IconComponent = cat.Icon;
            const label = t(`reportWizard.categories.${cat.key}`, cat.defaultLabel);
            const subtitle = t(`reportWizard.categorySubs.${cat.key}`, cat.subtitle);

            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${label}. ${subtitle}`}
                ref={cat.id === CATEGORIES[0].id ? firstCardRef : null}
                onClick={() => onSelectCategory(cat.id)}
                className={`group relative text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  isSelected
                    ? 'border-[#ff6b00] dark:border-[#ff6b00] bg-[#fff8f5] dark:bg-orange-950/25 ring-1 ring-[#ff6b00] shadow-xs'
                    : hasError
                    ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20 dark:bg-red-950/20 hover:border-red-600'
                    : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                }`}
              >
                {/* Left: Icon Box + Label + Subtitle */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${cat.bgClass}`}>
                    <IconComponent className="w-6 h-6" color={cat.color} />
                  </div>
                  <div className="flex flex-col pt-0.5 min-w-0">
                    <span className="font-heading font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {label}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {subtitle}
                    </span>
                  </div>
                </div>

                {/* Right: Circular Radio Indicator */}
                <div className="shrink-0 mt-0.5" aria-hidden="true">
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full border-2 border-[#ff6b00] flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]" />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 block group-hover:border-slate-400 dark:group-hover:border-slate-500 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </fieldset>

        {/* "Not sure? Get help choosing a category." Link */}
        <div>
          <button
            type="button"
            onClick={openModal}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold underline underline-offset-2 transition-colors cursor-pointer"
          >
            {t('reportWizard.step1Category.notSureHelp', 'Not sure? Get help choosing a category.')}
          </button>
        </div>

        {/* Dynamic Contextual Selection Callout Banner */}
        {selectedCatObj && (
          <div className="bg-[#fff6ee] dark:bg-orange-950/30 border border-[#fed7aa] dark:border-orange-900/60 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 animate-fadeIn">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedCatObj.bgClass}`}>
              <selectedCatObj.Icon className="w-6 h-6" color={selectedCatObj.color} />
            </div>
            <div className="space-y-0.5 leading-snug">
              <p className="text-sm text-slate-800 dark:text-slate-200">
                <span className="text-slate-500 dark:text-slate-400">Selected: </span>
                <strong className="font-extrabold text-slate-900 dark:text-white">
                  {selectedCatObj.defaultLabel}
                </strong>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t('reportWizard.step1Category.nextPinpoint', 'Next, pinpoint where the issue is located.')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pinned Card Footer */}
      <WizardCardFooter
        onBack={null}
        canBack={false}
        onContinue={onContinue}
        isContinueDisabled={false}
        continueLabel={t('reportWizard.step1Category.continueToLocation', 'Continue to location')}
        noteText={t('reportWizard.shell.notSubmittedYet', 'Your report is not submitted until you confirm it in Review.')}
      />

      {/* ── ISSUE CATEGORIES INFORMATION & EXAMPLES MODAL ───────────── */}
      {isModalVisible && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-guide-title"
          onClick={closeModal}
        >
          <div
            className="w-full sm:max-w-xl max-h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp sm:animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#ff6b00] flex items-center justify-center shrink-0">
                  <Info size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 id="category-guide-title" className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    Reporting Guide & Examples
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Find the appropriate civic category for your concern
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close guide"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: List of 9 categories with descriptions & examples */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800/80">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.Icon;
                const isSelected = selectedCatObj?.id === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`pt-3.5 first:pt-0 rounded-2xl p-3 transition-colors ${
                      isSelected
                        ? 'bg-orange-50/70 dark:bg-orange-950/20 border border-orange-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cat.bgClass}`}>
                        <IconComponent className="w-5 h-5" color={cat.color} />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                            {cat.defaultLabel}
                          </h3>
                          {isSelected ? (
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ff6b00] bg-orange-100 dark:bg-orange-950/60 px-2 py-0.5 rounded-md shrink-0">
                              Selected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCategory(cat.id);
                                closeModal();
                              }}
                              className="text-xs font-semibold text-[#ff6b00] hover:underline cursor-pointer"
                            >
                              Select this
                            </button>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {cat.subtitle}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Includes: </span>
                          {cat.examples}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="w-full py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] active:scale-[0.98] text-white font-heading font-bold text-sm shadow-xs transition-all cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
