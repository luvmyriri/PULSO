// SAMPLE native bridge: verify notification taps open PULSO, without a top banner.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = 'http://127.0.0.1:5173';
try {
  for (const cold of [false, true]) for (const language of ['en', 'tl']) {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ language, cold }) => {
      localStorage.setItem('pulso_language', language); localStorage.setItem('i18nextLng', language);
      window.__SAMPLE_update = { applicationId: 'ph.gov.caloocan.pulso', versionCode: 999, versionName: '2.4.99', size: 1234, sha256: 'a'.repeat(64) };
      window.__SAMPLE_nativeCalls = []; window.__SAMPLE_listeners = {}; window.__SAMPLE_pendingTap = cold;
      window.androidBridge = {};
      window.Capacitor = {
        isNativePlatform: () => true,
        PluginHeaders: [
          { name: 'App', methods: [{ name: 'getInfo', rtype: 'promise' }, { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }] },
          { name: 'PulsoAppUpdate', methods: ['download', 'configureNotifications', 'checkNotifications', 'consumeUpdateTap', 'removeListener'].map(name => ({ name, rtype: 'promise' })).concat([{ name: 'addListener', rtype: 'callback' }]) },
        ],
        nativePromise: async (plugin, method, options) => {
          window.__SAMPLE_nativeCalls.push({ plugin, method, options });
          if (method === 'getInfo') return { id: 'ph.gov.caloocan.pulso', build: '26', version: '2.4.25' };
          if (method === 'consumeUpdateTap') { const open = window.__SAMPLE_pendingTap; window.__SAMPLE_pendingTap = false; return { open }; }
          return {};
        },
        nativeCallback: async (plugin, method, options, callback) => {
          window.__SAMPLE_listeners[options.eventName] = callback; return 'SAMPLE-listener';
        },
      };
    }, { language, cold });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/tests/native-report-entry.html?update=1`);
    await page.waitForFunction(() => window.__SAMPLE_nativeCalls.some(call => call.method === 'configureNotifications'));
    assert.equal(await page.locator('.native-update-banner').count(), 0);
    if (!cold) {
      assert.equal(await page.getByRole('dialog').count(), 0);
      await page.evaluate(() => { window.__SAMPLE_pendingTap = true; window.__SAMPLE_listeners.openUpdate({}); });
    }
    const sheet = page.getByRole('dialog'); await sheet.waitFor();
    assert.equal(await sheet.getByRole('button', { name: /test notification|test na abiso/i }).count(), 0);
    await sheet.getByRole('button', { name: language === 'en' ? 'Download update' : 'I-download ang update', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__SAMPLE_nativeCalls.some(call => call.method === 'download')), false);
    await sheet.getByRole('button', { name: language === 'en' ? 'Update now' : 'I-update ngayon', exact: true }).click();
    await page.waitForFunction(() => window.__SAMPLE_nativeCalls.some(call => call.method === 'download' && call.options.versionCode === 999));
    assert.deepEqual(errors, []); await context.close();
  }
  console.log('PASS: no top banner or test action; native cold/warm taps open update sheet; EN/TL; download needs confirmation.');
} finally { await browser.close(); }
