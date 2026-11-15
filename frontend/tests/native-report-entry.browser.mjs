// Real native UI components with synthetic device/API fixtures; no real submission.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const base = process.env.PULSO_NATIVE_REVIEW_URL || 'http://127.0.0.1:5173';
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('../scratch/native-report-entry', { recursive: true });
try {
  for (const [language, dark, width, accuracy] of [['en', true, 390, 119], ['tl', false, 320, 8], ['en', false, 320, 5], ['tl', true, 390, 119]]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ language, dark }) => {
      localStorage.setItem('pulso_language', language);
      localStorage.setItem('i18nextLng', language);
      localStorage.setItem('pulso_theme_mode', dark ? 'dark' : 'light');
    }, { language, dark });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const fixture = `${base}/tests/native-report-entry.html?accuracy=${accuracy}`;
    await page.goto(fixture);
    const report = page.locator('.native-home__report');
    await report.click();
    const sheet = page.getByRole('dialog');
    await sheet.waitFor();
    assert.equal(await page.locator('[data-review-route]').textContent(), '/');
    assert.equal(await sheet.locator('a').count(), 2);
    assert.equal(await sheet.getByText(/Save your receipt code after submitting|Itabi ang code sa resibo/).count(), 0);
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press('Tab');
      assert.ok(await sheet.evaluate(node => node.contains(document.activeElement)));
    }
    await page.screenshot({ path: `../scratch/native-report-entry/guest-${language}-${dark ? 'dark' : 'light'}.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.ok(await report.evaluate(node => node === document.activeElement));
    await report.click();
    assert.ok(await page.evaluate(() => window.__SAMPLE_nativeBack()));
    assert.equal(await page.getByRole('dialog').count(), 0);
    await report.click();
    await sheet.locator('a[href^="/login"]').click();
    assert.equal(await page.locator('[data-review-route]').textContent(), '/login?returnTo=%2Freport');
    await page.goto(fixture);
    await report.click();
    await sheet.locator('a[href^="/report"]').click();
    await page.waitForFunction(() => document.querySelector('[data-review-route]')?.textContent === '/report?source=guest');
    await page.getByText(new RegExp(`±${accuracy}m`)).waitFor();
    const alignment = await page.locator('[data-report-location-card]').evaluate(node => {
      const pin = node.firstElementChild.getBoundingClientRect();
      const title = node.querySelector('h3').getBoundingClientRect();
      const address = node.querySelector('section > p').getBoundingClientRect();
      const coordinates = node.querySelector('[data-location-coordinates]').getBoundingClientRect();
      return { pin: { right: pin.right, top: pin.top }, title: { left: title.left, top: title.top }, address: { left: address.left, bottom: address.bottom }, coordinates: { top: coordinates.top } };
    });
    assert.ok(alignment.title.left > alignment.pin.right && Math.abs(alignment.title.top - alignment.pin.top) < 6, 'Location heading sits beside pin');
    assert.ok(alignment.address.left > alignment.pin.right && alignment.coordinates.top >= alignment.address.bottom, 'Address stays beside pin and coordinates below');
    assert.equal(await page.getByText(/GPS selected|Napiling GPS|not yet submitted|has not been submitted yet|Hindi pa naipapadala ang iyong ulat/i).count(), 0);
    assert.equal(await page.getByRole('button', { name: /Change location|Baguhin ang lokasyon/i }).count(), 0);
    assert.equal(await page.getByText(/Address details are unavailable or incomplete|retry GPS to look up the address again/).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.screenshot({ path: `../scratch/native-report-entry/report-${language}-${dark ? 'dark' : 'light'}.png`, fullPage: true });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
    await context.close();
  }
  for (const query of ['signedIn=1', 'denied=1']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 850 } });
    const page = await context.newPage();
    await page.goto(`${base}/tests/native-report-entry.html?${query}`);
    await page.locator('.native-home__report').click();
    if (query === 'denied=1') await page.getByRole('dialog').locator('a[href^="/report"]').click();
    await page.locator('footer button').last().waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    if (query === 'denied=1') await page.locator('#report-location-editor').waitFor();
    await context.close();
  }
  console.log('PASS: native guest choice, sign-in destination, dismissal, focus return, signed-in bypass, approximate GPS, hidden notices/link, denied-location fallback, EN/TL and narrow/enlarged reflow.');
} finally { await browser.close(); }
