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
  estimateBarangayFromCoords, 
  CALOOCAN_CENTERS,
  CALOOCAN_BOUNDS 
} from '../../utils/geospatial';
import WizardCardFooter from './WizardCardFooter';

import LocationAddressPanel from '../maps/LocationAddressPanel';
import { reverseGeocodeLocation } from '../../utils/reverseGeocode';
import { parseGeocodedAddress, formatFullAddress, parseLegacyDisplayAddress } from '../../utils/locationPrivacy';

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
  onContinue,
  stepErrors = [],
  stepWarnings = [],
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const mapRef = useRef(null);
  const watchRef = useRef(null);
  const locationChangeRef = useRef(onLocationChange);
  locationChangeRef.current = onLocationChange;

  const stopTracking = useCallback(() => {
    if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setIsTracking(false);
  }, []);

  useEffect(() => () => {
    if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  const locError = stepErrors.find(e => e.field === 'location' || e.field === 'address');
  const landmarkVal = locationData?.landmark || '';
  const landmarkLength = landmarkVal.length;

  const currentLat = locationData?.lat ?? CALOOCAN_CENTERS.north.lat;
  const currentLng = locationData?.lng ?? CALOOCAN_CENTERS.north.lng;
  const hasSavedCoordinates = Number.isFinite(locationData?.lat) && Number.isFinite(locationData?.lng);
  const hasSelection = locationData?.confirmed === true && hasSavedCoordinates;
  const inCaloocan = hasSelection && isInCaloocan(currentLat, currentLng);
  const safeBrgy = typeof locationData?.barangay === 'object' && locationData?.barangay !== null
    ? (locationData.barangay.name || locationData.barangay.displayName || '')
    : (locationData?.barangay || '');

  useEffect(() => {
    if (locationData?.isInCaloocan !== inCaloocan) {
      onLocationChange({
        ...locationData,
        isInCaloocan: inCaloocan,
      });
    }
  }, [inCaloocan, locationData, onLocationChange]);

  useEffect(() => {
    if (!hasSavedCoordinates) return;
    let active = true;
    // Debounce manual map selection; cancel old responses after moving the pin.
    const timer = setTimeout(() => {
      reverseGeocodeLocation(currentLat, currentLng).then(result => {
        if (!active) return;
        locationChangeRef.current(previous => {
          if (previous.lat !== currentLat || previous.lng !== currentLng) return previous;
          return { ...previous, address: result.address, structuredAddress: result.structuredAddress, addressStatus: result.status };
        });
      });
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [hasSavedCoordinates, currentLat, currentLng]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const updateCoordinates = (lat, lng, addressString = '') => {
    const valid = isInCaloocan(lat, lng);
    const estimatedBarangay = estimateBarangayFromCoords(lat, lng);
    const safeAddress = typeof addressString === 'object' ? addressString : parseLegacyDisplayAddress(addressString);
    const newAddress = formatFullAddress(safeAddress);

    onLocationChange(previous => ({
      ...previous,
      lat,
      lng,
      address: newAddress,
      structuredAddress: safeAddress,
      addressStatus: 'LOADING',
      barangay: estimatedBarangay,
      isInCaloocan: valid,
      confirmed: true,
      source: addressString ? 'place-search' : 'selected-map-or-device',
      capturedAt: Date.now(),
    }));
  };

  const handleMarkerDragEnd = (e) => {
    stopTracking();
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    updateCoordinates(lat, lng);
  };

  const handleMapClick = (e) => {
    stopTracking();
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    updateCoordinates(lat, lng);
  };

  const acceptPosition = (position) => {
    const { latitude, longitude } = position.coords;
    updateCoordinates(latitude, longitude);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: latitude, lng: longitude });
      mapRef.current.setZoom(16);
    }
    setIsLocating(false);
    setGeoError(null);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      acceptPosition,
      (error) => {
        console.warn('Geolocation acquisition failed:', error);
        setIsLocating(false);
        setGeoError(t('reportWizard.validation.location.permissionDenied', "We can't find your location. Turn on Location in your phone settings, or pin the spot on the map yourself."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLiveLocation = () => {
    if (isTracking) { stopTracking(); return; }
    if (!navigator.geolocation) {
      setGeoError(t('reportWizard.step2Location.unsupported', 'Location is not available on this device. Choose the place on the map.'));
      return;
    }
    setGeoError(null);
    setIsLocating(true);
    setIsTracking(true);
    try {
      watchRef.current = navigator.geolocation.watchPosition(
        acceptPosition,
        () => {
          stopTracking();
          setIsLocating(false);
          setGeoError(t('reportWizard.step2Location.locationError', 'Unable to acquire GPS. Choose the place on the map or retry.'));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } catch {
      stopTracking();
      setIsLocating(false);
      setGeoError(t('reportWizard.step2Location.locationError', 'Unable to acquire GPS. Choose the place on the map or retry.'));
    }
  };

  useEffect(() => {
    const stopWhenHidden = () => { if (document.visibilityState === 'hidden' && watchRef.current !== null) stopTracking(); };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => document.removeEventListener('visibilitychange', stopWhenHidden);
  }, [stopTracking]);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (!window.google?.maps?.Geocoder) {
      setGeoError(t('reportWizard.step2Location.searchUnavailable', 'Place search is unavailable. Choose a place on the map or use GPS.'));
      return;
    }
    try {
      const result = await new window.google.maps.Geocoder().geocode({ address: `${searchQuery.trim()}, Caloocan City, Philippines` });
      const place = result.results?.[0];
      if (!place?.geometry?.location) throw new Error('No place found');
      stopTracking();
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      updateCoordinates(lat, lng, parseGeocodedAddress(result.results, lat, lng, result.plus_code));
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(16);
      setGeoError(null);
    } catch {
      setGeoError(t('reportWizard.step2Location.searchFailed', 'No matching place was found. Try another address or choose the place on the map.'));
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

        {/* Inline Step Error Banner */}
        {locError && (
          <div id="location-step-error" role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-sm font-semibold text-red-700 dark:text-red-300 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 text-red-500" aria-hidden="true" />
            <span>{locError.message}</span>
          </div>
        )}

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
                  <span>{hasSelection ? t('reportWizard.step2Location.resyncGps', 'Resync GPS') : t('reportWizard.step2Location.useMyLocation', 'Use my location')}</span>
                </>
              )}
            </button>
            <button type="button" onClick={handleLiveLocation} className="min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 focus-visible:outline-3 focus-visible:outline-blue-600">
              {isTracking ? t('reportWizard.step2Location.stopLive', 'Stop live location') : t('reportWizard.step2Location.startLive', 'Track while reporting')}
            </button>
          </form>
          <p className="text-xs text-slate-600 dark:text-slate-300">{t('reportWizard.step2Location.liveHelp', 'Live location updates only while this step is open. Review the pin before continuing.')}</p>

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
                {hasSavedCoordinates && <MarkerF
                  position={{ lat: currentLat, lng: currentLng }}
                  draggable={true}
                  onDragEnd={handleMarkerDragEnd}
                  animation={window.google?.maps?.Animation?.DROP}
                />}
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
                  <LocationAddressPanel
                    address={locationData?.structuredAddress || parseLegacyDisplayAddress(locationData?.address)}
                    coordinates={locationData}
                    status={locationData?.addressStatus}
                    loading={isLocating || locationData?.addressStatus === 'LOADING'}
                  />
                </div>
              </div>



              {!hasSelection && hasSavedCoordinates && <button type="button" onClick={() => updateCoordinates(locationData.lat, locationData.lng, locationData.address)} className="min-h-11 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus-visible:outline-3 focus-visible:outline-blue-600">{t('reportWizard.step2Location.confirmSavedLocation', 'Confirm saved location')}</button>}
              {/* Accuracy Warning and Confirmation Checkbox */}
              {locationData?.accuracy > 20 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs space-y-2">
                  <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                    <span>{t('reportWizard.validation.location.accuracyWarning', 'Location may be off. Tap Change location to fix it.')}</span>
                  </p>
                  <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={locationData?.pinConfirmed || false}
                      onChange={(e) => onLocationChange(prev => ({ ...prev, pinConfirmed: e.target.checked }))}
                      className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                    />
                    <span>{t('reportWizard.validation.location.confirmPin', 'This pin is the right spot')}</span>
                  </label>
                </div>
              )}
              {/* Nearby Landmark Field */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label htmlFor="location-landmark" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t('reportWizard.step2Location.landmarkLabel', 'Nearby landmark (optional)')}
                  </label>
                  {landmarkLength >= 80 && (
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      {landmarkLength} / 100
                    </span>
                  )}
                </div>
                <input
                  id="location-landmark"
                  type="text"
                  value={locationData?.landmark || ''}
                  onChange={handleLandmarkChange}
                  maxLength={100}
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
        isContinueDisabled={false}
      />
    </div>
  );
}
