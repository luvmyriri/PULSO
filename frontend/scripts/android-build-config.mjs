import { isIP } from 'node:net';

export function privateIpv4(host) {
  if (isIP(host) !== 4) return false;
  const [first, second] = host.split('.').map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

export function androidApiOrigin(value, publicBuild = false) {
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Use an API origin without credentials, path, query or fragment.');
  }
  if (publicBuild) {
    if (url.protocol !== 'https:' || (url.port && url.port !== '443') || isIP(url.hostname) ||
        !url.hostname.includes('.') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)) {
      throw new Error('Public APK builds require the public HTTPS API hostname.');
    }
  } else if (url.protocol !== 'http:' || url.port !== '33159' ||
      (!['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname) && !privateIpv4(url.hostname))) {
    throw new Error('Local Android builds require HTTP port 33159 on loopback, emulator or a private LAN IPv4 address.');
  }
  return url.origin;
}
