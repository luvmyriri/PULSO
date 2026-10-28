import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UploadCloud, X, RefreshCw,
  Sparkles, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, Camera
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';
import { getStoredToken } from '../../utils/auth';
import PulsoPulseLine from '../common/PulsoPulseLine';
import WizardCardFooter from './WizardCardFooter';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_PHOTOS = 5;

export default function Step3EvidenceUpload({ 
  evidenceData, 
  category, 
  onCategoryChange,
  onEvidenceChange, 
  onBack, 
  onContinue,
  stepErrors = [],
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [dismissedAiSuggestion, setDismissedAiSuggestion] = useState(false);

  // Normalize photos array
  const rawPhotos = Array.isArray(evidenceData?.photos) 
    ? evidenceData.photos 
    : (evidenceData?.file ? [{
        file: evidenceData.file,
        previewUrl: evidenceData.previewUrl,
        fileName: evidenceData.fileName,
        fileSize: evidenceData.fileSize,
        mimeType: evidenceData.mimeType,
        isAiScanning: evidenceData.isAiScanning,
        isInappropriate: evidenceData.isInappropriate,
        rejectionReason: evidenceData.rejectionReason,
        aiCategorySuggestion: evidenceData.aiCategorySuggestion,
        autoDescription: evidenceData.autoDescription,
        urgency: evidenceData.urgency,
      }] : []);

  const validPhotos = rawPhotos.filter(p => !p.isInappropriate && !p.isAiScanning);
  const photoCount = rawPhotos.length;
  const isAnyScanning = rawPhotos.some(p => p.isAiScanning);
  const canContinue = validPhotos.length >= 1 && !isAnyScanning;

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const syncEvidenceState = (newPhotos) => {
    const primary = newPhotos[0] || null;
    onEvidenceChange({
      photos: newPhotos,
      file: primary?.file || null,
      previewUrl: primary?.previewUrl || null,
      fileName: primary?.fileName || '',
      fileSize: primary?.fileSize || 0,
      mimeType: primary?.mimeType || '',
      isAiScanning: newPhotos.some(p => p.isAiScanning),
      isInappropriate: primary?.isInappropriate || false,
      rejectionReason: primary?.rejectionReason || '',
      aiCategorySuggestion: primary?.aiCategorySuggestion || null,
      autoDescription: primary?.autoDescription || '',
      urgency: primary?.urgency || null,
    });
  };

  const handleFileProcess = async (file) => {
    setFileError(null);
    if (!file) return;

    if (photoCount >= MAX_PHOTOS) {
      setFileError(t('reportWizard.validation.evidence.tooMany', 'You can upload up to 5 photos.'));
      return;
    }

    // 1. Validate MIME format
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setFileError(t('reportWizard.validation.evidence.fileType', "This file type isn't supported. Please use a JPG, PNG or WebP photo."));
      return;
    }

    // 2. Validate size (10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(t('reportWizard.validation.evidence.fileSize', 'This photo is too large. Please take a new one.'));
      return;
    }

    // 3. Duplicate check by fingerprint
    const isDuplicate = rawPhotos.some(p => 
      p.fileName === file.name && p.fileSize === file.size
    );
    if (isDuplicate) {
      setFileError(t('reportWizard.validation.evidence.duplicate', 'You already added this photo.'));
      return;
    }

    // Generate local preview URL
    const previewUrl = URL.createObjectURL(file);
    const photoId = `${Date.now()}-${Math.random()}`;

    const newPhotoItem = {
      id: photoId,
      file,
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      isAiScanning: true,
      isInappropriate: false,
      rejectionReason: '',
      aiCategorySuggestion: null,
      autoDescription: '',
      urgency: null,
    };

    const updatedList = [...rawPhotos, newPhotoItem];
    syncEvidenceState(updatedList);

    // Run AI scanning
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
        const isInappropriate = Boolean(data.is_inappropriate);
        const rejectionReason = isInappropriate 
          ? (data.rejection_reason || t('reportWizard.validation.evidence.rejected', 'This looks like a personal photo. Please take a clear photo of the problem.'))
          : '';

        const finishedList = updatedList.map(p => {
          if (p.id === photoId) {
            return {
              ...p,
              isAiScanning: false,
              isInappropriate,
              rejectionReason,
              aiCategorySuggestion: data.category || null,
              autoDescription: data.auto_description || '',
              urgency: data.urgency ? data.urgency.toLowerCase() : null,
            };
          }
          return p;
        });
        syncEvidenceState(finishedList);
      } else {
        // AI service unavailable; allow photo through gracefully
        const fallbackList = updatedList.map(p => 
          p.id === photoId ? { ...p, isAiScanning: false, isInappropriate: false } : p
        );
        syncEvidenceState(fallbackList);
      }
    } catch {
      const fallbackList = updatedList.map(p => 
        p.id === photoId ? { ...p, isAiScanning: false, isInappropriate: false } : p
      );
      syncEvidenceState(fallbackList);
    }
  };

  const handleRemovePhoto = (idx) => {
    const updated = rawPhotos.filter((_, i) => i !== idx);
    syncEvidenceState(updated);
    setFileError(null);
  };

  const handleRetake = (idx) => {
    handleRemovePhoto(idx);
    fileInputRef.current?.click();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const activeAiSuggestion = rawPhotos.find(p => p.aiCategorySuggestion && p.aiCategorySuggestion !== category);

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Title & Photo Counter */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('reportWizard.step3Evidence.title', 'Show what happened')}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {t('reportWizard.step3Evidence.subtitle', 'Add photos so the team can review the situation.')}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full w-fit">
            {t('reportWizard.validation.evidence.countLabel', '{{current}} of {{max}} photos', {
              current: photoCount,
              max: MAX_PHOTOS,
            })}
          </span>
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
                  category: activeAiSuggestion.aiCategorySuggestion,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onCategoryChange) onCategoryChange(activeAiSuggestion.aiCategorySuggestion);
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

        {/* Hidden File Inputs */}
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
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
            e.target.value = '';
          }}
        />

        {/* Photos Grid & Upload Dropzone */}
        <div className="space-y-4">
          {rawPhotos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rawPhotos.map((photo, idx) => {
                const isRejected = photo.isInappropriate;
                const isScanning = photo.isAiScanning;

                return (
                  <div
                    key={photo.id || idx}
                    className={`rounded-2xl border p-4 transition-all duration-200 ${
                      isRejected
                        ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20 dark:bg-red-950/20'
                        : isScanning
                        ? 'border-orange-300 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                        <img
                          src={photo.previewUrl}
                          alt="Evidence preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {photo.fileName}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            aria-label="Remove photo"
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatFileSize(photo.fileSize)}
                        </p>

                        {/* Checking / Scanning State with Pulso Pulse Line */}
                        {isScanning && (
                          <div className="space-y-1 pt-1">
                            <PulsoPulseLine height={14} color="#ff6b00" />
                            <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                              {t('reportWizard.validation.evidence.checking', 'Checking your photo...')}
                            </p>
                          </div>
                        )}

                        {/* Rejected Alert & Retake Button */}
                        {isRejected && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[11px] font-bold text-red-600 dark:text-red-400 leading-snug">
                              {photo.rejectionReason}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRetake(idx)}
                                className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:underline"
                              >
                                Retake
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="text-[11px] font-semibold text-slate-400 hover:text-red-500 underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload Drop Area if under MAX_PHOTOS */}
          {photoCount < MAX_PHOTOS && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer ${
                dragActive
                  ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3 border border-orange-200/60 dark:border-orange-800/50">
                <UploadCloud size={24} strokeWidth={2} aria-hidden="true" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
                {dragActive
                  ? t('reportWizard.step3Evidence.dropHere', 'Drop your photos here')
                  : t('reportWizard.step3Evidence.uploadTitle', 'Add photos to your report')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {t('reportWizard.step3Evidence.uploadLimits', 'JPG, PNG or WebP · Up to 10 MB each')}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <UploadCloud size={14} />
                  <span>Choose Photo</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <Camera size={14} />
                  <span>Take Photo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Footer: Disabled when 0 photos with reason line above it */}
      <div>
        {!canContinue && (
          <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-2 text-right">
            {isAnyScanning 
              ? t('reportWizard.validation.evidence.checking', 'Checking your photo...')
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
    </div>
  );
}
