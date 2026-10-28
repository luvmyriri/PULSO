import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

/** The same loading identity is painted in index.html before React starts. */
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
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [osPrefersDark, setOsPrefersDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isOffline, setIsOffline] = useState(() =>
    forceOffline || (typeof navigator !== 'undefined' && !navigator.onLine)
  );
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const handleChange = (event) => setOsPrefersDark(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

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

  useEffect(() => {
    if (forceOffline) return;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - mountTimeRef.current) / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, [forceOffline]);

  useEffect(() => {
    if (forceSlow || forceOffline || !isReady) return;
    const remainingTime = Math.max(0, minDurationMs - (Date.now() - mountTimeRef.current));
    let finishTimeout;
    const dismissTimeout = setTimeout(() => {
      setIsFadingOut(true);
      finishTimeout = setTimeout(() => {
        if (!isTestMode) sessionStorage.setItem('pulso_session_started', 'true');
        onFinish?.();
      }, reducedMotion ? 0 : 250);
    }, remainingTime);
    return () => {
      clearTimeout(dismissTimeout);
      clearTimeout(finishTimeout);
    };
  }, [forceSlow, forceOffline, isReady, minDurationMs, isTestMode, onFinish, reducedMotion]);

  const handleRetry = () => {
    if (isTestMode) {
      mountTimeRef.current = Date.now();
      setElapsedSeconds(0);
      setIsOffline(false);
      return;
    }
    window.location.reload();
  };

  const selectedTheme = themeModeOverride || theme || 'light';
  const isDark = selectedTheme === 'dark' || (selectedTheme === 'system' && osPrefersDark);
  const showError = isOffline || elapsedSeconds >= 12 || forceOffline;
  const showSlow = !showError && (elapsedSeconds >= 5 || forceSlow);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('loadingScreen.ariaLabel', 'Loading PULSO')}
      data-theme={isDark ? 'dark' : 'light'}
      style={{
        backgroundColor: isDark ? '#080D19' : '#F7F9FC',
        color: isDark ? '#F8FAFC' : '#0B1630',
        opacity: isFadingOut ? 0 : 1,
        transition: reducedMotion ? 'none' : 'opacity 250ms ease-out'
      }}
      className={`${isTestMode ? 'absolute inset-0 z-30 h-full' : 'fixed inset-0 z-[99999] min-h-[100dvh]'} flex w-full flex-col items-center overflow-y-auto select-none font-sans`}
    >
      <main className="flex w-full min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        <img
          src="/pulso-loading-mark.png"
          alt=""
          aria-hidden="true"
          className="mb-3 h-[clamp(190px,55vw,240px)] w-[clamp(190px,55vw,240px)] object-contain"
        />
        <div className="text-[clamp(2.5rem,12vw,3.5rem)] font-extrabold leading-none tracking-[-0.035em]">PULSO</div>
        <div className={`mt-2 text-[clamp(1rem,4.3vw,1.3rem)] ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{t('loadingScreen.city', 'Caloocan City')}</div>

        <div className="mt-12 flex min-h-[112px] flex-col items-center justify-start gap-5">
          {!showError && (
            <span
              className={`h-10 w-10 rounded-full border-[3px] border-t-[#ff6b00] border-r-[#ff6b00] ${isDark ? 'border-b-slate-700 border-l-slate-700' : 'border-b-slate-200 border-l-slate-200'} ${reducedMotion ? '' : 'animate-spin'}`}
              aria-hidden="true"
            />
          )}
          {showError ? (
            <div className="flex max-w-[290px] flex-col items-center gap-4">
              <p className={isDark ? 'text-sm text-red-300' : 'text-sm text-red-700'}>{t('loadingScreen.connectionError', "We can't connect right now. Check your internet and try again.")}</p>
              <button type="button" onClick={handleRetry} className="min-h-12 rounded-xl bg-[#EA580C] px-6 py-2.5 text-sm font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#ff6b00]">{t('loadingScreen.retry', 'Try again')}</button>
            </div>
          ) : (
            <p className={`text-[clamp(0.875rem,3.7vw,1rem)] ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
              {showSlow ? t('loadingScreen.slow', 'Still loading. Please wait a moment.') : t('loadingScreen.readying', 'Getting things ready...')}
            </p>
          )}
        </div>
      </main>

      <footer className="w-full shrink-0 px-4 pt-3 text-center" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <span className="mx-auto mb-4 block h-1 w-9 rounded-full bg-[#ff6b00]" aria-hidden="true" />
        <div className="text-sm font-semibold">{t('loadingScreen.department', 'City Engineering Department')}</div>
        <div className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{t('loadingScreen.government', 'Caloocan City Government')}</div>
      </footer>
    </div>
  );
}
