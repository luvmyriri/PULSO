import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { GoogleMap, CircleF } from '@react-google-maps/api';
import { Layers, LocateFixed, RefreshCw } from 'lucide-react';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import ReportDensityLayer from '../components/maps/ReportDensityLayer';
import { CaloocanLayers, ReportPins, AssetShape, extendGeometry, extendBarangay, extendCity, barangayKey } from '../components/maps/CivicMapLayers';
import ReportDocket from '../components/government/ReportDocket';
import ReportViewToggle from '../components/government/ReportViewToggle';
import ReportPriority from '../components/government/ReportPriority';
import MapFilters from '../components/maps/MapFilters';
import { GovWorkspace, GovButton, GovSearch, GovSelect, GovState, GovStatus, GovTable, formatDate } from '../components/government/GovWorkspace';
import { useGovernmentData } from '../utils/governmentApi';
import { getStatusDescriptor } from '../utils/reportWorkflow';
import './government-report-map.css';

const CENTER = { lat: 14.751, lng: 121.02 };
const HEAT_OPTIONS = { radius: 38, opacity: .7, maxIntensity: 3 };

export default function GovReportsMapPage() {
    const [params, setParams] = useSearchParams();
    const location = useLocation();
    const source = new URLSearchParams();
    const exactIds = params.get('ids') ?? (location.state?.report_ids ? location.state.report_ids.join(',') : null);
    if (exactIds !== null) source.set('ids', exactIds);
    if (params.has('asset_id')) source.set('asset_id', params.get('asset_id'));
    if (params.has('overview')) source.set('overview', params.get('overview'));
    if (params.has('area')) source.set('area', params.get('area'));
    if (params.has('priority')) source.set('priority', params.get('priority'));
    if (params.has('asset')) { source.set('context_asset_id', params.get('asset')); source.set('radius_m', params.get('radius') || '500'); }
    const records = useGovernmentData(`/api/gov/report-map?${source}`);
    const boundaries = useGovernmentData('/api/geo/map-reference');
    const { isLoaded, loadError } = useGoogleMaps();
    const [map, setMap] = useState(null);
    const [mapAuthError, setMapAuthError] = useState(false);
    const [zoom,setZoom] = useState(12);
    const [hoveredArea,setHoveredArea] = useState('');
    const [cluster,setCluster] = useState([]);
    const search = params.get('search') || '';
    const status = params.get('status') || 'all';
    const category = params.get('category') || 'all';
    const area = params.get('barangay') || 'all';
    const heatmap = params.get('layer') === 'density';
    const all = useMemo(() => records.data?.items || [], [records.data]);
    const rows = useMemo(() => all.filter(r => (status === 'all' || (status === 'open' ? !['resolved','completed','rejected','cancelled'].includes(r.status) : status === 'resolved' ? ['resolved','completed'].includes(r.status) : r.status === status || getStatusDescriptor(r.status).label === status)) && (category === 'all' || r.category === category) && (area === 'all' || barangayKey(r.barangay) === barangayKey(area)) && `${r.ticket_id} ${r.title} ${r.address || ''} ${r.barangay || ''}`.toLowerCase().includes(search.toLowerCase())), [all, status, category, area, search]);
    const located = useMemo(() => rows.filter(r => r.position), [rows]);
    const selected = rows.find(r => String(r.id) === params.get('reportId'));
    const density = useMemo(() => located.map(r => ({ location: r.position, weight: 1 })), [located]);
    const listParams = new URLSearchParams(params);
    listParams.delete('layer');
    listParams.delete('asset'); listParams.delete('radius');
    listParams.delete('from');
    if(params.has('asset')){listParams.set('ids',rows.map(r=>r.id).join(','));listParams.set('source','Asset investigation');}
    if (status !== 'all' || category !== 'all' || area !== 'all' || search) {
        listParams.set('ids', rows.map(r => r.id).join(','));
        listParams.set('source', 'Reports map selection');
    }
    const requestedFrom = params.get('from') || '';
    const safeFrom = /^\/gov\/(?:reports(?:\/\d+)?|my-work|my-dashboard|dashboard|today)(?:\?|$)/.test(requestedFrom) && !requestedFrom.includes('\\') && !requestedFrom.includes('//');
    const backTo = safeFrom ? requestedFrom : `/gov/reports?${listParams}`;
    const backLabel = safeFrom && /^\/gov\/(?:my-work|my-dashboard|dashboard|today)(?:\?|$)/.test(requestedFrom) ? 'My work' : 'Reports';
    const change = useCallback((name, value) => { setParams(p => { const n = new URLSearchParams(p); value && value !== 'all' ? n.set(name, value) : n.delete(name); return n; }, { replace: name === 'search' }); },[setParams]);
    const selectArea=useCallback(value=>change('barangay',value),[change]);
    const fit = useCallback(() => {
        if (!map || !window.google?.maps) return;
        const bounds = new window.google.maps.LatLngBounds();
        const hasArea=area!=='all'&&extendBarangay(bounds,area,boundaries.data);
        const geometry=records.data?.asset?.geometry;
        if(geometry)extendGeometry(bounds,geometry);
        located.forEach(r => bounds.extend(r.position));
        if(bounds.isEmpty())extendCity(bounds,boundaries.data);
        if(bounds.isEmpty())return;
        map.fitBounds(bounds, 48);
        if (located.length === 1 && !hasArea && !geometry) map.setZoom(16);
    }, [map, located, area, records.data?.asset, boundaries.data]);
    function exploreCluster(group){setCluster(group);if(!map)return;const bounds=new window.google.maps.LatLngBounds();group.forEach(r=>bounds.extend(r.position));map.fitBounds(bounds,56);map.setZoom(Math.min(map.getZoom()||16,19));}
    useEffect(() => { fit(); }, [fit]);
    useEffect(() => {
        if (!map || !selected?.position) return;
        map.panTo(selected.position); map.setZoom(17);
    }, [map, selected]);
    useEffect(() => {
        const previous = window.gm_authFailure;
        window.gm_authFailure = () => { setMapAuthError(true); previous?.(); };
        return () => { window.gm_authFailure = previous; };
    }, []);
    return <GovWorkspace title="Reports map" parent={{ label: backLabel, to: backTo }} actions={<>
        <GovSearch value={search} onChange={v => change('search', v)} placeholder="Search report, issue or address" />
        <div className="gov-page-actions__group"><ReportViewToggle mode="map" tableTo={`/gov/reports?${listParams}`} mapTo={`/gov/map?${params}`} /><GovButton disabled={records.loading} onClick={records.reload}><RefreshCw size={15} /> Refresh reports</GovButton></div>
    </>}>
        <div className="report-map-controls"><div className="report-map-status-tabs" aria-label="Report status view">{[['all','All reports'],['open','Open'],['resolved','Resolved']].map(([value,label]) => <GovButton key={value} aria-pressed={status === value} onClick={() => change('status', value)}>{label}</GovButton>)}</div><div className="gov-toolbar">
            <MapFilters area={area} category={category} status={status} areas={[...new Set([...all.map(r => r.barangay).filter(Boolean), ...(area !== 'all' ? [area] : [])])].sort((a,b) => a.localeCompare(b, undefined, {numeric:true}))} categories={[...new Set(all.map(r => r.category))].sort()} statuses={[...new Set(all.map(r => r.status))].sort()} onChange={change} onClear={() => setParams(p => { const n = new URLSearchParams(p); ['status','category','barangay','search'].forEach(k => n.delete(k)); return n; })} />
            {params.has('asset') && <GovSelect label="Radius" value={params.get('radius') || '500'} onChange={v => change('radius',v)} options={[{value:'250',label:'250 m'},{value:'500',label:'500 m'},{value:'1000',label:'1 km'}]} />}
            <GovButton aria-pressed={heatmap} onClick={() => change('layer', heatmap ? '' : 'density')}><Layers size={15} /> Heatmap</GovButton><GovButton onClick={fit} disabled={!map}><LocateFixed size={15} /> Fit map</GovButton>
        </div></div>
        {(area !== 'all' || category !== 'all') && <div className="report-map-active-filters">{area !== 'all' && <GovButton onClick={() => change('barangay','')} aria-label="Remove barangay filter">{area.startsWith('Barangay') ? area : `Barangay ${area}`} ×</GovButton>}{category !== 'all' && <GovButton onClick={() => change('category','')} aria-label="Remove category filter">{category} ×</GovButton>}</div>}
        {boundaries.error && <p className="gov-note" role="alert">City boundaries are unavailable. <button type="button" className="gov-text-button" onClick={boundaries.reload}>Retry boundaries</button></p>}
        <GovState loading={records.loading && !records.data} error={records.error} onRetry={records.reload} />
        {records.data && !records.error && <>
            <div className="report-map-count"><strong>{rows.length} reports</strong>{rows.length > located.length && <span>{rows.length - located.length} without a map location</span>}<time title={formatDate(records.fetchedAt)}>Updated {new Date(records.fetchedAt).toLocaleTimeString('en-PH', {hour:'numeric',minute:'2-digit'})}</time></div>
            {records.data.asset&&<section className="gov-note"><strong>{records.data.asset.name}</strong> · {all.filter(r=>r.relationship==='linked').length} linked reports · {all.filter(r=>r.relationship==='nearby').length} other reports within {records.data.radius_m} m from the past 90 days. Nearby reports are location matches, not confirmed links. <Link to={`/gov/insights?view=predictive&asset=${encodeURIComponent(records.data.asset.asset_id)}`}>Back to asset review</Link>{!records.data.asset.geometry&&<p>The asset has no recorded map location. Only explicitly linked reports are shown.</p>}</section>}
            {(exactIds !== null || params.has('asset_id') || params.has('overview')) && <p className="gov-note">Selected reports · <Link to="/gov/map">Show all reports in my scope</Link>{params.has('overview') && <> · <Link to="/gov/overview">Back to overview</Link></>}</p>}
            {records.data.truncated && <p role="status">This map contains the latest {all.length} of {records.data.total} permitted reports. Use Reports to inspect older records.</p>}
            {heatmap && <p className="report-map-density-note">Report concentration · not a measure of severity</p>}
            <div className={`report-map-stage ${selected?'has-selection':''}`}><div className="report-map-aperture" role="region" aria-label="Map of reported concerns">
                {loadError || mapAuthError ? <div className="gov-state" role="alert"><h2>The map provider is unavailable</h2><p>The report list and recorded addresses below remain available. Try refreshing the page when the map connection is restored.</p></div> : !isLoaded ? <GovState loading /> : <GoogleMap mapContainerClassName="report-map-canvas" center={CENTER} zoom={12} onLoad={setMap} onUnmount={() => setMap(null)} onZoomChanged={()=>{if(map)setZoom(map.getZoom()||12);}} options={{ disableDefaultUI: true, zoomControl: true, fullscreenControl: true, streetViewControl: false, mapTypeControl: false, clickableIcons:false }}>
                    <CaloocanLayers data={boundaries.data} map={map} area={area} onArea={selectArea} onHover={setHoveredArea}/>
                    {records.data.asset?.geometry&&<AssetShape geometry={records.data.asset.geometry}/>}
                    {records.data.asset?.geometry?.type==='Point'&&<CircleF center={{lat:records.data.asset.geometry.coordinates[1],lng:records.data.asset.geometry.coordinates[0]}} radius={records.data.radius_m} options={{strokeColor:'#0b4f6c',strokeWeight:1,fillColor:'#0b4f6c',fillOpacity:.04,clickable:false}}/>}
                    <ReportPins reports={located} zoom={zoom} selectedId={selected?.id} onSelect={r=>change('reportId',String(r.id))} onCluster={exploreCluster}/>
                    {heatmap && <ReportDensityLayer data={density} options={HEAT_OPTIONS} />}
                </GoogleMap>}
                {!located.length && isLoaded && !loadError && <p className="report-map-empty">{rows.length ? 'These reports have no usable coordinates. Read their recorded addresses in the list below.' : records.data.asset ? 'No linked or nearby reports match this view. The recorded asset location is shown when available.' : 'No reports match this view. Clear the filters to see other records.'}</p>}
            </div>
            {selected && <ReportDocket mapContext key={selected.id} selected={selected} onClose={() => change('reportId','')} onChanged={records.reload} />}
            </div>
            <div className="report-map-caption"><span>{hoveredArea || 'Caloocan City'}</span><details><summary>Map legend</summary><p>Photo pins show submitted evidence. Numbered groups show nearby reports. Blue: active work · amber: open or under review · green: resolved · grey: rejected or cancelled.</p>{heatmap && <p>Each located report contributes one point. Brighter areas show more overlapping reports at the current zoom.</p>}</details></div>
            {cluster.length>1&&<section className="report-map-cluster-list"><strong>Reports in the selected group</strong><div className="gov-toolbar">{cluster.map(r=><GovButton key={r.id} onClick={()=>change('reportId',String(r.id))}>{r.ticket_id||`Report ${r.id}`}</GovButton>)}<GovButton onClick={()=>setCluster([])}>Close group</GovButton></div></section>}
            <GovTable label="Reports shown on the map and reports without coordinates" rows={rows} rowKey={r => r.id} selected={selected?.id} onSelect={r => { change('reportId', String(r.id)); if (r.position && map) { map.panTo(r.position); map.setZoom(17); } }} columns={[
                { key: 'ticket_id', label: 'Report', render: r => <>{r.ticket_id || `Report ${r.id}`}<small>{r.title}</small></> },
                { key: 'address', label: 'Location', render: r => <>{r.address || r.barangay || 'Address not recorded'}<small>{r.position ? `${r.position.lat.toFixed(5)}, ${r.position.lng.toFixed(5)}` : 'Coordinates not recorded'}</small></> },
                { key: 'priority', label: 'Severity grade', render: r => <ReportPriority grade={r.review_operations?.priority_grade} /> },
                { key: 'owner', label: 'Review owner', render: r => r.review_operations?.review_owner_name || (['resolved','completed','rejected','cancelled'].includes(r.status) ? 'Not recorded' : 'Needs routing') },
                { key: 'category', label: 'Category' }, { key: 'status', label: 'Status', render: r => <GovStatus value={r.status} /> },
            ]} />
        </>}
    </GovWorkspace>;
}
