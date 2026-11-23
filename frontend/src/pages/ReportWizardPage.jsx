import NativeAppHeader, { NativeResidentAccountLink } from '../components/mobile/NativeAppHeader';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { finishReportIntake, locationEvidence, hasReportLocation, submitReportIntake, pendingReportIntake, recoverReportIntake } from '../utils/reportIntake';
import useResidentReportDraft, {useReportDraftPrincipal} from '../hooks/useResidentReportDraft';
import {packResidentPhoto,unpackResidentPhoto,reportDraftPrincipal} from '../utils/residentReportDraft';
import ResidentDraftStatus from '../components/report-wizard/ResidentDraftStatus';
import { API_BASE_URL } from '../utils/apiBase';
import { getStoredToken, getStoredUser } from '../utils/auth';
import { useAndroidBack } from '../utils/nativeAndroid';
import { isNativeAndroid } from '../utils/appContext';

import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import WizardSidebar, { REPORT_STEPS } from '../components/report-wizard/WizardSidebar';
import Step1CategoryEmergency, { parseSelectedCategoryIds } from '../components/report-wizard/Step1CategoryEmergency';
import Step2CameraLocation from '../components/report-wizard/Step2CameraLocation';
import Step4DetailsDuplicate from '../components/report-wizard/Step4DetailsDuplicate';
import Step5ContactPreferences from '../components/report-wizard/Step5ContactPreferences';
import Step6ReviewConsent from '../components/report-wizard/Step6ReviewConsent';
import { Home } from 'lucide-react';

function wizardForm(data) {
  const saved=data?.formData || {}, savedLocation=saved.location || {}, restored=unpackResidentPhoto(data?.photo);
  const rawArea=savedLocation.barangay;
  const area=typeof rawArea==='string'?rawArea:rawArea?.name || rawArea?.displayName || '';
  return {
    category:typeof saved.category==='string'?saved.category:'',
    location:{lat:null,lng:null,address:'',landmark:'',isInCaloocan:false,...savedLocation,
      barangay:area},
    evidence:{file:restored.file,previewUrl:restored.file?URL.createObjectURL(restored.file):null,
      fileName:restored.file?.name || '',fileSize:restored.file?.size || 0,mimeType:restored.file?.type || '',
      ...restored.provenance,aiCategorySuggestion:saved.evidence?.aiCategorySuggestion || null,
      aiConfidence:saved.evidence?.aiConfidence || null,isAiScanning:false},
    details:{description:'',urgency:'medium',...saved.details},
    contact:{type:'notify',name:'',email:'',phone:'',...saved.contact},
  };
}

