import { useEffect, useState } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';

const options = {
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'cooperative',
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false,
};

export default function ReportLocationPreview({ report }) {
    const { isLoaded, loadError } = useGoogleMaps();
    const [mapAuthError, setMapAuthError] = useState(false);
    const location = useLocation();
    const lat = Number(report.location_lat);
    const lng = Number(report.location_lng);
    const hasPin = report.location_lat != null && report.location_lng != null
        && Number.isFinite(lat) && Number.isFinite(lng)
        && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
    const position = hasPin ? { lat, lng } : null;
    const mapUrl = `/gov/map?ids=${encodeURIComponent(report.id)}&reportId=${encodeURIComponent(report.id)}&from=${encodeURIComponent(location.pathname + location.search)}`;

    useEffect(() => {
        if (!hasPin) return;
        const previous = window.gm_authFailure;
        window.gm_authFailure = () => { setMapAuthError(true); previous?.(); };
        return () => { window.gm_authFailure = previous; };
    }, [hasPin]);

    return <section className="report-docket-location">
        <h3>Recorded location</h3>
        <p>{report.location_string || report.location_barangay || 'Address not recorded'}</p>
        {hasPin ? <>
            <div className="report-docket-location-map" role="region" aria-label={`Map preview for ${report.ticket_id}`}>
                {loadError || mapAuthError ? <p role="status">The map is unavailable. The recorded address and coordinates remain below.</p>
                    : isLoaded ? <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={position} zoom={16} options={options}><MarkerF position={position} title={report.ticket_id} /></GoogleMap>
                        : <p role="status">Loading map preview…</p>}
            </div>
            <p className="gov-note">Recorded pin: {lat.toFixed(5)}, {lng.toFixed(5)}. Check the pin against the report evidence before verification.</p>
        </> : <p className="gov-note">No map pin is recorded for this report. Use its recorded address; placement needs staff review.</p>}
        <Link className="gov-text-button" to={mapUrl}><MapPin size={14} aria-hidden="true" /> Open on reports map <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </section>;
}
