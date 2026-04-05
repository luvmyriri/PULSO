import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ size = 14, className = "" }) {
    const { theme, changeTheme } = useTheme();

    return (
        <div className={`flex bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50 ${className}`}>
            <button 
                onClick={() => changeTheme('light')} 
                className={`p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Light Mode"
            >
                <Sun size={size} />
            </button>
            <button 
                onClick={() => changeTheme('system')} 
                className={`p-1.5 rounded-lg transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="System Theme"
            >
                <Monitor size={size} />
            </button>
            <button 
                onClick={() => changeTheme('dark')} 
                className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Dark Mode"
            >
                <Moon size={size} />
            </button>
        </div>
    );
}
