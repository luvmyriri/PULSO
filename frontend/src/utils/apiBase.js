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

export const API_BASE_URL = envUrl
    ? envUrl
    : `http://${window.location.hostname}:33159`;

export default API_BASE_URL;
