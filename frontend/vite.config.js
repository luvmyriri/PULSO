import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import os from 'node:os'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function getPrivateLanIpv4() {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address)
    .filter((address) => {
      const [first, second] = address.split('.').map(Number)
      return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)
    })

  return addresses.sort((a, b) => Number(b.startsWith('192.168.')) - Number(a.startsWith('192.168.')))[0] || ''
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const localCaptchaTest = mode === 'development' && env.VITE_RECAPTCHA_LOCAL_TEST === 'true'
  const androidVersion = readFileSync(new URL('./android/version.properties', import.meta.url), 'utf8')
  const expectedAndroidCode = Number(androidVersion.match(/^versionCode=(\d+)\r?$/m)?.[1])
  if (!Number.isSafeInteger(expectedAndroidCode)) throw new Error('Invalid Android version code')
  return {
  define: { __PULSO_ANDROID_EXPECTED_CODE__: JSON.stringify(expectedAndroidCode) },
  plugins: [
    mode === 'development' && {
      name: 'pulso-local-network-discovery',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/__dev/network-ip', (_req, res) => {
          const ip = getPrivateLanIpv4()
          res.statusCode = ip ? 200 : 503
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(ip ? { ip } : { error: 'No private LAN address found' }))
        })
      },
    },
    react({
      babel: {
        compact: false,
      },
    }),
    tailwindcss(),
    (mode === 'android' || mode === 'android-public') && {
      name: 'android-safe-viewport',
      // Let Capacitor reserve the system bars for every route and fixed overlay.
      transformIndexHtml(html) {
        return html.replace('viewport-fit=cover', 'viewport-fit=contain')
      },
    },
  ],
  server: {
    allowedHosts: true,
    // Do not expose an always-passing development challenge through the LAN proxy.
    host: localCaptchaTest ? '127.0.0.1' : '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:33159',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res.writeHead && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Backend service unavailable',
                message: err.message,
              }));
            }
          });
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:33159',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res.writeHead && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Uploads service unavailable',
                message: err.message,
              }));
            }
          });
        },
      },
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.endsWith('.apk')) {
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Disposition', 'attachment; filename="pulso-agent.apk"');
        }
        next();
      });
    }
  }
  }
})
