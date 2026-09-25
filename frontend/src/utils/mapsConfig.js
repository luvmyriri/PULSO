/**
 * mapsConfig.js
 * Single source of truth for Google Maps loader configuration.
 *
 * Keeps a single, immutable array reference for Google Maps libraries
 * to prevent @react-google-maps/api from triggering:
 * "LoadScript has been reloaded unintentionally! You should not pass `libraries` prop as new array."
 */
export const GOOGLE_MAPS_LIBRARIES = Object.freeze(['places', 'geometry']);

export default GOOGLE_MAPS_LIBRARIES;
