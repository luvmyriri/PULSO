/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Check localStorage, default to 'system'
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('pulso_theme') || 'system';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

        const applyTheme = (currentTheme) => {
            root.classList.remove('light', 'dark');

            if (currentTheme === 'system') {
                const systemTheme = systemPrefersDark.matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
            } else {
                root.classList.add(currentTheme);
            }
        };

        applyTheme(theme);

        // Listen for OS theme changes if set to system
        const listener = (e) => {
            if (theme === 'system') {
                root.classList.remove('light', 'dark');
                root.classList.add(e.matches ? 'dark' : 'light');
            }
        };

        systemPrefersDark.addEventListener('change', listener);
        return () => systemPrefersDark.removeEventListener('change', listener);
    }, [theme]);

    const changeTheme = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('pulso_theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

