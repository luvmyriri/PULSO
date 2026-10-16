import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Bell,
    Check,
    Clock3,
    ExternalLink,
    Inbox,
    Lock,
    RefreshCw,
    ShieldAlert,
    X,
} from '../icons';
import { API_BASE_URL } from '../utils/apiBase';
import './notification-center.css';

const SAMPLE_GOV_NOTIFICATIONS = [
    {
        id: 101,
        type: 'assigned',
        title: 'Work order assigned',
        body: 'WO-2026-1197 (Exposed electrical wire) assigned to Field Ops Team.',
        scope: 'North Caloocan',
        time: '8:32 AM',
        target_url: '/gov/operations?view=work-orders&wo=1197',
        is_read: false,
    },
    {
        id: 102,
        type: 'reviews',
        title: 'Review requested',
        body: 'Field Crew A requested completion review for WO-2026-1182.',
        scope: 'North Caloocan',
        time: '7:45 AM',
        target_url: '/gov/operations?view=work-orders&wo=1182',
        is_read: false,
    },
    {
        id: 103,
        type: 'assigned',
        title: 'Work order blocked',
        body: 'WO-2026-1182 flagged blocker: Missing hazard photo prevents start.',
        scope: 'North Caloocan',
        time: '7:18 AM',
        target_url: '/gov/operations?view=work-orders&wo=1182',
        is_read: false,
    },
    {
        id: 104,
        type: 'system',
        title: 'Permission changed',
        body: 'Your operational scope was updated to North Caloocan Division.',
        scope: 'System',
        time: '6:56 AM',
        target_url: '/gov/my-dashboard',
        is_read: true,
    },
    {
        id: 105,
        type: 'system',
        title: 'Advisory published',
        body: 'AD-2026-014: Electrical maintenance scheduled this week.',
        scope: 'North Caloocan',
        time: '6:20 AM',
        target_url: '/gov/operations?view=updates',
        is_read: true,
    },
    {
        id: 106,
        type: 'assigned',
        title: 'Report assigned',
        body: 'PUL-2026-0819 assigned to Field Ops Team for triage.',
        scope: 'North Caloocan',
        time: '5:10 AM',
        target_url: '/gov/operations?view=reports&report=819',
        is_read: true,
    },
];

