import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { App as NativeApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Toast } from '@capacitor/toast';
import { useTheme } from '../../contexts/ThemeContext';
import { dismissAndroidLayer } from '../../utils/nativeAndroid';
import { syncNativeSystemBars } from '../../utils/nativeSystemBars';
import MobileAppSplashScreen from './MobileAppSplashScreen';
import './native-android.css';

export default function NativeAndroidShell({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const lastBack = useRef(0);
  const [isStarting, setIsStarting] = useState(true);
  const [nativeSplashReleased, setNativeSplashReleased] = useState(false);
  const finishStartup = useCallback(() => setIsStarting(false), []);
  const darkBars = isStarting || isDark;

  useEffect(() => {
    let active = true;
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        void SplashScreen.hide().catch(console.warn).finally(() => {
          if (active) setNativeSplashReleased(true);
        });
      });
    });
    return () => {
      active = false;
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  useEffect(() => {
    return syncNativeSystemBars(darkBars ? '#0c1421' : '#f7f9fc');
  }, [darkBars, pathname]);

  useEffect(() => {
    lastBack.current = 0;
    const listener = NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (dismissAndroidLayer()) {
        lastBack.current = 0;
        return;
      }
      if (pathname !== '/') {
        if (canGoBack && (window.history.state?.idx ?? 0) > 0) navigate(-1);
        else navigate('/', { replace: true });
        return;
      }
      if (performance.now() - lastBack.current < 2000 && lastBack.current > 0) {
        void NativeApp.exitApp();
        return;
      }
      lastBack.current = performance.now();
      void Toast.show({ text: t('nativeAndroid.backToExit', 'Press back again to exit'), duration: 'short' });
    });
    return () => { void listener.then((subscription) => subscription.remove()); };
  }, [navigate, pathname, t]);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let restingHeight = viewport?.height || window.innerHeight;
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = viewport?.height || window.innerHeight;
        const typing = document.activeElement?.matches('textarea, input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="tel"], input[type="search"], input[type="number"], [contenteditable="true"]');
        if (!typing) restingHeight = height;
        root.classList.toggle('pulso-native-keyboard-open', Boolean(typing && restingHeight - height > 100));
      });
    };
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      root.classList.remove('pulso-native-keyboard-open');
    };
  }, []);

  return isStarting ? (
    <MobileAppSplashScreen
      onFinish={finishStartup}
      isReady={nativeSplashReleased}
      minDurationStartsOnReady
      loadsBundledApp
      themeModeOverride="dark"
      reducedMotion={window.matchMedia('(prefers-reduced-motion: reduce)').matches}
    />
  ) : children;
}
