import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const localCaptchaTest = mode === 'development' && env.VITE_RECAPTCHA_LOCAL_TEST === 'true'
  return {
  plugins: [
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