export default function NotificationCenter({ isOpen, onClose }) {
    const [tab, setTab] = useState('all');
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem('pulso_user') || 'null');
        } catch {
            return null;
        }
    };

    const currentUser = readUser();

    const fetchNotifications = async () => {
        if (!currentUser?.id) {
            setNotifications(SAMPLE_GOV_NOTIFICATIONS);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('pulso_token');
            const res = await fetch(`${API_BASE_URL}/api/notifications/user/${currentUser.id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const normalized = data.map((n) => ({
                        id: n.id,
                        type: n.priority >= 100 ? 'reviews' : n.priority >= 50 ? 'assigned' : 'system',
                        title: n.title || 'Government Notification',
                        body: n.message || n.body,
                        scope: 'North Caloocan',
                        time: new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        target_url: n.target_url || '/gov/my-dashboard',
                        is_read: n.is_read || false,
                    }));
                    setNotifications(normalized);
                } else {
                    setNotifications(SAMPLE_GOV_NOTIFICATIONS);
                }
            } else if (res.status === 403) {
                setError('permission');
            } else {
                setNotifications(SAMPLE_GOV_NOTIFICATIONS);
            }
        } catch {
            setNotifications(SAMPLE_GOV_NOTIFICATIONS);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleMarkAllRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        if (currentUser?.id) {
            try {
                const token = localStorage.getItem('pulso_token');
                await fetch(`${API_BASE_URL}/api/notifications/user/${currentUser.id}/read`, {
                    method: 'PATCH',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
            } catch (err) {
                console.error('Failed to mark notifications read on server', err);
            }
        }
    };

    const handleMarkRead = async (id) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        try {
            const token = localStorage.getItem('pulso_token');
            await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
        } catch (err) {
            console.error('Failed to mark notification read', err);
        }
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const filtered = notifications.filter((n) => {
        if (tab === 'all') return true;
        return n.type === tab;
    });

    return (
        <>
            <div
                className={`gov-notification-backdrop${isOpen ? ' is-open' : ''}`}
                onClick={onClose}
                aria-hidden={!isOpen}
            />

            <aside
                className={`gov-notification-drawer${isOpen ? ' is-open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label="Government notification center"
                aria-hidden={!isOpen}
            >
                <div className="gov-notification-header">
                    <div className="gov-notification-title-group">
                        <Bell size={18} className="gov-notification-bell-icon" aria-hidden="true" />
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="gov-notification-badge" aria-label={`${unreadCount} unread notifications`}>
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="gov-notification-actions">
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className="gov-notification-btn-text"
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            type="button"
                            className="gov-notification-close-btn"
                            onClick={onClose}
                            aria-label="Close notifications"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div className="gov-notification-tabs" role="tablist" aria-label="Notification categories">
                    <button
                        type="button"
                        role="tab"
                        id="tab-all"
                        aria-controls="panel-notifications"
                        aria-selected={tab === 'all'}
                        className={`gov-notification-tab${tab === 'all' ? ' is-active' : ''}`}
                        onClick={() => setTab('all')}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id="tab-assigned"
                        aria-controls="panel-notifications"
                        aria-selected={tab === 'assigned'}
                        className={`gov-notification-tab${tab === 'assigned' ? ' is-active' : ''}`}
                        onClick={() => setTab('assigned')}
                    >
                        Assigned
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id="tab-reviews"
                        aria-controls="panel-notifications"
                        aria-selected={tab === 'reviews'}
                        className={`gov-notification-tab${tab === 'reviews' ? ' is-active' : ''}`}
                        onClick={() => setTab('reviews')}
                    >
                        Reviews
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id="tab-system"
                        aria-controls="panel-notifications"
                        aria-selected={tab === 'system'}
                        className={`gov-notification-tab${tab === 'system' ? ' is-active' : ''}`}
                        onClick={() => setTab('system')}
                    >
                        System
                    </button>
                </div>

                <div
                    id="panel-notifications"
                    className="gov-notification-list"
                    role="tabpanel"
                    aria-labelledby={`tab-${tab}`}
                >
                    {loading ? (
                        <div className="gov-notification-empty">
                            <RefreshCw size={24} className="animate-spin" />
                            <p>Loading notifications...</p>
                        </div>
                    ) : error === 'permission' ? (
                        <div className="gov-notification-restricted">
                            <div className="gov-notification-restricted-icon">
                                <Lock size={20} />
                            </div>
                            <h4>Permission-limited</h4>
                            <p>You do not have permission to view global operational notifications.</p>
                        </div>
                    ) : error ? (
                        <div className="gov-notification-error">
                            <div className="gov-notification-error-icon">
                                <ShieldAlert size={20} />
                            </div>
                            <h4>Couldn't load notifications</h4>
                            <p>Check your connection and try again.</p>
                            <button
                                type="button"
                                className="gov-notification-retry-btn"
                                onClick={fetchNotifications}
                            >
                                Retry
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="gov-notification-empty">
                            <div className="gov-notification-empty-icon">
                                <Inbox size={20} />
                            </div>
                            <h4>No notifications yet</h4>
                            <p>You're all caught up for {tab === 'all' ? 'all categories' : tab}.</p>
                        </div>
                    ) : (
                        filtered.map((item) => (
                            <div
                                key={item.id}
                                className={`gov-notification-item${!item.is_read ? ' is-unread' : ''}`}
                            >
                                <div className="gov-notification-item-header">
                                    <span className="gov-notification-time">
                                        <Clock3 size={12} /> {item.time}
                                    </span>
                                    <span className="gov-notification-scope">{item.scope}</span>
                                </div>
                                <div className="gov-notification-body">
                                    <strong>{item.title}</strong> — {item.body}
                                </div>
                                <div className="gov-notification-footer">
                                    {!item.is_read && (
                                        <button
                                            type="button"
                                            className="gov-notification-btn-text"
                                            onClick={() => handleMarkRead(item.id)}
                                        >
                                            <Check size={12} /> Mark read
                                        </button>
                                    )}
                                    <Link
                                        to={item.target_url}
                                        className="gov-notification-action-btn"
                                        onClick={onClose}
                                    >
                                        Open task <ExternalLink size={11} />
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="gov-notification-footer-bar">
                    <span>Showing {filtered.length} notifications</span>
                    <span>Scope: North Caloocan</span>
                </div>
            </aside>
        </>
    );
}
