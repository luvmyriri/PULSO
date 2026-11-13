// Local Vite-only fixture. No real camera, geolocation, database or AI calls.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/i18n';
import i18n from '../../src/i18n';
import '../../src/index.css';
import '../../src/components/government/field-survey.css';
import IDCameraModal from '../../src/components/IDCameraModal';
import FieldPhotoInput from '../../src/components/government/FieldPhotoInput';

let mode = 'fresh', sequence = 0, mediaCount = 0;
const watchers = new Map();
function counts() { window.dispatchEvent(new Event('sample-provider-change')); }
const geo = {
    watchPosition(success, failure) {
        const id = sequence++;
        watchers.set(id, true); counts();
        setTimeout(() => {
            if (!watchers.has(id)) return;
            if (mode === 'denied') failure({ code:1 });
            else success({ timestamp:Date.now()-(mode==='stale'?300000:1000),
                coords:{latitude:14.72,longitude:121.04,accuracy:12} });
        }, 60);
        return id;
    },
    clearWatch(id) { watchers.delete(id); counts(); },
};
Object.defineProperty(navigator, 'geolocation', { value:geo, configurable:true });
Object.defineProperty(navigator, 'mediaDevices', { value:{
    async getUserMedia() {
        const canvas = document.createElement('canvas'); canvas.width=800; canvas.height=600;
        const context = canvas.getContext('2d');
        function draw() {
            context.fillStyle='#91b9ab'; context.fillRect(0,0,800,600);
            context.fillStyle='#172d45'; context.font='bold 38px sans-serif';
            context.fillText('SAMPLE FRAME',180,240); context.font='24px sans-serif';
            context.fillText('Synthetic camera · no field evidence',140,300);
        }
        draw();
        const stream = canvas.captureStream(6), timer=setInterval(draw,150);
        mediaCount++; counts();
        const track = stream.getVideoTracks()[0], originalStop=track.stop.bind(track);
        let stopped=false;
        track.stop=()=>{ if(stopped)return; stopped=true; clearInterval(timer); originalStop(); mediaCount--; counts(); };
        return stream;
    },
    async enumerateDevices() { return [{kind:'videoinput',deviceId:'SAMPLE-camera'}]; },
}, configurable:true });
const actualFetch = window.fetch.bind(window);
window.fetch = (input, options) => String(input).includes('/api/reports/analyze')
    ? Promise.resolve(new Response('{}',{status:503,headers:{'Content-Type':'application/json'}}))
    : actualFetch(input, options);

function Review() {
    const [open,setOpen]=useState(false), [image,setImage]=useState(null), [photo,setPhoto]=useState(null);
    const [receipt,setReceipt]=useState(null), [preview,setPreview]=useState('');
    const [provider,setProvider]=useState({watches:0,streams:0});
    const [busy,setBusy]=useState(false);
    const stale = {latitude:14.72,longitude:121.04,accuracy_m:30,measured_at:new Date(Date.now()-300000).toISOString()};
    useEffect(()=>{ const changed=()=>setProvider({watches:watchers.size,streams:mediaCount});
        window.addEventListener('sample-provider-change',changed); return()=>window.removeEventListener('sample-provider-change',changed); },[]);
    useEffect(()=>{ if(!image){setPreview('');return;} const url=URL.createObjectURL(image);setPreview(url);return()=>URL.revokeObjectURL(url); },[image]);
    return <div className="camera-review" style={{maxWidth:900,margin:'auto',padding:20,color:'#172d45',background:'white'}}>
        <h1 style={{fontSize:24,fontWeight:700}}>SAMPLE camera/location verification</h1>
        <p>No real camera, location, government records or AI service. Coordinates and imagery are synthetic.</p>
        <label>Sample provider <select onChange={event=>{mode=event.target.value;}} defaultValue="fresh">
            <option value="fresh">Fresh synthetic fix</option><option value="denied">Permission denied</option><option value="stale">Stale fix only</option>
        </select></label>{' '}
        <button onClick={()=>void i18n.changeLanguage(i18n.language==='tl'?'en':'tl')}>English / Filipino</button>
        <p data-testid="provider-counts">Active sample watches: {provider.watches}; sample streams: {provider.streams}</p>
        <button onClick={()=>setOpen(true)} style={{minHeight:44,padding:10,border:'1px solid'}}>Open resident camera</button>
        <IDCameraModal isOpen={open} onClose={()=>setOpen(false)} side="ISSUE"
            onCapture={file=>{setImage(file);setReceipt(file.pulsoCapture);}}
            metadata={{location:{lat:14.721,lng:121.041,source:'selected-map',deviceFix:stale}}}/>
        <hr style={{margin:'20px 0'}}/>
        <h2 style={{fontWeight:700}}>Field camera</h2>
        <FieldPhotoInput image={null} metadata={photo} deviceFix={stale} disabled={false} onBusyChange={setBusy}
            onChange={(file,metadata)=>{setPhoto(metadata);setImage(file);setReceipt(metadata);}}/>
        <p>Field busy: {String(busy)}</p>
        {preview&&<figure><img style={{maxWidth:500,width:'100%'}} src={preview} alt="Actual encoded synthetic frame, without a location watermark"/>
            <figcaption>Encoded sample frame</figcaption><a href={preview} download="SAMPLE-camera-frame.jpg">Download sample frame</a></figure>}
        <pre data-testid="capture-receipt" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(receipt,null,2)}</pre>
    </div>;
}
createRoot(document.getElementById('root')).render(<Review/>);
