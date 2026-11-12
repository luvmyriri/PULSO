import { ArrowRight, Camera, ChevronRight, CircleCheck, Search, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import NativeAppHeader, { NativeResidentAccountLink } from './NativeAppHeader';
import NativeTrackSheet from './NativeTrackSheet';
import NativeAppUpdateButton from './NativeAppUpdateButton';
import './native-resident-theme.css';
import './native-resident-landing.css';

const steps = [
  { key: 'capture', icon: <Camera size={31} strokeWidth={1.6} aria-hidden="true" /> },
  { key: 'submit', icon: <Send size={31} strokeWidth={1.6} aria-hidden="true" /> },
  { key: 'follow', icon: <CircleCheck size={31} strokeWidth={1.6} aria-hidden="true" /> },
];

export default function NativeResidentLanding({ residentSignedIn, trackingRoute = false }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [trackingOpen, setTrackingOpen] = useState(false);

  return (
    <div className="native-resident-landing" data-native-resident-landing data-landing-theme={isDark ? 'dark' : 'light'}
      lang={i18n.resolvedLanguage === 'tl' ? 'tl' : 'en'}>
      <div className="native-home__backdrop" aria-hidden="true">
        <img src="/resident-hero/native-bonifacio-monument.webp" alt="" fetchPriority="high" />
      </div>
      <NativeAppHeader appearance="hero">
        <NativeResidentAccountLink signedIn={residentSignedIn} />
      </NativeAppHeader>
      <main className="native-home__main" id="native-home-content">
        <section className="native-home__hero" aria-labelledby="native-home-heading">
          <h1 id="native-home-heading">
            <span>{t('nativeAndroid.home.headlineStart')}</span>{' '}
            <span>{t('nativeAndroid.home.headlineMiddle')}</span>{' '}
            <strong>Caloocan</strong>
          </h1>
          <span className="native-home__signal" aria-hidden="true" />
          <p className="native-home__intro">{t('nativeAndroid.home.welcome')}</p>
          <nav aria-label={t('nativeAndroid.home.actions')} className="native-home__actions">
            <Link to={residentSignedIn ? '/report' : '/report?source=guest'} className="native-home__report">
              <Camera size={29} aria-hidden="true" />
              <span>{t('nativeAndroid.home.report')}</span>
              <ArrowRight size={24} aria-hidden="true" />
            </Link>
            <button type="button" className="native-home__track" aria-haspopup="dialog" onClick={() => setTrackingOpen(true)}>
              <Search size={17} aria-hidden="true" />
              <span>{t('nativeAndroid.home.track')}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </section>
        <section className="native-home__how" aria-labelledby="native-home-how">
          <span className="native-home__signal" aria-hidden="true" />
          <h2 id="native-home-how">{t('nativeAndroid.home.howTitle')} <strong>{t('nativeAndroid.home.howAccent')}</strong></h2>
          <ol className="native-home__steps">
            {steps.map(({ key, icon }, index) => (
              <li key={key}>
                <div className="native-home__step-icon">
                  <span aria-hidden="true">{index + 1}</span>
                  {icon}
                </div>
                <h3>{t(`nativeAndroid.home.steps.${key}.title`)}</h3>
                <p>{t(`nativeAndroid.home.steps.${key}.description`)}</p>
                {index < steps.length - 1 && <ChevronRight className="native-home__step-arrow" size={21} aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </section>
        <aside className="native-home__community">
          <div className="native-home__city">
            <img src="/caloocan-seal-large.png" width="64" height="64" alt={t('nativeAndroid.home.citySeal')} />
          </div>
          <div>
            <h2>{t('nativeAndroid.home.communityStart')} <strong>Caloocan</strong>{i18n.resolvedLanguage !== 'tl' && <br />}{t('nativeAndroid.home.communityEnd')}</h2>
            <p>{t('nativeAndroid.home.communityTagline')}</p>
          </div>
          <svg className="native-home__card-cut" viewBox="0 0 350 25" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M0 25C220 25 235 8 350 0V25Z" fill="currentColor" />
          </svg>
        </aside>
        <footer className="native-home__footer">
          <Link to="/tutorial">{t('nativeAndroid.home.guide')}</Link>
          <NativeAppUpdateButton prominent />
          <p>{t('loadingScreen.department')}</p>
        </footer>
      </main>
      <svg className="native-home__footer-cut" viewBox="0 0 390 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 3C95-15 122 52 270 24C324 14 350 17 390 28V40C275 8 209 64 89 27C48 14 20 13 0 18Z" fill="currentColor" />
      </svg>
      {(trackingOpen || trackingRoute) && <NativeTrackSheet onDismiss={() => {
        setTrackingOpen(false);
        if (trackingRoute) navigate('/', { replace: true });
      }} />}
    </div>
  );
}
