import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  MapPin,
  Send,
  List,
  MessageSquare,
  Signpost,
  Crosshair,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  Bell,
  TrendingUp,
  Check,
  Wrench,
  ClipboardList,
  ClipboardCheck,
  Map as MapIcon,
  User,
  ArrowRight
} from 'lucide-react';
import { markTutorialCompleted } from '../../utils/appContext';
import { getAuthToken } from '../../utils/authSession';
import { useTheme } from '../../contexts/ThemeContext';
import { ONBOARDING_CONTENT } from '../../data/onboardingContent';

/**
 * MobileAppTutorial
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-accurate implementation of the PULSO Mobile Onboarding flow
 * with authoritative support for both Dark Mode (media_1793045615894_9d69810f.png &
 * media_1793045604744_055e2adc.png) and Light Mode (media_1793046317843_f67d95de.png).
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
  const isTagalog =
    typeof window !== 'undefined' &&
    (localStorage.getItem('pulso_language') === 'tl' || localStorage.getItem('i18nextLng') === 'tl');
  const copy = isTagalog && ONBOARDING_CONTENT.tl ? ONBOARDING_CONTENT.tl : ONBOARDING_CONTENT;

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
    ? themeModeOverride === 'dark' || (themeModeOverride === 'system' && osPrefersDark)
    : (themeContext?.isDark ??
      (typeof document !== 'undefined'
        ? document.documentElement.classList.contains('dark')
        : activeSetting === 'dark' || (activeSetting === 'system' && osPrefersDark)));

  const [currentStep, setCurrentStep] = useState(stepOverride || 1);
  const totalSteps = 5;
  const homeRoute = getAuthToken() ? '/dashboard' : '/resident-home';
  const reportRoute = getAuthToken() ? '/dashboard?openReport=true' : '/report';

  const containerRef = useRef(null);

  useEffect(() => {
    if (stepOverride && stepOverride >= 1 && stepOverride <= totalSteps) {
      setCurrentStep(stepOverride);
    }
  }, [stepOverride]);

  const finishTutorial = (targetRoute = '/dashboard', reason = 'Completed') => {
    markTutorialCompleted();
    if (onNavigate) {
      onNavigate(targetRoute, reason);
    } else {
      navigate(targetRoute);
    }
    if (onComplete) onComplete();
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (onStepChange) onStepChange(nextStep);
    } else {
      finishTutorial(reportRoute, 'Start a report tapped');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (onStepChange) onStepChange(prevStep);
    }
  };

  const handleSkip = () => {
    finishTutorial(homeRoute, 'Skip tapped');
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

  const currentContent =
    currentStep === 1
      ? copy.screen1
      : currentStep === 2
      ? copy.screen2
      : currentStep === 3
      ? copy.screen3
      : currentStep === 4
      ? copy.screen4
      : copy.screen5;

  const getItemIcon = (iconName) => {
    switch (iconName) {
      case 'wrench':
        return <Wrench size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'clipboard-list':
        return <ClipboardList size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'clipboard-check':
        return <ClipboardCheck size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'map':
        return <MapIcon size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'user':
        return <User size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'file-text':
        return <FileText size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'map-pin':
        return <MapPin size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'send':
        return <Send size={18} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'list':
        return <List size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'message-circle':
      case 'message-square':
        return <MessageSquare size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'signpost':
        return <Signpost size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'crosshair':
        return <Crosshair size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'camera':
        return <Camera size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'image':
        return <ImageIcon size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'shield-check':
        return <ShieldCheck size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'bell':
        return <Bell size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      case 'trending-up':
        return <TrendingUp size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
      default:
        return <Check size={19} className="text-[#EA580C]" strokeWidth={2.2} />;
    }
  };

  const heroImageSrc = isDark ? '/onboarding_hero_dark.png' : '/onboarding_hero.png';

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (externalContainerRef) {
          if (typeof externalContainerRef === 'function') externalContainerRef(node);
          else externalContainerRef.current = node;
        }
      }}
      data-theme={isDark ? 'dark' : 'light'}
      className={`relative w-full ${
        isTestMode ? 'h-full' : 'h-[100dvh] min-h-[100dvh] max-h-[100dvh]'
      } flex flex-col items-center select-none overflow-hidden font-sans ${
        isDark ? 'dark bg-[#060D1A] text-white' : 'bg-white text-slate-900'
      } ${reducedMotion ? '[&_*]:transition-none! [&_*]:animate-none!' : ''}`}
      role="region"
      aria-label="PULSO Mobile Onboarding"
    >
      {/* Centered Phone Column */}
      <div className="relative z-10 w-full max-w-[430px] mx-auto h-full max-h-full flex flex-col justify-between px-6 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] overflow-hidden">

        {/* ── 1. Top Bar: Department Seal + Titles + Skip ── */}
        <header className="w-full flex items-center justify-between min-h-[46px] shrink-0">
          <div className="flex items-center gap-2.5 text-left leading-tight">
            <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} p-0.5 shadow-2xs`}>
              <img
                src="/city-engineering-logo.png"
                alt="City Engineering Department Seal"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/engineering-logo.jpg';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className={`font-bold text-[13px] sm:text-[14px] ${isDark ? 'text-white' : 'text-slate-900'} leading-tight tracking-tight`}>
                City Engineering Department
              </span>
              <div className="flex items-center gap-1 text-[10px] leading-tight mt-0.5 font-medium">
                <span className={isDark ? 'text-white/80' : 'text-slate-500'}>powered by</span>
                <span className="font-extrabold text-[#EA580C] uppercase tracking-wider">PULSO</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className={`text-[13px] font-semibold px-2 py-1 rounded-lg ${
              isDark ? 'text-white/90 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            } transition-colors cursor-pointer`}
          >
            {copy.header.skipLabel}
          </button>
        </header>

        {/* ── 2. Connected Progress Track + "X of 5" ── */}
        <div className="w-full flex items-center justify-between pt-2 pb-1 shrink-0">
          <div className="relative flex items-center w-36 sm:w-40">
            {/* Background connecting track */}
            <div className={`absolute left-1 right-1 h-[1.5px] ${isDark ? 'bg-[#1E2D48]' : 'bg-slate-200'} -translate-y-1/2 top-1/2`} />
            {/* Connected dots */}
            <div className="relative w-full flex items-center justify-between z-10">
              {[1, 2, 3, 4, 5].map((stepNum) => {
                const isActive = stepNum === currentStep;
                return (
                  <span
                    key={stepNum}
                    className={`rounded-full transition-all duration-200 ${
                      isActive
                        ? 'w-3 h-3 bg-[#EA580C] ring-2 ring-[#EA580C]/30 shadow-xs'
                        : isDark
                        ? 'w-2 h-2 bg-[#1E2D48] border border-[#2D3F60]'
                        : 'w-2 h-2 bg-slate-300'
                    }`}
                  />
                );
              })}
            </div>
          </div>
          <span className={`text-[12px] font-bold font-mono ${isDark ? 'text-white/80' : 'text-slate-500'}`}>
            {currentStep} of {totalSteps}
          </span>
        </div>

        {/* ── 3. Graphic Hero Illustration (Night/Dark Mode or Morning/Light Mode) ── */}
        <div className="w-full shrink-0 flex items-center justify-center pt-1 pb-1">
          <img
            src={heroImageSrc}
            alt="PULSO mobile reporting"
            className="w-full max-w-[390px] h-[195px] sm:h-[215px] object-contain drop-shadow-sm select-none pointer-events-none"
            draggable="false"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = isDark ? '/onboarding_hero_dark.png' : '/onboarding_hero.png';
            }}
          />
        </div>

        {/* ── 4. Content Area: Title, Subtitle, 3 Items ── */}
        <div className="flex-1 min-h-0 flex flex-col justify-between py-1 overflow-y-auto no-scrollbar">
          {/* Headline + Subtitle */}
          <div className="text-left pt-1 pb-1 shrink-0">
            {currentStep === 1 && (
              <span className="block text-[#EA580C] text-[11px] sm:text-xs font-black tracking-wider uppercase mb-1">
                {currentContent.eyebrow || 'CALOOCAN CITY'}
              </span>
            )}
            <h1 className={`text-[21px] sm:text-[23px] font-extrabold ${isDark ? 'text-white' : 'text-slate-900'} leading-[1.22] tracking-tight`}>
              {currentContent.title}
            </h1>
            <p className={`text-[13px] sm:text-[13.5px] ${isDark ? 'text-white' : 'text-slate-600'} leading-snug mt-1 font-normal`}>
              {currentContent.subtitle}
            </p>
          </div>

          {/* Step 1: "How it works" heading */}
          {currentStep === 1 && (
            <h2 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'} mt-1 mb-0.5 text-left`}>
              {currentContent.howItWorksHeading || 'How it works'}
            </h2>
          )}

          {/* 3 Items: Squircle Numbers on Step 1, Circular Badges on Steps 2-5 */}
          <div className="space-y-3 sm:space-y-3.5 py-1 flex-1 flex flex-col justify-center">
            {currentContent.items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3.5 text-left">
                {currentStep === 1 ? (
                  /* Step 1 Number Squircle Badge */
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border ${
                    isDark
                      ? 'border-[#EA580C] bg-[#121B2F] text-[#EA580C]'
                      : 'border-[#EA580C] bg-[#FFF7ED] text-[#EA580C]'
                  } font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}>
                    {item.number || idx + 1}
                  </div>
                ) : (
                  /* Steps 2-5 Circular Domain Icon Badge */
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border ${
                    isDark
                      ? 'bg-[#111C30] border-[#1E2E4A]'
                      : 'bg-orange-50/80 border-orange-200/90'
                  }`}>
                    {getItemIcon(item.icon)}
                  </div>
                )}
                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 className={`text-[14px] sm:text-[15px] font-bold ${isDark ? 'text-white' : 'text-slate-900'} leading-snug tracking-tight`}>
                    {item.title}
                  </h3>
                  <p className={`text-[12px] sm:text-[12.5px] ${isDark ? 'text-white' : 'text-slate-500'} leading-snug mt-0.5`}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Bottom Navigation Buttons with Consequence-Aware Styling ── */}
        <div className="w-full pt-2.5 pb-0.5 shrink-0">
          {currentStep === 1 ? (
            /* Step 1: Full-width Start a report button + Sign in */
            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={handleNext}
                className="w-full h-[48px] sm:h-[50px] rounded-2xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-[0.99] text-white font-bold text-[15px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{currentContent.primaryButton}</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
              <div className={`text-center text-[12.5px] ${isDark ? 'text-white' : 'text-slate-500'}`}>
                <span>{currentContent.secondaryText} </span>
                <button
                  type="button"
                  onClick={() => finishTutorial('/login', 'Sign in tapped')}
                  className="font-bold text-[#EA580C] hover:underline cursor-pointer"
                >
                  {currentContent.secondaryLink}
                </button>
              </div>
            </div>
          ) : currentStep < totalSteps ? (
            /* Steps 2-4: Back + Continue row */
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className={`min-w-[64px] h-[48px] px-3 text-[14px] font-bold ${
                  isDark
                    ? 'text-white hover:text-white/80'
                    : 'text-slate-600 hover:text-slate-900'
                } transition-colors cursor-pointer flex items-center justify-start`}
              >
                {currentContent.backButton || 'Back'}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 max-w-[240px] h-[48px] sm:h-[50px] rounded-2xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-[0.99] text-white font-bold text-[15px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{currentContent.primaryButton}</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            /* Step 5: Back + Start a report + Sign in */
            <div className="w-full space-y-2">
              <div className="w-full flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className={`min-w-[64px] h-[48px] px-3 text-[14px] font-bold ${
                    isDark
                      ? 'text-white hover:text-white/80'
                      : 'text-slate-600 hover:text-slate-900'
                  } transition-colors cursor-pointer flex items-center justify-start`}
                >
                  {currentContent.backButton || 'Back'}
                </button>
                <button
                  type="button"
                  onClick={() => finishTutorial(reportRoute, 'Start a report tapped')}
                  className="flex-1 max-w-[240px] h-[48px] sm:h-[50px] rounded-2xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-[0.99] text-white font-bold text-[15px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{currentContent.primaryButton}</span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </button>
              </div>
              <div className={`text-center text-[12.5px] ${isDark ? 'text-white' : 'text-slate-500'}`}>
                <span>{currentContent.secondaryText} </span>
                <button
                  type="button"
                  onClick={() => finishTutorial('/login', 'Sign in tapped')}
                  className="font-bold text-[#EA580C] hover:underline cursor-pointer"
                >
                  {currentContent.secondaryLink}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
