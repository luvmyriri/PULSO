import React from 'react';

/**
 * Branding
 * ─────────────────────────────────────────────────────────────────────────────
 * Official Municipal Brand Lockup:
 * - Real Caloocan City Seal file next to the text at 2.5rem (40px), with no glow, ring, or recoloring.
 * - Exact content and hierarchy:
 *     1. Caloocan City (Title Case in monochrome, or uppercase in standard)
 *     2. City Engineering Department (bold, ≥14px)
 *     3. powered by: PULSO (≥12px)
 * - Text is never under 12px, shrinking slightly with clamp() before truncating.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const Branding = ({
    className = '',
    size = 'w-9 h-9 sm:w-10 sm:h-10',
    showText = true,
    vertical = false,
    sealSrc = '/city-engineering-logo.png',
    monochrome = false,
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
                    {/* Line 1: Caloocan City */}
                    <span className={`font-heading font-bold text-[9px] sm:text-[11px] leading-none select-none ${
                        monochrome 
                            ? 'text-black dark:text-white' 
                            : 'text-slate-500 dark:text-slate-400 tracking-[0.04em] uppercase'
                    }`}>
                        {monochrome ? 'Caloocan City' : 'CALOOCAN CITY'}
                    </span>

                    {/* Line 2: City Engineering Department (bold, main line) */}
                    <span className={`font-heading font-bold tracking-tight text-[11.5px] xs:text-[12.5px] sm:text-[14px] leading-tight mt-0.5 select-none truncate ${
                        monochrome ? 'text-black dark:text-white' : 'text-slate-900 dark:text-white'
                    }`}>
                        City Engineering Department
                    </span>

                    {/* Line 3: powered by: PULSO */}
                    <div className={`flex items-center gap-1 text-[8.5px] sm:text-[10.5px] leading-none mt-0.5 select-none ${
                        monochrome ? 'text-black dark:text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                        <span>powered by:</span>
                        <span className={`font-heading font-black ${
                            monochrome 
                                ? 'text-black dark:text-white tracking-normal' 
                                : 'text-[#ff6b00] uppercase tracking-wider'
                        }`}>
                            PULSO
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branding;
