import { GOOGLE_MAPS_LIBRARIES } from "../../utils/mapsConfig";
import { COMBINED_CALOOCAN_BOUNDS } from "../../data/caloocanBoundaries";

const CALOOCAN_CENTER = COMBINED_CALOOCAN_BOUNDS.center;

const CALOOCAN_CITY_HALL_NORTH_LOC = { lat: 14.7505408, lng: 121.0540317 };

// Zapote Rd North HQ
const CALOOCAN_CITY_HALL_SOUTH_LOC = { lat: 14.6469, lng: 120.9844 };

const LIBRARIES = GOOGLE_MAPS_LIBRARIES;

// Government-grade civic map styles (Zero POI/transit clutter, high contrast civic hierarchy)
const DARK_BASE_RULES = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0c1322" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0b111e" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#070b14" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }, { weight: 1 }] },
    { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
    { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#243247" }] },
];

const DARK_CIVIC_MAP_STYLE = [
    ...DARK_BASE_RULES,
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#293952" }, { weight: 1.5 }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#8193aa" }] },
    { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#1c283a" }, { weight: 1.2 }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "road.arterial", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#141d2c" }, { weight: 0.8 }] },
    { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#7b8ea5" }] },
    { featureType: "administrative.locality", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 3 }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#546478" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.stroke", stylers: [{ color: "#0c1322" }, { weight: 2 }] }
];

const LIGHT_BASE_RULES = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] },
];

const LIGHT_CIVIC_MAP_STYLE = [
    ...LIGHT_BASE_RULES,
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "administrative.locality", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 2 }] },
    { featureType: "administrative.province", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "administrative.province", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
    { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "administrative.country", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] }
];

export { DARK_CIVIC_MAP_STYLE, LIGHT_CIVIC_MAP_STYLE };
