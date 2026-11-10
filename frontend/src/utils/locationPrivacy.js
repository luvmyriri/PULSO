/** Public address components; precise location metadata is explicitly requested. */
import { encodePlusCode, formatPlusCode } from './openLocationCode.js';
import { getHaversineDistanceMeters } from './geoDistance.js';
const PRIVATE = /\b(?:bl(?:oc)?k|lot|unit|apartment|apt|flat|suite|room|rm|floor|flr|house|building|bldg|door|tower|condominium|condo|purok|sitio)(?:\b|(?=\d))|\bB\s*\d+\s*[-/]?\s*L\s*\d+\b|#|[<>]/iu;
const CODE = /\b[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,7}\b/giu;
const VILLAGE = /\b(?:village|subdivision|subd\.?|homes|heights|estate|ville|residential community)\b/iu;
const BARANGAY = /^(?:barangay|brgy\.?|bgy\.?)\s+\S/iu;
const DISPLAY_FIELDS = ['plusCode', 'subdivision', 'neighborhood', 'street', 'barangay', 'city', 'postalCode', 'region'];
const MAX_STREET_MATCH_METERS = 25;

// Reject ambiguous/private labels as a whole instead of guessing which words are public.
export function safeAddressValue(value) {
    if (typeof value !== 'string') return '';
    if (/[\n\r]/u.test(value)) return '';
    const text = value.trim().replace(/\s+/gu, ' ');
    if (!text || /^(?:undefined|null|address unavailable|lat(?:itude)?\s*:|lng\s*:|coordinates\s*:)/iu.test(text)) return '';
    if (PRIVATE.test(text) || /[,;\n\r]|\b\d{1,3}\.\d{3,}\b/u.test(text)) return '';
    // Keep numbered roads (Road 2, 5th Avenue), barangays and postal codes.
    if (/^\d+[A-Za-z]?(?:[-/]\w+)?\s/u.test(text) && !/^\d+(?:st|nd|rd|th)\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?)\b/iu.test(text)) return '';
    if (/^\d+[A-Za-z]$|^\d+[-/]\w+$/u.test(text)) return '';
    return text.replace(CODE, '').trim();
}

export function normalizeDisplayAddress(address = {}, coordinates = null) {
    const result = {};
    for (const field of DISPLAY_FIELDS.filter(field => field !== 'plusCode')) {
        result[field] = safeAddressValue(address?.[field]);
        if (field !== 'postalCode' && /^\d+$/u.test(result[field])) result[field] = '';
    }
    // Legacy objects may only contain streetAddress. It still passes the privacy filter.
    result.street = result.street || safeAddressValue(address?.streetAddress);
    if (/^\d+$/u.test(result.street)) result.street = '';
    result.streetAddress = result.street;
    result.plusCode = encodePlusCode(coordinates?.lat, coordinates?.lng) || formatPlusCode(address?.plusCode);
    result.houseNumber = '';
    result.blockLot = '';
    return result;
}

export function parseGoogleDisplayAddress(results, apiPlusCode = '') {
    const rows = Array.isArray(results) ? results : [];
    const components = rows.flatMap(row => Array.isArray(row?.address_components) ? row.address_components : []).filter(component => component && typeof component === 'object');
    const entries = components.map(component => ({
        value: safeAddressValue(component.long_name || component.short_name),
        types: Array.isArray(component.types) ? component.types : [],
    })).filter(component => component.value && !component.types.some(type => ['street_number', 'subpremise', 'floor', 'room', 'postal_code_suffix'].includes(type)));
    const first = (types, predicate = () => true) => entries.find(entry => types.some(type => entry.types.includes(type)) && predicate(entry.value))?.value || '';
    const political = ['sublocality', 'sublocality_level_1', 'sublocality_level_2', 'sublocality_level_3', 'sublocality_level_4', 'sublocality_level_5', 'neighborhood', 'administrative_area_level_3', 'administrative_area_level_4', 'locality'];
    const barangay = first(political, value => BARANGAY.test(value));
    const subdivision = first([...political, 'premise'], value => VILLAGE.test(value) && !BARANGAY.test(value));
    const neighborhood = first(['neighborhood', 'sublocality', 'sublocality_level_1', 'sublocality_level_2'], value => value !== barangay && value !== subdivision && !BARANGAY.test(value) && !VILLAGE.test(value));
    const city = first(['locality', 'postal_town'], value => !BARANGAY.test(value) && !VILLAGE.test(value))
        || first(['administrative_area_level_2', 'administrative_area_level_3'], value => /\b(?:city|municipality)\b/iu.test(value));
    const codes = [apiPlusCode?.global_code, typeof apiPlusCode === 'string' ? apiPlusCode : '', ...rows.map(row => row?.plus_code?.global_code), ...components.filter(c => c.types?.includes('plus_code')).map(c => c.long_name)];
    return normalizeDisplayAddress({
        plusCode: codes.map(formatPlusCode).find(Boolean) || '',
        subdivision, neighborhood, barangay, city,
        street: first(['route']),
        region: first(['administrative_area_level_1']),
        postalCode: first(['postal_code']),
    });
}

