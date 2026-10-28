import { apiFetch } from './apiFetch';
import { parseGeocodedAddress, formatFullAddress, normalizeDisplayAddress } from './locationPrivacy';

// Share concurrent lookups (dashboard, wizard, camera). Do not persist Google data.
const pending = new Map();

export function reverseGeocodeLocation(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return Promise.resolve({ structuredAddress: normalizeDisplayAddress(), address: '', status: 'INVALID_REQUEST' });
    }
    const key = `${lat},${lng}`;
    if (pending.has(key)) return pending.get(key);
    const request = lookup(lat, lng).finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
}

async function lookup(lat, lng) {
    let status = 'UNAVAILABLE';
    try {
        const response = await apiFetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`, { timeout: 7000, cache: 'no-store' });
        status = response.data?.status || status;
        if (response.ok && response.data?.structuredAddress && status === 'OK') {
            const structuredAddress = normalizeDisplayAddress(response.data.structuredAddress, { lat, lng });
            return { structuredAddress, address: formatFullAddress(structuredAddress), status };
        }
        // ZERO_RESULTS is a completed lookup; another Google request cannot add data.
        if (response.ok && ['ZERO_RESULTS', 'OVER_QUERY_LIMIT', 'OVER_DAILY_LIMIT', 'INVALID_REQUEST'].includes(status)) {
            const structuredAddress = normalizeDisplayAddress(response.data.structuredAddress, { lat, lng });
            return { structuredAddress, address: formatFullAddress(structuredAddress), status };
        }
    } catch {
        // The existing browser key may still work when the server is unavailable.
    }
    if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
        let timer;
        try {
            const response = await Promise.race([
                new window.google.maps.Geocoder().geocode({ location: { lat, lng }, fulfillOnZeroResults: true }),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('TIMEOUT')), 5000); }),
            ]);
            const structuredAddress = parseGeocodedAddress(response.results, lat, lng, response.plus_code);
            return { structuredAddress, address: formatFullAddress(structuredAddress), status: response.results?.length ? 'OK' : 'ZERO_RESULTS' };
        } catch (error) {
            status = typeof error?.code === 'string' ? error.code : 'UNAVAILABLE';
        } finally {
            clearTimeout(timer);
        }
    }
    // GPS and the local Plus Code still work when Google address lookup fails.
    const structuredAddress = parseGeocodedAddress([], lat, lng);
    return { structuredAddress, address: formatFullAddress(structuredAddress), status };
}
