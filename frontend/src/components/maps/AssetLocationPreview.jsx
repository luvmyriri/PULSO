import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GoogleMap } from '@react-google-maps/api';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';
import { AssetShape, extendGeometry } from './CivicMapLayers';

const center={lat:14.751,lng:121.02};
const options={disableDefaultUI:true,zoomControl:true,clickableIcons:false,gestureHandling:'cooperative'};
export default function AssetLocationPreview({ assetId, data, loading, error }){
    const {isLoaded,loadError}=useGoogleMaps();
    const geometry=data?.location?.geometry;
    const onLoad=useCallback(map=>{if(!geometry)return;const bounds=new window.google.maps.LatLngBounds();extendGeometry(bounds,geometry);map.fitBounds(bounds,24);if(geometry.type==='Point')map.setZoom(16);},[geometry]);
    return <section><h3>Location and nearby reports</h3>
        {loading?<p>Loading the recorded location…</p>:error?<p>The location could not be loaded. Try refreshing the asset.</p>:geometry?<>
            <div className="asset-location-preview" role="region" aria-label="Recorded infrastructure location">{loadError?<p>The map is unavailable. Use the investigation link to open the recorded location and report list.</p>:isLoaded?<GoogleMap mapContainerStyle={{width:'100%',height:'100%'}} center={center} zoom={15} onLoad={onLoad} options={options}><AssetShape geometry={geometry}/></GoogleMap>:<p>Loading map…</p>}</div>
            {geometry.type==='Point'&&<p className="gov-note">Recorded coordinates: {geometry.coordinates[1].toFixed(5)}, {geometry.coordinates[0].toFixed(5)}</p>}
        </>:<p>No map location is recorded for this asset. Linked reports can still be investigated.</p>}
        {data&&<p>{data.linked_report_count} linked reports · {data.nearby_report_count} other reports within 500 m in the past 90 days.</p>}
        <Link className="gov-button" to={`/gov/map?asset=${encodeURIComponent(assetId)}&radius=500`}><MapPin size={15}/> Investigate on map <ArrowUpRight size={14}/></Link>
        <p className="gov-note">Nearby reports are location matches. They have not been confirmed as concerns about this asset.</p>
    </section>;
}
