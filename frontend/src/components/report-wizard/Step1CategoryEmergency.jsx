import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Route, Droplets, Lightbulb, 
  Building2, ShieldAlert, Signpost, HelpCircle, Check,
  Info, X
} from 'lucide-react';
import WizardCardFooter from './WizardCardFooter';

const CATEGORIES = [
  {
    id: 'Water Supply & Distribution',
    key: 'water_supply_distribution',
    icon: Droplets,
    defaultLabel: 'Water & drainage',
    fullLabel: 'Water Supply & Distribution',
    defaultDesc: 'Clogged storm drains, missing manhole covers, flash flooding, burst pipes, and open drainage canals.',
  },
  {
    id: 'Power & Street Lighting',
    key: 'power_street_lighting',
    icon: Lightbulb,
    defaultLabel: 'Streetlights & power',
    fullLabel: 'Power & Street Lighting',
    defaultDesc: 'Dark lampposts, flickering lights, dangling low-voltage lines, and damaged electrical poles.',
  },
  {
    id: 'Roads & Bridges',
    key: 'roads_bridges',
    icon: Route,
    defaultLabel: 'Roads & bridges',
    fullLabel: 'Roads & Bridges',
    defaultDesc: 'Potholes, broken asphalt, damaged bridges, sidewalk cracks, and road subsidence.',
  },
  {
    id: 'Traffic & Road Signs',
    key: 'traffic_signage',
    icon: Signpost,
    defaultLabel: 'Traffic & road signs',
    fullLabel: 'Traffic & Road Signs',
    defaultDesc: 'Broken traffic lights, missing or faded regulatory signs, and damaged road markings.',
  },
  {
    id: 'Public Safety & Hazards',
    key: 'public_safety',
    icon: ShieldAlert,
    defaultLabel: 'Public hazards',
    fullLabel: 'Public Safety & Hazards',
    defaultDesc: 'Fallen roadside trees, hazardous debris on roads, landslides, and unstable retaining walls.',
  },
  {
    id: 'Public Buildings & Facilities',
    key: 'public_facilities',
    icon: Building2,
    defaultLabel: 'Public facilities',
    fullLabel: 'Public Buildings & Facilities',
    defaultDesc: 'Damaged barangay halls, public health centers, school building defects, and broken park facilities.',
  },
  {
    id: 'Others',
    key: 'others',
    icon: HelpCircle,
    defaultLabel: 'Other concern',
    fullLabel: 'Other civic infrastructure concern',
    defaultDesc: 'Any municipal or public infrastructure concern not listed above (describe details in step 4).',
  },
];

