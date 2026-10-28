import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { API_BASE_URL } from '../utils/apiBase';
import { getStoredToken } from '../utils/auth';

import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import WizardSidebar, { REPORT_STEPS } from '../components/report-wizard/WizardSidebar';
import Step1CategoryEmergency from '../components/report-wizard/Step1CategoryEmergency';
import Step2LocationMap from '../components/report-wizard/Step2LocationMap';
import Step3EvidenceUpload from '../components/report-wizard/Step3EvidenceUpload';
import Step4DetailsDuplicate from '../components/report-wizard/Step4DetailsDuplicate';
import Step5ContactPreferences from '../components/report-wizard/Step5ContactPreferences';
import Step6ReviewConsent from '../components/report-wizard/Step6ReviewConsent';
import { Home } from 'lucide-react';

const DRAFT_STORAGE_KEY = 'pulso_report_wizard_draft_v1';

export default function ReportWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Centralized Google Maps API loader state
  const { isLoaded: isMapLoaded } = useGoogleMaps();

  const [restoredDraft] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
      return [1, 2].includes(draft?.version) && draft.formData && typeof draft.formData === 'object' ? draft : null;
    } catch { return null; }
  });

  // Stepper State (1 - 6)
  const [currentStep, setCurrentStep] = useState(() => Math.min(6, Math.max(1, Number(restoredDraft?.currentStep) || 1)));
  const [maxStepReached, setMaxStepReached] = useState(() => Math.min(6, Math.max(1, Number(restoredDraft?.maxStepReached) || 1)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [submissionError, setSubmissionError] = useState(null);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);

  // Consolidated Form State
  const [formData, setFormData] = useState(() => {
    const initial = {
    category: '',
    location: {
      lat: null,
      lng: null,
      address: '',
      barangay: '',
      landmark: '',
      isInCaloocan: false,
      confirmed: false,
    },
    evidence: {
      file: null,
      previewUrl: null,
      fileName: '',
      fileSize: 0,
      mimeType: '',
      aiCategorySuggestion: null,
      aiConfidence: null,
      isAiScanning: false,
    },
    details: {
      description: '',
      urgency: 'medium',
    },
    contact: {
      type: 'anonymous', // 'anonymous' | 'notify' | 'authenticated'
      email: '',
      phone: '',
    },
    consentAccepted: false,
    };
    const saved = restoredDraft?.formData || {};
    return {
      ...initial,
      category: typeof saved.category === 'string' ? saved.category : '',
      location: { ...initial.location, ...saved.location, confirmed: saved.location?.confirmed === true },
      details: { ...initial.details, ...saved.details },
      contact: { ...initial.contact, ...saved.contact },
      // A File cannot survive JSON storage. Require reattachment and fresh consent.
      evidence: { ...initial.evidence, fileName: saved.evidence?.fileName || '' },
      consentAccepted: false,
    };
  });

  // Auto-Save Draft to LocalStorage (debounced 400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const draftPayload = {
          version: 2,
          savedAt: Date.now(),
          currentStep,
          maxStepReached,
          formData: {
            category: formData.category,
            location: formData.location,
            evidence: {
              fileName: formData.evidence.fileName,
              fileSize: formData.evidence.fileSize,
              mimeType: formData.evidence.mimeType,
              aiCategorySuggestion: formData.evidence.aiCategorySuggestion,
              aiConfidence: formData.evidence.aiConfidence,
            },
            details: formData.details,
            contact: formData.contact,
            consentAccepted: formData.consentAccepted,
          }
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
      } catch (e) {
        console.warn('Failed to auto-save report draft:', e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData, currentStep, maxStepReached]);

  // Step Navigation
  const goToNextStep = () => {
    if (currentStep < 6) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setMaxStepReached(prev => Math.max(prev, next));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${next} of 6`);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${prev} of 6`);
    } else {
      navigate('/');
    }
  };

  const jumpToStep = (stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= 6 && stepNumber <= maxStepReached) {
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${stepNumber} of 6`);
    }
  };

  // Final Atomic Report Submission
  const handleSubmitReport = async () => {
    if (!formData.consentAccepted || isSubmitting) return;
    if (!Number.isFinite(formData.location.lat) || !Number.isFinite(formData.location.lng) || !formData.location.isInCaloocan || !formData.location.confirmed) {
      setCurrentStep(2);
      setSubmissionError('Select the issue location before submitting.');
      return;
    }
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const submitData = new FormData();
      submitData.append('category', formData.category);
      submitData.append('description', formData.details.description);
      submitData.append('lat', String(formData.location.lat));
      submitData.append('lng', String(formData.location.lng));
      submitData.append('location_string', [formData.location.address || `Lat: ${formData.location.lat}, Lng: ${formData.location.lng}`, formData.location.landmark?.trim()].filter(Boolean).join(' · '));
      submitData.append('location_barangay', formData.location.barangay || '');
      submitData.append('urgency', formData.details.urgency || 'medium');

      if (formData.location.landmark) {
        submitData.append('landmark', formData.location.landmark);
      }

      if (formData.contact?.email) {
        submitData.append('contact_email', formData.contact.email.trim());
      }
      if (formData.contact?.phone) {
        submitData.append('contact_phone', formData.contact.phone.trim());
      }

      const token = getStoredToken();
      submitData.append('submission_source', token ? 'web_resident' : 'web_guest');

      if (formData.evidence.file) {
        submitData.append('image', formData.evidence.file, formData.evidence.fileName || 'evidence.jpg');
      }

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers,
        body: submitData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Purge draft from storage on success
        localStorage.removeItem(DRAFT_STORAGE_KEY);

        // Transition to success receipt page
        navigate('/report/success', {
          state: {
            ticketId: data.ticket_id || data.id,
            trackingToken: data.tracking_token,
            trackingUrl: data.tracking_url || `/track?id=${data.ticket_id || data.id}&token=${data.tracking_token || ''}`,
            category: data.category || formData.category,
            locationString: data.location_string || formData.location.address,
            createdAt: data.created_at || new Date().toISOString(),
            reporterType: data.reporter_type || (token ? 'registered' : 'guest'),
            report: data,
          }
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 400 && errorData.detail?.toLowerCase().includes('outside')) {
          setCurrentStep(2);
          setSubmissionError(errorData.detail || 'Selected location is outside Caloocan City jurisdiction.');
        } else if (response.status === 409) {
          const ticket = response.headers.get('X-Canonical-Ticket-ID');
          setSubmissionError(`${typeof errorData.detail === 'string' ? errorData.detail : 'A similar report is already being processed.'}${ticket ? ` Existing ticket: ${ticket}.` : ''} Your draft is saved. Review the location or contact PULSO for assistance.`);
        } else if (response.status === 422) {
          setSubmissionError(typeof errorData.detail === 'string' ? errorData.detail : 'Form validation failed. Please check your inputs.');
        } else if (response.status === 429) {
          setSubmissionError('Submission rate limit reached. Please wait a moment before trying again.');
        } else {
          setSubmissionError(errorData.detail || errorData.message || 'Submission failed. Please check your connection.');
        }
      }
    } catch (err) {
      console.error('Submission network error:', err);
      setSubmissionError('An unexpected network error occurred. Your draft remains safely preserved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStepObj = REPORT_STEPS.find(s => s.id === currentStep) || REPORT_STEPS[0];
  const currentStepName = t(`reportWizard.steps.${currentStepObj.key}`, currentStepObj.defaultLabel);

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Screen Reader Live Region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* ── Top Header: Logo on top-left & Home Section ───────────── */}
      <header className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 w-full flex justify-between items-center">
        {/* Logo on top-left linking to home */}
        <Link
          to="/"
          className="flex items-center gap-2 group transition-opacity hover:opacity-90 cursor-pointer"
          title="Caloocan City PULSO Home"
        >
          <Branding size="h-9 w-9 sm:h-10 sm:w-10" />
        </Link>

        {/* Right side: Theme Toggle & Home Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] border border-slate-200/90 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Return to Home Section"
          >
            <Home size={14} className="text-[#ff6b00]" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      {/* Main Responsive Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8 flex flex-col">
        {/* Step-by-Step Segmented Stepper Bar (<1024px / lg:hidden) */}
        <nav
          aria-label="Report progress steps"
          className="flex lg:hidden flex-col gap-2 mb-6 px-1"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-xs uppercase tracking-wider text-orange-600 dark:text-[#ff8a3d]">
              {t('reportWizard.stepCountUppercase', 'STEP {{current}} OF {{total}}', { current: currentStep, total: 6 })}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              {currentStepName}
            </span>
          </div>

          {/* 6 Segmented Progress Bars */}
          <div
            className="grid grid-cols-6 gap-2 sm:gap-2.5 w-full"
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={6}
            aria-valuetext={`Step ${currentStep} of 6: ${currentStepName}`}
          >
            {REPORT_STEPS.map((step) => {
              const isPassedOrCurrent = step.id <= currentStep;
              const isCurrent = step.id === currentStep;
              const isClickable = step.id <= maxStepReached;
              const label = t(`reportWizard.steps.${step.key}`, step.defaultLabel);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => isClickable && jumpToStep(step.id)}
                  disabled={!isClickable}
                  title={`${step.id}. ${label}`}
                  aria-label={`Step ${step.id}: ${label}${isCurrent ? ' (current step)' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'
                  } ${
                    isPassedOrCurrent
                      ? 'bg-[#ff6b00]'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              );
            })}
          </div>
        </nav>

        {/* Global Submission Error Callout */}
        {submissionError && (
          <aside aria-label="Error announcement" className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-sm text-red-800 dark:text-red-300 shadow-xs">
            <p className="font-bold">Notice:</p>
            <p>{submissionError}</p>
          </aside>
        )}

        {/* Two-Column Layout (Desktop) */}
        <div className="flex-1 flex flex-col lg:flex-row items-stretch lg:items-start gap-6 lg:gap-8">
          {/* Left Column: Persistent Desktop Sidebar */}
          <WizardSidebar
            currentStep={currentStep}
            maxStepReached={maxStepReached}
            onStepClick={jumpToStep}
            onOpenHelpGuide={() => setIsHelpGuideOpen(true)}
          />

          {/* Right Column: Rounded Main Card */}
          <section
            aria-label={`Step ${currentStep} form content`}
            className="flex-1 w-full rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 shadow-xs min-h-[640px] flex flex-col justify-between"
          >
            {currentStep === 1 && (
              <Step1CategoryEmergency
                selectedCategory={formData.category}
                onSelectCategory={(cat) => setFormData(p => ({ ...p, category: cat }))}
                onContinue={goToNextStep}
                onBack={goToPreviousStep}
                isGuideModalOpen={isHelpGuideOpen}
                onCloseGuideModal={() => setIsHelpGuideOpen(false)}
                onOpenGuideModal={() => setIsHelpGuideOpen(true)}
              />
            )}

            {currentStep === 2 && (
              <Step2LocationMap
                isMapLoaded={isMapLoaded}
                locationData={formData.location}
                onLocationChange={(loc) => setFormData(p => ({ ...p, location: typeof loc === 'function' ? loc(p.location) : loc }))}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
              />
            )}

            {currentStep === 3 && (
              <Step3EvidenceUpload
                evidenceData={formData.evidence}
                category={formData.category}
                locationData={formData.location}
                onEvidenceChange={(ev) => {
                  setFormData(p => {
                    const updated = { ...p, evidence: ev };
                    if (ev.autoDescription && !p.details.description) {
                      updated.details = {
                        ...p.details,
                        description: ev.autoDescription,
                        urgency: ev.urgency || p.details.urgency || 'medium',
                      };
                    }
                    return updated;
                  });
                }}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
              />
            )}

            {currentStep === 4 && (
              <Step4DetailsDuplicate
                detailsData={formData.details}
                locationData={formData.location}
                category={formData.category}
                evidenceData={formData.evidence}
                onDetailsChange={(det) => setFormData(p => ({ ...p, details: det }))}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
              />
            )}

            {currentStep === 5 && (
              <Step5ContactPreferences
                contactData={formData.contact}
                onContactChange={(cnt) => setFormData(p => ({ ...p, contact: cnt }))}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
              />
            )}

            {currentStep === 6 && (
              <Step6ReviewConsent
                formData={formData}
                isSubmitting={isSubmitting}
                onJumpToStep={jumpToStep}
                onConsentChange={(val) => setFormData(p => ({ ...p, consentAccepted: val }))}
                onBack={goToPreviousStep}
                onSubmit={handleSubmitReport}
              />
            )}
          </section>
        </div>
      </main>


    </div>
  );
}
