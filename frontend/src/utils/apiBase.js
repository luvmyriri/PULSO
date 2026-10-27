/**
 * apiBase.js
 * Single source of truth for the API base URL.
 *
 * Priority:
 *  1. VITE_API_BASE_URL env variable (set in .env for production)
 *  2. Auto-detect from the browser's current hostname + port 33159
 *     This allows the app to work on any network (WiFi, LAN, localhost)
 *     without hardcoding "localhost".
 */
const envUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = envUrl !== undefined
    ? envUrl.replace(/\/$/, '')
    : import.meta.env.PROD ? ''
    : (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '4173')
        ? ''
        : `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:33159`);

export default API_BASE_URL;
