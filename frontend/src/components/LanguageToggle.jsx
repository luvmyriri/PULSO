import React from 'react';
import { FlagPH, FlagUS } from '../utils/iconMap';

/**
 * LanguageToggle Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive toggle switch carrying the official Philippines flag when ON (Tagalog)
 * and United States flag when OFF (English) inside a 1.75rem (28px) sliding knob.
 *
 * Specifications:
 * - Track: 3.25rem × 2rem (52px × 32px), rounded-full, p-0.5 (2px padding).
 * - Track Colors:
 *   - ON (Tagalog): #D95700 in light mode, #FF6B00 in dark mode.
 *   - OFF (English): soft gray (bg-slate-300 dark:bg-slate-700).
 * - Knob: 1.75rem (28px) circle, 2px white ring (ring-2 ring-white), no glow/tint on flags.
 * - Flags: Circular crop of official licensed SVG flags, never cut off.
 * - Slide Motion: 200ms slide with quick crossfade (no spinning, no bounce).
 * - Reduced Motion: instant switch without animation.
 * - Accessibility: role="switch", aria-checked, 3:1 contrast focus outline, Space/Enter keyboard support.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function LanguageToggle({
    isFilipino = false,
    onChange,
    disabled = false,
    interactive = true,
    id,
    ariaLabel,
    className = ''
}) {
    const handleKeyDown = (e) => {
        if (!interactive || disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (onChange) onChange();
        }
    };

    const handleClick = (e) => {
        if (!interactive || disabled) return;
        e.stopPropagation();
        if (onChange) onChange();
    };

    const accessibleName = ariaLabel || (isFilipino ? 'Language: Tagalog' : 'Language: English');

    return (
        <div
            id={id}
            role={interactive ? 'switch' : undefined}
            aria-checked={interactive ? isFilipino : undefined}
            aria-label={interactive ? accessibleName : undefined}
            tabIndex={interactive && !disabled ? 0 : -1}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`w-[3.25rem] h-[2rem] rounded-full p-0.5 transition-colors duration-200 motion-reduce:transition-none relative flex items-center shrink-0 select-none ${
                interactive && !disabled ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900' : ''
            } ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
            } bg-slate-200 dark:bg-slate-700 ring-1 ring-slate-300/70 dark:ring-slate-600/70 ${className}`}
        >

            {/* Sliding Knob (28px circle with 2px white ring) */}
            <div
                className={`w-7 h-7 rounded-full ring-2 ring-white shadow-sm overflow-hidden relative flex items-center justify-center bg-white shrink-0 transform transition-transform duration-200 ease-in-out motion-reduce:transition-none ${
                    isFilipino ? 'translate-x-[20px]' : 'translate-x-0'
                }`}
                aria-hidden="true"
            >
                {/* Philippine Flag (Tagalog ON) */}
                <div
                    className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-150 ease-in-out motion-reduce:duration-0 ${
                        isFilipino ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    <FlagPH className="w-full h-full object-cover scale-[1.05]" />
                </div>

                {/* United States Flag (English OFF) */}
                <div
                    className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-150 ease-in-out motion-reduce:duration-0 ${
                        !isFilipino ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    <FlagUS className="w-full h-full object-cover scale-[1.05]" />
                </div>
            </div>
        </div>
    );
}
