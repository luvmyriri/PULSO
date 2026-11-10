import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nextAndroidVersion, publishAndroidUpdate, applicationId } from '../scripts/android-release.mjs';
import { updateState } from '../src/utils/appUpdates.js';

const installed = { id: applicationId, build: '4', version: '2.4.3' };
const release = { applicationId, versionCode: 5, versionName: '2.4.4', sha256: 'a'.repeat(64), size: 123 };

test('only a higher build of the same app offers an update', () => {
  assert.equal(updateState(release, installed), 'available');
  assert.equal(updateState(release, { ...installed, build: '5' }), 'current');
  assert.equal(updateState(release, { ...installed, build: '6' }), 'current');
  for (const bad of [{ ...release, applicationId: 'other' }, { ...release, versionCode: '5' },
    { ...release, sha256: 'invalid' }, { ...release, size: -1 }, { ...release, versionName: null }]) {
    assert.throws(() => updateState(bad, installed));
  }
});

test('successive APK builds increase versions and publish completed immutable downloads', () => {
  const root = mkdtempSync(join(tmpdir(), 'pulso-update-test-'));
  try {
    const output = join(root, 'android/app/build/outputs/apk/debug');
    mkdirSync(output, { recursive: true });
    writeFileSync(join(root, 'android/version.properties'), 'versionCode=4\nversionName=2.4.3\n');
    const version = nextAndroidVersion(root);
    assert.deepEqual(version, { versionCode: 5, versionName: '2.4.4' });
    writeFileSync(join(output, 'app-debug.apk'), 'synthetic APK bytes');
    writeFileSync(join(output, 'output-metadata.json'), JSON.stringify({ applicationId, elements: [{ ...version, outputFile: 'app-debug.apk' }] }));
    const published = publishAndroidUpdate(root);
    assert.equal(published.versionCode, 5);
    assert.equal(published.size, 19);
    assert.match(published.sha256, /^[a-f0-9]{64}$/);
    assert.equal(readFileSync(join(root, 'android/updates/pulso-5.apk'), 'utf8'), 'synthetic APK bytes');
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'android/updates/latest.json'), 'utf8')), published);
    assert.throws(() => publishAndroidUpdate(root), /already been published/);
    assert.deepEqual(nextAndroidVersion(root), { versionCode: 6, versionName: '2.4.5' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
