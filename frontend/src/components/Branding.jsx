import React from 'react';

/**
 * Branding
 * ─────────────────────────────────────────────────────────────────────────────
 * Official Municipal Brand Lockup:
 * - Real Caloocan City Seal file next to the text at 2.5rem (40px), with no glow, ring, or recoloring.
 * - Exact content and hierarchy:
 *     1. CALOOCAN CITY (small, bold, uppercase with 0.04em spacing, slate)
 *     2. City Engineering Department (bold, dark navy in light / white in dark, ≥14px)
 *     3. powered by: PULSO (soft gray with vibrant orange PULSO, ≥12px)
 * - Text is never under 12px, shrinking slightly with clamp() before truncating.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const Branding = ({
    className = '',
    size = 'w-9 h-9 sm:w-10 sm:h-10',
    showText = true,
    vertical = false,
    sealSrc = '/city-engineering-logo.png',
}) => {
    return (
        <div className={`flex ${vertical ? 'flex-col items-center text-center' : 'items-center'} gap-1.5 sm:gap-2.5 shrink-0 ${className}`}>
            {/* Real Caloocan City Seal (Circular official logo, no glow, crisp aspect-square) */}
            <img 
                src={sealSrc} 
                alt="Caloocan City Seal" 
                className={`${size} min-w-[32px] min-h-[32px] sm:min-w-[40px] sm:min-h-[40px] aspect-square object-contain rounded-full shrink-0 select-none`}
                loading="eager"
            />
            {showText && (
                <div className={`flex flex-col text-left leading-tight min-w-0 ${vertical ? 'mt-1.5 items-center text-center' : ''}`}>
                    {/* Line 1: CALOOCAN CITY (small, bold, uppercase with 0.04em spacing, slate) */}
                    <span className="font-heading font-bold text-slate-500 dark:text-slate-400 tracking-[0.04em] text-[9px] sm:text-[11px] uppercase leading-none select-none">
                        CALOOCAN CITY
                    </span>

                    {/* Line 2: City Engineering Department (bold, main line, dark navy in light mode, white in dark mode) */}
                    <span className="font-heading font-bold text-slate-900 dark:text-white tracking-tight text-[11.5px] xs:text-[12.5px] sm:text-[14px] leading-tight mt-0.5 select-none truncate">
                        City Engineering Department
                    </span>

                    {/* Line 3: powered by: PULSO ("powered by:" in soft gray, "PULSO" in orange) */}
                    <div className="flex items-center gap-1 text-[8.5px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 select-none">
                        <span>powered by:</span>
                        <span className="font-heading font-black text-[#ff6b00] uppercase tracking-wider">PULSO</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branding;
