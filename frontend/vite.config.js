import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:33159',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:33159',
        changeOrigin: true,
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
})
