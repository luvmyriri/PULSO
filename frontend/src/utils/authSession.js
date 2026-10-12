/**
 * authSession.js
 * Centralized Session-Only Authentication Management for PULSO.
 * 
 * Guarantees reliable token access across components, supporting both
 * sessionStorage and localStorage synchronization so active sessions
 * function reliably across all pages, modals, and route navigations.
 */

// Initialize and harmonize credentials across storage mechanisms
export const initAuthSession = () => {
    try {
        const token = sessionStorage.getItem('pulso_token') || 
                      sessionStorage.getItem('token') || 
                      localStorage.getItem('pulso_token') || 
                      localStorage.getItem('token');
        const user = sessionStorage.getItem('pulso_user') || 
                     sessionStorage.getItem('user') || 
                     localStorage.getItem('pulso_user') || 
                     localStorage.getItem('user');

        if (token) {
            sessionStorage.setItem('pulso_token', token);
            localStorage.setItem('pulso_token', token);
            localStorage.setItem('token', token);
        }
        if (user) {
            sessionStorage.setItem('pulso_user', user);
            localStorage.setItem('pulso_user', user);
            localStorage.setItem('user', user);
        }
    } catch (e) {
        console.error('Error initializing auth session:', e);
    }
};

// Immediately invoke on script evaluation
initAuthSession();

export const getAuthToken = () => {
    try {
        return sessionStorage.getItem('pulso_token') || 
               sessionStorage.getItem('token') || 
               localStorage.getItem('pulso_token') || 
               localStorage.getItem('token') || 
               null;
    } catch {
        return null;
    }
};

export const getAuthUser = () => {
    try {
        const raw = sessionStorage.getItem('pulso_user') || 
                    sessionStorage.getItem('user') || 
                    localStorage.getItem('pulso_user') || 
                    localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const cleanStaleAvatarStorage = () => {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem('pulso_avatar_current');
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pulso_avatar_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
        // silent fail on restricted environments
    }
};

export const setAuthSession = (token, user) => {
    try {
        if (token) {
            sessionStorage.setItem('pulso_token', token);
            localStorage.setItem('pulso_token', token);
            localStorage.setItem('token', token);
        }
        if (user) {
            const userStr = typeof user === 'string' ? user : JSON.stringify(user);
            sessionStorage.setItem('pulso_user', userStr);
            localStorage.setItem('pulso_user', userStr);
            localStorage.setItem('user', userStr);
        }
        // Purge old local-only base64 avatar keys on login
        cleanStaleAvatarStorage();
    } catch (e) {
        console.error('Error setting auth session:', e);
    }
};

export const clearAuthSession = () => {
    try {
        sessionStorage.removeItem('pulso_token');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('pulso_user');
        sessionStorage.removeItem('user');
        localStorage.removeItem('pulso_token');
        localStorage.removeItem('token');
        localStorage.removeItem('pulso_user');
        localStorage.removeItem('user');
        cleanStaleAvatarStorage();
    } catch (e) {
        console.error('Error clearing auth session:', e);
    }
};
