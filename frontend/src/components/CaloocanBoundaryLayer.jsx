import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PolygonF, MarkerF, useGoogleMap } from '@react-google-maps/api';
import caloocanBorderData from '../data/caloocan_border.json';
import {
    NORTH_CALOOCAN_PATH,
    SOUTH_CALOOCAN_PATH,
    NORTH_CALOOCAN_CENTROID,
    SOUTH_CALOOCAN_CENTROID
} from '../data/caloocanBoundaries';
import {
    getPulsoOrange,
    getSectorPolygonStyle,
    getBarangayPolygonStyle,
    getSectorLabelSvg
} from '../config/boundaryStyle';
import { API_BASE_URL } from '../utils/apiBase';
import { apiFetch } from '../utils/apiFetch';

const BORDER_CACHE_KEY = 'pulso_cached_boundary_v1';

/**
 * Shared in-memory cache for parsed barangay paths to eliminate repetitive parsing.
 */
let cachedBarangayFeatures = null;

function parseBarangayFeatures(features) {
    if (!features || !Array.isArray(features)) return [];
    return features.map((feature, i) => {
        const props = feature.properties || {};
        const sector = props.sector || 'South';
        const isNorth = sector.toLowerCase() === 'north';
        const paths = feature.geometry?.type === 'MultiPolygon'
            ? feature.geometry.coordinates.map(poly => poly[0].map(c => ({ lng: c[0], lat: c[1] })))
            : feature.geometry?.coordinates?.[0]
                ? [feature.geometry.coordinates[0].map(c => ({ lng: c[0], lat: c[1] }))]
                : [];
        return {
            id: props.ADM4_PCODE || props.brgy_num || `brgy-${i}`,
            isNorth,
            sector: isNorth ? 'north' : 'south',
            displayName: props.display_name || props.ADM4_EN || `Brgy. ${props.brgy_num || i}`,
            paths
        };
    }).filter(b => b.paths.length > 0);
}

/**
 * CaloocanBoundaryLayer
 *
 * Universal boundary component for North and South Caloocan.
 * Renders the authoritative two-sector boundaries, barangay lines,
 * and centroid labels using PULSO's unified orange design tokens.
 *
 * Used across:
 * - Today page (Municipal Sector Distribution map)
 * - Dispatcher Command Center map
 * - Resident Nearby Hazards / Map modal
 * - Analytics GIS maps
 */
