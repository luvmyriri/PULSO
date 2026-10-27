import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import { GovButton } from './GovWorkspace';

export default function PrivateDocumentPreview({ document }) {
    const [state,setState]=useState({id:null,url:'',type:'',error:''});
    const [revision,setRevision]=useState(0);
    useEffect(()=>{
        const controller=new AbortController();let objectUrl='';
        setState({id:document.id,url:'',type:'',error:''});
        fetch(`${API_BASE_URL}/api/gov/documents/get/${document.id}`,{headers:{Authorization:`Bearer ${getAuthToken()}`},signal:controller.signal})
            .then(async response=>{if(!response.ok)throw new Error(response.status===401?'Your session expired. Sign in again to view this file.':response.status===404?'The original file is unavailable. The records owner needs to restore it or upload a replacement.':response.status===403?'Your account does not have access to this file.':'The file could not be loaded. Check your connection and try again.');const blob=await response.blob();if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setState({id:document.id,url:objectUrl,type:blob.type,error:''});})
            .catch(error=>{if(error.name!=='AbortError')setState({id:document.id,url:'',type:'',error:error.message});});
        return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
    },[document.id,revision]);
    if(state.id!==document.id||(!state.url&&!state.error))return <p role="status">Loading document…</p>;
    if(state.error)return <div role="alert"><p>{state.error}</p><GovButton onClick={()=>setRevision(value=>value+1)}>Try again</GovButton></div>;
    return <section className="gov-document-preview" aria-label={document.file_name}>
        {state.type==='application/pdf'?<iframe src={state.url} title={document.file_name}/>:state.type.startsWith('image/')?<img src={state.url} alt={document.file_name}/>:<p>A preview is not available for this file type.</p>}
        <a className="gov-button" href={state.url} download={document.file_name}><Download size={15}/> Download original</a>
    </section>;
}
