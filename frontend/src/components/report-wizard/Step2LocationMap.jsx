import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { 
  MapPin, Navigation, Search, CheckCircle2, AlertTriangle, 
  ArrowLeft, ArrowRight, Loader2, Compass 
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  isInCaloocan, 
  getDistrictLabel, 
  estimateBarangayFromCoords, 
  CALOOCAN_CENTERS,
  CALOOCAN_BOUNDS 
} from '../../utils/geospatial';

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '380px',
  borderRadius: '1rem',
};

// Subtle light theme map style
const LIGHT_MAP_STYLE = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

// High-contrast deep night map style
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0369a1' }] },
];

export default function Step2LocationMap({ 
  isMapLoaded, 
  locationData, 
  onLocationChange, 
  onBack, 
  onContinue 
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const mapRef = useRef(null);

  const currentLat = locationData?.lat ?? CALOOCAN_CENTERS.north.lat;
  const currentLng = locationData?.lng ?? CALOOCAN_CENTERS.north.lng;
  const inCaloocan = isInCaloocan(currentLat, currentLng);
  const districtLabel = getDistrictLabel(currentLat, currentLng);

  // Update boundary validation status in parent if needed
  useEffect(() => {
    if (locationData.isInCaloocan !== inCaloocan) {
      onLocationChange({
        ...locationData,
        isInCaloocan: inCaloocan,
      });
    }
  }, [inCaloocan, locationData, onLocationChange]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Update coordinates handler
  const updateCoordinates = (lat, lng, addressString = '') => {
    const valid = isInCaloocan(lat, lng);
    const estimatedBarangay = estimateBarangayFromCoords(lat, lng);
    const newAddress = addressString || (valid ? `Caloocan City (${lat.toFixed(5)}, ${lng.toFixed(5)})` : `External Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);

    onLocationChange({
      ...locationData,
      lat,
      lng,
      address: newAddress,
      barangay: estimatedBarangay,
      isInCaloocan: valid,
    });
  };

  // Drag Marker End
  const handleMarkerDragEnd = (e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    updateCoordinates(lat, lng);
  };

  // Map Click
  const handleMapClick = (e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    updateCoordinates(lat, lng);
  };

  // Quick jump to North or South Caloocan
  const jumpToSector = (sector) => {
    const target = CALOOCAN_CENTERS[sector] || CALOOCAN_CENTERS.north;
    updateCoordinates(target.lat, target.lng);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: target.lat, lng: target.lng });
      mapRef.current.setZoom(15);
    }
  };

  // Browser Geolocation
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateCoordinates(latitude, longitude);
        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(16);
        }
        setIsLocating(false);
      },
      (error) => {
        console.warn('Geolocation acquisition failed:', error);
        setIsLocating(false);
        setGeoError(t('reportWizard.step2Location.locationError', 'Unable to acquire GPS location. Please drag the pin on the map.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search Address Simulation / Forward Geocode
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const queryLower = searchQuery.toLowerCase();
    let target = null;

    if (queryLower.includes('south') || queryLower.includes('monumento') || queryLower.includes('grace park') || queryLower.includes('8th ave') || queryLower.includes('10th ave')) {
      target = { lat: 14.6500, lng: 120.9800, name: `${searchQuery}, South Caloocan` };
    } else if (queryLower.includes('bagong silang') || queryLower.includes('176')) {
      target = { lat: 14.7780, lng: 121.0500, name: `Barangay 176 (Bagong Silang), Caloocan` };
    } else if (queryLower.includes('camarin') || queryLower.includes('174') || queryLower.includes('175')) {
      target = { lat: 14.7565, lng: 121.0450, name: `Camarin, North Caloocan` };
    } else if (queryLower.includes('deparo') || queryLower.includes('168')) {
      target = { lat: 14.7380, lng: 121.0200, name: `Barangay 168 (Deparo), North Caloocan` };
    } else if (queryLower.includes('tala') || queryLower.includes('180') || queryLower.includes('holy redeemer')) {
      target = { lat: 14.7650, lng: 121.0650, name: `Tala, North Caloocan` };
    } else if (queryLower.includes('manila') || queryLower.includes('quezon city') || queryLower.includes('valenzuela')) {
      // Intentionally places outside to demonstrate out-of-boundary handling
      target = { lat: 14.6400, lng: 121.0300, name: `${searchQuery} (Outside Caloocan)` };
    } else {
      target = { lat: 14.7565, lng: 121.0450, name: `${searchQuery}, Caloocan City` };
    }

    if (target) {
      updateCoordinates(target.lat, target.lng, target.name);
      if (mapRef.current) {
        mapRef.current.panTo({ lat: target.lat, lng: target.lng });
        mapRef.current.setZoom(15);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          {t('reportWizard.step2Location.title', 'Pin Incident Location')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('reportWizard.step2Location.subtitle', 'Point to the exact spot in Caloocan City where the issue is located.')}
        </p>
      </div>

      {/* ── SEARCH & GPS CONTROLS ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <label htmlFor="map-search-input" className="sr-only">Search location in Caloocan</label>
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="map-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('reportWizard.step2Location.searchPlaceholder', 'Search street name, landmark, or barangay in Caloocan...')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            />
          </div>
        </form>

        {/* GPS Geolocate Button */}
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800/60 text-orange-700 dark:text-orange-300 text-xs sm:text-sm font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 shrink-0"
        >
          {isLocating ? <Loader2 size={16} className="animate-spin text-orange-600" /> : <Navigation size={16} />}
          <span>{isLocating ? t('reportWizard.step2Location.locating', 'Acquiring GPS...') : t('reportWizard.step2Location.useMyLocation', 'Use My Current GPS')}</span>
        </button>
      </div>

      {/* Quick Sector Jump Pills */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Compass size={14} className="text-slate-400" />
        <span className="font-semibold">Quick Center:</span>
        <button
          type="button"
          onClick={() => jumpToSector('north')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          North Caloocan (Camarin/Tala)
        </button>
        <button
          type="button"
          onClick={() => jumpToSector('south')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          South Caloocan (Monumento)
        </button>
      </div>

      {/* Geolocation error notice */}
      {geoError && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* ── MAP CONTAINER ───────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-950">
        {isMapLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={{ lat: currentLat, lng: currentLng }}
            zoom={15}
            onLoad={onMapLoad}
            onClick={handleMapClick}
            options={{
              styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            <MarkerF
              position={{ lat: currentLat, lng: currentLng }}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
              animation={window.google?.maps?.Animation?.DROP}
            />
          </GoogleMap>
        ) : (
          /* Fallback interactive coordinate box if map is loading or offline */
          <div className="w-full h-[380px] flex flex-col items-center justify-center p-6 text-center bg-slate-100 dark:bg-slate-900">
            <MapPin size={40} className="text-orange-500 mb-3 animate-bounce" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              Interactive Map Positioning Active
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Coordinates pinned: Lat: {currentLat.toFixed(5)}, Lng: {currentLng.toFixed(5)}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => jumpToSector('north')}
                className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                Set to North Caloocan
              </button>
              <button
                type="button"
                onClick={() => jumpToSector('south')}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                Set to South Caloocan
              </button>
            </div>
          </div>
        )}

        {/* Pin helper overlay badge */}
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-800 pointer-events-none flex items-center gap-1.5">
          <MapPin size={13} className="text-orange-600" />
          <span>Click or drag pin to position hazard</span>
        </div>
      </div>

      {/* ── JURISDICTIONAL BOUNDARY STATUS CARD ─────────────────────────────── */}
      <div className={`p-4 rounded-2xl border-2 transition-all ${
        inCaloocan 
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
          : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
            inCaloocan 
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
          }`}>
            {inCaloocan ? <CheckCircle2 size={20} strokeWidth={2.2} /> : <AlertTriangle size={20} strokeWidth={2.2} />}
          </div>

          <div className="flex-1 space-y-1">
            <h4 className={`font-bold text-sm sm:text-base ${
              inCaloocan ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'
            }`}>
              {inCaloocan
                ? t('reportWizard.step2Location.insideBoundary', 'Verified within Caloocan City ({{district}})', { district: districtLabel })
                : t('reportWizard.step2Location.outsideBoundaryWarning', 'Selected location is outside Caloocan City jurisdiction')}
            </h4>
            <p className={`text-xs sm:text-sm ${
              inCaloocan ? 'text-emerald-800/90 dark:text-emerald-300/80' : 'text-rose-800/90 dark:text-rose-300/80'
            }`}>
              {inCaloocan
                ? `Coordinates (${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}) are within official municipal boundaries.`
                : t('reportWizard.step2Location.outsideBoundaryDesc', 'PULSO can only dispatch work orders within Caloocan City borders. Please reposition the pin within city boundaries.')}
            </p>
          </div>
        </div>
      </div>

      {/* ── LANDMARK & SPECIFIC ADDRESS INPUT ───────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <label htmlFor="landmark-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            {t('reportWizard.step2Location.landmarkLabel', 'Specific Landmark / Notes (Optional)')}
          </label>
          <input
            id="landmark-input"
            type="text"
            value={locationData.landmark || ''}
            onChange={(e) => onLocationChange({ ...locationData, landmark: e.target.value })}
            placeholder={t('reportWizard.step2Location.landmarkPlaceholder', 'e.g. In front of Caloocan High School, beside Gate 2')}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          />
        </div>
      </div>

      {/* ── ACTION FOOTER ────────────────────────────────────────────────────── */}
      <div className="pt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <ArrowLeft size={16} />
          <span>{t('reportWizard.nav.back', 'Back')}</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={!inCaloocan}
          className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            inCaloocan
              ? 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          }`}
        >
          <span>{t('reportWizard.nav.next', 'Continue')}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
