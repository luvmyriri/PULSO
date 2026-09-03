import React from 'react';

/**
 * Branding
 * ─────────────────────────────────────────────────────────────────────────────
 * Official Municipal Brand Lockup:
 * - Single Official City Engineering Department Logo (Enhanced Gear Emblem).
 * - Stacked Municipal Hierarchy:
 *     1. CALOOCAN CITY
 *     2. City Engineering Department
 *     3. powered by: PULSO
 * ─────────────────────────────────────────────────────────────────────────────
 */
const Branding = ({ className = "", size = "h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10", showText = true, vertical = false }) => {
    return (
        <div className={`flex ${vertical ? 'flex-col items-center text-center' : 'items-center'} gap-2.5 sm:gap-3 shrink-0 ${className}`}>
            {/* Official City Engineering Department Logo */}
            <img 
                src="/city-engineering-logo.png" 
                alt="City Engineering Department Logo" 
                className={`${size} aspect-square object-contain drop-shadow-sm rounded-full bg-white border border-slate-200 dark:border-slate-700 shrink-0 hover:scale-105 transition-transform duration-200`}
            />
            {showText && (
                <div className={`flex flex-col text-left leading-tight ${vertical ? 'mt-2 items-center text-center' : ''} shrink-0`}>
                    <span className="font-heading font-black text-slate-900 dark:text-white tracking-tight text-[11px] sm:text-xs uppercase leading-none">
                        Caloocan City
                    </span>
                    <span className="font-heading font-black text-slate-800 dark:text-slate-100 tracking-tight text-xs sm:text-sm lg:text-base leading-tight mt-0.5">
                        <span className="xs:hidden">City Engineering Dept</span>
                        <span className="hidden xs:inline">City Engineering Department</span>
                    </span>
                    <div className="flex items-center gap-1 text-[9px] sm:text-[11px] font-mono-data text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                        <span>powered by:</span>
                        <span className="font-heading font-black text-[#ff6b00] uppercase tracking-wider">PULSO</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branding;
