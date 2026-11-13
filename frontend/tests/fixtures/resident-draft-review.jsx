// Vite-only verification. All account, location, evidence and response data are SAMPLE.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import '../../src/i18n';
import i18n from '../../src/i18n';
import '../../src/index.css';
import {ThemeProvider,useTheme} from '../../src/contexts/ThemeContext';
import QuickReportWizardModal from '../../src/components/QuickReportWizardModal';
import ReportWizardPage from '../../src/pages/ReportWizardPage';
import ReportSuccessPage from '../../src/pages/ReportSuccessPage';
import {createResidentDraft,packResidentPhoto,reportDraftPrincipal} from '../../src/utils/residentReportDraft';
import {getStoredToken} from '../../src/utils/auth';
import {submitReportIntake,recoverReportIntake,finishReportIntake} from '../../src/utils/reportIntake';

const mode=new URLSearchParams(location.search).get('view') || 'quick';
const user={id:901,role:'resident',full_name:'SAMPLE resident',email:'SAMPLE-resident-901@test.invalid'};
function setAccount(id){const account={...user,id,email:`SAMPLE-resident-${id}@test.invalid`};
    const token='SAMPLE.'+btoa(JSON.stringify({sub:account.email}))+'.SAMPLE';
    for(const storage of [sessionStorage,localStorage]){storage.setItem('pulso_token',token);storage.setItem('token',token);storage.setItem('pulso_user',JSON.stringify(account));storage.setItem('user',JSON.stringify(account));}
    window.dispatchEvent(new Event('storage'));return account;
}
const stored=JSON.parse(localStorage.getItem('SAMPLE_fixture_account') || '901');
setAccount(stored);
const actualIndexedDB=window.indexedDB;
let blocked=false;
Object.defineProperty(window,'indexedDB',{configurable:true,get:()=>blocked?undefined:actualIndexedDB});
Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_ok,fail){setTimeout(()=>fail({code:1}),0);},watchPosition(_ok,fail){setTimeout(()=>fail({code:1}),0);return 0;},clearWatch(){}}});
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{async getUserMedia(){throw new DOMException('SAMPLE fixture camera unavailable','NotAllowedError');},async enumerateDevices(){return [];}}});
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,options={})=>{
    const url=String(input);
    if(url.startsWith('blob:')||url.startsWith('data:'))return nativeFetch(input,options);
    const receiptKey='SAMPLE_fixture_receipt:'+options.headers?.['Idempotency-Key'];
    if(url.includes('/intake-receipt')){const receipt=localStorage.getItem(receiptKey);return new Response(receipt || '{}',{status:receipt?200:404,headers:{'Content-Type':'application/json'}});}
    if(url.endsWith('/api/reports')&&options.method==='POST'){
        const body=options.body;
        const report={id:901,ticket_id:'SAMPLE-RECEIPT-901',tracking_token:'SAMPLE-private-code',
            categories:JSON.parse(body.get('categories')||'[]'),category:body.get('category'),description:body.get('description'),
            location_string:body.get('location_string'),created_at:new Date().toISOString(),reporter_type:'registered'};
        localStorage.setItem(receiptKey,JSON.stringify(report));
        return new Response(JSON.stringify(report),{status:201,headers:{'Content-Type':'application/json'}});
    }
    return new Response('{}',{status:503,headers:{'Content-Type':'application/json'}});
};

