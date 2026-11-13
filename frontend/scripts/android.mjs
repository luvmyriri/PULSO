import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir, networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { nextAndroidVersion, publishAndroidUpdate } from './android-release.mjs';
import { androidApiOrigin, privateIpv4 } from './android-build-config.mjs';

const mode = process.argv[2];
const root = process.cwd();
const isWindows = process.platform === 'win32';

if (mode === 'ip') {
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const address of addresses) {
      if (!address.internal && privateIpv4(address.address)) console.log(name, address.address);
    }
  }
  process.exit(0);
}

const publicBuild = mode === 'apk-public';
const packageBuild = mode === 'apk' || publicBuild;
const env = { ...process.env, PULSO_CAPACITOR_DEBUG: publicBuild ? '0' : '1', PULSO_ANDROID_PUBLIC: publicBuild ? '1' : '0' };
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

if (!['sync', 'run', 'apk', 'apk-public'].includes(mode)) throw new Error('Use sync, open, run, apk, apk-public or ip.');
const buildMode = publicBuild ? 'android-public' : 'android';
const configuredUrl = process.env.VITE_API_BASE_URL || loadEnv(buildMode, root).VITE_API_BASE_URL;
const url = new URL(androidApiOrigin(configuredUrl, publicBuild));
const allowedHosts = new Set(['localhost', '127.0.0.1', '10.0.2.2']);
if (publicBuild && ['PULSO_ANDROID_KEYSTORE', 'PULSO_ANDROID_STORE_PASSWORD', 'PULSO_ANDROID_KEY_ALIAS', 'PULSO_ANDROID_KEY_PASSWORD'].some(key => !env[key])) {
  throw new Error('A persistent signing key must be configured for public APK builds.');
}

env.PULSO_ANDROID_LAN = publicBuild || allowedHosts.has(url.hostname) ? '0' : '1';
allowedHosts.add(url.hostname);
env.VITE_API_BASE_URL = url.origin;
if (publicBuild) env.VITE_RECAPTCHA_LOCAL_TEST = 'false';

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

if (packageBuild) {
  const version = nextAndroidVersion(root, publicBuild ? 'release' : 'debug');
  console.log(`Building PULSO ${version.versionName} (${version.versionCode})`);
}
run(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--mode', buildMode]);
capacitor('sync', 'android');
if (mode === 'run') capacitor('run', 'android', '--no-sync', ...process.argv.slice(3));
if (packageBuild) {
  const android = join(root, 'android');
  const task = publicBuild ? 'assembleRelease' : 'assembleDebug';
  if (isWindows) run(process.env.ComSpec || 'cmd.exe', ['/d', '/c', `gradlew.bat ${task} --no-daemon --max-workers=2`], android);
  else run('sh', ['./gradlew', task, '--no-daemon', '--max-workers=2'], android);
  const release = publishAndroidUpdate(root, publicBuild ? 'release' : 'debug');
  console.log(`Published app update ${release.versionName} (${release.versionCode}) to the PULSO backend.`);
}
