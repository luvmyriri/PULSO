// Headless component integration test. Google Maps, GPS and geocoding are test doubles.
// Run after npm run build. Set PLAYWRIGHT_MODULE_PATH if Playwright is not local.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const frontend = resolve(here, '..');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const entry = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createInstance} from 'i18next';
import {I18nextProvider} from 'react-i18next';
import Panel from './src/components/maps/LocationAddressPanel.jsx';
import MapStep from './src/components/report-wizard/Step2LocationMap.jsx';
import CameraStep from './src/components/report-wizard/Step2CameraLocation.jsx';
import QuickReport from './src/components/QuickReportWizardModal.jsx';
import CameraModal from './src/components/IDCameraModal.jsx';
import en from './src/locales/en.json';
import tl from './src/locales/tl.json';
const params = new URLSearchParams(location.search);
const i18n = createInstance();
await i18n.init({lng:params.get('lang')||'en',resources:{en,tl},fallbackLng:'en',interpolation:{escapeValue:false}});
const address = { plusCode:'849VCWC8+R9',subdivision:'Sample Village Phase 2',neighborhood:'Sample Community',street:'Acacia Road',barangay:'Barangay Sample',city:'Example City',region:'Example Region',postalCode:'1234',country:'Philippines',houseNumber:'PRIVATE 88',blockLot:'PRIVATE 99' };
function App(){
 const [locationData, onLocationChange] = useState({});
 const [evidenceData, onEvidenceChange] = useState({});
 window.__locationState = locationData;
 const mode=params.get('mode');
 return <I18nextProvider i18n={i18n}>
  <p className="text-xs mb-3">Synthetic test data · GPS/Google Maps test doubles</p>
  {mode==='map' ? <MapStep isMapLoaded locationData={locationData} onLocationChange={onLocationChange} onBack={()=>{}} onContinue={()=>{}} />
   : mode==='camera' ? <CameraStep locationData={locationData} onLocationChange={onLocationChange} evidenceData={evidenceData} onEvidenceChange={onEvidenceChange} onBack={()=>{}} onContinue={()=>{}} />
   : mode==='quick' ? <QuickReport isOpen onClose={()=>{}} theme={window.__theme} structuredAddress={address} reportLocation={{lat:14.7566,lng:121.045,accuracy:15}} />
   : mode==='viewfinder' ? <CameraModal isOpen side="ISSUE" onClose={()=>{}} onCapture={()=>{}} metadata={{structuredAddress:address,location:{lat:14.7566,lng:121.045,accuracy:15}}} />
   : <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4"><Panel address={address} status="OK" /></div>}
 </I18nextProvider>;
}
createRoot(document.getElementById('root')).render(<App/>);
`;
const mapDouble = `
import React,{useEffect} from 'react';
export function GoogleMap({children,onLoad,onClick,center,zoom}){
 useEffect(()=>{onLoad?.({panTo:p=>window.__mapEvents.push(['panTo',p]),setZoom:z=>window.__mapEvents.push(['setZoom',z])});},[]);
 return <div data-testid="map" data-lat={center.lat} data-lng={center.lng} data-zoom={zoom} style={{minHeight:300}}>
 <p>Google Maps test double</p><button data-testid="select-pin" onClick={()=>onClick({latLng:{lat:()=>window.__nextPin.lat,lng:()=>window.__nextPin.lng}})}>Select synthetic map point</button>{children}</div>;
}
export function MarkerF({position}){return <span data-testid="marker" data-lat={position.lat} data-lng={position.lng}>Selected marker (test double)</span>}
`;
const output = await build({ stdin: { contents: entry, resolveDir: frontend, sourcefile: 'privacy-browser-fixture.jsx', loader: 'jsx' },
    bundle: true, format: 'esm', write: false, define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{"DEV":true,"VITE_API_BASE_URL":""}' },
    plugins: [{ name: 'component-test-doubles', setup(builder) {
        builder.onResolve({ filter: /^@react-google-maps\/api$/ }, () => ({ path: 'maps', namespace: 'test' }));
        builder.onResolve({ filter: /ThemeContext$/ }, () => ({ path: 'theme', namespace: 'test' }));
        builder.onResolve({ filter: /IDCameraModal$/ }, () => ({ path: 'camera', namespace: 'test' }));
        builder.onResolve({ filter: /^\.\/apiFetch$/ }, () => ({ path: 'api', namespace: 'test' }));
        builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'jsx', resolveDir: frontend, contents:
            args.path === 'maps' ? mapDouble : args.path === 'theme' ? 'export const useTheme=()=>({theme:window.__theme});'
            : args.path === 'camera' ? 'export default function Camera(){return null;}'
            : 'export const apiFetch=(...args)=>window.__mockLookup(...args);' }));
    } }] });
const assets = join(frontend, 'dist/assets');
const cssFile = (await readdir(assets)).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssFile, 'Run npm run build before this test.');
const css = await readFile(join(assets, cssFile));
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><main id="root" style="max-width:800px;margin:auto;padding:16px"></main><script type="module" src="/fixture.js"></script></body></html>';
const server = createServer((req, res) => {
    const script = req.url === '/fixture.js';
    const style = req.url === '/style.css';
    res.setHeader('Content-Type', script ? 'text/javascript' : style ? 'text/css' : 'text/html');
    res.end(script ? output.outputFiles[0].text : style ? css : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
const screenshots = resolve(frontend, '../docs/location-privacy/evidence');
await mkdir(screenshots, { recursive: true });
try {
    browser = await chromium.launch({ headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
        window.__theme = new URLSearchParams(location.search).get('theme') || 'light';
        document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.toggle('dark', window.__theme === 'dark'));
        window.__mapEvents = [];
        window.__calls = [];
        window.__watermarkText = [];
        const fillText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (...args) {
            window.__watermarkText.push(String(args[0]));
            return fillText.apply(this, args);
        };
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
            writeText: async text => { window.__copiedCoordinates = text; },
        } });
        window.__gps = { coords: { latitude: 14.7566, longitude: 121.045, accuracy: 15 }, timestamp: Date.now() };
        Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
            getCurrentPosition(success, error) { window.__gpsError ? error({ code: window.__gpsError }) : success(window.__gps); },
            watchPosition(success) { window.__watch = success; return 1; }, clearWatch() { window.__watch = null; },
        } });
        window.__mockLookup = async endpoint => {
            window.__calls.push(endpoint);
            const result = window.__backend || { status: 'OK', structuredAddress: { city: 'Example City', street: 'Acacia Road', houseNumber: 'PRIVATE 88' } };
            const delay = window.__delay || 0;
            await new Promise(resolve => setTimeout(resolve, delay));
            return { ok: true, data: result };
        };
    });
    // Test the shipped map component: GPS sets state and recenters before lookup fails.
    await page.goto(`${base}?mode=map`);
    await page.waitForTimeout(500);
    assert.deepEqual(errors, [], 'The component fixture must mount without runtime errors.');
    await page.evaluate(() => { window.__backend = { status: 'REQUEST_DENIED' }; });
    await page.getByRole('button', { name: 'Use my location', exact: true }).click();
    await page.waitForFunction(() => window.__mapEvents.some(([type]) => type === 'panTo'));
    assert.deepEqual(await page.evaluate(() => window.__mapEvents), [['panTo', { lat: 14.7566, lng: 121.045 }], ['setZoom', 16]]);
    await page.getByText(/Address details are unavailable or incomplete/).waitFor();
    await page.getByRole('button', { name: 'Copy latitude and longitude', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__copiedCoordinates), '14.756600, 121.045000');
    await page.getByRole('button', { name: 'Coordinates copied', exact: true }).waitFor();
    assert.equal(await page.getByTestId('marker').getAttribute('data-lat'), '14.7566');
    const calls = await page.evaluate(() => window.__calls.length);
    await page.waitForTimeout(1100);
    assert.equal(await page.evaluate(() => window.__calls.length), calls, 'Parent rerenders must not trigger a geocoding loop.');
    await page.evaluate(() => { window.__gpsError = 1; });
    await page.getByRole('button', { name: 'Resync GPS', exact: true }).click();
    assert.equal(await page.getByTestId('marker').getAttribute('data-lat'), '14.7566');

    // Stale geocoder responses cannot overwrite a newer map selection.
    await page.evaluate(() => { window.__backend = { status: 'OK', structuredAddress: { city: 'OLD City' } }; window.__delay = 1800; window.__nextPin = { lat: 14.75, lng: 121.04 }; });
    await page.getByTestId('select-pin').click();
    await page.waitForFunction(() => window.__calls.some(value => value.includes('lat=14.75&')));
    await page.evaluate(() => { window.__backend = { status: 'OK', structuredAddress: { city: 'NEW City' } }; window.__delay = 0; window.__nextPin = { lat: 14.76, lng: 121.05 }; });
    await page.getByTestId('select-pin').click();
    await page.getByText(/NEW City$/).waitFor();
    await page.waitForTimeout(1900);
    assert.equal(await page.getByText(/OLD City/).count(), 0);
    assert.equal(await page.getByTestId('marker').getAttribute('data-lat'), '14.76');

    // The camera-first step auto-acquires GPS without waiting for the address.
    await page.goto(`${base}?mode=camera`);
    await page.waitForFunction(() => window.__locationState.lat === 14.7566 && window.__locationState.addressStatus === 'OK');
    assert.equal(await page.getByText('PRIVATE 88', { exact: true }).count(), 0);

    for (const language of ['en', 'tl']) for (const theme of ['light', 'dark']) {
        await page.setViewportSize({ width: 320, height: 860 });
        await page.goto(`${base}?mode=panel&lang=${language}&theme=${theme}`);
        await page.getByRole('heading', { name: language === 'en' ? 'Current location' : 'Kasalukuyang lokasyon' }).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        const text = await page.locator('body').innerText();
        assert.doesNotMatch(text, /PRIVATE|undefined|null/);
        await page.screenshot({ path: join(screenshots, `panel-${language}-${theme}-320.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 640, height: 920 });
    await page.goto(`${base}?mode=quick`);
    await page.getByRole('heading', { name: 'Current location', exact: true }).waitFor();
    const quickReportText = await page.locator('body').innerText();
    assert.doesNotMatch(quickReportText, /PRIVATE/);
    assert.match(quickReportText, /Q24W\+J2R/);
    assert.match(quickReportText, /Lat 14\.756600 · Lng 121\.045000/);
    const row = page.locator('[data-location-coordinates]');
    const rowPositions = await row.locator(':scope > *').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return rect.y + rect.height / 2; }));
    assert.ok(Math.max(...rowPositions) - Math.min(...rowPositions) < 3, 'Coordinates, copy button and accuracy badge share one row.');
    await page.getByRole('button', { name: 'Copy latitude and longitude', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__copiedCoordinates), '14.756600, 121.045000');
    await page.screenshot({ path: join(screenshots, 'quick-report-light-640.png'), fullPage: true });
    // Use Chrome's synthetic camera; never access the user's actual camera.
    await page.goto(`${base}?mode=viewfinder&theme=dark`);
    await page.getByText('Starting camera...', { exact: true }).waitFor({ state: 'hidden', timeout: 20000 });
    await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
    const zoom = page.getByRole('button', { name: 'Zoom 1x', exact: true });
    await zoom.waitFor();
    const zoomBounds = await zoom.boundingBox();
    assert.ok(zoomBounds.y < 150, 'Zoom presets belong in the top camera bar.');
    assert.equal(await page.getByRole('button', { name: 'Zoom 2x', exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Zoom 2x', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('button[aria-label="Zoom 2x"]')?.className.includes('bg-white text-black'));
    await page.waitForTimeout(250);
    await page.waitForFunction(() => window.__watermarkText.some(text => text.includes('Lat 14.756600 · Lng 121.045000')));
    await page.screenshot({ path: join(screenshots, 'camera-top-zoom-watermark-640.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS: GPS recentering, lookup failure/denial, stale-response protection, precise Plus Codes, coordinate copying, one-row GPS metadata, bilingual themes, top-bar zoom, and live watermark coordinates.');
} finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
}
