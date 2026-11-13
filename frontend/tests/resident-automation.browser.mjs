// Real local report routes; synthetic data/providers only. Never submits to the real API.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const base=process.env.PULSO_AUTOMATION_REVIEW_URL||'http://127.0.0.1:5178';
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base));
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('../scratch/resident-automation',{recursive:true});
try{
 for(const [lang,width,dark] of [['en',1100,false],['tl',320,true]]){
  for(const mode of ['wizard','quick']){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   await context.addInitScript(({lang,dark})=>{localStorage.setItem('pulso_language',lang);localStorage.setItem('i18nextLng',lang);localStorage.setItem('pulso_theme_mode',dark?'dark':'light');},{lang,dark});
   const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
   const url=`${base}/tests/resident-draft-review.html?view=${mode}&automation=1`;
   await page.goto(url);await page.getByRole('button',{name:'Seed SAMPLE draft',exact:true}).click();
   await page.getByRole('status').filter({hasText:'SAMPLE original photo and metadata seeded'}).waitFor();
   if(mode==='wizard')await page.reload();else await page.getByRole('button',{name:'Open Quick Report',exact:true}).click();
   if(mode==='wizard'){
    for(let step=1;step<=4;step++){
     const next=page.getByRole('button',{name:lang==='en'?'Continue':'Magpatuloy',exact:true});
     await next.waitFor();await page.waitForFunction(()=>{const b=[...document.querySelectorAll('footer button')].at(-1);return b&&!b.disabled;});
     assert.equal(await page.locator('input[type="checkbox"]').count(),0);
     if(step===4){assert.equal(await page.locator('#contact-name').inputValue(),'SAMPLE resident');assert.equal(await page.locator('#contact-email').inputValue(),'SAMPLE-resident-901@test.invalid');}
     await next.click();
    }
   }
   const submit=mode==='wizard'?page.locator('footer button').last():page.getByRole('button',{name:'Submit report',exact:true});
   await submit.waitFor();assert.equal(await submit.isEnabled(),true);
   assert.equal(await page.locator('input[type="checkbox"]').count(),0);
   await page.screenshot({path:`../scratch/resident-automation/${mode}-${lang}.png`,fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await submit.click();await page.waitForFunction(()=>window.__SAMPLE_submissions?.length===1);
   const sent=await page.evaluate(()=>window.__SAMPLE_submissions[0]);
   assert.equal(sent.metadata.source,'device');assert.equal(sent.metadata.issue_pin_confirmed,false);assert.equal(sent.metadata.confirmed_at,null);assert.equal(sent.metadata.device_fix.accuracy_m,55);
   assert.deepEqual(errors,[]);await context.close();
  }
 }
 console.log('PASS: full and Quick Report submit without validation checkboxes in English/light and Filipino/dark at desktop/320px; account prefill and GPS provenance verified.');
}finally{await browser.close();}
