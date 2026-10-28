import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import * as privacy from '../src/utils/locationPrivacy.js';
import { encodePlusCode, formatPlusCode } from '../src/utils/openLocationCode.js';

const root = dirname(fileURLToPath(import.meta.url));
const component = (value, ...types) => ({ long_name: value, types });
const syntheticResults = [{
    formatted_address: 'PRIVATE FORMATTED ADDRESS: Unit 88, Block 99 Lot 77',
    address_components: [
        component('88', 'street_number'), component('Unit 88', 'subpremise'),
        component('Block 99 Lot 77', 'premise'), component('Acacia Road', 'route'),
        component('Example City', 'locality'), component('Example Region', 'administrative_area_level_1'),
        component('Sample Province', 'administrative_area_level_2'),
        component('Philippines', 'country'),
    ],
}, { address_components: [
    component('Sample Village Phase 2', 'premise'), component('Sample Community', 'neighborhood'),
    component('Barangay Sample', 'administrative_area_level_3'), component('1234', 'postal_code'),
] }];

test('all results contribute typed public fields, with no formatted/private fields', () => {
    const address = privacy.parseGoogleDisplayAddress(syntheticResults, { global_code: '849VCWC8+R9' });
    assert.equal(address.plusCode, 'CWC8+R9');
    assert.equal(address.street, 'Acacia Road');
    assert.equal(address.subdivision, 'Sample Village Phase 2');
    assert.equal(address.neighborhood, 'Sample Community');
    assert.equal(address.barangay, 'Barangay Sample');
    assert.equal(address.postalCode, '1234');
    assert.equal(Object.hasOwn(address, 'province'), false);
    assert.equal(Object.hasOwn(address, 'country'), false);
    assert.deepEqual(privacy.displayAddressFields({ ...address, province: 'Sample Province', country: 'Philippines', extra: 'Excluded field' }).map(([field]) => field),
        ['plusCode', 'subdivision', 'neighborhood', 'street', 'barangay', 'city', 'postalCode', 'region']);
    assert.doesNotMatch(privacy.displayAddressText({ ...address, province: 'Sample Province', country: 'Philippines' }), /Sample Province|Philippines/);
    assert.doesNotMatch(JSON.stringify(address), /88|99|77|PRIVATE|formatted_address/);
});

test('missing values stay missing, and PH classification is not inferred from type alone', () => {
    assert.equal(privacy.displayAddressText(privacy.parseGoogleDisplayAddress([])), '');
    const address = privacy.parseGoogleDisplayAddress([{ address_components: [
        component('Sample Village', 'locality'), component('Private Residence', 'premise'),
        component('Uncertain area', 'administrative_area_level_3'),
    ] }]);
    assert.equal(address.subdivision, 'Sample Village');
    for (const key of ['city', 'barangay', 'region', 'postalCode']) assert.equal(address[key], '');
    const outside = privacy.parseGoogleDisplayAddress([{ address_components: [component('Tokyo', 'locality'), component('Japan', 'country')] }]);
    assert.equal(outside.city, 'Tokyo');
    assert.equal(Object.hasOwn(outside, 'country'), false);
    assert.doesNotMatch(privacy.displayAddressText(outside), /Caloocan|Metro Manila|1421/);
});

test('precise short Plus Codes are generated from each selected point using official encoding vectors', () => {
    // Reference: google/open-location-code/test_data/encoding.csv (11 digits).
    for (const [lat, lng, full] of [
        [20.3701125, 2.782234375, '7FG49QCJ+2VX'],
        [1, 1, '6FH32222+222'],
        [2.5, -64.23, '67JQGQ2C+222'],
        [-27, -122.3, '545V2P22+222'],
    ]) {
        assert.equal(encodePlusCode(lat, lng, false), full);
        assert.equal(encodePlusCode(lat, lng), full.slice(4));
    }
    assert.equal(formatPlusCode('849VCWC8+R9'), 'CWC8+R9');
    assert.equal(formatPlusCode('CWC8+R9 Sample City'), 'CWC8+R9');
    assert.equal(formatPlusCode('849VCW00+'), '');
    assert.equal(encodePlusCode(null, 1), '');
    assert.equal(encodePlusCode(91, 1), '');
    assert.equal(encodePlusCode(0, 180), encodePlusCode(0, -180));
    assert.notEqual(encodePlusCode(14.5, 121.5), encodePlusCode(14.6, 121.6));
    const fresh = privacy.normalizeDisplayAddress({ plusCode: '849VCW00+' }, { lat: 14.5, lng: 121.5 });
    assert.equal(fresh.plusCode, encodePlusCode(14.5, 121.5));
});

