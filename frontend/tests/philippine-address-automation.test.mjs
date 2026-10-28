// Synthetic address labels at the public North Caloocan City Hall coordinate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const temporary = await mkdtemp(join(root, '.address-test-'));
const output = join(temporary, 'address.mjs');

await build({
    entryPoints: [join(root, '../src/utils/philippineAddress.js')],
    outfile: output,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external'
});

const {
    encodeOpenLocationCode,
    parseGeocodedAddress,
    parseAddressString,
    formatFullAddress,
    getPostalCodeForBarangay
} = await import(pathToFileURL(output));

test('philippineAddress: automated and accurate address formatting', async (t) => {
    t.after(async () => {
        await rm(temporary, { recursive: true, force: true });
    });

    await t.test('formats Google geocoder result with Plus Code, Example Road, Barangay 177, Caloocan, 1424, Philippines', () => {
        const lat = 14.7505408;
        const lng = 121.0540317;

        const mockGoogleResults = [
            {
                formatted_address: 'Q323+6J7, Example Road, Caloocan, Metro Manila, Philippines',
                address_components: [
                    { long_name: 'Example Road', short_name: 'Example Road', types: ['route'] },
                    { long_name: 'Caloocan', short_name: 'Caloocan', types: ['locality'] },
                    { long_name: 'Metro Manila', short_name: 'NCR', types: ['administrative_area_level_1'] },
                    { long_name: 'Philippines', short_name: 'PH', types: ['country'] }
                ]
            }
        ];

        const parsed = parseGeocodedAddress(mockGoogleResults, lat, lng, 'Q323+6J7');
        assert.equal(parsed.plusCode, 'Q323+6J7');
        assert.equal(parsed.barangay, 'Barangay 177');
        assert.equal(parsed.postalCode, '1424');
        assert.equal(parsed.street, 'Example Road');

        const formatted = formatFullAddress(parsed, { lat, lng });
        assert.equal(formatted, 'Q323+6J7, Example Road, Barangay 177, Caloocan, 1424 Metro Manila, Philippines');
    });

    await t.test('extracts Example Road from formatted_address even if address_components only had locality', () => {
        const lat = 14.7505408;
        const lng = 121.0540317;

        const mockMinimalResults = [
            {
                formatted_address: 'Q323+6J7, Example Road, Caloocan, Metro Manila, Philippines',
                address_components: [
                    { long_name: 'Caloocan', short_name: 'Caloocan', types: ['locality'] }
                ]
            }
        ];

        const parsed = parseGeocodedAddress(mockMinimalResults, lat, lng);
        assert.equal(parsed.plusCode, 'Q323+6J7');
        assert.equal(parsed.barangay, 'Barangay 177');
        assert.equal(parsed.postalCode, '1424');
        assert.equal(parsed.street, 'Example Road');

        const formatted = formatFullAddress(parsed, { lat, lng });
        assert.equal(formatted, 'Q323+6J7, Example Road, Barangay 177, Caloocan, 1424 Metro Manila, Philippines');
    });

    await t.test('parses raw geocoded string and enriches with barangay number and postal code', () => {
        const raw = 'Q323+6J7, Example Road, Caloocan, Metro Manila, Philippines';
        const parsed = parseAddressString(raw, 14.7505408, 121.0540317);

        assert.equal(parsed.plusCode, 'Q323+6J7');
        assert.equal(parsed.streetAddress, 'Example Road');
        assert.equal(parsed.barangay, 'Barangay 177');
        assert.equal(parsed.postalCode, '1424');

        const formatted = formatFullAddress(parsed, { lat: 14.7505408, lng: 121.0540317 });
        assert.equal(formatted, 'Q323+6J7, Example Road, Barangay 177, Caloocan, 1424 Metro Manila, Philippines');
    });

    await t.test('accurately maps postal code for various Caloocan barangays', () => {
        assert.equal(getPostalCodeForBarangay('Barangay 171'), '1421');
        assert.equal(getPostalCodeForBarangay('Barangay 174'), '1424');
        assert.equal(getPostalCodeForBarangay('Barangay 176'), '1428');
        assert.equal(getPostalCodeForBarangay('Barangay 12'), '1400');
    });
});