export default function Step1CategoryEmergency({ selectedCategory, onSelectCategory, onContinue, onBack }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [highlightedCategory, setHighlightedCategory] = useState(null);

  const selectedCatObj = CATEGORIES.find(c => c.id === selectedCategory);

  const openInfoModal = (categoryId = null) => {
    setHighlightedCategory(categoryId || selectedCategory);
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setHighlightedCategory(null);
  };

  // Keyboard accessibility: Close on Escape key & manage body scroll
  useEffect(() => {
    if (!isInfoModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeInfoModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isInfoModalOpen]);

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-4 sm:space-y-5">
        {/* Title (Header "i" icon removed as requested) */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.step1Category.title', 'What would you like to report?')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t('reportWizard.step1Category.subtitle', 'Choose the category that best matches your concern.')}
          </p>
        </div>

        {/* Category Cards: 2-column grid with "i" info icon on each category */}
        <fieldset role="radiogroup" aria-label="Issue category selector" className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
          <legend className="sr-only">Choose an infrastructure category</legend>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const IconComponent = cat.icon;
            const label = cat.defaultLabel;
            const isOther = cat.id === 'Others';

            if (isOther) {
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={label}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`col-span-2 group relative text-left px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    isSelected
                      ? 'border-[#ff6b00] dark:border-[#ff6b00] bg-orange-50/60 dark:bg-orange-950/20 ring-1 sm:ring-2 ring-[#ff6b00]/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent
                      size={20}
                      className={isSelected ? 'text-[#ff6b00]' : 'text-slate-600 dark:text-orange-400/90'}
                    />
                    <span className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors leading-snug">
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInfoModal(cat.id);
                      }}
                      aria-label={`Category information for ${label}`}
                      title={`Category information for ${label}`}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-[#ff6b00] hover:bg-orange-500/10 dark:text-slate-500 dark:hover:text-orange-400 transition-colors cursor-pointer"
                    >
                      <Info size={15} strokeWidth={2.2} />
                    </button>
                    {isSelected && (
                      <Check size={16} className="text-[#ff6b00] stroke-[2.5]" />
                    )}
                  </div>
                </button>
              );
            }

            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={label}
                onClick={() => onSelectCategory(cat.id)}
                className={`group relative text-left p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 flex flex-col justify-between min-h-[96px] sm:min-h-[110px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  isSelected
                    ? 'border-[#ff6b00] dark:border-[#ff6b00] bg-orange-50/60 dark:bg-orange-950/20 ring-1 sm:ring-2 ring-[#ff6b00]/30 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <IconComponent 
                    size={22} 
                    className={isSelected ? 'text-[#ff6b00]' : 'text-slate-700 dark:text-orange-400/90'} 
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInfoModal(cat.id);
                      }}
                      aria-label={`Category information for ${label}`}
                      title={`Category information for ${label}`}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-[#ff6b00] hover:bg-orange-500/10 dark:text-slate-500 dark:hover:text-orange-400 transition-colors cursor-pointer"
                    >
                      <Info size={14} strokeWidth={2.2} />
                    </button>
                    {isSelected && (
                      <Check size={16} className="text-[#ff6b00] stroke-[2.5]" />
                    )}
                  </div>
                </div>
                <span className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors leading-snug mt-2">
                  {label}
                </span>
              </button>
            );
          })}
        </fieldset>

        {/* Dynamic Contextual Helper when a category is selected */}
        {selectedCatObj && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-500/[0.07] dark:bg-orange-500/10 border border-orange-500/20 text-xs text-slate-700 dark:text-slate-300 transition-all">
            <Info size={16} className="text-[#ff6b00] shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-heading font-bold text-slate-900 dark:text-white">
                {selectedCatObj.defaultLabel}:{' '}
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {selectedCatObj.defaultDesc}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pinned Footer (Left back arrow hidden on Step 1) */}
      <WizardCardFooter
        onBack={null}
        canBack={false}
        onContinue={onContinue}
        isContinueDisabled={!selectedCategory}
      />

      {/* ── ISSUE CATEGORIES INFORMATION MODAL / BOTTOM SHEET ───────────── */}
      {isInfoModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-guide-title"
          onClick={closeInfoModal}
        >
          <div 
            className="w-full sm:max-w-md max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideUp sm:animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 text-[#ff6b00] flex items-center justify-center shrink-0">
                  <Info size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 id="category-guide-title" className="font-heading font-bold text-base text-slate-900 dark:text-white">
                    Issue Categories Guide
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    What to report under each civic category
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeInfoModal}
                aria-label="Close guide"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Categories List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-slate-800/80">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;
                const isHighlighted = highlightedCategory === cat.id;

                return (
                  <div 
                    key={cat.id} 
                    className={`pt-3 first:pt-0 rounded-xl p-2.5 transition-colors ${
                      isHighlighted || isSelected 
                        ? 'bg-orange-50/70 dark:bg-orange-950/20 border border-orange-500/30' 
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected 
                          ? 'bg-[#ff6b00] text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        <IconComponent size={17} />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {cat.defaultLabel}
                          </h3>
                          {isSelected && (
                            <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider text-[#ff6b00] bg-orange-100 dark:bg-orange-950/60 px-2 py-0.5 rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {cat.defaultDesc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
              <button
                type="button"
                onClick={closeInfoModal}
                className="w-full py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-heading font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
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
