import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, FileText, CheckCircle2, Clock, AlertTriangle, Megaphone, Info, X } from 'lucide-react';
import { useAndroidBack } from '../utils/nativeAndroid';

/**
 * formatRelativeTime
 * Returns friendly, short, plain-language relative time strings ("2 hours ago", "5m ago", "Yesterday").
 * No exact timestamps.
 */
export function formatRelativeTime(dateInput) {
    if (!dateInput) return 'Just now';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'Just now';

    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
}

/**
 * getNotificationIcon
 * Maps notification title/message/type to an appropriate icon from the shared icon set.
 */
function getNotificationIcon(notif) {
    const text = `${notif?.title || ''} ${notif?.message || ''} ${notif?.type || ''}`.toLowerCase();
    if (text.includes('resolved') || text.includes('completed')) {
        return <CheckCircle2 size={20} strokeWidth={2} aria-hidden="true" />;
    }
    if (text.includes('advisory') || text.includes('alert') || text.includes('warning') || text.includes('hazard')) {
        return <AlertTriangle size={20} strokeWidth={2} aria-hidden="true" />;
    }
    if (text.includes('announcement') || text.includes('broadcast')) {
        return <Megaphone size={20} strokeWidth={2} aria-hidden="true" />;
    }
    if (text.includes('reminder') || text.includes('schedule')) {
        return <Clock size={20} strokeWidth={2} aria-hidden="true" />;
    }
    if (text.includes('info') || text.includes('notice') || text.includes('system')) {
        return <Info size={20} strokeWidth={2} aria-hidden="true" />;
    }
    return <FileText size={20} strokeWidth={2} aria-hidden="true" />;
}

