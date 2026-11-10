// Real image decoding/canvas with synthetic report images; no Maps/API user data.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const entry = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import usePins from './src/utils/useReportPhotoPins';
const meta = () => ({color:'#ff6b00'});
function Harness() {
 const [reports,setReports]=useState([{id:1,image_url:'/api/uploads/reports/slow.svg'}, {id:2,image_url:'/api/uploads/reports/fallback.svg'}]);
 const icons=usePins(reports,meta);
 window.__pins=icons;
 window.__refresh=()=>setReports(previous=>[...previous]);
 window.__replace=()=>setReports([{id:1,image_url:'/api/uploads/reports/replacement.svg'}]);
 return React.createElement('div',null,Object.entries(icons).map(([key,url])=>React.createElement('img',{key,src:url,'data-pin-key':key})));
}
createRoot(document.getElementById('root')).render(React.createElement(Harness));`;
const compiled = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, write: false,
    format: 'esm', define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://media.example.invalid"}' } });
const server = createServer((req,res) => {
    res.setHeader('Content-Type', req.url === '/bundle.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/bundle.js' ? compiled.outputFiles[0].text : '<div id="root"></div><script type="module" src="/bundle.js"></script>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
    const page = await browser.newPage();
    const requests = [];
    await page.route('https://media.example.invalid/**',async route=> {
        const url = new URL(route.request().url());
        requests.push(url.pathname+url.search);
        const source = url.searchParams.get('src') || url.pathname;
        if(source.includes('slow')) await new Promise(resolve=>setTimeout(resolve,350));
        if(url.pathname === '/api/thumbnails' && source.includes('fallback')) return route.fulfill({status:404,headers:{'Access-Control-Allow-Origin':'*'},body:''});
        const color = source.includes('replacement') ? '#cc2266' : source.includes('fallback') ? '#1188cc' : '#22aa66';
        await route.fulfill({contentType:'image/svg+xml',headers:{'Access-Control-Allow-Origin':'*'},body:`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${color}"/></svg>`});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>Object.keys(window.__pins||{}).length>=2);
    await page.evaluate(()=>window.__refresh());
    await page.waitForFunction(()=>Object.keys(window.__pins||{}).length===4);
    const colors = await page.evaluate(async()=> {
        const result=[];
        for(const [key,src] of Object.entries(window.__pins)) {
            const img=new Image(); img.src=src; await img.decode();
            const canvas=document.createElement('canvas'); canvas.width=img.width;canvas.height=img.height;
            const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
            result.push({key:JSON.parse(key),pixel:[...ctx.getImageData(img.width/2,18,1,1).data]});
        }
        return result;
    });
    for(const {key,pixel} of colors) assert.deepEqual(pixel, key[0]===1 ? [34,170,102,255] : [17,136,204,255]);
    assert(requests.some(path=>path==='/api/uploads/reports/fallback.svg'), 'Thumbnail failure loads the same evidence source');
    await page.evaluate(()=>window.__replace());
    await page.waitForFunction(()=>Object.keys(window.__pins||{}).filter(key=>key.includes('replacement')).length===2);
    assert(requests.some(path=>path.includes('replacement')), 'Changing a report photo invalidates its pin key');
    console.log('PASS: slow photo pins survive report rerenders; original-image fallback uses the loaded image; photo changes refresh cached pins.');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
