import { getReportPhotoUrl } from "../../../utils/reportMedia";

function getDistance(loc1, loc2) {
    if (!loc1 || !loc2 || loc1.lat == null || loc1.lng == null || loc2.lat == null || loc2.lng == null) return null;
    if (window.google?.maps?.geometry?.spherical) {
        const p1 = new window.google.maps.LatLng(loc1.lat, loc1.lng);
        const p2 = new window.google.maps.LatLng(loc2.lat, loc2.lng);
        return window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    }
    const R = 6371e3;
    const phi1 = (loc1.lat * Math.PI) / 180;
    const phi2 = (loc2.lat * Math.PI) / 180;
    const deltaPhi = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const deltaLambda = ((loc2.lng - loc1.lng) * Math.PI) / 180;
    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatDistance(meters) {
    if (meters == null || isNaN(meters)) return null;
    if (meters < 1000) return `≈ ${Math.round(meters)} m`;
    return `≈ ${(meters / 1000).toFixed(1)} km`;
}

// Format date helper: "Oct 27, 2026"
function formatDate(dateStr) {
    if (!dateStr) {
        return new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            return new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

const getReportPhoto = getReportPhotoUrl;

export { getDistance, formatDistance, formatDate, getReportPhoto };