/**
 * NotificationDropdown Component
 * ─────────────────────────────────────────────────────────────────────────────
 * PULSO Mobile App / Resident Home Notification Dropdown
 *
 * Rules:
 * 1. Opens directly under header when bell is tapped; does NOT navigate to Updates.
 * 2. Mobile layout: full width inside side padding clamp(1rem, 5vw, 1.25rem), 0.5rem below header,
 *    rounded corners (1rem / 16px), card fill & 1px border tokens, high z-index. Max height
 *    calc(100dvh - header - bottom bar - 1rem).
 * 3. Tablet & Desktop (≥ 768px): 24rem wide (w-96) aligned to right edge under bell, with small pointer.
 * 4. Dimmed 60% navy overlay behind panel.
 * 5. Header: "Notifications" (16px semibold) + "Mark all as read" link (14px, #b83a00 light / #ff6b00 dark)
 *    shown only when unreadCount > 0.
 * 6. Content: 5 most recent notifications. Each row min-h-[4rem] (64px), whole row tappable.
 *    - Orange tile (40px, rounded-xl, 12-15% orange tint, #b83a00 light / #ff6b00 dark)
 *    - Bold line of plain text (14px)
 *    - Soft gray line (12px) with short plain relative time
 *    - Small orange dot at right for unread items + screen-reader "Unread"
 * 7. Tapping a row marks it read, closes dropdown, opens related screen.
 * 8. Footer: "See all updates" (14px semibold, min 48px tap area) closes dropdown & opens Updates tab.
 * 9. Empty state: bell icon + "You're all caught up." (no footer link).
 * 10. Loading state: 3 placeholder skeleton pulse rows with PULSO pulse line.
 * 11. Error state: "We can't load notifications right now." + "Try again" button (48px tall).
 * 12. Safe closing rules: only closes on bell tap, outside tap (composedPath check), Escape, row tap,
 *     "See all updates", or back button. "Mark all as read" keeps dropdown open.
 * 13. Page scroll locked while open; focus returned to bell on close.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function NotificationDropdown({
    isOpen = false,
    onClose,
    notifications = [],
    onNotificationClick,
    onMarkAllRead,
    onOpenAllNotifications,
    onViewAllUpdates,
    unreadCount = 0,
    loading = false,
    error = null,
    onRetry,
    triggerRefs = [],
    activeTriggerRef,
    className = ''
}) {
    const { t } = useTranslation();
    const panelRef = useRef(null);
    const [liveAnnouncement, setLiveAnnouncement] = useState('');
    useAndroidBack(isOpen, 35, () => {
        onClose?.();
        activeTriggerRef?.current?.focus();
    });

    // Filter to non-hidden notifications and slice to 5 most recent
    const visibleNotifications = (notifications || []).filter(n => !n.is_hidden).slice(0, 5);

    // 1. Outside Click Detection via composedPath on pointerdown
    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (e) => {
            const path = e.composedPath ? e.composedPath() : [];
            // Click inside panel
            if (panelRef.current && (panelRef.current.contains(e.target) || path.includes(panelRef.current))) {
                return;
            }
            // Click on any trigger (bell buttons)
            if (triggerRefs && triggerRefs.length > 0) {
                for (const ref of triggerRefs) {
                    if (ref?.current && (ref.current.contains(e.target) || path.includes(ref.current))) {
                        return;
                    }
                }
            }
            onClose?.();
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [isOpen, onClose, triggerRefs]);

    // 2. Keyboard & Focus Management (Escape closes, Focus trap)
    useEffect(() => {
        if (!isOpen) return;

        // Auto-focus first focusable element or panel
        const timeout = setTimeout(() => {
            if (panelRef.current) {
                const focusables = panelRef.current.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusables.length > 0) {
                    focusables[0].focus();
                } else {
                    panelRef.current.focus();
                }
            }
        }, 30);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose?.();
                activeTriggerRef?.current?.focus();
            } else if (e.key === 'Tab' && panelRef.current) {
                const focusables = panelRef.current.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            clearTimeout(timeout);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, activeTriggerRef]);

    // 3. Phone Back Button Support
    useEffect(() => {
        if (!isOpen) return;
        const handlePopState = () => {
            onClose?.();
        };
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* ── Live Region for Accessible Announcements ── */}
            <div aria-live="polite" className="sr-only">
                {liveAnnouncement}
            </div>

            {/* ── Notification Dropdown Dialog Panel ── */}
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="notifications-dialog-title"
                tabIndex={-1}
                onPointerDown={(e) => {
                    // Prevent clicks inside panel from bubbling to document outside-click listener
                    e.stopPropagation();
                }}
                className={`absolute z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden transition-all duration-150 motion-reduce:transition-none text-slate-900 dark:text-white
                    /* Phones (< 768px): full width inside side padding clamp(1rem, 5vw, 1.25rem), lifted up below Row 1 to block search bar */
                    left-[clamp(1rem,5vw,1.25rem)] right-[clamp(1rem,5vw,1.25rem)] top-[calc(max(env(safe-area-inset-top,0px),12px)+3.5rem)] max-h-[calc(100dvh-8rem)]
                    /* Tablet & Desktop (≥ 768px): 24rem (384px) wide aligned to right edge under bell */
                    md:left-auto md:right-4 lg:md:right-6 md:top-full md:mt-2 md:w-96 md:max-h-[calc(100dvh-6rem)]
                    ${className}`}
            >
                {/* Desktop Pointer toward the bell */}
                <div
                    className="hidden md:block absolute -top-1.5 right-6 w-3 h-3 bg-white dark:bg-slate-900 border-t border-l border-slate-200 dark:border-slate-800 rotate-45 z-10"
                    aria-hidden="true"
                />

                {/* ── Panel Header ── */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 relative z-20 bg-white dark:bg-slate-900">
                    <h2
                        id="notifications-dialog-title"
                        className="text-base font-semibold font-heading text-slate-900 dark:text-white"
                    >
                        Notifications
                    </h2>

                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && !loading && !error && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onMarkAllRead) {
                                        onMarkAllRead();
                                    }
                                    setLiveAnnouncement('All notifications marked as read');
                                }}
                                className="text-sm font-semibold text-[#b83a00] dark:text-[#ff6b00] hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-sm py-1 px-1.5"
                            >
                                Mark all as read
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose?.();
                            }}
                            aria-label="Close notifications"
                            title="Close notifications"
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                        >
                            <X size={18} strokeWidth={2.2} />
                        </button>
                    </div>
                </div>

                {/* ── Panel Body: List / Empty / Loading / Error ── */}
                <div className="overflow-y-auto custom-scrollbar flex-1 relative z-20">
                    {/* State 1: Loading Skeleton */}
                    {loading && (
                        <div className="p-2 space-y-1">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3.5 px-4 py-3 min-h-[4rem] rounded-xl animate-pulse"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* State 2: Error with Try Again Button */}
                    {!loading && error && (
                        <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 max-w-xs">
                                We can't load notifications right now.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onRetry) onRetry();
                                }}
                                className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e05e00] active:scale-98 text-white font-semibold text-sm transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] cursor-pointer"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* State 3: Empty State */}
                    {!loading && !error && visibleNotifications.length === 0 && (
                        <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                                <Bell size={24} strokeWidth={1.8} aria-hidden="true" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                You're all caught up.
                            </p>
                        </div>
                    )}

                    {/* State 4: 5 Most Recent Notifications List */}
                    {!loading && !error && visibleNotifications.length > 0 && (
                        <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {visibleNotifications.map((notif) => {
                                const plainText = notif.message || notif.title || 'Notification update';
                                return (
                                    <li key={notif.id} className="relative block">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onNotificationClick) {
                                                    onNotificationClick(notif);
                                                }
                                                onClose?.();
                                            }}
                                            className="w-full text-left flex items-center gap-3.5 px-4 py-3 min-h-[4rem] hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-xl select-none"
                                        >
                                            {/* Small icon in PULSO orange tile style */}
                                            <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-orange-500/12 dark:bg-orange-500/15 text-[#b83a00] dark:text-[#ff6b00] flex items-center justify-center shrink-0">
                                                {getNotificationIcon(notif)}
                                            </div>

                                            {/* Text block: Bold plain text line + short relative time */}
                                            <div className="flex-1 min-w-0 pr-1">
                                                <p
                                                    className={`text-sm leading-snug line-clamp-1 ${
                                                        notif.is_read
                                                            ? 'font-medium text-slate-700 dark:text-slate-300'
                                                            : 'font-semibold text-slate-950 dark:text-white'
                                                    }`}
                                                >
                                                    {plainText}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-normal">
                                                    {formatRelativeTime(notif.created_at)}
                                                </p>
                                            </div>

                                            {/* Small orange dot for unread items with screen reader text */}
                                            {!notif.is_read ? (
                                                <div className="flex items-center shrink-0 ml-1">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="sr-only">Unread</span>
                                                </div>
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* ── Footer: See all updates link (min 48px tap area) ── */}
                {!loading && !error && (
                    <div className="p-2 border-t border-slate-100 dark:border-slate-800 shrink-0 relative z-20 bg-white dark:bg-slate-900">
                        <button
                            type="button"
                            onClick={() => {
                                onClose?.();
                                if (onOpenAllNotifications) {
                                    onOpenAllNotifications();
                                } else if (onViewAllUpdates) {
                                    onViewAllUpdates();
                                }
                            }}
                            className="w-full min-h-[48px] flex items-center justify-center font-semibold text-sm text-[#b83a00] dark:text-[#ff6b00] hover:bg-orange-500/5 active:bg-orange-500/10 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                        >
                            {t('notificationCenter.seeAll', 'See all notifications')}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
