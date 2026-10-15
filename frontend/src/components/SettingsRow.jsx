import React from 'react';
import { ChevronRight, Sun, Moon } from 'lucide-react';
import LanguageToggle from './LanguageToggle';

/**
 * SettingsRow Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared settings list item for PULSO Resident App (Account, Preferences, Support).
 *
 * Requirements:
 * - Uses ONE icon color for all standard rows: PULSO orange from theme token (--icon-tile-fg)
 *   (Bright orange #FF6B00 in Dark Mode, Darker orange #D95700 in Light Mode for >= 3:1 contrast).
 * - Uses ONE tile style for all rows: 2.5rem (40px) rounded square with 12-15% orange tint
 *   (--icon-tile-bg), no border, glow, or shadow.
 * - Destructive rows ("Sign Out", "Delete account") use destructive red tokens.
 * - Icon shapes preserved from Lucide icon set (20-24px size, 2px stroke).
 * - Right-side values ("On", "English", "v2.4.0") and chevrons stay soft gray, never orange.
 * - Row text stays white (dark mode) or navy (light mode).
 * - Icons are decorative (aria-hidden="true") paired with accessible text labels.
 * - Language row renders dedicated LanguageToggle with official PH / US SVG flags in knob.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function SettingsRow({
    icon: IconComponent,
    label,
    value,
    onClick,
    isDestructive = false,
    showChevron = true,
    isSwitch = false,
    isLanguageSwitch = false,
    isChecked = false,
    ariaLabel,
    className = ''
}) {
    const isAnySwitch = isSwitch || isLanguageSwitch;
    return (
        <div
            role={isAnySwitch ? 'switch' : 'button'}
            aria-checked={isAnySwitch ? isChecked : undefined}
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onClick) onClick();
                }
            }}
            aria-label={ariaLabel || label}
            className={`w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800 focus-visible:ring-2 focus-visible:ring-orange-500 ${
                isDestructive
                    ? 'hover:bg-red-50/70 dark:hover:bg-red-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            } ${className}`}
        >
            <div className="flex items-center gap-3.5 min-w-0">
                {IconComponent && (
                    <div
                        className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isDestructive
                                ? 'bg-[var(--icon-tile-destructive-bg)] text-[var(--icon-tile-destructive-fg)]'
                                : 'bg-[var(--icon-tile-bg)] text-[var(--icon-tile-fg)]'
                        }`}
                        aria-hidden="true"
                    >
                        <IconComponent
                            size={20}
                            strokeWidth={2}
                            className="shrink-0"
                            aria-hidden="true"
                        />
                    </div>
                )}
                <span
                    className={`text-[14px] font-semibold truncate ${
                        isDestructive
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-900 dark:text-white'
                    }`}
                >
                    {label}
                </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {isLanguageSwitch ? (
                    <LanguageToggle
                        isFilipino={isChecked}
                        interactive={false}
                    />
                ) : isSwitch ? (
                    <div
                        className="w-[3.25rem] h-[2rem] rounded-full p-0.5 transition-colors duration-200 motion-reduce:transition-none relative flex items-center shrink-0 select-none bg-slate-200 dark:bg-slate-700 ring-1 ring-slate-300/70 dark:ring-slate-600/70"
                        aria-hidden="true"
                    >
                        <div
                            className={`w-7 h-7 rounded-full bg-white ring-2 ring-white shadow-sm overflow-hidden relative flex items-center justify-center shrink-0 transition-transform duration-200 ease-in-out motion-reduce:transition-none transform ${
                                isChecked ? 'translate-x-[20px]' : 'translate-x-0'
                            }`}
                        >
                            {/* Dark Mode Moon Icon (when checked / active) */}
                            <div
                                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-in-out motion-reduce:duration-0 ${
                                    isChecked ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                                }`}
                            >
                                <Moon size={15} strokeWidth={2.4} className="text-slate-900 fill-slate-900" />
                            </div>

                            {/* Light Mode Sun Icon (when unchecked / light mode) */}
                            <div
                                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-in-out motion-reduce:duration-0 ${
                                    !isChecked ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                                }`}
                            >
                                <Sun size={16} strokeWidth={2.4} className="text-[#D95700]" />
                            </div>
                        </div>
                    </div>


                ) : (
                    <>
                        {value && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                {value}
                            </span>
                        )}
                        {showChevron && (
                            <ChevronRight
                                size={18}
                                className="text-slate-400 dark:text-slate-500 shrink-0"
                                aria-hidden="true"
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