test('misclassified private labels and raw coordinates are rejected at the final display boundary', () => {
    for (const value of ['123 Acacia Road', 'Blk4 Lot16 Acacia', 'B4-L16', 'Apt 12', 'Unit7', 'Floor 2', 'House No. 1', '#12', '12-A', '12A', '<img src=x onerror=alert(1)>', '14.123456, 121.123456', 'Acacia\nUnit 1']) {
        assert.equal(privacy.safeAddressValue(value), '', value);
        assert.deepEqual(privacy.displayAddressFields({ street: value, houseNumber: '999', blockLot: 'Lot 4' }), [], value);
    }
    assert.equal(privacy.safeAddressValue('5th Avenue'), '5th Avenue');
    assert.equal(privacy.safeAddressValue('Road 2'), 'Road 2');
    assert.equal(privacy.safeAddressValue('Barangay 123'), 'Barangay 123');
});

test('legacy addresses and camera watermarks fail closed without falling back to full raw text', () => {
    const raw = '849VCWC8+R9, Sample Village, Blk 99 Lot 77 Acacia, Barangay Sample, Example City, 1234 Metro Manila, Philippines';
    const text = privacy.cleanResidentAddress(raw);
    assert.match(text, /CWC8\+R9/);
    assert.match(text, /Sample Village/);
    assert.match(text, /1234/);
    assert.doesNotMatch(text, /99|77/);
    assert.equal(privacy.formatWatermarkAddress({ houseNumber: '999', blockLot: 'Lot 77' }), '');
    assert.equal(privacy.cleanResidentAddress('123 Private Unclassified Residence'), '');
});

test('the actual evidence watermark renderer includes selected coordinates and omits residential identifiers', async () => {
    const bundled = await build({ entryPoints: [join(root, '../src/utils/watermark.js')], bundle: true, write: false, format: 'esm', platform: 'node' });
    const { drawEvidenceWatermark, formatWatermarkCoordinates } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
    const painted = [];
    const context = {
        measureText: value => ({ width: value.length * 8 }),
        strokeText: value => painted.push(value), fillText: value => painted.push(value),
        save() {}, restore() {},
    };
    drawEvidenceWatermark({ width: 1280, height: 960, getContext: () => context }, {
        structuredAddress: { plusCode: '849VCWC8+R9', street: 'Acacia Road', houseNumber: 'PRIVATE 88', blockLot: 'Lot 77' },
        location: { lat: 14.7566, lng: 121.045, accuracy: 15 }, timestamp: '2026-10-28T00:00:00Z',
    });
    assert.match(painted.join(' '), /Q24W\+J2R/);
    assert.match(painted.join(' '), /Acacia Road/);
    assert.match(painted.join(' '), /Lat 14\.756600 · Lng 121\.045000/);
    assert.doesNotMatch(painted.join(' '), /PRIVATE|Lot 77|CWC8\+R9/);
    assert.equal(formatWatermarkCoordinates({}), '');
    assert.equal(formatWatermarkCoordinates({ lat: 91, lng: 121 }), '');
    assert.equal(formatWatermarkCoordinates({ coordinates: { lat: 0, lng: -1.25 } }), 'Lat 0.000000 · Lng -1.250000');
});

