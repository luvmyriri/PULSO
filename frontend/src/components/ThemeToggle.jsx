import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ size = 14, className = "" }) {
    const { theme, changeTheme } = useTheme();

    return (
        <div className={`flex bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50 ${className}`}>
            <button 
                type="button"
                onClick={() => changeTheme('light')} 
                aria-label="Use light theme"
                aria-pressed={theme === 'light'}
                className={`min-h-11 min-w-11 p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Light Mode"
            >
                <Sun size={size} />
            </button>
            <button 
                type="button"
                onClick={() => changeTheme('system')} 
                aria-label="Use system theme"
                aria-pressed={theme === 'system'}
                className={`min-h-11 min-w-11 p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 ${theme === 'system' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="System Theme"
            >
                <Monitor size={size} />
            </button>
            <button 
                type="button"
                onClick={() => changeTheme('dark')} 
                aria-label="Use dark theme"
                aria-pressed={theme === 'dark'}
                className={`min-h-11 min-w-11 p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Dark Mode"
            >
                <Moon size={size} />
            </button>
        </div>
    );
}
