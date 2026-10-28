// Open Location Code: five base-20 coordinate pairs, then a 5-by-4 grid.
// https://github.com/google/open-location-code
const ALPHABET = '23456789CFGHJMPQRVWX';

export function encodePlusCode(lat, lng, short = true) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return '';
    // Round sub-unit floating noise before flooring at exact cell boundaries.
    let latitude = Math.min(4499999999, Math.floor(Number((lat * 25000000).toFixed(6))) + 2250000000);
    let longitude = (Math.floor(Number((lng * 8192000).toFixed(6))) + 1474560000) % 2949120000;
    let grid = '';
    for (let position = 0; position < 5; position += 1) {
        grid = ALPHABET[(latitude % 5) * 4 + longitude % 4] + grid;
        latitude = Math.floor(latitude / 5);
        longitude = Math.floor(longitude / 4);
    }
    let pairs = '';
    for (let position = 0; position < 5; position += 1) {
        pairs = ALPHABET[latitude % 20] + ALPHABET[longitude % 20] + pairs;
        latitude = Math.floor(latitude / 20);
        longitude = Math.floor(longitude / 20);
    }
    const full = `${pairs.slice(0, 8)}+${pairs.slice(8)}${grid[0]}`;
    return short ? full.slice(4) : full;
}

/** Preserve real precise codes; do not turn an old padded area code into a pin. */
export function formatPlusCode(value) {
    if (typeof value !== 'string') return '';
    const match = value.toUpperCase().match(/(?:^|\s)([23456789CFGHJMPQRVWX]{4}(?:[23456789CFGHJMPQRVWX]{4})?\+[23456789CFGHJMPQRVWX]{2,7})(?=$|\s|,)/u);
    if (!match) return '';
    const code = match[1];
    return code.indexOf('+') === 8 ? code.slice(4) : code;
}
