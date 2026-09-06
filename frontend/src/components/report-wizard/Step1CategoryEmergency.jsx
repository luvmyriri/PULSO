import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, PhoneCall, Route, Droplets, Lightbulb, 
  Building2, ShieldAlert, ArrowRight, CheckCircle2, Signpost
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'Roads & Bridges',
    key: 'roads_bridges',
    icon: Route,
    iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50',
    defaultLabel: 'Roads & Bridges',
    defaultDesc: 'Potholes, broken asphalt, damaged bridges, sidewalk cracks',
  },
  {
    id: 'Water & Drainage',
    key: 'drainage_flooding',
    icon: Droplets,
    iconColor: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50',
    defaultLabel: 'Water & Drainage',
    defaultDesc: 'Clogged storm drains, missing manholes, localized flooding, broken pipes',
  },
  {
    id: 'Street Lighting & Power',
    key: 'streetlights_electrical',
    icon: Lightbulb,
    iconColor: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950/50',
    defaultLabel: 'Street Lighting & Power',
    defaultDesc: 'Dark lampposts, flickering fixtures, dangling low-voltage lines, damaged poles',
  },
  {
    id: 'Public Facilities & Buildings',
    key: 'public_facilities',
    icon: Building2,
    iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50',
    defaultLabel: 'Public Facilities & Buildings',
    defaultDesc: 'Damaged health centers, public school defects, broken playground gear',
  },
  {
    id: 'Public Safety & Hazards',
    key: 'public_safety',
    icon: ShieldAlert,
    iconColor: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/50',
    defaultLabel: 'Public Safety & Hazards',
    defaultDesc: 'Fallen roadside trees, hazardous debris, unstable retaining walls',
  },
  {
    id: 'Traffic & Road Signs',
    key: 'traffic_signage',
    icon: Signpost,
    iconColor: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/50',
    defaultLabel: 'Traffic & Road Signs',
    defaultDesc: 'Broken traffic signals, missing regulatory signage, damaged center railings',
  },
];

export default function Step1CategoryEmergency({ selectedCategory, onSelectCategory, onContinue }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* ── EMERGENCY WARNING BANNER ────────────────────────────────────────── */}
      <aside 
        aria-label="Emergency Hotline Notice"
        className="rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 sm:p-5 shadow-sm"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-amber-200/70 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 shrink-0 mt-0.5">
            <AlertTriangle size={22} strokeWidth={2.2} />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="font-bold text-base sm:text-lg text-amber-950 dark:text-amber-200 leading-tight">
              {t('reportWizard.emergencyBanner.title', 'Is this an immediate life-threatening emergency?')}
            </h2>
            <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
              {t('reportWizard.emergencyBanner.body', 'For active fires, severe medical crises, active crimes, or live fallen power lines during floods, call emergency hotlines directly. PULSO is for municipal infrastructure repair and engineering triage.')}
            </p>
            {/* Direct Dial Hotlines */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="tel:911"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-red-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                <PhoneCall size={14} />
                <span>{t('reportWizard.emergencyBanner.call911', 'Call 911 (National Emergency)')}</span>
              </a>
              <a
                href="tel:8881234"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                <PhoneCall size={14} />
                <span>{t('reportWizard.emergencyBanner.callCDRRMO', 'Call 888-1234 (Caloocan CDRRMO)')}</span>
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* ── SECTION HEADING ──────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          {t('reportWizard.step1Category.title', 'Select Issue Category')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('reportWizard.step1Category.subtitle', 'What kind of public infrastructure requires repair or inspection?')}
        </p>
      </div>

      {/* ── CATEGORY GRID ────────────────────────────────────────────────────── */}
      <fieldset role="radiogroup" aria-label="Issue category selector" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <legend className="sr-only">Choose an infrastructure category</legend>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const IconComponent = cat.icon;
          const label = t(`reportWizard.step1Category.categories.${cat.key}.label`, cat.defaultLabel);
          const desc = t(`reportWizard.step1Category.categories.${cat.key}.desc`, cat.defaultDesc);

          return (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectCategory(cat.id)}
              aria-pressed={isSelected}
              className={`group relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between min-h-[140px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isSelected
                  ? 'border-orange-500 dark:border-orange-400 bg-orange-50/70 dark:bg-orange-950/30 shadow-md ring-2 ring-orange-400/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.iconColor}`}>
                    <IconComponent size={22} strokeWidth={2} />
                  </div>
                  {isSelected && (
                    <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1 text-xs font-bold">
                      <CheckCircle2 size={18} className="fill-orange-500 text-white dark:text-slate-900" />
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {label}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {desc}
                </p>
              </div>
            </button>
          );
        })}
      </fieldset>

      {/* ── ACTION FOOTER ────────────────────────────────────────────────────── */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedCategory}
          className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            selectedCategory
              ? 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          }`}
        >
          <span>{t('reportWizard.nav.next', 'Continue')}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
