import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Check,
    CheckCheck,
    AlertTriangle,
    Clock,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';

const INITIAL_NOTIFICATIONS = [
    {
        id: 'notif-1',
        type: 'critical',
        title: 'Critical Incident Intake',
        ticketId: '#PUL-2026-3554',
        description: 'Deep road depression on Bagong Silang access spine requiring emergency asphalt triage.',
        time: '12m ago',
        link: '/gov/reports',
        read: false
    },
    {
        id: 'notif-2',
        type: 'warning',
        title: 'SLA Warning: WO-2026-088',
        ticketId: 'WO-2026-088',
        description: 'North Drainage Desilting Team approaching 24-hour response SLA threshold.',
        time: '48m ago',
        link: '/gov/work-orders',
        read: false
    },
    {
        id: 'notif-3',
        type: 'success',
        title: 'Inspection Certified',
        ticketId: '#PUL-2026-1029',
        description: 'Camarin Streetlight replacement certified & signed off by Engr. Morales.',
        time: '2h ago',
        link: '/gov/reports',
        read: false
    }
];

export default function GovNotificationDropdown() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
    const dropdownRef = useRef(null);

    const unreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleMarkAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const handleNotificationClick = (item) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
        setIsOpen(false);
        if (item.link) {
            navigate(item.link);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'critical':
                return <AlertTriangle size={15} className="text-red-500 shrink-0" />;
            case 'warning':
                return <Clock size={15} className="text-amber-500 shrink-0" />;
            case 'success':
                return <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />;
            default:
                return <Bell size={15} className="text-[#ff6b00] shrink-0" />;
        }
    };

    return (
        <div className="relative z-50" ref={dropdownRef}>
            {/* Bell Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`relative w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                    isOpen
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
                aria-label={`${unreadCount} operational notifications`}
                title={unreadCount > 0 ? `${unreadCount} Active Operational Alerts` : 'Operational Notifications'}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff6b00] text-white text-[10px] font-mono-data font-bold flex items-center justify-center shadow-xs border-2 border-white dark:border-[#090e1a] pointer-events-none z-10">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800/90 shadow-2xl z-[100] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#090e1a]">
                        <div className="flex items-center gap-2">
                            <span className="font-heading font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                                Operational Alerts
                            </span>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-data font-bold bg-orange-100 dark:bg-orange-950/60 text-[#ff6b00] border border-orange-200 dark:border-orange-900/60">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllAsRead}
                                className="text-[11px] font-heading font-semibold text-[#ff6b00] hover:text-[#e65c00] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                                <CheckCheck size={13} />
                                <span>Mark all read</span>
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">
                                <Bell size={24} className="mx-auto mb-2 opacity-40" />
                                <p>No notifications</p>
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleNotificationClick(item)}
                                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                                        !item.read
                                            ? 'bg-orange-50/40 dark:bg-orange-950/15 hover:bg-orange-50/70 dark:hover:bg-orange-950/25'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    <div className="mt-0.5">{getIcon(item.type)}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="font-heading font-bold text-xs text-slate-900 dark:text-white truncate">
                                                {item.title}
                                            </span>
                                            <span className="text-[10px] font-mono-data text-slate-400 shrink-0">
                                                {item.time}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                            {item.description}
                                        </p>
                                        <div className="mt-1.5 flex items-center justify-between">
                                            <span className="font-mono-data text-[10px] font-bold text-[#ff6b00]">
                                                {item.ticketId}
                                            </span>
                                            {!item.read && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Link */}
                    <div className="p-2.5 bg-slate-50 dark:bg-[#090e1a] border-t border-slate-100 dark:border-slate-800 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                navigate('/gov/today');
                            }}
                            className="text-xs font-heading font-bold text-[#ff6b00] hover:text-[#e65c00] inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                            <span>Open Today's Command Queue</span>
                            <ArrowRight size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}