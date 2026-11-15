// Real local download service; read-only requests, no accounts or reports changed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const base = 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('../scratch/native-report-entry/lan-download', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost', '192.168.0.192'].includes(url.hostname)) return route.abort();
    return route.continue();
  });
  await page.goto(base);
  await page.getByRole('button', { name: 'View app download', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const download = dialog.getByRole('link', { name: 'Download Android APK', exact: true });
  await download.waitFor();
  const target = await download.getAttribute('href');
  assert.equal(target, 'http://192.168.0.192:33159/api/mobile/app-updates/download');
  assert.equal(await dialog.locator('a[href*="4174"]').count(), 0);
  const qr = dialog.locator('svg').filter({ has: page.locator('title') });
  await qr.screenshot({ path: '../scratch/native-report-entry/lan-download/qr.png' });
  await page.screenshot({ path: '../scratch/native-report-entry/lan-download/dialog.png' });
  const response = await page.request.get(target), bytes = await response.body();
  const manifest = await (await page.request.get(target.replace('/download', '/latest'))).json();
  assert.equal(response.status(), 200);
  assert.equal(bytes.length, manifest.size);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
  // A failed metadata check must not keep offering an unverified APK URL.
  await page.keyboard.press('Escape');
  await page.route('**/api/mobile/app-updates/latest', route => route.fulfill({ status: 503, json: {} }));
  await page.reload();
  await page.getByRole('button', { name: 'Open on phone', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'temporarily unavailable' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Download Android APK', exact: true }).count(), 0);
  await page.unroute('**/api/mobile/app-updates/latest');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await download.waitFor();
  assert.equal(await download.getAttribute('href'), target);
  assert.deepEqual(errors, []);
  console.log(`PASS: live landing/dialog use ${target}; full APK matches manifest; unavailable/retry states pass.`);
} finally { await browser.close(); }
