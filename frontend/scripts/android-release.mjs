import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const applicationId = 'ph.gov.caloocan.pulso';
const metadataPath = (root, variant) => join(root, 'android/app/build/outputs/apk', variant, 'output-metadata.json');

export function nextAndroidVersion(root, variant = 'debug') {
  if (!['debug', 'release'].includes(variant)) throw new Error('Unknown Android build variant.');
  const file = join(root, 'android/version.properties');
  const properties = Object.fromEntries(readFileSync(file, 'utf8').trim().split(/\r?\n/).map(line => line.split('=')));
  const versions = [{ versionCode: Number(properties.versionCode), versionName: properties.versionName }];
  for (const build of ['debug', 'release']) {
    if (existsSync(metadataPath(root, build))) versions.push(JSON.parse(readFileSync(metadataPath(root, build), 'utf8')).elements[0]);
  }
  const latest = join(root, 'android/updates/latest.json');
  if (existsSync(latest)) versions.push(JSON.parse(readFileSync(latest, 'utf8')));
  if (versions.some(v => !Number.isSafeInteger(v.versionCode) || v.versionCode < 1 || !/^\d+\.\d+\.\d+$/.test(v.versionName))) {
    throw new Error('Invalid Android version metadata.');
  }
  const previous = versions.sort((a, b) => b.versionCode - a.versionCode)[0];
  const parts = previous.versionName.split('.').map(Number);
  const version = { versionCode: previous.versionCode + 1, versionName: `${parts[0]}.${parts[1]}.${parts[2] + 1}` };
  writeFileSync(file, `versionCode=${version.versionCode}\nversionName=${version.versionName}\n`);
  return version;
}

export function publishAndroidUpdate(root, variant = 'debug') {
  if (!['debug', 'release'].includes(variant)) throw new Error('Unknown Android build variant.');
  const metadata = JSON.parse(readFileSync(metadataPath(root, variant), 'utf8'));
  if (metadata.applicationId !== applicationId || metadata.elements.length !== 1) throw new Error('Unexpected Android package.');
  const { versionCode, versionName, outputFile } = metadata.elements[0];
  if (outputFile !== `app-${variant}.apk` || !Number.isSafeInteger(versionCode) || versionCode < 1) throw new Error('Invalid APK metadata.');
  const apk = join(root, 'android/app/build/outputs/apk', variant, outputFile);
  const bytes = readFileSync(apk);
  const directory = join(root, 'android/updates');
  mkdirSync(directory, { recursive: true });
  const target = join(directory, `pulso-${versionCode}.apk`);
  if (existsSync(target)) throw new Error('This update version has already been published. Build a new version.');
  copyFileSync(apk, `${target}.tmp`);
  renameSync(`${target}.tmp`, target);
  const release = { applicationId, versionCode, versionName, size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    publishedAt: new Date().toISOString() };
  const latest = join(directory, 'latest.json');
  writeFileSync(`${latest}.tmp`, JSON.stringify(release, null, 2));
  renameSync(`${latest}.tmp`, latest);
  return release;
}
