import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.jsx'
import './i18n'

// Filter out known external third-party deprecation warnings (e.g. @react-google-maps/api Marker deprecation)
const _originalWarn = console.warn;
console.warn = function (...args) {
  if (typeof args[0] === 'string' && args[0].includes('google.maps.Marker is deprecated')) {
    return;
  }
  _originalWarn.apply(console, args);
};

createRoot(document.getElementById('root')).render(
  <App />
)

// Register PWA service worker
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