export default function CaloocanBoundaryLayer({
    activeSector = 'all',
    onSectorClick,
    zoom,
    showBarangays = true,
    showLabels = true,
    isDarkMode = true,
    interactive = true
}) {
    const map = useGoogleMap();
    const [borderData, setBorderData] = useState(() => {
        try {
            const cached = sessionStorage.getItem(BORDER_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.features?.length > 0) return parsed;
            }
        } catch (_) {}
        return caloocanBorderData;
    });
    const [hoveredSector, setHoveredSector] = useState(null);
    const [orangeColor, setOrangeColor] = useState(getPulsoOrange);

    // Credit the server's jurisdiction reference without attributing the
    // legacy visual barangay overlay to that separate dataset.
    useEffect(() => {
        if (!map || !window.google?.maps?.ControlPosition) return undefined;
        const credit = document.createElement('a');
        credit.className = `pulso-boundary-source-credit${isDarkMode ? ' is-dark' : ''}`;
        credit.href = 'https://www.geoboundaries.org/api/current/gbOpen/PHL/ADM3/';
        credit.target = '_blank';
        credit.rel = 'noopener noreferrer';
        credit.textContent = 'Jurisdiction reference: geoBoundaries / NAMRIA / PSA / OCHA · CC BY 3.0 IGO';
        credit.setAttribute('aria-label', 'Caloocan jurisdiction reference: geoBoundaries, NAMRIA, PSA and OCHA; Creative Commons Attribution 3.0 IGO. Opens source details in a new tab.');
        const controls = map.controls[window.google.maps.ControlPosition.TOP_CENTER];
        controls.push(credit);
        return () => {
            const index = controls.getArray().indexOf(credit);
            if (index >= 0) controls.removeAt(index);
        };
    }, [map, isDarkMode]);

    // Sync orange color with theme token dynamically
    useEffect(() => {
        setOrangeColor(getPulsoOrange());
    }, [isDarkMode]);

    // Fetch authoritative live border if available, fallback to bundled data
    useEffect(() => {
        let isMounted = true;
        if (!cachedBarangayFeatures) {
            apiFetch('/api/geo/caloocan-border', { skipAuth: true, timeout: 6000 })
                .then(res => {
                    if (isMounted && res.ok && res.data?.features?.length > 0) {
                        cachedBarangayFeatures = parseBarangayFeatures(res.data.features);
                        setBorderData(res.data);
                        try {
                            sessionStorage.setItem(BORDER_CACHE_KEY, JSON.stringify(res.data));
                        } catch (_) {}
                    }
                })
                .catch(() => {
                    // Silently retain bundled fallback
                });
        }
        return () => { isMounted = false; };
    }, []);

    // Pre-parse and memoize all 188 barangay polygons
    const barangayList = useMemo(() => {
        if (!cachedBarangayFeatures) {
            cachedBarangayFeatures = parseBarangayFeatures(borderData?.features || caloocanBorderData?.features);
        }
        return cachedBarangayFeatures;
    }, [borderData]);

    // Zoom-level filtering: if zoom prop is provided, fade in barangay lines from medium zoom (>= 12)
    const shouldRenderBarangays = useMemo(() => {
        if (!showBarangays) return false;
        if (typeof zoom === 'number') {
            return zoom >= 12;
        }
        return true;
    }, [showBarangays, zoom]);

    // Polygon styles memoized by active sector, dark mode, and hover state
    const northSectorStyle = useMemo(() => getSectorPolygonStyle({
        sector: 'north',
        activeSector,
        isDarkMode,
        isHovered: hoveredSector === 'north',
        customOrange: orangeColor
    }), [activeSector, isDarkMode, hoveredSector, orangeColor]);

    const southSectorStyle = useMemo(() => getSectorPolygonStyle({
        sector: 'south',
        activeSector,
        isDarkMode,
        isHovered: hoveredSector === 'south',
        customOrange: orangeColor
    }), [activeSector, isDarkMode, hoveredSector, orangeColor]);

    const northBarangayStyle = useMemo(() => getBarangayPolygonStyle({
        sector: 'north',
        activeSector,
        isDarkMode,
        customOrange: orangeColor
    }), [activeSector, isDarkMode, orangeColor]);

    const southBarangayStyle = useMemo(() => getBarangayPolygonStyle({
        sector: 'south',
        activeSector,
        isDarkMode,
        customOrange: orangeColor
    }), [activeSector, isDarkMode, orangeColor]);

    // Label SVG Icons for Centroids
    const northLabelIcon = useMemo(() => {
        if (typeof window === 'undefined' || !window.google?.maps) return undefined;
        return {
            url: getSectorLabelSvg({ sector: 'north', isDarkMode, orangeColor }),
            anchor: new window.google.maps.Point(67, 16)
        };
    }, [isDarkMode, orangeColor]);

    const southLabelIcon = useMemo(() => {
        if (typeof window === 'undefined' || !window.google?.maps) return undefined;
        return {
            url: getSectorLabelSvg({ sector: 'south', isDarkMode, orangeColor }),
            anchor: new window.google.maps.Point(67, 16)
        };
    }, [isDarkMode, orangeColor]);

    const handleNorthClick = useCallback(() => {
        if (interactive && onSectorClick) onSectorClick('north');
    }, [interactive, onSectorClick]);

    const handleSouthClick = useCallback(() => {
        if (interactive && onSectorClick) onSectorClick('south');
    }, [interactive, onSectorClick]);

    return (
        <>
            {/* ── 1. Detailed Barangay Polygons (188 Barangays, 1px lines) ── */}
            {shouldRenderBarangays && barangayList.map((brgy) => {
                const polygonOpts = brgy.isNorth ? northBarangayStyle : southBarangayStyle;
                return brgy.paths.map((path, pi) => (
                    <PolygonF
                        key={`caloocan-brgy-${brgy.id}-${pi}`}
                        paths={path}
                        options={polygonOpts}
                    />
                ));
            })}

            {/* ── 2. North Caloocan Sector Perimeter ── */}
            <PolygonF
                key="caloocan-sector-perimeter-north"
                paths={NORTH_CALOOCAN_PATH}
                options={northSectorStyle}
                onClick={handleNorthClick}
                onMouseOver={() => interactive && setHoveredSector('north')}
                onMouseOut={() => interactive && setHoveredSector(null)}
            />

            {/* ── 3. South Caloocan Sector Perimeter ── */}
            <PolygonF
                key="caloocan-sector-perimeter-south"
                paths={SOUTH_CALOOCAN_PATH}
                options={southSectorStyle}
                onClick={handleSouthClick}
                onMouseOver={() => interactive && setHoveredSector('south')}
                onMouseOut={() => interactive && setHoveredSector(null)}
            />

            {/* ── 4. Sector Centroid Labels (Matching Command Center Pills) ── */}
            {showLabels && northLabelIcon && (
                <MarkerF
                    key="caloocan-label-north"
                    position={NORTH_CALOOCAN_CENTROID}
                    zIndex={120}
                    options={{
                        clickable: Boolean(interactive && onSectorClick),
                        optimized: true,
                        opacity: activeSector === 'south' ? 0.45 : 1.0
                    }}
                    icon={northLabelIcon}
                    onClick={handleNorthClick}
                />
            )}

            {showLabels && southLabelIcon && (
                <MarkerF
                    key="caloocan-label-south"
                    position={SOUTH_CALOOCAN_CENTROID}
                    zIndex={120}
                    options={{
                        clickable: Boolean(interactive && onSectorClick),
                        optimized: true,
                        opacity: activeSector === 'north' ? 0.45 : 1.0
                    }}
                    icon={southLabelIcon}
                    onClick={handleSouthClick}
                />
            )}
        </>
    );
}
