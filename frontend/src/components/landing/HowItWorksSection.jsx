import { Link } from 'react-router-dom';
import React from 'react';
import { SquarePen, MapPin, ClipboardCheck, ArrowRight, ShieldCheck, Search } from 'lucide-react';

/**
 * HowItWorksSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal Civic Aperture process section:
 * - Clear, punchy header without clutter
 * - 3 streamlined, compact step cards without bloated tags or redundant dividers
 * - Integrated icon + step counter for instant scannability
 * - Responsive: compact single-viewport stack on mobile, 3-column grid on desktop
 * - Bottom quick-action bar for direct reporting or tracking
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function HowItWorksSection({ onOpenTrackModal }) {
  const steps = [
    {
      num: '01',
      badge: 'Step 1',
      title: 'Describe the Issue',
      desc: "Tell us what's wrong—potholes, dark streetlights, water leaks, or clogged drainage in plain English or Filipino.",
      icon: SquarePen,
      accentBg: 'bg-orange-500/10 dark:bg-orange-500/20 text-[#ff6b00] border border-orange-500/20',
    },
    {
      num: '02',
      badge: 'Step 2',
      title: 'Add Location & Photo',
      desc: 'Pin the exact location on the Caloocan map and attach a photo so engineering crews can prepare equipment.',
      icon: MapPin,
      accentBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-[#0284c7] dark:text-sky-400 border border-sky-500/20',
    },
    {
      num: '03',
      badge: 'Step 3',
      title: 'Track Your Report',
      desc: 'Receive your municipal tracking ID immediately to monitor dispatch status, assigned crews, and verified repairs.',
      icon: ClipboardCheck,
      accentBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    }
  ];

  return (
    <section
      id="how-it-works"
      aria-label="How PULSO Works"
      className="scroll-mt-16 sm:scroll-mt-20 py-8 sm:py-14 lg:py-18 bg-slate-50/60 dark:bg-[#070a12]/60 border-b border-slate-200 dark:border-slate-800 transition-colors flex flex-col justify-center"
    >
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
        
        {/* Section Header */}
        <div className="max-w-3xl text-left">
          <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-[38px] text-[#0f2347] dark:text-white tracking-tight leading-tight">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed font-normal">
            Reporting an infrastructure or road hazard is simple, transparent, and direct. Every citizen report is logged in the official Caloocan municipal docket.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 lg:gap-6 mt-6 sm:mt-10 relative">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative z-10 flex flex-col justify-between p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-2xs hover:shadow-md hover:border-[#ff6b00]/50 dark:hover:border-[#ff6b00]/40 transition-all duration-200 group text-left"
              >
                <div>
                  {/* Top Bar: Icon + Step Badge & Monospace Number */}
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${step.accentBg} transition-transform duration-200 group-hover:scale-105 shrink-0`}>
                        <Icon size={19} strokeWidth={2.2} />
                      </div>
                      <span className="font-mono-data text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {step.badge}
                      </span>
                    </div>
                    <span className="font-mono-data text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {step.num}
                    </span>
                  </div>

                  {/* Step Title */}
                  <h3 className="font-heading font-bold text-base sm:text-lg text-[#0f2347] dark:text-white group-hover:text-[#ff6b00] transition-colors leading-snug">
                    {step.title}
                  </h3>

                  {/* Step Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mt-1.5">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Quick-Action Banner */}
        <div className="mt-5 sm:mt-8 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="text-left">
              <p className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                Ready to file a community report?
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                No app installation required. Accessible 24/7 for Caloocan residents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              to="/report"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-heading font-bold text-xs shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Report an Issue</span>
              <ArrowRight size={14} />
            </Link>

            {onOpenTrackModal && (
              <button
                type="button"
                onClick={onOpenTrackModal}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-heading font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Search size={14} />
                <span>Track Report</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
