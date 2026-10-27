import { useEffect, useMemo, useState } from 'react';
import { OverlayView, OverlayViewF, PolygonF, PolylineF } from '@react-google-maps/api';
import { Droplets, Lightbulb, Construction, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';

export const barangayKey = value => String(value || '').replace(/^(barangay|brgy\.?)[\s-]*/i,'').trim().toLowerCase();
export const reportTone = status => ['resolved','completed'].includes(status)?'#0b756b':['rejected','cancelled'].includes(status)?'#64748b':['assigned','dispatched','in_progress'].includes(status)?'#0b4f6c':'#b45309';
export function CaloocanLayers({ map, data, area, onArea, onHover }) {
    useEffect(() => {
        if (!map || !data?.features) return;
        const features = map.data.addGeoJson(data);
        map.data.setStyle(feature => {
            const city = feature.getProperty('layer') === 'city';
            const active = !city && area !== 'all' && barangayKey(area) === String(feature.getProperty('brgy_num'));
            return { fillColor: '#ff6b00', fillOpacity: city ? 0 : active ? .16 : .015, strokeColor: '#ff6b00', strokeOpacity: city || active ? 1 : .3, strokeWeight: city ? 2.5 : active ? 2 : .7, zIndex: city ? 5 : active ? 3 : 2, clickable: !city, cursor: city ? 'default' : 'pointer' };
        });
        const over = map.data.addListener('mouseover', event => { if(event.feature.getProperty('layer') !== 'barangay') return; map.data.overrideStyle(event.feature, {fillOpacity:.22,strokeOpacity:1,strokeWeight:2.5,zIndex:4}); onHover(event.feature.getProperty('name')); });
        const out = map.data.addListener('mouseout', event => { map.data.revertStyle(event.feature); onHover(''); });
        const click = map.data.addListener('click', event => { if(event.feature.getProperty('layer') === 'barangay') onArea(String(event.feature.getProperty('brgy_num'))); });
        return () => { over.remove(); out.remove(); click.remove(); features.forEach(feature => map.data.remove(feature)); };
    },[map,data,area,onArea,onHover]);
    return null;
}

function PhotoPin({ report, selected, onSelect }) {
    const [failed,setFailed]=useState(false);
    const raw=report.image_url;
    const src=raw?(raw.startsWith('http')?raw:`${API_BASE_URL}${raw.startsWith('/')?'':'/'}${raw}`):null;
    const Icon=/drain|water|flood/i.test(report.category)?Droplets:/light|power/i.test(report.category)?Lightbulb:/road|bridge/i.test(report.category)?Construction:MapPin;
    return <button type="button" className={`civic-report-pin ${selected?'is-selected':''}`} style={{'--pin-tone':reportTone(report.status)}} onClick={e=>{e.stopPropagation();onSelect(report,e.currentTarget);}} aria-label={`Open ${report.ticket_id||`report ${report.id}`}: ${report.title}. Status: ${report.status.replaceAll('_',' ')}`} aria-pressed={selected} title={`${report.ticket_id} · ${report.status.replaceAll('_',' ')}`}><span>{src&&!failed?<img src={src} alt="" onError={()=>setFailed(true)}/>:<Icon size={20} aria-hidden="true"/>}</span></button>;
}

export function ReportPins({ reports, zoom, selectedId, onSelect, onCluster }) {
    const groups=useMemo(()=>{
        const cells=new Map();
        const scale=256*2**zoom;
        for(const report of reports){const {lat,lng}=report.position;const sin=Math.sin(lat*Math.PI/180);const x=(lng+180)/360*scale;const y=(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale;const key=report.id===selectedId?`selected:${report.id}`:`${Math.floor(x/52)}:${Math.floor(y/52)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(report);}
        return [...cells.values()];
    },[reports,zoom,selectedId]);
    return groups.map(group=>group.length===1?<OverlayViewF key={`report:${group[0].id}`} position={group[0].position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={()=>({x:-24,y:-56})} zIndex={group[0].id===selectedId?800:500}><PhotoPin report={group[0]} selected={group[0].id===selectedId} onSelect={onSelect}/></OverlayViewF>:<OverlayViewF key={`cluster:${group.map(r=>r.id).join('-')}`} position={{lat:group.reduce((s,r)=>s+r.position.lat,0)/group.length,lng:group.reduce((s,r)=>s+r.position.lng,0)/group.length}} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={()=>({x:-24,y:-24})} zIndex={600}><button className="civic-map-cluster" onClick={()=>onCluster(group)} aria-label={`Explore ${group.length} reports at this location`} title={`Explore ${group.length} reports`}>{group.length}</button></OverlayViewF>);
}

export function AssetShape({ geometry }) {
    if(geometry?.type?.startsWith('Multi'))return geometry.coordinates.map((coordinates,index)=><AssetShape key={index} geometry={{type:geometry.type.slice(5),coordinates}}/>);
    if(geometry?.type==='LineString')return <PolylineF path={geometry.coordinates.map(([lng,lat])=>({lat,lng}))} options={{strokeColor:'#172b3a',strokeWeight:5,zIndex:10}}/>;
    if(geometry?.type==='Polygon')return <PolygonF paths={geometry.coordinates.map(ring=>ring.map(([lng,lat])=>({lat,lng})))} options={{strokeColor:'#172b3a',strokeWeight:3,fillColor:'#172b3a',fillOpacity:.1,zIndex:10}}/>;
    if(geometry?.type!=='Point')return null;
    const [lng,lat]=geometry.coordinates;
    return <OverlayViewF position={{lat,lng}} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={()=>({x:-18,y:-18})} zIndex={700}><div className="civic-asset-pin" role="img" aria-label="Infrastructure asset location"><MapPin size={24}/></div></OverlayViewF>;
}

export function extendGeometry(bounds,geometry){
    if(!geometry)return;
    const visit=coords=>{if(typeof coords[0]==='number'){bounds.extend({lat:coords[1],lng:coords[0]});}else coords.forEach(visit);};
    visit(geometry.coordinates);
}

export function extendBarangay(bounds, area, data) {
    const feature = data?.features?.find(f => f.properties.layer === 'barangay' && String(f.properties.brgy_num) === barangayKey(area));
    if (feature) extendGeometry(bounds,feature.geometry);
    return Boolean(feature);
}

export function extendCity(bounds, data) {
    const cities = data?.features?.filter(f => f.properties.layer === 'city') || [];
    cities.forEach(f => extendGeometry(bounds,f.geometry));
    return cities.length > 0;
}
