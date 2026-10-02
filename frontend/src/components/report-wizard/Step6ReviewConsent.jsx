import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckSquare, Square, Edit2, MapPin, Route, Camera, 
  FileText, Bell, UserX, ShieldCheck, ArrowLeft, Send, Loader2 
} from 'lucide-react';

export default function Step6ReviewConsent({
  formData,
  isSubmitting,
  onJumpToStep,
  onConsentChange,
  onBack,
  onSubmit,
}) {
  const { t } = useTranslation();
  const consentAccepted = formData.consentAccepted || false;

  const { category, location, evidence, details, contact } = formData;

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          {t('reportWizard.step6Review.title', 'Review & Consent')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('reportWizard.step6Review.subtitle', 'Please verify your report details before submitting to the engineering queue.')}
        </p>
      </div>

      {/* ── STRUCTURED REVIEW DOCKET ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        
        {/* Section 1: Category */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
              <Route size={18} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('reportWizard.step6Review.sectionCategory', 'Issue Category')}
              </span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                {category || 'Not specified'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(1)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Edit2 size={13} />
            <span>{t('reportWizard.step6Review.editAction', 'Edit')}</span>
          </button>
        </div>

        {/* Section 2: Location */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <MapPin size={18} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('reportWizard.step6Review.sectionLocation', 'Location & Coordinates')}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
                {location.address || 'Caloocan City'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                GPS: {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
                {location.landmark ? ` · Landmark: "${location.landmark}"` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(2)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Edit2 size={13} />
            <span>{t('reportWizard.step6Review.editAction', 'Edit')}</span>
          </button>
        </div>

        {/* Section 3: Evidence */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Camera size={18} />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('reportWizard.step6Review.sectionEvidence', 'Evidence Attached')}
              </span>
              {evidence.previewUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={evidence.previewUrl}
                    alt="Evidence thumbnail"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                      {evidence.fileName || 'Photo Evidence'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {formatFileSize(evidence.fileSize)}
                    </p>
                    {evidence.aiCategorySuggestion && (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold text-[10px]">
                        AI: {evidence.aiCategorySuggestion} ({evidence.aiConfidence || 95}%)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  {t('reportWizard.step6Review.noPhotoProvided', 'No photo attached (manual report)')}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(3)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Edit2 size={13} />
            <span>{t('reportWizard.step6Review.editAction', 'Edit')}</span>
          </button>
        </div>

        {/* Section 4: Details */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
              <FileText size={18} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('reportWizard.step6Review.sectionDetails', 'Description & Details')}
              </span>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap">
                {details.description || 'No description provided'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(4)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Edit2 size={13} />
            <span>{t('reportWizard.step6Review.editAction', 'Edit')}</span>
          </button>
        </div>

        {/* Section 5: Contact */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              {contact.type === 'anonymous' ? <UserX size={18} /> : <Bell size={18} />}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('reportWizard.step6Review.sectionContact', 'Contact Preferences')}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
                {contact.type === 'anonymous'
                  ? t('reportWizard.step6Review.anonymousReporter', 'Anonymous Guest (Tracking via Private Token)')
                  : t('reportWizard.step6Review.notifyReporter', 'SMS / Email Alerts ({{contact}})', {
                      contact: [contact.email, contact.phone].filter(Boolean).join(' · '),
                    })}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(5)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Edit2 size={13} />
            <span>{t('reportWizard.step6Review.editAction', 'Edit')}</span>
          </button>
        </div>

      </div>

      {/* ── CIVIC TRUTH DECLARATION & CONSENT CHECKBOX ──────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl border-2 border-orange-200 dark:border-orange-800/60 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm space-y-3">
        <label className="flex items-start gap-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 h-5 w-5 rounded text-orange-600 border-slate-300 focus:ring-orange-500 dark:border-slate-700"
          />
          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
            {t('reportWizard.step6Review.consentCheckbox', 'I declare that the information provided in this report is true and accurate. I understand that submitting false or malicious emergency reports is prohibited under Philippine law.')}
          </span>
        </label>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-8 leading-normal">
          {t('reportWizard.step6Review.privacyStatement', 'Photos and location data will be used solely for city infrastructure inspection and repair. Personal contact info is never published on public boards.')}
        </p>
      </div>

      {/* ── ACTION FOOTER ────────────────────────────────────────────────────── */}
      <div className="pt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{t('reportWizard.nav.back', 'Back')}</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!consentAccepted || isSubmitting}
          className={`px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2.5 shadow-lg transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            consentAccepted && !isSubmitting
              ? 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin text-white" />
              <span>{t('reportWizard.nav.submitting', 'Submitting...')}</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>{t('reportWizard.nav.submit', 'Submit Official Report')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
