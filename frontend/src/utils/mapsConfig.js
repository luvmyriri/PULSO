/**
 * mapsConfig.js
 * Single source of truth for Google Maps loader configuration.
 *
 * Keeps a single, immutable array and options reference for Google Maps API
 * to prevent:
 * 1. "Error: Loader must not be called again with different options."
 * 2. "LoadScript has been reloaded unintentionally! You should not pass `libraries` prop as new array."
 */

export const GOOGLE_MAPS_LIBRARIES = Object.freeze(['places', 'geometry']);

export const GOOGLE_MAPS_LOADER_OPTIONS = Object.freeze({
    id: 'pulso-google-map-script',
    googleMapsApiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: 'en',
    region: 'PH',
});

export default GOOGLE_MAPS_LOADER_OPTIONS;
