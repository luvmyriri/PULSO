import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { homedir, networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { nextAndroidVersion, publishAndroidUpdate } from './android-release.mjs';

const mode = process.argv[2];
const root = process.cwd();
const isWindows = process.platform === 'win32';

function privateIpv4(host) {
  if (isIP(host) !== 4) return false;
  const [first, second] = host.split('.').map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

if (mode === 'ip') {
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const address of addresses) {
      if (!address.internal && privateIpv4(address.address)) console.log(name, address.address);
    }
  }
  process.exit(0);
}

const env = { ...process.env, PULSO_CAPACITOR_DEBUG: '1' };
const studioJdk = 'C:/Program Files/Android/Android Studio/jbr';
const projectSdk = join(root, '.android-sdk');
const defaultSdk = join(homedir(), 'AppData', 'Local', 'Android', 'Sdk');
env.ANDROID_HOME ||= env.ANDROID_SDK_ROOT || (existsSync(join(projectSdk, 'platforms')) ? projectSdk : '');
if (isWindows && !env.ANDROID_HOME && existsSync(defaultSdk)) env.ANDROID_HOME = defaultSdk;
if (isWindows && !env.JAVA_HOME && existsSync(studioJdk)) env.JAVA_HOME = studioJdk;

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capacitor(...args) {
  run(process.execPath, [join(root, 'node_modules/@capacitor/cli/bin/capacitor'), ...args]);
}

if (mode === 'open') {
  capacitor('open', 'android');
  process.exit(0);
}

if (!['sync', 'run', 'apk'].includes(mode)) throw new Error('Use sync, open, run, apk or ip.');
const configuredUrl = process.env.VITE_API_BASE_URL || loadEnv('android', root).VITE_API_BASE_URL;
const url = new URL(configuredUrl);
const allowedHosts = new Set(['localhost', '127.0.0.1', '10.0.2.2']);
if (url.protocol !== 'http:' || url.port !== '33159' || url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash ||
    (!allowedHosts.has(url.hostname) && !privateIpv4(url.hostname))) {
  throw new Error('Android builds require an HTTP API on port 33159 using localhost, the emulator, or a private LAN IPv4 address.');
}
env.PULSO_ANDROID_LAN = allowedHosts.has(url.hostname) ? '0' : '1';
allowedHosts.add(url.hostname);
env.VITE_API_BASE_URL = url.origin;

const debugXml = join(root, 'android/app/src/debug/res/xml');
mkdirSync(debugXml, { recursive: true });
const domains = [...allowedHosts].map((host) => `        <domain includeSubdomains="false">${host}</domain>`).join('\n');
writeFileSync(join(debugXml, 'pulso_debug_network.xml'), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
${domains}
    </domain-config>
</network-security-config>
`);

if (mode === 'apk') {
  const version = nextAndroidVersion(root);
  console.log(`Building PULSO ${version.versionName} (${version.versionCode})`);
}
run(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'android']);
capacitor('sync', 'android');
if (mode === 'run') capacitor('run', 'android', '--no-sync', ...process.argv.slice(3));
if (mode === 'apk') {
  const android = join(root, 'android');
  if (isWindows) run(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'gradlew.bat assembleDebug'], android);
  else run('./gradlew', ['assembleDebug'], android);
  const release = publishAndroidUpdate(root);
  console.log(`Published app update ${release.versionName} (${release.versionCode}) to the PULSO backend.`);
}