test('rendered panel hides unavailable rows, escapes values, and supports English/Filipino states', async t => {
    const temporary = await mkdtemp(join(root, '.location-privacy-'));
    assert.equal(dirname(temporary), root);
    t.after(() => rm(temporary, { recursive: true, force: true }));
    const output = join(temporary, 'panel.mjs');
    await build({ entryPoints: [join(root, '../src/components/maps/LocationAddressPanel.jsx')], outfile: output,
        bundle: true, platform: 'node', format: 'esm', packages: 'external' });
    const { default: Panel } = await import(pathToFileURL(output));
    const resources = {};
    for (const language of ['en', 'tl']) resources[language] = JSON.parse(await readFile(join(root, `../src/locales/${language}.json`), 'utf8'));
    const i18n = createInstance();
    await i18n.init({ lng: 'en', resources, fallbackLng: 'en', interpolation: { escapeValue: false } });
    const render = props => renderToStaticMarkup(React.createElement(I18nextProvider, { i18n }, React.createElement(Panel, props)));
    const html = render({ address: { city: 'Example & Sample City', street: '<script>alert(1)</script>', houseNumber: '999', province: 'Sample Province', country: 'Philippines' } });
    assert.match(html, /Current location/);
    assert.match(html, /Example &amp; Sample City/);
    assert.doesNotMatch(html, /999|<script|Postal code|undefined|null|Sample Province|Philippines|Country|Residential identifiers|Address source/);
    assert.match(html, /<p class="[^"]*font-bold[^"]*">Example &amp; Sample City<\/p>/);
    assert.doesNotMatch(html, /<dt|<dd/);
    const fullAddress = privacy.parseGoogleDisplayAddress(syntheticResults, { global_code: '849VCWC8+R9' });
    assert.match(render({ address: fullAddress }), /<strong class="font-extrabold">CWC8\+R9<\/strong>, Sample Village Phase 2, Sample Community, Acacia Road, Barangay Sample, Example City, 1234, Example Region/);
    const coordinates = render({ coordinates: { lat: 0, lng: -121.123456 }, status: 'UNAVAILABLE' });
    assert.match(coordinates, /title="Latitude"/);
    assert.match(coordinates, /0\.000000/);
    assert.match(coordinates, /title="Longitude"/);
    assert.match(coordinates, /-121\.123456/);
    assert.match(coordinates, /aria-label="Copy latitude and longitude"/);
    assert.match(coordinates, /selected location is kept/);
    for (const invalid of [{ lat: 91, lng: 121 }, { lat: 14, lng: NaN }, { lat: '14', lng: 121 }, {}]) {
        assert.doesNotMatch(render({ coordinates: invalid }), /title="Latitude"|title="Longitude"/);
    }
    assert.match(render({ loading: true }), /aria-busy="true"/);
    assert.match(render({ status: 'REQUEST_DENIED' }), /selected location is kept/);
    await i18n.changeLanguage('tl');
    assert.match(render({ address: { city: 'Sample City' } }), /Kasalukuyang lokasyon/);
    const localizedCoordinates = render({ coordinates: { lat: 14.5, lng: 121.5 } });
    assert.match(localizedCoordinates, /title="Latitud"/);
    assert.match(localizedCoordinates, /14\.500000/);
    assert.match(localizedCoordinates, /title="Longhitud"/);
    assert.match(localizedCoordinates, /121\.500000/);
    assert.match(render({ status: 'UNAVAILABLE' }), /Nananatili ang napiling lokasyon/);
});

test('lookup shares in-flight work, falls back only to Google, and handles API failures/zero results', async () => {
    const result = await build({ entryPoints: [join(root, '../src/utils/reverseGeocode.js')], bundle: true,
        write: false, platform: 'node', format: 'esm', plugins: [{ name: 'api-stub', setup(builder) {
            builder.onResolve({ filter: /^\.\/apiFetch$/ }, () => ({ path: 'api-stub', namespace: 'stub' }));
            builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const apiFetch = (...args) => globalThis.__testApiFetch(...args);' }));
        } }] });
    const { reverseGeocodeLocation } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
    let complete;
    let calls = 0;
    globalThis.__testApiFetch = () => { calls += 1; return new Promise(resolve => { complete = resolve; }); };
    const first = reverseGeocodeLocation(14.5, 121.5);
    const second = reverseGeocodeLocation(14.5, 121.5);
    assert.strictEqual(first, second);
    complete({ ok: true, data: { status: 'OK', structuredAddress: { city: 'Example City', street: 'Unit 88', plusCode: '849VCWC8+R9' } } });
    assert.equal((await first).address, `${encodePlusCode(14.5, 121.5)}, Example City`);
    assert.equal(calls, 1);
    let browserCalls = 0;
    globalThis.window = { google: { maps: { Geocoder: class {
        geocode() { browserCalls += 1; return Promise.resolve({ results: syntheticResults, plus_code: { global_code: '849VCWC8+R9' } }); }
    } } } };
    globalThis.__testApiFetch = async () => ({ ok: false });
    assert.equal((await reverseGeocodeLocation(14.6, 121.6)).structuredAddress.street, 'Acacia Road');
    assert.equal(browserCalls, 1);
    globalThis.__testApiFetch = async () => ({ ok: true, data: { status: 'ZERO_RESULTS', structuredAddress: {} } });
    assert.equal((await reverseGeocodeLocation(14.7, 121.7)).status, 'ZERO_RESULTS');
    assert.equal(browserCalls, 1);
    globalThis.__testApiFetch = async () => { throw new Error('offline'); };
    globalThis.window.google.maps.Geocoder = class { geocode() { return Promise.reject({ code: 'REQUEST_DENIED' }); } };
    const failed = await reverseGeocodeLocation(14.8, 121.8);
    assert.equal(failed.status, 'REQUEST_DENIED');
    assert.equal(failed.address, encodePlusCode(14.8, 121.8));
    assert.equal((await reverseGeocodeLocation(Infinity, 121)).status, 'INVALID_REQUEST');
    delete globalThis.window;
    delete globalThis.__testApiFetch;
});