const point={lat:14.7565,lng:121.045,source:'selected-map',isInCaloocan:true,confirmed:false};
function QuickCase(props){const {theme}=useTheme();return <QuickReportWizardModal {...props} theme={theme}/>;}
async function samplePhoto(){const result=await import('./sample-field-evidence.png?url');
    // Image bytes are served from the local test fixture via a native image/canvas.
    const image=new Image();image.src=result.default;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));return new File([blob],'SAMPLE-field.png',{type:'image/png'});
}
function Review(){
    const [open,setOpen]=useState(false),[account,setUser]=useState({...user,id:stored}),[info,setInfo]=useState('SAMPLE fixtures only'),[context,setContext]=useState({location:point,address:'SAMPLE test site',structuredAddress:{barangay:'Barangay 171'},plusCode:''});
    const kind=mode==='wizard'?'wizard':'quick';
    async function seed(){const driver=createResidentDraft({kind,principal:reportDraftPrincipal(getStoredToken(),account)});await driver.load();
        const photo=packResidentPhoto(await samplePhoto(),{source:'camera',capturedAt:new Date(Date.now()-2000).toISOString(),photoDeviceFix:{latitude:14.7564,longitude:121.0449,accuracy_m:12,measured_at:new Date(Date.now()-3000).toISOString()}});
        await driver.save(kind==='quick'?{step:1,photo,notes:'SAMPLE concern retained across reload',selectedCategories:['Roads & Bridges'],suggestedCategories:[],locationDetails:{},locationContext:context}:
            {currentStep:1,maxStepReached:5,photo,formData:{category:'Roads & Bridges',location:{...point,barangay:'Barangay 171',address:'SAMPLE test site'},details:{description:'SAMPLE concern retained across reload',urgency:'medium'},contact:{name:'SAMPLE resident',email:account.email,phone:''}}});setInfo('SAMPLE original photo and metadata seeded');}
    async function concurrency(){const args={kind:'SAMPLE-cas',principal:'SAMPLE-browser-concurrency'};const a=createResidentDraft(args),b=createResidentDraft(args);await Promise.all([a.load(),b.load()]);const results=await Promise.allSettled([a.save({notes:'SAMPLE one'}),b.save({notes:'SAMPLE two'})]);setInfo(JSON.stringify(results.map(r=>r.status==='fulfilled'?'saved':r.reason.name)));}
    async function uncertain(){try{await submitReportIntake({draftKey:kind,token:getStoredToken(),image:await samplePhoto(),fields:{category:'Roads & Bridges',categories:['Roads & Bridges'],description:'SAMPLE immutable original submission',location_string:'SAMPLE test site'},
        fetchImpl:async(url,options)=>{const response=await window.fetch(url,options);if(options.method==='POST')throw new Error('SAMPLE lost acknowledgement');return response;}});}catch{setInfo('SAMPLE uncertain original operation seeded');}}
    return <ThemeProvider><MemoryRouter initialEntries={[mode==='receipt'?'/report/success':'/report']}><div style={{padding:12,background:'white',color:'#172d45'}}>
        <strong>SAMPLE resident draft verification — no real account, location, camera, AI or report service.</strong>
        <div><a href="?view=quick">Quick Report</a> · <a href="?view=wizard">Full wizard</a> · <a href="?view=receipt">Missing receipt</a></div>
        <button onClick={()=>void seed().catch(e=>setInfo(e.message))}>Seed SAMPLE draft</button>{' '}
        <button onClick={()=>setOpen(true)}>Open Quick Report</button>{' '}
        <button onClick={()=>{const id=account.id===901?902:901;localStorage.setItem('SAMPLE_fixture_account',String(id));setUser(setAccount(id));setInfo('SAMPLE account '+id);}}>Switch SAMPLE account</button>{' '}
        <button onClick={()=>{blocked=!blocked;setInfo('SAMPLE storage blocked: '+blocked);}}>Toggle SAMPLE storage failure</button>{' '}
        <button onClick={()=>void concurrency().catch(e=>setInfo(e.message))}>Run concurrent draft check</button>{' '}
        <button onClick={()=>void uncertain().catch(e=>setInfo(e.message))}>Seed uncertain submission</button>{' '}
        <button onClick={()=>void i18n.changeLanguage(i18n.language==='tl'?'en':'tl')}>English / Filipino</button>
        <p role="status">{info}</p>
        {kind==='quick'&&mode!=='receipt'&&<QuickCase isOpen={open} onClose={()=>setOpen(false)} currentUser={account}
            reportLocation={context.location} locationAddress={context.address} structuredAddress={context.structuredAddress}
            onRestoreDraftLocation={setContext} onSubmitReport={async({recoverOnly,...values})=>{
                const token=getStoredToken();const report=recoverOnly?await recoverReportIntake({token,draftKey:'quick'}):await submitReportIntake({token,draftKey:'quick',image:values.photoFile,fields:{category:values.categories[0],categories:values.categories,description:values.notes,location_string:values.address}});
                finishReportIntake('quick',token);return {trackingNumbers:[report.ticket_id],report};
            }}/>}
    </div><Routes><Route path="/report" element={kind==='wizard'?<ReportWizardPage/>:<div/>}/><Route path="/report/success" element={<ReportSuccessPage/>}/></Routes></MemoryRouter></ThemeProvider>;
}
createRoot(document.getElementById('root')).render(<Review/>);
