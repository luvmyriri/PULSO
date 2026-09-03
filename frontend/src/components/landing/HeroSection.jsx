import React from 'react';
import { ArrowRight, Search, ShieldCheck, Wrench, Droplets, Zap, Route as RoadIcon } from 'lucide-react';
import CityNewsWidget from './CityNewsWidget';

/**
 * HeroSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsive Civic Hero Section with Official Caloocan City Background Watermark:
 * - One clear sentence stating purpose.
 * - Single primary CTA + rapid hazard shortcut pills.
 * - Authoritative Caloocan City municipal seal background watermark.
 * - Mobile-first layout with smooth stacking.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function HeroSection({ onOpenTrackModal }) {
  const commonHazards = [
    { label: 'Road Potholes', icon: RoadIcon, query: 'road' },
    { label: 'Broken Streetlights', icon: Zap, query: 'streetlight' },
    { label: 'Water Pipe Leaks', icon: Droplets, query: 'water' },
    { label: 'Clogged Drainage', icon: Wrench, query: 'drainage' },
  ];

  return (
    <section
      id="report-section"
      aria-label="Civic Reporting Hero"
      className="relative pt-10 pb-14 sm:pt-14 sm:pb-18 lg:pt-20 lg:pb-24 min-h-[600px] sm:min-h-[660px] lg:min-h-[720px] flex items-center bg-gradient-to-b from-white via-[#fffbf9] to-[#fff7f0]/40 dark:from-[#070a12] dark:via-[#090e1a] dark:to-[#070a12] border-b border-slate-200 dark:border-slate-800 transition-colors overflow-hidden"
    >
      {/* Official Caloocan City Municipal Seal Background Watermark - Expanded size with full vertical clearance and zero clipping/blocking */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 flex items-center justify-center lg:justify-end"
        aria-hidden="true"
      >
        <div className="relative w-[340px] h-[340px] xs:w-[400px] xs:h-[400px] sm:w-[490px] sm:h-[490px] lg:w-[590px] lg:h-[590px] xl:w-[620px] xl:h-[620px] lg:mr-[1.5%] opacity-[0.18] sm:opacity-[0.20] dark:opacity-[0.14] transition-all duration-500 my-auto">
          {/* Subtle concentric municipal rings */}
          <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 dark:border-white/20 animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute inset-[-12px] sm:inset-[-16px] rounded-full border border-dashed border-[#ff6b00]/40 dark:border-[#ff6b00]/30" />
          <div className="absolute inset-[-24px] sm:inset-[-30px] rounded-full border border-slate-400/25 dark:border-white/10" />

          {/* Caloocan Official Seal with authentic colors */}
          <img
            src="/engineering-logo.jpg"
            alt="Official Caloocan City Seal Watermark"
            className="w-full h-full object-contain rounded-full drop-shadow-sm dark:brightness-105"
            loading="eager"
          />

          {/* Soft edge feathering */}
          <div className="absolute inset-0 rounded-full bg-radial from-transparent via-transparent to-white/40 dark:to-[#070a12]/50 pointer-events-none" />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Core Civic Purpose & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left w-full">
            
            {/* Municipal Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] border border-orange-200 dark:border-orange-800/60 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-3.5 sm:mb-4">
              <ShieldCheck size={14} className="text-[#ff6b00] shrink-0" />
              <span>City of Caloocan • Citizen Utility Desk</span>
            </div>

            {/* Responsive Heading */}
            <h1 className="font-heading font-black text-2xl sm:text-4xl md:text-5xl lg:text-[44px] tracking-tight text-slate-900 dark:text-white leading-[1.15] sm:leading-[1.12] mb-3.5 sm:mb-4">
              Report utility hazards &amp; road damage{' '}
              <span className="text-[#ff6b00]">
                directly to City Engineering.
              </span>
            </h1>

            {/* Plain-language explanation */}
            <p className="text-sm sm:text-base lg:text-lg text-slate-700 dark:text-slate-300 font-normal leading-relaxed mb-5 sm:mb-6 max-w-2xl">
              PULSO is Caloocan City&apos;s direct service portal for residents to report broken streetlights, water pipe leaks, road potholes, and clogged drainage to city maintenance crews for fast repair.
            </p>

            {/* Primary Action Button Area - Full width on mobile */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5 sm:mb-6">
              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-heading font-bold text-sm sm:text-base tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 min-h-[48px] sm:min-h-[50px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff6b00]"
              >
                <span>Report an Issue Now</span>
                <ArrowRight size={17} />
              </a>

              <button
                type="button"
                onClick={onOpenTrackModal}
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 transition-all shadow-xs hover:border-[#ff6b00]/50 min-h-[48px] sm:min-h-[50px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
              >
                <Search size={15} className="text-slate-500 dark:text-slate-400" />
                <span>Track My Report</span>
              </button>
            </div>

            {/* Quick 1-Tap Hazard Category Shortcuts */}
            <div className="w-full">
              <span className="text-[10px] sm:text-[11px] font-mono-data font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Fast Report Shortcuts (Tap an Issue):
              </span>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {commonHazards.map((hz, idx) => {
                  const Icon = hz.icon;
                  return (
                    <a
                      key={idx}
                      href={`/register?type=${hz.query}`}
                      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 hover:bg-orange-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all shadow-2xs hover:border-[#ff6b00]/40"
                    >
                      <Icon size={13} className="text-[#ff6b00] shrink-0" />
                      <span>{hz.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Caloocan City News Feed Widget */}
          <div className="lg:col-span-5 flex flex-col items-center w-full">
            <div className="w-full max-w-lg">
              {/* City News Widget */}
              <CityNewsWidget />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
