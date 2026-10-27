import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({
    size = 15,
    className = "",
    singleIcon = false,
    responsiveBreakpoint = 'sm'
}) {
    const { theme, themeMode = 'system', changeTheme, isDark } = useTheme();

    const isDarkActive = isDark ?? (theme === 'dark');

    // Cycle 3 states when singleIcon is used: light -> dark -> system -> light
    const handleCycleTheme = () => {
        if (themeMode === 'light') {
            changeTheme('dark');
        } else if (themeMode === 'dark') {
            changeTheme('system');
        } else {
            changeTheme('light');
        }
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

    const getSingleIconTitle = () => {
        if (themeMode === 'system') return 'System mode (tap to switch to Light)';
        if (themeMode === 'dark') return 'Dark mode (tap to switch to System)';
        return 'Light mode (tap to switch to Dark)';
    };

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            {/* ── Direct Cycle Single Icon Button (Compact / Mobile / singleIcon=true) ───── */}
            <div className={singleHiddenClass}>
                <button
                    type="button"
                    onClick={handleCycleTheme}
                    aria-label={`Theme: ${themeMode}. Click to switch mode`}
                    title={getSingleIconTitle()}
                    className="flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-[#ff6b00] shadow-2xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] active:scale-95"
                >
                    {themeMode === 'system' ? (
                        <Monitor size={size} className="text-[#ff6b00]" />
                    ) : isDarkActive ? (
                        <Moon size={size} className="text-[#ff6b00]" />
                    ) : (
                        <Sun size={size} className="text-[#ff6b00]" />
                    )}
                </button>
            </div>

            {/* ── Wide Breakpoint: 3-Option Segmented Pill (Light / Dark / System) ───── */}
            {!singleIcon && (
                <div
                    role="group"
                    aria-label="Theme mode"
                    className={`${pillHiddenClass} items-center bg-slate-100 dark:bg-slate-800/90 rounded-xl p-0.5 sm:p-1 border border-slate-200 dark:border-slate-700 shadow-xs gap-0.5`}
                >
                    {/* Light Mode */}
                    <button
                        type="button"
                        onClick={() => changeTheme('light')}
                        aria-label="Light mode"
                        aria-pressed={themeMode === 'light'}
                        title="Light mode"
                        className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                            themeMode === 'light'
                                ? 'bg-white dark:bg-slate-700 text-[#ff6b00] shadow-xs border border-slate-200/80 dark:border-slate-600 font-bold'
                                : 'text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                        }`}
                    >
                        <Sun size={size} className={themeMode === 'light' ? 'text-[#ff6b00]' : 'currentColor transition-colors'} />
                    </button>

                    {/* Dark Mode */}
                    <button
                        type="button"
                        onClick={() => changeTheme('dark')}
                        aria-label="Dark mode"
                        aria-pressed={themeMode === 'dark'}
                        title="Dark mode"
                        className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                            themeMode === 'dark'
                                ? 'bg-white dark:bg-slate-700 text-[#ff6b00] shadow-xs border border-slate-200/80 dark:border-slate-600 font-bold'
                                : 'text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                        }`}
                    >
                        <Moon size={size} className={themeMode === 'dark' ? 'text-[#ff6b00]' : 'currentColor transition-colors'} />
                    </button>

                    {/* System Mode */}
                    <button
                        type="button"
                        onClick={() => changeTheme('system')}
                        aria-label="System mode"
                        aria-pressed={themeMode === 'system'}
                        title="System mode (follows device theme)"
                        className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                            themeMode === 'system'
                                ? 'bg-white dark:bg-slate-700 text-[#ff6b00] shadow-xs border border-slate-200/80 dark:border-slate-600 font-bold'
                                : 'text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                        }`}
                    >
                        <Monitor size={size} className={themeMode === 'system' ? 'text-[#ff6b00]' : 'currentColor transition-colors'} />
                    </button>
                </div>
            )}
        </div>
    );
}
