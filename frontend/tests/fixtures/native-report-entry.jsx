// Isolated SAMPLE native UI: device estimates and API failures are synthetic.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import '../../src/i18n';
import '../../src/index.css';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import NativeResidentLanding from '../../src/components/mobile/NativeResidentLanding';
import NativeAppGuide from '../../src/components/mobile/NativeAppGuide';
import NativeUpdateNotifications from '../../src/components/mobile/NativeUpdateNotifications';
import ReportWizardPage from '../../src/pages/ReportWizardPage';
import { dismissAndroidLayer } from '../../src/utils/nativeAndroid';

Capacitor.isNativePlatform = () => true;
Capacitor.getPlatform = () => 'android';
const params = new URLSearchParams(window.location.search);
const signedIn = params.get('signedIn') === '1';
Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
  getCurrentPosition(success, failure) {
    if (params.has('denied')) return setTimeout(() => failure({ code: 1 }), 0);
    setTimeout(() => success({ coords: { latitude: 14.7565, longitude: 121.045, accuracy: Number(params.get('accuracy') || 119) }, timestamp: Date.now() }), 0);
  },
} });
const nativeFetch = window.fetch.bind(window);
window.fetch = (url, options) => {
  if (String(url).includes('/api/mobile/app-updates/latest') && window.__SAMPLE_update) {
    window.__SAMPLE_updateChecks = (window.__SAMPLE_updateChecks || 0) + 1;
    return Promise.resolve(new Response(JSON.stringify(window.__SAMPLE_update), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
  return String(url).includes('/api/')
    ? Promise.resolve(new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } }))
    : nativeFetch(url, options);
};
window.__SAMPLE_nativeBack = dismissAndroidLayer;
function Review() {
  const location = useLocation();
  return <div className="native-update-layout">
    {params.has('update') && <NativeUpdateNotifications />}
    <div className="native-update-layout__screen">
    <output data-review-route className="sr-only">{location.pathname}{location.search}</output>
    <Routes>
      <Route path="/" element={<NativeResidentLanding residentSignedIn={signedIn} />} />
      <Route path="/report" element={<ReportWizardPage />} />
      <Route path="/guide" element={<NativeAppGuide firstLaunch />} />
      <Route path="/login" element={<h1>SAMPLE sign-in destination</h1>} />
    </Routes>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<ThemeProvider><MemoryRouter initialEntries={[params.has('guide') ? '/guide' : '/']}><Review /></MemoryRouter></ThemeProvider>);
