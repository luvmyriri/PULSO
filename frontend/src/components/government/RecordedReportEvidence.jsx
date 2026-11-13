import { useState } from 'react';
import { API_BASE_URL } from '../../utils/apiBase';

export default function RecordedReportEvidence({record,item,label}) {
    const [failed,setFailed]=useState(false);
    const image=record?.photo_url;
    const url=image?(image.startsWith('http')?image:`${API_BASE_URL}${image}`):null;
    return <figure className="concern-evidence"><figcaption><strong>{label}: {record?.ticket_id||'Report reference unavailable'}</strong></figcaption>
        {url&&!failed?<a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Recorded report photo for ${record.ticket_id}`} onError={()=>setFailed(true)}/><span>Open original photo in a new tab</span></a>:<p className="gov-note">{failed?'The recorded photo could not be loaded. Open the report to check its evidence.':'No photo is recorded.'}</p>}
        <p>{item?.description}</p><p className="gov-note">{record?.location_string||'Address not recorded'}</p>
        <p className="gov-note">Photo source: {record?.photo_source||'unknown'}. Capture time: {record?.photo_captured_at?new Date(record.photo_captured_at).toLocaleString():'not recorded'}.</p>
    </figure>;
}
