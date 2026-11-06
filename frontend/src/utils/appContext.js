/**
 * PULSO Mobile App Context & Onboarding State Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects whether PULSO is executing within an installed mobile app context:
 * - Standalone PWA display mode (CSS display-mode: standalone)
 * - iOS Safari standalone mode (window.navigator.standalone)
 * - Android TWA / WebAPK wrapper (android-app:// referrer)
 * - Explicit app launch flag (URL search parameter e.g. ?mode=standalone)
 * - Native app wrapper / webview bridges (Capacitor, Cordova, Flutter WebView)
 *
 * Governs first-launch onboarding tutorial state so that:
 * - First launch in installed mobile app shows the tutorial.
 * - Completed/skipped tutorial directs returning users to resident home / report.
 * - Residents can replay the tutorial anytime from Settings or Help.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Capacitor } from '@capacitor/core';

const APP_MODE_KEY = 'pulso_app_mode';
const TUTORIAL_COMPLETED_KEY = 'pulso_tutorial_completed';

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Detects whether the current session is running inside the installed mobile app / PWA.
 * Public web visitors in standard browser tabs return false.
 */
export function isInstalledApp() {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;

  try {
    // 1. Check URL parameters for explicit standalone mode or PWA launch
    const searchParams = new URLSearchParams(window.location.search);
    const modeParam = searchParams.get('mode');
    const sourceParam = searchParams.get('source');
    const appParam = searchParams.get('app');

    if (
      modeParam === 'standalone' ||
      modeParam === 'app' ||
      sourceParam === 'pwa' ||
      appParam === 'true'
    ) {
      // Persist across in-app client navigation
      localStorage.setItem(APP_MODE_KEY, 'standalone');
      return true;
    }

    // 2. Check CSS media query for standalone display mode
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      localStorage.setItem(APP_MODE_KEY, 'standalone');
      return true;
    }

    // 3. Check window-controls-overlay or minimal-ui fallback
    if (window.matchMedia && window.matchMedia('(display-mode: window-controls-overlay)').matches) {
      localStorage.setItem(APP_MODE_KEY, 'standalone');
      return true;
    }

    // 4. Check iOS Safari standalone property
    if (window.navigator && window.navigator.standalone === true) {
      localStorage.setItem(APP_MODE_KEY, 'standalone');
      return true;
    }

    // 5. Check Android TWA / WebAPK referrer
    if (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://')) {
      localStorage.setItem(APP_MODE_KEY, 'standalone');
      return true;
    }

    // 6. Check native wrapper injection (Capacitor, Cordova, Flutter WebView)
    if (
      Boolean(window.isNativeApp) ||
      Boolean(window.Capacitor?.isNativePlatform?.()) ||
      Boolean(window.cordova) ||
      Boolean(window.flutter_inappwebview)
    ) {
      localStorage.setItem(APP_MODE_KEY, 'standalone');
      return true;
    }

    // 7. Check previously persisted app-mode session
    if (localStorage.getItem(APP_MODE_KEY) === 'standalone') {
      return true;
    }
  } catch (err) {
    console.warn('PULSO app context check error:', err);
  }

  return false;
}

/**
 * Sets explicit app mode (useful for testing or switching contexts).
 * @param {'standalone' | 'browser'} mode
 */
export function setAppMode(mode) {
  if (typeof window === 'undefined') return;
  if (mode === 'standalone') {
    localStorage.setItem(APP_MODE_KEY, 'standalone');
  } else {
    localStorage.removeItem(APP_MODE_KEY);
  }
}

/**
 * Checks if resident has completed or skipped the first-launch tutorial.
 */
export function isTutorialCompleted() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true';
}

/**
 * Marks the tutorial as completed.
 */
export function markTutorialCompleted() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
}

/**
 * Resets the tutorial state (allows replaying as a new user).
 */
export function resetTutorial() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
}
