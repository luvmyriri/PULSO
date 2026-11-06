import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { API_BASE_URL } from '../utils/apiBase';
import { getStoredToken, getStoredUser } from '../utils/auth';
import { useAndroidBack } from '../utils/nativeAndroid';

import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import WizardSidebar, { REPORT_STEPS } from '../components/report-wizard/WizardSidebar';
import Step1CategoryEmergency, { parseSelectedCategoryIds } from '../components/report-wizard/Step1CategoryEmergency';
import Step2CameraLocation from '../components/report-wizard/Step2CameraLocation';
import Step4DetailsDuplicate from '../components/report-wizard/Step4DetailsDuplicate';
import Step5ContactPreferences from '../components/report-wizard/Step5ContactPreferences';
import Step6ReviewConsent from '../components/report-wizard/Step6ReviewConsent';
import { Home } from 'lucide-react';

const DRAFT_STORAGE_KEY = 'pulso_report_wizard_draft_v1';

export default function ReportWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Centralized Google Maps API loader state
  const { isLoaded: isMapLoaded } = useGoogleMaps();

  const [restoredDraft] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
      return [1, 2].includes(draft?.version) && draft.formData && typeof draft.formData === 'object' ? draft : null;
    } catch { return null; }
  });

  // Stepper State (1 - 5)
  const [currentStep, setCurrentStep] = useState(() => location.state?.startAtStepOne ? 1 : Math.min(5, Math.max(1, Number(restoredDraft?.currentStep) || 1)));
  const [maxStepReached, setMaxStepReached] = useState(() => Math.min(5, Math.max(1, Number(restoredDraft?.maxStepReached) || 1)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [submissionError, setSubmissionError] = useState(null);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);

  // Consume explicit guest entry once so reload still resumes the saved step.
  useEffect(() => {
    if (!location.state?.startAtStepOne) return;
    const state = { ...location.state };
    delete state.startAtStepOne;
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state });
  }, [location, navigate]);

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
        type: 'notify', // 'anonymous' | 'notify' | 'authenticated'
        name: '',
        email: '',
        phone: '',
      },
      consentAccepted: false,
    };
    const saved = restoredDraft?.formData || {};
    const savedLoc = saved.location || {};
    const rawBrgy = savedLoc.barangay;
    const cleanBrgy = (typeof rawBrgy === 'object' && rawBrgy !== null)
      ? (rawBrgy.name || rawBrgy.displayName || '')
      : (typeof rawBrgy === 'string' ? rawBrgy : '');
    const cleanAddress = typeof savedLoc.address === 'string'
      ? (savedLoc.address.includes('[object Object]')
          ? (cleanBrgy ? `${cleanBrgy}, Caloocan City, Metro Manila` : 'Caloocan City')
          : savedLoc.address)
      : '';

    return {
      ...initial,
      category: typeof saved.category === 'string' ? saved.category : '',
      location: {
        ...initial.location,
        ...savedLoc,
        barangay: cleanBrgy,
        address: cleanAddress || savedLoc.address || '',
        confirmed: savedLoc.confirmed === true || (Number.isFinite(savedLoc.lat) && Number.isFinite(savedLoc.lng)),
      },
      details: { ...initial.details, ...saved.details },
      contact: { ...initial.contact, ...saved.contact },
      // A File cannot survive JSON storage. Require reattachment and fresh consent.
      evidence: {
        ...initial.evidence,
        fileName: saved.evidence?.fileName || '',
        fileSize: saved.evidence?.fileSize || 0,
        mimeType: saved.evidence?.mimeType || 'image/jpeg',
        previewUrl: saved.evidence?.previewDataUrl?.startsWith('data:image/') ? saved.evidence.previewDataUrl : null,
        previewDataUrl: saved.evidence?.previewDataUrl?.startsWith('data:image/') ? saved.evidence.previewDataUrl : null,
        aiCategorySuggestion: saved.evidence?.aiCategorySuggestion || null,
        aiConfidence: saved.evidence?.aiConfidence || null,
      },
      consentAccepted: false,
    };
  });

  // Rehydrate File object when draft is restored from storage
  useEffect(() => {
    if (formData.evidence.file) return;
    const sourceUrl = formData.evidence.previewUrl || formData.evidence.previewDataUrl;
    if (!sourceUrl) return;
    let cancelled = false;
    fetch(sourceUrl)
      .then(res => (res.ok ? res.blob() : null))
      .then(blob => {
        if (!blob || cancelled) return;
        const reconstructedFile = new File(
          [blob],
          formData.evidence.fileName || 'evidence_photo.jpg',
          { type: blob.type || formData.evidence.mimeType || 'image/jpeg' }
        );
        setFormData(prev => ({
          ...prev,
          evidence: {
            ...prev.evidence,
            file: prev.evidence.file || reconstructedFile,
            previewUrl: prev.evidence.previewUrl || sourceUrl,
            previewDataUrl: prev.evidence.previewDataUrl || sourceUrl,
            fileName: prev.evidence.fileName || reconstructedFile.name,
            fileSize: prev.evidence.fileSize || reconstructedFile.size,
            mimeType: prev.evidence.mimeType || reconstructedFile.type || 'image/jpeg',
          },
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentStep, formData.evidence.file, formData.evidence.previewUrl, formData.evidence.previewDataUrl, formData.evidence.fileName, formData.evidence.mimeType]);

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
              previewDataUrl: formData.evidence.previewDataUrl || null,
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
    if (currentStep < 5) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setMaxStepReached(prev => Math.max(prev, next));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${next} of 5`);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${prev} of 5`);
    } else {
      const enteredAsGuest = new URLSearchParams(location.search).get('source') === 'guest';
      const isResident = Boolean(getStoredToken()) && getStoredUser()?.role === 'resident';
      navigate(enteredAsGuest ? '/login' : isResident ? '/dashboard' : '/resident-home');
    }
  };

  useAndroidBack(isHelpGuideOpen, 30, () => setIsHelpGuideOpen(false));
  useAndroidBack(isSubmitting, 10, () => {});
  useAndroidBack(currentStep > 1, 0, goToPreviousStep);

  const jumpToStep = (stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= 5 && stepNumber <= maxStepReached) {
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${stepNumber} of 5`);
    }
  };

  // Final Atomic Report Submission
  const handleSubmitReport = async () => {
    if (!formData.consentAccepted || isSubmitting) return;
    if (!Number.isFinite(formData.location.lat) || !Number.isFinite(formData.location.lng) || formData.location.isInCaloocan === false) {
      setCurrentStep(1);
      setSubmissionError('Select the issue location before submitting.');
      return;
    }
    let evidenceFile = formData.evidence.file;
    if (!evidenceFile) {
      try {
        const fallbackUrl = formData.evidence.previewUrl || formData.evidence.previewDataUrl;
        const res = fallbackUrl ? await fetch(fallbackUrl) : null;
        if (res?.ok) {
          const blob = await res.blob();
          evidenceFile = new File([blob], formData.evidence.fileName || 'evidence.jpg', { type: blob.type || 'image/jpeg' });
        }
      } catch (e) {
        console.warn('Could not rehydrate evidence file:', e);
      }
    }
    if (!evidenceFile) {
      setCurrentStep(1);
      setSubmissionError('Please attach or take a photo of the concern before submitting.');
      return;
    }
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const selectedCats = parseSelectedCategoryIds(formData.category);
      const categoriesToSubmit = selectedCats.length > 0 ? selectedCats.slice(0, 3) : [formData.category || 'Roads & Bridges'];
      const token = getStoredToken();
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let lastSuccessData = null;
      const createdTicketIds = [];

      for (const cat of categoriesToSubmit) {
        const submitData = new FormData();
        submitData.append('category', cat);
        submitData.append('description', formData.details.description);
        submitData.append('lat', String(formData.location.lat));
        submitData.append('lng', String(formData.location.lng));
        submitData.append('location_string', [formData.location.address || `Lat: ${formData.location.lat}, Lng: ${formData.location.lng}`, formData.location.landmark?.trim()].filter(Boolean).join(' · '));
        submitData.append('location_barangay', formData.location.barangay || '');
        submitData.append('urgency', formData.details.urgency || 'medium');

        if (formData.location.landmark) {
          submitData.append('landmark', formData.location.landmark);
        }

        if (formData.contact?.name) { submitData.append('reporter_name', formData.contact.name.trim()); }
        if (formData.contact?.email) {
          submitData.append('contact_email', formData.contact.email.trim());
        }
        if (formData.contact?.phone) {
          submitData.append('contact_phone', formData.contact.phone.trim());
        }

        submitData.append('submission_source', token ? 'web_resident' : 'web_guest');

        if (evidenceFile) { submitData.append('image', evidenceFile, formData.evidence.fileName || 'evidence.jpg'); } else if (formData.evidence.file) {
          submitData.append('image', formData.evidence.file, formData.evidence.fileName || 'evidence.jpg');
        }

        const response = await fetch(`${API_BASE_URL}/api/reports`, {
          method: 'POST',
          headers,
          body: submitData,
        });

        if (response.ok) {
          const data = await response.json();
          lastSuccessData = data;
          createdTicketIds.push(data.ticket_id || data.id);
        } else {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 400 && errorData.detail?.toLowerCase().includes('outside')) {
            setCurrentStep(1);
            setSubmissionError(errorData.detail || 'Selected location is outside Caloocan City jurisdiction.');
          } else if (response.status === 409) {
            const ticket = response.headers.get('X-Canonical-Ticket-ID');
            setSubmissionError(`${typeof errorData.detail === 'string' ? errorData.detail : 'A similar report is already being processed.'}${ticket ? ` Existing ticket: ${ticket}.` : ''}`);
          } else if (response.status === 422) {
            setSubmissionError(typeof errorData.detail === 'string' ? errorData.detail : 'Form validation failed. Please check your inputs.');
          } else if (response.status === 429) {
            setSubmissionError('Submission rate limit reached. Please wait a moment before trying again.');
          } else {
            setSubmissionError(errorData.detail || errorData.message || 'Submission failed. Please check your connection.');
          }
          return;
        }
      }

      if (lastSuccessData) {
        // Purge draft from storage on success
        localStorage.removeItem(DRAFT_STORAGE_KEY);

        // Transition to success receipt page
        navigate('/report/success', {
          state: {
            ticketId: createdTicketIds.join(', '),
            trackingToken: lastSuccessData.tracking_token,
            trackingUrl: lastSuccessData.tracking_url || `/track?id=${createdTicketIds[0]}&token=${lastSuccessData.tracking_token || ''}`,
            category: categoriesToSubmit.join(' + '),
            locationString: lastSuccessData.location_string || formData.location.address,
            createdAt: lastSuccessData.created_at || new Date().toISOString(),
            reporterType: lastSuccessData.reporter_type || (token ? 'registered' : 'guest'),
            report: lastSuccessData,
          }
        });
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
      <header className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 sm:pt-3.5 w-full flex justify-between items-center">
        {/* Logo on top-left linking to home */}
        <Link
          to="/resident-home"
          className="flex items-center gap-2 group transition-opacity hover:opacity-90 cursor-pointer"
          title="Caloocan City PULSO Home"
        >
          <Branding size="h-8 w-8 sm:h-9 sm:w-9" />
        </Link>

        {/* Right side: Theme Toggle & Home Navigation */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggle />
          <Link
            to="/resident-home"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] border border-slate-200/90 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Return to Home Section"
            aria-label="Home"
          >
            <Home size={14} className="text-[#ff6b00]" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      {/* Main Responsive Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-2 sm:pt-3 pb-32 lg:pb-6 flex flex-col">
        {/* Step-by-Step Segmented Stepper Bar (<1024px / lg:hidden) */}
        <nav
          aria-label="Report progress steps"
          className="flex lg:hidden flex-col gap-1.5 mb-3 px-1"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-xs uppercase tracking-wider text-orange-600 dark:text-[#ff8a3d]">
              {t('reportWizard.stepCountUppercase', 'STEP {{current}} OF {{total}}', { current: currentStep, total: 5 })}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              {currentStepName}
            </span>
          </div>

          {/* 5 Segmented Progress Bars */}
          <div
            className="grid grid-cols-5 gap-2 sm:gap-2.5 w-full"
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuetext={`Step ${currentStep} of 5: ${currentStepName}`}
          >
            {REPORT_STEPS.map((step) => {
              const isPassedOrCurrent = step.id <= currentStep;
              const isCurrent = step.id === currentStep;
              const label = t(`reportWizard.steps.${step.key}`, step.defaultLabel);

              return (
                <div
                  key={step.id}
                  title={`${step.id}. ${label}`}
                  aria-label={`Step ${step.id}: ${label}${isCurrent ? ' (current step)' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-default ${
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
          <aside aria-label="Error announcement" className="mb-3 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs sm:text-sm text-red-800 dark:text-red-300 shadow-xs">
            <p className="font-bold">Notice:</p>
            <p>{submissionError}</p>
          </aside>
        )}

        {/* Two-Column Layout (Desktop) */}
        <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
          {/* Left Column: Persistent Desktop Sidebar */}
          <WizardSidebar
            currentStep={currentStep}
            onOpenHelpGuide={() => setIsHelpGuideOpen(true)}
          />

          {/* Right Column: Rounded Main Card */}
          <section
            aria-label={`Step ${currentStep} form content`}
            className="lg:flex-1 w-full lg:min-h-[540px] rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 md:p-6 shadow-2xs flex flex-col justify-between"
          >
            {currentStep === 1 && (
              <Step2CameraLocation
                isMapLoaded={isMapLoaded}
                evidenceData={formData.evidence}
                locationData={formData.location}
                category={formData.category}
                onEvidenceChange={(ev) => {
                  setFormData(p => {
                    const resolvedEv = typeof ev === 'function' ? ev(p.evidence) : ev;
                    const updated = { ...p, evidence: resolvedEv };
                    if (resolvedEv?.autoDescription) {
                      updated.details = {
                        ...p.details,
                        description: resolvedEv.autoDescription,
                        urgency: resolvedEv.urgency || p.details.urgency || 'medium',
                      };
                    }
                    if (resolvedEv?.aiCategorySuggestion) {
                      updated.category = resolvedEv.aiCategorySuggestion;
                    }
                    return updated;
                  });
                }}
                onLocationChange={(loc) => setFormData(p => {
                  const nextLoc = typeof loc === 'function' ? loc(p.location) : loc;
                  if (!nextLoc) return p;
                  const rawB = nextLoc.barangay;
                  const cleanB = (typeof rawB === 'object' && rawB !== null)
                    ? (rawB.name || rawB.displayName || '')
                    : (typeof rawB === 'string' ? rawB : '');
                  return {
                    ...p,
                    location: {
                      ...nextLoc,
                      barangay: cleanB,
                    },
                  };
                })}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
              />
            )}

            {currentStep === 2 && (
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

            {currentStep === 3 && (
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

            {currentStep === 4 && (
              <Step5ContactPreferences
                contactData={formData.contact}
                onContactChange={(cnt) => setFormData(p => ({ ...p, contact: cnt }))}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
              />
            )}

            {currentStep === 5 && (
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
