import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import ResidentThemeToggle from '../ResidentThemeToggle';

export default function WizardHeader({ currentStep, totalSteps = 6 }) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'tl' ? 'en' : 'tl';
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
        {/* Left: Exit Link & Branding */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/resident-home"
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500"
            title={t('landing.nav.home', 'Home')}
            aria-label={t('landing.nav.home', 'Home')}
          >
            <ArrowLeft size={20} />
          </Link>
          <Link
            to="/resident-home"
            className="flex items-center gap-2.5 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-xl group p-0.5"
            aria-label="Caloocan City - City Engineering Department - Powered by PULSO Home"
          >
            {/* Official City Engineering Department Logo */}
            <img
              src="/city-engineering-logo.png"
              alt="Caloocan City Engineering Department Logo"
              className="h-8 w-8 sm:h-10 sm:w-10 aspect-square object-contain shrink-0 group-hover:scale-105 transition-transform duration-200 select-none"
            />

            {/* Mobile Compact Branding (<sm) */}
            <div className="flex sm:hidden flex-col leading-tight">
              <span className="font-bold text-sm text-slate-900 dark:text-white leading-tight">PULSO</span>
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold tracking-wider uppercase">Caloocan City</span>
            </div>

            {/* Desktop Full Branding (>=sm / desktop view) */}
            <div className="hidden sm:flex flex-col text-left shrink-0 leading-tight">
              <span className="font-heading font-black text-[11px] sm:text-xs tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                CALOOCAN CITY
              </span>
              <span className="font-heading font-black text-xs sm:text-sm lg:text-base text-slate-800 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                City Engineering Department
              </span>
              <div className="flex items-center gap-1 text-[9px] sm:text-[11px] font-mono-data text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                <span>powered by:</span>
                <span className="font-heading font-black text-[#ff6b00] uppercase tracking-wider">PULSO</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Guest Badge (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white text-xs font-semibold shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <ShieldCheck size={14} className="text-orange-500 dark:text-orange-400" />
          <span>{t('reportWizard.guestBadge', 'No Sign-In Needed')}</span>
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
