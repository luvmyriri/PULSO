import React, { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../utils/mapsConfig';

const GoogleMapsContext = createContext({ isLoaded: false, loadError: null });

/**
 * Single, top-level Google Maps Provider.
 * Loads the Google Maps JS SDK once for the entire application.
 * Prevents multiple LoadScript / Loader instances with different options from throwing:
 * "Error: Loader must not be called again with different options."
 */
export function GoogleMapsProvider({ children }) {
    const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

    return (
        <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
            {children}
        </GoogleMapsContext.Provider>
    );
}

/**
 * Hook to consume the single centralized Google Maps SDK loading state.
 */
export function useGoogleMaps() {
    const context = useContext(GoogleMapsContext);
    if (!context) {
        return {
            isLoaded: typeof window !== 'undefined' && Boolean(window.google?.maps),
            loadError: null,
        };
    }
    return context;
}

export default GoogleMapsContext;
