import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Info } from 'lucide-react';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import ResidentCheckbox from './common/ResidentCheckbox';
import './resident-notification-settings.css';

const COPY = {
  en: {
    title: 'Notifications', intro: 'Choose your updates and how you receive them.',
    enabled: 'Receive updates', enabledHint: 'Manage alerts about your reports and city updates.',
    report_updates: 'Changes to my reports', related_updates: 'City updates related to my reports',
    in_app: 'In-app notifications', inAppHint: 'Read updates in your PULSO inbox.', email: 'Email notifications',
    channels: 'Delivery', categories: 'Updates', save: 'Save preferences', saving: 'Saving…',
    saved: 'Preferences saved.', loading: 'Loading your preferences…', retry: 'Reload preferences',
    emailReady: 'Email delivery is available when selected.',
    emailMissing: 'Email delivery is not connected yet. You can still save this preference.',
    privacy: 'Email alerts include a PULSO link, without your report details or location.',
    phone: 'Phone push notifications are not connected. In-app updates remain available.',
    error: 'Could not load your preferences. Try again.', saveError: 'Could not save your preferences. Your changes are still here. Try again.',
    details: 'About delivery', paused: 'Updates are paused. Turn on “Receive updates” to use the choices below.',
    expanded: 'Changes apply to future notices and queued emails. A send already underway may finish. Existing notices remain in your inbox.',
    conflict: 'Your preferences changed. Reload and review them before saving.',
  },
  tl: {
    title: 'Mga notification', intro: 'Piliin ang mga update at kung paano mo gustong matanggap ang mga ito.',
    enabled: 'Tumanggap ng mga update', enabledHint: 'Pamahalaan ang mga abiso tungkol sa iyong mga ulat at sa lungsod.',
    report_updates: 'Mga pagbabago sa aking mga ulat', related_updates: 'Mga update ng lungsod na kaugnay ng aking mga ulat',
    in_app: 'Mga notification sa app', inAppHint: 'Basahin ang mga update sa iyong PULSO inbox.', email: 'Mga notification sa email',
    channels: 'Paraan ng pagtanggap', categories: 'Mga update', save: 'I-save ang mga kagustuhan', saving: 'Sine-save…',
    saved: 'Na-save ang mga kagustuhan.', loading: 'Kinukuha ang iyong mga kagustuhan…', retry: 'Kunin muli ang mga kagustuhan',
    emailReady: 'Maaaring magpadala sa email kapag pinili ito.',
    emailMissing: 'Hindi pa nakakonekta ang email. Maaari mo pa ring i-save ang piniling ito.',
    privacy: 'Link sa PULSO ang laman ng email; walang detalye ng ulat o lokasyon.',
    phone: 'Hindi pa nakakonekta ang push notification sa telepono. Available pa rin ang mga update sa app.',
    error: 'Hindi makuha ang mga kagustuhan. Subukang muli.', saveError: 'Hindi na-save ang mga kagustuhan. Nandito pa ang iyong mga pagbabago. Subukang muli.',
    details: 'Tungkol sa pagtanggap', paused: 'Naka-pause ang mga update. I-on ang “Tumanggap ng mga update” para magamit ang mga pagpipilian sa ibaba.',
    expanded: 'Para ito sa mga susunod na abiso at nakapilang email. Maaaring matapos ang pagpapadalang nasimulan na. Mananatili sa inbox ang mga dati nang abiso.',
    conflict: 'Nagbago ang mga kagustuhan. Kunin at suriin muli bago mag-save.',
  },
};

export default function ResidentNotificationSettings({ onSaved }) {
  const { i18n } = useTranslation();
  const text = /^(tl|fil)/i.test(i18n.language) ? COPY.tl : COPY.en;
  const record = useGovernmentData('/api/residents/notification-preferences');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { if (record.data) setDraft(record.data); }, [record.data]);
  function change(key, value) { setDraft(current => ({ ...current, [key]: value })); setMessage(''); setError(''); }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    const body = { expected_version: draft.version, ...Object.fromEntries(['enabled', 'report_updates', 'related_updates', 'in_app', 'email'].map(key => [key, draft[key]])) };
    try {
      const saved = await governmentRequest('/api/residents/notification-preferences', { method: 'PUT', body });
      setDraft(saved); setMessage(text.saved); onSaved?.(saved);
    } catch (cause) { setError(cause.status === 409 ? text.conflict : text.saveError); }
    finally { setBusy(false); }
  }
  const row = (key, description) => <ResidentCheckbox key={key} label={text[key]} description={description}
    checked={draft[key]} disabled={busy} onChange={event => change(key, event.target.checked)} />;

  return <section className="resident-notification-settings" aria-labelledby="resident-notifications-title">
    <header><h2 id="resident-notifications-title">{text.title}</h2><p>{text.intro}</p></header>
    {record.loading && !draft ? <p role="status">{text.loading}</p>
      : record.error && !draft ? <div role="alert"><p>{text.error}</p><button type="button" className="resident-notification-settings__retry" onClick={record.reload}>{text.retry}</button></div>
        : draft && <form onSubmit={save} aria-busy={busy}>
          <div className="resident-notification-settings__master">{row('enabled', text.enabledHint)}</div>
          {!draft.enabled && <p className="resident-notification-settings__note" role="status">{text.paused}</p>}
          <fieldset disabled={busy || !draft.enabled}><legend>{text.categories}</legend>{['report_updates', 'related_updates'].map(key => row(key))}</fieldset>
          <fieldset disabled={busy || !draft.enabled}><legend>{text.channels}</legend>
            {row('in_app', text.inAppHint)}
            {row('email', draft.email_service === 'configured' ? text.emailReady : text.emailMissing)}
          </fieldset>
          <div className="resident-notification-settings__privacy"><Info size={16} aria-hidden="true" /><p>{text.privacy}</p></div>
          <details className="resident-notification-settings__details"><summary>{text.details}<ChevronDown size={16} aria-hidden="true" /></summary><p>{text.phone}</p><p>{text.expanded}</p></details>
          {error && <div role="alert" className="resident-notification-settings__feedback"><p>{error}</p><button type="button" className="resident-notification-settings__retry" disabled={busy || record.loading} onClick={() => { setError(''); record.reload(); }}>{text.retry}</button></div>}
          {message && <p role="status" className="resident-notification-settings__saved"><Check size={16} aria-hidden="true" />{message}</p>}
          <button className="resident-notification-settings__save" type="submit" disabled={busy}>{busy ? text.saving : text.save}</button>
        </form>}
  </section>;
}
