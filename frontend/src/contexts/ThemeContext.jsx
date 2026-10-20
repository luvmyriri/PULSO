/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export const ThemeContext = createContext();

export const APPEARANCE_OPTIONS = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
];

export function ThemeProvider({ children }) {
    // Check localStorage, migrate 'system' or initialize from prefers-color-scheme once on first launch
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'dark';
        const saved = localStorage.getItem('pulso_theme') || localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') {
            return saved;
        }
        // First launch or migration from 'system': read once, save explicitly, never follow after
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial = prefersDark ? 'dark' : 'light';
        localStorage.setItem('pulso_theme', initial);
        localStorage.setItem('theme', initial);
        return initial;
    });

    const isDark = theme === 'dark';

    const updateStatusBarColor = useCallback((activeIsDark) => {
        const color = activeIsDark ? '#070a12' : '#f8f7f5';
        let metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.setAttribute('name', 'theme-color');
            document.head.appendChild(metaTheme);
        }
        metaTheme.setAttribute('content', color);

        const lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]');
        if (lightMeta) lightMeta.setAttribute('content', color);
        const darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]');
        if (darkMeta) darkMeta.setAttribute('content', color);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        const activeDark = theme === 'dark';
        root.classList.add(activeDark ? 'dark' : 'light');
        root.setAttribute('data-theme', activeDark ? 'dark' : 'light');
        updateStatusBarColor(activeDark);
    }, [theme, updateStatusBarColor]);

    const changeTheme = (newTheme) => {
        const resolvedTheme = newTheme === 'light' ? 'light' : 'dark';
        const root = window.document.documentElement;
        const activeDark = resolvedTheme === 'dark';

        // Synchronously switch root classes and attributes immediately (no transition delay or lag)
        root.classList.remove('theme-transitioning');
        root.classList.remove('light', 'dark');
        root.classList.add(activeDark ? 'dark' : 'light');
        root.setAttribute('data-theme', activeDark ? 'dark' : 'light');
        updateStatusBarColor(activeDark);

        setTheme(resolvedTheme);
        localStorage.setItem('pulso_theme', resolvedTheme);
        localStorage.setItem('theme', resolvedTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

