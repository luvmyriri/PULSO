import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { App as NativeApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core';
import { Toast } from '@capacitor/toast';
import { useTheme } from '../../contexts/ThemeContext';
import { getAuthToken } from '../../utils/authSession';
import { residentDashboardRoute } from '../../utils/residentDashboardRoute';
import { dismissAndroidLayer } from '../../utils/nativeAndroid';
import './native-android.css';

export default function NativeAndroidShell() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const lastBack = useRef(0);

  useEffect(() => {
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => { void SplashScreen.hide().catch(console.warn); });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  useEffect(() => {
    void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(console.warn);
    void SystemBars.setStyle({
      bar: SystemBarType.NavigationBar,
      style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    }).catch(console.warn);
  }, [isDark]);

  useEffect(() => {
    lastBack.current = 0;
    const listener = NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (dismissAndroidLayer()) {
        lastBack.current = 0;
        return;
      }
      const home = getAuthToken() ? '/dashboard' : '/report';
      const dashboardHome = pathname === '/dashboard' && residentDashboardRoute(search).tab === 'overview';
      const atHome = home === '/dashboard' ? dashboardHome : pathname === home;
      if (!atHome && pathname !== '/') {
        if (canGoBack && (window.history.state?.idx ?? 0) > 0) navigate(-1);
        else navigate(home, { replace: true });
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
  }, [navigate, pathname, search, t]);

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

  return null;
}