export default function ReportWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Centralized Google Maps API loader state
  const { isLoaded: isMapLoaded } = useGoogleMaps();

  const firstStepRequested=useRef(Boolean(location.state?.startAtStepOne));
  const [currentStep,setCurrentStep]=useState(1);
  const [maxStepReached,setMaxStepReached]=useState(1);
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [announcement,setAnnouncement]=useState('');
  const [submissionError,setSubmissionError]=useState(null);
  const [isHelpGuideOpen,setIsHelpGuideOpen]=useState(false);
  const [pendingSubmission,setPendingSubmission]=useState(false);
  const [formData,setFormData]=useState(()=>wizardForm(null));
  const principal=useReportDraftPrincipal();
  const stepSection=useRef(null);
  const {category,location:issueLocation,details,contact,evidence}=formData;
  const storedEvidence=useMemo(()=>({source:evidence.source,capturedAt:evidence.capturedAt,
    photoDeviceFix:evidence.photoDeviceFix,aiCategorySuggestion:evidence.aiCategorySuggestion,aiConfidence:evidence.aiConfidence}),
    [evidence.source,evidence.capturedAt,evidence.photoDeviceFix,evidence.aiCategorySuggestion,evidence.aiConfidence]);
  const draftData=useMemo(()=>({currentStep,maxStepReached,
    formData:{category,location:issueLocation,details,contact,evidence:storedEvidence},
    photo:packResidentPhoto(evidence.file,storedEvidence)}),
    [currentStep,maxStepReached,category,issueLocation,details,contact,storedEvidence,evidence.file]);
  const restoreDraft=useCallback(value=>{
    setFormData(wizardForm(value));
    setCurrentStep(firstStepRequested.current?1:Math.min(5,Math.max(1,Number(value?.currentStep)||1)));
    setMaxStepReached(Math.min(5,Math.max(1,Number(value?.maxStepReached)||1)));
    setAnnouncement('');
    if(value)firstStepRequested.current=false;
  },[]);
  const draft=useResidentReportDraft({kind:'wizard',principal,data:draftData,restore:restoreDraft,
    hasContent:Boolean(evidence.file||category||details.description||contact.name||contact.email||contact.phone)});
  useEffect(()=>{
    const check=()=>{try{setPendingSubmission(Boolean(pendingReportIntake('wizard',getStoredToken())));}
      catch(error){setPendingSubmission(true);setSubmissionError(error.message);}};
    check();window.addEventListener('storage',check);window.addEventListener('pulso-intake-state',check);
    return()=>{window.removeEventListener('storage',check);window.removeEventListener('pulso-intake-state',check);};
  },[principal]);
  useEffect(()=>{if(draft.ready&&!pendingSubmission)stepSection.current?.focus({preventScroll:true});},[draft.ready,pendingSubmission,currentStep]);
  useEffect(()=>{
    const url=formData.evidence.previewUrl;
    return()=>{if(url?.startsWith('blob:'))URL.revokeObjectURL(url);};
  },[formData.evidence.previewUrl]);
  useEffect(()=>{
    if(!location.state?.startAtStepOne)return;
    const state={...location.state};delete state.startAtStepOne;
    navigate({pathname:location.pathname,search:location.search,hash:location.hash},{replace:true,state});
  },[location,navigate]);

  // Retain account-scoped photo drafts before native or web header navigation.
  async function handleHeaderNavigation(event) {
    event.preventDefault();
    if (isSubmitting || draft.locked || pendingSubmission) return;
    const destination = event.currentTarget.getAttribute('href') || '/';
    try {
      await draft.flush();
      navigate(destination);
    } catch (error) {
      setSubmissionError(error.message || t('residentDraft.save_error'));
    }
  }

  // Step Navigation
  const goToNextStep = () => {
    if(draft.locked||pendingSubmission)return;
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
    } else if (isNativeAndroid()) {
      navigate('/', { replace: true });
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
    if(draft.locked||pendingSubmission)return;
    if (stepNumber >= 1 && stepNumber <= 5 && stepNumber <= maxStepReached) {
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnnouncement(`Step ${stepNumber} of 5`);
    }
  };

  // Final Atomic Report Submission
  const acceptReceipt=async(lastSuccessData,token)=>{
    if(reportDraftPrincipal(getStoredToken(),getStoredUser())!==principal)throw new Error('The account changed. Recover the original report from its original account.');
    finishReportIntake('wizard',token);
    let draftCleanupWarning=false;
    try{await draft.clear({confirmed:true});}catch{draftCleanupWarning=true;}
    if(reportDraftPrincipal(getStoredToken(),getStoredUser())!==principal)throw new Error(t('residentDraft.accountChanged'));
    setPendingSubmission(false);
    navigate('/report/success',{state:{ticketId:lastSuccessData.ticket_id,
      trackingToken:lastSuccessData.tracking_token,trackingUrl:lastSuccessData.tracking_url,
      category:(lastSuccessData.categories||[lastSuccessData.category]).join(' + '),
      locationString:lastSuccessData.location_string,createdAt:lastSuccessData.created_at || null,
      reporterType:lastSuccessData.reporter_type,report:lastSuccessData,draftCleanupWarning}});
  };
  const handleRecover=async()=>{
    if(isSubmitting)return;setIsSubmitting(true);setSubmissionError(null);
    try{const token=getStoredToken();const receipt=await recoverReportIntake({token,apiBase:API_BASE_URL,draftKey:'wizard'});await acceptReceipt(receipt,token);}
    catch(error){setSubmissionError(error.message);try{setPendingSubmission(Boolean(pendingReportIntake('wizard',getStoredToken())));}catch{setPendingSubmission(true);}}
    finally{setIsSubmitting(false);}
  };
  const handleSubmitReport = async () => {
    if (isSubmitting || draft.locked || pendingSubmission) return;
    if (!hasReportLocation(formData.location) || formData.location.isInCaloocan === false) {
      setCurrentStep(1);
      setSubmissionError(t('reportAutomation.locationMissing'));
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
    const submissionToken=getStoredToken();

    try {
      await draft.flush();
      if(reportDraftPrincipal(getStoredToken(),getStoredUser())!==principal)throw new Error(t('residentDraft.accountChanged'));
      const selectedCats = parseSelectedCategoryIds(formData.category);
      const categoriesToSubmit = selectedCats.length > 0 ? selectedCats.slice(0, 3) : [formData.category || 'Roads & Bridges'];
      const token = submissionToken;

      const lastSuccessData = await submitReportIntake({
        fields: {
          category: categoriesToSubmit[0], categories: categoriesToSubmit,
          description: formData.details.description,
          lat: formData.location.lat, lng: formData.location.lng,
          location_string: [formData.location.address, formData.location.landmark?.trim()].filter(Boolean).join(' Â· '),
          location_barangay: formData.location.barangay || '',
          location_metadata: locationEvidence(formData.location, formData.evidence),
          urgency: formData.details.urgency || 'medium',
          reporter_name: formData.contact?.name?.trim(),
          contact_email: formData.contact?.email, contact_phone: formData.contact?.phone,
          submission_source: token ? 'web_resident' : 'web_guest',
        },
        image: evidenceFile || formData.evidence.file, token, apiBase: API_BASE_URL, draftKey: 'wizard',
      });
      await acceptReceipt(lastSuccessData,token);
    } catch (err) {
      console.error('Submission network error:', err);
      setSubmissionError(err.message || 'An unexpected network error occurred. Your draft remains safely preserved.');
      try{setPendingSubmission(Boolean(pendingReportIntake('wizard',getStoredToken())));}catch{setPendingSubmission(true);}
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

      {/* â”€â”€ Top Header: Logo on top-left & Home Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isNativeAndroid() ? (
        <NativeAppHeader appearance="hero" transparent sticky={false} onBrandClick={handleHeaderNavigation}>
          <NativeResidentAccountLink signedIn={Boolean(getStoredToken()) && getStoredUser()?.role === 'resident'} onClick={handleHeaderNavigation} />
        </NativeAppHeader>
      ) : (
        <header className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 sm:pt-3.5 w-full flex justify-between items-center gap-3">
        {/* Logo on top-left linking to home */}
        <Link
          to="/resident-home"
          onClick={handleHeaderNavigation}
          className="flex min-w-0 flex-1 items-center gap-2 group transition-opacity hover:opacity-90 cursor-pointer"
          title="Caloocan City PULSO Home"
        >
          <Branding size="h-8 w-8 sm:h-9 sm:w-9" className="min-w-0 max-w-full" />
        </Link>

        {/* Right side: Theme Toggle & Home Navigation */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <ThemeToggle />
          <Link
            to="/resident-home"
            onClick={handleHeaderNavigation}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] border border-slate-200/90 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Return to Home Section"
            aria-label="Home"
          >
            <Home size={14} className="text-[#ff6b00]" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>
      )}

      {/* Main Responsive Container */}
      <main className="max-w-7xl min-w-0 w-full mx-auto px-3 sm:px-6 pt-2 sm:pt-3 pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-6 flex flex-col">
        <ResidentDraftStatus draft={draft} pending={pendingSubmission} recovering={isSubmitting} onRecover={handleRecover}/>
        {submissionError&&<p role="alert" className="text-sm text-red-700 dark:text-red-300 py-2">{submissionError}</p>}
        <fieldset disabled={draft.locked||pendingSubmission||isSubmitting} className={draft.ready&&!pendingSubmission?'contents':'hidden'} aria-label={t('residentDraft.editing')}>
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
          {draft.ready&&!pendingSubmission&&<section
            ref={stepSection} tabIndex={-1}
            aria-label={`Step ${currentStep} form content`}
            className="lg:flex-1 min-w-0 w-full lg:min-h-[540px] rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-5 md:p-6 shadow-2xs flex flex-col justify-between"
          >
            {draft.ready && !pendingSubmission && currentStep === 1 && (
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
                onBack={goToPreviousStep}
                onSubmit={handleSubmitReport}
              />
            )}
          </section>}
        </div>
        </fieldset>
      </main>
    </div>
  );
}
