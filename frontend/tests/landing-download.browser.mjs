// Public-mode UI with synthetic manifests; no resident records or providers.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {build} from 'esbuild';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const entry=`
import React from 'react';import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {createInstance} from 'i18next';import {I18nextProvider} from 'react-i18next';
import Hero from './src/components/landing/HeroSection';
import en from './src/locales/en.json';import tl from './src/locales/tl.json';
const i18n=createInstance();await i18n.init({lng:new URLSearchParams(location.search).get('lang')||'en',resources:{en,tl},fallbackLng:'en'});
createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><MemoryRouter><Hero/></MemoryRouter></I18nextProvider>);`;
const bundled=await build({stdin:{contents:entry,loader:'jsx',resolveDir:process.cwd()},bundle:true,format:'esm',write:false,
 define:{'process.env.NODE_ENV':'"test"','import.meta.env':'{"DEV":false,"PROD":true,"VITE_API_BASE_URL":""}'}});
const assets=join(process.cwd(),'dist/assets');const css=await readFile(join(assets,(await readdir(assets)).find(n=>/^index-.*\.css$/.test(n))));
const server=createServer(async(req,res)=>{
 if(req.url==='/fixture.js')return res.writeHead(200,{'Content-Type':'text/javascript'}).end(bundled.outputFiles[0].text);
 if(req.url==='/style.css')return res.writeHead(200,{'Content-Type':'text/css'}).end(css);
 if(/\.png$/.test(req.url)){try{return res.end(await readFile(join(process.cwd(),'public',req.url)));}catch{return res.writeHead(404).end();}}
 res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [lang,width,dark] of [['en',1100,false],['tl',320,true]]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let available=true;const release={applicationId:'ph.gov.caloocan.pulso',versionCode:22,versionName:'2.4.21',size:100,sha256:'a'.repeat(64)};
  await page.route('**/api/mobile/app-updates/latest',r=>r.fulfill({status:available?200:503,contentType:'application/json',body:JSON.stringify(available?release:{detail:'Unavailable'})}));
  await page.goto(base+'/?lang='+lang);await page.evaluate(d=>document.documentElement.classList.toggle('dark',d),dark);
  await page.getByText('v2.4.21',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Open the Android APK QR code'}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  await dialog.locator('a[href$="/api/mobile/app-updates/download"]').first().waitFor();
  assert.equal(await dialog.locator('a[href="'+base+'/api/mobile/app-updates/download"]').count(),2);
  assert.equal(await dialog.getByText(/Same Wi-Fi|Development build|computer’s Wi-Fi/).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  available=false;await page.reload();
  await page.getByRole('button',{name:'Open the PULSO mobile QR code'}).click();
  await page.getByRole('status').filter({hasText:lang==='en'?'temporarily unavailable':'pansamantalang'}).waitFor();
  assert.equal(await page.locator('a[href$="/api/mobile/app-updates/download"]').count(),0);
  available=true;await page.getByRole('button',{name:lang==='en'?'Try again':'Subukang muli'}).click();
  await dialog.locator('a[href$="/api/mobile/app-updates/download"]').first().waitFor();
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Public install UI passed: English/light, Filipino/dark, 320px, failure and retry.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
