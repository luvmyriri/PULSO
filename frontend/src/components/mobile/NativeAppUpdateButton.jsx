import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw } from 'lucide-react';
import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { API_BASE_URL } from '../../utils/apiBase';
import { isNativeAndroid } from '../../utils/appContext';
import { updateState } from '../../utils/appUpdates';
import { useAndroidBack } from '../../utils/nativeAndroid';
import NativeBottomSheet from './NativeBottomSheet';
import './native-app-update.css';

const Updater = registerPlugin('PulsoAppUpdate');

export function UpdateSheet({ onDismiss }) {
  const { t } = useTranslation();
  const text = key => t(`nativeAndroid.appUpdate.${key}`);
  const [state, setState] = useState('checking');
  const [installed, setInstalled] = useState(null);
  const [release, setRelease] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const cancelRef = useRef(null);
  const downloadRef = useRef(null);
  const backToAvailable = () => { setState('available'); requestAnimationFrame(() => downloadRef.current?.focus()); };
  useAndroidBack(state === 'confirm', 40, backToAvailable);
  useEffect(() => { if (state === 'confirm') cancelRef.current?.focus(); }, [state]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let active = true;
    async function check() {
      try {
        const info = await App.getInfo();
        if (active) setInstalled(info);
        const response = await fetch(`${API_BASE_URL}/api/mobile/app-updates/latest`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Update service unavailable');
        const latest = await response.json();
        const result = updateState(latest, info);
        if (active) { setRelease(latest); setState(result); }
      } catch {
        if (active) setState('error');
      } finally { clearTimeout(timer); }
    }
    void check();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [attempt]);

  async function download() {
    setOpening(true);
    setDownloadError(false);
    try {
      await Updater.download({ versionCode: release.versionCode });
      setState('downloadOpened');
    } catch { setDownloadError(true); }
    finally { setOpening(false); }
  }

  return <NativeBottomSheet title={text(state === 'confirm' ? 'confirmTitle' : 'title')} description={text(state === 'confirm' ? 'confirmDescription' : 'description')}
    closeLabel={text('close')} onDismiss={onDismiss}>
    <div className="native-app-update">
      {installed && <p className="native-app-update__version">{t('nativeAndroid.appUpdate.installed', { version: installed.version, build: installed.build })}</p>}
      <p role="status" aria-live="polite">{text(state)}</p>
      {release && ['available', 'downloadOpened', 'confirm'].includes(state) && <p className="native-app-update__version">
        {t('nativeAndroid.appUpdate.latest', { version: release.versionName, build: release.versionCode })}
      </p>}
      {downloadError && <p role="alert">{text('downloadError')}</p>}
      {(state === 'available' || state === 'downloadOpened') && <button ref={downloadRef} type="button" className="native-app-update__download" onClick={() => { setDownloadError(false); setState('confirm'); }}>
        <Download size={18} aria-hidden="true" />{text('download')}
      </button>}
      {state === 'confirm' && <div className="native-app-update__confirmation">
        <button ref={cancelRef} type="button" className="native-app-update__retry" disabled={opening} onClick={backToAvailable}>{text('notNow')}</button>
        <button type="button" className="native-app-update__download" disabled={opening} onClick={download}>{text(opening ? 'opening' : 'confirmAction')}</button>
      </div>}
      {state === 'error' && <button type="button" className="native-app-update__retry" onClick={() => { setState('checking'); setAttempt(value => value + 1); }}>
        <RefreshCw size={16} aria-hidden="true" />{text('retry')}
      </button>}
    </div>
  </NativeBottomSheet>;
}

export default function NativeAppUpdateButton({ prominent = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!isNativeAndroid()) return null;
  return <>
    <button type="button" className={`native-app-update-trigger${prominent ? ' native-app-update-trigger--prominent' : ''}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <RefreshCw size={16} aria-hidden="true" />{t(`nativeAndroid.appUpdate.${prominent ? 'shortLabel' : 'check'}`)}
    </button>
    {open && <UpdateSheet onDismiss={() => setOpen(false)} />}
  </>;
}
