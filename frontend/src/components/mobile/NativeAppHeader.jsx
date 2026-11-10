import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAndroidBack } from '../../utils/nativeAndroid';

const focus = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300';
const languages = [{ code: 'en', name: 'English' }, { code: 'tl', name: 'Filipino' }];

function LandingLanguage({ current, label, onChange }) {
  const panelId = useId();
  const container = useRef(null);
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);

  function closeAndFocus() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  useAndroidBack(open, 20, closeAndFocus);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event) {
      if (!container.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [open]);

  return (
    <div className="native-app-header__language" ref={container}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (!open || event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        closeAndFocus();
      }}>
      <button type="button" className="native-app-header__language-trigger" ref={trigger}
        aria-label={`${label} (${current.toUpperCase()})`} aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen(value => !value)}>
        {current.toUpperCase()}
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      <div id={panelId} className="native-app-header__language-options" role="group" aria-label={label} hidden={!open}>
        {languages.map(({ code, name }) => (
          <button type="button" key={code} lang={code} aria-pressed={current === code}
            onClick={() => { onChange(code); closeAndFocus(); }}>
            <span>{name}</span>
            {current === code && <Check size={16} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NativeLanguagePicker({ onLanguageChange }) {
  const { t, i18n } = useTranslation();
  return <LandingLanguage current={i18n.resolvedLanguage === 'tl' ? 'tl' : 'en'}
    label={t('nativeAndroid.navigation.language')} onChange={language => {
      void i18n.changeLanguage(language);
      localStorage.setItem('pulso_language', language);
      localStorage.setItem('i18nextLng', language);
      onLanguageChange?.(language);
    }} />;
}

export function NativeAppBrand({ linked = true, compact = false, appearance = 'default' }) {
  const { t } = useTranslation();
  const Root = linked ? Link : 'div';
  return (
    <Root to={linked ? '/resident-home' : undefined} aria-label={linked ? t('nativeAndroid.navigation.home') : undefined}
      className={`native-app-brand${compact ? ' native-app-brand--compact' : ''} flex min-h-11 min-w-0 items-center ${compact ? 'gap-1.5' : 'gap-2'} rounded-sm ${focus}`}>
      <img src="/pulso-loading-mark.png" alt="" className={`${compact ? 'h-10 w-8' : 'size-10'} shrink-0`} />
      <span className="min-w-0">
        <span className={`block ${compact ? 'text-sm' : 'text-base'} font-extrabold leading-tight tracking-tight`}>PULSO</span>
        <span className={`native-app-header__city block ${compact ? 'text-[0.6875rem]' : 'text-xs'} leading-tight ${appearance === 'hero' ? '' : 'text-slate-600 dark:text-slate-300'}`}>{t('loadingScreen.city')}</span>
      </span>
    </Root>
  );
}

export function NativeThemeToggle({ className = '' }) {
  const { t } = useTranslation();
  const { themeMode, changeTheme } = useTheme();
  const nextTheme = { light: 'dark', dark: 'system', system: 'light' }[themeMode] || 'light';
  const ThemeIcon = { light: Sun, dark: Moon, system: Monitor }[themeMode] || Sun;
  return (
    <button type="button" onClick={() => changeTheme(nextTheme)}
      title={t(`nativeAndroid.navigation.themes.${themeMode}`)}
      aria-label={t('nativeAndroid.navigation.changeTheme', { theme: t(`nativeAndroid.navigation.themes.${nextTheme}`) })}
      className={`flex size-11 shrink-0 items-center justify-center rounded-md ${focus} ${className}`}>
      <ThemeIcon size={20} aria-hidden="true" />
    </button>
  );
}

export default function NativeAppHeader({ children, onLanguageChange, appearance = 'default' }) {
  const { i18n } = useTranslation();
  const filipino = i18n.resolvedLanguage === 'tl';

  const selectLanguage = (language) => {
    void i18n.changeLanguage(language);
    localStorage.setItem('pulso_language', language);
    localStorage.setItem('i18nextLng', language);
    onLanguageChange?.(language);
  };

  return (
    <header data-native-app-header className={`${appearance === 'hero' ? 'native-app-header--hero ' : ''}sticky top-0 z-40 w-full shrink-0 border-b border-slate-300 bg-[#f7f9fc] text-[#172339] dark:border-slate-700 dark:bg-[#0c1421] dark:text-slate-50`}>
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-2 px-4">
        <NativeAppBrand appearance={appearance} />
        <div className="relative flex shrink-0 items-center gap-1">
          {children}
          {appearance === 'hero' ? (
            <NativeLanguagePicker onLanguageChange={onLanguageChange} />
          ) : (
            <button type="button" lang={filipino ? 'en' : 'tl'} aria-label={filipino ? 'Switch to English' : 'Lumipat sa Filipino'}
              onClick={() => selectLanguage(filipino ? 'en' : 'tl')}
              className={`flex size-11 items-center justify-center rounded-md text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 ${focus}`}>
              {filipino ? 'EN' : 'TL'}
            </button>
          )}
          <NativeThemeToggle className="text-primary hover:bg-slate-200 dark:hover:bg-slate-800" />
        </div>
      </div>
    </header>
  );
}
