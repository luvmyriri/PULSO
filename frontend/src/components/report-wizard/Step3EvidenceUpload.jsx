import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UploadCloud, X, RefreshCw,
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Image as ImageIcon
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';
import { getStoredToken } from '../../utils/auth';
import WizardCardFooter from './WizardCardFooter';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export default function Step3EvidenceUpload({ 
  evidenceData, 
  category, 
  onEvidenceChange, 
  onBack, 
  onContinue 
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleFileProcess = async (file) => {
    setErrorMessage(null);
    if (!file) return;

    // Validate MIME format
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage(t('reportWizard.step3Evidence.fileTypeError', 'Unsupported file format. Please upload JPEG, PNG, or WebP.'));
      return;
    }

    // Validate size (10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(t('reportWizard.step3Evidence.fileSizeError', 'File size exceeds 10MB limit (Selected: {{size}}MB).', { size: sizeMB }));
      return;
    }

    const fileToUse = file;

    // Generate local preview URL
    const previewUrl = URL.createObjectURL(fileToUse);

    // Initial state with scanning active
    onEvidenceChange({
      file: fileToUse,
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      isAiScanning: true,
      analysisStatus: 'pending',
      aiCategorySuggestion: null,
      aiConfidence: null,
      autoDescription: '',
      imageAnalysis: '',
      isInappropriate: false,
      rejectionReason: '',
    });

    try {
      const formData = new FormData();
      formData.append('image', file, file.name || 'evidence.jpg');
      if (category) {
        formData.append('description', `Selected category: ${category}`);
      }

      const token = getStoredToken();
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/reports/analyze`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.is_inappropriate) {
          const reason = data.rejection_reason || "We couldn't clearly see a city issue in this photo. Please upload a clear photo showing the actual problem (such as a pothole, broken streetlight, or water leak).";
          setErrorMessage(reason);
          onEvidenceChange({
            file,
            previewUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            isAiScanning: false,
            aiCategorySuggestion: null,
            aiConfidence: null,
            autoDescription: '',
            imageAnalysis: data.image_analysis || '',
            isInappropriate: true,
            rejectionReason: reason,
          });
          return;
        }

        const detectedCategory = data.analysis_status === 'disabled' || data.analysis_status === 'unavailable' ? null : data.category || null;

        onEvidenceChange({
          file,
          previewUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          isAiScanning: false,
          analysisStatus: data.analysis_status || 'suggested',
          aiCategorySuggestion: detectedCategory,
          aiConfidence: null,
          autoDescription: data.auto_description || '',
          imageAnalysis: data.image_analysis || '',
          smartSummary: data.smart_summary || '',
          urgency: data.urgency ? data.urgency.toLowerCase() : null,
          isInappropriate: false,
          rejectionReason: '',
        });
      } else {
        // Fallback gracefully on network error so user is not blocked
        onEvidenceChange({
          file,
          previewUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          isAiScanning: false,
          analysisStatus: 'unavailable',
          aiCategorySuggestion: null,
          aiConfidence: null,
          autoDescription: '',
          imageAnalysis: '',
          isInappropriate: false,
          rejectionReason: '',
        });
      }
    } catch (err) {
      console.warn('AI Evidence Scan request error, proceeding with local fallback:', err);
      onEvidenceChange({
        file,
        previewUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        isAiScanning: false,
        analysisStatus: 'unavailable',
        aiCategorySuggestion: null,
        aiConfidence: null,
        autoDescription: '',
        imageAnalysis: '',
        isInappropriate: false,
        rejectionReason: '',
      });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
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
      aiCategorySuggestion: null,
      aiConfidence: null,
      isAiScanning: false,
    });
    setErrorMessage(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasPhoto = Boolean(evidenceData?.previewUrl);

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.step3Evidence.title', 'Add photos of the concern')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t('reportWizard.step3Evidence.subtitle', 'Clear photos help the team understand your report.')}
          </p>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
          className="hidden"
          aria-hidden="true"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
          className="hidden"
          aria-hidden="true"
        />

        {/* Upload Area / Photo Tile (Full Width) */}
        <div className="w-full flex flex-col justify-center">
            {!hasPhoto ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full min-h-[300px] rounded-3xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer ${
                  dragActive
                    ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                }`}
              >
                {/* Orange Icon Tile */}
                <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 border border-orange-200/60 dark:border-orange-800/50">
                  <UploadCloud size={28} strokeWidth={2} aria-hidden="true" />
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {dragActive
                    ? t('reportWizard.step3Evidence.dropHere', 'Drop your photos here')
                    : t('reportWizard.step3Evidence.uploadTitle', 'Add photos to your report')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t('reportWizard.step3Evidence.uploadSubtitle', 'Drag and drop, or select files from your device')}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-5">
                  {t('reportWizard.step3Evidence.uploadLimits', 'JPG, PNG or WebP · Up to 10 MB')}
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="min-h-[48px] px-6 rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] active:bg-[#c2410c] text-white font-bold text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <span>{t('reportWizard.step3Evidence.choosePhotos', 'Choose Photos')}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              /* Uploaded Photo Tile Preview */
              <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
                <div className="flex items-start gap-4">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                    <img
                      src={evidenceData.previewUrl}
                      alt="Uploaded evidence"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {evidenceData.fileName || 'evidence_photo.jpg'}
                      </p>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        aria-label="Remove photo"
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(evidenceData.fileSize)}
                    </p>

                    {/* Watermark & AI tags */}
                    <div className="pt-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                        <CheckCircle2 size={12} />
                        <span>Watermarked</span>
                      </span>
                      {evidenceData.aiCategorySuggestion && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-[11px] font-semibold">
                          <Sparkles size={12} />
                          <span>AI: {evidenceData.aiCategorySuggestion}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <RefreshCw size={13} />
                    <span>Replace photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                <AlertTriangle size={14} aria-hidden="true" />
                <span>{errorMessage}</span>
              </p>
            )}
          </div>

          {!evidenceData.isAiScanning && ['disabled','unavailable'].includes(evidenceData.analysisStatus) && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{t('reportWizard.step3Evidence.aiManualReview','You can continue with your selected category. Staff will review your report.')}</p>}
          {/* ── ADVISORY AI RESULT CARD ─────────────────────────────────────── */}
          {!evidenceData.isAiScanning && evidenceData.aiCategorySuggestion && !evidenceData.isInappropriate && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800/60 shadow-sm flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                <Sparkles size={20} />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {t('reportWizard.step3Evidence.aiCategorySuggested', 'Suggested category: {{category}}', {
                      category: evidenceData.aiCategorySuggestion,
                    })}
                  </span>
                  {evidenceData.urgency && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-200 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200">
                      {evidenceData.urgency} urgency
                    </span>
                  )}
                </div>
                {evidenceData.autoDescription && (
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-orange-100 dark:border-orange-900/40 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-orange-600 dark:text-orange-400">AI Observation: </span>
                    <span className="italic">{evidenceData.autoDescription}</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('reportWizard.step3Evidence.aiSuggestionReview', 'Review this suggestion before continuing. Staff will assess your report.')}
                </p>
              </div>
            </div>
          )}
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
