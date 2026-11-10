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
      window.__barCalls = [];
      window.Capacitor = {
        PluginHeaders: [
          { name: 'SplashScreen', methods: [{ name: 'hide', rtype: 'promise' }] },
          { name: 'App', methods: [{ name: 'getInfo', rtype: 'promise' }, { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' }] },
          { name: 'PulsoAppearance', methods: [{ name: 'setSystemBars', rtype: 'promise' }] },
        ],
        nativePromise: async (plugin, method, options) => {
          if (plugin === 'PulsoAppearance') window.__barCalls.push(options);
          return plugin === 'App' && method === 'getInfo' ? { id: 'ph.gov.caloocan.pulso', version: '2.4.4', build: '5' } : {};
        },
        nativeCallback: async (_plugin, method, options, callback) => {
          if (method === 'addListener' && options.eventName === 'backButton') window.__nativeBack = callback;
          return 'fixture';
        },
      };
    }, { language, theme, fixture });
    await page.goto(base + '/dashboard');
    const greeting = page.locator('.native-resident-greeting');
    await greeting.waitFor();
    assert.equal(await greeting.locator('strong').innerText(), fixture.full_name);
    assert.equal(await greeting.locator('.native-resident-greeting__avatar').innerText(), 'SR');
    assert.equal(await page.locator('[data-native-app-header] .native-app-brand').count(), 0);
    if (screenshots) await page.screenshot({ path: join(screenshots, `dashboard-home-${language}-${theme}.png`) });
    await page.waitForFunction(() => window.__barCalls.length > 0);
    const statusColor = await page.evaluate(() => window.__barCalls.at(-1).topColor);
    await page.evaluate(() => {
      const button = document.createElement('button'); button.id = 'synthetic-edge-button';
      button.textContent = 'Synthetic orange action at viewport edge';
      button.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:48px;background:#ff6b00;z-index:9999';
      document.body.appendChild(button);
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => window.__barCalls.at(-1).topColor), statusColor, 'Orange action cannot recolor the status bar');
    await page.evaluate(() => document.getElementById('synthetic-edge-button').remove());
    const searchTrigger = page.locator('.native-dashboard-search__trigger');
    await searchTrigger.click();
    const searchPanel = page.locator('.native-search-panel[open]');
    const searchInput = searchPanel.getByRole('searchbox');
    await searchInput.waitFor();
    assert.equal(await searchInput.evaluate(el => el === document.activeElement), true);
    assert.equal(await searchInput.locator('..').evaluate(el => getComputedStyle(el).outlineColor), 'rgb(255, 107, 0)');
    assert.equal(await searchInput.evaluate(el => getComputedStyle(el).boxShadow), 'none');
    assert.equal(await searchPanel.locator('.native-search-panel__recent').count(), 0, 'First-use history is empty');
    if (screenshots) await page.screenshot({ path: join(screenshots, `search-open-${language}-${theme}.png`) });
    await searchInput.fill('city');
    await searchPanel.getByRole('button', { name: language === 'en' ? 'City services' : 'Mga serbisyo ng lungsod', exact: true }).waitFor();
    if (screenshots) await page.screenshot({ path: join(screenshots, `search-results-${language}-${theme}.png`) });
    await page.setViewportSize({ width, height: 420 });
    await page.waitForFunction(() => Math.abs(document.querySelector('.native-search-panel').getBoundingClientRect().height - visualViewport.height) < 2);
    assert.equal(await searchPanel.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    if (screenshots) await page.screenshot({ path: join(screenshots, `search-keyboard-height-${language}-${theme}.png`) });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    assert.equal(await searchPanel.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Search reflows with enlarged text');
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await searchInput.fill('synthetic-no-match-xyz');
    await searchPanel.locator('.native-search-panel__empty').waitFor();
    await searchPanel.locator('.native-search-panel__field button').click();
    assert.equal(await searchInput.inputValue(), '');
    await searchPanel.locator('.native-search-panel__back').click();
    await searchPanel.waitFor({ state: 'detached' });
    assert.equal(await searchTrigger.evaluate(el => el === document.activeElement), true);
    await page.setViewportSize({ width, height: 844 });
    await searchTrigger.click();
    await searchInput.fill('history');
    await page.keyboard.press('Escape');
    await searchPanel.waitFor({ state: 'detached' });
    await searchTrigger.click();
    assert.equal(await searchInput.inputValue(), 'history');
    await page.evaluate(() => window.__nativeBack({ canGoBack: true }));
    await searchPanel.waitFor({ state: 'detached' });
    assert(new URL(page.url()).pathname === '/dashboard');
    await searchTrigger.click();
    await searchPanel.getByRole('button', { name: language === 'en' ? 'My reports' : 'Aking mga ulat', exact: true }).click();
    await page.waitForURL('**/dashboard?tab=reports');
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await page.goto(base + '/dashboard');
    await greeting.waitFor();
    await page.evaluate(() => scrollTo({ top: 240, behavior: 'instant' }));
    await page.locator('[data-resident-bottom-nav] button').nth(0).click();
    await page.waitForFunction(() => scrollY < 2);
    assert(new URL(page.url()).pathname === '/dashboard');
    await greeting.locator('.native-resident-greeting__avatar').click();
    await page.waitForURL('**/dashboard?tab=profile');
    assert.equal(await page.locator('[data-native-app-header]').count(), 0, 'Avatar opens Account and Profile');
    for (const tab of ['reports', 'updates', 'profile']) {
      await page.goto(base + '/dashboard?tab=' + tab);
      await page.locator('[data-resident-bottom-nav]').waitFor();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('[data-native-app-header]').count(), 0, tab + ' has no top navbar');
      await page.evaluate(() => {
        const spacer = document.createElement('div'); spacer.id = 'synthetic-scroll-content'; spacer.style.height = '1500px';
        document.querySelector('[data-native-system-bar-surface]').appendChild(spacer);
        scrollTo({ top: 350, behavior: 'instant' });
      });
      assert.equal(await page.evaluate(() => scrollY > 100), true, tab + ' fixture is genuinely scrolled');
      if (tab === 'reports') {
        const before = await page.evaluate(() => window.__barCalls.at(-1).topColor);
        for (const color of ['#020617', '#ff6b00']) {
          await page.evaluate(color => {
            const surface = document.createElement('div'); surface.id = 'synthetic-scrolling-card';
            surface.style.cssText = `position:fixed;top:0;left:0;width:100%;height:48px;z-index:9999;background:${color}`;
            document.body.appendChild(surface);
          }, color);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.equal(await page.evaluate(() => window.__barCalls.at(-1).topColor), before, 'My Reports status bar does not follow dark cards or orange buttons');
          await page.evaluate(() => document.getElementById('synthetic-scrolling-card').remove());
        }
        if (theme === 'light') assert.equal(before.toLowerCase(), '#f1f5f9', 'Light My Reports keeps a light status bar');
      }
      await page.locator('[data-resident-bottom-nav] button').nth({ reports: 1, updates: 3, profile: 4 }[tab]).click();
      await page.waitForFunction(() => scrollY < 2);
      assert.equal(new URL(page.url()).searchParams.get('tab'), tab, 'Retapping keeps the current page');
      await page.evaluate(() => document.getElementById('synthetic-scroll-content').remove());
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
  console.log('PASS: light/dark My Reports status bars stay stable over cards/buttons; orange full-screen search at keyboard height; avatar opens Profile; active bottom tabs scroll to top; search navigation, preferences and bilingual themes.');
} finally { await browser.close(); }
