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

    // Safeguard: isLoaded must be strictly true only when window.google.maps.Map is a valid constructor
    const isActuallyLoaded = Boolean(
        isLoaded &&
        typeof window !== 'undefined' &&
        window.google &&
        window.google.maps &&
        typeof window.google.maps.Map === 'function'
    );

    return (
        <GoogleMapsContext.Provider value={{ isLoaded: isActuallyLoaded, rawLoaded: isLoaded, loadError }}>
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
            isLoaded: typeof window !== 'undefined' && typeof window.google?.maps?.Map === 'function',
            loadError: null,
        };
    }
    return {
        ...context,
        isLoaded: Boolean(
            context.isLoaded &&
            typeof window !== 'undefined' &&
            window.google &&
            window.google.maps &&
            typeof window.google.maps.Map === 'function'
        ),
    };
}

export default GoogleMapsContext;
