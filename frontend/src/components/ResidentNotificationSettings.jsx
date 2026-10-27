import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import './resident-notification-settings.css';

const COPY={en:{title:'Notifications',intro:'Choose which updates you receive and where to receive them.',enabled:'Receive updates',report_updates:'Changes to my reports',related_updates:'City updates connected to my reports',in_app:'In-app notifications',email:'Email notifications',channels:'Delivery channels',categories:'Updates',save:'Save preferences',saving:'Saving…',saved:'Notification preferences saved.',loading:'Loading your preferences…',retry:'Reload preferences',emailReady:'Email service configured. Messages are sent only when you choose email.',emailMissing:'Email service is not connected. Your choice can be saved; queued emails wait for configuration.',privacy:'Email alerts contain a link to PULSO, without your report description, identity documents or location.',phone:'Phone push notifications are not connected. In-app notifications remain available on your phone.',error:'Preferences could not be loaded. Try again.',expanded:'These choices apply to future notices and queued emails. A send already underway may finish. Existing in-app notices remain in your inbox.'},tl:{title:'Mga notification',intro:'Piliin ang mga update at kung saan mo gustong matanggap ang mga ito.',enabled:'Tumanggap ng mga update',report_updates:'Mga pagbabago sa aking mga ulat',related_updates:'Mga update ng lungsod na kaugnay ng aking mga ulat',in_app:'Mga notification sa app',email:'Mga notification sa email',channels:'Paraan ng pagtanggap',categories:'Mga update',save:'I-save ang mga kagustuhan',saving:'Sine-save…',saved:'Na-save ang mga kagustuhan sa notification.',loading:'Kinukuha ang iyong mga kagustuhan…',retry:'Kunin muli ang mga kagustuhan',emailReady:'Nakaayos ang serbisyo ng email. Magpapadala lamang kung pinili mo ang email.',emailMissing:'Hindi pa nakakonekta ang serbisyo ng email. Maaaring i-save ang iyong pinili; maghihintay ang mga email sa pagkakaayos ng serbisyo.',privacy:'Link sa PULSO lamang ang laman ng email; walang paglalarawan ng ulat, dokumento ng pagkakakilanlan o lokasyon.',phone:'Hindi pa nakakonekta ang push notification sa telepono. Maaari pa ring makita ang mga notification sa app gamit ang telepono.',error:'Hindi makuha ang mga kagustuhan. Subukan muli.',expanded:'Para ito sa mga susunod na notification at nakapilang email. Maaaring matapos ang pagpapadalang nasimulan na. Mananatili sa inbox ang mga dati nang notification.'}};

export default function ResidentNotificationSettings({onSaved}){
    const {i18n}=useTranslation();
    const text=/^(tl|fil)/i.test(i18n.language)?COPY.tl:COPY.en;
    const record=useGovernmentData('/api/residents/notification-preferences');
    const [draft,setDraft]=useState(null);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [message,setMessage]=useState('');
    useEffect(()=>{if(record.data)setDraft(record.data);},[record.data]);
    function change(key,value){setDraft(current=>({...current,[key]:value}));setMessage('');}
    async function save(event){
        event.preventDefault();if(busy)return;
        setBusy(true);setError('');setMessage('');
        const body={expected_version:draft.version,...Object.fromEntries(['enabled','report_updates','related_updates','in_app','email'].map(key=>[key,draft[key]]))};
        try{const saved=await governmentRequest('/api/residents/notification-preferences',{method:'PUT',body});setDraft(saved);setMessage(text.saved);onSaved?.(saved);}
        catch(cause){setError(cause.status===409?(/^(tl|fil)/i.test(i18n.language)?'Nagbago ang mga kagustuhan. Kunin at suriin muli bago mag-save.':'Your preferences changed. Reload and review them before saving.'):text.error);}
        finally{setBusy(false);}
    }
    if(record.loading&&!draft)return <p role="status">{text.loading}</p>;
    if(record.error&&!draft)return <div role="alert"><p>{text.error}</p><button type="button" onClick={record.reload}>{text.retry}</button></div>;
    if(!draft)return null;
    return <form className="resident-notification-settings" onSubmit={save}>
        <p>{text.intro}</p>
        <label><span>{text.enabled}</span><input type="checkbox" checked={draft.enabled} disabled={busy} onChange={event=>change('enabled',event.target.checked)}/></label>
        <fieldset disabled={busy||!draft.enabled}><legend>{text.categories}</legend>{['report_updates','related_updates'].map(key=><label key={key}><span>{text[key]}</span><input type="checkbox" checked={draft[key]} onChange={event=>change(key,event.target.checked)}/></label>)}</fieldset>
        <fieldset disabled={busy||!draft.enabled}><legend>{text.channels}</legend>{['in_app','email'].map(key=><label key={key}><span>{text[key]}</span><input type="checkbox" checked={draft[key]} onChange={event=>change(key,event.target.checked)}/></label>)}</fieldset>
        <p>{draft.email_service==='configured'?text.emailReady:text.emailMissing}</p><p>{text.privacy}</p><p>{text.phone}</p><p>{text.expanded}</p>
        {error&&<div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={()=>{setError('');record.reload();}}>{text.retry}</button></div>}
        {message&&<p role="status">{message}</p>}
        <button type="submit" disabled={busy}>{busy?text.saving:text.save}</button>
    </form>;
}
