import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ size = 15, className = "" }) {
    const { theme, changeTheme } = useTheme();

    const options = [
        { key: 'light', label: 'Light mode', icon: Sun },
        { key: 'system', label: 'System theme', icon: Monitor },
        { key: 'dark', label: 'Dark mode', icon: Moon },
    ];

    return (
        <div className={`inline-flex items-center bg-slate-100 dark:bg-slate-800/90 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-xs ${className}`}>
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
    );
}
