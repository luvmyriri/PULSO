import {useCallback,useEffect,useRef,useState} from 'react';
import {getStoredToken,getStoredUser} from '../utils/auth';
import {createResidentDraft,DraftConflict,reportDraftPrincipal,residentDraftSlot} from '../utils/residentReportDraft';

export function useReportDraftPrincipal(user) {
    const read=useCallback(()=>reportDraftPrincipal(getStoredToken(),user || getStoredUser()),[user]);
    const [principal,setPrincipal]=useState(read);
    useEffect(()=>{
        const changed=()=>setPrincipal(read());
        changed(); window.addEventListener('storage',changed); window.addEventListener('focus',changed);
        return()=>{window.removeEventListener('storage',changed);window.removeEventListener('focus',changed);};
    },[read]);
    return principal;
}

export default function useResidentReportDraft({kind,principal,active=true,data,hasContent,restore}) {
    const [state,setState]=useState({status:'loading',ready:false});
    const driver=useRef(null), generation=useRef(0), ready=useRef(false), timer=useRef(null);
    const latest=useRef({data,hasContent}), restoreRef=useRef(restore), dirty=useRef(false), skipSave=useRef(true), stopped=useRef(false);
    const hadData=useRef(false);
    const previousPrincipal=useRef(principal);
    const expectedSlot=residentDraftSlot(kind,principal);
    useEffect(()=>{latest.current={data,hasContent};restoreRef.current=restore;},[data,hasContent,restore]);
    const fail=useCallback(error=>{setState(current=>({...current,status:error instanceof DraftConflict?'conflict':'save_error'}));},[]);
    useEffect(()=>{
        if(!active)return;
        const current=createResidentDraft({kind,principal}), request=++generation.current;
        driver.current=current;ready.current=false;skipSave.current=true;stopped.current=false;dirty.current=false;
        hadData.current=false;
        setState({status:'loading',ready:false,slot:current.slot});
        restoreRef.current(null,{reset:true,accountChanged:previousPrincipal.current!==principal});
        previousPrincipal.current=principal;
        current.load().then(result=>{
            if(request!==generation.current)return;
            restoreRef.current(result.data,{expired:result.expired});
            hadData.current=Boolean(result.data);
            ready.current=true;setState({ready:true,slot:current.slot,status:result.expired?'expired':result.data?'restored':'new'});
        }).catch(()=>{if(request===generation.current)setState({ready:false,status:'load_error',slot:current.slot});});
        return()=>{
            clearTimeout(timer.current);
            // This ref versions async work; it is not a replaceable DOM ref.
            // eslint-disable-next-line react-hooks/exhaustive-deps
            generation.current++;
            if(ready.current && dirty.current && !stopped.current)void current.save(latest.current.data).catch(()=>{});
            ready.current=false;
        };
    },[kind,principal,active]);
    const flush=useCallback(async()=>{
        clearTimeout(timer.current);
        if(!ready.current || !driver.current)throw new Error('Open the device draft before continuing.');
        if(stopped.current)return;
        const snapshot=latest.current.data, current=driver.current, request=generation.current;
        setState(value=>({...value,status:'saving'}));
        try {
            if(latest.current.hasContent || hadData.current || dirty.current){await current.save(snapshot);hadData.current=true;}
            if(request===generation.current){dirty.current=latest.current.data!==snapshot;setState({ready:true,slot:current.slot,status:dirty.current?'saving':'saved'});}
        } catch(error){if(request===generation.current)fail(error);throw error;}
    },[fail]);
    useEffect(()=>{
        if(!active || !state.ready || !ready.current || stopped.current)return;
        if(skipSave.current){skipSave.current=false;return;}
        if(!hasContent&&!hadData.current)return;
        if(hasContent)hadData.current=true;
        dirty.current=true;setState(value=>({...value,status:'saving'}));
        timer.current=setTimeout(()=>void flush().catch(()=>{}),400);
        return()=>clearTimeout(timer.current);
    },[data,hasContent,active,state.ready,flush]);
    useEffect(()=>{
        const protect=event=>{if(dirty.current&&!stopped.current){event.preventDefault();event.returnValue='';}};
        window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);
    },[]);
    async function reload() {
        clearTimeout(timer.current);ready.current=false;
        const current=driver.current,request=++generation.current;
        setState({ready:false,status:'loading',slot:current?.slot});
        try {const result=await current.load();if(request!==generation.current)return;restoreRef.current(result.data,{expired:result.expired});ready.current=true;stopped.current=false;hadData.current=Boolean(result.data);skipSave.current=true;dirty.current=false;setState({ready:true,slot:current.slot,status:result.expired?'expired':result.data?'restored':'new'});}
        catch{if(request===generation.current)setState({ready:false,status:'load_error',slot:current?.slot});}
    }
    async function clear(options) {
        clearTimeout(timer.current);stopped.current=true;dirty.current=false;
        const current=driver.current,request=generation.current;
        try{await current?.clear(options);if(request===generation.current)setState({ready:true,slot:current?.slot,status:'cleared'});}
        catch(error){if(request===generation.current)fail(error);throw error;}
    }
    const ownerMatches=state.slot===expectedSlot;
    return {...state,ready:state.ready&&ownerMatches,status:ownerMatches?state.status:'loading',
        locked:!state.ready||!ownerMatches||state.status==='conflict',flush,reload,clear};
}
