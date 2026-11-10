// Compiled-app startup QA with a held native splash response and synthetic API data.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const base = process.env.PULSO_QA_BASE_URL || 'http://127.0.0.1:5176';
const index = await readFile(join(root, 'dist/index.html'));
const screenshots = process.env.PULSO_LOADING_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
const fixture = { id: -1, role: 'resident', full_name: 'Sample Resident', email: 'preview@example.invalid' };
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
const cases = [['light', 'dark', 'light', 'en'], ['dark', 'light', 'dark', 'tl'], ['system', 'light', 'light', 'en'], ['system', 'dark', 'dark', 'tl']];
try {
  for (const [mode, os, expected, language] of cases) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: os, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === base) {
        if (request.resourceType() === 'document') return route.fulfill({ status: 200, contentType: 'text/html', body: index });
        return route.continue();
      }
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, json: /\/users\/|\/residents\/|\/auth\/me$/.test(url.pathname) ? fixture : [] });
      return route.abort();
    });
    await page.addInitScript(({ mode, language, fixture }) => {
      localStorage.setItem('pulso_theme_mode', mode);
      localStorage.setItem('pulso_language', language);
      localStorage.setItem('pulso_tutorial_completed', 'true');
      localStorage.setItem('pulso_token', 'fixture.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.fixture');
      localStorage.setItem('pulso_user', JSON.stringify(fixture));
      window.androidBridge = {};
      window.__barCalls = [];
      window.Capacitor = {
        isNativePlatform: () => true,
        PluginHeaders: [
          { name: 'SplashScreen', methods: [{ name: 'hide', rtype: 'promise' }] },
          { name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' }] },
          { name: 'PulsoAppearance', methods: [{ name: 'setSystemBars', rtype: 'promise' }] },
        ],
        nativePromise: async (plugin, method, options) => {
          if (plugin === 'SplashScreen' && method === 'hide') return new Promise(resolve => { window.__releaseSplash = resolve; });
          if (plugin === 'PulsoAppearance') {
            window.__barCalls.push(options);
            document.documentElement.style.setProperty('--pulso-safe-top', options.edgeToEdge ? '24px' : '0px');
            document.documentElement.style.setProperty('--pulso-safe-bottom', options.edgeToEdge ? '24px' : '0px');
          }
          return {};
        },
        nativeCallback: async () => 'fixture',
      };
    }, { mode, language, fixture });
    await page.goto(base + '/dashboard');
    const splash = page.locator('[data-native-splash]');
    await splash.waitFor();
    await page.waitForFunction(() => typeof window.__releaseSplash === 'function' && window.__barCalls.at(-1)?.edgeToEdge === true);
    const bg = expected === 'dark' ? 'rgb(8, 13, 25)' : 'rgb(247, 249, 252)';
    const text = expected === 'dark' ? 'rgb(248, 250, 252)' : 'rgb(11, 22, 48)';
    const muted = expected === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)';
    assert.equal(await splash.getAttribute('data-theme'), expected);
    assert.equal(await splash.evaluate(el => getComputedStyle(el).backgroundColor), bg);
    assert.equal(await splash.getByText('PULSO', { exact: true }).evaluate(el => getComputedStyle(el).color), text);
    assert.equal(await splash.locator('main p').evaluate(el => getComputedStyle(el).color), muted);
    assert.equal(await splash.evaluate(el => getComputedStyle(el).colorScheme), expected);
    assert.equal(await page.evaluate(() => document.documentElement.style.colorScheme), expected);
    const bars = await page.evaluate(() => window.__barCalls.at(-1));
    assert.equal(bars.topColor, expected === 'dark' ? '#080d19' : '#f7f9fc');
    assert.equal(bars.immersive, false, 'Loading keeps readable system icons instead of hiding them');
    assert.equal(await splash.evaluate(el => el.getBoundingClientRect().top), 0, 'Splash background reaches status-bar edge');
    assert.equal(await splash.evaluate(el => getComputedStyle(el).paddingTop), '24px', 'Content respects the native status-bar inset');
    if (screenshots) await page.screenshot({ path: join(screenshots, `loading-${mode}-os-${os}.png`) });
    if (mode === 'system') {
      const next = os === 'dark' ? 'light' : 'dark';
      await page.emulateMedia({ colorScheme: next });
      await page.waitForFunction(value => document.querySelector('[data-native-splash]')?.dataset.theme === value && document.documentElement.style.colorScheme === value, next);
      await page.waitForFunction(value => window.__barCalls.at(-1)?.topColor === value, next === 'dark' ? '#080d19' : '#f7f9fc');
    }
    await page.evaluate(() => window.__releaseSplash({}));
    await splash.waitFor({ state: 'detached' });
    await page.locator('.native-resident-greeting').waitFor();
    await page.waitForFunction(() => window.__barCalls.at(-1)?.edgeToEdge === true && document.querySelector('[data-native-dashboard-home]'));
    await page.locator('.native-resident-greeting').click();
    await page.waitForURL('**/dashboard?tab=profile');
    await page.waitForFunction(() => window.__barCalls.at(-1)?.edgeToEdge === false);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: saved light/dark override opposite OS appearance, system mode follows live OS changes, loading text contrast, safe insets, edge-to-edge bar requests and dashboard restoration.');
} finally { await browser.close(); }
