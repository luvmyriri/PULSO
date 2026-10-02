import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { API_BASE_URL } from '../utils/apiBase';
import { getStoredToken } from '../utils/auth';
import { CALOOCAN_CENTERS } from '../utils/geospatial';

import WizardHeader from '../components/report-wizard/WizardHeader';
import WizardSignalCutRail from '../components/report-wizard/WizardSignalCutRail';
import Step1CategoryEmergency from '../components/report-wizard/Step1CategoryEmergency';
import Step2LocationMap from '../components/report-wizard/Step2LocationMap';
import Step3EvidenceUpload from '../components/report-wizard/Step3EvidenceUpload';
import Step4DetailsDuplicate from '../components/report-wizard/Step4DetailsDuplicate';
import Step5ContactPreferences from '../components/report-wizard/Step5ContactPreferences';
import Step6ReviewConsent from '../components/report-wizard/Step6ReviewConsent';
import DuplicateWarningModal from '../components/report-wizard/DuplicateWarningModal';

const DRAFT_STORAGE_KEY = 'pulso_report_wizard_draft_v1';

export default function ReportWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Centralized Google Maps API loader state
  const { isLoaded: isMapLoaded } = useGoogleMaps();

  // Stepper State (1 - 6)
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [duplicateModalData, setDuplicateModalData] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);

  // Consolidated Form State
  const [formData, setFormData] = useState({
    category: '',
    location: {
      lat: CALOOCAN_CENTERS.north.lat,
      lng: CALOOCAN_CENTERS.north.lng,
      address: 'Caloocan City Hall North, Camarin Rd',
      barangay: 'Barangay 174 (Camarin)',
      landmark: '',
      isInCaloocan: true,
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
  });


  // Auto-Save Draft to LocalStorage (debounced 400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const draftPayload = {
          version: 1,
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
    if (!formData.consentAccepted) return;
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const submitData = new FormData();
      submitData.append('category', formData.category);
      submitData.append('description', formData.details.description);
      submitData.append('lat', String(formData.location.lat));
      submitData.append('lng', String(formData.location.lng));
      submitData.append('location_string', formData.location.address || `Lat: ${formData.location.lat}, Lng: ${formData.location.lng}`);
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
          // Hard duplicate conflict returned from server
          setDuplicateModalData({
            ticketId: errorData.conflict_ticket_id || errorData.detail?.match(/RPT-[\w-]+/)?.[0] || 'RPT-EXISTING',
            category: formData.category,
            distance: errorData.distance_meters || 15,
            status: 'Active Field Order',
          });
        } else if (response.status === 422) {
          setSubmissionError(errorData.detail || 'Form validation failed. Please check your inputs.');
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Screen Reader Live Region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Top Header */}
      <WizardHeader currentStep={currentStep} totalSteps={6} />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
        {/* Signal Cut Visual Step Rail */}
        <WizardSignalCutRail 
          currentStep={currentStep} 
          maxStepReached={maxStepReached} 
          onStepClick={jumpToStep} 
        />

        {/* Global Submission Error Callout */}
        {submissionError && (
          <div className="mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-sm text-red-800 dark:text-red-300 shadow-sm">
            <p className="font-bold">Notice:</p>
            <p>{submissionError}</p>
          </div>
        )}

        {/* Dynamic Step Views */}
        <div className="mt-6 flex-1">
          {currentStep === 1 && (
            <Step1CategoryEmergency 
              selectedCategory={formData.category}
              onSelectCategory={(cat) => setFormData(p => ({ ...p, category: cat }))}
              onContinue={goToNextStep}
            />
          )}

          {currentStep === 2 && (
            <Step2LocationMap 
              isMapLoaded={isMapLoaded}
              locationData={formData.location}
              onLocationChange={(loc) => setFormData(p => ({ ...p, location: loc }))}
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
        </div>
      </main>

      {/* Duplicate Conflict Warning Modal */}
      {duplicateModalData && (
        <DuplicateWarningModal 
          isOpen={true}
          duplicateData={duplicateModalData}
          onClose={() => setDuplicateModalData(null)}
          onAttachEvidence={() => {
            alert(`Evidence linked to canonical ticket ${duplicateModalData.ticketId}.`);
            setDuplicateModalData(null);
            navigate(`/track?id=${duplicateModalData.ticketId}`);
          }}
          onProceedAnyway={() => {
            setDuplicateModalData(null);
            handleSubmitReport();
          }}
        />
      )}
    </div>
  );
}
