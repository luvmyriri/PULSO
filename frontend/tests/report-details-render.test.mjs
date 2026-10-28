import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';

test('resident report states render without missing icons and without the removed activity card', async t => {
    const root = dirname(fileURLToPath(import.meta.url));
    const temporary = await mkdtemp(join(root, '.report-detail-'));
    assert.equal(dirname(temporary), root);
    t.after(() => rm(temporary, { recursive: true, force: true }));
    const output = join(temporary, 'report.mjs');
    await build({ entryPoints: [join(root, '../src/components/ReportDetailView.jsx')], outfile: output,
        bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic',
        define: { 'import.meta.env': '{"DEV":true,"VITE_API_BASE_URL":""}' },
        plugins: [{ name: 'maps-state', setup(builder) {
            builder.onResolve({ filter: /GoogleMapsContext$/ }, () => ({ path: 'maps-state', namespace: 'mock' }));
            builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const useGoogleMaps = () => ({ isLoaded: false });' }));
        } }],
    });
    globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    t.after(() => { delete globalThis.sessionStorage; delete globalThis.localStorage; });
    const { default: Report } = await import(pathToFileURL(output));
    const i18n = createInstance();
    const en = JSON.parse(await readFile(join(root, '../src/locales/en.json'), 'utf8'));
    await i18n.init({ lng: 'en', resources: { en }, interpolation: { escapeValue: false } });
    for (const status of ['pending', 'received', 'verified', 'assigned', 'in_progress', 'needs_information', 'resolved', 'rejected']) {
        const html = renderToStaticMarkup(React.createElement(I18nextProvider, { i18n }, React.createElement(Report, {
            report: { id: 123, ticket_id: 'TEST-123', category: 'Roads & Bridges', status, is_sample: true, location_string: 'Barangay Sample, Sample City' },
            onBack() {},
        })));
        assert.match(html, /TEST-123/, status);
        assert.doesNotMatch(html, /Report activity|System Fault/, status);
    }
});
