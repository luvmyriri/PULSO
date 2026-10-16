import React from 'react';
import { Sun, Moon, Monitor } from '../icons';
import { useTheme } from '../contexts/ThemeContext';

export default function ResidentThemeToggle({ size = 14, className = '', isOverHero = false }) {
    const { theme, changeTheme } = useTheme();

    return (
        <div className={`flex items-center rounded-xl p-0.5 sm:p-1 transition-all ${
            isOverHero 
                ? 'bg-white/10 border border-white/20 backdrop-blur-sm' 
                : 'bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60'
        } ${className}`}>
            <button
                type="button"
                onClick={() => changeTheme('light')}
                className={`p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer ${
                    theme === 'light'
                        ? isOverHero
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                        : isOverHero
                            ? 'text-white/70 hover:text-white'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Light Mode"
                aria-label="Light mode"
            >
                <Sun size={size} />
            </button>
            <button
                type="button"
                onClick={() => changeTheme('system')}
                className={`p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer ${
                    theme === 'system'
                        ? isOverHero
                            ? 'bg-white/25 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                        : isOverHero
                            ? 'text-white/70 hover:text-white'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="System Theme"
                aria-label="System theme"
            >
                <Monitor size={size} />
            </button>
            <button
                type="button"
                onClick={() => changeTheme('dark')}
                className={`p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer ${
                    theme === 'dark'
                        ? isOverHero
                            ? 'bg-slate-900/90 text-orange-400 shadow-sm border border-white/20'
                            : 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                        : isOverHero
                            ? 'text-white/70 hover:text-white'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Dark Mode"
                aria-label="Dark mode"
            >
                <Moon size={size} />
            </button>
        </div>
    );
}
