import React, { useState } from 'react';
import { AlertTriangle, Search, Map, PhoneCall, ChevronRight, ArrowRight } from '../../icons';

/**
 * QuickActionsSection
 * ─────────────────────────────────────────────────────────────────────────────
 * 4 large, high-utility cards for top citizen tasks.
 * Optimized for mobile-first thumb taps with large touch targets.
 * Stacks vertically on mobile.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function QuickActionsSection({ onOpenTrackModal }) {
  const [quickTicket, setQuickTicket] = useState('');

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleQuickLookup = (e) => {
    e.preventDefault();
    if (onOpenTrackModal) {
      onOpenTrackModal(quickTicket);
    }
  };

  return (
    <section
      id="quick-actions"
      aria-label="Citizen Quick Actions"
      className="py-10 sm:py-14 bg-[#fffbf9] dark:bg-[#070a12] border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-left max-w-2xl mb-6 sm:mb-8">
          <span className="text-xs font-mono-data font-bold uppercase tracking-wider text-[#ff6b00]">
            Primary Citizen Actions
          </span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white mt-1">
            Choose your action
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Select an option below for immediate processing by the City Engineering Department.
          </p>
        </div>

        {/* 4 Cards Grid - Mobile vertical stack */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Report an Issue (Primary Action) */}
          <a
            href="/report"
            className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all text-left min-h-[170px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-[#ff6b00] flex items-center justify-center transition-transform group-hover:scale-105">
                  <AlertTriangle size={24} />
                </div>
                <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#ff6b00] border border-orange-200 dark:border-orange-800/60">
                  No Login Req.
                </span>
              </div>

              <h3 className="font-heading font-extrabold text-lg text-slate-900 dark:text-white transition-colors">
                Report an Issue
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-normal">
                Potholes, broken streetlights, water leaks, or drainage blocks.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-[#ff6b00]">
              <span>Start Report</span>
              <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Card 2: Track My Report */}
          <div
            className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all text-left min-h-[170px]"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-transform group-hover:scale-105">
                  <Search size={24} />
                </div>
                <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  Instant Status
                </span>
              </div>

              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white transition-colors">
                Track My Report
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                Check crew dispatch progress with your ticket reference ID.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onOpenTrackModal && onOpenTrackModal()}
                className="w-full py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Enter Ticket Code</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Card 3: View Utility Map */}
          <button
            type="button"
            onClick={() => scrollToSection('map-preview')}
            className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all text-left min-h-[170px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-105">
                  <Map size={24} />
                </div>
                <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  188 Barangays
                </span>
              </div>

              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white transition-colors">
                View Utility Map
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                Explore nearby road repairs and utility work in your area.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Inspect Map</span>
              <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 4: Emergency Hotlines */}
          <button
            type="button"
            onClick={() => scrollToSection('hotlines')}
            className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all text-left min-h-[170px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center transition-transform group-hover:scale-105">
                  <PhoneCall size={24} />
                </div>
                <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                  24/7 Hotlines
                </span>
              </div>

              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white transition-colors">
                Emergency Hotlines
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                Direct lines to Caloocan Rescue, Maynilad, and Meralco.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-red-600 dark:text-red-400">
              <span>View Directory</span>
              <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

      </div>
    </section>
  );
}
