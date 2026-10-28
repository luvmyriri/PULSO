import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MapPin, Edit2, ShieldCheck, AlertCircle, ChevronDown, ChevronUp, AlertTriangle, PhoneCall
} from 'lucide-react';
import PulsoPulseLine from '../common/PulsoPulseLine';
import WizardCardFooter from './WizardCardFooter';

export default function Step6ReviewConsent({
  formData,
  isSubmitting,
  onJumpToStep,
  onConsentChange,
  onBack,
  onSubmit,
  reviewErrors = [],
  submissionError = null,
}) {
  const { t } = useTranslation();
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const consentAccepted = formData?.consentAccepted || false;
  const { category, location, evidence, details, contact } = formData || {};

  const descriptionText = details?.description || '';
  const isLongDescription = descriptionText.length > 200;
  const displayedDescription = isLongDescription && !isDescExpanded
    ? `${descriptionText.slice(0, 200)}...`
    : descriptionText;

  const severityLabel = details?.urgency === 'low'
    ? t('reportWizard.step4Details.severityMinor', 'Minor')
    : details?.urgency === 'high' || details?.urgency === 'critical'
    ? t('reportWizard.step4Details.severityHigh', 'High')
    : t('reportWizard.step4Details.severityModerate', 'Moderate');

  const photosList = Array.isArray(evidence?.photos) 
    ? evidence.photos 
    : (evidence?.previewUrl ? [evidence] : []);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasReviewErrors = reviewErrors.length > 0;

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.step6Review.title', 'Review your report')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t('reportWizard.step6Review.subtitle', 'Check the details before sending your report.')}
          </p>
        </div>

        {/* Global Submission Error Callout */}
        {submissionError && (
          <aside aria-label="Submission error" className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-sm text-red-800 dark:text-red-300 shadow-xs flex items-start gap-3 animate-fadeIn">
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Submission Notice:</p>
              <p>{submissionError}</p>
            </div>
          </aside>
        )}

        {/* Pre-Submit Validation Summary Box with Jump Links */}
        {hasReviewErrors && (
          <aside
            aria-label="Action required summary"
            className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 shadow-sm animate-fadeIn space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <h2 className="text-sm sm:text-base font-extrabold text-amber-950 dark:text-amber-200">
                {t('reportWizard.validation.fixCount', 'Please fix {{count}} things before sending', {
                  count: reviewErrors.length,
                })}
              </h2>
            </div>
            <ul className="space-y-2 pl-7 list-disc text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium">
              {reviewErrors.map((err, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => onJumpToStep(err.step)}
                    className="text-left font-bold text-orange-700 dark:text-orange-400 hover:underline cursor-pointer"
                  >
                    Step {err.step}: {err.message}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Two Columns: Report Summary Card & Previews */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Report Summary Docket */}
          <div className="lg:col-span-7 xl:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('reportWizard.step6Review.summaryTitle', 'Report summary')}
            </h2>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {/* Category Row */}
              <div className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t('reportWizard.step6Review.rowCategory', 'CATEGORY')}
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {category || 'Not selected'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onJumpToStep(1)}
                  className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} aria-hidden="true" />
                  <span>{t('reportWizard.step6Review.edit', 'Edit')}</span>
                </button>
              </div>

              {/* Location Row */}
              <div className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t('reportWizard.step6Review.rowLocation', 'LOCATION')}
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white leading-snug">
                    {location?.address || 'Caloocan City'}
                  </p>
                  {location?.landmark && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Landmark: </span>
                      {location.landmark}
                    </p>
                  )}
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    {location?.lat?.toFixed(5)}, {location?.lng?.toFixed(5)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onJumpToStep(2)}
                  className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} aria-hidden="true" />
                  <span>{t('reportWizard.step6Review.edit', 'Edit')}</span>
                </button>
              </div>

              {/* Severity & Description Row */}
              <div className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('reportWizard.step6Review.rowSeverity', 'SEVERITY')}:
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold text-xs">
                      {severityLabel}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block pt-1">
                    {t('reportWizard.step6Review.rowDescription', 'DESCRIPTION')}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {displayedDescription || 'No description provided'}
                  </p>
                  {isLongDescription && (
                    <button
                      type="button"
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <span>{isDescExpanded ? t('reportWizard.step6Review.showLess', 'Show less') : t('reportWizard.step6Review.showMore', 'Show full description')}</span>
                      {isDescExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onJumpToStep(4)}
                  className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 inline-flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                >
                  <Edit2 size={13} aria-hidden="true" />
                  <span>{t('reportWizard.step6Review.edit', 'Edit')}</span>
                </button>
              </div>

              {/* Photos Row */}
              <div className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t('reportWizard.step6Review.rowPhotos', 'PHOTOS')}
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {photosList.length > 0 ? `${photosList.length} photo${photosList.length > 1 ? 's' : ''} attached` : 'No photos attached'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onJumpToStep(3)}
                  className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} aria-hidden="true" />
                  <span>{t('reportWizard.step6Review.edit', 'Edit')}</span>
                </button>
              </div>

              {/* Contact Row */}
              <div className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t('reportWizard.step6Review.rowContact', 'CONTACT')}
                  </span>
                  {contact?.name && (
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {contact.name}
                    </p>
                  )}
                  {contact?.phone && (
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {contact.phone}
                    </p>
                  )}
                  {contact?.email && (
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {contact.email}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onJumpToStep(5)}
                  className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} aria-hidden="true" />
                  <span>{t('reportWizard.step6Review.edit', 'Edit')}</span>
                </button>
              </div>
            </div>

            {/* Declaration & Consent Checkbox */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  consentAccepted
                    ? 'bg-[#ff6b00] text-white'
                    : 'border border-slate-300 dark:border-slate-600 bg-transparent'
                }`}>
                  {consentAccepted && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                </div>
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => onConsentChange(e.target.checked)}
                  className="sr-only"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                  {t('reportWizard.step6Review.confirmAccuracy', 'I confirm that this report is accurate to the best of my knowledge and follows the City of Caloocan reporting guidelines.')}
                </span>
              </label>
            </div>
          </div>

          {/* Right Column: Previews & Emergency 911 Note */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* Location Mini Preview Box */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('reportWizard.step6Review.mapPreviewTitle', 'Location preview')}
              </h3>
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-orange-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-900 dark:text-white leading-tight">
                    {location?.address || 'Caloocan City'}
                  </p>
                  <p className="text-slate-400 font-mono mt-0.5">
                    {location?.lat?.toFixed(5)}, {location?.lng?.toFixed(5)}
                  </p>
                </div>
              </div>
            </div>

            {/* Photo Thumbnails */}
            {photosList.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('reportWizard.step6Review.photoAttachmentsTitle', 'Attached photos')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {photosList.slice(0, 4).map((p, i) => (
                    <div key={i} className="relative h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={p.previewUrl}
                        alt="Evidence preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency 911 Link Note */}
            <aside className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 p-4 flex items-start gap-3">
              <PhoneCall size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                If this is an immediate life-threatening emergency, please call <a href="tel:911" className="font-extrabold underline hover:text-rose-900">911</a> immediately.
              </p>
            </aside>
          </div>
        </div>
      </div>

      {/* Pinned Footer: Single Click Submit with Pulse Line */}
      <div>
        {isSubmitting && (
          <div className="mb-3 space-y-1">
            <PulsoPulseLine height={16} color="#ff6b00" />
            <p className="text-xs text-orange-600 font-bold text-center">Sending...</p>
          </div>
        )}
        <WizardCardFooter
          onBack={onBack}
          canBack={true}
          onContinue={onSubmit}
          isContinueDisabled={!consentAccepted || hasReviewErrors || isSubmitting}
          isSubmit={true}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
