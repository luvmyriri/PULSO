import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, GroundOverlayF, MarkerF } from '@react-google-maps/api';
import { useSearchParams } from 'react-router-dom';
import { LocateFixed } from 'lucide-react';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';
import { useGovernmentData } from '../../utils/governmentApi';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import { CaloocanLayers, AssetShape, extendGeometry, extendCity } from './CivicMapLayers';
import { GovButton, GovSelect, GovState, formatDate } from '../government/GovWorkspace';
import '../../pages/government-report-map.css';
import './predictive-hazard-map.css';

const CENTER = { lat: 14.751, lng: 121.02 };
const MAP_OPTIONS = { center: CENTER, zoom: 12, disableDefaultUI: true, zoomControl: true, fullscreenControl: true, clickableIcons: false, gestureHandling: 'cooperative' };
const layerCache = new Map();

function loadCityLayer(layerId, query, digest, refresh) {
    const key = `${layerId}:${digest}:${query}`;
    const cached = layerCache.get(key);
    if (!refresh && cached?.until > Date.now()) return cached.promise;
    const promise = fetch(`${API_BASE_URL}/api/gov/predictive/hazard-layers/${layerId}/map?${query}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }, signal: AbortSignal.timeout(35_000),
    }).then(async response => {
        if (!response.ok) throw new Error('The hazard map could not be loaded. Retry the layer or open the source portal.');
        const result = await response.json();
        if (!result.clipped_to_city || result.boundary_digest !== digest) throw new Error('Hazard shading and city outlines do not match. Refresh the page to reload the boundaries.');
        return result;
    });
    const entry = { promise, until: Date.now() + 3_600_000 };
    if (layerCache.size >= 12) layerCache.clear();
    layerCache.set(key, entry);
    promise.catch(() => { if (layerCache.get(key) === entry) layerCache.delete(key); });
    return promise;
}

function assetPoint(geometry) {
    let coordinates = geometry?.coordinates;
    while (Array.isArray(coordinates?.[0])) coordinates = coordinates[0];
    return coordinates?.length >= 2 ? { lat: coordinates[1], lng: coordinates[0] } : null;
}

function HazardOverlay({ layerId, opacity, onState, revision, boundaries }) {
    const [image, setImage] = useState(null);
    const lastRevision = useRef(revision);
    useEffect(() => {
        if (!boundaries?.features || layerId === 'none') return;
        let active = true;
        const bounds = new window.google.maps.LatLngBounds();
        if (!extendCity(bounds, boundaries)) return;
        const sw = bounds.getSouthWest(), ne = bounds.getNorthEast();
        // A fixed city extent is reused across pan, zoom, asset selection and filters.
        const query = new URLSearchParams({ west: String(Math.floor(sw.lng() * 1e5) / 1e5), south: String(Math.floor(sw.lat() * 1e5) / 1e5), east: String(Math.ceil(ne.lng() * 1e5) / 1e5), north: String(Math.ceil(ne.lat() * 1e5) / 1e5) });
        setImage(null);
        onState({ status: 'loading', layerId });
        const refresh = lastRevision.current !== revision;
        lastRevision.current = revision;
        loadCityLayer(layerId, query, boundaries.metadata?.source_digest, refresh).then(result => {
            if (!active) return;
            setImage(result.coverage?.has_visible_features === false ? null : { url: `data:image/png;base64,${result.image_data}`, bounds: result.bounds });
            onState({ status: result.coverage?.has_visible_features === false ? 'no_features' : 'available', coverage: result.coverage, layerId, at: new Date().toISOString() });
        }).catch(cause => { if (active) onState({ status: 'error', layerId, message: cause.name === 'TimeoutError' ? 'The hazard source is taking too long. Retry the layer.' : cause.message }); });
        return () => { active = false; };
    }, [layerId, onState, revision, boundaries]);
    return image ? <GroundOverlayF key={`${layerId}:${image.url}`} url={image.url} bounds={image.bounds} opacity={opacity} options={{ clickable: false }} /> : null;
}

export default function PredictiveHazardMap({ assets, selected, onSelect }) {
    const { isLoaded, loadError } = useGoogleMaps();
    const [params, setParams] = useSearchParams();
    const catalog = useGovernmentData('/api/gov/predictive/hazard-layers');
    const boundaries = useGovernmentData('/api/geo/map-reference');
    const [map, setMap] = useState(null);
    const [hovered, setHovered] = useState('');
    const [opacity, setOpacity] = useState(0.30);
    const [overlay, setOverlay] = useState(null);
    const [revision, setRevision] = useState(0);
    const [authError, setAuthError] = useState(false);
    const layerId = params.get('hazard') || 'flood';
    const layer = catalog.data?.items.find(item => item.id === layerId);
    const currentOverlay = overlay?.layerId === layerId ? overlay : null;
    const legend = useGovernmentData(layer ? `/api/gov/predictive/hazard-layers/${layer.id}/legend` : null);
    const located = useMemo(() => assets.filter(asset => assetPoint(asset.geometry)), [assets]);
    const lastFit = useRef(null);
    const fitKey = JSON.stringify(located.map(asset => [asset.asset_id, asset.geometry]));
    const changeArea = useCallback(value => setParams(previous => { const next = new URLSearchParams(previous); next.set('barangay', value); return next; }), [setParams]);
    const fit = useCallback(() => {
        if (!map) return;
        const bounds = new window.google.maps.LatLngBounds();
        located.forEach(asset => extendGeometry(bounds, asset.geometry));
        if (bounds.isEmpty()) extendCity(bounds, boundaries.data);
        if (!bounds.isEmpty()) map.fitBounds(bounds, 40);
        if (located.length === 1) map.setZoom(16);
    }, [map, located, boundaries.data]);
    const currentFit = useRef(fit);
    useEffect(() => { currentFit.current = fit; }, [fit]);
    useEffect(() => {
        if (!map) return;
        // Fit after the map receives its actual pane size, including view switches.
        const observer = new ResizeObserver(() => currentFit.current());
        observer.observe(map.getDiv());
        return () => observer.disconnect();
    }, [map]);
    useEffect(() => {
        if (!map) return;
        const key = `${fitKey}:${boundaries.data?.metadata?.source_digest || ''}`;
        if (lastFit.current?.map === map && lastFit.current.key === key) return;
        lastFit.current = { map, key };
        fit();
    }, [map, fitKey, fit, boundaries.data?.metadata?.source_digest]);
    useEffect(() => {
        const previous = window.gm_authFailure;
        window.gm_authFailure = () => { setAuthError(true); previous?.(); };
        return () => { window.gm_authFailure = previous; };
    }, []);
    return <section className="predictive-hazard-map" aria-label="Infrastructure and hazard map">
        <h2>Infrastructure and hazard map</h2>
        <p className="gov-note">Compare recorded infrastructure with MGB and PHIVOLCS planning maps. Select an asset to review its condition, weather, history and next work.</p>
        <div className="gov-toolbar">
            <GovSelect label="Hazard layer" value={layerId} options={[{ value: 'none', label: 'Boundaries and assets only' }, ...(catalog.data?.items || []).map(item => ({ value: item.id, label: `${item.name} · ${item.agency}` }))]} onChange={value => setParams(previous => { const next = new URLSearchParams(previous); next.set('hazard', value); return next; })} />
            {layer && <label className="predictive-layer-opacity">Layer opacity <input type="range" min="10" max="90" value={Math.round(opacity * 100)} onChange={event => setOpacity(Number(event.target.value) / 100)} /> {Math.round(opacity * 100)}%</label>}
            <GovButton onClick={fit} disabled={!map}><LocateFixed size={15} aria-hidden="true" /> Fit assets</GovButton>
        </div>
        <GovState loading={catalog.loading && !catalog.data} error={catalog.error} onRetry={catalog.reload} />
        {boundaries.error && <p className="gov-error" role="alert">Boundary outlines could not be loaded. <GovButton onClick={boundaries.reload}>Retry boundaries</GovButton></p>}
        {layer && <div className="predictive-layer-state" aria-live="polite">
            {currentOverlay?.status === 'loading' && <p role="status">Loading {layer.name.toLowerCase()}…</p>}
            {currentOverlay?.status === 'error' && <p role="alert" className="gov-error">{currentOverlay.message} <GovButton onClick={() => setRevision(value => value + 1)}>Retry hazard layer</GovButton></p>}
            {currentOverlay?.status === 'no_features' && <p className="gov-note"><strong>{layer.name}:</strong> the source returned no visible features inside Caloocan at this map scale. This does not establish the absence of a hazard. <a href={layer.source_url} target="_blank" rel="noreferrer">Check the {layer.agency} source</a>.</p>}
            {currentOverlay?.status === 'available' && currentOverlay.coverage && <div className="predictive-layer-coverage"><p className="gov-note">Visible source features: {currentOverlay.coverage.sectors.filter(sector => sector.has_visible_features).map(sector => `${sector.name} Caloocan`).join(' and ')}. Some mapped areas may be outside the asset view.</p><GovButton disabled={!map || !currentOverlay.coverage.bounds} onClick={() => map.fitBounds(currentOverlay.coverage.bounds, 40)}>View mapped areas</GovButton></div>}
        </div>}
        <div className="report-map-aperture" role="region" aria-label="Caloocan infrastructure locations and selected hazard layer">
            {loadError || authError ? <GovState error="The map provider is unavailable. Switch to Table View to review asset locations." /> : !isLoaded ? <GovState loading /> : <GoogleMap mapContainerClassName="report-map-canvas" options={MAP_OPTIONS} onLoad={setMap} onUnmount={() => setMap(null)}>
                <CaloocanLayers map={map} data={boundaries.data} area={params.get('barangay') || 'all'} onArea={changeArea} onHover={setHovered} />
                {layer && boundaries.data && <HazardOverlay key={layer.id} layerId={layer.id} opacity={opacity} onState={setOverlay} revision={revision} boundaries={boundaries.data} />}
                {located.map(asset => <MarkerF key={asset.asset_id} position={assetPoint(asset.geometry)} title={`${asset.asset_id} · ${asset.asset_name} · ${asset.registry_status || 'unverified registry'}`} onClick={() => onSelect(asset, null)} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: asset.asset_id === selected?.asset_id ? 9 : 6, fillColor: asset.asset_id === selected?.asset_id ? '#ff6b00' : '#172b3a', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }} />)}
                {selected?.geometry && <AssetShape geometry={selected.geometry} />}
            </GoogleMap>}
        </div>
        <p className="gov-note">{hovered || 'Caloocan City and barangay outlines'} · {located.length} of {assets.length} filtered assets have map locations. Infrastructure markers only. The asset table provides a location and record alternative.</p>
        <p className="gov-note">Hazard shading is clipped to the city outlines. Filtered assets fit automatically; pan and zoom reuse the loaded city layer.</p>
        {layer && currentOverlay?.status === 'available' && <p className="gov-note">{layer.name} map loaded {formatDate(currentOverlay.at)}. Unshaded areas do not establish that a location is safe.</p>}
        {layer && <details className="predictive-map-source">
            <summary>{layer.name} legend and source · {layer.agency} through GeoRiskPH</summary>
            <GovState loading={legend.loading && !legend.data} error={legend.error} onRetry={legend.reload} />
            <ul className="predictive-map-legend">{legend.data?.items.map((item, index) => <li key={`${item.label}:${index}`}><img src={`data:image/png;base64,${item.image_data}`} alt="" width="24" height="24" />{item.label}</li>)}</ul>
            <p className="gov-note">Dataset revision date: {legend.data?.source_date || catalog.data?.source_date}. <a href={layer.source_url} target="_blank" rel="noreferrer">View {layer.agency} map service</a>. Service legends use source colors.</p>
        </details>}
        <p className="gov-note">{catalog.data?.limitation} These public services provide map images; PULSO does not infer an asset hazard class from their colors.</p>
        <a className="gov-button" href="https://hazardhunter.georisk.gov.ph/" target="_blank" rel="noreferrer">Open HazardHunterPH assessment and other hazard maps</a>
    </section>;
}
