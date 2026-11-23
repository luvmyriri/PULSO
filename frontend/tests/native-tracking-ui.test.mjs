import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';

const directory = dirname(fileURLToPath(import.meta.url));
const temporary = await mkdtemp(join(directory, '.native-ui-'));
const output = join(temporary, 'pages.mjs');
const originalNative = Capacitor.isNativePlatform;
const originalPlatform = Capacitor.getPlatform;
after(async () => {
  Capacitor.isNativePlatform = originalNative;
  Capacitor.getPlatform = originalPlatform;
  await rm(temporary, { recursive: true, force: true });
});
await build({
  stdin: {
    contents: `
      export { default as Track } from './pages/PublicTrackPage.jsx';
      export { default as Home } from './components/mobile/NativeResidentLanding.jsx';
      export { default as GuestReport } from './components/mobile/NativeGuestReportSheet.jsx';
      export { default as Accuracy } from './components/report-wizard/LocationAccuracyBadge.jsx';
      export { default as Footer } from './components/report-wizard/WizardCardFooter.jsx';
      export { default as DraftStatus } from './components/report-wizard/ResidentDraftStatus.jsx';
      export { ThemeProvider } from './contexts/ThemeContext.jsx';
    `,
    resolveDir: join(directory, '../src'),
    loader: 'jsx',
  },
  outfile: output, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic',
  define: { 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: '', PROD: false, DEV: false }) },
});
let appearance = 'light';
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.localStorage = { getItem: key => key === 'pulso_theme_mode' ? appearance : null };
globalThis.sessionStorage = { getItem: () => null };
Capacitor.isNativePlatform = () => true;
Capacitor.getPlatform = () => 'android';
const { Track, Home, GuestReport, Accuracy, Footer, DraftStatus, ThemeProvider } = await import(pathToFileURL(output));
const resources = {};
for (const language of ['en', 'tl']) {
  resources[language] = JSON.parse(await readFile(join(directory, `../src/locales/${language}.json`), 'utf8'));
}
const i18n = createInstance();
await i18n.init({ lng: 'en', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
function render(Page, route = '/', props = {}) {
  return renderToStaticMarkup(React.createElement(I18nextProvider, { i18n },
    React.createElement(ThemeProvider, null,
      React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Page, props)))));
}

test('tracking starts with one shared header and two required, labeled receipt fields', () => {
  const html = render(Track, '/track');
  assert.equal((html.match(/data-native-app-header/g) || []).length, 1);
  assert.match(html, /Track a report/);
  assert.match(html, /ticket ID and tracking code from your report receipt/);
  assert.match(html, /for="track-ticket-id"/);
  assert.match(html, /id="track-ticket-id"[^>]*required/);
  assert.match(html, /for="track-token"/);
  assert.match(html, /id="track-token"[^>]*required/);
  assert.match(html, /<button[^>]*type="submit"[^>]* disabled=/);
  assert.doesNotMatch(html, /Civic Aperture|Transparent Public Works|Secret Tracking Token|Searching Civic Registry/);
});

test('receipt deep links keep both credential formats intact', () => {
  for (const parameter of ['token', 'code']) {
    const html = render(Track, `/track?id=FAKE-TEST-340&${parameter}=FAKE-SECRET`);
    assert.match(html, /id="track-ticket-id"[^>]*value="FAKE-TEST-340"/);
    assert.match(html, /id="track-token"[^>]*value="FAKE-SECRET"/);
    assert.doesNotMatch(html, /<button[^>]*type="submit"[^>]* disabled=/);

    const native = render(Home, `/track?id=FAKE-TEST-340&${parameter}=FAKE-SECRET`, { trackingRoute: true });
    assert.match(native, /<dialog[^>]*class="native-bottom-sheet(?:\s[^"]*)?"/);
    assert.match(native, /id="track-ticket-id"[^>]*value="FAKE-TEST-340"/);
    assert.match(native, /id="track-token"[^>]*value="FAKE-SECRET"/);
    assert.doesNotMatch(native, /native-bottom-sheet__close/);
  }
});

