/**
 * boundaryStyle.js
 * Single source of truth for Caloocan City boundary styles and GIS styling tokens.
 *
 * Rules:
 * 1. Single orange palette derived from PULSO tokens (--color-primary).
 * 2. NO amber, yellow, or second hue for South Caloocan.
 * 3. Sectors are differentiated by label and position, with state (active/inactive)
 *    conveyed through opacity and stroke weight only.
 */

import {
    NORTH_CALOOCAN_CENTROID,
    SOUTH_CALOOCAN_CENTROID,
    COMBINED_CALOOCAN_BOUNDS
} from '../data/caloocanBoundaries';

export const PULSO_ORANGE_FALLBACK = '#ff6b00';

/**
 * Reads the authoritative PULSO orange from the root CSS variable,
 * falling back to the standard brand primary hex (#ff6b00).
 */
export function getPulsoOrange() {
    if (typeof window !== 'undefined' && window.document?.documentElement) {
        const computed = getComputedStyle(document.documentElement).getPropertyValue('--color-primary')?.trim();
        if (computed && computed.startsWith('#')) return computed;
    }
    return PULSO_ORANGE_FALLBACK;
}

/**
 * Returns Google Maps PolygonOptions for the outer Sector perimeter boundary.
 *
 * Spec:
 * - Sector outline: PULSO orange, 2.0 to 2.5 px, full opacity (1.0).
 * - Sector fill: same orange at 8% to 12% opacity (light: 0.08, dark: 0.10).
 * - Unselected sector: dimmed (strokeOpacity 0.35, fillOpacity 0.02, strokeWeight 1.5).
 * - Hover: 3.0 px outline, slightly higher fill opacity (0.16).
 */
export function getSectorPolygonStyle({
    sector = 'north',
    activeSector = 'all',
    isDarkMode = true,
    isHovered = false,
    customOrange = null
} = {}) {
    const orange = customOrange || getPulsoOrange();
    const isSelected = activeSector === 'all' || activeSector?.toLowerCase() === sector?.toLowerCase();

    if (isSelected) {
        return {
            strokeColor: orange,
            strokeOpacity: 1.0,
            strokeWeight: isHovered ? 3.0 : 2.5,
            fillColor: orange,
            fillOpacity: isHovered
                ? (isDarkMode ? 0.16 : 0.14)
                : (isDarkMode ? 0.10 : 0.08),
            clickable: true,
            zIndex: 10,
        };
    }

    // Dimmed unselected sector — same orange, reduced weight & opacity
    return {
        strokeColor: orange,
        strokeOpacity: 0.35,
        strokeWeight: 1.5,
        fillColor: orange,
        fillOpacity: isDarkMode ? 0.03 : 0.02,
        clickable: true,
        zIndex: 5,
    };
}

/**
 * Returns Google Maps PolygonOptions for internal Barangay boundaries.
 *
 * Spec:
 * - Barangay lines: same orange, 1 px, 60% to 70% opacity (0.65).
 * - Fade in from medium zoom level.
 * - Dimmed in unselected sector.
 */
export function getBarangayPolygonStyle({
    sector = 'north',
    activeSector = 'all',
    isDarkMode = true,
    isHovered = false,
    customOrange = null
} = {}) {
    const orange = customOrange || getPulsoOrange();
    const isSelected = activeSector === 'all' || activeSector?.toLowerCase() === sector?.toLowerCase();

    if (isSelected) {
        return {
            strokeColor: orange,
            strokeOpacity: 0.65,
            strokeWeight: 1.0,
            fillColor: orange,
            fillOpacity: isHovered
                ? (isDarkMode ? 0.12 : 0.09)
                : (isDarkMode ? 0.06 : 0.04),
            clickable: false,
            zIndex: 2,
        };
    }

    return {
        strokeColor: orange,
        strokeOpacity: 0.25,
        strokeWeight: 0.8,
        fillColor: orange,
        fillOpacity: 0.01,
        clickable: false,
        zIndex: 1,
    };
}

/**
 * Builds the SVG Data URL for the Command-Center style sector label pill.
 * North and South share the identical visual pill treatment with a small orange dot.
 */
export function getSectorLabelSvg({
    sector = 'north',
    isDarkMode = true,
    orangeColor = null
} = {}) {
    const orange = orangeColor || getPulsoOrange();
    const label = sector?.toLowerCase() === 'south' ? 'SOUTH CALOOCAN' : 'NORTH CALOOCAN';
    const bgFill = isDarkMode ? '#0c1424' : '#ffffff';
    const textFill = isDarkMode ? '#ffffff' : '#0f172a';
    const bgOpacity = isDarkMode ? '0.92' : '0.96';

    const rawSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="134" height="32" viewBox="0 0 134 32">
            <rect x="2" y="2" width="130" height="28" rx="8" fill="${bgFill}" fill-opacity="${bgOpacity}" stroke="${orange}" stroke-width="1.5" />
            <circle cx="16" cy="16" r="4" fill="${orange}" />
            <text x="70" y="20" fill="${textFill}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="0.3">${label}</text>
        </svg>
    `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(rawSvg)}`;
}

export {
    NORTH_CALOOCAN_CENTROID,
    SOUTH_CALOOCAN_CENTROID,
    COMBINED_CALOOCAN_BOUNDS
};
