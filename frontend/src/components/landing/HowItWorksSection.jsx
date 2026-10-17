import React from 'react';
import { SquarePen, MapPin, ClipboardCheck, ArrowRight, ShieldCheck, CheckCircle2, Search } from 'lucide-react';

/**
 * HowItWorksSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Upgraded Civic Aperture process section:
 * - Authoritative header with civic kicker and clear description
 * - 3 interconnected cards with step indicators, custom icons, rich details,
 *   feature badges, and interactive hover elevation
 * - Connected progress line visual
 * - Bottom quick-action bar for direct reporting or tracking
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function HowItWorksSection({ onOpenTrackModal }) {
  const steps = [
    {
      num: '01',
      badge: 'Step 1',
      title: 'Describe the Issue',
      desc: "Tell us what's wrong—potholes, dark streetlights, water leaks, or clogged drainage. Describe the hazard in plain English or Filipino.",
      icon: SquarePen,
      color: 'orange',
      accentBg: 'bg-orange-500/10 dark:bg-orange-500/20 backdrop-blur-md text-[#ff6b00] border border-orange-500/30 dark:border-orange-500/40 shadow-xs',
      badgeBg: 'bg-slate-100/90 dark:bg-slate-800/90 text-black dark:text-white border-slate-300 dark:border-slate-700 shadow-2xs',
      tags: ['Roads & Potholes', 'Lights & Utilities', 'Fast AI Triage']
    },
    {
      num: '02',
      badge: 'Step 2',
      title: 'Add Location & Photo',
      desc: 'Pin the exact location on the interactive Caloocan map and attach a photo so City Engineering crews can prepare equipment beforehand.',
      icon: MapPin,
      color: 'sky',
      accentBg: 'bg-sky-500/10 dark:bg-sky-500/20 backdrop-blur-md text-[#0284c7] dark:text-sky-400 border border-sky-500/30 dark:border-sky-500/40 shadow-xs',
      badgeBg: 'bg-slate-100/90 dark:bg-slate-800/90 text-black dark:text-white border-slate-300 dark:border-slate-700 shadow-2xs',
      tags: ['GPS Map Pin', 'Barangay Tagging', 'Photo Evidence']
    },
    {
      num: '03',
      badge: 'Step 3',
      title: 'Get Your Reference Number',
      desc: 'Receive your unique municipal tracking ID immediately. Track dispatch status, assigned engineers, and final photo verification.',
      icon: ClipboardCheck,
      color: 'emerald',
      accentBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 backdrop-blur-md text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/40 shadow-xs',
      badgeBg: 'bg-slate-100/90 dark:bg-slate-800/90 text-black dark:text-white border-slate-300 dark:border-slate-700 shadow-2xs',
      tags: ['Instant Ticket ID', 'Live Status Tracking', 'Resolved Proof']
    }
  ];

  return (
    <section
      id="how-it-works"
      aria-label="How PULSO Works"
      className="min-h-[calc(100vh-73px)] py-12 sm:py-16 lg:py-20 bg-slate-50/60 dark:bg-[#070a12]/60 border-b border-slate-200 dark:border-slate-800 transition-colors flex flex-col justify-center"
    >
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
        
        {/* Section Header */}
        <div className="max-w-3xl text-left">
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-[40px] text-[#0f2347] dark:text-white tracking-tight leading-tight">
            How It Works
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed font-normal">
            Reporting an infrastructure or road hazard is simple, transparent, and direct. Every citizen report is logged in the official Caloocan municipal docket.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-10 sm:mt-12 relative">
          

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative z-10 flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-[#ff6b00]/60 dark:hover:border-[#ff6b00]/50 transition-all duration-300 group text-left"
              >
                <div>
                  {/* Top Bar: Badge & Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <span className={`font-mono-data text-xs font-bold px-3 py-1 rounded-lg border ${step.badgeBg}`}>
                      {step.badge}
                    </span>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${step.accentBg} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon size={24} strokeWidth={2} />
                    </div>
                  </div>

                  {/* Step Title */}
                  <h3 className="font-heading font-bold text-lg sm:text-xl text-[#0f2347] dark:text-white group-hover:text-[#ff6b00] transition-colors leading-snug mb-2.5">
                    {step.title}
                  </h3>

                  {/* Step Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>

                {/* Bottom Tags / Micro-features */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5">
                  {step.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Quick-Action Banner */}
        <div className="mt-8 sm:mt-10 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div className="text-left">
              <p className="font-heading font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Ready to file a community report?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                No app installation required. Free and accessible to all Caloocan residents 24/7.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <a
              href="/report"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-heading font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Report an Issue</span>
              <ArrowRight size={15} />
            </a>

            {onOpenTrackModal && (
              <button
                type="button"
                onClick={onOpenTrackModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-heading font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Search size={15} />
                <span>Track Report</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
