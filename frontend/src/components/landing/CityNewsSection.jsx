import React from 'react';
import CityNewsWidget from './CityNewsWidget';

/**
 * CityNewsSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated City News & Advisories Section:
 * - Positioned below the Hero action zone so it does not compete on first load.
 * - Displays official Caloocan City advisories, events, and infrastructure bulletins.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function CityNewsSection() {
  return (
    <section
      id="city-news"
      aria-label="Caloocan City News & Advisories"
      className="py-12 sm:py-16 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-left max-w-2xl mb-6 sm:mb-8">
          <span className="text-xs font-mono-data font-bold uppercase tracking-wider text-[#ff6b00]">
            City Updates
          </span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white mt-1">
            News &amp; Public Advisories
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time public works notices, emergency service interruptions, and city hall announcements.
          </p>
        </div>

        {/* City News Feed Widget */}
        <div className="flex justify-center sm:justify-start w-full">
          <div className="w-full max-w-xl">
            <CityNewsWidget />
          </div>
        </div>
      </div>
    </section>
  );
}
