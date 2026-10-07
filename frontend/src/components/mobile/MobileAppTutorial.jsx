import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PulsoIcon from '../common/PulsoIcon';
import { markTutorialCompleted } from '../../utils/appContext';
import { getAuthToken } from '../../utils/authSession';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * MobileAppTutorial
 * ─────────────────────────────────────────────────────────────────────────────
 * First-Launch Resident Onboarding Tutorial for the installed PULSO Mobile App.
 *
 * Global Typography & Design Contract:
 * - Single font family: Inter across all headings, body, buttons, and labels.
 * - Shared Type Scale:
 *   - Display (Screen 1 heading): 32px mobile / 44px desktop, bold 700, -0.02em tracking
 *   - Heading 1 (Screens 2-5): 28px mobile / 36px desktop, bold 700
 *   - Card title (Screen 2 steps): 18px mobile / 20px desktop, semibold 600
 *   - Body: 16px (1rem), regular 400, line-height 1.5, soft gray
 *   - Small text (secondary notes, steps): 14px (0.875rem), regular 400 (min read size)
 *   - Badges / Captions: 13px (0.8125rem), medium 500, sentence case (no monospace)
 *   - Primary button: 16px (1rem), semibold 600, sentence case
 *   - Tracking code: Inter with tabular figures (tabular-nums)
 * - Centered headings with balanced text wrapping (text-wrap: balance).
 * - Light (Morning Field Sheet) and Dark (Night Inspection) blended backgrounds.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function MobileAppTutorial({
  replayMode = false,
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
  const themeContext = useTheme();

  // Active theme calculation (test override or app ThemeContext)
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

  // Determine whether active view renders Dark or Light
  const isDark = activeSetting === 'dark' || (activeSetting === 'system' && osPrefersDark);

  const [currentStep, setCurrentStep] = useState(stepOverride || 1);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [announcement, setAnnouncement] = useState('Step 1 of 5: Report city problems in minutes.');
  const containerRef = useRef(null);

  const totalSteps = 5;

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
    } else if (replayMode) {
      if (getAuthToken()) {
        navigate('/dashboard');
      } else {
        navigate('/resident-home');
      }
    } else {
      if (getAuthToken()) {
        navigate('/dashboard');
      } else {
        navigate(destination);
      }
    }
  }, [navigate, onComplete, replayMode, isTestMode, onNavigate]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      changeStep(currentStep + 1);
    } else {
      finishTutorial('/register', 'Register tapped');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      changeStep(currentStep - 1);
    } else if (replayMode) {
      finishTutorial('/dashboard', 'Close tutorial tapped');
    }
  };

  const handleSkip = () => {
    finishTutorial('/report', 'Skip tapped');
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

  // Announce screen change for assistive technologies
  useEffect(() => {
    const titles = [
      'Report city problems in minutes.',
      "Tell us what's wrong.",
      'City Engineering gets your report.',
      'Follow your report.',
      "You're ready."
    ];
    setAnnouncement(`Step ${currentStep} of ${totalSteps}: ${titles[currentStep - 1]}`);
  }, [currentStep]);

  // Touch gesture handling (swipe left for next, swipe right for back)
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

  // Shared Blended Background styling:
  const blendedBackgroundStyle = isDark
    ? {
        backgroundColor: '#070a12',
        backgroundImage: 'radial-gradient(ellipse 110% 45% at 50% 0%, rgba(255, 107, 0, 0.14) 0%, rgba(255, 107, 0, 0.04) 28%, transparent 45%)'
      }
    : {
        backgroundColor: '#f8f7f5',
        backgroundImage: 'radial-gradient(ellipse 110% 45% at 50% 0%, rgba(255, 107, 0, 0.10) 0%, rgba(255, 107, 0, 0.03) 26%, transparent 45%)'
      };

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
      style={blendedBackgroundStyle}
      className={`relative w-full ${
        isTestMode ? 'h-full' : 'h-[100dvh]'
      } max-w-md mx-auto flex flex-col justify-between px-5 pt-3 pb-5 sm:pb-6 select-none overflow-hidden font-sans transition-colors duration-150 ${
        isDark ? 'text-white' : 'text-slate-900'
      } ${reducedMotion ? '[&_*]:transition-none! [&_*]:animate-none!' : ''}`}
      role="region"
      aria-label="PULSO First Launch Tutorial"
    >
      {/* Live accessibility region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* ── TOP BAR: Back Button, Progress Dots, Skip/Close Button ── */}
      <header className="relative z-10 w-full flex items-center justify-between h-12 shrink-0">
        {/* Back Button (48x48px tap target) */}
        <div className="w-12 h-12 flex items-center justify-start">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go to previous screen"
              className={`w-12 h-12 -ml-2 rounded-full flex items-center justify-center active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PulsoIcon
                name="back"
                size={24}
                className={isDark ? 'text-slate-300' : 'text-slate-700'}
              />
            </button>
          ) : replayMode ? (
            <button
              type="button"
              onClick={() => finishTutorial('/dashboard')}
              aria-label="Close tutorial"
              className={`w-12 h-12 -ml-2 rounded-full flex items-center justify-center active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PulsoIcon
                name="close"
                size={20}
                className={isDark ? 'text-slate-300' : 'text-slate-700'}
              />
            </button>
          ) : (
            <div className="w-12 h-12" aria-hidden="true" />
          )}
        </div>

        {/* 5 Progress Dots */}
        <nav
          className="flex items-center gap-1.5"
          aria-label={`Tutorial progress: Step ${currentStep} of ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum === currentStep;
            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => changeStep(stepNum)}
                aria-label={`Go to Step ${stepNum} of ${totalSteps}${isActive ? ' (Current)' : ''}`}
                className={`transition-all duration-200 rounded-full h-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                  isActive
                    ? 'w-7 bg-[#ff6b00]'
                    : isDark
                    ? 'w-2 bg-slate-700/80 hover:bg-slate-500'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            );
          })}
        </nav>

        {/* Skip Button (screens 1-4, 48x48px tap target, pulso-small 14px) */}
        <div className="w-12 h-12 flex items-center justify-end">
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Skip onboarding tutorial"
              className={`min-h-[48px] min-w-[48px] -mr-2 px-3 py-2 pulso-small font-medium active:scale-95 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                isDark
                  ? 'text-[#ff8a3d] hover:text-orange-300'
                  : 'text-[#c2410c] hover:text-[#9a3412]'
              }`}
            >
              Skip
            </button>
          ) : replayMode ? (
            <button
              type="button"
              onClick={() => finishTutorial('/dashboard')}
              aria-label="Close tutorial"
              className={`w-12 h-12 -mr-2 rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <PulsoIcon
                name="close"
                size={20}
                className={isDark ? 'text-slate-400' : 'text-slate-600'}
              />
            </button>
          ) : (
            <div className="w-12 h-12" aria-hidden="true" />
          )}
        </div>
      </header>

      {/* ── 2. CONTENT ZONE: Vertical Centering slightly above true center (~45% from top) ── */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center w-full min-h-0 py-2 pb-[6%]">
        
        {/* ── SCREEN 1: WELCOME ── */}
        {currentStep === 1 && (
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center items-center text-center animate-fadeIn">
            {/* Real Caloocan City seal with faint decorative rings (aria-hidden) */}
            <div className="relative flex items-center justify-center mb-6">
              {/* Faint decorative outer ring */}
              <div
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-orange-500/15 absolute pointer-events-none"
                aria-hidden="true"
              />
              {/* Faint decorative inner ring */}
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-orange-500/20 absolute pointer-events-none"
                aria-hidden="true"
              />

              {/* Seal container */}
              <div
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 flex items-center justify-center overflow-hidden shadow-sm transition-colors ${
                  isDark
                    ? 'bg-slate-900 border border-slate-800'
                    : 'bg-white border border-slate-200/90'
                }`}
              >
                <img
                  src="/city-engineering-logo.png"
                  alt="Official Caloocan City Seal"
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/engineering-logo.jpg';
                  }}
                />
              </div>
            </div>

            {/* Display Heading: strictly 2 lines ("Report city problems" / "in minutes.") */}
            <h1
              className={`font-bold text-center mx-auto mb-3 transition-colors text-[1.5rem] min-[380px]:text-[1.65rem] min-[420px]:text-[1.8rem] leading-[1.18] tracking-tight ${
                isDark ? 'text-white' : 'text-[#0c2436]'
              }`}
            >
              <span className="block">Report city problems</span>
              <span className="block">in minutes.</span>
            </h1>

            {/* Body Text (1rem, max 2 lines, max-width 30ch, pretty wrapping) */}
            <p
              style={{
                maxWidth: '30ch'
              }}
              className={`text-[1rem] leading-[1.5] font-normal text-center mx-auto transition-colors [text-wrap:pretty] ${
                isDark ? 'text-slate-300' : 'text-[#475569]'
              }`}
            >
              PULSO is Caloocan City&apos;s direct line to City Engineering for fast repairs.
            </p>
          </div>
        )}

        {/* ── SCREEN 2: REPORT IT (Simplified, 3-Step Numbered List, Jargon-Free) ── */}
        {currentStep === 2 && (
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center animate-fadeIn">
            {/* Centered Heading & Subtitle Block */}
            <div className="text-center mb-6">
              <h2
                className={`pulso-h1 font-bold text-center transition-colors [text-wrap:balance] ${
                  isDark ? 'text-white' : 'text-[#0c2436]'
                }`}
              >
                Tell us what&apos;s wrong.
              </h2>
              <p
                className={`pulso-body font-normal text-center mt-2 transition-colors [text-wrap:pretty] ${
                  isDark ? 'text-slate-300' : 'text-[#475569]'
                }`}
              >
                Three quick steps. No technical knowledge needed.
              </p>
            </div>

            {/* Semantic Ordered List: Real <ol> and <li>, clearly non-interactive */}
            <ol className="w-full space-y-4 text-left" aria-label="Reporting steps">
              {/* Step 1: Take a photo */}
              <li className="flex items-start gap-3.5">
                <div
                  className={`w-8 h-8 rounded-full bg-[#ff6b00] font-bold flex items-center justify-center text-sm tabular-nums shrink-0 shadow-2xs ${
                    isDark ? 'text-white' : 'text-[#070a12]'
                  }`}
                  aria-hidden="true"
                >
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <PulsoIcon
                      name="photo"
                      size={20}
                      className={isDark ? 'text-slate-200 shrink-0' : 'text-[#334155] shrink-0'}
                    />
                    <h3
                      className={`text-[1rem] sm:text-[1.0625rem] font-semibold tracking-tight whitespace-nowrap transition-colors ${
                        isDark ? 'text-white' : 'text-[#0c2436]'
                      }`}
                    >
                      Take a photo
                    </h3>
                  </div>
                  <p
                    className={`pulso-small font-normal mt-0.5 leading-snug transition-colors ${
                      isDark ? 'text-slate-300' : 'text-[#475569]'
                    }`}
                  >
                    Show the broken streetlight, pothole, or leak.
                  </p>
                </div>
              </li>

              {/* Step 2: Choose what's wrong */}
              <li className="flex items-start gap-3.5">
                <div
                  className={`w-8 h-8 rounded-full bg-[#ff6b00] font-bold flex items-center justify-center text-sm tabular-nums shrink-0 shadow-2xs ${
                    isDark ? 'text-white' : 'text-[#070a12]'
                  }`}
                  aria-hidden="true"
                >
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <PulsoIcon
                      name="category"
                      size={20}
                      className={isDark ? 'text-slate-200 shrink-0' : 'text-[#334155] shrink-0'}
                    />
                    <h3
                      className={`text-[1rem] sm:text-[1.0625rem] font-semibold tracking-tight whitespace-nowrap transition-colors ${
                        isDark ? 'text-white' : 'text-[#0c2436]'
                      }`}
                    >
                      Choose what&apos;s wrong
                    </h3>
                  </div>
                  <p
                    className={`pulso-small font-normal mt-0.5 leading-snug transition-colors ${
                      isDark ? 'text-slate-300' : 'text-[#475569]'
                    }`}
                  >
                    Pick the closest match, like Road or Water.
                  </p>
                </div>
              </li>

              {/* Step 3: Check the place and send */}
              <li className="flex items-start gap-3.5">
                <div
                  className={`w-8 h-8 rounded-full bg-[#ff6b00] font-bold flex items-center justify-center text-sm tabular-nums shrink-0 shadow-2xs ${
                    isDark ? 'text-white' : 'text-[#070a12]'
                  }`}
                  aria-hidden="true"
                >
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <PulsoIcon
                      name="location"
                      size={20}
                      className={isDark ? 'text-slate-200 shrink-0' : 'text-[#334155] shrink-0'}
                    />
                    <h3
                      className={`text-[1rem] sm:text-[1.0625rem] font-semibold tracking-tight whitespace-nowrap transition-colors ${
                        isDark ? 'text-white' : 'text-[#0c2436]'
                      }`}
                    >
                      Check the place and send
                    </h3>
                  </div>
                  <p
                    className={`pulso-small font-normal mt-0.5 leading-snug transition-colors ${
                      isDark ? 'text-slate-300' : 'text-[#475569]'
                    }`}
                  >
                    Your phone finds where you are.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* ── SCREEN 3: WE RECEIVE IT (Honest City Engineering Review Stages) ── */}
        {currentStep === 3 && (
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center animate-fadeIn">
            <div className="text-center mb-6">
              <h2
                className={`pulso-h1 font-bold text-center transition-colors [text-wrap:balance] ${
                  isDark ? 'text-white' : 'text-[#0c2436]'
                }`}
              >
                City Engineering gets your report.
              </h2>
              <p
                className={`pulso-body font-normal text-center mt-2 transition-colors [text-wrap:pretty] ${
                  isDark ? 'text-slate-300' : 'text-[#475569]'
                }`}
              >
                We review every report and send a team to fix it.
              </p>
            </div>

            {/* Plain resident-friendly process list (no box container) */}
            <ol
              className="w-full space-y-4 text-left list-none"
              aria-label="How your report gets resolved"
            >
              <li className="flex items-start gap-3.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" aria-hidden="true" />
                <div>
                  <h3
                    className={`pulso-body font-semibold block transition-colors ${
                      isDark ? 'text-white' : 'text-[#0c2436]'
                    }`}
                  >
                    We check your report
                  </h3>
                  <p
                    className={`pulso-small font-normal mt-0.5 leading-snug transition-colors ${
                      isDark ? 'text-slate-300' : 'text-[#475569]'
                    }`}
                  >
                    Engineers verify the photo and location.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 mt-1.5" aria-hidden="true" />
                <div>
                  <h3
                    className={`pulso-body font-semibold block transition-colors ${
                      isDark ? 'text-white' : 'text-[#0c2436]'
                    }`}
                  >
                    We send a crew
                  </h3>
                  <p
                    className={`pulso-small font-normal mt-0.5 leading-snug transition-colors ${
                      isDark ? 'text-slate-300' : 'text-[#475569]'
                    }`}
                  >
                    A repair team goes to the site to fix the problem.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0 mt-1.5" aria-hidden="true" />
                <div>
                  <h3
                    className={`pulso-body font-semibold block transition-colors ${
                      isDark ? 'text-white' : 'text-[#0c2436]'
                    }`}
                  >
                    We update you
                  </h3>
                  <p
                    className={`pulso-small font-normal mt-0.5 leading-snug transition-colors ${
                      isDark ? 'text-slate-300' : 'text-[#475569]'
                    }`}
                  >
                    You can track the progress until it&apos;s done.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* ── SCREEN 4: TRACK IT (Clear, 3-Milestone Resident Tracking) ── */}
        {currentStep === 4 && (
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center animate-fadeIn">
            <div className="text-center mb-5">
              <h2
                className={`pulso-h1 font-bold text-center transition-colors [text-wrap:balance] ${
                  isDark ? 'text-white' : 'text-[#0c2436]'
                }`}
              >
                Follow your report.
              </h2>
              <p
                className={`pulso-body font-normal text-center mt-2 transition-colors [text-wrap:pretty] ${
                  isDark ? 'text-slate-300' : 'text-[#475569]'
                }`}
              >
                Check live progress anytime with your tracking code.
              </p>
            </div>

            {/* Clear resident tracking info (no box container) */}
            <div className="w-full text-left">
              {/* Header with Inter tabular tracking number & active status */}
              <div
                className={`flex items-center justify-between pb-3 mb-3 border-b transition-colors ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <div>
                  <span className={`pulso-caption block font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Tracking code
                  </span>
                  <span
                    className={`tabular-nums font-semibold text-[15px] sm:text-[16px] ${
                      isDark ? 'text-[#ff8a3d]' : 'text-[#c2410c]'
                    }`}
                  >
                    PUL-2026-1049
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isDark
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'bg-orange-50 text-orange-800 border border-orange-200'
                  }`}
                >
                  In progress
                </span>
              </div>

              {/* 3 Universal Resident Milestones */}
              <ol className="space-y-3.5 list-none" aria-label="Report progress stages">
                {/* 1. Received */}
                <li className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    ✓
                  </div>
                  <div>
                    <span
                      className={`pulso-body font-semibold block transition-colors ${
                        isDark ? 'text-white' : 'text-[#0c2436]'
                      }`}
                    >
                      Received
                    </span>
                    <span
                      className={`pulso-small block mt-0.5 transition-colors ${
                        isDark ? 'text-slate-300' : 'text-[#475569]'
                      }`}
                    >
                      Your report is confirmed and reviewed.
                    </span>
                  </div>
                </li>

                {/* 2. In progress (Current) */}
                <li className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full bg-[#ff6b00] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    2
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`pulso-body font-semibold block transition-colors ${
                          isDark ? 'text-white' : 'text-[#0c2436]'
                        }`}
                      >
                        In progress
                      </span>
                      <span
                        className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                          isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-[#c2410c]'
                        }`}
                      >
                        Current
                      </span>
                    </div>
                    <span
                      className={`pulso-small block mt-0.5 transition-colors ${
                        isDark ? 'text-slate-300' : 'text-[#475569]'
                      }`}
                    >
                      A repair crew is working on the fix.
                    </span>
                  </div>
                </li>

                {/* 3. Resolved */}
                <li className="flex items-start gap-3 opacity-60">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}
                    aria-hidden="true"
                  >
                    3
                  </div>
                  <div>
                    <span
                      className={`pulso-body font-semibold block transition-colors ${
                        isDark ? 'text-white' : 'text-[#0c2436]'
                      }`}
                    >
                      Resolved
                    </span>
                    <span
                      className={`pulso-small block mt-0.5 transition-colors ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Completed with photo proof of the repair.
                    </span>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* ── SCREEN 5: ALL SET (Honest Checkmark Visual & Final Action) ── */}
        {currentStep === 5 && (
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center items-center text-center animate-fadeIn">
            {/* Plain checkmark icon without circular background container */}
            <div className="mb-6 flex items-center justify-center">
              <PulsoIcon
                name="resolved"
                size={64}
                className={isDark ? 'text-emerald-500' : 'text-emerald-600'}
              />
            </div>

            <h2
              className={`pulso-h1 font-bold text-center mb-2 transition-colors [text-wrap:balance] ${
                isDark ? 'text-white' : 'text-[#0c2436]'
              }`}
            >
              You&apos;re ready.
            </h2>
            <p
              className={`pulso-body font-normal text-center transition-colors [text-wrap:pretty] ${
                isDark ? 'text-slate-300' : 'text-[#475569]'
              }`}
            >
              Create your account to start reporting issues and track repairs in Caloocan.
            </p>
          </div>
        )}

      </main>

      {/* ── 3. ACTION ZONE: Primary Button & Screen 1 / 5 Secondary Links ── */}
      <footer className="relative z-10 w-full shrink-0 pt-2 pb-1">
        {/* Primary Action Button (16px semibold 600, sentence case, min-h-[50px], white text & icon in all modes) */}
        <button
          type="button"
          onClick={handleNext}
          className={`w-full min-h-[50px] sm:min-h-[52px] rounded-2xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] pulso-btn-text font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2 ${
            isDark
              ? 'focus-visible:ring-offset-slate-950 focus-visible:ring-[#ff6b00]'
              : 'focus-visible:ring-offset-[#f8f7f5] focus-visible:ring-[#ff6b00]'
          }`}
        >
          <span className="text-white">{currentStep === totalSteps ? 'Register' : 'Next'}</span>
          <PulsoIcon
            name="next"
            size={20}
            className="text-white"
          />
        </button>

        {/* Secondary Action Row: Anchored with equal spacing */}
        <div className="mt-3 min-h-[28px] flex flex-col items-center justify-center">
          {currentStep === 1 ? (
            <div
              className={`text-center pulso-small transition-colors ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleSignIn}
                className={`font-semibold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded px-1 transition-colors ${
                  isDark ? 'text-[#ff8a3d]' : 'text-[#c2410c]'
                }`}
              >
                Sign in
              </button>
            </div>
          ) : currentStep === totalSteps ? (
            <div className="w-full text-center space-y-1">
              <div
                className={`pulso-small transition-colors ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Already registered?{' '}
                <button
                  type="button"
                  onClick={handleSignIn}
                  className={`font-semibold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded px-1 transition-colors ${
                    isDark ? 'text-[#ff8a3d]' : 'text-[#c2410c]'
                  }`}
                >
                  Sign in
                </button>
              </div>

              {/* Emergency Banner Note (Strictly one line across all phones) */}
              <div
                className={`pt-1 flex items-center justify-center gap-1.5 text-[12px] sm:text-[13px] tracking-tight whitespace-nowrap border-t transition-colors ${
                  isDark
                    ? 'text-red-400 border-slate-900'
                    : 'text-red-700 border-slate-200'
                }`}
              >
                <PulsoIcon
                  name="warning"
                  size={13}
                  className={isDark ? 'text-red-400 shrink-0' : 'text-red-700 shrink-0'}
                />
                <span className="whitespace-nowrap">
                  In a life-threatening emergency, call{' '}
                  <a
                    href="tel:911"
                    onClick={(e) => {
                      if (isTestMode) {
                        e.preventDefault();
                        onNavigate?.('tel:911', 'Emergency 911 tapped (tel:911 verified)');
                      }
                    }}
                    className={`font-bold underline ${
                      isDark ? 'text-red-400 hover:text-red-300' : 'text-red-700 hover:text-red-800'
                    }`}
                    aria-label="Call 911 emergency hotline"
                  >
                    911
                  </a>{' '}
                  first.
                </span>
              </div>
            </div>
          ) : (
            /* Screens 2, 3, 4: Clean spacer, keeping primary button anchored identically */
            <div className="h-5" aria-hidden="true" />
          )}
        </div>
      </footer>
    </div>
  );
}
