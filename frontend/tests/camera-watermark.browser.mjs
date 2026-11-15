// Actual camera UI, synthetic Chrome camera/GPS, and a stub analysis service.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = process.cwd();
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import {createInstance} from 'i18next';
import {I18nextProvider} from 'react-i18next';
import Camera from './src/components/IDCameraModal.jsx';
import {syncNativeSystemBars} from './src/utils/nativeSystemBars.js';
import en from './src/locales/en.json';
import tl from './src/locales/tl.json';
const params=new URLSearchParams(location.search);
Capacitor.isNativePlatform=()=>true;
Capacitor.getPlatform=()=>'android';
const i18n=createInstance();
await i18n.init({lng:params.get('lang')||'en',resources:{en,tl},interpolation:{escapeValue:false}});
createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}>
 <Camera isOpen side={params.get('side')||'ISSUE'} ratioOverride={params.get('ratio')||undefined}
 onClose={()=>{}} onCapture={file=>{window.__capture={size:file.size,type:file.type,receipt:file.pulsoCapture};}}
 metadata={params.get('scenario')==='selected'?{location:{lat:14.75,lng:121.05,source:'selected-map',address:{street:'Sample Road',houseNumber:'PRIVATE 88',city:'Caloocan City'}}}:undefined}/>
</I18nextProvider>);
syncNativeSystemBars('#000000');
`;
const result = await build({ stdin: { contents: entry, resolveDir: root, loader: 'jsx' }, bundle: true,
    format: 'esm', jsx: 'automatic', write: false, define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{"DEV":true,"VITE_API_BASE_URL":""}' } });
const css = await readFile(join(root, 'dist/assets', (await readdir(join(root, 'dist/assets'))).find(name => /^index-.*\.css$/.test(name))));
const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/fixture.js' ? 'text/javascript' : req.url === '/style.css' ? 'text/css' : 'text/html');
    res.end(req.url === '/fixture.js' ? result.outputFiles[0].text : req.url === '/style.css' ? css
        : '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>');
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
await mkdir('../scratch/native-report-entry/watermark', { recursive: true });
try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/reports/analyze', route => route.fulfill({ json: {} }));
    await page.addInitScript(() => {
        window.androidBridge = {};
        window.__barCalls = [];
        window.Capacitor = {
            isNativePlatform: () => true,
            PluginHeaders: [{ name: 'PulsoAppearance', methods: [{ name: 'setSystemBars', rtype: 'promise' }] }],
            nativePromise: async (plugin, method, options) => {
                if (plugin === 'PulsoAppearance') {
                    window.__barCalls.push(options);
                    document.documentElement.style.setProperty('--pulso-safe-top', '24px');
                    document.documentElement.style.setProperty('--pulso-safe-bottom', '24px');
                }
                return {};
            },
        };
        window.__paintedText = [];
        const fillText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (...args) { window.__paintedText.push(args[0]); return fillText.apply(this, args); };
        const scenario = new URLSearchParams(location.search).get('scenario');
        Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
            watchPosition(success, failure) { setTimeout(() => scenario === 'denied' ? failure({ code: 1 }) : success({
                timestamp: Date.now() - (scenario === 'stale' ? 300000 : 0), coords: { latitude: 14.7566, longitude: 121.045, accuracy: 14.321000099182129 },
            }), 20); return 1; }, clearWatch() {},
        } });
    });
    for (const [width, height] of [[320, 640], [360, 740], [390, 844], [412, 915]]) {
        await page.setViewportSize({ width, height });
        for (const language of ['en', 'tl']) for (const ratio of ['4:3', '16:9', '1:1', 'Full']) {
            await page.goto(`${base}?scenario=device&lang=${language}&ratio=${encodeURIComponent(ratio)}`);
            const watermark = page.locator('[data-camera-watermark]');
            await watermark.waitFor();
            await page.waitForFunction(() => document.querySelector('[data-camera-watermark]')?.textContent.includes('121.045000'));
            const text = await watermark.innerText();
            assert.match(text, /PULSO/);
            assert.match(text, /±14m/);
            assert.doesNotMatch(text, /undefined|null|PRIVATE|NaN/);
            assert.doesNotMatch(text, /Selected issue location|Napiling lokasyon ng problema/);
            assert.equal(await watermark.evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
            assert.notEqual(await watermark.evaluate(node => getComputedStyle(node).textShadow), 'none');
            assert.equal(await page.locator('[data-camera-live-controls]').evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
            for (const name of ['Switch camera', 'Take photo', 'Turn flash on']) {
                const control=page.getByRole('button', { name, exact: true });
                assert.equal(await control.evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
                const box=await control.boundingBox();
                assert.ok(box.width >= 44 && box.height >= 44);
            }
            assert.equal(await watermark.getAttribute('aria-hidden'), null, 'Watermark metadata remains readable to assistive technology.');
            assert.doesNotMatch(await page.locator('footer').innerText(), /Device estimate|Reported accuracy|Requesting a device|Naitala ang tantiya|Iniulat na accuracy|Humihingi ng tantiya/,
                'Location details appear only in the watermark.');
            const geometry = await watermark.evaluate(node => {
                const box=node.getBoundingClientRect(), frame=node.parentElement.getBoundingClientRect();
                const deck=node.closest('[role="dialog"]').querySelector('footer').getBoundingClientRect();
                return { x:box.x, y:box.y, right:box.right, bottom:box.bottom, frameTop:frame.y, frameBottom:frame.bottom, deckTop:deck.top, overflow:node.scrollWidth>node.clientWidth };
            });
            assert.ok(geometry.y >= geometry.frameTop - 1 && geometry.bottom <= geometry.frameBottom + 1, 'Watermark fits inside the viewfinder.');
            assert.ok(geometry.x >= 0 && geometry.right <= width + 1 && !geometry.overflow, 'Watermark wraps within the smartphone width.');
            assert.ok(geometry.bottom <= geometry.deckTop + 1, 'The camera deck must not cover any watermark line.');
            assert.ok(await page.getByRole('button', { name: 'Take photo', exact: true }).isVisible());
            if (width === 390 && ratio === '4:3') await page.screenshot({ path: `../scratch/native-report-entry/watermark/camera-${language}-${width}.png` });
        }
    }
    await page.goto(`${base}?scenario=selected`);
    await page.locator('[data-camera-watermark]').waitFor();
    await page.waitForTimeout(300);
    const selectedText = await page.locator('[data-camera-watermark]').innerText();
    assert.doesNotMatch(selectedText, /Selected issue location/);
    assert.equal(await page.locator('[data-camera-watermark] [role="group"]').getAttribute('aria-label'), 'Selected issue location');
    assert.match(selectedText, /Sample Road/);
    assert.match(selectedText, /Lat 14.750000/);
    assert.doesNotMatch(selectedText, /PRIVATE|±14m/, 'A selected map pin must not inherit another point’s device accuracy.');
    const videoBounds = await page.locator('video').boundingBox();
    const deckBounds = await page.locator('footer').boundingBox();
    assert.equal(Math.round(videoBounds.y), 24);
    assert.ok(videoBounds.y + videoBounds.height > deckBounds.y + deckBounds.height - 1, 'The default live feed continues behind the transparent controls.');
    assert.equal(await page.getByRole('button', { name: 'Camera size (Full). Tap to open camera sizing', exact: true }).count(), 1);
    assert.deepEqual(await page.evaluate(() => window.__barCalls.at(-1)), { topColor: '#000000', bottomColor: '#000000', edgeToEdge: true, immersive: false });
    await page.screenshot({ path: '../scratch/native-report-entry/watermark/camera-reference-layout.png' });
    await page.setViewportSize({ width: 320, height: 640 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.waitForTimeout(150);
    const enlarged=await page.locator('[data-camera-watermark]').evaluate(node => ({ width:node.clientWidth,scroll:node.scrollWidth,top:node.getBoundingClientRect().top,bottom:node.getBoundingClientRect().bottom, deckTop:node.closest('[role="dialog"]').querySelector('footer').getBoundingClientRect().top }));
    assert.ok(enlarged.scroll <= enlarged.width && enlarged.top >= 24 && enlarged.bottom < enlarged.deckTop, 'Enlarged text fits without covering camera controls.');
    await page.goto(`${base}?scenario=device`);
    await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2 && document.querySelector('[data-camera-watermark]')?.textContent.includes('121.045000'));
    await page.getByRole('button', { name: 'Take photo', exact: true }).click();
    await page.getByRole('button', { name: 'Use this photo', exact: true }).waitFor();
    const timestamp = await page.locator('[data-camera-watermark] time').getAttribute('dateTime');
    await page.waitForTimeout(2100);
    assert.equal(await page.locator('[data-camera-watermark] time').getAttribute('dateTime'), timestamp, 'Preview freezes the capture time.');
    await page.getByRole('button', { name: 'Use this photo', exact: true }).click();
    const capture = await page.evaluate(() => window.__capture);
    assert.ok(capture.size > 1000 && capture.type === 'image/jpeg');
    assert.equal(capture.receipt.capturedAt, timestamp);
    assert.deepEqual(await page.evaluate(() => window.__paintedText), [], 'The displayed watermark must preserve the original encoded image.');
    for (const scenario of ['denied', 'stale']) {
        await page.goto(`${base}?scenario=${scenario}`);
        await page.locator('[data-camera-watermark]').waitFor();
        await page.waitForTimeout(300);
        const text=await page.locator('[data-camera-watermark]').innerText();
        assert.match(text, /Location unavailable/);
        assert.doesNotMatch(text, /Lat |Lng |±/);
    }
    await page.goto(`${base}?side=front`);
    await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
    assert.equal(await page.locator('[data-camera-watermark]').count(), 0, 'ID photos must not acquire the issue watermark.');
    assert.deepEqual(errors, []);
    console.log('PASS: 32 native camera viewport/language/ratio cases, transparent controls, outlined watermark, native bar/inset contract, 320 px enlarged text, privacy, denied/stale fixes, frozen capture time, original image preservation and ID isolation.');
} finally {
    await browser.close();
    await new Promise(done => server.close(done));
}
