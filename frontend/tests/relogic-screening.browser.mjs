// Real report photo step, synthetic vision/address responses. No user submissions or live providers.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const entry = `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createInstance} from 'i18next';
import {I18nextProvider} from 'react-i18next';
import Step from './src/components/report-wizard/Step2CameraLocation';
import en from './src/locales/en.json';
import tl from './src/locales/tl.json';
const language=new URLSearchParams(location.search).get('language')||'en';
const i18n=createInstance();
await i18n.init({lng:language,resources:{en,tl},fallbackLng:'en',interpolation:{escapeValue:false}});
function Fixture(){
 const [point,setPoint]=useState({lat:14.7565,lng:121.045,isInCaloocan:true,pinConfirmed:true,source:'manual',addressStatus:'OK'});
 const [evidence,setEvidence]=useState({});
 window.__evidence=evidence;window.__point=point;
 return <I18nextProvider i18n={i18n}><Step isMapLoaded={false} category="Roads & Bridges"
  locationData={point} onLocationChange={setPoint} evidenceData={evidence} onEvidenceChange={setEvidence}
  onBack={()=>{}} onContinue={()=>{window.__continued=true;}} /></I18nextProvider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);`;
const bundled = await build({ stdin: { contents: entry, loader: 'jsx', resolveDir: process.cwd() },
    bundle: true, format: 'esm', write: false,
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://screening.example.invalid"}' },
    plugins: [{ name: 'fixture-unused-integrations', setup(builder) {
        builder.onResolve({ filter: /ThemeContext$/ }, () => ({ path: 'theme', namespace: 'fixture' }));
        builder.onResolve({ filter: /IDCameraModal$/ }, () => ({ path: 'camera', namespace: 'fixture' }));
        builder.onResolve({ filter: /reverseGeocode$/ }, () => ({ path: 'address', namespace: 'fixture' }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'jsx', contents:
            args.path === 'theme' ? 'export const useTheme=()=>({theme:document.documentElement.classList.contains("dark")?"dark":"light"});'
            : args.path === 'camera' ? 'export default function Camera(){return null;}'
            : 'export const reverseGeocodeLocation=async()=>({address:"FAKE Road",structuredAddress:{street:"FAKE Road",city:"Caloocan City"},status:"OK"});' }));
    } }] });
const assets = join(process.cwd(), 'dist/assets');
const cssName = (await readdir(assets)).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'Build the web app first.');
const css = await readFile(join(assets, cssName));
const png = await readFile('tests/fixtures/sample-field-evidence.png');
const server = createServer((request, response) => {
    const script = request.url === '/fixture.js', style = request.url === '/style.css';
    response.setHeader('Content-Type', script ? 'text/javascript' : style ? 'text/css' : 'text/html');
    response.end(script ? bundled.outputFiles[0].text : style ? css :
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><main id="root" style="max-width:900px;margin:auto;padding:16px"></main><script type="module" src="/fixture.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const assessment = (overrides = {}) => ({ category: null, is_inappropriate: true, is_infrastructure: false,
    screening: { version: 'pulso-relogic-screening-v1', outcome: 'submit_for_review', submission_allowed: true,
        provider_state: 'suggested', authenticity: 'screen_suspected', ...overrides } });
try {
    for (const [language, width, dark] of [['en', 1100, false], ['tl', 320, true]]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(dark => {
            document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.toggle('dark', dark));
            Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_success, error) => error({ code: 1 }) } });
        }, dark);
        let mode = 'review', observeLateRequest;
        const lateRequest = new Promise(resolve => { observeLateRequest = resolve; });
        await page.route('https://screening.example.invalid/**', async route => {
            const thisMode = mode;
            if (thisMode === 'late-restriction') {
                observeLateRequest();
                await new Promise(resolve => setTimeout(resolve, 700));
            }
            const body = thisMode === 'late-restriction' ? assessment({ outcome: 'restricted_upload', submission_allowed: false })
                : thisMode === 'scope' ? assessment({ authenticity: 'not_assessed', service_eligibility: 'potentially_out_of_service' })
                : assessment();
            await route.fulfill({ status: thisMode === 'offline' ? 503 : 200, json: body }).catch(() => {});
        });
        await page.goto(`${base}/?language=${language}`);
        const input = page.locator('input[type="file"]');
        const choose = name => input.setInputFiles({ name, mimeType: 'image/png', buffer: png });
        await choose('screen-observation.png');
        const notice = page.locator('p[role="status"][aria-atomic="true"]');
        await page.waitForFunction(() => window.__evidence.screening?.authenticity === 'screen_suspected');
        assert.deepEqual(errors, [], 'The real report step must render the assessment without runtime errors.');
        assert.equal(await page.evaluate(() => window.__evidence.isInappropriate), false);
        assert.ok(await page.getByRole('button', { name: language === 'en' ? 'Continue' : 'Magpatuloy', exact: true }).isEnabled());
        assert.match(await notice.innerText(), language === 'en' ? /staff review/ : /kawani/);
        assert.equal(await page.evaluate(() => window.__continued === true), false, 'The warning must not auto-advance out of view.');
        await page.getByRole('button', { name: language === 'en' ? 'Continue' : 'Magpatuloy', exact: true }).click();
        assert.equal(await page.evaluate(() => window.__continued), true);
        mode = 'late-restriction';
        await choose('old-photo.png');
        await lateRequest;
        mode = 'scope';
        await choose('replacement-photo.png');
        await page.waitForFunction(() => window.__evidence.screening?.service_eligibility === 'potentially_out_of_service');
        await page.waitForTimeout(800);
        assert.equal(await page.evaluate(() => window.__evidence.isInappropriate), false, 'An old response must not reject a replacement photo.');
        mode = 'offline';
        await choose('provider-unavailable.png');
        await page.waitForFunction(() => window.__evidence.analysisStatus === 'failed');
        assert.match(await notice.innerText(), language === 'en' ? /unavailable/ : /Hindi available/);
        assert.equal(await page.locator('footer button').last().isEnabled(), true,
            JSON.stringify(await page.evaluate(()=>({evidence:window.__evidence,point:window.__point}))));
        await page.evaluate(() => document.documentElement.style.fontSize = '200%');
        assert.ok(await page.evaluate(() => Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)) <= width);
        assert.deepEqual(errors, []);
        await mkdir('../scratch/relogic-browser', { recursive: true });
        await page.screenshot({ path: `../scratch/relogic-browser/${language}-${width}.png`, fullPage: true });
        await page.close();
    }
    console.log('PASS: reviewable screen/scope signals, superseded requests, outage recovery, bilingual guidance and 320px/200% reflow.');
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
