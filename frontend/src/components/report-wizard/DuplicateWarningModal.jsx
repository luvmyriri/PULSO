import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, Link as LinkIcon, CheckCircle2 } from '../../icons';

export default function DuplicateWarningModal({ 
  isOpen, 
  onClose, 
  duplicateData, 
  onAttachEvidence, 
  onProceedAnyway 
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !duplicateData) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500"
          aria-label="Close duplicate alert"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 id="duplicate-modal-title" className="font-bold text-lg text-slate-900 dark:text-white">
              {t('reportWizard.step4Details.duplicateBannerTitle', 'Similar Active Report Found Nearby')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Proximity alert: Active civic work order detected.
            </p>
          </div>
        </div>

        {/* Duplicate Ticket Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span className="font-bold text-slate-900 dark:text-white">
              Ticket: {duplicateData.ticketId || duplicateData.ticket_id}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
              {duplicateData.status || 'Being Handled by Field Team'}
            </span>
          </div>

          <div className="text-slate-600 dark:text-slate-300">
            <p><span className="font-semibold">Category:</span> {duplicateData.category}</p>
            {duplicateData.distance && (
              <p><span className="font-semibold">Distance:</span> ~{duplicateData.distance}m from your selected pin</p>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Attaching your photo helps engineering crews verify the continued presence and worsening condition of this hazard without cluttering the dispatch queue.
        </p>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onAttachEvidence}
            className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LinkIcon size={16} />
            <span>{t('reportWizard.step4Details.duplicateAttachBtn', 'Attach Evidence to Existing Report')}</span>
          </button>
          <button
            type="button"
            onClick={onProceedAnyway}
            className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 cursor-pointer"
          >
            <span>{t('reportWizard.step4Details.duplicateProceedBtn', 'Continue as New Report')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
