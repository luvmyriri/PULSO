/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export const ThemeContext = createContext();

export const APPEARANCE_OPTIONS = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
];

/**
 * Temporarily disables all CSS transitions during theme switching.
 * Prevents sluggish intermediate rendering, color fading delays, and visual lag.
 */
const disableTransitions = () => {
    if (typeof document === 'undefined') return () => {};
    const css = document.createElement('style');
    css.appendChild(
        document.createTextNode(
            `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
        )
    );
    document.head.appendChild(css);
    return () => {
        // Force browser layout reflow so new theme styles apply instantaneously
        (() => window.getComputedStyle(document.body))();
        setTimeout(() => {
            if (css.parentNode) {
                document.head.removeChild(css);
            }
        }, 1);
    };
};

/**
 * Detects the current operating system / browser preferred color scheme.
 */
const getSystemTheme = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Resolves the active theme ('light' | 'dark') given a mode ('light' | 'dark' | 'system').
 */
const resolveTheme = (mode) => {
    if (mode === 'system') return getSystemTheme();
    return mode === 'light' ? 'light' : 'dark';
};

export function ThemeProvider({ children }) {
    // 1. Initial Theme Mode ('light' | 'dark' | 'system')
    const [themeMode, setThemeModeState] = useState(() => {
        if (typeof window === 'undefined') return 'light';
        const savedMode = localStorage.getItem('pulso_theme_mode');
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
            return savedMode;
        }
        const legacy = localStorage.getItem('pulso_theme') || localStorage.getItem('theme');
        if (legacy === 'light' || legacy === 'dark') {
            return legacy;
        }
        return 'light';
    });

    // 2. Resolved Active Theme ('light' | 'dark')
    const [theme, setTheme] = useState(() => resolveTheme(themeMode));

    const isDark = theme === 'dark';

    const updateStatusBarColor = useCallback((activeIsDark) => {
        if (typeof document === 'undefined') return;
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

    const applyThemeToDom = useCallback((activeTheme) => {
        if (typeof document === 'undefined') return;
        const root = window.document.documentElement;
        root.classList.remove('theme-transitioning');
        root.classList.remove('light', 'dark');
        const activeDark = activeTheme === 'dark';
        root.classList.add(activeDark ? 'dark' : 'light');
        root.setAttribute('data-theme', activeDark ? 'dark' : 'light');
        updateStatusBarColor(activeDark);
    }, [updateStatusBarColor]);

    // Apply active theme to document root on change
    useEffect(() => {
        applyThemeToDom(theme);
    }, [theme, applyThemeToDom]);

    // Listen to OS / Browser system color scheme changes when themeMode is 'system'
    useEffect(() => {
        if (themeMode !== 'system') return;
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = (e) => {
            const nextTheme = e.matches ? 'dark' : 'light';
            const enableTransitions = disableTransitions();
            setTheme(nextTheme);
            applyThemeToDom(nextTheme);
            enableTransitions();
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleSystemChange);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleSystemChange);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleSystemChange);
            } else if (mediaQuery.removeListener) {
                mediaQuery.removeListener(handleSystemChange);
            }
        };
    }, [themeMode, applyThemeToDom]);

    /**
     * Switch theme mode ('light' | 'dark' | 'system').
     */
    const changeTheme = useCallback((newMode) => {
        const validMode = (newMode === 'light' || newMode === 'dark' || newMode === 'system') ? newMode : 'system';
        const resolved = resolveTheme(validMode);
        const enableTransitions = disableTransitions();

        setThemeModeState(validMode);
        setTheme(resolved);
        applyThemeToDom(resolved);

        try {
            localStorage.setItem('pulso_theme_mode', validMode);
            localStorage.setItem('pulso_theme', resolved);
            localStorage.setItem('theme', resolved);
        } catch (_) {}

        enableTransitions();
    }, [applyThemeToDom]);

    return (
        <ThemeContext.Provider value={{
            theme,
            themeMode,
            changeTheme,
            setThemeMode: changeTheme,
            isDark
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
