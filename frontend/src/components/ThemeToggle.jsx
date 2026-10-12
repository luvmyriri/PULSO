import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ size = 15, className = "", singleIcon = false, responsiveBreakpoint = 'sm' }) {
    const { theme, changeTheme } = useTheme();

    const options = [
        { key: 'light', label: 'Light mode', icon: Sun },
        { key: 'system', label: 'System theme', icon: Monitor },
        { key: 'dark', label: 'Dark mode', icon: Moon },
    ];

    // Determine if dark appearance is currently active
    const isDarkActive = theme === 'dark' || (theme === 'system' && typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

    // Instant direct 2-state toggle on mobile (Light <-> Dark)
    const handleDirectToggle = () => {
        changeTheme(isDarkActive ? 'light' : 'dark');
    };

    const singleHiddenClass = singleIcon
        ? 'inline-flex'
        : responsiveBreakpoint === 'xl'
        ? 'xl:hidden inline-flex'
        : 'sm:hidden inline-flex';

    const pillHiddenClass = !singleIcon && (
        responsiveBreakpoint === 'xl'
            ? 'hidden xl:inline-flex'
            : 'hidden sm:inline-flex'
    );

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            {/* ── Direct 2-State Single Icon Button (Mobile / Narrow Breakpoint or singleIcon=true) ───── */}
            <div className={singleHiddenClass}>
                <button
                    type="button"
                    onClick={handleDirectToggle}
                    aria-label={isDarkActive ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={isDarkActive ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-[#ff6b00] shadow-2xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] active:scale-95"
                >
                    {isDarkActive ? (
                        <Moon size={size} className="text-[#ff6b00]" />
                    ) : (
                        <Sun size={size} className="text-[#ff6b00]" />
                    )}
                </button>
            </div>

            {/* ── Wide Breakpoint: 3-Option Inline Pill (Hidden when singleIcon is true or below breakpoint) ───── */}
            {!singleIcon && (
                <div className={`${pillHiddenClass} items-center bg-slate-100 dark:bg-slate-800/90 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-xs`}>
                    {options.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = theme === opt.key;
                        return (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => changeTheme(opt.key)}
                                aria-label={opt.label}
                                aria-pressed={isSelected}
                                title={opt.label}
                                className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                                    isSelected
                                        ? 'bg-white dark:bg-slate-700 text-[#ff6b00] shadow-xs border border-slate-200/80 dark:border-slate-600 font-bold'
                                        : 'text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                                }`}
                            >
                                <Icon size={size} className={isSelected ? 'text-[#ff6b00]' : 'currentColor transition-colors'} />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
