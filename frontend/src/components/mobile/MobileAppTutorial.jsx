import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Camera,
  MapPin,
  Wrench,
  CheckCircle2,
  Clock,
  ShieldCheck,
  HardHat,
  Search,
  Sparkles,
  PhoneCall,
  X
} from 'lucide-react';
import { markTutorialCompleted } from '../../utils/appContext';
import { getAuthToken } from '../../utils/authSession';

/**
 * MobileAppTutorial
 * ─────────────────────────────────────────────────────────────────────────────
 * First-Launch Resident Onboarding Tutorial for the installed PULSO Mobile App.
 *
 * 5 Swipeable, Jargon-Free Screens:
 * 1. Welcome: "Report city problems in minutes." + Caloocan City seal logo
 * 2. Report it: "Tell us what's wrong." + Category, location, photo
 * 3. We receive it: "City Engineering gets your report." + Maintenance crew review
 * 4. Track it: "Follow your report." + Real PulseLine stages (Received -> Resolved)
 * 5. All set: "You're ready." + Report an Issue CTA, Sign in link, 911 emergency note
 *
 * Requirements:
 * - Fits within 360px x 800px screen without scrolling.
 * - Skip link on screens 1-4, back button from screen 2 onward.
 * - Same primary button position and size (>=48px tall).
 * - Swipe gestures (touch start/move/end) + keyboard navigation.
 * - WCAG AA accessible (progress dot aria-labels, screen reader live announcement).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function MobileAppTutorial({ replayMode = false, onComplete }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [announcement, setAnnouncement] = useState('Step 1 of 5: Report city problems in minutes.');
  const containerRef = useRef(null);

  const totalSteps = 5;

  const finishTutorial = useCallback((destination = '/report') => {
    markTutorialCompleted();
    if (onComplete) {
      onComplete();
    } else if (replayMode) {
      // If replaying from settings/dashboard, go back or to resident dashboard
      if (getAuthToken()) {
        navigate('/dashboard');
      } else {
        navigate('/resident-home');
      }
    } else {
      // Normal first launch completion
      if (getAuthToken()) {
        navigate('/dashboard');
      } else {
        navigate(destination);
      }
    }
  }, [navigate, onComplete, replayMode]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finishTutorial('/report');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else if (replayMode) {
      finishTutorial('/dashboard');
    }
  };

  const handleSkip = () => {
    finishTutorial('/report');
  };

  const handleSignIn = () => {
    markTutorialCompleted();
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

  // Keyboard arrow navigation
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

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative w-full h-[100dvh] max-h-[820px] max-w-[430px] mx-auto bg-[#070a12] text-white flex flex-col justify-between px-5 py-4 select-none overflow-hidden font-sans border-x border-slate-900 shadow-2xl"
      role="region"
      aria-label="PULSO First Launch Tutorial"
    >
      {/* Live accessibility region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Ambient background glow in authentic PULSO orange */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-orange-600/15 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* ── TOP BAR: Back Button, Progress Dots, Skip/Close Button ── */}
      <header className="relative z-10 w-full flex items-center justify-between h-12 pt-1 shrink-0">
        {/* Back Button or Spacer */}
        <div className="w-12 flex items-center justify-start">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go to previous screen"
              className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            >
              <ChevronLeft size={24} />
            </button>
          ) : replayMode ? (
            <button
              type="button"
              onClick={() => finishTutorial('/dashboard')}
              aria-label="Close tutorial"
              className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            >
              <X size={20} />
            </button>
          ) : (
            <div className="w-10 h-10" aria-hidden="true" />
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
                onClick={() => setCurrentStep(stepNum)}
                aria-label={`Go to Step ${stepNum} of ${totalSteps}${isActive ? ' (Current)' : ''}`}
                className={`transition-all duration-300 rounded-full h-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                  isActive
                    ? 'w-7 bg-[#ff6b00] shadow-sm shadow-orange-500/50'
                    : 'w-2 bg-slate-700/80 hover:bg-slate-500'
                }`}
              />
            );
          })}
        </nav>

        {/* Skip Button (screens 1-4) or Close Icon in replay mode */}
        <div className="w-12 flex items-center justify-end">
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Skip onboarding tutorial"
              className="text-xs font-bold text-slate-400 hover:text-white active:scale-95 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            >
              Skip
            </button>
          ) : replayMode ? (
            <button
              type="button"
              onClick={() => finishTutorial('/dashboard')}
              aria-label="Close tutorial"
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            >
              <X size={20} />
            </button>
          ) : (
            <div className="w-10 h-10" aria-hidden="true" />
          )}
        </div>
      </header>

      {/* ── STEP CONTENT AREA ── */}
      <main className="relative z-10 flex-1 flex flex-col justify-between py-2 sm:py-3 min-h-0">
        
        {/* ── SCREEN 1: WELCOME ── */}
        {currentStep === 1 && (
          <div className="h-full flex flex-col justify-between animate-fadeIn">
            {/* Upper Visual: Single Official Caloocan City Seal */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]">
              <div className="relative flex items-center justify-center">
                {/* Concentric municipal rings */}
                <div className="absolute w-44 h-44 rounded-full border border-orange-500/20 animate-pulse" />
                <div className="absolute w-36 h-36 rounded-full border border-dashed border-orange-500/30" />
                <div className="w-28 h-28 rounded-full bg-slate-900/90 border-2 border-orange-500/60 p-1 shadow-xl shadow-orange-950/40 flex items-center justify-center overflow-hidden">
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

              {/* Civic Authenticity Badge */}
              <div className="mt-4 px-3 py-1 rounded-full bg-orange-950/40 border border-orange-500/30 text-[11px] font-mono font-bold text-orange-400 tracking-wider uppercase">
                Caloocan City Engineering
              </div>
            </div>

            {/* Content Text: Heading (<=5 words) & Body (<=2 short lines) */}
            <div className="text-center px-2 py-3 shrink-0">
              <h1 className="font-heading font-black text-2xl sm:text-[26px] tracking-tight text-white leading-tight">
                Report city problems in minutes.
              </h1>
              <p className="text-sm text-slate-300 font-normal leading-relaxed mt-2 max-w-[310px] mx-auto">
                PULSO is Caloocan City&apos;s direct line to City Engineering for fast repairs.
              </p>
            </div>
          </div>
        )}

        {/* ── SCREEN 2: REPORT IT ── */}
        {currentStep === 2 && (
          <div className="h-full flex flex-col justify-between animate-fadeIn">
            {/* Upper Visual: 3 Concrete Action Cards (No Technical Jargon) */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px] px-2">
              <div className="w-full max-w-[290px] space-y-2.5">
                {/* 1. Category Card */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-orange-500/30 flex items-center gap-3 shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-[#ff6b00] flex items-center justify-center shrink-0">
                    <Wrench size={20} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-[10px] font-mono uppercase text-orange-400 font-bold block">1. Pick Problem</span>
                    <span className="text-xs font-bold text-white truncate block">Broken streetlight, pothole, leak</span>
                  </div>
                </div>

                {/* 2. Photo & Location Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                      <Camera size={16} />
                    </div>
                    <div className="min-w-0 text-left">
                      <span className="text-[10px] font-bold text-slate-300 block">Add photo</span>
                      <span className="text-[9px] text-slate-500 block truncate">Snap damage</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0 text-left">
                      <span className="text-[10px] font-bold text-slate-300 block">Pin location</span>
                      <span className="text-[9px] text-slate-500 block truncate">Auto-detected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Text: Heading (<=5 words) & Body (<=2 short lines) */}
            <div className="text-center px-2 py-3 shrink-0">
              <h2 className="font-heading font-black text-2xl sm:text-[26px] tracking-tight text-white leading-tight">
                Tell us what&apos;s wrong.
              </h2>
              <p className="text-sm text-slate-300 font-normal leading-relaxed mt-2 max-w-[310px] mx-auto">
                Pick a category, mark the location, add a photo, and send. No technical knowledge needed.
              </p>
            </div>
          </div>
        )}

        {/* ── SCREEN 3: WE RECEIVE IT ── */}
        {currentStep === 3 && (
          <div className="h-full flex flex-col justify-between animate-fadeIn">
            {/* Upper Visual: City Maintenance Crew Receiving Report */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]">
              <div className="w-full max-w-[290px] p-4 rounded-3xl bg-slate-900/90 border border-slate-800/90 relative overflow-hidden text-center shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20 mb-3">
                  <HardHat size={28} />
                </div>
                <h3 className="text-sm font-heading font-black text-white">
                  City Maintenance Crew
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Engineers review the details and schedule crews for hands-on repair.
                </p>
                
                {/* Visual Route Indicator */}
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-around text-[10px] text-slate-400">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 size={12} />
                    <span>Submitted</span>
                  </div>
                  <ArrowRight size={12} className="text-slate-600" />
                  <div className="flex items-center gap-1 text-orange-400 font-bold">
                    <Wrench size={12} />
                    <span>Crew Assigned</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Text: Heading (<=5 words) & Body (<=2 short lines) */}
            <div className="text-center px-2 py-3 shrink-0">
              <h2 className="font-heading font-black text-2xl sm:text-[26px] tracking-tight text-white leading-tight">
                City Engineering gets your report.
              </h2>
              <p className="text-sm text-slate-300 font-normal leading-relaxed mt-2 max-w-[310px] mx-auto">
                Our team reviews your submission and sends the right maintenance crew to fix it.
              </p>
            </div>
          </div>
        )}

        {/* ── SCREEN 4: TRACK IT ── */}
        {currentStep === 4 && (
          <div className="h-full flex flex-col justify-between animate-fadeIn">
            {/* Upper Visual: Real PulseLine Stages Matching Track My Report */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]">
              <div className="w-full max-w-[295px] p-3.5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg">
                {/* Ticket Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400">TRACKING CODE</span>
                  <span className="text-xs font-mono font-black text-orange-400">#PUL-2026-1049</span>
                </div>

                {/* 5 Real Stages from Track My Report */}
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Received', done: true, current: false },
                    { label: 'Under Review', done: true, current: false },
                    { label: 'Assigned', done: true, current: true },
                    { label: 'In Progress', done: false, current: false },
                    { label: 'Resolved', done: false, current: false }
                  ].map((stg, i) => (
                    <div
                      key={stg.label}
                      className={`flex items-center justify-between px-2.5 py-1 rounded-xl text-xs ${
                        stg.current
                          ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400 font-bold'
                          : stg.done
                          ? 'text-emerald-400 font-medium'
                          : 'text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          stg.done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {stg.done ? '✓' : i + 1}
                        </span>
                        <span>{stg.label}</span>
                      </div>
                      {stg.current && (
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-[#ff6b00] text-white px-1.5 py-0.2 rounded-md">
                          Live
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Text: Heading (<=5 words) & Body (<=2 short lines) */}
            <div className="text-center px-2 py-3 shrink-0">
              <h2 className="font-heading font-black text-2xl sm:text-[26px] tracking-tight text-white leading-tight">
                Follow your report.
              </h2>
              <p className="text-sm text-slate-300 font-normal leading-relaxed mt-2 max-w-[310px] mx-auto">
                Use your tracking number to see progress at any time, using real updates from Received to Resolved.
              </p>
            </div>
          </div>
        )}

        {/* ── SCREEN 5: ALL SET ── */}
        {currentStep === 5 && (
          <div className="h-full flex flex-col justify-between animate-fadeIn">
            {/* Upper Visual: Ready Celebration Card */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]">
              <div className="relative flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-3">
                  <CheckCircle2 size={42} strokeWidth={2.5} />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-400">
                  <ShieldCheck size={14} />
                  <span>City Service Ready</span>
                </div>
              </div>
            </div>

            {/* Content Text: Heading (<=5 words) & Body (<=2 short lines) */}
            <div className="text-center px-2 py-3 shrink-0">
              <h2 className="font-heading font-black text-2xl sm:text-[26px] tracking-tight text-white leading-tight">
                You&apos;re ready.
              </h2>
              <p className="text-sm text-slate-300 font-normal leading-relaxed mt-2 max-w-[310px] mx-auto">
                Report an issue in seconds. Signing in is optional, but lets you view report history.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* ── FIXED BOTTOM ACTIONS: Primary Button, Secondary Links, Emergency Note ── */}
      <footer className="relative z-10 w-full pt-1 pb-2 shrink-0">
        {/* Primary Action Button (Fixed height >= 48px, consistent position) */}
        <button
          type="button"
          onClick={handleNext}
          className="w-full min-h-[50px] sm:min-h-[52px] rounded-2xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-heading font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-[#ff6b00]"
        >
          <span>{currentStep === totalSteps ? 'Report an Issue' : 'Next'}</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>

        {/* Secondary Actions & Emergency Link */}
        <div className="mt-2.5 min-h-[46px] flex flex-col items-center justify-center">
          {currentStep === totalSteps ? (
            <div className="w-full text-center space-y-1.5">
              <div className="text-xs text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="font-bold text-[#ff6b00] hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded px-1"
                >
                  Sign in
                </button>
                <span className="text-[11px] text-slate-500 block">
                  (Signing in is optional for reporting)
                </span>
              </div>

              {/* Emergency Banner Note */}
              <div className="pt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-red-400 border-t border-slate-900">
                <AlertTriangle size={13} className="text-red-500 shrink-0" />
                <span>
                  In a life-threatening emergency, call{' '}
                  <a
                    href="tel:911"
                    className="font-bold underline text-red-400 hover:text-red-300"
                    aria-label="Call 911 emergency hotline"
                  >
                    911
                  </a>{' '}
                  first.
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleSignIn}
                className="font-bold text-[#ff6b00] hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded px-1"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