function parsePointAddress(results, lat, lng, apiPlusCode) {
    const nearby = [];
    const area = [];
    for (const row of results || []) {
        if (row.types?.some(type => type === 'political' || type === 'plus_code')) {
            area.push(row);
            continue;
        }
        const { location, location_type: type } = row.geometry || {};
        if (!['ROOFTOP', 'RANGE_INTERPOLATED'].includes(type)) continue;
        const rowLat = typeof location?.lat === 'function' ? location.lat() : location?.lat;
        const rowLng = typeof location?.lng === 'function' ? location.lng() : location?.lng;
        if (!Number.isFinite(rowLat) || !Number.isFinite(rowLng) || Math.abs(rowLat) > 90 || Math.abs(rowLng) > 180) continue;
        const distance = getHaversineDistanceMeters(lat, lng, rowLat, rowLng);
        if (distance <= MAX_STREET_MATCH_METERS) nearby.push({ row, distance });
    }
    nearby.sort((first, second) => first.distance - second.distance);
    const nearbyRows = nearby.map(({ row }) => row);
    const address = parseGoogleDisplayAddress([...nearbyRows, ...area], apiPlusCode);
    const streets = new Map();
    for (const row of nearbyRows) {
        for (const component of row.address_components || []) {
            if (!component.types?.includes('route')) continue;
            const name = safeAddressValue(component.long_name || component.short_name);
            if (name && !/^\d+$/u.test(name) && !streets.has(name.toLowerCase())) streets.set(name.toLowerCase(), name);
        }
    }
    const street = streets.size === 1 ? streets.values().next().value : '';
    return normalizeDisplayAddress({ ...address, street, streetAddress: street }, { lat, lng });
}

/** Old saved strings lack types. Retain only explicitly recognizable public fields. */
export function parseLegacyDisplayAddress(value, coordinates = null) {
    const address = {};
    if (typeof value !== 'string') return normalizeDisplayAddress(address, coordinates);
    for (const segment of value.split(',')) {
        const code = formatPlusCode(segment.trim());
        if (code) {
            address.plusCode = code;
            continue;
        }
        // A recognized ZIP/region pair is not an untyped house-number/street pair.
        const postalRegion = segment.trim().match(/^(\d{4})\s+(Metro Manila|NCR|National Capital Region)$/iu);
        if (postalRegion) {
            address.postalCode ||= postalRegion[1];
            address.region ||= postalRegion[2];
            continue;
        }
        const text = safeAddressValue(segment);
        if (!text) continue;
        if (BARANGAY.test(text)) address.barangay ||= text;
        else if (VILLAGE.test(text)) address.subdivision ||= text;
        else if (/\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|drive|dr\.?|highway|boulevard|lane)\b/iu.test(text)) address.street ||= text;
        else if (/^(?:\d{4,6})$/u.test(text)) address.postalCode ||= text;
        else if (/^(?:\d{4})\s+(?:Metro Manila|NCR|National Capital Region)$/iu.test(text)) {
            const [postal, ...region] = text.split(' ');
            address.postalCode ||= postal;
            address.region ||= region.join(' ');
        } else if (/^(?:Metro Manila|NCR|National Capital Region|Region\s+[\p{L}\d-]+)$/iu.test(text)) address.region ||= text;
        else if (/^(?:Philippines|United States|Japan|Canada|Australia)$/iu.test(text)) continue;
        else if (/\b(?:City|Municipality)\b/iu.test(text) || /^Caloocan$/iu.test(text)) address.city ||= text;
    }
    return normalizeDisplayAddress(address, coordinates);
}

export function displayAddressFields(address, coordinates = null, { preferAddress = false } = {}) {
    const safe = normalizeDisplayAddress(address, coordinates);
    const seen = new Set();
    const fields = DISPLAY_FIELDS.filter(field => {
        const value = safe[field];
        if (!value || seen.has(value.toLowerCase())) return false;
        seen.add(value.toLowerCase());
        return true;
    }).map(field => [field, safe[field]]);
    if (!preferAddress) return fields;

    const named = fields.filter(([field]) => field !== 'plusCode');
    const street = named.find(([field]) => field === 'street');
    if (street) return [street, ...named.filter(([field]) => field !== 'street')];
    return fields;
}

export function displayAddressText(address) {
    return displayAddressFields(address).map(([, value]) => value).join(', ');
}

// Compatibility exports for the existing address display call sites. Registry,
// jurisdiction and precise coordinate helpers remain in philippineAddress.js.
export const parseGeocodedAddress = (results, lat, lng, apiPlusCode = '') => parsePointAddress(results, lat, lng, apiPlusCode);
export const parseAddressString = value => parseLegacyDisplayAddress(value);
export const formatFullAddress = address => displayAddressText(address);
export const cleanResidentAddress = value => displayAddressText(parseLegacyDisplayAddress(value));
export const formatWatermarkAddress = (value, coordinates = null) => displayAddressText(typeof value === 'string' ? parseLegacyDisplayAddress(value, coordinates) : normalizeDisplayAddress(value, coordinates));
export function formatCardAddress(value) {
    const address = typeof value === 'string' ? parseLegacyDisplayAddress(value) : normalizeDisplayAddress(value);
    return displayAddressText({ ...address, region: '', postalCode: '' });
}
export function formatNearbyAddress(value) {
    const address = typeof value === 'string' ? parseLegacyDisplayAddress(value) : normalizeDisplayAddress(value);
    return [address.street || address.subdivision || address.neighborhood, address.barangay, address.city].filter(Boolean).join(', ');
}
export function formatNearbyIssueLocation(issue) {
    const value = issue?.location_string || issue?.location || issue?.address;
    const address = typeof value === 'string' ? parseLegacyDisplayAddress(value) : normalizeDisplayAddress(value);
    const barangay = safeAddressValue(issue?.barangay) || address.barangay;
    return {
        primary: address.street || address.subdivision || address.neighborhood || barangay || address.city || '',
        secondary: [barangay, address.city].filter(Boolean).join(', '),
    };
}
