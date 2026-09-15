import React, { useState } from 'react';
import { ArrowRight, Search, Smartphone, QrCode } from 'lucide-react';
import CityNewsWidget from './CityNewsWidget';
import PwaModal from './PwaModal';

/**
 * HeroSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsive Civic Hero Section with Official Caloocan City Background Watermark:
 * - One clear sentence stating purpose.
 * - Primary CTA + Track Report actions.
 * - Mobile App PWA Banner with scannable QR Code.
 * - Authoritative Caloocan City municipal seal background watermark.
 * - Mobile-first layout with smooth stacking.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function HeroSection({ onOpenTrackModal }) {
  const [pwaModalOpen, setPwaModalOpen] = useState(false);

  return (
    <section
      id="report-section"
      aria-label="Civic Reporting Hero"
      className="relative min-h-[calc(100vh-6.25rem)] sm:min-h-[calc(100dvh-6.25rem)] py-8 sm:py-12 lg:py-14 flex items-center bg-gradient-to-b from-white via-[#fffbf9] to-[#fff7f0]/40 dark:from-[#070a12] dark:via-[#090e1a] dark:to-[#070a12] border-b border-slate-200 dark:border-slate-800 transition-colors overflow-hidden"
    >
      {/* Official Caloocan City Municipal Seal Background Watermark - Positioned to frame advisories cleanly below the navbar menu */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 flex items-center justify-center lg:justify-end"
        aria-hidden="true"
      >
        <div className="relative w-[340px] h-[340px] xs:w-[400px] xs:h-[400px] sm:w-[490px] sm:h-[490px] lg:w-[590px] lg:h-[590px] xl:w-[620px] xl:h-[620px] lg:mr-[1.5%] opacity-[0.18] sm:opacity-[0.20] dark:opacity-[0.14] transition-all duration-500 translate-y-1.5 sm:translate-y-2 lg:translate-y-2.5 my-auto">
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Core Civic Purpose & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left w-full">
            
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

            {/* Primary Action Button Area - Normal compact sizes */}
            <div className="w-full max-w-[395px]">
              <div className="flex flex-row flex-wrap items-center gap-2.5 mb-3.5">
                <a
                  href="/report"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-heading font-bold text-xs sm:text-sm tracking-wide transition-all shadow-xs hover:shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff6b00]"
                >
                  <span>Report an Issue Now</span>
                  <ArrowRight size={15} />
                </a>

                <button
                  type="button"
                  onClick={onOpenTrackModal}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 transition-all shadow-2xs hover:border-[#ff6b00]/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                >
                  <Search size={14} className="text-slate-500 dark:text-slate-400" />
                  <span>Track My Report</span>
                </button>
              </div>

              {/* Mobile App PWA Banner with QR Code Trigger - Normal size, even with buttons above */}
              <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-orange-200/90 dark:border-orange-900/50 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-100 dark:bg-orange-950/70 text-[#ff6b00] flex items-center justify-center shrink-0 shadow-2xs">
                    <QrCode size={16} className="text-[#ff6b00]" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-xs font-heading font-black text-slate-900 dark:text-white block leading-tight">
                      Install PULSO Mobile App
                    </span>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-600 dark:text-slate-400 leading-tight mt-0.5 truncate">
                      Scan QR code with camera to install.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPwaModalOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6b00] hover:bg-[#e65c00] active:scale-95 text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff6b00]"
                >
                  <Smartphone size={13} />
                  <span>Install app</span>
                </button>
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

      {/* Progressive Web App QR Code Modal */}
      <PwaModal isOpen={pwaModalOpen} onClose={() => setPwaModalOpen(false)} />
    </section>
  );
}
