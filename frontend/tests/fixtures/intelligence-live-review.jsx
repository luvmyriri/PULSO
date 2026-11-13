// Local integration harness: real HTTP, database, components and IndexedDB.
// Identity issuance and provider output are explicitly synthetic. No API responses mocked.
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import i18n from '../../src/i18n';
import '../../src/index.css';
import '../../src/components/government/report-docket.css';
import {ThemeProvider} from '../../src/contexts/ThemeContext';
import ReportWizardPage from '../../src/pages/ReportWizardPage';
import ReportSuccessPage from '../../src/pages/ReportSuccessPage';
import ReportConcernReview from '../../src/components/government/ReportConcernReview';
import {createResidentDraft,packResidentPhoto,reportDraftPrincipal} from '../../src/utils/residentReportDraft';
import {submitReportIntake,finishReportIntake} from '../../src/utils/reportIntake';
import {getStoredToken} from '../../src/utils/auth';
import {API_BASE_URL} from '../../src/utils/apiBase';
import sampleUrl from './sample-field-evidence.png?url';

if(API_BASE_URL!=='http://127.0.0.1:33161')throw new Error('Requires the isolated real HTTP review API on port 33161.');
const nativeFetch=window.fetch.bind(window);
let dropIntake=false,dropAnalysis=false;
window.fetch=async(input,options={})=>{
    const response=await nativeFetch(input,options);
    const path=new URL(String(input),location.origin).pathname;
    if(options.method==='POST'&&response.ok&&((dropIntake&&path==='/api/reports')||(dropAnalysis&&path.endsWith('/analysis')))){
        dropIntake=false;dropAnalysis=false;
        // Consume the successful real response, then simulate acknowledgement loss.
        await response.clone().text();throw new TypeError('SAMPLE injected acknowledgement loss after the server committed.');
    }
    return response;
};
async function request(path,{token=getStoredToken(),body,...options}={}){
    const response=await fetch(API_BASE_URL+path,{...options,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();if(!response.ok)throw new Error(`${response.status}: ${JSON.stringify(data)}`);return data;
}
async function session(actor){return request('/api/_fixture/session',{method:'POST',body:{actor}});}
function installAccount(result){for(const storage of [sessionStorage,localStorage]){storage.setItem('pulso_token',result.access_token);storage.setItem('token',result.access_token);storage.setItem('pulso_user',JSON.stringify(result.user));storage.setItem('user',JSON.stringify(result.user));}window.dispatchEvent(new Event('storage'));}
const sampleFile=async()=>new File([await(await nativeFetch(sampleUrl)).blob()],'SAMPLE-field.png',{type:'image/png'});
const locationData={lat:14.7565,lng:121.045,barangay:'Barangay 171',address:'SAMPLE test location',source:'selected-map',isInCaloocan:true};
function Review(){
    const [account,setAccount]=useState(null),[info,setInfo]=useState('Choose a SAMPLE session. Login and CAPTCHA are outside this test.'),[view,setView]=useState('resident'),[mount,setMount]=useState(0),[snapshot,setSnapshot]=useState(null),[reportId,setReportId]=useState('');
    const timer=useRef(null),validatorToken=useRef(null);
    useEffect(()=>()=>clearInterval(timer.current),[]);
    async function act(fn){try{await fn();}catch(error){setInfo(error.message);}}
    async function switchActor(actor){const result=await session(actor);installAccount(result);setAccount(result.user);setMount(n=>n+1);setView(actor==='resident'?'resident':'staff');setInfo(`SAMPLE ${actor} session; real server authorization applies.`);}
    async function seed(){if(account?.role!=='resident')throw new Error('Choose SAMPLE resident first.');const driver=createResidentDraft({kind:'wizard',principal:reportDraftPrincipal(getStoredToken(),account)});await driver.load();await driver.save({currentStep:1,maxStepReached:5,photo:packResidentPhoto(await sampleFile(),{source:'upload'}),formData:{category:'Roads & Bridges, Drainage & Flooding',location:locationData,details:{description:'SAMPLE real HTTP integration: damaged road and drainage at the same selected issue pin.',urgency:'medium'},contact:{type:'notify',name:account.full_name,email:account.email,phone:''}}});setMount(n=>n+1);setInfo('SAMPLE uploaded photo and two-category draft restored. Pin confirmation and consent still required.');}
    async function presence(){const result=await session('validator');validatorToken.current=result.access_token;const opts={token:result.access_token};const current=await request('/api/gov/report-review/availability/me',opts);await request('/api/gov/report-review/availability/me',{...opts,method:'PATCH',body:{state:'available',capacity:5,expected_version:current.version}});clearInterval(timer.current);timer.current=setInterval(()=>request('/api/gov/report-review/availability/me/heartbeat',{...opts,method:'POST'}).catch(e=>setInfo(e.message)),30000);setInfo('SAMPLE validator explicitly available; real heartbeat and automatic routing enabled.');}
    async function stopPresence(){clearInterval(timer.current);const token=validatorToken.current||(await session('validator')).access_token;await request('/api/gov/report-review/availability/me/offline',{token,method:'POST'});setInfo('SAMPLE validator offline.');}
    async function second(){const token=getStoredToken();const report=await submitReportIntake({apiBase:API_BASE_URL,token,draftKey:'SAMPLE-live-comparison',image:await sampleFile(),fields:{category:'Roads & Bridges',categories:['Roads & Bridges'],description:'SAMPLE independent comparison ticket, same selected issue pin.',lat:locationData.lat,lng:locationData.lng,location_string:locationData.address,location_barangay:'Barangay 171',location_metadata:{source:'manual',issue_pin_confirmed:true,confirmed_at:new Date().toISOString(),photo_source:'upload'},urgency:'medium',submission_source:'wizard'}});finishReportIntake('SAMPLE-live-comparison',token);setInfo(`Second real HTTP intake receipt: ${report.ticket_id}`);}
    async function refresh(){const value=await request('/api/_fixture/state');setSnapshot(value);setReportId(old=>old||String(value.reports[0]?.id||''));setMount(n=>n+1);setInfo('Authoritative SAMPLE database snapshot loaded.');}
    async function checkPairAccess(){if(!snapshot||snapshot.reports.length<2)throw new Error('Load the chief snapshot first.');const first=snapshot.reports[0],last=snapshot.reports.at(-1);const a=await request(`/api/report-intelligence/reports/${first.id}`),b=await request(`/api/report-intelligence/reports/${last.id}`);await request(`/api/report-intelligence/reports/${first.id}/observations/${a.observations[0].id}/pairs/${b.observations[0].id}`);setInfo('Pair-review endpoint authorized for this actor.');}
    return <ThemeProvider><MemoryRouter><div style={{padding:16,background:'#fff',color:'#172d45',borderBottom:'2px solid #172d45'}}>
        <strong>SAMPLE real HTTP integration — disposable database; artificial evidence; injected provider only.</strong>
        <div>{['resident','chief','validator','clerk'].map(actor=><button key={actor} onClick={()=>void act(()=>switchActor(actor))}>Use SAMPLE {actor}</button>)}</div>
        <div><button onClick={()=>void act(seed)}>Restore two-category SAMPLE draft</button> <button onClick={()=>void act(presence)}>Start SAMPLE validator presence</button> <button onClick={()=>void act(stopPresence)}>Stop SAMPLE validator presence</button></div>
        <div><button onClick={()=>{dropIntake=true;setInfo('Next real successful intake acknowledgement will be dropped once.');}}>Drop next intake acknowledgement</button> <button onClick={()=>void act(second)}>Submit second comparison ticket</button></div>
        <div><button onClick={()=>void act(refresh)}>Refresh real database snapshot</button> <button onClick={()=>{dropAnalysis=true;setInfo('Next real successful image-job acknowledgement will be dropped once.');}}>Drop next image-job acknowledgement</button> <button onClick={()=>void act(async()=>{const value=await request('/api/_fixture/process-one-image-job',{method:'POST'});setInfo(JSON.stringify(value));})}>Process one job with SAMPLE provider</button></div>
        <button onClick={()=>void act(checkPairAccess)}>Check real pair endpoint authorization</button>
        <button onClick={()=>void i18n.changeLanguage(i18n.language==='tl'?'en':'tl')}>English / Filipino</button>
        <p role="status">{info}</p>
        {snapshot&&<><pre aria-label="Real database snapshot" style={{whiteSpace:'pre-wrap',maxHeight:340,overflow:'auto'}}>{JSON.stringify(snapshot,null,2)}</pre><label>Report to inspect <select value={reportId} onChange={e=>{setReportId(e.target.value);setMount(n=>n+1);}}>{snapshot.reports.map(r=><option key={r.id} value={r.id}>{r.ticket_id}</option>)}</select></label></>}
    </div>{account&&view==='resident'&&<Routes key={mount}><Route path="*" element={<ReportWizardPage/>}/><Route path="/report/success" element={<ReportSuccessPage/>}/></Routes>}
    {account&&view==='staff'&&reportId&&<main className="gov-workspace" style={{padding:24}}><ReportConcernReview key={`${account.id}:${reportId}:${mount}`} reportId={reportId}/></main>}
    </MemoryRouter></ThemeProvider>;
}
createRoot(document.getElementById('root')).render(<Review/>);
