import { useId, useLayoutEffect, useRef } from 'react';
import { ArrowLeft, ArrowUpRight, Bell, BookOpen, ChevronRight, Clock, FileText, Phone, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAndroidBack } from '../../utils/nativeAndroid';
import './native-dashboard-search.css';

function SearchPanel({ query, onQueryChange, onClose, trigger, actions, reports, updates, guides, hotlines,
  recent, onClearRecent, onRemoveRecent, onReport, onUpdate, onGuide, onHotline, loading, updatesUnavailable, announcement }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const text = key => t(`nativeAndroid.search.${key}`);
  const panel = useRef(null);
  const input = useRef(null);
  const navigating = useRef(false);
  const id = useId();
  const q = query.trim().toLocaleLowerCase();
  const matchingActions = q ? actions.filter(action => `${action.label} ${action.searchText}`.toLocaleLowerCase().includes(q)) : actions.slice(0, 4);
  const groups = q ? [
    { label: text('reports'), rows: reports.map(report => ({ key: report.id, title: report.category || report.ai_category || report.ticket_id,
      detail: [report.ticket_id, report.location_string].filter(Boolean).join(' · '), icon: FileText, select: () => onReport(report) })) },
    { label: text('actions'), rows: matchingActions.map(action => ({ key: action.id, title: action.label, icon: null, customIcon: action.icon, select: action.onClick })) },
    { label: text('updates'), rows: updates.map(update => ({ key: update.id, title: update.title, detail: update.department, icon: Bell, select: () => onUpdate(update) })) },
    { label: text('guides'), rows: guides.map(guide => ({ key: guide.id, title: guide.title, detail: guide.excerpt, icon: BookOpen, select: () => onGuide(guide) })) },
    { label: text('hotlines'), rows: hotlines.map(hotline => ({ key: hotline.name, title: hotline.name, detail: hotline.num, icon: Phone, select: () => onHotline(hotline) })) },
  ] : [{ label: text('actions'), rows: matchingActions.map(action => ({ key: action.id, title: action.label, customIcon: action.icon, select: action.onClick })) }];
  const count = q ? groups.reduce((sum, group) => sum + group.rows.length, 0) : 0;
  useAndroidBack(true, 30, onClose);

  useLayoutEffect(() => {
    const dialog = panel.current;
    const returnTarget = trigger.current;
    const previousOverflow = document.body.style.overflow;
    const scrollTop = window.scrollY;
    const viewport = window.visualViewport;
    const sizeToViewport = () => {
      dialog.style.setProperty('--native-search-height', `${viewport?.height || window.innerHeight}px`);
      dialog.style.top = `${viewport?.offsetTop || 0}px`;
    };
    sizeToViewport();
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    input.current?.focus({ preventScroll: true });
    viewport?.addEventListener('resize', sizeToViewport);
    viewport?.addEventListener('scroll', sizeToViewport);
    window.addEventListener('resize', sizeToViewport);
    return () => {
      viewport?.removeEventListener('resize', sizeToViewport);
      viewport?.removeEventListener('scroll', sizeToViewport);
      window.removeEventListener('resize', sizeToViewport);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (!navigating.current && returnTarget?.isConnected) {
        window.scrollTo({ top: scrollTop, behavior: 'instant' });
        returnTarget.focus({ preventScroll: true });
      }
    };
  }, [trigger]);

  function choose(row) {
    navigating.current = true;
    row.select();
  }
  function submit(event) {
    event.preventDefault();
    const first = groups.find(group => group.rows.length)?.rows[0];
    if (q && first) choose(first);
  }
  return <dialog ref={panel} className="native-search-panel" data-search-theme={isDark ? 'dark' : 'light'}
    aria-label={t('nativeAndroid.navigation.search')} data-pulso-search="true" data-native-system-bar-surface
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 className="sr-only">{t('nativeAndroid.navigation.search')}</h2>
    <form className="native-search-panel__toolbar" role="search" onSubmit={submit}>
      <button type="button" className="native-search-panel__back" aria-label={text('back')} onClick={onClose}><ArrowLeft size={22} aria-hidden="true" /></button>
      <div className="native-search-panel__field">
        <Search size={19} aria-hidden="true" />
        <input ref={input} type="search" value={query} onChange={event => onQueryChange(event.target.value)}
          data-pulso-search-input="true" autoComplete="off" enterKeyHint="search" aria-label={t('nativeAndroid.navigation.search')}
          aria-controls={`${id}-results`} placeholder={t('nativeAndroid.navigation.search')} />
        {query && <button type="button" aria-label={text('clear')} onClick={() => { onQueryChange(''); input.current?.focus(); }}><X size={18} aria-hidden="true" /></button>}
      </div>
    </form>
    <div id={`${id}-results`} className="native-search-panel__results" tabIndex={-1}>
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      <p className="native-search-panel__summary" role="status" aria-live="polite" aria-atomic="true">
        {q ? t('nativeAndroid.search.results', { count }) : text('intro')}
      </p>
      {loading && <p className="native-search-panel__notice" role="status">{text('loading')}</p>}
      {updatesUnavailable && <p className="native-search-panel__notice">{text('updatesUnavailable')}</p>}
      {!q && recent.length > 0 && <section className="native-search-panel__group" aria-labelledby={`${id}-recent`}>
        <div className="native-search-panel__section-header"><h3 id={`${id}-recent`}>{text('recent')}</h3>
          <button type="button" onClick={onClearRecent}>{text('clearAll')}</button></div>
        <ul>{recent.map((item, index) => <li key={item} className="native-search-panel__recent">
          <button type="button" className="native-search-panel__result" onClick={() => { onQueryChange(item); input.current?.focus(); }}>
            <Clock size={18} aria-hidden="true" /><span>{item}</span><ArrowUpRight size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label={t('nativeAndroid.search.removeRecent', { query: item })} onClick={event => { onRemoveRecent(event, item, index); input.current?.focus(); }}><X size={17} aria-hidden="true" /></button>
        </li>)}</ul>
      </section>}
      {q && count === 0 && !loading && <div className="native-search-panel__empty"><Search size={26} aria-hidden="true" /><h3>{text('empty')}</h3><p>{text('emptyHelp')}</p></div>}
      {groups.filter(group => group.rows.length).map((group, index) => <section key={group.label} className="native-search-panel__group" aria-labelledby={`${id}-group-${index}`}>
        <div className="native-search-panel__section-header"><h3 id={`${id}-group-${index}`}>{group.label}</h3><span>{group.rows.length}</span></div>
        <ul>{group.rows.map(row => <li key={row.key}><button type="button" className="native-search-panel__result" onClick={() => choose(row)}>
          {row.icon ? <row.icon size={19} aria-hidden="true" /> : <span className="native-search-panel__icon" aria-hidden="true">{row.customIcon}</span>}
          <span className="native-search-panel__result-copy"><strong>{row.title}</strong>{row.detail && <small>{row.detail}</small>}</span>
          <ChevronRight size={17} aria-hidden="true" />
        </button></li>)}</ul>
      </section>)}
    </div>
  </dialog>;
}

export default function NativeDashboardSearch({ isOpen, onOpen, onClose, query, ...props }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const trigger = useRef(null);
  return <div className="native-dashboard-search" data-pulso-search="true" data-search-theme={isDark ? 'dark' : 'light'}>
    <button ref={trigger} type="button" className="native-dashboard-search__trigger" aria-haspopup="dialog"
      aria-label={t('nativeAndroid.navigation.search')} onClick={onOpen}>
      <Search size={19} aria-hidden="true" /><span>{query || t('nativeAndroid.navigation.search')}</span>
    </button>
    {isOpen && <SearchPanel {...props} trigger={trigger} query={query} onClose={onClose} />}
  </div>;
}
