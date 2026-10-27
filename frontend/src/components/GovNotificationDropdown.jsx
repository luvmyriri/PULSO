import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { getAuthUser } from '../utils/authSession';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import './gov-notifications.css';

export default function GovNotificationDropdown() {
    const user = getAuthUser();
    const { data, loading, error, reload } = useGovernmentData(`/api/notifications/user/${user?.id}?limit=20`);
    const disclosure = useRef(null);
    const notices = Array.isArray(data) ? data.filter(n => !n.is_hidden) : [];
    const unread = notices.filter(n => !n.is_read).length;
    useEffect(() => {
        function close(event) {
            if (event.type === 'keydown' && event.key === 'Escape') { disclosure.current?.removeAttribute('open'); disclosure.current?.querySelector('summary')?.focus(); }
            if (event.type === 'pointerdown' && !disclosure.current?.contains(event.target)) disclosure.current?.removeAttribute('open');
        }
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', close);
        return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
    }, []);
    async function markRead(id) {
        try { await governmentRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }); reload(); } catch { reload(); }
    }
    return <details className="gov-notifications" ref={disclosure}>
        <summary aria-label={error ? 'Notifications unavailable' : `Notifications${unread ? `, ${unread} unread` : ''}`}><Bell size={19} />{unread > 0 && <span>{unread}</span>}</summary>
        <section aria-label="Your notifications" className="gov-notifications__panel"><header><h2>Notifications</h2><button type="button" onClick={reload} aria-label="Refresh notifications"><RefreshCw size={16} /></button></header>
            {loading ? <p role="status">Loading notifications…</p> : error ? <p role="alert">Notifications couldn’t be loaded. <button onClick={reload}>Try again</button></p> : !notices.length ? <p>No notifications yet. Updates about your work will appear here.</p> : <ul>{notices.map(n => <li key={n.id} className={n.is_read ? '' : 'is-unread'}>
                {n.target_url ? <Link to={n.target_url} onClick={() => { markRead(n.id); disclosure.current?.removeAttribute('open'); }}>{n.title}</Link> : <strong>{n.title}</strong>}
                <p>{n.message}</p><time dateTime={n.created_at}>{new Date(n.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                {!n.is_read && <button onClick={() => markRead(n.id)}><Check size={13} /> Mark read</button>}
            </li>)}</ul>}
        </section>
    </details>;
}
