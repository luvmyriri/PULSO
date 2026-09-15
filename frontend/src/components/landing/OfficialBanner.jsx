import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/**
 * OfficialBanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Philippine Government Header (GOVPH standard) featuring
 * full light/dark theme parity, Republic of the Philippines seal affiliation,
 * and a live Philippine Standard Time (PST) synchronization clock.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function OfficialBanner() {
  const [pstTime, setPstTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format to Philippine Standard Time (UTC+8)
      const options = {
        timeZone: 'Asia/Manila',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      try {
        const formatter = new Intl.DateTimeFormat('en-PH', options);
        setPstTime(formatter.format(now));
      } catch {
        setPstTime(now.toLocaleString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      role="region"
      aria-label="Philippine Government Official Header"
      className="w-full bg-slate-100 dark:bg-[#050811] text-slate-700 dark:text-slate-300 text-[10px] sm:text-xs border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        
        {/* Left: Official Government Affiliation */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Republic of the Philippines
          </span>

          <span className="hidden sm:inline text-slate-400 dark:text-slate-600" aria-hidden="true">•</span>

          <span className="hidden sm:inline text-slate-700 dark:text-slate-300">
            City Government of Caloocan
          </span>

          <span className="hidden lg:inline text-slate-400 dark:text-slate-600" aria-hidden="true">•</span>

          <span className="hidden lg:inline text-slate-500 dark:text-slate-400">
            City Engineering Department
          </span>
        </div>

        {/* Right: Live Philippine Standard Time (PST) Clock */}
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono-data ml-auto sm:ml-0">
          <Clock size={11} className="text-[#ff6b00] shrink-0" aria-hidden="true" />
          <span className="text-slate-500 dark:text-slate-500 hidden sm:inline">PST:</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold tracking-tight">
            {pstTime || 'Loading PST...'}
          </span>
        </div>

      </div>
    </div>
  );
}
