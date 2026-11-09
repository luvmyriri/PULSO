import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, ClipboardCheck, ClipboardList, Crosshair, Image, List, Map, MapPin, MessageSquare, Send, User, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAndroidBack } from '../../utils/nativeAndroid';
import { getAuthToken } from '../../utils/authSession';
import { markTutorialCompleted } from '../../utils/appContext';
import { ONBOARDING_CONTENT } from '../../data/onboardingContent';
import { NATIVE_GUIDE_CONTENT, nativeGuideStep } from '../../data/nativeGuideContent';
import NativeAppHeader, { NativeAppBrand, NativeLanguagePicker } from './NativeAppHeader';
import NativeGuideDiagram from './NativeGuideDiagram';
import './native-resident-theme.css';
import './native-resident-landing.css';
import './native-app-guide.css';

const icons = { 'clipboard-list': ClipboardList, 'clipboard-check': ClipboardCheck, 'map-pin': MapPin, 'message-square': MessageSquare, wrench: Wrench, map: Map, crosshair: Crosshair, camera: Camera, image: Image, user: User, send: Send, list: List };

export default function NativeAppGuide({ firstLaunch = false, onComplete, onNavigate, onStepChange, isAuthenticated }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const heading = useRef(null);
  const main = useRef(null);
  const previousStep = useRef(1);
  const language = i18n.resolvedLanguage === 'tl' ? 'tl' : 'en';
  const labels = NATIVE_GUIDE_CONTENT[language];
  const common = language === 'tl' ? ONBOARDING_CONTENT.tl : ONBOARDING_CONTENT;
  const content = nativeGuideStep(language, step);
  const signedIn = isAuthenticated ?? Boolean(getAuthToken());

  function goToStep(nextStep) {
    setStep(nextStep);
    onStepChange?.(nextStep);
  }
  function finish(path, reason) {
    markTutorialCompleted();
    if (onNavigate) onNavigate(path, reason);
    else navigate(path);
    onComplete?.();
  }
  useAndroidBack(step > 1, 0, () => goToStep(step - 1));

  useLayoutEffect(() => {
    if (previousStep.current === step) return;
    main.current?.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
    previousStep.current = step;
  }, [step]);

  return (
    <div className={`native-guide${firstLaunch ? ' native-guide--briefing' : ''}`} data-native-guide data-first-launch={firstLaunch || undefined} data-landing-theme={isDark ? 'dark' : 'light'} lang={language}>
      {!firstLaunch && <NativeAppHeader appearance="hero">
        <button type="button" className="native-home__account-link" onClick={() => finish(signedIn ? '/dashboard' : '/login', 'Account tapped')}>
          {t(signedIn ? 'nativeAndroid.home.myReports' : 'nativeAndroid.home.signInShort')}
        </button>
      </NativeAppHeader>}
      <div className="native-guide__utility">
        {firstLaunch && <NativeAppBrand linked={false} appearance="hero" />}
        <div className="native-guide__controls">
          {firstLaunch && <NativeLanguagePicker />}
          <button type="button" onClick={() => finish(firstLaunch ? '/' : signedIn ? '/dashboard' : '/', 'Skip tapped')} aria-label={common.header.skipAria}>
            {common.header.skipLabel}<ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <main ref={main} className="native-guide__main" aria-labelledby="native-guide-heading">
        <section className="native-guide__content">
          <div className="native-guide__intro">
            {step > 1 && <p className="native-guide__eyebrow">{content.label}</p>}
            <h1 id="native-guide-heading" ref={heading} tabIndex={-1}>{content.title} <strong>{content.accent}</strong></h1>
            <p className="native-guide__subtitle">{content.subtitle}</p>
          </div>
          <NativeGuideDiagram step={step} />
          <div className="native-guide__tips">
            {step === 1 && <h2>{labels.overview}</h2>}
            <ul>
              {content.items.map((item, index) => {
                const Icon = icons[content.icons?.[index] || item.icon] || ClipboardList;
                return <li key={`${step}-${index}`}>
                  <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                  <div><h3>{item.title}</h3><p>{item.description}</p></div>
                </li>;
              })}
            </ul>
          </div>
        </section>
      </main>
      <footer className="native-guide__footer">
        <div className="native-guide__progress-row">
          <span>{labels.step} {step} {labels.of} 5</span>
        </div>
        <div className="native-guide__progress" role="progressbar" aria-label={labels.label} aria-valuemin={1} aria-valuemax={5} aria-valuenow={step} aria-valuetext={`${labels.step} ${step} ${labels.of} 5`}>
          <span style={{ width: `${step * 20}%` }} />
        </div>
        <div className="native-guide__actions">
          {step > 1 && <button type="button" className="native-guide__back" onClick={() => goToStep(step - 1)} aria-label={common.header.backAria}>
            <ArrowLeft size={20} aria-hidden="true" />{content.backButton}
          </button>}
          <button type="button" className="native-guide__next" onClick={() => step < 5 ? goToStep(step + 1) : finish(firstLaunch ? '/' : signedIn ? '/report' : '/report?source=guest', firstLaunch ? 'Briefing completed' : 'Start a report tapped')}>
            <span>{step === 5 ? firstLaunch ? labels.finish : t('nativeAndroid.home.report') : labels.next}</span><ArrowRight size={22} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}
