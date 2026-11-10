// Full compiled-app QA with synthetic resident/API/native responses. No real user mutations.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const base = process.env.PULSO_QA_BASE_URL || 'http://127.0.0.1:5176';
const index = await readFile(join(root, 'dist/index.html'));
const screenshots = process.env.PULSO_UPDATE_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
const fixture = { id: -1, role: 'resident', full_name: 'Sample Resident', email: 'preview@example.invalid' };
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
try {
  for (const [language, theme, width] of [['en', 'light', 390], ['tl', 'dark', 320]]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    let preferences = { enabled: true, report_updates: true, related_updates: true, in_app: true, email: false, version: 3, email_service: 'not_configured', phone_push: 'not_configured' };
    const writes = [];
    let failSave = false;
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === base) {
        if (request.resourceType() === 'document') return route.fulfill({ status: 200, contentType: 'text/html', body: index });
        return route.continue();
      }
      if (url.pathname === '/api/residents/notification-preferences') {
        if (request.method() === 'PUT') {
          writes.push(request.postDataJSON());
          if (failSave) return route.fulfill({ status: 503, json: { detail: 'Synthetic offline fixture' } });
          const { expected_version, ...values } = request.postDataJSON();
          assert.equal(expected_version, preferences.version);
          preferences = { ...preferences, ...values, version: preferences.version + 1 };
        }
        return route.fulfill({ status: 200, json: preferences });
      }
      if (url.pathname.startsWith('/api/')) {
        const data = /\/users\/|\/residents\/|\/auth\/me$/.test(url.pathname) ? fixture : [];
        return route.fulfill({ status: 200, json: data });
      }
      return route.abort();
    });
    await page.addInitScript(({ language, theme, fixture }) => {
      localStorage.setItem('pulso_theme_mode', theme);
      localStorage.setItem('pulso_language', language);
      localStorage.setItem('pulso_tutorial_completed', 'true');
      localStorage.setItem('pulso_token', 'fixture.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.fixture');
      localStorage.setItem('pulso_user', JSON.stringify(fixture));
      window.androidBridge = {};
      window.Capacitor = {
        PluginHeaders: [
          { name: 'SplashScreen', methods: [{ name: 'hide', rtype: 'promise' }] },
          { name: 'App', methods: [{ name: 'getInfo', rtype: 'promise' }, { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' }] },
          { name: 'PulsoAppearance', methods: [{ name: 'setSystemBars', rtype: 'promise' }] },
        ],
        nativePromise: async (plugin, method) => plugin === 'App' && method === 'getInfo' ? { id: 'ph.gov.caloocan.pulso', version: '2.4.4', build: '5' } : {},
        nativeCallback: async () => 'fixture',
      };
    }, { language, theme, fixture });
    await page.goto(base + '/dashboard');
    const greeting = page.locator('.native-resident-greeting');
    await greeting.waitFor();
    assert.equal(await greeting.locator('strong').innerText(), fixture.full_name);
    assert.equal(await greeting.locator('.native-resident-greeting__avatar').innerText(), 'SR');
    assert.equal(await page.locator('[data-native-app-header] .native-app-brand').count(), 0);
    if (screenshots) await page.screenshot({ path: join(screenshots, `dashboard-home-${language}-${theme}.png`) });
    await page.evaluate(() => scrollTo({ top: 240, behavior: 'instant' }));
    await page.evaluate(() => scrollBy({ top: -40, behavior: 'instant' }));
    await greeting.click();
    await page.waitForFunction(() => scrollY < 2);
    assert(new URL(page.url()).pathname === '/dashboard');
    for (const tab of ['reports', 'updates', 'profile']) {
      await page.goto(base + '/dashboard?tab=' + tab);
      await page.locator('[data-resident-bottom-nav]').waitFor();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('[data-native-app-header]').count(), 0, tab + ' has no top navbar');
      if (tab === 'reports') {
        assert.equal(await page.getByRole('button', { name: 'Export reports to Excel', exact: true }).count(), 0);
        assert.equal(await page.getByRole('button', { name: /New report|Bagong ulat/i }).count() > 0, true);
      }
    }
    await page.getByRole('button', { name: /Notifications/ }).first().click();
    const panel = page.locator('.resident-notification-settings');
    const boxes = panel.getByRole('checkbox');
    await boxes.first().waitFor();
    assert.equal(await boxes.count(), 5);
    assert.equal(await panel.getByRole('heading').count(), 1);
    const master = boxes.first();
    const checkboxColor = await master.evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(checkboxColor, 'rgb(255, 107, 0)');
    assert.equal(await master.locator('..').locator('svg').evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
    assert.equal(await panel.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    if (screenshots) await page.screenshot({ path: join(screenshots, `notification-settings-${language}-${theme}.png`), fullPage: true });
    await master.uncheck();
    for (let i = 1; i < 5; i++) assert.equal(await boxes.nth(i).isDisabled(), true);
    await panel.locator('button[type="submit"]').click();
    await page.waitForFunction(() => /Preferences saved|Na-save/.test(document.querySelector('.resident-notification-settings__saved')?.textContent));
    assert.equal(writes.at(-1).enabled, false);
    assert.equal(writes.at(-1).report_updates, true);
    await master.check();
    await boxes.last().check();
    failSave = true;
    await panel.locator('button[type="submit"]').click();
    await panel.getByRole('alert').waitFor();
    assert.equal(await boxes.last().isChecked(), true, 'Failed save retains the draft');
    failSave = false;
    await panel.locator('button[type="submit"]').click();
    await panel.locator('.resident-notification-settings__saved').waitFor();
    assert.equal(writes.at(-1).email, true);
    assert.deepEqual(Object.keys(writes.at(-1)).sort(), ['email', 'enabled', 'expected_version', 'in_app', 'related_updates', 'report_updates']);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const reflow = await panel.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, overflowing: [...el.querySelectorAll('*')].filter(node => node.getBoundingClientRect().right > el.getBoundingClientRect().right + 1).map(node => ({ tag: node.tagName, className: node.className, text: node.textContent.slice(0,80), width: node.clientWidth, scroll: node.scrollWidth })) }));
    assert.equal(reflow.scroll <= reflow.width, true, 'Preferences reflow at 200% text size: ' + JSON.stringify(reflow));
    await master.focus();
    await page.keyboard.press('Space');
    assert.equal(await master.isChecked(), false, 'Custom checkbox retains native keyboard behavior');
    await page.emulateMedia({ forcedColors: 'active' });
    assert.equal(await master.locator('..').locator('svg').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await master.evaluate(el => getComputedStyle(el).appearance), 'auto');
    await page.close();
  }
  console.log('PASS: greeting initials/name and Home scroll, hidden non-Home headers, no APK export, orange/white checkboxes, saved/failed preferences, disabled groups, bilingual themes and forced colors.');
} finally { await browser.close(); }
