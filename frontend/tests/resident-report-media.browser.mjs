// Full compiled-app QA with synthetic resident/API/native responses. No real user mutations.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const base = process.env.PULSO_QA_BASE_URL || 'http://127.0.0.1:5176';
const index = await readFile(join(root, 'dist/index.html'));
const screenshots = process.env.PULSO_UPDATE_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
const fixture = { id: -1, role: 'resident', full_name: 'Sample Resident', email: 'preview@example.invalid' };
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
try {
  for (const [language, theme, width] of [['en', 'light', 390], ['tl', 'dark', 320]]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: language === 'en' ? 'no-preference' : 'reduce' });
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === base) {
        if (request.resourceType() === 'document') return route.fulfill({ status: 200, contentType: 'text/html', body: index });
        return route.continue();
      }
      if (url.pathname === '/api/reports/user/-1') return route.fulfill({status:200,json:[
        {id:901,ticket_id:'QA-901',category:'Roads & Bridges',status:'pending',image_url:'/api/uploads/reports/qa-real.svg',created_at:'2026-11-10T08:00:00Z',location_lat:14.74,location_lng:121.01},
        {id:902,ticket_id:'QA-902',category:'Water Supply & Distribution',status:'pending',image_url:'/api/uploads/reports/qa-missing.svg',created_at:'2026-11-10T07:00:00Z'},
      ]});
      if (url.pathname === '/api/uploads/reports/qa-real.svg') return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#1188cc"/></svg>'});
      if (url.pathname === '/api/uploads/reports/qa-missing.svg') return route.fulfill({status:404,body:''});
      if (url.pathname === '/api/notifications/user/-1') return route.fulfill({status:200,json:[{id:1,title:'Synthetic report update',is_read:false},{id:2,title:'Synthetic city update',is_read:false}]});
      if (url.pathname.startsWith('/api/')) {
        const data = /\/users\/|\/residents\/|\/auth\/me$/.test(url.pathname) ? fixture : [];
        return route.fulfill({ status: 200, json: data });
      }
      return route.abort();
    });
    await page.addInitScript(({ language, theme, fixture }) => {
      localStorage.setItem('pulso_theme_mode', theme);
      localStorage.setItem('pulso_language', language);
      localStorage.setItem('pulso_tutorial_completed', 'true');
      if (!sessionStorage.getItem('__qa_guest')) {
        localStorage.setItem('pulso_token', 'fixture.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.fixture');
        localStorage.setItem('pulso_user', JSON.stringify(fixture));
      }
      window.androidBridge = {};
      window.__barCalls = [];
      Object.defineProperty(navigator, 'geolocation', { value: {
        getCurrentPosition: (_success, error) => error?.({ code: 1, message: 'Synthetic permission denied' }),
        watchPosition: (_success, error) => { error?.({ code: 1, message: 'Synthetic permission denied' }); return 1; },
        clearWatch: () => {},
      } });
      window.Capacitor = {
        PluginHeaders: [
          { name: 'SplashScreen', methods: [{ name: 'hide', rtype: 'promise' }] },
          { name: 'App', methods: [{ name: 'getInfo', rtype: 'promise' }, { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' }] },
          { name: 'PulsoAppearance', methods: [{ name: 'setSystemBars', rtype: 'promise' }] },
        ],
        nativePromise: async (plugin, method, options) => {
          if (plugin === 'PulsoAppearance') {
            window.__barCalls.push(options);
            document.documentElement.style.setProperty('--pulso-safe-top', options.edgeToEdge ? '24px' : '0px');
            document.documentElement.style.setProperty('--pulso-safe-bottom', options.edgeToEdge ? '24px' : '0px');
          }
          return plugin === 'App' && method === 'getInfo' ? { id: 'ph.gov.caloocan.pulso', version: '2.4.4', build: '5' } : {};
        },
        nativeCallback: async (_plugin, method, options, callback) => {
          if (method === 'addListener' && options.eventName === 'backButton') window.__nativeBack = callback;
          return 'fixture';
        },
      };
    }, { language, theme, fixture });
    await page.goto(base + '/dashboard');
    await page.locator('.native-resident-greeting').waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-native-app-header] button')].some(button => button.querySelector('.lucide-bell') && button.textContent.includes('2')));
    assert.equal(await page.locator('[data-resident-bottom-nav] [aria-label$="unread"]').count(), 0);
    assert.equal(await page.locator('[data-resident-bottom-nav] button').nth(3).innerText(), 'Updates');
    await page.locator('[data-resident-bottom-nav] button').nth(1).click();
    await page.waitForURL('**/dashboard?tab=reports');
    const photo=page.locator('img[src$="/api/uploads/reports/qa-real.svg"]');
    await photo.waitFor();
    assert.equal(await photo.getAttribute('src'), 'http://192.168.0.199:33159/api/uploads/reports/qa-real.svg');
    await page.waitForFunction(() => document.querySelector('img[src$="qa-real.svg"]')?.naturalWidth === 40);
    await page.getByText(language === 'en' ? 'Photo unavailable' : 'Hindi available ang larawan', {exact:true}).waitFor();
    assert.equal(await page.locator('img[src*="unsplash"]').count(), 0, 'No stock evidence substituted');
    if(screenshots) await page.screenshot({path:join(screenshots,'my-reports-media-'+theme+'.png'),fullPage:true});
    await page.evaluate(()=>{
      for (const key of ['pulso_user', 'user', 'pulso_token', 'token']) { localStorage.removeItem(key); sessionStorage.removeItem(key); }
      sessionStorage.setItem('__qa_guest', 'true');
    });
    await page.goto(base+'/report');
    const header=page.locator('[data-native-app-header]');
    await header.waitFor();
    assert.equal(await header.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.equal(await header.locator('a[href="/login"]').count(), 1, 'Guest header offers sign-in');
    if(screenshots) await page.screenshot({path:join(screenshots,'guest-header-'+theme+'.png')});
    await page.close();
  }
  console.log('PASS: report photos use backend URLs, missing evidence has an honest localized fallback, only bell shows unread count, guest header is transparent in both themes.');
} finally {await browser.close();}
