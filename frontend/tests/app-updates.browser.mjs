// Browser integration with synthetic update manifests and Android bridge responses.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { ThemeContext } from './src/contexts/ThemeContext.jsx';
import Home from './src/components/mobile/NativeResidentLanding.jsx';
import { dismissAndroidLayer } from './src/utils/nativeAndroid';
import en from './src/locales/en.json';
import tl from './src/locales/tl.json';
const params = new URLSearchParams(location.search);
const dark = params.get('theme')==='dark';
window.__dismissAndroidLayer = dismissAndroidLayer;
document.documentElement.classList.toggle('dark',dark);
const i18n=createInstance();
await i18n.init({lng:params.get('lang')||'en',resources:{en,tl},fallbackLng:'en',interpolation:{escapeValue:false}});
createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><ThemeContext.Provider value={{isDark:dark,themeMode:dark?'dark':'light',changeTheme:()=>{}}}><MemoryRouter><Home residentSignedIn={false}/></MemoryRouter></ThemeContext.Provider></I18nextProvider>);
`;
const nativeDouble = `
export const Capacitor={isNativePlatform:()=>true,getPlatform:()=>'android'};
export class WebPlugin {}
export function registerPlugin(name){return name==='App'?{getInfo:async()=>({id:'ph.gov.caloocan.pulso',version:'2.4.4',build:'5'})}:{download:async value=>{window.__downloads=(window.__downloads||[]).concat(value);if(window.__downloadError)throw new Error('Synthetic error');}};}
`;
const output = await build({ stdin: { contents: entry, resolveDir: root, loader: 'jsx' }, bundle: true, format: 'esm', write: false,
  loader: { '.css': 'empty' }, jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{"VITE_API_BASE_URL":"","DEV":true}' },
  plugins: [{ name: 'native-test-double', setup(builder) {
    builder.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: 'native', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: nativeDouble, loader: 'js' }));
  } }],
});
const styles = (await readdir(join(root, 'dist/assets'))).find(name => /^index-.*\.css$/.test(name));
const css = await readFile(join(root, 'dist/assets', styles));
const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  if (path === '/fixture.js') return res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(output.outputFiles[0].text);
  if (path === '/style.css') return res.writeHead(200, { 'Content-Type': 'text/css' }).end(css);
  if (/\.(png|webp|woff2)$/.test(path)) {
    try { return res.end(await readFile(join(root, 'public', path))); } catch { return res.writeHead(404).end(); }
  }
  res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const screenshots = process.env.PULSO_UPDATE_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
try {
  for (const [lang, theme, width] of [['en', 'light', 390], ['tl', 'dark', 320]]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const release = { applicationId: 'ph.gov.caloocan.pulso', versionCode: 6, versionName: '2.4.5', sha256: 'a'.repeat(64), size: 123 };
    let response = { status: 200, body: JSON.stringify(release) };
    await page.route('**/api/mobile/app-updates/latest', route => route.fulfill({ ...response, contentType: 'application/json' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/?lang=${lang}&theme=${theme}`);
    await page.waitForTimeout(300);
    assert.deepEqual(errors, [], 'Fixture runtime errors');
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2), true, 'Home retains a single-screen layout');
    if (screenshots) await page.screenshot({ path: join(screenshots, `home-${lang}-${theme}.png`) });
    const trigger = page.locator('.native-app-update-trigger');
    await trigger.click();
    const panel = page.locator('dialog[open]');
    const download = panel.locator('.native-app-update__download');
    await download.waitFor();
    assert.equal(await panel.locator('h2').evaluate(el => el===document.activeElement), true);
    assert.equal(await panel.evaluate(el => el.scrollWidth<=el.clientWidth), true);
    assert.equal(await panel.evaluate(el => Math.abs(el.getBoundingClientRect().bottom-innerHeight)<2), true);
    if (screenshots) await page.screenshot({ path: join(screenshots, `update-${lang}-${theme}.png`) });
    await download.click();
    const confirmation = panel.locator('.native-app-update__confirmation');
    await confirmation.waitFor();
    assert.equal(await page.evaluate(() => window.__downloads?.length || 0), 0, 'Opening confirmation does not download');
    assert.equal(await confirmation.locator('button').first().evaluate(el => el===document.activeElement), true, 'Not now is focused');
    if (screenshots) await page.screenshot({ path: join(screenshots, `update-confirm-${lang}-${theme}.png`) });
    await confirmation.locator('button').first().click();
    await download.waitFor();
    assert.equal(await page.evaluate(() => window.__downloads?.length || 0), 0, 'Cancelling does not download');
    await download.click();
    await confirmation.waitFor();
    await page.evaluate(() => window.__dismissAndroidLayer());
    await confirmation.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => window.__downloads?.length || 0), 0, 'Android Back cancels confirmation');
    await download.click();
    await page.evaluate(() => { window.__downloadError=true; });
    await confirmation.locator('.native-app-update__download').click();
    await panel.getByRole('alert').waitFor();
    await page.evaluate(() => { window.__downloadError=false; });
    await confirmation.locator('.native-app-update__download').click();
    await page.waitForFunction(() => window.__downloads?.length===2);
    await page.waitForFunction(() => !document.querySelector('[role="alert"]'));
    assert.deepEqual(await page.evaluate(() => window.__downloads[1]), { versionCode: 6 });
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(el => el===document.activeElement), true);
    response = { status: 200, body: JSON.stringify({ ...release, versionCode: 5 }) };
    await trigger.click();
    await page.waitForFunction(() => /latest available|pinakabagong/.test(document.querySelector('[role="status"]')?.textContent));
    assert.equal(await panel.locator('.native-app-update__download').count(), 0);
    await page.keyboard.press('Escape');
    response = { status: 503, body: '{}' };
    await trigger.click();
    await panel.locator('.native-app-update__retry').waitFor();
    response = { status: 200, body: JSON.stringify(release) };
    await panel.locator('.native-app-update__retry').click();
    await download.waitFor();
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: update available/current/error/retry, confirmation cancel/Android Back before any download, download handoff, focus return, bilingual themes and narrow bottom sheet.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
