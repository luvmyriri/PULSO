import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const source = await readFile(new URL('../src/utils/apiBase.js', import.meta.url), 'utf8');
async function resolveBase(env, port = '') {
    globalThis.window = { location: { hostname: 'pulso.example.invalid', port } };
    const built = await transform(source, { format: 'esm', define: { 'import.meta.env': JSON.stringify(env) } });
    const module = await import(`data:text/javascript;base64,${Buffer.from(built.code).toString('base64')}#${encodeURIComponent(port)}`);
    return module.API_BASE_URL;
}

test('production uses the secure page origin unless an API origin is explicitly configured', async () => {
    assert.equal(await resolveBase({ PROD: true }), '');
    assert.equal(await resolveBase({ PROD: true, VITE_API_BASE_URL: '' }), '');
    assert.equal(await resolveBase({ PROD: true, VITE_API_BASE_URL: 'https://api.example.invalid/' }), 'https://api.example.invalid');
});

test('development retains the local proxy and direct-backend workflows', async () => {
    assert.equal(await resolveBase({ PROD: false }, '5173'), '');
    assert.equal(await resolveBase({ PROD: false }, '4173'), '');
    assert.equal(await resolveBase({ PROD: false }, '3000'), 'http://pulso.example.invalid:33159');
});
