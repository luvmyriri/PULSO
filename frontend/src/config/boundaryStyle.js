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
    customOrange = null,
    interactive = true
} = {}) {
    const orange = customOrange || getPulsoOrange();
    const isSelected = activeSector === 'all' || activeSector?.toLowerCase() === sector?.toLowerCase();

    if (isSelected) {
        return {
            strokeColor: orange,
            strokeOpacity: 1.0,
            strokeWeight: isHovered && interactive ? 3.0 : 2.0,
            fillColor: orange,
            fillOpacity: isHovered && interactive
                ? (isDarkMode ? 0.16 : 0.14)
                : (isDarkMode ? 0.08 : 0.08),
            clickable: interactive,
            zIndex: 10,
        };
    }

    // Dimmed unselected sector — same orange, 40% opacity per spec
    return {
        strokeColor: orange,
        strokeOpacity: 0.40,
        strokeWeight: 1.5,
        fillColor: orange,
        fillOpacity: isDarkMode ? 0.03 : 0.02,
        clickable: interactive,
        zIndex: 5,
    };
}

/**
 * Returns Google Maps PolygonOptions for internal Barangay boundaries.
 *
 * Spec:
 * - Barangay lines: PULSO orange (1.2px) by default, matching outer perimeter.
 * - Dimmed in unselected sector.
 */
export function getBarangayPolygonStyle({
    sector = 'north',
    activeSector = 'all',
    isDarkMode = true,
    isHovered = false,
    customOrange = null,
    grayStyle = false
} = {}) {
    const orange = customOrange || getPulsoOrange();
    const isSelected = activeSector === 'all' || activeSector?.toLowerCase() === sector?.toLowerCase();

    if (grayStyle) {
        return {
            strokeColor: orange,
            strokeOpacity: isSelected ? 0.70 : 0.30,
            strokeWeight: 1.1,
            fillColor: orange,
            fillOpacity: 0,
            clickable: false,
            zIndex: 15,
        };
    }

    if (isSelected) {
        return {
            strokeColor: orange,
            strokeOpacity: 0.75,
            strokeWeight: 1.2,
            fillColor: orange,
            fillOpacity: isHovered
                ? (isDarkMode ? 0.08 : 0.06)
                : 0,
            clickable: false,
            zIndex: 15,
        };
    }

    return {
        strokeColor: orange,
        strokeOpacity: 0.35,
        strokeWeight: 0.9,
        fillColor: orange,
        fillOpacity: 0,
        clickable: false,
        zIndex: 14,
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

/**
 * Builds the SVG Data URL for the City Hall Landmark Marker badge.
 * Sleek, modern badge without a teardrop pin, containing only the refined City Hall icon.
 * Theme-aware: light mode has crisp white surface and dark/orange border; dark mode has deep navy and orange border.
 */
export function getCityHallMarkerSvg({
    sector = 'north',
    isDarkMode = true,
    orangeColor = null
} = {}) {
    const isNorth = sector?.toLowerCase() !== 'south';
    const orange = orangeColor || (isDarkMode ? '#ff6b00' : '#d95700');
    const bgFill = isDarkMode ? '#0c1424' : '#ffffff';
    const bgOpacity = isDarkMode ? '0.96' : '0.98';
    const shadowSlope = isDarkMode ? '0.5' : '0.22';
    const filterId = isNorth ? 'chIconShadowNorth' : 'chIconShadowSouth';

    const rawSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
            <defs>
                <filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
                    <feOffset dx="0" dy="2" result="offsetblur" />
                    <feComponentTransfer><feFuncA type="linear" slope="${shadowSlope}"/></feComponentTransfer>
                    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <circle cx="19" cy="19" r="16" fill="${bgFill}" fill-opacity="${bgOpacity}" stroke="${orange}" stroke-width="1.8" filter="url(#${filterId})" />
            
            <!-- City Hall Landmark Facade Icon Centered -->
            <g transform="translate(9, 9)" stroke="${orange}" stroke-linecap="round" stroke-linejoin="round">
                <!-- Classical Pediment Roof -->
                <polygon points="10 1, 19 6.5, 1 6.5" fill="${orange}" fill-opacity="0.28" stroke-width="1.3" />
                <line x1="1" y1="7.2" x2="19" y2="7.2" stroke-width="1.5" />
                <!-- 4 Stately Columns -->
                <line x1="3.8" y1="8.5" x2="3.8" y2="14.5" stroke-width="1.8" />
                <line x1="7.9" y1="8.5" x2="7.9" y2="14.5" stroke-width="1.8" />
                <line x1="12.1" y1="8.5" x2="12.1" y2="14.5" stroke-width="1.8" />
                <line x1="16.2" y1="8.5" x2="16.2" y2="14.5" stroke-width="1.8" />
                <!-- Steps / Foundation -->
                <line x1="2" y1="15.5" x2="18" y2="15.5" stroke-width="1.4" />
                <line x1="0.5" y1="18" x2="19.5" y2="18" stroke-width="1.8" />
            </g>
        </svg>
    `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(rawSvg)}`;
}

export {
    NORTH_CALOOCAN_CENTROID,
    SOUTH_CALOOCAN_CENTROID,
    COMBINED_CALOOCAN_BOUNDS
};
