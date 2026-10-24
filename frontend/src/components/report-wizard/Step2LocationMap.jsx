import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { 
  MapPin, Navigation, Search, AlertTriangle, 
  Loader2
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  isInCaloocan, 
  getDistrictLabel, 
  estimateBarangayFromCoords, 
  CALOOCAN_CENTERS,
  CALOOCAN_BOUNDS 
} from '../../utils/geospatial';
import WizardCardFooter from './WizardCardFooter';

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
  minHeight: '380px',
};

const LIGHT_MAP_STYLE = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

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

  const handleMarkerDragEnd = (e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    updateCoordinates(lat, lng);
  };

  const handleMapClick = (e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    updateCoordinates(lat, lng);
  };

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
      target = { lat: 14.6400, lng: 121.0300, name: `${searchQuery} (Outside Caloocan)` };
    } else {
      target = { lat: CALOOCAN_CENTERS.north.lat, lng: CALOOCAN_CENTERS.north.lng, name: `${searchQuery}, North Caloocan` };
    }

    updateCoordinates(target.lat, target.lng, target.name);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: target.lat, lng: target.lng });
      mapRef.current.setZoom(16);
    }
  };

  const handleLandmarkChange = (e) => {
    onLocationChange({
      ...locationData,
      landmark: e.target.value,
    });
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.step2Location.title', 'Where is the concern?')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t('reportWizard.step2Location.subtitle', 'Search for a place, then adjust the pin to the right spot.')}
          </p>
        </div>

        {/* Search Row: Input + "Use my location" button */}
        <div className="space-y-1.5">
          <label htmlFor="location-search" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            {t('reportWizard.step2Location.searchLabel', 'Search for an address or landmark')}
          </label>
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                id="location-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('reportWizard.step2Location.searchPlaceholder', 'Street, landmark or barangay')}
                className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              />
            </div>
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={isLocating}
              className="min-h-[48px] px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer shrink-0"
            >
              {isLocating ? (
                <>
                  <Loader2 size={16} className="animate-spin text-orange-600" aria-hidden="true" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Navigation size={16} className="text-orange-600 dark:text-orange-400" aria-hidden="true" />
                  <span>{t('reportWizard.step2Location.useMyLocation', 'Use my location')}</span>
                </>
              )}
            </button>
          </form>

          {geoError && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle size={14} aria-hidden="true" />
              <span>{geoError}</span>
            </p>
          )}
        </div>

        {/* Two Columns: Map (Left) & Selected Location Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Map Area */}
          <div className="lg:col-span-7 xl:col-span-8 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 relative min-h-[360px] lg:min-h-[400px]">
            {isMapLoaded ? (
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={{ lat: currentLat, lng: currentLng }}
                zoom={15}
                onLoad={onMapLoad}
                onClick={handleMapClick}
                options={{
                  styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
                  disableDefaultUI: true,
                  zoomControl: false,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  restriction: {
                    latLngBounds: CALOOCAN_BOUNDS,
                    strictBounds: false,
                  },
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
              <div className="w-full h-full min-h-[360px] flex flex-col items-center justify-center p-6 text-center space-y-2">
                <Loader2 size={24} className="animate-spin text-orange-600" aria-hidden="true" />
                <p className="text-xs text-slate-500">Loading interactive map...</p>
              </div>
            )}


          </div>

          {/* Selected Location Panel */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('reportWizard.step2Location.selectedLocationTitle', 'Selected location')}
              </h2>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={18} aria-hidden="true" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                    {locationData?.address || 'No place chosen yet'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {locationData?.barangay || 'Caloocan City'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                    {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                  </p>
                </div>
              </div>



              {/* Nearby Landmark Field */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label htmlFor="location-landmark" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t('reportWizard.step2Location.landmarkLabel', 'Nearby landmark (optional)')}
                </label>
                <input
                  id="location-landmark"
                  type="text"
                  value={locationData?.landmark || ''}
                  onChange={handleLandmarkChange}
                  placeholder={t('reportWizard.step2Location.landmarkPlaceholder', 'Add a gate, building or landmark')}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                />
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Pinned Footer */}
      <WizardCardFooter
        onBack={onBack}
        canBack={true}
        onContinue={onContinue}
        isContinueDisabled={!inCaloocan}
      />
    </div>
  );
}
