import React from 'react';
import { Camera, Truck, CheckCircle2, ArrowRight, MapPin, HardHat, Bell } from '../../icons';

/**
 * HowItWorksSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional 3-step visual guide (Report → Track → Resolved) for Caloocan
 * residents. Plain language, generous spacing, and realistic visual mockups.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Snap & Geotag',
      tagline: 'Takes less than 60 seconds',
      description: 'Take a photo of the damaged road, leaking pipe, or broken streetlight. Your exact barangay and street coordinates are detected automatically.',
      mockup: {
        title: 'Auto-Detected Location',
        icon: MapPin,
        detail: 'Camarin Rd, Brgy. 174 • 14.752° N',
        badge: 'Photo Attached',
        badgeColor: 'bg-orange-100 text-[#ff6b00] dark:bg-orange-950/60 dark:text-orange-400'
      },
      icon: Camera,
      accent: 'border-orange-500/80 text-[#ff6b00]'
    },
    {
      step: '02',
      title: 'Engineering Dispatch',
      tagline: 'Under 2-hour triage',
      description: 'City Engineering reviews your ticket, confirms the urgency, and routes an authorized road, water, or electrical repair crew to the location.',
      mockup: {
        title: 'Work Order Assigned',
        icon: HardHat,
        detail: 'City Electrical Maintenance Crew #3',
        badge: 'Dispatched',
        badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
      },
      icon: Truck,
      accent: 'border-blue-500/80 text-blue-500'
    },
    {
      step: '03',
      title: 'Verified Resolution',
      tagline: 'Before & after proof',
      description: 'Once repairs are completed, city workers upload photo verification. You receive an SMS alert and the public ticket is marked resolved.',
      mockup: {
        title: 'Inspection Sign-Off',
        icon: Bell,
        detail: 'Repairs Completed • Verified OK',
        badge: 'Resolved',
        badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
      },
      icon: CheckCircle2,
      accent: 'border-emerald-500/80 text-emerald-500'
    }
  ];

  return (
    <section
      id="how-it-works"
      aria-label="How PULSO Works"
      className="py-14 sm:py-20 bg-[#fffbf9] dark:bg-[#070a12] border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-mono-data font-bold uppercase tracking-wider text-[#ff6b00]">
            Simple Citizen Workflow
          </span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl md:text-4xl text-slate-900 dark:text-white mt-1">
            How PULSO works for residents
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            A transparent 3-step process connecting your neighborhood directly to the City Engineering Department.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
          {steps.map((item) => {
            const Icon = item.icon;
            const MockupIcon = item.mockup.icon;

            return (
              <div
                key={item.step}
                className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono-data font-black text-2xl sm:text-3xl text-slate-300 dark:text-slate-700">
                      {item.step}
                    </span>
                    <div className={`w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border ${item.accent}`}>
                      <Icon size={22} />
                    </div>
                  </div>

                  <span className="text-[11px] font-mono-data font-semibold text-[#ff6b00] uppercase tracking-wider block mb-1">
                    {item.tagline}
                  </span>
                  <h3 className="font-heading font-extrabold text-xl text-slate-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-normal">
                    {item.description}
                  </p>
                </div>

                {/* Visual Step Proof Mockup */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <MockupIcon size={14} className="text-[#ff6b00]" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {item.mockup.title}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono-data font-bold px-2 py-0.5 rounded ${item.mockup.badgeColor}`}>
                      {item.mockup.badge}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono-data text-slate-500 dark:text-slate-400">
                    {item.mockup.detail}
                  </p>
                </div>

              </div>
            );
          })}
        </div>

        {/* Bottom Call to Action */}
        <div className="mt-12 text-center">
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white text-xs font-bold font-heading tracking-wide transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <span>Start an Incident Report</span>
            <ArrowRight size={16} />
          </a>
        </div>

      </div>
    </section>
  );
}
