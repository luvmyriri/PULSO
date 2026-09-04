/**
 * authSession.js
 * Centralized Session-Only Authentication Management for PULSO.
 * 
 * Guarantees that when a user closes the page/tab/browser window,
 * any active account session is immediately terminated (no lingering credentials).
 * Active sessions survive page reloads (F5) and route navigation via sessionStorage.
 */

// Initialize and purge any legacy persistent credentials left in localStorage
export const initAuthSession = () => {
    try {
        // If there's no active session in sessionStorage, remove any old localStorage tokens
        if (!sessionStorage.getItem('pulso_token')) {
            localStorage.removeItem('pulso_token');
            localStorage.removeItem('pulso_user');
        }
    } catch (e) {
        console.error('Error initializing auth session:', e);
    }
};

// Immediately invoke on script evaluation
initAuthSession();

export const getAuthToken = () => {
    try {
        return sessionStorage.getItem('pulso_token') || null;
    } catch {
        return null;
    }
};

export const getAuthUser = () => {
    try {
        const raw = sessionStorage.getItem('pulso_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const setAuthSession = (token, user) => {
    try {
        if (token) {
            sessionStorage.setItem('pulso_token', token);
        }
        if (user) {
            sessionStorage.setItem('pulso_user', typeof user === 'string' ? user : JSON.stringify(user));
        }
        // Ensure credentials are never kept in permanent localStorage
        localStorage.removeItem('pulso_token');
        localStorage.removeItem('pulso_user');
    } catch (e) {
        console.error('Error setting auth session:', e);
    }
};

export const clearAuthSession = () => {
    try {
        sessionStorage.removeItem('pulso_token');
        sessionStorage.removeItem('pulso_user');
        localStorage.removeItem('pulso_token');
        localStorage.removeItem('pulso_user');
    } catch (e) {
        console.error('Error clearing auth session:', e);
    }
};
