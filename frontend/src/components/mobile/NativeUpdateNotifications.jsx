import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { useTranslation } from 'react-i18next';
import { UpdateSheet } from './NativeAppUpdateButton';

const Updater = registerPlugin('PulsoAppUpdate');

/** Native notification shade owns the notice; this component renders only on tap. */
export default function NativeUpdateNotifications() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    void Updater.configureNotifications({ language: i18n.resolvedLanguage === 'tl' ? 'tl' : 'en' }).catch(() => {});
    const consume = async () => {
      try { const tap = await Updater.consumeUpdateTap(); if (active && tap.open) setOpen(true); } catch { /* Manual update action remains available. */ }
    };
    const listener = Updater.addListener('openUpdate', () => { if (active) setOpen(true); void consume(); });
    void listener.then(consume).catch(() => {});
    const check = () => { if (document.visibilityState !== 'hidden') void Updater.checkNotifications().catch(() => {}); };
    const resume = App.addListener('appStateChange', state => { if (state.isActive) { check(); void consume(); } });
    void resume.catch(() => {});
    const interval = setInterval(check, 60000);
    window.addEventListener('online', check);
    return () => {
      active = false; clearInterval(interval); window.removeEventListener('online', check);
      void listener.then(subscription => subscription.remove()).catch(() => {});
      void resume.then(subscription => subscription.remove()).catch(() => {});
    };
  }, [i18n.resolvedLanguage]);
  return open ? <UpdateSheet onDismiss={() => setOpen(false)} /> : null;
}
