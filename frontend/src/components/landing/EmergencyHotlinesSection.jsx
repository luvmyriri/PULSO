import React from 'react';
import { PhoneCall, ShieldAlert, Wrench, Droplets, Zap, AlertCircle } from '../../icons';

/**
 * EmergencyHotlinesSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative 24/7 municipal emergency callboard for urgent life-safety
 * and utility infrastructure disruptions across Caloocan City.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function EmergencyHotlinesSection() {
  const hotlines = [
    {
      id: 'rescue',
      title: 'Caloocan Rescue & Command Center',
      number: '(02) 8888-2256',
      tel: '0288882256',
      badge: '24/7 Priority',
      desc: 'Citywide emergency dispatch, ambulance, flood rescue, and disaster command.',
      icon: ShieldAlert,
      color: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
    },
    {
      id: 'engineering',
      title: 'City Engineering Maintenance Desk',
      number: '(02) 8362-0220',
      tel: '0283620220',
      badge: 'Public Works',
      desc: 'Local road collapses, hazardous manholes, and public infrastructure repairs.',
      icon: Wrench,
      color: 'bg-orange-500/10 text-[#ff6b00] dark:bg-orange-500/20'
    },
    {
      id: 'maynilad',
      title: 'Maynilad Water Emergency Hotline',
      number: '1626',
      tel: '1626',
      badge: 'Water Supply',
      desc: 'Burst distribution mains, sudden pressure drops, and sewage overflows.',
      icon: Droplets,
      color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
    },
    {
      id: 'meralco',
      title: 'Meralco Power Outages Desk',
      number: '16211',
      tel: '16211',
      badge: 'Power & Lights',
      desc: 'Downed power cables, sparking transformers, and widespread blackouts.',
      icon: Zap,
      color: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
    }
  ];

  return (
    <section
      id="hotlines"
      aria-label="Direct Municipal & Utility Hotlines"
      className="py-14 sm:py-20 bg-white dark:bg-[#070a12] border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-left max-w-2xl mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono-data font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">
            <PhoneCall size={14} />
            <span>24/7 Official Emergency Lines</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Emergency &amp; utility hotlines
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            For life-threatening hazards or sudden utility failures requiring immediate intervention, contact official dispatch desks directly.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {hotlines.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={`tel:${item.tel}`}
                className="group p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-red-400/60 dark:hover:border-red-500/60 transition-all flex flex-col justify-between shadow-xs hover:shadow-md text-left"
                aria-label={`Call ${item.title} at ${item.number}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-mono-data font-bold text-base text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">
                    {item.number}
                  </span>
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
                    <span>Call</span>
                    <PhoneCall size={13} />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Notice Strip */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 text-left">
          <AlertCircle size={16} className="text-[#ff6b00] shrink-0" />
          <span>
            For national police and public safety emergencies, you may also dial <strong>911</strong> or contact the Caloocan Police Headquarters at <strong>(02) 8288-7243</strong>.
          </span>
        </div>

      </div>
    </section>
  );
}
