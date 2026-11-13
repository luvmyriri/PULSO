import { isReportPhotoRestricted } from '../../utils/reportScreening';
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera, UploadCloud, X, RefreshCw, Maximize2,
  Sparkles, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, Loader2, Check
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../utils/apiBase';
import { getStoredToken } from '../../utils/auth';
import { watermarkEvidenceFile } from '../../utils/watermark';
import IDCameraModal from '../IDCameraModal';
import PulsoPulseLine from '../common/PulsoPulseLine';
import WizardCardFooter from './WizardCardFooter';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export default function Step3EvidenceUpload({
  evidenceData,
  category,
  locationData,
  onCategoryChange,
  onEvidenceChange,
  onBack,
  onContinue,
  stepErrors = [],
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const fileInputRef = useRef(null);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isFullscreenPhotoOpen, setIsFullscreenPhotoOpen] = useState(false);
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [dismissedAiSuggestion, setDismissedAiSuggestion] = useState(false);

  const hasPhoto = Boolean(evidenceData?.previewUrl || evidenceData?.file);
  const photoUrl = evidenceData?.previewUrl || '';
  const isScanning = Boolean(evidenceData?.isAiScanning);
  const isRejected = Boolean(evidenceData?.isInappropriate);
  const rejectionReason = evidenceData?.rejectionReason || '';

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Run server AI category/hazard analysis
  const runAiAnalysis = async (fileToScan) => {
    try {
      const formData = new FormData();
      formData.append('image', fileToScan, fileToScan.name || 'evidence.jpg');
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
        const isInappropriate = isReportPhotoRestricted(data);
        const reason = isInappropriate
          ? (data.rejection_reason || t('reportWizard.validation.evidence.rejected', 'This looks like a personal photo. Please take a clear photo of the problem.'))
          : '';

        onEvidenceChange({
          ...evidenceData,
          file: fileToScan,
          fileName: fileToScan.name,
          fileSize: fileToScan.size,
          mimeType: fileToScan.type,
          isAiScanning: false,
          isInappropriate,
          rejectionReason: reason,
          aiCategorySuggestion: data.category || null,
          autoDescription: data.auto_description || '',
          urgency: data.urgency ? data.urgency.toLowerCase() : null,
        });
      } else {
        // Fallback gracefully on AI error
        onEvidenceChange({
          ...evidenceData,
          file: fileToScan,
          fileName: fileToScan.name,
          fileSize: fileToScan.size,
          mimeType: fileToScan.type,
          isAiScanning: false,
          isInappropriate: false,
        });
      }
    } catch {
      onEvidenceChange({
        ...evidenceData,
        file: fileToScan,
        fileName: fileToScan.name,
        fileSize: fileToScan.size,
        mimeType: fileToScan.type,
        isAiScanning: false,
        isInappropriate: false,
      });
    }
  };

  // 1. Photo Captured from In-App Camera (already watermarked by IDCameraModal)
  const handleCameraPhotoCaptured = (capturedFile, aiData) => {
    setIsCameraModalOpen(false);
    if (!capturedFile) return;

    setFileError(null);
    const objectUrl = URL.createObjectURL(capturedFile);

    const isAiRejected = isReportPhotoRestricted(aiData);
    const aiReason = isAiRejected
      ? (aiData?.rejection_reason || t('reportWizard.validation.evidence.rejected', 'This looks like a personal photo. Please take a clear photo of the problem.'))
      : '';

    onEvidenceChange({
      file: capturedFile,
      previewUrl: objectUrl,
      fileName: capturedFile.name || 'field_evidence.jpg',
      fileSize: capturedFile.size,
      mimeType: capturedFile.type || 'image/jpeg',
      isAiScanning: !aiData,
      isInappropriate: isAiRejected,
      rejectionReason: aiReason,
      aiCategorySuggestion: aiData?.category || null,
      autoDescription: aiData?.auto_description || '',
      urgency: aiData?.urgency ? aiData.urgency.toLowerCase() : null,
    });

    if (!aiData) {
      runAiAnalysis(capturedFile);
    }
  };

  // 2. Photo Chosen from Device Storage -> apply watermarking
  const handleFileProcess = async (file) => {
    setFileError(null);
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setFileError(t('reportWizard.validation.evidence.fileType', "This file type isn't supported. Please use a JPG, PNG or WebP photo."));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(t('reportWizard.validation.evidence.fileSize', 'This photo is too large. Please take a new one.'));
      return;
    }

    setIsWatermarking(true);
    try {
      // Burn standardized PULSO Evidence Watermark onto uploaded file
      const watermarked = await watermarkEvidenceFile(file, {
        location: locationData,
        reportLocation: locationData,
        locationAddress: locationData?.address,
        timestamp: new Date().toISOString(),
      });

      const objectUrl = URL.createObjectURL(watermarked);

      onEvidenceChange({
        file: watermarked,
        previewUrl: objectUrl,
        fileName: watermarked.name || file.name,
        fileSize: watermarked.size,
        mimeType: watermarked.type || 'image/jpeg',
        isAiScanning: true,
        isInappropriate: false,
        rejectionReason: '',
        aiCategorySuggestion: null,
        autoDescription: '',
        urgency: null,
      });

      runAiAnalysis(watermarked);
    } catch (err) {
      console.warn('Watermark generation error, using original file:', err);
      const objectUrl = URL.createObjectURL(file);
      onEvidenceChange({
        file,
        previewUrl: objectUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        isAiScanning: true,
        isInappropriate: false,
        rejectionReason: '',
        aiCategorySuggestion: null,
        autoDescription: '',
        urgency: null,
      });
      runAiAnalysis(file);
    } finally {
      setIsWatermarking(false);
    }
  };

  // 3. Remove Photo
  const handleRemovePhoto = () => {
    onEvidenceChange({
      file: null,
      previewUrl: null,
      fileName: '',
      fileSize: 0,
      mimeType: '',
      isAiScanning: false,
      isInappropriate: false,
      rejectionReason: '',
      aiCategorySuggestion: null,
      autoDescription: '',
      urgency: null,
    });
    setFileError(null);
  };

  // 4. Retake Photo -> Re-open in-app camera
  const handleTriggerCamera = () => {
    setIsCameraModalOpen(true);
  };

  // 5. Simulated Field Photo for desktop testing
  const handleSimulateCameraCapture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 1280, 960);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 480, 1280, 480);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 12;
      ctx.setLineDash([40, 30]);
      ctx.beginPath();
      ctx.moveTo(0, 720);
      ctx.lineTo(1280, 720);
      ctx.stroke();

      // Pothole texture
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(640, 680, 180, 90, 0, 0, 2 * Math.PI);
      ctx.fill();

      canvas.toBlob((blob) => {
        if (blob) {
          const simFile = new File([blob], 'field_pothole_sample.jpg', { type: 'image/jpeg' });
          handleFileProcess(simFile);
        }
      }, 'image/jpeg', 0.92);
    }
  };

  const canContinue = hasPhoto && !isScanning && !isRejected && !isWatermarking;
  const activeAiSuggestion = evidenceData?.aiCategorySuggestion && evidenceData.aiCategorySuggestion !== category;

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Header Title & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.step3Evidence.title', 'Take a photo of the problem')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t('reportWizard.step3Evidence.subtitle', 'Capture a clear photo. Location & timestamp watermark will be applied automatically.')}
          </p>
        </div>

        {/* Global/File Error Banner */}
        {(fileError || stepErrors.some(e => e.field === 'photos')) && (
          <div role="alert" className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-2 animate-fadeIn">
            <AlertCircle size={18} className="text-red-500 shrink-0" aria-hidden="true" />
            <span>{fileError || stepErrors.find(e => e.field === 'photos')?.message}</span>
          </div>
        )}

        {/* Soft AI Category Suggestion Banner */}
        {activeAiSuggestion && !dismissedAiSuggestion && (
          <aside aria-label="AI Category Suggestion" className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                <Sparkles size={18} />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                {t('reportWizard.validation.evidence.suggestCategory', 'This looks like {{category}}. Change category?', {
                  category: evidenceData.aiCategorySuggestion,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onCategoryChange) onCategoryChange(evidenceData.aiCategorySuggestion);
                  setDismissedAiSuggestion(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {t('reportWizard.validation.evidence.changeCategory', 'Change')}
              </button>
              <button
                type="button"
                onClick={() => setDismissedAiSuggestion(true)}
                className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs font-bold hover:underline cursor-pointer"
              >
                {t('reportWizard.validation.evidence.keepMine', 'Keep mine')}
              </button>
            </div>
          </aside>
        )}

        {/* Hidden File Input for Device Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
            e.target.value = '';
          }}
        />

        {/* ── RESIDENT FORMAT EVIDENCE PHOTO AREA ── */}
        {!hasPhoto ? (
          /* Empty State: Matching Resident In-App Camera Prompt */
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Camera size={32} strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="space-y-1">
              <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Take a photo of the problem
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Capture a clear field photo. GPS coordinates, address and timestamp will be burned as an official watermark.
              </p>
            </div>

            {/* Primary Action Button: Open Camera */}
            <div className="flex flex-col items-center gap-3 w-full max-w-xs pt-1">
              <button
                type="button"
                onClick={handleTriggerCamera}
                disabled={isWatermarking}
                className="w-full h-12 min-h-[48px] bg-[#ff6b00] hover:bg-[#e05e00] text-white font-bold px-6 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                {isWatermarking ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span>Applying Watermark...</span>
                  </>
                ) : (
                  <>
                    <Camera size={18} strokeWidth={2.5} />
                    <span>Open Camera</span>
                  </>
                )}
              </button>

              {/* Secondary Upload Link */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isWatermarking}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer transition-colors"
              >
                Or upload existing photo from device
              </button>

              {/* Sample Field Photo for Desktop/Testing */}
              <button
                type="button"
                onClick={handleSimulateCameraCapture}
                disabled={isWatermarking}
                className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
              >
                Use sample field photo (testing)
              </button>
            </div>
          </div>
        ) : (
          /* Captured Photo State: Watermarked Preview + Retake Controls */
          <div className="space-y-4">
            {/* Real photo container with aspect ratio containment */}
            <div
              onClick={() => setIsFullscreenPhotoOpen(true)}
              className="w-full max-h-[420px] rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800 bg-slate-950 cursor-pointer group flex items-center justify-center"
              title="Click to view full photo"
            >
              <img
                src={photoUrl}
                alt="Captured field evidence with watermark"
                className="w-full h-auto max-h-[420px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
              />

              {/* Watermark Tag Badge (Top Left) */}
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black/75 text-emerald-400 backdrop-blur-md border border-emerald-500/30 shadow-sm">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Watermarked · GPS & Timestamp</span>
                </span>
              </div>

              {/* Remove Photo (X Button Top Right) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePhoto();
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/75 hover:bg-black text-white backdrop-blur-md flex items-center justify-center transition-all shadow-md cursor-pointer border border-white/20 active:scale-90 z-10"
                title="Remove photo"
                aria-label="Remove photo"
              >
                <X size={16} />
              </button>

              {/* Full Photo Modal Button (Bottom Right) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreenPhotoOpen(true);
                }}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-white/15 z-10"
                title="View full photo"
                aria-label="View full photo"
              >
                <Maximize2 size={13} />
                <span>Full Photo</span>
              </button>
            </div>

            {/* Retake Control & Status Card */}
            <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Check size={18} strokeWidth={3} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Photo captured
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {evidenceData?.fileName} · {formatFileSize(evidenceData?.fileSize)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerCamera}
                className="h-9 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RefreshCw size={13} />
                <span>Retake</span>
              </button>
            </div>

            {/* Vision Eye AI Scanning Indicator with Pulso Pulse Line */}
            {isScanning && (
              <div className="p-4 rounded-2xl bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 space-y-2 animate-fadeIn">
                <PulsoPulseLine height={16} color="#ff6b00" />
                <div className="flex items-center justify-between text-xs text-orange-600 dark:text-orange-400 font-bold">
                  <span>Vision Eye AI</span>
                  <span>Checking your photo...</span>
                </div>
              </div>
            )}

            {/* Inappropriate Photo Rejection Alert */}
            {isRejected && (
              <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <AlertTriangle size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                      Photo Verification Notice
                    </p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                      {rejectionReason}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleTriggerCamera}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pinned Card Footer */}
      <div>
        {!canContinue && (
          <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-2 text-right">
            {isScanning
              ? t('reportWizard.validation.evidence.checking', 'Checking your photo...')
              : isWatermarking
              ? 'Applying watermark...'
              : t('reportWizard.validation.evidence.required', 'Take at least one photo to continue.')}
          </p>
        )}
        <WizardCardFooter
          onBack={onBack}
          canBack={true}
          onContinue={onContinue}
          isContinueDisabled={!canContinue}
        />
      </div>

      {/* ── LIVE IN-APP CAMERA MODAL ── */}
      <IDCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraPhotoCaptured}
        side="ISSUE"
        theme={theme}
        title="Civic Evidence Camera"
        subtitle="Capture real-time field photo with GPS & timestamp watermark"
        metadata={{
          location: locationData,
          reportLocation: locationData,
          structuredAddress: locationData?.structuredAddress || null,
          locationAddress: locationData?.address,
        }}
      />

      {/* ── FULLSCREEN PHOTO LIGHTBOX VIEWER ── */}
      {isFullscreenPhotoOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => setIsFullscreenPhotoOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsFullscreenPhotoOpen(false)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20 z-10"
            title="Close viewer"
            aria-label="Close viewer"
          >
            <X size={20} />
          </button>
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center">
            <img
              src={photoUrl}
              alt="Full watermarked evidence"
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
