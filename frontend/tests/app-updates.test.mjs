import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nextAndroidVersion, publishAndroidUpdate, applicationId } from '../scripts/android-release.mjs';
import { updateState, publishedAndroidRelease } from '../src/utils/appUpdates.js';
import { androidApiOrigin } from '../scripts/android-build-config.mjs';

const installed = { id: applicationId, build: '4', version: '2.4.3' };
const release = { applicationId, versionCode: 5, versionName: '2.4.4', sha256: 'a'.repeat(64), size: 123 };

test('public APK accepts an HTTPS origin and rejects local or insecure configuration', () => {
  assert.equal(androidApiOrigin('https://srv1857115.hstgr.cloud', true), 'https://srv1857115.hstgr.cloud');
  for (const bad of ['http://example.com', 'https://localhost', 'https://192.168.1.1',
    'https://app.local', 'https://example.com/api', 'https://user:pass@example.com', 'https://example.com?key=secret']) {
    assert.throws(() => androidApiOrigin(bad, true));
  }
  assert.equal(androidApiOrigin('http://192.168.1.2:33159'), 'http://192.168.1.2:33159');
  assert.throws(() => androidApiOrigin('http://example.com:33159'));
});

test('landing download requires valid package metadata', () => {
  assert.deepEqual(publishedAndroidRelease(release), release);
  for (const bad of [null, {}, { ...release, applicationId: 'other' }, { ...release, size: 0 }]) {
    assert.equal(publishedAndroidRelease(bad), null);
  }
});

test('signed release publication uses release output and cannot overwrite a version', () => {
  const root = mkdtempSync(join(tmpdir(), 'pulso-public-test-'));
  try {
    const output = join(root, 'android/app/build/outputs/apk/release');
    mkdirSync(output, { recursive: true });
    writeFileSync(join(root, 'android/version.properties'), 'versionCode=21\nversionName=2.4.20\n');
    const version = nextAndroidVersion(root, 'release');
    assert.equal(version.versionCode, 22);
    writeFileSync(join(output, 'app-release.apk'), 'synthetic signed package');
    writeFileSync(join(output, 'output-metadata.json'), JSON.stringify({applicationId, elements: [{...version, outputFile:'app-release.apk'}]}));
    assert.equal(publishAndroidUpdate(root, 'release').versionCode, 22);
    assert.throws(() => publishAndroidUpdate(root, 'release'), /already been published/);
    assert.equal(nextAndroidVersion(root, 'release').versionCode, 23);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

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
