import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

globalThis.__mediaCalls = [];
globalThis.__mediaResponses = [];
const compiled = await build({entryPoints:['src/utils/nativeReportMedia.js'],bundle:true,write:false,format:'esm',
    define:{'import.meta.env':'{"VITE_API_BASE_URL":"http://192.168.0.199:33159"}'},
    plugins:[{name:'native-transport',setup(builder){
        builder.onResolve({filter:/^@capacitor\/core$/},()=>({path:'http',namespace:'mock'}));
        builder.onResolve({filter:/\/appContext$/},()=>({path:'platform',namespace:'mock'}));
        builder.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='http'
            ? 'export const CapacitorHttp={get:async options=>{globalThis.__mediaCalls.push(options);return globalThis.__mediaResponses.shift();}};'
            : 'export const isNativeAndroid=()=>true;'}));
    }}]});
const {usesNativeReportMedia,loadReportImageSource}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const photo='http://192.168.0.199:33159/api/uploads/reports/native-test.jpg';

test('native photo downloads are limited to configured backend report media',async()=>{
    for(const source of ['https://other.invalid/api/uploads/reports/test.jpg','data:image/png;base64,AA','http://192.168.0.199:33159/api/users/1']){
        assert.equal(usesNativeReportMedia(source),false);
        assert.equal(await loadReportImageSource(source),source);
    }
    assert.equal(globalThis.__mediaCalls.length,0);
    globalThis.__mediaResponses.push({status:200,headers:{'Content-Type':'image/jpeg'},data:'AQID'});
    const [first,second]=await Promise.all([loadReportImageSource(photo),loadReportImageSource(photo)]);
    assert.equal(first,'data:image/jpeg;base64,AQID');
    assert.equal(second,first);
    assert.equal(globalThis.__mediaCalls.length,1);
    assert.equal(globalThis.__mediaCalls[0].responseType,'arraybuffer');
    assert.equal(globalThis.__mediaCalls[0].disableRedirects,true);
});

test('missing/non-image responses fail and remain retryable',async()=>{
    const missing=photo+'?missing=1';
    globalThis.__mediaResponses.push({status:404,headers:{'content-type':'application/json'},data:{}});
    await assert.rejects(loadReportImageSource(missing));
    globalThis.__mediaResponses.push({status:200,headers:{'content-type':'text/html'},data:'PGh0bWw+'});
    await assert.rejects(loadReportImageSource(missing));
    globalThis.__mediaResponses.push({status:200,headers:{'content-type':'image/png'},data:'AQID'});
    assert.equal(await loadReportImageSource(missing),'data:image/png;base64,AQID');
});
