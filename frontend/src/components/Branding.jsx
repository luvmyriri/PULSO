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
const Branding = ({ className = "", size = "h-7 w-7 xs:h-8 xs:w-8 sm:h-10 sm:w-10", showText = true, vertical = false }) => {
    return (
        <div className={`flex ${vertical ? 'flex-col items-center text-center' : 'items-center'} gap-1.5 sm:gap-2.5 shrink-0 ${className}`}>
            {/* Official City Engineering Department Logo */}
            <img 
                src="/city-engineering-logo.png" 
                alt="City Engineering Department Logo" 
                className={`${size} aspect-square object-contain drop-shadow-sm rounded-full bg-white border border-slate-200 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform duration-200`}
            />
            {showText && (
                <div className={`flex flex-col text-left leading-tight ${vertical ? 'mt-2 items-center text-center' : ''} shrink-0`}>
                    <span className="font-heading font-black text-slate-900 dark:text-white tracking-tight text-[10px] sm:text-xs uppercase leading-none">
                        CALOOCAN CITY
                    </span>
                    <span className="font-heading font-black text-slate-800 dark:text-slate-100 tracking-tight text-[10px] xs:text-[11px] sm:text-sm lg:text-base leading-tight mt-0.5">
                        <span className="sm:hidden">Engineering Department</span>
                        <span className="hidden sm:inline">City Engineering Department</span>
                    </span>
                    <div className="flex items-center gap-1 text-[7.5px] xs:text-[8.5px] sm:text-[11px] font-mono-data text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                        <span>powered by:</span>
                        <span className="font-heading font-black text-[#ff6b00] uppercase tracking-wider">PULSO</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branding;
