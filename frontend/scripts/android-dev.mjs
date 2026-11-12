import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { BlockList } from 'node:net';
import { networkInterfaces } from 'node:os';
import QRCode from 'qrcode';

const addresses = Object.entries(networkInterfaces()).flatMap(([adapter, entries]) =>
  entries.filter(({ internal, cidr, address }) => !internal && cidr &&
    /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/.test(address)
  ).map((entry) => ({ adapter, ...entry }))
);
const [requestedAddress, ...extraArgs] = process.argv.slice(2);
const lan = requestedAddress
  ? addresses.find(({ address }) => address === requestedAddress)
  : addresses.length === 1 ? addresses[0] : null;
if (!lan || extraArgs.length) {
  console.error('Run bash scripts/android-dev.sh with your Wi-Fi or Ethernet IPv4 address.');
  for (const { adapter, address } of addresses) console.error(`  ${adapter}: ${address}`);
  process.exit(1);
}

const api = `http://${lan.address}:33159`;
const origin = `http://${lan.address}:4174`;
const apkRoute = '/pulso-dev.apk';
const health = await fetch(`${api}/api/health`, {
  headers: { Origin: 'https://localhost' },
  signal: AbortSignal.timeout(4000),
}).catch(() => null);
if (!health?.ok || health.headers.get('access-control-allow-origin') !== 'https://localhost') {
  console.error(`Start the PULSO backend on port 33159 with PULSO_ENV=development and a LAN binding. The app could not reach ${api} with its required access settings.`);
  process.exit(1);
}
await health.body?.cancel();

console.log(`Building the development APK for ${api}`);
const build = spawnSync(process.execPath, ['scripts/android.mjs', 'apk'], {
  env: { ...process.env, VITE_API_BASE_URL: api },
  stdio: 'inherit',
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const apk = await readFile('android/app/build/outputs/apk/debug/app-debug.apk');
const mark = await readFile('public/pulso-loading-mark.png');
const qr = await QRCode.toString(`${origin}/`, { type: 'svg', margin: 4, width: 240 });
const page = Buffer.from(`<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PULSO development APK</title>
<style>
  :root { font: 100%/1.55 system-ui, sans-serif; color-scheme: light dark;
    --canvas:#f7f9fc; --ink:#172339; --muted:#475569; --rule:#cbd5e1; --action:#a43b0c; --label:#fff; }
  @media(prefers-color-scheme: dark) {
    :root { --canvas:#0c1421; --ink:#f8fafc; --muted:#cbd5e1; --rule:#475569; --action:#ff9a55; --label:#241608; }
  }
  body { margin:0; color:var(--ink); background:var(--canvas); }
  main { box-sizing:border-box; max-width:34rem; margin:auto; padding:2rem 1.5rem; }
  header { display:flex; align-items:center; gap:.6rem; padding-bottom:1rem; border-bottom:1px solid var(--rule); }
  h1 { font-size:clamp(1.7rem, 7vw, 2.4rem); line-height:1.2; margin:1.5rem 0 .5rem; }
  p { color:var(--muted); }
  figure { margin:1.5rem 0; }
  figure img { display:block; width:min(15rem,100%); height:auto; border:1px solid var(--rule); }
  figcaption { overflow-wrap:anywhere; margin-top:.6rem; }
  a { color:inherit; }
  a:focus-visible { outline:3px solid var(--action); outline-offset:4px; }
  .download { display:inline-flex; align-items:center; min-height:3rem; box-sizing:border-box; padding:.5rem 1rem;
    border-radius:.4rem; background:var(--action); color:var(--label); font-weight:700; text-decoration:none; }
  .download:hover { text-decoration:underline; }
</style>
<main>
  <header><img src="/mark.png" alt="" width="40" height="40"><strong>PULSO</strong></header>
  <h1>Install PULSO for development</h1>
  <p>Connect your Android phone to the same Wi-Fi as this computer, then scan the QR code. Keep this terminal and the PULSO backend running while you test.</p>
  <figure>
    <img src="/qr.svg" width="240" height="240" alt="QR code for this download page">
    <figcaption><a href="${origin}/">${origin}/</a></figcaption>
  </figure>
  <a class="download" href="${apkRoute}" download>Download Android APK</a>
  <p>Open the downloaded APK on your phone. If Android asks, allow installs from the browser or file manager you used.</p>
</main>`);

const subnet = new BlockList();
subnet.addSubnet(lan.address, Number(lan.cidr.split('/')[1]), 'ipv4');
const files = new Map([
  ['/', { body: page, type: 'text/html; charset=utf-8' }],
  ['/qr.svg', { body: Buffer.from(qr), type: 'image/svg+xml' }],
  ['/mark.png', { body: mark, type: 'image/png' }],
  [apkRoute, { body: apk, type: 'application/vnd.android.package-archive', attachment: true }],
]);

const server = createServer((req, res) => {
  if (!subnet.check(req.socket.remoteAddress, 'ipv4') || req.headers.host !== `${lan.address}:4174`) {
    res.writeHead(403).end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const file = files.get(req.url);
  if (!file) {
    res.writeHead(404).end();
    return;
  }
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Length': file.body.length,
    'Content-Type': file.type,
    'X-Content-Type-Options': 'nosniff',
  };
  if (file.attachment) headers['Content-Disposition'] = 'attachment; filename="pulso-dev.apk"';
  res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : file.body);
});
server.on('error', (error) => {
  console.error(`Could not serve ${origin} (${error.code}).`);
  process.exitCode = 1;
});
server.listen(4174, lan.address, () => {
  console.log(`\nOpen ${origin}/ in your browser and scan the QR with your Android phone.\nPress Ctrl+C to stop sharing.`);
});
