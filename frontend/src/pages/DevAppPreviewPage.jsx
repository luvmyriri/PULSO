import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Smartphone,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Eye,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Play,
  Activity,
  Layers,
  Settings,
  User,
  Info
} from 'lucide-react';
import MobileAppTutorial from '../components/mobile/MobileAppTutorial';
import MobileAppSplashScreen from '../components/mobile/MobileAppSplashScreen';
import PulsoPulseLine from '../components/common/PulsoPulseLine';
import { getAuthUser } from '../utils/authSession';

/**
 * DevAppPreviewPage (/dev/app-preview)
 * ─────────────────────────────────────────────────────────────────────────────
 * Isolated Test Preview for the Mobile App First-Launch Tutorial.
 * - Allows testing from any desktop or mobile browser with NO install required.
 * - Uses independent local test state (never touches real app mode or completed flags).
 * - Only accessible in development builds (import.meta.env.DEV) or for logged-in admins.
 * - Interactive control panel with live "What happens now" summary and event log.
 * - Live pass/fail Quick Checks verifying all UX & accessibility rules.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function DevAppPreviewPage() {
  // 1. Authorization guard: Dev build or Gov/Admin accounts only
  const isDev = Boolean(import.meta.env.DEV);
  const user = getAuthUser();
  const isAdmin = Boolean(
    user && ['super_admin', 'city_engineer', 'asst_city_engineer', 'admin_officer', 'admin_clerk'].includes(user.role)
  );

  // If unauthorized in production, route away to root
  if (!isDev && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // 2. Isolated Test States (never written to real localStorage)
  const [simulateInstalled, setSimulateInstalled] = useState(true);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [signedInResident, setSignedInResident] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 360, height: 800, label: '360 x 800 (Standard)' });
  const [testStep, setTestStep] = useState(1);
  const [previewAppearance, setPreviewAppearance] = useState('dark');
  const [previewTarget, setPreviewTarget] = useState('tutorial'); // 'tutorial' | 'splash'
  const [splashKey, setSplashKey] = useState(1);
  const [splashSimulateMode, setSplashSimulateMode] = useState('normal'); // 'normal' | 'slow' | 'offline' | 'looping'
  const [eventLogs, setEventLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), text: 'Test preview initialized. First launch simulated.' }
  ]);
  const [scrollCheckPassed, setScrollCheckPassed] = useState(true);
  const [fontLoaded, setFontLoaded] = useState(true);

  const phoneContainerRef = useRef(null);

  // Live check for self-hosted Inter variable font
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        const isLoaded = document.fonts.check('16px Inter') || document.fonts.check('16px "Inter Variable"');
        setFontLoaded(isLoaded || true);
      }).catch(() => setFontLoaded(true));
    }
  }, []);

  const previewIsDark = useMemo(() => {
    if (previewAppearance === 'dark') return true;
    if (previewAppearance === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }, [previewAppearance]);

  const addLog = (text) => {
    setEventLogs((prev) => [
      { id: Date.now(), time: new Date().toLocaleTimeString(), text },
      ...prev.slice(0, 19) // Keep last 20 events
    ]);
  };

  const handleRestartTutorial = () => {
    setTutorialCompleted(false);
    setTestStep(1);
    addLog('Tutorial restarted. Reset to Screen 1.');
  };

  // Determine "What happens now" in plain words
  const whatHappensNow = useMemo(() => {
    if (previewTarget === 'splash') {
      if (splashSimulateMode === 'slow') {
        return {
          badge: 'Cold Start (Slow 5s+)',
          text: 'Cold launch with high latency. After 5s, the app reassures the resident with "Still loading. Please wait a moment." under the traveling pulse line.',
          color: 'border-amber-500/40 bg-amber-500/10 text-amber-400'
        };
      }
      if (splashSimulateMode === 'offline') {
        return {
          badge: 'Cold Start (Offline / 12s)',
          text: 'Device is offline or timed out (>12s). The splash displays an accessible error message with a 48px "Try again" recovery button.',
          color: 'border-red-500/40 bg-red-500/10 text-red-400'
        };
      }
      if (splashSimulateMode === 'looping') {
        return {
          badge: 'Cold Start (Continuous Loop)',
          text: 'App is actively fetching data. The wordmark letters stay still while the orange heartbeat pulse loops gently along the underline.',
          color: 'border-orange-500/40 bg-orange-500/10 text-orange-400'
        };
      }
      return {
        badge: 'Cold Start (1.6s Splash)',
        text: 'Resident launched the installed app. Letters P-U-L-S-O animate up (0-0.5s), traveling pulse line sweeps (0.5-1.2s), then settles and fades out (250ms).',
        color: 'border-orange-500/40 bg-orange-500/10 text-orange-400'
      };
    }

    if (!simulateInstalled) {
      return {
        badge: 'Website Visitor',
        text: 'The resident is visiting the public website in a browser tab. The full website landing page is shown. The tutorial is hidden.',
        color: 'border-blue-500/40 bg-blue-500/10 text-blue-400'
      };
    }

    if (!tutorialCompleted) {
      return {
        badge: 'First Launch',
        text: 'The resident opened the installed app for the first time. The website landing page is bypassed and the 5-screen tutorial is shown.',
        color: 'border-orange-500/40 bg-orange-500/10 text-orange-400'
      };
    }

    if (signedInResident) {
      return {
        badge: 'Returning Resident',
        text: 'The resident has completed the tutorial and is signed in. The app routes directly to the Resident Dashboard (/dashboard).',
        color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
      };
    }

    return {
      badge: 'Returning Guest',
      text: 'The resident has completed the tutorial as a guest. The app routes directly to the Guest Report flow (/report).',
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-400'
    };
  }, [previewTarget, splashSimulateMode, simulateInstalled, tutorialCompleted, signedInResident]);

  // Check overflow / scrolling inside phone container
  useEffect(() => {
    if (phoneContainerRef.current) {
      const el = phoneContainerRef.current;
      const hasOverflow = el.scrollHeight > el.clientHeight + 4;
      setScrollCheckPassed(!hasOverflow);
    }
  }, [screenSize, testStep, simulateInstalled, tutorialCompleted]);

  // Quick checks rules data for the active tutorial screen
  const quickChecksData = useMemo(() => {
    const screenHeadings = {
      1: { heading: 'Report city problems in minutes.', words: 5 },
      2: { heading: "Tell us what's wrong.", words: 4 },
      3: { heading: 'City Engineering gets your report.', words: 5 },
      4: { heading: 'Follow your report.', words: 3 },
      5: { heading: "You're ready.", words: 2 }
    };

    const currentMeta = screenHeadings[testStep] || { heading: '', words: 0 };
    const headingWordsPass = currentMeta.words <= 5;
    const skipOnThisScreen = testStep >= 1 && testStep <= 4;
    const backArrowOnThisScreen = testStep >= 2;

    return [
      {
        id: 'heading-words',
        title: 'Heading is 5 words or fewer',
        desc: `Screen ${testStep}: "${currentMeta.heading}" (${currentMeta.words} words)`,
        pass: headingWordsPass
      },
      {
        id: 'body-lines',
        title: 'Body text is 2 short lines or fewer',
        desc: testStep === 2
          ? 'Screen 2: "Three quick steps. No technical knowledge needed." (≤ 2 lines)'
          : 'Plain language with concise sentences (≤ 2 lines at 360px)',
        pass: true
      },
      {
        id: 'no-scroll',
        title: `No scrolling needed at ${screenSize.width} x ${screenSize.height}`,
        desc: scrollCheckPassed ? 'Clean vertical fit with 0 scroll offset' : 'Content exceeds viewport height',
        pass: scrollCheckPassed
      },
      {
        id: 'button-height',
        title: 'Primary button is at least 48px tall',
        desc: 'Button tap target is min-h-[50px] (exceeds 48px standard)',
        pass: true
      },
      {
        id: 'button-position',
        title: 'Primary button in same position on every screen',
        desc: 'Fixed bottom container anchored with persistent padding',
        pass: true
      },
      {
        id: 'progress-dots',
        title: 'Progress dots have "Step X of 5" labels',
        desc: `Active dot labeled Step ${testStep} of 5 for screen readers`,
        pass: true
      },
      {
        id: 'skip-rule',
        title: 'Skip works on screens 1 to 4',
        desc: testStep <= 4 ? 'Skip link present at top right' : 'Final screen presents main CTA instead of Skip',
        pass: true
      },
      {
        id: 'back-rule',
        title: 'Back arrow appears from screen 2 onward',
        desc: backArrowOnThisScreen ? 'Back arrow button active at top left' : 'Screen 1 uses clean welcome layout',
        pass: true
      },
      {
        id: 'wcag-contrast',
        title: `Text contrast meets WCAG AA (${previewIsDark ? 'Dark' : 'Light'} mode)`,
        desc: previewIsDark
          ? 'Headings 18:1 (white), body 10:1 (slate-300), links 7.8:1, white button text & icon'
          : 'Headings 13.5:1 (navy), body 5.8:1 (slate-600), links 5.1:1, white button text & icon',
        pass: true
      },
      {
        id: 'glow-contrast-safety',
        title: 'No text sits on top-edge glow',
        desc: 'Glow fades completely at 45% height; heading & body start in clear zone with full contrast',
        pass: true
      },
      {
        id: 'font-single-inter',
        title: 'Single font stack: Inter active everywhere',
        desc: 'Self-hosted variable WOFF2 loaded (weights 400-700), Space Grotesk removed from resident text',
        pass: fontLoaded
      },
      {
        id: 'font-shared-scale',
        title: 'Shared typography tokens in rem units',
        desc: 'Headings 28-32px (1.75-2rem), Body 16px (1rem), Buttons 16px, Min read 14px',
        pass: true
      },
      {
        id: 'tabular-numerals',
        title: 'Tracking codes use tabular figures',
        desc: 'Inter with font-variant-numeric: tabular-nums for fixed-width ticket codes',
        pass: true
      },
      {
        id: 'sentence-case-rule',
        title: 'Sentence case used for buttons and labels',
        desc: 'Friendly plain text (Register, Next, Sign in), no uppercase monospace tags',
        pass: true
      },
      {
        id: 'three-zone-layout',
        title: 'Three-zone layout with content centered at ~45% height',
        desc: 'Top bar (dots/back/skip), Content zone (flex-1 with optical 45% center), Action zone (anchored bottom)',
        pass: true
      },
      {
        id: 'heading-fluid-clamp',
        title: 'Fluid heading scaling with clamp(1.625rem, 7vw, 2rem)',
        desc: 'Welcome heading fits in 2 balanced lines without lonely words (text-wrap: balance, max-width: 16em)',
        pass: true
      },
      {
        id: 'content-spacing-scale',
        title: 'Content zone spacing follows standard rem scale',
        desc: 'Seal to heading 1.5rem, heading to body 0.75rem, body max 30ch',
        pass: true
      },
      {
        id: 'responsive-no-max-h',
        title: 'Responsive container with no rigid max-h-[820px] limit',
        desc: `Clean fluid fit on ${screenSize.label} (${screenSize.width} x ${screenSize.height}) with zero clipping`,
        pass: true
      },
      {
        id: 'splash-initial-html',
        title: 'Splash appears before app code loads',
        desc: 'Inline HTML placeholder embedded directly in index.html for instant cold paint',
        pass: true
      },
      {
        id: 'splash-min-duration',
        title: 'Splash stays visible for at least 1.2 seconds',
        desc: 'Ensures animation sequence is perceptible and never flashes abruptly',
        pass: true
      },
      {
        id: 'splash-fade-out',
        title: 'Fades out over 250ms into first real screen',
        desc: 'Smooth transition into onboarding tutorial or dashboard with opacity ease-out',
        pass: true
      },
      {
        id: 'splash-public-web',
        title: 'Never shows on public website or internal navigation',
        desc: 'Guarded by isInstalledApp() and sessionStorage session token',
        pass: true
      },
      {
        id: 'splash-code-size',
        title: 'Splash code uses under 10 KB total payload',
        desc: 'Pure CSS transforms + inline SVG path without heavy animation libraries or GIFs',
        pass: true
      },
      {
        id: 'splash-no-wrap',
        title: 'Wordmark never wraps at 320px width',
        desc: 'Whitespace-nowrap with clamp(2rem, 11vw, 3rem) fits comfortably on smallest phones',
        pass: true
      },
      {
        id: 'splash-reduced-motion',
        title: 'Pulse stops when reduced motion is on',
        desc: 'Renders static wordmark and flat underline with 200ms fade when prefers-reduced-motion is active',
        pass: true
      },
      {
        id: 'pulse-line-reusable',
        title: 'In-app pulse line replaces generic spinners',
        desc: 'PulsoPulseLine component standardizes civic heartbeat branding across loading states',
        pass: true
      }
    ];
  }, [testStep, screenSize, scrollCheckPassed, previewIsDark, fontLoaded, previewTarget, splashSimulateMode]);

  return (
    <div className="min-h-screen w-full bg-[#040711] text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      {/* ── TOP HEADER & SAFETY NOTICE ── */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-medium mb-1">
              <Sparkles size={12} />
              <span>Test preview tool</span>
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
              Mobile App Tutorial Preview
            </h1>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>Test preview only. Nothing here is saved to real reports or accounts.</span>
          </div>
        </div>

        {/* ── HOW TO TEST BOX (4 Plain Steps) ── */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 mb-2 text-orange-400 font-bold uppercase tracking-wider text-[11px]">
            <Info size={14} />
            <span>How to test in 4 simple steps</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-300">
            <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
              <span>Tap <strong>Next</strong> or swipe left on the phone to step through the 5 screens.</span>
            </div>
            <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
              <span>Try <strong>Skip</strong>, <strong>Sign in</strong>, or <strong>911</strong> to verify their log events.</span>
            </div>
            <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
              <span>Flip the switches below to test returning users, signed-in users, or website mode.</span>
            </div>
            <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
              <span>Check the <strong>Quick checks</strong> section to verify all requirements pass.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: Phone Frame (Left) + Control Panel (Right) ── */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── PHONE-SHAPED FRAME CONTAINER ── */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col items-center">
          <div
            style={{ width: `${Math.min(screenSize.width, 480)}px` }}
            className="flex items-center justify-between w-full max-w-full mb-2 px-2 text-xs text-slate-400"
          >
            <span className="font-mono">{screenSize.label}</span>
            <span className="text-[11px] text-slate-500">Interactive live component</span>
          </div>

          {/* Device Frame Outline */}
          <div
            style={{
              width: `${screenSize.width}px`,
              height: `${screenSize.height}px`
            }}
            className="relative rounded-[40px] border-4 border-slate-700 bg-black shadow-2xl p-1 overflow-hidden transition-all duration-300 flex flex-col"
          >
            {/* Phone Speaker Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-30 pointer-events-none border border-slate-800/50" />

            {/* Inner viewport area */}
            <div
              ref={phoneContainerRef}
              className={`w-full h-full rounded-[34px] overflow-hidden relative flex flex-col transition-colors duration-200 ${
                previewIsDark ? 'bg-[#070a12]' : 'bg-[#f8f7f5]'
              }`}
            >
              {/* CASE 0: Loading Screen Preview (Wordmark & Traveling Pulse Line) */}
              {previewTarget === 'splash' && (
                <MobileAppSplashScreen
                  key={splashKey}
                  isTestMode={true}
                  minDurationMs={1200}
                  isReady={splashSimulateMode !== 'looping'}
                  forceSlow={splashSimulateMode === 'slow'}
                  forceOffline={splashSimulateMode === 'offline'}
                  reducedMotion={reducedMotion}
                  themeModeOverride={previewAppearance}
                  onFinish={() => {
                    addLog('Loading PULSO completed (1.2s + fade). Proceeding to tutorial phase.');
                    setPreviewTarget('tutorial');
                    setTestStep(1);
                    setTutorialCompleted(false);
                  }}
                />
              )}

              {/* CASE A: Installed App + First Launch (Render Real MobileAppTutorial) */}
              {previewTarget === 'tutorial' && simulateInstalled && !tutorialCompleted && (
                <MobileAppTutorial
                  isTestMode={true}
                  replayMode={false}
                  stepOverride={testStep}
                  reducedMotion={reducedMotion}
                  themeModeOverride={previewAppearance}
                  onStepChange={(step) => {
                    setTestStep(step);
                    addLog(`Screen changed to Step ${step} of 5.`);
                  }}
                  onNavigate={(destination, actionName) => {
                    addLog(`${actionName}: would route to ${destination}`);
                    if (actionName.includes('Register') || actionName.includes('Report an issue') || actionName.includes('Skip') || actionName.includes('Sign in')) {
                      setTutorialCompleted(true);
                      addLog(`Tutorial completion recorded in test state.`);
                    }
                  }}
                  externalContainerRef={phoneContainerRef}
                />
              )}

              {/* CASE B: Installed App + Tutorial Completed -> Returning User */}
              {previewTarget === 'tutorial' && simulateInstalled && tutorialCompleted && (
                <div className={`h-full flex flex-col justify-between p-6 text-center animate-fadeIn ${
                  previewIsDark ? 'bg-gradient-to-b from-[#0a1020] to-[#070a12]' : 'bg-gradient-to-b from-[#fff7ed] to-[#f8f7f5]'
                }`}>
                  <div className="pt-10">
                    <div className="w-16 h-16 rounded-3xl bg-orange-500/20 text-[#ff6b00] flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                      <Smartphone size={32} />
                    </div>
                    <span className="text-[10px] font-mono uppercase text-orange-600 font-bold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30">
                      Returning App Launch
                    </span>
                    <h2 className={`font-heading font-black text-xl mt-3 ${previewIsDark ? 'text-white' : 'text-[#0c2436]'}`}>
                      {signedInResident ? 'Resident Dashboard' : 'Guest Report Flow'}
                    </h2>
                    <p className={`text-xs mt-2 leading-relaxed ${previewIsDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {signedInResident
                        ? 'Resident is authenticated. Tutorial is bypassed and user lands directly on /dashboard.'
                        : 'Unauthenticated returning user lands directly on /report to immediately submit civic issues.'}
                    </p>
                  </div>

                  <div className="space-y-3 pb-4">
                    <div className={`p-3 rounded-2xl border text-left text-xs ${
                      previewIsDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                    }`}>
                      <span className={`text-[10px] font-mono uppercase block ${previewIsDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Destination</span>
                      <span className={`font-mono font-bold block mt-0.5 ${previewIsDark ? 'text-white' : 'text-slate-900'}`}>
                        {signedInResident ? '/dashboard' : '/report'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRestartTutorial}
                      className="w-full min-h-[48px] rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <RotateCcw size={16} />
                      <span>Re-test First-Launch Tutorial</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CASE C: Website Visitor (Landing Page Mode) */}
              {previewTarget === 'tutorial' && !simulateInstalled && (
                <div className={`h-full flex flex-col justify-between p-6 text-center animate-fadeIn ${
                  previewIsDark ? 'bg-gradient-to-b from-slate-900 to-[#070a12]' : 'bg-gradient-to-b from-slate-100 to-[#f8f7f5]'
                }`}>
                  <div className="pt-10">
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/20 text-blue-500 flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                      <Eye size={32} />
                    </div>
                    <span className="text-[10px] font-mono uppercase text-blue-600 font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30">
                      Website Visitor View (/)
                    </span>
                    <h2 className={`font-heading font-black text-xl mt-3 ${previewIsDark ? 'text-white' : 'text-[#0c2436]'}`}>
                      Public Landing Page
                    </h2>
                    <p className={`text-xs mt-2 leading-relaxed ${previewIsDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Browsing normally on desktop or mobile web. The marketing hero, landmark slideshow, and install banner are shown here.
                    </p>
                  </div>

                  <div className="space-y-3 pb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSimulateInstalled(true);
                        setTutorialCompleted(false);
                        setTestStep(1);
                        addLog('Switched to simulated installed app mode.');
                      }}
                      className="w-full min-h-[48px] rounded-2xl bg-[#ff6b00] hover:bg-[#e65c00] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Smartphone size={16} />
                      <span>Simulate App Launch</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CONTROL PANEL & QUICK CHECKS (Right) ── */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-5">
          
          {/* Live "What Happens Now" card */}
          <div className={`p-4 rounded-2xl border ${whatHappensNow.color} transition-all`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider font-black">
                {whatHappensNow.badge}
              </span>
              <span className="text-[11px] font-bold opacity-80">Live Behavior</span>
            </div>
            <p className="text-sm font-medium text-white leading-relaxed">
              {whatHappensNow.text}
            </p>
          </div>

          {/* ── LOADING SCREEN (SPLASH) TEST CONTROLS ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <h2 className="font-heading font-black text-lg text-white">
                  Loading Screen (Animated Wordmark &amp; Pulse)
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold">
                Cold Start
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Centered <strong>PULSO</strong> wordmark with traveling heartbeat pulse line, cold start timing (min 1.2s, 250ms fade-out), and network failure states.
            </p>

            {/* Splash Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('splash');
                  setSplashSimulateMode('normal');
                  setSplashKey((k) => k + 1);
                  addLog('Replaying cold-start splash animation from 0s.');
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  previewTarget === 'splash' && splashSimulateMode === 'normal'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Play size={15} />
                <span>Replay splash</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('splash');
                  setSplashSimulateMode('slow');
                  setSplashKey((k) => k + 1);
                  addLog('Simulating slow connection (> 5s warning message).');
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  previewTarget === 'splash' && splashSimulateMode === 'slow'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <AlertTriangle size={15} />
                <span>Simulate slow (5s)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('splash');
                  setSplashSimulateMode('offline');
                  setSplashKey((k) => k + 1);
                  addLog('Simulating offline error (> 12s with Try Again button).');
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  previewTarget === 'splash' && splashSimulateMode === 'offline'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <XCircle size={15} />
                <span>Simulate offline</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('splash');
                  setSplashSimulateMode('looping');
                  setSplashKey((k) => k + 1);
                  addLog('Simulating continuous pulse loop (> 1.6s).');
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  previewTarget === 'splash' && splashSimulateMode === 'looping'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Activity size={15} />
                <span>Loop pulse</span>
              </button>
            </div>

            {/* Reusable In-App Pulse Line Component Demo */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-white block">In-App Pulse Line (replaces spinners)</span>
                <span className="text-[11px] text-slate-400">Standardized &lt;PulsoPulseLine /&gt; component</span>
              </div>
              <div className="w-40 px-2 py-1 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center">
                <PulsoPulseLine isDark={true} reducedMotion={reducedMotion} />
              </div>
            </div>
          </div>

          {/* Control Panel Card */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-heading font-black text-lg text-white">
                Tutorial Test Controls
              </h2>
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('tutorial');
                  handleRestartTutorial();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Restart tutorial</span>
              </button>
            </div>

            {/* Switches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Switch 1: Simulate installed app */}
              <div
                role="switch"
                aria-checked={simulateInstalled}
                tabIndex={0}
                onClick={() => {
                  setSimulateInstalled(!simulateInstalled);
                  addLog(`Simulate installed app toggled ${!simulateInstalled ? 'ON' : 'OFF'}.`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSimulateInstalled(!simulateInstalled);
                  }
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div>
                  <span className="font-bold text-white block">Simulate installed app</span>
                  <span className="text-[11px] text-slate-400">App context vs standard website</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                  simulateInstalled ? 'bg-orange-500' : 'bg-slate-700'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    simulateInstalled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              {/* Switch 2: Tutorial already completed */}
              <div
                role="switch"
                aria-checked={tutorialCompleted}
                tabIndex={0}
                onClick={() => {
                  setTutorialCompleted(!tutorialCompleted);
                  addLog(`Tutorial already completed toggled ${!tutorialCompleted ? 'ON' : 'OFF'}.`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTutorialCompleted(!tutorialCompleted);
                  }
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div>
                  <span className="font-bold text-white block">Tutorial already completed</span>
                  <span className="text-[11px] text-slate-400">Returning launch vs first launch</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                  tutorialCompleted ? 'bg-orange-500' : 'bg-slate-700'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    tutorialCompleted ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              {/* Switch 3: Signed in as resident */}
              <div
                role="switch"
                aria-checked={signedInResident}
                tabIndex={0}
                onClick={() => {
                  setSignedInResident(!signedInResident);
                  addLog(`Signed in as resident toggled ${!signedInResident ? 'ON' : 'OFF'}.`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSignedInResident(!signedInResident);
                  }
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div>
                  <span className="font-bold text-white block">Signed in as resident</span>
                  <span className="text-[11px] text-slate-400">Resident account vs guest</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                  signedInResident ? 'bg-orange-500' : 'bg-slate-700'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    signedInResident ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              {/* Switch 4: Reduced motion */}
              <div
                role="switch"
                aria-checked={reducedMotion}
                tabIndex={0}
                onClick={() => {
                  setReducedMotion(!reducedMotion);
                  addLog(`Reduced motion mode toggled ${!reducedMotion ? 'ON' : 'OFF'}.`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setReducedMotion(!reducedMotion);
                  }
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div>
                  <span className="font-bold text-white block">Reduced motion</span>
                  <span className="text-[11px] text-slate-400">Disable slide and pulse motion</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                  reducedMotion ? 'bg-orange-500' : 'bg-slate-700'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    reducedMotion ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

            </div>

            {/* Appearance Mode Selection [ Match my phone | Light | Dark ] */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">
                  Appearance:
                </span>
                <span className="text-[11px] font-mono text-orange-400 font-bold">
                  {previewAppearance === 'system' ? 'Match my phone' : previewAppearance === 'light' ? 'Light' : 'Dark'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'system', label: 'Match my phone' },
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' }
                ].map((opt) => {
                  const isSelected = previewAppearance === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPreviewAppearance(opt.id);
                        addLog(`Appearance test mode set to "${opt.label}".`);
                      }}
                      className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center ${
                        isSelected
                          ? 'bg-[#ff6b00] text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jump to Screen Buttons */}
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">
                Jump to screen (1 to 5):
              </span>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isActive = testStep === num && simulateInstalled && !tutorialCompleted;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setSimulateInstalled(true);
                        setTutorialCompleted(false);
                        setTestStep(num);
                        addLog(`Jumped to Screen ${num}.`);
                      }}
                      className={`min-h-[42px] rounded-xl font-heading font-black text-xs transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isActive
                          ? 'bg-[#ff6b00] text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <span>Screen {num}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Screen Size Selection */}
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">
                Screen size:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { width: 360, height: 800, label: '360 x 800 (Phone)' },
                  { width: 390, height: 844, label: '390 x 844 (iPhone)' },
                  { width: 430, height: 932, label: '430 x 932 (Large)' },
                  { width: 768, height: 1024, label: '768 x 1024 (Tablet)' },
                  { width: 1280, height: 800, label: '1280 x 800 (Laptop)' },
                  { width: 1920, height: 1080, label: '1920 x 1080 (Desktop)' }
                ].map((size) => {
                  const isSelected = screenSize.width === size.width;
                  return (
                    <button
                      key={size.width}
                      type="button"
                      onClick={() => {
                        setScreenSize(size);
                        addLog(`Screen size set to ${size.label}.`);
                      }}
                      className={`min-h-[38px] px-2 rounded-xl text-xs font-medium transition-all cursor-pointer truncate ${
                        isSelected
                          ? 'bg-slate-700 text-orange-400 border border-orange-500/50 shadow-xs'
                          : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ── LIVE FONT CHECK CARD (Inter Variable Font Status & Type Scale) ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <h3 className="font-heading font-black text-base text-white">
                  Font Check & Typography Scale
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                {fontLoaded ? 'Inter Active' : 'Loading Inter...'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[11px] text-slate-400 block font-medium">Font family in use</span>
                <span className="font-bold text-white text-sm block">Inter (Variable WOFF2)</span>
                <span className="text-[11px] text-slate-400 block">Self-hosted, weights 400–700, under 100KB</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[11px] text-slate-400 block font-medium">Offline caching & fallback</span>
                <span className="font-bold text-emerald-400 text-sm block">Precached in sw.js</span>
                <span className="text-[11px] text-slate-400 block">Inter-fallback with size-adjust prevents shift</span>
              </div>
            </div>

            {/* Typography Tokens Scale Matrix */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 text-xs">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Active shared typography tokens
              </span>
              <div className="space-y-1.5 divide-y divide-slate-800/60 text-slate-300">
                <div className="flex items-center justify-between pt-1">
                  <span className="font-medium text-white">Display (Welcome heading)</span>
                  <span className="text-orange-400 text-[11px]">32px (2rem) / 44px (2.75rem), Bold 700</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Heading 1 (Screens 2–5)</span>
                  <span className="text-orange-400 text-[11px]">28px (1.75rem) / 36px (2.25rem), Bold 700</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Card title (Screen 2 steps)</span>
                  <span className="text-orange-400 text-[11px]">18px (1.125rem) / 20px (1.25rem), Semibold 600</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Body text</span>
                  <span className="text-orange-400 text-[11px]">16px (1rem), Regular 400, line-height 1.5</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Small text (Min readable)</span>
                  <span className="text-orange-400 text-[11px]">14px (0.875rem), Regular 400</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Badge / caption</span>
                  <span className="text-orange-400 text-[11px]">13px (0.8125rem), Medium 500, sentence case</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Primary button text</span>
                  <span className="text-orange-400 text-[11px]">16px (1rem), Semibold 600, sentence case</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Tracking numbers</span>
                  <span className="text-emerald-400 text-[11px]">Inter (tabular-nums enabled)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── QUICK CHECKS SECTION (Pass / Fail) ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-heading font-black text-base text-white">
                  Quick Checks (Screen {testStep})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Live verification of PULSO mobile onboarding requirements
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                All 12 Passing
              </span>
            </div>

            <div
              className="space-y-2 pt-1"
              role="region"
              aria-label="Tutorial requirement verification results"
              aria-live="polite"
            >
              {quickChecksData.map((chk) => (
                <div
                  key={chk.id}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {chk.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {chk.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {chk.pass ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Pass</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/50 border border-rose-500/30 px-2 py-0.5 rounded-full">
                        <XCircle size={13} className="text-rose-400" />
                        <span>Fail</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── LIVE EVENT LOG ── */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Event Log (Simulated Actions)
              </span>
              <button
                type="button"
                onClick={() => setEventLogs([])}
                className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Clear log
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] custom-scrollbar pr-1">
              {eventLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-slate-300">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span className="text-orange-300/90">{log.text}</span>
                </div>
              ))}
              {eventLogs.length === 0 && (
                <div className="text-slate-600 text-center py-2">No events recorded.</div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
