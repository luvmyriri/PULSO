import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  X,
  Check
} from 'lucide-react';
import { markTutorialCompleted } from '../../utils/appContext';
import { getAuthToken } from '../../utils/authSession';
import { useTheme } from '../../contexts/ThemeContext';
import { ONBOARDING_CONTENT } from '../../data/onboardingContent';

/**
 * MobileAppTutorial
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact, Self-Fitting First-Launch Onboarding for PULSO (Caloocan City).
 * Core Layout Invariants:
 * 1. Single full-height column (h-full / h-[100dvh]) that never exceeds viewport.
 * 2. Bottom button & sign-in link are ALWAYS visible inside the frame.
 * 3. Dead space eliminated: quiet cards contain lists and free space is shared
 *    naturally (~15-20% gap above the button on common 390x844 phones).
 * 4. Zero scrolling on all normal phone viewports (320x568 to 430x932).
 *    Internal fallback scroll only if viewport is tiny or text scaled to 200%.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function MobileAppTutorial({
  replayMode = false,
  isAuthenticated,
  onComplete,
  isTestMode = false,
  stepOverride,
  onStepChange,
  onNavigate,
  reducedMotion = false,
  externalContainerRef = null,
  themeModeOverride = null
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const themeContext = useTheme();

  // Language check (English default, Tagalog if set)
  const isTagalog = typeof window !== 'undefined' &&
    (localStorage.getItem('pulso_language') === 'tl' || localStorage.getItem('i18nextLng') === 'tl');
  const copy = isTagalog && ONBOARDING_CONTENT.tl ? ONBOARDING_CONTENT.tl : ONBOARDING_CONTENT;

  // Check authentication state
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(location?.search || '') : null;
  const fromProfile = searchParams?.get('from') === 'profile' || searchParams?.get('tab') === 'profile';
  const hasAuthToken = typeof window !== 'undefined' && Boolean(getAuthToken());
  const isResidentLoggedIn = isAuthenticated !== undefined ? isAuthenticated : (hasAuthToken || fromProfile);
  const returnToProfile = fromProfile || (replayMode && hasAuthToken) || (isResidentLoggedIn && !isTestMode);

  // Active theme calculation
  const activeSetting = themeModeOverride || themeContext?.theme || 'system';

  const [osPrefersDark, setOsPrefersDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setOsPrefersDark(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const isDark = themeModeOverride
    ? (themeModeOverride === 'dark' || (themeModeOverride === 'system' && osPrefersDark))
    : (themeContext?.isDark ?? (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : (activeSetting === 'dark' || (activeSetting === 'system' && osPrefersDark))));

  const [currentStep, setCurrentStep] = useState(stepOverride || 1);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [announcement, setAnnouncement] = useState('Step 1 of 5: ' + copy.screen1.title);

  const containerRef = useRef(null);
  const headingRef = useRef(null);

  const totalSteps = 5;

  // Preload logo image
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const img = new Image();
      img.src = '/city-engineering-logo.png';
    }
  }, []);

  useEffect(() => {
    if (stepOverride && stepOverride >= 1 && stepOverride <= totalSteps) {
      setCurrentStep(stepOverride);
    }
  }, [stepOverride]);

  const changeStep = (nextStep) => {
    setCurrentStep(nextStep);
    onStepChange?.(nextStep);
  };

  const finishTutorial = useCallback((destination = '/report', actionName = 'Finished tutorial') => {
    if (!isTestMode) {
      markTutorialCompleted();
    }
    if (isTestMode && onNavigate) {
      onNavigate(destination, actionName);
      return;
    }
    if (onComplete) {
      onComplete();
    } else if (returnToProfile) {
      navigate('/dashboard?tab=profile');
    } else if (replayMode) {
      if (getAuthToken()) {
        navigate('/dashboard?tab=profile');
      } else {
        navigate('/resident-home');
      }
    } else {
      if (getAuthToken()) {
        navigate('/dashboard?tab=profile');
      } else {
        navigate(destination);
      }
    }
  }, [navigate, onComplete, replayMode, isTestMode, onNavigate, returnToProfile]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      changeStep(currentStep + 1);
    } else {
      finishTutorial(
        returnToProfile ? '/dashboard?tab=profile' : '/register',
        returnToProfile ? 'Back to Settings tapped' : 'Create Account tapped'
      );
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      changeStep(currentStep - 1);
    } else if (replayMode || returnToProfile) {
      finishTutorial(returnToProfile ? '/dashboard?tab=profile' : '/dashboard', 'Close tutorial tapped');
    }
  };

  const handleSkip = () => {
    finishTutorial(returnToProfile ? '/dashboard?tab=profile' : '/report', 'Skip tapped');
  };

  const handleSignIn = () => {
    if (!isTestMode) {
      markTutorialCompleted();
    }
    if (isTestMode && onNavigate) {
      onNavigate('/login', 'Sign in tapped');
      return;
    }
    if (onComplete) onComplete();
    navigate('/login');
  };

  // Announce screen change for screen readers & move focus to heading
  useEffect(() => {
    const titles = [
      copy.screen1.title,
      copy.screen2.title,
      copy.screen3.title,
      copy.screen4.title,
      copy.screen5.title
    ];
    setAnnouncement(`Step ${currentStep} of ${totalSteps}: ${titles[currentStep - 1]}`);

    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, [currentStep, copy]);

  // Touch swipe support (left for next, right for back)
  const minSwipeDistance = 45;
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentStep < totalSteps) {
      handleNext();
    } else if (isRightSwipe && currentStep > 1) {
      handleBack();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' && currentStep < totalSteps) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        handleBack();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  // Plain theme solid background (#FFFFFF in light, #070A12 deep navy in dark)
  const solidBg = isDark ? '#070A12' : '#FFFFFF';

  // Primary action button label
  const primaryButtonLabel =
    currentStep === 1
      ? copy.screen1.primaryButton
      : currentStep === totalSteps
      ? returnToProfile
        ? copy.screen5.primaryButtonProfile
        : copy.screen5.primaryButton
      : copy.screen2.primaryButton;

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (externalContainerRef) {
          if (typeof externalContainerRef === 'function') externalContainerRef(node);
          else externalContainerRef.current = node;
        }
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      data-theme={isDark ? 'dark' : 'light'}
      style={{
        backgroundColor: solidBg,
        transition: reducedMotion ? 'none' : 'background-color 150ms ease, color 150ms ease'
      }}
      className={`relative w-full ${
        isTestMode ? 'h-full' : 'h-[100dvh] min-h-[100dvh] max-h-[100dvh]'
      } flex flex-col items-center select-none overflow-hidden font-sans ${
        isDark ? 'dark text-white' : 'text-slate-900'
      } ${reducedMotion ? '[&_*]:transition-none! [&_*]:animate-none!' : ''}`}
      role="region"
      aria-label="PULSO First Launch Tutorial"
    >
      {/* Live accessibility region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Centered Editorial Column: Strictly fills 100% of frame height */}
      <div className="relative z-10 w-full max-w-[440px] mx-auto h-full max-h-full flex flex-col justify-between px-5 sm:px-6 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] overflow-hidden">

        {/* ── 1. TOP BAR (Compact 48px to 54px) ── */}
        <header className="w-full flex items-center justify-between min-h-[48px] sm:min-h-[52px] shrink-0">
          {currentStep === 1 ? (
            /* Screen 1: Official LGU Hierarchy (CALOOCAN CITY / City Engineering Department / powered by: PULSO) */
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 ${isDark ? "border-slate-800 bg-slate-800" : "border-slate-200 bg-white"} border p-0.5 shadow-2xs`}>
                <img
                  src="/city-engineering-logo.png"
                  alt={ONBOARDING_CONTENT.header.sealAlt}
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/engineering-logo.jpg';
                  }}
                />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className={`font-heading font-black text-[9px] sm:text-[10px] tracking-tight ${isDark ? "text-slate-400" : "text-slate-500"} uppercase leading-none`}>
                  CALOOCAN CITY
                </span>
                <span className={`font-heading font-black text-xs sm:text-[13px] ${isDark ? "text-white" : "text-slate-900"} tracking-tight leading-tight mt-0.5`}>
                  City Engineering Department
                </span>
                <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-mono-data leading-none mt-0.5">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>powered by:</span>
                  <span className="font-heading font-black text-[#ff6b00] uppercase tracking-wider">PULSO</span>
                </div>
              </div>
            </div>
          ) : (
            /* Screens 2 to 5: Back Arrow + Logo + "City Engineering" */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                aria-label={ONBOARDING_CONTENT.header.backAria}
                className={`min-w-[44px] min-h-[44px] -ml-2 rounded-lg flex items-center justify-center ${isDark ? "text-slate-200 hover:text-white" : "text-slate-700 hover:text-slate-950"} active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]`}
              >
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <div className={`w-7 h-7 rounded-full overflow-hidden shrink-0 ${isDark ? "border-slate-800 bg-slate-800" : "border-slate-200 bg-white"} border p-0.5`}>
                <img
                  src="/city-engineering-logo.png"
                  alt={ONBOARDING_CONTENT.header.sealAlt}
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/engineering-logo.jpg';
                  }}
                />
              </div>
              <span className={`text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"} leading-tight`}>
                {ONBOARDING_CONTENT.header.shortTitle}
              </span>
            </div>
          )}

          {/* Right Action: Skip on Screens 1-4, balanced spacer on Screen 5 */}
          <div className="min-w-[44px] min-h-[44px] flex items-center justify-end">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleSkip}
                aria-label={ONBOARDING_CONTENT.header.skipAria}
                className={`min-h-[44px] min-w-[44px] -mr-2 px-2.5 py-1.5 text-xs sm:text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"} hover:text-slate-900 dark:hover:text-white active:scale-95 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-lg`}
              >
                {ONBOARDING_CONTENT.header.skipLabel}
              </button>
            ) : (replayMode || returnToProfile) ? (
              <button
                type="button"
                onClick={() => finishTutorial(returnToProfile ? '/dashboard?tab=profile' : '/dashboard', 'Close tutorial tapped')}
                aria-label="Close tutorial"
                className={`min-w-[44px] min-h-[44px] -mr-2 rounded-lg flex items-center justify-center ${isDark ? "text-slate-300" : "text-slate-600"} hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]`}
              >
                <X size={18} aria-hidden="true" />
              </button>
            ) : (
              <div className="w-10 h-10" aria-hidden="true" />
            )}
          </div>
        </header>

        {/* ── 2. THIN DIVIDER LINE ── */}
        <div className={`w-full h-px ${isDark ? "bg-slate-800" : "bg-slate-200"} shrink-0" aria-hidden="true`} />

        {/* ── 3. FIVE PROGRESS DOTS (Compact rhythm) ── */}
        <div
          role="status"
          aria-label={`Step ${currentStep} of ${totalSteps}`}
          className="w-full flex items-center gap-1.5 pt-2 pb-2 shrink-0"
        >
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum === currentStep;
            return (
              <span
                key={stepNum}
                aria-hidden="true"
                className={`transition-all duration-200 ease-out rounded-full ${
                  isActive
                    ? 'w-6 h-1.5 bg-[#ff6b00]'
                    : isDark ? 'w-1.5 h-1.5 bg-slate-700' : 'w-1.5 h-1.5 bg-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* ── 4. CONTENT ZONE: Uncarded, spacious double-spaced editorial layout ── */}
        <main className="flex-1 min-h-0 flex flex-col justify-between w-full py-2 overflow-y-auto">

          {/* ── SCREEN 1: WELCOME & PURPOSE ── */}
          {currentStep === 1 && (
            <div
              key="step-1"
              className="w-full flex-1 flex flex-col justify-between text-left transition-all duration-200 animate-fadeIn"
            >
              {/* Top Group: Eyebrow + Title + Subtitle */}
              <div className="pt-2 sm:pt-4">
                {/* Eyebrow Label */}
                <p className={`text-xs uppercase tracking-widest font-semibold ${isDark ? "text-slate-400" : "text-slate-500"} mb-2 sm:mb-2.5`}>
                  {copy.screen1.eyebrow}
                </p>

                {/* Title (Sentence Case, Left-Aligned, Breaking Gracefully to 2 Lines) */}
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={`text-2xl sm:text-[32px] font-extrabold ${isDark ? "text-white" : "text-slate-900"} leading-[1.18] tracking-tight mb-2.5 sm:mb-3 max-w-[16ch] outline-none`}
                >
                  {copy.screen1.title}
                </h1>

                {/* Short Subtitle (<= 12 words) */}
                <p className={`text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed max-w-[34ch]`}>
                  {copy.screen1.subtitle}
                </p>
              </div>

              {/* Middle Group: "How it works" + 3 Clean Step Rows with Double Spacing */}
              <div className="flex-1 flex flex-col justify-center py-6 sm:py-8">
                <h2 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-900"} mb-5 sm:mb-6`}>
                  {copy.screen1.howItWorksHeading}
                </h2>
                <ol className="w-full list-none pl-0 space-y-6 sm:space-y-8">
                  {copy.screen1.howItWorks.map((item) => (
                    <li key={item.number} className="flex items-center gap-4">
                      <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base flex items-center justify-center shrink-0 shadow-2xs ${isDark ? "border border-slate-700 bg-slate-800 text-white" : "border border-slate-300 bg-slate-100 text-slate-900"}`}>
                        {item.number}
                      </span>
                      <span className={`text-base sm:text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"} leading-snug`}>
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* ── SCREEN 2: HOW TO REPORT ── */}
          {currentStep === 2 && (
            <div
              key="step-2"
              className="w-full flex-1 flex flex-col justify-between text-left transition-all duration-200 animate-fadeIn"
            >
              <div className="pt-2 sm:pt-4">
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={`text-2xl sm:text-[30px] font-extrabold ${isDark ? "text-white" : "text-slate-900"} leading-tight tracking-tight mb-2 outline-none`}
                >
                  {copy.screen2.title}
                </h1>
                <p className={`text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed`}>
                  {copy.screen2.subtitle}
                </p>
              </div>

              {/* Open List with Unified Vertical Steps (Double Spaced) */}
              <div className="w-full flex-1 flex flex-col justify-center py-6 sm:py-8">
                <ol className="w-full relative list-none pl-0 space-y-7 sm:space-y-9" aria-label="3 steps to report">
                  {copy.screen2.steps.map((step, idx) => {
                    const isLast = idx === copy.screen2.steps.length - 1;
                    return (
                      <li key={step.number} className="relative flex items-start gap-4">
                        <div className="relative flex flex-col items-center shrink-0">
                          <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base flex items-center justify-center shrink-0 z-10 shadow-2xs ${isDark ? "border border-slate-700 bg-slate-800 text-white" : "border border-slate-300 bg-slate-100 text-slate-900"}`}>
                            {step.number}
                          </span>
                          {!isLast && (
                            <span
                              className={`absolute top-9 sm:top-10 bottom-[-28px] sm:bottom-[-36px] w-0.5 ${isDark ? "bg-slate-800" : "bg-slate-300"}`}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h2 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-900"} tracking-tight`}>
                            {step.title}
                          </h2>
                          <p className={`text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed mt-1`}>
                            {step.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}

          {/* ── SCREEN 3: HOW CITY ENGINEERING HELPS ── */}
          {currentStep === 3 && (
            <div
              key="step-3"
              className="w-full flex-1 flex flex-col justify-between text-left transition-all duration-200 animate-fadeIn"
            >
              <div className="pt-2 sm:pt-4">
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={`text-2xl sm:text-[30px] font-extrabold ${isDark ? "text-white" : "text-slate-900"} leading-tight tracking-tight mb-2 outline-none`}
                >
                  {copy.screen3.title}
                </h1>
                <p className={`text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed`}>
                  {copy.screen3.subtitle}
                </p>
              </div>

              {/* Open List with Unified Stages (Double Spaced) */}
              <div className="w-full flex-1 flex flex-col justify-center py-6 sm:py-8">
                <ol className="w-full relative list-none pl-0 space-y-7 sm:space-y-9" aria-label="What happens after reporting">
                  {copy.screen3.steps.map((step, idx) => {
                    const isLast = idx === copy.screen3.steps.length - 1;
                    return (
                      <li key={step.number} className="relative flex items-start gap-4">
                        <div className="relative flex flex-col items-center shrink-0">
                          <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base flex items-center justify-center shrink-0 z-10 shadow-2xs ${isDark ? "border border-slate-700 bg-slate-800 text-white" : "border border-slate-300 bg-slate-100 text-slate-900"}`}>
                            {step.number}
                          </span>
                          {!isLast && (
                            <span
                              className={`absolute top-9 sm:top-10 bottom-[-28px] sm:bottom-[-36px] w-0.5 ${isDark ? "bg-slate-800" : "bg-slate-300"}`}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h2 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-900"} tracking-tight`}>
                            {step.title}
                          </h2>
                          <p className={`text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed mt-1`}>
                            {step.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}

          {/* ── SCREEN 4: FOLLOW YOUR REPORT ── */}
          {currentStep === 4 && (
            <div
              key="step-4"
              className="w-full flex-1 flex flex-col justify-between text-left transition-all duration-200 animate-fadeIn"
            >
              <div className="pt-2 sm:pt-3">
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={`text-2xl sm:text-[28px] font-extrabold ${isDark ? "text-white" : "text-slate-900"} leading-tight tracking-tight mb-1.5 outline-none`}
                >
                  {copy.screen4.title}
                </h1>
                <p className={`text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed`}>
                  {copy.screen4.subtitle}
                </p>
              </div>

              <div className="w-full flex-1 flex flex-col justify-center py-4 sm:py-6">
                {/* Example Report Card */}
                <div className={`w-full rounded-2xl border p-4 sm:p-5 mb-5 sm:mb-6 shadow-xs ${isDark ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-slate-50"}`}>
                  <div className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-slate-500"} mb-1.5`}>
                    {copy.screen4.exampleBadge}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-mono text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-900"} tracking-tight`}>
                      {copy.screen4.sampleTrackingCode}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? "bg-orange-500/15 text-[#FF8A3D] border border-orange-500/30" : "bg-orange-50 text-[#d95d00] border border-orange-200"}`}>
                      {copy.screen4.statusBadge}
                    </span>
                  </div>
                </div>

                {/* Status Timeline directly on background with Double Spacing */}
                <ol className="w-full relative list-none pl-0 space-y-5 sm:space-y-6" aria-label="Report status progression">
                  {/* 1. Received */}
                  <li className="relative flex items-start gap-3.5">
                    <div className="relative flex flex-col items-center shrink-0">
                      <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#ff6b00] text-white flex items-center justify-center shrink-0 z-10 shadow-2xs">
                        <Check size={15} strokeWidth={3} className="text-white" aria-hidden="true" />
                      </span>
                      <span
                        className={`absolute top-7 sm:top-8 bottom-[-20px] sm:bottom-[-24px] w-0.5 ${isDark ? "bg-slate-800" : "bg-slate-300"}`}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h2 className={`text-sm sm:text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {copy.screen4.milestones[0].title}
                      </h2>
                      <p className={`text-xs sm:text-sm ${isDark ? "text-slate-300" : "text-slate-600"} mt-0.5 leading-relaxed`}>
                        {copy.screen4.milestones[0].description}
                      </p>
                    </div>
                  </li>

                  {/* 2. In progress */}
                  <li className="relative flex items-start gap-3.5">
                    <div className="relative flex flex-col items-center shrink-0">
                      <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#ff6b00] font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 z-10 shadow-2xs ${isDark ? "bg-slate-800 text-[#ff6b00]" : "bg-white text-[#ff6b00]"}`}>
                        2
                      </span>
                      <span
                        className={`absolute top-7 sm:top-8 bottom-[-20px] sm:bottom-[-24px] w-0.5 ${isDark ? "bg-slate-800" : "bg-slate-300"}`}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2">
                        <h2 className={`text-sm sm:text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {copy.screen4.milestones[1].title}
                        </h2>
                        <span className="text-xs font-bold text-[#ff6b00] tracking-wide">
                          {copy.screen4.milestones[1].badge}
                        </span>
                      </div>
                      <p className={`text-xs sm:text-sm ${isDark ? "text-slate-300" : "text-slate-600"} mt-0.5 leading-relaxed`}>
                        {copy.screen4.milestones[1].description}
                      </p>
                    </div>
                  </li>

                  {/* 3. Resolved */}
                  <li className="relative flex items-start gap-3.5">
                    <div className="relative flex flex-col items-center shrink-0">
                      <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center shrink-0 z-10 text-xs sm:text-sm font-semibold ${isDark ? "border-slate-700 text-slate-400" : "border-slate-300 text-slate-500"}`}>
                        3
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h2 className={`text-sm sm:text-base font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                        {copy.screen4.milestones[2].title}
                      </h2>
                      <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-slate-500"} mt-0.5 leading-relaxed`}>
                        {copy.screen4.milestones[2].description}
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* ── SCREEN 5: YOU ARE READY ── */}
          {currentStep === 5 && (
            <div
              key="step-5"
              className="w-full flex-1 flex flex-col justify-between text-left transition-all duration-200 animate-fadeIn"
            >
              {/* Top Group: Badge + Title + Subtitle */}
              <div className="pt-3 sm:pt-6">
                {/* Green Check Badge in Rounded Circle */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${isDark ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-600"} border flex items-center justify-center mb-4 sm:mb-5 shadow-xs`}
                  aria-hidden="true"
                >
                  <Check size={28} strokeWidth={2.5} />
                </div>

                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={`text-2xl sm:text-[32px] font-extrabold ${isDark ? "text-white" : "text-slate-900"} leading-tight tracking-tight mb-2.5 sm:mb-3 outline-none`}
                >
                  {copy.screen5.title}
                </h1>
                <p className={`text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed max-w-[34ch]`}>
                  {copy.screen5.subtitle}
                </p>
              </div>

              {/* Middle Group: Raised Assurance Card */}
              <div className="w-full flex-1 flex flex-col justify-center py-6 sm:py-8">
                <div className={`w-full rounded-2xl border p-5 sm:p-6 shadow-xs ${isDark ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-slate-50"}`}>
                  <h2 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-900"} mb-2`}>
                    {copy.screen5.cardTitle}
                  </h2>
                  <p className={`text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed`}>
                    {copy.screen5.cardDescription}
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* ── 5. BOTTOM ACTION ZONE (Pinned & Visible at Bottom) ── */}
        <div role="region" aria-label="Action buttons" className="w-full shrink-0 pt-2 pb-0.5 bg-transparent">
          {/* Full-width 52px-56px Primary Button: Label on LEFT, Arrow on RIGHT */}
          <button
            type="button"
            onClick={handleNext}
            className="w-full min-h-[50px] h-[52px] sm:h-14 rounded-[14px] bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] font-bold text-sm sm:text-base px-5 flex items-center justify-between text-white shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ff6b00]"
          >
            <span className="text-white font-bold">{primaryButtonLabel}</span>
            <ArrowRight size={18} className="text-white shrink-0" aria-hidden="true" />
          </button>

          {/* Secondary Sign-In Link on Screens 1 & 5 */}
          <div className="mt-1 min-h-[38px] h-9 flex items-center justify-center">
            {currentStep === 1 && !isResidentLoggedIn ? (
              <div className={`text-center text-xs sm:text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {copy.screen1.secondaryText}{' '}
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="min-h-[38px] px-1 font-bold text-[#ff6b00] hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-lg transition-colors inline-flex items-center"
                >
                  {copy.screen1.secondaryLink}
                </button>
              </div>
            ) : currentStep === totalSteps && !isResidentLoggedIn ? (
              <div className={`text-center text-xs sm:text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {copy.screen5.secondaryText}{' '}
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="min-h-[38px] px-1 font-bold text-[#ff6b00] hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-lg transition-colors inline-flex items-center"
                >
                  {copy.screen5.secondaryLink}
                </button>
              </div>
            ) : (
              /* Screens 2, 3, 4: Fixed spacer to preserve exact viewport height without jump */
              <div className="h-9" aria-hidden="true" />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
