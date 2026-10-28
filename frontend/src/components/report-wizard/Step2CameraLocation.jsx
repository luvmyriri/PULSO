import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  UploadCloud,
  MapPin,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  X,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  isInCaloocan,
  estimateBarangayFromCoords,
  CALOOCAN_CENTERS
} from '../../utils/geospatial';
import { findBarangayByCoordinates } from '../../data/caloocanBoundaries';
import IDCameraModal from '../IDCameraModal';
import WizardCardFooter from './WizardCardFooter';
import LocationAddressPanel from '../maps/LocationAddressPanel';
import LocationCoordinates from '../maps/LocationCoordinates';
import { reverseGeocodeLocation } from '../../utils/reverseGeocode';
import { normalizeDisplayAddress, parseLegacyDisplayAddress, formatFullAddress, parseGeocodedAddress } from '../../utils/locationPrivacy';
import { API_BASE_URL } from '../../utils/apiBase';
import { getStoredToken } from '../../utils/auth';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export default function Step2CameraLocation({
  isMapLoaded,
  evidenceData,
  locationData,
  category,
  onEvidenceChange,
  onLocationChange,
  onBack,
  onContinue,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const fileInputRef = useRef(null);
  const addressRequest = useRef(0);
  useEffect(() => () => { addressRequest.current += 1; }, []);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const [isAddressCopied, setIsAddressCopied] = useState(false);

  const displayStructuredAddress = locationData?.structuredAddress
    ? normalizeDisplayAddress(locationData.structuredAddress, locationData)
    : parseLegacyDisplayAddress(locationData?.address, locationData);
  const displayAddress = formatFullAddress(displayStructuredAddress);
  const handleCopyAddress = async () => {
    if (!displayAddress) return;
    try {
      await navigator.clipboard.writeText(displayAddress);
      setIsAddressCopied(true);
      setTimeout(() => setIsAddressCopied(false), 2000);
    } catch {
      setGeoError(t('locationPrivacy.copyFailed'));
    }
  };

  // Default coordinate anchor (North Caloocan City Hall)
  const currentLat = locationData?.lat ?? CALOOCAN_CENTERS.north.lat;
  const currentLng = locationData?.lng ?? CALOOCAN_CENTERS.north.lng;
  const hasCoordinates = Number.isFinite(locationData?.lat) && Number.isFinite(locationData?.lng);
  const isInsideJurisdiction = hasCoordinates && locationData?.isInCaloocan === true;
  const hasPhoto = Boolean(evidenceData?.previewUrl);

  // -------------------------------------------------------------------------
  // Geolocation & Reverse Geocoding
  // -------------------------------------------------------------------------
  const resolveAddressAndNotify = useCallback((lat, lng, accuracy = null, customAddress = '') => {
    const requestId = ++addressRequest.current;
    const inBounds = isInCaloocan(lat, lng);
    const brgyObj = findBarangayByCoordinates(lat, lng);
    const resolvedBrgy = brgyObj?.name || '';
    const fallback = customAddress ? parseLegacyDisplayAddress(customAddress) : parseGeocodedAddress([], lat, lng);
    // Commit GPS first. Address lookup never controls marker positioning/confirmation.
    onLocationChange(previous => ({
      ...previous, lat, lng, accuracy,
      address: formatFullAddress(fallback),
      structuredAddress: fallback,
      addressStatus: 'LOADING',
      barangay: resolvedBrgy,
      isInCaloocan: inBounds,
      confirmed: inBounds,
      source: customAddress ? 'manual-geocode' : 'device-gps',
      capturedAt: Date.now(),
    }));
    reverseGeocodeLocation(lat, lng).then(result => {
      if (requestId !== addressRequest.current) return;
      onLocationChange(previous => {
        if (previous.lat !== lat || previous.lng !== lng) return previous;
        return { ...previous, address: result.address, structuredAddress: result.structuredAddress, addressStatus: result.status };
      });
    });
  }, [onLocationChange]);

  const handleGeolocate = useCallback((isExplicit = false) => {
    if (!navigator.geolocation) {
      setGeoError(t('reportWizard.step2Location.unsupported', 'Location is not supported on this device.'));
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolveAddressAndNotify(latitude, longitude, accuracy);
        setIsLocating(false);
        setGeoError(null);
      },
      (error) => {
        console.warn('Geolocation capture failed:', error);
        setIsLocating(false);
        const key = error.code === 1 ? 'gpsDenied' : error.code === 2 ? 'gpsUnavailable' : error.code === 3 ? 'gpsTimeout' : 'gpsError';
        setGeoError(t(`locationPrivacy.${key}`));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [resolveAddressAndNotify, t]);

  useEffect(() => {
    if (!hasCoordinates || !locationData?.confirmed) {
      handleGeolocate(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Camera & Photo Handling
  // -------------------------------------------------------------------------
  const triggerAIAnalysis = async (file) => {
    onEvidenceChange(prev => ({
      ...prev,
      isAiScanning: true,
      analysisStatus: 'pending',
      aiCategorySuggestion: null,
      aiConfidence: null,
      isInappropriate: false,
      rejectionReason: '',
    }));

    try {
      const formData = new FormData();
      formData.append('image', file, file.name || 'evidence.jpg');
      if (category) {
        formData.append('description', `Selected category: ${category}`);
      }

      const token = getStoredToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/reports/analyze`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.is_inappropriate) {
          const reason = data.rejection_reason || "We couldn't clearly see an infrastructure issue. Please retake photo.";
          setPhotoError(reason);
          onEvidenceChange(prev => ({
            ...prev,
            isAiScanning: false,
            isInappropriate: true,
            rejectionReason: reason,
          }));
        } else {
          setPhotoError(null);
          onEvidenceChange(prev => ({
            ...prev,
            isAiScanning: false,
            analysisStatus: 'complete',
            aiCategorySuggestion: data.category || null,
            aiConfidence: typeof data.confidence === 'number' ? Math.round(data.confidence * 100) : null,
            autoDescription: data.auto_description || '',
            imageAnalysis: data.image_analysis || '',
            isInappropriate: false,
          }));
        }
      } else {
        onEvidenceChange(prev => ({ ...prev, isAiScanning: false, analysisStatus: 'failed' }));
      }
    } catch (err) {
      onEvidenceChange(prev => ({ ...prev, isAiScanning: false, analysisStatus: 'failed' }));
    }
  };

  const handleCameraPhotoCaptured = (capturedFile, aiData) => {
    setIsCameraModalOpen(false);
    if (!capturedFile) return;

    if (evidenceData?.previewUrl) {
      URL.revokeObjectURL(evidenceData.previewUrl);
    }

    const previewUrl = URL.createObjectURL(capturedFile);
    setPhotoError(null);

    onEvidenceChange({
      file: capturedFile,
      previewUrl,
      fileName: capturedFile.name || `photo_${Date.now()}.jpg`,
      fileSize: capturedFile.size || 0,
      mimeType: capturedFile.type || 'image/jpeg',
      isAiScanning: false,
      aiCategorySuggestion: aiData?.category || null,
      aiConfidence: aiData?.confidence ? Math.round(aiData.confidence * 100) : null,
      autoDescription: aiData?.auto_description || '',
      imageAnalysis: aiData?.image_analysis || '',
      isInappropriate: Boolean(aiData?.is_inappropriate),
      rejectionReason: aiData?.rejection_reason || '',
    });

    if (!aiData) triggerAIAnalysis(capturedFile);
    if (!hasCoordinates) handleGeolocate(true);
  };

  const handleFileProcess = (file) => {
    setPhotoError(null);
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setPhotoError(t('reportWizard.step3Evidence.fileTypeError', 'Please upload JPEG, PNG, or WebP.'));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setPhotoError('File size exceeds 10MB limit.');
      return;
    }

    if (evidenceData?.previewUrl) {
      URL.revokeObjectURL(evidenceData.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    onEvidenceChange({
      file,
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      isAiScanning: true,
      aiCategorySuggestion: null,
      aiConfidence: null,
      autoDescription: '',
      imageAnalysis: '',
      isInappropriate: false,
      rejectionReason: '',
    });

    triggerAIAnalysis(file);
    if (!hasCoordinates) handleGeolocate(true);
  };

  const handleRemovePhoto = () => {
    if (evidenceData?.previewUrl) {
      URL.revokeObjectURL(evidenceData.previewUrl);
    }
    onEvidenceChange({
      file: null,
      previewUrl: null,
      fileName: '',
      fileSize: 0,
      mimeType: '',
      isAiScanning: false,
      aiCategorySuggestion: null,
      aiConfidence: null,
      autoDescription: '',
      imageAnalysis: '',
      isInappropriate: false,
      rejectionReason: '',
    });
    setPhotoError(null);
  };

  const handleSimulateCapture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#ff6b00';
      ctx.fillRect(120, 120, 560, 360);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PULSO Field Photo Sample', 400, 290);
      ctx.font = '16px monospace';
      ctx.fillText(`GPS: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`, 400, 330);
    }
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `sample_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFileProcess(file);
      }
    }, 'image/jpeg');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canProceed = hasPhoto && !evidenceData?.isAiScanning && !evidenceData?.isInappropriate && hasCoordinates && isInsideJurisdiction;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      {/* ── Compact Header ── */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-[#ff8a3d]">
            {t('reportWizard.step2CameraLocation.badge', 'STEP 1 OF 5 / EVIDENCE & LOCATION')}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          {t('reportWizard.step2CameraLocation.title', 'Take photo and auto-locate')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('reportWizard.step2CameraLocation.subtitle', 'Capture a photo with your camera; verified GPS location is tagged automatically.')}
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(',')}
        onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
        className="hidden"
        aria-hidden="true"
      />

      {/* ── Main Vertical Stack (Exact match to Quick Report reference) ── */}
      <div className="space-y-3.5">
        {/* ── 1. Location Card (Matches reference image) ── */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/60 rounded-2xl transition-all shadow-2xs">
          <div className="flex items-start gap-3">
            {/* MapPin Badge Icon */}
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-[#ff6b00] border border-orange-500/25 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={20} className="text-[#ff6b00]" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Address Text + Copy Button */}
              <div className="flex items-start justify-between gap-2">
                <LocationAddressPanel address={displayStructuredAddress} coordinates={locationData} showCoordinates={false} status={locationData?.addressStatus} loading={isLocating || locationData?.addressStatus === 'LOADING'} />
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  disabled={!displayAddress}
                  className="min-h-11 min-w-11 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg focus-visible:outline-3 focus-visible:outline-blue-600 transition-colors cursor-pointer shrink-0"
                  title={isAddressCopied ? t('locationPrivacy.copied') : t('locationPrivacy.copy')}
                  aria-label={t('locationPrivacy.copy')}
                >
                  {isAddressCopied ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              {/* Location Badges & Accuracy Indicator (Single line) */}
              <LocationCoordinates coordinates={locationData}>
                {/* Accuracy Pill matching reference */}
                {locationData?.accuracy && locationData.accuracy > 25 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/50">
                    <Info size={13} className="text-amber-500 shrink-0" />
                    <span>{t('locationPrivacy.approximateAccuracy', { accuracy: Math.round(locationData.accuracy) })}</span>
                  </span>
                ) : hasCoordinates ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span>{locationData?.accuracy ? t('locationPrivacy.accurateAccuracy', { accuracy: Math.round(locationData.accuracy) }) : t('locationPrivacy.gpsSelected')}</span>
                  </span>
                ) : null}

                {/* Jurisdiction Check */}
                {hasCoordinates && !isInsideJurisdiction && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/50">
                    <AlertTriangle size={13} />
                    <span>Outside Caloocan City</span>
                  </span>
                )}

                {/* Resync GPS Icon Button */}
                <button
                  type="button"
                  onClick={() => handleGeolocate(true)}
                  disabled={isLocating}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer shrink-0 ml-auto active:scale-95 disabled:opacity-50"
                  title="Resync GPS"
                  aria-label="Resync GPS"
                >
                  <RotateCcw size={13} className={isLocating ? 'animate-spin text-[#ff6b00]' : ''} />
                </button>
              </LocationCoordinates>
            </div>
          </div>
        </div>

        {/* ── 2. Photo / Camera Box (Exact match to reference) ── */}
        {!hasPhoto ? (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 sm:p-7 bg-slate-50/50 dark:bg-slate-950/40 text-center flex flex-col items-center justify-center gap-3 transition-all">
            <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Camera size={26} strokeWidth={2} />
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Take a photo of the problem
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Capture a clear photo. Location is added only when you select it.
              </p>
            </div>

            {/* Solid Orange Primary Button (crisp white text and icon) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full max-w-xs mt-1">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="w-full h-12 min-h-[48px] bg-[#ff6b00] hover:bg-[#e05e00] text-white hover:text-white font-bold px-6 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] group"
              >
                <Camera size={18} strokeWidth={2.4} className="text-white group-hover:text-white" />
                <span className="text-white group-hover:text-white">Open Camera</span>
              </button>
            </div>

            {/* Links row: Sample photo for testing */}
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
              <button
                type="button"
                onClick={handleSimulateCapture}
                className="hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
              >
                Use sample field photo (testing)
              </button>
            </div>
          </div>
        ) : (
          /* Attached Photo Card */
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                <img
                  src={evidenceData.previewUrl}
                  alt={t('reportWizard.step3Evidence.previewAlt', 'Captured preview')}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} />
                  <span>Photo attached</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {evidenceData.fileName || 'evidence_photo.jpg'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatFileSize(evidenceData.fileSize)} · {evidenceData.mimeType || 'image/jpeg'}
                </p>
              </div>
            </div>

            {/* AI scanning banner */}
            {evidenceData.isAiScanning && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-xs text-orange-800 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60">
                <Loader2 size={13} className="animate-spin text-orange-600" />
                <span>AI verifying infrastructure evidence...</span>
              </div>
            )}

            {photoError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                {photoError}
              </div>
            )}

            {evidenceData.aiCategorySuggestion && evidenceData.aiCategorySuggestion !== category && (
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-xs text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                <Sparkles size={14} className="text-blue-600 shrink-0" />
                <span>AI suggests category: <strong>{evidenceData.aiCategorySuggestion}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Camera size={14} />
                <span>Retake photo</span>
              </button>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="h-9 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X size={14} />
                <span>Remove photo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Compact Card Footer ── */}
      <WizardCardFooter
        onBack={onBack}
        onContinue={onContinue}
        isContinueDisabled={!canProceed}
        compact={true}
        continueLabel={t('reportWizard.step2CameraLocation.continueToCategory', 'Continue to category')}
        noteText={
          !hasPhoto
            ? t('reportWizard.step2CameraLocation.takePhotoNote', 'Take a photo to continue.')
            : !isInsideJurisdiction
            ? 'Must be within Caloocan City.'
            : t('reportWizard.shell.notSubmittedYet', 'Your report is not submitted until confirmed in Review.')
        }
      />

      {/* ── Live In-App Camera Viewfinder Modal ── */}
      <IDCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraPhotoCaptured}
        side="ISSUE"
        theme={theme}
        title="Civic Evidence Camera"
        subtitle="Capture photo with auto-location watermark"
        metadata={{
          location: locationData,
          reportLocation: locationData,
          locationAddress: locationData?.address,
          user: null,
        }}
        onPickFromGallery={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
