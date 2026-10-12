import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import PulsoBottomScrim from './PulsoBottomScrim';

/**
 * MobileAppSplashScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Branded cold-start animated loading screen for the PULSO mobile app.
 *
 * Requirements & Specifications:
 * - Wordmark: "PULSO" in Inter Bold (700), clamp(2rem, 11vw, 3rem), -0.02em tracking.
 *   - "P" in PULSO orange (#ff6b00).
 *   - "ULSO" in navy (#0c2436, Light Mode) or white (#ffffff, Dark Mode).
 * - Underline: 3px thick, orange (#ff6b00), width matched to the wordmark.
 * - Pulse blip: Heartbeat blip (~1.5rem wide) traveling along the underline from left to right.
 * - Caption: "Caloocan City Engineering" in Inter 14px soft gray at bottom (safe area aware).
 * - Backgrounds: Light (#f8f7f5) and Dark (#070a12). No gradients, no glows.
 * - Optical Center: ~46% from top.
 *
 * Timeline (1.6s initial cycle):
 * - 0 - 0.5s: Letters P-U-L-S-O fade up one by one (8px translateY, 60ms stagger).
 * - 0.5 - 1.2s: Underline appears; traveling pulse sweeps across line.
 * - 1.2 - 1.6s: Line settles flat; holds.
 * - > 1.6s: Loop ONLY traveling pulse blip along the underline. Letters remain steady.
 * - Slow / Offline Handling:
 *   - > 5s: "Still loading. Please wait a moment."
 *   - > 12s or offline: "We can't connect right now. Check your internet and try again." + "Try again" CTA (>= 48px).
 * - Exit: Smooth 250ms fade-out once ready.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function MobileAppSplashScreen({
  onFinish,
  minDurationMs = 1200,
  isReady = true,
  isTestMode = false,
  forceSlow = false,
  forceOffline = false,
  themeModeOverride = null,
  reducedMotion = false
}) {
  const themeContext = useTheme();
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

  const isDark = activeSetting === 'dark' || (activeSetting === 'system' && osPrefersDark);

  // Animation & timeout states
  const [animationPhase, setAnimationPhase] = useState('initial'); // 'initial' | 'underlined' | 'looping'
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isOffline, setIsOffline] = useState(() => {
    if (forceOffline) return true;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return false;
  });

  const mountTimeRef = useRef(Date.now());

  // Listen to network status changes
  useEffect(() => {
    if (forceOffline) {
      setIsOffline(true);
      return;
    }
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [forceOffline]);

  // Track elapsed time for 5s (slow) and 12s (offline/error) messages
  useEffect(() => {
    if (forceOffline) {
      setIsOffline(true);
      return;
    }

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - mountTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
    }, 500);

    return () => clearInterval(timer);
  }, [forceOffline]);

  // Main sequence timer: Underline at 0.5s, Looping mode at 1.6s
  useEffect(() => {
    if (reducedMotion) {
      setAnimationPhase('looping');
      return;
    }

    const t1 = setTimeout(() => {
      setAnimationPhase('underlined');
    }, 500);

    const t2 = setTimeout(() => {
      setAnimationPhase('looping');
    }, 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reducedMotion]);

  // Handle dismissal: must wait at least minDurationMs (1200ms) before fading out
  useEffect(() => {
    if (forceSlow || forceOffline) return; // Stay in test state
    if (!isReady) return;

    const timeSinceMount = Date.now() - mountTimeRef.current;
    const remainingTime = Math.max(0, minDurationMs - timeSinceMount);

    const dismissTimeout = setTimeout(() => {
      setIsFadingOut(true);
      const finishTimeout = setTimeout(() => {
        if (!isTestMode && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('pulso_session_started', 'true');
        }
        onFinish?.();
      }, 250); // 250ms fade-out transition
      return () => clearTimeout(finishTimeout);
    }, remainingTime);

    return () => clearTimeout(dismissTimeout);
  }, [isReady, minDurationMs, isTestMode, onFinish, forceSlow, forceOffline]);

  // Retry action for 12s / offline timeout
  const handleRetry = () => {
    if (isTestMode) {
      mountTimeRef.current = Date.now();
      setElapsedSeconds(0);
      setIsOffline(false);
      setAnimationPhase('initial');
      setTimeout(() => setAnimationPhase('underlined'), 500);
      setTimeout(() => setAnimationPhase('looping'), 1600);
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const skyColor = isDark ? '#080D19' : '#EAF2FF';
  const textColor = isDark ? '#ffffff' : '#0B1630';
  const captionColor = isDark ? '#CBD5E1' : '#334155';
  const orange = '#ff6b00';
  const bgImg = isDark ? 'url(/pulso-bg-dark.svg)' : 'url(/pulso-bg-light.svg)';
  const scrimGradient = isDark
    ? 'linear-gradient(to top, rgba(11, 17, 32, 0.15) 0%, rgba(11, 17, 32, 0.10) 45%, rgba(11, 17, 32, 0) 100%)'
    : 'linear-gradient(to top, rgba(245, 249, 255, 0.15) 0%, rgba(245, 249, 255, 0.10) 45%, rgba(245, 249, 255, 0) 100%)';

  // Slow connection message (> 5s) and offline error (> 12s or offline)
  const showSlowMessage = (elapsedSeconds >= 5 || forceSlow) && !isOffline && elapsedSeconds < 12 && !forceOffline;
  const showErrorMessage = isOffline || elapsedSeconds >= 12 || forceOffline;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading PULSO"
      data-theme={isDark ? 'dark' : 'light'}
      style={{
        backgroundColor: skyColor,
        '--bg-scrim-rgb': isDark ? '11, 17, 32' : '245, 249, 255',
        transition: reducedMotion ? 'none' : 'opacity 250ms ease-out',
        opacity: isFadingOut ? 0 : 1
      }}
      className={`${
        isTestMode
          ? 'absolute inset-0 z-30 w-full h-full'
          : 'fixed inset-0 z-[99999] w-full min-h-[100vh] min-h-[100dvh]'
      } flex flex-col justify-between items-center select-none overflow-hidden font-sans`}
    >
      {/* Background illustration layer (30rem / 480px column centered on wide screens) */}
      <div
        className="absolute inset-0 w-full max-w-[480px] mx-auto pointer-events-none select-none z-0"
        style={{
          backgroundImage: bgImg,
          backgroundSize: '100% auto',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          transition: reducedMotion ? 'none' : 'background-image 150ms ease'
        }}
        aria-hidden="true"
      />

      {/* Soft blurred bottom fade scrim behind caption and action zone */}
      <PulsoBottomScrim isDark={isDark} />

      {/* Invisible screen reader announcement */}
      <span className="sr-only">Loading PULSO</span>

      {/* Top spacer to balance optical center at ~46% from top */}
      <div className="w-full h-12 shrink-0" aria-hidden="true" />

      {/* ── CENTERED WORDMARK & TRAVELING PULSE LINE ── */}
      <div className="flex flex-col items-center justify-center w-full px-6 -mt-8 sm:-mt-10">
        
        {/* Wordmark: "PULSO" */}
        <div
          className="flex items-baseline justify-center tracking-[-0.02em] font-bold font-sans whitespace-nowrap"
          style={{
            fontSize: isTestMode ? '2.5rem' : 'clamp(2rem, 11vw, 3rem)',
            lineHeight: 1.1
          }}
        >
          {/* Letter P: PULSO Orange */}
          <span
            style={{
              color: orange,
              animation: reducedMotion
                ? 'none'
                : 'pulsoLetterFadeUp 260ms cubic-bezier(0, 0, 0.2, 1) 0ms forwards'
            }}
            className="inline-block"
          >
            P
          </span>

          {/* Letter U */}
          <span
            style={{
              color: textColor,
              animation: reducedMotion
                ? 'none'
                : 'pulsoLetterFadeUp 260ms cubic-bezier(0, 0, 0.2, 1) 60ms forwards'
            }}
            className="inline-block"
          >
            U
          </span>

          {/* Letter L */}
          <span
            style={{
              color: textColor,
              animation: reducedMotion
                ? 'none'
                : 'pulsoLetterFadeUp 260ms cubic-bezier(0, 0, 0.2, 1) 120ms forwards'
            }}
            className="inline-block"
          >
            L
          </span>

          {/* Letter S */}
          <span
            style={{
              color: textColor,
              animation: reducedMotion
                ? 'none'
                : 'pulsoLetterFadeUp 260ms cubic-bezier(0, 0, 0.2, 1) 180ms forwards'
            }}
            className="inline-block"
          >
            S
          </span>

          {/* Letter O */}
          <span
            style={{
              color: textColor,
              animation: reducedMotion
                ? 'none'
                : 'pulsoLetterFadeUp 260ms cubic-bezier(0, 0, 0.2, 1) 240ms forwards'
            }}
            className="inline-block"
          >
            O
          </span>
        </div>

        {/* ── UNDERLINE WITH TRAVELING HEARTBEAT PULSE ── */}
        <div className="relative w-full max-w-[170px] xs:max-w-[195px] sm:max-w-[220px] h-6 mt-1 flex items-center justify-center">
          <svg
            viewBox="0 0 200 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Flat Base Underline */}
            <line
              x1="0"
              y1="10"
              x2="200"
              y2="10"
              stroke={orange}
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                opacity: animationPhase === 'initial' && !reducedMotion ? 0 : 1,
                transition: 'opacity 200ms ease-out'
              }}
            />

            {/* Traveling Heartbeat Pulse Group (Active in underlined & looping phases) */}
            {!reducedMotion && animationPhase !== 'initial' && (
              <g
                className={
                  animationPhase === 'looping'
                    ? 'pulso-splash-looping-pulse'
                    : 'pulso-splash-initial-pulse'
                }
              >
                {/* Background Mask to conceal the flat line directly beneath the heartbeat wave */}
                <rect x="-14" y="0" width="28" height="20" fill={skyColor} />

                {/* Heartbeat Peak & Dip Path */}
                <path
                  d="M -14,10 L -6,10 L -2,2 L 3,18 L 7,10 L 14,10"
                  stroke={orange}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
            )}
          </svg>
        </div>

        {/* ── SLOW CONNECTION / OFFLINE STATUS MESSAGES ── */}
        <div className="min-h-[48px] mt-4 flex flex-col items-center justify-center text-center max-w-[280px]">
          {/* 5s Slow Connection Line */}
          {showSlowMessage && (
            <p
              className="text-xs sm:text-sm font-normal animate-fadeIn transition-colors"
              style={{ color: captionColor }}
            >
              Still loading. Please wait a moment.
            </p>
          )}

          {/* 12s / Offline Error State */}
          {showErrorMessage && (
            <div className="flex flex-col items-center gap-3 animate-fadeIn">
              <p
                className="text-xs sm:text-sm font-medium leading-snug transition-colors"
                style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}
              >
                We can&apos;t connect right now. Check your internet and try again.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-[#0B1630] font-semibold text-sm shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                style={{
                  outlineOffset: '2px'
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM CAPTION: Caloocan City Engineering (Inter 14px, Soft Gray) ── */}
      <footer
        className="w-full text-center pb-6 sm:pb-8 shrink-0"
        style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))'
        }}
      >
        <span
          className="text-sm font-normal tracking-normal transition-colors"
          style={{ color: captionColor }}
        >
          Caloocan City Engineering
        </span>
      </footer>

      {/* Inline Keyframes & Animations (< 2 KB CSS) */}
      <style>{`
        @keyframes pulsoLetterFadeUp {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Initial 0.65s to 1.25s single pulse sweep */
        @keyframes pulsoInitialPulseSweep {
          0% {
            transform: translateX(-25px);
          }
          100% {
            transform: translateX(225px);
          }
        }

        .pulso-splash-initial-pulse {
          animation: pulsoInitialPulseSweep 650ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
          will-change: transform;
        }

        /* Gentle looping pulse: sweeps for 0.8s, rests flat for 0.55s before next heartbeat */
        @keyframes pulsoLoopingPulseSweep {
          0% {
            transform: translateX(-25px);
          }
          62% {
            transform: translateX(225px);
          }
          100% {
            transform: translateX(225px);
          }
        }

        .pulso-splash-looping-pulse {
          animation: pulsoLoopingPulseSweep 1.35s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .pulso-splash-initial-pulse,
          .pulso-splash-looping-pulse {
            animation: none !important;
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
