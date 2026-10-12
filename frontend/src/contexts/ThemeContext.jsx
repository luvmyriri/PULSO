/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export const ThemeContext = createContext();

export const APPEARANCE_OPTIONS = [
    { id: 'system', label: 'Match my phone' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
];

export function ThemeProvider({ children }) {
    // Check localStorage, default to 'system'
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('pulso_theme') || 'system';
    });

    // Track active effective dark status
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem('pulso_theme') || 'system';
        if (saved === 'dark') return true;
        if (saved === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

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
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

        const applyTheme = (currentTheme) => {
            root.classList.remove('light', 'dark');

            const activeDark = currentTheme === 'system'
                ? systemPrefersDark.matches
                : currentTheme === 'dark';

            root.classList.add(activeDark ? 'dark' : 'light');
            root.setAttribute('data-theme', activeDark ? 'dark' : 'light');
            setIsDark(activeDark);
            updateStatusBarColor(activeDark);
        };

        applyTheme(theme);

        // Listen for OS theme changes if set to system
        const listener = (e) => {
            if (theme === 'system') {
                root.classList.remove('light', 'dark');
                const activeDark = e.matches;
                root.classList.add(activeDark ? 'dark' : 'light');
                root.setAttribute('data-theme', activeDark ? 'dark' : 'light');
                setIsDark(activeDark);
                updateStatusBarColor(activeDark);
            }
        };

        systemPrefersDark.addEventListener('change', listener);
        return () => systemPrefersDark.removeEventListener('change', listener);
    }, [theme, updateStatusBarColor]);

    const changeTheme = (newTheme) => {
        const root = window.document.documentElement;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!prefersReducedMotion) {
            root.classList.add('theme-transitioning');
            setTimeout(() => {
                root.classList.remove('theme-transitioning');
            }, 150);
        }

        setTheme(newTheme);
        localStorage.setItem('pulso_theme', newTheme);
        localStorage.setItem('theme', newTheme);
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
