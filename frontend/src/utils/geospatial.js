/**
 * PULSO Geospatial Utilities for Caloocan City
 * Ray-casting Point-in-Polygon boundary verification, Haversine distance calculations,
 * and district resolution.
 */
import { findBarangayByCoordinates } from '../data/caloocanBoundaries';

export const CALOOCAN_CENTERS = {
  north: { lat: 14.7565, lng: 121.0450, label: 'North Caloocan (City Hall North)' },
  south: { lat: 14.6500, lng: 120.9800, label: 'South Caloocan (City Hall South)' },
  default: { lat: 14.7565, lng: 121.0450 },
};

export const CALOOCAN_BOUNDS = {
  north: 14.8200,
  south: 14.6200,
  east: 121.1400,
  west: 120.9400,
};

/**
 * Point-in-Polygon Ray Casting algorithm
 * @param {number} lng - Longitude coordinate
 * @param {number} lat - Latitude coordinate
 * @param {Array<Array<[number, number]>>} polygonRings - GeoJSON Polygon rings (first is exterior)
 * @returns {boolean} True if point is inside the polygon
 */
export function isPointInPolygon(lng, lat, polygonRings) {
  if (!polygonRings || polygonRings.length === 0) return false;
  const exterior = polygonRings[0];
  if (!exterior || exterior.length < 3) return false;

  let inside = false;
  const n = exterior.length;

  let p1x = exterior[0][0]; // lng
  let p1y = exterior[0][1]; // lat

  for (let i = 1; i <= n; i++) {
    const p2 = exterior[i % n];
    const p2x = p2[0];
    const p2y = p2[1];

    if (lat > Math.min(p1y, p2y)) {
      if (lat <= Math.max(p1y, p2y)) {
        if (lng <= Math.max(p1x, p2x)) {
          let xints = p1x;
          if (p1y !== p2y) {
            xints = ((lat - p1y) * (p2x - p1x)) / (p2y - p1y) + p1x;
          }
          if (p1x === p2x || lng <= xints) {
            inside = !inside;
          }
        }
      }
    }
    p1x = p2x;
    p1y = p2y;
  }

  // If outside exterior, no need to check holes
  if (!inside) return false;

  // Check holes if any
  for (let h = 1; h < polygonRings.length; h++) {
    if (isPointInPolygon(lng, lat, [polygonRings[h]])) {
      return false; // Point falls inside an excluded hole
    }
  }

  return true;
}

/**
 * Checks if coordinates fall within the official bounding boxes of Caloocan North or South.
 * South Caloocan: Lat ~14.63 - 14.68, Lng ~120.95 - 121.01
 * North Caloocan: Lat ~14.69 - 14.82, Lng ~121.00 - 121.14
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
export function isInCaloocanBounds(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false;
  
  const inSouth = (lat >= 14.625 && lat <= 14.678) && (lng >= 120.950 && lng <= 121.012);
  const inNorth = (lat >= 14.685 && lat <= 14.820) && (lng >= 120.995 && lng <= 121.140);
  
  return inSouth || inNorth;
}

/**
 * Authoritative client-side jurisdictional boundary verification for Caloocan City.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Array} [customPolygons] - Optional loaded MultiPolygon array
 * @returns {boolean}
 */
export function isInCaloocan(lat, lng, customPolygons = null) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false;

  if (customPolygons && Array.isArray(customPolygons) && customPolygons.length > 0) {
    for (const poly of customPolygons) {
      if (isPointInPolygon(lng, lat, poly)) {
        return true;
      }
    }
    return false;
  }

  // Bounding box verification
  return isInCaloocanBounds(lat, lng);
}

/**
 * Determines Caloocan City district based on coordinates.
 * District 1 & 2: South Caloocan (south of latitude 14.685)
 * District 3: North Caloocan (north of latitude 14.685, e.g. Camarin, Tala, Bagong Silang, Deparo)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {number} District number (1 for South, 3 for North, 0 if out of bounds)
 */
export function getDistrictFromCoords(lat, lng) {
  if (!isInCaloocan(lat, lng)) return 0;
  if (lat >= 14.685) return 3;
  return 1;
}

/**
 * Returns human-readable District and Area label.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string}
 */
export function getDistrictLabel(lat, lng) {
  const district = getDistrictFromCoords(lat, lng);
  if (district === 3) return 'District 3 · North Caloocan';
  if (district === 1 || district === 2) return 'District 1/2 · South Caloocan';
  return 'Outside Caloocan City';
}

/**
 * Calculate Great-Circle distance between two coordinates in meters using the Haversine formula.
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in meters
 */
export function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => v === null || v === undefined || isNaN(v))) {
    return Infinity;
  }

  const R = 6371000; // Radius of the Earth in meters
  const toRad = deg => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Approximate Barangay detection heuristic for common Caloocan landmarks / coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Estimated Barangay name
 */
export function estimateBarangayFromCoords(lat, lng) {
  if (!isInCaloocan(lat, lng)) return '';

  const detected = findBarangayByCoordinates(lat, lng);
  if (detected) {
    return detected.displayName ? `${detected.name} (${detected.displayName})` : detected.name;
  }

  if (lat >= 14.77) return 'Barangay 176 (Bagong Silang)';
  if (lat >= 14.75) return 'Barangay 174 (Camarin)';
  if (lat >= 14.73) return 'Barangay 171 (Bagumbong)';
  if (lat >= 14.71) return 'Barangay 168 (Deparo)';
  if (lat >= 14.65) return 'Barangay 80 (Grace Park)';
  if (lat >= 14.64) return 'Barangay 12 (Monumento)';
  return 'Caloocan City';
}
