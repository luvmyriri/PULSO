import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import ResidentBranding from '../ResidentBranding';
import ResidentThemeToggle from '../ResidentThemeToggle';

export default function WizardHeader({ currentStep, totalSteps = 6 }) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'tl' ? 'en' : 'tl';
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Exit Link & Branding */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/"
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500"
            title={t('landing.nav.home', 'Home')}
            aria-label={t('landing.nav.home', 'Home')}
          >
            <ArrowLeft size={20} />
          </Link>
          <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded-lg group">
            <ResidentBranding size="h-8" showText={false} />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-900 dark:text-white leading-tight">PULSO</span>
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold tracking-wider uppercase">Caloocan City</span>
            </div>
          </Link>
        </div>

        {/* Center: Guest Badge / Step count */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white text-xs font-semibold shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <ShieldCheck size={14} className="text-orange-500 dark:text-orange-400" />
            <span>{t('reportWizard.guestBadge', 'No Sign-In Needed')}</span>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
            {t('reportWizard.stepCounter', 'Step {{current}} of {{total}}', { current: currentStep, total: totalSteps })}
          </span>
        </div>

        {/* Right: Language & Theme Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500"
            aria-label="Toggle language between English and Tagalog"
          >
            {i18n.language === 'tl' ? 'EN' : 'TL'}
          </button>
          <ResidentThemeToggle size={14} />
        </div>
      </div>
    </header>
  );
}
