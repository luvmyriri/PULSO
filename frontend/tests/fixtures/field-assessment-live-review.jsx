// Real product routes/PostGIS/IndexedDB. Accounts, location and evidence are SAMPLE only.
/* eslint-disable react-refresh/only-export-components -- Standalone development harness owns its React root. */
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import '../../src/index.css';
import '../../src/components/government/report-docket.css';
import {ThemeProvider,useTheme} from '../../src/contexts/ThemeContext';
import ReportConcernReview from '../../src/components/government/ReportConcernReview';
import {API_BASE_URL} from '../../src/utils/apiBase';
import {getStoredToken} from '../../src/utils/auth';
import {submitReportIntake,finishReportIntake} from '../../src/utils/reportIntake';
import sampleUrl from './sample-field-evidence.png?url';

if(API_BASE_URL!=='http://127.0.0.1:33161')throw new Error('Use only the isolated field review API on port 33161.');
const nativeFetch=window.fetch.bind(window);let dropAck=false;
window.fetch=async(input,options={})=>{
    const response=await nativeFetch(input,options);
    if(dropAck&&options.method==='POST'&&response.ok&&new URL(String(input),location.origin).pathname.endsWith('/field-assessments')){
        dropAck=false;await response.clone().text();throw new TypeError('SAMPLE acknowledgement lost after the actual server commit.');
    }
    return response;
};
async function request(path,{token=getStoredToken(),body,headers={},...options}={}){
    const response=await fetch(API_BASE_URL+path,{...options,headers:{Authorization:`Bearer ${token}`,...(body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{}),...headers},
        ...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
    const data=await response.json();if(!response.ok)throw new Error(`SAMPLE request failed (${response.status}): ${JSON.stringify(data)}`);return data;
}
const session=actor=>request('/api/_fixture/session',{method:'POST',body:{actor}});
function install(result){for(const store of [sessionStorage,localStorage]){for(const key of ['token','pulso_token'])store.setItem(key,result.access_token);for(const key of ['user','pulso_user'])store.setItem(key,JSON.stringify(result.user));}window.dispatchEvent(new Event('storage'));}
function Review(){
    const {theme,changeTheme}=useTheme();
    const [reportId,setReportId]=useState(()=>new URLSearchParams(location.search).get('report')||''),[notice,setNotice]=useState('Prepare a SAMPLE case to exercise real capture, review and assessment routes.'),[state,setState]=useState(null),[busy,setBusy]=useState(false),[actor,setActor]=useState('chief'),[zoom,setZoom]=useState(false);
    async function act(fn){setBusy(true);try{await fn();}catch(error){setNotice(error.message);}finally{setBusy(false);}}
    async function prepare(){
        const resident=await session('resident');install(resident);
        const file=new File([await(await nativeFetch(sampleUrl)).blob()],'SAMPLE-field.png',{type:'image/png'});
        const report=await submitReportIntake({apiBase:API_BASE_URL,token:resident.access_token,draftKey:'SAMPLE-field-assessment',image:file,
            fields:{category:'Roads & Bridges',categories:['Roads & Bridges','Water & Drainage'],
                description:'SAMPLE road and drainage report; artificial test evidence, not a real city incident.',lat:14.7565,lng:121.045,
                location_barangay:'Barangay 171',location_string:'SAMPLE site; not a civic address',location_metadata:{source:'manual',issue_pin_confirmed:true,confirmed_at:new Date().toISOString(),photo_source:'upload'},urgency:'medium'}});
        finishReportIntake('SAMPLE-field-assessment',resident.access_token);
        const recorder=await session('inspector');
        const form=new FormData();form.append('image',file);form.append('payload',JSON.stringify({asset_name:'SAMPLE surveyed road and drain',category:'Road',barangay_id:171,
            observed_at:new Date().toISOString(),latitude:14.7565,longitude:121.045,location_metadata:{source:'manual',issue_pin_confirmed:true,photo_source:'upload'},
            visibility:'visible',condition:'defect_observed',notes:'SAMPLE first-party site finding with artificial private evidence.',source_report_id:report.id}));
        const capture=await request('/api/gov/field-inventory/assets/capture',{token:recorder.access_token,method:'POST',body:form,headers:{'Idempotency-Key':crypto.randomUUID()}});
        const chief=await session('chief');install(chief);setActor('chief');
        await request(`/api/gov/field-inventory/observations/${capture.observation.id}/review`,{method:'POST',body:{decision:'accepted',identity_confirmed:true,location_reviewed:true,reason:'SAMPLE independent comparison of artificial field evidence and site context.'}});
        setReportId(String(report.id));setNotice('SAMPLE case ready. Product APIs and storage are real; evidence, identity and location are artificial.');
    }
    async function snapshot(){const result=await request('/api/_fixture/state');setState(result);setNotice(`SAMPLE database: ${result.report_count} report(s), ${result.field_assessments.length} field assessment(s).`);}
    async function switchActor(value){const account=await session(value);install(account);setActor(value);setState(null);setNotice(`SAMPLE ${value} session; real backend permissions apply.`);}
    return <MemoryRouter><div className="field-review-fixture" style={{zoom:zoom?2:1}}>
        <header><strong>SAMPLE evidence and accounts · real local APIs and disposable PostGIS</strong>
            <div className="gov-form-actions"><button className="gov-button" disabled={busy} onClick={()=>void act(prepare)}>Prepare SAMPLE field case</button>
                <button className="gov-button" onClick={()=>changeTheme(theme==='dark'?'light':'dark')}>Switch to {theme==='dark'?'light':'dark'} theme</button>
                <button className="gov-button" onClick={()=>setZoom(value=>!value)}>{zoom?'Reset review enlargement':'Use 200% review enlargement'}</button>
                <button className="gov-button" onClick={()=>{dropAck=true;setNotice('Next successful assessment response will be dropped once, after commit.');}}>Drop next assessment acknowledgement</button>
                <button className="gov-button" onClick={()=>void act(snapshot)}>Check actual database state</button>
                <button className="gov-button" onClick={()=>void act(()=>switchActor(actor==='chief'?'clerk':'chief'))}>Use SAMPLE {actor==='chief'?'clerk':'chief'}</button>
            </div><p role="status">{notice}</p>
            {state&&<details><summary>SAMPLE database record counts</summary><pre>{JSON.stringify({reports:state.report_count,observations:state.observation_count,assessments:state.field_assessments,statuses:state.reports.map(r=>r.status)},null,2)}</pre></details>}
        </header>
        {reportId&&<main className="gov-workspace"><ReportConcernReview key={`${actor}:${reportId}`} reportId={reportId}/></main>}
    </div></MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<ThemeProvider><Review/></ThemeProvider>);
