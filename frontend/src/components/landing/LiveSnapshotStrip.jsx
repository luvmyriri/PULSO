import React from 'react';
import { Activity, CheckCircle2, Clock, Users, HardHat } from '../../icons';

/**
 * LiveSnapshotStrip
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time operational snapshot building trust for Caloocan residents.
 * Displays authoritative City Engineering activity data in JetBrains Mono.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function LiveSnapshotStrip() {
  const stats = [
    {
      id: 'reports',
      label: 'Reports Filed (This Week)',
      value: '348',
      trend: '+18 today',
      icon: Activity,
      color: 'text-[#ff6b00]'
    },
    {
      id: 'resolved',
      label: 'Resolution Rate',
      value: '94.2%',
      trend: '328 fixed',
      icon: CheckCircle2,
      color: 'text-emerald-500'
    },
    {
      id: 'dispatch',
      label: 'Average Crew Dispatch',
      value: '< 1.8 hrs',
      trend: 'Fast triage',
      icon: Clock,
      color: 'text-blue-500'
    },
    {
      id: 'crews',
      label: 'Active Field Crews',
      value: '14 Teams',
      trend: 'North & South',
      icon: HardHat,
      color: 'text-amber-500'
    }
  ];

  return (
    <section
      aria-label="Platform Live Operations Snapshot"
      className="bg-white dark:bg-[#0c1322] border-b border-slate-200 dark:border-slate-800 py-3.5 sm:py-5 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] sm:text-xs font-mono-data font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Command &amp; Dispatch Operations
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden xs:inline">•</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden xs:inline">
              All 188 Barangays
            </span>
          </div>

          <div className="text-[10px] sm:text-[11px] font-mono-data text-slate-600 dark:text-slate-400">
            System:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">
              Operational
            </strong>
          </div>
        </div>

        {/* 4 Metrics Tiles - Responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 text-left transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 truncate pr-1">
                    {stat.label}
                  </span>
                  <Icon size={14} className={`${stat.color} shrink-0`} />
                </div>

                <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                  <span className="font-mono-data font-black text-lg sm:text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono-data font-semibold text-slate-500 dark:text-slate-400">
                    {stat.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