test('home uses the same header without duplicating language or theme controls', () => {
  const html = render(Home);
  assert.equal((html.match(/data-native-app-header/g) || []).length, 1);
  assert.equal((html.match(/aria-label="Language \(EN\)" aria-expanded="false"/g) || []).length, 1);
  assert.match(html, /<div[^>]+role="group" aria-label="Language" hidden=/);
  assert.match(html, /<button[^>]+lang="en" aria-pressed="true"><span>English<\/span>/);
  assert.match(html, /<button[^>]+lang="tl" aria-pressed="false"><span>Filipino<\/span>/);
  assert.equal((html.match(/Switch to dark theme/g) || []).length, 1);
  assert.match(html, /<button[^>]*class="native-home__track" aria-haspopup="dialog"/);
  assert.doesNotMatch(html, /href="\/track"|<dialog/);
  assert.match(html, /href="\/report\?source=guest"/);
  assert.match(html, /<header\b[^>]*>[\s\S]*href="\/login"[\s\S]*<\/header>/);
  assert.doesNotMatch(html, /href="\/register"/);
  assert.match(html, /native-bonifacio-monument.webp/);
  assert.doesNotMatch(html, /native-home__step-icon"><span/);
});

test('signed-in residents retain report and tracking access without registration prompts', () => {
  const html = render(Home, '/', { residentSignedIn: true });
  assert.match(html, /href="\/report"/);
  assert.match(html, /<header\b[^>]*>[\s\S]*href="\/dashboard"[\s\S]*<\/header>/);
  assert.match(html, /<button[^>]*class="native-home__track" aria-haspopup="dialog"/);
  assert.doesNotMatch(html, /href="\/(?:login|register)"/);
});

test('guest confirmation offers both routes without the removed reminder in both languages', async () => {
  for (const language of ['en', 'tl']) {
    await i18n.changeLanguage(language);
    const html = render(GuestReport, '/', { onDismiss() {} });
    assert.match(html, /<dialog[^>]*aria-labelledby=/);
    assert.match(html, /href="\/report\?source=guest"/);
    assert.match(html, /href="\/login\?returnTo=%2Freport"/);
    assert.ok(html.includes(i18n.t('nativeAndroid.guestReport.title')));
    assert.doesNotMatch(html, /Save your receipt code after submitting|Itabi ang code sa resibo/);
  }
  await i18n.changeLanguage('en');
});

test('GPS estimates always show their measured accuracy; manual/default points do not inherit it', () => {
  for (const accuracy of [5, 25, 119]) {
    const location = { lat: 14.75, lng: 121.01, source: 'device-gps', accuracy: 999,
      deviceFix: { latitude: 14.75, longitude: 121.01, accuracy_m: accuracy } };
    assert.ok(render(Accuracy, '/', { location }).includes(`Approx. ±${accuracy}m`));
    assert.doesNotMatch(render(Accuracy, '/', { location: { ...location, source: 'selected-map' } }), /±|GPS selected/);
  }
  const unknown = { lat: 14.75, lng: 121.01, source: 'device-gps', deviceFix: { latitude: 14.75, longitude: 121.01 } };
  assert.match(render(Accuracy, '/', { location: unknown }), /Approximate location/);
  assert.equal(render(Accuracy, '/', { location: { lat: 14.75, lng: 121.01 } }), '');
});

test('native report hides unsubmitted notices while keeping final review and recovery', () => {
  assert.doesNotMatch(render(Footer), /Your report has not been submitted yet/);
  assert.match(render(Footer, '/', { isSubmit: true }), /Review your details carefully/);
  assert.equal(render(DraftStatus, '/', { draft: { status: 'new' } }), '');
  assert.match(render(DraftStatus, '/', { draft: { status: 'new' }, pending: true, onRecover() {} }), /Recover previous submission/);
  assert.match(render(DraftStatus, '/', { draft: { status: 'save_error', flush() {} } }), /role="alert"/);
});

test('Filipino tracking and the dark theme retain the same controls and short copy', async () => {
  appearance = 'dark';
  await i18n.changeLanguage('tl');
  const html = render(Track, '/track');
  assert.match(html, /Subaybayan ang ulat/);
  assert.match(html, /ticket ID at tracking code mula sa resibo/);
  assert.match(html, /aria-label="Wika \(TL\)"/);
  assert.match(html, /lang="en" aria-pressed="false"/);
  assert.match(html, /Gamitin ang temang ayon sa system/);
  assert.match(html, /id="track-token"[^>]*required/);
  await i18n.changeLanguage('en');
});
