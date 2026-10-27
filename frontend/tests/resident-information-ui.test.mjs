import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';

// Render the shipped JSX with real translations; no browser or application data.
const root = dirname(fileURLToPath(import.meta.url));
const temporary = await mkdtemp(join(root, '.information-ui-'));
assert.equal(dirname(temporary), root);
const output = join(temporary, 'reply.mjs');
after(() => rm(temporary, { recursive: true, force: true }));
await build({ entryPoints: [join(root, '../src/components/ResidentInformationReply.jsx')], outfile: output,
    bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic',
    define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
globalThis.sessionStorage = { getItem: () => null };
globalThis.localStorage = { getItem: () => null };
const { default: Reply } = await import(pathToFileURL(output));
const resources = {};
for (const language of ['en', 'tl']) resources[language] = JSON.parse(await readFile(join(root, `../src/locales/${language}.json`), 'utf8'));
const i18n = createInstance();
await i18n.init({ lng: 'en', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
const request = { id: 2, status: 'needs_information', note: 'Please identify the nearest intersection.', created_at: '2026-10-27T13:00:00Z' };
function render(activity) {
    return renderToStaticMarkup(React.createElement(I18nextProvider, { i18n }, React.createElement(Reply, {
        report: { id: 340, ticket_id: 'FAKE-TEST-340' }, activity, onSubmitted() {},
    })));
}

test('the latest government request, privacy notice and labeled reply field are visible', () => {
    const html = render({ data: [request, { ...request, id: 1, note: 'Older request', created_at: '2026-10-26T12:00:00Z' }] });
    assert.match(html, /Please identify the nearest intersection/);
    assert.doesNotMatch(html, /Older request/);
    assert.match(html, /for="report-information-reply"/);
    assert.match(html, /minLength="10"/);
    assert.match(html, /maxLength="2000"/);
    assert.match(html, /not shown publicly/);
    assert.match(html, /Send information/);
});

test('loading and failed request details do not present a reply form', () => {
    const loading = render({ loading: true, data: null });
    assert.match(loading, /Loading the department/);
    assert.doesNotMatch(loading, /<textarea/);
    const failed = render({ error: 'FAKE unreachable', data: null });
    assert.match(failed, /role="alert"/);
    assert.match(failed, /Try again/);
    assert.doesNotMatch(failed, /<textarea/);
});

test('request text is escaped and Filipino controls retain functional parity', async () => {
    const unsafe = render({ data: [{ ...request, note: '<script>untrusted text</script>' }] });
    assert.match(unsafe, /&lt;script&gt;/);
    assert.doesNotMatch(unsafe, /<script>/);
    await i18n.changeLanguage('tl');
    const filipino = render({ data: [request] });
    assert.match(filipino, /Hinihinging impormasyon/);
    assert.match(filipino, /Ang iyong sagot/);
    assert.match(filipino, /Ipadala ang impormasyon/);
    assert.match(filipino, /hindi ito ipapakita sa publiko/);
});
