import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { 
  validateStep, 
  validateAllSteps, 
  validateCategory,
  validateLocation,
  validateEvidence,
  validateDetails,
  validateContact,
  normalizeMobileNumber, 
  ACCEPTED_CATEGORIES 
} from '../utils/reportWizardValidation';
import { Home, AlertCircle } from 'lucide-react';

const DRAFT_STORAGE_KEY = 'pulso_report_wizard_draft_v1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function ReportWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Centralized Google Maps API loader state
  const { isLoaded: isMapLoaded } = useGoogleMaps();

  // Form initiation time for anti-spam verification
  const formStartedAtRef = useRef(Date.now());

  // One-time idempotency key per wizard session
  const idempotencyKeyRef = useRef(`pulso-req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  const [restoredDraft] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
      if (!draft) return null;
      // 7-day expiration check
      if (draft.savedAt && (Date.now() - draft.savedAt > SEVEN_DAYS_MS)) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return null;
      }
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

  // Per-step validation error tracking
  const [stepErrors, setStepErrors] = useState([]);

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
        accuracy: null,
        pinConfirmed: false,
      },
      evidence: {
        file: null,
        photos: [],
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
        type: 'notify',
        name: '',
        email: '',
        phone: '',
        website_hp: '',
        consentAccepted: false,
      },
      consentAccepted: false,
    };

    const saved = restoredDraft?.formData || {};
    // Category validity check: clear if category no longer exists
    const safeCategory = (typeof saved.category === 'string' && ACCEPTED_CATEGORIES.includes(saved.category))
      ? saved.category
      : '';

    return {
      ...initial,
      category: safeCategory,
      location: { ...initial.location, ...saved.location, confirmed: saved.location?.confirmed === true },
      details: { ...initial.details, ...saved.details },
      contact: { ...initial.contact, ...saved.contact },
      evidence: { ...initial.evidence, fileName: saved.evidence?.fileName || '' },
      consentAccepted: false,
    };
  });

  // Multi-step reactive validity assessment
  const stepsValidation = useMemo(() => {
    return {
      1: validateCategory(formData.category),
      2: validateLocation(formData.location),
      3: validateEvidence(formData.evidence),
      4: validateDetails(formData.details),
      5: validateContact(formData.contact, formData.consentAccepted),
    };
  }, [formData]);

  // If current step had errors, clear them as soon as fixed
  useEffect(() => {
    if (stepErrors.length > 0) {
      const liveCheck = validateStep(currentStep, formData);
      if (liveCheck.valid) {
        setStepErrors([]);
      } else {
        // Update errors to reflect fixed fields
        setStepErrors(liveCheck.errors);
      }
    }
  }, [formData, currentStep]);

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

  // Unsaved data browser exit guard
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasContent = Boolean(
        formData.category ||
        formData.location?.lat ||
        formData.evidence?.file ||
        formData.evidence?.photos?.length ||
        formData.details?.description ||
        formData.contact?.phone ||
        formData.contact?.email
      );

      if (hasContent && !isSubmitting) {
        e.preventDefault();
        e.returnValue = t('reportWizard.validation.leavePrompt', 'Leave this report? Your answers are saved on this device.');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, isSubmitting, t]);

  // Step Navigation with Strict Step Validation Gate
  const goToNextStep = () => {
    if (currentStep < 6) {
      // Validate current step
      const stepCheck = validateStep(currentStep, formData);
      if (!stepCheck.valid) {
        setStepErrors(stepCheck.errors);
        const count = stepCheck.errors.length;
        setAnnouncement(t('reportWizard.validation.attentionCount', '{{count}} things need your attention', { count }));
        return;
      }

      setStepErrors([]);
      const next = currentStep + 1;
      setCurrentStep(next);
      setMaxStepReached(prev => Math.max(prev, next));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${next} of 6`);
    }
  };

  const goToPreviousStep = () => {
    setStepErrors([]);
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${prev} of 6`);
    } else {
      navigate('/');
    }
  };

  // Navigating directly to a step
  const jumpToStep = (stepNumber) => {
    if (stepNumber < 1 || stepNumber > 6) return;

    // Moving backward is always allowed
    if (stepNumber <= currentStep) {
      setStepErrors([]);
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${stepNumber} of 6`);
      return;
    }

    // Moving forward to a later step requires all earlier steps to be valid
    for (let s = 1; s < stepNumber; s++) {
      const check = stepsValidation[s];
      if (check && !check.valid) {
        // Go to first invalid step
        setCurrentStep(s);
        setStepErrors(check.errors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const stepName = REPORT_STEPS.find(st => st.id === s)?.defaultLabel || `Step ${s}`;
        setAnnouncement(`Please complete ${stepName} before proceeding.`);
        return;
      }
    }

    setStepErrors([]);
    setCurrentStep(stepNumber);
    setMaxStepReached(prev => Math.max(prev, stepNumber));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAnnouncement(`Step ${stepNumber} of 6`);
  };

  // Final Atomic Report Submission
  const handleSubmitReport = async () => {
    if (isSubmitting) return;

    // Anti-bot check: silent drop if honeypot is filled
    if (formData.contact?.website_hp && formData.contact.website_hp.trim() !== '') {
      console.warn('Bot submission blocked.');
      return;
    }

    // Minimum time-on-form check: ~5s
    const elapsed = Date.now() - formStartedAtRef.current;
    if (elapsed < 5000) {
      await new Promise(r => setTimeout(r, 1500));
    }

    // Full pre-submit re-validation across all steps
    const fullCheck = validateAllSteps(formData);
    if (!fullCheck.valid) {
      setSubmissionError(t('reportWizard.validation.server.rejected', 'We couldn\'t accept your report. Please check the marked fields.'));
      return;
    }

    // Offline check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSubmissionError(t('reportWizard.validation.server.offline', "You're offline. Your report is saved. We'll send it when you're back online."));
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
        submitData.append('landmark', formData.location.landmark.trim());
      }

      if (formData.contact?.name) {
        submitData.append('reporter_name', formData.contact.name.trim());
      }

      // Normalize phone number before sending
      if (formData.contact?.phone) {
        const phoneNorm = normalizeMobileNumber(formData.contact.phone);
        submitData.append('contact_phone', phoneNorm.normalized || formData.contact.phone.trim());
      }

      if (formData.contact?.email) {
        submitData.append('contact_email', formData.contact.email.trim().toLowerCase());
      }

      const token = getStoredToken();
      submitData.append('submission_source', token ? 'web_resident' : 'web_guest');

      // Primary evidence photo
      const primaryPhoto = formData.evidence.photos?.[0]?.file || formData.evidence.file;
      if (primaryPhoto) {
        submitData.append('image', primaryPhoto, formData.evidence.fileName || 'evidence.jpg');
      }

      const headers = {
        'X-Idempotency-Key': idempotencyKeyRef.current,
      };
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
          setSubmissionError(t('reportWizard.validation.location.outsideCaloocan', 'This spot is outside Caloocan City. Please move the pin inside the city.'));
        } else if (response.status === 409) {
          const ticket = response.headers.get('X-Canonical-Ticket-ID');
          setSubmissionError(`${typeof errorData.detail === 'string' ? errorData.detail : 'A similar report is already being processed.'}${ticket ? ` Existing ticket: ${ticket}.` : ''} Your draft is saved. Review the location or contact PULSO for assistance.`);
        } else if (response.status === 422) {
          setSubmissionError(t('reportWizard.validation.server.rejected', 'We couldn\'t accept your report. Please check the marked fields.'));
        } else if (response.status === 429) {
          setSubmissionError(t('reportWizard.validation.server.rateLimit', 'Please wait a minute and try again.'));
        } else {
          setSubmissionError(errorData.detail || errorData.message || t('reportWizard.validation.server.generic', 'Something went wrong. Your report is saved. Please try again.'));
        }
      }
    } catch (err) {
      console.error('Submission network error:', err);
      setSubmissionError(t('reportWizard.validation.server.generic', 'Something went wrong. Your report is saved. Please try again.'));
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

      {/* ── Top Header: Logo & Theme Toggle ───────────── */}
      <header className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 w-full flex justify-between items-center">
        <Link
          to="/"
          className="flex items-center gap-2 group transition-opacity hover:opacity-90 cursor-pointer"
          title="Caloocan City PULSO Home"
        >
          <Branding size="h-9 w-9 sm:h-10 sm:w-10" />
        </Link>

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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8 flex flex-col">
        {/* Step-by-Step Segmented Bar (<1024px) */}
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

          <div
            className="grid grid-cols-6 gap-2 sm:gap-2.5 w-full"
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={6}
            aria-valuetext={`Step ${currentStep} of 6: ${currentStepName}`}
          >
            {REPORT_STEPS.map((step) => {
              const isCurrent = step.id === currentStep;
              const isFinishedAndValid = step.id < currentStep && stepsValidation[step.id]?.valid;
              const hasErrorsAfterVisited = step.id < currentStep && !stepsValidation[step.id]?.valid;
              const label = t(`reportWizard.steps.${step.key}`, step.defaultLabel);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => jumpToStep(step.id)}
                  title={`${step.id}. ${label}`}
                  aria-label={`Step ${step.id}: ${label}${isCurrent ? ' (current step)' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#ff6b00] ring-2 ring-orange-200 dark:ring-orange-950/40'
                      : hasErrorsAfterVisited
                      ? 'bg-amber-500'
                      : isFinishedAndValid
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
          <aside aria-label="Error announcement" className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-sm text-red-800 dark:text-red-300 shadow-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="font-semibold">{submissionError}</p>
          </aside>
        )}

        {/* Two-Column Layout */}
        <div className="flex-1 flex flex-col lg:flex-row items-stretch lg:items-start gap-6 lg:gap-8">
          {/* Left Column: Persistent Desktop Sidebar */}
          <WizardSidebar
            currentStep={currentStep}
            maxStepReached={maxStepReached}
            onStepClick={jumpToStep}
            onOpenHelpGuide={() => setIsHelpGuideOpen(true)}
            stepsValidation={stepsValidation}
          />

          {/* Right Column: Active Step Card */}
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
                stepErrors={stepErrors}
              />
            )}

            {currentStep === 2 && (
              <Step2LocationMap
                isMapLoaded={isMapLoaded}
                locationData={formData.location}
                onLocationChange={(loc) => setFormData(p => ({ ...p, location: typeof loc === 'function' ? loc(p.location) : loc }))}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
                stepErrors={stepErrors}
                stepWarnings={stepsValidation[2]?.warnings || []}
              />
            )}

            {currentStep === 3 && (
              <Step3EvidenceUpload
                evidenceData={formData.evidence}
                category={formData.category}
                onCategoryChange={(newCat) => setFormData(p => ({ ...p, category: newCat }))}
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
                stepErrors={stepErrors}
              />
            )}

            {currentStep === 4 && (
              <Step4DetailsDuplicate
                detailsData={formData.details}
                onDetailsChange={(det) => setFormData(p => ({ ...p, details: det }))}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
                stepErrors={stepErrors}
              />
            )}

            {currentStep === 5 && (
              <Step5ContactPreferences
                contactData={formData.contact}
                onContactChange={(cnt) => setFormData(p => ({ 
                  ...p, 
                  contact: cnt,
                  consentAccepted: Boolean(cnt.consentAccepted) 
                }))}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
                stepErrors={stepErrors}
                stepWarnings={stepsValidation[5]?.warnings || []}
              />
            )}

            {currentStep === 6 && (
              <Step6ReviewConsent
                formData={formData}
                isSubmitting={isSubmitting}
                onJumpToStep={jumpToStep}
                onConsentChange={(val) => setFormData(p => ({ 
                  ...p, 
                  consentAccepted: val,
                  contact: { ...p.contact, consentAccepted: val }
                }))}
                onBack={goToPreviousStep}
                onSubmit={handleSubmitReport}
                reviewErrors={validateAllSteps(formData).errors}
                submissionError={submissionError}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
